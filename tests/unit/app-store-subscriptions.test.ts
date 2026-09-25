import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_MS, iso } from "@/lib/commerce/db";
import { handleRevenueCatEvent } from "@/lib/commerce/app-store";
import { MEMBERSHIP_GRACE_MS, readMembership } from "@/lib/commerce/memberships";
import type { Pass } from "@/lib/commerce/passes";
import { FakeDb } from "./helpers/fake-db";

/**
 * Ethos for Two bought in the iPhone app as an auto-renewable subscription (docs/MEMBERSHIP.md 2.11):
 * RevenueCat's events drive the same membership row a Stripe subscription does. Events can arrive
 * late and out of order; these sequences are what the ordering guards are for.
 */

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARTNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MONTHLY = "xyz.secuora.ethos.fortwo.monthly";
const YEARLY = "xyz.secuora.ethos.fortwo.yearly";
const ORIGINAL = "2000000900";

let fake: FakeDb;
const sendEnded = vi.fn(async () => true);
beforeEach(() => {
  vi.clearAllMocks();
  fake = new FakeDb({ profiles: [{ id: USER, email: "u@x.co", locale: "en" }, { id: PARTNER, email: "p@x.co", locale: "en" }] }, NOW);
});

let tx = 0;
/** One RevenueCat event about the subscription, `at` ms after NOW. */
function rc(type: string, at: number, extra: Record<string, unknown> = {}) {
  return {
    type,
    id: `evt_${++tx}`,
    app_user_id: USER,
    product_id: MONTHLY,
    store: "APP_STORE",
    environment: "PRODUCTION",
    original_transaction_id: ORIGINAL,
    transaction_id: `20000009${String(tx).padStart(2, "0")}`,
    purchased_at_ms: NOW + at,
    expiration_at_ms: NOW + at + 30 * DAY_MS,
    event_timestamp_ms: NOW + at,
    price_in_purchased_currency: 4.99,
    currency: "EUR",
    ...extra,
  };
}
const handle = (event: Record<string, unknown>, now = NOW) => handleRevenueCatEvent(fake.db, event, now, { sendEnded });
const row = () => ({ ...fake.rows("couple_passes")[0] }) as Pass;
const unlocks = (userId: string) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => r.template_slug)
    .sort();

