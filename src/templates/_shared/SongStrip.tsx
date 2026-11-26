"use client";
/* eslint-disable @next/next/no-img-element -- the cover comes from Apple's own image CDN */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Music2, Play, VolumeX } from "lucide-react";
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
 * On the screen a gift opens from (`onCover`) it is a sound button under "Tap to open": the
 * unmute button the owner drew on 26 Nov 2026. When the gift opens it glides to the top corner and
 * becomes the small pill. Nothing plays until the recipient taps it, in either place; then Apple's
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

/**
 * One player for the page, whichever strip shows it: the sound button on the screen a gift opens
 * from (the gift page's own gate, or a cover inside the gift) and the pill in the opened gift are
 * different pieces of the page, and the song must not stop or start over between them.
 */
const OWNER = {};
let player: { url: string; state: State; audio: HTMLAudioElement | null } = { url: "", state: "idle", audio: null };
const watchers = new Set<() => void>();
let strips = 0;
let leaving = 0;
let wired = false;
const setPlayer = (next: Partial<typeof player>) => {
  player = { ...player, ...next };
  for (const watcher of [...watchers]) watcher();
};
const stopSong = (state: State) => {
  const audio = player.audio;
  if (audio && !audio.paused) audio.pause();
  releaseSound(OWNER);
  if (player.state !== state) setPlayer({ state });
};
/** Stopped by anything else that makes a sound (the end screen's card, a video, the voice message) and by the tab going to the background. */
function wire() {
  if (wired) return;
  wired = true;
  onSoundClaimed((_kind, by) => {
    if (by !== OWNER && player.state === "playing") stopSong("done");
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && player.state === "playing") stopSong("done");
  });
}
function playSong(url: string) {
  if (player.state !== "idle") return;
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
    if (player.audio === audio) stopSong("done");
  };
  audio.addEventListener("ended", end);
  audio.addEventListener("error", end);
  // The level between the browser's own timeupdates (four a second), so the fades are smooth.
  const smooth = () => {
    if (player.audio !== audio || audio.paused) return;
    level();
    requestAnimationFrame(smooth);
  };
  audio.addEventListener("playing", () => requestAnimationFrame(smooth));
  audio.src = url;
  claimSound("songPreview", OWNER);
  setPlayer({ url, state: "playing", audio });
  audio.play().catch(end);
}
/** This page's player for `url`: a new gift (another song) starts idle; the gift left for good, it is let go. */
function useSongPlayer(url: string): State {
  useEffect(() => {
    wire();
    window.clearTimeout(leaving);
    strips++;
    if (player.url !== url) {
      stopSong("idle");
      const audio = player.audio;
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      setPlayer({ url, state: "idle", audio: null });
    }
    return () => {
      strips--;
      // Not at once: the gate's button goes and the gift's pill comes in the same breath.
      leaving = window.setTimeout(() => {
        if (strips > 0) return;
        stopSong("idle");
        const audio = player.audio;
        if (audio) {
          audio.removeAttribute("src");
          audio.load();
        }
        player = { url: "", state: "idle", audio: null };
      }, 1500);
    };
  }, [url]);
  const subscribe = (watcher: () => void) => {
    watchers.add(watcher);
    return () => void watchers.delete(watcher);
  };
  const state = useSyncExternalStore(subscribe, () => (player.url === url ? player.state : "idle"), () => "idle" as State);
  return state;
}

/** Keeps the page's player while the gift page is up, so the song plays on while the gate has gone and the gift is still loading. Draws nothing. */
export function SongHold({ music }: { music: GiftMusic }) {
  useSongPlayer(music.url);
  return null;
}

