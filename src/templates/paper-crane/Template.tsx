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
import { Mic } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useBlowDetector } from "../_shared/hooks/use-blow-detector";
import { hashString, mulberry32 } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { GRAIN, PAPERS, ROOM, Table, type Paper as PaperPalette } from "./art";
import { Paper } from "./Paper";
import { AUTO_SECONDS, BREATH_RMS, STILL, breathPush, foldStep, liftStep } from "./fold";
import { STEPS, foldPlan, usableLines } from "./origami";
import { readFields, type PaperCraneFields } from "./schema";

const S = {
  en: {
    hold: "press and hold the crease",
    holding: "keep holding",
    sprang: "it opened again — hold it longer",
    tapFold: "or tap to fold",
    blow: "now blow into your phone",
    blowing: "keep blowing",
    breathe: "a little more breath",
    mic: "let it hear you",
    noMic: "this phone won't let the page listen",
    letGo: "or let it go",
    letGoOnly: "let it go",
    gone: "there it goes",
    said: "what each fold said",
    fallbackLines: [
      "I was wrong, and I knew it before I got home.",
      "I said it to win. That is the worst part.",
      "You don't have to be over it yet.",
      "I'll be here when you are.",
    ],
    closing: "Take all the time you need.",
  },
  es: {
    hold: "mantén pulsado el pliegue",
    holding: "sigue pulsando",
    sprang: "se ha vuelto a abrir — aguanta más",
    tapFold: "o toca para doblar",
    blow: "ahora sopla al teléfono",
    blowing: "sigue soplando",
    breathe: "un poco más de aire",
    mic: "deja que te escuche",
    noMic: "este teléfono no deja que la página escuche",
    letGo: "o suéltala",
    letGoOnly: "suéltala",
    gone: "ahí va",
    said: "lo que decía cada pliegue",
    fallbackLines: [
      "Me equivoqué, y lo supe antes de llegar a casa.",
      "Lo dije por ganar. Eso es lo peor.",
      "No tienes que haberlo superado ya.",
      "Aquí estaré cuando lo estés.",
    ],
    closing: "Tómate todo el tiempo que necesites.",
  },
};

type Phase = "folding" | "crane" | "flying" | "letter";

