"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import { giftString } from "../i18n";
import { Ambience } from "../Ambience";
import { Confetti } from "../Confetti";
import { playChime, playPaper, playRibbon } from "../collage/sounds";
import { buzz, prime } from "../synth";
import type { Attachment, CoverLook, Placement } from "./looks";
import { Envelope, GiftBox } from "./Centerpieces";
import { Sticker } from "./stickers";

const EASE = [0.22, 1, 0.36, 1] as const;
/** Accelerating away: what a thing does when it is flicked off a table. */
const FLICK = [0.5, 0, 0.9, 0.4] as const;
/** How long the open animation plays before the gift underneath takes over. */
const OPEN_MS = { envelope: 1350, gift: 1150 } as const;
/** When the paper is thrown, and when the light starts to spread, after the tap. */
const BURST_MS = { envelope: 480, gift: 240 } as const;
const BLOOM_S = { envelope: 0.82, gift: 0.6 } as const;
/** With motion turned down there is nothing to wait for but a fade. */
const OPEN_MS_STILL = 450;
/** The middle of the page as the art sees it: where the envelope sits, which everything flies in towards and away from. */
const HEART = { x: 50, y: 44 };

const KEYFRAMES = `
@keyframes cv-sway { 0%,100% { rotate: -2.4deg; translate: 0 0 } 50% { rotate: 2.4deg; translate: 0 calc(-.7*var(--u)) } }
@keyframes cv-halo { 0% { scale: .8; opacity: 0 } 35% { opacity: .6 } 100% { scale: 1.3; opacity: 0 } }
@keyframes cv-glint { 0%,70% { translate: 0 0 } 100% { translate: 220% 0 } }
.cv-sway { animation: cv-sway var(--cv-pace, 5s) ease-in-out infinite; }
.cv-halo { animation: cv-halo 2.6s ease-out infinite; }
.cv-glint { animation: cv-glint 4.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .cv-sway, .cv-halo, .cv-glint { animation: none } .cv-halo { opacity: 0 } }
`;

/**
 * True once a picture can be drawn. A cut-out that flew in before its file had arrived would do it
 * unseen and then pop into place, so each one waits for its own picture. A file that fails counts
 * as ready: a missing flower must never hold the page up.
 */
function useImageReady(src: string | undefined, skip: boolean): boolean {
  const [ready, setReady] = useState(skip || !src);
  useEffect(() => {
    if (skip || !src) return;
    let alive = true;
    const done = () => {
      if (alive) setReady(true);
    };
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    if (img.complete) queueMicrotask(done);
    return () => {
      alive = false;
    };
  }, [src, skip]);
  return ready;
}

const CUT_SHADOW = "drop-shadow(0 calc(.5*var(--u)) calc(.9*var(--u)) rgba(40,15,25,.26))";

/**
 * One thing stuck on the page. It is thrown in from beyond the nearest edge, sways where it lands,
 * and when the gift opens it is flicked back off the way it came.
 */
function PageArt({ item, index, still, opening }: { item: Placement; index: number; still: boolean; opening: boolean }) {
  const ready = useImageReady(item.cut?.src, still);
  const right = item.pin?.[1] === "r";
  const bottom = item.pin?.[0] === "b";
  // A pinned piece leaves by the corner it is fixed to; the rest, away from the envelope.
  const dx = item.pin ? (right ? 1 : -1) : item.x - HEART.x;
  const dy = item.pin ? (bottom ? 1 : -1) : item.y - HEART.y;
  const where: CSSProperties = item.pin
    ? { [right ? "right" : "left"]: `calc(${item.x}*var(--u))`, [bottom ? "bottom" : "top"]: `calc(${item.y}*var(--u))`, translate: `${right ? "50%" : "-50%"} ${bottom ? "50%" : "-50%"}` }
    : { left: `${item.x}%`, top: `${item.y}%`, translate: "-50% -50%" };
  const far = Math.hypot(dx, dy) || 1;
  const ratio = item.cut?.ratio ?? 1;
  // Travel is given in page units and turned into a share of the piece's own box, which is what a
  // transform's percentage means: every piece covers the same ground whatever its size.
  const travel = (units: number) => ({ x: `${Math.round(((dx / far) * units * 100) / item.size)}%`, y: `${Math.round(((dy / far) * units * 100) / (item.size / ratio))}%` });
  const spin = dx >= 0 ? 1 : -1;
  const hidden = { ...travel(70), rotate: item.rotate + spin * 38, opacity: 0, scale: 0.7 };
  const placed = { x: "0%", y: "0%", rotate: item.rotate, opacity: 1, scale: 1 };
  const gone = { ...travel(170), rotate: item.rotate + spin * 130, opacity: [1, 1, 0], scale: 0.85 };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute" style={{ ...where, width: `calc(${item.size}*var(--u))`, color: item.color, zIndex: item.front ? 11 : 1 }}>
      <motion.div
        initial={still ? false : hidden}
        animate={opening ? gone : ready ? placed : hidden}
        transition={opening ? { duration: 0.62, ease: FLICK, delay: (index % 4) * 0.025 } : { type: "spring", stiffness: 95, damping: 13, mass: 0.9, delay: 0.12 + index * 0.06 }}
      >
        <div className={still ? undefined : "cv-sway"} style={{ "--cv-pace": `${4 + (index % 5) * 0.55}s`, animationDelay: `${-index * 0.7}s` } as CSSProperties}>
          {item.cut ? <img src={item.cut.src} alt="" draggable={false} loading={still ? "lazy" : "eager"} decoding="async" className="block w-full max-w-none select-none" style={{ aspectRatio: String(item.cut.ratio), filter: CUT_SHADOW }} /> : <Sticker id={item.id} />}
        </div>
      </motion.div>
    </div>
  );
}

