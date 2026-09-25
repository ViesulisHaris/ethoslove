"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * The letter that was tucked in the velvet: folded, with a wax seal over the point of its flap, and
 * once it is opened, the page it unfolds into: the message in handwriting, every photo in a little
 * gilt oval, the countdown and the P.S. if there are any, and the end.
 */
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { Scrap, TornPaper } from "../_shared/collage/kit";
import { hashString } from "../_shared/random";
import { GOLD, type Finish } from "./looks";
import type { MusicBoxFields } from "./schema";

const PAPER = "#FFFBF3";
const INK = "#3B2A2E";
const k = (n: number): string => `calc(${n} * var(--k))`;

/** The folded letter: a sheet with its flap down to a point, sealed there, their name below. */
export function FoldedLetter({ name, from, className, style }: { name: string; from: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("relative", className)} style={{ aspectRatio: "1.5", ...style }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: PAPER, backgroundImage: `${PAPER_GRAIN}, linear-gradient(160deg, rgba(255,255,255,.6), rgba(210,190,170,.25))`, boxShadow: `0 ${k(1.4)} ${k(3)} rgba(50,20,30,.35)`, borderRadius: k(0.5) }} />
      {/* the flap, folded down over the sheet to a point */}
      <svg viewBox="0 0 150 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true" style={{ filter: `drop-shadow(0 ${k(0.6)} ${k(0.8)} rgba(90,50,40,.28))` }}>
        <path d="M0 0 L150 0 L75 60 Z" fill="#F6EBDD" />
        <path d="M0 0 L75 60 L150 0" fill="none" stroke="rgba(150,110,90,.35)" strokeWidth=".6" />
      </svg>
      <span className="absolute top-[60%] left-1/2 w-[27%] -translate-x-1/2 -translate-y-1/2">
        <Scrap id="wax-seal-swans" eager width="100%" />
      </span>
      <span className="absolute -top-[8%] -left-[6%] w-[26%] -rotate-[18deg]">
        <Scrap id="bow-satin-mini" eager width="100%" />
      </span>
      <p className="absolute inset-x-[8%] bottom-[7%] truncate text-center leading-none" style={{ fontFamily: SCRIPT_FONT, fontSize: k(6.2), color: INK }}>
        {name}
      </p>
      <p className="absolute top-[9%] right-[7%] text-right leading-none opacity-60" style={{ fontFamily: "var(--gift-font-hand)", fontSize: k(3), color: INK }}>
        {from}
      </p>
    </div>
  );
}

/** A photo in a little gilt oval, opened large on a tap. */
function Oval({ photo, index, reduce, onOpen }: { photo: GiftPhoto; index: number; reduce: boolean; onOpen?: (photo: GiftPhoto) => void }) {
  return (
    <motion.figure className="m-0 flex flex-col items-center" initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ type: "spring", stiffness: 140, damping: 16, delay: (index % 2) * 0.1 }}>
      <button type="button" onClick={onOpen ? () => onOpen(photo) : undefined} disabled={!onOpen} aria-label={photo.caption || photo.alt || "photo"} className="relative block w-full rounded-[50%] outline-none focus-visible:ring-4 focus-visible:ring-black/30 disabled:cursor-default" style={{ aspectRatio: "0.82", padding: "7%", background: `radial-gradient(120% 120% at 30% 20%, #FFF6D6 0%, ${GOLD.light} 25%, ${GOLD.mid} 60%, ${GOLD.deep} 100%)`, boxShadow: `0 calc(2*var(--u)) calc(3*var(--u)) calc(-1.6*var(--u)) rgba(40,15,25,.45), inset 0 0 0 calc(.35*var(--u)) ${GOLD.deep}` }}>
        <span className="block h-full w-full overflow-hidden rounded-[50%] bg-[#1A1716]" style={{ boxShadow: "inset 0 0 0 calc(.4*var(--u)) rgba(255,246,214,.8)" }}>
          <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </span>
      </button>
      {photo.caption ? (
        <figcaption className="mt-[calc(2.2*var(--u))] max-w-full text-center text-[calc(4*var(--u))] leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", color: INK }}>
          {photo.caption}
        </figcaption>
      ) : null}
    </motion.figure>
  );
}

type Copy = { letterFrom: string; inMirror: string };

