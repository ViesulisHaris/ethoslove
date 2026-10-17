"use client";

import { useId, type ReactElement } from "react";
import { mulberry32 } from "../_shared/random";
import type { Look } from "./looks";
import { ART, type ThingId } from "./spread";

/**
 * What comes out of the basket, drawn: each on its own view box, lit from the top left, sized by
 * its box (see ART in ./spread for the proportions). The ticket and the photos are the collage
 * kit's, drawn by the template itself.
 */

const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, "");
const r1 = (v: number) => Math.round(v * 10) / 10;

type Satin = Look["satin"];

/* ------------------------------------------------------------------------------------------ */
/* Strawberries                                                                                */
/* ------------------------------------------------------------------------------------------ */

const BERRY = "M0 -18C12 -19 19 -11 18 -1C17 10 8 19 0 23C-8 19 -17 10 -18 -1C-19 -11 -12 -19 0 -18Z";

/** Where the seeds sit on a berry: staggered rows, kept inside its outline. */
const SEEDS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let row = 0; row < 7; row++) {
    const y = -12 + row * 5;
    const half = y < 0 ? 15.5 - Math.abs(y) * 0.12 : 15.5 - y * 0.62;
    for (let x = -14 + (row % 2) * 3; x <= 14; x += 6) if (Math.abs(x) < half - 1.5) out.push([x, y]);
  }
  return out;
})();

