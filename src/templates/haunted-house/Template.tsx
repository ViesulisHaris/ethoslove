"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { Ambience } from "../_shared/Ambience";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playChime, playCreak, playKnock, playThunder, playTink, playWhoosh } from "../_shared/night/sfx";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { GateLeaf, House, Sil, Tree } from "./art";
import { makeBolt, nextStrikeMs, thunderDelayMs, type Bolt } from "./bolt";
import { LOOKS, type Look, type LookId } from "./looks";
import { fieldsSchema, type HauntedHouseFields } from "./schema";
import { LIGHT_EVERY_MS, photoOf, SILHOUETTES, WINDOWS } from "./windows";

const S = {
  en: { gate: "open the gate", window: "tap a lit window", door: "knock on the door", title: "you're invited", tag: "for {name}", gallery: "from the windows", note: "a note from {name}", close: "Close the window", knock: "Knock on the door", open: "Open the gate" },
  es: { gate: "abre la verja", window: "toca una ventana", door: "llama a la puerta", title: "tienes invitación", tag: "para {name}", gallery: "desde las ventanas", note: "una nota de {name}", close: "Cerrar la ventana", knock: "Llamar a la puerta", open: "Abrir la verja" },
};
type Copy = (typeof S)["en"];

const KEYFRAMES = `
.hh-rain{background-image:repeating-linear-gradient(104deg,var(--rain) 0 1px,transparent 1px 15px);background-size:180px 180px;animation:hh-fall .55s linear infinite}
.hh-rain2{background-image:repeating-linear-gradient(104deg,var(--rain) 0 1px,transparent 1px 23px);background-size:276px 276px;animation:hh-fall2 .85s linear infinite;opacity:.5}
@keyframes hh-fall{from{background-position:0 0}to{background-position:-44px 180px}}
@keyframes hh-fall2{from{background-position:0 0}to{background-position:-67px 276px}}
.hh-cloud{animation:hh-drift 44s ease-in-out infinite alternate}
@keyframes hh-drift{from{translate:-9% 0}to{translate:9% 0}}
.hh-sway{transform-origin:50% 100%;animation:hh-sw 5.5s ease-in-out infinite alternate}
@keyframes hh-sw{from{transform:rotate(-1.3deg)}to{transform:rotate(1.7deg)}}
.hh-flash{animation:hh-fl .62s linear forwards}
@keyframes hh-fl{0%{opacity:0}5%{opacity:.95}13%{opacity:.22}21%{opacity:.85}38%{opacity:.16}100%{opacity:0}}
.hh-lit{filter:brightness(2.2) contrast(1.08)}
.hh-door-glow{transform-box:fill-box;transform-origin:center;animation:hh-dg 1.8s ease-in-out infinite alternate}
@keyframes hh-dg{from{opacity:.7;transform:scale(.94)}to{opacity:1;transform:scale(1.05)}}
.hh-hint{animation:hh-ht 1.9s ease-out infinite}
@keyframes hh-ht{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.5);opacity:0}}
.hh-smoke{animation:hh-sm 5.2s ease-out infinite}
@keyframes hh-sm{0%{transform:translate(0,0) scale(.5);opacity:0}20%{opacity:.5}100%{transform:translate(calc(6*var(--k)),calc(-16*var(--k))) scale(1.7);opacity:0}}
.hh-flick{animation:hh-fk 2.1s ease-in-out infinite alternate}
@keyframes hh-fk{0%{opacity:.88}35%{opacity:1}60%{opacity:.82}100%{opacity:.97}}
@media (prefers-reduced-motion: reduce){.hh-rain,.hh-rain2,.hh-cloud,.hh-sway,.hh-door-glow,.hh-hint,.hh-smoke,.hh-flick{animation:none}}
`;

/** closed: the gate. opening: it swings. approach: the camera climbs the path. windows: tap them. door: knock. knock: it opens. open: the letter. */
type Phase = "closed" | "opening" | "approach" | "windows" | "door" | "knock" | "open";

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "storm";
};
const readTag = (fields: unknown, fallback: string): string => {
  const parsed = fieldsSchema.safeParse(fields);
  return (parsed.success ? parsed.data.tag : undefined)?.trim() || fallback;
};

