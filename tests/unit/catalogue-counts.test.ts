import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { countWord } from "@/lib/count-words";
import { GAMES } from "@/lib/games/catalogue";
import { TRIPS } from "@/lib/trips/presets";
import { TRIP_COUNT } from "@/lib/trips/count";
import { listManifests } from "@/templates/manifests";
import { OCCASIONS } from "@/config/occasions";
import { OCCASION_GUIDES } from "@/content/occasions";
import { TRIP_ORIGIN_COPY } from "@/content/trip-origins";

/**
 * Counts of templates, trips and games are read from the catalogue, never typed into the copy
 * (reports/seoaudit-audit.md, m1: "Eight card games", "twelve trips", "30 ideas", "54 of them").
 */
const NUMBER = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|twenty|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte)";
const TYPED = new RegExp(`\\b${NUMBER}\\s+(?:little\\s+|free\\s+|animated\\s+|card\\s+)*(?:templates|plantillas|trips|viajes|games|juegos|card games|ideas|(?:gift )?ideas)\\b`, "i");

/**
 * Messages whose number is not a count of the catalogue: the "Pick three" product is three by definition, the
 * trip matcher shows three by design (lib/trips/match.ts, MATCH_COUNT), and the free answers written for the free
 * note being off (two templates are free then) are chosen by that setting (withFreeAnswer, template-guide.tsx).
 */
const NOT_A_CATALOGUE_COUNT = new Set(["pricing.plans.pick3.features.0", "money.paywall.oneMore", "trips.match.go", "trips.match.allFit", "templates.guide.faqFreeA", "pricing.faq.10.a"]);

function strings(o: unknown, path: string[] = []): [string, string][] {
  if (typeof o === "string") return [[path.join("."), o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => strings(v, [...path, String(i)]));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => strings(v, [...path, k]));
  return [];
}

describe("counts read from the catalogue", () => {
  it("the editor's trip count is the trips' own", () => {
    expect(TRIP_COUNT).toBe(TRIPS.length);
  });

  it("says a count in words the way the copy does", () => {
    expect(countWord(12, "en")).toBe("twelve");
    expect(countWord(8, "es", { capital: true })).toBe("Ocho");
    expect(countWord(1, "es", { feminine: true })).toBe("una");
    expect(countWord(61, "en")).toBe("61");
  });

  it("no message types a count of templates, trips or games", () => {
    for (const [lang, messages] of [
      ["en", en],
      ["es", es],
    ] as const)
      for (const [key, text] of strings(messages)) if (!NOT_A_CATALOGUE_COUNT.has(key)) expect.soft(TYPED.test(text), `${lang} ${key}: "${text}"`).toBe(false);
  });

  it("the messages that state a count say the catalogue's", () => {
    for (const [lang, messages] of [
      ["en", en],
      ["es", es],
    ] as const) {
      const t = createTranslator({ locale: lang, messages });
      const games = countWord(GAMES.length, lang);
      const Games = countWord(GAMES.length, lang, { capital: true });
      const trips = countWord(TRIPS.length, lang);
      expect(t("platform.doors.games.blurb", { Games })).toMatch(new RegExp(`^${Games} `));
      expect(t("games.hub.sub", { Games })).toMatch(new RegExp(`^${Games} `));
      expect(t("games.meta.title", { games: lang === "es" ? games : Games })).toContain(lang === "es" ? `: ${games} juegos` : `: ${Games} Free`);
      expect(t("trips.meta.description", { trips })).toContain(`${trips} `);
      expect(t("editor.unwrap.addTripHelp", { trips })).toContain(` ${trips} `);
      expect(t("editor.group.unwrap.addTripHelp", { trips })).toContain(` ${trips} `);
    }
    expect(listManifests().length).toBeGreaterThan(20);
  });

  it("an occasion's list of ideas is titled with its own count, and so is its search title", () => {
    for (const occasion of OCCASIONS)
      for (const lang of ["en", "es"] as const) {
        const ideas = OCCASION_GUIDES[occasion][lang].ideas;
        if (!ideas) continue;
        expect(ideas.title, `${occasion} ${lang}`).toMatch(new RegExp(`^${ideas.items.length} `));
        const t = createTranslator({ locale: lang, messages: lang === "es" ? es : en });
        const key = `seo.occasion.${occasion}.metaTitle` as const;
        if (t.has(key as never)) {
          const title = t(key as never, { ideas: ideas.items.length } as never) as string;
          if (/\d/.test(title)) expect(title, `${occasion} ${lang}`).toContain(`${ideas.items.length} `);
        }
      }
  });

  /*
   * Two places from the jobs merged on 25 Nov 2026 say a count in words inside sentences written one by one: the pages
   * by where you leave from ("three of the twelve trips", "the ten other trips", "all twelve") and the just-because
   * page's search description ("Eleven small digital gifts"). Their words are kept as written; these checks fail the
   * moment the list they count changes, so the sentence is rewritten then.
   */
  it("the pages by where you leave from count the trips the list holds", () => {
    const texts = Object.values(TRIP_ORIGIN_COPY).flatMap((c) => [c.line, c.sentence, c.description].flatMap((x) => [["en", x.en], ["es", x.es]] as const));
    const all = { en: countWord(TRIPS.length, "en"), es: countWord(TRIPS.length, "es") };
    const others = { en: countWord(TRIPS.length - 2, "en"), es: countWord(TRIPS.length - 2, "es") };
    // A number word near the size of the list, wherever it stands ("of the twelve", "all twelve", "los doce", "de doce").
    const whole = /\b(?:eleven|twelve|thirteen|once|doce|trece)\b/giu;
    // "ten more", "the ten other trips", "otros diez", "diez más": the list less the two the sentence names.
    const rest = /\b(\p{L}+) (?:other trips|more planned)\b|\b(?:otros|y) (\p{L}+)(?: viajes| más)\b/giu;
    let seen = 0;
    for (const [lang, text] of texts) {
      for (const m of text.matchAll(whole)) {
        seen++;
        expect(m[0].toLowerCase(), `${lang}: "${text}"`).toBe(all[lang]);
      }
      for (const m of text.matchAll(rest)) {
        seen++;
        expect((m[1] ?? m[2]).toLowerCase(), `${lang}: "${text}"`).toBe(others[lang]);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("the just-because page's search description counts its ideas", () => {
    for (const lang of ["en", "es"] as const) {
      const description = (lang === "es" ? es : en).seo.occasion["just-because"].description;
      const n = OCCASION_GUIDES["just-because"][lang].ideas!.items.length;
      expect(description, lang).toContain(`${countWord(n, lang, { capital: true })} ${lang === "es" ? "regalos" : "small"}`);
    }
  });
});

