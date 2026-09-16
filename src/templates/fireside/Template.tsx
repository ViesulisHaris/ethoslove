"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Sticker } from "../_shared/covers/stickers";
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { Blanket, Candle, Garland, Mug, PALETTES, Peg, StringLine, WindowFrame, WindowScene, type Palette } from "./art";
import type { FiresideFields } from "./schema";

const S = {
  en: { light: "light the candle", tag: "for {name}", letter: "a letter from {name}", photos: "on the line", headline: "the long evenings" },
  es: { light: "enciende la vela", tag: "para {name}", letter: "una carta de {name}", photos: "colgadas del hilo", headline: "las tardes largas" },
};

/** The room is the scene; the cover's page is a warm wash over it with its own light behind the candle. */
const LOOKS: Record<FiresideFields["mood"], { tone: CoverTone; pattern: string }> = {
  amber: {
    tone: { page: "rgba(14,20,32,.34)", glow: ["rgba(255,179,92,.34)", "rgba(196,106,75,.3)"], accent: "#8A4A22", dark: true },
    pattern: "repeating-linear-gradient(90deg, rgba(255,226,180,.035) 0 calc(2*var(--k)), transparent calc(2*var(--k)) calc(11*var(--k)))",
  },
  maple: {
    tone: { page: "rgba(20,14,26,.34)", glow: ["rgba(255,158,92,.34)", "rgba(217,112,74,.3)"], accent: "#8A3320", dark: true },
    pattern: "repeating-linear-gradient(90deg, rgba(255,214,194,.035) 0 calc(2*var(--k)), transparent calc(2*var(--k)) calc(11*var(--k)))",
  },
  moss: {
    tone: { page: "rgba(12,20,17,.34)", glow: ["rgba(233,210,122,.3)", "rgba(176,138,74,.28)"], accent: "#5E5A22", dark: true },
    pattern: "repeating-linear-gradient(90deg, rgba(232,226,196,.035) 0 calc(2*var(--k)), transparent calc(2*var(--k)) calc(11*var(--k)))",
  },
};

/** Down both edges: the window owns the middle band and the blanket owns the bottom. */
const STICKERS: Record<FiresideFields["outside"], StickerPlacement[]> = {
  leaves: [
    { id: "leaf", x: 9, y: 30, size: 13, rotate: -22 },
    { id: "acorn", x: 92, y: 26, size: 11, rotate: 12 },
    { id: "sparkle", x: 88, y: 45, size: 7 },
    { id: "leaf", x: 8, y: 52, size: 11, rotate: 150 },
    { id: "pumpkin", x: 12, y: 70, size: 15, rotate: -8 },
    { id: "leaf", x: 90, y: 66, size: 13, rotate: 28 },
  ],
  snow: [
    { id: "cloud", x: 10, y: 29, size: 17, rotate: -6 },
    { id: "star", x: 92, y: 25, size: 10, rotate: 12 },
    { id: "sparkle", x: 88, y: 45, size: 7 },
    { id: "moon", x: 8, y: 52, size: 11 },
    { id: "heart", x: 12, y: 70, size: 12, rotate: -8 },
    { id: "sparkle", x: 90, y: 66, size: 9 },
  ],
};

/** Motes only: bokeh discs read as smudges on a room this dark. */
const ROOM_AMBIENCE = (p: Palette) => [{ kind: "dust" as const, colors: [p.glow, "#FFF3D6"], count: 16 }];

