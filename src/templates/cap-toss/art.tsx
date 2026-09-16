"use client";

import { useMemo } from "react";
import { hashString, mulberry32 } from "../_shared/random";
import { mix } from "../_shared/theme";
import type { GownId, TasselId } from "./schema";

/**
 * Everything Cap Toss draws: the evening, the year group in their gowns, the mortarboard
 * waiting in the light and the rolled diploma. All original shapes — no crest, no school,
 * nothing borrowed from anyone.
 */

export type Palette = {
  sky: string;
  glow: string;
  ground: string;
  groundEdge: string;
  /** The board of the cap, lit and shaded. */
  gown: string;
  gownLight: string;
  gownDeep: string;
  crowdBack: string;
  crowdFront: string;
  ink: string;
  soft: string;
  pill: string;
  gold: string;
  goldDeep: string;
  paper: string;
  paperEdge: string;
  paperInk: string;
  sparkle: string[];
};

export const PALETTES: Record<GownId, Palette> = {
  navy: {
    sky: "linear-gradient(180deg,#0A1233 0%,#152459 40%,#27386F 72%,#3A4B85 100%)",
    glow: "radial-gradient(64% 42% at 50% 76%, rgba(232,196,106,0.26), transparent 72%)",
    ground: "#0A1030",
    groundEdge: "#16224E",
    gown: "#1D2C60",
    gownLight: "#2C3F7C",
    gownDeep: "#101A40",
    crowdBack: "#0C1435",
    crowdFront: "#17224F",
    ink: "#F6F0E2",
    soft: "rgba(246,240,226,0.64)",
    pill: "rgba(10,16,42,0.6)",
    gold: "#E8C46A",
    goldDeep: "#B08A2E",
    paper: "#F7EDD9",
    paperEdge: "#E2D1B0",
    paperInk: "#3A3123",
    sparkle: ["#FFE9B0", "#FFFFFF", "#E8C46A"],
  },
  black: {
    sky: "linear-gradient(180deg,#08080B 0%,#141318 44%,#22202A 76%,#2F2B37 100%)",
    glow: "radial-gradient(64% 42% at 50% 76%, rgba(232,196,106,0.22), transparent 72%)",
    ground: "#08070A",
    groundEdge: "#16151B",
    gown: "#1B1922",
    gownLight: "#2C2934",
    gownDeep: "#0E0D12",
    crowdBack: "#0A090D",
    crowdFront: "#191722",
    ink: "#F6F0E2",
    soft: "rgba(246,240,226,0.62)",
    pill: "rgba(8,8,12,0.62)",
    gold: "#E8C46A",
    goldDeep: "#B08A2E",
    paper: "#F7EDD9",
    paperEdge: "#E2D1B0",
    paperInk: "#3A3123",
    sparkle: ["#FFE9B0", "#FFFFFF", "#E8C46A"],
  },
};

export type Tassel = { cord: string; deep: string; band: string };

export const TASSELS: Record<TasselId, Tassel> = {
  gold: { cord: "#E8C46A", deep: "#A87F24", band: "#FFF3D2" },
  crimson: { cord: "#D24A5E", deep: "#8E2135", band: "#FFD8DE" },
  sky: { cord: "#6FB4E6", deep: "#2C6FA8", band: "#D8EEFF" },
  white: { cord: "#F2EBDE", deep: "#B6AA95", band: "#FFFFFF" },
};

