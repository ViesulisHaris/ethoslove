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
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT, TapPill } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Scrap, ScrollHint, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard, Ticket } from "../_shared/collage/cards";
import { ticketNumber } from "../_shared/collage/paper";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import type { ScrapId } from "../_shared/collage/scraps";
import { Apple, BookPage, FilmDotFrame, HeartPhoto, HeartsTape, Ladybug, MoonLeaf, Negative, Peg, WordStrips } from "./art";
import { arrangePhotos, FRAME_SPOTS, HERO_DECO, HERO_HEIGHT, LOOKS, SCROLL_AT, type Deco, type Look, type LookId } from "./looks";
import { playDevelop, playPress, playSwitch } from "./sounds";
import { fieldsSchema, type AutumnReelFields } from "./schema";

type Copy = { tap: string; for: string; from: string; and: string; wish: string; book: string; ticket: string; tapAnywhere: string; scroll: string; pause: string; play: string };

const S: Record<"en" | "es", Copy> = {
  en: {
    tap: "tap to develop",
    for: "for",
    from: "from",
    and: "and",
    wish: "and if my wishes came true, it would've been you",
    book: "much as she pleased, and he let her, for he had long since given up pretending he could refuse her anything. The leaves were turning in the square below, and the light came in low and gold over the table where she sat with her tea. He thought then, as he had thought every autumn since, that of all the seasons he had been given, the best of them was the one with her in it, and he would have told her so, had she not looked up and smiled first.",
    ticket: "admit two: autumn matinee",
    tapAnywhere: "tap to press a leaf",
    scroll: "scroll",
    pause: "Pause the song",
    play: "Play the song",
  },
  es: {
    tap: "toca para revelar",
    for: "para",
    from: "de",
    and: "y",
    wish: "y si mis deseos se cumplieran, habrías sido tú",
    book: "cuanto quiso, y él la dejó, porque hacía tiempo que había dejado de fingir que podía negarle algo. Las hojas cambiaban de color en la plaza, y la luz entraba baja y dorada sobre la mesa donde ella tomaba el té. Pensó entonces, como había pensado cada otoño desde aquel, que de todas las estaciones que le habían tocado, la mejor era la que la tenía a ella, y se lo habría dicho, si ella no hubiera levantado la vista y sonreído primero.",
    ticket: "pase doble: sesión de otoño",
    tapAnywhere: "toca para prensar una hoja",
    scroll: "desliza",
    pause: "Pausar la canción",
    play: "Reproducir la canción",
  },
};

/** covered: the darkroom. developing: the light is on and the prints come up. leaving: the line goes up. open: the cover is gone. */
type Stage = "covered" | "developing" | "leaving" | "open";

/** From the tap: when the line goes, when the page comes in, when the cover is removed. */
const LEAVE_AT = 1350;
const REVEAL_AT = 1550;
const OPEN_AT = 2100;
type Data = TemplateProps<AutumnReelFields>["data"];

const readLook = (fields: unknown): LookId => {
  const parsed = fieldsSchema.safeParse(fields);
  return parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "rust";
};

/** The page: the look's colour, paper grain over it and a darker edge, like an old print. */
const wallStyle = (look: Look): CSSProperties => ({ backgroundColor: look.wall, backgroundImage: `radial-gradient(130% 95% at 50% 40%, transparent 50%, ${look.vignette}), ${PAPER_GRAIN}` });

