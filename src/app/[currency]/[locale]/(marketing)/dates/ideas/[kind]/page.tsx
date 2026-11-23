import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { CITY_KIND_COPY, DATE_KIND_COPY, DATE_KIND_SHARED_FAQ, DATE_KIND_UI, KIND_PAGE_CITIES } from "@/content/date-kinds";
import { CITY_PAGES, cityName, getCity } from "@/lib/cities/cities";
import { hoursOf, ideaListNode } from "@/lib/cities/copy";
import { ideaImage } from "@/lib/dates/art";
import { DATE_KINDS, getDateKind, isCityKindPage, kindIdeas } from "@/lib/dates/date-kinds";
import { ideaById } from "@/lib/dates/ideas";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { DateFoot, DateHero, DatePage, DateQuestions, DateSpread, QUIET_ROW_LINK } from "@/components/dates/page/date-page";
import { KindIdeas } from "@/components/dates/page/kind-ideas";
import { KindLinks } from "@/components/dates/page/kind-links";
import { KindView } from "@/components/dates/page/kind-view";
import { DATE_CARDS_ART } from "@/components/dates/page/placements";
import { TONIGHT_BUTTON } from "@/components/dates/tonight/tonight-form";
import { TonightIsland } from "@/components/dates/tonight/tonight-island";

/** Built for every kind with a page; any other slug is a 404 (notFound below). */
export function generateStaticParams() {
  return DATE_KINDS.map((kind) => ({ kind }));
}

type Props = PageProps<"/[currency]/[locale]/dates/ideas/[kind]">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale, kind: slug } = await params;
  const kind = getDateKind(slug);
  const copy = kind ? DATE_KIND_COPY[kind] : undefined;
  if (!kind || !copy) return {};
  const l = locale === "es" ? "es" : "en";
  return pageMetadata({ locale, path: `/dates/ideas/${kind}`, title: copy.title[l].replace("{count}", String(kindIdeas(kind).length)), description: copy.description[l] });
}

/**
 * Date ideas of one kind (first date, fun, cheap and free, romantic, double date, winter, rainy
 * day), for the people searching for exactly that: the ideas that honestly fit, each as a picture
 * card that opens to why it fits and its twist, the one-step planner set to the kind, and the city
 * pages that fill the same ideas with real places. No city: the visitor says where.
 */
export default async function DateKindPage({ params }: Props) {
  const { locale, kind: slug } = await params;
  const kind = getDateKind(slug);
  const copy = kind ? DATE_KIND_COPY[kind] : undefined;
  if (!kind || !copy) notFound();
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const td = await getTranslations("dates");
  const tc = await getTranslations("cities");
  const ui = DATE_KIND_UI[l];
  const url = localizedUrl(locale, `/dates/ideas/${kind}`);
  const ideas = kindIdeas(kind);
  const hero = ideaById(copy.hero)!;
  const faq = [...copy.faq, ...DATE_KIND_SHARED_FAQ].map((x) => ({ q: x.q[l], a: x.a[l] }));
  const cities = KIND_PAGE_CITIES.flatMap((s) => getCity(s) ?? []);

  return (
    <>
      <JsonLd
        nodes={[
          ideaListNode({ name: copy.heading[l], url, ideas, locale: l }),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: ui.eyebrow, url: localizedUrl(locale, "/dates") },
            { name: copy.heading[l], url },
          ]),
          faqNode(faq),
        ]}
      />
      <KindView kind={kind} />
      <DatePage>
        <DateHero label={ui.eyebrow} heading={copy.heading[l]} line={copy.line[l]} sentence={copy.sentence[l]} picture={{ src: ideaImage(hero.id), from: hero.art.from, to: hero.art.to }} note={hero.title[l]}>
          <a href="#tonight" className={TONIGHT_BUTTON}>
            {ui.planButton}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </DateHero>

        <DateSpread id="tonight-title" sectionId="tonight" label={ui.tonightLabel} heading={ui.tonightHeading} line={ui.tonightLine} art={DATE_CARDS_ART}>
          <TonightIsland kind={kind} mapHref="/dates" />
        </DateSpread>

        <KindIdeas
          kind={kind}
          locale={l}
          card={(idea) => ({ idea, fit: copy.fits[idea.id][l], href: `/dates?idea=${idea.id}` })}
          labels={{ twist: ui.twist, plan: ui.planNear, hours: (idea) => td("ideas.hours", { hours: hoursOf(idea.minutes, l) }), budget: (idea) => td(`ideas.budget.${idea.budget}`) }}
        />

        <DateQuestions id="questions-title" name={kind} label={ui.questionsLabel} heading={ui.questionsHeading} line={ui.questionsLine} faq={faq} />

        <DateFoot id="cities-title" label={ui.citiesLabel} heading={ui.citiesHeading} line={ui.citiesLine}>
          <ul className="flex flex-wrap gap-x-6 leading-8">
            {cities.map((city) => (
              <li key={city.slug}>
                {isCityKindPage(city.slug, kind) ? (
                  <Link href={`/dates/${city.slug}/${kind}`} className={QUIET_ROW_LINK}>
                    {CITY_KIND_COPY[`${city.slug}/${kind}`].heading[l]}
                  </Link>
                ) : (
                  <Link href={`/dates/${city.slug}`} className={QUIET_ROW_LINK}>
                    {tc("title", { city: cityName(city, l) })}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <Link href="/dates" className={`${QUIET_ROW_LINK} font-medium`}>
                {ui.allCities.replace("{count}", String(CITY_PAGES.length))}
              </Link>
            </li>
          </ul>
          <KindLinks
            locale={l}
            title={ui.kindsNav}
            skip={kind}
            className="mt-8 border-t border-page-line pt-5"
            titleClassName="text-page-label text-page-body"
            linkClassName="mr-5 inline-flex min-h-11 items-center text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink"
          />
        </DateFoot>
      </DatePage>
    </>
  );
}
