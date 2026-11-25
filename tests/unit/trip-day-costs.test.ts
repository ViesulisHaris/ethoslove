import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { Currency } from "@/lib/pricing/products";
import { BUDGET_KEY, budgetValues, DAY_COST_EUR, DAY_COST_RATES, DAY_COST_RATES_TAKEN, dayCost, roundToFive } from "@/lib/trips/day-costs";
import { budgetMark } from "@/lib/trips/presets";

const CURRENCIES: Currency[] = ["eur", "usd", "gbp"];
/** A band's sentence, filled as next-intl fills it. Intl puts a no-break space beside the sign in Spanish: made plain. */
function sentence(budget: 1 | 2 | 3, currency: Currency, locale: "en" | "es", short = false): string {
  const messages = (locale === "es" ? es : en).trips.budget;
  const key = BUDGET_KEY[budget];
  const template = short ? messages.short[key] : messages[key];
  const v = budgetValues(budget, currency, locale);
  return template.replace("{amount}", v.amount).replace("{range}", v.range).replace(/ /g, " ");
}

describe("a trip's day costs in the page's currency", () => {
  it("D1 rounds to the nearest five", () => {
    expect(roundToFive(162)).toBe(160);
    expect(roundToFive(163)).toBe(165);
    expect(roundToFive(164.445)).toBe(165);
    expect(roundToFive(328.89)).toBe(330);
    expect(roundToFive(125.55)).toBe(125);
    expect(roundToFive(251.1)).toBe(250);
    expect(roundToFive(0)).toBe(0);
  });

  it("D2 euros are the source and are never converted", () => {
    expect(dayCost(150, "eur")).toBe(150);
    expect(dayCost(300, "eur")).toBe(300);
    expect(DAY_COST_RATES.eur).toBe(1);
  });

  it("D3 dollars", () => {
    expect(dayCost(DAY_COST_EUR.low, "usd")).toBe(165);
    expect(dayCost(DAY_COST_EUR.high, "usd")).toBe(330);
  });

  it("D4 pounds", () => {
    expect(dayCost(DAY_COST_EUR.low, "gbp")).toBe(125);
    expect(dayCost(DAY_COST_EUR.high, "gbp")).toBe(250);
  });

  it("D5 every figure shown is a multiple of five", () => {
    for (const c of CURRENCIES) for (const eur of [DAY_COST_EUR.low, DAY_COST_EUR.high]) expect(dayCost(eur, c) % 5, `${c} ${eur}`).toBe(0);
  });

  it("D6 the rates carry the day they were taken", () => {
    expect(DAY_COST_RATES_TAKEN).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const day = new Date(`${DAY_COST_RATES_TAKEN}T00:00:00Z`);
    expect(Number.isNaN(day.getTime())).toBe(false);
    expect(day.toISOString().slice(0, 10)).toBe(DAY_COST_RATES_TAKEN);
    expect(day.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('D7 the three bands read as they did in euros, and as "about" in each currency', () => {
    // What tests/e2e/trips-match.spec.ts reads, letter for letter.
    expect(sentence(1, "eur", "en")).toBe("About €150 a day for two, or less");
    expect(sentence(2, "eur", "en")).toBe("About €150–300 a day for two");
    expect(sentence(3, "eur", "en")).toBe("Over €300 a day for two");
    expect(sentence(1, "usd", "en")).toBe("About $165 a day for two, or less");
    expect(sentence(2, "usd", "en")).toBe("About $165–330 a day for two");
    expect(sentence(3, "usd", "en")).toBe("Over $330 a day for two");
    expect(sentence(1, "gbp", "en")).toBe("About £125 a day for two, or less");
    expect(sentence(2, "gbp", "en")).toBe("About £125–250 a day for two");
    expect(sentence(3, "gbp", "en")).toBe("Over £250 a day for two");
    // Spanish as it read before: the sign after the figure.
    expect(sentence(1, "eur", "es")).toBe("Unos 150 € al día para dos, o menos");
    expect(sentence(2, "eur", "es")).toBe("Unos 150–300 € al día para dos");
    expect(sentence(3, "eur", "es")).toBe("Más de 300 € al día para dos");
    expect(sentence(2, "usd", "es")).toContain("165–330");
    // The narrow sign in Spanish too: never "US$" or "GBP" in running text.
    expect(sentence(2, "usd", "es")).toBe("Unos 165–330 $ al día para dos");
    expect(sentence(2, "gbp", "es")).toBe("Unos 125–250 £ al día para dos");
    for (const c of CURRENCIES) for (const b of [1, 2, 3] as const) expect(sentence(b, c, "es")).not.toMatch(/US\$|GBP|USD|EUR/);
    // The short form on a trip's page.
    expect(sentence(2, "usd", "en", true)).toBe("About $165–330");
    expect(sentence(2, "eur", "es", true)).toBe("Unos 150–300 €");
    expect(sentence(2, "usd", "es", true)).toBe("Unos 165–330 $");
    for (const c of CURRENCIES) for (const b of [1, 2] as const) expect(sentence(b, c, "en", true)).toMatch(/^About /);
  });

  it("D8 the mark is the currency's own sign", () => {
    expect(budgetMark(2)).toBe("€€");
    expect(budgetMark(2, "usd")).toBe("$$");
    expect(budgetMark(3, "gbp")).toBe("£££");
  });
});
