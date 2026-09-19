"use client";

/**
 * Ink and watercolour. Every doodle here is a line drawing that draws itself — the path grows
 * from its first point to its last, the way a pen crosses a page — and then a wash of colour
 * bleeds in behind it, soft-edged and a little outside the lines, the way watercolour does.
 * The line wobbles under a turbulence filter so it never reads as a computer's.
 */
import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import type { AmbienceKind } from "../_shared/Ambience";
import { mulberry32 } from "../_shared/random";

export type ThemeId = "white" | "kraft" | "night";

export type Theme = {
  dark: boolean;
  /** The page, and the desk it lies on. */
  paper: string;
  desk: string;
  ink: string;
  /** The pen's second colour, for the words that matter. */
  accent: string;
  washes: string[];
  tape: string;
  spiral: string;
  cover: { cloth: string; clothDeep: string; label: string; labelInk: string };
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
};

export const THEMES: Record<ThemeId, Theme> = {
  white: {
    dark: false,
    paper: "#FBF8F2",
    desk: "radial-gradient(70% 55% at 50% 30%, rgba(255,255,255,.5), transparent 70%), linear-gradient(180deg, #D8CBB8 0%, #C4B39C 100%)",
    ink: "#2B2622",
    accent: "#D9667C",
    washes: ["#F4B8C1", "#F6DFA4", "#BFE0D6", "#C9DAF2", "#DCD0F0"],
    tape: "rgba(236,164,178,.62)",
    spiral: "#8A8F94",
    cover: { cloth: "#B9895A", clothDeep: "#8E6538", label: "#FBF8F2", labelInk: "#2B2622" },
    ambience: [{ kind: "dust", colors: ["#FFFFFF", "#FFE9B8"], count: 10 }],
  },
  kraft: {
    dark: false,
    paper: "#D9BC90",
    desk: "radial-gradient(70% 55% at 50% 30%, rgba(255,255,255,.35), transparent 70%), linear-gradient(180deg, #8C7458 0%, #6E5A42 100%)",
    ink: "#3A2A1E",
    accent: "#C8433A",
    washes: ["#FFFFFF", "#F1E4C8", "#C8433A", "#8FB8A6", "#E8B15A"],
    tape: "rgba(255,255,255,.5)",
    spiral: "#5A4A3A",
    cover: { cloth: "#2F4A3C", clothDeep: "#1E3328", label: "#F4E8D2", labelInk: "#2F4A3C" },
    ambience: [{ kind: "dust", colors: ["#FFFFFF", "#FFE9B8"], count: 8 }],
  },
  night: {
    dark: true,
    paper: "#20242E",
    desk: "radial-gradient(70% 55% at 50% 30%, rgba(120,140,190,.2), transparent 70%), linear-gradient(180deg, #14171F 0%, #0B0D12 100%)",
    ink: "#F6F1E8",
    accent: "#F2C14E",
    washes: ["#F27A9B", "#F2C14E", "#7FD6C2", "#8FB4FF", "#C9A3FF"],
    tape: "rgba(242,193,78,.5)",
    spiral: "#9AA0A8",
    cover: { cloth: "#2A3550", clothDeep: "#1A2236", label: "#F6F1E8", labelInk: "#1A2236" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 16 }],
  },
};

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

export const SKETCH_KEYFRAMES = `
.sk-flicker{transform-box:fill-box;transform-origin:50% 100%;animation:sk-flicker .8s ease-in-out infinite alternate}
@keyframes sk-flicker{from{scale:1 1;rotate:-4deg}to{scale:.94 1.08;rotate:4deg}}
.sk-float{animation:sk-float 5s ease-in-out infinite alternate}
@keyframes sk-float{from{translate:0 0}to{translate:0 -4px}}
@media (prefers-reduced-motion: reduce){.sk-flicker,.sk-float{animation:none}}
`;

