import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { getStripe, stripeProductIds } from "@/lib/stripe/server";
import { RETURN_PATH, sessionParams, withdrawalNotice } from "@/lib/stripe/line-items";
import { createCheckoutSession } from "@/lib/stripe/create-session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { siteOrigin } from "@/lib/commerce/db";
import { readBuyer } from "@/lib/commerce/buyer";
import { planCheckout } from "@/lib/commerce/plan";
import { SESSION_ID, buyerOfCheckout, checkoutCurrency, openUpgradeCheckout, signInBrowser } from "@/lib/commerce/after-checkout";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({
  sessionId: z.string().regex(SESSION_ID),
  returnTo: z.string().max(1000).regex(RETURN_PATH).optional(),
  locale: z.enum(["en", "es"]).optional(),
});

/**
 * POST /api/money/upgrade/after-checkout { sessionId, returnTo?, locale? } → { url } | { error }.
 * The success page's one button: Everything for the difference, for whoever has just finished the
 * checkout `sessionId` (lib/commerce/after-checkout.ts says who that is and when a guest may be
 * signed in from it). The price is worked out here, from what they have really paid, in the
 * currency they paid in, exactly as POST /api/stripe/checkout works out any upgrade: nothing the
 * page sends is an amount, a product or a user. A buyer with an upgrade checkout already open at
 * that price is sent back to it (a second tap, a second tab), so it can't be paid for twice.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const admin = getSupabaseAdminClient();
  if (!stripe || !admin) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  // As checkout's own: buyers can share an address (a phone network, a campus), and a made-up session id stops at the regex.
  if (!(await rateLimit(`upgrade-after:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 600 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const body = parsed.data;

  let finished: Stripe.Checkout.Session;
  try {
    finished = await stripe.checkout.sessions.retrieve(body.sessionId);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const buyer = await buyerOfCheckout(finished, await getCurrentUser());
  if (!buyer.ok) return NextResponse.json({ error: buyer.error }, { status: buyer.status });

  const currency = checkoutCurrency(finished);
  const plan = planCheckout(
    { product: "upgrade", templateSlugs: [], currency },
    // The sale it follows was credited to its creator already; the upgrade it brings on is too.
    { signedIn: true, creatorCode: buyer.sold.creatorCode, giftCardsOnSale: false, ...(await readBuyer(admin, buyer.userId)) },
  );
  if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: plan.status });

  // Signing in happens on the way out, once there is a checkout to go to: it spends the success
  // page's own one-time link.
  const leave = async (url: string) =>
    buyer.signIn && !(await signInBrowser(buyer.email!))
      ? NextResponse.json({ error: "sign_in_required" }, { status: 401 })
      : NextResponse.json({ url }, { headers: { "cache-control": "private, no-store" } });

  const open = await openUpgradeCheckout(stripe, buyer.userId, plan.total, currency);
  if (open) return leave(open);

  const locale = body.locale ?? buyer.sold.locale;
  const origin = siteOrigin();
  const { data: purchase, error } = await admin
    .from("purchases")
    .insert({
      user_id: buyer.userId,
      product: plan.product,
      template_slugs: plan.templateSlugs,
      amount: plan.total,
      currency,
      status: "pending",
      kind: plan.kind,
      creator_code: plan.creatorCode,
      ref: buyer.sold.ref,
      discount_amount: null,
    })
    .select("id")
    .single();
  if (error || !purchase) {
    console.error("[upgrade] purchase insert failed", error?.message);
    return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
  }
  let session: Stripe.Checkout.Session;
  try {
    session = await createCheckoutSession(
      stripe,
      sessionParams(plan, {
        purchaseId: purchase.id,
        userId: buyer.userId,
        email: buyer.email,
        locale,
        origin,
        returnTo: body.returnTo ?? "/dashboard",
        ref: buyer.sold.ref ?? undefined,
        automaticTax: process.env.STRIPE_AUTOMATIC_TAX === "true",
        productIds: stripeProductIds(),
      }),
      { withdrawalNotice: withdrawalNotice(plan.product, locale, origin, { currency }) },
    );
  } catch (e) {
    // The code and parameter only: Stripe's message can quote what was sent, the buyer's email included.
    const err = e as Partial<Stripe.errors.StripeError>;
    console.error("[upgrade] checkout session failed", err.type ?? "unknown", err.code ?? "", err.param ?? "");
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
  await admin.from("purchases").update({ stripe_session_id: session.id }).eq("id", purchase.id);
  // Last, once there is a checkout to go to: a guest's browser becomes the buyer's, so the upgrade's
  // success page and the way back to the gift (or the cancel link straight to it) find them signed in.
  return leave(session.url ?? "");
}
