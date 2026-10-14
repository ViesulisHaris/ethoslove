"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { PAPER_GRAIN } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { mulberry32 } from "../_shared/random";
import { Scrap, Shot } from "../_shared/collage/kit";
import type { ScrapId } from "../_shared/collage/scraps";
import type { Look } from "./looks";

/**
 * Autumn Reel's own drawings: film frames with a dotted cream border, a page torn from an old novel,
 * an apple with I LOVE YOU on its skin and a ladybug on it, a heart cut out round a photo, words cut
 * from a book, a strip of kraft tape with hearts on it, and the darkroom's negatives and pegs. All
 * drawn here from scratch in the style of the vintage autumn frames people make on Pinterest.
 */

export const BOOK_FONT = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";
export const TYPE_FONT = "'Times New Roman', Times, 'Iowan Old Style', Georgia, serif";

/** A film frame: black stock with sprocket holes down both sides, a cream border dotted top and bottom. */
export function FilmDotFrame({ photo, look, aspect = 1.12, onOpen, still, children }: { photo: GiftPhoto | undefined; look: Look; aspect?: number; onOpen?: () => void; still: boolean; children?: ReactNode }) {
  const dots = { backgroundImage: `radial-gradient(circle, ${look.dot} 0 calc(.42*var(--p)), transparent calc(.5*var(--p)))`, backgroundSize: "calc(2.3*var(--p)) 100%", backgroundPosition: "center" };
  const holes = { backgroundImage: `repeating-linear-gradient(180deg, transparent 0 calc(.9*var(--p)), ${look.sprocket} calc(.9*var(--p)) calc(2.3*var(--p)), transparent calc(2.3*var(--p)) calc(3.1*var(--p)))`, backgroundSize: "52% 100%", backgroundRepeat: "no-repeat", backgroundPosition: "center" };
  return (
    <div className="relative w-full" style={{ background: look.border, backgroundImage: PAPER_GRAIN, padding: "calc(3.4*var(--p)) calc(5.4*var(--p))", boxShadow: "0 calc(1.4*var(--p)) calc(3*var(--p)) rgba(20,8,2,.45)" }}>
      <span aria-hidden="true" className="absolute inset-x-[calc(5.4*var(--p))] top-[calc(1*var(--p))] h-[calc(1.4*var(--p))]" style={dots} />
      <span aria-hidden="true" className="absolute inset-x-[calc(5.4*var(--p))] bottom-[calc(1*var(--p))] h-[calc(1.4*var(--p))]" style={dots} />
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[calc(4.4*var(--p))]" style={{ backgroundColor: look.film, ...holes }} />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[calc(4.4*var(--p))]" style={{ backgroundColor: look.film, ...holes }} />
      <div style={{ boxShadow: `0 0 0 calc(.45*var(--p)) ${look.film}` }}>
        <Shot photo={photo} aspect={aspect} onOpen={onOpen} still={still} />
      </div>
      {children}
    </div>
  );
}

/**
 * A page torn out of an old novel, its running head the two of them ("MAYA AND LEO."), its page
 * number in the corner and a paragraph set close and justified. Foxed at the edges.
 */
export function BookPage({ heading, page, text, look, lang }: { heading: string; page: number; text: string; look: Look; lang: string }) {
  return (
    <div className="relative w-full overflow-hidden px-[calc(3.6*var(--p))] pt-[calc(2.8*var(--p))] pb-[calc(3.4*var(--p))]" style={{ backgroundColor: look.page, backgroundImage: PAPER_GRAIN, color: look.pageInk, fontFamily: BOOK_FONT, boxShadow: "0 calc(1.2*var(--p)) calc(2.6*var(--p)) rgba(20,8,2,.38)" }}>
      <div className="flex items-baseline gap-[calc(2*var(--p))] text-[calc(2.5*var(--p))] tracking-[0.1em] uppercase">
        <FitName min={0.5} className="min-w-0 flex-1 text-center leading-[1.3] font-semibold">
          {heading}
        </FitName>
        <span className="font-semibold">{page}</span>
      </div>
      <p className="mt-[calc(1.3*var(--p))] text-[calc(2.25*var(--p))] leading-[1.32] text-justify hyphens-auto" lang={lang}>
        {text}
      </p>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(120,80,30,.28))" }} />
    </div>
  );
}

