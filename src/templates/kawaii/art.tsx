"use client";

import { motion } from "motion/react";
import type { KawaiiFields } from "./schema";

/**
 * Original plush characters drawn for this template: a bunny, a bear and a kitten, each a
 * soft round shape with dot eyes, blushed cheeks, a smile and a bow. They are ours, drawn
 * from scratch; nothing here is a licensed character.
 */
export type Palette = {
  bg: string;
  check: string;
  fur: string;
  furDeep: string;
  inner: string;
  bow: string;
  bowDeep: string;
  blush: string;
  ink: string;
  paper: string;
  tape: string;
  box: string;
  boxLid: string;
  ribbon: string;
  accent: string;
};

export const PALETTES: Record<KawaiiFields["theme"], Palette> = {
  pink: { bg: "#FFE8F0", check: "#FFD3E1", fur: "#FFF8F4", furDeep: "#F1DED5", inner: "#FFB8CC", bow: "#F26A97", bowDeep: "#C9426F", blush: "#FFA7BF", ink: "#5A2A3A", paper: "#FFFDFB", tape: "rgba(255,150,190,0.55)", box: "#FFB3C9", boxLid: "#FF98B6", ribbon: "#FFF1F6", accent: "#F06292" },
  lavender: { bg: "#EFE6FF", check: "#DFD0FF", fur: "#FFFBF7", furDeep: "#EBDFE0", inner: "#E2C3FF", bow: "#9B6BE0", bowDeep: "#6E44B4", blush: "#F3B8D6", ink: "#3E2A5A", paper: "#FFFDFC", tape: "rgba(170,130,240,0.5)", box: "#C9B1FF", boxLid: "#B79AFF", ribbon: "#FFF8FC", accent: "#9B6BE0" },
  mint: { bg: "#E3F7EE", check: "#CDEFDD", fur: "#FFFCF6", furDeep: "#E9E2D1", inner: "#FFC9D6", bow: "#F27A9B", bowDeep: "#C5506F", blush: "#FFB4C4", ink: "#2A4A3C", paper: "#FFFEFB", tape: "rgba(90,200,150,0.45)", box: "#BDEBD3", boxLid: "#9FDDBE", ribbon: "#FFF6FA", accent: "#3DB98A" },
  cherry: { bg: "#FFDDE3", check: "#FFC7D1", fur: "#FFF6F3", furDeep: "#EED8D0", inner: "#FF9FB3", bow: "#E63950", bowDeep: "#A8202F", blush: "#FF98AC", ink: "#5A1E28", paper: "#FFFCFA", tape: "rgba(230,60,90,0.45)", box: "#FF8FA4", boxLid: "#FF6F8C", ribbon: "#FFF4F5", accent: "#E63950" },
};

export function Bow({ color, deep, size = 40 }: { color: string; deep: string; size?: number }) {
  const s = size / 40;
  return (
    <g transform={`scale(${s})`}>
      <path d="M-2 0C-14 -16 -34 -14 -32 0C-30 12 -14 12 -2 0Z" fill={color} />
      <path d="M2 0C14 -16 34 -14 32 0C30 12 14 12 2 0Z" fill={color} />
      <path d="M-4 0C-12 -10 -24 -10 -25 0" fill="none" stroke={deep} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
      <path d="M4 0C12 -10 24 -10 25 0" fill="none" stroke={deep} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
      <path d="M-3 3L-11 20L-4 18L0 24L4 18L11 20L3 3Z" fill={color} />
      <ellipse cx={0} cy={0} rx={6} ry={5.5} fill={deep} />
      <ellipse cx={-1.5} cy={-1.5} rx={2} ry={1.5} fill="#fff" opacity={0.5} />
    </g>
  );
}

