import { isPackId, type PackId } from "@/lib/games/packs";
import {
  BUMP,
  EVERY_TEMPLATE,
  PERSONAL_PRICE,
  PRODUCTS,
  SECOND_GIFT,
  bumpAmount,
  extrasAmount,
  groupAmount,
  groupRows,
  hasGroupUnlock,
  hasPhotosUnlock,
  hasUnlock,
  membershipAmount,
  rowsCoverPack,
  unlocksFor,
  type Currency,
  type MembershipPlan,
  type ProductId,
} from "@/lib/pricing/products";
import type { MembershipProvider, MembershipStatus } from "@/lib/membership/types";
import { sellsNotePhotos } from "@/lib/gift/free-tier";
import { getManifest, isTemplateSlug } from "@/templates/manifests";
import { upgradeAmount, type PaidPurchase } from "./pricing";
import { pairAllowed, type PairRefusal } from "./gift-credits";

/**
 * purchases.kind: the product, "bump" for a single or extras with every other template added,
 * "second" for a single with a second gift, "group_addon" for a group card bought by someone who
 * already held its template (the step up: it grants the group row only, never the template again),
 * or "with_pair" for a single or extras with two more gifts added (a reader who came from a reminder e-mail).
 */
export type PurchaseKind = ProductId | "bump" | "second" | "group_addon" | "with_pair";

export type CheckoutRequest = {
  product: ProductId;
  templateSlugs: string[];
  packId?: string;
  addEverything?: boolean;
  /** The second gift's template (SECOND_GIFT), picked on the pay sheet; only ever with a single. */
  secondSlug?: string;
  currency: Currency;
  /** Ethos for Two: which plan. The server decides whether that is a subscription or the pass. */
  plan?: MembershipPlan;
  /**
   * The pay sheet showed the buyer their personal price (PERSONAL_PRICE) and asks for it. Charged only
   * while the server still finds it (CheckoutContext.personalPrice); otherwise refused, never quietly
   * charged at the full price the buyer didn't see.
   */
  personalPrice?: boolean;
  /**
   * Two more gifts added to this gift, in the same payment ("Or this one and your next two"): offered
   * only to a reader who came from a reminder e-mail, on a single or "Make it special".
   */
  addPair?: boolean;
};

/** The buyer's own membership, as checkout needs to know it (lib/commerce/memberships.ts membershipContextOf). */
export type MembershipContext = { running: boolean; isOwner: boolean; provider: MembershipProvider; status: MembershipStatus };

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
  /** STRIPE_SUBSCRIPTIONS_ENABLED (subscriptionsEnabled): Ethos for Two as a subscription, or as the one-time pass. */
  subscriptions?: boolean;
  /** The buyer's running membership, else a subscription Stripe is still collecting; null for a guest. */
  membership?: MembershipContext | null;
  /** The personal price the request's cookie holds, checked and not spent (lib/commerce/personal-price.ts); null without one. */
  personalPrice?: { id: string } | null;
  /** Group cards are sold only while groupGiftsEnabled() (lib/group/flag.ts); absent or false, product "group" is refused. */
  groupOnSale?: boolean;
  /**
   * Every unlock row the buyer can use today: what they keep for good and what a running membership
   * lends them. Decides a group card's price (whoever holds the template pays the step up). Absent,
   * only `ownedForever` counts.
   */
  heldNow?: string[];
  /**
   * Two more gifts (product "pair"): what pairAllowed needs, looked up only for that product. Absent,
   * the product is refused as not on sale.
   */
  pair?: { onSale: boolean; ready: number | null; memberRunning: boolean; paidProducts: string[] };
  /**
   * Two more gifts added to a gift (CheckoutRequest.addPair): whether they are on sale and the table
   * they live in is there, and how many the buyer has ready (0 for a guest; null when the table isn't
   * there). Absent, addPair is refused.
   */
  addPair?: { onSale: boolean; ready: number | null };
};

export type PlanLine = { key: ProductId | "bump" | "second"; amount: number };

