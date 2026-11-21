import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TEMPLATE_GUIDES, type BorrowField } from "@/content/template-guides";
import { FREE_NOTE_MAX_CHARS } from "@/lib/gift/free-tier";
import { giftCountdownSchema, giftDataBaseSchema, giftPhotoSchema, giftSurpriseSchema } from "@/lib/gift/schema";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";

/**
 * The proof file the guides brief asks for (docs/marketing/growth-build/reports/guides-claims.md),
 * and the check behind it. For every card of every gift it finds, in the template's own code:
 *
 * - the limit of the field the borrowed line goes in, and the line that limit is written on;
 * - the line of the template that draws that field, so a card never lends a line for a field the
 *   gift does not show;
 * - the line of the editor's own description of the field (field-meta.ts);
 * - for a card that says what the gift does ("the letter unrolls from the bottle once the cork
 *   pops"), the first line of the template where that thing is: SAID below names it card by card;
 * - every choice the card names, and the line of field-meta.ts that gives the choice that name.
 *
 * The first version of the file listed lines of copy the owner had since turned down and 16 of the
 * 61 gifts, while saying it could not disagree with the page (the review of 21 Nov 2026). This one
 * is written from the cards themselves and fails here, on every run, when a card's field is not
 * drawn or a thing it names is not in the template.
 *
 * To write the file:  GUIDES_CLAIMS_OUT=<path> npx vitest run tests/unit/guides-claims.test.ts
 *
 * What a pointer is worth: it shows a reader where to look. "Drawn at" and the limits are exact.
 * A SAID pointer is the first line in which the card's own word appears in the template, which is
 * where its truth is read by a person; it does not prove the sentence by itself. The name a line
 * declares does not count as the word (`const kraft` passed "a scrap of kraft paper" once).
 */
type Locale = "en" | "es";
const ROOT = process.cwd();

/** A template's own code, Template.tsx first: what it draws. Its data and its editor's words are read apart. */
function codeOf(slug: string): { file: string; lines: string[] }[] {
  const dir = join(ROOT, "src/templates", slug);
  const skip = /^(demo-data|manifest|schema|field-meta|index)\.tsx?$/;
  const files = readdirSync(dir).filter((f) => /\.(tsx?|css)$/.test(f) && !skip.test(f));
  files.sort((a, b) => Number(b === "Template.tsx") - Number(a === "Template.tsx") || a.localeCompare(b));
  return files.map((f) => ({ file: `src/templates/${slug}/${f}`, lines: readFileSync(join(dir, f), "utf8").split(/\r?\n/) }));
}
const SHARED_CODE = ["src/templates/_shared/holiday/page.tsx", "src/templates/_shared/holiday/steps.tsx"].map((file) => ({ file, lines: readFileSync(join(ROOT, file), "utf8").split(/\r?\n/) }));

/**
 * A line with the name it declares blanked out: `const kraft = { background: … }` is no proof that
 * anything is kraft paper. Sketchbook's P.S. was said to be "on a scrap of kraft paper" on the
 * strength of that variable's name; it is a box tinted 5% grey (the test of 21 Nov 2026).
 */
const withoutDeclaredName = (line: string) => line.replace(/^(\s*(?:export\s+)?(?:const|let|var|function|type|interface|class)\s+)[\w$]+/, "$1");

function find(files: { file: string; lines: string[] }[], pattern: RegExp, said = false): string | null {
  for (const { file, lines } of files) {
    // A comment says what the code does, and is a fair pointer; an import line is not. Nor, for
    // what a card says the gift does, is a line whose only match is the name of what it declares.
    const at = lines.findIndex((line) => pattern.test(said ? withoutDeclaredName(line) : line) && !/^\s*import /.test(line));
    if (at >= 0) return `${file}:${at + 1}`;
  }
  return null;
}
const lineIn = (file: string, pattern: RegExp): string | null => (existsSync(join(ROOT, file)) ? find([{ file, lines: readFileSync(join(ROOT, file), "utf8").split(/\r?\n/) }], pattern) : null);

