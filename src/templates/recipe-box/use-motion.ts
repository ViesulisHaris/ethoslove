"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IDLE_MOTION, pourTilt, readShake, type Motion } from "./pour";

type Gated = { requestPermission?: () => Promise<"granted" | "denied"> };

/** idle: waiting for the first reading · live: the phone is telling us · off: it never will. */
export type SensorState = "idle" | "live" | "off";

/** A laptop has both events and fires neither, so we stop promising after this and say so. */
const LISTEN_MS = 1600;

const hasOrientation = () => typeof window !== "undefined" && typeof DeviceOrientationEvent !== "undefined";
const hasMotion = () => typeof window !== "undefined" && typeof DeviceMotionEvent !== "undefined";

/** Does this phone make us ask before it will say anything? */
function gated(): boolean {
  return (
    (hasOrientation() && typeof (DeviceOrientationEvent as unknown as Gated).requestPermission === "function") ||
    (hasMotion() && typeof (DeviceMotionEvent as unknown as Gated).requestPermission === "function")
  );
}

/**
 * iOS asks separately for the tilt and for the shake, and this recipe needs both. One yes covers
 * the whole thing: the jar asks, and by the time the spoon comes out the bowl already has the
 * answer — nobody is interrupted twice in the middle of their own mother's recipe.
 */
let answered = false;

async function askOnce(): Promise<boolean> {
  answered = true;
  let granted = false;
  for (const api of [DeviceMotionEvent, DeviceOrientationEvent] as unknown as (Gated | undefined)[]) {
    if (typeof api?.requestPermission !== "function") {
      granted = true;
      continue;
    }
    try {
      if ((await api.requestPermission()) === "granted") granted = true;
    } catch {
      /* refused, or asked outside a gesture */
    }
  }
  return granted;
}

/**
 * How far the phone is tilted sideways, in degrees, kept in a ref so the frame loop can read it
 * without re-rendering. A variant of the shared gyro hook: that one reports a sprung -1..1 offset
 * from wherever the phone was resting, and a jar has to answer the real angle.
 *
 * It keeps listening after it has given up, so a sensor that wakes late still tips the jar the
 * moment it speaks.
 */
export function useTilt(enabled: boolean) {
  const tiltRef = useRef(0);
  const [needsPermission, setNeedsPermission] = useState(() => gated() && !answered);
  const [state, setState] = useState<SensorState>(() => (hasOrientation() ? "idle" : "off"));

  useEffect(() => {
    if (!enabled || needsPermission || !hasOrientation()) return;
    let heard = false;
    const onOrientation = (e: DeviceOrientationEvent) => {
      // A laptop fires the event with nothing in it. That isn't a phone that can feel a tilt.
      if (typeof e.gamma !== "number" || !Number.isFinite(e.gamma)) return;
      tiltRef.current = pourTilt(e);
      if (heard) return;
      heard = true;
      setState("live");
    };
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    const id = window.setTimeout(() => setState((current) => (current === "idle" ? "off" : current)), LISTEN_MS);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      window.clearTimeout(id);
      tiltRef.current = 0;
    };
  }, [enabled, needsPermission]);

  /** iOS only asks from inside a tap, which is why a button asks and not the template. */
  const request = useCallback(async () => {
    const granted = await askOnce();
    setNeedsPermission(false);
    setState(granted ? "idle" : "off");
    return granted;
  }, []);

  return { state, needsPermission, request, tiltRef };
}

/**
 * Hands shaking a bowl. The reading-to-reading rule lives in `readShake`, and how many of those
 * in a row add up to a stir lives in `shakeStir`, so both can be argued with in a test instead of
 * on a train.
 */
export function useStir(onShake: () => void, enabled: boolean) {
  const [needsPermission, setNeedsPermission] = useState(() => gated() && !answered);
  const [state, setState] = useState<SensorState>(() => (hasMotion() ? "idle" : "off"));
  const shakeRef = useRef(onShake);
  useEffect(() => {
    shakeRef.current = onShake;
  });

  useEffect(() => {
    if (!enabled || needsPermission || !hasMotion()) return;
    let last: Motion = IDLE_MOTION;
    let heard = false;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (!heard) {
        heard = true;
        setState("live");
      }
      const next = readShake(last, { x: a.x, y: a.y, z: a.z, t: Date.now() });
      last = next.last;
      if (next.shook) shakeRef.current();
    };
    window.addEventListener("devicemotion", onMotion, { passive: true });
    const id = window.setTimeout(() => setState((current) => (current === "idle" ? "off" : current)), LISTEN_MS);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      window.clearTimeout(id);
    };
  }, [enabled, needsPermission]);

  const request = useCallback(async () => {
    const granted = await askOnce();
    setNeedsPermission(false);
    setState(granted ? "idle" : "off");
    return granted;
  }, []);

  return { state, needsPermission, request };
}
