"use client";

/**
 * The balloons' parts, all drawn here: a gouache balloon (a wobbly ink outline, a grainy fill, a
 * wet highlight and a curled ribbon), the gold foil number balloons for their age, a bunting line
 * of hand-lettered pennants, and the shards a balloon leaves behind when it pops. Every piece is
 * SVG, so it stays crisp from a phone to a laptop, and every gradient id carries a `uid` because
 * a scene draws a dozen of them into the same document.
 */
import { useId, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { AmbienceKind } from "../_shared/Ambience";
import { POSTER_FONT } from "../_shared/cover-kit";
import { mulberry32 } from "../_shared/random";

export type PaletteId = "pastel" | "sunset" | "jewel" | "cream";

export type BalloonTone = { light: string; mid: string; deep: string };

export type Palette = {
  dark: boolean;
  /** The wall behind everything, and a print pressed faintly into it. */
  wall: string;
  print: string;
  ink: string;
  accent: string;
  /** The paper of the letter and the polaroids' frames. */
  paper: string;
  paperInk: string;
  kraft: string;
  balloons: BalloonTone[];
  ribbon: string;
  foil: { light: string; mid: string; deep: string; edge: string };
  pennants: { paper: string; ink: string; pattern: "dots" | "stripes" | "gingham" | "plain" }[];
  bunting: string;
  confetti: string[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
};

export const PALETTES: Record<PaletteId, Palette> = {
  pastel: {
    dark: false,
    wall: "radial-gradient(60% 45% at 50% 0%, rgba(255,255,255,.7), transparent 70%), radial-gradient(50% 40% at 100% 100%, rgba(244,199,195,.45), transparent 70%), radial-gradient(45% 40% at 0% 90%, rgba(196,214,240,.5), transparent 70%), linear-gradient(180deg, #FBF4EC 0%, #F6E6E6 100%)",
    print: "#C98A94",
    ink: "#4A2E34",
    accent: "#D9667C",
    paper: "#FFFDF8",
    paperInk: "#3A2A2C",
    kraft: "#E7CFAE",
    balloons: [
      { light: "#FFE1E8", mid: "#F5A9BA", deep: "#C9607A" },
      { light: "#FFF6D6", mid: "#F7D77A", deep: "#C99A2E" },
      { light: "#E4F3E7", mid: "#A9D3B4", deep: "#5E9B73" },
      { light: "#E6F0FF", mid: "#A8C6EE", deep: "#5B84C2" },
      { light: "#F1E6FF", mid: "#C8B0E8", deep: "#8A66BE" },
      { light: "#FFFFFF", mid: "#F5EFE6", deep: "#C9BBA9" },
      { light: "#FFE8D6", mid: "#F8B98D", deep: "#D07A44" },
    ],
    ribbon: "#B48A8F",
    foil: { light: "#FFE9C2", mid: "#E7B36A", deep: "#B37A2E", edge: "#7A4E12" },
    pennants: [
      { paper: "#FFFDF8", ink: "#4A2E34", pattern: "dots" },
      { paper: "#F7C8D3", ink: "#7A2E45", pattern: "plain" },
      { paper: "#F9E6A8", ink: "#6E4A0C", pattern: "stripes" },
      { paper: "#CFE5D4", ink: "#2F5A3C", pattern: "gingham" },
      { paper: "#CFDDF3", ink: "#2E4A72", pattern: "plain" },
    ],
    bunting: "#8C6A5E",
    confetti: ["#F5A9BA", "#F7D77A", "#A9D3B4", "#A8C6EE", "#FFFFFF"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 12 }],
  },
  sunset: {
    dark: false,
    wall: "radial-gradient(70% 50% at 50% 0%, rgba(255,241,214,.85), transparent 70%), radial-gradient(60% 45% at 50% 110%, rgba(214,90,70,.35), transparent 70%), linear-gradient(180deg, #FBE9CF 0%, #F4C6A6 55%, #E9A08A 100%)",
    print: "#C46A4A",
    ink: "#4A2418",
    accent: "#D0503A",
    paper: "#FFFAF0",
    paperInk: "#3B2418",
    kraft: "#E5C193",
    balloons: [
      { light: "#FFD3C0", mid: "#F48A6C", deep: "#B8452C" },
      { light: "#FFE7B8", mid: "#F5B84C", deep: "#C27A12" },
      { light: "#FFDCD2", mid: "#EE9C97", deep: "#B85A5C" },
      { light: "#FFF3DF", mid: "#F1D7A8", deep: "#C29A5C" },
      { light: "#FFE0C4", mid: "#F6A55E", deep: "#C7621F" },
      { light: "#F4E2E4", mid: "#D9A3AC", deep: "#98596A" },
    ],
    ribbon: "#A8654E",
    foil: { light: "#FFF0C4", mid: "#EDBB58", deep: "#B7801C", edge: "#7C5210" },
    pennants: [
      { paper: "#FFFAF0", ink: "#4A2418", pattern: "dots" },
      { paper: "#F48A6C", ink: "#FFF6EE", pattern: "plain" },
      { paper: "#F5B84C", ink: "#5A360A", pattern: "stripes" },
      { paper: "#EE9C97", ink: "#5A2530", pattern: "plain" },
      { paper: "#F1D7A8", ink: "#5A3C12", pattern: "gingham" },
    ],
    bunting: "#7C4A38",
    confetti: ["#F48A6C", "#F5B84C", "#EE9C97", "#FFF3DF", "#FFFFFF"],
    ambience: [
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 10 },
      { kind: "bokeh", colors: ["#FFD9A8", "#FFFFFF"], count: 6 },
    ],
  },
  jewel: {
    dark: true,
    wall: "radial-gradient(70% 50% at 50% 0%, rgba(120,160,190,.22), transparent 70%), radial-gradient(60% 45% at 50% 110%, rgba(0,0,0,.45), transparent 70%), linear-gradient(180deg, #1B2E44 0%, #14233A 60%, #0D1727 100%)",
    print: "#6F8CAB",
    ink: "#F3EEE4",
    accent: "#E6B85C",
    paper: "#FBF6EC",
    paperInk: "#2A2320",
    kraft: "#D6B98C",
    balloons: [
      { light: "#9FE3C6", mid: "#2FA57C", deep: "#136048" },
      { light: "#FFB2C0", mid: "#D93F5E", deep: "#8A1B33" },
      { light: "#B3CCFF", mid: "#4B74D9", deep: "#233F8E" },
      { light: "#E4C6FF", mid: "#9B5FD6", deep: "#5E2F94" },
      { light: "#FFF0BF", mid: "#E6B85C", deep: "#9C7220" },
      { light: "#FFFFFF", mid: "#EDE6DA", deep: "#B3A896" },
    ],
    ribbon: "#D8C8A8",
    foil: { light: "#FFF1CC", mid: "#E9BE60", deep: "#B48120", edge: "#6E4C0E" },
    pennants: [
      { paper: "#FBF6EC", ink: "#2A2320", pattern: "dots" },
      { paper: "#E6B85C", ink: "#3A2A08", pattern: "plain" },
      { paper: "#2FA57C", ink: "#F3FFF9", pattern: "stripes" },
      { paper: "#D93F5E", ink: "#FFF3F5", pattern: "plain" },
      { paper: "#4B74D9", ink: "#F0F4FF", pattern: "gingham" },
    ],
    bunting: "#D8C8A8",
    confetti: ["#E6B85C", "#2FA57C", "#D93F5E", "#4B74D9", "#FFFFFF"],
    ambience: [
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 18 },
      { kind: "bokeh", colors: ["#E6B85C", "#FFFFFF"], count: 6 },
    ],
  },
  cream: {
    dark: false,
    wall: "radial-gradient(70% 50% at 50% 0%, rgba(255,255,255,.9), transparent 70%), radial-gradient(50% 40% at 100% 100%, rgba(226,206,172,.4), transparent 70%), linear-gradient(180deg, #FAF6EF 0%, #F1E9DC 100%)",
    print: "#B79E7C",
    ink: "#3E332A",
    accent: "#B8893A",
    paper: "#FFFDF9",
    paperInk: "#33291F",
    kraft: "#E3CFAE",
    balloons: [
      { light: "#FFFFFF", mid: "#F8F4EC", deep: "#CFC5B4" },
      { light: "#FFF7E6", mid: "#F1DFB6", deep: "#C8A96A" },
      { light: "#FFF0EA", mid: "#F4D3C6", deep: "#C99987" },
      { light: "#FFFBF3", mid: "#EEE7DA", deep: "#BFB39F" },
      { light: "#FFF3DA", mid: "#F0CF8C", deep: "#BE9138" },
      { light: "#FFF8F4", mid: "#F6E4DE", deep: "#C7A79D" },
    ],
    ribbon: "#B79E7C",
    foil: { light: "#FFF3D2", mid: "#E9C070", deep: "#B48524", edge: "#775210" },
    pennants: [
      { paper: "#FFFDF9", ink: "#3E332A", pattern: "dots" },
      { paper: "#F1DFB6", ink: "#5A4416", pattern: "plain" },
      { paper: "#F4D3C6", ink: "#6A3A2A", pattern: "stripes" },
      { paper: "#EEE7DA", ink: "#3E332A", pattern: "gingham" },
      { paper: "#E9C070", ink: "#4A3208", pattern: "plain" },
    ],
    bunting: "#9A8264",
    confetti: ["#E9C070", "#F4D3C6", "#FFFFFF", "#F1DFB6"],
    ambience: [
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 12 },
      { kind: "bokeh", colors: ["#F0CF8C", "#FFFFFF"], count: 5 },
    ],
  },
};

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/** The balloon: widest above its middle and pinched to a knot, the way a filled one hangs. */
const BODY = "M0 -56 C28 -56 46 -36 46 -10 C46 18 24 42 4 56 L0 58 L-4 56 C-24 42 -46 18 -46 -10 C-46 -36 -28 -56 0 -56 Z";

