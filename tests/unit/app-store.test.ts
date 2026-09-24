import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_MS, iso } from "@/lib/commerce/db";
import { APP_STORE_PRODUCTS, appStoreProduct } from "@/lib/commerce/app-store-products";
import {
  applyCredit,
  eventPrice,
  eventTransaction,
  handleRevenueCatEvent,
  ingestAppStore,
  parseSubscriber,
  pullAppStore,
  revokeAppStoreTransaction,
  unusedCredits,
  type StoreTransaction,
} from "@/lib/commerce/app-store";
import { readEntitlements } from "@/lib/commerce/entitlements";
import { grantForever } from "@/lib/commerce/unlocks";
import { PRODUCTS } from "@/lib/pricing/products";
import { FakeDb } from "./helpers/fake-db";

// For the webhook route at the end: its secret, and the fake database as the service-role client.
const state = vi.hoisted(() => ({ auth: "Bearer whsec_test_value" as string | undefined, db: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    get revenueCatWebhookAuth() {
      return state.auth;
    },
    revenueCatSecretKey: undefined,
  },
  isConfigured: {},
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));

const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const tx = (productId: string, transactionId: string, over: Partial<StoreTransaction> = {}): StoreTransaction => ({ productId, transactionId, purchasedAt: iso(NOW - 60_000), sandbox: false, ...over });
const P = {
  template: "xyz.secuora.ethos.template",
  special: "xyz.secuora.ethos.special",
  everything: "xyz.secuora.ethos.everything",
  forTwo: "xyz.secuora.ethos.fortwo",
  deep: "xyz.secuora.ethos.pack.deep",
};

let fake: FakeDb;
const useDb = (seed: Record<string, Record<string, unknown>[]> = {}) => {
  fake = new FakeDb({ profiles: [{ id: USER, email: "alex@example.com" }, { id: OTHER, email: "sam@example.com" }], ...seed }, NOW);
  return fake.db;
};
const unlocks = (userId = USER) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => r.template_slug)
    .sort();
const appRows = () => fake.rows("purchases").filter((r) => r.store === "app_store");

beforeEach(() => {
  useDb();
});

describe("what the App Store sells", () => {
  it("is each a website product, with credits for the two a template is picked for", () => {
    expect(APP_STORE_PRODUCTS.map((p) => [p.id, p.product, p.credit ?? false, p.tier ?? null, p.packId ?? null])).toEqual([
      [P.template, "single", true, "premium", null],
      [P.special, "extras", true, "free", null],
      [P.everything, "everything", false, null, null],
      [P.forTwo, "pass", false, null, null],
      [P.deep, "pack", false, null, "deep"],
      ["xyz.secuora.ethos.pack.distance", "pack", false, null, "distance"],
      ["xyz.secuora.ethos.pack.spicy", "pack", false, null, "spicy"],
    ]);
    expect(appStoreProduct(undefined)).toBeNull();
  });

  it("reads RevenueCat's list of one-time purchases, and only ours from the App Store", () => {
    const json = {
      subscriber: {
        non_subscriptions: {
          [P.everything]: [{ id: "a", is_sandbox: true, purchase_date: "2026-09-20T10:00:00Z", store: "app_store", store_transaction_id: "2000000111" }],
          [P.forTwo]: [{ id: "b", is_sandbox: false, purchase_date: "2026-09-21T10:00:00Z", store: "app_store", store_transaction_id: "2000000222" }],
          [P.template]: [
            { id: "c", purchase_date: "2026-09-22T10:00:00Z", store: "play_store", store_transaction_id: "GPA.1" },
            { id: "d", purchase_date: "not a date", store: "app_store", store_transaction_id: "2000000333" },
            { id: "e", purchase_date: "2026-09-22T10:00:00Z", store: "app_store", store_transaction_id: "x/../y" },
          ],
          "com.someone.else": [{ purchase_date: "2026-09-22T10:00:00Z", store: "app_store", store_transaction_id: "9" }],
        },
      },
    };
    expect(parseSubscriber(json)).toEqual([
      { productId: P.everything, transactionId: "2000000111", purchasedAt: "2026-09-20T10:00:00.000Z", sandbox: true },
      { productId: P.forTwo, transactionId: "2000000222", purchasedAt: "2026-09-21T10:00:00.000Z", sandbox: false },
    ]);
    expect(parseSubscriber(null)).toEqual([]);
    expect(parseSubscriber({ subscriber: { non_subscriptions: [] } })).toEqual([]);
  });
});

