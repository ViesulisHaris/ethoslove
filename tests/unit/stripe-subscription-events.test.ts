import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { DAY_MS, iso } from "@/lib/commerce/db";
import { MEMBERSHIP_GRACE_MS } from "@/lib/commerce/memberships";
import type { Pass } from "@/lib/commerce/passes";
import { planCheckout } from "@/lib/commerce/plan";
import { consentSentence, membershipMetadata, type SessionOptions } from "@/lib/stripe/line-items";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown }));
const mail = vi.hoisted(() => ({
  notifyReceipt: vi.fn(async () => undefined),
  notifyWelcome: vi.fn(async () => undefined),
  sendPassWelcome: vi.fn(async () => true),
  sendGiftCardEmail: vi.fn(async () => true),
  sendMembershipWelcome: vi.fn(async () => true),
  sendMembershipEnded: vi.fn(async () => true),
  sendMembershipPaymentProblem: vi.fn(async () => true),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe }));
vi.mock("@/lib/email/notify", () => mail);

const { fulfilCheckoutSession, sessionUserId } = await import("@/lib/stripe/fulfil");
const { handleStripeEvent } = await import("@/lib/stripe/events");

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const PURCHASE = "11111111-1111-4111-8111-111111111111";
const PERIOD_END = Math.floor((NOW + 30 * DAY_MS) / 1000) * 1000;

let fake: FakeDb;
let stripe: FakeStripe;
let createUser: ReturnType<typeof vi.fn>;

function useDb(seed: Record<string, Record<string, unknown>[]> = {}) {
  fake = new FakeDb({ profiles: [{ id: "u1", email: "u1@x.co", locale: "en" }], ...seed }, NOW);
  createUser = vi.fn(async ({ email }: { email: string }) => {
    fake.tables.profiles = [...fake.rows("profiles"), { id: "new-user", email, locale: "en" }];
    return { data: { user: { id: "new-user" } }, error: null };
  });
  state.db = { ...fake.db, auth: { admin: { createUser, getUserById: vi.fn(async () => ({ data: { user: { app_metadata: {} } } })) } } };
}

function metadata(plan: "monthly" | "yearly", extra: Partial<SessionOptions> = {}) {
  const planned = planCheckout({ product: "membership", plan, currency: "eur", templateSlugs: [] }, { signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: false, subscriptions: true, membership: null });
  if (!planned.ok) throw new Error(planned.error);
  return membershipMetadata(planned, { purchaseId: PURCHASE, userId: "u1", email: "u1@x.co", locale: "en", origin: "https://ethos.test", returnTo: "/account", automaticTax: false, productIds: {}, ...extra });
}

function session(meta: Record<string, string>, extra: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_sub_1",
    object: "checkout.session",
    mode: "subscription",
    payment_status: "paid",
    amount_total: 499,
    currency: "eur",
    currency_conversion: null,
    payment_intent: null,
    subscription: "sub_1",
    customer: "cus_1",
    customer_details: { email: "Buyer@Example.com" },
    customer_email: null,
    metadata: meta,
    client_reference_id: null,
    consent: { terms_of_service: "accepted", promotions: null },
    created: NOW / 1000,
    ...extra,
  } as unknown as Stripe.Checkout.Session;
}

/** The subscription Checkout made, its first invoice paid. */
function stripeSubscription(interval: "month" | "year" = "month", metadataOver: Record<string, string> = {}) {
  stripe.addInvoice({
    id: "in_1",
    billing_reason: "subscription_create",
    amount_paid: interval === "month" ? 499 : 2999,
    payments: { data: [{ status: "paid", is_default: true, payment: { type: "payment_intent", payment_intent: "pi_1" } }] },
    parent: { subscription_details: { subscription: "sub_1", metadata: { app: "ethos", purchase_id: PURCHASE } } },
  });
  stripe.addSubscription({ id: "sub_1", interval, periodEnd: PERIOD_END, latestInvoice: "in_1", metadata: { app: "ethos", purchase_id: PURCHASE, ethos_user_id: "u1", ...metadataOver } });
}

