/**
 * Whether saving dates works right now, as the last answer from /api/saved-dates said. When it
 * doesn't (the database down, 0015 not applied), the pages hide "Save to my dates" and "Save trip"
 * rather than show buttons that fail, and for a while they stop asking: every page and every hook on
 * it reads this one answer, kept for the tab (sessionStorage) so the next page doesn't ask again at
 * once. The pause grows with each "not available" in a row, so one bad moment hides saving for half a
 * minute (a sign-in's plan still saves itself then) while an outage that lasts is asked about every
 * ten minutes; any answer that works starts it over. When a pause ends the pages are told, and ask
 * again by themselves.
 */
export const UNAVAILABLE_KEY = "ethos.savedDates.unavailableUntil";
export const UNAVAILABLE_PAUSES_MS = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000] as const;

type State = { until: number; streak: number };
const NONE: State = { until: 0, streak: 0 };

let state: State | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function stored(): State {
  try {
    const raw = window.sessionStorage.getItem(UNAVAILABLE_KEY);
    const value = raw ? (JSON.parse(raw) as Partial<State> | number) : null;
    // An older page kept the time alone.
    if (typeof value === "number") return { until: value, streak: 1 };
    return { until: Number(value?.until) || 0, streak: Number(value?.streak) || 0 };
  } catch {
    return NONE;
  }
}

function current(): State {
  if (state === null) state = typeof window === "undefined" ? NONE : stored();
  return state;
}

function keep(next: State): void {
  state = next;
  try {
    window.sessionStorage.setItem(UNAVAILABLE_KEY, JSON.stringify(next));
  } catch {
    // Remembered for this page only.
  }
}

export function isSavingUnavailable(now = Date.now()): boolean {
  return current().until > now;
}

/** Saving answered "not available": hide it, and don't ask again for a while, longer each time in a row. */
export function markSavingUnavailable(now = Date.now()): void {
  const streak = current().streak + 1;
  const pause = UNAVAILABLE_PAUSES_MS[Math.min(streak, UNAVAILABLE_PAUSES_MS.length) - 1];
  keep({ until: now + pause, streak });
  notify();
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    notify();
  }, pause);
}

/** Saving answered: it works, and the next outage starts again from the shortest pause. */
export function markSavingAvailable(): void {
  const { until, streak } = current();
  if (until === 0 && streak === 0) return;
  keep(NONE);
  if (timer !== null) clearTimeout(timer);
  timer = null;
  notify();
}

export function subscribeAvailability(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** For tests: forget what was learnt. */
export function resetAvailability(): void {
  state = null;
  if (timer !== null) clearTimeout(timer);
  timer = null;
}
