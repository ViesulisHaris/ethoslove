import Stripe from "stripe";
import { MEMBERSHIP_PLANS, PRODUCTS, membershipAmount, type Currency, type MembershipPlan } from "@/lib/pricing/products";
import type { BillingPort, SubscriptionSnapshot, SwitchOutcome } from "@/lib/commerce/memberships";
import type { Db } from "@/lib/commerce/db";
import type { PortalFlow } from "@/lib/membership/types";
import { ETHOS_APP } from "./line-items";

/**
 * Ethos for Two's subscriptions on the Stripe account Ethos shares with other businesses. Everything
 * here follows docs/MEMBERSHIP.md 2.1: Ethos's objects carry `metadata.app = "ethos"` and the key
 * `ethos_user_id` (never the key the others read as their user id, R1), a customer is only ever reused when Ethos made it for
 * that very user (R7), prices are made inline (R6), and nothing is a trial (R8). The membership logic
 * itself (lib/commerce/memberships.ts) never sees Stripe: it gets a SubscriptionSnapshot and a
 * BillingPort from here.
 *
 * The SDK speaks API 2026-08-26.dahlia: a subscription's period is on its item, an invoice's
 * subscription is under `parent.subscription_details`, and its payment intents are in `payments`.
 * A webhook endpoint may be pinned to an older version, so handlers re-fetch what they act on with the
 * SDK and read only the ownership markers from the event itself, in either shape.
 */

type Metadata = Record<string, string> | null | undefined;

/** True for an object Ethos made: every session, subscription, customer and invoice of ours says so (R3). */
export const isEthosMetadata = (metadata: Metadata): boolean => metadata?.app === ETHOS_APP;

const seconds = (value: number | null | undefined): number | null => (typeof value === "number" && Number.isFinite(value) ? value * 1000 : null);
const idOf = (value: string | { id: string } | null | undefined): string | null => (typeof value === "string" ? value : (value?.id ?? null));

export function planOfInterval(interval: string | null | undefined): MembershipPlan | null {
  return interval === "month" ? "monthly" : interval === "year" ? "yearly" : null;
}

/** A subscription as the membership code reads it (lib/commerce/memberships.ts subscriptionState). */
export function normaliseSubscription(sub: Stripe.Subscription): SubscriptionSnapshot {
  const item = sub.items?.data?.[0];
  // Before the dahlia API the period lived on the subscription itself.
  const legacy = sub as unknown as { current_period_start?: number; current_period_end?: number };
  return {
    id: sub.id,
    status: sub.status,
    customerId: idOf(sub.customer as string | { id: string } | null),
    plan: planOfInterval(item?.price?.recurring?.interval),
    startDate: seconds(sub.start_date) ?? Date.now(),
    currentPeriodStart: seconds(item?.current_period_start ?? legacy.current_period_start),
    currentPeriodEnd: seconds(item?.current_period_end ?? legacy.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    cancelAt: seconds(sub.cancel_at),
    endedAt: seconds(sub.ended_at),
    cancellationReason: sub.cancellation_details?.reason ?? null,
    itemId: item?.id ?? null,
    productId: idOf(item?.price?.product as string | { id: string } | undefined),
    currency: item?.price?.currency ?? sub.currency ?? null,
    unitAmount: item?.price?.unit_amount ?? null,
    metadata: { ...(sub.metadata ?? {}) },
  };
}

/** The subscription an invoice belongs to, in the dahlia shape or the older one. */
export function subscriptionIdOfInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent?.subscription_details?.subscription;
  if (parent) return idOf(parent as string | { id: string });
  return idOf((invoice as unknown as { subscription?: string | { id: string } | null }).subscription ?? null);
}

/** An invoice carries our marker itself (tagged after the fact) or in the snapshot of its subscription's metadata. */
export function invoiceIsMarked(invoice: Stripe.Invoice): boolean {
  return isEthosMetadata(invoice.metadata) || isEthosMetadata(invoice.parent?.subscription_details?.metadata);
}

