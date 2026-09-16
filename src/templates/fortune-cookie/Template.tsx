"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
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
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { Blossom, Coin, Lantern, TRAY_KEYFRAMES, TakeoutBox, Tray, type TrayColors } from "./art";
import type { FortuneFields } from "./schema";

const TABLE: Record<
  FortuneFields["table"],
  { bg: string; ink: string; plate: string; tone: "light" | "dark" }
> = {
  red: {
    bg: "linear-gradient(180deg,#8e1f1f 0%,#5e1212 100%)",
    ink: "#f8efe0",
    plate: "#f3ead8",
    tone: "dark",
  },
  jade: {
    bg: "linear-gradient(180deg,#2f6b5a 0%,#1d4a3e 100%)",
    ink: "#f2f7f3",
    plate: "#f3f1e8",
    tone: "dark",
  },
  linen: {
    bg: "linear-gradient(180deg,#efe6d6 0%,#dccdb6 100%)",
    ink: "#1A1614",
    plate: "#fbf7ee",
    tone: "light",
  },
};

/** The room the tray is served in: one per table, so the whole page follows the sender's choice. */
type Look = {
  tone: CoverTone;
  pattern: string;
  tray: TrayColors;
  lantern: { paper: string; deep: string; gold: string };
  blossom: { petal: string; centre: string; branch: string };
  /** The brushed name on the takeout box. */
  boxInk: string;
};

const LOOKS: Record<FortuneFields["table"], Look> = {
  red: {
    tone: { page: "#7E1A1A", glow: ["rgba(255,196,120,.34)", "rgba(198,48,48,.5)"], accent: "#8C2F2F", dark: true },
    pattern: "radial-gradient(rgba(240,208,130,.16) calc(.35*var(--k)), transparent calc(.5*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))",
    tray: { lacquer: "#3E0D0D", deep: "#280707", gold: "#D9A441" },
    lantern: { paper: "#E8493C", deep: "#8E1F1F", gold: "#E9BE63" },
    blossom: { petal: "#F7C6CE", centre: "#E9BE63", branch: "#5E2420" },
    boxInk: "#7E1A1A",
  },
  jade: {
    tone: { page: "#215043", glow: ["rgba(255,236,180,.28)", "rgba(28,92,74,.55)"], accent: "#1E4A3E", dark: true },
    pattern: "radial-gradient(rgba(240,208,130,.14) calc(.35*var(--k)), transparent calc(.5*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))",
    tray: { lacquer: "#123329", deep: "#0B231C", gold: "#D9A441" },
    lantern: { paper: "#E8493C", deep: "#8E1F1F", gold: "#E9BE63" },
    blossom: { petal: "#F3D9E2", centre: "#E9BE63", branch: "#20352C" },
    boxInk: "#1D4A3E",
  },
  linen: {
    tone: { page: "#E9DCC6", glow: ["rgba(255,250,232,.95)", "rgba(206,176,128,.5)"], accent: "#8A4A2A" },
    pattern: "radial-gradient(rgba(140,100,60,.1) calc(.35*var(--k)), transparent calc(.5*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))",
    tray: { lacquer: "#3A2420", deep: "#241512", gold: "#C79A3E" },
    lantern: { paper: "#E8493C", deep: "#9C2A22", gold: "#C79A3E" },
    blossom: { petal: "#F2BFC8", centre: "#C79A3E", branch: "#6B4A32" },
    boxInk: "#8A3A24",
  },
};

const STICKERS: StickerPlacement[] = [
  { id: "sparkle", x: 31, y: 8, size: 6.5 },
  { id: "sparkle", x: 69, y: 10, size: 5.5 },
  { id: "heart", x: 7, y: 42, size: 10, rotate: -12 },
  { id: "cherries", x: 93, y: 38, size: 11, rotate: 12 },
  { id: "daisy", x: 92, y: 72, size: 9 },
];

const AMBIENCE: { kind: AmbienceKind; colors: string[]; count?: number }[] = [
  { kind: "dust", colors: ["#FFD9A0", "#FFFFFF"], count: 14 },
  { kind: "sparkles", colors: ["#FFE9B8", "#FFFFFF"], count: 12 },
];

