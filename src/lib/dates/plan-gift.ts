import { formatDay } from "./calendar";
import { stopName, type Plan } from "./plan";

/**
 * The gift a planned date turns into. Paper Crane, not Scratch Card: a seed can only fill a
 * template's own fields, and Scratch Card's one text field (the final card's headline) is sixty
 * characters and is printed on the ticket's cover before anything is scratched, so the plan would
 * be read before it was revealed. Paper Crane says one line per fold, in order, and only as each
 * fold lands: the day first, then the stops as they will happen, then the line left on the table.
 * It needs no photos, so it can be sent as it comes.
 */
export const PLAN_GIFT_SLUG = "paper-crane";

/**
 * Paper Crane's limits (its schema.ts); the unit test parses the result with the real schema and
 * checks these against it. Copied, not imported: that schema is zod, and this file is in the
 * browser on /plan, where importing two numbers from it brought 85 KB (gzipped) of zod along.
 */
const LINE_MAX = 72;
const CLOSING_MAX = 90;
export const MIN_LINES = 3;
export const MAX_LINES = 6;

const WORDS = {
  en: { someday: "One day soon. I'll tell you which.", at: "at", fillers: ["I've planned all of it.", "The rest is a surprise."], closing: "It's a date." },
  es: { someday: "Un día de estos. Ya te diré cuál.", at: "a las", fillers: ["Lo tengo todo planeado.", "Lo demás es sorpresa."], closing: "Tenemos una cita." },
} as const;

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
const capital = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/**
 * Paper Crane's fields for a plan, in the gift's language: the day, then "1. Café Tal at 18:00"
 * for each stop. Six folds is all the paper there is, so stops past the fifth share the last line.
 * The crane needs three folds to fly, so a plan of one stop gets a line of promise between the
 * day and the stop. Their note to the other person is the closing line when it fits in one.
 */
export function planGiftFields(plan: Plan, locale: "en" | "es"): { lines: string[]; closing: string } {
  const w = WORDS[locale];
  const day = plan.date ? `${capital(formatDay(plan.date, locale))}.` : w.someday;
  const stops = plan.stops.map((s, i) => `${i + 1}. ${stopName(s, locale).trim()}${s.time ? ` ${w.at} ${s.time}` : ""}`);
  const room = MAX_LINES - 1;
  const stopLines = stops.length > room ? [...stops.slice(0, room - 1), stops.slice(room - 1).join(", ")] : stops;
  const fillers = w.fillers.slice(0, Math.max(0, MIN_LINES - 1 - stopLines.length));
  const note = plan.note?.trim() ?? "";
  return {
    lines: [day, ...fillers, ...stopLines].map((line) => clip(line, LINE_MAX)),
    closing: note && note.length <= CLOSING_MAX ? note : w.closing,
  };
}
