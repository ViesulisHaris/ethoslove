import { createElement, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { allWalkable, mapsRouteUrl } from "@/lib/dates/maps-route";
import { WALK_KM, distanceKm } from "@/lib/dates/geo";

/**
 * The whole date in a maps app (docs/MEMBERSHIP.md 3.4): one route, every stop in the plan's order,
 * by coordinates; walked when every leg is a walk. For members: anyone else sees the button with a
 * lock, and no route in the page.
 */

vi.mock("@/lib/analytics/track", () => ({ track: () => undefined }));
const { MapsMenu } = await import("@/components/saved-dates/maps-menu");

const at = (lat: number, lng: number) => ({ lat, lng });
// Three cafés in Lisbon's Chiado, a few hundred metres apart; Porto, 270 km north.
const CHIADO = [at(38.710568, -9.142013), at(38.711234, -9.139871), at(38.713512, -9.136654)];
const PORTO = at(41.14961, -8.61099);

describe("mapsRouteUrl", () => {
  it("needs two stops: one has its own Directions", () => {
    expect(mapsRouteUrl([], "google")).toBeNull();
    expect(mapsRouteUrl([CHIADO[0]], "apple")).toBeNull();
  });

  it("Google: the first stop to the last, the others as waypoints in order, walked when every leg is a walk", () => {
    const url = new URL(mapsRouteUrl(CHIADO, "google")!);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ api: "1", origin: "38.710568,-9.142013", destination: "38.713512,-9.136654", waypoints: "38.711234,-9.139871", travelmode: "walking" });
    // Waypoints are separated by a pipe, written %7C as Google's documentation asks.
    const four = mapsRouteUrl([...CHIADO, at(38.7139, -9.1334)], "google")!;
    expect(four).toContain("waypoints=38.711234,-9.139871%7C38.713512,-9.136654");
    expect(new URL(four).searchParams.get("waypoints")).toBe("38.711234,-9.139871|38.713512,-9.136654");
  });

  it("Apple: /directions with a source, a destination and one waypoint per stop in between", () => {
    const url = new URL(mapsRouteUrl([...CHIADO, at(38.7139, -9.1334)], "apple")!);
    expect(url.origin + url.pathname).toBe("https://maps.apple.com/directions");
    expect(url.searchParams.get("source")).toBe("38.710568,-9.142013");
    expect(url.searchParams.get("destination")).toBe("38.7139,-9.1334");
    expect(url.searchParams.getAll("waypoint")).toEqual(["38.711234,-9.139871", "38.713512,-9.136654"]);
    expect(url.searchParams.get("mode")).toBe("walking");
  });

  it("leaves how to get there to the app when a leg is too far to walk", () => {
    expect(distanceKm(CHIADO[2], PORTO)).toBeGreaterThan(WALK_KM);
    expect(allWalkable(CHIADO)).toBe(true);
    expect(allWalkable([...CHIADO, PORTO])).toBe(false);
    expect(new URL(mapsRouteUrl([...CHIADO, PORTO], "google")!).searchParams.has("travelmode")).toBe(false);
    expect(new URL(mapsRouteUrl([...CHIADO, PORTO], "apple")!).searchParams.has("mode")).toBe(false);
  });

  it("goes by coordinates, never names, rounded to six decimals (about 10 cm)", () => {
    const url = mapsRouteUrl([at(38.71056812345, -9.1420139999), at(38.7112, -9.1398)], "google")!;
    expect(url).toContain("origin=38.710568,-9.142014");
    expect(url).not.toMatch(/Caf|%20/);
  });
});

describe("MapsMenu", () => {
  const render = (member: boolean, stops = CHIADO, locale: "en" | "es" = "en") =>
    renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages: locale === "es" ? es : en } as unknown as ComponentProps<typeof NextIntlClientProvider>, createElement(MapsMenu, { stops, member, onLocked: () => undefined })));

  it("is locked for free visitors: the button says what it takes, and no route is in the page", () => {
    const html = render(false);
    expect(html).toContain('data-testid="maps-locked"');
    expect(html).toContain("Open in Maps");
    expect(html).toContain("With Ethos for Two");
    expect(html).not.toMatch(/google\.com\/maps|maps\.apple\.com/);
    expect(render(false, CHIADO, "es")).toContain("Con Ethos for Two");
  });

  it("opens a menu for members, and shows nothing for a plan of one stop", () => {
    const html = render(true);
    expect(html).toContain('data-testid="maps-menu"');
    expect(html).not.toContain("maps-locked");
    expect(render(true, [CHIADO[0]])).toBe("");
    expect(render(false, [CHIADO[0]])).toBe("");
  });
});
