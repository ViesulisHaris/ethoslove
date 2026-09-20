"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, Scrap, Shot, Tape, TornPaper } from "../_shared/collage/kit";
import { Stamp } from "../_shared/collage/cards";
import { Sticker } from "../_shared/covers/stickers";
import type { Look } from "./looks";

const HEART = "M50 90 C20 66 2 46 2 27 C2 12 13 2 27 2 C37 2 45 7 50 16 C55 7 63 2 73 2 C87 2 98 12 98 27 C98 46 80 66 50 90 Z";
const HEART_MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 92' preserveAspectRatio='none'><path d='${HEART}'/></svg>`)}")`;
const heartMask: CSSProperties = { WebkitMaskImage: HEART_MASK, maskImage: HEART_MASK, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" };

const GOLD = "radial-gradient(120% 120% at 30% 22%, #FFF3C4 0%, #F1D27A 26%, #C99A3A 58%, #8A6320 100%)";
const GOLD_INSIDE = "radial-gradient(120% 120% at 60% 30%, #F6E2A0 0%, #D9B25C 40%, #9C7428 100%)";

/** A gold heart, flat: the metal, a rim, and whatever is set into it. */
function GoldHeart({ inside, children }: { inside?: boolean; children?: ReactNode }) {
  return (
    <span className="absolute inset-0 block" style={{ ...heartMask, background: inside ? GOLD_INSIDE : GOLD }}>
      <svg viewBox="0 0 100 92" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={HEART} fill="none" stroke="#7A5618" strokeOpacity=".55" strokeWidth="2.4" />
        <path d={HEART} fill="none" stroke="#FFF6D2" strokeOpacity=".7" strokeWidth="1" transform="translate(5 4.6) scale(.9)" />
      </svg>
      {children}
    </span>
  );
}

/**
 * A heart locket on a chain. Shut, it shows their initials engraved on the lid; a tap swings the
 * lid open on its hinge to the photo inside, with the engraving facing it.
 */
export function Locket({ photo, initials, engraving, open, reduce, label, onToggle }: { photo: GiftPhoto | undefined; initials: string; engraving: string; open: boolean; reduce: boolean; label: string; onToggle: () => void }) {
  const swing = { duration: reduce ? 0.15 : 0.9, ease: [0.5, 0, 0.2, 1] as const };
  return (
    <div className="relative mx-auto w-[calc(92*var(--p))]" style={{ height: "calc(60*var(--p))" }}>
      <motion.div className="absolute inset-0" animate={{ x: open ? "0%" : "-25%" }} transition={swing} style={{ perspective: "calc(260*var(--p))" }}>
        {/* the chain and the bail it hangs from */}
        <svg viewBox="0 0 92 22" className="pointer-events-none absolute -top-[calc(16*var(--p))] left-0 h-[calc(22*var(--p))] w-full overflow-visible" aria-hidden="true">
          <path d="M22 -30 C40 6 60 14 69 17 M116 -30 C98 6 78 14 69 17" fill="none" stroke="#B88A30" strokeWidth="1.1" strokeDasharray="1.6 1.1" strokeLinecap="round" />
          <circle cx="69" cy="18.4" r="3" fill="none" stroke="#C99A3A" strokeWidth="1.5" />
        </svg>
        {/* the back half, with the photo set into it */}
        <div className="absolute top-[calc(6*var(--p))] right-0 h-[calc(42.3*var(--p))] w-[calc(46*var(--p))]" style={{ filter: "drop-shadow(0 calc(1.4*var(--p)) calc(2*var(--p)) rgba(40,20,5,.4))" }}>
          <GoldHeart inside>
            <span className="absolute inset-[9%] block overflow-hidden bg-[#2A2018]" style={heartMask}>
              {photo ? <motion.img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" animate={{ filter: open ? "sepia(.25) brightness(1)" : "sepia(.9) brightness(.4)" }} transition={{ duration: reduce ? 0.1 : 1.2, delay: open && !reduce ? 0.5 : 0 }} /> : null}
            </span>
          </GoldHeart>
        </div>
        {/* the lid, hinged on its left edge */}
        <motion.div className="absolute top-[calc(6*var(--p))] right-0 h-[calc(42.3*var(--p))] w-[calc(46*var(--p))] origin-left" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: open ? -178 : 0 }} transition={swing}>
          <span className="absolute inset-0 block" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <GoldHeart>
              <svg viewBox="0 0 100 92" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                <path d="M50 74 C32 60 20 48 20 34 C20 25 27 19 35 19 C41 19 46 22 50 28 C54 22 59 19 65 19 C73 19 80 25 80 34 C80 48 68 60 50 74 Z" fill="none" stroke="#7A5618" strokeOpacity=".5" strokeWidth="1" strokeDasharray="1 2.4" />
              </svg>
              <span className="absolute inset-x-0 top-[30%] block text-center text-[calc(7.4*var(--p))] leading-none tracking-[0.04em] italic" style={{ fontFamily: POSTER_FONT, color: "#6B4A12", textShadow: "0 1px 0 rgba(255,246,210,.7)" }}>
                {initials}
              </span>
            </GoldHeart>
          </span>
          <span className="absolute inset-0 block" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <GoldHeart inside>
              <span className="absolute inset-x-[16%] top-[26%] block text-center text-[calc(4.6*var(--p))] leading-[1.15] italic" style={{ fontFamily: POSTER_FONT, color: "#5E4110", textShadow: "0 1px 0 rgba(255,246,210,.6)" }}>
                {engraving}
              </span>
            </GoldHeart>
          </span>
        </motion.div>
      </motion.div>
      <button type="button" onClick={onToggle} aria-label={label} aria-expanded={open} data-locket="" className="absolute inset-x-[8%] inset-y-0 z-[2] rounded-[30%] outline-none focus-visible:ring-4 focus-visible:ring-black/30" />
    </div>
  );
}

