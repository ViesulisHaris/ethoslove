import { describe, expect, it } from "vitest";
import { tripCarHire } from "@/lib/trips/partners";
import { TRIPS } from "@/lib/trips/presets";
import { builtIdeaKinds, IDEA_MIN_TRIPS, ideaTrips, TRIP_IDEA_CANDIDATES, TRIP_IDEA_KINDS } from "@/lib/trips/idea-kinds";
import { fill } from "@/content/trip-origins";
import { TRIP_IDEA_COPY, TRIP_IDEAS_UI } from "@/content/trip-ideas";

const ids = (kind: (typeof TRIP_IDEA_CANDIDATES)[number]) => ideaTrips(kind).map((t) => t.id);
const words = (x: string) => x.trim().split(/\s+/).filter(Boolean).length;
const LANGS = ["en", "es"] as const;

describe("the pages by kind of trip", () => {
  it("K1 the data makes two of the four", () => {
    expect(ids("weekend-getaways")).toEqual(["lisbon-slow-weekend", "paris-without-cliches", "copenhagen-hygge", "amsterdam-by-bike"]);
    expect([...ids("romantic-city-breaks")].sort()).toEqual([...ids("weekend-getaways")].sort());
    expect(ids("cheap-trips-in-europe")).toEqual(["baltic-coast"]);
    expect(ids("road-trips")).toHaveLength(6);
    expect(builtIdeaKinds()).toEqual([...TRIP_IDEA_KINDS]);
  });

  it("K2 a page has four trips or more, and no two pages have one list", () => {
    const lists = TRIP_IDEA_KINDS.map((k) => ids(k).join(","));
    for (const k of TRIP_IDEA_KINDS) expect(ids(k).length, k).toBeGreaterThanOrEqual(IDEA_MIN_TRIPS);
    expect(new Set(lists).size).toBe(lists.length);
  });

  it("K3 each trip on a page has its one line of why, and no other trip has one", () => {
    for (const k of TRIP_IDEA_KINDS) {
      expect(Object.keys(TRIP_IDEA_COPY[k].fits).sort(), k).toEqual([...ids(k)].sort());
      for (const [id, line] of Object.entries(TRIP_IDEA_COPY[k].fits)) {
        for (const l of LANGS) {
          expect(words(line[l]), `${k} ${id} ${l}`).toBeLessThanOrEqual(12);
          expect(line[l], `${k} ${id} ${l}`).toMatch(/\.$/);
        }
      }
    }
  });

  it("K4 what the pages say of their trips is in the trips", () => {
    const weekend = ideaTrips("weekend-getaways");
    for (const t of weekend) {
      expect([3, 4], t.id).toContain(t.days);
      expect(t.kind, t.id).toBe("city");
      expect(tripCarHire(t), t.id).toBeNull();
    }
    expect(weekend).toHaveLength(4);
    expect(TRIPS).toHaveLength(12);
    const others = TRIPS.filter((t) => !weekend.includes(t));
    for (const t of others) expect([6, 7], t.id).toContain(t.days);
    expect(others.filter((t) => t.kind === "road")).toHaveLength(6);
    expect(others.filter((t) => t.kind === "train")).toHaveLength(1);
    expect(others.filter((t) => t.kind === "islands")).toHaveLength(1);
    const road = ideaTrips("road-trips");
    expect(road).toHaveLength(6);
    for (const t of road) {
      expect(tripCarHire(t), t.id).not.toBeNull();
      expect([6, 7], t.id).toContain(t.days);
    }
    expect(road.filter((t) => t.budget === 1).map((t) => t.id)).toEqual(["baltic-coast"]);
  });

  it("K5 the hero's words fit", () => {
    for (const k of TRIP_IDEA_KINDS) {
      const c = TRIP_IDEA_COPY[k];
      for (const l of LANGS) {
        expect(words(c.line[l]), `${k} ${l}`).toBeLessThanOrEqual(16);
        expect(words(c.sentence[l]), `${k} ${l}`).toBeLessThanOrEqual(30);
        expect(words(c.whyBody[l]), `${k} ${l}`).toBeLessThanOrEqual(180);
      }
    }
    for (const l of LANGS) expect(words(TRIP_IDEAS_UI[l].listLine)).toBeLessThanOrEqual(14);
  });

  it("K6 titles and descriptions fit a search result", () => {
    for (const k of TRIP_IDEA_KINDS) {
      for (const l of LANGS) {
        const title = fill(TRIP_IDEA_COPY[k].title[l], { count: ideaTrips(k).length });
        expect(title.length, title).toBeLessThanOrEqual(60);
        expect(TRIP_IDEA_COPY[k].description[l].length, `${k} ${l}`).toBeLessThanOrEqual(155);
      }
    }
    expect(TRIP_IDEA_COPY["weekend-getaways"].title.en.startsWith("Weekend getaways")).toBe(true);
    expect(TRIP_IDEA_COPY["road-trips"].title.en.startsWith("Road trips")).toBe(true);
  });

  it("K8 the hero's photograph is no card on its page, and the hero's sentence names its trip", () => {
    const heroes = TRIP_IDEA_KINDS.map((k) => TRIP_IDEA_COPY[k].hero);
    expect(new Set(heroes).size).toBe(heroes.length);
    for (const k of TRIP_IDEA_KINDS) {
      const hero = TRIPS.find((t) => t.id === TRIP_IDEA_COPY[k].hero);
      expect(hero?.image, k).toBeTruthy();
      expect(ideaTrips(k).map((t) => t.id), k).not.toContain(hero!.id);
      // The sentence names the trip in the picture: its title's first place.
      for (const l of LANGS) expect(TRIP_IDEA_COPY[k].sentence[l], `${k} ${l}`).toContain(hero!.title[l].replace(/^De /, "").split(" ")[0]);
    }
    // What the sentences say of them: Prague's first two nights; a car on one day of the islands.
    const prague = TRIPS.find((t) => t.id === "prague-krumlov-vienna")!;
    expect([prague.kind, prague.stops[0].name, prague.stops[0].nights]).toEqual(["train", "Prague", 2]);
    const islands = TRIPS.find((t) => t.id === "santorini-naxos")!;
    expect(islands.kind).toBe("islands");
    expect(islands.plan.flatMap((d) => d.items.en).filter((x) => /hire a car/i.test(x))).toHaveLength(1);
  });

  it("K9 the cards' lines on a page do not start alike", () => {
    for (const k of TRIP_IDEA_KINDS) {
      for (const l of LANGS) {
        const firsts = ideaTrips(k).map((t) => TRIP_IDEA_COPY[k].fits[t.id][l].split(/\s+/)[0].toLowerCase());
        expect(new Set(firsts).size, `${k} ${l}: ${firsts.join(", ")}`).toBe(firsts.length);
      }
    }
  });

  it("K10 what the folded notes say is in the trips", () => {
    const trip = (id: string) => TRIPS.find((t) => t.id === id)!;
    const nights = (id: string) => trip(id).stops.reduce((n, s) => n + s.nights, 0);
    // Weekend: two nights for three of them, three for Paris; Copenhagen in December, the others in spring, early summer and September.
    expect(["lisbon-slow-weekend", "copenhagen-hygge", "amsterdam-by-bike"].map(nights)).toEqual([2, 2, 2]);
    expect(nights("paris-without-cliches")).toBe(3);
    expect(trip("copenhagen-hygge").bestMonths).toContain(12);
    expect(trip("copenhagen-hygge").plan.some((d) => d.items.en.some((x) => x.includes("Tivoli") && x.includes("December")))).toBe(true);
    for (const id of ["lisbon-slow-weekend", "paris-without-cliches", "amsterdam-by-bike"]) {
      for (const m of [4, 5, 6, 9]) expect(trip(id).bestMonths, id).toContain(m);
      expect(trip(id).bestMonths, id).not.toContain(12);
    }
    // Road: where the car is collected and left.
    const says = (id: string, text: string) => trip(id).plan.some((d) => d.items.en.some((x) => x.includes(text))) || trip(id).stops.some((s) => s.note.en.includes(text));
    expect(says("amalfi-coast", "Collect the car on the way out")).toBe(true);
    expect(says("scottish-highlands", "collect the car on your way out the next morning")).toBe(true);
    expect(trip("baltic-coast").plan[2].items.en[0]).toContain("Collect the car");
    expect(says("iceland-south-coast", "Collect the car at Keflavík")).toBe(true);
    expect(says("algarve-coast", "Collect the car at the airport")).toBe(true);
    expect(says("baltic-coast", "A one-way rental costs a little more")).toBe(true);
    expect(trip("baltic-coast").stops.at(-1)!.name).toBe("Tallinn");
    expect(says("tuscany-hill-towns", "back to Florence airport to drop the car")).toBe(true);
    expect(TRIP_IDEA_COPY["weekend-getaways"].whyBody.en).not.toMatch(/page of their own|this page|here is/i);
  });

  it("K7 the addresses are free", () => {
    const tripIds = TRIPS.map((t) => t.id);
    for (const k of TRIP_IDEA_CANDIDATES) expect(tripIds).not.toContain(k);
    expect(tripIds).not.toContain("ideas");
  });
});