const deps = () => ({
  db: fake.db,
  stripe: stripe.client,
  now: fake.clock,
  fulfil: fulfilCheckoutSession,
  recover: vi.fn(async () => false),
  send: { ended: mail.sendMembershipEnded, paymentProblem: mail.sendMembershipPaymentProblem },
});
const event = (type: string, object: unknown) => ({ id: `evt_${Math.random()}`, type, data: { object } }) as unknown as Stripe.Event;
const membership = () => ({ ...fake.rows("couple_passes")[0] }) as Pass;
const unlocks = (userId: string) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => `${r.template_slug}@${r.purchase_id}`)
    .sort();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  stripe = new FakeStripe(() => NOW);
  state.stripe = stripe.client;
});

describe("a subscription checkout, fulfilled", () => {
  it("signed in: pays the purchase, starts the membership, fills in the first invoice and welcomes once", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "membership", kind: "membership", status: "pending", amount: 499, currency: "eur" }] });
    stripeSubscription("month");
    const result = await fulfilCheckoutSession(session(metadata("monthly")));
    const row = membership();
    expect(result).toEqual({ ok: true, userId: "u1", passInviteUrl: expect.stringMatching(new RegExp(`/for-two/join\\?code=${row.invite_code}$`)) });
    expect(row).toMatchObject({ purchase_id: PURCHASE, owner_user_id: "u1", provider: "stripe_subscription", plan: "monthly", status: "active", stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1", current_period_end: iso(PERIOD_END), ends_at: iso(PERIOD_END + MEMBERSHIP_GRACE_MS) });
    const sentence = consentSentence("membership", "en", { plan: "monthly", currency: "eur" });
    expect(fake.rows("purchases")[0]).toMatchObject({ status: "paid", amount: 499, currency: "eur", stripe_session_id: "cs_sub_1", stripe_invoice_id: "in_1", stripe_payment_intent_id: "pi_1", membership_id: row.id, terms_consent: sentence });
    expect(unlocks("u1")).toEqual([`*@${PURCHASE}`, `pack:*@${PURCHASE}`]);
    expect(mail.sendMembershipWelcome).toHaveBeenCalledWith({ to: "u1@x.co", locale: "en", plan: "monthly", amount: 499, currency: "eur", renewsOn: iso(PERIOD_END), inviteUrl: result.passInviteUrl, consent: sentence });
    // The welcome is the confirmation: no receipt saying "one-time payment".
    expect(mail.notifyReceipt).not.toHaveBeenCalled();
    // Tagged after the fact: the customer Checkout made and the first invoice.
    expect(stripe.writes().map((c) => [c.method, c.args[0]])).toEqual([
      ["customers.update", "cus_1"],
      ["invoices.update", "in_1"],
    ]);

    // The success page after the webhook (or the other way round): nothing twice.
    expect(await fulfilCheckoutSession(session(metadata("monthly")))).toMatchObject({ ok: true });
    expect(fake.rows("couple_passes")).toHaveLength(1);
    expect(mail.sendMembershipWelcome).toHaveBeenCalledTimes(1);
    expect(sessionUserId(session(metadata("monthly")))).toBe("u1");
  });

  it("as a guest: makes the account, records the sale and tags the subscription with its owner", async () => {
    useDb();
    stripeSubscription("year", { ethos_user_id: "" });
    const meta = metadata("yearly", { userId: null, email: null });
    expect(meta).toMatchObject({ guest: "1", ethos_user_id: "" });
    const result = await fulfilCheckoutSession(session(meta, { amount_total: 2999, consent: null }));
    expect(result).toMatchObject({ ok: true, userId: "new-user", email: "buyer@example.com", createdUser: true, passInviteUrl: expect.stringContaining("/for-two/join?code=") });
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(fake.rows("purchases")[0]).toMatchObject({ id: PURCHASE, user_id: "new-user", product: "membership", kind: "membership", amount: 2999, status: "paid", stripe_invoice_id: "in_1" });
    expect(membership()).toMatchObject({ owner_user_id: "new-user", plan: "yearly" });
    expect(stripe.subscriptions.sub_1.metadata).toMatchObject({ app: "ethos", ethos_user_id: "new-user", purchase_id: PURCHASE });
    // No box was ticked: the welcome says the refund would be in full.
    expect(mail.sendMembershipWelcome).toHaveBeenCalledWith(expect.objectContaining({ to: "buyer@example.com", plan: "yearly", amount: 2999, consent: null }));
    expect(mail.notifyWelcome).toHaveBeenCalledTimes(1);
  });

  it("waits for a delayed payment, refuses a session that isn't ours, and asks for a retry when Stripe can't be reached", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "membership", status: "pending", amount: 499, currency: "eur" }] });
    stripeSubscription("month");
    expect(await fulfilCheckoutSession(session(metadata("monthly"), { payment_status: "unpaid" }))).toEqual({ ok: false, reason: "unpaid" });
    const { app: _app, ...unmarked } = metadata("monthly");
    void _app;
    expect(await fulfilCheckoutSession(session(unmarked))).toEqual({ ok: false, reason: "not_ours" });
    stripe.subscriptions.sub_1.metadata = { app: "ethos", purchase_id: "another-purchase" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fulfilCheckoutSession(session(metadata("monthly")))).toEqual({ ok: false, reason: "bad_metadata" });
    stripe.failing.add("subscriptions.retrieve");
    expect(await handleStripeEvent(event("checkout.session.completed", session(metadata("monthly"))), deps())).toMatchObject({ status: 500 });
    expect(fake.rows("purchases")[0].status).toBe("pending");
    expect(fake.rows("couple_passes")).toEqual([]);
  });
});

