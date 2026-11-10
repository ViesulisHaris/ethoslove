"use client";

import { useId, useMemo, type CSSProperties } from "react";
import { mulberry32 } from "../random";
import { SCRIPT_FONT } from "../cover-kit";

/**
 * What the holiday gifts of November 2026 are made of, so they look like things and not like
 * drawings: paper that has been crumpled, linen with a weave, wood with a grain, parchment that has
 * aged, satin that catches the light, and the soft discs a camera makes of lights out of focus.
 *
 * The textures are SVG lighting filters rendered by the browser into a background image (a relief
 * made of noise, lit from the top left), so nothing is downloaded and every one is the same on
 * every phone. Lay them over a colour with the blend mode each one names.
 */

const svg = (body: string, size = 400) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${body}</svg>`)}")`;

/** A sheet that has been crumpled and smoothed out again: soft ridges, lit from the top left. Overlay it. */
export const CRUMPLE = svg(
  "<filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.007' numOctaves='5' seed='11' stitchTiles='stitch'/><feDiffuseLighting lighting-color='#fff' surfaceScale='6' diffuseConstant='1.05'><feDistantLight azimuth='225' elevation='52'/></feDiffuseLighting></filter><rect width='100%' height='100%' filter='url(#f)'/>",
  420,
);

/** Fine creases on top of the crumple: the paper's own small folds. Overlay it, quieter. */
export const CREASE = svg(
  "<filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.03' numOctaves='3' seed='4' stitchTiles='stitch'/><feDiffuseLighting lighting-color='#fff' surfaceScale='1.6' diffuseConstant='1'><feDistantLight azimuth='225' elevation='60'/></feDiffuseLighting></filter><rect width='100%' height='100%' filter='url(#f)'/>",
  300,
);

/** Linen: threads across and threads down, slightly uneven. Multiply it over the cloth. */
export const LINEN = svg(
  "<filter id='a'><feTurbulence type='fractalNoise' baseFrequency='0.9 0.035' numOctaves='2' seed='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.5 -0.08'/></filter><filter id='b'><feTurbulence type='fractalNoise' baseFrequency='0.035 0.9' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.45 -0.08'/></filter><rect width='100%' height='100%' filter='url(#a)'/><rect width='100%' height='100%' filter='url(#b)'/>",
  240,
);

/** Wood grain running across: long streaks and the odd knot. Multiply it over a wood colour. */
export const WOOD = svg(
  "<filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.0035 0.11' numOctaves='4' seed='8' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.14  0 0 0 0 0.06  0 0 0 1.1 -0.32'/></filter><rect width='100%' height='100%' filter='url(#w)'/>",
  520,
);

/** The marks of age on parchment: clouds of tea-coloured staining. Multiply it. */
export const STAINS = svg(
  "<filter id='s'><feTurbulence type='fractalNoise' baseFrequency='0.011' numOctaves='4' seed='21' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.38  0 0 0 0 0.18  0 0 0 1.4 -0.62'/></filter><rect width='100%' height='100%' filter='url(#s)'/>",
  480,
);

/** Paper fibre, finer than the grain every gift already has. Multiply it. */
export const FIBRE = svg(
  "<filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.65 0.95' numOctaves='3' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.35 -0.05'/></filter><rect width='100%' height='100%' filter='url(#p)'/>",
  220,
);

/** Mixes two hex colours: `t` of the way from `a` to `b`. For shading a colour the sender picked. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const x = h.replace("#", "");
    const v = x.length === 3 ? x.split("").map((c) => c + c).join("") : x.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const [ca, cb] = [p(a), p(b)];
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Gold foil, as a fill for type: a metal gradient that a slow sheen runs across. Needs FOIL_KEYFRAMES on the page. */
export const FOIL: CSSProperties = {
  backgroundImage: "linear-gradient(115deg, #7a4c10 0%, #c9962f 18%, #f7e3a0 34%, #d9a840 48%, #8f6216 64%, #ecc867 80%, #a8771e 100%)",
  backgroundSize: "240% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "hol-foil 6s ease-in-out infinite alternate",
};
/** Gold foil for light paper: the same metal, deeper, so it still reads on cream. */
export const FOIL_ON_LIGHT: CSSProperties = {
  ...FOIL,
  backgroundImage: "linear-gradient(115deg, #6a4208 0%, #a8781c 18%, #e6bb55 34%, #9a6a14 50%, #5e3a06 66%, #c99a32 82%, #7a5010 100%)",
};

