"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionStyle, type MotionValue } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { Ambience } from "../_shared/Ambience";
import { Countdown } from "../_shared/Countdown";
import { EndScreen } from "../_shared/EndScreen";
import { GiftVideo } from "../_shared/GiftVideo";
import { MessageBody } from "../_shared/MessageBody";
import { SoundToggle } from "../_shared/SoundToggle";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { COVER_VARS, PAPER_GRAIN, POSTER_FONT, StickerScatter, TapPill } from "../_shared/cover-kit";
import { mix } from "../bouquet/art";
import { GARDENS, MIXES, type Bed, type Garden } from "./palette";
import { fieldsSchema, type GardenFields } from "./schema";
import {
  BellJar,
  Companion,
  GARDEN_KEYFRAMES,
  GateLeaf,
  GreenhouseGlass,
  GreenhouseRoof,
  Ivy,
  LandBand,
  PressedCard,
  ProgressVine,
  SeedPacket,
  SkyLight,
  SketchGarden,
  Stem,
  Trellis,
  WoodSign,
  WrappedBouquet,
  grassTile,
} from "./art";

const S = {
  en: {
    push: "push the gate",
    keepGoing: "keep walking",
    plantedFor: "planted for",
    coverTitle: "a garden for you",
    sketch1: "I started this a while ago.",
    sketch2: "None of it was an accident.",
    meadow: "and then it all opened at once",
    arbor: "the days I keep coming back to",
    greenhouse: "come inside — I wrote it down",
    bouquet: "picked for you. these ones don't wilt.",
    counting: "in flower on",
    hidden: "under the glass",
    forName: "For {name}",
  },
  es: {
    push: "abre la verja",
    keepGoing: "sigue caminando",
    plantedFor: "plantado para",
    coverTitle: "un jardín para ti",
    sketch1: "Empecé esto hace tiempo.",
    sketch2: "Nada de esto fue casualidad.",
    meadow: "y entonces se abrió todo a la vez",
    arbor: "los días a los que vuelvo siempre",
    greenhouse: "entra — lo dejé escrito",
    bouquet: "cortadas para ti. estas no se marchitan.",
    counting: "florece el",
    hidden: "bajo el cristal",
    forName: "Para {name}",
  },
};

type Strings = (typeof S)["en"];
type Scroller = RefObject<HTMLDivElement | null>;

/** A sunlit wall: the garden's own green, taken most of the way to paper. */
const wash = (g: Garden, amount = 0.76) => mix(g.land.mid, g.dark ? "#0C1526" : "#FFFFFF", amount);

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<GardenFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const g = GARDENS[fields.garden] ?? GARDENS.blush;
  const beds = MIXES[fields.blooms] ?? MIXES.wildflowers;
  const seed = useMemo(() => hashString(`${data.recipientName}|${data.senderName}|${fields.blooms}`), [data.recipientName, data.senderName, fields.blooms]);
  const audio = useGiftAudio(data.music, mode !== "preview");
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll({ container: scroller });
  const walked = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  useEffect(() => {
    const ids = timers.current;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  const lastPct = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const pct = Math.min(95, Math.round(v * 10) * 10);
    if (pct > lastPct.current) {
      lastPct.current = pct;
      eventRef.current?.({ type: "progress", pct });
    }
  });

  const openGate = () => {
    if (open) return;
    setOpen(true);
    void audio.start();
    eventRef.current?.({ type: "started" });
    const el = scroller.current;
    if (!el) return;
    timers.current.push(window.setTimeout(() => el.scrollBy({ top: el.clientHeight * 0.88, behavior: reduce ? "auto" : "smooth" }), reduce ? 200 : 1150));
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, background: g.sky, color: g.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{GARDEN_KEYFRAMES}</style>
      <div ref={scroller} className="scrollbar-none absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain">
        <GateSection g={g} s={s} data={data} sign={fields.sign} open={open} reduce={!!reduce} onOpen={openGate} hint={t("scrollDown")} />
        <SketchSection g={g} s={s} name={data.recipientName} scroller={scroller} reduce={!!reduce} />
        <MeadowSection g={g} s={s} beds={beds} seed={seed} scroller={scroller} reduce={!!reduce} />
        {data.photos.length > 0 ? <ArborSection g={g} s={s} photos={data.photos} scroller={scroller} seed={seed} /> : null}
        <GreenhouseSection g={g} s={s} data={data} mode={mode} scroller={scroller} />
        <BouquetSection
          g={g}
          s={s}
          data={data}
          beds={beds}
          seed={seed}
          tag={fields.tag}
          scroller={scroller}
          onReact={onReact}
          onMakeOne={onMakeOne}
          onEnded={() => eventRef.current?.({ type: "ended" })}
          onReplay={mode === "preview" ? undefined : () => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })}
        />
      </div>

      <ProgressVine progress={walked} color={g.dark ? "#7E9A6D" : g.land.nearDeep} bloom={g.ribbon} className="z-30" />
      {fields.companion !== "none" ? <Walker kind={fields.companion} g={g} progress={walked} reduce={!!reduce} /> : null}
      <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <Ambience layers={g.ambience} opacity={0.82} />
      </div>
      <SoundToggle audio={audio} locale={data.locale} className={cn(!g.dark && "bg-black/15 text-current")} />
    </div>
  );
}

