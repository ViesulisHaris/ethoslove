import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { distanceKm } from "@/lib/dates/geo";
import { AIRPORTS, cityName, findAirport, suggestAirports, type Airport } from "@/lib/trips/airports";
import { estimateFlight, flightLinks, formatFlightTime, trainHint, withPartner, type FlightQuery, type FlightSite } from "@/lib/trips/flights";
import { monthRanges } from "@/lib/trips/months";
import { TRIP_KINDS, TRIPS, getTrip, tripImageSm, type Trip } from "@/lib/trips/presets";
import { tripGiftFields } from "@/lib/trips/trip-gift";

const airport = (code: string): Airport => {
  const a = findAirport(code);
  if (!a) throw new Error(`no airport ${code}`);
  return a;
};
const RIGA = airport("RIX");
const LISBON = airport("LIS");
const LONDON = airport("London");

/** Pack your bags' fields, as agreed with the template: the seed must always fit them. */
const packYourBags = z.object({
  trip: z.enum(["flight", "road", "train"]).default("flight"),
  fromCity: z.string().min(1).max(40).default("Riga"),
  toCity: z.string().min(1).max(40).default("Lisbon"),
  fromCoords: z.string().max(40).optional(),
  toCoords: z.string().max(40).optional(),
  stops: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
  when: z.string().max(40).default(""),
  nights: z.number().int().min(1).max(30).default(3),
  clues: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
});

/** Every piece of text a trip shows, in both languages. */
function visibleText(trip: Trip): string[] {
  return [
    trip.title.en,
    trip.title.es,
    trip.blurb.en,
    trip.blurb.es,
    ...trip.stops.flatMap((s) => [s.name, s.es ?? "", s.note.en, s.note.es]),
    ...trip.plan.flatMap((d) => [d.title.en, d.title.es, ...d.items.en, ...d.items.es]),
  ];
}

const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);

/** The owner's rule: the site is made in Riga, and nothing on it mentions Spain. */
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary)\b/i;

