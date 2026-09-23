import type { TourRoom } from "./room";

/**
 * Whether this browser has already been shown a room's tour. One flag per room, in localStorage,
 * so a first visit to Games still gets its tour after Dates has had one.
 *
 * Storage can be missing or throw (private windows, blocked site data). Then the tour is still
 * shown only once per visit: the flags are mirrored in memory for the life of the page.
 */
type Store = Pick<Storage, "getItem" | "setItem">;

const SEEN = "1";
export const tourKey = (room: TourRoom) => `ethos.tour.${room}.v1`;

const thisVisit = new Set<TourRoom>();

function browserStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenTour(room: TourRoom, store: Store | null = browserStore()): boolean {
  if (thisVisit.has(room)) return true;
  try {
    return store?.getItem(tourKey(room)) === SEEN;
  } catch {
    return false;
  }
}

export function markTourSeen(room: TourRoom, store: Store | null = browserStore()): void {
  thisVisit.add(room);
  try {
    store?.setItem(tourKey(room), SEEN);
  } catch {
    // Remembered for this visit only.
  }
}
