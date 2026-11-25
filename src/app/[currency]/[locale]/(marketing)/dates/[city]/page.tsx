import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Map as MapIcon, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { ideaImageInCity, SKYLINE_IDEAS } from "@/lib/dates/art";
import { cityMapHref, cityName, getCity, mapHref as pointHref, nearbyCities, type City } from "@/lib/cities/cities";
import { hoursOf, ideaListNode, placeListNode, TOP_OF_LIST, toldTraits } from "@/lib/cities/copy";
import { cityIdeaScore, cityIdeaStops, ideasForCity } from "@/lib/cities/ideas";
import { IDEAS, type DateIdea } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import { toYmd } from "@/lib/dates/calendar";
import { featuredNow, markFeatured } from "@/lib/dates/featured";
import { loadCityPlaces } from "@/lib/cities/load";
import { CITY_RADIUS_M, topCityPlaces } from "@/lib/cities/places";
import { tiqetsSearch } from "@/lib/trips/partners";
import { tripsThrough } from "@/lib/trips/cities";
import { JsonLd } from "@/components/shared/json-ld";
import { CityCta } from "@/components/cities/city-cta";
import { CityLinks } from "@/components/cities/city-links";
import { CityPlaceList } from "@/components/cities/city-places";
import { DateFoot, DateHero, DatePage, DateSpread, QUIET_ROW_LINK } from "@/components/dates/page/date-page";
import { DateIdeaCards } from "@/components/dates/page/idea-cards";
import { DATE_CARDS_ART } from "@/components/dates/page/placements";
import { TONIGHT_BUTTON } from "@/components/dates/tonight/tonight-form";
import { TonightIsland } from "@/components/dates/tonight/tonight-island";
import { heroLead } from "@/components/templates/page/lead";
import { DATE_KIND_COPY, DATE_KIND_UI } from "@/content/date-kinds";
import { kindsOfCity } from "@/lib/cities/kind-pairs";

/** How many of a city’s places are named on its page; the rest are in a closed list. */
const SHOWN_PLACES = 6;
/** A folded list’s row, in the look of the questions on the pages by kind (DateQuestions). */
const SUMMARY = "flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[0.9375rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden";
const PLUS = "size-4 shrink-0 text-page-body transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none";
/** A link in the last band’s rows, in the page’s colours (as the pair pages pass to KindLinks). */
const ROW_LINK = "inline-flex min-h-11 items-center px-2.5 text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink";

/**
 * Built on the first visit and kept for a week, then rebuilt in the background: the places change
 * slowly, and the build itself never fetches thirty cities' map tiles.
 */
export const revalidate = 604800;
export const dynamicParams = true;
/** A cold build reads up to nine map tiles, each allowed seven seconds. */
export const maxDuration = 20;

export function generateStaticParams(): { city: string }[] {
  return [];
}

/** The page's facts, shared by its metadata and its body; the places are read once per build. */
async function cityPage(city: City, l: "en" | "es") {
  const found = await loadCityPlaces(city.slug, l);
  const ideas = ideasForCity(city);
  // "Featured" is a label and nothing else (lib/dates/featured.ts): the same places, in the same order.
  const featured = featuredNow(toYmd(new Date()));
  const around = markFeatured(found?.places ?? [], featured);
  const places = found ? markFeatured(topCityPlaces(found.places), featured) : [];
  return { found, around, ideas, places };
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/dates/[city]">, "searchParams">): Promise<Metadata> {
  const { locale, city: slug } = await params;
  const city = getCity(slug);
  if (!city) return {};
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations({ locale, namespace: "cities" });
  const { ideas, places } = await cityPage(city, l);
  const name = cityName(city, l);
  return pageMetadata({
    locale,
    path: `/dates/${city.slug}`,
    title: t("meta.title", { city: name, ideas: ideas.length, places: places.length }),
    description: t("meta.description", { city: name, ideas: ideas.length }),
  });
}

/**
 * Date ideas for one city, for people searching for them, as a designed page (DESIGN-LESS-TEXT.md):
 * the hero, the planner, six of the city's sixteen ideas as cards with the other ten folded away,
 * six real places with the rest folded away, and one last band with the map, tickets, one way to a
 * gift and the city's pages by kind. What search needs stays in the HTML, in closed <details>.
 */
