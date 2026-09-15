/**
 * The scrapbook's parts: washi tape, torn paper, a paperclip, pushpins, a wax seal, cut-out
 * letters, stickers and flower clusters drawn with the bouquet template's own flowers. All
 * original SVG and CSS, so every piece stays sharp from a phone to a laptop.
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { AmbienceKind } from "../_shared/Ambience";
import { mulberry32 } from "../_shared/random";
import { Sticker } from "../_shared/covers/stickers";
import { FlowerHead } from "../bouquet/art";
import { FLOWERS, type FlowerId, type Tone } from "../bouquet/catalogue";

export type ThemeId = "blossom" | "leopard" | "seaside" | "sunshine" | "film";

export type Theme = {
  /** Dark pages set the end screen and the now-playing card in light type. */
  dark: boolean;
  page: string;
  ink: string;
  accent: string;
  note: string;
  noteInk: string;
  kraft: string;
  /** The letter card. */
  card: string;
  cardInk: string;
  cardDark: boolean;
  tapes: string[];
  letters: { bg: string; ink: string }[];
  flowers: { id: FlowerId; color: string }[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  cover: { cloth: string; clothDeep: string; label: string; ribbon: string };
  motif: "florals" | "leopard" | "shells" | "sun" | "film";
};

export const THEMES: Record<ThemeId, Theme> = {
  blossom: {
    dark: false,
    page: "radial-gradient(42% 30% at 10% 6%, rgba(247,190,200,.5), transparent 70%), radial-gradient(36% 28% at 94% 20%, rgba(196,178,232,.38), transparent 70%), radial-gradient(42% 32% at 88% 90%, rgba(250,205,170,.45), transparent 70%), radial-gradient(38% 30% at 4% 68%, rgba(186,214,190,.4), transparent 70%), #F7F0E6",
    ink: "#3B2A2A",
    accent: "#D9667C",
    note: "#F3E7D3",
    noteInk: "#2E2521",
    kraft: "#E2C9A6",
    card: "#FFFDF8",
    cardInk: "#2E2521",
    cardDark: false,
    tapes: ["rgba(236,164,178,.72)", "rgba(214,196,164,.78)", "rgba(190,210,196,.75)"],
    letters: [
      { bg: "#FFFDF8", ink: "#3B2A2A" },
      { bg: "#F7D6DC", ink: "#8E3246" },
      { bg: "#3B2A2A", ink: "#F7F0E6" },
      { bg: "#E9D5C0", ink: "#3B2A2A" },
      { bg: "#DCE8D4", ink: "#2F4A33" },
    ],
    flowers: [
      { id: "peony", color: "blush" },
      { id: "daisy", color: "white" },
      { id: "hydrangea", color: "lilac" },
      { id: "rose", color: "blush" },
      { id: "cosmos", color: "pink" },
    ],
    ambience: [
      { kind: "petals", colors: ["#F4B8C1", "#F9D3DA", "#FBE3D6"], count: 12 },
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 10 },
    ],
    cover: { cloth: "#E7C3BE", clothDeep: "#C9968F", label: "#FFFDF8", ribbon: "#B8475E" },
    motif: "florals",
  },
  leopard: {
    dark: true,
    page: "radial-gradient(70% 45% at 50% 0%, rgba(255,120,120,.22), transparent 70%), radial-gradient(60% 40% at 50% 100%, rgba(0,0,0,.35), transparent 70%), #5E0F1B",
    ink: "#FBEFE6",
    accent: "#F2C14E",
    note: "#F2E6D8",
    noteInk: "#2A1A14",
    kraft: "#D6B48C",
    card: "#221C1C",
    cardInk: "#F4EDE4",
    cardDark: true,
    tapes: ["rgba(242,193,78,.62)", "rgba(255,255,255,.4)", "rgba(226,75,107,.6)"],
    letters: [
      { bg: "#F2E6D8", ink: "#5E0F1B" },
      { bg: "#111111", ink: "#F2C14E" },
      { bg: "#F2C14E", ink: "#111111" },
      { bg: "#E9D6C8", ink: "#7A1A28" },
      { bg: "#FFFFFF", ink: "#111111" },
    ],
    flowers: [
      { id: "rose", color: "red" },
      { id: "ranunculus", color: "orange" },
      { id: "daisy", color: "white" },
      { id: "tulip", color: "pink" },
      { id: "cosmos", color: "white" },
    ],
    ambience: [
      { kind: "sparkles", colors: ["#F2C14E", "#FFFFFF"], count: 20 },
      { kind: "hearts", colors: ["#F2C14E", "#E24B6B"], count: 6 },
    ],
    cover: { cloth: "#8A1B2B", clothDeep: "#5E0F1B", label: "#F2E6D8", ribbon: "#F2C14E" },
    motif: "leopard",
  },
  seaside: {
    dark: false,
    page: "radial-gradient(46% 34% at 8% 10%, rgba(120,196,190,.38), transparent 70%), radial-gradient(42% 34% at 92% 82%, rgba(240,200,160,.4), transparent 70%), repeating-linear-gradient(0deg, rgba(31,58,61,.035) 0 2px, transparent 2px 28px), #EEF5F1",
    ink: "#1F3A3D",
    accent: "#E38B6D",
    note: "#FBF6EC",
    noteInk: "#1F3A3D",
    kraft: "#E3CFAE",
    card: "#FFFDF8",
    cardInk: "#1F3A3D",
    cardDark: false,
    tapes: ["rgba(127,196,189,.72)", "rgba(227,207,174,.8)", "rgba(227,139,109,.6)"],
    letters: [
      { bg: "#FBF6EC", ink: "#1F3A3D" },
      { bg: "#7FC4BD", ink: "#FFFFFF" },
      { bg: "#E38B6D", ink: "#FFFFFF" },
      { bg: "#1F3A3D", ink: "#FBF6EC" },
      { bg: "#E3CFAE", ink: "#1F3A3D" },
    ],
    flowers: [
      { id: "daisy", color: "white" },
      { id: "cosmos", color: "pink" },
      { id: "ranunculus", color: "cream" },
      { id: "lavender", color: "purple" },
      { id: "gypsophila", color: "white" },
    ],
    ambience: [
      { kind: "bokeh", colors: ["#7FC4BD", "#FFFFFF"], count: 10 },
      { kind: "sparkles", colors: ["#FFFFFF"], count: 12 },
    ],
    cover: { cloth: "#9CCFC8", clothDeep: "#6BA9A1", label: "#FBF6EC", ribbon: "#E38B6D" },
    motif: "shells",
  },
  sunshine: {
    dark: false,
    page: "repeating-conic-gradient(from 0deg at 50% -12%, rgba(255,214,90,.28) 0 6deg, transparent 6deg 12deg), radial-gradient(60% 40% at 50% 0%, rgba(255,255,255,.6), transparent 70%), #FFF3C9",
    ink: "#4A3410",
    accent: "#E08A12",
    note: "#FFFBEF",
    noteInk: "#4A3410",
    kraft: "#E7C58F",
    card: "#FFFDF6",
    cardInk: "#4A3410",
    cardDark: false,
    tapes: ["rgba(232,163,23,.55)", "rgba(255,255,255,.7)", "rgba(196,102,31,.45)"],
    letters: [
      { bg: "#FFFBEF", ink: "#4A3410" },
      { bg: "#E8A317", ink: "#FFFFFF" },
      { bg: "#4A3410", ink: "#FFE08A" },
      { bg: "#F6D36B", ink: "#4A3410" },
      { bg: "#FFFFFF", ink: "#C4661F" },
    ],
    flowers: [
      { id: "sunflower", color: "yellow" },
      { id: "daisy", color: "white" },
      { id: "ranunculus", color: "orange" },
      { id: "tulip", color: "yellow" },
      { id: "gypsophila", color: "white" },
    ],
    ambience: [
      { kind: "petals", colors: ["#F6D36B", "#FFE08A", "#E8A317"], count: 12 },
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE08A"], count: 10 },
    ],
    cover: { cloth: "#F1C24A", clothDeep: "#D29A22", label: "#FFFBEF", ribbon: "#C4661F" },
    motif: "sun",
  },
  film: {
    dark: true,
    page: "radial-gradient(rgba(255,255,255,.07) 1.5px, transparent 1.9px) 0 0 / 22px 22px, radial-gradient(70% 45% at 50% 0%, rgba(226,75,107,.16), transparent 70%), #1C191A",
    ink: "#F4EDE4",
    accent: "#E24B6B",
    note: "#F2EADF",
    noteInk: "#1C191A",
    kraft: "#CDB48F",
    card: "#F2EADF",
    cardInk: "#1C191A",
    cardDark: false,
    tapes: ["rgba(226,75,107,.62)", "rgba(255,255,255,.45)", "rgba(216,200,176,.7)"],
    letters: [
      { bg: "#F2EADF", ink: "#1C191A" },
      { bg: "#E24B6B", ink: "#FFFFFF" },
      { bg: "#000000", ink: "#F2EADF" },
      { bg: "#D8C8B0", ink: "#1C191A" },
      { bg: "#FFFFFF", ink: "#E24B6B" },
    ],
    flowers: [
      { id: "rose", color: "red" },
      { id: "peony", color: "white" },
      { id: "gypsophila", color: "white" },
      { id: "tulip", color: "white" },
      { id: "rose", color: "white" },
    ],
    ambience: [
      { kind: "sparkles", colors: ["#FFFFFF", "#E24B6B"], count: 16 },
      { kind: "bokeh", colors: ["#E24B6B", "#FFFFFF"], count: 8 },
    ],
    cover: { cloth: "#2E2A2B", clothDeep: "#161314", label: "#F2EADF", ribbon: "#E24B6B" },
    motif: "film",
  },
};

