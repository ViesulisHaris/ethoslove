"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateIdea } from "@/lib/dates/ideas";
import { Sticker } from "@/templates/_shared/covers/stickers";

export type IdeaRailLabels = { previous: string; next: string; budget: [string, string, string, string]; hours: (h: string) => string; notNearby: string };

type Props = { ideas: DateIdea[]; doable: Set<string> | null; selectedId: string | null; locale: "en" | "es"; labels: IdeaRailLabels; onPick: (id: string | null) => void };

export const ideaLength = (minutes: number): string => {
  const h = minutes / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(/\.0$/, "");
};

/** A row of idea cards to flick through, each a little paper card with a sticker on it. */
export function IdeaRail({ ideas, doable, selectedId, locale, labels, onPick }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (by: number) => rail.current?.scrollBy({ left: by * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <div ref={rail} className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pt-3 pb-4 sm:-mx-8 sm:px-8 lg:-mx-6 lg:px-6" role="list">
        {ideas.map((idea, i) => {
          const selected = idea.id === selectedId;
          const near = doable === null || doable.has(idea.id);
          return (
            <div key={idea.id} role="listitem" className="snap-start">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(selected ? null : idea.id)}
                className={cn(
                  "group relative flex h-[188px] w-[164px] flex-col justify-end overflow-hidden rounded-[22px] p-3.5 text-left shadow-soft transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1 hover:shadow-lift",
                  selected && "-translate-y-1 shadow-lift ring-2 ring-[#B23A5E] ring-offset-2 ring-offset-[#FBF1EC]",
                  !near && "opacity-60 saturate-50",
                )}
                style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)` }}
              >
                <span aria-hidden="true" className="absolute -top-1 -right-2 size-[92px] transition-transform duration-500 ease-(--ease-spring) group-hover:scale-110" style={{ rotate: `${((i * 37) % 24) - 12}deg` }}>
                  <Sticker id={idea.art.sticker} />
                </span>
                <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
                <span className="relative font-display text-[19px] leading-[1.08] text-forest">{idea.title[locale]}</span>
                <span className="relative mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-forest/65">
                  <Clock3 aria-hidden="true" className="size-3" />
                  {labels.hours(ideaLength(idea.minutes))}
                  <span aria-hidden="true">·</span>
                  {near ? labels.budget[idea.budget] : labels.notNearby}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" aria-label={labels.previous} onClick={() => scroll(-1)} className="absolute top-[86px] -left-3 hidden size-9 place-items-center rounded-full bg-white text-forest shadow-lift lg:grid">
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" aria-label={labels.next} onClick={() => scroll(1)} className="absolute top-[86px] -right-3 hidden size-9 place-items-center rounded-full bg-white text-forest shadow-lift lg:grid">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
