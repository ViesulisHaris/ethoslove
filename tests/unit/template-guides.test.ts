import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_GUIDES, templateGuideFaq, type BorrowField } from "@/content/template-guides";
import { FREE_NOTE_MAX_CHARS, noteLength } from "@/lib/gift/free-tier";
import { giftCountdownSchema, giftDataBaseSchema, giftPhotoSchema, giftSurpriseSchema } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";

const LOCALES = ["en", "es"] as const;

/** The guides written before a line had to say which field it goes in: some of their ideas carry no line at all. */
const FIRST_THREE = ["scratch-card", "bouquet", "fortune-cookie"];

/**
 * Limits no schema knows: a place that shows less than its field holds, and never shows the rest.
 * Each was measured in the template's own demo at 320 px wide, the narrowest phone still in use
 * (20 Nov 2026), by putting a caption of capitals and spaces in the place and adding a character
 * until it was cut. The numbers here are a few characters under what fitted.
 *
 * - Birthday Cinema prints a caption under its film frame on one line of capitals and cuts what
 *   doesn't fit; a tap enlarges the photo without its caption (birthday-cinema/Template.tsx,
 *   the `truncate` figcaption in FilmPanel). 29 characters fitted.
 * - Scrapbook's roll of film does the same under each frame (scrapbook/Template.tsx, FilmStrip).
 *   22 characters fitted.
 *
 * The two titles below were measured the same way on 21 Nov 2026, with sentences in place of
 * capitals because a title is set as written: twelve English and Spanish sentences of about 80
 * characters were cut back a character at a time until the title kept to its lines. Both places
 * scale with the screen, so 320, 360, 390 and 1280 px gave the same answers.
 *
 * - String the Lights sets its title over the house on two lines at most and cuts the rest
 *   (string-the-lights/Template.tsx, the `line-clamp-2` h1). The shortest sentence that fitted
 *   was 62 characters; one in capitals, 49.
 * - Light the Candles writes its title in light on three lines at most (light-the-candles/
 *   Template.tsx, the `line-clamp-3` h1). The shortest sentence that fitted was 76 characters;
 *   one in capitals, 74.
 */
const SHOWN: Record<string, number> = {
  "birthday-cinema caption": 24,
  "scrapbook caption": 20,
  "string-the-lights title": 55,
  "light-the-candles title": 70,
};

/** A string field's own limit, or its items' when it is a list of strings. */
function maxOf(schema: unknown): number | null {
  let s = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault || s instanceof z.ZodNullable) s = s.unwrap();
  if (s instanceof z.ZodArray) return maxOf(s.element);
  return s instanceof z.ZodString ? s.maxLength : null;
}

/** The fields every gift has, read from the gift's own schema. */
const SHARED: Partial<Record<BorrowField, number | null>> = {
  title: maxOf(giftDataBaseSchema.shape.title),
  message: maxOf(giftDataBaseSchema.shape.message),
  recipientName: maxOf(giftDataBaseSchema.shape.recipientName),
  senderName: maxOf(giftDataBaseSchema.shape.senderName),
  caption: maxOf(giftPhotoSchema.shape.caption),
  "countdown.label": maxOf(giftCountdownSchema.shape.label),
  "surprise.text": maxOf(giftSurpriseSchema.shape.text),
  // The free Letter: its length is a rule of the free version, not of the field (lib/gift/free-tier.ts).
  note: FREE_NOTE_MAX_CHARS,
};

/** How long a line may be in a field of a template: the schema's limit, or less where less is shown. */
async function limitFor(slug: string, field: BorrowField): Promise<number | null> {
  const shown = SHOWN[`${slug} ${field}`];
  let limit: number | null;
  if (field.startsWith("fields.")) {
    const schema = await loadFieldsSchema(slug);
    limit = schema instanceof z.ZodObject ? maxOf(schema.shape[field.slice("fields.".length)]) : null;
  } else limit = SHARED[field] ?? null;
  return limit === null ? null : Math.min(limit, shown ?? Infinity);
}

const lengthIn = (field: BorrowField, line: string) => (field === "note" ? noteLength(line) : line.length);

/** The owner's rule, as tests/unit/cities.test.ts has it: nothing on the site mentions Spain or its cities. */
const SPAIN = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma)\b/i;

