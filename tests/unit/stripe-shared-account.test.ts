import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { planCheckout, type CheckoutContext } from "@/lib/commerce/plan";
import { MEMBERSHIP_PLANS, PRODUCTS, membershipAmount } from "@/lib/pricing/products";
import { PACK_IDS } from "@/lib/games/packs";
import { listManifests } from "@/templates/manifests";
import { membershipSessionParams, sessionParams, type SessionOptions } from "@/lib/stripe/line-items";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

/**
 * The Stripe account is shared with secuora.net and domainscan, whose webhooks see every Ethos event
 * and take `supabase_user_id` (in any metadata) and a subscription session's client_reference_id as
 * their own user ids (docs/MEMBERSHIP.md 2.1). These are the rules that keep Ethos's subscriptions out
 * of their accounts, and theirs out of ours.
 */

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown, env: {} as Record<string, unknown>, user: null as { id: string; email?: string } | null }));
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
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/email/notify", () => mail);
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/env", () => ({ env: state.env, isConfigured: {} }));

const { fulfilCheckoutSession } = await import("@/lib/stripe/fulfil");
const { handleStripeEvent } = await import("@/lib/stripe/events");
const { recoverExpiredSession } = await import("@/lib/stripe/recovery");
const { ethosCustomerFor, tagCheckout, tagInvoice, normaliseSubscription } = await import("@/lib/stripe/subscriptions");
const portal = await import("@/app/api/stripe/portal/route");

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const FORBIDDEN = "supabase" + "_user_id";
const guest: CheckoutContext = { signedIn: false, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: false, subscriptions: true, membership: null };
const options: SessionOptions = { purchaseId: "11111111-1111-4111-8111-111111111111", userId: "u1", email: "u1@x.co", locale: "en", origin: "https://ethos.test", returnTo: "/account", automaticTax: true, productIds: {} };

function membershipPlan(plan: "monthly" | "yearly", currency: "eur" | "usd" | "gbp" = "eur") {
  const result = planCheckout({ product: "membership", plan, currency, templateSlugs: [] }, guest);
  if (!result.ok) throw new Error(result.error);
  return result;
}

/** Every key anywhere in a params object, nested. */
function keysOf(value: unknown, into: string[] = []): string[] {
  if (value && typeof value === "object")
    for (const [key, inner] of Object.entries(value)) {
      into.push(key);
      keysOf(inner, into);
    }
  return into;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : [];
  });
}

let fake: FakeDb;
let stripe: FakeStripe;
beforeEach(() => {
  vi.clearAllMocks();
  fake = new FakeDb({}, NOW);
  stripe = new FakeStripe(() => NOW);
  state.db = { ...fake.db, auth: { admin: { createUser: vi.fn(), getUserById: vi.fn(async () => ({ data: { user: null } })) } } };
  state.stripe = stripe.client;
  // The mocked module holds this very object: emptied, never replaced.
  for (const key of Object.keys(state.env)) delete state.env[key];
  state.user = null;
});

describe("R1: Ethos never writes the other business's user-id key", () => {
  it("appears nowhere in src/ or scripts/", () => {
    const offenders = [...sourceFiles(join(process.cwd(), "src")), ...sourceFiles(join(process.cwd(), "scripts"))].filter((file) => readFileSync(file, "utf8").includes(FORBIDDEN));
    expect(offenders).toEqual([]);
  });
});

