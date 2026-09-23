import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { planCheckout, type CheckoutContext, type CheckoutRequest } from "@/lib/commerce/plan";
import { consentSentence, sessionMetadata, type SessionOptions } from "@/lib/stripe/line-items";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown }));
const mail = vi.hoisted(() => ({
  notifyReceipt: vi.fn(async () => undefined),
  notifyWelcome: vi.fn(async () => undefined),
  sendPassWelcome: vi.fn(async () => true),
  sendGiftCardEmail: vi.fn(async () => true),
  sendCheckoutRecovery: vi.fn(async () => true),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe }));
vi.mock("@/lib/email/notify", () => mail);

const { chargedAmount, fulfilCheckoutSession, readSession, revokePurchaseByPaymentIntent } = await import("@/lib/stripe/fulfil");
const { recoverExpiredSession, recoveryTarget } = await import("@/lib/stripe/recovery");

const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const PURCHASE = "11111111-1111-4111-8111-111111111111";
const guest: CheckoutContext = { signedIn: false, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true };

function metadata(r: Partial<CheckoutRequest> & Pick<CheckoutRequest, "product">, extra: Partial<SessionOptions> = {}, ctx: CheckoutContext = guest) {
  const plan = planCheckout({ templateSlugs: [], currency: "eur", ...r }, ctx);
  if (!plan.ok) throw new Error(plan.error);
  const options: SessionOptions = { purchaseId: PURCHASE, userId: null, email: null, locale: "en", origin: "https://ethos.test", returnTo: "/", automaticTax: false, productIds: {}, ...extra };
  return { plan, meta: sessionMetadata(plan, options) };
}

function session(meta: Record<string, string>, extra: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    payment_status: "paid",
    amount_total: 999,
    currency: "eur",
    currency_conversion: null,
    payment_intent: "pi_1",
    customer_details: { email: "Buyer@Example.com" },
    customer_email: null,
    metadata: meta,
    client_reference_id: meta.purchase_id ?? null,
    created: NOW / 1000,
    ...extra,
  } as unknown as Stripe.Checkout.Session;
}

let fake: FakeDb;
function useDb(seed: Record<string, Record<string, unknown>[]> = {}) {
  fake = new FakeDb(seed, NOW);
  const createUser = vi.fn(async ({ email }: { email: string }) => {
    fake.tables.profiles = [...fake.rows("profiles"), { id: "new-user", email, locale: "en" }];
    return { data: { user: { id: "new-user" } }, error: null };
  });
  state.db = { ...fake.db, auth: { admin: { createUser } } };
  return createUser;
}
const unlocks = (userId: string) =>
  fake
    .rows("template_unlocks")
    .filter((r) => r.user_id === userId)
    .map((r) => `${r.template_slug}@${r.purchase_id}`)
    .sort();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  state.stripe = null;
});
afterEach(() => vi.useRealTimers());

describe("reading a session back", () => {
  it("reads what our checkout wrote, and nothing else", () => {
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"], addEverything: true }, { ref: "c-maria" }, { ...guest, creatorCode: "MARIA" });
    expect(readSession(session(meta))).toEqual({
      purchaseId: PURCHASE,
      product: "single",
      slugs: ["vinyl"],
      packId: null,
      bump: true,
      kind: "bump",
      creatorCode: "MARIA",
      ref: "c-maria",
      locale: "en",
    });
    // Another business on the shared Stripe account, or a pack with no pack.
    expect(readSession(session({ order: "42" }))).toBeNull();
    expect(readSession(session({ purchase_id: PURCHASE, product: "pack" }))).toBeNull();
    // A session made by the live site before these products existed still reads.
    expect(readSession(session({ purchase_id: PURCHASE, product: "everything", template_slugs: "" }))).toMatchObject({ product: "everything", kind: "everything", bump: false });
  });

  it("records the catalogue-currency amount when Stripe showed a converted price", () => {
    expect(chargedAmount(session({}), 0)).toEqual({ amount: 999, currency: "eur" });
    expect(chargedAmount(session({}, { amount_total: 1150, currency: "usd", currency_conversion: { amount_total: 999, amount_subtotal: 999, fx_rate: "1.15", source_currency: "eur" } }), 0)).toEqual({ amount: 999, currency: "eur" });
  });
});

