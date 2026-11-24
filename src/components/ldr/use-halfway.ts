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

/** The map's answers this visit, by middle (to about a kilometre): asked once each. */
const asked = new Map<string, Spot>();

/**
 * The middle to about a kilometre, and each one's journey to ten (how far off the middle a city may
 * be). Not the language: the map's names are always asked for in English (a Spanish page asking with
 * none got 恵那市 and Бологое back), and the same name serves both pages.
 */
const keyOf = (point: LatLng, eachKm: number) =>
  `${Math.round(point.lat * 100) / 100},${Math.round(point.lng * 100) / 100},${Math.round(eachKm / 10) * 10}`;

/**
 * Halfway between two towns, as both pages show it: the table's answer at once, and when the table
 * has no city near enough the middle and fair to both (or only one of their own towns), the town
 * nearest it from the map, asked through /api/places. Until the map answers, the answer is
 * `pending`; if it cannot, `failed`, and it is asked again when the connection comes back. No town
 * is ever in the request: only the middle.
 */
export function useHalfway(
  a: LatLng | null,
  b: LatLng | null,
  locale: "en" | "es",
): { result: Halfway | null; answer: HalfwayAnswer | null } {
  const result = useMemo(() => (a && b ? halfwayBetween(a, b) : null), [a, b]);
  const key = result && needsMap(result) ? keyOf(result.middle, result.km / 2) : null;
  const [got, setGot] = useState<{ key: string; spot: Spot | null } | null>(null);
  // Bumped when the browser comes back online after a failed ask, which asks again.
  const [attempt, setAttempt] = useState(0);
  const failed = Boolean(key && got?.key === key && got.spot === null);

  useEffect(() => {
    if (!failed) return;
    const again = () => {
      setGot(null);
      setAttempt((n) => n + 1);
    };
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [failed]);

  useEffect(() => {
    if (!key || asked.has(key)) return;
    const [lat, lng, each] = key.split(",");
    const controller = new AbortController();
    void (async () => {
      let spot: Spot | null = null;
      try {
        const res = await fetch(`/api/places?lat=${lat}&lng=${lng}&each=${each}`, { signal: controller.signal });
        const json = res.ok ? ((await res.json()) as { spot?: Spot }) : null;
        spot = json?.spot && ["town", "none", "sea"].includes(json.spot.kind) ? json.spot : null;
      } catch {
        if (controller.signal.aborted) return;
      }
      if (spot) asked.set(key, spot);
      setGot({ key, spot });
    })();
    return () => controller.abort();
  }, [key, attempt]);

  const spot: SpotState = !key
    ? undefined
    : (asked.get(key) ?? (got?.key === key ? got.spot : undefined));
  const answer = useMemo(
    () => (result && a && b ? halfwayAnswer(result, a, b, spot, locale) : null),
    [result, a, b, spot, locale],
  );
  return { result, answer };
}
