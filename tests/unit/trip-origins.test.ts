import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { CITY_SLUGS } from "@/lib/cities/cities";
import { ideaPath, TRIP_IDEA_KINDS } from "@/lib/trips/idea-kinds";
import { findAirport } from "@/lib/trips/airports";
import { estimateFlight } from "@/lib/trips/flights";
import { fill, TRIP_ORIGIN_COPY, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { TRIPS } from "@/lib/trips/presets";
import { ORIGIN_MAX, ORIGIN_MIN_TRIPS, originCards, originPath, reachable, TRIP_ORIGINS, tripsFrom, type TripOrigin } from "@/lib/trips/origins";

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
    // Two trips the same minutes away go by the distance, nearer first: from Dublin, Amsterdam (757 km) before Paris (781).
    expect(from("dublin").slice(1, 3).map((t) => t.id)).toEqual(["amsterdam-by-bike", "paris-without-cliches"]);
    for (const o of TRIP_ORIGINS) {
      const km = tripsFrom(o).filter((t) => !t.home && !t.train).map((t) => t.km ?? 0);
      expect([...km].sort((a, b) => a - b), o.slug).toEqual(km);
    }
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
      dublin: [],
      paris: ["amsterdam-by-bike"],
      amsterdam: ["paris-without-cliches"],
      berlin: ["prague-krumlov-vienna"],
      riga: [],
    });
  });

  it("O6 the sentences' numbers are the data's", () => {
    const days = (id: string) => TRIPS.find((t) => t.id === id)!.days;
    const cityTrips = TRIPS.filter((t) => t.kind === "city").map((t) => t.id);
    // london: three by train; Paris and Amsterdam fit a long weekend; the Highlands start in Edinburgh; Iceland three hours and Santorini four, the two longest.
    expect(origin("london").trains).toEqual(["paris-without-cliches", "amsterdam-by-bike", "scottish-highlands"]);
    expect([days("paris-without-cliches"), days("amsterdam-by-bike")].every((d) => d <= 4)).toBe(true);
    expect(TRIPS.find((t) => t.id === "scottish-highlands")!.stops[0].name).toBe("Edinburgh");
    expect(from("london").slice(-2)).toMatchObject([{ id: "iceland-south-coast", airMinutes: 180 }, { id: "santorini-naxos", airMinutes: 235 }]);
    // edinburgh: the Highlands start here, a night in Edinburgh first; Amsterdam the nearest city break at 1 h 25; Lisbon three days, over three hours.
    expect(from("edinburgh")[0]).toMatchObject({ id: "scottish-highlands", home: true });
    expect(TRIPS.find((t) => t.id === "scottish-highlands")!.stops[0].nights).toBe(1);
    expect(from("edinburgh").find((t) => cityTrips.includes(t.id))).toMatchObject({ id: "amsterdam-by-bike", airMinutes: 85 });
    expect(days("lisbon-slow-weekend")).toBe(3);
    expect(minutes("edinburgh", "lisbon-slow-weekend")).toBeGreaterThan(180);
    // dublin: the nearest is the Highlands, an hour; no train; Lisbon the farthest city break, 2 h 40.
    expect(from("dublin")[0]).toMatchObject({ id: "scottish-highlands", airMinutes: 60, home: false });
    expect(origin("dublin").trains).toEqual([]);
    expect(from("dublin").filter((t) => cityTrips.includes(t.id)).at(-1)).toMatchObject({ id: "lisbon-slow-weekend", airMinutes: 160 });
    // paris: Paris is one of the twelve, four days; Amsterdam by train; Santorini the farthest, 3 h 35.
    expect(from("paris")[0]).toMatchObject({ id: "paris-without-cliches", home: true });
    expect(days("paris-without-cliches")).toBe(4);
    expect(origin("paris").trains).toEqual(["amsterdam-by-bike"]);
    expect(from("paris").at(-1)).toMatchObject({ id: "santorini-naxos", airMinutes: 215 });
    // amsterdam: Amsterdam is one of the twelve, three days, ending at Durgerdam; Paris by train, four days by the canal; Copenhagen and Edinburgh both 1 h 25; Santorini 3 h 40.
    expect(from("amsterdam")[0]).toMatchObject({ id: "amsterdam-by-bike", home: true });
    expect(days("amsterdam-by-bike")).toBe(3);
    expect(TRIPS.find((t) => t.id === "amsterdam-by-bike")!.stops.at(-1)!.name).toBe("Durgerdam");
    expect(origin("amsterdam").trains).toEqual(["paris-without-cliches"]);
    expect(TRIPS.find((t) => t.id === "paris-without-cliches")!.stops[0].name).toBe("Canal Saint-Martin");
    expect([minutes("amsterdam", "copenhagen-hygge"), minutes("amsterdam", "scottish-highlands")]).toEqual([85, 85]);
    expect(from("amsterdam").at(-1)).toMatchObject({ id: "santorini-naxos", airMinutes: 220 });
    // berlin: Prague to Vienna by train (the trip that goes by rail); Copenhagen an hour, three days; Santorini 3 h 10, nearer than Lisbon and the Algarve.
    expect(origin("berlin").trains).toEqual(["prague-krumlov-vienna"]);
    expect(TRIPS.find((t) => t.id === "prague-krumlov-vienna")!.kind).toBe("train");
    expect(minutes("berlin", "copenhagen-hygge")).toBe(60);
    expect(days("copenhagen-hygge")).toBe(3);
    expect(minutes("berlin", "santorini-naxos")).toBe(190);
    for (const id of ["lisbon-slow-weekend", "algarve-coast"]) expect(minutes("berlin", id), id).toBeGreaterThan(190);
    // riga: the Baltic coast starts here, its days the cheapest; Copenhagen 1 h 30 and Prague under two, the two shortest; Lisbon and the Algarve over 4 h 30.
    expect(from("riga")[0]).toMatchObject({ id: "baltic-coast", home: true });
    expect(TRIPS.filter((t) => t.budget === 1).map((t) => t.id)).toEqual(["baltic-coast"]);
    expect(from("riga").slice(1, 3)).toMatchObject([{ id: "copenhagen-hygge", airMinutes: 90 }, { id: "prague-krumlov-vienna", airMinutes: 110 }]);
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
      // No sentence on two origins, and no two sentences that start alike once the places are taken out.
      const places = new RegExp(`\\b(${[...TRIP_ORIGINS.map((o) => o.name[l]), "Edinburgh", "Edimburgo", "Copenhagen", "Copenhague", "Prague", "Praga", "Lisbon", "Lisboa", "Santorini", "Iceland", "Islandia", "Riga"].join("|")})\\b`, "g");
      const owner = new Map<string, string>();
      const starts = new Map<string, string>();
      for (const o of TRIP_ORIGINS) {
        const c = TRIP_ORIGIN_COPY[o.slug];
        for (const one of `${c.line[l]} ${c.sentence[l]}`.split(/(?<=[.;:])\s+/)) {
          const key = one.toLowerCase();
          expect(owner.get(key) ?? o.slug, `${l} "${one}" on ${o.slug} and ${owner.get(key)}`).toBe(o.slug);
          owner.set(key, o.slug);
          const start = one.replace(places, "X").toLowerCase().split(/\s+/).slice(0, 3).join(" ");
          expect(starts.get(start) ?? o.slug, `${l} "${start}…" on ${o.slug} and ${starts.get(start)}`).toBe(o.slug);
          starts.set(start, o.slug);
        }
      }
    }
  });

  it("O13 the Spanish labels speak to the two of them, not for the site", () => {
    expect(TRIP_ORIGIN_UI.es.from).toBe("Desde");
    expect(TRIP_ORIGIN_UI.es.listLine).not.toMatch(/el tren sale/);
    for (const c of Object.values(TRIP_ORIGIN_COPY)) expect(`${c.line.es} ${c.sentence.es}`).not.toMatch(/\bsalimos\b|\bpide[n]? (coche|aeropuerto)\b/i);
  });

  it("O12 each origin's page is its own: its six cards, its hero, no photograph twice", () => {
    const seqs = new Map<string, string>();
    const firstThree = new Map<string, string>();
    const heroes = new Set<string>();
    for (const o of TRIP_ORIGINS) {
      const cards = originCards(o).map((t) => t.id);
      expect(cards, o.slug).toHaveLength(6);
      expect(seqs.get(cards.join()) ?? o.slug, `${o.slug} shows ${seqs.get(cards.join())}'s six cards`).toBe(o.slug);
      seqs.set(cards.join(), o.slug);
      const three = cards.slice(0, 3).join();
      expect(firstThree.get(three) ?? o.slug, `${o.slug} opens like ${firstThree.get(three)}`).toBe(o.slug);
      firstThree.set(three, o.slug);
      // The hero is the trip that starts there, or else one the six cards do not show.
      const hero = TRIP_ORIGIN_COPY[o.slug].hero;
      const home = tripsFrom(o).find((t) => t.home);
      if (home) expect(hero, o.slug).toBe(home.id);
      expect(cards, o.slug).not.toContain(hero);
      expect(TRIPS.some((t) => t.id === hero && t.image), `${o.slug} hero ${hero}`).toBe(true);
      expect(heroes.has(hero), `${o.slug} hero ${hero}`).toBe(false);
      heroes.add(hero);
    }
    // The three taken out: their six would be another city's (lib/trips/origins.ts says why).
    for (const slug of ["glasgow", "manchester", "birmingham"]) expect(TRIP_ORIGINS.some((o) => o.slug === slug), slug).toBe(false);
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

  it("O11 the sitemap lists every origin and every kind in both languages, and nothing that is not a page", () => {
    const entries = sitemap();
    const paths = new Map(entries.map((e) => [new URL(e.url).pathname, e]));
    for (const path of [...TRIP_ORIGINS.map(originPath), ...TRIP_IDEA_KINDS.map(ideaPath)]) {
      for (const p of [path, `/es${path}`]) {
        expect(paths.has(p), p).toBe(true);
        expect(paths.get(p)?.lastModified, p).toBeTruthy();
      }
    }
    const all = [...paths.keys()].join(" ");
    for (const not of ["from-new-york", "romantic-city-breaks", "cheap-trips-in-europe"]) expect(all).not.toContain(not);
  });
});