/** The two of them as an old novel's running head: "MAYA AND LEO.", or just "MAYA." with no sender. */
const runningHead = (name: string, sender: string, and: string): string => (sender.trim() ? `${name.trim()} ${and} ${sender.trim()}.` : `${name.trim()}.`).toUpperCase();

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<AutumnReelFields>) {
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
  const seed = hashString(`${data.recipientName}|${data.senderName}|autumn-reel`);

  const [stage, setStage] = useState<Stage>(preview ? "open" : "covered");
  const [revealed, setRevealed] = useState(preview);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const develop = () => {
    if (stage !== "covered") return;
    void audio.start();
    playSwitch(audio.muted);
    window.setTimeout(() => playDevelop(audio.muted), reduce ? 0 : 260);
    buzz(12);
    eventRef.current?.({ type: "started" });
    setStage("developing");
    window.setTimeout(() => setStage("leaving"), reduce ? 80 : LEAVE_AT);
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
        <Ambience layers={look.ambience} opacity={0.6} />
      </div>
      {revealed ? <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} seed={seed} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {stage !== "open" ? <Covered key={`covered-${run}`} look={look} s={s} data={data} stage={stage} reduce={reduce} onTap={develop} /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Covered({ look, s, data, stage, reduce, onTap }: { look: Look; s: Copy; data: Data; stage: Stage; reduce: boolean; onTap: () => void }) {
  const waiting = stage === "covered";
  return (
    <div className={waiting ? "absolute inset-0 z-20" : "pointer-events-none absolute inset-0 z-20"}>
      <CoverScene look={look} s={s} name={data.recipientName} sender={data.senderName} photos={data.photos} stage={stage} reduce={reduce} />
      {waiting ? <button type="button" onClick={onTap} aria-label={s.tap} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:ring-inset" /> : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[28] flex justify-center">
        <TapPill tone={{ page: "#140605", glow: ["#7A1206", "#7A1206"], accent: look.accent, dark: true }} hidden={!waiting} reduce={reduce}>
          {s.tap}
        </TapPill>
      </div>
    </div>
  );
}

/** Where the prints hang on the line: their centre as a share of the width, their width and tilt. */
const LINE = [
  { x: 22, w: 30, r: -4, drop: 0 },
  { x: 51, w: 31, r: 2, drop: 2.4 },
  { x: 80, w: 30, r: 5, drop: 0.6 },
];

/**
 * The first screen: a darkroom under its red safelight, the photos pegged on a line as negatives,
 * and a strip of masking tape with their name on the wall. Lit, the room goes warm and the prints come
 * up as the photos. Drawn still and red, it is the Classic tile in the editor's cover picker.
 */
function CoverScene({ look, s, name, sender, photos, stage, reduce }: { look: Look; s: Copy; name: string; sender: string; photos: GiftPhoto[]; stage: Stage; reduce: boolean }) {
  const lit = stage !== "covered";
  const leaving = stage === "leaving" || stage === "open";
  const prints = photos.length ? photos.slice(0, 3) : [undefined];
  const line = prints.length === 1 ? [{ ...LINE[1], w: 46 }] : prints.length === 2 ? [{ ...LINE[0], x: 32, w: 36 }, { ...LINE[2], x: 70, w: 36 }] : LINE;
  return (
    <>
      {/* the room: red under the safelight, warm once the light is on */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: "#1C0D08" }} />
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(70% 45% at 50% 0%, rgba(214,38,24,.55), transparent 72%), radial-gradient(120% 90% at 50% 60%, rgba(120,12,6,.5), rgba(20,4,2,.9))" }} initial={false} animate={{ opacity: lit ? 0 : 1 }} transition={{ duration: reduce ? 0.1 : 0.35 }} />
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ ...wallStyle(look) }} initial={false} animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: reduce ? 0.1 : 0.5, delay: reduce ? 0 : 0.1 }} />
      {lit && !reduce ? <motion.div aria-hidden="true" className="absolute inset-0 bg-[#FFF4DC]" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} /> : null}

      {/* the safelight */}
      <motion.div aria-hidden="true" className="absolute top-[calc(5*var(--p))] left-1/2 h-[calc(5*var(--p))] w-[calc(16*var(--p))] -translate-x-1/2 rounded-b-[calc(3*var(--p))]" style={{ background: "#2A1712", boxShadow: "inset 0 calc(-1.6*var(--p)) 0 #E0281C" }} initial={false} animate={leaving ? { y: "-260%" } : { y: 0 }} transition={{ duration: 0.45, ease: [0.5, 0, 0.8, 0.4] }} />

      {/* the line and the prints on it: they go up and away once they're developed */}
      <motion.div className="absolute inset-x-0 top-[max(20cqh,calc(24*var(--p)))]" initial={false} animate={leaving ? { y: "-180%" } : { y: 0 }} transition={{ duration: reduce ? 0.2 : 0.6, ease: [0.5, 0, 0.8, 0.35] }}>
        <svg aria-hidden="true" viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute inset-x-0 -top-[calc(1*var(--p))] h-[calc(3*var(--p))] w-full overflow-visible">
          <path d="M-2 1Q50 7 102 1" fill="none" stroke="#C9B49A" strokeWidth=".5" />
        </svg>
        {prints.map((photo, i) => {
          const at = line[i];
          return (
            <motion.div key={photo?.id ?? i} className="absolute top-0" style={{ left: `${at.x}%`, width: `calc(${at.w} * var(--p))`, x: "-50%", rotate: at.r, transformOrigin: "50% 0", marginTop: `calc(${at.drop} * var(--p))` }} initial={reduce ? false : { y: "-30%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 90, damping: 11, delay: 0.15 + i * 0.12 }}>
              <span className="absolute -top-[calc(2.6*var(--p))] left-1/2 z-[2] w-[calc(3.6*var(--p))] -translate-x-1/2">
                <Peg className="w-full" />
              </span>
              <Negative photo={photo} developed={lit} still={reduce} delay={0.12 + i * 0.12} />
            </motion.div>
          );
        })}
      </motion.div>

      {/* their name on a strip of masking tape, stuck to the wall under the line */}
      <motion.div className="absolute top-[max(62cqh,calc(96*var(--p)))] left-1/2 z-[4] w-[calc(62*var(--p))]" style={{ x: "-50%" }} initial={reduce ? false : { opacity: 0, rotate: -6, scale: 1.2 }} animate={leaving ? { y: "260%", rotate: -12, opacity: 1, scale: 1 } : { y: 0, rotate: -2, opacity: 1, scale: 1 }} transition={leaving ? { duration: 0.55, ease: [0.5, 0, 0.8, 0.4] } : { type: "spring", stiffness: 160, damping: 16, delay: 0.55 }}>
        <div className="px-[calc(5*var(--p))] py-[calc(2.2*var(--p))] text-center" style={{ background: "#E9DCC0", backgroundImage: PAPER_GRAIN, color: "#2A1A10", clipPath: "polygon(1% 6%, 99% 0, 100% 30%, 98.5% 62%, 100% 96%, 0 100%, 1.5% 66%, 0 34%)", boxShadow: "0 calc(.6*var(--p)) calc(1.4*var(--p)) rgba(0,0,0,.35)" }}>
          <p className="text-[calc(2.4*var(--p))] font-semibold tracking-[0.34em] uppercase opacity-60">{s.for}</p>
          <FitName as="p" className="text-[calc(10*var(--p))] leading-[1.15]" style={{ fontFamily: SCRIPT_FONT }}>
            {name}
          </FitName>
          {sender ? (
            <FitName as="p" min={0.7} className="text-[calc(3.6*var(--p))] leading-[1.3] opacity-75" style={{ fontFamily: "var(--gift-font-hand)" }}>
              {`${s.from} ${sender}`}
            </FitName>
          ) : null}
        </div>
      </motion.div>
    </>
  );
}