function maxOf(schema: unknown): number | null {
  let s = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault || s instanceof z.ZodNullable) s = s.unwrap();
  if (s instanceof z.ZodArray) return maxOf(s.element);
  return s instanceof z.ZodString ? s.maxLength : null;
}

/** The fields every gift has: their limit, the line it is written on, and how a template is seen to draw them. */
const SHARED: Record<string, { limit: number | null; at: string | null; drawn: RegExp }> = {
  title: { limit: maxOf(giftDataBaseSchema.shape.title), at: lineIn("src/lib/gift/schema.ts", /^\s*title: z\.string/), drawn: /data\.title|\btitle\b/ },
  message: { limit: maxOf(giftDataBaseSchema.shape.message), at: lineIn("src/lib/gift/schema.ts", /^\s*message: z\.string/), drawn: /MessageBody|RichMessage|Typewriter|data\.message|parseMessage|blocks/ },
  note: { limit: FREE_NOTE_MAX_CHARS, at: lineIn("src/lib/gift/free-tier.ts", /FREE_NOTE_MAX_CHARS = /), drawn: /MessageBody|RichMessage|Typewriter|data\.message|blocks/ },
  recipientName: { limit: maxOf(giftDataBaseSchema.shape.recipientName), at: lineIn("src/lib/gift/schema.ts", /^\s*recipientName: z\.string/), drawn: /recipientName/ },
  senderName: { limit: maxOf(giftDataBaseSchema.shape.senderName), at: lineIn("src/lib/gift/schema.ts", /^\s*senderName: z\.string/), drawn: /senderName/ },
  caption: { limit: maxOf(giftPhotoSchema.shape.caption), at: lineIn("src/lib/gift/schema.ts", /^\s*caption: z\.string/), drawn: /caption/ },
  "countdown.label": { limit: maxOf(giftCountdownSchema.shape.label), at: lineIn("src/lib/gift/schema.ts", /^\s*label: z\.string\(\)\.max/), drawn: /<Countdown|data\.countdown|HolidayPage|holidaySteps/ },
  "surprise.text": { limit: maxOf(giftSurpriseSchema.shape.text), at: lineIn("src/lib/gift/schema.ts", /^\s*text: z\.string\(\)\.min\(1\)\.max/), drawn: /<SurpriseReveal|data\.surprise|HolidayPage|holidaySteps/ },
};

/**
 * What a card says the gift does, by gift and card number, as a word to find in the template. Only
 * for a card that says more than a limit, a choice or what to write: those are checked by number
 * and by name (tests/unit/template-guides.test.ts). Several patterns: each must be found.
 */
