import { describe, expect, it } from "vitest";
import { KIND_IDEAS } from "@/lib/dates/date-kinds";
import { IDEAS, ideaById, isDoable, type DateIdea } from "@/lib/dates/ideas";
import { KIND_IDS, KINDS, type PlaceKind } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { readPlan } from "@/lib/dates/plan";
import { suggestTimes } from "@/lib/dates/timing";
import { lengthFits, placeNow, rankTonight, TONIGHT_ENDS_MIN, tonightPlan, tonightShift, tonightStart, tonightTimes } from "@/lib/dates/tonight";
import type { Condition, DayWeather } from "@/lib/dates/weather";

const place = (id: string, kind: PlaceKind, over: Partial<Place> = {}): Place => ({
  id,
  name: id,
  named: true,
  kind,
  group: KINDS[kind].group,
  lat: 38.714,
  lng: -9.139,
  distanceKm: 0.2,
  cuisine: [],
  outdoorSeating: false,
  vegetarian: false,
  stepFree: false,
  notable: false,
  score: 50,
  ...over,
});

/** One named place of every kind, all within a few hundred metres of each other. */
const EVERYTHING: Place[] = KIND_IDS.map((kind, i) => place(`node/${kind}`, kind, { lat: 38.714 + (i % 5) * 0.0004, lng: -9.139 + Math.floor(i / 5) * 0.0004 }));

const day = ({ condition = "clear", sunset = "19:27", sunrise = "07:30", rainChance = 0 }: { condition?: Condition; sunset?: string; sunrise?: string; rainChance?: number | null } = {}): DayWeather => ({ date: "2026-11-28", condition, tMax: 16, tMin: 9, rainChance, sunrise, sunset });
const DRY = day();
const WET = day({ condition: "rain", rainChance: 90 });
const idea = (id: string): DateIdea => ideaById(id)!;
const ids = (picks: { idea: DateIdea }[]): string[] => picks.map((p) => p.idea.id);
const EVENING = 18 * 60 + 45;

describe("tonight's start and clock", () => {
  it("T1 tonight starts half an hour from now on the quarter hour, and never before five", () => {
    expect(tonightStart(18 * 60 + 10)).toBe(18 * 60 + 45);
    expect(tonightStart(9 * 60)).toBe(17 * 60);
    expect(tonightStart(16 * 60 + 40)).toBe(17 * 60 + 15);
    expect(tonightStart(23 * 60 + 10)).toBe(23 * 60 + 45);
    expect(tonightStart(23 * 60 + 10)).toBeGreaterThan(TONIGHT_ENDS_MIN);
  });

  it("T2 reads the place's own clock and day, not the visitor's", () => {
    expect(placeNow({ utcOffsetSeconds: 3600 }, Date.UTC(2026, 10, 22, 23, 30))).toEqual({ date: "2026-11-23", minutes: 30 });
    expect(placeNow({ utcOffsetSeconds: -18000 }, Date.UTC(2026, 10, 22, 23, 30))).toEqual({ date: "2026-11-22", minutes: 18 * 60 + 30 });
  });
});

