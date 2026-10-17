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
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScrollHint, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard } from "../_shared/collage/cards";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { playChime, playPaper, playRibbon } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { Butterfly, EVERGREEN_KEYFRAMES, FeltHeart, Hand, Newsprint, Parcel, Record, type Wings } from "./art";
import { LOOKS, TONE, type Look, type LookId } from "./looks";
import { fieldsSchema, type EvergreenFields } from "./schema";

/** From the tap to the page, in ms: the twine, the paper falling open, the butterflies. */
const OPENS_IN = 1550;
/** How many butterflies can be in the air from taps at once. */
const MAX_FLYING = 8;

type Copy = { unwrap: string; for: string; title: string; side: string; ourSong: string; tap: string; scroll: string; pause: string; play: string };

const S: Record<"en" | "es", Copy> = {
  en: { unwrap: "unwrap the newspaper", for: "for", title: "my evergreen", side: "side A", ourSong: "our song", tap: "tap anywhere to let a butterfly go", scroll: "scroll", pause: "Pause the song", play: "Play the song" },
  es: { unwrap: "desenvuelve el periódico", for: "para", title: "siempre tú", side: "cara A", ourSong: "nuestra canción", tap: "toca donde quieras para soltar una mariposa", scroll: "desliza", pause: "Pausar la canción", play: "Reproducir la canción" },
};

