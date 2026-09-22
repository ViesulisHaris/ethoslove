/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ideaImage } from "@/lib/dates/art";
import type { DateIdea } from "@/lib/dates/ideas";

export type IdeaRailLabels = { previous: string; next: string; budget: [string, string, string, string]; hours: (h: string) => string; notNearby: string };

type Props = { heading: ReactNode; filters?: ReactNode; empty?: ReactNode; ideas: DateIdea[]; doable: Set<string> | null; selectedId: string | null; locale: "en" | "es"; labels: IdeaRailLabels; onPick: (id: string | null) => void };

export const ideaLength = (minutes: number): string => {
  const h = minutes / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(/\.0$/, "");
};

/**
 * A row of ideas to flick through, each a photograph with its name on it. The row bleeds to the
 * edges of its column, so it is padded and its snapping is padded to match: without the second
 * half of that, the first card snaps hard against the edge and looks cut off. The arrows sit above
 * the cards, never on them, and each goes quiet when there is nothing further that way.
 */
export function IdeaRail({ heading, filters, empty, ideas, doable, selectedId, locale, labels, onPick }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const scroll = (by: number) => rail.current?.scrollBy({ left: by * rail.current.clientWidth * 0.8, behavior: "smooth" });

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
  }, [ideas.length]);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        <div className={cn("hidden shrink-0 gap-1.5 pb-0.5 lg:flex", ideas.length === 0 && "lg:hidden")}>
          <button type="button" aria-label={labels.previous} disabled={edges.start} onClick={() => scroll(-1)} className="grid size-9 place-items-center rounded-full bg-white text-forest shadow-soft ring-1 ring-forest/10 transition-opacity hover:bg-rose-mist disabled:opacity-35">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label={labels.next} disabled={edges.end} onClick={() => scroll(1)} className="grid size-9 place-items-center rounded-full bg-white text-forest shadow-soft ring-1 ring-forest/10 transition-opacity hover:bg-rose-mist disabled:opacity-35">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      {filters}
      {ideas.length === 0 ? empty : null}
      <div ref={rail} hidden={ideas.length === 0} className="scrollbar-none -mx-5 flex snap-x snap-proximity scroll-px-5 gap-3.5 overflow-x-auto px-5 pt-3 pb-5 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-6 lg:scroll-px-6 lg:px-6" role="list">
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
                  "group relative flex h-[236px] w-[184px] flex-col justify-end overflow-hidden rounded-[24px] p-3.5 text-left shadow-soft transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1 hover:shadow-lift",
                  selected && "-translate-y-1 shadow-lift ring-[3px] ring-rose ring-offset-2 ring-offset-blush-paper",
                  !near && "opacity-60 saturate-50",
                )}
                style={{ backgroundColor: idea.art.to }}
              >
                <img src={ideaImage(idea.id)} alt="" width={960} height={720} loading={i < 3 ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-(--ease-out-quint) group-hover:scale-[1.06]" />
                <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,10,24,0)_34%,rgba(36,10,24,0.55)_68%,rgba(36,10,24,0.86)_100%)]" />
                <span className="relative font-display text-[19.5px] leading-[1.08] text-white [text-shadow:0_1px_10px_rgba(30,5,18,0.5)]">{idea.title[locale]}</span>
                <span className="relative mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-white/85">
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
    </div>
  );
}
