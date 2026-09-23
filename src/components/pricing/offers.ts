import { INVITE_CODE_PATTERN } from "@/lib/commerce/codes";
import { BUMP, PRODUCTS, bumpAmount, type Currency, type ProductId } from "@/lib/pricing/products";

/**
 * What the paywall, the pricing page and the account page offer, worked out from the catalogue
 * (lib/pricing/products.ts) and nothing else, so a price on a page is the price checkout charges.
 * Pure, so the rules are unit tested and every surface draws the same offer.
 */

/**
 * The body POST /api/stripe/checkout takes. Amounts never travel: the server reads its catalogue.
 * No codes either: a creator is credited through the ref of their personal link, and a reply to a
 * paid gift is free without checkout.
 */
export type CheckoutRequest = {
  product: ProductId;
  templateSlugs?: string[];
  packId?: string;
  addEverything?: boolean;
  returnTo?: string;
  locale?: "en" | "es";
  currency?: Currency;
  ref?: string;
  /** A gift card's personal touch, printed with the code in the buyer's email. */
  giftCard?: { recipientName?: string; note?: string };
  /** The unticked box under the pay button: one email with a link back if they don't finish paying. */
  remindMe?: boolean;
};

export type CheckoutResult = { url: string } | { error: string };

/** Why checkout didn't open, as a key under money.checkoutErrors. */
export type CheckoutError = "alreadyOwned" | "signIn" | "tooMany" | "unavailable" | "network" | "generic";

export function checkoutErrorKey(error: string): CheckoutError {
  switch (error) {
    case "already_owned":
      return "alreadyOwned";
    case "sign_in_required":
    case "unauthenticated":
      return "signIn";
    case "rate_limited":
      return "tooMany";
    case "payments_not_configured":
      return "unavailable";
    case "network":
      return "network";
    default:
      return "generic";
  }
}

/** The limits POST /api/stripe/checkout puts on a gift card's name and note. */
export const GIFT_CARD_NAME_MAX = 60;
export const GIFT_CARD_NOTE_MAX = 300;

/** The gift card's name and note as checkout takes them: trimmed, capped, and left out when empty. */
export function giftCardTouch(recipientName: string, note: string): CheckoutRequest["giftCard"] {
  const name = recipientName.trim().slice(0, GIFT_CARD_NAME_MAX);
  const text = note.trim().slice(0, GIFT_CARD_NOTE_MAX);
  if (!name && !text) return undefined;
  return { ...(name ? { recipientName: name } : {}), ...(text ? { note: text } : {}) };
}

/** The row for the gift being made: the template itself, or, when the template is free, its extras. */
export type TemplatePlan = "single" | "extras";
/** Every template, forever: at full price, or for the difference when earlier purchases count. */
export type EverythingPlan = "everything" | "upgrade";
export type PaywallPlan = TemplatePlan | EverythingPlan;

export type UpgradeQuote = { amount: number; currency: Currency };

export function templatePlan(tier: "free" | "premium"): TemplatePlan {
  return tier === "free" ? "extras" : "single";
}

/**
 * The "every template" row. The upgrade replaces it only when it is really cheaper, in the currency
 * on the page: a quote in another currency can't be compared, and one at the full price is just
 * Everything under a longer name.
 */
export function everythingPlan(currency: Currency, upgrade: UpgradeQuote | null | undefined): { plan: EverythingPlan; amount: number } {
  const full = PRODUCTS.everything.amounts[currency];
  if (upgrade && upgrade.currency === currency && upgrade.amount > 0 && upgrade.amount < full) return { plan: "upgrade", amount: upgrade.amount };
  return { plan: "everything", amount: full };
}

/**
 * The row the paywall opens on: this gift's own, unless every template already costs no more than it
 * (a returning buyer's upgrade for the difference). Opening on the dearer row that gives less would
 * only cost them money.
 */
export function defaultPaywallPlan(forTemplate: TemplatePlan, all: { plan: EverythingPlan; amount: number }, currency: Currency): PaywallPlan {
  return all.plan === "upgrade" && all.amount <= PRODUCTS[forTemplate].amounts[currency] ? "upgrade" : forTemplate;
}

/**
 * The order bump rides along with a single template or a "make it special", and takes the order to
 * exactly Everything's price. It is only offered while that is what every template costs this buyer:
 * once earlier purchases come off Everything (the upgrade row), the template plus the bump would cost
 * more than the upgrade for the same thing.
 */
export function bumpOffered(plan: PaywallPlan, all: { plan: EverythingPlan }): boolean {
  return BUMP.onto.includes(plan) && all.plan === "everything";
}

/**
 * "Or pick any three": a premium-template offer, and only while three cost less than every template
 * does for this buyer (an upgrade for the difference can cost less than three).
 */
export function pick3Offered(tier: "free" | "premium", currency: Currency, all: { amount: number }): boolean {
  return tier === "premium" && PRODUCTS.pick3.amounts[currency] < all.amount;
}

/** What the pay button says: the plan, plus the bump when it is shown and ticked (then Everything's price). */
export function payTotal(plan: PaywallPlan, planAmount: number, bumpOn: boolean, currency: Currency): number {
  return planAmount + (bumpOn && BUMP.onto.includes(plan) ? bumpAmount(plan, currency) : 0);
}

