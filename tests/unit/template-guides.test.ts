import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_GUIDES, templateGuideFaq, type BorrowField } from "@/content/template-guides";
import { FREE_NOTE_MAX_CHARS, noteLength } from "@/lib/gift/free-tier";
import { giftCountdownSchema, giftDataBaseSchema, giftPhotoSchema, giftSurpriseSchema } from "@/lib/gift/schema";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";

const LOCALES = ["en", "es"] as const;

/** The first three guides, from before the growth build; since 21 Nov 2026 every idea of every guide lends one line. */
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
          const { field, line } = idea.borrow;
          const limit = await limitFor(slug, field);
          expect(limit, `${slug}: ${field} is not a text field with a limit`).not.toBeNull();
          checked += 1;
          if (lengthIn(field, line) > limit!) tooLong.push(`${slug} ${l} ${field}: ${lengthIn(field, line)} > ${limit} “${line}”`);
        }
      }
    }
    expect(tooLong).toEqual([]);
    expect(checked).toBeGreaterThan(200);
  });

  it("are a line someone could type as it stands", () => {
    // The page prints the line by itself, in handwriting, under the name of its field: it has to be whole.
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES)
        for (const idea of guide[l].ideas.items) {
          const { line } = idea.borrow;
          expect(line.trim(), `${slug} ${l}: ${idea.heading}`).toBe(line);
          expect(line.length, `${slug} ${l}: ${idea.heading}`).toBeGreaterThan(0);
        }
  });

  it("go in the same fields in Spanish as in English", () => {
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      guide.en.ideas.items.forEach((idea, i) => {
        expect(guide.es.ideas.items[i].borrow.field, `${slug} idea ${i + 1}`).toBe(idea.borrow.field);
      });
  });

  it("come with every idea of a guide written since the first three", () => {
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      if (FIRST_THREE.includes(slug)) continue;
      for (const l of LOCALES) {
        const items = guide[l].ideas.items;
        expect(items.length, `${slug} ${l}`).toBeGreaterThanOrEqual(5);
        expect(items.length, `${slug} ${l}`).toBeLessThanOrEqual(6);
        for (const idea of items) expect(idea.borrow.line.length, `${slug} ${l}: ${idea.heading}`).toBeGreaterThan(0);
        // A guide with questions of its own shows two to four, whichever way the switches stand;
        // one without shows the questions every gift's page has.
        if (guide[l].faq.length === 0) continue;
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
      for (const idea of guide.es.ideas.items) expect(idea.borrow.line, `${slug}: ${idea.heading}`).not.toMatch(/\bjunt[oa]s\b/i);
  });

  it("never bend a Spanish line to a woman or a man, outside the lines someone read and let stand", () => {
    // The review of 21 Nov 2026 found six lines that only a woman could be sent («bienvenida a casa»,
    // «¿estás despierta?», «Vestidas igual», «VECINA CUMPLE 30», «la que sobrevive») or only a man
    // («JUGADOR DOS»). A word list cannot know Spanish, so this one is short and loud: it holds the
    // endings that were found and their near kin, and when it fires the line is read by a person,
    // then reworded or, if it speaks of the sender, of a thing, or of someone the card itself names
    // (a mother, a daughter), added to READ with why.
    const bent = /(?<![\p{L}])(bienvenid[oa]s?|despiert[oa]s?|dormid[oa]s?|vestid[oa]s|vecin[oa]|jugador(?:a|es)?|la que|el que|querid[oa]s?|guap[oa]s?|cansad[oa]s?|enamorad[oa]s?|invitad[oa]s?|content[oa]s?|orgullos[oa]s?|amig[oa]|novi[oa]|niñ[oa]|chic[oa]|reina|rey|princesa)(?![\p{L}])/iu;
    const found: string[] = [];
    const lines = new Set<string>();
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const idea of guide.es.ideas.items) {
        const key = `${slug}: ${idea.borrow.line}`;
        lines.add(key);
        if (bent.test(idea.borrow.line) && !Object.hasOwn(READ_AND_LET_STAND, key)) found.push(key);
      }
    expect(found).toEqual([]);
    // Every line let stand is still a line of the guides, so the list never outlives what it excuses.
    for (const key of Object.keys(READ_AND_LET_STAND)) expect(lines.has(key), `${key} is no longer a line`).toBe(true);
  });
});

/** Spanish lines the list above stops at, read by a person and left as they are, each with why. */
const READ_AND_LET_STAND: Record<string, string> = {
  "jar-of-reasons: Me esperaste despierta todas las veces.": "Mother’s Day: said to a mother, whom the card’s own title names",
  "dark-romance: Los Enamorados": "the printed name of a tarot card",
  "on-repeat: La que sonaba en el coche": "a song, not a person",
};

