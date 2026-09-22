"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TemplateManifest } from "@/templates/types";
import { TemplateCard } from "@/components/templates/template-card";

export function TemplateStrip({ manifests }: { manifests: TemplateManifest[] }) {
  const t = useTranslations("home.templates");
  const free = manifests.filter((m) => m.tier === "free").length;
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <div className="container-x mb-10 grid gap-6 lg:grid-cols-12 lg:items-end">
        <div data-reveal className="lg:col-span-7">
          <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
          <h2 className="display-xl mt-4 max-w-[16ch]">{t("title")}</h2>
        </div>
        <div className="lg:col-span-5 lg:pb-1">
          <p className="max-w-md text-lg leading-relaxed text-ink-soft">{t("blurb")}</p>
          <div className="mt-5 flex items-center gap-5">
            <span className="text-mono-meta text-muted-foreground">{t("count", { n: manifests.length, free })}</span>
            <Link href="/templates" className="group -my-2 inline-flex items-center gap-1.5 py-2 text-sm font-medium text-ink underline-offset-4 hover:underline">
              {t("all")}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
      <div className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
        {manifests.map((m, i) => (
          <div key={m.slug} className="w-[240px] shrink-0 snap-start sm:w-[270px]">
            <TemplateCard manifest={m} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
