import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";
import {
  PRODUCTS,
  formatAmount,
  hasUnlock,
  isProductId,
  unlocksFor,
  type Currency,
} from "@/lib/pricing/products";
import { getStripe } from "@/lib/stripe/server";
import { premiumExtras } from "@/lib/gift/publish";
import type { GiftData } from "@/lib/gift/schema";
import { notifyReceipt, notifyWelcome } from "@/lib/email/notify";
import { getManifest } from "@/templates/manifests";

export type Fulfilment = {
  ok: boolean;
  reason?: string;
  userId?: string;
  email?: string;
  createdUser?: boolean;
};

type Admin = SupabaseClient<Database>;
const LABELS: Record<string, string> = {
  single: "One template",
  pick3: "Pick three",
  everything: "Everything",
};

/**
 * Marks a purchase paid and grants unlocks. Idempotent: safe to call from the webhook
 * AND from the success page (whichever lands first). Only trusts data verified with Stripe.
 */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session): Promise<Fulfilment> {
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, reason: "not_configured" };
  // A 100% promotion code completes the session with nothing to charge: still a sale.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")
    return { ok: false, reason: "unpaid" };

  const purchaseId = session.metadata?.purchase_id ?? session.client_reference_id;
  const product = session.metadata?.product;
  const slugs = (session.metadata?.template_slugs ?? "").split(",").filter(Boolean);
  if (!purchaseId || !product || !isProductId(product))
    return { ok: false, reason: "bad_metadata" };
  if (session.metadata?.guest === "1")
    return fulfilGuest(admin, session, purchaseId, product, slugs);

  const userId = session.metadata?.user_id;
  if (!userId) return { ok: false, reason: "bad_metadata" };

  const { data: purchase } = await admin
    .from("purchases")
    .select("id, status, user_id")
    .eq("id", purchaseId)
    .single();
  if (!purchase || purchase.user_id !== userId) return { ok: false, reason: "purchase_mismatch" };
  if (purchase.status === "paid") return { ok: true, userId };
  // A refunded session still reads "paid" at Stripe: reopening the success page, or a late webhook
  // retry, must not hand the unlock back.
  if (purchase.status === "refunded" || (await paymentReversed(session))) {
    await admin.from("purchases").update({ status: "refunded" }).eq("id", purchaseId);
    return { ok: false, reason: "refunded" };
  }

  await admin
    .from("purchases")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentOf(session),
      stripe_session_id: session.id,
    })
    .eq("id", purchaseId);

  const rows = unlocksFor(product, slugs).map((template_slug) => ({
    user_id: userId,
    template_slug,
    purchase_id: purchaseId,
  }));
  const { error } = await admin
    .from("template_unlocks")
    .upsert(rows, { onConflict: "user_id,template_slug", ignoreDuplicates: true });
  if (error) return { ok: false, reason: error.message };
  const currency = (session.currency ?? "usd") as Currency;
  const amount = session.amount_total ?? PRODUCTS[product].amounts[currency] ?? 0;
  const unlockNames =
    product === "everything"
      ? ["All templates, current and future"]
      : slugs.map((s) => getManifest(s)?.name.en ?? s);
  void notifyReceipt(
    userId,
    LABELS[product] ?? product,
    formatAmount(amount, currency),
    unlockNames,
  ).catch(() => {});
  return { ok: true, userId };
}

/**
 * Guest checkout: the buyer paid before having an account. Find or create the user from the
 * email Stripe collected, record the paid purchase under it and grant the unlocks. Safe to run
 * from both the webhook and the success page; the purchase id is fixed in the session metadata.
 */
async function fulfilGuest(
  admin: Admin,
  session: Stripe.Checkout.Session,
  purchaseId: string,
  product: "single" | "pick3" | "everything",
  slugs: string[],
): Promise<Fulfilment> {
  const email = session.customer_details?.email?.trim().toLowerCase();
  if (!email) return { ok: false, reason: "no_email" };
  const locale = session.metadata?.locale === "es" ? "es" : "en";

  const { data: existing } = await admin
    .from("purchases")
    .select("id, status, user_id")
    .eq("id", purchaseId)
    .maybeSingle();
  if (existing?.status === "paid") return { ok: true, userId: existing.user_id, email };
  if (existing?.status === "refunded" || (await paymentReversed(session)))
    return { ok: false, reason: "refunded" };

  const { userId, created } = await findOrCreateUser(admin, email, locale, session.id);
  const currency = (session.currency ?? "usd") as Currency;
  const amount = session.amount_total ?? PRODUCTS[product].amounts[currency] ?? 0;
  const { error: purchaseErr } = await admin
    .from("purchases")
    .upsert(
      {
        id: purchaseId,
        user_id: userId,
        product,
        template_slugs: product === "everything" ? [] : slugs,
        amount,
        currency,
        status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentOf(session),
      },
      { onConflict: "id" },
    );
  if (purchaseErr) return { ok: false, reason: purchaseErr.message };

  const rows = unlocksFor(product, slugs).map((template_slug) => ({
    user_id: userId,
    template_slug,
    purchase_id: purchaseId,
  }));
  const { error } = await admin
    .from("template_unlocks")
    .upsert(rows, { onConflict: "user_id,template_slug", ignoreDuplicates: true });
  if (error) return { ok: false, reason: error.message };

  const unlockNames =
    product === "everything"
      ? ["All templates, current and future"]
      : slugs.map((s) => getManifest(s)?.name.en ?? s);
  if (created) void notifyWelcome(email, locale).catch(() => {});
  void notifyReceipt(
    userId,
    LABELS[product] ?? product,
    formatAmount(amount, currency),
    unlockNames,
  ).catch(() => {});
  return { ok: true, userId, email, createdUser: created };
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

/** A refund or a chargeback takes back the unlocks the purchase granted, and what was published with them. */
export async function revokePurchaseByPaymentIntent(paymentIntentId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  const { data: purchase } = await admin
    .from("purchases")
    .select("id, user_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!purchase) return;
  await admin.from("purchases").update({ status: "refunded" }).eq("id", purchase.id);
  await admin.from("template_unlocks").delete().eq("purchase_id", purchase.id);
  await relockGifts(admin, purchase.user_id);
}

/**
 * Live and scheduled gifts with no unlock left behind them: one that uses a paid feature goes back
 * to draft (republishing asks for payment again), one that only paid to drop the footer gets it back.
 */
async function relockGifts(admin: Admin, userId: string): Promise<void> {
  const [{ data: unlocks }, { data: gifts }] = await Promise.all([
    admin.from("template_unlocks").select("template_slug").eq("user_id", userId),
    admin
      .from("gifts")
      .select("id, template_slug, data, watermark, password_hash, unlock_at")
      .eq("user_id", userId)
      .in("status", ["live", "scheduled"]),
  ]);
  const owned = (unlocks ?? []).map((u) => u.template_slug);
  for (const gift of gifts ?? []) {
    if (hasUnlock(owned, gift.template_slug)) continue;
    const data = gift.data as unknown as GiftData;
    const paidFeature =
      getManifest(gift.template_slug)?.tier !== "free" ||
      premiumExtras({ ...data, photos: Array.isArray(data.photos) ? data.photos : [] }).length > 0 ||
      gift.password_hash !== null ||
      gift.unlock_at !== null;
    if (paidFeature) await admin.from("gifts").update({ status: "draft" }).eq("id", gift.id);
    else if (!gift.watermark)
      await admin
        .from("gifts")
        .update({ watermark: true, data: { ...data, watermark: true } as unknown as Json })
        .eq("id", gift.id);
  }
}
