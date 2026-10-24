"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GiftMusic } from "@/lib/gift/schema";
import { backgroundMusic } from "@/lib/gift/music";

export type GiftAudio = {
  /** Call from a user gesture (autoplay policies). Safe to call repeatedly. */
  start: () => Promise<void>;
  toggleMute: () => void;
  muted: boolean;
  playing: boolean;
  hasMusic: boolean;
};

const FADE_MS = 1600;

/**
 * Whether the recipient has muted this gift. The pieces every template shares (the present on the
 * end screen) make a sound of their own and are nowhere near the template's audio, so the mute
 * button is remembered here, where they can ask it. A new gift, or a replay, starts unmuted.
 */
let giftMuted = false;
export const isGiftMuted = (): boolean => giftMuted;

/**
 * Background music with fade-in, start offset, loop and tab-visibility pause.
 *
 * Only a library track or the sender's own file: a real song from Apple's catalogue never plays
 * here, on any template, however old the gift. It waits on the end screen for a tap instead
 * (`SongPreviewCard`), and `hasMusic` is false, so nothing claims it is playing.
 *
 * `ceiling` is how loud the song may get, 0 to 1. A gift with noises of its own leaves the song room: the
 * library songs peak at 0 dBFS, so a bell on top of one adds up past full scale and clips in the speaker.
 * (Browsers on an iPhone ignore an audio element's volume, so there it only helps the ones that honour it.)
 */
export function useGiftAudio(songOrMusic: GiftMusic | undefined, enabled = true, ceiling = 1): GiftAudio {
  const music = backgroundMusic(songOrMusic);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const fadeRef = useRef<number | null>(null);
  const startAt = music?.startAt ?? 0;

  useEffect(() => {
    giftMuted = false;
    if (!music || !enabled) return;
    const audio = new Audio(music.url);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onVisibility = () => {
      if (document.hidden) audio.pause();
      else if (!audio.muted && audio.currentTime > 0) audio.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [music, enabled]);

  const fadeIn = useCallback((audio: HTMLAudioElement) => {
    const startedAt = performance.now();
    const tick = () => {
      const t = Math.min(1, (performance.now() - startedAt) / FADE_MS);
      audio.volume = t * t * ceiling;
      if (t < 1) fadeRef.current = requestAnimationFrame(tick);
    };
    fadeRef.current = requestAnimationFrame(tick);
  }, [ceiling]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    try {
      if (audio.currentTime === 0 && startAt > 0) audio.currentTime = startAt;
      await audio.play();
      setPlaying(true);
      fadeIn(audio);
    } catch {
      // Autoplay blocked — the next gesture will retry.
      setPlaying(false);
    }
  }, [fadeIn, startAt]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    giftMuted = audio.muted;
    setMuted(audio.muted);
    if (!audio.muted && audio.paused) audio.play().catch(() => {});
  }, []);

  return { start, toggleMute, muted, playing, hasMusic: Boolean(music) };
}
