"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IDLE_STORM, SAMPLE_MS, SAMPLE_STALE_MS, advanceStorm, isFlipped, sampleStrength, stormReady, type Storm, type Vec } from "./storm";

type Gated = { requestPermission?: () => Promise<"granted" | "denied"> };

export type GlobeShake = {
  /** A real reading has arrived, so this phone genuinely moves. The prompt says so only then. */
  sensing: boolean;
  /** iOS asks for motion from inside a tap. */
  needsPermission: boolean;
  requestPermission: () => Promise<boolean>;
  /** Live 0..1, read every frame by the snow without re-rendering anything. */
  levelRef: { readonly current: number };
  chargeRef: { readonly current: number };
};

/**
 * The globe's own motion sense: how hard the phone is being shaken, right now, and whether it
 * has been turned over. The shared `useShake` gives one callback at one threshold, which is all
 * a jar of notes needs; a storm needs the strength of it, every frame, and the decision about
 * what counts lives in `storm.ts` where it can be tested.
 */
export function useGlobeShake({
  enabled,
  onShake,
  onFlip,
  onFrame,
}: {
  enabled: boolean;
  /** A shake has been earned. `level` is how wild it was, 0..1. */
  onShake: (level: number) => void;
  onFlip?: (flipped: boolean) => void;
  /** Every frame, for meters drawn straight to the DOM. */
  onFrame?: (level: number, charge: number) => void;
}): GlobeShake {
  const hasApi = typeof window !== "undefined" && typeof DeviceMotionEvent !== "undefined";
  const gated = hasApi && typeof (DeviceMotionEvent as unknown as Gated).requestPermission === "function";

  const [sensing, setSensing] = useState(false);
  const [asked, setAsked] = useState(false);
  // Only iOS gates the sensor, and only until a reading arrives: once the phone is reporting,
  // or they have answered the prompt, there is nothing left to ask for.
  const needsPermission = gated && !sensing && !asked;

  const strength = useRef(0);
  const strengthAt = useRef(0);
  const last = useRef<{ vec: Vec; t: number } | null>(null);
  const levelRef = useRef(0);
  const chargeRef = useRef(0);
  const flipped = useRef(false);
  const sensed = useRef(false);

  const onShakeRef = useRef(onShake);
  const onFlipRef = useRef(onFlip);
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onShakeRef.current = onShake;
    onFlipRef.current = onFlip;
    onFrameRef.current = onFrame;
  });

  const attach = useCallback(() => {
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const now = performance.now();
      const prev = last.current;
      if (prev && now - prev.t < SAMPLE_MS) return;
      const vec: Vec = { x: a.x, y: a.y, z: a.z };
      if (prev) {
        strength.current = sampleStrength(vec, prev.vec);
        strengthAt.current = now;
      }
      last.current = { vec, t: now };
      if (!sensed.current) {
        sensed.current = true;
        setSensing(true);
      }
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      const next = isFlipped(flipped.current, e.beta);
      if (next === flipped.current) return;
      flipped.current = next;
      onFlipRef.current?.(next);
    };
    window.addEventListener("devicemotion", onMotion, { passive: true });
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  // One place holds the listeners, whether they were attached on mount or after a permission
  // prompt, so nothing is left listening when the gift is closed.
  const detach = useRef<(() => void) | null>(null);
  const listen = useCallback(() => {
    detach.current?.();
    detach.current = attach();
  }, [attach]);

  // Listening costs nothing and is never gated: on Android the readings simply start arriving,
  // and on iOS nothing fires until they have said yes.
  useEffect(() => {
    if (!enabled || !hasApi) return;
    listen();
    return () => {
      detach.current?.();
      detach.current = null;
    };
  }, [enabled, hasApi, listen]);

  useEffect(
    () => () => {
      detach.current?.();
      detach.current = null;
    },
    [],
  );

  // One loop for the whole template: it turns readings into a storm, and hands the level to
  // whoever is drawing. It runs on a laptop too, where the level simply stays at zero.
  useEffect(() => {
    if (!enabled) {
      levelRef.current = 0;
      chargeRef.current = 0;
      return;
    }
    let raf = 0;
    let storm: Storm = IDLE_STORM;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = (now - previous) / 1000;
      previous = now;
      const fresh = now - strengthAt.current < SAMPLE_STALE_MS;
      storm = advanceStorm(storm, fresh ? strength.current : 0, dt);
      if (stormReady(storm)) {
        storm = { level: storm.level, charge: 0 };
        onShakeRef.current(levelRef.current > storm.level ? levelRef.current : storm.level);
      }
      levelRef.current = storm.level;
      chargeRef.current = storm.charge;
      onFrameRef.current?.(storm.level, storm.charge);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  const requestPermission = useCallback(async () => {
    const motion = DeviceMotionEvent as unknown as Gated;
    const orientation = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as unknown as Gated | undefined;
    setAsked(true);
    if (typeof motion.requestPermission !== "function") {
      listen();
      return true;
    }
    try {
      const granted = (await motion.requestPermission()) === "granted";
      if (orientation && typeof orientation.requestPermission === "function") {
        await orientation.requestPermission().catch(() => "denied" as const);
      }
      if (granted) listen();
      return granted;
    } catch {
      return false;
    }
  }, [listen]);

  return { sensing, needsPermission, requestPermission, levelRef, chargeRef };
}
