"use client";
/* eslint-disable @next/next/no-img-element -- the cover comes from Apple's own image CDN */

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Music2, Play } from "lucide-react";
import type { GiftLocale, GiftMusic } from "@/lib/gift/schema";
import { appleMusicTrackUrl, isApplePreviewUrl } from "@/lib/gift/music";
import { isSongThumbnail } from "@/lib/gift/song-link";
import { cn } from "@/lib/utils";
import { giftString } from "./i18n";
import { claimSound, onSoundClaimed, releaseSound } from "./sound-floor";
import { GIFT_CONTROLS, coversControl } from "./watermark-spot";

/**
 * The real song, heard once while the gift is read (the owner, 26 Nov 2026). Off unless
 * NEXT_PUBLIC_SONG_STRIP is "1": without it nothing here is drawn and a gift is exactly as it was.
 *
 * A small pill in the gift's top corner. Nothing plays until the recipient taps it; then Apple's
 * 30-second preview fades in, plays once, fades out and stops (never a loop). While it plays the pill
 * shows the song's name beside a link to it on Apple Music, which is what lets a preview be heard at
 * all (./SongPreview.tsx, lib/gift/music.ts). The first scroll or tap inside the gift after that
 * puts the pill away; the song plays on to its end. The end screen's "a song for you" card is as it
 * was, and takes the floor from this one (./sound-floor.ts), as a video or the voice message does.
 *
 * It never sits on one of the gift's own controls: while one is under it, it stands down, as the
 * "Made with Ethos" badge does (./watermark-spot.ts).
 */
export const songStripOn = (raw: string | undefined = process.env.NEXT_PUBLIC_SONG_STRIP): boolean => raw === "1";

/** Seconds: in at the start, out before the preview's own end. */
const FADE_IN = 1.2;
const FADE_OUT = 2.5;

type State = "idle" | "playing" | "done";

