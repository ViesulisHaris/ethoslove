"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import { initialOf } from "@/lib/gift/graphemes";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { useSwipe } from "../_shared/hooks/use-swipe";
import { hashString } from "../_shared/random";
import { buzz, prime } from "../_shared/synth";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill, type CoverTone } from "../_shared/cover-kit";
import { COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Scrap, ScriptLines, Tape, TornPaper } from "../_shared/collage/kit";
import { RansomRows } from "../_shared/collage/ransom";
import { scriptLines } from "../_shared/collage/paper";
import { playChime } from "../_shared/collage/sounds";
import { BODY_LOOKS, CameraBack, CameraFront, LCD, LUG, Strap, VIEW, type BodyLook } from "./camera";
import { DiscoHeart } from "./art";
import { PrintedCard, PrintStrip, printHeight } from "./prints";
import { fileName, localDay, rollProgress, stampDay, stampText, stepRoll } from "./roll";
import { Screen } from "./screen";
import { ransomSeed, titleRows } from "./title";
import { playBeep, playBonk, playClick, playPrinter, playShutter, playWhirr } from "./sounds";
import { fieldsSchema, type DigicamFields } from "./schema";

type Copy = {
  birthday: string;
  turnOn: string;
  turnOnLabel: string;
  flick: string;
  print: string;
  hello: string;
  helloBirthday: string;
  prev: string;
  next: string;
  shutter: string;
  printButton: string;
  screen: string;
  noImage: string;
  printing: string;
  printed: string;
  script: string;
  love: string;
};

const S: Record<"en" | "es", Copy> = {
  en: {
    birthday: "happy birthday",
    turnOn: "turn it on",
    turnOnLabel: "Turn the camera on",
    flick: "press the shutter",
    print: "press it to print",
    hello: "hello, {name}!",
    helloBirthday: "happy birthday, {name}!",
    prev: "Previous photo",
    next: "Next photo",
    shutter: "Take a picture",
    printButton: "Print the photos",
    screen: "Photo {n} of {count}: {caption}. Open it large",
    noImage: "NO IMAGE",
    printing: "PRINTING",
    printed: "♥ PRINTED",
    script: "every photo on this card has you in it. happy birthday, keep the prints, and the camera, and me",
    love: "love you",
  },
  es: {
    birthday: "feliz cumple",
    turnOn: "enciéndela",
    turnOnLabel: "Enciende la cámara",
    flick: "pulsa el disparador",
    print: "púlsalo para imprimir",
    hello: "¡hola, {name}!",
    helloBirthday: "¡feliz cumple, {name}!",
    prev: "Foto anterior",
    next: "Foto siguiente",
    shutter: "Hacer una foto",
    printButton: "Imprimir las fotos",
    screen: "Foto {n} de {count}: {caption}. Ábrela en grande",
    noImage: "SIN IMAGEN",
    printing: "IMPRIMIENDO",
    printed: "♥ IMPRESO",
    script: "todas las fotos de esta tarjeta te tienen dentro. feliz cumple, quédate las copias, y la cámara, y a mí",
    love: "te quiero",
  },
};

/** The page: pink, like the birthday sheet it comes from. */
const PAGE = "#F2C6D4";
const INK = "#3A1D29";
const TONE: CoverTone = { page: PAGE, glow: ["rgba(255,255,255,.4)", "rgba(224,85,138,.2)"], accent: "#B83A6B" };
const TILES = ["#171214", "#FFFDF8", "#EFE5D2", "#E0558A", "#FFFDF8", "#171214", "#F8C9D8"];

/** The first screen's layout, in --k from --top: the title, the camera, the line under it. */
const STAGE_H = 150;
const CAM = { y: 38, w: 90 } as const;
const camH = (CAM.w * VIEW.h) / VIEW.w;
/** Where the body's bottom edge is: the prints come out from under it. */
const CAM_BOTTOM = CAM.y + camH * ((VIEW.h - 6) / VIEW.h);
const HINT_Y = CAM.y + camH + 9;

