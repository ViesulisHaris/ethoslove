import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { stripeBilling } from "@/lib/stripe/subscriptions";
import { sendMembershipEnded, sendMembershipRenewalReminder, sendPassRenewalReminder } from "@/lib/email/notify";
import { iso, pricingUrl, renewUrl } from "@/lib/commerce/db";
import { applyPendingSwitches, applySubscriptionState, reconcileSubscriptions, remindYearlyRenewals } from "@/lib/commerce/memberships";
import { fetchSubscriberJson, reconcileAppStoreSubscriptions } from "@/lib/commerce/app-store";
import { env } from "@/lib/env";
import { remindRenewals, sweepEndedPasses } from "@/lib/commerce/passes";
import { deleteGiftCardDetails, staleGiftCardDetailsBefore } from "@/lib/commerce/gift-cards";
import { membershipAmount, subscriptionsEnabled } from "@/lib/pricing/products";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily (vercel.json, 06:00 UTC), Ethos for Two's housekeeping, in this order (docs/MEMBERSHIP.md 2.9):
 * 1. subscriptions whose paid period has passed are read again, from Stripe or from RevenueCat, so a
 *    missed webhook never costs anyone access (the week's grace gives seven runs);
 * 2. yearly → monthly switches the owner asked for are made a couple of days before the year ends;
 * 3. a week before a yearly renewal, its owner gets one email saying when and how much;
 * 4. 14 days before a one-time year ends, its owner gets one email (nothing renews it by itself);
 * 5. whatever has ended loses its unlock rows, for the owner and the partner, and anyone with another
 *    membership running gets them straight back from it. Gifts sent while it ran stay live.
 * It also deletes the gift card names and notes that abandoned checkouts left behind (0012).
 */
export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret nobody can trigger the cron.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const now = Date.now();
  const stripe = getStripe();
  const billing = stripe ? stripeBilling(stripe) : null;

  const reconciled = billing ? await reconcileSubscriptions(admin, now, billing, { sendEnded: sendMembershipEnded }) : null;
  const revenueCat = env.revenueCatSecretKey;
  const appStore = revenueCat ? await reconcileAppStoreSubscriptions(admin, now, (userId) => fetchSubscriberJson(userId, revenueCat), { sendEnded: sendMembershipEnded }) : null;
  const switched = billing ? await applyPendingSwitches(admin, now, billing, { sendEnded: sendMembershipEnded }) : null;
  const yearly = await remindYearlyRenewals(admin, now, async (row) => {
    // The amount it really renews at is the subscription's own price: ask Stripe, which also says
    // whether it still renews at all (the claim is released and tried tomorrow if it can't be asked).
    if (!billing || !row.stripe_subscription_id) return false;
    const sub = await billing.retrieve(row.stripe_subscription_id).catch(() => null);
    if (!sub) return false;
    if (sub.status !== "active" || sub.cancelAtPeriodEnd || sub.cancelAt !== null) {
      // Cancelled (or failing) without the webhook saying so: the row learns it, which takes it off this list.
      await applySubscriptionState(admin, row, sub, now, { sendEnded: sendMembershipEnded });
      return false;
    }
    const currency = sub.currency === "usd" || sub.currency === "gbp" ? sub.currency : "eur";
    return sendMembershipRenewalReminder(row, { amount: sub.unitAmount ?? membershipAmount("yearly", currency), currency });
  });
  // While subscriptions are on, a pass can't be bought again: its email points to monthly or yearly instead.
  const subscriptions = subscriptionsEnabled();
  const reminders = await remindRenewals(admin, now, async (pass) => {
    const { data: owner } = await admin.from("profiles").select("email, locale").eq("id", pass.owner_user_id).maybeSingle();
    if (!owner?.email) return false;
    const locale = owner.locale === "es" ? "es" : "en";
    return sendPassRenewalReminder({ to: owner.email, locale, endsAt: iso(Date.parse(pass.ends_at)), renewUrl: subscriptions ? pricingUrl(locale) : renewUrl(locale), subscriptions });
  });
  const swept = await sweepEndedPasses(admin, now);
  await deleteGiftCardDetails(admin, { olderThan: staleGiftCardDetailsBefore(now) });

  return NextResponse.json({ ok: true, reconciled, appStore, switched, yearly, reminders, swept });
}
