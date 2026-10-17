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
import { Float, PAPER_GRAIN, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, ScrollHint, Tape, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard } from "../_shared/collage/cards";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { Bat, Bubble, Cat, Ghost, GhostHands, Pumpkin, Star, wallStyle } from "./art";
import { arrangePhotos, catOn, HERO_DECO, HERO_HEIGHT, HERO_SPOTS, LOOKS, NOTE_ASPECT, NOTE_SPOTS, polaroidHeight, SCROLL_AT, type Deco, type Look, type LookId, type Spot } from "./looks";
import { playBoo, playFlutter, playPop } from "./sounds";
import { fieldsSchema, type BeMyBooFields } from "./schema";

type Copy = { tap: string; for: string; from: string; ask: string; boo: string; scroll: string; note: string; tapAnywhere: string; pause: string; play: string };

const S: Record<"en" | "es", Copy> = {
  en: { tap: "tap the ghost", for: "for", from: "from", ask: "be my boo?", boo: "boo!", scroll: "scroll", note: "you're my favourite person to be scared with", tapAnywhere: "tap anywhere for a boo", pause: "Pause the song", play: "Play the song" },
  es: { tap: "toca el fantasma", for: "para", from: "de", ask: "¿serás mi boo?", boo: "¡bu!", scroll: "desliza", note: "eres mi persona favorita para pasar miedo", tapAnywhere: "toca donde quieras para un bu", pause: "Pausar la canción", play: "Reproducir la canción" },
};

/**
 * covered: the ghost waits with its sign. boo: it says so. flying: it flies off with the bats and the
 * page comes in under it. open: the cover is gone.
 */
type Stage = "covered" | "boo" | "flying" | "open";

