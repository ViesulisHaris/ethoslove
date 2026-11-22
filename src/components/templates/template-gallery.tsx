"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { featuredFor, sectionTemplates } from "@/config/featured";
import { OCCASIONS, type Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { cn } from "@/lib/utils";
import { GalleryCard } from "./gallery-card";
import { GALLERY_ID } from "./gallery-id";
import { sendsFree } from "@/lib/gift/free-tier";
import { TIER_FILTERS, TIER_PARAM, parseTier, searchWithTier, type TierFilter } from "./gallery-tier";
import { SORTS, SORT_PARAM, parseSort, searchWithSort, sortTemplates, type GallerySort } from "./gallery-sort";

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
 */
export function TemplateGallery({
  manifests,
  occasion,
  initialTier = "all",
  initialSort = "popular",
  added = [],
  alsoFree = [],
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
    return [{ id: sort === "new" ? ("sortedNew" as const) : ("sortedAz" as const), items: sortTemplates(filtered, sort, locale, added) }];
  }, [filtered, occasion, sort, locale, added]);
  // Cards count on from one shelf to the next, so only the very first row is loaded eagerly.
  const offsets = shelves.map((_, i) => shelves.slice(0, i).reduce((n, shelf) => n + shelf.items.length, 0));
  const fallback = tier === "free" ? alsoFree : [];

  // The open occasion's tile may be past the row's right edge (the last ones are, on every screen): the row is drawn pulled along to it.
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
    // The header's "Make a gift" scrolls here on this page; the margin keeps the fixed header
    // (promo strip and bar, ~104px) off the tiles it lands on.
    <div id={GALLERY_ID} className="container-x scroll-mt-32 pb-24">
      <div className="mb-10 flex flex-col gap-5 border-b border-line pb-8 lg:flex-row lg:items-center lg:gap-8">
        {/*
         * One row of occasions, each a small rendered picture over its name. It runs off the right
         * edge where there are more than fit, and its last tile fades, so it reads as a row to
         * pull along and not as a list that was cut.
         */}
        <nav ref={row} aria-label={t("templates.allOccasions")} className="scrollbar-none -mx-5 flex min-w-0 flex-1 snap-x gap-2.5 overflow-x-auto px-5 pt-1 pb-4 sm:mx-0 sm:px-1 lg:[mask-image:linear-gradient(to_right,#000_calc(100%-3.5rem),transparent)]">
          <OccasionTile href="/templates" icon="all" label={t("templates.allOccasions")} active={!occasion} />
          {OCCASIONS.map((o) => (
            <OccasionTile key={o} href={`/occasions/${o}`} icon={o} label={t(`occasions.${o}`)} active={occasion === o} />
          ))}
          {/* Room for the fade: the last tile can be pulled clear of it. */}
          <span aria-hidden="true" className="hidden w-10 shrink-0 lg:block" />
        </nav>
        <div className="flex shrink-0 items-center gap-2 lg:border-l lg:border-line lg:pl-8">
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
                <header className="mb-8 flex items-end justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-eyebrow text-ink-soft">{t(`templates.sections.${shelf.id}.eyebrow`)}</p>
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
  );
}

// One column by name on a phone: without it the single column is as wide as a card's longest line, and the page scrolls sideways.
const GRID = "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/**
 * An occasion as a tile: its small rendered picture over its name (public/art/occasions, made by
 * scripts/art/holiday/occasion_icons.py), in its own colours. The open one is the dark tile, with
 * a dot under it. At least 44px each way for a thumb; the picture is decoration, the name is the link.
 */
function OccasionTile({ href, icon, label, active }: { href: string; icon: Occasion | "all"; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-occasion-tile={icon}
      className={cn(
        "group relative flex h-[6.5rem] w-[6.75rem] shrink-0 snap-start flex-col items-center justify-end gap-1.5 rounded-[1.25rem] px-2 pb-3.5 text-center text-[0.8125rem] leading-tight font-medium transition-[background-color,box-shadow,translate] duration-300",
        active ? "bg-forest text-cream shadow-[0_18px_30px_-18px_rgba(42,15,31,0.8)]" : "bg-card text-ink ring-1 ring-ink/[0.07] hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_16px_28px_-20px_rgba(74,32,24,0.5)] motion-reduce:hover:translate-y-0",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 6 KB decoration at a fixed size: next/image would add a request and a srcset for nothing */}
      <img src={`/art/occasions/${icon}.webp`} alt="" aria-hidden="true" width={96} height={96} loading="lazy" decoding="async" draggable={false} className="pointer-events-none size-12 object-contain drop-shadow-[0_5px_6px_rgba(74,32,24,0.28)] select-none" />
      <span className="line-clamp-2">{label}</span>
      {active ? <span aria-hidden="true" className="absolute -bottom-3 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-forest" /> : null}
    </Link>
  );
}

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
    active ? "bg-forest text-cream" : "bg-card text-ink-soft ring-1 ring-ink/[0.07] hover:text-ink hover:ring-ink/25",
  );
}
