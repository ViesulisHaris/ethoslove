"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { MessageBody } from "../_shared/MessageBody";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { COVER_VARS, CoverPage, POSTER_FONT, StickerScatter, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { BouquetArt, timingFor } from "./Bouquet";
import { FlowerHead } from "./art";
import { arrange } from "./arrange";
import type { BouquetFields } from "./schema";

type Backdrop = {
  bg: string;
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
  const cardAt = animate ? BLOOM_S + timingFor(arr).card + 1.1 : 0;
  const [ready, setReady] = useState(!animate);
  const [bloomed, setBloomed] = useState(!animate);
  const [open, setOpen] = useState(false);
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
    eventRef.current?.({ type: "progress", pct: 70 });
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, backgroundColor: look.cover.page, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <CoverPage tone={look.cover} pattern={look.bg} />
      <StickerScatter items={look.stickers} reduce={!!reduce} className="z-[3]" />
      <div
        className="pointer-events-none absolute inset-x-0 z-20 px-[calc(6*var(--k))] text-center"
        style={{ top: "max(calc(3*var(--k)), calc(env(safe-area-inset-top) + 2*var(--k)))" }}
      >
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        <motion.h1
          className="mx-auto mt-[calc(1.6*var(--k))] max-w-[calc(80*var(--k))] text-[calc(8*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]"
          style={{ fontFamily: POSTER_FONT }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.8 }}
        >
          {data.title || data.recipientName}
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
          <motion.div
            key="card"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
            className="absolute inset-0 z-40 scrollbar-none overflow-y-auto"
            style={{ background: look.bg }}
          >
            <Finale
              data={data}
              mode={mode}
              reduce={!!reduce}
              tone={look.tone}
              cardText={cardText}
              onEvent={onEvent}
              onReact={onReact}
              onMakeOne={onMakeOne}
              onReplay={
                mode === "preview"
                  ? undefined
                  : () => {
                      setOpen(false);
                      setReady(!animate);
                      setBloomed(!animate);
                      setRun((r) => r + 1);
                    }
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

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
    <motion.div
      className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
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
        onAnimationComplete={() => window.setTimeout(onDone, seconds * 150)}
      >
        <FlowerHead id={head.id} tone={head.tone} uid={`bloom${head.key}`} seed={head.seed} />
      </motion.svg>
    </motion.div>
  );
}

function Finale({
  data,
  mode,
  reduce,
  tone,
  cardText,
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
        <p className="text-center text-[clamp(28px,8cqw,36px)] leading-none" style={{ fontFamily: "var(--gift-font-hand)", color: "var(--gift-accent-deep)" }}>
          {cardText}
        </p>
        <div className="mt-6">
          <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" onDone={() => setDone(true)} />
        </div>
      </motion.div>

      {done && data.photos.length ? (
        <div className="grid grid-cols-2 gap-4 px-1 pt-2">
          {data.photos.map((p, i) => (
            <motion.figure
              key={p.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className="bg-[#FFFDF8] p-2 pb-3 shadow-[0_14px_28px_-16px_rgba(0,0,0,0.5)]"
              style={{ rotate: `${i % 2 ? 2.5 : -2}deg` }}
            >
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