/** The payment intent that paid an invoice (the dahlia `payments` list, or the older field). */
export function paymentIntentOfInvoice(invoice: Stripe.Invoice): string | null {
  const payments = invoice.payments?.data ?? [];
  const payment = payments.find((p) => p.status === "paid") ?? payments.find((p) => p.is_default) ?? payments[0];
  const intent = payment?.payment?.payment_intent ?? (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent ?? null;
  return idOf(intent as string | { id: string } | null);
}

export async function retrieveSubscription(stripe: Stripe, subscriptionId: string): Promise<SubscriptionSnapshot> {
  return normaliseSubscription(await stripe.subscriptions.retrieve(subscriptionId));
}

const asCurrency = (currency: string | null): Currency => {
  const code = (currency ?? "").toLowerCase();
  if (code === "eur" || code === "usd" || code === "gbp") return code;
  throw new Error(`membership priced in an unknown currency: ${currency}`);
};

/**
 * The item's new price: the catalogue's amount for the plan, inline (R6), on the "Ethos for Two"
 * Product when one is configured, else on the item's own. A subscription made before
 * STRIPE_PRODUCT_FORTWO was set sits on the product Checkout made inline, which Stripe keeps
 * archived; the configured one is the Product a price is meant to hang off.
 */
function planPrice(sub: SubscriptionSnapshot, plan: MembershipPlan): Stripe.SubscriptionUpdateParams.Item.PriceData {
  const product = process.env[PRODUCTS.membership.envProductKey] || sub.productId;
  if (!product) throw new Error(`subscription ${sub.id} has no product`);
  const currency = asCurrency(sub.currency);
  return { currency, product, unit_amount: membershipAmount(plan, currency), tax_behavior: "inclusive", recurring: { interval: MEMBERSHIP_PLANS[plan].interval } };
}

const ENDED = new Set(["canceled", "incomplete_expired"]);

/**
 * Ends a subscription now, refunding nothing, and voids whatever it still has open (a renewal it was
 * trying to collect), so nothing can be charged afterwards. One that has already ended is left as it
 * is: this runs again on every webhook retry.
 */
export async function cancelSubscriptionNow(stripe: Stripe, subscriptionId: string, options: { voidOpenInvoices?: boolean } = {}): Promise<SubscriptionSnapshot> {
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  const ended = ENDED.has(current.status) ? current : await stripe.subscriptions.cancel(subscriptionId, { prorate: false, invoice_now: false });
  if (options.voidOpenInvoices !== false) {
    const open = await stripe.invoices.list({ subscription: subscriptionId, status: "open", limit: 10 });
    for (const invoice of open.data) await stripe.invoices.voidInvoice(invoice.id);
  }
  return normaliseSubscription(ended);
}

/** The BillingPort lib/commerce/memberships.ts works through, on a real Stripe client. */
export function stripeBilling(stripe: Stripe): BillingPort {
  return {
    retrieve: (subscriptionId) => retrieveSubscription(stripe, subscriptionId),
    async setCancelAtPeriodEnd(sub, cancel) {
      // A cancel_at of our own is never set; one set in the Dashboard is cleared the same way.
      const params: Stripe.SubscriptionUpdateParams = cancel ? { cancel_at_period_end: true } : sub.cancelAtPeriodEnd || sub.cancelAt === null ? { cancel_at_period_end: false } : { cancel_at: "" };
      return normaliseSubscription(await stripe.subscriptions.update(sub.id, params));
    },
    cancelNow: (subscriptionId, options) => cancelSubscriptionNow(stripe, subscriptionId, options),
    async previewSwitch(sub, plan) {
      if (!sub.itemId) throw new Error(`subscription ${sub.id} has no item`);
      const preview = await stripe.invoices.createPreview({
        subscription: sub.id,
        subscription_details: { items: [{ id: sub.itemId, price_data: planPrice(sub, plan) }], proration_behavior: "always_invoice", proration_date: Math.floor(Date.now() / 1000) },
      });
      const periodEnd = Math.max(0, ...preview.lines.data.map((line) => line.period?.end ?? 0));
      return { amountDue: preview.amount_due, currency: preview.currency, periodEnd: periodEnd > 0 ? periodEnd * 1000 : Date.now() + (plan === "yearly" ? 365 : 30) * 86_400_000 };
    },
    switchPlan: (sub, plan, options) => switchPlan(stripe, sub, plan, options),
  };
}

/**
 * Moves the subscription's item to the other plan's price. A change of interval restarts the billing
 * period and invoices at once (always_invoice credits the unused part of the old period), and the
 * change only happens if that invoice is paid (pending_if_incomplete): a card that fails leaves the
 * subscription exactly as it was, with the invoice voided; a bank that wants the payment confirmed
 * gets the invoice's own page to do it on, and paying it there applies the switch. When nobody is
 * there to confirm it (`confirmable: false`, the cron), that invoice is voided too: no charge is left
 * waiting for somebody who will never see it.
 */
async function switchPlan(stripe: Stripe, sub: SubscriptionSnapshot, plan: MembershipPlan, options: { confirmable?: boolean } = {}): Promise<SwitchOutcome> {
  if (!sub.itemId) throw new Error(`subscription ${sub.id} has no item`);
  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: sub.itemId, price_data: planPrice(sub, plan) }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice.payments"],
    });
  } catch (e) {
    if (e instanceof Stripe.errors.StripeCardError) return { outcome: "payment_failed" };
    throw e;
  }
  if (!updated.pending_update) return { outcome: "switched", subscription: normaliseSubscription(updated) };
  const invoice = typeof updated.latest_invoice === "object" ? updated.latest_invoice : null;
  const intentId = invoice ? paymentIntentOfInvoice(invoice) : null;
  const intent = intentId ? await stripe.paymentIntents.retrieve(intentId) : null;
  if (intent?.status === "requires_action" && invoice?.hosted_invoice_url && options.confirmable !== false) return { outcome: "requires_action", url: invoice.hosted_invoice_url };
  if (invoice?.id && invoice.status === "open") await stripe.invoices.voidInvoice(invoice.id);
  return { outcome: "payment_failed" };
}

