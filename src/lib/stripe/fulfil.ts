import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  BUMP,
  CHARGED_CURRENCIES,
  EVERY_TEMPLATE,
  PRODUCTS,
  formatAmount,
  isMembershipPlan,
  isProductId,
  membershipAmount,
  unlocksFor,
  type Currency,
  type MembershipPlan,
  type ProductId,
} from "@/lib/pricing/products";
import { PACK_NAMES, isPackId, type PackId } from "@/lib/games/packs";
import { getStripe } from "@/lib/stripe/server";
import { notifyReceipt, notifyWelcome, sendGiftCardEmail, sendMembershipWelcome, sendPassWelcome } from "@/lib/email/notify";
import { iso, inviteUrl, localePath, redeemUrl, siteOrigin, type Locale } from "@/lib/commerce/db";
import { upgradeOffer } from "@/lib/commerce/entitlements";
import { deleteGiftCardDetails, giftCardDetails, issueGiftCard } from "@/lib/commerce/gift-cards";
import { startSubscriptionMembership } from "@/lib/commerce/memberships";
import { startPass } from "@/lib/commerce/passes";
import { UPGRADE_CREDITED } from "@/lib/commerce/pricing";
import { foreverUnlocks, grantForever } from "@/lib/commerce/unlocks";
import { consentSentence } from "@/lib/stripe/line-items";
import { isEthosMetadata, normaliseSubscription, paymentIntentOfInvoice, tagCheckout } from "@/lib/stripe/subscriptions";
import { getManifest } from "@/templates/manifests";

export type Fulfilment = {
  ok: boolean;
  reason?: string;
  userId?: string;
  email?: string;
  createdUser?: boolean;
  /** A gift card purchase: the code, so the success page can show it as well as email it. */
  giftCardCode?: string;
  /** A pass or a membership: the link the owner sends their partner. */
  passInviteUrl?: string;
};

type Admin = SupabaseClient<Database>;

/** The receipt is written in the buyer's account language (notifyReceipt reads it from the profile). */
const LABELS: Record<Locale, Record<ProductId, string>> = {
  en: {
    single: "One template",
    pick3: "Pick three",
    everything: "Everything",
    extras: "Make it special",
    pass: "Ethos for Two (one year)",
    membership: "Ethos for Two",
    pack: "Game pack",
    giftcard: "Gift card: Give Everything",
    upgrade: "Upgrade to Everything",
  },
  es: {
    single: "Una plantilla",
    pick3: "Elige tres",
    everything: "Todo",
    extras: "Hazlo especial",
    pass: "Ethos for Two (un año)",
    membership: "Ethos for Two",
    pack: "Pack de juegos",
    giftcard: "Tarjeta regalo: Regálalo todo",
    upgrade: "Pasar a Todo",
  },
};

const RECEIPT_LINES = {
  en: {
    withBump: (label: string) => `${label} + every other template`,
    everyTemplate: "All templates, current and future",
    pass: "Every gift template and every game pack, for both of you",
    giftcard: "A gift card code for Everything, forever (sent in its own email)",
  },
  es: {
    withBump: (label: string) => `${label} + todas las demás plantillas`,
    everyTemplate: "Todas las plantillas, las de ahora y las que vengan",
    pass: "Todas las plantillas de regalo y todos los packs de juegos, para los dos",
    giftcard: "Un código de tarjeta regalo para «Todo», para siempre (te llega en otro correo)",
  },
} satisfies Record<Locale, unknown>;

/** What a session sold, read back from the metadata our checkout route wrote (Stripe signs it). */
export type Sold = {
  purchaseId: string;
  product: ProductId;
  slugs: string[];
  packId: PackId | null;
  bump: boolean;
  kind: string;
  creatorCode: string | null;
  ref: string | null;
  locale: Locale;
  /** Ethos for Two's plan: a membership's from the metadata, a pass's is "yearly"; null otherwise. */
  plan: MembershipPlan | null;
};

/**
 * Who a session was bought by, as our checkout wrote it: `ethos_user_id` on a membership (another
 * business on the shared account reads its own user-id key from any metadata, so Ethos never writes
 * that key: docs/MEMBERSHIP.md 2.1, R1), `user_id` on everything else. Empty for a guest.
 */
export function sessionUserId(session: Pick<Stripe.Checkout.Session, "metadata">): string | null {
  const m = session.metadata ?? {};
  return m.ethos_user_id || m.user_id || null;
}

