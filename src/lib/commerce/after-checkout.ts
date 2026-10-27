import "server-only";

import type Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CHARGED_CURRENCIES, PRODUCTS, type Currency } from "@/lib/pricing/products";
import { accountCreatedByCheckout, chargedAmount, fulfilCheckoutSession, readSession, sessionUserId, type Sold } from "@/lib/stripe/fulfil";
import { ETHOS_APP } from "@/lib/stripe/line-items";
import { upgradesAfter } from "@/components/pricing/offers";
import { occasionsAhead, sortedOccasion, type AheadOccasion } from "@/lib/lifecycle/occasions-ahead";
import { readBuyer } from "./buyer";
import { upgradeOffer, type UpgradeOffer } from "./entitlements";
import { creditedPurchases } from "./pricing";

/**
 * "Every template for the difference", offered on the success page to whoever has just bought a
 * single, a pick three or "make it special", and bought in one tap from there, signed in or not.
 *
 * Who is buying comes from the checkout they have just finished, never from the page: its session
 * id reached only their browser (Stripe redirects there with it) and Stripe signs what it says. A
 * signed-in buyer must be the account the checkout was for. A guest, whose browser isn't signed in
 * yet, may be signed in from it only while it is fresh and only into an account that same checkout
 * created, exactly as the success page's own sign-in does: Stripe never checks the email typed at
 * checkout, so an existing account's owner signs in as usual and is offered nothing here.
 */

/** A guest's checkout may sign that browser in only this soon after it was created. */
export const GUEST_SIGN_IN_WINDOW_S = 30 * 60;

export const isFresh = (createdAtSeconds: number, now = Date.now()) => now / 1000 - createdAtSeconds < GUEST_SIGN_IN_WINDOW_S;

/** A Checkout Session id as Stripe makes them: anything else is never looked up. */
export const SESSION_ID = /^cs_(?:test|live)_[A-Za-z0-9]{10,250}$/;

export type BuyerRefusal = { ok: false; error: "not_found" | "unpaid" | "not_eligible" | "sign_in_required" | "wrong_account" | "refunded"; status: number };
export type CheckoutBuyer = { ok: true; userId: string; email: string | null; sold: Sold; signIn: boolean };

const refuse = (error: BuyerRefusal["error"], status: number): BuyerRefusal => ({ ok: false, error, status });

/** The catalogue currency the checkout was priced in: what the upgrade is quoted and charged in. */
export function checkoutCurrency(session: Stripe.Checkout.Session): Currency {
  const { currency } = chargedAmount(session, 0);
  return CHARGED_CURRENCIES.find((c) => c === currency) ?? CHARGED_CURRENCIES[0];
}

/**
 * Who bought `session`, and whether this browser may act for them now. Fulfils a guest's checkout
 * first (idempotent: the success page and the webhook do too), since a guest's account exists only
 * once it has been.
 */
export async function buyerOfCheckout(session: Stripe.Checkout.Session, user: Pick<User, "id" | "email"> | null, now = Date.now()): Promise<CheckoutBuyer | BuyerRefusal> {
  // The Stripe account is shared: another business's session is nobody's here.
  if (session.metadata?.app !== ETHOS_APP || session.mode !== "payment") return refuse("not_found", 404);
  const sold = readSession(session);
  if (!sold) return refuse("not_found", 404);
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return refuse("unpaid", 409);
  if (!upgradesAfter(sold)) return refuse("not_eligible", 409);

  if (session.metadata?.guest === "1") {
    const fulfilled = await fulfilCheckoutSession(session);
    if (!fulfilled.ok || !fulfilled.userId) return fulfilled.reason === "refunded" ? refuse("refunded", 409) : refuse("not_eligible", 409);
    if (user) return user.id === fulfilled.userId ? { ok: true, userId: user.id, email: user.email ?? fulfilled.email ?? null, sold, signIn: false } : refuse("wrong_account", 403);
    if (!fulfilled.email || !isFresh(session.created, now) || !(await accountCreatedByCheckout(fulfilled.userId, session.id))) return refuse("sign_in_required", 401);
    return { ok: true, userId: fulfilled.userId, email: fulfilled.email, sold, signIn: true };
  }
  const buyerId = sessionUserId(session);
  if (!buyerId || !user) return refuse("sign_in_required", 401);
  if (user.id !== buyerId) return refuse("wrong_account", 403);
  return { ok: true, userId: user.id, email: user.email ?? null, sold, signIn: false };
}

/**
 * Signs this browser in as `email`, as the success page's one-time link would (a magic link made and
 * spent at once, so it never travels). Only for a CheckoutBuyer with `signIn`. The session cookies go
 * out with the response; false when Supabase refuses.
 */
export async function signInBrowser(email: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const supabase = await getSupabaseServerClient();
  if (!admin || !supabase) return false;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return false;
  const { error: refused } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (refused) console.error("[upgrade] sign-in after checkout refused", refused.message);
  return !refused;
}

/**
 * The buyer's upgrade checkout that is still open at this price, for a second tap to go back to
 * instead of opening another: two open checkouts could both be paid, and the difference charged
 * twice. One open at another price (what they own has changed since) is closed, so only the right
 * one can still be paid. Null when there is none to go back to.
 */
export async function openUpgradeCheckout(stripe: Stripe, userId: string, amount: number, currency: Currency): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("purchases")
    .select("stripe_session_id, amount, currency")
    .eq("user_id", userId)
    .eq("product", "upgrade")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);
  let url: string | null = null;
  for (const row of data ?? []) {
    const session = row.stripe_session_id ? await stripe.checkout.sessions.retrieve(row.stripe_session_id).catch(() => null) : null;
    if (session?.status !== "open") continue;
    if (!url && session.url && row.amount === amount && row.currency === currency) url = session.url;
    else await stripe.checkout.sessions.expire(session.id).catch(() => null);
  }
  return url;
}

/** What the success page's upgrade card says: the price, the credit behind it, and the days ahead. */
export type UpgradeAfter = {
  offer: UpgradeOffer;
  /** Everything's full price in that currency, which the credit counts towards. */
  full: number;
  /** What this checkout charged, in the same currency. */
  paid: number;
  /** Earlier purchases count too, so the credit is more than this one. */
  earlier: boolean;
  sorted: AheadOccasion | null;
  ahead: AheadOccasion[];
};

/**
 * The upgrade to offer the buyer of `session` on the success page, or null: not a purchase that
 * counts towards it, Everything already theirs, or nothing to read it with. Worked out from what
 * checkout itself reads (readBuyer, upgradeOffer), so the price shown is the price charged.
 */
export async function upgradeAfterCheckout(session: Stripe.Checkout.Session, sold: Sold, userId: string, now = Date.now()): Promise<UpgradeAfter | null> {
  if (!upgradesAfter(sold)) return null;
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  try {
    const currency = checkoutCurrency(session);
    const buyer = await readBuyer(admin, userId);
    const offer = upgradeOffer(buyer.ownedForever, buyer.purchases, currency, { now });
    if (!offer || offer.amount >= PRODUCTS.everything.amounts[currency]) return null;
    const sorted = sortedOccasion(sold.slugs);
    return {
      offer,
      full: PRODUCTS.everything.amounts[currency],
      paid: chargedAmount(session, 0).amount,
      earlier: creditedPurchases(buyer.purchases, { now }).length > 1,
      sorted,
      ahead: occasionsAhead(sorted, new Date(now)),
    };
  } catch (e) {
    // An offer is never worth a broken success page.
    console.error("[upgrade] success page quote failed", (e as Error).message);
    return null;
  }
}
