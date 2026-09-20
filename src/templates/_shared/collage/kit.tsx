"use client";
/* eslint-disable @next/next/no-img-element */

import { createContext, useContext, useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { TemplateEvent, TemplateMode } from "../../types";
import { SCRAPS, scrapSrc, type ScrapId } from "./scraps";
import { tornPolygon, type TornSides } from "./paper";

/**
 * What every piece of a collage needs to know about the page it is on: the element that scrolls,
 * whether anything should move at all, and how many pixels one `--p` is.
 */
type Collage = { container: RefObject<HTMLDivElement | null> | null; still: boolean; unit: number };
export const CollageContext = createContext<Collage>({ container: null, still: true, unit: 4 });

/** One cut-out. `width` is any CSS length; the height follows the picture. Decorative. */
export function Scrap({ id, width = "100%", shadow = true, eager = false, className, style }: { id: ScrapId; width?: string; shadow?: boolean; eager?: boolean; className?: string; style?: CSSProperties }) {
  const info = SCRAPS[id];
  return (
    <img
      src={scrapSrc(id)}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("pointer-events-none block max-w-none select-none", className)}
      style={{ width, aspectRatio: `${info.w} / ${info.h}`, filter: shadow ? "drop-shadow(0 calc(.5*var(--p)) calc(.8*var(--p)) rgba(40,15,25,.26))" : undefined, ...style }}
    />
  );
}

export type Entrance = "bloom" | "stick" | "left" | "right" | "drop" | "stamp" | "none";

const FROM: Record<Exclude<Entrance, "none">, { opacity: number; scale?: number; x?: string; y?: string; rotate: number }> = {
  bloom: { opacity: 0, scale: 0.55, rotate: -24 },
  stick: { opacity: 0, scale: 1.14, y: "8%", rotate: 8 },
  left: { opacity: 0, x: "-46%", rotate: -14 },
  right: { opacity: 0, x: "46%", rotate: 14 },
  drop: { opacity: 0, y: "-38%", rotate: -9 },
  stamp: { opacity: 0, scale: 2.3, rotate: 16 },
};

/** Moves its children against the scroll while they cross the screen: `amount` in `--p`, each way. */
function Drift({ amount, children }: { amount: number; children: ReactNode }) {
  const { container, still, unit } = useContext(CollageContext);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, container: container ?? undefined, offset: ["start end", "end start"] });
  const travel = useTransform(scrollYProgress, [0, 1], [amount * unit, -amount * unit]);
  return (
    <motion.div ref={ref} style={{ y: still ? 0 : travel }}>
      {children}
    </motion.div>
  );
}

/**
 * A thing on the page, placed by its middle: `x`, `y` and `w` in `--p`, measured from the section's
 * top-left corner (the column is 100 wide, so `x` is also a percentage). It arrives when it scrolls
 * into view, drifts a little against the scroll when `drift` is set, and sways in place when `sway`
 * is. None of that happens in the editor or without motion. Only a drifting piece watches the
 * scroll, so a page of forty pieces costs a handful of observers, not forty.
 */
export function Piece({ x, y, w, rotate = 0, z = 1, drift = 0, entrance = "bloom", delay = 0, sway = false, className, children }: { x: number; y: number; w: number; rotate?: number; z?: number; drift?: number; entrance?: Entrance; delay?: number; sway?: boolean; className?: string; children: ReactNode }) {
  const { still } = useContext(CollageContext);
  const from = entrance === "none" ? null : FROM[entrance];
  const body = (
    <motion.div
      style={{ rotate }}
      initial={still || !from ? false : { ...from, rotate: rotate + from.rotate }}
      whileInView={{ opacity: 1, scale: 1, x: 0, y: 0, rotate }}
      viewport={{ once: true, amount: 0.15 }}
      transition={entrance === "stamp" ? { type: "spring", stiffness: 520, damping: 24, mass: 0.7, delay } : { type: "spring", stiffness: 120, damping: 15, mass: 0.9, delay }}
    >
      <div className={cn(sway && !still && "cl-sway")} style={sway ? ({ "--pace": `${4.2 + ((x + y) % 5) * 0.5}s`, animationDelay: `${-((x * 7 + y) % 40) / 10}s` } as CSSProperties) : undefined}>
        {children}
      </div>
    </motion.div>
  );
  return (
    <div className={cn("absolute", className)} style={{ left: `calc(${x} * var(--p))`, top: `calc(${y} * var(--p))`, width: `calc(${w} * var(--p))`, translate: "-50% -50%", zIndex: z }}>
      {drift ? <Drift amount={drift}>{body}</Drift> : body}
    </div>
  );
}

/**
 * A sheet torn along the sides you name. A paler copy torn a little less shows round the edge,
 * which is the white fibre a real tear leaves.
 */
