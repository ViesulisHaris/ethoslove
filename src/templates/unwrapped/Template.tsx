"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playGlow, playJingle, playRustle, playSparkle, playTear, playWhoosh } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES, FOIL_ON_LIGHT, mix } from "../_shared/holiday/materials";
import { HolidayPage, PaperSheet, Print, type HolidayTheme, type PhotoSlot } from "../_shared/holiday/page";
import { down, laid, Plate, Sparks, Sprite, STAGE, STAGE_KEYFRAMES } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, BULBS, SHEETS, SPRITES } from "./art-map";
import { LOOKS, type Look, type LookId, type Wrapping } from "./looks";
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

/** Where each of the four pieces of paper goes when it is torn off, in % of the present: away from the middle, through its own corner. */
const FLIGHT = [
  { x: -62, y: -54, r: -38 },
  { x: 62, y: -54, r: 34 },
  { x: 62, y: 54, r: 46 },
  { x: -62, y: 54, r: -30 },
];

/** unwrapping: one present after another. receipt: the year on one till roll. open: the letter. */
type Phase = "unwrapping" | "receipt" | "open";

export const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "red";
};
const readLines = (fields: unknown): unknown[] | undefined => {
  const parsed = fieldsSchema.safeParse(fields);
  if (parsed.success) return parsed.data.stats;
  const raw = (fields ?? {}) as { stats?: unknown };
  return Array.isArray(raw.stats) ? raw.stats : undefined;
};

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const look = LOOKS[lookId];
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-${size}`, `open-${lookId}`, "tag", ...[look.presents[0], look.presents[1], look.last].flatMap((w) => [`box-${w.paper}`, `ribbon-${w.ribbon}`])];
  const note = [`soft-${lookId}-${size}`, ...["letter", "receipt"].flatMap((p) => [`sheet-${p}-top`, `sheet-${p}-mid`, `sheet-${p}-bottom`]), "tape"];
  const names = [...scene, ...note];
  return [...new Set(names)].map((n) => `${ART_BASE}${n}.webp`);
}

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<UnwrappedFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const lookId = readLook(data.fields);
  const look = LOOKS[lookId];
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
    after(reduce ? 200 : 1500, () => {
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
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          lookId={lookId}
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
        <Page key={`page-${run}`} lookId={lookId} s={s} data={data} stats={stats} year={year} date={date} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the first present, still wrapped. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const lookId = readLook(fields);
  const look = LOOKS[lookId];
  const s = S[locale] ?? S.en;
  const stats = readStats(readLines(fields), s.fallback);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: look.ink } as CSSProperties}>
      <Scene lookId={lookId} s={s} stats={stats} year={unwrapYear(new Date())} date="" seed={hashString(`${recipientName}|${senderName}|unwrapped`)} title={s.title} from={senderName} to={recipientName} locale={locale} phase="unwrapping" index={0} torn={0} reduce canRead={false} leaving={false} inert onTap={() => {}} onDown={() => {}} onMove={() => {}} onUp={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
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

function Scene({ lookId, s, stats, year, date, seed, title, from, to, locale, phase, index, torn, reduce, canRead, leaving, inert = false, onTap, onDown, onMove, onUp, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const count = stats.length;
  const finale = index >= count;
  const revealed = torn >= PIECES;
  const wrapping = finale ? look.last : look.presents[index % 2];
  const pieces = useMemo(() => tearPieces(seed + index * 7919), [seed, index]);
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  const hint = torn === 0 ? s.tap : revealed && !finale ? (index === count - 1 ? s.last : s.next) : null;
  const label = revealed ? (index === count - 1 ? s.last : s.next) : s.tap;
  const box = SPRITES[`box-${wrapping.paper}`];

  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={lookId} floor={look.floor} bulbs={BULBS} still={reduce} shade={look.vignette} glow={look.glow} />

      <div style={STAGE}>
        <div className="absolute inset-x-[6%] text-center" style={{ top: down(10), textShadow: look.dark ? "0 calc(.4*var(--k)) calc(3*var(--k)) rgba(0,0,0,.6)" : "0 1px 0 rgba(255,255,255,.35)" }}>
          <p className="text-[calc(2.3*var(--k))] tracking-[0.36em] uppercase opacity-80 [overflow-wrap:anywhere]">
            {from} → {to}
          </p>
          <h1 className="mt-[calc(1.4*var(--k))] leading-[1.02] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 26 ? "calc(5.8*var(--k))" : "calc(7.8*var(--k))", letterSpacing: "-0.01em" }}>
            {title}
          </h1>
          {phase === "unwrapping" ? (
            <div aria-hidden="true" className="mt-[calc(2.4*var(--k))] flex items-center justify-center gap-[calc(1.3*var(--k))]">
              {Array.from({ length: count + 1 }, (_, i) => {
                const done = i < index || (i === index && revealed);
                return <span key={i} className="block rounded-full transition-all duration-500" style={{ width: i === index ? "calc(4.6*var(--k))" : "calc(1.4*var(--k))", height: "calc(1.4*var(--k))", background: i === count ? "linear-gradient(135deg,#f7e3a0,#c9962f)" : done || i === index ? look.ink : `${look.ink}55`, boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />;
              })}
            </div>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {phase === "unwrapping" ? (
            <motion.div
              key={`present-${index}`}
              className="absolute inset-0"
              initial={reduce ? { opacity: 0 } : { x: "112%", rotate: 5 }}
              animate={reduce ? { opacity: 1 } : { x: 0, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "-118%", rotate: -5 }}
              transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 110, damping: 17 }}
            >
              <Present lookId={lookId} wrapping={wrapping} pieces={pieces} torn={torn} stat={finale ? null : stats[index]} n={index + 1} year={year} s={s} locale={locale} to={to} first={index === 0} finale={finale} reduce={reduce} />
              {!inert && !(finale && revealed) ? (
                <button
                  type="button"
                  aria-label={label}
                  onClick={onTap}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  className="z-[5] cursor-pointer touch-none rounded-[calc(3*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  style={laid({ x: box.x - 2, y: box.y - 2, w: box.w + 4, h: box.h + 4 })}
                />
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="receipt"
              className="absolute"
              style={{ left: "10%", top: down(25), width: "80%", rotate: "-1.2deg" }}
              initial={reduce ? false : { clipPath: "inset(0 0 100% 0)", y: -14 }}
              animate={{ clipPath: "inset(0 0 -10% 0)", y: 0 }}
              transition={{ duration: 1.5, ease: [0.3, 0.1, 0.3, 1] }}
            >
              <Receipt s={s} stats={stats} year={year} date={date} seed={seed} from={from} to={to} locale={locale} />
            </motion.div>
          )}
        </AnimatePresence>

        {!inert && phase === "unwrapping" ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(141) }}>
            <TapPill tone={tone} reduce={reduce} hidden={!hint}>
              {hint ?? label}
            </TapPill>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(153) }}>
            <button type="button" onClick={onRead} className="rounded-full px-[calc(5*var(--k))] py-[calc(1.9*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ background: `linear-gradient(180deg, ${mix(look.accent, "#ffffff", 0.12)}, ${mix(look.accent, "#000000", 0.12)})`, color: "#fffaf2", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.25)" }}>
              {s.read}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type PresentProps = { lookId: LookId; wrapping: Wrapping; pieces: string[]; torn: number; stat: Stat | null; n: number; year: number; s: Copy; locale: GiftLocale; to: string; first: boolean; finale: boolean; reduce: boolean };

/**
 * One present, in the layers it was rendered in: the opened box with its card (and the shadow all of
 * it throws), the wrapping paper over that in four pieces that tear away, and the ribbon and bow on top.
 */
function Present({ lookId, wrapping, pieces, torn, stat, n, year, s, locale, to, first, finale, reduce }: PresentProps) {
  const look = LOOKS[lookId];
  const revealed = torn >= PIECES;
  const box = SPRITES[`box-${wrapping.paper}`];
  const card = ANCHORS.card;
  const half = { w: ANCHORS.cardCorner.x - card.x, h: card.y - ANCHORS.cardCorner.y };
  return (
    <>
      <Sprite base={ART_BASE} name={`open-${lookId}`} rect={SPRITES[`open-${lookId}`]} />
      <div className="grid place-items-center text-center" style={{ ...laid({ x: card.x - half.w * 0.86, y: card.y - half.h * 0.86, w: half.w * 1.72, h: half.h * 1.72 }), color: look.cardInk }}>
        {finale ? <Finale look={look} s={s} year={year} revealed={revealed} reduce={reduce} /> : stat ? <StatCard stat={stat} n={n} year={year} look={look} s={s} locale={locale} revealed={revealed} reduce={reduce} /> : null}
      </div>
      {revealed && !reduce ? <Sparks at={card} seed={n} count={finale ? 26 : 16} reach={finale ? 46 : 36} /> : null}

      {/* the paper, torn off in pieces */}
      {pieces.map((clip, i) => {
        const gone = i < torn;
        const f = FLIGHT[i];
        return (
          <motion.div
            key={i}
            style={{ ...laid(box), clipPath: clip, pointerEvents: "none" }}
            initial={false}
            animate={gone ? (reduce ? { opacity: 0 } : { x: `${f.x}%`, y: `${f.y}%`, rotate: f.r, scale: 1.06, opacity: 0 }) : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
            transition={gone ? { duration: reduce ? 0.2 : 0.85, ease: [0.2, 0.6, 0.4, 1], opacity: { duration: reduce ? 0.2 : 0.85, ease: "easeIn" } } : { duration: 0 }}
          >
            <img src={`${ART_BASE}box-${wrapping.paper}.webp`} alt="" draggable={false} className="block h-full w-full max-w-none" />
          </motion.div>
        );
      })}

      {/* the ribbon and the bow go with the first tear */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" initial={false} animate={torn > 0 ? (reduce ? { opacity: 0 } : { y: "-7%", opacity: 0, scale: 1.05 }) : { y: 0, opacity: 1, scale: 1 }} transition={{ duration: torn > 0 ? 0.55 : 0, ease: "easeOut" }}>
        <Sprite base={ART_BASE} name={`ribbon-${wrapping.ribbon}`} rect={SPRITES[`ribbon-${wrapping.ribbon}`]} />
        {first || finale ? (
          <>
            <Sprite base={ART_BASE} name="tag" rect={SPRITES.tag} />
            <TagWords text={finale ? s.lastTag : fill(s.tagTo, { name: to })} />
          </>
        ) : null}
      </motion.div>
    </>
  );
}

/** The words on the tag, in a hand; smaller the more of them there are, so a long name is not cut short. */
function TagWords({ text }: { text: string }) {
  const size = text.length > 13 ? 2.7 : text.length > 9 ? 3.2 : 4;
  return (
    <p className="absolute truncate text-center" style={{ left: `${ANCHORS.tag.x + 1.4}%`, top: down(ANCHORS.tag.y), width: "18.5%", transform: "translate(-50%, -50%) rotate(8deg)", fontFamily: SCRIPT_FONT, fontSize: `calc(${size}*var(--k))`, lineHeight: 1.2, color: "#3a2416" }}>
      {text}
    </p>
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
  const foil = reduce ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT;
  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-[calc(2.1*var(--k))] font-semibold tracking-[0.3em] uppercase" style={{ color: look.cardSoft }}>
        {fill(s.no, { year, n })}
      </p>
      {numberless ? (
        <p className="mt-[calc(2.6*var(--k))] leading-[1.1] text-balance [overflow-wrap:anywhere]" style={{ ...foil, fontFamily: POSTER_FONT, fontStyle: "italic", fontWeight: 600, fontSize: stat.label.length > 24 ? "calc(6*var(--k))" : "calc(7.6*var(--k))" }}>
          {stat.label}
        </p>
      ) : (
        <>
          <p className="mt-[calc(1.2*var(--k))] leading-none tabular-nums [overflow-wrap:anywhere]" style={{ ...foil, fontFamily: POSTER_FONT, fontWeight: 600, fontSize: big.length > 7 ? "calc(10.5*var(--k))" : "calc(15.5*var(--k))" }}>
            {big}
          </p>
          {stat.label ? (
            <p className="mt-[calc(1.8*var(--k))] leading-[1.15] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(5*var(--k))" }}>
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
      <p className="leading-[1.08] italic" style={{ ...(reduce ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), fontFamily: POSTER_FONT, fontWeight: 600, fontSize: "calc(8*var(--k))" }}>
        {fill(s.finale, { year })}
      </p>
      <p className="mt-[calc(2.2*var(--k))] text-[calc(2.3*var(--k))] tracking-[0.3em] uppercase" style={{ color: look.cardSoft }}>
        ✶ {s.lastTag} ✶
      </p>
    </motion.div>
  );
}

/** The year as a till receipt, on the receipt's own paper: as long as there are lines to print. */
function Receipt({ s, stats, year, date, seed, from, to, locale, compact = false }: { s: Copy; stats: Stat[]; year: number; date: string; seed: number; from: string; to: string; locale: GiftLocale; compact?: boolean }) {
  const bars = useMemo(() => barcode(seed), [seed]);
  const mono = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
  const u = compact ? "var(--u)" : "var(--k)";
  const size = (n: number) => `calc(${n} * ${u})`;
  return (
    <PaperSheet base={ART_BASE} art={SHEETS.receipt} margin={0.06} head={0.085} tail={0.1}>
      <div className="text-left" style={{ color: "#2a2622", fontFamily: mono, fontSize: size(2.9), lineHeight: 1.45 }}>
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
    </PaperSheet>
  );
}

/** The note: the receipt on the table, the letter on a gold-lined card under it, then the year's photos, taped down. */
function Page({ lookId, s, data, stats, year, date, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<UnwrappedFields>["data"]; stats: Stat[]; year: number; date: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: look.cardInk, soft: look.cardSoft, accent: look.accent, rule: "rgba(120,84,30,.3)", label: "#fff6ea", face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 3);
    return data.photos.map(() => ({ print: (rng() - 0.5) * 6, tape: (rng() - 0.5) * 16 - 2, shift: (rng() - 0.5) * 18 }));
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
          <div className="mx-auto w-[min(74cqw,380px)]" style={{ rotate: "-1.5deg" }}>
            <Receipt s={s} stats={stats} year={year} date={date} seed={seed} from={data.senderName} to={data.recipientName} locale={data.locale} compact />
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

/** A photo of the year: a print, held down by a strip of gold tape over its top edge. */
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
          style={{ left: `${(50 + (tilt?.shift ?? 0)).toFixed(1)}%`, width: "36%", transform: `translate(-50%, -54%) rotate(${(tilt?.tape ?? -3).toFixed(1)}deg)` }}
        />
      }
    />
  );
}
