"use client";

/**
 * Everything the garden is drawn from: the iron gate and its hanging sign, the vine that grows
 * down the edge of the screen as they scroll, the ink sketch the walk starts on, the bands of
 * land, one flower growing out of the ground, the trellis the photos hang on, the greenhouse
 * glass, and the bouquet waiting at the end. All original SVG and CSS — the flower heads come
 * from the Bouquet template, so the two gardens are planted with the same flowers.
 */

import { type CSSProperties, type ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { mulberry32 } from "../_shared/random";
import { FlowerHead, mix } from "../bouquet/art";
import { FLOWERS, type Tone } from "../bouquet/catalogue";
import type { Bed, Garden } from "./palette";

/** Long, slow motion that costs nothing: grass sways, wings beat, light drifts across glass. */
export const GARDEN_KEYFRAMES = `
@keyframes gd-sway { 0%,100% { transform: rotate(-1.1deg); } 50% { transform: rotate(1.1deg); } }
@keyframes gd-sway-slow { 0%,100% { transform: rotate(-0.6deg); } 50% { transform: rotate(0.8deg); } }
@keyframes gd-shimmer { 0%,100% { opacity: .35; transform: translateX(-6%); } 50% { opacity: .7; transform: translateX(6%); } }
@keyframes gd-flap-l { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(62deg); } }
@keyframes gd-flap-r { 0%,100% { transform: rotateY(0deg); } 50% { transform: rotateY(-62deg); } }
@keyframes gd-blink { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
@media (prefers-reduced-motion: reduce) {
  .gd-anim { animation: none !important; }
}
`;

export function toneOf(bed: Bed): Tone {
  const flower = FLOWERS[bed.id];
  const colors = flower.colors as Record<string, Tone>;
  return colors[bed.color] ?? Object.values(colors)[0];
}

/* ------------------------------------------------------------------ one flower, in the ground */

/**
 * A flower growing out of the soil at 0,0: a leaning stem, a leaf or two, and its head on top.
 * Drawn in the parent SVG's units, so a bed is just a row of these at different heights.
 */
export function Stem({
  bed,
  uid,
  seed,
  height,
  lean = 0,
  stem = "#5E7A4C",
  open = 1,
}: {
  bed: Bed;
  uid: string;
  seed: number;
  height: number;
  lean?: number;
  stem?: string;
  /** 0: still a bud. 1: fully open. */
  open?: number;
}) {
  const rng = mulberry32(seed);
  const tone = toneOf(bed);
  const scale = 0.5 * bed.size * (0.55 + 0.45 * open);
  const leafAt = (t: number, side: 1 | -1) => {
    const x = lean * t * t;
    const y = -height * t;
    return (
      <path
        key={`${t}-${side}`}
        d="M0 0C7 -7 19 -8 25 -1C19 7 7 7 0 0Z"
        transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${side === 1 ? -18 : 198}) scale(${(height / 150).toFixed(2)})`}
        fill={side === 1 ? stem : mix(stem, "#000000", 0.16)}
      />
    );
  };
  return (
    <g>
      <path
        d={`M0 0Q${(lean * 0.35).toFixed(1)} ${(-height * 0.55).toFixed(1)} ${lean} ${-height}`}
        fill="none"
        stroke={stem}
        strokeWidth={Math.max(2, height * 0.022)}
        strokeLinecap="round"
      />
      {leafAt(0.1, -1)}
      {leafAt(0.19, 1)}
      {leafAt(0.34, 1)}
      {leafAt(0.58, -1)}
      <g transform={`translate(${lean} ${-height}) scale(${scale.toFixed(3)}) rotate(${(rng() * 20 - 10).toFixed(1)})`}>
        <FlowerHead id={bed.id} tone={tone} uid={uid} seed={seed} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------------------- the land */

const FAR = "M0 300V118C86 96 150 74 214 62C296 46 344 72 420 82C508 94 556 58 640 52C726 46 782 84 860 92C938 100 1000 70 1076 60C1128 53 1166 66 1200 78V300Z";
const MID = "M0 300V176C70 168 118 142 188 140C268 138 306 168 380 172C462 176 502 140 580 136C660 132 706 164 784 170C856 176 902 146 972 142C1054 137 1136 162 1200 172V300Z";

/** Far hills and the hedge behind the beds: smooth silhouettes, so stretching them costs nothing. */
export function LandBand({ shape, color, className, style }: { shape: "far" | "mid"; color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className={cn("block w-full", className)} style={style} aria-hidden="true">
      <path d={shape === "far" ? FAR : MID} fill={color} />
    </svg>
  );
}

const enc = (svg: string) => `url("data:image/svg+xml;utf8,${svg.replace(/#/g, "%23").replace(/"/g, "'")}")`;

/**
 * The grass at the very front, tiled rather than stretched, so every blade keeps its shape from
 * a phone to a 27-inch screen.
 */
export function grassTile(color: string, deep: string): string {
  const blade = (x: number, h: number, lean: number, w: number, c: string) =>
    `<path d='M${x} 60C${x - w * 0.5} ${60 - h * 0.45} ${x + lean * 0.4} ${60 - h * 0.78} ${x + lean} ${60 - h}C${x + lean * 0.75} ${60 - h * 0.72} ${x + w * 0.7} ${60 - h * 0.4} ${x + w * 1.6} 60Z' fill='${c}'/>`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='60' viewBox='0 0 300 60'>` +
    [
      blade(6, 44, -9, 5, deep),
      blade(26, 30, 5, 4, color),
      blade(44, 52, -4, 6, deep),
      blade(66, 36, 10, 5, color),
      blade(88, 26, -6, 4, deep),
      blade(104, 48, 7, 6, color),
      blade(128, 34, -8, 5, deep),
      blade(150, 56, 3, 6, color),
      blade(172, 28, 9, 4, deep),
      blade(192, 42, -5, 5, color),
      blade(214, 50, 6, 6, deep),
      blade(238, 32, -7, 4, color),
      blade(258, 46, 4, 6, deep),
      blade(280, 36, -9, 5, color),
    ].join("") +
    `</svg>`;
  return enc(svg);
}

/** The sun through haze, or the moon over a dark garden: whatever the sky needs so it isn't empty. */
export function SkyLight({ color, halo, moon = false, className }: { color: string; halo: string; moon?: boolean; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute", className)} aria-hidden="true">
      <div className="absolute inset-[-140%] rounded-full" style={{ background: `radial-gradient(circle, ${halo} 0%, transparent 62%)` }} />
      <div className="relative h-full w-full rounded-full" style={{ background: color, boxShadow: `0 0 calc(10*var(--k)) ${halo}` }}>
        {moon ? (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute top-[-14%] right-[-34%] h-[128%] w-[128%] rounded-full" style={{ background: "rgba(13,22,38,.96)" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------------- the gate */

/** One leaf of a wrought-iron gate, hinged on its outer edge, half a heart on its inner one. */
export function GateLeaf({ iron, heart, className, style }: { iron: string; heart: string; className?: string; style?: CSSProperties }) {
  const light = mix(iron, "#FFFFFF", 0.34);
  const dark = mix(iron, "#000000", 0.52);
  const bars = [20, 34, 48, 62, 76];
  return (
    <svg viewBox="0 0 100 165" preserveAspectRatio="xMaxYMid meet" className={cn("block h-full w-full", className)} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="gd-iron" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={dark} />
          <stop offset="0.35" stopColor={iron} />
          <stop offset="0.6" stopColor={light} />
          <stop offset="1" stopColor={iron} />
        </linearGradient>
      </defs>
      <g fill="url(#gd-iron)">
        {/* hinge post and inner stile */}
        <rect x="4" y="8" width="9" height="157" rx="4" />
        <rect x="90" y="24" width="7" height="141" rx="3.5" />
        {bars.map((x, i) => (
          <g key={x}>
            <rect x={x} y={34 - i * 3} width="5" height={131 + i * 3} rx="2.5" />
            <path d={`M${x + 2.5} ${24 - i * 3}L${x + 5.8} ${34 - i * 3}H${x - 0.8}Z`} />
          </g>
        ))}
        {/* rails: the top one rises toward the middle of the gate */}
        <path d="M6 44C34 33 62 27 96 25L96 33C62 35 34 41 6 52Z" />
        <rect x="6" y="92" width="90" height="6" rx="3" />
        <rect x="6" y="152" width="90" height="7" rx="3.5" />
        {/* a finial on the post */}
        <circle cx="8.5" cy="10" r="6" />
      </g>
      {/* scrollwork between the rails */}
      <g fill="none" stroke={iron} strokeWidth="3.4" strokeLinecap="round">
        <path d="M18 92C18 74 34 66 46 74C54 79 52 90 44 90C38 90 36 82 42 80" />
        <path d="M84 92C84 76 70 68 58 76C51 81 53 91 60 91" />
      </g>
      {/* half a heart: closed, the two leaves make one */}
      <path d="M100 120C88 110 79 104 79 94C79 86 88 82 94 89C97 92 99 96 100 100Z" fill={heart} />
      <path d="M100 120C88 110 79 104 79 94C79 86 88 82 94 89C97 92 99 96 100 100" fill="none" stroke={mix(heart, "#000000", 0.32)} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M85 92C86 89.5 88 88 90.5 88.6" fill="none" stroke={mix(heart, "#FFFFFF", 0.6)} strokeWidth="2.2" strokeLinecap="round" opacity={0.75} />
    </svg>
  );
}

/** The plank hanging on the gate, with their name burnt into it. */
export function WoodSign({ text, garden, className }: { text: string; garden: Garden; className?: string }) {
  const grain = enc(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><g stroke='${garden.woodDeep}' stroke-opacity='0.28' fill='none'><path d='M0 8C30 4 60 12 120 7'/><path d='M0 20C40 16 70 24 120 18'/><path d='M0 32C34 28 66 36 120 30'/></g></svg>`,
  );
  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden="true"
        className="absolute -top-[calc(4.6*var(--k))] left-[22%] h-[calc(5*var(--k))] w-[calc(.5*var(--k))] origin-bottom -rotate-[14deg] rounded-full"
        style={{ background: garden.woodDeep }}
      />
      <span
        aria-hidden="true"
        className="absolute -top-[calc(4.6*var(--k))] right-[22%] h-[calc(5*var(--k))] w-[calc(.5*var(--k))] origin-bottom rotate-[14deg] rounded-full"
        style={{ background: garden.woodDeep }}
      />
      <div
        className="relative rounded-[calc(1.6*var(--k))] px-[calc(4*var(--k))] py-[calc(2.2*var(--k))] text-center"
        style={{
          background: `${grain}, linear-gradient(180deg, ${mix(garden.wood, "#FFFFFF", 0.18)}, ${garden.wood} 55%, ${mix(garden.wood, "#000000", 0.14)})`,
          boxShadow: `inset 0 0 0 calc(.35*var(--k)) ${mix(garden.woodDeep, "#000000", 0.1)}, 0 calc(1*var(--k)) calc(2.4*var(--k)) rgba(50,30,15,.32)`,
        }}
      >
        <p
          className="text-[calc(4.4*var(--k))] leading-[1.15] [overflow-wrap:anywhere]"
          style={{
            fontFamily: "var(--gift-font-hand)",
            color: mix(garden.woodDeep, "#2A1608", 0.5),
            textShadow: `0 calc(.14*var(--k)) 0 ${mix(garden.wood, "#FFFFFF", 0.4)}`,
          }}
        >
          {text}
        </p>
        <span aria-hidden="true" className="absolute top-[calc(1*var(--k))] left-[calc(1.2*var(--k))] size-[calc(1*var(--k))] rounded-full" style={{ background: mix(garden.woodDeep, "#000000", 0.3) }} />
        <span aria-hidden="true" className="absolute top-[calc(1*var(--k))] right-[calc(1.2*var(--k))] size-[calc(1*var(--k))] rounded-full" style={{ background: mix(garden.woodDeep, "#000000", 0.3) }} />
      </div>
    </div>
  );
}

