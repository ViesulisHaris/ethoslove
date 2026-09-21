"use client";

import { Check, Plus, Shuffle, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { formatDistance, walkingMinutes, distanceKm } from "@/lib/dates/geo";
import type { DateIdea } from "@/lib/dates/ideas";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { GroupIcon } from "./group-icon";

export type IdeaPanelLabels = { twist: string; another: string; nothing: (kind: string) => string; walk: (minutes: number) => string; add: string; added: string; close: string; open: string };

type Props = {
  idea: DateIdea;
  stops: { place: Place | null; options: number }[];
  times: string[];
  inPlan: boolean;
  locale: "en" | "es";
  labels: IdeaPanelLabels;
  onShuffle: (stopIndex: number) => void;
  onOpenPlace: (id: string) => void;
  onHover: (id: string | null) => void;
  onAdd: () => void;
  onClose: () => void;
};

/**
 * An idea, made real: the twist that makes it a date, and an actual place for each stop with a
 * time against it, a walk between them, and a button to swap any one for the next best.
 */
export function IdeaPanel({ idea, stops, times, inPlan, locale, labels, onShuffle, onOpenPlace, onHover, onAdd, onClose }: Props) {
  const found = stops.filter((s) => s.place).length;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      aria-label={idea.title[locale]}
      className="relative rounded-[26px] bg-white p-5 shadow-lift ring-1 ring-forest/5 sm:p-6"
    >
      <button type="button" onClick={onClose} aria-label={labels.close} className="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-full text-forest/50 hover:bg-forest/5 hover:text-forest">
        <X className="size-4" />
      </button>
      <h3 className="pr-10 font-display text-[26px] leading-[1.05] text-forest">{idea.title[locale]}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-forest/70">{idea.blurb[locale]}</p>
      <p className="mt-4 flex gap-2.5 rounded-2xl bg-[#FBE9EE] p-3.5 text-[14px] leading-snug text-[#7A2942]">
        <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">{labels.twist}</span> {idea.twist[locale]}
        </span>
      </p>

      <ol className="mt-5 space-y-0">
        {stops.map((stop, i) => {
          const kind = idea.stops[i][0];
          const previous = i > 0 ? stops[i - 1].place : null;
          return (
            <li key={i} className="relative pb-4 pl-[52px] last:pb-0">
              {i < stops.length - 1 ? <span aria-hidden="true" className="absolute top-10 bottom-0 left-[19px] border-l-2 border-dotted border-[#B23A5E]/40" /> : null}
              <span className="absolute top-0 left-0 grid size-10 place-items-center rounded-full bg-[#B23A5E] text-[14px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(120,20,50,0.7)]">{i + 1}</span>
              {previous && stop.place ? <p className="-mt-1 mb-1.5 text-[11.5px] font-medium tracking-wide text-forest/45 uppercase">{labels.walk(walkingMinutes(distanceKm(previous, stop.place)))}</p> : null}
              {stop.place ? (
                <div className="flex items-start gap-2" onPointerEnter={() => onHover(stop.place!.id)} onPointerLeave={() => onHover(null)}>
                  <button type="button" onClick={() => onOpenPlace(stop.place!.id)} aria-label={`${labels.open}: ${stop.place.name}`} className="min-w-0 flex-1 rounded-xl text-left">
                    <span className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: GROUPS[stop.place.group].color }}>
                      <span className="tabular-nums">{times[i]}</span>
                      <span aria-hidden="true">·</span>
                      <GroupIcon group={stop.place.group} className="size-3.5" />
                      {KINDS[stop.place.kind].label[locale]}
                    </span>
                    <span className="mt-0.5 block truncate text-[16px] font-semibold text-forest underline-offset-4 hover:underline">{stop.place.name}</span>
                    <span className="block text-[13px] text-forest/55">{formatDistance(stop.place.distanceKm, locale)}</span>
                  </button>
                  {stop.options > 1 ? (
                    <button type="button" onClick={() => onShuffle(i)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-forest/15 px-3 text-[12.5px] font-semibold text-forest transition-colors hover:bg-forest/5">
                      <Shuffle aria-hidden="true" className="size-3.5" />
                      {labels.another}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="pt-2 text-[14px] leading-snug text-forest/55">{labels.nothing(KINDS[kind].label[locale].toLowerCase())}</p>
              )}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        disabled={found === 0 || inPlan}
        onClick={onAdd}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-[15px] font-semibold text-cream shadow-[0_16px_36px_-18px_rgba(15,34,25,0.8)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:bg-forest/10 disabled:text-forest/50 disabled:shadow-none"
      >
        {inPlan ? <Check aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
        {inPlan ? labels.added : labels.add}
      </button>
    </motion.section>
  );
}
