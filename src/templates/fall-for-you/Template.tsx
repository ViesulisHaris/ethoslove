"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { appleMusicTrackUrl, backgroundMusic, isCatalogPreview } from "@/lib/gift/music";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString, mulberry32 } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { FitName } from "../_shared/FitName";
import { buzz } from "../_shared/synth";
import { PAPER_GRAIN, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScrollHint, Tape, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard } from "../_shared/collage/cards";
import { gingham } from "../_shared/collage/paper";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import type { ScrapId } from "../_shared/collage/scraps";
import { Acorn, Candle, KraftTag, LetterBlocks, PatchworkPumpkin, RecipeCard, Steam, WoodHeart } from "./art";
import { arrangePhotos, BLOCKS_AT, HERO_DECO, HERO_HEIGHT, HERO_SPOTS, LOOKS, NOTE_SPOTS, SCROLL_AT, type Deco, type Look, type LookId } from "./looks";
import { playLeaf, playStrike, playWarm } from "./sounds";
import { fieldsSchema, type FallForYouFields } from "./schema";

type Copy = { tap: string; for: string; from: string; notes: string; tag: string; recipe: string; note: string; fallback: string; tapAnywhere: string; scroll: string; pause: string; play: string };

const S: Record<"en" | "es", Copy> = {
  en: { tap: "tap to light the candle", for: "for", from: "from", notes: "notes of pumpkin, cinnamon & you", tag: "fall for you", recipe: "recipe for us", note: "one blanket, two warm drinks, you and me, every autumn", fallback: "FALL", tapAnywhere: "tap to make a leaf fall", scroll: "scroll", pause: "Pause the song", play: "Play the song" },
  es: { tap: "toca para encender la vela", for: "para", from: "de", notes: "notas de calabaza, canela y tú", tag: "otoño contigo", recipe: "receta para nosotros", note: "una manta, dos chocolates calientes, tú y yo, cada otoño", fallback: "OTOÑO", tapAnywhere: "toca y caerá una hoja", scroll: "desliza", pause: "Pausar la canción", play: "Reproducir la canción" },
};

/** covered: the dark room. lit: the flame catches and the room warms. leaving: the candle goes. open: the cover is gone. */
type Stage = "covered" | "lit" | "leaving" | "open";

/** From the tap: when the candle and table go, when the page comes in, when the cover is removed. */
const LEAVE_AT = 900;
const REVEAL_AT = 1150;
const OPEN_AT = 1700;
type Data = TemplateProps<FallForYouFields>["data"];

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "gingham";
};

/** The page: the look's colour, its gingham, and paper grain over both. */
const wallStyle = (look: Look): CSSProperties => {
  const check = gingham(look.check, "calc(5*var(--p))");
  return { backgroundColor: look.wall, backgroundImage: `${PAPER_GRAIN}, ${check.backgroundImage}`, backgroundSize: `auto, ${check.backgroundSize}, ${check.backgroundSize}` };
};