export const BALLOON_KEYFRAMES = `
.bl-bob{animation:bl-bob var(--bob,6s) ease-in-out infinite alternate}
@keyframes bl-bob{from{translate:0 0;rotate:-1.6deg}to{translate:0 calc(-1.4*var(--k));rotate:1.6deg}}
.bl-sway{transform-origin:50% 0;animation:bl-sway 7s ease-in-out infinite alternate}
@keyframes bl-sway{from{rotate:-1.1deg}to{rotate:1.1deg}}
.bl-rise{animation:bl-rise 4.4s ease-in-out infinite alternate}
@keyframes bl-rise{from{translate:0 0}to{translate:0 calc(-1.8*var(--k))}}
@media (prefers-reduced-motion: reduce){.bl-bob,.bl-sway,.bl-rise{animation:none}}
`;

/**
 * One gouache balloon with its ribbon. The body is a gradient with paint grain multiplied over
 * it, an ink outline pushed about by turbulence so it reads as drawn, a wet highlight, and a
 * curled ribbon hanging from the knot. `seed` varies the outline's wobble and the ribbon's curl.
 */
export function Balloon({ tone, seed, ribbon, className, style }: { tone: BalloonTone; seed: number; ribbon: string; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const rng = mulberry32(seed);
  const curl = 0.8 + rng() * 0.5;
  const lean = (rng() - 0.5) * 16;
  // No two balloons are quite the same shape: a little wider or narrower, a little taller.
  const sx = 0.94 + rng() * 0.1;
  const sy = 0.97 + rng() * 0.06;
  return (
    <svg viewBox="-60 -62 120 250" className={className} style={{ overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-b`} cx="36%" cy="28%" r="72%">
          <stop offset="0" stopColor={tone.light} />
          <stop offset=".48" stopColor={tone.mid} />
          <stop offset="1" stopColor={tone.deep} />
        </radialGradient>
        <radialGradient id={`${uid}-r`} cx="50%" cy="50%" r="50%">
          <stop offset=".62" stopColor={tone.deep} stopOpacity="0" />
          <stop offset="1" stopColor={tone.deep} stopOpacity=".55" />
        </radialGradient>
        <clipPath id={`${uid}-c`}>
          <path d={BODY} />
        </clipPath>
        <filter id={`${uid}-g`} x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed={seed % 100} />
          <feColorMatrix values="0 0 0 0 .2 0 0 0 0 .1 0 0 0 0 .05 0 0 0 .55 0" />
        </filter>
        <filter id={`${uid}-w`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed={seed % 100} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${uid}-s`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* the ribbon, tied to the knot and curling on its way down */}
      <path
        d={`M0 68 C${8 * curl} 90 ${-12 * curl} 106 ${lean * 0.2} 126 C${10 * curl} 144 ${-9 * curl} 158 ${3 + lean * 0.3} 176 c${6 * curl} 5 ${12 * curl} -3 ${5 * curl} -8`}
        fill="none"
        stroke={ribbon}
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity=".9"
      />

      <g transform={`scale(${sx.toFixed(3)} ${sy.toFixed(3)})`}>
        {/* the body: gradient, paint grain, a rim of shade, the outline drawn by hand */}
        <path d={BODY} fill={`url(#${uid}-b)`} />
        <rect x="-60" y="-62" width="120" height="130" clipPath={`url(#${uid}-c)`} filter={`url(#${uid}-g)`} opacity=".24" style={{ mixBlendMode: "multiply" }} />
        <path d={BODY} fill={`url(#${uid}-r)`} />
        <g filter={`url(#${uid}-w)`}>
          <path d={BODY} fill="none" stroke={tone.deep} strokeWidth="2.2" strokeOpacity=".72" strokeLinejoin="round" />
          <path d="M-40 -14 C-42 8 -30 30 -8 48" fill="none" stroke={tone.deep} strokeWidth="1.6" strokeOpacity=".28" strokeLinecap="round" />
        </g>

        {/* the wet highlight, and the small one under it */}
        <ellipse cx="-17" cy="-28" rx="8" ry="15" transform="rotate(-24 -17 -28)" fill="#FFFFFF" opacity=".62" filter={`url(#${uid}-s)`} />
        <ellipse cx="-19" cy="-30" rx="4.2" ry="9" transform="rotate(-24 -19 -30)" fill="#FFFFFF" opacity=".78" />
        <ellipse cx="-24" cy="-6" rx="2.4" ry="3.4" fill="#FFFFFF" opacity=".55" />
        <path d="M30 -30 C38 -22 40 -8 36 8" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity=".24" />

        {/* the knot */}
        <path d="M-6 58 L0 66 L6 58 Z" fill={tone.deep} />
        <path d="M-6 58 L0 66 L6 58" fill="none" stroke={tone.deep} strokeWidth="1" strokeOpacity=".6" strokeLinejoin="round" />
        <ellipse cx="0" cy="66.5" rx="3.2" ry="2" fill={tone.mid} stroke={tone.deep} strokeWidth=".8" />
      </g>
    </svg>
  );
}

/** The bits of rubber a balloon turns into: a ring of curled shards flung outward, gone in half a second. */
export function PopShards({ tone, confetti, reduce }: { tone: BalloonTone; confetti: string[]; reduce: boolean }) {
  const shards = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.3;
    return { x: Math.cos(a) * 62, y: Math.sin(a) * 62, rot: (a * 180) / Math.PI, big: i % 3 === 0 };
  });
  const bits = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    return { x: Math.cos(a) * (40 + (i % 3) * 14), y: Math.sin(a) * 44 - 10, color: confetti[i % confetti.length] };
  });
  return (
    <svg viewBox="-60 -62 120 130" className="pointer-events-none h-full w-full" style={{ overflow: "visible" }} aria-hidden="true">
      {bits.map((b, i) => (
        <motion.rect key={`c${i}`} x="-3" y="-2" width="6" height="4" fill={b.color} initial={reduce ? { opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }} animate={{ x: b.x, y: b.y + 40, rotate: 200 + i * 40, opacity: 0 }} transition={{ duration: 0.85, ease: [0.2, 0.7, 0.4, 1] }} />
      ))}
      {shards.map((s, i) => (
        <motion.path
          key={i}
          d={s.big ? "M0 0 C6 -10 16 -8 14 2 C12 10 4 12 0 0Z" : "M0 0 C4 -6 10 -5 9 1 C8 6 2 7 0 0Z"}
          fill={i % 2 ? tone.mid : tone.deep}
          initial={reduce ? { opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1.2 }}
          animate={{ x: s.x, y: s.y + 26, rotate: s.rot * 2, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.5, 1] }}
        />
      ))}
      <motion.circle r="30" fill="none" stroke={tone.light} strokeWidth="3" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} />
    </svg>
  );
}

