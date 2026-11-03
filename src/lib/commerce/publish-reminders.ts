import "server-only";

import type Stripe from "stripe";
import { rateLimit } from "@/lib/rate-limit";
import type { Db } from "./db";

/**
 * "One step left" (api/cron/publish-reminders, every five minutes): a gift paid for and still not
 * published a quarter of an hour after the payment gets one email. A guest who leaves the success
 * page any way but "Back to your gift" reaches the editor signed out, and with Apple Pay the account
 * is often under an address they don't recognise; the email goes to that address, and its button
 * signs them in to it and opens the gift ready to publish (api/checkout/finish).
 *
 * Only a single or "make it special": each names the one template the gift is on. One email per
 * account and template, however many payments: a buyer charged twice gets one. It counts as published
 * once a gift of that template is live or scheduled and was saved after the first payment (or after
 * the purchase began, if that was earlier), a first publish or an update. Two hours after the last
 * payment it's too late to be a reminder.
 */

export const REMIND_AFTER_MS = 15 * 60_000;
export const REMIND_UNTIL_MS = 2 * 3_600_000;
/** A signed-in buyer's purchase begins when checkout opens, which can be well before the payment. */
const CHECKOUT_SLACK_MS = 3_600_000;
export const PUBLISH_REMINDER_BATCH = 100;

export type ReminderCandidate = { id: string; userId: string; slug: string; createdAt: number; paymentIntent: string | null; store: string | null };
export type PublishedGift = { userId: string; slug: string; savedAt: number };
type Locale = "en" | "es";

/** A gift of the candidate's template, live or scheduled, saved since `since` (when the purchase began, by default). */
export const isPublished = (candidate: Pick<ReminderCandidate, "userId" | "slug" | "createdAt">, gifts: PublishedGift[], since = candidate.createdAt): boolean =>
  gifts.some((g) => g.userId === candidate.userId && g.slug === candidate.slug && g.savedAt >= since);

/** A quarter of an hour after the first payment, and no more than two hours after the last. */
export const isDue = (firstPaid: number, now: number, lastPaid = firstPaid): boolean => now - firstPaid >= REMIND_AFTER_MS && now - lastPaid <= REMIND_UNTIL_MS;

/** How long the email's button signs its reader in. */
export const LINK_SECONDS = 3 * 86_400;
/**
 * Until when the button works: counted from the purchase, not from the run, so every run makes the
 * same email, and a second send of it is one Resend answers from its once-only key instead of refusing.
 */
export const linkUntil = (candidate: Pick<ReminderCandidate, "createdAt">): number => Math.floor(candidate.createdAt / 1000) + LINK_SECONDS;

export interface PublishReminderStore {
  /** Paid singles and "make it special"s that began between `from` and `to` (ms), oldest first. */
  candidates(from: number, to: number, limit: number): Promise<ReminderCandidate[]>;
  /** Live or scheduled gifts of these accounts saved since `since` (ms). */
  publishedSince(userIds: string[], since: number): Promise<PublishedGift[]>;
  /** When the money went through (ms); null when it can't be told this run. */
  paidAt(candidate: ReminderCandidate): Promise<number | null>;
  contact(userId: string): Promise<{ email: string; locale: Locale } | null>;
  /** True only the first time an account's template is asked for ("user:slug"). */
  claim(key: string): Promise<boolean>;
}

export type PublishReminderRun = {
  store: PublishReminderStore;
  /** `onceKey` names the email for Resend, per account and template, so it can only go once. */
  send: (args: { to: string; locale: Locale; url: string; templateSlug: string; onceKey: string }) => Promise<boolean>;
  /** The email's button: api/checkout/finish, signed for this purchase. */
  link: (candidate: ReminderCandidate, locale: Locale) => Promise<string>;
  now: number;
  inTime: () => boolean;
  pause: () => Promise<void>;
};

