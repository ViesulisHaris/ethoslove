"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playChime, playGlow, playJingle, playRustle, playSparkle, playTear, playWhoosh } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { GOLD, LOOKS, printOf, type Look, type LookId, type Paper } from "./looks";
import { Bokeh, CardTag, CREASE, CRUMPLE, FIBRE, FOIL, FOIL_KEYFRAMES, mix, satin, SatinBow, Texture, WOOD } from "../_shared/holiday/materials";
import { barcode, formatCount, PIECES, readStats, tearPieces, unwrapYear, type Stat } from "./year";
import { fieldsSchema, type UnwrappedFields } from "./schema";

const S = {
  en: {
    title: "our year, unwrapped",
    tap: "tap to unwrap",
    next: "tap for the next one",
    last: "one more. the big one.",
    read: "read the letter",
    no: "{year} · no. {n}",
    finale: "and that was {year}",
    tagTo: "to {name}",
    lastTag: "the last one",
    receipt: "{year} unwrapped",
    total: "total",
    totalValue: "one very good year",
    thanks: "thank you for this year",
    again: "please come again",
    printed: "printed {date}",
    fallback: ["365 days of you", "1 favourite person", "0 regrets"],
    note: "a note from {name}",
    gallery: "the year in photos",
  },
  es: {
    title: "nuestro año, desenvuelto",
    tap: "toca para abrirlo",
    next: "toca para el siguiente",
    last: "queda uno. el grande.",
    read: "lee la carta",
    no: "{year} · n.º {n}",
    finale: "y así fue {year}",
    tagTo: "para {name}",
    lastTag: "el último",
    receipt: "{year} desenvuelto",
    total: "total",
    totalValue: "un año buenísimo",
    thanks: "gracias por este año",
    again: "vuelva pronto",
    printed: "impreso el {date}",
    fallback: ["365 días contigo", "1 persona favorita", "0 arrepentimientos"],
    note: "una nota de {name}",
    gallery: "el año en fotos",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const pct = (units: number, of: number) => `${(units / of) * 100}%`;

/** Where each of the four pieces flies when it is torn off, in % of the present: away from the middle, through its own corner. */
const FLIGHT = [
  { x: -70, y: -60, r: -50 },
  { x: 70, y: -60, r: 45 },
  { x: 70, y: 60, r: 60 },
  { x: -70, y: 60, r: -40 },
];

/** unwrapping: one present after another. receipt: the year on one till roll. open: the letter. */
type Phase = "unwrapping" | "receipt" | "open";

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "red";
};
const readLines = (fields: unknown): unknown[] | undefined => {
  const parsed = fieldsSchema.safeParse(fields);
  if (parsed.success) return parsed.data.stats;
  const raw = (fields ?? {}) as { stats?: unknown };
  return Array.isArray(raw.stats) ? raw.stats : undefined;
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<UnwrappedFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const look = LOOKS[readLook(data.fields)];
  const stats = useMemo(() => readStats(readLines(data.fields), s.fallback), [data.fields, s.fallback]);
  const [now] = useState(() => new Date());
  const year = unwrapYear(now);
  const seed = hashString(`${data.recipientName}|${data.senderName}|unwrapped`);

  const [phase, setPhase] = useState<Phase>(preview ? "receipt" : "unwrapping");
  const [index, setIndex] = useState(0);
  const [torn, setTorn] = useState(0);
  const [canRead, setCanRead] = useState(preview);
  const [sceneGone, setSceneGone] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();
  const begun = useRef(false);
  const drag = useRef<{ x: number; y: number; travelled: number; dragged: boolean } | null>(null);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const count = stats.length;
  const finale = index >= count;
  const revealed = torn >= PIECES;

  const begin = () => {
    if (begun.current) return;
    begun.current = true;
    prime();
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  /** Tears `pieces` more off the present in front; when the last one goes, what was inside is out. */
  const tearOff = (pieces: number) => {
    if (phase !== "unwrapping" || revealed) return;
    begin();
    const next = Math.min(PIECES, torn + pieces);
    buzz(10);
    playTear(mutedRef.current, 260 + pieces * 60);
    if (torn === 0) playWhoosh(mutedRef.current, { ms: 420, peak: 0.35 });
    setTorn(next);
    if (next < PIECES) return;
    if (!finale) {
      playChime(mutedRef.current, index % 5, 0.12);
      playSparkle(mutedRef.current, { delay: 0.15, ms: 700 });
      eventRef.current?.({ type: "progress", pct: Math.round(10 + (20 * (index + 1)) / Math.max(1, count)) });
      return;
    }
    playJingle(mutedRef.current, { delay: 0.1, ms: 1200 });
    playGlow(mutedRef.current, { delay: 0.2, ms: 2200 });
    eventRef.current?.({ type: "surprise" });
    after(reduce ? 200 : 1300, () => {
      setPhase("receipt");
      if (!reduce) playRustle(mutedRef.current, { ms: 1500 });
      after(reduce ? 200 : 1900, () => setCanRead(true));
      after(11000, openPage);
    });
  };

  const nextPresent = () => {
    if (phase !== "unwrapping" || !revealed || finale) return;
    buzz(8);
    playWhoosh(mutedRef.current, { ms: 380, peak: 0.5 });
    setIndex((i) => i + 1);
    setTorn(0);
  };

  const tap = () => {
    if (drag.current?.dragged) return;
    if (revealed) nextPresent();
    else tearOff(2);
  };

  // A finger dragged across the paper tears it as it goes: a piece for every stretch of it.
  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, travelled: 0, dragged: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || e.buttons === 0) return;
    d.travelled += Math.hypot(e.clientX - d.x, e.clientY - d.y);
    d.x = e.clientX;
    d.y = e.clientY;
    const stretch = Math.max(40, e.currentTarget.getBoundingClientRect().width / 4);
    if (d.travelled > stretch && !revealed) {
      d.travelled = 0;
      d.dragged = true;
      tearOff(1);
    }
  };
  const onUp = () => {
    // The click that follows a drag is ignored; the next tap is a tap again.
    after(0, () => {
      drag.current = null;
    });
  };

  const openPage = () => {
    setPhase((p) => {
      if (p === "open") return p;
      eventRef.current?.({ type: "progress", pct: 40 });
      return "open";
    });
    clear();
    after(1400, () => setSceneGone(true));
  };

  const replay = () => {
    clear();
    begun.current = false;
    drag.current = null;
    setPhase("unwrapping");
    setIndex(0);
    setTorn(0);
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const date = new Intl.DateTimeFormat(data.locale === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now);

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          look={look}
          s={s}
          stats={stats}
          year={year}
          date={date}
          seed={seed}
          title={title}
          from={data.senderName}
          to={data.recipientName}
          locale={data.locale}
          phase={phase}
          index={index}
          torn={torn}
          reduce={reduce}
          canRead={canRead && phase === "receipt"}
          leaving={phase === "open"}
          onTap={tap}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} look={look} s={s} data={data} stats={stats} year={year} date={date} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the first present, still wrapped. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  const s = S[locale] ?? S.en;
  const stats = readStats(readLines(fields), s.fallback);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink } as CSSProperties}>
      <Scene look={look} s={s} stats={stats} year={unwrapYear(new Date())} date="" seed={hashString(`${recipientName}|${senderName}|unwrapped`)} title={s.title} from={senderName} to={recipientName} locale={locale} phase="unwrapping" index={0} torn={0} reduce canRead={false} leaving={false} inert onTap={() => {}} onDown={() => {}} onMove={() => {}} onUp={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  look: Look;
  s: Copy;
  stats: Stat[];
  year: number;
  date: string;
  seed: number;
  title: string;
  from: string;
  to: string;
  locale: GiftLocale;
  phase: Phase;
  index: number;
  torn: number;
  reduce: boolean;
  canRead: boolean;
  leaving: boolean;
  /** A picture of the first screen with nothing to press: the editor's cover picker puts it inside a button. */
  inert?: boolean;
  onTap: () => void;
  onDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onUp: () => void;
  onRead: () => void;
};

