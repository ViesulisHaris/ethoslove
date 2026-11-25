import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { countWord } from "@/lib/count-words";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import sitemap from "@/app/sitemap";
import { HALFWAY_TOOL, HALFWAY_TOOL_PATH } from "@/content/halfway-tool";
import { pageUpdated, ROOMS_LIVE } from "@/content/page-dates";
import { ART_IDS, artVariants } from "@/content/page-art";
import { HALFWAY_ART, MATCH_ART, ROOMS_PLACEMENTS, ROOMS_THEME } from "@/content/rooms-art";
import { DEFAULT_PAGE_THEME } from "@/content/template-page-themes";
import { TRIP_SEO } from "@/content/trip-seo";
import { GAMES } from "@/lib/games/catalogue";
import { CITY_PAGES, mentionsSpain } from "@/lib/cities/cities";
import { ANNIVERSARY_LED, showsAnniversaryDates } from "@/lib/lifecycle/anniversary-dates";
import { LDR_GAMES } from "@/lib/ldr/games";
import { TRIP_GIFT_SLUG } from "@/lib/trips/trip-gift";
import { nearestAirport } from "@/lib/trips/airports";
import { echoTheirs, halfwayAnswer, inNeverNamed, namesAirport, planTheirs, halfwayBetween, halfwayCityName, isEven, isOwnTown, mapLink, needsMap, readsMiles, regionFor, tableFair } from "@/lib/ldr/halfway";
import { fairKm, pickSpot, spotAt } from "@/lib/places/photon-reverse";
import { halfwayQuery, readHalfwayLink } from "@/lib/ldr/halfway-link";
import { cityPageNear, HALFWAY_GIFT_SLUG, halfwayGiftFields, tripNear } from "@/lib/ldr/ways";
import { waysData } from "@/lib/ldr/ways-data";
import { fieldsSchema as halfwaySchema } from "@/templates/halfway/schema";
import { getManifest } from "@/templates/manifests";
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
        // With the site's " · Ethos" tail, at most 60: about where Google cuts a title.
        expect(`${seo.title[l]} · Ethos`.length, `${id} ${l} title: ${seo.title[l]}`).toBeLessThanOrEqual(60);
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
      expect(`${m.trips.meta.title.replace("{count}", "12")} · Ethos`.length).toBeLessThanOrEqual(60);
    }
    // The descriptions say the number in words, read from the shelf (lib/count-words.ts), and fit a search result.
    for (const [lang, m] of [
      ["en", en],
      ["es", es],
    ] as const) {
      const description = m.trips.meta.description.replace("{trips}", countWord(TRIPS.length, lang));
      expect(description).toContain(`${countWord(TRIPS.length, lang)} `);
      expect(description.length).toBeLessThanOrEqual(160);
    }
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
  it("the table's nearest city to Riga and Lisbon's middle is Luxembourg, and it knows how far for each", () => {
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

describe("the halfway answer, table and map together", () => {
  const AUSTIN = { name: "Austin", lat: 30.27, lng: -97.74 };
  const DENVER = { name: "Denver", lat: 39.74, lng: -104.99 };
  const BOSTON = { name: "Boston", lat: 42.36, lng: -71.06 };
  const NEW_YORK = { name: "New York", lat: 40.71, lng: -74.01 };
  const CHICAGO = { name: "Chicago", lat: 41.88, lng: -87.63 };
  /** A Photon answer of one place. */
  const photon = (name: string, lat: number, lng: number, extra: Record<string, string> = {}) => ({ features: [{ geometry: { coordinates: [lng, lat] }, properties: { name, ...extra } }] });
  const EMPTY = { features: [] };

  it("a city in the table near the middle and fair to both is named without asking the map", () => {
    const h = halfwayBetween(town("London"), town("Edinburgh"));
    expect(tableFair(h)).toBe(true);
    expect(needsMap(h)).toBe(false);
    expect(halfwayAnswer(h, town("London"), town("Edinburgh"), undefined, "en")).toMatchObject({ kind: "city", name: "Manchester", fromMap: false });
    expect(halfwayAnswer(halfwayBetween(town("Prague"), town("Milan")), town("Prague"), town("Milan"), undefined, "es")).toMatchObject({ kind: "city", name: "Múnich" });
  });

  it("a city in the table that is not fair to both is never named as halfway: the map is asked", () => {
    const PHILADELPHIA = { name: "Philadelphia", lat: 39.95, lng: -75.17 };
    // New York, 306 km from Boston and 130 from Philadelphia; Luxembourg, 1,440 km from Riga and
    // 1,711 from Lisbon; Munich, 504 km from Berlin and 697 from Rome; Paris, 455 from Bristol, 640 from Milan.
    for (const [a, b] of [
      [BOSTON, PHILADELPHIA],
      [town("Riga"), town("Lisbon")],
      [town("Berlin"), town("Rome")],
      [town("Bristol"), town("Milan")],
    ]) {
      const h = halfwayBetween(a, b);
      expect(h.near, `${a.name}–${b.name}`).not.toBeNull();
      expect(tableFair(h), `${a.name}–${b.name}`).toBe(false);
      expect(needsMap(h), `${a.name}–${b.name}`).toBe(true);
      expect(halfwayAnswer(h, a, b, undefined, "en").kind).toBe("pending");
    }
  });

  it("'almost exactly halfway' only when the two journeys are as good as even", () => {
    expect(isEven(262, 282)).toBe(true);
    expect(isEven(100, 104)).toBe(true);
    expect(isEven(3, 9)).toBe(true);
    // Dallas and Houston at Madisonville (136 miles against 88); Leeds and Bristol (92 against 77).
    expect(isEven(219, 142)).toBe(false);
    expect(isEven(148, 124)).toBe(false);
  });

  it("dry land far from any city in the table is never called the sea (Austin and Denver)", () => {
    const h = halfwayBetween(AUSTIN, DENVER);
    expect(needsMap(h)).toBe(true);
    // While the map is asked, and when it cannot be: how far each, and no claim about the place.
    expect(halfwayAnswer(h, AUSTIN, DENVER, undefined, "en").kind).toBe("pending");
    expect(halfwayAnswer(h, AUSTIN, DENVER, null, "en").kind).toBe("failed");
    // Land with no town near: said as such.
    expect(halfwayAnswer(h, AUSTIN, DENVER, { kind: "none" }, "en").kind).toBe("none");
    // The map's town is named, with its state and how far for each.
    const named = halfwayAnswer(h, AUSTIN, DENVER, { kind: "town", name: "Amarillo", region: "Texas", countryCode: "US", lat: 35.21, lng: -101.84 }, "en");
    expect(named).toMatchObject({ kind: "city", name: "Amarillo", region: "Texas", fromMap: true });
    if (named.kind !== "city") throw new Error("named");
    near(named.offKm, 65, 3);
    near(named.kmFromA, 670, 5);
    near(named.kmFromB, 575, 5);
  });

  it("their own towns as the table's nearest city send the question to the map (Boston and New York)", () => {
    const h = halfwayBetween(BOSTON, NEW_YORK);
    expect(needsMap(h)).toBe(true);
    expect(halfwayAnswer(h, BOSTON, NEW_YORK, { kind: "town", name: "Middletown", region: "Connecticut", lat: 41.56, lng: -72.65 }, "en")).toMatchObject({ kind: "city", name: "Middletown" });
    // The map finds only one of their own towns: nothing between them to name.
    expect(halfwayAnswer(h, BOSTON, NEW_YORK, { kind: "town", name: "Boston", lat: 42.36, lng: -71.06 }, "en").kind).toBe("between");
  });

  it("a table city far off the middle is not the answer (New York and Chicago are not met in Toronto)", () => {
    const h = halfwayBetween(NEW_YORK, CHICAGO);
    expect(needsMap(h)).toBe(true);
    expect(halfwayAnswer(h, NEW_YORK, CHICAGO, { kind: "none" }, "en").kind).toBe("none");
  });

  it("the open sea is said only when the map has nothing there", () => {
    const h = halfwayBetween(town("New York"), town("London"));
    expect(needsMap(h)).toBe(true);
    expect(halfwayAnswer(h, town("New York"), town("London"), { kind: "sea" }, "en").kind).toBe("sea");
  });

  it("a town the map finds in Spain is never named", () => {
    const h = halfwayBetween(AUSTIN, DENVER);
    expect(halfwayAnswer(h, AUSTIN, DENVER, { kind: "town", name: "Somewhere", countryCode: "ES", lat: 35, lng: -101.5 }, "en").kind).toBe("unnamed");
    expect(halfwayAnswer(halfwayBetween(town("Lisbon"), town("Paris")), town("Lisbon"), town("Paris"), undefined, "en").kind).toBe("unnamed");
  });

  it("the map's answer: a city near enough to be fair, else a town, then the sea only with nothing mapped near", () => {
    const at = { lat: 35.06, lng: -101.15 };
    const amarillo = photon("Amarillo", 35.21, -101.84, { state: "Texas", countrycode: "us" });
    const claude = photon("Claude", 35.11, -101.36);
    // Austin and Denver, 621 km each: Amarillo, 64 km off the middle, is fair.
    expect(pickSpot(at, 621, amarillo, claude, null)).toMatchObject({ kind: "town", name: "Amarillo", region: "Texas", countryCode: "US" });
    // On a 117 km journey a city 64 km off is not halfway: the town by the middle is.
    expect(pickSpot(at, 117, amarillo, claude, null)).toMatchObject({ kind: "town", name: "Claude" });
    // With no town that near, the city still beats saying nothing.
    expect(pickSpot(at, 117, amarillo, EMPTY, null)).toMatchObject({ kind: "town", name: "Amarillo" });
    expect(pickSpot(at, 621, EMPTY, claude, null)).toMatchObject({ kind: "town", name: "Claude" });
    // Nothing named, and not yet asked whether anything is mapped there.
    expect(pickSpot(at, 621, EMPTY, EMPTY, null)).toBeNull();
    expect(pickSpot(at, 621, EMPTY, EMPTY, photon("County Road 14", 34.99, -101.38))).toEqual({ kind: "none" });
    expect(pickSpot({ lat: 45, lng: -40 }, 2780, EMPTY, EMPTY, EMPTY)).toEqual({ kind: "sea" });
    // A place beyond the radius asked for is not taken, and a malformed one is dropped.
    expect(pickSpot(at, 621, photon("Far", 40, -101.5), EMPTY, EMPTY)).toEqual({ kind: "sea" });
    expect(pickSpot(at, 621, { features: [{ properties: { name: "x" } }, null] }, EMPTY, EMPTY)).toEqual({ kind: "sea" });
    expect(fairKm(117)).toBe(40);
    expect(fairKm(621)).toBe(100);
    expect(fairKm(280)).toBe(70);
  });

  it("distances are in miles for visitors from the United States and the United Kingdom", () => {
    for (const where of ["US", "en-US", "GB", "en-GB", "PR"]) expect(readsMiles(where), where).toBe(true);
    for (const where of ["LV", "en", "es-ES", "es-MX", "", null, undefined]) expect(readsMiles(where), String(where)).toBe(false);
  });

  describe("the map is always asked for names in English", () => {
    afterEach(() => vi.unstubAllGlobals());
    it("on any page: with no language Photon answers 恵那市 or Бологое, which no page of ours can read", async () => {
      const asked: string[] = [];
      vi.stubGlobal("fetch", async (url: string) => {
        asked.push(url);
        return new Response(JSON.stringify({ features: [{ geometry: { coordinates: [137.41, 35.45] }, properties: { name: "Ena", state: "Gifu Prefecture", countrycode: "JP" } }] }));
      });
      expect(await spotAt({ lat: 35.4, lng: 137.4 }, 200)).toMatchObject({ kind: "town", name: "Ena", region: "Gifu Prefecture" });
      expect(asked.length).toBeGreaterThan(0);
      for (const url of asked) expect(new URL(url).searchParams.get("lang"), url).toBe("en");
    });
  });

  it("a halfway with no town to name can be seen on a map", () => {
    expect(mapLink({ lat: 35.123456, lng: -101.5 })).toBe("https://www.openstreetmap.org/?mlat=35.1235&mlon=-101.5#map=8/35.1235/-101.5");
  });

  describe("a town from the map is as fair to both as a city from the table (Dallas and Houston)", () => {
    const DALLAS = { name: "Dallas", lat: 32.78, lng: -96.8 };
    const HOUSTON = { name: "Houston", lat: 29.76, lng: -95.37 };
    const MADISONVILLE = { name: "Madisonville", region: "Texas", countryCode: "US", lat: 30.95, lng: -95.91 };
    const CENTERVILLE = { name: "Centerville", region: "Texas", countryCode: "US", lat: 31.26, lng: -95.98 };
    const h = halfwayBetween(DALLAS, HOUSTON);

    it("the nearest town to the middle is passed over when one of them travels much further", () => {
      expect(needsMap(h)).toBe(true);
      const off = halfwayAnswer(h, DALLAS, HOUSTON, { kind: "town", ...MADISONVILLE }, "en");
      // 219 km against 142: never "halfway", and no other town was found, so how far each, and the map.
      expect(off.kind).toBe("uneven");
    });

    it("another town the map found near the middle is named when it is even", () => {
      const answer = halfwayAnswer(h, DALLAS, HOUSTON, { kind: "town", ...MADISONVILLE, also: [CENTERVILLE] }, "en");
      expect(answer).toMatchObject({ kind: "city", name: "Centerville", region: "Texas", fromMap: true });
      if (answer.kind !== "city") throw new Error("named");
      expect(Math.abs(answer.kmFromA - answer.kmFromB)).toBeLessThanOrEqual(fairKm(h.km / 2));
    });

    it("the map hands the page every town near the middle, in order, for it to choose from", () => {
      // Centerville nearer the middle than Madisonville; Crockett beyond the 50 km asked for towns.
      const towns = { features: [...photonFeature("Madisonville", 30.95, -95.91), ...photonFeature("Crockett", 31.32, -95.46), ...photonFeature("Centerville", 31.26, -95.98)] };
      const spot = pickSpot(h.middle, h.km / 2, EMPTY, towns, null);
      expect(spot).toEqual({ kind: "town", name: "Centerville", lat: 31.26, lng: -95.98, also: [{ name: "Madisonville", lat: 30.95, lng: -95.91 }] });
    });
  });

  it("a Spanish page names the map town's country in Spanish, never the map's English region", () => {
    const h = halfwayBetween(AUSTIN, DENVER);
    const amarillo = { kind: "town" as const, name: "Amarillo", region: "Texas", countryCode: "US", lat: 35.21, lng: -101.84 };
    expect(halfwayAnswer(h, AUSTIN, DENVER, amarillo, "en")).toMatchObject({ region: "Texas" });
    expect(halfwayAnswer(h, AUSTIN, DENVER, amarillo, "es")).toMatchObject({ region: "Estados Unidos" });
    expect(regionFor({ region: "Great East", countryCode: "FR" }, "es")).toBe("Francia");
    expect(regionFor({ region: "Gifu Prefecture", countryCode: "JP" }, "es")).toBe("Japón");
    expect(regionFor({ region: "Tver Oblast" }, "es")).toBeUndefined();
    expect(regionFor({ region: "Tver Oblast", countryCode: "RU" }, "en")).toBe("Tver Oblast");
  });

  it("their own town is offered for dates only once the answer is known to name nothing it should not", () => {
    const each = { eachKm: 250, middle: { lat: 41, lng: -2 } };
    for (const kind of ["pending", "failed", "unnamed"] as const) expect(echoTheirs({ kind, ...each }), kind).toBe(false);
    for (const kind of ["none", "sea", "between", "uneven"] as const) expect(echoTheirs({ kind, ...each }), kind).toBe(true);
    expect(echoTheirs(null)).toBe(false);
  });

  it("a typed town in a country never named is never echoed, whatever the answer (Nantes and Bilbao are uneven)", () => {
    const each = { eachKm: 160, middle: { lat: 43.6, lng: -1.2 } };
    const bilbao = { lat: 43.263, lng: -2.935 };
    const sanSebastian = { lat: 43.3183, lng: -1.9812 };
    const bordeaux = { lat: 44.8378, lng: -0.5792 };
    expect(inNeverNamed(bilbao)).toBe(true);
    expect(inNeverNamed(sanSebastian)).toBe(true);
    expect(inNeverNamed(bordeaux)).toBe(false);
    expect(inNeverNamed({ lat: 48.8566, lng: 2.3522 })).toBe(false);
    for (const kind of ["none", "sea", "between", "uneven"] as const) {
      expect(echoTheirs({ kind, ...each }, bilbao), kind).toBe(false);
      expect(echoTheirs({ kind, ...each }, bordeaux), kind).toBe(true);
    }
    const city = { kind: "city" as const, name: "Mont-de-Marsan", lat: 43.89, lng: -0.5, offKm: 20, kmFromA: 80, kmFromB: 80, fromMap: true };
    expect(echoTheirs(city, bilbao)).toBe(false);
  });

  it("the flights row names a home airport only where the dates links may name its town (Bordeaux and Bilbao)", () => {
    const bilbao = { lat: 43.263, lng: -2.935 };
    const bordeaux = { lat: 44.8378, lng: -0.5792 };
    const bio = nearestAirport(bilbao)!.airport;
    const bod = nearestAirport(bordeaux)!.airport;
    expect(namesAirport(bio, bilbao)).toBe(false);
    expect(namesAirport(bod, bordeaux)).toBe(true);
    // Either half is enough: a Spanish airport for a French town, or a French one for a town near the border.
    expect(namesAirport(bio, bordeaux)).toBe(false);
    expect(namesAirport(bod, { lat: 43.3183, lng: -1.9812 })).toBe(false);
    expect(namesAirport(nearestAirport({ lat: 40.4168, lng: -3.7038 })!.airport, { lat: 40.4168, lng: -3.7038 })).toBe(false);
    expect(namesAirport(nearestAirport({ lat: 48.2082, lng: 16.3738 })!.airport, { lat: 48.2082, lng: 16.3738 })).toBe(true);
  });

  it("Plan the next visit keeps a town that may be named while the map is asked or after it failed, and drops one in Spain (Prague and Vienna, Madrid and Barcelona)", () => {
    const each = { eachKm: 125, middle: { lat: 48.9, lng: 15.5 } };
    const vienna = { lat: 48.2082, lng: 16.3738 };
    const barcelona = { lat: 41.3874, lng: 2.1686 };
    for (const answer of [null, { kind: "pending" as const, ...each }, { kind: "failed" as const, ...each }]) {
      expect(planTheirs(answer, vienna), answer?.kind ?? "none yet").toBe(true);
      expect(planTheirs(answer, barcelona), answer?.kind ?? "none yet").toBe(false);
    }
    // Once the answer is known, the dates link's rule: nothing where halfway is never named.
    expect(planTheirs({ kind: "unnamed", ...each }, vienna)).toBe(false);
    expect(planTheirs({ kind: "none", ...each }, vienna)).toBe(true);
    expect(planTheirs({ kind: "uneven", ...each }, barcelona)).toBe(false);
  });
});

/** Photon features of one place, to put several in one answer. */
const photonFeature = (name: string, lat: number, lng: number) => [{ geometry: { coordinates: [lng, lat] }, properties: { name } }];

describe("the halfway finder's link", () => {
  const riga = town("Riga");
  const lisbon = town("Lisbon");
  const link = (query: string) => readHalfwayLink(new URLSearchParams(query));

  it("a link carries the two towns and reads back the same", () => {
    const query = halfwayQuery(riga, lisbon);
    expect(query).toBe("a=Riga~56.95~24.11&b=Lisbon~38.72~-9.14");
    expect(link(query)).toEqual({ a: { name: "Riga", lat: 56.95, lng: 24.11 }, b: { name: "Lisbon", lat: 38.72, lng: -9.14 } });
    for (const name of ["São Paulo", "Ho Chi Minh City"]) {
      const back = link(halfwayQuery({ ...riga, name }, lisbon));
      expect(back?.a.name).toBe(name);
    }
  });

  it("a link that is not two whole towns is no link", () => {
    for (const bad of ["a=Riga~56.95~24.11", "a=Riga&b=Lisbon~38.72~-9.14", "a=Riga~91~0&b=Lisbon~38.72~-9.14", "a=Riga~56.95~x&b=Lisbon~38.72~-9.14", "a=~56.95~24.11&b=Lisbon~38.72~-9.14", "a=https%3A%2F%2Fx.example~56.95~24.11&b=Lisbon~38.72~-9.14", "a=Riga~1e2~3&b=Lisbon~38.72~-9.14"])
      expect(link(bad), bad).toBeNull();
    const long = "x".repeat(90);
    expect(link(halfwayQuery({ ...riga, name: long }, lisbon))?.a.name).toHaveLength(60);
    expect(link(halfwayQuery({ ...riga, name: "Riga~Old Town" }, lisbon))?.a.name).toBe("Riga Old Town");
    expect(link(`${halfwayQuery(riga, lisbon)}&utm_source=x`)?.b.name).toBe("Lisbon");
  });

  it("a link never says more than a town", () => {
    const query = halfwayQuery({ name: "Riga", lat: 56.949612, lng: 24.105186 }, lisbon);
    const params = new URLSearchParams(query);
    expect([...params.keys()]).toEqual(["a", "b"]);
    for (const n of query.match(/-?d+.d+/g) ?? []) expect(n.split(".")[1].length, n).toBeLessThanOrEqual(2);
  });
});

describe("the ways on from a halfway city", () => {
  const data = waysData("en");
  const at = (name: string) => town(name);

  it("the halfway city is 'one of ours' within 25 km of a dates page", () => {
    expect(cityPageNear(at("Manchester"), data.cities)?.slug).toBe("manchester");
    expect(cityPageNear(at("Luxembourg"), data.cities)).toBeNull();
    expect(cityPageNear(null, data.cities)).toBeNull();
  });

  it("the next visit is the trip that starts nearest, if one starts within reach", () => {
    expect(tripNear([at("Luxembourg"), at("Riga"), at("Lisbon")], data.trips)?.id).toBe("baltic-coast");
    expect(tripNear([null, at("London"), at("New York")], data.trips)?.id).toBe("paris-without-cliches");
    expect(tripNear([at("Toronto"), at("Chicago"), at("Boston")], data.trips)).toBeNull();
    expect(tripNear([], data.trips)).toBeNull();
  });

  it("the Halfway gift takes what the finder hands it", () => {
    const riga = at("Riga");
    const lisbon = at("Lisbon");
    const fields = halfwayGiftFields(riga, lisbon, "Halfway is Luxembourg. Meet me there?");
    const parsed = halfwaySchema.safeParse({ ...halfwaySchema.parse({}), ...fields });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.from.name).toBe("Riga");
    expect(parsed.data?.to.name).toBe("Lisbon");
    expect(parsed.data?.stops).toEqual([]);
    expect(parsed.data?.halfwayNote).toBe("Halfway is Luxembourg. Meet me there?");
    expect((halfwayGiftFields({ ...riga, name: "x".repeat(90) }, lisbon).from as { name: string }).name).toHaveLength(60);
    expect(halfwayGiftFields(riga, lisbon, "y".repeat(200)).halfwayNote).toHaveLength(120);
    expect("halfwayNote" in halfwayGiftFields(riga, lisbon)).toBe(false);
    expect("distanceKm" in fields).toBe(false);
    expect(getManifest(HALFWAY_GIFT_SLUG)).toBeDefined();
  });

  it("what the server hands the ways on is whole", () => {
    const es = waysData("es");
    const onDisk = (file: string) => fs.existsSync(path.join(process.cwd(), "public", file));
    expect(es.cities).toHaveLength(CITY_PAGES.length);
    for (const c of es.cities) expect(onDisk(c.image), c.image).toBe(true);
    expect(es.cities.find((c) => c.slug === "lisbon")?.name).toBe("Lisboa");
    expect(es.trips).toHaveLength(12);
    for (const tr of es.trips) {
      const trip = getTrip(tr.id)!;
      expect([tr.lat, tr.lng]).toEqual([trip.stops[0].lat, trip.stops[0].lng]);
      if (tr.image) expect(onDisk(tr.image), tr.image).toBe(true);
    }
    expect(onDisk(es.giftPoster)).toBe(true);
    expect(onDisk(es.datesImage)).toBe(true);
  });
});

/** Every string in a value, with where it is. */
function strings(value: unknown, where: string): [string, string][] {
  if (typeof value === "string") return [[where, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${where}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${where}.${k}`));
  return [];
}
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const MESSAGES = { en, es } as const;

describe("the share screen's line to date ideas", () => {
  it("date ideas are offered after an anniversary gift, and only then", () => {
    expect(showsAnniversaryDates("our-timeline", true)).toBe(true);
    // A guest never sees the reminders the line sits under, so not the line either.
    expect(showsAnniversaryDates("our-timeline", false)).toBe(false);
    // The Letter (apologies too) and Museum (mother's and father's day) list anniversary first and are
    // still not anniversary gifts; nor a birthday's, a Valentine's, long distance's, the trip gift, or none.
    for (const slug of ["the-letter", "museum", "garden", "birthday-cinema", "bouquet", "halfway", "pack-your-bags", "nope"]) expect(showsAnniversaryDates(slug, true), slug).toBe(false);
    expect(ANNIVERSARY_LED.has(TRIP_GIFT_SLUG)).toBe(false);
    // Every name on the list is a template that lists anniversary among its occasions.
    for (const slug of ANNIVERSARY_LED) expect(getManifest(slug)?.occasions, slug).toContain("anniversary");
  });
});

describe("the rooms' pages", () => {
  it("the flowers of these pages follow the art's rules", () => {
    const KEYS = new Set(["art", "x", "y", "size", "rot", "blur", "opacity", "phone", "eager", "from", "until", "top"]);
    for (const p of ROOMS_PLACEMENTS) {
      expect(ART_IDS as readonly string[]).toContain(p.art);
      expect(p.art).not.toBe("lily-footer");
      expect(Math.abs(p.rot)).toBeLessThanOrEqual(25);
      for (const k of Object.keys(p)) expect(KEYS.has(k), k).toBe(true);
      expect(artVariants(p.art).some((v) => v === "ivory" || v === "plain"), p.art).toBe(true);
      if (p.art === "lily-stem-tall") expect(p.phone).not.toBe("only");
    }
    // The matcher is far below the first screen: nothing of it is fetched eagerly.
    expect(MATCH_ART.some((p) => p.eager)).toBe(false);
    expect(HALFWAY_ART.length).toBeGreaterThan(0);
    // The site's own theme, with the ivory lilies.
    expect(ROOMS_THEME).toEqual({ ...DEFAULT_PAGE_THEME, flowers: "ivory" });
  });

  it("the words fit the page", () => {
    for (const l of LOCALES) {
      const m = MESSAGES[l];
      const short: [string, string][] = [
        ["trips.match.line", m.trips.match.line.replace("{count}", "12")],
        ["trips.match.fromHint", m.trips.match.fromHint],
        ["HALFWAY_TOOL.line", HALFWAY_TOOL[l].line],
        ["HALFWAY_TOOL.questionsLine", HALFWAY_TOOL[l].questionsLine],
        ["ldr.play.title", m.ldr.play.title],
        ["ldr.meet.tool", (m.ldr.meet as Record<string, string>).tool ?? ""],
      ];
      for (const [key, text] of short) expect(words(text), `${l} ${key}: ${text}`).toBeLessThanOrEqual(14);
      const titles: [string, string][] = [
        ["ldr.ways.gift.title", m.ldr.ways.gift.title],
        ["ldr.ways.dates.in", m.ldr.ways.dates.in.replace("{city}", "Ho Chi Minh City")],
        ["ldr.ways.dates.any", m.ldr.ways.dates.any],
        ["ldr.ways.trip.any", m.ldr.ways.trip.any],
        ...TRIPS.map((t) => [`trip ${t.id}`, t.title[l]] as [string, string]),
      ];
      for (const [key, text] of titles) expect(words(text), `${l} ${key}: ${text}`).toBeLessThanOrEqual(9);
      for (const { q, a } of HALFWAY_TOOL[l].faq) expect(words(a), `${l} ${q}`).toBeLessThanOrEqual(180);
      expect(m.ldr.ways.note.replace("{city}", "x".repeat(60)).length, `${l} ldr.ways.note`).toBeLessThanOrEqual(120);
      // Long distance's title with the site's " · Ethos" fits Google's cut of about 60 letters.
      expect(`${m.ldr.meta.title} · Ethos`.length, `${l} ldr.meta.title`).toBeLessThanOrEqual(60);
      // The FAQ says what the code does: a big city is named only when it is fair to both (tableFair), not "within 150 km".
      const how = HALFWAY_TOOL[l].faq[0].a;
      expect(how, l).not.toMatch(/150/);
      expect(how, l).toMatch(l === "en" ? /about as far from each of you/ : /distancia parecida de los dos/);
      // The budget is said in words: no sum in any one currency.
      for (const v of ["1", "2", "any"] as const) expect(m.trips.match.budget[v], `${l} budget ${v}`).not.toMatch(/[€$£]|\{money\}|\d/);
    }
  });

  it("nothing in the new words mentions Spain", () => {
    const found: string[] = [];
    for (const l of LOCALES) {
      const m = MESSAGES[l] as Record<string, Record<string, unknown>>;
      const sources: [string, unknown][] = [
        ["trips.match", m.trips.match],
        ["ldr.ways", m.ldr.ways],
        ["ldr.play", m.ldr.play],
        ["ldr.tool", m.ldr.tool],
        ["lifecycle.dates", (m.lifecycle as Record<string, unknown>).dates],
        ["TRIP_SEO", Object.fromEntries(Object.entries(TRIP_SEO).map(([id, v]) => [id, [v.title[l], v.description[l]]]))],
        ["HALFWAY_TOOL", HALFWAY_TOOL[l]],
      ];
      for (const [name, value] of sources) for (const [where, text] of strings(value, `${l} ${name}`)) if (mentionsSpain(text)) found.push(`${where}: ${text}`);
    }
    expect(found).toEqual([]);
  });

  it("the sitemap lists the halfway finder in both languages, dated, and the rooms' dates belong to pages", () => {
    const pages = sitemap();
    for (const prefix of ["", "/es"]) {
      const entry = pages.find((p) => p.url.endsWith(`${prefix}${HALFWAY_TOOL_PATH}`) && (prefix ? true : !p.url.includes("/es/")));
      expect(entry, prefix + HALFWAY_TOOL_PATH).toBeDefined();
      expect(entry?.lastModified).toBe(ROOMS_LIVE);
    }
    for (const path of ["/trips", "/trips/amalfi-coast", "/long-distance", HALFWAY_TOOL_PATH]) expect(pageUpdated(path), path).toBe(ROOMS_LIVE);
    expect(ROOMS_LIVE <= new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it("the games for a call come from the games' own shelf, and each one's page exists", () => {
    expect(LDR_GAMES.map((g) => g.href)).toEqual(["/games/drawing-game", "/games/would-you-rather"]);
    for (const g of LDR_GAMES) {
      const shelf = GAMES.find((x) => x.href === g.href)!;
      expect([g.rank, g.suit, g.sticker]).toEqual([shelf.rank, shelf.suit, shelf.sticker]);
      // A link to a page that is not there is a 404 on the live room (it happened with /games/today).
      const page = path.join(process.cwd(), "src/app/[currency]/[locale]/(marketing)", g.href, "page.tsx");
      expect(fs.existsSync(page), page).toBe(true);
    }
  });
});
