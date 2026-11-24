import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// The monthly idea's price reads its account's row (P3); every other test here has no database.
const db = vi.hoisted(() => ({ state: null as import("./helpers/fake-db").FakeDb | null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => db.state?.db ?? null }));

import { planCheckout, type CheckoutContext, type CheckoutRequest } from "@/lib/commerce/plan";
import { checkoutErrorKey } from "@/components/pricing/offers";
import { activePersonalPrice, monthlyPriceToken, personalPriceToken, readPersonalPrice, spendPersonalPrice } from "@/lib/commerce/personal-price";
import { signToken } from "@/lib/lifecycle/links";
import { NextRequest } from "next/server";
import { PERSONAL_PRICE, PRODUCTS, heldIsCheaper } from "@/lib/pricing/products";
import { sessionMetadata, type SessionOptions } from "@/lib/stripe/line-items";
import { readSession } from "@/lib/stripe/fulfil";
import { FakeDb } from "./helpers/fake-db";

const ID = "5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d";
const guest: CheckoutContext = { signedIn: false, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true };
const holding: CheckoutContext = { ...guest, personalPrice: { id: ID } };
const req = (r: Partial<CheckoutRequest> & Pick<CheckoutRequest, "product">): CheckoutRequest => ({ templateSlugs: [], currency: "usd", ...r });

function ok(r: ReturnType<typeof planCheckout>) {
  if (!r.ok) throw new Error(`expected a plan, got ${r.error}`);
  return r;
}

describe("checkout plan: a personal price", () => {
  it("charges a premium template or 'make it special' the personal price, and records what it took off", () => {
    const single = ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], personalPrice: true }), holding));
    expect(single.total).toBe(499);
    expect(single.lines).toEqual([{ key: "single", amount: 499 }]);
    expect(single.personalPrice).toEqual({ id: ID, discount: 700, kind: "offer" });
    const extras = ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], personalPrice: true }), holding));
    expect(extras.total).toBe(499);
    expect(extras.personalPrice).toEqual({ id: ID, discount: 400, kind: "offer" });
    // In euros and pounds too, never above the usual price.
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], currency: "eur", personalPrice: true }), holding)).total).toBe(499);
    expect(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], currency: "gbp", personalPrice: true }), holding)).total).toBe(449);
  });

  it("charges the usual price when the page didn't ask for it, even with the cookie there", () => {
    const single = ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"] }), holding));
    expect(single.total).toBe(1199);
    expect(single.personalPrice).toBeNull();
  });

  it("refuses, rather than charge the full price, when the price has ended or been used", () => {
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], personalPrice: true }), guest)).toMatchObject({ ok: false, error: "personal_price_ended", status: 409 });
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], personalPrice: true }), { ...guest, personalPrice: null })).toMatchObject({ ok: false, error: "personal_price_ended" });
  });

  it("is for one gift: never every template, three, a pack, Ethos for Two, the bump or a second gift", () => {
    for (const product of ["everything", "pick3", "pass", "membership", "giftcard", "pack", "upgrade"] as const)
      expect(planCheckout(req({ product, personalPrice: true, plan: "yearly" }), holding)).toMatchObject({ ok: false, error: "personal_price_unavailable", status: 400 });
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addEverything: true, personalPrice: true }), holding)).toMatchObject({ ok: false, error: "personal_price_unavailable" });
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], secondSlug: "bloom", personalPrice: true }), holding)).toMatchObject({ ok: false, error: "personal_price_unavailable" });
  });

  it("gives every refusal the words that say the price has gone", () => {
    expect(checkoutErrorKey("personal_price_ended")).toBe("personalPriceEnded");
    expect(checkoutErrorKey("personal_price_unavailable")).toBe("personalPriceEnded");
  });
});

