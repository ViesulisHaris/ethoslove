/**
 * The table: cream linen, a tall taper burning down, a menu card standing between two glasses, and
 * a bottle above them that tips with the phone. All original, drawn as one SVG in the scene's own
 * coordinates (100 wide, 150 tall, the tablecloth starting at y=100) so every piece can be placed
 * by eye and still scale from a small phone to a laptop.
 */

import type { CSSProperties } from "react";
import type { GlassShape, Light, Pour } from "./schema";

export type Palette = {
  /** The room behind the table. */
  night: string;
  linen: string;
  linenShade: string;
  linenDeep: string;
  card: string;
  gold: string;
  goldDeep: string;
  goldPale: string;
  ink: string;
  /** Candlelight. */
  glow: string;
};

export const PALETTES: Record<Light, Palette> = {
  candlelit: {
    night: "radial-gradient(135% 95% at 50% 32%, #3B2531 0%, #22141D 55%, #100A10 100%)",
    linen: "#EFE3CB",
    linenShade: "#E2D2B4",
    linenDeep: "#C9B492",
    card: "#FAF2E0",
    gold: "#D9B45C",
    goldDeep: "#A37B2C",
    goldPale: "#F3E0AC",
    ink: "#42301F",
    glow: "#FFC978",
  },
  golden: {
    night: "radial-gradient(135% 95% at 50% 32%, #6A4227 0%, #3A2118 55%, #190F0A 100%)",
    linen: "#F4E7C8",
    linenShade: "#E8D5AE",
    linenDeep: "#CFB68C",
    card: "#FDF5E2",
    gold: "#E0B455",
    goldDeep: "#A87B26",
    goldPale: "#F8E5B0",
    ink: "#452D18",
    glow: "#FFD08A",
  },
  midnight: {
    night: "radial-gradient(135% 95% at 50% 32%, #21304A 0%, #131C2C 55%, #080C14 100%)",
    linen: "#E9E3D2",
    linenShade: "#D9D2BD",
    linenDeep: "#BDB49C",
    card: "#F6F2E6",
    gold: "#CFB26C",
    goldDeep: "#97783A",
    goldPale: "#EFE1B6",
    ink: "#33301F",
    glow: "#FFE0A8",
  },
};

export type Wine = { fill: string; light: string; deep: string; bottle: string; fizzy: boolean };

export const WINES: Record<Pour, Wine> = {
  champagne: { fill: "#E4C374", light: "#F7E7B4", deep: "#C79F3F", bottle: "#2E3A22", fizzy: true },
  red: { fill: "#7C2333", light: "#AE3B4E", deep: "#4E121E", bottle: "#3A2017", fizzy: false },
  white: { fill: "#E1D79A", light: "#F3EDC6", deep: "#BFB264", bottle: "#4B5A38", fizzy: false },
  sparkling: { fill: "#C6E1E7", light: "#EAF6F8", deep: "#8FBDC7", bottle: "#2A3A44", fizzy: true },
};

type GlassGeo = {
  bowl: string;
  inner: string;
  stem: string;
  footRx: number;
  /** Where the wine can stand, top and bottom of the inside of the bowl. */
  bowlTop: number;
  bowlBottom: number;
  /** The lip: where a pour lands and where a brimming glass bulges. */
  rimY: number;
  rimW: number;
};

/**
 * Each glass drawn in a box 26 wide and 46 tall with its foot at y=44, so the same placement
 * works for all three: `translate(cx - 13, 56)` puts the foot on the tablecloth at y=100.
 */