describe("a membership's Checkout Session (R2, R3, R6, R7, R8)", () => {
  it("is a subscription with no client_reference_id, marked app: ethos on the session and the subscription", () => {
    const params = membershipSessionParams(membershipPlan("monthly"), { ...options, customerId: null });
    expect(params.mode).toBe("subscription");
    expect(params).not.toHaveProperty("client_reference_id");
    expect(params.metadata).toMatchObject({ app: "ethos", purchase_id: options.purchaseId, ethos_user_id: "u1", product: "membership", plan: "monthly", kind: "membership" });
    expect(params.subscription_data?.metadata).toEqual({ app: "ethos", purchase_id: options.purchaseId, ethos_user_id: "u1" });
    expect(params.metadata).not.toHaveProperty("user_id");
    expect(keysOf(params)).not.toContain(FORBIDDEN);
  });

  it("offers no codes, discounts or trials, and has no one-time-only parameters", () => {
    const params = membershipSessionParams(membershipPlan("yearly"), { ...options, customerId: null });
    expect(params.allow_promotion_codes).toBe(false);
    for (const key of ["discounts", "trial_period_days", "trial_end", "trial_settings", "after_expiration", "payment_intent_data", "invoice_creation", "customer_creation"]) expect(keysOf(params)).not.toContain(key);
  });

  it("charges the catalogue's amount, every month or every year, in every currency, as an inline price", () => {
    for (const plan of ["monthly", "yearly"] as const)
      for (const currency of ["eur", "usd", "gbp"] as const) {
        const line = membershipSessionParams(membershipPlan(plan, currency), { ...options, customerId: null }).line_items?.[0];
        expect(line?.price_data).toMatchObject({ currency, unit_amount: membershipAmount(plan, currency), tax_behavior: "inclusive", recurring: { interval: MEMBERSHIP_PLANS[plan].interval } });
        expect(line).not.toHaveProperty("price");
        expect(line?.price_data?.product_data).toMatchObject({ name: "Ethos for Two", metadata: { app: "ethos" } });
      }
    expect(membershipAmount("monthly", "eur")).toBe(499);
    expect(membershipAmount("yearly", "eur")).toBe(2999);
    const filed = membershipSessionParams(membershipPlan("yearly"), { ...options, locale: "es", customerId: null, productIds: { STRIPE_PRODUCT_FORTWO: "prod_fortwo" } });
    expect(filed.line_items?.[0].price_data).toEqual({ currency: "eur", unit_amount: 2999, tax_behavior: "inclusive", recurring: { interval: "year" }, product: "prod_fortwo" });
  });

  it("puts the subscription on a customer only when it is one Ethos made for this user; otherwise Checkout makes one", () => {
    const reused = membershipSessionParams(membershipPlan("yearly"), { ...options, customerId: "cus_ours" });
    expect(reused).toMatchObject({ customer: "cus_ours", customer_update: { address: "auto" } });
    expect(reused).not.toHaveProperty("customer_email");
    const fresh = membershipSessionParams(membershipPlan("yearly"), { ...options, customerId: null });
    expect(fresh.customer_email).toBe("u1@x.co");
    expect(fresh).not.toHaveProperty("customer");
  });

  it("states the price and the renewal twice before paying: in the tickbox and above the button", () => {
    const params = membershipSessionParams(membershipPlan("monthly"), { ...options, customerId: null });
    expect(params.consent_collection).toEqual({ promotions: "auto", terms_of_service: "required" });
    const text = params.custom_text as { terms_of_service_acceptance: { message: string }; submit: { message: string } };
    expect(text.terms_of_service_acceptance.message).toContain("It renews every month at €4.99 until I cancel");
    expect(text.submit.message).toBe(
      "€4.99 a month for both of you, charged today and then every month until you cancel. Cancel any time from your account: you keep Ethos for Two until the end of the month you've paid for.",
    );
  });
});

