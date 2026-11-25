import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { PRODUCTS, chargedCurrency, formatAmount, type Currency } from "@/lib/pricing/products";
import { NOTE_PHOTOS_MAX, sendsFree } from "@/lib/gift/free-tier";
import { DIGITAL_CARDS_BAND_PHOTO, DIGITAL_CARDS_LEAD, DIGITAL_CARDS_PATH, DIGITAL_CARDS_REF, digitalCardsCopy, finderIsBuilt, type DigitalCardsFacts } from "@/content/digital-cards";
import { DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { GIFT_GUIDES, GUIDES_IN_CLOSING_ROWS } from "@/content/gift-guides";
import { templateGuide } from "@/content/template-guides";
import { getManifest, listManifests } from "@/templates/manifests";
import { CARDS_ART, PRICES_ART, STEPS_ART } from "@/components/marketing/spread/placements";
import { IdeaCards, MoreRow, QUIET_LINK, QuestionsSpread, SITE_FLOWERS, SiteHero, SitePage, Spread, WhereNext, type IdeaCard } from "@/components/marketing/spread/sections";
import { JsonLd } from "@/components/shared/json-ld";
import { pricingGifts } from "@/components/pricing/free-gifts";
import { ArtLayer } from "@/components/templates/page/art";
import { HERO_BUTTON } from "@/components/templates/page/hero-art";
import { Band, BandWords, ExperienceFlatlay, HowToSend, Intro, templateSamples } from "@/components/templates/page/sections";

/** Where "See full pricing" lands: the single gifts' own section of the pricing page (components/pricing/single-gifts.tsx, `id="gifts"`). */
const PRICING_GIFTS = "/pricing#gifts";

/** What the copy reads from the code: the prices in this page's currency, written the locale's way, the counts, and whether the finder is there to link to. */
function facts(currency: Currency, locale: string): DigitalCardsFacts {
  const price = (id: "single" | "pick3" | "everything" | "extras" | "photos") => formatAmount(PRODUCTS[id].amounts[currency], currency, locale);
  return {
    single: price("single"),
    pick3: price("pick3"),
    everything: price("everything"),
    extras: price("extras"),
    photos: price("photos"),
    notePhotos: NOTE_PHOTOS_MAX,
    count: listManifests().length,
    // Everything's row counts as /pricing's Everything card does ("All 60 paid gifts"), one tap away through "See full pricing".
    paid: pricingGifts(listManifests()).paid.length,
    ideas: DIGITAL_GIFT_IDEAS.length,
    finder: finderIsBuilt(),
  };
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/digital-cards">, "searchParams">): Promise<Metadata> {
  const { currency, locale } = await params;
  const copy = digitalCardsCopy(locale as GiftLocale, facts(chargedCurrency(currency), locale));
  return pageMetadata({ locale, path: DIGITAL_CARDS_PATH, title: copy.title, description: copy.description });
}

/**
 * What a digital card is, laid out as a gift's own page is (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md): the hero with a card playing in the phone, the five kinds as five picture
 * cards in a row, how one gets made in three pictures, the band that tells it from an e-card and a
 * voucher, three prices, the questions and where to go next. The one page that carries the
 * category line, as the small label of its heading. Everything the first version said in
 * paragraphs is still in the HTML, in closed <details>: each kind in full inside its card, the rest
 * under the questions.
 */
export default async function DigitalCardsPage({ params }: PageProps<"/[currency]/[locale]/digital-cards">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations("recipients");
  const copy = digitalCardsCopy(l, facts(chargedCurrency(currency), locale));
  const url = localizedUrl(locale, DIGITAL_CARDS_PATH);
  const kinds = copy.kinds.items.flatMap((kind) => {
    const manifest = getManifest(kind.template);
    return manifest ? [{ ...kind, manifest, also: kind.also.flatMap((slug) => getManifest(slug) ?? []) }] : [];
  });
  // The card in the hero's phone, and in the pictures of how one is made: the first kind's, The Letter.
  const lead = getManifest(DIGITAL_CARDS_LEAD) ?? kinds[0].manifest;
  const samples = await templateSamples(lead.slug, l, templateGuide(lead.slug, l));
  const cards: IdeaCard[] = kinds.map((kind) => ({
    manifest: kind.manifest,
    title: kind.title,
    line: kind.brief,
    full: kind.body,
    also: kind.also,
    make: `/create/${kind.template}?ref=${DIGITAL_CARDS_REF}`,
    free: sendsFree(kind.manifest),
  }));
  // The pages by kind: four as posters, each shown by the gift it leads with, the rest by name.
  const pages = GUIDES_IN_CLOSING_ROWS.flatMap((slug) => {
    const guide = GIFT_GUIDES[slug][l];
    const manifest = getManifest(GIFT_GUIDES[slug].en.film ?? guide.ideas[0].template);
    return manifest ? [{ href: `/gifts/${slug}`, label: guide.label, manifest }] : [];
  });

  return (
    <ClientMessages scope="(marketing)/digital-cards/page" locale={locale}>
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: copy.kinds.heading,
            itemListElement: kinds.map((kind, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: kind.title,
              url: localizedUrl(locale, `/templates/${kind.template}`),
            })),
          },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: copy.breadcrumb, url },
          ]),
          faqNode(copy.faq.items),
        ]}
      />
      <SitePage name="digital-cards">
        <div data-testid="digital-cards">
          {/* The category line, then what it means: one heading, both read, as on a gift's page. */}
          <SiteHero manifest={lead} locale={l} label={copy.eyebrow} heading={copy.h1} line={copy.hero.line} sentence={copy.hero.sentence}>
            <Link href="/templates" className={HERO_BUTTON}>
              {copy.browse}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </SiteHero>

          {/* The five kinds stand in one row across the page, under their heading: five in the spread's right column would be too narrow to open. */}
          <section className="relative" aria-labelledby="kinds">
            <ArtLayer items={CARDS_ART} flowers={SITE_FLOWERS} />
            <div className="container-x relative pt-4 pb-16 sm:pb-20 lg:pt-6 lg:pb-28">
              <Intro id="kinds" label={copy.kinds.label} heading={copy.kinds.heading} />
              <div className="mt-9 lg:mt-12" data-kinds>
                <IdeaCards id="card-kinds" cards={cards} locale={l} columns={5} labels={{ make: copy.kinds.make, watch: copy.kinds.watch, free: t("free"), also: copy.kinds.also, full: copy.kinds.full }} />
              </div>
            </div>
          </section>

          <HowToSend locale={l} heading={copy.steps.heading} flowers={SITE_FLOWERS} art={STEPS_ART} steps={null} lines={samples.lines} source={samples.source} photo={samples.photo} poster={lead.thumbnail.poster} />

          {/* A photo of its own in the band's polaroid: the first step's picture, a few lines up, already shows the card's first sample photo. */}
          <Band labelledBy="not-the-same" picture={<ExperienceFlatlay flowers={SITE_FLOWERS} photo={DIGITAL_CARDS_BAND_PHOTO} />}>
            <BandWords id="not-the-same" label={copy.band.label} heading={copy.band.heading} line={copy.band.line} checks={copy.band.checks} />
          </Band>

          <Spread
            id="cost"
            label={copy.cost.label}
            heading={copy.cost.heading}
            line={copy.cost.line}
            art={PRICES_ART}
            className="pt-16 pb-4 sm:pt-20 lg:pt-28"
            intro={
              // To the cards' own prices: the top of /pricing is the dates membership, another product at another price.
              <Link href={PRICING_GIFTS} data-testid="full-pricing" className={`${QUIET_LINK} mt-3 gap-1.5`}>
                {copy.cost.more}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            }
          >
            <ul className="grid gap-3 self-start sm:grid-cols-3 sm:gap-4" data-testid="card-prices">
              {copy.cost.shown.map((row) => (
                <li key={copy.cost.rows[row].label} className="flex items-baseline justify-between gap-4 rounded-[1.25rem] border border-page-line bg-page-raised px-6 py-5 shadow-page-card sm:block sm:pt-6 sm:pb-7">
                  <h3 className="font-display text-[1.0625rem] leading-snug text-page-ink">{copy.cost.rows[row].label}</h3>
                  <p data-price className="font-display text-[1.75rem] leading-none tracking-[-0.02em] text-page-ink tabular-nums sm:mt-5 sm:text-[2.125rem]">
                    {copy.cost.rows[row].price}
                  </p>
                </li>
              ))}
            </ul>
          </Spread>

          <QuestionsSpread id="questions" name="faq-digital-cards" label={copy.faq.label} heading={copy.faq.heading} faq={copy.faq.items}>
            <MoreRow summary={copy.steps.more}>
              <ol className="flex flex-col gap-3">
                {copy.steps.items.map((step) => (
                  <li key={step.title}>
                    <span className="text-page-ink">{step.title}.</span> {step.body}
                  </li>
                ))}
              </ol>
            </MoreRow>
            <MoreRow summary={copy.cost.includes}>
              <p>{copy.cost.lead}</p>
              <dl className="flex flex-col gap-1.5" data-testid="card-prices-all">
                {copy.cost.rows.map((row) => (
                  <div key={row.label}>
                    <dt className="inline text-page-ink">
                      {row.label}, <span data-price>{row.price}</span>.
                    </dt>{" "}
                    <dd className="inline">{row.note}</dd>
                  </div>
                ))}
              </dl>
            </MoreRow>
            <MoreRow summary={copy.compare.about}>
              <p>{copy.definition}</p>
              <p>{copy.kinds.lead}</p>
              <p className="text-page-ink">{copy.compare.heading}</p>
              <dl className="flex flex-col gap-1.5">
                {copy.compare.rows.map((row) => (
                  <div key={row.term}>
                    <dt className="inline text-page-ink">{row.term}.</dt> <dd className="inline">{row.is}</dd>
                  </div>
                ))}
              </dl>
            </MoreRow>
          </QuestionsSpread>

          <WhereNext
            id="onward"
            label={copy.onward.label}
            heading={copy.onward.heading}
            posters={pages.slice(0, 4)}
            locale={l}
            navLabel={copy.onward.heading}
            links={[...copy.onward.links, ...pages.slice(4).map(({ href, label }) => ({ href, label }))]}
          />
        </div>
      </SitePage>
    </ClientMessages>
  );
}
