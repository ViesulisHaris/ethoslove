"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { FitName } from "../_shared/FitName";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { MessageBody } from "../_shared/MessageBody";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { COVER_VARS, CoverPage, POSTER_FONT, StickerScatter, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { BouquetArt, timingFor } from "./Bouquet";
import { FlowerHead } from "./art";
import { arrange } from "./arrange";
import type { BouquetFields } from "./schema";

type Backdrop = {
  bg: string;
  /** The frosted sheet the card opens on: the page's colour, see-through, over the blurred bouquet. */
  veil: string;
  ink: string;
  tone: "light" | "dark";
  /** The page the bouquet is photographed against, and the light behind it. */
  cover: CoverTone;
  /** The wax that closes the paper. */
  seal: string;
  stickers: StickerPlacement[];
};

const BACKDROP: Record<BouquetFields["backdrop"], Backdrop> = {
  linen: {
    bg: "radial-gradient(120% 80% at 50% 30%,#F8F2E9 0%,#E9DDCA 100%)",
    veil: "rgba(246,239,228,.74)",
    ink: "#2A2420",
    tone: "light",
    cover: { page: "#E9DDCA", glow: ["rgba(255,250,232,.95)", "rgba(211,186,150,.45)"], accent: "#9C5A44" },
    seal: "#B03A3C",
    stickers: [
      { id: "sparkle", x: 8, y: 11, size: 8 },
      { id: "butterfly", x: 89, y: 12, size: 13, rotate: 12 },
      { id: "leaf", x: 7, y: 68, size: 11, rotate: -22 },
      { id: "sparkle", x: 94, y: 62, size: 7 },
      { id: "daisy", x: 7, y: 86, size: 11 },
      { id: "heart", x: 93, y: 84, size: 11, rotate: 12 },
    ],
  },
  sage: {
    bg: "radial-gradient(120% 80% at 50% 30%,#EEF2E8 0%,#C9D5C1 100%)",
    veil: "rgba(234,240,229,.74)",
    ink: "#22291F",
    tone: "light",
    cover: { page: "#C9D5C1", glow: ["rgba(250,255,240,.95)", "rgba(168,192,160,.45)"], accent: "#41653F" },
    seal: "#A8433C",
    stickers: [
      { id: "sparkle", x: 8, y: 11, size: 8 },
      { id: "butterfly", x: 89, y: 12, size: 13, rotate: 12 },
      { id: "leaf", x: 7, y: 68, size: 11, rotate: -22 },
      { id: "sparkle", x: 94, y: 62, size: 7 },
      { id: "daisy", x: 7, y: 86, size: 11 },
      { id: "tulip", x: 93, y: 83, size: 12, rotate: 12 },
    ],
  },
  blush: {
    bg: "radial-gradient(120% 80% at 50% 30%,#FDF0EF 0%,#EDCFD0 100%)",
    veil: "rgba(251,236,236,.74)",
    ink: "#2E1F22",
    tone: "light",
    cover: { page: "#EDCFD0", glow: ["rgba(255,246,232,.95)", "rgba(240,180,190,.5)"], accent: "#B4485C" },
    seal: "#C2455E",
    stickers: [
      { id: "sparkle", x: 8, y: 11, size: 8 },
      { id: "butterfly", x: 89, y: 12, size: 13, rotate: 12 },
      { id: "cherries", x: 7, y: 68, size: 12, rotate: -12 },
      { id: "sparkle", x: 94, y: 62, size: 7 },
      { id: "daisy", x: 7, y: 86, size: 11 },
      { id: "heart", x: 93, y: 84, size: 11, rotate: 12 },
    ],
  },
  night: {
    bg: "radial-gradient(120% 80% at 50% 30%,#2B2E3B 0%,#0F1016 100%)",
    veil: "rgba(18,19,27,.76)",
    ink: "#F4EFE8",
    tone: "dark",
    cover: { page: "#16171F", glow: ["rgba(255,214,160,.26)", "rgba(70,74,102,.6)"], accent: "#F4EFE8", dark: true },
    seal: "#C9A227",
    stickers: [
      { id: "star", x: 8, y: 11, size: 10, rotate: -10 },
      { id: "moon", x: 90, y: 12, size: 14 },
      { id: "sparkle", x: 7, y: 68, size: 9 },
      { id: "star", x: 94, y: 62, size: 8, rotate: 14 },
      { id: "sparkle", x: 7, y: 86, size: 10 },
      { id: "heart", x: 93, y: 84, size: 11, rotate: 12 },
    ],
  },
};

