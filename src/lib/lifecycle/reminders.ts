import type { GiftCountdown } from "@/lib/gift/schema";
import type { Occasion } from "@/config/occasions";

/**
 * "Remind me next year": when a reminder is due, and what it starts as. Dates are a month and a
 * day, with no year, because they come round every year. Everything here works on UTC calendar
 * days: the email says a date, not a time, and the daily job runs once in the morning, UTC.
 */

export const REMINDER_OCCASIONS = ["birthday", "anniversary", "valentines", "other"] as const;
export type ReminderOccasion = (typeof REMINDER_OCCASIONS)[number];

/** How far ahead the email goes out: time to make something, and to schedule it for the morning. */
export const LEAD_DAYS = 9;
/** A daily job that missed a run or two still sends, a little later, rather than never. */
export const CATCH_UP_DAYS = 2;
/**
 * A reminder saved while making a gift is for next year. If the date comes round within this many
 * days, it is the occasion the gift was just made for, so this year's email is skipped.
 */
export const SKIP_WINDOW_DAYS = 31;
/** Plenty for a family and a few friends; a list longer than this is not somebody's birthdays. */
export const MAX_REMINDERS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
/** The longest name a reminder keeps: the form stops typing there, and the API refuses longer. */
export const REMINDER_NAME_MAX = 60;
/** Any leap year: where a date is checked or written without a year, 29 February must exist. */
export const A_LEAP_YEAR = 2024;

export type MonthDay = { month: number; day: number };

export const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** A day the month has in some year: 29 February yes, 31 April no. */
export function isRealDay({ month, day }: MonthDay): boolean {
  return Number.isInteger(month) && Number.isInteger(day) && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(A_LEAP_YEAR, month);
}

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/** The day it falls on in a given year: 29 February is kept on the 28th when there is no 29th. */
export function occurrenceIn(year: number, { month, day }: MonthDay): Date {
  return new Date(Date.UTC(year, month - 1, Math.min(day, daysInMonth(year, month))));
}

/** The next time it comes round, today included. */
export function nextOccurrence(date: MonthDay, today: Date): Date {
  const start = utcDay(today);
  const thisYear = occurrenceIn(start.getUTCFullYear(), date);
  return thisYear.getTime() >= start.getTime() ? thisYear : occurrenceIn(start.getUTCFullYear() + 1, date);
}

/**
 * What a new reminder records as already sent: the year of the next occurrence when the gift just
 * made is for it, otherwise nothing. It is for it when the gift counts down to that very day
 * (`giftDay`, YYYY-MM-DD, however far ahead the gift was made), or when the day comes round within
 * the skip window.
 */
export function initialLastSentYear(date: MonthDay, today: Date, giftDay?: string | null, window = SKIP_WINDOW_DAYS): number | null {
  const next = nextOccurrence(date, today);
  const year = next.getUTCFullYear();
  if (giftDay && /^\d{4}-\d{2}-\d{2}$/.test(giftDay)) {
    const [y, m, d] = giftDay.split("-").map(Number);
    if (y === year && m === date.month && d === date.day) return year;
  }
  return next.getTime() - utcDay(today).getTime() <= window * DAY_MS ? year : null;
}

export type DueDate = {
  /** The occasion's own year: what last_sent_year becomes once the email has gone. */
  year: number;
  month: number;
  /** Stored days that fall on this date: two on 28 February in a year without a 29th. */
  days: number[];
  /** The occasion's date, midnight UTC. */
  date: Date;
};

/**
 * The dates whose reminders the daily job sends on `today`: the one LEAD_DAYS ahead, and the
 * CATCH_UP_DAYS before it for runs that were missed. A reminder already sent for that year is
 * filtered out by last_sent_year, so the catch-up never sends twice.
 */
export function dueDates(today: Date, lead = LEAD_DAYS, catchUp = CATCH_UP_DAYS): DueDate[] {
  const start = utcDay(today);
  const out: DueDate[] = [];
  for (let ahead = lead - catchUp; ahead <= lead; ahead++) {
    const date = addDays(start, ahead);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const leapDayMovesHere = month === 2 && day === 28 && !isLeapYear(year);
    out.push({ year, month, days: leapDayMovesHere ? [28, 29] : [day], date });
  }
  return out;
}

/** Whether a reminder still needs this year's email. */
export const needsSending = (lastSentYear: number | null, year: number): boolean => lastSentYear === null || lastSentYear < year;

/** The gift's templates' occasion, as a reminder knows it: the first one that recurs on a date. */
export function reminderOccasionFor(occasions: readonly Occasion[] | undefined): ReminderOccasion {
  const first = occasions?.[0];
  return first === "birthday" || first === "anniversary" || first === "valentines" ? first : "other";
}

/** The day a gift counts down to, in its own timezone (UTC when that can't be read), as YYYY-MM-DD. */
export function countdownDay(countdown: GiftCountdown | undefined): string | null {
  if (!countdown) return null;
  const at = new Date(countdown.targetAt);
  if (Number.isNaN(at.getTime())) return null;
  const format = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(at);
  try {
    return format(countdown.timezone);
  } catch {
    return format("UTC");
  }
}

/** The day the gift is for, in its own timezone, else today in the viewer's. Valentine's is always the 14th. */
export function reminderDateFor(occasion: ReminderOccasion, countdown: GiftCountdown | undefined, now: Date): MonthDay {
  if (occasion === "valentines") return { month: 2, day: 14 };
  const day = countdownDay(countdown);
  if (day) {
    const found = { month: Number(day.slice(5, 7)), day: Number(day.slice(8, 10)) };
    if (isRealDay(found)) return found;
  }
  return { month: now.getMonth() + 1, day: now.getDate() };
}

/** "3 October" / "3 de octubre": the date as the email and the list say it, with no year. */
export function formatMonthDay({ month, day }: MonthDay, locale: "en" | "es"): string {
  // The year is never shown.
  const date = new Date(Date.UTC(A_LEAP_YEAR, month - 1, day));
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

/** A reminder as the API returns it. */
export type Reminder = { id: string; recipientName: string; occasion: ReminderOccasion; month: number; day: number; locale: "en" | "es"; templateSlug: string | null };
