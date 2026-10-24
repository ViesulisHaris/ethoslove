import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routing } from "@/i18n/routing";

/**
 * The Meta and TikTok pixels report to two ad platforms, so what keeps them off a gift, off a page
 * whose address opens something, and off every visitor who didn't say yes is worth pinning down. The
 * ids here are made up; nothing in this file can reach either platform.
 */

const META_ID = "000000000000001";
const TIKTOK_ID = "CTESTPIXEL0000000000";

function storage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
  };
}

type FakeWindow = {
  location: { pathname: string; hostname: string; search: string; hash: string };
  fbq?: ReturnType<typeof vi.fn>;
  ttq?: { page: ReturnType<typeof vi.fn>; track: ReturnType<typeof vi.fn> };
  dispatchEvent: () => boolean;
  addEventListener: () => void;
  removeEventListener: () => void;
};

let win: FakeWindow;

function browser(pathname = "/") {
  win = { location: { pathname, hostname: "tryethos.io", search: "", hash: "" }, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
}

/** The modules as a page with these ids configured would load them (the ids are read at import). */
async function load(ids: { meta?: string; tiktok?: string } = { meta: META_ID, tiktok: TIKTOK_ID }) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", ids.meta ?? "");
  vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", ids.tiktok ?? "");
  const ads = await import("@/lib/analytics/ads");
  const consent = await import("@/lib/analytics/consent");
  const clicks = await import("@/lib/attribution/click-ids");
  return { ...ads, ...consent, ...clicks };
}

beforeEach(() => browser());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("where the ad pixels may run", () => {
  const both = { meta: META_ID, tiktok: TIKTOK_ID };

  it("never on a gift, checkout, the dashboard or the account, in any locale", async () => {
    const { pixelsMayRun } = await load();
    for (const p of ["/g/abc123", "/g", "/checkout/success", "/dashboard", "/dashboard/gift/79fe7c36", "/account", "/account/reminders"]) {
      expect(pixelsMayRun({ ids: both, consent: "granted", pathname: p, inApp: false }), p).toBe(false);
      for (const locale of routing.locales) expect(pixelsMayRun({ ids: both, consent: "granted", pathname: `/${locale}${p}`, inApp: false }), `/${locale}${p}`).toBe(false);
    }
  });

  it("never on a page whose address opens something, or on sign-in", async () => {
    const { pixelsMayRun, isAdTrackingOff } = await load();
    for (const p of ["/redeem", "/for-two/join", "/plan", "/trips/abc", "/my-dates", "/login", "/signup"]) {
      expect(isAdTrackingOff(p), p).toBe(true);
      expect(pixelsMayRun({ ids: both, consent: "granted", pathname: `/es${p}`, inApp: false }), `/es${p}`).toBe(false);
    }
  });

  it("never without a yes: not before the banner is answered, and not after a no", async () => {
    const { pixelsMayRun } = await load();
    for (const consent of [null, "denied"] as const) {
      expect(pixelsMayRun({ ids: both, consent, pathname: "/templates/halfway", inApp: false })).toBe(false);
    }
  });

  it("never inside the iPhone app, and never with no id configured", async () => {
    const { pixelsMayRun } = await load();
    expect(pixelsMayRun({ ids: both, consent: "granted", pathname: "/", inApp: true })).toBe(false);
    expect(pixelsMayRun({ ids: {}, consent: "granted", pathname: "/", inApp: false })).toBe(false);
  });

  it("runs on the public funnel once the visitor says yes, with either pixel alone", async () => {
    const { pixelsMayRun } = await load();
    for (const ids of [both, { meta: META_ID }, { tiktok: TIKTOK_ID }]) {
      for (const p of ["/", "/templates/halfway", "/create/halfway", "/es/create/halfway", "/pricing", "/demo/halfway"]) {
        expect(pixelsMayRun({ ids, consent: "granted", pathname: p, inApp: false }), p).toBe(true);
      }
    }
  });

  it("reads no id from an environment that has none", async () => {
    const { AD_PIXELS } = await load({});
    expect(AD_PIXELS).toEqual({ meta: undefined, tiktok: undefined });
  });
});

