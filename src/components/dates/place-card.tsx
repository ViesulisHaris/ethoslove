"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistance, walkingMinutes } from "@/lib/dates/geo";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { GroupIcon } from "./group-icon";

export type PlaceCardLabels = { add: string; remove: string; walk: (minutes: number) => string };

type Props = { place: Place; locale: "en" | "es"; labels: PlaceCardLabels; selected: boolean; inPlan: boolean; onOpen: () => void; onHover: (on: boolean) => void; onTogglePlan: () => void };

/** How far is still a walk. Past this the card gives the distance and leaves how to get there to them. */
const WALK_KM = 2.2;

export function PlaceCard({ place, locale, labels, selected, inPlan, onOpen, onHover, onTogglePlan }: Props) {
  const group = GROUPS[place.group];
  return (
    <div
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      className={cn("group relative flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-soft ring-1 ring-forest/5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift", selected && "ring-2 ring-[#B23A5E]")}
    >
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: group.soft, color: group.color }}>
        <GroupIcon group={place.group} className="size-[22px]" />
      </span>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:rounded-[20px]">
        <span className="block truncate text-[15.5px] font-semibold text-forest">{place.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-forest/60">
          <span className="truncate" style={{ color: group.color }}>
            {place.cuisine.length > 0 ? `${KINDS[place.kind].label[locale]} · ${place.cuisine[0]}` : KINDS[place.kind].label[locale]}
          </span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{place.distanceKm <= WALK_KM ? labels.walk(walkingMinutes(place.distanceKm)) : formatDistance(place.distanceKm, locale)}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onTogglePlan}
        aria-pressed={inPlan}
        aria-label={`${inPlan ? labels.remove : labels.add}: ${place.name}`}
        className={cn("relative z-10 grid size-11 shrink-0 place-items-center rounded-full transition-colors", inPlan ? "bg-[#B23A5E] text-white" : "bg-[#FBE9EE] text-[#8E2F4C] hover:bg-[#F7D9E2]")}
      >
        {inPlan ? <Check className="size-[18px]" /> : <Plus className="size-[18px]" />}
      </button>
    </div>
  );
}