export const GLASS_GEO: Record<GlassShape, GlassGeo> = {
  flute: {
    bowl: "M7 2 C7.2 10 7.9 19 9.7 25.4 L16.3 25.4 C18.1 19 18.8 10 19 2 Z",
    inner: "M7.7 2.7 C7.9 10 8.5 19 10.2 24.8 L15.8 24.8 C17.5 19 18.1 10 18.3 2.7 Z",
    stem: "M12.35 25.4 H13.65 V40.6 H12.35 Z",
    footRx: 6.2,
    bowlTop: 2.7,
    bowlBottom: 24.8,
    rimY: 2,
    rimW: 12,
  },
  coupe: {
    bowl: "M2 9 C2.2 18.6 6.8 25.4 13 25.4 C19.2 25.4 23.8 18.6 24 9 Z",
    inner: "M2.8 9.7 C3 18 7.3 24.6 13 24.6 C18.7 24.6 23 18 23.2 9.7 Z",
    stem: "M12.35 25.4 H13.65 V40.6 H12.35 Z",
    footRx: 6.8,
    bowlTop: 9.7,
    bowlBottom: 24.6,
    rimY: 9,
    rimW: 22,
  },
  wine: {
    bowl: "M4.6 3 C3.7 14 5.6 23.6 13 27 C20.4 23.6 22.3 14 21.4 3 Z",
    inner: "M5.4 3.8 C4.6 14 6.4 23 13 26.1 C19.6 23 21.4 14 20.6 3.8 Z",
    stem: "M12.35 27 H13.65 V40.6 H12.35 Z",
    footRx: 6.6,
    bowlTop: 3.8,
    bowlBottom: 26.1,
    rimY: 3,
    rimW: 16.8,
  },
};

/** Where the two glasses stand, and where the bottle hangs above them. */
export const LEFT_X = 26;
export const RIGHT_X = 74;
export const GLASS_TOP = 56;
const PIVOT = { x: 50, y: 38 };
const BOTTLE_SCALE = 1.18;
const BOTTLE_LEN = 24.6 * BOTTLE_SCALE;

/** The lip of the glass in scene coordinates — where a pour lands. */
export function rimOf(shape: GlassShape): number {
  return GLASS_TOP + (GLASS_GEO[shape] ?? GLASS_GEO.flute).rimY;
}

/** Where the bottle stands when nobody is pouring: between the two glasses, upright. */
const REST_X = PIVOT.x;
/** The slice of the pour the bottle spends travelling from the near glass to the far one. */
const CROSS_FROM = 0.46;
const CROSS_TO = 0.54;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** Where the bottle's mouth has swung to, for a bottle leaning this far with its base at `base`. */
export function mouthOf(bottleDeg: number, baseX: number = PIVOT.x, baseY: number = PIVOT.y): { x: number; y: number } {
  const rad = (bottleDeg * Math.PI) / 180;
  return { x: baseX + BOTTLE_LEN * Math.sin(rad), y: baseY - BOTTLE_LEN * Math.cos(rad) };
}

/**
 * One bottle pours into one glass, so `level` — glassfuls across the pair — becomes two wine
 * lines and a journey.
 *
 * The near glass fills first. Around halfway the bottle crosses to the far one, and for that
 * moment nothing is landing anywhere, which is exactly what carrying a bottle between two glasses
 * looks like. Past both being full they rise together, so the brim and the spill still happen to
 * the pair rather than to whichever one was last under the neck.
 */
export function glassesAt(level: number): {
  left: number;
  right: number;
  /** 0 over the near glass, 1 over the far one, between while it travels. */
  travel: number;
  /** True while the bottle is between the glasses and nothing is being filled. */
  crossing: boolean;
} {
  const at = Number.isFinite(level) ? Math.max(0, level) : 0;
  const over = Math.max(0, at - 1);
  const travel = clamp01((at - CROSS_FROM) / (CROSS_TO - CROSS_FROM));
  return {
    left: Math.min(1, at / CROSS_FROM) + over,
    right: clamp01((at - CROSS_TO) / (1 - CROSS_TO)) + over,
    travel,
    crossing: at > CROSS_FROM && at < CROSS_TO,
  };
}

/** Which way the bottle leans: over the near glass, upright as it crosses, over the far one. */
export function leanOf(bottleDeg: number, travel: number): number {
  const lean = Number.isFinite(bottleDeg) ? bottleDeg : 0;
  return lean * (clamp01(travel) * 2 - 1);
}

/**
 * Where the bottle's base must stand for its mouth to be exactly over `aimX` at this lean, given
 * how far it has been brought to the glass. At rest it stands between the two of them.
 */
export function baseFor(bottleDeg: number, aimX: number, reach: number): number {
  const rad = ((Number.isFinite(bottleDeg) ? bottleDeg : 0) * Math.PI) / 180;
  return REST_X + (aimX - BOTTLE_LEN * Math.sin(rad) - REST_X) * clamp01(reach);
}

/**
 * The wine falling out of the neck, as a shape rather than a line: it leaves the mouth straight
 * down, because that is the only direction wine goes, and narrows on the way as a real fall does.
 */
