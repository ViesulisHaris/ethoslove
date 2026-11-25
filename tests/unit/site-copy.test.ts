import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { FINDER_COPY, FINDER_FITS, FINDER_SHORT } from "@/content/finder";
import { OCCASION_GUIDES } from "@/content/occasions";
import { RECIPIENT_GUIDES } from "@/content/recipients";
import { GIFT_GUIDES } from "@/content/gift-guides";
import { digitalCardsCopy } from "@/content/digital-cards";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_SEO } from "@/content/template-seo";
import { DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { THIS_PAIRS } from "@/lib/games/this-or-that";
import { PACK_CARDS } from "@/lib/games/pack-cards";
import { DECKS } from "@/lib/games/questions";
import { listManifests } from "@/templates/manifests";
import { TOGETHER_GUIDE } from "@/content/together-guide";
import { LOVE_QUIZ, QUESTIONS as LOVE_QUIZ_QUESTIONS } from "@/content/love-language-quiz";
import { CITY_KIND_COPY, DATE_KIND_COPY, DATE_KIND_SHARED_FAQ, DATE_KIND_UI } from "@/content/date-kinds";
import * as GAME_PAGES from "@/content/game-pages";
import { TRIP_SEO } from "@/content/trip-seo";
import { HALFWAY_TOOL } from "@/content/halfway-tool";
import { TRIP_ORIGIN_COPY, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { PRESS_COPY } from "@/content/press";
import { fillerIn } from "./filler";

type Locale = "en" | "es";
type Line = { locale: Locale; text: string; where: string };

/** Every string under a value, in the language its nearest "en" or "es" key puts it in. */
function lines(value: unknown, where: string, locale?: Locale): Line[] {
  if (typeof value === "string") return locale ? [{ locale, text: value, where }] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => lines(v, `${where}[${i}]`, locale));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => lines(v, `${where}.${k}`, k === "en" || k === "es" ? k : locale));
  return [];
}

/** /digital-cards takes its prices and counts from the code; any stand-ins do for reading its words. */
const CARD_FACTS = { single: "1", pick3: "2", everything: "3", extras: "4", photos: "5", notePhotos: 5, count: 61, paid: 60, ideas: 30, finder: true };

/**
 * The words on the pages people find from search, and in the games and templates they land on.
 * The blog has the same check in blog-posts.test.ts, from the same list.
 */
const SOURCES: Record<string, unknown> = {
  occasions: OCCASION_GUIDES,
  recipients: RECIPIENT_GUIDES,
  "gift pages by kind": GIFT_GUIDES,
  "digital cards": { en: digitalCardsCopy("en", CARD_FACTS), es: digitalCardsCopy("es", CARD_FACTS) },
  "digital gifts": { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS },
  "gift finder": { FINDER_COPY, FINDER_FITS, FINDER_SHORT },
  "template search entries": TEMPLATE_SEO,
  "template guides": TEMPLATE_GUIDES,
  "days-together counter": TOGETHER_GUIDE,
  "love language quiz": { LOVE_QUIZ, LOVE_QUIZ_QUESTIONS },
  "press page": PRESS_COPY,
  games: { TRUTHS, DARES, KNOW_QUESTIONS, RATHER_PAIRS, DECKS, THIS_PAIRS },
  "game packs": PACK_CARDS,
  "dates by kind": { DATE_KIND_COPY, DATE_KIND_SHARED_FAQ, CITY_KIND_COPY },
  "dates by kind, shared": DATE_KIND_UI,
  "game pages": GAME_PAGES,
  "trip pages in search": TRIP_SEO,
  "halfway finder": HALFWAY_TOOL,
  "trips by origin": { TRIP_ORIGIN_UI, TRIP_ORIGIN_COPY },
  templates: listManifests().map((m) => ({ name: m.name, tagline: m.tagline, description: m.description })),
};

const filler = (found: Line[]) => found.flatMap((l) => fillerIn(l.text, l.locale).map((f) => `${l.where}: “${f}”`));

describe("site copy", () => {
  for (const [name, value] of Object.entries(SOURCES)) {
    it(`${name}: no filler`, () => {
      expect(filler(lines(value, name))).toEqual([]);
    });
  }

  it.each(["en", "es"] as const)("messages/%s.json: no filler", (locale) => {
    const messages: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, `../../messages/${locale}.json`), "utf8"));
    expect(filler(lines(messages, `messages.${locale}`, locale))).toEqual([]);
  });
});
