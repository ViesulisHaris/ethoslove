import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

/**
 * A visitor's currency from the door to Stripe: the proxy serves the copy of a page built for their
 * country (src/app/[currency]), and checkout charges the currency that page sent, or, when it sent
 * none, the one the proxy would have picked. New York pays $11.99, Riga €9.99, London £8.99 for one
 * template, and with NEXT_PUBLIC_PRICE_CURRENCIES unset everyone still sees and pays euros.
 */

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/proxy", () => ({ refreshSupabaseSession: async (_request: unknown, response: unknown) => response }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => null }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));

const ALL = "eur,usd,gbp";

/** The proxy and the checkout route as a build with these currencies has them (the list is inlined at build). */
async function build(currencies: string | undefined) {
  if (currencies === undefined) vi.stubEnv("NEXT_PUBLIC_PRICE_CURRENCIES", undefined);
  else vi.stubEnv("NEXT_PUBLIC_PRICE_CURRENCIES", currencies);
  vi.resetModules();
  return { proxy: (await import("@/proxy")).proxy, checkout: await import("@/app/api/stripe/checkout/route") };
}

/** Where the proxy sends a request inside the app, and anything it redirects to. */
async function route(proxy: (request: NextRequest) => Promise<Response>, path: string, country?: string) {
  const response = await proxy(new NextRequest(`https://tryethos.io${path}`, { headers: country ? { "x-vercel-ip-country": country } : {} }));
  const rewrite = response.headers.get("x-middleware-rewrite");
  return { inside: rewrite ? new URL(rewrite).pathname + new URL(rewrite).search : null, redirect: response.headers.get("location"), response };
}

afterEach(() => vi.unstubAllEnvs());

describe("the proxy serves each country its own currency's copy of a page", () => {
  it("dollars in New York, euros in Riga, pounds in London, on the address the visitor typed", async () => {
    const { proxy } = await build(ALL);
    expect((await route(proxy, "/templates/bouquet", "US")).inside).toBe("/usd/en/templates/bouquet");
    expect((await route(proxy, "/templates/bouquet", "LV")).inside).toBe("/eur/en/templates/bouquet");
    expect((await route(proxy, "/templates/bouquet", "GB")).inside).toBe("/gbp/en/templates/bouquet");
    // The rest of Europe, and the rest of the world, see euros as they always have.
    expect((await route(proxy, "/templates/bouquet", "PL")).inside).toBe("/eur/en/templates/bouquet");
    expect((await route(proxy, "/templates/bouquet", "CA")).inside).toBe("/eur/en/templates/bouquet");
  });

  it("the ads' landing page keeps its query, the home page and Spanish pages get the segment too", async () => {
    const { proxy } = await build(ALL);
    expect((await route(proxy, "/create/bouquet?ref=ad-meta-bq&utm_source=meta", "US")).inside).toBe("/usd/en/create/bouquet?ref=ad-meta-bq&utm_source=meta");
    expect((await route(proxy, "/", "US")).inside).toBe("/usd/en");
    // A Spanish page next-intl lets through as it came becomes a rewrite to the same path, keeping
    // the locale header next-intl set for the page.
    const spanish = await route(proxy, "/es/pricing", "US");
    expect(spanish.inside).toBe("/usd/es/pricing");
    expect(spanish.response.headers.get("x-middleware-next")).toBeNull();
    expect(spanish.response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("es");
    expect((await route(proxy, "/es/templates/xoxo", "GB")).inside).toBe("/gbp/es/templates/xoxo");
  });

  it("gift links too, and leaves next-intl's redirects alone", async () => {
    const { proxy } = await build(ALL);
    expect((await route(proxy, "/g/k7m2p9xqa", "GB")).inside).toBe("/gbp/en/g/k7m2p9xqa");
    // /en/… is the default locale spelled out: next-intl sends it to /…, which comes back through here.
    const spelled = await route(proxy, "/en/pricing", "US");
    expect(spelled.inside).toBeNull();
    expect(new URL(spelled.redirect!).pathname).toBe("/pricing");
  });

  it("with NEXT_PUBLIC_PRICE_CURRENCIES unset, every country gets the euro copy: today's site", async () => {
    const { proxy } = await build(undefined);
    for (const country of ["US", "LV", "GB", undefined]) expect((await route(proxy, "/templates/bouquet", country)).inside).toBe("/eur/en/templates/bouquet");
  });
});

describe("checkout charges the currency the page showed", () => {
  let stripe: FakeStripe;
  beforeEach(() => {
    stripe = new FakeStripe(() => Date.now());
    state.stripe = stripe.client;
    state.db = new FakeDb({}, Date.now()).db;
  });

  /** One premium template, as the publish sheet asks for it, from a visitor in `country`. */
  const buy = (checkout: Awaited<ReturnType<typeof build>>["checkout"], country: string, currency?: string) =>
    checkout.POST(
      new NextRequest("https://tryethos.io/api/stripe/checkout", {
        method: "POST",
        headers: { "x-vercel-ip-country": country },
        body: JSON.stringify({ product: "single", templateSlugs: ["bouquet"], locale: "en", ...(currency ? { currency } : {}) }),
      }),
    );
  const line = () => {
    const params = stripe.calls.filter((c) => c.method === "checkout.sessions.create").at(-1)!.args[0] as { line_items: { price_data: Record<string, unknown> }[] };
    return params.line_items[0].price_data;
  };

  it("$11.99 from the US, €9.99 from Latvia, £8.99 from the UK: the page's currency, sent with the button", async () => {
    const { checkout } = await build(ALL);
    for (const [country, currency, amount] of [["US", "usd", 1199], ["LV", "eur", 999], ["GB", "gbp", 899]] as const) {
      expect((await buy(checkout, country, currency)).status).toBe(200);
      expect(line()).toMatchObject({ currency, unit_amount: amount, tax_behavior: "inclusive" });
    }
  });

  it("a button that sends no currency gets the one the proxy picked for the same country", async () => {
    const { checkout } = await build(ALL);
    for (const [country, currency, amount] of [["US", "usd", 1199], ["LV", "eur", 999], ["GB", "gbp", 899]] as const) {
      expect((await buy(checkout, country)).status).toBe(200);
      expect(line()).toMatchObject({ currency, unit_amount: amount });
    }
  });

  it("charges what the page said even when the country changed in between (a VPN, a flight): never a surprise", async () => {
    const { checkout } = await build(ALL);
    expect((await buy(checkout, "LV", "usd")).status).toBe(200);
    expect(line()).toMatchObject({ currency: "usd", unit_amount: 1199 });
  });

  it("with NEXT_PUBLIC_PRICE_CURRENCIES unset, euros whatever is asked", async () => {
    const { checkout } = await build(undefined);
    for (const [country, currency] of [["US", "usd"], ["GB", "gbp"], ["US", undefined]] as const) {
      expect((await buy(checkout, country, currency)).status).toBe(200);
      expect(line()).toMatchObject({ currency: "eur", unit_amount: 999 });
    }
  });
});
