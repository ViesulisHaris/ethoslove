"use client";

import { useId, type ReactNode, type Ref } from "react";
import { FACES, NAME_BAND, type FaceId } from "./design";
import type { Look } from "./looks";

const FACE_FONT = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif';

type PumpkinProps = {
  look: Look;
  face: FaceId;
  name: string;
  /** How many of the face's cuts are out: their cavities are dark. */
  doneCuts: number;
  nameDone: boolean;
  /** The candle is lit: the light shows through every cut that is out. */
  lit: boolean;
  /** No flicker: the editor's still frame, and anyone who asked for less motion. */
  still?: boolean;
  svgRef?: Ref<SVGSVGElement>;
  /** Drawn over the pumpkin in its own coordinates: the knife. */
  children?: ReactNode;
};

/**
 * The pumpkin, in a 100 × 92 box: five ribs, a stem, a shadow on the table; then, on top, the cuts.
 * A cut that is out is a dark cavity, and once the candle is lit the same shapes become a mask the
 * light shines through, so the glow is exactly the carving and nothing else. The outlines the knife
 * draws are separate paths (`data-cut`, `data-name-line`), left for the carving loop to move.
 */
export function Pumpkin({ look, face, name, doneCuts, nameDone, lit, still = false, svgRef, children }: PumpkinProps) {
  const id = useId().replace(/:/g, "");
  const cuts = FACES[face];
  const [light, mid, deep] = look.skin;
  const band = NAME_BAND.x2 - NAME_BAND.x1;
  const natural = name.length * NAME_BAND.size * 0.72;
  const fit = natural > band ? band : undefined;
  const text = { x: 50, y: NAME_BAND.y, textAnchor: "middle" as const, fontFamily: FACE_FONT, fontWeight: 900, fontSize: NAME_BAND.size, letterSpacing: ".06em", textLength: fit, lengthAdjust: fit ? ("spacingAndGlyphs" as const) : undefined };
  const out = cuts.slice(0, doneCuts);

  return (
    <svg ref={svgRef} viewBox="0 0 100 92" className="block h-full w-full overflow-visible" role="img" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}c`} cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor={light} />
          <stop offset=".55" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
        <linearGradient id={`${id}r`} x1="0" x2="1">
          <stop offset="0" stopColor={deep} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.stem[0]} />
          <stop offset="1" stopColor={look.stem[1]} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="50%" cy="54%" r="62%">
          <stop offset="0" stopColor={look.light[0]} />
          <stop offset=".5" stopColor={look.light[1]} />
          <stop offset="1" stopColor={look.light[2]} />
        </radialGradient>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="112">
          <rect x="-10" y="-10" width="120" height="112" fill="#000" />
          {out.map((cut) => (
            <path key={cut.id} d={cut.d} fill="#fff" stroke="#fff" strokeWidth=".6" strokeLinejoin="round" />
          ))}
          {nameDone ? <text {...text} fill="#fff">{name}</text> : null}
        </mask>
        <clipPath id={`${id}n`}>
          <rect data-name-clip x={NAME_BAND.x1 - 6} y={NAME_BAND.y - 12} width="0" height="16" />
        </clipPath>
        <filter id={`${id}b`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${id}d`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      <ellipse cx="50" cy="87.6" rx="38" ry="3.6" fill="#000" opacity=".6" filter={`url(#${id}d)`} />
      {/* the ribs, outermost first, each a lobe of the same fruit */}
      {[
        [20, 16, 31],
        [80, 16, 31],
        [33, 19, 35],
        [67, 19, 35],
        [50, 21, 37],
      ].map(([cx, rx, ry], i) => (
        <g key={i}>
          <ellipse cx={cx} cy="49" rx={rx} ry={ry} fill={`url(#${id}${i === 4 ? "c" : "r"})`} />
          <ellipse cx={cx} cy="49" rx={rx} ry={ry} fill="none" stroke={deep} strokeOpacity=".4" strokeWidth=".7" />
        </g>
      ))}
      <ellipse cx="38" cy="31" rx="13" ry="9" transform="rotate(-24 38 31)" fill="#fff" opacity=".14" filter={`url(#${id}d)`} />
      <path d="M46 15 C 44.5 7.5 49 2.6 56.5 4 C 55.5 8 55 11.5 54.5 15.5 Z" fill={`url(#${id}s)`} />
      <path d="M56 5 C 62.5 3.6 65 9 60.5 11.4" fill="none" stroke={look.stem[0]} strokeWidth="1.1" strokeLinecap="round" />

      {/* what has been cut out so far: dark, with the wall of the rind round it */}
      {out.map((cut) => (
        <path key={cut.id} d={cut.d} fill="#140803" stroke={deep} strokeWidth=".8" strokeLinejoin="round" />
      ))}
      {nameDone ? (
        <text {...text} fill="#140803" stroke={deep} strokeWidth=".4">
          {name}
        </text>
      ) : null}

      {/* the candle, lit: the light is the carving */}
      <ellipse cx="50" cy="52" rx="44" ry="38" fill={`url(#${id}g)`} opacity={lit ? 0.2 : 0} style={{ mixBlendMode: "screen", transition: "opacity .9s ease" }} />
      <g mask={`url(#${id}m)`} filter={`url(#${id}b)`} style={{ opacity: lit ? 0.9 : 0, transition: "opacity .7s ease" }}>
        <rect x="-10" y="-10" width="120" height="112" fill={`url(#${id}g)`} />
      </g>
      <g mask={`url(#${id}m)`} className={lit && !still ? "jl-flicker" : undefined} style={{ opacity: lit ? 1 : 0, transition: "opacity .5s ease" }}>
        <rect x="-10" y="-10" width="120" height="112" fill={`url(#${id}g)`} />
      </g>

      {/* the knife's scratch, drawn as it goes, and gone once the piece is out */}
      <g fill="none" stroke="#fff6d8" strokeLinecap="round" strokeLinejoin="round">
        {cuts.map((cut, i) => (
          <path key={cut.id} data-cut={i} d={cut.d} pathLength={1} strokeWidth=".8" strokeDasharray="1" strokeDashoffset="1" style={{ opacity: i < doneCuts ? 0 : 0.95, transition: "opacity .25s ease" }} />
        ))}
        <text data-name-line {...text} fill="none" strokeWidth=".45" clipPath={`url(#${id}n)`} style={{ opacity: nameDone ? 0 : 0.95, transition: "opacity .25s ease" }}>
          {name}
        </text>
      </g>
      {children}
    </svg>
  );
}