export function readSession(session: Stripe.Checkout.Session): Sold | null {
  const m = session.metadata ?? {};
  // A subscription session never carries client_reference_id (another business on the account reads
  // it as its own user id): its purchase id is only ever in the metadata.
  const purchaseId = m.purchase_id ?? (session.mode === "subscription" ? null : session.client_reference_id);
  const product = m.product;
  if (!purchaseId || !product || !isProductId(product)) return null;
  const packId = product === "pack" ? (isPackId(m.pack_id) ? m.pack_id : null) : null;
  if (product === "pack" && !packId) return null;
  const plan = product === "membership" ? (isMembershipPlan(m.plan) ? m.plan : null) : product === "pass" ? "yearly" : null;
  if (product === "membership" && !plan) return null;
  const bump = m.bump === "1" && BUMP.onto.includes(product);
  return {
    purchaseId,
    product,
    slugs: (m.template_slugs ?? "").split(",").filter(Boolean),
    packId,
    bump,
    kind: m.kind || (bump ? "bump" : product),
    creatorCode: m.creator_code || null,
    ref: m.ref || null,
    locale: m.locale === "es" ? "es" : "en",
    plan,
  };
}

/**
 * What the buyer paid, in the currency the catalogue priced it in. When Stripe showed the buyer a
 * converted local price (Adaptive Pricing), the session's own amount is in that local currency; the
 * conversion block still holds the catalogue-currency figure, which is what upgrades and creator
 * commissions are worked out from.
 */
export function chargedAmount(session: Stripe.Checkout.Session, fallback: number): { amount: number; currency: string } {
  const conversion = session.currency_conversion;
  if (conversion?.source_currency) return { amount: conversion.amount_total, currency: conversion.source_currency };
  return { amount: session.amount_total ?? fallback, currency: session.currency ?? "eur" };
}

/**
 * What the buyer ticked at checkout: the withdrawal sentence Stripe showed them, word for word, when
 * session.consent says they accepted it. Null when Stripe couldn't show the box (checkout fell back to
 * the notice above the pay button), and then the purchase keeps its right to cancel.
 */
export function agreedConsent(session: Pick<Stripe.Checkout.Session, "consent" | "currency" | "currency_conversion">, sold: Pick<Sold, "product" | "locale" | "plan">): string | null {
  if (session.consent?.terms_of_service !== "accepted") return null;
  // A membership's box quotes its price, in the currency the catalogue priced it in.
  const currency = (session.currency_conversion?.source_currency ?? session.currency ?? "eur") as Currency;
  return consentSentence(sold.product, sold.locale, { plan: sold.plan, currency: CHARGED_CURRENCIES.includes(currency) ? currency : "eur" });
}

/** The unlock rows a template or pack purchase grants its buyer for good. Null when the metadata doesn't add up. */
export function foreverRowsFor(sold: Sold): string[] | null {
  if (sold.product === "pass" || sold.product === "membership" || sold.product === "giftcard") return [];
  try {
    const rows = unlocksFor(sold.product, sold.slugs, { packId: sold.packId ?? undefined });
    return sold.bump ? [...rows, EVERY_TEMPLATE] : rows;
  } catch {
    return null;
  }
}

