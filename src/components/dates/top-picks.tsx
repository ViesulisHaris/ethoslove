"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStars } from "@/lib/dates/format";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Ranked } from "@/lib/dates/rank";
import { CostChip } from "./cost-chip";
import { PlaceThumb } from "./place-thumb";
import { Stars } from "./stars";

export type TopPicksLabels = { title: string; sub: string; reviews: (n: number) => string; noReviews: string; previous: string; next: string };

/** A card's width, as its class says (w-[216px]): what its photograph is sized for. */
const CARD_W = 216;

/**
 * The ten best bets near here as a shelf of big cards, ranked, the way a city page leads. On a wide
 * screen the shelf has arrows, as the idea rail above it does: a mouse wheel scrolls the page, not a
 * row, and with no scrollbar seven of the ten picks were out of a mouse's reach.
 */
export function TopPicks({ picks, locale, labels, selectedId, onOpen, onHover }: { picks: Ranked[]; locale: "en" | "es"; labels: TopPicksLabels; selectedId: string | null; onOpen: (id: string) => void; onHover: (id: string | null) => void }) {
  const rail = useRef<HTMLUListElement>(null);
  const touched = useRef(false);
  const [edges, setEdges] = useState({ start: true, end: false });
  // An arrow counts as a touch: otherwise the effect below would put the shelf back at its start on
  // the render the arrow's own scroll causes, and the arrows would seem to do nothing.
  const scroll = (by: number) => {
    touched.current = true;
    rail.current?.scrollBy({ left: by * rail.current.clientWidth * 0.8, behavior: "smooth" });
  };
  // The shelf mounts once the places are in, and Chrome sometimes picks the second card as its
  // opening snap target while the first is still laying out, so the shelf appears scrolled by one.
  // Until somebody has actually scrolled it, it starts at the start.
  useEffect(() => {
    const el = rail.current;
    if (el && !touched.current && el.scrollLeft !== 0) el.scrollLeft = 0;
  });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    const frame = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [picks.length]);
  if (picks.length === 0) return null;
  return (
    <section className="mt-9" aria-label={labels.title}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="display-md text-forest">{labels.title}</h2>
          <p className="mt-1 text-[14px] text-forest/65">{labels.sub}</p>
        </div>
        <div className="hidden shrink-0 gap-1.5 pb-0.5 lg:flex">
          <button type="button" aria-label={labels.previous} disabled={edges.start} onClick={() => scroll(-1)} className="grid size-9 place-items-center rounded-full bg-white text-forest shadow-soft ring-1 ring-forest/10 transition-opacity hover:bg-rose-mist disabled:opacity-35">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label={labels.next} disabled={edges.end} onClick={() => scroll(1)} className="grid size-9 place-items-center rounded-full bg-white text-forest shadow-soft ring-1 ring-forest/10 transition-opacity hover:bg-rose-mist disabled:opacity-35">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <ul ref={rail} onPointerDown={() => (touched.current = true)} onWheel={() => (touched.current = true)} onTouchStart={() => (touched.current = true)} className="scrollbar-none -mx-5 mt-4 flex snap-x snap-proximity scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-6 lg:scroll-px-6 lg:px-6">
        {picks.map((p) => (
          <li key={p.id} className="w-[216px] shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              onPointerEnter={() => onHover(p.id)}
              onPointerLeave={() => onHover(null)}
              className={cn("group block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1 hover:shadow-lift", selectedId === p.id && "ring-2 ring-rose")}
            >
              <span className="relative block">
                <PlaceThumb place={p} eager width={CARD_W} className="aspect-[4/3] w-full" />
                <span className="absolute top-2.5 left-2.5 grid h-7 min-w-7 place-items-center rounded-full bg-white/95 px-2 text-[12px] font-bold text-forest shadow-soft">#{p.rank}</span>
                <CostChip cost={p.cost} locale={locale} className="absolute top-2.5 right-2.5 bg-white/95 shadow-soft" />
              </span>
              <span className="block p-3">
                <span className="block text-[11.5px] font-semibold" style={{ color: GROUPS[p.group].ink }}>
                  {KINDS[p.kind].label[locale]}
                </span>
                <span className="mt-0.5 line-clamp-1 block font-display text-[17px] leading-tight text-forest">{p.name}</span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-forest/65">
                  {p.rating?.reviews ? (
                    <>
                      <Stars value={p.rating.stars} size="xs" locale={locale} />
                      <span className="font-semibold text-forest/80">{formatStars(p.rating.stars, locale)}</span>
                      <span>{labels.reviews(p.rating.reviews)}</span>
                    </>
                  ) : (
                    <span>{labels.noReviews}</span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
