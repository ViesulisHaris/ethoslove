import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { DAY_MS, MissingMigrationError, iso } from "@/lib/commerce/db";
import { planCheckout } from "@/lib/commerce/plan";
import { PASS_MS } from "@/lib/commerce/passes";
import { sessionMetadata } from "@/lib/stripe/line-items";
import { COLUMNS_0014, FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

/**
 * This code deployed on the live database before migration 0014 (docs/MEMBERSHIP.md 7: "0014 before
 * deploy"). Every live path that meets its columns fails loudly, naming the migration, instead of
 * reading a missing column as "nothing there"; nothing is half-written, so what Stripe (or the cron)
 * retries once 0014 is applied comes out right. Only the entitlements every page reads keep answering,
 * from the unlock rows, which don't depend on it.
 */

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown }));
const mail = vi.hoisted(() => ({
  notifyReceipt: vi.fn(async () => undefined),
  notifyWelcome: vi.fn(async () => undefined),
  sendPassWelcome: vi.fn(async () => true),
  sendGiftCardEmail: vi.fn(async () => true),
  sendMembershipWelcome: vi.fn(async () => true),
  sendMembershipEnded: vi.fn(async () => true),
  sendMembershipPaymentProblem: vi.fn(async () => true),
  sendMembershipRenewalReminder: vi.fn(async () => true),
  sendPassRenewalReminder: vi.fn(async () => true),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/email/notify", () => mail);
vi.mock("@/lib/env", () => ({ env: {}, isConfigured: {} }));

const { fulfilCheckoutSession } = await import("@/lib/stripe/fulfil");
const { handleStripeEvent } = await import("@/lib/stripe/events");
const { membershipContextOf, readMembership } = await import("@/lib/commerce/memberships");
const { readEntitlements } = await import("@/lib/commerce/entitlements");
const { revokeAppStoreTransaction } = await import("@/lib/commerce/app-store");
const cron = await import("@/app/api/cron/passes/route");

const NOW = Date.parse("2026-09-25T12:00:00.000Z");
const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RENEWAL = "11111111-1111-4111-8111-111111111111";

/** The live database today: a pass year that runs, bought on the web, with its partner in. */
const LIVE = () => ({
  profiles: [
    { id: OWNER, email: "alex@x.co", name: "Alex", locale: "en" },
    { id: PARTNER, email: "sam@x.co", name: "Sam", locale: "es" },
  ],
  purchases: [{ id: "p-year", user_id: OWNER, product: "pass", status: "paid", amount: 2900, currency: "eur", stripe_payment_intent_id: "pi_year", created_at: iso(NOW - 100 * DAY_MS) }],
  couple_passes: [{ id: "year", purchase_id: "p-year", owner_user_id: OWNER, partner_user_id: PARTNER, invite_code: "abcdefghij", starts_at: iso(NOW - 100 * DAY_MS), ends_at: iso(NOW - 100 * DAY_MS + PASS_MS), created_at: iso(NOW - 100 * DAY_MS) }],
  template_unlocks: [
    { id: "u1", user_id: OWNER, template_slug: "*", purchase_id: "p-year" },
    { id: "u2", user_id: OWNER, template_slug: "pack:*", purchase_id: "p-year" },
    { id: "u3", user_id: PARTNER, template_slug: "*", purchase_id: "p-year" },
    { id: "u4", user_id: PARTNER, template_slug: "pack:*", purchase_id: "p-year" },
  ],
});

let fake: FakeDb;
let stripe: FakeStripe;
let logged: ReturnType<typeof vi.spyOn>;

function openDb(seed: Record<string, Record<string, unknown>[]>, migrated = false) {
  fake = new FakeDb(seed, NOW, migrated ? {} : { missingColumns: COLUMNS_0014 });
  state.db = { ...fake.db, auth: { admin: { createUser: vi.fn(), getUserById: vi.fn(async () => ({ data: { user: null } })) } } };
}

/** 0014 applied to the database as it is now: its columns, with their defaults. */
function applyMigration() {
  openDb(fake.tables, true);
}

const writes = () => fake.calls.filter((call) => call.op !== "select");
const unlocks = (userId: string) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => `${r.template_slug}@${r.purchase_id}`)
    .sort();
const namesTheMigration = () => expect(logged).toHaveBeenCalledWith(expect.stringContaining("migration 0014_membership.sql is not applied"));
const event = (type: string, object: Record<string, unknown>) => ({ id: `evt_${type}`, type, data: { object } }) as unknown as Stripe.Event;
const deps = () => ({
  db: fake.db,
  stripe: stripe.client,
  now: NOW,
  fulfil: fulfilCheckoutSession,
  recover: vi.fn(async () => false),
  send: { ended: mail.sendMembershipEnded, paymentProblem: mail.sendMembershipPaymentProblem },
});

/** A signed-in owner's Checkout Session for another year of the pass, paid. */
function passSession(): Stripe.Checkout.Session {
  const plan = planCheckout({ product: "membership", plan: "yearly", currency: "eur", templateSlugs: [] }, { signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: false, subscriptions: false, membership: null });
  if (!plan.ok) throw new Error(plan.error);
  const metadata = sessionMetadata(plan, { purchaseId: RENEWAL, userId: OWNER, email: "alex@x.co", locale: "en", origin: "https://ethos.test", returnTo: "/account", automaticTax: false, productIds: {} });
  return {
    id: "cs_renewal",
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    amount_total: 2999,
    currency: "eur",
    currency_conversion: null,
    payment_intent: "pi_renewal",
    customer_details: { email: "alex@x.co" },
    customer_email: null,
    metadata,
    client_reference_id: RENEWAL,
    consent: { terms_of_service: "accepted", promotions: null },
    created: NOW / 1000,
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  logged = vi.spyOn(console, "error").mockImplementation(() => {});
  stripe = new FakeStripe(() => NOW);
  state.stripe = stripe.client;
  // The code under test reads the real clock (the daily sweep, where a renewal starts) and the
  // database is seeded around NOW: unfrozen, these passed only while real time stayed near it.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("deployed before migration 0014", () => {
  it("a refund answers 500 naming the migration and changes nothing; Stripe's retry once it is applied takes the year back", async () => {
    openDb(LIVE());
    const refund = event("charge.refunded", { id: "ch_year", object: "charge", refunded: true, payment_intent: "pi_year" });
    const outcome = await handleStripeEvent(refund, deps());
    expect(outcome).toMatchObject({ status: 500, handled: "ours" });
    expect(outcome.error).toContain("0014_membership.sql");
    namesTheMigration();
    expect(writes()).toEqual([]);
    expect(stripe.calls).toEqual([]);
    // A chargeback likewise.
    expect(await handleStripeEvent(event("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: "pi_year" }), deps())).toMatchObject({ status: 500 });
    expect(writes()).toEqual([]);

    applyMigration();
    expect(await handleStripeEvent(refund, deps())).toMatchObject({ status: 200, handled: "ours" });
    expect(fake.rows("purchases")[0].status).toBe("refunded");
    expect(fake.rows("couple_passes")[0]).toMatchObject({ status: "ended", ends_at: iso(NOW) });
    expect(unlocks(OWNER)).toEqual([]);
    expect(unlocks(PARTNER)).toEqual([]);
  });

  it("an Apple refund of the year fails the same way before anything is written, so the retry isn't skipped as already refunded", async () => {
    openDb({ ...LIVE(), purchases: [{ id: "p-year", user_id: OWNER, product: "pass", status: "paid", amount: 2999, currency: "eur", store: "app_store", store_transaction_id: "tx_1", store_product_id: "xyz.secuora.ethos.fortwo" }] });
    await expect(revokeAppStoreTransaction(fake.db, OWNER, { transactionId: "tx_1", productId: "xyz.secuora.ethos.fortwo", purchasedAt: iso(NOW - 100 * DAY_MS), sandbox: false }, NOW)).rejects.toBeInstanceOf(MissingMigrationError);
    expect(fake.rows("purchases")[0].status).toBe("paid");
    expect(writes()).toEqual([]);
  });

  it("a year sold or renewed isn't fulfilled until it is applied: the reason names it and the webhook asks for a retry", async () => {
    openDb({ ...LIVE(), purchases: [...LIVE().purchases, { id: RENEWAL, user_id: OWNER, product: "pass", kind: "pass", status: "pending", amount: 2999, currency: "eur" }] });
    const result = await fulfilCheckoutSession(passSession());
    expect(result.ok).toBe(false);
    expect("reason" in result && result.reason).toContain("migration 0014_membership.sql is not applied");
    expect(fake.rows("couple_passes")).toHaveLength(1);
    expect(mail.sendPassWelcome).not.toHaveBeenCalled();
    expect(await handleStripeEvent(event("checkout.session.completed", passSession() as unknown as Record<string, unknown>), deps())).toMatchObject({ status: 500 });

    // The retry, once 0014 is in: the new year starts where the running one ends, not today.
    applyMigration();
    expect(await handleStripeEvent(event("checkout.session.completed", passSession() as unknown as Record<string, unknown>), deps())).toMatchObject({ status: 200 });
    const renewal = fake.rows("couple_passes").find((r) => r.purchase_id === RENEWAL);
    expect(renewal).toMatchObject({ provider: "stripe_pass", starts_at: iso(NOW - 100 * DAY_MS + PASS_MS), partner_user_id: PARTNER });
    expect(mail.sendPassWelcome).toHaveBeenCalledTimes(1);
  });

  it("a first year sold to somebody with none fails by name too, rather than with PostgREST's words alone", async () => {
    openDb({ profiles: LIVE().profiles, purchases: [{ id: RENEWAL, user_id: OWNER, product: "pass", kind: "pass", status: "pending", amount: 2999, currency: "eur" }] });
    const result = await fulfilCheckoutSession(passSession());
    expect("reason" in result && result.reason).toMatch(/^migration 0014_membership\.sql is not applied \(a pass sold or renewed writes couple_passes\.provider and plan: Could not find the '(provider|plan)' column/);
    expect(fake.rows("couple_passes")).toEqual([]);
  });

  it("checkout for a pass holder and the account page refuse by name, instead of deciding on a missing provider", async () => {
    openDb(LIVE());
    await expect(membershipContextOf(fake.db, OWNER, NOW)).rejects.toThrow(/migration 0014_membership\.sql is not applied/);
    await expect(readMembership(fake.db, OWNER, { locale: "en", now: NOW, names: fake.db })).rejects.toBeInstanceOf(MissingMigrationError);
    await expect(readMembership(fake.db, PARTNER, { locale: "es", now: NOW, names: fake.db })).rejects.toBeInstanceOf(MissingMigrationError);
    namesTheMigration();
    // Somebody with no Ethos for Two has nothing to misread.
    expect(await membershipContextOf(fake.db, "someone-else", NOW)).toBeNull();
  });

  it("the entitlements every page reads keep answering from the unlock rows, the year read as a one-time year, and say what is missing", async () => {
    openDb({ ...LIVE(), couple_passes: [...LIVE().couple_passes, { id: "next", purchase_id: "p-next", owner_user_id: OWNER, partner_user_id: PARTNER, invite_code: "kkkkkkkkkk", starts_at: iso(NOW - 100 * DAY_MS + PASS_MS), ends_at: iso(NOW - 100 * DAY_MS + 2 * PASS_MS) }] });
    const owner = await readEntitlements(fake.db, OWNER, { locale: "en", currency: "eur", now: NOW, names: fake.db });
    expect(owner).toMatchObject({ templates: ["*"], packs: expect.arrayContaining(["*"]), pass: { endsAt: iso(NOW - 100 * DAY_MS + 2 * PASS_MS), isOwner: true, partnerJoined: true }, membership: { provider: "stripe_pass", plan: "yearly", status: "active", manage: "pass", renews: false } });
    const partner = await readEntitlements(fake.db, PARTNER, { locale: "es", currency: "eur", now: NOW, names: fake.db });
    expect(partner.pass).toEqual({ endsAt: iso(NOW - 100 * DAY_MS + 2 * PASS_MS), isOwner: false, partnerJoined: true });
    namesTheMigration();
  });

  it("the daily job answers 500 naming each step that needs it, and still takes back what ended", async () => {
    openDb({
      ...LIVE(),
      // A year ending in five days (its 14-day email is due) and one that ended yesterday.
      couple_passes: [
        { ...LIVE().couple_passes[0], starts_at: iso(NOW - 360 * DAY_MS), ends_at: iso(NOW + 5 * DAY_MS) },
        { id: "over", purchase_id: "p-over", owner_user_id: "old-owner", invite_code: "oooooooooo", starts_at: iso(NOW - 366 * DAY_MS), ends_at: iso(NOW - DAY_MS) },
      ],
      template_unlocks: [...LIVE().template_unlocks, { id: "u9", user_id: "old-owner", template_slug: "*", purchase_id: "p-over" }],
    });
    vi.stubEnv("CRON_SECRET", "s3cret");
    try {
      const res = await cron.GET(new NextRequest("https://ethos.test/api/cron/passes", { headers: { authorization: "Bearer s3cret" } }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toMatchObject({ ok: false, reminders: null });
      expect(body.failed).toEqual(["reconcile", "switches", "yearly_reminders", "pass_reminders"]);
      expect(mail.sendPassRenewalReminder).not.toHaveBeenCalled();
      expect(logged).toHaveBeenCalledWith("[cron] step failed", "pass_reminders", expect.stringContaining("migration 0014_membership.sql is not applied"));
      // The sweep, which the live site relies on, still ran.
      expect(unlocks("old-owner")).toEqual([]);
      expect(body.swept).toMatchObject({ ended: 1 });

      applyMigration();
      const after = await cron.GET(new NextRequest("https://ethos.test/api/cron/passes", { headers: { authorization: "Bearer s3cret" } }));
      expect(after.status).toBe(200);
      expect(await after.json()).toMatchObject({ ok: true, reminders: { due: 1, sent: 1 } });
      expect(mail.sendPassRenewalReminder).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
