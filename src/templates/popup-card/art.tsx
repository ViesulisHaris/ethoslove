"use client";

/**
 * Cut paper. Every piece of the card is drawn the way a paper-craft card is made: a flat colour,
 * the white core of the sheet showing at every cut, a faint pencil line where the knife went,
 * and grain over the lot. The cake, its candles and flames, the balloons on their strings, the
 * pennant arch, the gift box, and the lettering on the front are all here.
 */
import { useId } from "react";
import { motion } from "motion/react";
import type { AmbienceKind } from "../_shared/Ambience";
import { POSTER_FONT } from "../_shared/cover-kit";
import { mulberry32 } from "../_shared/random";

export type ThemeId = "vanilla" | "midnight" | "kraft" | "cherry";

export type Theme = {
  dark: boolean;
  /** The table the card sits on. */
  room: string;
  /** The card stock, outside; the paper inside. */
  stock: string;
  stockDeep: string;
  inside: string;
  insideInk: string;
  ink: string;
  accent: string;
  /** Papers for the balloons and pennants, in the order they are dealt. */
  papers: string[];
  cake: { tiers: [string, string, string]; icing: string; candle: string; stripe: string };
  gift: { box: string; ribbon: string };
  sheet: string;
  sheetInk: string;
  kraft: string;
  confetti: string[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
};

export const THEMES: Record<ThemeId, Theme> = {
  vanilla: {
    dark: false,
    room: "radial-gradient(70% 55% at 50% 30%, rgba(255,255,255,.55), transparent 70%), linear-gradient(180deg, #EFE4D6 0%, #E2D2BE 100%)",
    stock: "#F7EFE2",
    stockDeep: "#E4D6C1",
    inside: "#FFFDF8",
    insideInk: "#3E2E2C",
    ink: "#4A3A38",
    accent: "#D9667C",
    papers: ["#F4C6C8", "#F6DFA4", "#CFE6D6", "#CFE0F2", "#DCD0F0", "#FFFFFF"],
    cake: { tiers: ["#F5D9D2", "#F1CCC3", "#EDBFB4"], icing: "#FFFDF8", candle: "#FFF8EE", stripe: "#E88FA2" },
    gift: { box: "#CFE0F2", ribbon: "#D9667C" },
    sheet: "#FFFDF8",
    sheetInk: "#3A2A2C",
    kraft: "#E7CFAE",
    confetti: ["#F4C6C8", "#F6DFA4", "#CFE6D6", "#CFE0F2", "#FFFFFF"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 10 }],
  },
  midnight: {
    dark: true,
    room: "radial-gradient(70% 55% at 50% 25%, rgba(120,140,190,.28), transparent 70%), linear-gradient(180deg, #202C48 0%, #121A2E 100%)",
    stock: "#26365A",
    stockDeep: "#17223C",
    inside: "#F7F2E8",
    insideInk: "#2A2320",
    ink: "#F3EEE4",
    accent: "#E6B85C",
    papers: ["#E8C36A", "#F7F2E8", "#D98A97", "#7FB8B0", "#B9A6E0", "#F1DDA6"],
    cake: { tiers: ["#F7F2E8", "#EFE5D2", "#E6D8BE"], icing: "#26365A", candle: "#F7F2E8", stripe: "#E8C36A" },
    gift: { box: "#E8C36A", ribbon: "#26365A" },
    sheet: "#FBF6EC",
    sheetInk: "#2A2320",
    kraft: "#D6B98C",
    confetti: ["#E8C36A", "#F7F2E8", "#D98A97", "#7FB8B0"],
    ambience: [
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 16 },
      { kind: "bokeh", colors: ["#E8C36A", "#FFFFFF"], count: 5 },
    ],
  },
  kraft: {
    dark: false,
    room: "radial-gradient(70% 55% at 50% 30%, rgba(255,255,255,.35), transparent 70%), linear-gradient(180deg, #E9DCC6 0%, #D6C3A6 100%)",
    stock: "#C9A574",
    stockDeep: "#A8834F",
    inside: "#FBF6EC",
    insideInk: "#3B2C1E",
    ink: "#3B2C1E",
    accent: "#C8433A",
    papers: ["#D9463F", "#FFFFFF", "#F4E4C8", "#3F6B4F", "#E8B15A", "#F6F0E4"],
    cake: { tiers: ["#FBF6EC", "#F4E4C8", "#EDD6B1"], icing: "#D9463F", candle: "#FFFFFF", stripe: "#D9463F" },
    gift: { box: "#D9463F", ribbon: "#FBF6EC" },
    sheet: "#FBF6EC",
    sheetInk: "#3B2C1E",
    kraft: "#E3CFAE",
    confetti: ["#D9463F", "#FFFFFF", "#E8B15A", "#3F6B4F"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 10 }],
  },
  cherry: {
    dark: false,
    room: "radial-gradient(70% 55% at 50% 30%, rgba(255,255,255,.5), transparent 70%), linear-gradient(180deg, #F6DEE3 0%, #EEC6D0 100%)",
    stock: "#F3C9D3",
    stockDeep: "#DCA3B2",
    inside: "#FFFBFC",
    insideInk: "#4A2230",
    ink: "#4A2230",
    accent: "#D63C4F",
    papers: ["#D63C4F", "#FFFFFF", "#F6A8B8", "#F6DFA4", "#F9E1E6", "#B23A4A"],
    cake: { tiers: ["#FFFBFC", "#FBE9ED", "#F6D5DC"], icing: "#D63C4F", candle: "#FFFFFF", stripe: "#D63C4F" },
    gift: { box: "#FFFFFF", ribbon: "#D63C4F" },
    sheet: "#FFFBFC",
    sheetInk: "#4A2230",
    kraft: "#EBCFB8",
    confetti: ["#D63C4F", "#F6A8B8", "#FFFFFF", "#F6DFA4"],
    ambience: [
      { kind: "hearts", colors: ["#F6A8B8", "#D63C4F"], count: 6 },
      { kind: "sparkles", colors: ["#FFFFFF"], count: 10 },
    ],
  },
};

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

