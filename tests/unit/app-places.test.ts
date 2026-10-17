import { describe, expect, it } from "vitest";
import { appFlights } from "@/lib/app/flights";
import { placeExtras, placeWeek, rankForApp } from "@/lib/app/places";
import { kindImage } from "@/lib/dates/art";
import type { Sight } from "@/lib/dates/photos";
import type { Place } from "@/lib/dates/places";
import { rankPlaces } from "@/lib/dates/rank";
import { flightLinks } from "@/lib/trips/flights";
import { findAirport } from "@/lib/trips/airports";

const center = { lat: 51.512, lng: -0.124 };

function place(id: string, over: Partial<Place> = {}): Place {
  return {
    id,
    name: `Place ${id}`,
    named: true,
    kind: "cafe",
    group: "sweet",
    lat: 51.512,
    lng: -0.124,
    distanceKm: 0,
    cuisine: [],
    outdoorSeating: false,
    vegetarian: false,
    stepFree: false,
    notable: false,
    score: 50,
    ...over,
  };
}

const sight = (title: string, lat: number, lng: number): Sight => ({
  pageId: title.length,
  title,
  lat,
  lng,
  description: `About ${title}`,
  articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  file: `${title}.jpg`,
  photo: { src: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${encodeURIComponent(title)}.jpg`, width: 1024, height: 768, credit: "Somebody", licence: "CC BY-SA 4.0" },
});

describe("the app's Explore list", () => {
  it("ranks as the /dates page does: photographs lift a place, ratings count, rank is by date score", () => {
    const opera = place("node/1", { name: "Royal Opera House", kind: "theatre", group: "culture", score: 60, lat: 51.5131, lng: -0.1228 });
    const cafe = place("node/2", { name: "Corner Café", score: 70, lat: 51.5125, lng: -0.1245 });
    const bar = place("node/3", { name: "The Lamb", kind: "bar", group: "eat", score: 65, lat: 51.513, lng: -0.1235 });
    const list = rankForApp({
      center,
      places: [opera, cafe, bar],
      sights: [sight("Royal Opera House", 51.5131, -0.1228)],
      ratings: { "node/3": { stars: 5, reviews: 12, cost: 1 } },
    });
    // The opera house gets its photograph, "notable", and +6 (and +8 more for the photo in dateScore).
    const pictured = list.find((p) => p.id === "node/1")!;
    expect(pictured.photo?.credit).toBe("Somebody");
    expect(pictured.about).toBe("About Royal Opera House");
    expect(pictured.notable).toBe(true);
    // Same ranking as rankPlaces over what the explorer builds.
    const expected = rankPlaces(
      [
        { ...opera, photo: pictured.photo, about: pictured.about, articleUrl: pictured.articleUrl, notable: true, score: 66 },
        cafe,
        bar,
      ].map((p) => ({ ...p, distanceKm: list.find((q) => q.id === p.id)!.distanceKm })),
      { "node/3": { stars: 5, reviews: 12, cost: 1 } },
    );
    expect(list.map((p) => p.id)).toEqual(expected.map((p) => p.id));
    expect(list.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it("says where a cost came from, and has a rating or null", () => {
    const [rated, unrated] = rankForApp({
      center,
      places: [place("node/10", { kind: "restaurant", group: "eat", score: 90 }), place("node/11", { kind: "restaurant", group: "eat", score: 10 })],
      ratings: { "node/10": { stars: 4, reviews: 3, cost: 3 } },
    });
    expect(rated).toMatchObject({ cost: 3, costReported: true, rating: { stars: 4, reviews: 3, cost: 3 } });
    expect(unrated).toMatchObject({ cost: 2, costReported: false, rating: null });
  });

  it("measures every place from the search's centre, rare finds included, and never loses one", () => {
    const near = place("node/20", { lat: 51.512, lng: -0.124, distanceKm: 9 });
    const rare = place("node/21", { kind: "bowling", group: "play", lat: 51.53, lng: -0.1, distanceKm: 0.1 });
    const list = rankForApp({ center, places: [near], rare: [rare, near] });
    expect(list).toHaveLength(2);
    expect(list.find((p) => p.id === "node/20")!.distanceKm).toBe(0);
    expect(list.find((p) => p.id === "node/21")!.distanceKm).toBeGreaterThan(2);
  });

  it("gives every place its kind's illustration, picked by id as the site does", () => {
    const list = rankForApp({ center, places: [place("node/30"), place("node/31")] });
    for (const p of list) expect(p.image).toBe(kindImage(p.kind, p.id));
  });
});

describe("one place", () => {
  it("reads the week's hours, Sunday first", () => {
    const week = placeWeek("Mo-Fr 09:00-19:00; Sa 10:00-19:00; Su off")!;
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ weekday: 0, known: true, ranges: [], text: null });
    expect(week[1]).toEqual({ weekday: 1, known: true, ranges: [[540, 1140]], text: "09:00–19:00" });
    expect(week[6].text).toBe("10:00–19:00");
    expect(placeWeek(undefined)).toBeNull();
    expect(placeWeek("Jan-Mar Mo 10:00-12:00")!.every((d) => !d.known && d.text === null)).toBe(true);
  });

  it("links out for a named place, never for a nameless one", () => {
    const named = placeExtras({ name: "Stanfords", lat: 51.5, lng: -0.12, locale: "en", details: { id: "way/1", address: "Mercer Walk 7", cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: true } });
    expect(named.links.map((l) => l.source)).toEqual(["tripadvisor", "google", "yelp"]);
    expect(named.links[0].url).toContain("Stanfords%20Mercer%20Walk%207");
    expect(placeExtras({ name: "Viewpoint", lat: 51.5, lng: -0.12, locale: "en", details: null, named: false }).links).toEqual([]);
  });

  it("sells tickets where the kind does, in the town searched", () => {
    const museum = placeExtras({ name: "Science Museum", lat: 51.5, lng: -0.17, locale: "es", details: null, kind: "museum", where: "London" });
    expect(museum.tickets).toBe("https://tiqets.tpm.lv/6ik2vRS7?u=" + encodeURIComponent(`https://www.tiqets.com/es/search?q=${encodeURIComponent("Science Museum London")}`));
    expect(placeExtras({ name: "Tate", lat: 51.5, lng: -0.1, locale: "en", details: null, kind: "gallery" }).tickets).toBeNull();
    expect(placeExtras({ name: "Tate", lat: 51.5, lng: -0.1, locale: "en", details: null, kind: "gallery", notable: true }).tickets).not.toBeNull();
    expect(placeExtras({ name: "Café", lat: 51.5, lng: -0.1, locale: "en", details: null, kind: "cafe" }).tickets).toBeNull();
    expect(placeExtras({ name: "Museum", lat: 51.5, lng: -0.1, locale: "en", details: null }).tickets).toBeNull();
  });
});

