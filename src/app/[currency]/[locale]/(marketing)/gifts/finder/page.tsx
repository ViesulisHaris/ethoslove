import type { Metadata } from "next";
import { Plus, ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OCCASIONS } from "@/config/occasions";
import { SITE } from "@/config/site";
import { FINDER_COPY, FINDER_PATH, finderPicks } from "@/content/finder";
import { RECIPIENTS, recipientSlug } from "@/content/recipients";
import { DEFAULT_PAGE_THEME, pageThemeChromeCss, pageThemeStyle } from "@/content/template-page-themes";
import { finderWaitScript } from "@/lib/gift/finder";
import type { GiftLocale } from "@/lib/gift/schema";
import { PRODUCTS, chargedCurrency, formatAmount } from "@/lib/pricing/products";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { GiftFinder } from "@/components/templates/gift-finder";
import { ArtLayer, BandEdge } from "@/components/templates/page/art";
import { FINDER_ART, FINDER_FOOT_ART } from "@/components/templates/page/placements";
import { Intro, SPREAD } from "@/components/templates/page/spread";

type Props = PageProps<"/[currency]/[locale]/gifts/finder">;

/**
 * The second question leads with whatever is in season (Christmas from 15 Nov), decided by the day
 * the page is rendered with. The page is static, so it is rendered again every hour: the season
 * turns by itself, without a deploy.
 */
export const revalidate = 3600;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const copy = FINDER_COPY[locale === "es" ? "es" : "en"];
  // One address whatever the answers: pageMetadata's canonical is the bare path, and the answers ride in the query.
  return pageMetadata({ locale, path: FINDER_PATH, title: copy.title, description: copy.description });
}

/** The key of this page's colours on <body> (content/template-page-themes.ts, pageThemeChromeCss). */
const THEME = "finder";

/** A quiet link in a row or a sentence: underlined, and a thumb's target by its padding, so rows of them sit 32px apart. */
const QUIET_LINK = "py-[0.8125rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";

/**
 * The gift finder, laid out as a gift's page is (docs/marketing/growth-build/DESIGN-LESS-TEXT.md):
 * a spread with the heading and one line on the left and the tool's picture cards on the right
 * (components/templates/gift-finder.tsx), then a band with one row of links to the pages that
 * start from a person, and one closed block that keeps, for a reader who wants it and for a search
 * engine, how the finder picks and the pages that start from a day. The site's own palette and
 * blush flowers: this is not a gift's page, so it takes no gift's colours.
 *
 * The page is static and never reads its query: the answers are read in the browser. Only this
 * language's words, and each template's fit (content/finder.ts), go to it.
 */
