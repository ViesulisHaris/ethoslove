import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { CITY_PAGES, CITY_SLUGS, CITY_TRAITS, cityMapHref, cityName, getCity, mapHref, mentionsSpain, nearbyCities, type City } from "@/lib/cities/cities";
import { hoursOf, ideaListNode, placeListNode, TOLD_TRAITS, TOP_OF_LIST, toldTraits } from "@/lib/cities/copy";
import { cityIdeaScore, cityIdeaStops, IDEAS_PER_CITY, ideasForCity, isLiftedBy } from "@/lib/cities/ideas";
import { assembleCityPlaces, byGroup, countByGroup, PLACES_PER_CITY, topCityPlaces } from "@/lib/cities/places";
import { distanceKm, isLatLng } from "@/lib/dates/geo";
import { IDEAS, ideaById } from "@/lib/dates/ideas";
import { GROUP_IDS, KINDS, type PlaceKind } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { tileAt, type PoiFeature } from "@/lib/dates/tiles";
import { CITIES } from "@/templates/_shared/places";
import { CITY_KIND_COPY, KIND_PAGE_CITIES } from "@/content/date-kinds";
import { createTranslator } from "next-intl";
import { SITE } from "@/config/site";
import sitemap from "@/app/sitemap";
import { KIND_PLACE_KINDS, KIND_PLACES, kindPlaces, leftOff, MIN_KIND_PLACES } from "@/lib/cities/kind-places";
import { isTold, unusualIndex } from "@/lib/dates/unusual";
import { guessCost } from "@/lib/dates/cost";
import { DATE_KINDS } from "@/lib/dates/date-kinds";
import { CITY_KIND_PAIRS } from "@/lib/cities/kind-pairs";
import { rankPlaces } from "@/lib/dates/rank";

/** The owner's rule: nothing on the site mentions Spain or its cities. */
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma)\b/i;

const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
const city = (slug: string): City => {
  const c = getCity(slug);
  if (!c) throw new Error(`no city ${slug}`);
  return c;
};

/** The cities of Nov 2026 the offline table has no row for: each carries its own centre and country. */
const OWN_CENTRE = ["kansas-city", "milwaukee", "salt-lake-city", "san-antonio", "columbus", "orlando", "phoenix", "pittsburgh", "portland", "st-louis", "nashville", "san-diego", "leeds", "liverpool"];
/** The twenty-four cities added in Nov 2026 for the searches people make (SEO-PICTURE.md section 5). */
const NEW_CITIES = ["birmingham", "glasgow", "bristol", "leeds", "liverpool", "dallas", "kansas-city", "houston", "atlanta", "austin", "denver", "milwaukee", "salt-lake-city", "san-antonio", "columbus", "orlando", "philadelphia", "phoenix", "pittsburgh", "portland", "seattle", "st-louis", "nashville", "san-diego"];

