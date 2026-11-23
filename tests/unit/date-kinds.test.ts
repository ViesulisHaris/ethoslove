import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- Next's compiled copy carries no types
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import nextConfig from "../../next.config";
import { CITY_KIND_COPY, DATE_KIND_COPY, DATE_KIND_SHARED_FAQ, DATE_KIND_UI } from "@/content/date-kinds";
import { ART_IDS } from "@/content/page-art";
import { DATE_CARDS_ART, DATE_FOOT_ART, DATE_HERO_ART, DATE_PLACEMENTS } from "@/components/dates/page/placements";
import { CITY_SLUGS, getCity, mentionsSpain } from "@/lib/cities/cities";
import { CHEAP_FREE, CITY_KIND_PAGES, DATE_KIND_IDS, DATE_KINDS, getDateKind, isCityKindPage, KIND_IDEAS, kindIdeas, MIN_KIND_IDEAS } from "@/lib/dates/date-kinds";
import { IDEAS, ideaById } from "@/lib/dates/ideas";

const words = (text: string): number => text.trim().split(/\s+/).length;
const strings = (v: unknown): string[] => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
const LOCALES = ["en", "es"] as const;
const COUNT_WORD: Record<number, { en: string; es: string }> = { 8: { en: "eight", es: "ocho" }, 9: { en: "nine", es: "nueve" }, 10: { en: "ten", es: "diez" }, 12: { en: "twelve", es: "doce" } };
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

  it("K17 the idea pictures' week-long cache is for the pictures, not for a page under the same path", async () => {
    const rules = await nextConfig.headers!();
    const dates = rules.filter((rule) => rule.source.startsWith("/dates/"));
    expect(dates).toHaveLength(1);
    const re = pathToRegexp(dates[0].source) as RegExp;
    for (const file of ["/dates/ideas/bowling-night.webp", "/dates/hero/dates.webp", "/dates/kinds/cafe.webp"]) expect(re.test(file), file).toBe(true);
    for (const page of ["/dates/ideas/first-date", ...DATE_KINDS.map((kind) => `/dates/ideas/${kind}`)]) expect(re.test(page), page).toBe(false);
  });

  it("K8 every kind with a page has its words in both languages, and a line for each of its ideas and no other", () => {
    expect(Object.keys(DATE_KIND_COPY)).toEqual(DATE_KINDS);
    for (const kind of DATE_KINDS) {
      const copy = DATE_KIND_COPY[kind]!;
      expect(Object.keys(copy.fits), kind).toEqual([...KIND_IDEAS[kind]]);
      for (const text of strings(copy)) expect(text.trim().length, kind).toBeGreaterThan(0);
      for (const l of LOCALES) for (const field of [copy.nav, copy.phrase, copy.title, copy.description, copy.heading, copy.line, copy.sentence]) expect(field[l], `${kind} ${l}`).toBeTruthy();
    }
  });

  it("K9 a title starts with the searched phrase and carries the number of ideas, and a number written out is the right one", () => {
    for (const kind of DATE_KINDS) {
      const copy = DATE_KIND_COPY[kind]!;
      const count = kindIdeas(kind).length;
      for (const l of LOCALES) {
        expect(copy.title[l].startsWith(copy.phrase[l]), `${kind} ${l}`).toBe(true);
        expect(copy.title[l], `${kind} ${l}`).toContain("{count}");
        expect(copy.title[l].replace("{count}", String(count)).length, `${kind} ${l}`).toBeLessThanOrEqual(70);
        const word = COUNT_WORD[count][l];
        expect(copy.description[l].toLowerCase(), `${kind} ${l} description`).toContain(word);
        expect(copy.sentence[l].toLowerCase(), `${kind} ${l} sentence`).toContain(word);
      }
    }
  });

  it("K10 the words fit the page", () => {
    for (const kind of DATE_KINDS) {
      const copy = DATE_KIND_COPY[kind]!;
      for (const l of LOCALES) {
        expect(words(copy.line[l]), `${kind} ${l} line`).toBeLessThanOrEqual(14);
        expect(words(copy.sentence[l]), `${kind} ${l} sentence`).toBeLessThanOrEqual(30);
        for (const [id, fit] of Object.entries(copy.fits)) expect(words(fit[l]), `${kind} ${id} ${l}`).toBeLessThanOrEqual(22);
        for (const idea of kindIdeas(kind)) expect(words(idea.title[l]), `${idea.id} ${l}`).toBeLessThanOrEqual(9);
      }
    }
  });

  it("K11 no two kinds share a hero picture, each hero is one of its kind's ideas, and its file exists", () => {
    const heroes = DATE_KINDS.map((kind) => DATE_KIND_COPY[kind]!.hero);
    expect(new Set(heroes).size).toBe(DATE_KINDS.length);
    for (const kind of DATE_KINDS) {
      const hero = DATE_KIND_COPY[kind]!.hero;
      expect(KIND_IDEAS[kind], kind).toContain(hero);
      expect(existsSync(join(process.cwd(), "public", "dates", "ideas", `${hero}.webp`)), hero).toBe(true);
    }
  });

  it("K18 a city-by-kind page never leads with a picture of somewhere else: no outdoor skyline under a city's name", () => {
    // The picnic's skyline has spires that are neither London's nor New York's.
    const OUTDOOR_SKYLINE = ["golden-hour-picnic"];
    for (const { city, kind } of CITY_KIND_PAGES) {
      const hero = CITY_KIND_COPY[`${city}/${kind}`].hero ?? DATE_KIND_COPY[kind]!.hero;
      expect(OUTDOOR_SKYLINE, `${city}/${kind}`).not.toContain(hero);
      expect(KIND_IDEAS[kind], `${city}/${kind}`).toContain(hero);
      expect(existsSync(join(process.cwd(), "public", "dates", "ideas", `${hero}.webp`)), hero).toBe(true);
    }
  });

  it("K12 the fun page's rain answer counts its own ideas", () => {
    const fun = kindIdeas("fun");
    expect(fun.filter((i) => i.goodInRain)).toHaveLength(6);
    expect(fun.filter((i) => i.needsDry)).toHaveLength(2);
    expect(DATE_KIND_COPY.fun!.faq.map((f) => f.a.en).join(" ")).toContain("Six of the eight");
  });

  it("K13 the four city-by-kind pages have their words in both languages, within the same limits", () => {
    expect(Object.keys(CITY_KIND_COPY).sort()).toEqual(CITY_KIND_PAGES.map((p) => `${p.city}/${p.kind}`).sort());
    for (const [key, copy] of Object.entries(CITY_KIND_COPY)) {
      for (const l of LOCALES) {
        expect(copy.title[l].length, `${key} ${l}`).toBeLessThanOrEqual(70);
        expect(words(copy.line[l]), `${key} ${l} line`).toBeLessThanOrEqual(14);
        expect(words(copy.sentence[l]), `${key} ${l} sentence`).toBeLessThanOrEqual(30);
        for (const text of strings(copy)) expect(text.trim().length).toBeGreaterThan(0);
      }
    }
    expect(CITY_KIND_COPY["new-york/cheap"].title.en).toContain("NYC");
    expect(CITY_KIND_COPY["new-york/first-date"].title.en).toContain("NYC");
  });

  it("K14 nothing in the words of these pages mentions Spain", () => {
    for (const text of strings({ DATE_KIND_COPY, DATE_KIND_UI, DATE_KIND_SHARED_FAQ, CITY_KIND_COPY })) expect(mentionsSpain(text), text).toBe(false);
  });

  it("K15 the shared words hold a section's line to fourteen words", () => {
    for (const l of LOCALES) for (const [key, text] of Object.entries(DATE_KIND_UI[l])) if (key.endsWith("Line")) expect(words(text), `${key} ${l}`).toBeLessThanOrEqual(14);
  });

  it("K16 the flowers of a dates page follow the art's rules", () => {
    const allowed = ["art", "x", "y", "size", "rot", "blur", "opacity", "phone", "eager", "from", "until", "top"];
    for (const piece of DATE_PLACEMENTS) {
      expect(ART_IDS as readonly string[], piece.art).toContain(piece.art);
      expect(piece.art).not.toBe("lily-footer");
      expect(Math.abs(piece.rot), piece.art).toBeLessThanOrEqual(25);
      for (const key of Object.keys(piece)) expect(allowed, `${piece.art}: ${key}`).toContain(key);
    }
    for (const section of [DATE_HERO_ART, DATE_CARDS_ART, DATE_FOOT_ART]) expect(section.filter((p) => p.phone === "only").length).toBeLessThanOrEqual(2);
  });
});
