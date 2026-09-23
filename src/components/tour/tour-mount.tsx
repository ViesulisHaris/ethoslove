"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "@/i18n/navigation";
import { roomForPath } from "@/lib/tour/room";

/** The tour, the button that replays it and their words are one chunk, fetched only in a room that has a tour. */
const TourRoot = dynamic(() => import("./tour-root").then((m) => m.TourRoot), { ssr: false });

/** Give the page this long to go quiet before the tour's chunk is even asked for. */
const IDLE_TIMEOUT_MS = 4000;
/** Safari has no requestIdleCallback; this is roughly when a phone is done with the first screen. */
const NO_IDLE_FALLBACK_MS = 2500;

/**
 * Mounted once per layout. Nothing of the tour loads until the browser has gone idle after the
 * first screen, so it can't compete with the page's largest paint, and it renders nothing on the
 * server, so it can't shift anything either.
 */
export function TourMount() {
  const pathname = usePathname();
  const room = roomForPath(pathname);
  const idle = useAfterIdle();
  if (!room || !idle) return null;
  // Keyed by path: moving to another page mid-tour ends it, rather than leaving it pointing at nothing.
  return <TourRoot key={pathname} room={room} pathname={pathname} />;
}

function useAfterIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const done = () => setIdle(true);
    const hasIdle = typeof window.requestIdleCallback === "function";
    const id = hasIdle ? window.requestIdleCallback(done, { timeout: IDLE_TIMEOUT_MS }) : window.setTimeout(done, NO_IDLE_FALLBACK_MS);
    return () => (hasIdle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);
  return idle;
}
