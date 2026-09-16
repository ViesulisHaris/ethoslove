"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * The timeline's cover pieces: a garland of pegged polaroids, and the title card that hangs
 * under it. The string is one quadratic drawn in a viewBox stretched to the block's width, so
 * 1 unit of y is exactly 1 --k whatever the screen; that is what lets every card be hung at
 * the height the string actually passes through its peg, on a phone and on the poster crop.
 */
import type { CSSProperties } from "react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { NameTag, PAPER_GRAIN, POSTER_FONT } from "../_shared/cover-kit";

/** The garland block's height in --k; the viewBox is 200 x BOX_H, so y reads in --k. */
const BOX_H = 58;
/** Where the string is pinned at either edge, and the control point that makes it sag. */
const END_Y = 8;
const SAG = 34;
const CARD_W = 29;

/** The string is `M 0 END_Y Q 100 SAG 200 END_Y`: its height at a given x, in --k. */
function stringY(xPct: number): number {
  const t = xPct / 100;
  return END_Y * ((1 - t) ** 2 + t ** 2) + 2 * SAG * t * (1 - t);
}

/** Where the cards hang, so one photo sits in the middle and three spread across the line. */
const SPOTS: Record<number, number[]> = { 1: [50], 2: [28, 72], 3: [19, 50, 81] };
const TILT = [-5, 2.5, -3.5];

export const TIMELINE_KEYFRAMES = `
.tl-sway{transform-origin:50% 0;animation:tl-sway 6.5s ease-in-out infinite alternate}
@keyframes tl-sway{from{rotate:var(--tl-from)}to{rotate:var(--tl-to)}}
@media (prefers-reduced-motion: reduce){.tl-sway{animation:none;rotate:var(--tl-from)}}
`;

/** A wooden clothespin, drawn so its metal spring lands on the string it is clamping. */
function Peg({ wood, metal }: { wood: string; metal: string }) {
  return (
    <svg viewBox="0 0 20 36" className="h-full w-full" aria-hidden="true">
      <rect x="2.5" y="0.6" width="15" height="33.4" rx="3.2" fill={wood} />
      <rect x="3.6" y="2" width="4.2" height="30.6" rx="2.1" fill="rgba(255,255,255,.32)" />
      <path d="M10 2 V33" stroke="rgba(60,40,25,.26)" strokeWidth="1" />
      <rect x="2.5" y="0.6" width="15" height="33.4" rx="3.2" fill="none" stroke="rgba(60,40,25,.3)" strokeWidth=".8" />
      <rect x="1.2" y="11.6" width="17.6" height="5.6" rx="2.6" fill={metal} />
      <rect x="1.2" y="11.6" width="17.6" height="2.2" rx="1.1" fill="rgba(255,255,255,.45)" />
      <rect x="1.2" y="11.6" width="17.6" height="5.6" rx="2.6" fill="none" stroke="rgba(60,50,40,.25)" strokeWidth=".6" />
    </svg>
  );
}

