import { addDays, isYmd, monthGrid, weekdayOf, type Ymd } from "./calendar";

/**
 * A range of days on a calendar, the way the booking sites pick one: the first tap is the start,
 * the second the end, a tap before the start begins again. Pure functions of plain "YYYY-MM-DD"
 * strings, so the picker's state is a string compare away from the finder's URLs and no clock
 * change or time zone can move a day. Dates become Date objects only to be put into words, at
 * noon UTC and read back in UTC, and never leave the function that made them.
 */
export type DateRange = { start: Ymd | ""; end: Ymd | "" };
/** Which end the next tap sets. */
export type RangeEnd = "start" | "end";
export type RangeState = DateRange & { focus: RangeEnd; oneWay: boolean };
/** A calendar month; `m` counts from 0, as Date does. */
export type Month = { y: number; m: number };

/** How far ahead the picker reaches: this month and the eleven after it, about as far as airlines sell. */
export const MONTHS_AHEAD = 12;
const DAY_MS = 86_400_000;
const FRIDAY = 5;
const SATURDAY = 6;
const SUNDAY = 0;
/** Friday to Monday. */
const WEEKEND_NIGHTS = 3;
const WEEK = 7;

const pad = (n: number) => String(n).padStart(2, "0");
const digits = (d: Ymd) => [Number(d.slice(0, 4)), Number(d.slice(5, 7)), Number(d.slice(8, 10))] as const;
const ymd = (y: number, m: number, d: number): Ymd => `${y}-${pad(m + 1)}-${pad(d)}`;
const clamp = (d: Ymd, min: Ymd, max: Ymd): Ymd => (d < min ? min : d > max ? max : d);

export const monthOf = (d: Ymd): Month => ({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) - 1 });
export const monthKey = ({ y, m }: Month): string => `${y}-${pad(m + 1)}`;
export function addMonths({ y, m }: Month, n: number): Month {
  const total = y * 12 + m + n;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}
/** How many months `to` is after `from`. */
export const monthsApart = (from: Month, to: Month): number => (to.y - from.y) * 12 + (to.m - from.m);
export const daysIn = ({ y, m }: Month): number => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** The months a picker shows, starting with today's. */
export function monthsFrom(today: Ymd, count = MONTHS_AHEAD): Month[] {
  const first = monthOf(today);
  return Array.from({ length: count }, (_, i) => addMonths(first, i));
}

/** The last day a picker lets them choose: the end of the last month it shows. */
export function lastDay(today: Ymd, count = MONTHS_AHEAD): Ymd {
  const last = addMonths(monthOf(today), count - 1);
  return ymd(last.y, last.m, daysIn(last));
}

/** A month's weeks, Monday first, with blanks before the 1st and after the last so every row has seven cells. */
export function monthWeeks({ y, m }: Month): (Ymd | null)[][] {
  const cells = monthGrid(y, m);
  const weeks: (Ymd | null)[][] = [];
  for (let i = 0; i < cells.length; i += WEEK) weeks.push(cells.slice(i, i + WEEK));
  const last = weeks[weeks.length - 1];
  while (last.length < WEEK) last.push(null);
  return weeks;
}

