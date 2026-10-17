"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { FitName } from "../_shared/FitName";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScriptLines, ScrollHint, Tape, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, Postcard, PreviewMusicCard, Snippet, Stamp, Ticket } from "../_shared/collage/cards";
import { gingham, scriptLines, ticketNumber } from "../_shared/collage/paper";
import { playChime, playPaper, playRibbon } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { CoverBits, FilmFrame, FilmStrip, Gust, KraftTag, LeafHeap, leafPile, type Leaf } from "./art";
import { arrangePhotos, LOOKS, stripHeight, type Look, type LookId } from "./looks";
import { fieldsSchema, type SpookySeasonFields } from "./schema";

type Copy = { blow: string; for: string; from: string; scroll: string; note: string; label: string; ticket: string; loveYou: string; pause: string; play: string; script: string };

const S: Record<"en" | "es", Copy> = {
  en: { blow: "tap to blow the leaves", for: "for", from: "from", scroll: "scroll", note: "you're the only one i'd watch scary movies with", label: "be my boo", ticket: "admit two: haunted house", loveYou: "i love you", pause: "Pause the song", play: "Play the song", script: "my favourite season, my favourite person. pumpkins, scary films, your hoodie on me, and you, always you, every october" },
  es: { blow: "toca para soplar las hojas", for: "para", from: "de", scroll: "desliza", note: "eres la única persona con la que vería pelis de miedo", label: "mi calabacita", ticket: "pase: casa del terror", loveYou: "te quiero", pause: "Pausar la canción", play: "Reproducir la canción", script: "mi estación favorita, mi persona favorita. calabazas, pelis de miedo, tu sudadera puesta, y tú, siempre tú, cada octubre" },
};

/**
 * covered: the heap, waiting. blowing: the gust takes the leaves. revealing: most are gone, and the
 * page comes in under the last of them. open: the cover is gone.
 */
type Stage = "covered" | "blowing" | "revealing" | "open";

/** From the tap: when the page starts to come in (the heap's left and middle gone), and when the cover goes. */
const REVEAL_AT = 650;
const OPEN_AT = 1700;
type Data = TemplateProps<SpookySeasonFields>["data"];

const ALL_SIDES = { top: true, right: true, bottom: true, left: true };

