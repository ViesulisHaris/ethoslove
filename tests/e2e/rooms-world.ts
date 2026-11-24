import { expect, type Locator, type Page } from "@playwright/test";

/**
 * What the rooms' specs share (trips-match, trips, halfway-tool, rooms-handoffs, rooms-design): the
 * page-error watch, a stand-in for Vercel's script that takes down every event, the share sheet
 * caught or taken away, and the towns a place search and the weather answer with. Nothing here
 * reaches the internet.
 */

/** Fails the test on any uncaught error in the page. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

export type Counted = { name: string; data?: Record<string, unknown> };

/**
 * Takes down what the page hands to window.va (as tests/e2e/gift-finder.spec.ts). Vercel's own
 * script is kept from loading: once it has, it takes window.va over and every event goes to it unseen.
 */
export async function countEvents(page: Page): Promise<() => Promise<Counted[]>> {
  await page.route((url) => url.hostname === "va.vercel-scripts.com" || url.pathname.startsWith("/_vercel/insights/"), (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { __counted: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted = [];
    w.va = (...args: unknown[]) => {
      w.__counted.push(args);
    };
  });
  return () =>
    page.evaluate(() =>
      (window as unknown as { __counted: unknown[][] }).__counted.filter((call) => call[0] === "event").map((call) => call[1] as { name: string; data?: Record<string, unknown> }),
    );
}

/** The share sheet, standing in: every share is kept on window.shared. */
export async function catchShares(page: Page) {
  await page.addInitScript(() => {
    const sink = window as unknown as { shared: ShareData[] };
    sink.shared = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: (data: ShareData) => (sink.shared.push(data), Promise.resolve()) });
  });
}
export const lastShare = (page: Page) => page.evaluate(() => (window as unknown as { shared: ShareData[] }).shared.at(-1) ?? null);

/** No share sheet, as on most desktops: the copy path runs (desktop Chrome on Windows has one). */
export async function noShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
}

/** A click that is counted but goes nowhere: the page stays to be read. */
export async function clickInPlace(link: Locator) {
  await link.evaluate((el) => {
    el.removeAttribute("target");
    el.addEventListener("click", (e) => e.preventDefault(), { once: true });
  });
  await link.click();
}

export type Town = { lat: number; lng: number; offset: number; country: string };

export const TOWNS: Record<string, Town> = {
  Riga: { lat: 56.9494, lng: 24.1052, offset: 10800, country: "Latvia" },
  Lisbon: { lat: 38.7223, lng: -9.1393, offset: 3600, country: "Portugal" },
  London: { lat: 51.5074, lng: -0.1278, offset: 0, country: "United Kingdom" },
  Edinburgh: { lat: 55.9533, lng: -3.1883, offset: 0, country: "United Kingdom" },
  Paris: { lat: 48.8566, lng: 2.3522, offset: 3600, country: "France" },
  "New York": { lat: 40.7128, lng: -74.006, offset: -18000, country: "United States" },
  Chicago: { lat: 41.8781, lng: -87.6298, offset: -21600, country: "United States" },
  Boston: { lat: 42.3601, lng: -71.0589, offset: -18000, country: "United States" },
  Berlin: { lat: 52.52, lng: 13.405, offset: 3600, country: "Germany" },
  Rome: { lat: 41.9028, lng: 12.4964, offset: 3600, country: "Italy" },
  Prague: { lat: 50.0755, lng: 14.4378, offset: 3600, country: "Czechia" },
  Vienna: { lat: 48.2082, lng: 16.3738, offset: 3600, country: "Austria" },
  Austin: { lat: 30.2672, lng: -97.7431, offset: -21600, country: "United States" },
  Denver: { lat: 39.7392, lng: -104.9903, offset: -25200, country: "United States" },
  Philadelphia: { lat: 39.9526, lng: -75.1652, offset: -18000, country: "United States" },
  Dallas: { lat: 32.7767, lng: -96.797, offset: -21600, country: "United States" },
  Houston: { lat: 29.7604, lng: -95.3698, offset: -21600, country: "United States" },
  Milan: { lat: 45.4642, lng: 9.19, offset: 3600, country: "Italy" },
};

/** What the map says lies at a halfway point (lib/places/photon-reverse.ts), as /api/places answers it. */
type Place = { name: string; region?: string; countryCode?: string; lat: number; lng: number };
export type Spot = ({ kind: "town"; also?: Place[] } & Place) | { kind: "none" } | { kind: "sea" };

/**
 * The place search answers with the town typed; the map's look at a halfway point with `spot(lat,
 * lng)` (by default nothing to say: open country), or a 504 when it returns null; and the weather
 * with the nearest town's clock. Every point the map is asked about is kept in `asked`.
 */
export async function mockTowns(page: Page, towns: Record<string, Town> = TOWNS, spot: (lat: number, lng: number) => Spot | null = () => ({ kind: "none" })) {
  const asked: { lat: number; lng: number }[] = [];
  await page.route("**/api/places*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.has("lat")) {
      const lat = Number(params.get("lat"));
      const lng = Number(params.get("lng"));
      asked.push({ lat, lng });
      const found = spot(lat, lng);
      return found ? route.fulfill({ json: { spot: found } }) : route.fulfill({ status: 504, json: { error: "unavailable" } });
    }
    const q = params.get("q") ?? "";
    const town = towns[q];
    return route.fulfill({ json: { results: town ? [{ name: q, kind: "city", lat: town.lat, lng: town.lng, country: town.country }] : [] } });
  });
  await page.route("**/api/dates/weather*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    const nearest = Object.values(towns).reduce((best, t) => (Math.hypot(t.lat - lat, t.lng - lng) < Math.hypot(best.lat - lat, best.lng - lng) ? t : best));
    return route.fulfill({ json: { days: [], utcOffsetSeconds: nearest.offset, timezone: "x" } });
  });
  return asked;
}

/** Types a town into a where box and takes the first answer (as affiliate.spec.ts does). */
export async function typeTown(page: Page, box: string, town: string) {
  const input = page.getByRole("combobox", { name: box });
  await input.fill(town);
  await input.press("Enter");
}

/**
 * Which rows of the Halfway poster a way-on picture shows, as fractions of its height: the picture
 * is cropped (object-fit and its position) and then enlarged about its centre.
 */
export const posterRows = (img: Locator) =>
  img.evaluate((el) => {
    const image = el as HTMLImageElement;
    const style = getComputedStyle(image);
    const k = style.scale === "none" ? 1 : parseFloat(style.scale);
    const [cw, ch] = [image.clientWidth, image.clientHeight];
    const s = Math.max(cw / image.naturalWidth, ch / image.naturalHeight);
    const p = parseFloat(style.objectPosition.split(" ")[1]) / 100;
    const oy = p * (ch - image.naturalHeight * s);
    const top = (ch / 2 - ch / (2 * k) - oy) / s / image.naturalHeight;
    const bottom = (ch / 2 + ch / (2 * k) - oy) / s / image.naturalHeight;
    return { top, bottom };
  });

