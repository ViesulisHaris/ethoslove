import type { GiftCountdown, GiftLocale } from "@/lib/gift/schema";

/** A calendar day, as the date picker writes it: "2026-09-25". */
export type Day = string;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** The day, if it is one: "2026-02-31" is not. */
export function validDay(value: string | undefined | null): Day | null {
  const m = value?.match(DAY);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? m[0] : null;
}

export const localDay = (d: Date): Day => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The day the countdown ends, where it ends: a birthday at 00:00 in Madrid is that day in Madrid. */
export function countdownDay(countdown: GiftCountdown | undefined): Day | null {
  if (!countdown) return null;
  const at = new Date(countdown.targetAt);
  if (Number.isNaN(at.getTime())) return null;
  try {
    // en-CA writes a date as YYYY-MM-DD.
    return validDay(new Intl.DateTimeFormat("en-CA", { timeZone: countdown.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at));
  } catch {
    return null;
  }
}

/** The day printed on the photos: the one the sender chose, else the gift's own day, else today. */
export function stampDay(chosen: string | undefined, countdown: GiftCountdown | undefined, today: Day): Day {
  return validDay(chosen) ?? countdownDay(countdown) ?? today;
}

/**
 * How the camera prints the day in the corner: '26 09 25 in English, the way the Japanese cameras
 * shipped; 25 09 '26 in Spanish, the order they were set to in Spain.
 */
export function stampText(day: Day, locale: GiftLocale): string {
  const [y, m, d] = day.split("-");
  const yy = `'${y.slice(2)}`;
  return locale === "es" ? `${d} ${m} ${yy}` : `${yy} ${m} ${d}`;
}

/** The name the camera gives the photo: IMG_0001.JPG. */
export const fileName = (index: number): string => `IMG_${String(index + 1).padStart(4, "0")}.JPG`;

/** One step along the roll. It stops at either end rather than going round, so the last photo is the last. */
export const stepRoll = (index: number, delta: number, count: number): number => (count <= 0 ? 0 : Math.max(0, Math.min(count - 1, index + delta)));

/** How far through the gift they are on photo `index` of `count`: 20 at the first, 70 at the last. */
export const rollProgress = (index: number, count: number): number => Math.round(20 + (count <= 1 ? 50 : (Math.min(index, count - 1) / (count - 1)) * 50));