export function SongStrip({ music, locale, onCover = false }: { music: GiftMusic; locale: GiftLocale; onCover?: boolean }) {
  const state = useSongPlayer(music.url);
  const [away, setAway] = useState(false);
  const [under, setUnder] = useState(false);
  const [artFailed, setArtFailed] = useState(false);
  const pill = useRef<HTMLDivElement>(null);
  const trackUrl = appleMusicTrackUrl(music, locale);
  const playable = isApplePreviewUrl(music.url) && trackUrl !== null;
  const artwork = music.artwork && isSongThumbnail(music.artwork) && !artFailed ? music.artwork : null;
  const title = music.title?.trim() || giftString(locale, "aSongForYou");

  // Playing, the pill goes with the first scroll or the first tap on the gift itself.
  useEffect(() => {
    // Not on the opening screen: the tap that opens the gift is not a tap on the gift.
    if (state !== "playing" || away || onCover) return;
    const gift = pill.current?.closest<HTMLElement>(".gift-root");
    if (!gift) return;
    const hide = (event: Event) => {
      if (event.target instanceof Node && pill.current?.contains(event.target)) return;
      setAway(true);
    };
    // Not at once: the tap that started the song, or the one that opened the gift, is still on its way up,
    // and the pill is still gliding to its corner.
    const later = window.setTimeout(() => {
      gift.addEventListener("scroll", hide, { capture: true, passive: true });
      gift.addEventListener("wheel", hide, { capture: true, passive: true });
      gift.addEventListener("touchmove", hide, { capture: true, passive: true });
      gift.addEventListener("pointerdown", hide, { capture: true, passive: true });
    }, 900);
    return () => {
      window.clearTimeout(later);
      gift.removeEventListener("scroll", hide, { capture: true });
      gift.removeEventListener("wheel", hide, { capture: true });
      gift.removeEventListener("touchmove", hide, { capture: true });
      gift.removeEventListener("pointerdown", hide, { capture: true });
    };
  }, [state, away, onCover]);

  // Never on one of the gift's own controls.
  const shown = playable && state !== "done" && !away;
  useEffect(() => {
    // On the opening screen it has its own place, clear of "Tap to open".
    if (!shown || onCover) return;
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
  }, [shown, onCover]);

  if (!shown) return null;

  const play = () => playSong(music.url);

  const playing = state === "playing";
  return (
    <div
      ref={pill}
      data-song-strip={state}
      data-place={onCover ? "cover" : "corner"}
      translate="no"
      // A tap on it is never a tap on the opening screen under it.
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      className={cn(
        "absolute flex items-center gap-1.5 rounded-full bg-white/85 pr-1 pl-1 text-[#1A1614] shadow-[0_6px_18px_-10px_rgba(0,0,0,0.6)] ring-1 ring-black/10 backdrop-blur-md transition-[top,left,translate,max-width,height,opacity] duration-500 ease-out motion-reduce:transition-none",
        onCover ? "z-[75] h-9 max-w-[64%] -translate-x-1/2" : "z-[55] h-7 max-w-[27%] translate-x-0",
        under && !onCover ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={onCover ? { top: "77%", left: "50%" } : { top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)", left: "0.75rem" }}
    >
      <span className="relative block size-5 shrink-0 overflow-hidden rounded-[6px]" style={{ background: "var(--gift-accent-pale, #f6dfe6)" }}>
        {artwork ? (
          <img src={artwork} alt="" onError={() => setArtFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center" aria-hidden="true">
            <Music2 className="size-3" style={{ color: "var(--gift-accent-deep, #8f1f47)" }} />
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
              <i key={i} className="block w-[1.5px] origin-bottom rounded-full motion-safe:animate-pulse" style={{ height: `${h * 100}%`, background: "var(--gift-accent, #bd2a5e)", animationDelay: `${i * 160}ms` }} />
            ))}
          </span>
          <span className="truncate font-semibold">{title}</span>
          <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" style={{ color: "var(--gift-accent-deep, #8f1f47)" }} />
        </a>
      ) : (
        <button
          type="button"
          onClick={play}
          aria-label={giftString(locale, "songPlay", { title })}
          className="relative flex min-w-0 items-center gap-1 rounded-full pr-1.5 text-[11px] before:absolute before:-inset-2.5 before:content-[''] leading-none font-semibold outline-none focus-visible:ring-2 focus-visible:ring-black/40"
        >
          <span className={cn("grid shrink-0 place-items-center rounded-full", onCover ? "size-5" : "size-4")} style={{ background: "var(--gift-accent, #bd2a5e)", color: "var(--gift-on-accent, #fff)" }}>
            {onCover ? <VolumeX aria-hidden="true" className="size-3" strokeWidth={2.2} /> : <Play aria-hidden="true" className="ml-px size-2 fill-current" />}
          </span>
          <span className="truncate">{title}</span>
        </button>
      )}
    </div>
  );
}
