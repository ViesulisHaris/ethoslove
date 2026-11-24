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

/**
 * Three e-mails before each day (migration 0025): stage 1 seven days before, stage 2 two days before,
 * stage 3 the day before. A reminder remembers the occasion's year and the stage that went last
 * (last_sent_year, last_stage); stage 3 of a year, or a gift made, or "Not this year", is done for it.
 */
export type Stage = 1 | 2 | 3;
export const STAGES: readonly Stage[] = [1, 2, 3];
export const STAGE_DAYS: Record<Stage, number> = { 1: 7, 2: 2, 3: 1 };
/** Only the first e-mail catches up on a missed run (at 6 and 5 days): "tomorrow" is only true on its day. */
export const STAGE_CATCH_UP = 2;
/** Where the year is done: the last of the three went, or nothing more is to go. */
export const DONE_STAGE: Stage = 3;

export type DueStage = { stage: Stage; due: DueDate; daysAway: number };

function dueOn(start: Date, ahead: number): DueDate {
  const date = addDays(start, ahead);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const leapDayMovesHere = month === 2 && day === 28 && !isLeapYear(year);
  return { year, month, days: leapDayMovesHere ? [28, 29] : [day], date };
}

/**
 * The days whose e-mails the morning job sends on `today`, and which e-mail each gets: stage 1 for
 * the day 7, 6 and 5 days away (the last two for runs that were missed), stage 2 for the day exactly 2
 * away, stage 3 for the day exactly 1 away. 29 February is sent for on the 28th in other years.
 */
export function dueStages(today: Date): DueStage[] {
  const start = utcDay(today);
  const out: DueStage[] = [];
  for (const stage of STAGES) {
    const lead = STAGE_DAYS[stage];
    const from = stage === 1 ? lead - STAGE_CATCH_UP : lead;
    for (let ahead = lead; ahead >= from; ahead--) out.push({ stage, due: dueOn(start, ahead), daysAway: ahead });
  }
  return out;
}

/**
 * Whether a reminder still needs this stage's e-mail for the occasion's `year`: nothing went for that
 * year, or a lower stage did. A year with stage 0 is done: only the code before 0025 (one e-mail, or a
 * reminder made with the gift for that day) writes a year without a stage, and both mean done.
 */
export function needsStage(row: { last_sent_year: number | null; last_stage: number }, year: number, stage: Stage): boolean {
  if (row.last_sent_year === null || row.last_sent_year < year) return true;
  if (row.last_sent_year > year) return false;
  return row.last_stage > 0 && row.last_stage < stage;
}

/** The occasion's weekday in the e-mail's language: "Friday", "viernes". */
export function weekdayName(date: Date, locale: "en" | "es"): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(date);
}

/**
 * When the day is, in words that stay true on a late run: "next Friday" exactly a week away, "this
 * Friday" two to six days away, "tomorrow" the day before.
 */
export function whenWords(daysAway: number, date: Date, locale: "en" | "es"): string {
  if (daysAway <= 1) return locale === "es" ? "mañana" : "tomorrow";
  const weekday = weekdayName(date, locale);
  if (locale === "es") return daysAway >= 7 ? `el ${weekday} que viene` : `este ${weekday}`;
  return daysAway >= 7 ? `next ${weekday}` : `this ${weekday}`;
}

/**
 * The morning job's runs, in UTC hours (vercel.json: "0 7-11 * * *"). Several a morning, so a busy
 * day's e-mails that one run's time can't hold go on a later run the same day: the claim makes the
 * extra runs safe. tests/unit/reminders.test.ts holds this to vercel.json.
 */
export const REMINDER_RUN_HOURS = { first: 7, last: 11 } as const;

/** A day saved, with what already went for it (GET /api/reminders): nothing, or a year and its stage. */
export type SavedDay = MonthDay & { sentYear?: number | null; sentStage?: number | null };

/**
 * The day the first e-mail of a saved set will come, for the card's "Your first email comes on…".
 * It asks the job itself (dueStages, needsStage) day by day from the first run still to come: today's
 * while the morning's last run is ahead, otherwise tomorrow's. So a day saved too late for this year's
 * e-mails (tomorrow, after the morning) answers with next year's first one, and a day done for its
 * year (saved with the gift made for it, or its e-mails already gone) too. Null for none.
 */
export function firstEmailDate(saved: SavedDay[], now: Date): Date | null {
  const days = saved.filter(isRealDay);
  if (days.length === 0) return null;
  // Before the last run's hour, that run still reads the rows saved now.
  const start = addDays(utcDay(now), now.getUTCHours() < REMINDER_RUN_HOURS.last ? 0 : 1);
  // Two years and a week cover a day just missed and done for next year as well.
  for (let ahead = 0; ahead <= 2 * 366 + STAGE_DAYS[1]; ahead++) {
    const run = addDays(start, ahead);
    for (const { stage, due } of dueStages(run)) {
      const hit = days.some((d) => d.month === due.month && due.days.includes(d.day) && needsStage({ last_sent_year: d.sentYear ?? null, last_stage: d.sentStage ?? 0 }, due.year, stage));
      if (hit) return run;
    }
  }
  return null;
}

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

/**
 * When an e-mail comes ("17 November", "17 November 2027"): the year only when it isn't this one, so a
 * day done for this year never reads as a day just gone or as today.
 */
export function formatEmailDate(at: Date, now: Date, locale: "en" | "es"): string {
  const day = formatMonthDay({ month: at.getUTCMonth() + 1, day: at.getUTCDate() }, locale);
  const year = at.getUTCFullYear();
  if (year === now.getUTCFullYear()) return day;
  return locale === "es" ? `${day} de ${year}` : `${day} ${year}`;
}

/** A reminder as the API returns it. */
export type Reminder = {
  id: string;
  recipientName: string;
  occasion: ReminderOccasion;
  month: number;
  day: number;
  locale: "en" | "es";
  templateSlug: string | null;
  /** The occasion's year the last e-mail went for (or the gift was made for), and which of its three; absent where not read. */
  sentYear?: number | null;
  sentStage?: number;
};
