import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { FOR_VENUES, FOR_VENUES_PATH } from "@/content/for-venues";
import { ideaImage } from "@/lib/dates/art";
import { ideaById } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import { pageMetadata } from "@/lib/seo";
import { DateFoot, DateHero, DatePage, DateSpread } from "@/components/dates/page/date-page";
import { FeaturedLabel } from "@/components/dates/featured-label";
import { TONIGHT_BUTTON } from "@/components/dates/tonight/tonight-form";

/** The picture of the hero and of the sample card: dinner, the date a venue is most often part of. */
const HERO_IDEA = "pasta-and-a-slow-walk";
const mailto = (subject: string) => `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}`;

export async function generateMetadata({ params }: PageProps<"/[currency]/[locale]/dates/for-venues">): Promise<Metadata> {
  const { locale } = await params;
  const copy = FOR_VENUES[locale === "es" ? "es" : "en"];
  // Not indexed until the owner says otherwise (BRIEF-dates2.md 5); not in the sitemap either.
  return { ...pageMetadata({ locale, path: FOR_VENUES_PATH, title: copy.title, description: copy.description }), robots: { index: false, follow: true } };
}

/**
 * For venues: what a featured date is, that it is always marked, and the address to write to. No
 * price and no number of any kind: the owner sets the price. Linked once, quietly, from /dates.
 * The sample card is drawn as a place card is in the Dates list (components/dates/place-card.tsx),
 * named "Your venue": it shows the label at its real size and invents no place.
 */
export default async function ForVenuesPage({ params }: PageProps<"/[currency]/[locale]/dates/for-venues">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const copy = FOR_VENUES[l];
  const td = await getTranslations("dates");
  const hero = ideaById(HERO_IDEA)!;
  const href = mailto(copy.subject);

  return (
    <DatePage>
      <DateHero label={copy.label} heading={copy.heading} line={copy.line} sentence={copy.sentence} picture={{ src: ideaImage(hero.id), from: hero.art.from, to: hero.art.to }}>
        <a href={href} className={TONIGHT_BUTTON}>
          <Mail aria-hidden="true" className="size-4" />
          {copy.write}
        </a>
      </DateHero>

      {/* Deep at its foot on a desk: the last band's lily lies across the edge into this space, and with
          less than the questions spread's 11rem it reached the line beside the card (page-design D1). */}
      <DateSpread id="what-title" label={copy.whatLabel} heading={copy.whatHeading} line={copy.whatLine} className="py-12 sm:py-16 lg:pt-20 lg:pb-64">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
          <figure aria-label={copy.whatHeading} className="flex items-stretch gap-3.5 rounded-[22px] bg-page-raised p-2.5 shadow-page-card ring-1 ring-page-line">
            <span className="block size-[92px] shrink-0 overflow-hidden rounded-[16px] sm:size-[104px]" style={{ background: `linear-gradient(160deg, ${hero.art.from} 0%, ${hero.art.to} 100%)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the file the hero above already loaded */}
              <img src={ideaImage(hero.id)} alt="" width={208} height={208} loading="lazy" decoding="async" className="block size-full object-cover" />
            </span>
            <figcaption className="flex min-w-0 flex-1 flex-col justify-center py-1">
              <span className="text-sm font-semibold text-page-body">{KINDS.restaurant.label[l]}</span>
              <span className="mt-0.5 font-display text-[19px] leading-[1.12] text-page-ink">{copy.sample}</span>
              <FeaturedLabel label={td("featured.label")} className="mt-1.5 self-start" />
            </figcaption>
          </figure>
          <ul className="border-t border-page-line">
            {copy.rules.map((rule) => (
              <li key={rule} className="flex min-h-11 items-center border-b border-page-line py-2.5 text-[0.9375rem] text-page-ink">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </DateSpread>

      <DateFoot id="contact-title" label={copy.contactLabel} heading={copy.contactHeading} line={copy.contactLine}>
        <a href={href} className="inline-flex min-h-11 items-center gap-2.5 font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-tight break-all text-page-ink underline decoration-page-line underline-offset-[6px] transition-colors hover:decoration-page-ink">
          {BRAND.supportEmail}
        </a>
      </DateFoot>
    </DatePage>
  );
}
