import { describe, expect, it } from "vitest";
import { CITY_SLUGS, getCity } from "@/lib/cities/cities";
import { CHEAP_FREE, CITY_KIND_PAGES, DATE_KIND_IDS, DATE_KINDS, getDateKind, isCityKindPage, KIND_IDEAS, kindIdeas, MIN_KIND_IDEAS } from "@/lib/dates/date-kinds";
import { IDEAS, ideaById } from "@/lib/dates/ideas";

const sorted = (ids: readonly string[]): string[] => [...ids].sort();

describe("the kinds of date", () => {
  it("K1 the kinds are the brief's eight, and every idea a kind names exists, once", () => {
    expect([...DATE_KIND_IDS]).toEqual(["first-date", "fun", "cheap", "romantic", "double-date", "winter", "at-home", "rainy-day"]);
    for (const kind of DATE_KIND_IDS) {
      for (const id of KIND_IDEAS[kind]) expect(ideaById(id), `${kind}: ${id}`).toBeDefined();
      expect(new Set(KIND_IDEAS[kind]).size, kind).toBe(KIND_IDEAS[kind].length);
    }
  });

  it("K2 fun is the playful ideas, cheap the ones that cost a coffee each at most, rainy-day the ones rain cannot spoil", () => {
    expect(sorted(KIND_IDEAS.fun)).toEqual(sorted(IDEAS.filter((i) => i.vibes.includes("playful")).map((i) => i.id)));
    expect(sorted(KIND_IDEAS.cheap)).toEqual(sorted(IDEAS.filter((i) => i.budget <= 1).map((i) => i.id)));
    expect(sorted(KIND_IDEAS["rainy-day"])).toEqual(sorted(IDEAS.filter((i) => i.goodInRain).map((i) => i.id)));
  });

  it("K3 a first date is never a treat, never past three hours, never at dawn, at sunset or after dark", () => {
    for (const idea of kindIdeas("first-date")) {
      expect(idea.budget, idea.id).toBeLessThanOrEqual(2);
      expect(idea.minutes, idea.id).toBeLessThanOrEqual(180);
      expect(["day", "evening"], idea.id).toContain(idea.moment);
    }
  });

  it("K4 no winter idea needs a dry day", () => {
    const winter = kindIdeas("winter");
    expect(winter).toHaveLength(9);
    for (const idea of winter) expect(idea.needsDry, idea.id).toBe(false);
  });

  it("K5 the cheap page's free four are among its eight, and each has the free vibe", () => {
    expect(CHEAP_FREE).toHaveLength(4);
    for (const id of CHEAP_FREE) {
      expect(KIND_IDEAS.cheap, id).toContain(id);
      expect(ideaById(id)!.vibes, id).toContain("free");
    }
  });

  it("K6 a kind with fewer than eight ideas has no page: at-home has none, the other seven have one", () => {
    expect(DATE_KINDS).toEqual(["first-date", "fun", "cheap", "romantic", "double-date", "winter", "rainy-day"]);
    expect(kindIdeas("at-home")).toEqual([]);
    expect(getDateKind("at-home")).toBeUndefined();
    expect(getDateKind("nope")).toBeUndefined();
    for (const kind of DATE_KINDS) expect(kindIdeas(kind).length, kind).toBeGreaterThanOrEqual(MIN_KIND_IDEAS);
  });

  it("K7 a kind inside a city is four pairs of a city and a kind that both have pages, and no kind, nor \"ideas\", is a city's slug", () => {
    expect(CITY_KIND_PAGES).toEqual([
      { city: "new-york", kind: "cheap" },
      { city: "new-york", kind: "first-date" },
      { city: "london", kind: "first-date" },
      { city: "london", kind: "cheap" },
    ]);
    for (const { city, kind } of CITY_KIND_PAGES) {
      expect(getCity(city), city).toBeDefined();
      expect(getDateKind(kind), kind).toBe(kind);
      expect(isCityKindPage(city, kind)).toBe(true);
    }
    expect(isCityKindPage("paris", "cheap")).toBe(false);
    expect(isCityKindPage("london", "fun")).toBe(false);
    for (const slug of [...DATE_KIND_IDS, "ideas"]) expect(CITY_SLUGS, slug).not.toContain(slug);
  });
});
