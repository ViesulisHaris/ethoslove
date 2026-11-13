import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { channelOf, clickPlatform, landingPath, OTHER_LANDING, referrerHost, sourceOf, utmValue, visitSource, type Classifiable } from "@/lib/attribution/source";
import { checkoutSourceInput, checkoutSourceRow } from "@/lib/attribution/checkout-source";
import { NOT_RECORDED, summarize, type PaidSale, type SourceRecord } from "@/lib/attribution/report";
import { FakeDb } from "./helpers/fake-db";
import { FakeStripe } from "./helpers/fake-stripe";

/**
 * Where a buyer first came from, recorded with their checkout (lib/attribution, migration 0019):
 * what the browser takes down, what it may keep (only with a yes to cookies, privacy policy section
 * 12), what the server stores (checked again, never sent to Stripe, never in a checkout's way), and
 * the report the SEO routine reads (GET /api/internal/sales).
 */

const state = vi.hoisted(() => ({ db: null as unknown, stripe: null as unknown, user: null as { id: string; email?: string } | null, tasks: [] as (() => unknown)[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: () => state.stripe, stripeProductIds: () => ({}) }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
// after() needs a request scope that a test doesn't have: its work runs when the test says.
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: (task: () => unknown) => void state.tasks.push(task) }));

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-14T12:00:00.000Z");
const U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("what a first page may say about itself", () => {
  it("keeps a public page's path, in lower case, without its query, hash or trailing slash", () => {
    expect(landingPath("/")).toBe("/");
    expect(landingPath("/es")).toBe("/es");
    expect(landingPath("/es/")).toBe("/es");
    expect(landingPath("/Blog/Valentine-Ideas/")).toBe("/blog/valentine-ideas");
    expect(landingPath("/es/templates/the-letter")).toBe("/es/templates/the-letter");
    // English has no prefix on the site: a stray /en is the same page.
    expect(landingPath("/en/templates/bouquet")).toBe("/templates/bouquet");
    expect(landingPath("/en")).toBe("/");
  });

  it("names a private page by its section alone: never a gift's id, a trip, a plan or an account page", () => {
    expect(landingPath("/g/k7m2p9xq4")).toBe("/g");
    expect(landingPath("/es/g/k7m2p9xq4/keep")).toBe("/es/g");
    expect(landingPath("/trips/0b6e3c1a-2f4d-4e8b-9a7c-5d1e2f3a4b5c")).toBe("/trips");
    expect(landingPath("/dashboard/gift/0b6e3c1a-2f4d-4e8b-9a7c-5d1e2f3a4b5c/print")).toBe("/dashboard");
    expect(landingPath("/for-two/join")).toBe("/for-two");
    expect(landingPath("/checkout/success")).toBe("/checkout");
    expect(landingPath("/hug")).toBe("/hug");
    for (const path of ["/redeem", "/plan", "/login", "/signup", "/account", "/my-dates"]) expect(landingPath(path)).toBe(path);
  });

  it("keeps nothing that isn't plain slugs", () => {
    expect(landingPath("/someone@example.com")).toBe(OTHER_LANDING);
    expect(landingPath("/a%40b.co")).toBe(OTHER_LANDING);
    expect(landingPath("//evil.example/x")).toBe(OTHER_LANDING);
    expect(landingPath(`/blog/${"a".repeat(130)}`)).toBe(OTHER_LANDING);
    expect(landingPath("/a/b/c/d/e/f")).toBe(OTHER_LANDING);
    expect(landingPath("blog")).toBe(OTHER_LANDING);
  });

  it("takes only the referring site's host name, or an Android app's id", () => {
    expect(referrerHost("https://www.google.com/")).toBe("google.com");
    expect(referrerHost("https://l.instagram.com/?u=https%3A%2F%2Ftryethos.io&e=AT0")).toBe("l.instagram.com");
    expect(referrerHost("android-app://com.zhiliaoapp.musically/")).toBe("com.zhiliaoapp.musically");
    expect(referrerHost("https://user:secret@evil.example/path?email=a@b.co")).toBe("evil.example");
    // A gift page is our own: its id is in the path, which is never read.
    expect(referrerHost("https://tryethos.io/g/k7m2p9xq4")).toBe("tryethos.io");
    for (const bad of ["", null, undefined, "not a url", "javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd"]) expect(referrerHost(bad)).toBeUndefined();
  });

  it("keeps a utm tag in lower case and refuses one that could be a person or an id", () => {
    expect(utmValue("TikTok")).toBe("tiktok");
    expect(utmValue(" Black Friday ")).toBe("black-friday");
    expect(utmValue("spring_2026.v2")).toBe("spring_2026.v2");
    for (const bad of ["someone@example.com", "+37120000000", "0b6e3c1a-2f4d-4e8b-9a7c-5d1e2f3a4b5c", "x".repeat(61), "<script>", "", null]) expect(utmValue(bad)).toBeUndefined();
  });

  it("says which platform a click id came from, and never keeps the id", () => {
    expect(clickPlatform(new URLSearchParams("fbclid=IwAR0abc"))).toBe("meta");
    expect(clickPlatform(new URLSearchParams("ttclid=E.C.P.xyz"))).toBe("tiktok");
    expect(clickPlatform(new URLSearchParams("gclid=Cj0K"))).toBe("google");
    expect(clickPlatform(new URLSearchParams("epik=dj0y"))).toBe("pinterest");
    expect(clickPlatform(new URLSearchParams("ref=tt-couple"))).toBeUndefined();
    const visit = visitSource({ pathname: "/templates/bouquet", search: "?utm_source=Pinterest&utm_medium=social&utm_campaign=Gift-Ideas&fbclid=IwAR0secretclick" }, "https://www.pinterest.com/pin/123", NOW);
    expect(visit).toEqual({ landing: "/templates/bouquet", referrer: "pinterest.com", utmSource: "pinterest", utmMedium: "social", utmCampaign: "gift-ideas", click: "meta", at: NOW });
    expect(JSON.stringify(visit)).not.toContain("IwAR0secretclick");
  });
});

