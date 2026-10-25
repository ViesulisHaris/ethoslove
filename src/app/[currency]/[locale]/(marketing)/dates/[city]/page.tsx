import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Gift, Map as MapIcon, Ticket } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { ideaImage } from "@/lib/dates/art";
import { cityMapHref, cityName, getCity, nearbyCities, type City } from "@/lib/cities/cities";
import { hoursOf, ideaListNode, placeListNode, toldTraits } from "@/lib/cities/copy";
import { cityIdeaStops, ideasForCity } from "@/lib/cities/ideas";
import { loadCityPlaces } from "@/lib/cities/load";
import { CITY_RADIUS_M, topCityPlaces } from "@/lib/cities/places";
import { tiqetsSearch } from "@/lib/trips/partners";
import { FloralFrame } from "@/components/marketing/home/cutouts";
import { EagerImg } from "@/components/shared/eager-img";
import { JsonLd } from "@/components/shared/json-ld";
import { CityCta } from "@/components/cities/city-cta";
import { CityIdeaCard } from "@/components/cities/city-idea-card";
import { CityLinks } from "@/components/cities/city-links";
import { CityPlaceList } from "@/components/cities/city-places";

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
  const places = found ? topCityPlaces(found.places) : [];
  return { found, ideas, places };
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
 * Date ideas for one city, for people searching for them: the ideas in the order that city
 * deserves, real places near its centre for each, and the way on to the map and to a gift.
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
  const { found, ideas, places } = await cityPage(city, l);
  const around = found?.places ?? [];
  const mapHref = cityMapHref(city, l);
  const km = (CITY_RADIUS_M / 1000).toLocaleString(l);
  const told = toldTraits(city, ideas);
  const ideaStops = cityIdeaStops(ideas, around);

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

      <section className="relative isolate -mt-[var(--header-h)] bg-blush-paper pt-[var(--header-h)] text-forest">
        <FloralFrame frame="band" ground="light" />
        <div className="relative container-x pt-6 pb-14 sm:pt-10 lg:pb-20">
          <Link href="/dates" className="group -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-rose-deep underline-offset-4 hover:underline">
            <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {t("back")}
          </Link>
          <div className="mt-4 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
            <div className="relative order-first mx-auto grid w-full max-w-[520px] rotate-[1.5deg] grid-cols-2 gap-2.5 lg:order-last">
              {ideas.slice(0, 4).map((idea, i) => (
                <span key={idea.id} className="relative block aspect-[4/3] overflow-hidden rounded-[22px] shadow-[0_30px_60px_-34px_rgba(120,20,60,0.6)] ring-4 ring-white" style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)` }}>
                  {/* EagerImg, not <img>: /dates links to every city page, and each prefetch of one
                      would otherwise add these four pictures to /dates as preloads it never shows. */}
                  <EagerImg src={ideaImage(idea.id)} alt="" width={960} height={720} loading="eager" fetchPriority={i === 0 ? "high" : "auto"} decoding="async" className="absolute inset-0 size-full object-cover" />
                </span>
              ))}
            </div>
            <div>
              <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
              {/* In em, not ch, so the fallback font wraps it as Newsreader will (platform-hero.tsx): 8.4em is Newsreader's 14ch. */}
              <h1 className="mt-4 max-w-[8.4em] font-display text-[clamp(2.5rem,5.6vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-balance">{t("title", { city: name })}</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-forest/75">{places.length > 0 ? t("lead", { city: name, ideas: ideas.length }) : t("leadNoPlaces", { city: name, ideas: ideas.length })}</p>
              <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-forest/70">{t(`notes.${city.slug}`)}</p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <CityCta href={mapHref} cta="map" city={city.slug} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-[filter] hover:brightness-110">
                  <MapIcon aria-hidden="true" className="size-4" />
                  {t("cta.map", { city: name })}
                </CityCta>
                <CityCta href="/templates?ref=city" cta="gift" city={city.slug} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-forest ring-1 ring-forest/12 hover:bg-rose-mist">
                  <Gift aria-hidden="true" className="size-4 text-rose-deep" />
                  {t("cta.gift")}
                </CityCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 lg:py-24">
        <div className="container-x">
          <p data-reveal className="text-eyebrow text-rose-deep">
            {t("ideas.eyebrow")}
          </p>
          <h2 data-reveal className="display-xl mt-4" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
            {t("ideas.title", { count: ideas.length, city: name })}
          </h2>
          {told.length > 0 ? (
            <ul className="mt-5 grid max-w-3xl gap-2 text-[16px] leading-relaxed text-forest/75">
              {told.map((trait) => (
                <li key={trait} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[10px] size-1.5 shrink-0 rounded-full bg-rose" />
                  {t(`traits.${trait}`, { city: name })}
                </li>
              ))}
            </ul>
          ) : null}
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="city-ideas">
            {ideas.map((idea, i) => (
              <li key={idea.id}>
                <CityIdeaCard
                  idea={idea}
                  locale={l}
                  city={city.slug}
                  href={cityMapHref(city, l, idea.id)}
                  stops={ideaStops[i]}
                  isPick={city.picks.includes(idea.id)}
                  eager={i < 3}
                  labels={{
                    budget: td(`ideas.budget.${idea.budget}`),
                    hours: td("ideas.hours", { hours: hoursOf(idea.minutes, l) }),
                    twist: td("ideas.twist"),
                    inCity: t("ideas.inCity", { city: name }),
                    onMap: t("ideas.onMap"),
                    pick: t("ideas.pick"),
                  }}
                />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="places" className="scroll-mt-24 border-t border-line bg-blush-paper py-16 lg:py-24">
        <div className="container-x">
          <p data-reveal className="text-eyebrow text-rose-deep">
            {t("places.eyebrow")}
          </p>
          <h2 data-reveal className="display-xl mt-4" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
            {t("places.title", { city: name })}
          </h2>
          {places.length > 0 && found ? (
            <>
              <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-forest/70">{t("places.sub", { km })}</p>
              <div className="mt-8">
                <CityPlaceList places={places} counts={found.counts} locale={l} city={city.slug} labels={{ counts: t("places.counts", { km }), fromCentre: (distance) => t("places.fromCentre", { distance }) }} />
              </div>
              <p className="mt-6 max-w-2xl text-[12.5px] leading-relaxed text-forest/50">{td("places.credit")}</p>
            </>
          ) : (
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-forest/70">{t("places.none", { city: name })}</p>
          )}
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col items-start justify-between gap-5 rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-7">
              <div>
                <h3 className="font-display text-[24px] leading-tight text-forest">{t("map.title", { city: name })}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-forest/70">{t("map.sub")}</p>
              </div>
              <CityCta href={mapHref} cta="map" city={city.slug} className="group btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-[filter] hover:brightness-110">
                <MapIcon aria-hidden="true" className="size-4" />
                {t("cta.map", { city: name })}
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </CityCta>
            </div>
            <div className="flex flex-col items-start justify-between gap-5 rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-7">
              <div>
                <h3 className="font-display text-[24px] leading-tight text-forest">{t("tickets.title", { city: name })}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-forest/70">{t("tickets.sub")}</p>
              </div>
              <div>
                {/* Searched by the English name in both languages, as the trips' ticket queries are, so the two pages send the same search. */}
                <CityCta href={tiqetsSearch(city.name, l)} cta="tickets" city={city.slug} partner="tiqets" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-forest ring-1 ring-forest/12 hover:bg-rose-mist">
                  <Ticket aria-hidden="true" className="size-4 text-rose-deep" />
                  {t("tickets.cta", { city: name })}
                </CityCta>
                <p className="mt-3 text-[12.5px] leading-relaxed text-forest/55">{t("tickets.disclosure")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 lg:py-24">
        <div className="container-x">
          <div className="relative isolate overflow-hidden rounded-[36px] px-6 py-12 text-cream sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-16">
            <FloralFrame frame="band" ground="dark" className="-z-10" />
            <div className="relative max-w-2xl">
              <p className="text-eyebrow text-blush">{t("gift.eyebrow")}</p>
              <h2 className="display-xl mt-4 text-cream">{t("gift.title")}</h2>
              <p className="mt-4 text-[16.5px] leading-relaxed text-cream/75">{t("gift.sub")}</p>
            </div>
            <div className="relative mt-8 flex shrink-0 flex-col items-start gap-3 lg:mt-0">
              <CityCta href="/templates?ref=city" cta="plan" city={city.slug} className="group btn-rose inline-flex h-14 items-center gap-2 rounded-full px-8 text-base font-semibold transition-[filter] hover:brightness-110">
                <Gift aria-hidden="true" className="size-[18px]" />
                {t("cta.plan")}
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </CityCta>
              <p className="text-[13px] text-cream/55">{t("gift.note")}</p>
            </div>
          </div>
          <CityLinks cities={nearbyCities(city)} locale={l} title={t("nearby")} className="mt-12" />
        </div>
      </section>
    </>
  );
}