describe("recording App Store purchases", () => {
  it("records a purchase once and grants it once, however many times it is heard", async () => {
    const db = fake.db;
    await ingestAppStore(db, USER, [tx(P.everything, "1001", { sandbox: true })], NOW);
    await ingestAppStore(db, USER, [tx(P.everything, "1001", { sandbox: true })], NOW);
    expect(appRows()).toHaveLength(1);
    expect(appRows()[0]).toMatchObject({
      user_id: USER,
      product: "everything",
      template_slugs: [],
      amount: PRODUCTS.everything.amounts.eur,
      currency: "eur",
      status: "paid",
      kind: "everything",
      store: "app_store",
      store_product_id: P.everything,
      store_transaction_id: "1001",
      store_environment: "sandbox",
    });
    expect(unlocks()).toEqual(["*"]);
    expect(fake.rows("template_unlocks")).toHaveLength(1);
  });

  it("grants a pack as a Stripe pack purchase does", async () => {
    await ingestAppStore(fake.db, USER, [tx(P.deep, "1002")], NOW);
    expect(appRows()[0].template_slugs).toEqual(["pack:deep"]);
    expect(unlocks()).toEqual(["pack:deep"]);
  });

  it("starts a For Two year from the purchase, with every template and pack while it runs", async () => {
    await ingestAppStore(fake.db, USER, [tx(P.forTwo, "1003", { purchasedAt: iso(NOW - 2 * DAY_MS) })], NOW);
    await ingestAppStore(fake.db, USER, [tx(P.forTwo, "1003", { purchasedAt: iso(NOW - 2 * DAY_MS) })], NOW);
    const passes = fake.rows("couple_passes");
    expect(passes).toHaveLength(1);
    expect(passes[0]).toMatchObject({ owner_user_id: USER, starts_at: iso(NOW - 2 * DAY_MS), ends_at: iso(NOW - 2 * DAY_MS + 365 * DAY_MS) });
    expect(unlocks()).toEqual(["*", "pack:*"]);
    const ent = await readEntitlements(fake.db, USER, { locale: "en", currency: "eur", now: NOW });
    expect(ent).toMatchObject({ signedIn: true, templates: ["*"], pass: { isOwner: true, partnerJoined: false } });
  });

  it("hands over nothing for a year that ran out before we heard of it", async () => {
    await ingestAppStore(fake.db, USER, [tx(P.forTwo, "1004", { purchasedAt: iso(NOW - 400 * DAY_MS) })], NOW);
    expect(fake.rows("couple_passes")).toHaveLength(1);
    expect(unlocks()).toEqual([]);
  });

  it("keeps a template credit unspent until it is applied", async () => {
    await ingestAppStore(fake.db, USER, [tx(P.template, "1005"), tx(P.special, "1006")], NOW);
    expect(unlocks()).toEqual([]);
    const credits = await unusedCredits(fake.db, USER);
    expect(credits.map((c) => [c.product, c.storeProductId, c.transactionId])).toEqual([
      ["single", P.template, "1005"],
      ["extras", P.special, "1006"],
    ]);
    expect(credits[0].purchaseId).toBe(appRows()[0].id);
  });

  it("never moves a purchase to another account", async () => {
    await ingestAppStore(fake.db, OTHER, [tx(P.everything, "1007")], NOW);
    await ingestAppStore(fake.db, USER, [tx(P.everything, "1007")], NOW);
    expect(appRows()).toHaveLength(1);
    expect(appRows()[0].user_id).toBe(OTHER);
    expect(unlocks(USER)).toEqual([]);
    expect(unlocks(OTHER)).toEqual(["*"]);
  });

  it("says when the database refuses, without granting", async () => {
    fake.failNext("purchases", "upsert", "db down");
    expect(await ingestAppStore(fake.db, USER, [tx(P.everything, "1008")], NOW)).toEqual({ errors: ["db down"] });
    expect(unlocks()).toEqual([]);
  });

  it("asks RevenueCat with the secret key, and says when it can't", async () => {
    const doFetch = vi.fn(async () => new Response(JSON.stringify({ subscriber: { non_subscriptions: { [P.deep]: [{ purchase_date: "2026-09-20T10:00:00Z", store: "app_store", store_transaction_id: "1009" }] } } })));
    expect(await pullAppStore(fake.db, USER, "sk_test", NOW, doFetch as unknown as typeof fetch)).toEqual({ ok: true });
    const [url, init] = doFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.revenuecat.com/v1/subscribers/${USER}`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test");
    expect(unlocks()).toEqual(["pack:deep"]);
    const down = vi.fn(async () => new Response("nope", { status: 500 }));
    expect(await pullAppStore(fake.db, USER, "sk_test", NOW, down as unknown as typeof fetch)).toEqual({ ok: false, error: "upstream" });
  });
});

describe("spending a template credit", () => {
  beforeEach(async () => {
    await ingestAppStore(fake.db, USER, [tx(P.template, "2001"), tx(P.special, "2002")], NOW);
  });

  it("unlocks one premium template for good, once", async () => {
    expect(await applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "2001" })).toEqual({ ok: true });
    expect(unlocks()).toEqual(["kawaii"]);
    expect(appRows()[0].template_slugs).toEqual(["kawaii"]);
    // The app retrying the same request gets the same answer.
    expect(await applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "2001" })).toEqual({ ok: true });
    expect(await applyCredit(fake.db, USER, { templateSlug: "vinyl", transactionId: "2001" })).toEqual({ ok: false, error: "already_applied", appliedTo: "kawaii" });
    expect(unlocks()).toEqual(["kawaii"]);
    expect((await unusedCredits(fake.db, USER)).map((c) => c.transactionId)).toEqual(["2002"]);
  });

  it("finds it by our purchase id too", async () => {
    const id = appRows()[1].id as string;
    expect(await applyCredit(fake.db, USER, { templateSlug: "the-letter", purchaseId: id })).toEqual({ ok: true });
    expect(unlocks()).toEqual(["the-letter"]);
  });

  it("refuses the wrong tier: a template credit on a free one, 'make it special' on a premium one", async () => {
    expect(await applyCredit(fake.db, USER, { templateSlug: "the-letter", transactionId: "2001" })).toEqual({ ok: false, error: "wrong_tier" });
    expect(await applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "2002" })).toEqual({ ok: false, error: "wrong_tier" });
    expect(unlocks()).toEqual([]);
  });

  it("keeps the credit when the template is already theirs for good", async () => {
    await grantForever(fake.db, USER, ["*"], "stripe-everything");
    expect(await applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "2001" })).toEqual({ ok: false, error: "already_owned" });
    expect((await unusedCredits(fake.db, USER)).map((c) => c.transactionId)).toEqual(["2001", "2002"]);
  });

  it("spends a credit once when two templates ask for it at the same moment", async () => {
    const [a, b] = await Promise.all([
      applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "2001" }),
      applyCredit(fake.db, USER, { templateSlug: "vinyl", transactionId: "2001" }),
    ]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: false, error: "already_applied", appliedTo: "kawaii" });
    expect(unlocks()).toEqual(["kawaii"]);
  });

  it("looks once more after asking RevenueCat, then says it isn't there", async () => {
    const pull = vi.fn(async () => {
      await ingestAppStore(fake.db, USER, [tx(P.template, "2003")], NOW);
    });
    expect(await applyCredit(fake.db, USER, { templateSlug: "vinyl", transactionId: "2003" }, { pull })).toEqual({ ok: true });
    expect(pull).toHaveBeenCalledTimes(1);
    const nothing = vi.fn(async () => undefined);
    expect(await applyCredit(fake.db, USER, { templateSlug: "vinyl", transactionId: "9999" }, { pull: nothing })).toEqual({ ok: false, error: "not_found" });
    expect(nothing).toHaveBeenCalledTimes(1);
  });

  it("is somebody else's credit: not found", async () => {
    expect(await applyCredit(fake.db, OTHER, { templateSlug: "kawaii", transactionId: "2001" })).toEqual({ ok: false, error: "not_found" });
  });

  it("needs a real template and a credit to spend", async () => {
    expect(await applyCredit(fake.db, USER, { templateSlug: "no-such-template", transactionId: "2001" })).toEqual({ ok: false, error: "invalid_input" });
    expect(await applyCredit(fake.db, USER, { templateSlug: "kawaii" })).toEqual({ ok: false, error: "invalid_input" });
  });
});

describe("Apple refunds", () => {
  it("take back what the purchase granted, and hearing of it again grants nothing", async () => {
    await ingestAppStore(fake.db, USER, [tx(P.everything, "3001")], NOW);
    await revokeAppStoreTransaction(fake.db, USER, tx(P.everything, "3001"), NOW);
    expect(appRows()[0].status).toBe("refunded");
    expect(unlocks()).toEqual([]);
    await ingestAppStore(fake.db, USER, [tx(P.everything, "3001")], NOW);
    expect(unlocks()).toEqual([]);
  });

  it("take back a spent credit's template", async () => {
    await ingestAppStore(fake.db, USER, [tx(P.template, "3002")], NOW);
    await applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "3002" });
    await revokeAppStoreTransaction(fake.db, USER, tx(P.template, "3002"), NOW);
    expect(unlocks()).toEqual([]);
    expect(await applyCredit(fake.db, USER, { templateSlug: "kawaii", transactionId: "3002" })).toEqual({ ok: false, error: "not_found" });
  });

  it("that arrive before the purchase leave it refunded when the purchase follows", async () => {
    await revokeAppStoreTransaction(fake.db, USER, tx(P.deep, "3003"), NOW);
    expect(appRows()[0]).toMatchObject({ status: "refunded", store_transaction_id: "3003" });
    await ingestAppStore(fake.db, USER, [tx(P.deep, "3003")], NOW);
    expect(appRows()).toHaveLength(1);
    expect(unlocks()).toEqual([]);
  });
});

describe("RevenueCat's webhook events", () => {
  const event = (over: Record<string, unknown> = {}) => ({
    id: "evt-1",
    type: "NON_RENEWING_PURCHASE",
    app_user_id: USER,
    original_app_user_id: USER,
    product_id: P.everything,
    transaction_id: "4001",
    original_transaction_id: "4001",
    environment: "PRODUCTION",
    store: "APP_STORE",
    purchased_at_ms: NOW - 5000,
    price_in_purchased_currency: 24.99,
    currency: "EUR",
    ...over,
  });

  it("record the purchase with what was paid", async () => {
    expect(await handleRevenueCatEvent(fake.db, event({ price_in_purchased_currency: 29.99, currency: "USD" }), NOW)).toEqual({ status: "recorded" });
    expect(appRows()[0]).toMatchObject({ amount: 2999, currency: "usd", store_environment: "production", created_at: iso(NOW - 5000) });
    expect(unlocks()).toEqual(["*"]);
    // The same event again (RevenueCat retries): nothing new.
    await handleRevenueCatEvent(fake.db, event(), NOW);
    expect(appRows()).toHaveLength(1);
    expect(appRows()[0]).toMatchObject({ amount: 2499, currency: "eur" });
  });

  it("keep the euro list price for a currency the site doesn't price in", () => {
    expect(eventPrice(1200, "JPY")).toBeUndefined();
    expect(eventPrice(-1, "EUR")).toBeUndefined();
    expect(eventPrice(7.49, "eur")).toEqual({ amount: 749, currency: "eur" });
    expect(eventTransaction(event({ price_in_purchased_currency: 1200, currency: "JPY" }), NOW)?.price).toBeUndefined();
  });

  it("revoke on a CANCELLATION, Apple's refund", async () => {
    await handleRevenueCatEvent(fake.db, event(), NOW);
    expect(await handleRevenueCatEvent(fake.db, event({ type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT" }), NOW)).toEqual({ status: "revoked" });
    expect(appRows()[0].status).toBe("refunded");
    expect(unlocks()).toEqual([]);
  });

  it("ignore a TEST, an anonymous buyer, a deleted account and other stores", async () => {
    expect(await handleRevenueCatEvent(fake.db, { type: "TEST", id: "t" }, NOW)).toEqual({ status: "ignored" });
    expect(await handleRevenueCatEvent(fake.db, event({ app_user_id: "$RCAnonymousID:abc" }), NOW)).toEqual({ status: "ignored" });
    expect(await handleRevenueCatEvent(fake.db, event({ app_user_id: "33333333-3333-4333-8333-333333333333" }), NOW)).toEqual({ status: "ignored" });
    expect(await handleRevenueCatEvent(fake.db, event({ store: "PLAY_STORE" }), NOW)).toEqual({ status: "ignored" });
    expect(await handleRevenueCatEvent(fake.db, event({ product_id: "com.other.product" }), NOW)).toEqual({ status: "ignored" });
    expect(fake.rows("purchases")).toEqual([]);
  });

  it("ask RevenueCat about a TRANSFER, which names no purchase", async () => {
    const pull = vi.fn(async () => ({ ok: true }));
    const transfer = { type: "TRANSFER", id: "t2", app_user_id: USER, transferred_from: ["$RCAnonymousID:x"], transferred_to: [USER] };
    expect(await handleRevenueCatEvent(fake.db, transfer, NOW, { pull })).toEqual({ status: "recorded" });
    expect(pull).toHaveBeenCalledWith(USER);
    expect(await handleRevenueCatEvent(fake.db, transfer, NOW)).toEqual({ status: "ignored" });
    const failing = vi.fn(async () => ({ ok: false }));
    expect(await handleRevenueCatEvent(fake.db, transfer, NOW, { pull: failing })).toEqual({ status: "failed", error: "upstream" });
  });

  it("fail, so RevenueCat retries, when the database does", async () => {
    fake.failNext("purchases", "upsert", "db down");
    expect(await handleRevenueCatEvent(fake.db, event(), NOW)).toEqual({ status: "failed", error: "db down" });
  });
});

describe("the webhook route", () => {
  const post = async (body: unknown, authorization?: string) => {
    const { POST } = await import("@/app/api/revenuecat/webhook/route");
    const { NextRequest } = await import("next/server");
    return POST(new NextRequest("https://tryethos.io/api/revenuecat/webhook", { method: "POST", headers: authorization ? { authorization, "content-type": "application/json" } : { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) }));
  };

  beforeEach(() => {
    state.auth = "Bearer whsec_test_value";
    state.db = fake.db;
  });

  it("answers only RevenueCat's exact Authorization value", async () => {
    const body = { api_version: "1.0", event: { type: "TEST", id: "t" } };
    expect((await post(body)).status).toBe(401);
    expect((await post(body, "Bearer whsec_test_valuE")).status).toBe(401);
    expect((await post(body, "whsec_test_value")).status).toBe(401);
    expect((await post(body, "Bearer whsec_test_value, Bearer x")).status).toBe(401);
    const ok = await post(body, "Bearer whsec_test_value");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ received: true });
  });

  it("is closed until the value is configured", async () => {
    state.auth = undefined;
    expect((await post({ event: { type: "TEST" } }, "Bearer whsec_test_value")).status).toBe(503);
  });

  it("records a purchase, and asks for a retry when it can't", async () => {
    const body = { api_version: "1.0", event: { id: "e", type: "NON_RENEWING_PURCHASE", app_user_id: USER, product_id: P.deep, transaction_id: "5001", environment: "SANDBOX", store: "APP_STORE", purchased_at_ms: NOW } };
    expect((await post(body, "Bearer whsec_test_value")).status).toBe(200);
    expect(unlocks()).toEqual(["pack:deep"]);
    fake.failNext("purchases", "upsert", "db down");
    expect((await post({ ...body, event: { ...body.event, transaction_id: "5002" } }, "Bearer whsec_test_value")).status).toBe(500);
    expect((await post("not json", "Bearer whsec_test_value")).status).toBe(400);
  });
});
