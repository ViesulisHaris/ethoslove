"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Smartphone } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { mix, rgba } from "../_shared/theme";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { CLOTHS, KEYFRAMES, Kitchen, PALETTES, SCENE, bowlColor, ingredientColor, scenePart, streamPath, type Palette } from "./art";
import { useStir, useTilt } from "./use-motion";
import {
  IDLE_POUR,
  IDLE_STIR,
  STEADY_MS,
  TILT_FULL,
  advancePour,
  cardSlots,
  ingredientLines,
  pourDone,
  promptFor,
  shakeStir,
  stirDone,
  tapStir,
  tipFor,
  type Pour,
  type PourPrompt,
  type Stir,
} from "./pour";
import { fieldsSchema, type RecipeBoxFields } from "./schema";

export const S = {
  en: {
    starter: ["two cups of patience", "a whole Sunday of her time", 'one pinch of "eat something"'],
    recipeName: "{name}, from scratch",
    makes: "Makes one of her. There is no substitute.",
    ingredients: "ingredients",
    method: "method",
    tilt: "tilt your phone to pour",
    more: "keep going…",
    holding: "hold it there…",
    pouring: "that's it — it's going in",
    levelOff: "level it off to stop",
    pourBtn: "pour",
    stirBtn: "stir",
    orTap: "or tap — it does the same",
    tapPour: "or tap to pour instead",
    tapStir: "or tap to stir instead",
    noTilt: "no tilt on this phone — tap to pour",
    noShake: "no shake on this phone — tap to stir",
    allowMotion: "let it feel the phone",
    allIn: "everything's in",
    shake: "shake your phone to stir",
    stirring: "keep shaking…",
    mixing: "keep going…",
    stirred: "mixed",
    step: "{i} of {n}",
    fromBox: "from {sender}'s recipe box",
    photos: "kept in the box with it",
    // Said out loud rather than shown: the buttons already carry one word each.
    pourAria: "pour this jar into the bowl",
    stirAria: "stir the bowl",
    allowAria: "let this gift read the phone's tilt and shake",
    pourMeter: "how much of this jar has gone in",
    stirMeter: "how mixed it is",
  },
  es: {
    starter: ["dos tazas de paciencia", "un domingo entero de su tiempo", "una pizca de «come algo»"],
    recipeName: "{name}, desde cero",
    makes: "Sale una como ella. No hay sustituto.",
    ingredients: "ingredientes",
    method: "preparación",
    tilt: "inclina el móvil para verter",
    more: "un poco más…",
    holding: "aguanta así…",
    pouring: "eso es, ya está cayendo",
    levelOff: "ponlo recto para parar",
    pourBtn: "verter",
    stirBtn: "mezclar",
    orTap: "o toca: hace lo mismo",
    tapPour: "o toca para verter",
    tapStir: "o toca para mezclar",
    noTilt: "no nota la inclinación — toca para verter",
    noShake: "no nota el movimiento — toca para mezclar",
    allowMotion: "deja que note el movimiento",
    allIn: "ya está todo dentro",
    shake: "agita el móvil para mezclar",
    stirring: "sigue agitando…",
    mixing: "sigue mezclando…",
    stirred: "mezclado",
    step: "{i} de {n}",
    fromBox: "de la caja de recetas de {sender}",
    photos: "guardadas en la caja con ella",
    pourAria: "verter este tarro en el bol",
    stirAria: "remover el bol",
    allowAria: "deja que este regalo note la inclinación y el movimiento del móvil",
    pourMeter: "cuánto ha caído de este tarro",
    stirMeter: "cómo va la mezcla",
  },
};

type Strings = (typeof S)["en"];
type Stage = "pour" | "stir" | "reading";

