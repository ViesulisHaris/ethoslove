import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PRODUCTS, pairOnSale, pairOnSaleFor, pairPreviewEmails, pairSale } from "@/lib/pricing/products";
import { readEntitlements } from "@/lib/commerce/entitlements";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown, user: null as { id: string; email?: string } | null }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db, bearerToken: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/email/notify", () => ({}));
vi.mock("@/lib/env", () => ({ env: {}, isConfigured: {} }));

const entitlements = await import("@/app/api/entitlements/route");
const checkout = await import("@/app/api/stripe/checkout/route");

/**
 * Two more gifts for the listed accounts only (GIFT_PAIR_ENABLED=preview, GIFT_PAIR_PREVIEW_EMAILS):
 * the switch's three values, and who is listed. "true" and unset behave as they always did.
 */

const PREVIEW = { GIFT_PAIR_ENABLED: "preview", GIFT_PAIR_PREVIEW_EMAILS: "owner@x.co,second@x.co" };

describe("the switch", () => {
  it("the switch's three values", () => {
    expect(pairSale({ GIFT_PAIR_ENABLED: "true" })).toBe("on");
    expect(pairSale({ GIFT_PAIR_ENABLED: "preview" })).toBe("preview");
    for (const value of [undefined, "", "1", "false", "Preview", " preview", "TRUE"]) expect(pairSale(value === undefined ? {} : { GIFT_PAIR_ENABLED: value }), String(value)).toBe("off");
  });

  it("on and off don't look at the address or the list", () => {
    const on = { GIFT_PAIR_ENABLED: "true", GIFT_PAIR_PREVIEW_EMAILS: "someone@else.co" };
    for (const email of [null, undefined, "", "a@x.co"]) expect(pairOnSaleFor(email, on), String(email)).toBe(true);
    expect(pairOnSaleFor("a@x.co", { GIFT_PAIR_PREVIEW_EMAILS: "a@x.co" })).toBe(false);
    expect(pairOnSaleFor("a@x.co", {})).toBe(false);
  });

  it("in preview, a listed account and an unlisted one", () => {
    expect(pairOnSaleFor("owner@x.co", PREVIEW)).toBe(true);
    expect(pairOnSaleFor("second@x.co", PREVIEW)).toBe(true);
    expect(pairOnSaleFor("other@x.co", PREVIEW)).toBe(false);
  });

  it("compared without case or spaces", () => {
    const env = { GIFT_PAIR_ENABLED: "preview", GIFT_PAIR_PREVIEW_EMAILS: " Owner@X.co ,  second@x.co " };
    for (const email of ["owner@x.co", "OWNER@X.CO", " owner@x.co "]) expect(pairOnSaleFor(email, env), email).toBe(true);
    expect(pairPreviewEmails(env)).toEqual(["owner@x.co", "second@x.co"]);
  });

  it("a guest, an empty address and an empty list are never listed", () => {
    for (const email of [null, undefined, "", "   "]) expect(pairOnSaleFor(email, PREVIEW), JSON.stringify(email)).toBe(false);
    for (const list of ["", ",", " , ", undefined]) {
      const env = list === undefined ? { GIFT_PAIR_ENABLED: "preview" } : { GIFT_PAIR_ENABLED: "preview", GIFT_PAIR_PREVIEW_EMAILS: list };
      expect(pairOnSaleFor("owner@x.co", env), JSON.stringify(list)).toBe(false);
      expect(pairPreviewEmails(env)).toEqual([]);
    }
  });

  it("pairOnSale itself is as it was", () => {
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "preview" })).toBe(false);
    expect(pairOnSale({ GIFT_PAIR_ENABLED: "true" })).toBe(true);
    expect(pairOnSale({})).toBe(false);
  });
});

const NOW = Date.parse("2026-11-25T12:00:00.000Z");
const DAY = 86_400_000;
const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const U2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LISTED = { id: U1, email: "u1@x.co" };
const UNLISTED = { id: U2, email: "u2@x.co" };
const paidSingle = (user: string) => ({ id: `s-${user.slice(0, 1)}`, user_id: user, product: "single", template_slugs: ["vinyl"], amount: 999, currency: "eur", status: "paid", created_at: new Date(NOW - DAY).toISOString() });

let fake: FakeDb;
let stripe: FakeStripe;