export const FOIL_KEYFRAMES = "@keyframes hol-foil{from{background-position:0% 50%}to{background-position:100% 50%}}@media (prefers-reduced-motion: reduce){*{--hol-foil:none}}";

/** Satin ribbon across its width: dark at the folds, a bright band where the light catches it. */
export function satin(color: string, angle = 90): string {
  return `linear-gradient(${angle}deg, rgba(0,0,0,.32) 0%, rgba(0,0,0,.05) 14%, rgba(255,255,255,.08) 30%, rgba(255,255,255,.55) 42%, rgba(255,255,255,.12) 52%, rgba(0,0,0,.04) 70%, rgba(255,255,255,.18) 82%, rgba(0,0,0,.34) 100%), ${color}`;
}

/** A material laid over whatever is under it: one texture, one blend, one strength. */
export function Texture({ image, blend, opacity, size, className }: { image: string; blend: CSSProperties["mixBlendMode"]; opacity: number; size?: string; className?: string }) {
  return <div aria-hidden="true" className={className ?? "pointer-events-none absolute inset-0 rounded-[inherit]"} style={{ backgroundImage: image, backgroundSize: size, mixBlendMode: blend, opacity }} />;
}

/**
 * Lights out of focus, the way a lens draws them: soft discs, brightest at the rim of the ones
 * nearest, added onto the dark with a screen blend so they glow rather than sit on top. Seeded, so
 * the room is the same every time it is opened; a slow shimmer unless motion is turned down.
 */
