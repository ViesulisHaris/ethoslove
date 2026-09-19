"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { MemeSticker } from "../_shared/memes/MemeSticker";
import { buzz, playSlap, playTada } from "../_shared/memes/sounds";
import { BOMB_KEYFRAMES, LabelStrip, SURFACES, type SurfaceId } from "./art";
import { clamp, planDrops, restingSpot, sideMargin, stickerWidth, type Drop } from "./plan";
import { fieldsSchema, type StickerBombFields } from "./schema";

type Copy = { slap: string; prompt: string; tap: string; left: string; leftOne: string; open: string; skip: string; playing: string; house: string[] };

const S: Record<"en" | "es", Copy> = {
  en: { slap: "Slap a sticker on the page", prompt: "{name}, slap some stickers", tap: "tap anywhere", left: "{n} to go", leftOne: "one more", open: "read the card", skip: "skip to the card", playing: "now playing", house: ["certified menace", "do not perceive me", "emotional support human", "ur problem now", "10/10 no notes", "handle with care"] },
  es: { slap: "Pega un sticker en la página", prompt: "{name}, pega unos stickers", tap: "toca donde quieras", left: "faltan {n}", leftOne: "uno más", open: "lee la tarjeta", skip: "ir a la tarjeta", playing: "sonando", house: ["amenaza certificada", "no me percibas", "humano de apoyo emocional", "ahora eres mi problema", "10/10 sin notas", "frágil"] },
};

