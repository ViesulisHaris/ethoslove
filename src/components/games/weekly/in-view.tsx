"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/**
 * Which week's set the weekly challenge is showing: this week's (what the server rendered, and the
 * first render in the browser), or the one a link was sent with. The page's heading and the two
 * cards under the challenge are drawn by the page, and the challenge reads the link in the
 * browser: this is how they agree (as today/old-day.tsx does for today's question).
 */
export type InView = { when: "now" | "last" | "older"; setId: string | null };

const NOW: InView = { when: "now", setId: null };
let inView: InView = NOW;
const listeners = new Set<() => void>();

/** Called by the challenge whenever what it shows changes; `null` when it leaves the page. */
export function setWeekInView(next: InView | null) {
  const value = next ?? NOW;
  if (value.when === inView.when && value.setId === inView.setId) return;
  inView = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The server, and the first render, always say this week with the server's own set. */
export const useWeekInView = (): InView =>
  useSyncExternalStore(
    subscribe,
    () => inView,
    () => NOW,
  );

/** Shown only while the challenge shows this week's set: "this week's five cards" would sit under another week's set as a puzzle. */
export function NowOnly({ children }: { children: ReactNode }) {
  const { when } = useWeekInView();
  return when === "now" ? <>{children}</> : null;
}

/** This week's words, last week's, or an earlier week's, once the challenge shows a set from another week. */
export function WhenText({ now, last, older }: { now: string; last: string; older: string }) {
  const { when } = useWeekInView();
  return <>{when === "last" ? last : when === "older" ? older : now}</>;
}