const SAID: Record<string, Record<number, RegExp[]>> = {
  "scratch-card": { 1: [/finalTitle/], 6: [/foilText/] },
  bouquet: { 3: [/cardNote/] },
  "fortune-cookie": { 2: [/MessageBody|message/i], 6: [/photo/i] },
  "the-letter": { 2: [/seal/i], 5: [/signOff/], 6: [/postcard/i] },
  "birthday-cinema": { 1: [/marquee/i], 2: [/candle/i], 3: [/film/i], 5: [/setDone\(true\)/, /done && data\.surprise/], 6: [/MessageBody/] },
  constellations: { 1: [/star/i], 3: [/finalLine/], 6: [/shape/i] },
  xoxo: { 1: [/headline/], 3: [/underline/i], 5: [/doily/i], 6: [/a kiss by the name/] },
  "the-council": { 4: [/cat/i], 5: [/exhibit/i] },
  bloom: { 3: [/setDone\(true\)/, /done && data\.surprise/], 4: [/photo/i], 5: [/hold/i] },
  halfway: { 3: [/turns over/i], 4: [/distanceKm|\bkm\b/], 5: [/tape/i] },
  "frosted-window": { 1: [/snowman/i], 2: [/stocking/i] },
  "light-the-candles": { 5: [/line-clamp-3/], 6: [/lit/i] },
  "string-the-lights": { 1: [/bulb/i], 2: [/board/i] },
  "gingerbread-house": { 1: [/sweet/i], 2: [/door/i], 3: [/title/], 6: [/sweet/i] },
  "snow-globe": { 2: [/settle/i], 4: [/shake/i], 6: [/hang in the snow/i, /wait in the letter/i] },
  "nice-list": { 5: [/evidence/i] },
  "jar-of-reasons": { 1: [/label/], 5: [/photo/i] },
  "our-timeline": { 5: [/Countdown/], 6: [/ending/] },
  scrapbook: { 2: [/quote/], 6: [/TYPE|typewrit/i] },
  arcade: { 1: [/level/i], 4: [/setDone\(true\)/, /done && data\.surprise/], 5: [/level/i] },
  "autumn-reel": { 1: [/ticket/i], 3: [/film/i], 6: [/MessageBody|message/i] },
  balloons: { 1: [/foil|age/i], 2: [/balloon/i], 5: [/letter|message/i], 6: [/banner|bunting/i] },
  "bat-swarm": { 1: [/spell|\bline\b/i], 4: [/glass/i, /moon/i], 5: [/moon/i] },
  "be-my-boo": { 1: [/sign/], 2: [/note/], 4: [/polaroid/i] },
  "cap-toss": { 1: [/diploma/i], 3: [/yearbook|tape/i] },
  cauldron: { 1: [/jar/i], 2: [/bottle/i], 5: [/cork/i], 6: [/jar/i] },
  coquette: { 1: [/note/], 3: [/label/], 5: [/polaroid/i], 6: [/the letter/, /TornPaper/] },
  "dark-romance": { 2: [/tarot/i], 3: [/bet/], 5: [/seal|wax/i] },
  digicam: { 1: [/birthday/], 2: [/stamp/i], 5: [/strip/i], 6: [/stampDate/] },
  evergreen: { 3: [/polaroid/i] },
  "fall-for-you": { 1: [/blocks/], 2: [/recipe/i], 6: [/polaroid/i] },
  "favorite-person": { 1: [/title/], 4: [/gingham|tape/i] },
  fireside: { 1: [/blanket/i], 5: [/peg/i], 6: [/candle/i] },
  "front-page": { 2: [/paperName/], 6: [/horoscope/] },
  garden: { 1: [/tag/], 4: [/trellis/i], 5: [/potting|greenhouse/i] },
  "haunted-house": { 1: [/title/], 3: [/window/i], 5: [/knock/i] },
  "jack-o-lantern": { 1: [/carving/], 3: [/title/], 5: [/polaroid/i], 6: [/open: the letter/, /fbf5e8/] },
  kawaii: { 1: [/greeting/, /speech bubble/], 3: [/the note/, /gift-font-hand/], 4: [/tape|sticker/i] },
  keepsake: { 1: [/locket/i], 3: [/dried|pressed|flower/i], 5: [/envelope/i], 6: [/seal/i] },
  "midnight-countdown": { 2: [/firework/i], 5: [/unlock|locked|zero/i], 6: [/zero|unlock/i] },
  museum: { 2: [/years/], 3: [/plaque/i], 5: [/wall/i] },
  "music-box": { 1: [/letter lifts|lift/i], 2: [/mirror/i] },
  "on-repeat": { 2: [/caption/], 3: [/note/] },
  "pack-your-bags": { 1: [/tag/i], 2: [/board/i], 3: [/ticket/i], 6: [/stub/i] },
  "paper-crane": { 2: [/closing/], 5: [/tap/i] },
  "party-animals": { 2: [/candle/i], 3: [/shout/i] },
  passport: { 3: [/stamp/i], 5: [/setDone\(true\)/, /done && data\.surprise/], 6: [/visa/i] },
  "photo-booth": { 1: [/wall/i], 5: [/flash/i, /mirror/i], 6: [/lined|ruled|rule/i] },
  picnic: { 4: [/note/i], 5: [/pattern=\{gingham/] },
  "popup-card": { 1: [/topper/i], 2: [/lid/i], 3: [/blow/i], 4: [/peg/i] },
  "recipe-box": { 6: [/turned over/, /clipped to the card/] },
  seance: { 1: [/spell/i], 3: [/planchette/i], 6: [/mist|develop/i] },
  sketchbook: { 1: [/circle/i], 2: [/tape|doodle/i], 4: [/hat/i], 5: [/data\.surprise \?/, /t\("ps"\)/], 6: [/MessageBody|message/i] },
  "spooky-season": { 2: [/note/], 4: [/polaroid/i] },
  "sticker-bomb": { 5: [/kind === "photo"/, /aspect-square/] },
  "text-thread": { 4: [/\[photo\]|photo/i], 6: [/contactName/] },
  "the-toast": { 2: [/menu/i], 3: [/menu/i], 6: [/bubble/i] },
  "trick-or-treat": { 1: [/porch/i], 2: [/doorLine/], 4: [/parchment/], 5: [/scroll/i], 6: [/haunted frame/] },
  unwrapped: { 1: [/counting up/], 3: [/the gold one, with the year/, /receipt/i] },
  vinyl: { 3: [/crate/i], 4: [/liner/i] },
  wishbone: { 1: [/card/i], 2: [/winner/], 3: [/plate/i] },
};

type Card = { n: number; heading: string; headingEs: string; field: BorrowField; limit: number | null; limitAt: string | null; drawnAt: string | null; editorAt: string | null; how: string; lines: Record<Locale, string>; said: { pattern: string; at: string | null }[]; choices: { name: string; at: string | null }[] };

async function cardsOf(slug: string): Promise<Card[]> {
  const code = codeOf(slug);
  const schema = await loadFieldsSchema(slug);
  const metaFile = `src/templates/${slug}/field-meta.ts`;
  const meta = existsSync(join(ROOT, metaFile)) ? ((await import(`../../src/templates/${slug}/field-meta.ts`)) as { fieldMeta: Record<string, Record<string, { label: string; options?: Record<string, string> }>> }).fieldMeta : { en: {}, es: {} };
  const guide = TEMPLATE_GUIDES[slug];
  return guide.en.ideas.items.map((idea, i) => {
    const field = idea.borrow.field;
    const own = field.startsWith("fields.") ? field.slice("fields.".length) : null;
    const shared = SHARED[field];
    const limit = own ? (schema instanceof z.ZodObject ? maxOf(schema.shape[own]) : null) : (shared?.limit ?? null);
    const limitAt = own ? lineIn(`src/templates/${slug}/schema.ts`, new RegExp(`^\\s*${own}:`)) : (shared?.at ?? null);
    const drawn = own ? new RegExp(`\\b(?:fields|f|data\\.fields)\\??\\.${own}\\b|\\b${own}\\b`) : shared.drawn;
    const drawnAt = find(code, drawn) ?? find(SHARED_CODE, drawn);
    const editorAt = own ? lineIn(metaFile, new RegExp(`^\\s*${own}:`)) : null;
    const said = (SAID[slug]?.[i + 1] ?? []).map((pattern) => ({ pattern: String(pattern), at: find(code, pattern, true) ?? find(SHARED_CODE, pattern, true) }));
    // Every choice of this gift's editor that the card names, in English.
    const choices: Card["choices"] = [];
    for (const [key, m] of Object.entries(meta.en ?? {}))
      for (const name of Object.values(m.options ?? {})) {
        const word = name.replace(/^(A|An|The|Two) /i, "").split(/[ ,]/)[0];
        if (word.length >= 4 && new RegExp(`(?<![\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "iu").test(idea.how) && !choices.some((c) => c.name === name)) choices.push({ name, at: lineIn(metaFile, new RegExp(`^\\s*${key}:`)) });
      }
    return { n: i + 1, heading: idea.heading, headingEs: guide.es.ideas.items[i].heading, field, limit, limitAt, drawnAt, editorAt, how: idea.how, lines: { en: idea.borrow.line, es: guide.es.ideas.items[i].borrow.line }, said, choices };
  });
}

describe("the guides' claims, traced to each template's own code", () => {
  it("finds, for every card of every gift, the limit of its field and the line of the template that draws it", async () => {
    const missing: string[] = [];
    const out: string[] = [
      "# Guides: every card, the field it lends a line for, and the lines of the template that make it true",
      "",
      "Written by `tests/unit/guides-claims.test.ts` from `src/content/template-guides.ts` (run it with `GUIDES_CLAIMS_OUT` set to rewrite this file).",
      "The same test fails on every run when a card lends a line for a field its template does not draw, or names a thing that is not in the template's code.",
      "",
      "How to read a card: gift and number, its title (English / Spanish), the field its line goes in with that field's limit and where the limit is written,",
      "the borrowed line's length in each language, what the card tells the sender, then where that is true:",
      "**drawn** is the line of the template that shows the field; **editor** the line of `field-meta.ts` that describes it to the sender;",
      "**does** the first line of the template in which the thing the card names appears (a pointer for a reader: open it and read on);",
      "**choice** each choice the card names and the line that gives it that name.",
      "A length is `string.length`, which is what Zod's `.max()` counts; the free Letter's note is counted as its editor counts it.",
      "",
    ];
    let cards = 0;
    let pointers = 0;
    for (const m of TEMPLATE_MANIFESTS) {
      out.push(`## ${m.slug}`, "");
      for (const card of await cardsOf(m.slug)) {
        cards += 1;
        if (card.limit === null || !card.limitAt) missing.push(`${m.slug} ${card.n}: ${card.field} has no limit that can be read`);
        if (!card.drawnAt) missing.push(`${m.slug} ${card.n}: nothing in the template draws ${card.field}`);
        for (const said of card.said) {
          pointers += 1;
          if (!said.at) missing.push(`${m.slug} ${card.n}: “${card.how}” but ${said.pattern} is nowhere in the template`);
        }
        const parts = [
          `- **${m.slug} ${card.n}.** ${card.heading} / ${card.headingEs}: \`${card.field}\` ≤ ${card.limit} (${card.limitAt}): en ${card.lines.en.length} “${card.lines.en}” / es ${card.lines.es.length} «${card.lines.es}».`,
          `  Says: “${card.how}”`,
          `  drawn ${card.drawnAt}${card.editorAt ? `; editor ${card.editorAt}` : ""}${card.said.map((s) => `; does ${s.pattern} → ${s.at}`).join("")}${card.choices.map((c) => `; choice “${c.name}” ${c.at}`).join("")}`,
        ];
        out.push(...parts);
      }
      out.push("");
    }
    expect(missing).toEqual([]);
    expect(cards).toBe(TEMPLATE_MANIFESTS.length * 6);
    // Every gift written since the first three has at least one card traced beyond its field.
    expect(pointers).toBeGreaterThan(150);
    if (process.env.GUIDES_CLAIMS_OUT) writeFileSync(process.env.GUIDES_CLAIMS_OUT, out.join("\n"));
  });

  it("names, in SAID, only gifts and cards that exist", () => {
    for (const [slug, cards] of Object.entries(SAID)) {
      expect(Object.hasOwn(TEMPLATE_GUIDES, slug), slug).toBe(true);
      for (const n of Object.keys(cards)) expect(Number(n), `${slug} ${n}`).toBeLessThanOrEqual(TEMPLATE_GUIDES[slug].en.ideas.items.length);
    }
  });
});
