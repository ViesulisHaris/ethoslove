"use client";

import { useId, type ReactNode, type Ref } from "react";
import { BOARD, GOODBYE, HOME, LETTERS, NO, YES } from "./board";
import type { Look } from "./looks";

const FACE = "var(--font-poster), Georgia, serif";

/** A four-pointed star, for the corners of the board. */
const STAR = "M0 -2.3 L0.62 -0.62 L2.3 0 L0.62 0.62 L0 2.3 L-0.62 0.62 L-2.3 0 L-0.62 -0.62 Z";

/**
 * The spirit board, in its own coordinates (see ./board): two arches of letters, the numbers under
 * them, YES and NO in the top corners, GOOD BYE at the foot. A letter the spirit has touched keeps a
 * glow; the one under the planchette burns brightest. Children are drawn on top, in the same
 * coordinates, which is where the planchette lives.
 */
export function Board({ look, lit, now, children }: { look: Look; lit: ReadonlySet<string>; now: string | null; children?: ReactNode }) {
  const id = useId().replace(/:/g, "");
  const letters = Object.entries(LETTERS);
  const bye = now === "GOODBYE";
  return (
    <svg viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} className="block h-full w-full overflow-visible" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.board[0]} />
          <stop offset="1" stopColor={look.board[1]} />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={look.glow} stopOpacity="0.85" />
          <stop offset="0.45" stopColor={look.glow} stopOpacity="0.28" />
          <stop offset="1" stopColor={look.glow} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}w`} width="100" height="74" patternUnits="userSpaceOnUse">
          <path d="M0 9 C 26 5, 60 13, 100 8" fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth=".5" />
          <path d="M0 22 C 30 26, 62 18, 100 23" fill="none" stroke="#000" strokeOpacity=".16" strokeWidth=".6" />
          <path d="M0 37 C 24 33, 66 41, 100 36" fill="none" stroke="#fff" strokeOpacity=".04" strokeWidth=".5" />
          <path d="M0 52 C 34 56, 58 48, 100 53" fill="none" stroke="#000" strokeOpacity=".15" strokeWidth=".6" />
          <path d="M0 65 C 28 62, 64 68, 100 64" fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth=".5" />
        </pattern>
        <mask id={`${id}m`}>
          <rect x="40" y="2" width="20" height="16" fill="#fff" />
          <circle cx="51.9" cy="8.5" r="3.7" fill="#000" />
        </mask>
        <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* the board: a bevelled slab with a printed border, double ruled */}
      <rect x="0.8" y="2.2" width="98.4" height="72" rx="7" fill="#000" opacity=".55" filter={`url(#${id}s)`} />
      <rect x="0.8" y="0.8" width="98.4" height="72.4" rx="7" fill={`url(#${id}b)`} />
      <rect x="0.8" y="0.8" width="98.4" height="72.4" rx="7" fill={`url(#${id}w)`} />
      <rect x="0.8" y="0.8" width="98.4" height="72.4" rx="7" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth=".6" />
      <rect x="3.4" y="3.4" width="93.2" height="67.2" rx="4.6" fill="none" stroke={look.ink} strokeOpacity=".62" strokeWidth=".5" />
      <rect x="4.9" y="4.9" width="90.2" height="64.2" rx="3.4" fill="none" stroke={look.ink} strokeOpacity=".32" strokeWidth=".25" />

      {/* a crescent between two stars, at the top */}
      <circle cx="50" cy="8.5" r="4.4" fill={look.ink} mask={`url(#${id}m)`} opacity=".9" />
      {[[37, 9, 1], [63, 9, 1], [28, 5.6, 0.62], [72, 5.6, 0.62], [15, 20, 0.5], [85, 20, 0.5]].map(([x, y, s], i) => (
        <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${s})`} fill={look.ink} opacity=".78" />
      ))}

      {/* yes, no, and the way out */}
      <text x={YES.x} y={YES.y} textAnchor="middle" dominantBaseline="central" fill={look.ink} fontFamily={FACE} fontSize="5.4" letterSpacing=".5" opacity=".92">YES</text>
      <text x={NO.x} y={NO.y} textAnchor="middle" dominantBaseline="central" fill={look.ink} fontFamily={FACE} fontSize="5.4" letterSpacing=".5" opacity=".92">NO</text>
      {bye ? <ellipse cx={GOODBYE.x} cy={GOODBYE.y} rx="17" ry="6" fill={`url(#${id}g)`} /> : null}
      <text x={GOODBYE.x} y={GOODBYE.y} textAnchor="middle" dominantBaseline="central" fill={bye ? look.lit : look.ink} fontFamily={FACE} fontSize="4.5" letterSpacing="1.1" opacity={bye ? 1 : 0.9} style={{ transition: "fill .35s ease" }}>GOOD BYE</text>
      <path d="M32 65.2 H68" stroke={look.ink} strokeOpacity=".4" strokeWidth=".25" />

      {/* the light a touched letter gives off, under the letters so they stay sharp */}
      {letters.map(([ch, p]) =>
        lit.has(ch) || ch === now ? <circle key={`g${ch}`} cx={p.x} cy={p.y} r={ch === now ? 8.5 : 5.6} fill={`url(#${id}g)`} opacity={ch === now ? 1 : 0.9} /> : null,
      )}

      {letters.map(([ch, p]) => {
        const touched = lit.has(ch) || ch === now;
        return (
          <text
            key={ch}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily={FACE}
            fontSize={/\d/.test(ch) ? 4.4 : 5.5}
            fill={touched ? look.lit : look.ink}
            opacity={touched ? 1 : 0.9}
            style={{ transition: "fill .35s ease, opacity .35s ease" }}
          >
            {ch}
          </text>
        );
      })}

      {children}
    </svg>
  );
}

/** The planchette's outline, with the window at the origin: a heart that points at what it means. */
const HEART = "M0 16 C -3 11.5 -11.5 4.5 -11.5 -3.5 C -11.5 -8 -8 -10.5 -4.2 -8.8 C -2.4 -8 -0.8 -6.8 0 -5.2 C 0.8 -6.8 2.4 -8 4.2 -8.8 C 8 -10.5 11.5 -8 11.5 -3.5 C 11.5 4.5 3 11.5 0 16 Z";
/** The window is a real hole: the letter it is over shows through it. */
const LENS = 4;
const ring = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const BODY = `${HEART} ${ring(0, 0, LENS)}`;
/** The shadow is the body moved down and right, with its hole moved back so the window stays clear. */
const SHADOW = `${HEART} ${ring(-1.7, -3.4, LENS)}`;

/**
 * The planchette: wood, a brass-ringed window and the shadow it throws. Its origin is the window, so
 * moving it to a letter is moving that point to the letter. `gRef` is the group the tour moves.
 */
export function Planchette({ look, gRef, calling }: { look: Look; gRef: Ref<SVGGElement>; calling: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <g ref={gRef} transform={`translate(${HOME.x} ${HOME.y})`}>
      <defs>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={look.wood[0]} />
          <stop offset="1" stopColor={look.wood[1]} />
        </linearGradient>
        <radialGradient id={`${id}l`} cx="34%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".32" />
          <stop offset="1" stopColor="#fff" stopOpacity=".02" />
        </radialGradient>
        <filter id={`${id}sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>
      {/* where a spirit's hand would be: the touch it asks for */}
      {calling ? <circle r="7" fill="none" stroke={look.glow} strokeWidth=".6" className="sn-call" /> : null}
      <g transform="scale(.88)">
        <path d={SHADOW} fillRule="evenodd" transform="translate(1.7 3.4)" fill="#000" opacity=".5" filter={`url(#${id}sh)`} />
        <path d={BODY} fillRule="evenodd" fill={`url(#${id}p)`} stroke="#000" strokeOpacity=".45" strokeWidth=".5" />
        <path d={HEART} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth=".4" transform="scale(.93)" />
        <path d="M-7.5 -4.5 C -7 -7 -4.6 -7.6 -3 -6.6" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".6" strokeLinecap="round" />
        {/* the glass: a little light on it, the inside of the rim in shade, a brass ring round it */}
        <circle r={LENS} fill={`url(#${id}l)`} />
        <circle r={LENS - 0.35} fill="none" stroke="#000" strokeOpacity=".45" strokeWidth=".7" />
        <circle r={LENS + 0.15} fill="none" stroke="#d9c27f" strokeWidth=".8" />
        <circle r={LENS + 0.65} fill="none" stroke="#000" strokeOpacity=".3" strokeWidth=".3" />
      </g>
    </g>
  );
}

/** A candle with its flame. `out` is the flame put out: it shrinks to nothing from the wick. */
export function Candle({ look, out, className }: { look: Look; out: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 20 58" className={className} aria-hidden="true" overflow="visible">
      <defs>
        <linearGradient id={`${id}w`} x1="0" x2="1">
          <stop offset="0" stopColor="#cdb98f" />
          <stop offset=".42" stopColor="#f7ecd0" />
          <stop offset="1" stopColor="#a8946c" />
        </linearGradient>
        <radialGradient id={`${id}f`} cx="50%" cy="72%" r="62%">
          <stop offset="0" stopColor={look.flame[1]} />
          <stop offset=".55" stopColor={look.flame[0]} />
          <stop offset="1" stopColor={look.flame[0]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="10" cy="56.4" rx="9" ry="1.8" fill="#000" opacity=".5" />
      <rect x="3" y="24" width="14" height="32" rx="1.8" fill={`url(#${id}w)`} />
      <ellipse cx="10" cy="24" rx="7" ry="2.3" fill="#fff6dc" />
      <path d="M3.4 24.6 c0 3.2 .2 5.4 1 6.8 c.8 1.2 2 .2 2-1.1 c0-2.2-.3-3.9-.7-5.7 Z" fill="#fbf1d6" />
      <path d="M12.6 25 c0 2 .2 3.2.8 4.1 c.6.8 1.6.2 1.6-.8 c0-1.4-.2-2.4-.6-3.5 Z" fill="#fbf1d6" />
      <path d="M10 24 L10.1 20.2" stroke="#241610" strokeWidth=".9" strokeLinecap="round" />
      <g className={out ? "sn-out" : "sn-flame"} style={{ transformOrigin: "10px 21px" }}>
        <path d="M10 2.5 C 12.8 7 15 11 14.2 15.4 C 13.7 18.6 12 20.6 10 20.6 C 8 20.6 6.3 18.6 5.8 15.4 C 5 11 7.6 7.2 10 2.5 Z" fill={`url(#${id}f)`} />
        <path d="M10 9.2 C 11.7 12 12.4 14.4 11.9 16.6 C 11.5 18.3 10.8 19 10 19 C 9.2 19 8.5 18.3 8.1 16.6 C 7.6 14.4 8.3 12 10 9.2 Z" fill={look.flame[1]} opacity=".95" />
      </g>
    </svg>
  );
}
