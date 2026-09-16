"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize, type ContainerSize } from "../_shared/hooks/use-container-size";
import { hashString, mulberry32 } from "../_shared/random";
import { Typewriter } from "../_shared/Typewriter";
import { RichMessage } from "../_shared/RichMessage";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { GiftVideo } from "../_shared/GiftVideo";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { SealDressing, Stamp } from "./art";
import type { LetterFields } from "./schema";
import styles from "./letter.module.css";

const PAPER: Record<LetterFields["paper"], { paper: string; env: string }> = {
  cream: { paper: "#F7EFDF", env: "#E9DCC2" },
  white: { paper: "#FBFAF6", env: "#ECEAE3" },
  kraft: { paper: "#DCC7A6", env: "#C7AC85" },
};

const DESK_CLASS: Record<LetterFields["desk"], string> = {
  walnut: styles.deskWalnut,
  linen: styles.deskLinen,
  slate: styles.deskSlate,
};

type Look = {
  tone: CoverTone;
  /** The eyebrow, headline and pill sit on the page, not on the paper, so they have their own ink. */
  ink: string;
  pattern: string;
  twine: string;
  ambience: { kind: AmbienceKind; colors: string[]; count?: number }[];
};

/** Corners only: the envelope is wide, and on a phone it reaches almost edge to edge. */
const STICKERS: StickerPlacement[] = [
  { id: "bouquet", x: 13, y: 15, size: 17, rotate: -12 },
  { id: "sparkle", x: 84, y: 11, size: 8 },
  // Clear of the candle, which stands in the top right corner of the desk.
  { id: "heart", x: 93, y: 72, size: 11, rotate: 14 },
  { id: "daisy", x: 9, y: 81, size: 12 },
  { id: "kiss", x: 21, y: 88, size: 15, rotate: -8 },
  { id: "butterfly", x: 85, y: 84, size: 16, rotate: 10 },
];

/** The desk the sender picked lights the whole cover: candle on walnut, daylight on linen. */
const LOOKS: Record<LetterFields["desk"], Look> = {
  walnut: {
    tone: { page: "rgba(46,27,15,.44)", glow: ["rgba(255,197,122,.5)", "rgba(255,166,80,.46)"], accent: "#FFE7C2", dark: true },
    ink: "#FFEBD2",
    pattern: "repeating-linear-gradient(96deg, rgba(255,232,196,.032) 0 calc(1.4*var(--k)), transparent calc(1.4*var(--k)) calc(9*var(--k)))",
    twine: "#C3996A",
    ambience: [
      { kind: "dust", colors: ["#FFE7B8", "#FFF7E6"], count: 20 },
      { kind: "bokeh", colors: ["#FFD9A8", "#FFF1D6"], count: 8 },
    ],
  },
  linen: {
    tone: { page: "rgba(240,230,209,.55)", glow: ["rgba(255,248,226,.9)", "rgba(222,176,116,.5)"], accent: "#96502C" },
    ink: "#4A3524",
    pattern:
      "repeating-linear-gradient(0deg, rgba(255,255,255,.2) 0 calc(.3*var(--k)), transparent calc(.3*var(--k)) calc(2.2*var(--k))), repeating-linear-gradient(90deg, rgba(255,255,255,.2) 0 calc(.3*var(--k)), transparent calc(.3*var(--k)) calc(2.2*var(--k)))",
    twine: "#A9855A",
    ambience: [
      { kind: "dust", colors: ["#FFF2D4", "#FFFFFF"], count: 18 },
      { kind: "sparkles", colors: ["#FFFFFF", "#FFE9BE"], count: 12 },
    ],
  },
  slate: {
    tone: { page: "rgba(26,30,36,.52)", glow: ["rgba(255,205,140,.44)", "rgba(120,142,176,.34)"], accent: "#FFE3BE", dark: true },
    ink: "#F2E6D6",
    pattern: "radial-gradient(rgba(255,255,255,.07) calc(.5*var(--k)), transparent calc(.62*var(--k))) 0 0/calc(9*var(--k)) calc(9*var(--k))",
    twine: "#BE9A6E",
    ambience: [
      { kind: "dust", colors: ["#FFE7B8", "#FFFFFF"], count: 20 },
      { kind: "bokeh", colors: ["#FFD9A8", "#DCE6F2"], count: 8 },
    ],
  },
};

