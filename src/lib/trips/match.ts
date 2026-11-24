import { distanceKm } from "@/lib/dates/geo";
import { findAirport, type Airport } from "./airports";
import { estimateFlight, trainHint } from "./flights";
import type { Trip, TripKind } from "./presets";

/**
 * "Where should we go together?": the twelve preset trips ranked by what two people say they want.
 * Pure: no window, no clock (the month is handed in), and only types from presets.ts, so the
 * browser never gets the trips' long texts. The server hands it the few fields it reads.
 *
 * A wish that nothing meets is let go of rather than leaving them with nothing: the length first,
 * then the budget a step at a time, then the kind of trip. The page says which wish gave way.
 */
export type MatchLength = "weekend" | "mid" | "week";
export const MATCH_LENGTHS: readonly MatchLength[] = ["weekend", "mid", "week"];
/** What the matcher needs of a trip: small enough to hand to the browser, which never gets presets.ts. */
export type MatchTrip = Pick<Trip, "id" | "kind" | "days" | "budget" | "bestMonths" | "flyTo">;
export type MatchWish = {
  from?: Airport | null;
  length?: MatchLength;
  /** A ceiling: 1 is €, 2 is €€. No ceiling is no wish. */
  budget?: 1 | 2;
  kind?: TripKind;
};
export type Relaxed = "length" | "budget" | "kind";
export type MatchPick = {
  id: string;
  /** The wishes this trip misses, in this order: length, budget, kind. Empty when it fits them all. */
  relaxed: Relaxed[];
  inSeason: boolean;
  /** Only with an origin that is not the trip's own airport. */
  km?: number;
  airMinutes?: number;
  train: boolean;
  /** The trip starts at the airport they leave from. */
  home: boolean;
};
/**
 * How well the best few fit: all of them; some; none, each letting go of the same wishes (said);
 * or none, each letting go of different ones ("closest"), where naming the first card's would be
 * untrue of the other two.
 */
export type MatchSummary = { kind: "all" } | { kind: "some"; count: number } | { kind: "none"; letGo: Relaxed[] } | { kind: "closest" };
export const MATCH_COUNT = 3;
/** Nearer than this, the origin is the trip's own town. */
export const HOME_KM = 30;

export const lengthBand = (days: number): 0 | 1 | 2 => (days <= 3 ? 0 : days <= 6 ? 1 : 2);
export const lengthFits = (days: number, length: MatchLength): boolean => lengthBand(days) === MATCH_LENGTHS.indexOf(length);

type Ranked = { pick: MatchPick; weight: number; score: number; index: number };

/** Every trip once, best first. `month` is 1–12. */
export function matchTrips(wish: MatchWish, trips: readonly MatchTrip[], month: number): MatchPick[] {
  const ranked: Ranked[] = trips.map((trip, index) => {
    const relaxed: Relaxed[] = [];
    let weight = 0;
    if (wish.length && !lengthFits(trip.days, wish.length)) {
      relaxed.push("length");
      weight += Math.abs(lengthBand(trip.days) - MATCH_LENGTHS.indexOf(wish.length));
    }
    if (wish.budget && trip.budget > wish.budget) {
      relaxed.push("budget");
      weight += 2 * (trip.budget - wish.budget);
    }
    if (wish.kind && trip.kind !== wish.kind) {
      relaxed.push("kind");
      weight += 8;
    }
    const inSeason = trip.bestMonths.includes(month);

    let home = false;
    let train = false;
    let km: number | undefined;
    let airMinutes: number | undefined;
    let near = 0;
    const to = wish.from ? findAirport(trip.flyTo) : null;
    if (wish.from && to) {
      const exact = distanceKm(wish.from, to);
      home = wish.from.iata === to.iata || exact < HOME_KM;
      if (home) near = 1;
      else {
        km = Math.round(exact);
        airMinutes = estimateFlight(exact);
        train = trainHint(exact);
        near = Math.max(0, 1 - exact / 3000);
      }
    }
    const score = (inSeason ? 2 : 0) + near;
    const pick: MatchPick = {
      id: trip.id,
      relaxed,
      inSeason,
      ...(km !== undefined ? { km } : {}),
      ...(airMinutes !== undefined ? { airMinutes } : {}),
      train,
      home,
    };
    return { pick, weight, score, index };
  });
  ranked.sort((a, b) => a.weight - b.weight || b.score - a.score || a.index - b.index);
  return ranked.map((r) => r.pick);
}

/**
 * The wishes a pick meets, said as the page's "why it fits": the ones they asked for (not left at
 * "any") that this trip does not miss, in the sentence's order.
 */
export function metWishes(wish: MatchWish, pick: Pick<MatchPick, "relaxed">): Relaxed[] {
  const asked: Relaxed[] = [...(wish.length ? (["length"] as const) : []), ...(wish.budget ? (["budget"] as const) : []), ...(wish.kind ? (["kind"] as const) : [])];
  return asked.filter((w) => !pick.relaxed.includes(w));
}

/** The best few, and how well the best of them fit: all, some, or none (and which wishes gave way). */
export function topMatches(wish: MatchWish, trips: readonly MatchTrip[], month: number, count: number = MATCH_COUNT): { picks: MatchPick[]; summary: MatchSummary } {
  const all = matchTrips(wish, trips, month);
  const picks = all.slice(0, count);
  const exact = all.filter((p) => p.relaxed.length === 0).length;
  const letGo = picks[0]?.relaxed ?? [];
  const same = picks.every((p) => p.relaxed.join() === letGo.join());
  const summary: MatchSummary =
    exact >= picks.length ? { kind: "all" } : exact >= 1 ? { kind: "some", count: exact } : same ? { kind: "none", letGo } : { kind: "closest" };
  return { picks, summary };
}

/** The first of a trip's best months after `month` (1–12), going round the year; null if it has none. */
export function nextBestMonth(bestMonths: readonly number[], month: number): number | null {
  for (let step = 1; step <= 12; step++) {
    const m = ((month - 1 + step) % 12) + 1;
    if (bestMonths.includes(m)) return m;
  }
  return null;
}
