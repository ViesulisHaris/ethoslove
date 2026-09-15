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
import { Confetti } from "../_shared/Confetti";
import { Cat, Cobweb, Ghost, House, Moon, PALETTES, Pumpkin, ScrollRoll, type Palette } from "./art";
import type { TrickOrTreatFields } from "./schema";

const S = {
  en: { ring: "ring the bell", door: "trick or treat?", trick: "trick", treat: "treat", boo: "BOO!", fine: "…fine. treat.", sign: "happy halloween", scroll: "a note from {name}", gallery: "the haunted gallery" },
  es: { ring: "llama al timbre", door: "¿truco o trato?", trick: "truco", treat: "trato", boo: "¡BUU!", fine: "…vale. trato.", sign: "feliz halloween", scroll: "una nota de {name}", gallery: "la galería encantada" },
};

const KEYFRAMES = `
.tt-flicker{animation:tt-flick 1.3s ease-in-out infinite alternate}
@keyframes tt-flick{0%{opacity:.85}40%{opacity:1}60%{opacity:.8}100%{opacity:1}}
.tt-glow{transform-origin:50% 50%;animation:tt-breathe 2.2s ease-in-out infinite alternate}
@keyframes tt-breathe{from{transform:scale(.94);opacity:.8}to{transform:scale(1.06);opacity:1}}
.tt-float{animation:tt-hover 3.2s ease-in-out infinite alternate}
@keyframes tt-hover{from{translate:0 0}to{translate:0 -8px}}
@media (prefers-reduced-motion: reduce){.tt-flicker,.tt-glow,.tt-float{animation:none}}
`;

/** The grain of the parchment. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.35 0 0 0 0 0.2 0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

type Stage = "porch" | "door" | "trick" | "treat" | "inside";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<TrickOrTreatFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const p = PALETTES[data.fields.palette] ?? PALETTES.midnight;
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "inside" : "porch");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const sign = data.fields.sign?.trim() || s.sign.replace("{name}", data.recipientName);
  const doorLine = data.fields.doorLine?.trim() || s.door;
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const ring = () => {
    if (stage !== "porch") return;
    void audio.start();
    eventRef.current?.({ type: "started" });
    setStage("door");
  };

  const goInside = (after: number) => {
    window.setTimeout(() => {
      setStage("inside");
      eventRef.current?.({ type: "progress", pct: 40 });
    }, reduce ? 300 : after);
  };

  const choose = (choice: "trick" | "treat") => {
    if (stage !== "door") return;
    if (choice === "treat") {
      setBurst((b) => b + 1);
      setStage("treat");
      goInside(2200);
    } else {
      setStage("trick");
      window.setTimeout(() => setBurst((b) => b + 1), reduce ? 200 : 1700);
      goInside(3200);
    }
  };

  const replay = () => {
    setStage("porch");
    setRun((r) => r + 1);
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 70%, ${p.ground} 100%)`, color: p.paper, fontFamily: "var(--gift-font-body)", ["--k" as string]: "min(var(--u), 0.5cqh)" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {/* stars */}
      <div aria-hidden="true" className="absolute inset-0 opacity-80" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.85) calc(.32*var(--u)), transparent calc(.45*var(--u))), radial-gradient(rgba(255,255,255,.45) calc(.22*var(--u)), transparent calc(.34*var(--u)))", backgroundSize: "calc(14*var(--u)) calc(14*var(--u)), calc(19*var(--u)) calc(19*var(--u))", backgroundPosition: "0 0, calc(7*var(--u)) calc(9*var(--u))" }} />
      {/* bats and a few sparkles, the whole night */}
      <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
        <Ambience layers={[{ kind: "bats", colors: ["#120A22", "#1C1030"], count: stage === "trick" ? 14 : stage === "inside" ? 3 : 5 }, { kind: "sparkles", colors: ["#FFFFFF", p.glow], count: 10 }]} opacity={0.95} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "inside" ? (
          <Porch key={`porch-${run}`} p={p} s={s} data={data} stage={stage} sign={sign} doorLine={doorLine} reduce={!!reduce} onRing={ring} onChoose={choose} />
        ) : (
          <Inside key={`inside-${run}`} p={p} s={s} t={t} data={data} mode={mode} blocks={blocks} reduce={!!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} />
        )}
      </AnimatePresence>

      {/* sweets from the door */}
      <Confetti burst={burst} colors={p.candy} count={220} origin={{ x: 0.5, y: 0.62 }} className="pointer-events-none absolute inset-0 z-30" />
      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

