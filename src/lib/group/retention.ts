import "server-only";

import type { Db } from "@/lib/commerce/db";
import { GROUP_RETENTION } from "./limits";
import { CONTRIBUTIONS_BUCKET, removePendingPhotos } from "./photo-store";
import { sendSignedGiftEmails } from "./signed-email";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();
const PAGE = 500;
/** Notes read at a time by the purge, and how many ids go into one filter (each id is 36 characters of an address). */
const SCAN = 1000;
const IDS = 100;
/** The most notes one run looks at: far more than a day ever holds, and an end to the loop whatever happens. */
const SCAN_LIMIT = 200 * SCAN;

export type GroupRetentionResult = {
  /** Notes turned down, removed or taken back a day ago: their words, photo and address are gone. */
  scrubbed: number;
  /** Addresses that never confirmed within a week. */
  addressesForgotten: number;
  /** Notes of cards sent six days ago, or never sent two weeks after their link was due to close. */
  purged: number;
  /** Drafts with an open group, kept from the seven-day draft sweep. */
  draftsKept: number;
  /** Files in the contributions bucket that nothing points at any more. */
  orphansRemoved: number;
  /** "Here's the card you signed" emails that went out on this run (the backstop). */
  emailed: number;
  error?: string;
};

const chunks = <T>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

type Note = { id: string; group_id: string; status: string; photo_path: string | null; email: string | null; email_confirmed_at: string | null; emailed_at: string | null };

/**
 * The daily job for group cards (docs/GROUP.md, "What is kept and for how long"). It runs before
 * the storage sweep in /api/cron/unlock, so a draft kept here is not swept in the same run.
 *
 *   1. A draft with a group is touched, so the 7-day draft sweep leaves it alone, until 14 days
 *      after the date its link was due to close; then it is no longer touched, and the sweep
 *      applies. This runs first and on its own: nothing that goes wrong further down may cost
 *      anyone the card they are putting together.
 *   2. A note the sender turned down or removed, or its writer took back: after 24 hours (the
 *      sender's Undo) its words, photo and address are deleted. The row stays, so the group's
 *      limits still count it, and so does its key, which keeps it out of the card.
 *   3. An address that never confirmed: forgotten after 7 days.
 *   4. The backstop for "here's the card you signed": cards that are live, with a confirmed address
 *      still waiting (a scheduled card that went live, a note added after sending, a send that
 *      failed). Before the purge, so nobody's email is lost to it.
 *   5. Every note of a card that was sent: deleted 6 days after sending, which with one run a day
 *      keeps "within 7 days". What was added lives on in the gift itself. One exception: a card
 *      sent with a date on it that has not arrived yet keeps the notes that are in it and whose
 *      writers confirmed an address, until their email has gone.
 *      Every note of a card never sent: deleted 14 days after the date its link was due to close
 *      (`closes_at`: 30 days from the start unless the sender kept it open longer).
 *      The purge goes through the notes that still exist, not through the groups: a sent group's
 *      row lives as long as its gift, so a list of "groups sent a week ago" only ever grows, while
 *      the notes left to delete are few.
 *   6. Files no note points at (a group deleted with its gift or account) are removed after a day.
 *
 * A database without migration 0023 reports `{ error }` and changes nothing: this never throws.
 */
export async function runGroupRetention(admin: Db, now: number): Promise<GroupRetentionResult> {
  const result: GroupRetentionResult = { scrubbed: 0, addressesForgotten: 0, purged: 0, draftsKept: 0, orphansRemoved: 0, emailed: 0 };
  const errors: string[] = [];

  try {
    await keepDrafts(admin, now, result);
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    await scrubDecided(admin, now, result);
    await forgetUnconfirmed(admin, now, result);
    await sendOwed(admin, now, result);
    await purgeOver(admin, now, result);
    await removeOrphans(admin, result);
  } catch (error) {
    errors.push((error as Error).message);
  }

  if (errors.length) result.error = [...new Set(errors)].join("; ");
  return result;
}

