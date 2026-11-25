import { Link } from "@/i18n/navigation";
import type { Trip } from "@/lib/trips/presets";
import { TripArt } from "./trip-art";

export type TripCardLabels = { kind: string; days: string };

/** One trip on the shelf: its picture with its kind, its name, and how many days (DESIGN-LESS-TEXT: a card is a title and a picture). */
export function TripCard({ trip, title, labels }: { trip: Trip; title: string; labels: TripCardLabels }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      data-testid="trip-card"
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-card shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] duration-300 ease-(--ease-out-quint) hover:-translate-y-1.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest motion-reduce:transition-none"
    >
      <span className="relative block">
        <TripArt trip={trip} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="aspect-[4/3]" imageClassName="transition-transform duration-700 ease-(--ease-out-quint) group-hover:scale-[1.05] motion-reduce:transition-none" />
        {/* The card's own cream, not white (the owner: nothing on the paper pure white). Over any photo the text stays above 4.5:1: 4.9 at worst, the rose on a black photo through 5% of it. */}
        <span className="absolute top-3.5 left-3.5 rounded-full bg-card/95 px-3 py-1.5 text-[12px] font-semibold text-rose-deep shadow-soft backdrop-blur">{labels.kind}</span>
      </span>
      <span className="flex flex-1 flex-col p-5">
        <span className="block font-display text-[25px] leading-[1.08] text-forest">{title}</span>
        <span className="mt-1.5 text-[12.5px] font-semibold text-forest/70">{labels.days}</span>
      </span>
    </Link>
  );
}
