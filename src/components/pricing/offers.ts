import { INVITE_CODE_PATTERN } from "@/lib/commerce/codes";
import type { PublishDecision } from "@/lib/gift/publish";
import type { MembershipSummary } from "@/lib/membership/types";
import { BUMP, PRODUCTS, bumpAmount, type Currency, type MembershipPlan, type ProductId } from "@/lib/pricing/products";
import { membershipState, needsPayment } from "@/components/membership/status";

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
  /** Ethos for Two's plan. The server decides whether it is a subscription or the one-time year. */
  plan?: MembershipPlan;
  templateSlugs?: string[];
  packId?: string;
  addEverything?: boolean;
  returnTo?: string;
  locale?: "en" | "es";
  currency?: Currency;
  ref?: string;
  /** A gift card's personal touch, printed with the code in the buyer's email. */
  giftCard?: { recipientName?: string; note?: string };
};

export type CheckoutResult = { url: string } | { error: string };

/** Why checkout didn't open, as a key under money.checkoutErrors. */
export type CheckoutError = "alreadyOwned" | "alreadyMember" | "paymentIssue" | "notOnSale" | "signIn" | "tooMany" | "unavailable" | "network" | "generic";

export function checkoutErrorKey(error: string): CheckoutError {
  switch (error) {
    case "already_owned":
      return "alreadyOwned";
    case "already_member":
      return "alreadyMember";
    // Stripe is still collecting their last payment: a second subscription would charge twice.
    case "payment_issue":
      return "paymentIssue";
    // A page from before the switch changed (the monthly plan while subscriptions are off, the old pass while they're on).
    case "not_on_sale":
      return "notOnSale";
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
 * Whether the publish sheet is asking for money, the only time it may promise "One payment, no
 * subscription": a guest shown the paywall (or the sign-in that names the price on the way to it),
 * or a signed-in sender whose gift needs an unlock they can pay for here (Stripe, or the App Store's
 * sheet inside the app). A free template with nothing paid in it, a free reply, a template they
 * already own, a gift still being filled in and a build without payments ask for nothing.
 */
export function publishAsksForMoney(sheet: {
  authed: boolean;
  supabaseConfigured: boolean;
  inApp: boolean;
  paymentsEnabled: boolean;
  /** Something in the gift is paid for: a premium template that isn't a free reply, an extra, no footer. */
  wouldNeedPayment: boolean;
  /** lib/gift/publish.ts's rule for a signed-in sender; null until their entitlement is known. */
  decision: PublishDecision | null;
}): boolean {
  // A guest pays on the website only: inside the app they sign in first, and are asked after.
  if (!sheet.authed) return sheet.supabaseConfigured && !sheet.inApp && sheet.paymentsEnabled && sheet.wouldNeedPayment;
  return sheet.decision !== null && !sheet.decision.ok && sheet.decision.reason === "payment_required" && (sheet.paymentsEnabled || sheet.inApp);
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

/**
 * A pricing FAQ entry (messages pricing.faq). `id` marks the ones that depend on what is on sale:
 * "giftcard" while gift cards are sold, "subscriptions" while Ethos for Two is a subscription, and
 * "pass" while it is the one-time year instead. A question answered both ways has one of each.
 */
export type FaqItem = { q: string; a: string; id?: string; /** "forTwo": listed under Ethos for Two on /pricing. */ group?: "forTwo" };

/**
 * The questions worth asking: none about the gift card while it isn't sold, and each Ethos for Two answer only for the way it is sold now.
 * Generic over the entry so the catalogue's own JSON type (where `group` reads as a plain string) goes through as it is.
 */
export function pricingFaq<T extends Pick<FaqItem, "id">>(faq: readonly T[], onSale: { giftCards: boolean; subscriptions: boolean }): T[] {
  return faq.filter((item) => {
    if (item.id === "giftcard") return onSale.giftCards;
    if (item.id === "subscriptions") return onSale.subscriptions;
    if (item.id === "pass") return !onSale.subscriptions;
    return true;
  });
}

/**
 * The plan the pricing page opens on: yearly, unless the link asked for monthly and monthly is on
 * sale. While subscriptions are off there is only the year.
 */
export function initialPlan(value: string | null | undefined, subscriptions: boolean): MembershipPlan {
  return subscriptions && value === "monthly" ? "monthly" : "yearly";
}

/** The checkout body for Ethos for Two: the product and the plan, and never an amount. */
export function membershipRequest(plan: MembershipPlan): Pick<CheckoutRequest, "product" | "plan"> {
  return { product: "membership", plan };
}

/** Inside this many days of its end, a pass's owner is offered the renewal (while subscriptions are off). */
export const PASS_RENEW_WITHIN_DAYS = 30;
const DAY = 86_400_000;

/** The member card's line on the pricing page, a key under membership.member. */
export type HeroMemberLine =
  | "monthlyRenews"
  | "yearlyRenews"
  | "ends"
  | "passRuns"
  | "appStore"
  | "appStoreEnds"
  | "appStoreBilling"
  | "paymentFailed"
  | "paused"
  | "processing";

/**
 * What the pricing page's Ethos for Two shows a signed-in visitor, from GET /api/entitlements'
 * membership read through membershipState (the account section reads it the same way): the offer
 * to buy (nobody's member, or a membership that has ended), a pass year to renew (only while
 * subscriptions are off, in its last 30 days or when the link asked for it: a renewal is a year
 * from its end), or what they already have. Pure, so each case is unit tested.
 */
export type HeroMemberState =
  | { kind: "buy" }
  | { kind: "renew"; endsAt: string }
  | { kind: "partner" }
  | { kind: "member"; line: HeroMemberLine; date: string | null; needsPayment: boolean };

export function heroMemberState(membership: MembershipSummary | null, context: { subscriptions: boolean; renewAsked: boolean; now: number }): HeroMemberState {
  const state = membershipState(membership);
  const member = (line: HeroMemberLine, date: string | null = null): HeroMemberState => ({ kind: "member", line, date, needsPayment: needsPayment(state) });
  switch (state.kind) {
    case "none":
      return { kind: "buy" };
    case "partner":
      return { kind: "partner" };
    case "processing":
      return member("processing");
    case "renewing":
      return member(state.plan === "monthly" ? "monthlyRenews" : "yearlyRenews", state.date);
    case "cancelling":
      return member("ends", state.date);
    case "pastDue":
      return member("paymentFailed", state.date);
    case "paused":
      return member("paused");
    case "appStore":
      return member("appStore", state.date);
    case "appStoreEnding":
      return member("appStoreEnds", state.date);
    case "appStoreBilling":
      return member("appStoreBilling", state.date);
    case "pass": {
      const lastDays = Date.parse(state.date) - context.now <= PASS_RENEW_WITHIN_DAYS * DAY;
      // A pass bought on the web renews as a pass only while the pass is what's sold; with
      // subscriptions on, a running pass can't be carried into one (docs/MEMBERSHIP.md 8).
      if (state.web && !context.subscriptions && (lastDays || context.renewAsked)) return { kind: "renew", endsAt: state.date };
      return member("passRuns", state.date);
    }
  }
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
export type PurchaseOutcome = "gift" | "everything" | "pass" | "membership" | "giftcard" | "pack";

export function purchaseOutcome(sold: { product: ProductId; bump: boolean }): PurchaseOutcome {
  if (sold.product === "pass" || sold.product === "membership" || sold.product === "giftcard" || sold.product === "pack") return sold.product;
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

/**
 * Which "you already have one" to say (POST /api/for-two/join's has_own 409): another couple's
 * membership they joined, which they can leave; their own that ends on a date; or their own that
 * renews by itself. Cancelling keeps a membership to its period end, so "cancel yours first" was
 * never advice that worked. A body without the details (an older server) gets the renewing words.
 */
export function hasOwnMessage(body: Record<string, unknown>): { key: "hasOwn" | "hasOwnUntil" | "hasOwnPartner"; endsAt: string | null } {
  if (body.role === "partner") return { key: "hasOwnPartner", endsAt: null };
  const endsAt = typeof body.endsAt === "string" && !Number.isNaN(Date.parse(body.endsAt)) ? body.endsAt : null;
  return endsAt ? { key: "hasOwnUntil", endsAt } : { key: "hasOwn", endsAt: null };
}

/** Why joining a pass failed, as a key under money.join.errors (lib/commerce/passes.ts joinPass). */
export type JoinError = "notFound" | "taken" | "own" | "hasOwn" | "expired" | "signIn" | "tooMany" | "generic";

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
    // They have an Ethos for Two of their own running: two memberships for one person would pay twice.
    case "has_own":
      return "hasOwn";
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