const pct = (units: number, of: number) => `${(units / of) * 100}%`;
const skyOf = (look: Look) => `linear-gradient(180deg, ${look.sky[0]} 0%, ${look.sky[1]} 50%, ${look.sky[2]} 100%)`;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<HauntedHouseFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const look = LOOKS[readLook(data.fields)];
  const tag = readTag(data.fields, s.tag.replace("{name}", data.recipientName));
  const seed = hashString(`${data.recipientName}|${data.senderName}|haunted-house`);
  const photos = data.photos.slice(0, WINDOWS.length);
  const holds = useMemo(() => photoOf(photos.length), [photos.length]);

  const [phase, setPhase] = useState<Phase>(preview ? "open" : "closed");
  const [litCount, setLitCount] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);
  const [flood, setFlood] = useState(false);
  const [strike, setStrike] = useState<{ id: number; bolt: Bolt } | null>(null);
  const [sceneGone, setSceneGone] = useState(preview);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const started = useRef(false);
  const strikes = useRef(0);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  // The storm: a strike every few seconds, its thunder a moment behind, for as long as the house is on screen.
  const lightning = (big = false) => {
    strikes.current += 1;
    const id = strikes.current;
    setStrike({ id, bolt: makeBolt(seed + id * 31, 100, 64) });
    after(720, () => setStrike((cur) => (cur?.id === id ? null : cur)));
    if (started.current) {
      // The sooner the thunder follows the flash, the nearer the strike: a short wait is a crack, a long one a dull roll.
      const delay = thunderDelayMs(Math.random) * (big ? 0.5 : 1);
      after(delay, () => playThunder(mutedRef.current, Math.max(0.1, 1 - delay / 1300)));
    }
  };
  const lightningRef = useRef(lightning);
  useEffect(() => {
    lightningRef.current = lightning;
  });
  useEffect(() => {
    if (reduce || preview || phase === "open") return;
    let id = 0;
    const arm = () => {
      id = window.setTimeout(() => {
        lightningRef.current();
        arm();
      }, nextStrikeMs(Math.random));
    };
    id = window.setTimeout(arm, 1500);
    return () => window.clearTimeout(id);
  }, [reduce, preview, phase === "open"]); // eslint-disable-line react-hooks/exhaustive-deps

  const openPage = () => {
    setPhase("open");
    eventRef.current?.({ type: "progress", pct: 30 });
    after(1500, () => setSceneGone(true));
  };

  const knock = () => {
    if (phase !== "windows" && phase !== "door") return;
    setViewing(null);
    setPhase("knock");
    playKnock(mutedRef.current);
    buzz(24);
    after(reduce ? 200 : 750, () => {
      setDoorOpen(true);
      playCreak(mutedRef.current);
    });
    after(reduce ? 400 : 1500, () => setFlood(true));
    after(reduce ? 700 : 2500, () => {
      playChime(mutedRef.current);
      openPage();
    });
  };

  const light = () => {
    const n = WINDOWS.length;
    for (let i = 0; i < n; i++) {
      after(reduce ? 0 : i * LIGHT_EVERY_MS, () => {
        setLitCount(i + 1);
        playTink(mutedRef.current, i, "rise");
      });
    }
    after(reduce ? 50 : n * LIGHT_EVERY_MS + 500, () => {
      setPhase(photos.length ? "windows" : "door");
      eventRef.current?.({ type: "progress", pct: 15 });
    });
  };

  const begin = () => {
    if (phase !== "closed") return;
    prime();
    void audio.start();
    started.current = true;
    buzz(16);
    eventRef.current?.({ type: "started" });
    playCreak(mutedRef.current);
    lightning(true);
    setPhase("opening");
    if (reduce) {
      setPhase("approach");
      light();
      return;
    }
    after(1300, () => {
      setPhase("approach");
      playWhoosh(mutedRef.current);
    });
    after(1300 + 2300, light);
  };

  const closeWindow = () => {
    if (viewing === null) return;
    const next = seen.includes(viewing) ? seen : [...seen, viewing];
    setSeen(next);
    setViewing(null);
    if (photos.every((_, i) => next.includes(i))) setPhase("door");
  };

  const replay = () => {
    clear();
    started.current = false;
    setPhase("closed");
    setLitCount(0);
    setSeen([]);
    setViewing(null);
    setDoorOpen(false);
    setFlood(false);
    setStrike(null);
    setSceneGone(false);
    setRun((r) => r + 1);
  };

  const title = data.title?.trim() || s.title;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, background: skyOf(look), color: look.ink, fontFamily: "var(--gift-font-body)", "--rain": look.rain } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {!sceneGone ? (
        <Scene
          key={`scene-${run}`}
          look={look}
          s={s}
          from={data.senderName}
          to={data.recipientName}
          title={title}
          tag={tag}
          phase={phase}
          photos={photos}
          holds={holds}
          litCount={litCount}
          seen={seen}
          viewing={viewing}
          doorOpen={doorOpen}
          strike={strike}
          reduce={reduce}
          leaving={phase === "open"}
          seed={seed}
          onGate={begin}
          onWindow={(i) => setViewing(i)}
          onCloseWindow={closeWindow}
          onDoor={knock}
        />
      ) : null}
      {phase === "open" ? <Page key={`page-${run}`} look={look} s={s} data={data} seed={seed} mode={mode} still={preview || reduce} title={title} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {/* the door opens on the whole house's light: it fills the screen, and lifts once the letter is in */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[50]" style={{ background: `radial-gradient(circle at 50% 70%, #fff6d4 0%, ${look.window[0]} 30%, ${look.window[1]} 60%, transparent 85%)`, opacity: flood && phase !== "open" ? 1 : 0, transform: flood ? "scale(3)" : "scale(.05)", transformOrigin: "50% 70%", transition: phase === "open" ? "opacity 1.3s ease .35s" : "transform 1.2s cubic-bezier(.5,0,.3,1), opacity .5s ease" }} />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the house in its storm, the gate shut, every window dark. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: skyOf(look), color: look.ink, "--rain": look.rain } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      <Scene look={look} s={s} from={senderName} to={recipientName} title={s.title} tag={readTag(fields, s.tag.replace("{name}", recipientName))} phase="closed" photos={[]} holds={photoOf(0)} litCount={0} seen={[]} viewing={null} doorOpen={false} strike={null} reduce leaving={false} seed={1} inert onGate={() => {}} onWindow={() => {}} onCloseWindow={() => {}} onDoor={() => {}} />
    </div>
  );
}

