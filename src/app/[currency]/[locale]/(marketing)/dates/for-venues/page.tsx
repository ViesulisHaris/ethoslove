import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { FOR_VENUES, FOR_VENUES_PATH } from "@/content/for-venues";
import { ideaImage } from "@/lib/dates/art";
import { ideaById } from "@/lib/dates/ideas";
import { pageMetadata } from "@/lib/seo";
import { DateFoot, DateHero, DatePage, DateSpread } from "@/components/dates/page/date-page";
import { FeaturedLabel } from "@/components/dates/featured-label";
import { TONIGHT_BUTTON } from "@/components/dates/tonight/tonight-form";
import { IdeasDots } from "@/components/templates/page/ideas-dots";

/** The idea whose picture the hero shows: dinner and a walk, the date a venue is most often part of. */
const HERO_IDEA = "pasta-and-a-slow-walk";
const mailto = `mailto:${BRAND.supportEmail}?subject=Featured%20date`;

export async function generateMetadata({ params }: PageProps<"/[currency]/[locale]/dates/for-venues">): Promise<Metadata> {
  const { locale } = await params;
  const copy = FOR_VENUES[locale === "es" ? "es" : "en"];
  // Not indexed until the owner says otherwise (BRIEF-dates2.md 5); not in the sitemap either.
  return { ...pageMetadata({ locale, path: FOR_VENUES_PATH, title: copy.title, description: copy.description }), robots: { index: false, follow: true } };
}

/**
 * For venues: what a featured date is, that it is always marked, and the address to write to. No
 * price and no number of any kind: the owner sets the price. Linked once, quietly, from /dates.
 */
export default async function ForVenuesPage({ params }: PageProps<"/[currency]/[locale]/dates/for-venues">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const copy = FOR_VENUES[l];
  const td = await getTranslations("dates");
  const hero = ideaById(HERO_IDEA)!;

  return (
    <DatePage>
      <DateHero label={copy.label} heading={copy.heading} line={copy.line} sentence={copy.sentence} picture={{ src: ideaImage(hero.id), from: hero.art.from, to: hero.art.to }} note={hero.title[l]}>
        <a href={mailto} className={TONIGHT_BUTTON}>
          <Mail aria-hidden="true" className="size-4" />
          {copy.write}
        </a>
      </DateHero>

      {/* Deep at its foot on a desk, as the questions spread is: the last band's lily lies across the edge into this space. */}
      <DateSpread id="what-title" label={copy.whatLabel} heading={copy.whatHeading} line={copy.whatLine} className="py-12 sm:py-16 lg:pt-20 lg:pb-64">
        <p className="mb-5 flex flex-wrap items-center gap-2.5 text-[0.9375rem] text-page-body">
          {copy.looks}
          <FeaturedLabel label={td("featured.label")} />
        </p>
        <ul id="venues-what" className="-mx-5 flex snap-x snap-mandatory scroll-px-5 items-stretch gap-5 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {copy.cards.map((card) => (
            <li key={card} className="w-full shrink-0 snap-start rounded-[1.25rem] border border-page-line bg-page-raised p-5 shadow-page-card sm:w-auto">
              <p className="font-display text-[1.25rem] leading-[1.18] text-page-ink">{card}</p>
            </li>
          ))}
        </ul>
        <IdeasDots target="venues-what" count={copy.cards.length} className="mt-4 sm:hidden" />
      </DateSpread>

      <DateFoot id="contact-title" label={copy.contactLabel} heading={copy.contactHeading} line={copy.contactLine}>
        <a href={mailto} className="inline-flex min-h-11 items-center gap-2.5 font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-tight break-all text-page-ink underline decoration-page-line underline-offset-[6px] transition-colors hover:decoration-page-ink">
          {BRAND.supportEmail}
        </a>
      </DateFoot>
    </DatePage>
  );
}
