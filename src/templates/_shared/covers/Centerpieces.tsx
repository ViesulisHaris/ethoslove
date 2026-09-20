"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { EnvelopeColors, GiftBoxColors } from "./looks";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The fibres in a sheet of paper, laid over a flat colour so it stops looking like a vector. */
const PAPER = "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .2  0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")";

function SealMark({ mark }: { mark: EnvelopeColors["mark"] }) {
  if (mark === "heart") return <path d="M12 20.5s-7-4.3-9-8.6C1.6 8.8 3.2 5 6.8 5c1.9 0 3.4 1 5.2 3.1C13.8 6 15.3 5 17.2 5c3.6 0 5.2 3.8 3.8 6.9-2 4.3-9 8.6-9 8.6Z" fill="rgba(255,255,255,.88)" />;
  if (mark === "star") return <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7Z" fill="rgba(255,255,255,.9)" />;
  return (
    <g fill="rgba(255,255,255,.9)" transform="translate(-.4 -.6) scale(.62)">
      <ellipse cx="9" cy="16" rx="4" ry="5.4" transform="rotate(-18 9 16)" />
      <ellipse cx="17" cy="9.5" rx="4" ry="5.6" transform="rotate(-6 17 9.5)" />
      <ellipse cx="25.5" cy="10" rx="4" ry="5.6" transform="rotate(8 25.5 10)" />
      <ellipse cx="32.5" cy="17" rx="3.8" ry="5.2" transform="rotate(22 32.5 17)" />
      <path d="M20.5 19c5.6 0 10.2 5.2 10.2 10 0 3.6-2.6 5.4-5.6 5.4-1.9 0-3-.8-4.6-.8s-2.7.8-4.6.8c-3 0-5.6-1.8-5.6-5.4 0-4.8 4.6-10 10.2-10Z" />
    </g>
  );
}

/**
 * An envelope whose flap folds open and a letter slides out. Layering is the whole trick:
 * the flap sits on top of the pocket while closed, then drops behind the letter once it has
 * swung past vertical, so the letter can rise out in front of it. The inside can be lined with
 * a pattern, and the seal can be a real one: wax, or a lipstick print.
 */
