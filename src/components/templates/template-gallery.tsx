"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { featuredFor, sectionTemplates } from "@/config/featured";
import { OCCASIONS, type Occasion } from "@/config/occasions";
import type { TemplateManifest, TemplateTier } from "@/templates/types";
import { cn } from "@/lib/utils";
import { Cutout } from "@/components/marketing/home/cutouts";
import { TemplateCard } from "./template-card";

/**
 * The occasion chips are links, not local state. Each occasion is already a real page with
 * its own title, description, structured data and sitemap entry, so sorting by occasion and
 * landing on that occasion's page are the same act — which is what makes the sort crawlable
 * and the view shareable. The caller filters by occasion; this only filters by tier, because
 * tier has no page of its own.
 *
 * Unfiltered by occasion, the gallery is three shelves: the best sellers, the new arrivals, then
 * everything else (src/config/featured.ts). An occasion's page keeps its own order, best fit
 * first, because that order is the point of the page; the cards there still wear their badges.
 */
export function TemplateGallery({ manifests, occasion }: { manifests: TemplateManifest[]; occasion?: Occasion }) {
  const t = useTranslations();
  const [tier, setTier] = useState<TemplateTier | "all">("all");

  const filtered = useMemo(() => manifests.filter((m) => tier === "all" || m.tier === tier), [manifests, tier]);
  const shelves = useMemo(() => (occasion ? [{ id: "all" as const, items: filtered }] : sectionTemplates(filtered)), [filtered, occasion]);
  // Cards count on from one shelf to the next, so only the very first row is loaded eagerly.
  const offsets = shelves.map((_, i) => shelves.slice(0, i).reduce((n, shelf) => n + shelf.items.length, 0));

  return (
    <div className="container-x pb-24">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label={t("templates.allOccasions")} className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href="/templates" aria-current={occasion ? undefined : "page"} className={chipClass(!occasion)}>
            {t("templates.allOccasions")}
          </Link>
          {OCCASIONS.map((o) => (
            <Link
              key={o}
              href={`/occasions/${o}`}
              aria-current={occasion === o ? "page" : undefined}
              className={chipClass(occasion === o)}
            >
              {t(`occasions.${o}`)}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          {(["all", "free", "premium"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setTier(v)} aria-pressed={tier === v} className={chipClass(tier === v)}>
              {v === "all" ? t("templates.allTiers") : v === "free" ? t("common.free") : t("common.premium")}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">{t("templates.none")}</p>
      ) : (
        <div className="flex flex-col gap-20">
          {shelves.map((shelf, s) => (
            <section key={shelf.id} aria-labelledby={occasion ? undefined : `shelf-${shelf.id}`} data-shelf={shelf.id}>
              {occasion ? null : (
                <header className="mb-8 flex items-end justify-between gap-8 border-b border-line pb-5">
                  <div className="relative">
                    <p className="text-eyebrow text-ink-soft">{t(`templates.sections.${shelf.id}.eyebrow`)}</p>
                    <h2 id={`shelf-${shelf.id}`} className="display-md mt-2">
                      {t(`templates.sections.${shelf.id}.title`)}
                    </h2>
                    {shelf.id === "popular" ? <Cutout id="lily-pink" className="absolute -top-3 left-full ml-3 w-14 rotate-12 drop-shadow-[0_6px_10px_rgba(120,40,70,0.25)]" /> : null}
                    {shelf.id === "new" ? <Cutout id="bow-gingham" className="absolute -top-2 left-full ml-3 w-14 rotate-[14deg] drop-shadow-[0_6px_10px_rgba(120,30,50,0.3)]" /> : null}
                  </div>
                  <p className="hidden max-w-sm pb-1 text-sm leading-relaxed text-muted-foreground md:block">{t(`templates.sections.${shelf.id}.blurb`)}</p>
                </header>
              )}
              <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shelf.items.map((m, i) => (
                  <TemplateCard key={m.slug} manifest={m} index={offsets[s] + i} badge={featuredFor(m.slug)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function chipClass(active: boolean): string {
  return cn(
    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors",
    active ? "border-ink bg-ink text-paper" : "border-line bg-transparent text-ink-soft hover:border-ink/50 hover:text-ink",
  );
}
