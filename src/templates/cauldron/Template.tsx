"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playBubble, playChime, playCork, playSparkle, playSplash, playWhoosh } from "../_shared/night/sfx";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { Bottle, Cork, Essence, Fire, Herbs, ICONS, Jar, PotBack, PotFront, STEAM_HEART, WindowArt, type IconId } from "./art";
import { BOIL, bubbleSpecs, bubblesFor, FLY_MS, ingredientsFor, potionColor, WORDS_MS } from "./brew";
import { LOOKS, type Look, type LookId } from "./looks";
import { fieldsSchema, type CauldronFields } from "./schema";

const S = {
  en: {
    first: "tap a jar",
    next: "another one",
    pop: "pop the cork",
    sign: "a potion for {name}",
    potion: "Love Potion No. 9",
    forName: "for {name}",
    gallery: "kept in jars",
    note: "a note from {name}",
    recipe: "the recipe",
    part: "one part",
    add: "Add {what} to the potion",
    ingredients: ["your laugh", "your cold hands", "the way you say my name"],
  },
  es: {
    first: "toca un tarro",
    next: "otro más",
    pop: "descorcha",
    sign: "una poción para {name}",
    potion: "Poción de amor nº 9",
    forName: "para {name}",
    gallery: "guardadas en tarros",
    note: "una nota de {name}",
    recipe: "la receta",
    part: "una parte",
    add: "Echar {what} a la poción",
    ingredients: ["tu risa", "tus manos frías", "cómo dices mi nombre"],
  },
};
type Copy = (typeof S)["en"];

const KEYFRAMES = `
.cb-flame{animation:cb-fl 1.1s ease-in-out infinite alternate}
@keyframes cb-fl{0%{transform:scale(1,1) skewX(0)}30%{transform:scale(.94,1.1) skewX(3deg)}65%{transform:scale(1.04,.92) skewX(-3deg)}100%{transform:scale(.98,1.06) skewX(1.5deg)}}
.cb-sway{animation:cb-sw 5s ease-in-out infinite alternate}
@keyframes cb-sw{from{transform:rotate(-2.2deg)}to{transform:rotate(2.2deg)}}
.cb-bob{animation:cb-bb 2.6s ease-in-out infinite alternate}
@keyframes cb-bb{from{transform:translateY(-.8px)}to{transform:translateY(.9px)}}
.cb-glow{transform-box:fill-box;transform-origin:center;animation:cb-gl 2.2s ease-in-out infinite alternate}
@keyframes cb-gl{from{opacity:.75;transform:scale(.95)}to{opacity:1;transform:scale(1.06)}}
.cb-hint{transform-box:fill-box;transform-origin:center;animation:cb-ht 1.8s ease-out infinite}
@keyframes cb-ht{0%{transform:scale(.78);opacity:.9}100%{transform:scale(1.2);opacity:0}}
.cb-blink{transform-box:fill-box;transform-origin:center;animation:cb-bl 5.5s infinite}
@keyframes cb-bl{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.cb-tail{transform-box:fill-box;transform-origin:0% 100%;animation:cb-tl 2.8s ease-in-out infinite alternate}
@keyframes cb-tl{from{transform:rotate(-8deg)}to{transform:rotate(10deg)}}
.cb-fizz{animation:cb-fz 2.4s ease-in infinite}
@keyframes cb-fz{0%{transform:translateY(4px);opacity:0}30%{opacity:.4}100%{transform:translateY(-14px);opacity:0}}
.cb-wave{animation:cb-wv 2.2s ease-in-out infinite alternate}
@keyframes cb-wv{from{transform:translateY(-.8px)}to{transform:translateY(1px)}}
.cb-rise{animation:cb-up var(--d) ease-in infinite}
@keyframes cb-up{0%{transform:translate(0,0) scale(.4);opacity:0}14%{opacity:.95}80%{opacity:.9;transform:translate(var(--dx),calc(var(--h)*-.85)) scale(1)}100%{transform:translate(var(--dx),calc(var(--h)*-1)) scale(1.35);opacity:0}}
.cb-steam{animation:cb-st 4.6s ease-out infinite}
@keyframes cb-st{0%{transform:translateY(0) scale(.6);opacity:0}25%{opacity:.5}100%{transform:translateY(calc(-26*var(--k))) scale(1.7);opacity:0}}
.cb-shake{animation:cb-sk .13s linear infinite}
@keyframes cb-sk{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(.5px,-.6px) rotate(-.9deg)}50%{transform:translate(-.5px,.5px) rotate(.9deg)}75%{transform:translate(.4px,.4px) rotate(-.5deg)}100%{transform:translate(0,0) rotate(0)}}
.cb-drop{animation:cb-dr .85s ease-out forwards}
@keyframes cb-dr{0%{transform:translate(0,0) scale(1);opacity:1}45%{transform:translate(calc(var(--dx)*.6),calc(var(--h)*-1)) scale(1);opacity:1}100%{transform:translate(var(--dx),calc(var(--h)*-.05)) scale(.5);opacity:0}}
.cb-ripple{animation:cb-rp 1.1s ease-out forwards}
@keyframes cb-rp{0%{transform:scale(.25);opacity:.9}100%{transform:scale(1.15);opacity:0}}
.cb-words{animation:cb-wd 2.6s ease-out forwards}
@keyframes cb-wd{0%{transform:translate(-50%,0);opacity:0}12%{opacity:1}80%{opacity:1}100%{transform:translate(-50%,calc(-9*var(--k)));opacity:0}}
@media (prefers-reduced-motion: reduce){.cb-flame,.cb-sway,.cb-bob,.cb-glow,.cb-hint,.cb-blink,.cb-tail,.cb-fizz,.cb-wave,.cb-rise,.cb-steam,.cb-shake{animation:none}}
`;

