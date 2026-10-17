/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BellRing, Heart, Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ideaImage, kindImage } from "@/lib/dates/art";
import { fromYmd } from "@/lib/dates/calendar";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import { photoAt } from "@/lib/dates/photos";
import { editorName } from "@/lib/saved-dates/sync";
import type { SavedDateSummary } from "@/lib/saved-dates/types";
import { requestPhoto, usePhoto } from "@/components/dates/photo-store";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** A ready-made trip as its card shows it, worked out on the server so the trips themselves stay out of the browser. */
export type TripCover = { title: string; where: string | null; days: number; src: string; srcSet: string; from: string; to: string };

/** How wide a card's picture is drawn at most (three columns in a 72rem page): what the photo is fetched for. */
const COVER_WIDTH = 400;

/** "Sat 3 Oct", with the year only when it isn't this one. */
function dayLabel(ymd: string, locale: "en" | "es"): string {
  const d = fromYmd(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
}

/**
 * A date's picture: a real photograph of its first named stop when somebody has given one away
 * (asked for only once the card is near the screen, through the same queue as the Dates list), and
 * until then, or when there is none, the date idea's own picture or the tile for the stop's kind.
 */
function DateCover({ item }: { item: SavedDateSummary }) {
  const holder = useRef<HTMLDivElement>(null);
  const cover = item.cover;
  const key = cover ? `saved:${cover.lat},${cover.lng}:${cover.name}` : null;
  const stored = usePhoto(key);
  const [broken, setBroken] = useState<string | null>(null);
  const src = stored ? photoAt(stored, COVER_WIDTH) : null;
  const photo = src && src !== broken ? src : null;

  useEffect(() => {
    if (!cover || !key || stored !== undefined) return;
    const place = { id: key, name: cover.name, lat: cover.lat, lng: cover.lng };
    const el = holder.current;
    if (!el || !("IntersectionObserver" in window)) return requestPhoto(place);
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
  }, [cover, key, stored]);

  const group = cover ? GROUPS[KINDS[cover.kind].group] : null;
  return (
    <div ref={holder} className="absolute inset-0" style={group ? { backgroundColor: group.soft } : undefined}>
      {item.ideaId ? (
        <img src={ideaImage(item.ideaId)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : cover && group ? (
        <>
          <img src={kindImage(cover.kind, key ?? "")} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover saturate-[0.85]" />
          <span className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: group.color, opacity: 0.22 }} />
        </>
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-[linear-gradient(160deg,#fde3e8_0%,#f6c9d4_100%)] text-rose-deep/70">
          <Heart aria-hidden="true" className="size-10" />
        </span>
      )}
      {photo ? <img src={photo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={(e) => (e.currentTarget.dataset.loaded = "1")} onError={() => setBroken(photo)} className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 data-[loaded=1]:opacity-100" /> : null}
    </div>
  );
}

function TripCoverImage({ trip }: { trip: TripCover | undefined }) {
  if (!trip) return <span className="absolute inset-0 bg-[linear-gradient(160deg,#dff0ff_0%,#c9dcf6_100%)]" />;
  return (
    <span className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${trip.from} 0%, ${trip.to} 100%)` }}>
      <img src={trip.src} srcSet={trip.srcSet} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
    </span>
  );
}

export type CardActions = {
  onRename: (item: SavedDateSummary) => void;
  onRemind: (item: SavedDateSummary, remind: boolean) => void;
  onDelete: (item: SavedDateSummary) => void;
  onReadOnly: () => void;
};

/**
 * One saved date or trip on My dates, drawn like a stay on Airbnb: the picture first, then its name,
 * where and when, and how long. The whole card opens it (a date on the plan, a trip on its page);
 * the "⋯" menu renames it, sets the day-before reminder (members) and deletes it (its owner only).
 * A date of the partner's carries their initial, and one past the free few is marked read-only.
 */
export function SavedDateCard({ item, trip, member, actions }: { item: SavedDateSummary; trip?: TripCover; member: boolean; actions: CardActions }) {
  const t = useTranslations("savedDates");
  const locale = useLocale() === "es" ? "es" : "en";
  const href = item.kind === "trip" ? `/trips/${item.tripId ?? ""}` : `/plan#s=${item.id}`;
  const title = item.title || (item.kind === "trip" ? (trip?.title ?? t("card.trip")) : item.city || t("save.defaultTitle"));
  const where = item.kind === "trip" ? (trip?.where ?? item.city) : item.city;
  const facts = [where, item.day ? dayLabel(item.day, locale) : item.kind === "date" ? t("card.someday") : null].filter(Boolean).join(" · ");
  const length = item.kind === "trip" ? (trip ? t("card.days", { count: trip.days }) : null) : t("card.stops", { count: item.stopsCount });
  const from = item.mine ? null : t("card.from", { name: item.owner.name ?? item.owner.initial });
  // On their own dates, a change the partner made is signed; the partner's dates already say whose they are.
  const editor = item.mine ? editorName(item) : null;
  const editedBy = editor ? t("card.editedBy", { name: editor }) : null;
  const canRemind = member && item.kind === "date" && Boolean(item.day) && item.editable;

  return (
    <article className="group relative" data-testid="saved-card">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-muted shadow-soft ring-1 ring-black/5">
        <div className="absolute inset-0 transition-transform duration-500 ease-(--ease-out-quint) group-hover:scale-[1.03]">{item.kind === "trip" ? <TripCoverImage trip={trip} /> : <DateCover item={item} />}</div>
        <span className="absolute top-3 left-3 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-forest uppercase shadow-[0_2px_8px_rgba(20,10,20,0.12)]">{item.kind === "trip" ? t("card.trip") : t("card.date")}</span>
        {!item.mine ? (
          <span aria-hidden="true" title={from ?? undefined} className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-dusk text-[12.5px] font-bold text-starlight shadow-[0_4px_12px_rgba(14,16,48,0.35)] ring-2 ring-white">
            {item.owner.initial}
          </span>
        ) : null}
        {!item.editable ? (
          // Above the card's own link: it explains, where the rest of the card opens the date. The
          // pill is drawn 32px tall; its ::before takes the tap target to 44px without growing it.
          <button type="button" onClick={actions.onReadOnly} className="absolute bottom-3 left-3 z-10 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-forest/85 px-3 text-[12px] font-semibold text-cream backdrop-blur-sm transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-forest">
            <Lock aria-hidden="true" className="size-3.5" />
            {t("card.readOnly")}
          </button>
        ) : null}
        {item.remind && canRemind ? (
          <span className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full bg-white/92 text-rose-deep shadow-[0_2px_8px_rgba(20,10,20,0.12)]" title={t("card.reminder")}>
            <BellRing aria-hidden="true" className="size-4" />
            <span className="sr-only">{t("card.reminder")}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-start gap-1">
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate font-display text-[19px] leading-snug text-foreground">
            {/* The whole card is this link (its ::after covers the card); the menu and the read-only chip sit above it. */}
            <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-[24px] after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-rose/60 focus-visible:after:ring-offset-4 focus-visible:after:ring-offset-background">
              {title}
              {from ? <span className="sr-only"> · {from}</span> : null}
            </Link>
          </h2>
          {facts ? <p className="mt-0.5 truncate text-[14px] text-muted-foreground">{facts}</p> : null}
          <p className="mt-0.5 truncate text-[14px] text-muted-foreground">{[length, from, editedBy].filter(Boolean).join(" · ")}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t("card.menu.label", { title })} className="relative z-10 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted">
              <MoreHorizontal aria-hidden="true" className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-1.5">
            <DropdownMenuItem asChild className="min-h-11 px-2.5">
              <Link href={href}>
                <ArrowUpRight aria-hidden="true" />
                {t("card.menu.open")}
              </Link>
            </DropdownMenuItem>
            {item.editable ? (
              <DropdownMenuItem className="min-h-11 px-2.5" onSelect={() => actions.onRename(item)}>
                <Pencil aria-hidden="true" />
                {t("card.menu.rename")}
              </DropdownMenuItem>
            ) : null}
            {canRemind ? (
              <DropdownMenuCheckboxItem className="min-h-11 pl-2.5" checked={item.remind} onCheckedChange={(next) => actions.onRemind(item, next === true)}>
                <BellRing aria-hidden="true" />
                {t("card.menu.remind")}
              </DropdownMenuCheckboxItem>
            ) : null}
            <DropdownMenuSeparator />
            {item.mine ? (
              <DropdownMenuItem variant="destructive" className="min-h-11 px-2.5" onSelect={() => actions.onDelete(item)}>
                <Trash2 aria-hidden="true" />
                {t("card.menu.delete")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="min-h-11 px-2.5 text-[13px] leading-snug">
                {t("card.notOwner", { name: item.owner.name ?? item.owner.initial })}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
