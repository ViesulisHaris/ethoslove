import { describe, expect, it, vi } from "vitest";
import {
  BUMP,
  PRODUCTS,
  PRODUCT_ORDER,
  bumpAmount,
  currencyFor,
  giftCardsOnSale,
  formatAmount,
  hasPack,
  hasUnlock,
  isProductId,
  rowsCoverPack,
  unlocksFor,
} from "@/lib/pricing/products";

describe("pricing catalogue", () => {
  it("carries the owner's prices, VAT included, in every currency", () => {
    const amounts = Object.fromEntries(Object.entries(PRODUCTS).map(([id, p]) => [id, [p.amounts.eur, p.amounts.usd, p.amounts.gbp]]));
    expect(amounts).toEqual({
      single: [999, 1199, 899],
      pick3: [1499, 1799, 1299],
      everything: [2499, 2999, 2199],
      extras: [749, 899, 649],
      pass: [2900, 2900, 2500],
      pack: [299, 299, 249],
      giftcard: [2499, 2999, 2199],
      upgrade: [499, 499, 499],
    });
    // The bump takes a single or "make it special" to exactly Everything's price.
    expect([bumpAmount("single", "eur"), bumpAmount("single", "usd"), bumpAmount("single", "gbp")]).toEqual([1500, 1800, 1300]);
    expect([bumpAmount("extras", "eur"), bumpAmount("extras", "usd"), bumpAmount("extras", "gbp")]).toEqual([1750, 2100, 1550]);
    expect(BUMP.onto).toEqual(["single", "extras"]);
  });
  it("keeps gift cards off sale unless GIFT_CARDS_ENABLED is exactly \"true\"", () => {
    expect(giftCardsOnSale({})).toBe(false);
    expect(giftCardsOnSale({ GIFT_CARDS_ENABLED: "1" })).toBe(false);
    expect(giftCardsOnSale({ GIFT_CARDS_ENABLED: "false" })).toBe(false);
    expect(giftCardsOnSale({ GIFT_CARDS_ENABLED: "true" })).toBe(true);
  });
  it("shows three plan cards, Everything highlighted, pick three against three singles", () => {
    expect(PRODUCT_ORDER).toEqual(["single", "pick3", "everything"]);
    expect(PRODUCTS.everything.highlight).toBe(true);
    for (const c of ["eur", "usd", "gbp"] as const) expect(PRODUCTS.pick3.compareAt![c]).toBe(3 * PRODUCTS.single.amounts[c]);
  });
  it("names every product in both languages, for Stripe's page", () => {
    for (const p of Object.values(PRODUCTS)) {
      expect(p.name.en).toMatch(/Ethos/);
      expect(p.name.es).toMatch(/Ethos/);
      expect(p.envProductKey).toMatch(/^STRIPE_PRODUCT_[A-Z0-9]+$/);
    }
    // Nothing on the site names a country.
    expect(JSON.stringify(PRODUCTS)).not.toMatch(/Spain|España|Madrid/);
  });
  it("only knows its own products", () => {
    expect(isProductId("pass")).toBe(true);
    expect(isProductId("bump")).toBe(false);
    expect(isProductId("toString")).toBe(false);
  });
  it("formats money per locale", () => {
    expect(formatAmount(999, "usd")).toBe("$9.99");
    expect(formatAmount(749, "eur", "es")).toMatch(/7,49/);
  });
  it("only ever shows a currency the Stripe prices charge in: euros, until the others are switched on", () => {
    // The default: live prices are euro-only, so a dollar or pound figure would be a price nobody pays.
    expect(currencyFor("es-ES")).toBe("eur");
    expect(currencyFor("GB")).toBe("eur");
    expect(currencyFor("en-US")).toBe("eur");
    expect(currencyFor(null)).toBe("eur");
  });
  it("guesses the visitor's own currency once Stripe carries it", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRICE_CURRENCIES", "eur,usd,gbp");
    vi.resetModules();
    const fresh = await import("@/lib/pricing/products");
    expect(fresh.currencyFor("es-ES")).toBe("eur");
    expect(fresh.currencyFor("GB")).toBe("gbp");
    expect(fresh.currencyFor("en-US")).toBe("usd");
    expect(fresh.currencyFor(null)).toBe("usd");
    // One currency switched on and not the other: the unsupported one falls back to the first listed.
    vi.stubEnv("NEXT_PUBLIC_PRICE_CURRENCIES", "eur,gbp");
    vi.resetModules();
    const partial = await import("@/lib/pricing/products");
    expect(partial.currencyFor("GB")).toBe("gbp");
    expect(partial.currencyFor("en-US")).toBe("eur");
    vi.unstubAllEnvs();
  });
  it("turns products into unlock rows", () => {
    expect(unlocksFor("everything", [])).toEqual(["*"]);
    expect(unlocksFor("upgrade", [])).toEqual(["*"]);
    expect(unlocksFor("pass", [])).toEqual(["*", "pack:*"]);
    expect(unlocksFor("giftcard", [])).toEqual([]);
    expect(unlocksFor("pack", [], { packId: "deep" })).toEqual(["pack:deep"]);
    expect(unlocksFor("single", ["the-letter"])).toEqual(["the-letter"]);
    expect(unlocksFor("extras", ["the-letter"])).toEqual(["the-letter"]);
    expect(unlocksFor("pick3", ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(() => unlocksFor("pick3", ["a", "a", "b"])).toThrow();
    expect(() => unlocksFor("single", [])).toThrow();
    expect(() => unlocksFor("pack", [])).toThrow();
  });
  it("checks entitlement", () => {
    expect(hasUnlock(["*"], "anything")).toBe(true);
    expect(hasUnlock(["the-letter"], "the-letter")).toBe(true);
    expect(hasUnlock(["the-letter"], "vinyl")).toBe(false);
    // A pack row never unlocks a template, and "*" (every template) never unlocks a pack.
    expect(hasUnlock(["pack:*"], "vinyl")).toBe(false);
    expect(rowsCoverPack(["*"], "deep")).toBe(false);
    expect(rowsCoverPack(["pack:*"], "deep")).toBe(true);
    expect(rowsCoverPack(["pack:deep"], "deep")).toBe(true);
    expect(rowsCoverPack(["pack:deep"], "spicy")).toBe(false);
    expect(hasPack(["*", "deep"], "spicy")).toBe(true);
    expect(hasPack(["deep"], "deep")).toBe(true);
    expect(hasPack(["deep"], "spicy")).toBe(false);
  });
});
