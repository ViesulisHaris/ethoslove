"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { RichMessage } from "../_shared/RichMessage";
import { Typewriter } from "../_shared/Typewriter";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { hashString } from "../_shared/random";
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import type { ScratchFields } from "./schema";
import { ScratchSurface } from "./ScratchSurface";
import { Coin, Ticket } from "./art";

const S = {
  en: { scratch: "Scratch here", next: "Next card", last: "The last one", cardOf: "Card {i} of {n}", tapStart: "Tap to begin", done: "Keep scratching", pill: "scratch here", for: "for", ticket: "scratch card", prize: "one real story, in five" },
  es: { scratch: "Rasca aquí", next: "Siguiente tarjeta", last: "La última", cardOf: "Tarjeta {i} de {n}", tapStart: "Toca para empezar", done: "Sigue rascando", pill: "rasca aquí", for: "para", ticket: "tarjeta rasca", prize: "una historia de verdad, en cinco" },
};

/** The counter the ticket was left on: warm paper, gold light, a shimmer off the foil. */
const TONE: CoverTone = { page: "#EBD5B4", glow: ["rgba(255,248,230,.95)", "rgba(216,152,102,.55)"], accent: "#9A5C2A" };
const PATTERN = "radial-gradient(rgba(255,255,255,.5) calc(.8*var(--k)), transparent calc(.9*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))";

const STICKERS: StickerPlacement[] = [
  { id: "star", x: 12, y: 13, size: 13, rotate: -12 },
  { id: "sparkle", x: 88, y: 16, size: 8 },
  { id: "heart", x: 9, y: 52, size: 12, rotate: -8 },
  { id: "sparkle", x: 92, y: 55, size: 7 },
  { id: "cherries", x: 15, y: 85, size: 14, rotate: -10 },
  { id: "star", x: 87, y: 86, size: 11, rotate: 14 },
];