/**
 * Marks a purchase paid and hands over what it bought. Idempotent: the webhook AND the success page
 * both call it, whichever lands first. Every grant is safe to repeat (unlock rows, the pass year and
 * the gift card are each keyed by the purchase), so it always re-applies them, even when the purchase
 * already reads paid; the emails that go with them are sent only by the call that made the thing.
 * Only trusts data verified with Stripe.
 */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session): Promise<Fulfilment> {
  if (session.mode === "subscription") return fulfilMembershipSession(session);
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, reason: "not_configured" };
  // Ethos sessions take no promotion codes, so there is always something to charge; a session that
  // needed no payment is still accepted, as it was before codes were switched off.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")
    return { ok: false, reason: "unpaid" };
  const sold = readSession(session);
  if (!sold) return { ok: false, reason: "bad_metadata" };
  const rows = foreverRowsFor(sold);
  if (!rows) return { ok: false, reason: "bad_metadata" };

  const buyer = session.metadata?.guest === "1" ? await claimGuest(admin, session, sold) : await claimSignedIn(admin, session, sold);
  if ("reason" in buyer) return { ok: false, reason: buyer.reason };
  const { userId, claimed } = buyer;
  const now = Date.now();
  const result: Fulfilment = { ok: true, userId, ...(buyer.guest ? { email: buyer.email ?? undefined, createdUser: buyer.createdUser } : {}) };
  const consent = agreedConsent(session, sold);
  if (consent) await recordConsent(admin, sold.purchaseId, consent, now);

  const lines = RECEIPT_LINES[buyer.locale];
  let unlockNames: string[];
  let until: string | undefined;
  if (sold.product === "pass") {
    const started = await startPass(admin, { purchaseId: sold.purchaseId, ownerId: userId, now });
    if ("error" in started) return { ok: false, reason: started.error };
    const invite = inviteUrl(started.pass.invite_code, sold.locale);
    // A renewal keeps the partner: the email then doesn't ask for the link to be sent again.
    if (started.created && buyer.email) await sendPassWelcome({ to: buyer.email, locale: sold.locale, inviteUrl: invite, endsAt: iso(started.paidUntil), partnerJoined: Boolean(started.pass.partner_user_id) });
    // The link lets whoever opens it into the pass. Stripe never checks the email typed at checkout,
    // so a guest who typed an existing account's address gets it by email, not on this page.
    if (!buyer.guest || buyer.createdUser || (await accountCreatedByCheckout(userId, session.id))) result.passInviteUrl = invite;
    unlockNames = [lines.pass];
    until = iso(started.paidUntil);
  } else if (sold.product === "giftcard") {
    const touch = await giftCardDetails(admin, sold.purchaseId);
    const issued = await issueGiftCard(admin, { purchaseId: sold.purchaseId, buyerId: userId, recipientName: touch.recipientName, note: touch.note, now });
    if ("error" in issued) return { ok: false, reason: issued.error };
    // The card carries them now: nothing personal is kept twice.
    if (touch.recipientName || touch.note) await deleteGiftCardDetails(admin, { purchaseId: sold.purchaseId });
    result.giftCardCode = issued.card.code;
    if (issued.created && buyer.email)
      await sendGiftCardEmail({
        to: buyer.email,
        locale: sold.locale,
        code: issued.card.code,
        redeemUrl: redeemUrl(issued.card.code, sold.locale),
        ...(issued.card.recipient_name ? { recipientName: issued.card.recipient_name } : {}),
        ...(issued.card.note ? { note: issued.card.note } : {}),
      });
    unlockNames = [lines.giftcard];
  } else {
    const granted = await grantForever(admin, userId, rows, sold.purchaseId);
    if (granted.error) return { ok: false, reason: granted.error };
    unlockNames = rows.map((row) =>
      row === EVERY_TEMPLATE
        ? lines.everyTemplate
        : sold.packId && row === `pack:${sold.packId}`
          ? PACK_NAMES[sold.packId][buyer.locale]
          : (getManifest(row)?.name[buyer.locale] ?? row),
    );
  }

  if (buyer.guest && buyer.createdUser) void notifyWelcome(buyer.email!, sold.locale).catch(() => {});
  if (claimed) {
    const label = sold.bump ? lines.withBump(LABELS[buyer.locale][sold.product]) : LABELS[buyer.locale][sold.product];
    // A pass lasts a year: `until` stops the receipt saying "yours, forever". A gift card keeps its
    // 14-day right to cancel until the code is redeemed, so its receipt must not say it's gone.
    const extra =
      sold.product === "pass"
        ? { until }
        : sold.product === "giftcard"
          ? { giftCard: true }
          : UPGRADE_CREDITED.some((p) => p === sold.product) && !sold.bump
            ? await receiptUpgrade(admin, userId, buyer.currency, buyer.locale)
            : undefined;
    // The receipt repeats the sentence they ticked, word for word: the confirmation on a durable
    // medium the law asks for. It is in the language Stripe showed it in.
    void notifyReceipt(userId, label, formatAmount(buyer.amount, buyer.currency as Currency, buyer.locale), unlockNames, consent ? { ...extra, consent } : extra).catch(() => {});
  }
  return result;
}

/**
 * A paid subscription checkout: Ethos for Two as a membership (docs/MEMBERSHIP.md 2.4). Idempotent
 * like the rest: the membership row is keyed by the subscription, the purchase by its id, and the
 * welcome goes only with the row's creation. Stripe is read before anything is written, so a call
 * that can't reach it changes nothing and the webhook's retry does it all. The welcome email is the
 * contract's confirmation on a durable medium (it repeats the box ticked), so a membership gets no
 * receipt ("one-time payment" is what a receipt says).
 */