describe("the app's flight search", () => {
  it("is the website finder's answer for the same airports", () => {
    const result = appFlights({ from: "LON", to: "Lisboa", depart: "2026-10-16", back: "2026-10-19", adults: "2", locale: "es" });
    if ("error" in result) throw new Error(result.error);
    const from = findAirport("LON")!;
    const to = findAirport("Lisboa")!;
    expect(result.from.iata).toBe("LHR");
    expect(result.to.iata).toBe("LIS");
    expect(result.km).toBe(1585);
    expect(result.duration).toBe("2 h 35 min");
    expect(result.trainHint).toBe(false);
    expect(result.links).toEqual(flightLinks({ from, to, depart: "2026-10-16", back: "2026-10-19", adults: 2, locale: "es" }));
  });

  it("keeps the travellers between one and four, and drops a return before the departure", () => {
    const many = appFlights({ from: "RIX", to: "LIS", depart: "2026-10-16", back: "2026-10-10", adults: "9", locale: "en" });
    if ("error" in many) throw new Error(many.error);
    expect(many.links.find((l) => l.id === "kayak")!.url).toBe("https://www.kayak.com/flights/RIX-LIS/2026-10-16/4adults");
    const nonsense = appFlights({ from: "RIX", to: "LIS", depart: "tomorrow", adults: "lots", locale: "en" });
    if ("error" in nonsense) throw new Error(nonsense.error);
    expect(nonsense.links.find((l) => l.id === "kayak")!.url).toBe("https://www.kayak.com/flights/RIX-LIS/2adults");
  });

  it("says when it doesn't know an airport, or both ends are the same", () => {
    expect(appFlights({ from: "Atlantis", to: "LIS", locale: "en" })).toEqual({ error: "unknown_airport" });
    expect(appFlights({ from: null, to: "LIS", locale: "en" })).toEqual({ error: "unknown_airport" });
    expect(appFlights({ from: "LIS", to: "Lisbon", locale: "en" })).toEqual({ error: "same_airport" });
  });

  it("hints at the train when it is close", () => {
    const short = appFlights({ from: "Paris", to: "London", locale: "en" });
    if ("error" in short) throw new Error(short.error);
    expect(short.trainHint).toBe(true);
  });
});
