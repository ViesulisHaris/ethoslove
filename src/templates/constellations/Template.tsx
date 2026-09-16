"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { Compass, X } from "lucide-react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { hexToRgb } from "../_shared/theme";
import { hashString } from "../_shared/random";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { useGyroParallax } from "../_shared/hooks/use-gyro-parallax";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { MessageBody } from "../_shared/MessageBody";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { CHART_KEYFRAMES, StarChart } from "./art";
import type { ConstellationFields } from "./schema";
import { Starfield, type Link } from "./Starfield";
import { layoutSky } from "./shapes";

const SKY: Record<ConstellationFields["sky"], string> = {
  midnight: "radial-gradient(120% 85% at 50% 112%, #1f1d45 0%, #0c0c22 46%, #04040c 100%)",
  aurora: "radial-gradient(120% 90% at 50% 112%, #123f3f 0%, #0a1a30 46%, #03050f 100%)",
  dawn: "radial-gradient(120% 90% at 50% 116%, #5a2f52 0%, #1c1233 46%, #06050f 100%)",
};

/** The page is the sky itself, so the tone paints nothing: only the light behind the card and the corner haze. */
const NIGHT: CoverTone = {
  page: "transparent",
  glow: ["rgba(96,108,206,.26)", "rgba(148,104,206,.24)"],
  accent: "#F2C879",
  dark: true,
};

/** The milky band: two soft diagonals, one cool and one warm, laid across the whole sky. */
const MILKY =
  "linear-gradient(104deg, transparent 33%, rgba(150,170,255,.10) 43%, rgba(226,224,255,.17) 50%, rgba(150,170,255,.09) 58%, transparent 69%), linear-gradient(96deg, transparent 41%, rgba(255,214,186,.07) 50%, transparent 60%)";

const STICKERS: StickerPlacement[] = [
  { id: "moon", x: 13, y: 14, size: 12, rotate: -8 },
  { id: "sparkle", x: 87, y: 12, size: 7.5 },
  { id: "planet", x: 89, y: 62, size: 14.5, rotate: 10 },
  { id: "star", x: 11, y: 46, size: 9.5, rotate: -12 },
  { id: "sparkle", x: 15, y: 85, size: 6.5 },
  { id: "star", x: 86, y: 87, size: 8, rotate: 14 },
];

const S = {
  en: { tapStar: "tap a star", chart: "{name}'s sky", stars: "{n} stars", oneStar: "1 star", headline: "our sky" },
  es: { tapStar: "toca una estrella", chart: "el cielo de {name}", stars: "{n} estrellas", oneStar: "1 estrella", headline: "nuestro cielo" },
};