/** The page: the look's colour, its gingham when it has one, and paper grain over both. */
const wallStyle = (look: Look): CSSProperties => ({ backgroundColor: look.wall, ...(look.check ? gingham(look.check, "calc(6.25*var(--p))") : {}) });

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<SpookySeasonFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "pumpkin";
  const look = LOOKS[lookId];
  const seed = hashString(`${data.recipientName}|${data.senderName}|spooky-season`);
  const leaves = useMemo(() => leafPile(seed, look.leaves), [seed, look.leaves]);

  const [stage, setStage] = useState<Stage>(preview ? "open" : "covered");
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const blow = () => {
    if (stage !== "covered") return;
    void audio.start();
    // The gust first, then the leaves rustling off.
    playRibbon(audio.muted);
    window.setTimeout(() => playPaper(audio.muted), reduce ? 0 : 160);
    buzz(14);
    eventRef.current?.({ type: "started" });
    setStage("blowing");
    window.setTimeout(() => {
      playChime(audio.muted);
      setStage("revealing");
    }, reduce ? 120 : REVEAL_AT);
    window.setTimeout(
      () => {
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : OPEN_AT,
    );
  };

  const replay = () => {
    setStage("covered");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ color: look.ink, fontFamily: "var(--gift-font-body)", ...wallStyle(look), ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: look.dark ? 0.35 : 0.5 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.75} />
      </div>

      {/* The page comes in once the gust has cleared most of the heap, so it assembles on a bare wall
          instead of showing through half-gone leaves, and its name never sits under the departing tag. */}
      {stage === "revealing" || stage === "open" ? <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} seed={seed} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      {stage !== "open" ? <Covered key={`covered-${run}`} look={look} s={s} data={data} leaves={leaves} blowing={stage === "blowing" || stage === "revealing"} reduce={reduce} onBlow={blow} /> : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The heap of leaves over the page, waiting for the tap that blows it away. */
function Covered({ look, s, data, leaves, blowing, reduce, onBlow }: { look: Look; s: Copy; data: Data; leaves: Leaf[]; blowing: boolean; reduce: boolean; onBlow: () => void }) {
  return (
    <div className={blowing ? "pointer-events-none absolute inset-0 z-20" : "absolute inset-0 z-20"}>
      <CoverScene look={look} s={s} name={data.recipientName} sender={data.senderName} leaves={leaves} blowing={blowing} reduce={reduce} />
      {blowing ? null : <button type="button" onClick={onBlow} aria-label={s.blow} className="absolute inset-0 z-[30] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />}
      <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[28] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm" style={{ background: look.dark ? "rgba(20,12,8,.55)" : "rgba(255,255,255,.86)", color: look.dark ? look.wallInk : look.accent, boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(60,25,8,.22)" }} initial={{ opacity: 0 }} animate={blowing ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={blowing ? { duration: 0.2 } : { opacity: { delay: 1, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
        {s.blow}
      </motion.p>
    </div>
  );
}

/**
 * The first screen: their name on a kraft tag hanging over a heap of real leaves, the moon above
 * and the cat at the edge. Drawn still, it is the Classic tile in the editor's cover picker.
 */
function CoverScene({ look, s, name, sender, leaves, blowing, reduce }: { look: Look; s: Copy; name: string; sender: string; leaves: Leaf[]; blowing: boolean; reduce: boolean }) {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 45% at 50% 72%, ${look.dark ? "rgba(242,140,40,.16)" : "rgba(255,255,255,.5)"}, transparent 75%)` }} />
      <CoverBits look={look} blowing={blowing} reduce={reduce} />
      {blowing && !reduce ? <Gust dark={look.dark} /> : null}
      {/* The tag swings hard on its string as the gust hits it, then the wind carries it up and away. */}
      <motion.div
        className="absolute top-0 left-1/2 z-[25] w-[calc(46*var(--p))] origin-top"
        style={{ x: "-50%" }}
        initial={reduce ? false : { y: "-40%", opacity: 0 }}
        animate={blowing ? (reduce ? { opacity: 0 } : { x: ["-50%", "-48%", "-20%"], y: ["0%", "3%", "-150%"], rotate: [0, 24, 52], opacity: [1, 1, 1, 0] }) : { x: "-50%", y: 0, opacity: 1, rotate: reduce ? 2 : [-3, 3, -3] }}
        transition={blowing ? (reduce ? { duration: 0.2 } : { duration: 0.9, delay: 0.08, times: [0, 0.38, 1], ease: ["easeOut", [0.5, 0, 0.75, 0.4]], opacity: { duration: 0.9, delay: 0.08, times: [0, 0.5, 0.92, 1] } }) : { y: { type: "spring", stiffness: 60, damping: 10, delay: 0.3 }, opacity: { delay: 0.3, duration: 0.4 }, rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
      >
        <span aria-hidden="true" className="mx-auto block w-px" style={{ height: "max(13cqh, calc(14*var(--p)))", background: look.tag.string, opacity: 0.8 }} />
        <KraftTag look={look} forLabel={s.for} name={name} from={sender ? `${s.from} ${sender}` : ""} />
      </motion.div>
      <LeafHeap leaves={leaves} blowing={blowing} reduce={reduce} />
    </>
  );
}

/** Spooky Season's first screen, still, in the season the sender picked. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const parsed = fieldsSchema.safeParse(fields);
  const look = LOOKS[parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "pumpkin"];
  const leaves = leafPile(hashString(`${recipientName}|${senderName}|spooky-season`), look.leaves);
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ ...wallStyle(look), color: look.ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <CoverScene look={look} s={S[locale] ?? S.en} name={recipientName} sender={senderName} leaves={leaves} blowing={false} reduce />
    </div>
  );
}

function Page({ look, s, data, fields, seed, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: SpookySeasonFields; seed: number; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const lines = useMemo(() => scriptLines(data.message, s.script, 16, seed), [data.message, s.script, seed]);
  const { hero, strip, scatter } = arrangePhotos(data.photos);
  const spots = scatterSpots(scatter.length);
  const slot = look.slots;
  // Music that plays under the gift gets the player card; a real song from Apple gets the same card,
  // heard only on a tap (PreviewMusicCard), and the end screen then leaves its own out.
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  // An Apple song's card carries the link and Apple's credit too, so it stands a little taller.
  const postcardY = hasSong ? (catalog ? 172 : 166) : 134;
  const heroH = postcardY + 26;
  const stripH = Math.max(stripHeight(strip.length) + 14, 128);
  const preview = mode === "preview";
  const open = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const sheet = (n: number, sides = ALL_SIDES) => ({ seed: seed + n, sides, color: look.scriptPaper, grain: PAPER_GRAIN, depth: 4 });

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
          <div className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(9*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first screen: the two of them on film, under the moon */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <TornPaper {...sheet(1)} className="absolute" style={{ left: "calc(-9*var(--p))", top: "calc(-16*var(--p))", width: "calc(66*var(--p))", height: "calc(65*var(--p))", rotate: "-3deg" }}>
                <div className="relative h-[calc(65*var(--p))]">
                  <ScriptLines lines={lines.slice(0, 8)} color={look.scriptInk} font={SCRIPT_FONT} />
                </div>
              </TornPaper>
              <TornPaper {...sheet(2)} className="absolute" style={{ left: "calc(54*var(--p))", top: "calc(92*var(--p))", width: "calc(58*var(--p))", height: `calc(${heroH - 84} * var(--p))`, rotate: "2deg" }}>
                <div className="relative" style={{ height: `calc(${heroH - 84} * var(--p))` }}>
                  <ScriptLines lines={lines.slice(8)} color={look.scriptInk} font={SCRIPT_FONT} />
                </div>
              </TornPaper>

              <Piece x={86} y={17} w={32} z={2} drift={3} entrance="bloom" delay={0.05}>
                <Scrap id={slot.sky} eager />
              </Piece>
              <Piece x={15} y={13} w={2.6} z={4} sway entrance="drop" delay={0.45}>
                <Scrap id="star-charm" eager shadow={false} />
              </Piece>

              <Piece x={50} y={11} w={52} rotate={-3} z={3} entrance="drop" delay={0.1}>
                <TornPaper seed={seed + 5} sides={ALL_SIDES} color={look.paper} grain={PAPER_GRAIN} depth={5}>
                  <p className="px-[calc(4*var(--p))] pt-[calc(2.6*var(--p))] pb-[calc(3*var(--p))] text-center" style={{ color: look.ink }}>
                    <span className="block text-[calc(2.3*var(--p))] font-semibold tracking-[0.36em] uppercase opacity-55">{s.for}</span>
                    <FitName className="text-[calc(11*var(--p))] leading-[1.1]" style={{ fontFamily: SCRIPT_FONT }}>
                      {data.recipientName}
                    </FitName>
                  </p>
                </TornPaper>
              </Piece>

              <Piece x={53} y={67} w={66} rotate={-3} z={4} entrance="drop" delay={0.35}>
                <Tape color={look.tape} width={20} className="-top-[calc(2*var(--p))] left-[36%] z-[1] -rotate-3" />
                <FilmFrame photo={hero} look={look} number={13} onOpen={open && hero ? () => open(hero) : undefined} still={still} />
              </Piece>
              {hero?.caption ? (
                <Piece x={50} y={104} w={44} rotate={3} z={9} entrance="stick" delay={0.9}>
                  <span className="flex justify-center">
                    <Caption label={look.paper} color={look.ink} size={3.6}>
                      {hero.caption}
                    </Caption>
                  </span>
                </Piece>
              ) : null}

              <Piece x={11} y={50} w={32} rotate={-16} z={5} drift={4} sway entrance="left" delay={0.55}>
                <Scrap id={slot.leafA} eager />
              </Piece>
              <Piece x={89} y={47} w={22} rotate={10} z={6} entrance="bloom" delay={0.8}>
                <Scrap id={slot.flutter} eager />
              </Piece>
              <Piece x={9} y={86} w={18} rotate={-14} z={6} entrance="bloom" delay={0.85}>
                <Scrap id={slot.treat} eager />
              </Piece>
              <Piece x={87} y={108} w={29} rotate={6} z={7} entrance="right" delay={0.7}>
                <Scrap id={slot.cat} eager />
              </Piece>
              <Piece x={21} y={114} w={38} rotate={-12} z={7} entrance="left" delay={0.95}>
                <Ticket line={fields.ticket?.trim() || s.ticket} number={ticketNumber(seed)} paper={look.paper} ink={look.ink} font={POSTER_FONT} />
              </Piece>

              {hasSong ? (
                <Piece x={63} y={135} w={66} rotate={2} z={8} entrance="right" delay={0.2}>
                  {catalog ? (
                    <PreviewMusicCard music={catalog} locale={data.locale} cover={hero} live={mode !== "preview"} colors={look.card} />
                  ) : song ? (
                    <MusicCard music={song} audio={audio} cover={hero} live={mode !== "preview"} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                  ) : null}
                </Piece>
              ) : null}

              <Piece x={36} y={postcardY} w={66} rotate={-4} z={6} entrance="left" delay={0.3}>
                <Postcard
                  paper={look.paper}
                  ink={look.ink}
                  stamp={
                    <Stamp color={look.scriptPaper}>
                      <span className="block w-[78%]">
                        <Scrap id={slot.round} eager shadow={false} />
                      </span>
                    </Stamp>
                  }
                >
                  {fields.note?.trim() || s.note}
                </Postcard>
              </Piece>
              <Piece x={88} y={postcardY + 6} w={17} rotate={8} z={7} entrance="bloom" delay={0.5}>
                <Scrap id={slot.light} eager />
              </Piece>
              <Piece x={6} y={postcardY - 14} w={22} rotate={20} z={7} entrance="bloom" delay={0.6}>
                <Scrap id={slot.leafB} eager />
              </Piece>

              <div className="absolute right-[calc(6*var(--p))] z-[9]" style={{ top: `calc(${heroH - 12} * var(--p))` }}>
                <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
              </div>
            </section>

            {/* the film strip: three more, frame by frame */}
            {strip.length ? (
              <section className="relative" style={{ height: `calc(${stripH} * var(--p))` }}>
                <Piece x={31} y={stripHeight(strip.length) / 2 + 8} w={48} rotate={-2} z={3} entrance="stick">
                  <FilmStrip photos={strip} look={look} first={14} onOpen={open} still={still} />
                </Piece>
                <Piece x={76} y={31} w={40} rotate={8} z={2} entrance="bloom">
                  <Scrap id={slot.sign} />
                </Piece>
                <Piece x={79} y={70} w={30} rotate={-6} z={3} entrance="bloom" delay={0.1}>
                  <Scrap id={slot.round} />
                </Piece>
                <Piece x={73} y={99} w={46} rotate={-5} z={5} entrance="stick" delay={0.25}>
                  <Snippet paper={look.paper} ink={look.ink} font={SCRIPT_FONT} size={5.6} className="w-full">
                    {fields.label?.trim() || s.label}
                  </Snippet>
                </Piece>
                {strip.length >= 3 ? (
                  <Piece x={80} y={126} w={21} rotate={6} z={3} entrance="stick" delay={0.1}>
                    <Scrap id={slot.drink} />
                  </Piece>
                ) : null}
                <Piece x={7} y={stripHeight(strip.length) + 6} w={22} rotate={-18} z={5} entrance="bloom" delay={0.3}>
                  <Scrap id={slot.leafC} />
                </Piece>
              </section>
            ) : null}

            {/* the rest of the photos, scattered in pairs */}
            {scatter.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(scatter.length)} * var(--p))` }}>
                <TornPaper {...sheet(3)} className="absolute" style={{ left: "calc(-8*var(--p))", top: "calc(8*var(--p))", width: "calc(60*var(--p))", height: "calc(70*var(--p))", rotate: "4deg" }}>
                  <div className="relative h-[calc(70*var(--p))]">
                    <ScriptLines lines={lines.slice(3, 13)} color={look.scriptInk} font={SCRIPT_FONT} />
                  </div>
                </TornPaper>
                {scatter.map((photo, i) => {
                  const dark = i % 3 === 1;
                  return (
                    <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                      <Polaroid photo={photo} lip={8} paper={dark ? look.film : look.paper} onOpen={open ? () => open(photo) : undefined} still={still}>
                        <Caption color={dark ? "#F7EDE6" : look.ink}>{photo.caption}</Caption>
                      </Polaroid>
                    </Piece>
                  );
                })}
                <Piece x={50} y={9} w={20} rotate={-10} z={6} entrance="stamp">
                  <Scrap id={slot.leafB} />
                </Piece>
                <Piece x={93} y={24} w={17} rotate={16} z={6} entrance="bloom" delay={0.2}>
                  <Scrap id={slot.treat} />
                </Piece>
                {scatter.length > 2 ? (
                  <>
                    <Piece x={50} y={74} w={34} rotate={4} z={7} entrance="stick">
                      <Snippet paper={look.paper} ink={look.accent} font={SCRIPT_FONT} size={5.4} className="w-full">
                        {s.loveYou}
                      </Snippet>
                    </Piece>
                    <Piece x={8} y={94} w={24} rotate={-20} z={6} drift={4} entrance="bloom">
                      <Scrap id={slot.leafA} />
                    </Piece>
                  </>
                ) : null}
              </section>
            ) : null}

            {/* the letter */}
            <section className="relative mt-[calc(10*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={10} y={-2} w={36} rotate={-24} z={4} drift={5} sway entrance="left">
                <Scrap id={slot.leafA} />
              </Piece>
              <Piece x={90} y={3} w={22} rotate={14} z={4} entrance="bloom" delay={0.15}>
                <Scrap id={slot.flutter} />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, bottom: true }} color={look.paper} grain={PAPER_GRAIN} depth={1.4} className="z-[2]">
                <article className="px-[calc(6*var(--p))] pt-[calc(15*var(--p))] pb-[calc(12*var(--p))]" style={{ color: look.ink }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={87} y={-3} w={17} rotate={8} z={4} entrance="bloom">
                  <Scrap id={slot.light} />
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
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
