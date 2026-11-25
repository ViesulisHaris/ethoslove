import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Car, Gift, Moon, Plus, Ticket } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { chargedCurrency, subscriptionsEnabled } from "@/lib/pricing/products";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { shareCardPath } from "@/lib/share/links";
import { cityName as cityPageName } from "@/lib/cities/cities";
import { cityName, findAirport } from "@/lib/trips/airports";
import { tripStopCities } from "@/lib/trips/cities";
import { monthRanges } from "@/lib/trips/months";
import { BUDGET_KEY, budgetValues } from "@/lib/trips/day-costs";
import { tiqetsSearch, tripCarHire, tripTickets } from "@/lib/trips/partners";
import { getTrip, stopName, TRIPS } from "@/lib/trips/presets";
import { stayPartnerId, tripStays } from "@/lib/trips/stay";
import { TRIP_GIFT_SLUG, tripGiftFields, tripUnwrap } from "@/lib/trips/trip-gift";
import { TRIP_SEO } from "@/content/trip-seo";
import { heroLead } from "@/components/templates/page/lead";
import { FloralFrame } from "@/components/marketing/home/cutouts";
import { SaveTripButton } from "@/components/saved-dates/save-trip-button";
import { JsonLd } from "@/components/shared/json-ld";
import { FlightFinder } from "@/components/trips/flight-finder";
import { PartnerLink } from "@/components/trips/partner-link";
import { ShareTripButton } from "@/components/trips/share-trip-button";
import { StayLink } from "@/components/trips/stay-link";
import { SurpriseAnyGift, SurpriseLink } from "@/components/trips/surprise-link";
import { TripArt } from "@/components/trips/trip-art";
import { TripMap } from "@/components/trips/trip-map";

/** How the plan marks each day's date-night moment, so it can be drawn as one. */
const EVENING = { en: "Evening:", es: "Por la noche:" } as const;

