import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { DATE_KIND_COPY, DATE_KIND_SHARED_FAQ, DATE_KIND_UI, type DateKindUi } from "@/content/date-kinds";
import { cityMapHref, cityName, getCity, mapHref } from "@/lib/cities/cities";
import { hoursOf, ideaListNode, placeListNode } from "@/lib/cities/copy";
import { cityIdeaScore, cityIdeaStops } from "@/lib/cities/ideas";
import { kindPlaces } from "@/lib/cities/kind-places";
import { loadCityPlaces } from "@/lib/cities/load";
import { CITY_RADIUS_M } from "@/lib/cities/places";
import { ideaImageInCity } from "@/lib/dates/art";
import { getDateKind, type DateKind } from "@/lib/dates/date-kinds";
import { pairCopy, pairSentence } from "@/lib/cities/kind-copy";
import { isCityKindPair, kindsOfCity, pairIdeas } from "@/lib/cities/kind-pairs";
import { IDEAS, ideaById } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import { toYmd } from "@/lib/dates/calendar";
import { featuredNow, markFeatured } from "@/lib/dates/featured";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { DateFoot, DateHero, DatePage, DateQuestions, DateSpread, QUIET_ROW_LINK } from "@/components/dates/page/date-page";
import { KindIdeas } from "@/components/dates/page/kind-ideas";
import { KindView } from "@/components/dates/page/kind-view";
import { DATE_CARDS_ART } from "@/components/dates/page/placements";
import { TONIGHT_BUTTON } from "@/components/dates/tonight/tonight-form";
import { TonightIsland } from "@/components/dates/tonight/tonight-island";

/**
 * Like its city's page it reads the map's tiles, so it is built on the first visit and kept a
 * week, never at build time. Only the pairs the data holds exist (lib/cities/kind-pairs.ts):
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

/** Which words head a kind's list of real places (kind-places.ts); double dates have no list. */
const PLACES_WORDS: Partial<Record<DateKind, "freePlaces" | "meet" | "romanticPlaces" | "nightPlaces" | "outdoorPlaces" | "rainyPlaces" | "winterPlaces" | "funPlaces" | "uniquePlaces">> = {
  cheap: "freePlaces",
  "first-date": "meet",
  romantic: "romanticPlaces",
  night: "nightPlaces",
  outdoor: "outdoorPlaces",
  "rainy-day": "rainyPlaces",
  winter: "winterPlaces",
  fun: "funPlaces",
  unique: "uniquePlaces",
};
const placesWords = (ui: DateKindUi, kind: DateKind): { label: string; heading: string; line: string } | null => {
  const key = PLACES_WORDS[kind];
  return key ? { label: ui[`${key}Label`], heading: ui[`${key}Heading`], line: ui[`${key}Line`] } : null;
};

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale, city: citySlug, kind: kindSlug } = await params;
  const city = getCity(citySlug);
  const kind = getDateKind(kindSlug);
  if (!city || !kind || !isCityKindPair(city.slug, kind)) return {};
  const pair = pairCopy(city, kind, locale === "es" ? "es" : "en");
  const meta = pageMetadata({ locale, path: `/dates/${city.slug}/${kind}`, title: pair.title, description: pair.description });
  // A pair with composed words is for the visitor who follows a link from its city: its cards, its
  // questions and its kind's line are the kind's own, shared with every city, so it stays out of the
  // index and the sitemap (dates2-C2). Only the pairs with words of their own are indexed.
  return pair.indexed ? meta : { ...meta, robots: { index: false, follow: true } };
}

/**
 * One kind of date in one city, wherever the city's own list holds six of the kind's ideas
 * (lib/cities/kind-pairs.ts); indexed only where it has words of its own (lib/cities/kind-copy.ts): the kind's ideas in the city's order, filled with that city's real
 * places, the planner set to the kind and the city, and that city's places for the kind, which the
 * city's own page does not list.
 */
