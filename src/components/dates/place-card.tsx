"use client";

import { Camera, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistance, walkingMinutes } from "@/lib/dates/geo";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { GroupIcon } from "./group-icon";
import { usePhoto } from "./photo-store";
import { PlaceThumb } from "./place-thumb";

export type PlaceCardLabels = { add: string; remove: string; walk: (minutes: number) => string; free: string; photo: string };

type Props = { place: Place; locale: "en" | "es"; labels: PlaceCardLabels; selected: boolean; inPlan: boolean; onOpen: () => void; onHover: (on: boolean) => void; onTogglePlan: () => void };

/** How far is still a walk. Past this the card gives the distance and leaves how to get there to them. */
const WALK_KM = 2.2;

/** One place in the list: its picture, what it is, how far, and a button to put it in the plan. */
export function PlaceCard({ place, locale, labels, selected, inPlan, onOpen, onHover, onTogglePlan }: Props) {
  const group = GROUPS[place.group];
  const info = KINDS[place.kind];
  const real = Boolean(usePhoto(place.id) ?? place.photo);
  return (
    <div
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      className={cn("group relative flex items-stretch gap-3.5 rounded-[22px] bg-white p-2.5 shadow-soft ring-1 ring-forest/5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift", selected && "ring-2 ring-[#D6336C]")}
    >
      <PlaceThumb place={place} className="size-[92px] rounded-[16px] sm:size-[104px]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: group.color }}>
          <GroupIcon group={place.group} className="size-3.5" />
          <span className="truncate">{place.cuisine.length > 0 ? `${info.label[locale]} · ${place.cuisine[0]}` : info.label[locale]}</span>
        </span>
        <button type="button" onClick={onOpen} className="mt-0.5 text-left after:absolute after:inset-0 after:rounded-[22px]">
          <span className="line-clamp-2 font-display text-[19px] leading-[1.12] text-forest">{place.name}</span>
        </button>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-forest/60">
          <span>{place.distanceKm <= WALK_KM ? labels.walk(walkingMinutes(place.distanceKm)) : formatDistance(place.distanceKm, locale)}</span>
          {info.free ? <span className="rounded-full bg-[#DCEBDF] px-2 py-0.5 text-[11px] font-semibold text-[#2E6B4E]">{labels.free}</span> : null}
          {real ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-forest/45">
              <Camera aria-hidden="true" className="size-3" />
              {labels.photo}
            </span>
          ) : null}
        </span>
      </div>
      <button
        type="button"
        onClick={onTogglePlan}
        aria-pressed={inPlan}
        aria-label={`${inPlan ? labels.remove : labels.add}: ${place.name}`}
        className={cn("relative z-10 my-auto mr-1 grid size-11 shrink-0 place-items-center rounded-full transition-colors", inPlan ? "bg-[#D6336C] text-white" : "bg-[#FFE8EF] text-[#9C1F4A] hover:bg-[#FFD6E2]")}
      >
        {inPlan ? <Check className="size-[18px]" /> : <Plus className="size-[18px]" />}
      </button>
    </div>
  );
}
