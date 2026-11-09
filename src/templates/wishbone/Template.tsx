"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playChime, playCrackle, playSnap, playSparkle, playTink } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { APEX, arms, autoPull, clampPull, CREAKS, halves, LEFT_END, pathOf, strainOf, type Curve, type Pt } from "./bone";
import { LOOKS, type Look, type LookId } from "./looks";
import { Bokeh, Candle, CANDLE_KEYFRAMES, FIBRE, FOIL_KEYFRAMES, FOIL_ON_LIGHT, LINEN, mix, RoundLight, Texture } from "../_shared/holiday/materials";
import { fieldsSchema, type WishboneFields } from "./schema";

const S = {
  en: {
    title: "make a wish",
    pull: "pull your side",
    read: "read the letter",
    themWon: "you got the big half!",
    themAside: "(I let you win. I always do.)",
    meWon: "{name} got the big half",
    meAside: "(sorry. it's a wish for both of us.)",
    wished: "{name} wished for",
    wish: "another year at the same table",
    note: "a note from {name}",
    gallery: "around the table",
  },
  es: {
    title: "pide un deseo",
    pull: "tira de tu lado",
    read: "lee la carta",
    themWon: "¡te ha tocado la mitad grande!",
    themAside: "(te he dejado ganar. como siempre.)",
    meWon: "a {name} le ha tocado la mitad grande",
    meAside: "(lo siento. el deseo es para los dos.)",
    wished: "{name} ha deseado",
    wish: "otro año en la misma mesa",
    note: "una nota de {name}",
    gallery: "alrededor de la mesa",
  },
};
type Copy = (typeof S)["en"];

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const pct = (units: number, of: number) => `${(units / of) * 100}%`;

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof WishboneFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "gingham";
  const winner: "them" | "me" = raw.winner === "me" ? "me" : "them";
  const wish = typeof raw.wish === "string" ? raw.wish.trim().slice(0, 120) : "";
  return { look, winner, wish };
};

/** The time, and a small random tremble: kept outside the component, since they are only ever read in a handler or a frame. */
const clockNow = () => performance.now();
const tremble = () => Math.random() - 0.5;

