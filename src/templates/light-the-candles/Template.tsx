"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playIgnite, playSparkle } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES, FOIL_ON_LIGHT } from "../_shared/holiday/materials";
import { HolidayPage, PaperSheet, Print, type HolidayTheme } from "../_shared/holiday/page";
import { PAPER, PAPER_BASE } from "../_shared/holiday/paper";
import { down, Plate, Sprite, STAGE, STAGE_KEYFRAMES, WIDE_PLATE } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, SPRITES } from "./art-map";
import { INK, LOOKS, type LookId } from "./looks";
import { DEFAULT_THANKS, fieldsSchema, type LightTheCandlesFields } from "./schema";
import { candleAt, CANDLES, HELD_ABOVE, nextUnlit, wickAt, type Pt } from "./wicks";

const S = {
  en: {
    title: "thankful for you",
    strike: "strike a match",
    light: "light the candles",
    read: "read the letter",
    note: "a note from {name}",
    heading: "by candlelight, {name} is thankful for",
    gallery: "round the table",
  },
  es: {
    title: "doy gracias por ti",
    strike: "enciende una cerilla",
    light: "enciende las velas",
    read: "lee la carta",
    note: "una nota de {name}",
    heading: "a la luz de las velas, {name} da las gracias por",
    gallery: "alrededor de la mesa",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof LightTheCandlesFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "harvest";
  const list = Array.isArray(raw.thanks) ? raw.thanks : parsed.success ? [] : DEFAULT_THANKS;
  const thanks = list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, CANDLES);
  return { look, thanks };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-dark-${size}`, `plate-${lookId}-lit-${size}`, ...Array.from({ length: CANDLES }, (_, i) => `glow-${lookId}-${i}-${size}`), `soft-${lookId}-lit-${size}`];
  return [...scene.map((n) => `${ART_BASE}${n}.webp`), ...["top", "mid", "bottom"].map((n) => `${PAPER_BASE}sheet-letter-${n}.webp`)];
}

/* The wicks and the candles' feet, in stage units (100 across, 170 down), through the scene's lens. */
const spot = (name: string): Pt => (ANCHORS as unknown as Record<string, Pt>)[name] ?? { x: 50, y: 85 };
const WICKS = Array.from({ length: CANDLES }, (_, i) => spot(`wick${i}`));
const FEET = Array.from({ length: CANDLES }, (_, i) => spot(`foot${i}`));
const glowRect = (look: LookId, i: number, size: string) => (SPRITES as unknown as Record<string, { x: number; y: number; w: number; h: number }>)[`glow-${look}-${i}-${size}`];
/** Where the match is struck: over the box of matches on the table. */
const MATCH_START: Pt = { x: 62, y: 118 };

const KEYFRAMES = `
.ltc-flicker{animation:ltc-flicker var(--d,2.4s) ease-in-out var(--o,0s) infinite alternate}
@keyframes ltc-flicker{0%{opacity:.9}35%{opacity:1}60%{opacity:.93}100%{opacity:.98}}
.ltc-flame{animation:ltc-flame .9s ease-in-out infinite alternate;transform-origin:50% 100%}
@keyframes ltc-flame{0%{transform:scale(1,1) rotate(-2deg)}50%{transform:scale(.94,1.08) rotate(2deg)}100%{transform:scale(1.04,.96) rotate(-1deg)}}
@media (prefers-reduced-motion: reduce){.ltc-flicker,.ltc-flame{animation:none}}
`;

/** dark: no match yet. match: the match is lit and being carried. glow: every candle burns. open: the letter. */
type Phase = "dark" | "match" | "glow" | "open";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<LightTheCandlesFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|light-the-candles`);

  const [phase, setPhase] = useState<Phase>(preview ? "glow" : "dark");
  const [lit, setLit] = useState<number[]>([]);
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

  const strike = () => {
    if (!begun.current) {
      begun.current = true;
      prime();
      void audio.start();
      eventRef.current?.({ type: "started" });
    }
    if (phase !== "dark") return;
    setPhase("match");
    buzz(12);
    playIgnite(mutedRef.current);
  };

  const light = (i: number) => {
    if (i < 0 || lit.includes(i) || phase === "glow" || phase === "open") return;
    const next = [...lit, i];
    setLit(next);
    buzz(14);
    playIgnite(mutedRef.current);
    eventRef.current?.({ type: "progress", pct: Math.round((next.length / CANDLES) * 25) });
    if (next.length < CANDLES) return;
    after(reduce ? 100 : 1500, () => {
      setPhase("glow");
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1300 });
      eventRef.current?.({ type: "surprise" });
    });
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
    setLit([]);
    setPhase("dark");
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;
  const look = LOOKS[f.look];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: INK.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene key={`scene-${run}`} lookId={f.look} s={s} title={title} from={data.senderName} to={data.recipientName} thanks={f.thanks} seed={seed} phase={phase} lit={lit} canRead={canRead && phase === "glow"} reduce={reduce} leaving={phase === "open"} onStrike={strike} onLight={light} onRead={openPage} />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} title={title} thanks={f.thanks} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the table before anything is lit, the title over it. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: INK.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} from={senderName} to={recipientName} thanks={[]} seed={1} phase="dark" lit={[]} canRead={false} reduce leaving={false} inert onStrike={() => {}} onLight={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
  s: Copy;
  title: string;
  from: string;
  to: string;
  thanks: string[];
  seed: number;
  phase: Phase;
  lit: number[];
  canRead: boolean;
  reduce: boolean;
  leaving: boolean;
  inert?: boolean;
  onStrike: () => void;
  onLight: (i: number) => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, from, to, thanks, seed, phase, lit, canRead, reduce, leaving, inert = false, onStrike, onLight, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: true };
  const stageRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);
  const held = useRef<{ moved: boolean; x: number; y: number } | null>(null);
  const flicker = useMemo(() => {
    const rnd = mulberry32(seed + 3);
    return Array.from({ length: CANDLES }, () => ({ d: 1.6 + rnd() * 1.8, o: -rnd() * 3 }));
  }, [seed]);
  const all = phase === "glow" || phase === "open";
  // a phone is given only the part of each candle's light that falls on its screen
  const [size] = useState(() => (typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches ? "wide" : "phone"));
  const line = lit.length ? thanks[lit.length - 1] : undefined;

  /** Puts the match's flame at a point on the stage. */
  const carry = (p: Pt) => {
    const el = matchRef.current;
    if (el) el.style.transform = `translate(calc(${p.x.toFixed(2)} * var(--k)), calc(${p.y.toFixed(2)} * var(--k)))`;
  };
  const at = (e: ReactPointerEvent): Pt | null => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box?.width) return null;
    return { x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 170 };
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = at(e);
    if (!p || all) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (phase === "dark") onStrike();
    held.current = { moved: false, x: p.x, y: p.y };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const h = held.current;
    const p = at(e);
    if (!h || !p || all) return;
    if (!h.moved && Math.hypot(p.x - h.x, p.y - h.y) < 1.2) return;
    h.moved = true;
    // the flame is held a little above the finger, where it can be seen
    const flame = { x: p.x, y: p.y - HELD_ABOVE };
    carry(flame);
    onLight(wickAt(flame, WICKS, lit));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const h = held.current;
    held.current = null;
    const p = at(e);
    if (!h || h.moved || !p || all) return;
    // a tap on a candle carries the match to it
    const i = candleAt(p, WICKS, FEET, lit);
    if (i < 0) return;
    carry(WICKS[i]);
    onLight(i);
  };
  const onKey = () => {
    if (all) return;
    if (phase === "dark") onStrike();
    const i = nextUnlit(lit);
    if (i < 0) return;
    carry(WICKS[i]);
    onLight(i);
  };

  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}${KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={`${lookId}-dark`} floor={look.floor} still={reduce} width={WIDE_PLATE} />

      {/* what each burning candle adds to the dark room, laid over it: each light is added to the others, and all of them to the room */}
      <div aria-hidden="true" style={{ ...STAGE, mixBlendMode: "screen" }}>
        {lit.map((i) => {
          const rect = glowRect(lookId, i, size);
          return rect ? (
            <motion.div key={i} className="pointer-events-none absolute inset-0" style={{ mixBlendMode: "screen" }} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, ease: "easeOut" }}>
              <Sprite base={ART_BASE} name={`glow-${lookId}-${i}-${size}`} rect={rect} className={reduce ? undefined : "ltc-flicker"} style={{ "--d": `${flicker[i].d}s`, "--o": `${flicker[i].o}s` } as CSSProperties} />
            </motion.div>
          ) : null;
        })}
      </div>

      {/* and the room as it is with all five lit, rendered whole, once they are */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: all ? 1 : 0, transition: reduce ? undefined : "opacity 2.4s ease" }}>
        <Plate base={ART_BASE} look={`${lookId}-lit`} floor={look.floor} still={reduce} width={WIDE_PLATE} />
      </div>

      <div ref={stageRef} style={STAGE}>
        {/* written in light above the table: who it is from, then what each candle is for, then the title */}
        <div className="pointer-events-none absolute inset-x-[6%] flex flex-col items-center text-center" style={{ top: down(9), color: INK.light, textShadow: "0 0 calc(2.4*var(--k)) rgba(8,4,16,.95), 0 0 calc(.8*var(--k)) rgba(8,4,16,.9)" }}>
          <p className="max-w-full truncate text-[calc(2.1*var(--k))] tracking-[0.34em] uppercase opacity-80">
            {from} → {to}
          </p>
          <div className="relative mt-[calc(2*var(--k))] w-full" style={{ height: "calc(26*var(--k))" }}>
            <AnimatePresence mode="wait">
              {all || inert ? (
                <motion.h1
                  key="title"
                  className="absolute inset-x-0 top-0 line-clamp-3 leading-[1.04] text-balance italic [overflow-wrap:anywhere]"
                  style={{ fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 24 ? "calc(6.4*var(--k))" : "calc(9*var(--k))", color: "#ffe9bd" }}
                  initial={reduce || inert ? false : { opacity: 0, y: "12%" }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: inert ? 0 : 1.2, ease: "easeOut" }}
                >
                  {title}
                </motion.h1>
              ) : line ? (
                <motion.p
                  key={`line-${lit.length}`}
                  className="absolute inset-x-0 top-0 line-clamp-3 leading-[1.08] text-balance [overflow-wrap:anywhere]"
                  style={{ fontFamily: "var(--gift-font-hand)", fontSize: line.length > 36 ? "calc(6*var(--k))" : "calc(7.4*var(--k))" }}
                  initial={reduce ? false : { opacity: 0, y: "14%", filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.35 } }}
                  transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
                >
                  {line}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* where each wick is, for whoever needs to find one without seeing it (the tests do) */}
        {WICKS.map((w, i) => (
          <span key={i} data-wick={i} aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${w.x}%`, top: down(w.y), width: 1, height: 1 }} />
        ))}

        {/* the match: its flame is the point that is carried, the stick hangs from it towards the hand */}
        {!inert ? (
          <div ref={matchRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-[4]" style={{ width: 0, height: 0, transform: `translate(calc(${MATCH_START.x} * var(--k)), calc(${MATCH_START.y} * var(--k)))`, opacity: phase === "match" ? 1 : 0, transition: "opacity .5s ease" }}>
            <span className="absolute rounded-full" style={{ left: "calc(-11*var(--k))", top: "calc(-12*var(--k))", width: "calc(22*var(--k))", height: "calc(22*var(--k))", background: "radial-gradient(circle, rgba(255,196,110,.5) 0%, rgba(255,170,80,.18) 34%, rgba(255,160,70,0) 68%)" }} />
            <span className="absolute" style={{ left: "calc(-.45*var(--k))", top: "calc(.6*var(--k))", width: "calc(.9*var(--k))", height: "calc(10*var(--k))", borderRadius: "calc(.4*var(--k))", background: "linear-gradient(180deg, #2a1206 0%, #5a2e14 9%, #d9b98a 14%, #c9a26e 100%)", transform: "rotate(-16deg)", transformOrigin: "50% 0%", boxShadow: "0 calc(.3*var(--k)) calc(.8*var(--k)) rgba(0,0,0,.5)" }} />
            <span className={reduce ? "absolute" : "ltc-flame absolute"} style={{ left: "calc(-1.3*var(--k))", top: "calc(-3.6*var(--k))", width: "calc(2.6*var(--k))", height: "calc(4.6*var(--k))", borderRadius: "50% 50% 50% 50% / 68% 68% 32% 32%", background: "radial-gradient(ellipse 60% 70% at 50% 72%, #ffffff 0%, #fff3c4 28%, #ffc24a 55%, #ff8a1e 78%, rgba(255,110,20,0) 100%)", filter: "blur(.4px)" }} />
          </div>
        ) : null}

        {!inert && !all ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={phase === "dark" ? s.strike : s.light}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => (held.current = null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onKey();
              }
            }}
            className="absolute inset-0 z-[5] cursor-pointer touch-none outline-none"
          />
        ) : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(149) }}>
            <TapPill tone={tone} reduce={reduce} hidden={all || lit.length > 0}>
              {phase === "dark" ? s.strike : s.light}
            </TapPill>
          </div>
        ) : null}

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: down(148.5) }}>
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

/** The note: what the candles were for on a card, the letter under it, then the photos. */
function Page({ lookId, s, data, title, thanks, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<LightTheCandlesFields>["data"]; title: string; thanks: string[]; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
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
          <div className="mx-auto w-[min(84cqw,430px)]" style={{ rotate: "-1.2deg" }}>
            <PaperSheet base={PAPER_BASE} art={PAPER} margin={0.11} head={0.11} tail={0.1}>
              <div className="text-center" style={{ color: INK.ink }}>
                <p className="leading-[1.04] text-balance italic [overflow-wrap:anywhere]" style={{ ...(still ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), fontFamily: POSTER_FONT, fontWeight: 600, fontSize: "calc(6.8*var(--u))" }}>
                  {title}
                </p>
                {thanks.length ? (
                  <>
                    <p className="font-semibold tracking-[0.22em] text-balance uppercase" style={{ marginTop: "calc(2.2*var(--u))", fontSize: "calc(2*var(--u))", color: INK.soft }}>
                      {fill(s.heading, { name: data.senderName })}
                    </p>
                    <ul style={{ marginTop: "calc(1.4*var(--u))" }}>
                      {thanks.map((t, i) => (
                        <li key={i} className="text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(4*var(--u))", lineHeight: 1.25, paddingTop: "calc(.9*var(--u))" }}>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
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
