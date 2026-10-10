"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { mulberry32 } from "../_shared/random";
import { Scrap, Shot } from "../_shared/collage/kit";
import type { ScrapId } from "../_shared/collage/scraps";
import type { Look } from "./looks";

const FILM_FONT = "'Courier New', ui-monospace, monospace";

/** A column of sprocket holes down one side of the film. */
function Sprockets({ side, count }: { side: "left" | "right"; count: number }) {
  return (
    <span aria-hidden="true" className="absolute inset-y-[calc(1.2*var(--p))] flex flex-col justify-between" style={{ [side]: "calc(1.25*var(--p))" }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="block h-[calc(1.7*var(--p))] w-[calc(2.5*var(--p))] rounded-[calc(.45*var(--p))]" style={{ background: "rgba(255,248,238,.92)" }} />
      ))}
    </span>
  );
}

/**
 * A frame of film: black stock, sprocket holes down both sides, and the edge printed with the
 * season instead of a brand. `number` is the frame's number on the roll.
 */
export function FilmFrame({ photo, look, number, aspect = 0.86, onOpen, still, children }: { photo: GiftPhoto | undefined; look: Look; number: number; aspect?: number; onOpen?: () => void; still: boolean; children?: ReactNode }) {
  return (
    <div className="relative w-full" style={{ background: look.film, padding: "calc(2.4*var(--p)) calc(5.6*var(--p)) calc(4.6*var(--p))", boxShadow: "0 calc(1.4*var(--p)) calc(3*var(--p)) rgba(30,12,6,.4)" }}>
      <Sprockets side="left" count={8} />
      <Sprockets side="right" count={8} />
      <Shot photo={photo} aspect={aspect} onOpen={onOpen} still={still} />
      <span aria-hidden="true" className="absolute inset-x-[calc(5.6*var(--p))] bottom-[calc(1.2*var(--p))] flex items-center justify-between text-[calc(1.9*var(--p))] font-bold tracking-[0.2em] whitespace-nowrap" style={{ color: look.filmInk, fontFamily: FILM_FONT }}>
        <span>▸ {number}</span>
        <span>SPOOKY 400</span>
        <span>{number}A</span>
      </span>
      {children}
    </div>
  );
}

