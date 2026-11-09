import { useId, type CSSProperties } from "react";
import { mix, STAINS, Texture, WOOD, FIBRE } from "../_shared/holiday/materials";

/**
 * The Nice List's things, drawn as one set: a single warm light from the top left, soft shadows,
 * real materials (turned wood, brass, wax, parchment) and no outlines.
 */

const BRASS = "linear-gradient(180deg, #5a3a0c 0%, #c99a3e 18%, #f6dc94 32%, #d4a648 50%, #8a5e18 78%, #4a3008 100%)";

/** A turned wooden roller with a brass finial at each end. */
export function Roller({ wood, className, style }: { wood: string; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={className} style={{ position: "relative", ...style }}>
      <div className="absolute inset-y-[16%] right-[6%] left-[6%] overflow-hidden rounded-full" style={{ background: `linear-gradient(180deg, ${mix(wood, "#000000", 0.45)} 0%, ${mix(wood, "#ffffff", 0.22)} 20%, ${wood} 42%, ${mix(wood, "#000000", 0.22)} 74%, ${mix(wood, "#000000", 0.55)} 100%)`, boxShadow: "0 calc(.8*var(--k)) calc(1.4*var(--k)) rgba(0,0,0,.45)" }}>
        <Texture image={WOOD} blend="multiply" opacity={0.55} size="calc(70*var(--k)) calc(8*var(--k))" />
        <div className="absolute inset-x-[2%] top-[22%] h-[12%] rounded-full" style={{ background: "rgba(255,240,215,.4)", filter: "blur(1px)" }} />
      </div>
      {[0, 1].map((side) => (
        <div key={side} className="absolute inset-y-0 w-[8%]" style={{ [side ? "right" : "left"]: 0 }}>
          <div className="absolute inset-y-[6%] inset-x-[18%] rounded-[45%]" style={{ background: BRASS, boxShadow: "0 calc(.6*var(--k)) calc(1*var(--k)) rgba(0,0,0,.45)" }} />
          <div className="absolute inset-y-[30%] inset-x-0 rounded-full" style={{ background: BRASS }} />
          <div className="absolute top-[38%] left-[30%] h-[10%] w-[18%] rounded-full bg-white/70 blur-[1px]" />
        </div>
      ))}
    </div>
  );
}

/** Parchment still wound tight: a fat roll, lit from above, its spiral showing at each end. */
export function RolledParchment({ paper, className, style }: { paper: string; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={className} style={{ position: "relative", ...style }}>
      <div className="absolute inset-0 overflow-hidden rounded-full" style={{ background: `linear-gradient(180deg, ${mix(paper, "#5a3a1a", 0.35)} 0%, ${mix(paper, "#ffffff", 0.35)} 22%, ${paper} 45%, ${mix(paper, "#5a3a1a", 0.22)} 78%, ${mix(paper, "#3a2410", 0.5)} 100%)`, boxShadow: "0 calc(1.4*var(--k)) calc(2.4*var(--k)) rgba(0,0,0,.45)" }}>
        <Texture image={STAINS} blend="multiply" opacity={0.6} size="calc(60*var(--k))" />
        <Texture image={FIBRE} blend="multiply" opacity={0.5} size="calc(20*var(--k))" />
        {[30, 52, 70].map((y) => (
          <div key={y} className="absolute inset-x-[3%] h-px" style={{ top: `${y}%`, background: "rgba(90,60,30,.18)" }} />
        ))}
      </div>
      {[0, 1].map((side) => (
        <div key={side} className="absolute inset-y-[4%] w-[7%] rounded-[50%]" style={{ [side ? "right" : "left"]: "-1%", background: `repeating-radial-gradient(circle at 50% 50%, ${mix(paper, "#5a3a1a", 0.3)} 0 8%, ${paper} 8% 16%)`, boxShadow: "inset 0 0 calc(1*var(--k)) rgba(60,30,10,.4)" }} />
      ))}
    </div>
  );
}

/** A fountain pen in black lacquer with a gold band, set down on the desk. */
export function FountainPen() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 20" aria-hidden="true" className="h-full w-full overflow-visible" style={{ filter: "drop-shadow(0 calc(.8*var(--k)) calc(.8*var(--k)) rgba(0,0,0,.5))" }}>
      <defs>
        <linearGradient id={`p${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4a52" />
          <stop offset=".25" stopColor="#9a9aa6" />
          <stop offset=".45" stopColor="#1e1e24" />
          <stop offset="1" stopColor="#060608" />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a4a12" />
          <stop offset=".35" stopColor="#f6dc94" />
          <stop offset="1" stopColor="#7a5410" />
        </linearGradient>
      </defs>
      <path d="M2 10 L 16 6.4 L 16 13.6 Z" fill={`url(#g${id})`} />
      <rect x="16" y="5.6" width="10" height="8.8" rx="1.4" fill={`url(#p${id})`} />
      <rect x="26" y="5" width="4" height="10" fill={`url(#g${id})`} />
      <rect x="30" y="4.4" width="84" height="11.2" rx="5.6" fill={`url(#p${id})`} />
      <rect x="64" y="4.4" width="3" height="11.2" fill={`url(#g${id})`} />
      <path d="M40 2.4 h 30 a 2 2 0 0 1 0 4 h -30 z" fill={`url(#g${id})`} />
    </svg>
  );
}

