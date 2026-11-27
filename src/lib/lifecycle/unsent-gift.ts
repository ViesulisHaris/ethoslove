import "server-only";

import { rateLimit } from "@/lib/rate-limit";
import { emailKey } from "@/lib/lifecycle/links";
import { optedOut } from "@/lib/email/optouts";
import { getManifest } from "@/templates/manifests";
import type { Db } from "@/lib/commerce/db";
import type { UnsentMode } from "./unsent-flag";

/**
 * "Nobody likes to be forgotten" (api/cron/unsent-gifts, every hour): a signed-in sender who put real
 * work into a premium gift, left it unsent and has neither paid nor sent anything since gets one
 * email the next day, with a button that opens that draft. A guest's draft never reaches us (it
 * lives on their device), so this is only ever about a draft saved to an account; a guest who asks
 * for "Email me this gift" on the send screen becomes one when they open that email's link
 * (app/api/gift/later).
 *
 * The email names the template and nothing from the gift: no name, photo or word of it.
 *
 * It ships switched off: the switch and what it means are in ./unsent-flag.ts.
 */

const HOUR = 3_600_000;
/** A day's sleep, less a little: the email lands at about the hour they were making it. */
export const UNSENT_AFTER_MS = 20 * HOUR;
/** Past this it's no longer "yesterday's gift"; the window is wide so a missed run loses nobody. */
export const UNSENT_UNTIL_MS = 44 * HOUR;
/** Unsent drafts are deleted after this long untouched (lib/gift/retention.ts, draftDays). */
export const DRAFT_KEPT_MS = 7 * 86_400_000;
/** One of these to an account in this long, however many gifts it leaves. */
export const UNSENT_PER_ACCOUNT_SECONDS = 7 * 86_400;
/** Work that shows the gift was meant: a photo in it, or this long between its first and last save. */
export const UNSENT_WORKED_MS = 2 * 60_000;
/** A purchase or a send this long before the draft began still counts as "since" (clocks, a checkout opened first). */
const SINCE_SLACK_MS = HOUR;
export const UNSENT_BATCH = 200;

type Locale = "en" | "es";
export type UnsentDraft = { id: string; userId: string; slug: string; createdAt: number; updatedAt: number; photos: number };
export type AccountEvent = { userId: string; at: number };
export type UnsentContact = { email: string; locale: Locale; createdAt: number };

/** When the draft is deleted if nobody touches it, as an ISO day for the email. */
export const deletedOn = (draft: Pick<UnsentDraft, "updatedAt">): string => new Date(draft.updatedAt + DRAFT_KEPT_MS).toISOString();

/** Until when the email's button signs its reader in (Unix seconds): as long as the draft is kept. */
export const unsentLinkUntil = (draft: Pick<UnsentDraft, "updatedAt">): number => Math.floor((draft.updatedAt + DRAFT_KEPT_MS) / 1000);

/** A premium gift somebody worked on: the free templates can be sent as they are, so nothing is left unsent for a price. */
export function worthReminding(draft: UnsentDraft): boolean {
  if (getManifest(draft.slug)?.tier !== "premium") return false;
  return draft.photos > 0 || draft.updatedAt - draft.createdAt >= UNSENT_WORKED_MS;
}

/** Left alone since yesterday, and not so long that the email would be about a gift they've forgotten. */
export const isUnsentDue = (draft: Pick<UnsentDraft, "updatedAt">, now: number): boolean => now - draft.updatedAt >= UNSENT_AFTER_MS && now - draft.updatedAt <= UNSENT_UNTIL_MS;

/** Something of this account's since the draft began: a payment, or a gift that went out. */
export const hasSince = (draft: Pick<UnsentDraft, "userId" | "createdAt">, events: AccountEvent[]): boolean =>
  events.some((e) => e.userId === draft.userId && e.at >= draft.createdAt - SINCE_SLACK_MS);

export interface UnsentGiftStore {
  /** Drafts never published, last saved between `from` and `to` (ms), oldest first. */
  drafts(from: number, to: number, limit: number): Promise<UnsentDraft[]>;
  /** Paid purchases of these accounts since `since` (ms). */
  paidSince(userIds: string[], since: number): Promise<AccountEvent[]>;
  /** Gifts of these accounts that went out (live or scheduled), saved since `since` (ms). */
  sentSince(userIds: string[], since: number): Promise<AccountEvent[]>;
  contact(userId: string): Promise<UnsentContact | null>;
  /** True when the address asked for no optional email (or it can't be told). */
  optedOut(email: string): Promise<boolean>;
  /** True only the first time an account is asked for in UNSENT_PER_ACCOUNT_SECONDS. */
  claim(userId: string): Promise<boolean>;
}

export type UnsentGiftRun = {
  store: UnsentGiftStore;
  mode: UnsentMode;
  /** `onceKey` names the email for Resend, per draft, so it can only go once. */
  send: (args: { to: string; locale: Locale; url: string; templateSlug: string; deletedOn: string; onceKey: string }) => Promise<boolean>;
  /** The email's button: api/gift/unsent/open, signed for this draft. */
  link: (draft: UnsentDraft, locale: Locale) => Promise<string>;
  now: number;
  inTime: () => boolean;
  pause: () => Promise<void>;
};

