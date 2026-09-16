"use client";

/**
 * The handheld: a soft-plastic console in blush and mint that holds the game's canvas behind
 * glass, plus the pixel hearts and coins that drift over the page around it. Everything is CSS
 * and SVG drawn here and sized in --k, so the same shell reads on a phone, a laptop and a
 * 390 × 600 poster. The shell only frames the screen: the canvas, its aspect ratio and its
 * pointer handlers stay with the game.
 */
import type { ReactNode } from "react";
import { POSTER_FONT } from "../_shared/cover-kit";

const SHELL = "#F7C8D2";
const VISOR = "#343B58";
const MINT = "#C2E5D4";
const MINT_DEEP = "#8CC7AE";
const PLUM = "#574670";
const ROSE = "#E58099";
const PRINT = "rgba(120,62,92,.6)";

export const ARCADE_KEYFRAMES = `
.ar-blink{animation:ar-blink 1.1s steps(1,end) infinite}
@keyframes ar-blink{0%,54%{opacity:1}55%,100%{opacity:0}}
.ar-led{animation:ar-led 2.6s ease-in-out infinite}
@keyframes ar-led{0%,100%{opacity:.5}50%{opacity:1}}
.ar-drift{animation:ar-drift 8.5s ease-in-out infinite alternate}
@keyframes ar-drift{from{transform:translateY(calc(2.5*var(--k))) rotate(-7deg)}to{transform:translateY(calc(-3.5*var(--k))) rotate(7deg)}}
@media (prefers-reduced-motion: reduce){.ar-blink,.ar-led,.ar-drift{animation:none}}
`;

/** Sprites on a pixel grid: one character per pixel, so they stay square at any size. */
const SPRITES = {
  heart: {
    rows: [" ## ## ", "#ss####", "#######", " ##### ", "  ###  ", "   #   "],
    ink: { "#": "#E4607E", s: "#FFB9C8" } as Record<string, string>,
  },
  coin: {
    rows: ["  ###  ", " #soo# ", "#oo#oo#", "#o###o#", "#oo#oo#", " #ooo# ", "  ###  "],
    ink: { "#": "#C78D2B", o: "#F7D978", s: "#FFF3CE" } as Record<string, string>,
  },
} as const;

export type SpriteId = keyof typeof SPRITES;

export function PixelSprite({ id }: { id: SpriteId }) {
  const { rows, ink } = SPRITES[id];
  const w = rows[0].length;
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} className="h-full w-full" aria-hidden="true" style={{ shapeRendering: "crispEdges" }}>
      {rows.flatMap((row, y) =>
        row.split("").map((c, x) => (ink[c] ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={ink[c]} /> : null)),
      )}
    </svg>
  );
}

/** Centres in % of the frame, widths in --k: hearts and coins drifting behind the console. */
const DRIFT: { id: SpriteId; x: number; y: number; size: number; delay: number }[] = [
  { id: "heart", x: 6, y: 16, size: 7, delay: 0 },
  { id: "coin", x: 93, y: 24, size: 6.5, delay: 1.4 },
  { id: "coin", x: 12, y: 62, size: 5.5, delay: 2.6 },
  { id: "heart", x: 95, y: 58, size: 6, delay: 0.7 },
  { id: "heart", x: 4, y: 82, size: 5.5, delay: 3.2 },
  { id: "coin", x: 88, y: 88, size: 7, delay: 2 },
  { id: "coin", x: 22, y: 6, size: 5, delay: 1.1 },
  { id: "heart", x: 74, y: 5, size: 6, delay: 3.6 },
];

