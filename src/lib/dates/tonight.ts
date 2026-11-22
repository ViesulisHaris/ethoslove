import type { Ymd } from "./calendar";
import { fitsKind, type DateKind } from "./date-kinds";
import { IDEAS, isDoable, type DateIdea, type Vibe } from "./ideas";
import { stopOf, type Plan } from "./plan";
import type { Place } from "./places";
import { suggestTimes } from "./timing";
import { isWet, type DayWeather, type Forecast } from "./weather";

/**
 * "Plan our date tonight" in one step: which idea fits the wishes, the weather and the hour best.
 * Pure: the clock, the forecast and the places are all handed in, so the same answer comes back
 * for the same question (tests/unit/dates-tonight.test.ts).
 */

export type TonightLength = "short" | "medium" | "long";
export type TonightWish = {
  vibe?: Vibe;
  /** A ceiling on the ideas' own scale: 0 free, 1 a coffee each, 2 dinner, 3 a treat. */
  budget?: 0 | 1 | 2 | 3;
  length?: TonightLength;
  /** The page's own kind (a kind page plans only from its ideas, while one of them can be done). */
  kind?: DateKind;
  /** Minutes after midnight, by the place's own clock, before which nothing can start. Set only for a date today. */
  startMin?: number;
};
export type Relaxed = "length" | "budget" | "vibe" | "kind";
export type TonightPick = {
  idea: DateIdea;
  relaxed: Relaxed[];
  /** Minutes every stop is moved later than the idea's own hour. */
  shift: number;
};
export type TonightContext = {
  day?: DayWeather;
  places: Place[];
  /** A city's own standing for each idea id (cityIdeaScore): breaks ties. */
  boost?: Readonly<Record<string, number>>;
  ideas?: readonly DateIdea[];
};

/** The moods the planner offers: the vibes, without the two the budget and the forecast already say. */
export const TONIGHT_VIBES: Vibe[] = ["cozy", "playful", "outdoorsy", "foodie", "artsy", "fancy"];
/** Tonight's first stop is never before this, whatever the hour (17:00). */
export const TONIGHT_FROM_MIN = 17 * 60;
/** Past this there is no tonight left to plan (23:00). */
export const TONIGHT_ENDS_MIN = 23 * 60;

const minutesOf = (hhmm: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const pad = (n: number): string => String(n).padStart(2, "0");
const clock = (minutes: number): string => {
  const t = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

/** Up to two hours; two to three; three and more. */
export const lengthFits = (minutes: number, length: TonightLength): boolean =>
  length === "short" ? minutes <= 120 : length === "medium" ? minutes >= 120 && minutes <= 180 : minutes >= 180;

/** Half an hour from now, on the quarter hour, and never before five in the evening. */
export function tonightStart(nowMin: number): number {
  return Math.max(TONIGHT_FROM_MIN, Math.ceil((nowMin + 30) / 15) * 15);
}

/** Today's date and the minute of the day at the place: its forecast knows its clock; without one, the browser's. */
export function placeNow(forecast: Pick<Forecast, "utcOffsetSeconds"> | null | undefined, nowMs: number): { date: Ymd; minutes: number } {
  if (forecast) {
    const d = new Date(nowMs + forecast.utcOffsetSeconds * 1000);
    return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  const d = new Date(nowMs);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, minutes: d.getHours() * 60 + d.getMinutes() };
}

/** The latest an idea of each moment can still start, when it is moved later than its own hour. */
const LATEST: Partial<Record<DateIdea["moment"], number>> = { day: 15 * 60 + 30, evening: 21 * 60, night: 23 * 60 };

/**
 * How many minutes later than its own hour an idea has to start so nothing is before `startMin`,
 * or null when it cannot be done from then: its light has gone, or its time of day has.
 */
export function tonightShift(idea: DateIdea, day: DayWeather | undefined, startMin: number | undefined): number | null {
  const natural = minutesOf(suggestTimes(idea, day)[0]) ?? 0;
  if (startMin === undefined || startMin <= natural) return 0;
  if (idea.moment === "sunset" || idea.moment === "morning") return null;
  const latest = LATEST[idea.moment];
  if (latest === undefined || startMin > latest) return null;
  const sunset = day ? minutesOf(day.sunset) : null;
  if (idea.moment === "day" && idea.needsDry && sunset !== null && startMin + idea.minutes > sunset) return null;
  return startMin - natural;
}

/** The idea's own times, each moved `shift` minutes later. */
export function tonightTimes(idea: DateIdea, day: DayWeather | undefined, shift: number): string[] {
  const times = suggestTimes(idea, day);
  if (shift === 0) return times;
  return times.map((t) => clock((minutesOf(t) ?? 0) + shift));
}

/**
 * Every idea that can be done there that day from that hour, best first. The weather, the hour and
 * what is nearby are never given up; the wishes are, one at a time and the lightest first: the
 * length, then the budget a step at a time, then the mood, and the page's kind only when none of its
 * ideas can be done at all. Each pick says which wishes it gave up. An empty list is an answer.
 */
export function rankTonight(wish: TonightWish, context: TonightContext): TonightPick[] {
  const { day, places, boost } = context;
  const wet = day ? isWet(day) : false;
  const ideas = context.ideas ?? IDEAS;
  const ranked: { pick: TonightPick; weight: number; score: number; index: number }[] = [];
  ideas.forEach((idea, index) => {
    if ((wet && idea.needsDry) || !isDoable(idea, places)) return;
    const shift = tonightShift(idea, day, wish.startMin);
    if (shift === null) return;
    const relaxed: Relaxed[] = [];
    let weight = 0;
    if (wish.length && !lengthFits(idea.minutes, wish.length)) {
      relaxed.push("length");
      weight += 1;
    }
    if (wish.budget !== undefined && idea.budget > wish.budget) {
      relaxed.push("budget");
      weight += 2 * (idea.budget - wish.budget);
    }
    if (wish.vibe && !idea.vibes.includes(wish.vibe)) {
      relaxed.push("vibe");
      weight += 8;
    }
    if (wish.kind && !fitsKind(idea, wish.kind)) {
      relaxed.push("kind");
      weight += 16;
    }
    const score = (wet && idea.goodInRain ? 2 : 0) + (wish.startMin !== undefined && shift === 0 ? 1 : 0) + (boost?.[idea.id] ?? 0);
    ranked.push({ pick: { idea, relaxed, shift }, weight, score, index });
  });
  return ranked.sort((a, b) => a.weight - b.weight || b.score - a.score || a.index - b.index).map((r) => r.pick);
}

/** The plan "Open the plan" writes: what adding the idea by hand writes for an empty plan. */
export function tonightPlan(idea: DateIdea, stops: readonly (Place | null)[], times: readonly string[], stamp: { date: Ymd; where?: string }): Plan {
  return {
    v: 1,
    date: stamp.date,
    ...(stamp.where ? { where: stamp.where.slice(0, 80) } : {}),
    idea: idea.id,
    stops: stops.flatMap((place, i) => (place ? [stopOf(place, times[i])] : [])),
  };
}
