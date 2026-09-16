"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { RichMessage } from "../_shared/RichMessage";
import { Typewriter } from "../_shared/Typewriter";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, CoverPage, POSTER_FONT, StickerScatter, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { BLOOM_KEYFRAMES, Pot, StemTag, Windowsill, type PotColors, type SillColors } from "./art";
import { Flower, type BloomState } from "./Flower";
import type { BloomFields } from "./schema";

type Sky = {
  bg: string;
  ink: string;
  tone: "light" | "dark";
  /** The light in the room, which the sender picks by choosing the sky. */
  cover: CoverTone;
  sill: SillColors;
  pot: PotColors;
  ribbon: string;
  ribbonDeep: string;
  tagPaper: string;
  tagInk: string;
  stickers: StickerPlacement[];
  ambience: { kind: AmbienceKind; colors: string[]; count?: number }[];
};

const SKY: Record<BloomFields["sky"], Sky> = {
  dawn: {
    bg: "linear-gradient(180deg,#f7e3d4 0%,#f1c9c0 45%,#d9a6a8 100%)",
    ink: "#3a2a2a",
    tone: "light",
    cover: { page: "#f1c9c0", glow: ["rgba(255,238,202,.85)", "rgba(255,188,166,.5)"], accent: "#B4485C" },
    sill: { top: "#F4DCC4", face: "#D2A886", edge: "rgba(255,255,255,.55)" },
    pot: { body: "#C6764F", rim: "#D68A63", shade: "rgba(120,60,40,.34)", soil: "#4A3327" },
    ribbon: "#CC5A70",
    ribbonDeep: "#9E3A50",
    tagPaper: "#FFF7EC",
    tagInk: "#4A2B33",
    stickers: [
      { id: "sparkle", x: 11, y: 17, size: 8 },
      { id: "butterfly", x: 87, y: 19, size: 14, rotate: 12 },
      { id: "daisy", x: 8, y: 53, size: 12 },
      { id: "sparkle", x: 93, y: 49, size: 7 },
      { id: "heart", x: 12, y: 84, size: 12, rotate: -10 },
      { id: "bow", x: 90, y: 82, size: 13, rotate: 10 },
    ],
    ambience: [
      { kind: "petals", colors: ["#FBD3DC", "#FFFFFF"], count: 8 },
      { kind: "dust", colors: ["#FFE7B8", "#FFFFFF"], count: 14 },
    ],
  },
  dusk: {
    bg: "linear-gradient(180deg,#2b1f3a 0%,#4a2b4f 55%,#7a3f55 100%)",
    ink: "#f8eef0",
    tone: "dark",
    cover: { page: "#3a2545", glow: ["rgba(255,205,160,.3)", "rgba(120,70,110,.55)"], accent: "#F8EEF0", dark: true },
    sill: { top: "#5A3E5C", face: "#38253D", edge: "rgba(255,216,190,.35)" },
    pot: { body: "#4E3A63", rim: "#5F4878", shade: "rgba(12,6,20,.5)", soil: "#241A2E" },
    ribbon: "#E8A0B4",
    ribbonDeep: "#B06A83",
    tagPaper: "#4A3358",
    tagInk: "#F8EEF0",
    stickers: [
      { id: "star", x: 11, y: 16, size: 11, rotate: -10 },
      { id: "moon", x: 88, y: 18, size: 15 },
      { id: "sparkle", x: 8, y: 53, size: 9 },
      { id: "star", x: 93, y: 49, size: 8, rotate: 14 },
      { id: "heart", x: 12, y: 84, size: 12, rotate: -10 },
      { id: "sparkle", x: 90, y: 82, size: 10 },
    ],
    ambience: [
      { kind: "petals", colors: ["#E8A0B4", "#F6D3DC"], count: 7 },
      { kind: "sparkles", colors: ["#FFFFFF", "#FFD9A8"], count: 14 },
    ],
  },
  paper: {
    bg: "linear-gradient(180deg,#faf7f2 0%,#f1ebe1 100%)",
    ink: "#1A1614",
    tone: "light",
    cover: { page: "#f1ebe1", glow: ["rgba(255,252,240,.95)", "rgba(214,200,178,.45)"], accent: "#7A6344" },
    sill: { top: "#F7F2E8", face: "#DBD1C0", edge: "rgba(255,255,255,.7)" },
    pot: { body: "#E8E0D2", rim: "#F3EDE3", shade: "rgba(110,95,75,.3)", soil: "#5A4A3A" },
    ribbon: "#C98B76",
    ribbonDeep: "#9C6552",
    tagPaper: "#FFFDF6",
    tagInk: "#3B2A22",
    stickers: [
      { id: "sparkle", x: 11, y: 17, size: 8 },
      { id: "butterfly", x: 87, y: 19, size: 14, rotate: 12 },
      { id: "daisy", x: 8, y: 53, size: 12 },
      { id: "sparkle", x: 93, y: 49, size: 7 },
      { id: "tulip", x: 12, y: 83, size: 13, rotate: -10 },
      { id: "leaf", x: 90, y: 82, size: 12, rotate: 16 },
    ],
    ambience: [
      { kind: "petals", colors: ["#FFFFFF", "#F0E2CC"], count: 7 },
      { kind: "dust", colors: ["#FFF3D8", "#FFFFFF"], count: 12 },
    ],
  },
};