describe("fulfilment, signed in", () => {
  const signedIn = (meta: Record<string, string>) => ({ ...meta, user_id: "u1", guest: "0" });

  it("marks the purchase paid at what was charged and grants the template and the bump", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "single", status: "pending", amount: 2398, currency: "eur" }], profiles: [{ id: "u1", email: "u1@x.co", locale: "en" }] });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"], addEverything: true });
    const result = await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 2398 }));
    expect(result).toEqual({ ok: true, userId: "u1" });
    expect(fake.rows("purchases")[0]).toMatchObject({ status: "paid", amount: 2398, currency: "eur", stripe_payment_intent_id: "pi_1", stripe_session_id: "cs_test_1" });
    expect(unlocks("u1")).toEqual([`*@${PURCHASE}`, `vinyl@${PURCHASE}`]);
    expect(mail.notifyReceipt).toHaveBeenCalledTimes(1);
    // Forever: no end date for the receipt to show.
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "One template + every other template", "€23.98", ["Vinyl", "All templates, current and future"], undefined);
  });

  it("records the withdrawal sentence the buyer ticked, and repeats it on the receipt", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "single", status: "pending", amount: 999, currency: "eur" }], profiles: [{ id: "u1", email: "u1@x.co", locale: "en" }] });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"] }, { locale: "es" });
    await fulfilCheckoutSession(session(signedIn(meta), { consent: { terms_of_service: "accepted", promotions: null } }));
    const sentence = consentSentence("single", "es");
    expect(fake.rows("purchases")[0]).toMatchObject({ status: "paid", terms_consent: sentence, terms_consent_at: new Date(NOW).toISOString() });
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "One template", "€9.99", ["Vinyl"], expect.objectContaining({ consent: sentence }));

    // A second fulfilment doesn't move the time it was given.
    vi.setSystemTime(NOW + 60_000);
    await fulfilCheckoutSession(session(signedIn(meta), { consent: { terms_of_service: "accepted", promotions: null } }));
    expect(fake.rows("purchases")[0].terms_consent_at).toBe(new Date(NOW).toISOString());
  });

  it("records nothing when Stripe couldn't show the tickbox", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "single", status: "pending", amount: 999, currency: "eur" }], profiles: [{ id: "u1", email: "u1@x.co", locale: "en" }] });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"] });
    await fulfilCheckoutSession(session(signedIn(meta), { consent: null }));
    expect(fake.rows("purchases")[0].status).toBe("paid");
    expect(fake.rows("purchases")[0].terms_consent ?? null).toBeNull();
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "One template", "€9.99", ["Vinyl"], expect.not.objectContaining({ consent: expect.anything() }));
  });

  it("writes the receipt in the buyer's account language", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "pack", status: "pending", amount: 299, currency: "eur" }], profiles: [{ id: "u1", email: "u1@x.co", locale: "es" }] });
    const { meta } = metadata({ product: "pack", packId: "distance" });
    await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 299 }));
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "Pack de juegos", "2,99\u00a0€", ["A kilómetros"], undefined);
  });

  it("is idempotent: the second call (webhook after success page) changes nothing and sends nothing", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "pack", status: "pending", amount: 299, currency: "eur" }] });
    const { meta } = metadata({ product: "pack", packId: "deep" });
    await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 299 }));
    await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 299 }));
    expect(unlocks("u1")).toEqual([`pack:deep@${PURCHASE}`]);
    expect(mail.notifyReceipt).toHaveBeenCalledTimes(1);
  });

  it("still grants when another deployment already marked the purchase paid", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "single", status: "paid", amount: 2398, currency: "eur" }] });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"], addEverything: true });
    expect(await fulfilCheckoutSession(session(signedIn(meta)))).toMatchObject({ ok: true });
    expect(unlocks("u1")).toEqual([`*@${PURCHASE}`, `vinyl@${PURCHASE}`]);
    expect(mail.notifyReceipt).not.toHaveBeenCalled();
  });

  it("never hands back what a refund took", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "everything", status: "refunded", amount: 2499, currency: "eur" }] });
    const { meta } = metadata({ product: "everything" });
    expect(await fulfilCheckoutSession(session(signedIn(meta)))).toEqual({ ok: false, reason: "refunded" });
    expect(unlocks("u1")).toEqual([]);

    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "everything", status: "pending", amount: 2499, currency: "eur" }] });
    state.stripe = { paymentIntents: { retrieve: async () => ({ latest_charge: { refunded: true, disputed: false } }) } };
    expect(await fulfilCheckoutSession(session(signedIn(meta)))).toEqual({ ok: false, reason: "refunded" });
    expect(fake.rows("purchases")[0].status).toBe("refunded");
    expect(unlocks("u1")).toEqual([]);
  });

  it("flags a second payment for the same purchase (a recovery link paid twice) for a refund", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "everything", status: "paid", amount: 2499, currency: "eur", stripe_payment_intent_id: "pi_first" }] });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { meta } = metadata({ product: "everything" });
    expect(await fulfilCheckoutSession(session(signedIn(meta), { id: "cs_recovered", payment_intent: "pi_second" }))).toMatchObject({ ok: true });
    expect(errors).toHaveBeenCalledWith("[stripe] a second payment for one purchase: refund it", "cs_recovered", "pi_second");
    expect(fake.rows("purchases")[0].stripe_payment_intent_id).toBe("pi_first");
    errors.mockClear();
    await fulfilCheckoutSession(session(signedIn(meta), { payment_intent: "pi_first" }));
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("won't fulfil somebody else's purchase", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "someone-else", product: "everything", status: "pending", amount: 2499, currency: "eur" }] });
    const { meta } = metadata({ product: "everything" });
    expect(await fulfilCheckoutSession(session(signedIn(meta)))).toEqual({ ok: false, reason: "purchase_mismatch" });
  });

  it("starts a pass and sends the welcome with the invite link, once", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "pass", status: "pending", amount: 2900, currency: "eur" }], profiles: [{ id: "u1", email: "u1@x.co", locale: "es" }] });
    const { meta } = metadata({ product: "pass" }, { locale: "es" });
    const result = await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 2900 }));
    const code = fake.rows("couple_passes")[0].invite_code as string;
    expect(result).toMatchObject({ ok: true, passInviteUrl: expect.stringMatching(new RegExp(`/es/for-two/join\\?code=${code}$`)) });
    expect(unlocks("u1")).toEqual([`*@${PURCHASE}`, `pack:*@${PURCHASE}`]);
    expect(mail.sendPassWelcome).toHaveBeenCalledWith({ to: "u1@x.co", locale: "es", inviteUrl: result.passInviteUrl, endsAt: "2027-09-23T12:00:00.000Z", partnerJoined: false });
    // A year, not forever: the receipt carries the end date.
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "Ethos for Two (un año)", expect.any(String), ["Todas las plantillas de regalo y todos los packs de juegos, para los dos"], { until: "2027-09-23T12:00:00.000Z" });
    await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 2900 }));
    expect(mail.sendPassWelcome).toHaveBeenCalledTimes(1);
    expect(fake.rows("couple_passes")).toHaveLength(1);
  });

  it("doesn't ask a renewing owner to send the invite again when the partner is already in", async () => {
    const RENEWAL = "22222222-2222-4222-8222-222222222222";
    useDb({
      purchases: [
        { id: PURCHASE, user_id: "u1", product: "pass", status: "paid", amount: 2900, currency: "eur" },
        { id: RENEWAL, user_id: "u1", product: "pass", status: "pending", amount: 2900, currency: "eur" },
      ],
      couple_passes: [{ id: "p1", purchase_id: PURCHASE, owner_user_id: "u1", partner_user_id: "u2", invite_code: "abcdefghij", starts_at: "2026-01-01T00:00:00.000Z", ends_at: "2026-12-31T00:00:00.000Z", renewal_reminded_at: null }],
      profiles: [{ id: "u1", email: "u1@x.co", locale: "en" }],
    });
    const { meta } = metadata({ product: "pass" }, { purchaseId: RENEWAL });
    await fulfilCheckoutSession(session({ ...signedIn(meta), purchase_id: RENEWAL }, { amount_total: 2900 }));
    expect(mail.sendPassWelcome).toHaveBeenCalledWith(expect.objectContaining({ partnerJoined: true, endsAt: "2027-12-31T00:00:00.000Z" }));
  });

  it("offers Everything for the difference on a single's receipt, and not once Everything is owned", async () => {
    useDb({
      purchases: [
        { id: "old", user_id: "u1", product: "single", status: "paid", amount: 999, currency: "eur" },
        { id: PURCHASE, user_id: "u1", product: "single", status: "pending", amount: 999, currency: "eur" },
      ],
      profiles: [{ id: "u1", email: "u1@x.co", locale: "es" }],
    });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"] });
    await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 999 }));
    // €24.99 − €9.99 − €9.99: the same price checkout would charge for the upgrade.
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "Una plantilla", "9,99\u00a0€", ["Vinilo"], {
      upgrade: { url: "http://localhost:3000/es/account", amountLabel: "5,01\u00a0€" },
    });

    vi.clearAllMocks();
    useDb({
      purchases: [{ id: PURCHASE, user_id: "u1", product: "single", status: "pending", amount: 999, currency: "eur" }],
      template_unlocks: [{ id: "t1", user_id: "u1", template_slug: "*", purchase_id: "bought-before" }],
      profiles: [{ id: "u1", email: "u1@x.co", locale: "en" }],
    });
    await fulfilCheckoutSession(session(signedIn(meta), { amount_total: 999 }));
    expect(mail.notifyReceipt).toHaveBeenCalledWith("u1", "One template", "€9.99", ["Vinyl"], undefined);
  });
});