export default async function GiftFinderPage({ params }: Props) {
  const { currency: shown, locale } = await params;
  setRequestLocale(locale);
  const l: GiftLocale = locale === "es" ? "es" : "en";
  const copy = FINDER_COPY[l];
  const t = await getTranslations();
  const count = listManifests().length;
  const currency = chargedCurrency(shown);
  // A pick's price is its own: most are sold as one template, and a free template with no free version left as "Make it special".
  const prices = { single: formatAmount(PRODUCTS.single.amounts[currency], currency, l), extras: formatAmount(PRODUCTS.extras.amounts[currency], currency, l) };
  const theme = DEFAULT_PAGE_THEME;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("recipients.breadcrumb"), url: localizedUrl(locale, "/gifts") },
            { name: copy.eyebrow, url: localizedUrl(locale, FINDER_PATH) },
          ]),
        ]}
      />
      {/* The footer, the header's button and the ground behind them take the page's colours while it is open. */}
      <style>{pageThemeChromeCss(THEME, theme)}</style>
      {/* -mt/pt: the page's ground runs up under the floating header, as a gift's page does. */}
      <div data-page-theme={THEME} style={pageThemeStyle(theme)} className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
        <section className="relative" aria-labelledby="finder-title">
          <ArtLayer items={FINDER_ART} flowers={theme.flowers} />
          {/*
           * Tall enough, on a desk, for the lily that lies under the words (FINDER_FOOT_ART) whichever
           * question is open: the second has fewer cards than the first, and the section must not
           * shrink onto the flower. On a phone the words are kept short of a third of the screen, so
           * a whole question is on it.
           */}
          <div className={cn(SPREAD, "gap-y-4 pt-3 pb-24 sm:gap-y-9 sm:pt-10 lg:min-h-[40rem] lg:content-start lg:items-start lg:pt-14 lg:pb-32")}>
            {/*
             * The way round the finder is always in view (the owner, 22 Nov 2026: "there should always be
             * a button browse all… so the finder isnt obligatory"). On a desk it is a button under the
             * words; on a phone it sits on the label's own line, at the right, so a whole question
             * still fits the first screen.
             */}
            <div className="relative">
              <Intro level={1} id="finder-title" label={copy.eyebrow} heading={copy.h1} line={copy.line}>
                <Link
                  href="/templates"
                  data-finder-browse
                  className="group absolute -top-3 right-0 inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-medium text-page-ink lg:static lg:mt-7 lg:h-12 lg:rounded-full lg:border lg:border-page-ink/25 lg:px-6 lg:text-[0.9375rem] lg:transition-colors lg:hover:border-page-ink"
                >
                  <span className="underline decoration-page-line underline-offset-4 lg:no-underline">{copy.browse.replace("{count}", String(count))}</span>
                  <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Intro>
            </div>
            {/*
             * A link that already carries answers must not flash the first question before its picks: the
             * script marks this column (FINDER_WAIT, lib/gift/finder.ts) before anything paints, the tool
             * stays unseen while it is marked, and unmarks it once it has read the address. The mark
             * is not in the server's HTML, hence suppressHydrationWarning.
             */}
            <div className="group/finder min-w-0 lg:pt-7" suppressHydrationWarning>
              <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: finderWaitScript() }} />
              <div className="group-data-finder-wait/finder:invisible">
                <GiftFinder picks={finderPicks(l)} ui={copy.ui} freeLabel={t("common.free")} prices={prices} locale={l} today={today} />
              </div>
            </div>
          </div>
        </section>

        <section className="relative" aria-labelledby="finder-people">
          <BandEdge side="top" className="text-page-raised" />
          <div className="relative -mt-px bg-page-raised">
            <ArtLayer items={FINDER_FOOT_ART} flowers={theme.flowers} />
            <div className={cn(SPREAD, "pt-12 pb-20 sm:pb-24 lg:pt-16 lg:pb-28")}>
              <Intro id="finder-people" label={copy.byWho.label} heading={copy.byWho.heading} />
              <div className="min-w-0 lg:pt-7">
                {/* One row of quiet links: nothing to read, and the seven pages a crawler should find from here. */}
                <ul className="flex flex-wrap gap-x-6 leading-8">
                  {RECIPIENTS.map((r) => (
                    <li key={r}>
                      <Link href={`/gifts/${recipientSlug(r)}`} className={QUIET_LINK}>
                        {copy.byWho.people[r]}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/templates" className={cn(QUIET_LINK, "font-medium")}>
                      {copy.byWho.all.replace("{count}", String(count))}
                    </Link>
                  </li>
                </ul>

                {/*
                 * How the finder picks was three paragraphs on the page (the owner, 21 Nov 2026: "no one's
                 * reading all that"). It is one closed block now, a native <details>, so the words are
                 * still in the HTML; the pages that start from a day are a sentence of links inside it.
                 */}
                <details data-finder-how className="group mt-8 border-y border-page-line">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-body [&::-webkit-details-marker]:hidden">
                    {copy.how.title}
                    <Plus aria-hidden="true" className="size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45" strokeWidth={1.6} />
                  </summary>
                  <div data-reveal className="max-w-2xl pr-8 pb-5 text-[0.9375rem] leading-relaxed text-page-body">
                    {copy.how.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mb-3">
                        {paragraph.replace("{count}", String(count))}
                      </p>
                    ))}
                    <p className="leading-8">
                      {copy.how.byDay}{" "}
                      {OCCASIONS.map((o, i) => (
                        <span key={o}>
                          {i > 0 ? ", " : null}
                          <Link href={`/occasions/${o}`} className={QUIET_LINK}>
                            {t(`occasions.${o}`)}
                          </Link>
                        </span>
                      ))}
                      .
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