export const CARD_KEYFRAMES = `
.pc-flame{transform-box:fill-box;transform-origin:50% 100%;animation:pc-flame .9s ease-in-out infinite alternate}
@keyframes pc-flame{from{scale:1 1;rotate:-3deg}to{scale:.94 1.06;rotate:3deg}}
.pc-drift{animation:pc-drift 5.5s ease-in-out infinite alternate}
@keyframes pc-drift{from{translate:0 0;rotate:-1.5deg}to{translate:0 -3px;rotate:1.5deg}}
.pc-smoke{transform-box:fill-box;transform-origin:50% 50%;animation:pc-smoke 1.6s ease-out forwards}
@keyframes pc-smoke{from{opacity:.55;translate:0 0;scale:.6}to{opacity:0;translate:4px -34px;scale:1.6}}
@media (prefers-reduced-motion: reduce){.pc-flame,.pc-drift{animation:none}}
`;

/** A shape cut from a sheet: colour, the white core at the cut, and the pencil line the knife followed. */
export function Cut({ d, fill, ink, white = 1.8, line = 0.35, transform }: { d: string; fill: string; ink: string; white?: number; line?: number; transform?: string }) {
  return (
    <g transform={transform}>
      <path d={d} fill={fill} stroke="#FFFFFF" strokeWidth={white} strokeLinejoin="round" paintOrder="stroke" />
      <path d={d} fill="none" stroke={ink} strokeOpacity={line} strokeWidth=".7" strokeLinejoin="round" />
    </g>
  );
}

/** Paper grain over an area, multiplied. */
export function Grain({ x, y, width, height, seed, opacity = 0.18 }: { x: number; y: number; width: number; height: number; seed: number; opacity?: number }) {
  const uid = safeId(useId());
  return (
    <>
      <defs>
        <filter id={uid} x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed={seed % 100} />
          <feColorMatrix values="0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .1 0 0 0 .6 0" />
        </filter>
      </defs>
      <rect x={x} y={y} width={width} height={height} filter={`url(#${uid})`} opacity={opacity} style={{ mixBlendMode: "multiply" }} />
    </>
  );
}

