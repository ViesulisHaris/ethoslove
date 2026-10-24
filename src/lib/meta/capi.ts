import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { siteOrigin } from "@/lib/commerce/db";
import { ETHOS_APP } from "@/lib/stripe/line-items";
import type { MetaPurchase } from "@/lib/analytics/meta";

/**
 * Meta's Conversions API: the webhook tells Meta about a paid checkout itself, so a sale still counts
 * when the browser never reports it (an ad blocker, Safari, an Instagram browser closed on the success
 * page). The pixel reports the same sale from the browser with the same event id, and Meta counts the
 * pair once (lib/analytics/meta.ts).
 *
 * Only for a buyer who said yes to advertising cookies: their checkout carries `meta_consent` in its
 * metadata (app/api/stripe/checkout). Server-side reporting doesn't get around consent, so without it
 * nothing is sent. What goes: the amount, the currency, what was bought, the buyer's email and country
 * as SHA-256 hashes, Meta's click and browser ids when the browser had them, and the browser's user
 * agent (Meta needs it for a website event). Never the name, the address, a gift or the session id.
 *
 * Reporting a sale never decides anything about it: every failure is logged and swallowed.
 */

/** Graph API versions are usable for two years after the next one ships; v24.0 is from October 2025. */
export const GRAPH_API_VERSION = "v24.0";

/** Meta's click id as its `_fbc` cookie spells it: fb.<subdomain index>.<ms>.<fbclid>. */
export const META_FBC = /^fb\.\d\.\d{10,13}\.[\w.-]{1,420}$/;
/** Meta's browser id, its `_fbp` cookie: fb.<subdomain index>.<ms>.<random>. */
export const META_FBP = /^fb\.\d\.\d{10,13}\.[\w.-]{1,60}$/;

export const sha256 = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");

/** Meta's normalisation for an email before hashing: no surrounding spaces, lower case. */
export const hashEmail = (email: string): string => sha256(email.trim().toLowerCase());

/**
 * The event id both reports of one sale carry. A hash of the Checkout Session id rather than the id:
 * for 30 minutes a guest's session id signs whoever holds it in as the buyer (the success page), and
 * Meta only needs the same value from both sides, never the id itself.
 */
export const purchaseEventId = (sessionId: string): string => sha256(sessionId);

/** What one paid session is worth to Meta, the same on both sides: what was charged, VAT included. */
export function metaPurchaseOf(session: Stripe.Checkout.Session): MetaPurchase | null {
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
    contentIds: slugs.length > 0 ? slugs : item ? [item] : [],
  };
}

export type ServerEvent = {
  event_name: "Purchase";
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: { em?: string[]; country?: string[]; fbc?: string; fbp?: string; client_user_agent?: string };
  custom_data: { value: number; currency: string; content_ids: string[]; content_type: "product" };
};

/** The Purchase event for a paid, consented Ethos checkout; null for anything else. */
export function purchaseEvent(session: Stripe.Checkout.Session, at: { now: number; origin: string }): ServerEvent | null {
  const m = session.metadata ?? {};
  if (m.meta_consent !== "1") return null;
  const purchase = metaPurchaseOf(session);
  if (!purchase) return null;
  const email = session.customer_details?.email ?? session.customer_email;
  const country = session.customer_details?.address?.country;
  return {
    event_name: "Purchase",
    event_time: Math.floor(at.now / 1000),
    event_id: purchase.eventId,
    action_source: "website",
    // Where the sale happened, without the session id the real address carries.
    event_source_url: `${at.origin}${m.locale === "es" ? "/es" : ""}/checkout/success`,
    user_data: {
      ...(email ? { em: [hashEmail(email)] } : {}),
      ...(country ? { country: [sha256(country.trim().toLowerCase())] } : {}),
      ...(m.meta_fbc && META_FBC.test(m.meta_fbc) ? { fbc: m.meta_fbc } : {}),
      ...(m.meta_fbp && META_FBP.test(m.meta_fbp) ? { fbp: m.meta_fbp } : {}),
      ...(m.meta_ua ? { client_user_agent: m.meta_ua } : {}),
    },
    custom_data: { value: purchase.value, currency: purchase.currency, content_ids: purchase.contentIds, content_type: "product" },
  };
}

export type CapiDeps = {
  pixelId: string | undefined;
  token: string | undefined;
  /** Events Manager's test code: while set, events show under Test events instead of counting. */
  testEventCode?: string;
  origin: string;
  now: number;
  fetch: typeof fetch;
  timeoutMs?: number;
};

const liveDeps = (): CapiDeps => ({
  pixelId: env.metaPixelId,
  token: env.metaCapiToken,
  testEventCode: env.metaTestEventCode,
  origin: siteOrigin(),
  now: Date.now(),
  fetch: (...args) => fetch(...args),
});

/** Tells Meta about a paid checkout. Never throws: the answer is only for the log and the tests. */
export async function reportPurchaseToMeta(session: Stripe.Checkout.Session, deps: CapiDeps = liveDeps()): Promise<"sent" | "skipped" | "failed"> {
  try {
    if (!deps.pixelId || !deps.token) return "skipped";
    const event = purchaseEvent(session, deps);
    if (!event) return "skipped";
    const res = await deps.fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(deps.pixelId)}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [event], access_token: deps.token, ...(deps.testEventCode ? { test_event_code: deps.testEventCode } : {}) }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 5000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: number; error_subcode?: number; message?: string } } | null;
      const error = body?.error;
      console.error("[meta] purchase not reported", res.status, error?.code ?? "", error?.error_subcode ?? "", (error?.message ?? "").slice(0, 200));
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[meta] purchase not reported", (e as Error).name, (e as Error).message?.slice(0, 200));
    return "failed";
  }
}