export function Garland({
  photos,
  polaroid,
  line,
  peg,
  metal,
}: {
  photos: GiftPhoto[];
  polaroid: string;
  line: string;
  peg: string;
  metal: string;
}) {
  const shown = photos.slice(0, 3);
  if (!shown.length) return null;
  const xs = SPOTS[shown.length] ?? SPOTS[3];

  return (
    <div aria-hidden="true" className="relative w-full" style={{ height: `calc(${BOX_H} * var(--k))` }}>
      <svg viewBox={`0 0 200 ${BOX_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={`M 0 ${END_Y + 1.1} Q 100 ${SAG + 1.1} 200 ${END_Y + 1.1}`} fill="none" stroke="rgba(30,20,10,.18)" strokeWidth="1.2" strokeLinecap="round" />
        <path d={`M 0 ${END_Y} Q 100 ${SAG} 200 ${END_Y}`} fill="none" stroke={line} strokeWidth="1.3" strokeLinecap="round" />
        <path d={`M 0 ${END_Y - 0.35} Q 100 ${SAG - 0.35} 200 ${END_Y - 0.35}`} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth=".45" strokeLinecap="round" />
      </svg>

      {/* The tacks the string is tied to, half off each edge, so the line reads as continuing. */}
      {[0, 100].map((edge) => (
        <span
          key={edge}
          className="absolute size-[calc(2.8*var(--k))] -translate-x-1/2 rounded-full"
          style={{
            left: `${edge}%`,
            top: `calc(${END_Y - 1.4} * var(--k))`,
            backgroundImage: `radial-gradient(circle at 34% 30%, rgba(255,255,255,.9), ${peg} 66%)`,
            boxShadow: "0 calc(.4*var(--k)) calc(.9*var(--k)) rgba(45,28,16,.4)",
          }}
        />
      ))}

      {shown.map((photo, i) => {
        const x = xs[i];
        const tilt = TILT[i % TILT.length];
        return (
          <div
            key={photo.id}
            className="absolute"
            style={{ left: `${x}%`, top: `calc(${stringY(x).toFixed(2)} * var(--k))`, width: `calc(${CARD_W} * var(--k))`, transform: "translateX(-50%)" }}
          >
            <div
              className="tl-sway relative"
              style={{ "--tl-from": `${tilt - 1.4}deg`, "--tl-to": `${tilt + 1.4}deg`, animationDelay: `${i * 0.9}s` } as CSSProperties}
            >
              <div
                className="p-[calc(1.8*var(--k))] pb-[calc(5.4*var(--k))]"
                style={{
                  backgroundColor: polaroid,
                  backgroundImage: PAPER_GRAIN,
                  boxShadow: "0 calc(1.4*var(--k)) calc(2.8*var(--k)) rgba(50,35,25,.32)",
                }}
              >
                <div className="aspect-square overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,.09)" }}>
                  <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" />
                </div>
              </div>
              <div
                className="absolute top-[calc(-3.2*var(--k))] left-1/2 z-[1] w-[calc(5*var(--k))] -translate-x-1/2"
                style={{ filter: "drop-shadow(0 calc(.5*var(--k)) calc(.9*var(--k)) rgba(50,35,20,.38))" }}
              >
                <Peg wood={peg} metal={metal} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The card the garland hangs over: the title, the years it spans, and their tag pinned to it. */
export function TitleCard({
  title,
  years,
  name,
  forLabel,
  paper,
  ink,
  rule,
  tagPaper,
  tagInk,
  pin,
}: {
  title: string;
  years: string | null;
  name: string;
  forLabel: string;
  paper: string;
  ink: string;
  rule: string;
  tagPaper: string;
  tagInk: string;
  pin: string;
}) {
  return (
    <div className="relative">
      <div
        className="relative px-[calc(6*var(--k))] py-[calc(6.5*var(--k))] text-center"
        style={{
          backgroundColor: paper,
          backgroundImage: PAPER_GRAIN,
          color: ink,
          boxShadow: "0 calc(1.8*var(--k)) calc(4.2*var(--k)) rgba(55,38,24,.28)",
        }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(1.6*var(--k))]" style={{ border: `calc(.25*var(--k)) solid ${rule}` }} />
        <h1 className="relative text-[calc(8*var(--k))] leading-[1.08] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT }}>
          {title}
        </h1>
        {years ? (
          <div className="relative mt-[calc(3.2*var(--k))] flex items-center justify-center gap-[calc(2.4*var(--k))]">
            <span aria-hidden="true" className="h-[calc(.25*var(--k))] flex-1" style={{ backgroundColor: rule }} />
            <span className="text-[calc(2.9*var(--k))] leading-none tracking-[0.3em] whitespace-nowrap opacity-80" style={{ fontFamily: POSTER_FONT }}>
              {years}
            </span>
            <span aria-hidden="true" className="h-[calc(.25*var(--k))] flex-1" style={{ backgroundColor: rule }} />
          </div>
        ) : null}
      </div>

      {/* Low enough on the corner that it never sits over the years the card is announcing. */}
      <div className="absolute right-[calc(-4*var(--k))] bottom-[calc(-13*var(--k))] w-[calc(24*var(--k))]" style={{ transform: "rotate(6deg)" }}>
        <NameTag name={name} eyebrow={forLabel} paper={tagPaper} ink={tagInk} />
        <span
          aria-hidden="true"
          className="absolute top-[calc(.75*var(--k))] left-1/2 size-[calc(3.4*var(--k))] -translate-x-1/2 rounded-full"
          style={{
            backgroundImage: `radial-gradient(circle at 34% 30%, rgba(255,255,255,.95), ${pin} 62%)`,
            boxShadow: "0 calc(.5*var(--k)) calc(1.1*var(--k)) rgba(45,28,16,.45)",
          }}
        />
      </div>
    </div>
  );
}
