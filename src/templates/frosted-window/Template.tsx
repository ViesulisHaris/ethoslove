"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playScrape, playSparkle } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES } from "../_shared/holiday/materials";
import { HolidayPage, Print, type HolidayTheme, type PhotoSlot } from "../_shared/holiday/page";
import { down, Plate, WIDE_PLATE, Snowfall as PageSnow, Sparks, STAGE, STAGE_KEYFRAMES } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, BOARD, BULBS, SHEETS, SPRITES } from "./art-map";
import { frostGrid, REVEAL_AT, strokePoints, wipeAt, wipedIn, type FrostGrid } from "./frost";
import { INK, LOOKS, type LookId } from "./looks";
import { fieldsSchema, type FrostedWindowFields } from "./schema";

const S = {
  en: {
    title: "look outside",
    sign: "merry christmas, {name}",
    wipe: "wipe the frost away",
    read: "read the letter",
    note: "a note from {name}",
    outside: "outside the window",
    gallery: "this winter",
  },
  es: {
    title: "mira fuera",
    sign: "feliz navidad, {name}",
    wipe: "limpia la escarcha",
    read: "lee la carta",
    note: "una nota de {name}",
    outside: "al otro lado de la ventana",
    gallery: "este invierno",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof FrostedWindowFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "cottage";
  const sign = typeof raw.sign === "string" ? raw.sign.trim().slice(0, 36) : "";
  return { look, sign };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-${size}`, `frost-${lookId}`];
  const note = ["street", "ribbon"];
  return [...scene, ...note].map((n) => `${ART_BASE}${n}.webp`);
}

/* The glass, in stage units (100 across, 170 down), and the snowman's board seen through it. */
const GLASS = { x0: ANCHORS.glassTopLeft.x, y0: ANCHORS.glassTopLeft.y, x1: ANCHORS.glassBottomRight.x, y1: ANCHORS.glassBottomRight.y };
const GW = GLASS.x1 - GLASS.x0;
const GH = GLASS.y1 - GLASS.y0;
const onGlass = ([u, v]: readonly number[]) => ({ x: GLASS.x0 + u * GW, y: GLASS.y0 + v * GH });
const BOARD_BOX = (() => {
  const pts = BOARD.map(onGlass);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
})();
/** The board again, as shares of the glass, with a little room round it. */
const BOARD_SHARE = { u0: Math.min(...BOARD.map((p) => p[0])) - 0.02, v0: Math.min(...BOARD.map((p) => p[1])) - 0.02, u1: Math.max(...BOARD.map((p) => p[0])) + 0.02, v1: Math.max(...BOARD.map((p) => p[1])) + 0.02 };
const frostRect = (look: LookId) => (SPRITES as unknown as Record<string, { x: number; y: number; w: number; h: number }>)[`frost-${look}`] ?? { x: GLASS.x0, y: GLASS.y0, w: GW, h: GH };
/** The brush, as a share of the glass's width. */
const BRUSH = 0.1;

/** The time: kept outside the component, since it is only ever read in a handler or a frame. */
const clockNow = () => performance.now();

/** frost: the glass is frosted over. clear: enough is wiped for the snowman's board to read (the rest of the frost stays until it is wiped too). open: the letter. */
type Phase = "frost" | "clear" | "open";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<FrostedWindowFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|frosted-window`);

  const [phase, setPhase] = useState<Phase>(preview ? "clear" : "frost");
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

  const squeak = useRef(0);
  const onWipe = () => {
    const now = clockNow();
    if (now - squeak.current > 240) {
      squeak.current = now;
      playScrape(mutedRef.current, 220);
      buzz(4);
    }
  };

  const melted = () => {
    setPhase((p) => (p === "frost" ? "clear" : p));
    buzz(25);
    eventRef.current?.({ type: "progress", pct: 25 });
    after(reduce ? 50 : 900, () => {
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1300 });
      eventRef.current?.({ type: "surprise" });
    });
    after(reduce ? 200 : 1800, () => setCanRead(true));
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
    setPhase("frost");
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const sign = f.sign || fill(s.sign, { name: data.recipientName });
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: INK.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          lookId={f.look}
          s={s}
          title={title}
          sign={sign}
          from={data.senderName}
          to={data.recipientName}
          seed={seed}
          phase={phase}
          canRead={canRead && phase === "clear"}
          reduce={reduce}
          leaving={phase === "open"}
          onBegin={begin}
          onWipe={onWipe}
          onMelt={melted}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} sign={sign} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the window frosted over, the words in the frost. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: INK.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} sign="" from={senderName} to={recipientName} seed={1} phase="frost" canRead={false} reduce leaving={false} inert onBegin={() => {}} onWipe={() => {}} onMelt={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
  s: Copy;
  title: string;
  sign: string;
  from: string;
  to: string;
  seed: number;
  phase: Phase;
  canRead: boolean;
  reduce: boolean;
  leaving: boolean;
  inert?: boolean;
  onBegin: () => void;
  onWipe: () => void;
  onMelt: () => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, sign, from, to, seed, phase, canRead, reduce, leaving, inert = false, onBegin, onWipe, onMelt, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  const [touched, setTouched] = useState(false);
  const clearNow = phase !== "frost";
  const rect = frostRect(lookId);
  const boardMiddle = { x: BOARD_BOX.x + BOARD_BOX.w / 2, y: BOARD_BOX.y + BOARD_BOX.h / 2 };
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}${SNOW_KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={lookId} floor={look.floor} bulbs={BULBS} still={reduce} shade={look.vignette} glow={look.glow} width={WIDE_PLATE} />

      <div style={STAGE}>
        {/* outside: snow falling past the glass, and the snowman's board with the words chalked on it */}
        <div aria-hidden="true" className="pointer-events-none absolute overflow-hidden" style={{ left: `${GLASS.x0}%`, top: down(GLASS.y0), width: `${GW}%`, height: down(GH) }}>
          {reduce || inert ? null : <Snowfall seed={seed} />}
        </div>
        <Chalk sign={sign} />

        {inert ? (
          <>
            <img src={`${ART_BASE}frost-${lookId}.webp`} alt="" draggable={false} className="absolute max-w-none" style={{ left: `${rect.x}%`, top: down(rect.y), width: `${rect.w}%`, height: down(rect.h) }} />
            <p className="absolute text-center" style={{ left: `${GLASS.x0}%`, width: `${GW}%`, top: down(GLASS.y0 + GH * 0.26), fontFamily: "var(--gift-font-hand)", fontSize: "calc(9*var(--k))", color: "rgba(40,50,80,.55)", rotate: "-4deg" }}>
              {title}
            </p>
          </>
        ) : (
          <FrostPane key="frost" src={`${ART_BASE}frost-${lookId}.webp`} rect={rect} title={title} label={s.wipe} reduce={reduce} onStart={() => { onBegin(); setTouched(true); }} onWipe={onWipe} onReveal={onMelt} />
        )}
        {clearNow && !reduce ? <Sparks at={boardMiddle} count={14} reach={22} colors={["#ffffff", "#e8f2ff", "#fff6dc", "#cfe2ff"]} seed={4} /> : null}

        {/* the names on the stockings' cuffs */}
        <Cuff at={ANCHORS.cuffLeft} name={from} turn={3} />
        <Cuff at={ANCHORS.cuffRight} name={to} turn={-3} />

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(GLASS.y1 + 38) }}>
            <TapPill tone={tone} reduce={reduce} hidden={phase !== "frost" || touched}>
              {s.wipe}
            </TapPill>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(GLASS.y1 + 37) }}>
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

