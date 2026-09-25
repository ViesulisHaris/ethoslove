import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DAY_MS, iso } from "@/lib/commerce/db";
import { MEMBERSHIP_GRACE_MS, reconcileSubscriptions } from "@/lib/commerce/memberships";
import { stripeBilling } from "@/lib/stripe/subscriptions";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

/**
 * The billing routes as a client and Stripe see them (docs/MEMBERSHIP.md 2.3, 2.7, 2.9): what the
 * checkout route really sends Stripe for a membership (the shared account's rules R1–R10 on the
 * params, not on a helper), the portal's flows and refusals, and the daily job's safety nets.
 */

const state = vi.hoisted(() => ({
  db: null as unknown,
  stripe: null as unknown,
  user: null as { id: string; email?: string } | null,
  allowed: true,
  env: {} as Record<string, unknown>,
}));
const mail = vi.hoisted(() => ({
  sendMembershipEnded: vi.fn(async () => true),
  sendMembershipRenewalReminder: vi.fn(async () => true),
  sendPassRenewalReminder: vi.fn(async () => true),
  sendMembershipPaymentProblem: vi.fn(async () => true),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/email/notify", () => mail);
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => state.allowed }));
vi.mock("@/lib/env", () => ({ env: state.env, isConfigured: {} }));

const checkout = await import("@/app/api/stripe/checkout/route");
const portal = await import("@/app/api/stripe/portal/route");
const cron = await import("@/app/api/cron/passes/route");

const NOW = Date.parse("2026-09-25T12:00:00.000Z");
const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const U2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FORBIDDEN = "supabase" + "_user_id";

let fake: FakeDb;
let stripe: FakeStripe;

function openDb(seed: Record<string, Record<string, unknown>[]> = {}) {
  fake = new FakeDb({ profiles: [{ id: U1, email: "u1@x.co", name: "Alex", locale: "en" }, { id: U2, email: "u2@x.co", name: "Sam", locale: "es" }], ...seed }, NOW);
  state.db = fake.db;
}

/** A membership row as fulfilment or the App Store leaves it. */
const membership = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  purchase_id: "p1",
  owner_user_id: U1,
  invite_code: "abcdefghij",
  provider: "stripe_subscription",
  plan: "monthly",
  status: "active",
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
  starts_at: iso(NOW - 10 * DAY_MS),
  current_period_end: iso(NOW + 20 * DAY_MS),
  ends_at: iso(NOW + 20 * DAY_MS + MEMBERSHIP_GRACE_MS),
  created_at: iso(NOW - 10 * DAY_MS),
  ...over,
});