/** Something fixed to the envelope: it arrives once the envelope has landed, and leaves before it opens. */
function Attached({ item, index, still, opening }: { item: Attachment; index: number; still: boolean; opening: boolean }) {
  const ready = useImageReady(item.cut.src, still);
  const side = item.x >= 50 ? 1 : -1;
  // Whatever is tucked behind comes up from behind; whatever is stuck on the front is pressed on.
  const rises = item.back && item.leave !== "fade";
  const hidden = rises ? { x: "0%", y: "55%", rotate: item.rotate, opacity: 0, scale: 1 } : { x: "0%", y: "0%", rotate: item.rotate - side * 24, opacity: 0, scale: 0.4 };
  const placed = { x: "0%", y: "0%", rotate: item.rotate, opacity: 1, scale: 1 };
  const gone = item.leave === "fade" ? { ...placed, opacity: 0, scale: 0.94 } : { x: `${side * 90}%`, y: "-170%", rotate: item.rotate + side * 80, opacity: [1, 1, 0], scale: 0.9 };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, translate: "-50% -50%", zIndex: item.back ? 0 : 9 }}>
      <motion.div
        initial={still ? false : hidden}
        animate={opening ? gone : ready ? placed : hidden}
        transition={opening ? { duration: 0.5, ease: FLICK } : { type: "spring", stiffness: 190, damping: 13, delay: 0.85 + index * 0.12 }}
      >
        <img src={item.cut.src} alt="" draggable={false} loading={still ? "lazy" : "eager"} decoding="async" className="block w-full max-w-none select-none" style={{ aspectRatio: String(item.cut.ratio), filter: CUT_SHADOW }} />
      </motion.div>
    </div>
  );
}

/**
 * The first screen of a gift: a decorated page with an envelope (or a box) and their name.
 * It renders instantly while the gift's photos and music load underneath; the tap hint only
 * appears once everything is ready, and an early tap is remembered rather than ignored.
 * `still` renders a static thumbnail for the editor's picker.
 *
 * How it moves: the art is thrown in from beyond the edges and lands round the envelope, which
 * drops in with a bounce; their name is written across the page; everything sways a little on its
 * own beat while it waits, and petals or hearts drift past. A tap presses the envelope, flicks
 * the art back off the page, throws paper, and lets the letter out into a bloom of light, which
 * is what the gift appears through. With motion turned down, all of that is a fade.
 */
