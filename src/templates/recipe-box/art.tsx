"use client";

import { mix } from "../_shared/theme";
import { tipPoint } from "./pour";
import type { ClothId, CounterId } from "./schema";

/**
 * Her kitchen, drawn from scratch: a tiled wall, a wooden counter with a gingham cloth on it, a
 * recipe card leaning against the tiles, a mixing bowl and the jar you tip. Everything lives in
 * one 100 × 158 grid so the template can put its handwriting on the card in the same units.
 */

export const SCENE = {
  w: 100,
  h: 162,
  /** The card leans against the tiles; its bottom is hidden behind the counter. */
  card: { x: 8, y: 16, w: 84, h: 76, rot: -1.2, band: 13 },
  /** Where the ingredients get written, inside the card. */
  lines: { top: 42, bottom: 88, left: 15, right: 63 },
  bowl: { cx: 42, rim: 100, rx: 26, ry: 7, floor: 128, empty: 126.5, full: 101.5 },
  /** The jar stands on the counter beside the bowl and tips about its bottom right corner. */
  jar: { pivot: { x: 85, y: 80 }, w: 15, h: 34, mouth: { x: -14, y: -33 } },
  counter: 88,
  /** Where the prompt and the buttons sit, under everything. */
  hands: 127,
} as const;

/**
 * How far past the 100-unit scene the kitchen keeps going. The svg overflows on purpose: the
 * scene is sized off `--k` so it stays whole on a short phone, which leaves a laptop far wider
 * than 100 units. The wall, the counter and the cloth run out to here so there is no seam.
 * 300 covers past 7:1, which is wider than any phone or laptop.
 */
const WIDE = 300;

/** Grout lines every 20 units, all the way out. */
const TILE_COLUMNS = Array.from({ length: Math.round((SCENE.w + WIDE * 2) / 20) + 1 }, (_, i) => -WIDE + i * 20);

/** The cloth's front edge: the hand-laid wave over the scene, flat out to the sides. */
const CLOTH_EDGE = `M${-WIDE},118 L-2,120 Q26,114 52,118 T102,115 L${SCENE.w + WIDE},117`;
const CLOTH = `${CLOTH_EDGE} L${SCENE.w + WIDE},212 L${-WIDE},212 Z`;

export type Palette = {
  wall: string;
  tile: string;
  wood: string;
  woodDeep: string;
  grain: string;
  edge: string;
  card: string;
  cardEdge: string;
  rule: string;
  ink: string;
  soft: string;
  bowl: string;
  bowlShade: string;
  shadow: string;
};

export const PALETTES: Record<CounterId, Palette> = {
  oak: {
    wall: "#F8EEE1", tile: "#EEDFC9", wood: "#C99A5B", woodDeep: "#AC7C42", grain: "#A87742",
    edge: "#B98A4C", card: "#FFFAF0", cardEdge: "#E8D8BC", rule: "#DCC9A8", ink: "#4A382C",
    soft: "#8C7359", bowl: "#FFFCF5", bowlShade: "#EDDFC9", shadow: "rgba(76,48,24,0.20)",
  },
  walnut: {
    wall: "#F3E7D7", tile: "#E6D4BD", wood: "#8B5A3B", woodDeep: "#6B4129", grain: "#5E3922",
    edge: "#79492D", card: "#FFF8EC", cardEdge: "#E4D2B4", rule: "#D9C4A0", ink: "#40302A",
    soft: "#87705C", bowl: "#FFFBF2", bowlShade: "#EADCC4", shadow: "rgba(48,28,14,0.26)",
  },
  marble: {
    wall: "#F5F2EA", tile: "#E7E2D6", wood: "#E9E4DA", woodDeep: "#D3CCBE", grain: "#C6BFB0",
    edge: "#D8D1C3", card: "#FFFBF3", cardEdge: "#E5DCC8", rule: "#DACEB6", ink: "#42382F",
    soft: "#8B8172", bowl: "#FFFDF8", bowlShade: "#E9E2D3", shadow: "rgba(70,60,44,0.16)",
  },
  sage: {
    wall: "#F2F0E5", tile: "#E4E4D4", wood: "#9FB499", woodDeep: "#7F9578", grain: "#7A9072",
    edge: "#8BA184", card: "#FFFCF2", cardEdge: "#E4DCC2", rule: "#D6CDB0", ink: "#3C4238",
    soft: "#7C8674", bowl: "#FFFDF6", bowlShade: "#E7E4D2", shadow: "rgba(46,60,40,0.18)",
  },
};

