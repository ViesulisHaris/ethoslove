/**
 * Whether saving dates works right now, as the last answer from /api/saved-dates said. When it
 * doesn't (0015 not applied yet, the database down), the pages hide "Save to my dates" and "Save
 * trip" rather than show buttons that fail, and for a while they stop asking: every page and every
 * hook on it reads this one answer, kept for the tab (sessionStorage) so the next page doesn't ask
 * again at once. It is asked afresh after UNAVAILABLE_MS.
 */
export const UNAVAILABLE_KEY = "ethos.savedDates.unavailableUntil";
export const UNAVAILABLE_MS = 10 * 60 * 1000;

let until: number | null = null;
const listeners = new Set<() => void>();

function stored(): number {
  try {
    return Number(window.sessionStorage.getItem(UNAVAILABLE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function isSavingUnavailable(now = Date.now()): boolean {
  if (until === null) until = typeof window === "undefined" ? 0 : stored();
  return until > now;
}

/** Saving answered "not available": hide it, and don't ask again for a while. */
export function markSavingUnavailable(now = Date.now()): void {
  until = now + UNAVAILABLE_MS;
  try {
    window.sessionStorage.setItem(UNAVAILABLE_KEY, String(until));
  } catch {
    // Remembered for this page only.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeAvailability(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** For tests: forget what was learnt. */
export function resetAvailability(): void {
  until = null;
}
