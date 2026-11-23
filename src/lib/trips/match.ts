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
export type MatchSummary = { kind: "all" } | { kind: "some"; count: number } | { kind: "none"; letGo: Relaxed[] };
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

/** The best few, and how well the best of them fit: all, some, or none (and which wishes gave way). */
export function topMatches(wish: MatchWish, trips: readonly MatchTrip[], month: number, count: number = MATCH_COUNT): { picks: MatchPick[]; summary: MatchSummary } {
  const all = matchTrips(wish, trips, month);
  const picks = all.slice(0, count);
  const exact = all.filter((p) => p.relaxed.length === 0).length;
  const summary: MatchSummary =
    exact >= picks.length ? { kind: "all" } : exact >= 1 ? { kind: "some", count: exact } : { kind: "none", letGo: picks[0]?.relaxed ?? [] };
  return { picks, summary };
}
