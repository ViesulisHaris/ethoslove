"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftLocale, GiftMusic, GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { giftString } from "../_shared/i18n";
import { useSongPreview } from "../_shared/SongPreview";
import type { GiftAudio } from "../_shared/hooks/use-gift-audio";
import { mulberry32 } from "../_shared/random";
import { Scrap, Shot } from "../_shared/collage/kit";
import { Doodle } from "../_shared/collage/stationery";
import { trackLength, type Look } from "./looks";

/** A white die-cut edge round a cut-out, the way a printed sticker has one. Pass it as a Scrap's `tone`. */
export const STICKER = "drop-shadow(2.5px 0 0 #fff) drop-shadow(-2.5px 0 0 #fff) drop-shadow(0 2.5px 0 #fff) drop-shadow(0 -2.5px 0 #fff)";

/** How long the player pretends the song is when it can't know: 3:17. */
const SONG_SECONDS = 197;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

const ICON: Record<"prev" | "next" | "play" | "pause" | "shuffle" | "repeat", string> = {
  prev: "M6 5h2.2v14H6zM19 5v14L9.2 12z",
  next: "M15.8 5H18v14h-2.2zM5 5l9.8 7L5 19z",
  play: "M8 5.2v13.6L19 12z",
  pause: "M7 5h3.6v14H7zm6.4 0H17v14h-3.6z",
  shuffle: "M3 7h3.4c2.2 0 3.6 1.1 4.8 3l1.6 2.6c1.2 1.9 2.6 3 4.8 3H19M16.4 13.2 19 15.6l-2.6 2.6M3 17h3.4c1.6 0 2.8-.6 3.8-1.7M13.8 8.7c1-1.1 2.2-1.7 3.8-1.7H19M16.4 4.4 19 7l-2.6 2.6",
  repeat: "M4 11V9.4C4 7.5 5.5 6 7.4 6H19M16.4 3.4 19 6l-2.6 2.6M20 13v1.6c0 1.9-1.5 3.4-3.4 3.4H5M7.6 20.6 5 18l2.6-2.6",
};

function Icon({ name, color, className }: { name: keyof typeof ICON; color: string; className?: string }) {
  const stroked = name === "shuffle" || name === "repeat";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={ICON[name]} fill={stroked ? "none" : color} stroke={stroked ? color : "none"} strokeWidth={stroked ? 1.7 : 0} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One cumulus, flat underneath and heaped on top, lit white above and taking the sky's colour below.
 * Fractal noise pushes its edges about the way real cloud breaks up; that is what keeps it from
 * reading as a row of circles. It is drawn in the middle of a padded box so the pushed edges never
 * meet the edge of the svg.
 */
function Cloud({ id, seed, x, y, w, opacity, look }: { id: string; seed: number; x: number; y: number; w: number; opacity: number; look: Look }) {
  const random = mulberry32(seed);
  const count = 3 + Math.floor(random() * 3);
  const flat = 0.7 + random() * 0.5;
  const heads = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const r = (22 + random() * 16 + (1 - Math.abs(t - 0.5) * 2) * 30) * flat;
    return { cx: 64 + t * 192 + (random() - 0.5) * 24, cy: 102 - r * 0.75, r };
  });
  return (
    <svg viewBox="-80 -60 480 270" aria-hidden="true" className="absolute block overflow-visible" style={{ left: `${x}%`, top: `${y}%`, width: `${w * 1.5}%`, opacity }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".3" stopColor={look.clouds.top} />
          <stop offset=".85" stopColor={look.clouds.under} />
        </linearGradient>
        <filter id={`${id}f`} x="-30%" y="-50%" width="160%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves={4} seed={seed % 97} />
          <feDisplacementMap in="SourceGraphic" scale="64" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="3.6" />
        </filter>
      </defs>
      <g filter={`url(#${id}f)`} fill={`url(#${id}g)`}>
        <ellipse cx="160" cy="104" rx="132" ry={22 * flat + 6} />
        {heads.map((h, i) => (
          <circle key={i} cx={h.cx} cy={h.cy} r={h.r} />
        ))}
      </g>
    </svg>
  );
}