export function Cover({
  look,
  recipientName,
  locale,
  ready = true,
  onOpened,
  still = false,
}: {
  look: CoverLook;
  recipientName: string;
  locale: GiftLocale;
  ready?: boolean;
  onOpened?: () => void;
  still?: boolean;
}) {
  const reduce = !!useReducedMotion();
  const [tapped, setTapped] = useState(false);
  const [burst, setBurst] = useState(0);
  const opening = tapped && ready;
  const waiting = tapped && !ready;
  const kind = look.piece.kind;
  // The parent hands over a new function on every render; the timers below must not restart for it.
  const openedRef = useRef(onOpened);
  useEffect(() => {
    openedRef.current = onOpened;
  });

  useEffect(() => {
    if (!opening) return;
    if (kind === "envelope") playPaper(false);
    else playRibbon(false);
    const timers = [window.setTimeout(() => openedRef.current?.(), reduce ? OPEN_MS_STILL : OPEN_MS[kind])];
    if (!reduce) {
      timers.push(window.setTimeout(() => setBurst((b) => b + 1), BURST_MS[kind]));
      timers.push(window.setTimeout(() => playChime(false), BLOOM_S[kind] * 1000));
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [opening, kind, reduce]);

  const tap = () => {
    if (tapped) return;
    prime();
    buzz(12);
    setTapped(true);
  };

  const light = look.tone === "light";
  const Frame = still ? "div" : "button";
  const attach = look.attach ?? [];
  const bloom = look.bloom ?? (light ? "#fffaf3" : "#fff1cf");
  const paper = look.confetti ?? [look.script, look.hint, "#ffffff", kind === "envelope" ? look.piece.colors.seal : look.piece.colors.ribbon];
  const shownName = "inset(-40% -6% -40% -6%)";

  return (
    <motion.div
      // The recipient's name, lettered: never the browser translator's (see GiftRenderer).
      translate="no"
      className="absolute inset-0 z-[60] overflow-hidden"
      // A cover is also drawn outside a gift (the editor's picker, the gallery on the homepage),
      // where --u has never been declared. Declaring it here resolves against whichever box is
      // the container: the gift on a real page, the thumbnail everywhere else.
      style={{ "--u": "min(1cqw, calc(1cqh * 0.6))", background: look.background } as CSSProperties}
      initial={false}
      exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.6, ease: EASE } }}
      data-cover={look.id}
    >
      {still ? null : <style>{KEYFRAMES}</style>}
      <div className="grain-overlay" />

      {still || !look.ambience ? null : (
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3]" animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: 0.4 }}>
          <Ambience layers={[look.ambience]} opacity={light ? 0.85 : 1} />
        </motion.div>
      )}

      {look.tapes?.map((t, i) => (
        <motion.div
          key={`t${i}`}
          aria-hidden="true"
          className="absolute h-[calc(5.5*var(--u))]"
          style={{ left: `${t.x}%`, top: `${t.y}%`, width: `calc(${t.width}*var(--u))`, translate: "-50% -50%", rotate: `${t.rotate}deg`, background: t.color, boxShadow: "0 1px 2px rgba(0,0,0,.08)", zIndex: 2 }}
          initial={false}
          animate={{ opacity: opening ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        />
      ))}

      {look.stickers.map((s, i) => (
        <PageArt key={`s${i}`} item={s} index={i} still={still} opening={opening} />
      ))}

      <Frame {...(still ? {} : { type: "button" as const, onClick: tap, "aria-label": giftString(locale, "tapToOpen") })} className="absolute inset-0 z-10 flex flex-col items-center justify-center pb-[5cqh] outline-none">
        {/* The envelope drops in, and when it opens it takes the middle of the stage. */}
        <motion.div
          className="relative w-[calc(68*var(--u))]"
          initial={still ? false : { y: "-70%", rotate: -7, opacity: 0, scale: 1 }}
          animate={opening ? { y: "11%", rotate: 0, opacity: 1, scale: 1.08 } : { y: "0%", rotate: 0, opacity: 1, scale: 1 }}
          transition={opening ? { duration: 0.85, ease: EASE } : { type: "spring", stiffness: 150, damping: 13, delay: 0.05, opacity: { duration: 0.25, delay: 0.05 } }}
        >
          {still || !ready || tapped ? null : <span aria-hidden="true" className="cv-halo absolute -inset-[14%] -z-[1] rounded-full" style={{ background: `radial-gradient(closest-side, color-mix(in srgb, ${look.script} 34%, transparent), transparent 72%)` }} />}
          {/* It bobs while it waits; tapped early, it fidgets until the gift is ready. */}
          <motion.div
            animate={still || opening ? { y: 0, rotate: 0 } : waiting ? { y: 0, rotate: [0, -2.2, 2.2, -1.2, 1.2, 0] } : { y: [0, -7, 0], rotate: 0 }}
            transition={still || opening ? { duration: 0.3 } : waiting ? { duration: 0.9, repeat: Infinity, repeatDelay: 0.45 } : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* The press: it gives under the thumb and springs back. */}
            <motion.div animate={tapped ? { scale: [1, 0.94, 1.05, 1] } : { scale: 1 }} transition={{ duration: 0.38, ease: "easeOut" }}>
              <div className="relative">
                {attach.map((a, i) => (a.back ? <Attached key={`b${i}`} item={a} index={i} still={still} opening={opening} /> : null))}
                {look.piece.kind === "envelope" ? <Envelope colors={look.piece.colors} opening={opening} /> : <GiftBox colors={look.piece.colors} opening={opening} />}
                {attach.map((a, i) => (a.back ? null : <Attached key={`f${i}`} item={a} index={i} still={still} opening={opening} />))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Their name, written across the page from left to right. */}
        <motion.p
          className="mt-[6.5cqh] max-w-[calc(86*var(--u))] text-center text-[calc(11.5*var(--u))] leading-[1.05]"
          style={{
            fontFamily: "var(--font-cover), var(--font-hand), cursive",
            color: look.script,
            // A crisp white edge on light pages reads like a cut-out sticker; a soft shadow on dark ones.
            textShadow: light ? "0 calc(.35*var(--u)) 0 rgba(255,255,255,.9), 0 0 calc(2.4*var(--u)) rgba(255,255,255,.55)" : "0 calc(.4*var(--u)) calc(1.8*var(--u)) rgba(0,0,0,.4)",
          }}
          initial={still ? false : { clipPath: "inset(-40% 100% -40% -6%)", opacity: 0, y: 0 }}
          animate={opening ? { clipPath: shownName, opacity: 0, y: 14 } : { clipPath: shownName, opacity: 1, y: 0 }}
          transition={opening ? { duration: 0.25 } : { clipPath: { delay: 0.55, duration: 1, ease: [0.3, 0, 0.2, 1] }, opacity: { delay: 0.55, duration: 0.2 } }}
        >
          {giftString(locale, "coverFor", { name: recipientName })}
        </motion.p>

        <div className="mt-[3.5cqh] flex h-[calc(5*var(--u))] items-center justify-center" style={{ color: look.hint }}>
          {still ? null : ready ? (
            <motion.span
              className="rounded-full px-[calc(4*var(--u))] py-[calc(1.6*var(--u))] text-[calc(3.4*var(--u))] font-semibold tracking-[0.2em] uppercase backdrop-blur-sm"
              style={{ background: light ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.12)", boxShadow: light ? "0 calc(.4*var(--u)) calc(1.4*var(--u)) rgba(80,30,45,.12)" : "none" }}
              // Solid at every frame (a screen recording can land on any one of them); it breathes in size instead.
              initial={{ opacity: 0, scale: 0.9 }}
              animate={tapped ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: [1, 1.05, 1] }}
              transition={tapped ? { duration: 0.2 } : { opacity: { duration: 0.4 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
            >
              {giftString(locale, "tapToOpen")}
            </motion.span>
          ) : (
            <span className="flex gap-[calc(1.6*var(--u))]" aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="block size-[calc(1.8*var(--u))] rounded-full" style={{ background: "currentColor" }} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.18 }} />
              ))}
            </span>
          )}
        </div>
      </Frame>

      {still || reduce ? null : (
        <>
          <Confetti burst={burst} colors={paper} origin={{ x: 0.5, y: 0.4 }} count={kind === "gift" ? 130 : 84} className="pointer-events-none absolute inset-0 z-20" />
          {/*
            * The light the letter lets out, which is what the gift appears through. Two layers, so it
            * never has a hard edge: a soft glow that grows from the envelope (a small texture, scaled,
            * which costs a phone nothing), and a veil of the same colour that settles over whatever
            * the glow has not reached by the time the gift takes over.
            */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-[42%] left-1/2 z-30 size-[calc(60*var(--u))] rounded-full"
            style={{ translate: "-50% -50%", background: `radial-gradient(circle closest-side, #ffffff 0%, ${bloom} 50%, transparent 100%)`, willChange: "transform" }}
            initial={false}
            animate={opening ? { scale: 13, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={opening ? { delay: BLOOM_S[kind], duration: 0.62, ease: [0.6, 0, 0.9, 0.5], opacity: { delay: BLOOM_S[kind], duration: 0.12 } } : { duration: 0 }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-30"
            style={{ background: bloom }}
            initial={false}
            animate={{ opacity: opening ? 1 : 0 }}
            transition={opening ? { delay: BLOOM_S[kind] + 0.3, duration: 0.24, ease: "easeIn" } : { duration: 0 }}
          />
        </>
      )}
    </motion.div>
  );
}
