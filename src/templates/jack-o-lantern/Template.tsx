"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { Ambience } from "../_shared/Ambience";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playCarve, playIgnite, playSparkle, playThunk, playWhoosh } from "../_shared/night/sfx";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { CandyCorn, Knife, Match, Matchbox, Pumpkin } from "./art";
import { FACES, NAME_BAND, normalizeCarving, planCarve, progressBetween, type FaceId } from "./design";
import { LOOKS, type Look, type LookId } from "./looks";
import { fieldsSchema, type JackOLanternFields } from "./schema";

const S = {
  en: { carve: "tap to carve", light: "light the candle", read: "read the note", skip: "skip", title: "carved just for you", gallery: "by candlelight", note: "a note from {name}" },
  es: { carve: "toca para tallar", light: "enciende la vela", read: "lee la nota", skip: "saltar", title: "tallada solo para ti", gallery: "a la luz de las velas", note: "una nota de {name}" },
};
type Copy = (typeof S)["en"];

const KEYFRAMES = `
.jl-flicker{animation:jl-fl 1.9s ease-in-out infinite}
@keyframes jl-fl{0%{opacity:.93}8%{opacity:1}16%{opacity:.87}27%{opacity:.98}41%{opacity:.9}56%{opacity:1}71%{opacity:.85}84%{opacity:.97}100%{opacity:.92}}
.jl-piece{animation:jl-pc .95s cubic-bezier(.45,0,.9,.55) forwards;transform-box:fill-box;transform-origin:center}
@keyframes jl-pc{0%{transform:translate(0,0) rotate(0);opacity:1}18%{transform:translate(0,-1px) rotate(calc(var(--rot)*.2));opacity:1}100%{transform:translate(var(--dx),38px) rotate(var(--rot));opacity:0}}
.jl-match{transform-box:fill-box;transform-origin:50% 100%;animation:jl-mf .35s ease-in-out infinite alternate}
@keyframes jl-mf{from{transform:scale(1,1) skewX(-2deg)}to{transform:scale(.92,1.1) skewX(3deg)}}
.jl-glint{animation:jl-gl 3.4s ease-in-out infinite alternate}
@keyframes jl-gl{from{opacity:.5}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.jl-flicker,.jl-match,.jl-glint{animation:none}}
`;

/** idle: the pumpkin and the knife. carving: the knife is at work. carved: it is cut, and dark. match: the candle is being lit. lit: it glows. open: the letter. */
type Phase = "idle" | "carving" | "carved" | "match" | "lit" | "open";

/** Where the knife lies on the table, in the pumpkin's coordinates. */
const REST = { x: 66, y: 101 };

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "orange";
};
const readFace = (fields: unknown): FaceId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.face in FACES ? parsed.data.face : "classic";
};
const readCarving = (fields: unknown, name: string): string => {
  const parsed = fieldsSchema.safeParse(fields);
  return normalizeCarving(parsed.success ? parsed.data.carving : undefined, name);
};

