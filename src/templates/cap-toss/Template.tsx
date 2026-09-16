"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mic, Rocket } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString, mulberry32 } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { Ambience } from "../_shared/Ambience";
import { Bunting, Crowd, Diploma, Mortarboard, PALETTES, Seal, StillConfetti, TASSELS, type Palette } from "./art";
import { apexFor, capAt, flightMs, TAP_THROW, throwFrom, type CapAt } from "./toss";
import { fieldsSchema, type CapTossFields } from "./schema";
import { useCheer } from "./use-cheer";

const S = {
  en: {
    classOf: "Class of {year}",
    cheerInto: "cheer into your phone",
    louder: "louder!",
    nearly: "nearly — keep going",
    goOn: "go on, make some noise",
    useMic: "use the microphone",
    asking: "waiting for permission…",
    meter: "how loud you are",
    noMic: "no microphone here — tap “throw it”",
    noSound: "nothing coming through — tap “throw it”",
    micOff: "microphone off — tap “throw it”",
    throwIt: "throw it",
    upItGoes: "up it goes",
    congrats: "congratulations, {name}",
    pull: "pull the ribbon",
    pulling: "keep pulling…",
    orTapBow: "or tap the bow",
    awarded: "Awarded for",
    yearbook: "The yearbook",
  },
  es: {
    classOf: "Promoción {year}",
    cheerInto: "grita al teléfono",
    louder: "¡más fuerte!",
    nearly: "casi — sigue",
    goOn: "venga, haz ruido",
    useMic: "usar el micrófono",
    asking: "esperando el permiso…",
    meter: "cuánto ruido haces",
    noMic: "aquí no hay micrófono: toca «lánzalo»",
    noSound: "no llega nada: toca «lánzalo»",
    micOff: "micrófono apagado: toca «lánzalo»",
    throwIt: "lánzalo",
    upItGoes: "allá va",
    congrats: "¡enhorabuena, {name}!",
    pull: "tira de la cinta",
    pulling: "sigue tirando…",
    orTapBow: "o toca el lazo",
    awarded: "Se le concede por",
    yearbook: "El anuario",
  },
};

type Strings = (typeof S)["en"];

/** The whole scene is this many units tall; `--top` centres it on any phone. */
const SCENE = 158;
/** Where the board of the cap rests, and the furthest it can travel straight up. */
const CAP_REST = 62.4;
const CAP_TRAVEL = 54;

const KEYFRAMES = `
.ct-swing{animation:ct-swing 2.8s ease-in-out infinite alternate}
@keyframes ct-swing{from{transform:rotate(-7deg)}to{transform:rotate(8deg)}}
.ct-sway{animation:ct-sway 3.6s ease-in-out infinite alternate}
@keyframes ct-sway{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}
.ct-hover{animation:ct-hover 3.2s ease-in-out infinite alternate}
@keyframes ct-hover{from{translate:0 calc(-0.8 * var(--k))}to{translate:0 calc(0.8 * var(--k))}}
.ct-pulse{animation:ct-pulse 2.4s ease-in-out infinite}
@keyframes ct-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.ct-swing,.ct-sway,.ct-hover,.ct-pulse{animation:none}}
`;