/** Percentages of the camera's box, for laying buttons and the screen over the drawing. */
const pct = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${(x / VIEW.w) * 100}%`, top: `${(y / VIEW.h) * 100}%`, width: `${(w / VIEW.w) * 100}%`, height: `${(h / VIEW.h) * 100}%` });

const KEYFRAMES = `
@keyframes dc-ring { 0%,100% { opacity: .95; } 50% { opacity: .25; } }
.dc-ring { animation: dc-ring 1.4s ease-in-out infinite; }
@keyframes dc-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
.dc-blink { animation: dc-blink 1s steps(1) infinite; }
@keyframes dc-glow { 0%,100% { opacity: .55; } 50% { opacity: .15; } }
.dc-glow { animation: dc-glow 1.2s ease-in-out infinite; }
@keyframes dc-swing { 0%,100% { rotate: -3deg; } 50% { rotate: 3deg; } }
.dc-swing { animation: dc-swing 4.6s ease-in-out infinite; transform-origin: 8% 3%; }
@media (prefers-reduced-motion: reduce) { .dc-ring, .dc-blink, .dc-glow, .dc-swing { animation: none; } }
`;

type Stage = "off" | "waking" | "hello" | "roll" | "prints";
type Data = TemplateProps<DigicamFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<DigicamFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const preview = mode === "preview";
  const instant = preview || reduce;
  const s = S[data.locale] ?? S.en;
  const t = useGiftStrings(data.locale);
  const audio = useGiftAudio(data.music, !preview);
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const look = BODY_LOOKS[fields.body] ?? BODY_LOOKS.pink;
  const photos = data.photos;
  const count = photos.length;
  const last = Math.max(0, count - 1);
  // "Today" is the day they open it, so it's asked of the browser when the camera turns on.
  const [today] = useState(() => localDay(new Date()));
  const stamp = fields.stamp ? stampText(stampDay(fields.stampDate, data.countdown, today), data.locale) : null;
  const title = fields.headline?.trim() || (fields.birthday ? s.birthday : data.recipientName);
  const hello = (fields.birthday ? s.helloBirthday : s.hello).replace("{name}", data.recipientName);

  const [stage, setStage] = useState<Stage>(preview ? "roll" : "off");
  const [lensOut, setLensOut] = useState(preview);
  const [flipped, setFlipped] = useState(preview);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [shot, setShot] = useState(0);
  const [flash, setFlash] = useState(0);
  const [printed, setPrinted] = useState(false);
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);

  const eventRef = useRef(onEvent);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);
  const handOver = useRef(false);
  const indexRef = useRef(0);
  useEffect(() => {
    eventRef.current = onEvent;
    indexRef.current = index;
  });
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const powerOn = () => {
    if (stage !== "off" || preview) return;
    void audio.start();
    prime();
    buzz(14);
    eventRef.current?.({ type: "started" });
    handOver.current = true;
    setStage("waking");
    setLensOut(true);
    if (!reduce) playWhirr(audio.muted);
    later(
      () => {
        playBeep(audio.muted);
        setFlipped(true);
      },
      reduce ? 60 : 950,
    );
    later(() => setStage("hello"), reduce ? 120 : 1750);
    later(
      () => {
        setStage("roll");
        eventRef.current?.({ type: "progress", pct: rollProgress(0, count) });
      },
      reduce ? 1100 : 1750 + 750 + 55 * [...hello].length + 900,
    );
  };

  const show = (next: number, dir: number) => {
    setDirection(dir);
    setIndex(next);
    eventRef.current?.({ type: "progress", pct: rollProgress(next, count) });
  };

  const step = (delta: number) => {
    if (stage !== "roll") return;
    const next = stepRoll(indexRef.current, delta, count);
    if (next === indexRef.current) {
      playBonk(audio.muted);
      return;
    }
    playClick(audio.muted);
    buzz(6);
    show(next, delta);
  };

  const print = () => {
    setOpen(false);
    setStage("prints");
    playPrinter(audio.muted, 2.4);
    eventRef.current?.({ type: "progress", pct: 80 });
    // Follow the strip down as it comes out: the camera's screen still in view at the top, printing.
    later(
      () => {
        const scroller = scrollerRef.current;
        const camera = cameraRef.current;
        if (!scroller || !camera) return;
        const top = camera.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTo({ top: Math.max(0, top - scroller.clientHeight * 0.1), behavior: reduce ? "auto" : "smooth" });
      },
      reduce ? 50 : 650,
    );
    later(
      () => {
        setPrinted(true);
        setBurst((b) => b + 1);
        playChime(audio.muted);
      },
      reduce ? 300 : 2700,
    );
  };

  const shoot = () => {
    if (stage !== "roll" || busy.current) return;
    busy.current = true;
    later(() => {
      busy.current = false;
    }, 700);
    playShutter(audio.muted);
    buzz(22);
    if (!reduce) setFlash((f) => f + 1);
    const at = indexRef.current;
    if (at >= last) {
      later(print, reduce ? 50 : 450);
      return;
    }
    later(
      () => {
        setShot((n) => n + 1);
        show(at + 1, 1);
      },
      reduce ? 0 : 140,
    );
  };

  const replay = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.length = 0;
    busy.current = false;
    scrollerRef.current?.scrollTo({ top: 0 });
    setStage("off");
    setLensOut(false);
    setFlipped(false);
    setIndex(0);
    setDirection(1);
    setShot(0);
    setPrinted(false);
    setOpen(false);
    setRun((r) => r + 1);
  };

  // Once it's on, the shutter takes the focus from the power button that has gone round the back.
  useEffect(() => {
    if (stage !== "roll" || !handOver.current) return;
    handOver.current = false;
    shutterRef.current?.focus({ preventScroll: true });
  }, [stage]);

  // Keys: the arrows go through the roll, Enter takes a picture (or turns the camera on), Escape closes a photo.
  useEffect(() => {
    if (preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      const onControl = Boolean(target?.closest("button, a, [role=button]"));
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (stage === "off" && (e.key === "Enter" || e.key === " ") && !onControl) {
        e.preventDefault();
        powerOn();
      } else if (stage === "roll") {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          step(e.key === "ArrowLeft" ? -1 : 1);
        } else if ((e.key === "Enter" || e.key === " ") && !onControl) {
          e.preventDefault();
          shoot();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const swipe = useSwipe((d) => (d === "left" ? step(1) : d === "right" ? step(-1) : undefined), { distance: 36, enabled: stage === "roll" && !preview });

  const unit = size.ready ? Math.min(size.width / 100, (size.height * 0.6) / 100, size.height / STAGE_H) : 3.9;
  const context = useMemo(() => ({ container: scrollerRef, still: instant, unit }), [instant, unit]);
  const vars = {
    "--k": `min(var(--u), calc(100cqh / ${STAGE_H}))`,
    "--p": "var(--k)",
    "--top": `max(calc(2 * var(--k)), calc((100cqh - ${STAGE_H} * var(--k)) / 2))`,
  } as CSSProperties;

  const screen =
    stage === "hello"
      ? { kind: "boot" as const, hello, reduce: instant }
      : stage === "roll"
        ? count
          ? { kind: "photo" as const, photo: photos[index] ?? photos[0], index, count, file: fileName(index), stamp, direction, shot, still: instant }
          : { kind: "empty" as const, label: s.noImage }
        : stage === "prints"
          ? printed
            ? { kind: "printed" as const, label: s.printed }
            : { kind: "printing" as const, count, label: s.printing, still: instant }
          : { kind: "off" as const };
  const current = photos[index];
  const screenLabel = current ? s.screen.replace("{n}", String(index + 1)).replace("{count}", String(count)).replace("{caption}", current.caption?.trim() || fileName(index)) : s.noImage;
  const hint = stage === "off" ? s.turnOn : stage === "roll" ? (index >= last ? s.print : s.flick) : null;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: PAGE, color: INK, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES + KEYFRAMES}</style>
      <CollageContext.Provider value={context}>
        <div ref={scrollerRef} data-scroller="" className={cn("absolute inset-0 overflow-x-hidden overscroll-contain scrollbar-none", stage === "prints" ? "overflow-y-auto" : "overflow-y-hidden")}>
          <div key={`page-${run}`} className="relative min-h-full" style={{ backgroundImage: PAPER_GRAIN }}>
            {/* the first screen: the collage, the title and the camera */}
            <section className="relative mx-auto h-[100cqh] w-[calc(100*var(--k))]">
              <Backdrop data={data} s={s} />
              <Title text={title} seed={hashString(`${data.recipientName}|${data.senderName}|digicam`)} still={instant} />

              <div ref={cameraRef} className="absolute left-1/2 z-20" style={{ top: `calc(var(--top) + ${CAM.y} * var(--k))`, width: `calc(${CAM.w} * var(--k))`, aspectRatio: `${VIEW.w} / ${VIEW.h}`, translate: "-50% 0", perspective: `calc(${CAM.w * 5} * var(--k))` }}>
                <span aria-hidden="true" className="absolute inset-x-[6%] bottom-[-3%] h-[18%] rounded-[50%] bg-[#6B2342]/30 blur-[calc(2*var(--k))]" />
                <motion.div className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }} initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: instant ? 0 : 0.8, ease: [0.55, 0, 0.3, 1] }}>
                  {/* the front: the lens, and one big button that switches it on */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]" inert={flipped} style={{ pointerEvents: flipped ? "none" : undefined }}>
                    <StrapOn look={look} initial={initialOf(data.recipientName, "♥")} side="left" still={instant} />
                    <CameraFront look={look} out={lensOut} instant={instant} pulse={stage === "off" ? "power" : undefined} />
                    <button type="button" onClick={powerOn} aria-label={s.turnOnLabel} className="absolute inset-[-4%] rounded-[12%] outline-none focus-visible:ring-4 focus-visible:ring-white/80" />
                  </div>
                  {/* the back: the screen, the pad, the shutter */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]" inert={!flipped} style={{ pointerEvents: flipped ? undefined : "none" }}>
                    <StrapOn look={look} initial={initialOf(data.recipientName, "♥")} side="right" still={instant} />
                    <CameraBack look={look} on={flipped} ready={stage === "roll" && index >= last} pulse={stage === "roll" && !preview ? "shutter" : undefined} />
                    <div className="absolute" style={pct(LCD.x, LCD.y, LCD.w, LCD.h)}>
                      <Screen show={screen} className="inset-0" />
                      <button
                        type="button"
                        aria-label={screenLabel}
                        disabled={preview || stage !== "roll" || !current}
                        onClick={() => setOpen(true)}
                        className="absolute inset-0 touch-pan-y outline-none focus-visible:ring-4 focus-visible:ring-white/80 disabled:cursor-default"
                        {...swipe}
                      />
                    </div>
                    <CameraButton label={s.prev} style={pct(240, 88, 38, 64)} onClick={() => step(-1)} disabled={preview || stage !== "roll"} />
                    <CameraButton label={s.next} style={pct(278, 88, 40, 64)} onClick={() => step(1)} disabled={preview || stage !== "roll"} />
                    <CameraButton ref={shutterRef} label={s.shutter} style={pct(232, -14, 60, 40)} onClick={shoot} disabled={preview || stage !== "roll"} />
                    <CameraButton label={s.printButton} style={pct(246, 50, 54, 28)} onClick={shoot} disabled={preview || stage !== "roll" || index < last} />
                  </div>
                </motion.div>
              </div>

              {hint && !preview ? (
                <div className="absolute inset-x-0 z-[22] flex justify-center" style={{ top: `calc(var(--top) + ${HINT_Y} * var(--k))` }}>
                  <TapPill tone={TONE} reduce={reduce} delay={stage === "off" ? 1.1 : 0.3} key={hint}>
                    {hint}
                  </TapPill>
                </div>
              ) : null}
            </section>

            {stage === "prints" ? (
              <PrintOut data={data} mode={mode} stamp={stamp} still={instant} onOpen={(i) => setIndex(i)} onOpenLarge={() => setOpen(true)} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
            ) : null}
          </div>
        </div>
      </CollageContext.Provider>

      {/* the flash: bright, and gone in a moment */}
      <AnimatePresence>{flash ? <motion.div key={flash} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[70] bg-white" initial={{ opacity: 0.92 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} /> : null}</AnimatePresence>
      <AnimatePresence>{open && current ? <Lightbox key="box" photo={current} onClose={() => setOpen(false)} closeLabel={t("close")} /> : null}</AnimatePresence>
      <Confetti burst={burst} colors={["#E0558A", "#FFFFFF", "#FFB347", "#F8C9D8", "#C9B6F2"]} count={120} origin={{ x: 0.5, y: 0.3 }} className="pointer-events-none absolute inset-0 z-[60]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** A button laid over one of the drawing's buttons: the drawing is the look, this is the thumb target. */
function CameraButton({ label, style, onClick, disabled, ref }: { label: string; style: CSSProperties; onClick: () => void; disabled: boolean; ref?: Ref<HTMLButtonElement> }) {
  return <button ref={ref} type="button" aria-label={label} onClick={onClick} disabled={disabled} className="absolute rounded-[30%] outline-none focus-visible:ring-4 focus-visible:ring-white/80 disabled:cursor-default" style={style} />;
}

/** The strap, tied to the lug on whichever side faces them, swinging a little. */
function StrapOn({ look, initial, side, still }: { look: BodyLook; initial: string; side: "left" | "right"; still: boolean }) {
  const lugX = side === "right" ? LUG.x : VIEW.w - LUG.x;
  // The loop hangs in under the camera, never out past its side, so a narrow phone keeps it whole.
  return (
    <div className="pointer-events-none absolute" style={{ left: `${(lugX / VIEW.w) * 100}%`, top: `${(LUG.y / VIEW.h) * 100}%`, width: "15%", translate: side === "right" ? "-80% -3%" : "-20% -3%", zIndex: -1 }}>
      <div className={cn(!still && "dc-swing")} style={{ transform: side === "right" ? "scaleX(-1)" : undefined, filter: look === BODY_LOOKS.black ? "drop-shadow(0 1px 1.5px rgba(0,0,0,.35))" : "drop-shadow(0 1px 1.5px rgba(90,30,50,.3))" }}>
        <Strap initial={initial} mirrored={side === "right"} className="block h-auto w-full" />
      </div>
    </div>
  );
}

/** The title, cut out of magazines a letter at a time. */
function Title({ text, seed, still }: { text: string; seed: number; still: boolean }) {
  const rows = titleRows(text);
  const letters = ransomSeed(rows, seed);
  const longest = Math.max(1, ...rows.map((r) => [...r].length));
  const size = Math.min(10, 78 / longest, 31 / (rows.length * 1.32));
  return (
    <motion.div
      className="absolute inset-x-0 z-[12] flex items-center justify-center"
      style={{ top: `calc(var(--top) + 1 * var(--k))`, height: `calc(${CAM.y - 3} * var(--k))` }}
      initial={still ? false : { opacity: 0, y: -12, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
    >
      <h1 className="m-0" aria-label={text}>
        <RansomRows rows={rows} size={size} tiles={TILES} seed={letters} />
      </h1>
    </motion.div>
  );
}

/**
 * The collage the camera sits on, after the owner's birthday sheet: torn pink paper with the
 * sender's words showing through, a scrap of newsprint, kraft, and the cut-outs round the edges.
 * Pieces placed past the column's sides only show on a screen wide enough for them.
 */
function Backdrop({ data, s }: { data: Data; s: Copy }) {
  const seed = hashString(`${data.recipientName}|${data.senderName}|digicam-page`);
  const lines = scriptLines(data.message, s.script, 14, seed);
  const paper = (n: number, color: string, depth = 4) => ({ seed: seed + n, sides: { top: true, right: true, bottom: true, left: true }, color, grain: PAPER_GRAIN, depth });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: "var(--top)", height: `calc(${STAGE_H} * var(--k))` }}>
      {/* the papers */}
      <TornPaper {...paper(1, "#F9DCE6")} className="absolute" style={{ left: "calc(-14*var(--k))", top: "calc(-10*var(--k))", width: "calc(78*var(--k))", height: "calc(52*var(--k))", rotate: "-4deg" }}>
        <div className="relative h-[calc(52*var(--k))]">
          <ScriptLines lines={lines.slice(0, 6)} color="rgba(140,54,88,.42)" font={SCRIPT_FONT} size={4.2} />
        </div>
      </TornPaper>
      <TornPaper {...paper(2, "#EEE8DA", 3)} className="absolute" style={{ left: "calc(58*var(--k))", top: "calc(-14*var(--k))", width: "calc(60*var(--k))", height: "calc(46*var(--k))", rotate: "6deg" }}>
        <div className="relative h-[calc(46*var(--k))] overflow-hidden px-[calc(4*var(--k))] pt-[calc(15*var(--k))]">
          <p className="text-[calc(5.4*var(--k))] leading-none font-black tracking-[0.02em] text-[#2D2622]/80 uppercase" style={{ fontFamily: POSTER_FONT }}>
            {data.locale === "es" ? "Sucesos" : "The Daily"}
          </p>
          <div className="mt-[calc(1.2*var(--k))] h-px bg-[#2D2622]/50" />
          <div className="relative mt-[calc(1*var(--k))] h-[calc(24*var(--k))]">
            <ScriptLines lines={lines.slice(6, 14)} color="rgba(45,38,34,.5)" font={POSTER_FONT} size={2.5} />
          </div>
        </div>
      </TornPaper>
      <TornPaper {...paper(3, "#EDB3C5", 3)} className="absolute" style={{ left: "calc(-10*var(--k))", top: `calc(${CAM.y + 6}*var(--k))`, width: "calc(120*var(--k))", height: `calc(${camH + 4}*var(--k))`, rotate: "1.5deg" }} />
      <TornPaper {...paper(4, "#E6D5BE", 3)} className="absolute" style={{ left: "calc(-12*var(--k))", top: `calc(${CAM.y + camH + 14}*var(--k))`, width: "calc(64*var(--k))", height: "calc(44*var(--k))", rotate: "-3deg" }}>
        <p className="absolute left-[calc(16*var(--k))] top-[calc(8*var(--k))] -rotate-6 text-[calc(11*var(--k))] leading-none text-[#3A2A26]/75" style={{ fontFamily: SCRIPT_FONT }}>
          {s.love}
        </p>
      </TornPaper>
      <TornPaper {...paper(5, "#F9DCE6", 3)} className="absolute" style={{ left: "calc(52*var(--k))", top: `calc(${CAM.y + camH + 20}*var(--k))`, width: "calc(64*var(--k))", height: "calc(40*var(--k))", rotate: "4deg" }}>
        <div className="relative h-[calc(40*var(--k))]">
          <ScriptLines lines={lines.slice(3, 9)} color="rgba(140,54,88,.4)" font={SCRIPT_FONT} size={3.8} />
        </div>
      </TornPaper>

      {/* the cut-outs */}
      <Piece x={10} y={7} w={21} rotate={-14} z={14} entrance="stamp" delay={0.5}>
        <Scrap id="kiss-red" eager />
      </Piece>
      {/* Left of the sound toggle, which owns the top-right corner, and above the title. */}
      <Piece x={90} y={15} w={13} rotate={8} z={14} entrance="drop" delay={0.3}>
        <Scrap id="disco-ball-silver" eager />
      </Piece>
      <Piece x={6} y={32} w={11} rotate={-12} z={14} entrance="bloom" delay={0.65}>
        <Scrap id="star-felt-plump" eager />
      </Piece>
      <Piece x={94} y={31} w={12} rotate={12} z={14} entrance="bloom" delay={0.8}>
        <DiscoHeart className="block w-full" />
      </Piece>
      <Piece x={20} y={CAM.y + camH + 33} w={30} rotate={-9} z={9} sway entrance="left" delay={0.7}>
        <Scrap id="tulips-pink" eager />
      </Piece>
      <Piece x={85} y={CAM.y + camH + 36} w={24} rotate={9} z={10} entrance="right" delay={0.85}>
        <Scrap id="envelope-ps" eager />
      </Piece>
      <Piece x={60} y={CAM.y + camH + 42} w={27} rotate={-16} z={11} entrance="stick" delay={0.95}>
        <Scrap id="plaster-heart" eager />
      </Piece>
      <Piece x={44} y={CAM.y + camH + 25} w={8} rotate={14} z={12} entrance="bloom" delay={1.05}>
        <Scrap id="star-felt-tilted" eager />
      </Piece>
      <Piece x={94} y={CAM.y + camH + 14} w={13} rotate={10} z={12} entrance="bloom" delay={1.1}>
        <Scrap id="bow-satin-blush" eager />
      </Piece>

      {/* past the column: only on a wide screen */}
      <TornPaper {...paper(6, "#F9DCE6", 3)} className="absolute" style={{ left: "calc(-62*var(--k))", top: "calc(18*var(--k))", width: "calc(54*var(--k))", height: "calc(70*var(--k))", rotate: "-5deg" }}>
        <div className="relative h-[calc(70*var(--k))]">
          <ScriptLines lines={lines.slice(2, 10)} color="rgba(140,54,88,.4)" font={SCRIPT_FONT} size={4} />
        </div>
      </TornPaper>
      <TornPaper {...paper(7, "#EEE8DA", 3)} className="absolute" style={{ left: "calc(106*var(--k))", top: "calc(70*var(--k))", width: "calc(50*var(--k))", height: "calc(62*var(--k))", rotate: "4deg" }}>
        <div className="relative h-[calc(62*var(--k))]">
          <ScriptLines lines={lines.slice(5, 13)} color="rgba(45,38,34,.45)" font={POSTER_FONT} size={2.6} />
        </div>
      </TornPaper>
      <Piece x={-30} y={30} w={34} rotate={-8} z={6} entrance="left" delay={0.4}>
        <Scrap id="tulips-pink" />
      </Piece>
      <Piece x={130} y={60} w={24} rotate={10} z={6} entrance="right" delay={0.5}>
        <Scrap id="disco-ball-silver" />
      </Piece>
      <Piece x={-24} y={110} w={22} rotate={12} z={6} entrance="bloom" delay={0.6}>
        <Scrap id="kiss-1" />
      </Piece>
      <Piece x={126} y={120} w={16} rotate={-12} z={6} entrance="bloom" delay={0.7}>
        <Scrap id="star-felt" />
      </Piece>
    </div>
  );
}

/**
 * What comes out of the camera: the strip of prints from under it, then the letter on a printed
 * card, then the rest of the gift. The strip slides out from behind the body, so it looks fed.
 */
function PrintOut({ data, mode, stamp, still, onOpen, onOpenLarge, onEvent, onReact, onMakeOne, onReplay }: { data: Data; mode: TemplateProps["mode"]; stamp: string | null; still: boolean; onOpen: (i: number) => void; onOpenLarge: () => void; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const endRef = useRef<HTMLDivElement>(null);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const photos = data.photos;
  const stripH = photos.length * printHeight();
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    let ended = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!ended && entries.some((e) => e.isIntersecting)) {
          ended = true;
          eventRef.current?.({ type: "progress", pct: 100 });
          eventRef.current?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const side = (i: number): ReactNode => {
    const pieces = [
      <Scrap key="a" id="star-felt-plump" />,
      <Scrap key="b" id="kiss-2" />,
      <DiscoHeart key="c" seed={31} className="block w-full" />,
      <Scrap key="d" id="heart-print-pink" />,
      <Scrap key="e" id="bow-satin-blush" />,
      <Scrap key="f" id="star-felt-tilted" />,
    ];
    return pieces[i % pieces.length];
  };

  return (
    <div className="relative mx-auto w-[calc(100*var(--k))] pb-[calc(72px+env(safe-area-inset-bottom))]" style={{ marginTop: `calc(var(--top) + ${CAM_BOTTOM - 1} * var(--k) - 100cqh)` }}>
      {photos.length ? (
        // Over the first screen's cut-outs (they reach z 14), under the camera (20) it comes out of.
        <section className="relative z-[15]" style={{ height: `calc(${stripH + 6} * var(--k))` }}>
          {/* only what's below the camera's edge shows: the strip is still inside until it's fed out */}
          <div className="absolute inset-x-[-50%] top-0 bottom-[-20%]" style={{ clipPath: "inset(0 0 0 0)" }}>
            <motion.div className="absolute left-1/2 top-0" style={{ translate: "-50% 0" }} initial={still ? false : { y: "-100%" }} animate={{ y: 0 }} transition={{ duration: 2.5, ease: [0.25, 0.55, 0.35, 1] }}>
              <PrintStrip
                photos={photos}
                stamp={stamp}
                style={{ rotate: "-1.2deg" }}
                onOpen={(i) => {
                  onOpen(i);
                  onOpenLarge();
                }}
              />
            </motion.div>
          </div>
          {photos.map((_, i) =>
            i % 2 === 0 || photos.length < 3 ? (
              <Piece key={i} x={i % 4 === 0 ? 7 : 93} y={i * printHeight() + 26} w={i % 3 === 1 ? 17 : 13} rotate={i % 4 === 0 ? -12 : 14} z={12} drift={4} entrance={i % 4 === 0 ? "left" : "right"} delay={0.2}>
                {side(i)}
              </Piece>
            ) : null,
          )}
        </section>
      ) : null}

      <section className="relative z-10 mt-[calc(10*var(--k))] px-[calc(5*var(--k))]">
        <motion.div className="relative" initial={still ? false : { opacity: 0, y: 40, rotate: 3 }} whileInView={{ opacity: 1, y: 0, rotate: 0.8 }} viewport={{ once: true, amount: 0.15 }} transition={{ type: "spring", stiffness: 90, damping: 16 }}>
          <Tape color="#F5A9C0" width={26} className="-top-[calc(2*var(--k))] left-[36%] z-[3] -rotate-3" />
          <PrintedCard file={fileName(photos.length)} stamp={stamp}>
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" accent={data.accentColor} />
          </PrintedCard>
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-0">
          <Piece x={7} y={7} w={22} rotate={-14} z={4} entrance="left">
            <Scrap id="tulips-pink" />
          </Piece>
        </div>
      </section>

      <div className="relative z-10 mt-[calc(10*var(--k))] flex flex-col gap-[calc(7*var(--k))] px-[calc(6*var(--k))]">
        {data.countdown ? (
          <div className="rounded-[calc(2*var(--k))] p-[calc(5*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN, color: INK }}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}
        {data.surprise ? (
          <div className="rounded-[calc(2*var(--k))] px-[calc(5*var(--k))] pt-[calc(6*var(--k))] pb-[calc(5*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: "#F9DCE6", backgroundImage: PAPER_GRAIN, color: INK }}>
            <p className="mb-[calc(3*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}
        <div ref={endRef} className="rounded-[calc(2*var(--k))] px-[calc(3*var(--k))] py-[calc(6*var(--k))]" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN, color: INK, boxShadow: "0 14px 26px -18px rgba(0,0,0,.45)" }}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </div>
  );
}