const S = {
  en: {
    pick: "pick a cookie",
    for: "for",
    headline: "your fortune",
    crack: "Crack it open",
    lucky: "Lucky numbers",
    left: "{n} left",
    last: "The last one is the real one.",
    close: "Tap to eat the cookie",
    open: "Open the last one",
    learn: "Learn Chinese: 爱 · love",
  },
  es: {
    pick: "elige una galleta",
    for: "para",
    headline: "tu fortuna",
    crack: "Ábrela",
    lucky: "Números de la suerte",
    left: "Quedan {n}",
    last: "La última es la de verdad.",
    close: "Toca para comerte la galleta",
    open: "Abrir la última",
    learn: "Aprende chino: 爱 · amor",
  },
};

export function Template({
  data,
  mode,
  onEvent,
  onReact,
  onMakeOne,
}: TemplateProps<FortuneFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const table = TABLE[data.fields.table] ?? TABLE.red;
  const look = LOOKS[data.fields.table] ?? LOOKS.red;
  const fortunes = useMemo(
    () => (data.fields.fortunes.length ? data.fields.fortunes : ["…"]),
    [data.fields.fortunes],
  );
  const total = fortunes.length + 1; // + the real one
  const [opened, setOpened] = useState<boolean[]>(() =>
    Array.from({ length: total }, (_, i) => mode === "preview" && i === 0),
  );
  const [active, setActive] = useState<number | null>(mode === "preview" ? 0 : null);
  const [started, setStarted] = useState(mode === "preview");
  const [finale, setFinale] = useState(false);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const openedCount = opened.filter(Boolean).length;
  const remaining = total - openedCount;
  const seed = hashString(data.recipientName + total);
  const layout = useMemo(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: total }, (_, i) => {
      const cols = total <= 4 ? 2 : 3;
      const rows = Math.ceil(total / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const spread = rows <= 2 ? 34 : rows === 3 ? 26 : 19;
      const top = 50 - ((rows - 1) * spread) / 2;
      return {
        x: 24 + (col / (cols - 1)) * 52 + (rng() - 0.5) * 6,
        y: top + row * spread + (rng() - 0.5) * 5,
        rot: (rng() - 0.5) * 40,
      };
    });
  }, [seed, total]);

  const crack = (i: number) => {
    if (opened[i] || active !== null) return;
    if (!started) {
      setStarted(true);
      void audio.start();
      onEvent?.({ type: "started" });
    }
    setOpened((o) => o.map((v, k) => (k === i ? true : v)));
    setActive(i);
    onEvent?.({ type: "progress", pct: Math.round(((openedCount + 1) / total) * 70) });
  };

  const isReal = active === total - 1;

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, background: table.bg, color: table.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{TRAY_KEYFRAMES}</style>
      <CoverPage tone={look.tone} pattern={look.pattern} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={AMBIENCE} opacity={0.85} />
      </div>
      <StickerScatter items={STICKERS} reduce={!!reduce} className="z-[3]" />
      <Blossom {...look.blossom} className="top-[-2%] left-[-7%] z-[3] w-[calc(34*var(--k))] rotate-[8deg]" />
      <Blossom {...look.blossom} className="right-[-8%] bottom-[-2%] z-[3] w-[calc(36*var(--k))] -scale-x-100 rotate-[6deg]" />
      {/* Hung from the very top of the frame, so the cord reads as coming from a ceiling we can't see. */}
      <Lantern {...look.lantern} className="top-0 left-[9%] z-[3] w-[calc(15*var(--k))]" />
      <Lantern {...look.lantern} className="fc-sway-b top-0 right-[16%] z-[3] w-[calc(12.5*var(--k))]" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[calc(7*var(--k))] text-center">
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-60"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        <motion.h1
          className="mt-[calc(1.6*var(--k))] max-w-[calc(72*var(--k))] text-[calc(7.6*var(--k))] leading-[1.06] text-balance italic [overflow-wrap:anywhere]"
          style={{ fontFamily: POSTER_FONT }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.8 }}
        >
          {data.title?.trim() || s.headline}
        </motion.h1>

        {/* The tray, with every cookie exactly where the layout put it. */}
        <motion.div
          className="relative mt-[calc(3.8*var(--k))] w-[calc(68*var(--k))]"
          initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
        >
          <Float reduce={!!reduce} amount={0.7}>
            <Tray colors={look.tray}>
              {layout.map((pos, i) => (
                <Cookie
                  key={i}
                  index={i}
                  pos={pos}
                  opened={opened[i]}
                  real={i === total - 1}
                  onCrack={() => crack(i)}
                  reduce={!!reduce}
                  label={s.crack}
                />
              ))}
            </Tray>
          </Float>
          <TakeoutBox name={data.recipientName} forLabel={s.for} ink={look.boxInk} className="top-[78%] left-[-11%] z-[4] w-[31%]" />
          <Coin gold={look.tray.gold} className="right-[-9%] bottom-[7%] z-[4] w-[calc(8*var(--k))]" />
          <Coin gold={look.tray.gold} className="right-[-14%] bottom-[15%] z-[4] w-[calc(6*var(--k))] -rotate-12" />
          <span
            aria-hidden="true"
            className="absolute -bottom-[calc(2*var(--k))] left-1/2 h-[calc(4.5*var(--k))] w-[80%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[calc(2.6*var(--k))]"
          />
        </motion.div>

        <div className="mt-[calc(4.6*var(--k))] flex min-h-[calc(12*var(--k))] flex-col items-center gap-[calc(1.8*var(--k))]">
          <AnimatePresence mode="wait">
            {active === null ? (
              remaining > 1 ? (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-[calc(1.6*var(--k))]"
                >
                  <TapPill tone={look.tone} reduce={!!reduce}>
                    {s.pick}
                  </TapPill>
                  <p className="text-[calc(2.6*var(--k))] tracking-[0.2em] uppercase opacity-55">
                    {s.left.replace("{n}", String(remaining))}
                  </p>
                </motion.div>
              ) : remaining === 1 ? (
                <motion.p
                  key="last"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-w-[calc(66*var(--k))] text-[calc(4.4*var(--k))] text-balance italic"
                  style={{ fontFamily: POSTER_FONT }}
                >
                  {s.last}
                </motion.p>
              ) : (
                <motion.button
                  key="open"
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setFinale(true);
                    onEvent?.({ type: "progress", pct: 85 });
                  }}
                  className="h-[calc(11*var(--k))] rounded-full px-[calc(7*var(--k))] text-[calc(3.6*var(--k))] font-semibold shadow-lg"
                  style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
                >
                  {s.open}
                </motion.button>
              )
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Slip */}
      <AnimatePresence>
        {active !== null ? (
          <motion.div
            key={`slip-${active}`}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActive(null);
              if (isReal) setFinale(true);
            }}
          >
            <motion.div
              initial={{ y: 60, scaleX: 0.3, opacity: 0, rotate: -6 }}
              animate={{ y: 0, scaleX: 1, opacity: 1, rotate: -1 }}
              exit={{ y: -30, opacity: 0, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.25 }}
              className="relative w-[min(88cqw,420px)] bg-[#fbf6e9] px-6 py-5 text-center text-[#2a2420] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent 0 22px, rgba(200,116,58,0.12) 22px 23px)",
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: "var(--gift-accent)" }}
              />
              <p
                className="text-[10px] tracking-[0.3em] uppercase"
                style={{ color: "var(--gift-accent)" }}
              >
                {isReal ? "♥" : `№ ${active + 1}`}
              </p>
              {!isReal && active < data.photos.length ? (
                <img
                  src={data.photos[active].url}
                  alt={data.photos[active].alt ?? ""}
                  className="mx-auto mt-3 h-24 w-24 rotate-2 rounded-sm object-cover shadow-md"
                />
              ) : null}
              <p
                className="mt-3 text-[clamp(1.05rem,4.8cqw,1.3rem)] leading-snug"
                style={{
                  fontFamily: "var(--gift-font-display)",
                  fontStyle: isReal ? "italic" : "normal",
                }}
              >
                {isReal ? s.last : fortunes[active]}
              </p>
              {data.fields.luckyNumbers ? (
                <p className="mt-3 text-[11px] tracking-[0.15em] uppercase opacity-60">
                  {s.lucky}: {data.fields.luckyNumbers}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] opacity-40">{s.learn}</p>
              <p className="mt-3 text-[11px] opacity-50">{s.close}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Finale */}
      <AnimatePresence>
        {finale ? (
          <motion.div
            key="finale"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
            className="absolute inset-0 z-40 scrollbar-none overflow-y-auto"
            style={{ background: table.bg }}
          >
            <Finale
              data={data}
              mode={mode}
              blocks={blocks}
              reduce={!!reduce}
              tone={table.tone}
              onEvent={onEvent}
              onReact={onReact}
              onMakeOne={onMakeOne}
              onReplay={
                mode === "preview"
                  ? undefined
                  : () => {
                      setFinale(false);
                      setOpened(Array(total).fill(false));
                      setActive(null);
                    }
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

function Cookie({
  index,
  pos,
  opened,
  real,
  onCrack,
  reduce,
  label,
}: {
  index: number;
  pos: { x: number; y: number; rot: number };
  opened: boolean;
  real: boolean;
  onCrack: () => void;
  reduce: boolean;
  label: string;
}) {
  const style: CSSProperties = {
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: `translate(-50%,-50%) rotate(${pos.rot}deg)`,
  };
  const gid = `ck${index}`;
  return (
    <button
      type="button"
      onClick={onCrack}
      aria-label={`${label} ${index + 1}`}
      data-cookie={index}
      className={cn("absolute h-[20%] w-[28%]", opened && "pointer-events-none")}
      style={style}
    >
      <motion.div
        className="relative h-full w-full"
        animate={opened ? {} : reduce ? {} : { y: [0, -2, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.2 }}
      >
        {[-1, 1].map((side) => (
          <motion.svg
            key={side}
            viewBox="0 0 100 80"
            className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_8px_10px_rgba(0,0,0,0.35)]"
            animate={
              opened
                ? { x: side * 22, rotate: side * 24, y: side < 0 ? 6 : -4 }
                : { x: 0, rotate: 0, y: 0 }
            }
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
          >
            <defs>
              <radialGradient id={`${gid}-${side}`} cx="45%" cy="25%" r="80%">
                <stop offset="0" stopColor="#f6d59c" />
                <stop offset="0.55" stopColor="#dda352" />
                <stop offset="1" stopColor="#a8682a" />
              </radialGradient>
            </defs>
            {/* A folded crescent: the outer curve is the shell, the inner curve is the pinched fold. */}
            <path
              d={
                side < 0
                  ? "M50 72 C34 78 6 66 4 42 C2 18 26 4 50 8 L50 38 C42 44 42 58 50 72 Z"
                  : "M50 72 C66 78 94 66 96 42 C98 18 74 4 50 8 L50 38 C58 44 58 58 50 72 Z"
              }
              fill={`url(#${gid}-${side})`}
              stroke="#8a5322"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d={side < 0 ? "M46 14 C30 16 14 28 12 42" : "M54 14 C70 16 86 28 88 42"}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </motion.svg>
        ))}
        {!opened ? (
          <span
            className="absolute top-[52%] left-1/2 h-[18%] w-[3px] -translate-x-1/2 rounded-full bg-[#fbf6e9]/90"
            aria-hidden="true"
          />
        ) : null}
        {real && !opened ? <span className="absolute -top-1 -right-1 text-sm">✨</span> : null}
        {opened ? (
          <span
            className="absolute inset-0 flex items-center justify-center gap-1"
            aria-hidden="true"
          >
            {[0, 1, 2].map((k) => (
              <motion.span
                key={k}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, 10 + k * 4] }}
                transition={{ duration: 0.8, delay: k * 0.08 }}
                className="size-1.5 rounded-full bg-[#b0722c]"
              />
            ))}
          </span>
        ) : null}
      </motion.div>
    </button>
  );
}

function Finale({
  data,
  mode,
  blocks,
  reduce,
  tone,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<FortuneFields>["data"];
  mode: TemplateProps["mode"];
  blocks: ReturnType<typeof parseRichText>;
  reduce: boolean;
  tone: "light" | "dark";
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
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
  const paper = "#fbf6e9";
  return (
    <div className="mx-auto flex w-[min(90cqw,520px)] flex-col gap-5 pt-[max(10cqh,56px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div
        className="relative px-7 py-8 text-[#2a2420] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
        style={{ background: paper }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: "var(--gift-accent)" }}
        />
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
        <div className="p-5 text-[#2a2420]" style={{ background: paper }}>
          <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
        </div>
      ) : null}
      {done && data.surprise ? (
        <div className="p-5 text-[#2a2420]" style={{ background: paper }}>
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
        <div ref={endRef} className="pt-2">
          <EndScreen
            data={data}
            tone={tone}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={onReplay}
          />
        </div>
      ) : null}
    </div>
  );
}
