import type { Currency } from "@/lib/pricing/products";
import type { Trip } from "./presets";

/**
 * What two people spend at a trip a day, in the page's currency. The euro figures are the source;
 * dollars and pounds are worked out from fixed rates taken on one day, rounded to the nearest five
 * and always said as "about": a guide to the band, never a quote. No React, no window: the pages
 * fill their sentences on the server.
 */

/** The two edges of the three bands, in euros: the source. A trip's `budget` (1, 2, 3) picks the band. */
export const DAY_COST_EUR = { low: 150, high: 300 } as const;
/** Euro reference rates of the European Central Bank, 24 Nov 2026 (ecb.europa.eu/stats/eurofxref). */
export const DAY_COST_RATES: Readonly<Record<Currency, number>> = { eur: 1, usd: 1.0963, gbp: 0.837 };
export const DAY_COST_RATES_TAKEN = "2026-11-24";

export const roundToFive = (n: number): number => Math.round(n / 5) * 5;

/** A euro figure in a currency, to the nearest five. Euros are never touched. */
export function dayCost(eur: number, currency: Currency): number {
  return currency === "eur" ? eur : roundToFive(eur * DAY_COST_RATES[currency]);
}

/**
 * "€150", "150 €", "$165", "165 $", "£125", "125 £": whole units, the language's own order. The
 * narrow sign, because Spanish would otherwise write "125 GBP" and "165 US$" in running text; the
 * page's currency is the visitor's own, so "$" cannot be read as another dollar.
 */
export function dayCostText(amount: number, currency: Currency, locale: "en" | "es"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

/** "€150–300", "150–300 €", "$165–330": one sign for the two ends, an en dash between. */
export function dayCostRange(from: number, to: number, currency: Currency, locale: "en" | "es"): string {
  return dayCostText(from, currency, locale).replace(String(from), `${from}–${to}`);
}

export type BudgetKey = "low" | "mid" | "high";
export const BUDGET_KEY = { 1: "low", 2: "mid", 3: "high" } as const satisfies Record<Trip["budget"], BudgetKey>;

/** What a band's sentence is filled with: `amount` is the low edge for band 1 and the high edge for band 3; `range` is both. */
export function budgetValues(budget: Trip["budget"], currency: Currency, locale: "en" | "es"): { amount: string; range: string } {
  const low = dayCost(DAY_COST_EUR.low, currency);
  const high = dayCost(DAY_COST_EUR.high, currency);
  return { amount: dayCostText(budget === 3 ? high : low, currency, locale), range: dayCostRange(low, high, currency, locale) };
}