describe("the channel and source a checkout is counted to", () => {
  const cases: [Classifiable, string, string][] = [
    // A search for the name lands on the home page: TikTok viewers find us that way.
    [{ landing: "/", referrer: "google.com" }, "tiktok_brand", "google"],
    [{ landing: "/es", referrer: "google.es" }, "tiktok_brand", "google"],
    [{ landing: "/blog/love-letter-ideas", referrer: "google.com" }, "search", "google"],
    [{ landing: "/templates/bouquet", referrer: "com.google.android.googlequicksearchbox" }, "search", "google"],
    [{ landing: "/gifts", referrer: "bing.com" }, "search", "bing"],
    [{ landing: "/gifts", referrer: "duckduckgo.com" }, "search", "duckduckgo"],
    // A search ad isn't what SEO earns.
    [{ landing: "/gifts", referrer: "google.com", click: "google" }, "other", "google"],
    [{ landing: "/gifts", referrer: "google.com", utmMedium: "cpc", utmSource: "google" }, "other", "google"],
    [{ landing: "/", referrer: "tiktok.com" }, "tiktok_brand", "tiktok"],
    [{ landing: "/", referrer: "com.zhiliaoapp.musically" }, "tiktok_brand", "tiktok"],
    [{ landing: "/", ref: "tt-couple" }, "tiktok_brand", "tiktok-link"],
    [{ landing: "/", utmSource: "tiktok" }, "tiktok_brand", "tiktok"],
    [{ landing: "/try/bouquet", click: "tiktok" }, "tiktok_brand", "tiktok"],
    [{ landing: "/" }, "direct", "(direct)"],
    [{ landing: "/templates/bouquet" }, "direct", "(direct)"],
    // A reload, or back from Stripe's page: where the visit began was lost.
    [{ landing: "/create/bouquet", referrer: "tryethos.io" }, "direct", "(direct)"],
    [{ landing: "/create/bouquet", referrer: "checkout.stripe.com" }, "direct", "(direct)"],
    [{ landing: "/gifts", referrer: "chatgpt.com" }, "other", "chatgpt"],
    [{ landing: "/gifts", referrer: "gemini.google.com" }, "other", "gemini"],
    [{ landing: "/", referrer: "mail.google.com" }, "other", "gmail"],
    [{ landing: "/", referrer: "l.instagram.com", click: "meta" }, "other", "instagram"],
    [{ landing: "/try/bouquet", ref: "ad-meta-bq", click: "meta" }, "other", "ad"],
    [{ landing: "/", ref: "c-maya" }, "other", "creator"],
    [{ landing: "/g", ref: "watermark" }, "other", "watermark"],
    [{ landing: "/templates/xoxo", utmSource: "pinterest", referrer: "pinterest.com" }, "other", "pinterest"],
    [{ landing: "/", referrer: "some-blog.example" }, "other", "some-blog.example"],
  ];

  it.each(cases)("%o is %s from %s", (visit, channel, source) => {
    expect(channelOf(visit)).toBe(channel);
    expect(sourceOf(visit)).toBe(source);
  });
});

