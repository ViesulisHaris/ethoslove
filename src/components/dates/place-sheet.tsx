/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef } from "react";
import { Accessibility, Check, Clock3, ExternalLink, Globe, Images, Landmark, Leaf, MapPin, Navigation, Phone, Plus, Sun, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatDay, weekdayOf, type Ymd } from "@/lib/dates/calendar";
import type { PlaceDetails } from "@/lib/dates/details";
import { formatDistance } from "@/lib/dates/geo";
import { formatHours, hoursOn } from "@/lib/dates/hours";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { GroupIcon } from "./group-icon";
import { requestPhoto, usePhoto } from "./photo-store";

export type PlaceSheetLabels = {
  close: string;
  add: string;
  remove: string;
  directions: string;
  website: string;
  reviews: string;
  call: string;
  openOn: (day: string, hours: string) => string;
  closedOn: (day: string) => string;
  hoursUnknown: string;
  hoursUnclear: string;
  terrace: string;
  vegetarian: string;
  stepFree: string;
  landmark: string;
  free: string;
  source: string;
  loading: string;
  photoBy: (author: string) => string;
  photoFrom: string;
  readMore: string;
};

type Props = { place: Place; details: PlaceDetails | null | undefined; date: Ymd; where: string; locale: "en" | "es"; labels: PlaceSheetLabels; inPlan: boolean; onTogglePlan: () => void; onClose: () => void; className?: string };

/**
 * One place, opened. What the map knows about it arrives a moment after the sheet does (address,
 * the hours for the day they picked, a website), and where it knows nothing the sheet says so and
 * hands them a search for photos and reviews, which this site does not pretend to have.
 */
