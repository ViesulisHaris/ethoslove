"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FastForward } from "lucide-react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { useCountdown } from "../_shared/hooks/use-countdown";
import { RichMessage } from "../_shared/RichMessage";
import { Typewriter } from "../_shared/Typewriter";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import type { MidnightFields } from "./schema";
import { Fireworks } from "./Fireworks";
import { Banner, BulbString, MarqueeSign, MIDNIGHT_KEYFRAMES, Rooftop } from "./art";

const S = {
  en: { until: "Until midnight", happy: "Happy birthday, {name}.", tap: "tap to start", skip: "Skip to midnight", days: "d", hours: "h", minutes: "m", seconds: "s", open: "Open your gift" },
  es: { until: "Hasta medianoche", happy: "Feliz cumpleaños, {name}.", tap: "toca para empezar", skip: "Saltar a medianoche", days: "d", hours: "h", minutes: "m", seconds: "s", open: "Abrir tu regalo" },
};

/** The sky is the page here, so the tone only dresses the pill: solid and light on a night scene. */
const TONE: CoverTone = { page: "#0B0F2A", glow: ["rgba(255,214,150,.35)", "rgba(120,110,220,.3)"], accent: "#2B2140" };

/** Pressed around the very edges, so they frame the rooftop instead of floating in the sky. */
const STICKERS: StickerPlacement[] = [
  { id: "star", x: 6, y: 20, size: 9, rotate: -12 },
  { id: "sparkle", x: 94, y: 17, size: 7 },
  { id: "heart", x: 5, y: 44, size: 8, rotate: 10 },
  { id: "star", x: 95, y: 47, size: 7, rotate: 14 },
  { id: "sparkle", x: 8, y: 70, size: 6 },
  { id: "sparkle", x: 92, y: 72, size: 6 },
];

const AMBIENCE: { kind: AmbienceKind; colors: string[]; count?: number }[] = [
  { kind: "embers", colors: ["#FFD9A0", "#F2C879"], count: 10 },
];

/**
 * Sky phase 0 (dusk) → 1 (deep night) from how close we are; last 60 s go full night. The floor
 * sits high because the cover is a rooftop at night: dusk only ever tints the horizon.
 */
