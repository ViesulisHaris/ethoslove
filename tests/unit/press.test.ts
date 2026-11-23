import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { ABOUT_FOUNDED, aboutCopy } from "@/content/about";
import { PRESS_COPY, pressFounderLine } from "@/content/press";
import { PRESS_NUMBERS } from "@/content/press-numbers";
import { PRESS_SAMPLE } from "@/content/press-sample";
import { CLOSED_BLOCK_WORDS, countWords } from "@/components/templates/page/lead";
import { pressBrief, pressNav, pressUpdated, shownPress } from "@/lib/press/shown";
import { mentionsSpain } from "@/lib/cities/cities";
import { PRESS_COUNTS, REMINDER_OCCASIONS, pressDate, pressFigures, pressLive, pressProblems, pressTemplates, type PressNumbers } from "@/lib/press/figures";

import { fillerIn } from "./filler";

const ROOT = path.join(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

/** The sample with some keys changed: a whole snapshot to break one thing at a time. */
const whole = (over: Partial<PressNumbers> = {}): PressNumbers => ({ ...PRESS_SAMPLE, ...over });
const TODAY = "2026-12-01";
const byId = (n: PressNumbers, locale: "en" | "es") => Object.fromEntries(pressFigures(n, locale).map((f) => [f.id, f.value]));

describe("press figures: the gate", () => {
  it("G1 the committed snapshot is either off, or whole", () => {
    if (PRESS_NUMBERS.ready) expect(pressProblems(PRESS_NUMBERS)).toEqual([]);
    expect(pressLive(PRESS_NUMBERS)).toBe(PRESS_NUMBERS.ready && pressProblems(PRESS_NUMBERS).length === 0);
  });

  it("G2 a snapshot switched on with any figure at 0 is refused, and says which", () => {
    for (const key of PRESS_COUNTS) {
      const n = whole({ [key]: 0 });
      expect(pressProblems(n, TODAY).some((p) => p.startsWith(`${key}:`)), key).toBe(true);
      expect(pressLive(n, TODAY), key).toBe(false);
    }
    const zeroTemplate = whole({ topTemplates: PRESS_SAMPLE.topTemplates.map((t, i) => (i === 4 ? { ...t, made: 0 } : t)) });
    expect(pressProblems(zeroTemplate, TODAY).some((p) => p.startsWith("topTemplates:"))).toBe(true);
    expect(pressProblems(whole({ countries: 0 }), TODAY).some((p) => p.startsWith("countries:"))).toBe(true);
    expect(pressProblems(whole({ reminders: { total: 0, birthday: 0, anniversary: 0, valentines: 0 } }), TODAY).some((p) => p.startsWith("reminders:"))).toBe(true);
    expect(pressProblems({ ...PRESS_NUMBERS, ready: true }, TODAY).length).toBeGreaterThanOrEqual(7);
    expect(pressLive({ ...PRESS_NUMBERS, ready: true }, TODAY)).toBe(false);
  });

  it("G3 figures that contradict each other are refused", () => {
    const t = PRESS_SAMPLE.topTemplates;
    const cases: Record<string, PressNumbers> = {
      "opened above made": whole({ cardsOpened: PRESS_SAMPLE.cardsMade + 1 }),
      "opens below opened": whole({ opens: PRESS_SAMPLE.cardsOpened - 1, deviceOpens: PRESS_SAMPLE.cardsOpened - 1, phoneOpens: 100 }),
      "again above opened": whole({ openedAgain: PRESS_SAMPLE.cardsOpened + 1 }),
      "phone above device": whole({ phoneOpens: PRESS_SAMPLE.deviceOpens + 1 }),
      "device above opens": whole({ deviceOpens: PRESS_SAMPLE.opens + 1 }),
      "four templates": whole({ topTemplates: t.slice(0, 4) }),
      "six templates": whole({ topTemplates: [...t, { slug: "polaroid-wall", made: 10 }] }),
      "no such template": whole({ topTemplates: [...t.slice(0, 4), { slug: "nope", made: 10 }] }),
      "a slug twice": whole({ topTemplates: [...t.slice(0, 4), { slug: t[0]!.slug, made: 10 }] }),
      "out of order": whole({ topTemplates: [t[0]!, { ...t[1]!, made: t[0]!.made + 1 }, ...t.slice(2)] }),
      "more than made": whole({ topTemplates: t.map((x, i) => ({ ...x, made: 5000 - i })) }),
      "a count of 1.5": whole({ openedAgain: 1.5 }),
      "300 countries": whole({ countries: 300 }),
      "reminders above total": whole({ reminders: { total: 100, birthday: 50, anniversary: 40, valentines: 20 } }),
    };
    for (const [name, n] of Object.entries(cases)) expect(pressProblems(n, TODAY), name).not.toEqual([]);
  });

  it("G4 a date that is not a day, is ahead of today, or is before the query existed is refused", () => {
    for (const asOf of ["2026-02-30", "20 Nov", ""]) expect(pressProblems(whole({ asOf }), TODAY).some((p) => p.startsWith("asOf:")), asOf).toBe(true);
    expect(pressProblems(whole({ asOf: "2026-12-02" }), TODAY).some((p) => p.startsWith("asOf:"))).toBe(true);
    expect(pressProblems(whole({ asOf: "2026-10-31" }), TODAY).some((p) => p.startsWith("asOf:"))).toBe(true);
    expect(pressProblems(whole({ asOf: "2026-12-01" }), TODAY)).toEqual([]);
  });

  it("G5 the sample used for pictures is whole, and is not what is committed", () => {
    expect(pressProblems(PRESS_SAMPLE, TODAY)).toEqual([]);
    expect(PRESS_NUMBERS).not.toEqual(PRESS_SAMPLE);
    expect(PRESS_NUMBERS.cardsMade).not.toBe(PRESS_SAMPLE.cardsMade);
  });
});

describe("press figures: how they are written", () => {
  it("F1 every figure is rounded down, never up", () => {
    expect(byId(PRESS_SAMPLE, "en")).toMatchObject({ cardsMade: "21,000+", cardsOpened: "15,000+", opensEach: "3.2", openedAgain: "61%", onPhone: "88%" });
    expect(byId(whole({ cardsMade: 21000 }), "en").cardsMade).toBe("21,000");
    expect(byId(whole({ opens: 63719, deviceOpens: 63719, phoneOpens: 46120 }), "en").opensEach).toBe("3.9");
  });

  it("F2 in Spanish the same figures are written the Spanish way", () => {
    const es = byId(PRESS_SAMPLE, "es");
    expect(es.cardsMade).toBe("21.000+");
    expect(es.opensEach).toBe("3,2");
    expect(es.openedAgain).toMatch(/^61\s?%$/);
    expect(pressDate("2026-11-20", "es")).toBe("20 de noviembre de 2026");
    expect(pressDate("2026-11-20", "en")).toBe("20 November 2026");
  });

  it("F3 a figure the snapshot lacks is left out, not shown as nothing", () => {
    const all = pressFigures(PRESS_SAMPLE, "en");
    expect(all.map((f) => f.id)).toEqual(["cardsMade", "cardsOpened", "opensEach", "openedAgain", "onPhone", "countries", "reminder"]);
    expect(all.at(-1)).toEqual({ id: "reminder", value: "48%", occasion: "birthday" });
    expect(pressFigures(whole({ countries: null }), "en").map((f) => f.id)).not.toContain("countries");
    expect(pressFigures(whole({ reminders: null }), "en").map((f) => f.id)).not.toContain("reminder");
    expect(pressFigures(whole({ reminders: { total: 99, birthday: 48, anniversary: 34, valentines: 7 } }), "en").map((f) => f.id)).not.toContain("reminder");
    const reminder = (r: NonNullable<PressNumbers["reminders"]>) => pressFigures(whole({ reminders: r }), "en").find((f) => f.id === "reminder");
    expect(reminder({ total: 840, birthday: 290, anniversary: 410, valentines: 60 })).toMatchObject({ occasion: "anniversary" });
    expect(reminder({ total: 840, birthday: 300, anniversary: 300, valentines: 60 })).toMatchObject({ occasion: "birthday" });
    // "other" (the rest of the total) is never named, however large.
    expect(reminder({ total: 840, birthday: 10, anniversary: 5, valentines: 1 })).toMatchObject({ occasion: "birthday" });
  });

  it("F4 the five templates come out in the snapshot's order, each with its share of all cards", () => {
    expect(pressTemplates(PRESS_SAMPLE, "en")).toEqual([
      { slug: "the-letter", share: "32%" },
      { slug: "bouquet", share: "11%" },
      { slug: "jar-of-reasons", share: "8%" },
      { slug: "scratch-card", share: "6%" },
      { slug: "constellations", share: "5%" },
    ]);
  });
});

describe("press query", () => {
  /** The query with its -- comments taken out (none of them is inside a string). */
  const sql = () => read("scripts/press-numbers.sql").replace(/--[^\n]*/g, "");

  it("Q1 the query is one read-only statement", () => {
    const body = sql().trim();
    expect(body.toLowerCase().startsWith("with")).toBe(true);
    expect(body.split(";").length - 1).toBe(1);
    expect(body.endsWith(";")).toBe(true);
    expect(body).not.toMatch(/\b(insert|update|delete|create|alter|drop|truncate|grant|revoke|call|copy|do|set|execute|merge|into|begin|commit)\b/i);
    expect(body).not.toMatch(/public\.\w+\(/);
    const addresses = [...new Set(read("scripts/press-numbers.sql").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [])].sort();
    expect(addresses).toEqual(["owner@example.com", "second@example.com"]);
  });

  it("Q2 the query returns every count the snapshot holds, by the snapshot's own names", () => {
    const text = read("scripts/press-numbers.sql");
    for (const key of ["asOf", ...PRESS_COUNTS, "topTemplates", "reminders", "slug", "made", "total", ...REMINDER_OCCASIONS]) expect(text, key).toContain(`'${key}'`);
    const allowed = new Set<string>(["asOf", ...PRESS_COUNTS, "topTemplates", "reminders", "slug", "made", "total", ...REMINDER_OCCASIONS, "teamAccounts"]);
    const values = new Set(["ios", "android", "utc", "birthday", "anniversary", "valentines", "YYYY"]);
    const keys = [...sql().matchAll(/'(\w+)',/g)].map((m) => m[1]!).filter((k) => !values.has(k) || allowed.has(k));
    for (const key of keys) expect(allowed.has(key), key).toBe(true);
  });
});

describe("press words", () => {
  type Copy = (typeof PRESS_COPY)["en"];
  const shape = (v: unknown): unknown => (typeof v === "string" ? "s" : Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : v);
  const strings = (v: unknown, where: string): { text: string; where: string }[] =>
    typeof v === "string" ? [{ text: v, where }] : Array.isArray(v) ? v.flatMap((x, i) => strings(x, `${where}[${i}]`)) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => strings(x, `${where}.${k}`)) : [];

  it("C1 the words are there in both languages, in the same shape", () => {
    expect(shape(PRESS_COPY.en)).toEqual(shape(PRESS_COPY.es));
    for (const locale of ["en", "es"] as const) {
      for (const s of strings(PRESS_COPY[locale], locale)) expect(s.text.trim(), s.where).not.toBe("");
      expect(PRESS_COPY[locale].method.faq).toHaveLength(4);
    }
  });

  it("C2 the words fit the page", () => {
    for (const locale of ["en", "es"] as const) {
      const c: Copy = PRESS_COPY[locale];
      const most = (text: string, max: number, where: string) => expect(countWords(text), `${locale} ${where}: ${text}`).toBeLessThanOrEqual(max);
      most(c.sentence, 30, "sentence");
      most(c.numbers.line, 14, "numbers.line");
      most(c.made.line, 14, "made.line");
      most(c.contact.line, 14, "contact.line");
      for (const [id, f] of Object.entries(c.numbers.figures)) {
        most(f.label, 9, `${id}.label`);
        most(f.counts, 12, `${id}.counts`);
      }
      for (const [o, label] of Object.entries(c.numbers.reminder.labels)) most(label, 9, `reminder.${o}`);
      most(c.numbers.reminder.counts, 12, "reminder.counts");
      c.article.checks.forEach((check, i) => most(check, 14, `check ${i}`));
      most(c.method.faq.map((f) => f.a).join(" "), CLOSED_BLOCK_WORDS, "the four answers");
      expect(c.metaTitle.length, `${locale} metaTitle`).toBeLessThanOrEqual(70);
      expect(c.metaDescription.length, `${locale} metaDescription`).toBeLessThanOrEqual(200);
    }
  });

  it("C3 it says who makes Ethos in the About page's and the brand's own words", () => {
    expect(pressFounderLine("en")).toBe("A small company in Latvia makes Ethos.");
    for (const locale of ["en", "es"] as const) {
      const line = pressFounderLine(locale);
      expect(aboutCopy(locale, { templates: 0, single: "" }).subtitle.startsWith(line), locale).toBe(true);
      expect(line.endsWith("."), locale).toBe(true);
      const [first, second] = PRESS_COPY[locale].article.checks;
      expect(first).toContain("{name}");
      expect(first).toContain("{domain}");
      expect(second).toContain("{company}");
      expect(PRESS_COPY[locale].metaTitle).not.toMatch(/Tryethos/);
      expect(PRESS_COPY[locale].metaTitle).not.toMatch(/Digital cards|Tarjetas digitales/);
    }
    expect(PRESS_COPY.en.article.checks[1]).toContain("March 2026");
    expect(PRESS_COPY.es.article.checks[1]).toContain("marzo de 2026");
    expect(ABOUT_FOUNDED.startsWith("2026-03")).toBe(true);
  });

  it("C4 no filler, no shouting, nothing about Spain, never a voucher's name", () => {
    for (const locale of ["en", "es"] as const) {
      for (const { text, where } of strings(PRESS_COPY[locale], locale)) {
        expect(fillerIn(text, locale), where).toEqual([]);
        expect(text, where).not.toMatch(/[!¡—–]/);
        expect(mentionsSpain(text), where).toBe(false);
        expect(text, where).not.toMatch(/gift card/i);
        expect(text.includes(BRAND.categoryLine.en) || text.includes(BRAND.categoryLine.es), where).toBe(false);
      }
    }
  });
});

describe("press page: when it shows", () => {
  it("G6 the page shows the real figures when they are whole, the sample only on a dev server that asks, and otherwise nothing", () => {
    const off: PressNumbers = { ...PRESS_NUMBERS, ready: false, cardsMade: 0 };
    expect(shownPress({ numbers: off, preview: false, production: false })).toBeNull();
    expect(shownPress({ numbers: off, preview: true, production: false })).toEqual({ numbers: PRESS_SAMPLE, sample: true });
    expect(shownPress({ numbers: off, preview: true, production: true })).toBeNull();
    const real = whole();
    expect(shownPress({ numbers: real, preview: false, production: true })).toEqual({ numbers: real, sample: false });
    expect(shownPress({ numbers: whole({ opens: 0 }), preview: false, production: true })).toBeNull();
  });

  it("S1 while the figures are not in, nothing names the page", async () => {
    if (PRESS_NUMBERS.ready) return;
    const { default: sitemap } = await import("@/app/sitemap");
    const { PAGE_UPDATED } = await import("@/content/page-dates");
    const entries = sitemap();
    expect(entries.filter((e) => /\/press$/.test(e.url))).toEqual([]);
    expect(PAGE_UPDATED["/press"]).toBeUndefined();
    expect(pressNav("en")).toBeNull();
    expect(pressNav("es")).toBeNull();
    expect(pressBrief()).toEqual([]);
    expect(pressUpdated()).toBeUndefined();
  });
});