/** A photo on deckle-edged paper, held down with two strips of tape, with a line underneath. */
export function DeckleFrame({ photo, seed, look, number, onOpen, still }: { photo: GiftPhoto | undefined; seed: number; look: Look; number?: string; onOpen?: () => void; still: boolean }) {
  return (
    <div className="relative w-full">
      <Tape color={look.tape} width={15} className="-top-[calc(1.8*var(--p))] left-[6%] z-[1] -rotate-[8deg]" />
      <Tape color={look.tape} width={15} className="-top-[calc(1.6*var(--p))] right-[6%] z-[1] rotate-[7deg]" />
      <TornPaper seed={seed} sides={{ top: true, right: true, bottom: true, left: true }} depth={1.5} color={look.paper} rim="#FFFFFF" grain={PAPER_GRAIN}>
        <div className="px-[calc(3.6*var(--p))] pt-[calc(3.8*var(--p))] pb-[calc(3*var(--p))]">
          <Shot photo={photo} aspect={1.04} onOpen={onOpen} still={still} />
          <div className="mt-[calc(2*var(--p))] flex h-[calc(6*var(--p))] items-center justify-between gap-[calc(2*var(--p))]">
            <span className="min-w-0 flex-1 text-left">
              <Caption color={look.paperInk} size={3.8}>
                {photo?.caption}
              </Caption>
            </span>
            {number ? (
              <span className="shrink-0 text-[calc(2.3*var(--p))] tracking-[0.2em] uppercase opacity-55" style={{ fontFamily: "'Courier New', ui-monospace, monospace", color: look.paperInk }}>
                {number}
              </span>
            ) : null}
          </div>
        </div>
      </TornPaper>
    </div>
  );
}

const ZIG = "50% 0, 56% 12%, 46% 24%, 57% 38%, 45% 52%, 56% 66%, 46% 80%, 54% 100%";

/**
 * The parcel: kraft paper, twine both ways, their name on a label, and a wax seal over the knot
 * that splits down the middle when it is broken.
 */
