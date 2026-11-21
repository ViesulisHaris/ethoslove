import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Play } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import {
  breadcrumbNode,
  faqNode,
  localizedUrl,
  ogImageUrl,
  pageMetadata,
  templateProductNode,
} from "@/lib/seo";
import { templateGuide } from "@/content/template-guides";
import { pageThemeChromeCss, pageThemeStyle, templatePageTheme } from "@/content/template-page-themes";
import { templateSeo } from "@/content/template-seo";
import { TEMPLATE_SLUGS, getManifest } from "@/templates/manifests";
import { AdTemplateView } from "@/components/shared/ad-pixels";
import { JsonLd } from "@/components/shared/json-ld";
import { templateFaq } from "@/components/templates/template-guide";
import { ArtLayer, type PlacedArt } from "@/components/templates/page/art";
import { HeroFlatlay } from "@/components/templates/page/hero-flatlay";
import { heroLead } from "@/components/templates/page/lead";
import { Experience, HowToSend, MoreLikeThis, Questions, WhatToWrite } from "@/components/templates/page/sections";
import { noteForEveryone, sendsFree } from "@/lib/gift/free-tier";
import { PRODUCTS, chargedCurrency, formatAmount } from "@/lib/pricing/products";

export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: Omit<PageProps<"/[currency]/[locale]/templates/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const manifest = getManifest(slug);
  if (!manifest) return {};
  const l = locale as GiftLocale;
  const t = await getTranslations({ locale, namespace: "seo" });
  const seo = templateSeo(slug, l);
  return pageMetadata({
    locale,
    path: `/templates/${slug}`,
    title: seo?.title ?? t("templateTitle", { name: manifest.name[l] }),
    description: seo?.description ?? manifest.description[l],
    image: ogImageUrl(locale, slug),
  });
}

/** The hero's loose pieces: a petal by the phone's foot, one in the top corner, a bloom out of focus. */
const HERO_ART: PlacedArt[] = [
  { art: "lily-three-quarter", x: -1, y: 2, size: 12, rot: 42, blur: 5, opacity: 0.75, phone: false, eager: true },
  { art: "petal-1", x: 5.5, y: 83, size: 4.4, rot: -32, phone: false },
  { art: "petal-2", x: 95, y: 9, size: 4.2, rot: 28, blur: 1, phone: false, eager: true },
];

/**
 * A gift's page, laid out as the owner's mock-up (docs/marketing/growth-build/DESIGN-LESS-TEXT.md):
 * the hero with the live demo in a phone lying among flowers, how to send it in three pictures,
 * what to write (where the template has a guide), the experience band, the questions and four more
 * gifts. The same layout for every template, each in its own colours
 * (content/template-page-themes.ts) and its colourway of the page art (content/page-art.ts).
 */
