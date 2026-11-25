import { dayOf } from "@/lib/games/daily";
import { weekOf } from "@/lib/games/weekly";
import { ideaDue, nearReminderEmail, nearSavedDateEmail, RESERVED } from "./monthly-idea";
import { monthsaryOn, parseYmd, ymdOf, type Ymd } from "./monthsaries";
import type { MonthDay } from "./reminders";

/**
 * The date letter: one date idea a week by email, on Thursday, to an address that asked for it in
 * the box on the dates, trips, long-distance and blog pages and then confirmed from
 * its inbox. Every address gets the same idea in a week (src/content/date-letter.ts holds the year
 * of 52), in its own language. Never news about Ethos, never a price.
 *
 * Pure rules on UTC days, as the monthly idea's are: no database, no `server-only`. The job is
 * date-letter-job.ts, the list date-letter-store.ts, the switch date-letter-flag.ts.
 */

export const LETTER_WEEKS = 52;
/**
 * Week 1 of the letter's year: the week of Monday 4 January 2027 (weekOf, as the weekly challenge
 * counts). Never change it once letters have gone. The year of 52 weeks slips a week against the
 * calendar about every six years; when the outdoor weeks start to drift out of the warm half, move
 * this on by one week (one letter is then repeated once, nobody misses one).
 */
export const LETTER_EPOCH = weekOf(dayOf(Date.UTC(2027, 0, 4)));
/** Where a click from the letter came from (`?ref=`). */
export const LETTER_REF = "email-letter";

const DAY_MS = 86_400_000;
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** The week an instant falls in: Monday 00:00 UTC to Sunday. */
export const letterWeek = (now: Date): number => weekOf(dayOf(now.getTime()));
/** Its place in the year of 52: 1 to 52, round and round, never the calendar's week number. */
export const letterSlot = (week: number): number => ((((week - LETTER_EPOCH) % LETTER_WEEKS) + LETTER_WEEKS) % LETTER_WEEKS) + 1;
/**
 * Thursday and Friday (UTC): Thursday is the day, Friday is where a letter that waited goes. Never later:
 * the lines to say name Friday, Saturday or Sunday (letter-C11), and a letter that came on Saturday
 * would invite someone to a Friday already gone. A letter that still can't go on Friday is skipped.
 */
export const isSendDay = (now: Date): boolean => [4, 5].includes(now.getUTCDay());
/** Friday: the week's last chance; a letter that would still wait is skipped. */
export const isLastSendDay = (now: Date): boolean => now.getUTCDay() === 5;

/** A path of ours as the table keeps it (0027's check): lower case, letters, digits, dashes and slashes. */
const PLAIN_PATH = /^\/[a-z0-9/-]{0,119}$/;

/** The path a sign-up came from, or "/" for anything that is not a plain path of ours. */
export function cleanPath(value: unknown): string {
  return typeof value === "string" && PLAIN_PATH.test(value) && !value.startsWith("//") ? value : "/";
}

export type LetterDayFacts = {
  /** The monthly idea's row of the account with this address, while that e-mail is switched on and not stopped. */
  idea: { since: Ymd; handledFor: Ymd | null; lastSentOn: Ymd | null } | null;
  /** monthsaries.since of that account. */
  monthsarySince: Ymd | null;
  /** The account's reminders, and keep_reminders of confirmed keeps at this address. */
  reminderDays: MonthDay[];
  /** Saved dates with "Remind us the day before" on, theirs or their partner's, while a membership runs. */
  savedDateDays: Ymd[];
};

/**
 * True when another optional e-mail of ours goes to this person today: the monthly idea (sent today,
 * or due and not yet handled), a monthsary's check-in (the day before) or its reminder (the day), a
 * reminder before a saved day, or a member's saved-date reminder. Then the letter waits a day.
 */
export function otherEmailToday(f: LetterDayFacts, today: Date): boolean {
  const day = utcDay(today);
  if (f.idea && (f.idea.lastSentOn === ymdOf(day) || ideaDue({ since: f.idea.since, handledFor: f.idea.handledFor }, day) !== null)) return true;
  const since = parseYmd(f.monthsarySince);
  if (since && (monthsaryOn(since, day) !== null || monthsaryOn(since, new Date(day.getTime() + DAY_MS)) !== null)) return true;
  return nearReminderEmail(f.reminderDays, day, 0) || nearSavedDateEmail(f.savedDateDays, day, 0);
}

export type LetterFacts = { optedOut: boolean; other: boolean };
export type LetterDecision = "send" | "skip" | "hold";

/** Reserved test domains and the unsubscribe list are skipped (and claimed); another e-mail today holds it a day, and on Friday skips it. */
export function letterDecision(email: string, facts: LetterFacts, now: Date): LetterDecision {
  if (RESERVED.test(email.trim())) return "skip";
  if (facts.optedOut) return "skip";
  if (facts.other) return isLastSendDay(now) ? "skip" : "hold";
  return "send";
}
