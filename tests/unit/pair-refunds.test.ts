import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/commerce/db";
import { grantGifts, readyGifts, spendGift } from "@/lib/commerce/gift-credits";
import { upgradeAmount, type PaidPurchase } from "@/lib/commerce/pricing";
import { PRODUCTS } from "@/lib/pricing/products";
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
        { id: PAIR, user_id: "u1", product: "pair", status: "paid", amount: 799, currency: "eur", template_slugs: [], kind: "pair", membership_id: null, stripe_payment_intent_id: "pi_p" },
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
const refund = (amountRefunded: number) => ({ id: "ch_p", object: "charge", payment_intent: "pi_p", amount: 799, amount_refunded: amountRefunded, refunded: amountRefunded >= 799 });
const slugs = (fake: FakeDb) => fake.rows("template_unlocks").map((r) => r.template_slug).sort();
const status = (fake: FakeDb, id: string) => fake.rows("gifts").find((g) => g.id === id)?.status;

describe("refunds of two more gifts", () => {
  it("in full, with none used: both gifts go, and the single bought before is untouched", async () => {
    const fake = seed();
    await bought(fake);
    await handleStripeEvent(event("charge.refunded", refund(799)), deps(fake.db));
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

  it("by half (400 of 799: at least half, refunded * 2 >= amount): one unused gift goes, and nothing else; the same refund's event again takes no more", async () => {
    const fake = seed();
    await bought(fake, ["bouquet"]);
    await handleStripeEvent(event("charge.refunded", refund(400)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toEqual(["bouquet", "vinyl"]);
    expect(status(fake, "g-bouquet")).toBe("live");
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.status).toBe("paid");
    await handleStripeEvent(event("charge.refunded", refund(400)), deps(fake.db));
    expect(fake.rows("gift_credits").filter((r) => r.revoked_at)).toHaveLength(1);
  });

  it("by less than half (399 of 799): a goodwill gesture, no gift goes", async () => {
    const fake = seed();
    await bought(fake);
    await handleStripeEvent(event("charge.refunded", refund(399)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(2);
  });

  it("on a gift paid with two more: part of the two's line back takes that many unused gifts, and the gift's own unlock stays", async () => {
    const fake = seed();
    const line = PRODUCTS.pair.amounts.eur;
    const total = PRODUCTS.single.amounts.eur + line;
    fake.tables.purchases.push({ id: "wp", user_id: "u1", product: "single", status: "paid", amount: total, currency: "eur", template_slugs: ["museum"], kind: "with_pair", membership_id: null, stripe_payment_intent_id: "pi_wp" });
    await grantForever(fake.db, "u1", ["museum"], "wp");
    await grantGifts(fake.db, "u1", "wp", 2);
    const partly = (amountRefunded: number) => ({ id: "ch_wp", object: "charge", payment_intent: "pi_wp", amount: total, currency: "eur", amount_refunded: amountRefunded, refunded: false });
    // Less than one gift's half of the line: a goodwill gesture.
    await handleStripeEvent(event("charge.refunded", partly(Math.ceil(line / 2) - 1)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(2);
    // Half the line: one gift.
    await handleStripeEvent(event("charge.refunded", partly(Math.ceil(line / 2))), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    // The same event again takes no more.
    await handleStripeEvent(event("charge.refunded", partly(Math.ceil(line / 2))), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    // The whole line by now: the other one too.
    await handleStripeEvent(event("charge.refunded", partly(line)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toContain("museum");
    expect(fake.rows("purchases").find((p) => p.id === "wp")?.status).toBe("paid");
    expect(fake.rows("gift_credits").filter((r) => r.purchase_id === "wp").map((r) => r.revoked_for)).toEqual(["refund", "refund"]);
  });

  it("on a gift paid with two more, the whole line back at once takes both, a used one stays used", async () => {
    const fake = seed();
    const line = PRODUCTS.pair.amounts.usd;
    const total = PRODUCTS.single.amounts.usd + line;
    fake.tables.purchases.push({ id: "wp", user_id: "u1", product: "single", status: "paid", amount: total, currency: "usd", template_slugs: ["museum"], kind: "with_pair", membership_id: null, stripe_payment_intent_id: "pi_wp" });
    await grantGifts(fake.db, "u1", "wp", 2);
    expect(await spendGift(fake.db, "u1", "bouquet")).toBe("spent");
    await handleStripeEvent(event("charge.refunded", { id: "ch_wp", object: "charge", payment_intent: "pi_wp", amount: total, currency: "usd", amount_refunded: line, refunded: false }), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(fake.rows("gift_credits").filter((r) => r.purchase_id === "wp" && r.revoked_at)).toHaveLength(1);
    expect(slugs(fake)).toContain("bouquet");
  });

  it("on a gift paid with two more that Adaptive Pricing charged in złoty: the share refunded is measured in the euros the row keeps", async () => {
    const fake = seed();
    const line = PRODUCTS.pair.amounts.eur;
    const total = PRODUCTS.single.amounts.eur + line;
    fake.tables.purchases.push({ id: "wp", user_id: "u1", product: "single", status: "paid", amount: total, currency: "eur", template_slugs: ["museum"], kind: "with_pair", membership_id: null, stripe_payment_intent_id: "pi_wp" });
    await grantGifts(fake.db, "u1", "wp", 2);
    const pln = 7800;
    const partly = (amountRefunded: number) => ({ id: "ch_wp", object: "charge", payment_intent: "pi_wp", amount: pln, currency: "pln", amount_refunded: amountRefunded, refunded: false });
    // A little under half the pair's share of the złoty: nothing.
    await handleStripeEvent(event("charge.refunded", partly(Math.floor((pln * line) / total / 2) - 20)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(2);
    // The pair's whole share: both.
    await handleStripeEvent(event("charge.refunded", partly(Math.ceil((pln * line) / total) + 1)), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
  });

  it("partly refunded: only what was kept counts towards the upgrade, and the same event again changes nothing", async () => {
    const fake = seed();
    await bought(fake);
    const quote = () => upgradeAmount("eur", fake.rows("purchases") as unknown as PaidPurchase[]);
    expect(quote()).toBe(PRODUCTS.everything.amounts.eur - 999 - 799);
    await handleStripeEvent(event("charge.refunded", refund(400)), deps(fake.db));
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.amount).toBe(399);
    expect(quote()).toBe(PRODUCTS.everything.amounts.eur - 999 - 399);
    await handleStripeEvent(event("charge.refunded", refund(400)), deps(fake.db));
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.amount).toBe(399);
    await handleStripeEvent(event("charge.refunded", refund(500)), deps(fake.db));
    expect(quote()).toBe(PRODUCTS.everything.amounts.eur - 999 - 299);
    // The single bought before keeps its full credit.
    expect(fake.rows("purchases").find((p) => p.id === "s1")?.amount).toBe(999);
  });

  it("partly refunded after Adaptive Pricing charged it in złoty: the euros kept count, never the grosz, and a repeat changes nothing", async () => {
    const fake = seed();
    await bought(fake);
    const list = vi.fn(async () => ({ data: [{ id: "cs_p", amount_total: 2170, currency: "pln", currency_conversion: { amount_total: 799, source_currency: "eur" } }] }));
    const converted = (): StripeEventDeps => {
      const d = deps(fake.db);
      (d.stripe as unknown as { checkout: unknown }).checkout = { sessions: { list } };
      return d;
    };
    const pln = (amountRefunded: number) => ({ ...refund(0), currency: "pln", amount: 2170, amount_refunded: amountRefunded, refunded: false });
    await handleStripeEvent(event("charge.refunded", pln(1085)), converted());
    expect(list).toHaveBeenCalledWith({ payment_intent: "pi_p", limit: 1 });
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.amount).toBe(400);
    await handleStripeEvent(event("charge.refunded", pln(1085)), converted());
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.amount).toBe(400);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
  });

  it("a converted charge whose checkout session can't be found answers 500, so Stripe retries; the gift half the money paid for still goes, once", async () => {
    const fake = seed();
    await bought(fake);
    const d = deps(fake.db);
    (d.stripe as unknown as { checkout: unknown }).checkout = { sessions: { list: vi.fn(async () => ({ data: [] })) } };
    const half = { ...refund(0), currency: "pln", amount: 2170, amount_refunded: 1085, refunded: false };
    expect((await handleStripeEvent(event("charge.refunded", half), d)).status).toBe(500);
    expect((await handleStripeEvent(event("charge.refunded", half), d)).status).toBe(500);
    expect(fake.rows("purchases").find((p) => p.id === PAIR)?.amount).toBe(799);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
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

  it("half refunded, then disputed and won: the gift the refund took stays gone", async () => {
    const fake = seed();
    await bought(fake, ["bouquet"]);
    await handleStripeEvent(event("charge.refunded", refund(400)), deps(fake.db));
    await handleStripeEvent(event("charge.dispute.created", { id: "dp_1", object: "dispute", payment_intent: "pi_p", charge: "ch_p", status: "needs_response" }), deps(fake.db));
    vi.spyOn(console, "info").mockImplementation(() => {});
    await handleStripeEvent(event("charge.dispute.closed", { id: "dp_1", object: "dispute", payment_intent: "pi_p", charge: "ch_p", status: "won" }), deps(fake.db));
    expect(await readyGifts(fake.db, "u1")).toBe(0);
    expect(slugs(fake)).toEqual(["bouquet", "vinyl"]);
    expect(status(fake, "g-bouquet")).toBe("live");
  });
});