export default async function TemplateDetailPage({
  params,
}: PageProps<"/[currency]/[locale]/templates/[slug]">) {
  const { currency: shown, locale, slug } = await params;
  const manifest = getManifest(slug);
  if (!manifest) notFound();
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations();
  const currency = chargedCurrency(shown);
  // A premium template is bought as one; a free one only ever costs its "make it special" extras.
  // Shown as free only while it can be sent free (lib/gift/free-tier.ts).
  const free = sendsFree(manifest);
  const price = formatAmount(
    PRODUCTS[manifest.tier === "free" ? "extras" : "single"].amounts[currency],
    currency,
    l,
  );
  const seo = templateSeo(manifest.slug, l);
  const faq = await templateFaq(manifest, l, price);
  const guide = templateGuide(manifest.slug, l);
  // The hero says the opening of the description; the closed block under the questions keeps the rest.
  const about = heroLead(manifest.description[l]);
  const theme = templatePageTheme(manifest.slug);
  const flowers = theme.flowers;

  // What's included: only what this template has. What it lacks is not a list to read.
  const included = [
    t("templates.featurePhotos", { max: manifest.features.photos.max }),
    manifest.features.music ? t("templates.featureMusic") : null,
    manifest.features.captions ? t("templates.featureCaptions") : null,
    manifest.features.countdown ? t("templates.featureCountdown") : null,
    manifest.features.surprise ? t("templates.featureSurprise") : null,
    manifest.features.video ? t("templates.featureVideo") : null,
  ].filter((label): label is string => label !== null);

  return (
    <>
      {/* For the ad pixels' per-template audiences (lib/analytics/ads.ts); nothing without consent. */}
      <AdTemplateView slug={manifest.slug} tier={manifest.tier} />
      <JsonLd
        nodes={[
          templateProductNode(manifest, l, currency, t("seo.templateCategory")),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("templates.title"), url: localizedUrl(locale, "/templates") },
            { name: manifest.name[l], url: localizedUrl(locale, `/templates/${manifest.slug}`) },
          ]),
          faqNode(faq),
        ]}
      />
      {/* The footer, the header's button and the ground behind them take the page's colours while it is open. */}
      <style>{pageThemeChromeCss(manifest.slug, theme)}</style>
      {/* -mt/pt: the page's ground runs up under the floating header, as the homepage's hero does. */}
      <div data-page-theme={manifest.slug} style={pageThemeStyle(theme)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        {/* (1) The hero. */}
        <section className="relative">
          <ArtLayer items={HERO_ART} flowers={flowers} />
          {/*
           * Below `lg` it is one column, and the phone alone is taller than a phone's screen: the
           * name and "Make this gift" sat one to two screens down. So the words come first there:
           * name, the buttons and the price, then the phone, then what's included. From `lg` the
           * phone takes the left column. The text column is `contents` below `lg`, which makes its
           * two halves grid items that `order` can put either side of the phone.
           */}
          <div className="container-x relative grid gap-y-10 pt-8 pb-14 sm:pb-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-x-10 lg:pt-10 lg:pb-24 xl:gap-x-14">
            <div className="contents lg:block lg:max-w-[35rem]">
              <div className="order-first">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={free ? "rounded-[5px] border border-page-ink/70 px-2 py-1 text-page-label text-page-ink" : "rounded-[5px] bg-page-ink px-2 py-1 text-page-label text-page-ground"}>
                    {free ? t("common.free") : t("common.premium")}
                  </span>
                  {manifest.styles.map((s) => (
                    <span key={s} className="rounded-[5px] border border-page-line px-2 py-1 text-page-label text-page-body">
                      {t(`templates.style.${s}`)}
                    </span>
                  ))}
                </div>
                {/* The phrase people search for, then the name we gave it: one heading, both read. */}
                <h1 className="mt-7">
                  {seo ? <span className="mb-3 block text-page-label text-page-body">{seo.keyword}</span> : null}
                  <span className="block font-display text-[clamp(2.6rem,5.7vw,4.75rem)] leading-[0.98] tracking-[-0.03em] text-page-ink">{manifest.name[l]}</span>
                </h1>
                <p className="mt-4 font-display text-[clamp(1.3rem,2vw,1.6rem)] leading-snug text-page-body italic">{manifest.tagline[l]}</p>
                {about.lead ? <p className="mt-6 max-w-[31rem] text-base leading-relaxed text-page-body">{about.lead}</p> : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/create/${manifest.slug}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-6 text-base font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,translate,scale] duration-200 ease-(--ease-out-quint) hover:bg-page-accent-hover active:scale-[0.98] pointer-fine:hover:-translate-y-px"
                  >
                    {t("templates.makeThis")}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                  <Link
                    href={`/demo/${manifest.slug}`}
                    className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-page-ink/30 px-6 text-base font-medium text-page-ink transition-[background-color,border-color,scale] duration-200 ease-(--ease-out-quint) hover:border-page-ink/50 hover:bg-page-raised active:scale-[0.98]"
                  >
                    <Play aria-hidden="true" className="size-3.5 fill-current" />
                    {t("templates.fullscreenDemo")}
                  </Link>
                </div>
                <p className="mt-4 max-w-[31rem] text-sm leading-relaxed text-page-body">
                  {free ? t(noteForEveryone() ? "templates.pagePriceNote" : "templates.pagePriceFree", { price }) : t("templates.pagePricePaid", { price })}
                </p>
              </div>

              <div className="order-last lg:mt-10">
                <h2 className="text-page-label text-page-body">{t("templates.included")}</h2>
                <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {included.map((label) => (
                    <li key={label} className="flex items-center gap-2.5 text-[0.9375rem] text-page-ink">
                      <Check aria-hidden="true" className="size-4 shrink-0 text-page-accent" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* The phone's width: most of a phone's screen, a fifth of a desk's. */}
            <div className="min-w-0 py-2 [--hero-phone:min(17rem,100vw-6.5rem)] lg:order-first lg:py-4 lg:[--hero-phone:clamp(15rem,21.5vw,19.5rem)]">
              <HeroFlatlay slug={manifest.slug} locale={l} flowers={flowers} width="var(--hero-phone)" />
            </div>
          </div>
        </section>

        <HowToSend manifest={manifest} locale={l} heading={seo?.howTo ?? t("templates.guide.heading", { name: manifest.name[l] })} flowers={flowers} />
        {guide ? <WhatToWrite manifest={manifest} locale={l} guide={guide} flowers={flowers} /> : null}
        <Experience manifest={manifest} locale={l} flowers={flowers} />
        <Questions manifest={manifest} locale={l} faq={faq} guide={guide} about={about.rest} />
        <MoreLikeThis manifest={manifest} locale={l} flowers={flowers} />
      </div>
    </>
  );
}