const SNOW_KEYFRAMES = `
.fw-flake{position:absolute;top:-4%;border-radius:50%;background:#fff;opacity:.85;animation:fw-fall var(--d) linear var(--o) infinite}
@keyframes fw-fall{from{transform:translate(0,0)}to{transform:translate(var(--dx),calc(110 * var(--k)))}}
@media (prefers-reduced-motion: reduce){.fw-flake{animation:none;opacity:0}}
`;

/** Snow falling outside: small, slow, a little sideways, behind the glass. */
function Snowfall({ seed }: { seed: number }) {
  const flakes = useMemo(() => {
    const rnd = mulberry32(seed + 5);
    return Array.from({ length: 34 }, () => ({ x: rnd() * 100, size: 0.35 + rnd() * 0.6, d: 7 + rnd() * 7, o: -rnd() * 14, dx: (rnd() - 0.3) * 10 }));
  }, [seed]);
  return (
    <>
      {flakes.map((f, i) => (
        <span key={i} className="fw-flake" style={{ left: `${f.x}%`, width: `calc(${f.size} * var(--k))`, height: `calc(${f.size} * var(--k))`, filter: f.size < 0.55 ? "blur(.5px)" : undefined, "--d": `${f.d}s`, "--o": `${f.o}s`, "--dx": `calc(${f.dx.toFixed(1)} * var(--k))` } as CSSProperties} />
      ))}
    </>
  );
}

