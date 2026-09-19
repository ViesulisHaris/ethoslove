"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
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
import { TapPill, type CoverTone } from "../_shared/cover-kit";
import { AgeBadge, BalloonDoodle, CakeDoodle, Doodle, GRAIN, SKETCH_KEYFRAMES, Spiral, TapeStrip, THEMES, Underline, type Theme, type ThemeId } from "./art";
import { buildPages, pageProgress, type Page } from "./pages";
import type { SketchbookFields } from "./schema";

type Copy = { open: string; book: string; forName: string; turn: string; back: string; next: string; title: string; wish: string; thisOne: string; playing: string; from: string };

const S: Record<"en" | "es", Copy> = {
  en: { open: "open the sketchbook", book: "sketchbook", forName: "for {name}", turn: "tap to turn the page", back: "Previous page", next: "Next page", title: "happy birthday", wish: "make a wish", thisOne: "this one!!", playing: "now playing", from: "from" },
  es: { open: "abre el cuaderno", book: "cuaderno", forName: "para {name}", turn: "toca para pasar la página", back: "Página anterior", next: "Página siguiente", title: "feliz cumple", wish: "pide un deseo", thisOne: "esta!!", playing: "sonando", from: "de" },
};

const HAND = "var(--gift-font-hand)";
const SCRIPT = "var(--font-script), var(--gift-font-hand), cursive";

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<SketchbookFields>) {
  const reduce = !!useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const themeId: ThemeId = data.fields.theme in THEMES ? data.fields.theme : "white";
  const theme = THEMES[themeId];
  const preview = mode === "preview";
  const still = preview || reduce;
  const seed = hashString(`${data.recipientName}|${data.senderName}|sketchbook`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const pages = useMemo(() => buildPages(data.photos), [data.photos]);
  const [open, setOpen] = useState(preview);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const openBook = () => {
    if (open) return;
    void audio.start();
    eventRef.current?.({ type: "started" });
    setOpen(true);
  };

  const go = (next: number) => {
    if (!open || next < 0 || next >= pages.length || next === index) return;
    setIndex(next);
    eventRef.current?.({ type: "progress", pct: Math.min(95, pageProgress(next, pages.length)) });
  };

  const replay = () => {
    setOpen(false);
    setIndex(0);
    setRun((r) => r + 1);
  };

  // A swipe turns the page too, either way.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(e.clientY - start.y) * 1.4) go(index + (dx < 0 ? 1 : -1));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, pages.length]);

  const tone: CoverTone = { page: theme.paper, glow: ["transparent", "transparent"], accent: theme.accent, dark: theme.dark };
  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(0.92cqw, 0.6cqh)" } as CSSProperties;
  const last = index === pages.length - 1;
  const page = pages[index];

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: theme.desk, color: theme.ink, fontFamily: "var(--gift-font-body)", ...vars }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <style>{SKETCH_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: GRAIN, opacity: theme.dark ? 0.3 : 0.5 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={theme.ambience} opacity={0.8} />
      </div>

      {/* the book on the desk */}
      <div className="absolute left-1/2 top-1/2" style={{ width: "calc(100 * var(--p))", height: "calc(150 * var(--p))", translate: "-50% -53%", rotate: "-1.2deg" }}>
        {/* the pages under the open one: a stack, and the paper the next page is drawn on */}
        <div aria-hidden="true" className="absolute inset-0 translate-x-[3px] translate-y-[4px] rounded-[6px]" style={{ background: theme.paper, filter: "brightness(.94)", boxShadow: "0 30px 50px -22px rgba(0,0,0,.6)" }} />
        <div aria-hidden="true" className="absolute inset-0 translate-x-[1.5px] translate-y-[2px] rounded-[6px]" style={{ background: theme.paper, filter: "brightness(.97)" }} />
        <div className="absolute inset-0 rounded-[6px]" style={{ background: theme.paper, backgroundImage: GRAIN }}>
          {open && pages[index + 1] ? <PageBody page={pages[index + 1]} data={data} theme={theme} s={s} t={t} still blank seed={seed + index + 1} mode={mode} blocks={blocks} /> : null}
        </div>

        {/* the page they are on: it lifts off the top and flips over the coil when they turn it */}
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key={`page-${run}-${index}`}
              className="absolute inset-0 rounded-[6px]"
              style={{ background: theme.paper, backgroundImage: GRAIN, transformOrigin: "50% 0%", transformStyle: "preserve-3d", backfaceVisibility: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,.12)" }}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: 0 }}
              exit={still ? { opacity: 0, transition: { duration: 0.15 } } : { rotateX: -150, opacity: 0.6, transition: { duration: 0.75, ease: [0.55, 0, 0.3, 1] } }}
            >
              <PageBody page={page} data={data} theme={theme} s={s} t={t} still={still} seed={seed + index} mode={mode} blocks={blocks} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* the cover, shut, or flipped up and over the top */}
        <AnimatePresence initial={false}>
          {!open ? (
            <motion.button
              key={`cover-${run}`}
              type="button"
              onClick={openBook}
              aria-label={s.open}
              className="absolute inset-0 rounded-[6px] outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              style={{ transformOrigin: "50% 0%", backgroundColor: theme.cover.cloth, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, rgba(0,0,0,.07) 0 2px, transparent 2px 5px)", boxShadow: "0 30px 50px -22px rgba(0,0,0,.65), inset 0 0 0 1px rgba(0,0,0,.12)" }}
              initial={still ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={still ? { opacity: 0, transition: { duration: 0.2 } } : { rotateX: -160, opacity: 0.5, transition: { duration: 0.9, ease: [0.55, 0, 0.3, 1] } }}
              transition={{ type: "spring", stiffness: 80, damping: 16 }}
            >
              <Cover data={data} theme={theme} s={s} still={still} seed={seed} />
            </motion.button>
          ) : null}
        </AnimatePresence>

        <Spiral color={theme.spiral} className="pointer-events-none absolute -top-[calc(3.2*var(--p))] left-[4%] z-[20] h-[calc(6.4*var(--p))] w-[92%]" />

        {/* turning: the right of the page goes forward, the left goes back */}
        {open && !last ? <button type="button" aria-label={s.next} onClick={() => go(index + 1)} className="absolute inset-y-0 right-0 z-[15] w-[62%] cursor-pointer outline-none" data-turn="next" /> : null}
        {open && index > 0 ? <button type="button" aria-label={s.back} onClick={() => go(index - 1)} className="absolute inset-y-0 left-0 z-[15] w-[22%] cursor-pointer outline-none" data-turn="back" /> : null}
      </div>

      {/* the one line that says what to do */}
      <AnimatePresence>
        {!last ? (
          <motion.div key={open ? "turn" : "open"} className="pointer-events-none absolute inset-x-0 z-[30] flex justify-center px-4" style={{ bottom: "max(calc(2.6*var(--k)), calc(env(safe-area-inset-bottom) + 0.8rem))" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <TapPill tone={tone} reduce={reduce} delay={preview ? 0 : open ? 2.6 : 1}>
              {open ? s.turn : s.open}
            </TapPill>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* the page count */}
      {open ? (
        <p aria-hidden="true" className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] z-[30] text-[calc(3*var(--k))] tracking-[0.2em]" style={{ bottom: "max(calc(3.2*var(--k)), calc(env(safe-area-inset-bottom) + 1rem))", color: theme.dark ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.45)", fontFamily: HAND }}>
          {index + 1} / {pages.length}
        </p>
      ) : null}

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/** The cover: cloth, a paper label with their name in handwriting, a doodled cake taped on, and a strip of washi tape. */
function Cover({ data, theme, s, still, seed }: { data: TemplateProps<SketchbookFields>["data"]; theme: Theme; s: Copy; still: boolean; seed: number }) {
  const c = theme.cover;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[6px]">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[7%]" style={{ background: `linear-gradient(90deg, ${c.clothDeep}, ${c.cloth})` }} />
      <div className="absolute inset-x-[14%] top-[24%] rounded-[3px] px-[6%] py-[7%] text-center shadow-[0_8px_18px_rgba(0,0,0,.22)]" style={{ backgroundColor: c.label, backgroundImage: GRAIN, color: c.labelInk }}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-[5%] rounded-[2px] border" style={{ borderColor: `${c.labelInk}55` }} />
        <p className="text-[calc(2.6*var(--p))] tracking-[0.42em] uppercase opacity-70">{s.book}</p>
        <p className="mt-[calc(1.6*var(--p))] text-[calc(8*var(--p))] leading-[1.05] break-words" style={{ fontFamily: SCRIPT }}>
          {s.forName.replace("{name}", data.recipientName)}
        </p>
      </div>
      <div className="absolute right-[8%] bottom-[8%] w-[40%] rotate-[8deg] rounded-[3px] p-[3%] shadow-[0_10px_20px_-8px_rgba(0,0,0,.45)]" style={{ backgroundColor: theme.paper, backgroundImage: GRAIN }}>
        <div className="aspect-[10/9]">
          <CakeDoodle theme={theme} candles={3} still seed={seed + 40} />
        </div>
        <TapeStrip color={theme.tape} className="absolute -top-[6%] left-[24%] h-[10%] w-[52%] -rotate-3" />
      </div>
      <div className="absolute left-[10%] bottom-[12%] w-[22%] -rotate-6">
        <Doodle kind="hat" theme={{ ...theme, ink: c.label }} wash={theme.washes[2]} still={still} seed={seed + 2} at={0.6} />
      </div>
    </div>
  );
}

