import { describe, expect, it } from "vitest";
import { grantGifts, pairAllowed, readyGifts, restoreGiftsOf, revokeGiftsOf, revokeOneUnusedOf, spendGift } from "@/lib/commerce/gift-credits";
import { FakeDb } from "./helpers/fake-db";

const NOW = Date.parse("2026-11-24T12:00:00.000Z");

/** Gifts ready: what two more gifts put on an account (lib/commerce/gift-credits.ts, migration 0024). */
describe("gifts ready", () => {
  it("are granted two per purchase, and granting again changes nothing", async () => {
    const fake = new FakeDb({}, NOW);
    expect(await grantGifts(fake.db, "u1", "p1", 2)).toEqual({});
    expect(await grantGifts(fake.db, "u1", "p1", 2)).toEqual({});
    expect(fake.rows("gift_credits")).toHaveLength(2);
    expect(fake.rows("gift_credits").map((r) => r.n)).toEqual([1, 2]);
    expect(await readyGifts(fake.db, "u1")).toBe(2);
    expect(await readyGifts(fake.db, "someone-else")).toBe(0);
  });

  it("read as null, never an error, when migration 0024 isn't applied", async () => {
    const fake = new FakeDb({}, NOW, { missingTables: ["gift_credits"] });
    expect(await readyGifts(fake.db, "u1")).toBeNull();
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("none");
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(false);
    await expect(revokeGiftsOf(fake.db, "p1", NOW)).resolves.toBeUndefined();
    expect(await restoreGiftsOf(fake.db, "p1")).toEqual([]);
    // Granting does fail: fulfilment must not mark a pair paid with nothing on the account.
    expect((await grantGifts(fake.db, "u1", "p1", 2)).error).toBeTruthy();
  });

  it("are used one at a time, each writing the template's unlock for the purchase that paid", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("spent");
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    expect(fake.rows("template_unlocks")).toEqual([expect.objectContaining({ user_id: "u1", template_slug: "vinyl", purchase_id: "p1" })]);
    // The same template again: already held, nothing used.
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("none");
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    expect(await spendGift(fake.db, "u1", "bouquet")).toBe("spent");
    expect(await spendGift(fake.db, "u1", "xoxo")).toBe("none");
    expect(await readyGifts(fake.db, "u1")).toBe(0);
  });

  it("are never used on a template Everything already covers", async () => {
    const fake = new FakeDb({ template_unlocks: [{ id: "t1", user_id: "u1", template_slug: "*", purchase_id: "e1" }] }, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    expect(await spendGift(fake.db, "u1", "vinyl")).toBe("none");
    expect(await readyGifts(fake.db, "u1")).toBe(2);
  });

  it("all stop counting on a full refund, used or not", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    await revokeGiftsOf(fake.db, "p1", NOW);
    expect(fake.rows("gift_credits").every((r) => r.revoked_at)).toBe(true);
    expect(await readyGifts(fake.db, "u1")).toBe(0);
  });

  it("lose one unused gift on half a refund, once only", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(true);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
    // The same refund's event again takes nothing more.
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(false);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
  });

  it("keep a used gift on half a refund, and take the unused one", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(true);
    const [first, second] = fake.rows("gift_credits");
    expect(first).toMatchObject({ spent_slug: "vinyl", revoked_at: null });
    expect(second.revoked_at).toBeTruthy();
  });

  it("take nothing on half a refund when both were used", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    await spendGift(fake.db, "u1", "bouquet");
    expect(await revokeOneUnusedOf(fake.db, "p1", NOW)).toBe(false);
  });

  it("come back after a won dispute, naming the templates the used ones went on", async () => {
    const fake = new FakeDb({}, NOW);
    await grantGifts(fake.db, "u1", "p1", 2);
    await spendGift(fake.db, "u1", "vinyl");
    await revokeGiftsOf(fake.db, "p1", NOW);
    expect(await restoreGiftsOf(fake.db, "p1")).toEqual(["vinyl"]);
    expect(await readyGifts(fake.db, "u1")).toBe(1);
  });
});

describe("pairAllowed", () => {
  const yes = { onSale: true, signedIn: true, ready: 0, ownedForever: ["vinyl"], memberRunning: false, paidProducts: ["single"] };

  it("lets a signed-in buyer of a gift with nothing ready buy two more", () => {
    expect(pairAllowed(yes)).toEqual({ ok: true });
    for (const product of ["single", "extras", "photos", "pick3"]) expect(pairAllowed({ ...yes, paidProducts: [product] })).toEqual({ ok: true });
  });

  it("refuses while it is off, or while the table isn't there", () => {
    expect(pairAllowed({ ...yes, onSale: false })).toEqual({ ok: false, error: "not_on_sale" });
    expect(pairAllowed({ ...yes, ready: null })).toEqual({ ok: false, error: "not_on_sale" });
  });

  it("refuses a guest", () => {
    expect(pairAllowed({ ...yes, signedIn: false, ready: null })).toEqual({ ok: false, error: "sign_in_required" });
  });

  it("refuses someone who has gifts ready", () => {
    expect(pairAllowed({ ...yes, ready: 1 })).toEqual({ ok: false, error: "pair_ready" });
  });

  it("refuses someone who holds every template, or whose Ethos for Two runs", () => {
    expect(pairAllowed({ ...yes, ownedForever: ["*"] })).toEqual({ ok: false, error: "already_owned" });
    expect(pairAllowed({ ...yes, memberRunning: true })).toEqual({ ok: false, error: "already_owned" });
  });

  it("refuses someone who has never paid for a gift", () => {
    expect(pairAllowed({ ...yes, paidProducts: [] })).toEqual({ ok: false, error: "pair_needs_purchase" });
    for (const product of ["pack", "giftcard", "pass", "pair", "upgrade", "everything"]) expect(pairAllowed({ ...yes, paidProducts: [product] })).toEqual({ ok: false, error: "pair_needs_purchase" });
  });
});