/**
 * 1. Drafts whose link is still open, or was due to close less than two weeks ago, are kept from
 * the draft sweep. A link the sender closed by hand counts by the day it would have run out:
 * closing it early (everyone has signed) must not start a clock on their draft. Only a draft that
 * has gone four days untouched is touched: the dashboard lists gifts by this date, and a card being
 * put together should not jump to the top of it every morning.
 */
async function keepDrafts(admin: Db, now: number, result: GroupRetentionResult) {
  const cutoff = iso(now - GROUP_RETENTION.afterClosedDays * DAY);
  const stale = iso(now - GROUP_RETENTION.draftTouchDays * DAY);
  let after = cutoff;
  for (let page = 0; page < 40; page++) {
    // By closing day, oldest first, each page starting at the day the last one ended on (a draft read twice is touched once).
    const query = admin.from("gift_groups").select("gift_id, closes_at").is("sent_at", null);
    const open = await query.gte("closes_at", after).order("closes_at", { ascending: true }).limit(PAGE);
    if (open.error) throw new Error(open.error.message);
    const groups = open.data ?? [];
    for (const ids of chunks(groups.map((group) => group.gift_id), IDS)) {
      // The one write to a table that existed before: a draft's own "last touched", and only on drafts.
      const touched = await admin.from("gifts").update({ updated_at: iso(now) }).in("id", ids).eq("status", "draft").lt("updated_at", stale).select("id");
      if (touched.error) throw new Error(touched.error.message);
      result.draftsKept += touched.data?.length ?? 0;
    }
    if (groups.length < PAGE) return;
    after = groups[groups.length - 1].closes_at;
  }
}

/** 2. Scrub what was decided against, a day on. */
async function scrubDecided(admin: Db, now: number, result: GroupRetentionResult) {
  const stale = await admin
    .from("gift_contributions")
    .select("id, photo_path")
    .in("status", ["rejected", "removed", "withdrawn"])
    .is("scrubbed_at", null)
    .lt("decided_at", iso(now - GROUP_RETENTION.undoHours * HOUR))
    .limit(PAGE);
  if (stale.error) throw new Error(stale.error.message);
  for (const scrub of chunks(stale.data ?? [], IDS)) {
    await removePendingPhotos(admin, scrub.flatMap((row) => (row.photo_path ? [row.photo_path] : [])));
    const done = await admin
      .from("gift_contributions")
      .update({ name: null, note: null, photo_path: null, photo_width: null, photo_height: null, email: null, email_sha256: null, email_consent: null, email_consent_at: null, withdraw_sha256: null, scrubbed_at: iso(now) })
      .in("id", scrub.map((row) => row.id));
    if (done.error) throw new Error(done.error.message);
    result.scrubbed += scrub.length;
  }
}

/** 3. Addresses that never said yes. */
async function forgetUnconfirmed(admin: Db, now: number, result: GroupRetentionResult) {
  const unconfirmed = await admin
    .from("gift_contributions")
    .update({ email: null, email_sha256: null, email_consent: null, email_consent_at: null })
    .not("email", "is", null)
    .is("email_confirmed_at", null)
    .lt("created_at", iso(now - GROUP_RETENTION.unconfirmedDays * DAY))
    .select("id");
  if (unconfirmed.error) throw new Error(unconfirmed.error.message);
  result.addressesForgotten = unconfirmed.data?.length ?? 0;
}

/** 4. Confirmed addresses still owed the card. sendSignedGiftEmails itself sends only for a card that is live, with the note still in it. */
async function sendOwed(admin: Db, now: number, result: GroupRetentionResult) {
  const owed = await admin.from("gift_contributions").select("group_id").eq("status", "approved").not("email", "is", null).not("email_confirmed_at", "is", null).is("emailed_at", null).limit(PAGE);
  if (owed.error) throw new Error(owed.error.message);
  const owedGroups = [...new Set((owed.data ?? []).map((row) => row.group_id))];
  for (const ids of chunks(owedGroups, IDS)) {
    const owing = await admin.from("gift_groups").select("gift_id").in("id", ids).not("sent_at", "is", null);
    if (owing.error) throw new Error(owing.error.message);
    for (const group of owing.data ?? []) result.emailed += (await sendSignedGiftEmails(admin, group.gift_id, now).catch(() => ({ sent: 0 }))).sent;
  }
}

