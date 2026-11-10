"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playCrackle, playSnap, playSparkle, playTink } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { FOIL_KEYFRAMES, FOIL_ON_LIGHT } from "../_shared/holiday/materials";
import { HolidayPage, PaperSheet, Print, type HolidayTheme, type PhotoSlot } from "../_shared/holiday/page";
import { down, laid, Plate, Sparks, Sprite, STAGE, STAGE_KEYFRAMES } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, BULBS, SHEETS, SPRITES } from "./art-map";
import { armTurn, autoPull, clampPull, CREAKS, settled, strained, strainOf, type Pose, type Pt } from "./bone";
import { LOOKS, type Look, type LookId } from "./looks";
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

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof WishboneFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "gingham";
  const winner: "them" | "me" = raw.winner === "me" ? "me" : "them";
  const wish = typeof raw.wish === "string" ? raw.wish.trim().slice(0, 120) : "";
  return { look, winner, wish };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** Every picture a gift in this look is made of, so they can be fetched before it opens. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;
  const size = wide ? "wide" : "phone";
  const scene = [`plate-${lookId}-${size}`, "head", "arm-left", "arm-right"];
  const note = [`soft-${lookId}-${size}`, "sheet-letter-top", "sheet-letter-mid", "sheet-letter-bottom", "peg", "twine"];
  return [...scene, ...note].map((n) => `${ART_BASE}${n}.webp`);
}

/*
 * The bone, in stage units (100 across, 170 down). It is three pictures (its head, and each arm
 * with the name tag tied to it), each drawn in a box the size of the stage, so that turning that
 * box about the joint turns the piece about the joint.
 */
const JOINT = ANCHORS.joint;
const TIP = ANCHORS.endRight;
const ORIGIN = `${JOINT.x}% ${((JOINT.y / 170) * 100).toFixed(3)}%`;
const CARD = ANCHORS.card;
/** A pose as motion takes it: shifts as shares of the stage, which is the size of the piece's box. */
const placed = (p: Pose) => ({ x: `${p.shift.x.toFixed(3)}%`, y: `${((p.shift.y / 170) * 100).toFixed(3)}%`, rotate: p.turn });

