"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import type { GiftData, GiftPhoto } from "@/lib/gift/schema";
import { parseRichText, type RichBlock, type RichRun } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateEvent, TemplateMode } from "../../types";
import { giftString } from "../i18n";
import { Countdown } from "../Countdown";
import { EndScreen } from "../EndScreen";
import { RichMessage } from "../RichMessage";
import { SurpriseReveal } from "../SurpriseReveal";

/**
 * A note that is gone through one thing at a time, not scrolled: the letter in a few parts, then
 * each photo, the countdown, the surprise, the end. HolidayPage is the scrolling kind; a gift that
 * hands its letter over some other way (written into its scene, on cards, in a book) takes its
 * steps from here and draws them however it likes.
 */
export type NoteStep =
  | { readonly kind: "words"; readonly blocks: RichBlock[]; readonly first: boolean; readonly last: boolean }
  | { readonly kind: "photo"; readonly photo: GiftPhoto; readonly index: number }
  | { readonly kind: "countdown" }
  | { readonly kind: "surprise" }
  | { readonly kind: "end" };

const lengthOf = (block: RichBlock) => block.reduce((n, run) => n + run.text.length, 0);

/** The most parts a letter is gone through in: a longer one gets fuller parts, not more of them. */
export const MOST_PARTS = 12;

/**
 * A paragraph too long for one screen, as pieces that each fit: broken after a sentence where it
 * can be, between words where one sentence alone is too long. Bold and italic carry across.
 */
