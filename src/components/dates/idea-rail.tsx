/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ideaImage } from "@/lib/dates/art";
import { ideaHours } from "@/lib/dates/format";
import type { DateIdea } from "@/lib/dates/ideas";

export type IdeaRailLabels = { previous: string; next: string; budget: [string, string, string, string]; hours: (h: string) => string; notNearby: string };

type Props = { heading: ReactNode; filters?: ReactNode; empty?: ReactNode; ideas: DateIdea[]; doable: Set<string> | null; selectedId: string | null; locale: "en" | "es"; labels: IdeaRailLabels; onPick: (id: string | null) => void };

type RailCards = { order: string; members: string };

/**
 * Whether the rail goes back to its first card after its cards change. Chrome re-snaps a rail to the
 * card it was last snapped to, wherever that card has moved: turning "Playful" off left the rail four
 * cards in (or with a sliver of the first card at the edge), and the places arriving did the same to
 * a rail nobody had touched. So another mood starts at its best match, and so does a reordering of a
 * rail still at its start. Someone already flicking through when the rare finds reorder it is left
 * to Chrome, which keeps the card they were looking at in view.
 */
export function railStartsOver(before: RailCards, after: RailCards, offsetPx: number): boolean {
  if (before.order === after.order) return false;
  return before.members !== after.members || offsetPx < 8;
}

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

  // Where the rail was as of its last scroll event. Read after the cards change, it is still where
  // it was before: Chrome's own re-snap only reports itself a frame later.
  const offset = useRef(0);
  const ids = ideas.map((i) => i.id);
  const order = ids.join(" ");
  const members = [...ids].sort().join(" ");
  const seen = useRef({ order, members });
  useLayoutEffect(() => {
    const before = seen.current;
    seen.current = { order, members };
    if (rail.current && railStartsOver(before, { order, members }, offset.current)) rail.current.scrollLeft = 0;
  }, [order, members]);

  // A photograph lost to a dropped connection showed the browser's broken-image mark on the card for
  // the rest of the visit. It is hidden, so the card's own colour shows, and asked for again when the
  // connection comes back.
  useEffect(() => {
    const again = () => {
      for (const img of rail.current?.querySelectorAll<HTMLImageElement>("img[data-failed]") ?? []) {
        delete img.dataset.failed;
        // Assigning the same address runs the load again; a failed image is not kept in any cache.
        img.src = img.src;
      }
    };
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      offset.current = el.scrollLeft;
      setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    };
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
                <img src={ideaImage(idea.id)} alt="" width={960} height={720} loading={i < 3 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : undefined} decoding="async" onError={(e) => (e.currentTarget.dataset.failed = "1")} className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-(--ease-out-quint) group-hover:scale-[1.06] data-[failed]:invisible" />
                <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,10,24,0)_34%,rgba(36,10,24,0.55)_68%,rgba(36,10,24,0.86)_100%)]" />
                <span className="relative font-display text-[19.5px] leading-[1.08] text-white [text-shadow:0_1px_10px_rgba(30,5,18,0.5)]">{idea.title[locale]}</span>
                <span className="relative mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-white/85">
                  <Clock3 aria-hidden="true" className="size-3" />
                  {labels.hours(ideaHours(idea.minutes, locale))}
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
