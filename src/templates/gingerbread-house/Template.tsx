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
import { FOIL_KEYFRAMES, FOIL_ON_LIGHT } from "../_shared/holiday/materials";
import { HolidayPage, PaperSheet, Print, type HolidayTheme } from "../_shared/holiday/page";
import { PAPER, PAPER_BASE } from "../_shared/holiday/paper";
import { down, Plate, Sparks, STAGE, STAGE_KEYFRAMES, WIDE_PLATE } from "../_shared/holiday/stage";
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
  return [...scene.map((n) => `${ART_BASE}${n}.webp`), ...["top", "mid", "bottom"].map((n) => `${PAPER_BASE}sheet-letter-${n}.webp`)];
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
      playTink(mutedRef.current, next.length % 8, "rise");
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
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
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

/** The note: a card from inside the little house, the letter under it, then the photos. */
function Page({ lookId, s, data, title, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<GingerbreadHouseFields>["data"]; title: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: INK.ink, soft: INK.soft, accent: look.accent, rule: "rgba(120,84,30,.3)", label: "#fff6ea", face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => (rng() - 0.5) * 6);
  }, [data.photos, seed]);
  return (
    <motion.div className="absolute inset-0 z-[20]" initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <HolidayPage
        data={data}
        mode={mode}
        still={still}
        base={ART_BASE}
        paperBase={PAPER_BASE}
        look={`${lookId}-open`}
        floor={look.floor}
        shade={look.veil}
        sheet={PAPER}
        frame={0.05}
        theme={theme}
        hero={
          <div className="mx-auto w-[min(80cqw,410px)]" style={{ rotate: "-1.5deg" }}>
            <PaperSheet base={PAPER_BASE} art={PAPER} margin={0.11} head={0.11} tail={0.1}>
              <div className="text-center" style={{ color: INK.ink }}>
                <p className="tracking-[0.3em] uppercase" style={{ fontSize: "calc(2*var(--u))", color: INK.soft }}>
                  {s.inside}
                </p>
                <p className="leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ ...(still ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), marginTop: "calc(1.4*var(--u))", fontFamily: POSTER_FONT, fontWeight: 600, fontSize: "calc(7*var(--u))" }}>
                  {title}
                </p>
                <p className="tracking-[0.3em] uppercase" style={{ marginTop: "calc(1.6*var(--u))", fontSize: "calc(2*var(--u))", color: INK.soft }}>
                  {data.senderName} → {data.recipientName}
                </p>
              </div>
            </PaperSheet>
          </div>
        }
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        photo={(slot) => <Print slot={slot} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}