export function PixelDrift() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {DRIFT.map((d, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: `calc(${d.size} * var(--k))`, aspectRatio: "1", transform: "translate(-50%, -50%)", opacity: 0.85 }}
        >
          <div className="ar-drift h-full w-full" style={{ animationDelay: `${d.delay}s`, filter: "drop-shadow(0 calc(.4*var(--k)) calc(.6*var(--k)) rgba(110,60,90,.28))" }}>
            <PixelSprite id={d.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DPad() {
  const arm = {
    backgroundColor: PLUM,
    boxShadow: "inset 0 calc(.6*var(--k)) 0 rgba(255,255,255,.26), inset 0 calc(-.7*var(--k)) 0 rgba(0,0,0,.3)",
  };
  return (
    <div className="relative size-[calc(17*var(--k))]" aria-hidden="true" style={{ filter: "drop-shadow(0 calc(.7*var(--k)) calc(1*var(--k)) rgba(120,60,90,.35))" }}>
      <span className="absolute top-0 left-[33.5%] h-full w-[33%] rounded-[calc(1.2*var(--k))]" style={arm} />
      <span className="absolute top-[33.5%] left-0 h-[33%] w-full rounded-[calc(1.2*var(--k))]" style={arm} />
      <span className="absolute top-1/2 left-1/2 size-[calc(4.6*var(--k))] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: "rgba(0,0,0,.24)" }} />
    </div>
  );
}

function ActionButtons() {
  return (
    <div className="flex items-center gap-[calc(2.6*var(--k))] rotate-[-18deg]" aria-hidden="true">
      {["B", "A"].map((l) => (
        <span
          key={l}
          className="grid size-[calc(9.6*var(--k))] place-items-center rounded-full text-[calc(2.4*var(--k))] font-bold"
          style={{
            backgroundColor: ROSE,
            color: "#FFF4F7",
            boxShadow:
              "inset 0 calc(.9*var(--k)) 0 rgba(255,255,255,.5), inset 0 calc(-1*var(--k)) 0 rgba(120,40,70,.35), 0 calc(.8*var(--k)) calc(1.4*var(--k)) rgba(120,60,90,.32)",
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

function Grille() {
  return (
    <div className="flex gap-[calc(1.2*var(--k))] rotate-[-24deg]" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className="h-[calc(7*var(--k))] w-[calc(1.1*var(--k))] rounded-full"
          style={{ backgroundColor: "rgba(140,72,104,.26)", boxShadow: "inset 0 0 0 calc(.16*var(--k)) rgba(255,255,255,.5)" }}
        />
      ))}
    </div>
  );
}

function Nubs() {
  return (
    <div className="flex gap-[calc(2.4*var(--k))] rotate-[-12deg]" aria-hidden="true">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="h-[calc(2.4*var(--k))] w-[calc(8*var(--k))] rounded-full"
          style={{ backgroundColor: PLUM, boxShadow: "inset 0 calc(.4*var(--k)) 0 rgba(255,255,255,.22), 0 calc(.5*var(--k)) calc(.8*var(--k)) rgba(120,60,90,.3)" }}
        />
      ))}
    </div>
  );
}

/**
 * The console. `children` is the screen well (the game's own canvas box, untouched), `meta` sits
 * beside the power light, `chin` holds the CRT switch.
 */
export function Console({
  name,
  forLabel,
  meta,
  chin,
  children,
}: {
  name: string;
  forLabel: string;
  meta: ReactNode;
  chin: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="relative w-[calc(78*var(--k))] rounded-t-[calc(6*var(--k))] rounded-b-[calc(17*var(--k))] px-[calc(5*var(--k))] pt-[calc(5*var(--k))] pb-[calc(5.5*var(--k))]"
      style={{
        backgroundColor: SHELL,
        backgroundImage:
          "linear-gradient(168deg, rgba(255,255,255,.62), rgba(255,255,255,0) 34%), linear-gradient(0deg, rgba(134,66,98,.2), rgba(0,0,0,0) 26%)",
        boxShadow:
          "inset 0 calc(.9*var(--k)) 0 rgba(255,255,255,.75), inset 0 calc(-1.6*var(--k)) 0 rgba(150,80,112,.28), inset calc(.8*var(--k)) 0 0 rgba(255,255,255,.35), 0 calc(3.4*var(--k)) calc(6*var(--k)) rgba(96,52,82,.3)",
      }}
    >
      {/* visor: the dark plate the glass sits in */}
      <div
        className="rounded-[calc(3*var(--k))] px-[calc(3.4*var(--k))] pt-[calc(2.4*var(--k))] pb-[calc(3.4*var(--k))]"
        style={{
          backgroundColor: VISOR,
          backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.18))",
          boxShadow: "inset 0 calc(.8*var(--k)) calc(1.4*var(--k)) rgba(0,0,0,.5), 0 calc(.4*var(--k)) 0 rgba(255,255,255,.55)",
        }}
      >
        <div className="mb-[calc(2*var(--k))] flex items-center justify-between gap-[calc(2*var(--k))]">
          <span className="flex items-center gap-[calc(1.3*var(--k))]">
            <span
              aria-hidden="true"
              className="ar-led block size-[calc(1.9*var(--k))] rounded-full"
              style={{ backgroundColor: "#7CF0B4", boxShadow: "0 0 calc(2*var(--k)) rgba(124,240,180,.9)" }}
            />
            <span className="text-[calc(1.8*var(--k))] tracking-[0.3em] text-white/50">ON</span>
          </span>
          {meta}
        </div>
        {children}
      </div>

      {/* the label printed on the shell */}
      <div
        className="mx-auto mt-[calc(3.4*var(--k))] w-fit max-w-full rounded-[calc(1.6*var(--k))] px-[calc(3.6*var(--k))] pt-[calc(1*var(--k))] pb-[calc(1.4*var(--k))] text-center"
        style={{
          backgroundColor: "#FFFAF3",
          boxShadow: "inset 0 0 0 calc(.28*var(--k)) rgba(150,82,114,.4), 0 calc(.6*var(--k)) calc(1.2*var(--k)) rgba(120,60,90,.2)",
        }}
      >
        <p className="text-[calc(1.8*var(--k))] leading-none tracking-[0.36em] uppercase" style={{ fontFamily: POSTER_FONT, color: PRINT }}>
          {forLabel}
        </p>
        <p className="mt-[calc(.5*var(--k))] text-[calc(4.9*var(--k))] leading-[1.05] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", color: "#4A2A3C" }}>
          {name}
        </p>
      </div>

      {/* controls */}
      <div className="mt-[calc(3.2*var(--k))] flex items-center justify-between">
        <DPad />
        <ActionButtons />
      </div>
      <div className="mt-[calc(2.6*var(--k))] flex items-end justify-between gap-[calc(2*var(--k))]">
        {chin}
        <Nubs />
        <Grille />
      </div>

      <span aria-hidden="true" className="pointer-events-none absolute inset-x-[18%] bottom-[calc(1.4*var(--k))] h-[calc(.4*var(--k))] rounded-full" style={{ backgroundColor: "rgba(255,255,255,.5)" }} />
    </div>
  );
}

export { MINT, MINT_DEEP, PRINT, VISOR };
