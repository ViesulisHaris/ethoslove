/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { kindImage } from "@/lib/dates/art";
import { GROUPS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { GroupIcon } from "./group-icon";
import { requestPhoto, usePhoto } from "./photo-store";

/**
 * The picture on a place's card. A real photograph of the place when somebody has given one away;
 * until then, and when nobody has, a tile for its kind: the kind's picture washed in the group's
 * colour with its glyph on top, which reads as "a café" and never as "this café".
 */
export function PlaceThumb({ place, className, eager = false }: { place: Place; className?: string; eager?: boolean }) {
  const holder = useRef<HTMLSpanElement>(null);
  const stored = usePhoto(place.id);
  const photo = place.photo ?? stored ?? null;
  const group = GROUPS[place.group];

  useEffect(() => {
    if (place.photo || !place.named || stored !== undefined) return;
    const el = holder.current;
    if (!el) return;
    if (eager || !("IntersectionObserver" in window)) return requestPhoto(place);
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen.disconnect();
        requestPhoto(place);
      },
      { rootMargin: "200px" },
    );
    seen.observe(el);
    return () => seen.disconnect();
  }, [place, stored, eager]);

  return (
    <span ref={holder} aria-hidden="true" className={cn("relative block shrink-0 overflow-hidden bg-white", className)} style={{ backgroundColor: group.soft }}>
      {photo ? (
        <img src={photo.src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={(e) => (e.currentTarget.dataset.loaded = "1")} className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 data-[loaded=1]:opacity-100" />
      ) : (
        <>
          <img src={kindImage(place.kind, place.id)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-110 object-cover opacity-55 blur-[1.5px] saturate-[0.7]" />
          <span className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: group.color, opacity: 0.42 }} />
          <span className="absolute inset-0 grid place-items-center text-white drop-shadow-[0_2px_6px_rgba(40,10,25,0.45)]">
            <GroupIcon group={place.group} className="size-[38%] max-h-9 max-w-9" />
          </span>
        </>
      )}
    </span>
  );
}