describe("tonight's ranking", () => {
  it("T3 with no wishes it leaves out what cannot be done nearby and keeps the written order", () => {
    const few = [place("node/c", "cafe"), place("node/b", "bookshop")];
    expect(ids(rankTonight({}, { day: DRY, places: few }))).toEqual(IDEAS.filter((i) => isDoable(i, few)).map((i) => i.id));
    const all = rankTonight({}, { day: DRY, places: EVERYTHING });
    expect(ids(all)).toEqual(IDEAS.map((i) => i.id));
    for (const pick of all) expect(pick).toMatchObject({ relaxed: [], shift: 0 });
  });

  it("T4 a wet forecast drops what rain would spoil and leads with the indoor ideas", () => {
    const picks = rankTonight({}, { day: WET, places: EVERYTHING });
    expect(picks.some((p) => p.idea.needsDry)).toBe(false);
    const lastRain = picks.map((p) => p.idea.goodInRain).lastIndexOf(true);
    const firstOther = picks.findIndex((p) => !p.idea.goodInRain);
    expect(lastRain).toBeGreaterThanOrEqual(0);
    if (firstOther !== -1) expect(lastRain).toBeLessThan(firstOther);
  });

  it("T5 tonight leaves out what has had its hour", () => {
    const picks = rankTonight({ startMin: EVENING }, { day: DRY, places: EVERYTHING });
    for (const p of picks) expect(["morning", "day"], p.idea.id).not.toContain(p.idea.moment);
    expect(ids(picks)).not.toContain("golden-hour-picnic");
    const late = rankTonight({ startMin: EVENING }, { day: day({ sunset: "21:30" }), places: EVERYTHING });
    expect(late.find((p) => p.idea.id === "golden-hour-picnic")).toMatchObject({ shift: 0 });
  });

  it("T6 an evening idea still ahead keeps its own hour, and one already begun starts from now", () => {
    const shiftOf = (startMin: number, id: string) => rankTonight({ startMin }, { day: DRY, places: EVERYTHING }).find((p) => p.idea.id === id);
    expect(shiftOf(EVENING, "pasta-and-a-slow-walk")?.shift).toBe(0);
    expect(shiftOf(20 * 60, "pasta-and-a-slow-walk")?.shift).toBe(60);
    expect(shiftOf(21 * 60 + 15, "pasta-and-a-slow-walk")).toBeUndefined();
    expect(shiftOf(21 * 60 + 15, "karaoke-duet")).toBeDefined();
  });

  it("T7 a budget is a ceiling", () => {
    const picks = rankTonight({ budget: 1 }, { day: DRY, places: EVERYTHING });
    const kept = picks.filter((p) => p.relaxed.length === 0);
    expect(kept.length).toBeGreaterThan(0);
    for (const p of kept) expect(p.idea.budget, p.idea.id).toBeLessThanOrEqual(1);
    const firstRelaxed = picks.findIndex((p) => p.relaxed.includes("budget"));
    expect(firstRelaxed).toBe(kept.length);
  });

  it("T8 a length is a window: up to two hours, two to three, three and more", () => {
    for (const [m, l] of [[90, "short"], [120, "short"], [120, "medium"], [180, "medium"], [180, "long"], [240, "long"]] as const) expect(lengthFits(m, l), `${m} ${l}`).toBe(true);
    for (const [m, l] of [[150, "short"], [210, "medium"], [150, "long"]] as const) expect(lengthFits(m, l), `${m} ${l}`).toBe(false);
  });

  it("T9 a mood and a page's kind narrow the list", () => {
    const artsy = rankTonight({ vibe: "artsy" }, { day: DRY, places: EVERYTHING }).filter((p) => p.relaxed.length === 0);
    expect(ids(artsy)).toEqual(IDEAS.filter((i) => i.vibes.includes("artsy")).map((i) => i.id));
    const fun = rankTonight({ kind: "fun" }, { day: DRY, places: EVERYTHING }).filter((p) => p.relaxed.length === 0);
    expect(ids(fun)).toEqual(IDEAS.filter((i) => KIND_IDEAS.fun.includes(i.id)).map((i) => i.id));
  });

  it("T10 when nothing fits every wish it gives way one wish at a time and says which", () => {
    const [first] = rankTonight({ budget: 0, startMin: EVENING }, { day: WET, places: EVERYTHING });
    expect(first).toMatchObject({ idea: { id: "stars-and-planets" }, relaxed: ["budget"] });
    const [fancy] = rankTonight({ length: "short", vibe: "fancy" }, { day: DRY, places: EVERYTHING });
    expect(fancy.idea.vibes).toContain("fancy");
    expect(fancy.relaxed).toEqual(["length"]);
  });

  it("T11 the page's kind is the last thing to give way", () => {
    const [first] = rankTonight({ kind: "cheap", startMin: EVENING }, { day: WET, places: EVERYTHING });
    expect(first).toMatchObject({ idea: { id: "stars-and-planets" }, relaxed: [] });
    const without = EVERYTHING.filter((p) => !["planetarium", "viewpoint", "cafe", "bar", "dessert"].includes(p.kind));
    const [other] = rankTonight({ kind: "cheap", startMin: EVENING }, { day: WET, places: without });
    expect(other.idea.id).not.toBe("stars-and-planets");
    expect(other.relaxed).toContain("kind");
  });

  it("T12 it never gives way on the weather, the hour or what is nearby", () => {
    expect(rankTonight({}, { day: WET, places: [place("node/p", "park"), place("node/c", "cafe")] })).toEqual([]);
    expect(rankTonight({ startMin: 23 * 60 + 15 }, { day: DRY, places: EVERYTHING })).toEqual([]);
  });

  it("T13 a city's own standing breaks a tie, and only a tie", () => {
    expect(rankTonight({}, { day: DRY, places: EVERYTHING, boost: { "bowling-night": 5 } })[0].idea.id).toBe("bowling-night");
    expect(rankTonight({ budget: 1 }, { day: DRY, places: EVERYTHING, boost: { "bowling-night": 5 } })[0].idea.id).not.toBe("bowling-night");
  });
});

describe("tonight's times and plan", () => {
  it("T14 the times are the idea's own unless tonight has to start later, and a sunset idea is never moved", () => {
    const pasta = idea("pasta-and-a-slow-walk");
    expect(tonightTimes(pasta, DRY, 0)).toEqual(suggestTimes(pasta, DRY));
    expect(tonightTimes(pasta, DRY, 60)).toEqual(["20:00", "21:30"]);
    expect(tonightTimes(idea("karaoke-duet"), DRY, 150)).toEqual(["23:30", "00:45"]);
    expect(tonightShift(idea("golden-hour-picnic"), DRY, EVENING)).toBeNull();
  });

  it("T15 the plan it opens is the idea's stops with their times, the idea, the day and the town", () => {
    const restaurant = place("node/r", "restaurant", { name: "Taberna", address: "Rua 1" });
    const viewpoint = place("node/v", "viewpoint", { name: "Viewpoint", named: false });
    const plan = tonightPlan(idea("pasta-and-a-slow-walk"), [restaurant, viewpoint], ["19:00", "20:30"], { date: "2026-11-28", where: "Lisbon" });
    expect(plan).toEqual({
      v: 1,
      date: "2026-11-28",
      where: "Lisbon",
      idea: "pasta-and-a-slow-walk",
      stops: [
        { id: "node/r", name: "Taberna", kind: "restaurant", lat: 38.714, lng: -9.139, address: "Rua 1", time: "19:00" },
        { id: "node/v", name: "Viewpoint", kind: "viewpoint", lat: 38.714, lng: -9.139, time: "20:30", named: false },
      ],
    });
    expect(readPlan(plan)).toEqual(plan);
    const gap = tonightPlan(idea("pasta-and-a-slow-walk"), [restaurant, null], ["19:00", "20:30"], { date: "2026-11-28" });
    expect(gap.stops).toHaveLength(1);
    expect("where" in gap).toBe(false);
  });
});