export function fallPath(mx: number, my: number, tx: number, ty: number, top: number, bot: number): string {
  const drop = ty - my;
  const c1 = my + drop * 0.5;
  const c2 = my + drop * 0.82;
  const t = top / 2;
  const b = bot / 2;
  return [
    `M${(mx + t).toFixed(2)} ${my.toFixed(2)}`,
    `C ${(mx + b).toFixed(2)} ${c1.toFixed(2)} ${(tx + b).toFixed(2)} ${c2.toFixed(2)} ${(tx + b).toFixed(2)} ${ty.toFixed(2)}`,
    `L ${(tx - b).toFixed(2)} ${ty.toFixed(2)}`,
    `C ${(tx - b).toFixed(2)} ${c2.toFixed(2)} ${(mx - b).toFixed(2)} ${c1.toFixed(2)} ${(mx - t).toFixed(2)} ${my.toFixed(2)}`,
    "Z",
  ].join(" ");
}

const BUBBLES = [
  { x: -2.6, r: 0.42, delay: "0s", dur: "2.1s" },
  { x: 0.4, r: 0.3, delay: "-0.7s", dur: "2.6s" },
  { x: 2.4, r: 0.38, delay: "-1.3s", dur: "2.3s" },
  { x: -0.9, r: 0.26, delay: "-1.8s", dur: "2.9s" },
];

/** One glass, with the wine standing at `level` (1 is full, above that it bulges over the lip). */
function Glass({
  id,
  shape,
  level,
  wine,
  glow,
  animate,
  tipDeg = 0,
}: {
  id: string;
  shape: GlassShape;
  level: number;
  wine: Wine;
  /** The candle behind the glass, warming its body and its edge. */
  glow: string;
  animate: boolean;
  /** How far the whole glass is tipped, so the wine inside can stay level with the table. */
  tipDeg?: number;
}) {
  const geo = GLASS_GEO[shape] ?? GLASS_GEO.flute;
  const held = Math.max(0, Math.min(1, level));
  const surface = geo.bowlBottom - held * (geo.bowlBottom - geo.bowlTop);
  const over = Math.max(0, Math.min(0.2, level - 1));
  const rise = Math.max(1.5, geo.bowlBottom - surface - 1.4);

  return (
    <g>
      <defs>
        <clipPath id={`${id}-in`}>
          <path d={geo.inner} />
        </clipPath>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.04" />
          <stop offset="0.2" stopColor="#FFFFFF" stopOpacity="0.42" />
          <stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="0.84" stopColor="#FFFFFF" stopOpacity="0.24" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={glow} stopOpacity="0.03" />
          <stop offset="1" stopColor={glow} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* the bowl, as glass with the candle behind it */}
      <path d={geo.bowl} fill={`url(#${id}-body)`} />

      {/* the wine, clipped to the inside of the bowl. The glass tips for the clink; the wine in it
          does not, so it is turned back by as much as the glass was turned, about the point where
          its surface meets the stem — which is how a tipped glass actually sits. */}
      {held > 0.004 ? (
        <g clipPath={`url(#${id}-in)`}>
          <g transform={tipDeg ? `rotate(${(-tipDeg).toFixed(2)} 13 ${surface.toFixed(2)})` : undefined}>
            <rect x="-16" y={surface} width="58" height={geo.bowlBottom - surface + 16} fill={wine.fill} />
            <rect x="-16" y={surface} width="58" height="0.7" fill={wine.light} opacity="0.9" />
            {wine.fizzy && animate && held > 0.12
              ? BUBBLES.map((b, i) => (
                  <circle
                    key={i}
                    className="tt-fizz"
                    cx={13 + b.x}
                    cy={geo.bowlBottom - 1}
                    r={b.r}
                    fill={wine.light}
                    style={{ animationDelay: b.delay, animationDuration: b.dur, ["--rise" as string]: rise } as CSSProperties}
                  />
                ))
              : null}
          </g>
          {/* the darker wine that sits in the bottom of the bowl — part of the glass, not the tip */}
          <rect x="0" y={geo.bowlBottom - 2.2} width="26" height="2.4" fill={wine.deep} opacity="0.55" />
        </g>
      ) : null}

      {/* brimming: the wine stands proud of the lip and is about to go over */}
      {over > 0 ? <ellipse cx="13" cy={geo.rimY + 0.2} rx={geo.rimW / 2 - 0.5} ry={0.5 + over * 9} fill={wine.fill} /> : null}

      {/* the glass itself, over the wine */}
      <path d={geo.bowl} fill={`url(#${id}-shine)`} />
      <path d={geo.bowl} fill="none" stroke="#FFFFFF" strokeOpacity="0.72" strokeWidth="0.45" />
      <path d={geo.bowl} fill="none" stroke={glow} strokeOpacity="0.5" strokeWidth="0.18" />
      <path d={geo.stem} fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="0.32" />
      <ellipse cx="13" cy="41.4" rx={geo.footRx} ry="1.7" fill="#FFFFFF" fillOpacity="0.16" />
      <ellipse cx="13" cy="41.4" rx={geo.footRx} ry="1.7" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="0.34" />
    </g>
  );
}