/** A flower's colour by name, or its first colour when the theme asks for one it doesn't come in. */
export function toneOf(id: FlowerId, color: string): Tone {
  const colors = FLOWERS[id].colors;
  return colors[color] ?? Object.values(colors)[0];
}

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/** Flowers gathered in a corner, with a few leaves behind them. */
export function FlowerCluster({ flowers, seed, className, style }: { flowers: Theme["flowers"]; seed: number; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const rng = mulberry32(seed);
  const spots: [number, number, number][] = [
    [0, 0, 1.2],
    [-62, -18, 0.82],
    [58, -26, 0.86],
    [-34, 48, 0.74],
    [46, 44, 0.72],
  ];
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + rng() * 0.6;
    const r = 74 + rng() * 22;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.78, deg: (a * 180) / Math.PI, light: i % 2 === 0 };
  });
  return (
    <svg viewBox="-140 -120 280 240" className={className} style={{ overflow: "visible", ...style }} aria-hidden="true">
      {leaves.map((l, i) => (
        <ellipse key={`l${i}`} cx={l.x} cy={l.y} rx="30" ry="10" transform={`rotate(${l.deg.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`} fill={l.light ? "#9CBB92" : "#7FA37A"} />
      ))}
      {spots.slice(0, flowers.length).map(([x, y, scale], i) => {
        const f = flowers[i];
        const rot = Math.round((rng() - 0.5) * 50);
        return (
          <g key={`f${i}`} transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
            <FlowerHead id={f.id} tone={toneOf(f.id, f.color)} uid={`${uid}f${i}`} seed={1 + Math.floor(rng() * 9999)} />
          </g>
        );
      })}
    </svg>
  );
}

