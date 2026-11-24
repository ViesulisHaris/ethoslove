import type Stripe from "stripe";
import { missingMembershipColumns, type Db } from "@/lib/commerce/db";
import { applySubscriptionState, rowBySubscription, switchToMonthlyNow, type SendEnded } from "@/lib/commerce/memberships";
import type { Pass } from "@/lib/commerce/passes";
import { restorePurchase, revokePurchase, withdrawPurchase } from "@/lib/commerce/revoke";
import { revokeOneUnusedOf, revokeUnusedUpTo } from "@/lib/commerce/gift-credits";
import { PAIR_GIFTS, PRODUCTS } from "@/lib/pricing/products";
import type { Fulfilment } from "./fulfil";
import {
  cancelSubscriptionNow,
  invoiceIsMarked,
  isEthosMetadata,
  normaliseSubscription,
  paymentIntentOfInvoice,
  stripeBilling,
  subscriptionIdOfInvoice,
  tagInvoice,
} from "./subscriptions";

/**
 * Everything the Stripe webhook does once the signature checks out (app/api/stripe/webhook). The
 * account is shared with other businesses and every one of their events arrives here too, so each
 * handler first decides whether the object is Ethos's (docs/MEMBERSHIP.md 2.1, R4): a session with
 * our purchase and product, a subscription or invoice carrying `app: "ethos"` (on itself, or in the
 * invoice's snapshot of its subscription) or a subscription id already in couple_passes. Anything
 * else is answered 200 without another read or a single write. Customer events aren't handled at all.
 *
 * A subscription or an invoice is re-fetched before anything but the ownership check is read: the
 * endpoint may speak an older API version than the SDK, and the state as it is now makes the order
 * events arrive in irrelevant. A failure that a retry might fix answers 500 (Stripe retries for
 * days); only our own events ever do.
 */

export type StripeEventDeps = {
  db: Db;
  stripe: Stripe;
  now: number;
  fulfil: (session: Stripe.Checkout.Session) => Promise<Fulfilment>;
  recover: (session: Stripe.Checkout.Session) => Promise<unknown>;
  /**
   * Told about each checkout fulfilment has just granted (and again for a repeat delivery: whatever it
   * starts must be safe to repeat). The ad platforms' report hangs off it (lib/ads/report.ts). It can't change
   * the answer Stripe gets: a throw is logged and the event still answers as fulfilment did.
   */
  paid?: (session: Stripe.Checkout.Session) => void;
  send: {
    ended: SendEnded;
    /** "Your payment didn't go through": `kind` says whether to update the card or confirm with the bank at `url`. */
    paymentProblem: (row: Pass, args: { kind: "failed" | "action_required"; amount: number; currency: string; url: string | null }) => Promise<boolean>;
  };
};

export type EventOutcome = { status: 200 | 500; handled: "ours" | "foreign" | "ignored"; error?: string };

const ok = (handled: EventOutcome["handled"] = "ours"): EventOutcome => ({ status: 200, handled });
const retry = (error: string): EventOutcome => ({ status: 500, handled: "ours", error });

/** Fulfilment outcomes a retry can't change. */
const FINAL_FAILURES = new Set(["bad_metadata", "refunded", "purchase_mismatch", "no_email", "account_deleted"]);

export async function handleStripeEvent(event: Stripe.Event, deps: StripeEventDeps): Promise<EventOutcome> {
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return await onCheckout(event.data.object, deps);
      case "checkout.session.expired":
        // Abandoned checkout: a recovery email, only to a buyer who opted in to hearing from us.
        await deps.recover(event.data.object).catch((e) => console.error("[stripe] recovery failed", event.id, (e as Error).message));
        return ok();
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return await onSubscription(event.data.object, deps);
      case "invoice.paid":
        return await onInvoicePaid(event.data.object, deps);
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        return await onInvoiceUnpaid(event.data.object, event.type === "invoice.payment_action_required" ? "action_required" : "failed", deps);
      case "charge.refunded":
        return await onRefund(event.data.object, deps);
      case "charge.dispute.created":
        return await onDispute(event.data.object, deps);
      case "charge.dispute.closed":
        return await onDisputeClosed(event.data.object, deps);
      default:
        return ok("ignored");
    }
  } catch (e) {
    // Only reached from our own objects: a foreign one is answered before anything that can throw.
    console.error("[stripe] webhook handler failed", event.id, event.type, (e as Error).message);
    return retry((e as Error).message);
  }
}

