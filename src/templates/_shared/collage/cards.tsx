"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { GiftMusic, GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { GiftAudio } from "../hooks/use-gift-audio";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** How long the card pretends the song is: nobody knows the real length before it has played. */
const SONG_SECONDS = 209;

/**
 * Their song as a player card: cover, title, a bar that fills while it plays, and a pause button
 * that really pauses. Drawn from scratch, so it belongs to no particular music app.
 */
export function MusicCard({ music, audio, cover, live, labels, colors }: { music: GiftMusic; audio: GiftAudio; cover?: GiftPhoto; live: boolean; labels: { pause: string; play: string }; colors: { card: string; ink: string; soft: string; bar: string } }) {
  const [elapsed, setElapsed] = useState(3);
  const running = live && audio.playing && !audio.muted;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((e) => (e + 1) % SONG_SECONDS), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const pct = Math.max(2, (elapsed / SONG_SECONDS) * 100);

  return (
    <div className="w-full rounded-[calc(3*var(--p))] px-[calc(3.4*var(--p))] pt-[calc(3.2*var(--p))] pb-[calc(3*var(--p))]" style={{ background: colors.card, color: colors.ink, boxShadow: "0 calc(1.4*var(--p)) calc(3*var(--p)) rgba(60,20,40,.26), inset 0 0 0 1px rgba(255,255,255,.5)" }}>
      <div className="flex items-center gap-[calc(2.6*var(--p))]">
        <span className="relative block h-[calc(11*var(--p))] w-[calc(11*var(--p))] shrink-0 overflow-hidden rounded-[calc(1.4*var(--p))] bg-black/10">
          {cover ? <img src={cover.url} alt="" draggable={false} className="h-full w-full object-cover" /> : null}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[calc(3.5*var(--p))] leading-tight font-semibold">{music.title ?? "—"}</span>
          <span className="block truncate text-[calc(3*var(--p))] leading-tight" style={{ color: colors.soft }}>
            {music.artist ?? " "}
          </span>
        </span>
        <span aria-hidden="true" className="flex h-[calc(4*var(--p))] items-end gap-[calc(.5*var(--p))]">
          {[0.5, 1, 0.7, 0.35].map((h, i) => (
            <i key={i} className={cn("block w-[calc(.6*var(--p))] origin-bottom rounded-full", running && "cl-eq")} style={{ height: `${h * 100}%`, background: colors.soft, animationDelay: `${i * 0.14}s` }} />
          ))}
        </span>
      </div>
      <div className="mt-[calc(2.6*var(--p))] flex items-center gap-[calc(1.6*var(--p))] text-[calc(2.3*var(--p))] tabular-nums" style={{ color: colors.soft }}>
        <span>{clock(elapsed)}</span>
        <span className="relative block h-[calc(.7*var(--p))] flex-1 overflow-hidden rounded-full bg-black/10">
          <i className="absolute inset-y-0 left-0 block rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%`, background: colors.bar }} />
        </span>
        <span>-{clock(SONG_SECONDS - elapsed)}</span>
      </div>
      <div className="mt-[calc(1.6*var(--p))] flex items-center justify-center gap-[calc(7*var(--p))]">
        <Glyph d="M21 5v14l-9-7zM11 5v14L2 12z" soft={colors.soft} />
        <button type="button" onClick={live ? audio.toggleMute : undefined} aria-label={running ? labels.pause : labels.play} className="grid h-[calc(8*var(--p))] w-[calc(8*var(--p))] place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-black/25">
          <svg viewBox="0 0 24 24" className="h-[calc(5.4*var(--p))] w-[calc(5.4*var(--p))]" aria-hidden="true">
            {running ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill={colors.ink} /> : <path d="M7 4l13 8-13 8z" fill={colors.ink} />}
          </svg>
        </button>
        <Glyph d="M3 5v14l9-7zM13 5v14l9-7z" soft={colors.ink} />
      </div>
    </div>
  );
}

const Glyph = ({ d, soft }: { d: string; soft: string }) => (
  <svg viewBox="0 0 24 24" className="h-[calc(4.4*var(--p))] w-[calc(4.4*var(--p))]" aria-hidden="true">
    <path d={d} fill={soft} />
  </svg>
);

