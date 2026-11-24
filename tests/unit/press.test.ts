import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND } from "@/config/brand";
import { ABOUT_FOUNDED, aboutCopy } from "@/content/about";
import { PRESS_COPY, PRESS_OWNER_PENDING, PRESS_UPDATED, pressCompany, pressFounderLine } from "@/content/press";
import { LEGAL_ENTITY } from "@/content/legal";
import { PRESS_NUMBERS } from "@/content/press-numbers";
import { PRESS_SAMPLE } from "@/content/press-sample";
import { CLOSED_BLOCK_WORDS, countWords } from "@/components/templates/page/lead";
import { pressBrief, pressNav, pressUpdated, shownPress } from "@/lib/press/shown";
import { PRESS_PLACEMENTS } from "@/components/press/placements";
import { ART_IDS, pageArt } from "@/content/page-art";
import { mentionsSpain } from "@/lib/cities/cities";
import { PRESS_COUNTS, REMINDER_OCCASIONS, floorRatio, pressDate, pressFigures, pressLive, pressModified, pressProblems, pressReminder, pressTemplates, type PressNumbers } from "@/lib/press/figures";

import { fillerIn } from "./filler";

const ROOT = path.join(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

/** The sample with some keys changed: a whole snapshot to break one thing at a time. */
const whole = (over: Partial<PressNumbers> = {}): PressNumbers => ({ ...PRESS_SAMPLE, ...over });
const TODAY = "2026-12-01";
const byId = (n: PressNumbers, locale: "en" | "es") => Object.fromEntries(pressFigures(n, locale).map((f) => [f.id, f.value]));

describe("press figures: the gate", () => {
  // While `ready` is false this holds the committed fake zeros in place; it says nothing about real
  // figures until the snapshot is switched on, when its first line is the check that matters.
  it("G1 the committed snapshot is either whole and on, or off with its obvious zeros, and then the page is a 404 in production", () => {
    if (PRESS_NUMBERS.ready) {
      expect(pressProblems(PRESS_NUMBERS)).toEqual([]);
      return;
    }
    for (const key of PRESS_COUNTS) expect(PRESS_NUMBERS[key], key).toBe(0);
    expect(shownPress({ numbers: PRESS_NUMBERS, preview: false, production: true })).toBeNull();
    expect(shownPress({ numbers: PRESS_NUMBERS, preview: true, production: true })).toBeNull();
  });

  it("G7 the snapshot is not switched on while the owner still has a decision to make about the page", () => {
    if (PRESS_NUMBERS.ready) expect(PRESS_OWNER_PENDING).toEqual([]);
    for (const p of PRESS_OWNER_PENDING) expect(p).toMatch(/^(method\.faq\[\d\]|contact): /);
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

  it("F3 a figure the snapshot lacks is left out, not shown as nothing; six at most, two whole rows of three", () => {
    const all = pressFigures(PRESS_SAMPLE, "en");
    expect(all.map((f) => f.id)).toEqual(["cardsMade", "cardsOpened", "opensEach", "openedAgain", "onPhone", "countries"]);
    expect(pressFigures(whole({ countries: null }), "en").map((f) => f.id)).not.toContain("countries");
  });

  it("F5 the reminders' split is not a figure of the page, only a line of llms.txt, and only when there are enough", () => {
    expect(pressReminder(PRESS_SAMPLE, "en")).toEqual({ value: "48%", occasion: "birthday" });
    expect(pressReminder(whole({ reminders: null }), "en")).toBeNull();
    expect(pressReminder(whole({ reminders: { total: 99, birthday: 48, anniversary: 34, valentines: 7 } }), "en")).toBeNull();
    const reminder = (r: NonNullable<PressNumbers["reminders"]>) => pressReminder(whole({ reminders: r }), "en");
    expect(reminder({ total: 840, birthday: 290, anniversary: 410, valentines: 60 })).toMatchObject({ occasion: "anniversary" });
    expect(reminder({ total: 840, birthday: 300, anniversary: 300, valentines: 60 })).toMatchObject({ occasion: "birthday" });
    // "other" (the rest of the total) is never named, however large.
    expect(reminder({ total: 840, birthday: 10, anniversary: 5, valentines: 1 })).toMatchObject({ occasion: "birthday" });
  });

  it("F6 an exact share is never floored one below itself by floating point (29/100 is 29%, not 28%)", () => {
    const pct = (part: number, of: number) => byId(whole({ cardsOpened: of, openedAgain: part, cardsMade: Math.max(of, PRESS_SAMPLE.cardsMade), opens: Math.max(of, PRESS_SAMPLE.opens) }), "en").openedAgain;
    expect(pct(29, 100)).toBe("29%");
    expect(pct(57, 100)).toBe("57%");
    expect(pct(58, 100)).toBe("58%");
    // Every exact whole per cent with a denominator up to 2000 (the deep test found 80 of 8,400 wrong).
    let wrong = 0;
    for (let of = 1; of <= 2000; of++) for (let p = 0; p <= 100; p++) if ((p * of) % 100 === 0 && floorRatio((p * of) / 100, of, 100) !== p) wrong++;
    expect(wrong).toBe(0);
    // Still rounded down when it is not exact, and the average the same way in tenths.
    expect(floorRatio(2, 3, 100)).toBe(66);
    expect(floorRatio(29, 10, 10)).toBe(29);
    expect(floorRatio(1, 0, 100)).toBe(0);
    const templates = pressTemplates(whole({ cardsMade: 100, cardsOpened: 90, openedAgain: 50, topTemplates: [{ slug: "the-letter", made: 29 }, { slug: "bouquet", made: 20 }, { slug: "jar-of-reasons", made: 10 }, { slug: "scratch-card", made: 5 }, { slug: "constellations", made: 1 }] }), "en");
    expect(templates[0]!.share).toBe("29%");
  });

  it("F7 the page's JSON-LD date and the sitemap's are the same day: the later of the words and the figures", () => {
    expect(pressModified(whole({ asOf: "2026-11-20" }), "2026-11-24")).toBe("2026-11-24");
    expect(pressModified(whole({ asOf: "2026-12-01" }), "2026-11-24")).toBe("2026-12-01");
    const page = read("src/app/[currency]/[locale]/(marketing)/press/page.tsx");
    expect(page).toContain("dateModified: pressModified(numbers, PRESS_UPDATED)");
    expect(read("src/lib/press/shown.ts")).toContain("pressModified(numbers, PRESS_UPDATED)");
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
    const values = new Set(["ios", "android", "utc", "birthday", "anniversary", "valentines", "YYYY", "live", "scheduled"]);
    const keys = [...sql().matchAll(/'(\w+)',/g)].map((m) => m[1]!).filter((k) => !values.has(k) || allowed.has(k));
    for (const key of keys) expect(allowed.has(key), key).toBe(true);
  });
});

describe("press query: what an open is", () => {
  const sql = () => read("scripts/press-numbers.sql").replace(/--[^\n]*/g, "");

  it("Q5 the query's header says what to copy as the plan's Appendix C does: every key but teamAccounts, then countries and ready", () => {
    const header = read("scripts/press-numbers.sql").split(/\r?\nwith\r?\n/)[0]!;
    expect(header).not.toMatch(/key for key/);
    expect(header).toMatch(/EXCEPT "teamAccounts"/);
    expect(header).toMatch(/"countries"/);
    expect(header).toMatch(/"ready" to true/);
  });

  it("Q3 the sender's look is the ten minutes after the last publish, and after the first open only for a card edited after it", () => {
    const body = sql().replace(/\s+/g, " ");
    // Every publish, an edit included, overwrites published_at and may null unlock_at (actions/gift.ts),
    // so neither can say when a card was first sent.
    expect(body).not.toMatch(/unlock_at/);
    expect(body).not.toMatch(/sent_at/);
    expect(body).toContain("min(v.opened_at)");
    expect(body).toContain("not (v.opened_at >= c.published_at and v.opened_at < c.published_at + interval '10 minutes')");
    expect(body).toContain("not (f.opened_at < c.published_at and v.opened_at < f.opened_at + interval '10 minutes')");
    // The old rule dropped the ten minutes after every first open, so a card opened once, by its
    // recipient a day after it was sent, counted as not opened (growth-build test, 23 Nov 2026).
    expect(body).not.toContain("v.opened_at >= f.opened_at + interval");
    // A refunded card goes back to draft but keeps published_at (commerce/unlocks.ts): only cards whose link opens count.
    expect(body).toContain("g.status in ('live', 'scheduled')");
    expect(read("src/app/actions/gift.ts")).toMatch(/published_at: new Date\(\)\.toISOString\(\)/);
  });

  it("Q4 the rule, card by card: a recipient's one open a day later counts; the sender's look after a send or an edit does not", () => {
    // The two conditions of the query's `opens`, written out (Q3 holds the query to exactly these).
    const MIN = 60_000;
    const DAY = 24 * 60 * MIN;
    const counts = (open: number, published: number, firstOpen: number) =>
      !(open >= published && open < published + 10 * MIN) && !(firstOpen < published && open < firstOpen + 10 * MIN);
    const opened = (published: number, opens: number[]) => opens.filter((o) => counts(o, published, Math.min(...opens))).length;
    // Opened once, by the recipient, a day after it was sent: an opened card, with one open.
    expect(opened(0, [DAY])).toBe(1);
    // The sender's look a minute after sending is left out; the recipient's next day is counted.
    expect(opened(0, [MIN, DAY])).toBe(1);
    // Looked at by the sender, edited an hour later and looked at again, then opened by the
    // recipient: both looks are left out, the first by the first-open window, the second by the publish one.
    expect(opened(60 * MIN, [MIN, 61 * MIN, DAY])).toBe(1);
    // A scheduled card records its first open when it unlocks, a week after it was published.
    expect(opened(0, [7 * DAY])).toBe(1);
    // Only the sender's look: not an opened card.
    expect(opened(0, [2 * MIN])).toBe(0);
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

  it("C9 a promise the owner has not decided is made in its own pending question only, so deleting that question takes the promise with it", () => {
    // The free code for writers (method.faq[3]) and the poster right (method.faq[2]) are listed in
    // PRESS_OWNER_PENDING. No other string on the page may repeat either, or a refusal that deletes
    // the question would leave the promise standing elsewhere (contact.line once said "a card to try").
    // ("probar" and a bare "pruebas" are left out: the page says we make cards to test the site,
    // "nuestras pruebas"; a QR code, the way a card is sent, is no promise.)
    const promises = [/\b(try|trial|free|posters?)\b|(?<!QR )\bcodes?\b/i, /de prueba|gratis|p[oó]ster|c[oó]digos?(?! QR)/i];
    for (const locale of ["en", "es"] as const) {
      const c = PRESS_COPY[locale];
      const others = strings({ ...c, method: { ...c.method, faq: c.method.faq.filter((_, i) => i !== 2 && i !== 3) } }, locale);
      for (const s of others) for (const p of promises) expect(s.text, s.where).not.toMatch(p);
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
      c.article.checks.forEach((check, i) => most(check, 14, `check ${i}`));
      most(c.method.faq.map((f) => f.a).join(" "), CLOSED_BLOCK_WORDS, "the four answers");
      expect(c.metaTitle.length, `${locale} metaTitle`).toBeLessThanOrEqual(70);
      // Search results cut a description past about 155 characters (blog-posts, cities and date-kinds hold the same).
      expect(c.metaDescription.length, `${locale} metaDescription`).toBeLessThanOrEqual(155);
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
    // The name is a sentence that says which word to print, and the company's quotation marks are set as type.
    expect(PRESS_COPY.en.article.checks[0]).toBe("The name is {name}; {domain} is its address.");
    expect(PRESS_COPY.es.article.checks[0]).toBe("El nombre es {name}; {domain} es su dirección.");
    // The company is written as the footer on the same page writes it, one way.
    expect(LEGAL_ENTITY.name).toBe('SIA "MIGLAI"');
    expect(pressCompany()).toBe("SIA MIGLAI");
    for (const locale of ["en", "es"] as const) {
      const rights = JSON.parse(read(`messages/${locale}.json`)).footer.rights as string;
      expect(rights, locale).toContain(`${pressCompany()},`);
    }
    // The band offers no pictures yet (no wordmark, the posters wait on the owner), so its heading promises none.
    expect(PRESS_COPY.en.article.heading).toBe("How to write the name");
    expect(PRESS_COPY.es.article.heading).toBe("Cómo se escribe el nombre");
  });

  it("C5 every figure says what it counts, and the words match the query's rule", () => {
    const en = PRESS_COPY.en;
    // Averages and shares are not counts: the line says they are worked out from counts.
    expect(en.numbers.line).not.toMatch(/is a count/);
    expect(PRESS_COPY.es.numbers.line).not.toMatch(/es un recuento/);
    // The five percentages are a share of every card made, and the section says so.
    expect(en.made.line).toMatch(/share of every card made/);
    expect(PRESS_COPY.es.made.line).toMatch(/todas las tarjetas hechas/);
    // The open rule is the query's: the ten minutes after the last publish (sent or last edited),
    // and after the first open only for a card edited after it; never after every first open.
    expect(en.numbers.figures.cardsOpened.counts).toMatch(/sent or last edited/);
    expect(PRESS_COPY.es.numbers.figures.cardsOpened.counts).toMatch(/enviarla o editarla por última vez/);
    for (const locale of ["en", "es"] as const) expect(PRESS_COPY[locale].numbers.figures.cardsOpened.counts, locale).not.toMatch(/first open|primera apertura/);
    expect(en.method.faq[1]!.a).toMatch(/sent or last edited/);
    expect(en.method.faq[1]!.a).toMatch(/edited after its first open/);
    expect(PRESS_COPY.es.method.faq[1]!.a).toMatch(/si se editó después de abrirse/);
    // The phone share is of opens whose device is known; an iPad counts as 'ios'.
    expect(en.numbers.figures.onPhone.counts).toMatch(/device we know/);
    expect(en.numbers.figures.onPhone.counts).toMatch(/iPads/);
    // A visitor is a hash of address, browser and card.
    expect(en.numbers.figures.openedAgain.counts).toMatch(/device, browser or network/);
    // The app icon is not called a logo.
    expect(en.article.logo).not.toMatch(/logo/i);
    expect(PRESS_COPY.es.article.logo).not.toMatch(/logo/i);
  });

  it("C6 the lines the deep test read as wrong stay right", () => {
    const en = PRESS_COPY.en;
    const es = PRESS_COPY.es;
    // The hero does not say Ethos three times in three lines.
    for (const locale of ["en", "es"] as const) expect(PRESS_COPY[locale].sentence, locale).not.toMatch(/^Ethos/);
    // "it" with a plural label had nothing to refer to.
    expect(en.numbers.figures.cardsOpened.counts).toMatch(/after each was sent/);
    // A visitor counts once in a rolling 24 hours (record_gift_view), not once a calendar day.
    expect(es.numbers.figures.opensEach.counts).toMatch(/24 horas/);
    expect(en.numbers.figures.opensEach.counts).toMatch(/24 hours/);
    // No semicolon before a list, and iPads are said to count as phones.
    for (const locale of ["en", "es"] as const) expect(PRESS_COPY[locale].numbers.figures.onPhone.counts, locale).not.toContain(";");
    expect(en.numbers.figures.onPhone.counts).toMatch(/Older iPads count as phones/);
    // The live count on the home and About pages is every recorded open; the answer says why it is higher.
    expect(en.method.faq[1]!.a).toMatch(/home and About pages.*every recorded open.*higher/);
    expect(es.method.faq[1]!.a).toMatch(/portada y de Sobre Ethos.*todas las aperturas registradas.*más alta/);
    // A screen reader hears what the bare per cent under a template is a share of.
    expect(en.made.shareOf).toBe("of cards made");
    expect(PRESS_UPDATED >= "2026-11-24").toBe(true);
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

describe("press page: how it is drawn", () => {
  it("P1 the flowers of the page follow the art's rules", () => {
    const keys = new Set(["art", "x", "y", "size", "rot", "blur", "opacity", "phone", "eager", "from", "until", "top"]);
    const pictures = new Set(["lily-footer", "hero-flatlay", "experience-flatlay", "step-photo", "step-note", "step-send", "step-phone"]);
    for (const p of PRESS_PLACEMENTS) {
      expect(ART_IDS as readonly string[], p.art).toContain(p.art);
      expect(pictures.has(p.art), p.art).toBe(false);
      expect(Math.abs(p.rot), p.art).toBeLessThanOrEqual(25);
      expect(() => pageArt(p.art, "blush")).not.toThrow();
      for (const key of Object.keys(p)) expect(keys.has(key), `${p.art}.${key}`).toBe(true);
    }
    const desk = PRESS_PLACEMENTS.filter((p) => p.phone !== "only");
    expect(desk.filter((p) => p.art.startsWith("lily")).length).toBeLessThanOrEqual(2);
    expect(desk.length).toBeLessThanOrEqual(4);
    expect(PRESS_PLACEMENTS.filter((p) => p.phone === "only").length).toBeLessThanOrEqual(2);
  });

  it("W1 nothing on the page is a white, or any colour, written by hand", () => {
    for (const file of ["src/components/press/press-page.tsx", "src/app/[currency]/[locale]/(marketing)/press/page.tsx"]) {
      const text = read(file);
      expect(text, file).not.toMatch(/\b(bg|text|ring|border|from|to)-white\b/);
      expect(text, file).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(text, file).not.toMatch(/\brgba?\(/);
    }
  });
});

describe("press page: once the figures are in", () => {
  afterEach(() => {
    vi.doUnmock("@/content/press-numbers");
    vi.resetModules();
  });

  it("S2 once they are in, the sitemap lists it in both languages, dated, and the footer and llms.txt name it", async () => {
    vi.resetModules();
    vi.doMock("@/content/press-numbers", () => ({ PRESS_NUMBERS: PRESS_SAMPLE }));
    const { default: sitemap } = await import("@/app/sitemap");
    const { PAGE_UPDATED } = await import("@/content/page-dates");
    const shown = await import("@/lib/press/shown");
    const { PRESS_UPDATED } = await import("@/content/press");
    const entries = sitemap();
    const press = entries.filter((e) => /\/press$/.test(e.url));
    expect(press).toHaveLength(2);
    expect(press.filter((e) => e.url.endsWith("/es/press"))).toHaveLength(1);
    for (const e of press) {
      expect(String(e.lastModified).slice(0, 10)).toBe(shown.pressUpdated());
      expect(Object.keys(e.alternates?.languages ?? {}).sort()).toEqual(["en", "es", "x-default"]);
    }
    const later = PRESS_UPDATED > "2026-11-20" ? PRESS_UPDATED : "2026-11-20";
    expect(PAGE_UPDATED["/press"]).toBe(later);
    expect(shown.pressNav("es")).toEqual({ href: "/press", label: "Prensa" });
    const brief = shown.pressBrief();
    expect(brief[0]).toBe("## Ethos in numbers");
    const text = brief.join("\n");
    expect(text).toContain("21,000+");
    expect(text).toContain("3.2");
    expect(text).toContain("The Letter, Bouquet, Jar of Reasons, Scratch Card, Constellations");
    expect(text).toContain("Of the dates people set a reminder for, 48% are for a birthday.");
    expect(text).toMatch(/\]\([^)]*\/press\)/);
    expect(brief.at(-1)).toBe("");
  });
});
