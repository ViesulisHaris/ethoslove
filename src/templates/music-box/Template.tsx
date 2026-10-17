"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio, type GiftAudio } from "../_shared/hooks/use-gift-audio";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { Lightbox, Scrap, Tape, TornPaper } from "../_shared/collage/kit";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { playPaper, playSealCrack } from "../_shared/collage/sounds";
import { hashString } from "../_shared/random";
import { buzz, prime } from "../_shared/synth";
import { keyTransform, MusicBox } from "./box";
import { Ballerina, Swans } from "./figurines";
import { FoldedLetter, Reading } from "./letter";
import { FINISHES, GOLD, type Finish } from "./looks";
import { Pearls, ScentBottle, Vanity, Wall } from "./room";
import { parseFields, type MusicBoxFields } from "./schema";
import { playClick, playLid, playTune, playTurn, type TunePlayer } from "./sound";
import { beatAt, photoAt, TUNES, tuneSeconds, turnAt, type Tune } from "./tunes";
import { clicksOf, drag, FULL, HOLD_RATE, isWound, KEY_STEP, lift, nudge, turnsOf, TURNS, WIND_START, WOUND, type Wind } from "./wind";

type Copy = {
  wind: string;
  windLabel: string;
  how: string;
  turns: string;
  listen: string;
  open: string;
  openLabel: string;
  forName: string;
  from: string;
  letterFrom: string;
  inMirror: string;
  photo: string;
  tunes: Record<Tune["id"], string>;
};

const S: Record<"en" | "es", Copy> = {
  en: {
    wind: "wind the key",
    windLabel: "Wind the key",
    how: "circle it with your finger, or hold it",
    turns: "{n} of {total} turns",
    listen: "listen",
    open: "open the letter",
    openLabel: "Open the letter from {name}",
    forName: "for {name}",
    from: "from {name}",
    letterFrom: "a letter from {name}",
    inMirror: "in the mirror",
    photo: "See the photo",
    tunes: { "swan-lake": "Swan Lake · Tchaikovsky", lullaby: "Lullaby · Brahms", "fur-elise": "Für Elise · Beethoven" },
  },
  es: {
    wind: "dale cuerda",
    windLabel: "Dar cuerda a la llave",
    how: "gírala con el dedo o mantenla pulsada",
    turns: "{n} de {total} vueltas",
    listen: "escucha",
    open: "abre la carta",
    openLabel: "Abrir la carta de {name}",
    forName: "para {name}",
    from: "de {name}",
    letterFrom: "una carta de {name}",
    inMirror: "en el espejo",
    photo: "Ver la foto",
    tunes: { "swan-lake": "El lago de los cisnes · Chaikovski", lullaby: "Canción de cuna · Brahms", "fur-elise": "Para Elisa · Beethoven" },
  },
};

type Stage = "wind" | "play" | "letter" | "read";

/** The composition, in --k: 100 wide and this tall, centred on the screen. */
const COMP_H = 150;
/** The middle of the box's body, and the vanity's back and front edges. */
const BOX_AT = { x: 44, y: 92 };
const VANITY = { back: 87, front: 124 };
/** From the key catching to the first note: the lid lifts first. */
const PRE_ROLL = 0.9;
/** The last note rings this long before the letter lifts out. */
const TAIL = 1.4;
/** The figurines' drawings: size in --k, and how far the pedestal's foot sits above the drawing's bottom. */
const FIGURES = { ballerina: { w: 21, h: 38.3, foot: 2.5, rise: 7.5 }, swans: { w: 27, h: 27, foot: 4.5, rise: 6.5 } } as const;

const k = (n: number): string => `calc(${n} * var(--k))`;
/** Script is wide: the title shrinks to stay on one line of the strip, and wraps only past that. */
const titleSize = (text: string): number => Math.min(7, Math.max(4.6, 104 / Math.max(1, [...text].length)));
const fill = (text: string, vars: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));