/** A long thin streak of cloud low over the horizon, catching the last of the light. */
function Streak({ id, seed, x, y, w, opacity, color }: { id: string; seed: number; x: number; y: number; w: number; opacity: number; color: string }) {
  return (
    <svg viewBox="-40 -40 400 110" aria-hidden="true" className="absolute block overflow-visible" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, opacity }}>
      <defs>
        <filter id={`${id}s`} x="-20%" y="-200%" width="140%" height="500%">
          <feTurbulence type="fractalNoise" baseFrequency="0.005 0.05" numOctaves={3} seed={seed % 97} />
          <feDisplacementMap in="SourceGraphic" scale="26" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="7 2.4" />
        </filter>
      </defs>
      <g filter={`url(#${id}s)`} fill={color}>
        <ellipse cx="160" cy="18" rx="150" ry="7" />
        <ellipse cx="210" cy="34" rx="110" ry="5" />
      </g>
    </svg>
  );
}

/**
 * A sky going down to the horizon, clouds across it, streaks low down and a few birds, the kind of
 * photo a "now playing" screen sits on. The same seed gives the same sky.
 */
export function Sky({ look, seed = 3, className, style, children }: { look: Look; seed?: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const random = mulberry32(seed);
  // Left and right in turn, high to low, so some always show past whatever stands in the middle.
  const clouds = Array.from({ length: 4 }, (_, i) => ({ seed: seed * 7 + i * 11, x: i % 2 ? 48 + random() * 26 : -22 + random() * 26, y: 8 + i * 19 + random() * 7, w: 36 + random() * 26, opacity: 0.8 + random() * 0.2 }));
  const streaks = [
    { seed: seed + 5, x: -10 + random() * 10, y: 78, w: 80, opacity: 0.8 },
    { seed: seed + 9, x: 34 + random() * 12, y: 85, w: 70, opacity: 0.7 },
  ];
  const birds = Array.from({ length: 5 }, () => ({ x: 26 + random() * 46, y: 8 + random() * 18, s: 0.7 + random() * 0.6 }));
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: `linear-gradient(180deg, ${look.sky[0]} 0%, ${look.sky[1]} 38%, ${look.sky[2]} 72%, ${look.sky[3]} 100%)`, ...style }}>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 block h-[45%]" style={{ background: `radial-gradient(80% 70% at 50% 100%, ${look.sky[3]}, transparent 70%)` }} />
      {streaks.map((st, i) => (
        <Streak key={`s${i}`} id={`${id}s${i}`} {...st} color={look.clouds.streak} />
      ))}
      {clouds.map((c, i) => (
        <Cloud key={i} id={`${id}c${i}`} {...c} look={look} />
      ))}
      {birds.map((b, i) => (
        <svg key={i} viewBox="0 0 20 8" aria-hidden="true" className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `calc(${2.4 * b.s} * var(--p))` }}>
          <path d="M1 6 Q5 1 10 5 Q15 1 19 6" fill="none" stroke={look.dark ? "rgba(255,230,240,.55)" : "rgba(50,35,70,.5)"} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ))}
      {children}
    </div>
  );
}

/** The thin player drawn over the sky in the corner: a bar at 0:16 of 3:17 and the five buttons. Decorative. */
export function MiniPlayer({ ink, className, style }: { ink: string; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={cn("absolute", className)} style={{ color: ink, ...style }}>
      <div className="relative h-[calc(.5*var(--p))] rounded-full" style={{ background: "rgba(255,255,255,.5)" }}>
        <span className="absolute inset-y-0 left-0 block w-[9%] rounded-full" style={{ background: ink }} />
        <span className="absolute top-1/2 left-[9%] block h-[calc(1.8*var(--p))] w-[calc(1.8*var(--p))] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: ink }} />
      </div>
      <div className="mt-[calc(.9*var(--p))] flex justify-between text-[calc(2.1*var(--p))] tabular-nums">
        <span>0:16</span>
        <span>3:17</span>
      </div>
      <div className="mt-[calc(1.4*var(--p))] flex items-center justify-between">
        <Icon name="shuffle" color={ink} className="h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
        <Icon name="prev" color={ink} className="h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
        <span className="grid h-[calc(8*var(--p))] w-[calc(8*var(--p))] place-items-center rounded-full" style={{ boxShadow: `inset 0 0 0 calc(.4*var(--p)) ${ink}` }}>
          <Icon name="pause" color={ink} className="h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
        </span>
        <Icon name="next" color={ink} className="h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
        <Icon name="repeat" color={ink} className="h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
      </div>
    </div>
  );
}

