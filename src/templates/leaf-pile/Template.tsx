"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playRustle, playSparkle, playWhoosh } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES, FOIL_ON_LIGHT } from "../_shared/holiday/materials";
import { HolidayPage, PaperSheet, Print, type HolidayTheme, type PhotoSlot } from "../_shared/holiday/page";
import { down, Plate, Sparks, STAGE, STAGE_KEYFRAMES } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, BULBS, SHEETS, SPRITES } from "./art-map";
import { brush, gust, LEAF_SPRITES, onCard, scatter, step, type Box, type Leaf } from "./leaves";
import { INK, LOOKS, type LookId } from "./looks";
import { fieldsSchema, type LeafPileFields } from "./schema";

const S = {
  en: {
    title: "thankful for you",
    line: "for every cold hand in my pocket",
    brush: "brush the leaves away",
    read: "read the letter",
    note: "a note from {name}",
    gallery: "this autumn",
  },
  es: {
    title: "doy gracias por ti",
    line: "por cada mano fría en mi bolsillo",
    brush: "aparta las hojas",
    read: "lee la carta",
    note: "una nota de {name}",
    gallery: "este otoño",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof LeafPileFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "deck";
  const line = typeof raw.line === "string" ? raw.line.trim().slice(0, 120) : "";
  return { look, line };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-${size}`, ...LEAF_SPRITES];
  const note = [`soft-${lookId}-${size}`, "sheet-letter-top", "sheet-letter-mid", "sheet-letter-bottom", "twig"];
  return [...scene, ...note].map((n) => `${ART_BASE}${n}.webp`);
}

/* The card, in stage units (100 across, 170 down), and how much of the pile has to go before the wind takes the rest. */
const CARD: Box = { x0: ANCHORS.cardTopLeft.x, y0: ANCHORS.cardTopLeft.y, x1: ANCHORS.cardBottomRight.x, y1: ANCHORS.cardBottomRight.y };
const MIDDLE = ANCHORS.card;
const CLEARED = 0.78;
const size = (name: string) => (SPRITES as unknown as Record<string, { w: number; h: number }>)[name] ?? { w: 16, h: 18 };

/** Where a leaf is drawn: its middle at (x, y) on the stage, turned and sized. */
const place = (l: Leaf) => {
  const s = size(l.sprite);
  return `translate(calc(${(l.x - (s.w * l.scale) / 2).toFixed(2)} * var(--k)), calc(${(l.y - (s.h * l.scale) / 2).toFixed(2)} * var(--k))) rotate(${l.rot.toFixed(1)}deg)`;
};

/** The time: kept outside the component, since it is only ever read in a handler or a frame. */
const clockNow = () => performance.now();

/** pile: leaves on the card. clear: it is all blown away and the card reads. open: the letter. */
type Phase = "pile" | "clear" | "open";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<LeafPileFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|leaf-pile`);

  const [phase, setPhase] = useState<Phase>(preview ? "clear" : "pile");
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

  const cleared = () => {
    setPhase("clear");
    buzz(25);
    playWhoosh(mutedRef.current, { ms: 900, peak: 0.3 });
    eventRef.current?.({ type: "progress", pct: 25 });
    after(reduce ? 50 : 700, () => {
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1100 });
      eventRef.current?.({ type: "surprise" });
    });
    after(reduce ? 200 : 2200, () => setCanRead(true));
    after(12000, openPage);
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
    setPhase("pile");
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: INK.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          lookId={f.look}
          s={s}
          title={title}
          line={f.line || s.line}
          from={data.senderName}
          to={data.recipientName}
          seed={seed}
          phase={phase}
          canRead={canRead && phase === "clear"}
          reduce={reduce}
          leaving={phase === "open"}
          muted={mutedRef}
          onBegin={begin}
          onCleared={cleared}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} title={title} line={f.line || s.line} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the card under its leaves. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  const seed = hashString(`${recipientName}|${senderName}|leaf-pile`);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: INK.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} line="" from={senderName} to={recipientName} seed={seed} phase="pile" canRead={false} reduce leaving={false} inert onBegin={() => {}} onCleared={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
  s: Copy;
  title: string;
  line: string;
  from: string;
  to: string;
  seed: number;
  phase: Phase;
  canRead: boolean;
  reduce: boolean;
  leaving: boolean;
  inert?: boolean;
  muted?: RefObject<boolean>;
  onBegin: () => void;
  onCleared: () => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, line, from, to, seed, phase, canRead, reduce, leaving, inert = false, muted, onBegin, onCleared, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  // The leaves move outside React: their places are written straight onto their pictures each frame.
  const [initial] = useState(() => scatter(seed, CARD));
  const leaves = useRef<Leaf[]>(initial.map((l) => ({ ...l })));
  const els = useRef<(HTMLImageElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const finger = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const rustled = useRef(0);
  const done = useRef(false);
  const startOn = useRef(onCard(initial, CARD));
  const [touched, setTouched] = useState(false);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const draw = () => {
    leaves.current.forEach((l, i) => {
      const el = els.current[i];
      if (el) el.style.transform = place(l);
    });
  };

  const settle = () => {
    if (done.current) return;
    const left = onCard(leaves.current, CARD);
    if (left <= Math.max(2, startOn.current * (1 - CLEARED))) {
      done.current = true;
      gust(leaves.current, MIDDLE, seed);
      if (reduce) {
        // no slide: they are simply gone
        for (const l of leaves.current) l.x += 400;
        draw();
      } else run();
      onCleared();
    }
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last.current) / 1000 || 0.016);
    last.current = now;
    const moving = step(leaves.current, dt);
    draw();
    settle();
    raf.current = moving ? requestAnimationFrame(tick) : 0;
  };
  const run = () => {
    if (raf.current) return;
    last.current = clockNow();
    raf.current = requestAnimationFrame(tick);
  };

  const at = (e: ReactPointerEvent) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box?.width) return null;
    return { x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 170 };
  };

  const shove = (p: { x: number; y: number }, v: { x: number; y: number }, reach?: number, force?: number) => {
    const moved = brush(leaves.current, p, v, reach, force);
    if (!moved) return;
    const now = clockNow();
    if (now - rustled.current > 150) {
      rustled.current = now;
      playRustle(muted?.current ?? false, { ms: 320 });
      buzz(4);
    }
    if (reduce) {
      // without motion a leaf goes straight to where it would have slid to
      for (const l of leaves.current) {
        l.x += l.vx * 0.3;
        l.y += l.vy * 0.3;
        l.vx = l.vy = l.vr = 0;
      }
      draw();
      settle();
    } else run();
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "pile" || done.current) return;
    const p = at(e);
    if (!p) return;
    onBegin();
    setTouched(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    finger.current = { ...p, t: clockNow(), moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = finger.current;
    if (!g || done.current) return;
    const p = at(e);
    if (!p) return;
    const now = clockNow();
    const dt = Math.max(0.008, (now - g.t) / 1000);
    const v = { x: (p.x - g.x) / dt, y: (p.y - g.y) / dt };
    if (Math.hypot(p.x - g.x, p.y - g.y) < 0.3) return;
    finger.current = { ...p, t: now, moved: true };
    shove(p, v);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = finger.current;
    finger.current = null;
    if (!g || done.current) return;
    // a tap blows on the leaves under it
    if (!g.moved) shove(at(e) ?? g, { x: 0, y: 0 }, 22, 150);
  };

  const keyGust = () => {
    if (done.current) return;
    onBegin();
    setTouched(true);
    done.current = true;
    gust(leaves.current, MIDDLE, seed);
    if (reduce) {
      for (const l of leaves.current) l.x += 400;
      draw();
    } else run();
    onCleared();
  };

  const clearNow = phase !== "pile";
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={lookId} floor={look.floor} bulbs={BULBS} still={reduce} shade={look.vignette} glow={look.glow} />

      <div ref={stageRef} style={STAGE}>
        <CardWords title={title} line={line} from={from} to={to} reduce={reduce} lit={clearNow} />

        {/* the pile */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {initial.map((l, i) => {
            const sz = size(l.sprite);
            return (
              <img
                key={i}
                ref={(el) => {
                  els.current[i] = el;
                }}
                src={`${ART_BASE}${l.sprite}.webp`}
                alt=""
                draggable={false}
                className="absolute top-0 left-0 max-w-none select-none"
                style={{ width: `${(sz.w * l.scale).toFixed(2)}%`, height: down(sz.h * l.scale), transform: place(l), willChange: inert ? undefined : "transform" }}
              />
            );
          })}
        </div>
        {clearNow && !reduce ? <Sparks at={MIDDLE} count={16} reach={34} colors={["#fff6dc", "#f0c27a", "#ffffff", "#e9a95a"]} seed={9} /> : null}

        {!inert && phase === "pile" ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={s.brush}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => (finger.current = null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                keyGust();
              }
            }}
            className="absolute inset-0 z-[5] cursor-grab touch-none outline-none focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-inset"
          />
        ) : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(CARD.y1 + 14) }}>
            <TapPill tone={tone} reduce={reduce} hidden={phase !== "pile" || touched}>
              {s.brush}
            </TapPill>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(CARD.y1 + 13) }}>
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