type Placed = { drop: Drop; x: number; y: number };
type Stage = "slap" | "read";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<StickerBombFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const surfaceId: SurfaceId = fields.surface in SURFACES ? fields.surface : "mat";
  const surface = SURFACES[surfaceId];
  const seed = hashString(`${data.recipientName}|${data.senderName}|sticker-bomb`);
  const photos = useMemo(() => data.photos.slice(0, 6), [data.photos]);
  const labels = useMemo(() => (fields.labels.some((l) => l.trim()) ? fields.labels : s.house), [fields.labels, s.house]);
  const drops = useMemo(() => planDrops(fields.pack, photos.length, labels, seed), [fields.pack, photos.length, labels, seed]);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const resting = useMemo(() => drops.map((drop, i) => ({ drop, ...restingSpot(i, drops.length, seed) })), [drops, seed]);

  const [stage, setStage] = useState<Stage>(preview ? "read" : "slap");
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const started = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  const [pageScope, animatePage] = useAnimate<HTMLDivElement>();

  // The editor's still frame shows the page already bombed, so a change of pack or label shows at once.
  const shown = preview ? resting : placed;
  const remaining = drops.length - placed.length;
  const full = remaining <= 0;

  const begin = () => {
    if (started.current) return;
    started.current = true;
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  const slap = (e: MouseEvent<HTMLButtonElement>) => {
    if (stage !== "slap" || full) return;
    begin();
    const i = placed.length;
    const box = rootRef.current?.getBoundingClientRect();
    // A key press has no finger to follow (detail is 0): the sticker takes its resting spot.
    const next0 = drops[i];
    const margin = sideMargin(next0);
    const spot = box && e.detail !== 0 ? { x: clamp(((e.clientX - box.left) / box.width) * 100, margin, 100 - margin), y: clamp(((e.clientY - box.top) / box.height) * 100, 7, 88) } : restingSpot(i, drops.length, seed);
    playSlap(audio.muted);
    buzz(12);
    if (!reduce && pageScope.current) void animatePage(pageScope.current, { x: [0, -2, 2, 0], y: [0, 2, -1, 0] }, { duration: 0.16 });
    const next = [...placed, { drop: drops[i], ...spot }];
    setPlaced(next);
    eventRef.current?.({ type: "progress", pct: Math.round((next.length / drops.length) * 60) });
    if (next.length === drops.length) {
      setBurst((b) => b + 1);
      window.setTimeout(() => playTada(audio.muted), 160);
    }
  };

  const openCard = () => {
    begin();
    setStage("read");
  };

  const replay = () => {
    setStage("slap");
    setPlaced([]);
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, calc(1cqh / 1.78))" } as CSSProperties;
  const prompt = (fields.prompt?.trim() || s.prompt).replace("{name}", data.recipientName);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ background: surface.ground, color: surface.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{BOMB_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: surface.pattern, ...(surface.patternSize ? { backgroundSize: surface.patternSize } : {}) }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: surface.dark ? 0.35 : 0.5 }} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={surface.ambience} opacity={stage === "read" ? 0.4 : 0.8} />
      </div>

      <div ref={pageScope} key={run} className="absolute inset-0">
        {/* what the empty page says, fading as it fills */}
        <motion.div className="pointer-events-none absolute inset-x-[8%] top-[34%] z-[3] flex flex-col items-center text-center" animate={{ opacity: preview ? 0 : Math.max(0, 1 - shown.length / 4) }} transition={{ duration: 0.3 }}>
          <span aria-hidden="true" className="sb-pulse mb-[calc(4*var(--p))] block h-[calc(22*var(--p))] w-[calc(22*var(--p))] rounded-full border-[calc(.6*var(--p))] border-dashed" style={{ borderColor: surface.soft }} />
          <p className="text-[calc(8.4*var(--p))] leading-[1.05]" style={{ fontFamily: SCRIPT_FONT }}>
            {prompt}
          </p>
          <p className="mt-[calc(2.4*var(--p))] text-[calc(2.8*var(--p))] font-bold tracking-[0.3em] uppercase" style={{ color: surface.soft }}>
            {s.tap}
          </p>
        </motion.div>

        {!preview ? <button type="button" data-surface="" aria-label={s.slap} disabled={stage !== "slap" || full} onClick={slap} className="absolute inset-0 z-[4] cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:ring-inset disabled:cursor-default" /> : null}

        {shown.map((item, i) => (
          <Slapped key={i} item={item} index={i} photos={photos} still={preview || reduce} jiggle={full && stage === "slap" && !reduce} />
        ))}
      </div>

      <AnimatePresence>
        {stage === "slap" ? (
          <motion.div key="bar" className="absolute inset-x-0 bottom-[max(2.4cqh,env(safe-area-inset-bottom))] z-[35] flex flex-col items-center gap-[calc(1.2*var(--k))] px-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reduce ? 0 : 0.5 }}>
            {full ? (
              <motion.button type="button" onClick={openCard} className="rounded-full px-[calc(6*var(--k))] py-[calc(2.4*var(--k))] text-[calc(3.4*var(--k))] font-bold tracking-[0.2em] uppercase shadow-[0_10px_30px_-8px_rgba(0,0,0,.6)] outline-none focus-visible:ring-4 focus-visible:ring-white/70" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }} initial={{ scale: 0.6 }} animate={{ scale: reduce ? 1 : [1, 1.07, 1] }} transition={{ scale: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }}>
                {s.open}
              </motion.button>
            ) : (
              <>
                <p aria-live="polite" className="pointer-events-none rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3*var(--k))] font-semibold tracking-[0.2em] uppercase backdrop-blur-sm" style={{ background: "rgba(255,255,255,.9)", color: "#26222A", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(20,10,20,.3)" }}>
                  {remaining === 1 ? s.leftOne : s.left.replace("{n}", String(remaining))}
                </p>
                <button type="button" onClick={openCard} className="rounded-full px-3 py-1 text-[calc(2.6*var(--k))] tracking-[0.14em] underline decoration-dotted underline-offset-4 opacity-85 outline-none focus-visible:ring-2" style={{ color: surface.ink }}>
                  {s.skip}
                </button>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Confetti burst={burst} colors={surface.confetti} count={180} origin={{ x: 0.5, y: 0.45 }} className="pointer-events-none absolute inset-0 z-[36]" />

      <AnimatePresence>
        {stage === "read" ? <CardSheet key="sheet" data={data} mode={mode} blocks={blocks} s={s} t={t} reduce={reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      </AnimatePresence>

      {audio.hasMusic && mode !== "preview" ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Slapped({ item, index, photos, still, jiggle }: { item: Placed; index: number; photos: GiftPhoto[]; still: boolean; jiggle: boolean }) {
  const { drop } = item;
  const photo = drop.kind === "photo" ? photos[drop.photo] : undefined;
  if (drop.kind === "photo" && !photo) return null;
  const width = drop.kind === "meme" ? stickerWidth(drop.meme, drop.size) : drop.size;
  return (
    <div className="pointer-events-none absolute" data-slapped={index} style={{ left: `${item.x}%`, top: `${item.y}%`, zIndex: 6 + index, translate: "-50% -50%" }}>
      {!still ? <span aria-hidden="true" className="sb-ring absolute top-1/2 left-1/2 -z-[1] block h-[calc(30*var(--p))] w-[calc(30*var(--p))] -translate-x-1/2 -translate-y-1/2 rounded-full border-[calc(.8*var(--p))] border-white/80" /> : null}
      <motion.div className={cn("relative", jiggle && "sb-jiggle")} style={{ width: `calc(${width} * var(--p))`, animationDelay: `${(index % 5) * 0.06}s` }} initial={still ? false : { scale: 2.4, opacity: 0, rotate: drop.rotate - 28 }} animate={{ scale: 1, opacity: 1, rotate: drop.rotate }} transition={{ type: "spring", stiffness: 520, damping: 21, mass: 0.7 }}>
        {drop.kind === "meme" ? (
          <MemeSticker id={drop.meme} width="100%" />
        ) : photo ? (
          <div className="bg-[#FFFDF8] p-[calc(1.4*var(--p))] pb-[calc(4.6*var(--p))] shadow-[0_calc(1*var(--p))_calc(2.2*var(--p))_rgba(20,10,15,.45)]">
            <div className="aspect-square overflow-hidden bg-[#1A1716]">
              <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" />
            </div>
          </div>
        ) : null}
        {drop.kind === "meme" && drop.label ? (
          <span className="absolute top-[88%] left-1/2 z-[1] block" style={{ translate: "-50% 0", rotate: `${-drop.rotate + (index % 2 ? 4 : -5)}deg` }}>
            <LabelStrip>{drop.label}</LabelStrip>
          </span>
        ) : null}
      </motion.div>
    </div>
  );
}

function CardSheet({ data, mode, blocks, s, t, reduce, onEvent, onReact, onMakeOne, onReplay }: { data: TemplateProps<StickerBombFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; s: Copy; t: ReturnType<typeof useGiftStrings>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);

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

  return (
    <motion.div className="absolute inset-0 z-[40] overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={reduce ? { y: 0 } : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%", transition: { duration: 0.35 } }} transition={{ type: "spring", stiffness: 64, damping: 18 }}>
      <div className="flex min-h-full flex-col">
        <div className="shrink-0" style={{ height: mode === "preview" ? "min(58cqh, 540px)" : "min(26cqh, 280px)" }} />
        <div className="relative mx-auto w-[min(94cqw,600px)] flex-1 rounded-t-[calc(4*var(--k))] bg-[#FFFDF8] px-[calc(5*var(--k))] pt-[calc(9*var(--k))] pb-[calc(72px+env(safe-area-inset-bottom))] text-[#2A2622] shadow-[0_-24px_60px_-20px_rgba(0,0,0,.55)]" style={{ backgroundImage: PAPER_GRAIN }}>
          <MemeSticker id="whiskers" width="calc(20*var(--k))" className="absolute -top-[calc(11*var(--k))] left-[calc(4*var(--k))] -rotate-6" />
          <MemeSticker id="shark-baby" width="calc(14*var(--k))" className="absolute -top-[calc(12*var(--k))] right-[calc(5*var(--k))] rotate-6" />
          <article className="relative">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
          </article>

          {data.music?.title ? (
            <p className="mt-[calc(6*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.2em] uppercase opacity-55">
              {s.playing} · {data.music.title}
              {data.music.artist ? ` — ${data.music.artist}` : ""}
            </p>
          ) : null}

          {data.countdown ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] bg-[#F3E9D8] p-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundImage: PAPER_GRAIN }}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}

          {data.surprise ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] bg-[#F3E9D8] px-[calc(4*var(--k))] pt-[calc(5*var(--k))] pb-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundImage: PAPER_GRAIN }}>
              <p className="mb-[calc(3*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}

          <div ref={endRef} className="mt-[calc(8*var(--k))]">
            <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
