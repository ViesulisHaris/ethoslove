"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { Sticker } from "../_shared/covers/stickers";
import { FlowerCluster, LeopardSpots, Motif, Paperclip, Pushpin, RansomTitle, Tape, THEMES, WaxSeal, tornClip, type Theme, type ThemeId } from "./art";
import type { ScrapbookFields } from "./schema";

const TYPE = 'var(--font-type), "Courier New", ui-monospace, monospace';
const POSTER = "var(--font-poster), Georgia, serif";
const SCRIPT = "var(--font-script), var(--gift-font-hand), cursive";

/** Paper grain, multiplied over every note, card and label. */
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55 0 0 0 0 0.48 0 0 0 0 0.38 0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

/** Book cloth: two faint diagonal weaves. */
const CLOTH = "repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,.06) 0 2px, transparent 2px 5px)";

const KEYFRAMES = `
.sb-sway{transform-origin:50% 80%;animation:sb-sway 7s ease-in-out infinite alternate}
@keyframes sb-sway{from{rotate:-2.5deg}to{rotate:2.5deg}}
.sb-float{animation:sb-float 4.8s ease-in-out infinite alternate}
@keyframes sb-float{from{translate:0 0}to{translate:0 -7px}}
.sb-bars span{transform-origin:50% 100%;animation:sb-bar .9s ease-in-out infinite alternate}
@keyframes sb-bar{from{scale:1 .35}to{scale:1 1}}
@media (prefers-reduced-motion: reduce){.sb-sway,.sb-float,.sb-bars span{animation:none}}
`;

type Copy = {
  open: string;
  book: string;
  forName: string;
  from: string;
  for: string;
  playing: string;
  booth: string;
  headline: Record<ThemeId, string>;
  quote: Record<ThemeId, string>;
  tag: Record<ThemeId, string>;
};

const S: Record<"en" | "es", Copy> = {
  en: {
    open: "open the scrapbook",
    book: "scrapbook",
    forName: "for {name}",
    from: "From",
    for: "For",
    playing: "now playing",
    booth: "photo booth",
    headline: { blossom: "little things", leopard: "favorite person", seaside: "you + me", sunshine: "my sunshine", film: "memories" },
    quote: {
      blossom: "a collection of little things that mean the most",
      leopard: "my favorite place is anywhere next to you",
      seaside: "every wave brings me back to you",
      sunshine: "you make every day a little brighter",
      film: "the best parts of my life have you in them",
    },
    tag: { blossom: "memories · moments · always", leopard: "you + me · forever", seaside: "salt · sun · us", sunshine: "good days · with you", film: "{year} · recap · us" },
  },
  es: {
    open: "abre el álbum",
    book: "álbum",
    forName: "para {name}",
    from: "De",
    for: "Para",
    playing: "sonando",
    booth: "fotomatón",
    headline: { blossom: "pequeñas cosas", leopard: "persona favorita", seaside: "tú + yo", sunshine: "mi sol", film: "recuerdos" },
    quote: {
      blossom: "una colección de pequeñas cosas que lo significan todo",
      leopard: "mi sitio favorito es cualquiera a tu lado",
      seaside: "cada ola me devuelve a ti",
      sunshine: "haces cada día un poco más bonito",
      film: "las mejores partes de mi vida te tienen a ti",
    },
    tag: { blossom: "recuerdos · momentos · siempre", leopard: "tú + yo · siempre", seaside: "sal · sol · nosotros", sunshine: "días buenos · contigo", film: "{year} · resumen · nosotros" },
  },
};

