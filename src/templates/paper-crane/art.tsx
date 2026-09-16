"use client";

/**
 * The room and the paper. A table under a low lamp, a sheet that glows against it, and the
 * grain that both the sheet and the letter are printed with. All drawn, no images.
 */

import { useId } from "react";
import type { PaperId } from "./schema";

export type Paper = {
  /** The side of the sheet facing up. */
  face: string;
  /** A layer folded over: the same paper, one shadow deeper. */
  shade: string;
  /** Two layers, or the far wing behind the body. */
  deep: string;
  /** The cut edge, and the creases. */
  edge: string;
  /** Words written on this paper. */
  ink: string;
};

export const PAPERS: Record<PaperId, Paper> = {
  ivory: { face: "#F4EDDF", shade: "#E6DCC7", deep: "#D3C7AC", edge: "#B6A88A", ink: "#3A322A" },
  blush: { face: "#F1DBD5", shade: "#E3C7C0", deep: "#CFAAA2", edge: "#B98E86", ink: "#41302D" },
  sage: { face: "#DFE5D8", shade: "#CBD4C2", deep: "#B0BCA6", edge: "#93A189", ink: "#2F3A2C" },
  slate: { face: "#DBE1E7", shade: "#C6CFD8", deep: "#AAB6C1", edge: "#8C9AA7", ink: "#2C343C" },
};

/** The table the sheet sits on: a low lamp, a long evening. */
export const ROOM = {
  ground:
    "radial-gradient(120% 82% at 50% 34%, #4C443C 0%, #362F29 46%, #221D19 78%, #16120F 100%)",
  ink: "#EFE6D8",
  soft: "rgba(239,230,216,0.58)",
  faint: "rgba(239,230,216,0.34)",
};

/** Paper grain, laid over the sheet and the letter so neither reads as flat colour. */
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.36 0 0 0 0 0.28 0 0 0 0.1 0'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>\")";

/** The wood the sheet lies on: a long grain and the edge of the lamplight. */
export function Table() {
  // The editor draws the gift twice on one page, so this room's own gradient needs its own id.
  const id = `pc-light-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE7BF" stopOpacity="0.1" />
          <stop offset="0.55" stopColor="#FFE7BF" stopOpacity="0.03" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {[18, 31, 44, 57, 70, 83, 94].map((y, i) => (
        <path
          key={y}
          d={`M-2 ${y} C25 ${y - 1.4 - (i % 3) * 0.5} 60 ${y + 1.6} 102 ${y - 0.6}`}
          fill="none"
          stroke="rgba(255,236,206,0.05)"
          strokeWidth={i % 2 ? 0.35 : 0.6}
        />
      ))}
    </svg>
  );
}