describe("fulfilment, guest", () => {
  it("creates the account, records the sale with who brought it, and emails the gift card once", async () => {
    const createUser = useDb({ gift_card_details: [{ purchase_id: PURCHASE, recipient_name: "Sam", note: "For you", created_at: new Date(NOW).toISOString() }] });
    const { meta } = metadata({ product: "giftcard" }, { ref: "c-maria" }, { ...guest, creatorCode: "MARIA" });
    // The name and note never went to Stripe: they waited in our database.
    expect(JSON.stringify(meta)).not.toMatch(/Sam|For you/);
    const result = await fulfilCheckoutSession(session(meta, { amount_total: 2499 }));
    expect(createUser).toHaveBeenCalledTimes(1);
    const card = fake.rows("gift_cards")[0];
    expect(result).toEqual({ ok: true, userId: "new-user", email: "buyer@example.com", createdUser: true, giftCardCode: card.code });
    expect(fake.rows("purchases")[0]).toMatchObject({
      id: PURCHASE,
      user_id: "new-user",
      product: "giftcard",
      amount: 2499,
      status: "paid",
      kind: "giftcard",
      creator_code: "MARIA",
      ref: "c-maria",
      discount_amount: null,
    });
    expect(card).toMatchObject({ purchase_id: PURCHASE, buyer_user_id: "new-user", recipient_name: "Sam", note: "For you" });
    // The card holds them now, so they aren't kept twice.
    expect(fake.rows("gift_card_details")).toEqual([]);
    expect(mail.sendGiftCardEmail).toHaveBeenCalledWith({
      to: "buyer@example.com",
      locale: "en",
      code: card.code,
      redeemUrl: expect.stringMatching(new RegExp(`/redeem\\?code=${card.code}$`)),
      recipientName: "Sam",
      note: "For you",
    });
    expect(mail.notifyWelcome).toHaveBeenCalledTimes(1);
    expect(unlocks("new-user")).toEqual([]);

    const again = await fulfilCheckoutSession(session(meta, { amount_total: 2499 }));
    expect(again).toMatchObject({ ok: true, userId: "new-user", createdUser: false, giftCardCode: card.code });
    expect(fake.rows("gift_cards")).toHaveLength(1);
    expect(mail.sendGiftCardEmail).toHaveBeenCalledTimes(1);
    expect(mail.notifyReceipt).toHaveBeenCalledTimes(1);
    // The right to cancel lasts until the code is redeemed: the receipt must say so, not waive it.
    expect(mail.notifyReceipt).toHaveBeenCalledWith("new-user", "Gift card: Give Everything", "€24.99", [expect.stringContaining("gift card code")], { giftCard: true });
  });

  it("hands nothing to a new account when the one it was fulfilled into has been deleted", async () => {
    const createUser = useDb({ purchases: [{ id: PURCHASE, user_id: null, product: "everything", status: "paid", amount: 2499, currency: "eur" }] });
    const { meta } = metadata({ product: "everything" });
    expect(await fulfilCheckoutSession(session(meta, { amount_total: 2499 }))).toEqual({ ok: false, reason: "account_deleted" });
    expect(createUser).not.toHaveBeenCalled();
    expect(fake.rows("template_unlocks")).toEqual([]);
  });

  it("shows a pass's invite link only in the browser of the account the checkout made", async () => {
    useDb();
    const { meta } = metadata({ product: "pass" });
    const made = await fulfilCheckoutSession(session(meta, { amount_total: 2900 }));
    expect(made).toMatchObject({ ok: true, createdUser: true, passInviteUrl: expect.stringContaining("/for-two/join?code=") });

    // Somebody typed an existing account's email: the link goes to that account by email only.
    useDb({ profiles: [{ id: "u9", email: "buyer@example.com", locale: "en" }] });
    const getUserById = vi.fn(async () => ({ data: { user: { id: "u9", app_metadata: {} } }, error: null }));
    (state.db as { auth: { admin: Record<string, unknown> } }).auth.admin.getUserById = getUserById;
    const theirs = await fulfilCheckoutSession(session(meta, { amount_total: 2900 }));
    expect(theirs).toMatchObject({ ok: true, userId: "u9", createdUser: false });
    expect(theirs.passInviteUrl).toBeUndefined();
    expect(mail.sendPassWelcome).toHaveBeenLastCalledWith(expect.objectContaining({ to: "buyer@example.com", inviteUrl: expect.stringContaining("/for-two/join?code=") }));

    // The same checkout's second fulfilment (the success page after the webhook) still shows it.
    getUserById.mockResolvedValue({ data: { user: { id: "u9", app_metadata: { checkout_session: "cs_test_1" } } }, error: null });
    expect((await fulfilCheckoutSession(session(meta, { amount_total: 2900 }))).passInviteUrl).toContain("/for-two/join?code=");
  });

  it("buys for an existing account by its email", async () => {
    const createUser = useDb({ profiles: [{ id: "u9", email: "buyer@example.com", locale: "en" }] });
    const { meta } = metadata({ product: "extras", templateSlugs: ["the-letter"] });
    expect(await fulfilCheckoutSession(session(meta, { amount_total: 749 }))).toMatchObject({ ok: true, userId: "u9", createdUser: false });
    expect(createUser).not.toHaveBeenCalled();
    expect(unlocks("u9")).toEqual([`the-letter@${PURCHASE}`]);
  });

  it("fills in what the live site's webhook didn't know when it wrote the purchase first", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u9", product: "single", status: "paid", amount: 2398, currency: "eur", kind: null }] });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"], addEverything: true }, { ref: "tt-bio" });
    expect(await fulfilCheckoutSession(session(meta))).toMatchObject({ ok: true, userId: "u9" });
    expect(fake.rows("purchases")[0]).toMatchObject({ kind: "bump", ref: "tt-bio" });
    expect(unlocks("u9")).toEqual([`*@${PURCHASE}`, `vinyl@${PURCHASE}`]);
    expect(mail.notifyReceipt).not.toHaveBeenCalled();
  });

  it("needs an email and a paid session", async () => {
    useDb();
    const { meta } = metadata({ product: "everything" });
    expect(await fulfilCheckoutSession(session(meta, { customer_details: null }))).toEqual({ ok: false, reason: "no_email" });
    expect(await fulfilCheckoutSession(session(meta, { payment_status: "unpaid" }))).toEqual({ ok: false, reason: "unpaid" });
    expect(await fulfilCheckoutSession(session(meta, { payment_status: "no_payment_required", amount_total: 0 }))).toMatchObject({ ok: true });
  });
});

