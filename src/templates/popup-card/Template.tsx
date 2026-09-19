"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { Mic, Wind } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useBlowDetector } from "../_shared/hooks/use-blow-detector";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, TapPill, type CoverTone } from "../_shared/cover-kit";
import { Peg } from "../balloons/art";
import { CARD_KEYFRAMES, ConfettiDots, CoverArt, GiftBox, PaperBalloon, PaperCake, PennantArch, Ruled, THEMES, type Theme, type ThemeId } from "./art";
import { baseTilt, candleCount, lidAngle, pieceAngle, pieceShadow, settle, topperDigits } from "./fold";
import type { PopupCardFields } from "./schema";

type Copy = { open: string; light: string; lightOne: string; wish: string; blowMic: string; blowSwipe: string; allowMic: string; orSwipe: string; read: string; readOne: string; banner: string; forLabel: string; photos: string; playing: string };

const S: Record<"en" | "es", Copy> = {
  en: { open: "open the card", light: "tap the candles to light them", lightOne: "Light candle", wish: "make a wish", blowMic: "blow into your phone", blowSwipe: "swipe up to blow", allowMic: "Use microphone", orSwipe: "or swipe up", read: "read the letter", readOne: "Read the letter", banner: "happy birthday", forLabel: "for", photos: "the photos", playing: "now playing" },
  es: { open: "abre la tarjeta", light: "toca las velas para encenderlas", lightOne: "Encender la vela", wish: "pide un deseo", blowMic: "sopla al móvil", blowSwipe: "desliza hacia arriba para soplar", allowMic: "Usar el micrófono", orSwipe: "o desliza hacia arriba", read: "lee la carta", readOne: "Leer la carta", banner: "feliz cumple", forLabel: "para", photos: "las fotos", playing: "sonando" },
};

type Stage = "closed" | "open" | "lit" | "out" | "read";

