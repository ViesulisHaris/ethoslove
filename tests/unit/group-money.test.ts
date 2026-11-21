/**
 * Every place that decides what the "group" product costs, grants or takes back, in one file: the
 * catalogue, checkout's plan, what goes to Stripe, what fulfilment grants, what a refund revokes and
 * relocks, and the publish rule that asks for it. docs/GROUP.md and
 * reports/group-money-paths.md list the same files with what each does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { planCheckout, type CheckoutContext, type CheckoutRequest } from "@/lib/commerce/plan";
import { foreverRowsOfPurchase, grantForever } from "@/lib/commerce/unlocks";
import { revokePurchase } from "@/lib/commerce/revoke";
import { groupsFromRows, templatesFromRows } from "@/lib/commerce/entitlements";
import { UPGRADE_CREDITED, creditedPurchases } from "@/lib/commerce/pricing";
import { decidePublish } from "@/lib/gift/publish";
import type { GiftData } from "@/lib/gift/schema";
import { EVERY_GROUP, PRODUCTS, groupAmount, groupRows, groupUnlock, hasGroupUnlock, hasUnlock, unlocksFor } from "@/lib/pricing/products";
import { consentSentence, groupAddonLineDescription, lineItems, sellsInOneTap, sessionMetadata, sessionParams, type SessionOptions } from "@/lib/stripe/line-items";
import { manifest as reference } from "@/templates/_group-reference/manifest";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
const mail = vi.hoisted(() => ({
  notifyReceipt: vi.fn<(...args: unknown[]) => Promise<undefined>>(async () => undefined),
  notifyWelcome: vi.fn(async () => undefined),
  sendPassWelcome: vi.fn(async () => true),
  sendGiftCardEmail: vi.fn(async () => true),
  sendCheckoutRecovery: vi.fn(async () => true),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => null }));
vi.mock("@/lib/email/notify", () => mail);
vi.mock("@/templates/manifests", async (original) => {
  const real = await original<typeof import("@/templates/manifests")>();
  // As it will be once a gallery template takes contributions: here the reference template stands in for it.
  return { ...real, isTemplateSlug: (slug: string) => slug === "group-reference" || real.isTemplateSlug(slug), getManifest: (slug: string) => (slug === "group-reference" ? reference : real.getManifest(slug)) };
});

const { fulfilCheckoutSession, foreverRowsFor, readSession } = await import("@/lib/stripe/fulfil");
const { recoveryTarget } = await import("@/lib/stripe/recovery");

const NOW = Date.parse("2026-12-01T12:00:00.000Z");
const SLUG = "group-reference";
const PURCHASE = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const GIFT_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

const buyer = (over: Partial<CheckoutContext> = {}): CheckoutContext => ({ signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: false, groupOnSale: true, ...over });
const ask = (over: Partial<CheckoutRequest> = {}, ctx: CheckoutContext = buyer()) => planCheckout({ product: "group", templateSlugs: [SLUG], currency: "eur", ...over }, ctx);
function planned(over: Partial<CheckoutRequest> = {}, ctx: CheckoutContext = buyer()) {
  const plan = ask(over, ctx);
  if (!plan.ok) throw new Error(plan.error);
  return plan;
}
const options: SessionOptions = { purchaseId: PURCHASE, userId: USER, email: "tom@example.test", locale: "en", origin: "https://ethos.test", returnTo: `/create/${SLUG}?resume=publish`, automaticTax: false, productIds: {} };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("the catalogue", () => {
  it("prices a group card at $23.99, €19.99 and £17.99, the template included", () => {
    expect(PRODUCTS.group.amounts).toEqual({ usd: 2399, eur: 1999, gbp: 1799 });
    expect(PRODUCTS.group).toMatchObject({ id: "group", picks: 1, envProductKey: "STRIPE_PRODUCT_GROUP", name: { en: "Ethos: a group card", es: "Ethos: una tarjeta en grupo" } });
  });

  it("someone who already holds the template pays the difference", () => {
    for (const [currency, full, stepUp] of [
      ["usd", 2399, 1200],
      ["eur", 1999, 1000],
      ["gbp", 1799, 900],
    ] as const) {
      expect(groupAmount(currency, [], SLUG)).toBe(full);
      expect(groupAmount(currency, ["vinyl"], SLUG)).toBe(full);
      expect(groupAmount(currency, [SLUG], SLUG)).toBe(stepUp);
      expect(groupAmount(currency, ["*"], SLUG)).toBe(stepUp);
      expect(stepUp).toBe(full - PRODUCTS.single.amounts[currency]);
      expect(stepUp).toBeGreaterThan(0);
    }
  });

  it("is its own unlock row, which Everything's row does not cover and which covers no template", () => {
    expect(groupUnlock(SLUG)).toBe("group:group-reference");
    expect(unlocksFor("group", [SLUG])).toEqual(["group:group-reference"]);
    expect(hasGroupUnlock(["group:group-reference"], SLUG)).toBe(true);
    expect(hasGroupUnlock([EVERY_GROUP], SLUG)).toBe(true);
    expect(hasGroupUnlock(["*"], SLUG)).toBe(false);
    expect(hasGroupUnlock([SLUG], SLUG)).toBe(false);
    expect(hasGroupUnlock(["group:vinyl"], SLUG)).toBe(false);
    // And the other way: a group row is not the template, nor any template.
    expect(hasUnlock(["group:group-reference"], SLUG)).toBe(false);
    expect(hasUnlock([EVERY_GROUP], SLUG)).toBe(false);
    expect(() => unlocksFor("group", [])).toThrow();
    expect(() => unlocksFor("group", [SLUG, "vinyl"])).toThrow();
  });

  it("grants the template with it at full price, and only the group row as the step up", () => {
    expect(groupRows(SLUG, "group")).toEqual(["group:group-reference", SLUG]);
    expect(groupRows(SLUG, "group_addon")).toEqual(["group:group-reference"]);
  });

  it("is not credited towards the Everything upgrade, and never reads as a template the account owns", () => {
    expect(UPGRADE_CREDITED as readonly string[]).not.toContain("group");
    expect(creditedPurchases([{ product: "group", amount: 1999, currency: "eur", status: "paid" }])).toEqual([]);
    expect(templatesFromRows(["*", "vinyl", "group:group-reference", "pack:*"])).toEqual(["*", "vinyl"]);
    expect(groupsFromRows(["*", "vinyl", "group:group-reference", "group:*"])).toEqual([SLUG, "*"]);
  });
});

describe("checkout's plan", () => {
  it("refuses the product while group cards are switched off, whoever asks", () => {
    expect(ask({}, buyer({ groupOnSale: false }))).toMatchObject({ ok: false, error: "not_on_sale", status: 400 });
    expect(ask({}, { signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true })).toMatchObject({ ok: false, error: "not_on_sale" });
  });

  it("is sold only to a signed-in account, on a template made for group cards, one at a time", () => {
    expect(ask({}, buyer({ signedIn: false }))).toMatchObject({ ok: false, error: "sign_in_required", status: 401 });
    expect(ask({ templateSlugs: ["vinyl"] })).toMatchObject({ ok: false, error: "not_group_template", status: 400 });
    expect(ask({ templateSlugs: [] })).toMatchObject({ ok: false, error: "wrong_template_count" });
    expect(ask({ templateSlugs: [SLUG, "vinyl"] })).toMatchObject({ ok: false, error: "wrong_template_count" });
    expect(ask({ templateSlugs: ["not-a-template"] })).toMatchObject({ ok: false, error: "wrong_template_count" });
  });

  it("at full price: the catalogue amount, and both rows", () => {
    for (const [currency, total] of [["usd", 2399], ["eur", 1999], ["gbp", 1799]] as const) {
      const plan = planned({ currency });
      expect(plan).toMatchObject({ product: "group", kind: "group", total, lines: [{ key: "group", amount: total }], unlocks: ["group:group-reference", SLUG], templateSlugs: [SLUG], bump: false, second: null, billing: "one_time", personalPrice: null });
    }
  });

  it("as the step up for whoever holds the template: the difference, and the group row alone", () => {
    for (const held of [[SLUG], ["*"]]) {
      const plan = planned({}, buyer({ ownedForever: held }));
      expect(plan).toMatchObject({ kind: "group_addon", total: 1000, lines: [{ key: "group", amount: 1000 }], unlocks: ["group:group-reference"] });
    }
    expect(planned({ currency: "usd" }, buyer({ ownedForever: ["*"] })).total).toBe(1200);
    expect(planned({ currency: "gbp" }, buyer({ ownedForever: [SLUG] })).total).toBe(900);
  });

  it("a running membership counts as holding the template, and is never granted it for good", () => {
    const plan = planned({}, buyer({ ownedForever: [], heldNow: ["*", "pack:*"] }));
    expect(plan).toMatchObject({ kind: "group_addon", total: 1000, unlocks: ["group:group-reference"] });
  });

  it("Everything does not include it: its holder can still buy it, and is not told they own it", () => {
    expect(ask({}, buyer({ ownedForever: ["*"] })).ok).toBe(true);
  });

  it("is refused once the account holds it", () => {
    expect(ask({}, buyer({ ownedForever: ["group:group-reference", SLUG] }))).toMatchObject({ ok: false, error: "already_owned", status: 409 });
    expect(ask({}, buyer({ ownedForever: [EVERY_GROUP, "*"] }))).toMatchObject({ ok: false, error: "already_owned" });
    // Lent by a membership is not owned: it can be bought to keep.
    expect(ask({}, buyer({ ownedForever: [], heldNow: ["group:group-reference"] })).ok).toBe(true);
  });

  it("takes no order bump, no second gift and no personal price", () => {
    expect(ask({ addEverything: true })).toMatchObject({ ok: false, error: "bump_not_available" });
    expect(ask({ secondSlug: "vinyl" })).toMatchObject({ ok: false, error: "second_not_available" });
    expect(ask({ personalPrice: true }, buyer({ personalPrice: { id: USER } }))).toMatchObject({ ok: false, error: "personal_price_unavailable" });
  });

  it("leaves every other product's plan as it was", () => {
    const before = { signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true } satisfies CheckoutContext;
    expect(planCheckout({ product: "single", templateSlugs: ["vinyl"], currency: "eur" }, before)).toMatchObject({ ok: true, kind: "single", total: 999, unlocks: ["vinyl"] });
    expect(planCheckout({ product: "single", templateSlugs: ["vinyl"], currency: "eur" }, { ...before, groupOnSale: true, heldNow: ["*"] })).toMatchObject({ ok: true, kind: "single", total: 999, unlocks: ["vinyl"] });
    expect(planCheckout({ product: "everything", templateSlugs: [], currency: "eur" }, { ...before, ownedForever: ["group:group-reference"] })).toMatchObject({ ok: true, total: 2499, unlocks: ["*"] });
  });
});

describe("what goes to Stripe", () => {
  it("one line at exactly the planned amount, named for what it is", () => {
    expect(lineItems(planned(), options)).toEqual([
      { quantity: 1, price_data: { currency: "eur", unit_amount: 1999, tax_behavior: "inclusive", product_data: { name: "Ethos: a group card", tax_code: "txcd_10000000", description: "Group card (reference)" } } },
    ]);
  });

  it("the step up says why it costs less: the template they have is taken off, not a discount", () => {
    const plan = planned({}, buyer({ ownedForever: [SLUG] }));
    const [line] = lineItems(plan, options);
    expect(line.price_data?.unit_amount).toBe(1000);
    expect(line.price_data?.product_data?.description).toBe("Group card (reference). A group card is €19.99; the template, which you already have, is taken off.");
    // (Intl puts a no-break space before the currency in Spanish.)
    expect(groupAddonLineDescription("usd", "es", "La tostada").replace(/\s/g, " ")).toBe("La tostada. Una tarjeta en grupo cuesta 23,99 US$; la plantilla, que ya tienes, se descuenta.");
    expect(lineItems(plan, { ...options, locale: "es" })[0].price_data?.product_data?.name).toBe("Ethos: una tarjeta en grupo");
  });

  it("filed under its own Stripe Product when one is set", () => {
    const [line] = lineItems(planned(), { ...options, productIds: { STRIPE_PRODUCT_GROUP: "prod_group" } });
    expect(line.price_data).toMatchObject({ product: "prod_group", unit_amount: 1999 });
  });

  it("the metadata names the template and the kind, and never a gift", () => {
    const meta = sessionMetadata(planned(), options);
    expect(meta).toMatchObject({ app: "ethos", product: "group", kind: "group", template_slugs: SLUG, purchase_id: PURCHASE, user_id: USER, guest: "0" });
    expect(sessionMetadata(planned({}, buyer({ ownedForever: ["*"] })), options).kind).toBe("group_addon");
    expect(Object.keys(meta).some((key) => /gift|group_id|token/i.test(key))).toBe(false);
    // The only ids in it are the purchase's and the buyer's.
    const ids = Object.values(meta).filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(value));
    expect(ids.sort()).toEqual([PURCHASE, USER].sort());
    expect(JSON.stringify(sessionParams(planned(), options))).not.toContain(GIFT_ID);
  });

  it("takes no promotion codes, like every Ethos session, and asks for the plain unlock tickbox", () => {
    const params = sessionParams(planned(), options);
    expect(params.mode).toBe("payment");
    expect(params.allow_promotion_codes).toBe(false);
    expect(JSON.stringify(params.custom_text?.terms_of_service_acceptance)).toContain(consentSentence("group", "en"));
    expect(consentSentence("group", "en")).toBe(consentSentence("single", "en"));
    expect(sellsInOneTap("group")).toBe(false);
  });
});

describe("what fulfilment grants", () => {
  const session = (meta: Record<string, string>, amount: number): Stripe.Checkout.Session =>
    ({ id: "cs_test_group", payment_status: "paid", amount_total: amount, currency: "eur", currency_conversion: null, payment_intent: "pi_g", customer_details: { email: "tom@example.test" }, customer_email: null, metadata: meta, client_reference_id: meta.purchase_id, created: NOW / 1000, consent: { terms_of_service: "accepted" } }) as unknown as Stripe.Checkout.Session;
  const rowsOf = (fake: FakeDb) =>
    fake
      .rows("template_unlocks")
      .map((row) => `${row.template_slug}@${row.purchase_id}`)
      .sort();
  // The purchase row as the checkout route writes it for a signed-in buyer: the plan's kind and template.
  function seed(amount: number, unlocks: Record<string, unknown>[] = [], kind = "group") {
    const fake = new FakeDb({ purchases: [{ id: PURCHASE, user_id: USER, product: "group", kind, template_slugs: [SLUG], status: "pending", amount, currency: "eur" }], profiles: [{ id: USER, email: "tom@example.test", locale: "en" }], template_unlocks: unlocks }, NOW);
    state.db = fake.db;
    return fake;
  }

  it("at full price: group cards on the template, and the template", async () => {
    const fake = seed(1999);
    const meta = sessionMetadata(planned(), options);
    expect(await fulfilCheckoutSession(session(meta, 1999))).toEqual({ ok: true, userId: USER });
    expect(rowsOf(fake)).toEqual([`group:group-reference@${PURCHASE}`, `${SLUG}@${PURCHASE}`].sort());
    expect(fake.rows("purchases")[0]).toMatchObject({ status: "paid", kind: "group", template_slugs: [SLUG] });
    // The receipt names both.
    expect(mail.notifyReceipt).toHaveBeenCalledTimes(1);
    const [, label, amount, names] = mail.notifyReceipt.mock.calls[0] as [string, string, string, string[]];
    expect([label, amount]).toEqual(["A group card", "€19.99"]);
    expect([...names].sort()).toEqual(["Group card (reference)", "Group cards on Group card (reference)"]);
  });

  it("as the step up: the group row only; the template stays with whatever granted it", async () => {
    const fake = seed(1000, [{ id: "u-single", user_id: USER, template_slug: SLUG, purchase_id: "earlier-single" }], "group_addon");
    const meta = sessionMetadata(planned({}, buyer({ ownedForever: [SLUG] })), options);
    expect(meta.kind).toBe("group_addon");
    expect(await fulfilCheckoutSession(session(meta, 1000))).toEqual({ ok: true, userId: USER });
    expect(rowsOf(fake)).toEqual([`group:group-reference@${PURCHASE}`, `${SLUG}@earlier-single`].sort());
    expect(fake.rows("purchases")[0]).toMatchObject({ status: "paid", kind: "group_addon" });
  });

  it("twice (the webhook and the success page) grants once", async () => {
    const fake = seed(1999);
    const meta = sessionMetadata(planned(), options);
    await fulfilCheckoutSession(session(meta, 1999));
    await fulfilCheckoutSession(session(meta, 1999));
    expect(rowsOf(fake)).toHaveLength(2);
    expect(mail.notifyReceipt).toHaveBeenCalledTimes(1);
  });

  it("reads the rows from the signed metadata alone, and refuses metadata that doesn't add up", () => {
    const sold = readSession(session(sessionMetadata(planned(), options), 1999))!;
    expect(foreverRowsFor(sold)).toEqual(["group:group-reference", SLUG]);
    expect(foreverRowsFor({ ...sold, kind: "group_addon" })).toEqual(["group:group-reference"]);
    expect(foreverRowsFor({ ...sold, slugs: [] })).toBeNull();
    expect(foreverRowsFor({ ...sold, slugs: [SLUG, "vinyl"] })).toBeNull();
  });

  it("an expired checkout's recovery link goes back to the same template", () => {
    const meta = sessionMetadata(planned(), options);
    const expired = { ...session(meta, 1999), consent: { promotions: "opt_in" }, after_expiration: { recovery: { url: "https://checkout.stripe.test/recover" } } } as unknown as Stripe.Checkout.Session;
    expect(recoveryTarget(expired)).toMatchObject({ to: "tom@example.test", templateSlug: SLUG });
  });
});

describe("what a refund or a chargeback takes back", () => {
  const purchase = (id: string, product: string, kind: string, slugs: string[]) => ({ id, user_id: USER, product, kind, template_slugs: slugs, status: "paid", amount: 999, currency: "eur" });
  const gift = (id: string, template_slug: string, contributions?: unknown[]) => ({
    id,
    user_id: USER,
    template_slug,
    status: "live",
    watermark: false,
    password_hash: null,
    unlock_at: null,
    data: { recipientName: "Nora", senderName: "Tom", message: "hi", photos: [], watermark: false, ...(contributions ? { contributions } : {}) },
  });
  const notes = [{ key: "abcdefghij", name: "Mum", note: "Ring me." }];
  const held = (fake: FakeDb) =>
    fake
      .rows("template_unlocks")
      .map((row) => row.template_slug)
      .sort();
  const status = (fake: FakeDb, id: string) => fake.rows("gifts").find((g) => g.id === id)!.status;

  it("says exactly which rows each kind of group purchase paid for", () => {
    expect(foreverRowsOfPurchase({ product: "group", template_slugs: [SLUG], kind: "group" })).toEqual(["group:group-reference", SLUG]);
    expect(foreverRowsOfPurchase({ product: "group", template_slugs: [SLUG], kind: "group_addon" })).toEqual(["group:group-reference"]);
    expect(foreverRowsOfPurchase({ product: "group", template_slugs: null, kind: "group" })).toEqual([]);
  });

  it("a full-price group card refunded: both rows go, and the card that went out with it is a draft again", async () => {
    const fake = new FakeDb({ purchases: [purchase("g1", "group", "group", [SLUG])], gifts: [gift("card", SLUG, notes)] }, NOW);
    await grantForever(fake.db, USER, groupRows(SLUG, "group"), "g1");
    await revokePurchase(fake.db, { id: "g1", user_id: USER, product: "group" }, NOW);
    expect(held(fake)).toEqual([]);
    expect(status(fake, "card")).toBe("draft");
    expect(fake.rows("purchases")[0].status).toBe("refunded");
  });

  it("the step up refunded: the group row goes, the template stays, the group card relocks and an ordinary gift on the same template does not", async () => {
    const fake = new FakeDb({ purchases: [purchase("s1", "single", "single", [SLUG]), purchase("g1", "group", "group_addon", [SLUG])], gifts: [gift("card", SLUG, notes), gift("plain", SLUG)] }, NOW);
    await grantForever(fake.db, USER, [SLUG], "s1");
    await grantForever(fake.db, USER, groupRows(SLUG, "group_addon"), "g1");
    await revokePurchase(fake.db, { id: "g1", user_id: USER, product: "group" }, NOW);
    expect(held(fake)).toEqual([SLUG]);
    expect(status(fake, "card")).toBe("draft");
    expect(status(fake, "plain")).toBe("live");
  });

  it("a refunded single is not handed back by the step-up purchase that came after it", async () => {
    const fake = new FakeDb({ purchases: [purchase("s1", "single", "single", [SLUG]), purchase("g1", "group", "group_addon", [SLUG])], gifts: [gift("card", SLUG, notes), gift("plain", SLUG)] }, NOW);
    await grantForever(fake.db, USER, [SLUG], "s1");
    await grantForever(fake.db, USER, groupRows(SLUG, "group_addon"), "g1");
    await revokePurchase(fake.db, { id: "s1", user_id: USER, product: "single" }, NOW);
    // The group row is still paid for; the template is not, so nothing on it stays live.
    expect(held(fake)).toEqual(["group:group-reference"]);
    expect(status(fake, "card")).toBe("draft");
    expect(status(fake, "plain")).toBe("draft");
  });

  it("a full-price group card keeps the template through the refund of an earlier single for it", async () => {
    const fake = new FakeDb({ purchases: [purchase("s1", "single", "single", [SLUG]), purchase("g1", "group", "group", [SLUG])], gifts: [gift("card", SLUG, notes)] }, NOW);
    await grantForever(fake.db, USER, [SLUG], "s1");
    await grantForever(fake.db, USER, groupRows(SLUG, "group"), "g1");
    await revokePurchase(fake.db, { id: "s1", user_id: USER, product: "single" }, NOW);
    expect(held(fake)).toEqual(["group:group-reference", SLUG].sort());
    expect(status(fake, "card")).toBe("live");
  });

  it("Everything behind a group card is not enough: with the group row gone it relocks", async () => {
    const fake = new FakeDb({ purchases: [purchase("e1", "everything", "everything", []), purchase("g1", "group", "group_addon", [SLUG])], gifts: [gift("card", SLUG, notes), gift("plain", "vinyl")] }, NOW);
    await grantForever(fake.db, USER, ["*"], "e1");
    await grantForever(fake.db, USER, groupRows(SLUG, "group_addon"), "g1");
    await revokePurchase(fake.db, { id: "g1", user_id: USER, product: "group" }, NOW);
    expect(held(fake)).toEqual(["*"]);
    expect(status(fake, "card")).toBe("draft");
    expect(status(fake, "plain")).toBe("live");
  });

  it("run twice (a refund, then a dispute) changes nothing more", async () => {
    const fake = new FakeDb({ purchases: [purchase("g1", "group", "group", [SLUG])], gifts: [gift("card", SLUG, notes)] }, NOW);
    await grantForever(fake.db, USER, groupRows(SLUG, "group"), "g1");
    await revokePurchase(fake.db, { id: "g1", user_id: USER, product: "group" }, NOW);
    const after = structuredClone(fake.tables);
    await revokePurchase(fake.db, { id: "g1", user_id: USER, product: "group" }, NOW, { mode: "dispute" });
    expect(fake.tables).toEqual(after);
  });

  it("gifts without contributions are relocked by the rules they always were", async () => {
    // Someone who never touched group cards: a single refunded takes its gift to draft, a free gift keeps going.
    const fake = new FakeDb({ purchases: [purchase("s1", "single", "single", ["vinyl"])], gifts: [gift("paid", "vinyl"), { ...gift("free", "the-letter"), watermark: true, data: { recipientName: "a", senderName: "b", message: "hi", photos: [], watermark: true } }] }, NOW);
    await grantForever(fake.db, USER, ["vinyl"], "s1");
    await revokePurchase(fake.db, { id: "s1", user_id: USER, product: "single" }, NOW);
    expect(status(fake, "paid")).toBe("draft");
    expect(status(fake, "free")).toBe("live");
  });
});

describe("the publish rule", () => {
  const base: GiftData = { version: 1, templateSlug: SLUG, locale: "en", title: "", recipientName: "Nora", senderName: "Tom", message: "Hi", messageStyle: "fade", photos: [], accentColor: "#B4552D", fontPairing: "editorial", showReactionCta: true, watermark: true, fields: {} };
  const card: GiftData = { ...base, contributions: [{ key: "abcdefghij", name: "Mum", note: "Ring me." }] };
  const none = { removeWatermark: false, schedule: false, password: false };

  it("a gift carrying notes needs the group unlock, and says so", () => {
    expect(decidePublish(reference, card, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required", needs: "group" });
    expect(decidePublish(reference, card, { unlocked: true }, none)).toEqual({ ok: false, reason: "payment_required", needs: "group" });
    expect(decidePublish(reference, card, { unlocked: true, group: false }, none)).toEqual({ ok: false, reason: "payment_required", needs: "group" });
  });

  it("with it, and the template, the card goes out without the footer", () => {
    expect(decidePublish(reference, card, { unlocked: true, group: true }, none)).toEqual({ ok: true, watermark: false, isPremium: true });
  });

  it("the group unlock is not the template: without the template it is the ordinary price that is asked", () => {
    expect(decidePublish(reference, card, { unlocked: false, group: true }, none)).toEqual({ ok: false, reason: "payment_required" });
  });

  it("no free reply and no campaign stands in for it", () => {
    expect(decidePublish(reference, card, { unlocked: false }, { ...none, freeReply: true })).toEqual({ ok: false, reason: "payment_required", needs: "group" });
    expect(decidePublish(reference, card, { unlocked: false }, { ...none, campaign: true })).toEqual({ ok: false, reason: "payment_required", needs: "group" });
  });

  it("the same template without notes is an ordinary premium gift: collecting notes is free until one is sent", () => {
    expect(decidePublish(reference, base, { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: true });
    expect(decidePublish(reference, { ...base, contributions: [] }, { unlocked: true }, none)).toEqual({ ok: true, watermark: false, isPremium: true });
    expect(decidePublish(reference, base, { unlocked: false }, none)).toEqual({ ok: false, reason: "payment_required" });
  });

  it("what isn't ready is said before anything about money", () => {
    expect(decidePublish(reference, { ...card, message: "" }, { unlocked: false }, none)).toEqual({ ok: false, reason: "not_ready", problems: ["message"] });
  });
});

describe("paid for and not sent", () => {
  it("a group card's buyer is reminded like any other buyer of one gift, by the template they bought it on", async () => {
    const { supabasePublishReminderStore } = await import("@/lib/commerce/publish-reminders");
    const paid = (id: string, product: string, kind: string | null) => ({ id, user_id: USER, product, kind, status: "paid", template_slugs: [SLUG], created_at: new Date(NOW - 20 * 60_000).toISOString(), stripe_payment_intent_id: `pi_${id}`, store: null });
    const fake = new FakeDb({ purchases: [paid("p-group", "group", "group"), paid("p-step", "group", "group_addon"), { ...paid("p-pack", "pack", null), template_slugs: [] }] }, NOW);
    const candidates = await supabasePublishReminderStore(fake.db, null).candidates(NOW - 3_600_000, NOW, 50);
    expect(candidates.map((c) => [c.id, c.slug])).toEqual([
      ["p-group", SLUG],
      ["p-step", SLUG],
    ]);
  });
});