/** The filter that keeps a line from being straight: a nudge from turbulence, seeded per drawing. */
export function Wobble({ id, seed, scale = 1.6 }: { id: string; seed: number; scale?: number }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed={seed % 100} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

/** One line of ink, drawn from its start to its end. `at` is when it starts, in seconds; `dur` how long it takes. */
export function Ink({ d, ink, width = 1.6, at = 0, dur = 0.8, still = false, dash }: { d: string; ink: string; width?: number; at?: number; dur?: number; still?: boolean; dash?: string }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={ink}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      initial={still ? false : { pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={still ? { duration: 0 } : { pathLength: { delay: at, duration: dur, ease: "easeInOut" }, opacity: { delay: at, duration: 0.01 } }}
    />
  );
}

/** A wash of watercolour: a soft shape that bleeds in a moment after the line round it is drawn. */
export function Wash({ children, at = 0, still = false, opacity = 0.75 }: { children: ReactNode; at?: number; still?: boolean; opacity?: number }) {
  return (
    <motion.g initial={still ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity, scale: 1 }} transition={still ? { duration: 0 } : { delay: at, duration: 0.9, ease: "easeOut" }} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
      {children}
    </motion.g>
  );
}

/** The watercolour's soft edge, as a filter a wash is drawn through. */
export function Bleed({ id, seed }: { id: string; seed: number }) {
  return (
    <filter id={id} x="-25%" y="-25%" width="150%" height="150%">
      <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed={seed % 100} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d" />
      <feGaussianBlur in="d" stdDeviation="1.4" />
    </filter>
  );
}

/**
 * The cake, doodled: three tiers of rounded outline with drips down the sides, candles with
 * flames, a plate, and the washes under it. Draws itself over about four seconds.
 */
export function CakeDoodle({ theme, candles, still, seed, at = 0 }: { theme: Theme; candles: number; still: boolean; seed: number; at?: number }) {
  const uid = safeId(useId());
  const ink = theme.ink;
  const n = Math.max(1, Math.min(8, candles));
  const spread = Math.min(56, n * 10);
  const cx = (i: number) => 100 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
  return (
    <svg viewBox="0 0 200 180" className="h-full w-full" style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <Wobble id={`${uid}-w`} seed={seed} />
        <Bleed id={`${uid}-b`} seed={seed + 3} />
      </defs>
      <g filter={`url(#${uid}-b)`}>
        <Wash at={at + 1.2} still={still}>
          <rect x="34" y="112" width="132" height="42" rx="8" fill={theme.washes[0]} />
        </Wash>
        <Wash at={at + 1.8} still={still}>
          <rect x="52" y="80" width="96" height="36" rx="7" fill={theme.washes[1]} />
        </Wash>
        <Wash at={at + 2.4} still={still}>
          <rect x="70" y="52" width="60" height="32" rx="6" fill={theme.washes[2]} />
        </Wash>
        <Wash at={at + 3.4} still={still} opacity={0.6}>
          {Array.from({ length: n }, (_, i) => (
            <ellipse key={i} cx={cx(i)} cy="30" rx="5" ry="8" fill={theme.washes[1]} />
          ))}
        </Wash>
      </g>
      <g filter={`url(#${uid}-w)`}>
        {/* the plate */}
        <Ink d="M22 156 C40 150 160 150 178 156 C160 166 40 166 22 156 Z" ink={ink} at={at} dur={0.9} still={still} />
        {/* tiers, bottom to top, each with its drips */}
        <Ink d="M36 152 V116 C36 110 40 108 46 108 H154 C160 108 164 110 164 116 V152" ink={ink} at={at + 0.6} dur={1} still={still} />
        <Ink d="M36 118 C44 118 46 130 52 122 C58 114 62 132 70 120 C78 110 84 128 92 120 C100 112 108 130 116 120 C124 112 130 128 138 120 C146 112 152 130 158 120 C160 116 162 118 164 118" ink={ink} width={1.4} at={at + 1.3} dur={0.9} still={still} />
        <Ink d="M54 108 V84 C54 78 58 76 64 76 H136 C142 76 146 78 146 84 V108" ink={ink} at={at + 1.4} dur={0.9} still={still} />
        <Ink d="M54 86 C62 86 64 98 70 90 C76 82 82 100 90 90 C98 82 104 98 112 90 C120 82 126 100 134 90 C140 84 144 88 146 86" ink={ink} width={1.4} at={at + 2} dur={0.8} still={still} />
        <Ink d="M72 76 V56 C72 51 75 50 80 50 H120 C125 50 128 51 128 56 V76" ink={ink} at={at + 2.1} dur={0.8} still={still} />
        <Ink d="M72 58 C78 58 80 68 86 62 C92 56 96 70 102 62 C108 56 112 70 118 62 C124 58 126 60 128 58" ink={ink} width={1.4} at={at + 2.6} dur={0.7} still={still} />
        {/* the candles and their flames */}
        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            <Ink d={`M${cx(i) - 3} 50 V36 H${cx(i) + 3} V50`} ink={ink} width={1.4} at={at + 2.9 + i * 0.08} dur={0.35} still={still} />
            <Ink d={`M${cx(i) - 3} 41 H${cx(i) + 3} M${cx(i) - 3} 46 H${cx(i) + 3}`} ink={ink} width={1.1} at={at + 3.1 + i * 0.08} dur={0.2} still={still} />
            <g className="sk-flicker" style={{ animationDelay: `${-i * 0.19}s` }}>
              <Ink d={`M${cx(i)} 33 C${cx(i) - 5} 27 ${cx(i) - 4} 21 ${cx(i)} 17 C${cx(i) + 4} 21 ${cx(i) + 5} 27 ${cx(i)} 33 Z`} ink={ink} width={1.3} at={at + 3.4 + i * 0.08} dur={0.4} still={still} />
            </g>
          </g>
        ))}
        {/* a few sprinkles and a sparkle */}
        <Ink d="M60 132 l4 -2 M92 140 l4 -2 M124 130 l4 -2 M142 142 l4 -2 M80 96 l3 -2 M118 100 l3 -2" ink={ink} width={1.6} at={at + 3.8} dur={0.5} still={still} />
        <Ink d="M170 40 v10 M165 45 h10 M168 42 l4 6 M172 42 l-4 6" ink={theme.accent} width={1.3} at={at + 4.1} dur={0.5} still={still} />
      </g>
    </svg>
  );
}