describe("what the pixels are sent", () => {
  async function live() {
    const mod = await load();
    win.fbq = vi.fn();
    win.ttq = { page: vi.fn(), track: vi.fn() };
    return mod;
  }

  it("sends nothing until the pixel component says the page is allowed", async () => {
    const { adTrack, reportPage, setAdsLive } = await live();
    adTrack({ name: "PageView" });
    reportPage("/");
    expect(win.fbq).not.toHaveBeenCalled();
    expect(win.ttq!.page).not.toHaveBeenCalled();
    setAdsLive(true);
    setAdsLive(false);
    adTrack({ name: "PageView" });
    expect(win.fbq).not.toHaveBeenCalled();
  });

  it("reports a page once per arrival, and a template view once, whichever comes first", async () => {
    const { noteTemplateView, reportPage, setAdsLive } = await live();
    setAdsLive(true);
    reportPage("/templates/halfway");
    reportPage("/templates/halfway");
    noteTemplateView("/templates/halfway", "halfway", "premium");
    noteTemplateView("/templates/halfway", "halfway", "premium");
    expect(win.fbq!.mock.calls).toEqual([
      ["track", "PageView"],
      ["track", "ViewContent", { content_ids: ["halfway"], content_type: "product", contents: [{ id: "halfway", quantity: 1 }], num_items: 1, content_category: "premium" }],
    ]);
    expect(win.ttq!.page).toHaveBeenCalledTimes(1);
    expect(win.ttq!.track.mock.calls).toEqual([["ViewContent", { contents: [{ content_id: "halfway", content_type: "product", content_category: "premium" }], content_type: "product" }]]);

    // The other order: the editor says which template first, the pixel reports the page after.
    noteTemplateView("/create/bouquet", "bouquet", "free");
    expect(win.fbq).toHaveBeenCalledTimes(2);
    reportPage("/create/bouquet");
    expect(win.fbq!.mock.calls.slice(2).map((c) => c[1])).toEqual(["PageView", "ViewContent"]);
    expect(win.fbq!.mock.calls[3][2]).toMatchObject({ content_ids: ["bouquet"], content_category: "free" });
  });

  it("names the price seen as a custom event, and carries the sale's id for deduplication", async () => {
    const { adTrack, setAdsLive } = await live();
    setAdsLive(true);
    adTrack({ name: "PaywallSeen", contents: [{ id: "halfway", category: "premium" }], value: 7.99, currency: "USD" });
    adTrack({ name: "Purchase", contents: [{ id: "halfway", category: "premium" }], value: 7.99, currency: "USD", eventId: "e1" });
    expect(win.fbq!.mock.calls[0].slice(0, 2)).toEqual(["trackCustom", "PaywallSeen"]);
    expect(win.fbq!.mock.calls[0][2]).toMatchObject({ value: 7.99, currency: "USD" });
    expect(win.fbq!.mock.calls[1][0]).toBe("track");
    expect(win.fbq!.mock.calls[1][3]).toEqual({ eventID: "e1" });
    expect(win.ttq!.track.mock.calls[1][0]).toBe("Purchase");
    expect(win.ttq!.track.mock.calls[1][2]).toEqual({ event_id: "e1" });
  });

  it("sends nothing while the address carries a private page or a shared plan, even with the page live", async () => {
    const { adTrack, setAdsLive } = await live();
    setAdsLive(true);
    win.location.pathname = "/create/halfway";
    win.location.hash = "#p=eyJzdG9wcyI6W119";
    adTrack({ name: "PageView" });
    win.location.hash = "";
    win.location.pathname = "/g/abc123";
    adTrack({ name: "PageView" });
    expect(win.fbq).not.toHaveBeenCalled();
    expect(win.ttq!.page).not.toHaveBeenCalled();
    // An anchor is not data.
    win.location.pathname = "/templates/halfway";
    win.location.hash = "#faq";
    adTrack({ name: "PageView" });
    expect(win.fbq).toHaveBeenCalledTimes(1);
  });

  it("never lets a pixel that throws break the page", async () => {
    const { adTrack, setAdsLive } = await live();
    win.fbq = vi.fn(() => {
      throw new Error("blocked");
    });
    setAdsLive(true);
    expect(() => adTrack({ name: "PageView" })).not.toThrow();
    expect(win.ttq!.page).toHaveBeenCalled();
  });
});

