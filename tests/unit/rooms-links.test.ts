import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TRIP_SEO } from "@/content/trip-seo";
import { TRIP_IDS, TRIPS } from "@/lib/trips/presets";

/**
 * The rooms of the growth build: a trip's words for search, the links between a trip and the cities
 * it passes through, the halfway finder's calculation, its link and its ways on, the share screen's
 * line to date ideas, and the words and flowers of the new sections.
 */

const LOCALES = ["en", "es"] as const;

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
