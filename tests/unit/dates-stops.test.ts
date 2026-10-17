import { describe, expect, it } from "vitest";
import { HERO_ART, heroSrcSet } from "@/lib/dates/art";
import { hoursOn } from "@/lib/dates/hours";
import { fillStops, fitsVibe, ideaById, VIBE_IDS, VIBE_KINDS } from "@/lib/dates/ideas";
import { GROUP_IDS, GROUPS, KIND_IDS, kindOf, kindOfPoi } from "@/lib/dates/kinds";
import { balance, SEARCH_PER_GROUP, type Place } from "@/lib/dates/places";
import { addStops, EMPTY_PLAN, isFarFromPlan, MAX_STOPS, moveStop, stopName, type Plan, type PlanStop } from "@/lib/dates/plan";
import { MAX_RATED_PLACES } from "@/lib/dates/rank";
import { KINDS } from "@/lib/dates/kinds";

const LONDON = { lat: 51.5115, lng: -0.1235 };
const place = (over: Partial<Place> & Pick<Place, "id" | "kind">): Place => ({ name: over.id, named: true, group: KINDS[over.kind].group, lat: LONDON.lat, lng: LONDON.lng, distanceKm: 0.2, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: 50, ...over });
/** A point `km` east of London's starter, near enough along a parallel. */
const east = (km: number) => ({ lat: LONDON.lat, lng: LONDON.lng + km / (111.32 * Math.cos((LONDON.lat * Math.PI) / 180)) });

describe("a search's places", () => {
  it("keeps the best few of every kind in a group before the rest, so bookshops never crowd out the cinema", () => {
    const shelves = Array.from({ length: 60 }, (_, i) => place({ id: `node/b${i}`, kind: "bookshop", score: 90 - i / 10 }));
    const cinema = place({ id: "node/cinema", kind: "cinema", score: 20 });
    const kept = balance([...shelves, cinema], 60);
    expect(kept).toHaveLength(60);
    expect(kept.some((p) => p.id === "node/cinema")).toBe(true);
    // Still best first, and never more than the group's share.
    expect(kept.filter((p) => p.kind === "bookshop").map((p) => p.id)).toEqual(shelves.slice(0, 59).map((p) => p.id));
    expect(balance([...shelves, cinema], 3).map((p) => p.id)).toEqual(["node/b0", "node/b1", "node/b2"]);
  });

  it("answers ratings for every place one search can show", () => {
    expect(MAX_RATED_PLACES).toBeGreaterThanOrEqual(GROUP_IDS.length * SEARCH_PER_GROUP + 160);
  });
});

describe("what a place is, for a couple", () => {
  it("files an arts centre as a stage, not a free gallery", () => {
    expect(kindOf({ amenity: "arts_centre", tourism: "attraction", name: "Royal Opera House" })).toBe("theatre");
    expect(kindOfPoi("arts_centre")).toBe("theatre");
    expect(kindOf({ tourism: "gallery" })).toBe("gallery");
  });

  it("leaves out spas and saunas that let in only one group", () => {
    expect(kindOf({ leisure: "sauna", name: "Pleasuredrome", lgbtq: "primary", "lgbtq:men": "only" })).toBeNull();
    expect(kindOf({ leisure: "sauna", name: "Sweatbox", lgbtq: "primary" })).toBeNull();
    expect(kindOf({ leisure: "sauna", name: "Saunabar", website: "https://gaysaunabar.com" })).toBeNull();
    expect(kindOf({ leisure: "spa", name: "Ladies' Pond Spa", female: "only" })).toBeNull();
    expect(kindOf({ leisure: "spa", name: "Covent Garden Spa" })).toBe("spa");
    expect(kindOf({ leisure: "sauna", name: "Kulttuurisauna" })).toBe("spa");
    // Only asked of spas: a bar for everybody is still a bar.
    expect(kindOf({ amenity: "bar", name: "The Yard", lgbtq: "primary" })).toBe("bar");
  });

  it("has a text colour for every group that reads on white", () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const group of GROUP_IDS) expect((1.05 / (luminance(GROUPS[group].ink) + 0.05)), group).toBeGreaterThanOrEqual(4.5);
  });
});

