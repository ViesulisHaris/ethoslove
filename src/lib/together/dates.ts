/**
 * The arithmetic behind "How long have we been together?": calendar days, never clock time, so
 * daylight saving and time zones can't move a count. A day is "YYYY-MM-DD"; every sum runs on
 * UTC midnights.
 *
 * Months follow the calendar and land on the same date, or on the last day of a month too short
 * for it (31 January + 1 month = 28 February, or the 29th in a leap year). Anniversaries are 12
 * of those months, so a 29 February couple has theirs on 28 February in common years.
 */

export type Day = { y: number; m: number; d: number };

const MS_PER_DAY = 86_400_000;

export function parseDay(value: string | null | undefined): Day | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function formatDay({ y, m, d }: Day): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function utc({ y, m, d }: Day): number {
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): Day {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** The local calendar day of a moment, as the person's own clock shows it. */
export function localDay(at: Date): Day {
  return { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() };
}

/** Whole days from a to b (negative when b is before a). */
export function daysBetween(a: Day, b: Day): number {
  return Math.round((utc(b) - utc(a)) / MS_PER_DAY);
}

export function addDays(day: Day, n: number): Day {
  return fromUtc(utc(day) + n * MS_PER_DAY);
}

/** The same date n months on, or the last day of that month when it is too short. */
export function addMonths(day: Day, n: number): Day {
  const index = day.y * 12 + (day.m - 1) + n;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return { y, m, d: Math.min(day.d, daysInMonth(y, m)) };
}

export function compareDays(a: Day, b: Day): number {
  return utc(a) - utc(b);
}

/** Whole calendar months from start to day: the most n with addMonths(start, n) not after day. */
export function monthsBetween(start: Day, day: Day): number {
  let n = (day.y - start.y) * 12 + (day.m - start.m);
  while (n > 0 && compareDays(addMonths(start, n), day) > 0) n--;
  while (compareDays(addMonths(start, n + 1), day) <= 0) n++;
  return Math.max(0, n);
}

/** Years, months and days from start to day, the way people say it ("2 years, 3 months and 4 days"). */
export function breakdown(start: Day, day: Day): { years: number; months: number; days: number } {
  const months = monthsBetween(start, day);
  return { years: Math.floor(months / 12), months: months % 12, days: daysBetween(addMonths(start, months), day) };
}

/** The round day counts couples mark. */
export const DAY_MILESTONES = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000] as const;

export type Milestone = { kind: "days" | "months" | "years"; count: number; on: Day };

/**
 * Every milestone from start up to `until`, in date order. `firstDayIsOne` counts the day you got
 * together as day 1, as couples in South Korea do, so each day count lands a day sooner; months and
 * years follow the calendar either way. Months stop at 11: from 12 on they are anniversaries.
 */
export function milestones(start: Day, until: Day, firstDayIsOne = false): Milestone[] {
  const out: Milestone[] = [];
  const shift = firstDayIsOne ? 1 : 0;
  for (const count of DAY_MILESTONES) {
    const on = addDays(start, count - shift);
    if (compareDays(on, until) > 0) break;
    out.push({ kind: "days", count, on });
  }
  for (let count = 1; ; count++) {
    const on = addMonths(start, count);
    if (compareDays(on, until) > 0) break;
    if (count % 12 === 0) out.push({ kind: "years", count: count / 12, on });
    else if (count < 12) out.push({ kind: "months", count, on });
  }
  return out.sort((a, b) => compareDays(a.on, b.on) || (a.kind === "days" ? -1 : 1));
}

/**
 * What comes next and what's behind: the next `ahead` milestones from today (today's own included)
 * and the last `behind` before it. Monthiversaries after the first year show only the next one.
 */
export function timeline(start: Day, today: Day, firstDayIsOne = false, ahead = 5, behind = 3): { next: Milestone[]; past: Milestone[]; nextMonth: Milestone | null } {
  const horizon = addMonths(today, 12 * 30);
  const all = milestones(start, horizon, firstDayIsOne);
  const next = all.filter((x) => compareDays(x.on, today) >= 0).slice(0, ahead);
  const past = all.filter((x) => compareDays(x.on, today) < 0).slice(-behind).reverse();
  // After the first year the monthly dates aren't in the list, but the next one is still worth showing.
  const months = monthsBetween(start, today);
  let nextMonthCount = compareDays(addMonths(start, months), today) === 0 ? months : months + 1;
  if (nextMonthCount < 1) nextMonthCount = 1;
  const nextMonth = nextMonthCount >= 12 && nextMonthCount % 12 !== 0 ? { kind: "months" as const, count: nextMonthCount, on: addMonths(start, nextMonthCount) } : null;
  return { next, past, nextMonth };
}