/** A seal of red wax pressed with the sender's initial: thick at the rim, glossy, the letter sunk into it. */
export function WaxSeal({ letter, color = "#9e1b22" }: { letter: string; color?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true" className="h-full w-full overflow-visible" style={{ filter: "drop-shadow(0 calc(.6*var(--k)) calc(.8*var(--k)) rgba(0,0,0,.45))" }}>
      <defs>
        <radialGradient id={`w${id}`} cx=".38" cy=".32" r=".75">
          <stop offset="0" stopColor={mix(color, "#ffffff", 0.35)} />
          <stop offset=".45" stopColor={color} />
          <stop offset="1" stopColor={mix(color, "#000000", 0.55)} />
        </radialGradient>
        <radialGradient id={`i${id}`} cx=".6" cy=".65" r=".7">
          <stop offset="0" stopColor={mix(color, "#ffffff", 0.12)} />
          <stop offset="1" stopColor={mix(color, "#000000", 0.4)} />
        </radialGradient>
      </defs>
      <path d="M30 2 C 38 1, 44 6, 50 8 C 56 12, 58 20, 58 27 C 59 35, 56 42, 52 48 C 47 55, 38 58, 30 58 C 22 59, 14 55, 9 50 C 3 44, 1 36, 2 28 C 2 20, 6 12, 12 8 C 17 4, 23 2, 30 2 Z" fill={`url(#w${id})`} />
      <circle cx="30" cy="30" r="19" fill={`url(#i${id})`} />
      <circle cx="30" cy="30" r="19" fill="none" stroke={mix(color, "#ffffff", 0.25)} strokeWidth=".8" opacity=".6" />
      <text x="30.6" y="31" dominantBaseline="central" textAnchor="middle" fontSize="20" fontStyle="italic" fill={mix(color, "#ffffff", 0.3)} style={{ fontFamily: "var(--font-poster), Georgia, serif" }}>
        {letter}
      </text>
      <text x="30" y="30.2" dominantBaseline="central" textAnchor="middle" fontSize="20" fontStyle="italic" fill={mix(color, "#000000", 0.45)} style={{ fontFamily: "var(--font-poster), Georgia, serif" }}>
        {letter}
      </text>
      <path d="M16 16 C 20 11, 26 9, 32 9" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** A rubber stamp on a turned wooden handle with a brass collar. */
export function StampTool({ rubber }: { rubber: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 60 70" aria-hidden="true" className="h-full w-full overflow-visible" style={{ filter: "drop-shadow(0 calc(1.4*var(--k)) calc(1.6*var(--k)) rgba(0,0,0,.45))" }}>
      <defs>
        <linearGradient id={`h${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3a2412" />
          <stop offset=".3" stopColor="#b77a44" />
          <stop offset=".5" stopColor="#8a5a2e" />
          <stop offset="1" stopColor="#2e1c0e" />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#5a3a0c" />
          <stop offset=".35" stopColor="#f6dc94" />
          <stop offset=".6" stopColor="#c99a3e" />
          <stop offset="1" stopColor="#4a3008" />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(rubber, "#ffffff", 0.2)} />
          <stop offset="1" stopColor={mix(rubber, "#000000", 0.4)} />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="10" rx="10" ry="9" fill={`url(#h${id})`} />
      <path d="M24 16 C 22 24, 25 30, 26 36 H 34 C 35 30, 38 24, 36 16 Z" fill={`url(#h${id})`} />
      <rect x="22" y="35" width="16" height="4" rx="1" fill={`url(#m${id})`} />
      <rect x="6" y="39" width="48" height="13" rx="2" fill={`url(#h${id})`} />
      <rect x="8" y="52" width="44" height="6" rx="1" fill={`url(#r${id})`} />
      <ellipse cx="26" cy="6" rx="4" ry="2.4" fill="#ffffff" opacity=".35" />
    </svg>
  );
}

/** The ink a rubber stamp leaves: a word in a double frame, speckled where the rubber didn't take. */
export function InkStamp({ word, color }: { word: string; color: string }) {
  const id = useId().replace(/:/g, "");
  const long = word.length > 8;
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
        <text x="100" y="40" dominantBaseline="central" textAnchor="middle" fill={color} fontFamily="var(--font-poster), Georgia, serif" fontWeight="700" fontSize={long ? 30 : 40} letterSpacing={long ? 2 : 5}>
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