/** The pop-up pieces: where each stands on the base, how big, and when it rises. */
const PIECES = {
  left: { x: 14, depth: 16, w: 20, h: 40, delay: 0.1 },
  right: { x: 87, depth: 14, w: 18, h: 36, delay: 0.16 },
  mid: { x: 28, depth: 30, w: 14, h: 28, delay: 0.24 },
  cake: { x: 50, depth: 64, w: 60, h: 65, delay: 0.34 },
  gift: { x: 85, depth: 84, w: 19, h: 19, delay: 0.5 },
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<PopupCardFields>) {
  const reduce = !!useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const themeId: ThemeId = data.fields.theme in THEMES ? data.fields.theme : "vanilla";
  const theme = THEMES[themeId];
  const preview = mode === "preview";
  const seed = hashString(`${data.recipientName}|${data.senderName}|popup-card`);
  const photos = useMemo(() => data.photos.slice(0, 8), [data.photos]);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const candles = candleCount(data.fields.age);
  const topper = topperDigits(data.fields.age);
  const banner = data.fields.banner?.trim() || s.banner;

  const [stage, setStage] = useState<Stage>(preview ? "open" : "closed");
  const [lit, setLit] = useState<boolean[]>(() => Array(candles).fill(preview));
  const [out, setOut] = useState(false);
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const open = useMotionValue(preview ? 1 : 0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const openCard = () => {
    if (stage !== "closed") return;
    void audio.start();
    eventRef.current?.({ type: "started" });
    const duration = reduce ? 0.3 : 1.7;
    animate(open, 1, { duration, ease: [0.3, 0.05, 0.25, 1] });
    window.setTimeout(() => {
      setStage("open");
      eventRef.current?.({ type: "progress", pct: 25 });
    }, duration * 1000 + 100);
  };

  const light = (i: number) => {
    if ((stage !== "open" && stage !== "lit") || lit[i]) return;
    const next = lit.slice();
    next[i] = true;
    setLit(next);
    if (next.every(Boolean)) {
      setStage("lit");
      eventRef.current?.({ type: "progress", pct: 50 });
    }
  };

  // The detector switches itself off once the stage moves on, so a gust only has to put them out.
  const blowOut = () => {
    if (stage !== "lit") return;
    setOut(true);
    setStage("out");
    window.setTimeout(() => setBurst((b) => b + 1), reduce ? 0 : 500);
    eventRef.current?.({ type: "progress", pct: 70 });
  };

  const blow = useBlowDetector({ enabled: stage === "lit" && data.fields.flames === "auto", onBlow: blowOut });

  const swipeStart = useRef<number | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => (swipeStart.current = e.clientY);
  const onPointerUp = (e: ReactPointerEvent) => {
    if (swipeStart.current !== null && swipeStart.current - e.clientY > 80) blowOut();
    swipeStart.current = null;
  };

  const replay = () => {
    open.set(0);
    setStage("closed");
    setLit(Array(candles).fill(false));
    setOut(false);
    setRun((r) => r + 1);
  };

  const tone: CoverTone = { page: theme.inside, glow: ["transparent", "transparent"], accent: theme.accent, dark: theme.dark };
  const vars = { "--k": "min(var(--u), 0.5cqh)", "--c": "min(0.76cqw, 0.48cqh)" } as CSSProperties;
  // The lid sits a hair above the base, so the flat pieces under it never show through the paper.
  const lidTransform = useTransform(open, (v) => `translateZ(1px) rotateX(${lidAngle(v).toFixed(2)}deg)`);
  const cardTransform = useTransform(open, (v) => `rotateX(${baseTilt(v).toFixed(2)}deg)`);
  const cardTop = useTransform(open, (v) => `${(30 + 26 * settle(v)).toFixed(2)}cqh`);
  const flat = useTransform(open, (v) => Math.min(1, Math.max(0, v * 1.4)));

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: theme.room, color: theme.ink, fontFamily: "var(--gift-font-body)", ...vars }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <style>{CARD_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: theme.dark ? 0.3 : 0.55 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={theme.ambience} opacity={stage === "read" ? 0.4 : 0.85} />
      </div>

      {/* the table, in perspective */}
      <div className="absolute inset-0" style={{ perspective: "calc(260 * var(--c))", perspectiveOrigin: "50% 38%" }}>
        <motion.div
          key={`card-${run}`}
          className="absolute left-1/2"
          style={{ top: cardTop, width: "calc(100 * var(--c))", height: "calc(108 * var(--c))", translate: "-50% 0", transformOrigin: "50% 0", transform: cardTransform, transformStyle: "preserve-3d" }}
        >
          {/* the shadow the card throws on the table */}
          <div aria-hidden="true" className="absolute -inset-[4%] rounded-[6px]" style={{ background: "rgba(40,20,20,.28)", filter: "blur(calc(3 * var(--c)))", transform: "translateZ(-1px)" }} />

          {/* the base */}
          <div className="absolute inset-0 rounded-[4px]" style={{ background: theme.stock, backgroundImage: PAPER_GRAIN, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)", transformStyle: "preserve-3d" }}>
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: "rgba(0,0,0,.18)" }} />
            <motion.div className="absolute inset-0" style={{ opacity: flat }}>
              <ConfettiDots colors={theme.confetti} seed={seed} />
            </motion.div>

            <Piece open={open} spec={PIECES.left}>
              <div className="pc-drift h-full w-full">
                <PaperBalloon color={theme.papers[0]} ink={theme.ink} seed={seed + 1} className="h-full w-full" />
              </div>
            </Piece>
            <Piece open={open} spec={PIECES.right}>
              <div className="pc-drift h-full w-full" style={{ animationDelay: "-2s" }}>
                <PaperBalloon color={theme.papers[2]} ink={theme.ink} seed={seed + 2} className="h-full w-full" />
              </div>
            </Piece>
            <Piece open={open} spec={PIECES.mid}>
              <div className="pc-drift h-full w-full" style={{ animationDelay: "-3.5s" }}>
                <PaperBalloon color={theme.papers[3]} ink={theme.ink} seed={seed + 3} className="h-full w-full" />
              </div>
            </Piece>
            <Piece open={open} spec={PIECES.cake}>
              <PaperCake theme={theme} candles={candles} topper={topper} lit={lit} out={out} onCandle={stage === "open" || stage === "lit" ? light : undefined} lightLabel={s.lightOne} seed={seed} />
            </Piece>
            <Piece open={open} spec={PIECES.gift}>
              <GiftBox theme={theme} className="h-full w-full" />
            </Piece>
          </div>

          {/* the lid, hinged on the fold */}
          <motion.div className="absolute inset-x-0 bottom-full h-full" style={{ transformOrigin: "50% 100%", transformStyle: "preserve-3d", transform: lidTransform }}>
            {/* inside: the paper the words are written on */}
            <div className="absolute inset-0 rounded-t-[4px] [backface-visibility:hidden]" style={{ background: theme.inside, backgroundImage: PAPER_GRAIN, color: theme.insideInk, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)" }}>
              <Ruled color={`${theme.insideInk}22`} className="pointer-events-none absolute inset-[6%] h-[88%] w-[88%]" />
              <Inside data={data} theme={theme} s={s} blocks={blocks} banner={banner} seed={seed} onRead={stage !== "closed" ? () => setStage("read") : undefined} />
            </div>
            {/* outside: the front of the card */}
            <div className="absolute inset-0 rounded-t-[4px] [backface-visibility:hidden]" style={{ background: theme.stock, backgroundImage: PAPER_GRAIN, transform: "rotateX(180deg)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
              <CoverArt theme={theme} name={data.recipientName} forLabel={s.forLabel} seed={seed} />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* the closed card takes the tap */}
      {stage === "closed" ? <button type="button" onClick={openCard} aria-label={s.open} className="absolute inset-0 z-[20] outline-none focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-inset" /> : null}

      {/* the one line that says what to do */}
      <AnimatePresence>
        {stage !== "read" ? (
          <motion.div key={`pill-${stage}`} className="pointer-events-none absolute inset-x-0 z-[30] flex flex-col items-center gap-[calc(1.8*var(--k))] px-4" style={{ bottom: "max(calc(3.5*var(--k)), calc(env(safe-area-inset-bottom) + 1.2rem))" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            {stage === "lit" ? (
              <>
                <p className="text-[calc(5*var(--k))] italic" style={{ fontFamily: "var(--gift-font-display)", textShadow: theme.dark ? "0 2px 12px rgba(0,0,0,.5)" : "0 1px 0 rgba(255,255,255,.7)" }}>
                  {s.wish}
                </p>
                {data.fields.flames === "auto" && blow.state === "idle" ? (
                  <button type="button" onClick={() => void blow.start()} className="pointer-events-auto flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-md" style={{ background: theme.ink, color: theme.dark ? "#1A1614" : "#FFF8F4" }}>
                    <Mic className="size-4" />
                    {s.allowMic}
                  </button>
                ) : null}
                {blow.state === "listening" ? (
                  <div className="flex items-center gap-3 text-sm opacity-80">
                    <span className="relative grid size-9 place-items-center rounded-full" style={{ background: theme.dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.08)" }}>
                      <Mic className="size-4" />
                      <span className="absolute inset-0 rounded-full border" style={{ borderColor: theme.ink, transform: `scale(${1 + blow.level * 0.9})`, opacity: 0.3 + blow.level * 0.6 }} />
                    </span>
                    {s.blowMic}
                  </div>
                ) : null}
                <p className="flex items-center gap-1.5 text-[calc(2.8*var(--k))] tracking-[0.1em] uppercase opacity-60">
                  <Wind className="size-3.5" />
                  {blow.state === "listening" ? s.orSwipe : s.blowSwipe}
                </p>
              </>
            ) : stage === "out" ? (
              <motion.button
                type="button"
                data-read-pill=""
                onClick={() => setStage("read")}
                className="pointer-events-auto rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase shadow-md outline-none backdrop-blur-sm focus-visible:ring-4 focus-visible:ring-white/60"
                style={{ background: theme.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.85)", color: theme.dark ? "#FFF8EE" : theme.accent }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, scale: reduce ? 1 : [1, 1.05, 1] }}
                transition={{ opacity: { delay: 1.3, duration: 0.5 }, y: { delay: 1.3 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
              >
                {s.read}
              </motion.button>
            ) : (
              <TapPill tone={tone} reduce={reduce} delay={preview ? 0 : stage === "closed" ? 1 : 0.4}>
                {stage === "closed" ? s.open : s.light}
              </TapPill>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Confetti burst={burst} colors={[data.accentColor, ...theme.confetti]} count={220} origin={{ x: 0.5, y: 0.58 }} className="pointer-events-none absolute inset-0 z-[35]" />

      <AnimatePresence>
        {stage === "read" ? (
          <Letter key={`letter-${run}`} data={data} mode={mode} blocks={blocks} photos={photos} theme={theme} s={s} t={t} reduce={reduce || preview} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} onOpen={setActive} onClose={() => setStage("out")} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {active !== null && photos[active] ? (
          <motion.div key="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] grid place-items-center bg-black/80 p-6" onClick={() => setActive(null)}>
            <motion.figure initial={{ scale: 0.86, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.9 }} className="m-0 max-w-full p-[calc(2*var(--k))] pb-[calc(3*var(--k))]" style={{ background: theme.sheet, color: theme.sheetInk }}>
              <img src={photos[active].url} alt={photos[active].alt ?? ""} className="max-h-[68cqh] max-w-full object-contain" draggable={false} />
              {photos[active].caption ? (
                <figcaption className="mt-[calc(2*var(--k))] text-center text-[calc(4.4*var(--k))] leading-tight" style={{ fontFamily: "var(--gift-font-hand)" }}>
                  {photos[active].caption}
                </figcaption>
              ) : null}
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/** One pop-up piece: it lies flat on the base until its turn, then stands up parallel to the screen, with its shadow on the paper. */
function Piece({ open, spec, children }: { open: MotionValue<number>; spec: { x: number; depth: number; w: number; h: number; delay: number }; children: ReactNode }) {
  const transform = useTransform(open, (v) => `rotateX(${pieceAngle(v, spec.delay).toFixed(2)}deg)`);
  const shadow = useTransform(open, (v) => pieceShadow(v, spec.delay) * 0.32);
  const visible = useTransform(open, (v) => (v > spec.delay + 0.02 ? 1 : 0));
  return (
    <>
      <motion.div aria-hidden="true" className="pointer-events-none absolute rounded-[50%]" style={{ left: `${spec.x}%`, top: `${spec.depth}%`, width: `calc(${spec.w * 0.9} * var(--c))`, height: `calc(${Math.max(4, spec.h * 0.12)} * var(--c))`, translate: "-50% -50%", background: "rgba(30,15,15,1)", filter: "blur(calc(1.6 * var(--c)))", opacity: shadow }} />
      <motion.div className="absolute" style={{ left: `${spec.x}%`, top: `${spec.depth}%`, width: `calc(${spec.w} * var(--c))`, height: `calc(${spec.h} * var(--c))`, translate: "-50% -100%", transformOrigin: "50% 100%", transform, opacity: visible, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </>
  );
}

/** What is written inside the lid: the greeting, the first lines in handwriting, and a way to read the rest. */
function Inside({ data, theme, s, blocks, banner, seed, onRead }: { data: TemplateProps<PopupCardFields>["data"]; theme: Theme; s: Copy; blocks: ReturnType<typeof parseRichText>; banner: string; seed: number; onRead?: () => void }) {
  const greeting = data.locale === "es" ? `Querida ${data.recipientName},` : `Dear ${data.recipientName},`;
  const excerpt = blocks[0]?.map((r) => r.text).join("") ?? "";
  return (
    <div className="absolute inset-[8%] flex flex-col" style={{ color: theme.insideInk }}>
      <p className="text-[calc(7*var(--c))] leading-none" style={{ fontFamily: "var(--font-script), var(--gift-font-hand), cursive", color: theme.accent }}>
        {greeting}
      </p>
      <p className="relative mt-[calc(4*var(--c))] line-clamp-3 text-[calc(4.6*var(--c))] leading-[1.55] break-words" style={{ fontFamily: "var(--gift-font-hand)" }}>
        {excerpt}
      </p>
      <p className="mt-[calc(1*var(--c))] text-right text-[calc(5.4*var(--c))]" style={{ fontFamily: "var(--font-script), var(--gift-font-hand), cursive", color: theme.accent }}>
        {data.senderName}
      </p>
      <div className="pointer-events-none absolute inset-x-[-4%] bottom-[10%]">
        <PennantArch text={banner} theme={theme} seed={seed} className="w-full" />
      </div>
      {onRead ? (
        <button type="button" onClick={onRead} className="absolute inset-0 outline-none focus-visible:ring-2" aria-label={s.readOne}>
          <span className="sr-only">{s.readOne}</span>
        </button>
      ) : null}
    </div>
  );
}

function Letter({ data, mode, blocks, photos, theme, s, t, reduce, onEvent, onReact, onMakeOne, onReplay, onOpen, onClose }: { data: TemplateProps<PopupCardFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; photos: GiftPhoto[]; theme: Theme; s: Copy; t: ReturnType<typeof useGiftStrings>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void; onOpen: (i: number) => void; onClose: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "progress", pct: 100 });
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, mode]);

  return (
    <motion.div className="absolute inset-0 z-[40] overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={reduce ? { y: 0 } : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%", transition: { duration: 0.35 } }} transition={{ type: "spring", stiffness: 64, damping: 18 }}>
      <div className="flex min-h-full flex-col">
        <button type="button" aria-label={t("close")} onClick={onClose} className="shrink-0 outline-none" style={{ height: "min(22cqh, 220px)" }} />
        <div className="relative mx-auto w-[min(94cqw,600px)] flex-1 rounded-t-[calc(4*var(--k))] px-[calc(5*var(--k))] pt-[calc(6*var(--k))] pb-[calc(72px+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,.45)]" style={{ background: theme.sheet, color: theme.sheetInk, backgroundImage: PAPER_GRAIN }}>
          {photos.length ? (
            <section className="relative -mx-[calc(5*var(--k))]">
              <p className="mb-[calc(2*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-60">{s.photos}</p>
              <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="absolute inset-x-0 top-[calc(5.4*var(--k))] h-[calc(3*var(--k))] w-full" aria-hidden="true">
                <path d="M0 1 Q50 7 100 1" fill="none" stroke={theme.kraft} strokeWidth=".6" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="scrollbar-none flex snap-x snap-mandatory gap-[calc(4*var(--k))] overflow-x-auto px-[calc(6*var(--k))] pt-[calc(6*var(--k))] pb-[calc(3*var(--k))]">
                {photos.map((photo, i) => (
                  <motion.button
                    key={photo.id}
                    type="button"
                    aria-label={photo.caption || photo.alt || "photo"}
                    onClick={() => onOpen(i)}
                    className="relative m-0 w-[min(60cqw,calc(52*var(--c)))] shrink-0 snap-center p-[calc(1.6*var(--k))] pb-[calc(3.6*var(--k))] text-left shadow-[0_16px_26px_-14px_rgba(0,0,0,.5)] outline-none focus-visible:ring-4 focus-visible:ring-black/30"
                    style={{ background: "#FFFDF8", color: "#3A2E2A", rotate: `${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg` }}
                    initial={reduce ? false : { opacity: 0, y: -18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 120, damping: 14 }}
                  >
                    <Peg className="absolute -top-[calc(3.6*var(--k))] left-1/2 h-[calc(6*var(--k))] -translate-x-1/2" />
                    <div className="aspect-square overflow-hidden bg-[#E9E1D6]">
                      <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                    </div>
                    <span className="mt-[calc(1.6*var(--k))] block min-h-[calc(4*var(--k))] truncate text-center text-[calc(3.2*var(--k))] leading-tight" style={{ fontFamily: "var(--gift-font-hand)" }}>
                      {photo.caption ?? ""}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          ) : null}

          <article className="relative mt-[calc(4*var(--k))]">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={theme.accent} />
          </article>

          {data.music?.title ? (
            <p className="mt-[calc(6*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.2em] uppercase opacity-55">
              {s.playing} · {data.music.title}
              {data.music.artist ? ` — ${data.music.artist}` : ""}
            </p>
          ) : null}

          {data.countdown ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] p-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ background: theme.kraft, color: "#2E2521", backgroundImage: PAPER_GRAIN }}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}

          {data.surprise ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] px-[calc(4*var(--k))] pt-[calc(5*var(--k))] pb-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ background: theme.kraft, color: "#2E2521", backgroundImage: PAPER_GRAIN }}>
              <p className="mb-[calc(3*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}

          <div ref={endRef} className="mt-[calc(8*var(--k))]">
            <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
