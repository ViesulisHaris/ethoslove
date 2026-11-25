import { describe, expect, it } from "vitest";
import { CITY_SLUGS } from "@/lib/cities/cities";
import { findAirport } from "@/lib/trips/airports";
import { estimateFlight } from "@/lib/trips/flights";
import { fill, TRIP_ORIGIN_COPY, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { TRIPS } from "@/lib/trips/presets";
import { ORIGIN_MAX, ORIGIN_MIN_TRIPS, reachable, TRIP_ORIGINS, tripsFrom, type TripOrigin } from "@/lib/trips/origins";

// The same as tests/unit/trips.test.ts.
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary)\b/i;
const origin = (slug: string): TripOrigin => {
  const o = TRIP_ORIGINS.find((x) => x.slug === slug);
  if (!o) throw new Error(`no origin ${slug}`);
  return o;
};
const from = (slug: string) => tripsFrom(origin(slug));
const minutes = (slug: string, trip: string): number => {
  const t = from(slug).find((x) => x.id === trip);
  if (t?.airMinutes === undefined) throw new Error(`${slug}: no minutes to ${trip}`);
  return t.airMinutes;
};

describe("the cities to leave from", () => {
  it("O1 there are at most ten, each with its own address", () => {
    expect(TRIP_ORIGINS.length).toBeLessThanOrEqual(ORIGIN_MAX);
    const slugs = TRIP_ORIGINS.map((o) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z]+(-[a-z]+)*$/);
    for (const t of TRIPS) {
      expect(t.id.startsWith("from-"), t.id).toBe(false);
      expect(t.id).not.toBe("ideas");
    }
  });

  it("O2 each leaves from an airport the data holds, and none is in Spain", () => {
    for (const o of TRIP_ORIGINS) {
      const a = findAirport(o.airport);
      expect(a, o.slug).not.toBeNull();
      expect(a?.iata).toBe(o.airport);
      expect(a?.city).toBe(o.name.en);
      expect(a?.country).not.toBe("ES");
      expect(o.name.en).not.toMatch(SPAIN);
      expect(o.name.es).not.toMatch(SPAIN);
    }
  });

  it("O3 a page exists only with six trips in reach", () => {
    for (const o of TRIP_ORIGINS) expect(reachable(o), o.slug).toBeGreaterThanOrEqual(ORIGIN_MIN_TRIPS);
    // The rule bites: from New York nothing is within five hours and nothing goes by train.
    expect(reachable({ airport: "JFK", trains: [] })).toBe(0);
  });

  it("O4 the twelve are ranked nearest first, each once", () => {
    for (const o of TRIP_ORIGINS) {
      const list = tripsFrom(o);
      expect(list.map((t) => t.id).sort(), o.slug).toEqual(TRIPS.map((t) => t.id).sort());
      const homes = list.filter((t) => t.home);
      if (homes.length) expect(list[0].home, o.slug).toBe(true);
      const mins = list.filter((t) => !t.home).map((t) => t.airMinutes ?? 0);
      expect([...mins].sort((a, b) => a - b), o.slug).toEqual(mins);
    }
    expect(from("london").slice(0, 3).map((t) => t.id)).toEqual(["paris-without-cliches", "amsterdam-by-bike", "scottish-highlands"]);
    expect(from("edinburgh")[0]).toMatchObject({ id: "scottish-highlands", home: true });
    expect(from("riga")[0]).toMatchObject({ id: "baltic-coast", home: true });
  });

  it("O5 a train is named only where the map allows one, and never for the trip that starts here", () => {
    for (const o of TRIP_ORIGINS) {
      for (const id of o.trains) {
        const t = tripsFrom(o).find((x) => x.id === id);
        expect(t, `${o.slug} ${id}`).toBeDefined();
        expect(t?.home, `${o.slug} ${id}`).toBe(false);
        expect(t?.km ?? Infinity, `${o.slug} ${id}`).toBeLessThan(600);
      }
    }
    expect(Object.fromEntries(TRIP_ORIGINS.map((o) => [o.slug, [...o.trains]]))).toEqual({
      london: ["paris-without-cliches", "amsterdam-by-bike", "scottish-highlands"],
      edinburgh: [],
      glasgow: ["scottish-highlands"],
      manchester: ["scottish-highlands"],
      birmingham: ["scottish-highlands"],
      dublin: [],
      paris: ["amsterdam-by-bike"],
      amsterdam: ["paris-without-cliches"],
      berlin: ["prague-krumlov-vienna"],
      riga: [],
    });
  });

  it("O6 the sentences' numbers are the data's", () => {
    // london: three by train; Santorini about four hours; the rest three hours or less.
    expect(origin("london").trains).toHaveLength(3);
    expect(minutes("london", "santorini-naxos")).toBe(235);
    for (const t of from("london")) if (!t.train && t.id !== "santorini-naxos") expect(t.airMinutes, t.id).toBeLessThanOrEqual(180);
    // edinburgh: the Highlands start here; three under two hours; three just over three; Santorini four and a half.
    expect(from("edinburgh").find((t) => t.home)?.id).toBe("scottish-highlands");
    for (const id of ["amsterdam-by-bike", "paris-without-cliches", "copenhagen-hygge"]) expect(minutes("edinburgh", id), id).toBeLessThan(120);
    for (const id of ["lisbon-slow-weekend", "amalfi-coast", "algarve-coast"]) {
      expect(minutes("edinburgh", id), id).toBeGreaterThanOrEqual(181);
      expect(minutes("edinburgh", id), id).toBeLessThanOrEqual(200);
    }
    expect(minutes("edinburgh", "santorini-naxos")).toBe(270);
    // glasgow: the Highlands by train; three under two hours; Iceland about two hours twenty, nearer than Tuscany or the Baltic coast.
    expect(origin("glasgow").trains).toContain("scottish-highlands");
    for (const id of ["amsterdam-by-bike", "paris-without-cliches", "copenhagen-hygge"]) expect(minutes("glasgow", id), id).toBeLessThan(120);
    expect(minutes("glasgow", "iceland-south-coast")).toBe(140);
    expect(minutes("glasgow", "iceland-south-coast")).toBeLessThan(minutes("glasgow", "tuscany-hill-towns"));
    expect(minutes("glasgow", "iceland-south-coast")).toBeLessThan(minutes("glasgow", "baltic-coast"));
    // manchester: the Highlands by train; Amsterdam and Paris about an hour and a quarter; only Santorini over three hours, a little over four.
    expect(origin("manchester").trains).toContain("scottish-highlands");
    expect(minutes("manchester", "amsterdam-by-bike")).toBe(75);
    expect(minutes("manchester", "paris-without-cliches")).toBe(80);
    const over = from("manchester").filter((t) => (t.airMinutes ?? 0) > 180);
    expect(over.map((t) => t.id)).toEqual(["santorini-naxos"]);
    expect(over[0].airMinutes).toBeGreaterThanOrEqual(241);
    expect(over[0].airMinutes).toBeLessThanOrEqual(260);
    // birmingham: Amsterdam and Paris an hour and a quarter or less; the Highlands by train; every trip but Santorini under three hours.
    expect(minutes("birmingham", "amsterdam-by-bike")).toBeLessThanOrEqual(75);
    expect(minutes("birmingham", "paris-without-cliches")).toBeLessThanOrEqual(75);
    expect(origin("birmingham").trains).toContain("scottish-highlands");
    for (const t of from("birmingham")) if (t.id !== "santorini-naxos") expect(t.airMinutes, t.id).toBeLessThan(180);
    // dublin: Edinburgh an hour; Amsterdam and Paris about an hour and a half; no train.
    expect(minutes("dublin", "scottish-highlands")).toBe(60);
    expect(minutes("dublin", "amsterdam-by-bike")).toBe(95);
    expect(minutes("dublin", "paris-without-cliches")).toBe(95);
    expect(origin("dublin").trains).toEqual([]);
    // paris: Paris is one of the twelve; Amsterdam by train; Edinburgh, Prague, Florence about an hour and three quarters; nothing over three hours forty.
    expect(from("paris").find((t) => t.home)?.id).toBe("paris-without-cliches");
    expect(origin("paris").trains).toContain("amsterdam-by-bike");
    expect([minutes("paris", "scottish-highlands"), minutes("paris", "prague-krumlov-vienna"), minutes("paris", "tuscany-hill-towns")]).toEqual([100, 105, 105]);
    expect(Math.max(...from("paris").map((t) => t.airMinutes ?? 0))).toBeLessThanOrEqual(220);
    // amsterdam: Amsterdam is one of the twelve; Paris by train; Copenhagen, Edinburgh, Prague about an hour and a half; Santorini the furthest at three hours forty.
    expect(from("amsterdam").find((t) => t.home)?.id).toBe("amsterdam-by-bike");
    expect(origin("amsterdam").trains).toContain("paris-without-cliches");
    expect([minutes("amsterdam", "copenhagen-hygge"), minutes("amsterdam", "scottish-highlands"), minutes("amsterdam", "prague-krumlov-vienna")]).toEqual([85, 85, 90]);
    expect(from("amsterdam").at(-1)).toMatchObject({ id: "santorini-naxos", airMinutes: 220 });
    // berlin: Prague to Vienna by train; Copenhagen an hour; Riga an hour and forty; Lisbon, the Algarve, Iceland over three and a half hours.
    expect(origin("berlin").trains).toContain("prague-krumlov-vienna");
    expect(minutes("berlin", "copenhagen-hygge")).toBe(60);
    expect(minutes("berlin", "baltic-coast")).toBe(100);
    for (const id of ["lisbon-slow-weekend", "algarve-coast", "iceland-south-coast"]) expect(minutes("berlin", id), id).toBeGreaterThan(210);
    // riga: the Baltic coast starts here; Copenhagen an hour and a half; Prague under two; Lisbon and the Algarve over four and a half hours.
    expect(from("riga").find((t) => t.home)?.id).toBe("baltic-coast");
    expect(minutes("riga", "copenhagen-hygge")).toBe(90);
    expect(minutes("riga", "prague-krumlov-vienna")).toBe(110);
    for (const id of ["lisbon-slow-weekend", "algarve-coast"]) expect(minutes("riga", id), id).toBeGreaterThan(270);
  });

  const words = (x: string) => x.trim().split(/\s+/).filter(Boolean).length;

  it("O7 every origin has its own two sentences, in both languages, within the hero's limits", () => {
    expect(Object.keys(TRIP_ORIGIN_COPY).sort()).toEqual(TRIP_ORIGINS.map((o) => o.slug).sort());
    for (const l of ["en", "es"] as const) {
      const seen = { line: new Set<string>(), sentence: new Set<string>() };
      for (const o of TRIP_ORIGINS) {
        const c = TRIP_ORIGIN_COPY[o.slug];
        expect(words(c.line[l]), `${o.slug} ${l} line`).toBeLessThanOrEqual(16);
        expect(words(c.sentence[l]), `${o.slug} ${l} sentence`).toBeLessThanOrEqual(30);
        expect(c.line[l], `${o.slug} ${l}`).toMatch(/\.$/);
        expect(c.sentence[l], `${o.slug} ${l}`).toMatch(/\.$/);
        for (const k of ["line", "sentence"] as const) {
          // Not the same paragraph with the city swapped.
          const plain = c[k][l].split(o.name[l]).join("X");
          expect(seen[k].has(plain), `${o.slug} ${l} ${k}`).toBe(false);
          seen[k].add(plain);
        }
      }
    }
  });

  it("O8 titles and descriptions fit a search result", () => {
    const starts = { en: { weekend: "Weekend trips from", "city-breaks": "City breaks from" }, es: { weekend: "Escapadas desde", "city-breaks": "Escapadas urbanas desde" } };
    const titles = new Set<string>();
    for (const l of ["en", "es"] as const) {
      for (const o of TRIP_ORIGINS) {
        const title = fill(TRIP_ORIGIN_UI[l].title[o.phrase], { city: o.name[l] });
        const description = fill(TRIP_ORIGIN_UI[l].description, { city: o.name[l], count: TRIPS.length });
        expect(title.length, title).toBeLessThanOrEqual(60);
        expect(title.startsWith(starts[l][o.phrase]), title).toBe(true);
        expect(title).toContain(o.name[l]);
        expect(description.length, description).toBeLessThanOrEqual(155);
        titles.add(title);
      }
    }
    expect(titles.size).toBe(TRIP_ORIGINS.length * 2);
  });

  it("O9 each origin's date ideas page exists", () => {
    for (const o of TRIP_ORIGINS) expect(CITY_SLUGS, o.slug).toContain(o.city);
  });

  it("O10 the method's own numbers are the code's", () => {
    expect(estimateFlight(0)).toBe(35);
    expect(estimateFlight(1) % 5).toBe(0);
    expect(TRIP_ORIGIN_UI.en.hoursBody).toContain("35 minutes");
    expect(TRIP_ORIGIN_UI.en.hoursBody).toContain("five minutes");
    expect(TRIP_ORIGIN_UI.es.hoursBody).toContain("35 minutos");
  });
});