export function Envelope({ colors, opening }: { colors: EnvelopeColors; opening: boolean }) {
  const [flapBehind, setFlapBehind] = useState(false);
  useEffect(() => {
    if (!opening) return;
    const id = window.setTimeout(() => setFlapBehind(true), 260);
    return () => window.clearTimeout(id);
  }, [opening]);
  const lining = colors.liner ?? colors.inner;

  return (
    <div className="relative w-full" style={{ aspectRatio: "1.45 / 1", perspective: "900px" }}>
      {/*
        * The back of the envelope, in its own paper, and the lining laid inside it a hair short of
        * the edges: a patterned lining flush with the edge showed as a dotted line under the pocket.
        */}
      <div className="absolute inset-0 rounded-[3%]" style={{ background: colors.body, boxShadow: "0 calc(3.4*var(--u)) calc(7*var(--u)) calc(-2*var(--u)) rgba(60,20,30,.34), 0 calc(.6*var(--u)) calc(1.2*var(--u)) rgba(60,20,30,.12)" }} />
      <div className="absolute inset-x-[1.2%] top-[1.5%] bottom-[2.5%] rounded-[3%]" style={{ background: lining }} />

      <motion.div
        className="absolute inset-x-[8%] top-[8%] h-[84%] rounded-[3%]"
        style={{ backgroundColor: colors.letter, backgroundImage: PAPER, zIndex: 5, boxShadow: "0 calc(.6*var(--u)) calc(1.6*var(--u)) rgba(0,0,0,.12)" }}
        initial={false}
        animate={opening ? { opacity: 1, y: "-58%" } : { opacity: 0, y: "0%" }}
        transition={{ opacity: { delay: 0.28, duration: 0.2 }, y: { delay: 0.42, duration: 0.7, ease: EASE } }}
      >
        <div className="absolute inset-x-[14%] top-[18%] space-y-[7%]">
          {[88, 100, 72, 94].map((w, i) => (
            <div key={i} className="h-[calc(0.7*var(--u))] rounded-full" style={{ width: `${w}%`, background: "rgba(120,90,90,.16)" }} />
          ))}
        </div>
      </motion.div>

      {/* Front pocket: two side folds and the bottom fold. */}
      <svg viewBox="0 0 145 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ zIndex: 6 }} aria-hidden="true">
        <path d="M0 3 L0 97 Q0 100 3 100 L72.5 54 Z" fill={colors.body} />
        <path d="M145 3 L145 97 Q145 100 142 100 L72.5 54 Z" fill={colors.body} />
        <path d="M0 3 L72.5 54 L145 3" fill="none" stroke="rgba(0,0,0,.05)" strokeWidth=".6" />
        <path d="M0 100 L72.5 50 L145 100 Z" fill={colors.body} />
        <path d="M0 100 L72.5 50 L145 100" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth=".6" />
        <path d="M0 100 L72.5 50 L145 100" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".5" transform="translate(0 .9)" />
        <path d="M0 100 L72.5 50 L145 100 Z" fill="url(#pocket-shade)" />
        <defs>
          <linearGradient id="pocket-shade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".2" />
            <stop offset="1" stopColor="#000" stopOpacity=".07" />
          </linearGradient>
        </defs>
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[3%] mix-blend-multiply" style={{ backgroundImage: PAPER, zIndex: 6 }} />

      {/* The flap, with the seal on its tip. Two faces so the lining shows once it is open. */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[62%]"
        style={{ transformOrigin: "50% 0%", transformStyle: "preserve-3d", zIndex: flapBehind ? 1 : 7 }}
        initial={false}
        animate={{ rotateX: opening ? 180 : 0 }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <svg viewBox="0 0 145 62" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ backfaceVisibility: "hidden", filter: "drop-shadow(0 calc(.5*var(--u)) calc(.7*var(--u)) rgba(60,20,30,.16))" }} aria-hidden="true">
          <defs>
            <linearGradient id="flap-shade" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".28" />
              <stop offset="1" stopColor="#000" stopOpacity=".05" />
            </linearGradient>
          </defs>
          <path d="M0 0 H145 L76 58 Q72.5 61 69 58 Z" fill={colors.flap} />
          <path d="M0 0 H145 L76 58 Q72.5 61 69 58 Z" fill="url(#flap-shade)" />
          <path d="M0 0 L69 58 Q72.5 61 76 58 L145 0" fill="none" stroke="rgba(0,0,0,.07)" strokeWidth=".7" />
        </svg>
        <div aria-hidden="true" className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateX(180deg)", clipPath: "polygon(5% 3%, 95% 3%, 52% 89%, 50% 91.5%, 48% 89%)", background: lining }} />
        <div aria-hidden="true" className="absolute inset-0 -z-[1]" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateX(180deg)", clipPath: "polygon(0 0, 100% 0, 52.4% 93.5%, 50% 97%, 47.6% 93.5%)", background: colors.flap }} />
        {colors.sealArt ? (
          <img
            src={colors.sealArt.cut.src}
            alt=""
            draggable={false}
            className="absolute top-[94%] left-1/2 block max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
            style={{ width: `${colors.sealArt.w}%`, aspectRatio: String(colors.sealArt.cut.ratio), rotate: `${colors.sealArt.rotate ?? 0}deg`, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", filter: "drop-shadow(0 calc(.7*var(--u)) calc(1*var(--u)) rgba(60,10,20,.35))" }}
          />
        ) : (
          <div
            className="absolute top-[94%] left-1/2 grid aspect-square w-[21%] -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${colors.seal} 70%, white), ${colors.seal} 55%, color-mix(in srgb, ${colors.seal} 75%, black))`,
              boxShadow: "0 calc(.8*var(--u)) calc(1.6*var(--u)) rgba(0,0,0,.25), inset 0 calc(-.6*var(--u)) calc(1*var(--u)) rgba(0,0,0,.2)",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-[44%]" aria-hidden="true">
              <SealMark mark={colors.mark} />
            </svg>
            {/* a glint that crosses the wax now and then */}
            <span aria-hidden="true" className="cv-glint absolute inset-y-0 -left-full w-full" style={{ background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,.55) 50%, transparent 65%)" }} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

/** A gift box whose lid lifts off in a little burst of light. The paper can be printed, the bow can be a real one. */
export function GiftBox({ colors, opening }: { colors: GiftBoxColors; opening: boolean }) {
  const band = colors.band ?? colors.ribbon;
  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 0.92" }}>
      <motion.div
        className="absolute inset-x-[10%] top-[26%] h-[40%] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,236,170,.95), rgba(255,236,170,0))" }}
        initial={false}
        animate={opening ? { opacity: 1, scale: 1.6 } : { opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
      />
      <div
        className="absolute inset-x-[10%] bottom-0 h-[64%] overflow-hidden rounded-[5%]"
        style={{ background: `linear-gradient(180deg, ${colors.body}, color-mix(in srgb, ${colors.body} 88%, black))`, boxShadow: "0 calc(3.4*var(--u)) calc(7*var(--u)) calc(-2*var(--u)) rgba(60,20,30,.34)" }}
      >
        {colors.pattern ? <div aria-hidden="true" className="absolute inset-0" style={{ background: colors.pattern }} /> : null}
        <div aria-hidden="true" className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER }} />
        <div className="absolute inset-y-0 left-1/2 w-[17%] -translate-x-1/2" style={{ background: band, boxShadow: "0 0 calc(.8*var(--u)) rgba(0,0,0,.12)" }} />
        <div className="absolute inset-x-0 top-0 h-[16%]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.12), transparent)" }} />
      </div>
      <motion.div
        className="absolute inset-x-[4%] top-[20%] h-[20%]"
        initial={false}
        animate={opening ? { y: "-190%", rotate: -16, opacity: 0 } : { y: "0%", rotate: 0, opacity: 1 }}
        transition={{ duration: 0.75, ease: EASE, opacity: { delay: 0.45, duration: 0.3 } }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[6%]" style={{ background: `linear-gradient(180deg, ${colors.lid}, color-mix(in srgb, ${colors.lid} 90%, black))`, boxShadow: "0 calc(1*var(--u)) calc(2*var(--u)) rgba(0,0,0,.16)" }}>
          <div aria-hidden="true" className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER }} />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-[15.5%] -translate-x-1/2" style={{ background: band }} />
        {colors.bowArt ? (
          <img
            src={colors.bowArt.cut.src}
            alt=""
            draggable={false}
            className="absolute bottom-[6%] left-1/2 block max-w-none -translate-x-1/2 select-none"
            style={{ width: `${colors.bowArt.w}%`, aspectRatio: String(colors.bowArt.cut.ratio), filter: "drop-shadow(0 calc(.8*var(--u)) calc(1.2*var(--u)) rgba(80,20,30,.32))" }}
          />
        ) : (
          <svg viewBox="0 0 120 70" className="absolute bottom-[78%] left-1/2 w-[46%] -translate-x-1/2" aria-hidden="true">
            <path d="M58 44 C40 8 6 10 12 38 C16 58 44 54 58 46Z" fill={colors.ribbon} />
            <path d="M62 44 C80 8 114 10 108 38 C104 58 76 54 62 46Z" fill={colors.ribbon} />
            <path d="M58 44 C44 20 22 20 22 36" stroke="rgba(0,0,0,.14)" strokeWidth="3" fill="none" />
            <path d="M62 44 C76 20 98 20 98 36" stroke="rgba(0,0,0,.14)" strokeWidth="3" fill="none" />
            <rect x="51" y="36" width="18" height="18" rx="6" fill={colors.ribbon} stroke="rgba(0,0,0,.12)" strokeWidth="2" />
          </svg>
        )}
      </motion.div>
    </div>
  );
}