describe("the row the server stores", () => {
  const parse = (value: unknown) => checkoutSourceInput.parse(value);

  it("stores nothing when the browser sent nothing", () => {
    expect(checkoutSourceRow("p1", parse(undefined), undefined, NOW)).toBeNull();
    expect(checkoutSourceRow("p1", parse("nonsense"), undefined, NOW)).toBeNull();
  });

  it("checks every field again: a private path cut back, a referrer with a path, an email or a stale clock dropped", () => {
    const row = checkoutSourceRow(
      "p1",
      parse({
        landing: "/g/k7m2p9xq4",
        referrer: "google.com/search?q=someone@example.com",
        utmSource: "someone@example.com",
        utmMedium: "Email",
        utmCampaign: 42,
        click: "myspace",
        at: NOW - 40 * DAY,
        remembered: "yes",
      }),
      undefined,
      NOW,
    );
    expect(row).toEqual({
      purchase_id: "p1",
      landing: "/g",
      referrer: null,
      utm_source: null,
      utm_medium: "email",
      utm_campaign: null,
      click: null,
      ref: null,
      channel: "other",
      source: "(direct)",
      remembered: false,
      first_seen_at: null,
    });
  });

  it("classifies with the checkout's own ref, and keeps the time the first page was seen", () => {
    const row = checkoutSourceRow("p2", parse({ landing: "/", referrer: "google.com", at: NOW - 3 * DAY, remembered: true }), "tt-couple", NOW);
    expect(row).toMatchObject({ landing: "/", referrer: "google.com", ref: "tt-couple", channel: "tiktok_brand", source: "tiktok-link", remembered: true, first_seen_at: new Date(NOW - 3 * DAY).toISOString() });
  });
});

describe("the first visit in the browser", () => {
  function storage() {
    const items = new Map<string, string>();
    return {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, String(value)),
      removeItem: (key: string) => void items.delete(key),
      clear: () => items.clear(),
      items,
    };
  }
  let store: ReturnType<typeof storage>;

  /** A fresh page load: nothing in memory, the same browser storage. */
  async function visit() {
    vi.resetModules();
    const consent = await import("@/lib/analytics/consent");
    const firstVisit = await import("@/lib/attribution/first-visit");
    return { ...consent, ...firstVisit };
  }
  const blogFromGoogle = { pathname: "/blog/love-letter-ideas", search: "?utm_source=newsletter" };
  const homeTyped = { pathname: "/", search: "" };

  beforeEach(() => {
    store = storage();
    vi.stubGlobal("window", { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} });
    vi.stubGlobal("localStorage", store);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps nothing on the device without a yes: the tab remembers its first page until it reloads", async () => {
    const first = await visit();
    first.rememberVisit(blogFromGoogle, "https://www.google.com/", NOW);
    first.rememberVisit(homeTyped, "", NOW + 60_000);
    expect(first.currentSource(NOW + 120_000)).toEqual({ landing: "/blog/love-letter-ideas", referrer: "google.com", utmSource: "newsletter", at: NOW, remembered: false });
    expect(store.items.size).toBe(0);
    expect((await visit()).currentSource(NOW + DAY)).toBeUndefined();
  });

  it("with a yes, keeps the first visit for 30 days, so a buyer who comes back is counted to it", async () => {
    store.setItem("ethos-consent", "granted");
    const first = await visit();
    first.rememberVisit(blogFromGoogle, "https://www.google.com/", NOW);
    expect(JSON.parse(store.getItem("ethos-first-visit")!)).toMatchObject({ landing: "/blog/love-letter-ideas", referrer: "google.com" });

    const later = await visit();
    later.rememberVisit(homeTyped, "", NOW + 5 * DAY);
    expect(later.currentSource(NOW + 5 * DAY)).toMatchObject({ landing: "/blog/love-letter-ideas", referrer: "google.com", at: NOW, remembered: true });

    const muchLater = await visit();
    muchLater.rememberVisit(homeTyped, "", NOW + 31 * DAY);
    expect(muchLater.currentSource(NOW + 31 * DAY)).toEqual({ landing: "/", at: NOW + 31 * DAY, remembered: true });
  });

  it("keeps it from the moment of a later yes, and removes it on a no", async () => {
    const first = await visit();
    first.rememberVisit(blogFromGoogle, "https://www.google.com/", NOW);
    first.setConsent("granted");
    first.keepFirstVisit(NOW + 60_000);
    expect(JSON.parse(store.getItem("ethos-first-visit")!)).toMatchObject({ landing: "/blog/love-letter-ideas", at: NOW });
    first.setConsent("denied");
    first.keepFirstVisit(NOW + 120_000);
    expect(store.getItem("ethos-first-visit")).toBeNull();
    expect(first.currentSource(NOW + 120_000)).toMatchObject({ landing: "/blog/love-letter-ideas", remembered: false });
  });

  it("checks what it reads back: a tampered entry can't smuggle in a gift's id, a path or an email", async () => {
    store.setItem("ethos-consent", "granted");
    store.setItem(
      "ethos-first-visit",
      JSON.stringify({ landing: "/g/k7m2p9xq4", referrer: "evil.example/path?x=1", utmSource: "someone@example.com", utmCampaign: "Spring", click: "fbclid=IwAR0", at: NOW - DAY }),
    );
    const later = await visit();
    expect(later.currentSource(NOW)).toEqual({ landing: "/g", utmCampaign: "spring", at: NOW - DAY, remembered: true });
    store.setItem("ethos-first-visit", "{not json");
    expect((await visit()).currentSource(NOW)).toBeUndefined();
  });
});