export function PlaceSheet({ place, details, date, where, locale, labels, inPlan, onTogglePlan, onClose, className }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [place.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The name finds most pictures; a Wikidata id, which only arrives with the details, finds the rest.
  const stored = usePhoto(place.id);
  const photo = place.photo ?? stored ?? null;
  const qid = details?.wikidata;
  useEffect(() => {
    if (place.named && !place.photo) requestPhoto(place, qid);
  }, [place, qid]);

  const group = GROUPS[place.group];
  const info = KINDS[place.kind];
  const rawHours = details?.hours ?? place.hours;
  const day = hoursOn(rawHours, weekdayOf(date));
  const dayName = formatDay(date, locale).split(" ")[0].replace(",", "");
  const hoursLine = !rawHours ? labels.hoursUnknown : !day.known ? labels.hoursUnclear : day.ranges.length === 0 ? labels.closedOn(dayName) : labels.openOn(dayName, formatHours(day) ?? "");
  const closed = Boolean(rawHours) && day.known && day.ranges.length === 0;
  const address = details?.address ?? place.address;
  const website = details?.website ?? place.website;
  const phone = details?.phone ?? place.phone;
  const cuisine = details?.cuisine.length ? details.cuisine : place.cuisine;
  const chips: [typeof Sun, string][] = [];
  if (details?.outdoorSeating || place.outdoorSeating) chips.push([Sun, labels.terrace]);
  if (details?.vegetarian || place.vegetarian) chips.push([Leaf, labels.vegetarian]);
  if (details?.stepFree || place.stepFree) chips.push([Accessibility, labels.stepFree]);
  if (details?.notable || place.notable) chips.push([Landmark, labels.landmark]);
  const query = encodeURIComponent(`${place.name} ${where}`.trim());

  return (
    <motion.aside
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="false"
      aria-labelledby="place-sheet-name"
      className={cn("max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_-20px_rgba(60,20,35,0.45)] ring-1 ring-forest/5 lg:max-h-[min(640px,calc(100dvh-var(--header-h)-48px))] lg:rounded-[28px] lg:shadow-lift", className)}
    >
      {photo ? (
        <figure className="relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-[28px]">
          <img src={photo.src} alt="" width={photo.width} height={photo.height} decoding="async" referrerPolicy="no-referrer" className="aspect-[16/10] w-full object-cover" />
          <button type="button" onClick={onClose} aria-label={labels.close} className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white/90 text-forest shadow-soft backdrop-blur hover:bg-white">
            <X className="size-[18px]" />
          </button>
          <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(30,8,20,0.72))] px-4 pt-6 pb-2 text-[10.5px] leading-snug text-white/90">
            {photo.fileUrl ? (
              <a href={photo.fileUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                {[photo.credit ? labels.photoBy(photo.credit) : null, photo.licence, labels.photoFrom].filter(Boolean).join(" · ")}
              </a>
            ) : (
              [photo.credit ? labels.photoBy(photo.credit) : null, photo.licence, labels.photoFrom].filter(Boolean).join(" · ")
            )}
          </figcaption>
        </figure>
      ) : null}
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: group.soft, color: group.color }}>
          <GroupIcon group={place.group} className="size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold" style={{ color: group.color }}>
            {[info.label[locale], ...cuisine.slice(0, 2)].join(" · ")}
          </p>
          <h2 ref={heading} tabIndex={-1} id="place-sheet-name" className="font-display text-[24px] leading-[1.08] text-forest outline-none">
            {place.name}
          </h2>
        </div>
        {photo ? null : (
          <button type="button" onClick={onClose} aria-label={labels.close} className="-mt-1 -mr-1 grid size-10 shrink-0 place-items-center rounded-full text-forest/50 hover:bg-forest/5 hover:text-forest">
            <X className="size-[18px]" />
          </button>
        )}
      </div>

      <dl className="mt-4 space-y-2.5 text-[14.5px] leading-snug text-forest/80">
        <div className="flex gap-2.5">
          <dt className="sr-only">Address</dt>
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-forest/40" />
          <dd>
            {details === undefined && !address ? <span className="inline-block h-4 w-44 animate-pulse rounded bg-forest/10 align-middle" aria-label={labels.loading} /> : address ? `${address} · ` : null}
            <span className="text-forest/55">{formatDistance(place.distanceKm, locale)}</span>
          </dd>
        </div>
        <div className="flex gap-2.5">
          <dt className="sr-only">Hours</dt>
          <Clock3 aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", closed ? "text-[#B5341C]" : "text-forest/40")} />
          <dd className={cn(closed && "font-medium text-[#B5341C]")}>{details === undefined && !rawHours ? <span className="inline-block h-4 w-36 animate-pulse rounded bg-forest/10 align-middle" aria-label={labels.loading} /> : hoursLine}</dd>
        </div>
      </dl>

      {chips.length > 0 || info.free ? (
        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {info.free ? <li className="rounded-full bg-[#DCEBDF] px-2.5 py-1 text-[12px] font-semibold text-[#2E6B4E]">{labels.free}</li> : null}
          {chips.map(([Icon, name]) => (
            <li key={name} className="inline-flex items-center gap-1 rounded-full bg-forest/5 px-2.5 py-1 text-[12px] font-medium text-forest/75">
              <Icon aria-hidden="true" className="size-3" />
              {name}
            </li>
          ))}
        </ul>
      ) : null}

      {place.about ? (
        <p className="mt-3.5 text-[14.5px] leading-relaxed text-forest/75 first-letter:uppercase">
          {place.about}
          {place.articleUrl ? (
            <>
              {" "}
              <a href={place.articleUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#B0245A] underline-offset-4 hover:underline">
                {labels.readMore}
              </a>
            </>
          ) : null}
        </p>
      ) : details?.description ? (
        <p className="mt-3.5 text-[14px] leading-relaxed text-forest/65 italic">“{details.description}”</p>
      ) : null}

      <button type="button" onClick={onTogglePlan} aria-pressed={inPlan} className={cn("mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform hover:-translate-y-0.5", inPlan ? "bg-[#FFE8EF] text-[#9C1F4A]" : "btn-rose")}>
        {inPlan ? <Check aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
        {inPlan ? labels.remove : labels.add}
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[13.5px] font-semibold text-forest">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
          <Navigation aria-hidden="true" className="size-4" />
          {labels.directions}
        </a>
        <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
          <Images aria-hidden="true" className="size-4" />
          {labels.reviews}
        </a>
        {website ? (
          <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
            <Globe aria-hidden="true" className="size-4" />
            {labels.website}
            <ExternalLink aria-hidden="true" className="size-3 opacity-50" />
          </a>
        ) : null}
        {phone ? (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
            <Phone aria-hidden="true" className="size-4" />
            {labels.call}
          </a>
        ) : null}
      </div>
      <p className="mt-4 text-[11.5px] leading-snug text-forest/45">{labels.source}</p>
    </motion.aside>
  );
}
