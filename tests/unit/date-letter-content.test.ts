import { describe, expect, it } from "vitest";
import { LETTER_ABOUT, LETTER_ENTRIES, letterEntry, letterWords } from "@/content/date-letter";
import { DATE_KIND_COPY } from "@/content/date-kinds";
import { KIND_IDEAS } from "@/lib/dates/date-kinds";
import { IDEAS, canBeFree, ideaById } from "@/lib/dates/ideas";
import { CITY_PAGES } from "@/lib/cities/cities";
import { fillerIn } from "./filler";

const N = LETTER_ENTRIES.length;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
/** Weeks apart, round the year (52 → 1). */
const gap = (a: number, b: number) => Math.min(Math.abs(a - b), N - Math.abs(a - b));

describe("the date letter's year", () => {
  it("C1 fifty-two entries, one for each week", () => {
    expect(N).toBe(52);
    LETTER_ENTRIES.forEach((entry, i) => expect(entry.week).toBe(i + 1));
    for (let n = 1; n <= 52; n++) expect(letterEntry(n).week).toBe(n);
  });

  it("C2 every entry points at an idea that exists", () => {
    for (const entry of LETTER_ENTRIES) {
      expect(ideaById(entry.idea), `week ${entry.week}`).toBeDefined();
      if (entry.angle) {
        expect(KIND_IDEAS[entry.angle], `week ${entry.week}`).toContain(entry.idea);
        const fit = DATE_KIND_COPY[entry.angle]?.fits[entry.idea];
        expect(fit?.en, `week ${entry.week}`).toBeTruthy();
        expect(fit?.es, `week ${entry.week}`).toBeTruthy();
      }
    }
  });

  it("C3 none twice", () => {
    const pairs = LETTER_ENTRIES.map((e) => `${e.idea}/${e.angle ?? ""}`);
    expect(new Set(pairs).size).toBe(N);
    for (const idea of IDEAS) expect(LETTER_ENTRIES.filter((e) => e.idea === idea.id && !e.angle), idea.id).toHaveLength(1);
    expect(new Set(LETTER_ENTRIES.map((e) => e.say.en)).size).toBe(N);
    expect(new Set(LETTER_ENTRIES.map((e) => e.say.es)).size).toBe(N);
  });

  it("C4 the same idea never comes back within twelve weeks", () => {
    for (const idea of IDEAS) {
      const weeks = LETTER_ENTRIES.filter((e) => e.idea === idea.id).map((e) => e.week);
      for (const a of weeks) for (const b of weeks) if (a !== b) expect(gap(a, b), `${idea.id}: weeks ${a} and ${b}`).toBeGreaterThanOrEqual(12);
    }
  });

  it("C5 the season fits", () => {
    for (const entry of LETTER_ENTRIES) {
      const idea = ideaById(entry.idea)!;
      if (idea.needsDry) expect(entry.week >= 16 && entry.week <= 40, `${entry.idea} in week ${entry.week}`).toBe(true);
      if (entry.idea === "beach-until-sunset") expect(entry.week >= 23 && entry.week <= 35, `beach in week ${entry.week}`).toBe(true);
      if (entry.idea === "skating-and-hot-chocolate") expect(entry.week >= 45 || entry.week <= 10, `skating in week ${entry.week}`).toBe(true);
    }
  });

  it("C6 every line is short, plain and for anyone", () => {
    const places = CITY_PAGES.flatMap((c) => [c.name, c.es]);
    for (const { week, say } of LETTER_ENTRIES) {
      expect(words(say.en), `week ${week} en`).toBeLessThanOrEqual(16);
      expect(words(say.es), `week ${week} es`).toBeLessThanOrEqual(20);
      for (const [locale, line] of [["en", say.en], ["es", say.es]] as const) {
        expect(line, `week ${week} ${locale}`).not.toMatch(/[!—$€£¥\d]/);
        expect(fillerIn(line, locale), `week ${week} ${locale}`).toEqual([]);
        expect(line, `week ${week} ${locale}`).not.toMatch(/Spain|España|España/);
        for (const place of places) {
          const whole = new RegExp(`(^|[^\\p{L}])${place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u");
          expect(whole.test(line), `week ${week} ${locale} names ${place}`).toBe(false);
        }
      }
      expect(say.es, `week ${week}`).not.toMatch(/\b(novio|novia|marido|esposa|esposo|chico|chica)\b/i);
    }
  });

  it("C7 a gift is mentioned rarely and never two weeks running", () => {
    const gifts = LETTER_ENTRIES.filter((e) => e.gift).map((e) => e.week);
    expect(gifts.length).toBeLessThanOrEqual(13);
    for (const a of gifts) for (const b of gifts) if (a !== b) expect(gap(a, b), `weeks ${a} and ${b}`).toBeGreaterThan(1);
  });

  it("C8 every entry has all its words in both languages", () => {
    for (const idea of IDEAS) expect(LETTER_ABOUT[idea.minutes], `${idea.id} ${idea.minutes}`).toBeDefined();
    for (const entry of LETTER_ENTRIES) {
      for (const locale of ["en", "es"] as const) {
        const w = letterWords(entry, locale);
        for (const key of ["title", "blurb", "about", "cost", "twist", "say", "subject"] as const) expect(w[key], `week ${entry.week} ${locale} ${key}`).toBeTruthy();
        expect(Boolean(w.fit), `week ${entry.week} ${locale} fit`).toBe(Boolean(entry.angle));
        expect(w.gift).toBe(Boolean(entry.gift));
        if (entry.angle === "cheap" && canBeFree(ideaById(entry.idea)!)) expect(w.cost).toBe(locale === "en" ? "It can cost nothing." : "Puede salir gratis.");
      }
    }
  });
});
