import { describe, expect, it } from "vitest";
import { z } from "zod";
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
 * Each was measured in the template itself at 320 px wide, the narrowest phone still in use, with
 * the longest line a guide lends for it.
 *
 * - Birthday Cinema prints a caption under its film frame on one line of capitals and cuts what
 *   doesn't fit; a tap enlarges the photo without its caption (birthday-cinema/Template.tsx,
 *   the `truncate` figcaption in FilmPanel).
 * - Scrapbook's roll of film does the same under each frame (scrapbook/Template.tsx, FilmStrip).
 */
const SHOWN: Record<string, number> = {
  "birthday-cinema caption": 24,
  "scrapbook caption": 20,
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
        expect(guide[l].faq.length, `${slug} ${l} faq`).toBeGreaterThanOrEqual(2);
        expect(guide[l].faq.length, `${slug} ${l} faq`).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe("template guides", () => {
  it("cover the sixteen templates of the growth build, and the first three", () => {
    const sixteen = ["the-letter", "birthday-cinema", "constellations", "xoxo", "the-council", "bloom", "halfway", "frosted-window", "light-the-candles", "string-the-lights", "gingerbread-house", "snow-globe", "nice-list", "jar-of-reasons", "our-timeline", "scrapbook"];
    expect(Object.keys(TEMPLATE_GUIDES).sort()).toEqual([...FIRST_THREE, ...sixteen].sort());
  });

  it("never mention Spain or its cities", () => {
    const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
    for (const s of strings(TEMPLATE_GUIDES)) expect(s).not.toMatch(SPAIN);
  });

  it("never promise more photos than the template takes", () => {
    // A guide that says "up to N photos" has to mean the manifest's N.
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      const max = getManifest(slug)!.features.photos.max;
      for (const l of LOCALES)
        for (const text of [...guide[l].ideas.items.map((i) => i.body), ...guide[l].faq.map((f) => f.a)])
          for (const m of text.matchAll(l === "en" ? /up to (\d+) photos/gi : /hasta (\d+) fotos/gi)) expect(Number(m[1]), `${slug} ${l}: ${m[0]}`).toBeLessThanOrEqual(max);
    }
  });

  it("answer a question about the free note only while the free version is the note", () => {
    const always = templateGuideFaq("the-letter", "en", false);
    const note = templateGuideFaq("the-letter", "en", true);
    expect(note.length).toBeGreaterThan(always.length);
    expect(always.every((f) => note.some((n) => n.q === f.q))).toBe(true);
    for (const f of note) expect(Object.keys(f).sort()).toEqual(["a", "q"]);
    // A template with nothing to say about the note answers the same either way.
    expect(templateGuideFaq("bloom", "es", true)).toEqual(templateGuideFaq("bloom", "es", false));
    expect(templateGuideFaq("not-a-template", "en", true)).toEqual([]);
  });
});