export type CheckoutPlan = {
  product: ProductId;
  kind: PurchaseKind;
  currency: Currency;
  /** What purchases.template_slugs records: the picked templates, or "pack:<id>" for a pack. */
  templateSlugs: string[];
  packId: PackId | null;
  bump: boolean;
  /** The second gift's template, or null. */
  second: string | null;
  /** Two more gifts added to the gift (kind "with_pair"): fulfilment puts them on the account. */
  pair?: boolean;
  lines: PlanLine[];
  total: number;
  /** The creator credited with the sale (purchases.creator_code), or null. */
  creatorCode: string | null;
  /** The unlock rows fulfilment grants for good (a pass, a membership and a gift card have their own). */
  unlocks: string[];
  /** Ethos for Two's plan (a pass is "yearly"); null for everything else. */
  plan: MembershipPlan | null;
  /** A subscription is only ever Ethos for Two; everything else, the pass included, is paid once. */
  billing: "one_time" | "subscription";
  /** The personal price charged (its link's account id) and how much it took off the catalogue price; null at full price. */
  personalPrice: { id: string; discount: number } | null;
};

export type PlanError = { error: string; status: number; needed?: number };

const fail = (error: string, status: number, extra: Partial<PlanError> = {}): { ok: false } & PlanError => ({ ok: false, error, status, ...extra });

function alreadyCovered(owned: string[], unlock: string): boolean {
  if (unlock === EVERY_TEMPLATE) return owned.includes(EVERY_TEMPLATE);
  if (unlock.startsWith("pack:")) return rowsCoverPack(owned, unlock.slice("pack:".length));
  // A note with photos is covered by its own row or by the template's unlock, which holds everything.
  if (unlock.startsWith("photos:")) return hasPhotosUnlock(owned, unlock.slice("photos:".length));
  // A group card only by its own row ("group:<slug>" or "group:*"): Everything's "*" is templates.
  if (unlock.startsWith("group:")) return hasGroupUnlock(owned, unlock.slice("group:".length));
  return hasUnlock(owned, unlock);
}

/**
 * Checks a checkout request against the catalogue and works out every amount. Pure: the route
 * looks things up, this decides. Amounts only ever come from the catalogue (or, for an upgrade, from
 * what the buyer really paid), never from the request. There are no discounts: a creator is paid a
 * commission by us, and a reply to a paid gift is free without checkout (lib/commerce/free-reply.ts).
 * The one exception is a personal price from an offer email (PERSONAL_PRICE), which the route has
 * checked before it gets here.
 */