/** A scalloped edge of icing along a tier's top, as a path across `w` at `y`. */
function scallops(x0: number, y: number, w: number, n: number, r: number): string {
  const step = w / n;
  let d = `M${x0} ${y}`;
  for (let i = 0; i < n; i++) d += ` A${r} ${r} 0 0 1 ${(x0 + step * (i + 1)).toFixed(2)} ${y}`;
  return d;
}

/**
 * The cake: three tiers of cut paper with icing scalloped over each edge, candles on top, and a
 * topper on a stick with their age. The candles are buttons the recipient lights, so the flames
 * are drawn by the template and this only leaves room for them.
 */
export function PaperCake({ theme, candles, topper, lit, out, onCandle, lightLabel, seed }: { theme: Theme; candles: number; topper: string[]; lit: boolean[]; out: boolean; onCandle?: (i: number) => void; lightLabel: string; seed: number }) {
  const c = theme.cake;
  const ink = theme.ink;
  const tiers = [
    { x: 8, y: 92, w: 104, h: 26 },
    { x: 20, y: 68, w: 80, h: 26 },
    { x: 31, y: 46, w: 58, h: 24 },
  ];
  const spread = Math.min(44, candles * 11);
  const cx = (i: number) => 60 + (candles === 1 ? 0 : (i / (candles - 1) - 0.5) * spread);
  return (
    <svg viewBox="0 0 120 130" className="h-full w-full" style={{ overflow: "visible" }} aria-hidden="true">
      {/* the plate */}
      <Cut d="M4 118 h112 a4 4 0 0 1 0 8 h-112 a4 4 0 0 1 0 -8 Z" fill={theme.inside} ink={ink} />
      {tiers.map((t, i) => (
        <g key={i}>
          <Cut d={`M${t.x} ${t.y} h${t.w} v${t.h} a3 3 0 0 1 -3 3 h${-(t.w - 6)} a3 3 0 0 1 -3 -3 Z`} fill={c.tiers[i]} ink={ink} />
          {/* a band of pattern on the middle tier, and dots on the bottom one */}
          {i === 1 ? <path d={`M${t.x + 4} ${t.y + 15} h${t.w - 8}`} stroke={theme.accent} strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="3 2.4" strokeLinecap="round" /> : null}
          {i === 0
            ? Array.from({ length: 9 }, (_, k) => <circle key={k} cx={t.x + 10 + k * 10.5} cy={t.y + 16} r="1.6" fill={theme.accent} opacity=".55" />)
            : null}
          {/* icing scalloped over the top edge */}
          <path d={`${scallops(t.x - 2, t.y + 1, t.w + 4, Math.round(t.w / 9), 4.6)} v-5 h${-(t.w + 4)} Z`} fill={c.icing} stroke="#FFFFFF" strokeWidth="1.4" paintOrder="stroke" />
          <path d={scallops(t.x - 2, t.y + 1, t.w + 4, Math.round(t.w / 9), 4.6)} fill="none" stroke={ink} strokeOpacity=".3" strokeWidth=".7" />
        </g>
      ))}
      <Grain x={4} y={40} width={112} height={90} seed={seed} opacity={0.14} />

      {/* the topper: their age cut out and glued to a stick, behind the candles */}
      {topper.length ? (
        <g transform="translate(60 -24)">
          <path d="M0 8 v50" stroke={ink} strokeOpacity=".7" strokeWidth="1.2" />
          {topper.map((d, i) => (
            <text key={i} x={(i - (topper.length - 1) / 2) * 15} y="20" textAnchor="middle" fontSize="24" fontWeight="900" fill={theme.accent} stroke="#FFFFFF" strokeWidth="2.4" paintOrder="stroke" style={{ fontFamily: "var(--font-gift-display), Georgia, serif", fontVariationSettings: '"wght" 900, "SOFT" 100, "opsz" 144' }}>
              {d}
            </text>
          ))}
        </g>
      ) : null}

      {/* the candles */}
      {Array.from({ length: candles }, (_, i) => {
        const x = cx(i);
        return (
          <g key={i}>
            <Cut d={`M${x - 3} 30 h6 v18 h-6 Z`} fill={c.candle} ink={ink} white={1.4} />
            <path d={`M${x - 3} 34 h6 M${x - 3} 40 h6 M${x - 3} 46 h6`} stroke={c.stripe} strokeWidth="1.8" strokeOpacity=".8" />
            <path d={`M${x} 30 v-4`} stroke={ink} strokeOpacity=".6" strokeWidth=".8" />
            {out && lit[i] ? <ellipse className="pc-smoke" cx={x} cy={22} rx="3" ry="5" fill={ink} opacity=".35" /> : null}
            {lit[i] && !out ? <PaperFlame x={x} y={26} phase={i} /> : null}
            {onCandle ? (
              <rect x={x - 9} y={4} width="18" height="48" fill="transparent" role="button" tabIndex={0} aria-label={`${lightLabel} ${i + 1}`} data-candle={i} onClick={() => onCandle(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? onCandle(i) : undefined)} style={{ cursor: "pointer", outline: "none" }} />
            ) : null}
          </g>
        );
      })}

    </svg>
  );
}

