"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { appleMusicTrackUrl, backgroundMusic, isCatalogPreview } from "@/lib/gift/music";
import type { OpeningProps, TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Scrap, ScrollHint, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard } from "../_shared/collage/cards";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { BabyBreath, Doodle, HandLabel, Pearl, Washi, Watercolor } from "../_shared/collage/stationery";
import { playChime, playPaper } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { GOLD, HeldPolaroid, LipWords, Vellum, type Hold } from "./art";
import { addHeart, heartAt, LOOKS, type Heart, type Look, type LookId } from "./looks";
import { fieldsSchema, type FavoritePersonFields } from "./schema";

/** How long the tape and the tissue take to come away before the page shows, in ms. */
const OPENS_IN = 1250;
const ALL_SIDES = { top: true, right: true, bottom: true, left: true };
/** What holds each scattered polaroid, in turn. */
const HOLDS: Hold[] = ["dots", "clip", "gingham", "hearts"];

type Copy = { lift: string; for: string; memories: string; sweetest: string; title: string; fave: string; forever: string; signoff: string; tap: string; scroll: string; pause: string; play: string };

const S: Record<"en" | "es", Copy> = {
  en: { lift: "lift the tissue paper", for: "for", memories: "memories", sweetest: "sweetest memories", title: "favorite person", fave: "my fave", forever: "forever", signoff: "love you", tap: "tap anywhere to doodle a heart", scroll: "scroll", pause: "Pause the song", play: "Play the song" },
  es: { lift: "levanta el papel de seda", for: "para", memories: "recuerdos", sweetest: "los recuerdos más dulces", title: "mi persona favorita", fave: "mi fav", forever: "para siempre", signoff: "te quiero", tap: "toca donde quieras para dibujar un corazón", scroll: "desliza", pause: "Pausar la canción", play: "Reproducir la canción" },
};

type Stage = "covered" | "lifting" | "open";
type Data = TemplateProps<FavoritePersonFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<FavoritePersonFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "blush";
  const look = LOOKS[lookId];

  const [stage, setStage] = useState<Stage>(preview ? "open" : "covered");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const lift = () => {
    if (stage !== "covered") return;
    void audio.start();
    buzz(10);
    playPaper(audio.muted);
    eventRef.current?.({ type: "started" });
    setStage("lifting");
    window.setTimeout(() => playPaper(audio.muted), reduce ? 0 : 380);
    window.setTimeout(
      () => {
        setBurst((b) => b + 1);
        playChime(audio.muted);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : OPENS_IN,
    );
  };

  const replay = () => {
    setStage("covered");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.55 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.5} />
      </div>

      {/* The page fades in under the tissue as it comes away. */}
      {/* The cover goes first and the page comes after it, so the two are never seen through each other. */}
      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <motion.div key={`covered-${run}`} className="absolute inset-0 z-[11] grid place-items-center" exit={{ opacity: 0, scale: 1.08, transition: { duration: 0.38, ease: [0.5, 0, 0.75, 0] } }}>
            <Covered look={look} s={s} name={data.recipientName} photos={data.photos} lifting={stage === "lifting"} reduce={reduce} />
            <button type="button" onClick={lift} aria-label={s.lift} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-black/20 focus-visible:ring-inset" />
            <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase" style={{ background: look.accent, color: "#FFFFFF", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(80,30,50,.25)" }} initial={{ opacity: 0 }} animate={stage === "lifting" ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={stage === "lifting" ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
              {s.lift}
            </motion.p>
          </motion.div>
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={look.confetti} count={56} shape="heart" origin={{ x: 0.5, y: 0.42 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The tissue-covered page, sized to the screen: the first screen, and, drawn still, the Classic cover tile. */
function Covered({ look, s, name, photos, lifting, reduce }: { look: Look; s: Copy; name: string; photos?: GiftPhoto[]; lifting: boolean; reduce: boolean }) {
  return (
    <motion.div className="relative w-[min(calc(74*var(--p)),46cqh)]" initial={reduce ? false : { opacity: 0, y: 24, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ type: "spring", stiffness: 80, damping: 15 }}>
      <Vellum look={look} forLabel={s.for} name={name} photos={photos} lifting={lifting} reduce={reduce} />
    </motion.div>
  );
}

/** Favorite Person's first screen, still, in the colour the sender picked. */
export function Opening({ fields, recipientName, locale }: OpeningProps) {
  const parsed = fieldsSchema.safeParse(fields);
  const look = LOOKS[parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "blush"];
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.55 }} />
      <Covered look={look} s={S[locale] ?? S.en} name={recipientName} lifting={false} reduce />
    </div>
  );
}

