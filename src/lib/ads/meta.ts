import type Stripe from "stripe";
import { env } from "@/lib/env";
import { siteOrigin } from "@/lib/commerce/db";
import { adPurchaseOf, consentedMatch, hashEmail, sha256, successUrl, type ReportDeps, type ReportOutcome } from "./purchase";

/** Meta's Conversions API, for a paid checkout (see ./purchase.ts for what is sent and when). */

/** Graph API versions stay usable for two years after the next one ships; v24.0 is from October 2025. */
export const GRAPH_API_VERSION = "v24.0";

export type MetaServerEvent = {
  event_name: "Purchase";
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url: string;
  user_data: { em?: string[]; country?: string[]; fbc?: string; fbp?: string; client_user_agent?: string };
  custom_data: { value: number; currency: string; content_ids: string[]; content_type: "product"; contents: { id: string; quantity: number }[]; content_category?: string };
};

/** The Purchase event for a paid, consented Ethos checkout; null for anything else. */
export function metaPurchaseEvent(session: Stripe.Checkout.Session, at: { now: number; origin: string }): MetaServerEvent | null {
  const match = consentedMatch(session);
  const purchase = adPurchaseOf(session);
  if (!match || !purchase) return null;
  const category = purchase.contents.find((c) => c.category)?.category;
  return {
    event_name: "Purchase",
    event_time: Math.floor(at.now / 1000),
    event_id: purchase.eventId,
    action_source: "website",
    event_source_url: successUrl(session, at.origin),
    user_data: {
      ...(match.email ? { em: [hashEmail(match.email)] } : {}),
      ...(match.country ? { country: [sha256(match.country.trim().toLowerCase())] } : {}),
      ...(match.fbc ? { fbc: match.fbc } : {}),
      ...(match.fbp ? { fbp: match.fbp } : {}),
      // Meta needs the buyer's browser for a website event; the webhook only has Stripe's.
      ...(match.userAgent ? { client_user_agent: match.userAgent } : {}),
    },
    custom_data: {
      value: purchase.value,
      currency: purchase.currency,
      content_ids: purchase.contents.map((c) => c.id),
      content_type: "product",
      contents: purchase.contents.map((c) => ({ id: c.id, quantity: 1 })),
      ...(category ? { content_category: category } : {}),
    },
  };
}

export type MetaDeps = ReportDeps & { pixelId: string | undefined; token: string | undefined; testEventCode?: string };

const live = (): MetaDeps => ({
  pixelId: env.metaPixelId,
  token: env.metaCapiToken,
  testEventCode: env.metaTestEventCode,
  origin: siteOrigin(),
  now: Date.now(),
  fetch: (input, init) => fetch(input, init),
});

/** Tells Meta about a paid checkout. Never throws. */
export async function reportToMeta(session: Stripe.Checkout.Session, overrides?: Partial<MetaDeps>): Promise<ReportOutcome> {
  try {
    const deps = { ...live(), ...overrides };
    if (!deps.pixelId || !deps.token) return "skipped";
    const event = metaPurchaseEvent(session, deps);
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
      console.error("[ads] Meta purchase not reported", res.status, error?.code ?? "", error?.error_subcode ?? "", (error?.message ?? "").slice(0, 200));
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[ads] Meta purchase not reported", (e as Error).name, ((e as Error).message ?? "").slice(0, 200));
    return "failed";
  }
}
