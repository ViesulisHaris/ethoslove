"use client";

/**
 * The star chart: a card of dark paper with a foil-edged circle of engraved constellations. The
 * circle draws the sky the sender picked (heart, infinity, star) from the same `shapes` maths the
 * live starfield uses, so the card is a promise of the thing behind it. Their name and the number
 * of stars are pressed into the paper underneath in gold leaf. All --k, so it holds from a 390 x 600
 * poster to a laptop.
 */
import { useId, useMemo } from "react";
import { PAPER_GRAIN, POSTER_FONT } from "../_shared/cover-kit";
import { mulberry32 } from "../_shared/random";
import { sampleShape, shapeOutline, type ShapeKind } from "./shapes";

/** Gold leaf: the light runs across it, so the same fill reads as foil on an edge and on a letter. */
const FOIL = "linear-gradient(118deg, #8A6626 0%, #F3DDA2 20%, #FFF8E2 33%, #D8B25E 47%, #8A6626 60%, #F0D89C 78%, #C4983F 100%)";

export const CHART_KEYFRAMES = `
.cs-sheen{animation:cs-sheen 7s ease-in-out infinite}
@keyframes cs-sheen{0%,52%{transform:translateX(-150%) rotate(14deg)}86%,100%{transform:translateX(150%) rotate(14deg)}}
.cs-tw{animation:cs-tw 3.4s ease-in-out infinite alternate}
@keyframes cs-tw{from{opacity:.4}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.cs-sheen,.cs-tw{animation:none}}
`;

/** A four-point star, the engraver's kind: two crossed spikes with a soft core. */
function Spark({ x, y, r, fill, opacity = 1 }: { x: number; y: number; r: number; fill: string; opacity?: number }) {
  return (
    <path
      d={`M${x} ${y - r} Q${x + r * 0.16} ${y - r * 0.16} ${x + r} ${y} Q${x + r * 0.16} ${y + r * 0.16} ${x} ${y + r} Q${x - r * 0.16} ${y + r * 0.16} ${x - r} ${y} Q${x - r * 0.16} ${y - r * 0.16} ${x} ${y - r} Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

/** The engraved disc: rim ticks, a graticule, dust, and their shape joined up in gold. */
function ChartDisc({ shape, count, seed }: { shape: ShapeKind; count: number; seed: number }) {
  const id = useId().replace(/:/g, "");
  const C = 100;
  const R = 90;

  const dust = useMemo(() => {
    const rng = mulberry32(seed + 7);
    return Array.from({ length: 54 }, () => {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * (R - 8);
      return { x: C + Math.cos(a) * d, y: C + Math.sin(a) * d, r: 0.5 + rng() * 1.1, o: 0.25 + rng() * 0.55 };
    });
  }, [seed]);

  const toPx = (p: { x: number; y: number }) => ({ x: C + p.x * 58, y: C + p.y * 58 });
  const outline = useMemo(() => shapeOutline(shape, 132).map(toPx), [shape]);
  const nodes = useMemo(() => sampleShape(shape, Math.max(2, Math.min(count, 12))).map(toPx), [shape, count]);
  const outlinePath = outline.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  const joinPath = nodes.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-sky`} cx="42%" cy="34%">
          <stop offset="0" stopColor="#252B58" />
          <stop offset="0.55" stopColor="#141838" />
          <stop offset="1" stopColor="#080A1C" />
        </radialGradient>
        <linearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6626" />
          <stop offset="0.24" stopColor="#F3DDA2" />
          <stop offset="0.44" stopColor="#D8B25E" />
          <stop offset="0.68" stopColor="#FFF6DC" />
          <stop offset="1" stopColor="#A57C31" />
        </linearGradient>
        <clipPath id={`${id}-disc`}>
          <circle cx={C} cy={C} r={R - 4} />
        </clipPath>
      </defs>

      {/* the paper the disc is printed on, sunk into the card */}
      <circle cx={C} cy={C} r={R - 4} fill={`url(#${id}-sky)`} />
      <g clipPath={`url(#${id}-disc)`}>
        {dust.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#EAF0FF" opacity={d.o} />
        ))}
        {/* graticule: the chart's own lines of right ascension */}
        <g stroke={`url(#${id}-foil)`} fill="none" opacity="0.2">
          {[26, 50, 74].map((r) => (
            <circle key={r} cx={C} cy={C} r={r} strokeWidth="0.7" />
          ))}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <path key={i} d={`M${C - Math.cos(a) * 84} ${C - Math.sin(a) * 84} L${C + Math.cos(a) * 84} ${C + Math.sin(a) * 84}`} strokeWidth="0.55" />;
          })}
        </g>

        {/* their sky, engraved: the outline dashed, the stars joined with a solid line */}
        <path d={outlinePath} fill="none" stroke={`url(#${id}-foil)`} strokeWidth="1.05" strokeDasharray="2.2 3.4" opacity="0.62" />
        <path d={joinPath} fill="none" stroke={`url(#${id}-foil)`} strokeWidth="1.25" strokeLinejoin="round" opacity="0.8" />
        {nodes.map((p, i) => (
          <g key={i} className="cs-tw" style={{ animationDelay: `${(i * 0.41) % 3.4}s` }}>
            <circle cx={p.x} cy={p.y} r="4.6" fill="#FFE9B0" opacity="0.16" />
            <Spark x={p.x} y={p.y} r={i % 3 === 0 ? 6.2 : 4.6} fill="#FFF3CE" />
          </g>
        ))}
      </g>

      {/* the rim: two foil rules with engraved ticks between them */}
      <circle cx={C} cy={C} r={R - 4} fill="none" stroke={`url(#${id}-foil)`} strokeWidth="1.1" />
      <circle cx={C} cy={C} r={R} fill="none" stroke={`url(#${id}-foil)`} strokeWidth="1.6" />
      <g stroke={`url(#${id}-foil)`} strokeWidth="0.9" opacity="0.85">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const long = i % 5 === 0;
          const r1 = R - 3.4;
          const r2 = R - (long ? 0.6 : 1.8);
          return <path key={i} d={`M${C + Math.cos(a) * r1} ${C + Math.sin(a) * r1} L${C + Math.cos(a) * r2} ${C + Math.sin(a) * r2}`} />;
        })}
      </g>
      {/* north mark */}
      <path d={`M${C} ${C - R - 5} l3.4 5.6 -3.4 3 -3.4 -3 Z`} fill={`url(#${id}-foil)`} />
    </svg>
  );
}

