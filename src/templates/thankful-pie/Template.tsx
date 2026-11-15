"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playScrape, playScribble, playSparkle } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { HolidayPage, PaperSheet, Print, type HolidayTheme, type PhotoSlot } from "../_shared/holiday/page";
import { down, Plate, Sparks, Sprite, STAGE, STAGE_KEYFRAMES } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, BULBS, SHEETS, SPRITES } from "./art-map";
import { CARD, LOOKS, type LookId } from "./looks";
import { pickSlice, SLICES, sliceAt, takeSlice, wedgeClip, type Pie } from "./pie";
import { DEFAULT_INGREDIENTS, fieldsSchema, type ThankfulPieFields } from "./schema";

const S = {
  en: {
    title: "us",
    recipeFor: "recipe for",
    kitchen: "from the kitchen of {name}",
    lift: "lift a slice",
    rest: "take the rest",
    serves: "serves: the two of us",
    read: "read the letter",
    note: "a note from {name}",
    gallery: "from the table",
    slice: "slice {n} of {all}",
    thanks: "thank you for this year, {name}",
  },
  es: {
    title: "nosotros",
    recipeFor: "receta de",
    kitchen: "de la cocina de {name}",
    lift: "toma un trozo",
    rest: "llévate el resto",
    serves: "raciones: para los dos",
    read: "lee la carta",
    note: "una nota de {name}",
    gallery: "desde la mesa",
    slice: "trozo {n} de {all}",
    thanks: "gracias por este año, {name}",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof ThankfulPieFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "linen";
  const list = Array.isArray(raw.ingredients) ? raw.ingredients : parsed.success ? [] : DEFAULT_INGREDIENTS;
  const ingredients = list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, 48))
    .filter(Boolean)
    .slice(0, SLICES);
  return { look, ingredients };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-${size}`, "pie", ...Array.from({ length: SLICES }, (_, i) => `slice${i}`)];
  const note = [`soft-${lookId}-${size}`, "sheet-letter-top", "sheet-letter-mid", "sheet-letter-bottom", "tape"];
  return [...scene, ...note].map((n) => `${ART_BASE}${n}.webp`);
}

/*
 * The pie, in stage units (100 across, 170 down). Each slice is a picture the size of its own
 * rectangle; its middle and the way it comes out of the tin are in the map. Seen from 20 degrees,
 * the round tin is 6% shorter than it is wide.
 */
const CENTRE = ANCHORS.pie;
const RADIUS = ANCHORS.pieEdge.x - ANCHORS.pie.x;
const SQUASH = Math.cos((20 * Math.PI) / 180);
const RULE = (i: number) => ANCHORS[`rule${i}` as keyof typeof ANCHORS];
const CARD_TL = ANCHORS.cardTopLeft;
const CARD_BR = ANCHORS.cardBottomRight;
const CARD_TURN = 1.2;
const WEDGES = Array.from({ length: SLICES }, (_, i) => wedgeClip(i, SPRITES.pie, CENTRE, RADIUS, SQUASH));

/** table: slices left to take. done: the recipe is written. open: the letter. */
type Phase = "table" | "done" | "open";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ThankfulPieFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|thankful-pie`);

  const [pie, setPie] = useState<Pie>({ taken: [], written: 0 });
  const [phase, setPhase] = useState<Phase>(preview ? "done" : "table");
  const [canRead, setCanRead] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const begun = useRef(false);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const begin = () => {
    if (begun.current) return;
    begun.current = true;
    prime();
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  const finish = () => {
    setPhase("done");
    buzz(30);
    eventRef.current?.({ type: "progress", pct: 25 });
    after(reduce ? 50 : 500, () => {
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1100 });
      eventRef.current?.({ type: "surprise" });
    });
    after(reduce ? 200 : 2000, () => setCanRead(true));
    after(12000, openPage);
  };

  /** A tap on the pie: the slice under the finger comes out (or the nearest one left), and the next ingredient is written. */
  const lift = (index: number) => {
    if (phase !== "table") return;
    begin();
    const next = takeSlice(pie, index, f.ingredients.length);
    if (next === pie) return;
    setPie(next);
    buzz(10);
    playScrape(mutedRef.current, 380);
    if (next.written > pie.written) after(reduce ? 0 : 420, () => playScribble(mutedRef.current, 700));
    if (next.taken.length === SLICES) after(reduce ? 0 : 900, finish);
  };

  const onPie = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width) return;
    // the button is the pie's square; where in it the finger came down picks the slice
    const dx = ((e.clientX - box.left) / box.width) * 2 - 1;
    const dy = ((e.clientY - box.top) / box.height) * 2 - 1;
    lift(pickSlice(dx, dy, pie.taken));
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
    begun.current = false;
    setPie({ taken: [], written: 0 });
    setPhase("table");
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: CARD.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          lookId={f.look}
          s={s}
          title={title}
          from={data.senderName}
          to={data.recipientName}
          ingredients={f.ingredients}
          pie={pie}
          phase={phase}
          canRead={canRead && phase === "done"}
          reduce={reduce}
          leaving={phase === "open"}
          onPie={onPie}
          onKey={() => lift(-1)}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} title={title} ingredients={f.ingredients} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the whole pie, and the card with nothing on it yet. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: CARD.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} from={senderName} to={recipientName} ingredients={[]} pie={{ taken: [], written: 0 }} phase="table" canRead={false} reduce leaving={false} inert onPie={() => {}} onKey={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
  s: Copy;
  title: string;
  from: string;
  to: string;
  ingredients: string[];
  pie: Pie;
  phase: Phase;
  canRead: boolean;
  reduce: boolean;
  leaving: boolean;
  inert?: boolean;
  onPie: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onKey: () => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, from, to, ingredients, pie, phase, canRead, reduce, leaving, inert = false, onPie, onKey, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  const allWritten = pie.written >= ingredients.length;
  const hint = allWritten && pie.taken.length > 0 && pie.taken.length < SLICES ? s.rest : s.lift;
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{STAGE_KEYFRAMES}</style>
      <Plate base={ART_BASE} look={lookId} floor={look.floor} bulbs={BULBS} still={reduce} shade={look.vignette} glow={look.glow} />

      <div style={STAGE}>
        <p className="absolute inset-x-0 truncate text-center text-[calc(2.2*var(--k))] tracking-[0.34em] uppercase" style={{ top: down(CARD_TL.y - 6), color: look.label, opacity: 0.85 }}>
          {from} → {to}
        </p>

        <RecipeCard s={s} title={title} from={from} ingredients={ingredients} written={pie.written} done={phase !== "table"} reduce={reduce} />

        {/* the pie as it stands, one wedge of its picture for each slice still in the tin */}
        {Array.from({ length: SLICES }, (_, i) =>
          pie.taken.includes(i) ? null : <Sprite key={`in-${i}`} base={ART_BASE} name="pie" rect={SPRITES.pie} style={{ clipPath: WEDGES[i] }} />,
        )}
        {/* and each slice that has been lifted, on its way out of the tin the way it points */}
        {pie.taken.map((i) => {
          const at = sliceAt(i);
          return (
            <motion.div
              key={`out-${i}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ x: `${at.dx}%`, y: `${((at.dy / 170) * 100).toFixed(3)}%`, scale: 1.05, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.85, ease: [0.3, 0.6, 0.35, 1], opacity: { duration: 0.85, ease: [0.7, 0, 0.9, 0.6] } }}
              style={{ transformOrigin: `${at.x}% ${((at.y / 170) * 100).toFixed(3)}%` }}
            >
              <Sprite base={ART_BASE} name={`slice${i}`} rect={SPRITES[`slice${i}` as keyof typeof SPRITES]} />
            </motion.div>
          );
        })}
        {/* in the empty tin, once the recipe is done: a line to the one it was for */}
        {phase !== "table" ? (
          <motion.p
            className="pointer-events-none absolute text-center text-balance"
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.5, ease: "easeOut" }}
            style={{ left: `${CENTRE.x - RADIUS * 0.62}%`, width: `${RADIUS * 1.24}%`, top: down(CENTRE.y), y: "-50%", fontFamily: "var(--gift-font-hand)", fontSize: "calc(5.4*var(--k))", lineHeight: 1.1, color: "#8a4a22", rotate: "-4deg" }}
          >
            {fill(s.thanks, { name: to })}
          </motion.p>
        ) : null}
        {phase !== "table" && !reduce ? <Sparks at={CENTRE} count={14} reach={26} colors={["#fff6dc", "#f0c27a", "#ffffff", "#e9a95a"]} seed={7} /> : null}

        {!inert && phase === "table" ? (
          <button
            type="button"
            aria-label={hint}
            onPointerDown={onPie}
            onClick={(e) => {
              // A keyboard press has no pointer before it: it takes the next slice.
              if (e.detail === 0) onKey();
            }}
            className="absolute z-[5] cursor-pointer touch-manipulation rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            style={{ left: `${CENTRE.x - RADIUS}%`, top: down(CENTRE.y - RADIUS * SQUASH), width: `${RADIUS * 2}%`, height: down(RADIUS * 2 * SQUASH) }}
          />
        ) : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(CENTRE.y + RADIUS * SQUASH + 7) }}>
            <TapPill tone={tone} reduce={reduce} hidden={phase !== "table" || (pie.taken.length > 0 && !allWritten)}>
              {hint}
            </TapPill>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(CENTRE.y + RADIUS * SQUASH + 6) }}>
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

/**
 * What is written on the rendered card: its heading over the red line, then an ingredient on each
 * blue line, in the order the slices came out, and how many it serves once the tin is empty.
 * Every line sits on a rule whose place the map gives.
 */
function RecipeCard({ s, title, from, ingredients, written, done, reduce }: { s: Copy; title: string; from: string; ingredients: string[]; written: number; done: boolean; reduce: boolean }) {
  const right = CARD_BR.x - 3;
  const rows = [...ingredients.slice(0, written).map((text, i) => ({ text, i, serves: false })), ...(done ? [{ text: s.serves, i: ingredients.length, serves: true }] : [])];
  const head = ANCHORS.cardMargin;
  return (
    <div className="pointer-events-none absolute inset-0" style={{ color: CARD.ink }}>
      <p className="absolute truncate text-right text-[calc(1.7*var(--k))] tracking-[0.18em] uppercase" style={{ left: `${head.x}%`, width: `${right - head.x}%`, top: down(CARD_TL.y + 2.2), transform: `rotate(${CARD_TURN}deg)`, color: CARD.soft }}>
        {fill(s.kitchen, { name: from })}
      </p>
      <div className="absolute flex items-baseline gap-[calc(1.6*var(--k))] whitespace-nowrap" style={{ left: `${head.x + 1.6}%`, width: `${right - head.x - 1.6}%`, bottom: `${100 - ((head.y - 0.5) / 170) * 100}%`, transform: `rotate(${CARD_TURN}deg)`, transformOrigin: "left bottom" }}>
        <span className="text-[calc(2*var(--k))] font-semibold tracking-[0.24em] uppercase" style={{ color: CARD.red }}>
          {s.recipeFor}
        </span>
        <span className="truncate italic" style={{ fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 18 ? "calc(4*var(--k))" : "calc(5.6*var(--k))", lineHeight: 1, color: CARD.ink }}>
          {title}
        </span>
      </div>
      {rows.map(({ text, i, serves }) => {
        const line = RULE(Math.min(i, 6));
        return (
          <div key={`${i}-${text}`} className="absolute" style={{ left: `${line.x - 4.6}%`, width: `${right - line.x + 4.6}%`, bottom: `${100 - ((line.y - 0.35) / 170) * 100}%`, transform: `rotate(${CARD_TURN}deg)`, transformOrigin: "left bottom" }}>
            <motion.p
              className="flex items-baseline whitespace-nowrap"
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: Math.min(1.4, 0.35 + text.length * 0.025), ease: "linear", delay: serves ? 0.3 : 0.4 }}
            >
              <span className="w-[calc(4.6*var(--k))] shrink-0 text-center text-[calc(2.7*var(--k))] font-semibold" style={{ color: serves ? CARD.red : CARD.blue }}>
                {serves ? "♥" : i + 1}
              </span>
              <span className="truncate" style={{ fontFamily: "var(--gift-font-hand)", fontSize: `calc(${text.length > 38 ? 3.3 : 3.9}*var(--k))`, lineHeight: 1.05, color: serves ? CARD.red : CARD.ink, paddingLeft: "calc(1.2*var(--k))" }}>
                {text}
              </span>
            </motion.p>
          </div>
        );
      })}
    </div>
  );
}

/** The recipe again, whole, on a sheet of the card's paper: the note's first thing. `unit` is the page's. */
function RecipeSheet({ s, title, from, ingredients }: { s: Copy; title: string; from: string; ingredients: string[] }) {
  const size = (n: number) => `calc(${n} * var(--u))`;
  return (
    <PaperSheet base={ART_BASE} art={SHEETS.letter} margin={0.1} head={0.1} tail={0.09}>
      <div style={{ color: CARD.ink }}>
        <p className="text-right tracking-[0.18em] uppercase" style={{ fontSize: size(1.9), color: CARD.soft }}>
          {fill(s.kitchen, { name: from })}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-[calc(1.6*var(--u))] border-b-2 pb-[calc(1*var(--u))]" style={{ marginTop: size(2), borderColor: CARD.red }}>
          <span className="font-semibold tracking-[0.24em] uppercase" style={{ fontSize: size(2.3), color: CARD.red }}>
            {s.recipeFor}
          </span>
          <span className="italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontWeight: 600, fontSize: size(6.4), lineHeight: 1.05 }}>
            {title}
          </span>
        </p>
        <ol style={{ marginTop: size(1.4) }}>
          {[...ingredients, s.serves].map((text, i) => {
            const serves = i === ingredients.length;
            return (
              <li key={i} className="flex items-baseline border-b" style={{ borderColor: "rgba(95,134,176,.45)", paddingTop: size(1.5), paddingBottom: size(0.5) }}>
                <span className="shrink-0 text-center font-semibold" style={{ width: size(4.6), fontSize: size(2.4), color: serves ? CARD.red : CARD.blue }}>
                  {serves ? "♥" : i + 1}
                </span>
                <span className="[overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: size(3.6), lineHeight: 1.15, color: serves ? CARD.red : CARD.ink }}>
                  {text}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </PaperSheet>
  );
}

/** The note: the recipe on its card, the letter on a sheet of the same paper under it, then the photos, taped down. */
function Page({ lookId, s, data, title, ingredients, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<ThankfulPieFields>["data"]; title: string; ingredients: string[]; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: CARD.ink, soft: CARD.soft, accent: look.accent, rule: "rgba(95,134,176,.35)", label: "#fff6ea", face: "hand" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => ({ print: (rng() - 0.5) * 6, tape: (rng() - 0.5) * 10, shift: (rng() - 0.5) * 16 }));
  }, [data.photos, seed]);
  return (
    <motion.div className="absolute inset-0 z-[20]" initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <HolidayPage
        data={data}
        mode={mode}
        still={still}
        base={ART_BASE}
        look={lookId}
        floor={look.floor}
        shade={look.veil}
        sheet={SHEETS.letter}
        frame={0.05}
        theme={theme}
        hero={
          <div className="mx-auto w-[min(84cqw,430px)]" style={{ rotate: "-1.2deg" }}>
            <RecipeSheet s={s} title={title} from={data.senderName} ingredients={ingredients} />
          </div>
        }
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        photo={(slot) => <Taped slot={slot} tilt={tilt[slot.index]} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A photo held down by a strip of the washi tape. */
function Taped({ slot, tilt }: { slot: PhotoSlot; tilt?: { print: number; tape: number; shift: number } }) {
  return (
    <Print
      slot={slot}
      rot={tilt?.print ?? 0}
      holder={
        <img
          src={`${ART_BASE}tape.webp`}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute top-0 max-w-none select-none"
          style={{ left: `${(50 + (tilt?.shift ?? 0)).toFixed(1)}%`, width: "40%", transform: `translate(-50%, -54%) rotate(${(tilt?.tape ?? -3).toFixed(1)}deg)` }}
        />
      }
    />
  );
}
