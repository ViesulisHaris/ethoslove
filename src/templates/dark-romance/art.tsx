"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { Scrap, Shot } from "../_shared/collage/kit";
import type { Look } from "./looks";

/** How the cover's pieces leave when the diary opens: slow off the mark, then gone. */
const LEAVE = [0.5, 0, 0.75, 0] as const;
const EASE = [0.5, 0, 0.3, 1] as const;

/**
 * The key's walk to the lock, in percentages of the diary. It turns about its bit (`KEY_PIVOT`, near
 * the bottom of the drawing), so the bit is what lands on the lock's middle and the bow swings round
 * it the way a key turns. The key is 12% of the diary wide and stands 22.2% of it tall; the lock's
 * middle is at 94.5% across and halfway down.
 */
const KEY_PIVOT = "50% 85%";
const KEY_REST = { left: "70%", top: "64%", rotate: 35 };
const KEY_IN_LOCK = { left: "88.5%", top: "31.1%" };

const GOLD_TEXT = (look: Look): CSSProperties => ({ backgroundImage: `linear-gradient(180deg, #FFF1C9 0%, ${look.diary.foil} 48%, ${look.diary.foilDeep} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });

const CORNERS: Record<"tl" | "tr" | "bl" | "br", CSSProperties> = {
  tl: { top: "2.6%", left: "2.6%" },
  tr: { top: "2.6%", right: "2.6%", transform: "scaleX(-1)" },
  bl: { bottom: "2.6%", left: "2.6%", transform: "scaleY(-1)" },
  br: { bottom: "2.6%", right: "2.6%", transform: "scale(-1)" },
};

/** A gold foil corner, stamped into the leather. */
function Corner({ at, color }: { at: keyof typeof CORNERS; color: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute w-[15%]" style={CORNERS[at]}>
      <path d="M3 37 V9 Q3 3 9 3 H37" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9 31 V14 Q9 9 14 9 H31" fill="none" stroke={color} strokeWidth="1.1" opacity=".7" />
      <circle cx="9" cy="9" r="2.3" fill={color} />
    </svg>
  );
}

/** The key, in the diary's gold so it shows on the leather: a heart for a bow, for the heart on the lock. */
function HeartKey({ look }: { look: Look }) {
  const gold = `key-gold-${look.diary.foil.slice(1)}`;
  return (
    <svg viewBox="0 0 40 100" aria-hidden="true" className="block w-full overflow-visible" style={{ filter: "drop-shadow(0 calc(.5*var(--p)) calc(.7*var(--p)) rgba(0,0,0,.55))" }}>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1C9" />
          <stop offset=".45" stopColor={look.diary.foil} />
          <stop offset="1" stopColor={look.diary.foilDeep} />
        </linearGradient>
      </defs>
      <g fill={`url(#${gold})`}>
        <path fillRule="evenodd" d="M20 36C8 27 2 20 2 12.5 2 6.5 6.5 2 12 2c3.5 0 6.3 1.8 8 4.6C21.7 3.8 24.5 2 28 2c5.5 0 10 4.5 10 10.5C38 20 32 27 20 36zm0-9c-7-5.5-10.5-9.5-10.5-14 0-2.6 1.9-4.5 4.3-4.5 2.2 0 3.8 1.3 6.2 4.5 2.4-3.2 4-4.5 6.2-4.5 2.4 0 4.3 1.9 4.3 4.5 0 4.5-3.5 8.5-10.5 14z" />
        <rect x="15.5" y="35" width="9" height="4" rx="1.4" />
        <rect x="17.6" y="38" width="4.8" height="58" rx="2" />
        <path d="M22 76h11v5h-4v3h4v7H22z" />
      </g>
    </svg>
  );
}

/** The flourish under their name. */
function Flourish({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 16" aria-hidden="true" className="mt-[calc(.8*var(--p))] w-[48%]">
      <path d="M2 8 C30 8 40 2 60 8 C80 14 90 8 118 8" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M55 8 l5 -4.5 5 4.5 -5 4.5z" fill={color} />
    </svg>
  );
}

/**
 * A black leather diary with their name in gold, held shut by a strap and a heart padlock, the key
 * lying on it. Opening it, the key goes to the lock and turns, the lock drops, and the cover swings
 * back on its spine onto a first page with a rose pressed in it.
 */
export function Diary({ look, forLabel, name, title, opening, reduce }: { look: Look; forLabel: string; name: string; title: string; opening: boolean; reduce: boolean }) {
  const d = look.diary;
  const at = (delay: number, duration: number) => ({ duration: reduce ? 0.15 : duration, delay: reduce ? 0 : delay, ease: EASE });
  const face: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  return (
    <div className="relative w-full" style={{ aspectRatio: "0.74", perspective: "calc(260*var(--p))" }}>
      {/* the block of pages under the cover, their edges showing down the side */}
      <span aria-hidden="true" className="absolute rounded-r-[calc(1.2*var(--p))]" style={{ inset: "1.8% -2.4% 1.8% 3%", background: "repeating-linear-gradient(0deg, #F3EADB 0 calc(.32*var(--p)), #D6C6AC calc(.32*var(--p)) calc(.55*var(--p)))", boxShadow: "0 calc(2*var(--p)) calc(4*var(--p)) rgba(0,0,0,.5)" }} />
      {/* the first page, which the open cover shows: ruled, with a rose pressed in it */}
      <span aria-hidden="true" className="absolute inset-[1.8%_0_1.8%_3%] overflow-hidden rounded-r-[calc(1*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 calc(5.2*var(--p)), rgba(120,50,50,.14) calc(5.2*var(--p)) calc(5.35*var(--p))), ${PAPER_GRAIN}` }}>
        <span className="absolute top-[26%] left-1/2 block w-[58%] -translate-x-1/2 -rotate-12">
          <Scrap id={look.flowers.rose} eager />
        </span>
      </span>

      <motion.div className="absolute inset-0 origin-left" style={{ transformStyle: "preserve-3d" }} animate={opening ? { rotateY: -158 } : { rotateY: 0 }} transition={at(1.05, 0.85)}>
        {/* the inside of the cover, which shows once it has swung past the spine */}
        <span aria-hidden="true" className="absolute inset-0 rounded-[calc(1.4*var(--p))]" style={{ ...face, transform: "rotateY(180deg)", backgroundColor: d.ribbon, backgroundImage: `radial-gradient(circle at 30% 30%, rgba(255,255,255,.08), transparent 60%), ${PAPER_GRAIN}` }} />
        <div className="absolute inset-0 rounded-[calc(1.4*var(--p))]" style={{ ...face, backgroundColor: d.leather, backgroundImage: `radial-gradient(120% 80% at 32% 18%, rgba(255,255,255,.1), transparent 62%), linear-gradient(90deg, rgba(0,0,0,.5), transparent 10%), ${PAPER_GRAIN}`, boxShadow: "0 calc(2.4*var(--p)) calc(5*var(--p)) rgba(0,0,0,.55), inset 0 0 0 calc(.35*var(--p)) rgba(255,255,255,.06)" }}>
          <span aria-hidden="true" className="absolute inset-[5%] rounded-[calc(1*var(--p))]" style={{ border: `calc(.28*var(--p)) dashed ${d.foil}`, opacity: 0.42 }} />
          {(Object.keys(CORNERS) as (keyof typeof CORNERS)[]).map((c) => (
            <Corner key={c} at={c} color={d.foil} />
          ))}
          <div className="absolute inset-x-[13%] top-[24%] flex flex-col items-center text-center" style={{ color: d.foil }}>
            <span className="text-[calc(2.4*var(--p))] font-semibold tracking-[0.42em] uppercase opacity-80">{forLabel}</span>
            <FitName as="p" className="mt-[calc(.6*var(--p))] w-full text-[calc(11*var(--p))] leading-[1.2]" style={{ fontFamily: SCRIPT_FONT }}>
              <span style={GOLD_TEXT(look)}>{name}</span>
            </FitName>
            <Flourish color={d.foil} />
            <span className="mt-[calc(1.4*var(--p))] text-[calc(3*var(--p))] tracking-[0.14em] italic" style={{ fontFamily: "var(--gift-font-display)" }}>
              {title}
            </span>
          </div>
          {/* the strap round the opening edge, and its heart padlock */}
          <motion.span aria-hidden="true" className="absolute top-[41%] right-[-3%] h-[18%] w-[21%] rounded-l-[calc(1*var(--p))]" style={{ backgroundColor: d.shade, backgroundImage: PAPER_GRAIN, boxShadow: "calc(-.4*var(--p)) 0 calc(1*var(--p)) rgba(0,0,0,.45)" }} animate={opening ? { opacity: 0, x: "30%" } : { opacity: 1, x: 0 }} transition={at(0.95, 0.3)} />
          <motion.div aria-hidden="true" className="absolute top-[50%] right-[-7%] w-[25%]" style={{ y: "-50%" }} animate={opening ? { y: "40%", rotate: 28, opacity: 0 } : { y: "-50%", rotate: 0, opacity: 1 }} transition={at(0.84, 0.4)}>
            <Scrap id="brooch-heart-silver" eager />
          </motion.div>
        </div>
      </motion.div>

      {/* the ribbon marking their page */}
      <motion.span aria-hidden="true" className="absolute bottom-[-6%] left-[60%] h-[11%] w-[5.5%]" style={{ backgroundColor: d.ribbon, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)", boxShadow: "0 calc(.4*var(--p)) calc(.8*var(--p)) rgba(0,0,0,.4)" }} animate={opening ? { opacity: 0 } : { opacity: 1 }} transition={at(1.05, 0.3)} />

      {/* the key: it lies on the cover, bobbing, then goes to the lock and turns */}
      <motion.div
        aria-hidden="true"
        className="absolute w-[12%]"
        style={{ ...KEY_REST, transformOrigin: KEY_PIVOT }}
        animate={opening ? { left: [KEY_REST.left, KEY_IN_LOCK.left, KEY_IN_LOCK.left, KEY_IN_LOCK.left], top: [KEY_REST.top, KEY_IN_LOCK.top, KEY_IN_LOCK.top, KEY_IN_LOCK.top], rotate: [KEY_REST.rotate, 0, 90, 90], opacity: [1, 1, 1, 0], y: 0 } : { ...KEY_REST, opacity: 1, y: reduce ? 0 : [0, -6, 0] }}
        transition={opening ? { default: { duration: reduce ? 0.15 : 1.25, times: [0, 0.44, 0.66, 1], ease: "easeInOut" }, y: { duration: 0.2 } } : { default: { duration: 0 }, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
      >
        <HeartKey look={look} />
      </motion.div>
    </div>
  );
}

/**
 * Where the cut-outs round the diary sit, top left to bottom right. `x` and `w` are in `--p` across
 * the 100-wide column; `y` is how far the middle sits from the top or bottom `edge`, so they keep
 * to the bands above and below the diary on any phone.
 */
const COVER_SPOTS: { x: number; y: number; w: number; rotate: number; edge: "top" | "bottom"; delay: number }[] = [
  { x: 14, y: 15, w: 34, rotate: -18, edge: "top", delay: 0.2 },
  { x: 84, y: 16, w: 30, rotate: 12, edge: "top", delay: 0.45 },
  { x: 22, y: 38, w: 40, rotate: -4, edge: "bottom", delay: 0.6 },
  { x: 86, y: 36, w: 22, rotate: 24, edge: "bottom", delay: 0.75 },
];

/** The cut-outs round the diary. They arrive one by one and, when it opens, go the way they came. */
export function CoverBits({ look, opening, reduce }: { look: Look; opening: boolean; reduce: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100*var(--p))] -translate-x-1/2">
      {COVER_SPOTS.map((spot, i) => {
        const away = reduce ? {} : { x: `${(spot.x - 50) * 2}%`, y: spot.edge === "top" ? "-60%" : "60%" };
        return (
          <div key={i} className="absolute" style={{ left: `calc(${spot.x} * var(--p))`, [spot.edge]: `calc(${spot.y} * var(--p))`, width: `calc(${spot.w} * var(--p))`, translate: spot.edge === "top" ? "-50% -50%" : "-50% 50%" }}>
            <motion.div style={{ rotate: spot.rotate }} initial={reduce ? false : { opacity: 0, scale: 0.7, rotate: spot.rotate - 20 }} animate={opening ? { opacity: 0, ...away } : { opacity: 1, scale: 1, x: 0, y: 0, rotate: spot.rotate }} transition={opening ? { duration: reduce ? 0.15 : 0.55, ease: LEAVE, delay: reduce ? 0 : 0.9 } : { type: "spring", stiffness: 90, damping: 14, delay: 0.3 + spot.delay }}>
              <Scrap id={look.cover[i]} eager />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/** A four-pointed star, or a crescent moon, in the card's gold. */
function Glint({ moon, color, className, style }: { moon?: boolean; color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
      <path d={moon ? "M14.5 3a9 9 0 1 0 6.5 15.2A7.4 7.4 0 0 1 14.5 3z" : "M12 1.5 13.8 10.2 22.5 12 13.8 13.8 12 22.5 10.2 13.8 1.5 12 10.2 10.2z"} fill={color} />
    </svg>
  );
}

/**
 * A tarot card, black and gold, with their photo printed in the arch: the numeral at the top
 * between a moon and a star, the card's name across the bottom.
 */
export function TarotCard({ photo, look, numeral, name, onOpen, still }: { photo: GiftPhoto | undefined; look: Look; numeral: string; name: string; onOpen?: () => void; still: boolean }) {
  const gold = look.diary.foil;
  const black = "#120C0E";
  return (
    <div className="relative w-full rounded-[calc(2*var(--p))] p-[calc(2.2*var(--p))]" style={{ backgroundColor: black, backgroundImage: `radial-gradient(90% 60% at 50% 40%, rgba(255,255,255,.08), transparent 70%), ${PAPER_GRAIN}`, boxShadow: "0 calc(1.6*var(--p)) calc(3.4*var(--p)) rgba(0,0,0,.45)" }}>
      <div className="relative rounded-[calc(1.2*var(--p))] px-[calc(3.4*var(--p))] pt-[calc(2.4*var(--p))] pb-[calc(2.8*var(--p))]" style={{ border: `calc(.35*var(--p)) solid ${gold}`, boxShadow: `inset 0 0 0 calc(.8*var(--p)) ${black}, inset 0 0 0 calc(1.05*var(--p)) ${gold}` }}>
        <p className="flex items-center justify-center gap-[calc(2.4*var(--p))]" style={{ color: gold }}>
          <Glint moon color={gold} className="h-[calc(3*var(--p))] w-[calc(3*var(--p))]" />
          <span className="text-[calc(4.2*var(--p))] leading-none tracking-[0.24em]" style={{ fontFamily: "var(--gift-font-display)", ...GOLD_TEXT(look) }}>
            {numeral}
          </span>
          <Glint color={gold} className="h-[calc(3*var(--p))] w-[calc(3*var(--p))]" />
        </p>
        <div className="mt-[calc(2*var(--p))] rounded-t-full p-[calc(.45*var(--p))]" style={{ background: gold }}>
          <div className="overflow-hidden rounded-t-full">
            <Shot photo={photo} aspect={0.74} onOpen={onOpen} still={still} />
          </div>
        </div>
        <FitName as="p" min={0.6} className="mt-[calc(2.2*var(--p))] text-center text-[calc(4*var(--p))] leading-[1.2] font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "var(--gift-font-display)" }}>
          <span style={GOLD_TEXT(look)}>{name}</span>
        </FitName>
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <Glint key={c} color={gold} className="absolute h-[calc(1.8*var(--p))] w-[calc(1.8*var(--p))] opacity-80" style={{ [c[0] === "t" ? "top" : "bottom"]: "calc(1.6*var(--p))", [c[1] === "l" ? "left" : "right"]: "calc(1.6*var(--p))" }} />
        ))}
      </div>
    </div>
  );
}

/** A heart drawn in one go with a fine pen, the way you sign a photo. */
export function HeartScribble({ color, still, className }: { color: string; still: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 120 50" className={className} aria-hidden="true">
      <motion.path d="M4 40 C24 38 40 30 52 22 C62 14 58 2 50 6 C42 10 46 24 60 34 C72 24 86 8 78 4 C70 0 62 14 66 28 C70 40 96 40 116 34" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1.4, delay: 0.9, ease: "easeInOut" }} />
    </svg>
  );
}
