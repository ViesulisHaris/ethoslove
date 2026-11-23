import { SKIP_WINDOW_DAYS, nextOccurrence, occurrenceIn, type MonthDay, type Reminder, type ReminderOccasion } from "./reminders";

/**
 * The two days the "two more gifts" card names after a paid gift ("Nobody likes to be forgotten. You
 * remembered today. Next up: Christmas, in 4 weeks; Valentine's Day, in 12 weeks"). Pure, so the
 * share screen and the gifts page name the same days, and the tests fix the clock.
 */

export type NextDayKind = "christmas" | "valentines" | "birthday" | "anniversary" | "other";

/** `name`: whose day a saved birthday or other day is (the reminder's name); absent for Christmas and Valentine's Day. */
export type NextDay = { kind: NextDayKind; month: number; day: number; daysAway: number; name?: string };

/** A day fewer than this many days away is too close to make a gift for: it is left out. */
export const NEXT_DAY_MIN = 8;

const CHRISTMAS: MonthDay = { month: 12, day: 25 };
const VALENTINES: MonthDay = { month: 2, day: 14 };
const DAY_MS = 86_400_000;

const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const daysBetween = (from: Date, to: Date) => Math.round((utcDay(to) - utcDay(from)) / DAY_MS);

/**
 * When `date` next comes round for this card: its next occurrence, unless that one is the occasion
 * this gift was just made for (the same kind, within the reminder's skip window either side of
 * today), in which case the one after it.
 */
function comingFor(kind: NextDayKind, date: MonthDay, today: Date, made: { kind: NextDayKind } | null): Date {
  const windowStart = new Date(utcDay(today) - SKIP_WINDOW_DAYS * DAY_MS);
  const near = nextOccurrence(date, windowStart);
  const isThisGifts = made?.kind === kind && Math.abs(daysBetween(today, near)) <= SKIP_WINDOW_DAYS;
  if (isThisGifts) return occurrenceIn(near.getUTCFullYear() + 1, date);
  return nextOccurrence(date, today);
}

/**
 * At most two days, soonest first: the days saved for this recipient (`saved`, already only theirs),
 * Christmas and Valentine's Day (once, if it is also saved), each at its next coming. A day fewer than
 * NEXT_DAY_MIN days away is left out, and so is the coming of the occasion this gift was made for
 * (`made`): the card then names the one after it.
 */
export function nextDays(
  today: Date,
  saved: Pick<Reminder, "occasion" | "month" | "day" | "recipientName">[],
  made: { occasion: ReminderOccasion | "christmas" | null; month: number; day: number } | null,
): NextDay[] {
  const madeFor = made?.occasion ? { kind: made.occasion as NextDayKind } : null;
  const candidates: { kind: NextDayKind; date: MonthDay; name?: string }[] = [
    { kind: "christmas", date: CHRISTMAS },
    { kind: "valentines", date: VALENTINES },
    ...saved.filter((r) => r.occasion !== "valentines").map((r) => ({ kind: r.occasion as NextDayKind, date: { month: r.month, day: r.day }, name: r.recipientName })),
  ];
  const seen = new Set<string>();
  const days: NextDay[] = [];
  for (const { kind, date, name } of candidates) {
    const key = `${kind}:${date.month}-${date.day}:${name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const coming = comingFor(kind, date, today, madeFor);
    const daysAway = daysBetween(today, coming);
    if (daysAway < NEXT_DAY_MIN) continue;
    days.push({ kind, month: date.month, day: date.day, daysAway, ...(name ? { name } : {}) });
  }
  return days.sort((a, b) => a.daysAway - b.daysAway).slice(0, 2);
}

export type Distance = { unit: "days" | "weeks" | "months"; count: number };

/** "in 9 days" up to 13, "in 4 weeks" up to 112 days (16 weeks), "in 11 months" beyond. */
export function distance(days: number): Distance {
  if (days <= 13) return { unit: "days", count: days };
  if (days <= 112) return { unit: "weeks", count: Math.round(days / 7) };
  return { unit: "months", count: Math.round(days / 30.4) };
}

/** A message lookup, as next-intl's `t` is on the server and in the browser. */
type Words = (key: string, values?: Record<string, string | number>) => string;

/**
 * A day's name as the reminder card says it ("Mia's birthday", "Your anniversary", "Valentine's
 * Day", "Christmas"), from `pair` (editor.share.pair) and `remind` (lifecycle.remind). `fallback`
 * names the person when the day doesn't (the share screen's recipient).
 */
export function dayName(day: Pick<NextDay, "kind" | "name">, pair: Words, remind: Words, fallback = ""): string {
  if (day.kind === "christmas") return pair("christmas");
  if (day.kind === "valentines") return remind("occasions.valentines");
  if (day.kind === "anniversary") return remind("rows.anniversary");
  const who = (day.name ?? fallback).trim();
  return who ? remind(`rows.${day.kind}`, { name: who }) : remind(`rows.${day.kind}NoName`);
}

/** "in 4 weeks", from editor.share.pair. */
export function dayAway(daysAway: number, pair: Words): string {
  const { unit, count } = distance(daysAway);
  return pair(unit === "days" ? "inDays" : unit === "weeks" ? "inWeeks" : "inMonths", { count });
}

/** The occasion page a day's "Start the … one now" leads to; /templates for a day of another kind. */
export function occasionPath(kind: NextDayKind): string {
  return kind === "other" ? "/templates" : `/occasions/${kind}`;
}

/** The occasion's small rendered picture (public/art/occasions). */
export function occasionIcon(kind: NextDayKind): string {
  return `/art/occasions/${kind === "other" ? "just-because" : kind}.webp`;
}

/**
 * Today as the visitor's calendar has it, at midnight UTC: what nextDays counts from, so a buyer in
 * New York at 11pm isn't told about tomorrow's date.
 */
export function localToday(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