/** The words on the snowman's blackboard, in chalk. */
function Chalk({ sign }: { sign: string }) {
  const size = sign.length <= 14 ? 4.4 : sign.length <= 24 ? 3.6 : 3;
  return (
    <p
      className="pointer-events-none absolute flex items-center justify-center text-center leading-[1.05] text-balance [overflow-wrap:anywhere]"
      style={{ left: `${BOARD_BOX.x}%`, top: down(BOARD_BOX.y), width: `${BOARD_BOX.w}%`, height: down(BOARD_BOX.h), padding: "0 calc(.6*var(--k))", fontFamily: "var(--gift-font-hand)", fontSize: `calc(${size}*var(--k))`, color: "rgba(244,246,240,.92)", textShadow: "0 0 calc(.3*var(--k)) rgba(255,255,255,.45)" }}
    >
      {sign}
    </p>
  );
}

/** A name written on a stocking's white cuff. */
function Cuff({ at, name, turn }: { at: { x: number; y: number }; name: string; turn: number }) {
  const short = name.length > 10 ? `${name.slice(0, 9)}…` : name;
  return (
    <p className="pointer-events-none absolute whitespace-nowrap" style={{ left: `${at.x}%`, top: down(at.y), transform: `translate(-50%, -50%) rotate(${turn}deg)`, fontFamily: "var(--gift-font-hand)", fontSize: `calc(${short.length > 6 ? 3.2 : 4.2}*var(--k))`, lineHeight: 1, color: "#9a1a16" }}>
      {short}
    </p>
  );
}