/** The time: kept outside the component, since it is only ever read in a handler or a frame. */
const clockNow = () => performance.now();

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

  const stageRef = useRef<HTMLDivElement>(null);
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

  /** Pulls the bone to `p`, creaking as it passes each mark on the way to giving, and gives at the end. */
  const strainTo = (p: Pt) => {
    const strain = strainOf(p);
    while (creak.current < CREAKS.length && strain >= CREAKS[creak.current]) {
      buzz(6 + creak.current * 4);
      playCrackle(mutedRef.current, { ms: 260, strain: CREAKS[creak.current] });
      creak.current += 1;
    }
    setPull(p);
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
    const stage = stageRef.current;
    if (!stage) return;
    begin();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    grab.current = { x: e.clientX, y: e.clientY, scale: stage.getBoundingClientRect().width / 100, moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const g = grab.current;
    if (!g || !g.scale) return;
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
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: look.floor, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      {!sceneGone && !preview ? (
        <Scene
          key={`scene-${run}`}
          lookId={f.look}
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
          stageRef={stageRef}
          leaving={phase === "open"}
          onDown={onDown}
          onMove={onMove}
          onUp={onUp}
          onPull={pullItself}
          onRead={openPage}
        />
      ) : null}
      {phase === "open" || preview ? (
        <Page key={`page-${run}`} lookId={f.look} s={s} data={data} winner={f.winner} wish={wish} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
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
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: look.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={s.title} from={senderName} to={recipientName} winner={f.winner} wish="" phase="whole" pull={{ x: 0, y: 0 }} card={false} canRead={false} reduce leaving={false} inert onDown={() => {}} onMove={() => {}} onUp={() => {}} onPull={() => {}} onRead={() => {}} />
    </div>
  );
}

type SceneProps = {
  lookId: LookId;
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
  stageRef?: RefObject<HTMLDivElement | null>;
  leaving: boolean;
  inert?: boolean;
  onDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onMove: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  onUp: () => void;
  onPull: () => void;
  onRead: () => void;
};

function Scene({ lookId, s, title, from, to, winner, wish, phase, pull, card, canRead, reduce, stageRef, leaving, inert = false, onDown, onMove, onUp, onPull, onRead }: SceneProps) {
  const look = LOOKS[lookId];
  const snapped = phase === "snapped" || phase === "open";
  const tone = { page: look.floor, glow: [look.accent, look.accent] as const, accent: look.accent, dark: look.dark };
  const pose = snapped ? settled(winner, armTurn(JOINT, TIP, pull)) : strained(JOINT, TIP, pull);
  const move = snapped && !reduce ? { type: "spring" as const, stiffness: 120, damping: 11 } : { duration: 0 };
  const piece = "pointer-events-none absolute inset-0";
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      <style>{`${STAGE_KEYFRAMES}${FOIL_KEYFRAMES}`}</style>
      <Plate base={ART_BASE} look={lookId} floor={look.floor} bulbs={BULBS} still={reduce} shade={look.vignette} glow={look.glow} />

      <div ref={stageRef} style={STAGE}>
        {/* the place card at the head of the table: who it is from, and the title in foil */}
        <div className="absolute text-center" style={{ left: `${CARD.x}%`, top: down(CARD.y), width: "60%", transform: "translate(-50%, -50%) rotate(1.5deg)", color: look.ink, opacity: card ? 0 : 1, transition: "opacity .4s ease" }}>
          <p className="truncate text-[calc(2.1*var(--k))] tracking-[0.34em] uppercase" style={{ color: look.soft }}>
            {from} → {to}
          </p>
          <h1
            className="mt-[calc(.8*var(--k))] line-clamp-3 leading-[1.04] text-balance italic [overflow-wrap:anywhere]"
            style={{ ...(reduce ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), fontFamily: POSTER_FONT, fontWeight: 600, fontSize: title.length > 44 ? "calc(3.5*var(--k))" : title.length > 22 ? "calc(4.8*var(--k))" : "calc(7*var(--k))" }}
          >
            {title}
          </h1>
        </div>

        {/* the wishbone on its plate: each arm with the name tied to it, and the head they share */}
        <motion.div aria-hidden="true" className={piece} style={{ transformOrigin: ORIGIN }} initial={false} animate={placed(pose.left)} transition={move}>
          <Sprite base={ART_BASE} name="arm-left" rect={SPRITES["arm-left"]} />
          <TagName at={ANCHORS.tagLeft} name={from} turn={5} />
        </motion.div>
        <motion.div aria-hidden="true" className={piece} style={{ transformOrigin: ORIGIN }} initial={false} animate={placed(pose.right)} transition={move}>
          <Sprite base={ART_BASE} name="arm-right" rect={SPRITES["arm-right"]} />
          <TagName at={ANCHORS.tagRight} name={to} turn={-5} />
        </motion.div>
        <motion.div aria-hidden="true" className={piece} style={{ transformOrigin: ORIGIN }} initial={false} animate={placed(pose.head)} transition={move}>
          <Sprite base={ART_BASE} name="head" rect={SPRITES.head} />
        </motion.div>
        {snapped && !reduce ? <Sparks at={winner === "them" ? ANCHORS.breakLeft : ANCHORS.breakRight} count={12} reach={16} colors={["#fff6dc", "#f0dcae", "#ffffff", "#e9cf9a"]} seed={5} /> : null}

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
            className="z-[5] cursor-grab touch-none rounded-[calc(8*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/60 active:cursor-grabbing"
            style={laid({ x: 46, y: JOINT.y - 6, w: 54, h: TIP.y - JOINT.y + 26 })}
          />
        ) : null}

        {!inert ? (
          <div className="pointer-events-none absolute inset-x-0 z-[6] flex justify-center" style={{ top: down(149) }}>
            <TapPill tone={tone} reduce={reduce} hidden={phase !== "whole"}>
              {s.pull}
            </TapPill>
          </div>
        ) : null}

        <AnimatePresence>
          {card ? (
            <motion.div key="card" className="absolute inset-x-[7%] z-[8]" style={{ top: down(3) }} initial={reduce ? false : { opacity: 0, y: -20, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ type: "spring", stiffness: 180, damping: 16 }}>
              <WishCard look={look} s={s} from={from} winner={winner} wish={wish} reduce={reduce} />
            </motion.div>
          ) : null}
        </AnimatePresence>

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

/** A name written on the tag tied to an arm. */
function TagName({ at, name, turn }: { at: Pt; name: string; turn: number }) {
  const short = name.length > 11 ? `${name.slice(0, 10)}…` : name;
  return (
    <p className="absolute whitespace-nowrap" style={{ left: `${at.x}%`, top: down(at.y), transform: `translate(-50%, -50%) rotate(${turn}deg)`, fontFamily: SCRIPT_FONT, fontSize: `calc(${short.length > 7 ? 2.5 : 3.2}*var(--k))`, lineHeight: 1, color: "#3a2410" }}>
      {short}
    </p>
  );
}

/** What the big half says, on a gold-lined card. `unit` is what its type is sized in: the stage's on the table, the page's on the note. */
function WishCard({ look, s, from, winner, wish, reduce, unit = "var(--k)" }: { look: Look; s: Copy; from: string; winner: "them" | "me"; wish: string; reduce: boolean; unit?: string }) {
  const size = (n: number) => `calc(${n} * ${unit})`;
  return (
    <PaperSheet base={ART_BASE} art={SHEETS.letter} margin={0.11} head={0.12} tail={0.11}>
      <div className="text-center" style={{ color: look.ink }}>
        <p className="leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ ...(reduce ? { ...FOIL_ON_LIGHT, animation: "none" } : FOIL_ON_LIGHT), fontFamily: POSTER_FONT, fontSize: size(6.6), fontWeight: 600 }}>
          {winner === "them" ? s.themWon : fill(s.meWon, { name: from })}
        </p>
        <p className="italic" style={{ marginTop: size(1.1), fontSize: size(2.9), color: look.soft }}>
          {winner === "them" ? s.themAside : s.meAside}
        </p>
        <p className="font-semibold tracking-[0.24em] uppercase [overflow-wrap:anywhere]" style={{ marginTop: size(3), fontSize: size(2.3), color: look.soft }}>
          {fill(s.wished, { name: from })}
        </p>
        <p className="leading-[1.2] text-balance [overflow-wrap:anywhere]" style={{ marginTop: size(1.1), fontFamily: "var(--gift-font-hand)", fontSize: size(wish.length > 70 ? 4.8 : 6) }}>
          {wish}
        </p>
      </div>
    </PaperSheet>
  );
}

/** The note: the wish on its card, the letter on a gold-lined sheet under it, then the photos, pegged to a line. */
function Page({ lookId, s, data, winner, wish, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<WishboneFields>["data"]; winner: "them" | "me"; wish: string; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: look.ink, soft: look.soft, accent: look.accent, rule: "rgba(120,84,30,.3)", label: "#fff6ea", face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => ({ print: (rng() - 0.5) * 6, peg: (rng() - 0.5) * 10, shift: (rng() - 0.5) * 24 }));
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
            <WishCard look={look} s={s} from={data.senderName} winner={winner} wish={wish} reduce={still} unit="var(--u)" />
          </div>
        }
        eyebrow={fill(s.note, { name: data.senderName })}
        gallery={s.gallery}
        columns={2}
        photo={(slot) => <Pegged slot={slot} tilt={tilt[slot.index]} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/*
 * A photo pegged to a line. Everything is a share of the print's width: the peg's picture (which
 * has its shadow in it) is PEG_W wide, PEG_EDGE of the way down it is where the print begins, and
 * the twine runs behind it a little above that.
 */
const PEG = SPRITES.peg;
const PEG_EDGE = (ANCHORS.pegEdge.y - PEG.y) / PEG.h;
const PEG_W = 12;
const PEG_ABOVE = PEG_EDGE * PEG_W * (PEG.h / PEG.w);

function Pegged({ slot, tilt }: { slot: PhotoSlot; tilt?: { print: number; peg: number; shift: number } }) {
  return (
    <div className="relative" style={{ paddingTop: `${(PEG_ABOVE + 1).toFixed(2)}%` }}>
      <div aria-hidden="true" className="pointer-events-none absolute top-0 h-0" style={{ left: "-80%", right: "-80%", marginTop: `${(PEG_ABOVE * 0.62).toFixed(2)}%`, paddingTop: "2%", backgroundImage: `url(${ART_BASE}twine.webp)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat", filter: "drop-shadow(0 calc(.6*var(--u)) calc(.8*var(--u)) rgba(0,0,0,.35))" }} />
      <Print
        slot={slot}
        rot={tilt?.print ?? 0}
        holder={
          <img
            src={`${ART_BASE}peg.webp`}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute top-0 max-w-none select-none"
            style={{ left: `${(50 + (tilt?.shift ?? 0)).toFixed(1)}%`, width: `${PEG_W}%`, transform: `translate(-50%, ${(-PEG_EDGE * 100).toFixed(1)}%) rotate(${(tilt?.peg ?? 0).toFixed(1)}deg)`, transformOrigin: `50% ${(PEG_EDGE * 100).toFixed(1)}%` }}
          />
        }
      />
    </div>
  );
}