/* ------------------------------------------------------------------------------- the gate */

function GateSection({
  g,
  s,
  data,
  sign,
  open,
  reduce,
  onOpen,
  hint,
}: {
  g: Garden;
  s: Strings;
  data: TemplateProps<GardenFields>["data"];
  sign?: string;
  open: boolean;
  reduce: boolean;
  onOpen: () => void;
  hint: string;
}) {
  const swing = reduce ? { duration: 0.01 } : { type: "spring" as const, stiffness: 46, damping: 14, mass: 1.1 };
  return (
    <section className="relative flex h-[100cqh] w-full flex-col items-center justify-center overflow-hidden" style={{ background: g.sky }}>
      <SkyLight color={g.dark ? "#F4EDD8" : g.glow} halo={g.glow} moon={g.dark} className="top-[9%] right-[12%] size-[calc(14*var(--k))]" />
      <Land g={g} />
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: g.dark ? 0.24 : 0.34 }} aria-hidden="true" />
      <StickerScatter items={g.stickers} reduce={reduce} className="z-[3]" />

      <div className="relative z-10 flex w-full flex-col items-center px-[calc(6*var(--k))]">
        <motion.p
          className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase"
          style={{ color: g.inkSoft }}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        <motion.h1
          className="mt-[calc(1.4*var(--k))] max-w-[calc(80*var(--k))] text-center text-[calc(6.6*var(--k))] leading-[1.06] text-balance italic [overflow-wrap:anywhere]"
          style={{ fontFamily: POSTER_FONT }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.8 }}
        >
          {data.title || s.coverTitle}
        </motion.h1>

        <div className="relative mt-[calc(13*var(--k))] h-[calc(64*var(--k))] w-[calc(84*var(--k))] max-w-full" style={{ perspective: "1000px" }}>
          <span aria-hidden="true" className="absolute inset-x-[8%] bottom-[-2%] h-[calc(3*var(--k))] rounded-[50%] bg-black/25 blur-[calc(1.6*var(--k))]" />
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 origin-left"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: open ? -96 : 0 }}
            transition={swing}
          >
            <GateLeaf iron={g.iron} heart={g.accent} />
          </motion.div>
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 origin-right"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: open ? 96 : 0 }}
            transition={swing}
          >
            <GateLeaf iron={g.iron} heart={g.accent} style={{ transform: "scaleX(-1)" }} />
          </motion.div>
          <Ivy color={g.land.mid} deep={g.land.nearDeep} className="pointer-events-none absolute -top-[calc(7*var(--k))] -left-[calc(9*var(--k))] z-[4] w-[calc(32*var(--k))]" />
          <Ivy color={g.land.mid} deep={g.land.nearDeep} flip className="pointer-events-none absolute -top-[calc(7*var(--k))] -right-[calc(9*var(--k))] z-[4] w-[calc(32*var(--k))]" />
          <motion.div
            className="absolute -top-[calc(8*var(--k))] left-1/2 z-[5] w-[calc(44*var(--k))] -translate-x-1/2"
            animate={reduce ? undefined : { rotate: [-1.4, 1.4, -1.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <WoodSign text={sign?.trim() || data.recipientName} garden={g} />
          </motion.div>
          <button type="button" onClick={onOpen} aria-label={s.push} className="absolute inset-0 z-[6] rounded-[calc(3*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/70" />
        </div>

        <TapPill tone={g.cover} reduce={reduce} hidden={open} className="mt-[calc(7*var(--k))]">
          {s.push}
        </TapPill>
        <motion.p
          className="absolute -bottom-[calc(12*var(--k))] text-[calc(2.6*var(--k))] tracking-[0.3em] uppercase"
          style={{ color: g.inkSoft }}
          initial={{ opacity: 0 }}
          animate={open ? { opacity: [0, 1, 0.5, 1], y: reduce ? 0 : [0, 4, 0] } : { opacity: 0 }}
          transition={{ delay: 1.2, duration: 2.4, repeat: Infinity }}
          aria-hidden="true"
        >
          {hint}
        </motion.p>
      </div>
    </section>
  );
}

/** Far hills, the hedge, the grass and the path, in the order you see them. */
function Land({ g, className }: { g: Garden; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden="true">
      <LandBand shape="far" color={g.land.far} className="absolute inset-x-0 bottom-[24%] h-[20%]" />
      <LandBand shape="mid" color={g.land.mid} className="absolute inset-x-0 bottom-[14%] h-[18%]" />
      <div className="absolute inset-x-0 bottom-0 h-[16%]" style={{ background: `linear-gradient(180deg, ${g.land.near}, ${g.land.nearDeep})` }} />
      <div
        className="absolute bottom-0 left-1/2 h-[17%] w-[120%] -translate-x-1/2"
        style={{ background: `linear-gradient(180deg, ${g.soil}, ${mix(g.soil, "#000000", 0.18)})`, clipPath: "polygon(43% 0, 57% 0, 78% 100%, 22% 100%)", opacity: 0.95 }}
      />
      <div
        className="absolute inset-x-0 bottom-[13%] h-[calc(11*var(--k))]"
        style={{ backgroundImage: grassTile(g.land.nearDeep, mix(g.land.nearDeep, "#0B1A0C", 0.42)), backgroundRepeat: "repeat-x", backgroundSize: "auto 100%", backgroundPosition: "bottom center" }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- the page it starts on */

function SketchSection({ g, s, name, scroller, reduce }: { g: Garden; s: Strings; name: string; scroller: Scroller; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scroller, target: ref, offset: ["start start", "end end"] });
  const spring = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  const still = useMotionValue(1);
  const draw = reduce ? still : spring;
  const line1 = useTransform(scrollYProgress, [0, 0.1], [0, 1]);
  const line2 = useTransform(scrollYProgress, [0.4, 0.52], [0, 1]);
  const colour = useTransform(scrollYProgress, [0.82, 1], [0, 0.55]);

  return (
    <section ref={ref} className="relative h-[150cqh] w-full">
      <div className="sticky top-0 flex h-[100cqh] w-full flex-col items-center justify-center overflow-hidden" style={{ background: g.paper }}>
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{ background: `repeating-linear-gradient(0deg, ${g.paperRule} 0 1px, transparent 1px calc(7*var(--k)))`, opacity: 0.5 }}
        />
        <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: g.dark ? 0.3 : 0.55 }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[16cqh]" style={{ background: `linear-gradient(180deg, ${g.skyLow}, transparent)` }} aria-hidden="true" />

        <div className="relative z-[2] w-[calc(96*var(--k))] max-w-[92cqw]">
          <p className="text-center text-[calc(2.4*var(--k))] tracking-[0.32em] uppercase" style={{ color: g.inkSoft }}>
            {s.plantedFor} {name}
          </p>
          <motion.p className="mt-[calc(3*var(--k))] text-center text-[calc(5.4*var(--k))] leading-[1.25] italic" style={{ fontFamily: POSTER_FONT, opacity: line1 }}>
            {s.sketch1}
          </motion.p>
          <SketchGarden draw={draw} ink={g.ink} className="mt-[calc(2*var(--k))]" />
          <motion.p
            className="text-center text-[calc(4*var(--k))] leading-[1.3]"
            style={{ fontFamily: "var(--gift-font-hand)", color: g.inkSoft, opacity: line2 }}
          >
            {s.sketch2}
          </motion.p>
        </div>

        <motion.div className="pointer-events-none absolute inset-0 z-[3]" style={{ opacity: colour, background: g.sky }} aria-hidden="true" />
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------- the meadow */

type Planted = { bed: Bed; x: number; height: number; lean: number; at: number; seed: number };

/**
 * A band of flowers across the width of the screen. Positions are percentages and sizes are in
 * --k, so the same bed fills a phone and a laptop instead of being cropped to its middle.
 */
function plant(beds: Bed[], seed: number, count: number, height: [number, number], window: [number, number]): Planted[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return {
      bed: beds[Math.floor(rng() * beds.length)] ?? beds[0],
      x: 2 + t * 96 + (rng() - 0.5) * 7,
      height: height[0] + rng() * (height[1] - height[0]),
      lean: (rng() - 0.5) * 30,
      at: window[0] + t * (window[1] - window[0]) + rng() * 0.05,
      seed: Math.floor(rng() * 9999),
    };
  });
}

function MeadowFlower({ item, uid, stem, width, progress }: { item: Planted; uid: string; stem: string; width: number; progress: MotionValue<number> }) {
  const grow = useTransform(progress, [item.at, item.at + 0.14], [0.05, 1], { clamp: true });
  const sway = `gd-sway ${(5.4 + (item.seed % 34) / 10).toFixed(1)}s ease-in-out ${(item.seed % 17) / 10}s infinite`;
  return (
    <motion.div className="absolute bottom-0" style={{ left: `${item.x.toFixed(1)}%`, width: `calc(${width}*var(--k))`, x: "-50%", scale: grow, opacity: grow, originY: 1 }} aria-hidden="true">
      <div className="gd-anim origin-bottom" style={{ animation: sway }}>
        <svg viewBox="-70 -306 140 320" className="block w-full overflow-visible">
          <Stem bed={item.bed} uid={uid} seed={item.seed} height={item.height} lean={item.lean} stem={stem} />
        </svg>
      </div>
    </motion.div>
  );
}

function MeadowBand({ items, uid, stem, width, progress, className, style }: { items: Planted[]; uid: string; stem: string; width: number; progress: MotionValue<number>; className?: string; style?: MotionStyle }) {
  return (
    <motion.div className={cn("pointer-events-none absolute inset-x-0", className)} style={style}>
      {items.map((item, i) => (
        <MeadowFlower key={`${uid}-${i}`} item={item} uid={`${uid}${i}`} stem={stem} width={width} progress={progress} />
      ))}
    </motion.div>
  );
}

function MeadowSection({ g, s, beds, seed, scroller, reduce }: { g: Garden; s: Strings; beds: Bed[]; seed: number; scroller: Scroller; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scroller, target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.35 });
  const still = useMotionValue(1);
  const grow = reduce ? still : p;
  const farY = useTransform(p, [0, 1], reduce ? ["0%", "0%"] : ["7%", "-2%"]);
  const midY = useTransform(p, [0, 1], reduce ? ["0%", "0%"] : ["12%", "-4%"]);
  const nearY = useTransform(p, [0, 1], reduce ? ["0%", "0%"] : ["18%", "-7%"]);
  const titleO = useTransform(scrollYProgress, [0.04, 0.16, 0.76, 0.94], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0.04, 0.94], reduce ? [0, 0] : [26, -34]);
  // The first band is already up when they arrive; the rest opens under them as they go.
  const back = useMemo(() => plant(beds, seed, 14, [96, 150], [-0.2, 0.18]), [beds, seed]);
  const middle = useMemo(() => plant(beds, seed + 7, 11, [140, 195], [0.1, 0.46]), [beds, seed]);
  const front = useMemo(() => plant(beds, seed + 13, 6, [140, 190], [0.3, 0.72]), [beds, seed]);

  return (
    <section ref={ref} className="relative h-[240cqh] w-full">
      <div className="sticky top-0 h-[100cqh] w-full overflow-hidden" style={{ background: g.sky }}>
        <SkyLight color={g.dark ? "#F4EDD8" : g.glow} halo={g.glow} moon={g.dark} className="top-[8%] left-[14%] size-[calc(12*var(--k))]" />
        <motion.div className="absolute inset-x-0 bottom-[34%] h-[20%]" style={{ y: farY }}>
          <LandBand shape="far" color={g.land.far} className="h-full" />
        </motion.div>
        <motion.div className="absolute inset-x-0 bottom-[22%] h-[20%]" style={{ y: midY }}>
          <LandBand shape="mid" color={g.land.mid} className="h-full" />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: `linear-gradient(180deg, ${g.land.near}, ${g.land.nearDeep})` }} aria-hidden="true" />

        <MeadowBand items={back} uid="gb" stem={mix(g.land.nearDeep, "#FFFFFF", 0.12)} width={19} progress={grow} className="bottom-[30%] h-[calc(40*var(--k))]" style={{ y: farY }} />
        <MeadowBand items={middle} uid="gm" stem="#5E7A4C" width={30} progress={grow} className="bottom-[16%] h-[calc(54*var(--k))]" style={{ y: midY }} />
        <MeadowBand items={front} uid="gf" stem="#4C6A3E" width={52} progress={grow} className="bottom-[1%] h-[calc(68*var(--k))]" style={{ y: nearY }} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(20*var(--k))]"
          style={{ backgroundImage: grassTile(g.land.nearDeep, mix(g.land.nearDeep, "#0B1A0C", 0.42)), backgroundRepeat: "repeat-x", backgroundSize: "auto 100%", backgroundPosition: "bottom center" }}
          aria-hidden="true"
        />

        <motion.p
          className="absolute inset-x-0 top-[21%] z-[4] mx-auto max-w-[calc(84*var(--k))] px-[calc(6*var(--k))] text-center text-[calc(7*var(--k))] leading-[1.12] text-balance italic"
          style={{ fontFamily: POSTER_FONT, opacity: titleO, y: titleY, color: g.ink, textShadow: g.dark ? "0 2px 18px rgba(0,0,0,.5)" : "0 2px 16px rgba(255,255,255,.55)" }}
        >
          {s.meadow}
        </motion.p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- the photo arbor */

