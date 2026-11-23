import { describe, expect, it } from "vitest";
import { PAIR_GIFTS, PRODUCTS, formatAmount, formatRound, pairApart, pairOnSale, unlocksFor, type Currency } from "@/lib/pricing/products";
import { UPGRADE_CREDITED } from "@/lib/commerce/pricing";

/**
 * Two more gifts, offered on the share screen right after a paid gift (docs/marketing/growth-build/
 * PLAN-pair.md). Its price is Pick three's minus a single in every currency, so three gifts always
 * cost what the pricing page says three cost, and "Separately" is twice a single, worked out.
 */
const CURRENCIES: Currency[] = ["usd", "eur", "gbp"];

describe("two more gifts in the catalogue", () => {
  it("costs exactly Pick three minus a single, in every currency", () => {
    for (const c of CURRENCIES) expect(PRODUCTS.pair.amounts[c]).toBe(PRODUCTS.pick3.amounts[c] - PRODUCTS.single.amounts[c]);
    expect(PRODUCTS.pair.amounts).toEqual({ usd: 600, eur: 500, gbp: 400 });
  });

  it("is two gifts, and 'separately' is twice a single", () => {
    expect(PAIR_GIFTS).toBe(2);
    for (const c of CURRENCIES) expect(pairApart(c)).toBe(2 * PRODUCTS.single.amounts[c]);
    expect(formatAmount(pairApart("eur"), "eur", "en")).toBe("€19.98");
  });

  it("grants no unlock row of its own (its gifts become rows when used)", () => {
    expect(unlocksFor("pair", [])).toEqual([]);
    expect(PRODUCTS.pair.picks).toBe(0);
  });

  it("counts towards the upgrade to every template, as Pick three does", () => {
    expect(UPGRADE_CREDITED).toContain("pair");
  });

  it("is on sale only while GIFT_PAIR_ENABLED is exactly 'true'", () => {
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "true" })).toBe(true);
    expect(pairOnSale({})).toBe(false);
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "1" })).toBe(false);
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "false" })).toBe(false);
  });
});

describe("formatRound", () => {
  it("drops the cents of a whole price, in English and Spanish, for each currency", () => {
    expect(formatRound(500, "eur", "en")).toBe("€5");
    expect(formatRound(600, "usd", "en")).toBe("$6");
    expect(formatRound(400, "gbp", "en")).toBe("£4");
    // Spanish puts the sign after, with a non-breaking space.
    expect(formatRound(500, "eur", "es").replace(/\s/g, " ")).toBe("5 €");
    expect(formatRound(600, "usd", "es").replace(/\s/g, " ")).toMatch(/^6 (US)?\$$/);
    expect(formatRound(400, "gbp", "es").replace(/\s/g, " ")).toMatch(/^4 (GBP|£)$/);
  });

  it("keeps two places when there are cents", () => {
    expect(formatRound(499, "eur", "en")).toBe("€4.99");
    expect(formatRound(1998, "eur", "es").replace(/\s/g, " ")).toBe("19,98 €");
  });
});