/** Every key anywhere in a params object, nested. */
function keysOf(value: unknown, into: string[] = []): string[] {
  if (value && typeof value === "object")
    for (const [key, inner] of Object.entries(value)) {
      into.push(key);
      keysOf(inner, into);
    }
  return into;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  // The routes read the clock themselves.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  stripe = new FakeStripe(() => NOW);
  state.stripe = stripe.client;
  state.user = null;
  state.allowed = true;
  for (const key of Object.keys(state.env)) delete state.env[key];
  openDb();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/stripe/checkout: a membership is a subscription under the shared account's rules", () => {
  const post = (body: unknown) => checkout.POST(new NextRequest("https://ethos.test/api/stripe/checkout", { method: "POST", body: JSON.stringify(body) }));
  const sent = () => stripe.calls.filter((c) => c.method === "checkout.sessions.create").map((c) => c.args[0] as Record<string, unknown> & { metadata: Record<string, string> });

  beforeEach(() => {
    vi.stubEnv("STRIPE_SUBSCRIPTIONS_ENABLED", "true");
  });

  it("signed in: a pending membership purchase, and a subscription session with R1–R10 in the params Stripe gets", async () => {
    state.user = { id: U1, email: "u1@x.co" };
    const res = await post({ product: "membership", plan: "monthly", currency: "eur", locale: "en", returnTo: "/account" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/c/cs_test_1" });
    const purchase = fake.rows("purchases")[0];
    expect(purchase).toMatchObject({ user_id: U1, product: "membership", kind: "membership", amount: 499, currency: "eur", status: "pending", stripe_session_id: "cs_test_1" });

    const [params] = sent();
    expect(params.mode).toBe("subscription");
    // R2: the purchase id travels in metadata only.
    expect(params).not.toHaveProperty("client_reference_id");
    // R1, R3: ours, marked, and never the other business's user-id key.
    expect(params.metadata).toMatchObject({ app: "ethos", purchase_id: purchase.id, ethos_user_id: U1, guest: "0", product: "membership", plan: "monthly", kind: "membership" });
    expect(params.metadata).not.toHaveProperty("user_id");
    expect(params.subscription_data).toEqual({ metadata: { app: "ethos", purchase_id: purchase.id, ethos_user_id: U1 } });
    expect(keysOf(params)).not.toContain(FORBIDDEN);
    expect(JSON.stringify(params)).not.toContain(FORBIDDEN);
    // R9: an Ethos kind is a product name.
    expect(params.metadata.kind).not.toBe("ai_credits");
    // R6, R8: no codes, discounts or trials; an inline price, never a standing one.
    expect(params.allow_promotion_codes).toBe(false);
    for (const key of ["discounts", "trial_period_days", "trial_end", "trial_settings", "promotion_code", "coupon"]) expect(keysOf(params), key).not.toContain(key);
    const line = (params.line_items as Record<string, unknown>[])[0];
    expect(line).not.toHaveProperty("price");
    expect(line.price_data).toMatchObject({ currency: "eur", unit_amount: 499, tax_behavior: "inclusive", recurring: { interval: "month" } });
    // R7: no Ethos customer yet, so Checkout makes one from the account's email.
    expect(params.customer_email).toBe("u1@x.co");
    expect(params).not.toHaveProperty("customer");
    // R10's one-time-only parameters have no place in a subscription either.
    for (const key of ["customer_creation", "invoice_creation", "payment_intent_data", "after_expiration"]) expect(params, key).not.toHaveProperty(key);
  });

  it("puts the subscription on the buyer's own Ethos customer only when Stripe says it is theirs (R7)", async () => {
    state.user = { id: U1, email: "u1@x.co" };
    openDb({ couple_passes: [membership({ status: "ended", ends_at: iso(NOW - 30 * DAY_MS), current_period_end: iso(NOW - 30 * DAY_MS), starts_at: iso(NOW - 60 * DAY_MS) })] });
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "ethos", ethos_user_id: U1 } };
    expect((await post({ product: "membership", plan: "yearly", currency: "eur" })).status).toBe(200);
    expect(sent()[0]).toMatchObject({ customer: "cus_1", line_items: [{ price_data: { unit_amount: 2999, recurring: { interval: "year" } } }] });
    expect(sent()[0]).not.toHaveProperty("customer_email");

    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "secuora" } };
    expect((await post({ product: "membership", plan: "yearly", currency: "eur" })).status).toBe(200);
    expect(sent()[1]).not.toHaveProperty("customer");
    expect(sent()[1].customer_email).toBe("u1@x.co");
    // Nothing is ever written to a customer at checkout.
    expect(stripe.writes().map((c) => c.method)).toEqual(["checkout.sessions.create", "checkout.sessions.create"]);
  });

  it("a guest: no purchase row yet, no customer, no user id, and still no client_reference_id", async () => {
    expect((await post({ product: "membership", plan: "yearly", currency: "eur", locale: "es" })).status).toBe(200);
    expect(fake.rows("purchases")).toEqual([]);
    const [params] = sent();
    expect(params).toMatchObject({ mode: "subscription", locale: "es", metadata: { app: "ethos", ethos_user_id: "", guest: "1", plan: "yearly" } });
    expect(params.metadata.purchase_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(params).not.toHaveProperty("client_reference_id");
    expect(params.customer_email).toBeUndefined();
    expect(params).not.toHaveProperty("customer");
    expect(keysOf(params)).not.toContain(FORBIDDEN);
  });

  it("never sells a second one, nor the monthly plan or the old pass while the switch says otherwise", async () => {
    state.user = { id: U1, email: "u1@x.co" };
    openDb({ couple_passes: [membership()] });
    const member = await post({ product: "membership", plan: "yearly", currency: "eur" });
    expect(member.status).toBe(409);
    expect(await member.json()).toEqual({ error: "already_member" });

    openDb({ couple_passes: [membership({ status: "past_due", ends_at: iso(NOW - DAY_MS), current_period_end: iso(NOW - 8 * DAY_MS) })] });
    const owing = await post({ product: "membership", plan: "monthly", currency: "eur" });
    expect(owing.status).toBe(409);
    expect(await owing.json()).toEqual({ error: "payment_issue" });

    openDb();
    const pass = await post({ product: "pass", currency: "eur" });
    expect(pass.status).toBe(400);
    expect(await pass.json()).toEqual({ error: "not_on_sale" });

    vi.stubEnv("STRIPE_SUBSCRIPTIONS_ENABLED", "false");
    const monthly = await post({ product: "membership", plan: "monthly", currency: "eur" });
    expect(monthly.status).toBe(400);
    expect(await monthly.json()).toEqual({ error: "not_on_sale" });
    expect(sent()).toEqual([]);
  });

  it("while subscriptions are off, the yearly plan is the one-time pass: marked, and never with a customer (R3, R10)", async () => {
    vi.stubEnv("STRIPE_SUBSCRIPTIONS_ENABLED", "false");
    state.user = { id: U1, email: "u1@x.co" };
    expect((await post({ product: "membership", plan: "yearly", currency: "eur" })).status).toBe(200);
    expect(fake.rows("purchases")[0]).toMatchObject({ product: "pass", kind: "pass", amount: 2999 });
    const [params] = sent();
    expect(params).toMatchObject({ mode: "payment", metadata: { app: "ethos", product: "pass", kind: "pass", user_id: U1 } });
    for (const key of ["customer", "customer_creation", "invoice_creation", "subscription_data"]) expect(params, key).not.toHaveProperty(key);
    expect(keysOf(params)).not.toContain(FORBIDDEN);
  });
});