export function TornPaper({ seed, sides, depth = 3, color, rim = "#FFFFFF", grain, className, style, children }: { seed: number; sides: TornSides; depth?: number; color: string; rim?: string; grain?: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cn("relative", className)} style={{ filter: "drop-shadow(0 calc(.6*var(--p)) calc(1.1*var(--p)) rgba(40,15,25,.2))", ...style }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ background: rim, clipPath: tornPolygon(seed + 17, sides, depth * 0.45) }} />
      <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: color, backgroundImage: grain, clipPath: tornPolygon(seed, sides, depth, 22) }} />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Handwriting across a sheet, faint, the way the back of an old letter shows through. */
export function ScriptLines({ lines, color, size = 4.4, font, className }: { lines: string[]; color: string; size?: number; font: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -inset-x-[6%] top-[2%] -rotate-[4deg]" style={{ color, fontFamily: font, fontSize: `calc(${size} * var(--p))`, lineHeight: 1.62 }}>
        {lines.map((line, i) => (
          <p key={i} className="whitespace-nowrap" style={{ marginLeft: `${(i * 37) % 11}%` }}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** A length of washi tape. */
export function Tape({ color, width = 16, className, style }: { color: string; width?: number; className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={cn("pointer-events-none absolute block", className)} style={{ width: `calc(${width} * var(--p))`, height: "calc(4.2*var(--p))", background: `repeating-linear-gradient(90deg, ${color} 0 calc(1.2*var(--p)), color-mix(in srgb, ${color} 78%, white) calc(1.2*var(--p)) calc(2.4*var(--p)))`, opacity: 0.86, boxShadow: "0 1px 2px rgba(0,0,0,.18)", ...style }} />;
}

const FRAME_SHADOW = "0 calc(1.3*var(--p)) calc(2.8*var(--p)) rgba(40,18,22,.32), 0 0 0 1px rgba(60,40,30,.05)";

/** The picture inside any frame: a button when it can be opened large, and it "develops" as it scrolls into view. */
export function Shot({ photo, aspect, onOpen, still, className }: { photo: GiftPhoto | undefined; aspect: number; onOpen?: () => void; still: boolean; className?: string }) {
  // The editor draws the page before the first photo is in: the frame waits, empty.
  if (!photo)
    return (
      <span aria-hidden="true" className={cn("grid w-full place-items-center bg-[#E9DFD6]", className)} style={{ aspectRatio: String(aspect) }}>
        <svg viewBox="0 0 24 24" className="h-[22%] w-[22%] opacity-35">
          <path d="M4 7h3l2-2.5h6L17 7h3v12H4z M12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="none" stroke="#5A4A44" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </span>
    );
  return (
    <button type="button" onClick={onOpen} disabled={!onOpen} aria-label={photo.caption || photo.alt || "photo"} className={cn("relative block w-full overflow-hidden bg-[#1A1716] outline-none focus-visible:ring-4 focus-visible:ring-black/40 disabled:cursor-default", className)} style={{ aspectRatio: String(aspect) }}>
      <motion.img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" initial={still ? false : { filter: "sepia(.7) brightness(1.5) contrast(.7) saturate(.6)" }} whileInView={{ filter: "sepia(0) brightness(1) contrast(1) saturate(1)" }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: 1.7, delay: 0.25, ease: "easeOut" }} />
    </button>
  );
}

/**
 * A polaroid. `pattern` paints the frame (gingham, say) over `paper`; `lip` is the height of the
 * strip under the picture, where `children` go: a caption, a scribble, a word.
 */
export function Polaroid({ photo, aspect = 0.94, lip = 9, paper = "#FFFDF8", pattern, onOpen, still, children }: { photo: GiftPhoto | undefined; aspect?: number; lip?: number; paper?: string; pattern?: CSSProperties; onOpen?: () => void; still: boolean; children?: ReactNode }) {
  return (
    <div className="relative w-full" style={{ padding: "calc(2.4*var(--p)) calc(2.4*var(--p)) 0", backgroundColor: paper, boxShadow: FRAME_SHADOW, ...pattern }}>
      <div style={{ boxShadow: pattern ? "0 0 0 calc(.35*var(--p)) rgba(255,255,255,.95), 0 0 0 calc(.5*var(--p)) rgba(120,80,90,.25)" : undefined }}>
        <Shot photo={photo} aspect={aspect} onOpen={onOpen} still={still} />
      </div>
      <div className="grid place-items-center overflow-hidden px-[calc(1.5*var(--p))] text-center" style={{ height: `calc(${lip} * var(--p))` }}>
        {children}
      </div>
    </div>
  );
}

/** A caption in handwriting that fits on one line of a polaroid's lip. */
export function Caption({ children, color = "#3A2A2E", size = 3.6 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <span className="block max-w-full truncate leading-none" style={{ fontFamily: "var(--gift-font-hand)", fontSize: `calc(${size} * var(--p))`, color }}>
      {children}
    </span>
  );
}

/** Opens a photo large over everything; a tap anywhere closes it. */
export function Lightbox({ photo, onClose, closeLabel }: { photo: GiftPhoto; onClose: () => void; closeLabel: string }) {
  return (
    <motion.div className="absolute inset-0 z-[60] grid place-items-center bg-black/80 p-[calc(5*var(--k))]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.figure className="m-0 max-h-full bg-[#FFFDF8] p-[calc(2.4*var(--k))] pb-[calc(3*var(--k))] shadow-2xl" initial={{ scale: 0.8, rotate: -4 }} animate={{ scale: 1, rotate: -1.5 }} exit={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
        <img src={photo.url} alt={photo.alt ?? ""} className="block max-h-[68cqh] max-w-full object-contain" />
        {photo.caption ? (
          <figcaption className="mt-[calc(2*var(--k))] text-center text-[calc(4*var(--k))] leading-tight text-[#2E2622]" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {photo.caption}
          </figcaption>
        ) : null}
      </motion.figure>
      <button type="button" aria-label={closeLabel} onClick={onClose} className="absolute inset-0 outline-none" />
    </motion.div>
  );
}

/** "scroll" and a chevron that bobs, until the page has moved. */
export function ScrollHint({ label, color, hidden }: { label: string; color: string; hidden: boolean }) {
  return (
    <motion.p aria-hidden="true" className="pointer-events-none flex flex-col items-center gap-[calc(.6*var(--p))] text-[calc(2.5*var(--p))] font-semibold tracking-[0.3em] uppercase" style={{ color }} animate={{ opacity: hidden ? 0 : 0.85 }} transition={{ duration: 0.4 }}>
      {label}
      <svg viewBox="0 0 24 14" className="cl-nudge h-[calc(2.4*var(--p))] w-[calc(4.2*var(--p))]">
        <path d="M2 2l10 9 10-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.p>
  );
}

/**
 * Reports how far down the page they have read, in tenths, and that they reached the end when
 * `end` comes into view. Silent in the editor.
 */
export function useReadProgress(container: RefObject<HTMLDivElement | null>, end: RefObject<HTMLDivElement | null>, mode: TemplateMode, onEvent: ((event: TemplateEvent) => void) | undefined, onFirstScroll?: () => void) {
  const eventRef = useRef(onEvent);
  const firstRef = useRef(onFirstScroll);
  useEffect(() => {
    eventRef.current = onEvent;
    firstRef.current = onFirstScroll;
  });
  useEffect(() => {
    const el = container.current;
    if (!el || mode === "preview") return;
    let reported = 0;
    let moved = false;
    const onScroll = () => {
      if (!moved && el.scrollTop > 24) {
        moved = true;
        firstRef.current?.();
      }
      const room = el.scrollHeight - el.clientHeight;
      if (room <= 0) return;
      const tenth = Math.floor((el.scrollTop / room) * 10);
      if (tenth > reported) {
        reported = tenth;
        eventRef.current?.({ type: "progress", pct: Math.min(95, 30 + tenth * 6.5) });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [container, mode]);

  useEffect(() => {
    const el = end.current;
    if (!el || mode === "preview") return;
    let ended = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!ended && entries.some((e) => e.isIntersecting)) {
          ended = true;
          eventRef.current?.({ type: "progress", pct: 100 });
          eventRef.current?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, mode]);
}

export const COLLAGE_KEYFRAMES = `
@keyframes cl-sway { 0%,100% { rotate: -2.4deg } 50% { rotate: 2.4deg } }
@keyframes cl-nudge { 0%,100% { translate: 0 0 } 50% { translate: 0 calc(.9*var(--p)) } }
@keyframes cl-flutter { 0%,100% { scale: 1 1; translate: 0 0 } 25% { scale: .55 1; translate: calc(.6*var(--p)) calc(-.8*var(--p)) } 50% { scale: 1 1; translate: calc(1.2*var(--p)) calc(-.2*var(--p)) } 75% { scale: .6 1; translate: calc(.5*var(--p)) calc(.5*var(--p)) } }
@keyframes cl-spin { to { rotate: 360deg } }
.cl-sway { animation: cl-sway var(--pace, 5s) ease-in-out infinite; transform-origin: 50% 85%; }
.cl-nudge { animation: cl-nudge 1.5s ease-in-out infinite; }
.cl-flutter { animation: cl-flutter 1.9s ease-in-out infinite; }
.cl-spin { animation: cl-spin 5s linear infinite; }
@media (prefers-reduced-motion: reduce) { .cl-sway, .cl-nudge, .cl-flutter, .cl-spin { animation: none; } }
`;
