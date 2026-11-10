import { useId } from "react";

/**
 * What is drawn in ink on the Nice List's parchment. Everything else on the desk (the scroll, the
 * stamp, the seal) is a rendered picture: see ./art-map and scripts/art/holiday/nice_list.py.
 */

/** The room for the word inside the stamp's frame, in the units of its 200 by 76 box. */
const WORD_ROOM = 156;

/**
 * The ink a rubber stamp leaves: a word in a double frame, speckled where the rubber didn't take.
 * The word is set as large as its length allows and then held to the frame's width, so a long one
 * ("SIN CARBÓN") is narrower rather than spilling over the frame.
 */
export function InkStamp({ word, color }: { word: string; color: string }) {
  const id = useId().replace(/:/g, "");
  const size = Math.max(22, Math.min(42, WORD_ROOM / (0.62 * word.length)));
  const natural = 0.7 * size * word.length;
  return (
    <svg viewBox="0 0 200 76" aria-label={word} role="img" className="h-full w-full overflow-visible">
      <defs>
        <filter id={`g${id}`} x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.7 1.85" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" result="speckled" />
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="w" />
          <feDisplacementMap in="speckled" in2="w" scale="2.4" />
        </filter>
      </defs>
      <g filter={`url(#g${id})`}>
        <rect x="4" y="4" width="192" height="68" rx="7" fill="none" stroke={color} strokeWidth="5" />
        <rect x="11" y="11" width="178" height="54" rx="4" fill="none" stroke={color} strokeWidth="2" />
        <text x="100" y="39.5" dominantBaseline="central" textAnchor="middle" fill={color} fontFamily="var(--font-poster), Georgia, serif" fontWeight="700" fontSize={size} textLength={Math.min(WORD_ROOM, natural)} lengthAdjust="spacingAndGlyphs">
          {word}
        </text>
      </g>
    </svg>
  );
}

/** A box for a tick, and the tick drawn into it in ink. */
export function Tick({ color, drawn }: { color: string; drawn: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-full w-full overflow-visible">
      <rect x="2.5" y="2.5" width="15" height="15" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1" opacity=".45" />
      <path
        d="M4.6 10.8 C 6 12, 7.2 13.6, 8.2 15 C 10.6 9.6, 13.6 5.4, 17.6 2.2"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={drawn ? 0 : 1}
        style={{ transition: "stroke-dashoffset .34s cubic-bezier(.5,0,.3,1)" }}
      />
    </svg>
  );
}
