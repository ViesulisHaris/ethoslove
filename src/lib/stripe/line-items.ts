import type Stripe from "stripe";
import { BRAND } from "@/config/brand";
import { PACK_NAMES } from "@/lib/games/packs";
import { isShortId } from "@/lib/gift/short-id";
import { BUMP, MEMBERSHIP_PLANS, PRODUCTS, formatAmount, membershipAmount, type Currency, type MembershipPlan } from "@/lib/pricing/products";
import type { CheckoutPlan, PlanLine } from "@/lib/commerce/plan";
import { getManifest } from "@/templates/manifests";

/** Stripe Tax's code for general digital goods, for lines made inline (no Stripe Product set). */
export const TAX_CODE = "txcd_10000000";
/**
 * Stamped on every Ethos session, subscription, customer and invoice (docs/MEMBERSHIP.md 2.1, R3).
 * The Stripe account is shared and every business's webhook sees every event: this is how ours
 * tells its own objects from theirs, and how theirs can tell ours from their own.
 */
export const ETHOS_APP = "ethos";
/**
 * What Stripe's page is headed with. The account is shared, so without it the header names the
 * account's business; receipts and the Apple Pay sheet still do until Ethos has its own account.
 * The icon is the site's own, from the public domain, so a session made in development (whose
 * origin is localhost, which Stripe can't fetch) shows it too.
 */
export const CHECKOUT_BRANDING: Stripe.Checkout.SessionCreateParams.BrandingSettings = {
  display_name: BRAND.name,
  icon: { type: "url", url: `https://${BRAND.domain}/icons/icon-512.png` },
};
/**
 * A path on this site to come back to after paying or cancelling. Browsers read "/\evil.example" as
 * "//evil.example" and drop tabs and newlines inside URLs, so backslashes, whitespace and control
 * characters are refused along with a leading "//".
 */
export const RETURN_PATH = /^\/(?![/\\])[^\\\s\p{Cc}]*$/u;

/** Refs spelled like a gift's short id that are really words ("?ref=watermark" on the free footer). */
const WORD_REFS: readonly string[] = ["watermark"];
/** A gift's (or anything's) database id, which REF_PATTERN would let through as a ref. */
const UUID_REF = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Locale = "en" | "es";

/** What Stripe's page says under "Ethos for Two" on a subscription line made inline. */
export const LINE_DESCRIPTION: Record<MembershipPlan, Record<Locale, string>> = {
  monthly: { en: "Monthly membership for two", es: "Suscripción mensual para dos" },
  yearly: { en: "Yearly membership for two", es: "Suscripción anual para dos" },
};

export type SessionOptions = {
  purchaseId: string;
  userId: string | null;
  email: string | null;
  locale: Locale;
  origin: string;
  /** A same-site path to come back to. */
  returnTo: string;
  ref?: string;
  /**
   * Only for a buyer who said yes to advertising cookies: what the webhook needs to report the sale
   * to Meta (lib/meta/capi.ts). Its presence is that yes. Absent, Meta is never told.
   */
  meta?: { fbc?: string; fbp?: string; ua?: string };
  automaticTax: boolean;
  /** STRIPE_PRODUCT_* values from the environment, by variable name. */
  productIds: Record<string, string | undefined>;
};

/**
 * What Stripe's page says under the upgrade, so its price is read as what it is: credit for what the
 * buyer has paid, never a discount (a buyer who upgrades has paid Everything's price in all).
 */
export function upgradeLineDescription(currency: Currency, locale: Locale): string {
  const full = formatAmount(PRODUCTS.everything.amounts[currency], currency, locale);
  return locale === "es" ? `Todas las plantillas cuestan ${full}, y lo que ya has pagado se resta.` : `Every template is ${full}, and what you've already paid counts towards it.`;
}