async function onCheckout(session: Stripe.Checkout.Session, deps: StripeEventDeps): Promise<EventOutcome> {
  const result = await deps.fulfil(session);
  if (result.ok) {
    try {
      deps.paid?.(session);
    } catch (e) {
      console.error("[stripe] after-payment hook failed", session.id, (e as Error).message);
    }
  }
  if (result.ok || result.reason === "unpaid") return ok();
  // Another business's session on the shared account: not ours to fulfil.
  if (result.reason === "not_ours" || (result.reason === "bad_metadata" && !session.metadata?.purchase_id)) return ok("foreign");
  console.error("[stripe] fulfilment failed", session.id, result.reason);
  // Every grant is safe to repeat, so anything that might pass on a second try asks for one.
  return FINAL_FAILURES.has(result.reason ?? "") ? ok() : retry(result.reason ?? "fulfilment_failed");
}

const idOf = (value: string | { id: string } | null | undefined): string | null => (typeof value === "string" ? value : (value?.id ?? null));

/**
 * The membership row of a subscription the event is about. When the object carries our marker the
 * event is ours, so a read that fails throws (500: Stripe sends it again) instead of reading as "no
 * row yet" and answering 200 for good. Without the marker the row is only the fallback for one of
 * ours whose metadata was removed; a failed read then answers as foreign (foreign events are always
 * 200, docs/MEMBERSHIP.md 2.6) and says so in the log, since every subscription Ethos makes is marked
 * from Checkout on.
 */
async function rowOf(deps: StripeEventDeps, subscriptionId: string, marked: boolean): Promise<Pass | null> {
  try {
    return await rowBySubscription(deps.db, subscriptionId);
  } catch (e) {
    if (marked) throw e;
    console.warn("[stripe] membership lookup failed for an unmarked subscription, answered as not ours", subscriptionId, (e as Error).message);
    return null;
  }
}

async function onSubscription(sub: Stripe.Subscription, deps: StripeEventDeps): Promise<EventOutcome> {
  const known = await rowOf(deps, sub.id, isEthosMetadata(sub.metadata));
  if (!known && !isEthosMetadata(sub.metadata)) return ok("foreign");
  // Ours but no row yet: fulfilment makes it (from the subscription as it is then).
  if (!known) return ok();
  const fresh = normaliseSubscription(await deps.stripe.subscriptions.retrieve(sub.id));
  const applied = await applySubscriptionState(deps.db, known, fresh, deps.now, { sendEnded: deps.send.ended });
  return "error" in applied ? retry(applied.error) : ok();
}

/** Whether an invoice is ours, and its membership row when there is one yet. */
async function ownInvoice(invoice: Stripe.Invoice, deps: StripeEventDeps): Promise<{ ours: boolean; row: Pass | null; subscriptionId: string | null }> {
  const subscriptionId = subscriptionIdOfInvoice(invoice);
  const marked = invoiceIsMarked(invoice);
  const row = subscriptionId ? await rowOf(deps, subscriptionId, marked) : null;
  return { ours: Boolean(row) || marked, row, subscriptionId };
}

/**
 * A paid invoice of a membership: the payment is recorded as a purchase (one row per invoice; the
 * first is the checkout's own purchase, which only gets the invoice and payment filled in), the
 * invoice is tagged, and the subscription's new state is applied: a renewal moves the end, a late
 * payment brings a membership back. A yearly renewal while a switch to monthly waits (the cron missed
 * its window) switches straight away: the unused year becomes the customer's credit.
 */
