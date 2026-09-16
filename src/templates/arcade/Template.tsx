"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { RichMessage } from "../_shared/RichMessage";
import { Typewriter } from "../_shared/Typewriter";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, CoverPage, Float, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import type { ArcadeFields } from "./schema";
import { CatchGame, W, H, type GameState } from "./Game";
import { ARCADE_KEYFRAMES, Console, MINT_DEEP, PixelDrift, PRINT } from "./art";

const MONO = "ui-monospace, Menlo, monospace";
const INK = "#3F2E50";

/** Lavender page, cream light behind the console: the shelf the handheld stands on. */
const TONE: CoverTone = { page: "#E7E0F6", glow: ["rgba(255,250,236,.95)", "rgba(188,169,240,.5)"], accent: "#6A4A9C" };
const PATTERN =
  "radial-gradient(rgba(255,255,255,.55) calc(.85*var(--k)), transparent calc(.95*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))";

const STICKERS: StickerPlacement[] = [
  { id: "star", x: 10, y: 8, size: 12, rotate: -12 },
  { id: "sparkle", x: 90, y: 7, size: 8 },
  { id: "cloud", x: 6, y: 33, size: 14, rotate: -6 },
  { id: "candy", x: 94, y: 40, size: 12, rotate: 14 },
  { id: "balloons", x: 8, y: 88, size: 15, rotate: -8 },
  { id: "heart", x: 92, y: 90, size: 12, rotate: 12 },
];

const AMBIENCE: { kind: AmbienceKind; colors: string[]; count?: number }[] = [
  { kind: "sparkles", colors: ["#FFFFFF", "#FFE8A8"], count: 14 },
  { kind: "bokeh", colors: ["#FFD9E6", "#D9CCF7"], count: 6 },
];

const S = {
  en: {
    press: "press start",
    drag: "DRAG TO MOVE · CATCH {n}",
    level: "LEVEL {n}",
    clear: "LEVEL CLEAR",
    unlocked: "PHOTO UNLOCKED",
    next: "NEXT LEVEL",
    again: "TRY AGAIN",
    fail: "OUCH",
    win: "YOU WIN",
    score: "SCORE",
    read: "READ MESSAGE",
    crt: "CRT",
    skip: "SKIP LEVEL",
    quest: "QUEST",
    bad: "avoid the grey ones",
    for: "for",
  },
  es: {
    press: "pulsa start",
    drag: "ARRASTRA · ATRAPA {n}",
    level: "NIVEL {n}",
    clear: "NIVEL SUPERADO",
    unlocked: "FOTO DESBLOQUEADA",
    next: "SIGUIENTE NIVEL",
    again: "OTRA VEZ",
    fail: "AY",
    win: "HAS GANADO",
    score: "PUNTOS",
    read: "LEER MENSAJE",
    crt: "CRT",
    skip: "SALTAR NIVEL",
    quest: "QUEST",
    bad: "esquiva los grises",
    for: "para",
  },
};

