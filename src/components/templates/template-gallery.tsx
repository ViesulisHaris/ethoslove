"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NEW_SLUGS, featuredFor, sectionTemplates } from "@/config/featured";
import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { cn } from "@/lib/utils";
import { GalleryCard } from "./gallery-card";
import { GALLERY_ID } from "./gallery-id";
import { sendsFree } from "@/lib/gift/free-tier";
import { TIER_FILTERS, TIER_PARAM, parseTier, searchWithTier, type TierFilter } from "./gallery-tier";
import { SORTS, SORT_PARAM, parseSort, searchWithSort, sortTemplates, type GallerySort } from "./gallery-sort";
import { occasionRow } from "./gallery-occasions";

/** Fired after the filter or the order rewrites the address, which `popstate` does not report. */
const GALLERY_CHANGE = "ethos:gallery-tier";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(GALLERY_CHANGE, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(GALLERY_CHANGE, callback);
  };
}

const readTier = () => parseTier(new URLSearchParams(window.location.search).get(TIER_PARAM));
const readSort = () => parseSort(new URLSearchParams(window.location.search).get(SORT_PARAM));

/** Replaced, not pushed: Back should leave the gallery, not step back through every filter tried. */
function rewrite(search: string) {
  const { pathname, hash } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${hash}`);
  window.dispatchEvent(new Event(GALLERY_CHANGE));
}
const chooseTier = (tier: TierFilter) => rewrite(searchWithTier(window.location.search, tier));
const chooseSort = (sort: GallerySort) => rewrite(searchWithSort(window.location.search, sort));

/**
 * The gallery, as the owner drew it on 22 Nov 2026 (docs/marketing/growth-build/shots/mockups/
 * OWNER-MOCKUP-gallery.webp): a row of occasions as small pictures, the price filter beside it, and
 * over the cards a heading with "Sort by".
 *
 * The occasion tiles are links, not local state. Each occasion is already a real page with its own
 * title, description, structured data and sitemap entry, so choosing an occasion and landing on
 * that occasion's page are the same act, which is what makes it crawlable and the view shareable.
 * The caller filters by occasion; this filters by tier and sets the order, because neither has a
 * page of its own. Both are kept in the address (gallery-tier.ts, gallery-sort.ts).
 *
 * Unfiltered by occasion and in its default order, the gallery is three shelves: the best sellers,
 * the new arrivals, then everything else (src/config/featured.ts). Any other order is one list. An
 * occasion's page keeps its own order, best fit first, because that order is the point of the page,
 * so it has no "Sort by"; the cards there still wear their badges.
 *
 * `alsoFree` is the free templates the occasion doesn't list. Half the occasions have none of their
 * own, and "Free" used to empty the page with nowhere to go; it shows these instead.
 *
 * `today` is the day the page was rendered with: the row of occasions leads with what is in season
 * (gallery-occasions.ts), and the server and the browser must agree on the day.
 */
export function TemplateGallery({
  manifests,
  occasion,
  initialTier = "all",
  initialSort = "popular",
  added = [],
  alsoFree = [],
  today,
}: {
  manifests: TemplateManifest[];
  occasion?: Occasion;
  /** The tier the server rendered with, from the same `?tier=`, so hydration agrees with it. */
  initialTier?: TierFilter;
  /** The order the server rendered with, from the same `?sort=`. */
  initialSort?: GallerySort;
  /** Every gift's slug in the order it was added, oldest first: what "Newest" sorts by. */
  added?: readonly string[];
  alsoFree?: TemplateManifest[];
  /** "2026-11-22": the day the page was rendered with, for the order of the row of occasions. */
  today?: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as GiftLocale;
  const tier = useSyncExternalStore(subscribe, readTier, () => initialTier);
  const chosen = useSyncExternalStore(subscribe, readSort, () => initialSort);
  const sort: GallerySort = occasion ? "popular" : chosen;

  // "Free" is what can be sent free as the site stands (sendsFree), not the template's price class.
  const filtered = useMemo(() => manifests.filter((m) => tier === "all" || sendsFree(m) === (tier === "free")), [manifests, tier]);
  const shelves = useMemo(() => {
    if (occasion) return [{ id: "all" as const, items: filtered }];
    if (sort === "popular") return sectionTemplates(filtered);
    return [{ id: sort === "new" ? ("sortedNew" as const) : ("sortedAz" as const), items: sortTemplates(filtered, sort, locale, added, NEW_SLUGS) }];
  }, [filtered, occasion, sort, locale, added]);
  const occasions = useMemo(() => occasionRow(today), [today]);
  // The first row on a desk: the six in season, and the open occasion in the last place where it is not one of them.
  const lead = useMemo(() => {
    const first = occasions.slice(0, FIRST_ROW);
    if (occasion && !first.includes(occasion)) first[FIRST_ROW - 1] = occasion;
    return first;
  }, [occasions, occasion]);
  const [more, setMore] = useState(false);
  // Cards count on from one shelf to the next, so only the very first row is loaded eagerly.
  const offsets = shelves.map((_, i) => shelves.slice(0, i).reduce((n, shelf) => n + shelf.items.length, 0));
  const fallback = tier === "free" ? alsoFree : [];

  // On a phone or a tablet the row runs off the right edge, and the open occasion's tile may be past it: the row is drawn pulled along to it.
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = row.current;
    const open = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !open) return;
    const to = open.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft - (nav.clientWidth - open.offsetWidth) / 2;
    nav.scrollLeft = Math.max(0, to);
  }, [occasion]);

  const sorter = occasion ? null : (
    <label className="flex shrink-0 items-center gap-3 text-sm text-ink-soft">
      <span className="hidden font-medium text-ink sm:inline">{t("templates.sort.label")}</span>
      <span className="relative">
        <select
          value={sort}
          onChange={(e) => chooseSort(parseSort(e.target.value))}
          aria-label={t("templates.sort.label")}
          data-gallery-sort
          className="h-11 cursor-pointer appearance-none rounded-full bg-card pr-10 pl-5 text-sm font-medium text-ink ring-1 ring-ink/10 transition-shadow hover:ring-ink/30 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`templates.sort.${s}`)}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink" strokeWidth={1.8} />
      </span>
    </label>
  );

  return (
    // Less motion, where it is asked for: the cards past the first row then fade in without rising.
    <MotionConfig reducedMotion="user">
      {/* The header's "Make a gift" scrolls here on this page; the margin keeps the fixed header (promo strip and bar, ~104px) off the tiles it lands on. */}
      <div id={GALLERY_ID} className="container-x scroll-mt-32 pb-24">
        {/* Without JavaScript nothing ever fades a card in: they are drawn as they are. */}
        <noscript>
          <style>{"[data-gallery-card]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <div className="mb-10 flex flex-col gap-5 border-b border-line pb-8 lg:mb-8 lg:pb-6 xl:flex-row xl:items-start xl:gap-8">
          {/*
           * The occasions, each a small rendered picture over its name, in season first. On a desk
           * and a laptop it is one row, as the owner drew it: "All occasions", the six in season
           * and a "More" tile that lays the other seven out in a second row under it. Fourteen
           * tiles in two rows stood between the heading and the gifts, and at 1440 by 900 no gift
           * was on the first screen (the user walk of 23 Nov 2026); one row that ran off the edge
           * could not be pulled along with a mouse (the review of 22 Nov 2026). The open occasion
           * is always in the first row, so the row looks the same on every occasion's page. On a
           * phone and a tablet it is one row of all fourteen to swipe, cut mid-tile at the edge so
           * it reads as a row that goes on (its padding below is room for the open tile's shadow,
           * which the row would otherwise cut off square). The tiles stay in the catalogue's order
           * in the page itself; `order` only says which row a tile stands in on a desk.
           */}
          <nav ref={row} aria-label={t("occasions.title")} data-occasion-row className="scrollbar-none -mx-5 flex min-w-0 flex-1 snap-x gap-2.5 overflow-x-auto px-5 pt-1 pb-9 -mb-5 sm:mx-0 sm:px-1 lg:mb-0 lg:snap-none lg:flex-wrap lg:gap-x-2.5 lg:gap-y-5 lg:overflow-visible lg:px-0 lg:pb-3">
            <OccasionTile href="/templates" icon="all" label={t("templates.allOccasions")} active={!occasion} row="first" />
            {occasions.map((o) => (
              <OccasionTile key={o} href={`/occasions/${o}`} icon={o} label={t(`occasions.${o}`)} active={occasion === o} row={lead.includes(o) ? "first" : more ? "second" : "folded"} />
            ))}
            {/* The folded tiles' pictures are not fetched while they are not drawn: a pointer or the keyboard arriving on "More" fetches them, so the second row opens with its pictures in it. */}
            <button type="button" onClick={() => setMore((open) => !open)} onPointerEnter={() => warmIcons(occasions)} onFocus={() => warmIcons(occasions)} aria-expanded={more} data-occasion-more className={cn(TILE, TILE_IDLE, "hidden cursor-pointer lg:order-2 lg:flex")}>
              <span aria-hidden="true" className="mb-1 grid size-9 place-items-center rounded-full bg-paper text-ink ring-1 ring-ink/10 transition-colors duration-300 group-hover:bg-forest group-hover:text-cream">
                <Plus className={cn("size-4 transition-[rotate] duration-300 motion-reduce:transition-none", more && "rotate-45")} strokeWidth={1.8} />
              </span>
              <span>{t(more ? "templates.fewerOccasions" : "templates.moreOccasions")}</span>
            </button>
            {/* Ends the first row on a desk, so the second starts at the left edge whatever the tiles' widths. */}
            {more ? <span aria-hidden="true" className="hidden lg:order-3 lg:block lg:h-0 lg:basis-full" /> : null}
          </nav>
          {/* As tall as a tile, so the filter stands beside the first row when the second is open. */}
          <div className="flex shrink-0 items-center gap-2 xl:mt-1 xl:h-24 xl:border-l xl:border-line xl:pl-8">
            {TIER_FILTERS.map((v) => (
              <button key={v} type="button" onClick={() => chooseTier(v)} aria-pressed={tier === v} className={pillClass(tier === v)}>
                {v === "all" ? t("templates.allTiers") : v === "free" ? t("common.free") : t("common.premium")}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <>
            <div className="flex flex-col items-center py-14 text-center">
              <p className="max-w-md text-muted-foreground">{fallback.length ? t("templates.noneFree") : t("templates.none")}</p>
              <button type="button" onClick={() => chooseTier("all")} className="mt-5 inline-flex h-11 items-center rounded-full border border-ink/20 px-5 text-sm font-medium text-ink transition-colors hover:border-ink">
                {t("templates.showAll", { count: manifests.length })}
              </button>
            </div>
            {fallback.length ? (
              <div className={GRID}>
                {fallback.map((m, i) => (
                  <GalleryCard key={m.slug} manifest={m} index={i} badge={featuredFor(m.slug)} />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-20">
            {shelves.map((shelf, s) => (
              <section key={shelf.id} aria-labelledby={occasion ? undefined : `shelf-${shelf.id}`} data-shelf={shelf.id}>
                {occasion ? null : (
                  // On a phone the heading has the row to itself and "Sort by" stands under it: side by side, a longer heading ("Todas, empezando por la más nueva") was set in four lines of two words.
                  <header className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 lg:mb-6">
                    <div className="min-w-0">
                      {/* A sorted list is every gift under one heading: its small label is how many, not the order said twice. */}
                      <p className="text-eyebrow text-ink-soft">{t(`templates.sections.${shelf.id}.eyebrow`, { count: shelf.items.length })}</p>
                      <h2 id={`shelf-${shelf.id}`} className="display-md mt-2 flex items-center gap-3">
                        {t(`templates.sections.${shelf.id}.title`)}
                        {s === 0 ? <Sparkle /> : null}
                      </h2>
                    </div>
                    {/* "Sort by" stands beside the first heading only: it orders the whole gallery, not one shelf. */}
                    {s === 0 ? sorter : null}
                  </header>
                )}
                <div className={GRID}>
                  {shelf.items.map((m, i) => (
                    <GalleryCard key={m.slug} manifest={m} index={offsets[s] + i} badge={featuredFor(m.slug)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </MotionConfig>
  );
}

// One column by name on a phone: without it the single column is as wide as a card's longest line, and the page scrolls sideways.
const GRID = "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/**
 * An occasion as a tile: its small rendered picture over its name (public/art/occasions, made by
 * scripts/art/holiday/occasion_icons.py), in its own colours. The open one is the dark tile, with
 * a dot under it. At least 44px each way for a thumb; the picture is decoration, the name is the link.
 */
function OccasionTile({ href, icon, label, active, row }: { href: string; icon: Occasion | "all"; label: string; active: boolean; row: "first" | "second" | "folded" }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-occasion-tile={icon}
      className={cn(
        TILE,
        active ? "bg-forest text-cream shadow-[0_18px_30px_-18px_rgba(42,15,31,0.8)] active:bg-forest-raised" : TILE_IDLE,
        // Which row it stands in on a desk; on a phone every tile is in the one row.
        row === "first" ? "lg:order-1" : row === "second" ? "lg:order-4" : "lg:hidden",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 6 KB decoration at a fixed size: next/image would add a request and a srcset for nothing */}
      <img src={iconSrc(icon)} alt="" aria-hidden="true" width={96} height={96} loading="lazy" decoding="async" draggable={false} className="pointer-events-none size-12 object-contain drop-shadow-[0_5px_6px_rgba(74,32,24,0.28)] select-none lg:size-11" />
      <span className="line-clamp-2">{label}</span>
      {active ? <span aria-hidden="true" className="absolute -bottom-3 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-forest" /> : null}
    </Link>
  );
}

/**
 * A tile's box. On a phone every tile is the same size, in a row to swipe. On a desk a tile is as
 * wide as its name asks, within limits, as in the owner's drawing ("Valentine's Day" wider than
 * "Wedding"), and may give a little where the row is tight: a long name then takes two lines.
 */
const TILE =
  "group relative flex h-[6.5rem] w-[6.75rem] shrink-0 snap-start flex-col items-center justify-end gap-1.5 rounded-[1.25rem] px-2 pb-3.5 text-center text-[0.8125rem] leading-tight font-medium transition-[background-color,box-shadow,translate] duration-300 lg:h-24 lg:w-auto lg:max-w-[7.75rem] lg:min-w-[5.25rem] lg:shrink lg:px-3 lg:pb-3";
const TILE_IDLE =
  "bg-card text-ink ring-1 ring-ink/[0.07] hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_16px_28px_-20px_rgba(74,32,24,0.5)] active:translate-y-0 active:bg-paper-deep active:shadow-none motion-reduce:hover:translate-y-0";

/** Where an occasion's small picture is. */
const iconSrc = (icon: Occasion | "all") => `/art/occasions/${icon}.webp`;

/** Fetches the occasions' pictures ahead of their tiles being drawn (6 KB each; the browser keeps them). */
function warmIcons(occasions: readonly Occasion[]) {
  for (const o of occasions) new window.Image().src = iconSrc(o);
}

/** How many occasions stand beside "All occasions" in the first row on a desk, before "More". */
const FIRST_ROW = 6;

/** The small gold star beside the first heading. */
function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0 text-gold">
      <path d="M12 1.5c.7 5.6 2.9 8.9 9.5 10.5-6.6 1.6-8.8 4.9-9.5 10.5C11.3 16.9 9.1 13.6 2.5 12 9.1 10.400 11.3 7.1 12 1.5Z" fill="currentColor" />
    </svg>
  );
}

/** 44px tall: a phone's thumb. */
function pillClass(active: boolean): string {
  return cn(
    "inline-flex h-11 shrink-0 items-center rounded-full px-5 text-sm font-medium whitespace-nowrap transition-colors",
    // Solid, not see-through: on a desk the lilies' leaves pass behind these, and a leaf must not show through a word.
    active ? "bg-forest text-cream active:bg-forest-raised" : "bg-card text-ink-soft ring-1 ring-ink/[0.07] hover:text-ink hover:ring-ink/25 active:bg-paper-deep active:text-ink",
  );
}
