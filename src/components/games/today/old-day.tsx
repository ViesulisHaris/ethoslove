"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether today's question is showing a pair from another day (a link sent earlier). The page's
 * heading and its line are the server's ("Today's would you rather question"), and the question
 * below them is read from the link in the browser: this is how the two agree. The server, and the
 * first render, always say today.
 */
let old = false;
const listeners = new Set<() => void>();

export function setOldDay(next: boolean) {
  if (next === old) return;
  old = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Today's words, or the other day's once the question below is from another day. */
export function OldDayText({ today, other }: { today: string; other: string }) {
  const isOld = useSyncExternalStore(
    subscribe,
    () => old,
    () => false,
  );
  return <>{isOld ? other : today}</>;
}