function Scene({ look, s, stats, year, date, seed, title, from, to, locale, phase, index, torn, reduce, canRead, leaving, inert = false, onTap, onDown, onMove, onUp, onRead }: SceneProps) {
  const count = stats.length;
  const finale = index >= count;
  const revealed = torn >= PIECES;
  const paper = finale ? GOLD : look.papers[index % 2];
  const pieces = useMemo(() => tearPieces(seed + index * 7919), [seed, index]);
  const tone = { page: look.wall[0], glow: [look.lights[0], look.lights[0]] as const, accent: look.accent, dark: look.dark };
  const left = Math.max(0, count - index - (revealed ? 1 : 0));
  const hint = torn === 0 ? s.tap : revealed && !finale ? (index === count - 1 ? s.last : s.next) : null;
  const label = revealed ? (index === count - 1 ? s.last : s.next) : s.tap;

  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{FOIL_KEYFRAMES}</style>
      <Room look={look} seed={seed} still={reduce} />

      <div className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        <div className="absolute inset-x-[6%] text-center" style={{ top: pct(5, 170), textShadow: look.dark ? "0 2px 18px rgba(0,0,0,.45)" : "none" }}>
          <p className="text-[calc(2.3*var(--k))] tracking-[0.36em] uppercase opacity-75 [overflow-wrap:anywhere]">
            {from} → {to}
          </p>
          <h1 className="mt-[calc(1.4*var(--k))] leading-[1.02] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 26 ? "calc(5.8*var(--k))" : "calc(7.8*var(--k))", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          {phase === "unwrapping" ? (
            <div aria-hidden="true" className="mt-[calc(2.6*var(--k))] flex items-center justify-center gap-[calc(1.3*var(--k))]">
              {Array.from({ length: count + 1 }, (_, i) => {
                const done = i < index || (i === index && revealed);
                return <span key={i} className="block rounded-full transition-all duration-500" style={{ width: i === index ? "calc(4.6*var(--k))" : "calc(1.4*var(--k))", height: "calc(1.4*var(--k))", background: i === count ? "linear-gradient(135deg,#f7e3a0,#c9962f)" : done || i === index ? look.ink : `${look.ink}40`, opacity: i === index || done || i === count ? 1 : 0.9 }} />;
              })}
            </div>
          ) : null}
        </div>

        {phase === "unwrapping" ? (
          <>
            {/* the ones still waiting, behind */}
            {left >= 1 ? <Mini paper={look.papers[(index + 1) % 2]} style={{ left: pct(-1, 100), top: pct(110, 170), width: pct(27, 100), height: pct(24, 170), rotate: "-5deg" }} /> : null}
            {left >= 2 ? <Mini paper={look.papers[index % 2]} style={{ left: pct(74, 100), top: pct(114, 170), width: pct(24, 100), height: pct(21, 170), rotate: "4deg" }} /> : null}
            {/* where it stands: a soft shadow on the floor */}
            <div aria-hidden="true" className="absolute z-[1] rounded-[50%]" style={{ left: pct(10, 100), top: pct(118, 170), width: pct(80, 100), height: pct(10, 170), background: "radial-gradient(closest-side, rgba(0,0,0,.55), rgba(0,0,0,.2) 60%, transparent)", filter: "blur(calc(.6*var(--k)))" }} />
            <motion.div
              key={`present-${index}`}
              className="absolute z-[2]"
              style={{ left: pct(8, 100), top: pct(44, 170), width: pct(84, 100), height: pct(78, 170) }}
              initial={reduce || index === 0 ? false : { x: "130%", rotate: 7 }}
              animate={{ x: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 130, damping: 17 }}
            >
              <Present paper={paper} pieces={pieces} torn={torn} stat={finale ? null : stats[index]} n={index + 1} year={year} look={look} s={s} locale={locale} to={to} first={index === 0} finale={finale} reduce={reduce} />
              {!inert && !(finale && revealed) ? (
                <button
                  type="button"
                  aria-label={label}
                  onClick={onTap}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  className="absolute -inset-[3%] z-[5] cursor-pointer touch-none rounded-[calc(3*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                />
              ) : null}
            </motion.div>
            {!inert ? (
              <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: pct(144, 170) }}>
                <TapPill tone={tone} reduce={reduce} hidden={!hint}>
                  {hint ?? label}
                </TapPill>
              </div>
            ) : null}
          </>
        ) : (
          <motion.div
            className="absolute z-[2]"
            style={{ left: pct(10, 100), top: pct(25, 170), width: pct(80, 100) }}
            initial={reduce ? false : { clipPath: "inset(0 0 100% 0)", y: -14 }}
            animate={{ clipPath: "inset(0 0 0% 0)", y: 0 }}
            transition={{ duration: 1.5, ease: [0.3, 0.1, 0.3, 1] }}
          >
            <Receipt s={s} stats={stats} year={year} date={date} seed={seed} from={from} to={to} locale={locale} />
          </motion.div>
        )}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: pct(156, 170) }}>
            <button type="button" onClick={onRead} className="rounded-full px-[calc(5*var(--k))] py-[calc(1.9*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ background: `linear-gradient(180deg, ${mix(look.accent, "#ffffff", 0.12)}, ${mix(look.accent, "#000000", 0.12)})`, color: "#fffaf2", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25)" }}>
              {s.read}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The room: a warm wall with lights out of focus behind, a floor with a sheen on it, and the dark at the edges. */