describe("POST /api/stripe/portal: the owner's Stripe billing, on Ethos's configuration", () => {
  const post = (body: unknown) => portal.POST(new NextRequest("https://ethos.test/api/stripe/portal", { method: "POST", body: JSON.stringify(body) }));
  const created = () => stripe.calls.filter((c) => c.method === "billingPortal.sessions.create").map((c) => c.args[0] as Record<string, unknown>);

  beforeEach(() => {
    state.env.stripePortalConfiguration = "bpc_ethos";
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "ethos", ethos_user_id: U1 } };
  });

  it("opens straight on cancelling, and comes back to the account page's section afterwards", async () => {
    state.user = { id: U1 };
    openDb({ couple_passes: [membership()] });
    const res = await post({ flow: "cancel", locale: "es" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://billing.stripe.test/p/session_1" });
    const [params] = created();
    const back = params.return_url as string;
    expect(back).toMatch(/\/es\/account#for-two$/);
    expect(params).toEqual({
      customer: "cus_1",
      configuration: "bpc_ethos",
      locale: "es",
      return_url: back,
      flow_data: { type: "subscription_cancel", subscription_cancel: { subscription: "sub_1" }, after_completion: { type: "redirect", redirect: { return_url: back } } },
    });
    // The whole portal (invoices, card), with no flow.
    expect((await post({})).status).toBe(200);
    expect(created()[1]).not.toHaveProperty("flow_data");
  });

  it("won't open a cancel flow for one already cancelling or over, but an ended one still shows its invoices", async () => {
    state.user = { id: U1 };
    openDb({ couple_passes: [membership({ cancel_at_period_end: true })] });
    const cancelling = await post({ flow: "cancel" });
    expect(cancelling.status).toBe(409);
    expect(await cancelling.json()).toEqual({ error: "not_available", reason: "cancelling" });
    openDb({ couple_passes: [membership({ status: "ended", ends_at: iso(NOW - DAY_MS) })] });
    expect((await post({ flow: "cancel" })).status).toBe(409);
    expect((await post({ flow: "manage" })).status).toBe(200);
    expect(created()).toHaveLength(1);
  });

  it("answers who can't use it, and why, before asking Stripe anything", async () => {
    const answer = async (body: unknown) => {
      const res = await post(body);
      return { status: res.status, body: await res.json() };
    };
    expect(await answer({})).toEqual({ status: 401, body: { error: "unauthenticated" } });
    state.user = { id: U2 };
    expect(await answer({})).toEqual({ status: 404, body: { error: "not_member" } });
    expect(await answer({ flow: "delete_everything" })).toEqual({ status: 400, body: { error: "invalid_input" } });
    // The partner: the owner pays and manages.
    openDb({ couple_passes: [membership({ partner_user_id: U2 })] });
    expect(await answer({})).toEqual({ status: 403, body: { error: "not_owner" } });
    // A pass, or the App Store, has nothing for Stripe's portal to manage.
    openDb({ couple_passes: [membership({ owner_user_id: U2, provider: "stripe_pass", stripe_customer_id: null, stripe_subscription_id: null })] });
    expect(await answer({})).toEqual({ status: 409, body: { error: "not_available", reason: "pass" } });
    openDb({ couple_passes: [membership({ owner_user_id: U2, provider: "app_store", stripe_customer_id: null, stripe_subscription_id: null, store_original_transaction_id: "otx_1" })] });
    expect(await answer({})).toEqual({ status: 409, body: { error: "not_available", reason: "app_store" } });
    state.allowed = false;
    expect(await answer({})).toEqual({ status: 429, body: { error: "rate_limited" } });
    state.allowed = true;
    state.db = null;
    expect(await answer({})).toEqual({ status: 503, body: { error: "not_configured" } });
    expect(stripe.calls).toEqual([]);
  });

  it("502 when Stripe fails, and takes over an untagged customer only when it holds this very subscription", async () => {
    state.user = { id: U1 };
    openDb({ couple_passes: [membership()] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    stripe.failing.add("billingPortal.sessions.create");
    const failed = await post({ flow: "update_card" });
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: "stripe_failed" });

    // Checkout made the customer; tagging it at fulfilment didn't stick.
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: {} };
    stripe.addSubscription({ id: "sub_1", customer: "cus_1", metadata: { app: "ethos", purchase_id: "p1", ethos_user_id: U1 } });
    expect((await post({ flow: "update_card" })).status).toBe(200);
    expect(stripe.customers.cus_1.metadata).toEqual({ app: "ethos", ethos_user_id: U1 });
    // A subscription of another purchase on it: not ours to take over.
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: {} };
    stripe.subscriptions.sub_1.metadata = { app: "ethos", purchase_id: "p-other" };
    const refused = await post({});
    expect(refused.status).toBe(409);
    expect(stripe.customers.cus_1.metadata).toEqual({});
  });
});

