/**
 * Pricing catalogue: the one place a price lives. Amounts are minor units, VAT included. Checkout
 * charges these exact numbers through Stripe `price_data` (lib/stripe/line-items.ts), so the price on
 * the page is the price charged by construction; nothing in Stripe has to be kept in step with it.
 * STRIPE_PRODUCT_* only names the Stripe Product a line is filed under, for reporting. Every product
 * is a one-time payment except one: Ethos for Two ("membership") is a subscription. The Stripe
 * account is shared with businesses whose webhooks act on subscription events, so every Ethos
 * subscription follows the rules in docs/MEMBERSHIP.md 2.1 (its own metadata keys, no standing
 * Prices, no trials), and while STRIPE_SUBSCRIPTIONS_ENABLED is off it is sold as the one-time
 * yearly pass instead.
 */
export type ProductId = "single" | "pick3" | "everything" | "extras" | "pass" | "membership" | "pack" | "giftcard" | "upgrade";
export type MembershipPlan = "monthly" | "yearly";
/** The three template plans the pricing page shows as cards. */
export type PlanId = "single" | "pick3" | "everything";
export type Currency = "usd" | "eur" | "gbp";

export type Product = {
  id: ProductId;
  /** How many template slugs the buyer picks (Infinity = all, 0 = the product isn't about templates). */
  picks: number;
  /** For "upgrade" this is the floor: the real price is worked out per buyer (lib/commerce/pricing.ts). */
  amounts: Record<Currency, number>;
  /** "from" price shown struck through on the pricing page (in minor units). */
  compareAt?: Record<Currency, number>;
  highlight: boolean;
  /** The Stripe Product a line is filed under when this env var is set; otherwise one is made inline. */
  envProductKey: `STRIPE_PRODUCT_${string}`;
  /** What Stripe's page and receipt call it when no Stripe Product is set, and always for a Spanish buyer (lib/stripe/line-items.ts). */
  name: Record<"en" | "es", string>;
};

/** Ethos for Two as a subscription: one payment covers the couple. Minor units, VAT included. */
export const MEMBERSHIP_PLANS: Record<MembershipPlan, { interval: "month" | "year"; amounts: Record<Currency, number> }> = {
  monthly: { interval: "month", amounts: { eur: 499, usd: 599, gbp: 449 } },
  yearly: { interval: "year", amounts: { eur: 2999, usd: 3499, gbp: 2599 } },
};
export const membershipAmount = (plan: MembershipPlan, currency: Currency) => MEMBERSHIP_PLANS[plan].amounts[currency];
/** The yearly price per month, to the cent: what "€2.50 a month" shows. */
export const yearlyPerMonth = (currency: Currency) => Math.round(MEMBERSHIP_PLANS.yearly.amounts[currency] / 12);
/** How much less a yearly year costs than twelve months, whole percent (50 in euros). */
export const yearlySavingPct = (currency: Currency) =>
  Math.round((1 - MEMBERSHIP_PLANS.yearly.amounts[currency] / (12 * MEMBERSHIP_PLANS.monthly.amounts[currency])) * 100);
export const isMembershipPlan = (v: unknown): v is MembershipPlan => v === "monthly" || v === "yearly";
/** Free accounts keep this many saved dates and trips; members, any number. */
export const FREE_SAVED_DATES = 3;
/**
 * Whether Ethos for Two is sold as a real subscription. Server-side only, like giftCardsOnSale: the
 * browser reads false, so pages pass it down as a prop. Off, the membership is the one-time pass.
 */
export function subscriptionsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.STRIPE_SUBSCRIPTIONS_ENABLED === "true";
}

