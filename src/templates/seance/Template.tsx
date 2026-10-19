"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { Ambience } from "../_shared/Ambience";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { NightPage, type NightTheme, type PhotoSlot } from "../_shared/night/NightPage";
import { playChime, playScrape, playTink, playWhoosh } from "../_shared/night/sfx";
import { MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { Board, Candle, Planchette } from "./art";
import { buildTour, GOODBYE, HOME, normalizeSpell, reachedAt, sampleTour } from "./board";
import { LOOKS, type Look, type LookId } from "./looks";
import { fieldsSchema, type SeanceFields } from "./schema";

const S = {
  en: { touch: "touch the planchette", skip: "skip", title: "a message from the other side", says: "the spirits say", gallery: "spirit photographs", note: "a note from {name}", spell: "I LOVE YOU" },
  es: { touch: "toca la plancheta", skip: "saltar", title: "un mensaje del más allá", says: "dicen los espíritus", gallery: "fotografías de espíritus", note: "una nota de {name}", spell: "TE QUIERO" },
};
type Copy = (typeof S)["en"];

const KEYFRAMES = `
.sn-flame{animation:sn-flick 1.7s ease-in-out infinite alternate}
@keyframes sn-flick{0%{transform:scale(1,1) skewX(0deg)}25%{transform:scale(.95,1.08) skewX(2.6deg)}55%{transform:scale(1.04,.94) skewX(-2.2deg)}100%{transform:scale(.97,1.05) skewX(1.2deg)}}
.sn-gust .sn-flame{animation:sn-lean 1.6s ease-in-out both}
@keyframes sn-lean{0%{transform:scale(1,1) skewX(0)}30%{transform:scale(.88,1.22) skewX(17deg)}62%{transform:scale(1.1,1.1) skewX(-11deg)}100%{transform:scale(1,1) skewX(0)}}
.sn-out{transform:scale(.03,.03);opacity:0;transition:transform .55s cubic-bezier(.5,0,.8,.4),opacity .45s ease-in}
.sn-pool{animation:sn-pool 2.6s ease-in-out infinite alternate}
@keyframes sn-pool{from{opacity:.82}to{opacity:1}}
.sn-call{transform-box:fill-box;transform-origin:center;animation:sn-call 2s ease-out infinite}
@keyframes sn-call{0%{transform:scale(.7);opacity:.9}100%{transform:scale(1.9);opacity:0}}
.sn-mist{animation:sn-drift 19s ease-in-out infinite alternate}
@keyframes sn-drift{from{translate:-7% 0}to{translate:7% 0}}
@media (prefers-reduced-motion: reduce){.sn-flame,.sn-pool,.sn-call,.sn-mist,.sn-gust .sn-flame{animation:none}}
`;

/** idle: waiting for the touch. spelling: the planchette is moving. farewell: it has said goodbye. open: the letter. */
type Stage = "idle" | "spelling" | "farewell" | "open";

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "candle";
};
const readSpell = (fields: unknown, fallback: string) => {
  const parsed = fieldsSchema.safeParse(fields);
  return normalizeSpell(parsed.success ? parsed.data.spell : undefined, fallback);
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<SeanceFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview", MUSIC_CEILING);
  const preview = mode === "preview";
  const lookId = readLook(data.fields);
  const look = LOOKS[lookId];
  const text = useMemo(() => readSpell(data.fields, s.spell), [data.fields, s.spell]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|seance`);
  const tour = useMemo(() => buildTour(text, seed), [text, seed]);

  const [stage, setStage] = useState<Stage>(preview ? "open" : "idle");
  const [reached, setReached] = useState(preview ? text.length : 0);
  const [now, setNow] = useState<string | null>(null);
  const [gust, setGust] = useState(false);
  const [out, setOut] = useState(false);
  const [veil, setVeil] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const planchette = useRef<SVGGElement>(null);
  const skipped = useRef(false);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const place = (x: number, y: number, tilt: number) => planchette.current?.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${tilt.toFixed(2)})`);

  const farewell = () => {
    setStage("farewell");
    setNow(null);
    after(260, () => setOut(true));
    after(900, () => setVeil(true));
    after(1750, () => {
      setStage("open");
      setVeil(false);
      eventRef.current?.({ type: "progress", pct: 30 });
    });
  };

  const touch = () => {
    if (stage !== "idle") return;
    prime();
    void audio.start();
    buzz(14);
    playWhoosh(mutedRef.current);
    eventRef.current?.({ type: "started" });
    setGust(true);
    after(1700, () => setGust(false));
    after(3000, () => setCanSkip(true));
    if (reduce) {
      // No journey: the whole word is there, and the planchette waits at the goodbye.
      setReached(text.length);
      place(GOODBYE.x, GOODBYE.y, 0);
      setStage("farewell");
      playChime(mutedRef.current);
      after(1200, () => {
        setOut(true);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      });
      return;
    }
    setStage("spelling");
  };

  // The journey: one animation loop reads the tour at the current time and moves the planchette
  // directly, so nothing re-renders sixty times a second. React hears about a letter, not a frame.
  useEffect(() => {
    if (stage !== "spelling") return;
    const t0 = performance.now();
    let raf = 0;
    let prevLeg = -2;
    let prevPhase = "";
    let chimed = false;
    const frame = (clock: number) => {
      const t = skipped.current ? tour.total : clock - t0;
      const at = sampleTour(tour, t);
      place(at.x, at.y, at.tilt);
      if (at.leg !== prevLeg || at.phase !== prevPhase) {
        const leg = at.leg >= 0 ? [...tour.legs, tour.goodbye][at.leg] : undefined;
        if (at.phase === "move" && leg && leg.char !== " ") playScrape(mutedRef.current, leg.move);
        if (at.phase === "dwell" && leg) {
          if (leg === tour.goodbye) {
            if (!chimed) playChime(mutedRef.current);
            chimed = true;
            setNow("GOODBYE");
          } else if (leg.char !== " ") {
            playTink(mutedRef.current, at.leg);
            setNow(leg.char);
          }
        }
        if (at.phase === "move") setNow(null);
        prevLeg = at.leg;
        prevPhase = at.phase;
      }
      const n = reachedAt(tour, t);
      setReached((r) => (r === n ? r : n));
      if (t >= tour.total) {
        farewell();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // `farewell` and `place` only read refs and setters, so they are stable for this run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, tour]);

  const replay = () => {
    clear();
    skipped.current = false;
    place(HOME.x, HOME.y, 0);
    setStage("idle");
    setReached(0);
    setNow(null);
    setGust(false);
    setOut(false);
    setVeil(false);
    setCanSkip(false);
    setRun((r) => r + 1);
  };

  const lit = useMemo(() => new Set([...text].slice(0, reached).filter((c) => c !== " ")), [text, reached]);
  const title = data.title?.trim() || s.title;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...COVER_VARS, color: look.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {stage !== "open" ? (
        <Scene
          key={`scene-${run}`}
          look={look}
          s={s}
          from={data.senderName}
          to={data.recipientName}
          title={title}
          text={text}
          reached={reached}
          lit={lit}
          now={now}
          out={out}
          gust={gust}
          idle={stage === "idle"}
          spelling={stage === "spelling"}
          canSkip={canSkip && stage === "spelling"}
          planchette={planchette}
          reduce={reduce}
          onTouch={touch}
          onSkip={() => {
            skipped.current = true;
          }}
        />
      ) : (
        <Page key={`page-${run}`} look={look} s={s} data={data} text={text} mode={mode} seed={seed} still={preview || reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
      )}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[45] bg-black" initial={false} animate={{ opacity: veil ? 1 : 0 }} transition={{ duration: veil ? 0.8 : 1.1, ease: "easeInOut" }} />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The editor's cover picker shows this as the Classic tile: the board before anyone has touched it. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, color: look.ink } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      <Scene look={look} s={s} from={senderName} to={recipientName} title={s.title} text="" reached={0} lit={new Set()} now={null} out={false} gust={false} idle spelling={false} canSkip={false} planchette={{ current: null }} reduce inert onTouch={() => {}} onSkip={() => {}} />
    </div>
  );
}

/** The spirit's words as they arrive: each letter steps out of the dark, and the line wraps by word. */
function SpiritLine({ text, count, look, size, still }: { text: string; count: number; look: Look; size: number; still: boolean }) {
  const words = text.split(" ");
  // Where each word starts in the whole line, spaces counted, so a letter knows when its turn has come.
  const starts = words.map((_, w) => words.slice(0, w).reduce((n, word) => n + word.length + 1, 0));
  const fit = Math.min(size, (size * 12.5) / Math.max(12.5, text.length * 0.78));
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-[0.5em] gap-y-[0.1em] leading-none" style={{ fontFamily: POSTER_FONT, fontSize: `calc(${fit.toFixed(2)} * var(--k))`, color: look.lit, textShadow: `0 0 .35em ${look.glow}, 0 0 1em ${look.glow}88` }}>
      <span className="sr-only">{text}</span>
      {words.map((word, w) => (
        <span key={w} aria-hidden="true" className="inline-flex whitespace-nowrap">
          {[...word].map((ch, i) => {
            const shown = starts[w] + i < count;
            return (
              <motion.span key={i} className="inline-block" style={{ letterSpacing: "0.06em" }} initial={false} animate={still ? { opacity: shown ? 1 : 0 } : shown ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : { opacity: 0, y: "0.25em", scale: 1.5, filter: "blur(6px)" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </p>
  );
}

function Scene({ look, s, from, to, title, text, reached, lit, now, out, gust, idle, spelling, canSkip, planchette, reduce, inert = false, onTouch, onSkip }: { look: Look; s: Copy; from: string; to: string; title: string; text: string; reached: number; lit: ReadonlySet<string>; now: string | null; out: boolean; gust: boolean; idle: boolean; spelling: boolean; canSkip: boolean; planchette: Ref<SVGGElement>; reduce: boolean; inert?: boolean; onTouch: () => void; onSkip: () => void }) {
  return (
    <div className="absolute inset-0">
      {/* the table: dark wood, lit from two candles */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(120% 85% at 50% 42%, ${look.table[0]} 0%, ${look.table[1]} 72%)` }} />
      <div aria-hidden="true" className="absolute inset-0 opacity-60 mix-blend-overlay" style={{ backgroundImage: "repeating-linear-gradient(93deg, rgba(0,0,0,.35) 0 1.5px, transparent 1.5px 11px), repeating-linear-gradient(91deg, rgba(255,255,255,.05) 0 1px, transparent 1px 17px)" }} />
      <div aria-hidden="true" className="sn-pool absolute inset-0" style={{ background: `radial-gradient(75% 40% at 6% 8%, ${look.glow}50, transparent 70%), radial-gradient(75% 40% at 94% 8%, ${look.glow}50, transparent 70%)` }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(130% 100% at 50% 45%, transparent 48%, rgba(0,0,0,.72))" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "dust", colors: [look.glow, "#FFFFFF"], count: 20 }]} opacity={0.7} />
      </div>

      <div className="absolute top-1/2 left-1/2" style={{ width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: "translate(-50%, -50%)" }}>
        {/* mist crossing the table, thicker once the spirit has come */}
        {[18, 52, 74].map((top, i) => (
          <div key={top} aria-hidden="true" className="sn-mist pointer-events-none absolute left-[-30%] w-[160%]" style={{ top: `${top}%`, height: "26%", background: "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,.17), transparent 70%)", filter: "blur(calc(2.2 * var(--k)))", opacity: spelling || !idle ? 0.95 : 0.5, transition: "opacity 1.6s ease", animationDuration: `${17 + i * 4}s`, animationDirection: i % 2 ? "alternate-reverse" : "alternate" }} />
        ))}

        <div className={gust ? "sn-gust" : undefined}>
          <Candle look={look} out={out} className="absolute top-[3.5%] left-[1.5%] w-[12%]" />
          <Candle look={look} out={out} className="absolute top-[3.5%] right-[1.5%] w-[12%]" />
        </div>

        <div className="absolute inset-x-[22%] top-[3.2%] text-center">
          <p className="text-[calc(2.3*var(--k))] tracking-[0.34em] uppercase opacity-70 [overflow-wrap:anywhere]">{from} → {to}</p>
          <h1 className="mt-[calc(1.8*var(--k))] leading-[1.1] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, fontSize: title.length > 34 ? "calc(4.8*var(--k))" : "calc(6.2*var(--k))", color: look.lit, textShadow: `0 0 calc(3*var(--k)) ${look.glow}66` }}>
            {title}
          </h1>
        </div>

        <div className="absolute left-[4%] w-[92%]" style={{ top: "24.5%", aspectRatio: "100 / 74" }}>
          <Board look={look} lit={lit} now={now}>
            <Planchette look={look} gRef={planchette} calling={idle && !reduce} />
          </Board>
        </div>

        <div className="absolute inset-x-[4%] top-[67%] flex h-[17%] items-center justify-center">
          <SpiritLine text={text} count={reached} look={look} size={7.8} still={reduce} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[86%] flex justify-center">
          <TapPill tone={{ page: look.table[1], glow: [look.glow, look.glow], accent: look.lit, dark: true }} hidden={!idle} reduce={reduce}>
            {s.touch}
          </TapPill>
        </div>
        {canSkip ? (
          <div className="absolute inset-x-0 top-[93%] flex justify-center">
            <button type="button" onClick={onSkip} className="px-[calc(4*var(--k))] py-[calc(1.6*var(--k))] text-[calc(2.6*var(--k))] tracking-[0.3em] uppercase opacity-55 outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              {s.skip}
            </button>
          </div>
        ) : null}
      </div>

      {idle && !inert ? <button type="button" onClick={onTouch} aria-label={s.touch} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:ring-inset" /> : null}
    </div>
  );
}

function Page({ look, s, data, text, mode, seed, still, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: TemplateProps<SeanceFields>["data"]; text: string; mode: TemplateProps["mode"]; seed: number; still: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const theme: NightTheme = { card: look.paper, cardImage: PAPER_GRAIN, ink: look.paperInk, soft: look.paperSoft, accent: look.accent, edge: look.paperEdge, dark: false, label: look.ink, face: "serif" };
  const tilt = useMemo(() => {
    const rng = mulberry32(seed + 7);
    return data.photos.map(() => (rng() - 0.5) * 5);
  }, [data.photos, seed]);

  return (
    <motion.div className="absolute inset-0" style={{ background: `radial-gradient(120% 70% at 50% 0%, ${look.table[0]} 0%, ${look.table[1]} 70%)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}>
      <div aria-hidden="true" className="sn-pool pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 30% at 8% 4%, ${look.glow}38, transparent 70%), radial-gradient(70% 30% at 92% 4%, ${look.glow}38, transparent 70%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <Ambience layers={[{ kind: "dust", colors: [look.glow, "#FFFFFF"], count: 18 }, { kind: "embers", colors: [look.glow, look.flame[0]], count: 5 }]} opacity={0.75} />
      </div>
      <NightPage
        data={data}
        mode={mode}
        theme={theme}
        still={still}
        eyebrow={s.note.replace("{name}", data.senderName)}
        gallery={s.gallery}
        hero={
          <div className="flex flex-col items-center gap-[calc(3*var(--u))] pt-[calc(2*var(--u))] text-center">
            <p className="text-[calc(2.8*var(--u))] tracking-[0.34em] uppercase opacity-70" style={{ color: look.ink }}>{s.says}</p>
            <SpiritLine text={text} count={text.length} look={look} size={9.5} still />
          </div>
        }
        photo={(slot) => <SpiritPhoto slot={slot} look={look} rot={tilt[slot.index] ?? 0} />}
        onEvent={onEvent}
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </motion.div>
  );
}

/** A spirit photograph: a cabinet card whose picture comes clear out of a mist, with a faint aura round it. */
function SpiritPhoto({ slot, look, rot }: { slot: PhotoSlot; look: Look; rot: number }) {
  const { photo, still, open } = slot;
  return (
    <figure className="relative m-0" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-white/60">
        <div className="relative p-[calc(2.4*var(--u))] pb-[calc(10*var(--u))]" style={{ background: "#d9cdb2", backgroundImage: PAPER_GRAIN, boxShadow: `0 0 calc(11*var(--u)) ${look.glow}55, 0 calc(5*var(--u)) calc(9*var(--u)) rgba(0,0,0,.65)` }}>
          <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ background: "radial-gradient(circle at 50% 45%, #9a8e78, #3d362b)" }}>
            <motion.img
              src={photo.url}
              alt=""
              loading="lazy"
              draggable={false}
              className="h-full w-full object-cover"
              style={{ filter: "sepia(.38) contrast(1.06) saturate(.82)" }}
              initial={still ? false : { opacity: 0, scale: 1.06, filter: "sepia(.38) contrast(1.06) saturate(.82) blur(16px) brightness(1.9)" }}
              whileInView={{ opacity: 1, scale: 1, filter: "sepia(.38) contrast(1.06) saturate(.82) blur(0px) brightness(1)" }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
            />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 48%, rgba(12,7,2,.6))" }} />
          </div>
          {photo.caption ? (
            <figcaption className="absolute inset-x-[calc(3*var(--u))] bottom-[calc(2.4*var(--u))] text-center leading-tight" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(3.3*var(--u))", color: "#3a2a1a" }}>
              {photo.caption}
            </figcaption>
          ) : null}
        </div>
      </button>
    </figure>
  );
}
