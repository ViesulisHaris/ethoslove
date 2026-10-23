import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { creditEndsAt, creditedPurchases, upgradeAmount, PURCHASE_CREDIT_COLUMNS } from "@/lib/commerce/pricing";
import { upgradeOffer } from "@/lib/commerce/entitlements";
import { upgradesAfter, purchaseOutcome } from "@/components/pricing/offers";
import { occasionsAhead, sortedOccasion } from "@/lib/lifecycle/occasions-ahead";
import { planCheckout, type CheckoutRequest } from "@/lib/commerce/plan";
import { sessionMetadata, type SessionOptions } from "@/lib/stripe/line-items";
import { FakeDb } from "./helpers/fake-db";

/**
 * "Every template for the difference" on the success page (lib/commerce/after-checkout.ts and
 * POST /api/money/upgrade/after-checkout): who is offered it, at what price, and who may buy it from
 * a checkout they have just finished. The price is credit for what was paid, so a buyer who upgrades
 * has paid exactly Everything's price in all.
 */

const NOW = Date.parse("2026-10-22T12:00:00.000Z");
const DAY = 86_400_000;
const paid = (product: string, amount: number, currency = "eur", status = "paid", createdAt = new Date(NOW).toISOString()) => ({ product, amount, currency, status, created_at: createdAt });

describe("the upgrade's price", () => {
  it("is Everything minus what they paid: €15 after a single, €10 after a pick three, €17.50 after make it special", () => {
    expect(upgradeOffer([], [paid("single", 999)], "eur")).toEqual({ amount: 1500, currency: "eur" });
    expect(upgradeOffer([], [paid("pick3", 1499)], "eur")).toEqual({ amount: 1000, currency: "eur" });
    expect(upgradeOffer([], [paid("extras", 749)], "eur")).toEqual({ amount: 1750, currency: "eur" });
  });

  it("in the buyer's currency: $18.00 after $11.99, £13.00 after £8.99", () => {
    expect(upgradeOffer([], [paid("single", 1199, "usd")], "usd")).toEqual({ amount: 1800, currency: "usd" });
    expect(upgradeOffer([], [paid("single", 899, "gbp")], "gbp")).toEqual({ amount: 1300, currency: "gbp" });
    // Paid in one currency and quoted in another, at the catalogue's own parity.
    expect(upgradeOffer([], [paid("single", 1199, "usd")], "eur")).toEqual({ amount: 1500, currency: "eur" });
  });

  it("is nothing for a guest with nothing bought, or for someone who owns Everything", () => {
    expect(upgradeOffer([], [], "eur")).toBeNull();
    expect(upgradeOffer(["*"], [paid("single", 999)], "eur")).toBeNull();
    // A pass, a pack or a gift card is not something the upgrade counts.
    expect(upgradeOffer([], [paid("pass", 2999), paid("pack", 299), paid("giftcard", 2499)], "eur")).toBeNull();
  });

  it("doesn't count a refunded purchase: it gave its money back", () => {
    expect(upgradeOffer([], [paid("single", 999, "eur", "refunded")], "eur")).toBeNull();
    expect(upgradeOffer([], [paid("single", 999), paid("single", 999, "eur", "refunded")], "eur")).toEqual({ amount: 1500, currency: "eur" });
  });

  it("never expires today: an old purchase counts as much as a new one, and no deadline is quoted", () => {
    const old = paid("single", 999, "eur", "paid", new Date(NOW - 400 * DAY).toISOString());
    expect(upgradeOffer([], [old], "eur", { now: NOW })).toEqual({ amount: 1500, currency: "eur" });
    expect(creditEndsAt([old], { now: NOW })).toBeNull();
    // Rows read without the date still count while there is no window.
    expect(upgradeAmount("eur", [{ product: "single", amount: 999, currency: "eur", status: "paid" }])).toBe(1500);
  });

  it("can be given a real deadline in one place, and then says until when", () => {
    const fresh = paid("single", 999, "eur", "paid", new Date(NOW - 2 * DAY).toISOString());
    const stale = paid("pick3", 1499, "eur", "paid", new Date(NOW - 15 * DAY).toISOString());
    const window = { now: NOW, days: 14 };
    expect(creditedPurchases([fresh, stale], window)).toEqual([fresh]);
    expect(upgradeOffer([], [fresh, stale], "eur", window)).toEqual({ amount: 1500, currency: "eur", creditUntil: new Date(NOW + 12 * DAY).toISOString() });
    // Outside the window there is nothing to upgrade from: Everything at its price.
    expect(upgradeOffer([], [stale], "eur", window)).toBeNull();
    // A row whose date wasn't read can't be shown to be inside a window, so it doesn't count.
    expect(creditedPurchases([{ product: "single", amount: 999, currency: "eur", status: "paid" }], window)).toEqual([]);
  });

  it("is read with the purchase date, so the deadline can be switched on without a missing column", () => {
    expect(PURCHASE_CREDIT_COLUMNS.split(", ")).toEqual(["product", "amount", "currency", "status", "created_at"]);
  });

  it("is what checkout charges for the upgrade, so the price shown is the price charged", () => {
    const ctx = { signedIn: true, ownedForever: ["bouquet"], purchases: [paid("single", 999)], creatorCode: null, giftCardsOnSale: false };
    const plan = planCheckout({ product: "upgrade", templateSlugs: [], currency: "eur" }, ctx);
    expect(plan.ok && plan.total).toBe(upgradeOffer(ctx.ownedForever, ctx.purchases, "eur")!.amount);
    // Owning Everything already: checkout refuses, the page offers nothing.
    expect(planCheckout({ product: "upgrade", templateSlugs: [], currency: "eur" }, { ...ctx, ownedForever: ["*"] })).toMatchObject({ ok: false, error: "already_owned" });
  });
});