type Data = TemplateProps<SketchbookFields>["data"];

/** What is on a page. `blank` draws the paper only, for the page waiting under the one on top. */
function PageBody({ page, data, theme, s, t, still, blank = false, seed, mode, blocks, onEvent, onReact, onMakeOne, onReplay }: { page: Page; data: Data; theme: Theme; s: Copy; t: ReturnType<typeof useGiftStrings>; still: boolean; blank?: boolean; seed: number; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  if (blank) {
    // Ruled faintly, like the rest of the pad, so the next page reads as paper before it is drawn on.
    return <div aria-hidden="true" className="absolute inset-0 rounded-[6px]" style={{ backgroundImage: page.kind === "letter" ? `repeating-linear-gradient(180deg, transparent 0 calc(5.2 * var(--p)), ${theme.ink}18 calc(5.2 * var(--p)) calc(5.3 * var(--p)))` : undefined, backgroundPosition: "0 calc(12 * var(--p))" }} />;
  }
  if (page.kind === "cake") return <CakePage data={data} theme={theme} s={s} still={still} seed={seed} />;
  if (page.kind === "photos") return <PhotosPage page={page} theme={theme} s={s} still={still} seed={seed} />;
  return <LetterPage data={data} theme={theme} s={s} t={t} mode={mode} blocks={blocks} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />;
}

/** The first page: the line over the cake, the cake drawing itself, their age circled, and the corners doodled. */
function CakePage({ data, theme, s, still, seed }: { data: Data; theme: Theme; s: Copy; still: boolean; seed: number }) {
  const title = data.fields.title?.trim() || s.title;
  const age = data.fields.age;
  const candles = age ? Math.min(8, age) : 5;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[6px]">
      <motion.h1
        className="absolute inset-x-[8%] top-[10%] text-center text-[calc(11*var(--p))] leading-[1] break-words"
        style={{ fontFamily: HAND, color: theme.ink, fontWeight: 700 }}
        initial={still ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {title}
      </motion.h1>
      <Underline ink={theme.accent} still={still} at={0.9} className="absolute inset-x-[16%] top-[24%] h-[calc(2.4*var(--p))]" />
      <div className="absolute inset-x-[8%] top-[30%] h-[52%]">
        <CakeDoodle theme={theme} candles={candles} still={still} seed={seed} at={1.2} />
      </div>
      {age ? <AgeBadge age={age} theme={theme} still={still} seed={seed} at={4.6} className="absolute top-[26%] right-[4%] w-[24%]" /> : null}
      <div className="absolute top-[5%] left-[4%] w-[16%] -rotate-12">
        <Doodle kind="hat" theme={theme} still={still} seed={seed + 1} at={5} />
      </div>
      <div className="absolute top-[6%] right-[6%] w-[12%] rotate-12">
        <Doodle kind="star" theme={theme} still={still} seed={seed + 2} at={5.3} />
      </div>
      <div className="absolute bottom-[8%] left-[6%] w-[18%]">
        <Doodle kind="gift" theme={theme} still={still} seed={seed + 3} at={5.5} />
      </div>
      <motion.p className="absolute right-[8%] bottom-[9%] text-[calc(5*var(--p))] leading-none -rotate-6" style={{ fontFamily: HAND, color: theme.accent }} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5.8, duration: 0.5 }}>
        {s.wish} ✦
      </motion.p>
    </div>
  );
}

