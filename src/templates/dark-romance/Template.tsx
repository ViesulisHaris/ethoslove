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
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScrollHint, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard, Snippet } from "../_shared/collage/cards";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { RansomRows } from "../_shared/collage/ransom";
import { playChime, playClasp, playPaper, playSealCrack } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { CoverBits, Diary, HeartScribble, OPEN_AT, OPEN_FOR, TarotCard } from "./art";
import { addRose, LOOKS, roseAt, type Look, type LookId, type Rose } from "./looks";
import { fieldsSchema, type DarkRomanceFields } from "./schema";

const TYPEWRITER = "'Courier New', ui-monospace, monospace";

/** The numeral on the tarot card the second photo is printed on: VI is The Lovers. */
const LOVERS = "VI";

/** How long the key, the lock and the cover take before the page shows, in ms: the open diary holds a beat. */
const OPENS_IN = 2250;

/** The ink on the page's dark polaroids. */
const ON_BLACK = "#F7EDE6";

type Copy = { turn: string; for: string; secret: string; diary: string; headline: string; tap: string; scroll: string; card: string; bet: string; key: string; pause: string; play: string };

const S: Record<"en" | "es", Copy> = {
  en: { turn: "turn the key", for: "for", secret: "for your eyes only", diary: "our story", headline: "only you", tap: "tap anywhere to leave a rose", scroll: "scroll", card: "the lovers", bet: "i'd bet on us", key: "you have the key", pause: "Pause the song", play: "Play the song" },
  es: { turn: "gira la llave", for: "para", secret: "solo para tus ojos", diary: "nuestra historia", headline: "solo tú", tap: "toca donde quieras para dejar una rosa", scroll: "desliza", card: "los enamorados", bet: "apostaría por nosotros", key: "tienes la llave", pause: "Pausar la canción", play: "Reproducir la canción" },
};

