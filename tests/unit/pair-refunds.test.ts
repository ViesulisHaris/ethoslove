import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/commerce/db";
import { grantGifts, readyGifts, spendGift } from "@/lib/commerce/gift-credits";
import { revokePurchase } from "@/lib/commerce/revoke";
import { grantForever } from "@/lib/commerce/unlocks";
import { handleStripeEvent, type StripeEventDeps } from "@/lib/stripe/events";
import { FakeDb } from "./helpers/fake-db";

/**
 * Money going back on two more gifts (PLAN-pair.md step 8): a full refund or a dispute takes every
 * gift of the purchase and every template a used one unlocked (relocking what went out with it, as for
 * any refunded unlock); half the money back takes one unused gift; a won dispute brings it all back.
 */
const NOW = Date.parse("2026-11-24T12:00:00.000Z");
const PAIR = "pair-1";

const seed = () =>
  new FakeDb(
    {
      purchases: [
        { id: "s1", user_id: "u1", product: "single", status: "paid", amount: 999, currency: "eur", template_slugs: ["vinyl"], kind: null, membership_id: null, stripe_payment_intent_id: "pi_s" },
        { id: PAIR, user_id: "u1", product: "pair", status: "paid", amount: 500, currency: "eur", template_slugs: [], kind: "pair", membership_id: null, stripe_payment_intent_id: "pi_p" },
      ],
      gifts: [
        { id: "g-vinyl", user_id: "u1", template_slug: "vinyl", status: "live", watermark: false, password_hash: null, unlock_at: null, published_at: "2026-11-20T05:00:00.000Z", data: { photos: [] } },
        { id: "g-bouquet", user_id: "u1", template_slug: "bouquet", status: "live", watermark: false, password_hash: null, unlock_at: null, published_at: "2026-11-24T05:00:00.000Z", data: { photos: [] } },
      ],
    },
    NOW,
  );

async function bought(fake: FakeDb, use: string[] = []) {
  await grantForever(fake.db, "u1", ["vinyl"], "s1");
  await grantGifts(fake.db, "u1", PAIR, 2);
  for (const slug of use) expect(await spendGift(fake.db, "u1", slug)).toBe("spent");
}

const deps = (db: Db, charge: { amount_refunded: number } = { amount_refunded: 0 }): StripeEventDeps => ({
  db,
  stripe: { charges: { retrieve: vi.fn(async () => charge) }, refunds: { list: vi.fn(async () => ({ data: [{ reason: "requested_by_customer" }] })) } } as unknown as Stripe,
  now: NOW,
  fulfil: vi.fn(),
  recover: vi.fn(),
  send: { ended: vi.fn(), paymentProblem: vi.fn() } as unknown as StripeEventDeps["send"],
});
const event = (type: string, object: Record<string, unknown>) => ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;
const refund = (amountRefunded: number) => ({ id: "ch_p", object: "charge", payment_intent: "pi_p", amount: 500, amount_refunded: amountRefunded, refunded: amountRefunded >= 500 });
const slugs = (fake: FakeDb) => fake.rows("template_unlocks").map((r) => r.template_slug).sort();
const status = (fake: FakeDb, id: string) => fake.rows("gifts").find((g) => g.id === id)?.status;

