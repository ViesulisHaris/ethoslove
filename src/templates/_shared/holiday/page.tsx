"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GiftData, GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateEvent, TemplateMode } from "../../types";
import { giftString } from "../i18n";
import { MessageBody } from "../MessageBody";
import { Countdown } from "../Countdown";
import { SurpriseReveal } from "../SurpriseReveal";
import { EndScreen } from "../EndScreen";
import { Lightbox, useReadProgress } from "../collage/kit";
import { PAPER_GRAIN, SCRIPT_FONT } from "../cover-kit";
import { SoftTable } from "./stage";

/**
 * The note at the end of a holiday gift: the words, the photos, the countdown, the surprise and
 * the end screen in one scroll, like NightPage, but made of the gift's own rendered things. The
 * table is behind it, out of focus (rendered that way, so its lights are discs); the letter is
 * written on a sheet of the gift's paper, cut so that it can be any length; the photos are prints
 * held by whatever the gift holds things with.
 */

/** The letter's paper, as scripts/art/holiday/pack.mjs describes it in a gift's art-map. */
export type SheetArt = {
  /** Which paper: its pictures are sheet-<name>-top, -mid and -bottom. */
  readonly name: string;
  /** Heights of the top, the repeating middle and the bottom, as shares of the sheet's width. */
  readonly top: number;
  readonly mid: number;
  readonly bottom: number;
  /** How much of the bottom fades in over the middle. */
  readonly fade: number;
  /** Where the paper begins inside its picture: the rest is its shadow. */
  readonly inset: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
};

export type HolidayTheme = {
  ink: string;
  /** Quieter ink for the small labels on the paper. */
  soft: string;
  accent: string;
  /** Ruled lines on the paper. */
  rule: string;
  /** Words written straight on the table, between the papers. */
  label: string;
  face?: "serif" | "hand" | "type";
};

export type PhotoSlot = { photo: GiftPhoto; index: number; still: boolean; open: () => void };

const pct = (share: number) => `${(share * 100).toFixed(2)}%`;

/**
 * A sheet of the gift's paper, as long as what is written on it. The picture has the paper's own
 * shadow in it, so the sheet needs none. `crown` and `foot` are laid over its top and bottom edges
 * (a scroll's rod and roll, a ribbon); `margin` is the white kept round the words, as a share of
 * the sheet's width.
 */
export function PaperSheet({ base, art, children, crown, foot, margin = 0.075, head = 0.08, tail = 0.07, className, style }: { base: string; art: SheetArt; children: ReactNode; crown?: ReactNode; foot?: ReactNode; margin?: number; head?: number; tail?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("relative grid", className)} style={style}>
      {/* a soft shadow under the paper: a plain box inside its edges, which costs nothing to move (a filter on the pictures would be redrawn on every frame of a scroll) */}
      <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: pct(art.inset.left + 0.01), right: pct(art.inset.right + 0.01), top: "1.2%", bottom: "1.2%", boxShadow: "0 calc(1.6*var(--u)) calc(4*var(--u)) rgba(0,0,0,.42)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        <img src={`${base}sheet-${art.name}-top.webp`} alt="" draggable={false} className="absolute top-0 left-0 block w-full max-w-none" />
        {/* Margins in percent are shares of the width, which is what the caps' heights are too. A pixel of overlap, so rounding never opens a seam. */}
        <div className="absolute inset-0" style={{ marginTop: `calc(${pct(art.top)} - 1px)`, marginBottom: pct(art.bottom - art.fade), backgroundImage: `url(${base}sheet-${art.name}-mid.webp)`, backgroundSize: "100% auto", backgroundRepeat: "repeat-y", backgroundPosition: "top" }} />
        <img src={`${base}sheet-${art.name}-bottom.webp`} alt="" draggable={false} className="absolute bottom-0 left-0 block w-full max-w-none" />
      </div>
      {/* Never shorter than its own top and bottom. */}
      <div aria-hidden="true" className="col-start-1 row-start-1" style={{ paddingTop: pct(art.top + art.bottom - art.fade) }} />
      <div className="relative col-start-1 row-start-1 min-w-0" style={{ paddingLeft: pct(art.inset.left + margin), paddingRight: pct(art.inset.right + margin), paddingTop: pct(art.inset.top + head), paddingBottom: pct(art.inset.bottom + tail) }}>
        {children}
      </div>
      {crown}
      {foot}
    </div>
  );
}