export async function sendPublishReminders(run: PublishReminderRun): Promise<{ sent: number; failed: number; deferred: number }> {
  const rows = await run.store.candidates(run.now - REMIND_UNTIL_MS - CHECKOUT_SLACK_MS, run.now - REMIND_AFTER_MS, PUBLISH_REMINDER_BATCH);
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  if (rows.length === 0) return { sent, failed, deferred };
  // Read from well before the oldest purchase: a payment Stripe could only deliver late (after an
  // outage) is recorded after a gift its buyer may already have published from another payment.
  const gifts = await run.store.publishedSince([...new Set(rows.map((r) => r.userId))], Math.min(...rows.map((r) => r.createdAt)) - REMIND_UNTIL_MS - CHECKOUT_SLACK_MS);
  // One reminder per account and template, however many payments for it: rows are oldest first.
  const groups = new Map<string, ReminderCandidate[]>();
  for (const row of rows) groups.set(`${row.userId}:${row.slug}`, [...(groups.get(`${row.userId}:${row.slug}`) ?? []), row]);
  for (const [key, group] of groups) {
    const first = group[0];
    if (isPublished(first, gifts)) continue;
    if (!run.inTime()) {
      deferred += 1;
      continue;
    }
    const paid = (await Promise.all(group.map((row) => run.store.paidAt(row)))).filter((at): at is number => at !== null);
    if (paid.length === 0) continue;
    const firstPaid = Math.min(...paid);
    // Published after the money went through, even if before a late payment was recorded.
    if (isPublished(first, gifts, Math.min(firstPaid, first.createdAt))) continue;
    if (!isDue(firstPaid, run.now, Math.max(...paid))) continue;
    const contact = await run.store.contact(first.userId);
    if (!contact || !(await run.store.claim(key))) continue;
    const ok = await run.send({ to: contact.email, locale: contact.locale, url: await run.link(first, contact.locale), templateSlug: first.slug, onceKey: `publish-reminder/${key}` });
    if (ok) sent += 1;
    else failed += 1;
    await run.pause();
  }
  return { sent, failed, deferred };
}

/**
 * The live store. The claim is the limiter's (Upstash), as the checkout-recovery email's is; when it
 * can't be kept, Resend's idempotency key still sends the email once (lib/email/notify.ts).
 */
export function supabasePublishReminderStore(admin: Db, stripe: Stripe | null): PublishReminderStore {
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    async candidates(from, to, limit) {
      const { data, error } = await admin
        .from("purchases")
        .select("id, user_id, template_slugs, created_at, stripe_payment_intent_id, store")
        .eq("status", "paid")
        .in("product", ["single", "extras"])
        // Bought in the iOS app: the app publishes it, and has no web editor to send them to.
        .or("store.is.null,store.neq.app_store")
        .not("user_id", "is", null)
        .gte("created_at", iso(from))
        .lte("created_at", iso(to))
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) {
        console.error("[publish-reminders] purchases query failed", error.message);
        return [];
      }
      return (data ?? []).flatMap((p) =>
        p.user_id && p.template_slugs[0]
          ? [{ id: p.id, userId: p.user_id, slug: p.template_slugs[0], createdAt: Date.parse(p.created_at), paymentIntent: p.stripe_payment_intent_id, store: p.store }]
          : [],
      );
    },
    async publishedSince(userIds, since) {
      const { data, error } = await admin.from("gifts").select("user_id, template_slug, updated_at").in("user_id", userIds).in("status", ["live", "scheduled"]).gte("updated_at", iso(since));
      // Unknown means published: no reminder beats one to somebody whose gift is already out.
      if (error) throw new Error(`gifts query failed: ${error.message}`);
      return (data ?? []).map((g) => ({ userId: g.user_id, slug: g.template_slug, savedAt: Date.parse(g.updated_at) }));
    },
    async paidAt(candidate) {
      // An Etsy order is claimed in the editor at Publish, and a guest's purchase is written at the payment.
      if (!candidate.paymentIntent || candidate.store === "etsy" || !stripe) return candidate.createdAt;
      try {
        const intent = await stripe.paymentIntents.retrieve(candidate.paymentIntent);
        return intent.created * 1000;
      } catch {
        return null;
      }
    },
    async contact(userId) {
      const { data } = await admin.from("profiles").select("email, locale").eq("id", userId).maybeSingle();
      return data?.email ? { email: data.email, locale: data.locale === "es" ? "es" : "en" } : null;
    },
    claim: (key) => rateLimit(`publish-reminder:${key}`, { limit: 1, windowSeconds: 86_400 }),
  };
}