/** whole: waiting to be pulled. pulling: under strain. snapped: in two. open: the letter. */
type Phase = "whole" | "pulling" | "snapped" | "open";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<WishboneFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const look = LOOKS[f.look];
  const wish = f.wish || s.wish;
  const seed = hashString(`${data.recipientName}|${data.senderName}|wishbone`);

  const [phase, setPhase] = useState<Phase>(preview ? "snapped" : "whole");
  const [pull, setPull] = useState<Pt>(preview ? autoPull(1) : { x: 0, y: 0 });
  const [card, setCard] = useState(preview);
  const [canRead, setCanRead] = useState(false);
  const [sceneGone, setSceneGone] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const svgRef = useRef<SVGSVGElement>(null);
  const grab = useRef<{ x: number; y: number; scale: number; moved: boolean } | null>(null);
  const creak = useRef(0);
  const raf = useRef(0);
  const begun = useRef(false);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const begin = () => {
    if (begun.current) return;
    begun.current = true;
    prime();
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  const snap = () => {
    cancelAnimationFrame(raf.current);
    grab.current = null;
    setPhase("snapped");
    buzz(35);
    playSnap(mutedRef.current);
    eventRef.current?.({ type: "progress", pct: 25 });
    // The two halves land back on the plate a moment later.
    after(reduce ? 50 : 620, () => playTink(mutedRef.current, 1, "walk"));
    after(reduce ? 100 : 950, () => {
      setCard(true);
      playChime(mutedRef.current, 2);
      playSparkle(mutedRef.current, { delay: 0.1, ms: 1100 });
      eventRef.current?.({ type: "surprise" });
      after(1800, () => setCanRead(true));
      after(10000, openPage);
    });
  };

  /** Bends the bone to `p`, creaking as it passes each mark on the way to giving, and gives at the end. */
  const strainTo = (p: Pt) => {
    const strain = strainOf(p);
    while (creak.current < CREAKS.length && strain >= CREAKS[creak.current]) {
      buzz(6 + creak.current * 4);
      playCrackle(mutedRef.current, { ms: 260, strain: CREAKS[creak.current] });
      creak.current += 1;
    }
    // Under real strain the bone trembles in the hand.
    const shake = strain > 0.55 ? (strain - 0.55) * 1.1 : 0;
    setPull({ x: p.x + tremble() * shake, y: p.y + tremble() * shake });
    if (strain >= 1) snap();
  };

  /** A tap pulls on its own: steadily harder until it gives. */
  const pullItself = () => {
    if (phase === "snapped" || phase === "open") return;
    begin();
    setPhase("pulling");
    if (reduce) {
      strainTo(autoPull(1));
      return;
    }
    const t0 = clockNow();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 1100);
      strainTo(autoPull(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase !== "whole") return;
    const svg = svgRef.current;
    if (!svg) return;
    begin();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    grab.current = { x: e.clientX, y: e.clientY, scale: svg.getBoundingClientRect().width / 100, moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const g = grab.current;
    if (!g) return;
    const d = { x: (e.clientX - g.x) / g.scale, y: (e.clientY - g.y) / g.scale };
    if (!g.moved && Math.hypot(d.x, d.y) > 2) {
      g.moved = true;
      setPhase("pulling");
    }
    if (g.moved) strainTo(clampPull(d));
  };
  const onUp = () => {
    const g = grab.current;
    if (!g) return;
    grab.current = null;
    if (!g.moved) {
      pullItself();
      return;
    }
    // Let go too soon and the bone springs back, whole, to be pulled again.
    const from = pull;
    const t0 = clockNow();
    const back = (now: number) => {
      const t = Math.min(1, (now - t0) / 260);
      setPull({ x: from.x * (1 - t), y: from.y * (1 - t) });
      if (t < 1) raf.current = requestAnimationFrame(back);
      else {
        creak.current = 0;
        setPhase("whole");
      }
    };
    raf.current = requestAnimationFrame(back);
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
    cancelAnimationFrame(raf.current);
    begun.current = false;
    creak.current = 0;
    grab.current = null;
    setPull({ x: 0, y: 0 });
    setPhase("whole");
    setCard(false);
    setCanRead(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          look={look}
          s={s}
          title={title}
          from={data.senderName}
          to={data.recipientName}
          winner={f.winner}
          wish={wish}
          phase={phase}
          pull={pull}
          card={card}
          canRead={canRead && phase === "snapped"}
          reduce={reduce}
          svgRef={svgRef}
          leaving={phase === "open"}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onPull={pullItself}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} look={look} s={s} data={data} winner={f.winner} wish={wish} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the wishbone on its plate, whole. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink } as CSSProperties}>
      <Scene look={look} s={s} title={s.title} from={senderName} to={recipientName} winner={f.winner} wish="" phase="whole" pull={{ x: 0, y: 0 }} card={false} canRead={false} reduce svgRef={{ current: null }} leaving={false} inert onDown={() => {}} onMove={() => {}} onUp={() => {}} onPull={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  look: Look;
  s: Copy;
  title: string;
  from: string;
  to: string;
  winner: "them" | "me";
  wish: string;
  phase: Phase;
  pull: Pt;
  card: boolean;
  canRead: boolean;
  reduce: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
  leaving: boolean;
  inert?: boolean;
  onDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onUp: () => void;
  onPull: () => void;
  onRead: () => void;
};

function Scene({ look, s, title, from, to, winner, wish, phase, pull, card, canRead, reduce, svgRef, leaving, inert = false, onDown, onMove, onUp, onPull, onRead }: SceneProps) {
  const snapped = phase === "snapped" || phase === "open";
  const tone = { page: look.cloth, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${FOIL_KEYFRAMES}${CANDLE_KEYFRAMES}`}</style>
      {/* the table seen from above: woven, checked linen to every edge, lit from the top left */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ backgroundColor: look.cloth, backgroundImage: `repeating-linear-gradient(0deg, ${look.check} 0 calc(4.4*var(--k)), transparent calc(4.4*var(--k)) calc(8.8*var(--k))), repeating-linear-gradient(90deg, ${look.check} 0 calc(4.4*var(--k)), transparent calc(4.4*var(--k)) calc(8.8*var(--k)))` }}>
        <Texture image={LINEN} blend="multiply" opacity={0.75} size="calc(24*var(--k))" />
        {/* the soft folds a cloth keeps from being stored */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 31%, rgba(0,0,0,.07) 33%, rgba(255,255,255,.08) 34.5%, transparent 37%, transparent 64%, rgba(0,0,0,.07) 66%, rgba(255,255,255,.08) 67.5%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: look.dark ? "radial-gradient(80% 60% at 30% 25%, rgba(255,200,130,.22), transparent 70%)" : "radial-gradient(80% 60% at 26% 20%, rgba(255,255,255,.4), transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: look.dark ? "radial-gradient(120% 90% at 50% 50%, transparent 45%, rgba(0,0,0,.6))" : "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(80,40,20,.28))" }} />
      </div>

      <div className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        {/* the place card, with the title in foil */}
        <div className="absolute inset-x-[13%]" style={{ top: pct(4, 170), opacity: card ? 0 : 1, transition: "opacity .4s ease" }}>
          <PlaceCard look={look} title={title} from={from} to={to} />
        </div>

        {/* what else is on the table */}
        <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: pct(76, 100), top: pct(26, 170), width: pct(18, 100), height: pct(28, 170) }}>
          <Candle still={reduce} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: pct(-6, 100), top: pct(140, 170), width: pct(30, 100), height: pct(26, 170), rotate: "-12deg" }}>
          <Pumpkin color="#d9702a" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: pct(82, 100), top: pct(146, 170), width: pct(20, 100), height: pct(17, 170), rotate: "14deg" }}>
          <Pumpkin color="#efe2c6" />
        </div>

        {/* the plate, glazed, from above */}
        <div aria-hidden="true" className="absolute rounded-[50%]" style={{ left: pct(4, 100), top: pct(54, 170), width: pct(92, 100), height: pct(80, 170), background: `radial-gradient(closest-side, ${look.plate} 0%, ${look.plate} 52%, ${mix(look.plate, "#8a7a60", 0.14)} 57%, ${mix(look.plate, "#ffffff", 0.6)} 62%, ${look.plate} 74%, ${mix(look.plate, "#7a6a50", 0.2)} 100%)`, boxShadow: "0 calc(2.4*var(--k)) calc(5*var(--k)) rgba(0,0,0,.32), 0 calc(.6*var(--k)) calc(1*var(--k)) rgba(0,0,0,.2)" }}>
          <div className="absolute inset-[3.5%] rounded-[50%]" style={{ boxShadow: `inset 0 0 0 calc(.35*var(--k)) ${mix(look.rim, "#b08a3a", 0.55)}`, opacity: 0.85 }} />
          <div className="absolute rounded-full" style={{ left: "14%", top: "8%", width: "40%", height: "18%", background: "radial-gradient(closest-side, rgba(255,255,255,.8), transparent)", filter: "blur(calc(.7*var(--k)))", transform: "rotate(-28deg)" }} />
        </div>

        <div className="absolute" style={{ left: pct(6, 100), top: pct(46, 170), width: pct(88, 100), height: pct(88, 170) }}>
          <svg ref={svgRef} viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <BoneLight />
            {snapped ? <Halves look={look} pull={pull} winner={winner} from={from} to={to} reduce={reduce} /> : <Whole look={look} pull={pull} from={from} to={to} />}
          </svg>
          {!inert && !snapped ? (
            <button
              type="button"
              aria-label={s.pull}
              onClick={(e) => {
                // A keyboard press has no pointer before it: it pulls by itself.
                if (e.detail === 0) onPull();
              }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className="absolute cursor-grab touch-none rounded-[30%] outline-none focus-visible:ring-4 focus-visible:ring-white/60 active:cursor-grabbing"
              style={{ left: "48%", top: "18%", width: "52%", height: "82%" }}
            />
          ) : null}
        </div>

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: pct(148, 170) }}>
            <TapPill tone={tone} reduce={reduce} hidden={phase !== "whole"}>
              {s.pull}
            </TapPill>
          </div>
        ) : null}

        <AnimatePresence>
          {card ? (
            <motion.div key="card" className="absolute inset-x-[7%] z-[8]" style={{ top: pct(4, 170) }} initial={reduce ? false : { opacity: 0, y: -20, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ type: "spring", stiffness: 180, damping: 16 }}>
              <WishCard look={look} s={s} from={from} winner={winner} wish={wish} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {canRead ? (
          <div className="absolute inset-x-0 z-[9] flex justify-center" style={{ top: pct(148, 170) }}>
            <button type="button" onClick={onRead} className="rounded-full px-[calc(5*var(--k))] py-[calc(1.9*var(--k))] text-[calc(3.1*var(--k))] leading-none font-semibold tracking-[0.22em] uppercase outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ background: `linear-gradient(180deg, ${mix(look.accent, "#ffffff", 0.12)}, ${mix(look.accent, "#000000", 0.12)})`, color: "#fffaf2", boxShadow: "0 calc(1*var(--k)) calc(3*var(--k)) rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.25)" }}>
              {s.read}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The place card at the head of the table: heavy cream stock, the title in foil, the two names under it. */
function PlaceCard({ look, title, from, to }: { look: Look; title: string; from: string; to: string }) {
  return (
    <div className="relative overflow-hidden rounded-[calc(1*var(--k))] px-[calc(4*var(--k))] pt-[calc(3.4*var(--k))] pb-[calc(3*var(--k))] text-center" style={{ background: `linear-gradient(180deg, ${mix(look.card, "#ffffff", 0.5)}, ${look.card} 60%, ${mix(look.card, "#b89a70", 0.12)})`, color: look.cardInk, boxShadow: "0 calc(1.6*var(--k)) calc(3.4*var(--k)) rgba(0,0,0,.3)" }}>
      <Texture image={FIBRE} blend="multiply" opacity={0.5} size="calc(26*var(--k))" />
      {/* the fold of a tented card, across the top */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[calc(1.6*var(--k))]" style={{ background: "linear-gradient(180deg, rgba(120,90,50,.22), transparent)" }} />
      <p className="relative text-[calc(2.2*var(--k))] tracking-[0.34em] uppercase [overflow-wrap:anywhere]" style={{ color: look.cardSoft }}>
        {from} → {to}
      </p>
      <h1 className="relative mt-[calc(1.2*var(--k))] leading-[1.02] text-balance italic [overflow-wrap:anywhere]" style={{ ...FOIL_ON_LIGHT, fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 22 ? "calc(5.4*var(--k))" : "calc(7.4*var(--k))" }}>
        {title}
      </h1>
    </div>
  );
}

/** What the big half says, on a little card. */
function WishCard({ look, s, from, winner, wish }: { look: Look; s: Copy; from: string; winner: "them" | "me"; wish: string }) {
  return (
    <div className="relative overflow-hidden rounded-[calc(1.4*var(--k))] px-[calc(5.4*var(--k))] py-[calc(5*var(--k))] text-center" style={{ background: `linear-gradient(160deg, ${mix(look.card, "#ffffff", 0.5)}, ${look.card} 55%, ${mix(look.card, "#b89a70", 0.16)})`, color: look.cardInk, boxShadow: "0 calc(3*var(--k)) calc(9*var(--k)) rgba(0,0,0,.35)" }}>
      <Texture image={FIBRE} blend="multiply" opacity={0.5} size="calc(28*var(--k))" />
      <div aria-hidden="true" className="absolute inset-[3.5%] rounded-[calc(.8*var(--k))]" style={{ boxShadow: "inset 0 0 0 calc(.28*var(--k)) rgba(176,126,40,.55), inset 0 0 0 calc(1.1*var(--k)) transparent, inset 0 0 0 calc(1.35*var(--k)) rgba(176,126,40,.3)" }} />
      <p className="relative leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ ...FOIL_ON_LIGHT, fontFamily: POSTER_FONT, fontSize: "calc(7*var(--k))", fontWeight: 600 }}>
        {winner === "them" ? s.themWon : fill(s.meWon, { name: from })}
      </p>
      <p className="relative mt-[calc(1.2*var(--k))] text-[calc(3*var(--k))] italic" style={{ color: look.cardSoft }}>
        {winner === "them" ? s.themAside : s.meAside}
      </p>
      <p className="relative mt-[calc(3.4*var(--k))] text-[calc(2.4*var(--k))] font-semibold tracking-[0.24em] uppercase [overflow-wrap:anywhere]" style={{ color: look.cardSoft }}>
        {fill(s.wished, { name: from })}
      </p>
      <p className="relative mt-[calc(1.2*var(--k))] leading-[1.2] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: wish.length > 70 ? "calc(5*var(--k))" : "calc(6.2*var(--k))" }}>
        {wish}
      </p>
    </div>
  );
}

/** A bone drawn along curves: a dark edge under a pale body, with a soft highlight. */
function BonePath({ curves, look, knob }: { curves: Curve[]; look: Look; knob?: Pt }) {
  return (
    <g strokeLinecap="round" fill="none" filter="url(#wb-round)">
      {curves.map((c, i) => (
        <path key={`b${i}`} d={pathOf(c)} stroke={look.bone[0]} strokeWidth="6.2" />
      ))}
      {knob ? <ellipse cx={knob.x} cy={knob.y - 1} rx="6" ry="3.6" fill={look.bone[0]} /> : null}
    </g>
  );
}

/** The light the bone is drawn in, and the tint of its hollows. Defined once, in the bone's own drawing. */
function BoneLight() {
  return (
    <defs>
      <RoundLight id="wb-round" soft={1.7} glint={0.32} exponent={9} depth={0.5} light={{ x: 30, y: -10, z: 70 }} />
    </defs>
  );
}

/** A name on a tag tied to the end of an arm. */
function Tag({ at, name, look, tilt }: { at: Pt; name: string; look: Look; tilt: number }) {
  const short = name.length > 11 ? `${name.slice(0, 10)}…` : name;
  return (
    <g transform={`translate(${at.x.toFixed(2)} ${at.y.toFixed(2)}) rotate(${tilt})`}>
      <path d="M0 0 C .6 2, -.4 4, 0 5.6" stroke={mix(look.tag, "#3a2010", 0.4)} strokeWidth=".45" fill="none" />
      <rect x="-10" y="5.6" width="20" height="8" rx="1.4" fill={look.tag} style={{ filter: "drop-shadow(0 .6px .8px rgba(0,0,0,.35))" }} />
      <rect x="-10" y="5.6" width="20" height="3.2" rx="1.4" fill="#ffffff" opacity=".18" />
      <circle cx="0" cy="7.2" r=".75" fill={mix(look.tag, "#2a1608", 0.6)} />
      <text x="0" y="11.8" textAnchor="middle" fontSize="3.6" fill={look.tagInk} style={{ fontFamily: SCRIPT_FONT }}>
        {short}
      </text>
    </g>
  );
}

function Whole({ look, pull, from, to }: { look: Look; pull: Pt; from: string; to: string }) {
  const { left, right } = arms(pull);
  return (
    <g style={{ filter: "drop-shadow(0 1.2px 1.4px rgba(0,0,0,.3))" }}>
      <BonePath curves={[left, right]} look={look} knob={left[0]} />
      <Tag at={LEFT_END} name={from} look={look} tilt={6} />
      <Tag at={right[2]} name={to} look={look} tilt={-6 - pull.x * 0.6} />
    </g>
  );
}

/** The bone in two: the big half (joint and all) goes one way, the small half the other, and both settle on the plate. */
function Halves({ look, pull, winner, from, to, reduce }: { look: Look; pull: Pt; winner: "them" | "me"; from: string; to: string; reduce: boolean }) {
  const { big, small } = halves(pull, winner);
  const { right } = arms(pull);
  const away = winner === "them" ? 1 : -1;
  const spring = { type: "spring" as const, stiffness: 120, damping: 11 };
  return (
    <g style={{ filter: "drop-shadow(0 1.2px 1.4px rgba(0,0,0,.3))" }}>
      <motion.g initial={false} animate={reduce ? {} : { x: -9 * away, y: 4, rotate: -22 * away }} transition={spring} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
        <BonePath curves={small} look={look} />
        <Tag at={winner === "them" ? LEFT_END : right[2]} name={winner === "them" ? from : to} look={look} tilt={winner === "them" ? 14 : -14} />
      </motion.g>
      <motion.g initial={false} animate={reduce ? {} : { x: 6 * away, y: 7, rotate: 10 * away }} transition={spring} style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}>
        <BonePath curves={big} look={look} knob={big[0][0] ?? APEX} />
        <Tag at={winner === "them" ? right[2] : LEFT_END} name={winner === "them" ? to : from} look={look} tilt={winner === "them" ? -10 : 10} />
      </motion.g>
    </g>
  );
}

/** A small pumpkin for the table: ribbed, lit from the top left, its stem curling. */
function Pumpkin({ color }: { color: string }) {
  const id = useId().replace(/:/g, "");
  const lit = mix(color, "#fff4dc", 0.38);
  const deep = mix(color, "#3a1a06", 0.5);
  return (
    <svg viewBox="0 0 60 50" aria-hidden="true" className="h-full w-full overflow-visible">
      <defs>
        <radialGradient id={`p${id}`} cx=".36" cy=".3" r=".8">
          <stop offset="0" stopColor={lit} />
          <stop offset=".5" stopColor={color} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3e4a1c" />
          <stop offset=".5" stopColor="#7a8a3a" />
          <stop offset="1" stopColor="#2e3812" />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="47.5" rx="25" ry="3.2" fill="rgba(0,0,0,.28)" style={{ filter: "blur(1.2px)" }} />
      {[-15, -7.5, 0, 7.5, 15].map((dx, i) => (
        <ellipse key={i} cx={30 + dx} cy="30" rx={i === 2 ? 11 : 10} ry="16.5" fill={`url(#p${id})`} opacity={i === 2 ? 1 : 0.96} />
      ))}
      {[-11, -4, 4, 11].map((dx, i) => (
        <path key={i} d={`M${30 + dx} 15 C ${30 + dx * 1.2} 24, ${30 + dx * 1.2} 36, ${30 + dx} 46`} fill="none" stroke={deep} strokeOpacity=".28" strokeWidth="1.4" />
      ))}
      <ellipse cx="22" cy="21" rx="6" ry="3" fill="#ffffff" opacity=".22" style={{ filter: "blur(1.4px)" }} />
      <path d="M29 15 C 29 10, 30 6, 34 3" stroke={`url(#s${id})`} strokeWidth="3.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Page({ look, s, data, winner, wish, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<WishboneFields>["data"]; winner: "them" | "me"; wish: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.card, cardImage: PAPER_GRAIN, ink: look.cardInk, soft: look.cardSoft, accent: look.accent, edge: "rgba(80,40,20,.14)", dark: false, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => (rng() - 0.5) * 6);
  }, [data.photos, seed]);
  return (
    <motion.div className="absolute inset-0 z-[20]" style={{ ...COVER_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)` } as CSSProperties} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <Bokeh colors={look.lights} count={14} seed={seed} still={still} strength={look.dark ? 0.75 : 0.5} />
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        hero={
          <div className="mx-auto w-[min(80cqw,400px)]" style={{ rotate: "-1.5deg" }}>
            <WishCard look={look} s={s} from={data.senderName} winner={winner} wish={wish} />
          </div>
        }
        photo={(slot) => <Snapshot slot={slot} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

function Snapshot({ slot, rot }: { slot: PhotoSlot; rot: number }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-white/60">
        <div className="relative p-[calc(1.8*var(--u))] pb-[calc(9.5*var(--u))]" style={{ background: "#fffaf2", backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(3*var(--u)) calc(7*var(--u)) rgba(0,0,0,.3)" }}>
          <img src={photo.url} alt="" loading="lazy" draggable={false} className="aspect-square w-full object-cover" />
          {photo.caption ? (
            <figcaption className="absolute inset-x-[calc(2*var(--u))] bottom-[calc(1.4*var(--u))] line-clamp-2 text-center leading-[1.1]" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(2.9*var(--u))", color: "#3a2410" }}>
              {photo.caption}
            </figcaption>
          ) : null}
        </div>
        <span aria-hidden="true" className="absolute -top-[calc(2*var(--u))] left-1/2 h-[calc(5*var(--u))] w-[calc(20*var(--u))] -translate-x-1/2 rotate-2" style={{ background: "rgba(230,205,150,.7)", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
      </button>
    </figure>
  );
}
