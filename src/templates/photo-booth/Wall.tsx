"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { appleMusicTrackUrl, backgroundMusic, isCatalogPreview } from "@/lib/gift/music";
import type { TemplateProps } from "../types";
import { giftString, useGiftStrings } from "../_shared/i18n";
import type { GiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScriptLines, ScrollHint, Tape, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard, Snippet, Stamp } from "../_shared/collage/cards";
import { scriptLines } from "../_shared/collage/paper";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { Badge, CurlArrow, MarkerHeart, Postmark, StampHeart, Strip } from "./art";
import { WALL, type Booth } from "./looks";
import { extraPhotos, stripFrames, type FilterId, type Frame } from "./plan";
import type { PhotoBoothFields } from "./schema";

type Words = { line: string; scroll: string; badgeTop: string; badgeBottom: string; pause: string; play: string; script: string };

const W: Record<"en" | "es", Words> = {
  en: {
    line: "my favourite person",
    scroll: "scroll",
    badgeTop: "you + me",
    badgeBottom: "x o x o",
    pause: "Pause the song",
    play: "Play the song",
    script: "i would squeeze into every booth in every city with you, fight the curtain, lose the coins, and keep every blurry second picture. four poses, and all of them are you",
  },
  es: {
    line: "mi persona favorita",
    scroll: "desliza",
    badgeTop: "tú + yo",
    badgeBottom: "x o x o",
    pause: "Pausar la canción",
    play: "Reproducir la canción",
    script: "me metería contigo en cada fotomatón de cada ciudad, pelearía con la cortina, perdería las monedas y guardaría cada segunda foto movida. cuatro poses, y en todas estás tú",
  },
};

/** The size handwriting is set at in the letter, and the height of one ruled line under it. */
const HAND_SIZE = "clamp(1.5rem, 6.4cqw, 1.85rem)";
const LINE = 1.45;

/** Crumpled cream paper: grain, two soft highlights, a shadow, and three creases catching the light. */
const CRUMPLED: CSSProperties = {
  backgroundColor: WALL.paper,
  backgroundImage: [
    PAPER_GRAIN,
    "radial-gradient(120% 70% at 12% 8%, rgba(255,255,255,.55), rgba(255,255,255,0) 55%)",
    "radial-gradient(90% 60% at 88% 62%, rgba(255,255,255,.4), rgba(255,255,255,0) 60%)",
    "radial-gradient(70% 50% at 30% 84%, rgba(120,80,50,.1), rgba(120,80,50,0) 65%)",
    "linear-gradient(118deg, rgba(0,0,0,0) 41%, rgba(120,80,50,.07) 42%, rgba(255,255,255,.28) 43%, rgba(0,0,0,0) 45%)",
    "linear-gradient(62deg, rgba(0,0,0,0) 63%, rgba(120,80,50,.06) 64%, rgba(255,255,255,.24) 65%, rgba(0,0,0,0) 67%)",
    "linear-gradient(160deg, rgba(0,0,0,0) 22%, rgba(120,80,50,.05) 23%, rgba(255,255,255,.2) 24%, rgba(0,0,0,0) 26%)",
  ].join(", "),
};

/** Ruled lines every `pitch`, and the red margin line, for a sheet sized in `--p`. */
const ruled = (pitch: number): string =>
  `repeating-linear-gradient(180deg, transparent 0 calc(${pitch} * var(--p) - 1px), ${WALL.rule} calc(${pitch} * var(--p) - 1px) calc(${pitch} * var(--p))), linear-gradient(90deg, transparent calc(9 * var(--p)), ${WALL.margin} calc(9 * var(--p)), ${WALL.margin} calc(9 * var(--p) + 1.5px), transparent calc(9 * var(--p) + 1.5px)), ${PAPER_GRAIN}`;

type Data = TemplateProps<PhotoBoothFields>["data"];

/**
 * Where the strip lands: a wall of love letters. The strip taped up between lipstick kisses and a
 * wax seal, their line in pen beside it, a teddy, envelopes and a stamp, then the letter itself in
 * handwriting on lined paper, any other photos, and the ending.
 */
