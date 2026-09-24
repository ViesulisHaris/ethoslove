import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleRevenueCatEvent, pullAppStore } from "@/lib/commerce/app-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Compared in constant time: the header is the only thing standing between anyone and a free unlock. */
function authorised(header: string | null, expected: string): boolean {
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * RevenueCat's webhook for the iPhone app's In-App Purchases (lib/commerce/app-store.ts). It must carry
 * exactly the Authorization value set in RevenueCat's dashboard (REVENUECAT_WEBHOOK_AUTH). A purchase
 * is recorded and granted, a refund takes it back; 500 on a failure so RevenueCat retries, and
 * `{ received: true }` otherwise, including for events that concern nothing we sell.
 */
export async function POST(request: NextRequest) {
  const expected = env.revenueCatWebhookAuth;
  if (!expected) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!authorised(request.headers.get("authorization"), expected)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let event: Record<string, unknown>;
  try {
    const body = (await request.json()) as { event?: unknown };
    if (!body || typeof body.event !== "object" || body.event === null || Array.isArray(body.event)) throw new Error("no event");
    event = body.event as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = Date.now();
  const secret = env.revenueCatSecretKey;
  const outcome = await handleRevenueCatEvent(db, event, now, { pull: secret ? (userId) => pullAppStore(db, userId, secret, now) : null });
  if (outcome.status === "failed") {
    console.error("[revenuecat] event not handled", event.id, event.type, outcome.error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
