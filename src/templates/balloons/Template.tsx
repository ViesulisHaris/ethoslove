"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString } from "../_shared/random";
import { mix } from "../_shared/theme";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, SCRIPT_FONT, TapPill, type CoverTone } from "../_shared/cover-kit";
import { Balloon, BALLOON_KEYFRAMES, Bunting, FoilDigit, PALETTES, Peg, PopShards, WallPrint, type BalloonTone, type Palette, type PaletteId } from "./art";
import { ageDigits, bannerRows, layoutBalloons, pileSlots, type BalloonSpot } from "./scene";
import { playPop } from "./pop-sound";
import type { BalloonsFields } from "./schema";

type Copy = { pop: string; popOne: string; letter: string; left: string; leftOne: string; lastOne: string; popFirst: string; banner: string; fell: string; playing: string; from: string };

const S: Record<"en" | "es", Copy> = {
  en: { pop: "tap a balloon to pop it", popOne: "Pop a balloon", letter: "Open the letter", left: "{n} to go", leftOne: "one to go", lastOne: "the big one has a note in it", popFirst: "pop the others first", banner: "happy birthday", fell: "what fell out", playing: "now playing", from: "From" },
  es: { pop: "toca un globo para explotarlo", popOne: "Explotar un globo", letter: "Abrir la carta", left: "quedan {n}", leftOne: "queda uno", lastOne: "el grande lleva una nota", popFirst: "explota primero los demás", banner: "feliz cumple", fell: "lo que cayó", playing: "sonando", from: "De" },
};

type Stage = "float" | "read";

