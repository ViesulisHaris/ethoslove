import { afterEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { planCheckout, type CheckoutContext, type CheckoutPlan, type CheckoutRequest } from "@/lib/commerce/plan";
import { CHECKOUT_BRANDING, RETURN_PATH, TAX_CODE, consentSentence, consentText, metadataRef, oneTapSessionParams, sessionParams, withdrawalNotice, type SessionOptions } from "@/lib/stripe/line-items";
import { createCheckoutSession, isTermsOfServiceError, resetPromotionsMemo, withoutTermsConsent } from "@/lib/stripe/create-session";

const guest: CheckoutContext = { signedIn: false, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true };

function plan(r: Partial<CheckoutRequest> & Pick<CheckoutRequest, "product">, ctx: CheckoutContext = guest): CheckoutPlan {
  const result = planCheckout({ templateSlugs: [], currency: "eur", ...r }, ctx);
  if (!result.ok) throw new Error(result.error);
  return result;
}

const options: SessionOptions = {
  purchaseId: "11111111-1111-4111-8111-111111111111",
  userId: null,
  email: null,
  locale: "en",
  origin: "https://ethos.test",
  returnTo: "/create/vinyl",
  automaticTax: false,
  productIds: {},
};

describe("the Checkout Session", () => {
  it("charges exactly the planned amounts, VAT included, filed under the digital-goods tax code", () => {
    const p = plan({ product: "single", templateSlugs: ["vinyl"], addEverything: true });
    const params = sessionParams(p, options);
    expect(params.line_items).toEqual([
      {
        quantity: 1,
        price_data: { currency: "eur", unit_amount: 999, tax_behavior: "inclusive", product_data: { name: "Ethos: one template, forever", tax_code: TAX_CODE, description: "Vinyl" } },
      },
      {
        quantity: 1,
        price_data: { currency: "eur", unit_amount: 1500, tax_behavior: "inclusive", product_data: { name: "Ethos: every other template, forever", tax_code: TAX_CODE } },
      },
    ]);
    const charged = (params.line_items ?? []).reduce((sum, line) => sum + (line.price_data?.unit_amount ?? 0), 0);
    expect(charged).toBe(p.total);
    expect(charged).toBe(2499);
  });

  it("files a line under the Stripe Product when one is configured", () => {
    const params = sessionParams(plan({ product: "pass" }), { ...options, productIds: { STRIPE_PRODUCT_PASS: "prod_123" } });
    expect(params.line_items?.[0].price_data).toEqual({ currency: "eur", unit_amount: 2999, tax_behavior: "inclusive", product: "prod_123" });
  });

  it("never shows a Spanish buyer the Stripe Product's English name, and still says which Product it is", () => {
    const params = sessionParams(plan({ product: "everything" }), { ...options, locale: "es", productIds: { STRIPE_PRODUCT_EVERYTHING: "prod_123" } });
    expect(params.line_items?.[0].price_data).toEqual({
      currency: "eur",
      unit_amount: 2499,
      tax_behavior: "inclusive",
      product_data: { name: "Ethos: todas las plantillas, para siempre", tax_code: TAX_CODE, metadata: { stripe_product: "prod_123" } },
    });
  });

  it("names things in Spanish for a Spanish buyer", () => {
    const params = sessionParams(plan({ product: "pack", packId: "distance" }), { ...options, locale: "es" });
    expect(params.line_items?.[0].price_data?.product_data).toMatchObject({ name: "Ethos: pack de juegos", description: "A kilómetros" });
  });

  it("carries what fulfilment needs and nothing about a person or a gift", () => {
    const p = plan({ product: "everything" }, { ...guest, creatorCode: "MARIA" });
    const params = sessionParams(p, { ...options, ref: "c-maria" });
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(2499);
    expect(params.metadata).toEqual({
      app: "ethos",
      purchase_id: options.purchaseId,
      user_id: "",
      guest: "1",
      locale: "en",
      product: "everything",
      template_slugs: "",
      withdrawal_notice: "tickbox",
      kind: "everything",
      creator_code: "MARIA",
      ref: "c-maria",
    });
  });

  it("carries a pack and a bump through to fulfilment", () => {
    expect(sessionParams(plan({ product: "pack", packId: "deep" }), options).metadata).toMatchObject({ product: "pack", pack_id: "deep", kind: "pack", template_slugs: "" });
    expect(sessionParams(plan({ product: "extras", templateSlugs: ["the-letter"], addEverything: true }), options).metadata).toMatchObject({ bump: "1", kind: "bump", template_slugs: "the-letter" });
  });

  it("never sends a gift's id to Stripe, even as a ref from an old link", () => {
    expect(metadataRef("k7m2p9xqa")).toBeUndefined();
    // A database id fits the ref pattern too: never sent either.
    expect(metadataRef("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBeUndefined();
    expect(sessionParams(plan({ product: "pass" }), { ...options, ref: "k7m2p9xqa" }).metadata).not.toHaveProperty("ref");
    for (const ref of ["watermark", "tt-couple", "c-maya", "reply", "email-reminder"]) expect(metadataRef(ref)).toBe(ref);
    const values = Object.values(sessionParams(plan({ product: "giftcard" }), options).metadata ?? {});
    expect(values.every((v) => String(v).length <= 500)).toBe(true);
  });

  it("marks a signed-in buyer's session with their account", () => {
    const params = sessionParams(plan({ product: "pass" }), { ...options, userId: "user-1", email: "a@b.co" });
    expect(params.metadata).toMatchObject({ user_id: "user-1", guest: "0" });
    expect(params.customer_email).toBe("a@b.co");
    expect(params.client_reference_id).toBe(options.purchaseId);
  });

  it("takes a promotion code only for an account on the owner's list, never in the recovery link", () => {
    const params = sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), { ...options, promoCodes: true });
    expect(params.allow_promotion_codes).toBe(true);
    expect(params.after_expiration).toEqual({ recovery: { enabled: true, allow_promotion_codes: false } });
  });

  it("offers no promotion codes, anywhere, and keeps Stripe's default expiry", () => {
    const params = sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), options);
    expect(params.mode).toBe("payment");
    expect(params.allow_promotion_codes).toBe(false);
    expect(params.after_expiration).toEqual({ recovery: { enabled: true, allow_promotion_codes: false } });
    expect(params).not.toHaveProperty("expires_at");
    expect(params.payment_intent_data).toEqual({ statement_descriptor_suffix: "ETHOS" });
    expect(params.success_url).toBe("https://ethos.test/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=%2Fcreate%2Fvinyl");
    expect(params.cancel_url).toBe("https://ethos.test/create/vinyl");
    // The link they came through comes back with a cancel, so trying again is still credited to it.
    expect(sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), { ...options, ref: "watermark", returnTo: "/create/vinyl?resume=publish" }).cancel_url).toBe("https://ethos.test/create/vinyl?resume=publish&ref=watermark");
    // Never a gift's short id, which opens that gift.
    expect(sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), { ...options, ref: "abc23def4" }).cancel_url).toBe("https://ethos.test/create/vinyl");
  });

  it("is headed Ethos, with the site's own icon", () => {
    const params = sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), options);
    expect(params.branding_settings).toEqual(CHECKOUT_BRANDING);
    expect(CHECKOUT_BRANDING).toEqual({ display_name: "Ethos", icon: { type: "url", url: "https://tryethos.io/icons/icon-512.png" } });
  });

  it("sends a Spanish buyer back to the Spanish pages, whether they pay or not", () => {
    const params = sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), { ...options, locale: "es" });
    // The return path itself stays locale-free: the success page's Links add /es to it.
    expect(params.success_url).toBe("https://ethos.test/es/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=%2Fcreate%2Fvinyl");
    expect(params.cancel_url).toBe("https://ethos.test/es/create/vinyl");
    const home = sessionParams(plan({ product: "pass" }), { ...options, locale: "es", returnTo: "/" });
    expect(home.cancel_url).toBe("https://ethos.test/es");
  });

  it("shows Stripe's page in the site's language, whatever the browser's", () => {
    expect(sessionParams(plan({ product: "pass" }), { ...options, locale: "es" }).locale).toBe("es");
    expect(sessionParams(plan({ product: "pass" }), options).locale).toBe("en");
  });

  it("only ever comes back to a path on this site", () => {
    for (const ok of ["/", "/dashboard", "/create/vinyl?ref=abc123&resume=1", "/es/account", "/create/the-letter?x=%20y"]) expect(RETURN_PATH.test(ok)).toBe(true);
    for (const bad of ["//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "https://evil.example", "evil", "/ok path", "/a\u0000b"])
      expect(RETURN_PATH.test(bad)).toBe(false);
  });

  it("turns automatic tax on only when told to", () => {
    expect(sessionParams(plan({ product: "pass" }), options).automatic_tax).toBeUndefined();
    expect(sessionParams(plan({ product: "pass" }), { ...options, automaticTax: true }).automatic_tax).toEqual({ enabled: true });
  });
});

