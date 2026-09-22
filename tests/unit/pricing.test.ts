import { describe, expect, it, vi } from "vitest";
import { PRODUCTS, PRODUCT_ORDER, currencyFor, formatAmount, hasUnlock, unlocksFor } from "@/lib/pricing/products";

describe("pricing catalogue", () => {
  it("undercuts the competitor on the all-access tier and has three cards", () => {
    expect(PRODUCT_ORDER).toEqual(["single", "pick3", "everything"]);
    expect(PRODUCTS.everything.amounts.usd).toBeLessThan(2799);
    expect(PRODUCTS.everything.highlight).toBe(true);
    expect(PRODUCTS.pick3.compareAt!.usd).toBe(3 * PRODUCTS.single.amounts.usd);
  });
  it("formats money per locale", () => {
    expect(formatAmount(799, "usd")).toBe("$7.99");
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
    expect(unlocksFor("single", ["the-letter"])).toEqual(["the-letter"]);
    expect(unlocksFor("pick3", ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(() => unlocksFor("pick3", ["a", "a", "b"])).toThrow();
    expect(() => unlocksFor("single", [])).toThrow();
  });
  it("checks entitlement", () => {
    expect(hasUnlock(["*"], "anything")).toBe(true);
    expect(hasUnlock(["the-letter"], "the-letter")).toBe(true);
    expect(hasUnlock(["the-letter"], "vinyl")).toBe(false);
  });
});
