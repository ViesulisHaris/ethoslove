import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { getStripe } from "@/lib/stripe/server";
import { RETURN_PATH } from "@/lib/stripe/line-items";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { SESSION_ID, buyerOfCheckout, signInBrowser } from "@/lib/commerce/after-checkout";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({
  sessionId: z.string().regex(SESSION_ID),
  returnTo: z.string().max(1000).regex(RETURN_PATH).optional(),
  locale: z.enum(["en", "es"]).optional(),
});

const NO_STORE = { "cache-control": "private, no-store" };

/**
 * POST /api/checkout/continue { sessionId, returnTo?, locale? } → { url }. "Back to your gift" on a
 * guest's success page that waits for a tap (the one with the upgrade card): the browser is signed in
 * as the buyer at the moment of the tap, by the same rules as the upgrade (lib/commerce/
 * after-checkout.ts), instead of through a one-time link made when the page was drawn. A link like
 * that is spent by the upgrade's own sign-in, and a page the browser brings back from its cache, or a
 * second tab, would still carry it. Whoever can't be signed in from the checkout (too late, another
 * account) is sent to sign in, and on to the gift after.
 */
export async function POST(request: NextRequest) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const next = parsed.data.returnTo ?? "/dashboard";
  const signIn = { url: `${parsed.data.locale === "es" ? "/es" : ""}/login?next=${encodeURIComponent(next)}` };
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(signIn, { headers: NO_STORE });
  if (!(await rateLimit(`checkout-continue:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 600 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let finished: Stripe.Checkout.Session;
  try {
    finished = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);
  } catch {
    return NextResponse.json(signIn, { headers: NO_STORE });
  }
  const buyer = await buyerOfCheckout(finished, await getCurrentUser());
  if (!buyer.ok) return NextResponse.json(signIn, { headers: NO_STORE });
  if (buyer.signIn && !(await signInBrowser(buyer.email!))) return NextResponse.json(signIn, { headers: NO_STORE });
  return NextResponse.json({ url: next }, { headers: NO_STORE });
}
