"use client";
/* eslint-disable @next/next/no-img-element */

import { Fragment, type ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftMusic, GiftPhoto } from "@/lib/gift/schema";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { Scrap } from "../_shared/collage/kit";
import { decor, type DecorSlot, type Highlight, type Look, type Mark } from "./looks";

/** How the cover's pieces leave when the envelope opens: slow off the mark, then gone. */
const LEAVE = [0.5, 0, 0.75, 0] as const;

/**
 * An envelope seen from the flap side, sealed with a lipstick print. Opening it lifts the flap on
 * its fold and draws the letter up out of the pocket.
 */
export function Envelope({ look, name, to, opening, reduce }: { look: Look; name: string; to: string; opening: boolean; reduce: boolean }) {
  return (
    <div className="relative w-full">
      {/* the doily it was left on, and a bow on its corner: both go as it opens */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute top-[56%] left-[44%] w-[90%]" style={{ x: "-50%", y: "-50%", rotate: -12 }} initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -40 }} animate={opening ? { opacity: 0, scale: 1.1, rotate: -4 } : { opacity: look.dark ? 0.85 : 0.95, scale: 1, rotate: -12 }} transition={opening ? { duration: reduce ? 0.15 : 0.5, ease: LEAVE } : { type: "spring", stiffness: 70, damping: 14, delay: 0.15 }}>
        <Scrap {...decor(look, "envelopeDoily")} shadow={false} eager />
      </motion.div>
      <EnvelopeBody look={look} name={name} to={to} opening={opening} reduce={reduce} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute top-[-11%] left-[-7%] z-[5] w-[26%]" style={{ rotate: -20 }} initial={reduce ? false : { opacity: 0, scale: 0.4, rotate: -60 }} animate={opening ? { opacity: 0, x: "-80%", y: "-80%", rotate: -70 } : { opacity: 1, scale: 1, rotate: -20 }} transition={opening ? { duration: reduce ? 0.15 : 0.5, ease: LEAVE } : { type: "spring", stiffness: 260, damping: 15, delay: 1 }}>
        <Scrap {...decor(look, "envelopeBow")} eager />
      </motion.div>
    </div>
  );
}

function EnvelopeBody({ look, name, to, opening, reduce }: { look: Look; name: string; to: string; opening: boolean; reduce: boolean }) {
  const { body, flap, lining } = look.envelope;
  const ease = [0.6, 0, 0.3, 1] as const;
  return (
    <div className="relative w-full" style={{ aspectRatio: "1.42", perspective: "calc(220*var(--p))", filter: "drop-shadow(0 calc(3*var(--p)) calc(4*var(--p)) rgba(30,5,10,.4))" }}>
      {/* the inside of the envelope, and its lining */}
      <span aria-hidden="true" className="absolute inset-0 rounded-[calc(1.2*var(--p))]" style={{ backgroundColor: flap, backgroundImage: PAPER_GRAIN }} />
      <span aria-hidden="true" className="absolute inset-x-[3%] top-[3%] h-[58%] rounded-[calc(.8*var(--p))]" style={{ backgroundColor: lining, backgroundImage: "radial-gradient(rgba(255,255,255,.28) 1.1px, transparent 1.4px)", backgroundSize: "calc(3*var(--p)) calc(3*var(--p))" }} />
      {/* the letter, which rises */}
      <motion.div className="absolute inset-x-[7%] top-[8%] h-[84%] rounded-[calc(.6*var(--p))] px-[8%] pt-[7%]" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN, color: "#2A1A1C", boxShadow: "0 0 calc(1.4*var(--p)) rgba(0,0,0,.2)" }} animate={opening ? { y: "-58%" } : { y: 0 }} transition={{ duration: reduce ? 0.15 : 0.75, delay: opening && !reduce ? 0.32 : 0, ease }}>
        <FitName as="p" className="text-[calc(7*var(--p))] leading-[1.1]" style={{ fontFamily: SCRIPT_FONT }}>
          {name},
        </FitName>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="mt-[7%] block h-px bg-current opacity-20" style={{ width: `${92 - i * 11}%` }} />
        ))}
      </motion.div>
      {/* the pocket: two sides and the bottom fold over the letter */}
      <span aria-hidden="true" className="absolute inset-0 rounded-[calc(1.2*var(--p))]" style={{ backgroundColor: body, backgroundImage: PAPER_GRAIN, clipPath: "polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)" }} />
      <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.12), transparent 55%)", clipPath: "polygon(0 100%, 50% 52%, 100% 100%)" }} />
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <path d="M0 100 L50 52 L100 100" fill="none" stroke={look.dark ? "rgba(255,255,255,.16)" : "rgba(60,30,20,.2)"} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <FitName as="p" className="absolute inset-x-[8%] bottom-[5%] text-center text-[calc(6.4*var(--p))] leading-[1.1]" style={{ fontFamily: SCRIPT_FONT, color: look.ink, opacity: 0.85 }}>
        {to} {name}
      </FitName>
      {/* the flap, hinged along the top */}
      <motion.div className="absolute inset-x-0 top-0 h-[62%] origin-top" style={{ transformStyle: "preserve-3d", zIndex: opening ? 0 : 3 }} animate={opening ? { rotateX: 178 } : { rotateX: 0 }} transition={{ duration: reduce ? 0.15 : 0.6, ease }}>
        <span aria-hidden="true" className="absolute inset-0 rounded-t-[calc(1.2*var(--p))]" style={{ backgroundColor: flap, backgroundImage: PAPER_GRAIN, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.14))", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path d="M0 0 L50 100 L100 0" fill="none" stroke={look.dark ? "rgba(255,255,255,.2)" : "rgba(60,30,20,.26)"} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </motion.div>
      {/* the seal */}
      <motion.div className="absolute top-[44%] left-1/2 z-[4] w-[34%]" style={{ x: "-50%", y: "-50%", rotate: -8 }} animate={opening ? { scale: [1, 1.35, 1.2], opacity: [1, 1, 0] } : { scale: 1, opacity: 1 }} transition={{ duration: reduce ? 0.15 : 0.5, times: [0, 0.4, 1] }}>
        <Scrap {...decor(look, "seal")} eager />
      </motion.div>
    </div>
  );
}

