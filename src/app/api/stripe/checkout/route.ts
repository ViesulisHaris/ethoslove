import { NextResponse, after, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { checkoutSourceInput, checkoutSourceRow, saveCheckoutSource } from "@/lib/attribution/checkout-source";
import { AD_FBC, AD_FBP, AD_TTCLID, AD_TTP } from "@/lib/ads/purchase";
import { CHARGED_CURRENCIES, giftCardsOnSale, isProductId, pairOnSale, subscriptionsEnabled, visitorCurrency, type Currency } from "@/lib/pricing/products";
import { getStripe, stripeProductIds } from "@/lib/stripe/server";
import { RETURN_PATH, membershipSessionParams, metadataRef, oneTapSessionParams, sellsInOneTap, sessionParams, withdrawalNotice } from "@/lib/stripe/line-items";
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
import { readyGifts, settlePairSessions } from "@/lib/commerce/gift-credits";
import { planCheckout } from "@/lib/commerce/plan";
import { PERSONAL_PRICE_COOKIE, activePersonalPrice } from "@/lib/commerce/personal-price";

export const runtime = "nodejs";
export const maxDuration = 10;

/** An id no account has: counting a guest's gifts ready (none) still tells whether their table is there. */
const NO_ONE = "00000000-0000-4000-8000-000000000000";

const input = z.object({
  product: z.string(),
  // Ethos for Two: { product: "membership", plan }. Whether that is a subscription or the one-time
  // year is the server's decision (STRIPE_SUBSCRIPTIONS_ENABLED), never the page's.
  plan: z.enum(["monthly", "yearly"]).optional(),
  templateSlugs: z.array(z.string().max(80)).max(10).default([]),
  packId: z.string().max(40).optional(),
  addEverything: z.boolean().optional(),
  // The second gift's template (lib/pricing/products.ts SECOND_GIFT), picked on the pay sheet.
  secondSlug: z.string().max(80).optional(),
  returnTo: z.string().max(1000).regex(RETURN_PATH).optional(),
  currency: z.enum(["usd", "eur", "gbp"]).optional(),
  locale: z.enum(["en", "es"]).optional(),
  // Where the buyer came from (lib/attribution/ref.ts); a creator's personal link is "c-<code>".
  // A malformed one is dropped, never an error.
  ref: z.string().trim().toLowerCase().regex(REF_PATTERN).optional().catch(undefined),
  // Where the buyer first came from (lib/attribution/first-visit.ts): kept in our database with the
  // purchase id, never sent to Stripe. Checked again field by field; a malformed one is dropped.
  source: checkoutSourceInput,
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
  // The one-tap Apple Pay / Google Pay buttons on the pay sheet (lib/stripe/line-items.ts,
  // oneTapSessionParams): a session for Stripe's buttons instead of a link to its page. Made only
  // with `waiver`, which the pay sheet sends once the buyer has ticked the withdrawal box there.
  oneTap: z.literal(true).optional(),
  waiver: z.literal(true).optional(),
  // The pay sheet showed a personal price (lib/commerce/personal-price.ts) and asks for it. The price
  // itself comes from the cookie the offer email's link set, checked here, never from the page.
  personalPrice: z.literal(true).optional(),
  // "Or this one and your next two": two more gifts added to this gift, offered on the pay panel only
  // to a reader who came from a reminder e-mail (lib/commerce/plan.ts decides whether it may be).
  addPair: z.literal(true).optional(),
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

  // The currency the page showed its price in, which every buy button sends (the page's [currency]
  // segment, src/proxy.ts), so the amount charged is the number the buyer saw. Without one, the
  // visitor's country, read the way the proxy reads it. Only ever a currency the site shows prices in.
  const currency: Currency = body.currency && CHARGED_CURRENCIES.includes(body.currency) ? body.currency : visitorCurrency(request.headers);

  const now = Date.now();
  const pairAsked = product === "pair";
  const [creatorCode, owned, membership, personalPrice, ready] = await Promise.all([
    creditedCreator(admin, body.ref, user?.email),
    readBuyer(admin, userId),
    userId && (product === "membership" || product === "pass" || pairAsked) ? membershipContextOf(admin, userId, now) : null,
    body.personalPrice ? activePersonalPrice(request.cookies.get(PERSONAL_PRICE_COOKIE)?.value, now) : null,
    // Two more gifts: how many the buyer has ready (null before migration 0024).
    userId && pairAsked ? readyGifts(admin, userId) : null,
  ]);
  // Two more gifts added to a gift: on sale, and how many the buyer has ready. A guest has none, but
  // the count is still read (for no one) so a database without their table refuses it.
  const addPair = body.addPair ? { onSale: pairOnSale(), ready: await readyGifts(admin, userId ?? NO_ONE) } : undefined;
  // Two more gifts are sold by one rule (lib/commerce/gift-credits.ts pairAllowed), on what the server read.
  const pair = pairAsked
    ? { onSale: pairOnSale(), ready, memberRunning: Boolean(membership?.running), paidProducts: owned.purchases.map((p) => p.product) }
    : undefined;
  const plan = planCheckout(
    { product, templateSlugs: body.templateSlugs, packId: body.packId, addEverything: body.addEverything, secondSlug: body.secondSlug, currency, plan: body.plan, personalPrice: body.personalPrice, addPair: body.addPair },
    { signedIn: Boolean(user), creatorCode, giftCardsOnSale: giftCardsOnSale(), subscriptions: subscriptionsEnabled(), membership, personalPrice, ...owned, ...(pair ? { pair } : {}), ...(addPair ? { addPair } : {}) },
  );
  if (!plan.ok) return NextResponse.json({ error: plan.error, ...(plan.needed ? { needed: plan.needed } : {}) }, { status: plan.status });
  // Before any purchase row: a one-tap session only for what the buttons sell, and only ticked.
  // A gift with two more is paid on Stripe's page only, where its box says what both keep.
  if (body.oneTap && (plan.billing === "subscription" || !sellsInOneTap(plan.product) || plan.pair)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  // Two more gifts have no box to tick: the 30-day line beside their wallet button is a notice (lib/stripe/line-items.ts).
  if (body.oneTap && !body.waiver && plan.product !== "pair") return NextResponse.json({ error: "consent_required" }, { status: 400 });
  // The offer card asks for a wallet session each time it comes into view: one still open of the same
  // kind and price is answered again instead of a new purchase row each time, and every other open
  // one is closed first, so only one checkout for two more gifts can ever be paid.
  if (plan.product === "pair" && user) {
    const open = await settlePairSessions(stripe, admin, user.id, now, { amount: plan.total, currency, oneTap: Boolean(body.oneTap) });
    if (open) return NextResponse.json(body.oneTap ? { clientSecret: open.client_secret, sessionId: open.id } : { url: open.url });
  }

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
        discount_amount: plan.personalPrice?.discount ?? null,
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
    // The one-tap session has no tickbox of Stripe's to fall back from: the box was ours, and ticked.
    session = body.oneTap
      ? await stripe.checkout.sessions.create(plan.product === "pair" ? oneTapSessionParams(params, { notice: "shown_at_payment" }) : oneTapSessionParams(params))
      : await createCheckoutSession(stripe, params, { withdrawalNotice: withdrawalNotice(plan.product, locale, origin, { plan: plan.plan, currency, pair: plan.pair }) });
  } catch (e) {
    // The code and parameter only: Stripe's message can quote what was sent, the buyer's email included.
    const err = e as Partial<Stripe.errors.StripeError>;
    console.error("[stripe] checkout session failed", err.type ?? "unknown", err.code ?? "", err.param ?? "");
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
  if (user) await admin.from("purchases").update({ stripe_session_id: session.id }).eq("id", purchaseId);
  // Where the buyer came from, stored once the buyer has their answer: it can't slow or fail checkout.
  // Not for the wallet session two more gifts make when their card is only seen: nobody has tapped
  // anything yet, and counting it as a checkout started would lower the checkout-to-paid rate
  // (/api/internal/sales, docs/marketing/META-ADS.md). "Pay by card instead" is a tap, and counts.
  const seenNotTapped = plan.product === "pair" && Boolean(body.oneTap);
  const source = seenNotTapped ? null : checkoutSourceRow(purchaseId, body.source, metadataRef(body.ref), now);
  if (source) after(() => saveCheckoutSource(admin, source));
  if (body.oneTap) return NextResponse.json(plan.product === "pair" ? { clientSecret: session.client_secret, sessionId: session.id } : { clientSecret: session.client_secret });
  return NextResponse.json({ url: session.url });
}