/** The paper's grain, multiplied over the unrolled diploma. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.52 0 0 0 0 0.44 0 0 0 0 0.30 0 0 0 0.11 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

type Stage = "yard" | "roll" | "reading";

const pill = (p: Palette): CSSProperties => ({
  padding: "calc(2.1 * var(--k)) calc(4.6 * var(--k))",
  fontSize: "calc(2.9 * var(--k))",
  background: p.pill,
  color: p.ink,
  backdropFilter: "blur(6px)",
});

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<CapTossFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const animate = !preview && !reduce;
  const audio = useGiftAudio(data.music, !preview);
  // Parsed here too, so a draft saved before a field changed shape still draws instead of crashing.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const p = PALETTES[fields.gown] ?? PALETTES.navy;
  const tassel = TASSELS[fields.tassel] ?? TASSELS.gold;
  const seed = `${data.senderName}-${data.recipientName}-cap-toss`;

  const [stage, setStage] = useState<Stage>("yard");
  // The editor's still frame is the instant of the throw: cap off its mark, confetti already up.
  const [flight, setFlight] = useState<CapAt | null>(() => (preview ? capAt(TAP_THROW, flightMs(TAP_THROW) * 0.07) : null));
  const [launched, setLaunched] = useState(false);
  const [hop, setHop] = useState(0);
  const [burst, setBurst] = useState(0);
  const [origin, setOrigin] = useState({ x: 0.5, y: 0.32 });
  const [run, setRun] = useState(0);

  const eventRef = useRef(onEvent);
  const startedRef = useRef(false);
  const apexRef = useRef(false);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  useEffect(() => {
    const pending = timers.current;
    return () => {
      cancelAnimationFrame(rafRef.current);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const { start } = audio;
  const begin = useCallback(() => {
    if (startedRef.current || preview) return;
    startedRef.current = true;
    void start();
    eventRef.current?.({ type: "started" });
  }, [preview, start]);

  /** Where the cap will be at the top of its arc, in fractions of the container, for the confetti. */
  const apexOrigin = useCallback(
    (power: number) => {
      const k = Math.min(size.width / 100, (size.height * 0.6) / 100);
      const top = Math.max(0, (size.height - SCENE * k) / 2);
      const y = (top + (CAP_REST - CAP_TRAVEL * apexFor(power)) * k) / Math.max(1, size.height);
      return { x: 0.5, y: Math.min(0.8, Math.max(0.05, y)) };
    },
    [size.height, size.width],
  );

  /** One throw, at a power between 0 and 1. The cheer and the button both end up here. */
  const launch = useCallback(
    (power: number) => {
      if (preview || launched) return;
      setLaunched(true);
      setHop(0);
      begin();
      eventRef.current?.({ type: "progress", pct: 45 });
      if (reduce) {
        // No arc to watch: the cap is thrown, and the diploma is already on its way.
        setFlight({ phase: 1, rise: 0, spin: 0, drift: 0, done: true });
        timers.current.push(window.setTimeout(() => setStage("roll"), 400));
        return;
      }
      setOrigin(apexOrigin(power));
      const startedAt = performance.now();
      const step = (now: number) => {
        const at = capAt(power, now - startedAt);
        setFlight(at);
        if (!apexRef.current && at.phase >= 0.5) {
          apexRef.current = true;
          setBurst((b) => b + 1);
        }
        if (at.done) setStage("roll");
        else rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [apexOrigin, begin, launched, preview, reduce],
  );

  const replay = () => {
    cancelAnimationFrame(rafRef.current);
    // Emptied in place, never replaced: the unmount cleanup holds on to this one array.
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.length = 0;
    apexRef.current = false;
    setFlight(null);
    setLaunched(false);
    setHop(0);
    setStage("yard");
    setRun((r) => r + 1);
  };

  // Before the throw the noise itself lifts the cap a little, so they can see it answering them.
  const rise = (flight?.rise ?? 0) + (launched || preview ? 0 : hop * 0.15);
  const spin = flight?.spin ?? 0;
  const drift = flight?.drift ?? 0;
  const cheering = preview || launched || stage !== "yard" || hop > 0.4;
  const landed = stage !== "yard";
  // A sender can clear the year, and "Class of" on its own is not a sentence: congratulate instead.
  const congrats = s.congrats.replace("{name}", data.recipientName);
  const banner = landed || !fields.year.trim() ? congrats : s.classOf.replace("{year}", fields.year.trim());
  // The cap is over the words: they step back rather than fight it, and come back as it falls.
  const overWords = rise > 0.32;

  const room = {
    background: p.sky,
    color: p.ink,
    fontFamily: "var(--gift-font-body)",
    ["--k" as string]: "var(--u)",
    ["--top" as string]: `max(0px, calc((100cqh - ${SCENE} * var(--k)) / 2))`,
  } as CSSProperties;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={room}>
      <style>{KEYFRAMES}</style>
      <div className="pointer-events-none absolute inset-0" style={{ background: p.glow }} aria-hidden="true" />

      <AnimatePresence mode="wait">
        {stage === "reading" ? (
          <Reading
            key={`reading-${run}`}
            p={p}
            s={s}
            data={data}
            mode={mode}
            fields={fields}
            seed={seed}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        ) : (
          <motion.div key={`yard-${run}`} className="absolute inset-0" exit={{ opacity: 0, transition: { duration: reduce ? 0.15 : 0.45 } }}>
            {/* the lawn, and the year group on it */}
            <div className="absolute inset-x-0 bottom-0" style={{ top: "calc(var(--top) + 117 * var(--k))", background: `linear-gradient(180deg, ${p.groundEdge}, ${p.ground})` }} aria-hidden="true" />
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: "calc(var(--top) + 89 * var(--k))", width: "calc(113 * var(--k))", height: "calc(31 * var(--k))", maskImage: "linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 9%, #000 91%, transparent)" }}
              aria-hidden="true"
            >
              <Crowd p={p} cheering={cheering} seed={seed} still={!animate} />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "var(--top)", width: "calc(124 * var(--k))", height: "calc(20 * var(--k))" }} aria-hidden="true">
              <Bunting p={p} accent={data.accentColor} />
            </div>

            <p
              className="absolute inset-x-0 truncate px-[calc(10*var(--k))] text-center font-semibold tracking-[0.3em] uppercase"
              style={{ top: "calc(var(--top) + 16 * var(--k))", fontSize: "calc(2.9 * var(--k))", color: p.soft }}
            >
              {data.senderName} <span aria-hidden="true">→</span> {data.recipientName}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={banner}
                /* Sized to hold "Promoción 2026" on one line on a narrow phone; a long name is
                   clamped at two, because a third line would run down into the cap's path. */
                className="absolute inset-x-0 line-clamp-2 px-[calc(8*var(--k))] text-center leading-[1.06] text-balance italic"
                style={{ top: "calc(var(--top) + 21 * var(--k))", fontSize: banner === congrats ? "calc(7.6 * var(--k))" : "calc(9.6 * var(--k))", fontFamily: "var(--gift-font-display)", color: p.ink }}
                initial={animate ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: overWords ? 0.16 : 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
              >
                {banner}
              </motion.p>
            </AnimatePresence>
            {fields.school.trim() && !landed ? (
              <p
                className="absolute inset-x-0 line-clamp-2 px-[calc(8*var(--k))] text-center leading-[1.35] font-semibold tracking-[0.2em] uppercase transition-opacity duration-500"
                style={{ top: "calc(var(--top) + 33.5 * var(--k))", fontSize: "calc(2.9 * var(--k))", color: p.gold, opacity: overWords ? 0.16 : 1 }}
              >
                {fields.school}
              </p>
            ) : null}

            {stage === "yard" ? (
              <div
                className={cn("absolute left-1/2 z-[6]", animate && !launched && "ct-hover")}
                style={{
                  top: "calc(var(--top) + 46 * var(--k))",
                  width: "calc(60 * var(--k))",
                  height: "calc(50.3 * var(--k))",
                  transform: `translateX(calc(-50% + ${(drift * 7).toFixed(2)} * var(--k))) translateY(calc(${(-CAP_TRAVEL * rise).toFixed(2)} * var(--k))) rotate(${(spin + (launched ? 0 : hop * 7)).toFixed(1)}deg) scale(${(1 + hop * 0.06).toFixed(3)})`,
                  transformOrigin: "50% 33%",
                  filter: "drop-shadow(0 calc(1.4 * var(--k)) calc(2.6 * var(--k)) rgba(0,0,0,0.45))",
                  transition: animate && !launched ? "transform .12s ease-out" : undefined,
                }}
              >
                {/* the light the cap hangs in, which brightens as the noise pushes it */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[33%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ width: "calc(84 * var(--k))", height: "calc(84 * var(--k))", background: `radial-gradient(50% 50% at 50% 50%, rgba(232,196,106,${(0.1 + hop * 0.36).toFixed(3)}), transparent 68%)`, transition: "background .12s linear" }}
                />
                <Mortarboard p={p} t={tassel} swing={animate && !launched} />
              </div>
            ) : null}

            {/* the rolled diploma, once the cap is back down */}
            {stage === "roll" ? (
              <RolledDiploma
                key={`roll-${run}`}
                p={p}
                s={s}
                accent={data.accentColor}
                reduce={!!reduce}
                onPulled={() => {
                  setBurst((b) => b + 1);
                  setOrigin({ x: 0.5, y: 0.46 });
                  eventRef.current?.({ type: "progress", pct: 70 });
                  setStage("reading");
                }}
              />
            ) : null}

            {/* what they do, and the button that always works */}
            {stage === "yard" ? (
              <div
                className="absolute left-1/2 z-[8] flex w-max max-w-[calc(92*var(--k))] -translate-x-1/2 flex-col items-center gap-[calc(2.6*var(--k))]"
                style={{ top: "calc(var(--top) + 122 * var(--k))" }}
              >
                {launched ? (
                  <p className="rounded-full font-semibold tracking-[0.24em] whitespace-nowrap uppercase" style={pill(p)}>
                    {s.upItGoes}
                  </p>
                ) : preview ? (
                  <>
                    <p className="font-semibold tracking-[0.2em] uppercase" style={{ fontSize: "calc(3.2 * var(--k))", color: p.ink }}>
                      {s.cheerInto}
                    </p>
                    <Meter p={p} s={s} level={0.82} line={0.44} live={false} />
                  </>
                ) : (
                  <Cheering key={`mic-${run}`} p={p} s={s} animate={animate} onPush={setHop} onCheer={(power) => launch(throwFrom(power))} />
                )}
                {!launched && !preview ? (
                  <motion.button
                    type="button"
                    onClick={() => launch(TAP_THROW)}
                    whileTap={{ scale: 0.96 }}
                    className="flex max-w-full items-center gap-[calc(2*var(--k))] rounded-full font-semibold tracking-[0.2em] uppercase shadow-[0_12px_26px_-14px_rgba(0,0,0,0.65)]"
                    style={{ padding: "calc(2.5 * var(--k)) calc(5.4 * var(--k))", fontSize: "calc(3 * var(--k))", background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
                  >
                    <Rocket className="shrink-0" style={{ width: "calc(3.6 * var(--k))", height: "calc(3.6 * var(--k))" }} />
                    <span className="truncate">{s.throwIt}</span>
                  </motion.button>
                ) : null}
              </div>
            ) : null}

            {preview ? (
              <div className="pointer-events-none absolute inset-0 z-[7]" aria-hidden="true">
                <StillConfetti colors={[data.accentColor, p.gold, p.paper, "#FFFFFF"]} seed={seed} />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {animate && stage !== "reading" ? (
        <div className="pointer-events-none absolute inset-0 z-[20]" aria-hidden="true">
          <Ambience layers={[{ kind: "sparkles", colors: p.sparkle, count: 10 }]} opacity={0.65} />
        </div>
      ) : null}
      {animate ? <Confetti burst={burst} colors={[data.accentColor, p.gold, p.paper, "#FFFFFF"]} count={200} origin={origin} className="pointer-events-none absolute inset-0 z-[25]" /> : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/** The loudness bar, with the line a cheer has to clear marked on it. */
function Meter({ p, s, level, line, live }: { p: Palette; s: Strings; level: number; line: number; live: boolean }) {
  return (
    <div className="flex items-center gap-[calc(2.4*var(--k))] rounded-full" style={{ ...pill(p), padding: "calc(1.8 * var(--k)) calc(3 * var(--k))" }}>
      <span aria-hidden="true" className="relative grid shrink-0 place-items-center rounded-full" style={{ width: "calc(7 * var(--k))", height: "calc(7 * var(--k))", background: "rgba(var(--gift-accent-rgb),0.18)" }}>
        <Mic style={{ width: "calc(3.6 * var(--k))", height: "calc(3.6 * var(--k))", color: "var(--gift-accent)" }} />
        {live ? (
          <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--gift-accent)", transform: `scale(${1 + level * 0.8})`, opacity: 0.2 + level * 0.65 }} />
        ) : null}
      </span>
      <span
        role="progressbar"
        aria-label={s.meter}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(1, Math.max(0, level)) * 100)}
        className="relative overflow-hidden rounded-full"
        style={{ width: "calc(52 * var(--k))", height: "calc(4.6 * var(--k))", background: "rgba(255,255,255,0.14)" }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.round(Math.min(1, Math.max(0, level)) * 100)}%`, background: `linear-gradient(90deg, var(--gift-accent-soft), ${p.gold})`, transition: "width .09s linear" }}
        />
        <span className="absolute inset-y-0 rounded-full" style={{ left: `${Math.round(Math.min(1, Math.max(0, line)) * 100)}%`, width: "calc(0.9 * var(--k))", background: p.ink, opacity: 0.85 }} />
      </span>
    </div>
  );
}

/**
 * The microphone and what it does to the cap. Its own component, remounted on replay, so the
 * detector starts with fresh ears every time and the stream closes the moment the cap is thrown.
 */
function Cheering({
  p,
  s,
  animate,
  onPush,
  onCheer,
}: {
  p: Palette;
  s: Strings;
  animate: boolean;
  onPush: (push: number) => void;
  onCheer: (power: number) => void;
}) {
  const mic = useCheer({
    enabled: true,
    onCheer: (cheer) => onCheer(cheer.power),
    onMeter: (m) => onPush(m.push),
  });
  // Said out loud as it changes, so the meter is not the only thing telling them how they are doing.
  const prompt = (line: string) => (
    <p aria-live="polite" className="font-semibold tracking-[0.2em] uppercase" style={{ fontSize: "calc(3.2 * var(--k))", color: p.ink }}>
      {line}
    </p>
  );

  if (mic.state === "listening") {
    // A muted microphone reports a flat nothing for ever; say so rather than wait for a cheer.
    if (mic.deaf) {
      return (
        <p aria-live="polite" className="max-w-[calc(84*var(--k))] text-center" style={{ fontSize: "calc(3 * var(--k))", color: p.soft }}>
          {s.noSound}
        </p>
      );
    }
    return (
      <>
        {prompt(mic.level >= mic.line ? s.louder : mic.push > 0.25 ? s.nearly : s.cheerInto)}
        <Meter p={p} s={s} level={mic.level} line={mic.line} live />
      </>
    );
  }

  if (mic.state === "idle") {
    return (
      <>
        {prompt(mic.opening ? s.asking : s.goOn)}
        <motion.button
          type="button"
          onClick={() => void mic.start()}
          disabled={mic.opening}
          aria-busy={mic.opening}
          whileTap={{ scale: 0.96 }}
          className={cn("flex max-w-full items-center gap-[calc(2*var(--k))] rounded-full font-semibold tracking-[0.2em] uppercase transition-opacity", animate && !mic.opening && "ct-pulse", mic.opening && "opacity-60")}
          style={{ ...pill(p), padding: "calc(2.2 * var(--k)) calc(4.8 * var(--k))" }}
        >
          <Mic className="shrink-0" style={{ width: "calc(3.4 * var(--k))", height: "calc(3.4 * var(--k))", color: "var(--gift-accent)" }} />
          <span className="truncate">{mic.opening ? s.asking : s.useMic}</span>
        </motion.button>
      </>
    );
  }

  // Denied, or a laptop with nothing listening. Say so plainly; the button under this still works.
  return (
    <p aria-live="polite" className="max-w-[calc(84*var(--k))] text-center" style={{ fontSize: "calc(3 * var(--k))", color: p.soft }}>
      {mic.state === "denied" ? s.micOff : s.noMic}
    </p>
  );
}

const PULL_PX = 104;

/** The diploma drops in, tied. Drag the ribbon down — or tap the bow — and it comes off. */
function RolledDiploma({ p, s, accent, reduce, onPulled }: { p: Palette; s: Strings; accent: string; reduce: boolean; onPulled: () => void }) {
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const fromY = useRef<number | null>(null);
  const pressY = useRef<number | null>(null);
  const moved = useRef(0);
  const doneRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const setPullAt = useCallback((next: number) => {
    pullRef.current = next;
    setPull(next);
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPullAt(1);
    onPulled();
  }, [onPulled, setPullAt]);

  /** Carries the ribbon the rest of the way by itself, from wherever their hand left it. */
  const glide = useCallback(
    (to: number, ms: number, then?: () => void) => {
      cancelAnimationFrame(rafRef.current);
      const from = pullRef.current;
      const startedAt = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - startedAt) / ms);
        setPullAt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) rafRef.current = requestAnimationFrame(step);
        else then?.();
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [setPullAt],
  );

  /** A tap is a pull too: the bow slides off by itself. */
  const tugLoose = useCallback(() => {
    if (doneRef.current) return;
    if (reduce) finish();
    else glide(1, 420, finish);
  }, [finish, glide, reduce]);

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (doneRef.current) return;
    // Taking hold mid-glide carries on from where the ribbon is, instead of jumping back to the bow.
    cancelAnimationFrame(rafRef.current);
    fromY.current = e.clientY - pullRef.current * PULL_PX;
    pressY.current = e.clientY;
    moved.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (fromY.current === null || doneRef.current) return;
    moved.current = Math.max(moved.current, Math.abs(e.clientY - (pressY.current ?? e.clientY)));
    const next = Math.min(1, Math.max(0, (e.clientY - fromY.current) / PULL_PX));
    setPullAt(next);
    if (next >= 1) finish();
  };
  const onUp = () => {
    if (fromY.current === null || doneRef.current) return;
    fromY.current = null;
    // A tap loosens it; a drag that stopped short eases back rather than snapping home.
    if (moved.current < 8) tugLoose();
    else if (reduce) setPullAt(0);
    else glide(0, 260);
  };
  const onKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    tugLoose();
  };

  return (
    <>
      <motion.button
        type="button"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={s.pull}
        className="absolute left-1/2 z-[9] -translate-x-1/2 touch-none"
        style={{ top: "calc(var(--top) + 42 * var(--k))", width: "calc(78 * var(--k))", height: "calc(50.7 * var(--k))", filter: "drop-shadow(0 calc(2 * var(--k)) calc(3.4 * var(--k)) rgba(0,0,0,0.5))" }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-60%", rotate: -8 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={reduce ? { duration: 0.25 } : { type: "spring", stiffness: 150, damping: 15, delay: 0.3 }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: "calc(100 * var(--k))", height: "calc(70 * var(--k))", background: "radial-gradient(50% 50% at 50% 50%, rgba(232,196,106,0.16), transparent 68%)" }}
        />
        <Diploma p={p} accent={accent} pull={pull} />
      </motion.button>
      <motion.div
        className="pointer-events-none absolute left-1/2 z-[9] flex w-max max-w-[calc(92*var(--k))] -translate-x-1/2 flex-col items-center gap-[calc(1.6*var(--k))]"
        style={{ top: "calc(var(--top) + 100 * var(--k))" }}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.9 }}
      >
        <p aria-live="polite" className="rounded-full font-semibold tracking-[0.24em] whitespace-nowrap uppercase" style={pill(p)}>
          {pull > 0.05 ? s.pulling : s.pull}
        </p>
        <p style={{ fontSize: "calc(3 * var(--k))", color: p.soft }}>{s.orTapBow}</p>
      </motion.div>
    </>
  );
}

/** The diploma, unrolled: the letter written on it, the yearbook taped underneath. */
function Reading({
  p,
  s,
  data,
  mode,
  fields,
  seed,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  p: Palette;
  s: Strings;
  data: TemplateProps<CapTossFields>["data"];
  mode: TemplateProps["mode"];
  fields: CapTossFields;
  seed: string;
  reduce: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const [unrolled, setUnrolled] = useState(reduce);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const tilts = useMemo(() => {
    const rng = mulberry32(hashString(seed));
    return data.photos.map(() => (rng() - 0.5) * 6);
  }, [data.photos, seed]);

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

  const unroll = { duration: reduce ? 0 : 1.15, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.div className="absolute inset-0 z-10" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none"
        style={{ background: p.paper, backgroundImage: GRAIN, color: p.paperInk }}
        initial={reduce ? false : { clipPath: "inset(0% 0% 100% 0%)" }}
        animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
        transition={unroll}
        onAnimationComplete={() => setUnrolled(true)}
      >
        <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(7*var(--u))] pt-[max(8cqh,52px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
          <section className="relative px-[calc(3*var(--u))]">
            <div className="pointer-events-none absolute inset-0 rounded-[3px] border" style={{ borderColor: p.goldDeep, opacity: 0.55 }} aria-hidden="true" />
            <div className="pointer-events-none absolute inset-[calc(1.4*var(--u))] rounded-[2px] border" style={{ borderColor: p.goldDeep, opacity: 0.28 }} aria-hidden="true" />
            <div className="px-[calc(4*var(--u))] pt-[calc(7*var(--u))] pb-[calc(7*var(--u))]">
              {fields.school.trim() ? (
                <p className="text-center text-[calc(2.8*var(--u))] font-semibold tracking-[0.3em] uppercase" style={{ color: p.goldDeep }}>
                  {fields.school}
                </p>
              ) : null}
              <p className="mt-[calc(1.6*var(--u))] text-center text-[calc(7.4*var(--u))] leading-tight text-balance italic" style={{ fontFamily: "var(--gift-font-display)" }}>
                {fields.year.trim() ? s.classOf.replace("{year}", fields.year.trim()) : s.congrats.replace("{name}", data.recipientName)}
              </p>
              <div className="mx-auto mt-[calc(3*var(--u))] flex w-[70%] items-center gap-[calc(2*var(--u))]" aria-hidden="true">
                <span className="h-px flex-1" style={{ background: p.goldDeep, opacity: 0.5 }} />
                <span className="size-[calc(1.6*var(--u))] rotate-45" style={{ background: p.goldDeep, opacity: 0.7 }} />
                <span className="h-px flex-1" style={{ background: p.goldDeep, opacity: 0.5 }} />
              </div>
              {fields.awardedFor.trim() ? (
                <div className="mt-[calc(4*var(--u))] flex items-start gap-[calc(3.4*var(--u))]">
                  <span className="mt-[calc(0.5*var(--u))] block w-[calc(13*var(--u))] shrink-0">
                    <Seal p={p} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[calc(2.7*var(--u))] font-semibold tracking-[0.26em] uppercase opacity-55">{s.awarded}</span>
                    <span className="mt-[calc(1*var(--u))] block text-[calc(4.6*var(--u))] leading-snug break-words" style={{ fontFamily: "var(--gift-font-hand)" }}>
                      {fields.awardedFor}
                    </span>
                  </span>
                </div>
              ) : null}
              <div className="mt-[calc(7*var(--u))]">
                <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" greeting={data.title?.trim() || undefined} />
              </div>
            </div>
          </section>

          {data.photos.length ? (
            <>
              <p className="text-center text-[calc(3*var(--u))] font-semibold tracking-[0.26em] uppercase" style={{ color: p.goldDeep }}>
                {s.yearbook}
              </p>
              <div className="grid grid-cols-2 gap-[calc(5*var(--u))] px-[calc(1*var(--u))]">
                {data.photos.map((photo, i) => (
                  <Yearbook key={photo.id} photo={photo} p={p} rot={tilts[i] ?? 0} index={i} reduce={reduce} single={data.photos.length === 1} />
                ))}
              </div>
            </>
          ) : null}

          {data.countdown ? (
            <div className="rounded-[4px] border p-[calc(5*var(--u))]" style={{ borderColor: p.paperEdge }}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}

          {data.surprise ? (
            <div className="rounded-[4px] border p-[calc(5*var(--u))]" style={{ borderColor: p.paperEdge }}>
              <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.8*var(--u))] font-semibold tracking-[0.26em] uppercase opacity-55">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}

          <div ref={endRef} className="rounded-[4px] border p-[calc(4*var(--u))]" style={{ borderColor: p.paperEdge }}>
            <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </motion.div>

      {/* the roller travelling down the screen while the page comes off it */}
      {!unrolled ? (
        <motion.div
          className="pointer-events-none absolute inset-x-0 z-[12]"
          style={{ height: "calc(6 * var(--u))", marginTop: "calc(-3 * var(--u))" }}
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={unroll}
          aria-hidden="true"
        >
          <div className="mx-auto h-full w-[min(94cqw,600px)] rounded-full" style={{ background: `linear-gradient(180deg,#FFFCF2,${p.paper} 46%,${p.paperEdge})`, boxShadow: "0 calc(1*var(--u)) calc(3*var(--u)) rgba(0,0,0,0.35)" }} />
        </motion.div>
      ) : null}
    </motion.div>
  );
}

/** A photo in mounting corners, the caption under it in handwriting. */
function Yearbook({ photo, p, rot, index, reduce, single }: { photo: GiftPhoto; p: Palette; rot: number; index: number; reduce: boolean; single: boolean }) {
  const corner = (position: CSSProperties, rotate: string) => (
    <span aria-hidden="true" className="absolute z-[2] size-[calc(4.4*var(--u))]" style={{ ...position, background: p.goldDeep, opacity: 0.55, clipPath: "polygon(0 0, 100% 0, 0 100%)", rotate }} />
  );
  return (
    <motion.figure
      className={cn("relative m-0", single && "col-span-2 mx-auto w-[64%]")}
      style={{ rotate: rot }}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 16, delay: (index % 2) * 0.1 }}
    >
      <div className="relative bg-[#FFFDF8] p-[calc(2*var(--u))] pb-[calc(2.6*var(--u))] shadow-[0_12px_26px_-14px_rgba(60,45,20,0.55)]">
        {corner({ top: 0, left: 0 }, "0deg")}
        {corner({ top: 0, right: 0 }, "90deg")}
        {corner({ bottom: 0, right: 0 }, "180deg")}
        {corner({ bottom: 0, left: 0 }, "270deg")}
        <div className="aspect-[4/5] w-full overflow-hidden bg-black/5">
          <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </div>
        {photo.caption ? (
          <figcaption className="mt-[calc(2*var(--u))] text-center text-[calc(3.9*var(--u))] leading-tight break-words" style={{ fontFamily: "var(--gift-font-hand)", color: p.paperInk }}>
            {photo.caption}
          </figcaption>
        ) : null}
      </div>
    </motion.figure>
  );
}
