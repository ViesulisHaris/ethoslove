import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { AD_FBC, AD_FBP, AD_TTCLID, AD_TTP } from "@/lib/ads/purchase";
import { CHARGED_CURRENCIES, currencyFor, giftCardsOnSale, isProductId, subscriptionsEnabled, type Currency } from "@/lib/pricing/products";
import { getStripe, stripeProductIds } from "@/lib/stripe/server";
import { RETURN_PATH, membershipSessionParams, sessionParams, withdrawalNotice } from "@/lib/stripe/line-items";
import { createCheckoutSession } from "@/lib/stripe/create-session";
import { ethosCustomerFor } from "@/lib/stripe/subscriptions";
import { membershipContextOf } from "@/lib/commerce/memberships";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { siteOrigin } from "@/lib/commerce/db";
import { readBuyer } from "@/lib/commerce/buyer";
import { creditedCreator } from "@/lib/commerce/creators";
import { saveGiftCardDetails } from "@/lib/commerce/gift-cards";
import { planCheckout } from "@/lib/commerce/plan";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({
  product: z.string(),
  // Ethos for Two: { product: "membership", plan }. Whether that is a subscription or the one-time
  // year is the server's decision (STRIPE_SUBSCRIPTIONS_ENABLED), never the page's.
  plan: z.enum(["monthly", "yearly"]).optional(),
  templateSlugs: z.array(z.string().max(80)).max(10).default([]),
  packId: z.string().max(40).optional(),
  addEverything: z.boolean().optional(),
  returnTo: z.string().max(1000).regex(RETURN_PATH).optional(),
  currency: z.enum(["usd", "eur", "gbp"]).optional(),
  locale: z.enum(["en", "es"]).optional(),
  // Where the buyer came from (lib/attribution/ref.ts); a creator's personal link is "c-<code>".
  // A malformed one is dropped, never an error.
  ref: z.string().trim().toLowerCase().regex(REF_PATTERN).optional().catch(undefined),
  // A gift card's optional personal touch, printed in the email with the code. Kept in our database
  // until fulfilment, never sent to Stripe.
  giftCard: z
    .object({ recipientName: z.string().trim().max(60).optional(), note: z.string().trim().max(300).optional() })
    .optional()
    .catch(undefined),
  // Sent only by a browser whose visitor allowed advertising cookies (lib/analytics/ads.ts): its
  // presence is that consent, and the webhook reports the sale to Meta and TikTok only then. A
  // malformed id is dropped, never an error.
  ads: z
    .object({
      fbc: z.string().regex(AD_FBC).optional().catch(undefined),
      fbp: z.string().regex(AD_FBP).optional().catch(undefined),
      ttclid: z.string().regex(AD_TTCLID).optional().catch(undefined),
      ttp: z.string().regex(AD_TTP).optional().catch(undefined),
    })
    .optional()
    .catch(undefined),
});

/**
 * Creates a Stripe Checkout Session and returns its URL (contract C1). Every amount is worked out
 * here from the catalogue (lib/commerce/plan.ts) and charged as exactly that, so the price shown is
 * the price charged. Signed-in users get a pending purchase row up front; guests pay first, and
 * fulfilment creates their account from the email Stripe collects (lib/stripe/fulfil.ts), so nobody
 * has to sign in before paying. Only the upgrade needs an account: its price depends on it.
 * Ethos for Two ({ product: "membership", plan }) is a subscription while STRIPE_SUBSCRIPTIONS_ENABLED
 * is on and the one-time year otherwise; either way nobody is sold a second one (already_member,
 * payment_issue).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  // Purchases are written with the service role: users can only read their own rows (RLS), and the
  // amount must come from the server, never the client.
  const admin = getSupabaseAdminClient();
  if (!stripe || !admin) return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  if (!(await rateLimit(`checkout:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 600 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isProductId(parsed.data.product)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  const body = parsed.data;
  const product = parsed.data.product;
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  // Only ever a currency the site shows prices in.
  const currency: Currency =
    body.currency && CHARGED_CURRENCIES.includes(body.currency)
      ? body.currency
      : currencyFor(request.headers.get("x-vercel-ip-country") ?? request.headers.get("accept-language")?.split(",")[0]);

  const now = Date.now();
  const [creatorCode, owned, membership] = await Promise.all([
    creditedCreator(admin, body.ref, user?.email),
    readBuyer(admin, userId),
    userId && (product === "membership" || product === "pass") ? membershipContextOf(admin, userId, now) : null,
  ]);
  const plan = planCheckout(
    { product, templateSlugs: body.templateSlugs, packId: body.packId, addEverything: body.addEverything, currency, plan: body.plan },
    { signedIn: Boolean(user), creatorCode, giftCardsOnSale: giftCardsOnSale(), subscriptions: subscriptionsEnabled(), membership, ...owned },
  );
  if (!plan.ok) return NextResponse.json({ error: plan.error, ...(plan.needed ? { needed: plan.needed } : {}) }, { status: plan.status });

  let purchaseId: string;
  if (user) {
    const { data: purchase, error } = await admin
      .from("purchases")
      .insert({
        user_id: user.id,
        // What is sold, which for Ethos for Two the server decided: "membership" or the "pass".
        product: plan.product,
        template_slugs: plan.templateSlugs,
        amount: plan.total,
        currency,
        status: "pending",
        kind: plan.kind,
        creator_code: plan.creatorCode,
        ref: body.ref ?? null,
        discount_amount: null,
      })
      .select("id")
      .single();
    if (error || !purchase) {
      console.error("[stripe] purchase insert failed", error?.message);
      return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
    }
    purchaseId = purchase.id;
  } else {
    // Guest: the purchase row is written at fulfilment, under the account created for the buyer.
    purchaseId = crypto.randomUUID();
  }
  if (plan.product === "giftcard" && body.giftCard && !(await saveGiftCardDetails(admin, purchaseId, body.giftCard)))
    return NextResponse.json({ error: "purchase_failed" }, { status: 500 });
  const locale = body.locale ?? (request.headers.get("accept-language")?.toLowerCase().startsWith("es") ? "es" : "en");
  const origin = siteOrigin();

  const options = {
    purchaseId,
    userId,
    email: user?.email ?? null,
    locale,
    origin,
    returnTo: body.returnTo ?? "/dashboard",
    ref: body.ref,
    // The platforms need the buyer's browser for a website sale; the webhook only has Stripe's.
    ads: body.ads ? { ...body.ads, ua: request.headers.get("user-agent") ?? undefined } : undefined,
    automaticTax: process.env.STRIPE_AUTOMATIC_TAX === "true",
    productIds: stripeProductIds(),
  };
  // A subscription goes on the buyer's own Ethos customer when they have one (checked, R7); otherwise
  // Checkout makes one. A one-time session never has a customer at all (R10).
  const params =
    plan.billing === "subscription"
      ? membershipSessionParams(plan, { ...options, customerId: userId ? await ethosCustomerFor(admin, stripe, userId) : null })
      : sessionParams(plan, options);
  let session: Stripe.Checkout.Session;
  try {
    session = await createCheckoutSession(stripe, params, { withdrawalNotice: withdrawalNotice(plan.product, locale, origin, { plan: plan.plan, currency }) });
  } catch (e) {
    // The code and parameter only: Stripe's message can quote what was sent, the buyer's email included.
    const err = e as Partial<Stripe.errors.StripeError>;
    console.error("[stripe] checkout session failed", err.type ?? "unknown", err.code ?? "", err.param ?? "");
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
  if (user) await admin.from("purchases").update({ stripe_session_id: session.id }).eq("id", purchaseId);
  return NextResponse.json({ url: session.url });
}
