"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import { giftString } from "../i18n";
import type { CoverLook } from "./looks";
import { Envelope, GiftBox } from "./Centerpieces";
import { Sticker } from "./stickers";

const EASE = [0.22, 1, 0.36, 1] as const;
/** How long the open animation plays before the gift underneath takes over. */
const OPEN_MS = { envelope: 1250, gift: 1000 } as const;

/**
 * The first screen of a gift: a decorated page with an envelope (or a box) and their name.
 * It renders instantly while the gift's photos and music load underneath; the tap hint only
 * appears once everything is ready, and an early tap is remembered rather than ignored.
 * `still` renders a static thumbnail for the editor's picker.
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
  const [tapped, setTapped] = useState(false);
  const opening = tapped && ready;

  useEffect(() => {
    if (!opening) return;
    const id = window.setTimeout(() => onOpened?.(), OPEN_MS[look.piece.kind]);
    return () => window.clearTimeout(id);
  }, [opening, onOpened, look.piece.kind]);

  const enter = (delay: number) => (still ? false : { opacity: 0, y: 18, transition: { delay } });
  const light = look.tone === "light";
  const Frame = still ? "div" : "button";

  return (
    <motion.div
      className="absolute inset-0 z-[60] overflow-hidden"
      // A cover is also drawn outside a gift (the editor's picker, the gallery on the homepage),
      // where --u has never been declared. Declaring it here resolves against whichever box is
      // the container: the gift on a real page, the thumbnail everywhere else.
      style={{ "--u": "min(1cqw, calc(1cqh * 0.6))", background: look.background } as CSSProperties}
      initial={false}
      exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.6, ease: EASE } }}
      data-cover={look.id}
    >
      <div className="grain-overlay" />

      {look.tapes?.map((t, i) => (
        <div
          key={`t${i}`}
          aria-hidden="true"
          className="absolute h-[calc(5.5*var(--u))]"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: `calc(${t.width}*var(--u))`,
            transform: `translate(-50%, -50%) rotate(${t.rotate}deg)`,
            background: t.color,
            boxShadow: "0 1px 2px rgba(0,0,0,.08)",
            zIndex: 2,
          }}
        />
      ))}

      {look.stickers.map((s, i) => (
        <div
          key={`s${i}`}
          aria-hidden="true"
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `calc(${s.size}*var(--u))`, transform: `translate(-50%, -50%) rotate(${s.rotate}deg)`, color: s.color, zIndex: 1 }}
        >
          <motion.div
            initial={still ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.07, type: "spring", stiffness: 280, damping: 15 }}
          >
            <Sticker id={s.id} />
          </motion.div>
        </div>
      ))}

      <Frame
        {...(still ? {} : { type: "button" as const, onClick: () => setTapped(true), "aria-label": giftString(locale, "tapToOpen") })}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center pb-[5cqh] outline-none"
      >
        <motion.div className="w-[calc(68*var(--u))]" initial={enter(0.05)} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
          <motion.div
            animate={still || tapped ? { y: 0 } : { y: [0, -7, 0] }}
            transition={still || tapped ? { duration: 0.3 } : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {look.piece.kind === "envelope" ? (
              <Envelope colors={look.piece.colors} opening={opening} />
            ) : (
              <GiftBox colors={look.piece.colors} opening={opening} />
            )}
          </motion.div>
        </motion.div>

        <motion.p
          className="mt-[6.5cqh] max-w-[calc(86*var(--u))] text-center text-[calc(11.5*var(--u))] leading-[1.05]"
          style={{
            fontFamily: "var(--font-cover), var(--font-hand), cursive",
            color: look.script,
            // A crisp white edge on light pages reads like a cut-out sticker; a soft shadow on dark ones.
            textShadow: light ? "0 calc(.35*var(--u)) 0 rgba(255,255,255,.9), 0 0 calc(2.4*var(--u)) rgba(255,255,255,.55)" : "0 calc(.4*var(--u)) calc(1.8*var(--u)) rgba(0,0,0,.4)",
          }}
          initial={enter(0.35)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.9, ease: EASE }}
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
                <motion.span
                  key={d}
                  className="block size-[calc(1.8*var(--u))] rounded-full"
                  style={{ background: "currentColor" }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.18 }}
                />
              ))}
            </span>
          )}
        </div>
      </Frame>
    </motion.div>
  );
}