/** One touch of the fingertip on the frost: a soft-edged round wiped clear. */
function dab(ctx: CanvasRenderingContext2D, el: HTMLCanvasElement, p: { u: number; v: number }) {
  const r = BRUSH * el.width;
  const x = p.u * el.width;
  const y = p.v * el.height;
  const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
  g.addColorStop(0, "rgba(0,0,0,.95)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The frost on the glass: its rendered picture drawn into a canvas, the words already cut into it
 * as if by a finger, and every stroke of the recipient's finger wiping it clear with a soft edge.
 * Only what the finger passes over goes: nothing melts by itself. How much is wiped is kept on a
 * coarse grid, and once most of the snowman's board shows through, the gift is told (`onReveal`).
 * From the keyboard, where there is no finger, Enter clears the whole pane.
 */
function FrostPane({ src, rect, title, label, reduce, onStart, onWipe, onReveal }: { src: string; rect: { x: number; y: number; w: number; h: number }; title: string; label: string; reduce: boolean; onStart: () => void; onWipe: () => void; onReveal: () => void }) {
  const [gone, setGone] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<{ u: number; v: number }[]>([]);
  const grid = useRef<FrostGrid>(frostGrid());
  const last = useRef<{ u: number; v: number } | null>(null);
  const done = useRef(false);
  const aspect = rect.h / rect.w;

  // Draws the frost afresh at the canvas's size: the picture, the words cut into it, and every wipe so far.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let alive = true;
    const img = new Image();
    img.src = src;
    const paint = async () => {
      const box = el.getBoundingClientRect();
      if (!box.width || !img.complete || !img.naturalWidth) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(box.width * dpr);
      el.height = Math.round(box.height * dpr);
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0, el.width, el.height);
      // the words, written into the frost with a fingertip
      const family = getComputedStyle(el).getPropertyValue("--gift-font-hand").trim() || "cursive";
      const size = Math.round(el.width * (title.length > 16 ? 0.1 : 0.14));
      try {
        await document.fonts.load(`${size}px ${family}`);
      } catch {
        // drawn in whatever face there is
      }
      if (!alive) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.translate(el.width / 2, el.height * 0.3);
      ctx.rotate((-4 * Math.PI) / 180);
      ctx.font = `${size}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = size * 0.05;
      ctx.shadowColor = "rgba(0,0,0,.7)";
      ctx.shadowBlur = size * 0.12;
      ctx.strokeStyle = "rgba(0,0,0,.85)";
      ctx.fillStyle = "rgba(0,0,0,.85)";
      const max = el.width * 0.86;
      ctx.fillText(title, 0, 0, max);
      ctx.restore();
      for (const p of strokes.current) dab(ctx, el, p);
    };
    img.onload = () => void paint();
    if (img.complete) void paint();
    const ro = new ResizeObserver(() => void paint());
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [src, title]);

  const at = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width) return null;
    return { u: (e.clientX - box.left) / box.width, v: (e.clientY - box.top) / box.height };
  };

  const wipeTo = (p: { u: number; v: number }) => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    const from = last.current ?? p;
    const pts = last.current ? strokePoints(from, p, BRUSH, aspect) : [p];
    last.current = p;
    for (const q of pts) {
      strokes.current.push(q);
      wipeAt(grid.current, q.u, q.v, BRUSH * 0.85, aspect);
      if (ctx && el) dab(ctx, el, q);
    }
    onWipe();
    if (!done.current && wipedIn(grid.current, BOARD_SHARE) >= REVEAL_AT) {
      done.current = true;
      onReveal();
    }
  };

  const meltNow = () => {
    onStart();
    setGone(true);
    if (done.current) return;
    done.current = true;
    onReveal();
  };

  return (
    <canvas
      ref={canvas}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={(e) => {
        onStart();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const p = at(e);
        last.current = null;
        if (p) wipeTo(p);
      }}
      onPointerMove={(e) => {
        if (!last.current) return;
        const p = at(e);
        if (p) wipeTo(p);
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          meltNow();
        }
      }}
      className="absolute z-[4] cursor-crosshair touch-none outline-none focus-visible:ring-4 focus-visible:ring-white/60"
      style={{ left: `${rect.x}%`, top: down(rect.y), width: `${rect.w}%`, height: down(rect.h), opacity: gone ? 0 : 1, transition: reduce ? undefined : "opacity 1.6s ease", pointerEvents: gone ? "none" : undefined }}
    />
  );
}

/**
 * The note, on the window itself: the street fills the screen, snow falling, and every part of the
 * note is written on a pane of frosted glass.
 */
function Page({ lookId, s, data, sign, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<FrostedWindowFields>["data"]; sign: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: "#14233f", soft: "#4d5f80", accent: "#a8221e", rule: "rgba(20,35,63,.25)", label: "#f4f8ff", face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => ({ print: (rng() - 0.5) * 6, ribbon: (rng() - 0.5) * 10, shift: (rng() - 0.5) * 14 }));
  }, [data.photos, seed]);
  const pane = (children: ReactNode, pad = 7) => (
    <div
      className="relative overflow-hidden rounded-[calc(2.4*var(--u))]"
      style={{ backgroundImage: `linear-gradient(rgba(244,248,255,.5), rgba(236,243,252,.42)), url(${ART_BASE}frost-${lookId}.webp)`, backgroundSize: "auto, 400% 400%", backgroundPosition: "center, 8% 62%", border: "calc(.5*var(--u)) solid rgba(255,255,255,.7)", boxShadow: "inset 0 0 calc(7*var(--u)) rgba(255,255,255,.75), 0 calc(2*var(--u)) calc(6*var(--u)) rgba(2,6,24,.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", padding: `calc(${pad}*var(--u)) calc(6.5*var(--u))`, color: theme.ink }}
    >
      {children}
    </div>
  );
  return (
    <motion.div className="absolute inset-0 z-[20]" initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <HolidayPage
        data={data}
        mode={mode}
        still={still}
        base={ART_BASE}
        look={lookId}
        floor="#0a1024"
        shade={look.veil}
        sheet={SHEETS.letter}
        theme={theme}
        backdrop={
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: "#0a1024" }}>
            <img src={`${ART_BASE}street.webp`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 30%" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(4,8,24,.28), rgba(4,8,24,.5))" }} />
            <PageSnow seed={seed} still={still} />
          </div>
        }
        block={(_, children) => pane(children)}
        hero={
          <div className="mx-auto w-[min(82cqw,420px)]">
            {pane(
              <div className="text-center">
                <p className="tracking-[0.3em] uppercase" style={{ fontSize: "calc(2*var(--u))", color: theme.soft }}>
                  {s.outside}
                </p>
                <p className="leading-[1.1] text-balance [overflow-wrap:anywhere]" style={{ marginTop: "calc(1.4*var(--u))", fontFamily: "var(--gift-font-hand)", fontSize: sign.length > 22 ? "calc(7*var(--u))" : "calc(8.6*var(--u))" }}>
                  {sign}
                </p>
                <p className="tracking-[0.3em] uppercase" style={{ marginTop: "calc(1.6*var(--u))", fontSize: "calc(2*var(--u))", color: theme.soft }}>
                  {data.senderName} → {data.recipientName}
                </p>
              </div>,
              6,
            )}
          </div>
        }
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        photo={(slot) => <Ribboned slot={slot} tilt={tilt[slot.index]} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A photo with a length of red velvet ribbon laid across its top. */
function Ribboned({ slot, tilt }: { slot: PhotoSlot; tilt?: { print: number; ribbon: number; shift: number } }) {
  return (
    <Print
      slot={slot}
      rot={tilt?.print ?? 0}
      holder={
        <img
          src={`${ART_BASE}ribbon.webp`}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute top-0 max-w-none select-none"
          style={{ left: `${(50 + (tilt?.shift ?? 0)).toFixed(1)}%`, width: "70%", transform: `translate(-50%, -50%) rotate(${(tilt?.ribbon ?? -4).toFixed(1)}deg)` }}
        />
      }
    />
  );
}