/** An apple with I LOVE YOU and a heart printed on its skin, the way sunlight stencils them in the orchard. */
export function Apple({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 104" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}a`} cx="38%" cy="36%" r="72%">
          <stop offset="0" stopColor="#F0573A" />
          <stop offset=".55" stopColor="#C2211A" />
          <stop offset="1" stopColor="#6E0C0A" />
        </radialGradient>
        <filter id={`${id}s`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation=".5" />
        </filter>
      </defs>
      <ellipse cx="50" cy="100" rx="34" ry="3.5" fill="rgba(20,6,2,.3)" />
      <path d="M50 22C38 12 14 14 9 38C4 62 18 96 38 98C44 99 47 96 50 96C53 96 56 99 62 98C82 96 96 62 91 38C86 14 62 12 50 22Z" fill={`url(#${id}a)`} />
      <ellipse cx="30" cy="40" rx="7" ry="13" fill="#fff" opacity=".25" transform="rotate(20 30 40)" />
      <g filter={`url(#${id}s)`} fill="#F6D26C" opacity=".92" style={{ fontFamily: TYPE_FONT, fontWeight: 700 }} textAnchor="middle">
        <text x="50" y="54" fontSize="15" letterSpacing="1">I LOVE</text>
        <text x="50" y="70" fontSize="15" letterSpacing="1">YOU</text>
        <path d="M50 90C44 85 40 82 40 78C40 75 42 73 45 73C47 73 49 74 50 76C51 74 53 73 55 73C58 73 60 75 60 78C60 82 56 85 50 90Z" />
      </g>
      <path d="M50 22C50 14 52 8 56 3" stroke="#4A2C14" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M54 10C62 2 74 3 78 9C71 15 61 15 54 10Z" fill="#6E8A3A" />
    </svg>
  );
}

/** A ladybug, which shifts about a little where it sits unless the page is still. */
export function Ladybug({ still, className, style }: { still: boolean; className?: string; style?: CSSProperties }) {
  return (
    <motion.svg viewBox="0 0 40 36" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true" animate={still ? undefined : { rotate: [0, 8, -4, 0], x: [0, 1, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
      <g stroke="#1A0E08" strokeWidth="1.6" strokeLinecap="round">
        <path d="M10 14L3 10M9 20L2 20M10 26L4 31M30 14L37 10M31 20L38 20M30 26L36 31" />
        <path d="M17 6L13 0M23 6L27 0" />
      </g>
      <circle cx="20" cy="8" r="5.5" fill="#1A0E08" />
      <ellipse cx="20" cy="21" rx="12" ry="13" fill="#D6261C" />
      <path d="M20 9V34" stroke="#1A0E08" strokeWidth="1.4" />
      <g fill="#1A0E08">
        <circle cx="14" cy="16" r="2.3" />
        <circle cx="26" cy="16" r="2.3" />
        <circle cx="13" cy="25" r="2" />
        <circle cx="27" cy="25" r="2" />
      </g>
      <ellipse cx="15" cy="13" rx="2" ry="3" fill="#fff" opacity=".35" />
    </motion.svg>
  );
}

const HEART = "M50 88C29 74 5 57 5 32C5 15 17 4 31 4C40 4 46 9 50 16C54 9 60 4 69 4C83 4 95 15 95 32C95 57 71 74 50 88Z";

/** A heart cut out round a photo, with a white border, like a sticker of the two of them; a little gingham heart when there's no photo. */
export function HeartPhoto({ photo, onOpen, look }: { photo: GiftPhoto | undefined; onOpen?: () => void; look: Look }) {
  const id = useId().replace(/:/g, "");
  const body = (
    <svg viewBox="0 0 100 92" style={{ display: "block", width: "100%", overflow: "visible", filter: "drop-shadow(0 calc(.6*var(--p)) calc(1*var(--p)) rgba(20,8,2,.4))" }} aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}>
          <path d={HEART} transform="translate(50 46) scale(.84) translate(-50 -46)" />
        </clipPath>
        <pattern id={`${id}g`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#F3E3C8" />
          <rect width="6" height="12" fill={look.accent} opacity=".45" />
          <rect width="12" height="6" fill={look.accent} opacity=".45" />
        </pattern>
      </defs>
      <path d={HEART} fill="#FFFDF7" />
      {photo ? <image href={photo.url} x="0" y="0" width="100" height="92" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}c)`} /> : <path d={HEART} fill={`url(#${id}g)`} transform="translate(50 46) scale(.84) translate(-50 -46)" />}
    </svg>
  );
  if (!photo || !onOpen) return body;
  return (
    <button type="button" onClick={onOpen} aria-label={photo.caption || photo.alt || "photo"} className="block w-full outline-none focus-visible:ring-4 focus-visible:ring-white/50">
      {body}
    </button>
  );
}

/**
 * A line in words cut out of a book, each on its own strip of paper, laid on the page a touch
 * crooked. They stamp on one after another unless the page is still.
 */
export function WordStrips({ text, look, seed, size = 4.3, align = "left", still, delay = 0 }: { text: string; look: Look; seed: number; size?: number; align?: "left" | "center" | "right"; still: boolean; delay?: number }) {
  const words = useMemo(() => text.trim().split(/\s+/).filter(Boolean).slice(0, 16), [text]);
  const tilts = useMemo(() => {
    const random = mulberry32(seed);
    return words.map(() => ({ r: (random() - 0.5) * 7, y: (random() - 0.5) * 0.8 }));
  }, [words, seed]);
  return (
    <p className="flex flex-wrap items-center" style={{ gap: `calc(${size * 0.22} * var(--p)) calc(${size * 0.16} * var(--p))`, justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="inline-block"
          style={{ backgroundColor: look.word, backgroundImage: PAPER_GRAIN, color: look.wordInk, fontFamily: TYPE_FONT, fontSize: `calc(${size} * var(--p))`, lineHeight: 1.15, padding: "0.08em 0.3em 0.12em", rotate: `${tilts[i].r}deg`, translate: `0 calc(${tilts[i].y} * var(--p))`, boxShadow: "0 calc(.35*var(--p)) calc(.8*var(--p)) rgba(20,8,2,.35)" }}
          initial={still ? false : { scale: 1.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: "spring", stiffness: 520, damping: 22, delay: delay + i * 0.09 }}
        >
          {w}
        </motion.span>
      ))}
    </p>
  );
}

