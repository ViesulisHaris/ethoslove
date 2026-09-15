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
import { Typewriter } from "../_shared/Typewriter";
import { RichMessage } from "../_shared/RichMessage";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { GiftVideo } from "../_shared/GiftVideo";
import { Ambience } from "../_shared/Ambience";
import type { CinemaFields } from "./schema";
import { Flames, type FlameState } from "./Flames";

const CURTAIN: Record<CinemaFields["curtain"], { base: string; dark: string; light: string }> = {
  crimson: { base: "#8f1d24", dark: "#5a0f14", light: "#c0323a" },
  midnight: { base: "#1d2a5a", dark: "#0f163a", light: "#33478a" },
  emerald: { base: "#1d5a3a", dark: "#0f3a24", light: "#2f8a5a" },
};

const S = {
  en: { now: "Now showing", turns: "turns", blowMic: "Blow into your phone", blowSwipe: "Swipe up to blow", allowMic: "Use microphone", orSwipe: "or swipe up", wish: "Make a wish", happy: "Happy birthday,", roll: "Roll the film", tapStart: "Tap to start the show" },
  es: { now: "Hoy", turns: "cumple", blowMic: "Sopla al teléfono", blowSwipe: "Desliza hacia arriba para soplar", allowMic: "Usar el micrófono", orSwipe: "o desliza hacia arriba", wish: "Pide un deseo", happy: "¡Feliz cumpleaños,", roll: "Que ruede la película", tapStart: "Toca para empezar la función" },
};

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
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-[#0d0a0a] text-paper select-none" style={{ ...vars, fontFamily: "var(--gift-font-body)" }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {/* Stage floor + spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_62%,rgba(255,200,120,0.14),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,transparent,rgba(60,30,20,0.65))]" />

      {/* Marquee */}
      <div className={cn("absolute inset-x-0 top-[13%] z-30 flex justify-center px-6 transition-opacity duration-700", (stage === "film" || stage === "message") && "opacity-0")}>
        <Marquee text={marquee} reduced={!!reduce} />
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

      {stage === "curtains" ? (
        <button type="button" onClick={start} className="absolute inset-0 z-50 flex items-end justify-center pb-[max(4rem,calc(env(safe-area-inset-bottom)+3.5rem))]" aria-label={s.tapStart}>
          <motion.span animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} className="rounded-full bg-black/40 px-5 py-2.5 text-[13px] tracking-[0.2em] uppercase backdrop-blur">
            {s.tapStart}
          </motion.span>
        </button>
      ) : null}

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

function Marquee({ text, reduced }: { text: string; reduced: boolean }) {
  const bulbs = 18;
  return (
    <div className="relative rounded-2xl border-4 border-[#3b2a1a] bg-[#f6e7c6] px-6 py-3 text-center shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_0_0_2px_#d9c39a]">
      <p className="max-w-[calc(70*var(--u))] truncate font-display text-[clamp(0.95rem,4.2cqw,1.25rem)] font-semibold tracking-[0.08em] text-[#3b2a1a] uppercase" style={{ fontFamily: "var(--gift-font-display)" }}>
        {text}
      </p>
      {Array.from({ length: bulbs }, (_, i) => {
        const perSide = bulbs / 2;
        const top = i < perSide;
        const frac = ((i % perSide) + 0.5) / perSide;
        return (
          <span
            key={i}
            className={cn("absolute size-2 rounded-full bg-[#ffd98a] shadow-[0_0_8px_2px_rgba(255,200,100,0.8)]", !reduced && "animate-[marquee-chase_1s_steps(2)_infinite]")}
            style={{ left: `calc(${frac * 100}% - 4px)`, [top ? "top" : "bottom"]: -7, animationDelay: `${(i % 2) * 0.5}s` }}
          />
        );
      })}
      <style>{`@keyframes marquee-chase{0%{opacity:1}50%{opacity:.25}100%{opacity:1}}`}</style>
    </div>
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
          <div className="rounded-3xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl sm:p-8">
            <p className="text-[11px] tracking-[0.3em] text-paper/50 uppercase">{data.title || data.recipientName}</p>
            <h2 className="mt-2 text-[clamp(1.6rem,7cqw,2rem)] leading-tight italic" style={{ fontFamily: "var(--gift-font-display)" }}>{t("dear", { name: data.recipientName })}</h2>
            <div className="mt-5 text-[clamp(1rem,4.4cqw,1.1rem)] leading-relaxed text-white/90 [&_em]:text-[var(--gift-accent-soft)] [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-white">
              {instant ? <RichMessage blocks={blocks} stagger={mode === "preview" ? 0 : 0.5} onDone={() => setDone(true)} /> : <Typewriter blocks={blocks} active speed={38} onDone={() => setDone(true)} />}
            </div>
            {done ? <p className="mt-6 text-right text-[1.5rem] italic" style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent)" }}>— {data.senderName}</p> : null}
          </div>
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