describe("template guides: the lines to borrow", () => {
  it("fit the field they are for, in both languages", async () => {
    const tooLong: string[] = [];
    let checked = 0;
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      for (const l of LOCALES) {
        for (const idea of guide[l].ideas.items) {
          for (const { field, line } of idea.borrow ?? []) {
            const limit = await limitFor(slug, field);
            expect(limit, `${slug}: ${field} is not a text field with a limit`).not.toBeNull();
            checked += 1;
            if (lengthIn(field, line) > limit!) tooLong.push(`${slug} ${l} ${field}: ${lengthIn(field, line)} > ${limit} “${line}”`);
          }
        }
      }
    }
    expect(tooLong).toEqual([]);
    expect(checked).toBeGreaterThan(200);
  });

  it("are quoted on the page word for word", () => {
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES)
        for (const idea of guide[l].ideas.items)
          for (const { line } of idea.borrow ?? []) {
            expect(line.trim(), `${slug} ${l}: ${idea.heading}`).toBe(line);
            expect(line.length, `${slug} ${l}: ${idea.heading}`).toBeGreaterThan(0);
            expect(idea.body.includes(line), `${slug} ${l}: “${line}” is not in “${idea.heading}”`).toBe(true);
          }
  });

  it("go in the same fields in Spanish as in English", () => {
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      guide.en.ideas.items.forEach((idea, i) => {
        const fields = (items: typeof idea) => (items.borrow ?? []).map((b) => b.field);
        expect(fields(guide.es.ideas.items[i]), `${slug} idea ${i + 1}`).toEqual(fields(idea));
      });
  });

  it("come with every idea of a guide written since the first three", () => {
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      if (FIRST_THREE.includes(slug)) continue;
      for (const l of LOCALES) {
        const items = guide[l].ideas.items;
        expect(items.length, `${slug} ${l}`).toBeGreaterThanOrEqual(5);
        expect(items.length, `${slug} ${l}`).toBeLessThanOrEqual(6);
        for (const idea of items) expect(idea.borrow?.length ?? 0, `${slug} ${l}: ${idea.heading}`).toBeGreaterThanOrEqual(1);
        // Two to four questions on the page, whichever way the switches stand.
        for (const [freeNote, notePhotos] of STATES) {
          const shown = templateGuideFaq(slug, l, freeNote, notePhotos);
          expect(shown.length, `${slug} ${l} faq`).toBeGreaterThanOrEqual(2);
          expect(shown.length, `${slug} ${l} faq`).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it("never put “juntos” or “juntas” in a Spanish reader’s mouth", () => {
    // RULES: Spanish never genders the recipient. A line that is copied word for word has to work for any two people.
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const idea of guide.es.ideas.items) for (const { line } of idea.borrow ?? []) expect(line, `${slug}: ${idea.heading}`).not.toMatch(/\bjunt[oa]s\b/i);
  });
});

/** The free note on or off, "a note with photos" for everyone or not: the four pages a build can make. */
const STATES = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
] as const;

/** Numbers as the guides write them: digits, or a word up to twenty. */
const NUMBER_WORDS: Record<(typeof LOCALES)[number], string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
  es: ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte"],
};
const NUMBER = (l: (typeof LOCALES)[number]) => `(\\d+|${NUMBER_WORDS[l].join("|")})`;
const toNumber = (l: (typeof LOCALES)[number], word: string) => (/^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[l].indexOf(word.toLowerCase()));

/**
 * Every count of photos a text gives, in digits or in words: "nine photos", and "up to eight" in a
 * sentence about photos ("Add the photos they miss most; up to eight float up"). A limit on
 * something else in the same sentence ("up to 220 characters") is not one.
 */
function photoCounts(text: string, l: (typeof LOCALES)[number]): number[] {
  const photos = l === "en" ? "photos" : "fotos";
  const upTo = l === "en" ? "up to" : "hasta";
  const other = l === "en" ? "characters|letters|stops|shakes|findings|lines" : "caracteres|letras|paradas|sacudidas|conclusiones|líneas|frases";
  const found: number[] = [];
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    for (const m of sentence.matchAll(new RegExp(`(?<![\\p{L}\\d])${NUMBER(l)} ${photos}(?![\\p{L}])`, "giu"))) found.push(toNumber(l, m[1]));
    if (new RegExp(photos.slice(0, -1), "i").test(sentence))
      for (const m of sentence.matchAll(new RegExp(`(?<![\\p{L}])${upTo} ${NUMBER(l)}(?![\\p{L}\\d])(?! (?:[\\p{L}]+ )?(?:${other}|${photos}))`, "giu"))) found.push(toNumber(l, m[1]));
  }
  return found;
}