export function Template({
  data,
  mode,
  onEvent,
  onReact,
  onMakeOne,
}: TemplateProps<PaperCraneFields>) {
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const animate = !preview && !reduce;
  const audio = useGiftAudio(data.music, !preview);
  // Read here too, key by key, so a half-written draft still folds with the paper it chose.
  const fields = useMemo(() => readFields(data.fields), [data.fields]);
  const p = PAPERS[fields.paper] ?? PAPERS.ivory;
  const lines = useMemo(() => usableLines(fields.lines, s.fallbackLines), [fields.lines, s]);
  const plan = useMemo(() => foldPlan(lines.length), [lines.length]);
  const closing = fields.closing.trim() || s.closing;

  const [phase, setPhase] = useState<Phase>(preview ? "crane" : "folding");
  const [step, setStep] = useState(preview ? STEPS : 0);
  const [fold, setFold] = useState(0);
  const [said, setSaid] = useState(preview ? lines.length : 0);
  const [held, setHeld] = useState(false);
  const [sprang, setSprang] = useState(false);
  const [lift, setLift] = useState(0);
  const [run, setRun] = useState(0);

  const stepRef = useRef(step);
  const foldRef = useRef(0);
  const groupRef = useRef(preview ? plan.length : 0);
  const holdRef = useRef(false);
  const autoRef = useRef(false);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
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

  /** One fold is done: say its line if the group is finished, or let the rest of it follow on. */
  const finishStep = useCallback(() => {
    const next = stepRef.current + 1;
    stepRef.current = next;
    setStep(next);
    foldRef.current = 0;
    setFold(0);
    const group = plan[groupRef.current] ?? [];
    const lastOfGroup = group.length ? group[group.length - 1] : next - 1;
    if (next > lastOfGroup) {
      // The line has been said; the next crease wants a press of its own.
      autoRef.current = false;
      holdRef.current = false;
      setHeld(false);
      setSprang(false);
      groupRef.current += 1;
      setSaid(groupRef.current);
      eventRef.current?.({
        type: "progress",
        pct: Math.round((groupRef.current / plan.length) * 50),
      });
      if (next >= STEPS) setPhase("crane");
    } else {
      autoRef.current = true;
    }
  }, [plan]);

  const runLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = autoRef.current
        ? Math.min(1, foldRef.current + Math.min(0.05, dt) / AUTO_SECONDS)
        : foldStep(foldRef.current, holdRef.current, dt);
      foldRef.current = next;
      setFold(next);
      if (next >= 1) finishStep();
      if (foldRef.current > 0 || holdRef.current || autoRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [finishStep]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
    },
    [],
  );

  /** Reduced motion, and the one-tap way through: the whole group of folds lands at once. */
  const foldAtOnce = useCallback(() => {
    const group = plan[groupRef.current] ?? [];
    const next = (group.length ? group[group.length - 1] : stepRef.current) + 1;
    stepRef.current = next;
    setStep(next);
    foldRef.current = 0;
    setFold(0);
    autoRef.current = false;
    groupRef.current += 1;
    setSaid(groupRef.current);
    eventRef.current?.({
      type: "progress",
      pct: Math.round((groupRef.current / plan.length) * 50),
    });
    if (next >= STEPS) setPhase("crane");
  }, [plan]);

  const press = (event: ReactPointerEvent<HTMLButtonElement>) => {
    // Only the finger, or the left button: a right-click has no "up" to spring the paper back.
    if (event.button !== 0) return;
    if (preview || phase !== "folding" || autoRef.current) return;
    begin();
    setSprang(false);
    if (reduce) {
      foldAtOnce();
      return;
    }
    holdRef.current = true;
    setHeld(true);
    runLoop();
  };

  const letGoOfCrease = useCallback(() => {
    if (!holdRef.current) return;
    holdRef.current = false;
    setHeld(false);
    // Only a press that was still going costs the fold; a fold finishing itself is not a slip.
    if (!autoRef.current && foldRef.current > 0.06 && foldRef.current < 1) setSprang(true);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", letGoOfCrease);
    window.addEventListener("pointercancel", letGoOfCrease);
    return () => {
      window.removeEventListener("pointerup", letGoOfCrease);
      window.removeEventListener("pointercancel", letGoOfCrease);
    };
  }, [letGoOfCrease]);

  /** The fallback that always works: one tap and the crease folds itself. */
  const tapFold = () => {
    if (preview || phase !== "folding" || autoRef.current) return;
    begin();
    setSprang(false);
    if (reduce) {
      foldAtOnce();
      return;
    }
    autoRef.current = true;
    runLoop();
  };

  const onLift = useCallback((value: number) => setLift(value), []);
  const flyAway = useCallback(() => {
    if (preview) return;
    setLift(0);
    setPhase("flying");
    eventRef.current?.({ type: "progress", pct: 60 });
  }, [preview]);

  useEffect(() => {
    if (phase !== "flying") return;
    // Reduced motion gets the instant path: the crane is simply gone and the letter is there.
    const id = window.setTimeout(() => setPhase("letter"), reduce ? 420 : 3200);
    return () => window.clearTimeout(id);
  }, [phase, reduce]);

  const replay = () => {
    cancelAnimationFrame(rafRef.current);
    runningRef.current = false;
    holdRef.current = false;
    autoRef.current = false;
    stepRef.current = 0;
    foldRef.current = 0;
    groupRef.current = 0;
    setStep(0);
    setFold(0);
    setSaid(0);
    setHeld(false);
    setSprang(false);
    setLift(0);
    setPhase("folding");
    setRun((r) => r + 1);
  };

  const room = {
    background: ROOM.ground,
    color: ROOM.ink,
    fontFamily: "var(--gift-font-body)",
    ["--k" as string]: "var(--u)",
    ["--top" as string]: "max(0px, calc((100cqh - 154 * var(--k)) / 2))",
  } as CSSProperties;

  const onTable = phase !== "letter";
  const line = said > 0 ? lines[Math.min(said, lines.length) - 1] : "";

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={room}>
      <Table />

      <AnimatePresence mode="wait">
        {onTable ? (
          <motion.div
            key={`table-${run}`}
            className="absolute inset-0"
            exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.6 } }}
          >
            <p
              className="absolute inset-x-0 truncate px-[calc(10*var(--k))] text-center font-semibold tracking-[0.34em] uppercase"
              style={{
                top: "calc(var(--top) + 1 * var(--k))",
                fontSize: "calc(2.8 * var(--k))",
                color: ROOM.faint,
              }}
            >
              {data.senderName} <span aria-hidden="true">→</span> {data.recipientName}
            </p>

            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: "calc(var(--top) + 10 * var(--k))",
                width: "calc(90 * var(--k))",
                height: "calc(90 * var(--k))",
              }}
            >
              <Paper
                p={p}
                step={step}
                t={fold}
                lift={lift}
                flying={phase === "flying"}
                // The editor's still frame: no drift, no settle, nothing moving behind the form.
                reduce={!!reduce || preview}
                showHint={step === 0 && fold === 0}
              />
              {phase === "folding" && !preview ? (
                <button
                  type="button"
                  className="absolute inset-0 touch-none rounded-[8%] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                  aria-label={s.hold}
                  data-crease
                  onPointerDown={press}
                  onPointerUp={letGoOfCrease}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      tapFold();
                    }
                  }}
                />
              ) : null}
            </div>

            {/* one line at a time, under the paper — and read out, for anyone listening instead */}
            <div
              className="pointer-events-none absolute inset-x-0 flex justify-center px-[calc(11*var(--k))] text-center"
              style={{ top: "calc(var(--top) + 99 * var(--k))", height: "calc(15 * var(--k))" }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <AnimatePresence mode="wait">
                {phase === "flying" ? (
                  <motion.p
                    key="closing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0.2 : 1.2, delay: reduce ? 0 : 1 }}
                    className="max-w-[calc(78*var(--k))] self-center leading-snug italic"
                    style={{
                      fontFamily: "var(--gift-font-display)",
                      fontSize: "calc(4.6 * var(--k))",
                      color: ROOM.ink,
                    }}
                  >
                    {closing}
                  </motion.p>
                ) : line ? (
                  <motion.p
                    key={`line-${said}`}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: reduce ? 0.12 : 0.35 } }}
                    transition={{ duration: reduce ? 0.2 : 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-[calc(80*var(--k))] self-center leading-snug italic"
                    style={{
                      fontFamily: "var(--gift-font-display)",
                      fontSize: "calc(4.8 * var(--k))",
                      color: ROOM.ink,
                    }}
                  >
                    {line}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            {/* one mark per line, filled as the folds go in */}
            <div
              className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-[calc(2.4*var(--k))]"
              style={{ top: "calc(var(--top) + 117 * var(--k))" }}
              aria-hidden="true"
            >
              {plan.map((_, i) => (
                <span
                  key={i}
                  className="block rounded-full transition-opacity duration-500"
                  style={{
                    width: "calc(1.6 * var(--k))",
                    height: "calc(1.6 * var(--k))",
                    background: i < said ? "var(--gift-accent)" : ROOM.faint,
                    opacity: i < said ? 0.95 : 0.4,
                  }}
                />
              ))}
            </div>

            <div
              className="absolute inset-x-0 flex flex-col items-center gap-[calc(3*var(--k))] px-[calc(8*var(--k))] text-center"
              style={{ top: "calc(var(--top) + 123 * var(--k))" }}
            >
              {phase === "folding" ? (
                <>
                  <p
                    className="max-w-full font-semibold tracking-[0.22em] uppercase"
                    role="status"
                    aria-live="polite"
                    style={{
                      fontSize: "calc(3 * var(--k))",
                      color: held ? "var(--gift-accent)" : ROOM.soft,
                    }}
                  >
                    {held ? s.holding : sprang ? s.sprang : s.hold}
                  </p>
                  {!preview ? (
                    <button
                      type="button"
                      onClick={tapFold}
                      data-tap-fold
                      className="rounded-full border font-semibold tracking-[0.16em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      style={{
                        padding: "calc(2.2 * var(--k)) calc(5 * var(--k))",
                        fontSize: "calc(2.8 * var(--k))",
                        borderColor: "rgba(239,230,216,0.28)",
                        color: ROOM.soft,
                      }}
                    >
                      {s.tapFold}
                    </button>
                  ) : null}
                </>
              ) : phase === "crane" && !preview ? (
                <Breath
                  key={`breath-${run}`}
                  s={s}
                  lift={lift}
                  animate={animate}
                  onLift={onLift}
                  onGo={flyAway}
                  onBegin={begin}
                />
              ) : phase === "crane" ? (
                <p
                  className="font-semibold tracking-[0.22em] uppercase"
                  style={{ fontSize: "calc(3 * var(--k))", color: ROOM.soft }}
                >
                  {s.blow}
                </p>
              ) : (
                <p
                  className="font-semibold tracking-[0.22em] uppercase"
                  style={{ fontSize: "calc(3 * var(--k))", color: ROOM.faint }}
                >
                  {s.gone}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <Letter
            key={`letter-${run}`}
            data={data}
            mode={mode}
            p={p}
            s={s}
            lines={lines}
            closing={closing}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        )}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/**
 * The microphone and what it does. Its own component, remounted on every replay, so the detector
 * starts clean and the microphone goes back the moment the crane leaves.
 */
