import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FEATURED_DATES, type FeaturedDate } from "@/content/featured-dates";
import { featuredNow, markFeatured, missingPaidLines } from "@/lib/dates/featured";
import { rankPlaces } from "@/lib/dates/rank";
import type { Place } from "@/lib/dates/places";

// A featured date (BRIEF-dates2.md 5): a label in words and nothing else, and never one without a
// line in docs/marketing/FEATURED-DATES.md naming who paid.

const DOC = readFileSync(path.join(process.cwd(), "docs/marketing/FEATURED-DATES.md"), "utf8");

const place = (id: string, over: Partial<Place> = {}): Place => ({
  id,
  name: `Place ${id}`,
  named: true,
  kind: "restaurant",
  group: "eat",
  lat: 38.71,
  lng: -9.14,
  distanceKm: 0.4,
  cuisine: [],
  outdoorSeating: false,
  vegetarian: false,
  stepFree: false,
  notable: false,
  score: 10,
  ...over,
});

describe("featured dates", () => {
  it("F1 no place is featured in this build", () => {
    expect(FEATURED_DATES).toEqual([]);
    expect(featuredNow("2026-11-25").size).toBe(0);
  });

  it("F2 a featured place needs a row naming who paid", () => {
    const list: FeaturedDate[] = [{ place: "node/1", city: "london", from: "2026-01-01" }, { place: "node/2", city: "london", from: "2026-01-01" }, { place: "node/3", city: "london", from: "2026-01-01" }];
    const doc = ["| Place (OpenStreetMap id) | Who paid | From | Until |", "|---|---|---|---|", "| node/1 | Casa Example Ltd, invoice 12 | 2026-01-01 | |", "| `node/2` |  | 2026-01-01 | |"].join("\n");
    expect(missingPaidLines(list, doc)).toEqual(["node/2", "node/3"]);
    expect(missingPaidLines(list.slice(0, 1), doc)).toEqual([]);
    // The real list against the real record.
    expect(missingPaidLines(FEATURED_DATES, DOC)).toEqual([]);
    expect(DOC).toContain("No place is featured.");
  });

  it("F3 marking keeps the same places in the same order and adds none", () => {
    const shown = [place("node/3"), place("node/1"), place("node/2")];
    const marked = markFeatured(shown, new Set(["node/1", "node/9"]));
    expect(marked.map((p) => p.id)).toEqual(["node/3", "node/1", "node/2"]);
    expect(marked.filter((p) => p.featured).map((p) => p.id)).toEqual(["node/1"]);
    // node/9 was hidden by a filter before marking: it stays hidden.
    expect(marked.some((p) => p.id === "node/9")).toBe(false);
  });

  it("F4 rankPlaces gives the same order with or without the flag", () => {
    const list = [place("node/1", { score: 4, distanceKm: 1.2 }), place("node/2", { score: 9 }), place("node/3", { score: 6, kind: "museum", group: "culture" }), place("node/4", { score: 6, distanceKm: 0.1 })];
    const plain = rankPlaces(list, {}).map((p) => [p.id, p.rank]);
    const flagged = rankPlaces(markFeatured(list, new Set(["node/1", "node/3"])), {}).map((p) => [p.id, p.rank]);
    expect(flagged).toEqual(plain);
  });

  it("F5 featuredNow leaves out an entry before its from and after its until", () => {
    const list: FeaturedDate[] = [
      { place: "node/1", city: "london", from: "2026-12-01" },
      { place: "node/2", city: "london", from: "2026-11-01", until: "2026-11-24" },
      { place: "node/3", city: "london", from: "2026-11-25", until: "2026-11-25" },
      { place: "node/4", city: "london", from: "2026-11-01" },
      { place: "node/5", city: "london", from: "not a day" },
    ];
    expect([...featuredNow("2026-11-25", list)].sort()).toEqual(["node/3", "node/4"]);
  });
});
