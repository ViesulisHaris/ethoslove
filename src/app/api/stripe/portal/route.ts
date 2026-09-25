import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { createPortalSession, isEthosMetadata, isOurCustomer } from "@/lib/stripe/subscriptions";
import { ETHOS_APP } from "@/lib/stripe/line-items";
import { localePath, siteOrigin } from "@/lib/commerce/db";
import { isRunning } from "@/lib/commerce/passes";

export const runtime = "nodejs";
export const maxDuration = 15;

const NO_STORE = { "cache-control": "private, no-store" };

const input = z.object({ flow: z.enum(["manage", "update_card", "cancel"]).default("manage"), locale: z.enum(["en", "es"]).optional() });

/**
 * POST /api/stripe/portal { flow?: "manage" | "update_card" | "cancel" } → { url }: Stripe's Customer
 * Portal for the owner of an Ethos for Two subscription (their card, their invoices, cancelling),
 * always on Ethos's own portal configuration (docs/MEMBERSHIP.md 2.1, R5): without
 * STRIPE_PORTAL_CONFIGURATION it refuses rather than fall back to the shared account's default. An
 * ended subscription still opens it, so its invoices stay reachable. The customer must be one Ethos
 * made for this user (R7). It comes back to the account page's Ethos for Two section.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return reply(401, { error: "unauthenticated" });
  if (!(await rateLimit(`portal:${user.id}`, { limit: 10, windowSeconds: 60 }))) return reply(429, { error: "rate_limited" });
  const parsed = input.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return reply(400, { error: "invalid_input" });
  const configuration = env.stripePortalConfiguration;
  if (!configuration) return reply(503, { error: "portal_not_configured" });
  const stripe = getStripe();
  const db = getSupabaseAdminClient();
  if (!stripe || !db) return reply(503, { error: "not_configured" });

  const now = Date.now();
  const [{ data: owned = [] }, { data: joined = [] }] = await Promise.all([
    db.from("couple_passes").select("*").eq("owner_user_id", user.id),
    db.from("couple_passes").select("id").eq("partner_user_id", user.id),
  ]);
  const subscription = (owned ?? [])
    .filter((row) => row.provider === "stripe_subscription" && row.stripe_customer_id && row.stripe_subscription_id)
    .sort((a, b) => Number(isRunning(b, now)) - Number(isRunning(a, now)) || Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!subscription) {
    const running = (owned ?? []).filter((row) => isRunning(row, now));
    if (running.length > 0) return reply(409, { error: "not_available", reason: running.some((row) => row.provider === "app_store") ? "app_store" : "pass" });
    return (joined ?? []).length > 0 ? reply(403, { error: "not_owner" }) : reply(404, { error: "not_member" });
  }
  const { flow } = parsed.data;
  if (flow === "cancel" && (subscription.cancel_at_period_end || subscription.status === "ended")) return reply(409, { error: "not_available", reason: subscription.status === "ended" ? "ended" : "cancelling" });

  const customerId = subscription.stripe_customer_id!;
  try {
    if (!(await isOurCustomer(stripe, customerId, user.id)) && !(await claimCustomer(stripe, customerId, subscription.stripe_subscription_id!, subscription.purchase_id, user.id)))
      return reply(409, { error: "not_available", reason: "customer" });
    const locale = parsed.data.locale ?? (request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en");
    const url = await createPortalSession(stripe, {
      customerId,
      configuration,
      locale,
      returnUrl: `${siteOrigin()}${localePath(locale, "/account")}#for-two`,
      flow,
      subscriptionId: subscription.stripe_subscription_id,
    });
    return reply(200, { url });
  } catch (e) {
    const err = e as Partial<Stripe.errors.StripeError>;
    console.error("[stripe] portal session failed", err.type ?? "unknown", err.code ?? "", err.param ?? "");
    return reply(502, { error: "stripe_failed" });
  }
}

/**
 * A customer checkout made for this user's subscription whose tag didn't stick at fulfilment: it is
 * ours when the subscription on it is, for this very purchase. Tagged now, so the check holds next time.
 */
async function claimCustomer(stripe: Stripe, customerId: string, subscriptionId: string, purchaseId: string, userId: string): Promise<boolean> {
  const [customer, sub] = await Promise.all([stripe.customers.retrieve(customerId), stripe.subscriptions.retrieve(subscriptionId)]);
  if (customer.deleted || customer.metadata?.app || !isEthosMetadata(sub.metadata) || sub.metadata.purchase_id !== purchaseId) return false;
  const subCustomer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (subCustomer !== customerId) return false;
  await stripe.customers.update(customerId, { metadata: { app: ETHOS_APP, ethos_user_id: userId } });
  return true;
}

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}