const ZIGZAG = "polygon(0 0, 3% 12%, 0 25%, 3% 38%, 0 50%, 3% 62%, 0 75%, 3% 88%, 0 100%, 100% 100%, 97% 88%, 100% 75%, 97% 62%, 100% 50%, 97% 38%, 100% 25%, 97% 12%, 100% 0)";

/** Washi tape: translucent, faintly striped, with pinked ends. */
export function Tape({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block", className)}
      style={{ backgroundColor: color, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.28) 0 2px, transparent 2px 8px)", clipPath: ZIGZAG, ...style }}
    />
  );
}

/** A paper edge torn at the top and bottom, as a clip-path. Seeded, so it never changes between renders. */
export function tornClip(seed: number, depth = 2.8): string {
  const rng = mulberry32(seed);
  const top: string[] = [];
  const bottom: string[] = [];
  for (let x = 0; x <= 100; x += 4) {
    top.push(`${x}% ${(rng() * depth).toFixed(2)}%`);
    bottom.push(`${100 - x}% ${(100 - rng() * depth).toFixed(2)}%`);
  }
  return `polygon(${[...top, ...bottom].join(", ")})`;
}

export function Paperclip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 70" className={className} aria-hidden="true">
      <path d="M8 18v36a7 7 0 0 0 14 0V12a5.5 5.5 0 0 0-11 0v38a2.5 2.5 0 0 0 5 0V20" fill="none" stroke="#8F979E" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 18v36a7 7 0 0 0 14 0V12" fill="none" stroke="#E7ECEF" strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export function Pushpin({ color, className }: { color: string; className?: string }) {
  const id = safeId(useId());
  return (
    <svg viewBox="0 0 32 42" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".9" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor={color} />
        </radialGradient>
      </defs>
      <path d="M16 22v18" stroke="#8A8F94" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="17" cy="25" rx="8" ry="2.6" fill="rgba(0,0,0,.18)" />
      <circle cx="16" cy="14" r="11" fill={`url(#${id})`} />
    </svg>
  );
}