/**
 * 5. Every note of a card sent six days ago, or never sent two weeks after its link was due to
 * close. Read from the notes themselves, a thousand at a time in the order of their ids, each page
 * starting after the last: every note that exists is looked at once, whatever the number of cards.
 */
async function purgeOver(admin: Db, now: number, result: GroupRetentionResult) {
  const sentBefore = now - GROUP_RETENTION.afterSentDays * DAY;
  const dueBefore = now - GROUP_RETENTION.afterClosedDays * DAY;
  let after: string | null = null;
  for (let seen = 0; seen < SCAN_LIMIT; seen += SCAN) {
    const query = admin.from("gift_contributions").select("id, group_id, status, photo_path, email, email_confirmed_at, emailed_at");
    const read = await (after ? query.gt("id", after) : query).order("id", { ascending: true }).limit(SCAN);
    if (read.error) throw new Error(read.error.message);
    const notes = (read.data ?? []) as Note[];
    if (!notes.length) return;
    after = notes[notes.length - 1].id;

    // Which of these notes' groups are over, and which of those are a dated card still to arrive.
    const over = new Set<string>();
    const sentGifts = new Map<string, string>();
    for (const ids of chunks([...new Set(notes.map((note) => note.group_id))], IDS)) {
      const groups = await admin.from("gift_groups").select("id, gift_id, sent_at, closes_at").in("id", ids);
      if (groups.error) throw new Error(groups.error.message);
      for (const group of groups.data ?? []) {
        if (group.sent_at ? Date.parse(group.sent_at) < sentBefore : Date.parse(group.closes_at) < dueBefore) over.add(group.id);
        if (group.sent_at && over.has(group.id)) sentGifts.set(group.gift_id, group.id);
      }
    }
    if (over.size) {
      // A card sent with a date on it is not out yet. Whoever signed it and confirmed an address is
      // still owed its link, so that one note waits for the day (the send then deletes the address,
      // and the next run takes the note). Everything else goes now.
      const held = new Set<string>();
      for (const ids of chunks([...sentGifts.keys()], IDS)) {
        const waiting = await admin.from("gifts").select("id").in("id", ids).eq("status", "scheduled");
        if (waiting.error) throw new Error(waiting.error.message);
        for (const gift of waiting.data ?? []) held.add(sentGifts.get(gift.id) as string);
      }
      const going = notes.filter((note) => over.has(note.group_id) && !(held.has(note.group_id) && note.status === "approved" && note.email && note.email_confirmed_at && !note.emailed_at));
      for (const batch of chunks(going, IDS)) {
        const gone = await admin.from("gift_contributions").delete().in("id", batch.map((note) => note.id));
        if (gone.error) throw new Error(gone.error.message);
        await removePendingPhotos(admin, batch.flatMap((note) => (note.photo_path ? [note.photo_path] : [])));
        result.purged += batch.length;
      }
    }
    if (notes.length < SCAN) return;
  }
}

/** 6. Files nothing points at. */
async function removeOrphans(admin: Db, result: GroupRetentionResult) {
  const orphans = await admin.rpc("group_photo_orphans", { p_limit: PAGE });
  if (orphans.error) throw new Error(orphans.error.message);
  const names = (orphans.data ?? []).map((row) => row.name);
  for (const batch of chunks(names, 100)) {
    const removed = await admin.storage.from(CONTRIBUTIONS_BUCKET).remove(batch);
    if (removed.error) throw new Error(removed.error.message);
    result.orphansRemoved += batch.length;
  }
}
