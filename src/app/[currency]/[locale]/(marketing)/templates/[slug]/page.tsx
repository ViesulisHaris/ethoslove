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
import { artSrcSet, pageArt, slotGeometry, slotStyle } from "@/content/page-art";
import { ArtLayer } from "@/components/templates/page/art";
import { HeroFlatlay, type HeroFlatlayArt } from "@/components/templates/page/hero-flatlay";
import { heroLead } from "@/components/templates/page/lead";
import { HERO_ART } from "@/components/templates/page/placements";
import { Experience, HowToSend, MoreLikeThis, Questions, WhatToWrite, stepNoteLine } from "@/components/templates/page/sections";
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

/**
 * A gift's page, laid out as the owner's mock-up (docs/marketing/growth-build/DESIGN-LESS-TEXT.md):
 * the hero with the gift in a phone lying among flowers, how to send it in three pictures,
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
  // The hero's picture, as the browser needs it: the render, its bezel, and where its screen is.
  const flatlay = pageArt("hero-flatlay", flowers);
  const screen = flatlay.slots.screen!;
  const { centerX, centerY, perWidth, turn, spanX } = slotGeometry(flatlay, screen);
  const heroArt: HeroFlatlayArt = {
    src: flatlay.src1x,
    srcSet: artSrcSet(flatlay),
    width: flatlay.width,
    height: flatlay.height,
    bezel: flatlay.bezel ? { src: flatlay.bezel.src1x, srcSet: `${flatlay.bezel.src1x} ${flatlay.width1x}w, ${flatlay.bezel.src} ${flatlay.width}w` } : undefined,
    screen: slotStyle(flatlay, screen),
    centerX,
    centerY,
    perWidth,
    turn,
    spanX,
  };
  const noteLine = await stepNoteLine(manifest.slug, l, guide);

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
          <div className="container-x relative grid gap-y-10 pt-8 pb-14 sm:pb-20 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:items-center xl:gap-x-14 xl:pt-10 xl:pb-28">
            <div className="contents xl:block xl:max-w-[33rem]">
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

              <div className="order-last xl:mt-10">
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
            {/*
             * The phone lying on its flowers. --hero-phone is how wide its screen is drawn; --fl-up
             * and --fl-down the room kept above and below the screen's middle, in screen widths.
             * Below `xl` the words are above and below it, so nearly the whole picture is kept clear
             * of them. From `xl` it has the left column: its leaves run into the section's own
             * padding, and it sits left of centre, by less on a wider screen, so its right-hand
             * lilies stop short of the words and its left-hand one is not lost off the page.
             */}
            <div className="min-w-0 [--fl-down:1.76] [--fl-up:1.74] [--hero-phone:min(13.75rem,57vw)] xl:order-first xl:[--fl-down:1.2] xl:[--fl-up:1.2] xl:[--hero-phone:clamp(14rem,17.8vw,16rem)]">
              <HeroFlatlay slug={manifest.slug} locale={l} art={heroArt} preview={manifest.thumbnail.webm} frame={theme.cover} width="var(--hero-phone)" up="var(--fl-up)" down="var(--fl-down)" sizes="(min-width: 1280px) 860px, (min-width: 420px) 800px, 190vw" className="xl:mx-0 xl:ml-[clamp(3.25rem,calc(6.8rem-(100vw-80rem)*0.36),6.8rem)]" />
            </div>
          </div>
        </section>

        <HowToSend locale={l} heading={seo?.howTo ?? t("templates.guide.heading", { name: manifest.name[l] })} flowers={flowers} noteLine={noteLine} />
        {guide ? <WhatToWrite manifest={manifest} locale={l} guide={guide} flowers={flowers} /> : null}
        <Experience manifest={manifest} locale={l} flowers={flowers} />
        <Questions manifest={manifest} locale={l} faq={faq} guide={guide} about={about.rest} />
        <MoreLikeThis manifest={manifest} locale={l} flowers={flowers} />
      </div>
    </>
  );
}