const fmt = (line: string, vars: Record<string, string | number>) =>
  line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const surfaceY = (fill: number) =>
  SCENE.bowl.empty + (SCENE.bowl.full - SCENE.bowl.empty) * Math.min(1, Math.max(0, fill));

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<RecipeBoxFields>) {
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const animate = !preview && !reduce;
  const audio = useGiftAudio(data.music, !preview);
  // Parsed here too, so a draft saved before a field changed shape still cooks instead of crashing.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);

  const p = PALETTES[fields.counter] ?? PALETTES.oak;
  const cloth = CLOTHS[fields.cloth] ?? CLOTHS.tomato;
  const lines = useMemo(() => ingredientLines(fields.ingredients, s.starter), [fields.ingredients, s]);
  const recipeName = fields.recipeName.trim() || fmt(s.recipeName, { name: data.recipientName });
  const makes = fields.makes.trim() || s.makes;

  const [stage, setStage] = useState<Stage>("pour");
  // In the editor's still frame the card is already half written and the last jar is pouring.
  const [poured, setPoured] = useState(preview ? Math.max(0, lines.length - 1) : 0);
  const [run, setRun] = useState(0);

  const sceneRef = useRef<HTMLDivElement>(null);

  const eventRef = useRef(onEvent);
  const startedRef = useRef(false);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const { start } = audio;
  const begin = useCallback(() => {
    if (startedRef.current || preview) return;
    startedRef.current = true;
    void start();
    eventRef.current?.({ type: "started" });
  }, [preview, start]);

  const onFilled = useCallback(() => {
    setPoured((n) => {
      const next = n + 1;
      eventRef.current?.({ type: "progress", pct: Math.round((next / Math.max(1, lines.length)) * 45) });
      return next;
    });
  }, [lines.length]);

  const allIn = poured >= lines.length;
  // A beat to read the last line before the spoon comes out.
  useEffect(() => {
    if (!allIn || preview || stage !== "pour") return;
    const id = window.setTimeout(() => setStage("stir"), reduce ? 350 : 1100);
    return () => window.clearTimeout(id);
  }, [allIn, preview, reduce, stage]);

  const onStirred = useCallback(() => {
    eventRef.current?.({ type: "progress", pct: 65 });
    setStage("reading");
  }, []);

  const replay = () => {
    setPoured(0);
    setStage("pour");
    setRun((r) => r + 1);
  };

  const slots = useMemo(() => cardSlots(lines.length, SCENE.lines.top, SCENE.lines.bottom), [lines.length]);
  const rules = useMemo(
    () => lines.map((_, i) => slots.top + slots.slot * (i + 1) - 0.4),
    [lines, slots],
  );

  // What the bowl holds, and what the jar in hand is pouring.
  const previewFill = preview ? (lines.length - 0.45) / Math.max(1, lines.length) : poured / Math.max(1, lines.length);
  const jarIndex = Math.min(poured, lines.length - 1);
  const batter = bowlColor(preview ? lines.length : Math.min(lines.length, poured + 1));

  const room = {
    background: p.wood,
    color: p.ink,
    fontFamily: "var(--gift-font-body)",
    ["--k" as string]: "var(--u)",
    ["--top" as string]: `max(0px, calc((100cqh - ${SCENE.h} * var(--k)) / 2))`,
  } as CSSProperties;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={room}>
      <style>{KEYFRAMES}</style>
      {/* the wall and the counter carry on past the scene, to the edges of the phone */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{ height: `calc(var(--top) + ${SCENE.counter} * var(--k))`, background: p.wall }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0"
        style={{ top: `calc(var(--top) + ${SCENE.counter} * var(--k))`, background: p.wood }}
      />

      <AnimatePresence mode="wait">
        {stage !== "reading" ? (
          <motion.div
            key={`kitchen-${run}`}
            className="absolute inset-0"
            exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.45 } }}
          >
            <div
              ref={sceneRef}
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: "var(--top)", width: `calc(${SCENE.w} * var(--k))`, height: `calc(${SCENE.h} * var(--k))` }}
            >
              <Kitchen
                p={p}
                cloth={cloth}
                jarColor={ingredientColor(jarIndex)}
                batter={batter}
                rules={rules}
                tip={preview ? 48 : 0}
                jarFill={preview ? 0.45 : 1}
                fill={previewFill}
                pouring={preview}
                step={fmt(s.step, { i: Math.min(poured + 1, lines.length), n: lines.length })}
                showJar={!allIn || preview}
                showSpoon={stage === "stir"}
                reduce={!animate}
              />

              {/* the writing on the card */}
              <div
                className="pointer-events-none absolute"
                style={{
                  left: `calc(${SCENE.card.x} * var(--k))`,
                  top: `calc(${SCENE.card.y} * var(--k))`,
                  width: `calc(${SCENE.card.w} * var(--k))`,
                  height: `calc(${SCENE.card.h} * var(--k))`,
                  rotate: `${SCENE.card.rot}deg`,
                }}
              >
                <p
                  className="absolute line-clamp-2 text-center leading-[1.05]"
                  style={{
                    left: "calc(5 * var(--k))",
                    top: "calc(2.2 * var(--k))",
                    width: `calc(${SCENE.card.w - 10} * var(--k))`,
                    fontFamily: "var(--gift-font-hand)",
                    fontSize: `calc(${recipeName.length > 22 ? 4.5 : 6.2} * var(--k))`,
                    color: cloth.on,
                  }}
                >
                  {recipeName}
                </p>
                <p
                  className="absolute line-clamp-2 text-center text-balance"
                  style={{
                    left: "calc(9 * var(--k))",
                    top: `calc(${SCENE.card.band + 1.4} * var(--k))`,
                    width: `calc(${SCENE.card.w - 18} * var(--k))`,
                    fontSize: "calc(2.9 * var(--k))",
                    lineHeight: 1.15,
                    color: p.soft,
                  }}
                >
                  {makes}
                </p>
                <p
                  className="absolute font-semibold tracking-[0.3em] uppercase"
                  style={{
                    left: `calc(${SCENE.lines.left - SCENE.card.x} * var(--k))`,
                    top: `calc(${SCENE.card.band + 10.6} * var(--k))`,
                    fontSize: "calc(2.5 * var(--k))",
                    color: p.soft,
                    opacity: 0.8,
                  }}
                >
                  {s.ingredients}
                </p>
                {lines.map((line, i) => (
                  <div
                    key={`${i}-${line}`}
                    className="absolute flex items-start"
                    style={{
                      left: `calc(${SCENE.lines.left - SCENE.card.x} * var(--k))`,
                      top: `calc(${slots.top - SCENE.card.y + slots.slot * i} * var(--k))`,
                      width: `calc(${SCENE.lines.right - SCENE.lines.left} * var(--k))`,
                      height: `calc(${slots.slot} * var(--k))`,
                      gap: "calc(1.4 * var(--k))",
                    }}
                  >
                    {i < poured || preview ? (
                      <motion.span
                        className="flex min-w-0 items-start"
                        style={{ gap: "calc(1.4 * var(--k))" }}
                        initial={animate ? { opacity: 0, y: 4, filter: "blur(2px)" } : false}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <svg
                          viewBox="0 0 12 12"
                          className="shrink-0"
                          style={{ width: `calc(${slots.font * 0.8} * var(--k))`, height: `calc(${slots.font * 0.8} * var(--k))`, marginTop: `calc(${slots.font * 0.18} * var(--k))` }}
                          aria-hidden="true"
                        >
                          <path d="M1.5 6.4 4.6 9.6 10.5 2.4" fill="none" stroke="var(--gift-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span
                          className="line-clamp-2 min-w-0"
                          style={{ fontFamily: "var(--gift-font-hand)", fontSize: `calc(${slots.font} * var(--k))`, lineHeight: 1.04, color: p.ink }}
                        >
                          {line}
                        </span>
                      </motion.span>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* who it's from — an empty name in a half-filled draft leaves no stray arrow */}
              <p
                className="absolute inset-x-0 truncate px-[calc(8*var(--k))] text-center font-semibold tracking-[0.3em] uppercase"
                style={{ top: "calc(4.6 * var(--k))", fontSize: "calc(2.9 * var(--k))", color: p.soft }}
              >
                {[data.senderName?.trim(), data.recipientName?.trim()].filter(Boolean).join(" → ")}
              </p>

              {/* the hands */}
              <div
                className="absolute inset-x-0 flex flex-col items-center"
                style={{ top: `calc(${SCENE.hands} * var(--k))` }}
              >
                {preview ? (
                  <Pill p={p}>{s.tilt}</Pill>
                ) : allIn && stage === "pour" ? (
                  <Pill p={p} tone="loud">{s.allIn}</Pill>
                ) : stage === "pour" ? (
                  <PourHand
                    key={`pour-${run}`}
                    s={s}
                    p={p}
                    scene={sceneRef}
                    index={poured}
                    total={lines.length}
                    reduce={!!reduce}
                    animate={animate}
                    begin={begin}
                    onFilled={onFilled}
                  />
                ) : (
                  <StirHand
                    key={`stir-${run}`}
                    s={s}
                    p={p}
                    scene={sceneRef}
                    reduce={!!reduce}
                    animate={animate}
                    begin={begin}
                    onStirred={onStirred}
                  />
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <Reading
            key={`reading-${run}`}
            p={p}
            cloth={cloth}
            s={s}
            data={data}
            mode={mode}
            lines={lines}
            recipeName={recipeName}
            makes={makes}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        )}
      </AnimatePresence>

      {/* flour in the light. Ambience draws a still frame under reduced motion, so only the
          editor's frozen preview goes without it. */}
      {!preview ? (
        <div className="pointer-events-none absolute inset-0 z-[30]" aria-hidden="true">
          <Ambience layers={[{ kind: "dust", colors: ["#FFF6E4", "#F3DEBB", "#FFFFFF"], count: 14 }]} opacity={0.6} />
        </div>
      ) : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/**
 * The line that tells them what to do, on a little enamel plaque. It is the running commentary on
 * a thing you do with your hands, so it is announced as it changes rather than only drawn.
 */
function Pill({ p, children, tone = "quiet" }: { p: Palette; children: React.ReactNode; tone?: "quiet" | "loud" }) {
  return (
    <p
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-rb-prompt
      className="max-w-[calc(92*var(--k))] line-clamp-2 rounded-full text-center leading-[1.25] font-semibold tracking-[0.18em] uppercase"
      style={{
        padding: "calc(2.2 * var(--k)) calc(5 * var(--k))",
        fontSize: "calc(3 * var(--k))",
        background: tone === "loud" ? "var(--gift-accent)" : "#FFFBF2",
        color: tone === "loud" ? "var(--gift-on-accent)" : p.ink,
        boxShadow: "0 calc(2*var(--k)) calc(5*var(--k)) rgba(60,40,20,0.18)",
      }}
    >
      {children}
    </p>
  );
}

/**
 * The bar that fills while they pour or stir: the phone answering, frame by frame. The frame loop
 * writes it through `setMeter` rather than through state, so sixty frames a second cost no renders.
 */
function Meter({ barRef, p, label }: { barRef: RefObject<HTMLDivElement | null>; p: Palette; label: string }) {
  return (
    <div
      className="overflow-hidden rounded-full"
      style={{
        width: "calc(46 * var(--k))",
        height: "calc(2.8 * var(--k))",
        background: "#FFFBF2",
        boxShadow: `inset 0 0 0 calc(0.4*var(--k)) ${rgba(p.ink, 0.18)}, 0 calc(0.6*var(--k)) calc(2*var(--k)) ${rgba(p.ink, 0.14)}`,
      }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      data-rb-meter
    >
      <div
        ref={barRef}
        aria-hidden="true"
        className="h-full rounded-full"
        style={{ width: "0%", background: "var(--gift-accent)", transition: "width .09s linear" }}
      />
    </div>
  );
}

/** Moves the bar and tells anyone listening how far along it is, in one place. */
function setMeter(bar: HTMLDivElement | null, fraction: number) {
  if (!bar) return;
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  if (bar.dataset.pct === String(pct)) return;
  bar.dataset.pct = String(pct);
  bar.style.width = `${pct}%`;
  bar.parentElement?.setAttribute("aria-valuenow", String(pct));
}

/** The honest way out, kept under the sensor button rather than instead of it. */
function TextButton({ p, onClick, label, aria, tag }: { p: Palette; onClick: () => void; label: string; aria: string; tag: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      data-rb-action={tag}
      className="rounded-full underline underline-offset-2 active:scale-[0.97]"
      style={{
        padding: "calc(0.8 * var(--k)) calc(2.4 * var(--k))",
        fontSize: "calc(2.9 * var(--k))",
        color: "#5C3B22",
        textDecorationColor: rgba(p.ink, 0.35),
        textShadow: "0 calc(0.25 * var(--k)) 0 rgba(255,252,244,0.7)",
      }}
    >
      {label}
    </button>
  );
}

function SmallButton({
  p,
  onClick,
  icon,
  label,
  aria,
  tag,
}: { p: Palette; onClick: () => void; icon: React.ReactNode; label: string; aria: string; tag: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      data-rb-action={tag}
      className="flex items-center rounded-full font-semibold tracking-[0.18em] uppercase active:scale-[0.97]"
      style={{
        minHeight: "calc(11 * var(--k))",
        gap: "calc(1.8 * var(--k))",
        padding: "calc(2.2 * var(--k)) calc(5.4 * var(--k))",
        fontSize: "calc(3 * var(--k))",
        background: "var(--gift-accent)",
        color: "var(--gift-on-accent)",
        boxShadow: `0 calc(2*var(--k)) calc(6*var(--k)) ${rgba(p.ink, 0.28)}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * The tilt, and everything it moves. Its own component, remounted on replay, so the sensor is
 * listened to afresh every time and let go the moment the last ingredient is in.
 */
function PourHand({
  s,
  p,
  scene,
  index,
  total,
  reduce,
  animate,
  begin,
  onFilled,
}: {
  s: Strings;
  p: Palette;
  /** The scene, so the loop can find the jar and the bowl inside it. */
  scene: RefObject<HTMLDivElement | null>;
  /** How many are already in: the bowl starts this full. */
  index: number;
  total: number;
  reduce: boolean;
  animate: boolean;
  begin: () => void;
  onFilled: () => void;
}) {
  const tilt = useTilt(true);
  const [phase, setPhase] = useState<PourPrompt>("idle");
  // A tap pours the same jar the same way, but it can't be levelled off, so it says something else.
  const [tapping, setTapping] = useState(false);
  const pourRef = useRef<Pour>(IDLE_POUR);
  const tapRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const filledRef = useRef(onFilled);
  const beginRef = useRef(begin);
  useEffect(() => {
    filledRef.current = onFilled;
    beginRef.current = begin;
  });

  useEffect(() => {
    pourRef.current = IDLE_POUR;
    tapRef.current = false;
  }, [index]);

  const { tiltRef } = tilt;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let done = false;
    const { jar } = SCENE;
    const root = scene.current;
    const jarEl = scenePart<SVGGElement>(root, "jar");
    const jarFillEl = scenePart<SVGRectElement>(root, "jar-fill");
    const streamEl = scenePart<SVGGElement>(root, "stream");
    const streamPathEl = scenePart<SVGPathElement>(root, "stream-path");
    const grainsEl = scenePart<SVGPathElement>(root, "stream-grains");
    const fillEl = scenePart<SVGGElement>(root, "fill");
    const splashEl = scenePart<SVGGElement>(root, "splash");
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const degrees = tapRef.current ? TILT_FULL + 12 : tiltRef.current;
      const next = advancePour(pourRef.current, degrees, dt);
      pourRef.current = next;

      const tip = tipFor(degrees);
      jarEl?.setAttribute("transform", `rotate(${-tip} ${jar.pivot.x} ${jar.pivot.y})`);
      const left = (1 - next.filled) * jar.h;
      jarFillEl?.setAttribute("y", String(jar.pivot.y - 0.9 - left));
      jarFillEl?.setAttribute("height", String(Math.max(0, left)));

      if (next.rate > 0 && next.filled < 1) {
        const d = streamPath(tip);
        streamPathEl?.setAttribute("d", d);
        grainsEl?.setAttribute("d", d);
        streamEl?.setAttribute("opacity", "1");
        splashEl?.setAttribute("opacity", "1");
      } else {
        streamEl?.setAttribute("opacity", "0");
        splashEl?.setAttribute("opacity", "0");
      }

      const fill = (index + next.filled) / Math.max(1, total);
      fillEl?.setAttribute("transform", `translate(0 ${surfaceY(fill).toFixed(2)})`);
      // Nothing in the bowl until the first grain lands, then the batter fades up under the stream.
      fillEl?.setAttribute("opacity", fill > 0 ? "1" : "0");
      setMeter(barRef.current, next.filled);

      const nextPhase = promptFor(degrees, next);
      setPhase((current) => (current === nextPhase ? current : nextPhase));
      if (nextPhase !== "idle") beginRef.current();

      if (!done && pourDone(next)) {
        done = true;
        tapRef.current = false;
        setTapping(false);
        streamEl?.setAttribute("opacity", "0");
        splashEl?.setAttribute("opacity", "0");
        filledRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, scene, tiltRef, total]);

  const pour = () => {
    beginRef.current();
    if (reduce) {
      pourRef.current = { held: STEADY_MS, filled: 1, rate: 1 };
      return;
    }
    tapRef.current = true;
    setTapping(true);
  };

  // "idle" is still waiting for the first reading; only a phone that truly can't is told so.
  const live = tilt.state === "live";
  const asking = tilt.needsPermission || tilt.state === "idle";
  const label =
    phase === "pouring" ? s.pouring
    : phase === "holding" ? s.holding
    : phase === "more" ? s.more
    : live || asking ? s.tilt
    : s.noTilt;
  // Under the button: how to stop while it's pouring, what the button is for while it isn't, and
  // nothing at all on a phone whose plaque already says to tap.
  const hint =
    phase === "pouring" ? (tapping ? null : s.levelOff)
    : live ? s.orTap
    : null;

  return (
    <div className="flex flex-col items-center" style={{ gap: "calc(1.8 * var(--k))" }}>
      <Pill p={p}>{label}</Pill>
      <Meter barRef={barRef} p={p} label={s.pourMeter} />
      {tilt.needsPermission ? (
        <>
          <SmallButton
            p={p}
            onClick={() => {
              beginRef.current();
              void tilt.request();
            }}
            icon={<Smartphone className="shrink-0" style={{ width: "calc(3.6*var(--k))", height: "calc(3.6*var(--k))" }} />}
            label={s.allowMotion}
            aria={s.allowAria}
            tag="allow-tilt"
          />
          {/* the tilt may never come, so the way that always works stays on screen */}
          <TextButton p={p} onClick={pour} label={s.tapPour} aria={s.pourAria} tag="pour" />
        </>
      ) : (
        <>
          <motion.div animate={animate && !live ? { scale: [1, 1.04, 1] } : undefined} transition={{ duration: 2.2, repeat: Infinity }}>
            <SmallButton p={p} onClick={pour} icon={<JarIcon />} label={s.pourBtn} aria={s.pourAria} tag="pour" />
          </motion.div>
          {hint ? (
            <p className="text-center" style={{ fontSize: "calc(2.9 * var(--k))", color: "#5C3B22", textShadow: "0 calc(0.25 * var(--k)) 0 rgba(255,252,244,0.7)" }}>
              {hint}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** The shake, counted so a bump isn't a stir, with the button that does the same. */
function StirHand({
  s,
  p,
  scene,
  reduce,
  animate,
  begin,
  onStirred,
}: {
  s: Strings;
  p: Palette;
  scene: RefObject<HTMLDivElement | null>;
  reduce: boolean;
  animate: boolean;
  begin: () => void;
  onStirred: () => void;
}) {
  // Which hands are doing it, so the plaque doesn't tell someone tapping a button to keep shaking.
  const [turned, setTurned] = useState<"none" | "shake" | "tap">("none");
  const [mixed, setMixed] = useState(false);
  const stirRef = useRef<Stir>(IDLE_STIR);
  const churnRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onStirred);
  const beginRef = useRef(begin);
  useEffect(() => {
    doneRef.current = onStirred;
    beginRef.current = begin;
  });

  const turn = useCallback((by: "shake" | "tap") => {
    beginRef.current();
    const before = stirRef.current.progress;
    stirRef.current = by === "shake" ? shakeStir(stirRef.current, Date.now()) : tapStir(stirRef.current);
    if (reduce && by === "tap") stirRef.current = { ...stirRef.current, progress: 1 };
    if (stirRef.current.progress > before) churnRef.current = Math.min(1, churnRef.current + 0.5);
    setTurned(by);
  }, [reduce]);

  const onShake = useCallback(() => turn("shake"), [turn]);
  const shake = useStir(onShake, true);

  useEffect(() => {
    let raf = 0;
    let done = 0;
    let last = performance.now();
    let finished = false;
    const { bowl } = SCENE;
    const root = scene.current;
    const swirlEl = scenePart<SVGGElement>(root, "swirl");
    const spoonEl = scenePart<SVGGElement>(root, "spoon");
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      churnRef.current = Math.max(0, churnRef.current - dt * 1.1);
      const churn = churnRef.current;
      const angle = churn > 0 ? Math.sin(now / 90) * 16 * churn : 0;
      swirlEl?.setAttribute("transform", `rotate(${angle.toFixed(2)} ${bowl.cx} 0)`);
      spoonEl?.setAttribute("transform", `rotate(${(angle * 0.7).toFixed(2)} ${bowl.cx} ${bowl.rim})`);
      setMeter(barRef.current, stirRef.current.progress);
      if (!finished && stirDone(stirRef.current)) {
        finished = true;
        setMixed(true);
        // A beat to see it mixed — cleared on unmount, so a replay can't be dragged to the letter.
        done = window.setTimeout(() => doneRef.current(), reduce ? 200 : 900);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [scene, reduce]);

  const live = shake.state === "live";
  // Still waiting to hear from the phone, or waiting to be let in: not a dead sensor yet.
  const waiting = shake.needsPermission || shake.state === "idle";
  const label =
    mixed ? s.stirred
    : turned === "shake" ? s.stirring
    : turned === "tap" ? s.mixing
    : live || waiting ? s.shake
    : s.noShake;
  return (
    <div className="flex flex-col items-center" style={{ gap: "calc(1.8 * var(--k))" }}>
      <Pill p={p} tone={mixed ? "loud" : "quiet"}>{label}</Pill>
      <Meter barRef={barRef} p={p} label={s.stirMeter} />
      {shake.needsPermission ? (
        <>
          <SmallButton
            p={p}
            onClick={() => {
              beginRef.current();
              void shake.request();
            }}
            icon={<Smartphone className="shrink-0" style={{ width: "calc(3.6*var(--k))", height: "calc(3.6*var(--k))" }} />}
            label={s.allowMotion}
            aria={s.allowAria}
            tag="allow-shake"
          />
          {/* the shake may never come, so the way that always works stays on screen */}
          <TextButton p={p} onClick={() => turn("tap")} label={s.tapStir} aria={s.stirAria} tag="stir" />
        </>
      ) : (
        <>
          <motion.div animate={animate && !live ? { rotate: [0, -6, 6, 0] } : undefined} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}>
            <SmallButton
              p={p}
              onClick={() => turn("tap")}
              icon={<SpoonIcon />}
              label={s.stirBtn}
              aria={s.stirAria}
              tag="stir"
            />
          </motion.div>
          {live ? (
            <p className="text-center" style={{ fontSize: "calc(2.9 * var(--k))", color: "#5C3B22", textShadow: "0 calc(0.25 * var(--k)) 0 rgba(255,252,244,0.7)" }}>
              {s.orTap}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** The wooden spoon off the counter, small enough to sit in a button. */
function SpoonIcon() {
  return (
    <svg viewBox="0 0 16 16" className="shrink-0" style={{ width: "calc(3.6*var(--k))", height: "calc(3.6*var(--k))" }} aria-hidden="true">
      <ellipse cx="8" cy="4.6" rx="3.3" ry="3.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8.8v5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function JarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="shrink-0" style={{ width: "calc(3.4*var(--k))", height: "calc(3.4*var(--k))" }} aria-hidden="true">
      <rect x="4" y="1.4" width="8" height="2.2" rx="1" fill="currentColor" />
      <rect x="3.2" y="4.4" width="9.6" height="10.2" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 10.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** The card, turned over: everything she was, and then the letter. */
function Reading({
  p,
  cloth,
  s,
  data,
  mode,
  lines,
  recipeName,
  makes,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  p: Palette;
  cloth: (typeof CLOTHS)["tomato"];
  s: Strings;
  data: TemplateProps<RecipeBoxFields>["data"];
  mode: TemplateProps["mode"];
  lines: string[];
  recipeName: string;
  makes: string;
  reduce: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const tilts = useMemo(() => {
    const rng = mulberry32(hashString(`${data.recipientName}${data.senderName}recipe-box`));
    return data.photos.map(() => (rng() - 0.5) * 6);
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
  }, [mode, onEvent]);

  const paper: CSSProperties = { background: p.card, color: p.ink };
  const shadow = "shadow-[0_1px_2px_rgba(0,0,0,0.10),0_22px_40px_-22px_rgba(60,40,20,0.5)]";
  const rule = (
    <span aria-hidden="true" className="my-[calc(4*var(--u))] block h-px w-full" style={{ background: p.rule }} />
  );

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        background: mix(p.wood, "#000000", 0.14),
        backgroundImage: `repeating-linear-gradient(90deg, ${rgba(cloth.deep, 0.16)} 0 calc(6*var(--u)), transparent calc(6*var(--u)) calc(12*var(--u))), repeating-linear-gradient(0deg, ${rgba(cloth.deep, 0.16)} 0 calc(6*var(--u)), transparent calc(6*var(--u)) calc(12*var(--u)))`,
      }}
    >
      <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[max(9cqh,60px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        <motion.article
          className={cn("relative overflow-hidden rounded-[6px]", shadow)}
          style={{ ...paper, rotate: -0.5 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduce ? 0.3 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="px-[calc(4*var(--u))] py-[calc(3.4*var(--u))] text-center" style={{ background: cloth.a }}>
            <p className="text-[calc(2.7*var(--u))] font-semibold tracking-[0.26em] uppercase" style={{ color: cloth.on, opacity: 0.8 }}>
              {fmt(s.fromBox, { sender: data.senderName })}
            </p>
            <p className="mt-[calc(1*var(--u))] text-[calc(7.2*var(--u))] leading-[1.05]" style={{ fontFamily: "var(--gift-font-hand)", color: cloth.on }}>
              {recipeName}
            </p>
          </div>
          <div className="px-[calc(6*var(--u))] pt-[calc(4*var(--u))] pb-[calc(7*var(--u))]">
            <p className="text-center text-[calc(3.4*var(--u))] italic" style={{ color: p.soft }}>
              {makes}
            </p>
            {rule}
            <p className="text-[calc(2.7*var(--u))] font-semibold tracking-[0.3em] uppercase" style={{ color: p.soft }}>
              {s.ingredients}
            </p>
            <ul className="mt-[calc(2.6*var(--u))] flex flex-col gap-[calc(2.2*var(--u))]">
              {lines.map((line, i) => (
                <li key={`${i}-${line}`} className="flex items-start gap-[calc(2.4*var(--u))]">
                  <svg viewBox="0 0 12 12" className="mt-[0.35em] size-[calc(3.4*var(--u))] shrink-0" aria-hidden="true">
                    <path d="M1.5 6.4 4.6 9.6 10.5 2.4" fill="none" stroke="var(--gift-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="min-w-0 text-[calc(4.6*var(--u))] leading-[1.25] break-words" style={{ fontFamily: "var(--gift-font-hand)" }}>
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            {rule}
            <p className="text-[calc(2.7*var(--u))] font-semibold tracking-[0.3em] uppercase" style={{ color: p.soft }}>
              {s.method}
            </p>
            <div className="mt-[calc(3*var(--u))]">
              <MessageBody
                data={data}
                blocks={blocks}
                mode={mode}
                tone="light"
                face="serif"
                ornament={false}
                greeting={data.title?.trim() || undefined}
              />
            </div>
          </div>
        </motion.article>

        {data.photos.length ? (
          <>
            <p className="text-center text-[calc(3*var(--u))] font-semibold tracking-[0.24em] uppercase" style={{ color: "#FFF6E6", opacity: 0.9 }}>
              {s.photos}
            </p>
            <div className="grid grid-cols-2 gap-[calc(6*var(--u))] px-[calc(1*var(--u))] pt-[calc(2*var(--u))]">
              {data.photos.map((photo, i) => (
                <Clipped key={photo.id} photo={photo} rot={tilts[i] ?? 0} index={i} reduce={reduce} single={data.photos.length === 1} p={p} />
              ))}
            </div>
          </>
        ) : null}

        {data.countdown ? (
          <div className={cn("rounded-[6px] p-[calc(5*var(--u))]", shadow)} style={paper}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className={cn("rounded-[6px] p-[calc(5*var(--u))]", shadow)} style={{ ...paper, rotate: "0.5deg" }}>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.7*var(--u))] font-semibold tracking-[0.3em] uppercase" style={{ color: p.soft }}>
              {t("ps")}
            </p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className={cn("rounded-[6px] p-[calc(4*var(--u))]", shadow)} style={paper}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </motion.div>
  );
}

/** A photo clipped to the card, the way the good recipes always have one. */
function Clipped({ photo, rot, index, reduce, single, p }: { photo: GiftPhoto; rot: number; index: number; reduce: boolean; single: boolean; p: Palette }) {
  return (
    <motion.figure
      className={cn("relative m-0", single && "col-span-2 mx-auto w-[64%]")}
      style={{ rotate: rot }}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 16, delay: (index % 2) * 0.1 }}
    >
      <svg
        viewBox="0 0 24 46"
        aria-hidden="true"
        className="absolute -top-[calc(3*var(--u))] left-[calc(4*var(--u))] z-[2] w-[calc(4.4*var(--u))]"
        style={{ rotate: `${index % 2 ? 6 : -7}deg` }}
      >
        <path d="M17 13v19a5.4 5.4 0 0 1-10.8 0V10.5a3.4 3.4 0 0 1 6.8 0v20a1.7 1.7 0 0 1-3.4 0V14" fill="none" stroke="#AFA694" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
      <div className="bg-[#FFFDF6] p-[calc(2*var(--u))] pb-[calc(3*var(--u))] shadow-[0_12px_26px_-14px_rgba(0,0,0,0.45)]">
        <div className="aspect-[4/5] w-full overflow-hidden bg-black/5">
          <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </div>
        {photo.caption ? (
          <figcaption
            className="mt-[calc(2*var(--u))] text-center text-[calc(4*var(--u))] leading-tight break-words"
            style={{ fontFamily: "var(--gift-font-hand)", color: p.ink }}
          >
            {photo.caption}
          </figcaption>
        ) : null}
      </div>
    </motion.figure>
  );
}