type Stage = "locked" | "opening" | "open";
type Data = TemplateProps<DarkRomanceFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<DarkRomanceFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "bordeaux";
  const look = LOOKS[lookId];

  const [stage, setStage] = useState<Stage>(preview ? "open" : "locked");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const unlock = () => {
    if (stage !== "locked") return;
    void audio.start();
    buzz(12);
    eventRef.current?.({ type: "started" });
    setStage("opening");
    // Timed to the diary: the key going in and turning, the lock giving way, the cover lifting.
    const after = (ms: number, play: (muted: boolean) => void) => window.setTimeout(() => play(audio.muted), reduce ? 0 : ms);
    after(540, playClasp);
    after(880, playSealCrack);
    after(1120, playPaper);
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
    setStage("locked");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.paperInk, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: look.dark ? 0.3 : 0.55 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={look.dark ? 0.6 : 0.45} />
      </div>

      {/* The page fades in under the diary as it goes, as if you had leant into the first page. */}
      {/* The diary goes first, as if you leaned into its open page, and the page comes after it, so the
          two are never seen through each other. */}
      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <motion.div key={`locked-${run}`} className="absolute inset-0 z-[11] grid place-items-center" exit={{ opacity: 0, scale: 1.28, transition: { duration: 0.42, ease: [0.5, 0, 0.75, 0] } }}>
            <Locked look={look} s={s} name={data.recipientName} opening={stage === "opening"} reduce={reduce} />
            <button type="button" onClick={unlock} aria-label={s.turn} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
            <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm" style={{ background: look.dark ? look.diary.foil : look.red, color: look.dark ? "#2A0E15" : "#FFF5F0", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(20,4,8,.35)" }} initial={{ opacity: 0 }} animate={stage === "opening" ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={stage === "opening" ? { duration: 0.2 } : { opacity: { delay: 1.1, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
              {s.turn}
            </motion.p>
          </motion.div>
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={look.confetti} count={64} shape="petal" origin={{ x: 0.5, y: 0.45 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/**
 * The locked diary on its page with the roses, the moth and the candles round it: the first screen,
 * and, drawn still, the Classic tile in the editor's cover picker.
 */
function Locked({ look, s, name, opening, reduce }: { look: Look; s: Copy; name: string; opening: boolean; reduce: boolean }) {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(64% 42% at 50% 50%, ${look.dark ? "rgba(214,40,70,.22)" : "rgba(255,255,255,.6)"}, transparent 74%)` }} />
      <CoverBits look={look} opening={opening} reduce={reduce} />
      {/* As the cover swings, the book slides right and settles back a little, so the open spread (the
          inside of the cover and the page with the rose) sits in the middle instead of off the left edge. */}
      <motion.div
        className="relative w-[min(calc(62*var(--p)),40cqh)] origin-left"
        initial={reduce ? false : { opacity: 0, y: 30, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: opening && !reduce ? 0 : -2, x: opening && !reduce ? "50%" : "0%", scale: opening && !reduce ? 0.7 : 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 14, x: { delay: OPEN_AT, duration: OPEN_FOR, ease: [0.55, 0.02, 0.32, 1] }, scale: { delay: OPEN_AT, duration: OPEN_FOR, ease: [0.55, 0.02, 0.32, 1] }, rotate: opening ? { delay: OPEN_AT, duration: OPEN_FOR } : { type: "spring", stiffness: 80, damping: 14 } }}
      >
        <motion.p className="mb-[calc(6*var(--p))] text-center text-[calc(6.4*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT, color: look.dark ? look.diary.foil : look.red, textShadow: `0 0 calc(1.2*var(--p)) ${look.wall}, 0 0 calc(2.6*var(--p)) ${look.wall}` }} animate={{ opacity: opening ? 0 : 1 }} transition={{ duration: 0.3, delay: opening && !reduce ? 0.8 : 0 }}>
          {s.secret}
        </motion.p>
        <Diary look={look} forLabel={s.for} name={name} title={s.diary} opening={opening} reduce={reduce} />
      </motion.div>
    </>
  );
}

/** Dark Romance's first screen, still, in the mood the sender picked. */
export function Opening({ fields, recipientName, locale }: OpeningProps) {
  const parsed = fieldsSchema.safeParse(fields);
  const look = LOOKS[parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "bordeaux"];
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.paperInk, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: look.dark ? 0.3 : 0.55 }} />
      <Locked look={look} s={S[locale] ?? S.en} name={recipientName} opening={false} reduce />
    </div>
  );
}

function Page({ look, s, data, fields, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: DarkRomanceFields; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [roses, setRoses] = useState<Rose[]>([]);
  const count = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|dark-romance`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const rows = useMemo(() => (fields.headline?.trim() || s.headline).split(/\s+/).filter(Boolean).slice(0, 3), [fields.headline, s.headline]);
  const letter = Math.min(10.5, 56 / Math.max(1, ...rows.map((r) => r.length)) - 1);
  const [hero, second, third] = data.photos;
  const rest = data.photos.slice(3, 10);
  const spots = scatterSpots(rest.length);
  const flower = look.flowers;
  // Music that plays under the gift gets the player card; a real song from Apple gets the same card,
  // heard only on a tap (PreviewMusicCard), and the end screen then leaves its own out.
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const heroH = hasSong ? (catalog ? 178 : 172) : 138;
  const pairH = third ? 198 : second ? 100 : 0;
  const preview = mode === "preview";
  const openPhoto = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);

  // A tap on the page, anywhere that isn't a photo or a button, leaves a rose there.
  const leaveRose = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    count.current += 1;
    playPaper(audio.muted);
    buzz(8);
    setRoses((list) => addRose(list, roseAt(count.current, (e.clientX - box.left) / unit, (e.clientY - box.top) / unit, seed, look.roses)));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={leaveRose}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(9*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first screen: the cut-out words, and the two of them between dark roses */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <Piece x={80} y={20} w={72} rotate={180} z={1} drift={4} entrance="none">
                <Scrap id="lace-red" shadow={false} eager style={{ opacity: look.lace }} />
              </Piece>
              <div className="absolute top-[calc(1*var(--p))] left-[calc(5*var(--p))] z-[5]">
                <RansomRows rows={rows} size={letter} tiles={look.tiles} seed={seed % 83} className="!items-start" />
              </div>

              <Piece x={15} y={46} w={36} rotate={-14} z={3} drift={3} entrance="bloom" delay={0.15}>
                <Scrap id={flower.big} eager />
              </Piece>
              <Piece x={48} y={80} w={64} rotate={-4} z={4} entrance="drop" delay={0.3}>
                <Polaroid photo={hero} lip={14} paper={look.paper} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still}>
                  <span className="flex w-full items-center gap-[calc(2*var(--p))]">
                    <span className="min-w-0 flex-1 text-left">
                      <Caption size={3.7} color={look.paperInk}>
                        {hero?.caption}
                      </Caption>
                    </span>
                    <HeartScribble color={look.red} still={still} className="h-[calc(8*var(--p))] w-[calc(19*var(--p))] shrink-0" />
                  </span>
                </Polaroid>
              </Piece>
              <Piece x={80} y={42} w={27} rotate={14} z={6} entrance="bloom" delay={0.7}>
                <Scrap id={flower.rose} eager />
              </Piece>
              <Piece x={92} y={57} w={14} rotate={-12} z={7} entrance="bloom" delay={0.85}>
                <Scrap id={flower.small} eager />
              </Piece>
              <Piece x={89} y={98} w={22} rotate={10} z={6} entrance="stick" delay={1}>
                <Scrap id="heart-sculpture" eager />
              </Piece>
              <Piece x={13} y={113} w={20} rotate={-16} z={7} entrance="stamp" delay={1.15}>
                <Scrap id="wax-seal-flower" eager />
              </Piece>
              <Piece x={85} y={127} w={34} rotate={22} z={3} entrance="bloom" delay={0.5}>
                <Scrap id={flower.spray} eager />
              </Piece>
              <Piece x={22} y={hasSong ? 137 : 129} w={38} rotate={-5} z={5} entrance="left" delay={0.4}>
                <Scrap id="candles-melted" eager />
              </Piece>

              {hasSong ? (
                <Piece x={57} y={catalog ? 153 : 149} w={70} rotate={2} z={8} entrance="right" delay={0.2}>
                  {catalog ? (
                    <PreviewMusicCard music={catalog} locale={data.locale} cover={hero} live={!preview} colors={look.card} />
                  ) : song ? (
                    <MusicCard music={song} audio={audio} cover={hero} live={!preview} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                  ) : null}
                </Piece>
              ) : null}
            </section>

            <div className="relative z-[9] flex flex-col items-center gap-[calc(3*var(--p))] py-[calc(5*var(--p))]">
              <p className="px-[calc(6*var(--p))] text-center text-[calc(4.6*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT, color: look.dark ? look.wallInk : look.red }}>
                {s.tap}
              </p>
              <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
            </div>

            {/* the second photo on a tarot card, the bet beside it, and the third on black */}
            {second ? (
              <section className="relative" style={{ height: `calc(${pairH} * var(--p))` }}>
                <Piece x={31} y={48} w={54} rotate={-6} z={4} entrance="left">
                  <TarotCard photo={second} look={look} numeral={LOVERS} name={fields.card?.trim() || s.card} onOpen={openPhoto ? () => openPhoto(second) : undefined} still={still} />
                </Piece>
                <Piece x={78} y={22} w={34} rotate={14} z={3} entrance="bloom">
                  <Scrap id="cards-spades" />
                </Piece>
                <Piece x={91} y={45} w={13} rotate={-16} z={6} entrance="stamp" delay={0.3}>
                  <Scrap id="die" />
                </Piece>
                <Piece x={77} y={61} w={40} rotate={4} z={6} entrance="stick" delay={0.2}>
                  <Snippet paper={look.paper} ink={look.paperInk} font={TYPEWRITER} size={3.6} className="w-full">
                    {fields.bet?.trim() || s.bet}
                  </Snippet>
                </Piece>
                <Piece x={80} y={86} w={30} rotate={-10} z={5} drift={4} entrance="bloom" delay={0.35}>
                  <Scrap id={look.dark ? "butterfly-wine" : "moth"} />
                </Piece>
                {third ? (
                  <>
                    <Piece x={64} y={141} w={58} rotate={5} z={4} entrance="right">
                      <Polaroid photo={third} lip={10} paper={look.darkPaper} onOpen={openPhoto ? () => openPhoto(third) : undefined} still={still}>
                        <Caption color={ON_BLACK}>{third.caption}</Caption>
                      </Polaroid>
                    </Piece>
                    <Piece x={17} y={125} w={30} rotate={-4} z={5} entrance="left" delay={0.1}>
                      <Scrap id="crow" />
                    </Piece>
                    <Piece x={16} y={166} w={16} rotate={-22} z={6} entrance="bloom" delay={0.25}>
                      <Scrap id="key-ornate" />
                    </Piece>
                    <Piece x={30} y={186} w={38} rotate={-4} z={7} entrance="stick" delay={0.3}>
                      <Snippet paper={look.paper} ink={look.paperInk} font={TYPEWRITER} size={3.2} className="w-full">
                        {s.key}
                      </Snippet>
                    </Piece>
                    <Piece x={92} y={180} w={22} rotate={18} z={5} entrance="bloom" delay={0.2}>
                      <Scrap id={flower.accent} />
                    </Piece>
                  </>
                ) : null}
              </section>
            ) : null}

            {rest.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(rest.length)} * var(--p))` }}>
                <Piece x={22} y={62} w={70} rotate={24} z={1} drift={4} entrance="none">
                  <Scrap id="lace-red" shadow={false} style={{ opacity: look.lace * 0.85 }} />
                </Piece>
                {rest.map((photo, i) => {
                  const dark = i % 3 === 2;
                  return (
                    <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                      <Polaroid photo={photo} lip={8} paper={dark ? look.darkPaper : look.paper} onOpen={openPhoto ? () => openPhoto(photo) : undefined} still={still}>
                        <Caption color={dark ? ON_BLACK : look.paperInk}>{photo.caption}</Caption>
                      </Polaroid>
                    </Piece>
                  );
                })}
                <Piece x={50} y={10} w={20} rotate={-12} z={7} entrance="stamp">
                  <Scrap id="butterfly-black" />
                </Piece>
                <Piece x={50} y={70} w={15} rotate={14} z={7} entrance="stamp" delay={0.2}>
                  <Scrap id={flower.small} />
                </Piece>
                {rest.length > 2 ? (
                  <Piece x={92} y={100} w={22} rotate={20} z={7} entrance="stamp" delay={0.1}>
                    <Scrap id="heart-batwing" />
                  </Piece>
                ) : null}
                {rest.length > 4 ? (
                  <Piece x={8} y={164} w={22} rotate={-18} z={7} entrance="bloom" delay={0.1}>
                    <Scrap id={flower.pale} />
                  </Piece>
                ) : null}
              </section>
            ) : null}

            {/* the letter, on old paper inside a red double rule, under a wax seal */}
            <section className="relative mt-[calc(10*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={18} y={1} w={34} rotate={-10} z={4} entrance="stick">
                <Scrap id="letters-quill" />
              </Piece>
              <Piece x={89} y={1} w={14} rotate={6} z={4} entrance="bloom" delay={0.15}>
                <Scrap id="candle-bow" />
              </Piece>
              <div className="relative z-[2] px-[calc(6*var(--p))] pt-[calc(14*var(--p))] pb-[calc(13*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 calc(1.6*var(--p)) calc(4*var(--p)) rgba(20,4,8,.35)" }}>
                <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(2*var(--p))] border-double" style={{ borderColor: look.red, borderWidth: "calc(.9*var(--p))", opacity: 0.8 }} />
                <article className="relative">
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" accent={look.red} />
                </article>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={82} y={-2} w={24} rotate={-8} z={4} entrance="stamp" delay={0.3}>
                  <Scrap id="wax-seal-flower" />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(9*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(2*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(2*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ background: look.card.card, color: look.card.ink }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={look.cardDark ? "dark" : "light"} onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 14px 26px -18px rgba(0,0,0,.5)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>

            {/* the roses they have left, where they left them */}
            {roses.map((r) => (
              <motion.div key={r.id} data-rose="" aria-hidden="true" className="pointer-events-none absolute z-[20]" style={{ left: `calc(${r.x} * var(--p))`, top: `calc(${r.y} * var(--p))`, width: `calc(${r.w} * var(--p))`, x: "-50%", y: "-50%" }} initial={still ? false : { scale: 1.9, opacity: 0, rotate: r.rotate + 30 }} animate={{ scale: 1, opacity: 1, rotate: r.rotate }} transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}>
                <Scrap id={r.scrap} eager />
              </motion.div>
            ))}
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
