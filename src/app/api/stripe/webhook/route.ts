import { NextResponse, after, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { fulfilCheckoutSession } from "@/lib/stripe/fulfil";
import { recoverExpiredSession } from "@/lib/stripe/recovery";
import { handleStripeEvent } from "@/lib/stripe/events";
import { sendMembershipEnded, sendMembershipPaymentProblem } from "@/lib/email/notify";
import { reportPurchase } from "@/lib/ads/report";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * The only place money turns into unlocks. Verifies the Stripe signature on the raw body, then hands
 * the event to lib/stripe/events.ts, which decides whether it is Ethos's at all (the account is
 * shared) and what it changes. 500 asks Stripe to retry, and only ever for our own events.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const db = getSupabaseAdminClient();
  if (!stripe || !env.stripeWebhookSecret || !db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, env.stripeWebhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `bad_signature: ${(e as Error).message}` }, { status: 400 });
  }

  const outcome = await handleStripeEvent(event, {
    db,
    stripe,
    now: Date.now(),
    fulfil: fulfilCheckoutSession,
    recover: recoverExpiredSession,
    // After Stripe has its answer: Meta or TikTok being slow or down never delays or fails the
    // webhook, and nothing is sent unless the buyer allowed advertising cookies (lib/ads/purchase.ts).
    paid: (session) => after(() => reportPurchase(session)),
    send: { ended: sendMembershipEnded, paymentProblem: sendMembershipPaymentProblem },
  });
  if (outcome.status === 500) return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  return NextResponse.json({ received: true });
}
