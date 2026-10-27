import { daysInMonth } from "./reminders";

/**
 * Monthly anniversaries ("monthsaries"), for couples who count the months: the buyer asks for them,
 * and only ever hears about them. The day before each one we check, neutrally, that it is still on
 * ("Still celebrating with Ana tomorrow?"), because many couples don't last; only a yes brings the
 * reminder on the day, with one small idea. No answer means nothing more that month, and one tap
 * stops them all for good. Nothing is ever sent to the partner.
 *
 * A monthsary falls on the "together since" day of each month, or on the month's last day when the
 * month is shorter (31 January → 28 or 29 February, 30 April). Everything works on UTC calendar days,
 * like the yearly reminders: the job runs once each morning, UTC.
 */

/** A monthsary as the API and the account page show it. */
export type MonthsaryView = { id: string; partnerName: string; since: string; locale: "en" | "es" };

/** A calendar day, YYYY-MM-DD. */
export type Ymd = string;
export type YearMonthDay = { year: number; month: number; day: number };

const DAY_MS = 86_400_000;
/** The longest name kept, as for the yearly reminders. */
export const MONTHSARY_NAME_MAX = 60;
/** Nobody counts months from further back than this. */
export const MONTHSARY_EARLIEST_YEAR = 1950;

const pad = (n: number) => String(n).padStart(2, "0");
export const ymdOf = (d: Date): Ymd => d.toISOString().slice(0, 10);
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** "2026-03-31" → its parts, or null for anything that isn't a real day. */
export function parseYmd(value: string | null | undefined): YearMonthDay | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export const formatYmd = ({ year, month, day }: YearMonthDay): Ymd => `${year}-${pad(month)}-${pad(day)}`;

/** A "together since" day the form may save: a real day, not in the future, not before 1950. */
export function isValidSince(since: YearMonthDay | null, today: Date): since is YearMonthDay {
  if (!since || since.year < MONTHSARY_EARLIEST_YEAR) return false;
  return formatYmd(since) <= ymdOf(utcDay(today));
}

/** The monthsary in a given month: the same day, or the month's last when it is shorter. */
export function monthsaryIn(since: YearMonthDay, year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, Math.min(since.day, daysInMonth(year, month))));
}

/** How many months a monthsary in (year, month) marks. */
export const monthsSince = (since: YearMonthDay, year: number, month: number): number => (year - since.year) * 12 + (month - since.month);

/** The months a monthsary on `day` marks (1 and up), or null when `day` isn't one. */
export function monthsaryOn(since: YearMonthDay, day: Date): number | null {
  const year = day.getUTCFullYear();
  const month = day.getUTCMonth() + 1;
  const months = monthsSince(since, year, month);
  if (months < 1) return null;
  return monthsaryIn(since, year, month).getTime() === utcDay(day).getTime() ? months : null;
}

/** The next monthsary on or after `today`: its day and the months it marks. */
export function nextMonthsary(since: YearMonthDay, today: Date): { date: Date; months: number } {
  const start = utcDay(today);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth() + 1;
  for (;;) {
    const months = monthsSince(since, year, month);
    const date = monthsaryIn(since, year, month);
    if (months >= 1 && date.getTime() >= start.getTime()) return { date, months };
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

/**
 * The days of the month whose monthsaries land on `day`: just its own, or, on a month's last day,
 * every later day the month doesn't have (the 29th, 30th and 31st on 28 February in a common year).
 * What the job asks the database for.
 */
export function daysLandingOn(day: Date): number[] {
  const d = day.getUTCDate();
  const last = daysInMonth(day.getUTCFullYear(), day.getUTCMonth() + 1);
  return d === last ? Array.from({ length: 31 - d + 1 }, (_, i) => d + i) : [d];
}

/** A monthsary as the job reads it. */
export type MonthsaryState = {
  since: Ymd;
  /** The monthsary the check-in was last sent for. */
  checkinFor: Ymd | null;
  /** The monthsary the buyer said yes to. */
  confirmedFor: Ymd | null;
  /** The monthsary the reminder was last sent for (or shown, on a yes given on the day). */
  remindedFor: Ymd | null;
};

export type MonthsaryWork = {
  /** Tomorrow is one, and it hasn't been asked about. */
  checkIn?: { date: Ymd; months: number };
  /** Today is one, they said yes to it, and it hasn't been sent. */
  remind?: { date: Ymd; months: number };
};

/**
 * What the morning job does for one monthsary: ask about tomorrow's, remind about today's, or
 * nothing. The check-in only ever goes the day before: a run that missed that day sends nothing
 * late, since "tomorrow" would no longer be true. The reminder only follows a yes to that very day.
 */
export function monthsaryWork(state: MonthsaryState, today: Date): MonthsaryWork {
  const since = parseYmd(state.since);
  if (!since) return {};
  const day = utcDay(today);
  const tomorrow = new Date(day.getTime() + DAY_MS);
  const work: MonthsaryWork = {};
  const ahead = monthsaryOn(since, tomorrow);
  if (ahead !== null && state.checkinFor !== ymdOf(tomorrow)) work.checkIn = { date: ymdOf(tomorrow), months: ahead };
  const now = monthsaryOn(since, day);
  if (now !== null && state.confirmedFor === ymdOf(day) && state.remindedFor !== ymdOf(day)) work.remind = { date: ymdOf(day), months: now };
  return work;
}

/** What a yes does, by when it is given: before the day (the morning's reminder), on it (the idea now), or too late. */
export type YesOutcome = "remind_tomorrow" | "today" | "passed";

export function answerYes(date: Ymd, today: Date): YesOutcome {
  const day = ymdOf(utcDay(today));
  if (date > day) return "remind_tomorrow";
  return date === day ? "today" : "passed";
}
