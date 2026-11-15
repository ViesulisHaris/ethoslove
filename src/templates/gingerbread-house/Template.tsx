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
import { playChime, playKnock, playSparkle, playTink } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES } from "../_shared/holiday/materials";
import { StepExtra, stepLabel, StepWords, useNoteSteps, useStepKeys, useSteps } from "../_shared/holiday/steps";
import { down, Plate, SoftTable, Sparks, STAGE, STAGE_KEYFRAMES, WIDE_PLATE } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, SPRITES } from "./art-map";
import { ENOUGH, inside, readyMade, SPACING, SWEETS, type Mark, type Pt, type Sweet, type Tool } from "./decorate";
import { INK, LOOKS, type LookId } from "./looks";
import { fieldsSchema, type GingerbreadHouseFields } from "./schema";

const S = {
  en: {
    title: "home sweet home",
    decorate: "decorate the house",
    hint: "pick a sweet, then tap the house",
    icing: "icing",
    undo: "undo",
    open: "open the door",
    read: "read the letter",
    note: "a note from {name}",
    inside: "inside the little house",
    gallery: "from our kitchen",
    sweets: { "gumdrop-red": "red gumdrop", "gumdrop-green": "green gumdrop", peppermint: "peppermint", button: "chocolate button", star: "sugar star", heart: "sugar heart", cane: "candy cane" } as Record<Sweet, string>,
  },
  es: {
    title: "hogar, dulce hogar",
    decorate: "decora la casita",
    hint: "elige un dulce y toca la casita",
    icing: "glaseado",
    undo: "deshacer",
    open: "abre la puerta",
    read: "lee la carta",
    note: "una nota de {name}",
    inside: "dentro de la casita",
    gallery: "desde nuestra cocina",
    sweets: { "gumdrop-red": "gominola roja", "gumdrop-green": "gominola verde", peppermint: "caramelo de menta", button: "botón de chocolate", star: "estrella de azúcar", heart: "corazón de azúcar", cane: "bastón de caramelo" } as Record<Sweet, string>,
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof GingerbreadHouseFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "cosy";
  return { look };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-closed-${size}`, `plate-${lookId}-open-${size}`, `soft-${lookId}-open-${size}`, ...SWEETS];
  return [...scene, "sheet"].map((n) => `${ART_BASE}${n}.webp`);
}

/* The house's front, in stage units (100 across, 170 down), through the scene's lens: where a sweet may be stuck. */
const A = ANCHORS;
const SHAPE: Pt[] = [A.frontBL, A.frontBR, A.frontTR, A.eaveR, A.peak, A.eaveL, A.frontTL];
const DOOR = { x0: A.doorTL.x, y0: A.doorTL.y, x1: A.doorBR.x, y1: A.doorBR.y };
const CORNERS = { bl: A.frontBL, br: A.frontBR, tl: A.frontTL, tr: A.frontTR, peak: A.peak, doorTop: { x: (A.doorTL.x + A.doorBR.x) / 2, y: A.doorTL.y } };
const READY = readyMade(CORNERS);
const sweetSize = (name: Sweet) => (SPRITES as unknown as Record<string, { w: number; h: number }>)[name] ?? { w: 7, h: 7 };
const onDoor = (p: Pt) => p.x > DOOR.x0 - 1 && p.x < DOOR.x1 + 1 && p.y > DOOR.y0 - 1 && p.y < DOOR.y1 + 1;

const KEYFRAMES = `
.gh-pop{animation:gh-pop .34s cubic-bezier(.2,1.7,.4,1) both}
@keyframes gh-pop{from{scale:.3;opacity:0}to{scale:1;opacity:1}}
@media (prefers-reduced-motion: reduce){.gh-pop{animation:none}}
`;

/** bare: being decorated. open: the door is open. letter: the note. */
type Phase = "bare" | "open" | "letter";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<GingerbreadHouseFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|gingerbread-house`);

  const [phase, setPhase] = useState<Phase>(preview ? "open" : "bare");
  const [marks, setMarks] = useState<Mark[]>([]);
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

  /** Adds marks to the house (a sweet pressed on, a line of icing begun), or replaces the last one (a line of icing growing). */
  const mark = (next: Mark[], sound: boolean) => {
    if (phase !== "bare") return;
    begin();
    setMarks(next);
    if (sound) {
      playTink(mutedRef.current, next.length % 8, "rise", 0.35);
      buzz(6);
    }
    eventRef.current?.({ type: "progress", pct: Math.min(20, next.length * 3) });
  };

  const openDoor = () => {
    if (phase !== "bare") return;
    begin();
    setPhase("open");
    buzz(25);
    playKnock(mutedRef.current);
    after(reduce ? 0 : 700, () => {
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1300 });
      eventRef.current?.({ type: "surprise" });
    });
    eventRef.current?.({ type: "progress", pct: 25 });
    after(reduce ? 300 : 3200, () => setCanRead(true));
  };

  const openPage = () => {
    setPhase((p) => {
      if (p === "letter") return p;
      eventRef.current?.({ type: "progress", pct: 35 });
      return "letter";
    });
    clear();
    after(1400, () => setSceneGone(true));
  };

  const replay = () => {
    clear();
    begun.current = false;
    setMarks([]);
    setPhase("bare");
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: INK.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene key={`scene-${run}`} lookId={f.look} s={s} title={title} from={data.senderName} to={data.recipientName} seed={seed} phase={phase} marks={marks} canRead={canRead && phase === "open"} reduce={reduce} leaving={phase === "letter"} onMark={mark} onOpen={openDoor} onRead={openPage} />
      ) : null}
      {phase === "letter" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} title={title} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the house already dressed, its door shut. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: INK.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} from={senderName} to={recipientName} seed={1} phase="bare" marks={READY} canRead={false} reduce leaving={false} inert onMark={() => {}} onOpen={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
  s: Copy;
  title: string;
  from: string;
  to: string;
  seed: number;
  phase: Phase;
  marks: Mark[];
  canRead: boolean;
  reduce: boolean;
  leaving: boolean;
  inert?: boolean;
  onMark: (next: Mark[], sound: boolean) => void;
  onOpen: () => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, from, to, seed, phase, marks, canRead, reduce, leaving, inert = false, onMark, onOpen, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  const stageRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("gumdrop-red");
  const drawing = useRef<{ last: Pt } | null>(null);
  const rnd = useRef(mulberry32(seed + 5));
  const open = phase !== "bare";

  const at = (e: ReactPointerEvent): Pt | null => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box?.width) return null;
    return { x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 170 };
  };
  const stick = (p: Pt): Mark => ({ kind: "sweet", sweet: tool as Sweet, at: p, turn: tool === "cane" ? (rnd.current() - 0.5) * 60 : (rnd.current() - 0.5) * 30 });

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = at(e);
    if (!p || open || !inside(p, SHAPE)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawing.current = { last: p };
    onMark([...marks, tool === "icing" ? { kind: "icing", path: [p] } : stick(p)], true);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drawing.current;
    const p = at(e);
    if (!d || !p || open) return;
    if (!inside(p, SHAPE)) {
      // off the edge of the house: the line ends there, and the next one starts where the finger comes back on
      drawing.current = null;
      return;
    }
    const gone = Math.hypot(p.x - d.last.x, p.y - d.last.y);
    if (tool === "icing") {
      if (gone < 0.7) return;
      d.last = p;
      const lastMark = marks[marks.length - 1];
      if (lastMark?.kind !== "icing") return;
      onMark([...marks.slice(0, -1), { kind: "icing", path: [...lastMark.path, p] }], false);
    } else if (gone >= SPACING) {
      d.last = p;
      onMark([...marks, stick(p)], true);
    }
  };
  const onUp = () => {
    drawing.current = null;
  };
  /** From the keyboard there is no finger: each press sticks on the next few of a ready-made set. */
  const onKey = () => {
    if (open) return;
    const next = READY.slice(0, Math.min(READY.length, marks.length + 4));
    if (next.length > marks.length) onMark(next, true);
  };

  const enough = marks.length >= ENOUGH;
  const shown = open ? marks.filter((m) => m.kind !== "sweet" || !onDoor(m.at)) : marks;
  const doorMiddle = { x: (DOOR.x0 + DOOR.x1) / 2, y: (DOOR.y0 + DOOR.y1) / 2 };
  return (
    <div
      className="absolute inset-0"
      style={
        leaving && !reduce
          ? // in through the little door: the kitchen grows round the doorway until its light is all there is
            { transform: "scale(9)", transformOrigin: `calc(50% + ${(doorMiddle.x - 50).toFixed(2)} * var(--k)) calc(50% + ${(doorMiddle.y - 85 + 4).toFixed(2)} * var(--k))`, opacity: 0, transition: "transform 1.3s cubic-bezier(.6,0,.9,.6), opacity .5s ease .85s" }
          : { opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }
      }
    >
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}${KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={`${lookId}-closed`} floor={look.floor} still={reduce} width={WIDE_PLATE} />
      {/* the same kitchen with the little door open and a light on inside, rendered whole */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: open ? 1 : 0, transition: reduce ? undefined : "opacity 1.4s ease" }}>
        <Plate base={ART_BASE} look={`${lookId}-open`} floor={look.floor} still={reduce} width={WIDE_PLATE} />
      </div>

      <div ref={stageRef} style={STAGE}>
        <div className="pointer-events-none absolute inset-x-[6%] flex flex-col items-center text-center" style={{ top: down(8), color: look.label, textShadow: look.dark ? "0 0 calc(2*var(--k)) rgba(4,8,20,.9)" : "0 0 calc(2*var(--k)) rgba(255,248,236,.9)" }}>
          <p className="max-w-full truncate text-[calc(2.1*var(--k))] tracking-[0.34em] uppercase" style={{ color: look.labelSoft }}>
            {from} → {to}
          </p>
          <h1 className="mt-[calc(1*var(--k))] line-clamp-2 leading-[1.04] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 22 ? "calc(6*var(--k))" : "calc(8.4*var(--k))" }}>
            {title}
          </h1>
        </div>

        {/* what has been done to the house: lines of piped icing, then the sweets stuck over them */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 170" preserveAspectRatio="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {shown.map((m, i) => {
            if (m.kind !== "icing") return null;
            const d = m.path.length > 1 ? m.path.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") : `${m.path[0].x.toFixed(2)},${m.path[0].y.toFixed(2)} ${(m.path[0].x + 0.01).toFixed(2)},${m.path[0].y.toFixed(2)}`;
            return (
              <g key={i}>
                <polyline points={d} stroke="rgba(70,34,10,.38)" strokeWidth={1.9} transform="translate(.3 .45)" />
                <polyline points={d} stroke="#fffdf6" strokeWidth={1.7} />
                <polyline points={d} stroke="rgba(255,255,255,.85)" strokeWidth={0.5} transform="translate(-.22 -.28)" />
              </g>
            );
          })}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {shown.map((m, i) => {
            if (m.kind !== "sweet") return null;
            const sz = sweetSize(m.sweet);
            return (
              <img key={i} src={`${ART_BASE}${m.sweet}.webp`} alt="" draggable={false} className={reduce || inert ? "absolute max-w-none" : "gh-pop absolute max-w-none"} style={{ left: `${m.at.x - sz.w * 0.44}%`, top: down(m.at.y - sz.h * 0.44), width: `${sz.w}%`, height: down(sz.h), rotate: `${m.turn.toFixed(0)}deg` }} />
            );
          })}
        </div>
        {/* the middle of the wall beside the door, for whoever needs to find the house without seeing it (the tests do) */}
        <span data-wall aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${(A.frontBL.x + DOOR.x0) / 2}%`, top: down((A.frontTL.y + A.frontBL.y) / 2), width: 1, height: 1 }} />
        {open && !reduce ? <Sparks at={doorMiddle} count={14} reach={24} colors={["#fff6dc", "#ffc24a", "#ffffff", "#ff9a3a"]} seed={6} /> : null}

        {!inert && !open ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={s.decorate}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onKey();
              }
            }}
            className="absolute inset-0 z-[5] cursor-crosshair touch-none outline-none"
          />
        ) : null}

        {/* the tray: icing and the sweets to choose from, and a way to take the last thing off again */}
        {!inert ? (
          <div className="absolute inset-x-[2%] z-[7] flex items-center justify-center gap-[calc(.8*var(--k))] rounded-[calc(4*var(--k))] px-[calc(1.2*var(--k))] py-[calc(1.2*var(--k))]" style={{ top: down(141), background: "rgba(40,22,10,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.18)", opacity: open ? 0 : 1, pointerEvents: open ? "none" : undefined, transition: "opacity .5s ease" }}>
            {(["icing", ...SWEETS] as Tool[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-label={t === "icing" ? s.icing : s.sweets[t]}
                aria-pressed={tool === t}
                onClick={() => setTool(t)}
                className="relative grid shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ width: "calc(9.6*var(--k))", height: "calc(9.6*var(--k))", background: tool === t ? "rgba(255,246,226,.95)" : "rgba(255,246,226,.2)", boxShadow: tool === t ? `0 0 0 calc(.5*var(--k)) ${look.accent}` : undefined, transition: "background .2s ease" }}
              >
                {t === "icing" ? (
                  <svg viewBox="0 0 24 24" className="h-[66%] w-[66%]" fill="none" strokeLinecap="round">
                    <path d="M3 15c3-7 5 6 8-1s5 6 10-3" stroke="rgba(70,34,10,.35)" strokeWidth="4.6" transform="translate(.5 .8)" />
                    <path d="M3 15c3-7 5 6 8-1s5 6 10-3" stroke="#fffdf6" strokeWidth="4.2" />
                  </svg>
                ) : (
                  <img src={`${ART_BASE}${t}.webp`} alt="" draggable={false} className="max-h-[78%] max-w-[78%] object-contain" />
                )}
              </button>
            ))}
            <button type="button" aria-label={s.undo} disabled={!marks.length} onClick={() => onMark(marks.slice(0, -1), false)} className="grid shrink-0 place-items-center rounded-full text-[calc(4.4*var(--k))] leading-none outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30" style={{ width: "calc(7.6*var(--k))", height: "calc(7.6*var(--k))", color: "#fff6e2" }}>
              ↶
            </button>
          </div>
        ) : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(132.5) }}>
            <TapPill tone={tone} reduce={reduce} hidden={open || marks.length > 0}>
              {s.hint}
            </TapPill>
          </div>
        ) : null}

        {!open && enough && !inert ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(132) }}>
            <motion.button
              type="button"
              onClick={onOpen}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="rounded-full px-[calc(5*var(--k))] py-[calc(1.9*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              style={{ background: "linear-gradient(180deg, #fbe9bd 0%, #e9c777 55%, #c99a3e 100%)", color: "#3a2410", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 0 rgba(120,70,10,.35)" }}
            >
              {s.open}
            </motion.button>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(140) }}>
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

const GINGHAM = "repeating-linear-gradient(0deg, rgba(196,32,42,.5) 0 calc(1.1*var(--u)), transparent calc(1.1*var(--u)) calc(2.2*var(--u))), repeating-linear-gradient(90deg, rgba(196,32,42,.5) 0 calc(1.1*var(--u)), transparent calc(1.1*var(--u)) calc(2.2*var(--u))), #fbf1e2";

/**
 * The note, found inside the little house: a recipe book with a gingerbread cover. The cover opens
 * by itself and after that every part of the note is a page, turned over its spine like a real one:
 * the letter over a few pages, a photo to a page, the surprise, the end.
 */
function Page({ lookId, s, data, title, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<GingerbreadHouseFields>["data"]; title: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const steps = useNoteSteps(data, 200);
  const at = useSteps(steps.length, mode, onEvent);
  const keys = useStepKeys(at.next, at.back);
  const [open, setOpen] = useState(still);
  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [still]);
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => (rng() - 0.5) * 5);
  }, [data.photos, seed]);
  const turn = still ? undefined : "transform .95s cubic-bezier(.45,.05,.3,1)";
  // A leaf turned past upright is gone, and comes back at once when turned back. Its hidden back face
  // is not enough by itself: Safari shows the turned cover as a strip down the left of every page.
  const gone = (turned: boolean, at = 0.47) => `opacity .12s linear ${turned ? at : 0}s`;
  const round = "grid place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-0";
  const leaf = "absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform-origin:0%_50%]";
  return (
    <motion.div {...keys} className="absolute inset-0 z-[20] overflow-hidden outline-none" initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.5 }}>
      <SoftTable base={ART_BASE} look={`${lookId}-open`} floor={look.floor} shade="linear-gradient(180deg, rgba(60,26,6,.5), rgba(40,16,4,.7))" />

      {/* the book: its pages lie one on another, and each turns over the spine on its left */}
      <div className="absolute inset-x-0 mx-auto w-[min(80cqw,420px)]" style={{ top: "calc(15*var(--u))", bottom: "calc(27*var(--u))", perspective: "calc(260*var(--u))" }}>
        {/* the block of pages under the one that shows */}
        <div aria-hidden="true" className="absolute inset-0 rounded-r-[calc(1*var(--u))]" style={{ background: "#efe2c8", boxShadow: "calc(.5*var(--u)) calc(.5*var(--u)) 0 #e3d4b6, calc(1*var(--u)) calc(1*var(--u)) 0 #d6c6a6, calc(1.5*var(--u)) calc(1.5*var(--u)) 0 #c9b896, calc(2*var(--u)) calc(3*var(--u)) calc(7*var(--u)) rgba(0,0,0,.55)" }} />
        {steps.map((step, i) => {
          // only the page that shows and its neighbours are worth drawing
          if (Math.abs(i - at.index) > 1) return null;
          const turned = i < at.index;
          return (
            <div key={i} className={leaf} style={{ zIndex: steps.length - i, transform: turned ? "rotateY(-178deg)" : "rotateY(0deg)", opacity: turned ? 0 : 1, transition: turn && `${turn}, ${gone(turned)}` }}>
              <div className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-r-[calc(1*var(--u))]" style={{ background: "linear-gradient(90deg, #e9dcc0 0%, #fbf4e6 7%, #fdf8ee 60%, #f7efdf 100%)", color: INK.ink, padding: "calc(8*var(--u)) calc(7*var(--u)) calc(9*var(--u)) calc(11*var(--u))", boxShadow: "inset calc(1.5*var(--u)) 0 calc(3*var(--u)) rgba(90,50,20,.18)" }}>
                {/* a strip of gingham down the spine */}
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[calc(4.4*var(--u))]" style={{ background: GINGHAM, boxShadow: "inset calc(-.6*var(--u)) 0 calc(1*var(--u)) rgba(90,30,10,.25)" }} />
                {step.kind === "words" ? (
                  <div className="max-h-full overflow-y-auto scrollbar-none">
                    {step.first ? (
                      <p className="mb-[calc(2.4*var(--u))] text-[calc(2.2*var(--u))] font-semibold tracking-[0.26em] uppercase" style={{ color: INK.soft }}>
                        {fill(s.note, { name: data.senderName })}
                      </p>
                    ) : null}
                    <StepWords data={data} step={step} accent={look.accent} size="calc(4.5*var(--u))" still={still} />
                  </div>
                ) : step.kind === "photo" ? (
                  <figure className="m-0 mx-auto w-[88%]" style={{ rotate: `${(tilt[step.index] ?? 0).toFixed(1)}deg` }}>
                    {/* stuck in with a strip of tape, the way a photo is kept in a recipe book */}
                    <span aria-hidden="true" className="absolute left-1/2 z-[1] h-[calc(3.4*var(--u))] w-[34%] -translate-x-1/2 -translate-y-1/2 -rotate-2" style={{ background: "rgba(246,212,136,.82)", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
                    <div className="bg-white p-[5%] pb-[6%]" style={{ boxShadow: "0 calc(.6*var(--u)) calc(2.4*var(--u)) rgba(60,30,10,.4)" }}>
                      <img src={step.photo.url} alt={step.photo.alt ?? ""} draggable={false} className="block aspect-square w-full object-cover" />
                    </div>
                    {step.photo.caption ? (
                      <figcaption className="mt-[calc(2.6*var(--u))] text-center leading-[1.15] text-balance" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(4.4*var(--u))" }}>
                        {step.photo.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : (
                  <StepExtra step={step} data={data} tone="light" onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
                )}
                <p aria-hidden="true" className="absolute right-[calc(5*var(--u))] bottom-[calc(3*var(--u))] text-[calc(2.2*var(--u))] tracking-[0.2em]" style={{ color: INK.soft }}>
                  {i + 1}
                </p>
                {/* a page of words or a photo is turned by tapping it: its right side for the next, its left for the last */}
                {i === at.index && (step.kind === "words" || step.kind === "photo") ? (
                  <>
                    <button type="button" tabIndex={-1} aria-hidden="true" onClick={at.back} className="absolute inset-y-0 left-0 w-[30%] cursor-pointer outline-none" />
                    <button type="button" tabIndex={-1} aria-hidden="true" onClick={at.next} className="absolute inset-y-0 right-0 w-[70%] cursor-pointer outline-none" />
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        {/* the cover: a slab of gingerbread, its title piped in icing. It opens by itself. */}
        <div aria-hidden={open} className={leaf} style={{ zIndex: steps.length + 2, transform: open ? "rotateY(-178deg)" : "rotateY(0deg)", opacity: open ? 0 : 1, transition: still ? undefined : `transform 1.25s cubic-bezier(.45,.05,.3,1), ${gone(open, 0.62)}` }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[14%] text-center" style={{ backgroundImage: `url(${ART_BASE}sheet.webp)`, backgroundSize: "100% 100%", color: "#fff8ea" }}>
            <p className="text-[calc(2.2*var(--u))] tracking-[0.3em] uppercase" style={{ color: "#f0d2a8" }}>
              {s.inside}
            </p>
            <p className="mt-[calc(2*var(--u))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontWeight: 600, fontSize: "calc(8.6*var(--u))", textShadow: "0 calc(.3*var(--u)) calc(.6*var(--u)) rgba(60,26,6,.55)" }}>
              {title}
            </p>
            <p className="mt-[calc(2.4*var(--u))] text-[calc(2.2*var(--u))] tracking-[0.3em] uppercase" style={{ color: "#f0d2a8" }}>
              {data.senderName} → {data.recipientName}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 mx-auto flex w-[min(80cqw,420px)] items-center justify-between" style={{ bottom: "calc(9*var(--u))", opacity: open ? 1 : 0, transition: "opacity .6s ease .8s" }}>
        <button type="button" aria-label={stepLabel(data.locale, "back")} disabled={at.first} onClick={at.back} className={round} style={{ width: "calc(10*var(--u))", height: "calc(10*var(--u))", background: "rgba(255,246,226,.18)", color: "#fff6e2", fontSize: "calc(5.4*var(--u))", backdropFilter: "blur(4px)" }}>
          ‹
        </button>
        <p className="text-[calc(2.4*var(--u))] tracking-[0.3em] uppercase" style={{ color: "rgba(255,246,226,.85)" }}>
          {at.index + 1} / {steps.length}
        </p>
        <button type="button" aria-label={stepLabel(data.locale, "next")} disabled={at.last} onClick={at.next} className={round} style={{ width: "calc(12*var(--u))", height: "calc(12*var(--u))", background: "linear-gradient(180deg, #fbe9bd, #e9c777 55%, #c99a3e)", color: "#3a2410", fontSize: "calc(6.4*var(--u))", boxShadow: "0 calc(1*var(--u)) calc(3*var(--u)) rgba(0,0,0,.5)" }}>
          ›
        </button>
      </div>
    </motion.div>
  );
}
