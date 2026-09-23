"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAP_PAPER } from "@/lib/dates/map-style";
import type { TripKind } from "@/lib/trips/presets";
import type { RouteMapLabels } from "./route-map";

/** The map and its stylesheet are their own chunk, fetched only once the map is nearly on screen. */
const RouteMap = dynamic(() => import("./route-map"), { ssr: false });

/** Start loading this far ahead of the map, so it is drawn by the time someone scrolls to it. */
const AHEAD = "600px 0px";

type Props = { stops: { name: string; lat: number; lng: number }[]; kind: TripKind; labels: RouteMapLabels; className?: string };

/**
 * A reserved box for the route map. Nothing heavy loads with the page: MapLibre, its stylesheet and
 * the tiles wait until the box is within a screen or so of being seen, and a visitor who reads the
 * plan and leaves never downloads them.
 */
export function TripMap({ stops, kind, labels, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(frame);
    }
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setNear(true);
        seen.disconnect();
      },
      { rootMargin: AHEAD },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  return (
    <div ref={box} className={cn("relative overflow-hidden", className)} style={{ background: MAP_PAPER }} data-testid="trip-map">
      {near ? (
        <RouteMap stops={stops} kind={kind} labels={labels} />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 grid place-items-center text-rose-deep/40">
          <MapPinned className="size-10" strokeWidth={1.4} />
        </div>
      )}
    </div>
  );
}