/** Ivy over the top of the gate posts. */
export function Ivy({ color, deep, flip = false, className }: { color: string; deep: string; flip?: boolean; className?: string }) {
  const leaf = "M0 0C8 -9 22 -10 28 -2C21 8 7 9 0 0Z";
  return (
    <svg viewBox="0 0 160 90" className={cn("block", className)} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">
      <path d="M4 86C22 66 30 44 56 34C82 24 110 30 140 14" fill="none" stroke={deep} strokeWidth="3" strokeLinecap="round" />
      {[
        [20, 66, -30],
        [40, 48, -8],
        [62, 36, 16],
        [88, 28, -22],
        [112, 24, 8],
        [134, 14, -34],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${0.8 + (i % 3) * 0.16})`}>
          <path d={leaf} fill={i % 2 ? color : deep} />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ the vine down the edge */

const VINE = "M20 0C4 104 36 200 20 300C4 400 36 496 20 596C4 696 36 792 20 892C12 936 18 968 20 1000";

function VineLeaf({ progress, at, color, side }: { progress: MotionValue<number>; at: number; color: string; side: 1 | -1 }) {
  const scale = useTransform(progress, [at - 0.05, at + 0.01], [0, 1], { clamp: true });
  return (
    <motion.span
      className="absolute left-1/2 block h-[calc(2.8*var(--k))] w-[calc(5.4*var(--k))]"
      style={{ top: `${at * 100}%`, scale, rotate: side === 1 ? -24 : 204, originX: 0, x: side === 1 ? 0 : "-100%" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 46 24" className="h-full w-full">
        <path d="M0 12C10 -2 32 -3 46 8C34 22 12 24 0 12Z" fill={color} />
        <path d="M2 12C16 10 32 10 44 9" fill="none" stroke={mix(color, "#000000", 0.25)} strokeWidth="1.2" />
      </svg>
    </motion.span>
  );
}

/**
 * How far along the path they are: a vine that grows down the edge of the screen, puts out a leaf
 * every so often, and opens one flower when they reach the end. A progress bar nobody reads as one.
 */
export function ProgressVine({ progress, color, bloom, className }: { progress: MotionValue<number>; color: string; bloom: string; className?: string }) {
  const flower = useTransform(progress, [0.88, 0.98], [0, 1], { clamp: true });
  return (
    <div className={cn("pointer-events-none absolute top-[13%] bottom-[11%] left-[calc(1.4*var(--k))] w-[calc(7*var(--k))]", className)} aria-hidden="true">
      <svg viewBox="0 0 40 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <path d={VINE} fill="none" stroke={color} strokeOpacity={0.12} strokeWidth={4.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <motion.path d={VINE} fill="none" stroke={color} strokeWidth={4.4} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ pathLength: progress }} />
      </svg>
      {[0.13, 0.28, 0.43, 0.58, 0.73, 0.86].map((at, i) => (
        <VineLeaf key={at} progress={progress} at={at} color={color} side={i % 2 === 0 ? 1 : -1} />
      ))}
      <motion.span className="absolute bottom-0 left-1/2 block size-[calc(6.4*var(--k))] -translate-x-1/2 translate-y-1/3" style={{ scale: flower, opacity: flower }}>
        <svg viewBox="-50 -50 100 100" className="h-full w-full">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="0" cy="-22" rx="11" ry="20" fill={bloom} transform={`rotate(${a})`} opacity={0.92} />
          ))}
          <circle r="10" fill={mix(bloom, "#FFD166", 0.6)} />
        </svg>
      </motion.span>
    </div>
  );
}

/* ------------------------------------------------------------- the ink sketch they start on */

/** A line of ink that draws itself over a window of the section's progress. */
export function InkPath({
  d,
  draw,
  from,
  to,
  stroke,
  width = 2,
  fill = "none",
  dash,
}: {
  d: string;
  draw: MotionValue<number>;
  from: number;
  to: number;
  stroke: string;
  width?: number;
  fill?: string;
  dash?: string;
}) {
  const pathLength = useTransform(draw, [from, to], [0, 1], { clamp: true });
  return (
    <motion.path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      style={dash ? { opacity: pathLength } : { pathLength }}
    />
  );
}

/**
 * The first thing that grows: three seedlings and a watering can, drawn in ink on the page as
 * they scroll, the way someone sketches a bed before planting it.
 */
export function SketchGarden({ draw, ink, className }: { draw: MotionValue<number>; ink: string; className?: string }) {
  const soft = mix(ink, "#FFFFFF", 0.45);
  return (
    <svg viewBox="0 0 400 220" className={cn("block w-full", className)} aria-hidden="true">
      <InkPath d="M18 186H382" draw={draw} from={0} to={0.18} stroke={soft} width={1.6} dash="2 9" />
      {/* a seed, just split */}
      <InkPath d="M74 186C72 168 74 158 74 150" draw={draw} from={0.14} to={0.3} stroke={ink} width={2.2} />
      <InkPath d="M74 158C60 154 52 144 56 134C67 132 75 144 74 156" draw={draw} from={0.22} to={0.36} stroke={ink} width={2.2} />
      <InkPath d="M74 162C88 158 97 148 93 138C82 136 74 148 75 160" draw={draw} from={0.26} to={0.4} stroke={ink} width={2.2} />
      {/* a stem with a bud */}
      <InkPath d="M196 186C192 156 200 128 197 106" draw={draw} from={0.3} to={0.52} stroke={ink} width={2.4} />
      <InkPath d="M195 146C178 142 168 130 173 118C186 116 196 130 195 144" draw={draw} from={0.4} to={0.56} stroke={ink} width={2.2} />
      <InkPath d="M198 126C214 122 224 110 219 98C206 96 197 110 198 124" draw={draw} from={0.44} to={0.6} stroke={ink} width={2.2} />
      <InkPath d="M197 106C188 96 190 80 197 72C205 80 207 96 197 106Z" draw={draw} from={0.52} to={0.68} stroke={ink} width={2.4} />
      {/* one already open */}
      <InkPath d="M318 186C315 152 322 122 319 98" draw={draw} from={0.46} to={0.66} stroke={ink} width={2.4} />
      <InkPath d="M318 140C302 136 292 124 297 112C310 110 319 124 318 138" draw={draw} from={0.56} to={0.7} stroke={ink} width={2.2} />
      {[0, 72, 144, 216, 288].map((a, i) => (
        <g key={a} transform={`translate(319 86) rotate(${a})`}>
          <InkPath d="M0 -4C-11 -10 -12 -24 0 -28C12 -24 11 -10 0 -4Z" draw={draw} from={0.64 + i * 0.03} to={0.74 + i * 0.03} stroke={ink} width={2.2} />
        </g>
      ))}
      <InkPath d="M319 92C325 92 325 82 319 82C313 82 313 92 319 92Z" draw={draw} from={0.8} to={0.88} stroke={ink} width={2} />
      {/* the watering can, tipped */}
      <InkPath d="M40 182C36 166 38 150 40 142H92C94 152 96 168 92 182Z" draw={draw} from={0.72} to={0.86} stroke={soft} width={2} />
      <InkPath d="M92 150L118 136L112 128" draw={draw} from={0.82} to={0.92} stroke={soft} width={2} />
      <InkPath d="M46 142C48 126 84 126 86 142" draw={draw} from={0.86} to={0.96} stroke={soft} width={2} />
      <InkPath d="M112 132C110 142 108 152 110 160" draw={draw} from={0.9} to={1} stroke={soft} width={1.6} dash="3 7" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- the photo arbor */

/** The lattice the photos hang on, and the vines that have got into it. */
export function Trellis({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
      style={{
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 calc(.5*var(--k)), transparent calc(.5*var(--k)) calc(14*var(--k))), repeating-linear-gradient(-45deg, ${color} 0 calc(.5*var(--k)), transparent calc(.5*var(--k)) calc(14*var(--k)))`,
        ...style,
      }}
    />
  );
}