/** From the tap: when the ghost takes off, when the page comes in (the ghost mostly gone), when the cover goes. */
const FLY_AT = 520;
const REVEAL_AT = 1000;
const OPEN_AT = 1550;
type Data = TemplateProps<BeMyBooFields>["data"];

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "pumpkin";
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<BeMyBooFields>) {
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
  const lookId = readLook(data.fields);
  const look = LOOKS[lookId];
  const seed = hashString(`${data.recipientName}|${data.senderName}|be-my-boo`);

  const [stage, setStage] = useState<Stage>(preview ? "open" : "covered");
  const [revealed, setRevealed] = useState(preview);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const tapGhost = () => {
    if (stage !== "covered") return;
    void audio.start();
    playBoo(audio.muted);
    buzz(16);
    eventRef.current?.({ type: "started" });
    setStage("boo");
    window.setTimeout(() => {
      playFlutter(audio.muted);
      setStage("flying");
    }, reduce ? 60 : FLY_AT);
    // The page comes in once the ghost is mostly off the screen, never under it.
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
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ color: look.ink, fontFamily: "var(--gift-font-body)", ...wallStyle(lookId), ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={look.dark ? 0.8 : 0.6} />
      </div>
      {revealed ? <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} seed={seed} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {stage !== "open" ? <Covered key={`covered-${run}`} look={look} s={s} data={data} stage={stage} reduce={reduce} onTap={tapGhost} /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The ghost with its sign over the page, waiting for the tap. */
function Covered({ look, s, data, stage, reduce, onTap }: { look: Look; s: Copy; data: Data; stage: Stage; reduce: boolean; onTap: () => void }) {
  const waiting = stage === "covered";
  return (
    <div className={waiting ? "absolute inset-0 z-20" : "pointer-events-none absolute inset-0 z-20"}>
      <CoverScene look={look} s={s} name={data.recipientName} sender={data.senderName} stage={stage} reduce={reduce} />
      {waiting ? <button type="button" onClick={onTap} aria-label={s.tap} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-black/30 focus-visible:ring-inset" /> : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[28] flex justify-center">
        <TapPill tone={{ page: look.wall, glow: [look.wall, look.wall], accent: look.accent, dark: look.dark }} hidden={!waiting} reduce={reduce}>
          {s.tap}
        </TapPill>
      </div>
    </div>
  );
}

/** Bats that burst out from behind the ghost as it flies: where each one heads, in `--p`, and how big it is. */
const BURST = [
  { x: -62, y: -70, w: 13, r: -20 },
  { x: 58, y: -78, w: 15, r: 18 },
  { x: -80, y: 6, w: 12, r: -8 },
  { x: 82, y: -8, w: 14, r: 10 },
  { x: -50, y: 80, w: 11, r: -26 },
  { x: 54, y: 86, w: 12, r: 24 },
  { x: -10, y: -96, w: 10, r: 4 },
];

/**
 * The first screen: the ghost holding a sign with their name, bats about it and pumpkins at its feet.
 * Drawn still, it is the Classic tile in the editor's cover picker.
 */
function CoverScene({ look, s, name, sender, stage, reduce }: { look: Look; s: Copy; name: string; sender: string; stage: Stage; reduce: boolean }) {
  const booing = stage === "boo";
  const flying = stage === "flying" || stage === "open";
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 40% at 50% 46%, ${look.dark ? "rgba(242,140,40,.16)" : "rgba(255,255,255,.75)"}, transparent 72%)` }} />

      {/* two bats keeping it company, and a pumpkin patch at its feet; they leave as it does */}
      <motion.div aria-hidden="true" className="absolute top-[14cqh] left-[calc(10*var(--p))] w-[calc(17*var(--p))]" animate={flying ? { x: "-160%", y: "-120%", opacity: 0 } : { x: 0, y: 0, opacity: 1 }} transition={{ duration: flying ? 0.7 : 0.3, ease: [0.5, 0, 0.75, 0.3] }}>
        <Float reduce={reduce} amount={1.4} duration={3.6}>
          <Bat color={look.bat} still={reduce} style={{ rotate: "-12deg" }} />
        </Float>
      </motion.div>
      <motion.div aria-hidden="true" className="absolute top-[22cqh] right-[calc(9*var(--p))] w-[calc(13*var(--p))]" animate={flying ? { x: "170%", y: "-140%", opacity: 0 } : { x: 0, y: 0, opacity: 1 }} transition={{ duration: flying ? 0.7 : 0.3, ease: [0.5, 0, 0.75, 0.3] }}>
        <Float reduce={reduce} amount={1.2} duration={4.2} delay={0.6}>
          <Bat color={look.bat} still={reduce} style={{ rotate: "14deg" }} />
        </Float>
      </motion.div>
      <motion.div aria-hidden="true" className="absolute bottom-[calc(max(9cqh,64px)+calc(6*var(--p)))] left-[calc(6*var(--p))] flex w-[calc(42*var(--p))] items-end" animate={flying ? { y: "180%", rotate: -8 } : { y: 0, rotate: 0 }} transition={{ duration: flying ? 0.55 : 0.3, ease: [0.5, 0, 0.8, 0.4] }}>
        <Pumpkin paint={look.pumpkin} className="w-[62%]" />
        <Pumpkin paint={look.pumpkin} className="-ml-[10%] w-[40%]" style={{ rotate: "8deg" }} />
      </motion.div>
      <motion.div aria-hidden="true" className="absolute right-[calc(5*var(--p))] bottom-[calc(max(9cqh,64px)+calc(9*var(--p)))] w-[calc(20*var(--p))]" animate={flying ? { y: "240%", rotate: 10 } : { y: 0, rotate: 0 }} transition={{ duration: flying ? 0.55 : 0.3, ease: [0.5, 0, 0.8, 0.4] }}>
        <Pumpkin paint={look.pumpkin} style={{ rotate: "-6deg" }} />
      </motion.div>

      {/* the ghost and its sign: it bobs while it waits, swells as it says boo, then flies up and out */}
      <motion.div
        className="absolute top-[max(16cqh,calc(22*var(--p)))] left-1/2 z-[20] w-[calc(58*var(--p))]"
        style={{ x: "-50%" }}
        initial={reduce ? false : { y: "30%", opacity: 0 }}
        animate={flying ? (reduce ? { opacity: 0 } : { y: ["0%", "7%", "-210%"], rotate: [0, -6, 12], scale: [1, 1.04, 0.82], opacity: 1 }) : { y: "0%", opacity: 1, rotate: 0, scale: 1 }}
        transition={flying ? (reduce ? { duration: 0.2 } : { duration: 0.64, times: [0, 0.16, 1], ease: ["easeOut", [0.55, 0, 0.85, 0.3]] }) : { y: { type: "spring", stiffness: 70, damping: 12, delay: 0.15 }, opacity: { delay: 0.15, duration: 0.4 } }}
      >
        <Float reduce={reduce || booing || flying} amount={1.6} duration={3.4}>
          <motion.div className="relative" animate={booing && !reduce ? { scale: [1, 1.14, 0.95, 1.05], rotate: [0, -3, 3, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <Ghost c={look.ghost} mood={booing || flying ? "boo" : "idle"} arms={false} />
            {/* the sign, held at the ghost's middle with its two hands over the top */}
            <div className="absolute top-[62%] left-1/2 w-[62%] -translate-x-1/2 -rotate-3">
              <div className="rounded-[calc(1.4*var(--p))] px-[calc(3.6*var(--p))] pt-[calc(3.6*var(--p))] pb-[calc(2.2*var(--p))] text-center" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 calc(1*var(--p)) calc(2.4*var(--p)) rgba(40,20,30,.24)" }}>
                <p className="text-[calc(2.4*var(--p))] font-semibold tracking-[0.34em] uppercase opacity-60">{s.for}</p>
                <FitName as="p" className="text-[calc(8.4*var(--p))] leading-[1.15]" style={{ fontFamily: SCRIPT_FONT, color: look.ink }}>
                  {name}
                </FitName>
                {sender ? (
                  <FitName as="p" min={0.7} className="mt-[calc(.4*var(--p))] text-[calc(3.4*var(--p))] leading-[1.25] opacity-75" style={{ fontFamily: "var(--gift-font-hand)" }}>
                    {`${s.from} ${sender}`}
                  </FitName>
                ) : null}
              </div>
            </div>
            <GhostHands c={look.ghost} className="pointer-events-none absolute inset-0" />
            {/* boo! */}
            <motion.div className="absolute top-[2%] -right-[6%] origin-bottom-left text-[calc(6.4*var(--p))]" initial={false} animate={booing || flying ? { scale: 1, opacity: 1, rotate: 8 } : { scale: 0, opacity: 0, rotate: -10 }} transition={{ type: "spring", stiffness: 520, damping: 16 }}>
              <Bubble ink={look.accent}>{s.boo}</Bubble>
            </motion.div>
          </motion.div>
        </Float>
      </motion.div>

      {/* as it goes, the bats it was hiding burst out from behind it */}
      {flying && !reduce ? (
        <div aria-hidden="true" className="pointer-events-none absolute top-[max(30cqh,calc(40*var(--p)))] left-1/2 z-[19] h-0 w-0">
          {BURST.map((b, i) => (
            <motion.div key={i} className="absolute" style={{ width: `calc(${b.w} * var(--p))`, left: `calc(${-b.w / 2} * var(--p))`, top: `calc(${-b.w / 4} * var(--p))` }} initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }} animate={{ x: `calc(${b.x * 1.9} * var(--p))`, y: `calc(${b.y * 1.9} * var(--p))`, scale: 1.1, opacity: [0, 1, 1, 1] }} transition={{ duration: 0.95, delay: 0.04 * i, ease: [0.3, 0.6, 0.6, 1] }}>
              <Bat color={look.bat} still={false} style={{ rotate: `${b.r}deg` }} />
            </motion.div>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Be My Boo's first screen, still, in the look the sender picked. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const lookId = readLook(fields);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...wallStyle(lookId), color: LOOKS[lookId].ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <CoverScene look={LOOKS[lookId]} s={S[locale] ?? S.en} name={recipientName} sender={senderName} stage="covered" reduce />
    </div>
  );
}

/** A drawn thing on the page: the pumpkin, the ghost (which bobs), a bat or a star. */
function Drawing({ d, look, still, delay = 0 }: { d: Deco; look: Look; still: boolean; delay?: number }) {
  const body =
    d.kind === "pumpkin" ? (
      <Pumpkin paint={look.pumpkin} />
    ) : d.kind === "ghost" ? (
      <Float reduce={still} amount={1.3} duration={3.8}>
        <Ghost c={look.ghost} />
      </Float>
    ) : d.kind === "bat" ? (
      <Bat color={look.bat} still={still} />
    ) : (
      <Star color={look.star} />
    );
  return (
    <Piece x={d.x} y={d.y} w={d.w} rotate={d.rotate ?? 0} z={d.kind === "ghost" ? 8 : d.kind === "pumpkin" ? 7 : 6} entrance={d.kind === "star" ? "stamp" : d.kind === "ghost" ? "drop" : "bloom"} delay={delay}>
      {body}
    </Piece>
  );
}

/** The note: a square of paper taped on, a line in handwriting that shrinks as it gets longer. */
function NoteCard({ text, look }: { text: string; look: Look }) {
  const length = [...text].length;
  const size = length <= 30 ? 5.4 : length <= 50 ? 4.8 : length <= 70 ? 4.3 : 3.9;
  return (
    <div className="relative grid w-full place-items-center px-[calc(5*var(--p))] text-center" style={{ aspectRatio: String(1 / NOTE_ASPECT), backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 calc(1.3*var(--p)) calc(2.8*var(--p)) rgba(40,18,22,.28)" }}>
      <Tape color={look.tape} width={18} className="-top-[calc(2*var(--p))] left-1/2 -translate-x-1/2 -rotate-2" />
      <p className="text-balance" style={{ fontFamily: "var(--gift-font-hand)", fontSize: `calc(${size} * var(--p))`, lineHeight: 1.3, overflowWrap: "anywhere" }}>
        {text}
      </p>
    </div>
  );
}

/** A tiny ghost popping up where the page was tapped. */
type Pop = { id: number; x: number; y: number; rotate: number };
const MAX_POPS = 8;

function Page({ look, s, data, fields, seed, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: BeMyBooFields; seed: number; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const popCount = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const { hero, scatter } = arrangePhotos(data.photos);
  const n = Math.min(4, Math.max(1, hero.length)) as 1 | 2 | 3 | 4;
  const spots = HERO_SPOTS[n];
  const noteSpot: Spot | null = n < 4 ? NOTE_SPOTS[n as 1 | 2 | 3] : null;
  const note = fields.note?.trim() || s.note;
  const sign = fields.sign?.trim() || s.ask;
  // The cat lies along the bottom card: the fourth photo, or the note in its place.
  const catBed = noteSpot ? { spot: noteSpot, h: noteSpot.w * NOTE_ASPECT } : { spot: spots[3], h: polaroidHeight(spots[3].w) };
  const cat = catOn(catBed.spot, catBed.h, n >= 3 ? 32 : 34);
  const scatterSpotsList = scatterSpots(scatter.length);

  // Music that plays under the gift gets the player card; a real song from Apple gets the same card,
  // heard only on a tap (PreviewMusicCard), and the end screen then leaves its own out.
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const noteHere = !noteSpot;
  const songY = 30;
  const noteY = hasSong ? (catalog ? 104 : 96) : 34;
  const middleH = (hasSong ? (catalog ? 74 : 66) : 0) + (noteHere ? 58 : 0) + 16;
  const preview = mode === "preview";
  const open = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const random = useMemo(() => mulberry32(seed), [seed]);

  // A tap on the page, anywhere that isn't a photo or a button, sends up a tiny ghost.
  const boo = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    popCount.current += 1;
    playPop(audio.muted);
    buzz(8);
    const pop = { id: popCount.current, x: (e.clientX - box.left) / unit, y: (e.clientY - box.top) / unit, rotate: Math.round((random() - 0.5) * 24) };
    setPops((list) => [...list, pop].slice(-MAX_POPS));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={boo}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(8*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first screen: the polaroids down the page, the ghost, the pumpkins and the cat */}
            <section className="relative" style={{ height: `calc(${HERO_HEIGHT[n]} * var(--p))` }}>
              {/* their name on a torn label, taped on: it reads the same over any part of the print */}
              <motion.div className="absolute top-[calc(1.5*var(--p))] left-[calc(3*var(--p))] z-[9] w-[calc(44*var(--p))]" initial={still ? false : { opacity: 0, y: "-30%", rotate: -8 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.05 }}>
                <Tape color={look.tape} width={16} className="-top-[calc(1.6*var(--p))] left-[34%] z-[1] rotate-[4deg]" />
                <TornPaper seed={seed + 3} sides={{ top: true, right: true, bottom: true, left: true }} color={look.paper} grain={PAPER_GRAIN} depth={3}>
                  <div className="px-[calc(4*var(--p))] pt-[calc(3*var(--p))] pb-[calc(3.2*var(--p))]">
                    <p className="text-[calc(2.3*var(--p))] font-semibold tracking-[0.36em] uppercase opacity-55" style={{ color: look.ink }}>
                      {s.for}
                    </p>
                    <FitName className="mt-[calc(1*var(--p))] text-[calc(10.5*var(--p))] leading-[1.15]" style={{ fontFamily: SCRIPT_FONT, color: look.ink }}>
                      {data.recipientName}
                    </FitName>
                    <FitName min={0.6} className="text-[calc(4.8*var(--p))] leading-[1.25] font-bold" style={{ fontFamily: "var(--gift-font-hand)", color: look.accent }}>
                      {sign}
                    </FitName>
                  </div>
                </TornPaper>
              </motion.div>

              {spots.map((spot, i) => {
                const photo = hero[i];
                return (
                  <Piece key={photo?.id ?? i} x={spot.x} y={spot.y} w={spot.w} rotate={spot.rotate} z={3 + i} entrance="drop" delay={0.12 + i * 0.12}>
                    <Polaroid photo={photo} lip={9} paper={look.paper} onOpen={open && photo ? () => open(photo) : undefined} still={still}>
                      <Caption color={look.ink}>{photo?.caption}</Caption>
                    </Polaroid>
                  </Piece>
                );
              })}
              {noteSpot ? (
                <Piece x={noteSpot.x} y={noteSpot.y} w={noteSpot.w} rotate={noteSpot.rotate} z={6} entrance="stick" delay={0.5}>
                  <NoteCard text={note} look={look} />
                </Piece>
              ) : null}

              {HERO_DECO[n].map((d, i) => (
                <Drawing key={`${d.kind}-${i}`} d={d} look={look} still={still} delay={0.45 + i * 0.07} />
              ))}
              <Piece x={cat.x} y={cat.y} w={cat.w} rotate={cat.rotate} z={9} entrance="drop" delay={0.85}>
                <Cat c={look.cat} still={still} />
              </Piece>

              <div className="absolute z-[9]" style={{ left: `calc(${SCROLL_AT[n].x} * var(--p))`, top: `calc(${SCROLL_AT[n].y} * var(--p))`, translate: "-50% 0" }}>
                <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
              </div>
            </section>

            {/* what the ghost does next: the song, the note if the photos left no room for it up top */}
            <div className="relative z-[9] flex justify-center py-[calc(3*var(--p))]">
              <p className="text-center text-[calc(4.8*var(--p))] leading-[1.2]" style={{ fontFamily: SCRIPT_FONT, color: look.accent }}>
                {s.tapAnywhere}
              </p>
            </div>
            {hasSong || noteHere ? (
              <section className="relative" style={{ height: `calc(${middleH} * var(--p))` }}>
                {hasSong ? (
                  <Piece x={50} y={songY} w={74} rotate={-2} z={5} entrance="right">
                    {catalog ? (
                      <PreviewMusicCard music={catalog} locale={data.locale} cover={hero[0]} live={mode !== "preview"} colors={look.card} />
                    ) : song ? (
                      <MusicCard music={song} audio={audio} cover={hero[0]} live={mode !== "preview"} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                    ) : null}
                  </Piece>
                ) : null}
                {noteHere ? (
                  <Piece x={40} y={noteY} w={52} rotate={-3} z={4} entrance="stick" delay={0.15}>
                    <NoteCard text={note} look={look} />
                  </Piece>
                ) : null}
                <Piece x={84} y={hasSong ? songY + 34 : noteY} w={20} z={6} entrance="drop" delay={0.3}>
                  <Float reduce={still} amount={1.2} duration={4}>
                    <Ghost c={look.ghost} />
                  </Float>
                </Piece>
                {noteHere ? (
                  <Piece x={83} y={noteY + 30} w={20} rotate={6} z={5} entrance="bloom" delay={0.35}>
                    <Pumpkin paint={look.pumpkin} />
                  </Piece>
                ) : null}
                <Piece x={10} y={hasSong ? songY - 22 : noteY - 26} w={13} rotate={-14} z={6} entrance="bloom" delay={0.2}>
                  <Bat color={look.bat} still={still} />
                </Piece>
              </section>
            ) : null}

            {/* the rest of the photos, scattered in pairs */}
            {scatter.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(scatter.length)} * var(--p))` }}>
                {scatter.map((photo, i) => (
                  <Piece key={photo.id} {...scatterSpotsList[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <Polaroid photo={photo} lip={8} paper={look.paper} onOpen={open ? () => open(photo) : undefined} still={still}>
                      <Caption color={look.ink}>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}
                <Piece x={50} y={9} w={16} rotate={-10} z={6} entrance="bloom">
                  <Pumpkin paint={look.pumpkin} />
                </Piece>
                <Piece x={92} y={26} w={12} rotate={16} z={6} entrance="bloom" delay={0.2}>
                  <Bat color={look.bat} still={still} />
                </Piece>
                {scatter.length > 2 ? (
                  <>
                    <Piece x={50} y={74} w={17} z={7} entrance="drop">
                      <Float reduce={still} amount={1.2} duration={3.6} delay={0.4}>
                        <Ghost c={look.ghost} />
                      </Float>
                    </Piece>
                    <Piece x={8} y={96} w={5} z={6} entrance="stamp">
                      <Star color={look.star} />
                    </Piece>
                  </>
                ) : null}
              </section>
            ) : null}

            {/* the letter, with a ghost peeking over the top of it */}
            <section className="relative mt-[calc(16*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={78} y={-5} w={24} rotate={6} z={1} entrance="drop">
                <Float reduce={still} amount={1} duration={4.4}>
                  <Ghost c={look.ghost} />
                </Float>
              </Piece>
              <Piece x={12} y={0} w={12} rotate={-16} z={3} entrance="bloom" delay={0.1}>
                <Bat color={look.bat} still={still} />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, bottom: true }} color={look.paper} grain={PAPER_GRAIN} depth={1.4} className="relative z-[2]">
                <article className="px-[calc(6*var(--p))] pt-[calc(12*var(--p))] pb-[calc(12*var(--p))]" style={{ color: look.ink }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={86} y={-2} w={18} rotate={8} z={4} entrance="bloom">
                  <Pumpkin paint={look.pumpkin} />
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

            {/* the tiny ghosts the taps send up */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[40]">
              <AnimatePresence>
                {pops.map((pop) => (
                  <motion.div key={pop.id} className="absolute w-[calc(11*var(--p))]" style={{ left: `calc(${pop.x - 5.5} * var(--p))`, top: `calc(${pop.y - 7} * var(--p))` }} initial={{ scale: 0.2, opacity: 0, y: 0, rotate: pop.rotate }} animate={{ scale: 1, opacity: [0, 1, 1, 0], y: `calc(-30 * var(--p))`, rotate: -pop.rotate }} transition={{ duration: 1.7, ease: "easeOut", opacity: { duration: 1.7, times: [0, 0.12, 0.7, 1] } }} onAnimationComplete={() => setPops((list) => list.filter((p) => p.id !== pop.id))}>
                    <Ghost c={look.ghost} mood="boo" arms={false} />
                    <span className="absolute -top-[calc(3*var(--p))] -right-[calc(7*var(--p))] text-[calc(3.6*var(--p))]">
                      <Bubble ink={look.accent}>{s.boo}</Bubble>
                    </span>
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
