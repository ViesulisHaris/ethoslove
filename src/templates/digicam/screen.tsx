"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { outline, pathOf, rasterize, wrap } from "./pixel-font";

/**
 * What the camera's screen shows. The screen is a container, 150 of its pixels across (`--px`), so
 * everything on it is laid out in the screen's own pixels and scales with the camera.
 */
export const SCREEN_COLS = 150;
const PX = `calc(100cqw / ${SCREEN_COLS})`;
const OSD = "#F4F6F8";
const EDGE = "rgba(8,10,14,.82)";

/**
 * Text in the screen's pixel type, `scale` screen pixels to a font pixel, with the dark edge a
 * camera draws round its on-screen text. Anything the bitmap font can't draw (an emoji, another
 * alphabet) is set in a monospace font instead, so no caption ever goes missing.
 */
export function PixelText({ lines, scale = 1, color = OSD, edge = EDGE, align = "left", label, className, style }: { lines: string[]; scale?: number; color?: string; edge?: string | null; align?: "left" | "center"; label?: string; className?: string; style?: CSSProperties }) {
  const bitmap = rasterize(lines, align);
  const unit = scale === 1 ? PX : `calc(${PX} * ${scale})`;
  if (!bitmap)
    return (
      <span className={cn("block leading-[1.15] whitespace-pre-line", align === "center" && "text-center", className)} style={{ color, fontFamily: "ui-monospace, Menlo, monospace", fontWeight: 700, fontSize: `calc(${unit} * 8)`, textShadow: edge ? `0 0 calc(${unit}) ${edge}, calc(${unit} * .6) calc(${unit} * .6) 0 ${edge}` : undefined, ...style }}>
        {lines.join("\n")}
      </span>
    );
  const ring = edge ? outline(bitmap) : null;
  const w = bitmap.width + 2;
  const h = bitmap.height + 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("block overflow-visible", className)} style={{ width: `calc(${unit} * ${w})`, height: `calc(${unit} * ${h})`, shapeRendering: "crispEdges", ...style }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {ring ? <path d={pathOf(ring)} fill={edge ?? undefined} /> : null}
      <path d={pathOf(bitmap, 1, 1)} fill={color} />
    </svg>
  );
}