function describe(line: PlanLine, plan: CheckoutPlan, locale: Locale): string | undefined {
  if (line.key === "bump") return undefined;
  if (line.key === "upgrade") return upgradeLineDescription(plan.currency, locale);
  if (plan.packId) return PACK_NAMES[plan.packId][locale];
  const names = plan.templateSlugs.map((slug) => getManifest(slug)?.name[locale] ?? slug);
  return names.length > 0 ? names.join(", ") : undefined;
}

/**
 * One line per thing bought, each charged at exactly the planned amount (price_data), VAT included.
 * With STRIPE_PRODUCT_* set an English line is filed under that Stripe Product; otherwise one is
 * described inline with the digital-goods tax code, in the buyer's language.
 *
 * A Stripe Product has one name and one description, no translations, and Stripe's page shows them
 * as they are: a Spanish buyer on an otherwise Spanish page read "Ethos — Everything" and an English
 * blurb. So a Spanish line always names itself from the catalogue, and says which Product it would
 * have been filed under in its metadata, for the reports.
 */
export function lineItems(plan: CheckoutPlan, options: Pick<SessionOptions, "locale" | "productIds">): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return plan.lines.map((line) => {
    const catalogue = line.key === "bump" ? BUMP : PRODUCTS[line.key];
    const configured = options.productIds[catalogue.envProductKey];
    const product = options.locale === "en" ? configured : undefined;
    const description = describe(line, plan, options.locale);
    const metadata = configured && !product ? { metadata: { stripe_product: configured } } : {};
    return {
      quantity: 1,
      price_data: {
        currency: plan.currency,
        unit_amount: line.amount,
        tax_behavior: "inclusive",
        ...(product
          ? { product }
          : { product_data: { name: catalogue.name[options.locale], tax_code: TAX_CODE, ...(description ? { description } : {}), ...metadata } }),
      },
    };
  });
}

const termsUrl = (locale: Locale, origin: string) => (locale === "es" ? `${origin}/es/legal/terms` : `${origin}/legal/terms`);

/** Which plan and currency a membership's sentences quote; the price always comes from the catalogue. */
export type ConsentOptions = { plan?: MembershipPlan | null; currency?: Currency };

const price = (plan: MembershipPlan, currency: Currency | undefined, locale: Locale) => formatAmount(membershipAmount(plan, currency ?? "eur"), currency ?? "eur", locale);

/**
 * The withdrawal tickbox, in the buyer's words: what they ask for, and what that means for their
 * right to withdraw. Terms s.9 (withdrawal) quotes this function, so it repeats the box word for
 * word, and so does the receipt or the welcome email (the confirmation on a durable medium, art. 8(7)).
 *
 * Templates, packs and upgrades are digital content: under the Consumer Rights Directive the 14-day
 * right to cancel ends with the buyer's prior express request and their acknowledgement that it is
 * lost (art. 16(m)), and a box they must tick is the uncontested way to get both.
 *
 * Ethos for Two, monthly, yearly or the one-year pass, is a digital SERVICE (the owner's decision):
 * that right can't be given up. The buyer asks for it to start straight away and keeps the right to
 * withdraw within 14 days, paying only for the days used (arts. 7(3), 8(8), 14(3)). A membership's
 * box also states what it renews at and how often, since that is what they are agreeing to.
 *
 * A gift card is the exception the other way: nothing is supplied to the buyer until the code is
 * redeemed, so the right to cancel stays until then (terms s.8) and the box says so.
 *
 * This is the plain sentence, which fulfilment stores on the purchase as what was agreed to.
 */
