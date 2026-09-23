import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addDays, formatDay, fromYmd, isYmd, monthGrid, thisWeekend, toYmd, weekdayOf } from "@/lib/dates/calendar";
import { addressLine, detailsFromTags, isPlaceId, nominatimIdOf, parseNominatim, parseOverpassOne, safeUrl } from "@/lib/dates/details";
import { distanceKm, formatDistance, isLatLng, midpoint, snapSearch, walkingMinutes } from "@/lib/dates/geo";
import { closesAt, formatHours, hoursOn, isOpenAt } from "@/lib/dates/hours";
import { IDEAS, ideaById, ideasFor, isDoable, suggestStops, VIBE_IDS } from "@/lib/dates/ideas";
import { GROUP_IDS, GROUPS, KIND_IDS, KINDS, kindOf, kindOfPoi, kindsIn } from "@/lib/dates/kinds";
import { boxAround, buildIdQuery, buildRareQuery } from "@/lib/dates/overpass";
import { balance, parseOverpass, scorePlace, type Place } from "@/lib/dates/places";
import { addStop, decodePlan, EMPTY_PLAN, encodePlan, MAX_STOPS, moveStop, parseStoredPlan, removeStop, type Plan, type PlanStop } from "@/lib/dates/plan";
import { mergePlaces, osmIdOf, placesFromPois, scorePoi, tileAt, tilePointToLatLng, tilesCovering, type PoiFeature } from "@/lib/dates/tiles";
import { conditionOf, isWet, parseOpenMeteo, weatherUrl, type DayWeather } from "@/lib/dates/weather";