export const CLOTHS: Record<ClothId, { a: string; deep: string; on: string }> = {
  tomato: { a: "#CD4B3C", deep: "#A3372B", on: "#FFF6EE" },
  butter: { a: "#E3AC3F", deep: "#BC8724", on: "#4A3A1C" },
  rosemary: { a: "#6E8B5A", deep: "#4B6640", on: "#F5F8EE" },
};

/** What each jar holds, in order: butter, tomato, rosemary, cocoa, sugar, plum. */
export const INGREDIENT_COLORS = ["#F0C24B", "#C9483A", "#6E8B5A", "#9A6B44", "#EFDFBC", "#9A6E8E"];

export function ingredientColor(index: number): string {
  return INGREDIENT_COLORS[index % INGREDIENT_COLORS.length];
}

/** What's in the bowl once those ingredients are in: everything so far, folded into batter. */
export function bowlColor(count: number): string {
  if (count <= 0) return "#EFE2C6";
  let out = ingredientColor(0);
  for (let i = 1; i < count; i++) out = mix(out, ingredientColor(i), 1 / (i + 1));
  return mix(out, "#F6E7C8", 0.42);
}

/**
 * The pieces the frame loop moves. They're found by name inside the scene rather than handed
 * around as refs, so the drawing stays a drawing and only the loop touches the DOM.
 */
export type ScenePart =
  | "jar"
  | "jar-fill"
  | "stream"
  | "stream-path"
  | "stream-grains"
  | "fill"
  | "swirl"
  | "splash"
  | "spoon";

export function scenePart<T extends Element>(root: HTMLElement | null, name: ScenePart): T | null {
  return root ? root.querySelector<T>(`[data-rb="${name}"]`) : null;
}

export const KEYFRAMES = `
.rb-pour{animation:rb-pour .5s linear infinite}
@keyframes rb-pour{to{stroke-dashoffset:-8}}
.rb-splash{transform-box:fill-box;transform-origin:center;animation:rb-splash 1.1s ease-out infinite}
@keyframes rb-splash{0%{transform:scale(.3);opacity:.75}100%{transform:scale(1.5);opacity:0}}
@media (prefers-reduced-motion: reduce){.rb-pour,.rb-splash{animation:none}}
`;

type KitchenProps = {
  p: Palette;
  cloth: { a: string; deep: string; on: string };
  /** Colour of what's in the jar right now. */
  jarColor: string;
  /** Colour of what's already in the bowl. */
  batter: string;
  /** Rules under each written ingredient, in scene units. */
  rules: number[];
  /** First paint only; after that the frame loop moves these itself. */
  tip: number;
  jarFill: number;
  fill: number;
  pouring: boolean;
  /** The jar's little label: which one of how many. */
  step: string;
  showJar: boolean;
  showSpoon: boolean;
  reduce: boolean;
};

function surfaceY(fill: number): number {
  const { empty, full } = SCENE.bowl;
  return empty + (full - empty) * Math.min(1, Math.max(0, fill));
}

/** The falling stream, from the lip of the tipped jar down to the rim of the bowl. */
export function streamPath(tip: number): string {
  const mouth = tipPoint(SCENE.jar.pivot, SCENE.jar.mouth, tip);
  const landing = SCENE.bowl.rim - 2;
  return `M${mouth.x.toFixed(2)},${mouth.y.toFixed(2)} Q${(mouth.x - 1.6).toFixed(2)},${((mouth.y + landing) / 2).toFixed(2)} ${(mouth.x - 2.6).toFixed(2)},${landing.toFixed(2)}`;
}

