"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStars } from "@/lib/dates/format";
import { formatDistance, WALK_KM, walkingMinutes } from "@/lib/dates/geo";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Ranked } from "@/lib/dates/rank";
import type { Unusual } from "@/lib/dates/unusual";
import { CostChip } from "./cost-chip";
import { PlaceThumb } from "./place-thumb";
import { QuirkBadge, QuirkIcon } from "./quirk-icon";
import { Stars } from "./stars";

export type UnusualShelfLabels = { title: string; sub: string; reviews: (n: number) => string; walk: (minutes: number) => string; previous: string; next: string };

/** A card's width, as its class says (w-[216px]): what its photograph is sized for. */
const CARD_W = 216;

/**
 * "Something different": the cellar bars, rooftops, jazz clubs and boats near here, as a shelf of
 * big cards the way the top picks are, each with what makes it different on its photograph. The
 * cards are the explorer's to choose (unusual.ts), and it keeps their order once they are shown.
 */
export function UnusualShelf({ picks, found, locale, labels, selectedId, onOpen, onHover }: { picks: Ranked[]; found: ReadonlyMap<string, Unusual>; locale: "en" | "es"; labels: UnusualShelfLabels; selectedId: string | null; onOpen: (id: string) => void; onHover: (id: string | null) => void }) {
  const rail = useRef<HTMLUListElement>(null);
  const touched = useRef(false);
  const [edges, setEdges] = useState({ start: true, end: false });
  const scroll = (by: number) => {
    touched.current = true;
    rail.current?.scrollBy({ left: by * rail.current.clientWidth * 0.8, behavior: "smooth" });
  };
  // As on the top picks: Chrome can pick the second card as the opening snap target while the first
  // is still laying out. Until somebody has scrolled it, the shelf starts at its start.
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
    <section className="mt-9" aria-label={labels.title} data-unusual-shelf="">
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
        {picks.map((p) => {
          const quirk = found.get(p.id)?.quirk;
          if (!quirk) return null;
          return (
            <li key={p.id} className="w-[216px] shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                onPointerEnter={() => onHover(p.id)}
                onPointerLeave={() => onHover(null)}
                className={cn("group block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1 hover:shadow-lift", selectedId === p.id && "ring-2 ring-rose")}
              >
                <span className="relative block">
                  {/* With no photograph, the kind's tile carries the quirk's own glyph: a telescope, a key.
                      Not eager, unlike the top picks: this shelf is further down, and its photographs
                      are looked up as its cards come into view rather than twelve at once on arrival. */}
                  <PlaceThumb place={p} width={CARD_W} className="aspect-[4/3] w-full" glyph={<QuirkIcon quirk={quirk} className="size-[34%] max-h-10 max-w-10" />} />
                  <QuirkBadge quirk={quirk} locale={locale} className="absolute top-2.5 left-2.5 h-7 max-w-[calc(100%-5.5rem)] bg-white/95 px-2.5 text-[12px] text-forest shadow-soft" />
                  <CostChip cost={p.cost} locale={locale} className="absolute top-2.5 right-2.5 bg-white/95 shadow-soft" />
                </span>
                <span className="block p-3">
                  <span className="block truncate text-[11.5px] font-semibold" style={{ color: GROUPS[p.group].ink }}>
                    {KINDS[p.kind].label[locale]}
                  </span>
                  {/* One line, always, as on the top picks: a second line would grow the whole shelf. */}
                  <span className="mt-0.5 block truncate font-display text-[17px] leading-tight text-forest">{p.name}</span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-forest/65">
                    {p.rating?.reviews ? (
                      <>
                        <Stars value={p.rating.stars} size="xs" locale={locale} />
                        <span className="font-semibold text-forest/80">{formatStars(p.rating.stars, locale)}</span>
                        <span className="truncate">{labels.reviews(p.rating.reviews)}</span>
                      </>
                    ) : (
                      <span className="truncate">{p.distanceKm <= WALK_KM ? labels.walk(walkingMinutes(p.distanceKm)) : formatDistance(p.distanceKm, locale)}</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