/** Photos taped in at a tilt, with arrows, hearts and a note in the sender's hand. */
function PhotosPage({ page, theme, s, still, seed }: { page: Extract<Page, { kind: "photos" }>; theme: Theme; s: Copy; still: boolean; seed: number }) {
  const [a, b] = page.photos;
  const flip = page.index % 2 === 1;
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[6px]">
      {a ? (
        <Taped photo={a} theme={theme} still={still} delay={0.2} className={cn("absolute top-[9%] w-[64%]", flip ? "right-[6%] rotate-[3deg]" : "left-[7%] -rotate-[3deg]")} tapeClass={flip ? "-rotate-6 left-[10%]" : "rotate-6 right-[10%]"} />
      ) : null}
      {b ? (
        <Taped photo={b} theme={theme} still={still} delay={0.6} className={cn("absolute top-[52%] w-[50%]", flip ? "left-[8%] -rotate-[5deg]" : "right-[7%] rotate-[5deg]")} tapeClass={flip ? "rotate-3 right-[12%]" : "-rotate-3 left-[12%]"} />
      ) : null}
      <div className={cn("absolute top-[40%] w-[18%]", flip ? "left-[6%] -scale-x-100" : "right-[6%]")}>
        <Doodle kind="arrow" theme={theme} still={still} seed={seed + 4} at={1.2} />
      </div>
      <motion.p className={cn("absolute top-[35%] text-[calc(4.6*var(--p))] leading-none", flip ? "left-[6%] rotate-6" : "right-[4%] -rotate-6")} style={{ fontFamily: HAND, color: theme.accent }} initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.4 }}>
        {s.thisOne}
      </motion.p>
      <div className={cn("absolute bottom-[6%] w-[12%]", flip ? "right-[10%]" : "left-[8%]")}>
        <Doodle kind="heart" theme={theme} still={still} seed={seed + 5} at={2} />
      </div>
      <div className={cn("absolute top-[4%] w-[16%]", flip ? "left-[4%]" : "right-[4%]")}>
        <Doodle kind="squiggle" theme={theme} still={still} seed={seed + 6} at={2.3} />
      </div>
      {!b ? (
        <div className="absolute bottom-[10%] right-[10%] w-[34%]">
          <BalloonDoodle theme={theme} wash={theme.washes[(seed + 1) % theme.washes.length]} still={still} seed={seed + 7} at={1.4} />
        </div>
      ) : null}
    </div>
  );
}

