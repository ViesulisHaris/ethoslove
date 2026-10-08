"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { Polaroid, Scrap } from "../_shared/collage/kit";
import { BabyBreath, BinderClip, Doodle, Pearl, Washi, Watercolor } from "../_shared/collage/stationery";
import type { Look } from "./looks";

const EASE = [0.45, 0, 0.25, 1] as const;

/** What holds a polaroid to the page. */
export type Hold = "gingham" | "hearts" | "dots" | "clip";

/** A polaroid stuck down with washi tape or a binder clip, the way the inspiration page holds them. */
export function HeldPolaroid({ photo, look, hold, lip = 11, onOpen, still, children }: { photo: GiftPhoto | undefined; look: Look; hold: Hold; lip?: number; onOpen?: () => void; still: boolean; children?: ReactNode }) {
  return (
    <div className="relative">
      <Polaroid photo={photo} lip={lip} paper={look.paper} onOpen={onOpen} still={still}>
        {children}
      </Polaroid>
      {hold === "clip" ? (
        <BinderClip className="top-[calc(-5.6*var(--p))] left-1/2 z-[3] w-[calc(10*var(--p))] -translate-x-1/2" />
      ) : hold === "hearts" ? (
        <Washi pattern="hearts" color={look.washi.hearts} ink={look.washi.heartsInk} width={20} className="top-[calc(-1.4*var(--p))] left-[calc(-5*var(--p))] -rotate-[32deg]" />
      ) : (
        <Washi pattern={hold} color={hold === "gingham" ? look.washi.gingham : look.washi.dots} ink="rgba(255,255,255,.6)" width={22} className="top-[calc(-2.4*var(--p))] left-1/2 -translate-x-1/2 -rotate-[3deg]" />
      )}
    </div>
  );
}

/** Handwriting on a polaroid's lip, with a small pen heart after it: "my fave ♡". */
export function LipWords({ children, look, size = 5.4 }: { children: ReactNode; look: Look; size?: number }) {
  return (
    <span className="flex max-w-full items-center justify-center gap-[calc(1.2*var(--p))]" style={{ color: look.ink }}>
      <span className="truncate px-[0.1em] leading-[1.25]" style={{ fontFamily: SCRIPT_FONT, fontSize: `calc(${size} * var(--p))` }}>
        {children}
      </span>
      <Doodle kind="heart" color={look.ink} className="h-[calc(3.6*var(--p))] w-[calc(3.6*var(--p))] shrink-0" />
    </span>
  );
}

/** A polaroid under the tissue: their photo when there is one, a soft wash where it would be when not. */
function GhostFrame({ look, photo, style }: { look: Look; photo?: GiftPhoto; style: CSSProperties }) {
  return (
    <span aria-hidden="true" className="absolute block" style={{ background: look.paper, padding: "3% 3% 13%", boxShadow: "0 calc(1*var(--p)) calc(2*var(--p)) rgba(80,40,50,.18)", ...style }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt="" draggable={false} className="block aspect-square w-full object-cover" />
      ) : (
        <span className="block aspect-square w-full" style={{ background: `linear-gradient(160deg, ${look.washes[1]}, ${look.washes[0]} 70%)`, opacity: 0.85 }} />
      )}
    </span>
  );
}

/** Gold sparkles, the little four-pointed stars dotted round a scrapbook page. */
export const GOLD = "#D2AE63";

/**
 * The first screen: a scrapbook page under a sheet of tissue paper, held at the top by a strip of
 * gingham tape, with their name written on the tissue. The page shows through, soft. Lifting it, the
 * tape comes away first, then the sheet swings up off the page.
 */
