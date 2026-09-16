"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mic, Wind } from "lucide-react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { useBlowDetector } from "../_shared/hooks/use-blow-detector";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { MessageBody } from "../_shared/MessageBody";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { GiftVideo } from "../_shared/GiftVideo";
import { Ambience } from "../_shared/Ambience";
import { COVER_VARS, Float, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import type { CinemaFields } from "./schema";
import { CINEMA_KEYFRAMES, Marquee, Ticket } from "./art";
import { Flames, type FlameState } from "./Flames";

const CURTAIN: Record<CinemaFields["curtain"], { base: string; dark: string; light: string }> = {
  crimson: { base: "#8f1d24", dark: "#5a0f14", light: "#c0323a" },
  midnight: { base: "#1d2a5a", dark: "#0f163a", light: "#33478a" },
  emerald: { base: "#1d5a3a", dark: "#0f3a24", light: "#2f8a5a" },
};

const S = {
  en: { now: "Now showing", turns: "turns", blowMic: "Blow into your phone", blowSwipe: "Swipe up to blow", allowMic: "Use microphone", orSwipe: "or swipe up", wish: "Make a wish", happy: "Happy birthday,", roll: "Roll the film", tapStart: "tap to start the show", admit: "Admit one", for: "for", seat: "Row A · Seat 1", stub: "Show" },
  es: { now: "Hoy", turns: "cumple", blowMic: "Sopla al teléfono", blowSwipe: "Desliza hacia arriba para soplar", allowMic: "Usar el micrófono", orSwipe: "o desliza hacia arriba", wish: "Pide un deseo", happy: "¡Feliz cumpleaños,", roll: "Que ruede la película", tapStart: "toca para empezar la función", admit: "Entrada", for: "para", seat: "Fila A · Butaca 1", stub: "Función" },
};

/** The pill sits on velvet, so the cover is always a dark page. */
const TONE: CoverTone = { page: "#140A0A", glow: ["rgba(255,203,116,.5)", "rgba(120,20,25,.45)"], accent: "#8F1D24", dark: true };

/** Clear of the sign at the top, the ticket in the middle and the pill at the foot. */
const COVER_STICKERS: StickerPlacement[] = [
  { id: "balloons", x: 13, y: 44, size: 18, rotate: -9 },
  { id: "star", x: 88, y: 41, size: 13, rotate: 11 },
  { id: "sparkle", x: 92, y: 65, size: 7 },
  { id: "sparkle", x: 9, y: 67, size: 8 },
  { id: "star", x: 82, y: 86, size: 9, rotate: -14 },
];

type Stage = "curtains" | "cake" | "out" | "film" | "message";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<CinemaFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "film" : "curtains");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const curtain = CURTAIN[data.fields.curtain] ?? CURTAIN.crimson;
  const age = data.fields.age;
  const candleCount = age ? Math.min(12, age) : 5;
  const [lit, setLit] = useState<FlameState[]>(() => Array(candleCount).fill("lit"));
  const outCount = lit.filter((x) => x === "out").length;
  const marquee = data.fields.marquee || (age ? `${s.now}: ${data.recipientName} ${s.turns} ${age}` : `${s.now}: ${data.recipientName}`);

  const positions = useMemo(() => Array.from({ length: candleCount }, (_, i) => ({ x: 0.5 + ((i - (candleCount - 1) / 2) / Math.max(candleCount, 4)) * 0.62, y: 0.47 - (i % 2) * 0.012 })), [candleCount]);

  const blowOne = useCallback(() => {
    setLit((prev) => {
      const idx = prev.findIndex((x) => x === "lit");
      if (idx === -1) return prev;
      const next = [...prev];
      // A gust takes a few candles at a time; feels like breath, not a switch.
      const gust = Math.max(2, Math.ceil(prev.length / 3)) + Math.floor(Math.random() * 2);
      for (let k = 0; k < gust; k++) {
        const j = next.findIndex((x) => x === "lit");
        if (j !== -1) next[j] = "out";
      }
      return next;
    });
  }, []);

  const blow = useBlowDetector({ enabled: stage === "cake" && data.fields.blow === "auto", onBlow: blowOne });

  // All candles out → a beat for the smoke, then the confetti moment.
  useEffect(() => {
    if (!(stage === "cake" && outCount === candleCount && candleCount > 0)) return;
    const id = window.setTimeout(() => {
      blow.stop();
      setStage("out");
      setBurst((b) => b + 1);
      onEvent?.({ type: "progress", pct: 35 });
    }, 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outCount, candleCount, stage]);

  // Separate effect so the stage change above can't cancel the film reel.
  useEffect(() => {
    if (stage !== "out") return;
    const id = window.setTimeout(() => setStage("film"), reduce ? 1000 : 3400);
    return () => window.clearTimeout(id);
  }, [stage, reduce]);

  const start = () => {
    if (stage !== "curtains") return;
    void audio.start();
    onEvent?.({ type: "started" });
    setStage("cake");
  };

  const swipeStart = useRef<number | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => (swipeStart.current = e.clientY);
  const onPointerUp = (e: ReactPointerEvent) => {
    if (stage !== "cake" || swipeStart.current === null) return;
    if (swipeStart.current - e.clientY > 90) blowOne();
    swipeStart.current = null;
  };

  const replay = () => {
    setLit(Array(candleCount).fill("lit"));
    setStage("curtains");
    setRun((r) => r + 1);
  };

  const vars = { "--curtain": curtain.base, "--curtain-dark": curtain.dark, "--curtain-light": curtain.light } as CSSProperties;
  const open = stage !== "curtains";

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-[#0d0a0a] text-paper select-none" style={{ ...COVER_VARS, ...vars, fontFamily: "var(--gift-font-body)" }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <style>{CINEMA_KEYFRAMES}</style>
      {/* Stage floor + spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_62%,rgba(255,200,120,0.14),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,transparent,rgba(60,30,20,0.65))]" />

      {/* Marquee over the cake, once the curtains are open */}
      <div className={cn("absolute inset-x-0 top-[13%] z-30 flex justify-center px-6 transition-opacity duration-700", (stage === "film" || stage === "message") && "opacity-0")}>
        <Marquee text={marquee} compact />
      </div>

      {/* Cake scene */}
      <div className={cn("absolute inset-0 transition-opacity duration-700", stage === "film" || stage === "message" ? "opacity-0" : "opacity-100")}>
        <Cake count={candleCount} positions={positions} />
        <Flames positions={positions} states={lit} wind={blow.level} reduced={!!reduce} />
        {age && age > 12 ? (
          <div className="absolute left-1/2 top-[31%] -translate-x-1/2 font-display text-[3.4rem] leading-none text-[#ffd98a] drop-shadow-[0_0_18px_rgba(255,180,80,0.6)]" style={{ fontFamily: "var(--gift-font-display)" }}>
            {age}
          </div>
        ) : null}
      </div>

      {/* Instructions while lit */}
      <AnimatePresence>
        {stage === "cake" ? (
          <motion.div key="blow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-[max(3rem,calc(env(safe-area-inset-bottom)+2.5rem))] z-30 flex flex-col items-center gap-3 px-8 text-center">
            <p className="text-[clamp(1.4rem,6cqw,1.8rem)] italic" style={{ fontFamily: "var(--gift-font-display)" }}>{s.wish}</p>
            {data.fields.blow === "auto" && blow.state === "idle" ? (
              <button type="button" onClick={() => void blow.start()} className="flex h-11 items-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-night">
                <Mic className="size-4" />
                {s.allowMic}
              </button>
            ) : null}
            {blow.state === "listening" ? (
              <div className="flex items-center gap-3 text-sm text-paper/80">
                <span className="relative grid size-9 place-items-center rounded-full bg-white/10">
                  <Mic className="size-4" />
                  <span className="absolute inset-0 rounded-full border border-paper/60" style={{ transform: `scale(${1 + blow.level * 0.9})`, opacity: 0.3 + blow.level * 0.6 }} />
                </span>
                {s.blowMic}
              </div>
            ) : null}
            <p className="flex items-center gap-1.5 text-xs text-paper/55">
              <Wind className="size-3.5" />
              {blow.state === "listening" ? s.orSwipe : s.blowSwipe}
            </p>
          </motion.div>
        ) : null}
        {stage === "out" ? (
          <motion.div key="happy" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 140, damping: 14 }} className="absolute inset-x-0 top-[34%] z-30 px-6 text-center">
            <p className="text-[clamp(2.2rem,11cqw,3.4rem)] leading-[0.95] italic" style={{ fontFamily: "var(--gift-font-display)" }}>
              {s.happy}
              <br />
              <span style={{ color: "var(--gift-accent)" }}>{data.recipientName}!</span>
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {open ? (
        <div className="pointer-events-none absolute inset-0 z-[25]" aria-hidden="true">
          <Ambience layers={[{ kind: "bokeh", colors: ["#FFD98A", "#FFF1D6", data.accentColor], count: 10 }, { kind: "sparkles", colors: ["#FFE9B8", "#FFFFFF"], count: 18 }]} opacity={stage === "film" || stage === "message" ? 0.45 : 0.9} />
        </div>
      ) : null}
      <Confetti burst={burst} colors={[data.accentColor, "#F2C879", "#FFF8F4", "#F4C7C3"]} count={220} origin={{ x: 0.5, y: 0.7 }} />

      {/* Film strip + message */}
      {stage === "film" || stage === "message" ? (
        <FilmPanel data={data} mode={mode} blocks={blocks} reduce={!!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} landscape={size.isLandscape} />
      ) : null}

      {/* Curtains */}
      <Curtain side="left" open={open} reduced={!!reduce} />
      <Curtain side="right" open={open} reduced={!!reduce} />
      <div className="absolute inset-x-0 top-0 z-40 h-[9%] bg-[linear-gradient(180deg,var(--curtain-dark),var(--curtain))] shadow-[0_10px_30px_rgba(0,0,0,0.6)]" style={{ borderBottom: "6px solid var(--gift-accent)" }} />

      {/* The cover: the house lights up before anyone has tapped anything. */}
      <AnimatePresence>
        {stage === "curtains" ? (
          <motion.div key="cover" className="absolute inset-0 z-50" exit={{ opacity: 0, transition: { duration: 0.45 } }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="bc-beam absolute -top-[4%] left-0 h-[118%] w-[76%] mix-blend-screen"
                style={{ clipPath: "polygon(16% 0, 31% 0, 100% 100%, 42% 100%)", background: "linear-gradient(180deg, rgba(255,232,183,.5), rgba(255,196,110,0) 82%)" }}
              />
              <div
                className="bc-beam absolute -top-[4%] right-0 h-[118%] w-[76%] mix-blend-screen"
                style={{ clipPath: "polygon(69% 0, 84% 0, 58% 100%, 0 100%)", background: "linear-gradient(180deg, rgba(255,232,183,.42), rgba(255,196,110,0) 82%)" }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <Ambience layers={[{ kind: "dust", colors: ["#FFE0A8", "#FFF3DA"], count: 16 }, { kind: "sparkles", colors: ["#FFEFC9", "#FFFFFF"], count: 12 }]} opacity={0.8} />
            </div>
            <StickerScatter items={COVER_STICKERS} reduce={!!reduce} className="z-[2]" />
            <button
              type="button"
              onClick={start}
              aria-label={s.tapStart}
              className="absolute inset-0 z-[3] flex flex-col items-center px-[calc(6*var(--k))] pt-[calc(26*var(--k))] pb-[calc(7*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:ring-inset"
            >
              <motion.div initial={reduce ? false : { opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}>
                <Marquee text={marquee} hang />
              </motion.div>
              <motion.p
                className="mt-[calc(4*var(--k))] text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase"
                style={{ color: "#FBEAD0", textShadow: "0 calc(.3*var(--k)) calc(.8*var(--k)) rgba(30,4,6,.85)" }}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: 0.24, duration: 0.7 }}
              >
                {data.senderName} → {data.recipientName}
              </motion.p>

              <div className="flex flex-1 flex-col items-center justify-center">
                <motion.div
                  className="relative w-[calc(78*var(--k))]"
                  initial={reduce ? false : { opacity: 0, y: 34, rotate: -9 }}
                  animate={{ opacity: 1, y: 0, rotate: -4.5 }}
                  transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[calc(9*var(--k))] rounded-[50%]"
                    style={{ background: "radial-gradient(closest-side, rgba(255,214,140,.32), rgba(255,190,100,0) 72%)" }}
                  />
                  <Float reduce={!!reduce}>
                    <Ticket admit={s.admit} forLabel={s.for} name={data.recipientName} seat={s.seat} stub={age ? String(age) : s.stub} />
                  </Float>
                  <span aria-hidden="true" className="absolute -bottom-[calc(2.4*var(--k))] left-1/2 h-[calc(3.6*var(--k))] w-[74%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-[calc(2.2*var(--k))]" />
                </motion.div>
              </div>

              <TapPill tone={TONE} reduce={!!reduce}>
                {s.tapStart}
              </TapPill>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} className="top-auto bottom-[max(0.75rem,env(safe-area-inset-bottom))]" />
      <span className="hidden">{t("theEnd")}{run}</span>
    </div>
  );
}

function Curtain({ side, open, reduced }: { side: "left" | "right"; open: boolean; reduced: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className={cn("absolute inset-y-0 z-40 w-[52%]", side === "left" ? "left-0 origin-left" : "right-0 origin-right")}
      initial={false}
      animate={{ scaleX: open ? 0.12 : 1, x: open ? (side === "left" ? "-8%" : "8%") : 0 }}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 60, damping: 18, mass: 1.2, delay: 0.1 }}
      style={{
        background: "repeating-linear-gradient(90deg, var(--curtain-dark) 0 6%, var(--curtain) 6% 14%, var(--curtain-light) 14% 18%, var(--curtain) 18% 24%)",
        boxShadow: side === "left" ? "12px 0 30px rgba(0,0,0,0.6)" : "-12px 0 30px rgba(0,0,0,0.6)",
      }}
    />
  );
}