export const PRODUCTS: Record<ProductId, Product> = {
  single: { id: "single", picks: 1, amounts: { usd: 1199, eur: 999, gbp: 899 }, highlight: false, envProductKey: "STRIPE_PRODUCT_SINGLE", name: { en: "Ethos: one template, forever", es: "Ethos: una plantilla, para siempre" } },
  pick3: { id: "pick3", picks: 3, amounts: { usd: 1799, eur: 1499, gbp: 1299 }, compareAt: { usd: 3597, eur: 2997, gbp: 2697 }, highlight: false, envProductKey: "STRIPE_PRODUCT_PICK3", name: { en: "Ethos: three templates, forever", es: "Ethos: tres plantillas, para siempre" } },
  everything: { id: "everything", picks: Infinity, amounts: { usd: 2999, eur: 2499, gbp: 2199 }, highlight: true, envProductKey: "STRIPE_PRODUCT_EVERYTHING", name: { en: "Ethos: every template, forever", es: "Ethos: todas las plantillas, para siempre" } },
  // The Letter's and Constellations' paid extras (video, voice, 20 photos, scheduling, a password, no
  // footer), for that free template, forever. The song is free on every gift and not among them.
  extras: { id: "extras", picks: 1, amounts: { usd: 899, eur: 749, gbp: 649 }, highlight: false, envProductKey: "STRIPE_PRODUCT_EXTRAS", name: { en: "Ethos: make it special", es: "Ethos: hazlo especial" } },
  // The membership's one-time fallback (a year, paid once), at the yearly subscription's price.
  pass: { id: "pass", picks: 0, amounts: MEMBERSHIP_PLANS.yearly.amounts, highlight: false, envProductKey: "STRIPE_PRODUCT_PASS", name: { en: "Ethos for Two: one year, for both of you", es: "Ethos for Two: un año, para los dos" } },
  // `amounts` is the yearly figure for code that reads any product generically; a plan's own amount
  // always comes from membershipAmount.
  membership: { id: "membership", picks: 0, amounts: MEMBERSHIP_PLANS.yearly.amounts, highlight: false, envProductKey: "STRIPE_PRODUCT_FORTWO", name: { en: "Ethos for Two", es: "Ethos for Two" } },
  pack: { id: "pack", picks: 0, amounts: { usd: 299, eur: 299, gbp: 249 }, highlight: false, envProductKey: "STRIPE_PRODUCT_PACK", name: { en: "Ethos: game pack", es: "Ethos: pack de juegos" } },
  giftcard: { id: "giftcard", picks: 0, amounts: { usd: 2999, eur: 2499, gbp: 2199 }, highlight: false, envProductKey: "STRIPE_PRODUCT_GIFTCARD", name: { en: "Ethos gift card: Give Everything", es: "Tarjeta regalo Ethos: Regálalo todo" } },
  upgrade: { id: "upgrade", picks: 0, amounts: { usd: 499, eur: 499, gbp: 499 }, highlight: false, envProductKey: "STRIPE_PRODUCT_UPGRADE", name: { en: "Ethos: upgrade to every template, forever", es: "Ethos: pasa a todas las plantillas, para siempre" } },
};

/**
 * The order bump: every other template, forever, added to a single or a "make it special" purchase.
 * Offered unticked; the buyer has to choose it. Its price is whatever takes that purchase to exactly
 * Everything's price (bumpAmount), so ticking it is never a better or a worse deal than Everything.
 */
export const BUMP = {
  envProductKey: "STRIPE_PRODUCT_BUMP",
  name: { en: "Ethos: every other template, forever", es: "Ethos: todas las demás plantillas, para siempre" },
  /** The products it can be added to. */
  onto: ["single", "extras"] as readonly ProductId[],
} as const;

/**
 * The second gift: one more premium template, picked on the pay sheet from a few suggestions, added to
 * a single for much less than a single costs, so the next birthday or anniversary is already covered.
 * Offered unticked, like the bump, and never together with it: every template includes the second.
 */
export const SECOND_GIFT = {
  envProductKey: "STRIPE_PRODUCT_SECOND",
  name: { en: "Ethos: a second gift", es: "Ethos: un segundo regalo" },
  amounts: { usd: 499, eur: 499, gbp: 449 } as Record<Currency, number>,
  /** The products it can be added to. */
  onto: ["single"] as readonly ProductId[],
} as const;

/** What the bump costs on top of `base`: Everything's price minus the base line's (€24.99 − €9.99 = €15.00). */
export function bumpAmount(base: ProductId, currency: Currency): number {
  return PRODUCTS.everything.amounts[currency] - PRODUCTS[base].amounts[currency];
}

/** A yearly pass lasts this long from the day it is bought (or from the end of the one it renews). */
export const PASS_DAYS = 365;
/** A gift card can be redeemed for this many months. */
export const GIFT_CARD_MONTHS = 24;

export const PRODUCT_ORDER: PlanId[] = ["single", "pick3", "everything"];

/**
 * Gift cards are built but not sold until the accountant settles how VAT on vouchers works: set
 * GIFT_CARDS_ENABLED=true to sell them. Server-side only (the variable never reaches the browser, so
 * it reads false there): the pricing page hides the card and checkout refuses product "giftcard".
 * Redeeming a code already bought keeps working either way.
 */
export function giftCardsOnSale(env: Record<string, string | undefined> = process.env): boolean {
  return env.GIFT_CARDS_ENABLED === "true";
}

export function isProductId(v: string): v is ProductId {
  return Object.hasOwn(PRODUCTS, v);
}

export function formatAmount(minor: number, currency: Currency, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(minor / 100);
}

