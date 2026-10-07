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

/** One leaf of the heap on the first screen, and where the gust sends it. */
export type Leaf = { id: ScrapId; x: number; y: number; w: number; rotate: number; z: number; away: { x: number; y: number; rotate: number }; delay: number; duration: number };

/**
 * The heap: leaves piled over the lower half of the screen, thickest in the middle, the same heap
 * for the same two people. The gust comes from the left, so every leaf goes right and up, the
 * ones on the left first. `x`/`y` are percentages of the screen, `w` is in `--p`, `away` in cq units.
 */
export function leafPile(seed: number, kinds: ScrapId[], count = 26): Leaf[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const angle = random() * Math.PI * 2;
    const reach = Math.sqrt(random());
    const x = Math.round((50 + Math.cos(angle) * reach * 54) * 10) / 10;
    const y = Math.round((70 + Math.sin(angle) * reach * 26) * 10) / 10;
    const spin = (random() > 0.5 ? 1 : -1) * (240 + random() * 360);
    const rotate = Math.round(random() * 360);
    return {
      id: kinds[i % kinds.length],
      x,
      y,
      w: Math.round(24 + random() * 18),
      rotate,
      z: Math.round(random() * 20),
      away: { x: Math.round(70 + random() * 70), y: -Math.round(35 + random() * 70), rotate: Math.round(rotate + spin) },
      delay: Math.round(((x / 100) * 0.3 + random() * 0.08) * 1000) / 1000,
      duration: Math.round((1 + random() * 0.4) * 100) / 100,
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
          style={{ left: `${leaf.x}%`, top: `${leaf.y}%`, width: `calc(${leaf.w} * var(--p))`, translate: "-50% -50%", zIndex: leaf.z }}
          initial={reduce ? false : { opacity: 0, y: "-30cqh", rotate: leaf.rotate - 60 }}
          animate={blowing ? (reduce ? { opacity: 0 } : { opacity: 0, x: `${leaf.away.x}cqw`, y: `${leaf.away.y}cqh`, rotate: leaf.away.rotate }) : { opacity: 1, x: 0, y: 0, rotate: leaf.rotate }}
          transition={blowing ? { duration: reduce ? 0.2 : leaf.duration, delay: reduce ? 0 : leaf.delay, ease: [0.3, 0, 0.55, 1], opacity: { duration: reduce ? 0.2 : leaf.duration * 0.9, delay: reduce ? 0 : leaf.delay + leaf.duration * 0.25 } } : { type: "spring", stiffness: 70, damping: 13, delay: (i % 9) * 0.05 }}
        >
          <Scrap id={leaf.id} eager />
        </motion.div>
      ))}
    </div>
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
