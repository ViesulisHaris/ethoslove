import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { TEMPLATE_SLUGS, getManifest } from "@/templates/manifests";
import { Button } from "@/components/ui/button";
import { TemplatePhonePreview } from "@/components/templates/template-phone-preview";

/*
 * Where an Etsy order's download leads (docs/marketing/ETSY.md): the gift they bought, running, the
 * three steps, and one button into the editor with ?etsy=1, which turns the pay sheet into the
 * "Bought on Etsy" box (components/editor/etsy-claim.tsx). For Etsy buyers only: out of search and
 * the sitemap, no prices.
 */

export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/etsy/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const manifest = getManifest(slug);
  if (!manifest) return {};
  const t = await getTranslations({ locale, namespace: "etsyLanding" });
  return { title: t("metaTitle", { template: manifest.name[locale as GiftLocale] }), robots: { index: false, follow: false } };
}

export default async function EtsyOrderPage({ params }: PageProps<"/[currency]/[locale]/etsy/[slug]">) {
  const { locale, slug } = await params;
  const manifest = getManifest(slug);
  if (!manifest) notFound();
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations("etsyLanding");
  const template = manifest.name[l];
  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div className="container-x pt-6 pb-14 lg:pt-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-center font-display text-[1.75rem] leading-[1.15] text-balance sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-center text-base text-ink-soft">{t("lead", { template })}</p>
        {/* The button comes first: on a phone the preview below would push it off the first screen. */}
        <Button asChild className="mt-6 h-12 w-full rounded-full text-base" data-testid="etsy-start">
          <Link href={`/create/${manifest.slug}?etsy=1`}>
            {t("cta", { template })}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <ol className="mt-6 grid gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-base leading-relaxed">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-paper">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("help")}</p>
        <div className="mt-8">
          <TemplatePhonePreview slug={manifest.slug} locale={l} autoStart width="clamp(160px, (100svh - 24rem) * 0.462, min(280px, 100vw - 2.5rem))" />
        </div>
      </div>
    </div>
  );
}