export function planCheckout(req: CheckoutRequest, ctx: CheckoutContext): ({ ok: true } & CheckoutPlan) | ({ ok: false } & PlanError) {
  const { currency } = req;
  if (req.product === "pair") return planPair(req, ctx);
  if (req.addPair && req.product !== "single" && req.product !== "extras") return fail("pair_not_available", 400);
  // A personal price is for one gift (PERSONAL_PRICE.onto), and only while it still holds.
  if (req.personalPrice) {
    if (!PERSONAL_PRICE.onto.includes(req.product)) return fail("personal_price_unavailable", 400);
    if (!ctx.personalPrice) return fail("personal_price_ended", 409);
  }
  if (req.product === "membership" || req.product === "pass") {
    const membership = planMembership(req, ctx);
    if (!membership.ok) return membership;
    if (membership.product === "membership") {
      if (req.addEverything) return fail("bump_not_available", 400);
      return {
        ok: true,
        product: "membership",
        kind: "membership",
        currency,
        templateSlugs: [],
        packId: null,
        bump: false,
        second: null,
        lines: [{ key: "membership", amount: membershipAmount(membership.plan, currency) }],
        total: membershipAmount(membership.plan, currency),
        creatorCode: ctx.creatorCode,
        // A membership has its own grant (lib/commerce/memberships.ts), like the pass.
        unlocks: [],
        plan: membership.plan,
        billing: "subscription",
        personalPrice: null,
      };
    }
  }
  const product = req.product === "membership" ? "pass" : req.product;
  const catalogue = PRODUCTS[product];

  if (product === "giftcard" && !ctx.giftCardsOnSale) return fail("not_on_sale", 400);
  // Built, and switched off until GROUP_GIFTS_ENABLED and a template made for it (lib/group/flag.ts).
  if (product === "group" && !ctx.groupOnSale) return fail("not_on_sale", 400);
  let slugs: string[] = [];
  if (product === "single" || product === "pick3" || product === "extras" || product === "photos" || product === "group") {
    slugs = Array.from(new Set(req.templateSlugs.filter(isTemplateSlug)));
    if (slugs.length !== catalogue.picks) return fail("wrong_template_count", 400, { needed: catalogue.picks });
    // A note with photos is sold only where the free version is the short note (The Letter).
    if (product === "photos" && !sellsNotePhotos(getManifest(slugs[0]))) return fail("photos_note_only", 400);
    // "Make it special" is the free templates' upgrade; a premium template is bought as a single.
    if (product === "extras" && getManifest(slugs[0])?.tier !== "free") return fail("extras_free_only", 400);
    // And the other way round: a free template's unlock is "Make it special" at its own price, never
    // the same unlock sold as a single for more.
    if (product === "single" && getManifest(slugs[0])?.tier !== "premium") return fail("single_premium_only", 400);
    // A group card is sold only on a template made for one.
    if (product === "group" && !getManifest(slugs[0])?.features.group) return fail("not_group_template", 400);
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
  // The second gift: one more premium template, only on a single and never with the bump (every
  // template already includes it), and never one the buyer has or is buying now.
  const second = req.secondSlug ?? null;
  if (second !== null) {
    if (!SECOND_GIFT.onto.includes(product) || bump) return fail("second_not_available", 400);
    if (!isTemplateSlug(second) || getManifest(second)?.tier !== "premium" || slugs.includes(second)) return fail("second_not_available", 400);
    if (alreadyCovered(ctx.ownedForever, second)) return fail("second_owned", 409);
  }
  // The price depends on what the buyer already paid, so it needs to know who they are. So does a
  // group card's: it is the step up for whoever holds the template, and it is bought from a draft
  // that already belongs to an account.
  if ((product === "upgrade" || product === "group") && !ctx.signedIn) return fail("sign_in_required", 401);

  // A group card includes its template; whoever holds the template today (for good, or through a
  // running membership) pays the difference and is granted group cards only.
  const heldNow = ctx.heldNow ?? ctx.ownedForever;
  const groupKind: PurchaseKind | null = product === "group" ? (hasUnlock(heldNow, slugs[0]) ? "group_addon" : "group") : null;
  const unlocks = product === "pass" || product === "giftcard" ? [] : groupKind ? groupRows(slugs[0], groupKind) : unlocksFor(product, slugs, { packId: packId ?? undefined });
  // addEverything on a pass is refused above (the bump only rides on a single or extras).
  if (bump) unlocks.push(EVERY_TEMPLATE);
  if (second) unlocks.push(second);
  if (unlocks.length > 0 && unlocks.every((u) => alreadyCovered(ctx.ownedForever, u))) return fail("already_owned", 409);

  // Two more gifts with this one: only on a gift of one template, never with anything else added,
  // while they are on sale, and never to a buyer with gifts ready or every template already.
  const pair = req.addPair === true;
  if (pair) {
    if ((product !== "single" && product !== "extras") || bump || second !== null || req.personalPrice) return fail("pair_not_available", 400);
    const allowed = ctx.addPair;
    if (!allowed?.onSale || allowed.ready === null) return fail("not_on_sale", 400);
    if (allowed.ready > 0) return fail("pair_ready", 409);
    if (ctx.ownedForever.includes(EVERY_TEMPLATE)) return fail("already_owned", 409);
  }

  // Never with the bump or a second gift: the price is for one gift.
  const personal = req.personalPrice && ctx.personalPrice ? ctx.personalPrice : null;
  if (personal && (bump || second !== null)) return fail("personal_price_unavailable", 400);
  // "Make it special" for someone who already paid for a note with photos is the difference.
  const listed =
    product === "upgrade"
      ? upgradeAmount(currency, ctx.purchases)
      : product === "extras"
        ? extrasAmount(currency, ctx.ownedForever, slugs[0])
        : product === "group"
          ? groupAmount(currency, heldNow, slugs[0])
          : catalogue.amounts[currency];
  const charged = personal ? Math.min(listed, PERSONAL_PRICE.amounts[currency]) : listed;
  const lines: PlanLine[] = [{ key: product, amount: charged }];
  // The bump takes the order to exactly Everything's price.
  if (bump) lines.push({ key: "bump", amount: bumpAmount(product, currency) });
  if (second) lines.push({ key: "second", amount: SECOND_GIFT.amounts[currency] });
  if (pair) lines.push({ key: "pair", amount: PRODUCTS.pair.amounts[currency] });

  return {
    ok: true,
    product,
    kind: bump ? "bump" : second ? "second" : pair ? "with_pair" : (groupKind ?? product),
    currency,
    templateSlugs: packId ? [`pack:${packId}`] : slugs,
    packId,
    bump,
    second,
    ...(pair ? { pair: true } : {}),
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    creatorCode: ctx.creatorCode,
    unlocks,
    plan: product === "pass" ? "yearly" : null,
    billing: "one_time",
    personalPrice: personal ? { id: personal.id, discount: listed - charged } : null,
  };
}

const PAIR_STATUS: Record<PairRefusal, number> = { not_on_sale: 400, sign_in_required: 401, pair_ready: 409, already_owned: 409, pair_needs_purchase: 403 };

/**
 * Two more gifts: one line at the catalogue price, nothing added to it, and only for whom
 * pairAllowed says (lib/commerce/gift-credits.ts). It grants gifts ready, not unlock rows.
 */
function planPair(req: CheckoutRequest, ctx: CheckoutContext): ({ ok: true } & CheckoutPlan) | ({ ok: false } & PlanError) {
  if (req.addPair) return fail("pair_not_available", 400);
  if (req.addEverything) return fail("bump_not_available", 400);
  if (req.secondSlug !== undefined) return fail("second_not_available", 400);
  if (req.personalPrice) return fail("personal_price_unavailable", 400);
  const pair = ctx.pair;
  const allowed = pairAllowed({
    onSale: pair?.onSale === true,
    signedIn: ctx.signedIn,
    ready: pair ? pair.ready : null,
    ownedForever: ctx.ownedForever,
    memberRunning: pair?.memberRunning === true,
    paidProducts: pair?.paidProducts ?? [],
  });
  if (!allowed.ok) return fail(allowed.error, PAIR_STATUS[allowed.error]);
  const amount = PRODUCTS.pair.amounts[req.currency];
  return {
    ok: true,
    product: "pair",
    kind: "pair",
    currency: req.currency,
    templateSlugs: [],
    packId: null,
    bump: false,
    second: null,
    lines: [{ key: "pair", amount }],
    total: amount,
    creatorCode: ctx.creatorCode,
    unlocks: [],
    plan: null,
    billing: "one_time",
    personalPrice: null,
  };
}

/**
 * Ethos for Two, whichever way it is asked for: `{ product: "membership", plan }` (the pricing page
 * from now on) or `{ product: "pass" }` (pages from before). STRIPE_SUBSCRIPTIONS_ENABLED decides what
 * is sold: a monthly or yearly subscription, or, while it is off, the one-time year (the pass).
 * Nobody is sold a second membership while one runs or while Stripe is still collecting one: that
 * would charge twice for one thing. The one exception is today's pass renewal, a year added from the
 * end of the owner's running pass.
 */
function planMembership(req: CheckoutRequest, ctx: CheckoutContext): { ok: true; product: "membership" | "pass"; plan: MembershipPlan } | ({ ok: false } & PlanError) {
  if (req.product === "membership" && !req.plan) return fail("invalid_input", 400);
  const subscriptions = ctx.subscriptions === true;
  if (!subscriptions && req.plan === "monthly") return fail("not_on_sale", 400);
  if (subscriptions && req.product === "pass") return fail("not_on_sale", 400);
  const own = ctx.membership ?? null;
  // A second subscription while Stripe still collects the first would charge twice: the account page
  // is where the card gets updated.
  if (own?.isOwner && own.provider === "stripe_subscription" && (own.status === "past_due" || own.status === "incomplete")) return fail("payment_issue", 409);
  if (own?.running) {
    const passRenewal = !subscriptions && own.isOwner && (own.provider === "stripe_pass" || own.provider === "app_store_pass");
    if (!passRenewal) return fail("already_member", 409);
  }
  return subscriptions ? { ok: true, product: "membership", plan: req.plan ?? "yearly" } : { ok: true, product: "pass", plan: "yearly" };
}
