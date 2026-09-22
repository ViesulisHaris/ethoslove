/**
 * Pricing catalogue. Amounts are minor units and MUST equal the Stripe prices for every currency in
 * CHARGED_CURRENCIES — the amount on the page is a promise about the amount on the card statement
 * (scripts/check-prices.mjs compares them). Stripe Price IDs come from env so the same code runs
 * against test and live accounts. Every product is a ONE-TIME payment.
 */
export type ProductId = "single" | "pick3" | "everything";
export type Currency = "usd" | "eur" | "gbp";

export type Product = {
  id: ProductId;
  /** How many template slugs the buyer picks (Infinity = all). */
  picks: number;
  amounts: Record<Currency, number>;
  /** "from" price shown struck through on the pricing page (in minor units). */
  compareAt?: Record<Currency, number>;
  highlight: boolean;
  envPriceKey: "STRIPE_PRICE_SINGLE" | "STRIPE_PRICE_PICK3" | "STRIPE_PRICE_EVERYTHING";
  /** Alternative to the price: the Stripe Product whose default price is charged. */
  envProductKey: "STRIPE_PRODUCT_SINGLE" | "STRIPE_PRODUCT_PICK3" | "STRIPE_PRODUCT_EVERYTHING";
};

export const PRODUCTS: Record<ProductId, Product> = {
  single: { id: "single", picks: 1, amounts: { usd: 799, eur: 749, gbp: 649 }, highlight: false, envPriceKey: "STRIPE_PRICE_SINGLE", envProductKey: "STRIPE_PRODUCT_SINGLE" },
  pick3: { id: "pick3", picks: 3, amounts: { usd: 1199, eur: 1099, gbp: 949 }, compareAt: { usd: 2397, eur: 2247, gbp: 1947 }, highlight: false, envPriceKey: "STRIPE_PRICE_PICK3", envProductKey: "STRIPE_PRODUCT_PICK3" },
  everything: { id: "everything", picks: Infinity, amounts: { usd: 2499, eur: 2299, gbp: 1999 }, highlight: true, envPriceKey: "STRIPE_PRICE_EVERYTHING", envProductKey: "STRIPE_PRODUCT_EVERYTHING" },
};

export const PRODUCT_ORDER: ProductId[] = ["single", "pick3", "everything"];

export function isProductId(v: string): v is ProductId {
  return v in PRODUCTS;
}

export function formatAmount(minor: number, currency: Currency, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 2 }).format(minor / 100);
}

/**
 * The currencies the live Stripe prices really carry, in order of preference, from
 * NEXT_PUBLIC_PRICE_CURRENCIES ("eur,usd,gbp"). The site only ever shows one of these, so the price
 * on the page is the price charged. Anything else is shown in the first (euros) and Stripe converts
 * it at checkout, which it says on its own page. Adding "usd" here without a USD price on every
 * Stripe product would put a number on the page nobody is charged: run scripts/check-prices.mjs.
 */
export const CHARGED_CURRENCIES: Currency[] = (() => {
  const listed = (process.env.NEXT_PUBLIC_PRICE_CURRENCIES ?? "eur")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c): c is Currency => c === "eur" || c === "usd" || c === "gbp");
  return listed.length > 0 ? listed : ["eur"];
})();

/** The currency to show and charge for a locale/country: its own if Stripe carries it, otherwise the first charged one. */
export function currencyFor(countryOrLocale: string | null | undefined): Currency {
  const v = (countryOrLocale ?? "").toUpperCase();
  const eu = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
  const local: Currency = v === "GB" || v.endsWith("-GB") ? "gbp" : eu.some((c) => v === c || v.endsWith(`-${c}`)) ? "eur" : "usd";
  return CHARGED_CURRENCIES.includes(local) ? local : CHARGED_CURRENCIES[0];
}

/**
 * Which template_unlocks rows a paid product grants. "everything" is the wildcard '*'
 * (all current AND future templates); the others unlock exactly the chosen slugs.
 */
export function unlocksFor(product: ProductId, chosenSlugs: string[]): string[] {
  if (product === "everything") return ["*"];
  const unique = Array.from(new Set(chosenSlugs.filter(Boolean)));
  if (unique.length !== PRODUCTS[product].picks) throw new Error(`product ${product} needs exactly ${PRODUCTS[product].picks} template(s)`);
  return unique;
}

/** True when the user's unlock rows cover a template. */
export function hasUnlock(unlockSlugs: string[], templateSlug: string): boolean {
  return unlockSlugs.includes("*") || unlockSlugs.includes(templateSlug);
}