const S = {
  en: { forName: "For {name}", open: "open the card" },
  es: { forName: "Para {name}", open: "abre la tarjeta" },
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<BouquetFields>) {
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const look = BACKDROP[data.fields.backdrop] ?? BACKDROP.linen;
  const animate = mode !== "preview" && !reduce;
  const arr = useMemo(() => arrange(data.fields.stems, data.fields.seed), [data.fields.stems, data.fields.seed]);
  // One flower blooms big across the screen first, then the bouquet assembles under it.
  const BLOOM_S = 2.6;
  // A bouquet of only greens and fillers has no head to bloom: it assembles straight away instead of never.
  const hasBloom = animate && !!arr.heads[0];
  const cardAt = animate ? (hasBloom ? BLOOM_S : 0) + timingFor(arr).card + 1.1 : 0;
  const [ready, setReady] = useState(!animate);
  const [bloomed, setBloomed] = useState(!hasBloom);
  const [open, setOpen] = useState(false);
  const [petals, setPetals] = useState(0);
  const [run, setRun] = useState(0);
  const cardText = data.fields.cardNote?.trim() || s.forName.replace("{name}", data.recipientName);
  const petalTone = arr.heads[0]?.tone;
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const { start } = audio;
  useEffect(() => {
    if (mode === "preview") return;
    eventRef.current?.({ type: "started" });
    void start();
    const t = window.setTimeout(() => {
      setReady(true);
      eventRef.current?.({ type: "progress", pct: 40 });
    }, cardAt * 1000);
    return () => window.clearTimeout(t);
  }, [mode, start, cardAt, run]);

  const openCard = () => {
    void start();
    setOpen(true);
    // Petals thrown up from the bottom as the card comes, in the bouquet's own colours.
    if (animate) setPetals((p) => p + 1);
    eventRef.current?.({ type: "progress", pct: 70 });
  };
  const petalColors = useMemo(() => [...new Set(arr.heads.slice(0, 4).flatMap((h) => [h.tone.mid, h.tone.light]))].slice(0, 5), [arr.heads]);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, backgroundColor: look.cover.page, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <CoverPage tone={look.cover} pattern={look.bg} />
      <StickerScatter items={look.stickers} reduce={!!reduce} className="z-[3]" />
      <div
        className="pointer-events-none absolute inset-x-0 z-20 px-[calc(6*var(--k))] text-center"
        style={{ top: "max(calc(3*var(--k)), calc(var(--gift-safe-top,env(safe-area-inset-top)) + 2*var(--k)))" }}
      >
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        {/* The poster serif is the Editorial look; the other type pairings set the title in their own face, or picking one changed nothing on the cover. */}
        <motion.h1
          className={cn(
            "mx-auto mt-[calc(1.6*var(--k))] leading-[1.05] text-balance [overflow-wrap:anywhere]",
            // Their name shrinks onto one line between the stickers; a title the sender wrote still wraps.
            data.title ? "max-w-[calc(80*var(--k))]" : "w-[calc(62*var(--k))] max-w-full",
            data.fontPairing === "modern" ? "text-[calc(7.4*var(--k))] font-semibold tracking-[-0.02em]" : data.fontPairing === "handwritten" ? "text-[calc(9.4*var(--k))]" : "text-[calc(8*var(--k))] italic",
          )}
          style={{ fontFamily: data.fontPairing === "modern" || data.fontPairing === "handwritten" ? "var(--gift-font-display)" : POSTER_FONT }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.8 }}
        >
          {data.title || <FitName min={0.6}>{data.recipientName}</FitName>}
        </motion.h1>
      </div>

      <div className="absolute inset-x-0 top-[12%] bottom-[max(14%,8.5rem)] flex items-center justify-center">
        {bloomed ? (
          <BouquetArt
            key={run}
            fields={data.fields}
            cardText={cardText}
            seal={look.seal}
            openLabel={s.open}
            animate={animate}
            onCard={ready ? openCard : undefined}
            className="h-full w-auto max-w-[calc(96*var(--u))] drop-shadow-[0_24px_30px_rgba(40,25,20,0.18)]"
          />
        ) : null}
      </div>

      <AnimatePresence>
        {animate && !bloomed && arr.heads[0] ? (
          <BloomOpener key={`bloom-${run}`} head={arr.heads[0]} seconds={BLOOM_S} onDone={() => setBloomed(true)} />
        ) : null}
      </AnimatePresence>

      {petalTone ? (
        <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          <Ambience
            layers={[
              { kind: "petals", colors: [petalTone.mid, petalTone.light, "#F7D9DD"], count: ready ? 16 : 8 },
              { kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 14 },
            ]}
            opacity={0.9}
          />
        </div>
      ) : null}

      <AnimatePresence>
        {ready && !open ? (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 z-20 flex flex-col items-center px-[calc(6*var(--k))] text-center"
            style={{ bottom: "max(calc(7*var(--k)), calc(env(safe-area-inset-bottom) + 2*var(--k)))" }}
          >
            <motion.button
              type="button"
              onClick={openCard}
              aria-label={s.open}
              className="rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] whitespace-nowrap uppercase backdrop-blur-sm"
              style={{
                background: look.cover.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.8)",
                color: look.cover.dark ? "#FFF8EE" : look.cover.accent,
                boxShadow: look.cover.dark ? "inset 0 0 0 1px rgba(255,255,255,.2)" : "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(70,35,25,.14)",
              }}
              animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              {s.open}
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          // The card opens over the bouquet, not instead of it: a frosted sheet with the flowers soft behind it.
          <motion.div
            key="card"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: "6%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-40 scrollbar-none overflow-y-auto"
            style={{ background: look.veil, backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)" }}
          >
            <Finale
              data={data}
              mode={mode}
              reduce={!!reduce}
              tone={look.tone}
              cardText={cardText}
              pressed={pressedPair(arr.heads)}
              onEvent={onEvent}
              onReact={onReact}
              onMakeOne={onMakeOne}
              onReplay={
                mode === "preview"
                  ? undefined
                  : () => {
                      setOpen(false);
                      setReady(!animate);
                      setBloomed(!hasBloom);
                      setRun((r) => r + 1);
                    }
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Confetti burst={petals} colors={petalColors.length ? petalColors : ["#F4B6C2", "#FBE3E8"]} count={70} shape="petal" origin={{ x: 0.5, y: 1.02 }} className="pointer-events-none absolute inset-0 z-[45]" />
      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/**
 * The opening: the first flower of the bouquet blooms from a bud to fill the screen in a wash
 * of light, then fades as the bouquet begins assembling underneath. It is what the video
 * opens on, so it runs big and slow.
 */
function BloomOpener({ head, seconds, onDone }: { head: ReturnType<typeof arrange>["heads"][number]; seconds: number; onDone: () => void }) {
  return (
    // Leaving, the flower shrinks down into where the bouquet is gathering, as if it went to join it.
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.38, y: "-13%", transition: { duration: 0.75, ease: [0.45, 0, 0.25, 1] } }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute rounded-full"
        style={{ width: "calc(120 * var(--u))", height: "calc(120 * var(--u))", background: `radial-gradient(circle, ${head.tone.light}99 0%, ${head.tone.light}33 38%, transparent 62%)` }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.35, 1.1], opacity: [0, 1, 0.55] }}
        transition={{ duration: seconds, ease: "easeOut" }}
      />
      <motion.svg
        viewBox="-60 -60 120 120"
        style={{ width: "calc(84 * var(--u))", height: "calc(84 * var(--u))", overflow: "visible" }}
        initial={{ scale: 0.1, rotate: -80, opacity: 0, filter: "blur(6px)" }}
        animate={{ scale: [0.1, 1.12, 1], rotate: [-80, 6, 0], opacity: 1, filter: ["blur(6px)", "blur(0px)", "blur(0px)"] }}
        transition={{ duration: seconds * 0.85, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => window.setTimeout(onDone, seconds * 60)}
      >
        <FlowerHead id={head.id} tone={head.tone} uid={`bloom${head.key}`} seed={head.seed} />
      </motion.svg>
    </motion.div>
  );
}

type Head = ReturnType<typeof arrange>["heads"][number];

/** The two heads pressed onto the card: the first in the bouquet, and the first after it in another colour (or the last). */
function pressedPair(heads: Head[]): Head[] {
  if (heads.length < 2) return heads;
  const first = heads[0];
  return [first, heads.find((h) => h.tone.mid !== first.tone.mid) ?? heads[heads.length - 1]];
}

/** A head from their own bouquet, pressed flat onto the card's corner. */
function PressedFlower({ head, uid, rotate, delay, reduce, className }: { head: Head; uid: string; rotate: number; delay: number; reduce: boolean; className?: string }) {
  return (
    // A head is drawn about 100 units across round 0,0: this box is the flower, so the sizes below are what shows.
    <motion.svg
      aria-hidden="true"
      viewBox="-50 -50 100 100"
      className={cn("pointer-events-none absolute overflow-visible", className)}
      style={{ filter: "drop-shadow(0 4px 6px rgba(40,20,20,.24))" }}
      initial={reduce ? false : { scale: 0, rotate: rotate - 60, opacity: 0 }}
      animate={{ scale: 1, rotate, opacity: 0.96 }}
      transition={{ delay, type: "spring", stiffness: 170, damping: 13 }}
    >
      <FlowerHead id={head.id} tone={head.tone} uid={uid} seed={head.seed} />
    </motion.svg>
  );
}

/** A strip of washi tape in the sender's colour, holding a corner down. */
function Washi({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute z-[2]", className)}
      style={{ background: "linear-gradient(90deg, rgba(255,255,255,.4), rgba(255,255,255,.12) 50%, rgba(255,255,255,.4)), var(--gift-accent-pale, #F6D5DC)", opacity: 0.88, boxShadow: "0 1px 2px rgba(0,0,0,.1)" }}
    />
  );
}

function Finale({
  data,
  mode,
  reduce,
  tone,
  cardText,
  pressed,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<BouquetFields>["data"];
  mode: TemplateProps["mode"];
  reduce: boolean;
  tone: "light" | "dark";
  cardText: string;
  /** Two heads from the bouquet, pressed onto the card's corners. */
  pressed: Head[];
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, done]);

  return (
    <div className="mx-auto flex w-[min(90cqw,520px)] flex-col gap-5 pt-[max(9cqh,56px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <motion.div
        initial={reduce ? false : { rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
        className="relative rounded-[4px] bg-[#FFFDF8] px-[clamp(24px,7cqw,42px)] pt-[clamp(28px,8cqw,44px)] pb-[clamp(30px,9cqw,48px)] text-[#2a2420] shadow-[0_1px_2px_rgba(0,0,0,0.14),0_30px_60px_-24px_rgba(0,0,0,0.45)]"
      >
        <Washi className="-top-[11px] left-1/2 h-[22px] w-[clamp(84px,26cqw,112px)] -translate-x-1/2 -rotate-2" />
        {pressed[0] ? <PressedFlower head={pressed[0]} uid="pressed-a" rotate={-18} delay={0.85} reduce={reduce} className="-top-[clamp(22px,6cqw,30px)] -left-[clamp(8px,2.4cqw,14px)] w-[clamp(58px,17cqw,80px)]" /> : null}
        {pressed[1] ? <PressedFlower head={pressed[1]} uid="pressed-b" rotate={26} delay={1.05} reduce={reduce} className="-right-[clamp(6px,2cqw,12px)] -bottom-[clamp(18px,5cqw,26px)] w-[clamp(52px,15cqw,72px)]" /> : null}
        <p className="relative z-[3] text-center text-[clamp(28px,8cqw,36px)] leading-none" style={{ fontFamily: "var(--gift-font-hand)", color: "var(--gift-accent-deep)" }}>
          {cardText}
        </p>
        <div className="mt-6">
          <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" onDone={() => setDone(true)} />
        </div>
      </motion.div>

      {done && data.photos.length ? (
        // Polaroids taped down at a tilt, the right-hand column dropped half a step, so they read as stuck in by hand.
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-1 pt-3">
          {data.photos.map((p, i) => (
            <motion.figure
              key={p.id}
              initial={reduce ? false : { opacity: 0, y: -28, rotate: i % 2 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0, rotate: i % 2 ? 3 : -2.5 }}
              transition={{ delay: 0.15 + i * 0.14, type: "spring", stiffness: 140, damping: 14 }}
              className={cn("relative bg-[#FFFDF8] p-2 pb-3 shadow-[0_14px_28px_-16px_rgba(0,0,0,0.5)]", i % 2 === 1 && "mt-7")}
            >
              <Washi className={cn("-top-[9px] left-1/2 h-[18px] w-[clamp(46px,14cqw,60px)] -translate-x-1/2", i % 2 ? "rotate-[5deg]" : "-rotate-[6deg]")} />
              <img src={p.url} alt={p.alt ?? ""} className="aspect-square w-full object-cover" />
              {p.caption ? (
                <figcaption className="mt-2 text-center text-[17px] leading-tight text-[#3a2e2a]" style={{ fontFamily: "var(--gift-font-hand)" }}>
                  {p.caption}
                </figcaption>
              ) : null}
            </motion.figure>
          ))}
        </div>
      ) : null}

      {done && data.countdown ? (
        <div className="bg-[#FFFDF8] p-5 text-[#2a2420]">
          <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
        </div>
      ) : null}
      {done && data.surprise ? (
        <div className="bg-[#FFFDF8] p-5 text-[#2a2420]">
          <p className="mb-3 text-center text-[11px] tracking-[0.25em] uppercase opacity-50">{t("ps")}</p>
          <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
        </div>
      ) : null}
      {done ? (
        <div ref={endRef} className="pt-2">
          <EndScreen data={data} tone={tone} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      ) : null}
    </div>
  );
}