/** The checkout body for a paywall choice. The bump goes with the template rows only. */
export function paywallRequest(input: { plan: PaywallPlan; slug: string; bump: boolean }): Pick<CheckoutRequest, "product" | "templateSlugs" | "addEverything"> {
  const forTemplate = input.plan === "single" || input.plan === "extras";
  return {
    product: input.plan,
    templateSlugs: forTemplate ? [input.slug] : [],
    ...(forTemplate && input.bump ? { addEverything: true } : {}),
  };
}

/** The pricing page's pick-three picker, opened with this template already chosen, coming back to the gift afterwards. */
export function pick3Href(slug: string, returnTo: string): string {
  return `/pricing?${new URLSearchParams({ template: slug, plan: "pick3", return: returnTo }).toString()}`;
}

/**
 * "Send one back" from a paid premium gift opens /create/<slug>?reply=<token> (lib/commerce/
 * reply-token.ts). The browser can't open a token, only tell one from junk: the server decides
 * whether it holds. Same shape as the server's REPLY_TOKEN_PATTERN.
 */
const REPLY_TOKEN_SHAPE = /^[A-Za-z0-9_-]{40,256}$/;

export function replyTokenFrom(value: string | null | undefined): string | undefined {
  const token = value?.trim();
  return token && REPLY_TOKEN_SHAPE.test(token) ? token : undefined;
}

/**
 * Where the editor picks up after signing in or paying: publishing, and still a free reply when it
 * was one, because the token is read from this URL and a sign-in reloads the page.
 */
export function resumePath(slug: string, replyToken?: string): string {
  return `/create/${slug}?resume=publish${replyToken ? `&reply=${encodeURIComponent(replyToken)}` : ""}`;
}

/** A pricing FAQ entry (messages pricing.faq). `id` marks the ones about something that can be off sale. */
export type FaqItem = { q: string; a: string; id?: string };

/** The questions worth asking: none about the gift card while it isn't sold (giftCardsOnSale). */
export function pricingFaq(faq: FaqItem[], onSale: { giftCards: boolean }): FaqItem[] {
  return faq.filter((item) => onSale.giftCards || item.id !== "giftcard");
}

/** A partner invite from the link they were sent, pasted whole, or from the bare code. */
export function inviteCodeFrom(input: string): string | null {
  const value = input.trim();
  let code = value;
  try {
    code = new URL(value).searchParams.get("code") ?? "";
  } catch {
    // Not a link: the code itself.
  }
  code = code.trim().toLowerCase();
  return INVITE_CODE_PATTERN.test(code) ? code : null;
}

/** What a finished checkout handed over, which is what the success page talks about. */
export type PurchaseOutcome = "gift" | "everything" | "pass" | "giftcard" | "pack";

export function purchaseOutcome(sold: { product: ProductId; bump: boolean }): PurchaseOutcome {
  if (sold.product === "pass" || sold.product === "giftcard" || sold.product === "pack") return sold.product;
  // The order bump and the upgrade both end in "*": the buyer now has every template.
  if (sold.product === "everything" || sold.product === "upgrade" || sold.bump) return "everything";
  return "gift";
}

/**
 * Checkout's own rule for a return address (api/stripe/checkout): a path on this site. Browsers read
 * "/\evil.example" as "//evil.example" and drop tabs and newlines, so those are refused with "//".
 * A path checkout would refuse is replaced here, before it can turn a purchase into an error.
 */
const SAME_SITE_PATH = /^\/(?![/\\])[^\\\s\p{Cc}]*$/u;
const RETURN_PATH_MAX = 300;

export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  return value && value.length <= RETURN_PATH_MAX && SAME_SITE_PATH.test(value) ? value : fallback;
}

/**
 * Why a redemption failed, as a key under money.redeem.errors, from POST /api/gift-cards/redeem's
 * error (lib/commerce/gift-cards.ts) or its status. Anything unknown reads as a general failure.
 */
export type RedeemError = "notFound" | "used" | "expired" | "voided" | "owned" | "signIn" | "tooMany" | "generic";

export function redeemErrorKey(error: string | undefined, status?: number): RedeemError {
  if (status === 401) return "signIn";
  if (status === 429) return "tooMany";
  switch (error) {
    case "not_found":
    case "invalid_code":
    case "invalid_input":
      return "notFound";
    case "already_redeemed":
      return "used";
    case "expired":
      return "expired";
    case "voided":
      return "voided";
    case "already_owned":
      return "owned";
    case "sign_in_required":
    case "unauthenticated":
      return "signIn";
    case "rate_limited":
      return "tooMany";
    default:
      return "generic";
  }
}

/** Why joining a pass failed, as a key under money.join.errors (lib/commerce/passes.ts joinPass). */
export type JoinError = "notFound" | "taken" | "own" | "expired" | "signIn" | "tooMany" | "generic";

export function joinErrorKey(error: string | undefined, status?: number): JoinError {
  if (status === 401) return "signIn";
  if (status === 429) return "tooMany";
  switch (error) {
    case "not_found":
    case "invalid_code":
    case "invalid_input":
      return "notFound";
    case "taken":
      return "taken";
    case "own_pass":
      return "own";
    case "expired":
      return "expired";
    case "sign_in_required":
    case "unauthenticated":
      return "signIn";
    case "rate_limited":
      return "tooMany";
    default:
      return "generic";
  }
}