/** Whole nights from one day to another, counted on the digits in UTC: a night across a clock change is still one. */
export function nightsBetween(from: Ymd, to: Ymd): number {
  const [ay, am, ad] = digits(from);
  const [by, bm, bd] = digits(to);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** A month later or earlier on the same day of the month, or the month's last day when it is shorter (31 Jan → 28 Feb). */
export function shiftMonths(day: Ymd, n: number): Ymd {
  const [y, m, d] = digits(day);
  const to = addMonths({ y, m: m - 1 }, n);
  return ymd(to.y, to.m, Math.min(d, daysIn(to)));
}

/**
 * A tap on a day. One way, it is the only date. Otherwise the start comes first and the end
 * second: a tap on the start's own day makes a same-day return, and a tap before the start while
 * they choose the end is a new, earlier start (a return can't come before it).
 *
 * A new start with an end already chosen keeps that end while it is still after the start, and
 * moves it to keep the trip's length when it isn't (as Google Flights does; the finder's old date
 * boxes did the same). Dropping it instead would quietly turn the search one way for anyone who
 * closes the picker there. Either way the picker then waits on the end, so the next tap sets it.
 * `max` is the last day that can be chosen: an end moved past it is dropped.
 */
export function pickDay(state: RangeState, day: Ymd, max?: Ymd): RangeState {
  if (state.oneWay) return { ...state, start: day, end: "", focus: "start" };
  if (state.focus === "end" && state.start && day >= state.start) return { ...state, end: day, focus: "start" };
  return { ...state, start: day, end: keptEnd(state, day, max), focus: "end" };
}

function keptEnd({ start, end }: DateRange, day: Ymd, max?: Ymd): Ymd | "" {
  if (!end) return "";
  if (end >= day) return end;
  const nights = start && end > start ? nightsBetween(start, end) : 0;
  if (nights <= 0) return "";
  const moved = addDays(day, nights);
  return max && moved > max ? "" : moved;
}

/**
 * One way drops the end. Going back to a return brings back the end it dropped (`dropped`) while
 * that is still on or after the start, as Google Flights does, so a look at one way and back costs
 * nothing; either way the picker then waits on the end.
 */
export function setOneWay(state: RangeState, on: boolean, dropped: Ymd | "" = ""): RangeState {
  if (on) return { ...state, oneWay: true, end: "", focus: "start" };
  const end = state.end || (state.start && dropped && dropped >= state.start ? dropped : "");
  return { ...state, oneWay: false, end, focus: state.start ? "end" : "start" };
}

export const clearRange = (state: RangeState): RangeState => ({ ...state, start: "", end: "", focus: "start" });

/** The end a hover (or the keyboard's focus) would pick, while the picker is waiting for one. */
export function previewEnd(state: RangeState, hovered: Ymd | null): Ymd | null {
  if (state.oneWay || state.focus !== "end" || !state.start || !hovered || hovered < state.start) return null;
  return hovered;
}

export type DayMark = {
  /** The first day of the range, a filled circle. */
  isStart: boolean;
  /** The last, also filled; a hovered end is only outlined. */
  isEnd: boolean;
  /** On the band that joins the two ends, the ends included when they are different days. */
  inRange: boolean;
  /** The range drawn is the hover's, not a chosen one. */
  isPreview: boolean;
};

/** How one day is drawn: the chosen range, or the hovered one in its place while they choose the end. */
export function markDay(day: Ymd, range: DateRange, preview: Ymd | null): DayMark {
  const end = preview ?? range.end;
  const isStart = day === range.start;
  const isEnd = Boolean(end) && day === end;
  const spans = Boolean(range.start && end && end > range.start);
  return { isStart, isEnd, inRange: spans && day >= range.start && day <= end, isPreview: preview !== null };
}

/**
 * The one-tap ranges. "This weekend" is Friday to Monday, or from today when the weekend has
 * started; "next weekend" the Friday to Monday after it; "a week away" is seven nights from the
 * start already chosen, or from this weekend's first day when there isn't one.
 */
export function quickRanges(today: Ymd, start?: Ymd | ""): { thisWeekend: DateRange; nextWeekend: DateRange; weekAway: DateRange } {
  const day = weekdayOf(today);
  const friday = day === SATURDAY || day === SUNDAY ? today : addDays(today, FRIDAY - day);
  const monday = day === SUNDAY ? addDays(today, 1) : day === SATURDAY ? addDays(today, 2) : addDays(friday, WEEKEND_NIGHTS);
  const nextFriday = day === SATURDAY ? addDays(today, 6) : day === SUNDAY ? addDays(today, 5) : addDays(friday, WEEK);
  const from = start && isYmd(start) && start >= today ? start : friday;
  return {
    thisWeekend: { start: friday, end: monday },
    nextWeekend: { start: nextFriday, end: addDays(nextFriday, WEEKEND_NIGHTS) },
    weekAway: { start: from, end: addDays(from, WEEK) },
  };
}

const KEY_DAYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -WEEK, ArrowDown: WEEK };

