import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { OCCASION_GUIDES } from "@/content/occasions";
import { RECIPIENT_GUIDES } from "@/content/recipients";
import { TEMPLATE_SEO } from "@/content/template-seo";
import { DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { PACK_CARDS } from "@/lib/games/pack-cards";
import { DECKS } from "@/lib/games/questions";
import { listManifests } from "@/templates/manifests";
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

/**
 * The words on the pages people find from search, and in the games and templates they land on.
 * The blog has the same check in blog-posts.test.ts, from the same list.
 */
const SOURCES: Record<string, unknown> = {
  occasions: OCCASION_GUIDES,
  recipients: RECIPIENT_GUIDES,
  "digital gifts": { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS },
  "template search entries": TEMPLATE_SEO,
  games: { TRUTHS, DARES, KNOW_QUESTIONS, RATHER_PAIRS, DECKS },
  "game packs": PACK_CARDS,
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
