import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/server";
import { fulfilCheckoutSession, revokePurchaseByPaymentIntent } from "@/lib/stripe/fulfil";

/** The only place money turns into unlocks. Verifies the Stripe signature on the raw body. */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, env.stripeWebhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `bad_signature: ${(e as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      // Expand nothing: everything we need is in metadata + payment_status.
      const result = await fulfilCheckoutSession(session);
      if (!result.ok && result.reason !== "unpaid") console.error("[stripe] fulfilment failed", event.id, result.reason);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi && charge.refunded) await revokePurchaseByPaymentIntent(pi);
      break;
    }
    case "charge.dispute.created": {
      // A chargeback takes the money back, so it takes the unlock back too.
      const dispute = event.data.object;
      const pi = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
      if (pi) await revokePurchaseByPaymentIntent(pi);
      break;
    }
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
