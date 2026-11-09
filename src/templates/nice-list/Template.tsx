"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playJingle, playRustle, playScribble, playSparkle, playStamp, playWhoosh } from "../_shared/night/sfx";
import { MUSIC_CEILING, RENDER_LAG_S } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FountainPen, InkStamp, RolledParchment, Roller, StampTool, Tick, WaxSeal } from "./art";
import { Bokeh, Candle, CANDLE_KEYFRAMES, CardTag, FIBRE, FOIL_ON_LIGHT, FOIL_KEYFRAMES, mix, satin, SatinBow, STAINS, Texture, WOOD } from "../_shared/holiday/materials";
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

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "red";
};
const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof NiceListFields, unknown>>;
  return { verdict: readVerdict(raw.verdict), look: readLook(fields), nice: raw.nice as unknown[] | undefined, naughty: raw.naughty as unknown[] | undefined };
};

/** Where the paper starts below the top roller, and where the desk begins, in the stage's 170 units. */
const PAPER_TOP = 33;
const DESK_TOP = 150;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<NiceListFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const look = LOOKS[f.look];
  const list = useMemo(() => entries(f.nice, f.naughty, s.fallback), [f.nice, f.naughty, s.fallback]);
  const inks = useMemo(() => stamps(f.verdict, data.locale), [f.verdict, data.locale]);
  const [year] = useState(() => reviewYear(new Date()));
  const seed = hashString(`${data.recipientName}|${data.senderName}|nice-list`);

  const [phase, setPhase] = useState<Phase>(preview ? "stamped" : "tied");
  const [revealed, setRevealed] = useState(preview ? list.length : 0);
  const [inked, setInked] = useState(preview ? inks.length : 0);
  const [pressing, setPressing] = useState(-1);
  const [len, setLen] = useState<number | null>(null);
  const [fit, setFit] = useState(1);
  const [canRead, setCanRead] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const pull = useMotionValue(preview ? 1 : 0);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lenRef = useRef(0);
  const fitRef = useRef(1);
  const offsets = useRef<number[]>([]);
  const revealedRef = useRef(preview ? list.length : 0);
  const rolling = useRef(false);
  const drag = useRef<{ y: number; from: number; moved: boolean } | null>(null);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  // Each line of evidence is ticked as the paper comes down past it.
  useEffect(
    () =>
      pull.on("change", (p) => {
        const visible = p * lenRef.current;
        const count = offsets.current.filter((o) => o <= visible + 1).length;
        if (count > revealedRef.current) {
          revealedRef.current = count;
          setRevealed(count);
          playScribble(mutedRef.current, 300);
        }
      }),
    [pull],
  );

  /** How long the scroll is, and how much it has to shrink to fit above the desk; read when it is first pulled. */
  const measure = () => {
    const content = contentRef.current;
    const stage = stageRef.current;
    if (!content || !stage) return;
    const full = content.scrollHeight;
    const room = (stage.getBoundingClientRect().height * (DESK_TOP - PAPER_TOP - 1)) / 170;
    const scale = full > room ? room / full : 1;
    lenRef.current = full * scale;
    fitRef.current = scale;
    offsets.current = [...content.querySelectorAll<HTMLElement>("[data-entry]")].map((el) => (el.offsetTop + el.offsetHeight * 0.7) * scale);
    setFit(scale);
    setLen(full * scale);
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

  const stampIt = () => {
    setPhase("stamping");
    eventRef.current?.({ type: "progress", pct: 25 });
    const hits = hitTimes(inks.length);
    hits.forEach((t, i) => {
      // The tool starts down at its own slot; the ink is there when it meets the paper, and so is the thud,
      // a frame later, since that is when React has drawn the press that started it.
      after(reduce ? i * 300 : i * STAMP_GAP_S * 1000, () => setPressing(i));
      after(reduce ? i * 300 : t * 1000, () => setInked(i + 1));
      after(reduce ? i * 300 : (t + RENDER_LAG_S) * 1000, () => {
        buzz(16);
        playStamp(mutedRef.current);
      });
    });
    const done = reduce ? inks.length * 300 : ((inks.length - 1) * STAMP_GAP_S + STAMP_S) * 1000;
    after(done + 200, () => {
      setPhase("stamped");
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
        if (content) setLen(content.scrollHeight * fitRef.current);
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
    drag.current = { y: e.clientY, from: pull.get(), moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || !lenRef.current) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) > 6) {
      d.moved = true;
      playRustle(mutedRef.current, { ms: 900 });
    }
    pull.set(Math.min(1, Math.max(0, d.from + dy / lenRef.current)));
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
    setPressing(-1);
    setLen(null);
    setFit(1);
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const scene = {
    look,
    s,
    list,
    inks,
    verdict: f.verdict,
    year,
    to: data.recipientName,
    from: data.senderName,
    title,
    revealed,
    inked,
    pressing,
    len,
    fit,
    pull,
    reduce: reduce || preview,
    stageRef,
    contentRef,
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.label, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          {...scene}
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
        <Page key={`page-${run}`} look={look} s={s} data={data} inks={inks} year={year} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
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
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.label } as CSSProperties}>
      <Scene
        look={look}
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
        pressing={-1}
        len={null}
        fit={1}
        pull={pull}
        reduce
        stageRef={{ current: null }}
        contentRef={{ current: null }}
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
  look: Look;
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
  pressing: number;
  len: number | null;
  fit: number;
  pull: MotionValue<number>;
  reduce: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
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

const pct = (units: number, of: number) => `${(units / of) * 100}%`;

/** Where a press lands in the verdict box: one in the middle, two in opposite corners. */
const inkBox = (ink: Ink): CSSProperties =>
  ink.at === "middle" ? { left: "8%", right: "8%", top: "10%", bottom: "10%" } : ink.at === "top-left" ? { left: 0, top: 0, width: "66%", height: "62%" } : { right: 0, bottom: 0, width: "66%", height: "62%" };

function Scene(p: SceneProps) {
  const { look, s, to, from, title, phase, reduce, leaving, inert = false, stageRef, canRead, onRead } = p;
  const tied = phase === "tied";
  const ready = phase === "ready";
  const tone = { page: look.wall[0], glow: [look.ribbon, look.ribbon] as const, accent: look.accent, dark: look.dark };
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${FOIL_KEYFRAMES}${CANDLE_KEYFRAMES}`}</style>
      {/* the room: a lamp's warm light from the top left, and lights out of focus behind */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: look.dark ? `radial-gradient(70% 50% at 26% 16%, ${mix(look.wall[0], "#ffcf8a", 0.24)}, transparent 72%)` : "radial-gradient(70% 50% at 26% 16%, rgba(255,255,255,.75), transparent 72%)" }} />
      <div aria-hidden="true" className="absolute inset-x-0 top-0" style={{ bottom: `calc(50% - ${DESK_TOP - 85} * var(--k))` }}>
        <Bokeh colors={look.lights} count={22} seed={7} top={2} bottom={96} still={reduce} strength={look.dark ? 0.9 : 0.5} />
      </div>
      {/* the desk, edge to edge: walnut, lit where the candle is */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ top: `calc(50% + ${DESK_TOP - 85} * var(--k))`, background: `linear-gradient(180deg, ${look.desk[0]}, ${look.desk[1]})` }}>
        <Texture image={WOOD} blend="multiply" opacity={look.dark ? 0.6 : 0.25} size="calc(180*var(--k)) calc(46*var(--k))" />
        <div className="absolute inset-x-0 top-0 h-[calc(.6*var(--k))]" style={{ background: "rgba(255,225,180,.28)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(40% 70% at 12% 10%, rgba(255,190,110,.28), transparent 70%)" }} />
      </div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: look.dark ? "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.55))" : "radial-gradient(120% 90% at 50% 40%, transparent 60%, rgba(120,40,70,.18))" }} />

      <div ref={stageRef} className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        <div className="absolute inset-x-[6%] text-center" style={{ top: pct(4, 170) }}>
          <p className="text-[calc(2.4*var(--k))] tracking-[0.32em] uppercase opacity-75 [overflow-wrap:anywhere]">
            {from} → {to}
          </p>
          <h1 className="mt-[calc(1.4*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 26 ? "calc(5.6*var(--k))" : "calc(7.6*var(--k))" }}>
            {title}
          </h1>
        </div>

        {/* the desk's things */}
        <div aria-hidden="true" className="pointer-events-none absolute z-[2]" style={{ left: pct(-1, 100), top: pct(131, 170), width: pct(12, 100), height: pct(34, 170) }}>
          <Candle still={reduce} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute z-[2]" style={{ left: pct(56, 100), top: pct(159, 170), width: pct(40, 100), height: pct(6.6, 170), rotate: "-7deg" }}>
          <FountainPen />
        </div>

        <Scroll {...p} />

        <div className="pointer-events-none absolute inset-x-0 z-[8] flex justify-center" style={{ top: pct(DESK_TOP - 10, 170) }}>
          {!inert ? (
            <TapPill tone={tone} reduce={reduce} hidden={!tied && !ready}>
              {tied ? s.untie : s.pull}
            </TapPill>
          ) : null}
        </div>
        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: pct(DESK_TOP + 4, 170) }}>
            <button type="button" onClick={onRead} className="rounded-full px-[calc(5*var(--k))] py-[calc(1.9*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ background: look.accent, color: "#fffaf2", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.35)" }}>
              {s.read}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The scroll: a roller at the top, the paper under it, and a roller at the bottom that a finger pulls down. */
function Scroll({ look, s, list, inks, verdict, year, to, from, revealed, inked, pressing, len, fit, pull, phase, reduce, contentRef, inert = false, onUntie, onDown, onMove, onUp, onRoll }: SceneProps) {
  const tied = phase === "tied";
  const height = useTransform(pull, (v) => (len === null ? 0 : v * len));
  const open = phase === "unrolled" || phase === "stamping" || phase === "stamped" || phase === "open";
  const paperHeight: number | string | MotionValue<number> = len === null ? (open ? "auto" : 0) : open ? len : height;

  return (
    <div className="absolute" style={{ left: pct(7, 100), width: pct(86, 100), top: pct(tied ? 72 : PAPER_TOP - 6, 170), transition: reduce ? undefined : "top .8s cubic-bezier(.5,0,.2,1)" }}>
      <Roller wood={look.roller[1]} className="relative z-[3] block h-[calc(6.6*var(--k))] w-full" />

      {/* the paper, as much of it as has come down */}
      <motion.div className="relative z-[1] mx-auto -mt-[calc(1.6*var(--k))] w-[86%] overflow-hidden" style={{ height: paperHeight, background: `linear-gradient(90deg, ${mix(look.paper, "#7a5a30", 0.14)}, ${look.paper} 7%, ${look.paper} 93%, ${mix(look.paper, "#7a5a30", 0.14)})`, boxShadow: "inset 0 0 calc(3.4*var(--k)) rgba(120,72,24,.32), 0 calc(1.6*var(--k)) calc(4*var(--k)) rgba(0,0,0,.4)" }}>
        <Texture image={STAINS} blend="multiply" opacity={0.42} size="calc(90*var(--k))" />
        <Texture image={FIBRE} blend="multiply" opacity={0.55} size="calc(26*var(--k))" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[calc(4*var(--k))]" style={{ background: "linear-gradient(180deg, rgba(70,40,10,.32), transparent)" }} />
        <div ref={contentRef} className="relative origin-top" style={{ transform: fit < 1 ? `scale(${fit})` : undefined, width: fit < 1 ? `${100 / fit}%` : undefined, marginLeft: fit < 1 ? `${(100 - 100 / fit) / 2}%` : undefined }}>
          <Sheet look={look} s={s} list={list} inks={inks} verdict={verdict} year={year} to={to} from={from} revealed={revealed} inked={inked} pressing={pressing} phase={phase} reduce={reduce} />
        </div>
      </motion.div>

      {/* the rest of it, still rolled up: a fat roll while it is tied, a roller once it is coming down */}
      <div className="relative z-[4] -mt-[calc(1.4*var(--k))]">
        {tied ? <RolledParchment paper={look.paper} className="absolute inset-x-0 mx-auto w-[92%]" style={{ top: "calc(-7.4*var(--k))", height: "calc(11*var(--k))" }} /> : null}
        <Roller wood={look.roller[1]} className="relative block h-[calc(6.6*var(--k))] w-full" />
        {tied || (phase === "ready" && !reduce) ? (
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: "calc(-9*var(--k))", height: "calc(24*var(--k))" }} initial={false} animate={tied ? { y: 0, opacity: 1, rotate: 0 } : { y: "40%", opacity: 0, rotate: 10 }} transition={{ duration: 0.7, ease: "easeIn" }}>
            {/* the ribbon round the roll, and its bow */}
            <div className="absolute left-1/2 w-[9%] -translate-x-1/2" style={{ top: "calc(1.4*var(--k))", height: "calc(12.4*var(--k))", background: satin(look.ribbon, 90), boxShadow: "0 0 calc(1*var(--k)) rgba(0,0,0,.4)", borderRadius: "calc(.6*var(--k))" }} />
            <div className="absolute left-1/2 w-[34%] -translate-x-1/2" style={{ top: "calc(-4.6*var(--k))" }}>
              <SatinBow color={look.ribbon} className="block w-full" />
            </div>
          </motion.div>
        ) : null}
        {tied ? (
          <div aria-hidden="true" className="absolute left-[30%] w-[50%]" style={{ top: "calc(4*var(--k))", height: "calc(9*var(--k))" }}>
            <CardTag text={fill(s.tag, { name: to })} className="absolute top-0 left-0 w-full origin-top-left rotate-[-5deg]" />
          </div>
        ) : null}
        {!inert && (tied || phase === "ready" || phase === "unrolling") ? (
          <button
            type="button"
            aria-label={tied ? s.untie : s.pull}
            onClick={tied ? onUntie : onRoll}
            onPointerDown={tied ? undefined : onDown}
            onPointerMove={tied ? undefined : onMove}
            onPointerUp={tied ? undefined : onUp}
            onPointerCancel={tied ? undefined : onUp}
            className="absolute -inset-x-[2%] z-[5] cursor-grab touch-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/60 active:cursor-grabbing"
            style={{ top: tied ? "calc(-12*var(--k))" : "calc(-6*var(--k))", height: tied ? "calc(26*var(--k))" : "calc(16*var(--k))" }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** What is written on the scroll. */
function Sheet({ look, s, list, inks, verdict, year, to, from, revealed, inked, pressing, phase, reduce }: { look: Look; s: Copy; list: Entry[]; inks: Ink[]; verdict: Verdict; year: number; to: string; from: string; revealed: number; inked: number; pressing: number; phase: Phase; reduce: boolean }) {
  const stamping = phase === "stamping";
  return (
    <div className="px-[calc(4.4*var(--k))] pt-[calc(4*var(--k))] pb-[calc(3.4*var(--k))] text-center" style={{ color: look.ink }}>
      <p className="text-[calc(2.2*var(--k))] font-semibold tracking-[0.26em] uppercase" style={{ color: look.soft }}>
        {s.office}
      </p>
      <h2 className="mt-[calc(1.2*var(--k))] leading-none" style={{ ...(reduce ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), fontFamily: POSTER_FONT, fontSize: "calc(6.8*var(--k))", fontWeight: 600 }}>
        {s.list}
      </h2>
      <p className="mt-[calc(1.4*var(--k))] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.8*var(--k))", color: look.accent }}>
        {fill(s.matter, { year, name: to })}
      </p>
      <div className="mt-[calc(2.4*var(--k))] border-t-[calc(.35*var(--k))] border-double" style={{ borderColor: look.rule }} />
      <div className="mt-[calc(1.6*var(--k))] flex justify-end gap-[calc(1.2*var(--k))] text-[calc(1.9*var(--k))] font-semibold tracking-[0.05em] uppercase" style={{ color: look.soft }}>
        <span className="w-[calc(8.6*var(--k))] text-center">{s.nice}</span>
        <span className="w-[calc(8.6*var(--k))] text-center">{s.naughty}</span>
      </div>
      <ul className="m-0 list-none p-0">
        {list.map((e, i) => (
          <li key={i} data-entry className="flex items-center gap-[calc(1.2*var(--k))] py-[calc(1.1*var(--k))] text-left" style={{ borderBottom: `1px solid ${look.rule}` }}>
            <span className="min-w-0 flex-1 leading-[1.2] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.6*var(--k))" }}>
              {e.text}
            </span>
            {(["nice", "naughty"] as const).map((side) => (
              <span key={side} className="grid w-[calc(8.6*var(--k))] shrink-0 place-items-center">
                <span className="block h-[calc(4.4*var(--k))] w-[calc(4.4*var(--k))]" style={{ color: look.soft }}>
                  <Tick color={side === "nice" ? "#2f8a4a" : "#c8282e"} drawn={e.side === side && i < revealed} />
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-[calc(2*var(--k))] text-right text-[calc(2.6*var(--k))] italic" style={{ color: look.soft }}>
        {s.checked} ✓✓
      </p>
      <div className="mt-[calc(1.2*var(--k))] flex items-center gap-[calc(2*var(--k))]">
        <span className="text-[calc(2.4*var(--k))] font-semibold tracking-[0.2em] uppercase" style={{ color: look.soft }}>
          {s.verdict}:
        </span>
        <div className="relative h-[calc(17*var(--k))] flex-1">
          {inks.map((ink, i) => (
            <InkPress key={i} ink={ink} pressed={i < inked} active={stamping && i === pressing} reduce={reduce} rubber={look.ribbon} index={i} />
          ))}
        </div>
      </div>
      <p className="mt-[calc(1.4*var(--k))]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.8*var(--k))", color: look.accent, opacity: inked >= inks.length && inks.length ? 1 : 0, transition: "opacity .6s ease .3s" }}>
        {s.presents[verdict]}
      </p>
      <div className="mt-[calc(1.6*var(--k))] flex items-center justify-end gap-[calc(2*var(--k))]">
        <p className="min-w-0 text-right [overflow-wrap:anywhere]" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(4*var(--k))", color: look.accent }}>
          {fill(s.signed, { name: from })}
        </p>
        <div className="h-[calc(10*var(--k))] w-[calc(10*var(--k))] shrink-0 rotate-[-8deg]">
          <WaxSeal letter={(from.trim()[0] ?? "*").toUpperCase()} />
        </div>
      </div>
    </div>
  );
}

/** One press of the stamp: the tool coming down and lifting away, and the ink it leaves. */
function InkPress({ ink, pressed, active, reduce, rubber, index }: { ink: Ink; pressed: boolean; active: boolean; reduce: boolean; rubber: string; index: number }) {
  return (
    <div className="absolute" style={inkBox(ink)}>
      <motion.div
        className="absolute inset-0"
        style={{ rotate: `${ink.rotate}deg`, mixBlendMode: "multiply" }}
        initial={false}
        animate={pressed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.18 }}
        transition={reduce ? { duration: 0 } : { duration: 0.12, ease: "easeOut" }}
      >
        <InkStamp word={ink.word} color={ink.color} />
      </motion.div>
      {active && !reduce ? (
        <motion.div
          key={`tool-${index}`}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 z-[3] w-[44%] -translate-x-1/2"
          style={{ bottom: "8%", height: "260%" }}
          initial={{ y: "-90%", opacity: 0, rotate: ink.rotate * 0.6 }}
          animate={{ y: ["-90%", "0%", "0%", "-110%"], opacity: [0, 1, 1, 0], rotate: ink.rotate * 0.6 }}
          transition={{ duration: STAMP_S, times: [0, STAMP_HIT, STAMP_HIT + 0.24, 1], ease: ["easeIn", "linear", "easeOut"] }}
        >
          <StampTool rubber={rubber} />
        </motion.div>
      ) : null}
    </div>
  );
}

function Page({ look, s, data, inks, year, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<NiceListFields>["data"]; inks: Ink[]; year: number; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.paper, cardImage: PAPER_GRAIN, ink: look.ink, soft: look.soft, accent: look.accent, edge: look.rule, dark: false, label: look.label, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 5);
    return data.photos.map(() => (rng() - 0.5) * 7);
  }, [data.photos, seed]);
  return (
    <motion.div className="absolute inset-0 z-[20]" style={{ background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)` }} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Bokeh colors={look.lights} count={16} seed={seed} still={still} strength={look.dark ? 0.75 : 0.45} />
      </div>
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        hero={
          <div className="relative mx-auto w-[min(70cqw,340px)] rounded-[calc(1.6*var(--u))] p-[calc(4*var(--u))] text-center" style={{ background: look.paper, backgroundImage: `${STAINS}, ${PAPER_GRAIN}`, backgroundSize: "calc(60*var(--u)), auto", color: look.ink, rotate: "-2deg", boxShadow: "inset 0 0 calc(3*var(--u)) rgba(120,72,24,.3), 0 calc(3*var(--u)) calc(8*var(--u)) rgba(0,0,0,.45)" }}>
            <p className="text-[calc(2.6*var(--u))] font-semibold tracking-[0.24em] uppercase" style={{ color: look.soft }}>
              {fill(s.matter, { year, name: data.recipientName })}
            </p>
            <div className="relative mt-[calc(2*var(--u))] h-[calc(26*var(--u))]">
              {inks.map((ink, i) => (
                <div key={i} className="absolute" style={{ ...inkBox(ink), rotate: `${ink.rotate}deg`, mixBlendMode: "multiply" }}>
                  <InkStamp word={ink.word} color={ink.color} />
                </div>
              ))}
            </div>
          </div>
        }
        photo={(slot) => <Evidence slot={slot} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A photo pinned to the file as evidence: a polaroid with a paper clip. */
function Evidence({ slot, rot }: { slot: PhotoSlot; rot: number }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-white/60">
        <div className="relative p-[calc(1.8*var(--u))] pb-[calc(9.5*var(--u))]" style={{ background: "#fffaf2", backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(3*var(--u)) calc(7*var(--u)) rgba(0,0,0,.45)" }}>
          <img src={photo.url} alt="" loading="lazy" draggable={false} className="aspect-square w-full object-cover" />
          {photo.caption ? (
            <figcaption className="absolute inset-x-[calc(2*var(--u))] bottom-[calc(1.4*var(--u))] line-clamp-2 text-center leading-[1.1]" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(2.9*var(--u))", color: "#3a2410" }}>
              {photo.caption}
            </figcaption>
          ) : null}
        </div>
        <span aria-hidden="true" className="absolute -top-[calc(2.4*var(--u))] left-[18%] h-[calc(8*var(--u))] w-[calc(3*var(--u))] rounded-full border-[calc(.6*var(--u))] border-[#9aa3ad]" />
      </button>
    </figure>
  );
}

