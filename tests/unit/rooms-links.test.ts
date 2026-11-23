import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
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
import { showsAnniversaryDates } from "@/lib/lifecycle/anniversary-dates";
import { LDR_GAMES } from "@/lib/ldr/games";
import { TRIP_GIFT_SLUG } from "@/lib/trips/trip-gift";
import { halfwayBetween, halfwayCityName, isOwnTown } from "@/lib/ldr/halfway";
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
    for (const slug of ["our-timeline", "museum", "the-letter"]) expect(showsAnniversaryDates(slug), slug).toBe(true);
    // A birthday's, a Valentine's first, long distance first, the trip gift, and no template at all.
    for (const slug of ["birthday-cinema", "bouquet", "halfway", "pack-your-bags", "nope"]) expect(showsAnniversaryDates(slug), slug).toBe(false);
    expect(TRIP_GIFT_SLUG).toBe("pack-your-bags");
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

  it("the games for a call are three, two of them from the games' own shelf", () => {
    expect(LDR_GAMES.map((g) => g.href)).toEqual(["/games/draw", "/games/rather", "/games/today"]);
    for (const g of LDR_GAMES.slice(0, 2)) {
      const shelf = GAMES.find((x) => x.href === g.href)!;
      expect([g.rank, g.suit, g.sticker]).toEqual([shelf.rank, shelf.suit, shelf.sticker]);
    }
  });
});