export function consentSentence(product: CheckoutPlan["product"], locale: Locale, options: ConsentOptions = {}): string {
  const plan = options.plan ?? "yearly";
  if (locale === "es") {
    const withdrawal = "Entiendo que aún puedo desistir en un plazo de 14 días y que, en ese caso, solo pagaría la parte correspondiente a los días ya disfrutados.";
    if (product === "membership")
      return `Pido a Ethos que active mi suscripción a Ethos for Two de inmediato. Se renueva cada ${plan === "monthly" ? "mes" : "año"} por ${price(plan, options.currency, locale)} hasta que la cancele, algo que puedo hacer cuando quiera desde mi cuenta. ${withdrawal}`;
    if (product === "pass") return `Pido a Ethos que active mi año de Ethos for Two de inmediato. Es un pago único por un año y no se renueva solo. ${withdrawal}`;
    if (product === "giftcard")
      return "Pido a Ethos que emita el código de mi tarjeta regalo de inmediato. Entiendo que puedo desistir en un plazo de 14 días, con el reembolso íntegro, siempre que el código no se haya canjeado, y que una vez canjeado ya no podré desistir.";
    return "Pido a Ethos que desbloquee mi compra de inmediato, antes de que termine el plazo de desistimiento de 14 días, y entiendo que, una vez desbloqueada, pierdo mi derecho de desistimiento.";
  }
  const withdrawal = "I understand that I can still withdraw within 14 days, and that I would then pay only for the days I've used.";
  if (product === "membership")
    return `I ask Ethos to start my Ethos for Two membership straight away. It renews every ${plan === "monthly" ? "month" : "year"} at ${price(plan, options.currency, locale)} until I cancel, which I can do at any time from my account. ${withdrawal}`;
  if (product === "pass") return `I ask Ethos to start my Ethos for Two year straight away. It's one payment for one year and doesn't renew by itself. ${withdrawal}`;
  if (product === "giftcard")
    return "I ask Ethos to issue my gift card code straight away. I understand that I can cancel within 14 days for a full refund as long as the code hasn't been redeemed, and that once it has been redeemed I can no longer cancel.";
  return "I ask Ethos to unlock my purchase straight away, before the 14-day cancellation period ends, and I understand that once it's unlocked I lose my right to cancel.";
}

/** The tickbox's label on Stripe's page: the sentence, then a link to the terms (Stripe renders Markdown links). */
export function consentText(product: CheckoutPlan["product"], locale: Locale, origin: string, options: ConsentOptions = {}): string {
  return `${consentSentence(product, locale, options)} [${locale === "es" ? "Términos" : "Terms"}](${termsUrl(locale, origin)})`;
}

/**
 * The line directly above a membership's Subscribe button: the price, that it renews, and how to
 * stop it, where nobody can miss it. A price and a renewal stated at checkout are what the law asks
 * of a subscription sold online; the tickbox says the same in the buyer's own words.
 */
export function renewalNotice(plan: MembershipPlan, currency: Currency, locale: Locale): string {
  const amount = formatAmount(membershipAmount(plan, currency), currency, locale);
  if (locale === "es")
    return plan === "monthly"
      ? `${amount} al mes para los dos: se cobra hoy y después cada mes hasta que canceles. Puedes cancelar cuando quieras desde tu cuenta y conservas Ethos for Two hasta el final del mes pagado.`
      : `${amount} al año para los dos: se cobra hoy y después cada año hasta que canceles. Te escribiremos una semana antes de cada renovación. Puedes cancelar cuando quieras desde tu cuenta y conservas Ethos for Two hasta el final del año pagado.`;
  return plan === "monthly"
    ? `${amount} a month for both of you, charged today and then every month until you cancel. Cancel any time from your account: you keep Ethos for Two until the end of the month you've paid for.`
    : `${amount} a year for both of you, charged today and then every year until you cancel. We'll email you a week before each renewal. Cancel any time from your account: you keep Ethos for Two until the end of the year you've paid for.`;
}

/**
 * The fallback, when Stripe can't show the tickbox (an account without a terms-of-service URL): the
 * same notice as a line directly above the pay button. Weaker than the tickbox, never nothing. A buyer
 * who ticked nothing keeps the right to withdraw, and a membership or pass buyer who withdraws within
 * 14 days is then refunded in full (art. 14(4)(a)(i)): the notice doesn't pretend otherwise.
 */
