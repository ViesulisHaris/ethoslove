"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { TapPill, type CoverTone } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playPaper } from "../_shared/collage/sounds";
import { BOOTH_KEYFRAMES, Cabinet, FlashPanel, Marquee, Pelmet, PoseLamps, RedButton, ReservedCard, Room, SlotLip, Strip, TYPE_FONT, at, fringe, k, velvet } from "./art";
import { BOOTHS, type Booth, type BoothId } from "./looks";
import { MIRROR_LIVE, POSES, TIMING, boothProgress, cameraTransform, framing, poseBeats, signLines, stampDate, stripFilter, stripFrames, type FilterId, type Frame, type Shot } from "./plan";
import { playBeep, playButton, playCharge, playCurtain, playShutter, playWhirr } from "./sounds";
import { fieldsSchema, type PhotoBoothFields } from "./schema";
import { Wall } from "./Wall";

export type Copy = {
  pull: string;
  press: string;
  again: string;
  last: string;
  printing: string;
  take: string;
  takeLabel: string;
  lookHere: string;
  push: string;
  smile: string;
  photos: string;
  reserved: string;
  sign: string;
  pose: string;
  ready: string;
};

const S: Record<"en" | "es", Copy> = {
  en: {
    pull: "pull the curtain",
    press: "press the button",
    again: "again!",
    last: "last one!",
    printing: "printing…",
    take: "tap the strip",
    takeLabel: "Take your strip",
    lookHere: "look here",
    push: "push",
    smile: "smile!",
    photos: "photos",
    reserved: "reserved for",
    sign: "PHOTOS · 4 POSES",
    pose: "Photo {n} of 4",
    ready: "Your strip is ready",
  },
  es: {
    pull: "corre la cortina",
    press: "pulsa el botón",
    again: "¡otra!",
    last: "¡la última!",
    printing: "imprimiendo…",
    take: "toca la tira",
    takeLabel: "Coge tu tira",
    lookHere: "mira aquí",
    push: "pulsa",
    smile: "¡sonríe!",
    photos: "fotos",
    reserved: "reservado para",
    sign: "FOTOS · 4 POSES",
    pose: "Foto {n} de 4",
    ready: "Tu tira está lista",
  },
};

