"use client";

import { useId, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import type { FontPairing } from "@/lib/gift/schema";
import type { StickerId } from "../_shared/covers/stickers";
import type { Pt, Track } from "./track";
import type { HalfwayFields, IslandId } from "./schema";

/**
 * The postcard: two little homes on two little islands, each with its town on a ribbon, a dotted
 * flight path over the sea, clouds, and something small that rides the recipient's breath. Drawn
 * from scratch, flat and soft with white die-cut edges, like the stickers on the covers.
 */

export const VIEW = { w: 300, h: 280 } as const;
/** Where each home stands (the middle of its doorstep), and the arc between them. */
export const HOMES = { from: { x: 62, y: 214 }, to: { x: 236, y: 210 } } as const;
export const ROUTE = { a: { x: 66, y: 168 }, control: { x: 150, y: 6 }, b: { x: 232, y: 164 } } as const;

/** The page, the sea and the paper; the islands have colours of their own. */
export type Palette = {
  ground: string;
  tone: "light" | "dark";
  ink: string;
  soft: string;
  pill: string;
  card: string;
  sea: string;
  seaDeep: string;
  wave: string;
  shore: string;
  cloud: string;
  wall: string;
  window: string;
  mapInk: string;
  dots: string;
  planeInk: string;
  sparkle: string[];
  stickers: [StickerId, StickerId, StickerId];
};

/** One island's colours: the land, its bushes, the roof (which the ribbon borrows), the ribbon's folds, and its lettering. */
export type Island = { land: string; bush: string; roof: string; deep: string; ink: string };

export const ISLANDS: Record<IslandId, Island> = {
  pink: { land: "#ffe1e8", bush: "#f8c8d4", roof: "#f28aa5", deep: "#d96a88", ink: "#8a3553" },
  peach: { land: "#fff0d6", bush: "#f9d9b5", roof: "#f4a77e", deep: "#dd8659", ink: "#8a4b22" },
  mint: { land: "#dcf2e3", bush: "#bfe3cc", roof: "#6fbfae", deep: "#4f9f8e", ink: "#2e5e58" },
  lilac: { land: "#ede4fb", bush: "#d9c9f3", roof: "#a78bdb", deep: "#8a6cc4", ink: "#553a8a" },
};

const gingham = (tint: string, ground: string, cell = "calc(12*var(--u))") =>
  `linear-gradient(90deg, ${tint} 50%, transparent 0) 0 0/${cell} ${cell}, linear-gradient(${tint} 50%, transparent 0) 0 0/${cell} ${cell}, ${ground}`;

const polka = (dot: string, ground: string) =>
  `radial-gradient(${dot} calc(1.4*var(--u)), transparent calc(1.55*var(--u))) 0 0/calc(10*var(--u)) calc(10*var(--u)), radial-gradient(${dot} calc(1.4*var(--u)), transparent calc(1.55*var(--u))) calc(5*var(--u)) calc(5*var(--u))/calc(10*var(--u)) calc(10*var(--u)), ${ground}`;

export const PALETTES: Record<HalfwayFields["palette"], Palette> = {
  blush: {
    ground: gingham("rgba(246,166,184,.28)", "#fff5f7"),
    tone: "light",
    ink: "#8a3553",
    soft: "rgba(138,53,83,.62)",
    pill: "rgba(255,255,255,.72)",
    card: "#fffaf6",
    sea: "#d8eff7",
    seaDeep: "#b7dfee",
    wave: "#ffffff",
    shore: "#ffffff",
    cloud: "rgba(255,255,255,.92)",
    wall: "#fffaf3",
    window: "#ffd66b",
    mapInk: "#8a3553",
    dots: "rgba(138,53,83,.26)",
    planeInk: "#8a3553",
    sparkle: ["#ffffff", "#ffc2d1", "#ffe39a"],
    stickers: ["cloud", "sparkle", "heart"],
  },
  sea: {
    ground: polka("#cdeee5", "#f4fbf8"),
    tone: "light",
    ink: "#2e5e58",
    soft: "rgba(46,94,88,.62)",
    pill: "rgba(255,255,255,.74)",
    card: "#fffdf7",
    sea: "#c9e9f1",
    seaDeep: "#a7d7e5",
    wave: "#ffffff",
    shore: "#ffffff",
    cloud: "rgba(255,255,255,.92)",
    wall: "#fffaf3",
    window: "#ffd66b",
    mapInk: "#2e5e58",
    dots: "rgba(46,94,88,.26)",
    planeInk: "#2e5e58",
    sparkle: ["#ffffff", "#c3ece2", "#ffe39a"],
    stickers: ["cloud", "star", "butterfly"],
  },
  butter: {
    ground: gingham("rgba(242,190,92,.26)", "#fffaf0"),
    tone: "light",
    ink: "#7a5418",
    soft: "rgba(122,84,24,.62)",
    pill: "rgba(255,255,255,.74)",
    card: "#fffdf8",
    sea: "#d9effa",
    seaDeep: "#bcdff3",
    wave: "#ffffff",
    shore: "#ffffff",
    cloud: "rgba(255,255,255,.92)",
    wall: "#fffaf3",
    window: "#ffd66b",
    mapInk: "#7a5418",
    dots: "rgba(122,84,24,.26)",
    planeInk: "#7a5418",
    sparkle: ["#ffffff", "#ffe39a", "#ffd0a0"],
    stickers: ["cloud", "sparkle", "daisy"],
  },
  dusk: {
    ground:
      "radial-gradient(rgba(255,255,255,.8) calc(.3*var(--u)), transparent calc(.42*var(--u))) 0 0/calc(13*var(--u)) calc(13*var(--u)), radial-gradient(rgba(255,255,255,.45) calc(.2*var(--u)), transparent calc(.32*var(--u))) calc(6*var(--u)) calc(7*var(--u))/calc(17*var(--u)) calc(17*var(--u)), radial-gradient(120% 90% at 50% 18%, #363b82, #1b1c4a 58%, #0e0e2a)",
    tone: "dark",
    ink: "#fff3cf",
    soft: "rgba(255,243,207,.72)",
    pill: "rgba(255,244,224,.14)",
    card: "#fffaf0",
    sea: "#3d4494",
    seaDeep: "#2c3378",
    wave: "#8d95e2",
    shore: "#ffffff",
    cloud: "rgba(233,230,255,.5)",
    wall: "#fff6e6",
    window: "#ffd66b",
    mapInk: "#fff3cf",
    dots: "rgba(255,243,207,.42)",
    planeInk: "#2c3378",
    sparkle: ["#ffffff", "#fff3cf", "#c9c2f2"],
    stickers: ["moon", "star", "sparkle"],
  },
};

/** How the names on the islands are lettered, following the gift's font choice. */
const NAME_FONT: Record<FontPairing, CSSProperties> = {
  editorial: { fontFamily: "var(--gift-font-hand)" },
  handwritten: { fontFamily: "var(--gift-font-hand)" },
  modern: { fontFamily: "var(--gift-font-display)", fontWeight: 600 },
};

const ISLAND_FROM = "M12 240 C6 212 30 192 62 192 C96 190 122 206 122 230 C122 250 96 259 62 257 C34 257 16 253 12 240Z";
const ISLAND_TO = "M176 236 C170 208 196 188 230 188 C264 186 290 202 288 226 C286 246 262 256 230 254 C202 254 180 250 176 236Z";
const BUSHES: { side: "from" | "to"; x: number; y: number; r: number }[] = [
  { side: "from", x: 100, y: 220, r: 6 },
  { side: "from", x: 26, y: 230, r: 5 },
  { side: "from", x: 112, y: 237, r: 4 },
  { side: "to", x: 268, y: 218, r: 6 },
  { side: "to", x: 196, y: 228, r: 5 },
  { side: "to", x: 276, y: 236, r: 4 },
];
const WAVES: [number, number][] = [
  [24, 96], [70, 66], [112, 34], [118, 122], [176, 34], [214, 96], [266, 112], [140, 148], [196, 128], [36, 136], [258, 146], [92, 166], [212, 168], [128, 194], [150, 224], [140, 262],
];
const CLOUD = "M-18 6 C-27 6 -27 -5 -18 -6 C-17 -14 -6 -16 -1 -10 C3 -17 17 -15 17 -6 C26 -6 26 6 17 6 Z";
const CLOUDS = [
  { x: 50, y: 42, scale: 1, duration: "7s" },
  { x: 250, y: 58, scale: 0.8, duration: "9s" },
];

/** A small heart centred on the origin, about twelve units across. */
export const HEART = "M0 4.2 C-5.8 0.2 -7 -3.6 -4.4 -5.8 C-2.4 -7.4 0 -6.2 0 -4.2 C0 -6.2 2.4 -7.4 4.4 -5.8 C7 -3.6 5.8 0.2 0 4.2Z";

const short = (name: string, max = 12) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

function House({ at, island, p, glow }: { at: Pt; island: Island; p: Palette; glow: boolean }) {
  const { x, y } = at;
  return (
    <g>
      {glow ? <circle className="hw-glow" cx={x} cy={y - 16} r="30" fill={p.window} opacity="0.45" /> : null}
      <rect x={x - 15} y={y - 21} width="30" height="21" rx="3" fill={p.wall} stroke="#ffffff" strokeWidth="3" paintOrder="stroke" />
      <path d={`M${x - 19} ${y - 19} L${x} ${y - 36} L${x + 19} ${y - 19} Z`} fill={island.roof} stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke" />
      <rect x={x - 4.5} y={y - 12} width="9" height="12" rx="2.5" fill={island.roof} />
      <rect x={x - 12} y={y - 17} width="6" height="6" rx="1.6" fill={p.window} />
      <rect x={x + 6} y={y - 17} width="6" height="6" rx="1.6" fill={p.window} />
      <circle cx={x} cy={y - 26} r="2.6" fill={p.window} />
    </g>
  );
}

function Name({ x, y, island, lettering, children }: { x: number; y: number; island: Island; lettering: FontPairing; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="15" fill={island.ink} stroke="#ffffff" strokeWidth="3.5" strokeLinejoin="round" paintOrder="stroke" style={NAME_FONT[lettering] ?? NAME_FONT.editorial}>
      {children}
    </text>
  );
}

/** A ribbon banner with folded tails, the town written across it. */
function Ribbon({ x, y, island, label }: { x: number; y: number; island: Island; label: string }) {
  const text = short(label.toUpperCase(), 18);
  const natural = 18 + text.length * 6.3;
  const w = Math.min(112, natural);
  const h = 17;
  const tail = (side: 1 | -1) =>
    `M${side * (w / 2 - 4)} ${-h / 2 + 4} L${side * (w / 2 + 12)} ${-h / 2 + 4} L${side * (w / 2 + 7)} 4 L${side * (w / 2 + 12)} ${h / 2 + 4} L${side * (w / 2 - 4)} ${h / 2 + 4} Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={tail(-1)} fill={island.deep} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" paintOrder="stroke" />
      <path d={tail(1)} fill={island.deep} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" paintOrder="stroke" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3" fill={island.roof} stroke="#ffffff" strokeWidth="2.5" paintOrder="stroke" />
      <text
        y="3.2"
        textAnchor="middle"
        fontSize="8.6"
        fontWeight="700"
        letterSpacing="1.1"
        fill="#ffffff"
        textLength={natural > w ? w - 14 : undefined}
        lengthAdjust={natural > w ? "spacingAndGlyphs" : undefined}
      >
        {text}
      </text>
    </g>
  );
}

/** What rides the breath: a paper plane, a hot-air balloon or a little bird, drawn around its centre. */
function Vehicle({ kind, ink }: { kind: HalfwayFields["vehicle"]; ink: string }) {
  if (kind === "balloon") {
    return (
      <g transform="translate(0 -8)">
        <g className="hw-sway">
          <path d="M-4 7 L-3 12.5 M4 7 L3 12.5" stroke={ink} strokeWidth="1" opacity="0.7" />
          <rect x="-3.8" y="12" width="7.6" height="5.6" rx="1.4" fill="#e2b07a" stroke={ink} strokeWidth="1.1" />
          <path d="M0 -19 C12 -19 15 -8 9 1 C6 5 3 6 2 7 L-2 7 C-3 6 -6 5 -9 1 C-15 -8 -12 -19 0 -19Z" fill="#ffffff" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M0 -19 C-5 -14 -5 0 -2 7 L2 7 C5 0 5 -14 0 -19Z" fill="var(--gift-accent)" />
          <path d="M-11 -9 C-10 -14 -7 -17 -4 -18" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9" />
        </g>
      </g>
    );
  }
  if (kind === "bird") {
    return (
      <g>
        <path d="M-9 1 L-16 -3 L-14.5 2.5 L-16 7 Z" fill="var(--gift-accent)" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" paintOrder="stroke" />
        <ellipse rx="10.5" ry="8.5" fill="var(--gift-accent)" stroke="#ffffff" strokeWidth="1.8" paintOrder="stroke" />
        <path d="M9.6 -1.8 L15.5 0.4 L9.6 2.6 Z" fill="#f5b942" />
        <circle cx="4.8" cy="-2.6" r="1.4" fill="#3a2a30" />
        <circle cx="3" cy="2.2" r="1.7" fill="#ffc2d1" opacity="0.9" />
        <path className="hw-flap" d="M-2 -2 C-6 -13 -14 -12 -12 -4 C-10.5 0.5 -6 1 -2 -1 Z" fill="#ffffff" stroke={ink} strokeWidth="1.1" strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g>
      <path d="M-12 -8 L14 0 L-12 8 L-6 0 Z" fill="#ffffff" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-6 0 L14 0 M-12 8 L-2 1.5" stroke={ink} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  );
}

type MapProps = {
  p: Palette;
  trk: Track;
  progress: number;
  /** Fractions along the path where a heart waits, one per photo. It pops while the flyer is past it. */
  markers: number[];
  arrived: boolean;
  people: { from: string; to: string };
  cities: { from: string; to: string };
  islands: { from: Island; to: Island };
  vehicle: HalfwayFields["vehicle"];
  lettering: FontPairing;
  planeLabel: string;
  interactive: boolean;
  /** 0..1: how hard they're blowing right now. */
  wind: number;
  onPlaneTap: () => void;
  onPlaneKey: (e: ReactKeyboardEvent<SVGGElement>) => void;
};

export function MapArt({ p, trk, progress, markers, arrived, people, cities, islands, vehicle, lettering, planeLabel, interactive, wind, onPlaneTap, onPlaneKey }: MapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const flyer = trk.at(progress);
  const apex = trk.at(0.5);
  // A plane points where it's going, a bird leans into it a little, a balloon just floats upright.
  const tilt = vehicle === "plane" ? flyer.heading : vehicle === "bird" ? flyer.heading * 0.35 : 0;

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="block h-auto w-full" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}>
      <defs>
        <clipPath id={`${uid}-card`}>
          <rect width={VIEW.w} height={VIEW.h} rx="14" />
        </clipPath>
        <radialGradient id={`${uid}-sea`} cx="50%" cy="28%" r="80%">
          <stop offset="0" stopColor={p.sea} />
          <stop offset="1" stopColor={p.seaDeep} />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${uid}-card)`}>
        <rect width={VIEW.w} height={VIEW.h} fill={`url(#${uid}-sea)`} />
        <g stroke={p.wave} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75">
          {WAVES.map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} q4 -4 8 0 q4 4 8 0`} />
          ))}
        </g>

        {/* Clouds drift on their own, and further when someone blows. */}
        {CLOUDS.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) scale(${c.scale})`}>
            <motion.g animate={{ x: wind * 16 }} transition={{ type: "spring", stiffness: 60, damping: 14 }}>
              <g className="hw-drift" style={{ animationDuration: c.duration }}>
                <path d={CLOUD} fill={p.cloud} />
              </g>
            </motion.g>
          </g>
        ))}

        <path d={ISLAND_FROM} fill={islands.from.land} stroke={p.shore} strokeWidth="5" strokeLinejoin="round" paintOrder="stroke" />
        <path d={ISLAND_TO} fill={islands.to.land} stroke={p.shore} strokeWidth="5" strokeLinejoin="round" paintOrder="stroke" />
        {BUSHES.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={islands[b.side].bush} />
        ))}
        <House at={HOMES.from} island={islands.from} p={p} glow={arrived} />
        <House at={HOMES.to} island={islands.to} p={p} glow={arrived} />
        <Name x={HOMES.from.x} y={HOMES.from.y + 24} island={islands.from} lettering={lettering}>
          {short(people.from)}
        </Name>
        <Name x={HOMES.to.x} y={HOMES.to.y + 24} island={islands.to} lettering={lettering}>
          {short(people.to)}
        </Name>
        <Ribbon x={67} y={264} island={islands.from} label={cities.from} />
        <Ribbon x={232} y={260} island={islands.to} label={cities.to} />

        {/* The flight path: all of it in faint dots, the part flown in the gift's colour. */}
        <path d={trk.path} fill="none" stroke={p.dots} strokeWidth="3.4" strokeLinecap="round" strokeDasharray="0.01 8" />
        <path d={trk.upTo(progress)} fill="none" stroke="var(--gift-accent)" strokeWidth="3.8" strokeLinecap="round" strokeDasharray="0.01 8" />

        {markers.map((m, i) => {
          const at = trk.at(m);
          const passed = progress >= m;
          return (
            <g key={i} transform={`translate(${at.x} ${at.y - 12})`}>
              <motion.path
                d={HEART}
                fill={passed ? "var(--gift-accent)" : "#ffffff"}
                stroke={passed ? "#ffffff" : "var(--gift-accent)"}
                strokeWidth="1.4"
                initial={false}
                animate={{ scale: passed ? 1.4 : 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 11 }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            </g>
          );
        })}

        {/* Home: the path becomes a heart. */}
        {arrived ? (
          <g transform={`translate(${apex.x} ${apex.y + 4})`}>
            <motion.path
              d={HEART}
              fill="var(--gift-accent)"
              stroke="#ffffff"
              strokeWidth="0.8"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 3.3, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 10, delay: 0.15 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          </g>
        ) : null}

        <g
          className="hw-plane outline-none"
          transform={`translate(${flyer.x} ${flyer.y}) rotate(${tilt})`}
          role="button"
          tabIndex={interactive ? 0 : -1}
          aria-label={planeLabel}
          onClick={interactive ? onPlaneTap : undefined}
          onKeyDown={onPlaneKey}
          style={{ cursor: interactive ? "pointer" : "default" }}
        >
          <circle r="26" fill="transparent" />
          <circle className="hw-ring" r="20" fill="none" stroke="var(--gift-accent)" strokeWidth="2" strokeDasharray="3 4" />
          {wind > 0.02 ? (
            <g stroke={p.planeInk} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity={Math.min(1, 0.3 + wind)}>
              <path className="hw-gust" d="M-19 -6 q-6 -2 -12 0" />
              <path className="hw-gust" d="M-21 1 q-7 -2 -15 0" style={{ animationDelay: "-0.18s" }} />
              <path className="hw-gust" d="M-19 8 q-6 -2 -12 0" style={{ animationDelay: "-0.36s" }} />
            </g>
          ) : null}
          <g className={arrived ? undefined : "hw-bob"}>
            <Vehicle kind={vehicle} ink={p.planeInk} />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** A perforated airmail stamp with a heart on it. */
export function Stamp({ p, label }: { p: Palette; label: string }) {
  const holes: [number, number][] = [];
  for (let x = 6; x <= 94; x += 8) holes.push([x, 2], [x, 118]);
  for (let y = 10; y <= 110; y += 8) holes.push([2, y], [98, y]);
  return (
    <svg viewBox="0 0 100 120" className="h-auto w-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.16)]" aria-hidden="true">
      <rect x="2" y="2" width="96" height="116" fill="#ffffff" />
      {holes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.2" fill={p.card} />
      ))}
      <rect x="11" y="11" width="78" height="98" rx="3" fill={p.sea} />
      <path d={HEART} transform="translate(50 50) scale(3.4)" fill="var(--gift-accent)" stroke="#ffffff" strokeWidth="0.6" />
      <text x="50" y="97" textAnchor="middle" fontSize="8.5" fontWeight="700" letterSpacing="1.4" fill={p.mapInk}>
        {label}
      </text>
    </svg>
  );
}

/** A round postmark: the two cities around the ring, the distance in the middle. */
export function Postmark({ ring, center }: { ring: string; center: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const color = "rgba(74,52,60,0.55)";
  return (
    <svg viewBox="0 0 150 100" className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        {/* Starts at the bottom and runs clockwise, so the middle of the path is the top of the ring. */}
        <path id={`${uid}-ring`} d="M50 83 A33 33 0 0 1 50 17 A33 33 0 0 1 50 83" />
      </defs>
      <g fill="none" stroke={color} strokeWidth="2">
        <circle cx="50" cy="50" r="45" />
        <circle cx="50" cy="50" r="24" />
        {[34, 50, 66].map((y) => (
          <path key={y} d={`M100 ${y} q6 -5 12 0 t12 0 t12 0`} strokeLinecap="round" />
        ))}
      </g>
      <text fill={color} fontSize="8.5" fontWeight="700" letterSpacing="1.2">
        <textPath href={`#${uid}-ring`} startOffset="50%" textAnchor="middle">
          {ring}
        </textPath>
      </text>
      <text x="50" y="54" textAnchor="middle" fill={color} fontSize="10.5" fontWeight="800">
        {center}
      </text>
    </svg>
  );
}