describe("the personal price's link", () => {
  const SECRET = "test-secret";
  beforeEach(() => vi.stubEnv("VIEWER_HASH_SECRET", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it("opens until its time, for the account it names", async () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    const endsAt = now + 48 * 3_600_000;
    const token = await personalPriceToken(ID, endsAt, SECRET);
    expect(await readPersonalPrice(token, now)).toEqual({ id: ID, endsAt, kind: "offer" });
    expect(await readPersonalPrice(token, endsAt)).toBeNull();
    expect(await readPersonalPrice(token, endsAt + 1)).toBeNull();
  });

  it("refuses a link that was edited, signed elsewhere or made for something else", async () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    const token = await personalPriceToken(ID, now + 3_600_000, SECRET);
    const [value, signature] = token.split(".");
    const later = value.replace(/:\d+$/, `:${Math.floor(now / 1000) + 30 * 86_400}`);
    expect(await readPersonalPrice(`${later}.${signature}`, now)).toBeNull();
    expect(await readPersonalPrice(await personalPriceToken(ID, now + 3_600_000, "another-secret"), now)).toBeNull();
    const publish = await signToken("publish-finish", value, SECRET);
    expect(await readPersonalPrice(publish, now)).toBeNull();
    for (const bad of [null, undefined, "", "x".repeat(300)]) expect(await readPersonalPrice(bad, now)).toBeNull();
  });

  it("is signed with PERSONAL_PRICE_SECRET when that is set, and only with it", async () => {
    vi.stubEnv("PERSONAL_PRICE_SECRET", "offer-secret");
    const now = Date.parse("2026-11-25T12:00:00Z");
    expect(await readPersonalPrice(await personalPriceToken(ID, now + 3_600_000, "offer-secret"), now)).toEqual({ id: ID, endsAt: now + 3_600_000, kind: "offer" });
    expect(await readPersonalPrice(await personalPriceToken(ID, now + 3_600_000, SECRET), now)).toBeNull();
  });

  it("buys one gift: once spent, it no longer holds", async () => {
    const now = Date.now();
    const other = "6a1d7f8e-4b66-4e3c-8b68-1f9b4a2c3d5e";
    const token = await personalPriceToken(other, now + 3_600_000, SECRET);
    expect(await activePersonalPrice(token, now)).toEqual({ id: other, endsAt: Math.floor((now + 3_600_000) / 1000) * 1000, kind: "offer" });
    await spendPersonalPrice(other);
    expect(await activePersonalPrice(token, now)).toBeNull();
  });
});

describe("when a personal price ends, in words", () => {
  it("is American on a page in dollars, British otherwise, Spanish in Spanish", async () => {
    const { personalPriceEnds } = await import("@/components/pricing/use-personal-price");
    const at = Date.parse("2026-11-27T16:00:00Z");
    const tz = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      expect(personalPriceEnds(at, "en", "usd")).toBe("Friday, November 27 at 4:00 PM");
      expect(personalPriceEnds(at, "en", "gbp")).toBe("Friday 27 November at 16:00");
      expect(personalPriceEnds(at, "en", "eur")).toBe("Friday 27 November at 16:00");
      expect(personalPriceEnds(at, "es", "usd")).toMatch(/^viernes, 27 de noviembre/);
    } finally {
      process.env.TZ = tz;
    }
  });
});

// --- The monthly idea's one-time price (PLAN-monthly 4.1, P1-P7) --------------------------------