const LISBON = { lat: 38.714, lng: -9.139 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const TOKYO = { lat: 35.6762, lng: 139.6503 };

const place = (over: Partial<Place> & Pick<Place, "id" | "kind">): Place => ({
  name: over.id,
  named: true,
  group: KINDS[over.kind].group,
  lat: LISBON.lat,
  lng: LISBON.lng,
  distanceKm: 0.2,
  cuisine: [],
  outdoorSeating: false,
  vegetarian: false,
  stepFree: false,
  notable: false,
  score: 50,
  ...over,
});

describe("geography", () => {
  it("measures great-circle distance", () => {
    expect(distanceKm(LONDON, TOKYO)).toBeGreaterThan(9500);
    expect(distanceKm(LONDON, TOKYO)).toBeLessThan(9620);
    expect(distanceKm(LISBON, LISBON)).toBe(0);
  });

  it("finds the halfway point along the great circle, not the average of the coordinates", () => {
    const mid = midpoint(LONDON, TOKYO);
    // The flight goes over Siberia: far north of either city.
    expect(mid.lat).toBeGreaterThan(60);
    expect(Math.abs(distanceKm(LONDON, mid) - distanceKm(mid, TOKYO))).toBeLessThan(1);
  });

  it("crosses the date line without ending up on the wrong side of the world", () => {
    const mid = midpoint({ lat: 0, lng: 170 }, { lat: 0, lng: -170 });
    expect(Math.abs(mid.lng)).toBeCloseTo(180, 3);
  });

  it("snaps a search to a shared grid and a fixed radius, so nobody's exact position is sent", () => {
    const a = snapSearch({ lat: 38.71391, lng: -9.13944 }, 1234);
    const b = snapSearch({ lat: 38.71412, lng: -9.13871 }, 1100);
    expect(a).toEqual(b);
    expect(a).toEqual({ center: { lat: 38.714, lng: -9.139 }, radiusM: 1500 });
    expect(snapSearch(LISBON, 99_999).radiusM).toBe(2000);
    expect(Object.is(snapSearch({ lat: -0.0001, lng: 0 }, 600).center.lat, -0)).toBe(false);
  });

  it("validates coordinates and formats distances", () => {
    expect(isLatLng(91, 0)).toBe(false);
    expect(isLatLng(Number.NaN, 0)).toBe(false);
    expect(isLatLng(-33.9, 151.2)).toBe(true);
    expect(formatDistance(0.04, "en")).toBe("50 m");
    expect(formatDistance(0.43, "en")).toBe("450 m");
    expect(formatDistance(2.345, "es")).toBe("2,3 km");
    expect(walkingMinutes(1)).toBe(16);
    expect(walkingMinutes(0.01)).toBe(1);
  });
});

describe("what a place is", () => {
  it("puts every kind in a group that exists, labelled in both languages", () => {
    for (const kind of KIND_IDS) {
      expect(GROUP_IDS).toContain(KINDS[kind].group);
      expect(KINDS[kind].label.en).toBeTruthy();
      expect(KINDS[kind].label.es).toBeTruthy();
    }
    for (const group of GROUP_IDS) {
      expect(kindsIn(group).length).toBeGreaterThan(0);
      expect(GROUPS[group].color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("reads OpenStreetMap tags, and leaves out what nobody plans a date round", () => {
    expect(kindOf({ amenity: "restaurant" })).toBe("restaurant");
    expect(kindOf({ amenity: "pub" })).toBe("bar");
    expect(kindOf({ shop: "pastry" })).toBe("dessert");
    expect(kindOf({ leisure: "garden", access: "private" })).toBeNull();
    expect(kindOf({ leisure: "sports_centre" })).toBeNull();
    expect(kindOf({ leisure: "sports_centre", sport: "climbing" })).toBe("climbing");
    expect(kindOf({ amenity: "fast_food" })).toBeNull();
    expect(kindOf({ natural: "beach" })).toBe("beach");
  });

  it("reads a map tile's classes: public art and nightclubs are not dates", () => {
    expect(kindOfPoi("books")).toBe("bookshop");
    expect(kindOfPoi("viewpoint")).toBe("viewpoint");
    expect(kindOfPoi("aquarium")).toBe("zoo");
    expect(kindOfPoi("artwork")).toBeNull();
    expect(kindOfPoi("nightclub")).toBeNull();
    expect(kindOfPoi("fast_food")).toBeNull();
    expect(kindOfPoi(undefined)).toBeNull();
  });
});

describe("opening hours", () => {
  it("reads the everyday grammar", () => {
    const raw = "Mo-Fr 09:00-18:00; Sa 10:00-16:00";
    expect(hoursOn(raw, 1)).toEqual({ known: true, ranges: [[540, 1080]] });
    expect(hoursOn(raw, 6)).toEqual({ known: true, ranges: [[600, 960]] });
    expect(hoursOn(raw, 0)).toEqual({ known: true, ranges: [] });
    expect(hoursOn("24/7", 3)).toEqual({ known: true, ranges: [[0, 1440]] });
  });

  it("handles split shifts, closing after midnight, days off and weeks that wrap", () => {
    expect(hoursOn("Mo-Sa 12:00-16:00,19:00-24:00", 2)).toEqual({ known: true, ranges: [[720, 960], [1140, 1440]] });
    const late = hoursOn("Tu-Su 18:00-02:00", 5);
    expect(late).toEqual({ known: true, ranges: [[1080, 1560]] });
    expect(isOpenAt(late, 23 * 60)).toBe(true);
    expect(closesAt(late)).toBe(1560);
    expect(formatHours(late)).toBe("18:00–02:00");
    expect(hoursOn("Tu-Su 18:00-02:00", 1)).toEqual({ known: true, ranges: [] });
    expect(hoursOn("10:00-20:00; Su off", 0)).toEqual({ known: true, ranges: [] });
    expect(hoursOn("Fr-Mo 10:00-18:00", 0)).toEqual({ known: true, ranges: [[600, 1080]] });
    expect(hoursOn("Fr-Mo 10:00-18:00", 3)).toEqual({ known: true, ranges: [] });
    expect(hoursOn("Mo-Su,PH 08:00-22:00", 4)).toEqual({ known: true, ranges: [[480, 1320]] });
  });

  it("says it does not know rather than guess at the hard parts of the grammar", () => {
    expect(hoursOn(undefined, 1)).toEqual({ known: false });
    expect(hoursOn("sunrise-sunset", 1)).toEqual({ known: false });
    expect(hoursOn("Apr-Oct: Mo-Su 10:00-18:00", 1)).toEqual({ known: false });
    expect(hoursOn("Mo-Fr 09:00-18:00; week 1-10 Sa 10:00-12:00", 1)).toEqual({ known: false });
    expect(isOpenAt({ known: false }, 600)).toBeNull();
    expect(formatHours({ known: false })).toBeNull();
    expect(formatHours({ known: true, ranges: [[0, 1440]] })).toBe("24h");
  });
});

describe("places from OpenStreetMap", () => {
  const overpass = {
    elements: [
      { type: "node", id: 1, lat: 38.7145, lon: -9.1391, tags: { amenity: "restaurant", name: "Taberna", cuisine: "portuguese;seafood", website: "taberna.example", opening_hours: "Tu-Su 19:00-23:00", outdoor_seating: "yes", "addr:street": "Rua Nova", "addr:housenumber": "12", "addr:city": "Lisboa" } },
      { type: "way", id: 2, center: { lat: 38.7146, lon: -9.1392 }, tags: { amenity: "restaurant", name: "Taberna" } },
      { type: "node", id: 3, lat: 38.72, lon: -9.14, tags: { amenity: "restaurant", name: "Burger Chain", brand: "Burger Chain", takeaway: "only" } },
      { type: "node", id: 4, lat: 38.716, lon: -9.138, tags: { tourism: "viewpoint" } },
      { type: "node", id: 5, lat: 38.716, lon: -9.138, tags: { amenity: "cafe" } },
      { type: "node", id: 6, lat: 38.716, lon: -9.138, tags: { amenity: "bank", name: "Bank" } },
      { type: "node", id: 7, tags: { amenity: "cafe", name: "Nowhere" } },
    ],
  };

  it("keeps named, date-worthy places once each, best first", () => {
    const places = parseOverpass(overpass, LISBON, 1500, (kind) => KINDS[kind].label.en);
    expect(places.map((p) => p.id)).toEqual(["node/1", "node/4", "node/3"]);
    const [first, viewpoint] = places;
    expect(first).toMatchObject({ name: "Taberna", kind: "restaurant", group: "eat", address: "Rua Nova 12, Lisboa", cuisine: ["portuguese", "seafood"], website: "https://taberna.example/", outdoorSeating: true });
    // A viewpoint with no name is still a viewpoint; a café with no name is nothing to go on.
    expect(viewpoint).toMatchObject({ name: "Viewpoint", named: false });
  });

  it("ranks a looked-after local place above a takeaway chain, and never trusts a broken answer", () => {
    expect(scorePlace({ website: "x", opening_hours: "x" }, "restaurant", 0.2, 1.5)).toBeGreaterThan(scorePlace({ brand: "x", takeaway: "only" }, "restaurant", 0.2, 1.5));
    expect(parseOverpass(null, LISBON, 1500, () => "")).toEqual([]);
    expect(parseOverpass({ elements: "no" }, LISBON, 1500, () => "")).toEqual([]);
  });

  it("drops javascript: and other non-web links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("ftp://example.com")).toBeUndefined();
    expect(safeUrl("example.com/menu")).toBe("https://example.com/menu");
    expect(safeUrl("nonsense")).toBeUndefined();
  });

  it("balances groups so restaurants never crowd out the one planetarium", () => {
    const many = [...Array.from({ length: 10 }, (_, i) => place({ id: `node/${i}`, kind: "restaurant" })), place({ id: "node/99", kind: "planetarium" })];
    const kept = balance(many, 3);
    expect(kept.filter((p) => p.group === "eat")).toHaveLength(3);
    expect(kept.some((p) => p.kind === "planetarium")).toBe(true);
  });

  it("asks Overpass for the rare kinds in a box, and for one element by id", () => {
    const query = buildRareQuery(LISBON);
    expect(query.startsWith("[out:json][timeout:15][bbox:")).toBe(true);
    expect(query).toContain("nw[leisure=bowling_alley];");
    expect(query).toContain("nwr[natural=beach][name];");
    const [s, w, n, e] = boxAround(LISBON, 8000);
    expect(s).toBeLessThan(LISBON.lat);
    expect(n).toBeGreaterThan(LISBON.lat);
    expect(w).toBeLessThan(LISBON.lng);
    expect(e).toBeGreaterThan(LISBON.lng);
    expect(distanceKm({ lat: s, lng: LISBON.lng }, { lat: n, lng: LISBON.lng })).toBeCloseTo(16, 0);
    expect(buildIdQuery("way/123")).toBe("[out:json][timeout:8];way(123);out center tags 1;");
    expect(buildIdQuery("way/123);node(1")).toBeNull();
    expect(buildIdQuery("area/1")).toBeNull();
  });
});

describe("places from map tiles", () => {
  it("finds the tile a point is in, and the point a tile position is at", () => {
    expect(tileAt(LISBON)).toEqual({ x: 7776, y: 6278 });
    const back = tilePointToLatLng({ x: 7776, y: 6278 }, 2048, 2048, 4096);
    expect(distanceKm(back, LISBON)).toBeLessThan(1.5);
    expect(tileAt(back)).toEqual({ x: 7776, y: 6278 });
  });

  it("covers a search circle with its nearest tiles, the home tile first, and never too many", () => {
    const tiles = tilesCovering(LISBON, 1500);
    expect(tiles[0]).toEqual(tileAt(LISBON));
    expect(tiles.length).toBeGreaterThanOrEqual(4);
    expect(tiles.length).toBeLessThanOrEqual(9);
    expect(new Set(tiles.map((t) => `${t.x}/${t.y}`)).size).toBe(tiles.length);
    expect(tilesCovering({ lat: 69.65, lng: 18.95 }, 2000).length).toBeLessThanOrEqual(9);
    // Either side of the date line.
    const fiji = tilesCovering({ lat: -16.8, lng: 179.99 }, 2000);
    expect(fiji.some((t) => t.x === 0)).toBe(true);
    expect(fiji.some((t) => t.x === 2 ** 14 - 1)).toBe(true);
  });

  it("unfolds an OpenStreetMap id from a tile's feature id", () => {
    expect(osmIdOf(4193131891)).toBe("node/419313189");
    expect(osmIdOf(5736670522)).toBe("way/573667052");
    expect(osmIdOf(1234563)).toBe("relation/123456");
    expect(osmIdOf(1234560)).toBeNull();
    expect(osmIdOf(undefined)).toBeNull();
    expect(osmIdOf(1.5)).toBeNull();
  });

  const tile = tileAt(LISBON);
  const poi = (over: Partial<PoiFeature> & { properties: Record<string, unknown> }): PoiFeature => ({ id: 10011, px: 2000, py: 2000, extent: 4096, ...over });

  it("keeps the date-worthy points inside the circle, named as the sign on the door", () => {
    const features: PoiFeature[] = [
      poi({ id: 10011, properties: { name: "Pastelaria Alcôa", "name:en": "Alcoa Pastry", subclass: "pastry", rank: 3 } }),
      poi({ id: 10021, properties: { subclass: "viewpoint", rank: 20 } }),
      poi({ id: 10031, properties: { subclass: "cafe", rank: 1 } }),
      poi({ id: 10041, properties: { name: "Statue", subclass: "artwork" } }),
      poi({ id: 10051, px: -12, properties: { name: "Over the edge", subclass: "cafe" } }),
      poi({ id: 10061, px: 4096, properties: { name: "Also over", subclass: "cafe" } }),
      poi({ id: 0, properties: { name: "No id", subclass: "cafe" } }),
    ];
    const center = tilePointToLatLng(tile, 2000, 2000, 4096);
    const places = placesFromPois(features, tile, center, 600, "en");
    expect(places.map((p) => p.id)).toEqual(["node/1001", "node/1002"]);
    expect(places[0]).toMatchObject({ name: "Pastelaria Alcôa", kind: "dessert", group: "sweet", distanceKm: 0 });
    expect(places[1]).toMatchObject({ name: "Viewpoint", named: false });
    expect(placesFromPois(features, tile, { lat: center.lat + 0.1, lng: center.lng }, 600, "en")).toEqual([]);
    expect(placesFromPois(features, tile, center, 600, "es")[1].name).toBe("Mirador");
  });

  it("orders by how near and how unusual, since a tile says nothing about how good", () => {
    expect(scorePoi("viewpoint", 0.2, 1.5, 5)).toBeGreaterThan(scorePoi("restaurant", 0.2, 1.5, 5));
    expect(scorePoi("restaurant", 0.1, 1.5, 5)).toBeGreaterThan(scorePoi("restaurant", 1.4, 1.5, 5));
  });

  it("merges sources without showing a place twice, keeping the record that knows more", () => {
    const fromTile = place({ id: "node/1", kind: "minigolf", score: 70 });
    const fromOverpass = place({ id: "node/1", kind: "minigolf", score: 55, hours: "Mo-Su 10:00-22:00" });
    const twin = place({ id: "way/77", kind: "minigolf", name: "node/1", score: 60 });
    const merged = mergePlaces([fromTile, place({ id: "node/2", kind: "cafe", score: 90 })], [fromOverpass, twin]);
    expect(merged.map((p) => p.id)).toEqual(["node/2", "node/1"]);
    expect(merged[1]).toMatchObject({ hours: "Mo-Su 10:00-22:00", score: 70 });
  });

  it("shows one place for one name close together, and keeps branches of a chain apart", () => {
    const north = LISBON.lat + 0.0027; // about 300 m
    const garden = [place({ id: "way/1", kind: "park", name: "Whitehall Gardens", score: 60 }), place({ id: "way/2", kind: "park", name: "Whitehall Gardens", score: 64, lat: north })];
    const merged = mergePlaces(garden);
    expect(merged).toHaveLength(1);
    // The better-scored piece stands for the garden.
    expect(merged[0].id).toBe("way/2");
    // Two bookshops of one chain 600 m apart are two places; one café mapped twice 90 m apart is one.
    const far = LISBON.lat + 0.0054;
    expect(mergePlaces([place({ id: "node/10", kind: "bookshop", name: "Waterstones" }), place({ id: "node/11", kind: "bookshop", name: "Waterstones", lat: far })])).toHaveLength(2);
    expect(mergePlaces([place({ id: "node/20", kind: "cafe", name: "Café Luz" }), place({ id: "node/21", kind: "cafe", name: "Café Luz", lat: LISBON.lat + 0.0008 })])).toHaveLength(1);
    // A garden and a café that happen to share a name are not one place.
    expect(mergePlaces([place({ id: "way/30", kind: "park", name: "Estrela" }), place({ id: "node/31", kind: "cafe", name: "Estrela" })])).toHaveLength(2);
  });
});

describe("a place's details", () => {
  it("recognises ids and refuses anything else", () => {
    expect(isPlaceId("node/123")).toBe(true);
    expect(isPlaceId("node/123;drop")).toBe(false);
    expect(isPlaceId("area/1")).toBe(false);
    expect(nominatimIdOf("way/42")).toBe("W42");
    expect(nominatimIdOf("nope")).toBeNull();
  });

  it("reads Nominatim's answer for the place that was asked about", () => {
    const json = [
      { osm_type: "node", osm_id: 9, address: { road: "Elsewhere" }, extratags: {} },
      { osm_type: "node", osm_id: 419313189, address: { road: "Rua de São Pedro de Alcântara", suburb: "Bairro Alto", city: "Lisbon", postcode: "1250-238" }, extratags: { opening_hours: "Mo-Su 10:00-22:00", website: "https://example.pt", phone: "+351 213 912 600", wikidata: "Q1", cuisine: "italian;pizza", "diet:vegan": "yes", wheelchair: "yes", description: "x".repeat(400) } },
    ];
    const details = parseNominatim(json, "node/419313189");
    expect(details).toMatchObject({ address: "Rua de São Pedro de Alcântara, Bairro Alto, Lisbon", hours: "Mo-Su 10:00-22:00", website: "https://example.pt/", phone: "+351 213 912 600", cuisine: ["italian", "pizza"], vegetarian: true, stepFree: true, notable: true });
    expect(details?.description?.length).toBeLessThanOrEqual(220);
    expect(parseNominatim(json, "node/1")).toBeNull();
    expect(parseNominatim({ error: "x" }, "node/1")).toBeNull();
    expect(parseNominatim([{ osm_type: "way", osm_id: 5, extratags: null }], "way/5")).toMatchObject({ id: "way/5", cuisine: [] });
  });

  it("writes an address the way it is said, without repeating the town", () => {
    expect(addressLine({ road: "High Street", house_number: "4", suburb: "Soho", city: "London" })).toBe("High Street 4, Soho, London");
    expect(addressLine({ pedestrian: "Rua Augusta", city: "Lisboa", suburb: "Lisboa" })).toBe("Rua Augusta, Lisboa");
    expect(addressLine({})).toBeUndefined();
    expect(addressLine(undefined)).toBeUndefined();
  });

  it("reads the same details from raw tags", () => {
    expect(detailsFromTags("node/1", { "addr:street": "Rua Nova", "addr:housenumber": "3", outdoor_seating: "yes" })).toMatchObject({ address: "Rua Nova 3", outdoorSeating: true });
    expect(parseOverpassOne({ elements: [{ type: "node", id: 1, tags: { opening_hours: "24/7" } }] }, "node/1")).toMatchObject({ hours: "24/7" });
    expect(parseOverpassOne({ elements: [{ type: "node", id: 2, tags: {} }] }, "node/1")).toBeNull();
    expect(parseOverpassOne({ elements: [] }, "node/1")).toBeNull();
  });
});

describe("the forecast", () => {
  const day = (over: Partial<DayWeather>): DayWeather => ({ date: "2026-09-26", condition: "clear", tMax: 24, tMin: 15, rainChance: 5, sunrise: "07:27", sunset: "19:27", ...over });

  it("folds weather codes down to what changes a plan", () => {
    expect(conditionOf(0)).toBe("clear");
    expect(conditionOf(3)).toBe("cloudy");
    expect(conditionOf(48)).toBe("fog");
    expect(conditionOf(53)).toBe("drizzle");
    expect(conditionOf(81)).toBe("rain");
    expect(conditionOf(75)).toBe("snow");
    expect(conditionOf(96)).toBe("storm");
    expect(isWet(day({}))).toBe(false);
    expect(isWet(day({ condition: "rain" }))).toBe(true);
    expect(isWet(day({ condition: "cloudy", rainChance: 70 }))).toBe(true);
    expect(isWet(day({ condition: "cloudy", rainChance: null }))).toBe(false);
  });

  it("reads Open-Meteo, skipping days it cannot make sense of", () => {
    const forecast = parseOpenMeteo({
      timezone: "Europe/Lisbon",
      utc_offset_seconds: 3600,
      daily: { time: ["2026-09-21", "2026-09-22", "bad"], weather_code: [0, 61, null], temperature_2m_max: [33.2, 21.6, 20], temperature_2m_min: [19.5, 15.1, 10], precipitation_probability_max: [0, null, 0], sunrise: ["2026-09-21T07:23", "2026-09-22T07:24", ""], sunset: ["2026-09-21T19:35", "2026-09-22T19:33", ""] },
    });
    expect(forecast?.days).toEqual([
      { date: "2026-09-21", condition: "clear", tMax: 33, tMin: 20, rainChance: 0, sunrise: "07:23", sunset: "19:35" },
      { date: "2026-09-22", condition: "rain", tMax: 22, tMin: 15, rainChance: null, sunrise: "07:24", sunset: "19:33" },
    ]);
    expect(forecast?.timezone).toBe("Europe/Lisbon");
    expect(parseOpenMeteo({})).toBeNull();
    expect(parseOpenMeteo(null)).toBeNull();
    expect(weatherUrl(38.71, -9.14)).toContain("latitude=38.71&longitude=-9.14");
  });
});

describe("the calendar", () => {
  it("handles dates as plain days, never moments", () => {
    expect(toYmd(new Date(2026, 8, 5, 23, 59))).toBe("2026-09-05");
    expect(fromYmd("2026-02-30")).toBeNull();
    expect(fromYmd("26-09-05")).toBeNull();
    expect(isYmd("2026-09-26")).toBe(true);
    expect(isYmd(20260926)).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // the night the clocks change in Europe
    expect(weekdayOf("2026-09-26")).toBe(6);
  });

  it("knows when the weekend is", () => {
    expect(thisWeekend("2026-09-21")).toBe("2026-09-26");
    expect(thisWeekend("2026-09-26")).toBe("2026-09-26");
    expect(thisWeekend("2026-09-27")).toBe("2026-09-27");
  });

  it("lays a month out Monday first", () => {
    const grid = monthGrid(2026, 8);
    expect(grid.slice(0, 2)).toEqual([null, "2026-09-01"]);
    expect(grid.filter(Boolean)).toHaveLength(30);
    expect(monthGrid(2027, 1).filter(Boolean)).toHaveLength(28);
    expect(formatDay("2026-09-26", "en")).toBe("Saturday 26 September");
    expect(formatDay("2026-09-26", "es")).toMatch(/sábado/);
    expect(formatDay("nope", "en")).toBe("nope");
  });
});

describe("date ideas", () => {
  it("are complete in both languages, with stops made of kinds that exist", () => {
    expect(new Set(IDEAS.map((i) => i.id)).size).toBe(IDEAS.length);
    for (const idea of IDEAS) {
      for (const text of [idea.title, idea.blurb, idea.twist]) {
        expect(text.en.length, idea.id).toBeGreaterThan(3);
        expect(text.es.length, idea.id).toBeGreaterThan(3);
      }
      expect(idea.stops.length).toBeGreaterThanOrEqual(1);
      expect(idea.stops.length).toBeLessThanOrEqual(3);
      for (const stop of idea.stops) for (const kind of stop) expect(KIND_IDS, `${idea.id}: ${kind}`).toContain(kind);
      for (const vibe of idea.vibes) expect(VIBE_IDS).toContain(vibe);
      expect(idea.needsDry && idea.goodInRain, idea.id).toBe(false);
      expect(idea.art.from).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(ideaById("bookshop-and-coffee")?.stops[0]).toEqual(["bookshop"]);
    expect(ideaById("nope")).toBeUndefined();
  });

  it("never suggests a picnic in the rain, and leads with what rain is good for", () => {
    const wet: DayWeather = { date: "2026-09-26", condition: "rain", tMax: 15, tMin: 10, rainChance: 90, sunrise: "07:00", sunset: "19:00" };
    const rainy = ideasFor(wet, []);
    expect(rainy.every((i) => !i.needsDry)).toBe(true);
    expect(rainy[0].goodInRain).toBe(true);
    const dry = ideasFor({ ...wet, condition: "clear", rainChance: 0 }, []);
    expect(dry.map((i) => i.id)).toEqual(IDEAS.map((i) => i.id));
    expect(ideasFor(undefined, [], "free").every((i) => i.vibes.includes("free"))).toBe(true);
  });

  it("puts what can actually be done nearby first", () => {
    const nearby = [place({ id: "node/1", kind: "bookshop" }), place({ id: "node/2", kind: "cafe" })];
    const ideas = ideasFor(undefined, nearby);
    expect(isDoable(ideas[0], nearby)).toBe(true);
    expect(ideas[0].id).toBe("bookshop-and-coffee");
    expect(isDoable(ideaById("bowling-night")!, nearby)).toBe(false);
  });

  it("fills an idea's stops with real places a walk apart, preferring the kind it was written for", () => {
    const idea = ideaById("bookshop-and-coffee")!;
    const far = place({ id: "node/far", kind: "cafe", lat: LISBON.lat + 0.05, score: 99 });
    const near = place({ id: "node/near", kind: "dessert", lat: LISBON.lat + 0.002, score: 40 });
    const nearCafe = place({ id: "node/cafe", kind: "cafe", lat: LISBON.lat + 0.003, score: 30 });
    const shop = place({ id: "node/shop", kind: "bookshop" });
    expect(suggestStops(idea, [far, near, nearCafe, shop]).map((p) => p.id)).toEqual(["node/shop", "node/cafe"]);
    // Nothing within a walk: the far one is better than no coffee at all.
    expect(suggestStops(idea, [far, shop]).map((p) => p.id)).toEqual(["node/shop", "node/far"]);
    expect(suggestStops(idea, [shop]).map((p) => p.id)).toEqual(["node/shop"]);
    expect(suggestStops(idea, [])).toEqual([]);
  });
});

describe("a plan", () => {
  const stop = (n: number): PlanStop => ({ id: `node/${n}`, name: `Stop ${n}`, kind: "cafe", lat: 38.7, lng: -9.1 });
  const plan: Plan = { v: 1, date: "2026-09-26", where: "Lisbon", from: "Marco", to: "Maya", note: "Wear the green dress 💚", idea: "golden-hour-picnic", stops: [{ ...stop(1), time: "17:30", note: "pastéis first" }, stop(2)] };

  it("survives the trip through a link, accents and emoji included", () => {
    const encoded = encodePlan(plan);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodePlan(encoded)).toEqual(plan);
  });

  it("refuses anything that is not a plan", () => {
    expect(decodePlan("")).toBeNull();
    expect(decodePlan("not base64 !!")).toBeNull();
    expect(decodePlan(encodePlan({ ...plan, v: 2 } as unknown as Plan))).toBeNull();
    expect(decodePlan(encodePlan({ ...plan, date: "2026-02-31" }))).toBeNull();
    expect(decodePlan(encodePlan({ ...plan, stops: Array.from({ length: MAX_STOPS + 1 }, (_, i) => stop(i)) }))).toBeNull();
    expect(decodePlan(encodePlan({ ...plan, stops: [{ ...stop(1), lat: 123 }] }))).toBeNull();
    expect(decodePlan(encodePlan({ ...plan, stops: [{ ...stop(1), kind: "casino" as never }] }))).toBeNull();
    expect(decodePlan("A".repeat(9000))).toBeNull();
    expect(parseStoredPlan("{oops")).toEqual(EMPTY_PLAN);
    expect(parseStoredPlan(null)).toEqual(EMPTY_PLAN);
    expect(parseStoredPlan(JSON.stringify(plan))).toEqual(plan);
  });

  it("adds, removes and reorders stops without ever mutating", () => {
    const one = addStop(EMPTY_PLAN, stop(1));
    expect(EMPTY_PLAN.stops).toHaveLength(0);
    expect(addStop(one, stop(1))).toBe(one);
    const full = Array.from({ length: MAX_STOPS }, (_, i) => stop(i)).reduce(addStop, EMPTY_PLAN);
    expect(addStop(full, stop(99))).toBe(full);
    const three = [stop(1), stop(2), stop(3)].reduce(addStop, EMPTY_PLAN);
    expect(moveStop(three, "node/3", -1).stops.map((s) => s.id)).toEqual(["node/1", "node/3", "node/2"]);
    expect(moveStop(three, "node/1", -1)).toBe(three);
    expect(moveStop(three, "node/3", 1)).toBe(three);
    expect(removeStop(three, "node/2").stops.map((s) => s.id)).toEqual(["node/1", "node/3"]);
  });
});

describe("the map library", () => {
  it("is loaded from the folder named after the version that is installed", async () => {
    const { MAPLIBRE_VERSION } = await import("@/lib/dates/map-vendor");
    const installed = JSON.parse(readFileSync(new URL("../../node_modules/maplibre-gl/package.json", import.meta.url), "utf8")) as { version: string };
    expect(MAPLIBRE_VERSION).toBe(installed.version);
  });
});

describe("timing and the map's colours", () => {
  it("hangs a sunset date off the real sunset, and starts the others at a sensible hour", async () => {
    const { suggestTimes } = await import("@/lib/dates/timing");
    const day: DayWeather = { date: "2026-09-26", condition: "clear", tMax: 24, tMin: 15, rainChance: 0, sunrise: "07:27", sunset: "19:27" };
    const picnic = ideaById("golden-hour-picnic")!;
    // At the view three quarters of an hour before the sun goes, to the quarter hour; the bakery an hour before that.
    expect(suggestTimes(picnic, day)).toEqual(["17:45", "18:45"]);
    expect(suggestTimes(picnic)).toEqual(["17:45", "18:45"]);
    expect(suggestTimes(picnic, { ...day, sunset: "16:02" })).toEqual(["14:15", "15:15"]);
    expect(suggestTimes(ideaById("sunrise-and-breakfast")!, day)).toEqual(["07:00", "08:00"]);
    expect(suggestTimes(ideaById("bookshop-and-coffee")!, day)).toEqual(["14:00", "15:00"]);
    expect(suggestTimes(ideaById("stars-and-planets")!, { ...day, sunset: "21:40" })[0]).toBe("22:45");
    for (const idea of IDEAS) for (const time of suggestTimes(idea, day)) expect(time).toMatch(/^([01]\d|2[0-3]):(00|15|30|45)$/);
  });

  it("shows another place for a stop when asked, and says how many there are to choose from", async () => {
    const { fillStops } = await import("@/lib/dates/ideas");
    const idea = ideaById("bookshop-and-coffee")!;
    const places = [place({ id: "node/a", kind: "bookshop", score: 80 }), place({ id: "node/b", kind: "bookshop", score: 70 }), place({ id: "node/c", kind: "cafe" })];
    expect(fillStops(idea, places).map((s) => s.place?.id)).toEqual(["node/a", "node/c"]);
    expect(fillStops(idea, places, [1]).map((s) => s.place?.id)).toEqual(["node/b", "node/c"]);
    expect(fillStops(idea, places, [2]).map((s) => s.place?.id)).toEqual(["node/a", "node/c"]);
    expect(fillStops(idea, places)[0].options).toBe(2);
    expect(fillStops(idea, [places[0]])).toEqual([{ place: places[0], options: 1 }, { place: null, options: 0 }]);
  });

  it("repaints the base map without touching what it does not know", async () => {
    const { applyPalette, MAP_PAPER } = await import("@/lib/dates/map-style");
    const style = {
      version: 8,
      sources: { openmaptiles: {} },
      layers: [
        { id: "background", type: "background", paint: { "background-color": "rgb(242,243,240)" } },
        { id: "water", type: "fill", paint: { "fill-color": "rgb(194, 200, 202)" } },
        { id: "highway_minor", type: "line", paint: { "line-color": "hsl(0,0%,88%)", "line-width": 2 } },
        { id: "label_city", type: "symbol", layout: { "text-field": "{name}" }, paint: { "text-color": "#000" } },
        { id: "water_name_point_label", type: "symbol", paint: { "text-color": "#495e91" } },
        { id: "something_new", type: "fill", paint: { "fill-color": "#123456" } },
      ],
    };
    const painted = applyPalette(style);
    const paint = (id: string) => painted.layers.find((l) => l.id === id)!.paint!;
    expect(paint("background")["background-color"]).toBe(MAP_PAPER);
    expect(paint("water")["fill-color"]).toBe("#CFE3EE");
    expect(paint("highway_minor")).toEqual({ "line-color": "#FFFFFF", "line-width": 2 });
    expect(paint("label_city")["text-color"]).toBe("#5B3F49");
    expect(paint("water_name_point_label")["text-color"]).toBe("#6A93AD");
    expect(paint("something_new")["fill-color"]).toBe("#123456");
    expect(style.layers[0].paint["background-color"]).toBe("rgb(242,243,240)");
    expect(painted.sources).toBe(style.sources);
  });
});

describe("long distance", () => {
  it("finds the nearest city to a point", async () => {
    const { nearestCity } = await import("@/lib/dates/apart");
    const cities = [{ name: "London", ...LONDON }, { name: "Tokyo", ...TOKYO }, { name: "Lisbon", ...LISBON }];
    expect(nearestCity({ lat: 40.4, lng: -3.7 }, cities)?.city.name).toBe("Lisbon");
    expect(nearestCity(LONDON, cities)).toMatchObject({ km: 0 });
    expect(nearestCity(LONDON, [])).toBeNull();
  });

  it("works out when two people in different time zones are both awake", async () => {
    const { awakeOverlap, clockOf, hoursAhead, milesOf } = await import("@/lib/dates/apart");
    // Same zone: the whole waking day.
    expect(awakeOverlap(3600, 3600)).toEqual([[480, 1380]]);
    // Madrid (+2 in summer) and New York (-4): they are six hours behind, so it is the afternoon and evening in Madrid.
    expect(hoursAhead(7200, -14400)).toBe(-6);
    expect(awakeOverlap(7200, -14400).map(([a, b]) => [clockOf(a), clockOf(b)])).toEqual([["14:00", "23:00"]]);
    // And seen from New York it is the morning and early afternoon.
    expect(awakeOverlap(-14400, 7200).map(([a, b]) => [clockOf(a), clockOf(b)])).toEqual([["08:00", "17:00"]]);
    // London and Auckland, twelve hours apart: breakfast for one is bedtime for the other.
    expect(awakeOverlap(0, 12 * 3600).map(([a, b]) => [clockOf(a), clockOf(b)])).toEqual([["08:00", "11:00"], ["20:00", "23:00"]]);
    // Half-hour zones.
    expect(hoursAhead(0, 19800)).toBe(5.5);
    expect(clockOf(-30)).toBe("23:30");
    expect(milesOf(100)).toBeCloseTo(62.14, 2);
  });

  it("has dates for two screens and question cards in both languages", async () => {
    const { VIRTUAL_DATES } = await import("@/lib/dates/virtual");
    const { DECKS, DECK_IDS, shuffled } = await import("@/lib/games/questions");
    expect(new Set(VIRTUAL_DATES.map((v) => v.id)).size).toBe(VIRTUAL_DATES.length);
    for (const v of VIRTUAL_DATES) for (const text of [v.title, v.blurb, v.twist]) expect(text.en && text.es, v.id).toBeTruthy();
    for (const id of DECK_IDS) {
      expect(DECKS[id].cards.length).toBeGreaterThanOrEqual(12);
      for (const card of DECKS[id].cards) expect(card.en.length > 8 && card.es.length > 8, card.en).toBe(true);
    }
    // Every card once, in an order that depends only on the seed.
    const order = shuffled(12, 42);
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i));
    expect(shuffled(12, 42)).toEqual(order);
    expect(shuffled(12, 43)).not.toEqual(order);
    expect(shuffled(12, 0)).toHaveLength(12);
  });
});
