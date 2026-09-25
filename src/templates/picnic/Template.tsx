"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Easing, type TargetAndTransition, type Transition } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import { giftUnwrapSchema, type GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateEvent, TemplateProps } from "../types";
import { giftString, useGiftStrings } from "../_shared/i18n";
import { useGiftAudio, type GiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString, mulberry32 } from "../_shared/random";
import { buzz } from "../_shared/synth";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { playUnwrap, UnwrapGift } from "../_shared/UnwrapGift";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT } from "../_shared/cover-kit";
import { CollageContext, Lightbox, Polaroid, Scrap } from "../_shared/collage/kit";
import { Ticket } from "../_shared/collage/cards";
import { gingham, ticketNumber, tornPolygon } from "../_shared/collage/paper";
import type { ScrapId } from "../_shared/collage/scraps";
import { Basket } from "./basket";
import { LAWN, Parcel, ThingArt, Wing, WingBody } from "./things";
import { LOOKS, type Look } from "./looks";
import { playCard, playClink, playCreak, playLast, playPop, playRustle } from "./sounds";
import { ART, basketHeight, fillLabels, halfway, MAX_PHOTOS, mouthOf, pileSpot, sequence, stageFor, TAG, type Piece, type Point, type Slot, type Stage } from "./spread";
import { fieldsSchema, type PicnicFields } from "./schema";

type Copy = {
  headline: string;
  tapBasket: string;
  next: string;
  unwrap: string;
  read: string;
  again: string;
  ticket: string;
  forName: string;
  back: string;
  lines: string[];
};

const S: Record<"en" | "es", Copy> = {
  en: {
    headline: "a picnic for two",
    tapBasket: "tap the basket",
    next: "tap for the next thing",
    unwrap: "tap to unwrap it",
    read: "tap to read the note",
    again: "tap to read it again",
    ticket: "ticket to happiness",
    forName: "for {name}",
    back: "Back to the picnic",
    lines: ["the way you eat the strawberries first", "your laugh, especially the snort", "sundays that last all afternoon", "you bring me flowers for no reason", "every plan is better with you in it", "you save me the last bite", "your hand finding mine in the grass", "you, exactly as you are"],
  },
  es: {
    headline: "un pícnic para dos",
    tapBasket: "toca la cesta",
    next: "toca para sacar otra cosa",
    unwrap: "toca para abrirlo",
    read: "toca para leer la nota",
    again: "toca para volver a leerla",
    ticket: "billete a la felicidad",
    forName: "para {name}",
    back: "Volver al pícnic",
    lines: ["cómo te comes las fresas antes que nada", "tu risa, sobre todo el ronquidito", "los domingos que duran toda la tarde", "que me traigas flores sin motivo", "cualquier plan es mejor contigo", "que me guardes el último bocado", "tu mano buscando la mía en la hierba", "tú, tal cual eres"],
  },
};

const KEYFRAMES = `
.pc-bx { transition: translate 1.35s cubic-bezier(.45,.05,.35,1); }
.pc-by { transition: translate 1.35s cubic-bezier(.25,.75,.35,1); }
.pc-wing { transform-origin: 100% 50%; }
.pc-fly .pc-wing { animation: pc-flap .15s ease-in-out 16 alternate, pc-rest 3.4s ease-in-out 2.4s infinite; }
.pc-hover { animation: pc-hover var(--pace, 5s) ease-in-out infinite; }
.pc-pulse { animation: pc-pulse 1.8s ease-in-out infinite; }
@keyframes pc-flap { from { transform: rotateY(4deg) } to { transform: rotateY(70deg) } }
@keyframes pc-rest { 0%, 62%, 100% { transform: rotateY(10deg) } 74% { transform: rotateY(64deg) } 84% { transform: rotateY(16deg) } 90% { transform: rotateY(52deg) } }
@keyframes pc-hover { 0%, 100% { translate: 0 0; rotate: 0deg } 30% { translate: calc(.9 * var(--k)) calc(-1.2 * var(--k)); rotate: 5deg } 65% { translate: calc(-.8 * var(--k)) calc(-.4 * var(--k)); rotate: -4deg } }
@keyframes pc-pulse { 0%, 100% { scale: 1 } 50% { scale: 1.045 } }
@media (prefers-reduced-motion: reduce) { .pc-fly .pc-wing, .pc-hover, .pc-pulse { animation: none; } .pc-bx, .pc-by { transition: none; } }
`;

type Data = TemplateProps<PicnicFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<PicnicFields>) {
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, !preview);
  const [run, setRun] = useState(0);
  return <Picnic key={run} data={data} mode={mode} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : () => setRun((r) => r + 1)} />;
}

type Overlay = null | "unwrap" | "letter";