/** A paper flame: a teardrop of orange with a yellow heart, and a glow behind it. */
export function PaperFlame({ x, y, phase }: { x: number; y: number; phase: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <circle cx="0" cy="-3" r="7" fill="#FFB347" opacity=".18" />
        <g className="pc-flame" style={{ animationDelay: `${-phase * 0.23}s` }}>
          <path d="M0 -14 C5 -8 6 -3 6 0 C6 4 3 7 0 7 C-3 7 -6 4 -6 0 C-6 -3 -5 -8 0 -14 Z" fill="#FF9A3D" stroke="#FFFFFF" strokeWidth="1.2" paintOrder="stroke" />
          <path d="M0 -7 C2.5 -4 3 -2 3 0 C3 2.5 1.6 4 0 4 C-1.6 4 -3 2.5 -3 0 C-3 -2 -2.5 -4 0 -7 Z" fill="#FFE27A" />
        </g>
      </motion.g>
    </g>
  );
}

/** A balloon cut from paper on a string, with a white edge and a paper highlight glued on. */
export function PaperBalloon({ color, ink, seed, className }: { color: string; ink: string; seed: number; className?: string }) {
  const rng = mulberry32(seed);
  const lean = (rng() - 0.5) * 10;
  return (
    <svg viewBox="-30 -36 60 120" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <path d={`M0 30 C${4 + lean * 0.2} 44 ${-5} 56 ${lean * 0.3} 70 C${6} 80 ${-3} 84 ${2} 82`} fill="none" stroke={ink} strokeOpacity=".6" strokeWidth="1" strokeLinecap="round" />
      <Cut d="M0 -34 C16 -34 26 -22 26 -6 C26 10 12 22 0 30 C-12 22 -26 10 -26 -6 C-26 -22 -16 -34 0 -34 Z" fill={color} ink={ink} />
      <path d="M-11 -18 C-9 -24 -4 -27 0 -26" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <Cut d="M-3 29 L0 34 L3 29 Z" fill={color} ink={ink} white={1} />
    </svg>
  );
}