function Cake({ count, positions }: { count: number; positions: { x: number; y: number }[] }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* plate */}
      <div className="absolute left-1/2 top-[66%] h-[4%] w-[74%] -translate-x-1/2 rounded-[50%] bg-[#e9e2d6] shadow-[0_8px_30px_rgba(0,0,0,0.5)]" />
      {/* tiers */}
      <div className="absolute left-1/2 top-[56%] h-[12%] w-[62%] -translate-x-1/2 rounded-b-[18px] rounded-t-[10px] bg-[linear-gradient(180deg,#f5d3c4,#e7b3a3)] shadow-[inset_0_-10px_20px_rgba(0,0,0,0.12)]" />
      <div className="absolute left-1/2 top-[47.5%] h-[10%] w-[46%] -translate-x-1/2 rounded-b-[16px] rounded-t-[10px] bg-[linear-gradient(180deg,#fbe4d8,#eec4b4)] shadow-[inset_0_-10px_20px_rgba(0,0,0,0.12)]" />
      {/* icing drips */}
      <div className="absolute left-1/2 top-[47%] h-[3%] w-[48%] -translate-x-1/2 rounded-[10px] bg-[var(--gift-accent)] opacity-90" />
      <div className="absolute left-1/2 top-[55.6%] h-[3%] w-[64%] -translate-x-1/2 rounded-[10px] bg-[var(--gift-accent)] opacity-90" />
      {/* candles */}
      {positions.slice(0, count).map((p, i) => (
        <div key={i} className="absolute w-[3.4%] -translate-x-1/2" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, height: "6%" }}>
          <div className="h-full w-full rounded-sm bg-[repeating-linear-gradient(135deg,#fff8f0 0 3px,#f0a8b8 3px 6px)] shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_-2px_0_2px_rgba(0,0,0,0.12)]" />
          <div className="absolute -top-[6px] left-1/2 h-[6px] w-[2px] -translate-x-1/2 bg-[#333]" />
        </div>
      ))}
    </div>
  );
}