/**
 * The currencies the site shows and charges, in order of preference, from
 * NEXT_PUBLIC_PRICE_CURRENCIES ("eur,usd,gbp"). Checkout only ever charges one of these, in the
 * amount above, so the price on the page is the price charged. Anything else is shown in the first
 * (euros) and the buyer's bank converts it. Inlined at build: changing it needs a redeploy, which
 * also builds a copy of every page per currency (src/app/[currency]/[locale]/layout.tsx).
 */
export const CHARGED_CURRENCIES: Currency[] = (() => {
  const listed = (process.env.NEXT_PUBLIC_PRICE_CURRENCIES ?? "eur")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is Currency => c === "eur" || c === "usd" || c === "gbp");
  return listed.length > 0 ? listed : ["eur"];
})();

/** Where dollars are the money: the United States and its territories. */
const DOLLAR_COUNTRIES = ["US", "PR", "GU", "VI", "AS", "MP", "UM"];
/** Where pounds are: the United Kingdom, and the Isle of Man and the Channel Islands, which use sterling. */
const POUND_COUNTRIES = ["GB", "IM", "JE", "GG"];

/**
 * The currency to show and charge for a country ("US") or a locale ("en-US"): dollars in the United
 * States, pounds in the United Kingdom, euros everywhere else, Europe outside the euro included (a
 * Pole or a Swede is used to euro prices, never to dollar ones). Only ever one Stripe charges in:
 * anything not in CHARGED_CURRENCIES gets the first, euros.
 */
export function currencyFor(countryOrLocale: string | null | undefined): Currency {
  const v = (countryOrLocale ?? "").toUpperCase();
  const region = v.includes("-") ? v.slice(v.lastIndexOf("-") + 1) : v;
  const local: Currency = DOLLAR_COUNTRIES.includes(region) ? "usd" : POUND_COUNTRIES.includes(region) ? "gbp" : "eur";
  return CHARGED_CURRENCIES.includes(local) ? local : CHARGED_CURRENCIES[0];
}

/**
 * The visitor's currency, from the country Vercel puts on every request (the browser's language
 * stands in on a machine with no Vercel in front, such as next dev). The proxy uses it to pick
 * which copy of a page to serve (src/app/[currency]), and checkout charges in it when the page
 * didn't say, so both read the same header the same way.
 */
export function visitorCurrency(headers: Pick<Headers, "get">): Currency {
  return currencyFor(headers.get("x-vercel-ip-country") ?? headers.get("accept-language")?.split(",")[0]);
}

/**
 * A page's currency, from its hidden [currency] segment: one Stripe charges in, or the first. The
 * segment only ever holds what the proxy put there, so this guards against nothing worse than a
 * test or a stray link.
 */
export function chargedCurrency(value: string | null | undefined): Currency {
  return CHARGED_CURRENCIES.find((c) => c === value) ?? CHARGED_CURRENCIES[0];
}

/** Unlock rows are template slugs, "*" for every template, and "pack:<id>" / "pack:*" for game packs. */
export const EVERY_TEMPLATE = "*";
export const EVERY_PACK = "pack:*";
export const packUnlock = (packId: string) => `pack:${packId}`;

/**
 * Which template_unlocks rows a paid product grants its buyer. "everything" (and an upgrade) is the
 * wildcard "*": all current AND future templates. A pass or a membership grants every template and
 * every pack for as long as it runs (lib/commerce/passes.ts takes them back). A gift card grants the buyer nothing:
 * the person who redeems it gets "*".
 */
export function unlocksFor(product: ProductId, chosenSlugs: string[], options: { packId?: string } = {}): string[] {
  if (product === "everything" || product === "upgrade") return [EVERY_TEMPLATE];
  if (product === "pass" || product === "membership") return [EVERY_TEMPLATE, EVERY_PACK];
  if (product === "giftcard") return [];
  if (product === "pack") {
    if (!options.packId) throw new Error("product pack needs a pack id");
    return [packUnlock(options.packId)];
  }
  const unique = Array.from(new Set(chosenSlugs.filter(Boolean)));
  if (unique.length !== PRODUCTS[product].picks) throw new Error(`product ${product} needs exactly ${PRODUCTS[product].picks} template(s)`);
  return unique;
}

/** True when the user's unlock rows cover a template. */
export function hasUnlock(unlockSlugs: string[], templateSlug: string): boolean {
  return unlockSlugs.includes(EVERY_TEMPLATE) || unlockSlugs.includes(templateSlug);
}

/** True when unlock rows ("pack:<id>" / "pack:*") cover a game pack. */
export function rowsCoverPack(unlockSlugs: string[], packId: string): boolean {
  return unlockSlugs.includes(EVERY_PACK) || unlockSlugs.includes(packUnlock(packId));
}

/** True when the `packs` list from GET /api/entitlements covers a game pack ("*" = every pack). */
export function hasPack(packs: string[], packId: string): boolean {
  return packs.includes("*") || packs.includes(packId);
}