function Room({ look, seed, still }: { look: Look; seed: number; still: boolean }) {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: look.dark ? `radial-gradient(90% 55% at 50% 30%, ${mix(look.wall[0], "#ffd9a0", 0.12)}, transparent 70%)` : `radial-gradient(90% 55% at 50% 30%, #ffffff, transparent 70%)` }} />
      <div aria-hidden="true" className="absolute inset-x-0 top-0" style={{ bottom: "calc(50% - 40 * var(--k))" }}>
        <Bokeh colors={look.lights} count={24} seed={seed} top={4} bottom={92} still={still} strength={look.dark ? 1 : 0.55} />
      </div>
      {/* the floor, edge to edge */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ top: "calc(50% + 40 * var(--k))", background: `linear-gradient(180deg, ${look.floor[0]}, ${look.floor[1]})` }}>
        <Texture image={WOOD} blend="multiply" opacity={look.dark ? 0.55 : 0.18} size="calc(160*var(--k)) calc(40*var(--k))" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,230,190,.16), transparent 30%)" }} />
        <div className="absolute inset-x-0 top-0 h-[calc(1.2*var(--k))]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.35), transparent)" }} />
      </div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: look.dark ? "radial-gradient(120% 90% at 50% 45%, transparent 50%, rgba(0,0,0,.6))" : "radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(150,60,90,.16))" }} />
    </>
  );
}

