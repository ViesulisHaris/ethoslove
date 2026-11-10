"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playJingle, playRustle, playScribble, playSparkle, playStamp, playWhoosh } from "../_shared/night/sfx";
import { MUSIC_CEILING, RENDER_LAG_S } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES, FOIL_ON_LIGHT } from "../_shared/holiday/materials";
import { HolidayPage, Print, type HolidayTheme, type PhotoSlot } from "../_shared/holiday/page";
import { down, laid, Plate, Sparks, Sprite, STAGE, STAGE_KEYFRAMES, type Point } from "../_shared/holiday/stage";
import { InkStamp, Tick } from "./art";
import { ANCHORS, ART_BASE, BULBS, SHEETS, SPRITES } from "./art-map";
import { LOOKS, type Look, type LookId } from "./looks";
import { entries, hitTimes, readVerdict, reviewYear, STAMP_GAP_S, STAMP_HIT, STAMP_S, stamps, unrollSeconds, type Entry, type Ink, type Verdict } from "./review";
import { fieldsSchema, type NiceListFields } from "./schema";

const S = {
  en: {
    title: "the results are in",
    untie: "untie the ribbon",
    pull: "pull it down",
    read: "read the letter",
    office: "north pole · official review",
    list: "The Nice List",
    matter: "{year} · in the matter of {name}",
    nice: "nice",
    naughty: "naughty",
    checked: "checked: twice",
    verdict: "verdict",
    presents: { nice: "Presents: approved.", naughty: "Presents: approved anyway.", both: "Presents: approved. Obviously." } as Record<Verdict, string>,
    signed: "signed, {name} (head elf)",
    fallback: { nice: "being you, generally", naughty: "nothing we could prove" },
    note: "a note from {name}",
    gallery: "the evidence",
    tag: "for {name}",
  },
  es: {
    title: "ya hay veredicto",
    untie: "desata el lazo",
    pull: "tira hacia abajo",
    read: "lee la carta",
    office: "polo norte · revisión oficial",
    list: "La lista de Papá Noel",
    matter: "{year} · expediente de {name}",
    nice: "bien",
    naughty: "mal",
    checked: "revisado: dos veces",
    verdict: "veredicto",
    presents: { nice: "Regalos: aprobados.", naughty: "Regalos: aprobados igualmente.", both: "Regalos: aprobados. Faltaría más." } as Record<Verdict, string>,
    signed: "firmado: {name}, de parte de los elfos",
    fallback: { nice: "ser como eres, en general", naughty: "nada que se pueda demostrar" },
    note: "una nota de {name}",
    gallery: "las pruebas",
    tag: "para {name}",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

/** tied: the scroll with its ribbon. ready: untied, waiting to be pulled. unrolling: coming down. unrolled: all of it showing. stamping: the verdict going on. stamped: done. open: the letter. */
type Phase = "tied" | "ready" | "unrolling" | "unrolled" | "stamping" | "stamped" | "open";

/*
 * The scroll, in stage units (100 across, 170 down). Its pictures are rendered with the roll right
 * under the rod. The paper's picture starts at PAPER.y and the roll's middle is H0 below that, so
 * that much of the paper is always out (and hidden under the two). Pulled, the roll goes down and
 * the window on the paper grows with it: the paper's cut edge is always under the roll's middle.
 */
const PAPER = SPRITES.paper;
const ROLL = SPRITES.roll;
const H0 = ANCHORS.roll.y - PAPER.y;
/** Half the roll's thickness as it is seen: what is written is out once the roll's top edge has passed it. */
const ROLL_HALF = 4.4;
/** The most of the paper the words may take, from the top of its picture: past this they are drawn smaller. */
const ROOM = 105;
/** The paper's picture has its shadow in it, more of it on the right: what is written keeps clear of both. */
const PAPER_PAD = { left: SHEETS.letter.inset.left * PAPER.w + 5, right: SHEETS.letter.inset.right * PAPER.w + 5 };
/** How far down the desk the tied scroll waits, before it is untied and goes up to be unrolled. */
const TIED_DROP = 44;
/** The brass clip on a photo: how far down its picture the sheet it holds begins. */
const CLIP_EDGE = (ANCHORS.clipEdge.y - SPRITES.clip.y) / SPRITES.clip.h;
/** The stamp was drawn standing on the red pad, which is turned one way; the green pad is turned the other. */
const GREEN_PAD_TURN = 15;

export const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "red";
};
const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof NiceListFields, unknown>>;
  return { verdict: readVerdict(raw.verdict), look: readLook(fields), nice: raw.nice as unknown[] | undefined, naughty: raw.naughty as unknown[] | undefined };
};

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-${size}`, "paper", "rod", "roll", `ribbon-${LOOKS[lookId].ribbon}`, "tag", "stamp", "seal"];
  const letter = [`soft-${lookId}-${size}`, "sheet-letter-top", "sheet-letter-mid", "sheet-letter-bottom", "clip"];
  return [...scene, ...letter].map((n) => `${ART_BASE}${n}.webp`);
}

/** Where the stamp stands when it is not stamping, and how it is turned there: on the pad whose ink it uses first. */
const restOf = (verdict: Verdict) => (verdict === "nice" ? { ...ANCHORS.padGreen, turn: GREEN_PAD_TURN } : { ...ANCHORS.padRed, turn: 0 });
/** The other pad: where it goes for the second colour. */
const otherOf = (verdict: Verdict) => (verdict === "nice" ? { ...ANCHORS.padRed, turn: 0 } : { ...ANCHORS.padGreen, turn: GREEN_PAD_TURN });

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<NiceListFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const list = useMemo(() => entries(f.nice, f.naughty, s.fallback), [f.nice, f.naughty, s.fallback]);
  const inks = useMemo(() => stamps(f.verdict, data.locale), [f.verdict, data.locale]);
  const [year] = useState(() => reviewYear(new Date()));
  const seed = hashString(`${data.recipientName}|${data.senderName}|nice-list`);

  const [phase, setPhase] = useState<Phase>(preview ? "stamped" : "tied");
  const [revealed, setRevealed] = useState(preview ? list.length : 0);
  const [inked, setInked] = useState(preview ? inks.length : 0);
  const [len, setLen] = useState<number | null>(null);
  const [fit, setFit] = useState(1);
  const [burst, setBurst] = useState<Point | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const pull = useMotionValue(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [toolRef, animateTool] = useAnimate<HTMLDivElement>();
  const lenRef = useRef(0);
  const fitRef = useRef(1);
  const offsets = useRef<number[]>([]);
  const revealedRef = useRef(preview ? list.length : 0);
  const rolling = useRef(false);
  const drag = useRef<{ y: number; from: number; moved: boolean; unit: number } | null>(null);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  // Each line of evidence is ticked as the roll comes down past it.
  useEffect(
    () =>
      pull.on("change", (p) => {
        const out = H0 + p * lenRef.current - ROLL_HALF;
        const count = offsets.current.filter((o) => o <= out + 0.3).length;
        if (count > revealedRef.current) {
          revealedRef.current = count;
          setRevealed(count);
          playScribble(mutedRef.current, 300);
        }
      }),
    [pull],
  );

  /** One stage unit in pixels, as the stage is drawn now. */
  const unitNow = () => (stageRef.current ? stageRef.current.getBoundingClientRect().width / 100 : 0);

  /** How long the words are, and how much they have to shrink to fit the paper there is; read when it is first pulled. */
  const measure = () => {
    const content = contentRef.current;
    const unit = unitNow();
    if (!content || !unit) return;
    const full = content.scrollHeight / unit;
    const scale = full > ROOM ? ROOM / full : 1;
    lenRef.current = full * scale + ROLL_HALF - H0;
    fitRef.current = scale;
    offsets.current = [...content.querySelectorAll<HTMLElement>("[data-entry]")].map((el) => ((el.offsetTop + el.offsetHeight * 0.7) / unit) * scale);
    setFit(scale);
    setLen(lenRef.current);
  };

  const untie = () => {
    if (phase !== "tied") return;
    prime();
    void audio.start();
    buzz(12);
    eventRef.current?.({ type: "started" });
    playWhoosh(mutedRef.current, { delay: 0.05, ms: 500, peak: 0.4 });
    playRustle(mutedRef.current, { ms: 350 });
    setPhase("ready");
  };

  /** Where the `i`th mark is on the stage, in its units. */
  const markAt = (i: number): Point | null => {
    const stage = stageRef.current;
    const mark = stage?.querySelector<HTMLElement>(`[data-ink="${i}"]`);
    const unit = unitNow();
    if (!stage || !mark || !unit) return null;
    const sr = stage.getBoundingClientRect();
    const mr = mark.getBoundingClientRect();
    return { x: (mr.left + mr.width / 2 - sr.left) / unit, y: (mr.top + mr.height / 2 - sr.top) / unit };
  };

  /** The stamp leaves its pad, comes down on the `i`th mark, and goes back: to the other pad when there is a second colour to pick up. */
  const press = (i: number) => {
    const tool = toolRef.current;
    const mark = markAt(i);
    const unit = unitNow();
    if (!tool || !mark || !unit) return;
    const rest = restOf(f.verdict);
    const other = otherOf(f.verdict);
    const to = (p: Point) => ({ x: (p.x - rest.x) * unit, y: (p.y - rest.y) * unit });
    const target = to(mark);
    const from = i === 0 ? rest : other;
    const back = i < inks.length - 1 ? other : rest;
    // The picture of the stamp is turned as the red pad is; the mark has its own turn.
    const turn = inks[i].rotate + 8;
    const times = [0, STAMP_HIT, STAMP_HIT + 0.24, 1];
    void animateTool(
      tool,
      { x: [to(from).x, target.x, target.x, to(back).x], y: [to(from).y, target.y, target.y, to(back).y], rotate: [from.turn, turn, turn, back.turn] },
      { duration: STAMP_S, times, ease: ["easeInOut", "linear", "easeInOut"] },
    );
    // Lifted off the desk it is nearer the eye, so a little bigger; pressed, its own size.
    void animateTool(tool, { scale: [1, 1.16, 1, 1, 1.16, 1] }, { duration: STAMP_S, times: [0, STAMP_HIT * 0.55, STAMP_HIT, STAMP_HIT + 0.24, STAMP_HIT + 0.24 + (0.76 - STAMP_HIT) * 0.45, 1], ease: "easeInOut" });
  };

  const stampIt = () => {
    setPhase("stamping");
    eventRef.current?.({ type: "progress", pct: 25 });
    hitTimes(inks.length).forEach((t, i) => {
      // The stamp sets off at its own slot; the ink is there when it meets the paper, and so is the thud,
      // a frame later, since that is when the press that started it has been drawn.
      if (!reduce) after(i * STAMP_GAP_S * 1000, () => press(i));
      after(reduce ? i * 300 : t * 1000, () => setInked(i + 1));
      after(reduce ? i * 300 : (t + RENDER_LAG_S) * 1000, () => {
        buzz(16);
        playStamp(mutedRef.current);
      });
    });
    const done = reduce ? inks.length * 300 : ((inks.length - 1) * STAMP_GAP_S + STAMP_S) * 1000;
    after(done + 200, () => {
      setPhase("stamped");
      if (!reduce) setBurst(markAt(inks.length - 1));
      playJingle(mutedRef.current, { ms: 1100 });
      playSparkle(mutedRef.current, { delay: 0.2, ms: 1200 });
      after(1400, () => setCanRead(true));
      after(9000, openPage);
    });
  };

  const rollRest = () => {
    if (rolling.current || (phase !== "ready" && phase !== "unrolling")) return;
    rolling.current = true;
    if (!lenRef.current) measure();
    setPhase("unrolling");
    const rest = unrollSeconds(1 - pull.get());
    if (!reduce) playRustle(mutedRef.current, { ms: rest * 1000 });
    animate(pull, 1, {
      duration: reduce ? 0 : rest,
      ease: [0.25, 0.1, 0.25, 1],
      onComplete: () => {
        // Measured again now that it is all down: the handwriting may have finished loading since the first
        // pull, and its lines wrap differently from the fallback font's.
        const content = contentRef.current;
        const unit = unitNow();
        if (content && unit) setLen((content.scrollHeight / unit) * fitRef.current + ROLL_HALF - H0);
        setPhase("unrolled");
        after(reduce ? 100 : 550, stampIt);
      },
    });
  };

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== "ready" || rolling.current) return;
    measure();
    setPhase("unrolling");
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y: e.clientY, from: pull.get(), moved: false, unit: unitNow() };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || !lenRef.current || !d.unit) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) > 6) {
      d.moved = true;
      playRustle(mutedRef.current, { ms: 900 });
    }
    pull.set(Math.min(1, Math.max(0, d.from + dy / d.unit / lenRef.current)));
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    rollRest();
  };

  const openPage = () => {
    setPhase((p) => {
      if (p === "open") return p;
      eventRef.current?.({ type: "progress", pct: 35 });
      return "open";
    });
    clear();
    after(1400, () => setSceneGone(true));
  };

  const replay = () => {
    clear();
    rolling.current = false;
    drag.current = null;
    revealedRef.current = 0;
    lenRef.current = 0;
    fitRef.current = 1;
    offsets.current = [];
    pull.set(0);
    setPhase("tied");
    setRevealed(0);
    setInked(0);
    setLen(null);
    setFit(1);
    setBurst(null);
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.desk, color: look.label, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          lookId={f.look}
          s={s}
          list={list}
          inks={inks}
          verdict={f.verdict}
          year={year}
          to={data.recipientName}
          from={data.senderName}
          title={title}
          revealed={revealed}
          inked={inked}
          len={len}
          fit={fit}
          burst={burst}
          pull={pull}
          reduce={reduce}
          stageRef={stageRef}
          contentRef={contentRef}
          toolRef={toolRef}
          phase={phase}
          leaving={phase === "open"}
          canRead={canRead && phase === "stamped"}
          onUntie={untie}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onRoll={rollRest}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} inks={inks} year={year} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the scroll, still tied. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  const pull = useMotionValue(0);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.desk, color: look.label } as CSSProperties}>
      <Scene
        lookId={f.look}
        s={s}
        list={[]}
        inks={[]}
        verdict={f.verdict}
        year={reviewYear(new Date())}
        to={recipientName}
        from={senderName}
        title={s.title}
        revealed={0}
        inked={0}
        len={null}
        fit={1}
        burst={null}
        pull={pull}
        reduce
        phase="tied"
        leaving={false}
        canRead={false}
        inert
        onUntie={() => {}}
        onDown={() => {}}
        onMove={() => {}}
        onUp={() => {}}
        onRoll={() => {}}
        onRead={() => {}}
      />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
  s: Copy;
  list: Entry[];
  inks: Ink[];
  verdict: Verdict;
  year: number;
  to: string;
  from: string;
  title: string;
  revealed: number;
  inked: number;
  len: number | null;
  fit: number;
  /** Where the gold goes up from once the verdict is on. */
  burst: Point | null;
  pull: MotionValue<number>;
  reduce: boolean;
  stageRef?: RefObject<HTMLDivElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
  toolRef?: RefObject<HTMLDivElement | null>;
  phase: Phase;
  leaving: boolean;
  canRead: boolean;
  /** A picture of the first screen with nothing to press: the editor's cover picker puts it inside a button. */
  inert?: boolean;
  onUntie: () => void;
  onDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onUp: () => void;
  onRoll: () => void;
  onRead: () => void;
};

function Scene(p: SceneProps) {
  const { lookId, s, to, from, title, phase, reduce, leaving, inert = false, stageRef, toolRef, canRead, onRead, verdict, burst } = p;
  const look = LOOKS[lookId];
  const tied = phase === "tied";
  const ready = phase === "ready";
  const tone = { page: look.desk, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  const rest = restOf(verdict);
  const stamp = SPRITES.stamp;
  // The stamp is drawn where it was rendered, on the red pad; from there it is slid to the pad it starts on.
  const home = { x: stamp.x + rest.x - ANCHORS.stamp.x, y: stamp.y + rest.y - ANCHORS.stamp.y, w: stamp.w, h: stamp.h };
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={lookId} floor={look.desk} bulbs={BULBS} still={reduce} shade={look.vignette} glow={look.glow} />

      <div ref={stageRef} style={STAGE}>
        <div className="absolute inset-x-[6%] text-center" style={{ top: down(8), textShadow: look.dark ? "0 calc(.4*var(--k)) calc(3*var(--k)) rgba(0,0,0,.7)" : "0 1px 0 rgba(255,255,255,.4)" }}>
          <p className="text-[calc(2.3*var(--k))] tracking-[0.36em] uppercase opacity-80 [overflow-wrap:anywhere]">
            {from} → {to}
          </p>
          <h1 className="mt-[calc(1.4*var(--k))] leading-[1.02] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 26 ? "calc(5.6*var(--k))" : "calc(7.6*var(--k))", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
        </div>

        <Scroll {...p} />

        {/* the stamp, standing on its ink pad until it is wanted */}
        <div ref={toolRef} aria-hidden="true" className="pointer-events-none z-[7]" style={{ ...laid(home), transformOrigin: `${((ANCHORS.stamp.x - stamp.x) / stamp.w) * 100}% ${((ANCHORS.stamp.y - stamp.y) / stamp.h) * 100}%`, transform: rest.turn ? `rotate(${rest.turn}deg)` : undefined }}>
          <img src={`${ART_BASE}stamp.webp`} alt="" draggable={false} className="block h-full w-full max-w-none" />
        </div>

        {burst ? <Sparks at={burst} count={18} reach={30} seed={9} /> : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[8] flex justify-center" style={{ top: down(tied ? 127 : 68), transition: "top .6s ease" }}>
            <TapPill tone={tone} reduce={reduce} hidden={!tied && !ready}>
              {tied ? s.untie : s.pull}
            </TapPill>
          </div>
        ) : null}
        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(152.5) }}>
            <motion.button
              type="button"
              onClick={onRead}
              initial={reduce ? false : { opacity: 0, y: "30%" }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-full px-[calc(5*var(--k))] py-[calc(1.9*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              style={{ background: "linear-gradient(180deg, #fbe9bd 0%, #e9c777 55%, #c99a3e 100%)", color: "#3a2410", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 0 rgba(120,70,10,.35)" }}
            >
              {s.read}
            </motion.button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The scroll: its rod, the paper as far as it has come down, and the roll of what is left, which a finger pulls. */
function Scroll({ lookId, s, list, inks, verdict, year, to, from, revealed, inked, len, fit, pull, phase, reduce, contentRef, inert = false, onUntie, onDown, onMove, onUp, onRoll }: SceneProps) {
  const look = LOOKS[lookId];
  const tied = phase === "tied";
  const out = phase === "unrolled" || phase === "stamping" || phase === "stamped" || phase === "open";
  const length = len ?? 0;
  const windowH = useTransform(pull, (v) => down(H0 + v * length));
  const rollTop = useTransform(pull, (v) => down(ROLL.y + v * length));
  const paperHeight: string | MotionValue<string> = out ? down(H0 + length) : windowH;
  const rollAt: string | MotionValue<string> = out ? down(ROLL.y + length) : rollTop;
  const ribbon = SPRITES[`ribbon-${look.ribbon}`];
  const tagWords = fill(s.tag, { name: to });

  return (
    <div className="absolute inset-0" style={{ transform: `translateY(calc(${tied ? TIED_DROP : 0} * var(--k)))`, transition: reduce ? undefined : "transform .8s cubic-bezier(.5,0,.2,1)" }}>
      {/* the paper, as much of it as has come down */}
      <motion.div className="absolute overflow-hidden" style={{ left: `${PAPER.x}%`, top: down(PAPER.y), width: `${PAPER.w}%`, height: paperHeight, backgroundImage: `url(${ART_BASE}paper.webp)`, backgroundSize: "100% auto", backgroundRepeat: "no-repeat", backgroundPosition: "top" }}>
        <div ref={contentRef} className="relative origin-top" style={{ transform: fit < 1 ? `scale(${fit})` : undefined, width: fit < 1 ? `${100 / fit}%` : undefined, marginLeft: fit < 1 ? `${(100 - 100 / fit) / 2}%` : undefined }}>
          <Sheet look={look} s={s} list={list} inks={inks} verdict={verdict} year={year} to={to} from={from} revealed={revealed} inked={inked} reduce={reduce} />
        </div>
      </motion.div>

      <Sprite base={ART_BASE} name="rod" rect={SPRITES.rod} style={{ zIndex: 3 }} />
      <motion.img src={`${ART_BASE}roll.webp`} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: `${ROLL.x}%`, top: rollAt, width: `${ROLL.w}%`, height: down(ROLL.h), zIndex: 4 }} />

      {/* the ribbon and its tag: on while it is tied, falling away when it is not */}
      {tied || phase === "ready" ? (
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5]" initial={false} animate={tied ? { y: "0%", opacity: 1, rotate: 0 } : reduce ? { opacity: 0 } : { y: "9%", opacity: 0, rotate: 4 }} transition={{ duration: tied ? 0 : 0.7, ease: "easeIn" }}>
          <Sprite base={ART_BASE} name="tag" rect={SPRITES.tag} />
          <p className="absolute truncate text-center" style={{ left: `${ANCHORS.tag.x}%`, top: down(ANCHORS.tag.y), width: "18%", transform: "translate(-50%, -50%) rotate(9deg)", fontFamily: SCRIPT_FONT, fontSize: `calc(${tagWords.length > 11 ? 3 : 3.8}*var(--k))`, lineHeight: 1.2, color: "#3a2416" }}>
            {tagWords}
          </p>
          <Sprite base={ART_BASE} name={`ribbon-${look.ribbon}`} rect={ribbon} />
        </motion.div>
      ) : null}

      {!inert && (tied || phase === "ready" || phase === "unrolling") ? (
        <motion.button
          type="button"
          aria-label={tied ? s.untie : s.pull}
          onClick={tied ? onUntie : onRoll}
          onPointerDown={tied ? undefined : onDown}
          onPointerMove={tied ? undefined : onMove}
          onPointerUp={tied ? undefined : onUp}
          onPointerCancel={tied ? undefined : onUp}
          className="absolute z-[6] cursor-grab touch-none rounded-[calc(4*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/60 active:cursor-grabbing"
          style={tied ? laid({ x: 4, y: ribbon.y - 2, w: 92, h: ribbon.h + 8 }) : { left: "2%", width: "96%", top: rollAt, height: down(16) }}
        />
      ) : null}
    </div>
  );
}

/** Where a press lands in the verdict box: one in the middle, two in opposite corners. */
const inkBox = (ink: Ink): CSSProperties =>
  ink.at === "middle" ? { left: "13%", right: "5%", top: "10%", bottom: "4%" } : ink.at === "top-left" ? { left: "5%", top: "4%", width: "62%", height: "58%" } : { right: 0, bottom: 0, width: "62%", height: "58%" };

/** What is written on the scroll. */
function Sheet({ look, s, list, inks, verdict, year, to, from, revealed, inked, reduce }: { look: Look; s: Copy; list: Entry[]; inks: Ink[]; verdict: Verdict; year: number; to: string; from: string; revealed: number; inked: number; reduce: boolean }) {
  const done = inked >= inks.length && inks.length > 0;
  return (
    <div className="pt-[calc(7.4*var(--k))] pb-[calc(1.4*var(--k))] text-center" style={{ color: look.ink, paddingLeft: `calc(${PAPER_PAD.left}*var(--k))`, paddingRight: `calc(${PAPER_PAD.right}*var(--k))` }}>
      <p className="text-[calc(2.1*var(--k))] font-semibold tracking-[0.26em] uppercase" style={{ color: look.soft }}>
        {s.office}
      </p>
      <h2 className="mt-[calc(1*var(--k))] leading-none" style={{ ...(reduce ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), fontFamily: POSTER_FONT, fontSize: "calc(6.6*var(--k))", fontWeight: 600 }}>
        {s.list}
      </h2>
      <p className="mt-[calc(1.2*var(--k))] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.7*var(--k))", color: look.accent }}>
        {fill(s.matter, { year, name: to })}
      </p>
      <div className="mt-[calc(2*var(--k))] border-t-[calc(.35*var(--k))] border-double" style={{ borderColor: look.rule }} />
      <div className="mt-[calc(1.4*var(--k))] flex justify-end gap-[calc(1.2*var(--k))] text-[calc(1.8*var(--k))] font-semibold tracking-[0.05em] uppercase" style={{ color: look.soft }}>
        <span className="w-[calc(8.2*var(--k))] text-center">{s.nice}</span>
        <span className="w-[calc(8.2*var(--k))] text-center">{s.naughty}</span>
      </div>
      <ul className="m-0 list-none p-0">
        {list.map((e, i) => (
          <li key={i} data-entry className="flex items-center gap-[calc(1.2*var(--k))] py-[calc(.95*var(--k))] text-left" style={{ borderBottom: `1px solid ${look.rule}` }}>
            <span className="min-w-0 flex-1 leading-[1.2] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.5*var(--k))" }}>
              {e.text}
            </span>
            {(["nice", "naughty"] as const).map((side) => (
              <span key={side} className="grid w-[calc(8.2*var(--k))] shrink-0 place-items-center">
                <span className="block h-[calc(4.2*var(--k))] w-[calc(4.2*var(--k))]" style={{ color: look.soft }}>
                  <Tick color={side === "nice" ? "#2a7a42" : "#b8232b"} drawn={e.side === side && i < revealed} />
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-[calc(1.6*var(--k))] text-right text-[calc(2.5*var(--k))] italic" style={{ color: look.soft }}>
        {s.checked} ✓✓
      </p>
      <div className="relative mt-[calc(.4*var(--k))]" style={{ height: `calc(${inks.length > 1 ? 24 : 18.5}*var(--k))` }}>
        <span className="absolute top-[calc(.8*var(--k))] left-0 text-[calc(2.3*var(--k))] font-semibold tracking-[0.2em] uppercase" style={{ color: look.soft }}>
          {s.verdict}:
        </span>
        {inks.map((ink, i) => (
          <div key={i} data-ink={i} className="absolute" style={inkBox(ink)}>
            <motion.div className="absolute inset-0" style={{ rotate: `${ink.rotate}deg`, mixBlendMode: "multiply" }} initial={false} animate={i < inked ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.14 }} transition={reduce ? { duration: 0 } : { duration: 0.1, ease: "easeOut" }}>
              <InkStamp word={ink.word} color={ink.color} />
            </motion.div>
          </div>
        ))}
      </div>
      <p className="mt-[calc(1.2*var(--k))]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.7*var(--k))", color: look.accent, opacity: done ? 1 : 0, transition: "opacity .6s ease .3s" }}>
        {s.presents[verdict]}
      </p>
      <div className="mt-[calc(.4*var(--k))] flex items-center justify-end gap-[calc(1.2*var(--k))]">
        <p className="min-w-0 text-right [overflow-wrap:anywhere]" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(3.9*var(--k))", color: look.accent }}>
          {fill(s.signed, { name: from })}
        </p>
        <img src={`${ART_BASE}seal.webp`} alt="" draggable={false} className="block shrink-0" style={{ width: "calc(12*var(--k))", margin: "calc(-1.2*var(--k)) calc(-1.6*var(--k)) calc(-1.2*var(--k)) 0", rotate: "-8deg" }} />
      </div>
    </div>
  );
}

const share = (n: number) => `${(n * 100).toFixed(2)}%`;

/** The letter: the same scroll, unrolled to its end, the verdict at its head and the words under it; then the evidence, clipped. */
function Page({ lookId, s, data, inks, year, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<NiceListFields>["data"]; inks: Ink[]; year: number; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: look.ink, soft: look.soft, accent: look.accent, rule: look.rule, label: "#fff6ea", face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 5);
    return data.photos.map(() => ({ print: (rng() - 0.5) * 6, clip: (rng() - 0.5) * 18, right: rng() < 0.4 }));
  }, [data.photos, seed]);
  // The rod and the roll are placed on the sheet as they are on the scroll: a share of the paper's width from its corner.
  const rod = SPRITES.rod;
  const rollDrop = ROLL.h - (ANCHORS.roll.y - ROLL.y) - SHEETS.letter.inset.bottom * PAPER.w - 0.6;
  return (
    <motion.div className="absolute inset-0 z-[20]" initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <HolidayPage
        data={data}
        mode={mode}
        still={still}
        base={ART_BASE}
        look={lookId}
        floor={look.desk}
        shade={look.veil}
        sheet={SHEETS.letter}
        sheetWidth={0.84}
        theme={theme}
        crown={<img src={`${ART_BASE}rod.webp`} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute top-0 max-w-none select-none" style={{ left: share((rod.x - PAPER.x) / PAPER.w), width: share(rod.w / PAPER.w), marginTop: share((rod.y - PAPER.y) / PAPER.w) }} />}
        foot={<img src={`${ART_BASE}roll.webp`} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute bottom-0 max-w-none select-none" style={{ left: share((ROLL.x - PAPER.x) / PAPER.w), width: share(ROLL.w / PAPER.w), marginBottom: share(-rollDrop / PAPER.w) }} />}
        header={
          <div className="text-center">
            <p className="text-[calc(2.5*var(--u))] font-semibold tracking-[0.26em] uppercase" style={{ color: look.soft }}>
              {s.office}
            </p>
            <p className="mt-[calc(1*var(--u))] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(4.6*var(--u))", color: look.accent }}>
              {fill(s.matter, { year, name: data.recipientName })}
            </p>
            <div className="relative mx-auto mt-[calc(1*var(--u))] w-[96%]" style={{ height: `calc(${inks.length > 1 ? 33 : 24}*var(--u))` }}>
              {inks.map((ink, i) => (
                <div key={i} className="absolute" style={{ ...inkBox(ink), left: ink.at === "middle" ? "5%" : ink.at === "top-left" ? 0 : undefined, rotate: `${ink.rotate}deg`, mixBlendMode: "multiply" }}>
                  <InkStamp word={ink.word} color={ink.color} />
                </div>
              ))}
            </div>
            {/* signed and sealed: a ruled line, the wax on it */}
            <div className="relative mt-[calc(7*var(--u))] mb-[calc(8*var(--u))]">
              <div className="border-t-[calc(.45*var(--u))] border-double" style={{ borderColor: look.rule }} />
              <img src={`${ART_BASE}seal.webp`} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute top-1/2 left-1/2 block max-w-none" style={{ width: "calc(14*var(--u))", transform: "translate(-46%, -46%) rotate(-8deg)" }} />
            </div>
          </div>
        }
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        photo={(slot) => <Evidence slot={slot} tilt={tilt[slot.index]} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A photo filed as evidence: a print, held by a brass paper clip over its top edge. */
function Evidence({ slot, tilt }: { slot: PhotoSlot; tilt?: { print: number; clip: number; right: boolean } }) {
  return (
    <Print
      slot={slot}
      rot={tilt?.print ?? 0}
      holder={
        <img
          src={`${ART_BASE}clip.webp`}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute top-0 max-w-none select-none"
          style={{ left: tilt?.right ? "72%" : "13%", width: "10.5%", transform: `translateY(${(-CLIP_EDGE * 100).toFixed(1)}%) rotate(${(tilt?.clip ?? 0).toFixed(1)}deg)`, transformOrigin: `50% ${(CLIP_EDGE * 100).toFixed(1)}%` }}
        />
      }
    />
  );
}
