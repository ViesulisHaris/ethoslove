"use client";
/* eslint-disable @next/next/no-img-element -- the cover comes from Apple's own image CDN */

import { useEffect, useRef, useState } from "react";
import { Loader2, Music2, Play, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { GiftLocale, GiftMusic } from "@/lib/gift/schema";
import { appleMusicTrackUrl, isApplePreviewUrl } from "@/lib/gift/music";
import { isSongThumbnail } from "@/lib/gift/song-link";
import { cn } from "@/lib/utils";
import { giftString } from "./i18n";
import { claimSound, onSoundClaimed, releaseSound } from "./sound-floor";

export type PreviewState = "idle" | "loading" | "playing" | "ended" | "error";

/** The equaliser's resting heights; they only move while the song plays and motion is allowed. */
const BARS = [0.45, 1, 0.7, 0.3];

/** One preview's playback, shared by every card that offers it (the end screen's, a collage's player). */
export type SongPreview = {
  /** The song's page on Apple Music; without it there is no card at all. */
  trackUrl: string | null;
  playable: boolean;
  state: PreviewState;
  progress: number;
  active: boolean;
  title: string;
  artwork: string | null;
  onArtError: () => void;
  status: string;
  play: () => void;
  stop: () => void;
};

/**
 * Apple lets us use its 30-second previews only to promote the track, so a preview plays only
 * when the recipient taps its card, plays once and stops (no loop, no autoplay), never under a
 * video (./sound-floor), and its card always carries the link to the song on Apple Music and the
 * "Preview courtesy of Apple Music" credit. The audio isn't even fetched until that tap.
 */
export function useSongPreview(music: GiftMusic, locale: GiftLocale): SongPreview {
  const [state, setState] = useState<PreviewState>("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Who this card is, for the sound floor: a stable object of its own.
  const [owner] = useState(() => ({}));
  const trackUrl = appleMusicTrackUrl(music, locale);
  // No link to the track, no preview: Apple allows one only beside the way to the song itself.
  const playable = isApplePreviewUrl(music.url) && trackUrl !== null;
  // Covers only from the providers' CDNs (a gift's data is whatever the sender's client sent), and
  // the drawn note instead of a broken image if Apple's CDN doesn't answer.
  const [artFailed, setArtFailed] = useState(false);
  const artwork = music.artwork && isSongThumbnail(music.artwork) && !artFailed ? music.artwork : null;
  const title = music.title?.trim() || giftString(locale, "aSongForYou");
  const active = state === "loading" || state === "playing";

  useEffect(() => {
    const stop = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      releaseSound(owner);
      setState((s) => (s === "loading" || s === "playing" ? "idle" : s));
      setProgress(0);
    };
    // A video or the voice message starting, or the tab going to the background, stops the song.
    const off = onSoundClaimed((_kind, by) => {
      if (by !== owner) stop();
    });
    const onVisibility = () => document.hidden && stop();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisibility);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = null;
      releaseSound(owner);
    };
  }, [owner]);

  const stopHere = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    releaseSound(owner);
    setState("idle");
    setProgress(0);
  };

  /** Made on the first tap, so nothing is fetched from Apple until the recipient asks for it. */
  const createAudio = () => {
    const el = new Audio();
    el.preload = "auto";
    // Apple's rule, not a taste: a preview is heard once per tap, never on a loop.
    el.loop = false;
    el.addEventListener("playing", () => setState("playing"));
    el.addEventListener("timeupdate", () => setProgress(el.duration ? Math.min(1, el.currentTime / el.duration) : 0));
    el.addEventListener("ended", () => {
      releaseSound(owner);
      setState("ended");
      setProgress(0);
    });
    el.addEventListener("error", () => {
      releaseSound(owner);
      setState("error");
      setProgress(0);
    });
    el.src = music.url;
    audioRef.current = el;
    return el;
  };

  const play = () => {
    // Always from the top: stopping rewinds it, and play() after the end starts over by itself.
    const audio = audioRef.current ?? createAudio();
    claimSound("songPreview", owner);
    setState("loading");
    audio.play().catch((error: unknown) => {
      // Stopping it before it started rejects with AbortError: that's the recipient's choice, not a fault.
      if (error instanceof DOMException && error.name === "AbortError") return;
      releaseSound(owner);
      setState("error");
    });
  };

  const status =
    state === "loading"
      ? giftString(locale, "songLoading")
      : state === "playing"
        ? giftString(locale, "songPlaying")
        : state === "ended"
          ? giftString(locale, "songAgain")
          : state === "error" || !playable
            ? giftString(locale, "songUnavailable")
            : giftString(locale, "songTapToHear");

  return { trackUrl, playable, state, progress, active, title, artwork, onArtError: () => setArtFailed(true), status, play, stop: stopHere };
}