/**
 * The Stripe customer to put a new subscription on: the owner's own, from their earlier
 * memberships, but only after checking it is still there and still says it is Ethos's and theirs.
 * Never looked up by email (R7): a customer shared with another business would let its webhook read
 * our events as its own user's. Null makes Checkout create a new one.
 */
export async function ethosCustomerFor(db: Db, stripe: Stripe, userId: string): Promise<string | null> {
  const { data } = await db.from("couple_passes").select("stripe_customer_id, created_at").eq("owner_user_id", userId).order("created_at", { ascending: false });
  const id = (data ?? []).map((row) => row.stripe_customer_id).find((value): value is string => Boolean(value));
  if (!id) return null;
  return (await isOurCustomer(stripe, id, userId)) ? id : null;
}

/** The customer exists, is Ethos's and is this user's (R7). */
export async function isOurCustomer(stripe: Stripe, customerId: string, userId: string): Promise<boolean> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return !customer.deleted && isEthosMetadata(customer.metadata) && customer.metadata.ethos_user_id === userId;
  } catch {
    return false;
  }
}

/**
 * Stamps what Checkout couldn't: the customer it made (Checkout can't set a new customer's
 * metadata), a guest's subscription (whose account didn't exist when the session was made) and the
 * first invoice (Stripe makes it). Best effort, one by one: a failure is logged and never costs the
 * purchase, since our own webhook also recognises the subscription by its id.
 */
export async function tagCheckout(
  stripe: Stripe,
  args: { customerId: string | null; customerTagged: boolean; subscription: SubscriptionSnapshot; invoiceId: string | null; userId: string; purchaseId: string },
): Promise<void> {
  const { customerId, subscription, invoiceId, userId, purchaseId } = args;
  const tag = async (what: string, run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (e) {
      console.error(`[stripe] ${what} not tagged`, (e as Error).message);
    }
  };
  if (customerId && !args.customerTagged) await tag("customer", () => stripe.customers.update(customerId, { metadata: { app: ETHOS_APP, ethos_user_id: userId } }));
  if (subscription.metadata.ethos_user_id !== userId) await tag("subscription", () => stripe.subscriptions.update(subscription.id, { metadata: { app: ETHOS_APP, ethos_user_id: userId, purchase_id: purchaseId } }));
  if (invoiceId) await tag("invoice", () => tagInvoice(stripe, invoiceId, { userId, purchaseId }));
}

export async function tagInvoice(stripe: Stripe, invoiceId: string, args: { userId: string; purchaseId: string | null }): Promise<void> {
  await stripe.invoices.update(invoiceId, { metadata: { app: ETHOS_APP, ethos_user_id: args.userId, ...(args.purchaseId ? { purchase_id: args.purchaseId } : {}) } });
}

/**
 * The Customer Portal, always on Ethos's own configuration (R5): the account's default belongs to
 * nobody in particular and is never read, changed or relied on. `update_card` and `cancel` open the
 * portal straight on that task; cancelling there is at the end of the period, as on our own page.
 */
export async function createPortalSession(
  stripe: Stripe,
  args: { customerId: string; configuration: string; locale: "en" | "es"; returnUrl: string; flow: PortalFlow; subscriptionId: string | null },
): Promise<string> {
  const flow: Stripe.BillingPortal.SessionCreateParams.FlowData | undefined =
    args.flow === "update_card"
      ? { type: "payment_method_update" }
      : args.flow === "cancel" && args.subscriptionId
        ? { type: "subscription_cancel", subscription_cancel: { subscription: args.subscriptionId }, after_completion: { type: "redirect", redirect: { return_url: args.returnUrl } } }
        : undefined;
  const session = await stripe.billingPortal.sessions.create({
    customer: args.customerId,
    configuration: args.configuration,
    locale: args.locale,
    return_url: args.returnUrl,
    ...(flow ? { flow_data: flow } : {}),
  });
  return session.url;
}

