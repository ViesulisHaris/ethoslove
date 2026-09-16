"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { RichMessage } from "../_shared/RichMessage";
import { Typewriter } from "../_shared/Typewriter";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { GiftVideo } from "../_shared/GiftVideo";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, CoverPage, Float, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { Garland, TIMELINE_KEYFRAMES, TitleCard } from "./art";
import type { TimelineFields } from "./schema";

const S = {
  en: { begin: "scroll to begin", for: "for", ending: "…and it's only the beginning.", chapter: "Chapter" },
  es: { begin: "desliza para empezar", for: "para", ending: "…y esto solo es el principio.", chapter: "Capítulo" },
};

const ROAD: Record<TimelineFields["road"], { stroke: string; width: number; dash?: string; bg: string; ink: string; paper: string }> = {
  asphalt: { stroke: "#2b2b2f", width: 26, dash: undefined, bg: "#e9e4dc", ink: "#1A1614", paper: "#fbfaf6" },
  chalk: { stroke: "rgba(255,255,255,0.85)", width: 5, dash: "14 12", bg: "#1f2a2f", ink: "#f4efe7", paper: "#28353b" },
  ink: { stroke: "var(--gift-accent)", width: 4, dash: undefined, bg: "#f6f1e8", ink: "#1A1614", paper: "#ffffff" },
};

type Look = {
  tone: CoverTone;
  pattern: string;
  /** The title card, the polaroid frames and the tag pinned to the card. */
  card: string;
  cardInk: string;
  rule: string;
  polaroid: string;
  tagPaper: string;
  tagInk: string;
  /** The garland: its string, the clothespins and their springs. */
  line: string;
  peg: string;
  metal: string;
  pin: string;
  stickers: StickerPlacement[];
  ambience: { kind: AmbienceKind; colors: string[]; count?: number }[];
};

/**
 * One page per road style, each keeping that style's own paper colour so the cover and the
 * road below it are the same sheet, only lit.
 */
const LOOKS: Record<TimelineFields["road"], Look> = {
  ink: {
    tone: { page: "#f6f1e8", glow: ["rgba(255,248,228,.95)", "rgba(205,180,146,.45)"], accent: "#2E4A62" },
    pattern: "repeating-linear-gradient(0deg, rgba(120,100,70,.07) 0 calc(.25*var(--k)), transparent calc(.25*var(--k)) calc(7*var(--k)))",
    card: "#FFFCF4",
    cardInk: "#22201C",
    rule: "rgba(60,50,35,.28)",
    polaroid: "#FFFDF8",
    tagPaper: "#FFF7EC",
    tagInk: "#3B2A22",
    line: "#9C7248",
    peg: "#D9B88A",
    metal: "#C9CBC6",
    pin: "#B4432F",
    stickers: [
      { id: "sparkle", x: 12, y: 13, size: 8 },
      { id: "butterfly", x: 86, y: 12, size: 15, rotate: 12 },
      { id: "daisy", x: 7, y: 58, size: 12 },
      { id: "sparkle", x: 93, y: 55, size: 7 },
      { id: "heart", x: 14, y: 87, size: 12, rotate: -10 },
      { id: "leaf", x: 86, y: 88, size: 13, rotate: 18 },
    ],
    ambience: [
      { kind: "dust", colors: ["#FFE7B8", "#FFFFFF"], count: 14 },
      { kind: "sparkles", colors: ["#FFFFFF", "#F0D6A4"], count: 10 },
    ],
  },
  asphalt: {
    tone: { page: "#e9e4dc", glow: ["rgba(255,252,244,.9)", "rgba(150,142,128,.4)"], accent: "#33333A" },
    pattern: "radial-gradient(rgba(120,115,105,.16) calc(.55*var(--k)), transparent calc(.7*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))",
    card: "#FBF8F2",
    cardInk: "#1A1614",
    rule: "rgba(40,40,45,.3)",
    polaroid: "#FFFFFF",
    tagPaper: "#F1EADC",
    tagInk: "#2B2926",
    line: "#6E6A62",
    peg: "#C9C3B6",
    metal: "#AFB2AE",
    pin: "#B0392E",
    stickers: [
      { id: "sparkle", x: 12, y: 13, size: 8 },
      { id: "cloud", x: 86, y: 12, size: 18 },
      { id: "squiggle", x: 7, y: 57, size: 10 },
      { id: "sparkle", x: 93, y: 55, size: 7 },
      { id: "heart", x: 14, y: 87, size: 12, rotate: -10 },
      { id: "star", x: 86, y: 88, size: 12, rotate: 14 },
    ],
    ambience: [{ kind: "dust", colors: ["#FFF4DC", "#FFFFFF"], count: 14 }],
  },
  chalk: {
    tone: { page: "#1f2a2f", glow: ["rgba(126,170,180,.34)", "rgba(40,70,82,.6)"], accent: "#F4EFE7", dark: true },
    pattern: "repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 calc(1.2*var(--k)), transparent calc(1.2*var(--k)) calc(5*var(--k)))",
    card: "#28353B",
    cardInk: "#F4EFE7",
    rule: "rgba(244,239,231,.45)",
    polaroid: "#F7F3EA",
    tagPaper: "#38474E",
    tagInk: "#F4EFE7",
    line: "#C9D6D8",
    peg: "#8FA3A8",
    metal: "#6E7F85",
    pin: "#E0A15C",
    stickers: [
      { id: "star", x: 12, y: 13, size: 11, rotate: -10 },
      { id: "moon", x: 87, y: 12, size: 16 },
      { id: "sparkle", x: 7, y: 57, size: 8 },
      { id: "star", x: 93, y: 54, size: 8, rotate: 14 },
      { id: "cloud", x: 15, y: 88, size: 20 },
      { id: "sparkle", x: 87, y: 88, size: 9 },
    ],
    ambience: [
      { kind: "sparkles", colors: ["#FFFFFF", "#CFE3E6"], count: 14 },
      { kind: "dust", colors: ["#DCEAEC"], count: 10 },
    ],
  },
};

