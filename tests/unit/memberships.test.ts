import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { DAY_MS, iso, type Db } from "@/lib/commerce/db";
import {
  MEMBERSHIP_GRACE_MS,
  applyPendingSwitches,
  applySubscriptionState,
  membershipContextOf,
  readMembership,
  reconcileSubscriptions,
  remindYearlyRenewals,
  runMembershipAction,
  startSubscriptionMembership,
  subscriptionState,
  type SubscriptionSnapshot,
} from "@/lib/commerce/memberships";
import { readEntitlements } from "@/lib/commerce/entitlements";
import { joinPass, remindRenewals, type Pass } from "@/lib/commerce/passes";
import { revokePurchase, withdrawPurchase } from "@/lib/commerce/revoke";
import { normaliseSubscription, stripeBilling } from "@/lib/stripe/subscriptions";
import { FREE_SAVED_DATES, MEMBERSHIP_PLANS, isMembershipPlan, membershipAmount, subscriptionsEnabled, unlocksFor, yearlyPerMonth, yearlySavingPct } from "@/lib/pricing/products";
import { NextRequest } from "next/server";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

const routes = vi.hoisted(() => ({ user: null as { id: string } | null, db: null as unknown, stripe: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => routes.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => routes.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => routes.stripe }));
const notify = vi.hoisted(() => ({
  sendMembershipEnded: vi.fn(async () => true),
  sendMembershipRenewalReminder: vi.fn(async () => true),
  sendPassRenewalReminder: vi.fn(async () => true),
}));
vi.mock("@/lib/email/notify", () => notify);
vi.mock("@/lib/gift/storage-cleanup", () => ({ deleteGiftStorage: async () => ({ errors: [] }) }));

const membershipRoute = await import("@/app/api/membership/route");
const joinRoute = await import("@/app/api/for-two/join/route");
const { deleteAccountData } = await import("@/lib/auth/delete-account");

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

let fake: FakeDb;
let stripe: FakeStripe;
beforeEach(() => {
  vi.restoreAllMocks();
  fake = new FakeDb({ profiles: [{ id: OWNER, email: "alex@x.co", name: "Alex", locale: "en" }, { id: PARTNER, email: "sam@x.co", name: "Sam", locale: "es" }, { id: OTHER, email: "kim@x.co", name: null, locale: "en" }] }, NOW);
  stripe = new FakeStripe(() => fake.clock);
});

const snapshot = (over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot => ({
  id: "sub_1",
  status: "active",
  customerId: "cus_1",
  plan: "monthly",
  startDate: NOW - 10 * DAY_MS,
  currentPeriodStart: NOW - 10 * DAY_MS,
  currentPeriodEnd: NOW + 20 * DAY_MS,
  cancelAtPeriodEnd: false,
  cancelAt: null,
  endedAt: null,
  cancellationReason: null,
  itemId: "si_1",
  productId: "prod_fortwo",
  currency: "eur",
  unitAmount: 499,
  metadata: { app: "ethos" },
  ...over,
});

/** A Stripe membership row, running, as fulfilment leaves it. */
function seedSubscription(over: Partial<Pass> = {}): Pass {
  const row = {
    id: "m1",
    purchase_id: "p1",
    owner_user_id: OWNER,
    partner_user_id: null,
    invite_code: "abcdefghij",
    provider: "stripe_subscription",
    plan: "monthly",
    status: "active",
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    starts_at: iso(NOW - 10 * DAY_MS),
    current_period_end: iso(NOW + 20 * DAY_MS),
    ends_at: iso(NOW + 20 * DAY_MS + MEMBERSHIP_GRACE_MS),
    cancel_at_period_end: false,
    created_at: iso(NOW - 10 * DAY_MS),
    ...over,
  };
  fake.tables.couple_passes = [...fake.rows("couple_passes"), { ...new FakeDb({ couple_passes: [row] }).rows("couple_passes")[0] }];
  fake.tables.purchases = [...fake.rows("purchases"), { id: row.purchase_id, user_id: row.owner_user_id, product: "membership", status: "paid", amount: 499, currency: "eur", created_at: row.created_at }];
  return fake.rows("couple_passes").find((r) => r.id === row.id) as Pass;
}

const unlocks = (userId: string) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => `${r.template_slug}@${r.purchase_id}`)
    .sort();
// A copy, as a read from the database is.
const row = (id = "m1") => ({ ...fake.rows("couple_passes").find((r) => r.id === id) }) as Pass;

describe("Ethos for Two in the catalogue (docs/MEMBERSHIP.md 2.2)", () => {
  it("costs €4.99 a month or €29.99 a year for the two of them, with the owner's other currencies kept", () => {
    expect(MEMBERSHIP_PLANS).toEqual({
      monthly: { interval: "month", amounts: { eur: 499, usd: 599, gbp: 449 } },
      yearly: { interval: "year", amounts: { eur: 2999, usd: 3499, gbp: 2599 } },
    });
    expect(membershipAmount("monthly", "gbp")).toBe(449);
    // "€2.50 a month · save 50%", worked out rather than typed.
    expect([yearlyPerMonth("eur"), yearlyPerMonth("usd"), yearlyPerMonth("gbp")]).toEqual([250, 292, 217]);
    expect([yearlySavingPct("eur"), yearlySavingPct("usd"), yearlySavingPct("gbp")]).toEqual([50, 51, 52]);
    expect(FREE_SAVED_DATES).toBe(3);
    expect(unlocksFor("membership", [])).toEqual(["*", "pack:*"]);
    expect([isMembershipPlan("monthly"), isMembershipPlan("yearly"), isMembershipPlan("weekly"), isMembershipPlan(undefined)]).toEqual([true, true, false, false]);
  });

  it("is sold as a subscription only when STRIPE_SUBSCRIPTIONS_ENABLED is exactly \"true\"", () => {
    expect(subscriptionsEnabled({})).toBe(false);
    expect(subscriptionsEnabled({ STRIPE_SUBSCRIPTIONS_ENABLED: "1" })).toBe(false);
    expect(subscriptionsEnabled({ STRIPE_SUBSCRIPTIONS_ENABLED: "TRUE" })).toBe(false);
    expect(subscriptionsEnabled({ STRIPE_SUBSCRIPTIONS_ENABLED: "true" })).toBe(true);
  });
});