/** The bottle, drawn upright in a box 14 by 26 with its base at the bottom: the scene leans it. */
function Bottle({ wine, p }: { wine: Wine; p: Palette }) {
  return (
    <g>
      <path
        d="M1.8 24.8 C1.8 25.9 2.4 26 3 26 H11 C11.6 26 12.2 25.9 12.2 24.8 V13 C12.2 10.4 8.7 9.2 8.7 6.6 V1.4 H5.3 V6.6 C5.3 9.2 1.8 10.4 1.8 13 Z"
        fill={wine.bottle}
      />
      <path
        d="M3.3 24.6 V13.4 C3.3 11 5.9 9.6 6.2 7 V2.2 H7.2 V7 C6.9 9.8 4.6 11.2 4.6 13.6 V24.6 Z"
        fill="#FFFFFF"
        fillOpacity="0.16"
      />
      <path d="M5.3 1.4 H8.7 V4.6 H5.3 Z" fill={p.gold} />
      <path d="M5 0.5 H9 V1.9 H5 Z" fill={p.goldPale} />
      <rect x="2.8" y="15" width="8.4" height="6.6" rx="0.5" fill={p.card} />
      <rect x="3.5" y="15.7" width="7" height="5.2" rx="0.3" fill="none" stroke={p.goldDeep} strokeWidth="0.25" />
      <circle cx="7" cy="17.6" r="0.9" fill="none" stroke={p.goldDeep} strokeWidth="0.25" />
      <path d="M4.6 19.4 H9.4 M5.4 20.3 H8.6" stroke={p.goldDeep} strokeWidth="0.25" strokeLinecap="round" opacity="0.7" />
      <path
        d="M1.8 24.8 C1.8 25.9 2.4 26 3 26 H11 C11.6 26 12.2 25.9 12.2 24.8 V13 C12.2 10.4 8.7 9.2 8.7 6.6 V1.4 H5.3 V6.6 C5.3 9.2 1.8 10.4 1.8 13 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.28"
        strokeWidth="0.3"
      />
    </g>
  );
}

/** A tall taper standing behind the menu card, burning at about the height of the glasses. */
function Candle({ p, animate }: { p: Palette; animate: boolean }) {
  return (
    <g>
      <circle cx="50" cy="55" r="23" fill="url(#tt-glow)" className={animate ? "tt-breathe" : undefined} />
      <rect x="48.4" y="58" width="3.2" height="42" fill={p.card} />
      <rect x="48.4" y="58" width="1.1" height="42" fill="#FFFFFF" fillOpacity="0.45" />
      <rect x="51" y="58" width="0.6" height="42" fill="#000000" fillOpacity="0.07" />
      <path d="M48.4 61 c.8 2.4 -.3 3.6 .2 5.6 M51.6 62.4 c-.7 2 .1 3.2 -.3 4.8" stroke={p.goldPale} strokeWidth="0.45" fill="none" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="50" cy="58.2" rx="1.6" ry="0.6" fill={p.goldPale} />
      <path d="M50 58 V56.2" stroke="#4A3A28" strokeWidth="0.4" strokeLinecap="round" />
      <g className={animate ? "tt-flame" : undefined}>
        <path d="M50 47.4 C52.2 51.2 52.8 54.2 51.4 56.5 C50.7 57.7 49.3 57.7 48.6 56.5 C47.2 54.2 47.8 51.2 50 47.4 Z" fill="#FFB84A" />
        <path d="M50 50.6 C51.2 53 51.4 54.8 50.7 56 C50.3 56.7 49.7 56.7 49.3 56 C48.6 54.8 48.8 53 50 50.6 Z" fill="#FFF3C2" />
      </g>
    </g>
  );
}