describe("the sales handed from the success page", () => {
  const purchase = { eventId: "e1", value: 11.99, currency: "EUR", contents: [{ id: "everything", category: "everything" }] };
  const upgrade = { eventId: "e2", value: 15, currency: "EUR", contents: [{ id: "upgrade", category: "upgrade" }] };

  it("are reported once each, however often the success page is opened again", async () => {
    const { holdPurchase, takeHeldPurchases } = await load();
    holdPurchase(purchase);
    holdPurchase(purchase);
    expect(takeHeldPurchases()).toEqual([{ name: "Purchase", ...purchase }]);
    expect(takeHeldPurchases()).toEqual([]);
    holdPurchase(purchase);
    expect(takeHeldPurchases()).toEqual([]);
  });

  it("keeps a second sale made before the first was reported (the upgrade on the success page)", async () => {
    const { holdPurchase, takeHeldPurchases } = await load();
    holdPurchase(purchase);
    holdPurchase(upgrade);
    expect(takeHeldPurchases().map((e) => (e.name === "PageView" ? null : e.eventId))).toEqual(["e1", "e2"]);
  });

  it("ignores something that isn't a sale", async () => {
    const { takeHeldPurchases } = await load();
    sessionStorage.setItem("ethos:ad-purchases", JSON.stringify([{ eventId: "e3", value: "a lot" }]));
    expect(takeHeldPurchases()).toEqual([]);
    sessionStorage.setItem("ethos:ad-purchases", "{not json");
    expect(takeHeldPurchases()).toEqual([]);
  });
});

describe("what a checkout tells our server", () => {
  it("nothing at all without a yes, so the webhook never reports the sale", async () => {
    const { adCheckoutFields, rememberClickIds } = await load();
    rememberClickIds("?fbclid=IwAR0abc&ttclid=E.C.P.xyz");
    expect(adCheckoutFields()).toBeUndefined();
    localStorage.setItem("ethos-consent", "denied");
    expect(adCheckoutFields()).toBeUndefined();
  });

  it("nothing when no pixel is configured, even with a yes", async () => {
    localStorage.setItem("ethos-consent", "granted");
    const { adCheckoutFields } = await load({});
    expect(adCheckoutFields()).toBeUndefined();
  });

  it("the clicks and browser ids, with a yes; the pixel's own cookie wins over the remembered click", async () => {
    localStorage.setItem("ethos-consent", "granted");
    const { adCheckoutFields, rememberClickIds } = await load();
    rememberClickIds("?fbclid=IwAR0abc&ttclid=E.C.P.xyz", 1760000000000);
    expect(adCheckoutFields()).toEqual({ fbc: "fb.1.1760000000000.IwAR0abc", ttclid: "E.C.P.xyz" });
    document.cookie = "_fbp=fb.1.1760000000001.123; _fbc=fb.1.1760000000002.IwAR0pixel; _ttp=ttp-abc";
    expect(adCheckoutFields()).toEqual({ fbc: "fb.1.1760000000002.IwAR0pixel", fbp: "fb.1.1760000000001.123", ttclid: "E.C.P.xyz", ttp: "ttp-abc" });
  });

  it("falls back to TikTok's own click cookie after a reload, without the time it appends", async () => {
    localStorage.setItem("ethos-consent", "granted");
    const { adCheckoutFields } = await load({ tiktok: TIKTOK_ID });
    document.cookie = "ttclid=E.C.P.xyz.1760000000000";
    expect(adCheckoutFields()).toEqual({ ttclid: "E.C.P.xyz" });
  });

  it("keeps the first time a click was seen, and drops a malformed one", async () => {
    const { currentFbc, rememberClickIds } = await load();
    rememberClickIds("?fbclid=IwAR0abc", 1);
    rememberClickIds("?fbclid=IwAR0abc", 2);
    expect(currentFbc()).toBe("fb.1.1.IwAR0abc");
    rememberClickIds("?fbclid=%3Cscript%3E", 3);
    expect(currentFbc()).toBe("fb.1.1.IwAR0abc");
  });
});