describe("the subscription's invoices and events", () => {
  beforeEach(async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "membership", kind: "membership", status: "pending", amount: 499, currency: "eur", created_at: iso(NOW - 30 * DAY_MS) }] });
    stripeSubscription("month");
    await fulfilCheckoutSession(session(metadata("monthly")));
    vi.clearAllMocks();
    stripe.calls = [];
  });

  const renewal = (id: string, amount: number, extra: Record<string, unknown> = {}) =>
    stripe.addInvoice({
      id,
      billing_reason: "subscription_cycle",
      amount_paid: amount,
      amount_due: amount,
      payments: { data: [{ status: "paid", is_default: true, payment: { type: "payment_intent", payment_intent: `pi_${id}` } }] },
      parent: { subscription_details: { subscription: "sub_1", metadata: { app: "ethos" } } },
      ...extra,
    });

  it("records each paid renewal once, moves the end, and skips an invoice for nothing", async () => {
    const next = PERIOD_END + 30 * DAY_MS;
    (stripe.subscriptions.sub_1.items as { data: Record<string, unknown>[] }).data[0].current_period_end = next / 1000;
    const invoice = renewal("in_2", 499);
    for (let i = 0; i < 2; i++) expect(await handleStripeEvent(event("invoice.paid", invoice), deps())).toMatchObject({ status: 200, handled: "ours" });
    const rows = fake.rows("purchases").filter((p) => p.stripe_invoice_id === "in_2");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ user_id: "u1", product: "membership", kind: "membership", amount: 499, currency: "eur", status: "paid", stripe_payment_intent_id: "pi_in_2", membership_id: membership().id, creator_code: null });
    expect(membership()).toMatchObject({ current_period_end: iso(next), ends_at: iso(next + MEMBERSHIP_GRACE_MS) });
    expect(stripe.invoices.in_2.metadata).toMatchObject({ app: "ethos", ethos_user_id: "u1", purchase_id: rows[0].id });

    await handleStripeEvent(event("invoice.paid", renewal("in_zero", 0)), deps());
    expect(fake.rows("purchases").filter((p) => p.stripe_invoice_id === "in_zero")).toEqual([]);
    // The first invoice only fills in the checkout's own purchase, and never twice.
    await handleStripeEvent(event("invoice.paid", stripe.invoices.in_1), deps());
    expect(fake.rows("purchases").filter((p) => p.stripe_invoice_id === "in_1").map((p) => p.id)).toEqual([PURCHASE]);
  });

  it("keeps the checkout's own payment on its purchase when the success page is opened again after a renewal", async () => {
    await handleStripeEvent(event("invoice.paid", renewal("in_2", 499)), deps());
    stripe.subscriptions.sub_1.latest_invoice = "in_2";
    expect(await fulfilCheckoutSession(session(metadata("monthly")))).toMatchObject({ ok: true });
    expect(fake.rows("purchases").find((p) => p.id === PURCHASE)).toMatchObject({ stripe_invoice_id: "in_1", stripe_payment_intent_id: "pi_1" });
    expect(fake.rows("purchases").filter((p) => p.stripe_invoice_id === "in_2")).toHaveLength(1);
    expect(stripe.writes().filter((c) => c.method === "invoices.update" && c.args[0] === "in_2")).toHaveLength(1);
    expect(mail.sendMembershipWelcome).not.toHaveBeenCalled();
  });

  it("tells the owner once per invoice when a renewal isn't paid, while the grace keeps it running", async () => {
    // Stripe moves the period on when it invoices the renewal, paid or not: what was paid for ends
    // where the unpaid month starts, and the week of grace runs from there.
    const item = (stripe.subscriptions.sub_1.items as { data: Record<string, unknown>[] }).data[0];
    item.current_period_start = PERIOD_END / 1000;
    item.current_period_end = (PERIOD_END + 30 * DAY_MS) / 1000;
    stripe.subscriptions.sub_1.status = "past_due";
    fake.clock = PERIOD_END + 60 * 60 * 1000;
    const failed = renewal("in_3", 0, { amount_due: 499, status: "open", hosted_invoice_url: "https://invoice.stripe.test/in_3" });
    await handleStripeEvent(event("invoice.payment_failed", failed), deps());
    await handleStripeEvent(event("invoice.payment_failed", failed), deps());
    await handleStripeEvent(event("invoice.payment_action_required", failed), deps());
    expect(membership()).toMatchObject({ status: "past_due", payment_failed_invoice: "in_3", current_period_end: iso(PERIOD_END), ends_at: iso(PERIOD_END + MEMBERSHIP_GRACE_MS) });
    expect(unlocks("u1")).toEqual([`*@${PURCHASE}`, `pack:*@${PURCHASE}`]);
    expect(mail.sendMembershipPaymentProblem).toHaveBeenCalledTimes(1);
    expect(mail.sendMembershipPaymentProblem).toHaveBeenCalledWith(expect.objectContaining({ id: membership().id }), { kind: "failed", amount: 499, currency: "eur", url: null });

    const confirm = renewal("in_4", 0, { amount_due: 499, status: "open", hosted_invoice_url: "https://invoice.stripe.test/in_4" });
    await handleStripeEvent(event("invoice.payment_action_required", confirm), deps());
    expect(mail.sendMembershipPaymentProblem).toHaveBeenLastCalledWith(expect.anything(), { kind: "action_required", amount: 499, currency: "eur", url: "https://invoice.stripe.test/in_4" });

    // A first payment that fails is Checkout's to show; a switch's is shown where it was asked for.
    for (const reason of ["subscription_create", "subscription_update"])
      await handleStripeEvent(event("invoice.payment_failed", renewal(`in_${reason}`, 0, { billing_reason: reason, amount_due: 499 })), deps());
    expect(mail.sendMembershipPaymentProblem).toHaveBeenCalledTimes(2);
  });

  it("says it has ended when it runs out, and never after the owner ended it early", async () => {
    stripe.subscriptions.sub_1.status = "canceled";
    stripe.subscriptions.sub_1.ended_at = PERIOD_END / 1000;
    fake.clock = PERIOD_END + DAY_MS;
    await handleStripeEvent(event("customer.subscription.deleted", { id: "sub_1", object: "subscription", metadata: { app: "ethos" } }), deps());
    expect(membership()).toMatchObject({ status: "ended", ends_at: iso(PERIOD_END) });
    expect(unlocks("u1")).toEqual([]);
    expect(mail.sendMembershipEnded).toHaveBeenCalledTimes(1);
  });

  it("switches a yearly renewal straight to monthly when the owner asked for it and the cron missed it", async () => {
    fake.tables.couple_passes[0].plan = "yearly";
    fake.tables.couple_passes[0].pending_plan = "monthly";
    const item = (stripe.subscriptions.sub_1.items as { data: Record<string, unknown>[] }).data[0];
    item.price = { ...(item.price as Record<string, unknown>), recurring: { interval: "year" }, unit_amount: 2999 };
    await handleStripeEvent(event("invoice.paid", renewal("in_year", 2999)), deps());
    const update = stripe.calls.find((c) => c.method === "subscriptions.update")!.args[1];
    expect(update).toMatchObject({ proration_behavior: "always_invoice", items: [{ price_data: { unit_amount: 499, recurring: { interval: "month" } } }] });
    expect(membership()).toMatchObject({ plan: "monthly", pending_plan: null });
  });

  it("ends it for both on a refund of the latest payment or a dispute, cancelling at Stripe; a withdrawal keeps the payment", async () => {
    await handleStripeEvent(event("invoice.paid", renewal("in_2", 499)), deps());
    // Refunding an older period (the first month) changes nothing else.
    await handleStripeEvent(event("charge.refunded", { id: "ch_1", object: "charge", refunded: true, payment_intent: "pi_1" }), deps());
    expect(membership().status).toBe("active");
    expect(stripe.calls.map((c) => c.method)).not.toContain("subscriptions.cancel");
    // A partial refund that isn't a withdrawal is a goodwill gesture.
    stripe.refunds.ch_2 = [{ id: "re_1", reason: null }];
    await handleStripeEvent(event("charge.refunded", { id: "ch_2", object: "charge", refunded: false, payment_intent: "pi_in_2" }), deps());
    expect(membership().status).toBe("active");
    // A withdrawal: what's left after the days used, requested by the customer.
    stripe.refunds.ch_2 = [{ id: "re_2", reason: "requested_by_customer" }];
    await handleStripeEvent(event("charge.refunded", { id: "ch_2", object: "charge", refunded: false, payment_intent: "pi_in_2" }), deps());
    expect(membership()).toMatchObject({ status: "ended", ends_at: iso(NOW) });
    expect(stripe.subscriptions.sub_1.status).toBe("canceled");
    expect(fake.rows("purchases").find((p) => p.stripe_invoice_id === "in_2")!.status).toBe("paid");
    // Stripe's own "deleted" that follows says nothing to somebody who asked for their money back.
    await handleStripeEvent(event("customer.subscription.deleted", { id: "sub_1", object: "subscription", metadata: { app: "ethos" } }), deps());
    expect(mail.sendMembershipEnded).not.toHaveBeenCalled();
  });

  it("a dispute on the latest payment ends it and cancels it, and is retried until Stripe is reached", async () => {
    fake.tables.gifts = [{ id: "g1", user_id: "u1", template_slug: "vinyl", data: {}, status: "live", watermark: false, password_hash: null, unlock_at: null }];
    stripe.failing.add("subscriptions.cancel");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await handleStripeEvent(event("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: "pi_1" }), deps())).toMatchObject({ status: 500 });
    expect(membership().status).toBe("ended");
    expect(await handleStripeEvent(event("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: "pi_1" }), deps())).toMatchObject({ status: 200 });
    expect(stripe.subscriptions.sub_1.status).toBe("canceled");
    expect(fake.rows("purchases")[0].status).toBe("refunded");
    expect(fake.rows("gifts")[0].status).toBe("draft");
  });
});
