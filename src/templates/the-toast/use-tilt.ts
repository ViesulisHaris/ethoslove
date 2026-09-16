"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { SENSE_GRACE_MS, phoneLike, senseOf, sensorGate, type SensorAnswer } from "./sense";

type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function api(): OrientationWithPermission | null {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return null;
  return DeviceOrientationEvent as OrientationWithPermission;
}

export type Tilt = {
  /** The phone's roll in degrees, read inside animation frames so nothing re-renders per reading. */
  angleRef: RefObject<number>;
  /** True the moment a real reading arrives — a laptop never gets one. */
  supported: boolean;
  /** Worth asking them to tilt: a phone that is reporting, or one that will once it is asked. */
  expected: boolean;
  /** iOS wants a tap before it will tell us anything. */
  needsPermission: boolean;
  requestPermission: () => Promise<boolean>;
};

/**
 * How far the phone is rolled, left or right. Its own hook rather than the shared parallax one:
 * pouring wants the real angle in degrees, and wants nothing at all to happen when there is no
 * sensor, so the button stays the honest way to do it.
 *
 * The listener goes on straight away and is never gated. On Android the readings simply start
 * arriving — gating them behind a tap would have made the gesture the gift is about do nothing
 * until the recipient found a link. On iOS nothing fires until they say yes, which is what the
 * quiet grace window notices before it offers them that link.
 *
 * One effect attaches and removes it, so a granted permission, a stage change and an unmount all
 * leave the window clean — a leaked `deviceorientation` handler would keep pouring into a table
 * that is no longer on screen.
 */
export function useTilt(enabled: boolean): Tilt {
  const angleRef = useRef(0);
  const [reading, setReading] = useState(false);
  const [answer, setAnswer] = useState<SensorAnswer>(null);
  // Keyed by the answer it was measured for, so granting permission starts the window again
  // instead of leaving a phone written off a moment before its first reading.
  const [quietFor, setQuietFor] = useState<string | null>(null);

  const gated = sensorGate(api(), phoneLike());
  const key = answer ?? "ask";
  const sense = senseOf({ gated, reading, answer, quiet: quietFor === key });

  useEffect(() => {
    if (!enabled || !api()) return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || !Number.isFinite(e.gamma)) return;
      angleRef.current = Math.max(-90, Math.min(90, e.gamma));
      setReading(true);
    };
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    return () => window.removeEventListener("deviceorientation", onOrientation);
    // Re-attached once they have answered: iOS only starts delivering after that.
  }, [enabled, answer]);

  useEffect(() => {
    if (!enabled || reading) return;
    const id = window.setTimeout(() => setQuietFor(key), SENSE_GRACE_MS);
    return () => window.clearTimeout(id);
  }, [enabled, key, reading]);

  const requestPermission = useCallback(async () => {
    const orientation = api();
    if (typeof orientation?.requestPermission !== "function") {
      setAnswer("granted");
      return true;
    }
    try {
      if ((await orientation.requestPermission()) === "granted") {
        setAnswer("granted");
        return true;
      }
    } catch {
      /* refused */
    }
    setAnswer("denied");
    return false;
  }, []);

  return { angleRef, ...sense, requestPermission };
}