type Stage = "intro" | "exploring" | "complete" | "final" | "message";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ConstellationFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Starfield | null>(null);
  const size = useContainerSize(rootRef);
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const gyro = useGyroParallax(rootRef, { maxTiltDeg: 22 });

  const photos = useMemo(() => data.photos.slice(0, 12), [data.photos]);
  const n = photos.length;
  const shape = data.fields.shape;
  const [stage, setStage] = useState<Stage>("intro");
  const [visited, setVisited] = useState<boolean[]>(() => Array(n).fill(false));
  const [active, setActive] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const cam = useRef({ cx: 0, cy: 0, scale: 1 });
  const camAnim = useRef<{ stop: () => void } | null>(null);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);

  const layout = useMemo(
    () => (size.ready && n > 0 ? layoutSky(shape, n, size.width, size.height) : null),
    [shape, n, size.ready, size.width, size.height],
  );

  const visitedCount = visited.filter(Boolean).length;
  const nextIndex = useMemo(() => {
    const i = visited.findIndex((v) => !v);
    return i === -1 ? null : i;
  }, [visited]);

  /* ---------- engine lifecycle ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.ready) return;
    const { r, g, b } = hexToRgb(data.accentColor);
    let engine = engineRef.current;
    if (!engine) {
      engine = new Starfield(canvas, {
        seed: hashString(data.recipientName + data.senderName + run),
        accent: [r, g, b],
        reduced: !!reduce,
      });
      engineRef.current = engine;
    }
    engine.accent = [r, g, b];
    engine.reduced = !!reduce;
    engine.resize(size.width, size.height);
    cam.current = { cx: size.width / 2, cy: size.height / 2, scale: 1 };
    engine.camera = cam.current;
    engine.start();
    return () => engine.stop();
  }, [size.ready, size.width, size.height, data.accentColor, data.recipientName, data.senderName, reduce, run]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !layout) return;
    engine.nodes = layout.nodes;
    engine.outline = layout.outline;
  }, [layout]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.visited = visited;
    engine.nextIndex = stage === "exploring" || stage === "intro" ? nextIndex : null;
  }, [visited, nextIndex, stage]);

  useEffect(() => {
    const unX = gyro.x.on("change", (v) => {
      if (engineRef.current) engineRef.current.parallax.x = v;
    });
    const unY = gyro.y.on("change", (v) => {
      if (engineRef.current) engineRef.current.parallax.y = v;
    });
    return () => {
      unX();
      unY();
    };
  }, [gyro.x, gyro.y]);

  // Pause the loop when the tab is hidden or the template scrolls out of view (gallery cards).
  useEffect(() => {
    const root = rootRef.current;
    const engine = engineRef.current;
    if (!root) return;
    const onVisibility = () => (document.hidden ? engineRef.current?.stop() : engineRef.current?.start());
    document.addEventListener("visibilitychange", onVisibility);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) engineRef.current?.start();
      else engineRef.current?.stop();
    });
    io.observe(root);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      engine?.stop();
    };
  }, [size.ready]);

  useEffect(() => () => engineRef.current?.stop(), []);

  /* ---------- camera ---------- */
  const moveCamera = useCallback(
    (target: { cx: number; cy: number; scale: number }) => {
      camAnim.current?.stop();
      if (reduce) {
        Object.assign(cam.current, target);
        return;
      }
      camAnim.current = animate(cam.current, target, { type: "spring", stiffness: 60, damping: 17, mass: 1 });
    },
    [reduce],
  );

  /* ---------- interactions ---------- */
  const begin = useCallback(() => {
    void audio.start();
    onEvent?.({ type: "started" });
    setStage("exploring");
  }, [audio, onEvent]);

  const openNode = useCallback(
    (i: number) => {
      if (!layout) return;
      const node = layout.nodes[i];
      setActive(i);
      setVisited((v) => (v[i] ? v : v.map((x, k) => (k === i ? true : x))));
      moveCamera({ cx: node.x, cy: node.y - Math.min(40, size.height * 0.05), scale: 2.3 });
    },
    [layout, moveCamera, size.height],
  );

  const addLinks = useCallback((i: number, current: boolean[]) => {
    const engine = engineRef.current;
    if (!engine) return;
    const neighbours = n > 2 ? [(i - 1 + n) % n, (i + 1) % n] : n === 2 ? [(i + 1) % 2] : [];
    for (const j of neighbours) {
      if (!current[j]) continue;
      const exists = engine.links.some((l) => (l.a === i && l.b === j) || (l.a === j && l.b === i));
      if (exists) continue;
      const link: Link = { a: j, b: i, progress: 0 };
      engine.links.push(link);
      animate(link, { progress: 1 }, { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 });
    }
  }, [n]);

  const closeNode = useCallback(() => {
    if (active === null || !layout) return;
    const i = active;
    setActive(null);
    moveCamera({ cx: size.width / 2, cy: size.height / 2, scale: 1 });
    addLinks(i, visited);
    onEvent?.({ type: "progress", pct: Math.round((visitedCount / n) * 60) });
    if (visitedCount === n) {
      setStage("complete");
      const engine = engineRef.current;
      window.setTimeout(() => {
        if (!engine) return;
        animate(engine, { completion: 1 }, { duration: reduce ? 0 : 2.4, ease: [0.22, 1, 0.36, 1] });
        if (!reduce) engine.burst(layout.center.x, layout.center.y);
      }, 700);
      window.setTimeout(() => setStage("final"), reduce ? 500 : 3400);
    }
  }, [active, layout, moveCamera, size.width, size.height, addLinks, visited, onEvent, visitedCount, n, reduce]);

  const onTap = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const engine = engineRef.current;
      if (!engine || stage === "final" || stage === "message") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (stage === "intro") begin();
      if (active !== null) {
        closeNode();
        return;
      }
      const hit = engine.hitTest(sx, sy);
      if (hit !== null) openNode(hit);
    },
    [stage, begin, active, closeNode, openNode],
  );

  const replay = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.links = [];
      engine.completion = 0;
    }
    setVisited(Array(n).fill(false));
    setActive(null);
    setStage("intro");
    setRun((r) => r + 1);
  }, [n]);

  const photoSize = Math.min(size.width * 0.6, size.height * 0.38, 320);
  const title = data.title || `${data.recipientName}`;
  const finalLine = data.fields.finalLine || t("constellationDone");

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden text-paper select-none"
      style={{ ...COVER_VARS, background: SKY[data.fields.sky] ?? SKY.midnight, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{CHART_KEYFRAMES}</style>
      {/* The sky is this template's page, so the cover's wash lays over it instead of replacing it. */}
      <CoverPage tone={NIGHT} pattern={MILKY} />
      {/* Nebula tint, parallaxed slightly against the stars */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[-10%]"
        style={{
          x: gyro.x,
          y: gyro.y,
          background:
            "radial-gradient(40% 35% at 30% 30%, rgba(var(--gift-accent-rgb),0.13), transparent 70%), radial-gradient(45% 40% at 75% 65%, rgba(120,110,255,0.12), transparent 70%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        onPointerUp={onTap}
        role="img"
        aria-label={title}
      />

      {/* Star tap targets: real buttons so keyboards, screen readers and tests can reach them */}
      {layout && active === null && stage !== "final" && stage !== "message"
        ? layout.nodes.map((node, i) => (
            <button
              key={i}
              type="button"
              data-star={i}
              data-visited={visited[i] ? "true" : "false"}
              aria-label={photos[i]?.caption ?? `${i + 1} / ${n}`}
              onClick={() => {
                if (stage === "intro") begin();
                openNode(i);
              }}
              className="absolute z-10 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
              style={{ left: node.x, top: node.y }}
            />
          ))
        : null}

      {/* Cover: the star chart, until they start. It sits under the star buttons, so a star tapped
          through the card still opens its photo. */}
      <AnimatePresence>
        {stage === "intro" ? (
          <motion.div
            key="intro"
            className="pointer-events-none absolute inset-0 z-[6] flex flex-col items-center justify-center px-[calc(7*var(--k))] text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5 } }}
          >
            <StickerScatter items={STICKERS} reduce={!!reduce} />
            <motion.p
              className="text-[calc(2.5*var(--k))] tracking-[0.34em] text-white/55 uppercase"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              {data.senderName} → {data.recipientName}
            </motion.p>
            <motion.h1
              className="mt-[calc(1.6*var(--k))] max-w-[calc(74*var(--k))] text-[calc(8*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]"
              style={{ fontFamily: POSTER_FONT }}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.8 }}
            >
              {title}
            </motion.h1>

            <motion.div
              className="relative mt-[calc(4*var(--k))] w-[calc(55*var(--k))]"
              initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
            >
              <Float reduce={!!reduce}>
                <button
                  type="button"
                  onClick={begin}
                  aria-label={s.tapStar}
                  className="pointer-events-auto block w-full rounded-[calc(2.6*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  <StarChart
                    shape={shape}
                    count={n}
                    seed={hashString(data.recipientName)}
                    name={s.chart.replace("{name}", data.recipientName)}
                    starsLabel={n === 1 ? s.oneStar : s.stars.replace("{n}", String(n))}
                  />
                </button>
              </Float>
              <span
                aria-hidden="true"
                className="absolute -bottom-[calc(1.8*var(--k))] left-1/2 h-[calc(4*var(--k))] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[calc(2.4*var(--k))]"
              />
            </motion.div>

            <TapPill tone={NIGHT} reduce={!!reduce} className="mt-[calc(5.5*var(--k))]">
              {s.tapStar}
            </TapPill>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Hint + progress */}
      <AnimatePresence>
        {stage === "exploring" && active === null ? (
          <motion.div
            key="hint"
            className="pointer-events-none absolute inset-x-0 bottom-[max(3.5rem,calc(env(safe-area-inset-bottom)+3rem))] flex flex-col items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex gap-1.5">
              {photos.map((p, i) => (
                <span
                  key={p.id}
                  className="size-1.5 rounded-full transition-colors duration-500"
                  style={{ background: visited[i] ? "var(--gift-accent)" : "rgba(255,255,255,0.25)" }}
                />
              ))}
            </div>
            <motion.p
              className="text-[12px] tracking-[0.22em] text-white/70 uppercase"
              animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              {visitedCount === 0 ? t("tapAStar") : t("findNext")}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Motion permission (iOS) */}
      <AnimatePresence>
        {gyro.needsPermission && stage !== "intro" && stage !== "message" ? (
          <motion.button
            key="motion"
            type="button"
            onClick={() => void gyro.requestPermission()}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-40 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/35 px-3 text-xs text-white/85 backdrop-blur-md"
          >
            <Compass className="size-3.5" />
            {t("enableMotion")}
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* Photo card */}
      <AnimatePresence>
        {active !== null && photos[active] ? (
          <motion.div
            key={`photo-${active}`}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6"
            onClick={closeNode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <motion.div
              className="relative"
              style={{ width: photoSize, height: photoSize }}
              initial={{ scale: 0.12, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", stiffness: 130, damping: 16, delay: 0.15 }}
            >
              <div
                className="absolute inset-[-18%] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(var(--gift-accent-rgb),0.5), transparent 68%)", filter: "blur(14px)" }}
              />
              <img
                src={photos[active].url}
                alt={photos[active].alt ?? ""}
                className="relative h-full w-full rounded-full object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/30"
                draggable={false}
              />
            </motion.div>
            {photos[active].caption ? (
              <motion.p
                className="mt-7 max-w-xs text-center text-[clamp(1.2rem,5.5cqw,1.5rem)] leading-snug italic"
                style={{ fontFamily: "var(--gift-font-display)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.7 }}
              >
                {photos[active].caption}
              </motion.p>
            ) : null}
            <motion.p
              className="mt-3 text-xs tracking-[0.2em] text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {visitedCount} / {n}
            </motion.p>
            <button
              type="button"
              data-testid="close-photo"
              aria-label={t("close")}
              onClick={(e) => {
                e.stopPropagation();
                closeNode();
              }}
              className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 grid size-10 place-items-center rounded-full bg-black/35 text-white/85 backdrop-blur-md"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Sparkle weather over the sky, and a burst of stardust when the shape completes. */}
      <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
        <Ambience layers={[{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8", data.accentColor], count: 22 }, { kind: "dust", colors: ["#FFFFFF"], count: 16 }]} opacity={stage === "message" ? 0.35 : 0.8} />
      </div>
      <Confetti burst={stage === "final" || stage === "message" ? 1 : 0} colors={["#FFFFFF", "#FFE9B8", data.accentColor, "#BFD7FF"]} count={120} origin={{ x: 0.5, y: 0.45 }} className="pointer-events-none absolute inset-0 z-[15]" />

      {/* Constellation complete */}
      <AnimatePresence>
        {stage === "final" ? (
          <motion.div
            key="final"
            className="absolute inset-x-0 bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))] z-20 flex flex-col items-center gap-6 px-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.35 } }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="max-w-sm text-[clamp(1.7rem,8cqw,2.3rem)] leading-snug italic drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]"
              style={{ fontFamily: "var(--gift-font-display)" }}
            >
              {finalLine}
            </p>
            <button
              type="button"
              onClick={() => {
                setStage("message");
                onEvent?.({ type: "progress", pct: 70 });
              }}
              className="h-12 rounded-full px-7 text-[15px] font-semibold shadow-lg"
              style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
            >
              {t("continue")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Message */}
      <AnimatePresence>
        {stage === "message" ? (
          <MessagePanel
            key="message"
            data={data}
            mode={mode}
            blocks={blocks}
            reduce={!!reduce}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={mode === "preview" ? undefined : replay}
          />
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} className={cn(active !== null && "hidden")} />
    </div>
  );
}

function MessagePanel({
  data,
  mode,
  blocks,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<ConstellationFields>["data"];
  mode: TemplateProps["mode"];
  blocks: ReturnType<typeof parseRichText>;
  reduce: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const endedRef = useRef(false);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent]);

  const followCaret = useCallback((caret: HTMLElement) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const r = caret.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    const limit = s.bottom - Math.min(150, s.height * 0.3);
    if (r.bottom > limit) scroller.scrollBy({ top: r.bottom - limit + 40, behavior: "smooth" });
  }, []);

  return (
    <motion.div
      ref={scrollerRef}
      className="absolute inset-0 z-30 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 90, damping: 18 }}
    >
      <div className="mx-auto flex w-[min(90cqw,560px)] flex-col gap-5 pt-[max(14cqh,72px)] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* The words on smoked glass under the stars, with the sky's glow bleeding in at the top. */}
        <div
          className="relative overflow-hidden rounded-[28px] px-[clamp(24px,7cqw,42px)] pt-[clamp(28px,8cqw,46px)] pb-[clamp(28px,8cqw,48px)] backdrop-blur-xl"
          style={{
            background: "linear-gradient(165deg, rgba(34,40,92,0.74) 0%, rgba(12,14,40,0.8) 55%, rgba(6,8,24,0.86) 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.22), 0 40px 80px -30px rgba(0,0,0,0.9)",
          }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[130%] -translate-x-1/2 rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(var(--gift-accent-rgb), 0.38), transparent)" }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.7) 1px, transparent 1.6px)", backgroundSize: "46px 46px", maskImage: "linear-gradient(180deg, black, transparent 45%)" }} />
          <div className="relative">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="dark" face="serif" onDone={() => setDone(true)} onCaretMove={followCaret} />
          </div>
        </div>

        {done && data.countdown ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl"
          >
            <Countdown countdown={data.countdown} locale={data.locale} tone="dark" />
          </motion.div>
        ) : null}

        {done && data.surprise ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl"
          >
            <p className="mb-4 text-center text-[11px] tracking-[0.25em] text-white/50 uppercase">{t("ps")}</p>
            <SurpriseReveal
              surprise={data.surprise}
              locale={data.locale}
              tone="dark"
              onReveal={() => onEvent?.({ type: "surprise" })}
            />
          </motion.div>
        ) : null}

        {done ? (
          <motion.div
            ref={endRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-3xl border border-white/10 bg-black/55 px-2 py-8 backdrop-blur-xl"
          >
            <EndScreen data={data} tone="dark" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