/**
 * Their age in foil number balloons: a heavy soft-serif digit filled with gold, a rim of shade
 * on one side, a diagonal shine and a few crinkle lines clipped inside the glyph, and a tail.
 */
export function FoilDigit({ digit, foil, className, style }: { digit: string; foil: Palette["foil"]; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const text = { x: 44, y: 98, textAnchor: "middle" as const, fontSize: 104, style: { fontFamily: "var(--font-gift-display), Georgia, serif", fontWeight: 900, fontVariationSettings: '"wght" 900, "SOFT" 100, "opsz" 144' } };
  return (
    <svg viewBox="0 0 88 136" className={className} style={{ overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={foil.light} />
          <stop offset=".3" stopColor={foil.mid} />
          <stop offset=".55" stopColor={foil.deep} />
          <stop offset=".72" stopColor={foil.mid} />
          <stop offset=".9" stopColor={foil.light} />
          <stop offset="1" stopColor={foil.deep} />
        </linearGradient>
        <linearGradient id={`${uid}-x`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={foil.edge} stopOpacity=".55" />
          <stop offset=".22" stopColor={foil.edge} stopOpacity="0" />
          <stop offset=".78" stopColor={foil.edge} stopOpacity="0" />
          <stop offset="1" stopColor={foil.edge} stopOpacity=".6" />
        </linearGradient>
        <linearGradient id={`${uid}-y`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={foil.edge} stopOpacity=".3" />
          <stop offset=".18" stopColor={foil.edge} stopOpacity="0" />
          <stop offset=".84" stopColor={foil.edge} stopOpacity="0" />
          <stop offset="1" stopColor={foil.edge} stopOpacity=".45" />
        </linearGradient>
        <filter id={`${uid}-bl`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <linearGradient id={`${uid}-sh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".4" stopColor="#FFFFFF" stopOpacity=".25" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".55" />
          <stop offset=".6" stopColor="#FFFFFF" stopOpacity=".22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-t`}>
          <text {...text}>{digit}</text>
        </clipPath>
      </defs>
      {/* the tail and the string */}
      <path d="M44 100 L40 110 L48 110 Z" fill={foil.deep} />
      <path d="M44 110 C50 118 39 124 45 132" fill="none" stroke={foil.deep} strokeWidth="1.4" strokeLinecap="round" opacity=".9" />
      <text {...text} fill={`url(#${uid}-f)`} stroke={foil.edge} strokeWidth="2.4" strokeOpacity=".85" paintOrder="stroke" strokeLinejoin="round">
        {digit}
      </text>
      <g clipPath={`url(#${uid}-t)`}>
        {/* shade at the edges, a couple of creases where the foil was folded, and the shine */}
        <rect x="0" y="0" width="88" height="110" fill={`url(#${uid}-x)`} />
        <rect x="0" y="0" width="88" height="110" fill={`url(#${uid}-y)`} />
        <rect x="0" y="0" width="88" height="110" fill={`url(#${uid}-sh)`} />
        <path d="M10 44 C28 50 40 38 62 46 M30 78 C46 70 58 84 78 76" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity=".5" strokeLinecap="round" />
        <path d="M12 48 C30 54 42 42 64 50 M32 82 C48 74 60 88 80 80" fill="none" stroke={foil.edge} strokeWidth="1" strokeOpacity=".45" strokeLinecap="round" />
        <ellipse cx="26" cy="28" rx="9" ry="19" transform="rotate(-18 26 28)" fill="#FFFFFF" opacity=".55" filter={`url(#${uid}-bl)`} />
        <ellipse cx="24" cy="24" rx="4" ry="10" transform="rotate(-18 24 24)" fill="#FFFFFF" opacity=".8" />
      </g>
    </svg>
  );
}

/** Which pennant patterns look like, as SVG patterns keyed by a uid. */
function PennantPatterns({ uid, pennants }: { uid: string; pennants: Palette["pennants"] }) {
  return (
    <defs>
      {pennants.map((p, i) =>
        p.pattern === "dots" ? (
          <pattern key={i} id={`${uid}-p${i}`} width="2.4" height="2.4" patternUnits="userSpaceOnUse">
            <rect width="2.4" height="2.4" fill={p.paper} />
            <circle cx="1.2" cy="1.2" r=".45" fill={p.ink} opacity=".28" />
          </pattern>
        ) : p.pattern === "stripes" ? (
          <pattern key={i} id={`${uid}-p${i}`} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <rect width="2.2" height="2.2" fill={p.paper} />
            <rect width="1" height="2.2" fill={p.ink} opacity=".16" />
          </pattern>
        ) : p.pattern === "gingham" ? (
          <pattern key={i} id={`${uid}-p${i}`} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
            <rect width="2.6" height="2.6" fill={p.paper} />
            <rect width="1.3" height="2.6" fill={p.ink} opacity=".12" />
            <rect width="2.6" height="1.3" fill={p.ink} opacity=".12" />
          </pattern>
        ) : (
          <pattern key={i} id={`${uid}-p${i}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill={p.paper} />
          </pattern>
        ),
      )}
    </defs>
  );
}

/** A point on the slack string, and its lean, for the flag at `t` of the way along. */
function alongString(t: number, width: number, sag: number) {
  // A quadratic from (0,0) to (width,0) through a control point below the middle.
  const x = width * t;
  const y = 2 * (1 - t) * t * sag;
  const dy = 2 * sag * (1 - 2 * t);
  const angle = (Math.atan2(dy, width) * 180) / Math.PI;
  return { x, y, angle };
}

/**
 * A line of pennants with a letter on each, sagging between two pins. Long words wrap onto a
 * second line rather than shrink the flags below what a thumb can read.
 */
export function Bunting({ rows, pennants, string: rope, seed, className, style }: { rows: string[]; pennants: Palette["pennants"]; string: string; seed: number; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const rng = mulberry32(seed);
  const rowHeight = 16;
  const width = 100;
  return (
    <svg viewBox={`-2 -2 ${width + 4} ${rows.length * rowHeight + 2}`} className={className} style={{ overflow: "visible", ...style }} aria-hidden="true">
      <PennantPatterns uid={uid} pennants={pennants} />
      {rows.map((row, r) => {
        const chars = [...row];
        const n = chars.length;
        const flagW = Math.min(7.6, (width - 6) / Math.max(n, 1));
        const sag = 3.5 + n * 0.16;
        const y0 = r * rowHeight;
        return (
          <g key={r} transform={`translate(0 ${y0})`}>
            <path d={`M0 0 Q${width / 2} ${sag * 2} ${width} 0`} fill="none" stroke={rope} strokeWidth=".55" strokeLinecap="round" />
            {chars.map((ch, i) => {
              const pt = alongString((i + 0.5) / n, width, sag);
              const look = pennants[(i + r) % pennants.length];
              const tilt = pt.angle * 0.9 + (rng() - 0.5) * 6;
              const h = flagW * 1.42;
              if (ch.trim() === "") {
                // A space on the line gets a small heart on the string instead of a flag.
                return <path key={i} d="M0 3.2 C-1.3 1.6 -3 .6 -3 -1 C-3 -2.4 -1.8 -3 -1 -3 C-.4 -3 .1 -2.7 0 -2.2 C-.1 -2.7 .4 -3 1 -3 C1.8 -3 3 -2.4 3 -1 C3 .6 1.3 1.6 0 3.2Z" transform={`translate(${pt.x.toFixed(2)} ${(pt.y + 2.6).toFixed(2)}) scale(.9)`} fill={look.paper === "#FFFDF8" || look.paper === "#FFFAF0" || look.paper === "#FBF6EC" || look.paper === "#FFFDF9" ? pennants[1].paper : look.paper} stroke={rope} strokeWidth=".3" />;
              }
              return (
                <g key={i} transform={`translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)}) rotate(${tilt.toFixed(1)})`}>
                  <path d={`M${-flagW / 2} 0 L${flagW / 2} 0 L0 ${h} Z`} fill={`url(#${uid}-p${(i + r) % pennants.length})`} stroke={look.ink} strokeOpacity=".35" strokeWidth=".36" strokeLinejoin="round" />
                  <path d={`M${-flagW / 2} 0 L${flagW / 2} 0`} stroke={rope} strokeWidth=".6" strokeLinecap="round" />
                  <text x="0" y={h * 0.55} textAnchor="middle" fontSize={flagW * 0.8} fontWeight="700" fill={look.ink} style={{ fontFamily: POSTER_FONT }}>
                    {ch.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** A wooden clothes-peg, for the polaroids hung along the letter. */
export function Peg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 44" className={className} aria-hidden="true">
      <path d="M6 2h8l1 18-1 22H6L5 20Z" fill="#D9B98C" stroke="#A98354" strokeWidth="1" strokeLinejoin="round" />
      <path d="M10 2v40" stroke="#A98354" strokeWidth="1" opacity=".55" />
      <rect x="4" y="15" width="12" height="4" rx="1" fill="#8A8F94" />
    </svg>
  );
}

/** The wall's print: small hand-drawn stars and dots, faint, repeated. */
export function WallPrint({ color, className }: { color: string; className?: string }) {
  const uid = safeId(useId());
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={uid} width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <path d="M20 14l1.8 4.6 4.9.4-3.7 3.2 1.1 4.8L20 24.4 15.9 27l1.1-4.8-3.7-3.2 4.9-.4Z" fill={color} />
          <circle cx="78" cy="40" r="2.2" fill={color} />
          <path d="M96 84l1.4 3.6 3.8.3-2.9 2.5.9 3.7-3.2-2-3.2 2 .9-3.7-2.9-2.5 3.8-.3Z" fill={color} />
          <circle cx="42" cy="96" r="1.8" fill={color} />
          <path d="M58 60c3-3 6 0 8-3" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${uid})`} />
    </svg>
  );
}
