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
 * A satin bow in four pieces that come apart when it is untied: the loops fold into the knot,
 * the tails slip down, the knot lets go.
 */
export function SatinBow({ id, satin, untied, reduce, className }: { id: string; satin: Satin; untied: boolean; reduce: boolean; className?: string }) {
  const ease = { duration: reduce ? 0.15 : 0.7, ease: [0.5, 0, 0.2, 1] as const };
  return (
    <div className={className} style={{ aspectRatio: "200 / 170", filter: "drop-shadow(0 calc(1.4*var(--p)) calc(2*var(--p)) rgba(80,20,45,.32))" }}>
      <motion.div className="absolute inset-0" animate={untied ? { y: "46%", opacity: 0, scaleY: 1.3 } : { y: 0, opacity: 1, scaleY: 1 }} transition={{ ...ease, delay: untied && !reduce ? 0.12 : 0 }}>
        <Tails id={`${id}-t`} satin={satin} />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ transformOrigin: KNOT_ORIGIN }} animate={untied ? { rotate: -48, scale: 0.12, opacity: 0 } : { rotate: 0, scale: 1, opacity: 1 }} transition={ease}>
        <Loop id={`${id}-l`} satin={satin} flip={false} />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ transformOrigin: KNOT_ORIGIN }} animate={untied ? { rotate: 48, scale: 0.12, opacity: 0 } : { rotate: 0, scale: 1, opacity: 1 }} transition={ease}>
        <Loop id={`${id}-r`} satin={satin} flip />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ transformOrigin: KNOT_ORIGIN }} animate={untied ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ ...ease, delay: untied && !reduce ? 0.2 : 0 }}>
        <Knot id={`${id}-k`} satin={satin} />
      </motion.div>
    </div>
  );
}

/** A length of the same satin, for the ribbon the bow is tied in. */
export const satinBand = (satin: Satin, across: boolean): string =>
  `linear-gradient(${across ? "180deg" : "90deg"}, ${satin.deep} 0%, ${satin.mid} 18%, ${satin.light} 46%, ${satin.mid} 72%, ${satin.deep} 100%)`;