describe("R6, R8: no trial, coupon or promotion code is ever written, anywhere", () => {
  it("appears in no Stripe parameter in src/ or scripts/", () => {
    // allow_promotion_codes is how a session says "no codes"; nothing else about them may appear.
    const forbidden = /\b(trial_period_days|trial_end|trial_settings|trial_from_plan|coupon|promotion_code|discounts)\s*:/;
    const offenders = [...sourceFiles(join(process.cwd(), "src")), ...sourceFiles(join(process.cwd(), "scripts"))].filter((file) => forbidden.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("R9: an Ethos kind is a product name, never the other business's credit packs", () => {
  const CREDIT_PACKS = "ai" + "_credits";

  it("appears nowhere in src/ or scripts/", () => {
    const offenders = [...sourceFiles(join(process.cwd(), "src")), ...sourceFiles(join(process.cwd(), "scripts"))].filter((file) => readFileSync(file, "utf8").includes(CREDIT_PACKS));
    expect(offenders).toEqual([]);
  });

  it("every product's session, one-time or subscription, carries a catalogue kind", () => {
    const paid = listManifests().filter((m) => m.tier !== "free").map((m) => m.slug);
    const free = listManifests().filter((m) => m.tier === "free").map((m) => m.slug);
    const ctx: CheckoutContext = { ...guest, signedIn: true, giftCardsOnSale: true };
    // The upgrade is priced from what the buyer paid before.
    const buyer: CheckoutContext = { ...ctx, purchases: [{ product: "single", amount: 999, currency: "eur", status: "paid" }] };
    const requests: [Parameters<typeof planCheckout>[0], CheckoutContext][] = [
      [{ product: "single", templateSlugs: paid.slice(0, 1), currency: "eur" }, ctx],
      [{ product: "single", templateSlugs: paid.slice(0, 1), addEverything: true, currency: "eur" }, ctx],
      [{ product: "pick3", templateSlugs: paid.slice(0, 3), currency: "eur" }, ctx],
      [{ product: "extras", templateSlugs: free.slice(0, PRODUCTS.extras.picks), currency: "eur" }, ctx],
      [{ product: "everything", templateSlugs: [], currency: "eur" }, ctx],
      [{ product: "pack", templateSlugs: [], packId: PACK_IDS[0], currency: "eur" }, ctx],
      [{ product: "giftcard", templateSlugs: [], currency: "eur" }, ctx],
      [{ product: "upgrade", templateSlugs: [], currency: "eur" }, buyer],
      [{ product: "membership", plan: "monthly", templateSlugs: [], currency: "eur" }, ctx],
      [{ product: "membership", plan: "yearly", templateSlugs: [], currency: "eur" }, ctx],
      // Subscriptions off: the one-time pass.
      [{ product: "membership", plan: "yearly", templateSlugs: [], currency: "eur" }, { ...ctx, subscriptions: false }],
    ];
    const kinds = requests.map(([request, context]) => {
      const plan = planCheckout(request, context);
      if (!plan.ok) throw new Error(`${request.product}: ${plan.error}`);
      const params = plan.billing === "subscription" ? membershipSessionParams(plan, { ...options, customerId: null }) : sessionParams(plan, options);
      const kind = (params.metadata as Record<string, string>).kind;
      expect(JSON.stringify(params), request.product).not.toContain(CREDIT_PACKS);
      return kind;
    });
    expect(kinds).toEqual(["single", "bump", "pick3", "extras", "everything", "pack", "giftcard", "upgrade", "membership", "membership", "pass"]);
  });
});

describe("one-time sessions on the shared account (R3, R10)", () => {
  it("carry app: ethos and never a customer, customer creation or an invoice", () => {
    const plan = planCheckout({ product: "everything", currency: "eur", templateSlugs: [] }, guest);
    if (!plan.ok) throw new Error(plan.error);
    const params = sessionParams(plan, options);
    expect(params.mode).toBe("payment");
    expect(params.metadata).toMatchObject({ app: "ethos", user_id: "u1" });
    for (const key of ["customer", "customer_creation", "invoice_creation"]) expect(params).not.toHaveProperty(key);
    expect(keysOf(params)).not.toContain(FORBIDDEN);
  });

  it("sell the one-time year while subscriptions are off, the same way", () => {
    const plan = planCheckout({ product: "membership", plan: "yearly", currency: "eur", templateSlugs: [] }, { ...guest, subscriptions: false });
    if (!plan.ok) throw new Error(plan.error);
    expect(plan).toMatchObject({ product: "pass", billing: "one_time", total: 2999 });
    expect(sessionParams(plan, options)).toMatchObject({ mode: "payment", metadata: { app: "ethos", product: "pass" } });
  });
});

describe("what Ethos writes to Stripe after the fact (R3, R7)", () => {
  it("reuses a stored customer only when it is still there and says it is Ethos's and this user's", async () => {
    fake.tables.couple_passes = [{ id: "m1", owner_user_id: "u1", stripe_customer_id: "cus_1", created_at: new Date(NOW - 1000).toISOString() }];
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "ethos", ethos_user_id: "u1" } };
    expect(await ethosCustomerFor(fake.db, stripe.client, "u1")).toBe("cus_1");
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "ethos", ethos_user_id: "someone-else" } };
    expect(await ethosCustomerFor(fake.db, stripe.client, "u1")).toBeNull();
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: {} };
    expect(await ethosCustomerFor(fake.db, stripe.client, "u1")).toBeNull();
    stripe.customers.cus_1 = { id: "cus_1", deleted: true };
    expect(await ethosCustomerFor(fake.db, stripe.client, "u1")).toBeNull();
    expect(await ethosCustomerFor(fake.db, stripe.client, "nobody")).toBeNull();
  });

  it("tags the customer, a guest's subscription and the invoice with app: ethos and ethos_user_id only", async () => {
    const sub = normaliseSubscription(stripe.addSubscription({ id: "sub_1", metadata: { app: "ethos", purchase_id: "p1", ethos_user_id: "" } }) as unknown as Stripe.Subscription);
    await tagCheckout(stripe.client, { customerId: "cus_1", customerTagged: false, subscription: sub, invoiceId: "in_1", userId: "u1", purchaseId: "p1" });
    await tagInvoice(stripe.client, "in_2", { userId: "u1", purchaseId: null });
    const written = stripe.writes().map((call) => (call.args[1] as { metadata: Record<string, string> }).metadata);
    expect(written).toHaveLength(4);
    for (const metadata of written) {
      expect(metadata.app).toBe("ethos");
      expect(metadata.ethos_user_id).toBe("u1");
      expect(Object.keys(metadata)).not.toContain(FORBIDDEN);
    }
  });
});