export function withdrawalNotice(product: CheckoutPlan["product"], locale: Locale, origin: string, options: ConsentOptions = {}): string {
  const terms = termsUrl(locale, origin);
  const plan = options.plan ?? "yearly";
  const currency = options.currency ?? "eur";
  if (locale === "es") {
    if (product === "membership") return `Al suscribirte, pides que Ethos for Two empiece de inmediato. ${renewalNotice(plan, currency, locale)} Puedes desistir en un plazo de 14 días. Términos: ${terms}`;
    if (product === "pass") return `Al pagar, pides que tu año de Ethos for Two empiece de inmediato. Es un pago único por un año y no se renueva solo. Puedes desistir en un plazo de 14 días. Términos: ${terms}`;
    if (product === "giftcard")
      return `El código de tu tarjeta regalo se emite al instante. Puedes cambiar de opinión en un plazo de 14 días y te devolvemos el importe íntegro, siempre que el código no se haya canjeado; una vez canjeado, ya no se reembolsa. Términos: ${terms}`;
    return `Al pagar, pides que tu compra se desbloquee al instante y aceptas que, una vez desbloqueada, pierdes el derecho de desistimiento de 14 días. Términos: ${terms}`;
  }
  if (product === "membership") return `By subscribing, you ask for Ethos for Two to start straight away. ${renewalNotice(plan, currency, locale)} You can withdraw within 14 days. Terms: ${terms}`;
  if (product === "pass") return `By paying, you ask for your year of Ethos for Two to start straight away. It's one payment for one year and doesn't renew by itself. You can withdraw within 14 days. Terms: ${terms}`;
  if (product === "giftcard")
    return `Your gift card code is issued straight away. You can change your mind within 14 days for a full refund, as long as the code hasn't been redeemed; once it has, it can't be refunded. Terms: ${terms}`;
  return `By paying, you ask for your purchase to be unlocked straight away and accept that, once it is, you lose the 14-day right to cancel. Terms: ${terms}`;
}

/**
 * The ref as metadata may carry it. A gift's short id opens that gift, so it never goes to Stripe
 * (the account is shared): an old "send one back" link put one in ?ref=, and a ref spelled like one
 * is dropped, as is one shaped like a database id. Campaign refs have a dash ("tt-couple", "c-maya")
 * or are known words.
 */
export function metadataRef(ref: string | undefined): string | undefined {
  if (!ref || UUID_REF.test(ref)) return undefined;
  return isShortId(ref) && !WORD_REFS.includes(ref) ? undefined : ref;
}

/**
 * A consented buyer's Meta fields, as metadata (lib/meta/capi.ts reads them back). Stripe caps a value
 * at 500 characters, which a user agent can pass.
 */
export function metaMetadata(meta: SessionOptions["meta"]): Record<string, string> {
  if (!meta) return {};
  return {
    meta_consent: "1",
    ...(meta.fbc ? { meta_fbc: meta.fbc } : {}),
    ...(meta.fbp ? { meta_fbp: meta.fbp } : {}),
    ...(meta.ua ? { meta_ua: meta.ua.slice(0, 500) } : {}),
  };
}

/**
 * Everything fulfilment needs, in the session's metadata: it is the only thing both the webhook and
 * the success page can trust (Stripe signed it, and only this server wrote it). The Stripe account
 * is shared with other businesses, so it names nothing about a person or a gift: no gift ids, no
 * names, no notes. A gift card's name and note wait in gift_card_details instead. A buyer who allowed
 * advertising cookies adds Meta's ids for their click and browser and the browser's user agent
 * (`metaMetadata`), which name a browser, not a person.
 */