describe("POST /api/stripe/checkout records where the buyer came from", () => {
  let fake: FakeDb;
  let stripe: FakeStripe;
  const post = async (body: unknown) => {
    const { POST } = await import("@/app/api/stripe/checkout/route");
    const res = await POST(new NextRequest("https://ethos.test/api/stripe/checkout", { method: "POST", body: JSON.stringify(body) }));
    await Promise.all(state.tasks.splice(0).map((task) => task()));
    return res;
  };
  const sent = () => stripe.calls.filter((c) => c.method === "checkout.sessions.create").map((c) => c.args[0] as { metadata: Record<string, string> });
  const single = { product: "single", templateSlugs: ["bouquet"], currency: "usd", locale: "en", returnTo: "/create/bouquet" };
  const source = { landing: "/blog/love-letter-ideas", referrer: "google.com", utmSource: "newsletter", at: NOW - 2 * DAY, remembered: true };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    stripe = new FakeStripe(() => NOW);
    state.stripe = stripe.client;
    state.user = null;
    state.tasks = [];
    fake = new FakeDb({ profiles: [{ id: U1, email: "u1@x.co", name: "Alex", locale: "en" }] }, NOW);
    state.db = fake.db;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stores it under the purchase id once checkout has answered, and never tells Stripe", async () => {
    const res = await post({ ...single, ref: "tt-couple", source });
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/c/cs_test_1" });
    const [params] = sent();
    expect(fake.rows("checkout_sources")).toEqual([
      expect.objectContaining({ purchase_id: params.metadata.purchase_id, landing: "/blog/love-letter-ideas", referrer: "google.com", utm_source: "newsletter", ref: "tt-couple", channel: "tiktok_brand", source: "tiktok-link", remembered: true }),
    ]);
    expect(JSON.stringify(params)).not.toMatch(/love-letter-ideas|google\.com|newsletter/);
  });

  it("uses the signed-in buyer's purchase row id, the one fulfilment marks paid", async () => {
    state.user = { id: U1, email: "u1@x.co" };
    await post({ ...single, source });
    const [purchase] = fake.rows("purchases");
    expect(fake.rows("checkout_sources")).toEqual([expect.objectContaining({ purchase_id: purchase.id, channel: "search", source: "newsletter" })]);
  });

  it("does the one-tap buttons' checkout the same way", async () => {
    const res = await post({ ...single, source, oneTap: true, waiver: true });
    expect(await res.json()).toEqual({ clientSecret: "cs_test_1_secret_test" });
    expect(fake.rows("checkout_sources")).toHaveLength(1);
  });

  it("checks out exactly as before without the table (before migration 0019), and says so", async () => {
    fake = new FakeDb({}, NOW, { missingColumns: { checkout_sources: ["purchase_id", "landing", "referrer", "channel", "source"] } });
    state.db = fake.db;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ ...single, source });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/c/cs_test_1" });
    expect(fake.rows("checkout_sources")).toEqual([]);
    expect(errors).toHaveBeenCalledWith(expect.stringContaining("[attribution] checkout source not saved"), expect.anything(), expect.anything());
  });

  it("stores nothing for a page that sent nothing, or when checkout fails", async () => {
    await post(single);
    expect(fake.rows("checkout_sources")).toEqual([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    stripe.failing.add("checkout.sessions.create");
    const res = await post({ ...single, source });
    expect(res.status).toBe(502);
    expect(fake.rows("checkout_sources")).toEqual([]);
  });
});

