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
import { COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Scrap, ScrollHint, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES } from "../_shared/collage/cards";
import { tornPolygon } from "../_shared/collage/paper";
import { Doodle, GridPaper, HeartClip, Washi } from "../_shared/collage/stationery";
import { playChime, playClasp } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { CatalogControls, LibraryControls, MiniPlayer, PlayerFrame, Playlist, PopSticker, Sky, Smiley, StillControls, STICKER } from "./art";
import { addSticker, LOOKS, stickerAt, type Look, type LookId, type Stuck } from "./looks";
import { fieldsSchema, type OnRepeatFields } from "./schema";

/** From pressing play to the page, in ms: the button turns, the stickers land, then the collage. */
const OPENS_IN = 1500;

type Copy = { play: string; for: string; ourSong: string; tap: string; scroll: string; note: string; playlist: string; playlistLabel: string; songs: string; untitled: string; pause: string; playAria: string };

const S: Record<"en" | "es", Copy> = {
  en: { play: "press play", for: "for", ourSong: "our song", tap: "tap anywhere to add a sticker", scroll: "scroll", note: "you're my favorite song", playlist: "our playlist", playlistLabel: "playlist", songs: "songs", untitled: "track", pause: "Pause the song", playAria: "Play the song" },
  es: { play: "dale play", for: "para", ourSong: "nuestra canción", tap: "toca donde quieras para pegar un sticker", scroll: "desliza", note: "eres mi canción favorita", playlist: "nuestra playlist", playlistLabel: "playlist", songs: "canciones", untitled: "canción", pause: "Pausar la canción", playAria: "Reproducir la canción" },
};

type Stage = "paused" | "playing" | "open";
type Data = TemplateProps<OnRepeatFields>["data"];