/** A sound wave of thin bars; the part already played is in the darker colour. */
export function Waveform({ seed, color, played, progress, className }: { seed: number; color: string; played: string; progress: number; className?: string }) {
  const random = mulberry32(seed);
  const bars = Array.from({ length: 48 }, (_, i) => 0.18 + random() * 0.82 * (0.55 + 0.45 * Math.abs(Math.sin(i / 3.4))));
  return (
    <svg viewBox="0 0 192 40" preserveAspectRatio="none" aria-hidden="true" className={className}>
      {bars.map((h, i) => (
        <rect key={i} x={i * 4} y={20 - h * 18} width="2.2" height={h * 36} rx="1.1" fill={i / bars.length < progress ? played : color} />
      ))}
    </svg>
  );
}

/** The round play button, black with a white glyph, as the inspiration draws it. */
function PlayButton({ playing, ink, onClick, label, big }: { playing: boolean; ink: string; onClick?: () => void; label?: string; big?: boolean }) {
  const size = big ? 12 : 10;
  const inner = (
    <>
      <span className="sr-only">{label}</span>
      <Icon name={playing ? "pause" : "play"} color="#FFFFFF" className="h-[45%] w-[45%]" />
    </>
  );
  const style: CSSProperties = { width: `calc(${size} * var(--p))`, height: `calc(${size} * var(--p))`, background: ink, boxShadow: "0 calc(.6*var(--p)) calc(1.4*var(--p)) rgba(0,0,0,.25)" };
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={label} className="grid place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-black/25" style={style}>
      {inner}
    </button>
  ) : (
    <span aria-hidden="true" className="grid place-items-center rounded-full" style={style}>
      {inner}
    </span>
  );
}

/** The row of controls under the wave: two hearts, back, play or pause, forward. */
function ControlsRow({ look, playing, onToggle, label, elapsed, total, progress, seed }: { look: Look; playing: boolean; onToggle?: () => void; label?: string; elapsed: number; total: number; progress: number; seed: number }) {
  const ink = look.playerInk;
  return (
    <div className="mt-[calc(2.6*var(--p))]">
      <Waveform seed={seed} color="rgba(0,0,0,.22)" played={ink} progress={progress} className="h-[calc(7*var(--p))] w-full" />
      <div className="mt-[calc(1.4*var(--p))] flex items-center gap-[calc(1.6*var(--p))] text-[calc(2.3*var(--p))] tabular-nums" style={{ color: ink }}>
        <span>{clock(elapsed)}</span>
        <span className="relative block h-[calc(.6*var(--p))] flex-1 rounded-full" style={{ background: "rgba(0,0,0,.14)" }}>
          <i className="absolute inset-y-0 left-0 block rounded-full transition-[width] duration-700 ease-linear" style={{ width: `${Math.max(2, progress * 100)}%`, background: ink }} />
          <i className="absolute top-1/2 block h-[calc(1.8*var(--p))] w-[calc(1.8*var(--p))] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-700 ease-linear" style={{ left: `${Math.max(2, progress * 100)}%`, background: ink }} />
        </span>
        <span>-{clock(Math.max(0, total - elapsed))}</span>
      </div>
      <div className="mt-[calc(2*var(--p))] flex items-center justify-between px-[calc(1*var(--p))]">
        <Doodle kind="heart" color={ink} className="h-[calc(4.4*var(--p))] w-[calc(4.4*var(--p))]" />
        <Icon name="prev" color={ink} className="h-[calc(5*var(--p))] w-[calc(5*var(--p))]" />
        <PlayButton playing={playing} ink={ink} onClick={onToggle} label={label} />
        <Icon name="next" color={ink} className="h-[calc(5*var(--p))] w-[calc(5*var(--p))]" />
        <Doodle kind="heart" color={ink} className="h-[calc(4.4*var(--p))] w-[calc(4.4*var(--p))]" />
      </div>
    </div>
  );
}