describe("the withdrawal tickbox", () => {
  it("is required of every buyer, with the sentence and a link to the terms", () => {
    const params = sessionParams(plan({ product: "everything" }), options);
    expect(params.consent_collection).toEqual({ promotions: "auto", terms_of_service: "required" });
    expect(params.custom_text).toEqual({ terms_of_service_acceptance: { message: consentText("everything", "en", "https://ethos.test") } });
    expect(params.custom_text).not.toHaveProperty("submit");
    expect(consentText("everything", "en", "https://ethos.test")).toBe(
      "I ask Ethos to unlock my purchase straight away, before the 14-day cancellation period ends, and I understand that once it's unlocked I lose my right to cancel. [Terms](https://ethos.test/legal/terms)",
    );
    expect(consentText("single", "es", "https://ethos.test")).toBe(
      "Pido a Ethos que desbloquee mi compra de inmediato, antes de que termine el plazo de desistimiento de 14 días, y entiendo que, una vez desbloqueada, pierdo mi derecho de desistimiento. [Términos](https://ethos.test/es/legal/terms)",
    );
  });

  it("words the pass as the service it is: it starts at once, never renews, and the right to withdraw stays", () => {
    expect(consentSentence("pass", "en")).toBe(
      "I ask Ethos to start my Ethos for Two year straight away. It's one payment for one year and doesn't renew by itself. I understand that I can still withdraw within 14 days, and that I would then pay only for the days I've used.",
    );
    expect(consentSentence("pass", "es")).toBe(
      "Pido a Ethos que active mi año de Ethos for Two de inmediato. Es un pago único por un año y no se renueva solo. Entiendo que aún puedo desistir en un plazo de 14 días y que, en ese caso, solo pagaría la parte correspondiente a los días ya disfrutados.",
    );
    for (const locale of ["en", "es"] as const) expect(consentSentence("pass", locale)).not.toMatch(/lose my right|pierdo mi derecho/);
  });

  it("keeps a gift card's right to cancel until the code is redeemed", () => {
    for (const locale of ["en", "es"] as const) expect(consentSentence("giftcard", locale)).not.toMatch(/lose my right|pierdo mi derecho/);
    expect(consentSentence("giftcard", "en")).toMatch(/cancel within 14 days for a full refund as long as the code hasn't been redeemed/);
    expect(consentSentence("giftcard", "es")).toMatch(/siempre que el código no se haya canjeado/);
  });

  it("fits Stripe's 1,200 characters", () => {
    for (const product of ["single", "pass", "giftcard", "membership"] as const)
      for (const locale of ["en", "es"] as const)
        for (const membershipPlan of ["monthly", "yearly"] as const) {
          expect(consentText(product, locale, "https://tryethos.io", { plan: membershipPlan, currency: "gbp" }).length).toBeLessThanOrEqual(1200);
          expect(withdrawalNotice(product, locale, "https://tryethos.io", { plan: membershipPlan, currency: "gbp" }).length).toBeLessThanOrEqual(1200);
        }
  });

  it("falls back to the notice above the pay button, keeping the marketing box", () => {
    const params = sessionParams(plan({ product: "pass" }), options);
    const fallback = withoutTermsConsent(params, withdrawalNotice("pass", "en", "https://ethos.test"));
    expect(fallback.consent_collection).toEqual({ promotions: "auto" });
    expect(fallback.custom_text).toEqual({ submit: { message: withdrawalNotice("pass", "en", "https://ethos.test") } });
    expect(fallback.metadata).toMatchObject({ withdrawal_notice: "shown_at_payment", product: "pass" });
    expect(withdrawalNotice("pass", "en", "https://ethos.test")).toBe(
      "By paying, you ask for your year of Ethos for Two to start straight away. It's one payment for one year and doesn't renew by itself. You can withdraw within 14 days. Terms: https://ethos.test/legal/terms",
    );
    // The original is left as it was.
    expect(params.consent_collection).toEqual({ promotions: "auto", terms_of_service: "required" });
  });
});

describe("creating the session without ever failing a sale over something optional", () => {
  const params = sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), options);
  const notice = withdrawalNotice("single", "en", "https://ethos.test");
  const session = { id: "cs_test_1", url: "https://checkout.stripe.test/1" } as Stripe.Checkout.Session;
  const refused = (param: string, message: string) => new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", param, message });
  const stripeWith = (...results: (Error | Stripe.Checkout.Session)[]) => {
    const create = vi.fn(async (sent: Stripe.Checkout.SessionCreateParams) => {
      void sent;
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next as Stripe.Checkout.Session;
    });
    return { create, stripe: { checkout: { sessions: { create } } } };
  };
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  afterEach(() => {
    error.mockClear();
    resetPromotionsMemo();
  });

  it("sends the session as it is when Stripe takes it", async () => {
    const { create, stripe } = stripeWith(session);
    await expect(createCheckoutSession(stripe, params, { withdrawalNotice: notice })).resolves.toBe(session);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toBe(params);
    expect(error).not.toHaveBeenCalled();
  });

  it("without a terms URL on the account: the same session with the notice instead of the tickbox, said loudly", async () => {
    const { create, stripe } = stripeWith(
      refused("consent_collection[terms_of_service]", "You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard."),
      session,
    );
    await expect(createCheckoutSession(stripe, params, { withdrawalNotice: notice })).resolves.toBe(session);
    expect(create).toHaveBeenCalledTimes(2);
    const retried = create.mock.calls[1][0];
    expect(retried.consent_collection).toEqual({ promotions: "auto" });
    expect(retried.custom_text).toEqual({ submit: { message: notice } });
    expect(retried.metadata).toMatchObject({ withdrawal_notice: "shown_at_payment", purchase_id: options.purchaseId });
    expect({ ...retried, consent_collection: undefined, custom_text: undefined, metadata: undefined }).toEqual({ ...params, consent_collection: undefined, custom_text: undefined, metadata: undefined });
    expect(error).toHaveBeenCalledWith(expect.stringContaining("WITHOUT THE WITHDRAWAL TICKBOX"), expect.anything(), expect.anything());
  });

  it("recognises the terms error by its message too", () => {
    expect(isTermsOfServiceError(refused("", "Please set a terms of service URL in your public business details."))).toBe(true);
    expect(isTermsOfServiceError(refused("custom_text[terms_of_service_acceptance][message]", "Too long"))).toBe(true);
    expect(isTermsOfServiceError(refused("line_items", "Invalid amount"))).toBe(false);
    expect(isTermsOfServiceError(new Error("terms of service"))).toBe(false);
  });

  it("then drops the marketing box and the branding if those are refused too, and nothing else", async () => {
    const { create, stripe } = stripeWith(
      refused("consent_collection[terms_of_service]", "terms of service URL missing"),
      refused("consent_collection[promotions]", "Promotions consent is not available"),
      refused("branding_settings[icon]", "Invalid URL"),
      session,
    );
    await expect(createCheckoutSession(stripe, params, { withdrawalNotice: notice })).resolves.toBe(session);
    const last = create.mock.calls[3][0];
    expect(last.consent_collection).toBeUndefined();
    expect(last.branding_settings).toBeUndefined();
    expect(last.custom_text).toEqual({ submit: { message: notice } });
    expect(last.line_items).toEqual(params.line_items);
  });

  it("drops the marketing box on Stripe's real refusal (no param, only a message), then stops asking", async () => {
    // What the test-mode account answered on 23 Sept: the box is for US merchants only.
    const notHere = () => new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "`consent_collection.promotions` is not available in your country." });
    const first = stripeWith(notHere(), session);
    await expect(createCheckoutSession(first.stripe, params, { withdrawalNotice: notice })).resolves.toBe(session);
    expect(first.create).toHaveBeenCalledTimes(2);
    expect(first.create.mock.calls[1][0].consent_collection).toEqual({ terms_of_service: "required" });
    expect(first.create.mock.calls[1][0].custom_text).toEqual(params.custom_text);
    // The next checkout on this instance doesn't ask again: one call.
    const next = stripeWith(session);
    await createCheckoutSession(next.stripe, params, { withdrawalNotice: notice });
    expect(next.create).toHaveBeenCalledTimes(1);
    expect(next.create.mock.calls[0][0].consent_collection).toEqual({ terms_of_service: "required" });
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps the tickbox when only the marketing box is refused", async () => {
    const { create, stripe } = stripeWith(refused("consent_collection[promotions]", "Promotions consent is only available to US merchants"), session);
    await createCheckoutSession(stripe, params, { withdrawalNotice: notice });
    expect(create.mock.calls[1][0].consent_collection).toEqual({ terms_of_service: "required" });
    expect(create.mock.calls[1][0].custom_text).toEqual(params.custom_text);
  });

  it("throws anything else, and doesn't loop", async () => {
    const { create, stripe } = stripeWith(refused("line_items[0][price_data][unit_amount]", "Invalid integer"));
    await expect(createCheckoutSession(stripe, params, { withdrawalNotice: notice })).rejects.toThrow("Invalid integer");
    expect(create).toHaveBeenCalledTimes(1);
    const again = stripeWith(refused("consent_collection[terms_of_service]", "terms of service"), refused("consent_collection[terms_of_service]", "terms of service"));
    await expect(createCheckoutSession(again.stripe, params, { withdrawalNotice: notice })).rejects.toThrow();
    expect(again.create).toHaveBeenCalledTimes(2);
    const network = stripeWith(new Error("ECONNRESET"));
    await expect(createCheckoutSession(network.stripe, params, { withdrawalNotice: notice })).rejects.toThrow("ECONNRESET");
  });
});