describe("R4: the webhook leaves another business's objects alone", () => {
  const deps = () => ({
    db: fake.db,
    stripe: stripe.client,
    now: NOW,
    fulfil: fulfilCheckoutSession,
    recover: recoverExpiredSession,
    send: { ended: mail.sendMembershipEnded, paymentProblem: mail.sendMembershipPaymentProblem },
  });
  const event = (type: string, object: Record<string, unknown>) => ({ id: `evt_${type}`, type, data: { object } }) as unknown as Stripe.Event;
  const theirSubscription = { id: "sub_secuora", object: "subscription", status: "active", customer: "cus_secuora", metadata: { [FORBIDDEN]: "their-user", plan: "pro" }, items: { data: [] } };
  const theirInvoice = { id: "in_secuora", object: "invoice", customer: "cus_secuora", amount_paid: 1900, billing_reason: "subscription_cycle", metadata: {}, parent: { subscription_details: { subscription: "sub_secuora", metadata: { [FORBIDDEN]: "their-user" } } } };

  it("writes nothing, sends nothing, calls no Stripe write and answers 200", async () => {
    const foreign = [
      event("customer.subscription.updated", theirSubscription),
      event("customer.subscription.deleted", { ...theirSubscription, status: "canceled" }),
      event("invoice.paid", theirInvoice),
      event("invoice.payment_failed", { ...theirInvoice, amount_paid: 0 }),
      event("invoice.payment_action_required", { ...theirInvoice, amount_paid: 0 }),
      // An older-API invoice, with its subscription at the top level.
      event("invoice.paid", { id: "in_old", object: "invoice", subscription: "sub_secuora", amount_paid: 1900, metadata: {} }),
      event("checkout.session.completed", {
        id: "cs_secuora",
        object: "checkout.session",
        mode: "subscription",
        payment_status: "paid",
        client_reference_id: "their-user",
        customer: "cus_secuora",
        subscription: "sub_secuora",
        metadata: { [FORBIDDEN]: "their-user", plan: "pro" },
      }),
      // Their abandoned checkouts: no recovery email from us, not even a look at who it was.
      event("checkout.session.expired", { id: "cs_secuora_sub", object: "checkout.session", mode: "subscription", status: "expired", customer_details: { email: "them@x.co" }, metadata: { [FORBIDDEN]: "their-user" }, consent: { promotions: "opt_in" }, after_expiration: { recovery: { url: "https://buy.stripe.com/r/theirs" } } }),
      event("checkout.session.expired", { id: "cs_secuora_pay", object: "checkout.session", mode: "payment", status: "expired", customer_details: { email: "them@x.co" }, metadata: { kind: "credits" }, consent: { promotions: "opt_in" }, after_expiration: { recovery: { url: "https://buy.stripe.com/r/theirs" } } }),
      event("charge.refunded", { id: "ch_secuora", object: "charge", refunded: true, payment_intent: "pi_secuora" }),
      event("charge.dispute.created", { id: "dp_secuora", object: "dispute", payment_intent: "pi_secuora" }),
      event("customer.updated", { id: "cus_secuora", object: "customer", metadata: {} }),
    ];
    for (const e of foreign) expect((await handleStripeEvent(e, deps())).status, e.type).toBe(200);
    expect(fake.calls.filter((call) => call.op !== "select")).toEqual([]);
    // The only reads: whether a subscription or invoice id is one of ours, and whether a charge paid for one of our purchases.
    expect([...new Set(fake.calls.map((call) => call.table))].sort()).toEqual(["couple_passes", "purchases"]);
    expect(stripe.calls).toEqual([]);
    for (const send of Object.values(mail)) expect(send).not.toHaveBeenCalled();
  });

  it("still acts on an Ethos subscription whose own metadata says so", async () => {
    stripe.addSubscription({ id: "sub_ours", metadata: { app: "ethos", purchase_id: "p1", ethos_user_id: "u1" } });
    fake.tables.couple_passes = [{ id: "m1", purchase_id: "p1", owner_user_id: "u1", invite_code: "abcdefghij", provider: "stripe_subscription", plan: "yearly", status: "active", stripe_subscription_id: "sub_ours", starts_at: new Date(NOW - 1000).toISOString(), ends_at: new Date(NOW + 1000).toISOString(), cancel_at_period_end: false }];
    const outcome = await handleStripeEvent(event("customer.subscription.updated", { id: "sub_ours", object: "subscription", metadata: { app: "ethos" } }), deps());
    expect(outcome).toMatchObject({ status: 200, handled: "ours" });
    expect(stripe.calls.map((c) => c.method)).toEqual(["subscriptions.retrieve"]);
  });
});

