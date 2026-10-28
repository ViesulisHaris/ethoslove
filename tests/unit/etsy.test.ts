import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeDb } from "./helpers/fake-db";

/**
 * "Bought on Etsy" (docs/marketing/ETSY.md): a template is handed over only for an order Etsy itself
 * calls paid, once per item bought, and taken back when Etsy cancels or refunds it.
 */

const state = vi.hoisted(() => ({
  db: null as unknown,
  user: null as { id: string; email?: string } | null,
  allowed: true,
}));
const mail = vi.hoisted(() => ({ notifyWelcome: vi.fn(async () => undefined) }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => state.allowed }));
vi.mock("@/lib/email/notify", () => mail);

const { claimable, orderTemplates, etsyOrderNumber, skuTemplate, claimKey } = await import("@/lib/etsy/receipt");
const { claimEtsyItem } = await import("@/lib/etsy/claim");
const { accessToken, fetchReceipt, keepConnected, EtsyError } = await import("@/lib/etsy/api");
const { reconcileEtsyRefunds } = await import("@/lib/etsy/refunds");
const claimRoute = await import("@/app/api/etsy/claim/route");
const findRoute = await import("@/app/api/etsy/find/route");
const cronRoute = await import("@/app/api/cron/etsy/route");
const connectRoute = await import("@/app/api/etsy/connect/route");
const callbackRoute = await import("@/app/api/etsy/callback/route");
const statusRoute = await import("@/app/api/etsy/status/route");
const { etsyHealth } = await import("@/lib/etsy/health");

const NOW = Date.parse("2026-10-27T12:00:00.000Z");
const SHOP = 55501234;
const CONFIG = { keystring: "kstest", sharedSecret: "sstest", shopId: SHOP, connectSecret: "connect-test" };
const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const U2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RECEIPT = 3456789012;

const money = (amount: number) => ({ amount, divisor: 100, currency_code: "EUR" });
function receipt(over: Record<string, unknown> = {}, items: { sku: string; quantity?: number; tx?: number }[] = [{ sku: "ethos-popup-card" }]) {
  return {
    receipt_id: RECEIPT,
    status: "paid",
    is_paid: true,
    refunds: [],
    transactions: items.map((item, i) => ({ transaction_id: item.tx ?? 9000 + i, listing_id: 777 + i, quantity: item.quantity ?? 1, sku: item.sku, price: money(1199) })),
    ...over,
  };
}

let fake: FakeDb;
let createUser: ReturnType<typeof vi.fn>;
let generateLink: ReturnType<typeof vi.fn>;
function openDb(seed: Record<string, Record<string, unknown>[]> = {}) {
  fake = new FakeDb(
    {
      profiles: [{ id: U1, email: "u1@x.co", locale: "en" }],
      etsy_connection: [{ id: 1, shop_id: SHOP, access_token: "1234.access-old", refresh_token: "refresh-old", expires_at: new Date(NOW + 3_000_000).toISOString() }],
      ...seed,
    },
    NOW,
  );
  createUser = vi.fn(async ({ email, app_metadata }: { email: string; app_metadata: Record<string, string> }) => {
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    fake.tables.profiles = [...fake.rows("profiles"), { id, email, locale: "en" }];
    users.set(id, app_metadata);
    return { data: { user: { id } }, error: null };
  });
  generateLink = vi.fn(async () => ({ data: { properties: { hashed_token: "hash-1" } }, error: null }));
  const users = new Map<string, Record<string, string>>();
  const getUserById = vi.fn(async (id: string) => ({ data: { user: users.has(id) ? { id, app_metadata: users.get(id) } : { id, app_metadata: {} } } }));
  state.db = { ...fake.db, auth: { admin: { createUser, generateLink, getUserById } } };
}