type SceneProps = {
  look: Look;
  s: Copy;
  from: string;
  to: string;
  title: string;
  tag: string;
  phase: Phase;
  photos: TemplateProps<HauntedHouseFields>["data"]["photos"];
  holds: (number | null)[];
  litCount: number;
  seen: number[];
  viewing: number | null;
  doorOpen: boolean;
  strike: { id: number; bolt: Bolt } | null;
  reduce: boolean;
  leaving: boolean;
  seed: number;
  /** A picture of the first screen, with nothing to press: the editor's cover picker puts it inside a button. */
  inert?: boolean;
  onGate: () => void;
  onWindow: (photo: number) => void;
  onCloseWindow: () => void;
  onDoor: () => void;
};

function Scene({ look, s, from, to, title, tag, phase, photos, holds, litCount, seen, viewing, doorOpen, strike, reduce, leaving, seed, inert = false, onGate, onWindow, onCloseWindow, onDoor }: SceneProps) {
  const near = phase !== "closed" && phase !== "opening";
  const gateOpen = phase !== "closed";
  const interactive = phase === "windows" || phase === "door";
  const unseen = photos.findIndex((_, i) => !seen.includes(i));
  const sils = useMemo(() => {
    const rng = mulberry32(seed);
    const order = [...SILHOUETTES];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }, [seed]);

  return (
    <div className="absolute inset-0" style={{ opacity: leaving ? 0 : 1, transition: "opacity .8s ease" }}>
      {/* the sky: a moon behind cloud, and cloud that never stops moving */}
      <div aria-hidden="true" className="absolute inset-0" style={{ transform: near ? "scale(1.1)" : "scale(1)", transformOrigin: "50% 40%", transition: "transform 2.6s cubic-bezier(.5,0,.2,1)" }}>
        <div className="absolute rounded-full" style={{ right: "9%", top: "7%", width: "calc(21*var(--k))", height: "calc(21*var(--k))", background: `radial-gradient(circle at 36% 30%, ${look.moon[0]}, ${look.moon[1]})`, boxShadow: `0 0 calc(9*var(--k)) ${look.moon[1]}88` }} />
        {[8, 19, 33].map((top, i) => (
          <div key={i} className="hh-cloud absolute" style={{ left: "-35%", width: "170%", top: `${top}%`, height: "17%", background: `radial-gradient(50% 50% at 50% 50%, ${look.sky[0]}${i === 1 ? "ee" : "cc"}, transparent 72%)`, filter: "blur(calc(1.8*var(--k)))", animationDuration: `${36 + i * 13}s`, animationDirection: i % 2 ? "alternate-reverse" : "alternate" }} />
        ))}
        <Ambience layers={[{ kind: "bats", colors: ["#06040f", "#120c24"], count: 5 }]} opacity={0.9} />
      </div>

      {/* the camera: the whole hill and everything on it comes forward as it walks up to the door */}
      <div className={strike ? "hh-lit absolute inset-0" : "absolute inset-0"} style={{ transform: near ? "scale(1.36) translateY(calc(-11.9 * var(--k)))" : "scale(1)", transformOrigin: "50% calc(50% + 37.4 * var(--k))", transition: strike ? "filter .05s" : "transform 2.6s cubic-bezier(.5,0,.2,1), filter .35s ease" }}>
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(60% 34% at 78% 24%, ${look.moon[1]}40, transparent 70%)` }} />
        {/* the ground runs from edge to edge, so the house stands on its hill on a laptop as it does on a phone */}
        <div aria-hidden="true" className="absolute inset-x-0" style={{ top: "calc(50% + 26 * var(--k))", bottom: "-40%", background: "linear-gradient(180deg, #04030a 0%, #07061a 38%, #03020a 100%)" }}>
          <div className="absolute left-1/2 h-full -translate-x-1/2" style={{ width: "calc(96 * var(--k))" }}>
            <div className="absolute inset-0" style={{ clipPath: "polygon(43% 0, 57% 0, 100% 100%, 0 100%)", background: "linear-gradient(180deg, #1a1830, #242240)", opacity: 0.8 }} />
            {[[34, 16, 22], [62, 30, 26], [46, 52, 30]].map(([x, y, w], i) => (
              <span key={i} className="absolute block rounded-[50%]" style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: "4%", background: `radial-gradient(50% 50% at 50% 50%, ${look.moon[1]}55, transparent 72%)` }} />
            ))}
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
          <div className="absolute" style={{ left: 0, top: pct(26, 170), width: "100%", height: pct(100, 170) }}>
            <House look={look} doorGlow={phase === "door" || phase === "knock"} />
            {/* smoke out of the chimney */}
            {!reduce
              ? [0, 1, 2].map((i) => (
                  <span key={i} aria-hidden="true" className="hh-smoke absolute block rounded-full" style={{ left: "62%", top: "27%", width: "calc(5*var(--k))", height: "calc(5*var(--k))", background: "radial-gradient(circle, rgba(180,190,220,.5), transparent 70%)", filter: "blur(calc(.8*var(--k)))", animationDelay: `${-i * 1.7}s`, opacity: 0 }} />
                ))
              : null}

            {/* the windows: dark until they light, then a little figure in each until it is opened */}
            {WINDOWS.map((w, i) => {
              const lit = litCount > i;
              const photo = holds[i];
              const opened = photo !== null && seen.includes(photo);
              const live = interactive && lit && photo !== null;
              const radius = w.round ? "50%" : "50% 50% 0 0 / 36% 36% 0 0";
              const Wrap = live ? "button" : "div";
              return (
                <Wrap
                  key={w.id}
                  {...(live ? { type: "button" as const, onClick: () => onWindow(photo as number), "aria-label": photos[photo as number]?.caption || photos[photo as number]?.alt || s.window } : { "aria-hidden": true })}
                  className="absolute block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  style={{ left: `${w.cx - w.w / 2}%`, top: `${w.cy - w.h / 2}%`, width: `${w.w}%`, height: `${w.h}%`, borderRadius: radius, cursor: live ? "pointer" : "default", zIndex: 4 }}
                >
                  <span className="absolute inset-0 block overflow-hidden" style={{ borderRadius: radius, background: lit ? `radial-gradient(circle at 50% 80%, ${look.window[0]}, ${look.window[1]})` : "linear-gradient(180deg, #0a0916, #05040c)", boxShadow: lit ? `0 0 calc(3.4*var(--k)) ${look.window[1]}aa, inset 0 0 calc(1.2*var(--k)) rgba(0,0,0,.45)` : "inset 0 0 calc(1*var(--k)) rgba(0,0,0,.6)", transition: "background .6s ease, box-shadow .6s ease" }}>
                    {opened ? (
                      <img src={photos[photo as number].url} alt="" draggable={false} className="h-full w-full object-cover" />
                    ) : lit ? (
                      <span className="absolute inset-x-[12%] bottom-0 block" style={{ height: w.round ? "86%" : "70%" }}>
                        <Sil kind={sils[i % sils.length]} eye={look.window[0]} />
                      </span>
                    ) : null}
                    {lit ? <span aria-hidden="true" className="absolute inset-0 block" style={{ background: "linear-gradient(90deg, transparent calc(50% - .5px), rgba(10,6,16,.55) calc(50% - .5px) calc(50% + .5px), transparent calc(50% + .5px)), linear-gradient(0deg, transparent 46%, rgba(10,6,16,.55) 46% 49%, transparent 49%)" }} /> : null}
                  </span>
                  {live && !opened && !reduce ? <span aria-hidden="true" className="hh-hint pointer-events-none absolute -inset-[8%] block border-2" style={{ borderRadius: radius, borderColor: look.window[0] }} /> : null}
                </Wrap>
              );
            })}

            {/* the door: a leaf that swings, with the light of the house behind it */}
            <div className="absolute" style={{ left: "43%", top: "76%", width: "14%", height: "16%", zIndex: 4, perspective: "calc(40*var(--k))" }}>
              <span aria-hidden="true" className="absolute inset-0 block" style={{ borderRadius: "50% 50% 0 0 / 42% 42% 0 0", background: `radial-gradient(circle at 50% 90%, #fff3c0, ${look.window[0]} 38%, ${look.window[1]})`, opacity: doorOpen ? 1 : 0, transition: "opacity .6s ease", boxShadow: doorOpen ? `0 0 calc(10*var(--k)) ${look.window[1]}` : "none" }} />
              <span aria-hidden="true" className="absolute inset-0 block" style={{ borderRadius: "50% 50% 0 0 / 42% 42% 0 0", background: "linear-gradient(90deg, #2a1810, #3a2314 50%, #1f120a)", boxShadow: "inset 0 0 0 calc(.35*var(--k)) rgba(0,0,0,.6)", transformOrigin: "0% 50%", transform: doorOpen ? "rotateY(-82deg)" : "rotateY(0)", transition: "transform 1.5s cubic-bezier(.5,0,.3,1)" }}>
                <span className="absolute top-[54%] right-[16%] block size-[10%] rounded-full" style={{ background: "#c9a45a" }} />
              </span>
              {interactive ? (
                <button type="button" onClick={onDoor} aria-label={s.knock} className="absolute -inset-[20%] z-[3] outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ borderRadius: "50% 50% 0 0 / 40% 40% 0 0" }} />
              ) : null}
            </div>
          </div>

          <div aria-hidden="true" className="hh-sway absolute" style={{ left: "-3%", top: pct(66, 170), width: "26%", height: pct(64, 170) }}>
            <Tree look={look} />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: pct(112, 170), height: pct(26, 170), background: `linear-gradient(180deg, transparent, ${look.sky[2]}55 60%, transparent)`, filter: "blur(calc(2*var(--k)))" }} />
        </div>
      </div>

      {/* the gate, the title and the pill sit over the camera's layer, and must not catch a tap meant for a window or the door under them */}
      <div className="pointer-events-none absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        {/* the gate, in front of everything, until the camera has passed through it */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: pct(92, 170), height: pct(78, 170), perspective: "calc(120*var(--k))", opacity: near ? 0 : 1, transform: near ? "scale(2) translateY(18%)" : "scale(1)", transformOrigin: "50% 40%", transition: "transform 2.4s cubic-bezier(.5,0,.8,.4) .5s, opacity 1.2s ease 1.4s" }}>
          <div className="absolute" style={{ left: "2%", top: 0, width: "46%", height: "94%", transformOrigin: "0% 50%", transform: gateOpen ? "rotateY(-80deg)" : "rotateY(0)", transition: "transform 1.5s cubic-bezier(.6,0,.3,1) .2s" }}>
            <GateLeaf />
          </div>
          <div className="absolute" style={{ right: "2%", top: 0, width: "46%", height: "94%", transformOrigin: "100% 50%", transform: gateOpen ? "rotateY(80deg)" : "rotateY(0)", transition: "transform 1.5s cubic-bezier(.6,0,.3,1) .2s" }}>
            <div className="h-full w-full -scale-x-100">
              <GateLeaf />
            </div>
            <p className="absolute top-[40%] left-[10%] w-[44%] -rotate-3 rounded-[calc(.6*var(--k))] px-[calc(1*var(--k))] py-[calc(1.2*var(--k))] text-center leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(4*var(--k))", color: "#3a2410", background: "#e6d5ae", backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(.5*var(--k)) calc(1*var(--k)) rgba(0,0,0,.55)" }}>
              {tag}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 h-[18%] w-[6%]" style={{ background: "linear-gradient(90deg, #0a0914, #151226)" }} />
          <div className="absolute right-0 bottom-0 h-[18%] w-[6%]" style={{ background: "linear-gradient(270deg, #0a0914, #151226)" }} />
        </div>

        {/* the title, over the sky */}
        <div className="absolute inset-x-[8%] z-[6] text-center" style={{ top: pct(5, 170) }}>
          <p className="text-[calc(2.4*var(--k))] tracking-[0.34em] uppercase opacity-70 [overflow-wrap:anywhere]">{from} → {to}</p>
          <h1 className="mt-[calc(1.6*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 24 ? "calc(6*var(--k))" : "calc(8.2*var(--k))", color: look.ink, textShadow: `0 0 calc(4*var(--k)) ${look.bolt}55` }}>
            {title}
          </h1>
        </div>

        <div className="pointer-events-none absolute inset-x-0 z-[8] flex justify-center" style={{ top: pct(150, 170) }}>
          <TapPill tone={{ page: look.sky[0], glow: [look.window[1], look.window[1]], accent: look.ink, dark: true }} hidden={phase === "opening" || phase === "approach" || phase === "knock" || phase === "open"} reduce={reduce}>
            {phase === "closed" ? s.gate : phase === "windows" && unseen !== -1 ? s.window : s.door}
          </TapPill>
        </div>
      </div>

      {/* rain, in front of all of it, in two depths */}
      {!reduce ? (
        <>
          <div aria-hidden="true" className="hh-rain pointer-events-none absolute inset-0 z-[5]" />
          <div aria-hidden="true" className="hh-rain2 pointer-events-none absolute inset-0 z-[5]" />
        </>
      ) : null}

      {/* lightning: the bolt, and the sky lit by it */}
      <AnimatePresence>
        {strike && !reduce ? (
          <motion.svg key={`bolt-${strike.id}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-[44%] w-full overflow-visible" initial={{ opacity: 1 }} animate={{ opacity: [1, 0.2, 1, 0.1, 0.8, 0] }} transition={{ duration: 0.62, times: [0, 0.14, 0.24, 0.4, 0.55, 1] }}>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={strike.bolt.main} stroke={look.bolt} strokeWidth="2.6" opacity=".35" style={{ filter: "blur(1.4px)" }} />
              {strike.bolt.forks.map((d, i) => (
                <path key={i} d={d} stroke={look.bolt} strokeWidth="1.5" opacity=".5" />
              ))}
              <path d={strike.bolt.main} stroke="#fff" strokeWidth=".9" />
            </g>
          </motion.svg>
        ) : null}
      </AnimatePresence>
      {strike && !reduce ? <div key={`flash-${strike.id}`} aria-hidden="true" className="hh-flash pointer-events-none absolute inset-0 z-[6]" style={{ background: `radial-gradient(90% 60% at ${30 + (strike.id * 37) % 40}% 12%, ${look.bolt}, ${look.bolt}55 45%, transparent 80%)`, mixBlendMode: "screen" }} /> : null}

      {phase === "closed" && !inert ? <button type="button" onClick={onGate} aria-label={s.open} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:ring-inset" /> : null}

      {/* a window opened: its photo in a gilt arch, over the dark */}
      <AnimatePresence>
        {viewing !== null && photos[viewing] ? (
          <motion.div key="view" role="dialog" aria-label={photos[viewing].caption || photos[viewing].alt || "photo"} className="absolute inset-0 z-[40] grid place-items-center" style={{ background: "rgba(4,3,12,.86)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.figure className="relative m-0 w-[min(74cqw,360px)]" initial={{ scale: 0.82, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 220, damping: 20 }}>
              <div aria-hidden="true" className="absolute rounded-[50%]" style={{ inset: "-14%", background: `radial-gradient(circle, ${look.window[1]}55, transparent 66%)` }} />
              <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ borderRadius: "50% 50% 3% 3% / 30% 30% 2% 2%", boxShadow: `0 0 0 calc(1.6*var(--k)) #3a3050, 0 0 0 calc(2.4*var(--k)) #1a1428, 0 0 calc(10*var(--k)) ${look.window[1]}aa`, background: "#000" }}>
                <img src={photos[viewing].url} alt="" draggable={false} className="h-full w-full object-cover" />
                <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 38%, transparent 55%, rgba(8,4,16,.55))" }} />
              </div>
              {photos[viewing].caption ? (
                <figcaption className="mt-[calc(4*var(--k))] text-center leading-tight" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(4.4*var(--k))", color: look.ink }}>
                  {photos[viewing].caption}
                </figcaption>
              ) : null}
            </motion.figure>
            <button type="button" onClick={onCloseWindow} aria-label={s.close} className="absolute inset-0 outline-none" />
          </motion.div>
        ) : null}
      </AnimatePresence>

    </div>
  );
}