/** How many balloons hold nothing but confetti, so the room looks full with few photos. */
const empties = (photos: number) => (photos >= 7 ? 2 : 3);

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<BalloonsFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const wide = size.ready && size.width > size.height * 1.25;
  const reduce = !!useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const paletteId: PaletteId = data.fields.palette in PALETTES ? data.fields.palette : "pastel";
  const p = PALETTES[paletteId];
  const preview = mode === "preview";
  const seed = hashString(`${data.recipientName}|${data.senderName}|balloons`);
  const photos = useMemo(() => data.photos.slice(0, 8), [data.photos]);
  const blanks = empties(photos.length);
  const total = photos.length + blanks + 1;
  const last = total - 1;
  const spots = useMemo(() => layoutBalloons(total, seed, p.balloons.length, wide, preview), [total, seed, p.balloons.length, wide, preview]);
  const slots = useMemo(() => pileSlots(photos.length, seed), [photos.length, seed]);
  const digits = ageDigits(data.fields.age);
  const rows = bannerRows(data.fields.banner?.trim() || s.banner);
  const wallLine = data.fields.wall?.trim() || data.recipientName;
  const letterTone: BalloonTone = useMemo(() => ({ light: mix(data.accentColor, "#FFFFFF", 0.62), mid: data.accentColor, deep: mix(data.accentColor, "#000000", 0.32) }), [data.accentColor]);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);

  const [stage, setStage] = useState<Stage>(preview ? "read" : "float");
  // The editor's still frame keeps every balloon up and the letter open under them, so a change
  // to the room and a change to the words both show at once.
  const [popped, setPopped] = useState<boolean[]>(() => Array(total).fill(false));
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [nudged, setNudged] = useState(false);
  const started = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  const [letterScope, animateLetter] = useAnimate();

  const remaining = popped.slice(0, last).filter((x) => !x).length;
  const ready = remaining === 0;

  const pop = (i: number) => {
    if (popped[i] || stage !== "float") return;
    if (i === last && !ready) {
      // The letter waits for the others: a wobble, and a word about why.
      setNudged(true);
      if (letterScope.current) void animateLetter(letterScope.current, { x: [0, -9, 9, -6, 4, 0] }, { duration: 0.55 });
      return;
    }
    if (!started.current) {
      started.current = true;
      void audio.start();
      eventRef.current?.({ type: "started" });
    }
    playPop(audio.muted);
    try {
      navigator.vibrate?.(14);
    } catch {
      // not every browser has a motor
    }
    const next = popped.slice();
    next[i] = true;
    setPopped(next);
    const done = next.filter(Boolean).length;
    eventRef.current?.({ type: "progress", pct: Math.round((done / total) * 60) });
    if (i === last) {
      setBurst((b) => b + 1);
      window.setTimeout(() => setStage("read"), reduce ? 250 : 1150);
    }
  };

  const replay = () => {
    setStage("float");
    setPopped(Array(total).fill(false));
    setNudged(false);
    setRun((r) => r + 1);
  };

  const tone: CoverTone = { page: p.paper, glow: ["transparent", "transparent"], accent: p.accent, dark: p.dark };
  // --b sizes the balloons, --s the sign above them: both follow the width on a phone and the height on a laptop.
  const vars = { "--k": "min(var(--u), 0.5cqh)", "--b": "min(1.2cqw, 0.72cqh)", "--s": "min(1.2cqw, 0.72cqh)" } as CSSProperties;
  const letterSpot = spots[last];

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ background: p.wall, color: p.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{BALLOON_KEYFRAMES}</style>
      <WallPrint color={p.print} className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: p.dark ? 0.35 : 0.6 }} />
      {/* the floor the photos land on */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%]" style={{ background: p.dark ? "linear-gradient(180deg, transparent, rgba(0,0,0,.42))" : "linear-gradient(180deg, transparent, rgba(90,50,40,.16))" }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={p.ambience} opacity={stage === "read" ? 0.5 : 0.9} />
      </div>

      {/* the sign: bunting, the foil numbers, and a line in handwriting */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex flex-col items-center" style={{ paddingTop: "max(3cqh, calc(2*var(--k)))" }}>
        <motion.div key={`bunting-${run}`} className="bl-sway w-[min(86%,calc(120*var(--s)))]" initial={preview || reduce ? false : { y: "-30cqh", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 50, damping: 14, delay: 0.1 }}>
          <Bunting rows={rows} pennants={p.pennants} string={p.bunting} seed={seed} className="w-full" />
        </motion.div>
        {digits.length ? (
          <motion.div key={`digits-${run}`} className="bl-rise -mt-[calc(.6*var(--s))] flex items-end justify-center" initial={preview || reduce ? false : { y: "40cqh", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 46, damping: 13, delay: 0.5 }}>
            {digits.map((d, i) => (
              <FoilDigit key={i} digit={d} foil={p.foil} className="w-[calc(17*var(--s))]" style={{ marginLeft: i ? "calc(-2.2*var(--s))" : 0, rotate: `${(i - (digits.length - 1) / 2) * 4}deg` }} />
            ))}
          </motion.div>
        ) : null}
        <motion.p
          key={`wall-${run}`}
          className={cn("max-w-[86%] text-center leading-[1.15] break-words", digits.length ? "-mt-[calc(1.2*var(--s))]" : "mt-[calc(1.4*var(--s))]")}
          style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(5.4*var(--s))", color: p.dark ? p.ink : p.accent, textShadow: p.dark ? "0 2px 12px rgba(0,0,0,.4)" : "0 1px 0 rgba(255,255,255,.6)" }}
          initial={preview || reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          {wallLine}
        </motion.p>
      </div>

      {/* the balloons */}
      {spots.map((spot, i) => (
        <BalloonAt
          key={`${run}-${i}`}
          index={i}
          spot={spot}
          tone={i === last ? letterTone : p.balloons[spot.tone] ?? p.balloons[0]}
          ribbon={p.ribbon}
          confetti={p.confetti}
          seed={seed + i * 31}
          popped={popped[i]}
          label={i === last ? s.letter : s.popOne}
          letter={i === last}
          still={preview || reduce}
          reduce={reduce}
          onPop={() => pop(i)}
          scopeRef={i === last ? letterScope : undefined}
        />
      ))}

      {/* what fell out: a polaroid for every photo balloon that went */}
      {photos.map((photo, i) =>
        popped[i] ? <FallenPolaroid key={`${run}-p${i}`} photo={photo} from={spots[i]} to={slots[i]} paper={p.paper} order={i} reduce={reduce || preview} onOpen={() => setActive(i)} /> : null,
      )}

      {/* the one line that says what to do */}
      <AnimatePresence>
        {stage === "float" ? (
          <motion.div key="pill" className="pointer-events-none absolute inset-x-0 z-[36] flex flex-col items-center gap-[calc(1.6*var(--k))] px-4" style={{ bottom: "max(calc(4*var(--k)), calc(env(safe-area-inset-bottom) + 1.6rem))" }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
            <TapPill tone={tone} reduce={reduce} delay={preview ? 0 : 1.6}>
              {ready ? s.letter.toLowerCase() : s.pop}
            </TapPill>
            <motion.p
              key={ready ? "ready" : nudged ? "nudged" : remaining}
              className="text-[calc(2.7*var(--k))] tracking-[0.12em] uppercase"
              style={{ color: p.dark ? "rgba(255,255,255,.7)" : "rgba(74,46,52,.6)" }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: preview ? 0 : 2, duration: 0.5 }}
            >
              {ready ? s.lastOne : nudged ? s.popFirst : remaining === 1 ? s.leftOne : s.left.replace("{n}", String(remaining))}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Confetti burst={burst} colors={[data.accentColor, ...p.confetti]} count={240} origin={{ x: letterSpot.x / 100, y: letterSpot.y / 100 + 0.08 }} className="pointer-events-none absolute inset-0 z-[35]" />

      {/* the letter, on a sheet that slides up over the floor */}
      <AnimatePresence>
        {stage === "read" ? (
          <Letter key={`letter-${run}`} data={data} mode={mode} blocks={blocks} photos={photos} palette={p} s={s} t={t} reduce={reduce || preview} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} onOpen={setActive} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {active !== null && photos[active] ? (
          <motion.div key="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] grid place-items-center bg-black/80 p-6" onClick={() => setActive(null)}>
            <motion.figure initial={{ scale: 0.86, rotate: -3 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.9 }} className="m-0 max-w-full p-[calc(2*var(--k))] pb-[calc(3*var(--k))]" style={{ background: p.paper, color: p.paperInk }}>
              <img src={photos[active].url} alt={photos[active].alt ?? ""} className="max-h-[68cqh] max-w-full object-contain" draggable={false} />
              {photos[active].caption ? (
                <figcaption className="mt-[calc(2*var(--k))] text-center text-[calc(4.4*var(--k))] leading-tight" style={{ fontFamily: "var(--gift-font-hand)" }}>
                  {photos[active].caption}
                </figcaption>
              ) : null}
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/** One balloon in its place: it floats up on arrival, bobs on its own clock, and the body (never the ribbon) takes the tap. */
function BalloonAt({ index, spot, tone, ribbon, confetti, seed, popped, label, letter, still, reduce, onPop, scopeRef }: { index: number; spot: BalloonSpot; tone: BalloonTone; ribbon: string; confetti: string[]; seed: number; popped: boolean; label: string; letter: boolean; still: boolean; reduce: boolean; onPop: () => void; scopeRef?: React.RefObject<HTMLDivElement | null> }) {
  const width = `calc(${(19 * spot.scale).toFixed(2)} * var(--b))`;
  return (
    <div className="pointer-events-none absolute" style={{ left: `${spot.x}%`, top: `${spot.y}%`, width, translate: "-50% 0", zIndex: letter ? 24 : 10 + Math.round(spot.y / 8) }}>
      <motion.div initial={still ? false : { y: "70cqh", opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 44, damping: 13, delay: 0.25 + index * 0.1 }}>
        <div ref={scopeRef} className="bl-bob" style={{ "--bob": `${spot.bob}s`, animationDelay: `${spot.phase}s` } as CSSProperties}>
          <div className="relative w-full" style={{ aspectRatio: "120 / 250" }}>
            {popped ? (
              <div className="absolute inset-x-0 top-0" style={{ height: "52%" }}>
                <PopShards tone={tone} confetti={confetti} reduce={reduce} />
              </div>
            ) : (
              <>
                <Balloon tone={tone} seed={seed} ribbon={ribbon} className="pointer-events-none absolute inset-0 h-full w-full" style={{ filter: `drop-shadow(0 calc(1.2*var(--k)) calc(1.6*var(--k)) rgba(40,20,30,${letter ? ".32" : ".22"}))` }} />
                <button
                  type="button"
                  data-balloon={index}
                  data-letter={letter ? "" : undefined}
                  aria-label={label}
                  onClick={onPop}
                  className="pointer-events-auto absolute inset-x-0 top-0 outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                  style={{ height: "52%", clipPath: "ellipse(44% 48% at 50% 47%)" }}
                />
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** A polaroid drops from where its balloon was and lands on the floor, a little askew, on top of the ones before it. */
function FallenPolaroid({ photo, from, to, paper, order, reduce, onOpen }: { photo: GiftPhoto; from: BalloonSpot; to: { x: number; y: number; rotate: number }; paper: string; order: number; reduce: boolean; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label={photo.caption || photo.alt || "photo"}
      onClick={onOpen}
      className="absolute left-0 top-0 block w-[calc(23*var(--b))] p-[calc(1.6*var(--k))] pb-[calc(3.4*var(--k))] text-left shadow-[0_18px_30px_-16px_rgba(0,0,0,.55)] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
      style={{ background: paper, zIndex: 5 + order, translate: "-50% -50%" }}
      initial={reduce ? { x: `${to.x}cqw`, y: `${to.y}cqh`, rotate: to.rotate, opacity: 1, scale: 1 } : { x: `${from.x}cqw`, y: `${from.y + 8}cqh`, rotate: 0, opacity: 0, scale: 0.55 }}
      animate={{ x: `${to.x}cqw`, y: `${to.y}cqh`, rotate: to.rotate, opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 1.15, ease: [0.34, 0.02, 0.62, 1], opacity: { duration: 0.25 } }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="aspect-square overflow-hidden bg-[#E9E1D6]">
        <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" />
      </div>
      <span className="mt-[calc(1.4*var(--k))] block truncate text-center text-[calc(3*var(--k))] leading-tight text-[#3A2E2A]" style={{ fontFamily: "var(--gift-font-hand)" }}>
        {photo.caption ?? ""}
      </span>
    </motion.button>
  );
}

function Letter({ data, mode, blocks, photos, palette: p, s, t, reduce, onEvent, onReact, onMakeOne, onReplay, onOpen }: { data: TemplateProps<BalloonsFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; photos: GiftPhoto[]; palette: Palette; s: Copy; t: ReturnType<typeof useGiftStrings>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void; onOpen: (i: number) => void }) {
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
  }, [onEvent, mode]);

  return (
    <motion.div className="absolute inset-0 z-[40] overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={reduce ? { y: 0 } : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%", transition: { duration: 0.35 } }} transition={{ type: "spring", stiffness: 64, damping: 18 }}>
      <div className="flex min-h-full flex-col">
        <div className="shrink-0" style={{ height: mode === "preview" ? "min(56cqh, 520px)" : "min(30cqh, 320px)" }} />
        <div className="relative mx-auto w-[min(94cqw,600px)] flex-1 rounded-t-[calc(4*var(--k))] px-[calc(5*var(--k))] pt-[calc(6*var(--k))] pb-[calc(72px+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,.45)]" style={{ background: p.paper, color: p.paperInk, backgroundImage: PAPER_GRAIN }}>
          {photos.length ? (
            <section className="relative -mx-[calc(5*var(--k))]">
              <p className="mb-[calc(2*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-60">{s.fell}</p>
              {/* the string the polaroids hang from */}
              <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="absolute inset-x-0 top-[calc(5.4*var(--k))] h-[calc(3*var(--k))] w-full" aria-hidden="true">
                <path d="M0 1 Q50 7 100 1" fill="none" stroke={p.kraft} strokeWidth=".6" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="scrollbar-none flex snap-x snap-mandatory gap-[calc(4*var(--k))] overflow-x-auto px-[calc(6*var(--k))] pt-[calc(6*var(--k))] pb-[calc(3*var(--k))]">
                {photos.map((photo, i) => (
                  <motion.button
                    key={photo.id}
                    type="button"
                    aria-label={photo.caption || photo.alt || "photo"}
                    onClick={() => onOpen(i)}
                    className="relative m-0 w-[calc(26*var(--b))] shrink-0 snap-center p-[calc(1.6*var(--k))] pb-[calc(3.6*var(--k))] text-left shadow-[0_16px_26px_-14px_rgba(0,0,0,.5)] outline-none focus-visible:ring-4 focus-visible:ring-black/30"
                    style={{ background: "#FFFDF8", color: "#3A2E2A", rotate: `${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg` }}
                    initial={reduce ? false : { opacity: 0, y: -18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 120, damping: 14 }}
                  >
                    <Peg className="absolute -top-[calc(3.6*var(--k))] left-1/2 h-[calc(6*var(--k))] -translate-x-1/2" />
                    <div className="aspect-square overflow-hidden bg-[#E9E1D6]">
                      <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                    </div>
                    <span className="mt-[calc(1.6*var(--k))] block min-h-[calc(4*var(--k))] truncate text-center text-[calc(3.2*var(--k))] leading-tight" style={{ fontFamily: "var(--gift-font-hand)" }}>
                      {photo.caption ?? ""}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          ) : null}

          <article className="relative mt-[calc(4*var(--k))]">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={p.accent} />
          </article>

          {data.music?.title ? (
            <p className="mt-[calc(6*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.2em] uppercase opacity-55">
              {s.playing} · {data.music.title}
              {data.music.artist ? ` — ${data.music.artist}` : ""}
            </p>
          ) : null}

          {data.countdown ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] p-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ background: p.kraft, color: "#2E2521", backgroundImage: PAPER_GRAIN }}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}

          {data.surprise ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] px-[calc(4*var(--k))] pt-[calc(5*var(--k))] pb-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ background: p.kraft, color: "#2E2521", backgroundImage: PAPER_GRAIN }}>
              <p className="mb-[calc(3*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}

          <div ref={endRef} className="mt-[calc(8*var(--k))]">
            <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