describe("who the success page offers it to", () => {
  it("follows a single, a pick three or make it special, and nothing that is already every template", () => {
    for (const product of ["single", "pick3", "extras"] as const) expect(upgradesAfter({ product, bump: false })).toBe(true);
    for (const product of ["everything", "upgrade", "pass", "membership", "pack", "giftcard"] as const) expect(upgradesAfter({ product, bump: false })).toBe(false);
    // The bump made it Everything.
    expect(upgradesAfter({ product: "single", bump: true })).toBe(false);
    expect(purchaseOutcome({ product: "upgrade", bump: false })).toBe("everything");
  });
});

describe("the occasions it talks about", () => {
  const oct = new Date("2026-10-22T09:00:00Z");
  it("says which one is sorted only when the template leaves no doubt", () => {
    expect(sortedOccasion(["birthday-cinema"])).toBe("birthday");
    expect(sortedOccasion(["trick-or-treat"])).toBe("halloween");
    // The Letter and Bouquet suit several occasions: the page doesn't guess.
    expect(sortedOccasion(["the-letter"])).toBeNull();
    expect(sortedOccasion(["bouquet"])).toBeNull();
    expect(sortedOccasion(["birthday-cinema", "bouquet", "xoxo"])).toBeNull();
    expect(sortedOccasion(["not-a-template"])).toBeNull();
  });

  it("names the days ahead: their birthday, your anniversary, then Christmas and Valentine's, nearer first", () => {
    expect(occasionsAhead(null, oct)).toEqual(["birthday", "anniversary", "christmas", "valentines"]);
    expect(occasionsAhead("birthday", oct)).toEqual(["anniversary", "christmas", "valentines"]);
    expect(occasionsAhead("halloween", oct)).toEqual(["birthday", "anniversary", "christmas", "valentines"]);
    expect(occasionsAhead(null, new Date("2026-12-26T09:00:00Z"))).toEqual(["birthday", "anniversary", "valentines", "christmas"]);
    expect(occasionsAhead("christmas", new Date("2026-12-01T09:00:00Z"))).toEqual(["birthday", "anniversary", "valentines"]);
  });
});