/** The wrapping on the front of a box: the paper and its print, crumpled and lit from the top left, with the lid's edge across it. */
function Wrap({ paper }: { paper: Paper }) {
  return (
    <>
      {/* the box, below the lid */}
      <div className="absolute inset-x-0 top-[20%] bottom-0 overflow-hidden rounded-b-[calc(1.2*var(--k))]" style={{ background: printOf(paper) }}>
        <Texture image={CRUMPLE} blend="overlay" opacity={0.62} size="calc(80*var(--k))" />
        <Texture image={CREASE} blend="soft-light" opacity={0.55} size="calc(36*var(--k))" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,255,255,.16), transparent 42%, rgba(0,0,0,.32))" }} />
        <div className="absolute inset-x-0 top-0 h-[16%]" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.42), transparent)" }} />
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 calc(2.6*var(--k)) rgba(0,0,0,.28)" }} />
      </div>
      {/* the lid, a little wider than the box */}
      <div className="absolute -inset-x-[2.5%] top-0 h-[22%] overflow-hidden rounded-[calc(1*var(--k))]" style={{ background: printOf(paper), boxShadow: "0 calc(.8*var(--k)) calc(1.4*var(--k)) rgba(0,0,0,.35)" }}>
        <Texture image={CRUMPLE} blend="overlay" opacity={0.45} size="calc(80*var(--k))" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.04) 40%, rgba(0,0,0,.26))" }} />
        <div className="absolute inset-x-0 top-0 h-[calc(.4*var(--k))]" style={{ background: "rgba(255,255,255,.35)" }} />
      </div>
    </>
  );
}