describe("R5: the Customer Portal only ever opens on Ethos's own configuration", () => {
  const post = (body: unknown) => portal.POST(new NextRequest("https://ethos.test/api/stripe/portal", { method: "POST", body: JSON.stringify(body) }));

  it("refuses without STRIPE_PORTAL_CONFIGURATION, before anything is read", async () => {
    state.user = { id: "u1" };
    const res = await post({ flow: "manage" });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "portal_not_configured" });
    expect(stripe.calls).toEqual([]);
  });

  it("passes its configuration, for the owner's own Ethos customer, coming back to the account page", async () => {
    state.user = { id: "u1" };
    state.env.stripePortalConfiguration = "bpc_ethos";
    fake.tables.couple_passes = [{ id: "m1", purchase_id: "p1", owner_user_id: "u1", invite_code: "abcdefghij", provider: "stripe_subscription", plan: "monthly", status: "active", stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", starts_at: new Date(NOW - 1000).toISOString(), ends_at: new Date(NOW + 86_400_000).toISOString(), cancel_at_period_end: false, created_at: new Date(NOW - 1000).toISOString() }];
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "ethos", ethos_user_id: "u1" } };
    const res = await post({ flow: "update_card", locale: "es" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://billing.stripe.test/p/session_1" });
    const created = stripe.calls.find((c) => c.method === "billingPortal.sessions.create")!.args[0];
    expect(created).toEqual({ customer: "cus_1", configuration: "bpc_ethos", locale: "es", return_url: "http://localhost:3000/es/account#for-two", flow_data: { type: "payment_method_update" } });

    // Somebody else's customer is never opened, and never taken over.
    stripe.customers.cus_1 = { id: "cus_1", deleted: false, metadata: { app: "secuora" } };
    stripe.addSubscription({ id: "sub_1", customer: "cus_1", metadata: { app: "ethos", purchase_id: "p1" } });
    stripe.calls = [];
    const refused = await post({});
    expect(refused.status).toBe(409);
    expect(stripe.calls.map((c) => c.method)).not.toContain("billingPortal.sessions.create");
  });
});