describe("the cookie choice", () => {
  it("asks again anyone who said yes before advertising was named, and keeps a no", async () => {
    localStorage.setItem("ethos-analytics-consent", "granted");
    expect((await load()).getConsent()).toBeNull();
    localStorage.setItem("ethos-analytics-consent", "denied");
    expect((await load()).getConsent()).toBe("denied");
  });

  it("stores the new answer under the new key and drops the old one", async () => {
    localStorage.setItem("ethos-analytics-consent", "denied");
    const { getConsent, setConsent } = await load();
    setConsent("granted");
    expect(localStorage.getItem("ethos-consent")).toBe("granted");
    expect(localStorage.getItem("ethos-analytics-consent")).toBeNull();
    expect(getConsent()).toBe("granted");
  });
});

describe("starting a checkout", () => {
  async function start(consent: "granted" | "denied") {
    localStorage.setItem("ethos-consent", consent);
    const ads = await load();
    win.fbq = vi.fn();
    win.ttq = { page: vi.fn(), track: vi.fn() };
    ads.setAdsLive(true);
    ads.rememberClickIds("?fbclid=IwAR0abc", 1760000000000);
    const postJson = vi.fn(async () => ({ status: 200, json: { url: "https://checkout.stripe.com/c/pay/cs_test" } }));
    vi.doMock("@/components/pricing/requests", () => ({ postJson, errorOf: () => null }));
    // The toaster styles itself into the document on import; there is no document here.
    vi.doMock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));
    // Only the error hook uses these, and nothing here renders.
    vi.doMock("@/i18n/navigation", () => ({ useRouter: vi.fn() }));
    vi.doMock("next-intl", () => ({ useTranslations: vi.fn() }));
    const { startCheckout } = await import("@/components/pricing/checkout");
    await startCheckout({ product: "single", templateSlugs: ["halfway"], currency: "usd", returnTo: "/create/halfway", locale: "en" }, { total: 799, category: "premium" });
    vi.doUnmock("@/components/pricing/requests");
    for (const mod of ["sonner", "@/i18n/navigation", "next-intl"]) vi.doUnmock(mod);
    return postJson.mock.calls[0] as unknown as [string, Record<string, unknown>];
  }

  it("tells both pixels, with the total the button showed, and sends the consent with the ids", async () => {
    const [url, body] = await start("granted");
    expect(win.fbq).toHaveBeenCalledWith("track", "InitiateCheckout", expect.objectContaining({ content_ids: ["halfway"], content_category: "premium", value: 7.99, currency: "USD" }));
    expect(win.ttq!.track).toHaveBeenCalledWith("InitiateCheckout", expect.objectContaining({ value: 7.99, currency: "USD" }));
    expect(url).toBe("/api/stripe/checkout");
    expect(body.ads).toEqual({ fbc: "fb.1.1760000000000.IwAR0abc" });
  });

  it("sends neither the event nor any ids for a visitor who said no", async () => {
    const [, body] = await start("denied");
    expect(body).not.toHaveProperty("ads");
  });
});
