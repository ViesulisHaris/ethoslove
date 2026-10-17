"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { PAPER_GRAIN, POSTER_FONT } from "../_shared/cover-kit";
import { mulberry32 } from "../_shared/random";
import type { Look } from "./looks";

/**
 * Fall for You's own drawings: a jar candle with their name on its label, wooden letter blocks, a
 * patchwork pumpkin sewn from four fabrics, an acorn, a wooden heart and the steam off a cup. All
 * drawn here from scratch in the cosy style of the autumn photo frames people make on Pinterest; no
 * character, show or brand artwork.
 */

// ---------------------------------------------------------------- the candle

/**
 * A candle in a glass jar, its wax amber. `lit` lights it: a flame that flickers over the wick and a
 * warm light round it. The label's paper is drawn here; what is written on it goes in `children`,
 * laid over the label.
 */
export function Candle({ lit, still, label, children, className, style }: { lit: boolean; still: boolean; label: { paper: string; line: string }; children?: ReactNode; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <svg viewBox="0 0 120 170" style={{ display: "block", width: "100%", overflow: "visible" }} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F4B25A" />
            <stop offset="1" stopColor="#C46A1E" />
          </linearGradient>
          <radialGradient id={`${id}f`} cx="50%" cy="72%" r="60%">
            <stop offset="0" stopColor="#FFFBE6" />
            <stop offset=".45" stopColor="#FFD873" />
            <stop offset="1" stopColor="#FF8A2A" />
          </radialGradient>
          <radialGradient id={`${id}g`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FFD58A" stopOpacity=".9" />
            <stop offset="1" stopColor="#FFB060" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}j`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".28" />
            <stop offset=".18" stopColor="#fff" stopOpacity=".06" />
            <stop offset=".8" stopColor="#fff" stopOpacity=".04" />
            <stop offset="1" stopColor="#fff" stopOpacity=".22" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="164" rx="50" ry="5" fill="rgba(0,0,0,.28)" />
        {lit ? (
          <motion.circle cx="60" cy="56" r="58" fill={`url(#${id}g)`} initial={still ? false : { scale: 0.2, opacity: 0 }} animate={still ? { opacity: 0.85 } : { scale: [1, 1.06, 0.97, 1.03, 1], opacity: [0.85, 1, 0.8, 0.95, 0.85] }} transition={still ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        ) : null}
        {/* the wax, then the glass round it */}
        <path d="M18 70H102V146C102 154 96 160 88 160H32C24 160 18 154 18 146Z" fill={`url(#${id}w)`} />
        <ellipse cx="60" cy="70" rx="42" ry="7" fill={lit ? "#FFD08A" : "#F2B76A"} />
        {lit ? <ellipse cx="60" cy="70" rx="16" ry="3.2" fill="#FFE7B8" opacity=".9" /> : null}
        <path d="M60 70C60 66 61 63 62 60" stroke="#2B1A10" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <rect x="12" y="34" width="96" height="130" rx="16" fill={`url(#${id}j)`} stroke="rgba(255,255,255,.55)" strokeWidth="2" />
        <rect x="12" y="30" width="96" height="10" rx="4" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" />
        <path d="M22 46V150" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 48V96" stroke="#fff" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
        {/* the label */}
        <rect x="20" y="94" width="80" height="50" rx="3" fill={label.paper} />
        <rect x="24" y="98" width="72" height="42" rx="2" fill="none" stroke={label.line} strokeOpacity=".5" strokeWidth=".8" />
        {lit ? (
          <motion.g style={{ transformBox: "view-box", transformOrigin: "60px 60px" }} initial={still ? false : { scale: 0, opacity: 0 }} animate={still ? { scale: 1, opacity: 1 } : { scale: [1, 1.1, 0.94, 1.05, 1], rotate: [-2, 2.5, -1.5, 1, -2], opacity: 1 }} transition={still ? undefined : { scale: { duration: 1.3, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 1.9, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.2 } }}>
            <path d="M60 24C67 36 71 45 67 54C65 60 55 60 53 54C49 45 53 36 60 24Z" fill={`url(#${id}f)`} />
            <ellipse cx="60" cy="55" rx="3" ry="4" fill="#7FA8FF" opacity=".6" />
          </motion.g>
        ) : null}
      </svg>
      {/* `min-w-0` on what goes in: the label is a grid, and a long name would otherwise stretch it past the jar. */}
      <div className="absolute grid place-items-center text-center [&>*]:min-w-0" style={{ left: "20%", right: "20%", top: "56.5%", height: "27%" }}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the letter blocks

/** The faces' grain: a wood block's rings, or a fabric block's weave. */
const BLOCK_GRAIN = "repeating-linear-gradient(8deg, rgba(255,255,255,.06) 0 2px, rgba(0,0,0,.05) 2px 3px, transparent 3px 7px)";

/**
 * Their name in wooden letter blocks, like the little shelf signs that spell FALL: one block a letter,
 * each a different painted face, set a touch crooked. A space leaves a gap. The blocks shrink to fit
 * `width` (in `--p`), and hop into place one after another unless the page is still.
 */
export function LetterBlocks({ text, look, seed, width, still, delay = 0 }: { text: string; look: Look; seed: number; width: number; still: boolean; delay?: number }) {
  const letters = useMemo(() => [...text.trim().toUpperCase()].slice(0, 14), [text]);
  const random = useMemo(() => mulberry32(seed), [seed]);
  const tilts = useMemo(() => letters.map(() => ({ r: (random() - 0.5) * 9, y: (random() - 0.5) * 1.4 })), [letters, random]);
  const count = Math.max(1, letters.length);
  const size = Math.min(12, (width - (count - 1) * 0.9) / count);
  let face = 0;
  return (
    <div className="flex items-end justify-center" style={{ gap: "calc(.9*var(--p))" }} aria-label={text} role="img">
      {letters.map((ch, i) => {
        if (ch === " ") return <span key={i} aria-hidden="true" style={{ width: `calc(${size * 0.45} * var(--p))` }} />;
        const bg = look.block.faces[face++ % look.block.faces.length];
        const light = isLight(bg);
        return (
          <motion.span
            key={`${ch}-${i}`}
            aria-hidden="true"
            className="grid place-items-center font-bold"
            style={{ width: `calc(${size} * var(--p))`, height: `calc(${size} * var(--p))`, borderRadius: `calc(${size * 0.08} * var(--p))`, backgroundColor: bg, backgroundImage: BLOCK_GRAIN, color: light ? look.block.ink : "#FFF6E6", fontFamily: POSTER_FONT, fontSize: `calc(${size * 0.66} * var(--p))`, lineHeight: 1, boxShadow: `inset 0 calc(${size * 0.06} * var(--p)) 0 rgba(255,255,255,.28), inset 0 calc(${-size * 0.08} * var(--p)) 0 rgba(0,0,0,.18), 0 calc(${size * 0.08} * var(--p)) calc(${size * 0.12} * var(--p)) rgba(50,25,10,.35)`, rotate: `${tilts[i].r}deg`, translate: `0 calc(${tilts[i].y} * var(--p))` }}
            initial={still ? false : { y: "-160%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 15, delay: delay + i * 0.07 }}
          >
            {ch}
          </motion.span>
        );
      })}
    </div>
  );
}

/** Whether a colour is light enough for dark letters. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

// ---------------------------------------------------------------- the patchwork pumpkin

const RIBS = [
  { cx: 34, cy: 66, rx: 24, ry: 34, fabric: "b" },
  { cx: 106, cy: 66, rx: 24, ry: 34, fabric: "d" },
  { cx: 50, cy: 65, rx: 25, ry: 37, fabric: "a" },
  { cx: 90, cy: 65, rx: 25, ry: 37, fabric: "c" },
  { cx: 70, cy: 64, rx: 22, ry: 39, fabric: "a2" },
] as const;

/**
 * A pumpkin sewn from scraps: each rib a different fabric (calico dots, gingham, a little floral,
 * polka dots), running stitches round every patch, and a felt stem and leaf.
 */
export function PatchworkPumpkin({ look, className, style }: { look: Look; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  const f = look.fabrics;
  const fill = (fabric: string) => `url(#${id}${fabric})`;
  return (
    <svg viewBox="0 0 140 120" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <pattern id={`${id}a`} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={f.a} />
          <circle cx="2" cy="2" r="1" fill={f.aInk} />
          <circle cx="6" cy="6" r="1" fill={f.aInk} />
        </pattern>
        <pattern id={`${id}a2`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
          <rect width="10" height="10" fill={f.a} />
          <path d="M0 5H10" stroke={f.aInk} strokeOpacity=".55" strokeWidth="1.2" />
        </pattern>
        <pattern id={`${id}b`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill={f.b} />
          <rect width="5" height="10" fill={f.bInk} opacity=".35" />
          <rect width="10" height="5" fill={f.bInk} opacity=".35" />
        </pattern>
        <pattern id={`${id}c`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={f.c} />
          <g fill={f.cInk}>
            <circle cx="3" cy="3" r="1.1" />
            <circle cx="5" cy="3" r="1.1" />
            <circle cx="4" cy="1.6" r="1.1" />
            <circle cx="4" cy="4.4" r="1.1" />
            <circle cx="9.5" cy="9" r="0.9" />
          </g>
        </pattern>
        <pattern id={`${id}d`} width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill={f.d} />
          <circle cx="4.5" cy="4.5" r="1.8" fill={f.dInk} />
        </pattern>
        <radialGradient id={`${id}s`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </radialGradient>
      </defs>
      <ellipse cx="70" cy="112" rx="56" ry="5" fill="rgba(40,20,10,.18)" />
      {RIBS.map((r, i) => (
        <g key={i}>
          <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={fill(r.fabric)} />
          <ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={`url(#${id}s)`} />
          <ellipse cx={r.cx} cy={r.cy} rx={r.rx - 2.6} ry={r.ry - 2.6} fill="none" stroke={look.stitch} strokeWidth="1.3" strokeDasharray="3.2 2.6" strokeLinecap="round" opacity=".9" />
        </g>
      ))}
      <path d="M64 30C63 21 65 13 70 8C73 6 77 8 76 11C72 16 71 22 72 30Z" fill={look.stem} />
      <path d="M67 28C66 21 68 15 71 11" fill="none" stroke={look.stitch} strokeWidth="1" strokeDasharray="2.4 2" opacity=".8" />
      <path d="M74 20C83 9 99 9 104 17C97 25 84 26 74 20Z" fill={look.leaf} />
      <path d="M77 19C85 16 94 15 101 17" fill="none" stroke={look.stitch} strokeWidth="1" strokeDasharray="2.4 2" opacity=".85" />
    </svg>
  );
}

// ---------------------------------------------------------------- the little things

/** An acorn: a glossy nut under a cross-hatched cap, with its little stalk. */
export function Acorn({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 60 82" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}n`} cx="35%" cy="35%" r="75%">
          <stop offset="0" stopColor="#E3AE6E" />
          <stop offset=".55" stopColor="#B87A3E" />
          <stop offset="1" stopColor="#7A4A22" />
        </radialGradient>
        <pattern id={`${id}h`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#6E4A2C" />
          <path d="M0 0H5M0 0V5" stroke="#9A6C44" strokeWidth="1.2" />
        </pattern>
      </defs>
      <ellipse cx="30" cy="78" rx="18" ry="3" fill="rgba(40,20,10,.2)" />
      <path d="M30 26C44 26 50 40 48 54C46 68 38 76 30 76C22 76 14 68 12 54C10 40 16 26 30 26Z" fill={`url(#${id}n)`} />
      <ellipse cx="22" cy="44" rx="4" ry="8" fill="#fff" opacity=".28" transform="rotate(-16 22 44)" />
      <path d="M6 32C6 18 16 11 30 11C44 11 54 18 54 32C54 36 50 38 46 37C40 35 20 35 14 37C10 38 6 36 6 32Z" fill={`url(#${id}h)`} />
      <path d="M8 31C14 33 46 33 52 31" stroke="#4A2E18" strokeOpacity=".5" strokeWidth="1.4" fill="none" />
      <path d="M30 11C30 7 32 3 36 1" stroke="#5A3A20" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** A heart cut from a piece of wood: grain running through it and a bevelled edge. */
export function WoodHeart({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  const heart = "M50 86C30 72 6 56 6 32C6 16 18 6 31 6C40 6 46 11 50 18C54 11 60 6 69 6C82 6 94 16 94 32C94 56 70 72 50 86Z";
  return (
    <svg viewBox="0 0 100 92" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C99566" />
          <stop offset="1" stopColor="#8E5A30" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={heart} />
        </clipPath>
      </defs>
      <path d={heart} fill="rgba(40,20,10,.25)" transform="translate(2 4)" />
      <path d={heart} fill={`url(#${id}w)`} />
      <g clipPath={`url(#${id}c)`} fill="none" stroke="#6A3E1C" strokeOpacity=".35" strokeWidth="1.4">
        <path d="M0 20C30 14 60 26 100 18" />
        <path d="M0 34C26 28 64 42 100 32" />
        <path d="M0 50C30 44 58 58 100 48" />
        <path d="M0 64C34 58 60 70 100 62" />
        <ellipse cx="66" cy="40" rx="6" ry="3" />
      </g>
      <path d={heart} fill="none" stroke="#F2D3A8" strokeOpacity=".5" strokeWidth="2.4" transform="translate(-1 -1) scale(.98) translate(1 1)" />
      <circle cx="50" cy="26" r="3" fill="#5A3418" opacity=".7" />
    </svg>
  );
}

/** Three wisps of steam rising off a cup, unless the page is still. */
export function Steam({ still, className }: { still: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 40 50" className={className} style={{ display: "block", width: "100%", overflow: "visible" }} aria-hidden="true">
      {[8, 20, 32].map((x, i) => (
        <motion.path key={x} d={`M${x} 48C${x - 6} 38 ${x + 6} 30 ${x} 20C${x - 5} 12 ${x + 4} 6 ${x} 0`} fill="none" stroke="#FFFFFF" strokeOpacity=".75" strokeWidth="2.6" strokeLinecap="round" animate={still ? undefined : { y: [6, -6], opacity: [0, 0.8, 0] }} transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }} />
      ))}
    </svg>
  );
}

/** A kraft tag on a string, with a line in handwriting. */
export function KraftTag({ children, look, className }: { children: ReactNode; look: Look; className?: string }) {
  return (
    <div className={className} style={{ position: "relative" }}>
      <div className="relative rounded-[calc(1*var(--p))] py-[calc(2.2*var(--p))] pr-[calc(3*var(--p))] pl-[calc(7*var(--p))] text-center" style={{ backgroundColor: look.tag.paper, backgroundImage: PAPER_GRAIN, color: look.tag.ink, clipPath: "polygon(16% 0, 100% 0, 100% 100%, 16% 100%, 0 50%)", filter: "drop-shadow(0 calc(.6*var(--p)) calc(1*var(--p)) rgba(50,25,10,.28))" }}>
        <span aria-hidden="true" className="absolute top-1/2 left-[calc(3.2*var(--p))] block h-[calc(2*var(--p))] w-[calc(2*var(--p))] -translate-y-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 calc(.45*var(--p)) ${look.tag.string}`, background: look.wall }} />
        {children}
      </div>
    </div>
  );
}

/**
 * A recipe card for the note: a red rule along the top, faint blue lines down it, and "recipe for us"
 * as the title. Its size is fixed (`ASPECT`), the handwriting shrinking as the note grows, so the
 * pieces round it can be placed against its edges.
 */
export const RECIPE_ASPECT = 1.18;
export function RecipeCard({ title, text, look }: { title: string; text: string; look: Look }) {
  const length = [...text].length;
  const size = length <= 34 ? 4.8 : length <= 60 ? 4.2 : 3.7;
  return (
    <div className="relative flex w-full flex-col overflow-hidden px-[calc(4.4*var(--p))] pt-[calc(3*var(--p))]" style={{ aspectRatio: String(RECIPE_ASPECT), backgroundColor: "#FFFDF7", backgroundImage: `repeating-linear-gradient(180deg, transparent 0 calc(5.5*var(--p) - 1px), rgba(90,140,200,.35) calc(5.5*var(--p) - 1px) calc(5.5*var(--p))), ${PAPER_GRAIN}`, backgroundPosition: "0 calc(3.4*var(--p)), 0 0", color: look.ink, boxShadow: "0 calc(1.2*var(--p)) calc(2.6*var(--p)) rgba(50,25,10,.3)" }}>
      <span aria-hidden="true" className="absolute inset-x-0 top-[calc(8.4*var(--p))] h-[2px]" style={{ background: "rgba(214,72,72,.55)" }} />
      <p className="text-[calc(2.4*var(--p))] font-semibold tracking-[0.3em] uppercase opacity-60">{title}</p>
      <p className="mt-[calc(3.6*var(--p))] text-balance" style={{ fontFamily: "var(--gift-font-hand)", fontSize: `calc(${size} * var(--p))`, lineHeight: 1.32, overflowWrap: "anywhere" }}>
        {text}
      </p>
    </div>
  );
}
