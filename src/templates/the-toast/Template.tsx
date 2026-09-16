"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Hand, Wine as WineIcon } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { rgba } from "../_shared/theme";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { LEFT_X, PALETTES, RIGHT_X, Table, WINES, rimOf, type Palette } from "./art";
import { fieldsSchema, type ToastFields } from "./schema";
import {
  AFTER_SPILL,
  BUTTON_TILT,
  LEVEL_MAX,
  POUR_FULL,
  TILT_FLOOR,
  TOP_RATE,
  bottleAngle,
  fill,
  pourRate,
  pourStatus,
  settled,
} from "./pour";
import { useKnock } from "./use-knock";
import { useTilt } from "./use-tilt";

const S = {
  en: {
    tiltToPour: "tilt your phone to pour",
    holdToPour: "hold the button to pour",
    pourButton: "hold to pour",
    orTilt: "or tilt your phone",
    keepPouring: "keep going",
    levelOff: "now bring it back level",
    letGo: "let go, that's full",
    careful: "careful — it's at the brim",
    spilled: "…a bit much. pour again.",
    enableTilt: "turn on tilt",
    noTilt: "no tilt on this one — the button does it",
    knock: "knock your phone, gently",
    tapToClink: "tap to touch the glasses together",
    knockHint: "the way you touch two glasses",
    knockButton: "clink",
    noKnock: "no knock on this one — the button does it",
    steady: "hold it still, then knock",
    firmer: "a bit sharper",
    enableMotion: "turn on motion",
    toName: "To {name}",
    theToast: "the toast",
    raise: "raise a glass",
    speech: "a few words",
    // Both start with the words printed on the button, so saying what it says presses it.
    pourAria: "hold to pour, or tilt your phone",
    pourAriaButton: "hold to pour",
    clinkAria: "clink the glasses",
  },
  es: {
    tiltToPour: "inclina el teléfono para servir",
    holdToPour: "mantén pulsado el botón para servir",
    pourButton: "mantén para servir",
    orTilt: "o inclina el teléfono",
    keepPouring: "sigue",
    levelOff: "ahora enderézalo",
    letGo: "suéltalo, ya está lleno",
    careful: "cuidado, está al borde",
    spilled: "…te has pasado. sirve otra vez.",
    enableTilt: "activar la inclinación",
    noTilt: "este no se inclina: sirve con el botón",
    knock: "golpea el teléfono, con suavidad",
    tapToClink: "toca para chocar las copas",
    knockHint: "como cuando se chocan dos copas",
    knockButton: "brindar",
    noKnock: "este no siente el golpe: brinda con el botón",
    steady: "sujétalo quieto y golpéalo",
    firmer: "un poco más seco",
    enableMotion: "activar el movimiento",
    toName: "Por {name}",
    theToast: "el brindis",
    // Not "levantad": the gift may be for one person, and "arriba las copas" is what gets said
    // either way.
    raise: "arriba las copas",
    speech: "unas palabras",
    pourAria: "mantén para servir, o inclina el teléfono",
    pourAriaButton: "mantén para servir",
    clinkAria: "brindar con las copas",
  },
};

