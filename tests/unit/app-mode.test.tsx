import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { closeInApp, isInApp, request, shareLink, tell } from "@/lib/app/bridge";
import { buildUrlSeed, readUrlSeed, withoutUrlSeed, type UrlSeedHelpers } from "@/lib/editor/url-seed";
import { decodePlan, encodePlan, type Plan } from "@/lib/dates/plan";
import { planUnwrap } from "@/lib/dates/plan-gift";
import { ideaById } from "@/lib/dates/ideas";
import { getTrip } from "@/lib/trips/presets";
import { findAirport } from "@/lib/trips/airports";
import { TRIP_GIFT_SLUG, tripGiftFields, tripUnwrap } from "@/lib/trips/trip-gift";
import { getManifest } from "@/templates/manifests";

const app = vi.hoisted(() => ({ inApp: false }));
// The pack shelf reaches the server action that opens a pack; it never runs here.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/app/use-bridge", () => ({ useInApp: () => app.inApp, useNativeEvents: () => undefined, useNativeReady: () => undefined }));
// next-intl's navigation reaches for Next's router, which a unit test doesn't have: a plain link will do.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/games/deck",
  useRouter: () => ({ push: () => undefined }),
}));

const { Paywall } = await import("@/components/editor/paywall");
const { PackStatus } = await import("@/components/games/pack-shelf");

type Bridge = { request: (type: string, payload?: unknown) => unknown };
function inTheApp(reply: (type: string, payload: unknown) => unknown = () => ({ ok: true })) {
  const calls: { type: string; payload: unknown }[] = [];
  const EthosNative: Bridge = {
    request: (type, payload) => {
      calls.push({ type, payload });
      return Promise.resolve(reply(type, payload));
    },
  };
  vi.stubGlobal("window", { EthosNative });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  app.inApp = false;
});

describe("the bridge to the iPhone app", () => {
  it("is not there in a browser, or on the server", async () => {
    expect(isInApp()).toBe(false);
    await expect(request("close", {})).rejects.toThrow("not_in_app");
    expect(() => tell("ready", { route: "editor" })).not.toThrow();
    vi.stubGlobal("window", {});
    expect(isInApp()).toBe(false);
  });

  it("sends the type and payload and hands back the app's answer", async () => {
    const calls = inTheApp((type) => (type === "paywall" ? { status: "unlocked" } : "not an object"));
    expect(isInApp()).toBe(true);
    expect(await request("paywall", { templateSlug: "kawaii", tier: "premium", features: ["Music"] })).toEqual({ status: "unlocked" });
    expect(await request("title", { title: "Kawaii" })).toEqual({});
    expect(calls).toEqual([
      { type: "paywall", payload: { templateSlug: "kawaii", tier: "premium", features: ["Music"] } },
      { type: "title", payload: { title: "Kawaii" } },
    ]);
  });

  it("shares through the app's own sheet inside it", async () => {
    const calls = inTheApp(() => ({ status: "shared" }));
    expect(await shareLink({ url: "https://tryethos.io/g/abc", text: "For you" })).toBe(true);
    expect(calls).toEqual([{ type: "share", payload: { url: "https://tryethos.io/g/abc", text: "For you" } }]);
  });

  it("turns a link out of the page into closing it, only inside the app", () => {
    const outside = { preventDefault: vi.fn() };
    closeInApp(outside);
    expect(outside.preventDefault).not.toHaveBeenCalled();

    const calls = inTheApp();
    const inside = { preventDefault: vi.fn() };
    closeInApp(inside);
    expect(inside.preventDefault).toHaveBeenCalled();
    expect(calls).toEqual([{ type: "close", payload: {} }]);
  });
});

describe("the editor's paywall inside the app", () => {
  const kawaii = getManifest("kawaii")!;
  const letter = getManifest("the-letter")!;
  const render = (manifest = kawaii, messages: typeof en = en, locale: "en" | "es" = "en") =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <Paywall manifest={manifest} currency="eur" locale={locale} guest={false} features={["their song"]} returnTo="/create/kawaii?resume=publish" upgrade={null} blocked={false} onAppUnlock={async () => "unlocked"} />
      </NextIntlClientProvider>,
    );

  beforeEach(() => {
    app.inApp = true;
  });

  it("sells nothing itself: no price, no plans, no bump, no checkout, no guarantee", () => {
    const html = render();
    expect(html).toContain("Unlock and send");
    expect(html).toContain("their song");
    expect(html).toContain('data-testid="app-unlock"');
    for (const word of ["€", "checkout", "pick", "bump", "money back", "Everything for the difference", "Card, Apple Pay"]) expect(html).not.toContain(word);
    expect(html).not.toContain('data-testid="pay-panel"');
  });

  it("says it in Spanish, and for a free template's extras", () => {
    const html = render(letter, es as unknown as typeof en, "es");
    expect(html).toContain("Desbloquear y enviar");
    expect(html).toContain("Hazlo especial una vez");
    expect(html).not.toContain("€");
  });

  it("is the website's paywall everywhere else", () => {
    app.inApp = false;
    const html = render();
    expect(html).toContain('data-testid="pay-panel"');
    expect(html).toContain("€");
    expect(html).not.toContain("Unlock and send");
  });
});

