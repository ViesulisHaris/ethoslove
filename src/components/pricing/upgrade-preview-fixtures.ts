import { CHARGED_CURRENCIES, PRODUCTS, type Currency, type ProductId } from "@/lib/pricing/products";
import { upgradeOffer } from "@/lib/commerce/entitlements";
import { creditedPurchases, type PaidPurchase } from "@/lib/commerce/pricing";
import { occasionsAhead, sortedOccasion } from "@/lib/lifecycle/occasions-ahead";
import type { UpgradeAfterCard } from "./upgrade-after-purchase";

/**
 * The success page's upgrade card in each of its states, for the development-only preview
 * (/checkout/success/preview?state=…&currency=…): the real page needs a finished Stripe checkout,
 * and the dev server's database is production, where no test buys anything. Worked out with the same
 * functions the page uses, from purchases made up here.
 */
export const UPGRADE_PREVIEW_STATES = ["single", "pick3", "extras", "birthday", "earlier", "until"] as const;
export type UpgradePreviewState = (typeof UPGRADE_PREVIEW_STATES)[number];

export const isUpgradePreviewState = (value: unknown): value is UpgradePreviewState => typeof value === "string" && (UPGRADE_PREVIEW_STATES as readonly string[]).includes(value);

const DAY = 86_400_000;

export function previewUpgrade(state: UpgradePreviewState, asked: string | undefined, now = Date.now()): UpgradeAfterCard | null {
  const currency: Currency = CHARGED_CURRENCIES.find((c) => c === asked) ?? CHARGED_CURRENCIES[0];
  const bought: { product: ProductId; slugs: string[] } =
    state === "pick3" ? { product: "pick3", slugs: ["bouquet", "xoxo", "vinyl"] } : state === "extras" ? { product: "extras", slugs: ["the-letter"] } : state === "birthday" ? { product: "single", slugs: ["birthday-cinema"] } : { product: "single", slugs: ["bouquet"] };
  const paid = PRODUCTS[bought.product].amounts[currency];
  const made = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
  const purchases: PaidPurchase[] = [{ product: bought.product, amount: paid, currency, status: "paid", created_at: made(0) }];
  if (state === "earlier") purchases.push({ product: "pick3", amount: PRODUCTS.pick3.amounts[currency], currency, status: "paid", created_at: made(40) });
  // "until": as the card reads once a real deadline is switched on (UPGRADE_CREDIT_DAYS), here fourteen days.
  const window = state === "until" ? { now, days: 14 } : { now };
  const offer = upgradeOffer([], purchases, currency, window);
  if (!offer) return null;
  const sorted = sortedOccasion(bought.slugs);
  return {
    ...offer,
    full: PRODUCTS.everything.amounts[currency],
    paid,
    earlier: creditedPurchases(purchases, window).length > 1,
    sorted,
    ahead: occasionsAhead(sorted, new Date(now)),
  };
}
