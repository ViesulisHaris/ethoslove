/**
 * A snow globe on a shelf: the room behind it, the glass, the turned wooden base with its brass
 * plaque, and the little world inside. All drawn as SVG — no images — so it stays crisp from a
 * 360px phone to a laptop, and so the windows can be lit from the sender's own colour.
 *
 * The interior is drawn in a 100×100 box clipped to a circle. Everything inside it is laid out
 * in those units: the ground is at y 68, and anything standing on it is measured up from there.
 */

import type { ReactNode } from "react";
import { hashString, mulberry32 } from "../_shared/random";
import type { SceneId } from "./schema";

export type Palette = {
  /** The room behind the shelf. */
  room: string;
  /** Warm light pooling on the wall around the globe. */
  halo: string;
  shelf: string;
  shelfDeep: string;
  wood: string;
  woodDeep: string;
  brass: string;
  brassDeep: string;
  brassInk: string;
  /** Sky inside the globe, top and horizon. */
  sky: [string, string];
  star: string;
  ground: string;
  groundShade: string;
  roof: string;
  roofAlt: string;
  wall: string;
  wallAlt: string;
  pine: string;
  pineDeep: string;
  /** Lamplight in the little windows. */
  lamp: string;
  /** Type in the room. */
  ink: string;
  soft: string;
  sparkle: string[];
  /** Snow, and the veil it makes when it is flying. */
  snow: string;
};

export const PALETTES: Record<"lamplit" | "midnight" | "frosted", Palette> = {
  lamplit: {
    room: "radial-gradient(110% 70% at 50% 34%, #4A2F1E 0%, #2E1C12 46%, #150C08 100%)",
    halo: "radial-gradient(60% 40% at 50% 46%, rgba(255,198,120,0.30), transparent 70%)",
    shelf: "#8A5730",
    shelfDeep: "#57331B",
    wood: "#7B4A28",
    woodDeep: "#432614",
    brass: "#E7C079",
    brassDeep: "#A07A33",
    brassInk: "#4A340F",
    sky: ["#2E4F80", "#132A4F"],
    star: "#FFF3D6",
    ground: "#F4F9FF",
    groundShade: "#C8DCF2",
    roof: "#C25B4E",
    roofAlt: "#3E6A7A",
    wall: "#F3E3CA",
    wallAlt: "#E6D2B4",
    pine: "#2F6B4F",
    pineDeep: "#1E4A37",
    lamp: "#FFCE79",
    ink: "#F7EBD9",
    soft: "#CDB093",
    sparkle: ["#FFFFFF", "#D6E9FF", "#FFE3AD"],
    snow: "#FFFFFF",
  },
  midnight: {
    room: "radial-gradient(110% 70% at 50% 34%, #223056 0%, #121A33 48%, #060912 100%)",
    halo: "radial-gradient(60% 40% at 50% 46%, rgba(150,190,255,0.24), transparent 70%)",
    shelf: "#48547A",
    shelfDeep: "#2A3252",
    wood: "#445073",
    woodDeep: "#232A47",
    brass: "#DCCB9E",
    brassDeep: "#94824F",
    brassInk: "#33290F",
    sky: ["#1E3A6E", "#0A1430"],
    star: "#FFFFFF",
    ground: "#EEF5FF",
    groundShade: "#B9CDE8",
    roof: "#7E5E9E",
    roofAlt: "#3D6C86",
    wall: "#EADFC9",
    wallAlt: "#D5C7AE",
    pine: "#27604A",
    pineDeep: "#17412F",
    lamp: "#FFD489",
    ink: "#EAF0FB",
    soft: "#94A7C9",
    sparkle: ["#FFFFFF", "#BFD9FF", "#8FB6FF"],
    snow: "#FFFFFF",
  },
  frosted: {
    room: "radial-gradient(110% 70% at 50% 32%, #F2F7FB 0%, #DCE8F2 48%, #BDD0E0 100%)",
    halo: "radial-gradient(60% 40% at 50% 46%, rgba(255,255,255,0.65), transparent 72%)",
    shelf: "#D3B58C",
    shelfDeep: "#A98457",
    wood: "#C7A374",
    woodDeep: "#94714A",
    brass: "#D9B457",
    brassDeep: "#9A7C2C",
    brassInk: "#4A3A0D",
    sky: ["#C7E0F6", "#94BBDD"],
    star: "#FFFFFF",
    ground: "#FFFFFF",
    groundShade: "#D3E4F4",
    roof: "#D0705F",
    roofAlt: "#4E7E90",
    wall: "#FFF6E7",
    wallAlt: "#F0E1C6",
    pine: "#37795A",
    pineDeep: "#255840",
    lamp: "#FFB55A",
    ink: "#27384A",
    soft: "#63798F",
    sparkle: ["#FFFFFF", "#CFE6FF", "#A9CEF0"],
    snow: "#FFFFFF",
  },
};

