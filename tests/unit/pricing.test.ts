import { describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import {
  BUMP,
  FREE_SAVED_DATES,
  MEMBERSHIP_PLANS,
  PRODUCTS,
  PRODUCT_ORDER,
  bumpAmount,
  currencyFor,
  giftCardsOnSale,
  formatAmount,
  hasPack,
  hasUnlock,
  isMembershipPlan,
  isProductId,
  membershipAmount,
  rowsCoverPack,
  subscriptionsEnabled,
  unlocksFor,
  yearlyPerMonth,
  yearlySavingPct,
} from "@/lib/pricing/products";

describe("pricing catalogue", () => {
  it("carries the owner's prices, VAT included, in every currency", () => {
    const amounts = Object.fromEntries(Object.entries(PRODUCTS).map(([id, p]) => [id, [p.amounts.eur, p.amounts.usd, p.amounts.gbp]]));
    expect(amounts).toEqual({
      single: [999, 1199, 899],
      pick3: [1499, 1799, 1299],
      everything: [2499, 2999, 2199],
      extras: [749, 899, 649],
      // Ethos for Two: the one-time year is the yearly membership's price (membership's figure is its yearly one).
      pass: [2999, 3499, 2599],
      membership: [2999, 3499, 2599],
      pack: [299, 299, 249],
      giftcard: [2499, 2999, 2199],
      upgrade: [499, 499, 499],
    });
    // The bump takes a single or "make it special" to exactly Everything's price.
    expect([bumpAmount("single", "eur"), bumpAmount("single", "usd"), bumpAmount("single", "gbp")]).toEqual([1500, 1800, 1300]);
    expect([bumpAmount("extras", "eur"), bumpAmount("extras", "usd"), bumpAmount("extras", "gbp")]).toEqual([1750, 2100, 1550]);
    expect(BUMP.onto).toEqual(["single", "extras"]);
  });
  // docs/MEMBERSHIP.md 2.2: every figure /pricing, the account page and the emails show comes from here.
  it("prices Ethos for Two per plan, and works out what yearly saves from the same figures", () => {
    expect(MEMBERSHIP_PLANS).toEqual({
      monthly: { interval: "month", amounts: { eur: 499, usd: 599, gbp: 449 } },
      yearly: { interval: "year", amounts: { eur: 2999, usd: 3499, gbp: 2599 } },
    });
    for (const c of ["eur", "usd", "gbp"] as const) {
      expect(membershipAmount("monthly", c)).toBe(MEMBERSHIP_PLANS.monthly.amounts[c]);
      // The one-time year sold while subscriptions are off costs what a yearly membership does.
      expect(PRODUCTS.pass.amounts[c]).toBe(membershipAmount("yearly", c));
      expect(PRODUCTS.membership.amounts[c]).toBe(membershipAmount("yearly", c));
    }
    // "€29.99 a year: that's €2.50 a month, save 50% on monthly".
    expect([yearlyPerMonth("eur"), yearlyPerMonth("usd"), yearlyPerMonth("gbp")]).toEqual([250, 292, 217]);
    expect([yearlySavingPct("eur"), yearlySavingPct("usd"), yearlySavingPct("gbp")]).toEqual([50, 51, 52]);
    expect(formatAmount(yearlyPerMonth("eur"), "eur", "en")).toBe("€2.50");
    // Spanish puts the sign after the figure: "4,99 €".
    expect(formatAmount(membershipAmount("monthly", "eur"), "eur", "es")).toMatch(/^4,99\s€$/);
    expect(FREE_SAVED_DATES).toBe(3);
    expect(isMembershipPlan("monthly") && isMembershipPlan("yearly")).toBe(true);
    expect(isMembershipPlan("weekly") || isMembershipPlan(undefined)).toBe(false);
  });
  it("sells Ethos for Two as a subscription only when STRIPE_SUBSCRIPTIONS_ENABLED is exactly \"true\"", () => {
    expect(subscriptionsEnabled({})).toBe(false);
    expect(subscriptionsEnabled({ STRIPE_SUBSCRIPTIONS_ENABLED: "1" })).toBe(false);
    expect(subscriptionsEnabled({ STRIPE_SUBSCRIPTIONS_ENABLED: "TRUE" })).toBe(false);
    expect(subscriptionsEnabled({ STRIPE_SUBSCRIPTIONS_ENABLED: "true" })).toBe(true);
  });
  it("names no country in Ethos for Two's words", () => {
    for (const messages of [en, es]) expect(JSON.stringify([messages.membership, messages.pricing, messages.money])).not.toMatch(/Spain|España|Madrid|Spanish city/i);
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
    expect(unlocksFor("membership", [])).toEqual(["*", "pack:*"]);
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
