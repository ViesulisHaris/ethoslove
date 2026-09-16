"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Hand } from "lucide-react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useShake } from "../_shared/hooks/use-shake";
import { hashString, mulberry32 } from "../_shared/random";
import { Typewriter } from "../_shared/Typewriter";
import { RichMessage } from "../_shared/RichMessage";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { JAR_KEYFRAMES, Jar } from "./art";
import type { JarFields } from "./schema";

const PAPER: Record<JarFields["paper"], string[]> = {
  white: ["#FBFAF6"],
  kraft: ["#D9C4A3", "#E3D2B6"],
  pastel: ["#FBE9E6", "#FFF3D6", "#E6F1EA", "#E7ECF7", "#F3E8F5"],
};

type Look = {
  tone: CoverTone;
  ink: string;
  pattern: string;
  /** The jar's cap, its twine and the tag's paper. */
  cap: string;
  twine: string;
  tagPaper: string;
  /** The notes in the pile, a shade or two so it reads as a stack. */
  pile: string[];
  stickers: StickerPlacement[];
  ambience: { kind: AmbienceKind; colors: string[]; count?: number }[];
};

/** One page per paper the sender picked: their choice sets the whole room, not only the notes. */
const LOOKS: Record<JarFields["paper"], Look> = {
  pastel: {
    tone: { page: "#F8E4E7", glow: ["rgba(255,246,222,.95)", "rgba(255,188,208,.7)"], accent: "#B4435E" },
    ink: "#4A2B33",
    pattern:
      "linear-gradient(90deg, rgba(255,255,255,.3) 50%, transparent 0) 0 0/calc(11*var(--k)) calc(11*var(--k)), linear-gradient(rgba(255,255,255,.3) 50%, transparent 0) 0 0/calc(11*var(--k)) calc(11*var(--k))",
    cap: "#F2879F",
    twine: "#B98A66",
    tagPaper: "#FFF7EC",
    pile: ["#FBE9E6", "#FFF3D6", "#E6F1EA", "#E7ECF7", "#F3E8F5", "#FCDDE4"],
    stickers: [
      { id: "heart", x: 13, y: 13, size: 14, rotate: -12 },
      { id: "sparkle", x: 88, y: 17, size: 8 },
      { id: "butterfly", x: 89, y: 66, size: 16, rotate: 12 },
      { id: "daisy", x: 11, y: 50, size: 13 },
      { id: "bow", x: 16, y: 84, size: 16, rotate: -8 },
      { id: "cherries", x: 86, y: 84, size: 14, rotate: 10 },
    ],
    ambience: [
      { kind: "hearts", colors: ["#F7A1B5", "#FBD3DC"], count: 7 },
      { kind: "sparkles", colors: ["#FFFFFF", "#FFD9A8"], count: 16 },
    ],
  },
  kraft: {
    tone: { page: "#EFE3CE", glow: ["rgba(255,240,205,.95)", "rgba(219,172,116,.5)"], accent: "#8C5A2E" },
    ink: "#3E2C1C",
    pattern: "radial-gradient(rgba(255,255,255,.42) calc(.9*var(--k)), transparent calc(1*var(--k))) 0 0/calc(10*var(--k)) calc(10*var(--k))",
    cap: "#C7523F",
    twine: "#9C7248",
    tagPaper: "#E7CFA8",
    pile: ["#D9C4A3", "#E3D2B6", "#CDB68F"],
    stickers: [
      { id: "leaf", x: 13, y: 13, size: 15, rotate: -22 },
      { id: "sparkle", x: 88, y: 17, size: 8 },
      { id: "strawberry", x: 89, y: 66, size: 14, rotate: 12 },
      { id: "daisy", x: 11, y: 50, size: 13 },
      { id: "heart", x: 16, y: 84, size: 13, rotate: -10 },
      { id: "acorn", x: 86, y: 84, size: 12, rotate: 10 },
    ],
    ambience: [
      { kind: "dust", colors: ["#FFE7B8", "#FFFFFF"], count: 18 },
      { kind: "sparkles", colors: ["#FFFFFF", "#F2C879"], count: 12 },
    ],
  },
  white: {
    tone: { page: "#E9EFE4", glow: ["rgba(255,255,240,.95)", "rgba(168,203,166,.55)"], accent: "#2F6B4F" },
    ink: "#25332A",
    pattern: "repeating-linear-gradient(90deg, rgba(255,255,255,.4) 0 calc(1.2*var(--k)), transparent calc(1.2*var(--k)) calc(6*var(--k)))",
    cap: "#7FA98C",
    twine: "#A9865E",
    tagPaper: "#FFFDF6",
    pile: ["#FBFAF6", "#F1EDE2", "#FFFFFF"],
    stickers: [
      { id: "tulip", x: 13, y: 13, size: 14, rotate: -10 },
      { id: "sparkle", x: 88, y: 17, size: 8 },
      { id: "butterfly", x: 89, y: 66, size: 16, rotate: 12 },
      { id: "daisy", x: 11, y: 50, size: 13 },
      { id: "heart", x: 16, y: 84, size: 13, rotate: -10 },
      { id: "daisy", x: 86, y: 84, size: 12, rotate: 20 },
    ],
    ambience: [
      { kind: "petals", colors: ["#FFFFFF", "#F6E7C8"], count: 7 },
      { kind: "sparkles", colors: ["#FFFFFF", "#E9F2DF"], count: 14 },
    ],
  },
};

