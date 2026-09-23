"use client";

import { useId, type CSSProperties } from "react";
import { POSTER_FONT } from "../_shared/cover-kit";
import type { TripKind } from "./schema";

/**
 * The trip's world, drawn from scratch: an old leather suitcase with canvas lining, webbing
 * straps, brass fittings and hotel stickers of no hotel in particular; manila luggage tags; and the
 * small things that travel along the tickets. Flat shapes with soft gradients, one warm palette.
 */

export const P = {
  night: "#141C2A",
  nightDeep: "#0A0F18",
  paper: "#F7F0E1",
  ink: "#1F2735",
  manila: "#E8CD95",
  leather: "#8A4526",
  leatherLight: "#B7703F",
  leatherDark: "#55270F",
  stitch: "#F0D6AE",
  brass: "#C9994A",
  brassLight: "#F0CF83",
  brassDark: "#86621F",
  canvas: "#E8DBC0",
  canvasStripe: "#D8C59F",
  webbing: "#465870",
  webbingLight: "#7F92AA",
  red: "#B6412E",
  teal: "#2E6E6B",
  mustard: "#DFA43A",
  asphalt: "#3A3E46",
  hill: "#A9B98A",
  hillDeep: "#879A6A",
} as const;

/** The same id in two SVGs on one page (the editor keeps two previews) would share gradients; this keeps them apart. */
function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9]/g, "");
}

function Lining({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}shell`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={P.leatherLight} />
        <stop offset=".55" stopColor={P.leather} />
        <stop offset="1" stopColor={P.leatherDark} />
      </linearGradient>
      <pattern id={`${id}canvas`} width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill={P.canvas} />
        <rect width="2.6" height="7" fill={P.canvasStripe} opacity=".75" />
      </pattern>
      <radialGradient id={`${id}deep`} cx=".5" cy=".45" r=".75">
        <stop offset=".55" stopColor="#3a1a08" stopOpacity="0" />
        <stop offset="1" stopColor="#3a1a08" stopOpacity=".42" />
      </radialGradient>
    </defs>
  );
}

const RIVETS: [number, number][] = [
  [8.5, 8.5],
  [81.5, 8.5],
  [8.5, 107.5],
  [81.5, 107.5],
];

/** The inside of the lid: striped canvas, a mesh pocket with its own zip, and their initials sewn in. */
export function LidInside({ monogram }: { monogram: string }) {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 90 116" className="block h-full w-full" aria-hidden="true">
      <Lining id={id} />
      <defs>
        <pattern id={`${id}mesh`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0H3.4M0 0V3.4" stroke={P.webbing} strokeWidth=".5" opacity=".8" />
        </pattern>
      </defs>
      <rect width="90" height="116" rx="9" fill={`url(#${id}shell)`} />
      <rect x="4" y="4" width="82" height="108" rx="6" fill={`url(#${id}canvas)`} />
      <rect x="4" y="4" width="82" height="108" rx="6" fill={`url(#${id}deep)`} />
      <rect x="6.6" y="6.6" width="76.8" height="102.8" rx="4.4" fill="none" stroke={P.brass} strokeWidth=".9" strokeDasharray="1.1 .9" opacity=".7" />
      <g transform="translate(45 28) rotate(-2)">
        <rect x="-16" y="-8.5" width="32" height="17" rx="1.2" fill={P.paper} />
        <rect x="-14.3" y="-6.8" width="28.6" height="13.6" rx=".8" fill="none" stroke={P.red} strokeWidth=".5" strokeDasharray="1 .8" />
        <text x="0" y="2.4" textAnchor="middle" fontSize="7" fill={P.red} style={{ fontFamily: POSTER_FONT }}>
          {monogram}
        </text>
      </g>
      <rect x="11" y="55" width="68" height="48" rx="4" fill={`url(#${id}mesh)`} stroke={P.webbing} strokeWidth="1.2" />
      <rect x="11" y="55" width="68" height="3.6" rx="1.2" fill={P.webbing} />
      <path d="M14 56.8H76" stroke={P.brassLight} strokeWidth=".9" strokeDasharray=".7 .6" />
      <rect x="55.6" y="55.6" width="3" height="6" rx="1.2" fill={P.brass} stroke={P.brassDark} strokeWidth=".4" />
      {RIVETS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={P.brass} stroke={P.brassDark} strokeWidth=".45" />
      ))}
    </svg>
  );
}