/** A strip of film with one frame per photo, the frame numbers running down the edge. */
export function FilmStrip({ photos, look, first, onOpen, still }: { photos: GiftPhoto[]; look: Look; first: number; onOpen?: (photo: GiftPhoto) => void; still: boolean }) {
  return (
    <div className="relative w-full" style={{ background: look.film, padding: "calc(2.2*var(--p)) calc(5.6*var(--p))", boxShadow: "0 calc(1.4*var(--p)) calc(3*var(--p)) rgba(30,12,6,.4)" }}>
      <Sprockets side="left" count={photos.length * 6} />
      <Sprockets side="right" count={photos.length * 6} />
      <div className="flex flex-col" style={{ gap: "calc(2.2*var(--p))" }}>
        {photos.map((photo, i) => (
          <div key={photo.id} className="relative">
            <Shot photo={photo} aspect={1.18} onOpen={onOpen ? () => onOpen(photo) : undefined} still={still} />
            <span aria-hidden="true" className="absolute top-1/2 -left-[calc(4.3*var(--p))] text-[calc(1.7*var(--p))] font-bold tracking-[0.18em]" style={{ color: look.filmInk, fontFamily: FILM_FONT, writingMode: "vertical-rl", translate: "0 -50%" }}>
              {first + i}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The kraft tag their name is written on, with its punched hole and a twist of string through it. */
export function KraftTag({ look, forLabel, name, from }: { look: Look; forLabel: string; name: string; from: string }) {
  return (
    <div className="relative rounded-[calc(1.4*var(--p))] px-[calc(4*var(--p))] pt-[calc(6.4*var(--p))] pb-[calc(4.4*var(--p))] text-center" style={{ backgroundColor: look.tag.paper, backgroundImage: PAPER_GRAIN, color: "#3B2618", clipPath: "polygon(20% 0, 80% 0, 100% 15%, 100% 100%, 0 100%, 0 15%)", boxShadow: "0 calc(1.2*var(--p)) calc(2.4*var(--p)) rgba(40,20,8,.3)" }}>
      <span aria-hidden="true" className="absolute top-[calc(2.2*var(--p))] left-1/2 block h-[calc(2.4*var(--p))] w-[calc(2.4*var(--p))] -translate-x-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 calc(.55*var(--p)) ${look.tag.string}`, background: look.wall }} />
      <p className="text-[calc(2.6*var(--p))] font-semibold tracking-[0.34em] uppercase opacity-60">{forLabel}</p>
      <FitName as="p" className="mt-[calc(.6*var(--p))] text-[calc(10.5*var(--p))] leading-[1.05]" style={{ fontFamily: SCRIPT_FONT }}>
        {name}
      </FitName>
      {from ? (
        <FitName as="p" min={0.7} className="mt-[calc(1.2*var(--p))] text-[calc(3.2*var(--p))] opacity-70" style={{ fontFamily: "var(--gift-font-hand)" }}>
          {from}
        </FitName>
      ) : null}
    </div>
  );
}

/** One leaf of the heap on the first screen, and how the gust takes it. */
export type Leaf = {
  id: ScrapId;
  x: number;
  y: number;
  w: number;
  rotate: number;
  z: number;
  /** Where it ends up, in cq units from where it lay: always past the right edge, so it never fades out in the air. */
  away: { x: number; y: number; rotate: number };
  /** The first lift as the wind gets under it, in cqh, and the twitch it gives. */
  lift: number;
  shiver: number;
  /** Turns end over end and side to side on the way, in degrees: what makes it read as a leaf and not a sticker sliding. */
  flipX: number;
  flipY: number;
  delay: number;
  duration: number;
};

/**
 * The heap: leaves piled over the lower half of the screen, thickest in the middle, the same heap
 * for the same two people. The gust comes from the left, so the left of the heap goes first and every
 * leaf lifts, tumbles and is carried off past the right edge. `x`/`y` are percentages of the screen,
 * `w` is in `--p`, `away` in cq units.
 */
export function leafPile(seed: number, kinds: ScrapId[], count = 26): Leaf[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const reach = Math.sqrt(random());
    const x = Math.round((50 + Math.cos(angle) * reach * 54) * 10) / 10;
    const y = Math.round((70 + Math.sin(angle) * reach * 26) * 10) / 10;
    const w = Math.round(24 + random() * 18);
    const turn = random() > 0.5 ? 1 : -1;
    const rotate = Math.round(random() * 360);
    return {
      id: kinds[i % kinds.length],
      x,
      y,
      w,
      rotate,
      z: Math.round(random() * 20),
      // Far enough right that even the widest leaf is gone: past 100% by half its width and some.
      away: { x: Math.round(128 - x + random() * 40), y: -Math.round(25 + random() * 75), rotate: Math.round(rotate + turn * (300 + random() * 420)) },
      lift: Math.round((3 + random() * 7) * 10) / 10,
      shiver: Math.round(turn * (6 + random() * 10)),
      flipX: Math.round(turn * (360 + random() * 540)),
      flipY: Math.round((random() > 0.5 ? 1 : -1) * (120 + random() * 300)),
      // Left first, the way a gust crosses the heap, and the top of the heap a moment before the bottom.
      delay: Math.round(((x + 4) / 108) * 0.42 * 1000 + (y - 44) * 2 + random() * 70) / 1000,
      duration: Math.round((1.05 + random() * 0.45) * 100) / 100,
    };
  });
}

/** The leaves, heaped, and blown off the screen when `blowing`. */
export function LeafHeap({ leaves, blowing, reduce }: { leaves: Leaf[]; blowing: boolean; reduce: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {leaves.map((leaf, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${leaf.x}%`, top: `${leaf.y}%`, width: `calc(${leaf.w} * var(--p))`, translate: "-50% -50%", zIndex: leaf.z, transformPerspective: 800 }}
          initial={reduce ? false : { opacity: 0, y: "-30cqh", rotate: leaf.rotate - 60 }}
          animate={
            !blowing
              ? { opacity: 1, x: "0cqw", y: "0cqh", rotate: leaf.rotate, rotateX: 0, rotateY: 0 }
              : reduce
                ? { opacity: 0 }
                : {
                    x: ["0cqw", `${leaf.away.x * 0.04}cqw`, `${leaf.away.x}cqw`],
                    y: ["0cqh", `${-leaf.lift}cqh`, `${leaf.away.y}cqh`],
                    rotate: [leaf.rotate, leaf.rotate + leaf.shiver, leaf.away.rotate],
                    rotateX: [0, leaf.flipX * 0.08, leaf.flipX],
                    rotateY: [0, leaf.flipY * 0.1, leaf.flipY],
                    // Whole all the way off the screen; only a leaf that somehow hasn't left by then fades.
                    opacity: [1, 1, 1, 0],
                  }
          }
          transition={
            !blowing
              ? { type: "spring", stiffness: 70, damping: 13, delay: (i % 9) * 0.05 }
              : reduce
                ? { duration: 0.2 }
                : {
                    duration: leaf.duration,
                    delay: leaf.delay,
                    times: [0, 0.16, 1],
                    // A quick lift as the wind gets under it, then carried off faster and faster.
                    ease: ["easeOut", [0.45, 0, 0.8, 0.55]],
                    opacity: { duration: leaf.duration, delay: leaf.delay, times: [0, 0.6, 0.95, 1] },
                  }
          }
        >
          <Scrap id={leaf.id} eager />
        </motion.div>
      ))}
    </div>
  );
}

/** The gust itself: a few soft streaks of wind sweeping left to right across the heap as it goes. */
export function Gust({ dark }: { dark: boolean }) {
  const streaks = [
    { y: 58, bend: 7, delay: 0, width: 2.4 },
    { y: 70, bend: -5, delay: 0.09, width: 3.2 },
    { y: 82, bend: 6, delay: 0.17, width: 2 },
    { y: 46, bend: -4, delay: 0.24, width: 1.6 },
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[27] h-full w-full" style={{ filter: "blur(0.6px)" }}>
      {streaks.map((s, i) => (
        <motion.path
          key={i}
          d={`M -12 ${s.y} C 18 ${s.y - s.bend}, 42 ${s.y + s.bend}, 66 ${s.y - s.bend * 0.6} S 104 ${s.y - s.bend}, 118 ${s.y - s.bend * 1.4}`}
          fill="none"
          stroke={dark ? "rgba(255,236,214,.55)" : "rgba(255,255,255,.85)"}
          strokeWidth={s.width}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0.38, 0.12], pathOffset: [0, 0.32, 0.95], opacity: [0, 1, 0] }}
          transition={{ duration: 0.85, delay: s.delay, ease: [0.3, 0, 0.5, 1] }}
        />
      ))}
    </svg>
  );
}

/** Bits round the heap: the moon above it, and the cat sitting on top of it, which a gust doesn't move until it goes. */
export function CoverBits({ look, blowing, reduce }: { look: Look; blowing: boolean; reduce: boolean }) {
  const leave = { duration: reduce ? 0.15 : 0.5 };
  const pieces: { id: ScrapId; style: CSSProperties; w: number; rotate: number; delay: number }[] = [
    { id: look.slots.sky, style: { right: "calc(-6*var(--p))", top: "max(calc(4*var(--p)), 3cqh)" }, w: 40, rotate: 0, delay: 0.1 },
    { id: look.slots.cat, style: { right: "calc(-2*var(--p))", bottom: "max(calc(26*var(--p)), 17cqh)", zIndex: 24 }, w: 32, rotate: 4, delay: 1.1 },
  ];
  return (
    <>
      {pieces.map((piece) => (
        <motion.div key={piece.id} aria-hidden="true" className="pointer-events-none absolute" style={{ zIndex: 2, ...piece.style, width: `calc(${piece.w} * var(--p))`, rotate: piece.rotate }} initial={reduce ? false : { opacity: 0, scale: 0.7 }} animate={blowing ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }} transition={blowing ? leave : { type: "spring", stiffness: 90, damping: 14, delay: piece.delay }}>
          <Scrap id={piece.id} eager />
        </motion.div>
      ))}
    </>
  );
}