// --- Buying it from the checkout just finished -----------------------------------------------

const state = vi.hoisted(() => ({
  // The three currencies checkout charges in production (W2), read when the catalogue loads.
  currencies: ((previous) => ((process.env.NEXT_PUBLIC_PRICE_CURRENCIES = "eur,usd,gbp"), previous))(process.env.NEXT_PUBLIC_PRICE_CURRENCIES),
  db: null as unknown,
  stripe: null as unknown,
  user: null as { id: string; email: string } | null,
  fulfilled: null as unknown,
  createdBy: null as string | null,
  signedIn: [] as string[],
  signInWorks: true,
  rateLimited: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => null }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => !state.rateLimited }));
vi.mock("@/lib/email/notify", () => ({ notifyReceipt: vi.fn(), notifyWelcome: vi.fn(), sendPassWelcome: vi.fn(), sendGiftCardEmail: vi.fn(), sendMembershipWelcome: vi.fn() }));
vi.mock("@/lib/stripe/fulfil", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/stripe/fulfil")>();
  return {
    ...real,
    fulfilCheckoutSession: vi.fn(async () => state.fulfilled),
    accountCreatedByCheckout: vi.fn(async (_userId: string, sessionId: string) => state.createdBy === sessionId),
  };
});

// Signing a browser in is Supabase's own work; here it only records who it would have been.
vi.mock("@/lib/commerce/after-checkout", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/commerce/after-checkout")>();
  return {
    ...real,
    signInBrowser: vi.fn(async (email: string) => {
      state.signedIn.push(email);
      return state.signInWorks;
    }),
  };
});

const afterCheckout = await import("@/lib/commerce/after-checkout");
const { readSession } = await import("@/lib/stripe/fulfil");
const route = await import("@/app/api/money/upgrade/after-checkout/route");
afterAll(() => {
  if (state.currencies === undefined) delete process.env.NEXT_PUBLIC_PRICE_CURRENCIES;
  else process.env.NEXT_PUBLIC_PRICE_CURRENCIES = state.currencies;
});

const PURCHASE = "11111111-1111-4111-8111-111111111111";
const BUYER = "22222222-2222-4222-8222-222222222222";
const SESSION = "cs_test_a1b2c3d4e5f6g7h8i9";

function finished(r: Partial<CheckoutRequest> & Pick<CheckoutRequest, "product">, options: Partial<SessionOptions> = {}, extra: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  const plan = planCheckout({ templateSlugs: [], currency: "eur", ...r }, { signedIn: Boolean(options.userId), ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: true });
  if (!plan.ok) throw new Error(plan.error);
  const meta = sessionMetadata(plan, { purchaseId: PURCHASE, userId: null, email: null, locale: "en", origin: "https://ethos.test", returnTo: "/", automaticTax: false, productIds: {}, ...options });
  return {
    id: SESSION,
    object: "checkout.session",
    mode: "payment",
    payment_status: "paid",
    amount_total: plan.total,
    currency: plan.currency,
    currency_conversion: null,
    payment_intent: "pi_1",
    customer_details: { email: "buyer@example.com" },
    metadata: meta,
    client_reference_id: PURCHASE,
    created: NOW / 1000 - 60,
    ...extra,
  } as unknown as Stripe.Checkout.Session;
}

/** Just enough of Stripe: the finished session to read back, new sessions as they are asked for, open until expired. */
function fakeStripe(session: Stripe.Checkout.Session | null) {
  const created: Stripe.Checkout.SessionCreateParams[] = [];
  const opened = new Map<string, { id: string; url: string; status: "open" | "expired" | "complete" }>();
  return {
    created,
    opened,
    checkout: {
      sessions: {
        retrieve: vi.fn(async (id: string) => {
          if (session && id === session.id) return session;
          const made = opened.get(id);
          if (!made) throw new Error("No such checkout.session");
          return made;
        }),
        create: vi.fn(async (params: Stripe.Checkout.SessionCreateParams) => {
          created.push(params);
          const made = { id: `cs_test_upgrade${created.length}xxxxxxxx`, url: `https://checkout.stripe.test/${created.length}`, status: "open" as const };
          opened.set(made.id, made);
          return made;
        }),
        expire: vi.fn(async (id: string) => {
          const made = opened.get(id);
          if (made) made.status = "expired";
          return made;
        }),
      },
    },
  };
}

