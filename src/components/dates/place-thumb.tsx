/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { kindImage } from "@/lib/dates/art";
import { GROUPS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { photoAt } from "@/lib/dates/photos";
import { GroupIcon } from "./group-icon";
import { requestPhoto, usePhoto } from "./photo-store";

/**
 * The picture on a place's card. A real photograph of the place when somebody has given one away;
 * until then, and when nobody has, a tile for its kind: the kind's picture washed in the group's
 * colour with its glyph on top, which reads as "a café" and never as "this café". `width` is how
 * wide it is drawn, in CSS pixels: the photograph is fetched at the Wikimedia size that fits it.
 */
export function PlaceThumb({ place, className, eager = false, width = 104 }: { place: Place; className?: string; eager?: boolean; width?: number }) {
  const holder = useRef<HTMLSpanElement>(null);
  const stored = usePhoto(place.id);
  // A thumbnail Wikimedia won't serve (a 404, or a rate-limit page the browser blocks) left an
  // empty tinted square; the kind's tile takes its place instead. Kept per address, so a later
  // photo for the same card is still tried.
  const [broken, setBroken] = useState<string | null>(null);
  const found = place.photo ?? stored ?? null;
  const src = found ? photoAt(found, width) : null;
  const photo = src && src !== broken ? src : null;
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
        // Lazy even on the top picks: at its own size a photograph in view arrives at once, and the
        // shelf's cards past the screen's edge would otherwise take the map's bandwidth on a phone.
        <img src={photo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={(e) => (e.currentTarget.dataset.loaded = "1")} onError={() => setBroken(photo)} className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 data-[loaded=1]:opacity-100" />
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