async function onInvoicePaid(event: Stripe.Invoice, deps: StripeEventDeps): Promise<EventOutcome> {
  const { ours, row, subscriptionId } = await ownInvoice(event, deps);
  if (!ours) return ok("foreign");
  if (!row || !subscriptionId) return ok();
  const invoice = await deps.stripe.invoices.retrieve(event.id, { expand: ["payments"] });
  const paymentIntent = paymentIntentOfInvoice(invoice);
  // The purchase the invoice is tagged with: the checkout's for the first, a renewal's own, none for €0.
  let purchaseId: string | null = invoice.billing_reason === "subscription_create" ? row.purchase_id : null;
  if (invoice.amount_paid > 0) {
    if (invoice.billing_reason === "subscription_create") {
      const { error } = await deps.db
        .from("purchases")
        .update({ stripe_invoice_id: invoice.id, ...(paymentIntent ? { stripe_payment_intent_id: paymentIntent } : {}) })
        .eq("id", row.purchase_id)
        .is("stripe_invoice_id", null);
      if (error) return retry(error.message);
    } else {
      const paidAt = invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : deps.now;
      const { error } = await deps.db.from("purchases").upsert(
        {
          user_id: row.owner_user_id,
          product: "membership",
          kind: "membership",
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "paid",
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: paymentIntent,
          membership_id: row.id,
          created_at: new Date(paidAt).toISOString(),
        },
        { onConflict: "stripe_invoice_id", ignoreDuplicates: true },
      );
      if (error) return retry(error.message);
      const { data: recorded } = await deps.db.from("purchases").select("id").eq("stripe_invoice_id", invoice.id).maybeSingle();
      purchaseId = recorded?.id ?? null;
    }
  }
  if (!isEthosMetadata(invoice.metadata)) {
    try {
      await tagInvoice(deps.stripe, invoice.id, { userId: row.owner_user_id, purchaseId });
    } catch (e) {
      console.error("[stripe] invoice not tagged", invoice.id, (e as Error).message);
    }
  }
  const fresh = normaliseSubscription(await deps.stripe.subscriptions.retrieve(subscriptionId));
  const applied = await applySubscriptionState(deps.db, row, fresh, deps.now, { sendEnded: deps.send.ended });
  if ("error" in applied) return retry(applied.error);
  if (invoice.billing_reason === "subscription_cycle" && applied.row.pending_plan === "monthly" && fresh.plan === "yearly")
    await switchToMonthlyNow(deps.db, applied.row, deps.now, stripeBilling(deps.stripe), { sendEnded: deps.send.ended });
  return ok();
}

/**
 * A renewal Stripe couldn't collect (or that the bank wants confirmed): the state is applied (past
 * due, still running through the grace), and the owner is told once per invoice.
 */
async function onInvoiceUnpaid(event: Stripe.Invoice, kind: "failed" | "action_required", deps: StripeEventDeps): Promise<EventOutcome> {
  const { ours, row, subscriptionId } = await ownInvoice(event, deps);
  if (!ours) return ok("foreign");
  if (!row || !subscriptionId) return ok();
  const fresh = normaliseSubscription(await deps.stripe.subscriptions.retrieve(subscriptionId));
  const applied = await applySubscriptionState(deps.db, row, fresh, deps.now, { sendEnded: deps.send.ended });
  if ("error" in applied) return retry(applied.error);
  // Only a renewal: a failed first payment is Checkout's to show, and a failed switch is answered on
  // the page that asked for it (and its invoice voided).
  if (event.billing_reason !== "subscription_cycle" || applied.row.payment_failed_invoice === event.id) return ok();
  const invoice = await deps.stripe.invoices.retrieve(event.id);
  // Only while there is still something to do: the event can arrive late or again (Stripe's retry
  // after a 500 or a timeout), and a renewal paid since (the card fixed, a retry that went through),
  // voided or written off, or a membership no longer past due (paid, or ended, which has its own
  // email) must not be told its payment didn't go through. The invoice as it is now decides.
  if (invoice.status !== "open" || applied.row.status !== "past_due") return ok();
  // Claimed before sending, so two deliveries of the event (or both events for one invoice) email once.
  const previous = applied.row.payment_failed_invoice;
  const claim = deps.db.from("couple_passes").update({ payment_failed_invoice: invoice.id }).eq("id", row.id);
  const { data: claimed } = await (previous ? claim.eq("payment_failed_invoice", previous) : claim.is("payment_failed_invoice", null)).select("id");
  if ((claimed ?? []).length === 0) return ok();
  const sent = await deps.send.paymentProblem(applied.row, { kind, amount: invoice.amount_due, currency: invoice.currency, url: kind === "action_required" ? (invoice.hosted_invoice_url ?? null) : null });
  if (!sent) await deps.db.from("couple_passes").update({ payment_failed_invoice: previous }).eq("id", row.id);
  return ok();
}

