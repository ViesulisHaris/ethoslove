import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { POSTER_FONT } from "../_shared/cover-kit";

export type BenchId = "oak" | "rose" | "night";
export type Court = {
  wall: string;
  stripes: string;
  wood: { light: string; mid: string; deep: string };
  brass: { light: string; deep: string };
  ink: string;
  confetti: string[];
  dark: boolean;
};

export const COURTS: Record<BenchId, Court> = {
  oak: {
    wall: "#EADFC6",
    stripes: "repeating-linear-gradient(90deg, rgba(122,96,58,.10) 0 calc(3*var(--p)), transparent calc(3*var(--p)) calc(9*var(--p)))",
    wood: { light: "#CC8F52", mid: "#A4672F", deep: "#6B3D17" },
    brass: { light: "#F6DE96", deep: "#B4852B" },
    ink: "#2B211A",
    confetti: ["#C0392B", "#F2C14E", "#2F6B4F", "#FFFFFF", "#8C5A2B"],
    dark: false,
  },
  rose: {
    wall: "#F9D6E1",
    stripes: "repeating-linear-gradient(90deg, rgba(255,255,255,.6) 0 calc(3*var(--p)), transparent calc(3*var(--p)) calc(9*var(--p)))",
    wood: { light: "#FFFFFF", mid: "#F6E4EA", deep: "#D6AFBD" },
    brass: { light: "#FBE7A8", deep: "#C9A03C" },
    ink: "#4A2030",
    confetti: ["#E8407A", "#FFFFFF", "#F2C14E", "#B48CF2", "#FFB3CC"],
    dark: false,
  },
  night: {
    wall: "#1C2040",
    stripes: "repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 calc(3*var(--p)), transparent calc(3*var(--p)) calc(9*var(--p)))",
    wood: { light: "#7A5441", mid: "#523528", deep: "#2B1A13" },
    brass: { light: "#F6DE96", deep: "#B4852B" },
    ink: "#FFF3DC",
    confetti: ["#FF6B6B", "#F2C14E", "#8FA8FF", "#FFFFFF", "#7FE0C3"],
    dark: true,
  },
};

export function Paw({ className, color = "currentColor", x, y, size }: { className?: string; color?: string; x?: number; y?: number; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" x={x} y={y} width={size} height={size} className={className} aria-hidden="true">
      <g fill={color}>
        <ellipse cx="9" cy="16" rx="4" ry="5.4" transform="rotate(-18 9 16)" />
        <ellipse cx="17" cy="9.5" rx="4" ry="5.6" transform="rotate(-6 17 9.5)" />
        <ellipse cx="25.5" cy="10" rx="4" ry="5.6" transform="rotate(8 25.5 10)" />
        <ellipse cx="32.5" cy="17" rx="3.8" ry="5.2" transform="rotate(22 32.5 17)" />
        <path d="M20.5 19c5.6 0 10.2 5.2 10.2 10 0 3.6-2.6 5.4-5.6 5.4-1.9 0-3-.8-4.6-.8s-2.7.8-4.6.8c-3 0-5.6-1.8-5.6-5.4 0-4.8 4.6-10 10.2-10Z" />
      </g>
    </svg>
  );
}

/** The seal on the wall: a wreath of text round a paw. */
export function Crest({ top, bottom, court, className }: { top: string; bottom: string; court: Court; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <path id="crest-top" d="M 18 60 A 42 42 0 0 1 102 60" />
        <path id="crest-bottom" d="M 12 60 A 48 48 0 0 0 108 60" />
        <radialGradient id="crest-fill" cx="40%" cy="32%">
          <stop offset="0" stopColor={court.brass.light} />
          <stop offset="1" stopColor={court.brass.deep} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="57" fill="url(#crest-fill)" stroke={court.wood.deep} strokeWidth="2" />
      <circle cx="60" cy="60" r="50.5" fill="none" stroke={court.wood.deep} strokeWidth="1" strokeDasharray="1.5 2.5" opacity=".7" />
      <circle cx="60" cy="60" r="31" fill="none" stroke={court.wood.deep} strokeWidth="1.2" opacity=".8" />
      <text fontSize="9.4" fontWeight="800" letterSpacing="2.4" fill={court.wood.deep} style={{ fontFamily: "var(--gift-font-body)" }}>
        <textPath href="#crest-top" startOffset="50%" textAnchor="middle">
          {top.toUpperCase()}
        </textPath>
      </text>
      <text fontSize="6.6" fontWeight="700" letterSpacing="1.8" fill={court.wood.deep} style={{ fontFamily: "var(--gift-font-body)" }}>
        <textPath href="#crest-bottom" startOffset="50%" textAnchor="middle">
          {bottom.toUpperCase()}
        </textPath>
      </text>
      <Paw x={41} y={40} size={38} color={court.wood.deep} />
    </svg>
  );
}