const KEYFRAMES = `
@keyframes mb-orbit { to { rotate: 360deg } }
@keyframes mb-breathe { 0%,100% { scale: 1 } 50% { scale: 1.05 } }
@keyframes mb-glow { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
.mb-orbit { animation: mb-orbit 2.6s linear infinite; }
.mb-breathe { animation: mb-breathe 2.2s ease-in-out infinite; }
.mb-glow { animation: mb-glow 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .mb-orbit, .mb-breathe, .mb-glow { animation: none; } }
`;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<MusicBoxFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();
  const preview = mode === "preview";
  const s = S[data.locale] ?? S.en;
  const t = useGiftStrings(data.locale);
  const fields = useMemo(() => parseFields(data.fields), [data.fields]);
  const finish = FINISHES[fields.box] ?? FINISHES.blush;
  const tune = TUNES[fields.tune] ?? TUNES["swan-lake"];
  const figure = FIGURES[fields.figurine] ?? FIGURES.ballerina;
  const photos = data.photos;

  const [stage, setStage] = useState<Stage>("wind");
  const [wound, setWound] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [run, setRun] = useState(0);
  const [burst, setBurst] = useState(0);
  const [muted, setMuted] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [axle, setAxle] = useState<{ x: number; y: number } | null>(null);

  // A song the sender chose waits for the letter: the box plays its own tune first.
  const audio = useGiftAudio(data.music, !preview && (stage === "letter" || stage === "read"));

  const windRef = useRef<Wind>(WIND_START);
  const stageRef = useRef<Stage>("wind");
  const photoRef = useRef(0);
  const mutedRef = useRef(false);
  const startedRef = useRef(false);
  const playerRef = useRef<TunePlayer | null>(null);
  const clockRef = useRef({ start: 0, paused: 0, hiddenAt: null as number | null });
  const eventRef = useRef(onEvent);
  const axleEl = useRef<HTMLSpanElement>(null);
  const gripEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = muted;
  });

  /** Seconds since the tune's first pin: negative while the lid lifts, frozen while the tab is hidden. */
  const elapsed = useCallback(() => {
    const c = clockRef.current;
    const now = c.hiddenAt ?? performance.now();
    return (now - c.start - c.paused) / 1000;
  }, []);

  // Where the key's axle is on screen, so a finger can be read as going round it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || preview) return;
    const measure = () => {
      const a = axleEl.current?.getBoundingClientRect();
      const r = root.getBoundingClientRect();
      if (a && r.width) setAxle({ x: a.left + a.width / 2 - r.left, y: a.top + a.height / 2 - r.top });
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(root);
    const id = requestAnimationFrame(measure);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [preview, run]);

  // Hidden, the box holds its breath: the tune and the turning pick up where they were.
  useEffect(() => {
    const onVisibility = () => {
      const c = clockRef.current;
      if (document.hidden) c.hiddenAt ??= performance.now();
      else if (c.hiddenAt !== null) {
        c.paused += performance.now() - c.hiddenAt;
        c.hiddenAt = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => () => playerRef.current?.stop(), []);

  /* ------------------------------------------------------------- winding */

  const begin = useCallback(() => {
    stageRef.current = "play";
    setStage("play");
    clockRef.current = { start: performance.now() + PRE_ROLL * 1000, paused: 0, hiddenAt: null };
    playLid(mutedRef.current);
    buzz(24);
    playerRef.current?.stop();
    playerRef.current = playTune(tune, elapsed, mutedRef.current);
    eventRef.current?.({ type: "progress", pct: 30 });
  }, [elapsed, tune]);

  /** The key has been wound from `from` to `next`: the ratchet clicks, a turn catches, the spring is full. */
  const apply = useCallback(
    (next: Wind) => {
      const from = windRef.current;
      if (stageRef.current !== "wind" || next.wound <= from.wound) {
        windRef.current = next;
        return;
      }
      windRef.current = next;
      setWound(next.wound);
      if (!startedRef.current) {
        startedRef.current = true;
        eventRef.current?.({ type: "started" });
      }
      const clicks = clicksOf(next.wound) - clicksOf(from.wound);
      const turn = turnsOf(next.wound);
      if (turn > turnsOf(from.wound)) {
        playTurn(mutedRef.current, tune.chord[Math.min(turn, TURNS) - 1]);
        buzz(18);
        if (turn < TURNS) eventRef.current?.({ type: "progress", pct: turn * 10 });
      } else if (clicks > 0) {
        playClick(mutedRef.current, next.wound / WOUND);
        buzz(6);
      }
      if (isWound(next)) begin();
    },
    [begin, tune],
  );

  const holdRef = useRef<{ raf: number; timer: number; still: boolean; at: { x: number; y: number }; moved: boolean; held: boolean } | null>(null);
  const centre = () => {
    const a = axleEl.current?.getBoundingClientRect();
    return a ? { x: a.left + a.width / 2, y: a.top + a.height / 2 } : null;
  };
  const stopHold = () => {
    const h = holdRef.current;
    if (!h) return;
    window.clearTimeout(h.timer);
    cancelAnimationFrame(h.raf);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (stageRef.current !== "wind") return;
    e.preventDefault();
    prime();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stopHold();
    const h = { raf: 0, timer: 0, still: true, at: { x: e.clientX, y: e.clientY }, moved: false, held: false };
    holdRef.current = h;
    // A thumb held still on the key winds it steadily.
    h.timer = window.setTimeout(() => {
      if (!h.still) return;
      h.held = true;
      let last = performance.now();
      const step = (now: number) => {
        if (!h.still || stageRef.current !== "wind") return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        apply(nudge(windRef.current, HOLD_RATE * dt));
        h.raf = requestAnimationFrame(step);
      };
      h.raf = requestAnimationFrame(step);
    }, 260);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const h = holdRef.current;
    if (!h || stageRef.current !== "wind") return;
    if (Math.hypot(e.clientX - h.at.x, e.clientY - h.at.y) > 6) {
      h.still = false;
      h.moved = true;
      cancelAnimationFrame(h.raf);
    }
    const c = centre();
    if (!c) return;
    const dx = e.clientX - c.x;
    const dy = e.clientY - c.y;
    // Right over the axle a finger's angle means nothing.
    if (Math.hypot(dx, dy) < 12) {
      windRef.current = lift(windRef.current);
      return;
    }
    apply(drag(windRef.current, Math.atan2(dy, dx)));
  };

  const onPointerUp = () => {
    const h = holdRef.current;
    stopHold();
    holdRef.current = null;
    windRef.current = lift(windRef.current);
    // A quick tap turns it a quarter, like a thumb flicking the grip.
    if (h && !h.moved && !h.held && stageRef.current === "wind") apply(nudge(windRef.current, KEY_STEP));
  };

  const keyAt = useRef(0);
  const keyboardRef = useRef(false);
  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!["Enter", " ", "ArrowRight", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    if (stageRef.current !== "wind") return;
    keyboardRef.current = true;
    const now = performance.now();
    if (now - keyAt.current < 110) return;
    keyAt.current = now;
    prime();
    apply(nudge(windRef.current, KEY_STEP));
  };

  /* -------------------------------------------------------------- playing */

  // The tune keeps the time: a new photo each time the figurine comes round, the key unwinding, then the letter.
  useEffect(() => {
    if (stage !== "play") return;
    const total = tuneSeconds(tune);
    let raf = 0;
    const loop = () => {
      const e = elapsed();
      const i = photoAt(tune, beatAt(tune, e), photos.length);
      if (i !== photoRef.current) {
        photoRef.current = i;
        setPhoto(i);
        eventRef.current?.({ type: "progress", pct: Math.round(30 + (50 * i) / Math.max(1, photos.length)) });
      }
      if (gripEl.current && !reduce) gripEl.current.style.transform = keyTransform(WOUND * (1 - Math.min(1, Math.max(0, e / total))));
      if (e > total + TAIL) {
        stageRef.current = "letter";
        setStage("letter");
        playPaper(mutedRef.current);
        eventRef.current?.({ type: "progress", pct: 80 });
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [elapsed, photos.length, reduce, stage, tune]);

  // Whoever wound it from the keyboard finds the letter under their fingers when it lifts out.
  const letterEl = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (stage !== "letter" || !keyboardRef.current) return;
    const id = window.setTimeout(() => letterEl.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(id);
  }, [stage]);

  const openLetter = () => {
    if (stageRef.current !== "letter") return;
    stageRef.current = "read";
    setStage("read");
    playSealCrack(mutedRef.current);
    buzz(16);
    setBurst((b) => b + 1);
    if (!mutedRef.current) void audio.start();
    eventRef.current?.({ type: "progress", pct: 90 });
  };

  const replay = () => {
    keyboardRef.current = false;
    playerRef.current?.stop();
    playerRef.current = null;
    windRef.current = WIND_START;
    stageRef.current = "wind";
    photoRef.current = 0;
    setStage("wind");
    setWound(0);
    setPhoto(0);
    setActive(null);
    setRun((r) => r + 1);
  };

  /* ---------------------------------------------------------------- sound */

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    playerRef.current?.setMuted(next);
    if (audio.hasMusic && stageRef.current === "read") {
      if (!next && !audio.playing) void audio.start();
      else if (audio.muted !== next) audio.toggleMute();
    }
  };
  const sound: GiftAudio = { start: audio.start, toggleMute, muted, playing: stage === "play" || audio.playing, hasMusic: true };

  /* ----------------------------------------------------------------- view */

  const still = preview || reduce;
  const lid = preview || reduce || stage !== "wind" ? 1 : 0;
  const shown = preview ? 0 : photo;
  const current = photos[shown];
  const mirrorLit = preview || stage !== "wind";
  const title = data.title?.trim() || fill(s.forName, { name: data.recipientName });
  const seed = hashString(`${data.recipientName}|${data.senderName}|music-box`);
  const turnsDone = Math.min(TURNS, turnsOf(wound));

  const room = {
    color: finish.ink,
    fontFamily: "var(--gift-font-body)",
    "--k": "var(--u)",
    "--top": `max(0px, calc((100cqh - ${COMP_H} * var(--k)) / 2))`,
  } as CSSProperties;

  const figurine =
    fields.figurine === "swans" ? (
      <Turning key={`swans-${run}`} kind="swans" tune={tune} clock={elapsed} playing={stage === "play" && !still} />
    ) : (
      <Turning key={`ballerina-${run}`} kind="ballerina" tune={tune} clock={elapsed} playing={stage === "play" && !still} />
    );

  const mirror = mirrorLit && current ? (
    <AnimatePresence initial={false}>
      <motion.img key={`${current.id}-${shown}`} src={current.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" initial={{ opacity: 0, filter: still ? "none" : "blur(6px) brightness(1.5)" }} animate={{ opacity: 1, filter: "blur(0px) brightness(1)" }} exit={{ opacity: 0 }} transition={{ duration: still ? 0.6 : 1.1, ease: "easeOut" }} />
    </AnimatePresence>
  ) : null;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={room}>
      <style>{KEYFRAMES}</style>
      <Wall finish={finish} />
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
        <Ambience layers={[{ kind: "dust", colors: finish.dust, count: 14 }]} opacity={0.75} />
      </div>
      <div className="absolute inset-0 z-[2]">
        <Vanity finish={finish} back={VANITY.back} front={VANITY.front} />
      </div>

      <div className="absolute left-1/2 z-[3]" style={{ top: "var(--top)", width: k(100), height: k(COMP_H), marginLeft: k(-50) }}>
        {/* on the wall: who it's from, the title on a torn strip, and two papers pinned up */}
        <p className="absolute inset-x-[calc(8*var(--k))] truncate text-center font-semibold tracking-[0.3em] uppercase" style={{ top: k(2.4), fontSize: k(2.7), color: finish.soft }}>
          {data.senderName} <span aria-hidden="true">→</span> {data.recipientName}
        </p>
        <div className="absolute left-1/2 z-[2] -translate-x-1/2 -rotate-[1.5deg]" style={{ top: k(7.4), width: k(70) }}>
          <TornPaper seed={seed} sides={{ top: true, right: true, bottom: true, left: true }} depth={4} color="#FFFBF3" rim="#FFFFFF" grain={PAPER_GRAIN}>
            <h1 className="line-clamp-2 px-[calc(5*var(--k))] pt-[calc(2.4*var(--k))] pb-[calc(2.8*var(--k))] text-center leading-[1.15] [overflow-wrap:anywhere]" style={{ fontFamily: SCRIPT_FONT, fontSize: k(titleSize(title)), color: finish.ink }}>
              {title}
            </h1>
          </TornPaper>
          <Tape color="#F3C9D4" width={14} className="-top-[calc(1.6*var(--k))] left-[40%] -rotate-[4deg]" />
        </div>
        <div aria-hidden="true" className="absolute -rotate-[9deg]" style={{ left: k(-5), top: k(24), width: k(34) }}>
          <Scrap id="paper-roses" eager />
          <Tape color="#F6D9C8" width={11} className="top-[8%] left-[38%] rotate-[8deg]" />
        </div>
        <div aria-hidden="true" className="absolute rotate-[7deg]" style={{ left: k(68), top: k(25), width: k(36) }}>
          <Scrap id="paper-script" eager />
          <Tape color="#F3C9D4" width={12} className="-top-[4%] left-[30%] -rotate-[6deg]" />
        </div>
        <div aria-hidden="true" className="absolute -rotate-[16deg]" style={{ left: k(-3), top: k(60), width: k(40) }}>
          <Scrap id="fan-lace" eager />
        </div>

        {/* the box: a zero-sized point with a camera on it */}
        <div className="absolute z-[4]" style={{ left: k(BOX_AT.x), top: k(BOX_AT.y), width: 0, height: 0, perspective: k(320) }}>
          <MusicBox
            finish={finish}
            name={data.recipientName}
            lid={lid}
            instant={still}
            keyAngle={stage === "wind" ? wound : WOUND}
            figurine={figurine}
            risen={lid > 0.5}
            figure={figure}
            mirror={mirror}
            onMirror={!preview && mirrorLit && current ? () => setActive(current) : undefined}
            mirrorLabel={current?.caption || s.photo}
            letterTucked={preview || stage === "wind" || stage === "play"}
            axleRef={axleEl}
            gripRef={gripEl}
          />
        </div>

        {/* in front of it on the cloth */}
        <div aria-hidden="true" className="absolute z-[5]" style={{ left: k(2), top: k(95.5), width: k(14) }}>
          <ScentBottle tint={finish.posy[0]} className="block h-auto w-full" />
        </div>
        <div aria-hidden="true" className="absolute z-[5]" style={{ left: k(21), top: k(111), width: k(50) }}>
          <Pearls className="block h-auto w-full" />
        </div>
        <div aria-hidden="true" className="absolute z-[5] rotate-[-10deg]" style={{ left: k(66), top: k(116), width: k(8.5) }}>
          <Scrap id="wax-seal-hibiscus" eager />
        </div>
        <div aria-hidden="true" className="absolute z-[5] rotate-[14deg]" style={{ left: k(80), top: k(112), width: k(17) }}>
          <Scrap id="bow-satin-pink" eager />
        </div>

        {/* under it: what to do, then what's playing and what's in the mirror */}
        <div className="absolute inset-x-0 z-[6] flex flex-col items-center" style={{ top: k(133) }}>
          {preview ? (
            <Caption tuneName={s.tunes[tune.id]} text={current?.caption} finish={finish} keyId={0} still />
          ) : stage === "wind" ? (
            <>
              <p aria-hidden="true" className={cn("rounded-full px-[calc(4.6*var(--k))] py-[calc(1.8*var(--k))] text-center leading-none font-semibold tracking-[0.22em] whitespace-nowrap uppercase backdrop-blur-sm", !reduce && "mb-breathe")} style={{ fontSize: k(3.1), background: "rgba(255,255,255,.82)", color: finish.ink, boxShadow: `0 ${k(0.6)} ${k(2.4)} rgba(70,35,25,.16)` }}>
                {s.wind}
              </p>
              <p className="mt-[calc(2*var(--k))] flex items-center gap-[calc(1.4*var(--k))]" style={{ fontSize: k(2.7), color: finish.soft }}>
                <span aria-hidden="true" className="flex gap-[calc(.9*var(--k))]">
                  {Array.from({ length: TURNS }, (_, i) => (
                    <span key={i} className="block rounded-full transition-colors duration-300" style={{ width: k(1.7), height: k(1.7), background: i < turnsDone ? GOLD.mid : "transparent", boxShadow: `inset 0 0 0 ${k(0.3)} ${GOLD.deep}` }} />
                  ))}
                </span>
                <span id={`mb-turns-${run}`} role="status" aria-live="polite">
                  {turnsDone ? fill(s.turns, { n: turnsDone, total: TURNS }) : s.how}
                </span>
              </p>
            </>
          ) : stage === "play" ? (
            <Caption tuneName={s.tunes[tune.id]} text={current?.caption} finish={finish} keyId={shown} still={still} />
          ) : null}
        </div>
      </div>

      {/* the key, as something to hold: a ring round it where a finger goes */}
      {!preview && stage === "wind" && axle ? (
        <Winder key={`winder-${run}`} at={axle} ink={finish.ink} label={s.windLabel} describedBy={`mb-turns-${run}`} progress={(wound % FULL) / FULL} started={wound > 0} reduce={reduce} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onKeyDown={onKeyDown} />
      ) : null}

      {/* the letter, lifted out of the velvet */}
      <AnimatePresence>
        {stage === "letter" ? (
          <motion.div key={`letter-${run}`} className="absolute inset-0 z-[12]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(70% 50% at 50% 50%, rgba(40,14,24,.28), rgba(40,14,24,.5))" }} />
            <div className="absolute left-1/2" style={{ top: "var(--top)", width: k(100), height: k(COMP_H), marginLeft: k(-50) }}>
              <motion.button
                ref={letterEl}
                type="button"
                onClick={openLetter}
                aria-label={fill(s.openLabel, { name: data.senderName })}
                data-letter=""
                className="absolute block outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                style={{ left: k(19), top: k(58), width: k(62) }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: "-10%", y: "32%", scale: 0.3, rotate: -14 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: -3 }}
                transition={reduce ? { duration: 0.4 } : { type: "spring", stiffness: 70, damping: 13 }}
                whileTap={{ scale: 0.97 }}
              >
                <FoldedLetter name={data.recipientName} from={fill(s.from, { name: data.senderName })} />
              </motion.button>
              <motion.p aria-hidden="true" className={cn("absolute left-1/2 -translate-x-1/2 rounded-full px-[calc(4.6*var(--k))] py-[calc(1.8*var(--k))] text-center leading-none font-semibold tracking-[0.22em] whitespace-nowrap uppercase", !reduce && "mb-breathe")} style={{ top: k(112), fontSize: k(3.1), background: "rgba(255,255,255,.9)", color: finish.ink }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0.2 : 1.1 }}>
                {s.open}
              </motion.p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {stage === "read" ? <Reading key={`read-${run}`} data={data} finish={finish} mode={mode} reduce={reduce} s={{ letterFrom: s.letterFrom, inMirror: s.inMirror }} onOpenPhoto={setActive} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}

      <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      <Confetti burst={burst} colors={finish.confetti} count={110} origin={{ x: 0.5, y: 0.45 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {!preview ? <SoundToggle audio={sound} locale={data.locale} /> : null}
    </div>
  );
}

/** The figurine, turning with the tune while it plays; still otherwise, facing you. */
function Turning({ kind, tune, clock, playing }: { kind: "ballerina" | "swans"; tune: Tune; clock: () => number; playing: boolean }) {
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setTurn(turnAt(tune, beatAt(tune, clock())) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clock, playing, tune]);
  return kind === "swans" ? <Swans turn={turn} className="block h-full w-full" /> : <Ballerina turn={turn} className="block h-full w-full" />;
}

/** What's playing, and the caption of the photo in the mirror, on a slip of paper. */
function Caption({ tuneName, text, finish, keyId, still }: { tuneName: string; text?: string; finish: Finish; keyId: number; still: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <p className="flex items-center gap-[calc(1.2*var(--k))] font-semibold tracking-[0.22em] uppercase" style={{ fontSize: k(2.5), color: finish.soft }}>
        <svg viewBox="0 0 12 12" className="shrink-0" style={{ width: k(2.6), height: k(2.6) }} aria-hidden="true">
          <path d="M4.2 9.2V2.4l6-1.4v6.8" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="3" cy="9.3" r="1.6" fill="currentColor" />
          <circle cx="9" cy="7.9" r="1.6" fill="currentColor" />
        </svg>
        {tuneName}
      </p>
      <div className="relative mt-[calc(1.6*var(--k))] grid place-items-center" style={{ height: k(8), width: k(84) }}>
        <AnimatePresence mode="wait" initial={false}>
          {text ? (
            <motion.p key={keyId} className="max-w-full truncate px-[calc(3*var(--k))] text-center leading-[1.25]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: k(5), color: finish.ink }} initial={still ? { opacity: 0 } : { opacity: 0, y: k(1.5) }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              {text}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * The ring round the key: the thing to hold. It is a real button, so the keyboard winds it too,
 * and a screen reader hears how many turns are done. A dot goes round it until a finger does.
 */
function Winder({ at, ink, label, describedBy, progress, started, reduce, onPointerDown, onPointerMove, onPointerUp, onKeyDown }: { at: { x: number; y: number }; ink: string; label: string; describedBy: string; progress: number; started: boolean; reduce: boolean; onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void; onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => void; onPointerUp: () => void; onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void }) {
  const R = 44;
  const arc = 2 * Math.PI * R;
  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={describedBy}
      data-key=""
      className="absolute z-[8] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/80"
      style={{ left: at.x, top: at.y, width: k(31), height: k(31), marginLeft: k(-15.5), marginTop: k(-15.5), touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && e.preventDefault()}
    >
      <svg viewBox="-50 -50 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <circle r={R} fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.85)" strokeWidth="3.4" className={cn(!started && !reduce && "mb-glow")} />
        <circle r={R} fill="none" stroke={ink} strokeOpacity=".55" strokeWidth="1.3" strokeDasharray="3 4.4" />
        <circle r={R} fill="none" stroke={GOLD.mid} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${arc * progress} ${arc}`} transform="rotate(-90)" style={{ transition: "stroke-dasharray .12s linear" }} />
        {/* which way: an arrowhead riding the ring */}
        <path d="M31 -31 l7 1 l-1 7" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" transform="rotate(8)" />
        {!started && !reduce ? (
          <g className="mb-orbit" style={{ transformOrigin: "0 0" }}>
            <circle cx="0" cy={-R} r="4.2" fill="#FFFFFF" stroke={GOLD.deep} strokeWidth="1" />
          </g>
        ) : null}
      </svg>
    </button>
  );
}