/** The years the sender already typed into the milestone dates, as "2022 → 2025". */
function yearRange(dates: string[]): string | null {
  const years = dates.flatMap((d) => d.match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number);
  if (!years.length) return null;
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  return lo === hi ? String(lo) : `${lo} → ${hi}`;
}

/** Winding road through N milestones, in real pixels so the stroke stays uniform. */
function roadPath(n: number, w: number, h: number): string {
  const cx = w / 2;
  let d = `M ${cx} ${-h * 0.1}`;
  for (let i = 0; i < n + 1; i++) {
    const y0 = i * h;
    const x = i % 2 === 0 ? w * 0.22 : w * 0.78;
    d += ` C ${cx} ${y0 + h * 0.25}, ${x} ${y0 + h * 0.35}, ${x} ${y0 + h * 0.5} S ${cx} ${y0 + h * 0.85}, ${cx} ${y0 + h}`;
  }
  return d;
}

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<TimelineFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const scroller = useRef<HTMLDivElement>(null);
  const roadRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(mode === "preview");
  const photos = data.photos;
  const n = photos.length;
  const road = ROAD[data.fields.road] ?? ROAD.ink;
  const look = LOOKS[data.fields.road] ?? LOOKS.ink;
  const dates = useMemo(() => data.fields.dates ?? [], [data.fields.dates]);
  const years = useMemo(() => yearRange(dates), [dates]);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const path = useMemo(() => roadPath(n, size.width || 390, size.height || 844), [n, size.width, size.height]);

  const { scrollYProgress } = useScroll({ container: scroller, target: roadRef, offset: ["start 60%", "end 60%"] });
  const drawn = useSpring(scrollYProgress, { stiffness: 80, damping: 20, mass: 0.5 });
  const lastPct = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const pct = Math.round(v * 8) * 10;
    if (pct > lastPct.current) {
      lastPct.current = pct;
      onEvent?.({ type: "progress", pct: Math.min(80, pct) });
    }
  });

  const begin = () => {
    if (started) return;
    setStarted(true);
    void audio.start();
    onEvent?.({ type: "started" });
    scroller.current?.scrollBy({ top: scroller.current.clientHeight * 0.9, behavior: "smooth" });
  };

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, background: road.bg, color: road.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{TIMELINE_KEYFRAMES}</style>
      <div className="grain-overlay" />
      <div ref={scroller} className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
        {/* Cover: a garland of pegged polaroids over the title card, on the road's own paper. */}
        <section className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center">
          <CoverPage tone={look.tone} pattern={look.pattern} />
          <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
            <Ambience layers={look.ambience} opacity={0.85} />
          </div>
          <StickerScatter items={look.stickers} reduce={!!reduce} className="z-[3]" />

          <div className="relative z-10 flex w-[calc(112*var(--k))] max-w-full flex-col items-center">
            <motion.div
              className="w-full"
              initial={reduce ? false : { opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.1 }}
            >
              <Garland photos={photos} polaroid={look.polaroid} line={look.line} peg={look.peg} metal={look.metal} />
            </motion.div>

            <motion.p
              className="mt-[calc(5*var(--k))] text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 0.55, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              {data.senderName} → {data.recipientName}
            </motion.p>

            <motion.div
              className="relative mt-[calc(2.4*var(--k))] w-[calc(72*var(--k))] max-w-full"
              initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: -1.2 }}
              transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.24 }}
            >
              <Float reduce={!!reduce} amount={0.8} duration={6}>
                <div className="relative">
                  <TitleCard
                    title={data.title || data.recipientName}
                    years={years}
                    name={data.recipientName}
                    forLabel={s.for}
                    paper={look.card}
                    ink={look.cardInk}
                    rule={look.rule}
                    tagPaper={look.tagPaper}
                    tagInk={look.tagInk}
                    pin={look.pin}
                  />
                  <button type="button" onClick={begin} aria-label={s.begin} className="absolute inset-0 z-[2] outline-none focus-visible:ring-4 focus-visible:ring-white/70" />
                </div>
              </Float>
              <span
                aria-hidden="true"
                className="absolute -bottom-[calc(2.4*var(--k))] left-1/2 h-[calc(4*var(--k))] w-[72%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-[calc(2.2*var(--k))]"
              />
            </motion.div>

            <TapPill tone={look.tone} reduce={!!reduce} className="mt-[calc(19*var(--k))]">
              {s.begin}
            </TapPill>
          </div>
        </section>

        {/* Road + milestones */}
        <div ref={roadRef} className="relative" style={{ height: `${n * 100}cqh` }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.width || 390} ${n * (size.height || 844)}`} preserveAspectRatio="none" aria-hidden="true">
            <motion.path data-road="" d={path} fill="none" strokeWidth={road.width} strokeLinecap="round" strokeDasharray={road.dash} style={{ pathLength: reduce ? 1 : drawn, stroke: road.stroke }} />
          </svg>
          {photos.map((photo, i) => (
            <Milestone key={photo.id} photo={photo} index={i} date={data.fields.dates[i]} left={i % 2 === 0} scroller={scroller} paper={road.paper} chapter={s.chapter} reduce={!!reduce} progress={drawn} n={n} />
          ))}
        </div>

        {/* Ending */}
        <EndingSection data={data} mode={mode} blocks={blocks} reduce={!!reduce} ending={data.fields.ending || s.ending} paper={road.paper} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : () => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })} />
      </div>
      <SoundToggle audio={audio} locale={data.locale} className={cn(data.fields.road !== "chalk" && "bg-black/15 text-current")} />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

function Milestone({ photo, index, date, left, scroller, paper, chapter, reduce, progress, n }: { photo: GiftPhoto; index: number; date?: string; left: boolean; scroller: React.RefObject<HTMLDivElement | null>; paper: string; chapter: string; reduce: boolean; progress: MotionValue<number>; n: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scroller, target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [60, -60]);
  const yBack = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [30, -30]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.92]);
  // The card lights up once the road has reached it.
  const reached = useTransform(progress, (p) => (p * n >= index + 0.45 ? 1 : 0.35));
  return (
    <div ref={ref} className="relative flex h-[100cqh] items-center" style={{ justifyContent: left ? "flex-start" : "flex-end", padding: "0 calc(7*var(--u))" }}>
      <motion.div style={{ y: yBack, opacity: reached }} className={cn("absolute text-[clamp(4.5rem,26cqw,8rem)] leading-none italic opacity-[0.07]", left ? "right-[6%]" : "left-[6%]")} aria-hidden="true">
        <span style={{ fontFamily: "var(--gift-font-display)" }}>{String(index + 1).padStart(2, "0")}</span>
      </motion.div>
      <motion.figure style={{ y, scale, opacity: reached }} className="relative w-[min(72cqw,340px)] rounded-[18px] p-3 pb-4 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.45)]" data-testid="milestone">
        <div className="absolute inset-0 rounded-[18px]" style={{ background: paper }} />
        <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] bg-black/10">
          <img src={photo.url} alt={photo.alt ?? ""} className="h-full w-full object-cover" draggable={false} loading="lazy" />
        </div>
        <figcaption className="relative mt-3 px-1">
          <p className="text-[11px] tracking-[0.22em] uppercase opacity-60">{date || `${chapter} ${index + 1}`}</p>
          {photo.caption ? <p className="mt-1 text-[clamp(1.05rem,4.6cqw,1.25rem)] leading-snug italic" style={{ fontFamily: "var(--gift-font-display)" }}>{photo.caption}</p> : null}
        </figcaption>
        <span className={cn("absolute top-1/2 size-3 -translate-y-1/2 rounded-full ring-4", left ? "-right-1.5" : "-left-1.5")} style={{ background: "var(--gift-accent)", boxShadow: `0 0 0 4px ${paper}` }} />
      </motion.figure>
    </div>
  );
}

function EndingSection({ data, mode, blocks, reduce, ending, paper, onEvent, onReact, onMakeOne, onReplay }: { data: TemplateProps<TimelineFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; reduce: boolean; ending: string; paper: string; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const [inView, setInView] = useState(mode === "preview");
  const ref = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setInView(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
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
    <section ref={ref} className="relative flex min-h-full flex-col items-center px-6 pt-[14cqh] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9 }} className="max-w-sm text-center text-[clamp(1.7rem,8cqw,2.4rem)] leading-tight italic" style={{ fontFamily: "var(--gift-font-display)" }}>
        {ending}
      </motion.p>
      {data.video ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.2 }} className="mt-8 w-full max-w-md rounded-2xl p-3 shadow-soft" style={{ background: paper }}>
          <GiftVideo video={data.video} locale={data.locale} className="aspect-video" rounded="rounded-xl" />
        </motion.div>
      ) : null}
      {data.countdown ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.3 }} className="mt-8 w-full max-w-sm rounded-2xl p-5 shadow-soft" style={{ background: paper }}>
          <Countdown countdown={data.countdown} locale={data.locale} tone={data.fields.road === "chalk" ? "dark" : "light"} />
        </motion.div>
      ) : null}
      <div className="mt-8 w-full max-w-md rounded-2xl p-6 shadow-soft" style={{ background: paper }}>
        <h2 className="text-[clamp(1.4rem,6.5cqw,1.8rem)] italic" style={{ fontFamily: "var(--gift-font-display)" }}>{t("dear", { name: data.recipientName })}</h2>
        <div className="mt-3 text-[clamp(1rem,4.4cqw,1.1rem)] leading-relaxed opacity-90 [&_p+p]:mt-4 [&_strong]:font-semibold [&_em]:text-[var(--gift-accent)]">
          {inView ? (instant ? <RichMessage blocks={blocks} stagger={mode === "preview" ? 0 : 0.5} onDone={() => setDone(true)} /> : <Typewriter blocks={blocks} active speed={36} onDone={() => setDone(true)} />) : null}
        </div>
        {done ? <p className="mt-5 text-right text-xl italic" style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent)" }}>— {data.senderName}</p> : null}
      </div>
      {done && data.surprise ? (
        <div className="mt-5 w-full max-w-md rounded-2xl p-6 shadow-soft" style={{ background: paper }}>
          <p className="mb-3 text-center text-[11px] tracking-[0.25em] uppercase opacity-50">{t("ps")}</p>
          <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={data.fields.road === "chalk" ? "dark" : "light"} onReveal={() => onEvent?.({ type: "surprise" })} />
        </div>
      ) : null}
      {done ? <div ref={endRef} className="mt-8 w-full max-w-md"><EndScreen data={data} tone={data.fields.road === "chalk" ? "dark" : "light"} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /></div> : null}
    </section>
  );
}
