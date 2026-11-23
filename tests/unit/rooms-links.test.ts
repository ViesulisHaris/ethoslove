import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TRIP_SEO } from "@/content/trip-seo";
import { halfwayBetween, halfwayCityName, isOwnTown } from "@/lib/ldr/halfway";
import { tripStopCities, tripsThrough } from "@/lib/trips/cities";
import { getTrip, TRIP_IDS, TRIPS } from "@/lib/trips/presets";
import { CITIES } from "@/templates/_shared/places";

/**
 * The rooms of the growth build: a trip's words for search, the links between a trip and the cities
 * it passes through, the halfway finder's calculation, its link and its ways on, the share screen's
 * line to date ideas, and the words and flowers of the new sections.
 */

const LOCALES = ["en", "es"] as const;
/** A town from the offline table, as a link or a where box would hand it over. */
const town = (name: string) => {
  const c = CITIES.find((x) => x.name === name)!;
  return { name: c.name, lat: c.lat, lng: c.lng };
};
const near = (actual: number, expected: number, within = 2) => expect(Math.abs(actual - expected), `${actual} is not within ${within} of ${expected}`).toBeLessThanOrEqual(within);

describe("a trip in search", () => {
  it("every trip has its words for search, in both languages, and no other trip does", () => {
    expect(Object.keys(TRIP_SEO).sort()).toEqual([...TRIP_IDS].sort());
    for (const [id, seo] of Object.entries(TRIP_SEO))
      for (const l of LOCALES) {
        expect(seo.title[l].length, `${id} ${l} title: ${seo.title[l]}`).toBeGreaterThanOrEqual(30);
        expect(seo.title[l].length, `${id} ${l} title: ${seo.title[l]}`).toBeLessThanOrEqual(60);
        expect(seo.description[l].length, `${id} ${l} description`).toBeGreaterThanOrEqual(110);
        expect(seo.description[l].length, `${id} ${l} description`).toBeLessThanOrEqual(160);
      }
  });

  it("a title says how many days, says it is an itinerary, and is nobody else's", () => {
    for (const trip of TRIPS) {
      const { title } = TRIP_SEO[trip.id];
      expect(title.en, trip.id).toContain(String(trip.days));
      expect(title.en, trip.id).toContain("for two");
      expect(title.en, trip.id).toContain("itinerary");
      expect(title.es, trip.id).toContain(String(trip.days));
      expect(title.es, trip.id).toMatch(/para dos|en pareja/);
      expect(title.es, trip.id).toContain("itinerario");
      for (const l of LOCALES) expect(title[l], trip.id).not.toBe(trip.title[l]);
    }
    for (const l of LOCALES) expect(new Set(Object.values(TRIP_SEO).map((s) => s.title[l])).size).toBe(TRIPS.length);
  });

  it("the trips room is titled with the search, and counts its trips", () => {
    expect(en.trips.meta.title.startsWith("Couples trip ideas")).toBe(true);
    expect(es.trips.meta.title.startsWith("Ideas de viajes en pareja")).toBe(true);
    for (const m of [en, es]) {
      expect(m.trips.meta.title).toContain("{count}");
      expect(m.trips.meta.title.replace("{count}", "12").length).toBeLessThanOrEqual(60);
      expect(m.trips.meta.description.length).toBeLessThanOrEqual(160);
    }
    // The descriptions say the number in words: change them with the shelf.
    expect(TRIPS.length).toBe(12);
    expect(en.trips.meta.description).toContain("twelve");
    expect(es.trips.meta.description).toContain("doce");
  });
});

describe("a trip and the cities it passes through", () => {
  const slugs = (id: string) => tripStopCities(getTrip(id)!).map((c) => c?.slug);

  it("a stop in one of our cities is given that city, and a stop that is not is given none", () => {
    expect(slugs("baltic-coast")).toEqual(["riga", undefined, undefined, undefined, "tallinn"]);
    expect(slugs("prague-krumlov-vienna")).toEqual(["prague", undefined, "vienna"]);
    // Louisiana is 33 km out of Copenhagen: not in it.
    expect(slugs("copenhagen-hygge")).toEqual(["copenhagen", undefined, undefined]);
    expect(slugs("amalfi-coast").every((s) => s === undefined)).toBe(true);
  });

  it("a city is named once a trip, at its first stop", () => {
    expect(slugs("lisbon-slow-weekend")).toEqual(["lisbon", undefined, undefined, undefined]);
    for (const trip of TRIPS) {
      const named = slugs(trip.id).filter(Boolean);
      expect(new Set(named).size, trip.id).toBe(named.length);
    }
  });

  it("seven trips pass through nine of our cities, and each city knows its trip", () => {
    // When more cities arrive this holds unless one lies within 12 km of a stop: then add it here on purpose.
    expect(TRIPS.filter((t) => tripStopCities(t).some(Boolean)).map((t) => t.id)).toEqual([
      "lisbon-slow-weekend",
      "paris-without-cliches",
      "scottish-highlands",
      "baltic-coast",
      "prague-krumlov-vienna",
      "copenhagen-hygge",
      "amsterdam-by-bike",
    ]);
    expect(new Set(TRIPS.flatMap((t) => tripStopCities(t).filter(Boolean).map((c) => c!.slug))).size).toBe(9);
    expect(tripsThrough("riga").map((t) => t.id)).toEqual(["baltic-coast"]);
    expect(tripsThrough("tallinn").map((t) => t.id)).toEqual(["baltic-coast"]);
    expect(tripsThrough("london")).toEqual([]);
    expect(tripsThrough("nope")).toEqual([]);
  });
});

describe("halfway between two towns", () => {
  it("halfway between Riga and Lisbon is Luxembourg, and it says how far for each", () => {
    const h = halfwayBetween(town("Riga"), town("Lisbon"));
    near(h.km, 3151);
    expect(h.near?.city.name).toBe("Luxembourg");
    near(h.near!.km, 139);
    near(h.near!.kmFromA, 1440);
    near(h.near!.kmFromB, 1711);
    expect(h.unnamed).toBe(false);
  });

  it("halfway across an ocean, or over Siberia, is nowhere to meet", () => {
    for (const [a, b] of [["New York", "London"], ["London", "Tokyo"]]) {
      const h = halfwayBetween(town(a), town(b));
      expect(h.near, `${a}–${b}`).toBeNull();
      expect(h.unnamed).toBe(false);
    }
    expect(halfwayBetween(town("London"), town("Tokyo")).middle.lat).toBeGreaterThan(60);
  });

  it("a halfway point in Spain is never named", () => {
    const h = halfwayBetween(town("Lisbon"), town("Paris"));
    expect(h.near).toBeNull();
    expect(h.unnamed).toBe(true);
  });

  it("a halfway city that is one of their own towns is told apart", () => {
    const pv = halfwayBetween(town("Prague"), town("Vienna"));
    expect(pv.near?.city.name).toBe("Vienna");
    expect(isOwnTown(pv)).toBe(true);
    const le = halfwayBetween(town("London"), town("Edinburgh"));
    expect(le.near?.city.name).toBe("Manchester");
    expect(isOwnTown(le)).toBe(false);
    const rr = halfwayBetween(town("Riga"), town("Riga"));
    expect(rr.km).toBe(0);
    expect(isOwnTown(rr)).toBe(false);
  });

  it("the halfway city is said the page's way", () => {
    expect(halfwayCityName({ name: "Munich" }, "es")).toBe("Múnich");
    expect(halfwayCityName({ name: "Toronto" }, "es")).toBe("Toronto");
    expect(halfwayCityName({ name: "Munich" }, "en")).toBe("Munich");
  });
});
