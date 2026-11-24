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
import { PT_LETTER_LANG, PT_LETTER_PATH } from "@/content/pt-letter";
import { templateGuide } from "@/content/template-guides";
import { PAGE_THEME_MARK, pageThemeChromeCss, pageThemeStyle, templatePageTheme } from "@/content/template-page-themes";
import { templateFilmStart } from "@/content/template-film-starts";
import { sceneLead, templateLead } from "@/content/template-leads";
import { templateSeo } from "@/content/template-seo";
import { templateSteps } from "@/content/template-steps";
import { TEMPLATE_SLUGS, getManifest } from "@/templates/manifests";
import { AdTemplateView } from "@/components/shared/ad-pixels";
import { JsonLd } from "@/components/shared/json-ld";
import { templateFaq } from "@/components/templates/template-guide";
import { ArtLayer } from "@/components/templates/page/art";
import { HERO_BUTTON, HERO_BUTTON_QUIET, HERO_GRID, HERO_PHONE_BOX, HERO_PHONE_PLACE, HERO_SIZES, heroFlatlayArt } from "@/components/templates/page/hero-art";
import { HeroFlatlay } from "@/components/templates/page/hero-flatlay";
import { includedRows } from "@/components/templates/page/included";
import { heroKeyword, heroWords } from "@/components/templates/page/lead";
import { HERO_ART } from "@/components/templates/page/placements";
import { Experience, HowToSend, MoreLikeThis, Questions, WhatToWrite, templateSamples } from "@/components/templates/page/sections";
import { NOTE_TEMPLATES, noteForEveryone, sendsFree } from "@/lib/gift/free-tier";
import { PRODUCTS, chargedCurrency, formatAmount, templateProduct } from "@/lib/pricing/products";
import { DocumentMark } from "@/components/shared/document-mark";

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
    PRODUCTS[templateProduct(manifest.tier)].amounts[currency],
    currency,
    l,
  );
  const seo = templateSeo(manifest.slug, l);
  const faq = await templateFaq(manifest, l, price);
  const guide = templateGuide(manifest.slug, l);
  // The hero says the gift's italic line and the opening of the description; the closed block under the questions keeps the rest.
  const about = heroWords(manifest.tagline, manifest.description[l], l);
  const theme = templatePageTheme(manifest.slug);
  const flowers = theme.flowers;
  // The hero's picture, as the browser needs it: the render, its bezel, and where its screen is.
  const heroArt = heroFlatlayArt(flowers);
  const samples = await templateSamples(manifest.slug, l, guide);
  const steps = templateSteps(manifest.slug);
  // While the free version is the short note, a note template's free gift has no photos, video or
  // captions (lib/gift/free-tier.ts): the list under the hero is then what "Make it special" adds,
  // and says so, where it used to stand under "Free" as if it came with the free note.
  const note = free && noteForEveryone() && NOTE_TEMPLATES.includes(manifest.slug);
  // And the hero says what the note does: a description that ends on "your photos drop in as polaroids"
  // gives way to the same sentences without the photos (messages: templates.noteLead).
  // A description that opens on one sentence of fifty words gives the hero none: that gift has its own (content/template-leads.ts).
  // And one that opens on a scene the italic line has already walked into has a sentence that goes on from it (SCENE_LEADS, same file).
  const lead = note && t.has(`templates.noteLead.${manifest.slug}`) ? t(`templates.noteLead.${manifest.slug}`) : sceneLead(manifest.slug, l) ?? (about.lead || templateLead(manifest.slug, l));

  // What's included: only what this template has; under "With “Make it special”", only what the unlock adds (./included).
  const included = includedRows(manifest, note).map((row) => t(`templates.${row.key}`, row.values));
  // The phrase people search for stands over the name. Where the two are the same words, the name alone says it.
  const keyword = heroKeyword(seo?.keyword, manifest.name[l]);

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
      <DocumentMark on="body" name={PAGE_THEME_MARK} value={manifest.slug} />
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
          <div className={HERO_GRID}>
            <div className="contents lg:block lg:max-w-[33rem]">
              <div className="order-first">
                <div className="flex flex-wrap items-center gap-2">
                  {/* The owner, 23 Nov 2026: "i dont think we should write this on the templates, as it makes it look like not an impulse buy anymore and seems expensive". A gift that costs something says nothing here; the one that is free says so. The price is said once, under the buttons. */}
                  {free ? <span className="rounded-[5px] border border-page-ink/70 px-2 py-1 text-page-label text-page-ink">{t("common.free")}</span> : null}
                  {manifest.styles.map((s) => (
                    <span key={s} className="rounded-[5px] border border-page-line px-2 py-1 text-page-label text-page-body">
                      {t(`templates.style.${s}`)}
                    </span>
                  ))}
                </div>
                {/* The phrase people search for, then the name we gave it: one heading, both read (and the name alone where they are the same words). */}
                <h1 className="mt-7">
                  {keyword ? <span className="mb-3 block text-page-label text-page-body">{keyword}</span> : null}
                  {/* Two blocks to the eye; the space keeps them two phrases to whatever reads the heading's text ("Digital love letterThe Letter"). */}
                  {keyword ? " " : null}
                  <span className="block font-display text-[clamp(2.6rem,5.7vw,4.75rem)] leading-[0.98] tracking-[-0.03em] text-page-ink">{manifest.name[l]}</span>
                </h1>
                <p className="mt-4 font-display text-[clamp(1.3rem,2vw,1.6rem)] leading-snug text-page-body italic">{about.line}</p>
                {lead ? <p className="mt-6 max-w-[31rem] text-base leading-relaxed text-page-body">{lead}</p> : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {/* Fetched ahead in full as soon as it is on screen: the editor is drawn per request, and a
                      link to such a page fetches nothing ahead by default, so the press waited for the
                      server and the editor's code (3.6 s on a slow phone). */}
                  <Link
                    href={`/create/${manifest.slug}`}
                    prefetch
                    className={HERO_BUTTON}
                  >
                    {/* Its own key: in Spanish the short "Crear regalo", measured to fit a small phone beside the demo button (everywhere else "Crear este regalo"). */}
                    {t("templates.makeHero")}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                  {/*
                   * Its label is the longer of the two, and a pill of a fixed 48px held two rows of it
                   * with 2px to spare above and below ("Abrir demo a pantalla completa" under 360px wide,
                   * the confirming test of 22 Nov 2026). The Spanish label is now short enough for one
                   * row on a 320px phone, and the pill is 48px at least: a label that does wrap (the
                   * system's largest type, a zoomed page) gets its rows centred with room round them.
                   */}
                  <Link
                    href={`/demo/${manifest.slug}`}
                    className={HERO_BUTTON_QUIET}
                  >
                    <Play aria-hidden="true" className="size-3.5 fill-current" />
                    {t("templates.fullscreenDemo")}
                  </Link>
                </div>
                <p className="mt-4 max-w-[31rem] text-sm leading-relaxed text-page-body">
                  {free ? t(noteForEveryone() ? "templates.pagePriceNote" : "templates.pagePriceFree", { price }) : t("templates.pagePricePaid", { price })}
                </p>
                {manifest.slug === "the-letter" ? (
                  // The Letter has a page in Portuguese (content/pt-letter.ts). One quiet line under the price, in
                  // sight as it was before the redesign: it is how a Portuguese visitor finds that page, and
                  // inside the closed block under the questions it was on nobody's screen (tests/e2e/about-and-pt.spec.ts).
                  <p className="text-sm text-page-body">
                    <a href={PT_LETTER_PATH} hrefLang={PT_LETTER_LANG} lang={PT_LETTER_LANG} className="inline-flex min-h-11 items-center underline decoration-page-line underline-offset-4 hover:text-page-ink">
                      Também em português: carta digital
                    </a>
                  </p>
                ) : null}
              </div>

              <div className="order-last lg:mt-10">
                <h2 className="text-page-label text-page-body">{t(note ? "templates.includedSpecial" : "templates.included")}</h2>
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
             * Below `lg` the words are above and below it, so nearly the whole picture is kept clear
             * of them. From `lg` it has the left column: its leaves run into the section's own
             * padding, and it sits left of centre, by less on a wider screen, so its right-hand
             * lilies stop short of the words and its left-hand one is not lost off the page. Between
             * 1024 and 1280 the two columns used to wait for `xl`: the words filled the left half of an
             * iPad on its side, the right half was empty and the phone began under the fold (the test
             * of 21 Nov 2026). The phone is drawn smaller there, by the same share of the screen.
             * `sizes` says how wide the picture is drawn, except on a phone, where it says far less
             * than the 758px it is (hero-flatlay.tsx says why): the half-size files are a phone's.
             */}
            <div className={HERO_PHONE_BOX}>
              <HeroFlatlay slug={manifest.slug} name={manifest.name[l]} locale={l} art={heroArt} preview={manifest.thumbnail.webm} frame={{ from: templateFilmStart(manifest.slug) }} width="var(--hero-phone)" up="var(--fl-up)" down="var(--fl-down)" sizes={HERO_SIZES} className={HERO_PHONE_PLACE} />
            </div>
          </div>
        </section>

        <HowToSend
          locale={l}
          heading={seo?.howTo ?? t("templates.guide.heading", { name: manifest.name[l] })}
          flowers={flowers}
          steps={steps}
          lines={samples.lines}
          source={samples.source}
          photo={samples.photo}
          poster={manifest.thumbnail.poster}
        />
        {guide ? <WhatToWrite manifest={manifest} locale={l} guide={guide} flowers={flowers} /> : null}
        <Experience manifest={manifest} locale={l} flowers={flowers} photo={samples.photo} line={steps?.line[l] ?? null} note={note} />
        <Questions manifest={manifest} locale={l} faq={faq} guide={guide} about={about.rest} />
        <MoreLikeThis manifest={manifest} locale={l} flowers={flowers} />
      </div>
    </>
  );
}
