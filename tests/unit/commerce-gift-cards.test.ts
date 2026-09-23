import { describe, expect, it } from "vitest";
import { iso } from "@/lib/commerce/db";
import { addMonths, issueGiftCard, redeemGiftCard, voidUnredeemedCards } from "@/lib/commerce/gift-cards";
import { startPass } from "@/lib/commerce/passes";
import { FakeDb } from "./helpers/fake-db";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");

async function issued(fake: FakeDb, purchaseId = "g1") {
  const result = await issueGiftCard(fake.db, { purchaseId, buyerId: "buyer", recipientName: "  Sam ", note: "Happy birthday", now: fake.clock });
  if ("error" in result) throw new Error(result.error);
  return result;
}

describe("gift cards", () => {
  it("last 24 calendar months", () => {
    expect(iso(addMonths(NOW, 24))).toBe("2028-09-23T12:00:00.000Z");
    expect(iso(addMonths(Date.parse("2026-01-31T00:00:00.000Z"), 1))).toBe("2026-02-28T00:00:00.000Z");
    expect(iso(addMonths(Date.parse("2028-02-29T00:00:00.000Z"), 12))).toBe("2029-02-28T00:00:00.000Z");
  });

  it("are minted once per purchase, whoever fulfils first", async () => {
    const fake = new FakeDb({ purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }] }, NOW);
    const first = await issued(fake);
    expect(first.created).toBe(true);
    expect(first.card).toMatchObject({ purchase_id: "g1", buyer_user_id: "buyer", recipient_name: "Sam", note: "Happy birthday", expires_at: "2028-09-23T12:00:00.000Z" });
    expect(first.card.code).toMatch(/^ETHOS-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const second = await issued(fake);
    expect(second).toMatchObject({ created: false, card: { code: first.card.code } });
    expect(fake.rows("gift_cards")).toHaveLength(1);
  });

  it("redeem for Everything, forever, once", async () => {
    const fake = new FakeDb({ purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }] }, NOW);
    const { card } = await issued(fake);
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toEqual({ ok: true, alreadyYours: false });
    expect(fake.rows("template_unlocks")).toMatchObject([{ user_id: "friend", template_slug: "*", purchase_id: "g1" }]);
    expect(fake.rows("gift_cards")[0]).toMatchObject({ redeemed_by: "friend", redeemed_at: iso(NOW) });
    // The same person again is fine; anybody else is too late.
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toEqual({ ok: true, alreadyYours: true });
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "other", now: NOW })).toEqual({ ok: false, error: "already_redeemed" });
    expect(fake.rows("template_unlocks")).toHaveLength(1);
  });

  it("stay used when the person who redeemed one deletes their account", async () => {
    const fake = new FakeDb({ purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }] }, NOW);
    const { card } = await issued(fake);
    await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW });
    // What the database does to the card when "friend" goes: redeemed_by is set to null.
    fake.tables.gift_cards[0].redeemed_by = null;
    fake.tables.template_unlocks = [];
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "stranger", now: NOW })).toEqual({ ok: false, error: "already_redeemed" });
    expect(fake.rows("template_unlocks")).toHaveLength(0);
  });

  it("refuse an unknown, expired or refunded code", async () => {
    const fake = new FakeDb({ purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }] }, NOW);
    const { card } = await issued(fake);
    expect(await redeemGiftCard(fake.db, { code: "ETHOS-AAAA-AAAA", userId: "friend", now: NOW })).toEqual({ ok: false, error: "not_found" });
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: addMonths(NOW, 25) })).toEqual({ ok: false, error: "expired" });
    fake.tables.purchases[0].status = "refunded";
    await voidUnredeemedCards(fake.db, "g1", NOW);
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toEqual({ ok: false, error: "voided" });
    expect(fake.rows("template_unlocks")).toHaveLength(0);
  });

  it("aren't spent by somebody who already owns Everything", async () => {
    const fake = new FakeDb(
      { purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }], template_unlocks: [{ id: "u", user_id: "friend", template_slug: "*", purchase_id: "e1" }] },
      NOW,
    );
    const { card } = await issued(fake);
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toEqual({ ok: false, error: "already_owned" });
    expect(fake.rows("gift_cards")[0].redeemed_by).toBeNull();
  });

  it("turn a pass's Everything into Everything for good", async () => {
    const fake = new FakeDb({ purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }] }, NOW);
    await startPass(fake.db, { purchaseId: "pass-1", ownerId: "friend", now: NOW });
    const { card } = await issued(fake);
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toMatchObject({ ok: true });
    const star = fake.rows("template_unlocks").find((r) => r.user_id === "friend" && r.template_slug === "*");
    expect(star?.purchase_id).toBe("g1");
  });

  it("give the card back when the unlock can't be written", async () => {
    const fake = new FakeDb({ purchases: [{ id: "g1", user_id: "buyer", product: "giftcard", status: "paid" }] }, NOW);
    const { card } = await issued(fake);
    fake.failNext("template_unlocks", "upsert");
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toEqual({ ok: false, error: "failed" });
    expect(fake.rows("gift_cards")[0].redeemed_by).toBeNull();
    expect(await redeemGiftCard(fake.db, { code: card.code, userId: "friend", now: NOW })).toMatchObject({ ok: true });
  });
});