/** Etsy's API as fetch sees it: the order (or a status), and the token endpoint. */
function etsyFetch(order: unknown | number, tokens = { access_token: "1234.access-new", refresh_token: "refresh-new", expires_in: 3600 }) {
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/v3/public/oauth/token")) return new Response(JSON.stringify(tokens), { status: 200, headers: { "content-type": "application/json" } });
    if (u.includes(`/shops/${SHOP}/receipts/`)) {
      expect((init?.headers as Record<string, string>)["x-api-key"]).toBe("kstest:sstest");
      return typeof order === "number" ? new Response("{}", { status: order }) : new Response(JSON.stringify(order), { status: 200 });
    }
    return new Response("{}", { status: 404 });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  state.allowed = true;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("ETSY_KEYSTRING", CONFIG.keystring);
  vi.stubEnv("ETSY_SHARED_SECRET", CONFIG.sharedSecret);
  vi.stubEnv("ETSY_SHOP_ID", String(SHOP));
  openDb();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("reading an Etsy order", () => {
  it("takes the order number as Etsy prints it, and the template from the listing's SKU", () => {
    expect(etsyOrderNumber("3456789012")).toBe(3456789012);
    expect(etsyOrderNumber(" #3456 789 012 ")).toBe(3456789012);
    // Pasted from Etsy's email as it prints it.
    expect(etsyOrderNumber("Order #3456789012")).toBe(3456789012);
    for (const bad of ["", "12345", "1234567890123456", "Order #3456789012 on 28 Oct"]) expect(etsyOrderNumber(bad)).toBeNull();
    expect(skuTemplate("ethos-popup-card")).toBe("popup-card");
    expect(skuTemplate("POPUP-CARD")).toBe("popup-card");
    expect(skuTemplate("ethos-not-a-template")).toBeNull();
    expect(skuTemplate(null)).toBeNull();
  });

  it("hands over only what Etsy calls paid: one item per unit bought, at its price", () => {
    expect(claimable(receipt() as never, "popup-card")).toEqual({ ok: true, units: [{ key: claimKey(RECEIPT, 9000, 0), listingId: 777, amount: 1199, currency: "eur" }] });
    expect(claimable(receipt({ status: "completed" }) as never, "popup-card").ok).toBe(true);
    const two = claimable(receipt({}, [{ sku: "ethos-popup-card", quantity: 2 }]) as never, "popup-card");
    expect(two.ok && two.units.map((u) => u.key)).toEqual([`${RECEIPT}/9000/0`, `${RECEIPT}/9000/1`]);
  });

  it("waits for a payment Etsy hasn't confirmed, and never counts a cancelled or refunded order", () => {
    for (const over of [{ status: "open" }, { status: "payment processing" }, { is_paid: false }, { status: "Paid", is_paid: "true" }])
      expect(claimable(receipt(over) as never, "popup-card")).toEqual({ ok: false, error: "not_paid" });
    for (const over of [{ status: "canceled" }, { status: "fully refunded" }, { status: "partially refunded" }, { refunds: [{ amount: money(500) }] }])
      expect(claimable(receipt(over) as never, "popup-card")).toEqual({ ok: false, error: "refunded" });
  });

  it("says which templates an order is for when it isn't for this one", () => {
    expect(claimable(receipt({}, [{ sku: "ethos-bouquet" }, { sku: "" }]) as never, "popup-card")).toEqual({ ok: false, error: "other_template", templates: ["bouquet"] });
  });
});

describe("handing an item over once", () => {
  const units = (n = 1) => Array.from({ length: n }, (_, i) => ({ key: claimKey(RECEIPT, 9000, i), listingId: 777, amount: 1199, currency: "eur" }));

  it("records an Etsy purchase and unlocks the template", async () => {
    const result = await claimEtsyItem(fake.db as never, { userId: U1, slug: "popup-card", units: units() });
    expect(result).toMatchObject({ ok: true, again: false });
    expect(fake.rows("purchases")).toEqual([
      expect.objectContaining({ user_id: U1, product: "single", template_slugs: ["popup-card"], amount: 1199, currency: "eur", status: "paid", store: "etsy", store_product_id: "777", store_transaction_id: `${RECEIPT}/9000/0`, ref: "etsy" }),
    ]);
    expect(fake.rows("template_unlocks")).toEqual([expect.objectContaining({ user_id: U1, template_slug: "popup-card" })]);
  });

  it("lets the same account ask again without using another item, and refuses everyone else", async () => {
    await claimEtsyItem(fake.db as never, { userId: U1, slug: "popup-card", units: units() });
    expect(await claimEtsyItem(fake.db as never, { userId: U1, slug: "popup-card", units: units() })).toMatchObject({ ok: true, again: true });
    expect(await claimEtsyItem(fake.db as never, { userId: U2, slug: "popup-card", units: units() })).toEqual({ ok: false, error: "used" });
    expect(fake.rows("purchases")).toHaveLength(1);
  });

  it("an order of two sends two gifts, and no third", async () => {
    expect(await claimEtsyItem(fake.db as never, { userId: U1, slug: "popup-card", units: units(2) })).toMatchObject({ ok: true });
    expect(await claimEtsyItem(fake.db as never, { userId: U2, slug: "popup-card", units: units(2) })).toMatchObject({ ok: true });
    expect(await claimEtsyItem(fake.db as never, { userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", slug: "popup-card", units: units(2) })).toEqual({ ok: false, error: "used" });
    expect(fake.rows("purchases").map((p) => p.store_transaction_id)).toEqual([`${RECEIPT}/9000/0`, `${RECEIPT}/9000/1`]);
  });
});

describe("the shop's Etsy sign-in", () => {
  it("uses the access token while it lasts, and renews it, keeping Etsy's new refresh token", async () => {
    const fetch = etsyFetch(receipt());
    expect(await accessToken(fake.db as never, CONFIG, NOW, { doFetch: fetch as never })).toEqual({ token: "1234.access-old", shopId: SHOP });
    expect(fetch).not.toHaveBeenCalled();
    expect(await accessToken(fake.db as never, CONFIG, NOW + 3_000_000, { doFetch: fetch as never })).toEqual({ token: "1234.access-new", shopId: SHOP });
    const body = new URLSearchParams(String((fetch.mock.calls[0][1] as RequestInit).body));
    expect(Object.fromEntries(body)).toEqual({ grant_type: "refresh_token", client_id: "kstest", refresh_token: "refresh-old" });
    expect(fake.rows("etsy_connection")[0]).toMatchObject({ access_token: "1234.access-new", refresh_token: "refresh-new" });
  });

  it("isn't connected until the shop's owner connects it, and only for our shop", async () => {
    openDb({ etsy_connection: [] });
    await expect(accessToken(fake.db as never, CONFIG, NOW)).rejects.toEqual(new EtsyError("not_connected"));
    openDb({ etsy_connection: [{ id: 1, shop_id: 999, access_token: "1.a", refresh_token: "r", expires_at: new Date(NOW + 3_000_000).toISOString() }] });
    await expect(accessToken(fake.db as never, CONFIG, NOW)).rejects.toEqual(new EtsyError("not_connected"));
    // Without ETSY_SHOP_ID, the shop is the one that was connected.
    expect((await accessToken(fake.db as never, { ...CONFIG, shopId: null }, NOW)).shopId).toBe(999);
  });

  it("is renewed once a month though no order needs it, so a quiet shop stays connected", async () => {
    const day = 86_400_000;
    openDb({ etsy_connection: [{ id: 1, shop_id: SHOP, access_token: "1234.access-old", refresh_token: "refresh-old", expires_at: new Date(NOW + 60 * day).toISOString(), updated_at: new Date(NOW - 10 * day).toISOString() }] });
    const fetch = etsyFetch(receipt());
    await keepConnected(fake.db as never, CONFIG, NOW, fetch as never);
    expect(fetch).not.toHaveBeenCalled();
    await keepConnected(fake.db as never, CONFIG, NOW + 21 * day, fetch as never);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fake.rows("etsy_connection")[0]).toMatchObject({ refresh_token: "refresh-new", updated_at: new Date(NOW + 21 * day).toISOString() });
    openDb({ etsy_connection: [] });
    await expect(keepConnected(fake.db as never, CONFIG, NOW, fetch as never)).rejects.toEqual(new EtsyError("not_connected"));
  });

  it("asks Etsy for the order every time, and treats an unknown order as none", async () => {
    expect(await fetchReceipt(fake.db as never, CONFIG, RECEIPT, NOW, etsyFetch(receipt()) as never)).toMatchObject({ receipt_id: RECEIPT, status: "paid" });
    expect(await fetchReceipt(fake.db as never, CONFIG, RECEIPT, NOW, etsyFetch(404) as never)).toBeNull();
    await expect(fetchReceipt(fake.db as never, CONFIG, RECEIPT, NOW, etsyFetch(503) as never)).rejects.toEqual(new EtsyError("unavailable"));
    // An answer about some other order is no answer.
    await expect(fetchReceipt(fake.db as never, CONFIG, RECEIPT, NOW, etsyFetch(receipt({ receipt_id: 1 })) as never)).rejects.toEqual(new EtsyError("unavailable"));
  });
});

describe("POST /api/etsy/find", () => {
  const find = (order: unknown) => findRoute.POST(new NextRequest("https://ethos.test/api/etsy/find", { method: "POST", body: JSON.stringify({ order }) }));

  it("names the gifts a paid order is for, from the number alone, and hands nothing over", async () => {
    vi.stubGlobal("fetch", etsyFetch(receipt({}, [{ sku: "ethos-popup-card" }, { sku: "ethos-bouquet", tx: 9001 }, { sku: "ethos-popup-card", tx: 9002 }])));
    const res = await find(`#${RECEIPT}`);
    expect([res.status, await res.json()]).toEqual([200, { templates: ["popup-card", "bouquet"] }]);
    expect(fake.rows("purchases")).toEqual([]);
    expect(fake.rows("template_unlocks")).toEqual([]);
  });

  it("says why an order can't be used, as the claim does", async () => {
    const cases: [unknown, number, Record<string, unknown>][] = [
      [receipt({ status: "payment processing" }), 402, { error: "not_paid" }],
      [receipt({ status: "fully refunded" }), 410, { error: "refunded" }],
      [receipt({}, [{ sku: "a-mug" }]), 404, { error: "order_not_found" }],
      [404, 404, { error: "order_not_found" }],
      [503, 502, { error: "etsy_unavailable" }],
    ];
    for (const [answer, status, body] of cases) {
      vi.stubGlobal("fetch", etsyFetch(answer));
      const res = await find(String(RECEIPT));
      expect([res.status, await res.json()]).toEqual([status, body]);
    }
    expect(orderTemplates(receipt({ refunds: [{}] }))).toEqual({ ok: false, error: "refunded" });
  });

  it("checks the number before asking Etsy, and slows down guessing", async () => {
    const fetch = etsyFetch(receipt());
    vi.stubGlobal("fetch", fetch);
    expect((await find("not a number")).status).toBe(400);
    state.allowed = false;
    expect([(await find(String(RECEIPT))).status]).toEqual([429]);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("POST /api/etsy/claim", () => {
  const post = (body: unknown) => claimRoute.POST(new NextRequest("https://ethos.test/api/etsy/claim", { method: "POST", body: JSON.stringify(body) }));
  const order = { order: String(RECEIPT), slug: "popup-card", returnTo: "/create/popup-card?resume=publish", locale: "en" };

  it("a guest: makes the account from the email, unlocks the template and signs this browser in", async () => {
    vi.stubGlobal("fetch", etsyFetch(receipt()));
    const res = await post({ ...order, email: "New@Buyer.co" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, signInUrl: "/auth/confirm?token_hash=hash-1&type=magiclink&next=%2Fcreate%2Fpopup-card%3Fresume%3Dpublish" });
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "new@buyer.co", app_metadata: { checkout_session: `etsy:${RECEIPT}/9000/0` } }));
    expect(fake.rows("template_unlocks")).toEqual([expect.objectContaining({ template_slug: "popup-card" })]);
    expect(mail.notifyWelcome).toHaveBeenCalledWith("new@buyer.co", "en");
  });

  it("a guest with an existing account: the template goes there, and they sign in as usual", async () => {
    vi.stubGlobal("fetch", etsyFetch(receipt()));
    const res = await post({ ...order, email: "u1@x.co" });
    expect(await res.json()).toEqual({ ok: true, signIn: true });
    expect(generateLink).not.toHaveBeenCalled();
    expect(fake.rows("template_unlocks")).toEqual([expect.objectContaining({ user_id: U1, template_slug: "popup-card" })]);
  });

  it("signed in: straight onto their account", async () => {
    state.user = { id: U1 };
    vi.stubGlobal("fetch", etsyFetch(receipt()));
    expect(await (await post(order)).json()).toEqual({ ok: true });
    expect(fake.rows("purchases")[0]).toMatchObject({ user_id: U1, store: "etsy" });
  });

  it("refuses what Etsy doesn't call paid, someone else's order use, and another template", async () => {
    state.user = { id: U1 };
    const cases: [unknown, number, Record<string, unknown>][] = [
      [receipt({ status: "payment processing" }), 402, { error: "not_paid" }],
      [receipt({ status: "fully refunded" }), 410, { error: "refunded" }],
      [receipt({}, [{ sku: "ethos-bouquet" }]), 409, { error: "other_template", templates: ["bouquet"] }],
      [404, 404, { error: "order_not_found" }],
      [503, 502, { error: "etsy_unavailable" }],
    ];
    for (const [answer, status, body] of cases) {
      vi.stubGlobal("fetch", etsyFetch(answer));
      const res = await post(order);
      expect([res.status, await res.json()]).toEqual([status, body]);
    }
    expect(fake.rows("purchases")).toEqual([]);

    vi.stubGlobal("fetch", etsyFetch(receipt()));
    expect((await post(order)).status).toBe(200);
    state.user = { id: U2 };
    const again = await post(order);
    expect([again.status, await again.json()]).toEqual([409, { error: "order_used" }]);
  });

  it("checks its input before asking Etsy, and is closed until Etsy is set up", async () => {
    const fetch = etsyFetch(receipt());
    vi.stubGlobal("fetch", fetch);
    expect((await post({ ...order, order: "not a number" })).status).toBe(400);
    expect((await post({ ...order, slug: "nope" })).status).toBe(400);
    expect(await (await post(order)).json()).toEqual({ error: "email_required" });
    state.allowed = false;
    expect((await post({ ...order, email: "a@b.co" })).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv("ETSY_SHARED_SECRET", "");
    expect((await post({ ...order, email: "a@b.co" })).status).toBe(503);
  });
});

describe("connecting the shop", () => {
  /** Etsy's token endpoint and "which shop does this user own". */
  function signIn(ownedShop: number) {
    return vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/v3/application/openapi-ping")) return new Response(JSON.stringify({ application_id: 1 }), { status: 200 });
      if (u.endsWith("/v3/public/oauth/token")) return new Response(JSON.stringify({ access_token: "4321.fresh", refresh_token: "refresh-fresh", expires_in: 3600 }), { status: 200 });
      if (u.endsWith("/v3/application/users/4321/shops")) return ownedShop === 0 ? new Response(JSON.stringify({ error: "Invalid API credentials." }), { status: 403 }) : new Response(JSON.stringify({ shop_id: ownedShop, user_id: 4321 }), { status: 200 });
      return new Response("{}", { status: 404 });
    });
  }
  async function connect() {
    vi.stubEnv("ETSY_CONNECT_SECRET", "connect-test");
    vi.stubGlobal("fetch", signIn(SHOP));
    const res = await connectRoute.GET(new NextRequest("https://ethos.test/api/etsy/connect?key=connect-test"));
    const to = new URL(res.headers.get("location")!);
    const cookie = res.cookies.get("etsy_oauth")!.value;
    return { to, cookie, state: to.searchParams.get("state")! };
  }
  const back = (state: string, cookie: string) =>
    callbackRoute.GET(new NextRequest(`https://ethos.test/api/etsy/callback?code=abc&state=${state}`, { headers: { cookie: `etsy_oauth=${cookie}` } }));

  it("only with the connect secret, and asks Etsy for order reading alone, with PKCE", async () => {
    vi.stubEnv("ETSY_CONNECT_SECRET", "connect-test");
    vi.stubGlobal("fetch", signIn(SHOP));
    expect((await connectRoute.GET(new NextRequest("https://ethos.test/api/etsy/connect?key=wrong"))).status).toBe(401);
    const { to, cookie, state } = await connect();
    expect(to.origin + to.pathname).toBe("https://www.etsy.com/oauth/connect");
    expect(Object.fromEntries(to.searchParams)).toMatchObject({ client_id: "kstest", scope: "transactions_r", code_challenge_method: "S256", state });
    expect(cookie.startsWith(`${state}.`)).toBe(true);
  });

  it("keeps the sign-in with the shop it owns, and refuses a mismatched state or another shop", async () => {
    openDb({ etsy_connection: [] });
    const { cookie, state } = await connect();
    vi.stubGlobal("fetch", signIn(SHOP));
    expect((await back("forged-state-value-0000000000000", cookie)).status).toBe(400);
    expect(fake.rows("etsy_connection")).toEqual([]);

    const ok = await back(state, cookie);
    expect(ok.status).toBe(200);
    expect(fake.rows("etsy_connection")[0]).toMatchObject({ shop_id: SHOP, access_token: "4321.fresh", refresh_token: "refresh-fresh" });

    openDb({ etsy_connection: [] });
    const other = await connect();
    vi.stubGlobal("fetch", signIn(999));
    expect((await back(other.state, other.cookie)).status).toBe(403);
    expect(fake.rows("etsy_connection")).toEqual([]);
  });

  it("names Etsy's refusal instead of blaming the shop's owner", async () => {
    openDb({ etsy_connection: [] });
    const { cookie, state } = await connect();
    vi.stubGlobal("fetch", signIn(0));
    const res = await back(state, cookie);
    expect(res.status).toBe(502);
    expect(await res.text()).toContain("Etsy said: &quot;Invalid API credentials.&quot;");
    expect(fake.rows("etsy_connection")).toEqual([]);
  });

  it("checks the app's keys with Etsy before sending the owner there", async () => {
    vi.stubEnv("ETSY_CONNECT_SECRET", "connect-test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Invalid API credentials." }), { status: 403 })));
    const res = await connectRoute.GET(new NextRequest("https://ethos.test/api/etsy/connect?key=connect-test"));
    expect(res.status).toBe(502);
    expect(res.headers.get("location")).toBeNull();
    expect(await res.json()).toMatchObject({ error: "keys_refused", etsy: "Invalid API credentials." });
  });
});