type Bit = { slot: DecorSlot; x: number; y: number; w: number; rotate: number; edge: "top" | "bottom"; delay: number };

/**
 * What is stuck round the sealed envelope: the lace and lipstick of the page it opens onto, so
 * the cover already looks like the gift. `x` and `w` are in `--p` across the same 100-wide column
 * as the page; `y` is how far the middle sits from the top or bottom `edge`, so the pieces keep
 * to the empty bands above and below the envelope on a tall phone and a short one. None of them
 * reaches the middle band, the "open it" pill or the badge under it.
 */
const COVER_BITS: Bit[] = [
  { slot: "coverA", x: 78, y: 17, w: 76, rotate: 180, edge: "top", delay: 0 },
  { slot: "coverB", x: 18, y: 23, w: 30, rotate: -14, edge: "top", delay: 0.35 },
  { slot: "coverC", x: 16, y: 40, w: 23, rotate: -12, edge: "bottom", delay: 0.55 },
  { slot: "coverD", x: 84, y: 44, w: 25, rotate: 16, edge: "bottom", delay: 0.7 },
];

/**
 * The cut-outs round the sealed envelope. The kisses land like stamps, the lace slides in from its
 * corner, and when the envelope opens they all fly off the way they came.
 */
export function CoverBits({ look, opening, reduce }: { look: Look; opening: boolean; reduce: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-[calc(100*var(--p))] -translate-x-1/2">
      {COVER_BITS.map((b) => {
        // The first is the lace in the corner (or what a look lays there instead): it slides in, the rest land like stamps.
        const lace = b.slot === "coverA";
        const away = reduce ? {} : { x: `${(b.x - 50) * 2}%`, y: b.edge === "top" ? "-60%" : "60%" };
        return (
          <div key={b.slot} className="absolute" style={{ left: `calc(${b.x} * var(--p))`, [b.edge]: `calc(${b.y} * var(--p))`, width: `calc(${b.w} * var(--p))`, translate: b.edge === "top" ? "-50% -50%" : "-50% 50%" }}>
            <motion.div
              style={{ rotate: b.rotate }}
              initial={reduce ? false : lace ? { opacity: 0, x: "14%", y: "-14%" } : { opacity: 0, scale: 2.2, rotate: b.rotate + 16 }}
              animate={opening ? { opacity: 0, ...away } : { opacity: 1, scale: 1, x: 0, y: 0, rotate: b.rotate }}
              transition={opening ? { duration: reduce ? 0.15 : 0.55, ease: LEAVE } : lace ? { duration: 0.9, ease: [0.2, 0.8, 0.2, 1], delay: b.delay } : { type: "spring", stiffness: 520, damping: 24, mass: 0.7, delay: 0.4 + b.delay }}
            >
              <Scrap {...decor(look, b.slot)} eager shadow={!lace} style={lace ? { opacity: look.dark ? 0.9 : 0.8 } : undefined} />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

/** A heart drawn in one go with a felt-tip, the way you sign a polaroid. */
export function HeartScribble({ color, still, className }: { color: string; still: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 120 50" className={className} aria-hidden="true">
      <motion.path d="M4 40 C24 38 40 30 52 22 C62 14 58 2 50 6 C42 10 46 24 60 34 C72 24 86 8 78 4 C70 0 62 14 66 28 C70 40 96 40 116 34" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1.4, delay: 0.9, ease: "easeInOut" }} />
    </svg>
  );
}

const PEN: Record<Mark, (red: string) => React.CSSProperties> = {
  marker: () => ({ backgroundImage: "linear-gradient(transparent 52%, rgba(255,214,64,.85) 52%, rgba(255,214,64,.85) 92%, transparent 92%)" }),
  underline: (red) => ({ boxShadow: `0 calc(.55*var(--p)) 0 -0.05em ${red}`, paddingBottom: "0.05em" }),
  box: () => ({ boxShadow: "0 0 0 calc(.4*var(--p)) #8DB4F2", borderRadius: "calc(.8*var(--p))", padding: "0 calc(.7*var(--p))" }),
  heart: () => ({ boxShadow: "0 0 0 calc(.45*var(--p)) #F2809E", borderRadius: "999px", padding: "0 calc(1.1*var(--p))" }),
};

/** The words, with some of them gone over in pen. */
export function MarkedLines({ text, plan, red }: { text: string; plan: Highlight[]; red: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: ReactNode[] = [];
  let i = 0;
  while (i < words.length) {
    const run = plan.find((h) => h.start === i);
    if (run) {
      out.push(
        <span key={i} data-mark={run.mark} style={{ ...PEN[run.mark](red), boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
          {words.slice(i, i + run.length).join(" ")}
        </span>,
      );
      i += run.length;
    } else {
      out.push(<Fragment key={i}>{words[i]}</Fragment>);
      i += 1;
    }
    out.push(" ");
  }
  return <>{out}</>;
}

/**
 * The lines they'd underline, as a card: their song at the top when there is one, the words big
 * and bold, and pen marks over the best of it.
 */
export function LinesCard({ look, music, cover, fallbackTitle, fallbackArtist, children }: { look: Look; music?: GiftMusic; cover?: GiftPhoto; fallbackTitle: string; fallbackArtist: string; children: ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[calc(1.4*var(--p))] px-[calc(4.4*var(--p))] pt-[calc(4*var(--p))] pb-[calc(5*var(--p))]" style={{ backgroundColor: look.card, color: look.cardInk, boxShadow: "0 calc(1.4*var(--p)) calc(3*var(--p)) rgba(30,5,10,.32)" }}>
      <div className="flex items-center gap-[calc(2.4*var(--p))]">
        <span className="block h-[calc(9*var(--p))] w-[calc(9*var(--p))] shrink-0 overflow-hidden rounded-[calc(.8*var(--p))] bg-black/15">{cover ? <img src={cover.url} alt="" draggable={false} className="h-full w-full object-cover" /> : null}</span>
        <span className="min-w-0">
          <span className="block truncate text-[calc(3.3*var(--p))] leading-tight font-bold">{music?.title ?? fallbackTitle}</span>
          <span className="block truncate text-[calc(2.9*var(--p))] leading-tight opacity-60">{music?.artist ?? fallbackArtist}</span>
        </span>
      </div>
      <p className="mt-[calc(3.6*var(--p))] text-left text-[calc(4.5*var(--p))] leading-[1.5] font-bold tracking-[-0.01em]">{children}</p>
      <svg viewBox="0 0 40 40" aria-hidden="true" className="pointer-events-none absolute top-[calc(3*var(--p))] right-[calc(3*var(--p))] h-[calc(7*var(--p))] w-[calc(7*var(--p))] opacity-70">
        <path d="M20 3c2 9 8 15 17 17-9 2-15 8-17 17-2-9-8-15-17-17 9-2 15-8 17-17Z" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