/** The half the things go into: canvas, two webbing straps with their buckles, and the handle on the outside edge. */
export function CaseBase() {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 90 126" className="block h-full w-full overflow-visible" aria-hidden="true">
      <Lining id={id} />
      <path d="M33 114C31.5 127.5 58.5 127.5 57 114" fill="none" stroke={P.leatherDark} strokeWidth="5.4" strokeLinecap="round" />
      <path d="M34.2 115C33.4 125 56.6 125 55.8 115" fill="none" stroke={P.leatherLight} strokeWidth="1.3" strokeLinecap="round" opacity=".55" />
      <rect width="90" height="116" rx="9" fill={`url(#${id}shell)`} />
      <rect x="4" y="4" width="82" height="108" rx="6" fill={`url(#${id}canvas)`} />
      <rect x="4" y="4" width="82" height="108" rx="6" fill={`url(#${id}deep)`} />
      <rect x="6.6" y="6.6" width="76.8" height="102.8" rx="4.4" fill="none" stroke={P.brass} strokeWidth=".9" strokeDasharray="1.1 .9" opacity=".7" />
      {[30, 78].map((y) => (
        <g key={y}>
          <rect x="4" y={y} width="82" height="8" fill={P.webbing} />
          <path d={`M4 ${y + 1.3}H86M4 ${y + 6.7}H86`} stroke={P.webbingLight} strokeWidth=".45" strokeDasharray="1.1 .8" />
          <rect x="37.5" y={y - 1.8} width="15" height="11.6" rx="2.4" fill="#262D38" />
          <rect x="40.2" y={y + 1} width="9.6" height="6" rx="1.2" fill={P.webbing} />
        </g>
      ))}
      {RIVETS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={P.brass} stroke={P.brassDark} strokeWidth=".45" />
      ))}
      <rect x="29.4" y="111.4" width="7.4" height="5.4" rx="1.3" fill={P.brass} stroke={P.brassDark} strokeWidth=".45" />
      <rect x="53.2" y="111.4" width="7.4" height="5.4" rx="1.3" fill={P.brass} stroke={P.brassDark} strokeWidth=".45" />
    </svg>
  );
}