describe("the health check", () => {
  /** Etsy for a connected shop: the shop and its orders, or a status for the orders call. */
  function etsyUp(orders: number | { count: number } = { count: 3 }) {
    return vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith("/v3/application/openapi-ping")) return new Response(JSON.stringify({ application_id: 1 }), { status: 200 });
      if (u.endsWith(`/v3/application/shops/${SHOP}`)) return new Response(JSON.stringify({ shop_name: "TryEthos", listing_active_count: 8 }), { status: 200 });
      if (u.includes(`/v3/application/shops/${SHOP}/receipts`)) return typeof orders === "number" ? new Response("{}", { status: orders }) : new Response(JSON.stringify(orders), { status: 200 });
      return new Response("{}", { status: 404 });
    });
  }

  it("is all green when the shop is connected and its sign-in may read orders", async () => {
    const health = await etsyHealth(fake.db as never, CONFIG, { cronSecret: true }, NOW, etsyUp() as never);
    expect(health.ok).toBe(true);
    expect(health.checks).toMatchObject({ keys: { ok: true }, database: { ok: true }, connected: { ok: true }, signIn: { ok: true }, shop: { ok: true, detail: "TryEthos, 8 active listings" }, readOrders: { ok: true, detail: "3 orders" } });
  });

  it("says which link is broken", async () => {
    expect((await etsyHealth(fake.db as never, CONFIG, { cronSecret: true }, NOW, etsyUp(403) as never)).checks.readOrders.ok).toBe(false);
    expect((await etsyHealth(fake.db as never, CONFIG, { cronSecret: false }, NOW, etsyUp() as never)).checks.cronSecret.ok).toBe(false);
    openDb({ etsy_connection: [] });
    const fetch = etsyUp();
    const notConnected = await etsyHealth(fake.db as never, CONFIG, { cronSecret: true }, NOW, fetch as never);
    expect(notConnected).toMatchObject({ ok: false, checks: { keys: { ok: true }, connected: { ok: false } } });
    expect(fetch.mock.calls.map(([u]) => String(u))).toEqual(["https://openapi.etsy.com/v3/application/openapi-ping"]);
    const refused = vi.fn(async () => new Response(JSON.stringify({ error: "Shared secret is required in x-api-key header." }), { status: 403 }));
    expect((await etsyHealth(fake.db as never, CONFIG, { cronSecret: true }, NOW, refused as never)).checks.keys).toEqual({ ok: false, detail: "Shared secret is required in x-api-key header." });
  });

  it("answers only with the connect secret, and names missing settings without it", async () => {
    vi.stubEnv("ETSY_CONNECT_SECRET", "connect-test");
    expect((await statusRoute.GET(new NextRequest("https://ethos.test/api/etsy/status?key=wrong"))).status).toBe(401);
    vi.stubEnv("ETSY_CONNECT_SECRET", "");
    const res = await statusRoute.GET(new NextRequest("https://ethos.test/api/etsy/status"));
    expect([res.status, await res.json()]).toEqual([503, { ok: false, missing: ["ETSY_CONNECT_SECRET"] }]);
  });
});