/** What is written on the rendered card, under the leaves: who it is from, the title in foil, the line, the name. */
function CardWords({ title, line, from, to, reduce, lit }: { title: string; line: string; from: string; to: string; reduce: boolean; lit: boolean }) {
  const foil = reduce || !lit ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT;
  return (
    <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center" style={{ left: `${CARD.x0 + 6}%`, width: `${CARD.x1 - CARD.x0 - 12}%`, top: down(CARD.y0 + 4), height: down(CARD.y1 - CARD.y0 - 8), rotate: "2deg", color: INK.ink }}>
      <p className="max-w-full truncate text-[calc(2*var(--k))] tracking-[0.32em] uppercase" style={{ color: INK.soft }}>
        {from} → {to}
      </p>
      <h1 className="mt-[calc(1.2*var(--k))] line-clamp-2 leading-[1.02] text-balance italic [overflow-wrap:anywhere]" style={{ ...foil, fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 24 ? "calc(6.4*var(--k))" : "calc(9*var(--k))" }}>
        {title}
      </h1>
      {line ? (
        <p className="mt-[calc(1.6*var(--k))] line-clamp-3 leading-[1.15] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: line.length > 70 ? "calc(3.8*var(--k))" : "calc(4.5*var(--k))" }}>
          {line}
        </p>
      ) : null}
    </div>
  );
}