/** The outside of the lid, seen once it's shut: stitched leather, two straps, brass corners and three old stickers. */
export function LidOutside() {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 90 116" className="block h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}hide`} cx=".32" cy=".26" r=".95">
          <stop offset="0" stopColor={P.leatherLight} />
          <stop offset=".5" stopColor={P.leather} />
          <stop offset="1" stopColor={P.leatherDark} />
        </radialGradient>
      </defs>
      <rect width="90" height="116" rx="9" fill={`url(#${id}hide)`} />
      <rect x="4.4" y="4.4" width="81.2" height="107.2" rx="6" fill="none" stroke={P.stitch} strokeWidth=".8" strokeDasharray="2 1.5" opacity=".85" />
      {[12.5, 69.5].map((x) => (
        <g key={x}>
          <rect x={x} y="0" width="8" height="116" fill={P.leatherDark} />
          <path d={`M${x + 1.2} 0V116M${x + 6.8} 0V116`} stroke={P.stitch} strokeWidth=".45" strokeDasharray="1.4 1.1" opacity=".7" />
          <rect x={x - 1.8} y="85" width="11.6" height="9.4" rx="1.6" fill="none" stroke={P.brass} strokeWidth="1.7" />
          <path d={`M${x + 4} 85.9V93.5`} stroke={P.brassLight} strokeWidth="1" strokeLinecap="round" />
        </g>
      ))}
      {[
        "M0 20V9Q0 0 9 0H20Q9 3 3.5 8.5Q0 13 0 20Z",
        "M90 20V9Q90 0 81 0H70Q81 3 86.5 8.5Q90 13 90 20Z",
        "M0 96V107Q0 116 9 116H20Q9 113 3.5 107.5Q0 103 0 96Z",
        "M90 96V107Q90 116 81 116H70Q81 113 86.5 107.5Q90 103 90 96Z",
      ].map((d) => (
        <path key={d} d={d} fill={P.brass} stroke={P.brassDark} strokeWidth=".5" />
      ))}
      <g transform="translate(45 30) rotate(-9)">
        <circle r="13" fill={P.paper} />
        <circle r="11.8" fill={P.red} />
        <circle r="9.6" fill="none" stroke={P.paper} strokeWidth=".55" />
        <path d="M-3.2-6.4h6.4M0-8.4v4.4M-1.6-4.6h3.2" stroke={P.paper} strokeWidth=".9" strokeLinecap="round" />
        <text y="1.4" textAnchor="middle" fontSize="4.6" fill={P.paper} letterSpacing=".35" style={{ fontFamily: POSTER_FONT }}>
          BON
        </text>
        <text y="6" textAnchor="middle" fontSize="3" fill={P.paper} letterSpacing=".3" style={{ fontFamily: POSTER_FONT }}>
          VOYAGE
        </text>
      </g>
      <g transform="translate(47 66) rotate(7)">
        <ellipse rx="16" ry="10.4" fill={P.paper} />
        <ellipse rx="14.8" ry="9.3" fill={P.teal} />
        <ellipse rx="12.6" ry="7.3" fill="none" stroke={P.mustard} strokeWidth=".65" />
        <text y="-3.4" textAnchor="middle" fontSize="2.2" fill={P.mustard} letterSpacing=".6">
          ★ ★ ★
        </text>
        <text y="1" textAnchor="middle" fontSize="3.6" fill={P.paper} letterSpacing=".4" style={{ fontFamily: POSTER_FONT }}>
          GRAND
        </text>
        <text y="4.9" textAnchor="middle" fontSize="3.6" fill={P.paper} letterSpacing=".4" style={{ fontFamily: POSTER_FONT }}>
          HOTEL
        </text>
      </g>
      <g transform="translate(40 98) rotate(-6)">
        <rect x="-12" y="-8" width="24" height="16" rx="2.2" fill={P.paper} />
        <rect x="-10.9" y="-6.9" width="21.8" height="13.8" rx="1.5" fill={P.mustard} />
        <circle cx="4" cy="-.6" r="3.6" fill={P.red} opacity=".9" />
        <path d="M-10.9 3.4Q0 .8 10.9 3.4V5.4Q10.9 6.9 9.4 6.9H-9.4Q-10.9 6.9-10.9 5.4Z" fill={P.teal} />
        <path d="M-4.6 5.2Q-5.2 0-3.4-4" fill="none" stroke={P.ink} strokeWidth=".9" strokeLinecap="round" />
        <path d="M-3.4-4Q-6.6-5.6-8.6-3.4M-3.4-4Q-1-6.2 1.6-4.6M-3.4-4Q-5.2-7.4-7.6-7M-3.4-4Q-2-7.6.6-7.8" fill="none" stroke={P.ink} strokeWidth=".8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** A loop of string through the tag's eyelet. */
export function TagString({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 16 20" className={className} style={style} aria-hidden="true">
      <path d="M13 10C9 3 2 2 1.5 7.5C1 13 8 16 13 10" fill="none" stroke="#F4E9D2" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13 10C9 3 2 2 1.5 7.5C1 13 8 16 13 10" fill="none" stroke="#B7A27C" strokeWidth=".5" strokeDasharray="1 1" strokeLinecap="round" />
    </svg>
  );
}

export function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The things that travel, as small flat glyphs facing right (+x), centred on the origin, in SVG units. */
export function Traveller({ kind, color }: { kind: TripKind; color: string }) {
  if (kind === "flight")
    return (
      <g>
        <path d="M5 0C5-.9 4.2-1.3 3.2-1.3H1.4L-1.6-5.4H-3L-1.4-1.3H-3.6L-4.8-2.8H-5.8L-5 0L-5.8 2.8H-4.8L-3.6 1.3H-1.4L-3 5.4H-1.6L1.4 1.3H3.2C4.2 1.3 5 .9 5 0Z" fill={color} stroke="#F7F0E1" strokeWidth=".7" strokeLinejoin="round" paintOrder="stroke" />
      </g>
    );
  if (kind === "train")
    return (
      <g>
        <rect x="-6.5" y="-3.6" width="12" height="5.6" rx="1.2" fill={color} stroke="#F7F0E1" strokeWidth=".6" paintOrder="stroke" />
        <path d="M5.5-3.6C7.6-3.6 8.2-1.6 8.2 2H5.5Z" fill={color} stroke="#F7F0E1" strokeWidth=".6" paintOrder="stroke" />
        {[-5, -2.4, 0.2, 2.8].map((x) => (
          <rect key={x} x={x} y="-2.5" width="1.8" height="1.6" rx=".3" fill="#F7F0E1" opacity=".9" />
        ))}
        <circle cx="-4" cy="2.4" r=".9" fill={P.ink} />
        <circle cx="3.4" cy="2.4" r=".9" fill={P.ink} />
      </g>
    );
  return (
    <g>
      <rect x="-4.2" y="-2.4" width="8.4" height="4.8" rx="1.8" fill={color} stroke="#F7F0E1" strokeWidth=".6" paintOrder="stroke" />
      <rect x="-1.6" y="-1.8" width="3.2" height="3.6" rx=".8" fill="#F7F0E1" opacity=".55" />
      <rect x="1.9" y="-1.7" width="1.1" height="3.4" rx=".4" fill={P.ink} opacity=".55" />
      <circle cx="3.9" cy="-1.5" r=".5" fill="#FFF3C4" />
      <circle cx="3.9" cy="1.5" r=".5" fill="#FFF3C4" />
    </g>
  );
}

/** The small pictogram a board or a ticket header puts before its title. */
export function KindIcon({ kind, className }: { kind: TripKind; className?: string }) {
  return (
    <svg viewBox="-8 -8 16 16" className={className} aria-hidden="true">
      {kind === "flight" ? (
        <path d="M6 0C6-1 5.1-1.5 4-1.5H1.8L-2-6.6H-3.8L-1.8-1.5H-4.4L-5.8-3.4H-7L-6 0L-7 3.4H-5.8L-4.4 1.5H-1.8L-3.8 6.6H-2L1.8 1.5H4C5.1 1.5 6 1 6 0Z" fill="currentColor" />
      ) : kind === "train" ? (
        <g fill="currentColor">
          <rect x="-4.6" y="-6.6" width="9.2" height="10.4" rx="2.4" />
          <rect x="-3.2" y="-5" width="6.4" height="3.6" rx=".8" fill="rgba(0,0,0,.45)" />
          <circle cx="-2.2" cy="1.2" r=".9" fill="rgba(0,0,0,.45)" />
          <circle cx="2.2" cy="1.2" r=".9" fill="rgba(0,0,0,.45)" />
          <path d="M-3.6 4.4L-5.4 7M3.6 4.4L5.4 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="currentColor">
          <path d="M-6.4 1.6V-.4L-4.8-4C-4.5-4.7-3.9-5-3.2-5H3.2C3.9-5 4.5-4.7 4.8-4L6.4-.4V1.6Z" />
          <rect x="-6.8" y="-.6" width="13.6" height="4.4" rx="1.2" />
          <rect x="-4" y="-3.9" width="8" height="2.8" rx=".6" fill="rgba(0,0,0,.45)" />
          <circle cx="-4" cy="4.2" r="1.7" />
          <circle cx="4" cy="4.2" r="1.7" />
        </g>
      )}
    </svg>
  );
}

/** A 1D barcode from bar widths, stretched to its box. */
export function Barcode({ bars, className }: { bars: number[]; className?: string }) {
  const starts = bars.map((_, i) => bars.slice(0, i).reduce((sum, w) => sum + w, 0));
  const width = bars.reduce((sum, w) => sum + w, 0);
  return (
    <svg viewBox={`0 0 ${Math.max(1, width)} 10`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {bars.map((w, i) => (i % 2 === 0 ? <rect key={i} x={starts[i]} y="0" width={w} height="10" fill="currentColor" /> : null))}
    </svg>
  );
}

/** A square ticket code, the kind a train conductor scans. */
export function Matrix({ cells, size, className }: { cells: boolean[]; size: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} shapeRendering="crispEdges" aria-hidden="true">
      {cells.map((on, i) => (on ? <rect key={i} x={i % size} y={Math.floor(i / size)} width="1" height="1" fill="currentColor" /> : null))}
    </svg>
  );
}

export function Scissors({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8.1 8.1L20 18M8.1 15.9L20 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