const S = {
  en: { tap: "tap the seal", for: "for", headline: "a letter for you" },
  es: { tap: "toca el sello", for: "para", headline: "una carta para ti" },
};

type Stage = "sealed" | "opening" | "unfolding" | "reading";

const SPRING = { type: "spring", stiffness: 120, damping: 18 } as const;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<LetterFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const t = useGiftStrings(data.locale);
  const reduce = useReducedMotion();
  const audio = useGiftAudio(data.music, mode !== "preview");
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "reading" : "sealed");
  const [lightbox, setLightbox] = useState<GiftPhoto | null>(null);
  const [run, setRun] = useState(0);
  const [burst, setBurst] = useState(0);
  const timers = useRef<number[]>([]);

  const fields = data.fields;
  const palette = PAPER[fields.paper] ?? PAPER.cream;
  const sealInitial = (fields.sealInitial || data.senderName.charAt(0) || "♥").toUpperCase();
  const greeting = fields.greeting || t("dear", { name: data.recipientName });
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const s = S[data.locale] ?? S.en;
  const look = LOOKS[fields.desk] ?? LOOKS.walnut;
  const headline = data.title?.trim() || s.headline;
  const onCover = stage === "sealed" || stage === "opening";

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const open = useCallback(() => {
    if (stage !== "sealed") return;
    void audio.start();
    onEvent?.({ type: "started" });
    if (reduce) {
      setStage("reading");
      return;
    }
    setBurst((b) => b + 1);
    setStage("opening");
    timers.current.push(window.setTimeout(() => setStage("unfolding"), 2450));
    timers.current.push(window.setTimeout(() => setStage("reading"), 2450 + 1500));
  }, [stage, audio, onEvent, reduce]);

  const replay = useCallback(() => {
    setLightbox(null);
    setStage("sealed");
    setRun((r) => r + 1);
  }, []);

  const vars = {
    ...COVER_VARS,
    "--tl-ink": fields.inkColor,
    "--tl-paper": palette.paper,
    "--tl-env": palette.env,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={styles.root} style={vars}>
      <Desk variant={fields.desk} reduce={!!reduce} />
      {/* Candlelight all over the screen: motes rising while it waits, petals drifting once it's read.
          The cover brings its own layer, in front of its page rather than behind it. */}
      {onCover ? null : (
        <div className={styles.ambienceBack} aria-hidden="true">
          <Ambience layers={[{ kind: "bokeh", colors: ["#FFD9A8", "#FFF1D6", "#F6C7B8"] }, { kind: "dust", colors: ["#FFE7B8", "#FFF7E6"] }]} intensity={stage === "reading" ? 0.7 : 1} />
        </div>
      )}

      <AnimatePresence>
        {onCover ? (
          <Cover
            key={`cover-${run}`}
            look={look}
            s={s}
            data={data}
            headline={headline}
            sealInitial={sealInitial}
            opening={stage === "opening"}
            reduce={!!reduce}
            onOpen={open}
          />
        ) : null}
        {stage === "unfolding" ? <FoldedLetter key="folded" /> : null}
      </AnimatePresence>

      {stage === "reading" ? (
        <LetterReader
          key={`reader-${run}`}
          data={data}
          mode={mode}
          blocks={blocks}
          greeting={greeting}
          sealInitial={sealInitial}
          size={size}
          reduce={!!reduce}
          onEvent={onEvent}
          onReact={onReact}
          onMakeOne={onMakeOne}
          onReplay={mode === "preview" ? undefined : replay}
          onOpenPhoto={setLightbox}
        />
      ) : null}

      <AnimatePresence>
        {lightbox ? <Lightbox key="lightbox" photo={lightbox} onClose={() => setLightbox(null)} /> : null}
      </AnimatePresence>

      {stage === "reading" && !reduce ? (
        <div className={styles.ambienceFront} aria-hidden="true">
          <Ambience layers={[{ kind: "petals", colors: ["#F4B8C1", "#F7D2C4", "#E9A3AE", "#FBE3D6"], count: 14 }, { kind: "sparkles", colors: ["#FFE9B8", "#FFFFFF"], count: 16 }]} opacity={0.85} />
        </div>
      ) : null}
      <Confetti burst={burst} colors={["#F2C879", "#FFE9B8", "#E8604C", "#FBF6EE"]} count={70} origin={{ x: 0.5, y: 0.46 }} className={styles.burst} />

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desk + candle                                                       */
/* ------------------------------------------------------------------ */
function Desk({ variant, reduce }: { variant: LetterFields["desk"]; reduce: boolean }) {
  return (
    <div className={cn(styles.desk, DESK_CLASS[variant] ?? styles.deskWalnut)} aria-hidden="true">
      <div className={styles.grain} />
      <motion.div
        className={styles.candleGlow}
        animate={reduce ? { opacity: 0.85 } : { opacity: [0.78, 0.95, 0.82, 1, 0.8, 0.9], x: [0, 2, -1, 1, 0], y: [0, -1, 1, 0, 1, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className={styles.candle}>
        <motion.div
          className={styles.flame}
          animate={
            reduce
              ? undefined
              : { scaleX: [1, 0.9, 1.06, 0.95, 1], scaleY: [1, 1.12, 0.94, 1.08, 1], rotate: [0, -3, 2, -1, 0] }
          }
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className={styles.candleWick} />
        <div className={styles.candleBody} />
      </div>
      <div className={styles.vignette} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cover: the sealed envelope, addressed, on a candle-lit page         */
/* ------------------------------------------------------------------ */
function Cover({
  look,
  s,
  data,
  headline,
  sealInitial,
  opening,
  reduce,
  onOpen,
}: {
  look: Look;
  s: (typeof S)["en"];
  data: TemplateProps<LetterFields>["data"];
  headline: string;
  sealInitial: string;
  opening: boolean;
  reduce: boolean;
  onOpen: () => void;
}) {
  const name = data.recipientName;
  // A short name is written large across the envelope; a long one has to come down a size to fit.
  const nameSize = name.length > 14 ? "calc(3.6*var(--k))" : name.length > 9 ? "calc(4.4*var(--k))" : "calc(5.2*var(--k))";

  return (
    <motion.div
      className="absolute inset-0 z-10"
      style={{ color: look.ink }}
      exit={{ opacity: 0, y: 80, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
    >
      <CoverPage tone={look.tone} pattern={look.pattern} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.9} />
      </div>
      <StickerScatter items={STICKERS} reduce={reduce} className="z-[3]" />

      <div className="absolute inset-0 z-[4] flex flex-col items-center justify-center px-[calc(6*var(--k))]">
        <motion.p
          className="max-w-[calc(74*var(--k))] text-center text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55 [overflow-wrap:anywhere]"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          {data.senderName} → {data.recipientName}
        </motion.p>
        <motion.h1
          className="mt-[calc(1.8*var(--k))] max-w-[calc(76*var(--k))] text-center text-[calc(8*var(--k))] leading-[1.05] text-balance italic [overflow-wrap:anywhere]"
          style={{ fontFamily: POSTER_FONT }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.8 }}
        >
          {headline}
        </motion.h1>

        <motion.div
          className="relative mt-[calc(6*var(--k))] w-[calc(84*var(--k))]"
          initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: opening ? 0 : -2 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        >
          <Float reduce={reduce} amount={0.8} duration={5.6}>
            <motion.button
              type="button"
              onClick={onOpen}
              aria-label={s.tap}
              whileTap={opening ? undefined : { scale: 0.985 }}
              className="block w-full cursor-pointer rounded-[calc(2*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            >
              <div className={styles.envelope}>
                <div className={styles.envBack} />
                <div className={styles.envInner} />
                <motion.div
                  className={styles.envLetter}
                  animate={opening ? { y: "-72%" } : { y: 0 }}
                  transition={{ delay: 1.15, type: "spring", stiffness: 70, damping: 14 }}
                >
                  <div className={styles.letterLines} />
                </motion.div>
                <div className={styles.envFront} />
                <motion.div
                  className={styles.envFlap}
                  style={{ zIndex: opening ? 1 : 5 }}
                  animate={opening ? { rotateX: -176 } : { rotateX: 0 }}
                  transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
                <p className={styles.envName} style={{ fontSize: nameSize }}>
                  {s.for} {name}
                </p>
                <div className={styles.envStamp}>
                  <Stamp />
                </div>
                {/* The twine holds the flap: it goes as the seal breaks. */}
                <motion.div
                  className={styles.envDress}
                  animate={opening ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                >
                  <SealDressing twine={look.twine} />
                </motion.div>
                <div className={styles.sealWrap}>
                  <AnimatePresence>
                    {!opening ? (
                      <motion.span
                        key="seal"
                        aria-hidden="true"
                        className={styles.seal}
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: reduce ? 1 : [1, 1.045, 1], opacity: 1 }}
                        exit={{ scale: 1.18, opacity: 0, transition: { duration: 0.22 } }}
                        transition={{ scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }, opacity: { duration: 0.4 } }}
                      >
                        {sealInitial}
                      </motion.span>
                    ) : (
                      <SealBreak key="break" sealInitial={sealInitial} />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          </Float>
          <span
            aria-hidden="true"
            className="absolute -bottom-[calc(2.6*var(--k))] left-1/2 h-[calc(4.2*var(--k))] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/35 blur-[calc(2.4*var(--k))]"
          />
        </motion.div>

        <TapPill tone={look.tone} hidden={opening} reduce={reduce} className="mt-[calc(6.5*var(--k))]">
          {s.tap}
        </TapPill>
      </div>
    </motion.div>
  );
}

function SealBreak({ sealInitial }: { sealInitial: string }) {
  const crumbs = 9;
  return (
    <div aria-hidden="true">
      {[-1, 1].map((dir) => (
        <motion.div
          key={dir}
          className={styles.seal}
          style={{ clipPath: dir < 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)", pointerEvents: "none" }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: dir * 24, y: 18, rotate: dir * 30, opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {sealInitial}
        </motion.div>
      ))}
      {Array.from({ length: crumbs }, (_, i) => {
        const a = (i / crumbs) * Math.PI * 2 + 0.4;
        return (
          <motion.span
            key={i}
            className={styles.crumb}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * (34 + (i % 3) * 14), y: Math.sin(a) * (26 + (i % 2) * 12) + 26, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Folded letter (unfold animation between envelope and reading)       */
/* ------------------------------------------------------------------ */
function FoldedLetter() {
  return (
    <motion.div
      className={styles.foldStage}
      initial={{ opacity: 0, scale: 0.7, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={SPRING}
    >
      <div className={styles.fold}>
        <div className={cn(styles.foldPanel, styles.foldMiddle)} />
        <motion.div
          className={cn(styles.foldPanel, styles.foldTop)}
          initial={{ rotateX: 180 }}
          animate={{ rotateX: 0 }}
          transition={{ delay: 0.25, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className={cn(styles.foldPanel, styles.foldBottom)}
          initial={{ rotateX: -180 }}
          animate={{ rotateX: 0 }}
          transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Reading: the letter, polaroids, countdown, surprise, end            */
/* ------------------------------------------------------------------ */
function LetterReader({
  data,
  mode,
  blocks,
  greeting,
  sealInitial,
  size,
  reduce,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
  onOpenPhoto,
}: {
  data: TemplateProps<LetterFields>["data"];
  mode: TemplateProps["mode"];
  blocks: ReturnType<typeof parseRichText>;
  greeting: string;
  sealInitial: string;
  size: ContainerSize;
  reduce: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
  onOpenPhoto: (photo: GiftPhoto) => void;
}) {
  const t = useGiftStrings(data.locale);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [typingDone, setTypingDone] = useState(mode === "preview");
  const endedRef = useRef(false);
  const lastPct = useRef(0);

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat(data.locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date()),
    [data.locale],
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.round((el.scrollTop / max) * 10) * 10 : 100;
      if (pct !== lastPct.current) {
        lastPct.current = pct;
        onEvent?.({ type: "progress", pct });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onEvent]);

  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, mode]);

  const followCaret = useCallback((caret: HTMLElement) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const r = caret.getBoundingClientRect();
    const s = scroller.getBoundingClientRect();
    const limit = s.bottom - Math.min(160, s.height * 0.3);
    if (r.bottom > limit) scroller.scrollBy({ top: r.bottom - limit + 40, behavior: "smooth" });
  }, []);

  const signOff = data.fields.signOff;

  return (
    <motion.div
      ref={scrollerRef}
      className={styles.scroller}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.column}>
        <motion.article
          className={cn(styles.paper, styles.paperTexture, styles.letter)}
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={SPRING}
        >
          <p className={styles.date}>{dateLabel}</p>
          <h2 className={styles.greeting}>{greeting}</h2>
          {instant ? (
            <RichMessage
              blocks={blocks}
              className={styles.body}
              stagger={mode === "preview" ? 0 : 0.5}
              onDone={() => setTypingDone(true)}
            />
          ) : (
            <Typewriter
              blocks={blocks}
              active
              speed={30}
              className={styles.body}
              onDone={() => setTypingDone(true)}
              onCaretMove={followCaret}
            />
          )}
          <AnimatePresence>
            {typingDone ? (
              <motion.div
                key="sig"
                className={styles.signature}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {signOff ? <p>{signOff}</p> : null}
                <p className={styles.signName}>{data.senderName}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <motion.div
            className={styles.stamp}
            initial={{ scale: 0, rotate: -40, opacity: 0 }}
            animate={typingDone ? { scale: 1, rotate: -12, opacity: 0.92 } : {}}
            transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.9 }}
            aria-hidden="true"
          >
            {sealInitial}
          </motion.div>
        </motion.article>

        <AnimatePresence>
          {typingDone && data.photos.length > 0 ? (
            <motion.div
              key="hint"
              className={styles.scrollHint}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.2 }}
            >
              <span>{t("scrollDown")}</span>
              <motion.span animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                <ChevronDown className="size-4" />
              </motion.span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {data.photos.length > 0 ? (
          <Polaroids photos={data.photos} seed={hashString(data.recipientName + data.senderName)} wide={size.isLandscape} onOpen={onOpenPhoto} />
        ) : null}

        {data.video ? (
          <div className={cn(styles.paper, styles.paperTexture, styles.postcard)}>
            <p className={styles.postcardTitle}>{t("aClipForYou")}</p>
            <GiftVideo video={data.video} locale={data.locale} className="aspect-video" rounded="rounded-[3px]" />
          </div>
        ) : null}

        {data.countdown ? (
          <div className={cn(styles.paper, styles.paperTexture, styles.postcard)}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className={cn(styles.paper, styles.paperTexture, styles.postcard)}>
            <p className={styles.postcardTitle}>{t("ps")}</p>
            <SurpriseReveal
              surprise={data.surprise}
              locale={data.locale}
              tone="light"
              onReveal={() => onEvent?.({ type: "surprise" })}
            />
          </div>
        ) : null}

        <div ref={endRef} className={styles.endSection}>
          <div className={cn(styles.paper, styles.paperTexture, styles.endCard)}>
            <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Polaroids({
  photos,
  seed,
  wide,
  onOpen,
}: {
  photos: GiftPhoto[];
  seed: number;
  wide: boolean;
  onOpen: (photo: GiftPhoto) => void;
}) {
  const layout = useMemo(() => {
    const rng = mulberry32(seed);
    return photos.map(() => ({
      rot: (rng() - 0.5) * 14,
      dropRot: (rng() - 0.5) * 40,
      offset: rng() * 18,
    }));
  }, [photos, seed]);

  return (
    <div className={cn(styles.polaroids, wide && styles.polaroidsWide)}>
      {photos.map((photo, i) => (
        <motion.figure
          key={photo.id}
          className={styles.polaroid}
          style={{ marginTop: layout[i].offset }}
          initial={{ y: -260, rotate: layout[i].rot + layout[i].dropRot, opacity: 0 }}
          whileInView={{ y: 0, rotate: layout[i].rot, opacity: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ type: "spring", stiffness: 140, damping: 13, mass: 0.9, delay: (i % 2) * 0.14 }}
          whileHover={{ scale: 1.03, rotate: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onOpen(photo)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(photo)}
        >
          <div className={styles.tape} />
          <div className={styles.photoBox}>
            <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} />
          </div>
          {photo.caption ? <figcaption className={styles.caption}>{photo.caption}</figcaption> : null}
        </motion.figure>
      ))}
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: GiftPhoto; onClose: () => void }) {
  return (
    <motion.div
      className={styles.lightbox}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.figure
        className={cn(styles.polaroid, styles.polaroidLarge)}
        initial={{ scale: 0.55, rotate: -8, y: 60 }}
        animate={{ scale: 1, rotate: 1.5, y: 0 }}
        exit={{ scale: 0.7, rotate: 6, opacity: 0, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
      >
        <div className={styles.tape} />
        <div className={styles.photoBox}>
          <img src={photo.url} alt={photo.alt ?? ""} draggable={false} />
        </div>
        {photo.caption ? <figcaption className={styles.caption}>{photo.caption}</figcaption> : null}
      </motion.figure>
    </motion.div>
  );
}