/** The linen's weave, multiplied over the cloth and the cards. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.52 0 0 0 0 0.44 0 0 0 0 0.32 0 0 0 0.13 0'/></filter><rect width='100%' height='100%' filter='url(%23w)'/></svg>\")";

const KEYFRAMES = `
.tt-flame{transform-box:fill-box;transform-origin:50% 100%;animation:tt-flicker 1.2s ease-in-out infinite alternate}
@keyframes tt-flicker{0%{transform:scale(1,1) skewX(-3deg)}50%{transform:scale(1.08,.93) skewX(3deg)}100%{transform:scale(.94,1.1) skewX(-1deg)}}
.tt-breathe{transform-box:fill-box;transform-origin:center;animation:tt-breathe 2.6s ease-in-out infinite alternate}
@keyframes tt-breathe{from{transform:scale(.9);opacity:.8}to{transform:scale(1.1);opacity:1}}
.tt-fizz{animation-name:tt-fizz;animation-timing-function:linear;animation-iteration-count:infinite}
@keyframes tt-fizz{0%{transform:translateY(0);opacity:0}18%{opacity:.9}88%{opacity:.5}100%{transform:translateY(calc(-1px * var(--rise)));opacity:0}}
.tt-ring{animation:tt-ring 1.1s cubic-bezier(.22,1,.36,1) 1 both}
@keyframes tt-ring{0%{r:3;opacity:0}12%{opacity:.85}100%{r:52;opacity:0}}
.tt-spill{transform-box:fill-box;transform-origin:50% 40%;animation:tt-spill .7s cubic-bezier(.22,1,.36,1) 1 both}
@keyframes tt-spill{from{transform:scale(.25);opacity:0}to{transform:scale(1);opacity:1}}
.tt-pulse{animation:tt-pulse 2.4s ease-in-out infinite}
@keyframes tt-pulse{0%,100%{opacity:.62}50%{opacity:1}}
.tt-drift{animation:tt-drift 3.4s ease-in-out infinite alternate}
@keyframes tt-drift{from{translate:0 calc(.8 * var(--k))}to{translate:0 calc(-.8 * var(--k))}}
@media (prefers-reduced-motion: reduce){.tt-flame,.tt-breathe,.tt-fizz,.tt-pulse,.tt-drift{animation:none}}
`;

type Stage = "pour" | "clink" | "speech";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ToastFields>) {
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const animate = !preview && !reduce;
  const audio = useGiftAudio(data.music, !preview);
  // Parsed here too, so a draft saved before a field changed shape still lays the table.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const p = PALETTES[fields.light] ?? PALETTES.candlelit;
  const wine = WINES[fields.pour] ?? WINES.champagne;
  const opening = fields.opening.trim() || s.toName.replace("{name}", data.recipientName);

  const [stage, setStage] = useState<Stage>(preview ? "clink" : "pour");
  const [level, setLevel] = useState(preview ? 1 : 0);
  const [angle, setAngle] = useState(0);
  const [spilled, setSpilled] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [lean, setLean] = useState(0);
  const [run, setRun] = useState(0);

  const levelRef = useRef(level);
  const leanRaf = useRef(0);
  const holdRef = useRef(false);
  const lockRef = useRef(0);
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const tilt = useTilt(!preview && stage === "pour");
  const pouring = stage === "pour" ? pourRate(angle) / TOP_RATE : 0;
  const status = pourStatus(level, angle);

  const { start } = audio;
  const begin = useCallback(() => {
    if (startedRef.current || preview) return;
    startedRef.current = true;
    void start();
    eventRef.current?.({ type: "started" });
  }, [preview, start]);

  const hold = useCallback(
    (held: boolean) => {
      holdRef.current = held;
      if (held) begin();
    },
    [begin],
  );

  const poured = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    holdRef.current = false;
    // The bottle goes back upright once the glasses are full, however they got there.
    setAngle(0);
    setStage("clink");
    eventRef.current?.({ type: "progress", pct: 30 });
  }, []);

  // Every frame: how far the phone is rolled, how much that lets out, and whether that finished it.
  useEffect(() => {
    if (preview || stage !== "pour") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const locked = now < lockRef.current;
      const a = locked ? 0 : holdRef.current ? BUTTON_TILT : tilt.supported ? tilt.angleRef.current : 0;
      setAngle(Math.round(a));
      if (pourRate(a) > 0) {
        begin();
        if (reduce) {
          // Reduced motion: one push is the whole pour, no watching a glass fill.
          levelRef.current = POUR_FULL;
          setLevel(POUR_FULL);
          poured();
          return;
        }
      }
      const next = fill(levelRef.current, a, dt);
      if (next !== levelRef.current) {
        levelRef.current = next;
        setLevel(Math.round(next * 160) / 160);
      }
      if (pourStatus(next, a) === "spilled") {
        levelRef.current = AFTER_SPILL;
        setLevel(AFTER_SPILL);
        setSpilled(true);
        lockRef.current = now + 900;
      } else if (settled(next, a)) {
        poured();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [begin, poured, preview, reduce, stage, tilt.angleRef, tilt.supported]);

  const clink = useCallback(() => {
    if (preview || stage !== "clink" || ringing) return;
    begin();
    setRinging(true);
    eventRef.current?.({ type: "progress", pct: 55 });
    if (reduce) {
      setLean(1);
      return;
    }
    // The glasses come up off the cloth, meet over the card, and knock together.
    const from = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - from) / 360);
      const back = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
      setLean(Math.round(back * 100) / 100);
      if (t < 1) leanRaf.current = requestAnimationFrame(step);
    };
    leanRaf.current = requestAnimationFrame(step);
  }, [begin, preview, reduce, ringing, stage]);

  useEffect(() => () => cancelAnimationFrame(leanRaf.current), []);

  // The clink itself: the rings go out, the photos ride the bubbles up, then the card opens.
  useEffect(() => {
    if (!ringing) return;
    const id = window.setTimeout(() => setStage("speech"), reduce ? 320 : 1750);
    return () => window.clearTimeout(id);
  }, [reduce, ringing]);

  const replay = () => {
    doneRef.current = false;
    holdRef.current = false;
    lockRef.current = 0;
    levelRef.current = 0;
    setLevel(0);
    setAngle(0);
    setSpilled(false);
    setRinging(false);
    cancelAnimationFrame(leanRaf.current);
    setLean(0);
    setStage("pour");
    setRun((r) => r + 1);
  };

  const bubbles = useMemo(() => {
    const rng = mulberry32(hashString(`${data.senderName}${data.recipientName}toast`));
    return data.photos.slice(0, 6).map((photo, i) => ({
      photo,
      x: (i % 2 === 0 ? LEFT_X : RIGHT_X) + (rng() - 0.5) * 16,
      size: 13 + rng() * 5,
      delay: 0.12 + i * 0.16,
      drift: (rng() - 0.5) * 26,
    }));
  }, [data.photos, data.senderName, data.recipientName]);

  const sceneVisible = stage !== "speech";
  const room = {
    background: p.night,
    color: p.linen,
    fontFamily: "var(--gift-font-body)",
    ["--k" as string]: "min(var(--u), 0.5cqh)",
    ["--top" as string]: "max(0px, calc((100cqh - 150 * var(--k)) / 2))",
  } as CSSProperties;

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={room}
      // Hooks for the capture script and the end-to-end test: where the evening has got to.
      data-toast-stage={preview ? "preview" : stage}
      data-toast-fill={level.toFixed(2)}
    >
      <style>{KEYFRAMES}</style>

      {/* candlelight on the wall behind the table */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0"
        style={{ background: `radial-gradient(42% 26% at 50% calc(var(--top) + 58 * var(--k)), ${rgba(p.glow, 0.2)}, transparent 70%)` }}
      />

      {/* the tablecloth, running off the bottom of the screen */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          top: "calc(var(--top) + 100 * var(--k))",
          backgroundColor: p.linen,
          backgroundImage: `${GRAIN}, radial-gradient(46% 42% at 50% 2%, ${rgba(p.glow, 0.34)}, transparent 70%), linear-gradient(180deg, ${p.linenShade} 0%, ${p.linen} 26%, ${p.linenDeep} 100%)`,
          boxShadow: `inset 0 calc(0.5 * var(--k)) 0 ${p.card}, inset 0 calc(2.4 * var(--k)) calc(4 * var(--k)) calc(-2 * var(--k)) rgba(60,34,12,0.35)`,
          // The table is put away once the speech starts, so the words have the room to themselves.
          opacity: sceneVisible ? 1 : 0,
          transition: "opacity 700ms ease",
        }}
      />

      <AnimatePresence mode="wait">
        {sceneVisible ? (
          <motion.div
            key={`table-${run}`}
            className="absolute inset-0 z-[2]"
            exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.6 } }}
          >
            <p
              className="absolute inset-x-0 truncate px-[calc(10*var(--k))] text-center font-semibold tracking-[0.34em] uppercase"
              style={{ top: "calc(var(--top) + 1.5 * var(--k))", fontSize: "calc(2.8 * var(--k))", color: p.goldPale, opacity: 0.72 }}
            >
              {data.senderName} <span aria-hidden="true">·</span> {data.recipientName}
            </p>

            {/* the table itself */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: "var(--top)", width: "calc(100 * var(--k))", height: "calc(150 * var(--k))" }}
            >
              <Table
                p={p}
                wine={wine}
                shape={fields.glasses}
                level={level}
                bottleDeg={bottleAngle(angle)}
                pouring={pouring}
                spill={spilled ? 1 : 0}
                lean={lean}
                ringing={ringing && !reduce}
                animate={animate}
                poured={stage !== "pour"}
              />
            </div>

            {/* what the card says, over the card */}
            <div
              className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center justify-center text-center"
              style={{ top: "calc(var(--top) + 72 * var(--k))", width: "calc(27 * var(--k))", height: "calc(25 * var(--k))", color: p.ink }}
            >
              <span aria-hidden="true" className="h-px w-[calc(9*var(--k))]" style={{ background: p.gold }} />
              <p
                className="mt-[calc(1.4*var(--k))] line-clamp-2 w-full leading-[1.15] italic"
                style={{ fontFamily: "var(--gift-font-display)", fontSize: "calc(3.5 * var(--k))" }}
              >
                {opening}
              </p>
              <span aria-hidden="true" className="mt-[calc(1.4*var(--k))] h-px w-[calc(9*var(--k))]" style={{ background: p.gold }} />
              {fields.venue.trim() ? (
                <p className="mt-[calc(1.5*var(--k))] line-clamp-2 w-full leading-[1.3] font-semibold tracking-[0.1em] uppercase opacity-75" style={{ fontSize: "calc(2.1 * var(--k))" }}>
                  {fields.venue}
                </p>
              ) : null}
              {fields.dateLine.trim() ? (
                <p className="mt-[calc(0.6*var(--k))] w-full truncate tracking-[0.06em] uppercase opacity-55" style={{ fontSize: "calc(1.9 * var(--k))" }}>
                  {fields.dateLine}
                </p>
              ) : null}
            </div>

            {/* the photos, riding the bubbles up and out */}
            {ringing && !reduce
              ? bubbles.map((b) => (
                  <motion.div
                    key={b.photo.id}
                    className="pointer-events-none absolute z-[6] overflow-hidden rounded-full"
                    style={{
                      left: `calc(50% + ${(b.x - 50).toFixed(1)} * var(--k))`,
                      top: `calc(var(--top) + ${(rimOf(fields.glasses) - 4).toFixed(1)} * var(--k))`,
                      width: `calc(${b.size.toFixed(1)} * var(--k))`,
                      height: `calc(${b.size.toFixed(1)} * var(--k))`,
                      x: "-50%",
                      boxShadow: `0 0 0 calc(0.5 * var(--k)) ${p.goldPale}, 0 calc(2*var(--k)) calc(5*var(--k)) rgba(0,0,0,0.35)`,
                    }}
                    initial={{ opacity: 0, scale: 0.3, y: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1, 1, 0.95], y: "-760%", rotate: b.drift * 0.4 }}
                    transition={{ duration: 2.4, delay: b.delay, ease: "easeOut", times: [0, 0.16, 0.7, 1] }}
                  >
                    <img src={b.photo.url} alt={b.photo.alt ?? ""} className="h-full w-full object-cover" draggable={false} />
                  </motion.div>
                ))
              : null}

            {/* the controls: one prompt, one meter, one button that always works */}
            <div
              className="absolute left-1/2 z-[8] flex w-[calc(80*var(--k))] -translate-x-1/2 flex-col items-center gap-[calc(2.4*var(--k))] text-center"
              style={{ top: "calc(var(--top) + 110 * var(--k))" }}
            >
              {preview ? (
                // The editor's still frame: the poured table, held a beat before the clink. It
                // says what the moment is rather than asking a laptop for a knock it can't feel.
                <p className="max-w-full rounded-full text-balance font-semibold tracking-[0.16em] uppercase" style={pillStyle(p)} data-toast-prompt>
                  {s.raise}
                </p>
              ) : stage === "pour" ? (
                <Pouring
                  key={`pour-${run}`}
                  s={s}
                  p={p}
                  angle={angle}
                  status={status}
                  spilled={spilled}
                  tilt={tilt}
                  onHold={hold}
                />
              ) : (
                <Clinking key={`clink-${run}`} s={s} p={p} ringing={ringing} reduce={!!reduce} onClink={clink} />
              )}
            </div>
          </motion.div>
        ) : (
          <Speech
            key={`speech-${run}`}
            p={p}
            s={s}
            data={data}
            mode={mode}
            opening={opening}
            venue={fields.venue.trim()}
            dateLine={fields.dateLine.trim()}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        )}
      </AnimatePresence>

      {animate ? (
        <div className="pointer-events-none absolute inset-0 z-[26]" aria-hidden="true">
          <Ambience
            layers={[
              { kind: "dust", colors: [p.goldPale, p.glow, "#FFFFFF"], count: 16 },
              ...(ringing && sceneVisible ? [{ kind: "sparkles" as const, colors: [p.goldPale, "#FFFFFF", p.glow], count: 26 }] : []),
            ]}
            opacity={0.7}
          />
        </div>
      ) : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

const pillStyle = (p: Palette): CSSProperties => ({
  padding: "calc(2 * var(--k)) calc(5 * var(--k))",
  fontSize: "calc(3 * var(--k))",
  background: p.card,
  color: p.ink,
  boxShadow: `0 0 0 1px ${rgba(p.goldDeep, 0.35)}, 0 calc(1.4*var(--k)) calc(3*var(--k)) calc(-1.4*var(--k)) rgba(60,34,12,0.4)`,
});

const meterStyle = (p: Palette): CSSProperties => ({
  background: rgba(p.ink, 0.22),
  boxShadow: `inset 0 0 0 1px ${rgba(p.goldDeep, 0.3)}`,
});

/**
 * The pour: what to do, how far the phone is rolled right now, and the button that does the same
 * thing with a thumb. Its own component, remounted on replay, so nothing carries over.
 */
function Pouring({
  s,
  p,
  angle,
  status,
  spilled,
  tilt,
  onHold,
}: {
  s: (typeof S)["en"];
  p: Palette;
  angle: number;
  status: ReturnType<typeof pourStatus>;
  spilled: boolean;
  tilt: ReturnType<typeof useTilt>;
  onHold: (held: boolean) => void;
}) {
  const [held, setHeld] = useState(false);
  // Kept in a ref: the parent re-renders every frame while pouring, and a cleanup that ran on
  // every one of those renders would let go of the button the moment it was pressed.
  const holdCb = useRef(onHold);
  useEffect(() => {
    holdCb.current = onHold;
  });
  useEffect(() => () => holdCb.current(false), []);
  const set = (next: boolean) => {
    setHeld(next);
    holdCb.current(next);
  };

  // "Level it off" is what a tilted phone does; a thumb on the button just lets go. A phone that
  // is reporting, or one that will once it has been asked, is told to tilt; a laptop is told the
  // truth, which is that the button is the pour.
  const restingLine = tilt.expected ? s.tiltToPour : s.holdToPour;
  const fullLine = held ? s.letGo : s.levelOff;
  const line =
    status === "spilled"
      ? s.spilled
      : status === "brimming"
        ? s.careful
        : status === "full"
          ? fullLine
          : status === "pouring"
            ? s.keepPouring
            : spilled
              ? s.spilled
              : restingLine;

  // Space and Enter hold the button down the way a thumb does, so the pour is reachable without
  // a pointer at all. A key press fires no pointer events, so without this the button is dead
  // to a keyboard.
  const isHoldKey = (key: string) => key === " " || key === "Spacebar" || key === "Enter";

  return (
    <>
      <p
        className={cn(
          "max-w-full rounded-full text-balance font-semibold tracking-[0.16em] uppercase",
          status === "empty" && "tt-pulse",
        )}
        style={pillStyle(p)}
        role="status"
        aria-live="polite"
        data-toast-prompt
      >
        {line}
      </p>

      <TiltMeter angle={angle} p={p} />

      <button
        type="button"
        aria-label={tilt.expected ? s.pourAria : s.pourAriaButton}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.focus();
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          set(true);
        }}
        onPointerUp={() => set(false)}
        onPointerCancel={() => set(false)}
        onPointerLeave={() => set(false)}
        onKeyDown={(e) => {
          if (!isHoldKey(e.key)) return;
          e.preventDefault();
          if (!e.repeat) set(true);
        }}
        onKeyUp={(e) => {
          if (!isHoldKey(e.key)) return;
          e.preventDefault();
          set(false);
        }}
        onBlur={() => set(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="flex h-[calc(12*var(--k))] touch-none items-center gap-[calc(2.2*var(--k))] rounded-full px-[calc(6.5*var(--k))] font-semibold tracking-[0.16em] uppercase shadow-[0_10px_24px_-12px_rgba(0,0,0,0.65)] transition-transform"
        style={{
          fontSize: "calc(3 * var(--k))",
          background: held ? p.goldPale : p.card,
          color: p.ink,
          transform: held ? "scale(0.96)" : "none",
        }}
        data-pour
      >
        <WineIcon aria-hidden="true" style={{ width: "calc(3.6 * var(--k))", height: "calc(3.6 * var(--k))", color: p.goldDeep }} />
        {s.pourButton}
      </button>

      {tilt.needsPermission ? (
        <button
          type="button"
          onClick={() => void tilt.requestPermission()}
          className="underline underline-offset-4"
          style={{ fontSize: "calc(2.7 * var(--k))", color: p.goldDeep }}
          data-toast-hint
        >
          {s.enableTilt}
        </button>
      ) : (
        <p style={{ fontSize: "calc(2.7 * var(--k))", color: rgba(p.ink, 0.62) }} data-toast-hint>
          {tilt.expected ? s.orTilt : s.noTilt}
        </p>
      )}
    </>
  );
}

/** A spirit level: the gold ends are where it pours, the pale middle is level. */
function TiltMeter({ angle, p }: { angle: number; p: Palette }) {
  const x = Math.max(-1, Math.min(1, angle / 60));
  const zone = ((60 - TILT_FLOOR) / 60) * 50;
  const band = (LEVEL_MAX / 60) * 50;

  return (
    <div
      className="relative h-[calc(3.6*var(--k))] w-[calc(54*var(--k))] max-w-full overflow-hidden rounded-full"
      aria-hidden="true"
      style={meterStyle(p)}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0" style={{ width: `${zone}%`, background: rgba(p.gold, 0.55) }} />
      <span aria-hidden="true" className="absolute inset-y-0 right-0" style={{ width: `${zone}%`, background: rgba(p.gold, 0.55) }} />
      <span
        aria-hidden="true"
        className="absolute inset-y-[calc(0.7*var(--k))] rounded-full"
        style={{ left: `${50 - band}%`, width: `${band * 2}%`, background: `${p.card}cc` }}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 size-[calc(3*var(--k))] rounded-full"
        style={{
          left: `${50 + x * 50}%`,
          transform: "translate(-50%,-50%)",
          background: p.goldDeep,
          boxShadow: `0 0 0 calc(0.4*var(--k)) ${p.card}`,
          transition: "left 90ms linear",
        }}
      />
    </div>
  );
}

/**
 * The clink: a knock the phone can feel, a meter that shows every nudge so a soft one doesn't
 * feel like a broken sensor, and a button that always works.
 */
function Clinking({
  s,
  p,
  ringing,
  reduce,
  onClink,
}: {
  s: (typeof S)["en"];
  p: Palette;
  ringing: boolean;
  reduce: boolean;
  onClink: () => void;
}) {
  const [bump, setBump] = useState({ strength: 0, busy: false });
  const fade = useRef(0);

  const onBump = useCallback((strength: number, tooBusy: boolean) => {
    setBump({ strength, busy: tooBusy });
    window.clearTimeout(fade.current);
    fade.current = window.setTimeout(() => setBump({ strength: 0, busy: false }), 520);
  }, []);
  useEffect(() => () => window.clearTimeout(fade.current), []);

  const knock = useKnock({ enabled: !ringing, onKnock: onClink, onBump });
  // Asking someone to knock a laptop would be a lie; there the button is the gesture.
  const canKnock = knock.expected;
  const line = ringing
    ? s.raise
    : bump.busy
      ? s.steady
      : bump.strength > 0.3
        ? s.firmer
        : canKnock
          ? s.knock
          : s.tapToClink;

  return (
    <>
      <p
        className={cn("max-w-full rounded-full text-balance font-semibold tracking-[0.16em] uppercase", !ringing && "tt-pulse")}
        style={pillStyle(p)}
        role="status"
        aria-live="polite"
        data-toast-prompt
      >
        {line}
      </p>

      {ringing ? null : (
        <>
          {/* the meter only goes up if something can move it, so a laptop doesn't get a dead one */}
          {canKnock ? (
            <div
              className="relative h-[calc(3.6*var(--k))] w-[calc(54*var(--k))] max-w-full overflow-hidden rounded-full"
              aria-hidden="true"
              style={meterStyle(p)}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.min(100, (bump.strength / 1.4) * 100)}%`, background: p.gold, transition: "width 140ms ease-out" }}
              />
              <span aria-hidden="true" className="absolute inset-y-0 w-px" style={{ left: `${(1 / 1.4) * 100}%`, background: p.goldDeep }} />
            </div>
          ) : null}

          <motion.button
            type="button"
            aria-label={s.clinkAria}
            onClick={onClink}
            whileTap={{ scale: 0.95 }}
            animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="flex h-[calc(12*var(--k))] items-center gap-[calc(2.2*var(--k))] rounded-full px-[calc(7*var(--k))] font-semibold tracking-[0.16em] uppercase shadow-[0_10px_24px_-12px_rgba(0,0,0,0.65)]"
            style={{ fontSize: "calc(3 * var(--k))", background: p.card, color: p.ink }}
            data-clink
          >
            <Hand aria-hidden="true" style={{ width: "calc(3.6 * var(--k))", height: "calc(3.6 * var(--k))", color: p.goldDeep }} />
            {s.knockButton}
          </motion.button>

          {knock.needsPermission ? (
            <button
              type="button"
              onClick={() => void knock.requestPermission()}
              className="underline underline-offset-4"
              style={{ fontSize: "calc(2.7 * var(--k))", color: p.goldDeep }}
              data-toast-hint
            >
              {s.enableMotion}
            </button>
          ) : (
            <p style={{ fontSize: "calc(2.7 * var(--k))", color: rgba(p.ink, 0.62) }} data-toast-hint>
              {knock.expected ? s.knockHint : s.noKnock}
            </p>
          )}
        </>
      )}
    </>
  );
}

function Speech({
  p,
  s,
  data,
  mode,
  opening,
  venue,
  dateLine,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  p: Palette;
  s: (typeof S)["en"];
  data: TemplateProps<ToastFields>["data"];
  mode: TemplateProps["mode"];
  opening: string;
  venue: string;
  dateLine: string;
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

  const paper: CSSProperties = { backgroundColor: p.card, backgroundImage: GRAIN, color: p.ink };
  const shadow = "shadow-[0_1px_2px_rgba(0,0,0,0.18),0_28px_48px_-24px_rgba(0,0,0,0.6)]";

  return (
    <motion.div
      className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[max(10cqh,64px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        {/* the menu card, opened out */}
        <motion.article
          className={cn("relative rounded-[3px] px-[calc(6*var(--u))] pt-[calc(6*var(--u))] pb-[calc(7*var(--u))]", shadow)}
          style={paper}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotateX: 26 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: reduce ? 0.3 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div aria-hidden="true" className="absolute inset-x-[calc(2.4*var(--u))] top-[calc(2.4*var(--u))] h-px" style={{ background: p.gold }} />
          <div aria-hidden="true" className="absolute inset-x-[calc(2.4*var(--u))] top-[calc(3.4*var(--u))] h-px opacity-50" style={{ background: p.gold }} />
          <p className="text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.34em] uppercase" style={{ color: p.goldDeep }}>
            {s.theToast}
          </p>
          {venue || dateLine ? (
            <p className="mt-[calc(1.4*var(--u))] text-center text-[calc(2.7*var(--u))] tracking-[0.2em] uppercase opacity-55">
              {[venue, dateLine].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {/* what the sender called it, printed on the card the way a menu names the course */}
          <p
            className="mt-[calc(3.4*var(--u))] text-center text-[calc(5.2*var(--u))] leading-[1.12] break-words italic"
            style={{ fontFamily: "var(--gift-font-display)" }}
          >
            {data.title?.trim() || s.speech}
          </p>
          <div className="mt-[calc(5*var(--u))]">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" greeting={opening} accent={p.goldDeep} />
          </div>
        </motion.article>

        {data.photos.length ? (
          <>
            <p className="text-center text-[calc(3.1*var(--u))] font-semibold tracking-[0.28em] uppercase" style={{ color: p.goldPale }}>
              {s.raise}
            </p>
            <div className={cn("grid gap-[calc(5*var(--u))] px-[calc(2*var(--u))]", data.photos.length === 1 ? "grid-cols-1 justify-items-center" : "grid-cols-2")}>
              {data.photos.map((photo, i) => (
                <RoundPhoto key={photo.id} photo={photo} p={p} index={i} reduce={reduce} single={data.photos.length === 1} />
              ))}
            </div>
          </>
        ) : null}

        {data.countdown ? (
          <div className={cn("rounded-[3px] p-[calc(5*var(--u))]", shadow)} style={paper}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className={cn("relative rounded-[3px] p-[calc(5*var(--u))]", shadow)} style={paper}>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.8*var(--u))] font-semibold tracking-[0.28em] uppercase" style={{ color: p.goldDeep }}>
              {t("ps")}
            </p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className={cn("rounded-[3px] p-[calc(4*var(--u))]", shadow)} style={paper}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </motion.div>
  );
}

/** A photo the way it went up in a bubble: round, in a thin gold ring. */
function RoundPhoto({ photo, p, index, reduce, single }: { photo: GiftPhoto; p: Palette; index: number; reduce: boolean; single: boolean }) {
  return (
    <motion.figure
      className={cn("m-0 flex flex-col items-center", single && "w-[64%]")}
      initial={reduce ? false : { opacity: 0, y: 22, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 16, delay: (index % 2) * 0.12 }}
    >
      <div
        className="aspect-square w-full overflow-hidden rounded-full"
        style={{ boxShadow: `0 0 0 calc(0.7*var(--u)) ${p.gold}, 0 0 0 calc(1.6*var(--u)) ${p.card}, 0 calc(5*var(--u)) calc(10*var(--u)) calc(-5*var(--u)) rgba(0,0,0,0.6)` }}
      >
        <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
      </div>
      {photo.caption ? (
        // w-full, or the caption takes its max-content width inside the centred column and a long
        // one runs off the side of the phone instead of wrapping under its photo.
        <figcaption
          className="mt-[calc(3.4*var(--u))] w-full text-center text-[calc(3.9*var(--u))] leading-tight break-words"
          style={{ fontFamily: "var(--gift-font-hand)", color: p.linen }}
        >
          {photo.caption}
        </figcaption>
      ) : null}
    </motion.figure>
  );
}
