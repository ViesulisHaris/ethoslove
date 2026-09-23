import { isPackId, type PackId } from "@/lib/games/packs";
import {
  BUMP,
  EVERY_TEMPLATE,
  PRODUCTS,
  bumpAmount,
  hasUnlock,
  rowsCoverPack,
  unlocksFor,
  type Currency,
  type ProductId,
} from "@/lib/pricing/products";
import { getManifest, isTemplateSlug } from "@/templates/manifests";
import { upgradeAmount, type PaidPurchase } from "./pricing";

/** purchases.kind: the product, or "bump" for a single or extras with every other template added. */
export type PurchaseKind = ProductId | "bump";

export type CheckoutRequest = {
  product: ProductId;
  templateSlugs: string[];
  packId?: string;
  addEverything?: boolean;
  currency: Currency;
};

/** What the server looked up about the buyer. Nothing in here comes from the client as-is. */
export type CheckoutContext = {
  signedIn: boolean;
  /** Unlock rows the buyer keeps for good (a pass's rows end with it, so they don't count). */
  ownedForever: string[];
  /** The buyer's purchases, for the upgrade price. */
  purchases: PaidPurchase[];
  /**
   * The active creator whose personal link (?ref=c-<code>) brought the buyer, credited with the
   * sale. Credit only: there is no buyer discount, so it never changes an amount.
   */
  creatorCode: string | null;
  /** Gift cards are built but only sold while GIFT_CARDS_ENABLED is "true" (giftCardsOnSale). */
  giftCardsOnSale: boolean;
};

export type PlanLine = { key: ProductId | "bump"; amount: number };

export type CheckoutPlan = {
  product: ProductId;
  kind: PurchaseKind;
  currency: Currency;
  /** What purchases.template_slugs records: the picked templates, or "pack:<id>" for a pack. */
  templateSlugs: string[];
  packId: PackId | null;
  bump: boolean;
  lines: PlanLine[];
  total: number;
  /** The creator credited with the sale (purchases.creator_code), or null. */
  creatorCode: string | null;
  /** The unlock rows fulfilment grants for good (a pass and a gift card have their own). */
  unlocks: string[];
};

export type PlanError = { error: string; status: number; needed?: number };

const fail = (error: string, status: number, extra: Partial<PlanError> = {}): { ok: false } & PlanError => ({ ok: false, error, status, ...extra });

function alreadyCovered(owned: string[], unlock: string): boolean {
  if (unlock === EVERY_TEMPLATE) return owned.includes(EVERY_TEMPLATE);
  if (unlock.startsWith("pack:")) return rowsCoverPack(owned, unlock.slice("pack:".length));
  return hasUnlock(owned, unlock);
}

/**
 * Checks a checkout request against the catalogue and works out every amount. Pure: the route
 * looks things up, this decides. Amounts only ever come from the catalogue (or, for an upgrade, from
 * what the buyer really paid), never from the request. There are no discounts: a creator is paid a
 * commission by us, and a reply to a paid gift is free without checkout (lib/commerce/free-reply.ts).
 */
export function planCheckout(req: CheckoutRequest, ctx: CheckoutContext): ({ ok: true } & CheckoutPlan) | ({ ok: false } & PlanError) {
  const { product, currency } = req;
  const catalogue = PRODUCTS[product];

  if (product === "giftcard" && !ctx.giftCardsOnSale) return fail("not_on_sale", 400);
  let slugs: string[] = [];
  if (product === "single" || product === "pick3" || product === "extras") {
    slugs = Array.from(new Set(req.templateSlugs.filter(isTemplateSlug)));
    if (slugs.length !== catalogue.picks) return fail("wrong_template_count", 400, { needed: catalogue.picks });
    // "Make it special" is the free templates' upgrade; a premium template is bought as a single.
    if (product === "extras" && getManifest(slugs[0])?.tier !== "free") return fail("extras_free_only", 400);
    // And the other way round: a free template's unlock is "Make it special" at its own price, never
    // the same unlock sold as a single for more.
    if (product === "single" && getManifest(slugs[0])?.tier !== "premium") return fail("single_premium_only", 400);
  }
  let packId: PackId | null = null;
  if (product === "pack") {
    if (!isPackId(req.packId)) return fail("invalid_pack", 400);
    packId = req.packId;
  }
  const bump = req.addEverything === true;
  if (bump && !BUMP.onto.includes(product)) return fail("bump_not_available", 400);
  // The bump takes the order to Everything's full price, so it only makes sense while that is what
  // every template costs this buyer. Once earlier purchases come off it (the upgrade), the paywall
  // hides the bump, and a page that still shows it can't charge more than the upgrade would.
  if (bump && upgradeAmount(currency, ctx.purchases) < PRODUCTS.everything.amounts[currency]) return fail("bump_not_available", 400);
  // The price depends on what the buyer already paid, so it needs to know who they are.
  if (product === "upgrade" && !ctx.signedIn) return fail("sign_in_required", 401);

  const unlocks = product === "pass" || product === "giftcard" ? [] : unlocksFor(product, slugs, { packId: packId ?? undefined });
  if (bump) unlocks.push(EVERY_TEMPLATE);
  if (unlocks.length > 0 && unlocks.every((u) => alreadyCovered(ctx.ownedForever, u))) return fail("already_owned", 409);

  const lines: PlanLine[] = [{ key: product, amount: product === "upgrade" ? upgradeAmount(currency, ctx.purchases) : catalogue.amounts[currency] }];
  // The bump takes the order to exactly Everything's price.
  if (bump) lines.push({ key: "bump", amount: bumpAmount(product, currency) });

  return {
    ok: true,
    product,
    kind: bump ? "bump" : product,
    currency,
    templateSlugs: packId ? [`pack:${packId}`] : slugs,
    packId,
    bump,
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    creatorCode: ctx.creatorCode,
    unlocks,
  };
}
