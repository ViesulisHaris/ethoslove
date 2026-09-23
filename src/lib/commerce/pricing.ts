import { PRODUCTS, type Currency } from "@/lib/pricing/products";

/**
 * An amount paid in one currency, credited in another, at the catalogue's own parity (what
 * "Everything" costs in each). Deterministic and free: no exchange-rate API, and a buyer's credit
 * never moves with the market. Unknown currencies credit nothing.
 */
export function creditIn(amount: number, from: string, to: Currency): number {
  if (from === to) return amount;
  const fromList = PRODUCTS.everything.amounts[from as Currency];
  if (!fromList) return 0;
  return Math.floor((amount * PRODUCTS.everything.amounts[to]) / fromList);
}

/** What counts towards "upgrade to Everything for the difference". */
export const UPGRADE_CREDITED = ["single", "pick3", "extras"] as const;

export type PaidPurchase = { product: string; amount: number; currency: string; status: string };

/**
 * The owner's rule: Everything's price minus what the buyer already paid for singles, pick-threes
 * and "make it special", never less than the upgrade floor. Only paid purchases count; a refunded
 * one gave its money back.
 */
export function upgradeAmount(currency: Currency, purchases: PaidPurchase[]): number {
  const credit = purchases
    .filter((p) => p.status === "paid" && (UPGRADE_CREDITED as readonly string[]).includes(p.product))
    .reduce((sum, p) => sum + creditIn(Math.max(0, p.amount), p.currency, currency), 0);
  return Math.max(PRODUCTS.upgrade.amounts[currency], PRODUCTS.everything.amounts[currency] - credit);
}