/** The mortarboard, seen a little from above: board, skull cap, button and tassel. */
export function Mortarboard({ p, t, swing }: { p: Palette; t: Tassel; swing: boolean }) {
  return (
    <svg viewBox="-62 -34 124 104" width="100%" height="100%" style={{ overflow: "visible" }} aria-hidden="true">
      {/* the skull cap the board sits on, wide enough to show under the corners */}
      <ellipse cx={0} cy={9} rx={27} ry={19} fill={p.gown} />
      <path d="M-27 8Q0 25 27 8L27 12Q0 29 -27 12Z" fill={p.gownDeep} />
      {/* the board: its edge, then its top face */}
      <path d="M0 -21L54 1L0 23L-54 1Z" fill={p.gownDeep} />
      <path d="M0 -26L54 -4L0 18L-54 -4Z" fill={p.gownLight} />
      <path d="M0 -26L54 -4L0 -3Z" fill="#FFFFFF" opacity={0.06} />
      <path d="M0 -26L54 -4L0 18L-54 -4Z" fill="none" stroke={p.gownDeep} strokeOpacity={0.55} strokeWidth={1.4} strokeLinejoin="round" />
      {/* the button, and the tassel hanging off it */}
      <circle cx={0} cy={-4.6} r={4.2} fill={t.deep} />
      <circle cx={-0.5} cy={-5.6} r={2.6} fill={t.cord} />
      {/* The cord lies along the board to the far corner and drops off the edge from there. */}
      <g className={swing ? "ct-swing" : undefined} style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}>
        <path d="M0 -5C20 -8.5 38 -8.5 51 -4.5" fill="none" stroke={t.cord} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M51 -4.5C55 3 55 13 54 21" fill="none" stroke={t.cord} strokeWidth={2.4} strokeLinecap="round" />
        <rect x={49.4} y={20} width={9.2} height={5.6} rx={2.4} fill={t.deep} />
        <rect x={49.4} y={20} width={9.2} height={2} rx={1} fill={t.band} opacity={0.5} />
        {[-3, -1, 1, 3].map((dx) => (
          <path key={dx} d={`M${54 + dx} 25.6L${54 + dx * 1.7} 39`} stroke={t.cord} strokeWidth={1.9} strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
}

type Person = { x: number; s: number; back: boolean; hat: number; sway: number };

/**
 * The year group waiting behind, drawn as silhouettes. Their arms are two shapes rather than
 * one that turns, so going up is a cross-fade: no transform origins to get wrong, and nothing
 * that has to animate when the phone asks for less motion.
 */
export function Crowd({ p, cheering, seed, still }: { p: Palette; cheering: boolean; seed: string; still: boolean }) {
  const people = useMemo(() => {
    const rng = mulberry32(hashString(`${seed}-crowd`));
    const out: Person[] = [];
    for (let i = 0; i < 16; i++) {
      const back = i % 2 === 0;
      const lane = Math.floor(i / 2);
      out.push({
        x: 6 + lane * 14.6 + (back ? 7.4 : 0) + (rng() - 0.5) * 4,
        s: back ? 0.4 + rng() * 0.06 : 0.54 + rng() * 0.09,
        back,
        hat: rng() * 10 - 5,
        sway: rng() * 2.8,
      });
    }
    return out.sort((a, b) => Number(b.back) - Number(a.back));
  }, [seed]);

  return (
    <svg viewBox="0 0 124 34" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {people.map((person, i) => {
        const shade = person.back ? p.crowdBack : p.crowdFront;
        return (
          /* A CSS transform would replace this one, so the sway goes on a group of its own inside. */
          <g key={i} transform={`translate(${person.x} 34) scale(${person.s})`}>
            <g className={still ? undefined : "ct-sway"} style={{ animationDelay: `-${person.sway}s`, transformBox: "fill-box", transformOrigin: "50% 100%" }}>
              {/* arms first, so a raised one never covers the face or the cap */}
              <g stroke={shade} strokeWidth={4.4} strokeLinecap="round" fill="none" style={{ transition: "opacity .5s ease" }} opacity={cheering ? 0 : 1}>
                <path d="M-10 -21Q-17 -13 -16 -4" />
                <path d="M10 -21Q17 -13 16 -4" />
              </g>
              <g stroke={shade} strokeWidth={4.4} strokeLinecap="round" fill="none" style={{ transition: "opacity .5s ease" }} opacity={cheering ? 1 : 0}>
                <path d="M-10 -21Q-20 -27 -19 -38" />
                <path d="M10 -21Q20 -27 19 -38" />
              </g>
              <g fill={shade}>
                <path d="M-13 0L-10.5 -22Q0 -29 10.5 -22L13 0Z" />
                <circle cx={0} cy={-30} r={6.6} />
                <g transform={`rotate(${person.hat} 0 -36)`}>
                  <path d="M0 -41L13.5 -36.5L0 -32L-13.5 -36.5Z" />
                  <rect x={-5} y={-36.5} width={10} height={3.4} rx={1.4} />
                </g>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/** A swag of little flags strung over the whole thing. */
export function Bunting({ p, accent }: { p: Palette; accent: string }) {
  const flags = useMemo(() => {
    const colours = [accent, p.gold, p.paper, p.gownLight];
    return Array.from({ length: 13 }, (_, i) => {
      const f = (i + 0.5) / 13;
      // The string is a shallow curve, so the flags in the middle hang lower.
      return { x: 4 + f * 116, y: 2.4 + Math.sin(f * Math.PI) * 7, fill: colours[i % colours.length] };
    });
  }, [accent, p]);

  return (
    <svg viewBox="0 0 124 20" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 1.5Q62 13 124 1.5" fill="none" stroke={p.gold} strokeOpacity={0.5} strokeWidth={0.8} />
      {flags.map((f, i) => (
        <path key={i} d={`M${f.x - 3.4} ${f.y}L${f.x + 3.4} ${f.y}L${f.x} ${f.y + 7.6}Z`} fill={f.fill} opacity={0.92} />
      ))}
    </svg>
  );
}

/** The rolled diploma, tied shut. `pull` 0..1 drags the ribbon off it. */
export function Diploma({ p, accent, pull }: { p: Palette; accent: string; pull: number }) {
  const off = Math.min(1, Math.max(0, pull));
  const tail = mix(accent, "#000000", 0.2);
  return (
    <svg viewBox="-60 -32 120 68" width="100%" height="100%" style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <linearGradient id="ct-roll" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFBF0" />
          <stop offset="46%" stopColor={p.paper} />
          <stop offset="100%" stopColor={p.paperEdge} />
        </linearGradient>
      </defs>
      <rect x={-46} y={-11} width={92} height={23} rx={11.5} fill="url(#ct-roll)" />
      <path d="M-40 -8.4Q0 -12.4 40 -8.4" fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2.2} strokeLinecap="round" />
      {[-46, 46].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={0.5} rx={5} ry={11.5} fill={p.paperEdge} />
          <ellipse cx={x} cy={0.5} rx={2.6} ry={6.6} fill={p.paper} />
          <ellipse cx={x} cy={0.5} rx={1} ry={2.6} fill={p.paperEdge} />
        </g>
      ))}
      <g style={{ transform: `translateY(${off * 54}px) rotate(${off * 14}deg)`, transformBox: "fill-box", transformOrigin: "50% 0%", opacity: 1 - off * 0.85 }}>
        {/* the two tails first, a shade darker so they read behind the knot */}
        <path d="M-2.6 -12L-6 -10.8L-18.4 16L-15.4 12.6L-13.2 17.4Z" fill={tail} />
        <path d="M2.6 -12L6 -10.8L18.4 16L15.4 12.6L13.2 17.4Z" fill={tail} />
        {/* the band round the roll */}
        <rect x={-4.2} y={-12} width={8.4} height={25} rx={1.4} fill={accent} />
        <rect x={-4.2} y={-12} width={2.6} height={25} fill="#FFFFFF" opacity={0.2} />
        <rect x={-4.2} y={7} width={8.4} height={6} fill="#000000" opacity={0.12} />
        {/* and the bow itself */}
        <path d="M-1.8 -13.6C-11 -23 -25 -21 -23 -14C-21.6 -9.2 -9 -10.6 -1.8 -13.2Z" fill={accent} />
        <path d="M1.8 -13.6C11 -23 25 -21 23 -14C21.6 -9.2 9 -10.6 1.8 -13.2Z" fill={accent} />
        <path d="M-5 -14.4C-11 -18.6 -17 -18 -19 -15.6" fill="none" stroke="#000000" strokeOpacity={0.13} strokeWidth={1.3} strokeLinecap="round" />
        <path d="M5 -14.4C11 -18.6 17 -18 19 -15.6" fill="none" stroke="#000000" strokeOpacity={0.13} strokeWidth={1.3} strokeLinecap="round" />
        <ellipse cx={0} cy={-13.4} rx={3.6} ry={3.1} fill={p.gold} />
        <ellipse cx={-1} cy={-14.3} rx={1.4} ry={1} fill="#FFFFFF" opacity={0.55} />
      </g>
    </svg>
  );
}

/** The gold seal pressed into the diploma. */
export function Seal({ p }: { p: Palette }) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 === 0 ? 24 : 20;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="-28 -28 56 56" width="100%" height="100%" aria-hidden="true">
      <polygon points={points} fill={p.gold} />
      <circle cx={0} cy={0} r={17} fill={p.goldDeep} opacity={0.32} />
      <circle cx={0} cy={0} r={17} fill="none" stroke={p.paper} strokeOpacity={0.6} strokeWidth={1.2} />
      <path d="M-8 1L-2.5 7L9 -7" fill="none" stroke={p.paper} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A frozen scatter of confetti, for the still frame the editor shows. */
export function StillConfetti({ colors, seed }: { colors: string[]; seed: string }) {
  const bits = useMemo(() => {
    const rng = mulberry32(hashString(`${seed}-confetti`));
    return Array.from({ length: 36 }, () => ({
      x: rng() * 100,
      y: rng() * 76,
      w: 0.9 + rng() * 1.4,
      h: 1.8 + rng() * 2.2,
      rot: rng() * 180,
      fill: colors[Math.floor(rng() * colors.length)],
    }));
  }, [colors, seed]);
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      {bits.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={0.35} fill={b.fill} transform={`rotate(${b.rot} ${b.x} ${b.y})`} opacity={0.9} />
      ))}
    </svg>
  );
}