describe("the daily refund check", () => {
  it("takes the template back when Etsy cancels or fully refunds the order, and only flags a partial refund", async () => {
    await claimEtsyItem(fake.db as never, { userId: U1, slug: "popup-card", units: [{ key: claimKey(RECEIPT, 9000, 0), listingId: 777, amount: 1199, currency: "eur" }] });
    await claimEtsyItem(fake.db as never, { userId: U2, slug: "bouquet", units: [{ key: claimKey(222, 1, 0), listingId: 778, amount: 1199, currency: "eur" }] });
    const answers: Record<number, unknown> = { [RECEIPT]: receipt({ status: "fully refunded" }), 222: { ...receipt({ status: "partially refunded" }), receipt_id: 222 } };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await reconcileEtsyRefunds(fake.db as never, async (id) => answers[id] as never, NOW);
    expect(result).toEqual({ checked: 2, revoked: 1, flagged: 1, failed: 0 });
    expect(fake.rows("purchases").map((p) => [p.user_id, p.status])).toEqual([[U1, "refunded"], [U2, "paid"]]);
    expect(fake.rows("template_unlocks").map((u) => u.template_slug)).toEqual(["bouquet"]);
    errors.mockRestore();
  });

  it("an order Etsy can't be asked about today is asked again tomorrow", async () => {
    await claimEtsyItem(fake.db as never, { userId: U1, slug: "popup-card", units: [{ key: claimKey(RECEIPT, 9000, 0), listingId: 777, amount: 1199, currency: "eur" }] });
    const result = await reconcileEtsyRefunds(fake.db as never, async () => { throw new EtsyError("unavailable"); }, NOW);
    expect(result).toEqual({ checked: 0, revoked: 0, flagged: 0, failed: 1 });
    expect(fake.rows("purchases")[0]).toMatchObject({ status: "paid" });
  });

  it("runs only for Vercel's cron, and keeps the shop signed in", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    vi.stubGlobal("fetch", etsyFetch(receipt()));
    const res = await cronRoute.GET(new NextRequest("https://ethos.test/api/cron/etsy"));
    expect(res.status).toBe(401);
    const ok = await cronRoute.GET(new NextRequest("https://ethos.test/api/cron/etsy", { headers: { authorization: "Bearer cron-test" } }));
    expect(await ok.json()).toEqual({ checked: 0, revoked: 0, flagged: 0, failed: 0, connection: "ok" });
    expect(fake.rows("etsy_connection")[0]).toMatchObject({ refresh_token: "refresh-new" });
  });

  it("says when the shop's sign-in is gone, and still checks refunds it can", async () => {
    vi.stubEnv("CRON_SECRET", "cron-test");
    openDb({ etsy_connection: [] });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = await cronRoute.GET(new NextRequest("https://ethos.test/api/cron/etsy", { headers: { authorization: "Bearer cron-test" } }));
    expect(await ok.json()).toMatchObject({ connection: "not_connected" });
    expect(errors).toHaveBeenCalledWith("[etsy] the shop's Etsy sign-in failed", "not_connected");
    errors.mockRestore();
  });
});