/** A carving knife with its tip at the origin and its blade rising to the right, ready to be moved along a cut. */
export function Knife({ gRef }: { gRef: Ref<SVGGElement> }) {
  const id = useId().replace(/:/g, "");
  return (
    <g ref={gRef} transform="translate(66 101)" style={{ filter: "drop-shadow(0 1.2px 1.4px rgba(0,0,0,.6))" }}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f6f8" />
          <stop offset="1" stopColor="#8d99a3" />
        </linearGradient>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a371c" />
          <stop offset="1" stopColor="#2a170a" />
        </linearGradient>
      </defs>
      <g transform="rotate(-24)">
        <path d="M0 0 L6 -2.9 L21 -2.9 L21 2.3 L5.4 1.7 Z" fill={`url(#${id}b)`} />
        <path d="M5.4 1.7 L7 3 L8.6 1.9 L10.2 3.1 L11.8 2 L13.4 3.2 L15 2.1 L16.6 3.2 L18.2 2.2 L19.8 3.2 L21 2.3 L5.4 1.7 Z" fill="#aeb8c0" />
        <path d="M1.5 -0.3 L20 -2.1" stroke="#fff" strokeOpacity=".7" strokeWidth=".4" />
        <rect x="21" y="-3.7" width="2.2" height="7.4" rx=".8" fill="#9a8a6a" />
        <rect x="23" y="-3.5" width="17" height="7" rx="2.8" fill={`url(#${id}h)`} />
        <circle cx="27" cy="0" r=".7" fill="#caa86a" />
        <circle cx="35" cy="0" r=".7" fill="#caa86a" />
      </g>
    </g>
  );
}