/** A postcard: a few words in handwriting on the left, a stamp and address lines on the right. */
export function Postcard({ children, stamp, paper = "#F6EFDF", ink = "#2E2622", className }: { children: ReactNode; stamp: ReactNode; paper?: string; ink?: string; className?: string }) {
  return (
    <div className={cn("relative flex w-full", className)} style={{ aspectRatio: "1.52", backgroundColor: paper, color: ink, boxShadow: "0 calc(1.2*var(--p)) calc(2.6*var(--p)) rgba(40,18,22,.28)", backgroundImage: "radial-gradient(rgba(120,90,60,.10) 1px, transparent 1px)", backgroundSize: "calc(1.4*var(--p)) calc(1.4*var(--p))" }}>
      <p className="w-[58%] self-center px-[calc(3.2*var(--p))] text-left text-[calc(4.5*var(--p))] leading-[1.2]" style={{ fontFamily: "var(--gift-font-hand)" }}>
        {children}
      </p>
      <span aria-hidden="true" className="my-[7%] w-px bg-current opacity-30" />
      <div className="relative flex-1">
        <div className="absolute top-[9%] right-[9%] w-[36%]">{stamp}</div>
        <div className="absolute inset-x-[10%] bottom-[14%] flex flex-col gap-[calc(2.6*var(--p))]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-px bg-current opacity-35" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A postage stamp with a perforated edge; whatever you put in it is the picture. */
export function Stamp({ color, children }: { color: string; children: ReactNode }) {
  const edge: CSSProperties = { background: `radial-gradient(circle at 50% 50%, transparent 0 calc(.55*var(--p)), #FFFDF8 calc(.6*var(--p))) 0 0 / calc(1.6*var(--p)) calc(1.6*var(--p))` };
  return (
    <span className="block p-[calc(.8*var(--p))]" style={{ ...edge, rotate: "4deg", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.2))" }}>
      <span className="grid aspect-[4/5] w-full place-items-center" style={{ background: color }}>
        {children}
      </span>
    </span>
  );
}

/** An admission ticket with bitten corners and a numbered stub. */
export function Ticket({ line, number, paper, ink, font }: { line: string; number: string; paper: string; ink: string; font: string }) {
  const bite = "radial-gradient(circle at 0 0, transparent 0 calc(1.7*var(--p)), #000 calc(1.75*var(--p))) top left / 51% 51% no-repeat, radial-gradient(circle at 100% 0, transparent 0 calc(1.7*var(--p)), #000 calc(1.75*var(--p))) top right / 51% 51% no-repeat, radial-gradient(circle at 0 100%, transparent 0 calc(1.7*var(--p)), #000 calc(1.75*var(--p))) bottom left / 51% 51% no-repeat, radial-gradient(circle at 100% 100%, transparent 0 calc(1.7*var(--p)), #000 calc(1.75*var(--p))) bottom right / 51% 51% no-repeat";
  return (
    <div className="w-full" style={{ filter: "drop-shadow(0 calc(.7*var(--p)) calc(1.2*var(--p)) rgba(40,18,22,.28))" }}>
      <div className="flex w-full items-stretch" style={{ aspectRatio: "1.78", background: paper, color: ink, WebkitMask: bite, mask: bite }}>
        <p className="m-[calc(1.5*var(--p))] flex flex-1 items-center justify-center border-[calc(.35*var(--p))] border-current px-[calc(1.6*var(--p))] text-center text-[calc(3.6*var(--p))] leading-[1.12] font-bold tracking-[0.08em] uppercase" style={{ fontFamily: font }}>
          {line}
        </p>
        <span aria-hidden="true" className="my-[calc(1.4*var(--p))] border-l-[calc(.35*var(--p))] border-dashed border-current opacity-60" />
        <span className="grid w-[17%] place-items-center">
          <span className="text-[calc(2.7*var(--p))] font-bold tracking-[0.12em] tabular-nums" style={{ writingMode: "vertical-rl", fontFamily: font }}>
            {number}
          </span>
        </span>
      </div>
    </div>
  );
}

/** A few words torn out of a page and stuck down. */
export function Snippet({ children, paper, ink, font, size = 4, className, style }: { children: ReactNode; paper: string; ink: string; font: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("inline-block w-max max-w-full rounded-[calc(.5*var(--p))] px-[calc(2.4*var(--p))] py-[calc(1.1*var(--p))] text-center leading-[1.1]", className)} style={{ background: paper, color: ink, fontFamily: font, fontSize: `calc(${size} * var(--p))`, boxShadow: "0 calc(.5*var(--p)) calc(1*var(--p)) rgba(40,18,22,.24)", ...style }}>
      {children}
    </span>
  );
}

export const CARD_KEYFRAMES = `
@keyframes cl-eq { 0%,100% { scale: 1 .35 } 50% { scale: 1 1 } }
.cl-eq { animation: cl-eq .9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .cl-eq { animation: none; } }
`;
