import { A_LEAP_YEAR, daysInMonth, type MonthDay } from "@/lib/lifecycle/reminders";

/**
 * A day that comes round every year, picked without a year: a month, then a day of it. The days a
 * month offers are counted in a leap year, so 29 February is there to pick (a reminder for it goes
 * out on the 28th in the other years; see lib/lifecycle/reminders).
 */
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** The days the month offers: 1 to 29 for February, 30 or 31 for the rest. */
export const daysFor = (month: number): number => daysInMonth(A_LEAP_YEAR, month);

/** Another month, keeping the day, or the month's last when it is shorter: 31 January → 29 February. */
export function withMonth({ day }: MonthDay, month: number): MonthDay {
  return { month, day: Math.min(day, daysFor(month)) };
}

/** Another day of the same month. */
export const withDay = ({ month }: MonthDay, day: number): MonthDay => ({
  month,
  day: Math.min(Math.max(1, day), daysFor(month)),
});

const tag = (locale: "en" | "es") => (locale === "es" ? "es-ES" : "en-GB");

/** How long a short month name is: three letters, as the card's grid has room for. */
const SHORT = 3;

/**
 * The months by name for the card: "Jan" … "Dec", "Ene" … "Dic", read in UTC so no zone can move
 * them. Short names are cut to three letters: the browsers' own give "Sept" and "sept" beside "Oct".
 */
export function monthNames(locale: "en" | "es", style: "short" | "long" = "short"): string[] {
  const format = new Intl.DateTimeFormat(tag(locale), { month: "long", timeZone: "UTC" });
  return MONTHS.map((m) => {
    const full = format.format(new Date(Date.UTC(A_LEAP_YEAR, m - 1, 1, 12)));
    const name = style === "short" ? full.slice(0, SHORT) : full;
    return name.charAt(0).toLocaleUpperCase(tag(locale)) + name.slice(1);
  });
}