function Breath({
  s,
  lift,
  animate,
  onLift,
  onGo,
  onBegin,
}: {
  s: (typeof S)["en"];
  lift: number;
  animate: boolean;
  onLift: (value: number) => void;
  onGo: () => void;
  onBegin: () => void;
}) {
  const blow = useBlowDetector({
    enabled: true,
    onBlow: onBegin,
    threshold: BREATH_RMS,
    holdMs: 600,
  });
  const levelRef = useRef(0);
  useEffect(() => {
    levelRef.current = blow.level;
  }, [blow.level]);
  const listening = blow.state === "listening";

  // Every frame, breath becomes lift — and a pause between breaths costs almost nothing.
  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    let last = performance.now();
    let breath = STILL;
    let shown = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      breath = liftStep(breath, breathPush(levelRef.current), dt);
      if (Math.abs(breath.lift - shown) > 0.015) {
        shown = breath.lift;
        onLift(breath.lift);
      }
      if (breath.lift >= 1) {
        onGo();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening, onLift, onGo]);

  const pushing = breathPush(blow.level) > 0;
  const deaf = blow.state === "denied" || blow.state === "unsupported";

  return (
    <>
      <p
        className="font-semibold tracking-[0.22em] uppercase"
        role="status"
        aria-live="polite"
        style={{
          fontSize: "calc(3 * var(--k))",
          color: listening && pushing ? "var(--gift-accent)" : ROOM.soft,
        }}
      >
        {deaf ? s.noMic : listening ? (pushing ? s.blowing : s.breathe) : s.blow}
      </p>

      {listening ? (
        <div
          className="flex items-center gap-[calc(2.6*var(--k))]"
          role="progressbar"
          aria-valuenow={Math.round(lift * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={s.blow}
        >
          <span
            className="relative grid shrink-0 place-items-center rounded-full"
            style={{
              width: "calc(7*var(--k))",
              height: "calc(7*var(--k))",
              background: "rgba(var(--gift-accent-rgb),0.16)",
            }}
          >
            <Mic
              style={{
                width: "calc(3.4*var(--k))",
                height: "calc(3.4*var(--k))",
                color: "var(--gift-accent)",
              }}
            />
            <span
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: "var(--gift-accent)",
                transform: `scale(${1 + blow.level * 0.8})`,
                opacity: 0.2 + blow.level * 0.6,
              }}
            />
          </span>
          <span
            className="block overflow-hidden rounded-full"
            style={{
              width: "calc(34*var(--k))",
              height: "calc(1.4*var(--k))",
              background: "rgba(239,230,216,0.2)",
            }}
          >
            <span
              className="block h-full rounded-full transition-[width] duration-100"
              style={{ width: `${Math.round(lift * 100)}%`, background: "var(--gift-accent)" }}
            />
          </span>
        </div>
      ) : blow.state === "idle" ? (
        <motion.button
          type="button"
          onClick={() => {
            onBegin();
            void blow.start();
          }}
          whileTap={{ scale: 0.97 }}
          animate={animate ? { opacity: [0.85, 1, 0.85] } : undefined}
          transition={animate ? { duration: 3, repeat: Infinity } : undefined}
          className="flex items-center gap-[calc(2*var(--k))] rounded-full font-semibold tracking-[0.18em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{
            padding: "calc(2.4*var(--k)) calc(5.4*var(--k))",
            fontSize: "calc(2.9*var(--k))",
            background: "var(--gift-accent)",
            color: "var(--gift-on-accent)",
          }}
        >
          <Mic style={{ width: "calc(3.2*var(--k))", height: "calc(3.2*var(--k))" }} />
          {s.mic}
        </motion.button>
      ) : null}

      <button
        type="button"
        onClick={onGo}
        data-let-go
        className="rounded-full border font-semibold tracking-[0.16em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{
          padding: "calc(2.2*var(--k)) calc(5*var(--k))",
          fontSize: "calc(2.8*var(--k))",
          borderColor: "rgba(239,230,216,0.28)",
          color: ROOM.soft,
        }}
      >
        {deaf ? s.letGoOnly : s.letGo}
      </button>
    </>
  );
}