describe("the daily job's safety nets (docs/MEMBERSHIP.md 2.9)", () => {
  it("reads a first payment still unconfirmed after a day from Stripe again: over, or through after all", async () => {
    const stuck = { status: "incomplete", starts_at: iso(NOW - 2 * DAY_MS), ends_at: iso(NOW - 2 * DAY_MS), current_period_end: iso(NOW + 28 * DAY_MS), created_at: iso(NOW - 2 * DAY_MS) };
    openDb({
      couple_passes: [
        membership({ id: "expired", purchase_id: "p-a", invite_code: "aaaaaaaaaa", stripe_subscription_id: "sub_a", ...stuck }),
        membership({ id: "paid", purchase_id: "p-b", owner_user_id: U2, invite_code: "bbbbbbbbbb", stripe_subscription_id: "sub_b", ...stuck }),
        // Only hours old: Checkout may still be confirming it.
        membership({ id: "young", purchase_id: "p-c", owner_user_id: "u3", invite_code: "cccccccccc", stripe_subscription_id: "sub_c", ...stuck, starts_at: iso(NOW - 2 * 3_600_000), ends_at: iso(NOW - 2 * 3_600_000) }),
      ],
    });
    stripe.addSubscription({ id: "sub_a", status: "incomplete_expired", interval: "month", start: NOW - 2 * DAY_MS, endedAt: NOW - DAY_MS, metadata: { app: "ethos" } });
    stripe.addSubscription({ id: "sub_b", status: "active", interval: "month", start: NOW - 2 * DAY_MS, periodEnd: NOW + 28 * DAY_MS, metadata: { app: "ethos" } });
    expect(await reconcileSubscriptions(fake.db, NOW, stripeBilling(stripe.client), { sendEnded: mail.sendMembershipEnded })).toEqual({ checked: 2, failed: 0 });
    expect(stripe.calls.map((c) => c.args[0])).toEqual(["sub_a", "sub_b"]);
    const row = (id: string) => fake.rows("couple_passes").find((r) => r.id === id)!;
    expect(row("expired")).toMatchObject({ status: "ended" });
    expect(row("paid")).toMatchObject({ status: "active", ends_at: iso(Math.floor((NOW + 28 * DAY_MS) / 1000) * 1000 + MEMBERSHIP_GRACE_MS) });
    expect(row("young")).toMatchObject({ status: "incomplete" });
    expect(fake.rows("template_unlocks").filter((r) => r.user_id === U2).map((r) => r.template_slug).sort()).toEqual(["*", "pack:*"]);
    expect(fake.rows("template_unlocks").filter((r) => r.user_id === U1)).toEqual([]);
    // One that never started says nothing.
    expect(mail.sendMembershipEnded).not.toHaveBeenCalled();
  });

  it("asks RevenueCat about App Store subscriptions whose period has passed, only with its key, and applies what it says", async () => {
    const get = () => cron.GET(new NextRequest("https://ethos.test/api/cron/passes", { headers: { authorization: "Bearer s3cret" } }));
    vi.stubEnv("CRON_SECRET", "s3cret");
    const appStore = { provider: "app_store", stripe_customer_id: null, stripe_subscription_id: null, starts_at: iso(NOW - 40 * DAY_MS), current_period_end: iso(NOW - DAY_MS), ends_at: iso(NOW - DAY_MS + MEMBERSHIP_GRACE_MS) };
    openDb({
      couple_passes: [
        membership({ id: "renewed", ...appStore, store_original_transaction_id: "otx_1" }),
        membership({ id: "lapsed", purchase_id: "p2", owner_user_id: U2, invite_code: "kkkkkkkkkk", ...appStore, store_original_transaction_id: "otx_2" }),
      ],
      template_unlocks: [
        { id: "t1", user_id: U2, template_slug: "*", purchase_id: "p2" },
        { id: "t2", user_id: U2, template_slug: "pack:*", purchase_id: "p2" },
      ],
    });
    const product = "xyz.secuora.ethos.fortwo.monthly";
    const subscriber: Record<string, unknown> = {
      [U1]: { subscriber: { subscriptions: { [product]: { store: "app_store", expires_date: iso(NOW + 29 * DAY_MS), unsubscribe_detected_at: null, billing_issues_detected_at: null, grace_period_expires_date: null, refunded_at: null } } } },
      [U2]: { subscriber: { subscriptions: { [product]: { store: "app_store", expires_date: iso(NOW - DAY_MS), unsubscribe_detected_at: iso(NOW - 10 * DAY_MS), billing_issues_detected_at: null, grace_period_expires_date: null, refunded_at: null } } } },
    };
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(subscriber[decodeURIComponent(url.split("/").at(-1)!)]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    // Without RevenueCat's key the step doesn't run at all.
    const without = await get();
    expect(await without.json()).toMatchObject({ ok: true, appStore: null });
    expect(fetchMock).not.toHaveBeenCalled();

    state.env.revenueCatSecretKey = "sk_rc_test";
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, appStore: { checked: 2, failed: 0 } });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([`https://api.revenuecat.com/v1/subscribers/${U1}`, `https://api.revenuecat.com/v1/subscribers/${U2}`]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: "Bearer sk_rc_test" } });
    const row = (id: string) => fake.rows("couple_passes").find((r) => r.id === id)!;
    expect(row("renewed")).toMatchObject({ status: "active", current_period_end: iso(NOW + 29 * DAY_MS), ends_at: iso(NOW + 29 * DAY_MS + MEMBERSHIP_GRACE_MS) });
    expect(row("lapsed")).toMatchObject({ status: "ended", ends_at: iso(NOW) });
    expect(fake.rows("template_unlocks").filter((r) => r.user_id === U2)).toEqual([]);
    expect(mail.sendMembershipEnded).toHaveBeenCalledTimes(1);
    expect(mail.sendMembershipEnded).toHaveBeenCalledWith(expect.objectContaining({ id: "lapsed" }));

    // RevenueCat unreachable: counted, nothing changed, the rest of the job still runs.
    row("renewed").current_period_end = iso(NOW - DAY_MS);
    fetchMock.mockImplementation(async () => new Response("", { status: 503 }));
    const down = await get();
    expect(await down.json()).toMatchObject({ ok: true, appStore: { checked: 1, failed: 1 }, swept: expect.any(Object) });
    expect(row("renewed")).toMatchObject({ status: "active", current_period_end: iso(NOW - DAY_MS) });
  });
});