/** A small present still to come. */
function Mini({ paper, style }: { paper: Paper; style: CSSProperties }) {
  return (
    <div aria-hidden="true" className="absolute z-[1]" style={{ ...style, filter: "drop-shadow(0 calc(1.4*var(--k)) calc(1.8*var(--k)) rgba(0,0,0,.45))" }}>
      <Wrap paper={paper} />
      <Ribbons paper={paper} />
      <SatinBow color={paper.ribbon} className="absolute top-[11%] left-1/2 w-[50%] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

/** The two bands of satin round a box, one down and one across, each throwing a little shadow on the paper. */
function Ribbons({ paper }: { paper: Paper }) {
  const band = (angle: number): CSSProperties => ({ background: satin(paper.ribbon, angle), boxShadow: "0 0 calc(1.2*var(--k)) rgba(0,0,0,.38)" });
  return (
    <>
      <div className="absolute top-[56%] -right-[1%] -left-[1%] h-[11%] -translate-y-1/2" style={band(180)} />
      <div className="absolute -top-[1%] -bottom-[1%] left-1/2 w-[11%] -translate-x-1/2" style={band(90)} />
    </>
  );
}

type PresentProps = { paper: Paper; pieces: string[]; torn: number; stat: Stat | null; n: number; year: number; look: Look; s: Copy; locale: GiftLocale; to: string; first: boolean; finale: boolean; reduce: boolean };

/** One present: the card inside it, the paper over it in four pieces, and the ribbon and bow over that. */
function Present({ paper, pieces, torn, stat, n, year, look, s, locale, to, first, finale, reduce }: PresentProps) {
  const revealed = torn >= PIECES;
  return (
    <div className="relative h-full w-full">
      {/* inside: a card of heavy stock in a gold frame */}
      <div className="absolute inset-x-0 top-[2%] bottom-0 grid place-items-center overflow-hidden rounded-[calc(1.6*var(--k))] p-[calc(5*var(--k))] text-center" style={{ background: `linear-gradient(160deg, ${mix(look.card, "#ffffff", 0.4)}, ${look.card} 55%, ${mix(look.card, "#b89a70", 0.18)})`, color: look.cardInk, boxShadow: "0 calc(2*var(--k)) calc(6*var(--k)) rgba(0,0,0,.4), inset 0 0 calc(3*var(--k)) rgba(120,90,50,.18)" }}>
        <Texture image={FIBRE} blend="multiply" opacity={0.5} size="calc(30*var(--k))" />
        <div aria-hidden="true" className="absolute inset-[4.5%] rounded-[calc(.8*var(--k))]" style={{ boxShadow: "inset 0 0 0 calc(.3*var(--k)) rgba(176,126,40,.55), inset 0 0 0 calc(.9*var(--k)) transparent, inset 0 0 0 calc(1.15*var(--k)) rgba(176,126,40,.35)" }} />
        <div className="relative w-full">{finale ? <Finale look={look} s={s} year={year} revealed={revealed} reduce={reduce} /> : stat ? <StatCard stat={stat} n={n} year={year} look={look} s={s} locale={locale} revealed={revealed} reduce={reduce} /> : null}</div>
      </div>
      {/* the paper, torn off in pieces */}
      <div className="pointer-events-none absolute inset-0" style={{ filter: "drop-shadow(0 calc(1.2*var(--k)) calc(1.6*var(--k)) rgba(0,0,0,.4))" }}>
        {pieces.map((clip, i) => {
          const gone = i < torn;
          const f = FLIGHT[i];
          return (
            <motion.div
              key={i}
              className="absolute -inset-x-[3%] inset-y-0"
              style={{ clipPath: clip }}
              initial={false}
              animate={gone ? (reduce ? { opacity: 0 } : { x: `${f.x}%`, y: `${f.y}%`, rotate: f.r, opacity: 0 }) : { x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={gone ? { duration: reduce ? 0.2 : 0.8, ease: [0.2, 0.6, 0.4, 1] } : { duration: 0 }}
            >
              <div className="absolute inset-x-[3%] inset-y-0">
                <Wrap paper={paper} />
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* the ribbon and the bow go with the first tear */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" initial={false} animate={torn > 0 ? (reduce ? { opacity: 0 } : { y: "-34%", opacity: 0, scale: 1.08 }) : { y: 0, opacity: 1, scale: 1 }} transition={{ duration: torn > 0 ? 0.55 : 0, ease: "easeOut" }}>
        <Ribbons paper={paper} />
        <SatinBow color={paper.ribbon} className="absolute top-[11%] left-1/2 w-[50%] -translate-x-1/2 -translate-y-1/2" />
        {first || finale ? <CardTag text={finale ? s.lastTag : fill(s.tagTo, { name: to })} /> : null}
      </motion.div>
    </div>
  );
}

/** What one present held: a number in gold foil counting up to what you typed, and what it counts. */
function StatCard({ stat, n, year, look, s, locale, revealed, reduce }: { stat: Stat; n: number; year: number; look: Look; s: Copy; locale: GiftLocale; revealed: boolean; reduce: boolean }) {
  const [progress, setProgress] = useState(reduce ? 1 : 0);
  useEffect(() => {
    if (!revealed || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1300);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, reduce]);
  const big = formatCount(stat, revealed ? progress : 0, locale);
  const numberless = stat.value === null;
  const foil = reduce ? { ...FOIL, animation: "none" } : FOIL;
  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-[calc(2.2*var(--k))] font-semibold tracking-[0.3em] uppercase" style={{ color: look.cardSoft }}>
        {fill(s.no, { year, n })}
      </p>
      {numberless ? (
        <p className="mt-[calc(3*var(--k))] leading-[1.12] text-balance [overflow-wrap:anywhere]" style={{ ...foil, fontFamily: POSTER_FONT, fontStyle: "italic", fontSize: stat.label.length > 24 ? "calc(6.6*var(--k))" : "calc(8.4*var(--k))" }}>
          {stat.label}
        </p>
      ) : (
        <>
          <p className="mt-[calc(1.6*var(--k))] leading-none tabular-nums [overflow-wrap:anywhere]" style={{ ...foil, fontFamily: POSTER_FONT, fontWeight: 600, fontSize: big.length > 7 ? "calc(12.5*var(--k))" : "calc(17.5*var(--k))", filter: "drop-shadow(0 1px 0 rgba(255,255,255,.6))" }}>
            {big}
          </p>
          {stat.label ? (
            <p className="mt-[calc(2.2*var(--k))] leading-[1.15] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(5.6*var(--k))" }}>
              {stat.label}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** The last present: the gold one, with the year in it. */
function Finale({ look, s, year, revealed, reduce }: { look: Look; s: Copy; year: number; revealed: boolean; reduce: boolean }) {
  return (
    <motion.div className="flex flex-col items-center" initial={false} animate={revealed && !reduce ? { scale: [0.9, 1.05, 1] } : { scale: 1 }} transition={{ duration: 0.7 }}>
      <p className="leading-[1.08] italic" style={{ ...(reduce ? { ...FOIL, animation: "none" } : FOIL), fontFamily: POSTER_FONT, fontSize: "calc(8.8*var(--k))" }}>
        {fill(s.finale, { year })}
      </p>
      <div aria-hidden="true" className="mt-[calc(2.4*var(--k))] flex gap-[calc(2*var(--k))]">
        {[0.8, 1.2, 0.8].map((sz, i) => (
          <svg key={i} viewBox="0 0 20 20" style={{ width: `calc(${3 * sz}*var(--k))` }}>
            <defs>
              <linearGradient id={`fs${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f7e3a0" />
                <stop offset=".5" stopColor="#c9962f" />
                <stop offset="1" stopColor="#8f6216" />
              </linearGradient>
            </defs>
            <path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z" fill={`url(#fs${i})`} />
          </svg>
        ))}
      </div>
      <p className="mt-[calc(2*var(--k))] text-[calc(2.4*var(--k))] tracking-[0.3em] uppercase" style={{ color: look.cardSoft }}>
        {s.lastTag}
      </p>
    </motion.div>
  );
}

/** The year, itemised on a till roll: what was typed, a total, and a barcode made from the names. */
function Receipt({ s, stats, year, date, seed, from, to, locale, compact = false }: { s: Copy; stats: Stat[]; year: number; date: string; seed: number; from: string; to: string; locale: GiftLocale; compact?: boolean }) {
  const bars = useMemo(() => barcode(seed), [seed]);
  const mono = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
  const u = compact ? "var(--u)" : "var(--k)";
  const size = (n: number) => `calc(${n} * ${u})`;
  return (
    <div className="relative mx-auto text-left" style={{ background: "linear-gradient(180deg, #fdfcf8, #f3f0e7 70%, #e9e5da)", color: "#2a2622", fontFamily: mono, padding: `${size(5)} ${size(5)} ${size(4)}`, boxShadow: `0 ${size(2.4)} ${size(7)} rgba(0,0,0,.5), inset ${size(1)} 0 ${size(2)} rgba(0,0,0,.05), inset -${size(1)} 0 ${size(2)} rgba(0,0,0,.05)`, fontSize: size(2.9), lineHeight: 1.45 }}>
      <Texture image={FIBRE} blend="multiply" opacity={0.45} size={size(28)} />
      <div className="relative">
        <p className="text-center font-bold tracking-[0.18em] uppercase" style={{ fontSize: size(3.6) }}>
          ✶ {fill(s.receipt, { year })} ✶
        </p>
        <p className="mt-[0.3em] text-center tracking-[0.12em] uppercase [overflow-wrap:anywhere]">
          {from} + {to}
        </p>
        {date ? <p className="text-center opacity-60">{fill(s.printed, { date })}</p> : null}
        <p aria-hidden="true" className="my-[0.5em] overflow-hidden whitespace-nowrap opacity-60">
          {"-".repeat(60)}
        </p>
        <ul className="m-0 list-none p-0">
          {stats.map((st, i) => (
            <li key={i} className="flex gap-[1em]">
              <span className="w-[7.5ch] shrink-0 text-right font-bold">{st.value === null ? "✶" : formatCount(st, 1, locale)}</span>
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{st.value === null ? st.label : st.label || "·"}</span>
            </li>
          ))}
        </ul>
        <p aria-hidden="true" className="my-[0.5em] overflow-hidden whitespace-nowrap opacity-60">
          {"-".repeat(60)}
        </p>
        <p className="flex justify-between gap-[1em] font-bold uppercase" style={{ fontSize: size(3.3) }}>
          <span>{s.total}</span>
          <span className="text-right normal-case">{s.totalValue}</span>
        </p>
        <p aria-hidden="true" className="my-[0.5em] overflow-hidden whitespace-nowrap opacity-60">
          {"=".repeat(60)}
        </p>
        <div aria-hidden="true" className="mx-auto mt-[0.8em] flex h-[3.4em] w-[78%] items-stretch justify-between">
          {bars.map((w, i) => (
            <span key={i} className="block" style={{ width: `${w * 0.55}%`, background: i % 2 ? "transparent" : "#2a2622" }} />
          ))}
        </div>
        <p className="mt-[0.6em] text-center tracking-[0.1em] uppercase">{s.thanks}</p>
        <p className="text-center opacity-60">{s.again}</p>
      </div>
      {/* the torn edge at the bottom of the roll */}
      <div aria-hidden="true" className="absolute inset-x-0 -bottom-[calc(1.2*var(--k))] h-[calc(1.3*var(--k))]" style={{ background: "linear-gradient(-45deg, transparent 33%, #e9e5da 33% 66%, transparent 66%) 0 0 / calc(2.4*var(--k)) 100%, linear-gradient(45deg, transparent 33%, #e9e5da 33% 66%, transparent 66%) 0 0 / calc(2.4*var(--k)) 100%" }} />
    </div>
  );
}

function Page({ look, s, data, stats, year, date, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<UnwrappedFields>["data"]; stats: Stat[]; year: number; date: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.card, cardImage: PAPER_GRAIN, ink: look.cardInk, soft: look.cardSoft, accent: look.accent, edge: "rgba(0,0,0,.08)", dark: false, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 3);
    return data.photos.map(() => (rng() - 0.5) * 6);
  }, [data.photos, seed]);
  return (
    <motion.div className="absolute inset-0 z-[20]" style={{ background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)` }} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Bokeh colors={look.lights} count={16} seed={seed} still={still} strength={look.dark ? 0.8 : 0.45} />
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
          <div className="mx-auto w-[min(76cqw,380px)]" style={{ rotate: "-1.5deg" }}>
            <Receipt s={s} stats={stats} year={year} date={date} seed={seed} from={data.senderName} to={data.recipientName} locale={data.locale} compact />
          </div>
        }
        photo={(slot) => <Polaroid slot={slot} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

function Polaroid({ slot, rot }: { slot: PhotoSlot; rot: number }) {
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
      </button>
    </figure>
  );
}
