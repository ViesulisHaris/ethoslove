"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OCCASIONS, type Occasion } from "@/config/occasions";
import type { TemplateManifest, TemplateTier } from "@/templates/types";
import { cn } from "@/lib/utils";
import { TemplateCard } from "./template-card";

/**
 * The occasion chips are links, not local state. Each occasion is already a real page with
 * its own title, description, structured data and sitemap entry, so sorting by occasion and
 * landing on that occasion's page are the same act — which is what makes the sort crawlable
 * and the view shareable. The caller filters by occasion; this only filters by tier, because
 * tier has no page of its own.
 */
export function TemplateGallery({ manifests, occasion }: { manifests: TemplateManifest[]; occasion?: Occasion }) {
  const t = useTranslations();
  const [tier, setTier] = useState<TemplateTier | "all">("all");

  const filtered = useMemo(() => manifests.filter((m) => tier === "all" || m.tier === tier), [manifests, tier]);

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
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m, i) => (
            <TemplateCard key={m.slug} manifest={m} index={i} />
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
