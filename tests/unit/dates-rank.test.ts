import { describe, expect, it } from "vitest";
import { COST_IDS, COST_LABELS, costOf, guessCost } from "@/lib/dates/cost";
import { KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { dateScore, pairsWith, rankPlaces, topPicks } from "@/lib/dates/rank";
import { cleanBody, firstName, WENT_AS_IDS, WENT_AS_LABELS } from "@/lib/dates/reviews";
import { reviewInput } from "@/lib/dates/review-input";

const place = (over: Partial<Place> & Pick<Place, "id" | "kind">): Place => ({ name: over.id, named: true, group: KINDS[over.kind].group, lat: 51.5119, lng: -0.1257, distanceKm: 0.2, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: 60, ...over });

describe("what a place costs for two", () => {
  it("guesses from the kind, and from the cuisine for a table", () => {
    expect(guessCost(place({ id: "a", kind: "park" }))).toBe(0);
    expect(guessCost(place({ id: "b", kind: "cafe" }))).toBe(1);
    expect(guessCost(place({ id: "c", kind: "restaurant" }))).toBe(2);
    expect(guessCost(place({ id: "d", kind: "restaurant", cuisine: ["fine dining"] }))).toBe(3);
    expect(guessCost(place({ id: "e", kind: "restaurant", cuisine: ["pizza"] }))).toBe(1);
    expect(guessCost(place({ id: "f", kind: "museum", notable: true }))).toBe(2);
    expect(guessCost(place({ id: "g", kind: "spa" }))).toBe(3);
  });

  it("lets what couples reported win over the guess", () => {
    const spa = place({ id: "s", kind: "spa" });
    expect(costOf(spa, 1)).toBe(1);
    expect(costOf(spa, null)).toBe(3);
    expect(costOf(spa, 7)).toBe(3);
    for (const c of COST_IDS) expect(COST_LABELS[c].en && COST_LABELS[c].es).toBeTruthy();
  });
});

describe("ranking places for a date", () => {
  const a = place({ id: "node/a", kind: "restaurant", score: 70 });
  const b = place({ id: "node/b", kind: "restaurant", score: 68, distanceKm: 0.1 });
  const c = place({ id: "node/c", kind: "cafe", score: 60, distanceKm: 0.5 });
  const d = place({ id: "node/d", kind: "viewpoint", score: 80, distanceKm: 1.2 });

  it("pulls a single five-star review towards the middle and lets ten of them count", () => {
    const one = dateScore(a, { stars: 5, reviews: 1, cost: null });
    const ten = dateScore(a, { stars: 5, reviews: 10, cost: null });
    const bad = dateScore(a, { stars: 1, reviews: 10, cost: null });
    expect(one).toBeGreaterThan(a.score);
    expect(ten).toBeGreaterThan(one);
    expect(bad).toBeLessThan(a.score);
    expect(dateScore({ ...a, photo: { src: "https://upload.wikimedia.org/x.jpg", width: 1, height: 1 } })).toBeGreaterThan(dateScore(a));
  });

  it("ranks by date score, numbers each group on its own, and sorts however it is asked", () => {
    const ranked = rankPlaces([a, b, c, d], { "node/b": { stars: 4.8, reviews: 12, cost: 3 } });
    expect(ranked.map((p) => p.id)).toEqual(["node/b", "node/d", "node/a", "node/c"]);
    expect(ranked[0]).toMatchObject({ rank: 1, groupRank: 1, groupSize: 2, cost: 3 });
    expect(ranked[2]).toMatchObject({ rank: 3, groupRank: 2, groupSize: 2, cost: 2 });
    expect(ranked[1]).toMatchObject({ groupRank: 1, groupSize: 1, cost: 0 });
    expect(rankPlaces([a, b, c, d], {}, "nearest").map((p) => p.id)).toEqual(["node/b", "node/a", "node/c", "node/d"]);
    expect(rankPlaces([a, b, c, d], {}, "cheapest").map((p) => p.cost)).toEqual([0, 1, 2, 2]);
    const rated = rankPlaces([a, b, c, d], { "node/c": { stars: 3, reviews: 2, cost: null } }, "rated");
    expect(rated[0].id).toBe("node/c");
    // The rank on the card is by score whatever the sort.
    expect(rated[0].rank).toBe(4);
    expect(topPicks(ranked, 2).map((p) => p.rank)).toEqual([1, 2]);
  });

  it("pairs a table with a view or a coffee a short walk away, never with another table", () => {
    const ranked = rankPlaces([a, b, c, d, place({ id: "node/far", kind: "park", lat: 51.6 })], {});
    const pairs = pairsWith(ranked.find((p) => p.id === "node/a")!, ranked);
    expect(pairs.map((p) => p.id)).toEqual(["node/d", "node/c"]);
    expect(pairsWith(ranked.find((p) => p.id === "node/d")!, ranked).map((p) => p.group)).toEqual(["sweet", "eat"]);
  });
});

describe("reviews", () => {
  it("accepts a real review and refuses a broken one", () => {
    expect(reviewInput.safeParse({ placeId: "node/1", stars: 4, cost: 2, wentAs: "date", body: "lovely", placeName: "Café", lat: 51.5, lng: -0.1, locale: "en" }).success).toBe(true);
    expect(reviewInput.safeParse({ placeId: "node/1", stars: 6, placeName: "Café", lat: 51.5, lng: -0.1 }).success).toBe(false);
    expect(reviewInput.safeParse({ placeId: "wiki/1", stars: 5, placeName: "Café", lat: 51.5, lng: -0.1 }).success).toBe(false);
    expect(reviewInput.safeParse({ placeId: "node/1", stars: 5, placeName: "Café", lat: 51.5, lng: -0.1, body: "x".repeat(401) }).success).toBe(false);
  });

  it("takes links, phone numbers and shouting out of a review", () => {
    expect(cleanBody("Go at dusk. Call 020 7946 0958 or see https://example.com/menu for hours.")).toBe("Go at dusk. Call or see for hours.");
    expect(cleanBody("BEST DATE OF MY LIFE GO NOW")).toBe("best date of my life go now");
    expect(cleanBody("  ")).toBeNull();
    expect(cleanBody(undefined)).toBeNull();
    expect(cleanBody("www.spam.example")).toBeNull();
  });

  it("shows a first name only", () => {
    expect(firstName("Maya Ortiz Rodríguez", "Somebody")).toBe("Maya");
    expect(firstName("  ", "Somebody")).toBe("Somebody");
    expect(firstName(null, "Alguien")).toBe("Alguien");
    for (const w of WENT_AS_IDS) expect(WENT_AS_LABELS[w].en && WENT_AS_LABELS[w].es).toBeTruthy();
  });
});