type Purchase = { id: string; user_id: string | null; product: string; membership_id: string | null; kind?: string | null; currency?: string | null; amount?: number | null };

/**
 * The purchase a charge paid for, or null when it isn't ours. A lookup that fails throws (Stripe
 * retries the 500) rather than reading as "not ours": a 200 would lose the refund for good. Before
 * migration 0014 there is no membership_id, and that says so by name (lib/commerce/db.ts).
 */
async function purchaseByPaymentIntent(db: Db, paymentIntent: string | null): Promise<Purchase | null> {
  if (!paymentIntent) return null;
  const { data, error } = await db.from("purchases").select("id, user_id, product, membership_id, kind, currency, amount").eq("stripe_payment_intent_id", paymentIntent).maybeSingle();
  const missing = missingMembershipColumns(error, "a refund or a dispute reads purchases.membership_id");
  if (missing) throw missing;
  if (error) throw new Error(`purchase lookup failed: ${error.message}`);
  return data ?? null;
}

const cancelWith = (deps: StripeEventDeps) => async (subscriptionId: string) => void (await cancelSubscriptionNow(deps.stripe, subscriptionId));

/**
 * A full refund takes back what the purchase granted (lib/commerce/revoke.ts). A partial one
 * "requested by customer" of an Ethos for Two payment is a withdrawal within the 14 days: the owner
 * refunds what's left after the days used, and the membership ends for both. Half or more of two
 * more gifts refunded is one unused gift given back (the 30-day promise, terms): one gift ready goes.
 * On a gift paid with two more (kind "with_pair"), the money back is measured against the two's own
 * line: half of it takes one unused gift, all of it both, and the template unlock stays.
 * Any other partial refund is a goodwill gesture and changes nothing.
 */
async function onRefund(charge: Stripe.Charge, deps: StripeEventDeps): Promise<EventOutcome> {
  const purchase = await purchaseByPaymentIntent(deps.db, idOf(charge.payment_intent as string | { id: string } | null));
  if (!purchase) return ok("foreign");
  if (charge.refunded) {
    await revokePurchase(deps.db, purchase, deps.now, { mode: "refund", cancelSubscription: cancelWith(deps) });
    return ok();
  }
  if (purchase.product === "pair") {
    if (charge.amount_refunded * 2 >= charge.amount) await revokeOneUnusedOf(deps.db, purchase.id, deps.now);
    // The purchase stays paid, so it keeps counting towards the upgrade (lib/commerce/pricing.ts):
    // only for what was kept. amount_refunded is the charge's running total, so the same event again
    // writes the same number.
    const kept = await pairKept(charge, purchase, deps);
    if (kept === null) return retry("pair refund: the checkout session it was paid with was not found");
    const { error } = await deps.db.from("purchases").update({ amount: kept }).eq("id", purchase.id);
    if (error) throw new Error(`pair amount not lowered after a refund: ${error.message}`);
    return ok();
  }
  if (purchase.kind === "with_pair") {
    const back = withPairBack(charge, purchase);
    if (back) {
      // Each gift is half the pair's line: €4 back of €7.99 is one, all of it both.
      const gifts = Math.min(PAIR_GIFTS, Math.floor((back.refunded * PAIR_GIFTS) / back.line));
      if (gifts > 0) await revokeUnusedUpTo(deps.db, purchase.id, gifts, deps.now);
    }
    return ok();
  }
  if (purchase.product !== "pass" && purchase.product !== "membership") return ok();
  const refunds = await deps.stripe.refunds.list({ charge: charge.id, limit: 1 });
  if (refunds.data[0]?.reason === "requested_by_customer") await withdrawPurchase(deps.db, purchase, deps.now, { cancelSubscription: cancelWith(deps) });
  return ok();
}

/**
 * What is left of a pair's payment after a partial refund, in the currency purchases.amount is kept in
 * (the catalogue's, fulfil.ts chargedAmount). The charge speaks the buyer's currency: when Adaptive
 * Pricing converted the price (a 5 euro pair charged as 2,170 grosz), the share kept is applied to what
 * the checkout session says the catalogue charged, never to the row's own amount (the same event again
 * would shrink it again). Null when that session can't be found, so Stripe retries.
 */