async function fulfilMembershipSession(session: Stripe.Checkout.Session): Promise<Fulfilment> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, reason: "not_configured" };
  const sold = readSession(session);
  // The account is shared: a subscription session is ours only when it says so, all of it.
  if (!isEthosMetadata(session.metadata) || !sold || sold.product !== "membership" || !sold.plan) return { ok: false, reason: "not_ours" };
  // A delayed method (a bank debit): checkout.session.async_payment_succeeded finishes it.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return { ok: false, reason: "unpaid" };
  const stripe = getStripe();
  if (!stripe) return { ok: false, reason: "not_configured" };
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
  if (!subscriptionId) return { ok: false, reason: "bad_metadata" };

  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["customer", "latest_invoice.payments"] });
  } catch (e) {
    console.error("[stripe] subscription not retrieved", subscriptionId, (e as Error).message);
    return { ok: false, reason: "stripe_failed" };
  }
  if (!isEthosMetadata(subscription.metadata) || subscription.metadata.purchase_id !== sold.purchaseId) {
    console.error("[stripe] a membership session whose subscription isn't ours", session.id, subscriptionId);
    return { ok: false, reason: "bad_metadata" };
  }
  const snapshot = normaliseSubscription(subscription);
  // The checkout's own payment is the subscription's first invoice. A success page reopened after a
  // renewal finds a later one as the latest: that one is invoice.paid's to record, never this purchase's.
  const latest = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
  const invoice = latest?.billing_reason === "subscription_create" ? latest : null;

  const buyer = session.metadata?.guest === "1" ? await claimGuest(admin, session, sold) : await claimSignedIn(admin, session, sold);
  if ("reason" in buyer) return { ok: false, reason: buyer.reason };
  const { userId } = buyer;
  const now = Date.now();
  const result: Fulfilment = { ok: true, userId, ...(buyer.guest ? { email: buyer.email ?? undefined, createdUser: buyer.createdUser } : {}) };
  const consent = agreedConsent(session, sold);
  if (consent) await recordConsent(admin, sold.purchaseId, consent, now);

  const customer = typeof subscription.customer === "object" && !subscription.customer.deleted ? subscription.customer : null;
  await tagCheckout(stripe, {
    customerId: snapshot.customerId,
    customerTagged: Boolean(customer && isEthosMetadata(customer.metadata) && customer.metadata.ethos_user_id === userId),
    subscription: snapshot,
    invoiceId: invoice && !isEthosMetadata(invoice.metadata) ? invoice.id : null,
    userId,
    purchaseId: sold.purchaseId,
  });

  const started = await startSubscriptionMembership(admin, { purchaseId: sold.purchaseId, ownerId: userId, customerId: snapshot.customerId, subscription: snapshot, now });
  if ("error" in started) return { ok: false, reason: started.error };
  const { row } = started;
  const { error: linked } = await admin.from("purchases").update({ membership_id: row.id }).eq("id", sold.purchaseId);
  if (linked) console.error("[stripe] membership purchase not linked: is migration 0014 applied?", sold.purchaseId, linked.message);
  // A subscription session has no payment intent of its own: the first invoice's is the payment, and
  // refunds and disputes find the purchase by it. invoice.paid may have filled it in first.
  else if (invoice)
    await admin
      .from("purchases")
      .update({ stripe_invoice_id: invoice.id, stripe_payment_intent_id: paymentIntentOfInvoice(invoice) })
      .eq("id", sold.purchaseId)
      .is("stripe_invoice_id", null);

  const invite = inviteUrl(row.invite_code, sold.locale);
  const currency = (CHARGED_CURRENCIES as string[]).includes(snapshot.currency ?? "") ? (snapshot.currency as Currency) : "eur";
  if (started.created && buyer.email)
    await sendMembershipWelcome({
      to: buyer.email,
      locale: sold.locale,
      plan: row.plan,
      // What it renews at: the subscription's own price, as charged.
      amount: snapshot.currency === currency && snapshot.unitAmount !== null ? snapshot.unitAmount : membershipAmount(row.plan, currency),
      currency,
      renewsOn: row.current_period_end ?? row.ends_at,
      inviteUrl: row.partner_user_id ? undefined : invite,
      consent,
    });
  if (buyer.guest && buyer.createdUser) void notifyWelcome(buyer.email!, sold.locale).catch(() => {});
  // The same rule as the pass's link: whoever opens it joins, and Stripe never checks the email typed.
  if (!row.partner_user_id && (!buyer.guest || buyer.createdUser || (await accountCreatedByCheckout(userId, session.id)))) result.passInviteUrl = invite;
  return result;
}

