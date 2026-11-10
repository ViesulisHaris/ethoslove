"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, type CSSProperties } from "react";
import { useContainerSize } from "../hooks/use-container-size";
import { mulberry32 } from "../random";

/**
 * How the holiday gifts of November 2026 are put on the screen. Their pictures are rendered in
 * Blender (scripts/art/holiday): a plate, which is the whole table and everything that never moves
 * on it, and sprites, each one thing with its own shadow. Both are drawn from the same camera, so a
 * sprite laid over the plate at the place its map gives sits exactly where it was modelled.
 *
 * Everything is placed on the stage: 100 units across and 170 down (the gift's --k), in the middle
 * of the screen. The plate runs well past it on every side, for tall phones and wide screens.
 */

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type Point = { readonly x: number; readonly y: number };

/** A length down the stage (170 units) as a share of its height. Across it, a unit is simply 1%. */
export const down = (units: number) => `${(units / 170) * 100}%`;

/** The stage box itself: put on a div inside the gift's root, which must define --k. */
export const STAGE: CSSProperties = { position: "absolute", top: "50%", left: "50%", width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" };

export const STAGE_KEYFRAMES = `
.hol-tw{animation:hol-tw var(--d,3s) ease-in-out var(--o,0s) infinite alternate}
@keyframes hol-tw{from{opacity:.42;transform:translate(-50%,-50%) scale(.94)}to{opacity:.8;transform:translate(-50%,-50%) scale(1.08)}}
.hol-spark{animation:hol-spark .95s cubic-bezier(.15,.7,.3,1) forwards}
@keyframes hol-spark{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}18%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(var(--r))}}
@media (prefers-reduced-motion: reduce){.hol-tw{animation:none;opacity:.5}.hol-spark{animation:none;opacity:0}}
`;

const PLATE_W = 160;
const PLATE_H = 240;

/**
 * The table. On a phone it is the plate's middle; on anything wider the wide plate, and past its
 * edges a mirrored copy either side, so the table runs to the edge of any screen. The fairy
 * lights in the picture are still; a small glow over each one breathes.
 */
export function Plate({ base, look, floor, bulbs, still, shade, glow = "255,208,138" }: { base: string; look: string; floor: string; bulbs?: readonly (readonly [number, number])[]; still?: boolean; shade?: string; glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useContainerSize(ref);
  const k = Math.min(size.width / 100, size.height * 0.006, size.height * 0.005);
  const wide = size.ready && size.width > 100 * k + 2;
  const beyond = size.ready && size.width > PLATE_W * k + 2;
  const box: CSSProperties = { position: "absolute", top: down((170 - PLATE_H) / 2), height: down(PLATE_H), width: `${PLATE_W}%`, maxWidth: "none" };
  const lit = useMemo(() => {
    const rnd = mulberry32(11);
    return (bulbs ?? []).map(([x, y]) => ({ x, y, d: 4.5 + rnd() * 4, o: -rnd() * 8 }));
  }, [bulbs]);
  const reach = wide ? (PLATE_W - 100) / 2 + 4 : 4;
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: floor }}>
      <div style={STAGE}>
        {beyond
          ? [-1, 1].map((side) => (
              <img key={side} src={`${base}plate-${look}-wide.webp`} alt="" draggable={false} style={{ ...box, left: side < 0 ? `${-(PLATE_W - 100) / 2 - PLATE_W}%` : `${100 + (PLATE_W - 100) / 2}%`, transform: "scaleX(-1)" }} />
            ))
          : null}
        <picture>
          <source media="(min-width: 700px)" srcSet={`${base}plate-${look}-wide.webp`} />
          <img src={`${base}plate-${look}-phone.webp`} alt="" draggable={false} style={{ ...box, left: `${-(PLATE_W - 100) / 2}%`, objectFit: "contain" }} />
        </picture>
        {lit
          .filter((b) => b.x > -reach && b.x < 100 + reach)
          .map((b, i) => (
            <span
              key={i}
              className={still ? undefined : "hol-tw"}
              style={
                {
                  position: "absolute",
                  left: `${b.x}%`,
                  top: down(b.y),
                  width: "calc(9 * var(--k))",
                  height: "calc(9 * var(--k))",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, rgba(${glow},.85) 0%, rgba(${glow},.34) 28%, rgba(${glow},0) 68%)`,
                  opacity: still ? 0.5 : undefined,
                  "--d": `${b.d}s`,
                  "--o": `${b.o}s`,
                } as CSSProperties
              }
            />
          ))}
      </div>
      {shade ? <div className="absolute inset-0" style={{ background: shade }} /> : null}
    </div>
  );
}

/** One rendered thing, laid on the stage where its map says. Its height follows from its width. */
export function Sprite({ base, name, rect, className, style }: { base: string; name: string; rect: Rect; className?: string; style?: CSSProperties }) {
  return <img src={`${base}${name}.webp`} alt="" draggable={false} className={className} style={{ position: "absolute", left: `${rect.x}%`, top: down(rect.y), width: `${rect.w}%`, height: down(rect.h), maxWidth: "none", pointerEvents: "none", userSelect: "none", ...style }} />;
}

/** A rectangle on the stage, as the style of a box laid on it. */
export const laid = (rect: Rect): CSSProperties => ({ position: "absolute", left: `${rect.x}%`, top: down(rect.y), width: `${rect.w}%`, height: down(rect.h) });

/**
 * A puff of gold from a point on the stage: flecks thrown outward and gone. Seen from above, they
 * scatter over the table rather than fall. Give it a new `key` to throw again.
 */
export function Sparks({ at, count = 16, reach = 34, colors = ["#ffd98a", "#fff3cf", "#f2b84b", "#ffffff"], seed = 3 }: { at: Point; count?: number; reach?: number; colors?: string[]; seed?: number }) {
  const flecks = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      const a = (Math.PI * 2 * i) / count + rnd() * 0.6;
      const r = reach * (0.45 + rnd() * 0.55);
      return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.94, size: 1.2 + rnd() * 1.8, rot: Math.round(rnd() * 360), color: colors[i % colors.length], star: i % 3 === 0, delay: rnd() * 0.12 };
    });
  }, [count, reach, colors, seed]);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${at.x}%`, top: down(at.y), width: 0, height: 0 }}>
      {flecks.map((f, i) => (
        <span
          key={i}
          className="hol-spark"
          style={
            {
              position: "absolute",
              width: `calc(${f.size} * var(--k))`,
              height: `calc(${f.size} * var(--k))`,
              background: f.color,
              borderRadius: f.star ? 0 : "50%",
              clipPath: f.star ? "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : undefined,
              boxShadow: f.star ? undefined : `0 0 calc(1.2 * var(--k)) ${f.color}`,
              opacity: 0,
              animationDelay: `${f.delay}s`,
              "--dx": `calc(${f.dx.toFixed(1)} * var(--k))`,
              "--dy": `calc(${f.dy.toFixed(1)} * var(--k))`,
              "--r": `${f.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** The table again, out of focus (rendered that way: every light a disc), for the letter to be read over. */
export function SoftTable({ base, look, floor, shade }: { base: string; look: string; floor: string; shade: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: floor }}>
      <picture>
        <source media="(min-width: 700px)" srcSet={`${base}soft-${look}-wide.webp`} />
        <img src={`${base}soft-${look}-phone.webp`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0" style={{ background: shade }} />
    </div>
  );
}