function Face({ p, mood }: { p: Palette; mood: "idle" | "happy" }) {
  const happy = mood === "happy";
  return (
    <g>
      {/* eyes */}
      {[-12, 12].map((x) => (
        <g key={x}>
          {happy ? (
            <path d={`M${x - 5} -2C${x - 2} -8 ${x + 2} -8 ${x + 5} -2`} fill="none" stroke={p.ink} strokeWidth={2.6} strokeLinecap="round" />
          ) : (
            <>
              <ellipse cx={x} cy={-4} rx={3.6} ry={4.6} fill={p.ink} />
              <circle cx={x - 1.3} cy={-5.8} r={1.3} fill="#fff" />
            </>
          )}
        </g>
      ))}
      {/* cheeks */}
      <ellipse cx={-21} cy={5} rx={6.5} ry={3.8} fill={p.blush} opacity={0.75} />
      <ellipse cx={21} cy={5} rx={6.5} ry={3.8} fill={p.blush} opacity={0.75} />
      {/* nose + mouth */}
      <path d="M-2.5 3.5C-0.8 1.6 0.8 1.6 2.5 3.5C1.6 5.6 -1.6 5.6 -2.5 3.5Z" fill={p.bowDeep} opacity={0.9} />
      <path d="M-6 8C-4 11 -2 11 0 8C2 11 4 11 6 8" fill="none" stroke={p.ink} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

/** The plushie, roughly 120 wide by 130 tall in its own units; scale it with the wrapper. */
export function Plushie({ kind, p, mood = "idle", wave = true }: { kind: KawaiiFields["character"]; p: Palette; mood?: "idle" | "happy"; wave?: boolean }) {
  return (
    <svg viewBox="-64 -76 128 140" width="100%" height="100%" style={{ overflow: "visible" }} aria-hidden="true">
      {/* ears */}
      {kind === "bunny" ? (
        <g>
          <motion.g style={{ transformOrigin: "-16px -20px" }} animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <ellipse cx={-16} cy={-44} rx={9.5} ry={26} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} transform="rotate(-8 -16 -44)" />
            <ellipse cx={-16} cy={-42} rx={4.5} ry={17} fill={p.inner} transform="rotate(-8 -16 -42)" />
          </motion.g>
          <motion.g style={{ transformOrigin: "16px -20px" }} animate={{ rotate: [4, -4, 4] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}>
            <ellipse cx={16} cy={-44} rx={9.5} ry={26} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} transform="rotate(8 16 -44)" />
            <ellipse cx={16} cy={-42} rx={4.5} ry={17} fill={p.inner} transform="rotate(8 16 -42)" />
          </motion.g>
        </g>
      ) : kind === "bear" ? (
        <g>
          <circle cx={-27} cy={-27} r={12} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} />
          <circle cx={-27} cy={-27} r={6.5} fill={p.inner} />
          <circle cx={27} cy={-27} r={12} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} />
          <circle cx={27} cy={-27} r={6.5} fill={p.inner} />
        </g>
      ) : (
        <g>
          <path d="M-33 -20L-30 -52L-6 -32Z" fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M-28 -24L-27 -44L-12 -31Z" fill={p.inner} />
          <path d="M33 -20L30 -52L6 -32Z" fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M28 -24L27 -44L12 -31Z" fill={p.inner} />
        </g>
      )}
      {/* body + feet */}
      <ellipse cx={-14} cy={58} rx={11} ry={6} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} />
      <ellipse cx={14} cy={58} rx={11} ry={6} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} />
      <ellipse cx={0} cy={40} rx={30} ry={24} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} />
      <ellipse cx={0} cy={44} rx={16} ry={13} fill={p.inner} opacity={0.5} />
      {/* arms */}
      <ellipse cx={-30} cy={40} rx={8} ry={6} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} transform="rotate(20 -30 40)" />
      <motion.g style={{ transformOrigin: "24px 34px" }} animate={wave ? { rotate: [0, -26, 0, -26, 0] } : { rotate: 0 }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}>
        <ellipse cx={32} cy={30} rx={8} ry={6} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} transform="rotate(-40 32 30)" />
      </motion.g>
      {/* head */}
      <motion.g animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "0px 20px" }}>
        <circle cx={0} cy={0} r={35} fill={p.fur} stroke={p.furDeep} strokeWidth={1.2} />
        {kind === "kitten" ? (
          <g stroke={p.ink} strokeWidth={1.3} strokeLinecap="round" opacity={0.6}>
            <path d="M-46 0L-30 2M-46 8L-30 6M46 0L30 2M46 8L30 6" />
          </g>
        ) : null}
        <Face p={p} mood={mood} />
        {kind === "bunny" ? <g transform="translate(0 -33)"><Bow color={p.bow} deep={p.bowDeep} size={34} /></g> : null}
        {kind === "kitten" ? <g transform="translate(22 -30) rotate(18)"><Bow color={p.bow} deep={p.bowDeep} size={30} /></g> : null}
      </motion.g>
      {kind === "bear" ? <g transform="translate(0 22)"><Bow color={p.bow} deep={p.bowDeep} size={26} /></g> : null}
      {kind === "kitten" ? <path d="M28 52C46 50 54 36 48 26" fill="none" stroke={p.furDeep} strokeWidth={7} strokeLinecap="round" /> : null}
    </svg>
  );
}