/** The seven segments of a digit, in a 10 × 18 cell. */
const hseg = (x1: number, x2: number, y: number, t = 2.7) => `M${x1} ${y}l${t / 2} ${-t / 2}H${x2 - t / 2}l${t / 2} ${t / 2}l${-t / 2} ${t / 2}H${x1 + t / 2}Z`;
const vseg = (x: number, y1: number, y2: number, t = 2.7) => `M${x} ${y1}l${t / 2} ${t / 2}V${y2 - t / 2}l${-t / 2} ${t / 2}l${-t / 2} ${-t / 2}V${y1 + t / 2}Z`;
const SEG = {
  a: hseg(1.9, 8.1, 1.3),
  b: vseg(8.7, 1.9, 8.5),
  c: vseg(8.7, 9.5, 16.1),
  d: hseg(1.9, 8.1, 16.7),
  e: vseg(1.3, 9.5, 16.1),
  f: vseg(1.3, 1.9, 8.5),
  g: hseg(1.9, 8.1, 9),
};
const DIGITS: Record<string, (keyof typeof SEG)[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "d", "c"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

/** The width a stamp takes, in the stamp's own units (a digit is 10 wide and 18 tall). */
export function stampWidth(text: string): number {
  let x = 0;
  for (const ch of text) x += ch === " " ? 5 : ch === "'" ? 4.5 : 12.5;
  return x;
}

/**
 * The date in the corner, the way a 2006 camera burned it in: seven-segment digits in orange,
 * leaning a little, with the glow the orange always had. Drawn, not typed, so it looks the same
 * everywhere. `height` is any CSS length.
 */
export function DateStamp({ text, height, className, style }: { text: string; height: string; className?: string; style?: CSSProperties }) {
  const width = stampWidth(text);
  const glyphs: { x: number; d: string }[] = [];
  let x = 0;
  for (const ch of text) {
    if (ch === " ") x += 5;
    else if (ch === "'") {
      glyphs.push({ x, d: "M2.4 1.2l1.6 1.2-0.9 4.8h-1.6z" });
      x += 4.5;
    } else {
      glyphs.push({ x, d: (DIGITS[ch] ?? []).map((s) => SEG[s]).join("") });
      x += 12.5;
    }
  }
  return (
    <svg viewBox={`-2 -1 ${width + 4} 20`} className={cn("block overflow-visible", className)} style={{ height, width: `calc(${height} * ${(width + 4) / 20})`, filter: "drop-shadow(0 0 .6px rgba(255,140,40,1)) drop-shadow(0 0 2.5px rgba(255,100,0,.7))", ...style }} aria-hidden="true">
      <g fill="#FFB23F" transform="translate(2.5 0) skewX(-8)">
        {glyphs.map((g, i) => (
          <path key={i} d={g.d} transform={`translate(${g.x} 0)`} />
        ))}
      </g>
    </svg>
  );
}

/** A battery, full: the camera has been charged for this. */
function Battery() {
  return (
    <svg viewBox="0 0 13 8" style={{ width: `calc(${PX} * 13)`, height: `calc(${PX} * 8)`, shapeRendering: "crispEdges" }} aria-hidden="true">
      <path d="M0 0h11v2h2v4h-2v2H0zM1 1v6h9V1z" fill={EDGE} transform="translate(0 0)" />
      <path d="M1 1h9v6H1zM11 3h1v2h-1z" fill="none" stroke={OSD} strokeWidth="1" transform="translate(.5 .5) scale(.92)" />
      <path d="M2.5 2.5h2v3h-2zM5.5 2.5h2v3h-2z" fill={OSD} />
    </svg>
  );
}

type Show =
  | { kind: "off" }
  | { kind: "boot"; hello: string; reduce: boolean }
  | { kind: "photo"; photo: GiftPhoto; index: number; count: number; file: string; stamp: string | null; direction: number; shot: number; still: boolean }
  | { kind: "empty"; label: string }
  | { kind: "printing"; count: number; label: string; still: boolean }
  | { kind: "printed"; label: string };

/**
 * The screen. Its container makes `--px` the screen's own pixel, and its glass (a sheen, faint
 * scan lines, the dark inside edge) sits over whatever it shows.
 */
export function Screen({ show, className }: { show: Show; className?: string }) {
  return (
    <div className={cn("absolute overflow-hidden bg-[#050608] [container-type:size]", className)}>
      {show.kind === "boot" ? <Boot key="boot" hello={show.hello} reduce={show.reduce} /> : null}
      {show.kind === "photo" ? <PhotoView show={show} /> : null}
      {show.kind === "empty" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#0A0B10]">
          <PixelText lines={[show.label]} scale={1.5} align="center" />
        </div>
      ) : null}
      {show.kind === "printing" ? <Printing count={show.count} label={show.label} still={show.still} /> : null}
      {show.kind === "printed" ? (
        <div className="absolute inset-0 grid place-items-center bg-[#0A0B10]">
          <PixelText lines={[show.label]} scale={2} align="center" color="#FFD6E4" />
        </div>
      ) : null}
      {/* the glass */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)" }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(128deg, rgba(255,255,255,.17) 0%, rgba(255,255,255,.05) 34%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 100%)" }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 calc(2 * 100cqw / 150) rgba(0,0,0,.7), inset 0 calc(1.5 * 100cqw / 150) calc(3 * 100cqw / 150) rgba(0,0,0,.35)" }} />
    </div>
  );
}

/** The first `typed` characters of some wrapped lines, line by line, so nothing reflows as it types. */
export function typedLines(lines: string[], typed: number): string[] {
  const out: string[] = [];
  let left = typed;
  for (const line of lines) {
    const chars = [...line];
    out.push(chars.slice(0, Math.max(0, left)).join(""));
    left -= chars.length;
  }
  return out;
}

/**
 * Switching on: the backlight comes up, the logo, then their hello typed out a letter at a time
 * with a block cursor. Reduced motion shows the hello whole.
 */
