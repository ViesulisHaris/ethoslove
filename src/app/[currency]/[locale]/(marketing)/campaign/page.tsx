import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { CampaignAccess, type CampaignTemplateCard } from "@/components/campaign/campaign-access";
import { CAMPAIGN_DAYS, CAMPAIGN_TEMPLATES } from "@/lib/commerce/campaign-rules";
import type { GiftLocale } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/campaign">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "campaign" });
  // The creator campaign's secret page: only for people holding the brief, never for search.
  return { title: t("eyebrow"), robots: { index: false, follow: false } };
}

export default async function CampaignPage({ params }: PageProps<"/[currency]/[locale]/campaign">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("campaign");
  const lang = (locale === "es" ? "es" : "en") as GiftLocale;
  const templates: CampaignTemplateCard[] = CAMPAIGN_TEMPLATES.flatMap((slug) => {
    const manifest = getManifest(slug);
    return manifest ? [{ slug, name: manifest.name[lang], tagline: manifest.tagline[lang], poster: manifest.thumbnail.poster }] : [];
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
      <span className="grid size-14 place-items-center rounded-2xl bg-blush-paper text-rose ring-1 ring-rose/15">
        <Sparkles aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-6 text-eyebrow text-ink-soft">{t("eyebrow")}</p>
      <h1 className="mt-3 display-lg">{t("title")}</h1>
      <p className="mt-4 mb-8 max-w-xl text-lg leading-relaxed text-ink-soft">{t("subtitle", { days: CAMPAIGN_DAYS })}</p>
      {/* The sign-in inside reads the query string, which needs a boundary of its own. */}
      <Suspense>
        <CampaignAccess templates={templates} />
      </Suspense>
    </div>
  );
}