describe("template guides", () => {
  it("cover the sixteen templates of the growth build, and the first three", () => {
    // Present, not "and no others": the next guide anyone writes must not fail this.
    const sixteen = ["the-letter", "birthday-cinema", "constellations", "xoxo", "the-council", "bloom", "halfway", "frosted-window", "light-the-candles", "string-the-lights", "gingerbread-house", "snow-globe", "nice-list", "jar-of-reasons", "our-timeline", "scrapbook"];
    for (const slug of [...FIRST_THREE, ...sixteen]) expect(Object.hasOwn(TEMPLATE_GUIDES, slug), slug).toBe(true);
    for (const slug of Object.keys(TEMPLATE_GUIDES)) expect(getManifest(slug), `${slug} is not a template`).toBeTruthy();
  });

  it("never mention Spain or its cities", () => {
    const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
    for (const s of strings(TEMPLATE_GUIDES)) expect(s).not.toMatch(SPAIN);
  });

  it("read a count of photos whether it is written in digits or in words", () => {
    expect(photoCounts("Up to twelve photos, and it opens with none.", "en")).toEqual([12]);
    expect(photoCounts("Add the photos they miss most; up to eight float up around the open flower. Lines take up to 90 characters.", "en")).toEqual([8]);
    expect(photoCounts("The strip itself takes up to 20 photos, and up to 220 characters go under the first photo.", "en")).toEqual([20]);
    expect(photoCounts("Hasta seis fotos van encima de tu carta. Si añades fotos, caben hasta ocho.", "es")).toEqual([6, 8]);
    expect(photoCounts("One candle for each year up to twelve.", "en")).toEqual([]);
  });

  it("never promise more photos than the template takes", () => {
    // A guide that says "up to eight photos", "nine photos" or "hasta 20 fotos" has to mean no more than the manifest's number.
    let checked = 0;
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      const max = getManifest(slug)!.features.photos.max;
      for (const l of LOCALES)
        for (const text of [...guide[l].ideas.items.map((i) => i.body), ...guide[l].faq.map((f) => f.a)])
          for (const n of photoCounts(text, l)) {
            checked += 1;
            expect(n, `${slug} ${l}: ${n} photos in “${text.slice(0, 60)}…”`).toBeLessThanOrEqual(max);
          }
    }
    // The first version of this test read digits only and so checked three sentences.
    expect(checked).toBeGreaterThan(40);
  });

  it("answer “how many photos” with the template’s own smallest and largest number", () => {
    let checked = 0;
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      const { min, max } = getManifest(slug)!.features.photos;
      for (const l of LOCALES)
        for (const { q, a } of guide[l].faq) {
          if (!(l === "en" ? /^How many photos/ : /^¿Cuántas fotos/).test(q)) continue;
          const first = a.split(/(?<=\.)\s/)[0];
          const numbers = [...first.matchAll(new RegExp(`(?<![\\p{L}\\d])${NUMBER(l)}(?![\\p{L}\\d])`, "giu"))].map((m) => toNumber(l, m[1]));
          expect(numbers.length, `${slug} ${l}: “${first}” gives no number`).toBeGreaterThan(0);
          expect(Math.max(...numbers), `${slug} ${l}: “${first}”`).toBe(max);
          if (numbers.length > 1) expect(Math.min(...numbers), `${slug} ${l}: “${first}”`).toBe(min);
          checked += 1;
        }
    }
    expect(checked).toBeGreaterThanOrEqual(10);
  });

  it("do not repeat what the review of 21 Nov 2026 found untrue", () => {
    // Each was on the page and is contradicted by the template's own code (reports/guides-check.md).
    const untrue: Record<string, RegExp> = {
      // Past twelve the age is a topper on two sticks with no flame; six candles burn (birthday-cinema/cake.tsx).
      "birthday-cinema": /number candles|candles of its own|velas propias|velas con forma de número|velas numéricas/i,
      // The second polaroid opens in the lightbox, which prints its caption (xoxo/Template.tsx, _shared/collage/kit.tsx).
      xoxo: /caption won’t show|pie de esa foto no se ve/i,
      // Any star opens first; the photos' order joins the stars, it is not a reading order (constellations/Template.tsx, onTap).
      constellations: /final star is|like a story|última estrella es la foto|como una historia/i,
      // The shuffle decides where a note comes out; it can be the first (jar-of-reasons/Template.tsx).
      "jar-of-reasons": /somewhere in the middle|por la mitad/i,
      // The photos are taped under the letter (halfway/Template.tsx).
      halfway: /photos beside the letter|fotos junto a la carta/i,
      // The name tag stays on the bare stem (bloom/Template.tsx).
      bloom: /flower stands alone|la flor se queda sola/i,
    };
    const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
    for (const [slug, pattern] of Object.entries(untrue)) for (const text of strings(TEMPLATE_GUIDES[slug])) expect(text, slug).not.toMatch(pattern);
  });

  it("answer a question about the free note only while the free version is the note", () => {
    const always = templateGuideFaq("the-letter", "en", false, true);
    const note = templateGuideFaq("the-letter", "en", true, true);
    expect(note.length).toBeGreaterThan(always.length);
    expect(always.every((f) => note.some((n) => n.q === f.q))).toBe(true);
    for (const f of note) expect(Object.keys(f).sort()).toEqual(["a", "q"]);
    // A template with nothing to say about the note answers the same either way.
    expect(templateGuideFaq("bloom", "es", true, true)).toEqual(templateGuideFaq("bloom", "es", false, false));
    expect(templateGuideFaq("not-a-template", "en", true, true)).toEqual([]);
  });
});

