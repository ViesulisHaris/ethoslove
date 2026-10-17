import { isYmd, type Ymd } from "@/lib/dates/calendar";
import { addMonths, formatShort, monthOf, monthsApart, type Month } from "@/lib/dates/range";

/**
 * A single day on the calendar card: which month it opens on, how far it turns, and how the field
 * names the day. Plain "YYYY-MM-DD" strings compared as strings, as lib/dates/range does, so no
 * clock or zone can move a day. A picker with no minimum or maximum still needs ends for the
 * keyboard to stop at; these are far enough away never to be met.
 */
export const FAR_PAST: Ymd = "1900-01-01";
export const FAR_FUTURE: Ymd = "2999-12-31";

/** The month the card opens on: the day chosen, or today, kept between the ends. */
export function openingMonth(
  value: Ymd | "",
  today: Ymd,
  min: Ymd = FAR_PAST,
  max: Ymd = FAR_FUTURE,
): Month {
  const wanted = value && isYmd(value) ? value : today;
  return monthOf(wanted < min ? min : wanted > max ? max : wanted);
}

/** Whether the card can turn a page from `month` in `step`'s direction without leaving the ends. */
export function canTurn(
  month: Month,
  step: -1 | 1,
  min: Ymd = FAR_PAST,
  max: Ymd = FAR_FUTURE,
): boolean {
  const to = addMonths(month, step);
  return step < 0 ? monthsApart(monthOf(min), to) >= 0 : monthsApart(to, monthOf(max)) >= 0;
}

/** The day that takes the Tab key in a month: the one chosen, today, or the first that can be picked. */
export function focusDay(
  month: Month,
  value: Ymd | "",
  today: Ymd,
  min: Ymd = FAR_PAST,
  max: Ymd = FAR_FUTURE,
): Ymd {
  const key = `${month.y}-${String(month.m + 1).padStart(2, "0")}`;
  const inMonth = (d: Ymd | "") => Boolean(d) && d.slice(0, 7) === key && d >= min && d <= max;
  if (inMonth(value)) return value;
  if (inMonth(today)) return today;
  const first = `${key}-01`;
  return first < min ? min : first;
}

/** "Sat 14 Jun 2026", "sáb 14 jun 2026": a day as the field shows it, the year always there. */
export const formatDayField = (day: Ymd, locale: "en" | "es"): string =>
  `${formatShort(day, locale)} ${day.slice(0, 4)}`;
