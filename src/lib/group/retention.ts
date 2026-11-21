import "server-only";

import type { Db } from "@/lib/commerce/db";
import { GROUP_RETENTION } from "./limits";
import { CONTRIBUTIONS_BUCKET, removePendingPhotos } from "./photo-store";
import { sendSignedGiftEmails } from "./signed-email";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();
const PAGE = 500;

export type GroupRetentionResult = {
  /** Notes turned down, removed or taken back a day ago: their words, photo and address are gone. */
  scrubbed: number;
  /** Addresses that never confirmed within a week. */
  addressesForgotten: number;
  /** Notes of cards sent a week ago, or never sent two weeks after their link closed. */
  purged: number;
  /** Drafts with an open group, kept from the seven-day draft sweep. */
  draftsKept: number;
  /** Files in the contributions bucket that nothing points at any more. */
  orphansRemoved: number;
  /** "Here's the card you signed" emails that went out on this run (the backstop). */
  emailed: number;
  error?: string;
};

/**
 * The daily job for group cards (docs/GROUP.md, "What is kept and for how long"). It runs before
 * the storage sweep in /api/cron/unlock, so a draft kept here is not swept in the same run.
 *
 *   1. A note the sender turned down or removed, or its writer took back: after 24 hours (the
 *      sender's Undo) its words, photo and address are deleted. The row stays, so the group's
 *      limits still count it.
 *   2. An address that never confirmed: forgotten after 7 days.
 *   3. Every note of a card that was sent: deleted 7 days after sending. What was added lives on in
 *      the gift itself. Every note of a card never sent: deleted 14 days after its link ran out
 *      (`closes_at`: 30 days from the start unless the sender kept it open longer).
 *   4. A draft with a group is touched, so the 7-day draft sweep leaves it alone, until 14 days
 *      after its link ran out; then it is no longer touched, and the sweep applies.
 *   5. Files no note points at (a group deleted with its gift or account) are removed after a day.
 *   6. The backstop for "here's the card you signed": cards that are live, with a confirmed address
 *      still waiting (a scheduled card that went live, a note added after sending).
 *
 * A database without migration 0023 reports `{ error }` and changes nothing: this never throws.
 */
export async function runGroupRetention(admin: Db, now: number): Promise<GroupRetentionResult> {
  const result: GroupRetentionResult = { scrubbed: 0, addressesForgotten: 0, purged: 0, draftsKept: 0, orphansRemoved: 0, emailed: 0 };
  try {
    // 1. Scrub what was decided against, a day on.
    const stale = await admin
      .from("gift_contributions")
      .select("id, photo_path")
      .in("status", ["rejected", "removed", "withdrawn"])
      .is("scrubbed_at", null)
      .lt("decided_at", iso(now - GROUP_RETENTION.undoHours * HOUR))
      .limit(PAGE);
    if (stale.error) throw new Error(stale.error.message);
    const scrub = stale.data ?? [];
    if (scrub.length) {
      await removePendingPhotos(admin, scrub.flatMap((row) => (row.photo_path ? [row.photo_path] : [])));
      const done = await admin
        .from("gift_contributions")
        .update({ name: null, note: null, photo_path: null, photo_width: null, photo_height: null, email: null, email_sha256: null, email_consent: null, email_consent_at: null, withdraw_sha256: null, scrubbed_at: iso(now) })
        .in("id", scrub.map((row) => row.id));
      if (done.error) throw new Error(done.error.message);
      result.scrubbed = scrub.length;
    }

    // 2. Addresses that never said yes.
    const unconfirmed = await admin
      .from("gift_contributions")
      .update({ email: null, email_sha256: null, email_consent: null, email_consent_at: null })
      .not("email", "is", null)
      .is("email_confirmed_at", null)
      .lt("created_at", iso(now - GROUP_RETENTION.unconfirmedDays * DAY))
      .select("id");
    if (unconfirmed.error) throw new Error(unconfirmed.error.message);
    result.addressesForgotten = unconfirmed.data?.length ?? 0;

    // 6 (before 3, so nobody's email is lost to the purge): cards that are out and still owe an email.
    const owing = await admin.from("gift_groups").select("gift_id").not("sent_at", "is", null).gte("sent_at", iso(now - GROUP_RETENTION.afterSentDays * DAY)).limit(PAGE);
    if (owing.error) throw new Error(owing.error.message);
    for (const group of owing.data ?? []) result.emailed += (await sendSignedGiftEmails(admin, group.gift_id, now).catch(() => ({ sent: 0 }))).sent;

    // 3. Every note of a card sent a week ago, or never sent two weeks after its link closed.
    const [sent, expired] = await Promise.all([
      admin.from("gift_groups").select("id").not("sent_at", "is", null).lt("sent_at", iso(now - GROUP_RETENTION.afterSentDays * DAY)).limit(PAGE),
      admin.from("gift_groups").select("id").is("sent_at", null).lt("closes_at", iso(now - GROUP_RETENTION.afterClosedDays * DAY)).limit(PAGE),
    ]);
    for (const read of [sent, expired]) if (read.error) throw new Error(read.error.message);
    const over = [...new Set([...(sent.data ?? []), ...(expired.data ?? [])].map((group) => group.id))];
    if (over.length) {
      const gone = await admin.from("gift_contributions").delete().in("group_id", over).select("photo_path");
      if (gone.error) throw new Error(gone.error.message);
      await removePendingPhotos(admin, (gone.data ?? []).flatMap((row) => (row.photo_path ? [row.photo_path] : [])));
      result.purged = gone.data?.length ?? 0;
    }

    // 4. Drafts whose link is still open, or ran out less than two weeks ago, are kept from the draft
    // sweep. A link the sender closed by hand counts by the day it would have run out: closing it
    // early (everyone has signed) must not start a clock on their draft.
    const open = await admin.from("gift_groups").select("gift_id").is("sent_at", null).gte("closes_at", iso(now - GROUP_RETENTION.afterClosedDays * DAY)).limit(PAGE);
    if (open.error) throw new Error(open.error.message);
    const keep = (open.data ?? []).map((group) => group.gift_id);
    if (keep.length) {
      // The one write to a table that existed before: a draft's own "last touched", and only on drafts.
      const touched = await admin.from("gifts").update({ updated_at: iso(now) }).in("id", keep).eq("status", "draft").select("id");
      if (touched.error) throw new Error(touched.error.message);
      result.draftsKept = touched.data?.length ?? 0;
    }

    // 5. Files nothing points at.
    const orphans = await admin.rpc("group_photo_orphans", { p_limit: PAGE });
    if (orphans.error) throw new Error(orphans.error.message);
    const names = (orphans.data ?? []).map((row) => row.name);
    for (let i = 0; i < names.length; i += 100) {
      const removed = await admin.storage.from(CONTRIBUTIONS_BUCKET).remove(names.slice(i, i + 100));
      if (removed.error) throw new Error(removed.error.message);
      result.orphansRemoved += Math.min(100, names.length - i);
    }
  } catch (error) {
    result.error = (error as Error).message;
  }
  return result;
}
