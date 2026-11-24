import { describe, expect, it } from "vitest";
import { distanceKm } from "@/lib/dates/geo";
import { findAirport } from "@/lib/trips/airports";
import { estimateFlight } from "@/lib/trips/flights";
import { lengthFits, matchTrips, metWishes, topMatches, type MatchLength, type MatchTrip, type MatchWish } from "@/lib/trips/match";
import { TRIP_KINDS, TRIPS } from "@/lib/trips/presets";

const TABLE: MatchTrip[] = TRIPS.map(({ id, kind, days, budget, bestMonths, flyTo }) => ({ id, kind, days, budget, bestMonths, flyTo }));
const air = (name: string) => findAirport(name)!;
const ids = (wish: MatchWish, month: number) => matchTrips(wish, TABLE, month).map((p) => p.id);
const budgetOf = (id: string) => TABLE.find((t) => t.id === id)!.budget;

describe("the trip matcher", () => {
  it("a weekend is up to three days, a week is seven or more, and four to six lie between", () => {
    expect(lengthFits(3, "weekend")).toBe(true);
    expect(lengthFits(4, "mid")).toBe(true);
    expect(lengthFits(6, "mid")).toBe(true);
    expect(lengthFits(7, "week")).toBe(true);
    expect(lengthFits(4, "weekend")).toBe(false);
    expect(lengthFits(3, "mid")).toBe(false);
    expect(lengthFits(7, "mid")).toBe(false);
    expect(lengthFits(6, "week")).toBe(false);
  });

  it("with no wishes every trip comes back once, in the shelf's own order when none is in season", () => {
    const picks = matchTrips({}, TABLE, 11);
    expect(picks.map((p) => p.id)).toEqual(TRIPS.map((t) => t.id));
    for (const p of picks) {
      expect(p.relaxed).toEqual([]);
      expect(p.km).toBeUndefined();
      expect(p.airMinutes).toBeUndefined();
    }
  });

  it("what is in season leads", () => {
    const dec = matchTrips({}, TABLE, 12);
    expect(dec.slice(0, 2).map((p) => p.id)).toEqual(["prague-krumlov-vienna", "copenhagen-hygge"]);
    expect(dec[0].inSeason && dec[1].inSeason).toBe(true);
    expect(dec[2].id).toBe("lisbon-slow-weekend");
    expect(dec[2].inSeason).toBe(false);
    const june = matchTrips({}, TABLE, 6);
    expect(june.every((p) => p.inSeason)).toBe(true);
    expect(june.map((p) => p.id)).toEqual(TRIPS.map((t) => t.id));
  });

  it("a length narrows the list", () => {
    const picks = matchTrips({ length: "weekend" }, TABLE, 11);
    expect(picks.slice(0, 3).map((p) => p.id)).toEqual(["lisbon-slow-weekend", "copenhagen-hygge", "amsterdam-by-bike"]);
    expect(picks.slice(0, 3).every((p) => p.relaxed.length === 0)).toBe(true);
    expect(picks[3].relaxed).toEqual(["length"]);
    expect(topMatches({ length: "weekend" }, TABLE, 11).summary).toEqual({ kind: "all" });
  });

  it("a budget is a ceiling", () => {
    const picks = matchTrips({ budget: 1 }, TABLE, 11);
    expect(picks[0].id).toBe("baltic-coast");
    expect(picks[0].relaxed).toEqual([]);
    const rest = picks.slice(1);
    expect(rest.every((p) => p.relaxed.join() === "budget")).toBe(true);
    expect(rest.slice(0, 6).every((p) => budgetOf(p.id) === 2)).toBe(true);
    expect(rest.slice(6).every((p) => budgetOf(p.id) === 3)).toBe(true);
    expect(rest).toHaveLength(11);
    expect(topMatches({ budget: 1 }, TABLE, 11).summary).toEqual({ kind: "some", count: 1 });

    const two = matchTrips({ budget: 2 }, TABLE, 11).map((p) => budgetOf(p.id));
    const firstDear = two.indexOf(3);
    expect(two.slice(firstDear).every((b) => b === 3)).toBe(true);
  });

  it("a kind narrows the list", () => {
    const picks = matchTrips({ kind: "islands" }, TABLE, 11);
    expect(picks[0].id).toBe("santorini-naxos");
    expect(picks[0].relaxed).toEqual([]);
    expect(picks.slice(1).every((p) => p.relaxed.join() === "kind")).toBe(true);
  });

  it("the length gives way before the kind", () => {
    const wish: MatchWish = { length: "week", kind: "city" };
    const order = ids(wish, 11);
    const picks = matchTrips(wish, TABLE, 11);
    expect(picks[0].id).toBe("paris-without-cliches");
    expect(picks[0].relaxed).toEqual(["length"]);
    const lastCity = Math.max(...TABLE.filter((t) => t.kind === "city").map((t) => order.indexOf(t.id)));
    expect(order.indexOf("baltic-coast")).toBeGreaterThan(lastCity);
    expect(topMatches(wish, TABLE, 11).summary).toEqual({ kind: "none", letGo: ["length"] });
  });

  it("when two wishes must give way it says both", () => {
    const wish: MatchWish = { kind: "islands", length: "weekend", budget: 1 };
    const { picks, summary } = topMatches(wish, TABLE, 11);
    expect(picks[0].id).toBe("santorini-naxos");
    expect(picks[0].relaxed).toEqual(["length", "budget"]);
    expect(summary).toEqual({ kind: "none", letGo: ["length", "budget"] });
  });

  it("a train trip for a weekend is the train trip, a little long", () => {
    const picks = matchTrips({ kind: "train", length: "weekend" }, TABLE, 11);
    expect(picks[0].id).toBe("prague-krumlov-vienna");
    expect(picks[0].relaxed).toEqual(["length"]);
  });

  it("from their own airport a trip needs no flight", () => {
    const [first] = matchTrips({ from: air("Riga") }, TABLE, 11);
    expect(first.id).toBe("baltic-coast");
    expect(first.home).toBe(true);
    expect(first.airMinutes).toBeUndefined();
    expect(first.train).toBe(false);
  });

  it("the hours in the air come from the two airports, and a train is offered under 600 km", () => {
    const riga = matchTrips({ from: air("Riga") }, TABLE, 11);
    expect(riga[1].id).toBe("copenhagen-hygge");
    expect(riga[1].airMinutes).toBe(estimateFlight(distanceKm(air("Riga"), air("CPH"))));
    expect(riga[1].airMinutes).toBe(90);
    expect(riga[1].train).toBe(false);

    const london = matchTrips({ from: air("London") }, TABLE, 11);
    expect(london.slice(0, 3).map((p) => p.id)).toEqual(["paris-without-cliches", "amsterdam-by-bike", "scottish-highlands"]);
    expect(london.slice(0, 3).every((p) => p.train)).toBe(true);
    expect(london[0].airMinutes).toBe(60);
  });

  it("nearer leads among equals, and the season outranks nearness", () => {
    const lisbon = matchTrips({ from: air("Lisbon") }, TABLE, 11);
    expect(lisbon.slice(0, 3).map((p) => p.id)).toEqual(["lisbon-slow-weekend", "algarve-coast", "paris-without-cliches"]);
    expect(lisbon[1].train).toBe(true);
    expect(lisbon[1].airMinutes).toBe(50);
    const ny = matchTrips({ from: air("New York") }, TABLE, 12);
    expect(ny.slice(0, 2).map((p) => p.id)).toEqual(["prague-krumlov-vienna", "copenhagen-hygge"]);
  });

  it("a trip whose airport the table lacks is still ranked, without a flight", () => {
    const extra: MatchTrip = { id: "x", kind: "city", days: 3, budget: 1, bestMonths: [11], flyTo: "ZZZ" };
    const picks = matchTrips({ from: air("Riga") }, [...TABLE, extra], 11);
    const x = picks.find((p) => p.id === "x")!;
    expect(x).toBeDefined();
    expect(x.km).toBeUndefined();
    expect(x.train).toBe(false);
    expect(x.home).toBe(false);
  });

  it("for every combination of wishes: three different trips, the best first, and never a throw", () => {
    const lengths: (MatchLength | undefined)[] = [undefined, "weekend", "mid", "week"];
    const budgets: (1 | 2 | undefined)[] = [undefined, 1, 2];
    const kinds = [undefined, ...TRIP_KINDS];
    const froms = [null, air("Riga")];
    for (const length of lengths)
      for (const budget of budgets)
        for (const kind of kinds)
          for (const from of froms) {
            const { picks, summary } = topMatches({ from, length, budget, kind }, TABLE, 11);
            expect(picks).toHaveLength(3);
            expect(new Set(picks.map((p) => p.id)).size).toBe(3);
            // The kind gives way last: a first pick that misses it means none of the three meets it.
            // (Fewest wishes missed is not the rule: islands for a weekend on €150 leads with Santorini,
            // which misses the length and the budget, over two city weekends that miss the kind.)
            if (picks[0].relaxed.includes("kind")) expect(picks.every((p) => p.relaxed.includes("kind"))).toBe(true);
            if (picks[0].relaxed.length === 0) expect(summary.kind).not.toBe("none");
            expect(summary.kind === "all").toBe(picks.every((p) => p.relaxed.length === 0));
          }
  });
});

