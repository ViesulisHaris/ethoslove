"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Hand, RotateCw, Smartphone } from "lucide-react";
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
import { Base, Dome, Garland, GlobeInterior, PALETTES, Shelf, type Palette } from "./art";
import { Snow } from "./Snow";
import { SHAKE_COUNTS, burstLevel, revealPlan, settleMs, shakesNeeded, type Reveal } from "./storm";
import { useGlobeShake } from "./use-globe-shake";
import { parseFields, type SnowGlobeFields } from "./schema";

/** Everything this template says, in both languages. Exported so a test can keep them in step. */
export const S = {
  en: {
    shakePhone: "shake your phone",
    tapInstead: "tap to make it snow",
    keepShaking: "keep shaking",
    settling: "the snow is settling…",
    again: "shake it again",
    opening: "look at the plaque",
    shakeIt: "shake it",
    turnOver: "turn it over",
    motionOn: "let it feel the shake",
    buttonsToo: "the buttons do it too",
    noSensor: "no shake? the buttons do all of it",
    count: "{n} of {total}",
    letter: "a letter from {name}",
    photos: "everything in the snow",
    globeLabel: "Shake the globe",
  },
  es: {
    shakePhone: "agita el teléfono",
    tapInstead: "toca para que nieve",
    keepShaking: "sigue agitando",
    settling: "la nieve se está posando…",
    again: "agítala otra vez",
    opening: "mira la placa",
    shakeIt: "agítala",
    turnOver: "dale la vuelta",
    motionOn: "que note el movimiento",
    buttonsToo: "los botones también valen",
    noSensor: "¿no va el movimiento? los botones lo hacen todo",
    count: "{n} de {total}",
    letter: "una carta de {name}",
    photos: "todo lo que había en la nieve",
    globeLabel: "Agitar la bola",
  },
};

