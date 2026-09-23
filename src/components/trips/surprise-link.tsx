"use client";

import { useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveGiftSeed } from "@/lib/editor/gift-seed";
import type { GiftUnwrap } from "@/lib/gift/schema";
import { clipText, UNWRAP_LIMITS } from "@/lib/gift/unwrap-rules";
import { cityName } from "@/lib/trips/airports";
import { fromFields, readLastFrom } from "@/lib/trips/last-from";
import { TemplateChooser } from "@/components/gifts/template-chooser";
import { CHIP_PHOTO_WIDTH, gatherPhotos, stopPlaces, withStopPhotos } from "@/components/gifts/unwrap-photos";

type Props = { slug: string; fields: Record<string, unknown>; className?: string; children: ReactNode };

/**
 * A plain link to the gift editor that leaves the trip behind for it first: the destination, the
 * stops and the nights, worked out on the server, plus where they last flew from, which only this
 * browser knows. Written just before the click navigates, so it is always this trip's. A road
 * trip already starts where its road does (tripGiftFields), and their home airport isn't that.
 */
export function SurpriseLink({ slug, fields, className, children }: Props) {
  const locale = useLocale() === "es" ? "es" : "en";
  const remember = () => {
    const from = fields.trip === "road" ? null : readLastFrom();
    saveGiftSeed({ slug, fields: from ? { ...fields, ...fromFields(from, locale) } : fields });
  };
  return (
    <Link href={`/create/${slug}`} onClick={remember} className={className} data-testid="make-surprise">
      {children}
    </Link>
  );
}

/**
 * "…or put it inside any gift": the trip (tripUnwrap, worked out on the server) wrapped as a present
 * at the end of whichever gift they pick. The towns' photographs are asked for as the chooser opens,
 * and the airport they last flew from is added here, where it is known.
 */
export function SurpriseAnyGift({
  unwrap,
  searchNames,
  className,
  children,
}: {
  unwrap: GiftUnwrap;
  /** The towns' own names, in the stops' order, to find their photographs by (./unwrap-photos). */
  searchNames?: readonly string[];
  className?: string;
  children: ReactNode;
}) {
  const locale = useLocale() === "es" ? "es" : "en";
  const [open, setOpen] = useState(false);
  const photos = useRef<Promise<Record<string, string | null>> | null>(null);

  const build = async (): Promise<GiftUnwrap> => {
    const found = (await photos.current) ?? {};
    const from = unwrap.trip && unwrap.trip.mode !== "road" ? readLastFrom() : null;
    const start = from ? clipText(cityName(from, locale), UNWRAP_LIMITS.place) : null;
    return {
      ...withStopPhotos(unwrap, found),
      ...(unwrap.trip && start && start !== unwrap.trip.to ? { trip: { ...unwrap.trip, from: start } } : {}),
    };
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          photos.current = gatherPhotos(stopPlaces(unwrap, searchNames), CHIP_PHOTO_WIDTH);
          setOpen(true);
        }}
        className={className}
        data-testid="surprise-any-gift"
      >
        {children}
      </button>
      <TemplateChooser open={open} onOpenChange={setOpen} kind="trip" build={build} />
    </>
  );
}