const S = {
  en: { label: "{n} reasons I love you", for: "for", shakeJar: "shake or tap the jar", tapJar: "tap the jar", shake: "Shake your phone", tap: "or tap the jar", pull: "Pull another", enable: "Enable motion", left: "{n} left", empty: "The jar is empty.", read: "Read the letter", fold: "Tap to fold it back" },
  es: { label: "{n} razones por las que te quiero", for: "para", shakeJar: "agita o toca el frasco", tapJar: "toca el frasco", shake: "Agita el teléfono", tap: "o toca el frasco", pull: "Sacar otra", enable: "Activar movimiento", left: "Quedan {n}", empty: "El frasco está vacío.", read: "Leer la carta", fold: "Toca para volver a doblarla" },
};

type Stage = "jar" | "letter";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<JarFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const reasons = useMemo(() => (data.fields.reasons.length ? data.fields.reasons : ["…"]), [data.fields.reasons]);
  const total = reasons.length;
  const seed = hashString(data.recipientName + total);
  const order = useMemo(() => {
    const rng = mulberry32(seed);
    const idx = reasons.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }, [seed, reasons]);
  const [pulled, setPulled] = useState<number[]>(() => (mode === "preview" ? [order[0]] : []));
  const [open, setOpen] = useState<number | null>(() => (mode === "preview" ? order[0] : null));
  const [started, setStarted] = useState(mode === "preview");
  const [stage, setStage] = useState<Stage>("jar");
  const [wobble, setWobble] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const remaining = total - pulled.length;
  const papers = PAPER[data.fields.paper] ?? PAPER.white;
  const look = LOOKS[data.fields.paper] ?? LOOKS.white;
  const label = data.fields.label || s.label.replace("{n}", String(total));

  const pull = useCallback(() => {
    if (open !== null || stage !== "jar") return;
    if (!started) {
      setStarted(true);
      void audio.start();
      onEvent?.({ type: "started" });
    }
    setWobble((w) => w + 1);
    setPulled((p) => {
      if (p.length >= total) return p;
      const next = order[p.length];
      setOpen(next);
      onEvent?.({ type: "progress", pct: Math.round(((p.length + 1) / total) * 70) });
      return [...p, next];
    });
  }, [open, stage, started, audio, onEvent, order, total]);

  const shake = useShake(pull, { enabled: stage === "jar" && open === null });

  const fold = () => setOpen(null);
  const replay = () => {
    setPulled([]);
    setOpen(null);
    setStage("jar");
  };

  const noteColor = (i: number) => papers[i % papers.length];
  const photo = open !== null && open < data.photos.length ? data.photos[open] : null;
  const shakeable = shake.supported && !shake.needsPermission;
  const callToAction = shakeable ? s.shakeJar : s.tapJar;

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{JAR_KEYFRAMES}</style>
      <CoverPage tone={look.tone} pattern={look.pattern} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.9} />
      </div>
      <StickerScatter items={look.stickers} reduce={!!reduce} className="z-[3]" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[calc(7*var(--k))] pb-[calc(3*var(--k))]">
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        <motion.h1
          className="mt-[calc(1.8*var(--k))] max-w-[calc(80*var(--k))] text-center text-[calc(8*var(--k))] leading-[1.05] text-balance italic"
          style={{ fontFamily: POSTER_FONT }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.8 }}
        >
          {label}
        </motion.h1>

        <motion.div
          className="relative mt-[calc(4.5*var(--k))] w-[calc(54*var(--k))]"
          initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
        >
          <Float reduce={!!reduce}>
            <motion.div key={wobble} animate={reduce ? undefined : { rotate: [0, -3, 3, -2, 1, 0] }} transition={{ duration: 0.6 }}>
              <button
                type="button"
                onClick={pull}
                aria-label={callToAction}
                className="block w-full rounded-[calc(6*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                <Jar
                  total={total}
                  pulled={pulled.length}
                  papers={look.pile}
                  seed={seed}
                  cap={look.cap}
                  twine={look.twine}
                  tagPaper={look.tagPaper}
                  name={data.recipientName}
                  forLabel={s.for}
                />
              </button>
            </motion.div>
          </Float>
          <span
            aria-hidden="true"
            className="absolute -bottom-[calc(1.5*var(--k))] left-1/2 h-[calc(4.5*var(--k))] w-[76%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-[calc(2.2*var(--k))]"
          />
        </motion.div>

        <div className="mt-[calc(6*var(--k))] flex min-h-[calc(12*var(--k))] flex-col items-center gap-[calc(2.2*var(--k))]">
          <AnimatePresence mode="wait">
            {open === null && stage === "jar" ? (
              remaining === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-[calc(2.4*var(--k))]">
                  <p className="text-[calc(4.6*var(--k))] italic" style={{ fontFamily: POSTER_FONT }}>
                    {s.empty}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStage("letter");
                      onEvent?.({ type: "progress", pct: 80 });
                    }}
                    className="h-[calc(11*var(--k))] rounded-full px-[calc(7*var(--k))] text-[calc(3.6*var(--k))] font-semibold shadow-lg"
                    style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
                  >
                    {s.read}
                  </button>
                </motion.div>
              ) : pulled.length === 0 ? (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-[calc(2.2*var(--k))]">
                  <TapPill tone={look.tone} reduce={!!reduce}>
                    {callToAction}
                  </TapPill>
                </motion.div>
              ) : (
                <motion.div key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-[calc(1.8*var(--k))]">
                  <button
                    type="button"
                    onClick={pull}
                    className="flex h-[calc(10.5*var(--k))] items-center gap-[calc(1.8*var(--k))] rounded-full bg-white/80 px-[calc(5.5*var(--k))] text-[calc(3.4*var(--k))] font-semibold backdrop-blur-sm"
                    style={{ color: look.tone.accent, boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(70,35,25,.14)" }}
                  >
                    <Hand className="size-[calc(3.6*var(--k))]" />
                    {s.pull}
                  </button>
                  <p className="text-[calc(2.8*var(--k))] tracking-[0.2em] uppercase opacity-55">{s.left.replace("{n}", String(remaining))}</p>
                  {/* Shaking is the nicer way to pull one, but iOS only offers it after a tap. */}
                  {shake.needsPermission ? (
                    <button type="button" onClick={() => void shake.requestPermission()} className="rounded-full bg-white/70 px-[calc(4*var(--k))] py-[calc(1.4*var(--k))] text-[calc(2.6*var(--k))] font-medium backdrop-blur-sm">
                      {s.enable}
                    </button>
                  ) : null}
                </motion.div>
              )
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Open note */}
      <AnimatePresence>
        {open !== null ? (
          <motion.div key={`note-${open}`} className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={fold}>
            <motion.div
              initial={{ y: 120, scaleY: 0.25, rotate: -14, opacity: 0 }}
              animate={{ y: 0, scaleY: 1, rotate: -1.5, opacity: 1 }}
              exit={{ y: 90, scaleY: 0.3, rotate: 8, opacity: 0, transition: { duration: 0.35 } }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="relative w-[min(86cqw,420px)] rounded-[4px] p-6 pt-8 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)]"
              style={{ background: noteColor(open), backgroundImage: "repeating-linear-gradient(180deg, transparent 0 27px, rgba(0,0,0,0.06) 27px 28px)" }}
            >
              <span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-3deg] bg-[rgba(234,216,172,0.85)]" />
              <p className="text-[11px] tracking-[0.25em] text-ink/45 uppercase">#{pulled.indexOf(open) + 1}</p>
              {photo ? (
                <div className="mx-auto mt-3 w-[70%] rotate-2 bg-white p-2 pb-5 shadow-md">
                  <img src={photo.url} alt={photo.alt ?? ""} className="aspect-square w-full object-cover" />
                </div>
              ) : null}
              <p className="mt-4 text-[clamp(1.35rem,6cqw,1.7rem)] leading-snug text-[#2B2320]" style={{ fontFamily: "var(--gift-font-hand)" }}>
                {reasons[open]}
              </p>
              <p className="mt-6 text-xs text-ink/45">{s.fold}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Letter */}
      <AnimatePresence>
        {stage === "letter" ? (
          <motion.div key="letter" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 90, damping: 20 }} className="absolute inset-0 z-40 overflow-y-auto bg-[#fbfaf6] scrollbar-none">
            <LetterBody data={data} mode={mode} blocks={blocks} reduce={!!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} className="bg-black/15 text-current" />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

function LetterBody({ data, mode, blocks, reduce, onEvent, onReact, onMakeOne, onReplay }: { data: TemplateProps<JarFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const endRef = useRef<HTMLDivElement>(null);
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
    <div className="mx-auto flex w-[min(88cqw,560px)] flex-col gap-6 pt-[max(8cqh,48px)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-ink">
      <div>
        <h2 className="text-[clamp(1.7rem,7cqw,2.2rem)]" style={{ fontFamily: "var(--gift-font-hand)" }}>{t("dear", { name: data.recipientName })}</h2>
        <div className={cn("mt-4 text-[clamp(1.25rem,5.2cqw,1.5rem)] leading-[1.45] text-ink [&_p+p]:mt-4 [&_strong]:font-bold [&_em]:text-[var(--gift-accent)]")} style={{ fontFamily: "var(--gift-font-hand)" }}>
          {instant ? <RichMessage blocks={blocks} stagger={mode === "preview" ? 0 : 0.5} onDone={() => setDone(true)} /> : <Typewriter blocks={blocks} active speed={30} onDone={() => setDone(true)} />}
        </div>
        {done ? <p className="mt-6 text-right text-[2rem]" style={{ fontFamily: "var(--gift-font-hand)", color: "var(--gift-accent)" }}>{data.senderName}</p> : null}
      </div>
      {done && data.countdown ? <div className="rounded-2xl border border-black/10 bg-white p-5"><Countdown countdown={data.countdown} locale={data.locale} tone="light" /></div> : null}
      {done && data.surprise ? (
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="mb-3 text-center text-[11px] tracking-[0.25em] text-ink/50 uppercase">{t("ps")}</p>
          <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
        </div>
      ) : null}
      {done ? <div ref={endRef} className="pt-4 pb-6"><EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /></div> : null}
    </div>
  );
}