function Host({ kind, p, mood }: { kind: TrickOrTreatFields["host"]; p: Palette; mood: "shy" | "happy" | "boo" }) {
  if (kind === "cat") return <Cat mood={mood} />;
  if (kind === "pumpkin") return <Pumpkin p={p} lit={mood !== "shy"} />;
  return <Ghost mood={mood} />;
}

function Porch({ p, s, data, stage, sign, doorLine, reduce, onRing, onChoose }: { p: Palette; s: (typeof S)["en"]; data: TemplateProps<TrickOrTreatFields>["data"]; stage: Stage; sign: string; doorLine: string; reduce: boolean; onRing: () => void; onChoose: (c: "trick" | "treat") => void }) {
  const doorOpen = stage !== "porch";
  const mood: "shy" | "happy" | "boo" = stage === "trick" ? "boo" : stage === "treat" ? "happy" : "shy";
  const bubble = stage === "trick" ? s.boo : stage === "treat" ? "♥" : doorLine;
  const [afterBoo, setAfterBoo] = useState(false);
  useEffect(() => {
    if (stage !== "trick") return;
    const id = window.setTimeout(() => setAfterBoo(true), reduce ? 200 : 1600);
    return () => window.clearTimeout(id);
  }, [stage, reduce]);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5 } }}
      animate={stage === "trick" && !afterBoo && !reduce ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* the moon */}
      <motion.div aria-hidden="true" className="absolute" style={{ right: "max(calc(6 * var(--k)), calc(50% - 46 * var(--k)))", top: "calc(5 * var(--k))", width: "calc(30 * var(--k))", height: "calc(30 * var(--k))" }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }}>
        <Moon p={p} />
      </motion.div>

      {/* their name, big, in the handwriting */}
      <motion.p
        className="absolute max-w-[calc(56*var(--k))] text-[calc(11*var(--k))] leading-none"
        style={{ left: "max(calc(6 * var(--k)), calc(50% - 46 * var(--k)))", top: "calc(10 * var(--k))", fontFamily: "var(--gift-font-hand)", color: p.glow, textShadow: `0 0 calc(4*var(--k)) ${p.glow}66` }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
      >
        {data.title || data.recipientName}
      </motion.p>

      {/* the house */}
      <motion.div className="absolute left-1/2 -translate-x-1/2" style={{ top: "calc(30 * var(--k))", width: "calc(78 * var(--k))", height: "calc(92 * var(--k))", filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.5))" }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <House p={p} doorOpen={doorOpen} lit={doorOpen} sign={sign} />
      </motion.div>

      {/* the pumpkin on the step */}
      <motion.div className="absolute z-[3]" style={{ left: "calc(50% - 38 * var(--k))", top: "calc(104 * var(--k))", width: "calc(24 * var(--k))", height: "calc(22 * var(--k))" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}>
        <Pumpkin p={p} lit={stage === "treat" || stage === "trick"} />
      </motion.div>

      {/* the host, out of the door */}
      <AnimatePresence>
        {doorOpen ? (
          <motion.div
            key="host"
            className={cn("absolute left-1/2 z-[4] -translate-x-1/2", !reduce && data.fields.host === "ghost" && "tt-float")}
            style={{ top: "calc(88 * var(--k))", width: "calc(26 * var(--k))", height: "calc(28 * var(--k))" }}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={stage === "trick" && !afterBoo ? { opacity: 1, y: -18, scale: 1.35 } : { opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
          >
            <Host kind={data.fields.host} p={p} mood={mood} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* the speech bubble */}
      <AnimatePresence mode="wait">
        {doorOpen ? (
          <motion.div
            key={`bubble-${stage}-${afterBoo}`}
            className="absolute left-1/2 z-[6] max-w-[calc(70*var(--k))] -translate-x-1/2 rounded-[calc(4*var(--k))] px-[calc(4.5*var(--k))] py-[calc(2.4*var(--k))] text-center leading-snug shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
            style={{ top: "calc(66 * var(--k))", background: "#FFFDF7", color: "#2A2140", fontSize: stage === "trick" && !afterBoo ? "calc(8*var(--k))" : "calc(4.8*var(--k))", fontWeight: stage === "trick" && !afterBoo ? 800 : 500 }}
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
          >
            {stage === "trick" && afterBoo ? s.fine : bubble}
            <span aria-hidden="true" className="absolute left-1/2 -bottom-[calc(2*var(--k))] size-[calc(3.6*var(--k))] -translate-x-1/2 rotate-45 rounded-[3px]" style={{ background: "#FFFDF7" }} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* the bell, then the choice */}
      <div className="absolute inset-x-0 z-[8] flex flex-col items-center gap-[calc(3*var(--k))]" style={{ top: "calc(128 * var(--k))" }}>
        {stage === "porch" ? (
          <motion.button
            type="button"
            onClick={onRing}
            aria-label={s.ring}
            className="flex items-center gap-[calc(2.5*var(--k))] rounded-full px-[calc(6*var(--k))] py-[calc(2.6*var(--k))] text-[calc(3.6*var(--k))] font-semibold tracking-[0.18em] uppercase shadow-[0_12px_30px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            style={{ background: p.accent, color: "#1A0F2A" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, scale: reduce ? 1 : [1, 1.04, 1] }}
            transition={{ opacity: { delay: 1, duration: 0.5 }, y: { delay: 1, type: "spring", stiffness: 200, damping: 14 }, scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 1.8 } }}
            whileTap={{ scale: 0.95 }}
          >
            <span aria-hidden="true" className="grid size-[calc(5*var(--k))] place-items-center rounded-full" style={{ background: "#1A0F2A" }}>
              <span className="size-[calc(2*var(--k))] rounded-full" style={{ background: p.glow, boxShadow: `0 0 calc(2*var(--k)) ${p.glow}` }} />
            </span>
            {s.ring}
          </motion.button>
        ) : stage === "door" ? (
          <motion.div className="flex gap-[calc(3*var(--k))]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            {(["trick", "treat"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChoose(c)}
                className="rounded-full px-[calc(7*var(--k))] py-[calc(2.8*var(--k))] text-[calc(4*var(--k))] font-bold tracking-[0.16em] uppercase shadow-[0_12px_30px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-4 focus-visible:ring-white/60 active:scale-95"
                style={c === "treat" ? { background: p.accent, color: "#1A0F2A" } : { background: "rgba(255,253,247,0.12)", color: p.paper, border: `2px solid ${p.trim}`, backdropFilter: "blur(6px)" }}
              >
                {s[c]}
              </button>
            ))}
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}

function Inside({ p, s, t, data, mode, blocks, reduce, onEvent, onReact, onMakeOne, onReplay }: { p: Palette; s: (typeof S)["en"]; t: ReturnType<typeof useGiftStrings>; data: TemplateProps<TrickOrTreatFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const [done, setDone] = useState(mode === "preview");
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const layout = useMemo(() => {
    const rng = mulberry32(hashString(data.recipientName + data.senderName + "boo"));
    return data.photos.map(() => ({ rot: (rng() - 0.5) * 6, web: rng() > 0.5 ? "left" : "right" }));
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

  const parchment: CSSProperties = { background: p.paper, backgroundImage: GRAIN, color: p.ink };

  return (
    <motion.div className="absolute inset-0 z-10" style={{ background: p.room }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
      {/* candlelight and drifting dust in the hall */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "dust", colors: [p.glow, "#FFFFFF"], count: 18 }, { kind: "bokeh", colors: [p.glow, p.accent], count: 8 }]} opacity={0.8} />
      </div>
      {/* the host peeks in from the corner, pinned while the scroll moves under it (the mute button owns the other corner) */}
      <motion.div aria-hidden="true" className={cn("pointer-events-none absolute top-[calc(3*var(--u))] left-[calc(2*var(--u))] z-20 w-[calc(18*var(--u))]", !reduce && data.fields.host === "ghost" && "tt-float")} initial={{ x: -80, rotate: -14, opacity: 0 }} animate={{ x: 0, rotate: -8, opacity: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 140, damping: 14 }}>
        <div className="aspect-[100/110] w-full">
          <Host kind={data.fields.host} p={p} mood="happy" />
        </div>
      </motion.div>

      <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
      <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[calc(22*var(--u))] pb-[calc(72px+env(safe-area-inset-bottom))]">
        {/* the scroll */}
        <motion.article className="relative" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <div aria-hidden="true" className="relative z-[2] mx-[-3%] h-[calc(4*var(--u))] drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">
            <ScrollRoll p={p} />
          </div>
          <div className="px-[calc(6*var(--u))] pt-[calc(5*var(--u))] pb-[calc(6*var(--u))] shadow-[0_30px_50px_-24px_rgba(0,0,0,0.8)]" style={parchment}>
            <p className="text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{s.scroll.replace("{name}", data.senderName)}</p>
            <div className="mt-[calc(3*var(--u))]">
              <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" accent={p.accent} onDone={() => setDone(true)} />
            </div>
          </div>
          <div aria-hidden="true" className="relative z-[2] mx-[-3%] h-[calc(4*var(--u))] drop-shadow-[0_-4px_8px_rgba(0,0,0,0.3)]">
            <ScrollRoll p={p} flip />
          </div>
        </motion.article>

        {data.photos.length && done ? (
          <motion.p className="text-center text-[calc(3.2*var(--u))] tracking-[0.22em] uppercase" style={{ color: p.trim }} initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ delay: 0.6 }}>
            {s.gallery}
          </motion.p>
        ) : null}

        {data.photos.length ? (
          <div className="grid grid-cols-2 gap-x-[calc(5*var(--u))] gap-y-[calc(7*var(--u))] px-[calc(1*var(--u))]">
            {data.photos.map((photo, i) => (
              <Portrait key={photo.id} photo={photo} p={p} rot={layout[i]?.rot ?? 0} web={(layout[i]?.web ?? "left") as "left" | "right"} index={i} />
            ))}
          </div>
        ) : null}

        {data.countdown ? (
          <div className="rounded-[calc(3*var(--u))] p-[calc(5*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)]" style={parchment}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className="relative rounded-[calc(3*var(--u))] p-[calc(5*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)]" style={parchment}>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className="rounded-[calc(3*var(--u))] p-[calc(4*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)]" style={parchment}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
      </div>
    </motion.div>
  );
}

/** A photo in a haunted frame: an arched gilt frame, a cobweb in one corner, a brass plate. */
function Portrait({ photo, p, rot, web, index }: { photo: GiftPhoto; p: Palette; rot: number; web: "left" | "right"; index: number }) {
  return (
    <motion.figure
      className="relative m-0"
      style={{ rotate: rot }}
      initial={{ opacity: 0, y: 28, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 14, delay: (index % 2) * 0.12 }}
    >
      <div
        className="relative overflow-hidden p-[calc(2.2*var(--u))]"
        style={{
          borderRadius: "calc(50*var(--u)) calc(50*var(--u)) calc(2*var(--u)) calc(2*var(--u)) / calc(38*var(--u)) calc(38*var(--u)) calc(2*var(--u)) calc(2*var(--u))",
          background: `linear-gradient(135deg, ${p.frame}, #6B4A14 45%, ${p.frame} 70%, #8A6420)`,
          boxShadow: "0 16px 30px -12px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.35)",
        }}
      >
        <div className="aspect-[4/5] w-full overflow-hidden" style={{ borderRadius: "inherit", background: "#0B0616" }}>
          <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </div>
        <Cobweb className={cn("pointer-events-none absolute top-0 size-[calc(9*var(--u))]", web === "left" ? "left-0" : "right-0 -scale-x-100")} />
      </div>
      {photo.caption ? (
        <figcaption className="mx-auto mt-[calc(1.5*var(--u))] w-[92%] rounded-[2px] px-[calc(1.5*var(--u))] py-[calc(1*var(--u))] text-center text-[calc(2.7*var(--u))] leading-tight tracking-[0.06em] uppercase" style={{ background: `linear-gradient(180deg, ${p.frame}, #8A6420)`, color: "#2A1A08", boxShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
          {photo.caption}
        </figcaption>
      ) : null}
    </motion.figure>
  );
}
