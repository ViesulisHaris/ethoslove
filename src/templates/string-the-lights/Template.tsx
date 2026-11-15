"use client";

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
import { down, Plate, STAGE, STAGE_KEYFRAMES, WIDE_PLATE } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, BULBS } from "./art-map";
import { BULB_COLORS, INK, LOOKS, type LookId } from "./looks";
import { fieldsSchema, type StringTheLightsFields } from "./schema";
import { hooksNear, nextHooks, TAP_REACH, wires, type Pt } from "./string";

const S = {
  en: {
    title: "merry christmas",
    sign: "MERRY CHRISTMAS {name}",
    hang: "hang the lights along the roof",
    more: "{n} to go",
    flip: "flip the switch",
    read: "read the letter",
    note: "a note from {name}",
    inLights: "in lights, in the garden",
    gallery: "this december",
  },
  es: {
    title: "feliz navidad",
    sign: "FELIZ NAVIDAD {name}",
    hang: "cuelga las luces por el tejado",
    more: "faltan {n}",
    flip: "dale al interruptor",
    read: "lee la carta",
    note: "una nota de {name}",
    inLights: "con luces, en el jardín",
    gallery: "este diciembre",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof StringTheLightsFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "red";
  const sign = typeof raw.sign === "string" ? raw.sign.trim().slice(0, 28) : "";
  return { look, sign };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-dark-${size}`, `plate-${lookId}-lit-${size}`, `soft-${lookId}-lit-${size}`];
  return [...scene.map((n) => `${ART_BASE}${n}.webp`), ...["top", "mid", "bottom"].map((n) => `${PAPER_BASE}sheet-letter-${n}.webp`)];
}

/* The hooks along the roof, in stage units (100 across, 170 down), in the order of the string; and the board in the garden. */
const HOOKS = BULBS;
const TOTAL = HOOKS.length;
/** Where the porch's string begins: the gable's is everything before it (the scene hangs 17 a side on the gable). */
const BREAKS = [34];
const BOARD = { x: ANCHORS.boardTopLeft.x, y: ANCHORS.boardTopLeft.y, w: ANCHORS.boardBottomRight.x - ANCHORS.boardTopLeft.x, h: ANCHORS.boardBottomRight.y - ANCHORS.boardTopLeft.y };

const KEYFRAMES = `
.stl-hook{animation:stl-hook 2.2s ease-in-out infinite alternate}
@keyframes stl-hook{from{opacity:.25}to{opacity:.7}}
.stl-pop{animation:stl-pop .32s cubic-bezier(.2,1.6,.4,1) both}
@keyframes stl-pop{from{transform:translate(-50%,-50%) scale(.2)}to{transform:translate(-50%,-50%) scale(1)}}
.stl-on{animation:stl-on var(--d,3s) ease-in-out var(--o,0s) infinite alternate}
@keyframes stl-on{from{opacity:.82}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.stl-hook,.stl-pop,.stl-on{animation:none}.stl-hook{opacity:.5}}
`;

/** The time: kept outside the component, since it is only ever read in a handler or a frame. */
const clockNow = () => performance.now();

/** hang: bulbs still to go up. ready: all up, the switch waits. lit: everything is on. open: the letter. */
type Phase = "hang" | "ready" | "lit" | "open";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<StringTheLightsFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|string-the-lights`);

  const [phase, setPhase] = useState<Phase>(preview ? "lit" : "hang");
  const [hung, setHung] = useState<ReadonlySet<number>>(() => new Set());
  const [canRead, setCanRead] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const begun = useRef(false);
  const mutedRef = useRef(false);
  const tinked = useRef(0);
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

  /** Puts bulbs up on these hooks. */
  const hang = (hooks: number[]) => {
    if (!hooks.length || phase !== "hang") return;
    begin();
    const next = new Set(hung);
    for (const i of hooks) next.add(i);
    setHung(next);
    const now = clockNow();
    if (now - tinked.current > 90) {
      tinked.current = now;
      playTink(mutedRef.current, next.size % 8, "walk");
      buzz(5);
    }
    eventRef.current?.({ type: "progress", pct: Math.round((next.size / TOTAL) * 20) });
    if (next.size >= TOTAL) setPhase("ready");
  };

  const flip = () => {
    if (phase !== "ready") return;
    begin();
    setPhase("lit");
    buzz(30);
    playKnock(mutedRef.current);
    after(reduce ? 0 : 350, () => {
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1500 });
      eventRef.current?.({ type: "surprise" });
    });
    eventRef.current?.({ type: "progress", pct: 25 });
    after(reduce ? 300 : 4200, () => setCanRead(true));
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
    setHung(new Set());
    setPhase("hang");
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const sign = f.sign || fill(s.sign, { name: data.recipientName.toUpperCase() });
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: INK.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene key={`scene-${run}`} lookId={f.look} s={s} title={title} sign={sign} from={data.senderName} to={data.recipientName} seed={seed} phase={phase} hung={hung} canRead={canRead && phase === "lit"} reduce={reduce} leaving={phase === "open"} onHang={hang} onFlip={flip} onRead={openPage} />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} sign={sign} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the house dark, the hooks waiting along its roof. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: INK.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} sign="" from={senderName} to={recipientName} seed={1} phase="hang" hung={new Set()} canRead={false} reduce leaving={false} inert onHang={() => {}} onFlip={() => {}} onRead={() => {}} />
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
  hung: ReadonlySet<number>;
  canRead: boolean;
  reduce: boolean;
  leaving: boolean;
  inert?: boolean;
  onHang: (hooks: number[]) => void;
  onFlip: () => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, sign, from, to, seed, phase, hung, canRead, reduce, leaving, inert = false, onHang, onFlip, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: true };
  const stageRef = useRef<HTMLDivElement>(null);
  const held = useRef<{ moved: boolean; x: number; y: number } | null>(null);
  const on = phase === "lit" || phase === "open";
  const twinkle = useMemo(() => {
    const rnd = mulberry32(seed + 7);
    return HOOKS.map(() => ({ d: 2 + rnd() * 3, o: -rnd() * 5 }));
  }, [seed]);
  const lines = useMemo(() => wires(TOTAL, hung, BREAKS), [hung]);

  const at = (e: ReactPointerEvent): Pt | null => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box?.width) return null;
    return { x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 170 };
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = at(e);
    if (!p) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    held.current = { moved: false, x: p.x, y: p.y };
    onHang(hooksNear(p, HOOKS, hung));
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const h = held.current;
    const p = at(e);
    if (!h || !p) return;
    if (Math.hypot(p.x - h.x, p.y - h.y) > 1.2) h.moved = true;
    onHang(hooksNear(p, HOOKS, hung));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const h = held.current;
    held.current = null;
    const p = at(e);
    // a tap, with no drag, reaches a little further
    if (h && !h.moved && p) onHang(hooksNear(p, HOOKS, hung, TAP_REACH));
  };

  const left = TOTAL - hung.size;
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}${KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={`${lookId}-dark`} floor={look.floor} still={reduce} width={WIDE_PLATE} />
      {/* the same night with everything on, rendered whole: faded in when the switch is thrown */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: on ? 1 : 0, transition: reduce ? undefined : "opacity 1.8s ease .5s" }}>
        <Plate base={ART_BASE} look={`${lookId}-lit`} floor={look.floor} still={reduce} width={WIDE_PLATE} />
      </div>

      <div ref={stageRef} style={STAGE}>
        <div className="pointer-events-none absolute inset-x-[6%] flex flex-col items-center text-center" style={{ top: down(7), color: INK.light, textShadow: "0 0 calc(2*var(--k)) rgba(4,8,24,.9)" }}>
          <p className="max-w-full truncate text-[calc(2.1*var(--k))] tracking-[0.34em] uppercase opacity-80">
            {from} → {to}
          </p>
          <h1 className="mt-[calc(1*var(--k))] line-clamp-2 leading-[1.04] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 22 ? "calc(6*var(--k))" : "calc(8.4*var(--k))" }}>
            {title}
          </h1>
        </div>

        {/* the string: wire between neighbours that are both up, a hook where a bulb is still to go, the bulbs themselves */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 170" preserveAspectRatio="none" style={{ opacity: on ? 0 : 1, transition: "opacity 1.2s ease 1s" }}>
          {lines.map(([a, b]) => (
            <line key={a} x1={HOOKS[a][0]} y1={HOOKS[a][1] - 0.5} x2={HOOKS[b][0]} y2={HOOKS[b][1] - 0.5} stroke="#0c120c" strokeWidth={0.22} strokeLinecap="round" />
          ))}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {HOOKS.map(([x, y], i) => {
            const color = BULB_COLORS[i % BULB_COLORS.length];
            const up = hung.has(i);
            if (!up)
              return inert ? null : (
                <span key={i} data-hook={i} className="stl-hook absolute rounded-full" style={{ left: `${x}%`, top: down(y), width: "calc(1.1*var(--k))", height: "calc(1.1*var(--k))", transform: "translate(-50%,-50%)", background: "#fff6dc", boxShadow: "0 0 calc(1.2*var(--k)) rgba(255,240,200,.9)", animationDelay: `${-(i % 7) * 0.3}s` }} />
              );
            return (
              <span key={i} className={reduce ? "absolute" : "stl-pop absolute"} style={{ left: `${x}%`, top: down(y), width: "calc(1.9*var(--k))", height: "calc(2.3*var(--k))", transform: "translate(-50%,-50%)" }}>
                {/* unlit glass, and over it the same bulb burning once the switch is thrown, each a breath after the last */}
                <span className="absolute inset-0" style={{ borderRadius: "50% 50% 50% 50% / 42% 42% 58% 58%", background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 30%), ${color}`, filter: "brightness(.42) saturate(.8)", boxShadow: "0 calc(.2*var(--k)) calc(.5*var(--k)) rgba(0,0,0,.5)", opacity: on ? 0 : 1, transition: `opacity .3s ease ${(i * 0.035).toFixed(2)}s` }} />
                <span className={on && !reduce ? "stl-on absolute" : "absolute"} style={{ inset: "calc(-2.6*var(--k))", borderRadius: "50%", background: `radial-gradient(circle, #ffffff 0%, ${color} 16%, ${color}66 34%, ${color}00 64%)`, opacity: on ? 1 : 0, transition: `opacity .25s ease ${(i * 0.035).toFixed(2)}s`, "--d": `${twinkle[i].d}s`, "--o": `${twinkle[i].o}s` } as CSSProperties} />
              </span>
            );
          })}
        </div>

        {/* the words on the board in the garden, made of small lights */}
        <p
          className="pointer-events-none absolute flex items-center justify-center text-center leading-[1.02] font-extrabold tracking-[0.08em] text-balance uppercase [overflow-wrap:anywhere]"
          style={{ left: `${BOARD.x}%`, top: down(BOARD.y), width: `${BOARD.w}%`, height: down(BOARD.h), padding: "0 calc(1*var(--k))", fontSize: `calc(${sign.length <= 12 ? 6.2 : sign.length <= 20 ? 4.3 : 3.6}*var(--k))`, color: "transparent", backgroundImage: "radial-gradient(circle, #fff7d6 0 34%, #ffc24a 36% 46%, rgba(255,170,60,0) 50%)", backgroundSize: "calc(.56*var(--k)) calc(.56*var(--k))", WebkitBackgroundClip: "text", backgroundClip: "text", filter: "drop-shadow(0 0 calc(.9*var(--k)) rgba(255,190,90,.95))", opacity: on ? 1 : 0, transition: reduce ? undefined : "opacity 1.2s ease 2s" }}
        >
          {sign}
        </p>

        {!inert && phase === "hang" ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={s.hang}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => (held.current = null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onHang(nextHooks(TOTAL, hung));
              }
            }}
            className="absolute inset-0 z-[5] cursor-pointer touch-none outline-none"
          />
        ) : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(157) }}>
            <TapPill tone={tone} reduce={reduce} hidden={phase !== "hang"}>
              {hung.size === 0 ? s.hang : fill(s.more, { n: left })}
            </TapPill>
          </div>
        ) : null}

        {phase === "ready" ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(156.5) }}>
            <motion.button
              type="button"
              onClick={onFlip}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="rounded-full px-[calc(6*var(--k))] py-[calc(2.2*var(--k))] text-[calc(3.3*var(--k))] leading-none font-bold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              style={{ background: "linear-gradient(180deg, #ff5a4a 0%, #d42a20 60%, #a81a14 100%)", color: "#fff6ea", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.45), 0 0 calc(4*var(--k)) rgba(255,90,70,.5)" }}
            >
              {s.flip}
            </motion.button>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(156.5) }}>
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

/** The note: the words that came on in lights, the letter under them, then the photos. */
function Page({ lookId, s, data, sign, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<StringTheLightsFields>["data"]; sign: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
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
        look={`${lookId}-lit`}
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
                  {s.inLights}
                </p>
                <p className="leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ ...(still ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), marginTop: "calc(1.4*var(--u))", fontFamily: POSTER_FONT, fontWeight: 600, fontSize: sign.length > 20 ? "calc(5.4*var(--u))" : "calc(6.8*var(--u))" }}>
                  {sign.toLowerCase()}
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