describe("an idea's stops", () => {
  const golf = ideaById("mini-golf-and-milkshakes")!;

  it("prefer a first stop with the next one a walk away", () => {
    const farGolf = place({ id: "node/far-golf", kind: "minigolf", score: 90, ...east(3) });
    const nearGolf = place({ id: "node/near-golf", kind: "minigolf", score: 60, ...east(1.4) });
    const dessert = place({ id: "node/dessert", kind: "dessert", ...east(0.4) });
    expect(fillStops(golf, [farGolf, nearGolf, dessert]).map((s) => s.place?.id)).toEqual(["node/near-golf", "node/dessert"]);
  });

  it("take the nearest next stop when none is within a walk, not the best-ranked one by where they searched", () => {
    const boats = ideaById("boats-on-the-water")!;
    const hire = place({ id: "node/boats", kind: "boats", ...east(6) });
    const central = place({ id: "node/central", kind: "cafe", score: 99, ...east(0) });
    const closer = place({ id: "node/closer", kind: "cafe", score: 10, ...east(4.5) });
    expect(fillStops(boats, [hire, central, closer]).map((s) => s.place?.id)).toEqual(["node/boats", "node/closer"]);
  });

  it("still offer the others in turn", () => {
    const a = place({ id: "node/a", kind: "minigolf", score: 80 });
    const b = place({ id: "node/b", kind: "minigolf", score: 70 });
    const d = place({ id: "node/d", kind: "dessert" });
    expect(fillStops(golf, [a, b, d], [1]).map((s) => s.place?.id)).toEqual(["node/b", "node/d"]);
  });

  it("put places another idea already named after the rest of their kind, but never before the kind the idea is about", () => {
    const karaoke = ideaById("karaoke-duet")!;
    const booth = place({ id: "node/booth", kind: "karaoke", score: 40 });
    const topBar = place({ id: "node/top-bar", kind: "bar", score: 95 });
    const otherBar = place({ id: "node/other-bar", kind: "bar", score: 60 });
    const dinner = place({ id: "node/dinner", kind: "restaurant", score: 90 });
    const otherDinner = place({ id: "node/other-dinner", kind: "restaurant", score: 50 });
    const all = [booth, topBar, otherBar, dinner, otherDinner];
    // Used already: the next restaurant along instead, and still the karaoke booth before any bar.
    expect(fillStops(karaoke, all, [], new Set(["node/booth", "node/dinner"])).map((s) => s.place?.id)).toEqual(["node/booth", "node/other-dinner"]);
    // With no booth, the bar nobody has had yet.
    expect(fillStops(karaoke, all.slice(1), [], new Set(["node/top-bar"])).map((s) => s.place?.id)).toEqual(["node/other-bar", "node/dinner"]);
    // When it's the only one of its kind, it is named again rather than leaving the stop empty.
    expect(fillStops(golf, [place({ id: "node/golf", kind: "minigolf" }), place({ id: "node/shake", kind: "dessert" })], [], new Set(["node/golf", "node/shake"])).map((s) => s.place?.id)).toEqual(["node/golf", "node/shake"]);
  });
});

describe("a mood", () => {
  it("is made of the kinds that are the mood, not the dessert at the end of its ideas", () => {
    expect(fitsVibe({ kind: "park" }, "foodie")).toBe(false);
    expect(fitsVibe({ kind: "restaurant" }, "foodie")).toBe(true);
    expect(fitsVibe({ kind: "dessert" }, "outdoorsy")).toBe(false);
    expect(fitsVibe({ kind: "dessert" }, "playful")).toBe(false);
    expect(fitsVibe({ kind: "bowling" }, "playful")).toBe(true);
    expect(fitsVibe({ kind: "museum", cost: 0 }, "free")).toBe(true);
    expect(fitsVibe({ kind: "gallery", cost: 1 }, "free")).toBe(false);
    expect(fitsVibe({ kind: "park" }, "free")).toBe(true);
    for (const vibe of VIBE_IDS) for (const kind of VIBE_KINDS[vibe] ?? []) expect(KIND_IDS).toContain(kind);
  });
});