describe("the Checkout Session for two more gifts", () => {
  const buyer: CheckoutContext = {
    signedIn: true,
    ownedForever: ["vinyl"],
    purchases: [{ product: "single", amount: 999, currency: "eur", status: "paid" }],
    creatorCode: null,
    giftCardsOnSale: false,
    pair: { onSale: true, ready: 0, memberRunning: false, paidProducts: ["single"] },
  };
  const signedIn = { ...options, userId: "22222222-2222-4222-8222-222222222222", email: "a@b.test", returnTo: "/dashboard" };

  it("is one line at its price, described in the buyer's language", () => {
    const en = sessionParams(plan({ product: "pair" }, buyer), signedIn);
    expect(en.line_items).toEqual([
      { quantity: 1, price_data: { currency: "eur", unit_amount: 799, tax_behavior: "inclusive", product_data: { name: "Ethos: two more gifts", tax_code: TAX_CODE, description: "Two gifts, any you like, whenever you like" } } },
    ]);
    const es = sessionParams(plan({ product: "pair", currency: "usd" }, buyer), { ...signedIn, locale: "es" });
    expect(es.line_items?.[0].price_data).toMatchObject({ currency: "usd", unit_amount: 899, product_data: { name: "Ethos: dos regalos más", description: "Dos regalos, los que quieras, cuando quieras" } });
  });

  it("carries Ethos's metadata and no customer, no saved card (R10)", () => {
    const params = sessionParams(plan({ product: "pair" }, buyer), signedIn);
    expect(params.metadata).toMatchObject({ app: "ethos", product: "pair", kind: "pair", template_slugs: "", guest: "0" });
    for (const key of ["customer", "customer_creation", "invoice_creation"] as const) expect(params[key]).toBeUndefined();
    expect(params.payment_intent_data).toEqual({ statement_descriptor_suffix: "ETHOS" });
    expect(JSON.stringify(params.custom_text)).toContain(consentSentence("pair", "en").replace(/'/g, "'"));
  });

  it("states the 30 days in its own sentence and notice, in both languages", () => {
    expect(consentSentence("pair", "en")).toBe("I understand that I can cancel within 30 days for a refund of any of these gifts I haven't used, and that a gift I've used can no longer be cancelled.");
    expect(consentSentence("pair", "es")).toBe("Entiendo que puedo desistir en un plazo de 30 días, con el reembolso de los regalos que no haya usado, y que un regalo ya usado no se puede cancelar.");
    expect(withdrawalNotice("pair", "en", "https://ethos.test")).toBe("Two gifts are added to your account. A gift you haven't used can be refunded for 30 days; once you've used one it can't be cancelled. Terms: https://ethos.test/legal/terms");
    expect(withdrawalNotice("pair", "es", "https://ethos.test")).toContain("30 días");
    // Every other product's sentence is what it was.
    expect(consentSentence("single", "en")).toBe("I ask Ethos to unlock my purchase straight away, before the 14-day cancellation period ends, and I understand that once it's unlocked I lose my right to cancel.");
  });

  it("a gift paid with two more: the box says both what the unlock gives up and what the two keep, before paying", () => {
    const withPair = plan({ product: "single", templateSlugs: ["bouquet"], addPair: true }, { ...guest, addPair: { onSale: true, ready: 0 } });
    expect(withPair).toMatchObject({ kind: "with_pair", pair: true });
    const params = sessionParams(withPair, options);
    const box = (params.custom_text?.terms_of_service_acceptance as { message: string }).message;
    expect(box).toContain(consentSentence("single", "en"));
    expect(box).toContain("I understand that I can cancel the two more gifts within 30 days for a refund of any I haven't used, and that a gift I've used can no longer be cancelled.");
    expect(consentSentence("extras", "es", { pair: true })).toContain("Entiendo que puedo desistir de los dos regalos más en un plazo de 30 días");
    expect(withdrawalNotice("single", "en", "https://ethos.test", { pair: true })).toContain("The two more gifts are added to your account: one you haven't used can be refunded for 30 days.");
    expect(withdrawalNotice("single", "es", "https://ethos.test", { pair: true })).toContain("30 días");
    // Without the two, every sentence is what it was; a pair flag means nothing on another product.
    expect(consentSentence("single", "en", { pair: false })).toBe(consentSentence("single", "en"));
    expect(consentSentence("membership", "en", { pair: true })).toBe(consentSentence("membership", "en"));
    expect(withdrawalNotice("single", "en", "https://ethos.test")).not.toContain("two more");
  });

  it("is a one-tap session marked 'shown_at_payment', where the pay sheet's are 'pay_sheet' as before", () => {
    const pairTap = oneTapSessionParams(sessionParams(plan({ product: "pair" }, buyer), signedIn), { notice: "shown_at_payment" });
    expect(pairTap).toMatchObject({ ui_mode: "elements", metadata: { withdrawal_notice: "shown_at_payment", product: "pair" } });
    for (const key of ["success_url", "cancel_url", "custom_text", "consent_collection", "after_expiration", "branding_settings", "locale", "customer", "customer_creation"] as const) expect(pairTap[key]).toBeUndefined();
    const single = oneTapSessionParams(sessionParams(plan({ product: "single", templateSlugs: ["vinyl"] }), options));
    expect(single.metadata?.withdrawal_notice).toBe("pay_sheet");
  });
});
