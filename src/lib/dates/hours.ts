/**
 * Reads the everyday subset of OpenStreetMap's `opening_hours`: "Mo-Fr 09:00-18:00; Sa 10:00-16:00",
 * "Mo-Sa 12:00-16:00,19:00-24:00", "Tu-Su 18:00-02:00", "24/7", "Su off". That covers most cafés and
 * restaurants. The full grammar also has months, week numbers, sunrise and school holidays; when a
 * string uses any of it this says it does not know, rather than telling a couple a place is open
 * on the night they turn up and it is not.
 */
export type DayHours = { known: false } | { known: true; ranges: [number, number][] };

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const DAY_INDEX: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const UNKNOWN: DayHours = { known: false };

const TIME = /^(\d{1,2}):(\d{2})$/;
const minutes = (text: string): number | null => {
  const m = TIME.exec(text);
  if (!m) return null;
  const value = Number(m[1]) * 60 + Number(m[2]);
  return value >= 0 && value <= 24 * 60 ? value : null;
};

/** The weekdays a selector names ("Mo-Fr,Su"), or null if it is not only weekdays. Public holidays are skipped. */
function daysOf(selector: string): number[] | null {
  const days = new Set<number>();
  for (const part of selector.split(",")) {
    const piece = part.trim();
    if (piece === "PH" || piece === "SH") continue;
    const [from, to, extra] = piece.split("-");
    if (extra !== undefined || !(from in DAY_INDEX)) return null;
    if (to === undefined) {
      days.add(DAY_INDEX[from]);
      continue;
    }
    if (!(to in DAY_INDEX)) return null;
    // A range can wrap the week: "Fr-Mo" is Friday, Saturday, Sunday, Monday.
    for (let d = DAY_INDEX[from]; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === DAY_INDEX[to]) break;
    }
  }
  return [...days];
}

function rangesOf(text: string): [number, number][] | null {
  const ranges: [number, number][] = [];
  for (const part of text.split(",")) {
    const [a, b, extra] = part.trim().split("-");
    if (extra !== undefined || b === undefined) return null;
    const start = minutes(a);
    const end = minutes(b);
    if (start === null || end === null) return null;
    // Closing after midnight: 18:00-02:00 runs to 26:00 of the day it started.
    ranges.push([start, end <= start ? end + 24 * 60 : end]);
  }
  return ranges;
}

/** When a place is open on a weekday (0 is Sunday), as minutes from that day's midnight. */
export function hoursOn(raw: string | undefined, weekday: number): DayHours {
  if (!raw) return UNKNOWN;
  const text = raw.trim();
  if (text === "24/7") return { known: true, ranges: [[0, 24 * 60]] };
  let result: DayHours = { known: true, ranges: [] };
  let matched = false;
  // Whether any rule named a weekday at all. "PH off" (shut on public holidays) names none, and
  // says nothing about a Saturday: read as "no rule for this day", it closed the place all week.
  let namedDays = false;
  for (const ruleText of text.split(";")) {
    const rule = ruleText.trim();
    if (!rule) continue;
    // "Mo-Fr 09:00-18:00": days, a space, then times. "09:00-18:00" alone means every day.
    const space = rule.indexOf(" ");
    const head = space === -1 ? rule : rule.slice(0, space);
    const startsWithDay = head.slice(0, 2) in DAY_INDEX || head.startsWith("PH") || head.startsWith("SH");
    const selector = startsWithDay ? head : "";
    const rest = startsWithDay ? rule.slice(head.length).trim() : rule;
    const days = selector ? daysOf(selector) : [0, 1, 2, 3, 4, 5, 6];
    if (days === null) return UNKNOWN;
    if (days.length > 0) namedDays = true;
    if (rest === "off" || rest === "closed") {
      if (days.includes(weekday)) {
        result = { known: true, ranges: [] };
        matched = true;
      }
      continue;
    }
    const ranges = rangesOf(rest);
    if (ranges === null) return UNKNOWN;
    // A later rule for the same day replaces an earlier one, as the specification has it.
    if (days.includes(weekday)) {
      result = { known: true, ranges };
      matched = true;
    }
  }
  // Rules that never mention this weekday mean it is shut ("Mo-Fr …" on a Sunday).
  if (matched) return result;
  return namedDays ? { known: true, ranges: [] } : UNKNOWN;
}

export function isOpenAt(hours: DayHours, minuteOfDay: number): boolean | null {
  if (!hours.known) return null;
  return hours.ranges.some(([a, b]) => minuteOfDay >= a && minuteOfDay < b);
}

const clock = (m: number): string => {
  const t = m % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** "12:00–16:00, 19:00–00:00" */
export function formatHours(hours: DayHours): string | null {
  if (!hours.known || hours.ranges.length === 0) return null;
  if (hours.ranges.length === 1 && hours.ranges[0][0] === 0 && hours.ranges[0][1] === 24 * 60) return "24h";
  return hours.ranges.map(([a, b]) => `${clock(a)}–${clock(b)}`).join(", ");
}

/** The latest a place stays open that day, in minutes from midnight, or null. */
export function closesAt(hours: DayHours): number | null {
  if (!hours.known || hours.ranges.length === 0) return null;
  return Math.max(...hours.ranges.map(([, b]) => b));
}

export { DAYS };