/** The artist line on the player: their name, as the song's for. */
const artistLine = (s: Copy, name: string) => `${s.for} ${name}`;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<OnRepeatFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "sunset";
  const look = LOOKS[lookId];
  const songTitle = data.music?.title?.trim() || s.ourSong;

  const [stage, setStage] = useState<Stage>(preview ? "open" : "paused");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const play = () => {
    if (stage !== "paused") return;
    void audio.start();
    playClasp(audio.muted);
    buzz(12);
    eventRef.current?.({ type: "started" });
    setStage("playing");
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
    setStage("paused");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>

      <AnimatePresence>
        {stage !== "open" ? (
          <motion.div key={`paused-${run}`} className="absolute inset-0 z-[11]" exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}>
            <NowPlaying look={look} s={s} name={data.recipientName} title={songTitle} photo={data.photos[0]} playing={stage === "playing"} reduce={reduce} />
            <button type="button" onClick={play} aria-label={s.play} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
            <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase" style={{ background: look.playerInk, color: "#FFFFFF", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(40,10,30,.3)" }} initial={{ opacity: 0 }} animate={stage === "playing" ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={stage === "playing" ? { duration: 0.2 } : { opacity: { delay: 0.8, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
              {s.play}
            </motion.p>
          </motion.div>
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} songTitle={songTitle} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-[12]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.7} />
      </div>
      <Confetti burst={burst} colors={look.confetti} count={56} shape="heart" origin={{ x: 0.5, y: 0.42 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/**
 * The first screen: a sunset and the big player on it, paused at 0:00 with their photo as the cover
 * and their name as the artist. Pressing play turns the button and stickers land round the player.
 * Drawn still, it is the Classic tile in the editor's cover picker.
 */
function NowPlaying({ look, s, name, title, photo, playing, reduce }: { look: Look; s: Copy; name: string; title: string; photo?: GiftPhoto; playing: boolean; reduce: boolean }) {
  return (
    <Sky look={look} seed={7} className="absolute inset-0 grid place-items-center">
      <Doodle kind="heart" color="#FFFFFF" className="absolute top-[14%] left-[10%] h-[calc(6*var(--p))] w-[calc(6*var(--p))] -rotate-12" />
      <Doodle kind="sparkles" color="#FFFFFF" className="absolute top-[22%] right-[10%] h-[calc(8*var(--p))] w-[calc(10*var(--p))]" />
      <Doodle kind="sparkle" color="#FFFFFF" className="absolute bottom-[24%] left-[8%] h-[calc(4*var(--p))] w-[calc(4*var(--p))]" />
      <motion.div className="relative w-[min(calc(70*var(--p)),40cqh)]" initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: playing && !reduce ? 1.03 : 1, rotate: -2 }} transition={{ type: "spring", stiffness: 90, damping: 15 }}>
        <PlayerFrame look={look} photo={photo} title={title} artist={artistLine(s, name)} still controls={<StillControls look={look} playing={playing} seed={11} />} />
        <span className="pointer-events-none absolute top-[calc(-7*var(--p))] right-[calc(-9*var(--p))] z-[3] block w-[calc(24*var(--p))] rotate-[10deg]">
          <Scrap id="bow-gingham" eager tone={STICKER} />
        </span>
        <span className="pointer-events-none absolute bottom-[calc(17*var(--p))] left-[calc(-17*var(--p))] z-[3] block w-[calc(20*var(--p))] -rotate-[12deg]">
          <Scrap id="hibiscus-pink" eager tone={STICKER} />
        </span>
        <PopSticker show={playing} reduce={reduce} delay={0.05} className="top-[calc(30*var(--p))] right-[calc(-11*var(--p))] z-[3] w-[calc(15*var(--p))]">
          <Scrap id="heart-puffy" eager tone={STICKER} />
        </PopSticker>
        <PopSticker show={playing} reduce={reduce} delay={0.18} className="bottom-[calc(-6*var(--p))] right-[calc(-6*var(--p))] z-[3] w-[calc(20*var(--p))]">
          <Scrap id="tulips-wrapped" eager tone={STICKER} />
        </PopSticker>
        <PopSticker show={playing} reduce={reduce} delay={0.3} className="top-[calc(-8*var(--p))] left-[calc(30*var(--p))] z-[3] w-[calc(12*var(--p))]">
          <Smiley color={look.player} className="block w-full" />
        </PopSticker>
        <PopSticker show={playing} reduce={reduce} delay={0.42} className="bottom-[calc(-4*var(--p))] left-[calc(-4*var(--p))] z-[3] w-[calc(13*var(--p))]">
          <Scrap id="star-glossy-small" eager tone={STICKER} />
        </PopSticker>
      </motion.div>
    </Sky>
  );
}

/** On Repeat's first screen, still, under the sky the sender picked. */
export function Opening({ fields, recipientName, locale }: OpeningProps) {
  const parsed = fieldsSchema.safeParse(fields);
  const look = LOOKS[parsed.success && parsed.data.look in LOOKS ? parsed.data.look : "sunset"];
  const s = S[locale] ?? S.en;
  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, "--p": "min(1cqw, 5.4px)" } as CSSProperties}>
      <NowPlaying look={look} s={s} name={recipientName} title={s.ourSong} playing={false} reduce />
    </div>
  );
}

/** Words written straight on the page in the look's ink. */
function Hand({ children, look, size, className }: { children: ReactNode; look: Look; size: number; className?: string }) {
  return (
    <span className={className} style={{ fontFamily: SCRIPT_FONT, fontSize: `calc(${size} * var(--p))`, color: look.wallInk, lineHeight: 1.15 }}>
      {children}
    </span>
  );
}