/** The card standing between the glasses. The words are laid over it in HTML. */
function MenuCard({ p }: { p: Palette }) {
  return (
    <g>
      <ellipse cx="50" cy="100" rx="19" ry="2.2" fill="#000000" opacity="0.28" />
      <path d="M34.5 69 L65.5 69 L66.6 100 L33.4 100 Z" fill={p.card} />
      <path d="M34.5 69 L40 69 L39.4 100 L33.4 100 Z" fill="#000000" opacity="0.05" />
      <path d="M36 71 L64 71 L64.8 98 L35.2 98 Z" fill="none" stroke={p.gold} strokeWidth="0.35" opacity="0.8" />
      <path d="M34.5 69 L65.5 69 L66.6 100 L33.4 100 Z" fill="none" stroke={p.goldDeep} strokeWidth="0.3" opacity="0.45" />
    </g>
  );
}

export function Table({
  p,
  wine,
  shape,
  level,
  bottleDeg,
  pouring,
  spill,
  lean,
  ringing,
  animate,
  poured,
}: {
  p: Palette;
  wine: Wine;
  shape: GlassShape;
  /** 0 empty, 1 full, above 1 brimming. */
  level: number;
  /** How far the bottle leans, in degrees. */
  bottleDeg: number;
  /** 0..1: how hard it is running. */
  pouring: number;
  /** The glasses are full: the bottle is lifted away, so the clink has the table to itself. */
  poured: boolean;
  /** 0..1: how far the spill has spread across the linen. */
  spill: number;
  /** 0..1: how far the glasses lean towards each other. */
  lean: number;
  /** The clink: gold rings going out across the table. */
  ringing: boolean;
  animate: boolean;
}) {
  const rim = rimOf(shape) + 1.2;
  const { left: leftFill, right: rightFill, travel, crossing } = glassesAt(level);
  // Which way the bottle leans is which glass it is filling — over towards the near one, upright
  // as it crosses, over towards the far one. `bottleDeg` is only how far it leans; the direction
  // belongs to the scene, because only the scene knows which glass is under the neck.
  const aimX = LEFT_X + (RIGHT_X - LEFT_X) * travel;
  const deg = leanOf(bottleDeg, travel);
  // `reach` is how far the bottle has been brought to the glass: it comes down as it starts to
  // run, and its base shifts by the last couple of units that put the mouth exactly over the lip.
  const reach = Math.min(1, Math.max(0, pouring / 0.34));
  const baseX = baseFor(deg, aimX, reach);
  const baseY = PIVOT.y + reach * 9;
  const mouth = mouthOf(deg, baseX, baseY);
  // One fall, straight down out of the neck into the one glass under it, narrowing as it goes.
  const running = pouring > 0 && !crossing;
  const fall = fallPath(mouth.x, mouth.y, aimX, rim, 1.5 + pouring * 0.9, 0.7 + pouring * 0.5);
  // Raising the glasses: up off the cloth and tipped towards each other until the bowls meet
  // above the card, the way two people actually toast.
  const up = lean * 14;
  const tip = lean * 25;

  return (
    <svg viewBox="0 0 100 150" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="tt-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={p.glow} stopOpacity="0.18" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tt-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.4" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* candlelight pooling on the cloth */}
      <ellipse cx="50" cy="104" rx="46" ry="11" fill="url(#tt-pool)" />

      {/* the spill: a damp ring soaking outwards, the wine itself standing in the middle of it.
          The damp patch is drawn in shadow rather than in the wine's own colour: champagne on
          cream linen is the same colour as cream linen, and a spill nobody can see isn't one. */}
      {spill > 0 ? (
        <g className="tt-spill">
          <ellipse cx="50" cy="103.4" rx={5.6 + spill * 18} ry={1.6 + spill * 4.4} fill="#4A3418" opacity="0.26" />
          <ellipse cx="50" cy="103.3" rx={4.6 + spill * 15} ry={1.2 + spill * 3.4} fill="#4A3418" opacity="0.2" />
          <ellipse cx="50" cy="103.4" rx={5 + spill * 17} ry={1.4 + spill * 4} fill={wine.deep} opacity="0.3" />
          <ellipse cx="50" cy="103.2" rx={4 + spill * 13.5} ry={1 + spill * 3} fill={wine.deep} opacity="0.55" />
          <ellipse cx="50" cy="103" rx={3 + spill * 10} ry={0.8 + spill * 2.1} fill={wine.fill} opacity="0.85" />
          <ellipse cx="50" cy="102.6" rx={1.6 + spill * 4} ry={0.4 + spill * 0.9} fill={wine.light} opacity="0.5" />
          <ellipse cx={64 + spill * 3} cy="105.2" rx={1.4 + spill * 2.6} ry={0.5 + spill} fill="#4A3418" opacity="0.22" />
          <ellipse cx={64 + spill * 3} cy="105.2" rx={1.2 + spill * 2.4} ry={0.4 + spill * 0.9} fill={wine.deep} opacity="0.6" />
          <ellipse cx={34 - spill * 2} cy="104.6" rx={1 + spill * 1.8} ry={0.4 + spill * 0.7} fill="#4A3418" opacity="0.2" />
          <ellipse cx={34 - spill * 2} cy="104.6" rx={0.8 + spill * 1.6} ry={0.3 + spill * 0.6} fill={wine.deep} opacity="0.55" />
        </g>
      ) : null}

      <Candle p={p} animate={animate} />

      {/* what comes out of the bottle: down from the mouth, then a fork into the two glasses.
          Drawn behind the candle and the glasses, so the stream runs into the bowls rather than
          across the front of them. */}
      {running ? (
        <g opacity={Math.min(0.96, 0.5 + pouring * 0.46)} style={{ transition: "opacity 120ms linear" }}>
          <path d={fall} fill={wine.fill} />
          {/* the light down one side of the fall, the way a stream of wine catches a candle */}
          <path d={fall} fill="none" stroke={wine.light} strokeWidth="0.22" opacity="0.7" />
          {/* where it lands: a little pool of light sitting on the wine already in the glass */}
          <ellipse cx={aimX} cy={rim} rx={1.5 + pouring * 0.9} ry={0.5 + pouring * 0.3} fill={wine.light} opacity="0.7" />
        </g>
      ) : null}

      <MenuCard p={p} />

      {/* what the glasses throw on the cloth — each one its own, since they fill one after the other */}
      {[
        { x: LEFT_X, at: leftFill },
        { x: RIGHT_X, at: rightFill },
      ].map(({ x, at }) => (
        <g key={x}>
          <ellipse cx={x + (x < 50 ? 3 : -3)} cy="100.8" rx={9 + lean * 3} ry="1.7" fill="#000000" opacity={0.2 * (1 - lean * 0.55)} />
          <ellipse cx={x} cy="101.6" rx="5" ry="1.1" fill={wine.fill} opacity={Math.min(0.42, at * 0.4) * (1 - lean * 0.6)} />
        </g>
      ))}

      {/* the two glasses, leaning in for the clink */}
      <g transform={`translate(${LEFT_X - 13} ${(GLASS_TOP - up).toFixed(2)}) rotate(${tip.toFixed(2)} 13 44)`}>
        <Glass id="tt-l" shape={shape} level={leftFill} wine={wine} glow={p.glow} animate={animate} tipDeg={tip} />
      </g>
      <g transform={`translate(${RIGHT_X - 13} ${(GLASS_TOP - up).toFixed(2)}) rotate(${(-tip).toFixed(2)} 13 44)`}>
        <Glass id="tt-r" shape={shape} level={rightFill} wine={wine} glow={p.glow} animate={animate} tipDeg={-tip} />
      </g>

      {/* the rings going out from where they touched */}
      {ringing ? (
        <g fill="none" stroke={p.goldPale} strokeWidth="0.7">
          {[0, 1, 2].map((i) => (
            <circle key={i} className="tt-ring" cx="50" cy={rim - 14} r="4" style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </g>
      ) : null}

      {/* the bottle, tipping with the phone — and lifted away off the top of the table once the
          glasses are full, so nothing stands between the two of them for the toast */}
      <g
        style={{
          opacity: poured ? 0 : 1,
          translate: poured ? "0 -22px" : "0 0",
          transition: "opacity 620ms ease, translate 760ms cubic-bezier(.4,0,.2,1)",
        }}
      >
        <g transform={`translate(${baseX.toFixed(2)} ${baseY.toFixed(2)}) rotate(${deg.toFixed(2)}) scale(${BOTTLE_SCALE}) translate(-7 -26)`}>
          <Bottle wine={wine} p={p} />
        </g>
      </g>
    </svg>
  );
}