describe("the city pages", () => {
  it("are about fifty-five cities, each with its own lower-case, hyphenated English slug", () => {
    expect(CITY_PAGES.length).toBeGreaterThanOrEqual(50);
    expect(CITY_PAGES.length).toBeLessThanOrEqual(58);
    expect(new Set(CITY_SLUGS).size).toBe(CITY_SLUGS.length);
    for (const c of CITY_PAGES) {
      expect(c.slug, c.name).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(c.slug, c.name).toBe(c.name.toLowerCase().replace(/\s+/g, "-"));
    }
  });

  it("never shares a path with the dates pictures", () => {
    for (const c of CITY_PAGES) expect(existsSync(join(process.cwd(), "public", "dates", c.slug)), c.slug).toBe(false);
  });

  it("puts every city where the offline table has it, or its real centre where the table is off", () => {
    for (const c of CITY_PAGES) {
      expect(isLatLng(c.lat, c.lng), c.slug).toBe(true);
      const table = CITIES.find((t) => t.name === c.name);
      if (table) expect(distanceKm(c, table), c.slug).toBeLessThan(15);
      else expect(OWN_CENTRE, c.slug).toContain(c.slug);
    }
    // The table's Singapore is the middle of the island; the dates are round the bay.
    expect(distanceKm(city("singapore"), { lat: 1.2834, lng: 103.8607 })).toBeLessThan(2);
    // The dates map's own starting point wins over the table's town hall.
    expect(city("london")).toMatchObject({ lat: 51.5115, lng: -0.1235 });
    for (const slug of OWN_CENTRE) {
      expect(getCity(slug), slug).toBeDefined();
      expect(CITIES.find((t) => t.name === city(slug).name), slug).toBeUndefined();
    }
  });

  it("never includes a city in Spain, by country or by name", () => {
    for (const c of CITY_PAGES) {
      expect(c.country, c.slug).not.toBe("ES");
      expect(`${c.name} ${c.es}`, c.slug).not.toMatch(SPAIN);
    }
  });

  it("never mentions Spain in its copy, in either language", () => {
    for (const s of [...strings(en.cities), ...strings(es.cities)]) {
      expect(s).not.toMatch(SPAIN);
      expect(mentionsSpain(s), s).toBe(false);
    }
  });

  it("recognises a mention of Spain in a place's name, in the languages the maps are written in, with or without accents", () => {
    for (const name of ["Bar Madrid", "Spanish Steps", "Piazza di Spagna", "Plaza de España", "Malaga Tapas", "Málaga Tapas", "Café Espagnol", "IBIZA CLUB"]) expect(mentionsSpain(name), name).toBe(true);
    for (const name of ["Monmouth Coffee", "Madridista", "Catalina", "Tate Modern", "Café de Flore"]) expect(mentionsSpain(name), name).toBe(false);
  });

  it("names cities in Spanish from the airports' table, with its own few additions", () => {
    expect(cityName(city("london"), "es")).toBe("Londres");
    expect(cityName(city("new-york"), "es")).toBe("Nueva York");
    expect(cityName(city("munich"), "es")).toBe("Múnich");
    expect(cityName(city("vienna"), "es")).toBe("Viena");
    expect(cityName(city("los-angeles"), "es")).toBe("Los Ángeles");
    expect(cityName(city("sydney"), "es")).toBe("Sídney");
    expect(cityName(city("riga"), "es")).toBe("Riga");
    expect(cityName(city("london"), "en")).toBe("London");
  });

  it("has a note in both languages for every city, and none for a city that isn't there", () => {
    expect(Object.keys(en.cities.notes).sort()).toEqual([...CITY_SLUGS].sort());
    expect(Object.keys(es.cities.notes).sort()).toEqual([...CITY_SLUGS].sort());
  });

  it("describes every trait in both languages, naming the city", () => {
    for (const trait of CITY_TRAITS) {
      expect(en.cities.traits[trait], trait).toContain("{city}");
      expect(es.cities.traits[trait], trait).toContain("{city}");
    }
  });

  it("gives every city some traits and only picks ideas that exist", () => {
    for (const c of CITY_PAGES) {
      expect(c.traits.length, c.slug).toBeGreaterThan(0);
      for (const trait of c.traits) expect(CITY_TRAITS).toContain(trait);
      for (const pick of c.picks) expect(ideaById(pick), `${c.slug}: ${pick}`).toBeDefined();
    }
  });

  it("opens the dates map on the city, in the page's language, and on an idea when asked", () => {
    const params = (href: string) => new URLSearchParams(href.split("?")[1]);
    const london = cityMapHref(city("london"), "es");
    expect(london.startsWith("/dates?")).toBe(true);
    expect(Object.fromEntries(params(london))).toEqual({ lat: "51.5115", lng: "-0.1235", q: "Londres" });
    expect(params(cityMapHref(city("new-york"), "en", "gallery-hop")).get("q")).toBe("New York");
    expect(params(cityMapHref(city("new-york"), "en", "gallery-hop")).get("idea")).toBe("gallery-hop");
    expect(params(mapHref({ lat: 1, lng: 2 }, "Café & Co")).get("q")).toBe("Café & Co");
  });

  it("links to the nearest other cities, nearest first", () => {
    const near = nearbyCities(city("london"));
    expect(near).toHaveLength(6);
    expect(near.map((c) => c.slug)).not.toContain("london");
    expect(near[0].slug).toBe("birmingham");
    const km = near.map((c) => distanceKm(city("london"), c));
    expect([...km].sort((a, b) => a - b)).toEqual(km);
  });
});