export function sessionMetadata(plan: CheckoutPlan, options: SessionOptions): Record<string, string> {
  const ref = metadataRef(options.ref);
  return {
    app: ETHOS_APP,
    purchase_id: options.purchaseId,
    user_id: options.userId ?? "",
    guest: options.userId ? "0" : "1",
    locale: options.locale,
    product: plan.product,
    template_slugs: plan.packId ? "" : plan.templateSlugs.join(","),
    // "tickbox" becomes "shown_at_payment" when Stripe can't show the box (lib/stripe/create-session.ts).
    withdrawal_notice: "tickbox",
    kind: plan.kind,
    ...(plan.bump ? { bump: "1" } : {}),
    ...(plan.packId ? { pack_id: plan.packId } : {}),
    ...(plan.creatorCode ? { creator_code: plan.creatorCode } : {}),
    ...(ref ? { ref } : {}),
    ...metaMetadata(options.meta),
  };
}

/**
 * Where Stripe sends the buyer. returnTo is a path without the locale (the app's Links add it);
 * Stripe sends the buyer to a bare URL, so a Spanish buyer is sent back under /es rather than left
 * to the language redirect. A cancel brings the link they came through back with it (?ref=): the
 * site keeps it nowhere but the address (lib/attribution/ref.ts), so trying again is still
 * credited to it.
 */
function returnUrls(options: Pick<SessionOptions, "locale" | "origin" | "returnTo" | "ref">): { success_url: string; cancel_url: string } {
  const prefix = options.locale === "es" ? "/es" : "";
  const back = options.returnTo;
  const cancel = prefix && back === "/" ? prefix : `${prefix}${back}`;
  const ref = metadataRef(options.ref);
  let cancelUrl = `${options.origin}${cancel}`;
  if (ref) {
    const url = new URL(cancelUrl);
    if (!url.searchParams.has("ref")) url.searchParams.set("ref", ref);
    cancelUrl = url.toString();
  }
  return {
    success_url: `${options.origin}${prefix}/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(back)}`,
    cancel_url: cancelUrl,
  };
}

/**
 * The Checkout Session for a plan. Promotion codes are off, here and on the recovered session: the
 * Stripe account is shared with businesses whose codes (LAUNCH40, WELCOME20…) are live, and none of
 * them is an Ethos price. Stripe's default expiry (24 hours) keeps a checkout open for a buyer who
 * comes back to it; an abandoned one gets a recovery link, which is only ever emailed to a buyer who
 * ticked Stripe's marketing box. Stripe offers that box to US merchants only, so it is asked for and,
 * on this account, refused (lib/stripe/create-session.ts): no recovery email goes out until it can be. The withdrawal tickbox is required of every buyer, wherever they
 * are: the law goes by where they live, which no IP address tells.
 */
export function sessionParams(plan: CheckoutPlan, options: SessionOptions): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    // Stripe's own words (Email, Pay, the card form) in the site's language, not the browser's:
    // left to "auto", a buyer on /es with an English phone got an English page around the Spanish
    // product names and the Spanish tickbox (seen in test mode, 23 Sept).
    locale: options.locale,
    line_items: lineItems(plan, options),
    customer_email: options.email ?? undefined,
    client_reference_id: options.purchaseId,
    metadata: sessionMetadata(plan, options),
    allow_promotion_codes: false,
    consent_collection: { promotions: "auto", terms_of_service: "required" },
    custom_text: { terms_of_service_acceptance: { message: consentText(plan.product, options.locale, options.origin) } },
    after_expiration: { recovery: { enabled: true, allow_promotion_codes: false } },
    branding_settings: CHECKOUT_BRANDING,
    // Shared Stripe account: make the charge recognisable on statements.
    payment_intent_data: { statement_descriptor_suffix: "ETHOS" },
    automatic_tax: options.automaticTax ? { enabled: true } : undefined,
    ...returnUrls(options),
  };
}

/**
 * The subscription line: the catalogue's amount for the plan, charged every month or every year,
 * made inline like every other Ethos price (no standing Price exists to turn up in anyone else's
 * checkout, R6). With STRIPE_PRODUCT_FORTWO set it is filed under that price-less Product, whose name
 * reads the same in both languages, so Spanish buyers get it too; its statement descriptor is then
 * what the bank statement says (a subscription has no payment_intent_data to add ETHOS with).
 */
