"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasReading, magnitude, newKnock, stepKnock } from "./knock";
import { SENSE_GRACE_MS, phoneLike, senseOf, sensorGate, type SensorAnswer } from "./sense";

type MotionWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function api(): MotionWithPermission | null {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return null;
  return DeviceMotionEvent as MotionWithPermission;
}

export type Knock = {
  /** True once the phone has reported motion it can actually feel. */
  supported: boolean;
  /** Worth asking them to knock: a phone that is reporting, or one that will once it is asked. */
  expected: boolean;
  needsPermission: boolean;
  requestPermission: () => Promise<boolean>;
};

/**
 * Watches for one sharp knock on the back of the phone. The rule itself lives in `knock.ts`;
 * this only feeds it readings and hands back what it says. `onBump` fires for every nudge, sharp
 * or not, so the meter can show them trying — including the ones that were too soft to count.
 *
 * As with the tilt, the listener goes on straight away: Android reports without being asked, iOS
 * says nothing until it has been, and `sense.ts` decides which of those this is before the gift
 * puts a word about knocking on the screen.
 *
 * One effect owns the listener, so answering the prompt, finishing the clink and unmounting all
 * remove it, and every fresh attach starts the warm-up again on a clean state.
 */
export function useKnock({
  enabled,
  onKnock,
  onBump,
}: {
  enabled: boolean;
  onKnock: () => void;
  onBump?: (strength: number, tooBusy: boolean) => void;
}): Knock {
  const [reading, setReading] = useState(false);
  const [answer, setAnswer] = useState<SensorAnswer>(null);
  const [quietFor, setQuietFor] = useState<string | null>(null);
  const knockRef = useRef(onKnock);
  const bumpRef = useRef(onBump);
  useEffect(() => {
    knockRef.current = onKnock;
    bumpRef.current = onBump;
  });

  const gated = sensorGate(api(), phoneLike());
  const key = answer ?? "ask";
  const sense = senseOf({ gated, reading, answer, quiet: quietFor === key });

  useEffect(() => {
    if (!enabled || !api()) return;
    let state = newKnock();
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity ?? e.acceleration;
      if (!a) return;
      if (!hasReading(a.x, a.y, a.z)) return;
      const step = stepKnock(state, magnitude(a.x, a.y, a.z), e.timeStamp || Date.now());
      state = step.state;
      setReading(true);
      if (step.strength > 0 || step.tooBusy) bumpRef.current?.(step.strength, step.tooBusy);
      if (step.knocked) knockRef.current();
    };
    window.addEventListener("devicemotion", onMotion, { passive: true });
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled, answer]);

  useEffect(() => {
    if (!enabled || reading) return;
    const id = window.setTimeout(() => setQuietFor(key), SENSE_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [enabled, key, reading]);

  const requestPermission = useCallback(async () => {
    const motion = api();
    if (typeof motion?.requestPermission !== "function") {
      setAnswer("granted");
      return true;
    }
    try {
      if ((await motion.requestPermission()) === "granted") {
        setAnswer("granted");
        return true;
      }
    } catch {
      /* refused */
    }
    setAnswer("denied");
    return false;
  }, []);

  return { ...sense, requestPermission };
}
