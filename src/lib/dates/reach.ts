import { distanceKm, isLatLng, type LatLng } from "./geo";

/** How far a person will walk from where they stand, in the planner's "Distance" choice (BRIEF-dates2.md 2). */
export const REACH_MINUTES = [10, 20, 30] as const;
export type ReachMinutes = (typeof REACH_MINUTES)[number];

/** How far a stroll of that many minutes reaches in a straight line: walkingMinutes() the other way round (12 minutes a kilometre, streets 1.3 times the line). */
export const reachKm = (minutes: ReachMinutes): number => minutes / (12 * 1.3);

export const isReach = (value: unknown): value is ReachMinutes => typeof value === "number" && (REACH_MINUTES as readonly number[]).includes(value);

/** The places within a walk of that many minutes of a point. A place without coordinates is never within reach. */
export function withinReach<T extends { lat: number; lng: number }>(places: readonly T[], from: LatLng, minutes: ReachMinutes): T[] {
  const km = reachKm(minutes);
  return places.filter((p) => isLatLng(p.lat, p.lng) && distanceKm(from, p) <= km);
}

/**
 * The places within the walk chosen, or null when the person stands nowhere near these places: not
 * one lies within the longest walk on offer (someone in New York on London's page). A longer walk
 * would not help them, so the planner turns the distance off and says why (dates2-C6).
 */
export function placesInReach<T extends { lat: number; lng: number }>(places: readonly T[], from: LatLng, minutes: ReachMinutes): T[] | null {
  if (places.length > 0 && withinReach(places, from, REACH_MINUTES[REACH_MINUTES.length - 1]).length === 0) return null;
  return withinReach(places, from, minutes);
}

/** The two choices the planner keeps between visits, and nothing else: never a position. */
export const PICKER_KEY = "ethos.dates.picker.v1";
export type StoredPicker = { setting?: "indoors" | "outdoors"; reach?: ReachMinutes };

/** What was kept, checked field by field: an unknown value or key is dropped. */
export function readPicker(raw: string | null): StoredPicker {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const { setting, reach } = value as Record<string, unknown>;
  return {
    ...(setting === "indoors" || setting === "outdoors" ? { setting } : {}),
    ...(isReach(reach) ? { reach } : {}),
  };
}

export function loadPicker(): StoredPicker {
  try {
    return readPicker(window.localStorage.getItem(PICKER_KEY));
  } catch {
    return {};
  }
}

/** Writes only the two choices; never throws (a private window, blocked storage). */
export function savePicker(picker: StoredPicker): void {
  const kept: StoredPicker = {
    ...(picker.setting === "indoors" || picker.setting === "outdoors" ? { setting: picker.setting } : {}),
    ...(isReach(picker.reach) ? { reach: picker.reach } : {}),
  };
  try {
    if (Object.keys(kept).length === 0) window.localStorage.removeItem(PICKER_KEY);
    else window.localStorage.setItem(PICKER_KEY, JSON.stringify(kept));
  } catch {
    // Nothing to do: the choice simply is not remembered.
  }
}