/** Where the scene's things stand, in the stage's own units (100 wide, 170 tall). */
const POT = { left: 13, top: 90, w: 74 };
const SURFACE = { cx: 50, cy: 100.8, rx: 26, ry: 4.8 };
const JAR = { w: 27, h: 32, bottom: 78 };
const jarXs = (n: number) => (n <= 1 ? [50] : n === 2 ? [31, 69] : [17, 50, 83]);

/** idle: the first jar is waiting. brewing: some are in. boil: it has boiled over. bottle: the bottle is up. pop: the cork has gone. open: the letter. */
type Phase = "idle" | "brewing" | "boil" | "bottle" | "pop" | "open";

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "witch";
};
const readFields = (fields: unknown, locale: "en" | "es") => {
  const parsed = fieldsSchema.safeParse(fields);
  const s = S[locale] ?? S.en;
  const data = parsed.success ? parsed.data : fieldsSchema.parse({});
  return { ingredients: ingredientsFor(data.ingredients, s.ingredients), potion: data.potion?.trim() || s.potion };
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<CauldronFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const look = LOOKS[readLook(data.fields)];
  const { ingredients, potion } = useMemo(() => readFields(data.fields, data.locale), [data.fields, data.locale]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|cauldron`);
  const total = ingredients.length;

  const [phase, setPhase] = useState<Phase>(preview ? "open" : "idle");
  const [taken, setTaken] = useState<boolean[]>([]);
  const [flying, setFlying] = useState<{ i: number; id: number } | null>(null);
  const [drops, setDrops] = useState(0);
  const [line, setLine] = useState<{ id: number; text: string; icon: IconId } | null>(null);
  const [heart, setHeart] = useState(false);
  const [burst, setBurst] = useState(0);
  const [sceneGone, setSceneGone] = useState(preview);
  const [run, setRun] = useState(0);
  const count = useRef(0);
  const nextId = useRef(0);
  const { after, clear } = useTimers();

  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const level = taken.filter(Boolean).length;

  const openPage = () => {
    setPhase("open");
    eventRef.current?.({ type: "progress", pct: 30 });
    after(1500, () => setSceneGone(true));
  };

  const boil = () => {
    setPhase("boil");
    const muted = mutedRef.current;
    playWhoosh(muted);
    buzz(24);
    after(BOIL.heart, () => {
      setHeart(true);
      playSparkle(mutedRef.current);
    });
    after(BOIL.bottle, () => {
      setPhase("bottle");
      playChime(mutedRef.current);
    });
  };

  const drop = (i: number) => {
    if ((phase !== "idle" && phase !== "brewing") || flying || taken[i]) return;
    prime();
    if (count.current === 0) {
      void audio.start();
      eventRef.current?.({ type: "started" });
    }
    buzz(10);
    count.current += 1;
    const id = (nextId.current += 1);
    const text = ingredients[i];
    setPhase("brewing");
    setFlying({ i, id });
    playWhoosh(mutedRef.current);
    const land = () => {
      setFlying(null);
      setTaken((t) => {
        const n = [...t];
        n[i] = true;
        return n;
      });
      setDrops((d) => d + 1);
      setLine({ id, text, icon: ICONS[i % ICONS.length] });
      playSplash(mutedRef.current);
      after(180, () => playBubble(mutedRef.current));
      after(360, () => playBubble(mutedRef.current));
      after(WORDS_MS, () => setLine((l) => (l?.id === id ? null : l)));
      if (count.current >= total) after(900, boil);
    };
    if (reduce) land();
    else after(FLY_MS, land);
  };

  const popCork = () => {
    if (phase !== "bottle") return;
    setPhase("pop");
    playCork(mutedRef.current);
    after(120, () => playSparkle(mutedRef.current));
    buzz(30);
    setBurst((b) => b + 1);
    after(reduce ? 400 : 1500, openPage);
  };

  const replay = () => {
    clear();
    count.current = 0;
    setPhase("idle");
    setTaken([]);
    setFlying(null);
    setLine(null);
    setHeart(false);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.sign.replace("{name}", data.recipientName);

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {!sceneGone ? (
        <Scene
          key={`scene-${run}`}
          look={look}
          s={s}
          seed={seed}
          title={title}
          potion={potion}
          to={data.recipientName}
          ingredients={ingredients}
          taken={taken}
          level={level}
          phase={phase}
          flying={flying}
          drops={drops}
          line={line}
          heart={heart}
          reduce={reduce}
          leaving={phase === "open"}
          onDrop={drop}
          onPop={popCork}
        />
      ) : null}
      <Confetti burst={burst} colors={[look.liquid[3], look.liquid[2], look.liquid[1], "#FFFFFF", "#FFE9A8"]} count={170} origin={{ x: 0.5, y: 0.4 }} className="pointer-events-none absolute inset-0 z-[35]" />
      {phase === "open" ? <Page key={`page-${run}`} look={look} s={s} data={data} seed={seed} mode={mode} still={preview || reduce} ingredients={ingredients} potion={potion} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the kitchen before anything has gone in. */
export function Opening({ fields, recipientName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  const s = S[locale] ?? S.en;
  const { ingredients, potion } = readFields(fields, locale);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)`, color: look.ink } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      <Scene look={look} s={s} seed={1} title={s.sign.replace("{name}", recipientName)} potion={potion} to={recipientName} ingredients={ingredients} taken={[]} level={0} phase="idle" flying={null} drops={0} line={null} heart={false} reduce leaving={false} inert onDrop={() => {}} onPop={() => {}} />
    </div>
  );
}