/**
 * "Everything for the difference", on the receipt of a single, a pick three or "make it special":
 * the same price the account page and checkout work out (lib/commerce/entitlements.ts), in the
 * currency just paid in. Nothing when they already own Everything or the lookup fails.
 */
async function receiptUpgrade(admin: Admin, userId: string, currency: string, locale: Locale): Promise<{ upgrade: { url: string; amountLabel: string } } | undefined> {
  if (!CHARGED_CURRENCIES.includes(currency as Currency)) return undefined;
  try {
    const [forever, { data: purchases, error }] = await Promise.all([
      foreverUnlocks(admin, userId),
      admin.from("purchases").select("product, amount, currency, status").eq("user_id", userId).eq("status", "paid"),
    ]);
    if (error) return undefined;
    const offer = upgradeOffer(forever, purchases ?? [], currency as Currency);
    if (!offer) return undefined;
    return { upgrade: { url: `${siteOrigin()}${localePath(locale, "/account")}`, amountLabel: formatAmount(offer.amount, offer.currency, locale) } };
  } catch {
    // The claim above is already made: a receipt without its upsell line beats no receipt.
    return undefined;
  }
}

type Buyer =
  | { userId: string; email: string | null; locale: Locale; claimed: boolean; guest: boolean; createdUser: boolean; amount: number; currency: string }
  | { reason: string };

const asLocale = (value: string | null | undefined, fallback: Locale): Locale => (value === "es" || value === "en" ? value : fallback);

/** The fields that say what a purchase was and who brought it (migration 0009). */
function commerceColumns(sold: Sold) {
  return { kind: sold.kind, creator_code: sold.creatorCode, ref: sold.ref };
}

/**
 * Stores what the buyer agreed to (migration 0012), once. Written on its own after the claim, so a
 * database that doesn't have the columns yet costs the record, never the purchase: said loudly.
 */
async function recordConsent(admin: Admin, purchaseId: string, consent: string, now: number): Promise<void> {
  const { error } = await admin.from("purchases").update({ terms_consent: consent, terms_consent_at: iso(now) }).eq("id", purchaseId).is("terms_consent", null);
  if (error) console.error("[stripe] withdrawal consent not recorded: is migration 0012 applied?", purchaseId, error.message);
}

/**
 * Signed in: checkout wrote a pending purchase. Moving it to paid only where it is still pending is
 * the claim: of two calls racing, one wins it and sends the receipt. A refunded one stays refunded:
 * reopening the success page, or a late webhook retry, must not hand the unlock back.
 */
async function claimSignedIn(admin: Admin, session: Stripe.Checkout.Session, sold: Sold): Promise<Buyer> {
  const userId = sessionUserId(session);
  if (!userId) return { reason: "bad_metadata" };
  const { data: purchase } = await admin.from("purchases").select("id, status, user_id, stripe_payment_intent_id").eq("id", sold.purchaseId).single();
  if (!purchase || purchase.user_id !== userId) return { reason: "purchase_mismatch" };
  if (purchase.status === "refunded") return { reason: "refunded" };
  flagSecondPayment(purchase, session);
  const { amount, currency } = chargedAmount(session, 0);
  let claimed = false;
  if (purchase.status === "pending") {
    if (await paymentReversed(session)) {
      await admin.from("purchases").update({ status: "refunded" }).eq("id", sold.purchaseId);
      return { reason: "refunded" };
    }
    const { data } = await admin
      .from("purchases")
      .update({ status: "paid", stripe_payment_intent_id: paymentIntentOf(session), stripe_session_id: session.id, amount, currency })
      .eq("id", sold.purchaseId)
      .eq("status", "pending")
      .select("id");
    claimed = (data ?? []).length > 0;
  }
  const { data: profile } = await admin.from("profiles").select("email, locale").eq("id", userId).maybeSingle();
  const email = profile?.email || session.customer_details?.email || null;
  return { userId, email, locale: asLocale(profile?.locale, sold.locale), claimed, guest: false, createdUser: false, amount, currency };
}

/**
 * Guest checkout: the buyer paid before having an account. Find or create the user from the email
 * Stripe collected and record the paid purchase under it. Inserting the row is the claim; the
 * purchase id is fixed in the session metadata, so both fulfilment paths agree on it.
 */
