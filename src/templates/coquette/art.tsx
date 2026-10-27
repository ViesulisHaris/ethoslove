"use client";

import { motion } from "motion/react";
import type { Look } from "./looks";

type Satin = Look["satin"];

const VIEW = "-100 -70 200 170";
/** Where the knot sits inside the bow's box, for everything that swings on it. */
const KNOT_ORIGIN = "50% 41.2%";

function Defs({ id, satin }: { id: string; satin: Satin }) {
  return (
    <defs>
      <linearGradient id={`${id}-loop`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={satin.light} />
        <stop offset=".45" stopColor={satin.mid} />
        <stop offset="1" stopColor={satin.deep} />
      </linearGradient>
      <linearGradient id={`${id}-tail`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={satin.mid} />
        <stop offset=".5" stopColor={satin.light} />
        <stop offset="1" stopColor={satin.deep} />
      </linearGradient>
      <radialGradient id={`${id}-knot`} cx="40%" cy="30%">
        <stop offset="0" stopColor={satin.light} />
        <stop offset="1" stopColor={satin.deep} />
      </radialGradient>
    </defs>
  );
}

function Loop({ id, satin, flip }: { id: string; satin: Satin; flip: boolean }) {
  return (
    <svg viewBox={VIEW} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <Defs id={id} satin={satin} />
      <g transform={flip ? "scale(-1 1)" : undefined}>
        <path d="M-8 -5 C-38 -62 -98 -56 -94 -6 C-92 32 -44 28 -8 9 Z" fill={`url(#${id}-loop)`} stroke={satin.deep} strokeOpacity=".35" strokeWidth="1" />
        {/* the inside of the loop, seen through it */}
        <path d="M-16 0 C-40 -32 -76 -30 -74 -5 C-72 13 -44 13 -16 5 Z" fill={satin.deep} opacity=".5" />
        {/* the sheen along the top, and the gathers running into the knot */}
        <path d="M-22 -22 C-44 -46 -78 -44 -86 -18" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
        <path d="M-10 -3 C-30 -14 -52 -18 -72 -14 M-10 5 C-32 8 -54 18 -70 20" fill="none" stroke={satin.deep} strokeOpacity=".32" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Tails({ id, satin }: { id: string; satin: Satin }) {
  const tail = "M-7 6 C-20 40 -40 68 -60 94 L-42 86 L-35 102 C-18 72 -3 40 5 10 Z";
  return (
    <svg viewBox={VIEW} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <Defs id={id} satin={satin} />
      <path d={tail} fill={`url(#${id}-tail)`} stroke={satin.deep} strokeOpacity=".3" strokeWidth="1" />
      <g transform="scale(-1 1)">
        <path d={tail} fill={`url(#${id}-tail)`} stroke={satin.deep} strokeOpacity=".3" strokeWidth="1" />
      </g>
      <path d="M-12 22 C-24 48 -38 68 -50 86" fill="none" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function Knot({ id, satin }: { id: string; satin: Satin }) {
  return (
    <svg viewBox={VIEW} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <Defs id={id} satin={satin} />
      <rect x="-14" y="-14" width="28" height="30" rx="10" fill={`url(#${id}-knot)`} stroke={satin.deep} strokeOpacity=".4" strokeWidth="1" />
      <path d="M-6 -12 C-9 -2 -9 6 -5 14 M5 -12 C8 -2 8 6 4 14" fill="none" stroke={satin.deep} strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A satin bow in four pieces that come apart when it is untied: the knot gives with a little pop,
 * the loops spring out to the sides and fall away turning, and the tails slide down after them.
 * Still, or with reduced motion, it only fades.
 */
export function SatinBow({ id, satin, untied, reduce, className }: { id: string; satin: Satin; untied: boolean; reduce: boolean; className?: string }) {
  const quick = { duration: 0.15 };
  // Out to the side first, then gravity: the keyframes ease out, then fall.
  const fall = { duration: 0.95, times: [0, 0.28, 1], ease: [[0.2, 0.8, 0.3, 1], [0.6, 0, 0.9, 0.5]] as [number, number, number, number][] };
  const loop = (side: 1 | -1) => (untied ? (reduce ? { opacity: 0 } : { x: ["0%", `${side * 20}%`, `${side * 34}%`], y: ["0%", "-9%", "78%"], rotate: [0, side * 26, side * 100], opacity: [1, 1, 0] }) : { x: "0%", y: "0%", rotate: 0, opacity: 1 });
  return (
    <div className={className} style={{ aspectRatio: "200 / 170", filter: "drop-shadow(0 calc(1.4*var(--p)) calc(2*var(--p)) rgba(80,20,45,.32))" }}>
      <motion.div className="absolute inset-0" animate={untied ? (reduce ? { opacity: 0 } : { y: ["0%", "-3%", "115%"], rotate: [0, -4, 9], opacity: [1, 1, 0] }) : { y: "0%", rotate: 0, opacity: 1 }} transition={untied && !reduce ? { ...fall, delay: 0.08 } : quick}>
        <Tails id={`${id}-t`} satin={satin} />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ transformOrigin: KNOT_ORIGIN }} animate={loop(-1)} transition={untied && !reduce ? fall : quick}>
        <Loop id={`${id}-l`} satin={satin} flip={false} />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ transformOrigin: KNOT_ORIGIN }} animate={loop(1)} transition={untied && !reduce ? { ...fall, delay: 0.04 } : quick}>
        <Loop id={`${id}-r`} satin={satin} flip />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ transformOrigin: KNOT_ORIGIN }} animate={untied ? (reduce ? { opacity: 0 } : { scale: [1, 1.25, 0], opacity: [1, 1, 0] }) : { scale: 1, opacity: 1 }} transition={untied && !reduce ? { duration: 0.45, times: [0, 0.3, 1] } : quick}>
        <Knot id={`${id}-k`} satin={satin} />
      </motion.div>
    </div>
  );
}

/** A length of the same satin, for the ribbon the bow is tied in. */
export const satinBand = (satin: Satin, across: boolean): string =>
  `linear-gradient(${across ? "180deg" : "90deg"}, ${satin.deep} 0%, ${satin.mid} 18%, ${satin.light} 46%, ${satin.mid} 72%, ${satin.deep} 100%)`;