describe("the sales report", () => {
  const at = (days: number) => new Date(NOW - days * DAY).toISOString();
  const sale = (id: string, days: number, amount = 1199, currency = "usd", store: string | null = "stripe"): PaidSale => ({ id, amount, currency, created_at: at(days), store });
  const record = (purchase_id: string, days: number, landing: string, channel: string, source: string): SourceRecord => ({ purchase_id, created_at: at(days), landing, channel, source });

  it("splits sales by channel, landing page and source for the last 7 and 28 days, with the checkouts each started", () => {
    const sales = [sale("a", 1), sale("b", 2, 999, "eur"), sale("c", 10, 899, "gbp"), sale("d", 3), sale("etsy", 1, 740, "usd", "etsy")];
    const sources = [
      record("a", 1, "/blog/love-letter-ideas", "search", "google"),
      record("b", 2, "/", "tiktok_brand", "google"),
      record("c", 10, "/blog/love-letter-ideas", "search", "google"),
      record("unpaid", 2, "/blog/love-letter-ideas", "search", "google"),
    ];
    const report = summarize(sales, sources, NOW);
    const [week, month] = report.windows;
    expect(week).toMatchObject({ days: 7, orders: 3, recorded: 2, checkouts: 3, revenue: { usd: 23.98, eur: 9.99 } });
    // Fixed rates rank them: $11.99 × 0.86 + €9.99 + $11.99 × 0.86.
    expect(week.revenueEur).toBe(30.61);
    expect(week.byChannel).toEqual([
      { channel: "search", orders: 1, revenueEur: 10.31, checkouts: 2 },
      { channel: NOT_RECORDED, orders: 1, revenueEur: 10.31, checkouts: 0 },
      { channel: "tiktok_brand", orders: 1, revenueEur: 9.99, checkouts: 1 },
    ]);
    expect(week.byLanding[0]).toEqual({ landing: "/blog/love-letter-ideas", channels: { search: 1 }, orders: 1, revenueEur: 10.31, checkouts: 2 });
    expect(month).toMatchObject({ days: 28, orders: 4, recorded: 3, checkouts: 4 });
    expect(month.byLanding[0]).toMatchObject({ landing: "/blog/love-letter-ideas", orders: 2, channels: { search: 2 } });
    expect(month.bySource[0]).toMatchObject({ source: "google", orders: 3 });
    expect(report.recordedSince).toBe(at(10));
    expect(JSON.stringify(report)).not.toMatch(/"(a|b|c|d|unpaid)"/);
  });
});

describe("GET /api/internal/sales", () => {
  const get = async (authorization?: string) => {
    const { GET } = await import("@/app/api/internal/sales/route");
    return GET(new NextRequest("https://ethos.test/api/internal/sales", { headers: authorization ? { authorization } : {} }));
  };

  beforeEach(() => {
    vi.stubEnv("GSC_EXPORT_KEY", "k3y");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("answers only the routines' key, and fails closed without one", async () => {
    state.db = new FakeDb({}, NOW).db;
    expect((await get()).status).toBe(401);
    expect((await get("Bearer nope")).status).toBe(401);
    vi.stubEnv("GSC_EXPORT_KEY", "");
    expect((await get("Bearer ")).status).toBe(401);
  });

  it("reads paid sales and their records, a page at a time", async () => {
    const purchases = Array.from({ length: 1003 }, (_, i) => ({ id: `p${i}`, user_id: U1, product: "single", amount: 999, currency: "eur", status: i === 0 ? "refunded" : "paid", store: "stripe", created_at: new Date(NOW - DAY).toISOString() }));
    const sources = [{ purchase_id: "p1", created_at: new Date(NOW - DAY).toISOString(), landing: "/gifts", channel: "search", source: "google", remembered: false }];
    state.db = new FakeDb({ purchases, checkout_sources: sources }, NOW).db;
    const res = await get("Bearer k3y");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.windows[0]).toMatchObject({ days: 7, orders: 1002, recorded: 1, checkouts: 1 });
    expect(body.windows[0].byLanding).toContainEqual(expect.objectContaining({ landing: "/gifts", orders: 1 }));
  });

  it("says it isn't ready while the table is missing", async () => {
    state.db = new FakeDb({}, NOW, { missingColumns: { checkout_sources: ["purchase_id", "created_at", "landing", "channel", "source"] } }).db;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await get("Bearer k3y");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_ready" });
  });
});