type SceneProps = {
  look: Look;
  s: Copy;
  seed: number;
  title: string;
  potion: string;
  to: string;
  ingredients: string[];
  taken: boolean[];
  level: number;
  phase: Phase;
  flying: { i: number; id: number } | null;
  drops: number;
  line: { id: number; text: string; icon: IconId } | null;
  heart: boolean;
  reduce: boolean;
  leaving: boolean;
  /** A picture of the first screen, with nothing to press: the editor's cover picker puts it inside a button. */
  inert?: boolean;
  onDrop: (i: number) => void;
  onPop: () => void;
};

const pct = (units: number, of: number) => `${(units / of) * 100}%`;

function Scene({ look, s, seed, title, potion, to, ingredients, taken, level, phase, flying, drops, line, heart, reduce, leaving, inert = false, onDrop, onPop }: SceneProps) {
  const colour = potionColor(look.liquid, level);
  const xs = jarXs(ingredients.length);
  const boiling = phase === "boil" || phase === "bottle" || phase === "pop";
  const bubbles = useMemo(() => bubbleSpecs(seed, 22), [seed]);
  const shown = Math.min(bubbles.length, bubblesFor(boiling ? 4 : level));
  const nextJar = ingredients.findIndex((_, i) => !taken[i]);
  const shelfDim = phase === "bottle" || phase === "pop" ? 0.28 : 1;

  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .7s ease" }}>
      {/* the fire throws its light up the wall */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 38% at 50% 100%, ${look.fire[0]}55, transparent 70%), radial-gradient(60% 30% at 50% 66%, ${colour}30, transparent 70%)`, transition: "background .9s ease" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(125% 100% at 50% 45%, transparent 52%, rgba(0,0,0,.6))" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "embers", colors: [look.fire[0], look.fire[1]], count: 12 }, { kind: "dust", colors: [colour, "#FFFFFF"], count: 10 }]} opacity={0.75} />
      </div>

      <div className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        {/* a hanging sign */}
        <div className="absolute inset-x-[19%] top-[0.6%] z-[3]">
          <div className="mx-auto flex w-[68%] justify-between px-[8%]" aria-hidden="true">
            <span className="block w-[calc(.5*var(--k))] bg-[#c9b48a]" style={{ height: "calc(3*var(--k))" }} />
            <span className="block w-[calc(.5*var(--k))] bg-[#c9b48a]" style={{ height: "calc(3*var(--k))" }} />
          </div>
          <p className="mx-auto w-full rounded-[calc(1.2*var(--k))] px-[calc(3*var(--k))] py-[calc(2.2*var(--k))] text-center leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 26 ? "calc(4.3*var(--k))" : "calc(5.6*var(--k))", color: "#f6e7c8", background: "linear-gradient(180deg, #5a3b1f, #3b2412)", boxShadow: "inset 0 0 0 calc(.35*var(--k)) rgba(255,230,180,.22), 0 calc(1.4*var(--k)) calc(2.4*var(--k)) rgba(0,0,0,.55)" }}>
            {title}
          </p>
        </div>

        <div aria-hidden="true" className="absolute z-[1]" style={{ left: "5%", top: pct(14, 170), width: "28%", height: pct(34, 170) }}>
          <WindowArt look={look} />
        </div>
        <div aria-hidden="true" className="absolute z-[1]" style={{ left: "80%", top: 0, width: "20%", height: pct(30, 170) }}>
          <Herbs />
        </div>

        {/* the shelf, and the jars on it */}
        <div aria-hidden="true" className="absolute inset-x-0 z-[2]" style={{ top: pct(JAR.bottom, 170), height: pct(3.2, 170), background: "linear-gradient(180deg, #5a3b1f, #2f1d0e)", boxShadow: "0 calc(1.2*var(--k)) calc(2*var(--k)) rgba(0,0,0,.6)" }} />
        <div style={{ opacity: shelfDim, transition: "opacity .8s ease" }}>
          {ingredients.map((text, i) => {
            const full = !taken[i];
            const active = phase !== "pop" && phase !== "bottle" && phase !== "boil" && !flying && full;
            const Box = inert ? "div" : "button";
            return (
              <Box
                key={i}
                {...(inert ? { "aria-hidden": true } : { type: "button" as const, disabled: !active, onClick: () => onDrop(i), "aria-label": s.add.replace("{what}", text) })}
                className="absolute z-[5] block outline-none focus-visible:ring-4 focus-visible:ring-white/60 enabled:cursor-pointer enabled:active:scale-[.97]"
                style={{ left: pct(xs[i] - JAR.w / 2, 100), top: pct(JAR.bottom - JAR.h, 170), width: pct(JAR.w, 100), height: pct(JAR.h, 170) }}
              >
                <Jar look={look} icon={ICONS[i % ICONS.length]} full={full && !(flying && flying.i === i)} hint={i === nextJar && phase === "idle"} tint={look.liquid[Math.min(3, i + 1)]} />
                <span className="absolute inset-x-[9%] top-[52%] block rounded-[calc(.6*var(--k))] px-[calc(1*var(--k))] py-[calc(.9*var(--k))] text-center leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.5*var(--k))", color: "#3a2410", background: "#f2e6c6", backgroundImage: PAPER_GRAIN, rotate: `${i % 2 ? 2 : -2}deg`, boxShadow: "0 calc(.4*var(--k)) calc(.9*var(--k)) rgba(0,0,0,.5)", opacity: full ? 1 : 0.55 }}>
                  {text}
                </span>
              </Box>
            );
          })}
        </div>

        {/* the fire, the pot and what is in it, back to front */}
        <div aria-hidden="true" className="absolute z-[2]" style={{ left: "4%", width: "92%", top: pct(131, 170), height: pct(37, 170) }}>
          <Fire look={look} />
        </div>
        <div className={phase === "boil" ? "cb-shake absolute z-[3]" : "absolute z-[3]"} style={{ left: pct(POT.left, 100), top: pct(POT.top, 170), width: pct(POT.w, 100), height: pct(POT.w * 0.8, 170) }}>
          <div className="absolute inset-0">
            <PotBack />
          </div>
          <div aria-hidden="true" className="absolute overflow-hidden rounded-[50%]" style={{ left: pct(((SURFACE.cx - SURFACE.rx) - POT.left) / POT.w * 100, 100), top: pct((SURFACE.cy - SURFACE.ry - POT.top) / (POT.w * 0.8) * 100, 100), width: pct(SURFACE.rx * 2 / POT.w * 100, 100), height: pct(SURFACE.ry * 2 / (POT.w * 0.8) * 100, 100), backgroundColor: colour, transition: "background-color 1.1s ease", transform: boiling ? "scale(1.1,1.35)" : undefined }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(60% 70% at 36% 30%, rgba(255,255,255,.55), transparent 62%), radial-gradient(90% 90% at 50% 100%, rgba(0,0,0,.35), transparent 70%)" }} />
          </div>
          <div className="absolute inset-0">
            <PotFront look={look} />
          </div>
        </div>

        {/* bubbles and steam, from the surface */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4]">
          {bubbles.slice(0, shown).map((b, i) => (
            <span key={i} className="cb-rise absolute block rounded-full" style={{ left: pct(SURFACE.cx - SURFACE.rx + b.x * SURFACE.rx * 2, 100), top: pct(SURFACE.cy, 170), width: `calc(${b.size.toFixed(2)} * var(--k))`, height: `calc(${b.size.toFixed(2)} * var(--k))`, background: `radial-gradient(circle at 34% 30%, #fff, ${colour} 60%, ${colour}aa)`, boxShadow: `0 0 calc(.8*var(--k)) ${colour}`, "--d": `${b.dur.toFixed(2)}s`, "--dx": `calc(${b.drift.toFixed(2)} * var(--k))`, "--h": `calc(${(5 + b.size * 4).toFixed(1)} * var(--k))`, animationDelay: `${b.delay.toFixed(2)}s` } as CSSProperties} />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="cb-steam absolute block rounded-full" style={{ left: pct(34 + i * 10.5, 100), top: pct(SURFACE.cy - 5, 170), width: "calc(14*var(--k))", height: "calc(14*var(--k))", background: `radial-gradient(circle, ${colour}66, transparent 68%)`, filter: "blur(calc(1.2*var(--k)))", animationDelay: `${-i * 1.15}s`, opacity: 0 }} />
          ))}
        </div>

        {/* an ingredient in flight, then its splash */}
        <AnimatePresence>
          {flying && !reduce ? (
            <motion.div
              key={flying.id}
              aria-hidden="true"
              className="pointer-events-none absolute z-[8] -translate-x-1/2 -translate-y-1/2"
              style={{ width: "calc(11*var(--k))", height: "calc(11*var(--k))" }}
              initial={{ left: pct(xs[flying.i], 100), top: pct(JAR.bottom - JAR.h * 0.55, 170), scale: 1, opacity: 1 }}
              animate={{ left: [pct(xs[flying.i], 100), pct((xs[flying.i] + 50) / 2, 100), pct(50, 100)], top: [pct(JAR.bottom - JAR.h * 0.55, 170), pct(34, 170), pct(SURFACE.cy - 1, 170)], scale: [1, 1.3, 0.55], rotate: [0, 160, 360] }}
              transition={{ duration: FLY_MS / 1000, ease: "easeIn", times: [0, 0.45, 1] }}
            >
              <Essence icon={ICONS[flying.i % ICONS.length]} tint={look.liquid[Math.min(3, flying.i + 1)]} />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {drops > 0 && !reduce ? <Splash key={`splash-${drops}`} colour={colour} seed={seed + drops} /> : null}

        {/* the line they just dropped in, rising out of the pot */}
        {line ? (
          <p key={`line-${line.id}`} className="cb-words absolute z-[9] text-center leading-tight [overflow-wrap:anywhere]" style={{ left: "50%", top: pct(83, 170), width: "78%", fontFamily: "var(--gift-font-hand)", fontSize: "calc(5.6*var(--k))", color: "#fff", textShadow: `0 0 calc(2*var(--k)) ${colour}, 0 calc(.3*var(--k)) calc(.8*var(--k)) rgba(0,0,0,.7)` }}>
            {line.text}
          </p>
        ) : null}

        {/* the steam coils into a heart */}
        {heart ? <SteamHeart colour={colour} reduce={reduce} fading={phase === "bottle" || phase === "pop"} /> : null}

        {/* the bottle */}
        <AnimatePresence>
          {phase === "bottle" || phase === "pop" ? (
            <motion.button
              key="bottle"
              type="button"
              onClick={onPop}
              disabled={phase !== "bottle"}
              aria-label={s.pop}
              className="absolute z-[10] block outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              style={{ left: pct(31, 100), width: pct(38, 100), height: pct(38 * (88 / 60), 170) }}
              initial={reduce ? false : { top: pct(98, 170), scale: 0.3, opacity: 0, rotate: -12 }}
              animate={{ top: pct(30, 170), scale: 1, opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 13 }}
            >
              <motion.span className="block h-full w-full" animate={reduce || phase === "pop" ? undefined : { y: [0, -5, 0], rotate: [-1.5, 1.5, -1.5] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
                <Bottle color={colour} corked={false} />
                {phase === "bottle" ? (
                  <span className="absolute" style={{ left: "39.2%", top: "3.4%", width: "21.6%", height: "12.5%" }}>
                    <Cork />
                  </span>
                ) : null}
                <span className="absolute flex flex-col items-center justify-center rounded-[calc(.6*var(--k))] px-[calc(1*var(--k))] text-center" style={{ left: "17%", top: "52%", width: "66%", height: "27%", background: "#f4e8cb", backgroundImage: PAPER_GRAIN, rotate: "-3deg", boxShadow: "0 calc(.4*var(--k)) calc(1*var(--k)) rgba(0,0,0,.45)", color: "#3a2410" }}>
                  <span className="leading-[1.02] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: potion.length > 18 ? "calc(2.9*var(--k))" : "calc(3.5*var(--k))" }}>{potion}</span>
                  <span className="mt-[calc(.5*var(--k))] leading-none" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(2.5*var(--k))", color: "#7a4a22" }}>{s.forName.replace("{name}", to)}</span>
                </span>
              </motion.span>
            </motion.button>
          ) : null}
        </AnimatePresence>
        {phase === "pop" ? <FlyingCork reduce={reduce} /> : null}

        {/* what to do next */}
        <div className="pointer-events-none absolute inset-x-0 z-[11] flex justify-center" style={{ top: pct(phase === "bottle" ? 91 : 85, 170) }}>
          <TapPill tone={{ page: look.wall[0], glow: [colour, colour], accent: look.ink, dark: true }} hidden={phase === "boil" || phase === "pop" || level >= ingredients.length || !!flying} reduce={reduce}>
            {phase === "idle" ? s.first : s.next}
          </TapPill>
          <TapPill tone={{ page: look.wall[0], glow: [colour, colour], accent: look.ink, dark: true }} hidden={phase !== "bottle"} reduce={reduce} className="absolute">
            {s.pop}
          </TapPill>
        </div>
      </div>
    </div>
  );
}

/** Eight drops thrown up where the ingredient landed, two rings spreading across the surface. */
function Splash({ colour, seed }: { colour: string; seed: number }) {
  const rng = mulberry32(seed);
  const drops = Array.from({ length: 9 }, () => ({ dx: (rng() - 0.5) * 30, h: 7 + rng() * 9, size: 0.9 + rng() * 1.1, delay: rng() * 0.06 }));
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[7]">
      {[0, 0.18].map((delay) => (
        <span key={delay} className="cb-ripple absolute block rounded-[50%]" style={{ left: pct(SURFACE.cx - SURFACE.rx, 100), top: pct(SURFACE.cy - SURFACE.ry, 170), width: pct(SURFACE.rx * 2, 100), height: pct(SURFACE.ry * 2, 170), border: `calc(.5*var(--k)) solid ${colour}`, boxShadow: `0 0 calc(1.2*var(--k)) ${colour}`, animationDelay: `${delay}s`, opacity: 0 }} />
      ))}
      {drops.map((d, i) => (
        <span key={i} className="cb-drop absolute block rounded-full" style={{ left: pct(50, 100), top: pct(SURFACE.cy - 1, 170), width: `calc(${d.size.toFixed(2)} * var(--k))`, height: `calc(${d.size.toFixed(2)} * var(--k))`, background: colour, boxShadow: `0 0 calc(.8*var(--k)) ${colour}`, "--dx": `calc(${d.dx.toFixed(1)} * var(--k))`, "--h": `calc(${d.h.toFixed(1)} * var(--k))`, animationDelay: `${d.delay.toFixed(2)}s` } as CSSProperties} />
      ))}
    </div>
  );
}

/** The steam from the pot, drawn into a heart as it climbs, then let go. */
function SteamHeart({ colour, reduce, fading }: { colour: string; reduce: boolean; fading: boolean }) {
  return (
    <motion.svg viewBox="0 0 100 90" aria-hidden="true" className="pointer-events-none absolute z-[9] overflow-visible" style={{ left: "27%", width: "46%", height: pct(41, 170) }} initial={reduce ? false : { top: pct(62, 170), opacity: 0, scale: 0.7 }} animate={fading ? { top: pct(38, 170), opacity: 0, scale: 1.2 } : { top: pct(46, 170), opacity: [0, 1, 1, 0.9], scale: 1 }} transition={{ duration: fading ? 1.1 : 1.5, ease: "easeOut" }}>
      <defs>
        <filter id="cb-heart-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <motion.path d={STEAM_HEART} fill="none" stroke={colour} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity=".55" filter="url(#cb-heart-blur)" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: "easeInOut" }} />
      <motion.path d={STEAM_HEART} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".9" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: "easeInOut" }} />
    </motion.svg>
  );
}