export default async function CityDatesPage({ params }: PageProps<"/[currency]/[locale]/dates/[city]">) {
  const { locale, city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("cities");
  const td = await getTranslations("dates");
  const name = cityName(city, l);
  const url = localizedUrl(locale, `/dates/${city.slug}`);
  const { found, around, ideas, places } = await cityPage(city, l);
  const mapHref = cityMapHref(city, l);
  const km = (CITY_RADIUS_M / 1000).toLocaleString(l);
  const told = toldTraits(city, ideas);
  const ideaStops = cityIdeaStops(ideas, around);
  const passing = tripsThrough(city.slug);
  // Its pages by kind of date: every pair its own list holds (lib/cities/kind-pairs.ts).
  const kinds = kindsOfCity(city.slug);
  const top = ideas.slice(0, TOP_OF_LIST);
  const rest = ideas.slice(TOP_OF_LIST);
  // The hero's picture is never one of the six cards under it (the pair pages' rule, kind-pairs.ts
  // pairHero), nor another city's skyline: the first such idea of the folded ten.
  const first = [...rest, ...top].find((idea) => !(idea.id in SKYLINE_IDEAS)) ?? ideas[0];
  const shown = places.slice(0, SHOWN_PLACES);
  const ui = DATE_KIND_UI[l];
  const labels = {
    twist: td("ideas.twist"),
    plan: t("ideas.onMap"),
    inCity: t("ideas.inCity", { city: name }),
    hours: (idea: DateIdea) => td("ideas.hours", { hours: hoursOf(idea.minutes, l) }),
    budget: (idea: DateIdea) => td(`ideas.budget.${idea.budget}`),
    featured: td("featured.label"),
  };

  return (
    <>
      <JsonLd
        nodes={[
          ideaListNode({ name: t("title", { city: name }), url, ideas, locale: l }),
          ...(places.length > 0 ? [placeListNode({ name: t("places.title", { city: name }), url, places })] : []),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: td("eyebrow"), url: localizedUrl(locale, "/dates") },
            { name: t("title", { city: name }), url },
          ]),
        ]}
      />
      <DatePage>
        <DateHero
          label={t("eyebrow")}
          heading={t("title", { city: name })}
          line={t("line", { ideas: ideas.length, city: name })}
          sentence={heroLead(t(`notes.${city.slug}`)).lead}
          picture={{ src: ideaImageInCity(first.id), from: first.art.from, to: first.art.to }}
          note={first.title[l]}
          back={
            <Link href="/dates" className="group -ml-2 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-page-accent underline-offset-4 hover:underline">
              <ArrowLeft aria-hidden="true" className="size-4" />
              {t("back")}
            </Link>
          }
        >
          <CityCta href={mapHref} cta="map" city={city.slug} className={TONIGHT_BUTTON}>
            <MapIcon aria-hidden="true" className="size-4" />
            {t("cta.map", { city: name })}
          </CityCta>
        </DateHero>

        <DateSpread id="tonight-title" sectionId="tonight" label={td("tonight.label")} heading={td("tonight.inCity", { city: name })} art={DATE_CARDS_ART}>
          <TonightIsland place={{ lat: city.lat, lng: city.lng, name }} boost={Object.fromEntries(IDEAS.map((idea) => [idea.id, cityIdeaScore(idea, city)]))} mapHref={mapHref} />
        </DateSpread>

        <DateSpread id="ideas-title" label={t("ideas.eyebrow")} heading={t("ideas.title", { count: ideas.length, city: name })} line={t("ideas.line", { city: name })}>
          <div data-testid="city-ideas">
            <DateIdeaCards id="city-ideas-top" cards={top.map((idea, i) => ({ idea, fit: idea.blurb[l], stops: ideaStops[i], image: ideaImageInCity(idea.id), href: cityMapHref(city, l, idea.id) }))} locale={l} labels={labels} />
          </div>
          {rest.length > 0 ? (
            <details name="city-more" className="group mt-8 border-y border-page-line">
              <summary className={SUMMARY}>
                {t("ideas.more", { count: rest.length, city: name })}
                <Plus aria-hidden="true" className={PLUS} strokeWidth={1.6} />
              </summary>
              <ol className="grid gap-6 pb-6">
                {rest.map((idea, j) => {
                  const stops = ideaStops[TOP_OF_LIST + j];
                  return (
                    <li key={idea.id} id={`idea-${idea.id}`} className="scroll-mt-24">
                      <p className="font-display text-[1.25rem] leading-snug text-page-ink">{idea.title[l]}</p>
                      <p className="mt-1 max-w-2xl text-[0.9375rem] leading-relaxed text-page-body">{idea.blurb[l]}</p>
                      <p className="mt-1 text-sm text-page-body">
                        {labels.hours(idea)} · {labels.budget(idea)}
                      </p>
                      {stops && stops.length > 0 ? (
                        <p className="mt-1 text-sm text-page-body">
                          {labels.inCity}: {stops.map((place) => `${place.named ? place.name : KINDS[place.kind].label[l]}${place.featured ? ` (${labels.featured})` : ""}`).join(", ")}
                        </p>
                      ) : null}
                      <CityCta href={cityMapHref(city, l, idea.id)} cta="idea" city={city.slug} className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-page-accent underline-offset-4 hover:underline">
                        {t("ideas.onMap")}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </CityCta>
                    </li>
                  );
                })}
              </ol>
            </details>
          ) : null}
          <details name="city-why" className={rest.length > 0 ? "group border-b border-page-line" : "group mt-8 border-y border-page-line"}>
            <summary className={SUMMARY}>
              {t("ideas.why", { city: name })}
              <Plus aria-hidden="true" className={PLUS} strokeWidth={1.6} />
            </summary>
            <div className="max-w-2xl pb-5 text-[0.9375rem] leading-relaxed text-page-body">
              {told.length > 0 ? (
                <ul className="grid gap-2">
                  {told.map((trait) => (
                    <li key={trait}>{t(`traits.${trait}`, { city: name })}</li>
                  ))}
                </ul>
              ) : null}
              <p className={told.length > 0 ? "mt-3" : undefined}>{t(`notes.${city.slug}`)}</p>
            </div>
          </details>
        </DateSpread>

        <DateSpread id="places-title" sectionId="places" label={t("places.eyebrow")} heading={t("places.title", { city: name })} line={shown.length > 0 ? t("places.line", { km }) : t("places.none", { city: name })}>
          {shown.length > 0 && found ? (
            <>
              <ul className="grid gap-x-8 sm:grid-cols-2" data-testid="city-places-top">
                {shown.map((place) => (
                  <li key={place.id} className="border-b border-page-line">
                    <CityCta href={pointHref(place, place.name)} cta="place" city={city.slug} className="flex min-h-11 flex-col justify-center py-2.5">
                      <span className="text-[0.9375rem] font-medium text-page-ink">{place.name}</span>
                      <span className="text-sm text-page-body">
                        {KINDS[place.kind].label[l]}
                        {place.featured ? <span className="tracking-wide uppercase"> · {labels.featured}</span> : null}
                      </span>
                    </CityCta>
                  </li>
                ))}
              </ul>
              {places.length > shown.length ? (
                <details name="city-places" className="group mt-6 border-b border-page-line">
                  <summary className={SUMMARY}>
                    {t("places.all", { count: places.length })}
                    <Plus aria-hidden="true" className={PLUS} strokeWidth={1.6} />
                  </summary>
                  <div className="pb-6">
                    <CityPlaceList places={places} counts={found.counts} locale={l} city={city.slug} labels={{ counts: t("places.counts", { km }), fromCentre: (distance) => t("places.fromCentre", { distance }), featured: labels.featured }} />
                  </div>
                </details>
              ) : null}
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-page-body">{td("places.credit")}</p>
            </>
          ) : null}
        </DateSpread>

        <DateFoot id="more-title" label={name} heading={t("more.title", { city: name })}>
          <ul className="flex flex-wrap items-baseline gap-x-6 leading-8">
            <li>
              <CityCta href={mapHref} cta="map" city={city.slug} className={`${QUIET_ROW_LINK} inline-block font-medium`}>
                {t("cta.map", { city: name })}
              </CityCta>
            </li>
            <li>
              {/* Searched by the English name in both languages, as the trips' ticket queries are, so the two pages send the same search. */}
              <CityCta href={tiqetsSearch(city.name, l)} cta="tickets" city={city.slug} partner="tiqets" className={`${QUIET_ROW_LINK} inline-block`}>
                {t("tickets.cta", { city: name })}
              </CityCta>{" "}
              <span className="text-sm text-page-body">{t("tickets.short")}</span>
            </li>
            <li>
              <CityCta href="/templates?ref=city" cta="gift" city={city.slug} className={`${QUIET_ROW_LINK} inline-block`}>
                {t("cta.gift")}
              </CityCta>
            </li>
            {passing.length > 0 ? (
              <li data-testid="city-trip">
                {passing.map((trip, i) => (
                  <span key={trip.id}>
                    {i > 0 ? ", " : null}
                    <Link href={`/trips/${trip.id}`} className={`${QUIET_ROW_LINK} inline-block`}>
                      {trip.title[l]}
                    </Link>
                  </span>
                ))}
              </li>
            ) : null}
          </ul>
          <div className="mt-8 border-t border-page-line pt-5">
            {kinds.length > 0 ? (
              <nav aria-label={ui.inCityByKind.replace("{city}", name)}>
                <h2 className="text-page-label text-page-body">{t("more.byKind")}</h2>
                <ul className="-mx-1.5 mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
                  {kinds.map((kind) => (
                    <li key={kind} className="flex items-center">
                      <Link href={`/dates/${city.slug}/${kind}`} className={ROW_LINK}>
                        {DATE_KIND_COPY[kind]!.nav[l]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            <CityLinks cities={nearbyCities(city)} locale={l} title={t("nearby")} className={kinds.length > 0 ? "mt-5" : undefined} titleClassName="text-page-label text-page-body" linkClassName={ROW_LINK} />
          </div>
        </DateFoot>
      </DatePage>
    </>
  );
}