/** Pennants on a slack string with a letter each, cut from the theme's papers. */
export function PennantArch({ text, theme, seed, className }: { text: string; theme: Theme; seed: number; className?: string }) {
  const chars = [...text.trim().toUpperCase()];
  const n = Math.max(1, chars.length);
  const width = 200;
  const flagW = Math.min(16, (width - 10) / n);
  const sag = 10 + n * 0.5;
  const rng = mulberry32(seed);
  return (
    <svg viewBox="-4 -4 208 44" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <path d={`M0 0 Q${width / 2} ${sag * 2} ${width} 0`} fill="none" stroke={theme.ink} strokeOpacity=".7" strokeWidth="1" strokeLinecap="round" />
      {chars.map((ch, i) => {
        if (ch.trim() === "") return null;
        const t = (i + 0.5) / n;
        const x = width * t;
        const y = 2 * (1 - t) * t * sag;
        const angle = (Math.atan2(2 * sag * (1 - 2 * t), width) * 180) / Math.PI;
        const paper = theme.papers[i % theme.papers.length];
        const h = flagW * 1.35;
        const tilt = angle * 0.9 + (rng() - 0.5) * 5;
        const inkOn = paper === "#FFFFFF" || paper === "#F7F2E8" || paper === "#F4E4C8" || paper === "#F6F0E4" || paper === "#F9E1E6" || paper === "#F1DDA6" || paper === "#F6DFA4" ? theme.insideInk : "#FFFFFF";
        return (
          <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tilt.toFixed(1)})`}>
            <Cut d={`M${-flagW / 2} 0 L${flagW / 2} 0 L0 ${h} Z`} fill={paper} ink={theme.ink} white={1.4} />
            <text x="0" y={h * 0.56} textAnchor="middle" fontSize={flagW * 0.72} fontWeight="700" fill={inkOn} style={{ fontFamily: POSTER_FONT }}>
              {ch}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A small wrapped present with a bow, standing at the front. */
export function GiftBox({ theme, className }: { theme: Theme; className?: string }) {
  const g = theme.gift;
  return (
    <svg viewBox="0 0 60 60" className={className} style={{ overflow: "visible" }} aria-hidden="true">
      <Cut d="M6 24 h48 v32 a3 3 0 0 1 -3 3 h-42 a3 3 0 0 1 -3 -3 Z" fill={g.box} ink={theme.ink} />
      <Cut d="M3 17 h54 v9 h-54 Z" fill={g.box} ink={theme.ink} />
      <path d="M30 17 v42" stroke={g.ribbon} strokeWidth="6" />
      <path d="M3 21.5 h54" stroke={g.ribbon} strokeWidth="6" />
      <Cut d="M30 16 C22 4 10 6 14 14 C17 19 26 18 30 16 Z M30 16 C38 4 50 6 46 14 C43 19 34 18 30 16 Z" fill={g.ribbon} ink={theme.ink} white={1.2} />
      <circle cx="30" cy="16" r="3" fill={g.ribbon} stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}

/** Confetti lying flat on the base, as little paper dots and strips. */
export function ConfettiDots({ colors, seed, count = 26 }: { colors: string[]; seed: number; count?: number }) {
  const rng = mulberry32(seed);
  const dots = Array.from({ length: count }, (_, i) => ({ x: 4 + rng() * 92, y: 6 + rng() * 88, r: 1 + rng() * 1.4, rot: rng() * 180, strip: i % 4 === 0, color: colors[i % colors.length] }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {dots.map((d, i) =>
        d.strip ? (
          <rect key={i} x={d.x} y={d.y} width="3.4" height="1.2" fill={d.color} transform={`rotate(${d.rot} ${d.x} ${d.y})`} opacity=".9" />
        ) : (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity=".9" />
        ),
      )}
    </svg>
  );
}

/**
 * The front of the card: a cut-paper cake in the middle, their name on a paper label under it,
 * and a scatter of paper confetti glued around.
 */
export function CoverArt({ theme, name, forLabel, seed }: { theme: Theme; name: string; forLabel: string; seed: number }) {
  const rng = mulberry32(seed + 5);
  const bits = Array.from({ length: 18 }, (_, i) => ({ x: 6 + rng() * 88, y: 4 + rng() * 40, rot: rng() * 180, color: theme.papers[i % theme.papers.length], strip: i % 3 === 0 }));
  return (
    <svg viewBox="0 0 100 108" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect x="4" y="4" width="92" height="100" rx="2" fill="none" stroke={theme.ink} strokeOpacity=".22" strokeWidth=".5" />
      <rect x="6" y="6" width="88" height="96" rx="1.5" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth=".5" />
      {bits.map((b, i) => (b.strip ? <rect key={i} x={b.x} y={b.y} width="3.2" height="1.3" fill={b.color} transform={`rotate(${b.rot} ${b.x} ${b.y})`} /> : <circle key={i} cx={b.x} cy={b.y} r="1.3" fill={b.color} />))}
      {/* a small cake, cut and glued on */}
      <g transform="translate(50 44)">
        <Cut d="M-26 18 h52 a2 2 0 0 1 0 4 h-52 a2 2 0 0 1 0 -4 Z" fill={theme.inside} ink={theme.ink} white={1.2} />
        {[
          { x: -22, y: 4, w: 44, h: 14, c: theme.cake.tiers[2] },
          { x: -16, y: -8, w: 32, h: 12, c: theme.cake.tiers[1] },
          { x: -10, y: -18, w: 20, h: 10, c: theme.cake.tiers[0] },
        ].map((tier, i) => (
          <g key={i}>
            <Cut d={`M${tier.x} ${tier.y} h${tier.w} v${tier.h} a1.5 1.5 0 0 1 -1.5 1.5 h${-(tier.w - 3)} a1.5 1.5 0 0 1 -1.5 -1.5 Z`} fill={tier.c} ink={theme.ink} white={1.2} />
            <path d={`M${tier.x - 1} ${tier.y + 1} ${"a2 2 0 0 1 4 0 ".repeat(Math.round(tier.w / 4)).trim()}`} fill={theme.cake.icing} stroke="#FFFFFF" strokeWidth=".9" paintOrder="stroke" />
          </g>
        ))}
        <path d="M-18 12 h36" stroke={theme.accent} strokeOpacity=".55" strokeWidth="1.2" strokeDasharray="2 1.6" strokeLinecap="round" />
        <Cut d="M-1.6 -28 h3.2 v10 h-3.2 Z" fill={theme.cake.candle} ink={theme.ink} white={1} />
        <path d="M-1.6 -25 h3.2 M-1.6 -22 h3.2" stroke={theme.cake.stripe} strokeWidth="1" />
        <path d="M0 -35 C2.4 -32 3 -30.5 3 -29 C3 -27.4 1.6 -26.2 0 -26.2 C-1.6 -26.2 -3 -27.4 -3 -29 C-3 -30.5 -2.4 -32 0 -35 Z" fill="#FF9A3D" stroke="#FFFFFF" strokeWidth="1" paintOrder="stroke" />
        <path d="M0 -31 C1 -29.8 1.2 -29.2 1.2 -28.6 C1.2 -27.8 .6 -27.4 0 -27.4 C-.6 -27.4 -1.2 -27.8 -1.2 -28.6 C-1.2 -29.2 -1 -29.8 0 -31 Z" fill="#FFE27A" />
      </g>
      {/* the label */}
      <g transform="translate(50 82)">
        <Cut d="M-34 -10 h68 a3 3 0 0 1 3 3 v14 a3 3 0 0 1 -3 3 h-68 a3 3 0 0 1 -3 -3 v-14 a3 3 0 0 1 3 -3 Z" fill={theme.inside} ink={theme.ink} />
        <text x="0" y="-2.4" textAnchor="middle" fontSize="3.6" letterSpacing=".9" fill={theme.insideInk} opacity=".65" style={{ fontFamily: POSTER_FONT }}>
          {forLabel.toUpperCase()}
        </text>
        <text x="0" y="7" textAnchor="middle" fontSize={name.length > 12 ? 6.4 : 8.4} fill={theme.accent} style={{ fontFamily: "var(--font-script), var(--gift-font-hand), cursive" }}>
          {name}
        </text>
      </g>
    </svg>
  );
}

/** Faint ruled lines on the inside of the lid, where the words go. */
export function Ruled({ color, className }: { color: string; className?: string }) {
  const uid = safeId(useId());
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={uid} width="10" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 27.5 h10" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${uid})`} />
    </svg>
  );
}