function ArborSection({ g, s, photos, scroller, seed }: { g: Garden; s: Strings; photos: GiftPhoto[]; scroller: Scroller; seed: number }) {
  const items = useMemo(() => {
    const rng = mulberry32(seed + 3);
    return photos.map((photo, i) => ({
      photo,
      rotate: (rng() - 0.5) * 7,
      tape: g.tapes[i % g.tapes.length],
      side: i % 2 === 0 ? "start" : "end",
      sprig: i % 3 === 0,
    }));
  }, [photos, seed, g.tapes]);
  const wall = wash(g);

  return (
    <section className="relative w-full overflow-hidden py-[calc(18*var(--k))]" style={{ background: wall }}>
      <Trellis color={g.dark ? "rgba(255,255,255,.07)" : "rgba(90,66,40,.12)"} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[14cqh]" style={{ background: `linear-gradient(180deg, ${g.land.nearDeep}, transparent)` }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: g.dark ? 0.24 : 0.4 }} aria-hidden="true" />
      <Ivy color={g.land.mid} deep={g.land.nearDeep} className="pointer-events-none absolute top-[calc(4*var(--k))] -left-[calc(4*var(--k))] w-[calc(40*var(--k))] opacity-90" />
      <Ivy color={g.land.mid} deep={g.land.nearDeep} flip className="pointer-events-none absolute right-[calc(-4*var(--k))] bottom-[calc(6*var(--k))] w-[calc(40*var(--k))] opacity-90" />

      <h2
        className="relative z-[2] mx-auto max-w-[calc(74*var(--k))] px-[calc(6*var(--k))] text-center text-[calc(5.6*var(--k))] leading-[1.15] text-balance italic"
        style={{ fontFamily: POSTER_FONT, color: g.ink }}
      >
        {s.arbor}
      </h2>

      <div className="relative z-[2] mx-auto mt-[calc(10*var(--k))] flex max-w-[92cqw] flex-col gap-[calc(12*var(--k))]" style={{ width: "max(calc(124 * var(--k)), 66cqw)" }}>
        {items.map((item, i) => (
          <motion.div
            key={item.photo.id}
            className={cn("max-w-[78%]", item.side === "start" ? "self-start" : "self-end")}
            style={{ width: "max(calc(56 * var(--k)), 30cqw)" }}
            initial={{ opacity: 0, y: 44, rotate: item.rotate * 2.4 }}
            whileInView={{ opacity: 1, y: 0, rotate: item.rotate }}
            viewport={{ root: scroller, once: true, amount: 0.35 }}
            transition={{ type: "spring", stiffness: 70, damping: 15, delay: (i % 2) * 0.06 }}
          >
            <PressedCard src={item.photo.url} alt={item.photo.alt} caption={item.photo.caption} garden={g} tape={item.tape} sprig={item.sprig} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------- the greenhouse */

function GreenhouseSection({ g, s, data, mode, scroller }: { g: Garden; s: Strings; data: TemplateProps<GardenFields>["data"]; mode: TemplateProps["mode"]; scroller: Scroller }) {
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const letterRef = useRef<HTMLDivElement>(null);
  const reading = useInView(letterRef, { root: scroller, once: true, amount: 0.25 }) || mode === "preview";

  return (
    <section className="relative w-full overflow-hidden px-[calc(6*var(--k))] py-[calc(20*var(--k))]" style={{ background: `linear-gradient(180deg, ${wash(g, 0.62)}, ${wash(g, 0.86)} 60%, ${wash(g, 0.7)})` }}>
      <GreenhouseGlass garden={g} />
      <GreenhouseRoof garden={g} className="pointer-events-none absolute inset-x-0 top-0 h-[calc(46*var(--k))]" />
      <Ivy color={g.land.mid} deep={g.land.nearDeep} className="pointer-events-none absolute top-[calc(36*var(--k))] left-[calc(2*var(--k))] w-[calc(36*var(--k))] rotate-[8deg] opacity-80" />
      <Ivy color={g.land.mid} deep={g.land.nearDeep} flip className="pointer-events-none absolute top-[calc(36*var(--k))] right-[calc(2*var(--k))] w-[calc(36*var(--k))] -rotate-[8deg] opacity-80" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[18cqh]" style={{ background: `linear-gradient(180deg, ${wash(g)}, transparent)` }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: g.dark ? 0.2 : 0.34 }} aria-hidden="true" />

      <p className="relative z-[2] mt-[calc(30*var(--k))] text-center text-[calc(2.5*var(--k))] tracking-[0.32em] uppercase" style={{ color: g.inkSoft }}>
        {s.greenhouse}
      </p>

      <div
        ref={letterRef}
        className="relative z-[2] mx-auto mt-[calc(8*var(--k))] max-w-full px-[calc(7*var(--k))] py-[calc(9*var(--k))]"
        style={{
          width: "max(calc(104 * var(--k)), 44cqw)",
          background: g.card,
          color: g.cardInk,
          boxShadow: `0 calc(2.4*var(--k)) calc(6*var(--k)) rgba(30,20,10,.26), inset 0 0 0 1px ${g.dark ? "rgba(255,255,255,.08)" : "rgba(90,66,40,.1)"}`,
          backgroundImage: `${PAPER_GRAIN}`,
          backgroundBlendMode: g.cardDark ? "overlay" : "multiply",
        }}
      >
        <span
          aria-hidden="true"
          className="absolute -top-[calc(2.4*var(--k))] left-1/2 h-[calc(4.8*var(--k))] w-[calc(22*var(--k))] -translate-x-1/2 rotate-1"
          style={{ background: g.tapes[0], clipPath: "polygon(0 10%, 4% 0, 96% 8%, 100% 90%, 95% 100%, 3% 92%)" }}
        />
        {reading ? (
          <MessageBody data={data} blocks={blocks} mode={mode} tone={g.cardDark ? "dark" : "light"} face="serif" accent={g.accent} />
        ) : (
          <div className="min-h-[calc(56*var(--k))]" aria-hidden="true" />
        )}
      </div>

      {data.video ? (
        <motion.div
          className="relative z-[2] mx-auto mt-[calc(12*var(--k))] w-[calc(96*var(--k))] max-w-full p-[calc(2.2*var(--k))]"
          style={{ background: g.matte, boxShadow: `0 calc(1.8*var(--k)) calc(4.4*var(--k)) rgba(30,20,10,.24)` }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ root: scroller, once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <GiftVideo video={data.video} locale={data.locale} rounded="rounded-none" />
        </motion.div>
      ) : null}

      {data.countdown ? (
        <motion.div
          className="relative z-[2] mx-auto mt-[calc(12*var(--k))] flex justify-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ root: scroller, once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          <SeedPacket title={s.counting} garden={g}>
            <Countdown countdown={data.countdown} locale={data.locale} tone={g.cardDark ? "dark" : "light"} />
          </SeedPacket>
        </motion.div>
      ) : null}

      {data.surprise ? (
        <motion.div
          className="relative z-[2] mx-auto mt-[calc(12*var(--k))] w-[calc(96*var(--k))] max-w-full"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ root: scroller, once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-[calc(2.4*var(--k))] text-center text-[calc(2.4*var(--k))] tracking-[0.3em] uppercase" style={{ color: g.inkSoft }}>
            {s.hidden}
          </p>
          <BellJar garden={g}>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={g.cardDark ? "dark" : "light"} />
          </BellJar>
        </motion.div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------- the bouquet, and the end */

function BouquetSection({
  g,
  s,
  data,
  beds,
  seed,
  tag,
  scroller,
  onReact,
  onMakeOne,
  onReplay,
  onEnded,
}: {
  g: Garden;
  s: Strings;
  data: TemplateProps<GardenFields>["data"];
  beds: Bed[];
  seed: number;
  tag?: string;
  scroller: Scroller;
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
  onEnded: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEnded();
        }
      },
      { root: scroller.current, threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEnded, scroller]);

  return (
    <section
      className="relative w-full overflow-hidden px-[calc(6*var(--k))] pt-[calc(18*var(--k))] pb-[calc(10*var(--k))]"
      style={{ background: `linear-gradient(180deg, ${wash(g, 0.7)}, ${g.skyLow} 46%, ${g.land.near})` }}
    >
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: g.dark ? 0.22 : 0.36 }} aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(14*var(--k))]"
        style={{ backgroundImage: grassTile(g.land.nearDeep, mix(g.land.nearDeep, "#0B1A0C", 0.42)), backgroundRepeat: "repeat-x", backgroundSize: "auto 100%", backgroundPosition: "bottom center" }}
        aria-hidden="true"
      />

      <motion.div
        className="relative z-[2] mx-auto max-w-full"
        style={{ width: "max(calc(88 * var(--k)), 38cqw)" }}
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ root: scroller, once: true, amount: 0.3 }}
        transition={{ type: "spring", stiffness: 60, damping: 14 }}
      >
        <WrappedBouquet beds={beds} garden={g} uid="gd-end" seed={seed} className="w-full drop-shadow-[0_18px_26px_rgba(40,25,20,0.22)]" />
      </motion.div>

      <motion.div
        className="relative z-[3] mx-auto -mt-[calc(6*var(--k))] w-[calc(58*var(--k))] max-w-[86cqw] px-[calc(4*var(--k))] py-[calc(3.4*var(--k))] text-center"
        style={{
          background: g.tagPaper,
          color: g.tagInk,
          backgroundImage: PAPER_GRAIN,
          clipPath: "polygon(12% 0, 88% 0, 100% 22%, 100% 100%, 0 100%, 0 22%)",
          filter: "drop-shadow(0 calc(.8*var(--k)) calc(1.6*var(--k)) rgba(50,30,18,.3))",
        }}
        initial={{ opacity: 0, y: 18, rotate: -3 }}
        whileInView={{ opacity: 1, y: 0, rotate: -1.4 }}
        viewport={{ root: scroller, once: true, amount: 0.5 }}
        transition={{ type: "spring", stiffness: 90, damping: 15, delay: 0.25 }}
      >
        <span aria-hidden="true" className="absolute top-[calc(1.2*var(--k))] left-1/2 size-[calc(1.8*var(--k))] -translate-x-1/2 rounded-full" style={{ background: "rgba(70,45,30,.3)" }} />
        <p className="mt-[calc(1.6*var(--k))] text-[calc(4.6*var(--k))] leading-[1.25] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)" }}>
          {tag?.trim() || s.forName.replace("{name}", data.recipientName)}
        </p>
      </motion.div>

      <p className="relative z-[2] mx-auto mt-[calc(8*var(--k))] max-w-[calc(72*var(--k))] text-center text-[calc(4.4*var(--k))] leading-[1.3] italic" style={{ fontFamily: POSTER_FONT, color: g.ink }}>
        {s.bouquet}
      </p>

      <div ref={endRef} className="relative z-[2] mt-[calc(12*var(--k))]">
        <EndScreen data={data} tone={g.dark ? "dark" : "light"} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
      </div>
    </section>
  );
}

/** Whoever came along: keeps pace with the scroll, drifting from side to side. */
function Walker({ kind, g, progress, reduce }: { kind: "butterfly" | "bee" | "cat"; g: Garden; progress: MotionValue<number>; reduce: boolean }) {
  const top = useTransform(progress, [0, 1], ["19%", "68%"]);
  const drift = useTransform(progress, [0, 0.25, 0.5, 0.75, 1], reduce ? [0, 0, 0, 0, 0] : [0, -54, 12, -40, 8]);
  return (
    <motion.div
      className="pointer-events-none absolute right-[calc(5*var(--k))] z-30 w-[calc(14*var(--k))]"
      style={{ top, x: drift }}
      aria-hidden="true"
    >
      <div className={cn("gd-anim", kind === "cat" && "origin-bottom")} style={reduce ? undefined : { animation: kind === "cat" ? "gd-sway-slow 5s ease-in-out infinite" : "gd-sway 3.4s ease-in-out infinite" }}>
        <Companion kind={kind} garden={g} />
      </div>
    </motion.div>
  );
}