/** A strip of kraft tape with three little hearts drawn on it. */
export function HeartsTape({ look }: { look: Look }) {
  const heart = (x: number) => `M${x} 15C${x - 4} 11.5 ${x - 6.5} 9.5 ${x - 6.5} 7C${x - 6.5} 5 ${x - 5} 3.6 ${x - 3.2} 3.6C${x - 1.8} 3.6 ${x - 0.7} 4.4 ${x} 5.6C${x + 0.7} 4.4 ${x + 1.8} 3.6 ${x + 3.2} 3.6C${x + 5} 3.6 ${x + 6.5} 5 ${x + 6.5} 7C${x + 6.5} 9.5 ${x + 4} 11.5 ${x} 15Z`;
  return (
    <svg viewBox="0 0 60 19" style={{ display: "block", width: "100%", overflow: "visible", filter: "drop-shadow(0 calc(.3*var(--p)) calc(.6*var(--p)) rgba(20,8,2,.3))" }} aria-hidden="true">
      <path d="M1 2L59 1L58 5L59 9L58 13L59 18L1 18L2 14L1 10L2 6Z" fill={look.tape} opacity=".95" />
      <g fill="none" stroke="#3B2614" strokeWidth="1.3" strokeLinejoin="round">
        <path d={heart(15)} />
        <path d={heart(30)} />
        <path d={heart(45)} />
      </g>
    </svg>
  );
}

/** A maple leaf with a little crescent moon and stars printed on it. */
export function MoonLeaf({ scrap }: { scrap: ScrapId }) {
  return (
    <div className="relative">
      <Scrap id={scrap} eager />
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute top-[30%] left-[30%] w-[40%]" style={{ overflow: "visible" }}>
        <path d="M22 6C14 7 9 14 10 21C11 28 18 33 25 31C19 30 15 25 15 19C15 13 18 8 22 6Z" fill="#F7E7C2" />
        <path d="M30 10L31 13L34 14L31 15L30 18L29 15L26 14L29 13Z M28 25L28.7 27L30.7 27.7L28.7 28.4L28 30.4L27.3 28.4L25.3 27.7L27.3 27Z" fill="#F7E7C2" />
      </svg>
    </div>
  );
}

/** A wooden clothes peg, holding a print on the darkroom line. */
export function Peg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 40" className={className} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
      <rect x="2" y="0" width="5.5" height="38" rx="2" fill="#C99A62" />
      <rect x="8.5" y="0" width="5.5" height="38" rx="2" fill="#B5844F" />
      <rect x="1" y="15" width="14" height="4" rx="1.5" fill="#9AA0A6" />
    </svg>
  );
}

/**
 * A print hanging on the darkroom line: a colour negative (inverted, the film's orange through it)
 * until `developed`, when it comes up as the photo.
 */
export function Negative({ photo, developed, still, delay = 0 }: { photo: GiftPhoto | undefined; developed: boolean; still: boolean; delay?: number }) {
  return (
    <div className="relative w-full bg-[#F4EEE2] p-[calc(1.6*var(--p))] pb-[calc(4.4*var(--p))] shadow-[0_calc(1*var(--p))_calc(2.4*var(--p))_rgba(0,0,0,.45)]">
      <div className="relative overflow-hidden bg-[#2A1A10]" style={{ aspectRatio: "0.86" }}>
        {photo ? (
          <motion.img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" initial={false} animate={{ filter: developed ? "invert(0) sepia(0) saturate(1) contrast(1)" : "invert(1) sepia(.35) saturate(1.4) contrast(.85)" }} transition={{ duration: still ? 0 : 1.1, delay: still ? 0 : delay, ease: "easeInOut" }} />
        ) : null}
        <motion.span aria-hidden="true" className="absolute inset-0 mix-blend-multiply" style={{ background: "#D97A2A" }} initial={false} animate={{ opacity: developed ? 0 : 0.6 }} transition={{ duration: still ? 0 : 1.1, delay: still ? 0 : delay }} />
      </div>
    </div>
  );
}