export default async function CityKindPage({ params }: Props) {
  const { locale, city: citySlug, kind: kindSlug } = await params;
  const city = getCity(citySlug);
  const kind = getDateKind(kindSlug);
  if (!city || !kind || !isCityKindPair(city.slug, kind)) notFound();
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const td = await getTranslations("dates");
  const tc = await getTranslations("cities");
  const ui = DATE_KIND_UI[l];
  const copy = DATE_KIND_COPY[kind]!;
  const pair = pairCopy(city, kind, l);
  const name = cityName(city, l);
  const url = localizedUrl(locale, `/dates/${city.slug}/${kind}`);
  const ideas = pairIdeas(city, kind);
  const found = await loadCityPlaces(city.slug, l);
  // "Featured" is a label and nothing else (lib/dates/featured.ts): the same places, in the same order.
  const featured = featuredNow(toYmd(new Date()));
  const stops = cityIdeaStops(ideas, markFeatured(found?.places ?? [], featured));
  const sentence = pairSentence(city, kind, l, pair, stops.flatMap((s) => (s ? [s[0].name] : [])));
  const words = placesWords(ui, kind);
  const places = found && words ? markFeatured(kindPlaces(kind, found.places), featured) : [];
  const featuredLabel = td("featured.label");
  const hero = ideaById(pair.hero)!;
  const faq = [...copy.faq, ...DATE_KIND_SHARED_FAQ].map((x) => ({ q: x.q[l], a: x.a[l] }));
  const km = (CITY_RADIUS_M / 1000).toLocaleString(l);
  const others = kindsOfCity(city.slug).filter((k) => k !== kind);

  return (
    <>
      <JsonLd
        nodes={[
          ideaListNode({ name: pair.heading, url, ideas, locale: l }),
          ...(places.length > 0 && words ? [placeListNode({ name: words.heading, url, places })] : []),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: ui.eyebrow, url: localizedUrl(locale, "/dates") },
            { name: tc("title", { city: name }), url: localizedUrl(locale, `/dates/${city.slug}`) },
            { name: pair.heading, url },
          ]),
          faqNode(faq),
        ]}
      />
      <KindView kind={kind} />
      <DatePage>
        <DateHero
          label={`${name} · ${ui.eyebrow}`}
          heading={pair.heading}
          line={pair.line}
          sentence={sentence}
          picture={{ src: ideaImageInCity(hero.id), from: hero.art.from, to: hero.art.to }}
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
          ideas={ideas}
          card={(idea, i) => ({ idea, fit: copy.fits[idea.id][l], stops: stops[i], href: cityMapHref(city, l, idea.id), image: ideaImageInCity(idea.id) })}
          labels={{ twist: ui.twist, plan: tc("ideas.onMap"), inCity: tc("ideas.inCity", { city: name }), hours: (idea) => td("ideas.hours", { hours: hoursOf(idea.minutes, l) }), budget: (idea) => td(`ideas.budget.${idea.budget}`), featured: featuredLabel }}
        />

        {places.length > 0 && words ? (
          <DateSpread id="kind-places-title" label={words.label} heading={words.heading} line={words.line.replace("{km}", km)}>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {places.map((place) => (
                <li key={place.id} className="border-b border-page-line">
                  <a href={mapHref(place, place.name)} className="flex min-h-11 flex-col justify-center py-2.5">
                    <span className="text-[0.9375rem] font-medium text-page-ink">{place.name}</span>
                    <span className="text-sm text-page-body">
                      {KINDS[place.kind].label[l]}
                      {place.featured ? <span className="tracking-wide uppercase"> · {featuredLabel}</span> : null}
                    </span>
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
          </ul>
          {/* The city's other pairs, by their kind's short name, in place of the row of every kind: one row of kinds, within the page's 300 words. */}
          {others.length > 0 ? (
            <nav aria-label={ui.inCityByKind.replace("{city}", name)} className="mt-8 border-t border-page-line pt-5">
              <h2 className="text-page-label text-page-body">{ui.inCityByKind.replace("{city}", name)}</h2>
              <ul className="-mx-1.5 mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
                {others.map((k) => (
                  <li key={k} className="flex items-center">
                    <Link href={`/dates/${city.slug}/${k}`} className="inline-flex min-h-11 items-center px-2.5 text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink">
                      {DATE_KIND_COPY[k]!.nav[l]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </DateFoot>
      </DatePage>
    </>
  );
}