/** The unfolded letter and everything after it, over the dimmed vanity. */
export function Reading({ data, finish, mode, reduce, s, onOpenPhoto, onEvent, onReact, onMakeOne, onReplay }: { data: TemplateProps<MusicBoxFields>["data"]; finish: Finish; mode: TemplateProps["mode"]; reduce: boolean; s: Copy; onOpenPhoto?: (photo: GiftPhoto) => void; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const seed = hashString(`${data.recipientName}|${data.senderName}|music-box`);
  const endRef = useRef<HTMLDivElement>(null);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    let ended = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!ended && entries.some((e) => e.isIntersecting)) {
          ended = true;
          eventRef.current?.({ type: "progress", pct: 100 });
          eventRef.current?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  const card: CSSProperties = { backgroundColor: PAPER, backgroundImage: PAPER_GRAIN, color: INK, boxShadow: "0 1px 2px rgba(0,0,0,.14), 0 26px 46px -24px rgba(40,10,20,.65)" };

  return (
    <motion.div className="absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0.2 : 0.6 }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(40,14,24,.5), rgba(40,14,24,.64))" }} />
      <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" data-reading="">
      <div className="relative mx-auto flex w-[min(90cqw,560px)] flex-col gap-[calc(7*var(--u))] pt-[max(12cqh,80px)] pb-[calc(72px+env(safe-area-inset-bottom))]">
        <motion.div className="relative" initial={reduce ? false : { opacity: 0, y: 70, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: -0.6 }} transition={{ duration: reduce ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <TornPaper seed={seed} sides={{ top: true, bottom: true }} depth={1.2} color={PAPER} rim="#FFFFFF" grain={PAPER_GRAIN}>
            <article className="px-[calc(7*var(--u))] pt-[calc(15*var(--u))] pb-[calc(10*var(--u))]" style={{ color: INK }}>
              <p className="mb-[calc(4*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.24em] uppercase opacity-55">{s.letterFrom.replace("{name}", data.senderName)}</p>
              <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
            </article>
          </TornPaper>
          <span className="absolute -top-[calc(7*var(--u))] left-1/2 w-[calc(24*var(--u))] -translate-x-1/2">
            <Scrap id="wax-seal-swans" eager width="100%" />
          </span>
          <span className="absolute -top-[calc(6*var(--u))] -left-[calc(4*var(--u))] w-[calc(24*var(--u))] -rotate-[14deg]">
            <Scrap id="bow-satin-pink" eager width="100%" />
          </span>
        </motion.div>

        {data.photos.length ? (
          <section className="relative rounded-[calc(1.2*var(--u))] px-[calc(6*var(--u))] pt-[calc(7*var(--u))] pb-[calc(8*var(--u))]" style={card}>
            <span aria-hidden="true" className="absolute -top-[calc(5*var(--u))] -right-[calc(3*var(--u))] w-[calc(30*var(--u))] rotate-[8deg] opacity-95">
              <Scrap id="paper-roses" width="100%" />
            </span>
            <span aria-hidden="true" className="absolute -bottom-[calc(4*var(--u))] -left-[calc(5*var(--u))] w-[calc(30*var(--u))] -rotate-[168deg] opacity-95">
              <Scrap id="paper-blossom" width="100%" />
            </span>
            <p className="relative mb-[calc(6*var(--u))] text-center text-[calc(6.4*var(--u))] leading-none" style={{ fontFamily: SCRIPT_FONT, color: finish.ink }}>
              {s.inMirror}
            </p>
            <div className={cn("relative grid gap-x-[calc(6*var(--u))] gap-y-[calc(7*var(--u))]", data.photos.length === 1 ? "mx-auto w-[58%] grid-cols-1" : "grid-cols-2")}>
              {data.photos.map((photo, i) => (
                <Oval key={photo.id} photo={photo} index={i} reduce={reduce} onOpen={mode === "preview" ? undefined : onOpenPhoto} />
              ))}
            </div>
          </section>
        ) : null}

        {data.countdown ? (
          <div className="rounded-[calc(1.2*var(--u))] p-[calc(5*var(--u))]" style={card}>
            <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
          </div>
        ) : null}

        {data.surprise ? (
          <div className="relative rounded-[calc(1.2*var(--u))] px-[calc(5*var(--u))] pt-[calc(6*var(--u))] pb-[calc(5*var(--u))]" style={{ ...card, rotate: "0.6deg" }}>
            <span aria-hidden="true" className="absolute -top-[calc(4.5*var(--u))] -left-[calc(2*var(--u))] w-[calc(13*var(--u))] -rotate-12">
              <Scrap id="wax-seal-hibiscus" width="100%" />
            </span>
            <p className="mb-[calc(3*var(--u))] text-center text-[calc(2.9*var(--u))] font-semibold tracking-[0.24em] uppercase opacity-60">{t("ps")}</p>
            <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
          </div>
        ) : null}

        <div ref={endRef} className="rounded-[calc(1.2*var(--u))] px-[calc(3*var(--u))] py-[calc(6*var(--u))]" style={card}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
        </div>
      </div>
      </div>
    </motion.div>
  );
}