function Page({ look, s, data, fields, songTitle, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: OnRepeatFields; songTitle: string; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [stuck, setStuck] = useState<Stuck[]>([]);
  const count = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|on-repeat`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const [hero, ...others] = data.photos;
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const preview = mode === "preview";
  const live = !preview;
  const openPhoto = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const controls = catalog ? (
    <CatalogControls look={look} music={catalog} locale={data.locale} live={live} seed={seed % 97} />
  ) : song ? (
    <LibraryControls look={look} audio={audio} live={live} labels={{ pause: s.pause, play: s.playAria }} seed={seed % 97} />
  ) : (
    <StillControls look={look} playing={false} seed={seed % 97} />
  );
  // The player stands a little taller with Apple's link and credit under its buttons.
  const heroH = catalog ? 186 : 178;
  const skyClip = tornPolygon(seed + 3, { bottom: true }, 3, 26);

  // A tap on the page, anywhere that isn't a photo or a button, sticks a sticker there.
  const stick = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    count.current += 1;
    playClasp(audio.muted);
    buzz(8);
    setStuck((list) => addSticker(list, stickerAt(count.current, (e.clientX - box.left) / unit, (e.clientY - box.top) / unit, seed)));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={stick}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(4*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the sunset, the little player over it, and the big player with their photo on it */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <div aria-hidden="true" className="absolute top-[calc(-8*var(--p))] left-[calc(-6*var(--p))] h-[calc(80*var(--p))] w-[calc(112*var(--p))]">
                <span className="absolute inset-0 block bg-white" style={{ clipPath: tornPolygon(seed + 20, { bottom: true }, 1.5) }} />
                <Sky look={look} seed={seed % 53} className="absolute inset-0" style={{ clipPath: skyClip }}>
                  <Doodle kind="heart" color="#FFFFFF" still={still} className="absolute top-[16%] left-[14%] h-[calc(6*var(--p))] w-[calc(6*var(--p))] -rotate-12" />
                  <Doodle kind="sparkles" color="#FFFFFF" still={still} className="absolute top-[18%] left-[64%] h-[calc(8*var(--p))] w-[calc(10*var(--p))]" />
                </Sky>
              </div>
              <MiniPlayer ink={look.dark ? "#FFFFFF" : look.playerInk} className="top-[calc(31*var(--p))] left-[calc(6*var(--p))] z-[3] w-[calc(46*var(--p))]" />
              <Piece x={64} y={20} w={13} rotate={-8} z={4} entrance="stamp" delay={0.6}>
                <Smiley color={look.player} className="block w-full" />
              </Piece>
              <Piece x={86} y={12} w={24} rotate={10} z={5} entrance="bloom" delay={0.4}>
                <Scrap id="bow-gingham" eager tone={STICKER} />
              </Piece>

              <Piece x={62} y={110} w={64} rotate={2} z={6} entrance="right" delay={0.15}>
                <PlayerFrame look={look} photo={hero} title={songTitle} artist={artistLine(s, data.recipientName)} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still} controls={controls} />
              </Piece>
              <Piece x={14} y={84} w={30} rotate={-10} z={7} entrance="left" delay={0.5}>
                <Scrap id="hibiscus-pink" eager tone={STICKER} />
              </Piece>
              <Piece x={12} y={150} w={22} rotate={-6} z={5} entrance="bloom" delay={0.7}>
                <Scrap id="tulips-wrapped" eager tone={STICKER} />
              </Piece>
              <Piece x={93} y={64} w={13} rotate={14} z={7} entrance="stamp" delay={0.9}>
                <Scrap id="heart-puffy" eager tone={STICKER} />
              </Piece>
              <Piece x={92} y={170} w={14} rotate={-8} z={7} entrance="stamp" delay={0.8}>
                <Scrap id="star-glossy-small" eager tone={STICKER} />
              </Piece>
            </section>

            {/* the note on grid paper, clipped with a heart */}
            <section className="relative h-[calc(44*var(--p))]">
              <Piece x={44} y={20} w={62} rotate={-3} z={5} entrance="stick">
                <GridPaper color={look.paper} line={look.gridLine} className="px-[calc(6*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))]">
                  <p className="relative text-center text-[calc(6*var(--p))] leading-[1.15]" style={{ fontFamily: SCRIPT_FONT, color: look.ink }}>
                    {fields.note?.trim() || s.note}
                  </p>
                  <Doodle kind="heart-fill" color={look.accent} still={still} className="relative mx-auto mt-[calc(1.4*var(--p))] h-[calc(4.4*var(--p))] w-[calc(4.4*var(--p))]" />
                </GridPaper>
                <HeartClip color={look.accent} className="top-[calc(-5*var(--p))] left-[calc(5*var(--p))] z-[3] h-[calc(14*var(--p))] w-[calc(6*var(--p))] -rotate-[8deg]" />
                <Washi pattern="gingham" color={look.washi.gingham} width={18} className="top-[calc(-1.8*var(--p))] right-[calc(4*var(--p))] rotate-[6deg]" />
              </Piece>
              <Piece x={88} y={26} w={16} rotate={12} z={6} entrance="bloom" delay={0.2}>
                <Scrap id="plumeria-pink" tone={STICKER} />
              </Piece>
            </section>

            <div className="relative z-[9] flex flex-col items-center gap-[calc(3*var(--p))] py-[calc(5*var(--p))]">
              <Hand look={look} size={4.6} className="px-[calc(6*var(--p))] text-center">
                {s.tap}
              </Hand>
              <ScrollHint label={s.scroll} color={look.wallInk} hidden={moved || preview} />
            </div>

            {/* every other photo, as songs on their playlist */}
            {others.length ? (
              <section className="relative mt-[calc(4*var(--p))] px-[calc(6*var(--p))]">
                <div className="relative z-[4]">
                  <Playlist look={look} title={fields.playlist?.trim() || s.playlist} owner={artistLine(s, data.recipientName)} cover={hero} photos={others.slice(0, 9)} seed={seed} onOpen={openPhoto} labels={{ playlist: s.playlistLabel, songs: s.songs, untitled: s.untitled }} />
                </div>
                <div className="absolute inset-x-0 top-0 h-0">
                  <Piece x={88} y={-2} w={20} rotate={12} z={6} entrance="bloom" delay={0.2}>
                    <Scrap id="bow-satin-pink" tone={STICKER} />
                  </Piece>
                  <Piece x={8} y={2} w={13} rotate={-12} z={6} entrance="stamp" delay={0.3}>
                    <Scrap id="heart-gingham" tone={STICKER} />
                  </Piece>
                </div>
              </section>
            ) : null}

            {/* the letter, on grid paper */}
            <section className="relative mt-[calc(12*var(--p))] px-[calc(5*var(--p))]">
              <Washi pattern="dots" color={look.washi.dots} ink={look.accent} width={20} className="top-[calc(-1.6*var(--p))] left-[calc(10*var(--p))] z-[3] -rotate-[6deg]" />
              <GridPaper color={look.paper} line={look.gridLine} className="z-[2] px-[calc(7*var(--p))] pt-[calc(11*var(--p))] pb-[calc(11*var(--p))]">
                <article className="relative" style={{ color: look.ink }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={look.accent} />
                </article>
              </GridPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={86} y={-3} w={22} rotate={-10} z={4} entrance="bloom" delay={0.2}>
                  <Scrap id="hibiscus-pink" tone={STICKER} />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(10*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(2.4*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(80,30,50,.45)]" style={{ backgroundColor: look.paper, color: look.ink }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(2.4*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(80,30,50,.45)]" style={{ background: look.card.card, color: look.card.ink }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={look.dark ? "dark" : "light"} onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2.4*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 14px 26px -18px rgba(80,30,50,.45)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>

            {/* the stickers they have added, where they put them */}
            {stuck.map((st) => (
              <motion.div key={st.id} data-sticker="" aria-hidden="true" className="pointer-events-none absolute z-[20]" style={{ left: `calc(${st.x} * var(--p))`, top: `calc(${st.y} * var(--p))`, width: `calc(${st.w} * var(--p))`, x: "-50%", y: "-50%" }} initial={still ? false : { scale: 1.9, opacity: 0, rotate: st.rotate + 30 }} animate={{ scale: 1, opacity: 1, rotate: st.rotate }} transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}>
                <Scrap id={st.scrap} eager tone={STICKER} />
              </motion.div>
            ))}
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