/** Every limit a line of text can have in a template: its own fields', its lists' items', and the fields every gift has. */
async function fieldLimits(slug: string): Promise<number[]> {
  const schema = await loadFieldsSchema(slug);
  const own = schema instanceof z.ZodObject ? Object.values(schema.shape).map((field) => maxOf(field)) : [];
  return [...own, ...Object.values(SHARED)].filter((n): n is number => typeof n === "number");
}

/** A name as it is compared: lower case, one kind of apostrophe, no closing dots. */
const plain = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[.…]+$/, "").trim();

/** What the editor calls a template's fields and their choices, in one language. */
async function editorNames(slug: string, l: (typeof LOCALES)[number]): Promise<Set<string>> {
  const mod = (await import(`../../src/templates/${slug}/field-meta.ts`).catch(() => null)) as { fieldMeta?: Record<string, Record<string, { label: string; options?: Record<string, string> }>> } | null;
  const names = new Set<string>();
  for (const meta of Object.values(mod?.fieldMeta?.[l] ?? {})) for (const name of [meta.label, ...Object.values(meta.options ?? {})]) names.add(plain(name));
  return names;
}

describe("template guides: what a card tells the sender to do", () => {
  it("quotes a choice or a field only by the name the editor shows for it", async () => {
    // The review of 21 Nov 2026: «Séllalo con “aprobado”» where the stamp is «Visto bueno», and
    // «traviesa y buena» where the Spanish stamps are «Sin carbón», «Carbón» and «Carbón dulce».
    // Anything a card puts in quotation marks is something the sender will look for on the screen.
    const wrong: string[] = [];
    let quoted = 0;
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES) {
        const names = await editorNames(slug, l);
        for (const idea of guide[l].ideas.items)
          for (const m of idea.how.matchAll(l === "en" ? /“([^”]+)”/g : /«([^»]+)»/g)) {
            quoted += 1;
            if (!names.has(plain(m[1]))) wrong.push(`${slug} ${l}: ${m[0]} is not a field or a choice in this gift’s editor`);
          }
      }
    expect(wrong).toEqual([]);
    expect(quoted).toBeGreaterThanOrEqual(10);
  });

  it("gives a number of characters only where a field of that gift has that limit", async () => {
    const wrong: string[] = [];
    let counted = 0;
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) {
      const limits = await fieldLimits(slug);
      for (const l of LOCALES)
        for (const idea of guide[l].ideas.items)
          for (const m of idea.how.matchAll(l === "en" ? /(\d+) characters/g : /(\d+) caracteres/g)) {
            counted += 1;
            if (!limits.includes(Number(m[1]))) wrong.push(`${slug} ${l}: ${m[0]} in “${idea.how}”`);
          }
    }
    expect(wrong).toEqual([]);
    expect(counted).toBeGreaterThan(80);
  });

  it("is said once: no instruction is on two gifts, and a line to borrow hardly ever", () => {
    // The review of 21 Nov 2026 counted “Put the plan in the surprise at the end.” on fifteen gifts
    // and “Until I land” lent by five. The brief: no two ideas may share a shape.
    for (const l of LOCALES) {
      const hows = new Map<string, string[]>();
      const lent = new Map<string, string[]>();
      for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
        for (const idea of guide[l].ideas.items) {
          hows.set(idea.how.toLowerCase(), [...(hows.get(idea.how.toLowerCase()) ?? []), slug]);
          lent.set(idea.borrow.line.toLowerCase(), [...(lent.get(idea.borrow.line.toLowerCase()) ?? []), slug]);
        }
      const twice = (map: Map<string, string[]>, most: number) => [...map].filter(([, slugs]) => slugs.length > most).map(([text, slugs]) => `${text} (${slugs.join(", ")})`);
      expect(twice(hows, 1), l).toEqual([]);
      expect(twice(lent, 1), l).toEqual([]);
    }
  });

  it("lends a P.S. of its own shape: “Saturday, 8pm. …” is not the surprise of every third gift", () => {
    // The test of 21 Nov 2026 counted seventeen gifts lending a surprise that opened on Saturday and
    // an hour. One page shows one; "More like this" followed three times showed it three times.
    const day = { en: /^(mon|tues|wednes|thurs|fri|satur|sun)day\b/i, es: /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\b/i };
    const dayAndHour = { en: /^\w+day(,| at| night)? ?(\d|at \d)/i, es: /^\p{L}+ a las? \d/iu };
    for (const l of LOCALES) {
      const opens = new Map<string, string[]>();
      const timed: string[] = [];
      let lines = 0;
      for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
        for (const idea of guide[l].ideas.items) {
          if (idea.borrow.field !== "surprise.text") continue;
          lines += 1;
          const first = idea.borrow.line.match(day[l])?.[0].toLowerCase();
          if (first) opens.set(first, [...(opens.get(first) ?? []), slug]);
          if (day[l].test(idea.borrow.line) && dayAndHour[l].test(idea.borrow.line)) timed.push(`${slug}: ${idea.borrow.line}`);
        }
      expect(lines).toBeGreaterThan(30);
      // No day of the week opens more than four of them, and a day with its hour opens three at most.
      for (const [name, slugs] of opens) expect(slugs.length, `${l}: ${slugs.length} surprises open on “${name}” (${slugs.join(", ")})`).toBeLessThanOrEqual(4);
      expect(timed.length, `${l}: ${timed.join(" | ")}`).toBeLessThanOrEqual(3);
    }
  });

  it("is never only a limit, and never only “put it in the surprise at the end”", () => {
    // “The side label takes 12 characters.” tells the sender nothing to write there.
    const onlyLimit = { en: /^(the|your|how) [^.:,]* takes? \d+ characters\.$/i, es: /^(el|la|los|las|tu) [^.:,]* admiten? \d+ caracteres\.$/i };
    const shared = { en: /in the surprise at the end|^add a countdown to the day/i, es: /en la sorpresa (del )?final|^añade una cuenta atrás hasta/i };
    const off: string[] = [];
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES) for (const idea of guide[l].ideas.items) if (onlyLimit[l].test(idea.how) || shared[l].test(idea.how)) off.push(`${slug} ${l}: ${idea.how}`);
    expect(off).toEqual([]);
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

  it("give every gift six cards, each a different moment, in both languages", () => {
    // Since 21 Nov 2026 "What to write" is on every gift's page: a template registered without its six cards fails here.
    for (const m of TEMPLATE_MANIFESTS) {
      expect(Object.hasOwn(TEMPLATE_GUIDES, m.slug), `${m.slug} has no cards`).toBe(true);
      for (const l of LOCALES) {
        const items = TEMPLATE_GUIDES[m.slug][l].ideas.items;
        expect(items.length, `${m.slug} ${l}`).toBe(6);
        expect(new Set(items.map((i) => i.heading.toLowerCase())).size, `${m.slug} ${l}: a moment twice`).toBe(6);
        expect(new Set(items.map((i) => i.borrow.line.toLowerCase())).size, `${m.slug} ${l}: a line twice`).toBe(6);
      }
    }
  });

  it("name a moment plainly: no exclamation marks, no dash asides, no riddles the owner turned down", () => {
    const riddles = /pressed in wax|morning of an interview|letter from the dog|lacrados|mañana de una entrevista|carta del perro/i;
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES))
      for (const l of LOCALES)
        for (const idea of guide[l].ideas.items) {
          for (const text of [idea.heading, idea.how, idea.borrow.line]) expect(text, `${slug} ${l}`).not.toMatch(/—| – /);
          for (const text of [idea.heading, idea.how]) expect(text, `${slug} ${l}`).not.toMatch(/[!¡]|perfect for|perfecto para|perfecta para/i);
          expect(idea.heading, `${slug} ${l}`).not.toMatch(riddles);
        }
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
        for (const text of [...guide[l].ideas.items.map((i) => i.how), ...guide[l].faq.map((f) => f.a)])
          for (const n of photoCounts(text, l)) {
            checked += 1;
            expect(n, `${slug} ${l}: ${n} photos in “${text.slice(0, 60)}…”`).toBeLessThanOrEqual(max);
          }
    }
    // The first version of this test read digits only and so checked three sentences. With the
    // ideas cut to one line each (21 Nov 2026) the guides give 36 counts, where their paragraphs gave over 40.
    expect(checked).toBeGreaterThan(30);
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
      // The second review of 21 Nov 2026 (guides-C21, guides-C29):
      // the ghost's sign shows their name and who it is from; the sender's words head the collage (be-my-boo/Template.tsx).
      "be-my-boo": /sign holds their name|the sign takes 24|cartel del fantasma lleva|el cartel admite 24/i,
      // The Spanish stamps are «Sin carbón», «Carbón» and «Carbón dulce» (nice-list/field-meta.ts).
      "nice-list": /traviesa y buena/i,
      // The stamp is «Visto bueno» (the-council/field-meta.ts).
      "the-council": /«aprobado»/i,
      // The fourth pour is “No alcohol” (the-toast/field-meta.ts).
      "the-toast": /sparkling|espumoso/i,
      // The palettes are Pastel, Sunset, Jewel tones and Cream & gold (balloons/field-meta.ts).
      balloons: /bright palette|colores vivos/i,
      // The pack is «Los tiernos» (sticker-bomb/field-meta.ts).
      "sticker-bomb": /los suaves/i,
      // «Óxido», «Espresso», «Oliva»; «Burdeos», «Noir», «Pergamino»; the table «Naranja otoño»; the storm «Luna roja».
      "autumn-reel": /café u oliva/i,
      "dark-romance": /negro o pergamino/i,
      wishbone: /naranja cosecha/i,
      "haunted-house": /luna de sangre/i,
      // The box is ticked from the start (digicam/schema.ts: birthday defaults to true).
      digicam: /tick “it’s their birthday”|marca que es su cumpleaños/i,
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