/** The switch as Vercel would hold it: "preview" with U1 listed, or as given. */
function switchTo(value: string, list: string | null = "u1@x.co") {
  vi.stubEnv("GIFT_PAIR_ENABLED", value);
  // null: the list is not set at all.
  vi.stubEnv("GIFT_PAIR_PREVIEW_EMAILS", list ?? undefined);
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  fake = new FakeDb({ profiles: [{ id: U1, email: "u1@x.co", name: "Alex", locale: "en" }, { id: U2, email: "u2@x.co", name: "Sam", locale: "es" }], purchases: [paidSingle(U1), paidSingle(U2)] }, NOW);
  state.db = fake.db;
  stripe = new FakeStripe(() => NOW);
  state.stripe = stripe.client;
  state.user = null;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const ask = async (query = "") => {
  const res = await entitlements.GET(new NextRequest(`https://ethos.test/api/entitlements${query}`));
  return (await res.json()) as Record<string, unknown>;
};

describe("GET /api/entitlements while two more gifts are in preview", () => {
  it("entitlements, preview, listed: the offer and the pay panel's line", async () => {
    switchTo("preview");
    state.user = LISTED;
    const body = await ask();
    expect(body.pairOffer).toEqual({ amount: PRODUCTS.pair.amounts.eur, currency: "eur" });
    expect(body.addPair).toBe(true);
  });

  it("entitlements, preview, unlisted: exactly the answer it gets with the switch unset", async () => {
    state.user = UNLISTED;
    switchTo("preview");
    const previewBody = await ask();
    switchTo("");
    const offBody = await ask();
    expect(previewBody).toEqual(offBody);
    expect(previewBody.pairOffer).toBeNull();
    expect(previewBody.addPair).toBe(false);
  });

  it("entitlements, preview, a guest: never the pay panel's line", async () => {
    switchTo("preview");
    const preview = await ask("?addPair=1");
    switchTo("");
    expect(preview).toEqual(await ask("?addPair=1"));
    expect(preview.addPair).toBe(false);
    // Today's behaviour, held: on for everyone, a guest may add them.
    switchTo("true");
    expect((await ask("?addPair=1")).addPair).toBe(true);
  });

  it("the iPhone app's reads are off in preview", async () => {
    switchTo("preview");
    const body = await readEntitlements(fake.db, U1, { locale: "en", currency: "eur", now: NOW });
    expect(body.pairOffer).toBeNull();
    expect(body.addPair).toBe(false);
  });
});

/** Every key anywhere in a params object, nested. */
function keysOf(value: unknown, into: string[] = []): string[] {
  if (value && typeof value === "object")
    for (const [key, inner] of Object.entries(value)) {
      into.push(key);
      keysOf(inner, into);
    }
  return into;
}

describe("POST /api/stripe/checkout while two more gifts are in preview", () => {
  const post = (body: unknown) => checkout.POST(new NextRequest("https://ethos.test/api/stripe/checkout", { method: "POST", body: JSON.stringify(body) }));
  const answer = async (body: unknown) => {
    const res = await post(body);
    return { status: res.status, body: await res.json() };
  };
  const sent = () => stripe.calls.filter((c) => c.method === "checkout.sessions.create").map((c) => c.args[0] as Record<string, unknown> & { metadata: Record<string, string> });
  const pair = { product: "pair", currency: "eur", locale: "en", returnTo: "/dashboard" };
  const withPair = { product: "single", templateSlugs: ["bouquet"], currency: "eur", addPair: true };

  it("checkout, preview, listed: Stripe's page at the catalogue price, and no customer", async () => {
    switchTo("preview");
    state.user = LISTED;
    const res = await post(pair);
    expect(res.status).toBe(200);
    expect((await res.json()).url).toEqual(expect.any(String));
    const [params] = sent();
    expect(params).toMatchObject({ mode: "payment", metadata: { product: "pair" } });
    for (const key of ["customer", "customer_creation", "invoice_creation"]) expect(params, key).not.toHaveProperty(key);
    expect(keysOf(params)).not.toContain("setup_future_usage");
    // Nothing about the preview, and not the list, goes into the shared Stripe account's metadata
    // (the buyer's own address goes as customer_email, as it does for every signed-in checkout).
    expect(JSON.stringify(params.metadata)).not.toMatch(/preview|u1@x\.co/);
    expect(fake.rows("purchases").find((p) => p.product === "pair")).toMatchObject({ amount: PRODUCTS.pair.amounts.eur, status: "pending" });
  });

  it("checkout, preview, unlisted: refused exactly as when the switch is unset", async () => {
    state.user = UNLISTED;
    switchTo("preview");
    const preview = await answer(pair);
    switchTo("");
    const off = await answer(pair);
    expect(preview).toEqual(off);
    expect(preview).toEqual({ status: 400, body: { error: "not_on_sale" } });
    expect(sent()).toEqual([]);
    expect(fake.rows("purchases")).toHaveLength(2);
  });

  it("checkout, preview, a guest: refused exactly as when unset, not asked to sign in", async () => {
    switchTo("preview");
    const preview = await answer(pair);
    switchTo("");
    expect(preview).toEqual(await answer(pair));
    expect(preview).toEqual({ status: 400, body: { error: "not_on_sale" } });
    // On for everyone, a guest is asked to sign in: the difference, on record.
    switchTo("true");
    expect((await post(pair)).status).toBe(401);
  });

  it("checkout, preview: a gift with two more, listed and unlisted", async () => {
    switchTo("preview");
    state.user = LISTED;
    expect((await post(withPair)).status).toBe(200);
    expect(fake.rows("purchases").at(-1)).toMatchObject({ kind: "with_pair" });

    for (const user of [UNLISTED, null]) {
      state.user = user;
      switchTo("preview");
      const preview = await answer(withPair);
      const kindsAfterPreview = fake.rows("purchases").map((p) => p.kind);
      switchTo("");
      const off = await answer(withPair);
      expect(preview, String(user?.email)).toEqual(off);
      expect(kindsAfterPreview.filter((k) => k === "with_pair"), String(user?.email)).toHaveLength(1);
    }
  });

  it("checkout, preview: the wallet session too", async () => {
    switchTo("preview");
    state.user = LISTED;
    expect(await (await post({ ...pair, oneTap: true })).json()).toEqual({ clientSecret: expect.any(String), sessionId: expect.any(String) });
    state.user = UNLISTED;
    const preview = await answer({ ...pair, oneTap: true });
    switchTo("");
    expect(preview).toEqual(await answer({ ...pair, oneTap: true }));
    expect(preview.status).toBe(400);
  });

  it("preview with an empty list is off for everyone", async () => {
    switchTo("preview", null);
    state.user = LISTED;
    expect((await ask()).pairOffer).toBeNull();
    expect(await answer(pair)).toEqual({ status: 400, body: { error: "not_on_sale" } });
  });
});
