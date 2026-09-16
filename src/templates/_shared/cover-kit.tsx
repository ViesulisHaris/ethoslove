"use client";

/**
 * What every template's first screen is made of, so each one opens the way the Scrapbook does: one
 * tactile object in the middle of a soft, decorated page, their name on it, a few die-cut stickers
 * pressed around it, a slow idle float, and a breathing pill that says what to do. The object belongs
 * to the template; the page, stickers, float, tag and pill are shared, so the gallery reads as one
 * family. Everything sizes in --k (COVER_VARS), so a cover fits a phone, a laptop and a 390 × 600 poster.
 */
import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Sticker, type StickerId } from "./covers/stickers";

/** --k follows the width on a phone and the height on a short, wide screen, so the whole scene stays in frame. */
export const COVER_VARS = { "--k": "min(var(--u), 0.5cqh)" } as CSSProperties;
export const POSTER_FONT = "var(--font-poster), Georgia, serif";
export const SCRIPT_FONT = "var(--font-script), var(--gift-font-hand), cursive";

/** Paper grain, multiplied over whatever colour sits underneath. */
export const PAPER_GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

export type CoverTone = {
  page: string;
  /** A warm light behind the object, and a coloured haze in two corners. */
  glow: readonly [string, string];
  /** The pill's words on a light page. */
  accent: string;
  dark?: boolean;
};

/** The page: its colour, an optional print (gingham, dots, stars), a light behind the object, a soft vignette and grain. */
export function CoverPage({ tone, pattern, className }: { tone: CoverTone; pattern?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)} style={{ backgroundColor: tone.page }}>
      {pattern ? <div className="absolute inset-0" style={{ background: pattern }} /> : null}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(58% 40% at 50% 52%, ${tone.glow[0]}, transparent 72%), radial-gradient(48% 34% at 92% 6%, ${tone.glow[1]}, transparent 72%), radial-gradient(52% 36% at 6% 98%, ${tone.glow[1]}, transparent 72%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: tone.dark ? "radial-gradient(125% 95% at 50% 48%, transparent 52%, rgba(0,0,0,.5))" : "radial-gradient(125% 95% at 50% 48%, transparent 58%, rgba(90,50,40,.13))" }}
      />
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: tone.dark ? 0.3 : 0.7 }} />
    </div>
  );
}

/** A slow idle float, so the object looks alive in a still frame of a screen recording as much as in motion. */
export function Float({ children, reduce, amount = 1, duration = 5.2, delay = 0, className }: { children: ReactNode; reduce: boolean; amount?: number; duration?: number; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      animate={reduce ? undefined : { y: [0, -7 * amount, 0], rotate: [0, 0.7 * amount, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export type StickerPlacement = { id: StickerId; x: number; y: number; size: number; rotate?: number };

/** Die-cut stickers pressed onto the page around the object: centres in % of the frame, widths in --k. */
export function StickerScatter({ items, reduce, delay = 0.35, className }: { items: StickerPlacement[]; reduce: boolean; delay?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {items.map((s, i) => (
        <div
          key={`${s.id}-${i}`}
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `calc(${s.size} * var(--k))`, transform: `translate(-50%, -50%) rotate(${s.rotate ?? 0}deg)` }}
        >
          <motion.div initial={reduce ? false : { scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: delay + i * 0.07, type: "spring", stiffness: 260, damping: 14 }}>
            <Sticker id={s.id} />
          </motion.div>
        </div>
      ))}
    </div>
  );
}

/**
 * The one line that says what to do. Solid at every frame (a recording can land on any of them), it
 * breathes in size instead of blinking. Decorative: the tappable object carries the same words as its label.
 */
export function TapPill({ children, tone, hidden = false, reduce, delay = 0.9, className }: { children: ReactNode; tone: CoverTone; hidden?: boolean; reduce: boolean; delay?: number; className?: string }) {
  return (
    <motion.p
      aria-hidden="true"
      className={cn(
        "rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-center text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] whitespace-nowrap uppercase backdrop-blur-sm",
        className,
      )}
      style={{
        background: tone.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.8)",
        color: tone.dark ? "#FFF8EE" : tone.accent,
        boxShadow: tone.dark ? "inset 0 0 0 1px rgba(255,255,255,.2)" : "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(70,35,25,.14)",
      }}
      initial={{ opacity: 0 }}
      animate={hidden ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }}
      transition={hidden ? { duration: 0.2 } : { opacity: { delay, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
    >
      {children}
    </motion.p>
  );
}

/** A paper tag with a punched hole and their name in handwriting: the personal touch on every cover. */
export function NameTag({
  name,
  eyebrow,
  paper = "#FFF7EC",
  ink = "#3B2A22",
  className,
  style,
}: {
  name: string;
  eyebrow?: string;
  paper?: string;
  ink?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("relative px-[calc(3.2*var(--k))] pt-[calc(4.2*var(--k))] pb-[calc(2.4*var(--k))] text-center", className)}
      style={{
        backgroundColor: paper,
        backgroundImage: PAPER_GRAIN,
        clipPath: "polygon(18% 0, 82% 0, 100% 16%, 100% 100%, 0 100%, 0 16%)",
        filter: "drop-shadow(0 calc(.8*var(--k)) calc(1.4*var(--k)) rgba(60,35,20,.28))",
        color: ink,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[calc(1.5*var(--k))] left-1/2 size-[calc(1.9*var(--k))] -translate-x-1/2 rounded-full"
        style={{ background: "rgba(70,45,30,.28)", boxShadow: "inset 0 calc(.2*var(--k)) calc(.3*var(--k)) rgba(0,0,0,.35)" }}
      />
      {eyebrow ? (
        <p className="text-[calc(2.1*var(--k))] leading-none tracking-[0.32em] uppercase opacity-70" style={{ fontFamily: POSTER_FONT }}>
          {eyebrow}
        </p>
      ) : null}
      <p className="mt-[calc(.8*var(--k))] text-[calc(5.4*var(--k))] leading-[1.1] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)" }}>
        {name}
      </p>
    </div>
  );
}
