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
 * Only a single or "make it special": each names the one template the gift is on. A purchase counts
 * as published once a gift of that template is live or scheduled and was saved after the purchase
 * began, a first publish or an update. Two hours after the payment it's too late to be a reminder.
 */

export const REMIND_AFTER_MS = 15 * 60_000;
export const REMIND_UNTIL_MS = 2 * 3_600_000;
/** A signed-in buyer's purchase begins when checkout opens, which can be well before the payment. */
const CHECKOUT_SLACK_MS = 3_600_000;
export const PUBLISH_REMINDER_BATCH = 100;

export type ReminderCandidate = { id: string; userId: string; slug: string; createdAt: number; paymentIntent: string | null; store: string | null };
export type PublishedGift = { userId: string; slug: string; savedAt: number };
type Locale = "en" | "es";

export const isPublished = (candidate: ReminderCandidate, gifts: PublishedGift[]): boolean =>
  gifts.some((g) => g.userId === candidate.userId && g.slug === candidate.slug && g.savedAt >= candidate.createdAt);

export const isDue = (paidAt: number, now: number): boolean => now - paidAt >= REMIND_AFTER_MS && now - paidAt <= REMIND_UNTIL_MS;

export interface PublishReminderStore {
  /** Paid singles and "make it special"s that began between `from` and `to` (ms), oldest first. */
  candidates(from: number, to: number, limit: number): Promise<ReminderCandidate[]>;
  /** Live or scheduled gifts of these accounts saved since `since` (ms). */
  publishedSince(userIds: string[], since: number): Promise<PublishedGift[]>;
  /** When the money went through (ms); null when it can't be told this run. */
  paidAt(candidate: ReminderCandidate): Promise<number | null>;
  contact(userId: string): Promise<{ email: string; locale: Locale } | null>;
  /** True only the first time a purchase is asked for. */
  claim(purchaseId: string): Promise<boolean>;
}

export type PublishReminderRun = {
  store: PublishReminderStore;
  send: (args: { to: string; locale: Locale; url: string; templateSlug: string; purchaseId: string }) => Promise<boolean>;
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
  const gifts = await run.store.publishedSince([...new Set(rows.map((r) => r.userId))], Math.min(...rows.map((r) => r.createdAt)));
  for (const row of rows) {
    if (isPublished(row, gifts)) continue;
    if (!run.inTime()) {
      deferred += 1;
      continue;
    }
    const paidAt = await run.store.paidAt(row);
    if (paidAt === null || !isDue(paidAt, run.now)) continue;
    const contact = await run.store.contact(row.userId);
    if (!contact || !(await run.store.claim(row.id))) continue;
    const ok = await run.send({ to: contact.email, locale: contact.locale, url: await run.link(row, contact.locale), templateSlug: row.slug, purchaseId: row.id });
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
    claim: (purchaseId) => rateLimit(`publish-reminder:${purchaseId}`, { limit: 1, windowSeconds: 86_400 }),
  };
}