export function SongStrip({ music, locale }: { music: GiftMusic; locale: GiftLocale }) {
  const [state, setState] = useState<State>("idle");
  const [away, setAway] = useState(false);
  const [under, setUnder] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pill = useRef<HTMLDivElement>(null);
  const [owner] = useState(() => ({}));
  const trackUrl = appleMusicTrackUrl(music, locale);
  const playable = isApplePreviewUrl(music.url) && trackUrl !== null;
  const artwork = music.artwork && isSongThumbnail(music.artwork) && !artFailed ? music.artwork : null;
  const title = music.title?.trim() || giftString(locale, "aSongForYou");

  // Stopped by anything else that makes a sound (the end screen's card, a video, the voice message), by
  // the tab going to the background, and when the gift is left.
  useEffect(() => {
    const stop = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      audio.pause();
      releaseSound(owner);
      setState("done");
    };
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

  // Playing, the pill goes with the first scroll or the first tap on the gift itself.
  useEffect(() => {
    if (state !== "playing" || away) return;
    const gift = pill.current?.closest<HTMLElement>(".gift-root");
    if (!gift) return;
    const hide = (event: Event) => {
      if (event.target instanceof Node && pill.current?.contains(event.target)) return;
      setAway(true);
    };
    // Not at once: the tap that started the song is still on its way up.
    const later = window.setTimeout(() => {
      gift.addEventListener("scroll", hide, { capture: true, passive: true });
      gift.addEventListener("wheel", hide, { capture: true, passive: true });
      gift.addEventListener("touchmove", hide, { capture: true, passive: true });
      gift.addEventListener("pointerdown", hide, { capture: true, passive: true });
    }, 400);
    return () => {
      window.clearTimeout(later);
      gift.removeEventListener("scroll", hide, { capture: true });
      gift.removeEventListener("wheel", hide, { capture: true });
      gift.removeEventListener("touchmove", hide, { capture: true });
      gift.removeEventListener("pointerdown", hide, { capture: true });
    };
  }, [state, away]);

  // Never on one of the gift's own controls.
  const shown = playable && state !== "done" && !away;
  useEffect(() => {
    if (!shown) return;
    const look = () => {
      const el = pill.current;
      const gift = el?.closest<HTMLElement>(".gift-root");
      if (!el || !gift) return;
      const spot = el.getBoundingClientRect();
      const area = gift.getBoundingClientRect();
      const covered = [...gift.querySelectorAll(GIFT_CONTROLS)].some((control) => !el.contains(control) && coversControl(spot, control.getBoundingClientRect(), area));
      setUnder(covered);
    };
    look();
    const timer = window.setInterval(look, 400);
    return () => window.clearInterval(timer);
  }, [shown]);

  if (!shown) return null;

  const play = () => {
    if (state !== "idle") return;
    const audio = new Audio();
    audio.preload = "auto";
    // Apple's rule: heard once, never on a loop.
    audio.loop = false;
    audio.volume = 0;
    const level = () => {
      const left = Number.isFinite(audio.duration) ? audio.duration - audio.currentTime : Infinity;
      audio.volume = Math.max(0, Math.min(1, audio.currentTime / FADE_IN, left / FADE_OUT));
    };
    audio.addEventListener("timeupdate", level);
    const end = () => {
      releaseSound(owner);
      setState("done");
    };
    audio.addEventListener("ended", end);
    audio.addEventListener("error", end);
    audio.src = music.url;
    audioRef.current = audio;
    claimSound("songPreview", owner);
    setState("playing");
    audio.play().catch(end);
    // The level between the browser's own timeupdates (four a second), so the fades are smooth.
    const smooth = () => {
      if (audioRef.current !== audio || audio.paused) return;
      level();
      requestAnimationFrame(smooth);
    };
    audio.addEventListener("playing", () => requestAnimationFrame(smooth));
  };

  const playing = state === "playing";
  return (
    <div
      ref={pill}
      data-song-strip={state}
      translate="no"
      className={cn(
        "absolute left-3 z-[55] flex h-7 max-w-[27%] items-center gap-1.5 rounded-full bg-white/85 pr-1 pl-1 text-[#1A1614] shadow-[0_6px_18px_-10px_rgba(0,0,0,0.6)] ring-1 ring-black/10 backdrop-blur-md transition-opacity duration-300 motion-reduce:transition-none",
        under ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      <span className="relative block size-5 shrink-0 overflow-hidden rounded-[6px]" style={{ background: "var(--gift-accent-pale)" }}>
        {artwork ? (
          <img src={artwork} alt="" onError={() => setArtFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center" aria-hidden="true">
            <Music2 className="size-3" style={{ color: "var(--gift-accent-deep)" }} />
          </span>
        )}
      </span>
      {playing ? (
        <a
          href={trackUrl!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${title}${music.artist ? `, ${music.artist}` : ""}. ${giftString(locale, "listenOn", { provider: "Apple Music" })}`}
          className="flex min-w-0 items-center gap-1 rounded-full pr-1 text-[11px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        >
          <span aria-hidden="true" className="flex h-2.5 shrink-0 items-end gap-[1.5px]">
            {[0.5, 1, 0.7].map((h, i) => (
              <i key={i} className="block w-[1.5px] origin-bottom rounded-full motion-safe:animate-pulse" style={{ height: `${h * 100}%`, background: "var(--gift-accent)", animationDelay: `${i * 160}ms` }} />
            ))}
          </span>
          <span className="truncate font-semibold">{title}</span>
          <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" style={{ color: "var(--gift-accent-deep)" }} />
        </a>
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={giftString(locale, "songPlay", { title })}
          className="relative flex min-w-0 items-center gap-1 rounded-full pr-1.5 text-[11px] before:absolute before:-inset-2.5 before:content-[''] leading-none font-semibold outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        >
          <span className="grid size-4 shrink-0 place-items-center rounded-full" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}>
            <Play aria-hidden="true" className="ml-px size-2 fill-current" />
          </span>
          <span className="truncate">{title}</span>
        </button>
      )}
    </div>
  );
}