export function Vellum({ look, forLabel, name, photos = [], lifting, reduce }: { look: Look; forLabel: string; name: string; photos?: GiftPhoto[]; lifting: boolean; reduce: boolean }) {
  const at = (delay: number, duration: number) => ({ duration: reduce ? 0.15 : duration, delay: reduce ? 0 : delay, ease: EASE });
  return (
    <div className="relative w-full" style={{ aspectRatio: "0.72", perspective: "calc(300*var(--p))" }}>
      {/* round the sheet, on the page it lies on */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Watercolor color={look.washes[1]} seed={31} className="top-[-14%] right-[-26%] h-[40%] w-[62%]" />
        <Watercolor color={look.washes[0]} seed={37} className="bottom-[-12%] left-[-24%] h-[38%] w-[60%]" />
        <span className="absolute bottom-[-9%] left-[-15%] block w-[30%] -rotate-[24deg]">
          <BabyBreath seed={13} tint={look.washi.dots} heart={look.accent} />
        </span>
        <Pearl size={2.6} className="top-[-6%] left-[6%]" />
        <Pearl size={2} className="top-[-3.5%] left-[11%]" />
        <Pearl size={2.4} className="right-[-6%] bottom-[22%]" />
        <Doodle kind="sparkles" color={GOLD} className="absolute top-[-10%] left-[30%] h-[calc(7*var(--p))] w-[calc(9*var(--p))]" />
        <Doodle kind="sparkle" color={GOLD} className="absolute right-[-7%] bottom-[8%] h-[calc(4.4*var(--p))] w-[calc(4.4*var(--p))]" />
        <Doodle kind="heart" color={look.accent} className="absolute top-[30%] left-[-9%] h-[calc(5*var(--p))] w-[calc(5*var(--p))] -rotate-12" />
      </div>
      {/* the page underneath */}
      <div aria-hidden="true" className="absolute inset-0">
        <Watercolor color={look.washes[0]} seed={11} className="top-[2%] left-[-8%] h-[62%] w-[84%]" />
        <Watercolor color={look.washes[1]} seed={23} className="top-[50%] left-[36%] h-[48%] w-[70%]" />
        <GhostFrame look={look} photo={photos[0]} style={{ left: "10%", top: "8%", width: "52%", rotate: "-4deg" }} />
        <GhostFrame look={look} photo={photos[1]} style={{ left: "52%", top: "40%", width: "40%", rotate: "5deg" }} />
        <GhostFrame look={look} photo={photos[2]} style={{ left: "6%", top: "60%", width: "42%", rotate: "-6deg" }} />
        <span className="absolute top-[2%] left-[70%] block w-[24%]">
          <Scrap id="sakura" eager tone={look.tone} />
        </span>
        <span className="absolute top-[14%] left-[62%] block w-[22%]">
          <BabyBreath seed={5} tint={look.washi.dots} heart={look.accent} />
        </span>
        <span className="absolute top-[64%] left-[64%] block w-[30%]">
          <Scrap id="tulips-wrapped" eager tone={look.tone} />
        </span>
      </div>

      {/* the tissue paper */}
      <motion.div
        className="absolute inset-[-3%] origin-top rounded-[calc(1*var(--p))]"
        style={{ backgroundColor: "rgba(255,253,250,.5)", backgroundImage: `linear-gradient(160deg, rgba(255,255,255,.5), transparent 40%), ${PAPER_GRAIN}`, backdropFilter: "blur(3.5px) saturate(.95)", WebkitBackdropFilter: "blur(3.5px) saturate(.95)", boxShadow: "0 calc(1.6*var(--p)) calc(4*var(--p)) rgba(80,40,50,.16), inset 0 0 0 1px rgba(255,255,255,.6)" }}
        animate={lifting ? { rotateX: 68, y: "-48%", opacity: 0 } : { rotateX: 0, y: 0, opacity: 1 }}
        transition={at(0.25, 0.95)}
      >
        <div className="absolute inset-x-[10%] top-[34%] flex flex-col items-center text-center" style={{ color: look.wallInk }}>
          <span className="text-[calc(2.6*var(--p))] font-semibold tracking-[0.36em] uppercase opacity-60">{forLabel}</span>
          <FitName as="p" className="mt-[calc(.6*var(--p))] w-full text-[calc(13*var(--p))] leading-[1.15]" style={{ fontFamily: SCRIPT_FONT }}>
            {name}
          </FitName>
          <Doodle kind="heart" color={look.accent} className="mt-[calc(.6*var(--p))] h-[calc(6*var(--p))] w-[calc(6*var(--p))]" />
        </div>
        {/* the corner, curling up where you'd take hold of it */}
        <span aria-hidden="true" className="absolute right-0 bottom-0 block h-[13%] w-[18%] rounded-br-[calc(1*var(--p))]" style={{ background: "linear-gradient(135deg, transparent 49%, rgba(255,255,255,.95) 50%, #F1E7E2 100%)", boxShadow: "calc(-.6*var(--p)) calc(-.6*var(--p)) calc(1.4*var(--p)) rgba(80,40,50,.12)" }} />
        <Pearl size={2.4} className="top-[6%] right-[8%]" />
        <Pearl size={1.8} className="top-[9.5%] right-[13%]" />
        <span className="absolute top-[3%] left-[4%] block w-[22%] -rotate-[14deg]">
          <Scrap id="bow-satin-pink" eager tone={look.tone} />
        </span>
      </motion.div>

      <motion.div className="absolute top-[-5%] left-1/2 z-[3] w-0" animate={lifting ? { y: "-200%", rotate: -24, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }} transition={at(0, 0.4)}>
        <Washi pattern="gingham" color={look.washi.gingham} width={30} className="relative -translate-x-1/2 -rotate-[2deg]" style={{ position: "relative" }} />
      </motion.div>
    </div>
  );
}
