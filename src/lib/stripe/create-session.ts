import Stripe from "stripe";

type Params = Stripe.Checkout.SessionCreateParams;
type SessionCreator = { checkout: { sessions: { create: (params: Params) => Promise<Stripe.Checkout.Session> } } };

/**
 * What Stripe says when it refuses something optional. It names the parameter in `param` or only in
 * the message: the promotions box, on this (non-US) account, comes back as "`consent_collection.
 * promotions` is not available in your country." with no param at all (seen in test mode, 23 Sept).
 */
const TERMS_OF_SERVICE = /terms[_ ]of[_ ]service/i;
const PROMOTIONS = /consent_collection(\.|\[)promotions/;
const BRANDING = /branding_settings/;

function mentions(e: unknown, pattern: RegExp): boolean {
  if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) return false;
  return pattern.test(e.param ?? "") || pattern.test(e.message ?? "");
}

/** Stripe refuses the tickbox when the account has no terms-of-service URL (Settings → Public details). */
export const isTermsOfServiceError = (e: unknown) => mentions(e, TERMS_OF_SERVICE);

/**
 * Stripe offers the marketing-consent box to US merchants only, and says so on every session that
 * asks. Once it has, this instance stops asking, so a checkout costs one call to Stripe, not two.
 */
let promotionsUnavailable = false;

/** For tests: forget what Stripe said about the marketing box. */
export function resetPromotionsMemo(): void {
  promotionsUnavailable = false;
}

function withoutPromotions(params: Params): Params {
  const consent = { ...params.consent_collection };
  delete consent.promotions;
  return { ...params, consent_collection: Object.keys(consent).length > 0 ? consent : undefined };
}

/**
 * The same session without the withdrawal tickbox: the notice goes back above the pay button, and
 * the metadata says which the buyer saw. The marketing-consent box, if asked for, stays.
 */
export function withoutTermsConsent(params: Params, notice: string): Params {
  const consent = { ...params.consent_collection };
  delete consent.terms_of_service;
  const text = { ...params.custom_text };
  delete text.terms_of_service_acceptance;
  return {
    ...params,
    consent_collection: Object.keys(consent).length > 0 ? consent : undefined,
    custom_text: { ...text, submit: { message: notice } },
    metadata: { ...params.metadata, withdrawal_notice: "shown_at_payment" },
  };
}

/**
 * Creates the Checkout Session, stepping down rather than failing a sale over something optional:
 * - no terms-of-service URL on the account: no tickbox, the notice above the pay button instead,
 *   logged loudly because every such sale keeps its 14-day right to cancel;
 * - the marketing-consent box isn't offered to this account or country: no box (the recovery
 *   email then goes only to a buyer who ticked our own box before checkout: lib/stripe/recovery.ts);
 * - the branding is refused: Stripe's own header.
 * Anything else is a real failure and is thrown.
 */
export async function createCheckoutSession(stripe: SessionCreator, params: Params, fallback: { withdrawalNotice: string }): Promise<Stripe.Checkout.Session> {
  let attempt = promotionsUnavailable && params.consent_collection?.promotions ? withoutPromotions(params) : params;
  for (;;) {
    try {
      return await stripe.checkout.sessions.create(attempt);
    } catch (e) {
      const err = e as Partial<Stripe.errors.StripeError>;
      // Checked first: a message about the promotions box can't be mistaken for one about the terms.
      if (attempt.consent_collection?.promotions && mentions(e, PROMOTIONS)) {
        promotionsUnavailable = true;
        attempt = withoutPromotions(attempt);
        continue;
      }
      if (attempt.consent_collection?.terms_of_service && isTermsOfServiceError(e)) {
        console.error(
          "[stripe] CHECKOUT WITHOUT THE WITHDRAWAL TICKBOX: Stripe refused terms-of-service consent. Set the terms URL in Stripe → Settings → Business → Public details. Until then buyers keep their 14-day right to cancel.",
          err.code ?? "",
          err.param ?? "",
        );
        attempt = withoutTermsConsent(attempt, fallback.withdrawalNotice);
        continue;
      }
      if (attempt.branding_settings && mentions(e, BRANDING)) {
        console.error("[stripe] checkout branding refused, using Stripe's header", err.code ?? "", err.param ?? "");
        attempt = { ...attempt, branding_settings: undefined };
        continue;
      }
      throw e;
    }
  }
}