function seed(purchases: Record<string, unknown>[] = [paid("single", 999)], unlocks: string[] = ["bouquet"]) {
  const fake = new FakeDb(
    {
      purchases: purchases.map((p, i) => ({ id: i === 0 ? PURCHASE : `p-${i}`, user_id: BUYER, ...p })),
      template_unlocks: unlocks.map((slug) => ({ id: `u-${slug}`, user_id: BUYER, template_slug: slug, purchase_id: PURCHASE })),
      couple_passes: [],
      profiles: [{ id: BUYER, email: "buyer@example.com", locale: "en" }],
    },
    NOW,
  );
  state.db = fake.db;
  return fake;
}

const post = (body: Record<string, unknown>) =>
  route.POST(new NextRequest("https://ethos.test/api/money/upgrade/after-checkout", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  state.user = null;
  state.fulfilled = { ok: true, userId: BUYER, email: "buyer@example.com", createdUser: true };
  state.createdBy = SESSION;
  state.rateLimited = false;
  state.signedIn = [];
  state.signInWorks = true;
});
afterEach(() => vi.useRealTimers());

describe("who may buy it from the checkout just finished", () => {
  it("a guest whose browser isn't signed in yet, while the checkout is fresh and made their account", async () => {
    const buyer = await afterCheckout.buyerOfCheckout(finished({ product: "single", templateSlugs: ["bouquet"] }), null, NOW);
    expect(buyer).toMatchObject({ ok: true, userId: BUYER, email: "buyer@example.com", signIn: true });
  });

  it("not a guest after the half hour: they sign in like anyone else", async () => {
    const stale = finished({ product: "single", templateSlugs: ["bouquet"] }, {}, { created: NOW / 1000 - 31 * 60 });
    expect(await afterCheckout.buyerOfCheckout(stale, null, NOW)).toEqual({ ok: false, error: "sign_in_required", status: 401 });
  });

  it("not a guest who typed an existing account's email: Stripe never checks it", async () => {
    state.createdBy = "cs_test_someone_elses_checkout";
    expect(await afterCheckout.buyerOfCheckout(finished({ product: "single", templateSlugs: ["bouquet"] }), null, NOW)).toEqual({ ok: false, error: "sign_in_required", status: 401 });
  });

  it("a signed-in buyer of that very checkout, and nobody else signed in", async () => {
    const theirs = finished({ product: "extras", templateSlugs: ["the-letter"] }, { userId: BUYER, email: "buyer@example.com" });
    expect(await afterCheckout.buyerOfCheckout(theirs, { id: BUYER, email: "buyer@example.com" }, NOW)).toMatchObject({ ok: true, userId: BUYER, signIn: false });
    expect(await afterCheckout.buyerOfCheckout(theirs, { id: "someone-else", email: "x@example.com" }, NOW)).toEqual({ ok: false, error: "wrong_account", status: 403 });
    expect(await afterCheckout.buyerOfCheckout(theirs, null, NOW)).toEqual({ ok: false, error: "sign_in_required", status: 401 });
  });

  it("a guest checkout someone else's browser is signed in for is refused, not switched", async () => {
    expect(await afterCheckout.buyerOfCheckout(finished({ product: "single", templateSlugs: ["bouquet"] }), { id: "someone-else", email: "x@example.com" }, NOW)).toEqual({ ok: false, error: "wrong_account", status: 403 });
  });

  it("nothing for an unpaid, refunded, already-Everything or someone else's checkout", async () => {
    const single = { product: "single" as const, templateSlugs: ["bouquet"] };
    expect(await afterCheckout.buyerOfCheckout(finished(single, {}, { payment_status: "unpaid" }), null, NOW)).toMatchObject({ error: "unpaid", status: 409 });
    state.fulfilled = { ok: false, reason: "refunded" };
    expect(await afterCheckout.buyerOfCheckout(finished(single), null, NOW)).toMatchObject({ error: "refunded", status: 409 });
    state.fulfilled = { ok: true, userId: BUYER, email: "buyer@example.com" };
    expect(await afterCheckout.buyerOfCheckout(finished({ product: "everything" }), null, NOW)).toMatchObject({ error: "not_eligible" });
    expect(await afterCheckout.buyerOfCheckout(finished({ ...single, addEverything: true }), null, NOW)).toMatchObject({ error: "not_eligible" });
    // Another business on the shared Stripe account.
    const theirs = finished(single, {}, { metadata: { user_id: BUYER, guest: "0", product: "single" } });
    expect(await afterCheckout.buyerOfCheckout(theirs, { id: BUYER, email: "buyer@example.com" }, NOW)).toMatchObject({ error: "not_found", status: 404 });
  });
});