export function Parcel({ look, dearest, name, from, broken, reduce }: { look: Look; dearest: string; name: string; from: string; broken: boolean; reduce: boolean }) {
  const ease = [0.6, 0, 0.3, 1] as const;
  const t = { duration: reduce ? 0.15 : 0.7, ease };
  const twine = (across: boolean): CSSProperties => ({ background: `repeating-linear-gradient(${across ? "90deg" : "0deg"}, ${look.twine} 0 calc(.7*var(--p)), color-mix(in srgb, ${look.twine} 70%, white) calc(.7*var(--p)) calc(1.4*var(--p)))`, boxShadow: "0 1px 2px rgba(0,0,0,.35)" });
  return (
    <div className="relative w-full" style={{ aspectRatio: "1.32", filter: "drop-shadow(0 calc(3*var(--p)) calc(4*var(--p)) rgba(40,20,5,.42))" }}>
      <span aria-hidden="true" className="absolute inset-0 rounded-[calc(1*var(--p))]" style={{ backgroundColor: look.parcel, backgroundImage: `${PAPER_GRAIN}, linear-gradient(115deg, rgba(255,255,255,.16), transparent 40%, rgba(0,0,0,.10))` }} />
      {/* the folds of the wrapping */}
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <path d="M0 0 L14 14 M100 0 L86 14 M0 100 L14 86 M100 100 L86 86 M14 14 H86 V86 H14 Z" fill="none" stroke="rgba(60,35,10,.22)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute top-[11%] left-[8%] w-[50%] -rotate-3 px-[calc(3*var(--p))] py-[calc(2.4*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 calc(.6*var(--p)) calc(1.2*var(--p)) rgba(40,20,5,.3)" }}>
        <p className="text-[calc(5*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT }}>
          {dearest}
        </p>
        <p className="mt-[calc(1*var(--p))] truncate text-[calc(7.4*var(--p))] leading-[1.05] italic" style={{ fontFamily: POSTER_FONT }}>
          {name}
        </p>
        <p className="mt-[calc(1.2*var(--p))] truncate text-[calc(2.4*var(--p))] tracking-[0.2em] uppercase opacity-55" style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}>
          {from}
        </p>
      </div>
      <div className="absolute top-[9%] right-[8%] w-[17%]">
        <Stamp color={look.ticket}>
          <span className="block w-[60%]">
            <Sticker id="heart" />
          </span>
        </Stamp>
      </div>
      <motion.span aria-hidden="true" className="absolute inset-x-0 top-[62%] h-[calc(1.5*var(--p))] origin-left" style={twine(true)} animate={broken ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }} transition={{ ...t, delay: broken && !reduce ? 0.25 : 0 }} />
      <motion.span aria-hidden="true" className="absolute inset-y-0 left-[64%] w-[calc(1.5*var(--p))] origin-top" style={twine(false)} animate={broken ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }} transition={{ ...t, delay: broken && !reduce ? 0.3 : 0 }} />
      {/* the seal: two halves of the same picture, which part company */}
      {(["left", "right"] as const).map((half) => (
        <motion.div key={half} className="absolute top-[62%] left-[64%] w-[30%]" style={{ x: "-50%", y: "-50%", clipPath: half === "left" ? `polygon(0 0, ${ZIG}, 0 100%)` : `polygon(100% 0, ${ZIG}, 100% 100%)` }} animate={broken ? { x: half === "left" ? "-78%" : "-22%", y: "-38%", rotate: half === "left" ? -24 : 26, opacity: 0 } : { x: "-50%", y: "-50%", rotate: 0, opacity: 1 }} transition={{ duration: reduce ? 0.15 : 0.65, ease: [0.2, 0.7, 0.3, 1] }}>
          <Scrap id="wax-seal" eager />
        </motion.div>
      ))}
    </div>
  );
}

/** A word torn out of a book: serif, on a scrap of the page it came from. */
export function TornWord({ word, seed, look, className }: { word: string; seed: number; look: Look; className?: string }) {
  return (
    <TornPaper seed={seed} sides={{ top: true, right: true, bottom: true, left: true }} depth={7} color={look.scrapPaper} rim="#EFE2C6" grain={PAPER_GRAIN} className={cn("w-full", className)}>
      <p className="truncate px-[calc(6*var(--p))] py-[calc(4.6*var(--p))] text-center text-[calc(10*var(--p))] leading-none" style={{ fontFamily: "var(--gift-font-display)", color: "#2A2018" }}>
        {word}
      </p>
    </TornPaper>
  );
}