/** What the crane left behind: the lines it was folded from, and then the whole letter. */
function Letter({
  data,
  mode,
  p,
  s,
  lines,
  closing,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<PaperCraneFields>["data"];
  mode: TemplateProps["mode"];
  p: PaperPalette;
  s: (typeof S)["en"];
  lines: string[];
  closing: string;
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
    const rng = mulberry32(hashString(`${data.recipientName}${data.senderName}crane`));
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
  }, [onEvent, mode]);

  const paper: CSSProperties = { background: p.face, backgroundImage: GRAIN, color: p.ink };
  const shadow = "shadow-[0_1px_2px_rgba(0,0,0,0.18),0_26px_50px_-26px_rgba(0,0,0,0.75)]";

  return (
    <motion.div
      className="absolute inset-0 scrollbar-none overflow-x-hidden overflow-y-auto overscroll-contain"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0.2 : 0.7 }}
    >
      <div className="relative mx-auto flex w-[min(88cqw,540px)] flex-col gap-[calc(6*var(--u))] pt-[max(10cqh,64px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        <motion.p
          className="px-[calc(3*var(--u))] text-center text-[calc(4.4*var(--u))] leading-snug italic"
          style={{ fontFamily: "var(--gift-font-display)", color: ROOM.soft }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {closing}
        </motion.p>

        <motion.article
          className={cn(
            "relative rounded-[3px] px-[calc(7*var(--u))] pt-[calc(8*var(--u))] pb-[calc(8*var(--u))]",
            shadow,
          )}
          style={{ ...paper, rotate: -0.4 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.3 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[calc(2.8*var(--u))] font-semibold tracking-[0.24em] uppercase opacity-45">
            {s.said}
          </p>
          <ul className="mt-[calc(3.5*var(--u))] flex flex-col gap-[calc(2.4*var(--u))]">
            {lines.map((text, i) => (
              <li
                key={`${i}-${text}`}
                className="flex gap-[calc(3*var(--u))] text-[calc(4.2*var(--u))] leading-snug"
              >
                <span
                  aria-hidden="true"
                  className="mt-[calc(2.4*var(--u))] block h-px w-[calc(5*var(--u))] shrink-0"
                  style={{ background: p.edge }}
                />
                <span className="italic" style={{ fontFamily: "var(--gift-font-display)" }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>
          <div
            className="mt-[calc(7*var(--u))] border-t pt-[calc(6*var(--u))]"
            style={{ borderColor: p.edge }}
          >
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
        </motion.article>

        {data.photos.length ? (
          <div className="grid grid-cols-2 gap-[calc(5*var(--u))]">
            {data.photos.map((photo, i) => (
              <Print
                key={photo.id}
                photo={photo}
                rot={tilts[i] ?? 0}
                index={i}
                reduce={reduce}
                single={data.photos.length === 1}
              />
            ))}
          </div>
        ) : null}

        {data.countdown ? (
          <div
            className={cn("rounded-[3px] px-[calc(2*var(--u))] py-[calc(5*var(--u))]", shadow)}
            style={paper}
          >
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div
            className={cn("rounded-[3px] p-[calc(5*var(--u))]", shadow)}
            style={{ ...paper, rotate: "0.5deg" }}
          >
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.8*var(--u))] font-semibold tracking-[0.24em] uppercase opacity-45">
              {t("ps")}
            </p>
            <SurpriseReveal
              surprise={data.surprise}
              locale={data.locale}
              tone="light"
              onReveal={() => onEvent?.({ type: "surprise" })}
            />
          </div>
        ) : null}

        <div
          ref={endRef}
          className={cn("rounded-[3px] p-[calc(4*var(--u))]", shadow)}
          style={paper}
        >
          <EndScreen
            data={data}
            tone="light"
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={onReplay}
          />
        </div>
      </div>
    </motion.div>
  );
}

/** A photo, printed small and laid on the table with its caption in the sender's hand. */
function Print({
  photo,
  rot,
  index,
  reduce,
  single,
}: {
  photo: GiftPhoto;
  rot: number;
  index: number;
  reduce: boolean;
  single: boolean;
}) {
  return (
    <motion.figure
      className={cn("relative m-0", single && "col-span-2 mx-auto w-[64%]")}
      style={{ rotate: rot }}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: (index % 2) * 0.1 }}
    >
      <div className="bg-[#FBF7EF] p-[calc(1.8*var(--u))] pb-[calc(2.6*var(--u))] shadow-[0_12px_26px_-14px_rgba(0,0,0,0.7)]">
        <div className="aspect-[4/5] w-full overflow-hidden bg-black/10">
          <img
            src={photo.url}
            alt={photo.alt ?? ""}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
        </div>
        {photo.caption ? (
          <figcaption
            className="mt-[calc(1.8*var(--u))] text-center text-[calc(3.8*var(--u))] leading-tight break-words text-[#3A322A]"
            style={{ fontFamily: "var(--gift-font-hand)" }}
          >
            {photo.caption}
          </figcaption>
        ) : null}
      </div>
    </motion.figure>
  );
}