/** Their age, doodled inside a circle drawn round it twice, the way a pen circles a thing that matters. */
export function AgeBadge({ age, theme, still, seed, at = 0, className }: { age: number; theme: Theme; still: boolean; seed: number; at?: number; className?: string }) {
  const uid = safeId(useId());
  return (
    <svg viewBox="0 0 80 80" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <Wobble id={`${uid}-w`} seed={seed + 11} scale={2.2} />
        <Bleed id={`${uid}-b`} seed={seed + 5} />
      </defs>
      <g filter={`url(#${uid}-b)`}>
        <Wash at={at + 0.4} still={still} opacity={0.7}>
          <circle cx="40" cy="41" r="27" fill={theme.washes[1]} />
        </Wash>
      </g>
      <g filter={`url(#${uid}-w)`}>
        <Ink d="M40 12 C58 10 70 26 68 42 C66 60 48 70 32 66 C16 62 8 46 14 30 C20 14 40 8 54 16 C66 24 70 44 60 56" ink={theme.accent} width={2} at={at} dur={1.1} still={still} />
      </g>
      <motion.text x="40" y="52" textAnchor="middle" fontSize={age > 99 ? 24 : 32} fill={theme.ink} style={{ fontFamily: "var(--gift-font-hand)", fontWeight: 700 }} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: at + 0.6, duration: 0.4 }}>
        {age}
      </motion.text>
    </svg>
  );
}

