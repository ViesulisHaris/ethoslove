"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { hashString, mulberry32 } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { EndScreen } from "../_shared/EndScreen";
import { PAPER_GRAIN } from "../_shared/cover-kit";
import type { Copy } from "./copy";
import type { PackYourBagsFields } from "./schema";

type Data = TemplateProps<PackYourBagsFields>["data"];

const paper: CSSProperties = { backgroundColor: "#F7F0E1", backgroundImage: PAPER_GRAIN, color: "#1F2735" };
const lift = "shadow-[0_2px_3px_rgba(0,0,0,0.2),0_calc(5*var(--u))_calc(9*var(--u))_calc(-4*var(--u))_rgba(0,0,0,0.6)]";
/** The luggage-label stripe along the top of the letter, in the sender's colour. */
const STRIPE = "repeating-linear-gradient(135deg, var(--gift-accent) 0 calc(2.4*var(--u)), #F7F0E1 0 calc(4.8*var(--u)), #1F2735 0 calc(7.2*var(--u)), #F7F0E1 0 calc(9.6*var(--u)))";

/**
 * What the stub was covering: the letter, the photos taped up like postcards from before, the
 * countdown to the day, and the ending. Scrolled into view as soon as it arrives.
 */
export function Reading({
  data,
  s,
  mode,
  reduce,
  scroller,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: Data;
  s: Copy;
  mode: TemplateProps["mode"];
  reduce: boolean;
  scroller: RefObject<HTMLDivElement | null>;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const letterRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const [open, setOpen] = useState<GiftPhoto | null>(null);
  const photos = useMemo(() => data.photos.slice(0, 6), [data.photos]);
  const tilts = useMemo(() => {
    const rng = mulberry32(hashString(`${data.recipientName}|${data.senderName}|postcards`));
    return photos.map(() => (rng() - 0.5) * 8);
  }, [photos, data.recipientName, data.senderName]);

  // The stub has gone: bring the letter up to where the ticket was.
  useEffect(() => {
    const box = scroller.current;
    const letter = letterRef.current;
    if (!box || !letter) return;
    const top = letter.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTo({ top: Math.max(0, top - box.clientHeight * 0.08), behavior: reduce ? "auto" : "smooth" });
  }, [scroller, reduce]);

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
    <div className="relative mx-auto flex w-[calc(88*var(--u))] flex-col gap-[calc(7*var(--u))] pt-[calc(8*var(--u))] pb-[calc(72px+env(safe-area-inset-bottom))]">
      <motion.article
        ref={letterRef}
        data-testid="pyb-message"
        className={cn("relative overflow-hidden rounded-[calc(1.6*var(--u))] px-[calc(6.5*var(--u))] pt-[calc(10*var(--u))] pb-[calc(8*var(--u))]", lift)}
        style={paper}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: -0.5 }}
        transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 90, damping: 16 }}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[calc(2.6*var(--u))]" style={{ background: STRIPE }} />
        <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="serif" greeting={data.title?.trim() || undefined} />
      </motion.article>

      {photos.length ? (
        <>
          <p className="text-center text-[calc(3.2*var(--u))] font-semibold tracking-[0.24em] text-[#F7F0E1]/70 uppercase">{s.photos}</p>
          <div className="grid grid-cols-2 gap-[calc(5*var(--u))] px-[calc(1*var(--u))]">
            {photos.map((photo, i) => (
              <Postcard key={photo.id} photo={photo} rot={tilts[i] ?? 0} index={i} reduce={reduce} alone={photos.length % 2 === 1 && i === photos.length - 1} onOpen={() => setOpen(photo)} />
            ))}
          </div>
        </>
      ) : null}

      {data.countdown ? (
        <div className={cn("rounded-[calc(1.6*var(--u))] p-[calc(5*var(--u))]", lift)} style={paper}>
          <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
        </div>
      ) : null}

      <div ref={endRef} className="pt-[calc(2*var(--u))] text-[#F7F0E1]">
        <EndScreen data={data} tone="dark" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="photo"
            className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-[calc(5*var(--u))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.figure initial={reduce ? false : { scale: 0.9 }} animate={{ scale: 1 }} className="m-0 max-w-full">
              <img src={open.url} alt={open.alt ?? ""} className="max-h-[72cqh] rounded-[calc(1*var(--u))] object-contain" />
              {open.caption ? (
                <figcaption className="mt-[calc(3*var(--u))] text-center text-[calc(4.6*var(--u))] text-[#F7F0E1]" style={{ fontFamily: "var(--gift-font-hand)" }}>
                  {open.caption}
                </figcaption>
              ) : null}
            </motion.figure>
            <button type="button" onClick={() => setOpen(null)} className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 grid size-11 place-items-center rounded-full bg-white/15 text-xl text-white">
              <span aria-hidden="true">×</span>
              <span className="sr-only">{t("close")}</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** A photo from before, taped up a little crooked like a postcard on a wall, its caption handwritten. */
function Postcard({ photo, rot, index, reduce, alone, onOpen }: { photo: GiftPhoto; rot: number; index: number; reduce: boolean; alone: boolean; onOpen: () => void }) {
  return (
    <motion.figure
      // An odd one out gets the row to itself, in the middle, rather than hanging off the left.
      className={cn("relative m-0", alone && "col-span-2 mx-auto w-[56%]")}
      style={{ rotate: rot }}
      initial={reduce ? false : { opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 150, damping: 16, delay: (index % 2) * 0.12 }}
    >
      <span aria-hidden="true" className="absolute left-1/2 z-[2] -translate-x-1/2 rounded-[2px]" style={{ top: "calc(-2.2 * var(--u))", width: "calc(15 * var(--u))", height: "calc(4.6 * var(--u))", background: "rgba(var(--gift-accent-rgb),0.42)", rotate: `${index % 2 ? 6 : -5}deg` }} />
      <button type="button" onClick={onOpen} className="block w-full bg-[#FFFDF8] p-[calc(2*var(--u))] pb-[calc(3*var(--u))] text-left shadow-[0_14px_28px_-14px_rgba(0,0,0,0.7)]" aria-label={photo.caption || photo.alt || undefined}>
        <span className="block aspect-[4/5] w-full overflow-hidden bg-black/5">
          <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="h-full w-full object-cover" />
        </span>
        {photo.caption ? (
          <span className="mt-[calc(2*var(--u))] block text-center text-[calc(4*var(--u))] leading-tight break-words text-[#3A2E2A]" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {photo.caption}
          </span>
        ) : null}
      </button>
    </motion.figure>
  );
}