/** A matchstick with the flame at its tip, pointing up and to the left, for lighting the candle. */
export function Match({ burning }: { burning: boolean }) {
  return (
    <svg viewBox="0 0 20 74" className="block h-full w-full overflow-visible" aria-hidden="true">
      <rect x="8.2" y="14" width="3.6" height="58" rx="1.2" fill="#d8b274" />
      <rect x="8.2" y="14" width="1.2" height="58" rx=".6" fill="#f0d29a" />
      <ellipse cx="10" cy="14" rx="3.8" ry="4.6" fill="#b3261e" />
      <ellipse cx="9" cy="12.6" rx="1.3" ry="1.8" fill="#e0574b" opacity=".8" />
      {burning ? (
        <g className="jl-match">
          <path d="M10 -9 C 14.4 -3 15.4 3 13.6 8 C 12.8 10.2 11.4 11.4 10 11.4 C 8.6 11.4 7.2 10.2 6.4 8 C 4.6 3 7 -3 10 -9 Z" fill="#ff9a2a" />
          <path d="M10 -1 C 12 2.6 12.4 6 11.4 8.4 C 10.9 9.6 10.4 10.2 10 10.2 C 9.6 10.2 9.1 9.6 8.6 8.4 C 7.6 6 8 2.6 10 -1 Z" fill="#fff2b0" />
        </g>
      ) : null}
    </svg>
  );
}

/** A piece of candy corn, white tip to yellow base, lying where it fell. */
export function CandyCorn() {
  return (
    <svg viewBox="0 0 20 24" className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <clipPath id="jl-corn">
          <path d="M10 1 C 12.4 1 18 19.4 18 21.4 C 18 23.2 2 23.2 2 21.4 C 2 19.4 7.6 1 10 1 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#jl-corn)">
        <rect x="0" y="0" width="20" height="9" fill="#fff8e6" />
        <rect x="0" y="9" width="20" height="7" fill="#ff9a22" />
        <rect x="0" y="16" width="20" height="9" fill="#ffd23a" />
        <rect x="2" y="0" width="3.4" height="24" fill="#fff" opacity=".22" />
      </g>
      <path d="M10 1 C 12.4 1 18 19.4 18 21.4 C 18 23.2 2 23.2 2 21.4 C 2 19.4 7.6 1 10 1 Z" fill="none" stroke="#000" strokeOpacity=".25" strokeWidth=".5" />
    </svg>
  );
}

/** A box of matches, seen from above, for the table. */
export function Matchbox() {
  return (
    <svg viewBox="0 0 44 26" className="block h-full w-full overflow-visible" aria-hidden="true">
      <rect x="1" y="3" width="42" height="21" rx="2" fill="#000" opacity=".4" transform="translate(1.4 1.8)" />
      <rect x="0" y="2" width="42" height="21" rx="2" fill="#b3261e" />
      <rect x="0" y="2" width="42" height="21" rx="2" fill="none" stroke="#000" strokeOpacity=".3" strokeWidth=".6" />
      <rect x="3" y="5" width="36" height="15" rx="1.2" fill="#f1e3bc" />
      <path d="M21 8 C 24 11.4 24.4 14.6 21 17.6 C 17.6 14.6 18 11.4 21 8 Z" fill="#e0701a" />
      <path d="M21 11.4 C 22.6 13.4 22.4 15 21 16.4 C 19.6 15 19.4 13.4 21 11.4 Z" fill="#ffd55a" />
      <rect x="0" y="20.4" width="42" height="2.6" rx="1.2" fill="#2b1a10" opacity=".85" />
    </svg>
  );
}
