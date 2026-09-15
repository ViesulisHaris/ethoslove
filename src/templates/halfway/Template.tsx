"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Mic } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useBlowDetector } from "../_shared/hooks/use-blow-detector";
import { hashString, mulberry32 } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Sticker } from "../_shared/covers/stickers";
import { ISLANDS, MapArt, PALETTES, Postmark, ROUTE, Stamp, type Palette } from "./art";
import { glide, thrust, travel } from "./flight";
import { arc, routeKm, track } from "./track";
import { fieldsSchema, type HalfwayFields } from "./schema";

const S = {
  en: {
    between: "km between you",
    toGo: "km to go",
    together: "together",
    blow: "blow the {thing} to {name}",
    blowing: "blow into your phone",
    harder: "harder!",
    keep: "keep blowing",
    dontStop: "don't stop!",
    orTap: "or tap the {thing}",
    tapFly: "tap the {thing} to fly",
    things: { plane: "plane", balloon: "balloon", bird: "bird" },
    madeIt: "you made it",
    fly: "Fly to {name}",
    halfwayDefault: "Halfway. Neither of you has further to come.",
    postcard: "a postcard from {name}",
    via: "via {places}",
    airmail: "AIR MAIL",
    photos: "along the way",
  },
  es: {
    between: "km entre vosotros",
    toGo: "km por recorrer",
    together: "juntos",
    blow: "sopla el {thing} hasta {name}",
    blowing: "sopla al teléfono",
    harder: "¡más fuerte!",
    keep: "¡sigue soplando!",
    dontStop: "¡no pares!",
    orTap: "o toca el {thing}",
    tapFly: "toca el {thing} para volar",
    things: { plane: "avión", balloon: "globo", bird: "pajarito" },
    madeIt: "has llegado",
    fly: "Volar hasta {name}",
    halfwayDefault: "La mitad. Ninguno de los dos tiene que ir más lejos.",
    postcard: "una postal de {name}",
    via: "vía {places}",
    airmail: "POR AVIÓN",
    photos: "por el camino",
  },
};

/** The paper's grain, multiplied over the postcard and the notes. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.12 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

const KEYFRAMES = `
.hw-glow{transform-box:fill-box;transform-origin:center;animation:hw-breathe 2.2s ease-in-out infinite alternate}
@keyframes hw-breathe{from{transform:scale(.88);opacity:.35}to{transform:scale(1.12);opacity:.75}}
.hw-bob{animation:hw-bob 1.6s ease-in-out infinite alternate}
@keyframes hw-bob{from{transform:translateY(-1.4px)}to{transform:translateY(1.4px)}}
.hw-drift{animation:hw-drift 7s ease-in-out infinite alternate}
@keyframes hw-drift{from{transform:translateX(-6px)}to{transform:translateX(6px)}}
.hw-gust{animation:hw-gust .55s linear infinite}
@keyframes hw-gust{from{transform:translateX(5px);opacity:1}to{transform:translateX(-7px);opacity:0}}
.hw-flap{transform-box:fill-box;transform-origin:90% 85%;animation:hw-flap .32s ease-in-out infinite alternate}
@keyframes hw-flap{from{transform:rotate(-20deg)}to{transform:rotate(24deg)}}
.hw-sway{transform-box:fill-box;transform-origin:50% 0%;animation:hw-sway 2.6s ease-in-out infinite alternate}
@keyframes hw-sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
.hw-float{animation:hw-float 4.6s ease-in-out infinite alternate}
@keyframes hw-float{from{translate:0 0}to{translate:0 calc(-1.8*var(--k))}}
.hw-ring{opacity:0;transition:opacity .2s}
.hw-plane:focus-visible .hw-ring{opacity:1}
@media (prefers-reduced-motion: reduce){.hw-glow,.hw-bob,.hw-drift,.hw-gust,.hw-flap,.hw-sway,.hw-float{animation:none}}
`;

/** Where the three stickers sit around the postcard. */
const STICKER_SPOTS: CSSProperties[] = [
  { left: "calc(50% - 50 * var(--k))", top: "calc(var(--top) + 26 * var(--k))", width: "calc(20 * var(--k))", rotate: "-8deg" },
  { left: "calc(50% + 38 * var(--k))", top: "calc(var(--top) + 27 * var(--k))", width: "calc(10 * var(--k))", animationDelay: "-1.6s" },
  { left: "calc(50% + 37 * var(--k))", top: "calc(var(--top) + 110 * var(--k))", width: "calc(12 * var(--k))", rotate: "12deg", animationDelay: "-3.1s" },
];