export function generateStaticParams() {
  return TRIPS.map((trip) => ({ id: trip.id }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/trips/[id]">, "searchParams">): Promise<Metadata> {
  const { locale, id } = await params;
  const trip = getTrip(id);
  if (!trip) return {};
  const l = locale === "es" ? "es" : "en";
  // The trip's own picture on its link preview (app/og/share.jpg), not the site's general card.
  // What a search shows is the searched pattern ("3 days in Lisbon for two"); the page keeps the trip's own name as its h1.
  const seo = TRIP_SEO[trip.id];
  return pageMetadata({ locale, path: `/trips/${trip.id}`, title: seo?.title[l] ?? trip.title[l], description: seo?.description[l] ?? trip.blurb[l], image: shareCardPath({ kind: "trip", locale: l, trip: trip.id }) });
}

/** One trip: the picture and the facts, the route on a map, the plan day by day, tickets for its sights, flights (and a car for a road trip), and the gift it can become. */
export default async function TripPage({ params }: PageProps<"/[currency]/[locale]/trips/[id]">) {
  const { currency, locale, id } = await params;
  const trip = getTrip(id);
  if (!trip) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("trips");
  const ta = await getTranslations("affiliate");
  const l = locale === "es" ? "es" : "en";
  const airport = findAirport(trip.flyTo);
  const gift = tripGiftFields(trip, l);
  const url = localizedUrl(locale, `/trips/${trip.id}`);
  const stops = trip.stops.map((s) => ({ name: stopName(s, l), lat: s.lat, lng: s.lng }));
  // A stop in one of the cities with a dates page links to it, once a city (lib/trips/cities.ts).
  const stopCities = tripStopCities(trip);
  const tickets = tripTickets(trip.id).map((ticket) => {
    const stop = trip.stops.find((s) => s.name === ticket.stop);
    return { name: ticket.name[l], where: stop ? stopName(stop, l) : null, url: tiqetsSearch(ticket.query, l) };
  });
  const carHire = tripCarHire(trip);
  // The hero says the blurb's opening sentences (DESIGN-LESS-TEXT: thirty words beside the picture); the rest waits in "More about this trip".
  const { lead, rest } = heroLead(trip.blurb[l]);
  // Each stop the trip sleeps in gets a place to stay; the partner id is read here, on the server, and handed down.
  const stays = tripStays(trip);
  const partnerId = stayPartnerId();
  // Three facts: the kind is already said over the name.
  const facts = [
    { label: t("detail.facts.days"), value: t("days", { count: trip.days }) },
    { label: t("detail.facts.best"), value: monthRanges(trip.bestMonths, l) },
    // The day costs in the currency this visitor is charged in, said as "about" (lib/trips/day-costs.ts). The longest value, so it spans the row where the boxes are narrow.
    { label: t("detail.facts.budget"), value: t(`budget.short.${BUDGET_KEY[trip.budget]}`, budgetValues(trip.budget, chargedCurrency(currency), l)), hint: t("budget.note"), wide: true },
  ];

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "TouristTrip",
            "@id": `${url}#trip`,
            name: trip.title[l],
            description: trip.blurb[l],
            url,
            inLanguage: locale,
            touristType: l === "es" ? "Parejas" : "Couples",
            ...(trip.image ? { image: `${SITE.url}${trip.image}` } : {}),
            provider: { "@id": `${SITE.url}/#organization` },
            itinerary: {
              "@type": "ItemList",
              numberOfItems: stops.length,
              itemListElement: stops.map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: { "@type": "Place", name: s.name, geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } },
              })),
            },
          },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("eyebrow"), url: localizedUrl(locale, "/trips") },
            { name: trip.title[l], url },
          ]),
        ]}
      />

      <section className="relative isolate -mt-[var(--header-h)] bg-blush-paper pt-[var(--header-h)] text-forest">
        {/* The pieces at the foot lie whole inside the hero, and its ground runs softly into the
            page's paper below instead of stepping: a lily was cut flat there (walk-rooms-3). */}
        <FloralFrame frame="bandHero" ground="light" />
        <div aria-hidden="true" data-hero-fade className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-paper" />
        <div className="relative container-x pt-6 pb-14 sm:pt-10 lg:pb-20">
          <Link href="/trips" className="group -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-rose-deep underline-offset-4 hover:underline">
            <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {t("detail.back")}
          </Link>
          <div className="mt-4 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:gap-14">
            <div className="relative order-first mx-auto w-full max-w-[560px] lg:order-last">
              <TripArt trip={trip} priority sizes="(min-width: 1280px) 560px, (min-width: 1024px) 440px, (min-width: 600px) 560px, 100vw" className="aspect-[4/3] w-full rotate-[1.5deg] rounded-[32px] shadow-[0_40px_90px_-40px_rgba(120,20,60,0.6)] ring-8 ring-white" />
            </div>
            <div>
              <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t(`kind.${trip.kind}`)}</p>
              {/* In em, not ch, so the fallback font wraps it as Newsreader will (platform-hero.tsx): 9.6em is Newsreader's 16ch. */}
              <h1 className="mt-4 max-w-[9.6em] font-display text-[clamp(2.5rem,5.6vw,4.5rem)] leading-[0.98] tracking-[-0.03em] text-balance">{trip.title[l]}</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-forest/75">{lead || trip.blurb[l]}</p>
              <dl className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {facts.map((f) => (
                  <div key={f.label} className={f.wide ? "col-span-2 rounded-2xl bg-card px-4 py-3 shadow-soft ring-1 ring-forest/5 sm:col-span-1 lg:col-span-2 xl:col-span-1" : "rounded-2xl bg-card px-4 py-3 shadow-soft ring-1 ring-forest/5"} title={f.hint}>
                    <dt className="text-[12px] font-semibold tracking-wide text-forest/50 uppercase">{f.label}</dt>
                    {/* The hint is described, not spoken as words in the page: a screen reader's hidden span is counted by the word test. */}
                    <dd className="mt-1 font-display text-[19px] leading-tight text-forest" aria-description={f.hint}>
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <a href="#surprise" className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-[filter] hover:brightness-110">
                  <Gift aria-hidden="true" className="size-4" />
                  {t("detail.surprise.cta")}
                </a>
                {/* Keeping it and sending it go together: where the four don't fit one row, these two wrap as a pair, never the share alone. A failed save, or the line after one, comes below the pair. */}
                {/* Static page: the switch is read at build time, which is when a change to it lands anyway. */}
                <SaveTripButton tripId={trip.id} title={trip.title[l]} monthly={subscriptionsEnabled()} currency={chargedCurrency(currency)}>
                  <ShareTripButton tripId={trip.id} title={trip.title[l]} className="inline-flex h-12 items-center gap-2 rounded-full bg-card px-6 text-[15px] font-semibold text-forest ring-1 ring-forest/12 transition-[background-color,scale] hover:bg-blush-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest active:scale-[0.98] motion-reduce:transition-none" />
                </SaveTripButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 lg:py-24">
        <div className="container-x">
          <p data-reveal className="text-eyebrow text-rose-deep">
            {t("detail.route.eyebrow")}
          </p>
          <h2 data-reveal className="display-xl mt-4" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
            {t("detail.route.title")}
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <TripMap
              stops={stops}
              kind={trip.kind}
              className="h-[340px] rounded-[28px] shadow-soft ring-1 ring-forest/5 sm:h-[440px] lg:sticky lg:top-24 lg:h-[560px]"
              labels={{
                map: t("detail.route.map"),
                loading: t("detail.route.loading"),
                unavailable: t("detail.route.unavailable"),
                gestureMobile: t("detail.route.gestureMobile"),
                gestureWindows: t("detail.route.gestureWindows"),
                gestureMac: t("detail.route.gestureMac"),
                zoomIn: t("detail.route.zoomIn"),
                zoomOut: t("detail.route.zoomOut"),
                credits: t("detail.route.credits"),
              }}
            />
            <ol className="grid gap-3" data-testid="trip-stops">
              {trip.stops.map((s, i) => {
                const stay = stays.find((x) => x.stop === s.name);
                return (
                <li key={s.name} className="rounded-[24px] bg-card p-5 shadow-soft ring-1 ring-forest/5">
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose text-[13px] font-bold text-white shadow-[0_6px_14px_-4px_rgba(90,20,45,0.55)]">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      {/* The note folds; the stop's one date link stays on show under it. */}
                      <details className="group">
                        <summary className="-mt-1.5 flex min-h-11 cursor-pointer list-none items-baseline justify-between gap-x-3 rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden">
                          <h3 className="pt-1.5 font-display text-[22px] leading-tight text-forest">{stopName(s, l)}</h3>
                          <span className="ml-auto text-[12.5px] font-semibold whitespace-nowrap text-forest/65">{t("detail.route.nights", { count: s.nights })}</span>
                          <Plus aria-hidden="true" className="size-4 shrink-0 self-center text-forest/60 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                        </summary>
                        <p className="mt-1 text-[14.5px] leading-relaxed text-forest/70">{s.note[l]}</p>
                        {stay ? (
                          <>
                            <StayLink query={stay.query} lat={stay.lat} lng={stay.lng} nightsBefore={stay.nightsBefore} nights={stay.nights} partnerId={partnerId} trip={trip.id} className="group/stay inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
                              {ta("stay.cta", { place: stopName(s, l) })}
                              <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform group-hover/stay:translate-x-0.5 group-hover/stay:-translate-y-0.5" />
                              <span className="sr-only">({ta("newTab")})</span>
                            </StayLink>
                            {partnerId ? (
                              <p className="mt-1 text-[12.5px] leading-snug text-forest/65">
                                {ta("stay.via")} {ta("disclosureBoth")}
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </details>
                      {/* One link a stop: the city's own date ideas where it is one of ours, else the map of date spots around it. */}
                      <div className="-mb-2.5 flex flex-wrap gap-x-5">
                        {stopCities[i] ? (
                          <Link href={`/dates/${stopCities[i].slug}`} data-testid="stop-city" className="group inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
                            {t("detail.route.cityDates", { city: cityPageName(stopCities[i], l) })}
                            <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/dates?lat=${s.lat}&lng=${s.lng}&q=${encodeURIComponent(stopName(s, l))}`}
                            className="group inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline"
                          >
                            {t("detail.route.datesHere")}
                            <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
                );
              })}
            </ol>
          </div>
          {rest ? (
            <details data-trip-more className="group mt-6 max-w-3xl rounded-[24px] bg-card px-5 shadow-soft ring-1 ring-forest/5 sm:px-6">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[24px] font-display text-[22px] leading-tight text-forest outline-offset-4 focus-visible:outline-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden">
                {t("detail.about")}
                <Plus aria-hidden="true" className="size-4 shrink-0 text-forest/60 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
              </summary>
              <div className="grid gap-3 pb-5 text-[14.5px] leading-relaxed text-forest/70">
                <p>{rest}</p>
                <p>{t("budget.note")}</p>
              </div>
            </details>
          ) : null}
        </div>
      </section>

      <section id="plan" className="scroll-mt-24 border-t border-line bg-blush-paper py-16 lg:py-24">
        <div className="container-x">
          <p data-reveal className="text-eyebrow text-rose-deep">
            {t("detail.plan.eyebrow")}
          </p>
          <h2 data-reveal className="display-xl mt-4" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
            {t("detail.plan.title")}
          </h2>
          <ol className="mt-10 grid gap-5 lg:grid-cols-2" data-testid="trip-plan">
            {trip.plan.map((day, i) => (
              <li key={day.day} data-reveal style={{ "--reveal-delay": `${(i % 2) * 80}ms` } as React.CSSProperties} className="rounded-[28px] bg-card p-6 shadow-soft ring-1 ring-forest/5 sm:p-7">
                <p className="text-eyebrow text-rose-deep">{t("detail.plan.day", { n: day.day })}</p>
                <h3 className="mt-2 font-display text-[26px] leading-[1.1] text-forest">{day.title[l]}</h3>
                <ul className="mt-4 grid gap-3">
                  {day.items[l].map((item) => {
                    const evening = item.startsWith(EVENING[l]);
                    return (
                      <li key={item} className={evening ? "flex gap-3 rounded-2xl bg-blush-paper px-4 py-3 text-[15px] leading-relaxed text-forest" : "flex gap-3 text-[15px] leading-relaxed text-forest/80"}>
                        {evening ? <Moon aria-hidden="true" className="mt-1 size-4 shrink-0 text-rose-deep" /> : <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-rose" />}
                        <span>
                          {evening ? <strong className="font-semibold text-rose-ink">{EVENING[l]}</strong> : null}
                          {evening ? item.slice(EVENING[l].length) : item}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {tickets.length > 0 ? (
        <section id="tickets" className="scroll-mt-24 bg-paper pt-16 lg:pt-24">
          <div className="container-x">
            <p data-reveal className="text-eyebrow text-rose-deep">
              {ta("tickets.eyebrow")}
            </p>
            <h2 data-reveal className="display-xl mt-4" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
              {ta("tickets.title")}
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-forest/70">{ta("tickets.sub")}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="trip-tickets">
              {tickets.map((ticket) => (
                <li key={ticket.url}>
                  <PartnerLink
                    partner="tiqets"
                    placement="trip_tickets"
                    trip={trip.id}
                    href={ticket.url}
                    aria-label={ta("tickets.label", { name: ticket.name })}
                    className="group flex h-full min-h-[88px] items-center gap-3.5 rounded-[24px] bg-card p-4 shadow-soft ring-1 ring-forest/5 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-blush-paper"
                  >
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blush-paper text-rose-deep">
                      <Ticket className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-[19px] leading-tight text-forest">{ticket.name}</span>
                      {ticket.where ? <span className="mt-0.5 block text-[13px] text-forest/65">{ticket.where}</span> : null}
                    </span>
                    <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-rose-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </PartnerLink>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-snug text-forest/65">
              {ta("tickets.via")} {ta("disclosureBoth")}
            </p>
          </div>
        </section>
      ) : null}

      <section id="flights" className="scroll-mt-24 bg-paper py-16 lg:py-24">
        <div className="container-x grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-14">
          <div>
            <p className="text-eyebrow text-rose-deep">{t("detail.flights.eyebrow")}</p>
            <h2 className="display-xl mt-4">{t("detail.flights.title", { city: airport ? cityName(airport, l) : stops[0].name })}</h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-forest/70">{t("detail.flights.sub")}</p>
            {carHire ? (
              <div className="mt-8 max-w-md rounded-[24px] bg-blush-paper p-5" data-testid="trip-car">
                <h3 className="flex items-center gap-2 font-display text-[22px] leading-tight text-forest">
                  <Car aria-hidden="true" className="size-5 text-rose-deep" />
                  {ta("car.title")}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-forest/70">{ta("car.sub")}</p>
                <PartnerLink partner="autoeurope" placement="trip_car" trip={trip.id} href={carHire} className="group mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-card px-5 text-[15px] font-semibold text-forest ring-1 ring-forest/12 transition-colors hover:bg-blush-paper">
                  {ta("car.cta")}
                  <ArrowUpRight aria-hidden="true" className="size-4 text-rose-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  <span className="sr-only">({ta("newTab")})</span>
                </PartnerLink>
                <p className="mt-3 text-[12.5px] leading-snug text-forest/65">
                  {ta("car.via")} {ta("disclosureBoth")}
                </p>
              </div>
            ) : null}
          </div>
          <div className="rounded-[32px] bg-card p-5 shadow-lift ring-1 ring-forest/5 sm:p-7">
            <FlightFinder to={trip.flyTo} placement="trip_flights" trip={trip.id} />
          </div>
        </div>
      </section>

      <section id="surprise" className="scroll-mt-24 bg-paper pb-20 lg:pb-28">
        <div className="container-x">
          <div className="relative isolate overflow-hidden rounded-[36px] px-6 py-12 text-cream sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-16">
            <FloralFrame frame="card" ground="dark" className="-z-10" />
            <div className="relative max-w-2xl">
              <p className="text-eyebrow text-blush">{t("detail.surprise.eyebrow")}</p>
              <h2 className="display-xl mt-4 text-cream">{t("detail.surprise.title")}</h2>
              <p className="mt-4 text-[16.5px] leading-relaxed text-cream/75">{t("detail.surprise.sub", { city: String(gift.toCity) })}</p>
            </div>
            <div className="relative mt-8 flex shrink-0 flex-col items-start gap-3 lg:mt-0">
              <SurpriseLink slug={TRIP_GIFT_SLUG} fields={gift} className="group btn-rose inline-flex h-14 items-center gap-2 rounded-full px-8 text-base font-semibold transition-[filter] hover:brightness-110">
                <Gift aria-hidden="true" className="size-[18px]" />
                {t("detail.surprise.cta")}
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </SurpriseLink>
              <p className="text-[13px] text-cream/55">{t("detail.surprise.note")}</p>
              <SurpriseAnyGift unwrap={tripUnwrap(trip, l)} searchNames={trip.stops.map((s) => s.name)} className="-my-1 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-cream/90 underline decoration-cream/35 underline-offset-4 transition-colors hover:text-cream hover:decoration-cream">
                <Gift aria-hidden="true" className="size-4" />
                {t("detail.surprise.anyGift")}
              </SurpriseAnyGift>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
