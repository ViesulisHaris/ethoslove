import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { getStripe } from "@/lib/stripe/server";
import { ETHOS_APP } from "@/lib/stripe/line-items";
import { fulfilCheckoutSession, sessionUserId } from "@/lib/stripe/fulfil";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { SESSION_ID, settledSession } from "@/lib/commerce/after-checkout";
import { readyGifts } from "@/lib/commerce/gift-credits";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ sessionId: z.string().regex(SESSION_ID) });
const NO_STORE = { "cache-control": "private, no-store" };

/**
 * POST /api/money/pair/confirm { sessionId } → { giftsReady } | { error }. Called by the share
 * screen's "two more gifts" card once the wallet button has confirmed in place (no redirect): the
 * session is read from Stripe, waited on for the few seconds a wallet payment takes to be marked
 * paid, and fulfilled here, beside the webhook (fulfilCheckoutSession is safe to run twice). Only
 * the signed-in buyer the session was made for may ask, and only about an Ethos session for "pair".
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const admin = getSupabaseAdminClient();
  if (!stripe || !admin) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  if (!(await rateLimit(`pair-confirm:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 600 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  let session: Stripe.Checkout.Session;
  try {
    session = await settledSession(stripe, parsed.data.sessionId);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // The Stripe account is shared: anything but our own pair, bought by this account, is nobody's here.
  if (session.metadata?.app !== ETHOS_APP || session.metadata?.product !== "pair" || sessionUserId(session) !== user.id)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.payment_status !== "paid") return NextResponse.json({ error: "unpaid" }, { status: 409 });

  const fulfilled = await fulfilCheckoutSession(session);
  if (!fulfilled.ok) return NextResponse.json({ error: fulfilled.reason ?? "not_fulfilled" }, { status: 409 });
  return NextResponse.json({ giftsReady: (await readyGifts(admin, user.id)) ?? 0 }, { headers: NO_STORE });
}
