"use client";

import { useId } from "react";
import type { Look } from "./looks";
import { WINDOWS, type Silhouette } from "./windows";

/** An arched window shape, `w` wide and `h` tall, centred on (cx, cy). */
export const arch = (cx: number, cy: number, w: number, h: number) => {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const r = w / 2;
  return `M${x0} ${y1} V${y0 + r} A${r} ${r} 0 0 1 ${x1} ${y0 + r} V${y1} Z`;
};

/**
 * The house, in a 100 × 100 box: a hill, a tower on each side, a gabled middle with a porch, a
 * chimney, finials, and the stone frames the lit windows sit in. The windows' glass and what is
 * in it are the template's, laid over these frames; the door's leaf is too, so it can swing.
 */
export function House({ look, doorGlow }: { look: Look; doorGlow: boolean }) {
  const id = useId().replace(/:/g, "");
  const rim = "rgba(190,205,255,.3)";
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.wall[0]} />
          <stop offset="1" stopColor={look.wall[1]} />
        </linearGradient>
        <radialGradient id={`${id}d`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={look.window[0]} stopOpacity=".95" />
          <stop offset=".5" stopColor={look.window[1]} stopOpacity=".5" />
          <stop offset="1" stopColor={look.window[1]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M-14 100 V86 C 6 80, 20 85, 34 86.5 S 64 85, 78 86.5 S 100 82, 114 85 V100 Z" fill="#04030a" />

      {/* the towers and the middle, behind their roofs */}
      <rect x="8" y="28" width="20" height="64" fill={`url(#${id}w)`} />
      <rect x="72" y="46" width="20" height="46" fill={`url(#${id}w)`} />
      <rect x="26" y="52" width="48" height="40" fill={`url(#${id}w)`} />
      <g stroke="#fff" strokeOpacity=".035" strokeWidth=".4">
        {Array.from({ length: 22 }, (_, i) => (
          <path key={i} d={`M${9 + i * 3.8} 52 V92`} />
        ))}
      </g>
      <rect x="40" y="76" width="20" height="16" fill="#0a0814" />

      {/* roofs, finials and the chimney */}
      <path d="M5 28 L18 4 L31 28 Z" fill={look.roof} />
      <path d="M69 46 L82 24 L95 46 Z" fill={look.roof} />
      <path d="M22 52 L50 28 L78 52 Z" fill={look.roof} />
      <path d="M38 76 L50 66 L62 76 Z" fill={look.roof} />
      <rect x="60" y="29" width="6.4" height="15" fill={look.roof} />
      <rect x="59" y="27.4" width="8.4" height="2.4" fill={look.roof} />
      <path d="M18 4 V-1 M82 24 V18.5 M50 28 V20.5 M46 23.4 H54 M54 23.4 l2.4 -1.6 v3.2 Z" stroke={look.roof} strokeWidth=".9" fill={look.roof} strokeLinecap="round" />
      <g fill="none" stroke={rim} strokeWidth=".5" strokeLinecap="round">
        <path d="M18 4 L31 28 M82 24 L95 46 M50 28 L78 52 M50 66 L62 76" />
        <path d="M92 46 V92 M74 52 V76 M28 28 V50" strokeOpacity=".5" />
      </g>

      {/* the stone round each window */}
      {WINDOWS.map((w) => (
        <path key={w.id} d={w.round ? `M${w.cx - w.w / 2 - 1.2} ${w.cy} a${w.w / 2 + 1.2} ${w.w / 2 + 1.2} 0 1 0 ${w.w + 2.4} 0 a${w.w / 2 + 1.2} ${w.w / 2 + 1.2} 0 1 0 ${-w.w - 2.4} 0 Z` : arch(w.cx, w.cy, w.w + 2.4, w.h + 2.4)} fill="#25233c" stroke="#04030a" strokeWidth=".4" />
      ))}

      {/* the way up to the door */}
      <path d="M45 92 L55 92 L68 100 L32 100 Z" fill="#171528" />
      <path d="M44 92 H56 M43 94.5 H57 M41.5 97.2 H58.5" stroke="#05040c" strokeWidth=".5" />
      <path d="M43 92 V83 a7 7 0 0 1 14 0 V92 Z" fill="#05040b" />
      {doorGlow ? <circle cx="50" cy="86" r="17" fill={`url(#${id}d)`} className="hh-door-glow" /> : null}
    </svg>
  );
}

/** One leaf of the iron gate: eight spear-topped bars, two rails and a ring, hinged at its left edge (flip it for the right). */
export function GateLeaf() {
  return (
    <svg viewBox="0 0 50 80" className="block h-full w-full overflow-visible" aria-hidden="true">
      <g fill="#07060e" stroke="#fff" strokeOpacity=".1" strokeWidth=".35">
        <rect x="0" y="22" width="50" height="2.6" rx="1" />
        <rect x="0" y="60" width="50" height="2.6" rx="1" />
        {Array.from({ length: 8 }, (_, i) => {
          const x = 2.4 + i * 6.5;
          return (
            <g key={i}>
              <rect x={x} y="6" width="2" height="74" />
              <path d={`M${x - 1.5} 6.5 L${x + 1} 0 L${x + 3.5} 6.5 Z`} />
            </g>
          );
        })}
      </g>
      <circle cx="25" cy="42" r="6.4" fill="none" stroke="#07060e" strokeWidth="1.6" />
      <circle cx="25" cy="42" r="6.4" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".4" />
    </svg>
  );
}