function Page({ look, s, data, seed, mode, still, title, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<HauntedHouseFields>["data"]; seed: number; mode: TemplateProps["mode"]; still: boolean; title: string; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.paper, cardImage: PAPER_GRAIN, ink: look.paperInk, soft: look.paperSoft, accent: look.accent, edge: look.paperEdge, dark: false, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 11);
    return data.photos.map(() => (rng() - 0.5) * 3);
  }, [data.photos, seed]);

  return (
    <motion.div className="absolute inset-0 z-[20]" style={{ background: skyOf(look) }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.3 }}>
      <div aria-hidden="true" className={still ? "pointer-events-none absolute inset-0" : "hh-flick pointer-events-none absolute inset-0"} style={{ background: `radial-gradient(80% 36% at 50% 4%, ${look.window[1]}55, transparent 72%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "dust", colors: [look.window[0], "#FFFFFF"], count: 14 }, { kind: "embers", colors: [look.window[0], look.window[1]], count: 6 }]} opacity={0.75} />
      </div>
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={s.note.replace("{name}", data.senderName)}
        gallery={s.gallery}
        hero={<Doorway look={look} title={title} name={data.recipientName} />}
        photo={(slot) => <WindowPhoto slot={slot} look={look} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** The open doorway at the head of the page: the light of the house, their invitation across it, and a brass plate with their name. */
function Doorway({ look, title, name }: { look: Look; title: string; name: string }) {
  return (
    <div className="relative mx-auto w-[min(56cqw,270px)]">
      <div aria-hidden="true" className="absolute" style={{ inset: "-26% -26% -6%", background: `radial-gradient(ellipse at 50% 60%, ${look.window[1]}66, transparent 66%)` }} />
      <div className="relative flex aspect-[3/4] w-full items-center justify-center px-[10%] text-center" style={{ borderRadius: "50% 50% 0 0 / 34% 34% 0 0", background: `radial-gradient(circle at 50% 92%, #fff3c0, ${look.window[0]} 40%, ${look.window[1]})`, boxShadow: `inset 0 0 0 calc(2.4*var(--u)) #25233c, inset 0 0 calc(10*var(--u)) rgba(0,0,0,.45), 0 0 calc(12*var(--u)) ${look.window[1]}88` }}>
        <p className="leading-[1.05] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 20 ? "calc(6.2*var(--u))" : "calc(8.2*var(--u))", color: "#2a1608" }}>
          {title}
        </p>
      </div>
      <p className="mx-auto -mt-[calc(1*var(--u))] w-[70%] rounded-[calc(.8*var(--u))] px-[calc(2*var(--u))] py-[calc(1.6*var(--u))] text-center text-[calc(3.4*var(--u))] tracking-[0.2em] uppercase [overflow-wrap:anywhere]" style={{ background: "linear-gradient(180deg, #d8b868, #8a6420)", color: "#2a1a06", boxShadow: "0 calc(1*var(--u)) calc(2*var(--u)) rgba(0,0,0,.6), inset 0 1px 1px rgba(255,255,255,.4)" }}>
        {name}
      </p>
    </div>
  );
}

/** A photo in a stone window of the house: an arch, a sill with the caption cut into it. */
function WindowPhoto({ slot, look, rot }: { slot: PhotoSlot; look: Look; rot: number }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0 mx-auto w-[min(70cqw,330px)]" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="block w-full cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ borderRadius: "50% 50% 0 0 / 28% 28% 0 0" }}>
        <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ borderRadius: "50% 50% 0 0 / 28% 28% 0 0", boxShadow: `0 0 0 calc(2.4*var(--u)) #25233c, 0 0 0 calc(3.2*var(--u)) #0d0a18, 0 0 calc(12*var(--u)) ${look.window[1]}66`, background: "#000" }}>
          <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent calc(50% - .6px), rgba(10,6,16,.5) calc(50% - .6px) calc(50% + .6px), transparent calc(50% + .6px)), radial-gradient(ellipse at 50% 38%, transparent 52%, rgba(8,4,16,.5))" }} />
        </div>
      </button>
      <div className="relative mx-[-4%] mt-[calc(3.4*var(--u))] rounded-[calc(.8*var(--u))] px-[calc(3*var(--u))] py-[calc(2*var(--u))] text-center" style={{ background: "linear-gradient(180deg, #3a3550, #1d1a2e)", boxShadow: "0 calc(1.6*var(--u)) calc(3*var(--u)) rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)" }}>
        {photo.caption ? (
          <figcaption className="leading-tight" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(3.3*var(--u))", color: look.ink }}>
            {photo.caption}
          </figcaption>
        ) : (
          <span className="block h-[calc(2*var(--u))]" />
        )}
      </div>
    </figure>
  );
}