/** A ribboned gift box; the lid flies off when `opening`. */
export function GiftBox({ p, opening }: { p: Palette; opening: boolean }) {
  return (
    <svg viewBox="-60 -60 120 110" width="100%" height="100%" style={{ overflow: "visible" }} aria-hidden="true">
      <motion.g
        initial={false}
        animate={opening ? { y: -70, rotate: -28, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "-40px -20px" }}
      >
        <rect x={-54} y={-26} width={108} height={22} rx={6} fill={p.boxLid} />
        <rect x={-10} y={-26} width={20} height={22} fill={p.ribbon} opacity={0.9} />
        {/* The bow the lid is tied with: big enough to read as the thing you want to pull. */}
        <g transform="translate(0 -30)">
          <Bow color={p.ribbon} deep={p.bowDeep} size={52} />
        </g>
      </motion.g>
      <rect x={-46} y={-6} width={92} height={54} rx={7} fill={p.box} />
      <rect x={-46} y={-6} width={92} height={54} rx={7} fill="url(#kw-shade)" />
      <rect x={-10} y={-6} width={20} height={54} fill={p.ribbon} opacity={0.9} />
      <defs>
        <linearGradient id="kw-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.25} />
          <stop offset="1" stopColor="#000" stopOpacity={0.08} />
        </linearGradient>
      </defs>
      {opening ? (
        <motion.circle cx={0} cy={-10} r={10} fill="#fff" initial={{ opacity: 0.9, scale: 0.3 }} animate={{ opacity: 0, scale: 6 }} transition={{ duration: 0.9 }} style={{ transformOrigin: "0px -10px" }} />
      ) : null}
    </svg>
  );
}

/** A ribbon banner with notched ends and text on it. */
export function Banner({ text, p }: { text: string; p: Palette }) {
  return (
    <svg viewBox="-110 -22 220 44" width="100%" height="100%" aria-hidden="true">
      <path d="M-108 -12L-84 -12L-84 12L-108 12L-98 0Z" fill={p.bowDeep} />
      <path d="M108 -12L84 -12L84 12L108 12L98 0Z" fill={p.bowDeep} />
      <rect x={-92} y={-16} width={184} height={32} rx={4} fill={p.bow} />
      <rect x={-92} y={-16} width={184} height={32} rx={4} fill="#fff" opacity={0.12} />
      <text x={0} y={7} textAnchor="middle" fontSize={text.length > 14 ? 14 : 17} fontWeight={700} fill="#fff" style={{ fontFamily: "var(--gift-font-body)", letterSpacing: 1 }}>
        {text}
      </text>
    </svg>
  );
}
