import type Stripe from "stripe";
import { BRAND } from "@/config/brand";
import { PACK_NAMES } from "@/lib/games/packs";
import { isShortId } from "@/lib/gift/short-id";
import { BUMP, PRODUCTS } from "@/lib/pricing/products";
import type { CheckoutPlan, PlanLine } from "@/lib/commerce/plan";
import { getManifest } from "@/templates/manifests";

/** Stripe Tax's code for general digital goods, for lines made inline (no Stripe Product set). */
export const TAX_CODE = "txcd_10000000";
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

export type SessionOptions = {
  purchaseId: string;
  userId: string | null;
  email: string | null;
  locale: Locale;
  origin: string;
  /** A same-site path to come back to. */
  returnTo: string;
  ref?: string;
  automaticTax: boolean;
  /** STRIPE_PRODUCT_* values from the environment, by variable name. */
  productIds: Record<string, string | undefined>;
};

function describe(line: PlanLine, plan: CheckoutPlan, locale: Locale): string | undefined {
  if (line.key === "bump") return undefined;
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

/**
 * The withdrawal tickbox, in the buyer's words: what they ask for and what they give up by ticking
 * it. Under the Consumer Rights Directive the 14-day right to cancel digital content only ends with
 * the buyer's prior express request and their acknowledgement that it is lost (art. 16(m)); a line
 * of text above the pay button is contested, a box they must tick is not. Terms s.9 (withdrawal)
 * quotes this function, so it repeats the box word for word, and so does the receipt (the
 * confirmation on a durable medium, art. 8(7)).
 *
 * The pass is treated as digital content like everything else (a lawyer question in docs/LAUNCH.md)
 * and says it never renews. A gift card is the exception: nothing is supplied to the buyer until the
 * code is redeemed, so the right to cancel stays until then (terms s.8) and the box says so.
 *
 * This is the plain sentence, which fulfilment stores on the purchase as what was agreed to.
 */
export function consentSentence(product: CheckoutPlan["product"], locale: Locale): string {
  if (locale === "es") {
    if (product === "giftcard")
      return "Pido a Ethos que emita el código de mi tarjeta regalo de inmediato. Entiendo que puedo desistir en un plazo de 14 días, con el reembolso íntegro, siempre que el código no se haya canjeado, y que una vez canjeado ya no podré desistir.";
    const unlock = "Pido a Ethos que desbloquee mi compra de inmediato, antes de que termine el plazo de desistimiento de 14 días, y entiendo que, una vez desbloqueada, pierdo mi derecho de desistimiento.";
    return product === "pass" ? `${unlock} Es un pago único por un año: no se renueva solo.` : unlock;
  }
  if (product === "giftcard")
    return "I ask Ethos to issue my gift card code straight away. I understand that I can cancel within 14 days for a full refund as long as the code hasn't been redeemed, and that once it has been redeemed I can no longer cancel.";
  const unlock = "I ask Ethos to unlock my purchase straight away, before the 14-day cancellation period ends, and I understand that once it's unlocked I lose my right to cancel.";
  return product === "pass" ? `${unlock} It's one payment for one year and never renews by itself.` : unlock;
}

/** The tickbox's label on Stripe's page: the sentence, then a link to the terms (Stripe renders Markdown links). */
export function consentText(product: CheckoutPlan["product"], locale: Locale, origin: string): string {
  return `${consentSentence(product, locale)} [${locale === "es" ? "Términos" : "Terms"}](${termsUrl(locale, origin)})`;
}

/**
 * The fallback, when Stripe can't show the tickbox (an account without a terms-of-service URL): the
 * same notice as a line directly above the pay button. Weaker than the tickbox, never nothing.
 */
export function withdrawalNotice(product: CheckoutPlan["product"], locale: Locale, origin: string): string {
  const terms = termsUrl(locale, origin);
  if (locale === "es") {
    if (product === "pass")
      return `Al pagar, pides que tu pase empiece al instante y aceptas que, una vez empezado, pierdes el derecho de desistimiento de 14 días. Es un pago único por un año: no se renueva solo. Términos: ${terms}`;
    if (product === "giftcard")
      return `El código de tu tarjeta regalo se emite al instante. Puedes cambiar de opinión en un plazo de 14 días y te devolvemos el importe íntegro, siempre que el código no se haya canjeado; una vez canjeado, ya no se reembolsa. Términos: ${terms}`;
    return `Al pagar, pides que tu compra se desbloquee al instante y aceptas que, una vez desbloqueada, pierdes el derecho de desistimiento de 14 días. Términos: ${terms}`;
  }
  if (product === "pass")
    return `By paying, you ask for your pass to start straight away and accept that, once it has, you lose the 14-day right to cancel. It is one payment for one year and never renews by itself. Terms: ${terms}`;
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
 * Everything fulfilment needs, in the session's metadata: it is the only thing both the webhook and
 * the success page can trust (Stripe signed it, and only this server wrote it). The Stripe account
 * is shared with other businesses, so it names nothing about a person or a gift: no gift ids, no
 * names, no notes. A gift card's name and note wait in gift_card_details instead.
 */
export function sessionMetadata(plan: CheckoutPlan, options: SessionOptions): Record<string, string> {
  const ref = metadataRef(options.ref);
  return {
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
  };
}

/**
 * The Checkout Session for a plan. Promotion codes are off, here and on the recovered session: the
 * Stripe account is shared with businesses whose codes (LAUNCH40, WELCOME20…) are live, and none of
 * them is an Ethos price. Stripe's default expiry (24 hours) keeps a checkout open for a buyer who
 * comes back to it; an abandoned one gets a recovery link, which is only ever emailed to a buyer who
 * ticked Stripe's marketing box. The withdrawal tickbox is required of every buyer, wherever they
 * are: the law goes by where they live, which no IP address tells.
 */
export function sessionParams(plan: CheckoutPlan, options: SessionOptions): Stripe.Checkout.SessionCreateParams {
  // returnTo is a path without the locale (the app's Links add it); Stripe sends the buyer to a bare
  // URL, so a Spanish buyer is sent back under /es rather than left to the language redirect.
  const prefix = options.locale === "es" ? "/es" : "";
  const back = options.returnTo;
  const cancel = prefix && back === "/" ? prefix : `${prefix}${back}`;
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
    success_url: `${options.origin}${prefix}/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(back)}`,
    cancel_url: `${options.origin}${cancel}`,
  };
}
