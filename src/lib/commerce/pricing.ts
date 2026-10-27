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

/**
 * How many days a purchase counts towards the upgrade, from the day it was made; null: for as long
 * as it stays paid. The owner's decision (22 Oct 2026): the credit doesn't run out, so no page says
 * it does. To give it a real deadline later, set a number here. Every quote (the success page, the
 * account page, the receipt, the paywall) and checkout itself read purchases with
 * PURCHASE_CREDIT_COLUMNS and go through creditedPurchases, so they narrow together, and the offer
 * then carries the day the credit ends (upgradeOffer's `creditUntil`) for the page to say so. Only
 * ever a real deadline (UCPD Annex I No 7): never a countdown that starts again.
 */
export const UPGRADE_CREDIT_DAYS: number | null = null;

/** The columns of `purchases` every upgrade quote reads: created_at is the window's start. */
export const PURCHASE_CREDIT_COLUMNS = "product, amount, currency, status, created_at";

export type PaidPurchase = { product: string; amount: number; currency: string; status: string; created_at?: string | null };

/** `days` stands in for UPGRADE_CREDIT_DAYS (tests try both); `now` is when the quote is made. */
export type CreditOptions = { now?: number; days?: number | null };

const DAY_MS = 24 * 60 * 60 * 1000;
const windowOf = (options: CreditOptions) => (options.days === undefined ? UPGRADE_CREDIT_DAYS : options.days);

/**
 * The purchases that count towards the upgrade: paid (a refunded one gave its money back), a single,
 * a pick three or "make it special", and, while a window is on, made inside it. With a window on, a
 * purchase whose date wasn't read can't be shown to be inside it, so it doesn't count.
 */
export function creditedPurchases(purchases: PaidPurchase[], options: CreditOptions = {}): PaidPurchase[] {
  const days = windowOf(options);
  const now = options.now ?? Date.now();
  return purchases.filter((p) => {
    if (p.status !== "paid" || !(UPGRADE_CREDITED as readonly string[]).includes(p.product)) return false;
    if (days === null) return true;
    const madeAt = p.created_at ? Date.parse(p.created_at) : Number.NaN;
    return Number.isFinite(madeAt) && now - madeAt <= days * DAY_MS;
  });
}

/**
 * When the price next goes up because a credited purchase leaves the window: the earliest end among
 * them, ISO. Null while there is no window, which is today.
 */
export function creditEndsAt(purchases: PaidPurchase[], options: CreditOptions = {}): string | null {
  const days = windowOf(options);
  if (days === null) return null;
  const ends = creditedPurchases(purchases, options).map((p) => Date.parse(p.created_at!) + days * DAY_MS);
  return ends.length > 0 ? new Date(Math.min(...ends)).toISOString() : null;
}

/**
 * The owner's rule: Everything's price minus what the buyer already paid for singles, pick-threes
 * and "make it special", never less than the upgrade floor. It is credit for what they paid, not a
 * discount: a buyer who upgrades has paid exactly what Everything costs up front.
 */
export function upgradeAmount(currency: Currency, purchases: PaidPurchase[], options: CreditOptions = {}): number {
  const credit = creditedPurchases(purchases, options).reduce((sum, p) => sum + creditIn(Math.max(0, p.amount), p.currency, currency), 0);
  return Math.max(PRODUCTS.upgrade.amounts[currency], PRODUCTS.everything.amounts[currency] - credit);
}
