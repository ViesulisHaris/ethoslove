import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { ETHOS_APP } from "@/lib/stripe/line-items";
import { getManifest } from "@/templates/manifests";
import type { AdPurchase } from "@/lib/analytics/ads";

/**
 * A paid checkout, reported to the ad platforms from the server: the webhook tells Meta (Conversions
 * API) and TikTok (Events API) about the sale itself, so it still counts when the browser never
 * reports it (an ad blocker, Safari, an in-app browser closed on the success page). The pixels report
 * the same sale from the browser with the same event id, and each platform counts the pair once
 * (lib/analytics/ads.ts).
 *
 * Only for a buyer who said yes to advertising cookies: their checkout carries `ads_consent` in its
 * metadata (app/api/stripe/checkout). Server-side reporting doesn't get around consent, so without it
 * nothing is sent. What goes: the amount, the currency, what was bought, the buyer's email (and, to
 * Meta, country) as SHA-256 hashes, the platforms' click and browser ids when the browser had them, and
 * the browser's user agent. Never the name, the address, a gift or the session id.
 *
 * Reporting a sale never decides anything about it: every failure is logged and swallowed.
 */

/** Meta's click id as its `_fbc` cookie spells it: fb.<subdomain index>.<ms>.<fbclid>. */
export const AD_FBC = /^fb\.\d\.\d{10,13}\.[\w.-]{1,420}$/;
/** Meta's browser id, its `_fbp` cookie: fb.<subdomain index>.<ms>.<random>. */
export const AD_FBP = /^fb\.\d\.\d{10,13}\.[\w.-]{1,60}$/;
/** TikTok's click id, as it arrives in `?ttclid=`. */
export const AD_TTCLID = /^[\w.-]{1,400}$/;
/** TikTok's browser id, its `_ttp` cookie. */
export const AD_TTP = /^[\w.-]{1,100}$/;

export const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

/** Both platforms' normalisation for an email before hashing: no surrounding spaces, lower case. */
export const hashEmail = (email: string): string => sha256(email.trim().toLowerCase());

/**
 * The event id both reports of one sale carry. A hash of the Checkout Session id rather than the id:
 * for 30 minutes a guest's session id signs whoever holds it in as the buyer (the success page), and a
 * platform only needs the same value from both sides, never the id itself.
 */
export const purchaseEventId = (sessionId: string): string => sha256(sessionId);

/** What one paid Ethos session is, for the ads: the same on both sides. What was charged, VAT included. */
export function adPurchaseOf(session: Stripe.Checkout.Session): AdPurchase | null {
  const m = session.metadata ?? {};
  if (m.app !== ETHOS_APP || session.payment_status !== "paid") return null;
  if (!session.amount_total || session.amount_total <= 0 || !session.currency) return null;
  const slugs = (m.template_slugs ?? "").split(",").filter(Boolean);
  const item = m.pack_id || m.product;
  return {
    eventId: purchaseEventId(session.id),
    // Ethos only charges in USD, EUR and GBP, all in cents.
    value: session.amount_total / 100,
    currency: session.currency.toUpperCase(),
    // A template's tier ("free" or "premium"), so a "viewed premium, didn't buy" audience can drop buyers.
    contents: slugs.length > 0 ? slugs.map((id) => ({ id, category: getManifest(id)?.tier ?? "template" })) : item ? [{ id: item, category: m.product || "product" }] : [],
  };
}

/** The buyer, as the platforms match people: only for a consented checkout, and only the fields that are well formed. */
export type AdMatch = { email?: string; country?: string; fbc?: string; fbp?: string; ttclid?: string; ttp?: string; userAgent?: string };

export function consentedMatch(session: Stripe.Checkout.Session): AdMatch | null {
  const m = session.metadata ?? {};
  if (m.ads_consent !== "1") return null;
  const valid = (value: string | undefined, pattern: RegExp) => (value && pattern.test(value) ? value : undefined);
  const match: AdMatch = {
    email: session.customer_details?.email ?? session.customer_email ?? undefined,
    country: session.customer_details?.address?.country ?? undefined,
    fbc: valid(m.ads_fbc, AD_FBC),
    fbp: valid(m.ads_fbp, AD_FBP),
    ttclid: valid(m.ads_ttclid, AD_TTCLID),
    ttp: valid(m.ads_ttp, AD_TTP),
    userAgent: m.ads_ua || undefined,
  };
  return Object.fromEntries(Object.entries(match).filter(([, v]) => v)) as AdMatch;
}

export type ReportDeps = { origin: string; now: number; fetch: typeof fetch; timeoutMs?: number };

/** Where the sale happened, without the session id the real address carries. */
export const successUrl = (session: Stripe.Checkout.Session, origin: string) => `${origin}${session.metadata?.locale === "es" ? "/es" : ""}/checkout/success`;

export type ReportOutcome = "sent" | "skipped" | "failed";
