"use client";

import { useSyncExternalStore } from "react";

/** Past this, the bar tightens. */
const COMPACT_AT = 24;
/** Above this the bar never hides: it is the top of the page, and the bar is part of it. */
const HIDE_AFTER = 120;
/** How far one steady scroll has to go before the bar answers it, so a jitter of the thumb doesn't. */
const HIDE_TRAVEL = 12;
const SHOW_TRAVEL = 6;

const COMPACT = 1;
const HIDDEN = 2;

let state = 0;
let lastY = 0;
/** The distance scrolled in the current direction: positive down, negative up. */
let travel = 0;
const listeners = new Set<() => void>();

function measure() {
  const root = document.documentElement;
  // Clamped to the page, so iOS's rubber band past either end isn't read as a change of direction.
  const y = Math.min(Math.max(0, window.scrollY), Math.max(0, root.scrollHeight - window.innerHeight));
  const dy = y - lastY;
  lastY = y;
  if (dy !== 0) travel = dy > 0 === travel > 0 ? travel + dy : dy;

  let hidden = state & HIDDEN;
  if (y < HIDE_AFTER) hidden = 0;
  else if (travel > HIDE_TRAVEL) hidden = HIDDEN;
  else if (travel < -SHOW_TRAVEL) hidden = 0;
  const next = (y > COMPACT_AT ? COMPACT : 0) | hidden;
  if (next === state) return;
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    lastY = Math.max(0, window.scrollY);
    travel = 0;
    state = lastY > COMPACT_AT ? COMPACT : 0;
    window.addEventListener("scroll", measure, { passive: true });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("scroll", measure);
  };
}

/**
 * Whether the navbar should be tight (scrolled past the top) and whether it should be out of the
 * way (scrolling down). Scroll events only update a number; React hears of it only when one of the
 * two answers flips, a few times a page, never once a frame.
 */
export function useHeaderScroll(): { compact: boolean; hidden: boolean } {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => 0,
  );
  return { compact: (snapshot & COMPACT) !== 0, hidden: (snapshot & HIDDEN) !== 0 };
}