describe("App Store subscriptions", () => {
  it("purchase → renewal → unsubscribe → expiration", async () => {
    expect(await handle(rc("INITIAL_PURCHASE", 0))).toEqual({ status: "recorded" });
    const first = row();
    expect(first).toMatchObject({ provider: "app_store", plan: "monthly", status: "active", owner_user_id: USER, store_original_transaction_id: ORIGINAL, current_period_end: iso(NOW + 30 * DAY_MS), ends_at: iso(NOW + 30 * DAY_MS + MEMBERSHIP_GRACE_MS), cancel_at_period_end: false });
    expect(fake.rows("purchases")).toEqual([expect.objectContaining({ product: "membership", kind: "membership", store: "app_store", store_product_id: MONTHLY, amount: 499, currency: "eur", status: "paid", membership_id: first.id })]);
    expect(unlocks(USER)).toEqual(["*", "pack:*"]);
    expect((await readMembership(fake.db, USER, { locale: "en", now: NOW }))?.manage).toBe("app_store");

    // The same event twice is one purchase.
    const renewal = rc("RENEWAL", 30 * DAY_MS);
    await handle(renewal, NOW + 30 * DAY_MS);
    await handle(renewal, NOW + 30 * DAY_MS);
    expect(fake.rows("purchases")).toHaveLength(2);
    expect(fake.rows("couple_passes")).toHaveLength(1);
    expect(row()).toMatchObject({ current_period_end: iso(NOW + 60 * DAY_MS), ends_at: iso(NOW + 60 * DAY_MS + MEMBERSHIP_GRACE_MS) });

    await handle(rc("CANCELLATION", 40 * DAY_MS, { cancel_reason: "UNSUBSCRIBE", expiration_at_ms: NOW + 60 * DAY_MS }), NOW + 40 * DAY_MS);
    expect(row()).toMatchObject({ cancel_at_period_end: true, status: "active", ends_at: iso(NOW + 60 * DAY_MS) });

    await handle(rc("EXPIRATION", 60 * DAY_MS, { expiration_reason: "UNSUBSCRIBE", expiration_at_ms: NOW + 60 * DAY_MS }), NOW + 60 * DAY_MS);
    expect(row()).toMatchObject({ status: "ended", ends_at: iso(NOW + 60 * DAY_MS) });
    expect(unlocks(USER)).toEqual([]);
    expect(sendEnded).toHaveBeenCalledTimes(1);
    await handle(rc("EXPIRATION", 60 * DAY_MS, { expiration_at_ms: NOW + 60 * DAY_MS }), NOW + 61 * DAY_MS);
    expect(sendEnded).toHaveBeenCalledTimes(1);
  });

  it("keeps it running through Apple's grace on a billing issue, and back to active when the renewal comes", async () => {
    await handle(rc("INITIAL_PURCHASE", 0));
    await handle(rc("BILLING_ISSUE", 30 * DAY_MS, { grace_period_expiration_at_ms: NOW + 46 * DAY_MS }), NOW + 30 * DAY_MS);
    expect(row()).toMatchObject({ status: "past_due", ends_at: iso(NOW + 46 * DAY_MS) });
    expect(unlocks(USER)).toEqual(["*", "pack:*"]);
    await handle(rc("BILLING_ISSUE", 31 * DAY_MS), NOW + 31 * DAY_MS);
    await handle(rc("RENEWAL", 32 * DAY_MS), NOW + 32 * DAY_MS);
    expect(row()).toMatchObject({ status: "active", current_period_end: iso(NOW + 62 * DAY_MS) });
  });

  it("an Apple refund of the period it is in ends it for both, and relocks their gifts", async () => {
    const purchase = rc("INITIAL_PURCHASE", 0);
    await handle(purchase);
    fake.tables.couple_passes[0].partner_user_id = PARTNER;
    await handle(rc("RENEWAL", 30 * DAY_MS, { transaction_id: "2000000950" }), NOW + 30 * DAY_MS);
    expect(unlocks(PARTNER)).toEqual(["*", "pack:*"]);
    fake.tables.gifts = [{ id: "g1", user_id: PARTNER, template_slug: "vinyl", data: {}, status: "live", watermark: false, password_hash: null, unlock_at: null }];
    expect(await handle(rc("CANCELLATION", 35 * DAY_MS, { cancel_reason: "CUSTOMER_SUPPORT", transaction_id: "2000000950" }), NOW + 35 * DAY_MS)).toEqual({ status: "revoked" });
    expect(row()).toMatchObject({ status: "ended", ends_at: iso(NOW + 35 * DAY_MS) });
    expect(unlocks(USER)).toEqual([]);
    expect(unlocks(PARTNER)).toEqual([]);
    expect(fake.rows("gifts")[0].status).toBe("draft");
    expect(fake.rows("purchases").find((p) => p.store_transaction_id === "2000000950")!.status).toBe("refunded");
    // Nobody who asked for their money back is told to come back.
    await handle(rc("EXPIRATION", 36 * DAY_MS, { expiration_at_ms: NOW + 60 * DAY_MS }), NOW + 36 * DAY_MS);
    expect(sendEnded).not.toHaveBeenCalled();
  });

  it("ignores a late EXPIRATION about the period before a renewal", async () => {
    await handle(rc("INITIAL_PURCHASE", 0));
    await handle(rc("RENEWAL", 30 * DAY_MS), NOW + 30 * DAY_MS);
    // The first period's expiration, delivered after the renewal.
    expect(await handle(rc("EXPIRATION", 30 * DAY_MS, { expiration_at_ms: NOW + 30 * DAY_MS, event_timestamp_ms: NOW + 30 * DAY_MS - 1 }), NOW + 31 * DAY_MS)).toEqual({ status: "ignored" });
    expect(row()).toMatchObject({ status: "active", current_period_end: iso(NOW + 60 * DAY_MS) });
    expect(unlocks(USER)).toEqual(["*", "pack:*"]);
  });

  it("ignores an older CANCELLATION that arrives after the UNCANCELLATION that followed it", async () => {
    await handle(rc("INITIAL_PURCHASE", 0));
    const cancelled = rc("CANCELLATION", 5 * DAY_MS, { cancel_reason: "UNSUBSCRIBE" });
    await handle(rc("UNCANCELLATION", 6 * DAY_MS), NOW + 6 * DAY_MS);
    expect(await handle(cancelled, NOW + 7 * DAY_MS)).toEqual({ status: "ignored" });
    expect(row()).toMatchObject({ cancel_at_period_end: false, ends_at: iso(NOW + 30 * DAY_MS + MEMBERSHIP_GRACE_MS) });
  });

  it("changes plan at the renewal Apple applies it at, not before", async () => {
    await handle(rc("INITIAL_PURCHASE", 0));
    expect(await handle(rc("PRODUCT_CHANGE", DAY_MS, { new_product_id: YEARLY }), NOW + DAY_MS)).toEqual({ status: "ignored" });
    expect(row().plan).toBe("monthly");
    await handle(rc("RENEWAL", 30 * DAY_MS, { product_id: YEARLY, expiration_at_ms: NOW + 395 * DAY_MS, price_in_purchased_currency: 29.99 }), NOW + 30 * DAY_MS);
    expect(row()).toMatchObject({ plan: "yearly", current_period_end: iso(NOW + 395 * DAY_MS) });
    expect(fake.rows("purchases").map((p) => [p.store_product_id, p.amount])).toEqual([
      [MONTHLY, 499],
      [YEARLY, 2999],
    ]);
  });

  it("ignores anonymous and deleted accounts, and other stores", async () => {
    expect(await handle(rc("INITIAL_PURCHASE", 0, { app_user_id: "$RCAnonymousID:abc" }))).toEqual({ status: "ignored" });
    expect(await handle(rc("INITIAL_PURCHASE", 0, { app_user_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }))).toEqual({ status: "ignored" });
    expect(await handle(rc("INITIAL_PURCHASE", 0, { store: "PLAY_STORE" }))).toEqual({ status: "ignored" });
    expect(fake.rows("couple_passes")).toEqual([]);
    expect(fake.rows("purchases")).toEqual([]);
  });

  it("leaves the one-time products, the old year included, to the code they always went through", async () => {
    const year = { type: "NON_RENEWING_PURCHASE", app_user_id: USER, product_id: "xyz.secuora.ethos.fortwo", store: "APP_STORE", transaction_id: "2000000777", purchased_at_ms: NOW, event_timestamp_ms: NOW };
    expect(await handle(year)).toEqual({ status: "recorded" });
    expect(row()).toMatchObject({ provider: "app_store_pass", plan: "yearly", ends_at: iso(NOW + 365 * DAY_MS) });
  });
});
