import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { planCheckout, type CheckoutContext, type CheckoutRequest } from "@/lib/commerce/plan";
import { checkoutErrorKey } from "@/components/pricing/offers";
import { activePersonalPrice, personalPriceToken, readPersonalPrice, spendPersonalPrice } from "@/lib/commerce/personal-price";
import { signToken } from "@/lib/lifecycle/links";

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
    expect(single.personalPrice).toEqual({ id: ID, discount: 700 });
    const extras = ok(planCheckout(req({ product: "extras", templateSlugs: ["the-letter"], personalPrice: true }), holding));
    expect(extras.total).toBe(499);
    expect(extras.personalPrice).toEqual({ id: ID, discount: 400 });
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
    expect(await readPersonalPrice(token, now)).toEqual({ id: ID, endsAt });
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
    expect(await readPersonalPrice(await personalPriceToken(ID, now + 3_600_000, "offer-secret"), now)).toEqual({ id: ID, endsAt: now + 3_600_000 });
    expect(await readPersonalPrice(await personalPriceToken(ID, now + 3_600_000, SECRET), now)).toBeNull();
  });

  it("buys one gift: once spent, it no longer holds", async () => {
    const now = Date.now();
    const other = "6a1d7f8e-4b66-4e3c-8b68-1f9b4a2c3d5e";
    const token = await personalPriceToken(other, now + 3_600_000, SECRET);
    expect(await activePersonalPrice(token, now)).toEqual({ id: other, endsAt: Math.floor((now + 3_600_000) / 1000) * 1000 });
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