/** The paper's grain, multiplied over the letter and the notes. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.14 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

const KEYFRAMES = `
.sg-twinkle{animation:sg-twinkle 2.6s ease-in-out infinite alternate}
@keyframes sg-twinkle{from{opacity:.5}to{opacity:1}}
.sg-smoke{transform-box:fill-box;animation:sg-smoke 4.6s ease-in-out infinite}
@keyframes sg-smoke{0%{transform:translate(0,0) scale(.7);opacity:0}30%{opacity:.55}100%{transform:translate(2px,-9px) scale(1.5);opacity:0}}
.sg-glint{animation:sg-glint 6s ease-in-out infinite}
@keyframes sg-glint{0%,72%{opacity:.32}84%{opacity:.72}100%{opacity:.32}}
.sg-swing{transform-origin:50% 0;animation:sg-swing 3.6s ease-in-out infinite alternate}
@keyframes sg-swing{from{rotate:-3.2deg}to{rotate:3.2deg}}
.sg-breathe{animation:sg-breathe 2.4s ease-in-out infinite alternate}
@keyframes sg-breathe{from{opacity:.55}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.sg-twinkle,.sg-smoke,.sg-glint,.sg-swing,.sg-breathe{animation:none}}
`;

type Stage = "globe" | "letter";
type Burst = { at: number; ms: number } | null;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<SnowGlobeFields>) {
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  // The editor has two globes on the page at once, so every gradient and clip needs its own id.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const preview = mode === "preview";
  const animate = !preview && !reduce;
  // The editor's still frame and reduced motion both want the finished picture, not the journey.
  const instant = preview || !!reduce;
  const audio = useGiftAudio(data.music, !preview);
  // Parsed here too, so a draft saved before a field changed shape still draws instead of crashing.
  const fields = useMemo(() => parseFields(data.fields), [data.fields]);
  const p: Palette = PALETTES[fields.mood] ?? PALETTES.lamplit;

  // Four things can hang in the snow at most; the rest of the photos wait in the letter.
  const plan = useMemo(
    () => revealPlan(fields.lines, Math.min(data.photos.length, 4), SHAKE_COUNTS[fields.shakes] ?? 3),
    [fields.lines, fields.shakes, data.photos.length],
  );
  const total = shakesNeeded(plan);

  const [revealed, setRevealed] = useState(0);
  const [storming, setStorming] = useState(false);
  const [engravedHere, setEngraved] = useState(false);
  const [stage, setStage] = useState<Stage>("globe");
  const [flipped, setFlipped] = useState(false);
  const [run, setRun] = useState(0);

  // The editor's still frame is worked out from the fields as they stand, never stored: the sender
  // types their first line and the globe is holding it, instead of keeping whatever the preview
  // happened to mount with — which, for a gift that starts empty, is nothing at all.
  const found = preview ? Math.min(1, plan.length) : revealed;
  const engraved = preview || engravedHere;

  const stormRef = useRef(0);
  const burstRef = useRef<Burst>(null);
  const settleTimer = useRef(0);
  const startedRef = useRef(false);
  const eventRef = useRef(onEvent);
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

  /** A shake has been earned — by the phone or by the button. The snow flies, then it settles. */
  const fire = useCallback(
    (level: number) => {
      if (preview || storming || revealed >= total) return;
      begin();
      const ms = reduce ? 240 : settleMs(level);
      burstRef.current = { at: performance.now(), ms };
      setStorming(true);
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        burstRef.current = null;
        stormRef.current = 0;
        setStorming(false);
        setRevealed((n) => {
          const next = Math.min(total, n + 1);
          eventRef.current?.({ type: "progress", pct: Math.round((next / total) * 60) });
          return next;
        });
      }, ms);
    },
    [begin, preview, reduce, revealed, storming, total],
  );

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // The last flake lands, and the plaque is engraved.
  useEffect(() => {
    if (preview || engraved || revealed < total || storming) return;
    const id = window.setTimeout(() => setEngraved(true), reduce ? 200 : 900);
    return () => window.clearTimeout(id);
  }, [engraved, preview, reduce, revealed, storming, total]);

  // Then the letter opens.
  useEffect(() => {
    if (preview || !engraved || stage !== "globe") return;
    const id = window.setTimeout(() => setStage("letter"), reduce ? 400 : 2600);
    return () => window.clearTimeout(id);
  }, [engraved, preview, reduce, stage]);

  const replay = () => {
    window.clearTimeout(settleTimer.current);
    burstRef.current = null;
    stormRef.current = 0;
    setRevealed(0);
    setStorming(false);
    setEngraved(false);
    setFlipped(false);
    setStage("globe");
    setRun((r) => r + 1);
  };

  const shown = plan.slice(0, found);
  const featured = shown.length ? shown[shown.length - 1] : null;
  const plaque = fields.plaque.trim() || data.title.trim();
  const seed = `${data.senderName}-${data.recipientName}-snow`;

  const room = {
    background: p.room,
    color: p.ink,
    fontFamily: "var(--gift-font-body)",
    ["--k" as string]: "min(var(--u), 0.52cqh)",
    // Measured: the shelf ends 120 k down, and the prompt, meter, buttons and the lines under them
    // carry on to about 160 — a little either side of it depending on whether the phone is still
    // asking for motion. The editor's still frame stops at the shelf, so it centres on the short one.
    ["--top" as string]: `max(0px, calc((100cqh - ${preview ? 120 : 160} * var(--k)) / 2))`,
  } as CSSProperties;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={room}>
      <style>{KEYFRAMES}</style>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: p.halo }} />

      <AnimatePresence mode="wait">
        {stage === "globe" ? (
          <motion.div key={`globe-${run}`} className="absolute inset-0" exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.55 } }}>
            <p
              className="absolute inset-x-0 truncate px-[calc(12*var(--k))] text-center font-semibold tracking-[0.3em] uppercase"
              style={{ top: "calc(var(--top) + 1 * var(--k))", fontSize: "calc(2.9 * var(--k))", color: p.soft }}
            >
              {data.senderName} <span aria-hidden="true">→</span> {data.recipientName}
            </p>

            <div aria-hidden="true" className="absolute inset-x-0" style={{ top: "calc(var(--top) + 7 * var(--k))", height: "calc(14 * var(--k))" }}>
              <Garland p={p} accent={data.accentColor} lit={animate} />
            </div>

            {/* the shelf, and the base standing on it */}
            <div aria-hidden="true" className="absolute inset-x-0 z-[6]" style={{ top: "calc(var(--top) + 106 * var(--k))", height: "calc(14 * var(--k))" }}>
              <Shelf p={p} accent={data.accentColor} />
            </div>
            <div className="absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: "calc(var(--top) + 86 * var(--k))", width: "calc(62 * var(--k))", height: "calc(22 * var(--k))" }}>
              <Base p={p} uid={uid}>
                <Plaque p={p} text={plaque} engraved={engraved} instant={instant} />
              </Base>
            </div>

            {/* the globe */}
            <div
              className="absolute left-1/2 z-[4] -translate-x-1/2"
              style={{ top: "calc(var(--top) + 20 * var(--k))", width: "calc(74 * var(--k))", height: "calc(74 * var(--k))" }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 calc(6 * var(--k)) calc(14 * var(--k)) calc(-6 * var(--k)) rgba(0,0,0,0.55)` }}
              >
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-0 overflow-hidden rounded-full"
                  animate={{ rotate: flipped ? 180 : 0 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 13 }}
                >
                  <GlobeInterior p={p} scene={fields.scene} accent={data.accentColor} seed={seed} lit animate={animate} uid={uid} />
                  <Snow levelRef={stormRef} flipped={flipped} still={instant} colour={p.snow} seed={hashString(seed)} />
                </motion.div>
                {/* The reveals stay the right way up, however the globe is held — and outside the
                    button, so a screen reader reads the line as text and not as the button's name. */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                  <Baubles items={shown.slice(0, -1)} photos={data.photos} p={p} accent={data.accentColor} animate={animate} />
                  {/* Read out as it lands: what appeared in the snow is the gift, not decoration. */}
                  <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0">
                    <AnimatePresence mode="wait">
                      {featured && !storming ? (
                        <Featured key={`f-${found}`} reveal={featured} photos={data.photos} p={p} instant={instant} />
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <Dome p={p} glint={animate} uid={uid} />
                </div>
                {/* The glass itself is the big target: a real button, so Enter and Space come free.
                    Never `disabled` while the snow flies: a keyboard has it focused, and a disabled
                    button drops that focus on the floor for the rest of the gift. */}
                {preview ? null : (
                  <button
                    type="button"
                    aria-label={s.globeLabel}
                    onClick={() => fire(0.8)}
                    aria-disabled={storming || revealed >= total}
                    className="absolute inset-0 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                  />
                )}
              </div>
            </div>

            {/* what to do, and the buttons that always work */}
            {preview ? null : (
              <Shaker
                key={`shake-${run}`}
                s={s}
                p={p}
                enabled={stage === "globe"}
                busy={storming}
                done={revealed >= total}
                reduce={!!reduce}
                flipped={flipped}
                count={{ n: Math.min(revealed + 1, total), total }}
                stormRef={stormRef}
                burstRef={burstRef}
                onFire={fire}
                onFlip={setFlipped}
              />
            )}
          </motion.div>
        ) : (
          <Letter
            key={`letter-${run}`}
            p={p}
            s={s}
            data={data}
            mode={mode}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        )}
      </AnimatePresence>

      {animate ? (
        <div className="pointer-events-none absolute inset-0 z-[30]" aria-hidden="true">
          <Ambience layers={stage === "globe" ? [{ kind: "sparkles" as const, colors: p.sparkle, count: 10 }] : [{ kind: "snow" as const, colors: ["#FFFFFF", ...p.sparkle], count: 18 }]} opacity={0.7} />
        </div>
      ) : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/* --------------------------------------------------------------- the shake */

/**
 * Everything the recipient touches. Its own component, remounted on replay, so the motion
 * sense starts from nothing every time. The buttons are never hidden: they are the whole
 * gift on a laptop, on a phone that refused the permission, and on one that has no sensor.
 */
function Shaker({
  s,
  p,
  enabled,
  busy,
  done,
  reduce,
  flipped,
  count,
  stormRef,
  burstRef,
  onFire,
  onFlip,
}: {
  s: (typeof S)["en"];
  p: Palette;
  enabled: boolean;
  /** The snow is already flying. */
  busy: boolean;
  /** Everything has been revealed. */
  done: boolean;
  reduce: boolean;
  /** The globe is standing on its head. */
  flipped: boolean;
  count: { n: number; total: number };
  stormRef: { current: number };
  burstRef: { current: Burst };
  onFire: (level: number) => void;
  onFlip: (flipped: boolean) => void;
}) {
  const meter = useRef<HTMLSpanElement>(null);
  const [charging, setCharging] = useState(false);
  const chargingRef = useRef(false);

  const shake = useGlobeShake({
    enabled,
    onShake: onFire,
    onFlip,
    onFrame: (level, charge) => {
      const burst = burstRef.current;
      const extra = burst ? burstLevel(performance.now() - burst.at, burst.ms) : 0;
      stormRef.current = Math.max(level, extra);
      const fill = busy ? 1 : charge;
      if (meter.current) meter.current.style.transform = `scaleX(${fill.toFixed(3)})`;
      const next = !busy && charge > 0.08;
      if (next !== chargingRef.current) {
        chargingRef.current = next;
        setCharging(next);
      }
    },
  });

  const prompt = busy ? s.settling : done ? s.opening : charging ? s.keepShaking : count.n > 1 ? s.again : shake.sensing ? s.shakePhone : s.tapInstead;
  const pill: CSSProperties = {
    padding: "calc(1.9 * var(--k)) calc(4.6 * var(--k))",
    fontSize: "calc(3 * var(--k))",
    background: "rgba(255,255,255,0.12)",
    color: p.ink,
    backdropFilter: "blur(6px)",
  };

  return (
    <div
      className="absolute left-1/2 z-[8] flex w-max max-w-[calc(94*var(--k))] -translate-x-1/2 flex-col items-center gap-[calc(2.4*var(--k))]"
      style={{ top: "calc(var(--top) + 118 * var(--k))" }}
    >
      <div className="flex flex-col items-center gap-[calc(1.4*var(--k))]">
        {/* Announced as it changes, so the shake reads as progress without seeing the meter. */}
        <p
          role="status"
          aria-live="polite"
          className={cn("rounded-full font-semibold tracking-[0.22em] whitespace-nowrap uppercase", !reduce && !busy && !charging && "sg-breathe")}
          style={pill}
        >
          {prompt}
        </p>
        {/* how full the globe is: it only fills while the phone is really being shaken */}
        <span aria-hidden="true" className="block overflow-hidden rounded-full" style={{ width: "calc(34 * var(--k))", height: "calc(0.9 * var(--k))", background: "rgba(255,255,255,0.18)" }}>
          <span ref={meter} className="block h-full w-full origin-left rounded-full" style={{ background: p.brass, transform: "scaleX(0)" }} />
        </span>
        {count.total > 1 ? (
          <p className="tabular-nums" style={{ fontSize: "calc(2.7 * var(--k))", color: p.soft }}>
            {s.count.replace("{n}", String(count.n)).replace("{total}", String(count.total))}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-[calc(2.4*var(--k))]">
        {/* Dimmed, not disabled, for the same reason as the globe: whoever tabbed here keeps it. */}
        <motion.button
          type="button"
          onClick={() => onFire(0.8)}
          aria-disabled={busy || done}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-[calc(1.8*var(--k))] rounded-full font-semibold tracking-[0.18em] whitespace-nowrap uppercase shadow-[0_10px_22px_-12px_rgba(0,0,0,0.6)] aria-disabled:opacity-45"
          style={{ padding: "calc(2.3 * var(--k)) calc(5 * var(--k))", fontSize: "calc(3 * var(--k))", background: "#FBFDFF", color: "#1F3350" }}
        >
          <Hand style={{ width: "calc(3.6 * var(--k))", height: "calc(3.6 * var(--k))" }} />
          {s.shakeIt}
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onFlip(!flipped)}
          aria-pressed={flipped}
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-[calc(1.6*var(--k))] rounded-full font-medium tracking-[0.16em] whitespace-nowrap uppercase"
          style={{ padding: "calc(2.1 * var(--k)) calc(4 * var(--k))", fontSize: "calc(2.8 * var(--k))", border: "1px solid rgba(255,255,255,0.28)", color: p.ink }}
        >
          <RotateCw style={{ width: "calc(3.2 * var(--k))", height: "calc(3.2 * var(--k))" }} />
          {s.turnOver}
        </motion.button>
      </div>

      {/*
       * The reassurance is never traded away for the permission button: a laptop's browser can
       * offer the iOS prompt and still have nothing to feel with, so "the buttons do all of it"
       * has to stay on screen next to it.
       */}
      <div className="flex flex-col items-center gap-[calc(1.6*var(--k))]">
        {shake.needsPermission ? (
          <button
            type="button"
            onClick={() => void shake.requestPermission()}
            className="flex items-center gap-[calc(1.6*var(--k))] rounded-full font-medium tracking-[0.16em] uppercase"
            style={{ padding: "calc(1.8 * var(--k)) calc(4 * var(--k))", fontSize: "calc(2.7 * var(--k))", background: "rgba(255,255,255,0.14)", color: p.ink }}
          >
            <Smartphone style={{ width: "calc(3 * var(--k))", height: "calc(3 * var(--k))" }} />
            {s.motionOn}
          </button>
        ) : null}
        <p className="max-w-[calc(80*var(--k))] text-center leading-snug" style={{ fontSize: "calc(2.7 * var(--k))", color: p.soft }}>
          {shake.sensing ? s.buttonsToo : s.noSensor}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the reveals */

/** The newest thing to appear: a line on a card, or a photo hanging in the snow. */
function Featured({ reveal, photos, p, instant }: { reveal: Reveal; photos: GiftPhoto[]; p: Palette; /** Preview and reduced motion: land already arrived. */ instant: boolean }) {
  const common = {
    initial: instant ? false : { opacity: 0, y: -10, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.94, transition: { duration: instant ? 0 : 0.25 } },
    transition: instant ? { duration: 0 } : { type: "spring" as const, stiffness: 150, damping: 15 },
  };

  if (reveal.kind === "photo") {
    const photo = photos[reveal.index];
    if (!photo) return null;
    return (
      <motion.div className="absolute left-1/2 w-[40%] -translate-x-1/2" style={{ top: "12%" }} {...common}>
        <div className={cn("relative", !instant && "sg-swing")}>
          <span aria-hidden="true" className="absolute left-1/2 block w-px -translate-x-1/2" style={{ top: "-16%", height: "16%", background: "rgba(255,255,255,0.55)" }} />
          <span aria-hidden="true" className="absolute left-1/2 block -translate-x-1/2 rounded-full" style={{ top: "-4%", width: "14%", height: "7%", border: `1.5px solid ${p.brass}` }} />
          <figure className="m-0 rotate-[-2deg] bg-[#FFFDF8] p-[6%] pb-[9%] shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)]">
            <div className="aspect-square w-full overflow-hidden bg-black/10">
              <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
            </div>
            {photo.caption ? (
              <figcaption className="mt-[5%] text-center leading-tight break-words text-[#33404F]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.6 * var(--k))" }}>
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div className="absolute left-1/2 w-[70%] -translate-x-1/2" style={{ top: "28%" }} {...common}>
      <div className="relative rotate-[-1.5deg] rounded-[calc(1.6*var(--k))] px-[calc(4*var(--k))] py-[calc(3.2*var(--k))] text-center shadow-[0_12px_24px_-12px_rgba(0,0,0,0.6)]" style={{ background: "#FFFDF8", color: "#2B3A4C" }}>
        <span aria-hidden="true" className="absolute inset-x-[10%] -top-[calc(0.8*var(--k))] block h-[calc(2.2*var(--k))] rounded-full" style={{ background: p.ground }} />
        <p className="leading-snug break-words" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(5 * var(--k))" }}>
          {reveal.text}
        </p>
      </div>
    </motion.div>
  );
}

/** Everything already found, resting in the snow at the foot of the globe. */
function Baubles({ items, photos, p, accent, animate }: { items: Reveal[]; photos: GiftPhoto[]; p: Palette; accent: string; animate: boolean }) {
  if (!items.length) return null;
  return (
    <>
      {items.map((item, i) => {
        const t = items.length === 1 ? 0.5 : i / (items.length - 1);
        const left = 30 + 40 * t;
        const top = 78 + (i % 2 ? 2.5 : 0);
        const photo = item.kind === "photo" ? photos[item.index] : null;
        return (
          <motion.div
            key={`${item.kind}-${i}`}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}%`, width: "15%", translate: "-50% -50%" }}
            initial={animate ? { opacity: 0, y: -14, scale: 0.6 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 210, damping: 17 }}
          >
            <span aria-hidden="true" className="absolute -bottom-[14%] left-1/2 block h-[34%] w-[130%] -translate-x-1/2 rounded-full" style={{ background: p.ground }} />
            <span aria-hidden="true" className="absolute -top-[9%] left-1/2 block h-[16%] w-[26%] -translate-x-1/2 rounded-t-full border-2 border-b-0" style={{ borderColor: p.brass }} />
            <div className="relative aspect-square w-full overflow-hidden rounded-full shadow-[0_5px_10px_-4px_rgba(0,0,0,0.55)]" style={{ background: accent, border: `1.5px solid ${p.brass}` }}>
              {photo ? (
                <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <span className="block h-full w-full" style={{ background: `radial-gradient(58% 52% at 34% 30%, rgba(255,255,255,0.65), transparent 62%), ${accent}` }} />
              )}
            </div>
          </motion.div>
        );
      })}
    </>
  );
}