describe("a Stripe subscription's state (docs/MEMBERSHIP.md 2.5)", () => {
  const base = { starts_at: iso(NOW - 10 * DAY_MS), ends_at: iso(NOW + 27 * DAY_MS), plan: "monthly" as const };
  const periodEnd = NOW + 20 * DAY_MS;

  it("keeps a renewing one running a week past its period end, and a cancelling one to the end of what was paid", () => {
    expect(subscriptionState(base, snapshot(), NOW)).toEqual({ status: "active", ends_at: iso(periodEnd + MEMBERSHIP_GRACE_MS), plan: "monthly", current_period_end: iso(periodEnd), cancel_at_period_end: false });
    expect(subscriptionState(base, snapshot({ cancelAtPeriodEnd: true }), NOW)).toMatchObject({ status: "active", ends_at: iso(periodEnd), cancel_at_period_end: true });
    // A cancel_at of its own (set in the Dashboard) ends it then, if that comes first.
    expect(subscriptionState(base, snapshot({ cancelAt: NOW + 5 * DAY_MS }), NOW)).toMatchObject({ ends_at: iso(NOW + 5 * DAY_MS), cancel_at_period_end: true });
    // Nothing Ethos makes is a trial, but one would count as active.
    expect(subscriptionState(base, snapshot({ status: "trialing" }), NOW)).toMatchObject({ status: "active" });
  });

  it("gives a renewal being retried a week from the end of what was paid, not of the period Stripe is collecting for", () => {
    // Stripe moved on to the unpaid month two days ago, when it invoiced it: the week runs from there.
    const unpaid = snapshot({ status: "past_due", currentPeriodStart: NOW - 2 * DAY_MS, currentPeriodEnd: NOW + 28 * DAY_MS });
    expect(subscriptionState(base, unpaid, NOW)).toMatchObject({ status: "past_due", current_period_end: iso(NOW - 2 * DAY_MS), ends_at: iso(NOW + 5 * DAY_MS) });
    // A yearly renewal nobody has paid for runs a week, not a year.
    const year = snapshot({ status: "past_due", plan: "yearly", currentPeriodStart: NOW - DAY_MS, currentPeriodEnd: NOW + 364 * DAY_MS });
    expect(subscriptionState({ ...base, plan: "yearly" }, year, NOW)).toMatchObject({ current_period_end: iso(NOW - DAY_MS), ends_at: iso(NOW + 6 * DAY_MS) });
    // Paid after all: the period Stripe says is paid for, and a week past it.
    expect(subscriptionState(base, { ...unpaid, status: "active" }, NOW)).toMatchObject({ status: "active", current_period_end: iso(NOW + 28 * DAY_MS), ends_at: iso(NOW + 28 * DAY_MS + MEMBERSHIP_GRACE_MS) });
  });

  it("never lets a first payment still being confirmed run", () => {
    expect(subscriptionState(base, snapshot({ status: "incomplete" }), NOW)).toMatchObject({ status: "incomplete", ends_at: base.starts_at });
  });

  it("ends every other status when Stripe says it ended, never later than it already was", () => {
    for (const status of ["canceled", "unpaid", "incomplete_expired", "paused"]) {
      expect(subscriptionState(base, snapshot({ status, endedAt: NOW - DAY_MS }), NOW), status).toMatchObject({ status: "ended", ends_at: iso(NOW - DAY_MS) });
      expect(subscriptionState(base, snapshot({ status }), NOW), status).toMatchObject({ status: "ended", ends_at: iso(NOW) });
    }
    // Never before it started.
    expect(subscriptionState(base, snapshot({ status: "canceled", endedAt: NOW - 30 * DAY_MS }), NOW).ends_at).toBe(base.starts_at);
  });

  it("reads the plan from the price's interval", () => {
    expect(subscriptionState(base, snapshot({ plan: "yearly" }), NOW).plan).toBe("yearly");
    expect(subscriptionState(base, snapshot({ plan: null }), NOW).plan).toBe("monthly");
  });

  it("keeps a couple going through the grace on a status Stripe adds later", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(subscriptionState(base, snapshot({ status: "something_new" }), NOW)).toMatchObject({ status: "past_due", ends_at: iso(periodEnd + MEMBERSHIP_GRACE_MS) });
  });

  it("reads Stripe's objects, in the dahlia shape and the older one", () => {
    const sub = stripe.addSubscription({ id: "sub_9", interval: "month", periodEnd: NOW + 5 * DAY_MS, cancelAtPeriodEnd: true, metadata: { app: "ethos" } }) as unknown as Stripe.Subscription;
    expect(normaliseSubscription(sub)).toMatchObject({
      id: "sub_9",
      plan: "monthly",
      currentPeriodStart: Math.floor((NOW - 25 * DAY_MS) / 1000) * 1000,
      currentPeriodEnd: Math.floor((NOW + 5 * DAY_MS) / 1000) * 1000,
      cancelAtPeriodEnd: true,
      itemId: "si_sub_9",
      productId: "prod_fortwo",
      currency: "eur",
      unitAmount: 499,
    });
    const legacy = {
      ...sub,
      items: { data: [{ id: "si_x", price: { recurring: { interval: "year" }, product: "prod_x", currency: "eur", unit_amount: 2999 } }] },
      current_period_start: Math.floor((NOW - 365 * DAY_MS) / 1000),
      current_period_end: Math.floor(NOW / 1000),
    } as unknown as Stripe.Subscription;
    expect(normaliseSubscription(legacy)).toMatchObject({ plan: "yearly", currentPeriodStart: Math.floor((NOW - 365 * DAY_MS) / 1000) * 1000, currentPeriodEnd: Math.floor(NOW / 1000) * 1000 });
  });
});

describe("applying Stripe's state to a membership", () => {
  it("hands the owner and the partner every template and pack while it runs, and takes them back when it ends", async () => {
    const sendEnded = vi.fn(async () => true);
    seedSubscription({ partner_user_id: PARTNER });
    await applySubscriptionState(fake.db, row(), snapshot(), NOW, { sendEnded });
    expect(unlocks(OWNER)).toEqual(["*@p1", "pack:*@p1"]);
    expect(unlocks(PARTNER)).toEqual(["*@p1", "pack:*@p1"]);

    // Cancelled at the end of what was paid: the period runs out and Stripe says canceled.
    fake.clock = NOW + 21 * DAY_MS;
    await applySubscriptionState(fake.db, row(), snapshot({ status: "canceled", cancelAtPeriodEnd: true, endedAt: NOW + 20 * DAY_MS, cancellationReason: "cancellation_requested" }), fake.clock, { sendEnded });
    expect(row()).toMatchObject({ status: "ended", ends_at: iso(NOW + 20 * DAY_MS) });
    expect(unlocks(OWNER)).toEqual([]);
    expect(unlocks(PARTNER)).toEqual([]);
    expect(sendEnded).toHaveBeenCalledTimes(1);
    expect(row().ended_notified_at).toBe(iso(fake.clock));

    // The same event again (or deleted after updated) sends nothing more.
    await applySubscriptionState(fake.db, row(), snapshot({ status: "canceled", endedAt: NOW + 20 * DAY_MS }), fake.clock, { sendEnded });
    expect(sendEnded).toHaveBeenCalledTimes(1);
  });

  it("keeps a partner's own Everything, and hands back rows from another membership still running", async () => {
    seedSubscription({ partner_user_id: PARTNER });
    fake.tables.template_unlocks = [{ id: "t1", user_id: PARTNER, template_slug: "*", purchase_id: "bought-outright" }];
    await applySubscriptionState(fake.db, row(), snapshot(), NOW);
    expect(unlocks(PARTNER)).toEqual(["*@bought-outright", "pack:*@p1"]);
    // The partner also holds a pass of their own that runs on.
    fake.tables.couple_passes.push({ ...new FakeDb({ couple_passes: [{ id: "own", purchase_id: "p-own", owner_user_id: PARTNER, invite_code: "zzzzzzzzzz", starts_at: iso(NOW - DAY_MS), ends_at: iso(NOW + 300 * DAY_MS) }] }).rows("couple_passes")[0] });
    await applySubscriptionState(fake.db, row(), snapshot({ status: "canceled", endedAt: NOW }), NOW + 1);
    expect(unlocks(PARTNER)).toEqual(["*@bought-outright", "pack:*@p-own"]);
  });

  it("says nothing when it was ended on purpose before its paid period, or never started", async () => {
    const sendEnded = vi.fn(async () => true);
    seedSubscription();
    // Cancelled at once in the Dashboard (a refund, a withdrawal): somebody's decision, not a running out.
    await applySubscriptionState(fake.db, row(), snapshot({ status: "canceled", endedAt: NOW, cancellationReason: "cancellation_requested" }), NOW, { sendEnded });
    expect(sendEnded).not.toHaveBeenCalled();
    expect(row().ended_notified_at).toBe(iso(NOW));

    fake = new FakeDb({}, NOW);
    seedSubscription({ status: "incomplete", ends_at: iso(NOW - 10 * DAY_MS) });
    await applySubscriptionState(fake.db, row(), snapshot({ status: "incomplete_expired", endedAt: NOW }), NOW, { sendEnded });
    expect(sendEnded).not.toHaveBeenCalled();

    // Retries exhausted is a running out, whenever Stripe gives up.
    fake = new FakeDb({}, NOW);
    seedSubscription({ status: "past_due" });
    await applySubscriptionState(fake.db, row(), snapshot({ status: "canceled", endedAt: NOW, cancellationReason: "payment_failed" }), NOW, { sendEnded });
    expect(sendEnded).toHaveBeenCalledTimes(1);
  });

  it("releases the claim when the email doesn't go, and a revived membership's next end is news again", async () => {
    seedSubscription({ status: "past_due" });
    await applySubscriptionState(fake.db, row(), snapshot({ status: "unpaid" }), NOW, { sendEnded: async () => false });
    expect(row()).toMatchObject({ status: "ended", ended_notified_at: null });
    // The unpaid renewal is settled after all.
    await applySubscriptionState(fake.db, row(), snapshot({ currentPeriodEnd: NOW + 30 * DAY_MS }), NOW, { sendEnded: async () => true });
    expect(row()).toMatchObject({ status: "active", ends_at: iso(NOW + 30 * DAY_MS + MEMBERSHIP_GRACE_MS), ended_notified_at: null });
    expect(unlocks(OWNER)).toEqual(["*@p1", "pack:*@p1"]);
  });

  it("clears a pending switch once it has happened, or once the membership is cancelled", async () => {
    seedSubscription({ plan: "yearly", pending_plan: "monthly" });
    await applySubscriptionState(fake.db, row(), snapshot({ plan: "yearly" }), NOW);
    expect(row().pending_plan).toBe("monthly");
    await applySubscriptionState(fake.db, row(), snapshot({ plan: "monthly" }), NOW);
    expect(row().pending_plan).toBeNull();
    fake.tables.couple_passes[0].pending_plan = "monthly";
    await applySubscriptionState(fake.db, row(), snapshot({ plan: "yearly", cancelAtPeriodEnd: true }), NOW);
    expect(row().pending_plan).toBeNull();
  });
});