type Stage = "closed" | "opening" | "open";
type Data = TemplateProps<ScrapbookFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ScrapbookFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const themeId: ThemeId = data.fields.theme in THEMES ? data.fields.theme : "blossom";
  const theme = THEMES[themeId];
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "open" : "closed");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const open = () => {
    if (stage !== "closed") return;
    void audio.start();
    eventRef.current?.({ type: "started" });
    setStage("opening");
    window.setTimeout(() => {
      setBurst((b) => b + 1);
      setStage("open");
      eventRef.current?.({ type: "progress", pct: 30 });
    }, reduce ? 300 : 1150);
  };

  const replay = () => {
    setStage("closed");
    setRun((r) => r + 1);
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: theme.page, color: theme.ink, fontFamily: "var(--gift-font-body)", ["--k" as string]: "min(var(--u), 0.5cqh)" } as CSSProperties}>
      <style>{KEYFRAMES}</style>
      {theme.motif === "leopard" ? <LeopardSpots className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" /> : null}
      <div className="pointer-events-none absolute inset-0 z-[4]" aria-hidden="true">
        <Ambience layers={theme.ambience} opacity={stage === "open" ? 0.7 : 1} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <Closed key={`closed-${run}`} theme={theme} s={s} data={data} opening={stage === "opening"} reduce={!!reduce} onOpen={open} />
        ) : (
          <Open key={`open-${run}`} theme={theme} themeId={themeId} s={s} t={t} data={data} mode={mode} still={mode === "preview" || !!reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={mode === "preview" ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={[theme.accent, "#FFFFFF", theme.letters[1].bg, theme.letters[3].bg]} count={150} origin={{ x: 0.5, y: 0.4 }} className="pointer-events-none absolute inset-0 z-30" />
      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/** The closed scrapbook: a cloth cover with their name on the label and a polaroid tucked in. */
function Closed({ theme, s, data, opening, reduce, onOpen }: { theme: Theme; s: Copy; data: Data; opening: boolean; reduce: boolean; onOpen: () => void }) {
  const c = theme.cover;
  const photo = data.photos[0];
  const label = data.title?.trim() || s.forName.replace("{name}", data.recipientName);

  return (
    <motion.div className="absolute inset-0 z-10 flex flex-col items-center justify-center" exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.4 } }}>
      <motion.div
        className="relative"
        style={{ width: "min(calc(70 * var(--k)), 420px)", aspectRatio: "3 / 4", perspective: "1800px" }}
        initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
      >
        {/* the first page, waiting under the cover */}
        <div className="absolute inset-0 overflow-hidden rounded-[10px]" style={{ backgroundColor: "#FBF7EE", backgroundImage: GRAIN, boxShadow: "0 34px 60px -28px rgba(0,0,0,.6)" }}>
          <FlowerCluster flowers={theme.flowers} seed={11} className="absolute -right-[10%] -bottom-[8%] w-[74%]" />
          <p className="absolute top-[12%] left-[12%] text-[calc(6*var(--k))] text-[#3B2A2A]" style={{ fontFamily: SCRIPT }}>
            {data.recipientName}
          </p>
        </div>

        {/* a polaroid tucked between the pages, sticking out of the top */}
        {photo ? (
          <div className="absolute -top-[12%] right-[8%] z-[1] w-[40%] rotate-[9deg] bg-[#FFFDF8] p-[4%] pb-[13%] shadow-[0_10px_22px_-8px_rgba(0,0,0,.45)]">
            <div className="aspect-square overflow-hidden bg-[#E9E1D6]">
              <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" />
            </div>
          </div>
        ) : null}

        {/* the cover swings open on its spine */}
        <motion.button
          type="button"
          onClick={onOpen}
          aria-label={s.open}
          className="absolute inset-0 z-[2] rounded-[10px] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
          animate={{ rotateY: opening ? -168 : 0 }}
          transition={{ duration: reduce ? 0.2 : 1.1, ease: [0.65, 0, 0.35, 1] }}
          whileTap={opening ? undefined : { scale: 0.985 }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-[10px] [backface-visibility:hidden]" style={{ backgroundColor: c.cloth, backgroundImage: CLOTH, boxShadow: "0 34px 60px -28px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.08)" }}>
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[10%]" style={{ background: `linear-gradient(90deg, ${c.clothDeep}, ${c.cloth})`, boxShadow: "inset -2px 0 4px rgba(0,0,0,.2)" }} />
            <span aria-hidden="true" className="absolute inset-y-0 right-[15%] w-[8%]" style={{ background: c.ribbon, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
            <div className="absolute inset-x-[15%] top-[28%] rounded-[4px] px-[8%] py-[10%] text-center shadow-[0_8px_18px_rgba(0,0,0,.22)]" style={{ backgroundColor: c.label, backgroundImage: GRAIN }}>
              <span aria-hidden="true" className="pointer-events-none absolute inset-[6%] rounded-[2px] border" style={{ borderColor: `${c.ribbon}66` }} />
              <p className="text-[calc(2.6*var(--k))] tracking-[0.42em] uppercase" style={{ fontFamily: POSTER, color: c.ribbon }}>
                {s.book}
              </p>
              <p className="mt-[calc(1.6*var(--k))] text-[calc(7.6*var(--k))] leading-[1.05] break-words text-[#2E2521]" style={{ fontFamily: "var(--gift-font-hand)" }}>
                {label}
              </p>
            </div>
            <div aria-hidden="true" className="absolute bottom-[7%] left-[14%] w-[26%] -rotate-12">
              <Motif theme={theme} index={0} />
            </div>
            <div aria-hidden="true" className="absolute top-[7%] left-[16%] w-[14%] rotate-12">
              <Sticker id="sparkle" />
            </div>
            <FlowerCluster flowers={theme.flowers} seed={23} className="absolute right-[2%] bottom-[2%] w-[42%]" />
          </div>
          {/* the inside of the cover, seen as it swings past */}
          <div aria-hidden="true" className="absolute inset-0 rounded-[10px] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ backgroundColor: "#F3EADB", backgroundImage: GRAIN }} />
        </motion.button>
      </motion.div>

      <motion.p
        aria-hidden="true"
        className="mt-[calc(8*var(--k))] rounded-full px-[calc(4.5*var(--k))] py-[calc(1.6*var(--k))] text-[calc(3.2*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm"
        style={{ background: theme.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.78)", color: theme.dark ? theme.ink : theme.accent }}
        initial={{ opacity: 0 }}
        animate={opening ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }}
        transition={opening ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}
      >
        {s.open}
      </motion.p>
    </motion.div>
  );
}

/** Every piece lands on the page like it's being stuck down: a little big, tilted, then pressed flat. */
function Placed({ rot = 0, delay = 0, still, className, children }: { rot?: number; delay?: number; still: boolean; className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      style={{ rotate: rot }}
      initial={still ? false : { opacity: 0, scale: 1.12, rotate: rot + (rot >= 0 ? 7 : -7), y: 28 }}
      whileInView={{ opacity: 1, scale: 1, rotate: rot, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", stiffness: 110, damping: 15, mass: 0.9, delay }}
    >
      {children}
    </motion.div>
  );
}

function Open({
  theme,
  themeId,
  s,
  t,
  data,
  mode,
  still,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  theme: Theme;
  themeId: ThemeId;
  s: Copy;
  t: ReturnType<typeof useGiftStrings>;
  data: Data;
  mode: TemplateProps["mode"];
  still: boolean;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const seed = hashString(`${data.recipientName}|${data.senderName}|scrapbook`);
  const photos = data.photos;
  const hero = photos[0];
  const booth = photos.slice(1, 4);
  const stamp = photos[4];
  const rest = photos.slice(5);
  const headline = data.fields.headline?.trim() || s.headline[themeId];
  const quote = data.fields.quote?.trim() || s.quote[themeId];
  const tag = (data.fields.tag?.trim() || s.tag[themeId]).replace("{year}", String(new Date().getFullYear()));
  const tape = (i: number) => theme.tapes[i % theme.tapes.length];
  const note: CSSProperties = { backgroundColor: theme.note, color: theme.noteInk, backgroundImage: GRAIN };

  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "progress", pct: 100 });
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, mode]);

  return (
    <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
        <div className="relative mx-auto flex w-[min(86cqw,540px)] flex-col gap-[calc(9*var(--u))] pt-[max(11cqh,68px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
          <RansomTitle text={headline} letters={theme.letters} seed={seed} reduce={still} />

          {/* the first photo, a pinned note and flowers */}
          <section className="relative">
            <div className="sb-sway pointer-events-none absolute -top-[calc(12*var(--u))] -left-[calc(16*var(--u))] z-0 w-[calc(46*var(--u))]">
              <FlowerCluster flowers={theme.flowers} seed={seed + 1} className="w-full" />
            </div>
            <Placed rot={-4} still={still} className="relative z-[1] ml-[4%] w-[62%]">
              <Polaroid photo={hero} theme={theme} still={still} tape={tape(0)} />
            </Placed>
            <Placed rot={6} delay={0.2} still={still} className="absolute top-[14%] right-[-2%] z-[2] w-[40%]">
              <PinnedNote text={tag} theme={theme} />
            </Placed>
            <div className="sb-float pointer-events-none absolute right-[6%] -bottom-[calc(5*var(--u))] z-[3] w-[calc(17*var(--u))]">
              <Motif theme={theme} index={1} />
            </div>
          </section>

          {/* the torn note */}
          <Placed rot={-1.5} still={still} className="relative mx-[2%]">
            <div style={{ filter: "drop-shadow(0 14px 16px rgba(0,0,0,.2))" }}>
              <div className="px-[10%] pt-[calc(10*var(--u))] pb-[calc(9*var(--u))] text-center" style={{ ...note, clipPath: tornClip(seed + 3) }}>
                <p className="text-[calc(5.2*var(--u))] leading-[1.8] break-words" style={{ fontFamily: SCRIPT }}>
                  {quote}
                </p>
                <svg viewBox="0 0 40 36" className="mx-auto mt-[calc(3*var(--u))] w-[calc(9*var(--u))]" aria-hidden="true">
                  <path d="M20 32S4 22 4 12C4 6 8.5 3 13 3c3 0 5.5 1.6 7 4 1.5-2.4 4-4 7-4 4.5 0 9 3 9 9 0 10-16 20-16 20Z" fill="none" stroke={theme.accent} strokeWidth="2.4" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <Paperclip className="absolute -top-[calc(5*var(--u))] left-[14%] h-[calc(17*var(--u))] -rotate-6" />
          </Placed>

          {/* a photo-booth strip and a stamp */}
          {booth.length || stamp ? (
            <section className="grid grid-cols-[44%_1fr] items-start gap-[calc(6*var(--u))]">
              {booth.length ? (
                <Placed rot={-3} still={still} className="relative">
                  <PhotoBooth photos={booth} label={s.booth} />
                  <Tape color={tape(1)} className="absolute -top-[calc(2.4*var(--u))] left-1/2 h-[calc(5*var(--u))] w-[calc(20*var(--u))] -translate-x-1/2 rotate-3" />
                </Placed>
              ) : (
                <div />
              )}
              <div className="flex flex-col items-center gap-[calc(9*var(--u))] pt-[calc(8*var(--u))]">
                {stamp ? (
                  <Placed rot={5} delay={0.15} still={still} className="w-[86%]">
                    <StampPhoto photo={stamp} />
                  </Placed>
                ) : null}
                <div className="sb-float w-[50%]" style={{ animationDelay: "-1.6s" }}>
                  <Placed rot={-10} delay={0.3} still={still}>
                    <Motif theme={theme} index={2} />
                  </Placed>
                </div>
              </div>
            </section>
          ) : null}

          {/* the rest on a roll of film */}
          {rest.length ? (
            <Placed rot={-2} still={still} className="relative -mx-[3%]">
              <FilmStrip photos={rest} />
            </Placed>
          ) : null}

          {/* the letter */}
          <Placed rot={0.8} still={still} className="relative">
            <article
              className="relative rounded-[6px] px-[calc(7*var(--u))] pt-[calc(9*var(--u))] pb-[calc(10*var(--u))] shadow-[0_1px_2px_rgba(0,0,0,.18),0_30px_50px_-26px_rgba(0,0,0,.6)]"
              style={{ backgroundColor: theme.card, color: theme.cardInk, backgroundImage: GRAIN }}
            >
              <Tape color={tape(2)} className="absolute -top-[calc(2.6*var(--u))] left-1/2 h-[calc(5.2*var(--u))] w-[calc(26*var(--u))] -translate-x-1/2 -rotate-2" />
              <div className="flex flex-col gap-[calc(1.2*var(--u))] text-[calc(4*var(--u))] leading-tight" style={{ fontFamily: TYPE }}>
                <span className="break-words">
                  {s.from}: {data.senderName}
                </span>
                <span className="break-words">
                  {s.for}: {data.recipientName}
                </span>
              </div>
              <div className="my-[calc(4.5*var(--u))] h-px w-full bg-current opacity-20" />
              <MessageBody data={data} blocks={blocks} mode={mode} tone={theme.cardDark ? "dark" : "light"} face="type" greeting={null} ornament={false} accent={theme.accent} />
              <WaxSeal color={theme.accent} letter={data.senderName.trim().charAt(0).toUpperCase() || "♥"} className="absolute -right-[calc(3*var(--u))] -bottom-[calc(5*var(--u))] w-[calc(18*var(--u))] drop-shadow-[0_6px_8px_rgba(0,0,0,.3)]" />
            </article>
          </Placed>

          {data.music?.title ? (
            <Placed rot={-1.5} still={still}>
              <NowPlaying title={data.music.title} artist={data.music.artist} theme={theme} label={s.playing} />
            </Placed>
          ) : null}

          {data.countdown ? (
            <Placed rot={-2} still={still}>
              <div className="rounded-[4px] p-[calc(5*var(--u))] shadow-[0_18px_30px_-18px_rgba(0,0,0,.45)]" style={note}>
                <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
              </div>
            </Placed>
          ) : null}

          {data.surprise ? (
            <Placed rot={1.5} still={still} className="relative">
              <div className="rounded-[4px] px-[calc(5*var(--u))] pt-[calc(9*var(--u))] pb-[calc(5*var(--u))] shadow-[0_18px_30px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: theme.kraft, color: "#2E2521", backgroundImage: GRAIN }}>
                <p className="mb-[calc(3*var(--u))] text-center text-[calc(3*var(--u))] tracking-[0.24em] uppercase opacity-70" style={{ fontFamily: TYPE }}>
                  {t("ps")}
                </p>
                <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
              </div>
              <Pushpin color={theme.accent} className="absolute -top-[calc(3.5*var(--u))] left-1/2 w-[calc(8*var(--u))] -translate-x-1/2" />
            </Placed>
          ) : null}

          {/* a bouquet laid over the last page */}
          <section className="relative pt-[calc(18*var(--u))]">
            <div className="sb-sway pointer-events-none absolute top-0 left-1/2 z-[1] w-[calc(44*var(--u))] -translate-x-1/2">
              <FlowerCluster flowers={theme.flowers} seed={seed + 9} className="w-full" />
            </div>
            <div ref={endRef} className="relative z-0 rounded-[6px] px-[calc(4*var(--u))] pt-[calc(22*var(--u))] pb-[calc(5*var(--u))]" style={{ background: theme.dark ? "rgba(0,0,0,.32)" : "rgba(255,253,248,.9)", backdropFilter: "blur(6px)" }}>
              <EndScreen data={data} tone={theme.dark ? "dark" : "light"} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

/** The first photo as a polaroid that develops: it starts washed out and warm, then comes up. */
function Polaroid({ photo, theme, still, tape }: { photo?: GiftPhoto; theme: Theme; still: boolean; tape: string }) {
  return (
    <figure className="relative m-0 bg-[#FFFDF8] p-[calc(2.6*var(--u))] pb-[calc(3*var(--u))] shadow-[0_24px_40px_-20px_rgba(0,0,0,.55)]">
      <Tape color={tape} className="absolute -top-[calc(2.5*var(--u))] left-[14%] z-[2] h-[calc(5.2*var(--u))] w-[calc(24*var(--u))] -rotate-6" />
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#EDE5DA]">
        {photo ? (
          <motion.img
            src={photo.url}
            alt={photo.alt ?? ""}
            draggable={false}
            className="h-full w-full object-cover"
            initial={still ? false : { filter: "sepia(0.75) brightness(1.3) contrast(0.75) saturate(0.6)" }}
            whileInView={{ filter: "sepia(0) brightness(1) contrast(1) saturate(1)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 2.4, delay: 0.5, ease: "easeOut" }}
          />
        ) : (
          <FlowerCluster flowers={theme.flowers} seed={3} className="absolute inset-[8%] h-[84%] w-[84%]" />
        )}
        {photo && !still ? (
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#FFFDF8]" initial={{ opacity: 0.9 }} whileInView={{ opacity: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 1.9, delay: 0.35, ease: "easeOut" }} />
        ) : null}
      </div>
      <figcaption className="mt-[calc(2.4*var(--u))] min-h-[calc(6*var(--u))] text-center text-[calc(5*var(--u))] leading-tight break-words text-[#3A2E2A]" style={{ fontFamily: "var(--gift-font-hand)" }}>
        {photo?.caption ?? ""}
      </figcaption>
    </figure>
  );
}

function PinnedNote({ text, theme }: { text: string; theme: Theme }) {
  const lines = text
    .split("·")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div className="relative px-[calc(3*var(--u))] pt-[calc(7*var(--u))] pb-[calc(4.5*var(--u))] text-center text-[#2E2521] shadow-[0_16px_26px_-16px_rgba(0,0,0,.5)]" style={{ backgroundColor: theme.kraft, backgroundImage: GRAIN }}>
      <Pushpin color={theme.accent} className="absolute -top-[calc(3.2*var(--u))] left-1/2 w-[calc(8*var(--u))] -translate-x-1/2" />
      {lines.map((line, i) => (
        <p key={i} className="text-[calc(3.9*var(--u))] leading-[1.5] break-words" style={{ fontFamily: TYPE }}>
          {line}
        </p>
      ))}
    </div>
  );
}

function PhotoBooth({ photos, label }: { photos: GiftPhoto[]; label: string }) {
  return (
    <div className="bg-[#FFFDF8] p-[calc(2.2*var(--u))] pb-[calc(3*var(--u))] shadow-[0_24px_40px_-20px_rgba(0,0,0,.55)]">
      <div className="flex flex-col gap-[calc(2*var(--u))]">
        {photos.map((p) => (
          <div key={p.id} className="aspect-[4/3] overflow-hidden bg-[#1E1B1C]">
            <img src={p.url} alt={p.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover [filter:grayscale(.35)_contrast(1.06)]" />
          </div>
        ))}
      </div>
      <p className="mt-[calc(2.2*var(--u))] text-center text-[calc(2.9*var(--u))] tracking-[0.22em] text-[#5A4A42] uppercase" style={{ fontFamily: TYPE }}>
        {label}
      </p>
    </div>
  );
}

function StampPhoto({ photo }: { photo: GiftPhoto }) {
  return (
    <div className="relative bg-[#FFFDF8] p-[calc(2.6*var(--u))] shadow-[0_16px_26px_-16px_rgba(0,0,0,.5)]" style={{ outline: "2px dashed rgba(46,37,33,.22)", outlineOffset: "calc(-1.3 * var(--u))" }}>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#EDE5DA]">
        <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        <span className="absolute right-[7%] bottom-[5%] text-[calc(5.4*var(--u))] leading-none text-white [text-shadow:0_1px_4px_rgba(0,0,0,.55)]" style={{ fontFamily: POSTER }}>
          50¢
        </span>
      </div>
      <svg viewBox="0 0 84 40" className="pointer-events-none absolute -top-[calc(3*var(--u))] -right-[calc(9*var(--u))] w-[calc(26*var(--u))] opacity-55" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#2E2521" strokeWidth="1.6" />
        <circle cx="20" cy="20" r="10" fill="none" stroke="#2E2521" strokeWidth="1" />
        <path d="M40 12c6-4 11 4 17 0s11 4 17 0M40 20c6-4 11 4 17 0s11 4 17 0M40 28c6-4 11 4 17 0s11 4 17 0" fill="none" stroke="#2E2521" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FilmStrip({ photos }: { photos: GiftPhoto[] }) {
  const holes = "repeating-linear-gradient(90deg, rgba(255,255,255,.88) 0 calc(2.2 * var(--u)), transparent calc(2.2 * var(--u)) calc(5 * var(--u)))";
  return (
    <div className="relative rounded-[3px] bg-[#141213] py-[calc(5*var(--u))] shadow-[0_24px_40px_-20px_rgba(0,0,0,.6)]">
      <span aria-hidden="true" className="absolute inset-x-[calc(2*var(--u))] top-[calc(1.6*var(--u))] h-[calc(1.8*var(--u))]" style={{ backgroundImage: holes }} />
      <span aria-hidden="true" className="absolute inset-x-[calc(2*var(--u))] bottom-[calc(1.6*var(--u))] h-[calc(1.8*var(--u))]" style={{ backgroundImage: holes }} />
      <div className="scrollbar-none flex snap-x snap-mandatory gap-[calc(2.4*var(--u))] overflow-x-auto px-[calc(3*var(--u))]">
        {photos.map((p) => (
          <figure key={p.id} className="m-0 w-[calc(42*var(--u))] shrink-0 snap-center">
            <div className="aspect-[4/3] overflow-hidden bg-black">
              <img src={p.url} alt={p.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
            </div>
            {p.caption ? (
              <figcaption className="mt-[calc(1.4*var(--u))] truncate text-center text-[calc(2.8*var(--u))] tracking-[0.12em] text-white/75 uppercase" style={{ fontFamily: TYPE }}>
                {p.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  );
}

function NowPlaying({ title, artist, theme, label }: { title: string; artist?: string; theme: Theme; label: string }) {
  const light = !theme.dark;
  return (
    <div
      className="flex items-center gap-[calc(3.4*var(--u))] rounded-[calc(4.5*var(--u))] px-[calc(4*var(--u))] py-[calc(3.4*var(--u))] shadow-[0_18px_30px_-18px_rgba(0,0,0,.45)]"
      style={{ background: light ? "#FFFDF8" : "rgba(255,255,255,.1)", color: light ? "#2E2521" : "#F4EDE4", backdropFilter: light ? undefined : "blur(10px)" }}
    >
      <div className="sb-bars flex size-[calc(12*var(--u))] shrink-0 items-end justify-center gap-[calc(0.9*var(--u))] rounded-[calc(3*var(--u))] pb-[calc(3*var(--u))]" style={{ background: theme.accent }} aria-hidden="true">
        {[5, 3.5, 6, 4].map((h, i) => (
          <span key={i} className="block w-[calc(1.3*var(--u))] rounded-full bg-white" style={{ height: `calc(${h} * var(--u))`, animationDelay: `${i * -0.27}s` }} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[calc(2.7*var(--u))] tracking-[0.22em] uppercase opacity-60" style={{ fontFamily: TYPE }}>
          {label}
        </p>
        <p className="truncate text-[calc(4.4*var(--u))] font-semibold">{title}</p>
        {artist ? <p className="truncate text-[calc(3.4*var(--u))] opacity-70">{artist}</p> : null}
      </div>
    </div>
  );
}