type Stage = "outside" | "inside" | "printing" | "taking" | "wall";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<PhotoBoothFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const preview = mode === "preview";
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, !preview);
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const boothId: BoothId = fields.booth in BOOTHS ? fields.booth : "cherry";
  const booth = BOOTHS[boothId];
  const filter: FilterId = fields.filter;
  const frames = useMemo(() => stripFrames(data.photos), [data.photos]);
  // The day it prints, stamped on the strip's foot.
  const [date] = useState(() => stampDate(new Date()));
  // First names only on the strip's foot, the way a booth's stamp would have room for.
  const names = `${firstName(data.recipientName)} + ${firstName(data.senderName)}`;
  const sign = useMemo(() => signLines(fields.sign?.trim() || s.sign), [fields.sign, s.sign]);

  const [stage, setStage] = useState<Stage>(preview ? "wall" : "outside");
  const [shot, setShot] = useState<Shot>("full");
  const [arrived, setArrived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const [shots, setShots] = useState(0);
  const [flashes, setFlashes] = useState(0);
  const [firing, setFiring] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [emerging, setEmerging] = useState(false);
  const [out, setOut] = useState(false);
  const [developed, setDeveloped] = useState(false);
  // A thumb on the curtain, or the curtain on its way: either way the hint has done its job.
  const [grabbed, setGrabbed] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const curtain = useMotionValue(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const opening = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  // Every beat is a timer; a replay or leaving the page cancels whatever is still to come.
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const cancel = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const begin = () => {
    prime();
    if (started.current) return;
    started.current = true;
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  const openCurtain = () => {
    if (stage !== "outside" || opening.current) return;
    opening.current = true;
    setPulling(true);
    begin();
    playCurtain(audio.muted);
    buzz(10);
    const left = 1 - curtain.get();
    animate(curtain, 1, { duration: reduce ? 0 : (TIMING.curtain / 1000) * Math.max(0.35, left), ease: [0.3, 0.1, 0.25, 1] });
    later(
      () => {
        setStage("inside");
        setShot("inside");
        eventRef.current?.({ type: "progress", pct: boothProgress("curtain") });
        later(
          () => {
            setArrived(true);
            buttonRef.current?.focus({ preventScroll: true });
          },
          reduce ? 0 : TIMING.camera,
        );
      },
      reduce ? 0 : Math.max(200, TIMING.curtain * left - 150),
    );
  };

  const print = () => {
    setStage("printing");
    const muted = audio.muted;
    const wait = reduce ? 0 : TIMING.afterLast;
    later(() => {
      playWhirr(muted, reduce ? 1.2 : 3.2);
      animate(curtain, 0, { duration: reduce ? 0 : 0.8, ease: [0.4, 0, 0.3, 1] });
      setShot("full");
    }, wait);
    later(() => setShot("print"), reduce ? 0 : wait + TIMING.camera);
    const emerge = reduce ? 0 : wait + TIMING.camera * 2 - 250;
    later(() => {
      setEmerging(true);
      stripRef.current?.focus({ preventScroll: true });
    }, emerge);
    // The paper has to be on screen, grey, for a frame before the chemistry starts.
    later(() => setDeveloped(true), reduce ? 0 : emerge + 350);
    later(() => {
      setOut(true);
      eventRef.current?.({ type: "progress", pct: boothProgress("printed") });
    }, reduce ? 0 : emerge + TIMING.slide);
  };

  const press = () => {
    if (stage !== "inside" || !arrived || busy || shots >= POSES) return;
    begin();
    const muted = audio.muted;
    const pose = shots;
    setBusy(true);
    setPressed(true);
    playButton(muted);
    buzz(14);
    later(() => setPressed(false), 160);
    for (const b of poseBeats(reduce)) {
      later(() => {
        if (b.beat === "count" && b.n) {
          setCount(b.n);
          playBeep(muted, b.n);
          if (b.n === 1) playCharge(muted);
        } else if (b.beat === "flash") {
          setCount(0);
          setShots(pose + 1);
          setFlashes((f) => f + 1);
          playShutter(muted);
          buzz(24);
          eventRef.current?.({ type: "progress", pct: boothProgress("shot", pose + 1) });
          if (!reduce) {
            setFiring(true);
            later(() => setFiring(false), 200);
          }
        } else if (b.beat === "ready") {
          setBusy(false);
          if (pose + 1 >= POSES) print();
        }
      }, b.at);
    }
  };

  const take = () => {
    if (stage !== "printing" || !emerging) return;
    setStage("taking");
    playPaper(audio.muted);
    buzz(12);
    later(
      () => {
        setStage("wall");
        if (!reduce) setBurst((b) => b + 1);
        playChime(audio.muted);
        eventRef.current?.({ type: "progress", pct: boothProgress("wall") });
      },
      reduce ? 0 : TIMING.take,
    );
  };

  const replay = () => {
    cancel();
    curtain.set(0);
    opening.current = false;
    started.current = false;
    setStage("outside");
    setShot("full");
    setArrived(false);
    setBusy(false);
    setCount(0);
    setShots(0);
    setFlashes(0);
    setFiring(false);
    setEmerging(false);
    setOut(false);
    setDeveloped(false);
    setGrabbed(false);
    setPulling(false);
    setRun((r) => r + 1);
  };

  // Space and Enter do the one thing each moment asks for, unless they are typing or on a control
  // of their own (which the key already presses). The editor hosts the gift beside a form.
  const keyRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    keyRef.current = () => {
      if (stage === "outside") openCurtain();
      else if (stage === "inside") press();
      else if (stage === "printing") take();
      else return false;
      return true;
    };
  });
  useEffect(() => {
    if (preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if (e.repeat || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("button, a, input, textarea, select, [contenteditable], [role=button]")) return;
      if (keyRef.current()) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const vars = {
    "--k": "min(var(--u), 0.5cqh)",
    "--p": "min(1cqw, 5.4px)",
    // The booth and the hint under it are 178 tall: centred, never closer than 9 to the top.
    "--top": "max(calc(9 * var(--k)), calc((100cqh - 178 * var(--k)) / 2))",
  } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;
  const tone: CoverTone = { page: "#EFE2CE", glow: ["transparent", "transparent"], accent: booth.stamp };
  const ready = stage === "inside" && arrived && !busy && shots < POSES;
  const liveIndex = count > 0 ? Math.min(shots, POSES - 1) : shots === 0 ? 0 : -1;
  const mirrorFrame = liveIndex >= 0 ? frames[liveIndex] : frames[Math.max(0, shots - 1)];
  const status = stage === "printing" && out ? s.ready : shots > 0 ? s.pose.replace("{n}", String(shots)) : "";

  return (
    <div ref={rootRef} data-stage={stage} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: "#EFE2CE", color: "#3A1A1E", fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{BOOTH_KEYFRAMES}</style>

      <AnimatePresence>
        {stage !== "wall" ? (
          <motion.div key={`booth-${run}`} className="absolute inset-0" exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.45 } }}>
            {/* the camera: the room and the booth move together, so the booth never leaves its room */}
            <div className="absolute inset-0 origin-top-left" style={{ transform: cameraTransform(shot), transition: reduce ? "none" : `transform ${TIMING.camera}ms cubic-bezier(.62,0,.26,1)` }}>
              <Room />
              <motion.div
                className="absolute"
                style={{ left: "calc(50% - 38 * var(--k))", top: "var(--top)", width: k(76), height: k(156) }}
                initial={reduce || run > 0 ? false : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 70, damping: 16 }}
              >
                <Cabinet booth={booth} photosLabel={s.photos} smileLabel={s.smile} />
                <Panel booth={booth} s={s} frame={mirrorFrame} live={liveIndex >= 0} filter={filter} count={count} shots={shots} flashes={flashes} firing={firing} ready={ready} pressed={pressed} onPress={press} buttonRef={buttonRef} reduce={reduce} />
                <Curtain
                  booth={booth}
                  open={curtain}
                  name={data.recipientName}
                  label={s.pull}
                  reserved={s.reserved}
                  enabled={stage === "outside"}
                  onTouch={() => {
                    setGrabbed(true);
                    begin();
                  }}
                  onLetGo={() => setGrabbed(false)}
                  onOpen={openCurtain}
                />
                <Pelmet booth={booth} />
                <motion.button
                  ref={stripRef}
                  type="button"
                  data-strip=""
                  aria-label={s.takeLabel}
                  tabIndex={emerging ? 0 : -1}
                  onClick={take}
                  className={cn("absolute overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-white/80", emerging ? "cursor-pointer" : "pointer-events-none")}
                  style={at(49.2, 102.2, 11.2, 34.4)}
                  animate={stage === "taking" ? { y: "10%", scale: 1.08, rotate: -3, opacity: 0 } : { y: 0, scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ duration: reduce ? 0 : TIMING.take / 1000, ease: [0.4, 0, 0.2, 1] }}
                >
                  <motion.div initial={false} animate={{ y: emerging ? ["-101%", "-73%", "-73%", "-40%", "-40%", "0%"] : "-101%" }} transition={emerging && !reduce ? { duration: TIMING.slide / 1000, ease: "linear", times: [0, 0.27, 0.36, 0.63, 0.72, 1] } : { duration: 0 }}>
                    <Strip frames={frames} filter={filter} developed={developed} develop={reduce ? 0 : TIMING.develop} names={names} date={date} ink={booth.stamp} />
                  </motion.div>
                </motion.button>
                <SlotLip booth={booth} />
                {/* the sign comes on with a flicker, the way old bulbs do */}
                <motion.div className="pointer-events-none absolute inset-0" initial={reduce || run > 0 ? false : { opacity: 0.15 }} animate={{ opacity: [0.15, 1, 0.35, 1, 0.7, 1] }} transition={{ duration: 0.9, delay: 0.55, times: [0, 0.2, 0.35, 0.55, 0.7, 1] }}>
                  <Marquee booth={booth} lines={sign} still={reduce} />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <Wall key={`wall-${run}`} data={data} fields={fields} booth={booth} frames={frames} names={names} date={date} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      {/* the flash itself, over everything, and gone in half a second */}
      {flashes > 0 && !reduce && stage === "inside" ? (
        <motion.div key={`flash-${flashes}`} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[40]" style={{ background: "radial-gradient(circle at 50% 30%, #FFFFFF, #FFF6E6)" }} initial={{ opacity: 0.86 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }} />
      ) : null}

      {/* what to do next, under the thing to do it to */}
      {stage === "outside" ? (
        <div className="absolute inset-x-0 z-[30] flex justify-center" style={{ top: `calc(var(--top) + ${k(161)})` }}>
          <TapPill tone={tone} hidden={grabbed || pulling} reduce={reduce} delay={1.2}>
            {s.pull}
          </TapPill>
        </div>
      ) : null}
      {stage === "inside" && arrived && shots < POSES ? (
        <div className="absolute inset-x-0 z-[30] flex justify-center" style={{ top: `calc(47cqh + ${k(60)})` }}>
          <TapPill key={shots} tone={tone} hidden={busy} reduce={reduce} delay={shots ? 0.1 : 0.3}>
            {shots === 0 ? s.press : shots === POSES - 1 ? s.last : s.again}
          </TapPill>
        </div>
      ) : null}
      {stage === "printing" && emerging ? (
        <div className="absolute inset-x-0 z-[30] flex justify-center" style={{ top: `calc(47cqh + ${k(64)})` }}>
          <TapPill key={out ? "take" : "printing"} tone={tone} reduce={reduce} delay={out ? 0 : 0.4}>
            {out ? s.take : s.printing}
          </TapPill>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <Confetti burst={burst} colors={booth.confetti} count={120} origin={{ x: 0.5, y: 0.3 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/**
 * The curtain: velvet on a rail across the doorway, bunching to the left as it is pulled. A drag
 * pulls it as far as the thumb goes and lets it settle open or fall back; a tap runs it open.
 */
function Curtain({ booth, open, name, label, reserved, enabled, onTouch, onLetGo, onOpen }: { booth: Booth; open: MotionValue<number>; name: string; label: string; reserved: string; enabled: boolean; onTouch: () => void; onLetGo: () => void; onOpen: () => void }) {
  const drag = useRef<{ x: number; from: number; travel: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const width = useTransform(open, (v) => `calc(${(39 - 32 * v).toFixed(3)} * var(--k))`);
  const size = useTransform(open, (v) => `100% 100%, calc(${(6.4 - 4.5 * v).toFixed(3)} * var(--k)) 100%`);
  const hemSize = useTransform(open, (v) => `100% 100%, calc(${(0.62 - 0.3 * v).toFixed(3)} * var(--k)) 100%`);
  const cardX = useTransform(open, [0, 1], ["0%", "-90%"]);
  const cardRotate = useTransform(open, [0, 1], [-4, -34]);
  const cardOpacity = useTransform(open, [0, 0.5], [1, 0]);
  const tie = useTransform(open, [0.8, 1], [0, 1]);
  const base = velvet(booth, "calc(6.4 * var(--k))");

  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!enabled) return;
    onTouch();
    const box = e.currentTarget.getBoundingClientRect();
    // How far a thumb has to travel to run it the whole way: the rail, in pixels on screen.
    const perUnit = box.width / Math.max(1, 39 - 32 * open.get());
    drag.current = { x: e.clientX, from: open.get(), travel: perUnit * 30, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = Math.abs(e.clientX - d.x);
    if (dx > 6) d.moved = true;
    if (d.moved) open.set(Math.min(1, Math.max(0, d.from + dx / d.travel)));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;
    if (open.get() > 0.25) onOpen();
    else {
      animate(open, 0, { type: "spring", stiffness: 260, damping: 24 });
      onLetGo();
    }
  };
  const click = () => {
    // A drag ends in a click too; the drag has already decided.
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (enabled) onOpen();
  };

  return (
    <>
      <motion.button
        type="button"
        data-curtain=""
        aria-label={label}
        tabIndex={enabled ? 0 : -1}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={click}
        className={cn("absolute touch-none outline-none focus-visible:ring-4 focus-visible:ring-white/80", enabled ? "cursor-grab active:cursor-grabbing" : "pointer-events-none")}
        style={{ left: k(4), top: k(35.4), height: k(90), width }}
      >
        <motion.span aria-hidden="true" className="absolute inset-0" style={{ ...base, backgroundSize: size, boxShadow: `inset ${k(-1.4)} 0 ${k(1.8)} rgba(0,0,0,.35), ${k(0.6)} 0 ${k(1.4)} rgba(20,0,4,.45)` }} />
        {/* the leading edge catches the light where the fabric turns */}
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[calc(1.6*var(--k))]" style={{ background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,220,220,.2) 55%, ${booth.curtain.deep})` }} />
        <motion.span aria-hidden="true" className="absolute inset-x-0 -bottom-[calc(1.8*var(--k))] h-[calc(2.4*var(--k))]" style={{ ...fringe(booth), backgroundSize: hemSize }} />
        {/* the tie-back, once it is all the way open: a twisted gold rope with a tassel */}
        <motion.span aria-hidden="true" className="absolute inset-x-[-4%] top-[56%]" style={{ opacity: tie }}>
          <span className="block h-[calc(1.3*var(--k))] rounded-full" style={{ background: `repeating-linear-gradient(118deg, #F7E3A8 0 ${k(0.35)}, ${booth.curtain.fringe} ${k(0.35)} ${k(0.7)}, #9A7430 ${k(0.7)} ${k(0.95)})`, boxShadow: `0 ${k(0.3)} ${k(0.6)} rgba(0,0,0,.45)` }} />
          <svg viewBox="0 0 10 22" className="absolute top-[calc(.6*var(--k))] right-[calc(.2*var(--k))] w-[calc(1.6*var(--k))]">
            <path d="M5 0 V5" stroke={booth.curtain.fringe} strokeWidth="1.4" />
            <ellipse cx="5" cy="6.5" rx="2.6" ry="2.2" fill={booth.curtain.fringe} />
            <path d="M2.6 8 L1.4 21 H8.6 L7.4 8 Z" fill={booth.curtain.fringe} />
            <path d="M3 9 L2.4 20.5 M5 9 V20.5 M7 9 L7.6 20.5" stroke="#9A7430" strokeWidth=".5" />
          </svg>
        </motion.span>
      </motion.button>
      <motion.div className="pointer-events-none absolute" style={{ left: k(11), top: k(58), width: k(24), x: cardX, rotate: cardRotate, opacity: cardOpacity, transformOrigin: "50% 0" }}>
        <div className="pb-sway">
          <ReservedCard name={name} label={reserved} booth={booth} />
        </div>
      </motion.div>
    </>
  );
}

/**
 * The camera wall inside: the flash with "look here" on it, the mirror, a lamp for each pose and
 * the big red button. The mirror shows them dim and moving until the flash freezes the picture.
 */
function Panel({ booth, s, frame, live, filter, count, shots, flashes, firing, ready, pressed, onPress, buttonRef, reduce }: { booth: Booth; s: Copy; frame: Frame<GiftPhoto>; live: boolean; filter: FilterId; count: number; shots: number; flashes: number; firing: boolean; ready: boolean; pressed: boolean; onPress: () => void; buttonRef: Ref<HTMLButtonElement>; reduce: boolean }) {
  return (
    <div className="absolute overflow-hidden rounded-[calc(1.4*var(--k))]" style={{ ...at(11, 38, 30, 72), backgroundColor: booth.panel, boxShadow: `inset 0 0 0 ${k(0.5)} rgba(255,255,255,.12), inset 0 ${k(-1.5)} ${k(3)} rgba(0,0,0,.35), 0 ${k(0.8)} ${k(2)} rgba(0,0,0,.5)` }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0) 30%, rgba(0,0,0,.18))" }} />
      {[
        [1.3, 1.3],
        [27.2, 1.3],
        [1.3, 69.2],
        [27.2, 69.2],
      ].map(([x, y]) => (
        <span key={`${x}-${y}`} aria-hidden="true" className="absolute rounded-full" style={{ ...at(x, y, 1.5, 1.5), background: `radial-gradient(circle at 35% 35%, ${booth.metal.hi}, ${booth.metal.lo})` }} />
      ))}
      <FlashPanel label={s.lookHere} ink={booth.stamp} lit={count > 0} firing={firing} />
      {/* the mirror, in a chrome bezel */}
      <div className="absolute rounded-[calc(1*var(--k))]" style={{ ...at(1.6, 8.6, 26.8, 20.3), background: `linear-gradient(135deg, ${booth.metal.hi}, ${booth.metal.mid} 45%, ${booth.metal.lo})`, boxShadow: `0 ${k(0.5)} ${k(1)} rgba(0,0,0,.45)` }} />
      <div data-mirror={live ? "live" : "frozen"} className="absolute overflow-hidden rounded-[calc(.6*var(--k))] bg-[#0B0708]" style={at(2.2, 9.2, 25.6, 19.1)}>
        <Mirror frame={frame} live={live} filter={filter} flashes={flashes} count={count} reduce={reduce} />
      </div>
      <PoseLamps taken={shots} counting={count > 0 ? shots : null} ink={booth.panelInk} />
      <p aria-hidden="true" className="absolute text-center leading-none tracking-[0.34em] uppercase" style={{ ...at(0, 35.4, 30, 2.4), fontFamily: TYPE_FONT, fontSize: k(1.5), color: booth.panelInk, paddingLeft: "0.34em", opacity: 0.85 }}>
        {s.push}
      </p>
      <RedButton label={s.press} ready={ready} pressed={pressed} onPress={onPress} buttonRef={buttonRef} />
    </div>
  );
}

/** What the mirror shows: them live behind dark glass, or the picture the flash just took. */
function Mirror({ frame, live, filter, flashes, count, reduce }: { frame: Frame<GiftPhoto>; live: boolean; filter: FilterId; flashes: number; count: number; reduce: boolean }) {
  const f = framing(frame.pose);
  const photo = frame.photo;
  return (
    <div className="absolute inset-0">
      {photo ? (
        <div className={cn("absolute inset-0", live && !reduce && "pb-live")}>
          <img
            src={photo.url}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${f.x}% ${f.y}%`, transform: f.zoom === 1 ? undefined : `scale(${f.zoom})`, transformOrigin: `${f.x}% ${f.y}%`, filter: live ? MIRROR_LIVE : stripFilter(filter, true) }}
          />
        </div>
      ) : (
        <svg viewBox="0 0 40 30" className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
          <circle cx="15" cy="12" r="4.4" fill="#E9DDD0" />
          <circle cx="25.5" cy="12.6" r="4.2" fill="#E9DDD0" />
          <path d="M6 30c1.5-8 5-11 9-11s7.5 3 8.5 11M16.5 30c1.5-8 5-10.5 9-10.5s7.5 2.5 8.5 10.5" fill="#E9DDD0" />
        </svg>
      )}
      {live ? <span aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(90% 90% at 50% 45%, rgba(0,0,0,0), rgba(0,0,0,.5))" }} /> : null}
      {/* the glass */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, rgba(255,255,255,.16) 0 16%, rgba(255,255,255,0) 26% 60%, rgba(255,255,255,.07) 68%, rgba(255,255,255,0) 78%)" }} />
      {!live && flashes > 0 && !reduce ? <motion.span key={flashes} aria-hidden="true" className="absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} /> : null}
      <AnimatePresence>
        {count > 0 ? (
          <motion.span
            key={count}
            data-count={count}
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center leading-none"
            style={{ fontFamily: "var(--font-poster), Georgia, serif", fontSize: k(13), color: "#FFF6E4", textShadow: `0 0 ${k(2)} rgba(255,200,120,.9), 0 ${k(0.4)} ${k(0.8)} rgba(0,0,0,.6)` }}
            initial={{ opacity: 0, scale: 1.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            {count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