function Boot({ hello, reduce }: { hello: string; reduce: boolean }) {
  const lines = wrap(hello, 12, 4);
  const total = lines.reduce((n, line) => n + [...line].length, 0);
  const [typed, setTyped] = useState(reduce ? total : 0);
  const [logo, setLogo] = useState(!reduce);
  useEffect(() => {
    if (reduce) return;
    let n = 0;
    let tick = 0;
    const start = window.setTimeout(() => {
      setLogo(false);
      tick = window.setInterval(() => {
        n += 1;
        setTyped(n);
        if (n >= total) window.clearInterval(tick);
      }, 55);
    }, 750);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tick);
    };
  }, [reduce, total]);
  const shown = typedLines(lines, typed);
  const typing = shown.findIndex((s, i) => [...s].length < [...lines[i]].length);
  const cursorLine = typing === -1 ? lines.length - 1 : typing;
  return (
    <motion.div className="absolute inset-0 grid place-items-center" initial={reduce ? false : { backgroundColor: "#000000" }} animate={{ backgroundColor: "#0B0C14" }} transition={{ duration: 0.5 }}>
      {logo ? (
        <motion.div className="flex flex-col items-center" style={{ gap: `calc(${PX} * 4)` }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
          <PixelText lines={["♥"]} scale={3} color="#FF7FAA" edge={null} />
          <PixelText lines={["LOVESHOT"]} scale={2} color="#FFFFFF" edge={null} />
        </motion.div>
      ) : (
        <div className="relative flex flex-col items-center" style={{ gap: `calc(${PX} * 4)` }}>
          {lines.map((line, i) => (
            <span key={i} className="relative flex items-center">
              {/* The whole line holds its place invisibly, so the typed part grows from the left of where it will end up. */}
              <PixelText lines={[line]} scale={2} color="transparent" edge={null} />
              <span className="absolute inset-y-0 left-0 flex items-center">
                <PixelText lines={[shown[i] || " "]} scale={2} color="#FFFFFF" edge={null} />
                {i === cursorLine && !reduce ? <span className="dc-blink block" style={{ width: `calc(${PX} * 9)`, height: `calc(${PX} * 14)`, marginLeft: `calc(${PX} * 2)`, background: "#FF7FAA" }} /> : null}
              </span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** A photo on the screen, with the camera's writing over it and the date in the corner. */
function PhotoView({ show }: { show: Extract<Show, { kind: "photo" }> }) {
  const { photo, index, count, file, stamp, direction, shot, still } = show;
  const stampH = `calc(${PX} * 10.5)`;
  // With the stamp in the corner, the caption keeps to the left of it.
  const cols = stamp ? 14 : 23;
  const caption = photo.caption?.trim() ? wrap(photo.caption, cols, 2) : [];
  return (
    <div className="absolute inset-0">
      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={photo.id + index}
          src={photo.url}
          alt=""
          draggable={false}
          custom={direction}
          className="absolute inset-0 h-full w-full object-cover"
          variants={{ enter: (d: number) => ({ x: still ? 0 : `${d * 100}%` }), center: { x: 0 }, leave: (d: number) => ({ x: still ? 0 : `${d * -100}%` }) }}
          initial="enter"
          animate="center"
          exit="leave"
          transition={{ duration: still ? 0 : 0.24, ease: [0.3, 0.7, 0.2, 1] }}
        />
      </AnimatePresence>
      {/* a shot just taken: the screen blacks out, then shows it */}
      {shot > 0 && !still ? <motion.span key={`shot-${shot}`} aria-hidden="true" className="absolute inset-0 bg-black" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, delay: 0.1, ease: "easeOut" }} /> : null}
      {stamp ? <DateStamp text={stamp} height={stampH} className="absolute" style={{ right: `calc(${PX} * 6)`, bottom: `calc(${PX} * 5)` }} /> : null}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between" style={{ padding: `calc(${PX} * 4) calc(${PX} * 4.5) 0` }}>
        <PixelText lines={[`▶ ${file}`]} />
        <span className="flex items-center" style={{ gap: `calc(${PX} * 3)` }}>
          <PixelText lines={[`${index + 1}/${count}`]} />
          <Battery />
        </span>
      </div>
      {caption.length ? (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "42%", background: "linear-gradient(to top, rgba(0,0,0,.5), rgba(0,0,0,0))" }} />
          <PixelText lines={caption} className="absolute" style={{ left: `calc(${PX} * 4.5)`, bottom: `calc(${PX} * 4.5)` }} />
        </>
      ) : null}
    </div>
  );
}

/** Printing: a bar filling, a frame at a time. */
function Printing({ count, label, still }: { count: number; label: string; still: boolean }) {
  const [done, setDone] = useState(still ? count : 0);
  useEffect(() => {
    if (still) return;
    const id = window.setInterval(() => setDone((d) => Math.min(count, d + 1)), 1900 / Math.max(1, count));
    return () => window.clearInterval(id);
  }, [count, still]);
  const cells = 20;
  const lit = Math.round((done / Math.max(1, count)) * cells);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0B10]" style={{ gap: `calc(${PX} * 7)` }}>
      <PixelText lines={[label]} scale={2} align="center" />
      <div className="flex" style={{ gap: `calc(${PX} * 1)`, padding: `calc(${PX} * 1.5)`, outline: `calc(${PX} * 1) solid ${OSD}` }}>
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} className="block" style={{ width: `calc(${PX} * 3.2)`, height: `calc(${PX} * 6)`, background: i < lit ? "#FF7FAA" : "rgba(255,255,255,.12)" }} />
        ))}
      </div>
      <PixelText lines={[`${done}/${count}`]} />
    </div>
  );
}