/** A balloon on a string, one stroke of the pen. */
export function BalloonDoodle({ theme, wash, still, seed, at = 0, className }: { theme: Theme; wash: string; still: boolean; seed: number; at?: number; className?: string }) {
  const uid = safeId(useId());
  return (
    <svg viewBox="0 0 60 110" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <Wobble id={`${uid}-w`} seed={seed} />
        <Bleed id={`${uid}-b`} seed={seed + 7} />
      </defs>
      <g filter={`url(#${uid}-b)`}>
        <Wash at={at + 0.7} still={still}>
          <ellipse cx="31" cy="31" rx="20" ry="25" fill={wash} />
        </Wash>
      </g>
      <g filter={`url(#${uid}-w)`}>
        <Ink d="M30 6 C46 6 52 20 50 34 C48 46 38 54 30 58 C22 54 12 46 10 34 C8 20 14 6 30 6 Z" ink={theme.ink} at={at} dur={1} still={still} />
        <Ink d="M27 58 L30 63 L33 58" ink={theme.ink} at={at + 0.9} dur={0.2} still={still} />
        <Ink d="M30 63 C36 76 22 86 30 100 C34 106 26 108 32 108" ink={theme.ink} width={1.2} at={at + 1.1} dur={0.7} still={still} />
        <Ink d="M20 18 C22 14 26 12 29 12" ink={theme.ink} width={1.2} at={at + 1.3} dur={0.3} still={still} />
      </g>
    </svg>
  );
}

/** A party hat with a pompom, a present with a bow, and a star, for the corners of pages. */
export function Doodle({ kind, theme, wash, still, seed, at = 0, className }: { kind: "hat" | "gift" | "star" | "heart" | "arrow" | "bang" | "squiggle"; theme: Theme; wash?: string; still: boolean; seed: number; at?: number; className?: string }) {
  const uid = safeId(useId());
  const ink = theme.ink;
  const color = wash ?? theme.washes[seed % theme.washes.length];
  return (
    <svg viewBox="0 0 60 60" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <Wobble id={`${uid}-w`} seed={seed} />
        <Bleed id={`${uid}-b`} seed={seed + 9} />
      </defs>
      {kind === "hat" ? (
        <>
          <g filter={`url(#${uid}-b)`}>
            <Wash at={at + 0.6} still={still}>
              <path d="M30 8 L50 52 H10 Z" fill={color} />
            </Wash>
          </g>
          <g filter={`url(#${uid}-w)`}>
            <Ink d="M30 8 L52 52 C40 56 20 56 8 52 Z" ink={ink} at={at} dur={0.8} still={still} />
            <Ink d="M18 34 L38 40 M14 44 L44 50" ink={ink} width={1.2} at={at + 0.6} dur={0.4} still={still} />
            <Ink d="M30 8 C26 3 34 1 32 6 C36 9 27 11 30 8" ink={ink} width={1.3} at={at + 0.9} dur={0.4} still={still} />
          </g>
        </>
      ) : kind === "gift" ? (
        <>
          <g filter={`url(#${uid}-b)`}>
            <Wash at={at + 0.6} still={still}>
              <rect x="10" y="22" width="40" height="32" fill={color} />
            </Wash>
          </g>
          <g filter={`url(#${uid}-w)`}>
            <Ink d="M10 24 H50 V54 H10 Z" ink={ink} at={at} dur={0.7} still={still} />
            <Ink d="M6 24 H54 V32 H6 Z" ink={ink} width={1.3} at={at + 0.4} dur={0.5} still={still} />
            <Ink d="M30 24 V54 M6 28 H54" ink={ink} width={1.3} at={at + 0.7} dur={0.4} still={still} />
            <Ink d="M30 22 C20 8 8 14 20 22 M30 22 C40 8 52 14 40 22" ink={ink} width={1.4} at={at + 1} dur={0.5} still={still} />
          </g>
        </>
      ) : kind === "star" ? (
        <g filter={`url(#${uid}-w)`}>
          <Ink d="M30 6 L36 24 L54 24 L40 34 L46 52 L30 41 L14 52 L20 34 L6 24 L24 24 Z" ink={ink} width={1.6} at={at} dur={0.7} still={still} />
        </g>
      ) : kind === "heart" ? (
        <>
          <g filter={`url(#${uid}-b)`}>
            <Wash at={at + 0.5} still={still}>
              <path d="M30 50 C14 38 8 30 10 20 C12 12 22 10 30 18 C38 10 48 12 50 20 C52 30 46 38 30 50 Z" fill={color} />
            </Wash>
          </g>
          <g filter={`url(#${uid}-w)`}>
            <Ink d="M30 50 C14 38 8 30 10 20 C12 12 22 10 30 18 C38 10 48 12 50 20 C52 30 46 38 30 50 Z" ink={ink} width={1.6} at={at} dur={0.7} still={still} />
          </g>
        </>
      ) : kind === "arrow" ? (
        <g filter={`url(#${uid}-w)`}>
          <Ink d="M6 44 C18 30 30 22 52 16 M40 12 L52 16 L46 28" ink={ink} width={1.8} at={at} dur={0.6} still={still} />
        </g>
      ) : kind === "bang" ? (
        <g filter={`url(#${uid}-w)`}>
          <Ink d="M20 8 L18 36 M20 44 L20 48 M34 8 L32 36 M34 44 L34 48" ink={theme.accent} width={3} at={at} dur={0.4} still={still} />
        </g>
      ) : (
        <g filter={`url(#${uid}-w)`}>
          <Ink d="M4 30 C12 18 18 42 26 30 C34 18 40 42 48 30 C52 24 56 28 58 30" ink={ink} width={1.6} at={at} dur={0.6} still={still} />
        </g>
      )}
    </svg>
  );
}

