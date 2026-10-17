/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Check, Clock3, ExternalLink, Globe, Images, Landmark, Leaf, MapPin, Navigation, Phone, Plus, Share2, Star, Sun, Ticket, X } from "lucide-react";
import { animate, motion, useDragControls, useMotionValue } from "motion/react";
import { useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDay, weekdayOf, type Ymd } from "@/lib/dates/calendar";
import type { PlaceDetails } from "@/lib/dates/details";
import { cuisineWords } from "@/lib/dates/cuisines";
import { linksFor, SOURCE_NAMES, type Elsewhere } from "@/lib/dates/elsewhere";
import { formatStars } from "@/lib/dates/format";
import { formatDistance } from "@/lib/dates/geo";
import { formatHours, hoursOn } from "@/lib/dates/hours";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import { photoAt } from "@/lib/dates/photos";
import type { Ranked } from "@/lib/dates/rank";
import type { PublicReview } from "@/lib/dates/reviews";
import type { Quirk } from "@/lib/dates/unusual";
import type { Cost } from "@/lib/dates/cost";
import { sellsTickets, ticketQuery } from "@/lib/dates/ticketed";
import { placeShareHref } from "@/lib/share/links";
import type { WentAs } from "@/lib/supabase/types";
import { tiqetsSearch } from "@/lib/trips/partners";
import { PartnerLink } from "@/components/trips/partner-link";
import { CostChip } from "./cost-chip";
import { GroupIcon } from "./group-icon";
import { PairsWith } from "./pairs-with";
import { Reviews, type ReviewsLabels } from "./reviews";
import { Stars } from "./stars";
import { requestPhoto, usePhoto } from "./photo-store";
import { QuirkBadge } from "./quirk-icon";

export type PlaceSheetLabels = {
  /** "On other sites": scores from Tripadvisor and Google when this install has their keys, and links to look it up otherwise. */
  elsewhere: string;
  close: string;
  /** The address and the hours are marked for screen readers only; their names were English on /es. */
  address: string;
  hours: string;
  add: string;
  remove: string;
  directions: string;
  website: string;
  photosLink: string;
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
  rank: (n: number, of: number, group: string) => string;
  reviewsCount: (n: number) => string;
  pairs: string;
  walkBetween: (m: number) => string;
  share: string;
  shareCopied: string;
  /** Before the place's name in the text a share sheet sends with the link. */
  shareText: string;
  reviews: ReviewsLabels;
};

type Props = {
  place: Ranked;
  pairs: Ranked[];
  reviews: PublicReview[] | undefined;
  loginNext: string;
  onSubmitReview: (input: { stars: number; cost: Cost | null; wentAs: WentAs | null; body: string }) => Promise<"ok" | "unauthenticated" | "failed">;
  onDeleteReview: () => Promise<boolean>;
  onOpenPlace: (id: string) => void;
  details: PlaceDetails | null | undefined;
  date: Ymd;
  where: string;
  locale: "en" | "es";
  labels: PlaceSheetLabels;
  inPlan: boolean;
  onTogglePlan: () => void;
  onClose: () => void;
  /** A phone's bottom sheet: it has a handle, and dragging it down puts the sheet away. */
  swipe?: boolean;
  /** "swap" when it replaces another place's sheet: its content fades in where the last one was. */
  entrance?: "open" | "swap";
  /** What makes it out of the ordinary, as the list worked it out (unusual.ts). */
  quirk?: Quirk;
  className?: string;
};

/** How far down, or how fast, a drag of the handle has to go to put the sheet away. */
const FLING_PX = 90;
/** Half the width of a link preview's card: photoAt asks Wikimedia for twice this, its 1280-pixel size. */
const SHARE_PHOTO_WIDTH = 600;
const FLING_SPEED = 600;
const QUINT = [0.22, 1, 0.36, 1] as const;
/**
 * A phone's sheet rides a spring with no bounce: in from below, and away the same way, carrying
 * whatever speed the finger flung it with. A desktop's slides a little in from the side it stands
 * on. Reduced motion (the explorer's MotionConfig) keeps only the fades.
 */