describe("POST /api/money/upgrade/after-checkout", () => {
  it("charges the buyer Everything minus what they paid, for that buyer, and signs a guest in on the way out", async () => {
    const fake = seed();
    const stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"] }));
    state.stripe = stripe;
    // Whatever the page sends besides the session is ignored: no amount, product or user comes from it.
    const res = await post({ sessionId: SESSION, returnTo: "/create/bouquet?resume=publish", locale: "en", amount: 1, userId: "someone-else", product: "everything" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/1" });

    const params = stripe.created[0];
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(1500);
    expect(params.line_items?.[0].price_data?.currency).toBe("eur");
    // Stripe's page says what the price is: credit for what they paid, not a discount.
    expect(params.line_items?.[0].price_data?.product_data?.description).toBe("Every template is €24.99, and what you've already paid counts towards it.");
    expect(params.metadata).toMatchObject({ product: "upgrade", user_id: BUYER, guest: "0", kind: "upgrade" });
    expect(params.customer_email).toBe("buyer@example.com");
    expect(params.allow_promotion_codes).toBe(false);
    expect(params.success_url).toContain("/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=%2Fcreate%2Fbouquet%3Fresume%3Dpublish");
    // Cancelling goes straight back to the gift, which then sends itself.
    expect(params.cancel_url).toMatch(/\/create\/bouquet\?resume=publish$/);

    const pending = fake.rows("purchases").find((p) => p.product === "upgrade");
    expect(pending).toMatchObject({ user_id: BUYER, amount: 1500, currency: "eur", status: "pending", kind: "upgrade", stripe_session_id: "cs_test_upgrade1xxxxxxxx" });
    expect(state.signedIn).toEqual(["buyer@example.com"]);
  });

  it("in the currency they paid in: $18.00 after $11.99, £13.00 after £8.99", async () => {
    for (const [currency, single, upgrade] of [["usd", 1199, 1800], ["gbp", 899, 1300]] as const) {
      seed([paid("single", single, currency)]);
      const stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"], currency }));
      state.stripe = stripe;
      const res = await post({ sessionId: SESSION });
      expect(res.status).toBe(200);
      expect(stripe.created[0].line_items?.[0].price_data).toMatchObject({ unit_amount: upgrade, currency });
    }
  });

  it("a second tap, or a second tab, goes back to the checkout already open: the difference can't be paid twice", async () => {
    const fake = seed();
    const stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"] }));
    state.stripe = stripe;
    const first = await (await post({ sessionId: SESSION })).json();
    const second = await post({ sessionId: SESSION });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(first);
    expect(stripe.created).toHaveLength(1);
    expect(fake.rows("purchases").filter((p) => p.product === "upgrade")).toHaveLength(1);
    // Paid or expired, it isn't gone back to: a new one opens.
    stripe.opened.get("cs_test_upgrade1xxxxxxxx")!.status = "expired";
    expect(await (await post({ sessionId: SESSION })).json()).toEqual({ url: "https://checkout.stripe.test/2" });
  });

  it("closes a checkout left open at another price, so only the right one can be paid", async () => {
    const fake = seed();
    const stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"] }));
    state.stripe = stripe;
    stripe.opened.set("cs_test_stalestalestale", { id: "cs_test_stalestalestale", url: "https://checkout.stripe.test/stale", status: "open" });
    fake.rows("purchases").push({ id: "p-stale", user_id: BUYER, product: "upgrade", amount: 2000, currency: "eur", status: "pending", stripe_session_id: "cs_test_stalestalestale", created_at: new Date(NOW - 60_000).toISOString() });
    expect(await (await post({ sessionId: SESSION })).json()).toEqual({ url: "https://checkout.stripe.test/1" });
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_test_stalestalestale");
    expect(stripe.opened.get("cs_test_stalestalestale")!.status).toBe("expired");
  });

  it("doesn't sign a signed-in buyer in again", async () => {
    seed([paid("extras", 749)], ["the-letter"]);
    state.user = { id: BUYER, email: "buyer@example.com" };
    state.stripe = fakeStripe(finished({ product: "extras", templateSlugs: ["the-letter"] }, { userId: BUYER, email: "buyer@example.com" }));
    const res = await post({ sessionId: SESSION, returnTo: "/create/the-letter?resume=publish" });
    expect(res.status).toBe(200);
    expect(state.signedIn).toEqual([]);
  });

  it("refuses someone who owns Everything, and signs nobody in for it", async () => {
    seed([paid("single", 999)], ["*"]);
    state.stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"] }));
    const res = await post({ sessionId: SESSION });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "already_owned" });
    expect(state.signedIn).toEqual([]);
  });

  it("refuses a made-up, malformed or unknown session, and a page that doesn't send one", async () => {
    seed();
    state.stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"] }));
    expect((await post({ sessionId: "cs_test_doesnotexist12345" })).status).toBe(404);
    expect((await post({ sessionId: "pi_123" })).status).toBe(400);
    expect((await post({ sessionId: "cs_test_x'; drop table purchases;--" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ sessionId: SESSION, returnTo: "//evil.example" })).status).toBe(400);
  });

  it("says when it can't sign the guest in, and when payments are off or it is asked too often", async () => {
    seed();
    state.stripe = fakeStripe(finished({ product: "single", templateSlugs: ["bouquet"] }));
    state.signInWorks = false;
    expect((await post({ sessionId: SESSION })).status).toBe(401);
    state.rateLimited = true;
    expect((await post({ sessionId: SESSION })).status).toBe(429);
    state.stripe = null;
    expect((await post({ sessionId: SESSION })).status).toBe(503);
  });
});

describe("what the success page quotes", () => {
  it("the offer, the full price, what this checkout paid, and whether earlier purchases count too", async () => {
    seed();
    const session = finished({ product: "single", templateSlugs: ["birthday-cinema"] });
    const offer = await afterCheckout.upgradeAfterCheckout(session, readSession(session)!, BUYER, NOW);
    expect(offer).toEqual({ offer: { amount: 1500, currency: "eur" }, full: 2499, paid: 999, earlier: false, sorted: "birthday", ahead: ["anniversary", "christmas", "valentines"] });
  });

  it("counts earlier purchases, and offers nothing once Everything is theirs", async () => {
    seed([paid("single", 999), paid("pick3", 1499)]);
    const session = finished({ product: "single", templateSlugs: ["bouquet"] });
    expect(await afterCheckout.upgradeAfterCheckout(session, readSession(session)!, BUYER, NOW)).toMatchObject({ offer: { amount: 499 }, earlier: true, sorted: null });
    seed([paid("single", 999)], ["*"]);
    expect(await afterCheckout.upgradeAfterCheckout(session, readSession(session)!, BUYER, NOW)).toBeNull();
  });
});