const AMBIENCE: { kind: AmbienceKind; colors: string[]; count?: number }[] = [
  { kind: "sparkles", colors: ["#FFFFFF", "#FFE2A8"], count: 16 },
  { kind: "bokeh", colors: ["#FFD9A8", "#FFF1D6"], count: 6 },
];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ScratchFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const photos = data.photos.slice(0, 12);
  const total = photos.length + 1;
  const [index, setIndex] = useState(() => (mode === "preview" ? total - 1 : 0));
  const [revealed, setRevealed] = useState<boolean[]>(() => Array.from({ length: total }, (_, i) => mode === "preview" && i === total - 1));
  const [started, setStarted] = useState(mode === "preview");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const isFinal = index === total - 1;
  const label = data.fields.foilText || s.scratch;

  const start = () => {
    setStarted(true);
    void audio.start();
    onEvent?.({ type: "started" });
  };

  const onCleared = () => {
    setRevealed((r) => r.map((v, i) => (i === index ? true : v)));
    setBurst((b) => b + 1);
    onEvent?.({ type: "progress", pct: Math.round(((index + 1) / total) * 80) });
  };

  const next = () => setIndex((i) => Math.min(total - 1, i + 1));
  const replay = () => {
    setRevealed(Array(total).fill(false));
    setIndex(0);
    setRun((r) => r + 1);
  };

  const finalTitle = data.fields.finalTitle;

  // Before the first scratch, the whole screen is the ticket someone left on the counter.
  if (!started) return <ScratchCover data={data} s={s} foilLabel={label} reduce={!!reduce} audio={audio} onStart={start} />;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#141110] text-paper select-none" style={{ fontFamily: "var(--gift-font-body)" }}>
      <div className="grain-overlay opacity-[0.07]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_100%,rgba(var(--gift-accent-rgb),0.2),transparent_70%)]" />

      <div className="absolute inset-x-0 top-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))] z-20 flex items-center justify-between px-6 text-[11px] tracking-[0.25em] text-paper/55 uppercase">
        <span>{data.senderName} → {data.recipientName}</span>
        <span>{s.cardOf.replace("{i}", String(index + 1)).replace("{n}", String(total))}</span>
      </div>

      {/* Card stack */}
      <div className="absolute inset-x-0 top-[12%] bottom-[16%] flex items-center justify-center px-6" style={{ perspective: 1200 }}>
        {/* stack shadows */}
        {[2, 1].map((k) => (
          <div key={k} className="absolute h-[min(62cqh,520px)] w-[min(84cqw,380px)] rounded-[22px] bg-[#1e1a17] shadow-2xl" style={{ transform: `translateY(${k * 10}px) scale(${1 - k * 0.04})`, opacity: index + k < total ? 1 : 0 }} />
        ))}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${index}-${run}`}
            initial={{ x: 80, rotate: 6, opacity: 0 }}
            animate={{ x: 0, rotate: 0, opacity: 1 }}
            exit={{ x: -120, rotate: -8, opacity: 0, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            className="relative h-[min(62cqh,520px)] w-[min(84cqw,380px)] overflow-hidden rounded-[22px] bg-[#fbfaf6] text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
          >
            {/* Face */}
            {isFinal ? (
              <div className="flex h-full flex-col overflow-y-auto p-6 text-center scrollbar-none">
                <p className="text-[11px] tracking-[0.25em] text-ink/45 uppercase">{s.last}</p>
                {finalTitle ? (
                  <p className="mt-4 text-[clamp(1.9rem,8.5cqw,2.6rem)] leading-[1.05] italic" style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent-deep)" }}>
                    {finalTitle}
                  </p>
                ) : null}
                <div className="mt-4 text-left text-[clamp(0.98rem,4.2cqw,1.05rem)] leading-relaxed text-ink-soft [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-ink">
                  {revealed[index] ? (
                    mode === "preview" || reduce || data.messageStyle === "fade" ? <RichMessage blocks={blocks} stagger={0.35} /> : <Typewriter blocks={blocks} active speed={40} />
                  ) : null}
                </div>
                {revealed[index] ? <p className="mt-5 text-right text-xl italic" style={{ fontFamily: "var(--gift-font-display)", color: "var(--gift-accent-deep)" }}>— {data.senderName}</p> : null}
              </div>
            ) : (
              <figure className="flex h-full flex-col">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <img src={photos[index].url} alt={photos[index].alt ?? ""} className="h-full w-full object-cover" draggable={false} />
                </div>
                <figcaption className="px-5 py-4 text-center text-[clamp(1.05rem,4.6cqw,1.2rem)] italic" style={{ fontFamily: "var(--gift-font-display)" }}>
                  {photos[index].caption || " "}
                </figcaption>
              </figure>
            )}
            {/* Foil */}
            {started && !revealed[index] ? <ScratchSurface foil={data.fields.foil} label={label} onCleared={onCleared} resetKey={`${index}-${run}`} /> : null}
          </motion.div>
        </AnimatePresence>
        <Confetti burst={burst} colors={[data.accentColor, "#FFF8F4", "#F4C7C3"]} origin={{ x: 0.5, y: 0.5 }} count={90} />
      </div>

      {/* Footer controls */}
      <div className="absolute inset-x-0 bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] z-20 flex flex-col items-center gap-3 px-6">
        {revealed[index] && !isFinal ? (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} type="button" onClick={next} className="flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold shadow-lg" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}>
            {index + 1 === total - 1 ? s.last : s.next}
            <ChevronRight className="size-4" />
          </motion.button>
        ) : !revealed[index] ? (
          <p className="text-xs tracking-[0.2em] text-paper/50 uppercase">{s.done}</p>
        ) : null}
        <div className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5" : "w-1.5")} style={{ background: revealed[i] ? "var(--gift-accent)" : i === index ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>
      </div>

      {/* After the final card is revealed: extras + end */}
      <AnimatePresence>
        {isFinal && revealed[index] ? (
          <FinalPanel data={data} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} />
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

/** The cover: one printed ticket on the counter, a coin beside it, their name on the print. */
function ScratchCover({
  data,
  s,
  foilLabel,
  reduce,
  audio,
  onStart,
}: {
  data: TemplateProps<ScratchFields>["data"];
  s: (typeof S)["en"];
  foilLabel: string;
  reduce: boolean;
  audio: ReturnType<typeof useGiftAudio>;
  onStart: () => void;
}) {
  const title = data.title?.trim();
  const prize = data.fields.finalTitle?.trim() || s.prize;
  const serial = `№ ${100000 + (hashString(`${data.senderName}${data.recipientName}`) % 899999)}`;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, color: "#4A3726", fontFamily: "var(--gift-font-body)" }}>
      <CoverPage tone={TONE} pattern={PATTERN} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={AMBIENCE} opacity={0.85} />
      </div>
      <StickerScatter items={STICKERS} reduce={reduce} className="z-[3]" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[calc(7*var(--k))] pb-[calc(2*var(--k))]">
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        {title ? (
          <motion.h1
            className="mt-[calc(1.6*var(--k))] max-w-[calc(78*var(--k))] text-center text-[calc(7.2*var(--k))] leading-[1.05] text-balance italic"
            style={{ fontFamily: POSTER_FONT }}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.8 }}
          >
            {title}
          </motion.h1>
        ) : null}

        <motion.div
          className="relative mt-[calc(4.5*var(--k))] w-[calc(56*var(--k))]"
          initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
        >
          <Float reduce={reduce}>
            <button type="button" onClick={onStart} aria-label={s.pill} className="block w-full rounded-[calc(3*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/70">
              <Ticket name={data.recipientName} forLabel={s.for} kind={s.ticket} prize={prize} foilLabel={foilLabel} serial={serial} cards={data.photos.slice(0, 12).length + 1} />
            </button>
          </Float>
          <div aria-hidden="true" className="absolute -right-[calc(6*var(--k))] bottom-[calc(5*var(--k))] w-[calc(15*var(--k))] rotate-[-12deg]">
            <Coin />
          </div>
          <span aria-hidden="true" className="absolute -bottom-[calc(1.5*var(--k))] left-1/2 h-[calc(4*var(--k))] w-[72%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-[calc(2.2*var(--k))]" />
        </motion.div>

        <div className="mt-[calc(5.5*var(--k))]">
          <TapPill tone={TONE} reduce={reduce}>
            {s.pill}
          </TapPill>
        </div>
      </div>

      <SoundToggle audio={audio} locale={data.locale} className="bg-black/10 text-current" />
    </div>
  );
}

function FinalPanel({ data, onEvent, onReact, onMakeOne, onReplay }: { data: TemplateProps<ScratchFields>["data"]; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const [open, setOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => setOpen(true), 4200);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
        endedRef.current = true;
        onEvent?.({ type: "ended" });
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, open]);
  if (!open) return null;
  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 90, damping: 20 }} className="absolute inset-0 z-40 overflow-y-auto bg-[#141110]/95 backdrop-blur-md scrollbar-none">
      <div className="mx-auto flex w-[min(90cqw,520px)] flex-col gap-5 pt-[max(12cqh,64px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {data.countdown ? <div className="rounded-3xl border border-white/10 bg-black/40 p-6"><Countdown countdown={data.countdown} locale={data.locale} tone="dark" /></div> : null}
        {data.surprise ? (
          <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
            <p className="mb-4 text-center text-[11px] tracking-[0.25em] text-white/50 uppercase">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="dark" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}
        <div ref={endRef} className="pt-4"><EndScreen data={data} tone="dark" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /></div>
      </div>
    </motion.div>
  );
}
