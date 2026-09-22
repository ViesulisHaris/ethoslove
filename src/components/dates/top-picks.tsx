"use client";

import { cn } from "@/lib/utils";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Ranked } from "@/lib/dates/rank";
import { CostChip } from "./cost-chip";
import { PlaceThumb } from "./place-thumb";
import { Stars } from "./stars";

export type TopPicksLabels = { title: string; sub: string; reviews: (n: number) => string; noReviews: string };

/** The ten best bets near here as a shelf of big cards, ranked, the way a city page leads. */
export function TopPicks({ picks, locale, labels, selectedId, onOpen, onHover }: { picks: Ranked[]; locale: "en" | "es"; labels: TopPicksLabels; selectedId: string | null; onOpen: (id: string) => void; onHover: (id: string | null) => void }) {
  if (picks.length === 0) return null;
  return (
    <section className="mt-9" aria-label={labels.title}>
      <h2 className="display-md text-forest">{labels.title}</h2>
      <p className="mt-1 text-[14px] text-forest/55">{labels.sub}</p>
      <ul className="scrollbar-none -mx-5 mt-4 flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-6 lg:scroll-px-6 lg:px-6">
        {picks.map((p) => (
          <li key={p.id} className="w-[216px] shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              onPointerEnter={() => onHover(p.id)}
              onPointerLeave={() => onHover(null)}
              className={cn("group block w-full overflow-hidden rounded-[22px] bg-white text-left shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1 hover:shadow-lift", selectedId === p.id && "ring-2 ring-[#D6336C]")}
            >
              <span className="relative block">
                <PlaceThumb place={p} eager className="aspect-[4/3] w-full" />
                <span className="absolute top-2.5 left-2.5 grid h-7 min-w-7 place-items-center rounded-full bg-white/95 px-2 text-[12px] font-bold text-forest shadow-soft">#{p.rank}</span>
                <CostChip cost={p.cost} locale={locale} className="absolute top-2.5 right-2.5 bg-white/95 shadow-soft" />
              </span>
              <span className="block p-3">
                <span className="block text-[11.5px] font-semibold" style={{ color: GROUPS[p.group].color }}>
                  {KINDS[p.kind].label[locale]}
                </span>
                <span className="mt-0.5 line-clamp-1 block font-display text-[17px] leading-tight text-forest">{p.name}</span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-forest/60">
                  {p.rating?.reviews ? (
                    <>
                      <Stars value={p.rating.stars} size="xs" />
                      <span className="font-semibold text-forest/80">{p.rating.stars.toFixed(1)}</span>
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