/** "A song for you": the real song the sender picked, as a card on the end screen. */
export function SongPreviewCard({ music, locale, dark }: { music: GiftMusic; locale: GiftLocale; dark: boolean }) {
  const reduce = useReducedMotion();
  const { trackUrl, playable, state, progress, active, title, artwork, onArtError, status, play, stop } = useSongPreview(music, locale);

  // Neither a preview we may play nor a song to send them to (only a hand-made request gets here).
  if (!trackUrl) return null;

  const ring = `conic-gradient(var(--gift-accent) ${Math.round(progress * 360)}deg, ${dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)"} 0)`;

  return (
    <motion.section
      aria-label={giftString(locale, "aSongForYou")}
      className={cn(
        "relative mt-7 w-full max-w-xs overflow-hidden rounded-[22px] px-4 pt-3.5 pb-3 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] ring-1",
        dark ? "bg-white/[0.08] text-white ring-white/15 backdrop-blur-md" : "bg-white text-[#1A1614] ring-black/10",
      )}
      initial={reduce ? false : { opacity: 0, y: 18, rotate: 1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: "spring", stiffness: 120, damping: 16 }}
      data-testid="song-preview"
    >
      <p className={cn("text-center text-[1.4rem] leading-tight", dark ? "text-white/90" : "text-[#1A1614]")} style={{ fontFamily: "var(--gift-font-hand)" }}>
        {giftString(locale, "aSongForYou")}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-[12px] shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)]" style={{ background: "var(--gift-accent-pale)" }}>
          {artwork ? (
            <img src={artwork} alt="" loading="lazy" onError={onArtError} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center" aria-hidden="true">
              <Music2 className="size-6" style={{ color: "var(--gift-accent-deep)" }} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p translate="no" className="truncate text-[15px] leading-snug font-semibold">
            {title}
          </p>
          {music.artist ? (
            <p translate="no" className={cn("truncate text-[13px] leading-snug", dark ? "text-white/60" : "text-black/55")}>
              {music.artist}
            </p>
          ) : null}
          <p className={cn("mt-1 flex items-center gap-1.5 text-xs", dark ? "text-white/60" : "text-black/50")} aria-live="polite">
            {state === "playing" ? (
              <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
                {BARS.map((h, i) => (
                  <motion.i
                    key={i}
                    className="block w-[2px] origin-bottom rounded-full"
                    style={{ height: `${h * 100}%`, background: "var(--gift-accent)" }}
                    animate={reduce ? undefined : { scaleY: [1, 0.35, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.14 }}
                  />
                ))}
              </span>
            ) : null}
            <span className="min-w-0">{status}</span>
          </p>
        </div>
        {playable ? (
          <button
            type="button"
            onClick={active ? stop : play}
            aria-label={active ? giftString(locale, "songStop") : giftString(locale, "songPlay", { title })}
            className={cn(
              "relative grid size-12 shrink-0 place-items-center rounded-full p-[3px] outline-none focus-visible:ring-4",
              dark ? "focus-visible:ring-white/50" : "focus-visible:ring-black/25",
            )}
            style={{ background: ring }}
          >
            <span className="grid size-full place-items-center rounded-full" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}>
              {state === "loading" ? (
                <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : state === "playing" ? (
                <Square className="size-3.5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="ml-0.5 size-4 fill-current" aria-hidden="true" />
              )}
            </span>
          </button>
        ) : null}
      </div>

      <a
        href={trackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-3.5 flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold outline-none focus-visible:ring-4",
          dark ? "bg-white text-black focus-visible:ring-white/50" : "bg-black text-white focus-visible:ring-black/25",
        )}
      >
        <Music2 className="size-4" aria-hidden="true" />
        {giftString(locale, "listenOn", { provider: "Apple Music" })}
      </a>
      <p className={cn("mt-2 text-center text-[11px]", dark ? "text-white/50" : "text-black/45")}>{giftString(locale, "previewCourtesy")}</p>
    </motion.section>
  );
}