export function Wall({ data, fields, booth, frames, names, date, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { data: Data; fields: PhotoBoothFields; booth: Booth; frames: Frame<GiftPhoto>[]; names: string; date: string; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: GiftAudio; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const w = W[data.locale] ?? W.en;
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const preview = mode === "preview";
  const seed = hashString(`${data.recipientName}|${data.senderName}|photo-booth`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const lines = useMemo(() => scriptLines(data.message, w.script, 14, seed, 6), [data.message, w.script, seed]);
  const filter: FilterId = fields.filter;
  const { second, pinned } = extraPhotos(data.photos);
  const secondFrames = second.length ? stripFrames(second) : null;
  const spots = scatterSpots(pinned.length);
  const song = backgroundMusic(data.music);
  // A real song from Apple gets the same card, heard only on a tap, and the end screen leaves its own out.
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const open = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const line = fields.line?.trim() || w.line;

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={CRUMPLED} />
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
          <div className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(8*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]" style={{ color: WALL.ink }}>
            {/* the strip, taped up on the wall */}
            <section className="relative h-[calc(196*var(--p))]">
              <TornPaper seed={seed + 3} sides={{ top: true, left: true, bottom: true }} color={WALL.sheet} grain={ruled(5.6)} depth={2.4} className="absolute" style={{ left: "calc(40*var(--p))", top: "calc(4*var(--p))", width: "calc(72*var(--p))", height: "calc(148*var(--p))", rotate: "3deg" }}>
                <div className="relative h-[calc(148*var(--p))]">
                  <ScriptLines lines={lines} color={WALL.script} size={3.9} font={SCRIPT_FONT} className="left-[calc(10*var(--p))]" />
                </div>
              </TornPaper>

              <Piece x={11} y={24} w={30} rotate={-24} z={2} entrance="stamp" delay={0.7}>
                <Scrap id="kiss-red" eager />
              </Piece>
              <Piece x={8} y={70} w={25} rotate={16} z={2} entrance="stamp" delay={0.85}>
                <Scrap id="kiss-3" eager />
              </Piece>
              <Piece x={12} y={114} w={23} rotate={-10} z={2} entrance="stamp" delay={1}>
                <Scrap id="kiss-dark" eager />
              </Piece>

              <Piece x={38} y={86} w={40} rotate={-4} z={5} entrance="drop" delay={0.05}>
                <Tape color={booth.tape} width={18} className="-top-[calc(2.2*var(--p))] left-[30%] z-[2] -rotate-6" />
                <div style={{ filter: "drop-shadow(0 calc(1.2*var(--p)) calc(2*var(--p)) rgba(40,12,16,.35))" }}>
                  <Strip frames={frames} filter={filter} developed names={names} date={date} ink={booth.stamp} onOpen={open} />
                </div>
              </Piece>
              <Piece x={45} y={8} w={15} rotate={-12} z={7} entrance="stamp" delay={0.5}>
                <Scrap id="wax-seal-heart" eager />
              </Piece>

              <Piece x={78} y={38} w={40} rotate={5} z={7} entrance="stick" delay={0.4}>
                <Snippet paper="#FFFDF8" ink={WALL.red} font={SCRIPT_FONT} size={4.4} className="w-full py-[calc(2.2*var(--p))]">
                  {line}
                </Snippet>
              </Piece>
              <Piece x={69} y={59} w={13} z={7} entrance="bloom" delay={0.75}>
                <CurlArrow color={WALL.red} className="block w-full" />
              </Piece>
              <Piece x={90} y={14} w={12} rotate={14} z={6} entrance="bloom" delay={0.3}>
                <Scrap id="heart-puffy" eager />
              </Piece>
              <Piece x={63} y={19} w={7} rotate={-14} z={6} entrance="stamp" delay={0.9}>
                <MarkerHeart color={WALL.red} className="block w-full" />
              </Piece>
              <Piece x={90} y={82} w={14} rotate={-10} z={7} entrance="bloom" delay={0.55}>
                <Scrap id="heart-gingham" eager />
              </Piece>
              <Piece x={79} y={115} w={32} rotate={8} z={6} entrance="right" delay={0.3}>
                <Scrap id="envelopes-pair" eager />
              </Piece>
              <Piece x={62} y={148} w={7} rotate={10} z={6} entrance="stamp" delay={0.6}>
                <MarkerHeart color={WALL.red} className="block w-full" />
              </Piece>

              <Piece x={17} y={164} w={17} rotate={-8} z={6} entrance="stamp" delay={0.2}>
                <Stamp color="#F7DDD9">
                  <StampHeart color={WALL.red} />
                </Stamp>
              </Piece>
              <Piece x={33} y={160} w={27} rotate={-6} z={7} entrance="none">
                <Postmark date={date.split(" · ").slice(0, 2).join(".")} className="block w-full opacity-50" />
              </Piece>
              <Piece x={36} y={180} w={12} rotate={12} z={6} entrance="stamp" delay={0.4}>
                <Scrap id="heart-print" />
              </Piece>
              <Piece x={75} y={169} w={46} rotate={-4} z={8} entrance="stick" delay={0.15}>
                <Scrap id="teddy-hug" />
              </Piece>

              <div className="absolute bottom-[calc(1*var(--p))] left-1/2 z-[9] -translate-x-1/2">
                <ScrollHint label={w.scroll} color={WALL.ink} hidden={moved || preview} />
              </div>
            </section>

            {/* the letter, in handwriting on lined paper */}
            <section className="relative mt-[calc(8*var(--p))] px-[calc(4*var(--p))]">
              <Piece x={10} y={2} w={24} rotate={-20} z={4} entrance="left">
                <Scrap id="tulips-wrapped" />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, bottom: true }} color={WALL.sheet} grain={PAPER_GRAIN} depth={1.4} className="z-[2]" style={{ rotate: "-0.8deg" }}>
                <Tape color={booth.tape} width={22} className="-top-[calc(1.6*var(--p))] left-[39%] z-[3] rotate-2" />
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[calc(8.5*var(--p))] w-[1.5px]" style={{ background: WALL.margin }} />
                {[22, 50, 78].map((top) => (
                  <span key={top} aria-hidden="true" className="pointer-events-none absolute left-[calc(3*var(--p))] size-[calc(2.6*var(--p))] rounded-full" style={{ top: `${top}%`, background: WALL.paper, boxShadow: "inset 0 1px 2px rgba(60,30,20,.35)" }} />
                ))}
                <article
                  className="relative pt-[calc(13*var(--p))] pr-[calc(6*var(--p))] pb-[calc(13*var(--p))] pl-[calc(12*var(--p))]"
                  style={{
                    fontSize: HAND_SIZE,
                    lineHeight: LINE,
                    backgroundImage: `linear-gradient(180deg, transparent calc(${LINE}em - 0.34em), ${WALL.rule} calc(${LINE}em - 0.34em), ${WALL.rule} calc(${LINE}em - 0.34em + 1px), transparent calc(${LINE}em - 0.34em + 1px))`,
                    backgroundSize: `100% ${LINE}em`,
                    backgroundPosition: "0 calc(13 * var(--p))",
                    backgroundRepeat: "repeat-y",
                    backgroundOrigin: "border-box",
                  }}
                >
                  <p className="leading-[inherit] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", color: WALL.red }}>
                    {giftString(data.locale, "dear", { name: data.recipientName })}
                  </p>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" greeting={null} ornament={false} accent={WALL.red} className="[&_p+p]:!mt-[1.45em] [&>div:first-of-type]:!mt-0" />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={86} y={-6} w={17} rotate={10} z={4} entrance="stamp" delay={0.2}>
                  <Scrap id="wax-seal-heart" />
                </Piece>
                <Piece x={16} y={-2} w={22} rotate={-14} z={4} entrance="stamp" delay={0.35}>
                  <Scrap id="kiss-2" />
                </Piece>
              </div>
            </section>

            {/* four more photos print a second strip */}
            {secondFrames ? (
              <section className="relative mt-[calc(12*var(--p))] h-[calc(136*var(--p))]">
                <Piece x={34} y={66} w={36} rotate={4} z={4} entrance="left">
                  <Tape color={booth.tape} width={16} className="-top-[calc(2*var(--p))] left-[30%] z-[2] rotate-3" />
                  <div style={{ filter: "drop-shadow(0 calc(1.2*var(--p)) calc(2*var(--p)) rgba(40,12,16,.35))" }}>
                    <Strip frames={secondFrames} filter={filter} developed names={names} date={date} ink={booth.stamp} onOpen={open} />
                  </div>
                </Piece>
                <Piece x={77} y={42} w={40} rotate={6} z={3} entrance="right">
                  <Scrap id="penguins-plush" />
                </Piece>
                <Piece x={80} y={98} w={24} rotate={-8} z={3} entrance="bloom" delay={0.2}>
                  <Scrap id="sunflowers-kraft" />
                </Piece>
                <Piece x={60} y={124} w={7} rotate={8} z={5} entrance="stamp" delay={0.4}>
                  <MarkerHeart color={WALL.red} className="block w-full" />
                </Piece>
              </section>
            ) : null}

            {/* and the rest are pinned up */}
            {pinned.length ? (
              <section className="relative mt-[calc(10*var(--p))]" style={{ height: `calc(${scatterHeight(pinned.length)} * var(--p))` }}>
                {pinned.map((photo, i) => (
                  <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <Tape color={booth.tape} width={14} className="-top-[calc(1.8*var(--p))] left-[34%] z-[2] -rotate-3" />
                    <Polaroid photo={photo} lip={9} onOpen={open ? () => open(photo) : undefined} still={still}>
                      <Caption>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}
                <Piece x={50} y={9} w={20} rotate={-12} z={7} entrance="stamp">
                  <Scrap id="kiss-4" />
                </Piece>
                <Piece x={92} y={24} w={12} rotate={14} z={6} entrance="bloom" delay={0.2}>
                  <Scrap id="heart-puffy" />
                </Piece>
                {pinned.length > 2 ? (
                  <Piece x={10} y={96} w={8} rotate={-10} z={6} entrance="stamp" delay={0.3}>
                    <MarkerHeart color={WALL.red} className="block w-full" />
                  </Piece>
                ) : null}
              </section>
            ) : null}

            {/* a badge, the penguins, and the song on a little player */}
            <section className="relative mt-[calc(10*var(--p))] h-[calc(64*var(--p))]">
              <Piece x={22} y={30} w={30} rotate={-9} z={4} entrance="stamp">
                <Badge top={w.badgeTop} bottom={w.badgeBottom} color={WALL.red} />
              </Piece>
              {secondFrames ? (
                <Piece x={74} y={30} w={34} rotate={7} z={3} entrance="right" delay={0.15}>
                  <Scrap id="heart-gingham" />
                </Piece>
              ) : (
                <Piece x={72} y={32} w={42} rotate={5} z={3} entrance="right" delay={0.15}>
                  <Scrap id="penguins-plush" />
                </Piece>
              )}
              <Piece x={47} y={50} w={7} rotate={-8} z={5} entrance="stamp" delay={0.3}>
                <MarkerHeart color={WALL.red} className="block w-full" />
              </Piece>
            </section>

            <div className="relative z-[2] mt-[calc(6*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {song?.title || catalog ? (
                <div className="relative" style={{ rotate: "-1.5deg" }}>
                  <Tape color={booth.tape} width={16} className="-top-[calc(1.8*var(--p))] left-[40%] z-[2] rotate-2" />
                  {catalog ? (
                    <PreviewMusicCard music={catalog} locale={data.locale} cover={data.photos[0]} live={!preview} colors={{ card: "#FFFDF8", ink: WALL.ink, soft: "#9A6A70", bar: WALL.red }} />
                  ) : song ? (
                    <MusicCard music={song} audio={audio} cover={data.photos[0]} live={!preview} labels={{ pause: w.pause, play: w.play }} colors={{ card: "#FFFDF8", ink: WALL.ink, soft: "#9A6A70", bar: WALL.red }} />
                  ) : null}
                </div>
              ) : null}
              {data.countdown ? (
                <div className="rounded-[calc(2*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="relative rounded-[calc(2*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: WALL.pink, backgroundImage: PAPER_GRAIN }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN, boxShadow: "0 14px 26px -18px rgba(0,0,0,.45)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