/** Controls for music that plays under the gift: the pause button really pauses, the clock runs while it plays. */
export function LibraryControls({ look, audio, live, labels, seed }: { look: Look; audio: GiftAudio; live: boolean; labels: { pause: string; play: string }; seed: number }) {
  const [elapsed, setElapsed] = useState(16);
  const running = live && audio.playing && !audio.muted;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((e) => (e + 1) % SONG_SECONDS), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return <ControlsRow look={look} playing={running} onToggle={live ? audio.toggleMute : undefined} label={running ? labels.pause : labels.play} elapsed={elapsed} total={SONG_SECONDS} progress={elapsed / SONG_SECONDS} seed={seed} />;
}

/**
 * Controls for a real song from Apple's catalogue: its 30-second preview plays only when this button is
 * tapped, once, and the card carries the link to the song on Apple Music and Apple's credit, as on every
 * other card that offers it (see useSongPreview).
 */
export function CatalogControls({ look, music, locale, live, seed }: { look: Look; music: GiftMusic; locale: GiftLocale; live: boolean; seed: number }) {
  const song = useSongPreview(music, locale);
  if (!song.trackUrl) return null;
  const elapsed = Math.round(song.progress * 30);
  return (
    <>
      {song.playable && song.state !== "error" ? (
        <ControlsRow look={look} playing={song.active} onToggle={live ? (song.active ? song.stop : song.play) : undefined} label={song.active ? giftString(locale, "songStop") : giftString(locale, "songPlay", { title: song.title })} elapsed={elapsed} total={30} progress={song.progress} seed={seed} />
      ) : (
        <p className="mt-[calc(2.4*var(--p))] text-[calc(2.6*var(--p))]" style={{ color: look.playerInk }}>
          {song.status}
        </p>
      )}
      <p className="mt-[calc(1.6*var(--p))] text-center text-[calc(2.2*var(--p))] leading-snug" style={{ color: look.playerInk }}>
        <a href={song.trackUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
          {giftString(locale, "listenOn", { provider: "Apple Music" })}
        </a>
        <span className="block opacity-70">{giftString(locale, "previewCourtesy")}</span>
      </p>
    </>
  );
}

/** Controls that only show: the first screen's, and a gift without a song. */
export function StillControls({ look, playing, seed }: { look: Look; playing: boolean; seed: number }) {
  return <ControlsRow look={look} playing={playing} elapsed={playing ? 1 : 0} total={SONG_SECONDS} progress={playing ? 0.06 : 0} seed={seed} />;
}

/**
 * The big player: their photo as the album cover inside a black square, a satin ribbon tied on the
 * corner, the song's title, their name written in as the artist, and whatever controls fit the music.
 */
export function PlayerFrame({ look, photo, title, artist, onOpen, still, controls, ribbon = true }: { look: Look; photo: GiftPhoto | undefined; title: string; artist: string; onOpen?: () => void; still: boolean; controls: ReactNode; ribbon?: boolean }) {
  return (
    <div className="relative w-full rounded-[calc(2.6*var(--p))] px-[calc(4.6*var(--p))] pt-[calc(5*var(--p))] pb-[calc(3.6*var(--p))]" style={{ background: `linear-gradient(165deg, rgba(255,255,255,.4), transparent 42%), ${look.player}`, color: look.playerInk, boxShadow: "0 calc(1.6*var(--p)) calc(3.6*var(--p)) rgba(90,30,60,.3), inset 0 0 0 1px rgba(255,255,255,.6)" }}>
      {ribbon ? (
        <span aria-hidden="true" className="absolute top-[calc(-4*var(--p))] left-[calc(-5*var(--p))] z-[2] block w-[calc(20*var(--p))] -rotate-[28deg]">
          <Scrap id="bow-satin-pink" eager />
        </span>
      ) : null}
      <div className="p-[calc(.9*var(--p))]" style={{ background: look.playerInk }}>
        <Shot photo={photo} aspect={1} onOpen={onOpen} still={still} />
      </div>
      <div className="mt-[calc(3*var(--p))] flex items-center justify-between gap-[calc(2*var(--p))]">
        <div className="min-w-0 flex-1">
          <p translate="no" className="truncate text-[calc(4.4*var(--p))] leading-tight font-semibold">
            {title}
          </p>
          <FitName as="p" min={0.7} className="w-full text-[calc(5.4*var(--p))] leading-[1.3]" style={{ fontFamily: SCRIPT_FONT }}>
            {artist}
          </FitName>
        </div>
        <Doodle kind="heart-fill" color={look.accent} className="h-[calc(6*var(--p))] w-[calc(6*var(--p))] shrink-0" />
      </div>
      {controls}
    </div>
  );
}

/** A round smiley sticker, cheeks and all, with the white die-cut edge. */
export function Smiley({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className} style={{ filter: `${STICKER} drop-shadow(0 2px 3px rgba(60,20,40,.25))` }}>
      <circle cx="20" cy="20" r="18" fill={color} />
      <circle cx="14" cy="16.5" r="2.3" fill="#2B1520" />
      <circle cx="26" cy="16.5" r="2.3" fill="#2B1520" />
      <path d="M12.4 23 Q20 30.5 27.6 23" fill="none" stroke="#2B1520" strokeWidth="2.3" strokeLinecap="round" />
      <ellipse cx="10.5" cy="22" rx="2.8" ry="1.7" fill="#FFFFFF" opacity=".35" />
      <ellipse cx="29.5" cy="22" rx="2.8" ry="1.7" fill="#FFFFFF" opacity=".35" />
    </svg>
  );
}