/** Words written straight on the page in the look's ink. */
function Hand({ children, look, size, className, style }: { children: ReactNode; look: Look; size: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={className} style={{ fontFamily: SCRIPT_FONT, fontSize: `calc(${size} * var(--p))`, color: look.wallInk, lineHeight: 1.1, ...style }}>
      {children}
    </span>
  );
}

function Page({ look, s, data, fields, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: FavoritePersonFields; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const count = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|favorite-person`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const [hero, second, third] = data.photos;
  const rest = data.photos.slice(3, 10);
  const spots = scatterSpots(rest.length);
  // Music that plays under the gift gets the player card; a real song from Apple gets the same card,
  // heard only on a tap (PreviewMusicCard), and the end screen then leaves its own out.
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const heroH = second ? (hasSong ? (catalog ? 196 : 190) : 152) : hasSong ? (catalog ? 140 : 134) : 96;
  const preview = mode === "preview";
  const openPhoto = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const tone = look.tone;
  const songY = second ? 164 : 108;

  // A tap on the page, anywhere that isn't a photo or a button, draws a heart there.
  const doodle = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    count.current += 1;
    playPaper(audio.muted);
    buzz(8);
    setHearts((list) => addHeart(list, heartAt(count.current, (e.clientX - box.left) / unit, (e.clientY - box.top) / unit, seed)));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={doodle}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(10*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first page: the hero polaroid in a wash of colour, the torn note, the clipped one */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <Watercolor color={look.washes[0]} seed={seed % 89} className="top-[calc(-2*var(--p))] left-[calc(-10*var(--p))] h-[calc(96*var(--p))] w-[calc(86*var(--p))]" />
              {second ? <Watercolor color={look.washes[1]} seed={(seed % 89) + 7} className="top-[calc(88*var(--p))] left-[calc(38*var(--p))] h-[calc(70*var(--p))] w-[calc(70*var(--p))]" /> : null}

              <div className="absolute top-[calc(-4*var(--p))] right-[calc(17*var(--p))] z-[6] flex items-center gap-[calc(1.4*var(--p))]">
                <Doodle kind="arrow" color={look.wallInk} still={still} className="h-[calc(6*var(--p))] w-[calc(12*var(--p))] -scale-x-100 rotate-[14deg]" />
                <Hand look={look} size={6}>
                  {s.memories}
                </Hand>
                <Doodle kind="heart" color={look.wallInk} still={still} className="h-[calc(4.4*var(--p))] w-[calc(4.4*var(--p))]" />
              </div>

              <Piece x={20} y={30} w={40} rotate={-18} z={2} entrance="none">
                <Scrap id="paper-roses" eager shadow={false} tone={tone} style={{ opacity: 0.9 }} />
              </Piece>
              <Doodle kind="sparkle" color={GOLD} still={still} className="absolute top-[calc(16*var(--p))] left-[calc(76*var(--p))] z-[5] h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
              <Doodle kind="sparkles" color={GOLD} still={still} className="absolute top-[calc(86*var(--p))] left-[calc(84*var(--p))] z-[5] h-[calc(7*var(--p))] w-[calc(9*var(--p))]" />
              <Piece x={42} y={48} w={60} rotate={-4} z={4} entrance="drop" delay={0.2}>
                <HeldPolaroid photo={hero} look={look} hold="gingham" lip={12} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still}>
                  <Caption size={3.8} color={look.ink}>
                    {hero?.caption}
                  </Caption>
                </HeldPolaroid>
              </Piece>
              <Piece x={86} y={20} w={18} rotate={12} z={3} entrance="bloom" delay={0.5}>
                <Scrap id="sakura" eager tone={tone} />
              </Piece>
              <Piece x={84} y={50} w={24} rotate={16} z={5} entrance="bloom" delay={0.7}>
                <BabyBreath seed={seed % 41} tint={look.washi.dots} heart={look.accent} />
              </Piece>
              <Piece x={70} y={80} w={17} rotate={10} z={6} entrance="stamp" delay={0.9}>
                <Scrap id="bow-satin-pink" eager tone={tone} />
              </Piece>
              <Piece x={9} y={82} w={18} rotate={-12} z={5} entrance="bloom" delay={0.8}>
                <Scrap id="columbine" eager tone={tone} />
              </Piece>
              <Pearl size={2.6} className="top-[calc(30*var(--p))] left-[calc(6*var(--p))] z-[5]" />
              <Pearl size={2} className="top-[calc(34*var(--p))] left-[calc(9*var(--p))] z-[5]" />
              <Pearl size={2.4} className="top-[calc(70*var(--p))] left-[calc(93*var(--p))] z-[5]" />
              <Doodle kind="sparkles" color={look.accent} still={still} className="absolute top-[calc(6*var(--p))] left-[calc(4*var(--p))] z-[5] h-[calc(7*var(--p))] w-[calc(9*var(--p))]" />

              {second ? (
                <>
                  <Piece x={31} y={98} w={40} rotate={-4} z={7} entrance="stick" delay={0.2}>
                    <span className="flex justify-center">
                      <HandLabel paper={look.paper} ink={look.ink} font={SCRIPT_FONT} size={4.2}>
                        {s.sweetest}
                      </HandLabel>
                    </span>
                  </Piece>
                  <Piece x={30} y={117} w={46} rotate={-3} z={6} entrance="stick" delay={0.3}>
                    <TornPaper seed={seed + 3} sides={ALL_SIDES} color={look.paper} grain={PAPER_GRAIN} depth={4}>
                      <p className="px-[calc(4*var(--p))] pt-[calc(4*var(--p))] pb-[calc(4.4*var(--p))] text-center" style={{ color: look.ink }}>
                        <span className="text-[calc(7.4*var(--p))] leading-[1.1]" style={{ fontFamily: SCRIPT_FONT }}>
                          {fields.title?.trim() || s.title}
                        </span>
                        <Doodle kind="heart" color={look.accent} still={still} className="mx-auto mt-[calc(1*var(--p))] h-[calc(5*var(--p))] w-[calc(5*var(--p))]" />
                      </p>
                    </TornPaper>
                  </Piece>
                  <Piece x={80} y={112} w={34} rotate={14} z={3} entrance="none">
                    <Scrap id="paper-blossom" shadow={false} tone={tone} style={{ opacity: 0.9 }} />
                  </Piece>
                  <Piece x={72} y={122} w={46} rotate={5} z={5} entrance="right" delay={0.15}>
                    <HeldPolaroid photo={second} look={look} hold="clip" lip={11} onOpen={openPhoto ? () => openPhoto(second) : undefined} still={still}>
                      <LipWords look={look}>{s.fave}</LipWords>
                    </HeldPolaroid>
                  </Piece>
                  <Piece x={49} y={153} w={13} rotate={-10} z={7} entrance="bloom" delay={0.4}>
                    <Scrap id="sakura" tone={tone} />
                  </Piece>
                  <Pearl size={2.2} className="top-[calc(146*var(--p))] left-[calc(8*var(--p))] z-[5]" />
                  <Doodle kind="heart-fill" color={look.washes[0]} still={still} className="absolute top-[calc(138*var(--p))] left-[calc(12*var(--p))] z-[5] h-[calc(5*var(--p))] w-[calc(5*var(--p))]" />
                </>
              ) : null}

              {hasSong ? (
                <Piece x={46} y={catalog ? songY + 3 : songY} w={72} rotate={-2} z={8} entrance="left" delay={0.2}>
                  {catalog ? (
                    <PreviewMusicCard music={catalog} locale={data.locale} cover={hero} live={!preview} colors={look.card} />
                  ) : song ? (
                    <MusicCard music={song} audio={audio} cover={hero} live={!preview} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                  ) : null}
                </Piece>
              ) : null}
            </section>

            <div className="relative z-[9] flex flex-col items-center gap-[calc(3*var(--p))] py-[calc(5*var(--p))]">
              <Hand look={look} size={4.6} className="px-[calc(6*var(--p))] text-center">
                {s.tap}
              </Hand>
              <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
            </div>

            {/* the third photo, forever, and the bouquet */}
            {third ? (
              <section className="relative h-[calc(118*var(--p))]">
                <Watercolor color={look.washes[0]} seed={(seed % 89) + 13} className="top-[calc(4*var(--p))] left-[calc(-4*var(--p))] h-[calc(84*var(--p))] w-[calc(74*var(--p))]" />
                <Piece x={64} y={40} w={46} rotate={10} z={2} entrance="none">
                  <Scrap id="doily-pink" shadow={false} tone={tone} style={{ opacity: 0.85 }} />
                </Piece>
                <Doodle kind="sparkles" color={GOLD} still={still} className="absolute top-[calc(8*var(--p))] left-[calc(6*var(--p))] z-[5] h-[calc(7*var(--p))] w-[calc(9*var(--p))]" />
                <Piece x={38} y={50} w={54} rotate={-5} z={4} entrance="left">
                  <HeldPolaroid photo={third} look={look} hold="hearts" lip={11} onOpen={openPhoto ? () => openPhoto(third) : undefined} still={still}>
                    <LipWords look={look}>{s.forever}</LipWords>
                  </HeldPolaroid>
                </Piece>
                <Piece x={80} y={64} w={30} rotate={10} z={5} entrance="bloom" delay={0.2}>
                  <Scrap id="tulips-wrapped" tone={tone} />
                </Piece>
                <Piece x={9} y={84} w={20} rotate={-18} z={5} entrance="bloom" delay={0.3}>
                  <BabyBreath seed={(seed % 41) + 3} tint={look.washi.dots} heart={look.accent} />
                </Piece>
                <Piece x={88} y={22} w={14} rotate={8} z={4} entrance="stamp" delay={0.35}>
                  <Scrap id="bow-satin-mini" tone={tone} />
                </Piece>
                <div className="absolute top-[calc(104*var(--p))] left-[calc(30*var(--p))] z-[6] flex items-end gap-[calc(1.2*var(--p))]">
                  <Hand look={look} size={7}>
                    {fields.signoff?.trim() || s.signoff}
                  </Hand>
                  <Doodle kind="lines" color={look.wallInk} still={still} className="mb-[calc(3*var(--p))] h-[calc(4.4*var(--p))] w-[calc(5.4*var(--p))]" />
                </div>
                <Pearl size={2.4} className="top-[calc(92*var(--p))] left-[calc(66*var(--p))] z-[6]" />
                <Pearl size={1.8} className="top-[calc(95*var(--p))] left-[calc(70*var(--p))] z-[6]" />
                <Doodle kind="sparkle" color={look.accent} still={still} className="absolute top-[calc(36*var(--p))] left-[calc(70*var(--p))] z-[6] h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
              </section>
            ) : null}

            {rest.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(rest.length)} * var(--p))` }}>
                <Watercolor color={look.washes[1]} seed={(seed % 89) + 29} className="top-[calc(10*var(--p))] left-[calc(30*var(--p))] h-[calc(70*var(--p))] w-[calc(76*var(--p))]" />
                {rest.map((photo, i) => (
                  <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <HeldPolaroid photo={photo} look={look} hold={HOLDS[i % HOLDS.length]} lip={8} onOpen={openPhoto ? () => openPhoto(photo) : undefined} still={still}>
                      <Caption color={look.ink}>{photo.caption}</Caption>
                    </HeldPolaroid>
                  </Piece>
                ))}
                <Piece x={50} y={8} w={16} rotate={-10} z={7} entrance="bloom">
                  <Scrap id="columbine" tone={tone} />
                </Piece>
                <Piece x={50} y={70} w={14} rotate={12} z={7} entrance="bloom" delay={0.2}>
                  <Scrap id="sakura" tone={tone} />
                </Piece>
                {rest.length > 2 ? (
                  <Piece x={92} y={98} w={14} rotate={16} z={7} entrance="stamp" delay={0.1}>
                    <Scrap id="bow-satin-blush" tone={tone} />
                  </Piece>
                ) : null}
              </section>
            ) : null}

            {/* the letter, on a deckled card taped at the top */}
            <section className="relative mt-[calc(12*var(--p))] px-[calc(5*var(--p))]">
              <Washi pattern="gingham" color={look.washi.gingham} width={20} className="top-[calc(-1.6*var(--p))] left-[calc(8*var(--p))] z-[3] -rotate-[8deg]" />
              <Washi pattern="hearts" color={look.washi.hearts} ink={look.washi.heartsInk} width={20} className="top-[calc(-1.6*var(--p))] right-[calc(8*var(--p))] z-[3] rotate-[6deg]" />
              <TornPaper seed={seed + 9} sides={ALL_SIDES} color={look.paper} grain={PAPER_GRAIN} depth={1.6} className="z-[2]">
                <article className="px-[calc(7*var(--p))] pt-[calc(12*var(--p))] pb-[calc(12*var(--p))]" style={{ color: look.ink }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={look.accent} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={84} y={-2} w={18} rotate={-8} z={4} entrance="bloom" delay={0.2}>
                  <BabyBreath seed={(seed % 41) + 9} tint={look.washi.dots} heart={look.accent} />
                </Piece>
                <Piece x={12} y={-4} w={14} rotate={14} z={4} entrance="bloom" delay={0.3}>
                  <Scrap id="sakura" tone={tone} />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(10*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(2*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(80,30,50,.45)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(2*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(80,30,50,.45)]" style={{ background: look.card.card, color: look.card.ink }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 14px 26px -18px rgba(80,30,50,.45)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>

            {/* the hearts they have doodled, where they drew them */}
            {hearts.map((h) => (
              <div key={h.id} data-heart="" aria-hidden="true" className="pointer-events-none absolute z-[20]" style={{ left: `calc(${h.x} * var(--p))`, top: `calc(${h.y} * var(--p))`, width: `calc(${h.size} * var(--p))`, height: `calc(${h.size} * var(--p))`, translate: "-50% -50%", rotate: `${h.rotate}deg` }}>
                <Doodle kind="heart" color={look.accent} still={still} className="h-full w-full" />
              </div>
            ))}
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