type Phase = "title" | "playing" | "clear" | "fail" | "win";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ArcadeFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<CatchGame | null>(null);
  const [phase, setPhase] = useState<Phase>(mode === "preview" ? "win" : "title");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [crt, setCrt] = useState(data.fields.crt);
  const [extras, setExtras] = useState(mode === "preview");
  const levels = Math.max(1, Math.min(8, data.photos.length));
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const title = data.fields.title || `${data.recipientName.toUpperCase()} ${s.quest}`;

  const onClear = useCallback(
    (st: GameState) => {
      setScore(st.score);
      setPhase(st.level >= levels ? "win" : "clear");
      onEvent?.({ type: "progress", pct: Math.round((st.level / levels) * 80) });
    },
    [levels, onEvent],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode === "preview") return;
    const game = new CatchGame(canvas, {
      onCatch: (st) => setScore(st.score),
      onMiss: () => {},
      onLevelClear: onClear,
      onFail: () => setPhase("fail"),
    });
    game.perLevel = data.fields.perLevel;
    game.sprite = data.fields.item;
    game.accent = data.accentColor;
    game.reduced = !!reduce;
    gameRef.current = game;
    return () => game.stop();
  }, [mode, data.fields.perLevel, data.fields.item, data.accentColor, reduce, onClear]);

  const play = (lv: number) => {
    const game = gameRef.current;
    if (!game) return;
    game.enableSound();
    setLevel(lv);
    setPhase("playing");
    game.startLevel(lv);
    if (lv === 1 && phase === "title") onEvent?.({ type: "started" });
  };

  const move = (e: ReactPointerEvent) => {
    const frame = frameRef.current;
    const game = gameRef.current;
    if (!frame || !game) return;
    const r = frame.getBoundingClientRect();
    game.basketX = Math.max(14, Math.min(W - 14, ((e.clientX - r.left) / r.width) * W));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (e.key === "ArrowLeft") g.basketX = Math.max(14, g.basketX - 12);
      if (e.key === "ArrowRight") g.basketX = Math.min(W - 14, g.basketX + 12);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const photo = data.photos[Math.min(level, levels) - 1];

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, color: INK, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{ARCADE_KEYFRAMES}</style>
      <CoverPage tone={TONE} pattern={PATTERN} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={AMBIENCE} opacity={0.85} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[2]">
        <PixelDrift />
      </div>
      <StickerScatter items={STICKERS} reduce={!!reduce} className="z-[3]" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[calc(5*var(--k))] py-[calc(2.5*var(--k))]">
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>

        <motion.div
          className="relative mt-[calc(2.8*var(--k))]"
          initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.15 }}
        >
          {/* The float stops the moment the game starts, so the basket never chases a moving frame. */}
          <Float reduce={!!reduce} amount={phase === "title" ? 1 : 0} duration={6}>
            <Console
              name={data.recipientName}
              forLabel={s.for}
              meta={
                <span className="text-[calc(2.1*var(--k))] tracking-[0.18em] whitespace-nowrap text-white/45" style={{ fontFamily: MONO }}>
                  {s.level.replace("{n}", String(level))} / {levels}
                </span>
              }
              chin={
                <button
                  type="button"
                  onClick={() => setCrt((v) => !v)}
                  aria-pressed={crt}
                  aria-label={s.crt}
                  className="flex shrink-0 items-center gap-[calc(1.3*var(--k))] rounded-full px-[calc(1.8*var(--k))] py-[calc(1.1*var(--k))] outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  style={{ backgroundColor: "rgba(255,255,255,.58)", boxShadow: "inset 0 0 0 calc(.26*var(--k)) rgba(150,82,114,.35)" }}
                >
                  <span
                    aria-hidden="true"
                    className="relative block h-[calc(3.4*var(--k))] w-[calc(6.2*var(--k))] rounded-full transition-colors"
                    style={{ backgroundColor: crt ? MINT_DEEP : "rgba(120,70,95,.25)" }}
                  >
                    <span
                      className="absolute top-[calc(.45*var(--k))] size-[calc(2.5*var(--k))] rounded-full bg-white transition-[left] duration-200"
                      style={{ left: crt ? "calc(3.25*var(--k))" : "calc(.45*var(--k))" }}
                    />
                  </span>
                  <span className="text-[calc(1.9*var(--k))] tracking-[0.22em]" style={{ color: PRINT }}>
                    {s.crt}
                  </span>
                </button>
              }
            >
              {/* The screen well: the canvas, its aspect ratio and its pointer mapping, untouched. */}
              <div
                ref={frameRef}
                onPointerDown={move}
                onPointerMove={(e) => e.buttons === 1 && move(e)}
                className="relative mx-auto touch-none overflow-hidden rounded-[calc(1.2*var(--k))]"
                style={{ width: "calc(54*var(--k))", aspectRatio: `${W} / ${H}` }}
              >
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  className="block h-full w-full [image-rendering:pixelated]"
                  aria-label={title}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: "repeating-linear-gradient(0deg, rgba(0,0,0,.34) 0 calc(.3*var(--k)), transparent calc(.3*var(--k)) calc(.95*var(--k)))",
                    opacity: crt ? 1 : 0.3,
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(116deg, rgba(255,255,255,.28) 0 14%, rgba(255,255,255,.08) 24%, transparent 46%)" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[calc(1.2*var(--k))]"
                  style={{ boxShadow: "inset 0 0 calc(4*var(--k)) rgba(0,0,0,.6)" }}
                />

                {phase === "title" ? (
                  <button
                    type="button"
                    onClick={() => play(1)}
                    aria-label={s.press}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(2.2*var(--k))] px-[calc(3*var(--k))] text-center outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    style={{ backgroundColor: "rgba(10,13,24,.72)" }}
                  >
                    <p
                      className="text-[calc(4.6*var(--k))] leading-[1.15] font-bold tracking-[0.05em] text-balance [overflow-wrap:anywhere]"
                      style={{ fontFamily: MONO, color: "var(--gift-accent)", textShadow: "calc(.5*var(--k)) calc(.5*var(--k)) 0 rgba(0,0,0,.9)" }}
                    >
                      {title}
                      <span aria-hidden="true" className="ar-blink ml-[calc(.9*var(--k))] inline-block h-[calc(3.8*var(--k))] w-[calc(2.2*var(--k))] translate-y-[calc(.3*var(--k))] bg-current" />
                    </p>
                    <p className="text-[calc(2.3*var(--k))] leading-snug tracking-[0.1em] text-[#D6E9DE]/80" style={{ fontFamily: MONO }}>
                      {s.drag.replace("{n}", String(data.fields.perLevel))}
                    </p>
                    <p className="text-[calc(2*var(--k))] tracking-[0.08em] text-[#D6E9DE]/45" style={{ fontFamily: MONO }}>
                      {s.bad}
                    </p>
                  </button>
                ) : null}

                {phase === "clear" || phase === "win" || phase === "fail" ? (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(1.8*var(--k))] p-[calc(3*var(--k))] text-center"
                    style={{ backgroundColor: "rgba(10,13,24,.88)", fontFamily: MONO }}
                  >
                    {phase === "clear" || phase === "win" ? (
                      <>
                        <p className="text-[calc(2.8*var(--k))] font-bold tracking-[0.16em]" style={{ color: "var(--gift-accent)" }}>
                          {phase === "win" ? s.win : s.clear}
                        </p>
                        <p className="text-[calc(2*var(--k))] text-white/55">{s.unlocked}</p>
                        {photo ? (
                          <motion.figure
                            initial={{ scale: 0.6, rotate: -6 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 14 }}
                            className="w-[72%] bg-[#F2ECE0] p-[calc(.8*var(--k))]"
                          >
                            <img
                              src={photo.url}
                              alt={photo.alt ?? ""}
                              className="aspect-[4/3] w-full object-cover [image-rendering:auto]"
                            />
                            {photo.caption ? (
                              <figcaption className="mt-[calc(.6*var(--k))] truncate text-[calc(1.7*var(--k))] text-[#0b0d16]">
                                {photo.caption}
                              </figcaption>
                            ) : null}
                          </motion.figure>
                        ) : null}
                        <p className="text-[calc(1.9*var(--k))] text-white/70">
                          {s.score} {score}
                        </p>
                        {phase === "clear" ? (
                          <button
                            type="button"
                            onClick={() => play(level + 1)}
                            className="rounded-[calc(.8*var(--k))] px-[calc(3*var(--k))] py-[calc(1.4*var(--k))] text-[calc(2.2*var(--k))] font-bold tracking-[0.14em] text-[#0b0d16]"
                            style={{ background: "var(--gift-accent)" }}
                          >
                            ▶ {s.next}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setExtras(true);
                              onEvent?.({ type: "progress", pct: 90 });
                            }}
                            className="rounded-[calc(.8*var(--k))] px-[calc(3*var(--k))] py-[calc(1.4*var(--k))] text-[calc(2.2*var(--k))] font-bold tracking-[0.14em] text-[#0b0d16]"
                            style={{ background: "var(--gift-accent)" }}
                          >
                            ▶ {s.read}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-[calc(3.2*var(--k))] font-bold tracking-[0.16em] text-[#f07a67]">{s.fail}</p>
                        <p className="text-[calc(2*var(--k))] text-white/55">{s.level.replace("{n}", String(level))}</p>
                        <button
                          type="button"
                          onClick={() => play(level)}
                          className="rounded-[calc(.8*var(--k))] px-[calc(3*var(--k))] py-[calc(1.4*var(--k))] text-[calc(2.2*var(--k))] font-bold tracking-[0.14em] text-[#0b0d16]"
                          style={{ background: "var(--gift-accent)" }}
                        >
                          ▶ {s.again}
                        </button>
                        <button
                          type="button"
                          onClick={() => onClear({ level, caught: 0, misses: 0, score })}
                          className="text-[calc(1.8*var(--k))] text-white/55 underline"
                        >
                          {s.skip}
                        </button>
                      </>
                    )}
                  </motion.div>
                ) : null}
              </div>
            </Console>
          </Float>
          <span
            aria-hidden="true"
            className="absolute -bottom-[calc(1.8*var(--k))] left-1/2 h-[calc(4*var(--k))] w-[84%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-[calc(2.4*var(--k))]"
          />
        </motion.div>

        <TapPill tone={TONE} reduce={!!reduce} hidden={phase !== "title"} className="mt-[calc(5*var(--k))]">
          {s.press}
        </TapPill>
      </div>

      {/* Message */}
      <AnimatePresence>
        {extras ? (
          <motion.div
            key="extras"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
            className="absolute inset-0 z-30 scrollbar-none overflow-y-auto bg-[#0b0d16]"
          >
            <MessagePanel
              data={data}
              mode={mode}
              blocks={blocks}
              reduce={!!reduce}
              score={score}
              scoreLabel={s.score}
              onEvent={onEvent}
              onReact={onReact}
              onMakeOne={onMakeOne}
              onReplay={
                mode === "preview"
                  ? undefined
                  : () => {
                      setExtras(false);
                      setPhase("title");
                      setLevel(1);
                      setScore(0);
                    }
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

function MessagePanel({
  data,
  mode,
  blocks,
  reduce,
  score,
  scoreLabel,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<ArcadeFields>["data"];
  mode: TemplateProps["mode"];
  blocks: ReturnType<typeof parseRichText>;
  reduce: boolean;
  score: number;
  scoreLabel: string;
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
  return (
    <div
      className="mx-auto flex w-[min(90cqw,520px)] flex-col gap-5 pt-[max(10cqh,56px)] pb-[max(2rem,env(safe-area-inset-bottom))] text-[#e9e4d8]"
      style={{ fontFamily: "var(--gift-font-body)" }}
    >
      <p className="text-center font-mono text-[11px] tracking-[0.3em] opacity-60">
        {scoreLabel} {score} · ★★★
      </p>
      <div className="rounded-[6px] border-2 border-[#2a2f45] bg-[#12162a] p-6 sm:p-8">
        <h2
          className="font-mono text-[clamp(1.1rem,5cqw,1.4rem)] font-bold tracking-wider"
          style={{ color: "var(--gift-accent)" }}
        >
          {t("dear", { name: data.recipientName }).toUpperCase()}
        </h2>
        <div className="mt-4 text-[clamp(1rem,4.4cqw,1.1rem)] leading-relaxed [&_em]:opacity-80 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-white">
          {instant ? (
            <RichMessage
              blocks={blocks}
              stagger={mode === "preview" ? 0 : 0.5}
              onDone={() => setDone(true)}
            />
          ) : (
            <Typewriter blocks={blocks} active speed={40} onDone={() => setDone(true)} />
          )}
        </div>
        {done ? (
          <p
            className="mt-5 text-right font-mono text-sm tracking-widest"
            style={{ color: "var(--gift-accent)" }}
          >
            — {data.senderName.toUpperCase()}
          </p>
        ) : null}
      </div>
      {done && data.countdown ? (
        <div className="rounded-[6px] border-2 border-[#2a2f45] bg-[#12162a] p-5">
          <Countdown countdown={data.countdown} locale={data.locale} tone="dark" />
        </div>
      ) : null}
      {done && data.surprise ? (
        <div className="rounded-[6px] border-2 border-[#2a2f45] bg-[#12162a] p-5">
          <p className="mb-3 text-center font-mono text-[10px] tracking-[0.3em] opacity-60">
            {t("ps").toUpperCase()}
          </p>
          <SurpriseReveal
            surprise={data.surprise}
            locale={data.locale}
            tone="dark"
            onReveal={() => onEvent?.({ type: "surprise" })}
          />
        </div>
      ) : null}
      {done ? (
        <div ref={endRef} className="pt-2">
          <EndScreen
            data={data}
            tone="dark"
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={onReplay}
          />
        </div>
      ) : null}
    </div>
  );
}