/** The cork, leaving the neck of the bottle for the ceiling. */
function FlyingCork({ reduce }: { reduce: boolean }) {
  if (reduce) return null;
  return (
    <motion.div aria-hidden="true" className="pointer-events-none absolute z-[12]" style={{ width: pct(8.2, 100), height: pct(7, 170) }} initial={{ left: pct(46.4, 100), top: pct(32.4, 170), rotate: 0, opacity: 1 }} animate={{ left: pct(68, 100), top: pct(-6, 170), rotate: 620, opacity: [1, 1, 0] }} transition={{ duration: 1.1, ease: "easeOut" }}>
      <Cork />
    </motion.div>
  );
}

function Page({ look, s, data, seed, mode, still, ingredients, potion, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<CauldronFields>["data"]; seed: number; mode: TemplateProps["mode"]; still: boolean; ingredients: string[]; potion: string; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.paper, cardImage: PAPER_GRAIN, ink: look.paperInk, soft: look.paperSoft, accent: look.accent, edge: look.paperEdge, dark: false, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 5);
    return data.photos.map(() => (rng() - 0.5) * 4);
  }, [data.photos, seed]);
  const colour = look.liquid[3];

  return (
    <motion.div className="absolute inset-0 z-[20]" style={{ background: `linear-gradient(180deg, ${look.wall[0]} 0%, ${look.wall[1]} 100%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2 }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 30% at 50% 100%, ${look.fire[0]}40, transparent 70%), radial-gradient(70% 26% at 50% 0%, ${colour}30, transparent 70%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "embers", colors: [look.fire[0], look.fire[1]], count: 10 }, { kind: "sparkles", colors: ["#FFFFFF", colour], count: 10 }]} opacity={0.8} />
      </div>
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={s.note.replace("{name}", data.senderName)}
        gallery={s.gallery}
        hero={<Recipe look={look} s={s} potion={potion} to={data.recipientName} ingredients={ingredients} />}
        photo={(slot) => <JarPhoto slot={slot} look={look} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** The recipe the potion was made from: its name, who it is for, and the three things that went in. */
function Recipe({ look, s, potion, to, ingredients }: { look: Look; s: Copy; potion: string; to: string; ingredients: string[] }) {
  return (
    <div className="relative mx-auto w-full rounded-[calc(2*var(--u))] p-[calc(5*var(--u))] text-center" style={{ background: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: `inset 0 0 0 1px ${look.paperEdge}, 0 calc(6*var(--u)) calc(11*var(--u)) calc(-6*var(--u)) rgba(0,0,0,.7)`, rotate: "-1deg" }}>
      <p className="text-[calc(2.7*var(--u))] tracking-[0.3em] uppercase" style={{ color: look.paperSoft }}>{s.recipe}</p>
      <p className="mt-[calc(2*var(--u))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: potion.length > 18 ? "calc(7*var(--u))" : "calc(9*var(--u))", color: look.accent }}>{potion}</p>
      <p className="mt-[calc(1*var(--u))]" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(3.4*var(--u))", color: look.paperSoft }}>{s.forName.replace("{name}", to)}</p>
      <ul className="mt-[calc(4*var(--u))] flex flex-col gap-[calc(2*var(--u))] text-left">
        {ingredients.map((text, i) => (
          <li key={i} className="flex items-baseline gap-[calc(2.4*var(--u))] border-t border-dashed pt-[calc(2*var(--u))]" style={{ borderColor: look.paperEdge }}>
            <span className="text-[calc(2.8*var(--u))] tracking-[0.16em] uppercase" style={{ color: look.paperSoft }}>{s.part}</span>
            <span className="leading-tight" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(4.6*var(--u))" }}>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A photo kept in a jar: glass, a cork, a little of the potion at the bottom and a label with the caption. */
function JarPhoto({ slot, look, rot }: { slot: PhotoSlot; look: Look; rot: number }) {
  const { photo, open } = slot;
  const colour = look.liquid[3];
  return (
    <figure className="relative m-0 mx-auto w-[min(70cqw,330px)]" style={{ rotate: `${rot}deg` }}>
      <div aria-hidden="true" className="mx-auto h-[calc(6*var(--u))] w-[46%] rounded-t-[calc(1.6*var(--u))]" style={{ background: "linear-gradient(180deg, #a47a48, #7a5530)", boxShadow: "inset 0 calc(.6*var(--u)) 0 rgba(255,255,255,.18)" }} />
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="relative block w-full cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ borderRadius: "22% 22% 12% 12% / 12% 12% 8% 8%" }}>
        <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ borderRadius: "22% 22% 12% 12% / 12% 12% 8% 8%", boxShadow: `0 0 0 calc(.9*var(--u)) rgba(255,255,255,.4), 0 0 calc(12*var(--u)) ${colour}55, inset 0 0 calc(8*var(--u)) rgba(0,0,0,.45)` }}>
          <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[20%]" style={{ background: `linear-gradient(180deg, ${colour}00, ${colour}88)` }} />
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(255,255,255,.3) 0%, rgba(255,255,255,.06) 22%, transparent 40%)" }} />
        </div>
      </button>
      {photo.caption ? (
        <figcaption className="mx-auto -mt-[calc(4*var(--u))] w-[78%] rounded-[calc(.8*var(--u))] px-[calc(2*var(--u))] py-[calc(1.4*var(--u))] text-center leading-tight" style={{ position: "relative", fontFamily: "var(--gift-font-hand)", fontSize: "calc(4*var(--u))", color: "#3a2410", background: "#f2e6c6", backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(.8*var(--u)) calc(2*var(--u)) rgba(0,0,0,.5)", rotate: "1.5deg" }}>
          {photo.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