const SHEET = {
  phone: {
    open: { initial: { y: "100%" }, animate: { y: 0, opacity: 1 } },
    swap: { initial: { opacity: 0 }, animate: { y: 0, opacity: 1 } },
    exit: { y: "100%", transition: { type: "spring", bounce: 0, visualDuration: 0.28 } },
    transition: { type: "spring", bounce: 0, visualDuration: 0.34 },
  },
  desktop: {
    open: { initial: { opacity: 0, x: -16 }, animate: { opacity: 1, x: 0 } },
    swap: { initial: { opacity: 0 }, animate: { opacity: 1, x: 0 } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.18, ease: QUINT } },
    transition: { duration: 0.26, ease: QUINT },
  },
} as const;

/**
 * One place, opened. What the map knows about it arrives a moment after the sheet does (address,
 * the hours for the day they picked, a website), and where it knows nothing the sheet says so and
 * hands them a search for photos and reviews, which this site does not pretend to have.
 */
export function PlaceSheet({ place, pairs, reviews, loginNext, onSubmitReview, onDeleteReview, onOpenPlace, details, date, where, locale, labels, inPlan, onTogglePlan, onClose, swipe = false, entrance = "open", quirk, className }: Props) {
  const ta = useTranslations("affiliate");
  const drag = useDragControls();
  // Where a phone's sheet has been dragged to: let go short of putting it away, it springs back.
  const y = useMotionValue(0);
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
  const cuisine = cuisineWords(details?.cuisine.length ? details.cuisine : place.cuisine, locale, info.label[locale]);
  const chips: [typeof Sun, string][] = [];
  if (details?.outdoorSeating || place.outdoorSeating) chips.push([Sun, labels.terrace]);
  if (details?.vegetarian || place.vegetarian) chips.push([Leaf, labels.vegetarian]);
  if (details?.stepFree || place.stepFree) chips.push([Accessibility, labels.stepFree]);
  if (details?.notable || place.notable) chips.push([Landmark, labels.landmark]);
  // The full tags, read when it opened, can say what the name didn't (a bar tagged as on a roof).
  const oddity = quirk ?? details?.quirk;
  const query = encodeURIComponent(`${place.name} ${where}`.trim());
  // The details can say it is famous when the map's first answer didn't.
  const tickets = sellsTickets({ kind: place.kind, named: place.named, notable: place.notable || details?.notable }) ? tiqetsSearch(ticketQuery(place.name, where), locale) : null;

  // What Tripadvisor and Google say, when this install has their keys; an empty answer otherwise,
  // and the links below stand in for it. Kept per place, so a stale answer never shows on another.
  const [elsewhere, setElsewhere] = useState<{ id: string; ratings: Elsewhere[] } | null>(null);
  useEffect(() => {
    if (!place.named) return;
    const ask = new AbortController();
    fetch(`/api/dates/elsewhere?name=${encodeURIComponent(place.name)}&lat=${place.lat}&lng=${place.lng}`, { signal: ask.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ ratings?: Elsewhere[] }>) : null))
      .then((json) => json && setElsewhere({ id: place.id, ratings: json.ratings ?? [] }))
      .catch(() => undefined);
    return () => ask.abort();
  }, [place.id, place.name, place.lat, place.lng, place.named]);
  const scores = elsewhere?.id === place.id ? elsewhere.ratings : [];
  // A place from the map has no address of its own; without one the links searched the bare name,
  // and three branches of Waterstones got the same links. The sheet's address, or at least the town.
  const lookUp = place.named ? linksFor({ ...place, address: address || where || undefined }).filter((l) => !scores.some((r) => r.source === l.source)) : [];

  // The link to this place (lib/share/links.ts): the Dates page around it, this sheet open, and its
  // photograph and name for the preview a chat draws. Without a photograph, the preview is the site's card.
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const cover = photo ? photoAt(photo, SHARE_PHOTO_WIDTH).split("?")[0] : null;
    const url = `${window.location.origin}${placeShareHref(getPathname({ href: "/dates", locale }), place, where, cover)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text: `${labels.shareText} ${place.name}`, url });
      } catch {
        // Closed the share sheet: nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(labels.share, url);
    }
  };

  const motionOf = swipe ? SHEET.phone : SHEET.desktop;
  return (
    <motion.aside
      initial={motionOf[entrance].initial}
      animate={motionOf[entrance].animate}
      exit={motionOf.exit}
      transition={motionOf.transition}
      role="dialog"
      aria-modal="false"
      aria-labelledby="place-sheet-name"
      data-place-sheet=""
      drag={swipe ? "y" : false}
      dragListener={false}
      dragControls={drag}
      // Down, it follows the finger one to one and, let go, keeps the speed it was flung with, so
      // one put away carries on out of sight (a constraint at the bottom pulled it back up first).
      // Let go short of that, it springs back without overshooting. Up, it doesn't move.
      style={{ y }}
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > FLING_PX || info.velocity.y > FLING_SPEED) onClose();
        else animate(y, 0, { type: "spring", bounce: 0, visualDuration: 0.3, velocity: info.velocity.y });
      }}
      className={cn("max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-[28px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-18px_50px_-20px_rgba(60,20,35,0.45)] ring-1 ring-forest/5 lg:max-h-[min(640px,calc(100dvh-var(--header-h)-48px))] lg:rounded-[28px] lg:shadow-lift", className)}
    >
      {/* Pinned to the top of the sheet as it scrolls, so it can always be put away: the close
          button used to scroll off with the photo, and on a phone a handle to drag it down. Zero
          height, so it takes no room from what is under it. */}
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 h-0">
        {swipe ? (
          <div aria-hidden="true" onPointerDown={(e) => drag.start(e)} className="absolute inset-x-16 top-0 flex h-11 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing">
            <span className="h-1.5 w-10 rounded-full bg-forest/30 ring-1 ring-white/70" />
          </div>
        ) : null}
        <button type="button" onClick={onClose} aria-label={labels.close} className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-white/90 text-forest shadow-soft backdrop-blur hover:bg-white">
          <X className="size-[18px]" />
        </button>
      </div>
      {photo ? (
        <figure className="relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-[28px]">
          {/* Capped on phones: at 16:10 the photo alone filled a landscape phone's sheet. The sheet is at
              most ~480px wide, so Wikimedia's 960 px size is sharp on any screen; 1280 was a third more. */}
          <img src={photoAt(photo, 480)} alt="" width={photo.width} height={photo.height} decoding="async" referrerPolicy="no-referrer" className="aspect-[16/10] w-full object-cover max-lg:max-h-[26dvh]" />
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
      <div className={cn("flex items-start gap-3", !photo && "pr-11")}>
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: group.soft, color: group.color }}>
          <GroupIcon group={place.group} className="size-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold" style={{ color: group.color }}>
            {[info.label[locale], ...cuisine].join(" · ")}
          </p>
          <h2 ref={heading} tabIndex={-1} id="place-sheet-name" className="font-display text-[24px] leading-[1.08] text-forest outline-none">
            {place.name}
          </h2>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-forest/60">
            {place.rating?.reviews ? (
              <>
                <Stars value={place.rating.stars} locale={locale} />
                <span className="font-semibold text-forest/85">{formatStars(place.rating.stars, locale)}</span>
                <span>{labels.reviewsCount(place.rating.reviews)}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{labels.rank(place.groupRank, place.groupSize, group.label[locale].toLowerCase())}</span>
            <CostChip cost={place.cost} locale={locale} reported={place.rating?.cost !== null && place.rating?.cost !== undefined} />
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2.5 text-[14.5px] leading-snug text-forest/80">
        <div className="flex gap-2.5">
          <dt className="sr-only">{labels.address}</dt>
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-forest/40" />
          <dd>
            {details === undefined && !address ? <span className="inline-block h-4 w-44 animate-pulse rounded bg-forest/10 align-middle" aria-label={labels.loading} /> : address ? `${address} · ` : null}
            <span className="text-forest/65">{formatDistance(place.distanceKm, locale)}</span>
          </dd>
        </div>
        <div className="flex gap-2.5">
          <dt className="sr-only">{labels.hours}</dt>
          <Clock3 aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", closed ? "text-destructive" : "text-forest/40")} />
          <dd className={cn(closed && "font-medium text-destructive")}>{details === undefined && !rawHours ? <span className="inline-block h-4 w-36 animate-pulse rounded bg-forest/10 align-middle" aria-label={labels.loading} /> : hoursLine}</dd>
        </div>
      </dl>

      {chips.length > 0 || info.free || oddity ? (
        <ul className="mt-3.5 flex flex-wrap gap-1.5">
          {oddity ? (
            <li>
              <QuirkBadge quirk={oddity} locale={locale} className="h-[26px] bg-rose-mist px-2.5 text-[12px] text-rose-ink" />
            </li>
          ) : null}
          {info.free ? <li className="rounded-full bg-moss-soft px-2.5 py-1 text-[12px] font-semibold text-moss">{labels.free}</li> : null}
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
          {/* Wikipedia's short descriptions end without a full stop, so the link ran on from them
              ("…in central London Read more on Wikipedia"). */}
          {/[.!?…)"”»]$/.test(place.about.trim()) ? place.about : `${place.about.trim()}.`}
          {place.articleUrl ? (
            <>
              {" "}
              <a href={place.articleUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-rose-deep underline-offset-4 hover:underline">
                {labels.readMore}
              </a>
            </>
          ) : null}
        </p>
      ) : details?.description ? (
        <p className="mt-3.5 text-[14px] leading-relaxed text-forest/65 italic">“{details.description}”</p>
      ) : null}

      {/* On a phone the sheet is short and the photo, the hours and the blurb come first, so the one
          thing to do here waits at the bottom of the sheet (on a white band) until it scrolls into place. */}
      <div className="mt-3 pt-2 max-lg:sticky max-lg:bottom-0 max-lg:z-[5] max-lg:-mx-5 max-lg:bg-white max-lg:px-5 max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onTogglePlan} aria-pressed={inPlan} className={cn("inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform hover:-translate-y-0.5", inPlan ? "bg-rose-soft text-rose-ink" : "btn-rose")}>
          {inPlan ? <Check aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
          {inPlan ? labels.remove : labels.add}
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[13.5px] font-semibold text-forest">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
          <Navigation aria-hidden="true" className="size-4" />
          {labels.directions}
        </a>
        <a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
          <Images aria-hidden="true" className="size-4" />
          {labels.photosLink}
        </a>
        {website ? (
          <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
            <Globe aria-hidden="true" className="size-4" />
            {labels.website}
            <ExternalLink aria-hidden="true" className="size-3 opacity-50" />
          </a>
        ) : null}
        {tickets ? (
          <PartnerLink partner="tiqets" placement="place_sheet" href={tickets} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
            <Ticket aria-hidden="true" className="size-4" />
            {ta("tickets.button")}
            <ExternalLink aria-hidden="true" className="size-3 opacity-50" />
            <span className="sr-only">(Tiqets, {ta("newTab")})</span>
          </PartnerLink>
        ) : null}
        {phone ? (
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-forest/15 hover:bg-forest/5">
            <Phone aria-hidden="true" className="size-4" />
            {labels.call}
          </a>
        ) : null}
        <button type="button" onClick={share} className={cn("inline-flex h-11 items-center justify-center gap-1.5 rounded-full border transition-colors", copied ? "border-moss/30 bg-moss-soft text-moss" : "border-forest/15 hover:bg-forest/5")}>
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Share2 aria-hidden="true" className="size-4" />}
          <span aria-live="polite">{copied ? labels.shareCopied : labels.share}</span>
        </button>
      </div>
      {tickets ? (
        <p className="mt-2 px-1 text-[12px] leading-snug text-forest/60">
          {ta("tickets.via")} {ta("disclosure")}
        </p>
      ) : null}

      {scores.length > 0 || lookUp.length > 0 ? (
        <div className="mt-5">
          <p className="text-[11.5px] font-semibold tracking-[0.14em] text-forest/65 uppercase">{labels.elsewhere}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {scores.map((r) => (
              <a key={r.source} href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full bg-forest/[0.05] px-3.5 lg:h-10 text-[13.5px] font-semibold text-forest transition-colors hover:bg-forest/10">
                <Star aria-hidden="true" className="size-3.5 fill-star text-star" />
                {formatStars(r.stars, locale)}
                <span className="font-medium text-forest/60">
                  {SOURCE_NAMES[r.source]} · {labels.reviewsCount(r.reviews)}
                </span>
              </a>
            ))}
            {lookUp.map((l) => (
              <a key={l.source} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-full border border-forest/15 px-3.5 lg:h-10 text-[13.5px] font-semibold text-forest transition-colors hover:bg-forest/5">
                {SOURCE_NAMES[l.source]}
                <ExternalLink aria-hidden="true" className="size-3 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      ) : null}
      <Reviews rating={place.rating} reviews={reviews} locale={locale} labels={labels.reviews} loginNext={loginNext} onSubmit={onSubmitReview} onDelete={onDeleteReview} />
      <PairsWith from={place} picks={pairs} locale={locale} labels={{ title: labels.pairs, walk: labels.walkBetween }} onOpen={onOpenPlace} />
      <p className="mt-4 text-[11.5px] leading-snug text-forest/65">{labels.source}</p>
    </motion.aside>
  );
}