/** Autumn Reel's first screen, still and under the red light, in the look the sender picked. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const look = LOOKS[readLook(fields)];
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...wallStyle(look), color: look.ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <CoverScene look={look} s={S[locale] ?? S.en} name={recipientName} sender={senderName} photos={[]} stage="covered" reduce />
    </div>
  );
}

/** A thing on the first screen: drawn (the book page, the apple, the words, the tape) or cut out (the bow, the leaves, the cats, the sunflowers). */
function Thing({ d, look, s, data, heart, wish, seed, still, open, delay }: { d: Deco; look: Look; s: Copy; data: Data; heart: GiftPhoto | undefined; wish: string; seed: number; still: boolean; open?: (photo: GiftPhoto) => void; delay: number }) {
  const leaf: Record<string, ScrapId> = { leafA: look.leaves[0], leafB: look.leaves[1], leafC: look.leaves[2] };
  const body = (() => {
    switch (d.kind) {
      case "page":
        return <BookPage heading={runningHead(data.recipientName, data.senderName, s.and)} page={12 + (seed % 186)} text={s.book} look={look} lang={data.locale} />;
      case "apple":
        return (
          <div className="relative">
            <Apple />
            <span className="absolute top-[18%] right-[4%] w-[30%] rotate-[24deg]">
              <Ladybug still={still} />
            </span>
          </div>
        );
      case "bow":
        return <Scrap id="bow-gingham" eager tone={look.bowTone} />;
      case "heart":
        return <HeartPhoto photo={heart} look={look} onOpen={open && heart ? () => open(heart) : undefined} />;
      case "tape":
        return <HeartsTape look={look} />;
      case "words":
        return <WordStrips text={wish} look={look} seed={seed + 5} size={4.3} still={still} delay={delay + 0.2} />;
      case "cats":
        return <Scrap id="cats-cuddle" eager />;
      case "sunflower":
        return <Scrap id="sunflowers-kraft" eager />;
      case "moonleaf":
        return <MoonLeaf scrap={look.leaves[1]} />;
      default:
        return <Scrap id={leaf[d.kind]} eager />;
    }
  })();
  const isLeaf = d.kind.startsWith("leaf") || d.kind === "moonleaf";
  return (
    <Piece x={d.x} y={d.y} w={d.w} rotate={d.rotate ?? 0} z={d.z ?? 5} drift={isLeaf ? 3 : 0} sway={isLeaf} entrance={d.kind === "page" ? "right" : d.kind === "tape" || d.kind === "words" ? "none" : d.kind === "heart" ? "stamp" : "bloom"} delay={delay}>
      {body}
    </Piece>
  );
}