describe("refunds of two more gifts", () => {
  it("in full, with none used: both gifts go, and the single bought before is untouched", async () => {
    const fake = seed();
    await bought(fake);
    await handleStripeEvent(event("charge.refunded", refund(500)), deps(fake.db));
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.status).toBe("refunded");
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toEqual(["vinyl"]);
    expect(status(fake, "g-vinyl")).toBe("live");
  });

  it("in full, with one used: its template goes and the gift made with it is relocked, as for any refunded unlock", async () => {
    const fake = seed();
    await bought(fake, ["bouquet"]);
    expect(slugs(fake)).toEqual(["bouquet", "vinyl"]);
    await revokePurchase(fake.db, { id: PAIR, user_id: "u1", product: "pair" }, NOW);
    expect(slugs(fake)).toEqual(["vinyl"]);
    expect(status(fake, "g-bouquet")).toBe("draft");
    expect(status(fake, "g-vinyl")).toBe("live");
    expect(fake.rows("gift_credits").every((r) => r.revoked_at)).toBe(true);
  });

  it("by half: one unused gift goes, and nothing else; the same refund's event again takes no more", async () => {
    const fake = seed();
    await bought(fake, ["bouquet"]);
    await handleStripeEvent(event("charge.refunded", refund(250)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toEqual(["bouquet", "vinyl"]);
    expect(status(fake, "g-bouquet")).toBe("live");
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.status).toBe("paid");
    await handleStripeEvent(event("charge.refunded", refund(250)), deps(fake.db));
    expect(fake.rows("gift_credits").filter((r) => r.revoked_at)).toHaveLength(1);
  });

  it("by less than half: a goodwill gesture, nothing changes", async () => {
    const fake = seed();
    await bought(fake);
    await handleStripeEvent(event("charge.refunded", refund(100)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(2);
  });

  it("on a gift paid with two more: part of the two's line back takes that many unused gifts, and the gift's own unlock stays", async () => {
    const fake = seed();
    fake.tables.purchases.push({ id: "wp", user_id: "u1", product: "single", status: "paid", amount: 1499, currency: "eur", template_slugs: ["museum"], kind: "with_pair", membership_id: null, stripe_payment_intent_id: "pi_wp" });
    await grantForever(fake.db, "u1", ["museum"], "wp");
    await grantGifts(fake.db, "u1", "wp", 2);
    const partly = (amountRefunded: number) => ({ id: "ch_wp", object: "charge", payment_intent: "pi_wp", amount: 1499, currency: "eur", amount_refunded: amountRefunded, refunded: false });
    // Less than one gift's half of the line: a goodwill gesture.
    await handleStripeEvent(event("charge.refunded", partly(200)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(2);
    // €2.50: one gift.
    await handleStripeEvent(event("charge.refunded", partly(250)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    // The same event again takes no more.
    await handleStripeEvent(event("charge.refunded", partly(250)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    // The whole €5 by now: the other one too.
    await handleStripeEvent(event("charge.refunded", partly(500)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toContain("museum");
    expect(fake.rows("purchases").find((p) => p.id === "wp")?.status).toBe("paid");
  });

  it("on a gift paid with two more, all five back at once takes both, a used one stays used", async () => {
    const fake = seed();
    fake.tables.purchases.push({ id: "wp", user_id: "u1", product: "single", status: "paid", amount: 1799, currency: "usd", template_slugs: ["museum"], kind: "with_pair", membership_id: null, stripe_payment_intent_id: "pi_wp" });
    await grantGifts(fake.db, "u1", "wp", 2);
    expect(await spendGift(fake.db, "u1", "bouquet")).toBe("spent");
    await handleStripeEvent(event("charge.refunded", { id: "ch_wp", object: "charge", payment_intent: "pi_wp", amount: 1799, currency: "usd", amount_refunded: 600, refunded: false }), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(fake.rows("gift_credits").filter((r) => r.purchase_id === "wp" && r.revoked_at)).toHaveLength(1);
    expect(slugs(fake)).toContain("bouquet");
  });

  it("a dispute takes it all, and a won dispute brings back the gifts, the template and the gift made with it", async () => {
    const fake = seed();
    await bought(fake, ["bouquet"]);
    await handleStripeEvent(event("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: "pi_p", charge: "ch_p", status: "needs_response" }), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toEqual(["vinyl"]);
    expect(status(fake, "g-bouquet")).toBe("draft");

    vi.spyOn(console, "info").mockImplementation(() => {});
    await handleStripeEvent(event("charge.dispute.closed", { id: "dp_1", object: "dispute", payment_intent: "pi_p", charge: "ch_p", status: "won" }), deps(fake.db));
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.status).toBe("paid");
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    expect(slugs(fake)).toEqual(["bouquet", "vinyl"]);
    expect(fake.rows("template_unlocks").find((r) => r.template_slug === "bouquet")?.purchase_id).toBe(PAIR);
    expect(status(fake, "g-bouquet")).toBe("live");
  });
});
