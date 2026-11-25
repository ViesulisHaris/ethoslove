import type { Ymd } from "./calendar";
import { fitsKind, KIND_MAX_BUDGET, type DateKind } from "./date-kinds";
import { canBeFree, forTheDay, IDEAS, isDoable, underARoof, type DateIdea, type Vibe } from "./ideas";
import { stopOf, type Plan } from "./plan";
import type { Place } from "./places";
import { suggestTimes } from "./timing";
import { isWet, type DayWeather, type Forecast } from "./weather";
import { clipName } from "./where-store";

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
  /** The page's own kind: a page by kind plans only from its own ideas, never from outside them. */
  kind?: DateKind;
  /** Minutes after midnight, by the place's own clock, before which nothing can start. Set only for a date today. */
  startMin?: number;
  /** The person's own choice of indoors or outdoors. Absent: either, and the weather decides. Never relaxed. */
  setting?: TonightSetting;
};
/** Indoors or outdoors, chosen in the planner's sentence (BRIEF-dates2.md 2). */
export type TonightSetting = "indoors" | "outdoors";
export type Relaxed = "length" | "budget" | "vibe";
export type TonightPick = {
  /** The idea as it is planned that day: its rain stops on a wet one, no café after nine (forTonight). */
  idea: DateIdea;
  relaxed: Relaxed[];
  /**
   * The relaxed wishes that no pick in the list meets: only these may be said as "Nothing free fits".
   * A wish another pick meets (the free ideas came first, "Another" reached the paid ones) is said
   * as what this one costs or takes, never as nothing fitting.
   */
  noneMeet: Relaxed[];
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

/**
 * The minute before which nothing can start, for the day being planned. "Tonight" is the evening:
 * half an hour from now and never before five. Any other choice that lands on today ("this
 * weekend" on a Saturday) is the rest of the day, from half an hour from now. Another day is open.
 */
export function startFor(tonight: boolean, date: Ymd, now: { date: Ymd; minutes: number }): number | undefined {
  if (tonight) return tonightStart(now.minutes);
  return date === now.date ? Math.ceil((now.minutes + 30) / 15) * 15 : undefined;
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
  const sunset = day ? minutesOf(day.sunset) : null;
  // An idea's own evening window counts only when its light can be checked, if it needs light.
  const own = idea.latestStart && (!idea.needsDry || sunset !== null) ? minutesOf(idea.latestStart) : null;
  const latest = own ?? LATEST[idea.moment];
  if (latest === undefined || startMin > latest) return null;
  if (idea.moment === "day" && idea.needsDry && sunset !== null && startMin + idea.minutes > sunset) return null;
  return startMin - natural;
}

/** The idea's own times, each moved `shift` minutes later. */
export function tonightTimes(idea: DateIdea, day: DayWeather | undefined, shift: number): string[] {
  const times = suggestTimes(idea, day);
  if (shift === 0) return times;
  return times.map((t) => clock((minutesOf(t) ?? 0) + shift));
}

/** Past this a café is usually shut (21:00); the small hours count as late too. */
const LATE_CAFE_MIN = 21 * 60;
const isLate = (hhmm: string): boolean => {
  const m = minutesOf(hhmm);
  return m !== null && (m >= LATE_CAFE_MIN || m < 5 * 60);
};

/**
 * The idea with its stops as they can be had at their times: a stop timed at nine or later does not
 * send them to a café when it lists something else (the stars at 22:00 end at a bar or a dessert
 * place, not a café that shut at six). A stop that is only a café keeps it.
 */
export function forTonight(idea: DateIdea, times: readonly string[]): DateIdea {
  let changed = false;
  const stops = idea.stops.map((kinds, i) => {
    if (!times[i] || !isLate(times[i]) || !kinds.includes("cafe") || kinds.length === 1) return kinds;
    changed = true;
    return kinds.filter((k) => k !== "cafe");
  });
  return changed ? { ...idea, stops } : idea;
}

/** A bar that says "sports" in its name: big screens and a match on. */
export const isSportsBar = (place: Pick<Place, "kind" | "name">): boolean => place.kind === "bar" && /\bsports?\b/i.test(place.name);

/** A bar whose name says it has karaoke ("Karaoke Bar Soho", "Sing Sing", a noraebang, a KTV). */
export const isKaraokeBar = (place: Pick<Place, "kind" | "name">): boolean => place.kind === "bar" && /karaoke|\bsing\b|noraebang|\bk-?tv\b/i.test(place.name);

/**
 * The places an idea may be planned with. A sports bar suits a playful idea's drink after (the
 * bowling, the arcade); it never follows the theatre or a museum. Where a bar stands in for the
 * place an idea starts at (the karaoke booth), only a bar that says it has karaoke may: a plain
 * pub planned as "one duet, no backing out" sends them somewhere with no microphone.
 */
export function placesFor(idea: DateIdea, places: Place[]): Place[] {
  const barStandsIn = (idea.stops[0] ?? []).indexOf("bar") > 0;
  if (barStandsIn) return places.filter((p) => p.kind !== "bar" || isKaraokeBar(p));
  if (idea.vibes.includes("playful")) return places;
  return places.some(isSportsBar) ? places.filter((p) => !isSportsBar(p)) : places;
}

/**
 * Every idea that can be done there that day from that hour, best first. The weather, the hour and
 * what is nearby are never given up, nor the page's kind: a page by kind plans only its own ideas
 * (an empty list then says none of them can be done, and the planner offers tomorrow), nor its
 * ceiling on cost (KIND_MAX_BUDGET). The wishes are, one at a time and the lightest first: the
 * length, then the budget a step at a time, then the mood. Each pick says which wishes it gave up.
 * An empty list is an answer.
 */
export function rankTonight(wish: TonightWish, context: TonightContext): TonightPick[] {
  const { day, places, boost } = context;
  const wet = day ? isWet(day) : false;
  const ideas = context.ideas ?? IDEAS;
  const ranked: { pick: TonightPick; weight: number; score: number; index: number }[] = [];
  const kindMax = wish.kind ? KIND_MAX_BUDGET[wish.kind] : undefined;
  ideas.forEach((written, index) => {
    if (wish.kind && !fitsKind(written, wish.kind)) return;
    let forDay: DateIdea;
    if (wish.setting === "indoors") {
      // Under a roof whatever the sky: the stars under a dome, the dinner with its rain stops.
      const roofed = underARoof(written);
      if (!roofed) return;
      forDay = roofed;
    } else if (wish.setting === "outdoors") {
      // Their own choice wins over the forecast: the dry stops are planned, rain or not.
      if (written.goodInRain) return;
      forDay = written;
    } else {
      // On a wet day an idea with rain stops is planned with them (the stars under a dome).
      forDay = forTheDay(written, day);
      if (wet && forDay.needsDry) return;
    }
    if (kindMax !== undefined && forDay.budget > Math.max(kindMax, wish.budget ?? kindMax)) return;
    const shift = tonightShift(forDay, day, wish.startMin);
    if (shift === null) return;
    const idea = forTonight(forDay, tonightTimes(forDay, day, shift));
    if (!isDoable(idea, placesFor(idea, places))) return;
    const relaxed: Relaxed[] = [];
    let weight = 0;
    if (wish.length && !lengthFits(idea.minutes, wish.length)) {
      relaxed.push("length");
      weight += 1;
    }
    // "Free" takes the ideas that can be done for nothing, bringing your own (the result says how).
    const cost = wish.budget === 0 && canBeFree(idea) ? 0 : idea.budget;
    if (wish.budget !== undefined && cost > wish.budget) {
      relaxed.push("budget");
      weight += 2 * (cost - wish.budget);
    }
    if (wish.vibe && !idea.vibes.includes(wish.vibe)) {
      relaxed.push("vibe");
      weight += 8;
    }
    const score = (wet && idea.goodInRain ? 2 : 0) + (wish.startMin !== undefined && shift === 0 ? 1 : 0) + (boost?.[idea.id] ?? 0);
    ranked.push({ pick: { idea, relaxed, noneMeet: [], shift }, weight, score, index });
  });
  const picks = ranked.sort((a, b) => a.weight - b.weight || b.score - a.score || a.index - b.index).map((r) => r.pick);
  // A wish some pick keeps is met here; "nothing fits" is said only of the wishes none keeps.
  const metBySome = (wish: Relaxed): boolean => picks.some((p) => !p.relaxed.includes(wish));
  for (const p of picks) p.noneMeet = p.relaxed.filter((wish) => !metBySome(wish));
  return picks;
}

/** The plan "Open the plan" writes: what adding the idea by hand writes for an empty plan. */
export function tonightPlan(idea: DateIdea, stops: readonly (Place | null)[], times: readonly string[], stamp: { date: Ymd; where?: string }): Plan {
  return {
    v: 1,
    date: stamp.date,
    ...(stamp.where ? { where: clipName(stamp.where) } : {}),
    idea: idea.id,
    stops: stops.flatMap((place, i) => (place ? [stopOf(place, times[i])] : [])),
  };
}
