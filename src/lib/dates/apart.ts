import { distanceKm, type LatLng } from "./geo";

/** The nearest of a list of cities to a point, and how far off it is. */
export function nearestCity<T extends LatLng>(point: LatLng, cities: readonly T[]): { city: T; km: number } | null {
  let best: { city: T; km: number } | null = null;
  for (const city of cities) {
    const km = distanceKm(point, city);
    if (!best || km < best.km) best = { city, km };
  }
  return best;
}

/**
 * What to call the halfway point: the nearest known city within `maxKm`, "nowhere" when none is
 * that close (open sea, mostly), or "unnamed" when the nearest one is in a country the site never
 * names (the owner's rule). Skipping to the next-nearest city there would name the wrong place, so
 * the caller says how far each of them travels instead.
 */
export function halfwayPlace<T extends LatLng & { country: string }>(
  point: LatLng,
  cities: readonly T[],
  { maxKm, neverNamed }: { maxKm: number; neverNamed: ReadonlySet<string> },
): { city: T; km: number } | "nowhere" | "unnamed" {
  const near = nearestCity(point, cities);
  if (!near || near.km > maxKm) return "nowhere";
  return neverNamed.has(near.city.country) ? "unnamed" : near;
}

/** People are reachable from eight in the morning until eleven at night, their own time. */
const AWAKE_FROM = 8 * 60;
const AWAKE_TO = 23 * 60;

/** How many hours ahead of A the clocks of B are. Negative when B is behind. Half-hour zones exist (India, Newfoundland). */
export const hoursAhead = (offsetSecondsA: number, offsetSecondsB: number): number => (offsetSecondsB - offsetSecondsA) / 3600;

/**
 * When both of two people are awake, as minutes of A's day. B's waking day is slid onto A's clock
 * and intersected with A's own; across more than about nine time zones that can be two short
 * windows (early morning and late evening) or none at all.
 */
export function awakeOverlap(offsetSecondsA: number, offsetSecondsB: number): [number, number][] {
  const shift = Math.round((offsetSecondsA - offsetSecondsB) / 60);
  const windows: [number, number][] = [];
  // B's day as seen from A, and the same day a day earlier and later, so nothing is lost at midnight.
  for (const day of [-1440, 0, 1440]) {
    const from = Math.max(AWAKE_FROM, AWAKE_FROM + shift + day);
    const to = Math.min(AWAKE_TO, AWAKE_TO + shift + day);
    if (to > from) windows.push([from, to]);
  }
  return windows.sort((a, b) => a[0] - b[0]);
}

export const clockOf = (minutes: number): string => {
  const t = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export const milesOf = (km: number): number => km * 0.621371;