describe("flight links", () => {
  const dated = flightLinks({ from: RIGA, to: LISBON, depart: "2026-10-10", back: "2026-10-13", locale: "en" });
  /** One site's link for a search. */
  const on = (site: FlightSite, query: Omit<FlightQuery, "locale"> & { locale?: FlightQuery["locale"] }) => flightLinks({ locale: "en", ...query }).find((l) => l.id === site)!.url;

  it("offers Aviasales, then Google Flights, Skyscanner and Kayak, in that order", () => {
    expect(dated.map((l) => l.id)).toEqual(["aviasales", "google", "skyscanner", "kayak"]);
    expect(dated.map((l) => l.name)).toEqual(["Aviasales", "Google Flights", "Skyscanner", "Kayak"]);
  });

  it("marks only the link that pays as a partner's", () => {
    expect(dated.filter((l) => l.partner).map((l) => l.id)).toEqual(["aviasales"]);
    expect(dated[0].partner).toBe("aviasales");
  });

  it("asks Google in plain English words, in the page's language", () => {
    expect(on("google", { from: RIGA, to: LISBON, depart: "2026-10-10", back: "2026-10-13" })).toBe("https://www.google.com/travel/flights?q=Flights%20from%20Riga%20to%20Lisbon%20on%202026-10-10%20through%202026-10-13&hl=en");
    expect(on("google", { from: RIGA, to: LISBON, depart: "2026-10-10", locale: "es" })).toBe("https://www.google.com/travel/flights?q=Flights%20from%20Riga%20to%20Lisbon%20on%202026-10-10&hl=es");
    expect(on("google", { from: RIGA, to: LISBON, locale: "es" })).toBe("https://www.google.com/travel/flights?q=Flights%20from%20Riga%20to%20Lisbon&hl=es");
  });

  it("gives Skyscanner lower-case codes, its own code for a city where there is one, and short dates", () => {
    expect(on("skyscanner", { from: LONDON, to: LISBON, depart: "2026-10-10", back: "2026-10-13" })).toBe("https://www.skyscanner.net/transport/flights/lond/lis/261010/261013/?adultsv2=2&cabinclass=economy&rtn=1");
    expect(on("skyscanner", { from: LONDON, to: LISBON, depart: "2026-10-10", adults: 1 })).toBe("https://www.skyscanner.net/transport/flights/lond/lis/261010/?adultsv2=1&cabinclass=economy&rtn=0");
    expect(on("skyscanner", { from: RIGA, to: LISBON })).toBe("https://www.skyscanner.net/transport/flights/rix/lis/?adultsv2=2&cabinclass=economy&rtn=0");
    expect(on("skyscanner", { from: airport("Paris"), to: airport("New York") })).toContain("/pari/nyca/");
  });

  it("never hands Skyscanner an IATA city code, which it doesn't know", () => {
    for (const a of AIRPORTS.filter((x) => x.metro)) {
      expect(on("skyscanner", { from: a, to: RIGA }), a.city).toMatch(/\/transport\/flights\/[a-z]{4}\/rix\//);
    }
  });

  it("gives Kayak upper-case codes, full dates and the number of adults", () => {
    expect(on("kayak", { from: LONDON, to: LISBON, depart: "2026-10-10", back: "2026-10-13" })).toBe("https://www.kayak.com/flights/LON-LIS/2026-10-10/2026-10-13/2adults");
    expect(on("kayak", { from: RIGA, to: LISBON, depart: "2026-10-10", adults: 3 })).toBe("https://www.kayak.com/flights/RIX-LIS/2026-10-10/3adults");
    expect(on("kayak", { from: RIGA, to: LISBON })).toBe("https://www.kayak.com/flights/RIX-LIS/2adults");
  });

  it("keeps travellers between one and four", () => {
    expect(on("kayak", { from: RIGA, to: LISBON, adults: 9 })).toMatch(/\/4adults$/);
    expect(on("kayak", { from: RIGA, to: LISBON, adults: 0 })).toMatch(/\/1adults$/);
  });

  it("ignores a date that isn't one, and a return with no departure", () => {
    const query = { from: RIGA, to: LISBON, depart: "10/10/2026", back: "2026-10-13" };
    expect(on("google", query)).toBe("https://www.google.com/travel/flights?q=Flights%20from%20Riga%20to%20Lisbon&hl=en");
    expect(on("skyscanner", query)).toContain("/rix/lis/?");
    expect(on("kayak", query)).toBe("https://www.kayak.com/flights/RIX-LIS/2adults");
    expect(on("aviasales", query)).toBe(`https://aviasales.tpm.lv/DHecFLiz?u=${encodeURIComponent("https://www.aviasales.com/")}`);
  });

  it("adds no partner id to the comparison sites until there is one", () => {
    expect(withPartner("skyscanner", "https://www.skyscanner.net/x")).toBe("https://www.skyscanner.net/x");
  });
});

describe("time in the air", () => {
  it("is about km / 780 hours plus half an hour on the ground, to five minutes", () => {
    expect(estimateFlight(0)).toBe(35);
    expect(estimateFlight(780)).toBe(95);
    expect(estimateFlight(2000)).toBe(190);
    expect(estimateFlight(2000) % 5).toBe(0);
  });

  it("reads the same in both languages", () => {
    expect(formatFlightTime(190)).toBe("3 h 10 min");
    expect(formatFlightTime(45)).toBe("45 min");
    expect(formatFlightTime(120)).toBe("2 h");
  });

  it("suggests a train under 600 km", () => {
    expect(trainHint(420)).toBe(true);
    expect(trainHint(600)).toBe(false);
  });
});

describe("airports", () => {
  it("knows cities by their Spanish names too", () => {
    expect(findAirport("Nápoles")?.iata).toBe("NAP");
    expect(findAirport("florencia")?.iata).toBe("FLR");
    expect(findAirport("Londres")?.metro).toBe("LON");
    expect(cityName(airport("NAP"), "es")).toBe("Nápoles");
    expect(cityName(airport("NAP"), "en")).toBe("Naples");
    expect(cityName(RIGA, "es")).toBe("Riga");
  });

  it("suggests by the start of a name in either language", () => {
    expect(suggestAirports("Flor").map((a) => a.iata)).toContain("FLR");
    expect(suggestAirports("Prag")[0]?.iata).toBe("PRG");
    expect(suggestAirports("Viena")[0]?.iata).toBe("VIE");
  });
});

describe("best months", () => {
  it("joins runs of months, in the page's language", () => {
    expect(monthRanges([3, 4, 5, 6, 9, 10], "en")).toMatch(/^Mar–Jun, Sept?–Oct$/);
    expect(monthRanges([4, 5, 6, 9, 10, 12], "en")).toMatch(/^Apr–Jun, Sept?–Oct, Dec$/);
    expect(monthRanges([6, 7, 8], "es")).toBe("Jun–Ago");
    expect(monthRanges([12], "es")).toBe("Dic");
  });
});

describe("preset trips", () => {
  it("are twelve, each with its own id", () => {
    expect(TRIPS).toHaveLength(12);
    expect(new Set(TRIPS.map((t) => t.id)).size).toBe(TRIPS.length);
    for (const trip of TRIPS) {
      expect(trip.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(getTrip(trip.id)).toBe(trip);
    }
  });

  it("say everything in English and in Spanish", () => {
    for (const trip of TRIPS) {
      for (const pair of [trip.title, trip.blurb, ...trip.stops.map((s) => s.note), ...trip.plan.map((d) => d.title)]) {
        expect(pair.en.trim(), trip.id).not.toBe("");
        expect(pair.es.trim(), trip.id).not.toBe("");
      }
      for (const day of trip.plan) {
        expect(day.items.en.length, `${trip.id} day ${day.day}`).toBe(day.items.es.length);
        expect(day.items.en.length, `${trip.id} day ${day.day}`).toBeGreaterThanOrEqual(3);
        expect(day.items.en.length, `${trip.id} day ${day.day}`).toBeLessThanOrEqual(5);
        for (const item of [...day.items.en, ...day.items.es]) expect(item.trim()).not.toBe("");
      }
    }
  });

  it("plan every day, and sleep every night but the last", () => {
    for (const trip of TRIPS) {
      expect(trip.plan.map((d) => d.day), trip.id).toEqual(Array.from({ length: trip.days }, (_, i) => i + 1));
      expect(trip.stops.reduce((n, s) => n + s.nights, 0), trip.id).toBe(trip.days - 1);
    }
  });

  it("have real routes: two stops or more, on the map, none a day's drive from the next", () => {
    for (const trip of TRIPS) {
      expect(trip.stops.length, trip.id).toBeGreaterThanOrEqual(2);
      trip.stops.forEach((s, i) => {
        expect(Math.abs(s.lat), `${trip.id} ${s.name}`).toBeLessThanOrEqual(90);
        expect(Math.abs(s.lng), `${trip.id} ${s.name}`).toBeLessThanOrEqual(180);
        expect(s.nights).toBeGreaterThanOrEqual(0);
        const next = trip.stops[i + 1];
        if (next) expect(distanceKm(s, next), `${trip.id}: ${s.name} to ${next.name}`).toBeLessThan(400);
      });
    }
  });

  it("fly into an airport we know, near where the trip starts", () => {
    for (const trip of TRIPS) {
      const landing = AIRPORTS.find((a) => a.iata === trip.flyTo);
      expect(landing, trip.id).toBeDefined();
      expect(distanceKm(landing!, trip.stops[0]), trip.id).toBeLessThan(150);
    }
  });

  it("have sensible facts", () => {
    for (const trip of TRIPS) {
      expect(TRIP_KINDS).toContain(trip.kind);
      expect([1, 2, 3]).toContain(trip.budget);
      expect(trip.bestMonths.length, trip.id).toBeGreaterThan(0);
      for (const m of trip.bestMonths) expect(m >= 1 && m <= 12, trip.id).toBe(true);
    }
  });

  it("have a picture in both sizes, or none at all", () => {
    for (const trip of TRIPS) {
      if (!trip.image) continue;
      expect(trip.image).toBe(`/trips/${trip.id}.webp`);
      expect(existsSync(join(process.cwd(), "public", trip.image)), trip.image).toBe(true);
      expect(existsSync(join(process.cwd(), "public", tripImageSm(trip.image))), tripImageSm(trip.image)).toBe(true);
    }
  });

  it("never mention Spain, in the trips or anywhere on the trips pages", () => {
    for (const trip of TRIPS) for (const text of visibleText(trip)) expect(text, trip.id).not.toMatch(SPAIN);
    for (const text of [...strings(en.trips), ...strings(es.trips), en.nav.trips, es.nav.trips]) expect(text).not.toMatch(SPAIN);
  });
});

describe("a preset trip as a surprise", () => {
  it("is a ticket from where the road starts to where it ends, with the towns on the way as stops", () => {
    const amalfi = getTrip("amalfi-coast")!;
    expect(tripGiftFields(amalfi, "en")).toEqual({ trip: "road", fromCity: "Naples", fromCoords: "", toCity: "Ravello", toCoords: "40.6487, 14.6127", stops: ["Pompeii", "Sorrento", "Positano", "Amalfi"], nights: 5, clues: [] });
    expect(tripGiftFields(amalfi, "es")).toMatchObject({ fromCity: "Nápoles", stops: ["Pompeya", "Sorrento", "Positano", "Amalfi"] });
    // Not from their home airport: they fly to Naples and drive from there, not 1,900 km from Riga.
    expect(tripGiftFields(amalfi, "en", RIGA)).toMatchObject({ fromCity: "Naples" });
    for (const trip of TRIPS.filter((t) => t.kind === "road")) expect(tripGiftFields(trip, "en", RIGA).fromCity, trip.id).toBe(trip.stops[0].name);
  });

  it("leaves the coordinates out where the name is enough", () => {
    const baltic = tripGiftFields(getTrip("baltic-coast")!, "es");
    expect(baltic).toMatchObject({ trip: "road", toCity: "Tallin", toCoords: "", stops: ["Sigulda", "Cēsis", "Pärnu"], nights: 6 });
  });

  it("flies to where the other trips land, in the gift's language", () => {
    expect(tripGiftFields(getTrip("lisbon-slow-weekend")!, "es")).toEqual({ trip: "flight", toCity: "Lisboa", toCoords: "", stops: [], nights: 2, clues: [] });
    expect(tripGiftFields(getTrip("santorini-naxos")!, "en")).toMatchObject({ trip: "flight", toCity: "Santorini" });
    expect(tripGiftFields(getTrip("prague-krumlov-vienna")!, "en")).toMatchObject({ trip: "train", toCity: "Prague", stops: [] });
  });

  it("starts from where they last flew from, when there is somewhere", () => {
    expect(tripGiftFields(getTrip("paris-without-cliches")!, "es", LONDON)).toMatchObject({ toCity: "París", fromCity: "Londres", fromCoords: "" });
    expect(tripGiftFields(getTrip("paris-without-cliches")!, "en")).not.toHaveProperty("fromCity");
  });

  it("always fits the template's fields", () => {
    for (const trip of TRIPS) {
      for (const locale of ["en", "es"] as const) {
        const parsed = packYourBags.safeParse(tripGiftFields(trip, locale, RIGA));
        expect(parsed.success, `${trip.id} (${locale})`).toBe(true);
      }
    }
  });
});