type Stage = "wrapped" | "opening" | "open";
type Data = TemplateProps<EvergreenFields>["data"];
type Flying = { id: number; x: number; y: number; wings: Wings; drift: number; w: number };

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<EvergreenFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "sage";
  const look = LOOKS[lookId];

  const [stage, setStage] = useState<Stage>(preview ? "open" : "wrapped");
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const unwrap = () => {
    if (stage !== "wrapped") return;
    void audio.start();
    buzz(12);
    playRibbon(audio.muted);
    eventRef.current?.({ type: "started" });
    setStage("opening");
    window.setTimeout(() => playPaper(audio.muted), reduce ? 0 : 350);
    window.setTimeout(
      () => {
        playChime(audio.muted);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : OPENS_IN,
    );
  };

  const replay = () => {
    setStage("wrapped");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES + EVERGREEN_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.45 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.55} />
      </div>

      {/* The cover goes first and the page comes after it, so the two are never seen through each other. */}
      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <motion.div key={`wrapped-${run}`} className="absolute inset-0 z-[11] grid place-items-center" exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.38, ease: [0.5, 0, 0.75, 0] } }}>
            <Wrapped look={look} s={s} name={data.recipientName} sender={data.senderName} locale={data.locale} photo={data.photos[0]} opening={stage === "opening"} reduce={reduce} />
            <button type="button" onClick={unwrap} aria-label={s.unwrap} className="absolute inset-0 z-[6] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
            <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase" style={{ background: look.paper, color: look.accent, boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(20,30,15,.25)" }} initial={{ opacity: 0 }} animate={stage === "opening" ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={stage === "opening" ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
              {s.unwrap}
            </motion.p>
          </motion.div>
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/**
 * The parcel on the page, a leaf and a lily round it: the first screen, and, drawn still, the Classic
 * cover tile. The two cut-outs are placed and sized against the parcel, not the screen, so on a wide
 * screen they stay beside it instead of growing to fill the edges.
 */
function Wrapped({ look, s, name, sender, locale, photo, opening, reduce }: { look: Look; s: Copy; name: string; sender: string; locale: "en" | "es"; photo?: GiftPhoto; opening: boolean; reduce: boolean }) {
  return (
    <motion.div className="relative w-[min(calc(72*var(--p)),46cqh)]" initial={reduce ? false : { opacity: 0, y: 26, rotate: -5 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ type: "spring", stiffness: 80, damping: 15 }}>
      <motion.span aria-hidden="true" className="pointer-events-none absolute top-[-45%] left-[-31%] block w-[52%] -rotate-[26deg]" animate={{ opacity: opening ? 0 : 1 }}>
        <Scrap id="leaf-maple-red" eager tone={TONE.greenLeaf} />
      </motion.span>
      <motion.span aria-hidden="true" className="pointer-events-none absolute right-[-27%] bottom-[-38%] block w-[47%] rotate-[20deg]" animate={{ opacity: opening ? 0 : 1 }}>
        <Scrap id="lily-blush" eager tone={TONE.whiteFlower} />
      </motion.span>
      <Parcel look={look} forLabel={s.for} name={name} sender={sender} locale={locale} photo={photo} opening={opening} reduce={reduce} />
    </motion.div>
  );
}

/** Evergreen's first screen, still, in the green the sender picked. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const parsed = fieldsSchema.safeParse(fields);
  const look = LOOKS[parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "sage"];
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <style>{EVERGREEN_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.45 }} />
      <Wrapped look={look} s={S[locale] ?? S.en} name={recipientName} sender={senderName} locale={locale} opening={false} reduce />
    </div>
  );
}

function Page({ look, s, data, fields, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: EvergreenFields; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [flying, setFlying] = useState<Flying[]>([]);
  const count = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|evergreen`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const [hero, second] = data.photos;
  const rest = data.photos.slice(2, 10);
  const spots = scatterSpots(rest.length);
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const heroH = second ? (hasSong ? (catalog ? 196 : 190) : 156) : hasSong ? 142 : 104;
  const songY = second ? 166 : 112;
  const preview = mode === "preview";
  const openPhoto = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const title = fields.title?.trim() || s.title;
  const songTitle = data.music?.title?.trim() || s.ourSong;
  const names = { her: data.recipientName, him: data.senderName };

  // A tap on the page, anywhere that isn't a photo or a button, lets a butterfly go from there.
  const release = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    count.current += 1;
    const n = count.current;
    playPaper(audio.muted);
    buzz(6);
    setFlying((list) => [...list, { id: n, x: (e.clientX - box.left) / unit, y: (e.clientY - box.top) / unit, wings: (n % 3 === 0 ? "green" : "cream") as Wings, drift: (n % 2 ? 1 : -1) * (10 + (n * 7) % 18), w: 12 + ((n * 5) % 6) }].slice(-MAX_FLYING));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={release}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(8*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* their title, written on the wall above the collage rather than across the newsprint */}
            <div className="relative z-[7] h-[calc(15*var(--p))] -rotate-[4deg] px-[calc(6*var(--p))]">
              <FitName as="p" min={0.6} className="w-full text-[calc(10*var(--p))] leading-[1.2]" style={{ fontFamily: SCRIPT_FONT, color: look.wallInk }}>
                {title}
              </FitName>
            </div>

            {/* the record on old newsprint, and the first photos among the leaves */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <Piece x={36} y={22} w={76} rotate={-4} z={1} entrance="none">
                <Newsprint look={look} locale={data.locale} names={names} columns={3} />
              </Piece>
              <Piece x={16} y={52} w={58} z={2} entrance="bloom" delay={0.1}>
                <Record look={look} title={songTitle} names={`${data.recipientName} & ${data.senderName}`} side={s.side} still={still} />
              </Piece>
              <Piece x={8} y={86} w={22} rotate={-24} z={4} entrance="left" delay={0.3}>
                <Scrap id="leaf-maple-red" eager tone={TONE.greenLeaf} />
              </Piece>
              <Piece x={68} y={50} w={52} rotate={4} z={5} entrance="drop" delay={0.25}>
                <Polaroid photo={hero} lip={10} paper={look.paper} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still}>
                  <Caption color={look.ink}>{hero?.caption}</Caption>
                </Polaroid>
              </Piece>
              <Piece x={90} y={16} w={22} rotate={16} z={7} entrance="bloom" delay={0.7}>
                <Butterfly flap={still ? undefined : "slow"} />
              </Piece>
              <Piece x={38} y={84} w={18} rotate={-14} z={7} entrance="bloom" delay={0.9}>
                <Butterfly flap={still ? undefined : "slow"} />
              </Piece>

              {second ? (
                <>
                  <Piece x={70} y={124} w={42} rotate={7} z={3} entrance="none">
                    <Newsprint look={look} locale={data.locale} names={names} first={1} columns={2} masthead={false} />
                  </Piece>
                  <Piece x={34} y={122} w={50} rotate={-5} z={5} entrance="left" delay={0.1}>
                    <Polaroid photo={second} lip={10} paper={look.paper} onOpen={openPhoto ? () => openPhoto(second) : undefined} still={still}>
                      <Caption color={look.ink}>{second.caption}</Caption>
                    </Polaroid>
                  </Piece>
                  <Piece x={78} y={104} w={40} rotate={-8} z={6} entrance="stamp" delay={0.3}>
                    <Scrap id="bow-satin-pink" tone={TONE.sageRibbon} />
                  </Piece>
                  <Piece x={88} y={140} w={22} rotate={12} z={6} entrance="bloom" delay={0.4}>
                    <Butterfly wings="green" flap={still ? undefined : "slow"} />
                  </Piece>
                  <Piece x={8} y={165} w={24} rotate={-10} z={6} entrance="bloom" delay={0.35}>
                    <Scrap id="hibiscus-ruffle" tone={TONE.whiteFlower} />
                  </Piece>
                  <Piece x={62} y={152} w={9} rotate={-12} z={7} entrance="stamp" delay={0.5}>
                    <FeltHeart color={look.label} className="block w-full" />
                  </Piece>
                </>
              ) : null}

              {hasSong ? (
                <Piece x={50} y={catalog ? songY + 3 : songY} w={70} rotate={-2} z={8} entrance="right" delay={0.2}>
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

            {rest.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(rest.length)} * var(--p))` }}>
                <Piece x={30} y={40} w={62} rotate={-6} z={1} entrance="none">
                  <Newsprint look={look} locale={data.locale} names={names} first={2} columns={3} masthead={false} />
                </Piece>
                {rest.map((photo, i) => (
                  <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <Polaroid photo={photo} lip={8} paper={look.paper} onOpen={openPhoto ? () => openPhoto(photo) : undefined} still={still}>
                      <Caption color={look.ink}>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}
                <Piece x={50} y={8} w={20} rotate={-10} z={7} entrance="bloom">
                  <Butterfly flap={still ? undefined : "slow"} />
                </Piece>
                <Piece x={50} y={70} w={18} rotate={14} z={7} entrance="bloom" delay={0.2}>
                  <Scrap id="leaf-maple-red" tone={TONE.greenLeaf} />
                </Piece>
                {rest.length > 2 ? (
                  <Piece x={92} y={100} w={22} rotate={18} z={7} entrance="bloom" delay={0.1}>
                    <Scrap id="moth" tone={TONE.creamMoth} />
                  </Piece>
                ) : null}
                {rest.length > 4 ? (
                  <Piece x={8} y={164} w={22} rotate={-16} z={7} entrance="bloom" delay={0.1}>
                    <Scrap id="lily-blush" tone={TONE.whiteFlower} />
                  </Piece>
                ) : null}
              </section>
            ) : null}

            {/* the letter, on cream paper, a scrap of old writing under it and a ribbon over the top */}
            <section className="relative mt-[calc(12*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={18} y={2} w={40} rotate={-12} z={1} entrance="none">
                <Scrap id="paper-script" />
              </Piece>
              <Piece x={80} y={0} w={30} rotate={10} z={4} entrance="stamp" delay={0.2}>
                <Scrap id="bow-satin-pink" tone={TONE.sageRibbon} />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, right: true, bottom: true, left: true }} color={look.paper} grain={PAPER_GRAIN} depth={1.6} className="z-[2]">
                <article className="px-[calc(7*var(--p))] pt-[calc(13*var(--p))] pb-[calc(12*var(--p))]" style={{ color: look.ink }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" accent={look.accent} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={14} y={-2} w={22} rotate={-14} z={4} entrance="bloom" delay={0.2}>
                  <Scrap id="leaf-skeleton" />
                </Piece>
                <Piece x={86} y={-4} w={20} rotate={12} z={4} entrance="bloom" delay={0.3}>
                  <Butterfly flap={still ? undefined : "slow"} />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(10*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(2*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(20,30,15,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(2*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(20,30,15,.5)]" style={{ background: look.card.card, color: look.card.ink }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 14px 26px -18px rgba(20,30,15,.5)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>

            {/* the butterflies they have let go, flying up and away */}
            {flying.map((f) => (
              <motion.div key={f.id} data-butterfly="" aria-hidden="true" className="pointer-events-none absolute z-[20]" style={{ left: `calc(${f.x} * var(--p))`, top: `calc(${f.y} * var(--p))`, width: `calc(${f.w} * var(--p))`, translate: "-50% -50%" }} initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }} animate={still ? { opacity: 1, scale: 1 } : { opacity: [0, 1, 1, 0], scale: 1, x: `calc(${f.drift} * var(--p))`, y: "calc(-110 * var(--p))", rotate: f.drift > 0 ? 18 : -18 }} transition={{ duration: 2.6, ease: [0.25, 0.6, 0.4, 1], opacity: { times: [0, 0.1, 0.75, 1], duration: 2.6 } }} onAnimationComplete={still ? undefined : () => setFlying((list) => list.filter((x) => x.id !== f.id))}>
                <Butterfly wings={f.wings} flap={still ? undefined : "fast"} />
              </motion.div>
            ))}
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