/** The paper's grain: multiplied over the letter and the notes. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

const KEYFRAMES = `
.fs-flame{transform-origin:50% 100%;animation:fs-flicker 1.1s ease-in-out infinite alternate}
.fs-glow{transform-origin:50% 50%;animation:fs-breathe 2.4s ease-in-out infinite alternate}
@keyframes fs-flicker{0%{transform:scale(1,1) skewX(-2deg)}50%{transform:scale(1.06,.94) skewX(2deg)}100%{transform:scale(.96,1.08) skewX(-1deg)}}
@keyframes fs-breathe{from{transform:scale(.92);opacity:.85}to{transform:scale(1.08);opacity:1}}
.fs-steam{animation:fs-rise 3.3s ease-in-out infinite;opacity:0}
@keyframes fs-rise{0%{transform:translateY(0) scaleX(1);opacity:0}25%{opacity:.75}100%{transform:translateY(-14px) scaleX(1.3);opacity:0}}
.fs-swing{transform-origin:50% 0;animation:fs-sway var(--sway,5s) ease-in-out infinite alternate}
@keyframes fs-sway{from{rotate:-1.4deg}to{rotate:1.4deg}}
@media (prefers-reduced-motion: reduce){.fs-flame,.fs-glow,.fs-steam,.fs-swing{animation:none}.fs-steam{opacity:.5}}
`;

type Stage = "dusk" | "lighting" | "reading";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<FiresideFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const p = PALETTES[data.fields.mood] ?? PALETTES.amber;
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "reading" : "dusk");
  const [run, setRun] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const tag = data.fields.tag?.trim() || s.tag.replace("{name}", data.recipientName);
  const look = LOOKS[data.fields.mood] ?? LOOKS.amber;
  const headline = data.title?.trim() || s.headline;
  const lit = stage !== "dusk";
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const light = () => {
    if (stage !== "dusk") return;
    void audio.start();
    eventRef.current?.({ type: "started" });
    setStage("lighting");
    window.setTimeout(() => {
      setStage("reading");
      eventRef.current?.({ type: "progress", pct: 40 });
    }, reduce ? 400 : 2100);
  };

  const replay = () => {
    setStage("dusk");
    setRun((r) => r + 1);
  };

  const weather = data.fields.outside === "snow" ? { kind: "snow" as const, colors: ["#FFFFFF", "#EAF2FF"], count: 44 } : { kind: "leaves" as const, colors: p.weather, count: 14 };

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: p.cold, color: p.paper, fontFamily: "var(--gift-font-body)", ["--top" as string]: "max(calc(42 * var(--k)), calc((100cqh - 156 * var(--k)) / 2))" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {/* Lamplight takes over the room once the candle is lit. */}
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ background: p.warm }} initial={false} animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: reduce ? 0.3 : 1.8, ease: "easeInOut" }} />

      {/* The cover's page, behind the window: it pulls back as the candle takes over the lighting. */}
      {stage !== "reading" ? (
        <motion.div aria-hidden="true" className="absolute inset-0 z-[1]" initial={false} animate={{ opacity: lit ? 0.3 : 1 }} transition={{ duration: reduce ? 0.3 : 1.6 }}>
          <CoverPage tone={look.tone} pattern={look.pattern} />
        </motion.div>
      ) : null}

      {/* The window, with the weather falling behind the glazing bars. */}
      <div className="absolute left-1/2 z-[2] -translate-x-1/2 overflow-hidden" style={{ top: "calc(var(--top) + 8 * var(--k))", width: "calc(72 * var(--k))", height: "calc(84 * var(--k))", borderRadius: "calc(36 * var(--k)) calc(36 * var(--k)) 6px 6px", boxShadow: "inset 0 0 calc(6 * var(--k)) rgba(0,0,0,0.5)" }}>
        <WindowScene p={p} />
        <Ambience layers={[weather]} opacity={0.95} />
        <WindowFrame p={p} />
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 45% at 50% 100%, ${p.glow}55, transparent 70%)` }} initial={false} animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: 1.6 }} />
      </div>

      {/* The sill. */}
      <div aria-hidden="true" className="absolute left-1/2 z-[3] -translate-x-1/2 rounded-[3px]" style={{ top: "calc(var(--top) + 92 * var(--k))", width: "calc(86 * var(--k))", height: "calc(6 * var(--k))", background: `linear-gradient(180deg, ${p.wood}, ${p.woodDeep})`, boxShadow: "0 calc(2 * var(--k)) calc(4 * var(--k)) rgba(0,0,0,0.45)" }} />

      {/* The room dims a little behind the letter, so the words are what you read. */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[9] bg-black/35" initial={false} animate={{ opacity: stage === "reading" ? 1 : 0 }} transition={{ duration: 0.8 }} />

      <AnimatePresence mode="wait">
        {stage !== "reading" ? (
          <Dusk key={`dusk-${run}`} p={p} look={look} s={s} data={data} headline={headline} tag={tag} drink={data.fields.drink} outside={data.fields.outside} lit={lit} reduce={!!reduce} onLight={light} />
        ) : (
          <Reading key={`reading-${run}`} p={p} s={s} t={t} data={data} mode={mode} blocks={blocks} reduce={!!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} />
        )}
      </AnimatePresence>

      {/* Sparks from the candle, and a few leaves indoors, once it's lit. */}
      {lit && !reduce ? (
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[25]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 0.4 }}>
          <Ambience layers={[{ kind: "embers", colors: [p.glow, p.accent, "#FFE6B8"], count: stage === "reading" ? 14 : 22 }, ...(data.fields.outside === "leaves" ? [{ kind: "leaves" as const, colors: p.weather, count: stage === "reading" ? 4 : 0 }] : [])]} opacity={0.9} />
        </motion.div>
      ) : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

function Dusk({
  p,
  look,
  s,
  data,
  headline,
  tag,
  drink,
  outside,
  lit,
  reduce,
  onLight,
}: {
  p: Palette;
  look: (typeof LOOKS)["amber"];
  s: (typeof S)["en"];
  data: TemplateProps<FiresideFields>["data"];
  headline: string;
  tag: string;
  drink: FiresideFields["drink"];
  outside: FiresideFields["outside"];
  lit: boolean;
  reduce: boolean;
  onLight: () => void;
}) {
  return (
    <motion.div className="absolute inset-0 z-10" exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      {/* the air in the room, and a few things pressed onto the page around the scene */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
        <Ambience layers={ROOM_AMBIENCE(p)} opacity={0.85} />
      </div>
      <StickerScatter items={STICKERS[outside] ?? STICKERS.leaves} reduce={reduce} className="z-[2]" />

      {/* the bunting: their name, letter by letter, across the top */}
      <motion.div
        className="absolute inset-x-0 top-[calc(2.5*var(--k))] z-[8]"
        initial={reduce ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.7 }}
      >
        <Garland name={data.recipientName} p={p} reduce={reduce} />
      </motion.div>

      <motion.p
        className="absolute inset-x-[calc(8*var(--k))] z-[8] text-center text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55 [overflow-wrap:anywhere]"
        style={{ top: "calc(23 * var(--k))" }}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 0.55, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      >
        {data.senderName} → {data.recipientName}
      </motion.p>
      <motion.h1
        className="absolute inset-x-[calc(7*var(--k))] z-[8] text-center leading-[1.05] text-balance italic [overflow-wrap:anywhere]"
        style={{ top: "calc(27 * var(--k))", fontFamily: POSTER_FONT, fontSize: headline.length > 24 ? "calc(6*var(--k))" : "calc(8*var(--k))", color: p.stripe }}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.8 }}
      >
        {headline}
      </motion.h1>

      {/* the mug, on the sill, steaming since before you got here */}
      <motion.div className="absolute z-[4]" style={{ left: "calc(50% - 40 * var(--k))", top: "calc(var(--top) + 70 * var(--k))", width: "calc(24 * var(--k))", height: "calc(26 * var(--k))" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
        <Mug p={p} drink={drink} lit={lit} />
      </motion.div>

      {/* the candle: the one thing to tap */}
      <motion.div
        className="absolute left-1/2 z-[5] -translate-x-1/2"
        style={{ top: "calc(var(--top) + 54 * var(--k))", width: "calc(20 * var(--k))" }}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 80, damping: 15 }}
      >
        {/* it stands on the sill: the shadow stays put while the flame breathes */}
        <span
          aria-hidden="true"
          className="absolute bottom-[calc(1.2*var(--k))] left-1/2 h-[calc(2.6*var(--k))] w-[112%] -translate-x-1/2 rounded-[50%]"
          style={{ background: "rgba(0,0,0,.5)", filter: "blur(calc(1.1*var(--k)))" }}
        />
        <Float reduce={reduce} amount={0.35} duration={6.8}>
          <motion.button
            type="button"
            onClick={onLight}
            aria-label={s.light}
            className="block w-full cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            style={{ height: "calc(44 * var(--k))" }}
            whileTap={{ scale: 0.96 }}
          >
            <Candle p={p} lit={lit} />
          </motion.button>
        </Float>
      </motion.div>

      <div className="absolute inset-x-0 z-[8] flex justify-center" style={{ top: "calc(var(--top) + 103 * var(--k))" }}>
        <TapPill tone={look.tone} hidden={lit} reduce={reduce} delay={1.2}>
          {s.light}
        </TapPill>
      </div>

      {/* the blanket, with the letter tucked into it and their label sewn on */}
      <div className="absolute inset-x-0 bottom-0 z-[7]" style={{ height: "calc(34 * var(--k))" }}>
        <motion.div
          aria-hidden="true"
          className="absolute rounded-[3px] shadow-[0_-6px_18px_rgba(0,0,0,0.25)]"
          style={{ left: "calc(50% - 34 * var(--k))", width: "calc(60 * var(--k))", top: "calc(1 * var(--k))", height: "calc(18 * var(--k))", backgroundColor: p.paper, backgroundImage: GRAIN, rotate: -6 }}
          initial={{ y: 30 }}
          animate={lit ? { y: -40, rotate: -2 } : { y: 8 }}
          transition={lit ? { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 } : { delay: 0.6, duration: 0.8 }}
        >
          <div className="mx-[8%] mt-[calc(3*var(--k))] h-px w-[70%] opacity-30" style={{ background: p.ink }} />
          <div className="mx-[8%] mt-[calc(2*var(--k))] h-px w-[55%] opacity-30" style={{ background: p.ink }} />
          <div className="mx-[8%] mt-[calc(2*var(--k))] h-px w-[62%] opacity-30" style={{ background: p.ink }} />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-full drop-shadow-[0_-8px_18px_rgba(0,0,0,0.35)]">
          <Blanket p={p} />
        </div>
        <motion.div
          className="absolute z-[2]"
          style={{ right: "calc(8 * var(--k))", bottom: "calc(5 * var(--k))" }}
          initial={reduce ? false : { opacity: 0, y: 10, rotate: 9 }}
          animate={{ opacity: 1, y: 0, rotate: 4 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 160, damping: 14 }}
        >
          <div
            className="relative rounded-[calc(1*var(--k))] px-[calc(3.4*var(--k))] py-[calc(1.6*var(--k))]"
            style={{ backgroundColor: "#F4E6CC", color: "#5A3A1E", backgroundImage: GRAIN, boxShadow: "0 calc(.8*var(--k)) calc(2*var(--k)) rgba(0,0,0,.4)" }}
          >
            <span aria-hidden="true" className="absolute inset-[calc(.9*var(--k))] rounded-[calc(.6*var(--k))] border border-dashed" style={{ borderColor: "rgba(90,58,30,.45)" }} />
            <p className="max-w-[calc(44*var(--k))] truncate text-[calc(4.4*var(--k))] leading-none" style={{ fontFamily: "var(--gift-font-hand)" }}>
              {tag}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Reading({ p, s, t, data, mode, blocks, reduce, onEvent, onReact, onMakeOne, onReplay }: { p: Palette; s: (typeof S)["en"]; t: ReturnType<typeof useGiftStrings>; data: TemplateProps<FiresideFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const [done, setDone] = useState(mode === "preview");
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const layout = useMemo(() => {
    const rng = mulberry32(hashString(data.recipientName + data.senderName + "fireside"));
    return data.photos.map(() => ({ rot: (rng() - 0.5) * 7, sway: 4 + rng() * 3 }));
  }, [data.photos, data.recipientName, data.senderName]);
  const rows = useMemo(() => {
    const out: GiftPhoto[][] = [];
    for (let i = 0; i < data.photos.length; i += 2) out.push(data.photos.slice(i, i + 2));
    return out;
  }, [data.photos]);

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

  const paper: CSSProperties = { backgroundColor: p.paper, backgroundImage: GRAIN, color: p.ink };

  return (
    <motion.div className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[max(13cqh,84px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        <motion.article className="relative rounded-[4px] px-[calc(6*var(--u))] pt-[calc(6*var(--u))] pb-[calc(7*var(--u))] shadow-[0_1px_2px_rgba(0,0,0,0.2),0_30px_50px_-24px_rgba(0,0,0,0.7)]" style={{ ...paper, rotate: -0.5 }} initial={{ opacity: 0, y: 120 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: reduce ? 0.3 : 1.1, ease: [0.22, 1, 0.36, 1] }}>
          <div aria-hidden="true" className="absolute -top-[calc(3*var(--u))] -right-[calc(2*var(--u))] size-[calc(13*var(--u))] rotate-[24deg] opacity-95">
            <Sticker id="leaf" />
          </div>
          <p className="text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{s.letter.replace("{name}", data.senderName)}</p>
          <div className="mt-[calc(3*var(--u))]">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" accent={p.accent} onDone={() => setDone(true)} />
          </div>
        </motion.article>

        {rows.length && done ? (
          <motion.p className="text-center text-[calc(3.2*var(--u))] tracking-[0.22em] uppercase" style={{ color: p.stripe }} initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 0.6 }}>
            {s.photos}
          </motion.p>
        ) : null}

        {rows.map((row, ri) => (
          <div key={ri} className="relative pt-[calc(4*var(--u))]">
            <div aria-hidden="true" className="absolute inset-x-[-4%] top-0 h-[calc(3*var(--u))]">
              <StringLine p={p} />
            </div>
            <div className={cn("grid gap-[calc(5*var(--u))] px-[calc(2*var(--u))]", row.length === 1 ? "grid-cols-1 justify-items-center" : "grid-cols-2")}>
              {row.map((photo, i) => {
                const idx = ri * 2 + i;
                return <Hanging key={photo.id} photo={photo} p={p} rot={layout[idx]?.rot ?? 0} sway={layout[idx]?.sway ?? 5} index={idx} reduce={reduce} narrow={row.length === 1} />;
              })}
            </div>
          </div>
        ))}

        {data.countdown ? (
          <div className="rounded-[4px] p-[calc(5*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]" style={paper}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className="relative rounded-[4px] p-[calc(5*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]" style={{ ...paper, rotate: "0.6deg" }}>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className="rounded-[4px] p-[calc(4*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]" style={paper}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </motion.div>
  );
}

/** A photo pegged to the string, swinging a little in the warm air. */
function Hanging({ photo, p, rot, sway, index, reduce, narrow }: { photo: GiftPhoto; p: Palette; rot: number; sway: number; index: number; reduce: boolean; narrow: boolean }) {
  return (
    // The swing is a CSS animation on the wrapper, so it composes with the figure's own entrance.
    <div className={cn(narrow ? "w-[60%]" : "w-full", !reduce && "fs-swing")} style={{ ["--sway" as string]: `${sway}s` } as CSSProperties}>
      <motion.figure
        className="relative m-0"
        style={{ rotate: rot }}
        initial={{ opacity: 0, y: -16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ type: "spring", stiffness: 140, damping: 14, delay: (index % 2) * 0.15 }}
      >
        <div aria-hidden="true" className="absolute -top-[calc(3.6*var(--u))] left-1/2 z-[2] h-[calc(8*var(--u))] w-[calc(3.4*var(--u))] -translate-x-1/2">
          <Peg />
        </div>
        <div className="bg-[#FFFDF8] p-[calc(2*var(--u))] pb-[calc(3*var(--u))] shadow-[0_14px_28px_-14px_rgba(0,0,0,0.7)]">
          <div className="aspect-[4/5] w-full overflow-hidden" style={{ background: p.woodDeep }}>
            <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
          </div>
          {photo.caption ? (
            <figcaption className="mt-[calc(2*var(--u))] text-center text-[calc(4.1*var(--u))] leading-tight break-words text-[#3A2E2A]" style={{ fontFamily: "var(--gift-font-hand)" }}>
              {photo.caption}
            </figcaption>
          ) : null}
        </div>
      </motion.figure>
    </div>
  );
}
