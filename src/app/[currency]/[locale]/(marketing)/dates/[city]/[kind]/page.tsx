import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { CITY_KIND_COPY, DATE_KIND_COPY, DATE_KIND_SHARED_FAQ, DATE_KIND_UI } from "@/content/date-kinds";
import { cityMapHref, cityName, getCity, mapHref } from "@/lib/cities/cities";
import { hoursOf, ideaListNode, placeListNode } from "@/lib/cities/copy";
import { cityIdeaScore, cityIdeaStops } from "@/lib/cities/ideas";
import { kindPlaces } from "@/lib/cities/kind-places";
import { loadCityPlaces } from "@/lib/cities/load";
import { CITY_RADIUS_M } from "@/lib/cities/places";
import { ideaImage } from "@/lib/dates/art";
import { CITY_KIND_PAGES, getDateKind, isCityKindPage, kindIdeas } from "@/lib/dates/date-kinds";
import { IDEAS, ideaById } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { DateFoot, DateHero, DatePage, DateQuestions, DateSpread, QUIET_ROW_LINK } from "@/components/dates/page/date-page";
import { KindIdeas } from "@/components/dates/page/kind-ideas";
import { KindLinks } from "@/components/dates/page/kind-links";
import { KindView } from "@/components/dates/page/kind-view";
import { DATE_CARDS_ART } from "@/components/dates/page/placements";
import { TONIGHT_BUTTON } from "@/components/dates/tonight/tonight-form";
import { TonightIsland } from "@/components/dates/tonight/tonight-island";

/**
 * Like its city's page it reads the map's tiles, so it is built on the first visit and kept a
 * week, never at build time. Only four pairs exist (lib/dates/date-kinds.ts, CITY_KIND_PAGES):
 * every other city and kind is a 404.
 */
export const revalidate = 604800;
export const dynamicParams = true;
export const maxDuration = 20;
export function generateStaticParams(): { city: string; kind: string }[] {
  return [];
}

type Props = PageProps<"/[currency]/[locale]/dates/[city]/[kind]">;

/** "Cheap Date Ideas" as a link among sentence-case ones: "Cheap date ideas". The phrases name no proper nouns. */
const sentenceCase = (phrase: string): string => phrase.charAt(0) + phrase.slice(1).toLowerCase();

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale, city: citySlug, kind: kindSlug } = await params;
  const city = getCity(citySlug);
  const kind = getDateKind(kindSlug);
  if (!city || !kind || !isCityKindPage(city.slug, kind)) return {};
  const l = locale === "es" ? "es" : "en";
  const pair = CITY_KIND_COPY[`${city.slug}/${kind}`];
  return pageMetadata({ locale, path: `/dates/${city.slug}/${kind}`, title: pair.title[l], description: pair.description[l] });
}

/**
 * One kind of date in one city, only where people search for exactly that (New York and London,
 * cheap and first dates): the kind's ideas filled with that city's real places, the planner set to
 * the kind and the city, and that city's places for the kind (free to walk into, or where to meet),
 * which the city's own page does not list.
 */