/** The note: the card again, the letter on a sheet of its paper, then the photos, each held down by a twig. */
function Page({ lookId, s, data, title, line, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<LeafPileFields>["data"]; title: string; line: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: INK.ink, soft: INK.soft, accent: look.accent, rule: "rgba(140,90,40,.3)", label: "#fff6ea", face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => ({ print: (rng() - 0.5) * 6, twig: (rng() - 0.5) * 14, shift: (rng() - 0.5) * 14 }));
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
          <div className="mx-auto w-[min(82cqw,420px)]" style={{ rotate: "-1.5deg" }}>
            <PaperSheet base={ART_BASE} art={SHEETS.letter} margin={0.11} head={0.11} tail={0.1}>
              <div className="text-center" style={{ color: INK.ink }}>
                <p className="tracking-[0.3em] uppercase" style={{ fontSize: "calc(2*var(--u))", color: INK.soft }}>
                  {data.senderName} → {data.recipientName}
                </p>
                <p className="leading-[1.04] text-balance italic [overflow-wrap:anywhere]" style={{ ...(still ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), marginTop: "calc(1.4*var(--u))", fontFamily: POSTER_FONT, fontWeight: 600, fontSize: "calc(7*var(--u))" }}>
                  {title}
                </p>
                {line ? (
                  <p className="text-balance [overflow-wrap:anywhere]" style={{ marginTop: "calc(1.8*var(--u))", fontFamily: "var(--gift-font-hand)", fontSize: "calc(4.2*var(--u))", lineHeight: 1.2 }}>
                    {line}
                  </p>
                ) : null}
              </div>
            </PaperSheet>
          </div>
        }
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        photo={(slot) => <Twigged slot={slot} tilt={tilt[slot.index]} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A photo with a twig laid across its top, a leaf still on it. */
function Twigged({ slot, tilt }: { slot: PhotoSlot; tilt?: { print: number; twig: number; shift: number } }) {
  return (
    <Print
      slot={slot}
      rot={tilt?.print ?? 0}
      holder={
        <img
          src={`${ART_BASE}twig.webp`}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute top-0 max-w-none select-none"
          style={{ left: `${(50 + (tilt?.shift ?? 0)).toFixed(1)}%`, width: "92%", transform: `translate(-50%, -48%) rotate(${(tilt?.twig ?? -4).toFixed(1)}deg)` }}
        />
      }
    />
  );
}