/** A flower flattened between the pages of a book, which is what a photo of a good day is. */
export function Sprig({ color, deep, className }: { color: string; deep: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 70" className={cn("block", className)} aria-hidden="true">
      <path d="M30 68C29 52 30 38 30 26" fill="none" stroke={deep} strokeWidth="2" strokeLinecap="round" />
      <path d="M30 52C20 50 12 42 15 34C25 32 31 42 30 50Z" fill={deep} opacity={0.8} />
      <path d="M31 44C41 42 49 34 46 26C36 24 30 34 31 42Z" fill={deep} opacity={0.65} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="30" cy="14" rx="7" ry="11" fill={color} opacity={0.9} transform={`rotate(${a} 30 22)`} />
      ))}
      <circle cx="30" cy="22" r="4.5" fill={mix(color, "#8A5A20", 0.55)} />
    </svg>
  );
}

/** One photo, matted, taped to the trellis, with a pressed flower kept beside it. */
export function PressedCard({
  src,
  alt,
  caption,
  garden,
  tape,
  sprig,
  className,
}: {
  src: string;
  alt?: string;
  caption?: string;
  garden: Garden;
  tape: string;
  sprig?: boolean;
  className?: string;
}) {
  return (
    <figure
      className={cn("relative p-[calc(2*var(--k))] pb-[calc(5*var(--k))]", className)}
      style={{
        background: garden.matte,
        boxShadow: `0 calc(1.6*var(--k)) calc(4*var(--k)) rgba(40,26,14,.28), inset 0 0 0 1px rgba(0,0,0,.05)`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-[calc(2.2*var(--k))] left-1/2 h-[calc(4.4*var(--k))] w-[calc(18*var(--k))] -translate-x-1/2 -rotate-3"
        style={{ background: tape, clipPath: "polygon(0 12%, 4% 0, 96% 6%, 100% 92%, 96% 100%, 3% 94%)" }}
      />
      <div className="relative aspect-[4/5] overflow-hidden bg-black/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" draggable={false} loading="lazy" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 calc(3*var(--k)) rgba(60,40,20,.22)" }} />
      </div>
      {caption ? (
        <figcaption
          className="mt-[calc(1.4*var(--k))] px-[calc(.6*var(--k))] text-center text-[calc(3.2*var(--k))] leading-snug"
          style={{ fontFamily: "var(--gift-font-hand)", color: garden.cardInk }}
        >
          {caption}
        </figcaption>
      ) : null}
      {sprig ? <Sprig color={garden.ribbon} deep={garden.land.nearDeep} className="absolute -right-[calc(3*var(--k))] -bottom-[calc(2*var(--k))] w-[calc(9*var(--k))] rotate-12 opacity-90" /> : null}
    </figure>
  );
}

/* --------------------------------------------------------------------------- the greenhouse */

/** Glass overhead: panes, their frames, the light coming through and the damp on the inside. */
export function GreenhouseGlass({ garden, className }: { garden: Garden; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${garden.frame} 0 calc(.9*var(--k)), transparent calc(.9*var(--k)) calc(26*var(--k))), repeating-linear-gradient(0deg, ${garden.frame} 0 calc(.9*var(--k)), transparent calc(.9*var(--k)) calc(30*var(--k))), ${garden.glass}`,
          opacity: 0.9,
        }}
      />
      <div className="absolute inset-0" style={{ background: `radial-gradient(90% 55% at 18% -6%, ${garden.glow}, transparent 70%)` }} />
      <div
        className="gd-anim absolute -inset-x-[20%] top-[6%] h-[34%] -rotate-6"
        style={{ background: `linear-gradient(90deg, transparent, ${garden.glow}, transparent)`, animation: "gd-shimmer 9s ease-in-out infinite", filter: "blur(calc(3*var(--k)))" }}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `radial-gradient(circle at 18% 22%, rgba(255,255,255,.5) 0 calc(.5*var(--k)), transparent calc(.6*var(--k))), radial-gradient(circle at 62% 12%, rgba(255,255,255,.45) 0 calc(.4*var(--k)), transparent calc(.5*var(--k))), radial-gradient(circle at 84% 34%, rgba(255,255,255,.4) 0 calc(.6*var(--k)), transparent calc(.7*var(--k)))`,
          backgroundSize: "calc(30*var(--k)) calc(30*var(--k))",
        }}
      />
    </div>
  );
}

/** The roof they are standing under: a glazed gable, its rafters, and two pots hung from the ridge. */
export function GreenhouseRoof({ garden, className }: { garden: Garden; className?: string }) {
  const bar = mix(garden.wood, garden.dark ? "#0E1A2C" : "#FFFFFF", 0.42);
  const barDeep = mix(garden.wood, "#000000", 0.28);
  const pane = garden.dark ? "rgba(150,190,240,.12)" : "rgba(255,252,238,.55)";
  const rafters = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 1200 230" preserveAspectRatio="none" className={cn("block w-full", className)} aria-hidden="true">
      <defs>
        <linearGradient id="gd-pane" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={pane} />
          <stop offset="1" stopColor={pane} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path d="M0 214L600 18L1200 214Z" fill="url(#gd-pane)" />
      <g stroke={bar} strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" fill="none">
        {rafters.map((i) => (
          <path key={i} d={`M600 22L${600 + i * 118} 214`} />
        ))}
        <path d="M0 214L600 18L1200 214" strokeWidth="9" />
        <path d="M150 165L600 18L1050 165" strokeWidth="4" strokeOpacity="0.85" />
      </g>
      <rect x="0" y="210" width="1200" height="14" fill={bar} />
      <rect x="0" y="222" width="1200" height="5" fill={barDeep} opacity="0.6" />
      {[300, 900].map((x) => (
        <g key={x} stroke={barDeep} strokeWidth="3" vectorEffect="non-scaling-stroke">
          <path d={`M${x} 140V196`} />
        </g>
      ))}
    </svg>
  );
}

/** A seed packet, for the thing they are counting down to. */
export function SeedPacket({ title, garden, children }: { title: string; garden: Garden; children: ReactNode }) {
  return (
    <div
      className="relative w-[calc(60*var(--k))] max-w-full pt-[calc(4*var(--k))] pb-[calc(3.4*var(--k))]"
      style={{
        background: garden.cardDark ? mix(garden.card, "#FFFFFF", 0.08) : garden.tagPaper,
        boxShadow: `0 calc(1.4*var(--k)) calc(3.4*var(--k)) rgba(40,26,14,.24)`,
        clipPath: "polygon(0 calc(3*var(--k)), 8% 0, 16% calc(3*var(--k)), 24% 0, 32% calc(3*var(--k)), 40% 0, 48% calc(3*var(--k)), 56% 0, 64% calc(3*var(--k)), 72% 0, 80% calc(3*var(--k)), 88% 0, 96% calc(3*var(--k)), 100% 0, 100% 100%, 0 100%)",
      }}
    >
      <p className="text-center text-[calc(2.4*var(--k))] tracking-[0.3em] uppercase opacity-60" style={{ color: garden.tagInk }}>
        {title}
      </p>
      <div className="mt-[calc(1.4*var(--k))]">{children}</div>
    </div>
  );
}

/** A bell jar, for the thing they have to lift to see. */
export function BellJar({ garden, children }: { garden: Garden; children: ReactNode }) {
  return (
    <div className="relative w-full">
      <div
        className="relative rounded-t-[calc(22*var(--k))] rounded-b-[calc(2*var(--k))] px-[calc(5*var(--k))] pt-[calc(7*var(--k))] pb-[calc(5*var(--k))]"
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,.34), rgba(255,255,255,.06) 40%, rgba(255,255,255,.18))`,
          boxShadow: `inset 0 0 0 1px ${garden.frame}, inset 0 calc(2*var(--k)) calc(6*var(--k)) rgba(255,255,255,.28), 0 calc(1.6*var(--k)) calc(4*var(--k)) rgba(20,14,8,.2)`,
          backdropFilter: "blur(2px)",
        }}
      >
        <span aria-hidden="true" className="absolute top-[calc(4*var(--k))] left-[16%] h-[calc(22*var(--k))] w-[calc(2.4*var(--k))] -rotate-[14deg] rounded-full bg-white/35 blur-[calc(.8*var(--k))]" />
        <span aria-hidden="true" className="absolute -top-[calc(2.6*var(--k))] left-1/2 size-[calc(4.4*var(--k))] -translate-x-1/2 rounded-full" style={{ background: `linear-gradient(180deg, rgba(255,255,255,.5), ${garden.frame})` }} />
        {children}
      </div>
      <div className="h-[calc(2.4*var(--k))] w-full rounded-[calc(1.4*var(--k))]" style={{ background: `linear-gradient(180deg, ${garden.wood}, ${garden.woodDeep})` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ the bouquet at the end */

/** Everything they walked past, cut and wrapped: heads on an arc, paper, a ribbon, a tag. */
export function WrappedBouquet({ beds, garden, uid, seed, className }: { beds: Bed[]; garden: Garden; uid: string; seed: number; className?: string }) {
  const rng = mulberry32(seed);
  const heads = Array.from({ length: 11 }, (_, i) => beds[i % beds.length]);
  const paper = mix(garden.wood, "#FFFFFF", 0.42);
  const paperDeep = mix(garden.wood, "#000000", 0.1);
  return (
    <svg viewBox="0 0 400 520" className={cn("block", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-wrap`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={paper} />
          <stop offset="1" stopColor={paperDeep} />
        </linearGradient>
        <linearGradient id={`${uid}-rb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(garden.ribbon, "#FFFFFF", 0.25)} />
          <stop offset="1" stopColor={garden.ribbonDeep} />
        </linearGradient>
        <radialGradient id={`${uid}-sh`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,.28)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="498" rx="118" ry="16" fill={`url(#${uid}-sh)`} />
      {/* stems, all gathered into the same hand */}
      {heads.map((_, i) => {
        const a = (-66 + (132 / Math.max(1, heads.length - 1)) * i) * (Math.PI / 180);
        const x = 200 + Math.sin(a) * 124;
        const y = 244 - Math.cos(a) * 78;
        return <path key={`s${i}`} d={`M200 392Q${(200 + (x - 200) * 0.45).toFixed(0)} ${(y + 110).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`} fill="none" stroke="#5E7A4C" strokeWidth="6" strokeLinecap="round" />;
      })}
      {/* the paper cone */}
      <path d="M96 276C130 330 156 372 168 470H232C244 372 270 330 304 276C264 316 136 316 96 276Z" fill={`url(#${uid}-wrap)`} />
      <path d="M200 300C196 360 194 420 196 470" fill="none" stroke={paperDeep} strokeWidth="1.6" opacity="0.5" />
      {/* the heads */}
      {heads.map((bed, i) => {
        const a = (-66 + (132 / Math.max(1, heads.length - 1)) * i) * (Math.PI / 180);
        const x = 200 + Math.sin(a) * 124;
        const y = 244 - Math.cos(a) * 78;
        const s = (0.66 + rng() * 0.14) * bed.size;
        return (
          <g key={`h${i}`} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)}) rotate(${(rng() * 22 - 11).toFixed(0)})`}>
            <FlowerHead id={bed.id} tone={toneOf(bed)} uid={`${uid}b${i}`} seed={seed + i * 31} />
          </g>
        );
      })}
      {/* the ribbon */}
      <path d="M170 386Q200 380 230 386L232 404Q200 410 168 404Z" fill={`url(#${uid}-rb)`} />
      <path d="M192 400C184 432 172 458 160 478L172 474L178 486C190 458 200 430 204 402Z" fill={`url(#${uid}-rb)`} />
      <path d="M208 400C216 432 228 458 240 478L228 474L222 486C210 458 200 430 196 402Z" fill={`url(#${uid}-rb)`} />
      <path d="M199 392C174 360 136 368 142 392C147 412 181 409 199 395Z" fill={`url(#${uid}-rb)`} />
      <path d="M201 392C226 360 264 368 258 392C253 412 219 409 201 395Z" fill={`url(#${uid}-rb)`} />
      <circle cx="200" cy="393" r="9" fill={garden.ribbonDeep} />
    </svg>
  );
}

/* ------------------------------------------------------------------ whoever comes with them */

/** The one who walks the whole page with them: a butterfly, a bee, or a cat who keeps up. */
export function Companion({ kind, garden, className }: { kind: "butterfly" | "bee" | "cat"; garden: Garden; className?: string }) {
  const wing = garden.dark ? "#EDE3CF" : garden.ribbon;
  const wingDeep = garden.dark ? "#C9B37E" : garden.ribbonDeep;
  if (kind === "cat") {
    const fur = garden.dark ? "#4A5568" : "#5C4B42";
    const furLight = mix(fur, "#FFFFFF", 0.22);
    return (
      <svg viewBox="0 0 120 100" className={cn("block", className)} aria-hidden="true">
        <path d="M22 84C14 70 16 54 26 46C22 38 24 26 30 22C36 26 40 32 41 38C50 34 62 34 71 38C73 31 78 24 84 21C89 26 90 38 86 46C96 55 98 72 90 84Z" fill={fur} />
        <path d="M31 30C33 34 35 38 36 42C39 40 42 39 45 38C41 34 36 31 31 30Z" fill={garden.ribbon} opacity="0.55" />
        <path d="M82 29C80 33 78 37 77 41C74 39 71 38 68 37C72 33 77 30 82 29Z" fill={garden.ribbon} opacity="0.55" />
        <path d="M90 82C104 80 112 68 108 56C106 50 100 48 97 52C94 57 99 60 102 57" fill="none" stroke={fur} strokeWidth="9" strokeLinecap="round" />
        <g className="gd-anim" style={{ animation: "gd-blink 5.5s ease-in-out infinite", transformOrigin: "44px 58px" }}>
          <ellipse cx="44" cy="58" rx="5" ry="6" fill="#FFFFFF" />
          <circle cx="45" cy="59" r="3.2" fill="#1B1714" />
        </g>
        <g className="gd-anim" style={{ animation: "gd-blink 5.5s ease-in-out infinite", transformOrigin: "72px 58px" }}>
          <ellipse cx="72" cy="58" rx="5" ry="6" fill="#FFFFFF" />
          <circle cx="71" cy="59" r="3.2" fill="#1B1714" />
        </g>
        <path d="M58 68L54 72H62Z" fill={garden.ribbonDeep} />
        <path d="M58 73C56 77 51 78 48 75M58 73C60 77 65 78 68 75" fill="none" stroke="#1B1714" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <path d="M30 64H14M30 70H15M86 64H102M86 70H101" stroke={furLight} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </svg>
    );
  }
  const body = kind === "bee" ? "#3A2E1E" : mix(wingDeep, "#2B1B1E", 0.4);
  return (
    <svg viewBox="0 0 120 100" className={cn("block overflow-visible", className)} style={{ perspective: "220px" }} aria-hidden="true">
      <g className="gd-anim" style={{ animation: "gd-flap-l 0.42s ease-in-out infinite", transformOrigin: "60px 50px", transformBox: "fill-box" }}>
        {kind === "bee" ? (
          <ellipse cx="44" cy="36" rx="22" ry="13" fill="#FFFFFF" opacity="0.62" transform="rotate(-18 44 36)" />
        ) : (
          <>
            <path d="M58 48C44 28 24 20 14 30C4 40 16 58 34 62C44 64 52 58 58 52Z" fill={wing} />
            <path d="M58 54C46 62 30 70 22 80C16 88 28 94 40 88C50 83 56 68 58 58Z" fill={wingDeep} />
          </>
        )}
      </g>
      <g className="gd-anim" style={{ animation: "gd-flap-r 0.42s ease-in-out infinite", transformOrigin: "60px 50px", transformBox: "fill-box" }}>
        {kind === "bee" ? (
          <ellipse cx="76" cy="36" rx="22" ry="13" fill="#FFFFFF" opacity="0.62" transform="rotate(18 76 36)" />
        ) : (
          <>
            <path d="M62 48C76 28 96 20 106 30C116 40 104 58 86 62C76 64 68 58 62 52Z" fill={wing} />
            <path d="M62 54C74 62 90 70 98 80C104 88 92 94 80 88C70 83 64 68 62 58Z" fill={wingDeep} />
          </>
        )}
      </g>
      {kind === "bee" ? (
        <g>
          <ellipse cx="60" cy="56" rx="26" ry="17" fill="#F2C548" />
          <path d="M52 41C50 52 50 60 52 71M64 40C62 52 62 60 64 72M76 45C75 53 75 59 76 67" stroke={body} strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="36" cy="54" r="11" fill={body} />
          <circle cx="32" cy="50" r="2.6" fill="#FFFFFF" />
          <path d="M34 44C30 38 26 36 22 36M40 44C38 37 36 34 32 32" stroke={body} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M86 56L96 60L86 62Z" fill={body} />
        </g>
      ) : (
        <g>
          <ellipse cx="60" cy="56" rx="5" ry="17" fill={body} />
          <path d="M58 40C54 32 50 28 45 26M62 40C66 32 70 28 75 26" stroke={body} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <circle cx="45" cy="25" r="2.4" fill={body} />
          <circle cx="75" cy="25" r="2.4" fill={body} />
        </g>
      )}
    </svg>
  );
}