/** A leaf pressed onto the page where it was tapped. It stays. */
type Pressed = { id: number; x: number; y: number; scrap: ScrapId; rotate: number; w: number };
const MAX_PRESSED = 12;

function Page({ look, s, data, fields, seed, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: AutumnReelFields; seed: number; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [pressed, setPressed] = useState<Pressed[]>([]);
  const pressCount = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const { frames, heart, scatter } = arrangePhotos(data.photos);
  const n = Math.min(3, Math.max(1, frames.length)) as 1 | 2 | 3;
  const spots = FRAME_SPOTS[n];
  const wish = fields.wish?.trim() || s.wish;
  const scatterSpotsList = scatterSpots(scatter.length);
  const random = useMemo(() => mulberry32(seed + 77), [seed]);

  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const songY = 30;
  const ticketY = hasSong ? (catalog ? 98 : 90) : 26;
  const middleH = (hasSong ? (catalog ? 74 : 66) : 0) + 50;
  const preview = mode === "preview";
  const open = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);

  // A tap on the page, anywhere that isn't a photo or a button, presses a leaf onto it there.
  const press = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    pressCount.current += 1;
    playPress(audio.muted);
    buzz(8);
    const leaf = { id: pressCount.current, x: (e.clientX - box.left) / unit, y: (e.clientY - box.top) / unit, scrap: look.leaves[pressCount.current % 3], rotate: Math.round((random() - 0.5) * 120), w: 12 + Math.round(random() * 7) };
    setPressed((list) => [...list, leaf].slice(-MAX_PRESSED));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={press}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(8*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first screen: the film, the book page with their names, the apple, the words and the cats */}
            <section className="relative" style={{ height: `calc(${HERO_HEIGHT[n]} * var(--p))` }}>
              {spots.map((spot, i) => {
                const photo = frames[i];
                return (
                  <Piece key={photo?.id ?? i} x={spot.x} y={spot.y} w={spot.w} rotate={spot.rotate} z={3 + i} entrance={i % 2 ? "right" : "left"} delay={0.1 + i * 0.14}>
                    <FilmDotFrame photo={photo} look={look} onOpen={open && photo ? () => open(photo) : undefined} still={still} />
                  </Piece>
                );
              })}
              {HERO_DECO[n].map((d, i) => (
                <Thing key={`${d.kind}-${i}`} d={d} look={look} s={s} data={data} heart={heart} wish={wish} seed={seed} still={still} open={open} delay={0.35 + i * 0.07} />
              ))}
              <div className="absolute z-[9]" style={{ left: `calc(${SCROLL_AT[n].x} * var(--p))`, top: `calc(${SCROLL_AT[n].y} * var(--p))`, translate: "-50% 0" }}>
                <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
              </div>
            </section>

            <div className="relative z-[9] flex justify-center px-[calc(6*var(--p))] py-[calc(3*var(--p))]">
              <WordStrips text={s.tapAnywhere} look={look} seed={seed + 11} size={3.8} align="center" still={still} />
            </div>
            <section className="relative" style={{ height: `calc(${middleH} * var(--p))` }}>
              {hasSong ? (
                <Piece x={50} y={songY} w={74} rotate={-2} z={5} entrance="right">
                  {catalog ? (
                    <PreviewMusicCard music={catalog} locale={data.locale} cover={frames[0]} live={mode !== "preview"} colors={look.card} />
                  ) : song ? (
                    <MusicCard music={song} audio={audio} cover={frames[0]} live={mode !== "preview"} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                  ) : null}
                </Piece>
              ) : null}
              <Piece x={44} y={ticketY} w={58} rotate={-5} z={6} entrance="left" delay={0.15}>
                <Ticket line={fields.ticket?.trim() || s.ticket} number={ticketNumber(seed)} paper={look.page} ink={look.pageInk} font={POSTER_FONT} />
              </Piece>
              <Piece x={86} y={ticketY - 4} w={20} rotate={18} z={5} sway entrance="bloom" delay={0.3}>
                <Scrap id={look.leaves[0]} />
              </Piece>
              <Piece x={10} y={hasSong ? songY - 22 : ticketY - 20} w={16} rotate={-20} z={6} sway entrance="bloom" delay={0.2}>
                <Scrap id={look.leaves[2]} />
              </Piece>
            </section>

            {scatter.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(scatter.length)} * var(--p))` }}>
                {scatter.map((photo, i) => (
                  <Piece key={photo.id} {...scatterSpotsList[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <FilmDotFrame photo={photo} look={look} aspect={0.9} onOpen={open ? () => open(photo) : undefined} still={still}>
                      {photo.caption ? (
                        <span className="absolute inset-x-[calc(4*var(--p))] -bottom-[calc(6*var(--p))] flex justify-center">
                          <Caption label={look.word} color={look.wordInk} size={3.4}>
                            {photo.caption}
                          </Caption>
                        </span>
                      ) : null}
                    </FilmDotFrame>
                  </Piece>
                ))}
                <Piece x={50} y={10} w={18} rotate={-16} z={6} sway entrance="bloom">
                  <Scrap id={look.leaves[1]} />
                </Piece>
                {scatter.length > 2 ? (
                  <Piece x={50} y={78} w={20} rotate={6} z={7} entrance="bloom">
                    <Scrap id="cats-kiss" />
                  </Piece>
                ) : null}
              </section>
            ) : null}

            <section className="relative mt-[calc(14*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={14} y={-3} w={26} rotate={-24} z={4} drift={4} sway entrance="left">
                <Scrap id={look.leaves[0]} />
              </Piece>
              <Piece x={84} y={0} w={22} rotate={10} z={4} entrance="bloom" delay={0.15}>
                <Scrap id="bow-gingham" tone={look.bowTone} />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, bottom: true }} color={look.page} grain={PAPER_GRAIN} depth={1.4} className="relative z-[2]">
                <article className="px-[calc(6*var(--p))] pt-[calc(13*var(--p))] pb-[calc(12*var(--p))]" style={{ color: look.pageInk }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={84} y={-4} w={24} rotate={6} z={4} entrance="bloom">
                  <Scrap id="cats-cuddle" />
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

            {/* the leaves the taps have pressed onto the page */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[40]">
              {pressed.map((leaf) => (
                <motion.div key={leaf.id} className="absolute" style={{ left: `calc(${leaf.x - leaf.w / 2} * var(--p))`, top: `calc(${leaf.y - leaf.w / 2} * var(--p))`, width: `calc(${leaf.w} * var(--p))` }} initial={{ scale: 1.7, opacity: 0, rotate: leaf.rotate - 30 }} animate={{ scale: 1, opacity: 1, rotate: leaf.rotate }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
                  <Scrap id={leaf.scrap} eager />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
