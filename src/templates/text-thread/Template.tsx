"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, Phone, Video } from "lucide-react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { RichMessage } from "../_shared/RichMessage";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, TapPill, type CoverTone } from "../_shared/cover-kit";
import { LockGlyph, NotificationCard, StatusIcons } from "./art";
import type { ThreadFields } from "./schema";

const BUBBLE: Record<ThreadFields["bubble"], string> = {
  ink: "#1A1614",
  blue: "#2563eb",
  green: "#2f8f5b",
  coral: "#E8604C",
};

/** Solid and light: the dark treatment disappears against a near-black wallpaper. */
const PILL_TONE: CoverTone = { page: "#0B0E14", glow: ["rgba(255,255,255,.1)", "rgba(255,255,255,.06)"], accent: "#16202E" };
const LOCK_AMBIENCE: { kind: AmbienceKind; colors: string[]; count?: number }[] = [
  { kind: "bokeh", colors: ["#FFFFFF", "#FFD9A8"], count: 6 },
];

const S = {
  en: {
    online: "online",
    today: "Today",
    delivered: "Delivered",
    read: "Read",
    tap: "tap to open the chat",
    typing: "typing…",
    placeholder: "Reply…",
    finale: "Read the whole thing",
    sent: "Sent from a train",
    now: "now",
    /** The three that land on the lock screen before the thread opens. */
    n1: "hey",
    n2: "you up?",
    n3: "i made you something",
  },
  es: {
    online: "en línea",
    today: "Hoy",
    delivered: "Entregado",
    read: "Leído",
    tap: "toca para abrir el chat",
    typing: "escribiendo…",
    placeholder: "Responder…",
    finale: "Leerlo entero",
    sent: "Enviado desde un tren",
    now: "ahora",
    n1: "ey",
    n2: "¿estás ahí?",
    n3: "te he hecho una cosa",
  },
};

type Item = { kind: "text"; text: string } | { kind: "photo"; index: number } | { kind: "message" };

/** Turns lines into a playlist; "[photo]" pulls the next photo; the letter comes last. */
function buildItems(lines: string[], photoCount: number): Item[] {
  const items: Item[] = [];
  let p = 0;
  for (const line of lines) {
    if (/^\[(photo|foto)\]$/i.test(line)) {
      if (p < photoCount) items.push({ kind: "photo", index: p++ });
      continue;
    }
    items.push({ kind: "text", text: line });
  }
  items.push({ kind: "message" });
  return items;
}

