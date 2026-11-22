import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import type { GiftGuideIdea } from "./gift-guides";
import { SAMPLE_FIELDS, type ListedOccasion } from "./occasion-ideas";

/**
 * What an idea's picture card says (components/marketing/spread), drawn from the idea as it is
 * written in full. The owner refused the pages that printed a paragraph for every idea ("it's
 * SOOO MUCH TEXT… no one's reading all that", 21 Nov 2026), so a card is a poster and a title, and
 * opens to one line and a line to borrow in handwriting (DESIGN-LESS-TEXT.md). Nothing here writes
 * a sentence: a card's line is a whole sentence or a whole clause of the idea's own, or the gift's
 * own tagline, so a fact checked against a template stays the fact that was checked.
 *
 * The limits, held by tests/unit/spread-budget.test.ts in both languages.
 */
export const CARD_TITLE_WORDS = 9;
export const CARD_LINE_WORDS = 18;
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

/** The first sentence of a gift's tagline: what the gift is, in its own words. */
export function taglineLine(manifest: TemplateManifest, locale: GiftLocale): string {
  return sentencesOf(manifest.tagline[locale])[0] ?? "";
}

/** The one line a card of a gift page by kind opens to: the idea's own short line, or its opening sentence. */
export function kindCardLine(idea: GiftGuideIdea): string {
  return idea.brief ?? openingLine(idea.body) ?? "";
}

/**
 * The one line a card of an occasion's idea list opens to: the idea's opening where that is one
 * line, and otherwise the gift's own tagline, which says what the card's picture shows.
 */
export function occasionCardLine(idea: { body: string }, manifest: TemplateManifest, locale: GiftLocale): string {
  return openingLine(idea.body) ?? taglineLine(manifest, locale);
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
 * goes in: the first quotation in the idea that content/occasion-ideas.ts (SAMPLE_FIELDS) says is
 * a line for a field, each of which tests/unit/occasion-guides.test.ts has counted against that
 * field's limit. The lists written before that table (birthday, anniversary, Valentine's,
 * Christmas) have no such record, so their cards show none: a quotation there may be a label of
 * the editor or what not to write.
 */
export function occasionSample(occasion: Occasion, idea: { template: string; body: string }): { field: string; text: string } | null {
  if (!Object.hasOwn(SAMPLE_FIELDS, occasion)) return null;
  const fields = SAMPLE_FIELDS[occasion as ListedOccasion][idea.template] ?? [];
  const found = sampleLines(idea.body);
  const at = fields.findIndex((field) => field !== "-");
  return at >= 0 && found[at] ? { field: fields[at], text: found[at] } : null;
}
