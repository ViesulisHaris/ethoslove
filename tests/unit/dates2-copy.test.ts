import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { CITY_KIND_NOUNS, CITY_KIND_WORDS, DATE_KIND_COPY, DATE_KIND_UI } from "@/content/date-kinds";
import { FOR_VENUES, FOR_VENUES_PATH } from "@/content/for-venues";
import { mentionsSpain } from "@/lib/cities/cities";
import { IDEAS } from "@/lib/dates/ideas";
import sitemap from "@/app/sitemap";
import { fillerIn } from "./filler";

// The words dates2 added (PLAN-dates2.md steps 3, 5, 7, 11 to 15): short enough for the designed
// pages, in both languages, never naming Spain, never filler.

type Tree = { [key: string]: string | Tree };
const MESSAGES = { en: en as unknown as Tree, es: es as unknown as Tree };
const LOCALES = ["en", "es"] as const;

const at = (tree: Tree, key: string): string | Tree | undefined => key.split(".").reduce<string | Tree | undefined>((node, part) => (node && typeof node === "object" ? node[part] : undefined), tree);
const leaves = (node: string | Tree | undefined, prefix: string): [string, string][] =>
  node === undefined ? [] : typeof node === "string" ? [[prefix, node]] : Object.entries(node).flatMap(([k, v]) => leaves(v, `${prefix}.${k}`));
const words = (text: string) => text.replace(/<[^>]+>/g, " ").replace(/\{[^}]+\}/g, "x").split(/\s+/).filter(Boolean).length;

/** Every message the build added, by key: their leaves are what X2 to X4 hold. */
const NEW_KEYS = [
  "cities.line",
  "cities.ideas.line",
  "cities.ideas.more",
  "cities.ideas.why",
  "cities.places.line",
  "cities.places.all",
  "cities.more",
  "cities.tickets.short",
  "dates.tonight.sentenceMore",
  "dates.tonight.sentenceMoreNoReach",
  "dates.tonight.settingLabel",
  "dates.tonight.setting",
  "dates.tonight.reachLabel",
  "dates.tonight.reach",
  "dates.tonight.reachDenied",
  "dates.tonight.reachNone",
  "dates.tonight.noneNear",
  "dates.tonight.wetIndoors",
  "dates.tonight.wetOutdoors",
  "dates.place.liked",
  "dates.place.book",
  "dates.featured.label",
  "plan.done",
  "plan.log",
  "affiliate.booking.via",
];

const PLACE_PREFIXES = ["romantic", "night", "outdoor", "rainy", "winter", "fun", "unique"] as const;

/** Every new string, per language, with where it came from. */
const all = (l: "en" | "es"): [string, string][] => [
  ...NEW_KEYS.flatMap((k) => leaves(at(MESSAGES[l], k), k)),
  ...PLACE_PREFIXES.flatMap((p) => (["PlacesLabel", "PlacesHeading", "PlacesLine"] as const).map((s): [string, string] => [`DATE_KIND_UI.${p}${s}`, String((DATE_KIND_UI[l] as Record<string, unknown>)[`${p}${s}`])])),
  ...Object.entries(FOR_VENUES[l]).flatMap(([k, v]): [string, string][] => (Array.isArray(v) ? v.map((c, i): [string, string] => [`FOR_VENUES.${k}.${i}`, c]) : [[`FOR_VENUES.${k}`, v]])),
];