export function breakBlock(block: RichBlock, limit: number): RichBlock[] {
  if (lengthOf(block) <= limit) return [block];
  const tokens: RichRun[] = [];
  for (const run of block) {
    if (run.br || !run.text) {
      tokens.push(run);
      continue;
    }
    for (const sentence of run.text.match(/[^.!?\u2026]+[.!?\u2026]*["\u201d\u2019)]*\s*|[.!?\u2026]+\s*/g) ?? [run.text])
      for (const piece of sentence.length > limit ? (sentence.match(/\S+\s*/g) ?? [sentence]) : [sentence]) tokens.push({ ...run, text: piece });
  }
  const out: RichBlock[] = [];
  let piece: RichRun[] = [];
  let size = 0;
  const close = () => {
    while (piece.length && piece[piece.length - 1].br) piece.pop();
    const last = piece[piece.length - 1];
    if (last) piece[piece.length - 1] = { ...last, text: last.text.trimEnd() };
    if (piece.length) out.push(piece);
    piece = [];
    size = 0;
  };
  for (const token of tokens) {
    if (size && size + token.text.length > limit) close();
    if (token.br && !piece.length) continue;
    const last = piece[piece.length - 1];
    // what was one run stays one run
    if (last && !last.br && !token.br && !!last.bold === !!token.bold && !!last.italic === !!token.italic) piece[piece.length - 1] = { ...last, text: last.text + token.text };
    else piece.push(token);
    size += token.text.length;
  }
  close();
  return out;
}

/**
 * The letter's paragraphs in parts short enough to be read on one screen: whole paragraphs kept
 * together up to `limit` characters, and one longer than that broken where a sentence ends.
 */
export function splitWords(blocks: RichBlock[], limit = 230): RichBlock[][] {
  const parts: RichBlock[][] = [];
  let part: RichBlock[] = [];
  let size = 0;
  for (const block of blocks.flatMap((b) => breakBlock(b, limit))) {
    const n = lengthOf(block);
    if (part.length && size + n > limit) {
      parts.push(part);
      part = [];
      size = 0;
    }
    part.push(block);
    size += n;
  }
  if (part.length) parts.push(part);
  return parts;
}

/** How full a part may be for this letter: `limit`, or more when the letter would otherwise take too many parts. */
export function partLimit(blocks: RichBlock[], limit: number): number {
  const total = blocks.reduce((n, b) => n + lengthOf(b), 0);
  return Math.max(limit, Math.ceil(total / MOST_PARTS));
}

/** Everything a gift's note holds, in the order it is gone through. A gift with no message still has a first step to greet with. */
export function noteSteps(data: Pick<GiftData, "message" | "photos" | "countdown" | "surprise">, limit = 230): NoteStep[] {
  const blocks = parseRichText(data.message ?? "");
  const parts = splitWords(blocks, partLimit(blocks, limit));
  const words: NoteStep[] = (parts.length ? parts : [[]]).map((blocks, i, all) => ({ kind: "words", blocks, first: i === 0, last: i === all.length - 1 }));
  return [...words, ...data.photos.map((photo, index): NoteStep => ({ kind: "photo", photo, index })), ...(data.countdown ? [{ kind: "countdown" } as const] : []), ...(data.surprise ? [{ kind: "surprise" } as const] : []), { kind: "end" }];
}

/**
 * Where the reader is in the steps. Going forward reports how far through the gift they are (from
 * 35% at the first step to 100% at the last), and reaching the last step ends the gift, once.
 * In the editor's still frame nothing is reported.
 */
export function useSteps(count: number, mode: TemplateMode, onEvent: ((event: TemplateEvent) => void) | undefined, start = 0) {
  const [index, setIndex] = useState(Math.min(start, count - 1));
  const furthest = useRef(index);
  const ended = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  const go = (to: number) => {
    const next = Math.max(0, Math.min(count - 1, to));
    setIndex(next);
    if (mode === "preview" || next <= furthest.current) return;
    furthest.current = next;
    const last = next === count - 1;
    eventRef.current?.({ type: "progress", pct: last ? 100 : Math.round(35 + (60 * next) / Math.max(1, count - 1)) });
    if (last && !ended.current) {
      ended.current = true;
      eventRef.current?.({ type: "ended" });
    }
  };
  // a note of one step is at its end as soon as it is shown
  useEffect(() => {
    if (count !== 1 || mode === "preview" || ended.current) return;
    ended.current = true;
    eventRef.current?.({ type: "progress", pct: 100 });
    eventRef.current?.({ type: "ended" });
  }, [count, mode]);
  return { index, go, next: () => go(index + 1), back: () => go(index - 1), first: index === 0, last: index === count - 1 };
}

/**
 * Left and right arrow keys, and a sideways swipe, as back and next. The keys are heard wherever the
 * focus is (a button that has just been disabled loses it), unless it is in something being typed
 * into. Spread the result onto the element that holds the steps, for the swipe.
 */
export function useStepKeys(next: () => void, back: () => void) {
  const from = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef({ next, back });
  useEffect(() => {
    moves.current = { next, back };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key === "ArrowRight") moves.current.next();
      else if (e.key === "ArrowLeft") moves.current.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      from.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const f = from.current;
      from.current = null;
      if (!f) return;
      const dx = e.clientX - f.x;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(e.clientY - f.y) * 1.4) (dx < 0 ? moves.current.next : moves.current.back)();
    },
  };
}

type WordsProps = {
  data: Pick<GiftData, "locale" | "recipientName" | "senderName">;
  step: Extract<NoteStep, { kind: "words" }>;
  /** The colour of the marker behind bold words, of italics, and of the signature. */
  accent: string;
  /** The body's size, as a CSS length. The greeting and the signature are sized from it. */
  size?: string;
  face?: "serif" | "hand";
  /** Paragraphs come in one after another unless the page is still. */
  still?: boolean;
  /** The line above the words on the first part. Defaults to "Dear {name},"; null hides it. */
  greeting?: string | null;
  className?: string;
  style?: CSSProperties;
};

/** One part of the letter: its greeting if it is the first, its paragraphs, the signature if it is the last. Its colour is its parent's. */
export function StepWords({ data, step, accent, size = "calc(4.6*var(--u))", face = "serif", still, greeting, className, style }: WordsProps) {
  const line = greeting === undefined ? giftString(data.locale, "dear", { name: data.recipientName }) : greeting;
  const letters = step.blocks.reduce((n, b) => n + lengthOf(b), 0);
  // a fuller part (a long letter has them) is set a little smaller, so it still fits where a short one does
  const shrink = letters > 420 ? 0.8 : letters > 300 ? 0.88 : 1;
  const vars = { "--sw-mark": `color-mix(in srgb, ${accent} 34%, transparent)`, "--sw-accent": accent, fontSize: shrink === 1 ? size : `calc(${shrink} * ${size})`, ...style } as CSSProperties;
  return (
    <div className={cn("[overflow-wrap:anywhere]", className)} style={vars}>
      {step.first && line ? (
        <h2 className="mb-[.7em] leading-[1.08] italic" style={{ fontFamily: "var(--gift-font-display)", fontSize: "1.7em" }}>
          {line}
        </h2>
      ) : null}
      <div
        className="[&_em]:text-[var(--sw-accent)] [&_em]:italic [&_p+p]:mt-[0.8em] [&_strong]:box-decoration-clone [&_strong]:rounded-[3px] [&_strong]:px-[0.12em] [&_strong]:font-semibold [&_strong]:[background:linear-gradient(transparent_58%,var(--sw-mark)_58%)]"
        style={face === "hand" ? { fontFamily: "var(--gift-font-hand)", fontSize: "1.25em", lineHeight: 1.35 } : { fontFamily: "var(--gift-font-display)", lineHeight: 1.5 }}
      >
        <RichMessage blocks={step.blocks} stagger={still ? 0 : 0.5} />
      </div>
      {step.last ? (
        <motion.p className="mt-[.6em] -rotate-3 pr-[.2em] text-right leading-[1.2]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "1.9em", color: "var(--sw-accent)" }} initial={still ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + step.blocks.length * 0.5, duration: 0.6 }}>
          {data.senderName}
        </motion.p>
      ) : null}
    </div>
  );
}

/** The steps of a gift's note, made once for its message and photos. */
export function useNoteSteps(data: Pick<GiftData, "message" | "photos" | "countdown" | "surprise">, limit?: number) {
  return useMemo(() => noteSteps(data, limit), [data, limit]);
}

const LABELS = { en: { next: "next", back: "back" }, es: { next: "siguiente", back: "atrás" } };

/** What the arrows of a stepped note are called, for whoever cannot see them. */
export function stepLabel(locale: string, key: "next" | "back"): string {
  return (LABELS as Record<string, { next: string; back: string }>)[locale]?.[key] ?? LABELS.en[key];
}

/** The mask that fades an edge of the end's scroller while more of it lies past that edge. */
export function edgeFade(above: boolean, below: boolean): string | undefined {
  if (!above && !below) return undefined;
  return `linear-gradient(to bottom, ${above ? "transparent, #000 2rem" : "#000"}, ${below ? "#000 calc(100% - 3rem), transparent" : "#000"})`;
}

/**
 * The end step, inside the page or card that holds it. A card is far smaller than a screen, and it
 * cuts what doesn't fit in it, so the end is set closer here (EndScreen's `compact`) and on an
 * ordinary phone all of it shows as it arrives. Where it still doesn't fit (the first iPhone SE, a
 * phone on its side, a surprise, a voice message and a song on top), it scrolls inside its card, as
 * a card of words does.
 *
 * `give` is how much of the card's own margin the end may take, top and bottom, before it scrolls:
 * an end a few pixels taller than the card's inside runs a little into the margin and stays whole,
 * as it did before there was a scroller, rather than losing its last row to one.
 *
 * A card often cuts a scrolling end cleanly between two rows, which looks finished. So while more
 * lies below, its foot fades out and a small arrow stands there, whatever row the cut falls on; a
 * tap on the arrow brings the next part up. Scrolled, its top fades the same way, so a button is not
 * sliced in the middle of the paper.
 *
 * For the end only: the surprise's sparks fly past its own box, and a scroller would cut them.
 */
export function EndScroll({ children, give = "0px" }: { children: ReactNode; give?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ above: false, below: false });
  const fade = edgeFade(more.above, more.below);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const look = () => {
      const above = el.scrollTop > 8;
      const below = el.scrollHeight - el.clientHeight - el.scrollTop > 8;
      setMore((was) => (was.above === above && was.below === below ? was : { above, below }));
    };
    look();
    el.addEventListener("scroll", look, { passive: true });
    // The end grows after it is first drawn (the song's card loads, a surprise is opened), and the
    // page changes size with the screen.
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(look);
    sizes?.observe(el);
    for (const child of el.children) sizes?.observe(child);
    return () => {
      el.removeEventListener("scroll", look);
      sizes?.disconnect();
    };
  }, []);
  const on = () => {
    const el = ref.current;
    if (!el) return;
    const still = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ top: Math.round(el.clientHeight * 0.7), behavior: still ? "auto" : "smooth" });
  };
  return (
    // The card centres this box. Its margins are negative by `give`, so it may grow that far into the
    // card's own margin on each side before the scroller inside it has to shrink.
    <div className="relative flex min-h-0 flex-col" style={{ maxHeight: `calc(100% + 2 * ${give})`, marginBlock: `calc(-1 * ${give})` }}>
      <div ref={ref} className="min-h-0 overflow-y-auto overscroll-contain scrollbar-none" data-more={more.above && more.below ? "both" : more.above ? "above" : more.below ? "below" : undefined} style={fade ? { maskImage: fade, WebkitMaskImage: fade } : undefined}>
        {children}
      </div>
      {/* For a finger or a mouse, like the sides of a card of words that turn it: the keyboard reaches
          every row by Tab and a screen reader reads them all, so neither is told about it. Its disc
          stands on the foot of the scroller, where the fade has all but taken the row under it. */}
      {more.below ? (
        <button type="button" tabIndex={-1} aria-hidden="true" data-testid="end-more" onClick={on} className="group/more absolute bottom-0 left-1/2 grid size-11 -translate-x-1/2 translate-y-2 cursor-pointer place-items-center outline-none">
          <span className="grid size-7 place-items-center rounded-full bg-white/85 text-black/65 shadow-[0_1px_4px_rgba(0,0,0,.22)] ring-1 ring-black/10 transition-transform group-hover/more:translate-y-0.5 group-active/more:translate-y-0.5 motion-reduce:transition-none">
            <ChevronDown className="size-4" strokeWidth={2.25} />
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** The countdown, the surprise or the end, as the shared kit draws them: the steps that are the same in every gift. Nothing for a step that is words or a photo. */
export function StepExtra({ step, data, tone, compact, heart, onEvent, onReact, onMakeOne, onReplay }: { step: NoteStep; data: GiftData; tone: "light" | "dark"; /** The end set closer, for a card smaller than a screen (EndScreen). */ compact?: boolean; /** False where the gift sets its own mark over the end (EndScreen). */ heart?: boolean; onEvent?: (event: TemplateEvent) => void; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  if (step.kind === "countdown" && data.countdown) return <Countdown countdown={data.countdown} locale={data.locale} tone={tone} />;
  if (step.kind === "surprise" && data.surprise)
    return (
      <>
        <p className="mb-[1em] text-center text-[calc(2.7*var(--u))] font-semibold tracking-[0.24em] uppercase opacity-70">{giftString(data.locale, "ps")}</p>
        <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={tone} onReveal={() => onEvent?.({ type: "surprise" })} />
      </>
    );
  if (step.kind === "end") return <EndScreen data={data} tone={tone} compact={compact} heart={heart} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />;
  return null;
}

