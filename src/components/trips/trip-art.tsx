import { cn } from "@/lib/utils";
import { tripImageSm, tripSrcSet, type Trip } from "@/lib/trips/presets";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { EagerImg } from "@/components/shared/eager-img";

type Props = {
  trip: Pick<Trip, "id" | "image" | "art">;
  sizes: string;
  /** The hero's picture paints at once; a card's waits until it is near the screen. */
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/**
 * A trip's picture: the photograph where there is one, drawn in the site's art direction, and
 * otherwise its two colours and a sticker, the way the virtual dates are drawn. Either way the
 * colours are underneath, so a slow photograph never leaves a grey hole.
 */
export function TripArt({ trip, sizes, priority = false, className, imageClassName }: Props) {
  // The hero's goes through EagerImg: drawn here, it was a preload hint in the trip page's
  // prefetch, so /trips downloaded the full-size hero of every trip card on screen.
  const Img = priority ? EagerImg : "img";
  return (
    <span className={cn("relative block overflow-hidden", className)} style={{ background: `linear-gradient(160deg, ${trip.art.from} 0%, ${trip.art.to} 100%)` }}>
      {trip.image ? (
        <Img
          src={priority ? trip.image : tripImageSm(trip.image)}
          srcSet={tripSrcSet(trip.image)}
          sizes={sizes}
          alt=""
          width={1600}
          height={1200}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={cn("absolute inset-0 size-full object-cover", imageClassName)}
        />
      ) : (
        <>
          <span className="grain-overlay opacity-[0.14] mix-blend-overlay" />
          <span aria-hidden="true" className="absolute top-1/2 left-1/2 aspect-square w-[42%] max-w-[220px] -translate-x-1/2 -translate-y-1/2 rotate-[-8deg]">
            <Sticker id={trip.art.sticker} />
          </span>
        </>
      )}
    </span>
  );
}