export function Bokeh({ colors, count = 18, seed = 7, top = 0, bottom = 100, still = false, strength = 1 }: { colors: string[]; count?: number; seed?: number; top?: number; bottom?: number; still?: boolean; strength?: number }) {
  const id = useId().replace(/:/g, "");
  const lights = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      const near = rnd();
      return {
        x: rnd() * 100,
        y: top + rnd() * (bottom - top),
        size: 3 + near * 13,
        blur: 0.6 + (1 - near) * 2.2,
        alpha: (0.22 + rnd() * 0.5) * strength,
        color: colors[i % colors.length],
        delay: rnd() * 6,
        ring: near > 0.55,
      };
    });
  }, [colors, count, seed, top, bottom, strength]);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ mixBlendMode: "screen" }}>
      <style>{`.bk-${id}{animation:bk-${id} 7s ease-in-out infinite alternate}@keyframes bk-${id}{from{opacity:var(--a)}to{opacity:calc(var(--a)*.55)}}@media (prefers-reduced-motion: reduce){.bk-${id}{animation:none}}`}</style>
      {lights.map((l, i) => (
        <span
          key={i}
          className={still ? undefined : `bk-${id}`}
          style={
            {
              position: "absolute",
              left: `${l.x}%`,
              top: `${l.y}%`,
              width: `calc(${l.size} * var(--u))`,
              height: `calc(${l.size} * var(--u))`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: l.ring
                ? `radial-gradient(circle, ${l.color}55 0%, ${l.color}66 58%, ${l.color} 68%, ${l.color}00 74%)`
                : `radial-gradient(circle, ${l.color} 0%, ${l.color}aa 38%, ${l.color}00 70%)`,
              filter: `blur(calc(${l.blur} * var(--u) * .25))`,
              opacity: l.alpha,
              "--a": l.alpha,
              animationDelay: `-${l.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * A light from above and to the left falling on a rounded thing drawn in SVG (a bone, a roller, a
 * handle): the shape's own edges are blurred into a relief, lit for its shading and for a glint,
 * and both are laid back over its colour. Put the returned id in a `filter` attribute.
 */
export function RoundLight({ id, soft = 1.4, glint = 0.85, exponent = 26, depth = 1, light = { x: 25, y: -40, z: 70 } }: { id: string; soft?: number; glint?: number; exponent?: number; depth?: number; light?: { x: number; y: number; z: number } }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={soft} result="relief" />
      <feDiffuseLighting in="relief" surfaceScale="3.2" diffuseConstant="1.15" lightingColor="#ffffff" result="diffuse">
        <feDistantLight azimuth="235" elevation="48" />
      </feDiffuseLighting>
      <feComposite in="diffuse" in2="SourceAlpha" operator="in" result="shade" />
      <feComposite in="SourceGraphic" in2="shade" operator="arithmetic" k1={depth} k2={1 - depth} k3="0" k4="0" result="shaded" />
      <feSpecularLighting in="relief" surfaceScale="3.2" specularConstant={glint} specularExponent={exponent} lightingColor="#ffffff" result="spec">
        <fePointLight x={light.x} y={light.y} z={light.z} />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="glint" />
      <feComposite in="shaded" in2="glint" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
    </filter>
  );
}

/** A tag of heavy card on a thread, hanging off the ribbon. */
export function CardTag({ text, className = "absolute top-[50%] right-[3%] w-[44%] origin-top-left -rotate-[8deg]" }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 40 12" aria-hidden="true" className="absolute -top-[52%] -left-[8%] w-[34%] overflow-visible">
        <path d="M2 2 C 10 8, 22 12, 38 11" fill="none" stroke="#e9dcc4" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <div className="relative rounded-[calc(.6*var(--k))] py-[calc(1.2*var(--k))] pr-[calc(2.2*var(--k))] pl-[calc(4.6*var(--k))] [clip-path:polygon(12%_0,100%_0,100%_100%,12%_100%,0_50%)]" style={{ background: "linear-gradient(160deg, #fbf4e6, #ecdfc6)", boxShadow: "0 calc(.6*var(--k)) calc(1.6*var(--k)) rgba(0,0,0,.35)" }}>
        <Texture image={FIBRE} blend="multiply" opacity={0.6} size="calc(20*var(--k))" />
        <span aria-hidden="true" className="absolute top-1/2 left-[6%] h-[calc(1.4*var(--k))] w-[calc(1.4*var(--k))] -translate-y-1/2 rounded-full" style={{ background: "#3a2a1a", boxShadow: "inset 0 1px 1px rgba(0,0,0,.6), 0 0 0 calc(.35*var(--k)) #c9a35a" }} />
        <p className="relative truncate" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(4*var(--k))", color: "#3a2416" }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * A satin bow, tied: two loops and two tails cut in a V, shaded from the ribbon's own colour (lit
 * on the top of each loop, deep inside the fold) with a sheen along the loops, and no outline.
 */
export function SatinBow({ color, className }: { color: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const lit = mix(color, "#ffffff", 0.45);
  const mid = color;
  const deep = mix(color, "#000000", 0.38);
  const fold = mix(color, "#000000", 0.55);
  return (
    <svg viewBox="0 0 120 84" aria-hidden="true" className={className} style={{ filter: "drop-shadow(0 calc(.8*var(--k)) calc(1*var(--k)) rgba(0,0,0,.4))" }}>
      <defs>
        <linearGradient id={`l${id}`} x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor={lit} />
          <stop offset=".45" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`r${id}`} x1="1" y1="0" x2=".7" y2="1">
          <stop offset="0" stopColor={mix(color, "#ffffff", 0.3)} />
          <stop offset=".5" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={deep} />
          <stop offset=".35" stopColor={mid} />
          <stop offset="1" stopColor={mix(color, "#000000", 0.2)} />
        </linearGradient>
        <radialGradient id={`k${id}`} cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor={lit} />
          <stop offset=".6" stopColor={mid} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
        <filter id={`s${id}`}>
          <feGaussianBlur stdDeviation=".7" />
        </filter>
      </defs>
      {/* tails */}
      <path d="M55 44 C 50 56, 42 68, 34 80 L 42 77 L 45 84 C 52 70, 58 58, 61 46 Z" fill={`url(#t${id})`} />
      <path d="M65 44 C 70 56, 78 68, 86 80 L 78 77 L 75 84 C 68 70, 62 58, 59 46 Z" fill={`url(#t${id})`} />
      {/* loops, with the shadow deep inside each fold */}
      <path d="M60 38 C 46 18, 18 4, 8 16 C -1 28, 14 46, 34 46 C 44 46, 54 43, 60 40 Z" fill={`url(#l${id})`} />
      <path d="M60 38 C 50 30, 32 24, 24 28 C 32 34, 46 38, 58 41 Z" fill={fold} opacity=".55" filter={`url(#s${id})`} />
      <path d="M60 38 C 74 18, 102 4, 112 16 C 121 28, 106 46, 86 46 C 76 46, 66 43, 60 40 Z" fill={`url(#r${id})`} />
      <path d="M60 38 C 70 30, 88 24, 96 28 C 88 34, 74 38, 62 41 Z" fill={fold} opacity=".55" filter={`url(#s${id})`} />
      {/* the sheen along the top of each loop */}
      <path d="M14 14 C 24 8, 40 14, 52 28" fill="none" stroke="#ffffff" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round" filter={`url(#s${id})`} />
      <path d="M106 14 C 96 8, 80 14, 68 28" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth="2.2" strokeLinecap="round" filter={`url(#s${id})`} />
      {/* the knot */}
      <rect x="51" y="30" width="18" height="17" rx="6" fill={`url(#k${id})`} />
      <path d="M54 34 C 57 32, 62 32, 66 34" fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** The candle flame and its glow, alive: put these on the page with Candle. */
export const CANDLE_KEYFRAMES = ".hol-flame{animation:hol-fl 1.6s ease-in-out infinite alternate}@keyframes hol-fl{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(.94,1.06) skewX(2deg)}100%{transform:scale(1.03,.97) skewX(-2deg)}}.hol-glow{animation:hol-gl 2.4s ease-in-out infinite alternate}@keyframes hol-gl{from{opacity:.85}to{opacity:1}}@media (prefers-reduced-motion: reduce){.hol-flame,.hol-glow{animation:none}}";

/** A brass candlestick with a cream candle and its flame, and the warm light it throws. */
export function Candle({ still }: { still: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <div aria-hidden="true" className="relative h-full w-full">
      <div className={still ? "absolute" : "hol-glow absolute"} style={{ left: "50%", top: "10%", width: "260%", height: "130%", transform: "translate(-50%, -50%)", background: "radial-gradient(closest-side, rgba(255,200,120,.45), rgba(255,170,80,.16) 45%, transparent 75%)" }} />
      <svg viewBox="0 0 40 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`c${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#d9cbb0" />
            <stop offset=".35" stopColor="#fbf3e2" />
            <stop offset="1" stopColor="#bfae90" />
          </linearGradient>
          <linearGradient id={`b${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#5a3a0c" />
            <stop offset=".3" stopColor="#f2d58c" />
            <stop offset=".55" stopColor="#c99a3e" />
            <stop offset="1" stopColor="#4a3008" />
          </linearGradient>
          <radialGradient id={`f${id}`} cx=".5" cy=".7" r=".6">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".35" stopColor="#fff2b8" />
            <stop offset=".75" stopColor="#ffb347" />
            <stop offset="1" stopColor="#ff8a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className={still ? undefined : "hol-flame"} style={{ transformOrigin: "20px 22px" }}>
          <path d="M20 4 C 24 12, 25 17, 20 22 C 15 17, 16 12, 20 4 Z" fill={`url(#f${id})`} />
        </g>
        <path d="M20 21v4" stroke="#2a1a0a" strokeWidth="1" />
        <rect x="14" y="24" width="12" height="44" rx="1.5" fill={`url(#c${id})`} />
        <path d="M14 26 C 16 25, 18 27, 20 26 C 22 25, 24 27, 26 26 L 26 30 C 25 33, 24 31, 23.5 34 C 23 31, 22 32, 21.5 29 L 14 28 Z" fill="#fbf3e2" opacity=".9" />
        <path d="M8 70 C 8 66, 32 66, 32 70 L 30 72 L 10 72 Z" fill={`url(#b${id})`} />
        <rect x="17" y="72" width="6" height="14" fill={`url(#b${id})`} />
        <ellipse cx="20" cy="92" rx="16" ry="5" fill={`url(#b${id})`} />
        <ellipse cx="20" cy="90" rx="13" ry="3" fill="#f6dc94" opacity=".55" />
      </svg>
    </div>
  );
}