describe("starting a subscription's membership", () => {
  it("makes one row per subscription however often it is called, with its own invite code", async () => {
    fake.tables.purchases = [{ id: "p1", user_id: OWNER, product: "membership", status: "paid", amount: 499, currency: "eur" }];
    const first = await startSubscriptionMembership(fake.db, { purchaseId: "p1", ownerId: OWNER, customerId: "cus_1", subscription: snapshot(), now: NOW });
    const again = await startSubscriptionMembership(fake.db, { purchaseId: "p1", ownerId: OWNER, customerId: "cus_1", subscription: snapshot(), now: NOW });
    expect(first).toMatchObject({ created: true, row: { provider: "stripe_subscription", plan: "monthly", status: "active", stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1", partner_user_id: null } });
    expect(again).toMatchObject({ created: false });
    expect(fake.rows("couple_passes")).toHaveLength(1);
    expect(row(("row" in first ? first.row : null)!.id).invite_code).toMatch(/^[a-z2-7]{10}$/);
    expect(unlocks(OWNER)).toEqual(["*@p1", "pack:*@p1"]);
  });

  it("still gives a second membership to somebody who paid twice, and says so for a refund", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    seedSubscription({ id: "old", purchase_id: "p0", stripe_subscription_id: "sub_0" });
    const second = await startSubscriptionMembership(fake.db, { purchaseId: "p1", ownerId: OWNER, customerId: "cus_1", subscription: snapshot(), now: NOW });
    expect(second).toMatchObject({ created: true });
    expect(error).toHaveBeenCalledWith("[membership] second running membership: refund one", OWNER, "sub_1");
  });
});

describe("the membership as the pages see it", () => {
  const read = (userId: string) => readMembership(fake.db, userId, { locale: "en", now: NOW, names: fake.db });

  it("an owner's renewing monthly membership: it renews, the invite link while the place is empty, switching to yearly", async () => {
    seedSubscription();
    expect(await read(OWNER)).toEqual({
      provider: "stripe_subscription",
      plan: "monthly",
      status: "active",
      running: true,
      isOwner: true,
      partnerJoined: false,
      partner: null,
      inviteUrl: expect.stringMatching(/\/for-two\/join\?code=abcdefghij$/),
      periodEnd: iso(NOW + 20 * DAY_MS),
      renews: true,
      endsAt: null,
      pendingPlan: null,
      manage: "stripe",
      canSwitchToYearly: true,
      canSwitchToMonthly: false,
    });
  });

  it("a partner sees whose it is, and nothing to manage; the owner sees who joined", async () => {
    seedSubscription({ partner_user_id: PARTNER, plan: "yearly", cancel_at_period_end: true, ends_at: iso(NOW + 20 * DAY_MS) });
    expect(await read(PARTNER)).toMatchObject({ isOwner: false, partnerJoined: true, partner: { name: "Alex", initial: "A" }, manage: null, renews: false, endsAt: iso(NOW + 20 * DAY_MS), canSwitchToMonthly: false });
    const owner = await read(OWNER);
    expect(owner).toMatchObject({ partner: { name: "Sam", initial: "S" }, renews: false, canSwitchToMonthly: false });
    expect(owner).not.toHaveProperty("inviteUrl");
  });

  it("a payment Stripe is still collecting after the grace: not running, and says so", async () => {
    seedSubscription({ status: "past_due", ends_at: iso(NOW - DAY_MS), current_period_end: iso(NOW - 8 * DAY_MS) });
    expect(await read(OWNER)).toMatchObject({ status: "past_due", running: false, renews: false, endsAt: iso(NOW - DAY_MS) });
    expect(await membershipContextOf(fake.db, OWNER, NOW)).toEqual({ running: false, isOwner: true, provider: "stripe_subscription", status: "past_due" });
    expect(await membershipContextOf(fake.db, OTHER, NOW)).toBeNull();
  });

  it("a pass counts the years bought ahead, and is managed as a pass", async () => {
    fake = new FakeDb(
      {
        couple_passes: [
          { id: "y1", purchase_id: "a", owner_user_id: OWNER, invite_code: "aaaaaaaaaa", starts_at: iso(NOW - 100 * DAY_MS), ends_at: iso(NOW + 265 * DAY_MS) },
          { id: "y2", purchase_id: "b", owner_user_id: OWNER, invite_code: "bbbbbbbbbb", starts_at: iso(NOW + 265 * DAY_MS), ends_at: iso(NOW + 630 * DAY_MS) },
        ],
      },
      NOW,
    );
    expect(await read(OWNER)).toMatchObject({ provider: "stripe_pass", plan: "yearly", renews: false, periodEnd: iso(NOW + 630 * DAY_MS), endsAt: iso(NOW + 630 * DAY_MS), manage: "pass", canSwitchToYearly: false });
  });

  it("keeps the old `pass` field filled for the app, and lifts the saved-dates limit for members", async () => {
    seedSubscription({ partner_user_id: PARTNER });
    const owner = await readEntitlements(fake.db, OWNER, { locale: "en", currency: "eur", now: NOW });
    expect(owner.pass).toEqual({ endsAt: iso(NOW + 20 * DAY_MS), isOwner: true, partnerJoined: true });
    expect(owner.membership).toMatchObject({ renews: true, partner: { name: "Sam" } });
    expect(owner.savedDatesLimit).toBeNull();
    expect((await readEntitlements(fake.db, OTHER, { locale: "en", currency: "eur", now: NOW })).savedDatesLimit).toBe(3);
  });
});

describe("what an owner or a partner can do (POST /api/membership)", () => {
  const act = (userId: string, action: Parameters<typeof runMembershipAction>[2]) => runMembershipAction(fake.db, userId, action, { now: NOW, billing: stripeBilling(stripe.client) });

  beforeEach(() => {
    seedSubscription({ partner_user_id: PARTNER });
    stripe.addSubscription({ id: "sub_1", interval: "month", periodEnd: NOW + 20 * DAY_MS, metadata: { app: "ethos", purchase_id: "p1" } });
  });

  it("cancels at the end of the period (the pending switch goes too), and resumes", async () => {
    fake.tables.couple_passes[0].pending_plan = "monthly";
    expect(await act(OWNER, "cancel")).toEqual({ status: 200, body: { ok: true, membership: null } });
    expect(stripe.subscriptions.sub_1.cancel_at_period_end).toBe(true);
    expect(row()).toMatchObject({ cancel_at_period_end: true, pending_plan: null, ends_at: iso(Math.floor((NOW + 20 * DAY_MS) / 1000) * 1000) });
    // Twice is once.
    await act(OWNER, "cancel");
    expect(stripe.calls.filter((c) => c.method === "subscriptions.update")).toHaveLength(1);
    await act(OWNER, "resume");
    expect(stripe.subscriptions.sub_1.cancel_at_period_end).toBe(false);
    expect(row()).toMatchObject({ cancel_at_period_end: false });
  });

  it("ends a renewal Stripe can't collect at once, voiding what it was trying to charge", async () => {
    stripe.subscriptions.sub_1.status = "past_due";
    stripe.addInvoice({ id: "in_open", status: "open", parent: { subscription_details: { subscription: "sub_1" } } });
    await act(OWNER, "cancel");
    expect(stripe.calls.map((c) => c.method)).toContain("subscriptions.cancel");
    expect(stripe.invoices.in_open.status).toBe("void");
    expect(row().status).toBe("ended");
  });

  it("previews and makes the switch to yearly, and says so when the payment doesn't go through", async () => {
    expect(await act(OWNER, "preview_yearly")).toEqual({ status: 200, body: { ok: true, preview: { amountDue: 2749, currency: "eur", periodEnd: iso(Math.floor((NOW + 365 * DAY_MS) / 1000) * 1000) } } });
    const update = () => stripe.calls.filter((c) => c.method === "subscriptions.update").at(-1)!.args[1] as Record<string, unknown>;

    stripe.switchOutcome = "payment_failed";
    expect(await act(OWNER, "switch_to_yearly")).toEqual({ status: 402, body: { error: "payment_failed" } });
    expect(update()).toMatchObject({ proration_behavior: "always_invoice", payment_behavior: "pending_if_incomplete", items: [{ id: "si_sub_1", price_data: { currency: "eur", product: "prod_fortwo", unit_amount: 2999, recurring: { interval: "year" } } }] });
    expect(Object.values(stripe.invoices).filter((i) => i.billing_reason === "subscription_update").map((i) => i.status)).toEqual(["void"]);
    expect(row().plan).toBe("monthly");

    stripe.switchOutcome = "requires_action";
    expect(await act(OWNER, "switch_to_yearly")).toEqual({ status: 402, body: { error: "requires_action", url: "https://invoice.stripe.test/i/1" } });

    stripe.switchOutcome = "switched";
    expect(await act(OWNER, "switch_to_yearly")).toMatchObject({ status: 200 });
    expect(row().plan).toBe("yearly");
    // No trial, no coupon: nothing in any call to Stripe.
    for (const call of stripe.calls) expect(JSON.stringify(call.args)).not.toMatch(/trial|coupon|promotion_code|discount/);
  });

  it("starts a new billing period at the switch, in the preview and in the switch alike", async () => {
    // A subscription in flexible billing mode (Checkout's) keeps its old anchor through a change of
    // interval unless told otherwise: the "year" would end on the monthly anchor, months short.
    await act(OWNER, "preview_yearly");
    const preview = stripe.calls.find((c) => c.method === "invoices.createPreview")!.args[0] as { subscription_details: Record<string, unknown> };
    expect(preview.subscription_details).toMatchObject({ billing_cycle_anchor: "now", proration_behavior: "always_invoice" });
    // Stripe refuses a proration_date beside an anchor of now.
    expect(preview.subscription_details).not.toHaveProperty("proration_date");
    expect(await act(OWNER, "switch_to_yearly")).toMatchObject({ status: 200 });
    const update = stripe.calls.find((c) => c.method === "subscriptions.update")!.args[1];
    expect(update).toMatchObject({ billing_cycle_anchor: "now", proration_behavior: "always_invoice", payment_behavior: "pending_if_incomplete" });
  });

  it("hangs the new price off the configured Ethos for Two product when there is one", async () => {
    // A subscription made before STRIPE_PRODUCT_FORTWO was set sits on the product Checkout made inline.
    vi.stubEnv("STRIPE_PRODUCT_FORTWO", "prod_configured");
    try {
      expect(await act(OWNER, "switch_to_yearly")).toMatchObject({ status: 200 });
      const update = stripe.calls.find((c) => c.method === "subscriptions.update")!.args[1];
      expect(update).toMatchObject({ items: [{ id: "si_sub_1", price_data: { product: "prod_configured", unit_amount: 2999, recurring: { interval: "year" } } }] });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("un-cancels before switching, and cancels again if the switch doesn't happen", async () => {
    await act(OWNER, "cancel");
    stripe.switchOutcome = "payment_failed";
    await act(OWNER, "switch_to_yearly");
    expect(stripe.subscriptions.sub_1.cancel_at_period_end).toBe(true);
    expect(row().cancel_at_period_end).toBe(true);
  });

  it("waits for the renewal to switch a yearly one to monthly, and can keep yearly after all", async () => {
    expect(await act(OWNER, "switch_to_monthly")).toMatchObject({ status: 409, body: { error: "not_available", reason: "not_yearly" } });
    expect(await act(OWNER, "preview_yearly")).toMatchObject({ status: 200 });
    fake.tables.couple_passes[0].plan = "yearly";
    stripe.subscriptions.sub_1 = stripe.addSubscription({ id: "sub_1", interval: "year", periodEnd: NOW + 200 * DAY_MS, metadata: { app: "ethos" } });
    expect(await act(OWNER, "preview_yearly")).toMatchObject({ status: 409, body: { reason: "not_monthly" } });
    expect(await act(OWNER, "switch_to_monthly")).toMatchObject({ status: 200 });
    expect(row().pending_plan).toBe("monthly");
    expect(stripe.writes()).toEqual([]);
    await act(OWNER, "keep_plan");
    expect(row().pending_plan).toBeNull();
    fake.tables.couple_passes[0].cancel_at_period_end = true;
    expect(await act(OWNER, "switch_to_monthly")).toMatchObject({ status: 409, body: { reason: "cancelling" } });
  });

  it("lets the partner leave and the owner remove them, with a new invite link", async () => {
    await applySubscriptionState(fake.db, row(), normaliseSubscription(stripe.subscriptions.sub_1 as unknown as Stripe.Subscription), NOW);
    expect(unlocks(PARTNER)).toEqual(["*@p1", "pack:*@p1"]);
    expect(await act(PARTNER, "cancel")).toMatchObject({ status: 403, body: { error: "not_owner" } });
    expect(await act(OWNER, "leave")).toMatchObject({ status: 403, body: { error: "not_partner" } });
    expect(await act(PARTNER, "leave")).toMatchObject({ status: 200 });
    expect(row().partner_user_id).toBeNull();
    expect(unlocks(PARTNER)).toEqual([]);
    expect(unlocks(OWNER)).toEqual(["*@p1", "pack:*@p1"]);

    fake.tables.couple_passes[0].partner_user_id = OTHER;
    fake.tables.template_unlocks.push({ id: "x", user_id: OTHER, template_slug: "*", purchase_id: "p1" });
    const code = row().invite_code;
    expect(await act(OWNER, "remove_partner")).toMatchObject({ status: 200 });
    expect(row().partner_user_id).toBeNull();
    expect(row().invite_code).not.toBe(code);
    expect(unlocks(OTHER)).toEqual([]);
  });

  it("refuses what isn't theirs to do, and what Stripe doesn't manage", async () => {
    expect(await act(OTHER, "cancel")).toMatchObject({ status: 404, body: { error: "not_member" } });
    expect(await act(OTHER, "leave")).toMatchObject({ status: 404, body: { error: "not_member" } });
    expect(await runMembershipAction(fake.db, OWNER, "cancel", { now: NOW, billing: null })).toMatchObject({ status: 503, body: { error: "not_configured" } });
    fake.tables.couple_passes[0].provider = "app_store";
    expect(await act(OWNER, "cancel")).toMatchObject({ status: 409, body: { error: "not_available", reason: "app_store" } });
    // Leaving and removing work whoever bills it.
    expect(await act(OWNER, "remove_partner")).toMatchObject({ status: 200 });
    fake.tables.couple_passes[0].provider = "stripe_pass";
    expect(await act(OWNER, "switch_to_yearly")).toMatchObject({ status: 409, body: { reason: "pass" } });
    stripe.failing.add("subscriptions.retrieve");
    fake.tables.couple_passes[0].provider = "stripe_subscription";
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await act(OWNER, "cancel")).toMatchObject({ status: 502, body: { error: "stripe_failed" } });
  });
});

describe("the answers of POST /api/membership are the contract's (docs/MEMBERSHIP.md 2.7)", () => {
  const act = (userId: string, action: Parameters<typeof runMembershipAction>[2]) => runMembershipAction(fake.db, userId, action, { now: NOW, billing: stripeBilling(stripe.client) });
  const REASONS = ["app_store", "pass", "cancelling", "past_due", "not_monthly", "not_yearly"];
  const ACTIONS = ["cancel", "resume", "preview_yearly", "switch_to_yearly", "switch_to_monthly", "keep_plan", "leave", "remove_partner"] as const;
  /** Every Stripe status a subscription can be in, with the row as the webhook left it. */
  const STRIPE_STATES = [
    { stripe: "active", row: "active" },
    { stripe: "past_due", row: "past_due" },
    { stripe: "incomplete", row: "incomplete" },
    { stripe: "canceled", row: "active" },
  ] as const;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  /** The database, with the nth update of couple_passes failing (the ones before it go through). */
  const failingUpdate = (n: number): Db => {
    let count = 0;
    return {
      from: (table: string) => {
        const query = fake.db.from(table as "couple_passes") as unknown as { update: (patch: unknown) => unknown };
        if (table === "couple_passes") {
          const update = query.update.bind(query);
          query.update = (patch) => {
            if (++count === n) fake.failNext("couple_passes", "update");
            return update(patch);
          };
        }
        return query;
      },
    } as unknown as Db;
  };

  it("refuses with 409 what the \"who, when\" column doesn't allow, and changes nothing", async () => {
    seedSubscription({ plan: "yearly" });
    stripe.addSubscription({ id: "sub_1", interval: "year", periodEnd: NOW + 20 * DAY_MS, metadata: { app: "ethos" } });
    const before = row();
    // Nothing pending to keep, nothing cancelled to resume, nobody to remove: no reason to give.
    expect(await act(OWNER, "keep_plan")).toEqual({ status: 409, body: { error: "not_available" } });
    expect(await act(OWNER, "resume")).toEqual({ status: 409, body: { error: "not_available" } });
    expect(await act(OWNER, "remove_partner")).toEqual({ status: 409, body: { error: "not_available" } });
    expect(row()).toMatchObject({ pending_plan: null, cancel_at_period_end: false, invite_code: before.invite_code });
    expect(stripe.writes()).toEqual([]);
  });

  it("only ever gives one of the reasons the contract lists, whatever state the membership is in", async () => {
    const seen = new Set<string>();
    for (const provider of ["stripe_subscription", "stripe_pass", "app_store", "app_store_pass"] as const)
      for (const state of STRIPE_STATES)
        for (const plan of ["monthly", "yearly"] as const)
          for (const cancelling of [false, true])
            for (const pending of [null, "monthly"] as const)
              for (const action of ACTIONS) {
                fake = new FakeDb({ profiles: [{ id: OWNER, email: "alex@x.co", name: "Alex", locale: "en" }] }, NOW);
                stripe = new FakeStripe(() => fake.clock);
                seedSubscription({ provider, plan, status: state.row, cancel_at_period_end: cancelling, pending_plan: pending, ...(state.row === "incomplete" ? { ends_at: iso(NOW - 10 * DAY_MS) } : {}) });
                stripe.addSubscription({ id: "sub_1", status: state.stripe, interval: plan === "monthly" ? "month" : "year", periodEnd: NOW + 20 * DAY_MS, cancelAtPeriodEnd: cancelling, endedAt: state.stripe === "canceled" ? NOW : null, metadata: { app: "ethos" } });
                const { status, body } = await act(OWNER, action);
                expect([200, 402, 403, 404, 409], `${provider} ${state.stripe} ${plan} ${action}`).toContain(status);
                if ("reason" in body && body.reason) seen.add(body.reason);
                if ("reason" in body && body.reason) expect(REASONS, `${provider} ${state.stripe} ${plan} ${action}`).toContain(body.reason);
              }
    // Each of them is reachable.
    expect([...seen].sort()).toEqual([...REASONS].sort());
  });

  it("tells a member whose first payment isn't through to sort the payment out, and a membership that has just ended nothing", async () => {
    seedSubscription({ status: "incomplete", ends_at: iso(NOW - 10 * DAY_MS) });
    stripe.addSubscription({ id: "sub_1", status: "incomplete", interval: "month", metadata: { app: "ethos" } });
    expect(await act(OWNER, "cancel")).toEqual({ status: 409, body: { error: "not_available", reason: "past_due" } });
    expect(await act(OWNER, "preview_yearly")).toEqual({ status: 409, body: { error: "not_available", reason: "past_due" } });

    // Stripe says it ended (the webhook hasn't come yet): the row learns it, and there is nothing to do.
    fake = new FakeDb({}, NOW);
    stripe = new FakeStripe(() => fake.clock);
    seedSubscription();
    stripe.addSubscription({ id: "sub_1", status: "canceled", interval: "month", endedAt: NOW - DAY_MS, metadata: { app: "ethos" } });
    expect(await act(OWNER, "cancel")).toEqual({ status: 409, body: { error: "not_available" } });
    expect(row().status).toBe("ended");
  });

  it("resumes a renewal Stripe is still collecting that was set to cancel: cancelling, not ended", async () => {
    seedSubscription({ status: "past_due", cancel_at_period_end: true });
    stripe.addSubscription({ id: "sub_1", status: "past_due", interval: "month", cancelAtPeriodEnd: true, metadata: { app: "ethos" } });
    expect(await act(OWNER, "resume")).toEqual({ status: 200, body: { ok: true, membership: null } });
    expect(stripe.subscriptions.sub_1.cancel_at_period_end).toBe(false);
    expect(row()).toMatchObject({ status: "past_due", cancel_at_period_end: false });
  });

  it("answers a database error with 500 failed, never as Stripe's failure", async () => {
    seedSubscription({ plan: "yearly", partner_user_id: PARTNER, pending_plan: "monthly" });
    stripe.addSubscription({ id: "sub_1", interval: "year", periodEnd: NOW + 20 * DAY_MS, metadata: { app: "ethos" } });
    const failed = { status: 500, body: { error: "failed" } };
    fake.failNext("couple_passes", "update");
    expect(await act(OWNER, "keep_plan")).toEqual(failed);
    expect(row().pending_plan).toBe("monthly");
    fake.failNext("couple_passes", "update");
    expect(await act(PARTNER, "leave")).toEqual(failed);
    fake.failNext("couple_passes", "update");
    expect(await act(OWNER, "remove_partner")).toEqual(failed);
    // Stripe did cancel it; writing that down failed (the second write: the first is the state read
    // before acting). The webhook brings the row up to date.
    expect(await runMembershipAction(failingUpdate(2), OWNER, "cancel", { now: NOW, billing: stripeBilling(stripe.client) })).toEqual(failed);
    expect(stripe.subscriptions.sub_1.cancel_at_period_end).toBe(true);
    fake.tables.couple_passes[0].pending_plan = null;
    fake.tables.couple_passes[0].cancel_at_period_end = false;
    fake.failNext("couple_passes", "update");
    expect(await act(OWNER, "switch_to_monthly")).toEqual(failed);
    // Stripe itself failing is the only 502.
    stripe.failing.add("subscriptions.retrieve");
    expect(await act(OWNER, "cancel")).toEqual({ status: 502, body: { error: "stripe_failed" } });
  });

  /** The database, with the nth select of couple_passes failing (the ones before it go through). */
  const failingSelect = (n: number): Db => {
    let count = 0;
    return {
      from: (table: string) => {
        const query = fake.db.from(table as "couple_passes") as unknown as { select: (columns?: string) => unknown };
        if (table === "couple_passes") {
          const select = query.select.bind(query);
          query.select = (columns) => {
            if (++count === n) fake.failNext("couple_passes", "select", "connection reset");
            return select(columns);
          };
        }
        return query;
      },
    } as unknown as Db;
  };

  it("never answers 'done' to leaving or removing when the membership couldn't be read, and never throws", async () => {
    seedSubscription({ partner_user_id: PARTNER });
    stripe.addSubscription({ id: "sub_1", interval: "month", periodEnd: NOW + 20 * DAY_MS, metadata: { app: "ethos" } });
    const failed = { status: 500, body: { error: "failed" } };
    const ctx = { now: NOW, billing: stripeBilling(stripe.client) };
    const code = row().invite_code;
    // The first two selects find the membership; the third is leaving's or removing's own read.
    expect(await runMembershipAction(failingSelect(3), PARTNER, "leave", ctx)).toEqual(failed);
    expect(await runMembershipAction(failingSelect(3), OWNER, "remove_partner", ctx)).toEqual(failed);
    expect(row()).toMatchObject({ partner_user_id: PARTNER, invite_code: code });
    // The membership itself unreadable: the same answer, not an exception for the route to turn into a bare 500.
    for (const n of [1, 2]) {
      expect(await runMembershipAction(failingSelect(n), PARTNER, "leave", ctx)).toEqual(failed);
      expect(await runMembershipAction(failingSelect(n), OWNER, "cancel", ctx)).toEqual(failed);
    }
    expect(row()).toMatchObject({ partner_user_id: PARTNER, invite_code: code, cancel_at_period_end: false });
    expect(stripe.writes()).toEqual([]);
  });

  it("answers the same through the route, with no reason where there is none", async () => {
    routes.db = fake.db;
    routes.stripe = stripe.client;
    routes.user = { id: OWNER };
    seedSubscription();
    stripe.addSubscription({ id: "sub_1", interval: "month", periodEnd: NOW + 20 * DAY_MS, metadata: { app: "ethos" } });
    const post = (body: unknown) => membershipRoute.POST(new NextRequest("https://ethos.test/api/membership", { method: "POST", body: JSON.stringify(body) }));
    const kept = await post({ action: "keep_plan" });
    expect(kept.status).toBe(409);
    expect(await kept.json()).toEqual({ error: "not_available" });
    const failed = await post({ action: "switch_to_monthly" });
    expect(failed.status).toBe(409);
    expect(await failed.json()).toEqual({ error: "not_available", reason: "not_yearly" });
    fake.tables.couple_passes[0].plan = "yearly";
    fake.failNext("couple_passes", "update");
    const broken = await post({ action: "switch_to_monthly" });
    expect(broken.status).toBe(500);
    expect(await broken.json()).toEqual({ error: "failed" });
    // Done, but the membership can't be read back afterwards: the contract's 500, never an HTML page.
    fake.tables.couple_passes[0].pending_plan = "monthly";
    let selects = 0;
    routes.db = {
      from: (table: string) => {
        if (table === "couple_passes" && ++selects === 3) fake.failNext("couple_passes", "select", "connection reset");
        return fake.db.from(table as "couple_passes");
      },
    };
    const unread = await post({ action: "keep_plan" });
    expect(unread.status).toBe(500);
    expect(await unread.json()).toEqual({ error: "failed" });
    expect(row().pending_plan).toBeNull();
    // Whatever escapes the action itself (here the database client throwing mid-way) is still the contract's 500.
    fake.tables.couple_passes[0].partner_user_id = PARTNER;
    routes.user = { id: PARTNER };
    let calls = 0;
    routes.db = {
      from: (table: string) => {
        if (++calls === 3) throw new Error("pool exhausted");
        return fake.db.from(table as "couple_passes");
      },
    };
    const thrown = await post({ action: "leave" });
    expect(thrown.status).toBe(500);
    expect(await thrown.json()).toEqual({ error: "failed" });
    routes.user = { id: OWNER };
    routes.db = null;
    const unconfigured = await post({ action: "cancel" });
    expect(unconfigured.status).toBe(503);
    expect(await unconfigured.json()).toEqual({ error: "not_configured" });
  });
});

describe("joining", () => {
  it("tells whether it renews, and refuses somebody with Ethos for Two of their own", async () => {
    seedSubscription();
    const joined = await joinPass(fake.db, { code: "abcdefghij", userId: PARTNER, now: NOW });
    expect(joined).toMatchObject({ ok: true, renews: true });
    expect(unlocks(PARTNER)).toEqual(["*@p1", "pack:*@p1"]);

    // Somebody who owns a membership, or shares another couple's, can't join a second one.
    fake = new FakeDb({}, NOW);
    seedSubscription();
    seedSubscription({ id: "theirs", purchase_id: "p9", owner_user_id: OTHER, invite_code: "kkkkkkkkkk", stripe_subscription_id: "sub_9" });
    expect(await joinPass(fake.db, { code: "abcdefghij", userId: OTHER, now: NOW })).toEqual({ ok: false, error: "has_own" });
    fake.tables.couple_passes.find((r) => r.id === "theirs")!.partner_user_id = PARTNER;
    expect(await joinPass(fake.db, { code: "abcdefghij", userId: PARTNER, now: NOW })).toEqual({ ok: false, error: "has_own" });
  });
});

describe("the daily job", () => {
  it("switches a yearly membership to monthly within three days of its renewal, and not before", async () => {
    seedSubscription({ plan: "yearly", pending_plan: "monthly", current_period_end: iso(NOW + 5 * DAY_MS) });
    stripe.addSubscription({ id: "sub_1", interval: "year", periodEnd: NOW + 5 * DAY_MS, metadata: { app: "ethos" } });
    const billing = stripeBilling(stripe.client);
    expect(await applyPendingSwitches(fake.db, NOW, billing)).toEqual({ due: 0, switched: 0 });
    fake.tables.couple_passes[0].current_period_end = iso(NOW + 2 * DAY_MS);
    stripe.subscriptions.sub_1 = stripe.addSubscription({ id: "sub_1", interval: "year", periodEnd: NOW + 2 * DAY_MS, metadata: { app: "ethos" } });
    expect(await applyPendingSwitches(fake.db, NOW, billing)).toEqual({ due: 1, switched: 1 });
    expect(row()).toMatchObject({ plan: "monthly", pending_plan: null });
    const update = stripe.calls.find((c) => c.method === "subscriptions.update")!.args[1];
    expect(update).toMatchObject({ billing_cycle_anchor: "now", proration_behavior: "always_invoice", items: [{ price_data: { unit_amount: 499, recurring: { interval: "month" } } }] });
  });

  it("reminds a yearly owner once a week before the renewal, and tries again when sending fails", async () => {
    seedSubscription({ plan: "yearly", current_period_end: iso(NOW + 5 * DAY_MS) });
    seedSubscription({ id: "monthly", purchase_id: "p2", owner_user_id: OTHER, invite_code: "mmmmmmmmmm", stripe_subscription_id: "sub_2", current_period_end: iso(NOW + 5 * DAY_MS) });
    seedSubscription({ id: "cancelling", purchase_id: "p3", owner_user_id: PARTNER, invite_code: "nnnnnnnnnn", stripe_subscription_id: "sub_3", plan: "yearly", cancel_at_period_end: true, current_period_end: iso(NOW + 5 * DAY_MS) });
    const send = vi.fn(async () => false);
    expect(await remindYearlyRenewals(fake.db, NOW, send)).toEqual({ due: 1, sent: 0 });
    expect(row().renewal_reminded_for).toBeNull();
    send.mockResolvedValue(true);
    expect(await remindYearlyRenewals(fake.db, NOW, send)).toEqual({ due: 1, sent: 1 });
    expect(await remindYearlyRenewals(fake.db, NOW + DAY_MS, send)).toEqual({ due: 0, sent: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    // The next year's renewal is reminded again.
    fake.tables.couple_passes[0].current_period_end = iso(NOW + 365 * DAY_MS);
    expect(await remindYearlyRenewals(fake.db, NOW + 360 * DAY_MS, send)).toEqual({ due: 1, sent: 1 });
  });

  it("runs with the cron secret only, and learns of a renewal cancelled without the webhook instead of reminding it", async () => {
    const cron = await import("@/app/api/cron/passes/route");
    routes.db = fake.db;
    routes.stripe = stripe.client;
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    notify.sendMembershipRenewalReminder.mockClear();
    try {
      const get = (authorization?: string) => cron.GET(new NextRequest("https://ethos.test/api/cron/passes", { headers: authorization ? { authorization } : {} }));
      expect((await get()).status).toBe(401);
      expect((await get("Bearer nope")).status).toBe(401);
      seedSubscription({ plan: "yearly", current_period_end: iso(NOW + 5 * DAY_MS), ends_at: iso(NOW + 12 * DAY_MS) });
      // Cancelled in Stripe's portal; the webhook never came.
      stripe.addSubscription({ id: "sub_1", interval: "year", periodEnd: NOW + 5 * DAY_MS, cancelAtPeriodEnd: true, metadata: { app: "ethos" } });
      const res = await get("Bearer s3cret");
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true, yearly: { due: 1, sent: 0 } });
      expect(notify.sendMembershipRenewalReminder).not.toHaveBeenCalled();
      expect(row()).toMatchObject({ cancel_at_period_end: true, renewal_reminded_for: null, ends_at: iso(NOW + 5 * DAY_MS) });
      // Still renewing: reminded at the price it renews at.
      stripe.subscriptions.sub_1.cancel_at_period_end = false;
      fake.tables.couple_passes[0].cancel_at_period_end = false;
      await get("Bearer s3cret");
      expect(notify.sendMembershipRenewalReminder).toHaveBeenCalledWith(expect.objectContaining({ id: "m1" }), { amount: 2999, currency: "eur" });
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });

  it("reads a subscription whose period has passed from Stripe again, so a lost webhook costs nothing", async () => {
    seedSubscription({ current_period_end: iso(NOW - DAY_MS), ends_at: iso(NOW + 6 * DAY_MS) });
    stripe.addSubscription({ id: "sub_1", interval: "month", periodEnd: NOW + 29 * DAY_MS, metadata: { app: "ethos" } });
    expect(await reconcileSubscriptions(fake.db, NOW, stripeBilling(stripe.client))).toEqual({ checked: 1, failed: 0 });
    expect(row().ends_at).toBe(iso(Math.floor((NOW + 29 * DAY_MS) / 1000) * 1000 + MEMBERSHIP_GRACE_MS));
  });

  it("sends the 14-day email only for a pass: a subscription renews by itself", async () => {
    seedSubscription({ plan: "yearly", cancel_at_period_end: true, ends_at: iso(NOW + 5 * DAY_MS) });
    fake.tables.couple_passes.push({ ...new FakeDb({ couple_passes: [{ id: "pass", purchase_id: "pp", owner_user_id: OTHER, invite_code: "pppppppppp", starts_at: iso(NOW - 300 * DAY_MS), ends_at: iso(NOW + 5 * DAY_MS) }] }).rows("couple_passes")[0] });
    const send = vi.fn(async () => true);
    expect(await remindRenewals(fake.db, NOW, send)).toEqual({ due: 1, sent: 1 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: "pass" }));
  });
});

describe("refunds, disputes and withdrawals (docs/MEMBERSHIP.md 2.6)", () => {
  beforeEach(() => {
    seedSubscription({ partner_user_id: PARTNER });
    fake.tables.purchases[0].membership_id = "m1";
    fake.tables.purchases.push({ id: "renewal", user_id: OWNER, product: "membership", status: "paid", amount: 499, currency: "eur", membership_id: "m1", created_at: iso(NOW - DAY_MS) });
    fake.tables.gifts = [{ id: "g1", user_id: PARTNER, template_slug: "vinyl", data: {}, status: "live", watermark: false, password_hash: null, unlock_at: null }];
  });
  const cancel = vi.fn(async () => {});

  it("a full refund of the period it is in ends it for both, cancels the subscription and relocks gifts", async () => {
    await applySubscriptionState(fake.db, row(), snapshot(), NOW);
    await revokePurchase(fake.db, { id: "renewal", user_id: OWNER, product: "membership", membership_id: "m1" }, NOW, { mode: "refund", cancelSubscription: cancel });
    expect(row()).toMatchObject({ status: "ended", ends_at: iso(NOW), ended_notified_at: iso(NOW) });
    expect(cancel).toHaveBeenCalledWith("sub_1");
    expect(unlocks(OWNER)).toEqual([]);
    expect(unlocks(PARTNER)).toEqual([]);
    expect(fake.rows("gifts")[0].status).toBe("draft");
    expect(fake.rows("purchases").find((p) => p.id === "renewal")!.status).toBe("refunded");
  });

  it("refunding an older period changes nothing else", async () => {
    await applySubscriptionState(fake.db, row(), snapshot(), NOW);
    await revokePurchase(fake.db, { id: "p1", user_id: OWNER, product: "membership", membership_id: "m1" }, NOW, { mode: "refund", cancelSubscription: cancel });
    expect(row().status).toBe("active");
    expect(cancel).not.toHaveBeenCalled();
    expect(unlocks(PARTNER)).toEqual(["*@p1", "pack:*@p1"]);
    expect(fake.rows("purchases").find((p) => p.id === "p1")!.status).toBe("refunded");
  });

  it("a dispute on any of its payments ends it", async () => {
    await revokePurchase(fake.db, { id: "p1", user_id: OWNER, product: "membership", membership_id: "m1" }, NOW, { mode: "dispute", cancelSubscription: cancel });
    expect(row().status).toBe("ended");
    expect(cancel).toHaveBeenCalledWith("sub_1");
  });

  it("a withdrawal ends it now, keeps the purchase paid and relocks nothing: the days used were paid for", async () => {
    await applySubscriptionState(fake.db, row(), snapshot(), NOW);
    expect(await withdrawPurchase(fake.db, { id: "p1", user_id: OWNER, product: "membership", membership_id: "m1" }, NOW, { cancelSubscription: cancel })).toBe(true);
    expect(row()).toMatchObject({ status: "ended", ended_notified_at: iso(NOW) });
    expect(cancel).toHaveBeenCalledWith("sub_1");
    expect(fake.rows("purchases").find((p) => p.id === "p1")!.status).toBe("paid");
    expect(fake.rows("gifts")[0].status).toBe("live");
    expect(await withdrawPurchase(fake.db, { id: "x", user_id: OWNER, product: "everything" }, NOW)).toBe(false);
  });

  it("a withdrawal from a pass year moves the years bought after it up", async () => {
    fake = new FakeDb(
      {
        purchases: [
          { id: "y1", user_id: OWNER, product: "pass", status: "paid", amount: 2999, currency: "eur" },
          { id: "y2", user_id: OWNER, product: "pass", status: "paid", amount: 2999, currency: "eur" },
        ],
        couple_passes: [
          { id: "a", purchase_id: "y1", owner_user_id: OWNER, invite_code: "aaaaaaaaaa", starts_at: iso(NOW - 5 * DAY_MS), ends_at: iso(NOW + 360 * DAY_MS) },
          { id: "b", purchase_id: "y2", owner_user_id: OWNER, invite_code: "bbbbbbbbbb", starts_at: iso(NOW + 360 * DAY_MS), ends_at: iso(NOW + 725 * DAY_MS) },
        ],
      },
      NOW,
    );
    expect(await withdrawPurchase(fake.db, { id: "y1", user_id: OWNER, product: "pass" }, NOW)).toBe(true);
    expect(row("a")).toMatchObject({ status: "ended", ends_at: iso(NOW) });
    expect(row("b")).toMatchObject({ starts_at: iso(NOW), ends_at: iso(NOW + 365 * DAY_MS) });
    expect(unlocks(OWNER)).toEqual(["*@y2", "pack:*@y2"]);
  });
});

describe("the routes", () => {
  const post = (route: { POST: (r: NextRequest) => Promise<Response> }, body: unknown) => route.POST(new NextRequest("https://ethos.test/api/x", { method: "POST", body: JSON.stringify(body) }));

  beforeEach(() => {
    routes.user = null;
    routes.db = fake.db;
    routes.stripe = stripe.client;
  });

  it("POST /api/membership: signed in, an action from the list, and the membership as it is after", async () => {
    expect((await post(membershipRoute, { action: "cancel" })).status).toBe(401);
    routes.user = { id: OWNER };
    for (const body of [{ action: "delete_everything" }, { action: "" }, {}, null]) expect((await post(membershipRoute, body)).status).toBe(400);
    expect(await (await post(membershipRoute, { action: "cancel" })).json()).toEqual({ error: "not_member" });
    seedSubscription();
    stripe.addSubscription({ id: "sub_1", interval: "month", periodEnd: NOW + 20 * DAY_MS, metadata: { app: "ethos" } });
    const res = await post(membershipRoute, { action: "cancel", locale: "es" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toMatchObject({ ok: true, membership: { renews: false, endsAt: expect.any(String), inviteUrl: expect.stringContaining("/es/for-two/join?code=") } });
  });

  it("POST /api/for-two/join says whether it renews, and refuses somebody with their own", async () => {
    seedSubscription();
    routes.user = { id: PARTNER };
    expect(await (await post(joinRoute, { code: "abcdefghij" })).json()).toEqual({ ok: true, endsAt: null, renews: true });
    seedSubscription({ id: "theirs", purchase_id: "p9", owner_user_id: OTHER, invite_code: "kkkkkkkkkk", stripe_subscription_id: "sub_9" });
    routes.user = { id: OTHER };
    const refused = await post(joinRoute, { code: "abcdefghij" });
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: "has_own" });
  });

  it("deleting an account cancels its subscription first, and keeps the account if Stripe can't be reached", async () => {
    seedSubscription();
    seedSubscription({ id: "gone", purchase_id: "p0", invite_code: "gggggggggg", stripe_subscription_id: "sub_0", status: "ended" });
    const deleteUser = vi.fn(async () => ({ error: null }));
    const admin = { ...fake.db, auth: { admin: { deleteUser } } } as never;
    const cancel = vi.fn(async (subscriptionId: string): Promise<void> => {
      throw new Error(`stripe down: ${subscriptionId}`);
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deleteAccountData(admin, OWNER, async () => ({ errors: [] }), cancel)).toEqual({ ok: false, error: "subscription_cancel_failed" });
    expect(deleteUser).not.toHaveBeenCalled();
    cancel.mockResolvedValue(undefined);
    expect(await deleteAccountData(admin, OWNER, async () => ({ errors: [] }), cancel)).toEqual({ ok: true });
    // Only what still bills: the ended one is left alone.
    expect(cancel.mock.calls.map((c) => c[0])).toEqual(["sub_1", "sub_1"]);
    expect(deleteUser).toHaveBeenCalledWith(OWNER);
  });
});