/** A dead tree, bent by the wind, in a 40 × 100 box. */
export function Tree({ look }: { look: Look }) {
  return (
    <svg viewBox="0 0 40 100" className="block h-full w-full overflow-visible" aria-hidden="true">
      <g fill="none" stroke={look.roof} strokeLinecap="round">
        <path d="M22 100 C 21 80, 24 66, 20 52 C 18 42, 19 34, 16 24" strokeWidth="4.2" />
        <path d="M20.6 58 C 12 52, 8 46, 2 42 M19.4 46 C 27 42, 32 36, 38 30 M18 35 C 12 31, 10 25, 9 17 M17 26 C 22 22, 25 16, 23 8 M21 72 C 28 68, 33 64, 39 62" strokeWidth="2.2" />
        <path d="M8 44.5 C 5 46, 3 49, 3 52 M33 34 C 36 36, 37 39, 37 43 M10.5 24 C 6 22, 4 18, 4 14 M23.5 14 C 27 12, 29 9, 29 5" strokeWidth="1.2" />
      </g>
      <g fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".5" strokeLinecap="round">
        <path d="M23.6 98 C 22.8 80, 26 66, 22 52 C 20 42, 21 34, 18 24" />
      </g>
    </svg>
  );
}

/** Who waits in a window until it is opened, as a dark shape in a 20 × 24 box; the eyes are the window's own light. */
export function Sil({ kind, eye }: { kind: Silhouette; eye: string }) {
  const body = "#05040c";
  switch (kind) {
    case "cat":
      return (
        <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
          <g fill={body}>
            <ellipse cx="10" cy="18.4" rx="5.2" ry="5.8" />
            <circle cx="10" cy="9.6" r="3.7" />
            <path d="M6.5 8 L6.9 3.6 L9.2 6.2 Z M13.5 8 L13.1 3.6 L10.8 6.2 Z" />
          </g>
          <path d="M14.8 22 C 19 22, 19.6 16.4, 16.6 15" fill="none" stroke={body} strokeWidth="1.6" strokeLinecap="round" />
          <g fill={eye}>
            <ellipse cx="8.6" cy="9.8" rx=".8" ry="1.1" />
            <ellipse cx="11.4" cy="9.8" rx=".8" ry="1.1" />
          </g>
        </svg>
      );
    case "ghost":
      return (
        <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
          <path d="M3.4 23 V10.4 C 3.4 3.2, 16.6 3.2, 16.6 10.4 V23 L14 20.4 L11.6 23 L9.2 20.4 L6.6 23 Z" fill={body} />
          <g fill={eye}>
            <ellipse cx="7.8" cy="10.6" rx="1.3" ry="1.9" />
            <ellipse cx="12.2" cy="10.6" rx="1.3" ry="1.9" />
          </g>
          <ellipse cx="10" cy="15.2" rx="1.2" ry="1.6" fill={eye} opacity=".7" />
        </svg>
      );
    case "witch":
      return (
        <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
          <g fill={body}>
            <path d="M10 1 L6.2 10.2 H13.8 Z M13 5 L16.4 3.4 L14 7 Z" />
            <ellipse cx="10" cy="10.4" rx="7.2" ry="1.5" />
            <circle cx="10" cy="14.2" r="3" />
            <path d="M4.4 24 L10 16.4 L15.6 24 Z" />
          </g>
          <circle cx="8.9" cy="14" r=".6" fill={eye} />
          <circle cx="11.1" cy="14" r=".6" fill={eye} />
        </svg>
      );
    case "bat":
      return (
        <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
          <path d="M10 10 C 8 5, 2 5, 0.6 10.6 C 3.8 9.4, 5.6 11.4, 6.6 14 C 7.8 12.6, 9 13.6, 10 16 C 11 13.6, 12.2 12.6, 13.4 14 C 14.4 11.4, 16.2 9.4, 19.4 10.6 C 18 5, 12 5, 10 10 Z" fill={body} />
          <g fill={eye}>
            <circle cx="9" cy="10.6" r=".6" />
            <circle cx="11" cy="10.6" r=".6" />
          </g>
        </svg>
      );
    case "owl":
      return (
        <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
          <g fill={body}>
            <ellipse cx="10" cy="15.6" rx="5.8" ry="7.6" />
            <path d="M4.6 10 L5.2 4.2 L8.6 7.6 Z M15.4 10 L14.8 4.2 L11.4 7.6 Z" />
            <circle cx="10" cy="9.6" r="5" />
          </g>
          <g fill={eye}>
            <circle cx="7.6" cy="9.4" r="2" />
            <circle cx="12.4" cy="9.4" r="2" />
          </g>
          <g fill={body}>
            <circle cx="7.6" cy="9.4" r=".9" />
            <circle cx="12.4" cy="9.4" r=".9" />
          </g>
        </svg>
      );
    case "candle":
      return (
        <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
          <rect x="7.4" y="11" width="5.2" height="12" rx="1" fill={body} />
          <path d="M10 3.4 C 12 6.6, 12.6 8.8, 10 11 C 7.4 8.8, 8 6.6, 10 3.4 Z" fill={eye} />
        </svg>
      );
  }
}