export function WaxSeal({ color, letter, className }: { color: string; letter: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 3c4 0 6 3 9.5 4s7-.5 9.5 2 1.5 6 3 9 4.5 5 4.5 9-3 6-4 9.5.5 7-2 9.5-6 1.5-9 3-5 4.5-9 4.5-6-3-9.5-4-7 .5-9.5-2-1.5-6-3-9S3 36 3 32s3-6 4-9.5-.5-7 2-9.5 6-1.5 9-3S28 3 32 3Z" fill={color} />
      <path d="M32 3c4 0 6 3 9.5 4s7-.5 9.5 2 1.5 6 3 9 4.5 5 4.5 9" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="2" />
      <text x="32" y="39.5" textAnchor="middle" fontSize="21" fill="rgba(255,255,255,.88)" style={{ fontFamily: "var(--font-poster), Georgia, serif" }}>
        {letter}
      </text>
    </svg>
  );
}

const FACES = [
  "var(--font-poster), Georgia, serif",
  'var(--font-type), "Courier New", monospace',
  "var(--gift-font-hand)",
  "var(--gift-font-display)",
  "var(--font-sans), system-ui, sans-serif",
];

/** A title made of letters cut from magazines: each its own paper, face, size and tilt. */
export function RansomTitle({ text, letters, seed, reduce }: { text: string; letters: Theme["letters"]; seed: number; reduce: boolean }) {
  const rng = mulberry32(seed);
  let index = 0;
  return (
    <h1 className="flex flex-wrap items-center justify-center gap-x-[calc(4*var(--u))] gap-y-[calc(2.5*var(--u))] px-[calc(2*var(--u))]" aria-label={text}>
      {text
        .trim()
        .split(/\s+/)
        .map((word, wi) => (
          <span key={wi} className="flex flex-wrap justify-center" aria-hidden="true">
            {[...word].map((ch, ci) => {
              const i = index++;
              const look = letters[Math.floor(rng() * letters.length)];
              const face = FACES[Math.floor(rng() * FACES.length)];
              const rot = (rng() - 0.5) * 16;
              const size = 8.2 + rng() * 3.2;
              const upper = rng() > 0.4;
              return (
                <motion.span
                  key={ci}
                  className="mx-[calc(0.35*var(--u))] my-[calc(0.3*var(--u))] inline-grid min-w-[calc(7*var(--u))] place-items-center px-[calc(1.5*var(--u))] pt-[calc(0.7*var(--u))] pb-[calc(1*var(--u))] leading-none shadow-[0_2px_5px_rgba(0,0,0,0.2)]"
                  style={{ background: look.bg, color: look.ink, fontFamily: face, fontSize: `calc(${size.toFixed(1)} * var(--u))` }}
                  initial={reduce ? false : { opacity: 0, scale: 0.2, rotate: rot * 4 }}
                  animate={{ opacity: 1, scale: 1, rotate: rot }}
                  transition={{ type: "spring", stiffness: 240, damping: 13, delay: 0.2 + i * 0.055 }}
                >
                  {upper ? ch.toUpperCase() : ch.toLowerCase()}
                </motion.span>
              );
            })}
          </span>
        ))}
    </h1>
  );
}