describe("why a pick fits", () => {
  it("names the wishes asked for and met, in the sentence's order, and nothing left at any", () => {
    expect(metWishes({}, { relaxed: [] })).toEqual([]);
    expect(metWishes({ kind: "city", length: "weekend" }, { relaxed: [] })).toEqual(["length", "kind"]);
    expect(metWishes({ length: "week", budget: 1, kind: "city" }, { relaxed: ["length"] })).toEqual(["budget", "kind"]);
    expect(metWishes({ length: "week", kind: "city" }, { relaxed: ["length", "kind"] })).toEqual([]);
  });

  it("every pick of every wish has something true to say", () => {
    const LENGTHS: (MatchLength | undefined)[] = [undefined, "weekend", "mid", "week"];
    for (const length of LENGTHS)
      for (const budget of [undefined, 1, 2] as const)
        for (const kind of [undefined, ...TRIP_KINDS]) {
          const wish: MatchWish = { ...(length ? { length } : {}), ...(budget ? { budget } : {}), ...(kind ? { kind } : {}) };
          for (const pick of topMatches(wish, TRIPS, 11).picks) {
            const trip = TRIPS.find((t) => t.id === pick.id)!;
            for (const w of metWishes(wish, pick)) {
              if (w === "length") expect(lengthFits(trip.days, wish.length!)).toBe(true);
              if (w === "budget") expect(trip.budget).toBeLessThanOrEqual(wish.budget!);
              if (w === "kind") expect(trip.kind).toBe(wish.kind);
            }
          }
        }
  });
});