const MAX_MARKERS = 6;

const pillStyle = (p: Palette): CSSProperties => ({
  padding: "calc(2 * var(--k)) calc(4.4 * var(--k))",
  fontSize: "calc(3 * var(--k))",
  background: p.pill,
  color: p.ink,
  backdropFilter: "blur(6px)",
});

type Stage = "map" | "reading";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<HalfwayFields>) {
  const reduce = useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const animate = !preview && !reduce;
  const audio = useGiftAudio(data.music, !preview);
  // Parsed here as well, so a draft saved before a field changed shape still draws instead of crashing.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const p = PALETTES[fields.palette] ?? PALETTES.blush;
  const thing = s.things[fields.vehicle] ?? s.things.plane;
  const trk = useMemo(() => track(arc(ROUTE.a, ROUTE.control, ROUTE.b, 64)), []);

  const [stage, setStage] = useState<Stage>("map");
  const [progress, setProgress] = useState(preview ? 0.42 : 0);
  const [wind, setWind] = useState(0);
  const [run, setRun] = useState(0);

  const eventRef = useRef(onEvent);
  const progressRef = useRef(progress);
  const startedRef = useRef(false);
  const flyingRef = useRef(false);
  const rafRef = useRef(0);
  useEffect(() => {
    eventRef.current = onEvent;
    progressRef.current = progress;
  });

  // The sender's own number wins; otherwise every leg, as the crow flies.
  const route = useMemo(
    () => ({
      km: fields.distanceKm ?? Math.round(routeKm([fields.from, ...fields.stops, fields.to])),
      stops: fields.stops.map((stop) => stop.name),
    }),
    [fields],
  );

  const markers = useMemo(() => {
    const n = Math.min(data.photos.length, MAX_MARKERS);
    return Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  }, [data.photos.length]);

  const arrived = progress >= 1;
  const remaining = Math.round(route.km * (1 - progress));

  const advance = useCallback((next: number) => {
    setProgress(Math.min(1, Math.max(0, next)));
  }, []);

  const { start } = audio;
  const begin = useCallback(() => {
    if (startedRef.current || preview) return;
    startedRef.current = true;
    void start();
    eventRef.current?.({ type: "started" });
  }, [preview, start]);

  /** Tap the plane, or press Enter on it, and it flies the rest of the way by itself. */
  const fly = useCallback(() => {
    if (preview || flyingRef.current || progressRef.current >= 1) return;
    flyingRef.current = true;
    begin();
    if (reduce) {
      advance(1);
      return;
    }
    const from = progressRef.current;
    const startedAt = performance.now();
    const duration = 400 + 2600 * (1 - from);
    const step = (now: number) => {
      const k = Math.min(1, (now - startedAt) / duration);
      const eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      advance(from + (1 - from) * eased);
      if (k < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [advance, begin, preview, reduce]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Landing: a beat to see the heart, then the postcard turns over.
  useEffect(() => {
    if (!arrived || preview || stage !== "map") return;
    eventRef.current?.({ type: "progress", pct: 50 });
    const id = window.setTimeout(() => setStage("reading"), reduce ? 500 : 2400);
    return () => window.clearTimeout(id);
  }, [arrived, preview, reduce, stage]);

  const onPlaneKey = (e: ReactKeyboardEvent<SVGGElement>) => {
    if (preview || arrived || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    fly();
  };

  const replay = () => {
    cancelAnimationFrame(rafRef.current);
    flyingRef.current = false;
    setProgress(0);
    setWind(0);
    setStage("map");
    setRun((r) => r + 1);
  };

  const layers =
    stage === "map"
      ? [{ kind: "sparkles" as const, colors: p.sparkle, count: 12 }, ...(arrived ? [{ kind: "hearts" as const, colors: [data.accentColor, "#ffc2d1", "#ffffff"], count: 22 }] : [])]
      : [{ kind: "sparkles" as const, colors: p.sparkle, count: 8 }];

  const room = {
    background: p.ground,
    color: p.ink,
    fontFamily: "var(--gift-font-body)",
    ["--k" as string]: "var(--u)",
    ["--top" as string]: "max(0px, calc((100cqh - 158 * var(--k)) / 2))",
  } as CSSProperties;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={room}>
      <style>{KEYFRAMES}</style>

      <AnimatePresence mode="wait">
        {stage === "map" ? (
          <motion.div key={`map-${run}`} className="absolute inset-0" exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.5 } }}>
            <p
              className="absolute inset-x-0 truncate px-[calc(14*var(--k))] text-center font-semibold tracking-[0.3em] uppercase"
              style={{ top: "calc(var(--top) + 2 * var(--k))", fontSize: "calc(2.9 * var(--k))", color: p.soft }}
            >
              {data.senderName} <span aria-hidden="true">→</span> {data.recipientName}
            </p>
            <p
              className="absolute inset-x-0 text-center leading-none tabular-nums"
              style={{ top: "calc(var(--top) + 9 * var(--k))", fontSize: "calc(15 * var(--k))", fontFamily: "var(--gift-font-display)", color: p.ink }}
            >
              {remaining.toLocaleString(data.locale)}
            </p>
            <p
              className="absolute inset-x-0 text-center font-semibold tracking-[0.24em] uppercase"
              style={{ top: "calc(var(--top) + 26.5 * var(--k))", fontSize: "calc(2.9 * var(--k))", color: p.soft }}
            >
              {arrived ? s.together : progress > 0 ? s.toGo : s.between}
            </p>

            {/* The postcard */}
            <motion.div
              className="absolute left-1/2 z-[5]"
              style={{ top: "calc(var(--top) + 34 * var(--k))", width: "calc(92 * var(--k))", x: "-50%" }}
              initial={animate ? { opacity: 0, y: 28, rotate: -4 } : false}
              animate={{ opacity: 1, y: 0, rotate: -1 }}
              exit={reduce ? { opacity: 0 } : { scaleX: 0, opacity: 0.5, transition: { duration: 0.45, ease: [0.55, 0, 0.8, 0.2] } }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
            >
              <div
                className="relative"
                style={{
                  background: p.card,
                  padding: "calc(2.2 * var(--k))",
                  borderRadius: "calc(5 * var(--k))",
                  boxShadow: "0 calc(0.6 * var(--k)) calc(1.6 * var(--k)) rgba(0,0,0,0.08), 0 calc(9 * var(--k)) calc(20 * var(--k)) calc(-7 * var(--k)) rgba(60,20,40,0.38)",
                }}
              >
                <span aria-hidden="true" className="absolute z-[2] rounded-[2px]" style={{ top: "calc(-2.4 * var(--k))", left: "calc(9 * var(--k))", width: "calc(18 * var(--k))", height: "calc(5 * var(--k))", background: "rgba(var(--gift-accent-rgb),0.3)", rotate: "-8deg" }} />
                <span aria-hidden="true" className="absolute z-[2] rounded-[2px]" style={{ top: "calc(-2.2 * var(--k))", right: "calc(9 * var(--k))", width: "calc(16 * var(--k))", height: "calc(5 * var(--k))", background: "rgba(var(--gift-accent-rgb),0.3)", rotate: "7deg" }} />
                <MapArt
                  p={p}
                  trk={trk}
                  progress={progress}
                  markers={markers}
                  arrived={arrived}
                  people={{ from: data.senderName, to: data.recipientName }}
                  cities={{ from: fields.from.name, to: fields.to.name }}
                  islands={{ from: ISLANDS[fields.yourIsland] ?? ISLANDS.pink, to: ISLANDS[fields.theirIsland] ?? ISLANDS.peach }}
                  vehicle={fields.vehicle}
                  lettering={data.fontPairing}
                  planeLabel={s.fly.replace("{name}", data.recipientName)}
                  interactive={!preview && !arrived}
                  wind={arrived ? 0 : wind}
                  onPlaneTap={fly}
                  onPlaneKey={onPlaneKey}
                />
              </div>
            </motion.div>

            {p.stickers.map((id, i) => (
              <div key={`${id}-${i}`} aria-hidden="true" className={cn("pointer-events-none absolute z-[6] aspect-square", animate && "hw-float")} style={STICKER_SPOTS[i]}>
                <Sticker id={id} />
              </div>
            ))}

            {/* Halfway: a little speech bubble under the card. */}
            <AnimatePresence>
              {progress >= 0.5 && !arrived ? (
                <motion.div
                  key="halfway"
                  className="pointer-events-none absolute left-1/2 z-[7] w-max max-w-[calc(84*var(--k))]"
                  style={{ top: "calc(var(--top) + 124 * var(--k))", x: "-50%" }}
                  initial={animate ? { opacity: 0, y: -6, scale: 0.9 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <span aria-hidden="true" className="absolute left-1/2 size-[calc(3*var(--k))] -translate-x-1/2 rotate-45 rounded-[2px] bg-[#fffdfb]" style={{ top: "calc(-1.3 * var(--k))" }} />
                  <p
                    className="relative bg-[#fffdfb] text-center leading-snug text-[#4a3036] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]"
                    style={{ fontSize: "calc(3.5 * var(--k))", padding: "calc(2.4 * var(--k)) calc(4.5 * var(--k))", borderRadius: "calc(4 * var(--k))" }}
                  >
                    {fields.halfwayNote?.trim() || s.halfwayDefault}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {preview || arrived ? (
              <p
                className="absolute left-1/2 z-[7] max-w-[calc(92*var(--k))] -translate-x-1/2 truncate rounded-full font-semibold tracking-[0.2em] whitespace-nowrap uppercase"
                style={{ top: "calc(var(--top) + 141 * var(--k))", ...pillStyle(p) }}
              >
                {arrived ? s.madeIt : s.blow.replace("{thing}", thing).replace("{name}", data.recipientName)}
              </p>
            ) : (
              <Breath
                key={`breath-${run}`}
                s={s}
                name={data.recipientName}
                thing={thing}
                p={p}
                animate={animate}
                sinking={progress > 0.02}
                progressRef={progressRef}
                flyingRef={flyingRef}
                advance={advance}
                begin={begin}
                onWind={setWind}
              />
            )}
          </motion.div>
        ) : (
          <Reading
            key={`reading-${run}`}
            p={p}
            s={s}
            data={data}
            mode={mode}
            km={route.km}
            ring={`${fields.from.name} · ${fields.to.name}`.toUpperCase()}
            stops={route.stops}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        )}
      </AnimatePresence>

      {animate ? (
        <div className="pointer-events-none absolute inset-0 z-[30]" aria-hidden="true">
          <Ambience layers={layers} opacity={0.9} />
        </div>
      ) : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/**
 * The microphone and what it drives. Its own component, remounted on replay, so the detector
 * starts fresh every time and the microphone is released the moment the plane lands.
 */
function Breath({
  s,
  name,
  thing,
  p,
  animate,
  sinking,
  progressRef,
  flyingRef,
  advance,
  begin,
  onWind,
}: {
  s: (typeof S)["en"];
  name: string;
  /** What flies, in the gift's language: "plane", "globo"… */
  thing: string;
  p: Palette;
  animate: boolean;
  /** The plane has left home, so running out of breath now costs distance. */
  sinking: boolean;
  progressRef: RefObject<number>;
  flyingRef: RefObject<boolean>;
  advance: (next: number) => void;
  begin: () => void;
  onWind: (push: number) => void;
}) {
  const blow = useBlowDetector({ enabled: true, onBlow: begin });
  const levelRef = useRef(0);
  useEffect(() => {
    levelRef.current = blow.level;
  }, [blow.level]);
  const listening = blow.state === "listening";

  // While listening, every frame turns breath into speed and speed into distance; no breath, and it slides back.
  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    let last = performance.now();
    let speed = 0;
    let shown = 0;
    let pos = progressRef.current;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const push = thrust(levelRef.current);
      if (Math.abs(push - shown) > 0.04 || (push === 0 && shown !== 0)) {
        shown = push;
        onWind(push);
      }
      if (flyingRef.current) pos = progressRef.current;
      else {
        speed = glide(speed, push, dt);
        const next = travel(pos, speed, dt);
        speed = next.speed;
        if (next.pos !== pos) {
          pos = next.pos;
          advance(pos);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening, advance, onWind, progressRef, flyingRef]);

  const icon = { width: "calc(4 * var(--k))", height: "calc(4 * var(--k))", color: "var(--gift-accent)" };
  const label = thrust(blow.level) > 0 ? s.keep : blow.level > 0.12 ? s.harder : sinking ? s.dontStop : s.blowing;

  return (
    <div className="absolute left-1/2 z-[7] flex w-max max-w-[calc(92*var(--k))] -translate-x-1/2 flex-col items-center gap-[calc(1.8*var(--k))]" style={{ top: "calc(var(--top) + 141 * var(--k))" }}>
      {blow.state === "idle" ? (
        <motion.button
          type="button"
          onClick={() => {
            begin();
            void blow.start();
          }}
          whileTap={{ scale: 0.96 }}
          animate={animate ? { scale: [1, 1.03, 1] } : undefined}
          transition={animate ? { duration: 2.4, repeat: Infinity } : undefined}
          className="flex max-w-full items-center gap-[calc(2*var(--k))] rounded-full font-semibold tracking-[0.2em] uppercase shadow-[0_10px_24px_-12px_rgba(0,0,0,0.4)]"
          style={{ padding: "calc(2.4 * var(--k)) calc(5 * var(--k))", fontSize: "calc(3 * var(--k))", background: "#fffdfb", color: p.tone === "dark" ? "#2c3378" : p.ink }}
        >
          <Mic className="shrink-0" style={icon} />
          <span className="truncate">{s.blow.replace("{thing}", thing).replace("{name}", name)}</span>
        </motion.button>
      ) : listening ? (
        <div className="flex items-center gap-[calc(2.4*var(--k))] rounded-full font-semibold tracking-[0.2em] whitespace-nowrap uppercase" style={pillStyle(p)}>
          <span className="relative grid shrink-0 place-items-center rounded-full" style={{ width: "calc(6.4 * var(--k))", height: "calc(6.4 * var(--k))", background: "rgba(var(--gift-accent-rgb),0.16)" }}>
            <Mic style={{ ...icon, width: "calc(3.4 * var(--k))", height: "calc(3.4 * var(--k))" }} />
            <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--gift-accent)", transform: `scale(${1 + blow.level * 0.9})`, opacity: 0.25 + blow.level * 0.7 }} />
          </span>
          {label}
        </div>
      ) : (
        <p className="rounded-full font-semibold tracking-[0.2em] whitespace-nowrap uppercase" style={pillStyle(p)}>
          {s.tapFly.replace("{thing}", thing)}
        </p>
      )}
      {blow.state === "idle" || listening ? <p style={{ fontSize: "calc(3.2 * var(--k))", color: p.soft }}>{s.orTap.replace("{thing}", thing)}</p> : null}
    </div>
  );
}

function Reading({
  p,
  s,
  data,
  mode,
  km,
  ring,
  stops,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  p: Palette;
  s: (typeof S)["en"];
  data: TemplateProps<HalfwayFields>["data"];
  mode: TemplateProps["mode"];
  km: number;
  /** The two places, for the postmark. */
  ring: string;
  stops: string[];
  reduce: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const tilts = useMemo(() => {
    const rng = mulberry32(hashString(`${data.recipientName}${data.senderName}halfway`));
    return data.photos.map(() => (rng() - 0.5) * 7);
  }, [data.photos, data.recipientName, data.senderName]);

  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "progress", pct: 100 });
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, mode]);

  const paper: CSSProperties = { background: p.card, backgroundImage: GRAIN, color: "#3a2a30" };
  const shadow = "shadow-[0_1px_2px_rgba(0,0,0,0.12),0_24px_44px_-24px_rgba(60,20,40,0.45)]";

  return (
    <motion.div className="absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[max(11cqh,72px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        {/* The back of the postcard */}
        <motion.article
          className={cn("relative rounded-[6px] px-[calc(6*var(--u))] pt-[calc(7*var(--u))] pb-[calc(7*var(--u))]", shadow)}
          style={{ ...paper, rotate: -0.6 }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 75, y: 20 }}
          animate={{ opacity: 1, rotateY: 0, y: 0 }}
          transition={{ duration: reduce ? 0.3 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div aria-hidden="true" className="absolute -top-[calc(3*var(--u))] right-[calc(3*var(--u))] w-[calc(16*var(--u))] rotate-[6deg]">
            <Stamp p={p} label={s.airmail} />
          </div>
          <div aria-hidden="true" className="absolute top-[calc(4*var(--u))] right-[calc(14*var(--u))] w-[calc(30*var(--u))] -rotate-[12deg]">
            <Postmark ring={ring} center={`${km.toLocaleString(data.locale)} KM`} />
          </div>
          <p className="max-w-[46%] text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{s.postcard.replace("{name}", data.senderName)}</p>
          {stops.length ? (
            <p className="mt-[calc(1*var(--u))] max-w-[46%] truncate text-[calc(4.4*var(--u))] leading-tight opacity-60" style={{ fontFamily: "var(--gift-font-hand)" }}>
              {s.via.replace("{places}", stops.join(", "))}
            </p>
          ) : null}
          <div className="mt-[calc(11*var(--u))]">
            {/* The editor's title, when there is one, is how the postcard opens. */}
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" greeting={data.title?.trim() || undefined} />
          </div>
        </motion.article>

        {data.photos.length ? (
          <>
            <p className="text-center text-[calc(3.2*var(--u))] font-semibold tracking-[0.22em] uppercase" style={{ color: p.soft }}>
              {s.photos}
            </p>
            <div className="grid grid-cols-2 gap-[calc(5*var(--u))] px-[calc(1*var(--u))]">
              {data.photos.map((photo, i) => (
                <Polaroid key={photo.id} photo={photo} rot={tilts[i] ?? 0} index={i} reduce={reduce} single={data.photos.length === 1} />
              ))}
            </div>
          </>
        ) : null}

        {data.countdown ? (
          <div className={cn("rounded-[6px] p-[calc(5*var(--u))]", shadow)} style={paper}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className={cn("relative rounded-[6px] p-[calc(5*var(--u))]", shadow)} style={{ ...paper, rotate: "0.6deg" }}>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase opacity-60">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className={cn("rounded-[6px] p-[calc(4*var(--u))]", shadow)} style={paper}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </motion.div>
  );
}

/** A photo taped on, a little crooked, with its caption in handwriting. */
function Polaroid({ photo, rot, index, reduce, single }: { photo: GiftPhoto; rot: number; index: number; reduce: boolean; single: boolean }) {
  return (
    <motion.figure
      className={cn("relative m-0", single && "col-span-2 mx-auto w-[62%]")}
      style={{ rotate: rot }}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 16, delay: (index % 2) * 0.12 }}
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 z-[2] -translate-x-1/2 rounded-[2px]"
        style={{ top: "calc(-2.2 * var(--u))", width: "calc(15 * var(--u))", height: "calc(4.6 * var(--u))", background: "rgba(var(--gift-accent-rgb),0.3)", rotate: `${index % 2 ? 6 : -5}deg` }}
      />
      <div className="bg-[#FFFDF8] p-[calc(2*var(--u))] pb-[calc(3*var(--u))] shadow-[0_14px_28px_-14px_rgba(0,0,0,0.45)]">
        <div className="aspect-[4/5] w-full overflow-hidden bg-black/5">
          <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </div>
        {photo.caption ? (
          <figcaption className="mt-[calc(2*var(--u))] text-center text-[calc(4*var(--u))] leading-tight break-words text-[#3A2E2A]" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {photo.caption}
          </figcaption>
        ) : null}
      </div>
    </motion.figure>
  );
}