function Calyx({ uid, rotate = 0 }: { uid: string; rotate?: number }) {
  return (
    <g transform={`translate(0 -17) rotate(${rotate})`}>
      {[-78, -40, -4, 34, 70, 108, 142].map((a, i) => (
        <path key={i} d="M0 0C3 -3 8 -4 13 -2C8 0 4 2 0 1Z" transform={`rotate(${a}) scale(${i % 2 ? 0.86 : 1})`} fill={`url(#${uid}-leaf)`} stroke="#2F6B25" strokeOpacity=".5" strokeWidth=".5" />
      ))}
      <path d="M0 0C-1 -4 1 -8 4 -10" fill="none" stroke="#4E8A30" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Berry({ uid, x, y, rotate, scale = 1 }: { uid: string; x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d={BERRY} fill={`url(#${uid}-berry)`} stroke="#8A0E1D" strokeOpacity=".35" strokeWidth=".6" />
      {SEEDS.map(([sx, sy], i) => (
        <g key={i} transform={`translate(${sx} ${sy})`}>
          <ellipse rx="1.7" ry="2.3" fill="#8A0E1D" opacity=".32" />
          <ellipse rx=".9" ry="1.4" fill="#F7DD86" />
        </g>
      ))}
      <ellipse cx="-7" cy="-7" rx="3.6" ry="6" fill="#FFFFFF" opacity=".28" transform="rotate(20 -7 -7)" />
      <Calyx uid={uid} rotate={rotate % 30} />
    </g>
  );
}

function HalfBerry({ uid, x, y, rotate }: { uid: string; x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d={BERRY} fill="#D42A3C" />
      <path d={BERRY} transform="scale(.84) translate(0 1)" fill={`url(#${uid}-flesh)`} />
      <path d="M0 -10C4 -12 7 -8 6 -3C5 4 2 9 0 13C-2 9 -5 4 -6 -3C-7 -8 -4 -12 0 -10Z" fill="#FFF1EE" opacity=".85" />
      {SEEDS.filter(([sx, sy]) => Math.abs(sx) > 9 || sy > 11).map(([sx, sy], i) => (
        <ellipse key={i} cx={sx} cy={sy} rx=".7" ry="1.1" fill="#F7DD86" />
      ))}
      <path d="M-15 -14C-8 -19 8 -19 15 -14" fill="none" stroke="#4E8A30" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export function Strawberries({ className }: { className?: string }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-berry`} cx="-6" cy="-7" r="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF7A7C" />
          <stop offset=".5" stopColor="#E3283C" />
          <stop offset="1" stopColor="#A10F22" />
        </radialGradient>
        <radialGradient id={`${uid}-flesh`} cx="0" cy="0" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD5D3" />
          <stop offset=".6" stopColor="#FF8B92" />
          <stop offset="1" stopColor="#F04E5E" />
        </radialGradient>
        <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3F8F33" />
          <stop offset="1" stopColor="#8FD86A" />
        </linearGradient>
      </defs>
      <Berry uid={uid} x={30} y={40} rotate={-28} />
      <Berry uid={uid} x={90} y={42} rotate={24} scale={0.95} />
      <HalfBerry uid={uid} x={58} y={66} rotate={-6} />
      <Berry uid={uid} x={60} y={31} rotate={4} scale={1.05} />
      <Berry uid={uid} x={30} y={72} rotate={-60} scale={0.9} />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* A satin bow, for the cherries and the parcel                                                */
/* ------------------------------------------------------------------------------------------ */

/** A small satin bow centred on 0,0, about 60 across: two loops, two tails and a knot. */
export function Bow({ uid, satin }: { uid: string; satin: Satin }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-satin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={satin.light} />
          <stop offset=".5" stopColor={satin.mid} />
          <stop offset="1" stopColor={satin.deep} />
        </linearGradient>
      </defs>
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(${s} 1)`}>
          <path d="M2 3C6 12 9 22 7 32L13 28L17 33C19 22 13 11 5 2Z" fill={`url(#${uid}-satin)`} stroke={satin.deep} strokeOpacity=".4" strokeWidth=".6" />
          <path d="M-1 -1C-10 -14 -28 -18 -30 -6C-31 4 -16 6 -1 2Z" fill={`url(#${uid}-satin)`} stroke={satin.deep} strokeOpacity=".4" strokeWidth=".6" />
          <path d="M-5 -2C-12 -8 -21 -10 -24 -5" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M-4 1C-12 2 -20 1 -25 -3" fill="none" stroke={satin.deep} strokeOpacity=".35" strokeWidth="1" strokeLinecap="round" />
        </g>
      ))}
      <rect x="-5" y="-5" width="10" height="9" rx="3.5" fill={satin.mid} stroke={satin.deep} strokeOpacity=".5" strokeWidth=".7" />
      <path d="M-2 -3.5C-3 -1 -3 1 -2 2.8" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Cherries                                                                                    */
/* ------------------------------------------------------------------------------------------ */

function Cherry({ uid, x, y, r }: { uid: string; x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={`url(#${uid}-cherry)`} stroke="#6E0718" strokeOpacity=".35" strokeWidth=".7" />
      <path d={`M${-r * 0.35} ${-r * 0.86}C${-r * 0.12} ${-r * 0.7} ${r * 0.12} ${-r * 0.7} ${r * 0.3} ${-r * 0.88}`} fill="none" stroke="#6E0718" strokeOpacity=".45" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx={-r * 0.38} cy={-r * 0.3} rx={r * 0.22} ry={r * 0.34} fill="#FFFFFF" opacity=".7" transform={`rotate(28 ${-r * 0.38} ${-r * 0.3})`} />
      <ellipse cx={r * 0.35} cy={r * 0.42} rx={r * 0.4} ry={r * 0.16} fill="#FFFFFF" opacity=".16" transform={`rotate(-28 ${r * 0.35} ${r * 0.42})`} />
    </g>
  );
}

export function Cherries({ satin, className }: { satin: Satin; className?: string }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 100 102" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-cherry`} cx=".34" cy=".3" r=".78">
          <stop offset="0" stopColor="#FF8FA3" />
          <stop offset=".45" stopColor="#E8304F" />
          <stop offset="1" stopColor="#8E0A24" />
        </radialGradient>
        <linearGradient id={`${uid}-stem`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8BA84E" />
          <stop offset="1" stopColor="#5B7A2C" />
        </linearGradient>
      </defs>
      {/* the stems, meeting where the bow is tied */}
      <path d="M52 20C44 34 34 50 30 64" fill="none" stroke="#3E5A1C" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 20C44 34 34 50 30 64" fill="none" stroke={`url(#${uid}-stem)`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M52 20C58 36 66 52 69 68" fill="none" stroke="#3E5A1C" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 20C58 36 66 52 69 68" fill="none" stroke={`url(#${uid}-stem)`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M53 18C62 8 76 6 84 12C76 20 62 22 53 18Z" fill="#6FAE45" stroke="#3E6B22" strokeOpacity=".6" strokeWidth=".7" />
      <path d="M55 17.5C64 14 73 12 82 12" fill="none" stroke="#3E6B22" strokeOpacity=".55" strokeWidth=".7" />
      <Cherry uid={uid} x={30} y={79} r={18} />
      <Cherry uid={uid} x={70} y={83} r={17} />
      <g transform="translate(51 21) rotate(-8) scale(.62)">
        <Bow uid={`${uid}b`} satin={satin} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Pink lemonade                                                                               */
/* ------------------------------------------------------------------------------------------ */

export function Lemonade({ className }: { className?: string }) {
  const uid = useUid();
  const bottle = "M12 26C12 16 18 12 28 12L96 12C108 12 114 18 122 24L134 29C137 30 139 31 142 31L146 31L146 49L142 49C139 49 137 50 134 51L122 56C114 62 108 68 96 68L28 68C18 68 12 64 12 54Z";
  return (
    <svg viewBox="0 0 172 80" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${uid}-pink`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD3DE" />
          <stop offset=".5" stopColor="#F9A1B8" />
          <stop offset="1" stopColor="#E86F90" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".75" />
          <stop offset=".35" stopColor="#FFFFFF" stopOpacity=".1" />
          <stop offset=".8" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".35" />
        </linearGradient>
        <radialGradient id={`${uid}-lemon`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FFFBD8" />
          <stop offset=".8" stopColor="#FCE58A" />
          <stop offset="1" stopColor="#F2C737" />
        </radialGradient>
        <clipPath id={`${uid}-in`}>
          <path d={bottle} />
        </clipPath>
      </defs>
      {/* the pink, filling the bottle nearly to the neck */}
      <path d={bottle} fill={`url(#${uid}-pink)`} />
      <g clipPath={`url(#${uid}-in)`}>
        <rect x="120" y="0" width="40" height="80" fill="#FFFFFF" opacity=".5" />
        {/* a slice of lemon and a mint leaf, floating */}
        <g transform="translate(58 42) rotate(-18)">
          <circle r="15" fill="#F2C737" />
          <circle r="13" fill={`url(#${uid}-lemon)`} />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M0 0L-3.4 -11.4A12 12 0 0 1 3.4 -11.4Z" transform={`rotate(${i * 45})`} fill="#FFF3B0" stroke="#FFFBE6" strokeWidth=".8" opacity=".85" />
          ))}
          <circle r="1.6" fill="#FFFBE6" />
        </g>
        <path d="M86 30C92 22 104 22 108 28C102 34 92 36 86 30Z" fill="#6DB35A" opacity=".9" />
        <path d="M87 30C94 28 100 27 107 28" fill="none" stroke="#3F7F32" strokeWidth=".7" />
        {[
          [30, 24, 2.2],
          [40, 58, 1.6],
          [96, 52, 2.6],
          [108, 40, 1.4],
          [22, 44, 1.2],
        ].map(([cx, cy, rr], i) => (
          <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth=".8" />
        ))}
        <path d={bottle} fill={`url(#${uid}-glass)`} />
      </g>
      <path d={bottle} fill="none" stroke="#B9707F" strokeOpacity=".55" strokeWidth="1.2" />
      {/* light along the glass */}
      <path d="M22 18L94 18" stroke="#FFFFFF" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" />
      <path d="M104 20C112 22 118 26 124 30" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 62L80 62" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth="1.6" strokeLinecap="round" />
      {/* the swing top: a white stopper, its red seal, the wire */}
      <rect x="145" y="29" width="6" height="22" rx="1.5" fill="#D9364A" />
      <path d="M150 27C158 27 162 32 162 40C162 48 158 53 150 53Z" fill="#FBF8F2" stroke="#BDB3A3" strokeWidth="1" />
      <path d="M152 31C156 32 158 35 158 39" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M160 34L134 22L128 40L134 58L160 46" fill="none" stroke="#8F969C" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Tulips                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** One tulip head, a closed cup pointing to -x, its base at 0,0, about 36 long. */
function TulipHead({ uid, tone }: { uid: string; tone: 0 | 1 | 2 }) {
  const fill = `url(#${uid}-p${tone})`;
  return (
    <g>
      {/* the two petals behind, their points showing above and below */}
      <path d="M-1 -1C-8 -14 -24 -19 -37 -13C-30 -9 -20 -6 -1 -1Z" fill={fill} stroke="#A83A62" strokeOpacity=".4" strokeWidth=".6" />
      <path d="M-1 1C-8 14 -24 19 -37 13C-30 9 -20 6 -1 1Z" fill={fill} stroke="#A83A62" strokeOpacity=".4" strokeWidth=".6" />
      {/* the petal in front, cupped */}
      <path d="M1 0C-2 -11 -18 -16 -31 -11C-37 -8 -39 -3 -35 0C-39 3 -37 8 -31 11C-18 16 -2 11 1 0Z" fill={fill} stroke="#A83A62" strokeOpacity=".5" strokeWidth=".7" />
      <path d="M-3 -3C-10 -9 -21 -11 -30 -8" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-4 2C-12 5 -22 6 -31 4" fill="none" stroke="#A83A62" strokeOpacity=".28" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M-35 0C-31 -1 -27 -1 -24 0" fill="none" stroke="#A83A62" strokeOpacity=".35" strokeWidth=".8" strokeLinecap="round" />
      {/* where it meets the stem */}
      <path d="M2 -3C4 -1 4 1 2 3L0 2L0 -2Z" fill="#5E9C4E" />
    </g>
  );
}

export function Tulips({ className }: { className?: string }) {
  const uid = useUid();
  // Heads to the left, stems running right into the paper.
  const heads: { x: number; y: number; r: number; s: number; tone: 0 | 1 | 2 }[] = [
    { x: 58, y: 24, r: 22, s: 0.92, tone: 1 },
    { x: 60, y: 76, r: -20, s: 0.9, tone: 2 },
    { x: 52, y: 40, r: 8, s: 1.02, tone: 0 },
    { x: 52, y: 60, r: -8, s: 1, tone: 1 },
    { x: 64, y: 50, r: 0, s: 1.06, tone: 2 },
  ];
  return (
    <svg viewBox="0 0 176 100" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        {[
          ["#C9467A", "#F28BB0", "#FFD9E6"],
          ["#D9608C", "#F9A9C4", "#FFE8F0"],
          ["#E07A9E", "#FBC4D6", "#FFF4F7"],
        ].map(([deep, mid, light], i) => (
          <linearGradient key={i} id={`${uid}-p${i}`} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor={deep} />
            <stop offset=".5" stopColor={mid} />
            <stop offset="1" stopColor={light} />
          </linearGradient>
        ))}
        <linearGradient id={`${uid}-kraft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EED3A8" />
          <stop offset=".55" stopColor="#D6AB76" />
          <stop offset="1" stopColor="#B88A54" />
        </linearGradient>
        <linearGradient id={`${uid}-inside`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F7E6C8" />
          <stop offset="1" stopColor="#D9B585" />
        </linearGradient>
        <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#94C981" />
          <stop offset="1" stopColor="#4C8A45" />
        </linearGradient>
      </defs>
      {/* the inside of the paper, open behind the flowers */}
      <path d="M70 6C84 16 96 34 150 44L150 56C96 66 84 84 70 94C62 76 60 24 70 6Z" fill={`url(#${uid}-inside)`} stroke="#9A7243" strokeOpacity=".45" strokeWidth=".8" />
      {/* leaves and stems */}
      <path d="M66 36C88 18 114 16 134 24C114 28 92 36 72 46Z" fill={`url(#${uid}-blade)`} stroke="#3C6E36" strokeOpacity=".5" strokeWidth=".6" />
      <path d="M68 66C92 82 118 84 138 76C118 72 94 64 74 56Z" fill={`url(#${uid}-blade)`} stroke="#3C6E36" strokeOpacity=".5" strokeWidth=".6" />
      {heads.map((h, i) => (
        <path key={i} d={`M${h.x} ${h.y}C${h.x + 30} ${h.y + (50 - h.y) * 0.5} 120 ${50 + (h.y - 50) * 0.12} 172 ${50 + (h.y - 50) * 0.1}`} fill="none" stroke="#5E9C4E" strokeWidth="3.2" strokeLinecap="round" />
      ))}
      {heads.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.r}) scale(${h.s})`}>
          <TulipHead uid={uid} tone={h.tone} />
        </g>
      ))}
      {/* the front of the paper, folded over the stems, and the twine */}
      <path d="M86 30C100 38 120 44 152 46L152 54C120 56 100 62 86 70C92 58 92 42 86 30Z" fill={`url(#${uid}-kraft)`} stroke="#8E6437" strokeOpacity=".55" strokeWidth=".8" />
      <path d="M86 30C92 42 92 58 86 70" fill="none" stroke="#FFF4DE" strokeOpacity=".7" strokeWidth="1.4" />
      <path d="M104 40C107 46 107 54 104 60M120 43C122 48 122 52 120 57" fill="none" stroke="#8E6437" strokeOpacity=".3" strokeWidth="1" />
      <path d="M130 44C132 48 132 52 130 56" fill="none" stroke="#FBF3E4" strokeWidth="2.6" />
      <path d="M130 44C132 48 132 52 130 56" fill="none" stroke="#A88460" strokeWidth=".9" strokeDasharray="1.4 1.1" />
      <path d="M131 50C136 43 143 45 141 50C140 54 134 53 131 50C136 56 135 63 130 66M131 50C128 56 124 60 122 66" fill="none" stroke="#FBF3E4" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Sandwiches                                                                                  */
/* ------------------------------------------------------------------------------------------ */

function Sandwich({ uid, x, y, rotate }: { uid: string; x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      {/* the cut face: bread, cucumber and cream, bread */}
      <path d="M-34 8L34 8L34 22L-34 22Z" fill="#F4DDB2" />
      <path d="M-34 13L34 13L34 17L-34 17Z" fill="#FFF8EA" />
      {[-26, -12, 2, 16, 28].map((cx) => (
        <ellipse key={cx} cx={cx} cy="15" rx="6" ry="2.2" fill="#A7D27C" stroke="#4E8A3A" strokeWidth=".9" />
      ))}
      <path d="M-34 22L34 22" stroke="#C99A5C" strokeWidth="2" />
      <path d="M-34 8L34 8L34 22L-34 22Z" fill="none" stroke="#B98B4E" strokeOpacity=".6" strokeWidth=".8" />
      {/* the top slice, crust round the edge */}
      <path d="M-36 8L0 -30L36 8Z" fill="#D9A45C" />
      <path d="M-30 5L0 -24L30 5Z" fill={`url(#${uid}-crumb)`} />
      {[
        [-12, -4],
        [4, -12],
        [10, 0],
        [-4, 2],
        [16, -2],
        [-18, 1],
      ].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="1.1" ry=".7" fill="#D9BD8A" opacity=".7" />
      ))}
    </g>
  );
}

export function Sandwiches({ className }: { className?: string }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 120 90" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-crumb`} cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#FFFBF0" />
          <stop offset="1" stopColor="#F3E0BD" />
        </radialGradient>
      </defs>
      <Sandwich uid={uid} x={46} y={58} rotate={-8} />
      <Sandwich uid={uid} x={76} y={40} rotate={12} />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Jam                                                                                         */
/* ------------------------------------------------------------------------------------------ */

export function Jam({ look, className }: { look: Look; className?: string }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 80 92" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${uid}-jam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7E0E1E" />
          <stop offset=".35" stopColor="#C7243A" />
          <stop offset=".7" stopColor="#B01C33" />
          <stop offset="1" stopColor="#6A0A18" />
        </linearGradient>
        <pattern id={`${uid}-check`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={look.cloth} />
          <rect width="4" height="8" fill={look.check} />
          <rect width="8" height="4" fill={look.check} />
        </pattern>
      </defs>
      {/* the jar */}
      <path d="M14 34C12 30 14 26 18 26L62 26C66 26 68 30 66 34C70 44 70 76 64 84C60 88 20 88 16 84C10 76 10 44 14 34Z" fill={`url(#${uid}-jam)`} stroke="#5A0814" strokeOpacity=".4" strokeWidth=".8" />
      <path d="M20 40C18 54 18 70 22 80" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      <path d="M58 44C60 54 60 66 58 74" fill="none" stroke="#FFFFFF" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />
      {/* a blank label with a heart on it */}
      <rect x="25" y="50" width="30" height="20" rx="3" fill="#FBF3E4" stroke="#C9B08A" strokeWidth=".8" />
      <path d="M40 65C34 61 31 58 32 55C33 52 37 52 40 55C43 52 47 52 48 55C49 58 46 61 40 65Z" fill={look.satin.mid} />
      {/* the cloth over the lid, pinked at the edge, tied with twine */}
      <path d="M8 24C10 14 22 8 40 8C58 8 70 14 72 24L70 30L66 27L62 32L57 28L52 33L47 29L42 34L37 29L32 33L27 28L22 32L17 27L13 31L9 28Z" fill={`url(#${uid}-check)`} stroke="#B9A48A" strokeOpacity=".7" strokeWidth=".8" />
      <path d="M12 21C22 16 58 16 68 21" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.4" />
      <path d="M13 29C26 32 54 32 67 29" fill="none" stroke="#C8A77D" strokeWidth="2.4" />
      <path d="M40 30C34 24 30 28 34 32C37 34 40 31 40 30C40 31 43 34 46 32C50 28 46 24 40 30Z" fill="none" stroke="#C8A77D" strokeWidth="1.6" />
      <path d="M38 32L35 40M42 32L45 39" stroke="#C8A77D" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Macarons                                                                                    */
/* ------------------------------------------------------------------------------------------ */

function Macaron({ uid, x, y, rotate, tone }: { uid: string; x: number; y: number; rotate: number; tone: 0 | 1 | 2 }) {
  const [light, base, deep] = MACARON[tone];
  const shell = `url(#${uid}-m${tone})`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      {/* the bottom shell, its frilled foot, the filling, the top shell's foot, the dome */}
      <path d="M-21 11C-21 19 21 19 21 11L21 9L-21 9Z" fill={deep} />
      <path d="M-21 9L21 9L21 12C14 14 -14 14 -21 12Z" fill={base} opacity=".9" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={`b${i}`} x={-21 + i * 3.6} y="6.4" width="2.6" height="3.4" rx="1.2" fill={light} opacity=".9" />
      ))}
      <path d="M-20.5 2.6C-21.5 4 -21.5 6 -20.5 7L20.5 7C21.5 6 21.5 4 20.5 2.6Z" fill="#FFF8EE" />
      <path d="M-20 3.4L20 3.4" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth=".8" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={`t${i}`} x={-21 + i * 3.6} y="-.4" width="2.6" height="3.6" rx="1.2" fill={light} opacity=".95" />
      ))}
      <path d="M-22 1C-22 -15 22 -15 22 1C14 4 -14 4 -22 1Z" fill={shell} stroke={deep} strokeOpacity=".45" strokeWidth=".6" />
      <path d="M-13 -6C-7 -10 5 -11 11 -8" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

const MACARON: [string, string, string][] = [
  ["#FFE3EB", "#F7B3C6", "#D97E9C"],
  ["#FFF4DC", "#F9DDAE", "#D7AE72"],
  ["#F3EBFF", "#D6C2F2", "#A68BD0"],
];

export function Macarons({ className }: { className?: string }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        {MACARON.map(([light, base, deep], i) => (
          <radialGradient key={i} id={`${uid}-m${i}`} cx=".38" cy=".2" r=".9">
            <stop offset="0" stopColor={light} />
            <stop offset=".55" stopColor={base} />
            <stop offset="1" stopColor={deep} />
          </radialGradient>
        ))}
      </defs>
      <Macaron uid={uid} x={30} y={50} rotate={-10} tone={0} />
      <Macaron uid={uid} x={90} y={52} rotate={9} tone={2} />
      <Macaron uid={uid} x={60} y={34} rotate={2} tone={1} />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The parcel with the date in it                                                              */
/* ------------------------------------------------------------------------------------------ */

export function Parcel({ satin, className }: { satin: Satin; className?: string }) {
  const uid = useUid();
  return (
    <svg viewBox="0 0 100 92" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${uid}-kraft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E7C79A" />
          <stop offset="1" stopColor="#C49868" />
        </linearGradient>
        <linearGradient id={`${uid}-top`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5DDB6" />
          <stop offset="1" stopColor="#DDB888" />
        </linearGradient>
        <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={satin.deep} />
          <stop offset=".45" stopColor={satin.light} />
          <stop offset="1" stopColor={satin.mid} />
        </linearGradient>
      </defs>
      {/* the top, then the front */}
      <path d="M14 30L50 18L90 28L54 42Z" fill={`url(#${uid}-top)`} stroke="#9A7243" strokeOpacity=".5" strokeWidth=".8" />
      <path d="M14 30L54 42L54 84L14 72Z" fill={`url(#${uid}-kraft)`} stroke="#9A7243" strokeOpacity=".5" strokeWidth=".8" />
      <path d="M54 42L90 28L90 70L54 84Z" fill="#B88A58" stroke="#9A7243" strokeOpacity=".5" strokeWidth=".8" />
      {/* the ribbon, both ways round */}
      <path d="M31 24L69 37L69 40L31 27Z" fill={satin.mid} />
      <path d="M30 35L38 37.4L38 79L30 76.6Z" fill={`url(#${uid}-band)`} />
      <path d="M68 37L75 34.3L75 76.3L68 79Z" fill={satin.deep} opacity=".85" />
      <path d="M52 23L60 26L42 32.6L34 29.6Z" fill={satin.light} opacity=".9" />
      <g transform="translate(51 26) scale(.55)">
        <Bow uid={`${uid}b`} satin={satin} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Butterflies                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** One side of a butterfly, the body along x = 0, the wings reaching to -x: a forewing over a hindwing. */
export function Wing({ wings }: { wings: Look["butterflies"][number] }) {
  const uid = useUid();
  return (
    <svg viewBox="-50 -40 50 84" className="block h-full w-full" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-w`} cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
          <stop offset=".1" stopColor={wings.inner} />
          <stop offset=".75" stopColor={wings.outer} />
          <stop offset="1" stopColor={wings.vein} />
        </radialGradient>
      </defs>
      <path d="M0 3C-9 6 -28 10 -33 23C-37 35 -21 42 -11 33C-5 26 -2 14 0 6Z" fill={`url(#${uid}-w)`} stroke={wings.vein} strokeOpacity=".55" strokeWidth=".9" />
      <path d="M0 -1C-7 -18 -30 -36 -44 -28C-52 -22 -44 -8 -30 0C-20 5 -8 4 0 1Z" fill={`url(#${uid}-w)`} stroke={wings.vein} strokeOpacity=".6" strokeWidth=".9" />
      <path d="M-2 -1C-12 -10 -24 -20 -38 -24M-3 0C-14 -4 -26 -8 -40 -10M-2 5C-10 12 -18 20 -24 30M-2 5C-12 10 -24 16 -30 22" fill="none" stroke={wings.vein} strokeOpacity=".4" strokeWidth=".7" />
      {[
        [-40, -22, 1.6],
        [-43, -14, 1.3],
        [-34, -28, 1.2],
        [-27, 32, 1.3],
        [-31, 26, 1.1],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={wings.spot} opacity=".85" />
      ))}
    </svg>
  );
}

/** The body between the wings, with its antennae. */
export function WingBody({ color = "#3B2A2E" }: { color?: string }) {
  return (
    <svg viewBox="-6 -40 12 84" className="block h-full w-full" aria-hidden="true" style={{ overflow: "visible" }}>
      <path d="M-.6 -9C-4 -18 -6 -26 -9 -32M.6 -9C4 -18 6 -26 9 -32" fill="none" stroke={color} strokeWidth=".9" strokeLinecap="round" />
      <circle cx="-9" cy="-32" r="1.3" fill={color} />
      <circle cx="9" cy="-32" r="1.3" fill={color} />
      <ellipse cx="0" cy="-7" rx="2.4" ry="2.6" fill={color} />
      <ellipse cx="0" cy="8" rx="2.1" ry="13" fill={color} />
      <path d="M-1.6 0H1.6M-1.8 4H1.8M-1.8 8H1.8M-1.6 12H1.6" stroke="#FFFFFF" strokeOpacity=".25" strokeWidth=".6" />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* One drawing for each thing                                                                  */
/* ------------------------------------------------------------------------------------------ */

export function ThingArt({ thing, look, className }: { thing: Exclude<ThingId, "ticket">; look: Look; className?: string }): ReactElement {
  switch (thing) {
    case "strawberries":
      return <Strawberries className={className} />;
    case "cherries":
      return <Cherries satin={look.satin} className={className} />;
    case "lemonade":
      return <Lemonade className={className} />;
    case "tulips":
      return <Tulips className={className} />;
    case "sandwiches":
      return <Sandwiches className={className} />;
    case "jam":
      return <Jam look={look} className={className} />;
    case "macarons":
      return <Macarons className={className} />;
  }
}

/** The height of a thing's box for a given width, from its proportions. */
export const artHeight = (thing: ThingId, w: number) => r1(w * ART[thing].ratio);

/* ------------------------------------------------------------------------------------------ */
/* The meadow                                                                                  */
/* ------------------------------------------------------------------------------------------ */

const GREENS = ["#5C9A3E", "#6BAA48", "#78B652", "#4E8834", "#86C25E", "#62A043", "#9ACD6C", "#548F39"];

/**
 * A square of lawn seen from above, as an SVG data URI: short tapered blades lying mostly one way,
 * the way a mown lawn does, over a green ground, with a clover leaf or two. Seeded, so it is the
 * same everywhere. Tiled twice at two sizes, so the repeat never lines up.
 */
function lawnTile(seed: number, blades: number, clover: number, lean: number): string {
  const random = mulberry32(seed);
  const parts: string[] = [];
  for (let i = 0; i < blades; i++) {
    const x = random() * 120;
    const y = random() * 120;
    const len = 4 + random() * 8;
    const a = lean + (random() - 0.5) * 1.6;
    const w = 0.6 + random() * 0.9;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    const nx = Math.cos(a + Math.PI / 2) * w;
    const ny = Math.sin(a + Math.PI / 2) * w;
    const c = GREENS[Math.floor(random() * GREENS.length)];
    // Every blade is drawn in each of the tiles round it, so the ones crossing an edge wrap.
    for (const dx of [-120, 0, 120])
      for (const dy of [-120, 0, 120]) {
        if (Math.max(x, ex) + dx < 0 || Math.min(x, ex) + dx > 120 || Math.max(y, ey) + dy < 0 || Math.min(y, ey) + dy > 120) continue;
        parts.push(`<path d='M${r1(x + dx - nx)} ${r1(y + dy - ny)}Q${r1((x + ex) / 2 + dx)} ${r1((y + ey) / 2 + dy)} ${r1(ex + dx)} ${r1(ey + dy)}Q${r1((x + ex) / 2 + dx + nx)} ${r1((y + ey) / 2 + dy + ny)} ${r1(x + dx + nx)} ${r1(y + dy + ny)}Z' fill='${c}'/>`);
      }
  }
  for (let i = 0; i < clover; i++) {
    const x = r1(12 + random() * 96);
    const y = r1(12 + random() * 96);
    const rot = Math.round(random() * 120);
    parts.push(`<g transform='translate(${x} ${y}) rotate(${rot})' fill='#7FBF5A' stroke='#4E8834' stroke-width='.3'><circle cx='0' cy='-2.3' r='2.2'/><circle cx='2' cy='1.2' r='2.2'/><circle cx='-2' cy='1.2' r='2.2'/></g>`);
  }
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>${parts.join("").replace(/#/g, "%23")}</svg>")`;
}

export const LAWN = { fine: lawnTile(7, 330, 2, -1.1), coarse: lawnTile(19, 120, 1, -0.7) };
