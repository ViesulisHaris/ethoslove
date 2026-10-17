import { describe, expect, it } from "vitest";
import { DAY_MS, iso } from "@/lib/commerce/db";
import { issueGiftCard, redeemGiftCard } from "@/lib/commerce/gift-cards";
import { joinPass, startPass } from "@/lib/commerce/passes";
import { revokePurchase } from "@/lib/commerce/revoke";
import { grantForever } from "@/lib/commerce/unlocks";
import { FakeDb } from "./helpers/fake-db";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");

const purchase = (id: string, user_id: string, product: string) => ({ id, user_id, product, status: "paid", amount: 999, currency: "eur" });
const gift = (id: string, user_id: string, template_slug: string, extra: Record<string, unknown> = {}) => ({
  id,
  user_id,
  template_slug,
  status: "live",
  watermark: false,
  password_hash: null,
  unlock_at: null,
  data: { recipientName: "Sam", senderName: "Alex", message: "hi", photos: [], watermark: false },
  ...extra,
});
const slugs = (fake: FakeDb, userId: string) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => r.template_slug)
    .sort();

describe("refunds and chargebacks", () => {
  it("take back a single with its order bump, and relock what was published with it", async () => {
    const fake = new FakeDb({ purchases: [purchase("s1", "u1", "single")], gifts: [gift("g1", "u1", "vinyl"), gift("g2", "u1", "bloom")] }, NOW);
    await grantForever(fake.db, "u1", ["vinyl", "*"], "s1");
    await revokePurchase(fake.db, { id: "s1", user_id: "u1", product: "single" }, NOW);
    expect(fake.rows("purchases")[0].status).toBe("refunded");
    expect(slugs(fake, "u1")).toEqual([]);
    expect(fake.rows("gifts").map((g) => g.status)).toEqual(["draft", "draft"]);
  });

  it("leave what other purchases paid for", async () => {
    const fake = new FakeDb({ purchases: [purchase("s1", "u1", "single"), purchase("s2", "u1", "single")], gifts: [gift("g1", "u1", "vinyl")] }, NOW);
    await grantForever(fake.db, "u1", ["vinyl"], "s1");
    await grantForever(fake.db, "u1", ["bloom"], "s2");
    await revokePurchase(fake.db, { id: "s2", user_id: "u1", product: "single" }, NOW);
    expect(slugs(fake, "u1")).toEqual(["vinyl"]);
    expect(fake.rows("gifts")[0].status).toBe("live");
  });

  it("give a free template's footer back when only 'make it special' paid to drop it", async () => {
    const fake = new FakeDb({ purchases: [purchase("x1", "u1", "extras")], gifts: [gift("g1", "u1", "the-letter")] }, NOW);
    await grantForever(fake.db, "u1", ["the-letter"], "x1");
    await revokePurchase(fake.db, { id: "x1", user_id: "u1", product: "extras" }, NOW);
    expect(fake.rows("gifts")[0]).toMatchObject({ status: "live", watermark: true });
  });

  it("end a pass now, for both people", async () => {
    const fake = new FakeDb({ purchases: [purchase("p1", "owner", "pass")] }, NOW);
    const started = await startPass(fake.db, { purchaseId: "p1", ownerId: "owner", now: NOW });
    if ("error" in started) throw new Error(started.error);
    await joinPass(fake.db, { code: started.pass.invite_code, userId: "partner", now: NOW });
    const later = NOW + 30 * DAY_MS;
    await revokePurchase(fake.db, { id: "p1", user_id: "owner", product: "pass" }, later);
    expect(fake.rows("couple_passes")[0].ends_at).toBe(iso(later));
    expect(slugs(fake, "owner")).toEqual([]);
    expect(slugs(fake, "partner")).toEqual([]);
  });

  it("refunding a renewal keeps the year still running", async () => {
    const fake = new FakeDb({ purchases: [purchase("p1", "owner", "pass"), purchase("p2", "owner", "pass")] }, NOW);
    await startPass(fake.db, { purchaseId: "p1", ownerId: "owner", now: NOW });
    await startPass(fake.db, { purchaseId: "p2", ownerId: "owner", now: NOW + DAY_MS });
    await revokePurchase(fake.db, { id: "p2", user_id: "owner", product: "pass" }, NOW + 2 * DAY_MS);
    expect(slugs(fake, "owner")).toEqual(["*", "pack:*"]);
    const [first, second] = fake.rows("couple_passes");
    expect(first.ends_at).toBe(iso(NOW + 365 * DAY_MS));
    expect(second.ends_at).toBe(second.starts_at);
  });

  it("refunding the running year hands over to a renewal at once", async () => {
    const fake = new FakeDb({ purchases: [purchase("p1", "owner", "pass"), purchase("p2", "owner", "pass")] }, NOW);
    await startPass(fake.db, { purchaseId: "p1", ownerId: "owner", now: NOW });
    await startPass(fake.db, { purchaseId: "p2", ownerId: "owner", now: NOW + DAY_MS });
    await revokePurchase(fake.db, { id: "p1", user_id: "owner", product: "pass" }, NOW + 2 * DAY_MS);
    const rows = fake.rows("template_unlocks").filter((r) => r.user_id === "owner");
    expect(rows.map((r) => `${r.template_slug}@${r.purchase_id}`).sort()).toEqual(["*@p2", "pack:*@p2"]);
  });

  it("refunding Everything bought during a pass falls back to the pass while it runs", async () => {
    const fake = new FakeDb({ purchases: [purchase("p1", "u1", "pass"), purchase("e1", "u1", "everything")], gifts: [gift("g1", "u1", "vinyl")] }, NOW);
    await startPass(fake.db, { purchaseId: "p1", ownerId: "u1", now: NOW });
    await grantForever(fake.db, "u1", ["*"], "e1");
    await revokePurchase(fake.db, { id: "e1", user_id: "u1", product: "everything" }, NOW);
    expect(fake.rows("template_unlocks").map((r) => `${r.template_slug}@${r.purchase_id}`).sort()).toEqual(["*@p1", "pack:*@p1"]);
    expect(fake.rows("gifts")[0].status).toBe("live");
  });

  it("void an unredeemed gift card, and take Everything back from whoever redeemed one", async () => {
    const fake = new FakeDb({ purchases: [purchase("c1", "buyer", "giftcard"), purchase("c2", "buyer", "giftcard")] }, NOW);
    const one = await issueGiftCard(fake.db, { purchaseId: "c1", buyerId: "buyer", now: NOW });
    const two = await issueGiftCard(fake.db, { purchaseId: "c2", buyerId: "buyer", now: NOW });
    if ("error" in one || "error" in two) throw new Error("issue failed");
    await redeemGiftCard(fake.db, { code: two.card.code, userId: "friend", now: NOW });
    expect(slugs(fake, "friend")).toEqual(["*"]);

    await revokePurchase(fake.db, { id: "c1", user_id: "buyer", product: "giftcard" }, NOW);
    expect(await redeemGiftCard(fake.db, { code: one.card.code, userId: "someone", now: NOW + 1 })).toEqual({ ok: false, error: "voided" });

    await revokePurchase(fake.db, { id: "c2", user_id: "buyer", product: "giftcard" }, NOW);
    expect(slugs(fake, "friend")).toEqual([]);
  });

  it("can run twice (a refund, then a dispute on the same payment)", async () => {
    const fake = new FakeDb({ purchases: [purchase("p1", "owner", "pass")] }, NOW);
    await startPass(fake.db, { purchaseId: "p1", ownerId: "owner", now: NOW });
    await revokePurchase(fake.db, { id: "p1", user_id: "owner", product: "pass" }, NOW + DAY_MS);
    await revokePurchase(fake.db, { id: "p1", user_id: "owner", product: "pass" }, NOW + 2 * DAY_MS);
    expect(fake.rows("couple_passes")[0].ends_at).toBe(iso(NOW + DAY_MS));
    expect(slugs(fake, "owner")).toEqual([]);
  });
});