/** The leopard theme's page texture. */
export function LeopardSpots({ className }: { className?: string }) {
  const id = safeId(useId());
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(14)">
          <path d="M14 18c8-8 22-4 20 6s-12 12-18 10-8-10-2-16Zm4 5c-3 3-2 8 2 8s8-3 7-7-6-4-9-1Z" fill="#000" />
          <path d="M58 48c9-6 21 0 17 9s-15 8-19 4-5-9 2-13Zm3 5c-3 2-2 6 1 6s7-2 6-5-4-3-7-1Z" fill="#000" />
          <circle cx="66" cy="16" r="4" fill="#000" />
          <circle cx="24" cy="66" r="5" fill="#000" />
          <circle cx="80" cy="80" r="3" fill="#000" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function LeopardStar() {
  const id = safeId(useId());
  return (
    <svg viewBox="0 0 100 100" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <rect width="20" height="20" fill="#D9A55A" />
          <path d="M4 5c2-2 6-1 6 1.5S8 11 5.5 10 2 7 4 5Z" fill="#2A1A0E" />
          <path d="M13 12c2-1 5 0 5 2.5s-2.5 3.5-4 3S11 13 13 12Z" fill="#2A1A0E" />
          <circle cx="15" cy="3.5" r="1.5" fill="#2A1A0E" />
          <circle cx="3.5" cy="15.5" r="1.3" fill="#2A1A0E" />
        </pattern>
      </defs>
      <path d="M50 4 62 36l34 2-27 20 10 34-29-20-29 20 10-34L4 38l34-2Z" fill={`url(#${id})`} stroke="#FFF6E6" strokeWidth="6" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}

function Shell() {
  const ribs = Array.from({ length: 7 }, (_, i) => {
    const a = (-60 + i * 20) * (Math.PI / 180);
    return `M50 80 L${(50 + 40 * Math.sin(a)).toFixed(1)} ${(78 - 62 * Math.cos(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 92" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <path d="M50 84 20 70C6 52 8 26 26 14c12-8 36-8 48 0 18 12 20 38 6 56Z" fill="#F8DCC8" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" paintOrder="stroke" />
      <path d={ribs} stroke="#E4A887" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M40 82h20l-3 8H43Z" fill="#E9B99A" />
    </svg>
  );
}

function Starfish() {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 44 : 18;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(52 + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <polygon points={pts} fill="#F08A6B" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" paintOrder="stroke" />
      {[[50, 22], [74, 42], [64, 72], [36, 72], [26, 42]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.2" fill="#FFD3C2" />
      ))}
    </svg>
  );
}

function Pearl() {
  const id = safeId(useId());
  return (
    <svg viewBox="0 0 100 100" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".5" stopColor="#F1ECF5" />
          <stop offset="1" stopColor="#C9C0D6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="38" fill={`url(#${id})`} stroke="#FFFFFF" strokeWidth="5" paintOrder="stroke" />
      <ellipse cx="38" cy="36" rx="9" ry="6" fill="#FFFFFF" opacity=".85" />
    </svg>
  );
}

function Sun() {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = 50 + Math.cos(a) * 30;
    const y1 = 50 + Math.sin(a) * 30;
    const x2 = 50 + Math.cos(a) * 46;
    const y2 = 50 + Math.sin(a) * 46;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <path d={rays} stroke="#F2B233" strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="27" fill="#FFCF4A" stroke="#FFFFFF" strokeWidth="5" paintOrder="stroke" />
      <path d="M40 46q3-4 6 0M54 46q3-4 6 0" stroke="#7A4A12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M42 56q8 7 16 0" stroke="#7A4A12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="54" r="3.5" fill="#FF9A76" opacity=".6" />
      <circle cx="62" cy="54" r="3.5" fill="#FF9A76" opacity=".6" />
    </svg>
  );
}

function DiscoBall() {
  const tiles: ReactNode[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 20 + col * 9;
      const y = 22 + row * 9;
      const dx = x + 4.5 - 50;
      const dy = y + 4.5 - 52;
      if (dx * dx + dy * dy > 31 * 31) continue;
      const shade = 150 + ((row * 37 + col * 53) % 90);
      tiles.push(<rect key={`${row}-${col}`} x={x} y={y} width="8.2" height="8.2" fill={`rgb(${shade},${shade},${shade + 12})`} />);
    }
  }
  return (
    <svg viewBox="0 0 100 100" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <path d="M50 4v16" stroke="#C9C9C9" strokeWidth="2" />
      <circle cx="50" cy="52" r="33" fill="#9FA3AA" stroke="#FFFFFF" strokeWidth="5" paintOrder="stroke" />
      <g clipPath="circle(31px at 50px 52px)">{tiles}</g>
      <path d="M36 36l4 4M40 36l-4 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EightBall() {
  return (
    <svg viewBox="0 0 100 100" className="sticker h-full w-full overflow-visible" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="#141414" stroke="#FFFFFF" strokeWidth="5" paintOrder="stroke" />
      <circle cx="44" cy="42" r="15" fill="#FFFFFF" />
      <text x="44" y="48.5" textAnchor="middle" fontSize="18" fontWeight="700" fill="#141414" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        8
      </text>
      <ellipse cx="66" cy="30" rx="6" ry="3.5" fill="#FFFFFF" opacity=".25" transform="rotate(-30 66 30)" />
    </svg>
  );
}

/** Three stickers per theme, picked by index. */
export function Motif({ theme, index, className }: { theme: Theme; index: number; className?: string }) {
  const sets: Record<Theme["motif"], ReactNode[]> = {
    florals: [<Sticker key="a" id="butterfly" />, <Sticker key="b" id="bow" />, <Sticker key="c" id="heart" />],
    leopard: [<LeopardStar key="a" />, <Sticker key="b" id="kiss" />, <Sticker key="c" id="cherries" />],
    shells: [<Shell key="a" />, <Starfish key="b" />, <Pearl key="c" />],
    sun: [<Sun key="a" />, <Sticker key="b" id="daisy" />, <Sticker key="c" id="strawberry" />],
    film: [<DiscoBall key="a" />, <EightBall key="b" />, <Sticker key="c" id="kiss" />],
  };
  const set = sets[theme.motif];
  return (
    <div className={cn("aspect-square", className)} aria-hidden="true">
      {set[index % set.length]}
    </div>
  );
}
