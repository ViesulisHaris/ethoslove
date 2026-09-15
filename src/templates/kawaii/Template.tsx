"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { Typewriter } from "../_shared/Typewriter";
import { RichMessage } from "../_shared/RichMessage";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { Banner, Bow, GiftBox, PALETTES, Plushie, type Palette } from "./art";
import type { KawaiiFields } from "./schema";

const S = {
  en: { greeting: "i have something for you", tap: "tap the box", forName: "for {name}", note: "a note from {name}", photos: "look at us" },
  es: { greeting: "tengo algo para ti", tap: "toca la caja", forName: "para {name}", note: "una nota de {name}", photos: "míranos" },
};

type Stage = "waiting" | "opening" | "book";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<KawaiiFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const p = PALETTES[data.fields.theme] ?? PALETTES.pink;
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "book" : "waiting");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const banner = data.fields.banner?.trim() || s.forName.replace("{name}", data.recipientName);
  const greeting = data.fields.greeting?.trim() || s.greeting;
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const openBox = () => {
    if (stage !== "waiting") return;
    void audio.start();
    eventRef.current?.({ type: "started" });
    setBurst((b) => b + 1);
    setStage("opening");
    window.setTimeout(() => {
      setStage("book");
      eventRef.current?.({ type: "progress", pct: 40 });
    }, reduce ? 300 : 1500);
  };

  const replay = () => {
    setStage("waiting");
    setRun((r) => r + 1);
  };

  const gingham: CSSProperties = {
    backgroundColor: p.bg,
    backgroundImage: `repeating-linear-gradient(0deg, ${p.check}8c 0 calc(6 * var(--u)), transparent calc(6 * var(--u)) calc(12 * var(--u))), repeating-linear-gradient(90deg, ${p.check}8c 0 calc(6 * var(--u)), transparent calc(6 * var(--u)) calc(12 * var(--u)))`,
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...gingham, color: p.ink, fontFamily: "var(--gift-font-body)", ["--k" as string]: "min(var(--u), 0.5cqh)" } as CSSProperties}>
      {/* Hearts and sparkles all over, the whole time. */}
      <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
        <Ambience layers={[{ kind: "hearts", colors: [p.bow, p.inner, "#FFFFFF"], count: stage === "book" ? 8 : 14 }, { kind: "sparkles", colors: ["#FFFFFF", p.bow], count: 18 }]} opacity={0.9} />
      </div>

      {/* The big bow at the top: the room's decoration. */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 z-[6] -translate-x-1/2"
        style={{ top: "calc(1 * var(--k))", width: "calc(28 * var(--k))", filter: "drop-shadow(0 4px 6px rgba(120,40,70,0.25))" }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.1 }}
      >
        <svg viewBox="-40 -24 80 52" width="100%" aria-hidden="true">
          <Bow color={p.bow} deep={p.bowDeep} size={64} />
        </svg>
      </motion.div>

      <AnimatePresence mode="wait">
        {stage !== "book" ? (
          <Waiting key={`wait-${run}`} p={p} data={data} s={s} greeting={greeting} banner={banner} opening={stage === "opening"} onOpen={openBox} reduce={!!reduce} />
        ) : (
          <Book key={`book-${run}`} p={p} data={data} mode={mode} blocks={blocks} s={s} t={t} reduce={!!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={[p.bow, p.inner, "#FFFFFF", p.accent, "#FFE9B8"]} count={200} origin={{ x: 0.5, y: 0.72 }} className="pointer-events-none absolute inset-0 z-30" />
      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

function Waiting({ p, data, s, greeting, banner, opening, onOpen, reduce }: { p: Palette; data: TemplateProps<KawaiiFields>["data"]; s: (typeof S)["en"]; greeting: string; banner: string; opening: boolean; onOpen: () => void; reduce: boolean }) {
  return (
    <motion.div className="absolute inset-0 z-10 flex flex-col items-center" exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.45 } }}>
      {/* their name, big, in the handwriting */}
      <motion.p
        className="mt-[calc(19*var(--k))] max-w-[calc(86*var(--k))] text-center text-[calc(13*var(--k))] leading-none"
        style={{ fontFamily: "var(--gift-font-hand)", color: p.bowDeep, textShadow: "0 2px 0 #fff" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      >
        {data.title || data.recipientName}
      </motion.p>

      {/* speech bubble */}
      <motion.div
        className="relative mt-[calc(5*var(--k))] max-w-[calc(72*var(--k))] rounded-[calc(5*var(--k))] px-[calc(5*var(--k))] py-[calc(3*var(--k))] text-center text-[calc(4.6*var(--k))] leading-snug shadow-[0_6px_18px_rgba(120,40,70,0.15)]"
        style={{ background: p.paper, color: p.ink }}
        initial={{ opacity: 0, scale: 0.6, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 16 }}
      >
        {greeting}
        <span aria-hidden="true" className="absolute left-1/2 -bottom-[calc(2.2*var(--k))] size-[calc(4*var(--k))] -translate-x-1/2 rotate-45 rounded-[3px]" style={{ background: p.paper }} />
      </motion.div>

      {/* the plushie */}
      <motion.div
        className="relative mt-[calc(4*var(--k))] w-[calc(58*var(--k))]"
        initial={{ opacity: 0, y: 40, scale: 0.7 }}
        animate={opening ? { opacity: 1, y: [0, -24, 0], scale: [1, 1.08, 1] } : { opacity: 1, y: reduce ? 0 : [0, -5, 0], scale: 1 }}
        transition={opening ? { duration: 0.7, ease: "easeOut" } : { y: { duration: 2.6, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.6, delay: 0.5 }, scale: { type: "spring", stiffness: 160, damping: 14, delay: 0.5 } }}
      >
        <div className="aspect-[128/140] w-full">
          <Plushie kind={data.fields.character} p={p} mood={opening ? "happy" : "idle"} wave={!reduce && !opening} />
        </div>
      </motion.div>

      {/* the box */}
      <motion.button
        type="button"
        onClick={onOpen}
        aria-label={s.tap}
        className="relative mt-[calc(1*var(--k))] w-[calc(38*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        style={{ filter: "drop-shadow(0 10px 14px rgba(120,40,70,0.22))" }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, scale: opening || reduce ? 1 : [1, 1.04, 1] }}
        transition={{ opacity: { delay: 1.2, duration: 0.5 }, y: { delay: 1.2, type: "spring", stiffness: 200, damping: 14 }, scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 2 } }}
        whileTap={{ scale: 0.94 }}
      >
        <div className="aspect-[120/110] w-full">
          <GiftBox p={p} opening={opening} />
        </div>
      </motion.button>

      {!opening ? (
        <motion.p
          className="mt-[calc(2*var(--k))] rounded-full px-[calc(4*var(--k))] py-[calc(1.4*var(--k))] text-[calc(3.2*var(--k))] font-semibold tracking-[0.22em] uppercase"
          style={{ background: "rgba(255,255,255,0.75)", color: p.bowDeep }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ delay: 1.8, duration: 2, repeat: Infinity }}
        >
          {s.tap}
        </motion.p>
      ) : null}

      <motion.div className="mt-auto mb-[max(calc(6*var(--k)),calc(env(safe-area-inset-bottom)+1.5rem))] w-[calc(70*var(--k))]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
        <div className="aspect-[220/44] w-full">
          <Banner text={banner} p={p} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function Book({ p, data, mode, blocks, s, t, reduce, onEvent, onReact, onMakeOne, onReplay }: { p: Palette; data: TemplateProps<KawaiiFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; s: (typeof S)["en"]; t: ReturnType<typeof useGiftStrings>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [typingDone, setTypingDone] = useState(mode === "preview");
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const layout = useMemo(() => {
    const rng = mulberry32(hashString(data.recipientName + data.senderName));
    return data.photos.map(() => ({ rot: (rng() - 0.5) * 9, tape: (rng() > 0.5 ? "left" : "right") as "left" | "right", sticker: rng() > 0.4 }));
  }, [data.photos, data.recipientName, data.senderName]);

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
    <motion.div className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      {/* the plushie peeks in from the corner */}
      <motion.div aria-hidden="true" className="pointer-events-none fixed top-[calc(2*var(--u))] left-[calc(1*var(--u))] z-20 w-[calc(22*var(--u))]" initial={{ x: -80, rotate: -20, opacity: 0 }} animate={{ x: 0, rotate: -8, opacity: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 140, damping: 14 }}>
        <div className="aspect-[128/140] w-full">
          <Plushie kind={data.fields.character} p={p} mood="happy" wave />
        </div>
      </motion.div>

      <div className="mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(5*var(--u))] pt-[calc(24*var(--u))] pb-[calc(72px+env(safe-area-inset-bottom))]">
        {/* the note */}
        <motion.article className="relative rounded-[calc(6*var(--u))] px-[calc(6*var(--u))] pt-[calc(6*var(--u))] pb-[calc(7*var(--u))] shadow-[0_14px_40px_-16px_rgba(120,40,70,0.35)]" style={{ background: p.paper }} initial={{ opacity: 0, y: 24, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -0.6 }} transition={{ delay: 0.2, type: "spring", stiffness: 140, damping: 16 }}>
          <span aria-hidden="true" className="absolute -top-[calc(2.5*var(--u))] left-[8%] h-[calc(5*var(--u))] w-[calc(22*var(--u))] -rotate-3 rounded-[2px]" style={{ background: p.tape }} />
          <p className="text-[calc(3.2*var(--u))] font-semibold tracking-[0.2em] uppercase" style={{ color: p.bowDeep }}>
            {s.note.replace("{name}", data.senderName)}
          </p>
          <div className="mt-[calc(3*var(--u))] text-[calc(6.2*var(--u))] leading-[1.35]" style={{ fontFamily: "var(--gift-font-hand)", color: p.ink }}>
            {instant ? <RichMessage blocks={blocks} stagger={mode === "preview" ? 0 : 0.4} onDone={() => setTypingDone(true)} /> : <Typewriter blocks={blocks} active speed={30} onDone={() => setTypingDone(true)} />}
          </div>
          <AnimatePresence>
            {typingDone ? (
              <motion.p key="sig" className="mt-[calc(4*var(--u))] text-right text-[calc(7*var(--u))] leading-none" style={{ fontFamily: "var(--gift-font-hand)", color: p.bow }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                {data.senderName} ♡
              </motion.p>
            ) : null}
          </AnimatePresence>
        </motion.article>

        {data.photos.length > 0 && typingDone ? (
          <motion.div className="flex items-center justify-center gap-2 text-[calc(3.4*var(--u))] tracking-[0.2em] uppercase" style={{ color: p.bowDeep }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            {s.photos}
            <motion.span animate={reduce ? undefined : { y: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <ChevronDown className="size-[calc(4*var(--u))]" />
            </motion.span>
          </motion.div>
        ) : null}

        {data.photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-[calc(4*var(--u))] gap-y-[calc(6*var(--u))] px-[calc(2*var(--u))] pt-[calc(2*var(--u))]">
            {data.photos.map((photo, i) => (
              <Sticker key={photo.id} photo={photo} p={p} rot={layout[i].rot} tape={layout[i].tape} star={layout[i].sticker} index={i} />
            ))}
          </div>
        ) : null}

        {data.countdown ? (
          <div className="rounded-[calc(5*var(--u))] p-[calc(5*var(--u))]" style={{ background: p.paper }}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className="relative rounded-[calc(5*var(--u))] p-[calc(5*var(--u))]" style={{ background: p.paper }}>
            <span aria-hidden="true" className="absolute -top-[calc(2*var(--u))] right-[10%] h-[calc(4.5*var(--u))] w-[calc(18*var(--u))] rotate-6 rounded-[2px]" style={{ background: p.tape }} />
            <p className="mb-[calc(3*var(--u))] text-[calc(3.2*var(--u))] font-semibold tracking-[0.2em] uppercase" style={{ color: p.bowDeep }}>
              {t("ps")}
            </p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className="rounded-[calc(5*var(--u))] p-[calc(4*var(--u))]" style={{ background: p.paper }}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </motion.div>
  );
}

function Sticker({ photo, p, rot, tape, star, index }: { photo: GiftPhoto; p: Palette; rot: number; tape: "left" | "right"; star: boolean; index: number }) {
  return (
    <motion.figure
      className="relative m-0 rounded-[calc(3*var(--u))] p-[calc(2*var(--u))] pb-[calc(2.5*var(--u))] shadow-[0_10px_24px_-10px_rgba(120,40,70,0.4)]"
      style={{ background: "#fff", rotate: rot }}
      initial={{ opacity: 0, y: 28, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 14, delay: (index % 2) * 0.12 }}
    >
      <span aria-hidden="true" className={cn("absolute -top-[calc(2*var(--u))] h-[calc(4*var(--u))] w-[calc(14*var(--u))] rounded-[2px]", tape === "left" ? "left-[10%] -rotate-6" : "right-[10%] rotate-6")} style={{ background: p.tape }} />
      <div className="aspect-square w-full overflow-hidden rounded-[calc(2*var(--u))]" style={{ background: p.check }}>
        <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
      </div>
      {photo.caption ? (
        <figcaption className="mt-[calc(1.5*var(--u))] text-center text-[calc(4*var(--u))] leading-tight" style={{ fontFamily: "var(--gift-font-hand)", color: p.ink }}>
          {photo.caption}
        </figcaption>
      ) : null}
      {star ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute -right-[calc(2*var(--u))] -bottom-[calc(2*var(--u))] size-[calc(7*var(--u))] drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8Z" fill={p.bow} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="absolute -left-[calc(2*var(--u))] -bottom-[calc(1.5*var(--u))] size-[calc(6.5*var(--u))] drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">
          <path d="M12 20.8s-7.2-4.4-9.2-8.8C1.4 8.6 3.1 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3.2 1.7-2.1 3.2-3.2 5.2-3.2 3.7 0 5.4 3.8 4 7.2-2 4.4-9.2 8.8-9.2 8.8Z" fill={p.inner} stroke="#fff" strokeWidth={1.5} />
        </svg>
      )}
    </motion.figure>
  );
}