describe("template guides: “a note with photos” on The Letter’s page", () => {
  afterEach(() => vi.unstubAllEnvs());

  // The name the send screen gives the product (components/editor/paywall.tsx reads this key).
  const product = { en: en.money.paywall.moreNotePhotos, es: es.money.paywall.moreNotePhotos };
  const question = { en: "Can I add photos to a free love letter?", es: "¿Se pueden añadir fotos a una carta de amor gratis?" };

  it("is named, in the editor’s own words, only while every visitor is offered it", () => {
    for (const l of LOCALES) {
      const offered = templateGuideFaq("the-letter", l, true, true).filter((f) => f.q === question[l]);
      const notOffered = templateGuideFaq("the-letter", l, true, false).filter((f) => f.q === question[l]);
      // The question is asked once either way, and only its answer changes.
      expect(offered).toHaveLength(1);
      expect(notOffered).toHaveLength(1);
      expect(offered[0].a).toContain(product[l]);
      expect(notOffered[0].a).not.toContain(product[l]);
      expect(notOffered[0].a).not.toMatch(l === "en" ? /five photos/ : /cinco fotos/);
      // Both still say where photos do come from.
      for (const f of [...offered, ...notOffered]) expect(f.a).toContain(l === "en" ? "“Make it special”" : "«Hazlo especial»");
      // With the free note off, the page's own "Is it free?" says photos are free, and this is not asked at all.
      expect(templateGuideFaq("the-letter", l, false, true).some((f) => f.q === question[l])).toBe(false);
      expect(templateGuideFaq("the-letter", l, false, false).some((f) => f.q === question[l])).toBe(false);
    }
  });

  it("follows the build’s own switch: a share under 1 is not everyone", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    const named = () => templateGuideFaq("the-letter", "en").some((f) => f.a.includes(product.en));
    vi.stubEnv("NEXT_PUBLIC_LETTER_KEEP_SHARE", "1");
    expect(named()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_LETTER_KEEP_SHARE", "0.5");
    expect(named()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_LETTER_KEEP_SHARE", "");
    expect(named()).toBe(false);
    // And with the note itself switched off, nothing about it is on the page.
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "0");
    vi.stubEnv("NEXT_PUBLIC_LETTER_KEEP_SHARE", "1");
    expect(named()).toBe(false);
  });

  it("never shows one question twice, and gives every answer that names it a twin that doesn’t", () => {
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES) {
        for (const [freeNote, notePhotos] of STATES) {
          const questions = templateGuideFaq(slug, l, freeNote, notePhotos).map((f) => f.q);
          expect(new Set(questions).size, `${slug} ${l}`).toBe(questions.length);
        }
        const withIt = guide[l].faq.filter((f) => f.notePhotos === true).map((f) => f.q);
        const without = guide[l].faq.filter((f) => f.notePhotos === false).map((f) => f.q);
        expect(withIt.sort(), `${slug} ${l}`).toEqual(without.sort());
      }
  });
});