export async function sendUnsentGiftReminders(run: UnsentGiftRun): Promise<{ sent: number; failed: number; deferred: number }> {
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  if (!run.mode.on) return { sent, failed, deferred };
  const rows = (await run.store.drafts(run.now - UNSENT_UNTIL_MS, run.now - UNSENT_AFTER_MS, UNSENT_BATCH)).filter((d) => isUnsentDue(d, run.now) && worthReminding(d));
  if (rows.length === 0) return { sent, failed, deferred };

  // One email per account: the draft they put the most into, the latest one when that's a tie.
  const best = new Map<string, UnsentDraft>();
  const weight = (d: UnsentDraft) => d.photos * 10 * 60_000 + (d.updatedAt - d.createdAt);
  for (const row of rows) {
    const held = best.get(row.userId);
    if (!held || weight(row) > weight(held) || (weight(row) === weight(held) && row.updatedAt > held.updatedAt)) best.set(row.userId, row);
  }
  const users = [...best.keys()];
  const since = Math.min(...[...best.values()].map((d) => d.createdAt)) - SINCE_SLACK_MS;
  const [paid, out] = await Promise.all([run.store.paidSince(users, since), run.store.sentSince(users, since)]);

  for (const draft of best.values()) {
    // They paid for something, or sent a gift after all (the free one, often): nothing is waiting.
    if (hasSince(draft, paid) || hasSince(draft, out)) continue;
    if (!run.inTime()) {
      deferred += 1;
      continue;
    }
    const contact = await run.store.contact(draft.userId);
    if (!contact) continue;
    if (run.mode.since !== null && contact.createdAt < run.mode.since) continue;
    if (await run.store.optedOut(contact.email)) continue;
    if (!(await run.store.claim(draft.userId))) continue;
    const ok = await run.send({
      to: contact.email,
      locale: contact.locale,
      url: await run.link(draft, contact.locale),
      templateSlug: draft.slug,
      deletedOn: deletedOn(draft),
      onceKey: `unsent-gift/${draft.id}`,
    });
    if (ok) sent += 1;
    else failed += 1;
    await run.pause();
  }
  return { sent, failed, deferred };
}

/**
 * The live store. It reads a draft's ids, template and dates, and how many photos it holds: never
 * a name, a word or a file of it. The claim is the limiter's (Upstash), as the publish reminder's is;
 * when it can't be kept, Resend's once-only key still stops a second email for the same draft.
 */
export function supabaseUnsentGiftStore(admin: Db): UnsentGiftStore {
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    async drafts(from, to, limit) {
      const { data, error } = await admin
        .from("gifts")
        .select("id, user_id, template_slug, created_at, updated_at, photos:data->photos")
        .eq("status", "draft")
        // Unpublished by a refund or a chargeback: that one is not "left unsent".
        .is("published_at", null)
        .gte("updated_at", iso(from))
        .lte("updated_at", iso(to))
        .order("updated_at", { ascending: true })
        .limit(limit);
      if (error) {
        console.error("[unsent-gifts] drafts query failed", error.message);
        return [];
      }
      return (data ?? []).map((g) => ({
        id: g.id,
        userId: g.user_id,
        slug: g.template_slug,
        createdAt: Date.parse(g.created_at),
        updatedAt: Date.parse(g.updated_at),
        photos: Array.isArray(g.photos) ? g.photos.length : 0,
      }));
    },
    async paidSince(userIds, since) {
      const { data, error } = await admin.from("purchases").select("user_id, created_at").in("user_id", userIds).eq("status", "paid").gte("created_at", iso(since));
      // Unknown means paid: no email beats one to somebody who has just bought.
      if (error) throw new Error(`purchases query failed: ${error.message}`);
      return (data ?? []).flatMap((p) => (p.user_id ? [{ userId: p.user_id, at: Date.parse(p.created_at) }] : []));
    },
    async sentSince(userIds, since) {
      const { data, error } = await admin.from("gifts").select("user_id, updated_at").in("user_id", userIds).in("status", ["live", "scheduled"]).gte("updated_at", iso(since));
      if (error) throw new Error(`gifts query failed: ${error.message}`);
      return (data ?? []).map((g) => ({ userId: g.user_id, at: Date.parse(g.updated_at) }));
    },
    async contact(userId) {
      const { data } = await admin.from("profiles").select("email, locale, created_at").eq("id", userId).maybeSingle();
      return data?.email ? { email: data.email, locale: data.locale === "es" ? "es" : "en", createdAt: Date.parse(data.created_at) } : null;
    },
    optedOut: async (email) => optedOut(admin, await emailKey(email)),
    claim: (userId) => rateLimit(`unsent-gift:${userId}`, { limit: 1, windowSeconds: UNSENT_PER_ACCOUNT_SECONDS }),
  };
}
