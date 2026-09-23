"use client";

import { Camera, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { cuisineWords } from "@/lib/dates/cuisines";
import { formatStars } from "@/lib/dates/format";
import { formatDistance, WALK_KM, walkingMinutes } from "@/lib/dates/geo";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Ranked } from "@/lib/dates/rank";
import { CostChip } from "./cost-chip";
import { GroupIcon } from "./group-icon";
import { usePhoto } from "./photo-store";
import { PlaceThumb } from "./place-thumb";
import { Stars } from "./stars";

export type PlaceCardLabels = { add: string; remove: string; walk: (minutes: number) => string; free: string; photo: string; reviews: (n: number) => string; rank: (n: number, of: number, group: string) => string };

type Props = { place: Ranked; locale: "en" | "es"; labels: PlaceCardLabels; selected: boolean; inPlan: boolean; onOpen: () => void; onHover: (on: boolean) => void; onTogglePlan: () => void; /** Its pin is being pointed at on the map. */ hovered?: boolean; /** Place in the list, for the stagger as cards arrive. */ index?: number };

const STAGGERED = 8;
const STAGGER_MS = 35;

/** One place in the list: its picture, what it is, how far, and a button to put it in the plan. */
export function PlaceCard({ place, locale, labels, selected, inPlan, onOpen, onHover, onTogglePlan, hovered = false, index = 0 }: Props) {
  const group = GROUPS[place.group];
  const info = KINDS[place.kind];
  const real = Boolean(usePhoto(place.id) ?? place.photo);
  // OpenStreetMap's cuisine words are English ("coffee shop"): translated, or left off in Spanish.
  const cuisine = cuisineWords(place.cuisine, locale, info.label[locale], 1)[0];
  return (
    <div
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      // The first few cards of a set arrive in a stagger; the rest at once. Capping the delay instead
      // held every card past the eighth back by the whole stagger, so a list read from its middle
      // went blank for a moment when it changed.
      style={{ animationDelay: `${index < STAGGERED ? index * STAGGER_MS : 0}ms` }}
      className={cn("place-card-in group relative flex items-stretch gap-3.5 rounded-[22px] bg-white p-2.5 shadow-soft ring-1 ring-forest/5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift", hovered && !selected && "-translate-y-0.5 shadow-lift ring-2 ring-rose/35", selected && "ring-2 ring-rose")}
    >
      <PlaceThumb place={place} className="size-[92px] rounded-[16px] sm:size-[104px]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: group.ink }}>
          <GroupIcon group={place.group} className="size-3.5" />
          <span className="truncate">{cuisine ? `${info.label[locale]} · ${cuisine}` : info.label[locale]}</span>
        </span>
        <button type="button" onClick={onOpen} className="mt-0.5 text-left after:absolute after:inset-0 after:rounded-[22px]">
          <span className="line-clamp-2 font-display text-[19px] leading-[1.12] text-forest">{place.name}</span>
        </button>
        <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-forest/65">
          {place.rating?.reviews ? (
            <>
              <Stars value={place.rating.stars} size="xs" locale={locale} />
              <span className="font-semibold text-forest/85">{formatStars(place.rating.stars, locale)}</span>
              <span>{labels.reviews(place.rating.reviews)}</span>
            </>
          ) : (
            <span>{labels.rank(place.groupRank, place.groupSize, group.label[locale].toLowerCase())}</span>
          )}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-forest/65">
          <CostChip cost={place.cost} locale={locale} reported={place.rating?.cost !== null && place.rating?.cost !== undefined} />
          <span>{place.distanceKm <= WALK_KM ? labels.walk(walkingMinutes(place.distanceKm)) : formatDistance(place.distanceKm, locale)}</span>
          {real ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] text-forest/65">
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
        className={cn("relative z-10 my-auto mr-1 grid size-11 shrink-0 place-items-center rounded-full transition-colors", inPlan ? "bg-rose text-white" : "bg-rose-soft text-rose-ink hover:bg-rose-tint")}
      >
        {inPlan ? <Check className="size-[18px]" /> : <Plus className="size-[18px]" />}
      </button>
    </div>
  );
}