const S = {
  en: {
    hold: "hold to bloom",
    holding: "keep holding…",
    open: "It's open.",
    read: "Read the note",
    tap: "tap to bloom",
    photos: "Tap a photo",
    for: "for",
  },
  es: {
    hold: "mantén pulsado",
    holding: "sigue así…",
    open: "Ya está abierta.",
    read: "Leer la nota",
    tap: "toca para florecer",
    photos: "Toca una foto",
    for: "para",
  },
};

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<BloomFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const sky = SKY[data.fields.sky] ?? SKY.dawn;
  const [webgl] = useState(() => (typeof window === "undefined" ? true : hasWebGL()));
  const [bloomed, setBloomed] = useState(mode === "preview" || !webgl);
  const [holding, setHolding] = useState(false);
  const [started, setStarted] = useState(mode === "preview");
  const [note, setNote] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const state = useRef<BloomState>({
    progress: mode === "preview" ? 1 : 0,
    holding: false,
    bloomed: mode === "preview",
  });
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const color = data.fields.petalColor || data.accentColor;
  const seed = hashString(data.recipientName);
  const spots = useMemo(() => {
    const rng = mulberry32(seed);
    const n = Math.max(1, Math.min(8, data.photos.length));
    return data.photos.slice(0, 8).map((p, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      return {
        photo: p,
        x: 50 + side * (28 + rng() * 10),
        y: 24 + (i / Math.max(1, n - 1)) * 48,
        rot: (rng() - 0.5) * 16,
        delay: i * 0.12,
      };
    });
  }, [data.photos, seed]);

  const begin = () => {
    if (!started) {
      setStarted(true);
      void audio.start();
      onEvent?.({ type: "started" });
    }
  };
  const down = () => {
    begin();
    state.current.holding = true;
    setHolding(true);
    if (reduce) state.current.progress = 1;
  };
  const up = () => {
    state.current.holding = false;
    setHolding(false);
  };
  const onBloomed = () => {
    setBloomed(true);
    setHolding(false);
    onEvent?.({ type: "progress", pct: 45 });
  };

  useEffect(() => {
    const cancel = () => {
      state.current.holding = false;
      setHolding(false);
    };
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, backgroundColor: sky.cover.page, color: sky.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{BLOOM_KEYFRAMES}</style>
      <CoverPage tone={sky.cover} pattern={sky.bg} />
      {webgl ? (
        <div
          className="absolute inset-0 touch-none"
          onPointerDown={mode === "preview" ? undefined : down}
          onPointerUp={up}
          onPointerLeave={up}
        >
          <Flower
            kind={data.fields.flower}
            color={color}
            stateRef={state}
            pollen={data.fields.pollen}
            reduce={!!reduce}
            onBloomed={onBloomed}
            className="!absolute inset-0"
          />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[8rem]" aria-hidden="true">
          🌸
        </div>
      )}

      {/* Petals in the light, then the stickers, then the ledge the pot is standing on. */}
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={sky.ambience} opacity={0.85} />
      </div>
      <StickerScatter items={sky.stickers} reduce={!!reduce} className="z-[3]" />
      <div className="pointer-events-none absolute inset-0 z-[4]" aria-hidden="true">
        <Windowsill colors={sky.sill} />
        <Pot colors={sky.pot} />
        <StemTag
          name={data.recipientName}
          forLabel={s.for}
          ribbon={sky.ribbon}
          ribbonDeep={sky.ribbonDeep}
          paper={sky.tagPaper}
          ink={sky.tagInk}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 z-[5] px-[calc(6*var(--k))] text-center" style={{ top: "max(calc(5*var(--k)), calc(env(safe-area-inset-top) + 2*var(--k)))" }}>
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

      <AnimatePresence>
        {bloomed && !note
          ? spots.map((sp, i) => (
              <motion.button
                key={sp.photo.id}
                type="button"
                onClick={() => setLightbox(i)}
                initial={{ opacity: 0, y: 40, scale: 0.8 }}
                animate={{ opacity: 1, y: [0, -6, 0], scale: 1, rotate: sp.rot }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  opacity: { delay: sp.delay, duration: 0.5 },
                  scale: { delay: sp.delay, type: "spring", stiffness: 200, damping: 16 },
                  y: {
                    delay: sp.delay + 0.5,
                    duration: 3 + i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
                className="absolute z-20 w-[calc(22*var(--u))] max-w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white p-1 pb-3 shadow-[0_18px_30px_-12px_rgba(0,0,0,0.45)]"
                style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
                data-bloom-photo={i}
              >
                <img
                  src={sp.photo.url}
                  alt={sp.photo.alt ?? ""}
                  className="aspect-square w-full object-cover"
                />
              </motion.button>
            ))
          : null}
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center gap-[calc(2.4*var(--k))] px-[calc(6*var(--k))] text-center"
        style={{ bottom: `max(calc(10*var(--k)), calc(env(safe-area-inset-bottom) + 2*var(--k)))` }}
      >
        {!bloomed ? (
          <motion.div
            role="button"
            aria-label={reduce ? s.tap : s.hold}
            animate={holding ? { scale: 1.06 } : { scale: reduce ? 1 : [1, 1.05, 1] }}
            transition={holding ? { duration: 0.2 } : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-auto flex touch-none items-center gap-[calc(2.2*var(--k))] rounded-full py-[calc(1.7*var(--k))] pr-[calc(4.5*var(--k))] pl-[calc(2*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] whitespace-nowrap uppercase backdrop-blur-sm"
            style={{
              background: sky.cover.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.8)",
              color: sky.cover.dark ? "#FFF8EE" : sky.cover.accent,
              boxShadow: sky.cover.dark ? "inset 0 0 0 1px rgba(255,255,255,.2)" : "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(70,35,25,.14)",
            }}
            onPointerDown={down}
            onPointerUp={up}
            data-hold
          >
            <HoldRing stateRef={state} active={started} />
            {holding ? s.holding : reduce ? s.tap : s.hold}
          </motion.div>
        ) : !note ? (
          <>
            <p
              className="text-[clamp(1.1rem,5cqw,1.3rem)] italic"
              style={{ fontFamily: "var(--gift-font-display)" }}
            >
              {s.open}
            </p>
            {data.photos.length ? <p className="text-xs opacity-60">{s.photos}</p> : null}
            <button
              type="button"
              onClick={() => {
                setNote(true);
                onEvent?.({ type: "progress", pct: 70 });
              }}
              className="pointer-events-auto h-12 rounded-full px-7 text-[15px] font-semibold shadow-lg"
              style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
            >
              {s.read}
            </button>
          </>
        ) : null}
      </div>

      <AnimatePresence>
        {note ? (
          <motion.div
            key="note"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
            className="absolute inset-0 z-40 scrollbar-none overflow-y-auto overscroll-contain bg-black/25 backdrop-blur-[2px]"
          >
            <Note
              data={data}
              mode={mode}
              blocks={blocks}
              reduce={!!reduce}
              onEvent={onEvent}
              onReact={onReact}
              onMakeOne={onMakeOne}
              onReplay={
                mode === "preview"
                  ? undefined
                  : () => {
                      state.current.progress = 0;
                      state.current.holding = false;
                      state.current.bloomed = false;
                      setBloomed(false);
                      setNote(false);
                      setStarted(true);
                    }
              }
              onClose={() => setNote(false)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox !== null && spots[lightbox] ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 grid place-items-center bg-black/85 p-5"
            onClick={() => setLightbox(null)}
          >
            <motion.figure
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              className="max-w-full text-center"
            >
              <img
                src={spots[lightbox].photo.url}
                alt={spots[lightbox].photo.alt ?? ""}
                className="max-h-[70cqh] rounded-md object-contain"
              />
              {spots[lightbox].photo.caption ? (
                <figcaption className="mt-3 text-sm text-white">
                  {spots[lightbox].photo.caption}
                </figcaption>
              ) : null}
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle
        audio={audio}
        locale={data.locale}
        className={sky.tone === "light" ? "bg-black/10 text-current" : undefined}
      />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

const RING = 2 * Math.PI * 15.5;

/** Polls the mutable bloom progress on a timer so React never re-renders per frame. */
function HoldRing({ stateRef, active }: { stateRef: RefObject<BloomState>; active: boolean }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPct(Math.round((stateRef.current?.progress ?? 0) * 100)), 120);
    return () => clearInterval(id);
  }, [stateRef, active]);
  return (
    <span
      className="relative grid size-[calc(6.4*var(--k))] shrink-0 place-items-center"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" opacity=".25" />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 150ms linear" }}
        />
      </svg>
      <span className="size-[calc(1.9*var(--k))] rounded-full" style={{ background: "currentColor" }} />
    </span>
  );
}

function Note({
  data,
  mode,
  blocks,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
  onClose,
}: {
  data: TemplateProps<BloomFields>["data"];
  mode: TemplateProps["mode"];
  blocks: ReturnType<typeof parseRichText>;
  reduce: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
  onClose: () => void;
}) {
  const t = useGiftStrings(data.locale);
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
  }, [onEvent]);
  return (
    <div className="mx-auto flex w-[min(90cqw,520px)] flex-col gap-4 pt-[max(12cqh,64px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="self-center rounded-full bg-white/70 px-4 py-1.5 text-xs text-[#1A1614] backdrop-blur"
      >
        ↓
      </button>
      <div className="rounded-[18px] bg-[#fffdf8] px-7 py-8 text-[#1A1614] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]">
        <h2
          className="text-[clamp(1.5rem,6.5cqw,1.9rem)] italic"
          style={{ fontFamily: "var(--gift-font-display)" }}
        >
          {t("dear", { name: data.recipientName })}
        </h2>
        <div className="mt-4 text-[clamp(1rem,4.4cqw,1.1rem)] leading-relaxed [&_em]:text-[var(--gift-accent-deep)] [&_p+p]:mt-4 [&_strong]:font-semibold">
          {instant ? (
            <RichMessage
              blocks={blocks}
              stagger={mode === "preview" ? 0 : 0.5}
              onDone={() => setDone(true)}
            />
          ) : (
            <Typewriter blocks={blocks} active speed={38} onDone={() => setDone(true)} />
          )}
        </div>
        {done ? (
          <p
            className="mt-5 text-right text-xl italic"
            style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent-deep)" }}
          >
            — {data.senderName}
          </p>
        ) : null}
      </div>
      {done && data.countdown ? (
        <div className="rounded-[18px] bg-[#fffdf8] p-5 text-[#1A1614]">
          <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
        </div>
      ) : null}
      {done && data.surprise ? (
        <div className="rounded-[18px] bg-[#fffdf8] p-5 text-[#1A1614]">
          <p className="mb-3 text-center text-[11px] tracking-[0.25em] uppercase opacity-50">
            {t("ps")}
          </p>
          <SurpriseReveal
            surprise={data.surprise}
            locale={data.locale}
            tone="light"
            onReveal={() => onEvent?.({ type: "surprise" })}
          />
        </div>
      ) : null}
      {done ? (
        <div ref={endRef} className="rounded-[18px] bg-[#fffdf8] p-4 text-[#1A1614]">
          <EndScreen
            data={data}
            tone="light"
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={onReplay}
          />
        </div>
      ) : null}
    </div>
  );
}
