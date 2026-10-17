/**
 * Dates as the planner handles them: plain YYYY-MM-DD strings, never Date objects across a
 * boundary, so a plan made in Madrid for Saturday is still for Saturday when it is opened in Lima.
 */
export type Ymd = string;

const pad = (n: number) => String(n).padStart(2, "0");
export const toYmd = (d: Date): Ymd => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
/** A local-noon Date for a YMD (noon, so no daylight-saving shift can push it into the day before), or null. */
export function fromYmd(ymd: string): Date | null {
  const m = YMD.exec(ymd);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

export const isYmd = (value: unknown): value is Ymd => typeof value === "string" && fromYmd(value) !== null;

export function addDays(ymd: Ymd, days: number): Ymd {
  const d = fromYmd(ymd)!;
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

export const weekdayOf = (ymd: Ymd): number => fromYmd(ymd)!.getDay();

/** The Saturday of this week, or today if it is already the weekend. */
export function thisWeekend(today: Ymd): Ymd {
  const day = weekdayOf(today);
  if (day === 6 || day === 0) return today;
  return addDays(today, 6 - day);
}

/** The cells of a month's calendar, Monday first: leading nulls, then every day of the month. */
export function monthGrid(year: number, month: number): (Ymd | null)[] {
  const first = new Date(year, month, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)];
}

export function formatDay(ymd: Ymd, locale: "en" | "es", style: "long" | "short" = "long"): string {
  const d = fromYmd(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", style === "long" ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" });
}
