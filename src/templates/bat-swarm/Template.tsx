"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString, mulberry32 } from "../_shared/random";
import { Ambience } from "../_shared/Ambience";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playChime, playFlutter, playSparkle, playWhoosh } from "../_shared/night/sfx";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { BatSvg, Clouds, MoonDisc, Skyline } from "./art";
import { LOOKS, type Look, type LookId } from "./looks";
import { fieldsSchema, type BatSwarmFields } from "./schema";
import { Swarm } from "./Swarm";
import { moonFor, type Moon, type Step } from "./flight";

const S = {
  en: { tap: "tap the moon", skip: "skip", title: "look up", gallery: "by the light of the moon", note: "a note from {name}" },
  es: { tap: "toca la luna", skip: "saltar", title: "mira arriba", gallery: "a la luz de la luna", note: "una nota de {name}" },
};
type Copy = (typeof S)["en"];

const KEYFRAMES = `
.bs-cloud{animation:bs-drift 52s ease-in-out infinite alternate}
@keyframes bs-drift{from{translate:-9% 0}to{translate:9% 0}}
.bs-win{animation:bs-glim 3.1s ease-in-out infinite alternate}
@keyframes bs-glim{0%{opacity:.55}35%{opacity:1}70%{opacity:.7}100%{opacity:1}}
.bs-twinkle{animation:bs-tw 3.6s ease-in-out infinite alternate}
@keyframes bs-tw{from{opacity:.35}to{opacity:.9}}
@media (prefers-reduced-motion: reduce){.bs-cloud,.bs-win,.bs-twinkle{animation:none}}
`;

/** idle: bats circle the moon. swarm: the flight is playing. open: the letter, with the last of the bats leaving over it. */
type Stage = "idle" | "swarm" | "open";

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "midnight";
};
const readLine = (fields: unknown): string => {
  const parsed = fieldsSchema.safeParse(fields);
  return (parsed.success ? parsed.data.line : undefined)?.trim() ?? "";
};
/** The name as the bats can fit it: a name too long for the moon is cut to its first word. */
const nameFor = (name: string, locale: string) => {
  const trimmed = name.trim();
  const fits = trimmed.length > 16 ? (trimmed.split(/\s+/)[0] ?? trimmed).slice(0, 16) : trimmed;
  return fits.toLocaleUpperCase(locale);
};

