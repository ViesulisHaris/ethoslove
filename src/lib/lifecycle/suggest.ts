import type { TemplateManifest } from "@/templates/types";
import { getManifest } from "@/templates/manifests";
import type { ReminderOccasion } from "./reminders";

/**
 * The one template an email suggests. Reminders, the monthly reminder and the "whose day is next?"
 * line each name a single template and link straight into its editor: a choice already made is
 * easier to act on than a gallery. Chosen from the occasion only. Nothing from a past gift (its
 * photos, words, names) ever goes into an email: at most, the template it was made with is skipped,
 * so the idea is a new one.
 */
export type SuggestFor = ReminderOccasion | "monthsary" | "next";

/** Each kind's ideas, best first. Every one suits its occasion (tests/unit/suggest.test.ts checks the manifests). */
export const IDEAS: Record<SuggestFor, readonly string[]> = {
  birthday: ["birthday-cinema", "balloons", "popup-card", "party-animals"],
  anniversary: ["our-timeline", "museum", "vinyl", "scrapbook"],
  valentines: ["bouquet", "xoxo", "jar-of-reasons", "coquette"],
  // Mum, a best friend, any other day: the template that fits any of them.
  other: ["the-letter", "jar-of-reasons", "paper-crane"],
  // Small ones, quick to make on the day; a different one each month.
  monthsary: ["fortune-cookie", "kawaii", "the-council", "sticker-bomb", "jar-of-reasons", "xoxo"],
  // "Whose day is next?", under the news that a gift was opened or answered.
  next: ["birthday-cinema", "bouquet", "jar-of-reasons"],
};

/**
 * The template to suggest: the first idea for `kind` that isn't `avoid` (the template last used),
 * or, with `turn`, the idea after it in a round (a monthsary's count), so it isn't the same one
 * every month.
 */
export function suggestTemplate(kind: SuggestFor, options: { avoid?: string | null; turn?: number } = {}): TemplateManifest {
  const ideas = IDEAS[kind].filter((slug) => slug !== options.avoid).map(getManifest).filter((m): m is TemplateManifest => m !== null);
  const pool = ideas.length > 0 ? ideas : [getManifest(IDEAS[kind][0])!];
  return pool[Math.abs(options.turn ?? 0) % pool.length];
}

/** Where a suggestion's link goes: that template's editor, with where the click came from. */
export function suggestionPath(slug: string, ref: string): string {
  return `/create/${slug}?ref=${encodeURIComponent(ref)}`;
}