export function StarChart({
  shape,
  count,
  seed,
  name,
  starsLabel,
}: {
  shape: ShapeKind;
  /** How many stars are in their sky: the photos they were given. */
  count: number;
  seed: number;
  name: string;
  starsLabel: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[calc(2.6*var(--k))] px-[calc(4.2*var(--k))] pt-[calc(4.2*var(--k))] pb-[calc(4*var(--k))]"
      style={{
        backgroundColor: "#0E1128",
        backgroundImage: "radial-gradient(76% 56% at 50% 26%, rgba(86,96,180,.32), transparent 72%)",
        boxShadow:
          "inset 0 0 0 calc(.4*var(--k)) rgba(226,196,126,.9), inset 0 0 0 calc(1.5*var(--k)) rgba(10,12,30,.95), inset 0 0 0 calc(1.9*var(--k)) rgba(226,196,126,.42), inset 0 calc(.5*var(--k)) calc(2*var(--k)) rgba(255,255,255,.07), 0 calc(2.4*var(--k)) calc(5.5*var(--k)) rgba(0,0,0,.55)",
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.45 }} />

      <div className="relative mx-auto w-full" style={{ aspectRatio: "1 / 1" }}>
        <ChartDisc shape={shape} count={count} seed={seed} />
      </div>

      <p
        className="relative mt-[calc(3.2*var(--k))] text-center text-[calc(5.2*var(--k))] leading-[1.12] text-balance italic [overflow-wrap:anywhere]"
        style={{
          fontFamily: POSTER_FONT,
          backgroundImage: FOIL,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: "0 calc(.28*var(--k)) 0 rgba(0,0,0,.5)",
        }}
      >
        {name}
      </p>
      <p
        className="relative mt-[calc(1.5*var(--k))] text-center text-[calc(2.2*var(--k))] leading-none tracking-[0.36em] uppercase"
        style={{ fontFamily: POSTER_FONT, color: "rgba(226,196,126,.78)" }}
      >
        {starsLabel}
      </p>

      {/* the light running across the foil */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-[-40%] left-0 w-[46%] mix-blend-screen">
        <span
          className="cs-sheen block h-full w-full blur-[calc(1.8*var(--k))]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,246,214,.09) 38%, rgba(255,255,255,.18) 50%, rgba(255,246,214,.09) 62%, transparent)" }}
        />
      </span>
    </div>
  );
}