/** A photo stuck to the page with washi tape, its caption written under it. */
function Taped({ photo, theme, still, delay, className, tapeClass }: { photo: GiftPhoto; theme: Theme; still: boolean; delay: number; className?: string; tapeClass?: string }) {
  return (
    <motion.figure className={cn("m-0 p-[calc(1.6*var(--p))] pb-[calc(1*var(--p))] shadow-[0_14px_24px_-14px_rgba(0,0,0,.55)]", className)} style={{ background: "#FFFDF8" }} initial={still ? false : { opacity: 0, scale: 1.08, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 15, delay }}>
      <TapeStrip color={theme.tape} className={cn("absolute -top-[calc(1.8*var(--p))] z-[2] h-[calc(3.6*var(--p))] w-[38%]", tapeClass)} />
      <div className="aspect-[4/3] overflow-hidden bg-[#E9E1D6]">
        <img src={photo.url} alt={photo.alt ?? ""} draggable={false} className="h-full w-full object-cover" />
      </div>
      <figcaption className="mt-[calc(1.6*var(--p))] min-h-[calc(5*var(--p))] text-center text-[calc(3.8*var(--p))] leading-tight break-words" style={{ fontFamily: HAND, color: "#3A2E2A" }}>
        {photo.caption ?? ""}
      </figcaption>
    </motion.figure>
  );
}

/** The last page: ruled, the letter in handwriting, then everything the gift ends with. */
function LetterPage({ data, theme, s, t, mode, blocks, onEvent, onReact, onMakeOne, onReplay }: { data: Data; theme: Theme; s: Copy; t: ReturnType<typeof useGiftStrings>; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
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
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, mode]);

  const kraft: CSSProperties = { background: theme.dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.05)", color: theme.ink };
  return (
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-[6px] scrollbar-none" style={{ backgroundImage: `repeating-linear-gradient(180deg, transparent 0 calc(5.2 * var(--p)), ${theme.ink}18 calc(5.2 * var(--p)) calc(5.3 * var(--p)))`, backgroundPosition: "0 calc(12 * var(--p))" }}>
      <div className="px-[8%] pt-[12%] pb-[10%]" style={{ color: theme.ink }}>
        <MessageBody data={data} blocks={blocks} mode={mode} tone={theme.dark ? "dark" : "light"} face="hand" accent={theme.accent} />
        {data.music?.title ? (
          <p className="mt-[calc(5*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.2em] uppercase opacity-55">
            {s.playing} · {data.music.title}
            {data.music.artist ? ` — ${data.music.artist}` : ""}
          </p>
        ) : null}
        {data.countdown ? (
          <div className="mt-[calc(5*var(--p))] rounded-[calc(2*var(--p))] p-[calc(4*var(--p))]" style={kraft}>
            <Countdown countdown={data.countdown} locale={data.locale} tone={theme.dark ? "dark" : "light"} />
          </div>
        ) : null}
        {data.surprise ? (
          <div className="mt-[calc(5*var(--p))] rounded-[calc(2*var(--p))] px-[calc(4*var(--p))] pt-[calc(4*var(--p))] pb-[calc(3*var(--p))]" style={kraft}>
            <p className="mb-[calc(2*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={theme.dark ? "dark" : "light"} onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}
        <div ref={endRef} className="mt-[calc(6*var(--p))]">
          <EndScreen data={data} tone={theme.dark ? "dark" : "light"} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
    </div>
  );
}
