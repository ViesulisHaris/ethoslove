import type Stripe from "stripe";
import { env } from "@/lib/env";
import { siteOrigin } from "@/lib/commerce/db";
import { adPurchaseOf, consentedMatch, hashEmail, successUrl, type ReportDeps, type ReportOutcome } from "./purchase";

/** TikTok's Events API (2.0), for a paid checkout (see ./purchase.ts for what is sent and when). */

export const TIKTOK_EVENTS_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

export type TikTokServerEvent = {
  event: "Purchase";
  event_time: number;
  event_id: string;
  user: { email?: string; ttclid?: string; ttp?: string; user_agent?: string };
  page: { url: string };
  properties: { value: number; currency: string; content_type: "product"; contents: { content_id: string; content_type: "product"; content_category?: string }[] };
};

/** The Purchase event for a paid, consented Ethos checkout; null for anything else. */
export function tiktokPurchaseEvent(session: Stripe.Checkout.Session, at: { now: number; origin: string }): TikTokServerEvent | null {
  const match = consentedMatch(session);
  const purchase = adPurchaseOf(session);
  if (!match || !purchase) return null;
  return {
    event: "Purchase",
    event_time: Math.floor(at.now / 1000),
    event_id: purchase.eventId,
    user: {
      ...(match.email ? { email: hashEmail(match.email) } : {}),
      ...(match.ttclid ? { ttclid: match.ttclid } : {}),
      ...(match.ttp ? { ttp: match.ttp } : {}),
      ...(match.userAgent ? { user_agent: match.userAgent } : {}),
    },
    page: { url: successUrl(session, at.origin) },
    properties: {
      value: purchase.value,
      currency: purchase.currency,
      content_type: "product",
      contents: purchase.contents.map((c) => ({ content_id: c.id, content_type: "product", ...(c.category ? { content_category: c.category } : {}) })),
    },
  };
}

export type TikTokDeps = ReportDeps & { pixelId: string | undefined; token: string | undefined; testEventCode?: string };

const live = (): TikTokDeps => ({
  pixelId: env.tiktokPixelId,
  token: env.tiktokEventsToken,
  testEventCode: env.tiktokTestEventCode,
  origin: siteOrigin(),
  now: Date.now(),
  fetch: (input, init) => fetch(input, init),
});

/** Tells TikTok about a paid checkout. Never throws. */
export async function reportToTikTok(session: Stripe.Checkout.Session, overrides?: Partial<TikTokDeps>): Promise<ReportOutcome> {
  try {
    const deps = { ...live(), ...overrides };
    if (!deps.pixelId || !deps.token) return "skipped";
    const event = tiktokPurchaseEvent(session, deps);
    if (!event) return "skipped";
    const res = await deps.fetch(TIKTOK_EVENTS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "Access-Token": deps.token },
      body: JSON.stringify({ event_source: "web", event_source_id: deps.pixelId, data: [event], ...(deps.testEventCode ? { test_event_code: deps.testEventCode } : {}) }),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 5000),
    });
    // TikTok answers 200 with its own code: 0 is the only success.
    const body = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
    if (!res.ok || body?.code !== 0) {
      console.error("[ads] TikTok purchase not reported", res.status, body?.code ?? "", (body?.message ?? "").slice(0, 200));
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[ads] TikTok purchase not reported", (e as Error).name, ((e as Error).message ?? "").slice(0, 200));
    return "failed";
  }
}
