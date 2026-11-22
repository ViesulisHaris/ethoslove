import type { Occasion } from "@/config/occasions";
import { sendsFree } from "@/lib/gift/free-tier";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import type { GiftGuideIdea } from "./gift-guides";
import { sampleFieldsOf } from "./occasion-ideas";

/**
 * What an idea's picture card says (components/marketing/spread), drawn from the idea as it is
 * written in full. The owner refused the pages that printed a paragraph for every idea ("it's
 * SOOO MUCH TEXT… no one's reading all that", 21 Nov 2026), so a card is a poster and a title, and
 * opens to one line and a line to borrow in handwriting (DESIGN-LESS-TEXT.md). Nothing here writes
 * a sentence: a card's line is the idea's own short line (`brief`), written beside the idea and cut
 * from it, or a whole sentence or a whole clause of the idea's opening, so a fact checked against a
 * template stays the fact that was checked.
 *
 * A line has a floor as well as a ceiling. The first version fell back on the gift's tagline, and
 * took any opening sentence however short: a card then opened onto "You're invited.", "Press
 * power." or "Not “congratulations”.", a slogan or half a thought, and the same tagline stood on
 * three pages (the review of 22 Nov 2026). So there is no fallback: an idea whose opening is not a
 * line by itself is given a brief, and the tests fail one that has neither.
 *
 * The limits, held by tests/unit/spread-budget.test.ts in both languages.
 */
export const CARD_TITLE_WORDS = 9;
export const CARD_LINE_WORDS = 18;
/** Under this a line is a fragment: "Press play.", "A jar of folded notes." */
export const CARD_LINE_MIN_WORDS = 6;
/** A line of handwriting on a card, as on a gift page's cards. */
export const HAND_LINE_WORDS = 16;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentencesOf = (s: string) => s.trim().split(/(?<=[.!?])\s+/);
/** Every quotation opened is closed: a sentence cut inside “a sample line” is not a sentence. */
const whole = (s: string) => (s.match(/[“«]/g) ?? []).length === (s.match(/[”»]/g) ?? []).length;

/**
 * The opening of an idea, as one line: its first sentence where that is short enough, or that
 * sentence up to its first colon or semicolon, which in these texts is where a statement ends and
 * its list of examples begins ("Choose every stem yourself, up to 24: tulips, peonies, …"). null
 * where neither is a whole statement within the limit.
 */
export function openingLine(body: string, max = CARD_LINE_WORDS): string | null {
  const first = sentencesOf(body)[0] ?? "";
  if (first && words(first) <= max && whole(first)) return first;
  const stop = first.search(/[:;]\s/);
  if (stop < 0) return null;
  const clause = first.slice(0, stop).trim();
  return words(clause) >= 5 && words(clause) <= max && whole(clause) ? `${clause}.` : null;
}

/** The one line a card of a gift page by kind opens to: the idea's own short line, or its opening sentence. */
export function kindCardLine(idea: GiftGuideIdea): string {
  return idea.brief ?? openingLine(idea.body) ?? "";
}

/** The one line a card of an occasion's idea list opens to: the idea's own short line, or its opening where that is one line. */
export function occasionCardLine(idea: { body: string; brief?: string }): string {
  return idea.brief ?? openingLine(idea.body) ?? "";
}

/**
 * Whether a card of a gift page by kind says "Free". The tag is about the idea, not the template:
 * The Letter goes out free as a short note, and an idea that puts a video clip or a long letter in
 * it does not (lib/gift/publish.ts, premiumExtras). So only an idea whose line to borrow is the
 * free note itself is tagged. The first version asked the template alone, and the video page's
 * "A letter with you in it" was tagged free.
 */
export function kindIdeaIsFree(idea: Pick<GiftGuideIdea, "line">, manifest: Pick<TemplateManifest, "slug" | "tier" | "features">): boolean {
  return idea.line.field === "freeNote" && sendsFree(manifest);
}

/**
 * A line to borrow as a card shows it in handwriting: its opening sentences, as many as fit in
 * sixteen words. A whole short note (the free Letter's 500 characters) is shown by its first
 * sentence; what is shown is always something that fits the field it is for, since the whole did.
 */
export function handLine(text: string, max = HAND_LINE_WORDS): string {
  const sentences = sentencesOf(text);
  let taken = 1;
  let count = words(sentences[0] ?? "");
  while (taken < sentences.length && count + words(sentences[taken]) <= max) {
    count += words(sentences[taken]);
    taken += 1;
  }
  return sentences.slice(0, taken).join(" ");
}

/** The quoted samples in an idea's body, in order: “like this”. */
export function sampleLines(body: string): string[] {
  return [...body.matchAll(/“([^”]*)”/g)].map((m) => m[1]);
}

/**
 * The sample line an occasion idea's card shows in handwriting, and the field of the template it
 * goes in: the quotation in the idea that content/occasion-ideas.ts (SAMPLE_FIELDS) marks with a
 * "+", or where none is marked the first one it says is a line for a field. Each of them
 * tests/unit/occasion-guides.test.ts has counted against that field's limit. A quotation the table
 * marks "-" is never shown: it is a label of the editor, or what not to write.
 */
export function occasionSample(occasion: Occasion, idea: { template: string; body: string }, locale: GiftLocale): { field: string; text: string } | null {
  const fields = sampleFieldsOf(occasion, idea.template, locale);
  if (!fields) return null;
  const found = sampleLines(idea.body);
  const marked = fields.findIndex((field) => field.startsWith("+"));
  const at = marked >= 0 ? marked : fields.findIndex((field) => field !== "-");
  return at >= 0 && found[at] ? { field: fields[at].replace(/^\+/, ""), text: found[at] } : null;
}
