import type { SavedDateSummary } from "@/lib/saved-dates/types";
import { addDays, fromYmd, isYmd, weekdayOf, type Ymd } from "./calendar";
import { ideaById, plannedIdea } from "./ideas";
import { stopName, type Plan } from "./plan";

/*
 * The dates a person has done (BRIEF-dates2.md 4): marked on /plan, kept as a short log in the
 * browser (an account's come back from its saved dates, Plan.done). Text only: a day, a title, a
 * town, and the places it was a vote on. Pure: no storage, no clock (the caller says what today is).
 */

export type DoneDate = {
  /** The day and the stops: the same date marked twice is one entry. */
  id: string;
  day: Ymd;
  title: string;
  where?: string;
  idea?: string;
  /** Each stop's place id ("node/123"): what "Was this a good date?" is a vote on. */
  places: string[];
  /** The saved date's id, when it came from an account's saved dates or was saved as one. */
  saved?: string;
};

export const DONE_KEY = "ethos.dates.done.v1";
export const MAX_DONE = 200;
/** The hand-over line to a gift shows from this many done dates. */
export const GIFT_FROM = 3;
export const TIMELINE_SLUG = "our-timeline";
/** The timeline template's own limits (src/templates/our-timeline/schema.ts). */
const LABELS_MAX = 20;
const LABEL_MAX = 40;

const PLACE_ID = /^(node|way|relation)\/\d{1,15}$/;
const MAX_PLACES = 8;
const TITLE_MAX = 120;

/** A plan marked done today: its own day when that has come, else today. */
export function doneFromPlan(plan: Plan, today: Ymd, locale: "en" | "es", saved?: string): DoneDate {
  const day = plan.date && isYmd(plan.date) && plan.date <= today ? plan.date : today;
  const named = plan.stops.find((s) => s.named !== false);
  const title = plannedIdea(plan)?.title[locale] ?? named?.name ?? (plan.stops[0] ? stopName(plan.stops[0], locale) : "");
  return {
    id: `${day}:${plan.stops.map((s) => s.id).join(",")}`.slice(0, 200),
    day,
    title: title.slice(0, TITLE_MAX),
    ...(plan.where ? { where: plan.where } : {}),
    ...(plan.idea ? { idea: plan.idea } : {}),
    places: plan.stops.map((s) => s.id).filter((id) => PLACE_ID.test(id)).slice(0, MAX_PLACES),
    ...(saved ? { saved } : {}),
  };
}

const newestFirst = (a: DoneDate, b: DoneDate): number => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0);

/** The log with one more: the same id replaces, newest day first, at most MAX_DONE. */
export function addDone(list: readonly DoneDate[], entry: DoneDate): DoneDate[] {
  return [entry, ...list.filter((d) => d.id !== entry.id)].sort(newestFirst).slice(0, MAX_DONE);
}

export const removeDone = (list: readonly DoneDate[], id: string): DoneDate[] => list.filter((d) => d.id !== id);

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

/** The kept log, checked entry by entry: a bad entry is dropped, the rest kept. */
export function readDone(raw: string | null): DoneDate[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const out: DoneDate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (!str(e.id, 200) || !isYmd(e.day) || typeof e.title !== "string" || e.title.length > TITLE_MAX) continue;
    if (!Array.isArray(e.places) || e.places.length > MAX_PLACES || !e.places.every((p) => typeof p === "string" && PLACE_ID.test(p))) continue;
    if (e.where !== undefined && !str(e.where, 80)) continue;
    if (e.idea !== undefined && !str(e.idea, 40)) continue;
    if (e.saved !== undefined && !str(e.saved, 64)) continue;
    out.push({ id: e.id, day: e.day, title: e.title, places: e.places as string[], ...(e.where ? { where: e.where as string } : {}), ...(e.idea ? { idea: e.idea as string } : {}), ...(e.saved ? { saved: e.saved as string } : {}) });
  }
  return out.sort(newestFirst).slice(0, MAX_DONE);
}

/** An account's done dates, from its saved dates' list (another device marked them). */
export function doneFromSaved(items: readonly SavedDateSummary[], locale: "en" | "es"): DoneDate[] {
  return items
    .filter((s) => s.kind === "date" && s.done && isYmd(s.done))
    .map((s) => ({
      id: `saved:${s.id}`,
      day: s.done!,
      title: (s.title || (s.ideaId ? ideaById(s.ideaId)?.title[locale] : undefined) || s.cover?.name || "").slice(0, TITLE_MAX),
      ...(s.city ? { where: s.city } : {}),
      ...(s.ideaId ? { idea: s.ideaId } : {}),
      places: [],
      saved: s.id,
    }));
}

/** This browser's log and the account's, as one: one entry per date, newest first. */
export function mergeDone(local: readonly DoneDate[], account: readonly DoneDate[]): DoneDate[] {
  const out = [...local];
  for (const a of account) {
    const saved = out.findIndex((l) => l.saved !== undefined && l.saved === a.saved);
    // The account's row is the saved date as it stands now: its day wins. The places stay (only this browser has them).
    if (saved !== -1) out[saved] = { ...out[saved], day: a.day, title: a.title || out[saved].title, ...(a.where ? { where: a.where } : {}) };
    // The same day and title is the same date: the local one is kept, it has the places.
    else if (!out.some((l) => l.day === a.day && l.title === a.title)) out.push(a);
  }
  return out.sort(newestFirst).slice(0, MAX_DONE);
}

export type DoneCount = { kind: "weeks"; n: number } | { kind: "year"; n: number } | null;

/** The Monday of a day's week. */
const mondayOf = (day: Ymd): Ymd => addDays(day, -((weekdayOf(day) + 6) % 7));

/**
 * The one honest count over the log. The log knows days, not weekends, so it counts weeks (Monday to
 * Sunday): how many in a row hold a done date, back from this week, or from last week when this week
 * has none yet. Shown from two. Otherwise the done dates in today's calendar year, from one.
 * Otherwise nothing. Days only: never a clock.
 */
export function doneCount(list: readonly DoneDate[], today: Ymd): DoneCount {
  const weeks = new Set(list.filter((d) => d.day <= today).map((d) => mondayOf(d.day)));
  let week = mondayOf(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let n = 0;
  while (weeks.has(week)) {
    n += 1;
    week = addDays(week, -7);
  }
  if (n >= 2) return { kind: "weeks", n };
  const year = today.slice(0, 4);
  const thisYear = list.filter((d) => d.day.slice(0, 4) === year && d.day <= today).length;
  return thisYear >= 1 ? { kind: "year", n: thisYear } : null;
}

/** As many whole words of a title as fit in `room` characters. */
function wordsThatFit(title: string, room: number): string {
  let out = "";
  for (const word of title.split(/\s+/).filter(Boolean)) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > room) break;
    out = next;
  }
  return out;
}

/** The log as the timeline gift's milestone labels: oldest first, at most twenty, each at most forty characters, never cut mid-word. */
export function timelineLabels(list: readonly DoneDate[], locale: "en" | "es"): string[] {
  return [...list]
    .sort((a, b) => -newestFirst(a, b))
    .slice(-LABELS_MAX)
    .map((d) => {
      const date = fromYmd(d.day)!.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
      const words = wordsThatFit(d.title, LABEL_MAX - date.length - 3);
      return (words ? `${date} · ${words}` : date).slice(0, LABEL_MAX);
    });
}