/** What the blocks spell: what the sender wrote, or the name if it fits on a shelf, or the season. */
const blockWord = (fields: FallForYouFields, name: string, fallback: string): string => {
  const own = fields.blocks?.trim();
  if (own) return own;
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first && [...first].length <= 10 ? first : fallback;
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<FallForYouFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const look = LOOKS[readLook(data.fields)];
  const seed = hashString(`${data.recipientName}|${data.senderName}|fall-for-you`);

  const [stage, setStage] = useState<Stage>(preview ? "open" : "covered");
  const [revealed, setRevealed] = useState(preview);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const light = () => {
    if (stage !== "covered") return;
    void audio.start();
    playStrike(audio.muted);
    window.setTimeout(() => playWarm(audio.muted), reduce ? 0 : 380);
    buzz(14);
    eventRef.current?.({ type: "started" });
    setStage("lit");
    window.setTimeout(() => setStage("leaving"), reduce ? 80 : LEAVE_AT);
    // The page comes in as the candle goes, so it assembles on a warm wall, not behind the dark.
    window.setTimeout(() => setRevealed(true), reduce ? 120 : REVEAL_AT);
    window.setTimeout(
      () => {
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 260 : OPEN_AT,
    );
  };

  const replay = () => {
    setStage("covered");
    setRevealed(false);
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ color: look.ink, fontFamily: "var(--gift-font-body)", ...wallStyle(look), ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.7} />
      </div>
      {revealed ? <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} seed={seed} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {stage !== "open" ? <Covered key={`covered-${run}`} look={look} s={s} data={data} stage={stage} reduce={reduce} onTap={light} /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Covered({ look, s, data, stage, reduce, onTap }: { look: Look; s: Copy; data: Data; stage: Stage; reduce: boolean; onTap: () => void }) {
  const waiting = stage === "covered";
  return (
    <div className={waiting ? "absolute inset-0 z-20" : "pointer-events-none absolute inset-0 z-20"}>
      <CoverScene look={look} s={s} name={data.recipientName} sender={data.senderName} stage={stage} reduce={reduce} />
      {waiting ? <button type="button" onClick={onTap} aria-label={s.tap} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-white/50 focus-visible:ring-inset" /> : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[28] flex justify-center">
        <TapPill tone={{ page: look.room.dark, glow: [look.room.glow, look.room.glow], accent: look.accent, dark: true }} hidden={!waiting} reduce={reduce}>
          {s.tap}
        </TapPill>
      </div>
    </div>
  );
}

/**
 * The first screen: a dark room, a gingham cloth on the table, a few leaves on it and the jar candle
 * with their name on its label. Lit, the room warms to the page underneath. Drawn still and unlit, it
 * is the Classic tile in the editor's cover picker.
 */
function CoverScene({ look, s, name, sender, stage, reduce }: { look: Look; s: Copy; name: string; sender: string; stage: Stage; reduce: boolean }) {
  const lit = stage !== "covered";
  const leaving = stage === "leaving" || stage === "open";
  const cloth = gingham(look.check.replace(/[\d.]+\)$/, ".55)"), "calc(5*var(--p))");
  return (
    <>
      {/* the dark, which the flame lifts */}
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(70% 55% at 50% 52%, color-mix(in srgb, ${look.room.dark} 70%, #6A3A1A), ${look.room.dark} 75%)` }} initial={false} animate={{ opacity: lit ? 0 : 1 }} transition={{ duration: reduce ? 0.2 : 0.9, delay: reduce ? 0 : 0.3, ease: "easeInOut" }} />
      {lit && !reduce ? (
        <motion.div aria-hidden="true" className="pointer-events-none absolute top-[44cqh] left-1/2 h-[160cqh] w-[160cqh] rounded-full" style={{ x: "-50%", y: "-50%", background: `radial-gradient(circle, ${look.room.glow}, transparent 60%)` }} initial={{ scale: 0.1, opacity: 0.9 }} animate={{ scale: 1.2, opacity: [0.9, 0.7, 0] }} transition={{ duration: 1.4, ease: "easeOut" }} />
      ) : null}

      {/* the table, with its gingham cloth and a few leaves on it, and the candle on top */}
      <motion.div className="absolute inset-x-0 bottom-0 h-[36cqh]" initial={false} animate={leaving ? { y: "110%" } : { y: 0 }} transition={{ duration: reduce ? 0.2 : 0.55, ease: [0.5, 0, 0.8, 0.4] }}>
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: look.wall, ...cloth, boxShadow: "inset 0 calc(3*var(--p)) calc(5*var(--p)) rgba(0,0,0,.35)" }} />
        <motion.div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(${look.room.dark}D9, ${look.room.dark}99)` }} initial={false} animate={{ opacity: lit ? 0 : 1 }} transition={{ duration: 0.9, delay: 0.3 }} />
        <div aria-hidden="true" className="absolute top-[18%] left-[calc(4*var(--p))] w-[calc(22*var(--p))] -rotate-[24deg]">
          <Scrap id={look.leaves[0]} eager />
        </div>
        <div aria-hidden="true" className="absolute top-[34%] right-[calc(5*var(--p))] w-[calc(19*var(--p))] rotate-[30deg]">
          <Scrap id={look.leaves[1]} eager />
        </div>
      </motion.div>

      <motion.div className="absolute bottom-[calc(36cqh-calc(4*var(--p)))] left-1/2 z-[10] w-[calc(50*var(--p))]" style={{ x: "-50%" }} initial={reduce ? false : { y: "8%", opacity: 0 }} animate={leaving ? { y: "160%", opacity: 1 } : { y: 0, opacity: 1 }} transition={leaving ? { duration: reduce ? 0.2 : 0.6, ease: [0.5, 0, 0.8, 0.4] } : { duration: 0.6, delay: 0.1 }}>
        <Candle lit={lit} still={reduce} label={{ paper: "#FFF8EC", line: look.tag.string }}>
          <div className="w-full min-w-0" style={{ color: "#3B2416" }}>
            <p className="text-[calc(1.9*var(--p))] font-semibold tracking-[0.34em] uppercase opacity-60">{s.for}</p>
            <FitName as="p" className="text-[calc(7.2*var(--p))] leading-[1.1]" style={{ fontFamily: SCRIPT_FONT }}>
              {name}
            </FitName>
            <FitName as="p" min={0.55} className="mt-[calc(.3*var(--p))] text-[calc(2.1*var(--p))] leading-[1.3] italic opacity-75" style={{ fontFamily: "var(--gift-font-hand)" }}>
              {s.notes}
            </FitName>
          </div>
        </Candle>
        {sender ? (
          <motion.div className="absolute -right-[calc(17*var(--p))] bottom-[calc(1*var(--p))] w-[calc(24*var(--p))] rotate-[8deg]" initial={reduce ? false : { opacity: 0, rotate: 30 }} animate={{ opacity: 1, rotate: 8 }} transition={{ delay: 0.7, type: "spring", stiffness: 120, damping: 12 }}>
            <KraftTag look={look}>
              <FitName as="p" min={0.6} className="text-[calc(3.4*var(--p))] leading-[1.25]" style={{ fontFamily: "var(--gift-font-hand)" }}>
                {`${s.from} ${sender}`}
              </FitName>
            </KraftTag>
          </motion.div>
        ) : null}
      </motion.div>
    </>
  );
}

/** Fall for You's first screen, still and unlit, in the look the sender picked. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...wallStyle(look), color: look.ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <CoverScene look={look} s={S[locale] ?? S.en} name={recipientName} sender={senderName} stage="covered" reduce />
    </div>
  );
}

/** A thing on the first screen: drawn (the pumpkin, the acorn, the heart, the tag) or cut out (the candle, the teddy, the cup, the leaves). */
function Thing({ d, look, tag, still, delay }: { d: Deco; look: Look; tag: string; still: boolean; delay: number }) {
  const leaf: Record<string, ScrapId> = { leafA: look.leaves[0], leafB: look.leaves[1], leafC: look.leaves[2] };
  const body = (() => {
    switch (d.kind) {
      case "pumpkin":
        return <PatchworkPumpkin look={look} />;
      case "acorn":
        return <Acorn />;
      case "heart":
        return <WoodHeart />;
      case "tag":
        return (
          <KraftTag look={look}>
            <FitName as="p" min={0.55} className="text-[calc(4.4*var(--p))] leading-[1.25]" style={{ fontFamily: SCRIPT_FONT }}>
              {tag}
            </FitName>
          </KraftTag>
        );
      case "candle":
        return (
          <div className="relative">
            <span aria-hidden="true" className={still ? "absolute top-[-30%] left-1/2 h-[120%] w-[160%] -translate-x-1/2 rounded-full" : "ffy-glow absolute top-[-30%] left-1/2 h-[120%] w-[160%] -translate-x-1/2 rounded-full"} style={{ background: "radial-gradient(circle, rgba(255,190,100,.55), transparent 65%)" }} />
            <Scrap id="candle-amber" eager />
          </div>
        );
      case "cup":
        return (
          <div className="relative">
            <span className="absolute -top-[75%] left-[18%] w-[64%] opacity-90">
              <Steam still={still} />
            </span>
            <Scrap id="coffee-cup" eager />
          </div>
        );
      case "teddy":
        return <Scrap id="teddy" eager />;
      default:
        return <Scrap id={leaf[d.kind]} eager />;
    }
  })();
  const isLeaf = d.kind.startsWith("leaf");
  return (
    <Piece x={d.x} y={d.y} w={d.w} rotate={d.rotate ?? 0} z={d.z ?? (isLeaf ? 2 : 6)} drift={isLeaf ? 3 : 0} sway={isLeaf} entrance={isLeaf ? "bloom" : d.kind === "tag" ? "stick" : "drop"} delay={delay}>
      {body}
    </Piece>
  );
}

/** A leaf let go where the page was tapped. */
type Fall = { id: number; x: number; y: number; scrap: ScrapId; spin: number; drift: number };
const MAX_FALLS = 8;
const FALL_KEYFRAMES = `@keyframes ffy-glow { 0%,100% { opacity: .75; scale: 1 } 45% { opacity: 1; scale: 1.06 } 70% { opacity: .85; scale: .97 } }
.ffy-glow { animation: ffy-glow 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ffy-glow { animation: none; } }`;

function Page({ look, s, data, fields, seed, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: FallForYouFields; seed: number; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [falls, setFalls] = useState<Fall[]>([]);
  const fallCount = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const { hero, scatter } = arrangePhotos(data.photos);
  const n = Math.min(4, Math.max(1, hero.length)) as 1 | 2 | 3 | 4;
  const spots = HERO_SPOTS[n];
  const noteSpot = n < 4 ? NOTE_SPOTS[n as 1 | 2 | 3] : null;
  const word = blockWord(fields, data.recipientName, s.fallback);
  const tag = fields.tag?.trim() || s.tag;
  const note = fields.note?.trim() || s.note;
  const at = BLOCKS_AT[n];
  const scatterSpotsList = scatterSpots(scatter.length);
  const random = useMemo(() => mulberry32(seed + 31), [seed]);

  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const noteHere = !noteSpot;
  const songY = 30;
  const noteY = hasSong ? (catalog ? 110 : 102) : 38;
  const middleH = (hasSong ? (catalog ? 74 : 66) : 0) + (noteHere ? 64 : 0) + 14;
  const preview = mode === "preview";
  const open = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);

  // A tap on the page, anywhere that isn't a photo or a button, lets a leaf fall from there.
  const drop = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    fallCount.current += 1;
    playLeaf(audio.muted);
    buzz(6);
    const fall = { id: fallCount.current, x: (e.clientX - box.left) / unit, y: (e.clientY - box.top) / unit, scrap: look.leaves[fallCount.current % 3], spin: Math.round((random() - 0.5) * 300), drift: Math.round((random() - 0.5) * 30) };
    setFalls((list) => [...list, fall].slice(-MAX_FALLS));
  };

  return (
    <CollageContext.Provider value={context}>
      <style>{FALL_KEYFRAMES}</style>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={drop}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(8*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first screen: the polaroids, their name in blocks across the middle, the cosy things round them */}
            <section className="relative" style={{ height: `calc(${HERO_HEIGHT[n]} * var(--p))` }}>
              {spots.map((spot, i) => {
                const photo = hero[i];
                return (
                  <Piece key={photo?.id ?? i} x={spot.x} y={spot.y} w={spot.w} rotate={spot.rotate} z={3 + i} entrance="drop" delay={0.1 + i * 0.12}>
                    <Polaroid photo={photo} lip={9} paper={look.paper} onOpen={open && photo ? () => open(photo) : undefined} still={still}>
                      <Caption color={look.ink}>{photo?.caption}</Caption>
                    </Polaroid>
                  </Piece>
                );
              })}
              {noteSpot ? (
                <Piece x={noteSpot.x} y={noteSpot.y} w={noteSpot.w} rotate={noteSpot.rotate} z={7} entrance="stick" delay={0.5}>
                  <Tape color={look.tape} width={16} className="-top-[calc(2*var(--p))] left-1/2 z-[1] -translate-x-1/2 rotate-2" />
                  <RecipeCard title={s.recipe} text={note} look={look} />
                </Piece>
              ) : null}

              <div className="absolute z-[8]" style={{ left: `calc(${at.x} * var(--p))`, top: `calc(${at.y} * var(--p))`, width: `calc(${at.w} * var(--p))`, translate: "-50% -50%" }}>
                <LetterBlocks text={word} look={look} seed={seed} width={at.w} still={still} delay={0.55} />
              </div>

              {HERO_DECO[n].map((d, i) => (
                <Thing key={`${d.kind}-${i}`} d={d} look={look} tag={tag} still={still} delay={0.4 + i * 0.06} />
              ))}

              <div className="absolute z-[9]" style={{ left: `calc(${SCROLL_AT[n].x} * var(--p))`, top: `calc(${SCROLL_AT[n].y} * var(--p))`, translate: "-50% 0" }}>
                <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
              </div>
            </section>

            <div className="relative z-[9] flex justify-center px-[calc(6*var(--p))] py-[calc(3*var(--p))]">
              <p className="-rotate-2 rounded-[calc(.8*var(--p))] px-[calc(4*var(--p))] py-[calc(1*var(--p))] text-center text-[calc(4.6*var(--p))] leading-[1.25]" style={{ fontFamily: SCRIPT_FONT, color: look.accent, backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(.6*var(--p)) calc(1.4*var(--p)) rgba(50,25,10,.22)" }}>
                {s.tapAnywhere}
              </p>
            </div>
            {hasSong || noteHere ? (
              <section className="relative" style={{ height: `calc(${middleH} * var(--p))` }}>
                {hasSong ? (
                  <Piece x={50} y={songY} w={74} rotate={2} z={5} entrance="right">
                    {catalog ? (
                      <PreviewMusicCard music={catalog} locale={data.locale} cover={hero[0]} live={mode !== "preview"} colors={look.card} />
                    ) : song ? (
                      <MusicCard music={song} audio={audio} cover={hero[0]} live={mode !== "preview"} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                    ) : null}
                  </Piece>
                ) : null}
                {noteHere ? (
                  <Piece x={42} y={noteY} w={58} rotate={-3} z={4} entrance="stick" delay={0.15}>
                    <Tape color={look.tape} width={16} className="-top-[calc(2*var(--p))] left-1/2 z-[1] -translate-x-1/2 rotate-2" />
                    <RecipeCard title={s.recipe} text={note} look={look} />
                  </Piece>
                ) : null}
                <Piece x={88} y={hasSong ? songY + 30 : noteY} w={16} z={6} entrance="drop" delay={0.3}>
                  <div className="relative">
                    <span aria-hidden="true" className={still ? "absolute top-[-30%] left-1/2 h-[120%] w-[160%] -translate-x-1/2 rounded-full" : "ffy-glow absolute top-[-30%] left-1/2 h-[120%] w-[160%] -translate-x-1/2 rounded-full"} style={{ background: "radial-gradient(circle, rgba(255,190,100,.55), transparent 65%)" }} />
                    <Scrap id="candle-amber" />
                  </div>
                </Piece>
                {noteHere ? (
                  <Piece x={85} y={noteY + 26} w={10} rotate={14} z={6} entrance="bloom" delay={0.35}>
                    <Acorn />
                  </Piece>
                ) : null}
                <Piece x={8} y={hasSong ? songY - 20 : noteY - 28} w={20} rotate={-22} z={6} sway entrance="bloom" delay={0.2}>
                  <Scrap id={look.leaves[1]} />
                </Piece>
              </section>
            ) : null}

            {scatter.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(scatter.length)} * var(--p))` }}>
                {scatter.map((photo, i) => (
                  <Piece key={photo.id} {...scatterSpotsList[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <Polaroid photo={photo} lip={8} paper={look.paper} onOpen={open ? () => open(photo) : undefined} still={still}>
                      <Caption color={look.ink}>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}
                <Piece x={50} y={10} w={18} rotate={-14} z={6} sway entrance="bloom">
                  <Scrap id={look.leaves[2]} />
                </Piece>
                <Piece x={93} y={28} w={9} rotate={16} z={6} entrance="bloom" delay={0.2}>
                  <Acorn />
                </Piece>
                {scatter.length > 2 ? (
                  <>
                    <Piece x={50} y={76} w={22} rotate={4} z={7} entrance="drop">
                      <PatchworkPumpkin look={look} />
                    </Piece>
                    <Piece x={8} y={98} w={18} rotate={-20} z={6} sway entrance="bloom">
                      <Scrap id={look.leaves[0]} />
                    </Piece>
                  </>
                ) : null}
              </section>
            ) : null}

            <section className="relative mt-[calc(12*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={12} y={-2} w={26} rotate={-24} z={4} drift={4} sway entrance="left">
                <Scrap id={look.leaves[0]} />
              </Piece>
              <Piece x={86} y={0} w={14} rotate={10} z={4} entrance="bloom" delay={0.15}>
                <WoodHeart />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, bottom: true }} color={look.paper} grain={PAPER_GRAIN} depth={1.4} className="relative z-[2]">
                <article className="px-[calc(6*var(--p))] pt-[calc(13*var(--p))] pb-[calc(12*var(--p))]" style={{ color: look.ink }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={84} y={-2} w={24} rotate={6} z={4} entrance="bloom">
                  <PatchworkPumpkin look={look} />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(9*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(3*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(3*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ background: look.card.card, color: look.card.ink }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={look.cardDark ? "dark" : "light"} onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(3*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 14px 26px -18px rgba(0,0,0,.45)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>

            {/* the leaves the taps let fall */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[40]">
              <AnimatePresence>
                {falls.map((f) => (
                  <motion.div key={f.id} className="absolute w-[calc(13*var(--p))]" style={{ left: `calc(${f.x - 6.5} * var(--p))`, top: `calc(${f.y - 6} * var(--p))` }} initial={{ scale: 0.3, opacity: 0, y: 0, x: 0, rotate: 0 }} animate={{ scale: 1, opacity: [0, 1, 1, 0], y: `calc(42 * var(--p))`, x: [`calc(0 * var(--p))`, `calc(${f.drift / 2} * var(--p))`, `calc(${-f.drift / 3} * var(--p))`, `calc(${f.drift} * var(--p))`], rotate: f.spin }} transition={{ duration: 2.2, ease: "easeIn", opacity: { duration: 2.2, times: [0, 0.1, 0.75, 1] }, x: { duration: 2.2, ease: "easeInOut" } }} onAnimationComplete={() => setFalls((list) => list.filter((p) => p.id !== f.id))}>
                    <Scrap id={f.scrap} eager />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
