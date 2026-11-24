"use client";

import { useEffect, useMemo, useState } from "react";
import type { LatLng } from "@/lib/dates/geo";
import {
  halfwayAnswer,
  halfwayBetween,
  needsMap,
  type Halfway,
  type HalfwayAnswer,
  type SpotState,
} from "@/lib/ldr/halfway";
import type { Spot } from "@/lib/places/photon-reverse";

/** The map's answers this visit, by middle (to about a kilometre) and language: asked once each. */
const asked = new Map<string, Spot>();

/** The middle to about a kilometre, each one's journey to ten (how far off the middle a city may be), and the language. */
const keyOf = (point: LatLng, eachKm: number, locale: "en" | "es") =>
  `${Math.round(point.lat * 100) / 100},${Math.round(point.lng * 100) / 100},${Math.round(eachKm / 10) * 10},${locale}`;

/**
 * Halfway between two towns, as both pages show it: the table's answer at once, and when the table
 * has no city near enough the middle (or only one of their own towns), the town nearest it from the
 * map, asked through /api/places. Until the map answers, the answer is `pending`; if it cannot,
 * `failed`. No town is ever in the request: only the middle.
 */
export function useHalfway(
  a: LatLng | null,
  b: LatLng | null,
  locale: "en" | "es",
): { result: Halfway | null; answer: HalfwayAnswer | null } {
  const result = useMemo(() => (a && b ? halfwayBetween(a, b) : null), [a, b]);
  const key = result && needsMap(result) ? keyOf(result.middle, result.km / 2, locale) : null;
  const [got, setGot] = useState<{ key: string; spot: Spot | null } | null>(null);

  useEffect(() => {
    if (!key || asked.has(key)) return;
    const [lat, lng, each] = key.split(",");
    const controller = new AbortController();
    void (async () => {
      let spot: Spot | null = null;
      try {
        const res = await fetch(
          `/api/places?lat=${lat}&lng=${lng}&each=${each}${locale === "en" ? "&lang=en" : ""}`,
          { signal: controller.signal },
        );
        const json = res.ok ? ((await res.json()) as { spot?: Spot }) : null;
        spot = json?.spot && ["town", "none", "sea"].includes(json.spot.kind) ? json.spot : null;
      } catch {
        if (controller.signal.aborted) return;
      }
      if (spot) asked.set(key, spot);
      setGot({ key, spot });
    })();
    return () => controller.abort();
  }, [key, locale]);

  const spot: SpotState = !key
    ? undefined
    : (asked.get(key) ?? (got?.key === key ? got.spot : undefined));
  const answer = useMemo(
    () => (result && a && b ? halfwayAnswer(result, a, b, spot, locale) : null),
    [result, a, b, spot, locale],
  );
  return { result, answer };
}