type Props<T extends Record<string, unknown>> = {
  data: GiftData<T>;
  mode: TemplateMode;
  /** No entrances: the editor's still frame, and anyone who asked for less motion. */
  still: boolean;
  /** Where the gift's pictures are, which look it is in, and the table's own colour for before they arrive. */
  base: string;
  look: string;
  floor: string;
  /** Laid over the soft table so the papers stand out from it. */
  shade: string;
  sheet: SheetArt;
  /** Room kept inside every paper's edge for a border printed on it (a foil line), as a share of its width. */
  frame?: number;
  /** How much of the column the papers take: a scroll leaves room either side for the ends of its rod. */
  sheetWidth?: number;
  theme: HolidayTheme;
  /** Above the letter, on the table: what the gift made (a receipt, a card). */
  hero?: ReactNode;
  /** Over the top and bottom edges of the letter. */
  crown?: ReactNode;
  foot?: ReactNode;
  /** On the letter above the words: what the gift decided, in small. */
  header?: ReactNode;
  /** On the letter below the signature. */
  footer?: ReactNode;
  /** The heading over the photos. */
  gallery?: string;
  columns?: 1 | 2;
  photo: (slot: PhotoSlot) => ReactNode;
  /** The line above the words. Defaults to "Dear {name},"; null hides it. */
  greeting?: string | null;
  /** The small caps line over the words, such as "a note from Theo". */
  eyebrow?: string;
  onEvent?: (event: TemplateEvent) => void;
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
};

export function HolidayPage<T extends Record<string, unknown>>({ data, mode, still, base, look, floor, shade, sheet, sheetWidth = 1, frame = 0, theme, hero, crown, foot, header, footer, gallery, columns = 2, photo, greeting, eyebrow, onEvent, onReact, onMakeOne, onReplay }: Props<T>) {
  const scroller = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<GiftPhoto | null>(null);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  useReadProgress(scroller, end, mode, onEvent);
  const small = "text-[calc(2.7*var(--u))] font-semibold tracking-[0.24em] uppercase";
  const paper: CSSProperties = { width: pct(sheetWidth), marginInline: "auto" };

  return (
    <div className="absolute inset-0">
      <SoftTable base={base} look={look} floor={floor} shade={shade} />
      <div ref={scroller} data-scroller className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
        <div className="relative mx-auto flex w-[min(94cqw,600px)] flex-col gap-[calc(8*var(--u))] pt-[calc(19*var(--u))] pb-[calc(72px+env(safe-area-inset-bottom))]" style={{ color: theme.ink }}>
          {hero ? <Reveal still={still}>{hero}</Reveal> : null}
          <Reveal still={still}>
            <PaperSheet base={base} art={sheet} crown={crown} foot={foot} head={0.08 + frame} tail={(foot ? 0.13 : 0.07) + frame} margin={(sheetWidth < 0.9 ? 0.06 : 0.075) + frame} style={paper}>
              {header}
              {eyebrow ? (
                <p className={cn(small, "mb-[calc(3*var(--u))]")} style={{ color: theme.soft }}>
                  {eyebrow}
                </p>
              ) : null}
              <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face={theme.face ?? "serif"} accent={theme.accent} greeting={greeting} />
              {footer}
            </PaperSheet>
          </Reveal>

          {data.photos.length ? (
            <section aria-label={gallery} className="flex flex-col gap-[calc(7*var(--u))]">
              {gallery ? <Label color={theme.label}>{gallery}</Label> : null}
              <div className={columns === 2 ? "grid grid-cols-2 gap-x-[calc(5*var(--u))] gap-y-[calc(9*var(--u))] px-[calc(2*var(--u))]" : "flex flex-col gap-[calc(10*var(--u))] px-[calc(6*var(--u))]"}>
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
              <PaperSheet base={base} art={sheet} head={0.06 + frame} tail={0.05 + frame} margin={0.075 + frame} style={paper}>
                <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
              </PaperSheet>
            </Reveal>
          ) : null}

          {data.surprise ? (
            <Reveal still={still}>
              <PaperSheet base={base} art={sheet} head={0.06 + frame} tail={0.05 + frame} margin={0.075 + frame} style={paper}>
                <p className={cn(small, "mb-[calc(3*var(--u))] text-center")} style={{ color: theme.soft }}>
                  {giftString(data.locale, "ps")}
                </p>
                <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
              </PaperSheet>
            </Reveal>
          ) : null}

          <div ref={end}>
            <PaperSheet base={base} art={sheet} head={0.05 + frame} tail={0.04 + frame} margin={0.05 + frame} style={paper}>
              <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
            </PaperSheet>
          </div>
        </div>
      </div>

      <AnimatePresence>{open ? <Lightbox photo={open} onClose={() => setOpen(null)} closeLabel={giftString(data.locale, "close")} /> : null}</AnimatePresence>
    </div>
  );
}