const pct = (units: number, of: number) => `${(units / of) * 100}%`;
const ease = (n: number) => (n < 0.5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2);

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<JackOLanternFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const look = LOOKS[readLook(data.fields)];
  const face = readFace(data.fields);
  const name = useMemo(() => readCarving(data.fields, data.recipientName), [data.fields, data.recipientName]);
  const cuts = FACES[face];
  const seed = hashString(`${data.recipientName}|${data.senderName}|jack-o-lantern`);

  const [phase, setPhase] = useState<Phase>(preview ? "open" : "idle");
  const [doneCuts, setDoneCuts] = useState(preview ? cuts.length : 0);
  const [nameDone, setNameDone] = useState(preview);
  const [lit, setLit] = useState(preview);
  const [canSkip, setCanSkip] = useState(false);
  const [canRead, setCanRead] = useState(false);
  const [sceneGone, setSceneGone] = useState(preview);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const svgRef = useRef<SVGSVGElement>(null);
  const knifeRef = useRef<SVGGElement>(null);
  const skipped = useRef(false);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const finishCarving = () => {
    setDoneCuts(cuts.length);
    setNameDone(true);
    setPhase("carved");
    eventRef.current?.({ type: "progress", pct: 20 });
  };

  const carve = () => {
    if (phase !== "idle") return;
    prime();
    void audio.start();
    buzz(14);
    eventRef.current?.({ type: "started" });
    after(2500, () => setCanSkip(true));
    if (reduce) {
      finishCarving();
      return;
    }
    setPhase("carving");
  };

  // The carving: one animation loop reads the plan at the current time and moves the knife and the
  // scratch it leaves straight in the SVG, and tells React only when a piece comes out.
  useEffect(() => {
    if (phase !== "carving") return;
    const svg = svgRef.current;
    const knife = knifeRef.current;
    if (!svg || !knife) return;
    const lines = [...svg.querySelectorAll<SVGPathElement>("[data-cut]")];
    const nameLine = svg.querySelector<SVGTextElement>("[data-name-line]");
    const clip = svg.querySelector<SVGRectElement>("[data-name-clip]");
    const lengths = lines.map((p) => p.getTotalLength());
    const starts = lines.map((p) => p.getPointAtLength(0));
    const plan = planCarve(lengths);
    const band = NAME_BAND.x2 - NAME_BAND.x1;
    const t0 = performance.now();
    const cutDone = new Array(lines.length).fill(false);
    const cutHeard = new Array(lines.length).fill(false);
    let nameHeard = 0;
    let raf = 0;

    const place = (x: number, y: number) => knife.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, e: number) => ({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e });
    const nameStart = { x: NAME_BAND.x1, y: NAME_BAND.y - 4 };

    const frame = (clock: number) => {
      const t = skipped.current ? plan.total : (clock - t0) / 1000;
      let at: { x: number; y: number } = REST;
      let last = REST;
      for (const step of plan.steps) {
        if (t < step.travelAt) break;
        const line = lines[step.index];
        if (t < step.start) {
          at = lerp(last, starts[step.index], ease(progressBetween(t, step.travelAt, step.start)));
        } else {
          const p = progressBetween(t, step.start, step.end);
          line.style.strokeDashoffset = String(1 - p);
          at = line.getPointAtLength(p * lengths[step.index]);
          if (!cutHeard[step.index]) {
            cutHeard[step.index] = true;
            playCarve(mutedRef.current);
          }
          if (p >= 1 && !cutDone[step.index]) {
            cutDone[step.index] = true;
            setDoneCuts((n) => Math.max(n, step.index + 1));
            playThunk(mutedRef.current);
          }
        }
        last = starts[step.index];
      }
      if (t >= plan.nameTravelAt) {
        if (t < plan.nameStart) {
          at = lerp(last, nameStart, ease(progressBetween(t, plan.nameTravelAt, plan.nameStart)));
        } else {
          const p = progressBetween(t, plan.nameStart, plan.nameEnd);
          at = { x: NAME_BAND.x1 + band * p, y: nameStart.y + Math.sin(p * 44) * 0.9 };
          clip?.setAttribute("width", String((band + 12) * p));
          nameLine?.style.setProperty("opacity", "0.95");
          if (nameHeard < 3 && t >= plan.nameStart + nameHeard * 0.42) {
            nameHeard += 1;
            playCarve(mutedRef.current);
          }
        }
      }
      if (t >= plan.nameEnd) {
        // The knife goes back to the table.
        at = lerp({ x: NAME_BAND.x2, y: nameStart.y }, REST, ease(progressBetween(t, plan.nameEnd, plan.total)));
      }
      place(at.x, at.y);
      if (t >= plan.total) {
        place(REST.x, REST.y);
        finishCarving();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // `finishCarving` only sets state, and the plan is built once from this pumpkin's own paths.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const openPage = () => {
    if (phase === "open") return;
    clear();
    setPhase("open");
    eventRef.current?.({ type: "progress", pct: 30 });
    after(1500, () => setSceneGone(true));
  };

  const lightCandle = () => {
    if (phase !== "carved") return;
    buzz(10);
    playWhoosh(mutedRef.current);
    setPhase("match");
    const strike = reduce ? 100 : 950;
    after(strike, () => {
      setLit(true);
      playIgnite(mutedRef.current);
      after(500, () => playSparkle(mutedRef.current));
      setPhase("lit");
      after(2200, () => setCanRead(true));
      after(7000, openPage);
    });
  };

  const replay = () => {
    clear();
    skipped.current = false;
    setPhase("idle");
    setDoneCuts(0);
    setNameDone(false);
    setLit(false);
    setCanSkip(false);
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {!sceneGone ? (
        <Scene
          key={`scene-${run}`}
          look={look}
          s={s}
          face={face}
          name={name}
          from={data.senderName}
          to={data.recipientName}
          title={title}
          phase={phase}
          doneCuts={doneCuts}
          nameDone={nameDone}
          lit={lit}
          canSkip={canSkip && phase === "carving"}
          canRead={canRead && phase === "lit"}
          reduce={reduce}
          seed={seed}
          svgRef={svgRef}
          knifeRef={knifeRef}
          leaving={phase === "open"}
          onCarve={carve}
          onLight={lightCandle}
          onRead={openPage}
          onSkip={() => {
            skipped.current = true;
          }}
        />
      ) : null}
      {phase === "open" ? <Page key={`page-${run}`} look={look} s={s} data={data} face={face} name={name} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the pumpkin, uncarved, with the knife beside it. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      <Scene look={look} s={s} face={readFace(fields)} name={readCarving(fields, recipientName)} from={senderName} to={recipientName} title={s.title} phase="idle" doneCuts={0} nameDone={false} lit={false} canSkip={false} canRead={false} reduce seed={1} svgRef={{ current: null }} knifeRef={{ current: null }} leaving={false} inert onCarve={() => {}} onLight={() => {}} onRead={() => {}} onSkip={() => {}} />
    </div>
  );
}

type SceneProps = {
  look: Look;
  s: Copy;
  face: FaceId;
  name: string;
  from: string;
  to: string;
  title: string;
  phase: Phase;
  doneCuts: number;
  nameDone: boolean;
  lit: boolean;
  canSkip: boolean;
  canRead: boolean;
  reduce: boolean;
  seed: number;
  svgRef: Ref<SVGSVGElement>;
  knifeRef: Ref<SVGGElement>;
  leaving: boolean;
  /** A picture of the first screen, with nothing to press: the editor's cover picker puts it inside a button. */
  inert?: boolean;
  onCarve: () => void;
  onLight: () => void;
  onRead: () => void;
  onSkip: () => void;
};

function Scene({ look, s, face, name, from, to, title, phase, doneCuts, nameDone, lit, canSkip, canRead, reduce, seed, svgRef, knifeRef, leaving, inert = false, onCarve, onLight, onRead, onSkip }: SceneProps) {
  const cuts = FACES[face];
  const pieces = useMemo(() => {
    const rng = mulberry32(seed);
    return cuts.map(() => ({ dx: (rng() - 0.5) * 14, rot: (rng() - 0.5) * 260 }));
  }, [cuts, seed]);
  const tappable = !inert && (phase === "idle" || phase === "carved");

  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      {/* the room: a wall, and a table; both warm up when the candle is lit */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 calc(.5*var(--u)), transparent calc(.5*var(--u)) calc(9*var(--u)))" }} />
      <div aria-hidden="true" className={lit && !reduce ? "jl-flicker absolute inset-0" : "absolute inset-0"} style={{ background: `radial-gradient(70% 48% at 50% 52%, ${look.light[2]}${lit ? "66" : "00"}, transparent 70%), radial-gradient(46% 30% at 50% 50%, ${look.light[1]}${lit ? "55" : "00"}, transparent 72%)`, transition: "background 1.4s ease" }} />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ top: "calc(50% + 25 * var(--k))", background: `linear-gradient(180deg, ${look.table[0]}, ${look.table[1]})`, boxShadow: "inset 0 calc(1.4*var(--k)) calc(3*var(--k)) rgba(0,0,0,.55)" }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(2deg, rgba(0,0,0,.35) 0 1px, transparent 1px calc(3.4*var(--k)))" }} />
      </div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(125% 100% at 50% 50%, transparent 55%, rgba(0,0,0,.6))" }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(60% 18% at 50% 63%, ${look.light[1]}${lit ? "44" : "00"}, transparent 72%)`, transition: "background 1.4s ease" }} />
      {lit ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <Ambience layers={[{ kind: "embers", colors: [look.light[1], look.light[2]], count: 16 }, { kind: "dust", colors: [look.light[0], "#FFFFFF"], count: 10 }]} opacity={0.85} />
        </div>
      ) : null}

      <div className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        <div className="absolute inset-x-[8%] text-center" style={{ top: pct(7, 170) }}>
          <p className="text-[calc(2.4*var(--k))] tracking-[0.34em] uppercase opacity-70 [overflow-wrap:anywhere]">{from} → {to}</p>
          <h1 className="mt-[calc(1.8*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 26 ? "calc(6*var(--k))" : "calc(8*var(--k))", color: look.ink, textShadow: `0 0 calc(4*var(--k)) ${look.light[1]}${lit ? "aa" : "44"}` }}>
            {title}
          </h1>
        </div>

        <div className="absolute z-[2]" style={{ left: "4%", top: pct(38, 170), width: "92%", height: pct(84.6, 170) }}>
          <Pumpkin look={look} face={face} name={name} doneCuts={doneCuts} nameDone={nameDone} lit={lit} still={reduce} svgRef={svgRef}>
            <Knife gRef={knifeRef} />
          </Pumpkin>
          {/* the pieces that come out of it fall onto the table */}
          <svg viewBox="0 0 100 92" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {cuts.slice(0, doneCuts).map((cut, i) => (
              <path key={cut.id} d={cut.d} fill={look.skin[1]} stroke={look.skin[2]} strokeWidth=".6" strokeLinejoin="round" className="jl-piece" style={{ "--dx": `${pieces[i].dx.toFixed(1)}px`, "--rot": `${pieces[i].rot.toFixed(0)}deg` } as CSSProperties} />
            ))}
          </svg>
          {tappable ? <button type="button" onClick={phase === "idle" ? onCarve : onLight} aria-label={phase === "idle" ? s.carve : s.light} className="absolute inset-0 z-[3] rounded-[40%] outline-none focus-visible:ring-4 focus-visible:ring-white/50" /> : null}
        </div>

        {/* what is on the table */}
        <div aria-hidden="true" className="pointer-events-none absolute z-[1]" style={{ left: pct(5, 100), top: pct(146, 170), width: pct(21, 100), rotate: "-8deg" }}>
          <Matchbox />
        </div>
        {[
          { x: 74, y: 150, w: 6.4, r: 28 },
          { x: 83, y: 144, w: 6, r: -52 },
          { x: 88, y: 154, w: 6.6, r: 108 },
        ].map((c, i) => (
          <div key={i} aria-hidden="true" className="pointer-events-none absolute z-[1]" style={{ left: pct(c.x, 100), top: pct(c.y, 170), width: pct(c.w, 100), rotate: `${c.r}deg`, filter: "drop-shadow(0 calc(.5*var(--k)) calc(.7*var(--k)) rgba(0,0,0,.5))" }}>
            <CandyCorn />
          </div>
        ))}

        {phase === "match" ? <LitMatch reduce={reduce} /> : null}

        <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: pct(139, 170) }}>
          <TapPill tone={{ page: look.wall[0], glow: [look.light[1], look.light[1]], accent: look.ink, dark: true }} hidden={phase !== "idle" && phase !== "carved"} reduce={reduce}>
            {phase === "carved" ? s.light : s.carve}
          </TapPill>
        </div>
        {canSkip ? (
          <div className="absolute inset-x-0 z-[6] flex justify-center" style={{ top: pct(148, 170) }}>
            <button type="button" onClick={onSkip} className="px-[calc(4*var(--k))] py-[calc(1.6*var(--k))] text-[calc(2.6*var(--k))] tracking-[0.3em] uppercase opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              {s.skip}
            </button>
          </div>
        ) : null}
        {canRead ? (
          <div className="absolute inset-x-0 z-[6] flex justify-center" style={{ top: pct(139, 170) }}>
            <button type="button" onClick={onRead} className="rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ background: "rgba(255,255,255,.16)", color: look.ink, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.22)", backdropFilter: "blur(6px)" }}>
              {s.read}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A struck match coming in from the right to the open mouth of the pumpkin, and dropping away once it has done its work. */