/** Tiny synthesised "pop" so messages feel physical; no audio asset needed. */
function pop(ctx: AudioContext | null) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(660, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.08);
  g.gain.setValueAtTime(0.08, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + 0.13);
}

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<ThreadFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const items = useMemo(
    () => buildItems(data.fields.lines, data.photos.length),
    [data.fields.lines, data.photos.length],
  );
  const [shown, setShown] = useState(mode === "preview" ? items.length : 0);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(mode === "preview");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [extras, setExtras] = useState(mode === "preview");
  const scroller = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const bubble = BUBBLE[data.fields.bubble] ?? BUBBLE.ink;
  const name = data.fields.contactName || data.senderName;
  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(data.locale, { hour: "2-digit", minute: "2-digit" }).format(
        new Date(),
      ),
    [data.locale],
  );
  const wallpaper = data.photos[0];
  /** The lock screen clock: hours and minutes only, the way a phone shows them, plus the long date. */
  const clock = useMemo(() => {
    const at = new Date();
    const parts = new Intl.DateTimeFormat(data.locale, { hour: "numeric", minute: "2-digit", hour12: data.locale === "en" }).formatToParts(at);
    const hhmm = parts
      .filter((p) => p.type === "hour" || p.type === "minute" || (p.type === "literal" && p.value.includes(":")))
      .map((p) => p.value)
      .join("");
    const long = new Intl.DateTimeFormat(data.locale, { weekday: "long", day: "numeric", month: "long" }).format(at);
    return { hhmm, date: long.charAt(0).toUpperCase() + long.slice(1) };
  }, [data.locale]);

  // Deliver the next item after a human-ish delay.
  useEffect(() => {
    if (!started || shown >= items.length) return;
    const next = items[shown];
    const len = next.kind === "text" ? next.text.length : next.kind === "photo" ? 30 : 80;
    const typingMs = reduce ? 200 : Math.min(2600, 500 + len * 28);
    const showTyping = data.fields.showTyping && next.kind !== "photo";
    const t1 = window.setTimeout(() => setTyping(showTyping), 250);
    const t2 = window.setTimeout(() => {
      setTyping(false);
      setShown((n) => n + 1);
      pop(ctxRef.current);
      onEvent?.({ type: "progress", pct: Math.round(((shown + 1) / items.length) * 80) });
    }, 250 + typingMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [started, shown, items, reduce, data.fields.showTyping, onEvent]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "instant" : "smooth" });
  }, [shown, typing, extras, reduce]);

  const start = () => {
    setStarted(true);
    void audio.start();
    try {
      ctxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    } catch {
      ctxRef.current = null;
    }
    onEvent?.({ type: "started" });
  };

  const done = shown >= items.length;

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-[#f4f1ec] text-ink select-none"
      style={{ ...COVER_VARS, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      {/* Chat header */}
      <header className="flex h-[max(3.6rem,calc(var(--gift-safe-top,env(safe-area-inset-top))+3rem))] shrink-0 items-end border-b border-black/10 bg-white/80 px-3 pb-2 backdrop-blur">
        <ChevronLeft className="size-5 opacity-50" />
        <div className="ml-1 flex flex-1 items-center gap-2.5">
          <span
            className="grid size-9 place-items-center rounded-full text-sm font-semibold text-white"
            style={{ background: bubble }}
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">{name}</p>
            <p className="text-[11px] text-moss">{typing ? s.typing : s.online}</p>
          </div>
        </div>
        <div className="flex gap-3 pr-1 opacity-50">
          <Phone className="size-4" />
          <Video className="size-4" />
        </div>
      </header>

      {/* Thread */}
      <div
        ref={scroller}
        className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-4"
      >
        <p className="mb-4 text-center text-[11px] text-black/40">
          {s.today} · {time}
        </p>
        <div className="flex flex-col gap-1.5">
          {items.slice(0, shown).map((item, i) => {
            const last = i === shown - 1;
            if (item.kind === "text")
              return (
                <Bubble
                  key={i}
                  bubble={bubble}
                  reduce={!!reduce}
                  first={i === 0 || items[i - 1].kind !== "text"}
                >
                  {item.text}
                </Bubble>
              );
            if (item.kind === "photo") {
              const photo = data.photos[item.index];
              return (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setLightbox(item.index)}
                  initial={reduce ? false : { opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="mr-auto max-w-[72%] overflow-hidden rounded-2xl rounded-bl-md shadow-sm"
                >
                  <img
                    src={photo.url}
                    alt={photo.alt ?? ""}
                    className="block max-h-[38cqh] w-full object-cover"
                  />
                  {photo.caption ? (
                    <span className="block bg-white px-3 py-1.5 text-left text-[13px]">
                      {photo.caption}
                    </span>
                  ) : null}
                </motion.button>
              );
            }
            return (
              <motion.div
                key={i}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                className="mt-2 mr-auto max-w-[88%] rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed text-white shadow-sm [&_em]:opacity-80 [&_p+p]:mt-3 [&_strong]:font-semibold"
                style={{ background: bubble }}
              >
                <RichMessage
                  blocks={blocks}
                  stagger={mode === "preview" ? 0 : 0.6}
                  onDone={() => setExtras(true)}
                />
                <p className="mt-3 text-right text-[11px] opacity-60">
                  {last ? s.read : s.delivered} · {time}
                </p>
              </motion.div>
            );
          })}
          {typing ? (
            <div
              className="mr-auto flex h-9 items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 shadow-sm"
              aria-label={s.typing}
            >
              {[0, 1, 2].map((k) => (
                <motion.span
                  key={k}
                  className="size-2 rounded-full bg-black/35"
                  animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.15 }}
                />
              ))}
            </div>
          ) : null}
          {done && extras ? (
            <div className="mt-4 flex flex-col gap-3">
              {data.countdown ? (
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="mb-3 text-center text-[11px] tracking-[0.25em] text-black/45 uppercase">
                    {t("ps")}
                  </p>
                  <SurpriseReveal
                    surprise={data.surprise}
                    locale={data.locale}
                    tone="light"
                    onReveal={() => onEvent?.({ type: "surprise" })}
                  />
                </div>
              ) : null}
              <EndBlock
                data={data}
                onEvent={onEvent}
                onReact={onReact}
                onMakeOne={onMakeOne}
                onReplay={
                  mode === "preview"
                    ? undefined
                    : () => {
                        setShown(0);
                        setExtras(false);
                        setStarted(true);
                      }
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Composer (decorative) */}
      <div className="flex h-[max(3.4rem,calc(env(safe-area-inset-bottom)+2.8rem))] shrink-0 items-start gap-2 border-t border-black/10 bg-white/80 px-3 pt-2 backdrop-blur">
        <div className="h-9 flex-1 rounded-full border border-black/10 bg-white px-4 text-[13px] leading-9 text-black/35">
          {s.placeholder}
        </div>
        <span
          className="grid size-9 place-items-center rounded-full text-white"
          style={{ background: bubble }}
        >
          ↑
        </span>
      </div>

      {/* The cover: their phone, face up, with the first three messages waiting on it. */}
      <AnimatePresence>
        {!started ? (
          <motion.div
            key="lock"
            className="absolute inset-0 z-30 overflow-hidden"
            exit={{ y: "-100%", transition: { duration: 0.55, ease: [0.65, 0, 0.35, 1] } }}
          >
            {/* wallpaper: their first photo thrown out of focus, under a night gradient */}
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#12151F" }}>
              {wallpaper ? (
                <img
                  src={wallpaper.url}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: "blur(calc(3.4*var(--k))) saturate(1.15)", transform: "scale(1.2)" }}
                />
              ) : null}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(8,10,16,.82) 0%, rgba(8,10,16,.38) 28%, rgba(8,10,16,.5) 60%, rgba(8,10,16,.9) 100%)" }}
              />
              <div className="absolute inset-0" style={{ background: `radial-gradient(72% 42% at 50% 16%, ${bubble}3d, transparent 72%)` }} />
              <Ambience layers={LOCK_AMBIENCE} opacity={0.45} />
            </div>

            {/* the whole lock screen is the tap target; the content above it lets taps through */}
            <button type="button" onClick={start} aria-label={s.tap} className="absolute inset-0 z-10 w-full outline-none" />

            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col px-[calc(6*var(--k))] pt-[calc(4.5*var(--k))] pb-[calc(4*var(--k))] text-white">
              <div className="flex items-center justify-between gap-[calc(3*var(--k))]">
                <p className="truncate text-[calc(2.3*var(--k))] tracking-[0.3em] uppercase opacity-60">
                  {data.senderName} → {data.recipientName}
                </p>
                <StatusIcons />
              </div>

              <div className="mt-[calc(7*var(--k))] flex flex-col items-center">
                <LockGlyph />
                <p className="mt-[calc(2.6*var(--k))] text-[calc(3.4*var(--k))] font-medium opacity-80">{clock.date}</p>
                <p
                  className="mt-[calc(.4*var(--k))] text-[calc(21*var(--k))] leading-[.95] font-semibold tracking-[-0.02em] tabular-nums"
                  style={{ textShadow: "0 calc(.6*var(--k)) calc(2.2*var(--k)) rgba(0,0,0,.4)" }}
                >
                  {clock.hhmm}
                </p>
              </div>

              <div className="mt-auto flex w-full flex-col gap-[calc(2.2*var(--k))]">
                {[s.n1, s.n2, s.n3].map((line, i) => (
                  <motion.div
                    key={i}
                    initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.45 + i * 0.6, type: "spring", stiffness: 240, damping: 24 }}
                  >
                    <NotificationCard name={name} badge={name.slice(0, 1).toUpperCase()} text={line} color={bubble} now={s.now} />
                  </motion.div>
                ))}
              </div>

              <TapPill tone={PILL_TONE} reduce={!!reduce} delay={1.8} className="mt-[calc(4.5*var(--k))] self-center">
                {s.tap}
              </TapPill>
              <span aria-hidden="true" className="mx-auto mt-[calc(3*var(--k))] h-[calc(1*var(--k))] w-[calc(30*var(--k))] shrink-0 rounded-full bg-white/55" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox !== null && data.photos[lightbox] ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 grid place-items-center bg-black/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              src={data.photos[lightbox].url}
              alt={data.photos[lightbox].alt ?? ""}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle
        audio={audio}
        locale={data.locale}
        className={cn("top-[max(4rem,calc(var(--gift-safe-top,env(safe-area-inset-top))+3.5rem))] bg-black/10 text-ink")}
      />
    </div>
  );
}

function Bubble({
  children,
  bubble,
  reduce,
  first,
}: {
  children: React.ReactNode;
  bubble: string;
  reduce: boolean;
  first: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "mr-auto max-w-[78%] rounded-2xl bg-white px-3.5 py-2 text-[15px] leading-snug shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
        first ? "rounded-tl-md" : "rounded-l-md",
      )}
      style={{ boxShadow: `0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px ${bubble}14` }}
    >
      {children}
    </motion.div>
  );
}

function EndBlock({
  data,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<ThreadFields>["data"];
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent]);
  return (
    <div ref={ref} className="rounded-2xl bg-white p-4 shadow-sm">
      <EndScreen
        data={data}
        tone="light"
        onReact={onReact}
        onMakeOne={onMakeOne}
        onReplay={onReplay}
      />
    </div>
  );
}