describe("the monthly idea's one-time price", () => {
  const monthly: CheckoutContext = { ...guest, personalPrice: { id: ID, kind: "monthly" } };
  const SECRET = "test-secret";
  const OWNER = "7b2e8f9a-5c77-4f4d-9c79-2a0b5c3d4e6f";
  beforeEach(() => {
    vi.stubEnv("VIEWER_HASH_SECRET", SECRET);
    db.state = new FakeDb({ monthly_ideas: [{ user_id: OWNER, since: "2026-11-01", basis: "notice", wording: "x", price_sent_at: "2026-12-20T08:00:00Z", price_used_at: null, off_at: null }] });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    db.state = null;
  });

  it("P1 charges its own amount for each product, in every currency, and records what it took off", () => {
    const expected = { single: { usd: 799, eur: 699, gbp: 599 }, extras: { usd: 649, eur: 549, gbp: 449 } } as const;
    for (const currency of ["usd", "eur", "gbp"] as const) {
      const single = ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], currency, personalPrice: true }), monthly));
      expect(single.total).toBe(expected.single[currency]);
      expect(single.personalPrice).toEqual({ id: ID, discount: PRODUCTS.single.amounts[currency] - expected.single[currency], kind: "monthly" });
      const extras = ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], currency, personalPrice: true }), monthly));
      expect(extras.total).toBe(expected.extras[currency]);
      expect(extras.personalPrice).toEqual({ id: ID, discount: PRODUCTS.extras.amounts[currency] - expected.extras[currency], kind: "monthly" });
    }
    // Never with the bump, a second gift or two more gifts.
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addEverything: true, personalPrice: true }), monthly)).toMatchObject({ ok: false, error: "personal_price_unavailable" });
    expect(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], addPair: true, personalPrice: true }), monthly)).toMatchObject({ ok: false, error: "pair_not_available" });
  });

  it("P2 a link says which price it is", async () => {
    const now = Date.parse("2026-12-20T09:00:00Z");
    const endsAt = Date.parse("2026-12-28T00:00:00Z");
    expect(await readPersonalPrice(await monthlyPriceToken(OWNER, endsAt, SECRET), now)).toEqual({ id: OWNER, endsAt, kind: "monthly" });
    expect(await readPersonalPrice(await personalPriceToken(OWNER, endsAt, SECRET), now)).toEqual({ id: OWNER, endsAt, kind: "offer" });
    const [value, signature] = (await monthlyPriceToken(OWNER, endsAt, SECRET)).split(".");
    expect(await readPersonalPrice(`${value.replace(/:\d+$/, ":1900000000")}.${signature}`, now)).toBeNull();
  });

  it("P3 once used, it is gone for good, and it holds only while the account's row says it was sent", async () => {
    const now = Date.parse("2026-12-20T09:00:00Z");
    const token = await monthlyPriceToken(OWNER, Date.parse("2026-12-28T00:00:00Z"), SECRET);
    const offerToken = await personalPriceToken(OWNER, Date.parse("2026-12-28T00:00:00Z"), SECRET);
    expect(await activePersonalPrice(token, now)).toMatchObject({ kind: "monthly" });
    const rows = db.state!.rows("monthly_ideas");
    rows[0].price_sent_at = null;
    expect(await activePersonalPrice(token, now)).toBeNull();
    rows[0].price_sent_at = "2026-12-20T08:00:00Z";
    db.state!.failNext("monthly_ideas", "select", "down");
    expect(await activePersonalPrice(token, now)).toBeNull();
    const saved = db.state;
    db.state = null;
    expect(await activePersonalPrice(token, now)).toBeNull();
    db.state = saved;
    await spendPersonalPrice(OWNER, "monthly");
    expect(rows[0].price_used_at).toEqual(expect.any(String));
    expect(await activePersonalPrice(token, now)).toBeNull();
    // One key for both kinds: an offer email's link for the same account is spent too.
    expect(await activePersonalPrice(offerToken, now)).toBeNull();
    // No row at all: no price.
    db.state = new FakeDb({ monthly_ideas: [] });
    const stranger = "8c3f9a0b-6d88-4a5e-8d8a-3b1c6d4e5f70";
    expect(await activePersonalPrice(await monthlyPriceToken(stranger, Date.parse("2026-12-28T00:00:00Z"), SECRET), now)).toBeNull();
  });

  it("P4 a cheaper price already held is kept", async () => {
    expect(heldIsCheaper("offer", "monthly")).toBe(true);
    expect(heldIsCheaper("monthly", "offer")).toBe(false);
    const open = await import("@/app/api/offer/open/route");
    const { NextRequest } = await import("next/server");
    const owner2 = "9d4a0b1c-7e99-4b6f-9e9b-4c2d7e5f6081";
    db.state!.rows("monthly_ideas").push({ user_id: owner2, since: "2026-11-01", basis: "notice", wording: "x", price_sent_at: "2026-12-20T08:00:00Z", price_used_at: null, off_at: null });
    const later = Date.now() + 5 * 86_400_000;
    const offerCookie = await personalPriceToken(owner2, later, SECRET);
    const monthlyLink = await monthlyPriceToken(owner2, later, SECRET);
    const call = (t: string, cookie?: string) =>
      open.GET(new NextRequest(`https://ethos.test/api/offer/open?t=${encodeURIComponent(t)}&r=email-monthly`, { headers: cookie ? { cookie: `ethos_offer=${encodeURIComponent(cookie)}` } : {} }));
    // An offer email's price (lower) is held: the monthly link changes nothing.
    expect((await call(monthlyLink, offerCookie)).cookies.get("ethos_offer")).toBeUndefined();
    // The other way round, the offer email's lower price replaces the monthly one.
    expect((await call(offerCookie, monthlyLink)).cookies.get("ethos_offer")?.value).toBe(offerCookie);
    // With nothing held, the monthly link sets its own.
    expect((await call(monthlyLink)).cookies.get("ethos_offer")?.value).toBe(monthlyLink);
  });

  it("P5 the monthly price is neither shown nor spent when the usual price is already lower; an offer email's works as before", () => {
    const photosHolder = { ownedForever: ["photos:the-letter"] };
    const extras = ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], personalPrice: true }), { ...monthly, ...photosHolder }));
    expect(extras.total).toBe(400);
    expect(extras.personalPrice).toBeNull();
    // An offer email's price, as on growth/merge: charged at most the listed price, and spent with it.
    const offer = ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], personalPrice: true }), { ...holding, ...photosHolder }));
    expect(offer.total).toBe(400);
    expect(offer.personalPrice).toEqual({ id: ID, discount: 0, kind: "offer" });
  });

  it("P5b /api/offer answers an offer email's price in the shape it always had, and only the monthly one with its kind", async () => {
    vi.stubEnv("PERSONAL_PRICE_SECRET", SECRET);
    const route = await import("@/app/api/offer/route");
    const now = Date.now();
    const offerToken = await personalPriceToken(ID, now + 3_600_000, SECRET);
    const res = await route.GET(new NextRequest("https://ethos.test/api/offer", { headers: { cookie: `ethos_offer=${encodeURIComponent(offerToken)}` } }));
    const body = await res.json();
    expect(body).toEqual({ active: true, endsAt: Math.floor((now + 3_600_000) / 1000) * 1000, amounts: PERSONAL_PRICE.amounts, onto: PERSONAL_PRICE.onto });
    vi.unstubAllEnvs();
  });

  it("P6 checkout tells fulfilment which kind it was, and an offer email's session is as before", () => {
    const options: SessionOptions = { purchaseId: "p1", userId: null, email: null, locale: "en", origin: "https://ethos.test", returnTo: "/", automaticTax: false, productIds: {} };
    const withMonthly = sessionMetadata(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], personalPrice: true }), monthly)), options);
    expect(withMonthly.personal_price_kind).toBe("monthly");
    const withOffer = sessionMetadata(ok(planCheckout(req({ product: "single", templateSlugs: ["vinyl"], personalPrice: true }), holding)), options);
    expect("personal_price_kind" in withOffer).toBe(false);
    const session = (metadata: Record<string, string>) => ({ id: "cs_1", metadata, payment_status: "paid", status: "complete" }) as unknown as Parameters<typeof readSession>[0];
    expect(readSession(session(withMonthly))).toMatchObject({ personalPrice: ID, personalPriceKind: "monthly" });
    expect(readSession(session(withOffer))).toMatchObject({ personalPrice: ID, personalPriceKind: "offer" });
  });

  it("P7 the email's button opens that gift's editor", async () => {
    const open = await import("@/app/api/offer/open/route");
    const { NextRequest } = await import("next/server");
    const link = await monthlyPriceToken(OWNER, Date.now() + 86_400_000, SECRET);
    const go = async (query: string) => (await open.GET(new NextRequest(`https://ethos.test/api/offer/open?t=${encodeURIComponent(link)}&r=email-monthly${query}`))).headers.get("location");
    expect(await go("&to=snow-globe")).toBe("https://ethos.test/create/snow-globe?ref=email-monthly");
    expect(await go("&to=nope")).toBe("https://ethos.test/templates?ref=email-monthly");
    expect(await go("&to=snow-globe&l=es")).toBe("https://ethos.test/es/create/snow-globe?ref=email-monthly");
  });
});
