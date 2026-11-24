import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CITY_KIND_COPY, DATE_KIND_COPY } from "@/content/date-kinds";
import { CITY_PAGES, CITY_SLUGS, getCity } from "@/lib/cities/cities";
import { citiesOfKind, CITY_KIND_PAIRS, CITY_KIND_PLACES, cityKindOwn, isCityKindPair, KIND_NEEDS_TRAIT, kindsOfCity, MIN_CITY_KIND_IDEAS, pairHero, pairIdeas } from "@/lib/cities/kind-pairs";
import { SKYLINE_IDEAS } from "@/lib/dates/art";
import { DATE_KIND_IDS, DATE_KINDS, type DateKind } from "@/lib/dates/date-kinds";

/** The rule of BRIEF-dates2.md 1, written again from the data: six of the kind's ideas in the city's own list, or six real places counted. */
const holdsSix = (citySlug: string, kind: DateKind): boolean => {
  const city = getCity(citySlug)!;
  return cityKindOwn(city, kind).length >= MIN_CITY_KIND_IDEAS || (CITY_KIND_PLACES[`${citySlug}/${kind}`] ?? 0) >= MIN_CITY_KIND_IDEAS;
};
const traitHolds = (citySlug: string, kind: DateKind): boolean => {
  const trait = KIND_NEEDS_TRAIT[kind];
  return !trait || getCity(citySlug)!.traits.includes(trait);
};
const heroOf = (citySlug: string, kind: DateKind): string => {
  const wanted = [CITY_KIND_COPY[`${citySlug}/${kind}`]?.hero, DATE_KIND_COPY[kind]!.hero].filter((x): x is string => !!x);
  return pairHero(getCity(citySlug)!, kind, wanted);
};

describe("a kind of date inside a city", () => {
  it("P1 every pair holds six", () => {
    for (const { city, kind } of CITY_KIND_PAIRS) expect(holdsSix(city, kind), `${city}/${kind}`).toBe(true);
  });

  it("P2 and no other pair exists", () => {
    for (const city of CITY_PAGES) {
      for (const kind of DATE_KIND_IDS) {
        const want = DATE_KINDS.includes(kind) && traitHolds(city.slug, kind) && holdsSix(city.slug, kind);
        expect(isCityKindPair(city.slug, kind), `${city.slug}/${kind}`).toBe(want);
      }
    }
    expect(isCityKindPair("atlantis", "cheap")).toBe(false);
    expect(isCityKindPair("london", "picnics")).toBe(false);
    for (const city of CITY_SLUGS) expect(isCityKindPair(city, "at-home"), city).toBe(false);
  });

  it("P3 the weather kinds follow the city's data", () => {
    for (const { city, kind } of CITY_KIND_PAIRS) {
      const traits = getCity(city)!.traits;
      if (kind === "winter") expect(traits, city).toContain("winter");
      if (kind === "rainy-day") expect(traits, city).toContain("rainy");
    }
  });

  it("P4 no page shows fewer than six cards, the beach only on a coast, and the city's own ideas first", () => {
    for (const { city: slug, kind } of CITY_KIND_PAIRS) {
      const city = getCity(slug)!;
      const shown = pairIdeas(city, kind);
      expect(shown.length, `${slug}/${kind}`).toBeGreaterThanOrEqual(6);
      if (shown.some((idea) => idea.id === "beach-until-sunset")) expect(city.traits, `${slug}/${kind}`).toContain("coastal");
      const own = cityKindOwn(city, kind).map((idea) => idea.id);
      expect(shown.slice(0, own.length).map((idea) => idea.id), `${slug}/${kind}`).toEqual(own);
      expect(new Set(shown.map((idea) => idea.id)).size, `${slug}/${kind}`).toBe(shown.length);
    }
  });

  it("P5 every page's picture is one of its ideas, never its first card, never a skyline, and is a file", () => {
    for (const { city, kind } of CITY_KIND_PAIRS) {
      const shown = pairIdeas(getCity(city)!, kind).map((idea) => idea.id);
      const hero = heroOf(city, kind);
      expect(shown, `${city}/${kind}`).toContain(hero);
      expect(hero, `${city}/${kind}`).not.toBe(shown[0]);
      expect(Object.keys(SKYLINE_IDEAS), `${city}/${kind}`).not.toContain(hero);
      expect(existsSync(join(process.cwd(), "public", "dates", "ideas", `${hero}.webp`)), hero).toBe(true);
    }
  });

  it("P7 how many: a few hundred, the four searched ones among them, and the ones the data does not hold not", () => {
    const byKind: Record<string, number> = {};
    for (const { kind } of CITY_KIND_PAIRS) byKind[kind] = (byKind[kind] ?? 0) + 1;
    console.log(`city pairs: ${CITY_KIND_PAIRS.length}`, byKind);
    expect(CITY_KIND_PAIRS.length).toBeGreaterThanOrEqual(300);
    expect(CITY_KIND_PAIRS.length).toBeLessThanOrEqual(400);
    for (const key of ["new-york/cheap", "new-york/first-date", "london/first-date", "london/cheap"]) expect(isCityKindPair(key.split("/")[0], key.split("/")[1]), key).toBe(true);
    for (const key of ["london/outdoor", "miami/winter", "phoenix/rainy-day"]) expect(isCityKindPair(key.split("/")[0], key.split("/")[1]), key).toBe(false);
  });

  it("P9 nothing links to a pair that is not there, and no city takes a name the dates pages use", () => {
    for (const slug of CITY_SLUGS) for (const kind of kindsOfCity(slug)) expect(isCityKindPair(slug, kind), `${slug}/${kind}`).toBe(true);
    for (const kind of DATE_KINDS) for (const city of citiesOfKind(kind)) expect(isCityKindPair(city.slug, kind), `${city.slug}/${kind}`).toBe(true);
    for (const slug of [...DATE_KIND_IDS, "ideas", "for-venues"]) expect(CITY_SLUGS, slug).not.toContain(slug);
  });
});