/**
 * Where a key moves the focus in the calendar grid, as the ARIA date-picker pattern has it:
 * arrows a day or a week, Page Up and Down a month (a year with Shift), Home and End the ends of
 * the week. Kept between `min` and `max`, so the focus never lands on a day that can't be picked.
 * Null for a key the grid doesn't use.
 */
export function moveDay(day: Ymd, key: string, shift: boolean, min: Ymd, max: Ymd): Ymd | null {
  let to: Ymd;
  if (key in KEY_DAYS) to = addDays(day, KEY_DAYS[key]);
  else if (key === "PageUp" || key === "PageDown") to = shiftMonths(day, (key === "PageUp" ? -1 : 1) * (shift ? 12 : 1));
  else if (key === "Home" || key === "End") {
    const fromMonday = (weekdayOf(day) + 6) % 7;
    to = addDays(day, key === "Home" ? -fromMonday : 6 - fromMonday);
  } else return null;
  return clamp(to, min, max);
}

// ——— In words ———

const tag = (locale: "en" | "es") => (locale === "es" ? "es-ES" : "en-GB");
/**
 * One formatter per locale and style, made once: toLocaleDateString builds a new one on every
 * call, and the phone's sheet names ~370 days on each tap. All of them read the date in UTC, from
 * a Date made at noon UTC, so the visitor's zone never comes into it: a formatter made once would
 * otherwise keep the zone it was made in, and name the wrong day after a change of zone.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: "en" | "es", options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = formatters.get(key);
  if (!format) formatters.set(key, (format = new Intl.DateTimeFormat(tag(locale), { ...options, timeZone: "UTC" })));
  return format;
}
const utcNoon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 12));
const noon = (d: Ymd) => {
  const [y, m, day] = digits(d);
  return utcNoon(y, m - 1, day);
};
const upperFirst = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

function dayParts(d: Ymd, locale: "en" | "es") {
  const parts = formatter(locale, { weekday: "short", day: "numeric", month: "short" }).formatToParts(noon(d));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: part("weekday").replace(".", ""), day: part("day"), month: part("month").replace(".", "") };
}

/** "Fri 16 Oct", "vie 16 oct": a date the way a boarding pass has it. */
export function formatShort(d: Ymd, locale: "en" | "es"): string {
  const p = dayParts(d, locale);
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "Friday 16 October 2026", "viernes 16 de octubre de 2026": what a screen reader says for a day. */
export function formatLong(d: Ymd, locale: "en" | "es"): string {
  return formatter(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(noon(d)).replace(",", "");
}

/** "Fri 16 → Mon 19 Oct", or with both months when it crosses one: "Fri 30 Oct → Mon 2 Nov". */
export function formatSpan(start: Ymd, end: Ymd, locale: "en" | "es"): string {
  const a = dayParts(start, locale);
  const b = dayParts(end, locale);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${a.weekday} ${a.day}${sameMonth ? "" : ` ${a.month}`} → ${b.weekday} ${b.day} ${b.month}`;
}

/** A month's heading, name and year apart so the year can sit lighter: { name: "October", year: "2026", full: "October 2026" }. */
export function monthTitle({ y, m }: Month, locale: "en" | "es"): { name: string; year: string; full: string } {
  const date = utcNoon(y, m, 1);
  return {
    name: upperFirst(formatter(locale, { month: "long" }).format(date)),
    year: String(y),
    full: formatter(locale, { month: "long", year: "numeric" }).format(date),
  };
}

/** The days of the week, Monday first: "Mon" … "Sun", "lun" … "dom", or in full. */
export function weekdayNames(locale: "en" | "es", style: "short" | "long" = "short"): string[] {
  const format = formatter(locale, { weekday: style });
  // 1 January 2024 was a Monday.
  return Array.from({ length: WEEK }, (_, i) => format.format(utcNoon(2024, 0, 1 + i)).replace(".", ""));
}