/** The brass plate on the base. Blank until the last flake lands, then engraved. */
function Plaque({ p, text, engraved, instant }: { p: Palette; text: string; engraved: boolean; /** Preview and reduced motion: already engraved, no letters sliding home. */ instant: boolean }) {
  return (
    <div
      className="absolute left-1/2 grid -translate-x-1/2 place-items-center overflow-hidden rounded-[calc(1*var(--k))] px-[calc(2*var(--k))]"
      style={{
        top: "calc(8 * var(--k))",
        width: "calc(52 * var(--k))",
        height: "calc(10 * var(--k))",
        background: `linear-gradient(170deg, ${p.brass}, ${p.brassDeep})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)`,
      }}
    >
      <AnimatePresence mode="wait">
        {engraved && text ? (
          <motion.p
            key="engraved"
            className="line-clamp-2 text-center leading-[1.15] font-semibold tracking-[0.08em] uppercase [overflow-wrap:anywhere]"
            style={{ fontFamily: "var(--gift-font-display)", fontSize: "calc(2.5 * var(--k))", color: p.brassInk, textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}
            initial={instant ? false : { opacity: 0, letterSpacing: "0.42em" }}
            animate={{ opacity: 1, letterSpacing: "0.08em" }}
            transition={{ duration: instant ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            {text}
          </motion.p>
        ) : (
          <motion.span key="blank" aria-hidden="true" className="block h-px w-[52%] rounded-full" style={{ background: p.brassInk, opacity: 0.28 }} initial={{ opacity: 0 }} animate={{ opacity: 0.28 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- the letter */

function Letter({
  p,
  s,
  data,
  mode,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  p: Palette;
  s: (typeof S)["en"];
  data: TemplateProps<SnowGlobeFields>["data"];
  mode: TemplateProps["mode"];
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
    const rng = mulberry32(hashString(`${data.recipientName}${data.senderName}snow-globe`));
    return data.photos.map(() => (rng() - 0.5) * 6.5);
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

  const paper: CSSProperties = { background: p.wall, backgroundImage: GRAIN, color: "#33404F" };
  const shadow = "shadow-[0_1px_2px_rgba(0,0,0,0.16),0_26px_46px_-24px_rgba(6,16,32,0.7)]";

  return (
    <motion.div className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[max(11cqh,72px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        <motion.article
          className={cn("relative rounded-[5px] px-[calc(6*var(--u))] pt-[calc(6*var(--u))] pb-[calc(7*var(--u))]", shadow)}
          style={{ ...paper, rotate: -0.5 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 90 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.3 : 0.95, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* snow settled along the top edge of the paper */}
          <span aria-hidden="true" className="absolute inset-x-[5%] -top-[calc(1*var(--u))] block h-[calc(2.6*var(--u))] rounded-full" style={{ background: p.ground, opacity: 0.92 }} />
          <p className="text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-55">{s.letter.replace("{name}", data.senderName)}</p>
          <div className="mt-[calc(3*var(--u))]">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" />
          </div>
        </motion.article>

        {data.photos.length ? (
          <>
            <p className="text-center text-[calc(3.2*var(--u))] font-semibold tracking-[0.22em] uppercase" style={{ color: p.soft }}>
              {s.photos}
            </p>
            <div className="grid grid-cols-2 gap-[calc(5*var(--u))] px-[calc(1*var(--u))]">
              {data.photos.map((photo, i) => (
                <Framed key={photo.id} photo={photo} rot={tilts[i] ?? 0} index={i} reduce={reduce} single={data.photos.length === 1} />
              ))}
            </div>
          </>
        ) : null}

        {data.countdown ? (
          <div className={cn("rounded-[5px] p-[calc(5*var(--u))]", shadow)} style={paper}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className={cn("relative rounded-[5px] p-[calc(5*var(--u))]", shadow)} style={{ ...paper, rotate: "0.6deg" }}>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-55">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className={cn("rounded-[5px] p-[calc(4*var(--u))]", shadow)} style={paper}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </motion.div>
  );
}

/** A photo in a white frame, propped up a little crooked. */
function Framed({ photo, rot, index, reduce, single }: { photo: GiftPhoto; rot: number; index: number; reduce: boolean; single: boolean }) {
  return (
    <motion.figure
      className={cn("relative m-0", single && "col-span-2 mx-auto w-[62%]")}
      style={{ rotate: rot }}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 16, delay: (index % 2) * 0.12 }}
    >
      <div className="bg-[#FFFDF8] p-[calc(2*var(--u))] pb-[calc(3*var(--u))] shadow-[0_14px_28px_-14px_rgba(0,0,0,0.6)]">
        <div className="aspect-[4/5] w-full overflow-hidden bg-black/5">
          <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </div>
        {photo.caption ? (
          <figcaption className="mt-[calc(2*var(--u))] text-center text-[calc(4*var(--u))] leading-tight break-words text-[#33404F]" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {photo.caption}
          </figcaption>
        ) : null}
      </div>
    </motion.figure>
  );
}
