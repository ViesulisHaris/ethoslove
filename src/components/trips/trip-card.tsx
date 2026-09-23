import { CalendarDays, MapPin, Sun } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { budgetMark, type Trip } from "@/lib/trips/presets";
import { TripArt } from "./trip-art";

export type TripCardLabels = { kind: string; days: string; stops: string; best: string; budget: string };

/** One trip on the shelf: its picture, its name, and the four things that decide it. */
export function TripCard({ trip, title, blurb, labels }: { trip: Trip; title: string; blurb: string; labels: TripCardLabels }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      data-testid="trip-card"
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1.5 hover:shadow-lift"
    >
      <span className="relative block">
        <TripArt trip={trip} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3]" imageClassName="transition-transform duration-700 ease-(--ease-out-quint) group-hover:scale-[1.05]" />
        <span className="absolute top-3.5 left-3.5 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-rose-deep shadow-soft backdrop-blur">{labels.kind}</span>
        <span className="absolute top-3.5 right-3.5 rounded-full bg-white/92 px-3 py-1.5 font-mono text-[12px] font-medium text-forest shadow-soft backdrop-blur" title={labels.budget}>
          <span aria-hidden="true">{budgetMark(trip.budget)}</span>
          <span className="sr-only">{labels.budget}</span>
        </span>
      </span>
      <span className="flex flex-1 flex-col p-5">
        <span className="block font-display text-[25px] leading-[1.08] text-forest">{title}</span>
        <span className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-forest/70">{blurb}</span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-4 text-[12.5px] font-semibold text-forest/70">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/[0.05] px-2.5 py-1">
            <CalendarDays aria-hidden="true" className="size-3.5 text-rose-deep" />
            {labels.days}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/[0.05] px-2.5 py-1">
            <MapPin aria-hidden="true" className="size-3.5 text-rose-deep" />
            {labels.stops}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/[0.05] px-2.5 py-1">
            <Sun aria-hidden="true" className="size-3.5 text-rose-deep" />
            {labels.best}
          </span>
        </span>
      </span>
    </Link>
  );
}
