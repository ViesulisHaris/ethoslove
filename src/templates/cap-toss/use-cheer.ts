"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBlowDetector } from "../_shared/hooks/use-blow-detector";
import { cheerLine, hear, openEars, push, type Cheer, type CheerState } from "./cheer";

export type CheerMeter = {
  /** 0..1 loudness, for the bar. */
  level: number;
  /** Where the line sits on that bar right now, given how noisy the room already is. */
  line: number;
  /** How hard the noise is pushing the cap, 0..1. */
  push: number;
};

export type CheerMic = CheerMeter & {
  state: "idle" | "listening" | "denied" | "unsupported";
  /** From the tap until the browser has answered about the microphone. */
  opening: boolean;
  /** The stream is open and has never carried a sound: a muted microphone, and worth saying. */
  deaf: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

/** The shared detector's own rule is for sustained blowing; a threshold over full scale retires it. */
const NEVER = 2;
/**
 * How long a stream may carry nothing at all before we say so. Well past the flat second a
 * browser can take to start delivering audio, and a real microphone's own noise floor clears
 * `CHEER.silence` at once — so this only ever means the microphone is muted.
 */
const DEAF_MS = 4500;
const noop = () => {};

/**
 * The microphone, read as cheering. The shared blow detector opens the stream and reports the
 * loudness; the rule in `cheer.ts` decides when that loudness is a cheer. Mount it in a child
 * keyed by the replay counter, so a second go starts with fresh ears.
 */
export function useCheer({
  enabled,
  onCheer,
  onMeter,
}: {
  enabled: boolean;
  onCheer: (cheer: Cheer) => void;
  onMeter?: (meter: CheerMeter) => void;
}): CheerMic {
  const mic = useBlowDetector({ enabled, onBlow: noop, threshold: NEVER });
  const listening = mic.state === "listening";
  const [meter, setMeter] = useState<CheerMeter>({ level: 0, line: cheerLine(0), push: 0 });
  const [opening, setOpening] = useState(false);
  const [deaf, setDeaf] = useState(false);

  const levelRef = useRef(0);
  const onCheerRef = useRef(onCheer);
  const onMeterRef = useRef(onMeter);
  // The permission prompt outlives the tap: these survive the unmount that a throw causes.
  const openingRef = useRef(false);
  const goneRef = useRef(false);
  const stopRef = useRef(mic.stop);
  useEffect(() => {
    levelRef.current = mic.level;
    onCheerRef.current = onCheer;
    onMeterRef.current = onMeter;
    stopRef.current = mic.stop;
  });
  // Cleared on the way in as well as set on the way out: development mounts every component
  // twice, and a flag only ever set would tell the next stream that nobody was listening.
  useEffect(() => {
    goneRef.current = false;
    return () => {
      goneRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    let ears: CheerState = openEars();
    let shown: CheerMeter = { level: -1, line: -1, push: -1 };
    let silent = false;
    const tick = (now: number) => {
      const heard = hear(ears, levelRef.current, now);
      ears = heard.state;
      // A stream that has carried nothing for this long is muted, not quiet.
      const nothing = ears.wokeAt === null && ears.startedAt !== null && now - ears.startedAt > DEAF_MS;
      if (nothing !== silent) {
        silent = nothing;
        setDeaf(nothing);
      }
      const next: CheerMeter = { level: levelRef.current, line: cheerLine(ears.room), push: push(levelRef.current, ears.room) };
      // Only wake the scene when the needle has actually moved.
      if (Math.abs(next.level - shown.level) > 0.02 || Math.abs(next.line - shown.line) > 0.02 || Math.abs(next.push - shown.push) > 0.02) {
        shown = next;
        setMeter(next);
        onMeterRef.current?.(next);
      }
      if (heard.cheer) onCheerRef.current(heard.cheer);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening]);

  const start = useCallback(async () => {
    // One prompt at a time: a second tap while the browser is asking opens a second stream that
    // nothing ever closes.
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    try {
      await mic.start();
    } finally {
      openingRef.current = false;
      // And if they threw the cap while the prompt was open, the stream that arrives afterwards
      // has nobody listening to it. Close it, or the recording light stays on for the whole gift.
      if (goneRef.current) stopRef.current();
      else setOpening(false);
    }
  }, [mic]);

  return { state: mic.state, level: meter.level, line: meter.line, push: meter.push, opening, deaf, start, stop: mic.stop };
}