/** A heading written on the table itself, between two fine rules. */
function Label({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-[calc(3*var(--u))]" style={{ color }}>
      <span aria-hidden="true" className="h-px w-[calc(9*var(--u))] bg-current opacity-50" />
      <p className="text-center text-[calc(3.1*var(--u))] font-medium tracking-[0.3em] uppercase" style={{ textShadow: "0 1px calc(2*var(--u)) rgba(0,0,0,.45)" }}>
        {children}
      </p>
      <span aria-hidden="true" className="h-px w-[calc(9*var(--u))] bg-current opacity-50" />
    </div>
  );
}

/**
 * A photo as a print: thick white paper, the picture a little sunk into it, a glaze of light
 * across it, and its caption in handwriting underneath. `holder` is what keeps it there (a clip,
 * a strip of tape), laid over its top edge.
 */
export function Print({ slot, rot, holder, ink = "#3a2410" }: { slot: PhotoSlot; rot: number; holder?: ReactNode; ink?: string }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0" style={{ rotate: `${rot}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || "photo"} className="relative block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-white/60">
        <div
          className="relative px-[5.5%] pt-[5.5%] pb-[24%]"
          style={{
            background: "linear-gradient(135deg, #fffdf8 0%, #f8f2e6 100%)",
            backgroundImage: `${PAPER_GRAIN}, linear-gradient(135deg, #fffdf8 0%, #f6efe1 100%)`,
            boxShadow: "0 0 0 .5px rgba(60,40,20,.18), 0 calc(.5*var(--u)) calc(.8*var(--u)) rgba(0,0,0,.3), calc(1.2*var(--u)) calc(3*var(--u)) calc(6*var(--u)) rgba(0,0,0,.42)",
          }}
        >
          <div className="relative overflow-hidden" style={{ boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.35), 0 0 0 .5px rgba(255,255,255,.6)" }}>
            <img src={photo.url} alt="" loading="lazy" draggable={false} className="block aspect-square w-full object-cover" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, rgba(255,255,255,.26) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 72%, rgba(255,255,255,.1) 100%)" }} />
          </div>
          {photo.caption ? (
            <figcaption className="absolute inset-x-[6%] bottom-[3%] line-clamp-2 text-center leading-[1.1]" style={{ fontFamily: SCRIPT_FONT, fontSize: "calc(2.9*var(--u))", color: ink }}>
              {photo.caption}
            </figcaption>
          ) : null}
        </div>
        {holder}
      </button>
    </figure>
  );
}

/** A block that rises into place as it scrolls into view. Plain when the page is still. */
function Reveal({ still, delay = 0, children }: { still: boolean; delay?: number; children: ReactNode }) {
  if (still) return <div>{children}</div>;
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