export function membershipLineItem(plan: CheckoutPlan, options: Pick<SessionOptions, "locale" | "productIds">): Stripe.Checkout.SessionCreateParams.LineItem {
  const membershipPlan = plan.plan ?? "yearly";
  const product = options.productIds[PRODUCTS.membership.envProductKey];
  return {
    quantity: 1,
    price_data: {
      currency: plan.currency,
      unit_amount: membershipAmount(membershipPlan, plan.currency),
      tax_behavior: "inclusive",
      recurring: { interval: MEMBERSHIP_PLANS[membershipPlan].interval },
      ...(product
        ? { product }
        : { product_data: { name: PRODUCTS.membership.name[options.locale], tax_code: TAX_CODE, description: LINE_DESCRIPTION[membershipPlan][options.locale], metadata: { app: ETHOS_APP } } }),
    },
  };
}

/**
 * What a membership's session, its subscription and everything fulfilment writes to Stripe carry.
 * The account is shared with a business whose webhook takes its own user-id metadata key (in any
 * metadata) and a subscription session's `client_reference_id` as ITS user id, so Ethos's key is
 * `ethos_user_id` and the purchase id rides in the metadata only (docs/MEMBERSHIP.md 2.1, R1 and R2).
 */
export function membershipMetadata(plan: CheckoutPlan, options: SessionOptions): Record<string, string> {
  const ref = metadataRef(options.ref);
  return {
    app: ETHOS_APP,
    purchase_id: options.purchaseId,
    ethos_user_id: options.userId ?? "",
    guest: options.userId ? "0" : "1",
    locale: options.locale,
    product: "membership",
    plan: plan.plan ?? "yearly",
    kind: "membership",
    // "tickbox" becomes "shown_at_payment" when Stripe can't show the box (lib/stripe/create-session.ts).
    withdrawal_notice: "tickbox",
    ...(plan.creatorCode ? { creator_code: plan.creatorCode } : {}),
    ...(ref ? { ref } : {}),
    ...metaMetadata(options.meta),
  };
}

/**
 * The Checkout Session for Ethos for Two as a subscription, under the shared account's rules
 * (docs/MEMBERSHIP.md 2.1): no client_reference_id (R2), `app: "ethos"` on the session and the
 * subscription (R3), no codes, discounts or trial (R6, R8), and a customer only when it is one Ethos
 * made for this very user (R7, `customerId`; otherwise Checkout makes one from the email). The price
 * and the renewal are stated twice before paying: in the tickbox, in the buyer's words, and in the
 * line above the Subscribe button. No recovery link (a subscription has none) and no
 * payment_intent_data (payment mode only).
 */
export function membershipSessionParams(plan: CheckoutPlan, options: SessionOptions & { customerId: string | null }): Stripe.Checkout.SessionCreateParams {
  const membershipPlan = plan.plan ?? "yearly";
  const metadata = membershipMetadata(plan, options);
  const consent = { plan: membershipPlan, currency: plan.currency };
  return {
    mode: "subscription",
    locale: options.locale,
    line_items: [membershipLineItem(plan, options)],
    ...(options.customerId
      ? // Automatic tax needs an address on a customer that already exists: the one typed at checkout.
        { customer: options.customerId, customer_update: { address: "auto" as const } }
      : { customer_email: options.email ?? undefined }),
    metadata,
    subscription_data: { metadata: { app: ETHOS_APP, purchase_id: options.purchaseId, ethos_user_id: options.userId ?? "" } },
    allow_promotion_codes: false,
    consent_collection: { promotions: "auto", terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: { message: consentText("membership", options.locale, options.origin, consent) },
      submit: { message: renewalNotice(membershipPlan, plan.currency, options.locale) },
    },
    branding_settings: CHECKOUT_BRANDING,
    automatic_tax: options.automaticTax ? { enabled: true } : undefined,
    ...returnUrls(options),
  };
}
