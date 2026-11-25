import type { TemplateManifest } from "@/templates/types";
import type { Occasion } from "@/config/occasions";
import { getManifest } from "@/templates/manifests";
import type { ReminderOccasion } from "./reminders";

/**
 * The one template an email suggests. Reminders, the monthly reminder, the monthly idea and the
 * "whose day is next?" line each name a single template and link straight into its editor: a choice already made is
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
 * every month. With `paid`, only premium ones: the three reminder e-mails start a gift with the
 * photos in it, say it can open at midnight and quote a price, none of which is true of a free note.
 */
export function suggestTemplate(kind: SuggestFor, options: { avoid?: string | null; turn?: number; paid?: boolean } = {}): TemplateManifest {
  const ideas = IDEAS[kind]
    .filter((slug) => slug !== options.avoid)
    .map(getManifest)
    .filter((m): m is TemplateManifest => m !== null && (!options.paid || m.tier === "premium"));
  const pool = ideas.length > 0 ? ideas : [getManifest(IDEAS[kind][0])!];
  return pool[Math.abs(options.turn ?? 0) % pool.length];
}

/** Where a suggestion's link goes: that template's editor, with where the click came from. */
export function suggestionPath(slug: string, ref: string): string {
  return `/create/${slug}?ref=${encodeURIComponent(ref)}`;
}

export const SEASON_IDS = ["jan-birthday", "valentines", "feb-anniversary", "march", "april", "may", "june", "july", "august", "september", "october", "november", "christmas", "year-end"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];
/** One row of the monthly idea's year: it runs from `from` ([month, day]) to the day before the next row's. */
export type SeasonIdea = {
  id: SeasonId;
  from: readonly [number, number];
  idea: string;
  alternate: string;
  more: Occasion | "templates";
  /** Its words name the day the row ends on (14 February, 31 October, 25 December, the end of the year): sent after it, they are false. */
  dated?: true;
};

/**
 * The monthly idea's year (lib/lifecycle/monthly-idea.ts), in calendar order. Each row names one
 * template, and an alternate for someone whose last gift was that very template. The email prints
 * the template's own name and tagline, so every one was checked against its schema.ts and
 * Template.tsx. No heading names a season of the year: the email goes to both hemispheres.
 */
export const SEASON_IDEAS: readonly SeasonIdea[] = [
  // Balloons was the plan's alternate here, but its tagline says every balloon hides a photo and two
  // or three hold only confetti (balloons/Template.tsx, `empties`). Scratch Card's line is true.
  { id: "jan-birthday", from: [1, 1], idea: "birthday-cinema", alternate: "scratch-card", more: "birthday" },
  { id: "valentines", from: [1, 15], idea: "bouquet", alternate: "xoxo", more: "valentines", dated: true },
  { id: "feb-anniversary", from: [2, 14], idea: "our-timeline", alternate: "vinyl", more: "anniversary" },
  { id: "march", from: [3, 1], idea: "popup-card", alternate: "party-animals", more: "birthday" },
  { id: "april", from: [4, 1], idea: "recipe-box", alternate: "garden", more: "mothers-day" },
  { id: "may", from: [5, 1], idea: "music-box", alternate: "keepsake", more: "templates" },
  { id: "june", from: [6, 1], idea: "the-toast", alternate: "front-page", more: "templates" },
  { id: "july", from: [7, 1], idea: "passport", alternate: "picnic", more: "long-distance" },
  { id: "august", from: [8, 1], idea: "digicam", alternate: "scrapbook", more: "birthday" },
  { id: "september", from: [9, 1], idea: "museum", alternate: "photo-booth", more: "anniversary" },
  { id: "october", from: [10, 1], idea: "spooky-season", alternate: "be-my-boo", more: "halloween", dated: true },
  { id: "november", from: [11, 1], idea: "jar-of-reasons", alternate: "fall-for-you", more: "templates" },
  { id: "christmas", from: [11, 25], idea: "snow-globe", alternate: "string-the-lights", more: "christmas", dated: true },
  { id: "year-end", from: [12, 25], idea: "unwrapped", alternate: "scrapbook", more: "templates", dated: true },
];

/** The row a monthly date falls in. */
export function seasonFor(date: Date): SeasonIdea {
  const key = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  let found = SEASON_IDEAS[0];
  for (const row of SEASON_IDEAS) if (row.from[0] * 100 + row.from[1] <= key) found = row;
  return found;
}

/**
 * The row for an email due on `due` and sent on `sent` (a run that caught up a day or two late). It
 * is the due date's row, so a late send never repeats last month's idea; but a row whose words name
 * the day it ends on (`dated`) is false once that day has passed ("It's on 14 February" on the 15th),
 * and then it is the next row. The next email is due 28 days or more later, past that row's end, so
 * no idea comes twice running.
 */
export function seasonForSend(due: Date, sent: Date): SeasonIdea {
  const row = seasonFor(due);
  if (!row.dated || seasonFor(sent).id === row.id) return row;
  return SEASON_IDEAS[(SEASON_IDEAS.indexOf(row) + 1) % SEASON_IDEAS.length];
}

/** The row's template, or its alternate when the idea is the template of their last gift. */
export function seasonTemplate(season: SeasonIdea, avoid?: string | null): TemplateManifest {
  const slug = avoid && avoid === season.idea ? season.alternate : season.idea;
  return getManifest(slug) ?? getManifest(season.idea)!;
}
