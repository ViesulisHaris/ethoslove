"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GiftData, GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import type { TemplateEvent, TemplateMode } from "../../types";
import { giftString } from "../i18n";
import { MessageBody } from "../MessageBody";
import { Countdown } from "../Countdown";
import { SurpriseReveal } from "../SurpriseReveal";
import { EndScreen } from "../EndScreen";
import { Lightbox, useReadProgress } from "../collage/kit";

/** What a page is dressed in: the card the words sit on, its ink, and the colour of the labels between cards. */
export type NightTheme = {
  card: string;
  /** A grain or print laid over the card colour. */
  cardImage?: string;
  ink: string;
  /** Quieter ink for the small labels on a card. */
  soft: string;
  accent: string;
  /** A hairline round every card. */
  edge: string;
  /** Whether the card is dark, which sets the words on it in warm white. */
  dark: boolean;
  /** Section labels written straight on the night, between cards. */
  label: string;
  face?: "serif" | "hand" | "type";
};

export type PhotoSlot = { photo: GiftPhoto; index: number; still: boolean; open: () => void };

type Props<T extends Record<string, unknown>> = {
  data: GiftData<T>;
  mode: TemplateMode;
  theme: NightTheme;
  /** No entrances: the editor's still frame, and anyone who asked for less motion. */
  still: boolean;
  /** Above the first card: a small version of the scene, or the title. */
  hero?: ReactNode;
  /** The heading over the photos. */
  gallery?: string;
  /** Photos in one column (frames that want room) or two (small frames). */
  columns?: 1 | 2;
  photo: (slot: PhotoSlot) => ReactNode;
  /** The line above the words. Defaults to "Dear {name},"; null hides it. */
  greeting?: string | null;
  /** The small caps line at the top of the message card, such as "a note from Theo". */
  eyebrow?: string;
  onEvent?: (event: TemplateEvent) => void;
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
  className?: string;
};

/**
 * What every Halloween gift hands over to once its big moment is done: the words, the photos, the
 * countdown, the surprise and the end screen, in one scroll. The scene is the template's own; this is
 * the part that has to be right every time (progress events, the lightbox, both languages), so it
 * is written once. Needs `--k` and `--u` from the template root (COVER_VARS).
 */
export function NightPage<T extends Record<string, unknown>>({ data, mode, theme, still, hero, gallery, columns = 1, photo, greeting, eyebrow, onEvent, onReact, onMakeOne, onReplay, className }: Props<T>) {
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<GiftPhoto | null>(null);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  useReadProgress(scroller, end, mode, onEvent);

  const tone = theme.dark ? "dark" : "light";
  const card: CSSProperties = {
    backgroundColor: theme.card,
    backgroundImage: theme.cardImage,
    color: theme.ink,
    boxShadow: `inset 0 0 0 1px ${theme.edge}, 0 calc(6*var(--u)) calc(11*var(--u)) calc(-6*var(--u)) rgba(0,0,0,.7)`,
  };
  const cardClass = "rounded-[calc(3*var(--u))] p-[calc(5*var(--u))]";

  return (
    <div className={className ?? "absolute inset-0"}>
      <div ref={scroller} data-scroller className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
        <div className="relative mx-auto flex w-[min(88cqw,560px)] flex-col gap-[calc(6*var(--u))] pt-[calc(16*var(--u))] pb-[calc(72px+env(safe-area-inset-bottom))]">
          {hero}

          <Reveal still={still}>
            <article className={cardClass} style={card}>
              {eyebrow ? <p className="mb-[calc(3*var(--u))] text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase" style={{ color: theme.soft }}>{eyebrow}</p> : null}
              <MessageBody data={data} blocks={blocks} mode={mode} tone={tone} face={theme.face ?? "serif"} accent={theme.accent} greeting={greeting} />
            </article>
          </Reveal>

          {data.photos.length ? (
            <section aria-label={gallery} className="flex flex-col gap-[calc(6*var(--u))]">
              {gallery ? (
                <p className="text-center text-[calc(3.2*var(--u))] tracking-[0.22em] uppercase" style={{ color: theme.label }}>
                  {gallery}
                </p>
              ) : null}
              <div className={columns === 2 ? "grid grid-cols-2 gap-x-[calc(5*var(--u))] gap-y-[calc(7*var(--u))]" : "flex flex-col gap-[calc(9*var(--u))]"}>
                {data.photos.map((p, index) => (
                  <Reveal key={p.id} still={still} delay={columns === 2 ? (index % 2) * 0.12 : 0}>
                    {photo({ photo: p, index, still, open: () => setOpen(p) })}
                  </Reveal>
                ))}
              </div>
            </section>
          ) : null}

          {data.countdown ? (
            <Reveal still={still}>
              <div className={cardClass} style={card}>
                <Countdown countdown={data.countdown} locale={data.locale} tone={tone} />
              </div>
            </Reveal>
          ) : null}

          {data.surprise ? (
            <Reveal still={still}>
              <div className={cardClass} style={card}>
                <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.22em] uppercase" style={{ color: theme.soft }}>
                  {giftString(data.locale, "ps")}
                </p>
                <SurpriseReveal surprise={data.surprise} locale={data.locale} tone={tone} onReveal={() => onEvent?.({ type: "surprise" })} />
              </div>
            </Reveal>
          ) : null}

          <div ref={end} className="rounded-[calc(3*var(--u))] p-[calc(4*var(--u))]" style={card}>
            <EndScreen data={data} tone={tone} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </div>

      <AnimatePresence>{open ? <Lightbox photo={open} onClose={() => setOpen(null)} closeLabel={giftString(data.locale, "close")} /> : null}</AnimatePresence>
    </div>
  );
}

/** A block that rises into place as it scrolls into view. Plain when the page is still. */
function Reveal({ still, delay = 0, children }: { still: boolean; delay?: number; children: ReactNode }) {
  if (still) return <div>{children}</div>;
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