describe("a locked pack inside the app", () => {
  it("shows no price", () => {
    const shelf = { opening: null, accessOf: () => "locked" } as unknown as Parameters<typeof PackStatus>[0]["shelf"];
    const render = () =>
      renderToStaticMarkup(
        <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
          <PackStatus shelf={shelf} id="deep" />
        </NextIntlClientProvider>,
      );
    expect(render()).toContain("€");
    app.inApp = true;
    const html = render();
    expect(html).toContain("Locked");
    expect(html).not.toContain("€");
  });
});

describe("a seed in the editor's address", () => {
  const helpers: UrlSeedHelpers = {
    getTrip,
    tripGiftSlug: TRIP_GIFT_SLUG,
    tripGiftFields,
    tripUnwrap,
    decodePlan,
    planUnwrap,
    ideaTitle: (id, locale) => ideaById(id)?.title[locale],
  };
  const plan: Plan = {
    v: 1,
    date: "2026-10-03",
    where: "London",
    idea: "bookshop-and-coffee",
    stops: [
      { id: "way/485638349", name: "Stanfords", kind: "bookshop", lat: 51.513006, lng: -0.125356, time: "14:00" },
      { id: "node/2", name: "Monmouth Coffee", kind: "cafe", lat: 51.5143, lng: -0.1269 },
    ],
  };
  const encoded = encodePlan(plan);

  it("is read from ?seed, ?unwrap and the plan after the #", () => {
    expect(readUrlSeed(new URLSearchParams("seed=trip:amalfi-coast"), "")).toEqual({ trip: "amalfi-coast" });
    expect(readUrlSeed(new URLSearchParams("unwrap=trip:lisbon-slow-weekend"), "")).toEqual({ unwrapTrip: "lisbon-slow-weekend" });
    expect(readUrlSeed(new URLSearchParams("unwrap=plan"), `#p=${encoded}`)).toEqual({ plan: encoded });
    expect(readUrlSeed(new URLSearchParams("unwrap=plan"), "")).toBeNull();
    expect(readUrlSeed(new URLSearchParams("seed=trip:../x&unwrap=trip:<b>"), "")).toBeNull();
    expect(readUrlSeed(new URLSearchParams("gift=123"), "#p=abc")).toBeNull();
  });

  it("leaves the address once read, keeping everything else", () => {
    expect(withoutUrlSeed(`https://tryethos.io/create/kawaii?unwrap=plan&resume=publish#p=${encoded}`)).toBe("/create/kawaii?resume=publish");
    expect(withoutUrlSeed("https://tryethos.io/es/create/pack-your-bags?seed=trip:amalfi-coast")).toBe("/es/create/pack-your-bags");
    expect(withoutUrlSeed("https://tryethos.io/create/kawaii?gift=1#section")).toBe("/create/kawaii?gift=1#section");
  });

  it("fills the ticket in from a trip, on the ticket template only", () => {
    const lisbonFrom = findAirport("RIX");
    const built = buildUrlSeed(TRIP_GIFT_SLUG, { trip: "lisbon-slow-weekend" }, "en", lisbonFrom, helpers)!;
    expect(built.seed.fields).toEqual(tripGiftFields(getTrip("lisbon-slow-weekend")!, "en", lisbonFrom));
    expect(built.seed.fields.fromCity).toBe("Riga");
    // A road trip starts where its road does, whatever airport they last used.
    expect(buildUrlSeed(TRIP_GIFT_SLUG, { trip: "amalfi-coast" }, "es", lisbonFrom, helpers)!.seed.fields).toEqual(tripGiftFields(getTrip("amalfi-coast")!, "es", null));
    expect(buildUrlSeed("kawaii", { trip: "amalfi-coast" }, "en", null, helpers)).toBeNull();
    expect(buildUrlSeed(TRIP_GIFT_SLUG, { trip: "no-such-trip" }, "en", null, helpers)).toBeNull();
  });

  it("wraps a trip or a planned date as the surprise inside any gift", () => {
    const trip = buildUrlSeed("kawaii", { unwrapTrip: "amalfi-coast" }, "en", null, helpers)!;
    expect(trip.seed.unwrap).toEqual(tripUnwrap(getTrip("amalfi-coast")!, "en", { from: null }));
    expect(trip.trip?.id).toBe("amalfi-coast");

    const date = buildUrlSeed("the-letter", { plan: encoded }, "es", null, helpers)!;
    expect(date.seed.unwrap).toEqual(planUnwrap(plan, "es", { link: `/es/plan#p=${encoded}`, title: "Elegid un libro el uno para el otro" }));
    expect(date.link).toBe(`/es/plan#p=${encoded}`);
    expect(buildUrlSeed("kawaii", { plan: "not-a-plan" }, "en", null, helpers)).toBeNull();
  });
});

describe("an app build with only the message handler", () => {
  it("is still the app, and gets the same messages", async () => {
    const posted: unknown[] = [];
    vi.stubGlobal("window", { webkit: { messageHandlers: { ethos: { postMessage: (message: unknown) => (posted.push(message), Promise.resolve({ status: "cancelled" })) } } } });
    expect(isInApp()).toBe(true);
    expect(await request("signIn", { reason: "pack" })).toEqual({ status: "cancelled" });
    expect(posted).toEqual([{ type: "signIn", payload: { reason: "pack" } }]);
  });
});