function skyPhase(totalMs: number): number {
  if (totalMs <= 0) return 1;
  const hours = totalMs / 3600000;
  if (hours > 6) return 0.55;
  return Math.min(1, 0.55 + (1 - hours / 6) * 0.45);
}

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<MidnightFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fw = useRef<Fireworks | null>(null);
  const size = useContainerSize(rootRef);
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const targetAt = data.countdown?.targetAt;
  const parts = useCountdown(targetAt);
  const [started, setStarted] = useState(mode === "preview");
  const [forced, setForced] = useState(mode === "preview");
  const [gift, setGift] = useState(mode === "preview");
  const [burst, setBurst] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const zero = forced || parts.done || !targetAt;
  const phase = zero ? 1 : skyPhase(parts.totalMs);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.ready) return;
    if (!fw.current) fw.current = new Fireworks(canvas);
    fw.current.resize(size.width, size.height);
    fw.current.colors = [data.accentColor, "#FFF8F4", "#E8604C", "#F4C7C3", "#9ad0ff"];
    fw.current.reduced = !!reduce;
    return () => fw.current?.stop();
  }, [size.ready, size.width, size.height, data.accentColor, reduce]);

  useEffect(() => {
    const engine = fw.current;
    if (!engine) return;
    if (zero && started) {
      engine.intensity = 1;
      engine.start();
      onEvent?.({ type: "progress", pct: 40 });
      // The confetti waits for the moment: one burst as the clock lands on midnight, fired from a
      // timer so the state lands after this effect instead of cascading inside it.
      const pop = window.setTimeout(() => setBurst((b) => b + 1), 0);
      const id = window.setTimeout(() => setGift(true), reduce ? 800 : 5200);
      return () => {
        window.clearTimeout(pop);
        window.clearTimeout(id);
      };
    }
    engine.stop();
  }, [zero, started, onEvent, reduce]);

  useEffect(() => {
    if (gift && fw.current) fw.current.intensity = 0.35;
  }, [gift]);

  const start = () => {
    setStarted(true);
    void audio.start();
    onEvent?.({ type: "started" });
  };

  const skyline = data.fields.skyline;
  const headline = data.fields.headline || data.countdown?.label || s.until;
  const zeroLine = data.fields.zeroLine || s.happy.replace("{name}", data.recipientName);

  /** What the sign shows: the line, then either the running clock or midnight itself. */
  const signBody = (
    <>
      <p className="text-[calc(3.4*var(--k))] leading-snug text-balance text-[#FFE9C4]/85 italic" style={{ fontFamily: "var(--gift-font-display)" }}>
        {zero ? zeroLine : headline}
      </p>
      {!zero ? (
        <div className="mt-[calc(2.6*var(--k))] flex items-end justify-center gap-[calc(2.4*var(--k))] tabular-nums" style={{ fontFamily: "var(--gift-font-display)" }}>
          {(
            [
              [parts.days, s.days],
              [parts.hours, s.hours],
              [parts.minutes, s.minutes],
              [parts.seconds, s.seconds],
            ] as [number, string][]
          ).map(([v, u], i) => (
            <div key={u} className="flex items-baseline">
              <span
                className={cn("text-[calc(9.5*var(--k))] leading-none", i === 0 && parts.days === 0 ? "hidden" : "")}
                style={{ color: "#FFE9C4", textShadow: "0 0 calc(2.6*var(--k)) rgba(255,190,110,.55)" }}
              >
                {String(v).padStart(2, "0")}
              </span>
              <span className={cn("ml-[calc(.7*var(--k))] text-[calc(2.6*var(--k))] text-[#FFE9C4]/55", i === 0 && parts.days === 0 ? "hidden" : "")}>{u}</span>
            </div>
          ))}
        </div>
      ) : null}
      {zero && started ? (
        <motion.p
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
          className="mt-[calc(2.6*var(--k))] text-[calc(14*var(--k))] leading-none"
          style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent)", textShadow: "0 0 calc(4*var(--k)) rgba(255,190,110,.5)" }}
        >
          00:00
        </motion.p>
      ) : null}
    </>
  );

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden text-paper select-none" style={{ ...COVER_VARS, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {/* Sky */}
      <div className="absolute inset-0 transition-[opacity] duration-[3000ms]" style={{ background: "linear-gradient(180deg,#0b0f2a 0%,#3b2f5f 45%,#c9683f 78%,#f2b26b 100%)" }} />
      <div className="absolute inset-0 transition-opacity duration-[4000ms] ease-linear" style={{ background: "linear-gradient(180deg,#02030c 0%,#0a0f2c 55%,#1a1f45 100%)", opacity: phase }} />
      <Stars phase={phase} reduced={!!reduce} />
      <div className="absolute right-[10%] top-[36%]" style={{ opacity: 0.35 + phase * 0.65 }}>
        <div className="size-[calc(14*var(--u))] max-w-[90px] rounded-full bg-[#f6efd8] shadow-[0_0_60px_20px_rgba(246,239,216,0.22)]" style={{ transform: `translateY(${(1 - phase) * 60}px)` }} />
      </div>
      <Skyline kind={skyline} />
      <style>{MIDNIGHT_KEYFRAMES}</style>
      {/* the rooftop itself: bulbs overhead, the rail and the glasses someone left standing */}
      <motion.div className="absolute inset-0 z-[5]" animate={{ opacity: gift ? 0 : 1 }} transition={{ duration: 0.6 }} aria-hidden="true">
        <BulbString />
        <Rooftop />
      </motion.div>
      <StickerScatter items={STICKERS} reduce={!!reduce} className="z-[4]" />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={AMBIENCE} opacity={0.8} />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      <Confetti burst={burst} colors={[data.accentColor, "#FFF3D6", "#F2C879", "#E8604C"]} origin={{ x: 0.5, y: 0.35 }} count={110} />

      {/* Countdown */}
      <AnimatePresence>
        {!gift ? (
          <motion.div key="clock" exit={{ opacity: 0, y: -20, transition: { duration: 0.6 } }} className="absolute inset-x-0 top-[13%] z-20 flex flex-col items-center px-[calc(5*var(--k))] text-center">
            <Banner name={data.recipientName} />
            <p className="mt-[calc(3.4*var(--k))] text-[calc(2.4*var(--k))] tracking-[0.34em] text-paper/55 uppercase">
              {data.senderName} → {data.recipientName}
            </p>
            <div className="mt-[calc(3.4*var(--k))] w-[calc(84*var(--k))] max-w-full">
              {!started ? (
                <button
                  type="button"
                  onClick={start}
                  aria-label={s.tap}
                  className="block w-full rounded-[calc(4*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                >
                  <MarqueeSign>{signBody}</MarqueeSign>
                </button>
              ) : (
                <MarqueeSign>{signBody}</MarqueeSign>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Controls */}
      {!started ? (
        <div
          className="absolute inset-x-0 z-30 flex justify-center"
          style={{ bottom: "max(calc(7*var(--k)), calc(env(safe-area-inset-bottom) + 3*var(--k)))" }}
        >
          <TapPill tone={TONE} reduce={!!reduce}>
            {s.tap}
          </TapPill>
        </div>
      ) : null}
      {started && !zero && mode === "demo" ? (
        <button type="button" onClick={() => setForced(true)} className="absolute inset-x-0 bottom-[max(3rem,calc(env(safe-area-inset-bottom)+2.5rem))] z-30 mx-auto flex h-10 w-fit items-center gap-2 rounded-full bg-black/35 px-4 text-xs text-paper/80 backdrop-blur">
          <FastForward className="size-3.5" />
          {s.skip}
        </button>
      ) : null}

      {/* Gift panel */}
      <AnimatePresence>
        {gift ? (
          <motion.div key="gift" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 80, damping: 20 }} className="absolute inset-0 z-40 overflow-y-auto scrollbar-none">
            <GiftPanel data={data} mode={mode} blocks={blocks} reduce={!!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : () => { setGift(false); setForced(false); setStarted(false); }} zeroLine={zeroLine} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

function Stars({ phase, reduced }: { phase: number; reduced: boolean }) {
  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: (i * 37) % 100, y: ((i * 53) % 60) + 2, s: 1 + (i % 3), d: (i % 5) * 0.6 })), []);
  return (
    <div className="absolute inset-0" style={{ opacity: Math.max(0, phase - 0.2) / 0.8 }} aria-hidden="true">
      {stars.map((st, i) => (
        <span key={i} className={cn("absolute rounded-full bg-white", !reduced && "animate-[twinkle_3s_ease-in-out_infinite]")} style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />
      ))}
      <style>{`@keyframes twinkle{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
    </div>
  );
}

function Skyline({ kind }: { kind: MidnightFields["skyline"] }) {
  const path =
    kind === "sea"
      ? "M0 70 Q 10 66 20 70 T 40 70 T 60 70 T 80 70 T 100 70 V100 H0 Z"
      : kind === "mountains"
        ? "M0 78 L 12 58 L 22 70 L 34 48 L 46 66 L 58 52 L 70 68 L 82 56 L 92 66 L 100 60 V100 H0 Z"
        : "M0 100 V72 H6 V60 H10 V72 H16 V50 H22 V72 H26 V64 H32 V44 H36 V52 H40 V72 H46 V58 H52 V72 H56 V38 H60 V72 H66 V56 H72 V72 H78 V62 H84 V72 H90 V48 H94 V72 H100 V100 Z";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[34%] w-full" aria-hidden="true">
      <path d={path} fill="#050611" />
      {kind === "city" ? Array.from({ length: 26 }, (_, i) => <rect key={i} x={((i * 17) % 96) + 2} y={54 + ((i * 11) % 30)} width={1.2} height={1.6} fill="#f2c879" opacity={0.7} />) : null}
    </svg>
  );
}

function GiftPanel({ data, mode, blocks, reduce, onEvent, onReact, onMakeOne, onReplay, zeroLine }: { data: TemplateProps<MidnightFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void; zeroLine: string }) {
  const t = useGiftStrings(data.locale);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const [active, setActive] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % Math.max(1, data.photos.length)), 4200);
    return () => clearInterval(id);
  }, [data.photos.length]);
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
  const photo = data.photos[active];
  return (
    <div className="mx-auto flex w-[min(92cqw,560px)] flex-col gap-5 pt-[max(10cqh,56px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <p className="text-center text-[clamp(1.6rem,7.5cqw,2.2rem)] italic" style={{ fontFamily: "var(--gift-font-display)" }}>{zeroLine}</p>
      {photo ? (
        <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-2xl">
          <AnimatePresence mode="sync">
            <motion.img key={photo.id} src={photo.url} alt={photo.alt ?? ""} initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: reduce ? 1.08 : 1.18 }} exit={{ opacity: 0 }} transition={{ opacity: { duration: 1 }, scale: { duration: 4.6, ease: "linear" } }} className="absolute inset-0 h-full w-full object-cover" />
          </AnimatePresence>
          {photo.caption ? <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-center text-sm italic" style={{ fontFamily: "var(--gift-font-display)" }}>{photo.caption}</p> : null}
          <div className="absolute top-3 right-3 flex gap-1">
            {data.photos.map((p, i) => (
              <span key={p.id} className="h-1 rounded-full bg-white/80 transition-all" style={{ width: i === active ? 16 : 5, opacity: i === active ? 1 : 0.5 }} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="rounded-3xl border border-white/10 bg-black/45 p-6 backdrop-blur-xl sm:p-8">
        <h2 className="text-[clamp(1.5rem,6.5cqw,1.9rem)] leading-tight italic" style={{ fontFamily: "var(--gift-font-display)" }}>{t("dear", { name: data.recipientName })}</h2>
        <div className="mt-4 text-[clamp(1rem,4.4cqw,1.1rem)] leading-relaxed text-white/90 [&_em]:text-[var(--gift-accent-soft)] [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-white">
          {instant ? <RichMessage blocks={blocks} stagger={mode === "preview" ? 0 : 0.5} onDone={() => setDone(true)} /> : <Typewriter blocks={blocks} active speed={38} onDone={() => setDone(true)} />}
        </div>
        {done ? <p className="mt-6 text-right text-[1.5rem] italic" style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent)" }}>— {data.senderName}</p> : null}
      </div>
      {done && data.surprise ? (
        <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
          <p className="mb-4 text-center text-[11px] tracking-[0.25em] text-white/50 uppercase">{t("ps")}</p>
          <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="dark" onReveal={() => onEvent?.({ type: "surprise" })} />
        </div>
      ) : null}
      {done ? <div ref={endRef} className="pt-6 pb-4"><EndScreen data={data} tone="dark" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /></div> : null}
    </div>
  );
}