/** A judge's gavel, drawn lying on its block, hinged at the end of the handle. */
export function Gavel({ court, className }: { court: Court; className?: string }) {
  return (
    <svg viewBox="0 0 100 60" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gavel-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={court.dark ? "#B07B57" : "#8A5228"} />
          <stop offset="1" stopColor={court.dark ? "#5E3B27" : "#4E2A10"} />
        </linearGradient>
      </defs>
      <rect x="6" y="33" width="66" height="7" rx="3.5" fill="url(#gavel-wood)" transform="rotate(-16 6 36)" />
      <g transform="rotate(-16 74 18)">
        <rect x="58" y="2" width="30" height="34" rx="5" fill="url(#gavel-wood)" />
        <rect x="58" y="8" width="30" height="4" fill={court.brass.light} opacity=".9" />
        <rect x="58" y="26" width="30" height="4" fill={court.brass.light} opacity=".9" />
      </g>
    </svg>
  );
}

/** The front of the bench: planks, a ledge, three sunk panels. Drawn in CSS so it stretches to any width. */
export function BenchFront({ court, className, style, children }: { court: Court; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const { light, mid, deep } = court.wood;
  return (
    <div className={cn("overflow-hidden", className)} style={{ background: `linear-gradient(180deg, ${light} 0, ${mid} 38%, ${deep} 100%)`, ...style }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-40 mix-blend-multiply" style={{ backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 1px, transparent 1px calc(2.2*var(--p))), repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px calc(.9*var(--p)))` }} />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[calc(2.6*var(--p))]" style={{ background: `linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0))`, boxShadow: `0 calc(.5*var(--p)) 0 ${deep}` }} />
      {children}
    </div>
  );
}

export function NamePlate({ children, court, className, style }: { children: ReactNode; court: Court; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={cn("block truncate rounded-[calc(.6*var(--p))] px-[calc(1.1*var(--p))] py-[calc(.55*var(--p))] text-center text-[calc(1.85*var(--p))] leading-none font-extrabold tracking-[0.12em] uppercase", className)}
      style={{ background: `linear-gradient(180deg, ${court.brass.light}, ${court.brass.deep})`, color: "#3A2608", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.45), 0 calc(.3*var(--p)) calc(.6*var(--p)) rgba(0,0,0,.4)", textShadow: "0 1px 0 rgba(255,255,255,.4)", ...style }}
    >
      {children}
    </span>
  );
}

/** The rubber stamp: heavy type in a box, pressed unevenly. */
export function Stamp({ word, className, style }: { word: string; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={cn("inline-block rounded-[calc(1.6*var(--p))] border-[calc(1*var(--p))] px-[calc(3.2*var(--p))] py-[calc(1.2*var(--p))] text-center leading-none font-black tracking-[0.08em] uppercase", className)}
      style={{ fontFamily: POSTER_FONT, color: "var(--gift-accent)", borderColor: "var(--gift-accent)", filter: "url(#council-rough)", mixBlendMode: "multiply", ...style }}
    >
      {word}
    </span>
  );
}

/** One filter for every stamp on the page: ink that didn't quite take. */
export function RoughInk() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="council-rough" x="-5%" y="-10%" width="110%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.18" result="holes" />
        <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn" />
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="3" result="warp" />
        <feDisplacementMap in="worn" in2="warp" scale="3" />
      </filter>
    </svg>
  );
}

export const COUNCIL_KEYFRAMES = `
@keyframes tc-breathe { 0%,100% { scale: 1 1 } 50% { scale: 1.018 .985 } }
@keyframes tc-sway { 0%,100% { rotate: -1.6deg } 50% { rotate: 1.6deg } }
.tc-breathe { animation: tc-breathe var(--pace) ease-in-out infinite; transform-origin: 50% 100%; }
.tc-sway { animation: tc-sway var(--pace) ease-in-out infinite; transform-origin: 50% 100%; }
@media (prefers-reduced-motion: reduce) { .tc-breathe, .tc-sway { animation: none; } }
`;