export function Kitchen({ p, cloth, jarColor, batter, rules, tip, jarFill, fill, pouring, step, showJar, showSpoon, reduce }: KitchenProps) {
  const { card, bowl, jar } = SCENE;
  const jarX = jar.pivot.x - jar.w;
  const jarY = jar.pivot.y - jar.h;
  const fillH = jar.h * Math.min(1, Math.max(0, jarFill));
  // Drawn once from the angle it is at; after that the frame loop keeps it honest.
  const stream = streamPath(tip);

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} width="100%" height="100%" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="rb-light" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <pattern id="rb-gingham" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-1.5)">
          <rect width="7" height="7" fill="#FFFCF4" />
          <rect width="3.5" height="7" fill={cloth.a} opacity="0.38" />
          <rect width="7" height="3.5" fill={cloth.a} opacity="0.38" />
        </pattern>
        <clipPath id="rb-bowl-in">
          <path d={`M${bowl.cx - bowl.rx + 1.6},${bowl.rim} C${bowl.cx - bowl.rx + 1.6},${bowl.rim + 17} ${bowl.cx - 15},${bowl.floor - 2} ${bowl.cx},${bowl.floor - 2} C${bowl.cx + 15},${bowl.floor - 2} ${bowl.cx + bowl.rx - 1.6},${bowl.rim + 17} ${bowl.cx + bowl.rx - 1.6},${bowl.rim} A${bowl.rx - 1.6},${bowl.ry - 0.9} 0 0 0 ${bowl.cx - bowl.rx + 1.6},${bowl.rim} Z`} />
        </clipPath>
        {/* one soft shadow, so the card leans on the tiles and the jar floats in front of it */}
        <filter id="rb-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <clipPath id="rb-jar-in">
          <rect x={jarX + 0.9} y={jarY + 0.9} width={jar.w - 1.8} height={jar.h - 1.8} rx="2" />
        </clipPath>
      </defs>

      {/* The tiled wall. It runs a long way past the 100-unit scene because the svg overflows
          on purpose: on a laptop or a landscape phone the box is far narrower than the screen,
          and a wall that stopped at the box would leave two seams down the sides. */}
      <rect x={-WIDE} y={-40} width={SCENE.w + WIDE * 2} height={SCENE.counter + 40} fill={p.wall} />
      <g stroke={p.tile} strokeWidth="0.5" opacity="0.8">
        {[0, 18, 36, 54, 72].map((y) => (
          <line key={y} x1={-WIDE} y1={y} x2={SCENE.w + WIDE} y2={y} />
        ))}
        {TILE_COLUMNS.map((x) => (
          <line key={x} x1={x} y1={-40} x2={x} y2={SCENE.counter} />
        ))}
      </g>
      <rect x={-WIDE} y="0" width={SCENE.w + WIDE * 2} height={SCENE.counter} fill="url(#rb-light)" />

      {/* the counter, and the cloth on it */}
      <rect x={-WIDE} y={SCENE.counter} width={SCENE.w + WIDE * 2} height={SCENE.h - SCENE.counter + 40} fill={p.wood} />
      <rect x={-WIDE} y={SCENE.counter} width={SCENE.w + WIDE * 2} height="1.4" fill={p.edge} opacity="0.75" />
      <rect x={-WIDE} y={SCENE.counter + 1.4} width={SCENE.w + WIDE * 2} height="2.4" fill={p.woodDeep} opacity="0.35" />
      <g stroke={p.grain} strokeWidth="0.35" opacity="0.28" fill="none">
        <path d={`M${-WIDE},${SCENE.counter + 7} Q30,${SCENE.counter + 5.6} 58,${SCENE.counter + 7.4} T${SCENE.w + WIDE},${SCENE.counter + 6.4}`} />
        <path d={`M${-WIDE},${SCENE.counter + 16} Q40,${SCENE.counter + 18} ${SCENE.w + WIDE},${SCENE.counter + 15}`} />
        <path d={`M${-WIDE},${SCENE.counter + 52} Q52,${SCENE.counter + 49} ${SCENE.w + WIDE},${SCENE.counter + 53}`} />
      </g>
      <path d={CLOTH} fill="url(#rb-gingham)" />
      <path d={CLOTH_EDGE} fill="none" stroke={cloth.deep} strokeWidth="0.5" opacity="0.35" />

      {/* the card, leaning against the tiles */}
      <g transform={`rotate(${card.rot} ${card.x + card.w / 2} ${card.y + card.h / 2})`}>
        <rect x={card.x + 1} y={card.y + 2.4} width={card.w} height={card.h} rx="2.4" fill={p.shadow} filter="url(#rb-soft)" />
        <rect x={card.x} y={card.y} width={card.w} height={card.h} rx="2.4" fill={p.card} stroke={p.cardEdge} strokeWidth="0.5" />
        <path d={`M${card.x},${card.y + 2.4} a2.4,2.4 0 0 1 2.4,-2.4 h${card.w - 4.8} a2.4,2.4 0 0 1 2.4,2.4 v${card.band - 2.4} h${-card.w} Z`} fill={cloth.a} opacity="0.9" />
        <line x1={card.x} y1={card.y + card.band} x2={card.x + card.w} y2={card.y + card.band} stroke={cloth.deep} strokeWidth="0.4" opacity="0.5" />
        {/* a coffee ring, from a hundred mornings */}
        <g fill="none" stroke="#A9713E">
          <circle cx={card.x + 70} cy={card.y + 20} r="7.6" strokeWidth="1.3" opacity="0.17" />
          <circle cx={card.x + 70} cy={card.y + 20} r="6.2" strokeWidth="0.5" opacity="0.12" />
        </g>
        <line x1={card.x + 6.5} y1={card.y + card.band + 3} x2={card.x + 6.5} y2={card.y + card.h - 3} stroke="#D4867A" strokeWidth="0.45" opacity="0.5" />
        <g stroke={p.rule} strokeWidth="0.4" opacity="0.75">
          {rules.map((y, i) => (
            <line key={i} x1={card.x + 6.5} y1={y} x2={card.x + card.w - 7} y2={y} />
          ))}
        </g>
        {/* a dusting of flour */}
        <g fill={p.soft} opacity="0.2">
          <circle cx={card.x + 12} cy={card.y + card.h - 6} r="0.7" />
          <circle cx={card.x + 17} cy={card.y + card.h - 4} r="0.45" />
          <circle cx={card.x + 63} cy={card.y + card.h - 5} r="0.55" />
        </g>
      </g>

      {/* what falls out of the jar, behind the bowl's rim */}
      <g data-rb="stream" opacity={pouring ? 1 : 0} style={{ transition: "opacity .18s linear" }}>
        <path data-rb="stream-path" d={stream} fill="none" stroke={jarColor} strokeWidth="3.4" strokeLinecap="round" opacity="0.62" />
        <path data-rb="stream-grains" d={stream} fill="none" stroke={mix(jarColor, "#FFFFFF", 0.3)} strokeWidth="2.1" strokeLinecap="round" strokeDasharray="1.6 2.8" className={reduce ? undefined : "rb-pour"} />
      </g>

      {/* the jar */}
      {showJar ? (
        <g data-rb="jar" transform={`rotate(${-tip} ${jar.pivot.x} ${jar.pivot.y})`}>
          <rect x={jarX + 2} y={jarY + 3} width={jar.w} height={jar.h} rx="2.4" fill={p.shadow} opacity="0.8" filter="url(#rb-soft)" />
          <g clipPath="url(#rb-jar-in)">
            <rect data-rb="jar-fill" x={jarX + 0.9} y={jar.pivot.y - 0.9 - fillH} width={jar.w - 1.8} height={fillH} fill={jarColor} />
          </g>
          <rect x={jarX} y={jarY} width={jar.w} height={jar.h} rx="2.4" fill="#FFFFFF" opacity="0.22" />
          <rect x={jarX} y={jarY} width={jar.w} height={jar.h} rx="2.4" fill="none" stroke={p.ink} strokeOpacity="0.28" strokeWidth="0.55" />
          <rect x={jarX + 2.2} y={jarY + 2.4} width="1.8" height={jar.h - 8} rx="0.9" fill="#FFFFFF" opacity="0.5" />
          <rect x={jarX + 1.2} y={jarY - 3.6} width={jar.w - 2.4} height="4" rx="1.2" fill={cloth.a} />
          <rect x={jarX + 1.2} y={jarY - 3.6} width={jar.w - 2.4} height="1.4" rx="0.7" fill="#FFFFFF" opacity="0.25" />
          <g>
            <rect x={jarX + 2} y={jarY + jar.h - 13} width={jar.w - 4} height="7.4" rx="1" fill={p.card} stroke={p.cardEdge} strokeWidth="0.4" />
            <text
              x={jarX + jar.w / 2}
              y={jarY + jar.h - 7.8}
              textAnchor="middle"
              fill={p.soft}
              style={{ fontSize: "3.4px", letterSpacing: "0.2px", fontFamily: "var(--gift-font-body)" }}
            >
              {step}
            </text>
          </g>
        </g>
      ) : null}

      {/* the bowl */}
      <ellipse cx={bowl.cx} cy={bowl.floor + 1} rx={bowl.rx - 6} ry="2.6" fill={p.shadow} />
      <path
        d={`M${bowl.cx - bowl.rx},${bowl.rim} C${bowl.cx - bowl.rx},${bowl.rim + 17} ${bowl.cx - 15},${bowl.floor} ${bowl.cx},${bowl.floor} C${bowl.cx + 15},${bowl.floor} ${bowl.cx + bowl.rx},${bowl.rim + 17} ${bowl.cx + bowl.rx},${bowl.rim} A${bowl.rx},${bowl.ry} 0 0 0 ${bowl.cx - bowl.rx},${bowl.rim} Z`}
        fill={p.bowl}
        opacity="0.78"
      />
      <g clipPath="url(#rb-bowl-in)">
        <rect x={bowl.cx - bowl.rx} y={bowl.rim - 2} width={bowl.rx * 2} height={bowl.floor - bowl.rim + 6} fill={p.bowlShade} opacity="0.35" />
        <g
          data-rb="fill"
          opacity={fill > 0 ? 1 : 0}
          style={{ transition: "opacity .32s linear" }}
          transform={`translate(0 ${surfaceY(fill)})`}
        >
          <rect x={bowl.cx - bowl.rx} y="0" width={bowl.rx * 2} height="34" fill={batter} />
          <ellipse cx={bowl.cx} cy="0" rx={bowl.rx - 1.6} ry={bowl.ry - 1} fill={mix(batter, "#FFFFFF", 0.22)} />
          <g data-rb="swirl" opacity="0.5">
            <path d={`M${bowl.cx - 13},-1.4 a13,3.4 0 0 1 26,0`} fill="none" stroke={mix(batter, "#FFFFFF", 0.5)} strokeWidth="1.1" strokeLinecap="round" />
            <path d={`M${bowl.cx + 9},2.2 a9,2.4 0 0 1 -18,0`} fill="none" stroke={mix(batter, "#000000", 0.12)} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
          </g>
          <g data-rb="splash" opacity="0">
            <ellipse cx={bowl.cx} cy="-0.6" rx="5" ry="1.6" fill="none" stroke={mix(batter, "#FFFFFF", 0.6)} strokeWidth="0.8" className={reduce ? undefined : "rb-splash"} />
          </g>
        </g>
      </g>
      {showSpoon ? (
        <g data-rb="spoon" transform={`rotate(0 ${bowl.cx} ${bowl.rim})`}>
          <g transform={`rotate(28 ${bowl.cx} ${bowl.rim})`}>
            <rect x={bowl.cx - 1.5} y={bowl.rim - 21} width="3" height="26" rx="1.5" fill={p.wood} />
            <rect x={bowl.cx - 1.5} y={bowl.rim - 21} width="1.1" height="26" rx="0.55" fill="#FFFFFF" opacity="0.25" />
            <ellipse cx={bowl.cx} cy={bowl.rim + 7} rx="4.6" ry="5.8" fill={p.wood} />
            <ellipse cx={bowl.cx} cy={bowl.rim + 7} rx="3.2" ry="4.2" fill={p.woodDeep} opacity="0.5" />
          </g>
        </g>
      ) : null}
      <path
        d={`M${bowl.cx - bowl.rx},${bowl.rim} C${bowl.cx - bowl.rx},${bowl.rim + 18} ${bowl.cx - 15},${bowl.floor} ${bowl.cx},${bowl.floor} C${bowl.cx + 15},${bowl.floor} ${bowl.cx + bowl.rx},${bowl.rim + 18} ${bowl.cx + bowl.rx},${bowl.rim}`}
        fill="none"
        stroke={p.ink}
        strokeOpacity="0.22"
        strokeWidth="0.6"
      />
      <path
        d={`M${bowl.cx - bowl.rx + 2},${bowl.rim + 12} C${bowl.cx - bowl.rx + 4},${bowl.rim + 22} ${bowl.cx - 13},${bowl.floor - 2.5} ${bowl.cx},${bowl.floor - 2.5} C${bowl.cx + 13},${bowl.floor - 2.5} ${bowl.cx + bowl.rx - 4},${bowl.rim + 22} ${bowl.cx + bowl.rx - 2},${bowl.rim + 12}`}
        fill="none"
        stroke={cloth.a}
        strokeWidth="2.6"
        opacity="0.75"
        strokeLinecap="round"
      />
      <ellipse cx={bowl.cx} cy={bowl.rim} rx={bowl.rx} ry={bowl.ry} fill="none" stroke={p.bowl} strokeWidth="2.6" />
      <ellipse cx={bowl.cx} cy={bowl.rim} rx={bowl.rx} ry={bowl.ry} fill="none" stroke={p.ink} strokeOpacity="0.22" strokeWidth="0.55" />
      <path d={`M${bowl.cx - bowl.rx + 3},${bowl.rim + 4} C${bowl.cx - bowl.rx + 4.5},${bowl.rim + 14} ${bowl.cx - 14},${bowl.rim + 22} ${bowl.cx - 9},${bowl.rim + 25}`} fill="none" stroke="#FFFFFF" strokeWidth="1.6" opacity="0.45" strokeLinecap="round" />
      <ellipse cx={bowl.cx} cy={bowl.floor} rx="8.5" ry="2.2" fill={p.bowlShade} />

      {/* the spoon waits on the counter until it's needed, with a sprig of rosemary beside it */}
      {showSpoon ? null : (
        <g transform="translate(1 104) rotate(-16) scale(0.92)">
          <ellipse cx="9" cy="3.4" rx="9" ry="1.6" fill={p.shadow} opacity="0.45" />
          <rect x="4" y="-0.6" width="18" height="2.4" rx="1.2" fill={p.wood} />
          <rect x="4" y="-0.6" width="18" height="0.9" rx="0.45" fill="#FFFFFF" opacity="0.28" />
          <ellipse cx="2.6" cy="0.6" rx="3.6" ry="2.8" fill={p.wood} />
          <ellipse cx="2.6" cy="0.6" rx="2.4" ry="1.8" fill={p.woodDeep} opacity="0.45" />
        </g>
      )}
      {/* the box the recipe came out of, cards and all */}
      <g transform="translate(70 92) rotate(-3)">
        <ellipse cx="10" cy="20.4" rx="11" ry="2" fill={p.shadow} opacity="0.5" />
        <g transform="rotate(-6 9 4)">
          <rect x="3" y="-1" width="13" height="12" rx="1" fill={p.card} stroke={p.cardEdge} strokeWidth="0.4" />
          <rect x="3" y="-1" width="13" height="2.6" rx="1" fill={cloth.a} opacity="0.85" />
        </g>
        <g transform="rotate(4 11 4)">
          <rect x="5" y="1" width="13" height="10" rx="1" fill="#FFFDF4" stroke={p.cardEdge} strokeWidth="0.4" />
          <g stroke={p.rule} strokeWidth="0.35" opacity="0.8">
            <line x1="7" y1="5" x2="16" y2="5" />
            <line x1="7" y1="7.4" x2="16" y2="7.4" />
          </g>
        </g>
        <path d="M0,6 h20 a1.6,1.6 0 0 1 1.6,1.6 l-1.2,10.4 a2,2 0 0 1 -2,1.8 h-16.8 a2,2 0 0 1 -2,-1.8 l-1.2,-10.4 A1.6,1.6 0 0 1 0,6 Z" fill={mix(p.woodDeep, "#000000", 0.28)} />
        <path d="M0,6 h20 a1.6,1.6 0 0 1 1.6,1.6 l-0.3,2.2 h-22.6 l-0.3,-2.2 A1.6,1.6 0 0 1 0,6 Z" fill={mix(p.wood, "#FFFFFF", 0.12)} />
        <rect x="6.5" y="12.4" width="7" height="3.2" rx="1.6" fill={mix(p.wood, "#FFFFFF", 0.2)} opacity="0.85" />
      </g>
    </svg>
  );
}