function LitMatch({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute z-[5]"
      style={{ width: pct(8.4, 100), height: pct(31, 170), transformOrigin: "50% 0%" }}
      initial={reduce ? false : { left: "112%", top: pct(143, 170), rotate: -20, opacity: 1 }}
      animate={reduce ? { left: pct(48, 100), top: pct(88, 170), rotate: -52, opacity: 0 } : { left: ["112%", "76%", pct(48, 100), pct(48, 100)], top: [pct(143, 170), pct(112, 170), pct(88, 170), pct(88, 170)], rotate: [-20, -38, -52, -52], opacity: [1, 1, 1, 0] }}
      transition={{ duration: reduce ? 0.2 : 1.35, ease: "easeInOut", times: [0, 0.5, 0.78, 1] }}
    >
      <Match burning />
    </motion.div>
  );
}

function Page({ look, s, data, face, name, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<JackOLanternFields>["data"]; face: FaceId; name: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.paper, cardImage: PAPER_GRAIN, ink: look.paperInk, soft: look.paperSoft, accent: look.accent, edge: look.paperEdge, dark: false, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 9);
    return data.photos.map(() => (rng() - 0.5) * 6);
  }, [data.photos, seed]);

  return (
    <motion.div className="absolute inset-0 z-[20]" style={{ background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.25 }}>
      <div aria-hidden="true" className={still ? "pointer-events-none absolute inset-0" : "jl-flicker pointer-events-none absolute inset-0"} style={{ background: `radial-gradient(80% 34% at 50% 8%, ${look.light[2]}55, transparent 70%), radial-gradient(50% 22% at 50% 12%, ${look.light[1]}40, transparent 72%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "embers", colors: [look.light[1], look.light[2]], count: 14 }, { kind: "dust", colors: [look.light[0], "#FFFFFF"], count: 10 }]} opacity={0.8} />
      </div>
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={s.note.replace("{name}", data.senderName)}
        gallery={s.gallery}
        hero={
          <div className="relative mx-auto w-[min(62cqw,300px)]">
            <div aria-hidden="true" className="absolute rounded-full" style={{ inset: "-28%", background: `radial-gradient(circle, ${look.light[1]}55 0%, ${look.light[2]}22 42%, transparent 68%)` }} />
            <div className="relative aspect-[100/92] w-full">
              <Pumpkin look={look} face={face} name={name} doneCuts={FACES[face].length} nameDone lit still={still} />
            </div>
          </div>
        }
        photo={(slot) => <CandlelitPhoto slot={slot} look={look} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A polaroid lit by the candle: a warm cast on the picture, a glow round the card, a strip of tape. */
function CandlelitPhoto({ slot, look, rot }: { slot: PhotoSlot; look: Look; rot: number }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0 mx-auto w-[min(72cqw,340px)]" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-white/60">
        <div className="relative p-[calc(2.4*var(--u))] pb-[calc(10*var(--u))]" style={{ background: "#fbf5e8", backgroundImage: PAPER_GRAIN, boxShadow: `0 0 calc(14*var(--u)) ${look.light[2]}55, 0 calc(5*var(--u)) calc(9*var(--u)) rgba(0,0,0,.65)` }}>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
            <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" style={{ filter: "sepia(.22) saturate(1.1) brightness(1.02)" }} />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 38%, ${look.light[1]}30, transparent 55%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(20,8,2,.5))`, mixBlendMode: "soft-light" }} />
          </div>
          {photo.caption ? (
            <figcaption className="absolute inset-x-[calc(3*var(--u))] bottom-[calc(2.6*var(--u))] text-center leading-tight" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(3.3*var(--u))", color: "#3a2410" }}>
              {photo.caption}
            </figcaption>
          ) : null}
          <span aria-hidden="true" className="absolute -top-[calc(2*var(--u))] left-1/2 h-[calc(5*var(--u))] w-[calc(22*var(--u))] -translate-x-1/2 -rotate-2" style={{ background: "rgba(230,205,150,.7)", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
        </div>
      </button>
    </figure>
  );
}