describe("refunds by payment intent", () => {
  it("find the purchase and take back what it granted", async () => {
    useDb({ purchases: [{ id: PURCHASE, user_id: "u1", product: "single", status: "paid", amount: 999, currency: "eur", stripe_payment_intent_id: "pi_9" }] });
    fake.tables.template_unlocks = [{ id: "t1", user_id: "u1", template_slug: "vinyl", purchase_id: PURCHASE }];
    await revokePurchaseByPaymentIntent("pi_other");
    expect(unlocks("u1")).toHaveLength(1);
    await revokePurchaseByPaymentIntent("pi_9");
    expect(unlocks("u1")).toEqual([]);
    expect(fake.rows("purchases")[0].status).toBe("refunded");
  });
});

describe("abandoned checkout recovery", () => {
  const expired = (extra: Record<string, unknown> = {}) => {
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"] }, { locale: "es" });
    return session(meta, {
      id: `cs_expired_${Math.random()}`,
      status: "expired",
      payment_status: "unpaid",
      consent: { promotions: "opt_in", terms_of_service: null },
      after_expiration: { recovery: { enabled: true, allow_promotion_codes: false, expires_at: null, url: "https://buy.stripe.com/r/live_abc" } },
      ...extra,
    });
  };

  it("only writes to someone who ticked the marketing box, about a session of ours", () => {
    expect(recoveryTarget(expired())).toEqual({ to: "buyer@example.com", locale: "es", url: "https://buy.stripe.com/r/live_abc", templateSlug: "vinyl" });
    expect(recoveryTarget(expired({ consent: { promotions: "opt_out", terms_of_service: null } }))).toBeNull();
    expect(recoveryTarget(expired({ consent: null }))).toBeNull();
    expect(recoveryTarget(expired({ after_expiration: null }))).toBeNull();
    expect(recoveryTarget(expired({ customer_details: null }))).toBeNull();
    expect(recoveryTarget(expired({ metadata: { order: "42" } }))).toBeNull();
  });

  it("sends once, and not to somebody who has paid since", async () => {
    useDb({ profiles: [{ id: "u9", email: "buyer@example.com", locale: "es" }] });
    const one = expired();
    expect(await recoverExpiredSession(one)).toBe(true);
    expect(await recoverExpiredSession(one)).toBe(false);
    expect(mail.sendCheckoutRecovery).toHaveBeenCalledTimes(1);
    expect(mail.sendCheckoutRecovery).toHaveBeenCalledWith({ to: "buyer@example.com", locale: "es", url: "https://buy.stripe.com/r/live_abc", templateSlug: "vinyl" });

    fake.tables.purchases = [{ id: "later", user_id: "u9", product: "single", status: "paid", amount: 999, currency: "eur", created_at: new Date(NOW + 60_000).toISOString() }];
    expect(await recoverExpiredSession(expired())).toBe(false);
    expect(mail.sendCheckoutRecovery).toHaveBeenCalledTimes(1);
  });

  it("writes to an address once a week, however many checkouts it left", async () => {
    useDb();
    const to = { customer_details: { email: "twice@example.com" } };
    expect(await recoverExpiredSession(expired(to))).toBe(true);
    expect(await recoverExpiredSession(expired(to))).toBe(false);
    expect(await recoverExpiredSession(expired({ customer_details: { email: "someone-else@example.com" } }))).toBe(true);
    expect(mail.sendCheckoutRecovery).toHaveBeenCalledTimes(2);
  });

  const hashed = (email: string) => createHash("sha256").update(email).digest("hex");

  it("writes only to a buyer who ticked Stripe's box, never one who didn't, unsubscribed, or had one this week", async () => {
    useDb({ email_optouts: [{ email_sha256: hashed("gone@example.com") }] });
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"] }, { locale: "es" });
    const table: [string, Stripe.Checkout.Session, boolean][] = [
      ["Stripe's box", expired({ customer_details: { email: "stripes@example.com" } }), true],
      ["no box on this account (no consent at all)", expired({ metadata: meta, consent: null, customer_details: { email: "neither@example.com" } }), false],
      ["an old recovery_optin flag no longer counts", expired({ metadata: { ...meta, recovery_optin: "1" }, consent: null, customer_details: { email: "flag@example.com" } }), false],
      ["Stripe's box shown and left unticked", expired({ consent: { promotions: "opt_out", terms_of_service: null }, customer_details: { email: "declined@example.com" } }), false],
      ["Stripe's box, from an address that unsubscribed", expired({ customer_details: { email: " Gone@Example.com" } }), false],
      ["Stripe's box, to an address already written to this week", expired({ customer_details: { email: "stripes@example.com" } }), false],
    ];
    for (const [why, session, sends] of table) expect(await recoverExpiredSession(session), why).toBe(sends);
    expect(mail.sendCheckoutRecovery).toHaveBeenCalledTimes(1);
    expect(mail.sendCheckoutRecovery).not.toHaveBeenCalledWith(expect.objectContaining({ to: "gone@example.com" }));
  });

  it("never writes recovery_optin into the metadata", () => {
    const { meta } = metadata({ product: "single", templateSlugs: ["vinyl"] }, { locale: "es" });
    expect(meta).not.toHaveProperty("recovery_optin");
    expect(recoveryTarget(expired({ metadata: meta, consent: null }))).toBeNull();
  });
});