describe("a plan", () => {
  const stop = (n: number, over: Partial<PlanStop> = {}): PlanStop => ({ id: `node/${n}`, name: `Stop ${n}`, kind: "cafe", lat: LONDON.lat, lng: LONDON.lng, ...over });

  it("keeps its times in order when a stop is moved: the times are the evening's slots", () => {
    const plan: Plan = { ...EMPTY_PLAN, stops: [stop(1, { time: "17:00" }), stop(2, { time: "18:00" })] };
    const moved = moveStop(plan, "node/1", 1);
    expect(moved.stops.map((s) => [s.id, s.time])).toEqual([["node/2", "17:00"], ["node/1", "18:00"]]);
    // A time on one of them only stays with its place: it may be a booking.
    const booked: Plan = { ...EMPTY_PLAN, stops: [stop(1), stop(2, { time: "20:00" })] };
    expect(moveStop(booked, "node/2", -1).stops.map((s) => [s.id, s.time])).toEqual([["node/2", "20:00"], ["node/1", undefined]]);
  });

  it("lets a stop timed out of order move to where its time belongs, past midnight too", () => {
    // Dinner booked for 20:00 above a 17:00 walk: moving the walk up puts the evening in order.
    const handTimed: Plan = { ...EMPTY_PLAN, stops: [stop(1, { time: "20:00" }), stop(2, { time: "17:00" })] };
    expect(moveStop(handTimed, "node/2", -1).stops.map((s) => [s.id, s.time])).toEqual([["node/2", "17:00"], ["node/1", "20:00"]]);
    // 23:00 then 00:30 is in order, so the slots stay where they are.
    const late: Plan = { ...EMPTY_PLAN, stops: [stop(1, { time: "23:00" }), stop(2, { time: "00:30" })] };
    expect(moveStop(late, "node/1", 1).stops.map((s) => [s.id, s.time])).toEqual([["node/2", "23:00"], ["node/1", "00:30"]]);
  });

  it("takes a whole idea or none of it", () => {
    const seven = Array.from({ length: MAX_STOPS - 1 }, (_, i) => stop(i));
    const plan: Plan = { ...EMPTY_PLAN, stops: seven };
    expect(addStops(plan, [stop(50), stop(51)])).toEqual({ plan, fits: false });
    // Stops already in it are not counted twice.
    expect(addStops(plan, [stop(0), stop(50)]).fits).toBe(true);
    expect(addStops(plan, [stop(0), stop(50)]).plan.stops).toHaveLength(MAX_STOPS);
  });

  it("knows a place in another city is not part of the same evening", () => {
    const plan: Plan = { ...EMPTY_PLAN, stops: [stop(1)] };
    expect(isFarFromPlan(plan, { lat: 38.71, lng: -9.14 })).toBe(true);
    expect(isFarFromPlan(plan, east(5))).toBe(false);
    expect(isFarFromPlan(EMPTY_PLAN, { lat: 38.71, lng: -9.14 })).toBe(false);
  });

  it("calls a stop with no name by its kind, in the reader's language", () => {
    // Added on /dates, read on /es/plan: "Mirador", not the "Viewpoint" it was saved as.
    const view = stop(1, { name: "Viewpoint", kind: "viewpoint", named: false });
    expect(stopName(view, "es")).toBe(KINDS.viewpoint.label.es);
    expect(stopName(view, "en")).toBe(KINDS.viewpoint.label.en);
    expect(stopName(stop(2, { name: "Café Luna" }), "es")).toBe("Café Luna");
  });
});

describe("opening hours that only speak of holidays", () => {
  it("say nothing about an ordinary day", () => {
    expect(hoursOn("PH off", 6)).toEqual({ known: false });
    expect(hoursOn("PH 10:00-14:00", 2)).toEqual({ known: false });
    expect(hoursOn("Mo-Fr 09:00-18:00; PH off", 6)).toEqual({ known: true, ranges: [] });
  });
});

describe("the hero pictures", () => {
  it("are described by their real widths, the portrait one included", () => {
    expect(heroSrcSet(HERO_ART.home)).toBe("/dates/hero/home-sm.webp 675w, /dates/hero/home.webp 1350w");
    expect(heroSrcSet(HERO_ART.dates)).toBe("/dates/hero/dates-sm.webp 900w, /dates/hero/dates.webp 1800w");
  });
});