const skyOf = (look: Look) => `linear-gradient(180deg, ${look.sky[0]} 0%, ${look.sky[1]} 52%, ${look.sky[2]} 100%)`;
const STARS = "radial-gradient(rgba(255,255,255,.85) calc(.32*var(--u)), transparent calc(.45*var(--u))), radial-gradient(rgba(255,255,255,.45) calc(.22*var(--u)), transparent calc(.34*var(--u)))";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<BatSwarmFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const look = LOOKS[readLook(data.fields)];
  const line = readLine(data.fields);
  const words = useMemo(() => [nameFor(data.recipientName, data.locale), ...(line ? [line.toLocaleUpperCase(data.locale)] : [])], [data.recipientName, data.locale, line]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|bat-swarm`);

  const [stage, setStage] = useState<Stage>(preview ? "open" : "idle");
  const [playing, setPlaying] = useState(false);
  const [swarmDone, setSwarmDone] = useState(preview);
  const [sceneGone, setSceneGone] = useState(preview);
  const [canSkip, setCanSkip] = useState(false);
  const [skip, setSkip] = useState(0);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const touch = () => {
    if (stage !== "idle") return;
    prime();
    void audio.start();
    buzz(14);
    eventRef.current?.({ type: "started" });
    setStage("swarm");
    after(2600, () => setCanSkip(true));
    if (reduce) {
      // No flight: the name sits on the moon in bats, still, long enough to read.
      setPlaying(false);
      playChime(mutedRef.current);
      after(2600, openPage);
      return;
    }
    setPlaying(true);
  };

  const openPage = () => {
    setStage("open");
    setSwarmDone(true);
    eventRef.current?.({ type: "progress", pct: 30 });
    after(1400, () => setSceneGone(true));
  };

  // The sounds follow the flight: wings as they pour out, air as they gather, a bell when the name can be read.
  const onStep = (step: Step) => {
    const muted = mutedRef.current;
    if (step.kind === "emerge") {
      playFlutter(muted);
      playWhoosh(muted);
    } else if (step.kind === "form") {
      playWhoosh(muted);
    } else if (step.kind === "hold") {
      // The last shape is the heart: a shimmer for that, a bell for the words.
      if (step.word === words.length) playSparkle(muted);
      else playChime(muted);
    } else if (step.kind === "scatter") {
      playFlutter(muted);
    }
  };

  const replay = () => {
    clear();
    setStage("idle");
    setPlaying(false);
    setSwarmDone(false);
    setSceneGone(false);
    setCanSkip(false);
    setRun((r) => r + 1);
  };

  const moon = size.ready ? moonFor(size.width, size.height) : null;
  const title = data.title?.trim() || s.title;
  const stillName = reduce && stage === "swarm";

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: skyOf(look), color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {!sceneGone && moon ? <Scene key={`scene-${run}`} look={look} s={s} moon={moon} from={data.senderName} to={data.recipientName} title={title} idle={stage === "idle"} leaving={stage === "open"} showSkip={canSkip && stage === "swarm" && !reduce} reduce={reduce} onTouch={touch} onSkip={() => setSkip((n) => n + 1)} /> : null}
      {stage === "open" ? <Page key={`page-${run}`} look={look} s={s} data={data} seed={seed} mode={mode} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {!swarmDone && !preview ? <Swarm key={`swarm-${run}`} words={words} look={look} seed={seed} playing={playing} still={stillName} skip={skip} onStep={onStep} onReveal={openPage} onDone={() => setSwarmDone(true)} className="pointer-events-none absolute inset-0 z-[40]" /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the moon with a few bats on it, before anyone has tapped. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const look = LOOKS[readLook(fields)];
  const s = S[locale] ?? S.en;
  const moon = size.ready ? moonFor(size.width, size.height) : null;
  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: skyOf(look), color: look.ink } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {moon ? <Scene look={look} s={s} moon={moon} from={senderName} to={recipientName} title={s.title} idle showSkip={false} reduce still onTouch={() => {}} onSkip={() => {}} /> : null}
    </div>
  );
}

/** Where a still bat hangs round the moon, as fractions of its radius: for the cover tile and the reduced-motion scene. */
const STILL_BATS = [
  { x: -1.18, y: -0.55, w: 0.34, r: -14, up: 0.5 },
  { x: 1.12, y: -0.7, w: 0.3, r: 12, up: 0.8 },
  { x: -0.72, y: 0.95, w: 0.28, r: 8, up: -0.2 },
  { x: 0.9, y: 0.62, w: 0.36, r: -8, up: 0.3 },
  { x: 0.1, y: -1.25, w: 0.24, r: 4, up: 0.9 },
];

function Scene({ look, s, moon, from, to, title, idle, leaving = false, showSkip, reduce, still = false, onTouch, onSkip }: { look: Look; s: Copy; moon: Moon; from: string; to: string; title: string; idle: boolean; leaving?: boolean; showSkip: boolean; reduce: boolean; still?: boolean; onTouch: () => void; onSkip: () => void }) {
  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .55s ease" }}>
      <div aria-hidden="true" className="bs-twinkle absolute inset-0 opacity-70" style={{ backgroundImage: STARS, backgroundSize: "calc(14*var(--u)) calc(14*var(--u)), calc(19*var(--u)) calc(19*var(--u))", backgroundPosition: "0 0, calc(7*var(--u)) calc(9*var(--u))" }} />
      <MoonDisc moon={moon} look={look} />
      <Clouds look={look} moon={moon} />
      {still ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {STILL_BATS.map((b, i) => (
            <div key={i} className="absolute" style={{ left: moon.cx + b.x * moon.r, top: moon.cy + b.y * moon.r, width: b.w * moon.r * 2, transform: `translate(-50%,-50%) rotate(${b.r}deg)` }}>
              <BatSvg look={look} up={b.up} />
            </div>
          ))}
        </div>
      ) : null}
      <Skyline look={look} />

      <div className="absolute inset-x-[8%] z-[8] text-center" style={{ top: "calc(5 * var(--k))" }}>
        <p className="text-[calc(2.4*var(--k))] tracking-[0.34em] uppercase opacity-70 [overflow-wrap:anywhere]">{from} → {to}</p>
        <h1 className="mt-[calc(1.6*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 24 ? "calc(6*var(--k))" : "calc(8.4*var(--k))", color: look.ink, textShadow: `0 0 calc(4*var(--k)) ${look.glow}66` }}>
          {title}
        </h1>
      </div>

      <div className="pointer-events-none absolute inset-x-0 z-[8] flex justify-center" style={{ bottom: "calc(46 * var(--k))" }}>
        <TapPill tone={{ page: look.sky[0], glow: [look.glow, look.glow], accent: look.ink, dark: true }} hidden={!idle} reduce={reduce}>
          {s.tap}
        </TapPill>
      </div>
      {showSkip ? (
        <div className="absolute inset-x-0 z-[8] flex justify-center" style={{ bottom: "calc(40 * var(--k))" }}>
          <button type="button" onClick={onSkip} className="px-[calc(4*var(--k))] py-[calc(1.6*var(--k))] text-[calc(2.6*var(--k))] tracking-[0.3em] uppercase opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            {s.skip}
          </button>
        </div>
      ) : null}
      {idle && !still ? <button type="button" onClick={onTouch} aria-label={s.tap} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:ring-inset" /> : null}
    </div>
  );
}

function Page({ look, s, data, seed, mode, still, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<BatSwarmFields>["data"]; seed: number; mode: TemplateProps["mode"]; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.card, ink: look.cardInk, soft: look.cardSoft, accent: look.accent, edge: look.cardEdge, dark: true, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 3);
    return data.photos.map(() => (rng() - 0.5) * 4);
  }, [data.photos, seed]);

  return (
    <motion.div className="absolute inset-0 z-[20]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.3 }}>
      <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: STARS, backgroundSize: "calc(14*var(--u)) calc(14*var(--u)), calc(19*var(--u)) calc(19*var(--u))", backgroundPosition: "0 0, calc(7*var(--u)) calc(9*var(--u))" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "bats", colors: ["rgba(205,190,255,.55)", "rgba(160,140,220,.5)"], count: 3 }, { kind: "sparkles", colors: ["#FFFFFF", look.glow], count: 8 }]} opacity={0.8} />
      </div>
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={s.note.replace("{name}", data.senderName)}
        gallery={s.gallery}
        hero={<MoonHero look={look} name={nameFor(data.recipientName, data.locale)} />}
        photo={(slot) => <MoonPhoto slot={slot} look={look} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** The bats that stayed on the page's moon: where, how wide (in %), and how they lean. */
const HERO_BATS = [
  { x: -8, y: 6, w: 20, r: -14, up: 0.6 },
  { x: 82, y: 0, w: 16, r: 14, up: 0.9 },
  { x: 70, y: 86, w: 22, r: -8, up: 0.2 },
];

/** A small moon at the head of the page with their name across it, and three bats that have stayed. */
function MoonHero({ look, name }: { look: Look; name: string }) {
  const size = Math.min(12, 46 / Math.max(3, name.length * 0.62));
  return (
    <div className="relative mx-auto aspect-square w-[min(58cqw,280px)]">
      <div aria-hidden="true" className="absolute rounded-full" style={{ inset: "-30%", background: `radial-gradient(circle, ${look.glow}55 0%, ${look.glow}1c 42%, transparent 68%)` }} />
      <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 36% 30%, ${look.moon[0]} 0%, ${look.moon[0]} 36%, ${look.moon[1]} 100%)`, boxShadow: `0 0 calc(8*var(--u)) ${look.glow}aa, inset calc(-3*var(--u)) calc(-2.4*var(--u)) calc(6*var(--u)) rgba(40,20,60,.3)` }} />
      <p className="absolute inset-0 grid place-items-center px-[8%] text-center leading-none italic" style={{ fontFamily: POSTER_FONT, fontSize: `calc(${size.toFixed(2)} * var(--u))`, color: look.bat }}>
        {name}
      </p>
      {HERO_BATS.map((b, i) => (
        <div key={i} aria-hidden="true" className="absolute" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, transform: `rotate(${b.r}deg)` }}>
          <BatSvg look={look} up={b.up} />
        </div>
      ))}
    </div>
  );
}

/** A photo as a second moon: a circle with its own glow, and a bat that has landed on the edge of it. */
function MoonPhoto({ slot, look, rot }: { slot: PhotoSlot; look: Look; rot: number }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0 mx-auto w-[min(76cqw,360px)]" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="block w-full cursor-pointer rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/60">
        <div className="relative aspect-square w-full overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 calc(1.1*var(--u)) ${look.glow}33, 0 0 calc(15*var(--u)) ${look.glow}66, inset 0 0 calc(9*var(--u)) rgba(0,0,0,.5)` }}>
          <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 34% 26%, rgba(255,255,255,.2), transparent 42%)" }} />
        </div>
      </button>
      <div aria-hidden="true" className="pointer-events-none absolute -top-[calc(3*var(--u))] -right-[calc(2*var(--u))] w-[calc(15*var(--u))] rotate-[12deg]">
        <BatSvg look={look} up={0.6} />
      </div>
      {photo.caption ? (
        <figcaption className="mt-[calc(3.5*var(--u))] text-center leading-tight" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(3.5*var(--u))", color: look.ink }}>
          {photo.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