/** The coil binding along the top of the book: rings through punched holes. */
export function Spiral({ color, count = 14, className }: { color: string; count?: number; className?: string }) {
  return (
    <svg viewBox={`0 0 ${count * 20} 30`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const x = i * 20 + 10;
        return (
          <g key={i}>
            <ellipse cx={x} cy="18" rx="3.2" ry="2.2" fill="rgba(0,0,0,.35)" />
            <path d={`M${x - 2} 18 C${x - 8} 12 ${x - 6} 2 ${x + 1} 2 C${x + 8} 2 ${x + 8} 14 ${x + 2} 18`} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
            <path d={`M${x - 2} 18 C${x - 8} 12 ${x - 6} 2 ${x + 1} 2`} fill="none" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth=".9" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

/** A strip of washi tape with pinked ends, for the photos. */
export function TapeStrip({ color, className, style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden="true" className={className} style={{ display: "block", backgroundColor: color, backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.3) 0 2px, transparent 2px 7px)", clipPath: "polygon(0 0, 3% 12%, 0 25%, 3% 38%, 0 50%, 3% 62%, 0 75%, 3% 88%, 0 100%, 100% 100%, 97% 88%, 100% 75%, 97% 62%, 100% 50%, 97% 38%, 100% 25%, 97% 12%, 100% 0)", ...style }} />;
}

/** A line under a title, drawn with a marker: two strokes, the second a little off. */
export function Underline({ ink, still, at = 0, className }: { ink: string; still: boolean; at?: number; className?: string }) {
  const uid = safeId(useId());
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        <Wobble id={`${uid}-w`} seed={3} scale={2} />
      </defs>
      <g filter={`url(#${uid}-w)`}>
        <Ink d="M4 6 C60 2 140 2 196 5" ink={ink} width={3.2} at={at} dur={0.5} still={still} />
        <Ink d="M10 11 C70 8 130 9 190 10" ink={ink} width={2.2} at={at + 0.4} dur={0.4} still={still} />
      </g>
    </svg>
  );
}

/** Paper grain, as a background image. */
export const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

export function seedOf(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export { mulberry32 };