/* ---------------------------------------------------------------- the room */

/** A garland of pine and little bulbs, strung across the wall above the shelf. */
export function Garland({ p, accent, lit }: { p: Palette; accent: string; lit: boolean }) {
  const bulbs = [10, 24, 38, 52, 66, 80, 92];
  return (
    <svg viewBox="0 0 100 18" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d="M-2 2 Q 25 14 50 11 T 102 2" fill="none" stroke={p.pineDeep} strokeWidth={1.6} strokeLinecap="round" />
      {bulbs.map((x, i) => {
        const y = 2 + Math.sin(((x + 2) / 104) * Math.PI) * 9.4;
        const tint = i % 3 === 1 ? accent : i % 3 === 2 ? "#FFF0CE" : p.lamp;
        return (
          <g key={x} className={lit ? "sg-twinkle" : undefined} style={{ animationDelay: `${-i * 0.45}s` }}>
            <line x1={x} y1={y} x2={x} y2={y + 2.2} stroke={p.pineDeep} strokeWidth={0.6} />
            <circle cx={x} cy={y + 3.8} r={4.6} fill={tint} opacity={0.2} />
            <circle cx={x} cy={y + 3.8} r={1.9} fill={tint} />
            <circle cx={x - 0.5} cy={y + 3.3} r={0.7} fill="#FFFFFF" opacity={0.75} />
          </g>
        );
      })}
      {/* sprigs of pine along the string */}
      {[17, 31, 45, 59, 73, 86].map((x, i) => {
        const y = 2 + Math.sin(((x + 2) / 104) * Math.PI) * 9.4;
        return (
          <g key={`s-${x}`} fill={i % 2 ? p.pine : p.pineDeep} opacity={0.95}>
            <ellipse cx={x} cy={y + 1.4} rx={3.6} ry={1.5} transform={`rotate(${i % 2 ? 16 : -14} ${x} ${y + 1.4})`} />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The shelf the globe stands on, with a few books propped at the end of it.
 *
 * Two drawings, not one. The plank stretches to whatever the room is wide, so it can take no
 * standing object with it: in the plank's own box the books sit above the top edge and are simply
 * clipped away, and un-clipping them would only leave them squat and stretched on a laptop. They
 * get their own little box instead, measured in the same `--k` as the globe, so they are the same
 * books on a 360px phone and on a wide screen.
 */
export function Shelf({ p, accent }: { p: Palette; accent: string }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 14" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <rect x={0} y={2} width={100} height={4.2} fill={p.shelf} />
        <rect x={0} y={6.2} width={100} height={3.4} fill={p.shelfDeep} />
        <rect x={0} y={2} width={100} height={0.9} fill="#FFFFFF" opacity={0.18} />
        <rect x={0} y={9.6} width={100} height={1.4} fill="#000000" opacity={0.22} />
      </svg>
      {/* standing on the plank, their feet just inside its top edge */}
      <svg
        viewBox="0 0 16 15"
        className="absolute overflow-visible"
        style={{ left: "calc(5 * var(--k))", bottom: "calc(11.8 * var(--k))", width: "calc(16 * var(--k))", height: "calc(15 * var(--k))" }}
        aria-hidden="true"
      >
        <g opacity={0.95}>
          <rect x={0.5} y={3.2} width={3.2} height={11.8} rx={0.7} fill={accent} />
          <rect x={4} y={1.4} width={2.9} height={13.6} rx={0.7} fill={p.roofAlt} />
          <rect x={7.2} y={4.6} width={2.6} height={10.4} rx={0.7} fill={p.brass} />
          <rect x={10.1} y={5.8} width={3} height={9.2} rx={0.7} fill={p.roof} transform="rotate(9 11.6 15)" />
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------- inside it */

function Pine({ x, base, h, p, snowy = true }: { x: number; base: number; h: number; p: Palette; snowy?: boolean }) {
  const w = h * 0.62;
  const tiers = [0, 0.3, 0.58];
  return (
    <g>
      <rect x={x - w * 0.07} y={base - h * 0.16} width={w * 0.14} height={h * 0.18} fill={p.pineDeep} rx={0.4} />
      {tiers.map((t, i) => {
        const top = base - h + h * t;
        const half = (w / 2) * (0.5 + t * 0.85);
        const bottom = top + h * 0.34;
        return (
          <g key={t}>
            <path d={`M${x} ${top} L${x + half} ${bottom} Q${x} ${bottom + 1.2} ${x - half} ${bottom} Z`} fill={i % 2 ? p.pineDeep : p.pine} />
            {snowy ? <path d={`M${x} ${top + 0.6} L${x + half * 0.62} ${bottom - 0.4} Q${x} ${bottom + 0.3} ${x - half * 0.62} ${bottom - 0.4} Z`} fill={p.ground} opacity={0.34} /> : null}
          </g>
        );
      })}
    </g>
  );
}

function Cottage({
  x,
  base,
  w,
  h,
  p,
  roof,
  wall,
  chimney = true,
  smoking = false,
  animate = true,
}: {
  x: number;
  base: number;
  w: number;
  h: number;
  p: Palette;
  roof: string;
  wall: string;
  chimney?: boolean;
  smoking?: boolean;
  /** The editor's still frame keeps the smoke where it is, like every other animation here. */
  animate?: boolean;
}) {
  const left = x - w / 2;
  const bodyTop = base - h * 0.58;
  const ridge = base - h;
  const eave = w * 0.12;
  return (
    <g>
      {chimney ? (
        <g>
          <rect x={x + w * 0.24} y={ridge - h * 0.02} width={w * 0.19} height={h * 0.36} rx={0.6} fill={p.woodDeep} />
          <rect x={x + w * 0.22} y={ridge - h * 0.06} width={w * 0.23} height={h * 0.07} rx={0.6} fill={p.ground} />
          {smoking ? (
            <g className={animate ? "sg-smoke" : undefined} fill={p.ground} opacity={0.5}>
              <circle cx={x + w * 0.35} cy={ridge - h * 0.16} r={1.4} />
              <circle cx={x + w * 0.43} cy={ridge - h * 0.32} r={1.05} />
              <circle cx={x + w * 0.34} cy={ridge - h * 0.47} r={0.75} />
            </g>
          ) : null}
        </g>
      ) : null}
      <rect x={left} y={bodyTop} width={w} height={base - bodyTop} rx={w * 0.05} fill={wall} />
      <rect x={left} y={bodyTop} width={w * 0.22} height={base - bodyTop} rx={w * 0.05} fill="#000000" opacity={0.07} />
      <path d={`M${left - eave} ${bodyTop + 0.6} L${x} ${ridge} L${x + w / 2 + eave} ${bodyTop + 0.6} Z`} fill={roof} />
      <path d={`M${left - eave} ${bodyTop + 0.6} L${x} ${ridge} L${x + w * 0.18} ${ridge + h * 0.1} L${left - eave * 0.2} ${bodyTop + 1.4} Z`} fill="#FFFFFF" opacity={0.16} />
      {/* snow settled along the ridge, so the roof keeps its colour at the eaves */}
      <path
        d={`M${x} ${ridge - 0.7} Q${x + w * 0.19} ${ridge + h * 0.13} ${x + w * 0.34} ${bodyTop + h * 0.09} Q${x} ${bodyTop - h * 0.07} ${x - w * 0.34} ${bodyTop + h * 0.09} Q${x - w * 0.19} ${ridge + h * 0.13} ${x} ${ridge - 0.7} Z`}
        fill={p.ground}
      />
      <ellipse cx={left - eave * 0.3} cy={bodyTop + 0.7} rx={w * 0.1} ry={w * 0.04} fill={p.ground} />
      <ellipse cx={x + w / 2 + eave * 0.3} cy={bodyTop + 0.7} rx={w * 0.1} ry={w * 0.04} fill={p.ground} />
      {/* lit windows */}
      <rect x={x - w * 0.31} y={bodyTop + h * 0.14} width={w * 0.24} height={h * 0.2} rx={0.6} fill={p.lamp} />
      <rect x={x + w * 0.07} y={bodyTop + h * 0.14} width={w * 0.24} height={h * 0.2} rx={0.6} fill={p.lamp} />
      <rect x={x - w * 0.1} y={base - h * 0.3} width={w * 0.2} height={h * 0.3} rx={w * 0.05} fill={p.woodDeep} />
      <circle cx={x + w * 0.05} cy={base - h * 0.15} r={0.5} fill={p.brass} />
    </g>
  );
}

/** The two of them, bundled up, holding hands. */
function Figures({ x, base, p, accent, scale = 1 }: { x: number; base: number; p: Palette; accent: string; scale?: number }) {
  const h = 11 * scale;
  const one = (cx: number, coat: string, hat: string, mirror: number) => (
    <g>
      <ellipse cx={cx} cy={base + 0.5} rx={h * 0.3} ry={h * 0.08} fill={p.groundShade} opacity={0.5} />
      <path d={`M${cx - h * 0.24} ${base} Q${cx} ${base - h * 0.1} ${cx + h * 0.24} ${base} L${cx + h * 0.19} ${base - h * 0.42} Q${cx} ${base - h * 0.52} ${cx - h * 0.19} ${base - h * 0.42} Z`} fill={coat} />
      <circle cx={cx} cy={base - h * 0.62} r={h * 0.17} fill="#F6D9C0" />
      <path d={`M${cx - h * 0.18} ${base - h * 0.68} Q${cx} ${base - h * 0.88} ${cx + h * 0.18} ${base - h * 0.68} Z`} fill={hat} />
      <circle cx={cx} cy={base - h * 0.87} r={h * 0.07} fill={p.ground} />
      <rect x={cx - h * 0.19} y={base - h * 0.5} width={h * 0.38} height={h * 0.08} rx={h * 0.04} fill={hat} />
      <path d={`M${cx + mirror * h * 0.2} ${base - h * 0.36} q${mirror * h * 0.16} ${h * 0.06} ${mirror * h * 0.2} ${h * 0.14}`} stroke={coat} strokeWidth={h * 0.09} strokeLinecap="round" fill="none" />
    </g>
  );
  return (
    <g>
      {one(x - h * 0.28, accent, p.brass, 1)}
      {one(x + h * 0.28, p.roof, p.sparkle[1], -1)}
    </g>
  );
}

function Present({ x, base, w, colour, ribbon }: { x: number; base: number; w: number; colour: string; ribbon: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={base - w} width={w} height={w} rx={w * 0.12} fill={colour} />
      <rect x={x - w * 0.09} y={base - w} width={w * 0.18} height={w} fill={ribbon} />
      <rect x={x - w / 2} y={base - w * 0.62} width={w} height={w * 0.16} fill={ribbon} />
      <circle cx={x} cy={base - w} r={w * 0.16} fill={ribbon} />
    </g>
  );
}

/** The little world: sky, stars, snowy ground, and whatever the sender chose to put in it. */
export function GlobeInterior({
  p,
  scene,
  accent,
  seed,
  lit,
  animate,
  uid,
}: {
  p: Palette;
  scene: SceneId;
  accent: string;
  seed: string;
  lit: boolean;
  /** False in the editor's still frame and under reduced motion: nothing inside moves. */
  animate: boolean;
  /** Unique per mounted globe: the editor shows two at once, and ids must not collide. */
  uid: string;
}) {
  const stars = (() => {
    const rng = mulberry32(hashString(`${seed}-stars`));
    return Array.from({ length: 16 }, () => ({ x: 8 + rng() * 84, y: 10 + rng() * 40, r: 0.35 + rng() * 0.6, o: 0.4 + rng() * 0.6 }));
  })();
  const ground = 68;

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <clipPath id={`${uid}-dome`}>
          <circle cx={50} cy={50} r={50} />
        </clipPath>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="100%" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={`${uid}-moon`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.star} stopOpacity={0.5} />
          <stop offset="100%" stopColor={p.star} stopOpacity={0} />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${uid}-dome)`}>
        <rect x={0} y={0} width={100} height={100} fill={`url(#${uid}-sky)`} />
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={p.star} opacity={s.o} />
        ))}
        <circle cx={74} cy={20} r={12} fill={`url(#${uid}-moon)`} />
        <circle cx={74} cy={20} r={5.2} fill={p.star} opacity={0.85} />
        <circle cx={77.4} cy={18} r={4.6} fill={p.sky[0]} opacity={0.9} />

        {/* far hills */}
        <path d={`M-4 ${ground - 4} Q18 ${ground - 18} 40 ${ground - 5} Q58 ${ground - 16} 78 ${ground - 4} Q92 ${ground - 12} 104 ${ground - 3} L104 100 L-4 100 Z`} fill={p.groundShade} opacity={0.55} />

        {/* the ground they stand on */}
        <path d={`M-4 ${ground} Q28 ${ground - 6} 50 ${ground - 1.5} Q74 ${ground + 3} 104 ${ground - 2} L104 100 L-4 100 Z`} fill={p.ground} />
        <path d={`M-4 ${ground + 5} Q30 ${ground + 1} 50 ${ground + 4} Q76 ${ground + 8} 104 ${ground + 3}`} fill="none" stroke={p.groundShade} strokeWidth={0.9} opacity={0.7} />

        <Scene scene={scene} p={p} accent={accent} ground={ground} animate={animate} />

        {/* the warm pool the windows throw on the snow */}
        {lit ? <ellipse cx={50} cy={ground + 8} rx={40} ry={9} fill={p.lamp} opacity={0.16} /> : null}
      </g>
    </svg>
  );
}

function Scene({ scene, p, accent, ground, animate }: { scene: SceneId; p: Palette; accent: string; ground: number; animate: boolean }) {
  if (scene === "tree") {
    return (
      <g>
        <Pine x={22} base={ground + 1} h={17} p={p} />
        <Pine x={80} base={ground + 2} h={14} p={p} />
        <g>
          <Pine x={50} base={ground + 3} h={38} p={p} snowy={false} />
          {[
            [44, 52, accent],
            [56, 50, p.lamp],
            [47, 42, p.roofAlt],
            [54, 38, accent],
            [50, 58, p.lamp],
            [42, 60, p.roofAlt],
            [58, 60, accent],
          ].map(([x, y, c], i) => (
            <circle key={i} cx={Number(x)} cy={Number(y)} r={1.5} fill={String(c)} />
          ))}
          <path d="M50 30 l1.6 3.4 3.6.4-2.7 2.5.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.7-2.5 3.6-.4z" fill={p.brass} />
        </g>
        <Present x={40} base={ground + 4} w={6} colour={accent} ribbon={p.ground} />
        <Present x={61} base={ground + 4} w={5} colour={p.roofAlt} ribbon={p.brass} />
        <Figures x={50} base={ground + 15} p={p} accent={accent} scale={1.15} />
      </g>
    );
  }
  if (scene === "cabin") {
    return (
      <g>
        <Pine x={16} base={ground + 2} h={24} p={p} />
        <Pine x={30} base={ground + 4} h={16} p={p} />
        <Pine x={86} base={ground + 2} h={22} p={p} />
        <Cottage x={58} base={ground + 4} w={34} h={30} p={p} roof={p.roof} wall={p.wallAlt} smoking animate={animate} />
        <g>
          <rect x={41} y={ground + 1} width={7} height={3.4} rx={0.6} fill={p.woodDeep} />
          <rect x={41.6} y={ground - 1.6} width={5.8} height={2.8} rx={0.6} fill={p.wood} />
        </g>
        <Figures x={30} base={ground + 12} p={p} accent={accent} scale={1.05} />
      </g>
    );
  }
  if (scene === "village") {
    return (
      <g>
        <Cottage x={20} base={ground + 2} w={20} h={20} p={p} roof={p.roofAlt} wall={p.wall} />
        <Cottage x={50} base={ground + 4} w={24} h={26} p={p} roof={p.roof} wall={p.wallAlt} smoking animate={animate} />
        <Cottage x={80} base={ground + 2} w={19} h={18} p={p} roof={p.roofAlt} wall={p.wall} />
        <Pine x={35} base={ground + 3} h={13} p={p} />
        <Pine x={66} base={ground + 3} h={12} p={p} />
        <g>
          <rect x={90.4} y={ground - 10} width={1.2} height={14} fill={p.woodDeep} />
          <circle cx={91} cy={ground - 11.4} r={2.4} fill={p.lamp} opacity={0.9} />
          <circle cx={91} cy={ground - 11.4} r={5} fill={p.lamp} opacity={0.18} />
        </g>
        <Figures x={50} base={ground + 15} p={p} accent={accent} scale={1.05} />
      </g>
    );
  }
  // homes: two little houses and the path worn between them
  return (
    <g>
      <path d={`M26 ${ground + 8} Q50 ${ground + 1} 74 ${ground + 8}`} fill="none" stroke={p.groundShade} strokeWidth={2.4} strokeLinecap="round" strokeDasharray="3 3" opacity={0.85} />
      <Cottage x={24} base={ground + 3} w={26} h={27} p={p} roof={p.roof} wall={p.wall} smoking animate={animate} />
      <Cottage x={77} base={ground + 3} w={24} h={25} p={p} roof={p.roofAlt} wall={p.wallAlt} />
      <Pine x={48} base={ground + 1} h={15} p={p} />
      <Pine x={62} base={ground + 2} h={11} p={p} />
      <Figures x={50} base={ground + 15} p={p} accent={accent} scale={1.1} />
    </g>
  );
}

/* --------------------------------------------------------------- the glass */

/** The dome: a rim, a sheen, and the little world darkening towards the edges. */
export function Dome({ p, glint, uid }: { p: Palette; glint: boolean; uid: string }) {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-shade`} cx="0.5" cy="0.45" r="0.55">
          <stop offset="55%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#0B1526" stopOpacity={0.5} />
        </radialGradient>
      </defs>
      <circle cx={50} cy={50} r={50} fill={`url(#${uid}-shade)`} />
      <circle cx={50} cy={50} r={49.2} fill="none" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.3} />
      <circle cx={50} cy={50} r={47} fill="none" stroke={p.sparkle[1]} strokeWidth={0.6} opacity={0.35} />
      <path d="M16 26 Q30 9 52 6" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.26} className={glint ? "sg-glint" : undefined} />
      <path d="M13 40 Q14 28 21 19" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.18} />
      <path d="M78 82 Q90 70 92 54" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" opacity={0.12} />
    </svg>
  );
}

/** The turned wooden base, with the brass plaque across the front. */
export function Base({ p, uid, children }: { p: Palette; uid: string; children?: ReactNode }) {
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 100 42" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-wood`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={p.woodDeep} />
            <stop offset="28%" stopColor={p.wood} />
            <stop offset="62%" stopColor={p.wood} />
            <stop offset="100%" stopColor={p.woodDeep} />
          </linearGradient>
        </defs>
        <path d="M14 0 H86 L90 7 H10 Z" fill={p.woodDeep} />
        <path d="M10 7 H90 L96 36 Q96 40 92 40 H8 Q4 40 4 36 Z" fill={`url(#${uid}-wood)`} />
        <path d="M10 7 H90 L90.8 11 H9.2 Z" fill="#FFFFFF" opacity={0.14} />
        <path d="M6 33 H94 L95.4 37 Q95.4 40 92 40 H8 Q4.6 40 4.6 37 Z" fill="#000000" opacity={0.22} />
      </svg>
      {children}
    </div>
  );
}