async function pairKept(charge: Stripe.Charge, purchase: Purchase, deps: StripeEventDeps): Promise<number | null> {
  const left = Math.max(0, charge.amount - charge.amount_refunded);
  const rowCurrency = purchase.currency?.toLowerCase();
  if (!charge.currency || !rowCurrency || charge.currency.toLowerCase() === rowCurrency) return left;
  const paymentIntent = idOf(charge.payment_intent as string | { id: string } | null);
  if (!paymentIntent || charge.amount <= 0) return null;
  const sessions = await deps.stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
  const session = sessions.data[0];
  if (!session) return null;
  // fulfil.ts chargedAmount, which this module may not import (it is server-only, these handlers are tested bare).
  const paid = session.currency_conversion?.source_currency ? session.currency_conversion.amount_total : session.amount_total;
  if (paid == null) return null;
  return Math.round((paid * left) / charge.amount);
}

/**
 * How much of a gift paid with two more came back, against the pair's own line, both in the catalogue's
 * currency. When Adaptive Pricing charged another currency (a €17.98 payment as złoty), the share of the
 * charge refunded is applied to what the row says the catalogue charged (fulfil.ts chargedAmount), as
 * pairKept does for two more gifts bought alone. Null when neither currency has a pair price.
 */
function withPairBack(charge: Stripe.Charge, purchase: Purchase): { refunded: number; line: number } | null {
  const chargeCurrency = charge.currency?.toLowerCase();
  const rowCurrency = purchase.currency?.toLowerCase();
  const prices = PRODUCTS.pair.amounts as Partial<Record<string, number>>;
  const rowLine = rowCurrency ? prices[rowCurrency] : undefined;
  if (rowLine && chargeCurrency && rowCurrency !== chargeCurrency && typeof purchase.amount === "number" && charge.amount > 0) {
    return { refunded: Math.round((purchase.amount * charge.amount_refunded) / charge.amount), line: rowLine };
  }
  const line = chargeCurrency ? prices[chargeCurrency] : undefined;
  return line ? { refunded: charge.amount_refunded, line } : null;
}

/** A chargeback takes the money back, so it takes the unlock back too, and ends a membership for both. */
async function onDispute(dispute: Stripe.Dispute, deps: StripeEventDeps): Promise<EventOutcome> {
  const purchase = await purchaseByPaymentIntent(deps.db, idOf(dispute.payment_intent as string | { id: string } | null));
  if (!purchase) return ok("foreign");
  await revokePurchase(deps.db, purchase, deps.now, { mode: "dispute", cancelSubscription: cancelWith(deps) });
  return ok();
}

/**
 * A chargeback decided in our favour ("won"): the money came back, so what the dispute took comes
 * back too (lib/commerce/revoke.ts restorePurchase). Only when nothing of the charge was refunded
 * meanwhile: a refund is the owner's decision and stands. Any other ending changes nothing.
 */
async function onDisputeClosed(dispute: Stripe.Dispute, deps: StripeEventDeps): Promise<EventOutcome> {
  if (dispute.status !== "won") return ok("ignored");
  const paymentIntent = idOf(dispute.payment_intent as string | { id: string } | null);
  if (!paymentIntent) return ok("foreign");
  const { data: purchase, error } = await deps.db
    .from("purchases")
    .select("id, user_id, product, status, template_slugs, kind")
    .eq("stripe_payment_intent_id", paymentIntent)
    .maybeSingle();
  if (error) return retry(`purchase lookup failed: ${error.message}`);
  if (!purchase) return ok("foreign");
  const chargeId = idOf(dispute.charge as string | { id: string } | null);
  if (chargeId) {
    const charge = await deps.stripe.charges.retrieve(chargeId);
    if (charge.amount_refunded > 0) return ok();
  }
  const done = await restorePurchase(deps.db, purchase, deps.now);
  if (done.restored) console.info("[stripe] dispute won: restored", purchase.id, `${done.gifts} gift(s) live again`);
  return ok();
}
