import { afterEach, describe, expect, it, vi } from "vitest";
import { SIGNED_OUT, readEntitlements } from "@/lib/commerce/entitlements";
import { grantGifts } from "@/lib/commerce/gift-credits";
import { FakeDb } from "./helpers/fake-db";

/**
 * What /api/entitlements says about two more gifts (PLAN-pair.md step 9): how many gifts are ready,
 * and whether to offer the pair, at what price, by the one rule in lib/commerce/gift-credits.ts.
 */
const NOW = Date.parse("2026-11-24T12:00:00.000Z");
const paid = (product: string) => ({ id: `p-${product}`, user_id: "u1", product, status: "paid", amount: 999, currency: "eur", template_slugs: [], created_at: "2026-11-24T10:00:00.000Z" });
const read = (fake: FakeDb, currency: "eur" | "usd" | "gbp" = "eur") => readEntitlements(fake.db, "u1", { locale: "en", currency, now: NOW });

afterEach(() => vi.unstubAllEnvs());

describe("entitlements: two more gifts", () => {
  it("offers them, at the visitor's price, to someone who just paid for a gift", async () => {
    vi.stubEnv("GIFT_PAIR_ENABLED", "true");
    const fake = new FakeDb({ purchases: [paid("single")] }, NOW);
    expect(await read(fake)).toMatchObject({ giftsReady: 0, pairOffer: { amount: 799, currency: "eur" } });
    expect((await read(fake, "usd")).pairOffer).toEqual({ amount: 899, currency: "usd" });
    expect((await read(fake, "gbp")).pairOffer).toEqual({ amount: 699, currency: "gbp" });
  });

  it("counts the gifts ready, and then offers nothing more", async () => {
    vi.stubEnv("GIFT_PAIR_ENABLED", "true");
    const fake = new FakeDb({ purchases: [paid("single")] }, NOW);
    await grantGifts(fake.db, "u1", "p-pair", 2);
    expect(await read(fake)).toMatchObject({ giftsReady: 2, pairOffer: null });
  });

  it("offers nothing while switched off, to someone who never paid, or to an Everything owner", async () => {
    const fake = new FakeDb({ purchases: [paid("single")] }, NOW);
    expect((await read(fake)).pairOffer).toBeNull();
    vi.stubEnv("GIFT_PAIR_ENABLED", "true");
    expect((await read(new FakeDb({}, NOW))).pairOffer).toBeNull();
    const everything = new FakeDb({ purchases: [paid("single")], template_unlocks: [{ id: "t", user_id: "u1", template_slug: "*", purchase_id: "e1" }] }, NOW);
    expect((await read(everything)).pairOffer).toBeNull();
  });

  it("reads as nothing ready and nothing offered before migration 0024", async () => {
    vi.stubEnv("GIFT_PAIR_ENABLED", "true");
    const fake = new FakeDb({ purchases: [paid("single")] }, NOW, { missingTables: ["gift_credits"] });
    expect(await read(fake)).toMatchObject({ signedIn: true, giftsReady: 0, pairOffer: null });
  });

  it("says nothing of them to a visitor who isn't signed in", () => {
    expect(SIGNED_OUT).toMatchObject({ giftsReady: 0, pairOffer: null });
  });
});

describe("entitlements: two more gifts added at payment, for a reader a reminder brought", () => {
  it("may be added by anyone with none ready, even someone who never paid, while on sale", async () => {
    vi.stubEnv("GIFT_PAIR_ENABLED", "true");
    expect((await read(new FakeDb({}, NOW))).addPair).toBe(true);
    expect((await read(new FakeDb({ purchases: [paid("single")] }, NOW))).addPair).toBe(true);
  });

  it("not while switched off, with gifts ready, for an Everything owner, or before migration 0024", async () => {
    expect((await read(new FakeDb({}, NOW))).addPair).toBe(false);
    vi.stubEnv("GIFT_PAIR_ENABLED", "true");
    const ready = new FakeDb({}, NOW);
    await grantGifts(ready.db, "u1", "p-pair", 2);
    expect((await read(ready)).addPair).toBe(false);
    expect((await read(new FakeDb({ template_unlocks: [{ id: "t", user_id: "u1", template_slug: "*", purchase_id: "e1" }] }, NOW))).addPair).toBe(false);
    expect((await read(new FakeDb({}, NOW, { missingTables: ["gift_credits"] }))).addPair).toBe(false);
    expect(SIGNED_OUT.addPair).toBe(false);
  });
});
