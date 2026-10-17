import { describe, expect, it } from "vitest";
import { creditIn, upgradeAmount } from "@/lib/commerce/pricing";

describe("upgrade to Everything for the difference", () => {
  const paid = (product: string, amount: number, currency = "eur", status = "paid") => ({ product, amount, currency, status });

  it("is Everything minus what was paid for singles, pick-threes and extras", () => {
    expect(upgradeAmount("eur", [paid("single", 999)])).toBe(1500);
    expect(upgradeAmount("eur", [paid("single", 999), paid("extras", 749)])).toBe(751);
    // An old single bought at the launch price counts at what was really paid.
    expect(upgradeAmount("eur", [paid("single", 749)])).toBe(1750);
    expect(upgradeAmount("usd", [paid("single", 1199, "usd")])).toBe(1800);
  });
  it("never goes below €4.99", () => {
    expect(upgradeAmount("eur", [paid("pick3", 1499), paid("single", 999)])).toBe(499);
    expect(upgradeAmount("eur", [paid("pick3", 1499), paid("pick3", 1499)])).toBe(499);
  });
  it("counts only paid template purchases", () => {
    expect(upgradeAmount("eur", [paid("single", 999, "eur", "refunded"), paid("single", 999, "eur", "pending")])).toBe(2499);
    expect(upgradeAmount("eur", [paid("pass", 2900), paid("pack", 299), paid("giftcard", 2499)])).toBe(2499);
    expect(upgradeAmount("eur", [])).toBe(2499);
  });
  it("credits another currency at the catalogue's own parity", () => {
    expect(creditIn(999, "eur", "eur")).toBe(999);
    expect(creditIn(1199, "usd", "eur")).toBe(999);
    expect(creditIn(2199, "gbp", "eur")).toBe(2499);
    expect(creditIn(899, "gbp", "eur")).toBe(1021);
    expect(creditIn(500, "sek", "eur")).toBe(0);
    expect(upgradeAmount("eur", [paid("single", 899, "gbp")])).toBe(2499 - 1021);
    expect(upgradeAmount("gbp", [paid("single", 999, "eur")])).toBe(2199 - 879);
  });
});