/** Paper grain for the programme card, multiplied over cream. */
const PROGRAMME_GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

function FilmPanel({ data, mode, blocks, reduce, onEvent, onReact, onMakeOne, onReplay, landscape }: { data: TemplateProps<CinemaFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void; landscape: boolean }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const [active, setActive] = useState<number | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
        endedRef.current = true;
        onEvent?.({ type: "ended" });
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent]);

  return (
    <motion.div ref={scroller} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 z-[35] overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
      <div className="pt-[max(18cqh,110px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {data.video ? (
          <div className="mx-auto mb-8 w-[min(92cqw,600px)]">
            <p className="mb-2 text-center text-[11px] tracking-[0.3em] text-paper/55 uppercase">{t("aClipForYou")}</p>
            <div className="rounded-[10px] border-[6px] border-[#1a1a1a] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
              <GiftVideo video={data.video} locale={data.locale} className="aspect-video" rounded="rounded-[4px]" />
            </div>
          </div>
        ) : null}

        {/* Film strip */}
        <div className="relative -rotate-2 bg-[#111] py-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <Sprockets />
          <div className="scrollbar-none flex snap-x gap-3 overflow-x-auto px-[calc(10*var(--u))] py-1">
            {data.photos.map((p, i) => (
              <motion.figure key={p.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 120, damping: 16 }} className={cn("shrink-0 snap-center", landscape ? "w-[calc(34*var(--u))]" : "w-[calc(62*var(--u))]")} onClick={() => setActive(i)}>
                <div className="aspect-[4/3] overflow-hidden rounded-[3px] bg-black">
                  <img src={p.url} alt={p.alt ?? ""} className="h-full w-full object-cover" draggable={false} />
                </div>
                {p.caption ? <figcaption className="mt-1.5 truncate text-center text-[11px] tracking-wide text-paper/60 uppercase">{p.caption}</figcaption> : null}
              </motion.figure>
            ))}
          </div>
          <Sprockets bottom />
        </div>

        <div className="mx-auto mt-10 flex w-[min(90cqw,560px)] flex-col gap-5">
          {/* The words, printed like the programme you're handed at a premiere. */}
          <motion.div
            className="relative rounded-[6px] px-[clamp(24px,7cqw,42px)] pt-[clamp(30px,9cqw,48px)] pb-[clamp(30px,9cqw,50px)] text-[#2A1A14] shadow-[0_1px_2px_rgba(0,0,0,0.35),0_40px_70px_-30px_rgba(0,0,0,0.9)]"
            style={{ background: "#FBF3E4", backgroundImage: PROGRAMME_GRAIN }}
            initial={reduce ? false : { opacity: 0, y: 30, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -0.4 }}
            transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-[10px] rounded-[3px] border border-[#B8893A]/60" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-[15px] rounded-[2px] border border-[#B8893A]/25" />
            <p className="relative text-center text-[11px] font-semibold tracking-[0.34em] uppercase" style={{ color: "var(--gift-accent-deep)" }}>
              ★ {data.title || data.recipientName} ★
            </p>
            <div className="relative mt-5">
              <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" onDone={() => setDone(true)} />
            </div>
          </motion.div>
          {done && data.countdown ? <div className="rounded-3xl border border-white/10 bg-black/45 p-6 backdrop-blur-xl"><Countdown countdown={data.countdown} locale={data.locale} tone="dark" /></div> : null}
          {done && data.surprise ? (
            <div className="rounded-3xl border border-white/10 bg-black/45 p-6 backdrop-blur-xl">
              <p className="mb-4 text-center text-[11px] tracking-[0.25em] text-white/50 uppercase">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="dark" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}
          {done ? <div ref={endRef} className="pt-6 pb-4"><EndScreen data={data} tone="dark" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /></div> : null}
        </div>
      </div>
      <AnimatePresence>
        {active !== null && data.photos[active] ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6" onClick={() => setActive(null)}>
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} src={data.photos[active].url} alt={data.photos[active].alt ?? ""} className="max-h-[80cqh] max-w-full rounded-lg object-contain" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function Sprockets({ bottom }: { bottom?: boolean }) {
  return (
    <div className={cn("flex justify-between px-3", bottom ? "mt-2" : "mb-2")} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="h-2.5 w-4 rounded-[2px] bg-[#333]" />
      ))}
    </div>
  );
}