describe("the ideas for a city", () => {
  it("lists twelve to eighteen different ideas for every city", () => {
    expect(IDEAS_PER_CITY).toBeGreaterThanOrEqual(12);
    expect(IDEAS_PER_CITY).toBeLessThanOrEqual(18);
    for (const c of CITY_PAGES) {
      const ideas = ideasForCity(c);
      expect(ideas.length, c.slug).toBe(IDEAS_PER_CITY);
      expect(new Set(ideas.map((i) => i.id)).size, c.slug).toBe(ideas.length);
    }
  });

  it("is the same list every time for the same city", () => {
    for (const c of CITY_PAGES) expect(ideasForCity(c).map((i) => i.id)).toEqual(ideasForCity(c).map((i) => i.id));
  });

  it("never gives two cities the same list in the same order", () => {
    const seen = new Map<string, string>();
    for (const c of CITY_PAGES) {
      const key = ideasForCity(c)
        .map((i) => i.id)
        .join(",");
      expect(seen.get(key), `${c.slug} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, c.slug);
    }
  });

  it("puts what a city is known for near the top", () => {
    for (const c of CITY_PAGES) {
      const top = ideasForCity(c)
        .slice(0, 4)
        .map((i) => i.id);
      for (const pick of c.picks) expect(top, `${c.slug}: ${pick}`).toContain(pick);
    }
  });

  it("brings the indoor ideas forward in a rainy city and sends the ones rain would spoil to the back", () => {
    const ideas = ideasForCity({ traits: ["rainy"], picks: [] }, IDEAS.length);
    const at = (test: (i: (typeof IDEAS)[number]) => boolean) => ideas.flatMap((idea, n) => (test(idea) ? [n] : []));
    const indoor = at((i) => i.goodInRain);
    const neither = at((i) => !i.goodInRain && !i.needsDry);
    const spoilt = at((i) => i.needsDry);
    expect(Math.max(...indoor)).toBeLessThan(Math.min(...neither, ...spoilt));
    expect(Math.max(...neither)).toBeLessThan(Math.min(...spoilt));
  });

  it("puts the beach and the boats first by the sea, and leaves the beach out anywhere else", () => {
    const coastal = ideasForCity({ traits: ["coastal"], picks: [] });
    expect(coastal.slice(0, 2).map((i) => i.id).sort()).toEqual(["beach-until-sunset", "boats-on-the-water"]);
    for (const c of CITY_PAGES.filter((x) => !x.traits.includes("coastal"))) {
      expect(ideasForCity(c, IDEAS.length).map((i) => i.id), c.slug).not.toContain("beach-until-sunset");
    }
  });

  it("gets the skates out where winters are cold", () => {
    expect(ideasForCity({ traits: ["winter"], picks: [] })[0].id).toBe("skating-and-hot-chocolate");
  });

  it("keeps the midday outdoor ideas away from the top where it is hot", () => {
    const top = ideasForCity({ traits: ["hot"], picks: [] }).slice(0, 8);
    expect(top.some((i) => i.needsDry && i.moment === "day")).toBe(false);
  });

  it("scores the museums up in a museum city and the parks up in a city of parks", () => {
    const museum = ideaById("museum-then-wine")!;
    const garden = ideaById("garden-afternoon")!;
    expect(cityIdeaScore(museum, { traits: ["museums"], picks: [] })).toBeGreaterThan(cityIdeaScore(garden, { traits: ["museums"], picks: [] }));
    expect(cityIdeaScore(garden, { traits: ["parks"], picks: [] })).toBeGreaterThan(cityIdeaScore(museum, { traits: ["parks"], picks: [] }));
  });

  it("leaves the written order alone when a city says nothing about an idea", () => {
    const inland = IDEAS.filter((i) => i.id !== "beach-until-sunset").map((i) => i.id);
    expect(ideasForCity({ traits: [], picks: [] }, IDEAS.length).map((i) => i.id)).toEqual(inland);
  });

  it("explains the order with at most three of the city's traits, the weightiest first", () => {
    for (const c of CITY_PAGES) {
      const told = toldTraits(c, ideasForCity(c));
      expect(told.length, c.slug).toBeGreaterThan(0);
      expect(told.length, c.slug).toBeLessThanOrEqual(TOLD_TRAITS);
      for (const trait of told) expect(c.traits).toContain(trait);
    }
    expect(toldTraits(city("amsterdam"), ideasForCity(city("amsterdam")))).toEqual(["rainy", "museums", "nightlife"]);
  });

  it("only tells a trait when an idea it lifted is near the top of that city's list", () => {
    for (const c of CITY_PAGES) {
      const ideas = ideasForCity(c);
      for (const trait of toldTraits(c, ideas)) {
        expect(
          ideas.slice(0, TOP_OF_LIST).some((idea) => isLiftedBy(idea, trait)),
          `${c.slug}: ${trait}`,
        ).toBe(true);
      }
    }
    // Dublin is on the water, but rain and galleries send its boats to the bottom of the list.
    expect(toldTraits(city("dublin"), ideasForCity(city("dublin")))).not.toContain("coastal");
    // London's parks are real, but none of its first six ideas is a walk in one.
    expect(toldTraits(city("london"), ideasForCity(city("london")))).not.toContain("parks");
  });

  it("counts only a real lift, not a nudge", () => {
    expect(isLiftedBy(ideaById("beach-until-sunset")!, "coastal")).toBe(true);
    expect(isLiftedBy(ideaById("golden-hour-picnic")!, "coastal")).toBe(false);
    expect(isLiftedBy(ideaById("skating-and-hot-chocolate")!, "winter")).toBe(true);
    expect(isLiftedBy(ideaById("bookshop-and-coffee")!, "winter")).toBe(false);
  });

  it("writes an idea's hours the way the page's language does", () => {
    expect(hoursOf(150, "en")).toBe("2.5");
    expect(hoursOf(150, "es")).toBe("2,5");
    expect(hoursOf(120, "es")).toBe("2");
  });
});

const place = (id: string, kind: PlaceKind, score: number, over: Partial<Place> = {}): Place => ({
  id,
  name: id,
  named: true,
  kind,
  group: KINDS[kind].group,
  lat: 51.5,
  lng: -0.12,
  distanceKm: 0.5,
  cuisine: [],
  outdoorSeating: false,
  vegetarian: false,
  stepFree: false,
  notable: false,
  score,
  ...over,
});

describe("the places on a city's page", () => {
  it("names the best-ranked places, a few of each group, never a nameless one or the same name twice", () => {
    const places = [
      ...Array.from({ length: 12 }, (_, i) => place(`node/r${i}`, "restaurant", 90 - i)),
      place("node/m1", "museum", 60),
      place("node/v1", "viewpoint", 95, { named: false, name: "Viewpoint" }),
      place("node/c1", "cafe", 70, { name: "Chain Coffee" }),
      place("node/c2", "cafe", 69, { name: "chain coffee " }),
      place("node/p1", "park", 50),
    ];
    const top = topCityPlaces(places, 10, 3);
    expect(top.map((p) => p.id)).toEqual(["node/r0", "node/r1", "node/r2", "node/c1", "node/m1", "node/p1"]);
    expect(topCityPlaces(places).length).toBeLessThanOrEqual(PLACES_PER_CITY);
    expect(topCityPlaces(places, 2, 5).map((p) => p.id)).toEqual(["node/r0", "node/r1"]);
  });

  it("leaves off what the pages by kind leave off: a paved square filed as a park, a chain café (dates-N3-3)", () => {
    const places = [place("node/ls", "park", 99, { name: "Leicester Square" }), place("node/sb", "cafe", 98, { name: "Starbucks" }), place("node/rs", "garden", 97, { name: "Russell Square" }), place("node/cafe", "cafe", 96, { name: "Monmouth Coffee" })];
    expect(topCityPlaces(places, 10, 5).map((p) => p.id)).toEqual(["node/rs", "node/cafe"]);
  });

  it("sends each idea to places the ideas above it haven't, while there are others of the kind a walk away", () => {
    const books = ideaById("bookshop-and-coffee")!;
    const gallery = ideaById("gallery-hop")!;
    const golf = ideaById("mini-golf-and-milkshakes")!;
    const places = [place("node/books", "bookshop", 80), place("node/art", "gallery", 80), place("node/best-cafe", "cafe", 95), place("node/next-cafe", "cafe", 70), place("node/golf", "minigolf", 60)];
    // One café for the first idea, the other for the second; the third, with nothing left over, repeats one.
    expect(cityIdeaStops([books, gallery, golf], places).map((stops) => stops?.map((p) => p.id))).toEqual([
      ["node/books", "node/best-cafe"],
      ["node/art", "node/next-cafe"],
      ["node/golf", "node/best-cafe"],
    ]);
    // An idea the neighbourhood can't fill every stop of lists none, and uses nothing up.
    expect(cityIdeaStops([golf, books], places.filter((p) => p.kind !== "minigolf")).map((stops) => stops?.map((p) => p.id) ?? null)).toEqual([null, ["node/books", "node/best-cafe"]]);
  });

  it("groups them in the map's own order, leaving empty groups out", () => {
    const grouped = byGroup([place("a", "park", 1), place("b", "restaurant", 1), place("c", "cafe", 1), place("d", "restaurant", 1)]);
    expect(grouped.map((g) => g.group)).toEqual(GROUP_IDS.filter((g) => ["eat", "sweet", "outdoors"].includes(g)));
    expect(grouped[0].places.map((p) => p.id)).toEqual(["b", "d"]);
  });

  it("counts what the map knows, by group", () => {
    expect(countByGroup([place("a", "bar", 1), place("b", "restaurant", 1), place("c", "museum", 1)])).toEqual({ eat: 2, culture: 1 });
  });

  describe("read out of the map's tiles", () => {
    const centre = { lat: 51.5115, lng: -0.1235 };
    const tile = tileAt(centre);
    // OpenMapTiles ids: the OpenStreetMap id and a last digit for its type (1 is a node).
    const poi = (osm: number, subclass: string, name: string): PoiFeature => ({ id: osm * 10 + 1, px: 2048, py: 2048, extent: 4096, properties: { subclass, name, rank: 1 } });
    const features = [poi(1, "cafe", "Monmouth"), poi(2, "museum", "The Museum"), poi(3, "cafe", "Other Coffee")];

    it("keeps the places and counts them when every tile was read", () => {
      const { found, complete } = assembleCityPlaces([{ tile, features, ok: true }], centre, 1500, "en");
      expect(complete).toBe(true);
      expect(found?.places.map((p) => p.name).sort()).toEqual(["Monmouth", "Other Coffee", "The Museum"]);
      expect(found?.counts).toEqual({ sweet: 2, culture: 1 });
    });

    it("says so when a tile is missing, but keeps what the others gave", () => {
      const { found, complete } = assembleCityPlaces([{ tile, features, ok: true }, { tile: { x: tile.x + 1, y: tile.y }, features: [], ok: false }], centre, 1500, "en");
      expect(complete).toBe(false);
      expect(found?.places).toHaveLength(3);
    });

    it("leaves out a place whose name mentions Spain, before anything is counted", () => {
      const { found } = assembleCityPlaces([{ tile, features: [...features, poi(4, "bar", "Bar Madrid")], ok: true }], centre, 1500, "en");
      expect(found?.places.map((p) => p.name)).not.toContain("Bar Madrid");
      expect(found?.counts).toEqual({ sweet: 2, culture: 1 });
    });

    it("has nothing when no tile could be read", () => {
      expect(assembleCityPlaces([{ tile, features: [], ok: false }], centre, 1500, "en")).toEqual({ found: null, complete: false });
    });
  });
});

describe("the page's structured data", () => {
  const url = "https://example.com/dates/london";

  it("lists the ideas in order, each pointing at its card", () => {
    const ideas = ideasForCity(city("london"));
    const node = ideaListNode({ name: "Date ideas in London", url, ideas, locale: "en" });
    const items = node.itemListElement as { position: number; name: string; url: string }[];
    expect(node["@type"]).toBe("ItemList");
    expect(node.numberOfItems).toBe(ideas.length);
    expect(items[0]).toMatchObject({ position: 1, name: ideas[0].title.en, url: `${url}#idea-${ideas[0].id}` });
  });

  it("lists the places as places with coordinates", () => {
    const node = placeListNode({ name: "Near the centre", url, places: [{ name: "Tate", lat: 51.5, lng: -0.1 }] });
    expect(node.itemListElement).toEqual([{ "@type": "ListItem", position: 1, item: { "@type": "Place", name: "Tate", geo: { "@type": "GeoCoordinates", latitude: 51.5, longitude: -0.1 } } }]);
  });
});

describe("the cities added in Nov 2026", () => {
  it("C1 every new city's note is its own: no two open alike, and each says something to use", () => {
    for (const [locale, messages] of [["en", en], ["es", es]] as const) {
      const notes = messages.cities.notes as Record<string, string>;
      const openings = new Map<string, string>();
      for (const slug of NEW_CITIES) {
        const note = notes[slug];
        expect(note, `${slug} ${locale}`).toBeTruthy();
        expect(note.split(/\s+/).length, `${slug} ${locale}`).toBeGreaterThanOrEqual(14);
        expect(mentionsSpain(note), `${slug} ${locale}`).toBe(false);
        const opening = note.split(/\s+/).slice(0, 6).join(" ").toLowerCase();
        expect(openings.get(opening), `${slug} ${locale} opens like ${openings.get(opening)}`).toBeUndefined();
        openings.set(opening, slug);
      }
    }
  });

  it("C2 every city a page by kind links to has a page", () => {
    for (const slug of KIND_PAGE_CITIES) expect(CITY_SLUGS, slug).toContain(slug);
  });

  it("C3 a city the offline table lacks carries its own centre and country, and Spanish has its own name for two of them", () => {
    for (const slug of OWN_CENTRE) {
      const c = city(slug);
      expect(isLatLng(c.lat, c.lng), slug).toBe(true);
      expect(c.country, slug).toMatch(/^[A-Z]{2}$/);
    }
    expect(cityName(city("philadelphia"), "es")).toBe("Filadelfia");
    expect(cityName(city("st-louis"), "es")).toBe("San Luis");
    expect(city("st-louis").slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
});

describe("a kind of date inside a city", () => {
  const fixture: Place[] = [
    ...Array.from({ length: 5 }, (_, i) => place(`node/park${i}`, "park", 90 - i)),
    place("node/gal1", "gallery", 85),
    place("node/gal2", "gallery", 84, { name: "node/gal1" }),
    place("node/book", "bookshop", 83),
    place("node/view", "viewpoint", 82),
    place("node/nameless", "garden", 99, { named: false }),
    place("node/cafe1", "cafe", 81),
    place("node/cafe2", "cafe", 80),
    place("node/dessert", "dessert", 79),
    place("node/rest", "restaurant", 95),
    place("node/bar", "bar", 94),
    place("node/garden", "garden", 70),
  ];

  it("C4 the free places of a city are named, usually cost nothing, and are a few of each kind at most", () => {
    const free = kindPlaces("cheap", fixture);
    expect(free.length).toBeGreaterThan(0);
    expect(free.length).toBeLessThanOrEqual(KIND_PLACES);
    for (const p of free) {
      expect(guessCost(p), p.id).toBe(0);
      expect(p.named, p.id).toBe(true);
    }
    expect(new Set(free.map((p) => p.name.trim().toLowerCase())).size).toBe(free.length);
    const perKind = new Map<string, number>();
    for (const p of free) perKind.set(p.kind, (perKind.get(p.kind) ?? 0) + 1);
    for (const [kind, n] of perKind) expect(n, kind).toBeLessThanOrEqual(3);
    const ranked = rankPlaces(fixture, {}).map((p) => p.id);
    expect(free.map((p) => ranked.indexOf(p.id))).toEqual([...free.map((p) => ranked.indexOf(p.id))].sort((a, b) => a - b));
  });

  it("C4b a landmark is named on the free list only when it is notable (no sewer lamps, no private houses)", () => {
    const withLandmarks = [...fixture, place("node/lamp", "landmark", 200, { name: "Sewer ventilation lamp" }), place("node/bridge", "landmark", 199, { name: "Old bridge", notable: true })];
    const free = kindPlaces("cheap", withLandmarks).map((p) => p.id);
    expect(free).not.toContain("node/lamp");
    expect(free).toContain("node/bridge");
  });

  it("C5 where to meet is cafés, bookshops and galleries, as its heading says, and another kind has no list", () => {
    const meet = kindPlaces("first-date", [...fixture, place("node/plain", "bookshop", 300, { name: "Books" })]);
    expect(meet.length).toBeGreaterThan(0);
    for (const p of meet) expect(["cafe", "bookshop", "gallery"], p.id).toContain(p.kind);
    expect(meet.map((p) => p.id)).not.toContain("node/plain");
    expect(kindPlaces("fun", fixture)).toEqual([]);
  });

  it("C9 the city page's new lines fit, with the longest city name", () => {
    const longest = "Salt Lake City";
    for (const [l, m] of [["en", en], ["es", es]] as const) {
      const t = createTranslator({ locale: l, messages: m, namespace: "cities" });
      for (const line of [t("line", { ideas: 16, city: longest }), t("ideas.line", { city: longest }), t("places.line", { km: "1.5" })]) {
        expect(line.trim().split(/\s+/).length, `${l}: ${line}`).toBeLessThanOrEqual(14);
        expect(mentionsSpain(line), line).toBe(false);
      }
    }
  });

  it("C7 each kind’s list is its own kinds of place", () => {
    const mixed: Place[] = [
      ...fixture,
      place("node/bar2", "bar", 93, { name: "The Lamb" }),
      place("node/bar3", "bar", 92, { name: "Gordon’s" }),
      place("node/cine", "cinema", 91, { name: "Prince Charles Cinema" }),
      place("node/cine2", "cinema", 90, { name: "Curzon" }),
      place("node/thea", "theatre", 89, { name: "Old Vic" }),
      place("node/mus", "museum", 88, { name: "Sir John Soane’s Museum" }),
      place("node/mus2", "museum", 87, { name: "Foundling Museum" }),
      place("node/books2", "bookshop", 86, { name: "Daunt Books" }),
      place("node/beach", "beach", 85, { name: "Long Beach" }),
      place("node/bowl", "bowling", 84, { name: "All Star Lanes" }),
      place("node/arc", "arcade", 83, { name: "Namco Funscape" }),
      place("node/golf", "minigolf", 82, { name: "Puttshack" }),
      place("node/cellar", "bar", 81, { name: "Cellar Bar" }),
      place("node/roof", "bar", 80, { name: "Rooftop Bar" }),
      place("node/speak", "bar", 79, { name: "Hidden Speakeasy" }),
    ];
    for (const kind of ["romantic", "night", "outdoor", "rainy-day", "winter", "fun"] as const) {
      const list = kindPlaces(kind, mixed);
      expect(list.length, kind).toBeGreaterThanOrEqual(MIN_KIND_PLACES);
      for (const p of list) expect(KIND_PLACE_KINDS[kind], `${kind} ${p.id}`).toContain(p.kind);
    }
    const index = unusualIndex(mixed);
    const unique = kindPlaces("unique", mixed);
    for (const p of unique) expect(isTold(index.get(p.id)), p.name).toBe(true);
    expect(unique.length, "unique").toBeGreaterThanOrEqual(MIN_KIND_PLACES);
    expect(unique.map((p) => p.id)).not.toContain("node/thea");
    expect(kindPlaces("double-date", mixed)).toEqual([]);
  });

  it("C8 a list under three names is no list", () => {
    const two = [place("node/b1", "bar", 90, { name: "The Lamb" }), place("node/b2", "cinema", 89, { name: "Curzon" })];
    expect(kindPlaces("night", two)).toEqual([]);
    expect(kindPlaces("night", [...two, place("node/b3", "theatre", 88, { name: "Old Vic" })]).length).toBe(3);
  });

  it("C5b neither list names a chain café, a gallery that charges, a sports ground or a square filed as a park (dates-D3)", () => {
    const odd = [
      place("node/courtauld", "gallery", 300, { name: "The Courtauld Gallery" }),
      place("node/leicester", "park", 299, { name: "Leicester Square" }),
      place("node/cage", "park", 298, { name: "West Fourth Street Courts" }),
      place("node/sbux", "cafe", 297, { name: "Starbucks" }),
      place("node/kft", "cafe", 296, { name: "Kung Fu Tea" }),
      place("node/nero", "cafe", 295, { name: "Caffè Nero" }),
      place("node/gails", "cafe", 294, { name: "GAIL’s Bakery" }),
    ];
    const kept = [place("node/wsp", "park", 293, { name: "Washington Square Park" }), place("node/russell", "garden", 292, { name: "Russell Square Gardens" }), place("node/kasmin", "gallery", 291, { name: "Paul Kasmin Gallery" }), place("node/own", "cafe", 290, { name: "Café Paulette" })];
    const all = [...fixture, ...odd, ...kept];
    const listed = [...kindPlaces("cheap", all, 40), ...kindPlaces("first-date", all, 40)].map((p) => p.id);
    for (const p of odd) expect(listed, p.name).not.toContain(p.id);
    for (const p of kept) expect(listed, p.name).toContain(p.id);
  });

  it("C5c a garden square and an independent café named after a Paul stay on; the Paul bakery and the paved squares do not (dates-N1-3)", () => {
    for (const [name, kind] of [["Russell Square", "garden"], ["Soho Square", "park"], ["Paul Rothe & Son", "cafe"], ["Paulette", "cafe"]] as const) expect(leftOff({ name, kind }), name).toBe(false);
    for (const [name, kind] of [["PAUL", "cafe"], ["Paul Bakery", "cafe"], ["Leicester Square", "park"], ["Trafalgar Square", "park"], ["Times Square", "park"]] as const) expect(leftOff({ name, kind }), name).toBe(true);
    // A branch named after its street is still the bakery (dates-N2-2); a person called Paul still is not.
    for (const name of ["Paul (Covent Garden)", "Paul - Covent Garden", "Paul – Marylebone", "Paul(Soho)", "Paul Bakery (Kensington)"]) expect(leftOff({ name, kind: "cafe" }), name).toBe(true);
    for (const name of ["Paul Smith Café", "Paul's Coffee", "Pauls - Corner Café"]) expect(leftOff({ name, kind: "cafe" }), name).toBe(false);
    // A double first name is a person too: the dash counts only with a space before it (dates-N3-2).
    for (const name of ["Paul-Henri Café", "Paul–Émile", "Paul-Bakery"]) expect(leftOff({ name, kind: "cafe" }), name).toBe(false);
  });

  it("C5d every city title and city-by-kind title fits a search result with the brand on, in both languages (dates-D9)", () => {
    // pageMetadata drops " · Ethos" from a title past seventy characters: fitting keeps it on every page alike.
    const branded = (title: string) => `${title} · ${SITE.name}`;
    for (const [l, messages] of [["en", en], ["es", es]] as const) {
      const t = createTranslator({ locale: l, messages, namespace: "cities" });
      for (const c of CITY_PAGES)
        for (const places of [0, 1, PLACES_PER_CITY]) {
          const title = t("meta.title", { city: cityName(c, l), ideas: ideasForCity(c).length, places });
          expect(branded(title).length, title).toBeLessThanOrEqual(70);
        }
      for (const { title, description } of Object.values(CITY_KIND_COPY)) {
        expect(title[l].length, title[l]).toBeLessThanOrEqual(60);
        expect(description[l].length, description[l]).toBeLessThanOrEqual(155);
      }
    }
  });

  it("C6 the sitemap lists the ten kinds, every pair the data holds and every city, each in both languages", () => {
    const urls = sitemap().map((p) => new URL(p.url).pathname);
    for (const kind of DATE_KINDS) for (const prefix of ["", "/es"]) expect(urls, kind).toContain(`${prefix}/dates/ideas/${kind}`);
    for (const { city: c, kind } of CITY_KIND_PAIRS) for (const prefix of ["", "/es"]) expect(urls).toContain(`${prefix}/dates/${c}/${kind}`);
    for (const prefix of ["", "/es"]) expect(urls.filter((u) => CITY_SLUGS.some((s) => u === `${prefix}/dates/${s}`))).toHaveLength(CITY_SLUGS.length);
    expect(urls.some((u) => u.endsWith("/dates/ideas/at-home"))).toBe(false);
  });
});