describe("dates2 copy", () => {
  it("X1 the new words fit the designed pages", () => {
    for (const l of LOCALES) {
      const lines: [string, string][] = [
        // The city's first card names the line (dates2-C14): the longest title any city could start with.
        ["cities.line", String(at(MESSAGES[l], "cities.line")).replace("{first}", IDEAS.map((idea) => idea.title[l]).reduce((a, b) => (words(b) > words(a) ? b : a)))],
        ["cities.ideas.line", String(at(MESSAGES[l], "cities.ideas.line")).replace("{city}", "Salt Lake City")],
        ["cities.places.line", String(at(MESSAGES[l], "cities.places.line"))],
        ...PLACE_PREFIXES.map((p): [string, string] => [`${p}PlacesLine`, String((DATE_KIND_UI[l] as Record<string, unknown>)[`${p}PlacesLine`])]),
        ["FOR_VENUES.line", FOR_VENUES[l].line],
        ["FOR_VENUES.whatLine", FOR_VENUES[l].whatLine],
        ["FOR_VENUES.contactLine", FOR_VENUES[l].contactLine],
      ];
      for (const [where, text] of lines) expect(words(text), `${l} ${where}: ${text}`).toBeLessThanOrEqual(14);
      expect(words(FOR_VENUES[l].sentence), `${l} for-venues sentence`).toBeLessThanOrEqual(30);
      for (const rule of FOR_VENUES[l].rules) expect(words(rule), `${l} rule: ${rule}`).toBeLessThanOrEqual(9);
      expect(FOR_VENUES[l].title.length).toBeLessThanOrEqual(60);
      expect(FOR_VENUES[l].description.length).toBeLessThanOrEqual(155);
    }
  });

  it("X2 both languages have every new key, and the same ones", () => {
    for (const key of NEW_KEYS) {
      const inEn = leaves(at(MESSAGES.en, key), key).map(([k]) => k);
      const inEs = leaves(at(MESSAGES.es, key), key).map(([k]) => k);
      expect(inEn.length, `${key} in en`).toBeGreaterThan(0);
      expect(inEs, key).toEqual(inEn);
      for (const [k, v] of [...leaves(at(MESSAGES.en, key), key), ...leaves(at(MESSAGES.es, key), key)]) expect(v.trim(), k).not.toBe("");
    }
    expect(Object.keys(FOR_VENUES.es)).toEqual(Object.keys(FOR_VENUES.en));
  });

  it("X3 none of it mentions Spain", () => {
    for (const l of LOCALES) for (const [where, text] of all(l)) expect(mentionsSpain(text), `${l} ${where}: ${text}`).toBe(false);
  });

  it("X4 none of it is filler, shouts or runs on with an em dash", () => {
    for (const l of LOCALES) {
      for (const [where, text] of all(l)) {
        expect(fillerIn(text, l), `${l} ${where}: ${text}`).toEqual([]);
        expect(text, `${l} ${where}`).not.toMatch(/[!¡—]/);
      }
    }
  });

  it("X5 the page for venues promises only the label: a featured place is never put into a date (dates2-C1)", () => {
    // lib/dates/featured.ts markFeatured only flags places already listed; it adds none.
    const promises = [/puts your venue/i, /your venue[’']s name on/i, /pone el nombre/i, /wherever it is listed/i, /allí donde aparezca/i];
    for (const l of LOCALES) {
      const text = JSON.stringify(FOR_VENUES[l]);
      for (const p of promises) expect(text, `${l}: ${p}`).not.toMatch(p);
    }
    expect(FOR_VENUES.en.sentence).toMatch(/never added/);
    expect(FOR_VENUES.es.sentence).toMatch(/Nunca se añade/);
  });

  it("X6 the planner's Spanish speaks to both of you, and night is not a calque (dates2-C7, C11)", () => {
    const tonight = leaves(at(MESSAGES.es, "dates.tonight"), "dates.tonight");
    for (const [k, v] of tonight) expect(v, k).not.toMatch(/\b(tu|tus|ti|mí)\b/);
    expect(JSON.stringify(DATE_KIND_COPY.night)).not.toMatch(/noche de cita/i);
    expect(JSON.stringify(CITY_KIND_NOUNS.night)).not.toMatch(/noches? de cita/i);
  });

  it("X4 the page for venues is not in the sitemap and names no price", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes(FOR_VENUES_PATH))).toBe(false);
    for (const l of LOCALES) expect(JSON.stringify(FOR_VENUES[l])).not.toMatch(/\d\s?[€$£]|[€$£]\s?\d/);
    const page = readFileSync(path.join(process.cwd(), "src/app/[currency]/[locale]/(marketing)/dates/for-venues/page.tsx"), "utf8");
    expect(page).not.toMatch(/[€$£]\s?\d|\d\s?[€$£]/);
    expect(page).toContain("index: false");
  });

  it("X7 the words a native reader stopped at are gone (dates2-D9)", () => {
    expect(FOR_VENUES.en.heading).toBe("A Featured label for your venue");
    for (const l of LOCALES) {
      // "Featured" is said by the heading and the card; the rules do not say it again.
      for (const rule of FOR_VENUES[l].rules) expect(rule, l).not.toMatch(/Featured|Destacado|marked|marca/i);
      expect(FOR_VENUES[l].heading, l).not.toMatch(/in words|con todas las letras/);
    }
    const page = readFileSync(path.join(process.cwd(), "src/app/[currency]/[locale]/(marketing)/dates/for-venues/page.tsx"), "utf8");
    const hero = page.match(/HERO_IDEA = "([^"]+)"/)?.[1];
    const sample = page.match(/SAMPLE_IDEA = "([^"]+)"/)?.[1];
    expect(sample && hero && sample !== hero).toBe(true);
    expect(DATE_KIND_COPY.night!.sentence.en).not.toMatch(/its hour has passed/);
    expect(DATE_KIND_COPY.outdoor!.sentence.en).toMatch(/under the open sky/);
    expect(JSON.stringify(CITY_KIND_WORDS)).not.toMatch(/such as|sitios como/);
    expect(JSON.stringify(DATE_KIND_UI)).not.toMatch(/Open air the map knows|Aire libre que/);
  });
});