function Picnic({ data, mode, audio, onEvent, onReact, onMakeOne, onReplay }: { data: Data; mode: TemplateProps["mode"]; audio: GiftAudio; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const preview = mode === "preview";
  const s = S[data.locale] ?? S.en;
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const look = LOOKS[fields.blanket] ?? LOOKS.pink;
  // An old or hand-edited surprise that no longer passes is simply not in the basket.
  const hasPlan = useMemo(() => giftUnwrapSchema.safeParse(data.unwrap).success, [data.unwrap]);
  const labels = useMemo(() => fillLabels(fields.labels, s.lines), [fields.labels, s.lines]);
  const pieces = useMemo(() => sequence(labels, data.photos.length, hasPlan), [labels, data.photos.length, hasPlan]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|picnic`);

  const wide = size.ready && size.width > size.height;
  const stage = stageFor(wide);
  const kPx = size.ready ? (wide ? Math.min((size.width * 0.5) / 100, (size.height * 0.926) / 100) : Math.min(size.width / 100, (size.height * 0.6) / 100)) : 3.9;

  // What is out of the basket. The still frame is always half unpacked; without motion it is all laid out.
  const [opened, setOpened] = useState(preview || reduce);
  const [taken, setTaken] = useState(() => (reduce ? pieces.length : 0));
  const [landed] = useState(() => (reduce ? pieces.length : 0));
  const shown = preview ? halfway(pieces) : Math.min(taken, pieces.length);
  const isOpen = preview || opened;
  const settled = !preview && shown >= pieces.length;
  const [unwrapped, setUnwrapped] = useState(false);
  const [readOnce, setReadOnce] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [photo, setPhoto] = useState<GiftPhoto | null>(null);
  const [burst, setBurst] = useState(0);
  const startedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  const emit = (event: TemplateEvent) => eventRef.current?.(event);

  const latest = pieces[shown - 1];
  const waitingOnParcel = latest?.kind === "parcel" && !unwrapped;

  const openPlan = () => {
    playUnwrap();
    setOverlay("unwrap");
    if (!unwrapped) emit({ type: "surprise" });
  };
  const closePlan = () => {
    setOverlay(null);
    setUnwrapped(true);
  };
  const readNote = () => {
    playRustle(audio.muted);
    setReadOnce(true);
    setOverlay("letter");
    emit({ type: "progress", pct: 92 });
  };

  const advance = () => {
    if (preview || overlay || photo) return;
    if (!startedRef.current) {
      startedRef.current = true;
      void audio.start();
      emit({ type: "started" });
    }
    if (!opened) {
      setOpened(true);
      playCreak(audio.muted);
      buzz(14);
      setBurst((b) => b + 1);
      emit({ type: "progress", pct: 8 });
      return;
    }
    if (waitingOnParcel) return openPlan();
    if (taken < pieces.length) {
      const next = pieces[taken];
      setTaken(taken + 1);
      soundFor(next, taken + 1 === pieces.length, audio.muted);
      buzz(8);
      emit({ type: "progress", pct: Math.round(8 + (80 * (taken + 1)) / pieces.length) });
      return;
    }
    readNote();
  };

  // Space and Enter take the next thing out, wherever focus is, unless it is on a control of its own.
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });
  useEffect(() => {
    if (preview) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advanceRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const pill = !isOpen ? s.tapBasket : waitingOnParcel ? s.unwrap : shown < pieces.length ? s.next : readOnce ? s.again : s.read;
  const photos = data.photos.slice(0, MAX_PHOTOS);
  const nPhotos = pieces.filter((p) => p.kind === "photo").length;
  const context = useMemo(() => ({ container: null, still: preview || reduce, unit: kPx }), [preview, reduce, kPx]);
  const t = useGiftStrings(data.locale);

  // Where everything sits on the canvas, once per layout.
  const places = useMemo(() => pieces.map((piece) => placeOf(piece, stage, nPhotos, seed)), [pieces, stage, nPhotos, seed]);
  const perched = useMemo(() => butterflyTargets(pieces, places, shown, stage), [pieces, places, shown, stage]);
  const rootVars = {
    "--k": wide ? "min(0.5cqw, 0.926cqh)" : "min(1cqw, 0.6cqh)",
    "--p": "var(--k)",
  } as CSSProperties;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ ...rootVars, color: look.ink, fontFamily: "var(--gift-font-body)", backgroundColor: "#6FA64B" }}>
      <style>{KEYFRAMES}</style>
      <Meadow />

      <CollageContext.Provider value={context}>
        {/* The canvas: everything on the blanket, laid out in k and centred. */}
        <div className="absolute top-1/2 left-1/2" style={{ width: `calc(${stage.w} * var(--k))`, height: `calc(${stage.h} * var(--k))`, translate: "-50% -50%" }}>
          <Blanket stage={stage} look={look} seed={seed} />
          <Edges stage={stage} look={look} used={labels.length} />

          <motion.div className="absolute z-[5]" style={{ left: `calc(${stage.basket.x - stage.basket.w / 2} * var(--k))`, top: `calc(${stage.basket.top} * var(--k))`, width: `calc(${stage.basket.w} * var(--k))`, height: `calc(${basketHeight(stage.basket.w)} * var(--k))`, transformOrigin: "50% 70%" }} initial={false} animate={{ scale: isOpen ? 1 : wide ? 1.5 : 1.42, y: isOpen ? 0 : `${wide ? 4 : 12}%` }} transition={{ type: "spring", stiffness: 90, damping: 16 }}>
            <Basket open={isOpen} lining={{ cloth: look.cloth, check: look.check }} still={preview || reduce} className="absolute inset-0 h-full w-full" />
          </motion.div>

          {/* Each thing's tag is read out as it is set down: the things are the live region. */}
          <div className="absolute inset-0" aria-live={preview ? undefined : "polite"} aria-relevant="additions">
            {pieces.slice(0, shown).map((piece, i) => (
              <Placed key={keyOf(piece, i)} at={places[i]} from={mouthOf(stage)} spot={stage.spot} kPx={kPx} fly={i >= landed && !preview && !reduce} z={10 + i}>
                <PieceArt piece={piece} look={look} data={data} photos={photos} s={s} seed={seed} stage={stage} still={preview || reduce} pulse={i === shown - 1 && (piece.kind === "note" || (piece.kind === "parcel" && !unwrapped)) && !preview} />
              </Placed>
            ))}
          </div>

          <AnimatePresence>
            {!isOpen ? (
              <motion.div key="header" className="absolute z-[55]" style={{ left: `calc(${stage.header.x} * var(--k))`, top: `calc(${stage.header.y} * var(--k))`, translate: "-50% -50%" }} initial={reduce ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14, transition: { duration: 0.35 } }} transition={{ delay: 0.15, duration: 0.7 }}>
                <Header data={data} headline={data.title?.trim() || s.headline} look={look} seed={seed} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-0 z-[50]">
            {look.butterflies.map((wings, b) => (
              <Butterfly key={b} at={perched[b].at} delay={perched[b].delay} flights={perched[b].flights} heading={perched[b].heading} wings={wings} size={[11.5, 10, 9][b]} still={preview || reduce} pace={4.4 + b * 1.3} />
            ))}
          </div>

          {!preview ? (
            <div className="pointer-events-none absolute inset-x-0 z-[56] flex justify-center" style={{ top: `calc(${stage.pill} * var(--k))`, translate: "0 -50%" }}>
              <motion.p key={pill} aria-hidden="true" className="max-w-[calc(92*var(--k))] truncate rounded-full px-[calc(4.4*var(--k))] py-[calc(1.7*var(--k))] text-center text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.2em] uppercase backdrop-blur-sm" style={{ background: "rgba(255,255,255,.88)", color: look.accent, boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(40,60,20,.25)" }} initial={{ opacity: 0, y: 6 }} animate={overlay ? { opacity: 0 } : { opacity: 1, y: 0, scale: reduce ? 1 : [1, 1.05, 1] }} transition={{ opacity: { delay: isOpen ? 0.2 : 1, duration: 0.4 }, y: { duration: 0.4 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
                {pill}
              </motion.p>
            </div>
          ) : null}
        </div>

        {/* One big button over the scene: every tap takes the next thing out. */}
        {!preview ? <button type="button" onClick={advance} aria-label={pill} data-testid="picnic-scene" className="absolute inset-0 z-[30] cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset [-webkit-tap-highlight-color:transparent]" /> : null}

        {/* Once everything is out, the photos, the parcel and the note answer a tap of their own. */}
        {settled ? (
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-[34]" style={{ width: `calc(${stage.w} * var(--k))`, height: `calc(${stage.h} * var(--k))`, translate: "-50% -50%" }}>
            {pieces.map((piece, i) => {
              const at = places[i];
              if (piece.kind === "photo" && photos[piece.photo]) {
                const p = photos[piece.photo];
                return <Hotspot key={keyOf(piece, i)} at={at} w={stage.polaroid} h={stage.polaroid * 1.24} label={p.caption || p.alt || "photo"} onPress={() => setPhoto(p)} testId="picnic-photo" />;
              }
              if (piece.kind === "parcel") return <Hotspot key="parcel" at={at} w={20} h={19} label={giftString(data.locale, "unwrapLabel", { sender: data.senderName })} onPress={openPlan} />;
              if (piece.kind === "note") return <Hotspot key="note" at={at} w={26} h={18} label={s.read} onPress={readNote} testId="picnic-note" />;
              return null;
            })}
          </div>
        ) : null}
      </CollageContext.Provider>

      <div className="pointer-events-none absolute inset-0 z-[36]" aria-hidden="true">
        <Ambience layers={[{ kind: "petals", colors: look.petals, count: 9 }]} opacity={0.75} />
      </div>
      <Confetti burst={burst} colors={look.confetti} count={70} origin={confettiOrigin(stage, size, kPx)} className="pointer-events-none absolute inset-0 z-[37]" />

      <AnimatePresence>
        {overlay === "letter" ? <Letter key="letter" data={data} mode={mode} look={look} back={s.back} onBack={() => setOverlay(null)} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /> : null}
        {overlay === "unwrap" && data.unwrap ? <PlanSheet key="plan" data={data} onClose={closePlan} /> : null}
        {photo ? <Lightbox key="photo" photo={photo} onClose={() => setPhoto(null)} closeLabel={t("close")} /> : null}
      </AnimatePresence>

      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Where things go                                                                             */
/* ------------------------------------------------------------------------------------------ */

const keyOf = (piece: Piece, i: number) => (piece.kind === "thing" ? `t-${piece.thing}` : piece.kind === "photo" ? `p-${piece.photo}` : `${piece.kind}-${i}`);

function placeOf(piece: Piece, stage: Stage, photos: number, seed: number): Slot {
  if (piece.kind === "thing") return stage.slots[piece.slot];
  if (piece.kind === "photo") return pileSpot(stage.pile, piece.photo, photos, seed);
  return piece.kind === "parcel" ? stage.parcel : stage.note;
}

/** Where a butterfly sits on a thing: towards its top right corner. */
function perchOn(piece: Piece, at: Slot, stage: Stage): Point {
  if (piece.kind === "thing") {
    const art = ART[piece.thing];
    // On the ticket's stub, clear of its words.
    if (piece.thing === "ticket") return { x: at.x + art.w * 0.44, y: at.y - art.w * art.ratio * 0.62 };
    return { x: at.x + art.w * 0.2, y: at.y - art.w * art.ratio * 0.34 };
  }
  if (piece.kind === "photo") return { x: at.x + stage.polaroid * 0.34, y: at.y - stage.polaroid * 0.5 };
  return piece.kind === "note" ? { x: at.x + 14, y: at.y - 10 } : { x: at.x + 9, y: at.y - 9 };
}

type Perch = { at: Point; delay: number; flights: number; heading: number };

/**
 * Where the three butterflies are: each thing that comes out is claimed by the next butterfly in
 * turn, which leaves wherever it was and lands on it once it has been set down.
 */
function butterflyTargets(pieces: readonly Piece[], places: readonly Slot[], shown: number, stage: Stage): Perch[] {
  return [0, 1, 2].map((b) => {
    let mine = -1;
    let before = -1;
    for (let i = 0; i < shown; i++)
      if (i % 3 === b) {
        before = mine;
        mine = i;
      }
    const home = stage.perches[b];
    if (mine < 0) return { at: home, delay: 0, flights: 0, heading: [-24, 18, 32][b] };
    const at = perchOn(pieces[mine], places[mine], stage);
    const from = before < 0 ? home : perchOn(pieces[before], places[before], stage);
    const heading = (Math.atan2(at.y - from.y, at.x - from.x) * 180) / Math.PI + 90;
    return { at, delay: mine === shown - 1 ? 1.25 : 0, flights: mine + 1, heading: Math.round(((heading + 540) % 360) - 180) };
  });
}

function confettiOrigin(stage: Stage, size: { width: number; height: number; ready: boolean }, kPx: number) {
  if (!size.ready) return { x: 0.5, y: 0.5 };
  const mouth = mouthOf(stage);
  const left = (size.width - stage.w * kPx) / 2;
  const top = (size.height - stage.h * kPx) / 2;
  return { x: (left + mouth.x * kPx) / size.width, y: (top + mouth.y * kPx) / size.height };
}

function soundFor(piece: Piece, last: boolean, muted: boolean) {
  if (last) return playLast(muted);
  if (piece.kind === "photo") return playCard(muted);
  if (piece.kind === "parcel" || piece.kind === "note") return playRustle(muted);
  if (piece.thing === "lemonade" || piece.thing === "jam") return playClink(muted);
  if (piece.thing === "tulips" || piece.thing === "ticket") return playRustle(muted);
  return playPop(muted);
}

/* ------------------------------------------------------------------------------------------ */
/* A thing on the blanket                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * A thing at its place. The first time it appears it comes out of the basket, is held up big
 * for a moment so its tag can be read, then is set down where it belongs. The flight is worked
 * out once, when it appears, so a resize later never plays it again.
 */
type Flight = { initial: false | TargetAndTransition; animate: TargetAndTransition; transition?: Transition };

/** Out of the basket, up into the light, then down where it belongs. */
const OUT: Easing[] = [[0.2, 0.9, 0.3, 1], "linear", [0.55, 0, 0.25, 1]];

function Placed({ at, from, spot, kPx, fly, z, children }: { at: Slot; from: Point; spot: Stage["spot"]; kPx: number; fly: boolean; z: number; children: ReactNode }) {
  const [motionProps] = useState((): Flight => {
    if (!fly) return { initial: false, animate: { x: 0, y: 0, scale: 1, rotate: at.rotate, opacity: 1 } };
    const dx = (from.x - at.x) * kPx;
    const dy = (from.y - at.y) * kPx;
    const sx = (spot.x - at.x) * kPx;
    const sy = (spot.y - at.y) * kPx;
    return {
      initial: { x: dx, y: dy, scale: 0.2, rotate: at.rotate - 24, opacity: 0 },
      animate: { x: [dx, sx, sx, 0], y: [dy, sy, sy, 0], scale: [0.2, spot.scale, spot.scale, 1], rotate: [at.rotate - 24, 0, 0, at.rotate], opacity: [0, 1, 1, 1] },
      transition: { duration: 2.35, times: [0, 0.24, 0.64, 1], ease: OUT },
    };
  });
  return (
    <div className="absolute h-0 w-0" style={{ left: `calc(${at.x} * var(--k))`, top: `calc(${at.y} * var(--k))`, zIndex: z }}>
      <motion.div className="absolute top-0 left-0 h-0 w-0" {...motionProps}>
        {children}
      </motion.div>
    </div>
  );
}

function PieceArt({ piece, look, data, photos, s, seed, stage, still, pulse }: { piece: Piece; look: Look; data: Data; photos: GiftPhoto[]; s: Copy; seed: number; stage: Stage; still: boolean; pulse: boolean }) {
  if (piece.kind === "photo") {
    const p = photos[piece.photo];
    return (
      <Centered w={stage.polaroid}>
        <Polaroid photo={p} lip={8.4} pattern={gingham(look.check, "calc(1.1*var(--k))")} still={still}>
          {p?.caption ? (
            <span className="line-clamp-2 max-w-full leading-[1.05]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(2.8 * var(--k))", color: "#3A2A2E" }}>
              {p.caption}
            </span>
          ) : null}
        </Polaroid>
      </Centered>
    );
  }
  if (piece.kind === "note") {
    return (
      <Centered w={26} className={cn(pulse && "pc-pulse")}>
        <Note name={s.forName.replace("{name}", data.recipientName)} look={look} />
      </Centered>
    );
  }
  if (piece.kind === "parcel") {
    return (
      <Centered w={20} className={cn(pulse && "pc-pulse")}>
        <Parcel satin={look.satin} className="block h-auto w-full drop-shadow-[0_calc(.7*var(--k))_calc(1*var(--k))_rgba(50,30,20,.35)]" />
        <p className="absolute top-full left-1/2 mt-[calc(.4*var(--k))] w-max -translate-x-1/2 rounded-[calc(.6*var(--k))] px-[calc(1.6*var(--k))] py-[calc(.5*var(--k))] text-[calc(3.2*var(--k))] leading-none" style={{ fontFamily: "var(--gift-font-hand)", backgroundColor: "#FFFDF6", backgroundImage: PAPER_GRAIN, color: look.ink, rotate: "-4deg", boxShadow: "0 calc(.4*var(--k)) calc(.8*var(--k)) rgba(40,20,10,.25)" }}>
          {giftString(data.locale, "unwrapOneMore")}
        </p>
      </Centered>
    );
  }
  const art = ART[piece.thing];
  const h = art.w * art.ratio;
  return (
    <>
      <Centered w={art.w}>
        {piece.thing === "ticket" ? (
          <Ticket line={s.ticket} number={ticketNumber(seed)} paper={look.ticket.paper} ink={look.ticket.ink} font={POSTER_FONT} />
        ) : (
          <ThingArt thing={piece.thing} look={look} className="block h-auto w-full drop-shadow-[0_calc(.7*var(--k))_calc(.9*var(--k))_rgba(50,30,20,.32)]" />
        )}
      </Centered>
      <Tag label={piece.label} look={look} paper={TAG_PAPER[piece.slot % TAG_PAPER.length] ?? look.blush} top={h / 2 - 1.5} tilt={piece.slot % 2 ? 3 : -3} counter={-(stage.slots[piece.slot]?.rotate ?? 0)} />
    </>
  );
}

/** A box centred on its parent's origin, `w` wide. */
function Centered({ w, className, children }: { w: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn("absolute top-0 left-0", className)} style={{ width: `calc(${w} * var(--k))`, translate: "-50% -50%" }}>
      {children}
    </div>
  );
}

/** Cream, kraft and the blanket's own tint, in turn, so the tags read as a handful rather than a row of labels. */
const TAG_PAPER: (string | undefined)[] = ["#FFFDF6", "#EFDDC2", undefined, "#FFFDF6", "#EFDDC2", undefined, "#FFFDF6", "#EFDDC2"];

/** The tag a thing carries, on a bit of twine: one of the sender's lines, in handwriting. */
function Tag({ label, look, paper, top, tilt, counter }: { label: string; look: Look; paper: string; top: number; tilt: number; counter: number }) {
  return (
    <div className="absolute left-0" style={{ top: `calc(${top} * var(--k))`, width: `calc(${TAG.w} * var(--k))`, translate: "-50% 0", rotate: `${counter + tilt}deg`, transformOrigin: "50% 0" }}>
      <span aria-hidden="true" className="absolute left-1/2 block w-[calc(.35*var(--k))] -translate-x-1/2 rounded-full" style={{ top: "calc(-2.4 * var(--k))", height: "calc(4.4 * var(--k))", background: "#B08560" }} />
      <p className="relative mx-auto w-fit max-w-full text-center font-semibold text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: `calc(${TAG.size} * var(--k))`, lineHeight: TAG.line / TAG.size, padding: `calc(${TAG.pad + 0.7} * var(--k)) calc(1.8 * var(--k)) calc(${TAG.pad - 0.4} * var(--k))`, color: look.ink, backgroundColor: paper, backgroundImage: PAPER_GRAIN, clipPath: "polygon(10% 0, 90% 0, 100% 22%, 100% 100%, 0 100%, 0 22%)", filter: "drop-shadow(0 calc(.4*var(--k)) calc(.6*var(--k)) rgba(40,20,10,.28))" }}>
        <span aria-hidden="true" className="absolute top-[calc(.9*var(--k))] left-1/2 block size-[calc(1.3*var(--k))] -translate-x-1/2 rounded-full" style={{ background: "rgba(90,60,40,.3)", boxShadow: "inset 0 calc(.15*var(--k)) calc(.25*var(--k)) rgba(0,0,0,.35)" }} />
        {label}
      </p>
    </div>
  );
}

/** The folded note: their name on the front, a wax seal where it closes. */
function Note({ name, look }: { name: string; look: Look }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "1.45", filter: "drop-shadow(0 calc(.8*var(--k)) calc(1.2*var(--k)) rgba(50,30,20,.32))" }}>
      <div className="absolute inset-0 rounded-[calc(.6*var(--k))]" style={{ backgroundColor: "#FFFBF2", backgroundImage: PAPER_GRAIN }} />
      <div className="absolute inset-x-0 top-0 h-[54%] rounded-t-[calc(.6*var(--k))]" style={{ background: "linear-gradient(180deg, #FFFDF8, #F4ECDD)", boxShadow: "0 calc(.3*var(--k)) calc(.5*var(--k)) rgba(60,40,20,.18)" }} />
      <div className="absolute inset-x-[8%] top-[64%] flex flex-col gap-[calc(1.1*var(--k))] opacity-40" aria-hidden="true">
        {[86, 70, 78].map((w) => (
          <span key={w} className="block h-px" style={{ width: `${w}%`, background: look.ink }} />
        ))}
      </div>
      <p className="absolute inset-x-[6%] top-[9%] truncate text-center text-[calc(3.9*var(--k))] leading-[1.25]" style={{ fontFamily: SCRIPT_FONT, color: look.ink }}>
        {name}
      </p>
      <div className="absolute top-[54%] left-1/2 w-[26%] -translate-x-1/2 -translate-y-1/2">
        <Scrap id="wax-seal" width="100%" eager />
      </div>
    </div>
  );
}

/** The words at the top before anything is out: who it's from, and what it is. */
function Header({ data, headline, look, seed }: { data: Data; headline: string; look: Look; seed: number }) {
  return (
    <div className="relative w-max max-w-[calc(78*var(--k))] px-[calc(6*var(--k))] pt-[calc(2.6*var(--k))] pb-[calc(3*var(--k))] text-center" style={{ filter: "drop-shadow(0 calc(.6*var(--k)) calc(1.2*var(--k)) rgba(40,30,20,.25))" }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: "#FFFDF6", backgroundImage: PAPER_GRAIN, clipPath: tornPolygon(seed + 3, { top: true, bottom: true, left: true, right: true }, 3.2, 22) }} />
      <span aria-hidden="true" className="absolute -top-[calc(1.4*var(--k))] left-[calc(8*var(--k))] block h-[calc(3.6*var(--k))] w-[calc(13*var(--k))] -rotate-6" style={{ background: look.satin.light, opacity: 0.85 }} />
      <span aria-hidden="true" className="absolute -right-[calc(3*var(--k))] -bottom-[calc(2.6*var(--k))] block w-[calc(8.5*var(--k))] rotate-12">
        <Scrap id="star-glossy" eager />
      </span>
      <p className="relative text-[calc(2.5*var(--k))] font-semibold tracking-[0.3em] uppercase opacity-60">
        {data.senderName} → {data.recipientName}
      </p>
      <h1 className="relative mt-[calc(1*var(--k))] text-[calc(6.4*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, color: look.accent }}>
        {headline}
      </h1>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The meadow and the blanket                                                                  */
/* ------------------------------------------------------------------------------------------ */

function Meadow() {
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(40% 30% at 18% 22%, rgba(150,200,100,.55), transparent 70%), radial-gradient(35% 28% at 82% 70%, rgba(150,200,100,.45), transparent 70%), radial-gradient(45% 30% at 70% 12%, rgba(40,90,30,.35), transparent 70%), radial-gradient(40% 32% at 25% 88%, rgba(40,90,30,.35), transparent 70%), radial-gradient(120% 90% at 50% 45%, #82B85A 0%, #6BA348 55%, #558A38 100%)" }}>
      <div className="absolute inset-0" style={{ backgroundImage: LAWN.coarse, backgroundSize: "calc(41 * var(--k)) calc(41 * var(--k))", opacity: 0.85 }} />
      <div className="absolute inset-0" style={{ backgroundImage: LAWN.fine, backgroundSize: "calc(24 * var(--k)) calc(24 * var(--k))", backgroundPosition: "calc(9 * var(--k)) calc(5 * var(--k))" }} />
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.5 }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(90% 70% at 50% 50%, transparent 55%, rgba(30,60,15,.35))" }} />
    </div>
  );
}

function Blanket({ stage, look, seed }: { stage: Stage; look: Look; seed: number }) {
  const b = stage.blanket;
  const random = mulberry32(seed + 5);
  // Where the cloth rucks up a little: soft light and shade laid across it.
  const folds = Array.from({ length: 3 }, () => ({ at: Math.round(18 + random() * 64), angle: Math.round(100 + random() * 60) }));
  return (
    <div aria-hidden="true" className="absolute z-[1]" style={{ left: `calc(${b.x - b.w / 2} * var(--k))`, top: `calc(${b.y - b.h / 2} * var(--k))`, width: `calc(${b.w} * var(--k))`, height: `calc(${b.h} * var(--k))`, rotate: `${b.rotate}deg`, boxShadow: "0 calc(1.2*var(--k)) calc(3*var(--k)) rgba(20,45,10,.4)", borderRadius: "calc(.8*var(--k))", backgroundColor: look.cloth, ...gingham(look.band, "calc(3.6*var(--k))") }}>
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.14) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(120,60,60,.05) 0 1px, transparent 1px 3px)" }} />
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.55 }} />
      <div className="absolute inset-0" style={{ background: folds.map((f) => `linear-gradient(${f.angle}deg, transparent ${f.at - 7}%, rgba(255,255,255,.22) ${f.at - 2}%, rgba(80,40,40,.08) ${f.at + 3}%, transparent ${f.at + 9}%)`).join(", ") }} />
      <div className="absolute inset-0 rounded-[inherit]" style={{ boxShadow: `inset 0 0 0 calc(1.6*var(--k)) ${look.hem}` }} />
      <div className="absolute inset-[calc(.8*var(--k))] rounded-[calc(.4*var(--k))] border-dashed" style={{ borderWidth: "calc(.3*var(--k))", borderColor: look.stitch }} />
    </div>
  );
}

type Decor = { id: ScrapId; x: number; y: number; w: number; rotate: number; tint?: boolean };

/** Cut-outs round the edges, and in any place on the blanket no thing is coming to. */
function Edges({ stage, look, used }: { stage: Stage; look: Look; used: number }) {
  const b = stage.blanket;
  const left = b.x - b.w / 2;
  const right = b.x + b.w / 2;
  const top = b.y - b.h / 2;
  const bottom = b.y + b.h / 2;
  const corners: Decor[] = [
    { id: "sakura", x: left + 1, y: top + 3, w: 13, rotate: -12 },
    { id: "blossom-pale", x: right - 2, y: top + 1, w: 11, rotate: 18 },
    { id: "blossom-gold", x: left + 2, y: bottom - 1, w: 12, rotate: 24 },
    { id: "sakura", x: right - 1, y: bottom - 3, w: 10, rotate: -30 },
  ];
  const spare: Decor[][] = [
    [],
    [],
    [],
    [
      { id: "blossom-pale", x: -3, y: 4, w: 12, rotate: 10 },
      { id: "star-glossy-small", x: 7, y: -4, w: 7, rotate: -12 },
    ],
    [
      { id: "bow-gingham", x: 0, y: 2, w: 14, rotate: 14, tint: true },
      { id: "sakura", x: 7, y: 10, w: 8, rotate: -20 },
    ],
    [
      { id: "heart-print-pink", x: -2, y: 2, w: 9, rotate: -10 },
      { id: "blossom-gold", x: 6, y: 10, w: 9, rotate: 16 },
    ],
    [
      { id: "blossom-gold", x: -4, y: 0, w: 11, rotate: 8 },
      { id: "sakura", x: 5, y: 7, w: 9, rotate: -24 },
      { id: "star-glossy", x: 7, y: -6, w: 7.5, rotate: 16 },
    ],
    [
      { id: "sakura", x: -2, y: 3, w: 11, rotate: 30 },
      { id: "blossom-pale", x: 7, y: 9, w: 8, rotate: -8 },
      { id: "star-glossy-small", x: -8, y: -5, w: 6, rotate: -20 },
    ],
  ];
  const decor = [...corners, ...stage.slots.flatMap((slot, i) => (i < used ? [] : (spare[i] ?? []).map((d) => ({ ...d, x: slot.x + d.x, y: slot.y + d.y }))))];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2]">
      {decor.map((d, i) => (
        <div key={i} className="absolute" style={{ left: `calc(${d.x} * var(--k))`, top: `calc(${d.y} * var(--k))`, width: `calc(${d.w} * var(--k))`, translate: "-50% -50%", rotate: `${d.rotate}deg` }}>
          <Scrap id={d.id} eager style={d.tint ? { filter: look.tint } : undefined} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Butterflies                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * A butterfly that flies to `at` whenever it changes: across in one easing, down in another, so
 * the path curves. Its wings beat hard for the flight and then rest, opening and closing now and
 * then. A new flight remounts the wings, which starts their beating over.
 */
function Butterfly({ at, delay, flights, heading, wings, size, still, pace }: { at: Point; delay: number; flights: number; heading: number; wings: Look["butterflies"][number]; size: number; still: boolean; pace: number }) {
  return (
    <div className="pc-bx absolute top-0 left-0" style={{ translate: `calc(${at.x} * var(--k)) 0`, transitionDelay: `${delay}s` }}>
      <div className="pc-by" style={{ translate: `0 calc(${at.y} * var(--k))`, transitionDelay: `${delay}s` }}>
        <div className={cn(!still && "pc-hover")} style={{ ["--pace" as string]: `${pace}s` }}>
          <div style={{ width: `calc(${size} * var(--k))`, height: `calc(${size * 0.84} * var(--k))`, translate: "-50% -50%", rotate: `${heading}deg`, transition: still ? undefined : `rotate .6s ease ${delay}s`, filter: "drop-shadow(0 calc(1.6*var(--k)) calc(.8*var(--k)) rgba(30,40,20,.3))" }}>
            <div key={flights} className={cn("relative h-full w-full", !still && "pc-fly")} style={{ perspective: `calc(${size * 3} * var(--k))` }}>
              <div className="pc-wing absolute top-0 left-0 h-full w-1/2">
                <Wing wings={wings} />
              </div>
              <div className="pc-wing absolute top-0 left-0 h-full w-1/2" style={{ scale: "-1 1" }}>
                <Wing wings={wings} />
              </div>
              <div className="absolute inset-y-0 left-1/2 w-[12%] -translate-x-1/2">
                <WingBody />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Hotspots, the letter and the plan                                                           */
/* ------------------------------------------------------------------------------------------ */

function Hotspot({ at, w, h, label, onPress, testId }: { at: Slot; w: number; h: number; label: string; onPress: () => void; testId?: string }) {
  return (
    <button type="button" onClick={onPress} aria-label={label} data-testid={testId} className="pointer-events-auto absolute rounded-[calc(1*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/80" style={{ left: `calc(${at.x - w / 2} * var(--k))`, top: `calc(${at.y - h / 2} * var(--k))`, width: `calc(${w} * var(--k))`, height: `calc(${h} * var(--k))`, rotate: `${at.rotate}deg` }} />
  );
}

/** The note, unfolded: the letter, then what else came with it, then the end. */
function Letter({ data, mode, look, back, onBack, onEvent, onReact, onMakeOne, onReplay }: { data: Data; mode: TemplateProps["mode"]; look: Look; back: string; onBack: () => void; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  // The rest waits for the last word, so nothing below competes with the typing.
  const [done, setDone] = useState(blocks.length === 0);
  const endRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    let ended = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!ended && entries.some((e) => e.isIntersecting)) {
          ended = true;
          eventRef.current?.({ type: "progress", pct: 100 });
          eventRef.current?.({ type: "ended" });
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode, done]);
  // The date came out of the basket already: the end screen doesn't wrap it up a second time.
  const ending = useMemo(() => ({ ...data, unwrap: undefined }), [data]);
  const paper: CSSProperties = { backgroundColor: "#FFFCF5", backgroundImage: PAPER_GRAIN, color: look.ink };

  return (
    <motion.div className="absolute inset-0 z-[38]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="absolute inset-0 bg-[#1d2a12]/55 backdrop-blur-[2px]" />
      <div data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
        <motion.div className="relative mx-auto flex w-[min(90cqw,560px)] flex-col gap-[calc(5*var(--u))] pt-[max(11cqh,64px)] pb-[calc(72px+env(safe-area-inset-bottom))]" initial={{ y: 60, scaleY: 0.92, opacity: 0 }} animate={{ y: 0, scaleY: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 110, damping: 18 }} style={{ transformOrigin: "50% 0" }}>
          <article className="relative rounded-[3px] px-[calc(6*var(--u))] pt-[calc(9*var(--u))] pb-[calc(8*var(--u))] shadow-[0_1px_2px_rgba(0,0,0,0.2),0_30px_50px_-24px_rgba(0,0,0,0.6)]" style={paper}>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[calc(3.2*var(--u))] rounded-t-[3px]" style={{ backgroundColor: look.cloth, ...gingham(look.check, "calc(1.6*var(--u))") }} />
            <span aria-hidden="true" className="absolute top-[calc(1.2*var(--u))] left-1/2 block h-[calc(4*var(--u))] w-[calc(18*var(--u))] -translate-x-1/2 rotate-[-3deg]" style={{ background: look.satin.light, opacity: 0.9 }} />
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={look.accent} onDone={() => setDone(true)} />
          </article>
          {done && data.countdown ? (
            <div className="rounded-[3px] p-[calc(5*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]" style={paper}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}
          {done && data.surprise ? (
            <div className="relative rounded-[3px] px-[calc(5*var(--u))] pt-[calc(6*var(--u))] pb-[calc(5*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]" style={{ ...paper, rotate: "0.6deg" }}>
              <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}
          {done ? (
            <motion.div ref={endRef} className="rounded-[3px] px-[calc(3*var(--u))] py-[calc(6*var(--u))] shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]" style={paper} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
              <EndScreen data={ending} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
            </motion.div>
          ) : null}
        </motion.div>
      </div>
      <button type="button" onClick={onBack} aria-label={back} className="absolute top-[max(0.75rem,var(--gift-safe-top,env(safe-area-inset-top)))] left-3 z-[2] grid size-11 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md hover:bg-black/50">
        <ArrowLeft className="size-5" />
      </button>
    </motion.div>
  );
}

/** The date that was in the parcel, unwrapped over the blanket. */
function PlanSheet({ data, onClose }: { data: Data; onClose: () => void }) {
  const closer = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    closer.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <motion.div className="absolute inset-0 z-[38] bg-[#140c10]/80 text-white backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} role="dialog" aria-modal="true" aria-label={giftString(data.locale, "unwrapOneMore")} data-testid="picnic-plan">
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full flex-col items-center justify-center px-5 pt-14 pb-10">
          <UnwrapGift unwrap={data.unwrap} locale={data.locale} sender={data.senderName} accent={data.accentColor} dark autoOpen />
        </div>
      </div>
      <button ref={closer} type="button" onClick={onClose} aria-label={giftString(data.locale, "unwrapClose")} className="absolute top-3 left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20">
        <X className="size-5" />
      </button>
    </motion.div>
  );
}