type PlaylistLabels = { playlist: string; songs: string; untitled: string };

/**
 * Their photos as a playlist: the cover, its name and whose it is, then every photo as a song with its
 * caption as the title and a length that never changes. A song opens its photo large.
 */
export function Playlist({ look, title, owner, cover, photos, seed, onOpen, labels }: { look: Look; title: string; owner: string; cover?: GiftPhoto; photos: GiftPhoto[]; seed: number; onOpen?: (photo: GiftPhoto) => void; labels: PlaylistLabels }) {
  const dark = look.dark;
  return (
    <div className="relative w-full rounded-[calc(2.6*var(--p))] p-[calc(4.4*var(--p))]" style={{ background: dark ? "#2F2648" : "#FFFFFF", color: dark ? "#F8E6EE" : look.ink, boxShadow: "0 calc(1.6*var(--p)) calc(3.6*var(--p)) rgba(90,30,60,.22)" }}>
      <div className="flex items-center gap-[calc(3.4*var(--p))]">
        <span className="block h-[calc(17*var(--p))] w-[calc(17*var(--p))] shrink-0 overflow-hidden rounded-[calc(1.4*var(--p))]" style={{ background: look.player }}>
          {cover ? <img src={cover.url} alt="" draggable={false} className="h-full w-full object-cover" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[calc(2.3*var(--p))] font-semibold tracking-[0.2em] uppercase opacity-60">{labels.playlist}</p>
          <FitName as="p" min={0.7} className="w-full text-[calc(7*var(--p))] leading-[1.2]" style={{ fontFamily: SCRIPT_FONT }}>
            {title}
          </FitName>
          <p className="truncate text-[calc(2.8*var(--p))] opacity-70">
            {owner} · {photos.length} {labels.songs}
          </p>
        </div>
      </div>
      <ol className="mt-[calc(4*var(--p))] flex flex-col gap-[calc(2.2*var(--p))]">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <button type="button" onClick={onOpen ? () => onOpen(photo) : undefined} disabled={!onOpen} aria-label={photo.caption || photo.alt || `${labels.untitled} ${i + 1}`} className="flex w-full items-center gap-[calc(2.8*var(--p))] text-left outline-none focus-visible:ring-4 focus-visible:ring-black/15 disabled:cursor-default">
              <span className="w-[calc(4*var(--p))] text-center text-[calc(3*var(--p))] tabular-nums opacity-55">{i + 1}</span>
              <img src={photo.url} alt="" draggable={false} className="h-[calc(11*var(--p))] w-[calc(11*var(--p))] shrink-0 rounded-[calc(1*var(--p))] object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[calc(3.6*var(--p))] font-semibold">{photo.caption || `${labels.untitled} ${i + 1}`}</span>
                <span className="block truncate text-[calc(2.8*var(--p))] opacity-60">{owner}</span>
              </span>
              <span className="text-[calc(2.8*var(--p))] tabular-nums opacity-60">{trackLength(seed, i)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A sticker that pops onto the first screen when play is pressed. */
export function PopSticker({ show, reduce, delay, className, style, children }: { show: boolean; reduce: boolean; delay: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <motion.div aria-hidden="true" className={cn("pointer-events-none absolute", className)} style={style} initial={false} animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 18, delay }}>
      {children}
    </motion.div>
  );
}
