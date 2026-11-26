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
        for (const key of ["title", "open", "about", "cost", "say", "subject"] as const) expect(w[key], `week ${entry.week} ${locale} ${key}`).toBeTruthy();
        expect(Boolean(w.twist), `week ${entry.week} ${locale} twist`).toBe(entry.twist !== false);
        expect(w.gift).toBe(Boolean(entry.gift));
        if (entry.free || (entry.angle === "cheap" && canBeFree(ideaById(entry.idea)!))) expect(w.cost).toBe(locale === "en" ? "It can cost nothing." : "Puede salir gratis.");
      }
    }
  });

  /** Each part of a letter a reader reads, in one language. */
  const parts = (entry: (typeof LETTER_ENTRIES)[number], locale: "en" | "es") => {
    const w = letterWords(entry, locale);
    return { subject: w.subject, title: w.title, open: w.open, twist: w.twist ?? "", say: w.say, about: w.about, cost: w.cost };
  };
  const runs = (s: string, n: number) => {
    const t = s.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, " ").split(/\s+/).filter(Boolean);
    const out = new Set<string>();
    for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n).join(" "));
    return out;
  };

  it("C9 no letter says the same thing twice: no two of its parts share a run of four words", () => {
    const found: string[] = [];
    for (const entry of LETTER_ENTRIES) {
      for (const locale of ["en", "es"] as const) {
        const p = parts(entry, locale);
        // The subject repeats the title by design; every other pair is checked.
        const keys = ["title", "open", "twist", "say"] as const;
        for (let i = 0; i < keys.length; i++)
          for (let j = i + 1; j < keys.length; j++) {
            const a = runs(p[keys[i]], 4);
            const shared = [...runs(p[keys[j]], 4)].filter((r) => a.has(r));
            if (shared.length) found.push(`week ${entry.week} ${locale}: ${keys[i]} and ${keys[j]} share "${shared.join('", "')}"`);
          }
      }
    }
    expect(found).toEqual([]);
  });

  it("C10 every English word the letter prints is American", () => {
    const british = /\b(bookshops?|rowing boats?|chips|interval|afterwards|colou?rs?|favourite|theatre|caf[eé]s?|centre|realise|travell?ing|neighbour|programme|holiday|queue|trousers|flat|films?|flasks?)\b/i;
    for (const entry of LETTER_ENTRIES) for (const [key, line] of Object.entries(parts(entry, "en"))) expect(line, `week ${entry.week} ${key}`).not.toMatch(british);
  });

  it("C11 no Spanish word the letter prints genders the partner or the couple", () => {
    const gendered = /\b(el otro|del otro|al otro|la otra persona|ninguno|nosotros|vosotros|juntos|cansados?|listos?|encerrados|uno de los dos|cada uno|compañeros?|novi[oa]s?|marido|espos[oa]|chic[oa]s?)\b/i;
    for (const entry of LETTER_ENTRIES) for (const [key, line] of Object.entries(parts(entry, "es"))) expect(line, `week ${entry.week} ${key}`).not.toMatch(gendered);
  });

  it("C12 the line to say names no day before Friday: a letter goes on Thursday or Friday, never later", () => {
    for (const { week, say } of LETTER_ENTRIES) {
      expect(say.en, `week ${week}`).not.toMatch(/\b(Monday|Tuesday|Wednesday|Thursday|tonight|tomorrow)\b/i);
      expect(say.es, `week ${week}`).not.toMatch(/\b(lunes|martes|miércoles|jueves|esta noche|mañana)\b/i);
    }
  });

  it("C14 a subject is one heading: at most one colon, and no full stop inside it (letter-N2)", () => {
    for (const entry of LETTER_ENTRIES)
      for (const locale of ["en", "es"] as const) {
        const { subject } = letterWords(entry, locale);
        expect(subject.split(":").length, `week ${entry.week} ${locale}: ${subject}`).toBeLessThanOrEqual(2);
        expect(subject.replace(/[.?]$/, ""), `week ${entry.week} ${locale}: ${subject}`).not.toMatch(/\./);
      }
  });

  it("C15 an idea that comes back never says it is new: the year repeats its ideas (letter-N3)", () => {
    const seen = new Set<string>();
    for (const { week, idea, say } of LETTER_ENTRIES) {
      if (seen.has(idea)) {
        expect(say.en, `week ${week}`).not.toMatch(/\b(new thing|never (done|tried|been)|first time)\b/i);
        expect(say.es, `week ${week}`).not.toMatch(/\b(novedad|nunca|primera vez)\b/i);
      }
      seen.add(idea);
    }
  });

  it("C13 straight quotes from the site's words are set curly, as the letter's own lines are", () => {
    for (const entry of LETTER_ENTRIES) for (const locale of ["en", "es"] as const) for (const [key, line] of Object.entries(parts(entry, locale))) expect(line, `week ${entry.week} ${locale} ${key}`).not.toMatch(/['"]/);
  });
});