async function claimGuest(admin: Admin, session: Stripe.Checkout.Session, sold: Sold): Promise<Buyer> {
  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!email) return { reason: "no_email" };
  const { data: existing } = await admin.from("purchases").select("id, status, user_id, stripe_payment_intent_id").eq("id", sold.purchaseId).maybeSingle();
  if (existing?.status === "refunded") return { reason: "refunded" };
  if (existing) flagSecondPayment(existing, session);
  if (!existing && (await paymentReversed(session))) return { reason: "refunded" };
  // Fulfilled once already, into an account that has since been deleted (0011 keeps the sale, not
  // the account): there is nobody left to hand it to, and a new account must not inherit it.
  if (existing && !existing.user_id) return { reason: "account_deleted" };

  const { userId, created } = existing?.user_id ? { userId: existing.user_id, created: false } : await findOrCreateUser(admin, email, sold.locale, session.id);
  const { amount, currency } = chargedAmount(session, sold.product === "membership" && sold.plan ? membershipAmount(sold.plan, "eur") : PRODUCTS[sold.product].amounts.eur);
  const { data, error } = await admin
    .from("purchases")
    .upsert(
      {
        id: sold.purchaseId,
        user_id: userId,
        product: sold.product,
        template_slugs: sold.packId ? [`pack:${sold.packId}`] : sold.slugs,
        amount,
        currency,
        status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentOf(session),
        ...commerceColumns(sold),
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { reason: error.message };
  const claimed = (data ?? []).length > 0;
  // Written first by another deployment's webhook (the live site shares the database and the Stripe
  // account): fill in what that code doesn't know about.
  if (!claimed) await admin.from("purchases").update(commerceColumns(sold)).eq("id", sold.purchaseId).is("kind", null);
  const { data: profile } = await admin.from("profiles").select("locale").eq("id", userId).maybeSingle();
  return { userId, email, locale: asLocale(profile?.locale, sold.locale), claimed, guest: true, createdUser: created, amount, currency };
}

/** An account made by guest checkout records the session that made it (see accountCreatedByCheckout). */
async function findOrCreateUser(
  admin: Admin,
  email: string,
  locale: "en" | "es",
  sessionId: string,
): Promise<{ userId: string; created: boolean }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profile) return { userId: profile.id, created: false };
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { locale },
    app_metadata: { checkout_session: sessionId },
  });
  if (data?.user) return { userId: data.user.id, created: true };
  // Lost a race with the other fulfilment path, or the auth user exists without a profile yet.
  const { data: again } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (again) return { userId: again.id, created: false };
  throw new Error(error?.message ?? "user_create_failed");
}

/**
 * True when this checkout session created the account, so it holds nothing but what was just
 * bought. Stripe never verifies the email typed at checkout: only an account like that may be
 * signed in from the success page. Anyone who already had an account signs in to it as usual.
 * app_metadata is writable by the service role only, so a user can't forge the marker.
 */
export async function accountCreatedByCheckout(userId: string, sessionId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  if (!admin) return false;
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.app_metadata?.checkout_session === sessionId;
}

/**
 * A recovery link opens a fresh copy of the expired session, purchase id and all, so a buyer who
 * opens it twice can pay twice for one purchase. The second payment unlocks nothing new (and a pass
 * gets one year, not two), so it has to be found and refunded by hand: say so loudly.
 */
function flagSecondPayment(purchase: { status: string; stripe_payment_intent_id: string | null }, session: Stripe.Checkout.Session): void {
  const paymentIntent = paymentIntentOf(session);
  if (purchase.status === "paid" && purchase.stripe_payment_intent_id && paymentIntent && purchase.stripe_payment_intent_id !== paymentIntent)
    console.error("[stripe] a second payment for one purchase: refund it", session.id, paymentIntent);
}

function paymentIntentOf(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? null);
}

/** Whether the money already went back: the charge was fully refunded or is disputed. */
async function paymentReversed(session: Stripe.Checkout.Session): Promise<boolean> {
  const stripe = getStripe();
  const paymentIntent = paymentIntentOf(session);
  if (!stripe || !paymentIntent) return false;
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge"] });
    const charge = intent.latest_charge;
    return typeof charge === "object" && charge !== null && (charge.refunded || charge.disputed);
  } catch (e) {
    // Never block a real purchase because Stripe was briefly unreachable.
    console.error("[stripe] refund check failed", (e as Error).message);
    return false;
  }
}