export default async function CityKindPage({ params }: Props) {
  const { locale, city: citySlug, kind: kindSlug } = await params;
  const city = getCity(citySlug);
  const kind = getDateKind(kindSlug);
  if (!city || !kind || !isCityKindPage(city.slug, kind)) notFound();
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const td = await getTranslations("dates");
  const tc = await getTranslations("cities");
  const ui = DATE_KIND_UI[l];
  const copy = DATE_KIND_COPY[kind]!;
  const pair = CITY_KIND_COPY[`${city.slug}/${kind}`];
  const name = cityName(city, l);
  const url = localizedUrl(locale, `/dates/${city.slug}/${kind}`);
  const ideas = kindIdeas(kind);
  const found = await loadCityPlaces(city.slug, l);
  const stops = cityIdeaStops(ideas, found?.places ?? []);
  const places = found ? kindPlaces(kind, found.places) : [];
  const hero = ideaById(pair.hero ?? copy.hero)!;
  const faq = [...copy.faq, ...DATE_KIND_SHARED_FAQ].map((x) => ({ q: x.q[l], a: x.a[l] }));
  const km = (CITY_RADIUS_M / 1000).toLocaleString(l);
  const other = CITY_KIND_PAGES.find((p) => p.city === city.slug && p.kind !== kind);
  const placesWords = kind === "cheap" ? { label: ui.freePlacesLabel, heading: ui.freePlacesHeading, line: ui.freePlacesLine } : { label: ui.meetLabel, heading: ui.meetHeading, line: ui.meetLine };

  return (
    <>
      <JsonLd
        nodes={[
          ideaListNode({ name: pair.heading[l], url, ideas, locale: l }),
          ...(places.length > 0 ? [placeListNode({ name: placesWords.heading, url, places })] : []),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: ui.eyebrow, url: localizedUrl(locale, "/dates") },
            { name: tc("title", { city: name }), url: localizedUrl(locale, `/dates/${city.slug}`) },
            { name: pair.heading[l], url },
          ]),
          faqNode(faq),
        ]}
      />
      <KindView kind={kind} />
      <DatePage>
        <DateHero
          label={`${name} · ${ui.eyebrow}`}
          heading={pair.heading[l]}
          line={pair.line[l]}
          sentence={pair.sentence[l]}
          picture={{ src: ideaImage(hero.id), from: hero.art.from, to: hero.art.to }}
          note={hero.title[l]}
          back={
            <Link href={`/dates/${city.slug}`} className="group -ml-2 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-page-accent underline-offset-4 hover:underline">
              <ArrowLeft aria-hidden="true" className="size-4" />
              {ui.allInCity.replace("{city}", name)}
            </Link>
          }
        >
          <a href="#tonight" className={TONIGHT_BUTTON}>
            {ui.planButton}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </DateHero>

        <DateSpread id="tonight-title" sectionId="tonight" label={ui.tonightLabel} heading={td("tonight.inCity", { city: name })} art={DATE_CARDS_ART}>
          <TonightIsland place={{ lat: city.lat, lng: city.lng, name }} kind={kind} boost={Object.fromEntries(IDEAS.map((idea) => [idea.id, cityIdeaScore(idea, city)]))} mapHref={cityMapHref(city, l)} />
        </DateSpread>

        <KindIdeas
          kind={kind}
          locale={l}
          card={(idea, i) => ({ idea, fit: copy.fits[idea.id][l], stops: stops[i], href: cityMapHref(city, l, idea.id) })}
          labels={{ twist: ui.twist, plan: tc("ideas.onMap"), inCity: tc("ideas.inCity", { city: name }), hours: (idea) => td("ideas.hours", { hours: hoursOf(idea.minutes, l) }), budget: (idea) => td(`ideas.budget.${idea.budget}`) }}
        />

        {places.length > 0 ? (
          <DateSpread id="kind-places-title" label={placesWords.label} heading={placesWords.heading} line={placesWords.line.replace("{km}", km)}>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {places.map((place) => (
                <li key={place.id} className="border-b border-page-line">
                  <a href={mapHref(place, place.name)} className="flex min-h-11 flex-col justify-center py-2.5">
                    <span className="text-[0.9375rem] font-medium text-page-ink">{place.name}</span>
                    <span className="text-sm text-page-body">{KINDS[place.kind].label[l]}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-page-body">{td("places.credit")}</p>
          </DateSpread>
        ) : null}

        <DateQuestions id="questions-title" name={`${city.slug}-${kind}`} label={ui.questionsLabel} heading={ui.questionsHeading} line={ui.questionsLine} faq={faq} />

        <DateFoot id="more-title" label={name} heading={ui.allInCity.replace("{city}", name)}>
          <ul className="flex flex-wrap gap-x-6 leading-8">
            <li>
              <Link href={`/dates/${city.slug}`} className={`${QUIET_ROW_LINK} font-medium`}>
                {tc("title", { city: name })}
              </Link>
            </li>
            <li>
              <Link href={`/dates/ideas/${kind}`} className={QUIET_ROW_LINK}>
                {sentenceCase(copy.phrase[l])}
              </Link>
            </li>
            {other ? (
              <li>
                <Link href={`/dates/${city.slug}/${other.kind}`} className={QUIET_ROW_LINK}>
                  {CITY_KIND_COPY[`${city.slug}/${other.kind}`].heading[l]}
                </Link>
              </li>
            ) : null}
          </ul>
          <KindLinks
            locale={l}
            title={ui.kindsNav}
            className="mt-8 border-t border-page-line pt-5"
            titleClassName="text-page-label text-page-body"
            linkClassName="mr-5 inline-flex min-h-11 items-center text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink"
          />
        </DateFoot>
      </DatePage>
    </>
  );
}
