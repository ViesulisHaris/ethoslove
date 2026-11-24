import type { Page } from "@playwright/test";

/**
 * The Dates pages with the outside world replaced: places, rare finds, the forecast, a place's
 * details and the map's style all come from here, so nothing depends on OpenStreetMap's servers
 * being up, on what is mapped in Lisbon this week, or on the weather.
 */
export const LISBON = { lat: 38.714, lng: -9.139 };

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** The day the page starts on: this week's Saturday, or today once the weekend has begun. */
export function startingDay(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  if (day !== 6 && day !== 0) d.setDate(d.getDate() + (6 - day));
  return d;
}

export type Mock = { id: string; name: string; kind: string; group: string; dLat: number; dLng: number; score: number };
export const PLACES: Mock[] = [
  { id: "node/101", name: "Livraria do Bairro", kind: "bookshop", group: "culture", dLat: 0.001, dLng: 0.001, score: 90 },
  { id: "node/102", name: "Second Chapter Books", kind: "bookshop", group: "culture", dLat: 0.0015, dLng: -0.001, score: 80 },
  { id: "node/103", name: "Café da Esquina", kind: "cafe", group: "sweet", dLat: 0.002, dLng: 0.0015, score: 78 },
  { id: "node/104", name: "Gelados Santini", kind: "dessert", group: "sweet", dLat: -0.001, dLng: 0.002, score: 76 },
  { id: "node/105", name: "Miradouro das Flores", kind: "viewpoint", group: "outdoors", dLat: -0.002, dLng: 0.001, score: 88 },
  { id: "node/106", name: "Taberna Boa Noite", kind: "restaurant", group: "eat", dLat: 0.0005, dLng: -0.002, score: 70 },
  { id: "node/107", name: "Museu do Fado Pequeno", kind: "museum", group: "culture", dLat: 0.003, dLng: 0.0005, score: 74 },
  { id: "node/108", name: "Bar do Rio", kind: "bar", group: "eat", dLat: -0.0015, dLng: -0.0015, score: 60 },
  // Places with a story: their names say so, in English and in Portuguese.
  { id: "node/109", name: "Cellar Door", kind: "bar", group: "eat", dLat: 0.0012, dLng: -0.0025, score: 58 },
  { id: "node/110", name: "Red Frog Speakeasy", kind: "bar", group: "eat", dLat: -0.0022, dLng: 0.0024, score: 57 },
  { id: "node/111", name: "Limão Rooftop Bar", kind: "bar", group: "eat", dLat: 0.0026, dLng: -0.0006, score: 56 },
  { id: "node/112", name: "Tasca do Chico (Casa de Fado)", kind: "restaurant", group: "eat", dLat: -0.0006, dLng: -0.0028, score: 55 },
];
/** The places above whose names make them "something different", and the bowling alley the rare finds add. */
export const UNUSUAL = ["Cellar Door", "Red Frog Speakeasy", "Limão Rooftop Bar", "Tasca do Chico (Casa de Fado)", "Bowling Alvalade"];
export const toPlace = (p: Mock) => ({ id: p.id, name: p.name, named: true, kind: p.kind, group: p.group, lat: LISBON.lat + p.dLat, lng: LISBON.lng + p.dLng, distanceKm: 0.2, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: p.score });

export async function mockWorld(page: Page, { wet = false }: { wet?: boolean } = {}) {
  const first = new Date();
  first.setHours(12, 0, 0, 0);
  const days = Array.from({ length: 16 }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    return { date: ymd(d), condition: wet ? "rain" : "clear", tMax: wet ? 14 : 24, tMin: 12, rainChance: wet ? 90 : 5, sunrise: "07:27", sunset: "19:27" };
  });
  await page.route("**/api/dates/search*", (route) => route.fulfill({ json: { center: LISBON, radiusM: 1500, total: PLACES.length, complete: true, places: PLACES.map(toPlace) } }));
  await page.route("**/api/dates/rare*", (route) => route.fulfill({ json: { center: LISBON, radiusM: 8000, places: [{ ...toPlace({ id: "node/201", name: "Bowling Alvalade", kind: "bowling", group: "play", dLat: 0.03, dLng: 0.01, score: 58 }), hours: "Mo-Su 10:00-23:00" }] } }));
  await page.route("**/api/dates/weather*", (route) => route.fulfill({ json: { days, utcOffsetSeconds: 3600, timezone: "Europe/Lisbon" } }));
  await page.route("**/api/dates/here", (route) => route.fulfill({ json: { place: null } }));
  await page.route("**/api/dates/place*", (route) => {
    const id = new URL(route.request().url()).searchParams.get("id");
    return route.fulfill({ json: { details: { id, address: "Rua das Flores 12, Chiado, Lisbon", hours: "Mo-Su 10:00-22:00", website: "https://example.pt/", phone: "+351 210 000 000", cuisine: ["coffee shop"], outdoorSeating: true, vegetarian: false, stepFree: true, notable: false } } });
  });
  // One café has been photographed by somebody generous; nobody has photographed the rest.
  await page.route("**/api/dates/photo*", (route) => {
    const name = new URL(route.request().url()).searchParams.get("name");
    return route.fulfill({ json: { photo: name === "Café da Esquina" ? { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/test/640px-cafe.jpg", width: 640, height: 427, credit: "Inês Almeida", licence: "CC BY 4.0", fileUrl: "https://commons.wikimedia.org/wiki/File:Cafe.jpg" } : null } });
  });
  await page.route("**/api/dates/photos*", (route) => route.fulfill({ json: { center: LISBON, sights: [] } }));
  // Two couples have rated the bookshop; nobody is signed in, so writing one is refused.
  await page.route("**/api/dates/ratings", (route) => route.fulfill({ json: { ratings: { "node/101": { stars: 4.5, reviews: 2, cost: 0 } } } }));
  await page.route("**/api/dates/reviews*", (route) => {
    if (route.request().method() === "POST") return route.fulfill({ status: 401, json: { error: "unauthenticated" } });
    const id = new URL(route.request().url()).searchParams.get("place");
    return route.fulfill({ json: { reviews: id === "node/101" ? [{ id: "r1", stars: 5, cost: 0, wentAs: "first", body: "Ask for the poetry shelf.", name: "Inês", createdAt: "2026-09-20T10:00:00Z", mine: false }, { id: "r2", stars: 4, cost: null, wentAs: null, body: null, name: "Marco", createdAt: "2026-09-19T10:00:00Z", mine: false }] : [] } });
  });
  await page.route("https://upload.wikimedia.org/**", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") }));
  // The map draws on plain paper: a style with no sources asks for no tiles.
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.request().url().endsWith("/styles/positron")
      ? route.fulfill({ json: { version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#f2f3f0" } }] } })
      : route.abort(),
  );
}

export const lisbonUrl = `/dates?lat=${LISBON.lat}&lng=${LISBON.lng}&q=Lisbon`;

/** navigator.share, caught: what the page would have handed the phone's share sheet. */
export async function catchShares(page: Page) {
  await page.addInitScript(() => {
    const sink = window as unknown as { shared: ShareData[] };
    sink.shared = [];
    Object.defineProperty(navigator, "share", { configurable: true, value: (data: ShareData) => (sink.shared.push(data), Promise.resolve()) });
  });
}
export const lastShare = (page: Page) => page.evaluate(() => (window as unknown as { shared: ShareData[] }).shared.at(-1) ?? null);
