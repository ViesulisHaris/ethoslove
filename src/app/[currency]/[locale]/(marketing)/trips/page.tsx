import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { chargedCurrency } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";
import { BUDGET_KEY, budgetValues } from "@/lib/trips/day-costs";
import { monthRanges } from "@/lib/trips/months";
import { budgetMark, TRIP_KINDS, tripImageSm, TRIPS, tripSrcSet } from "@/lib/trips/presets";
import { TRIP_GIFT_SLUG, tripGiftFields } from "@/lib/trips/trip-gift";
import { ideaPath, TRIP_IDEA_KINDS } from "@/lib/trips/idea-kinds";
import { originPath, TRIP_ORIGINS } from "@/lib/trips/origins";
import { TRIP_IDEA_COPY } from "@/content/trip-ideas";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { MATCH_ART, ROOMS_THEME } from "@/content/rooms-art";
import { FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";
import { JsonLd } from "@/components/shared/json-ld";
import { ArtLayer } from "@/components/templates/page/art";
import { Intro, SPREAD } from "@/components/templates/page/spread";
import { FlightFinder } from "@/components/trips/flight-finder";
import { TripCard } from "@/components/trips/trip-card";
import { TripMatcher, type MatcherTrip } from "@/components/trips/trip-matcher";
import { TripsGrid } from "@/components/trips/trips-grid";
import { LetterSlot } from "@/components/date-letter/letter-slot";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/trips">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trips.meta" });
  return pageMetadata({ locale, path: "/trips", title: t("title", { count: TRIPS.length }), description: t("description") });
}

/** Trips: the flight search on the first screen, then twelve trips to pick from, then the gift they can become. */
export default async function TripsPage({ params }: PageProps<"/[currency]/[locale]/trips">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trips");
  const l = locale === "es" ? "es" : "en";
  // The day costs in the currency this visitor is charged in (lib/trips/day-costs.ts): euros are the source.
  const shown = chargedCurrency(currency);

  const cards = TRIPS.map((trip) => ({
    id: trip.id,
    kind: trip.kind,
    card: (
      <TripCard
        trip={trip}
        title={trip.title[l]}
        labels={{
          kind: t(`kind.${trip.kind}`),
          days: t("days", { count: trip.days }),
        }}
      />
    ),
  }));
  const filters = [{ value: "all" as const, label: t("filter.all") }, ...TRIP_KINDS.map((k) => ({ value: k, label: t(`filter.${k}`) }))];
  // What "Where should we go together?" ranks and draws: worked out here, so the browser never gets presets.ts.
  const matcherTrips: MatcherTrip[] = TRIPS.map((trip) => ({
    id: trip.id,
    kind: trip.kind,
    days: trip.days,
    budget: trip.budget,
    bestMonths: trip.bestMonths,
    flyTo: trip.flyTo,
    title: trip.title[l],
    image: trip.image ? tripImageSm(trip.image) : null,
    srcSet: trip.image ? tripSrcSet(trip.image) : null,
    art: { from: trip.art.from, to: trip.art.to },
    facts: `${t("days", { count: trip.days })} · ${t(`kind.${trip.kind}`)}`,
    budgetMark: budgetMark(trip.budget, shown),
    budgetWords: t(`budget.${BUDGET_KEY[trip.budget]}`, budgetValues(trip.budget, shown, l)),
    best: t("best", { months: monthRanges(trip.bestMonths, l) }),
    gift: tripGiftFields(trip, l),
  }));

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: t("meta.title", { count: TRIPS.length }),
            itemListElement: TRIPS.map((trip, i) => ({ "@type": "ListItem", position: i + 1, name: trip.title[l], url: localizedUrl(locale, `/trips/${trip.id}`) })),
          },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("eyebrow"), url: localizedUrl(locale, "/trips") },
          ]),
        ]}
      />
      {/* Above what follows and not clipped: an airport box's suggestions drop down past the torn edge. The flowers clip themselves. */}
      <section className="relative isolate z-10 -mt-[var(--header-h)] bg-blush-paper pt-[var(--header-h)] text-forest">
        <FloralFrame frame="band" ground="light" />
        <div className="relative container-x pt-12 pb-14 sm:pt-16 lg:pt-20 lg:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:gap-14">
            <div>
              <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
              {/* In em, not ch, so the fallback font wraps it as Newsreader will (platform-hero.tsx): 7.2em is Newsreader's 12ch. */}
              <h1 className="mt-5 max-w-[7.2em] display-hero text-balance">
                {t("h1a")} <em className="text-rose-deep">{t("h1b")}</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>
            </div>
            <div className="rounded-[32px] bg-card p-5 shadow-lift ring-1 ring-forest/5 sm:p-7">
              <h2 className="font-display text-[26px] leading-tight text-forest">{t("finder.title")}</h2>
              <FlightFinder className="mt-5" />
            </div>
          </div>
        </div>
      </section>
      <TornEdge from="var(--brand-paper)" to="var(--brand-paper)" />

      {/* Above the grid, under the flight search. z-[5]: its airport list drops over the grid; the hero's own (z-10) still drops over this. Clipped sideways because a lily lies off its right edge, and this old page has no [data-page-theme] to clip it. */}
      <section id="match" aria-labelledby="match-title" className="relative z-[5] overflow-x-clip bg-paper pt-14 lg:pt-20">
        <ArtLayer items={MATCH_ART} flowers={ROOMS_THEME.flowers} />
        <div className={cn(SPREAD, "lg:items-start")}>
          <Intro id="match-title" label={t("match.label")} heading={t("match.title")} line={t("match.line", { count: TRIPS.length })} />
          <div className="min-w-0 lg:pt-7">
            <TripMatcher trips={matcherTrips} giftSlug={TRIP_GIFT_SLUG} />
          </div>
        </div>
      </section>

      <section id="trips" className="bg-paper py-16 lg:py-24">
        <div className="container-x">
          <p data-reveal className="text-eyebrow text-rose-deep">
            {t("grid.eyebrow")}
          </p>
          <h2 data-reveal className="display-xl mt-4 max-w-[18ch]" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
            {t("grid.title")}
          </h2>
          <TripsGrid className="mt-8" cards={cards} filters={filters} label={t("filter.label")} />
          {/* One quiet row to the pages by where you leave from and by kind, and each links back here. Each group is its
              label and its links: on a phone the label stands over them (it read as a stray word after "Riga"), on a desk
              the two groups sit side by side. The label's padding is the links', so their words line up. */}
          <nav aria-label={t("more.nav")} data-testid="trips-more" className="mt-10 flex flex-col gap-y-3 border-t border-line pt-5 text-[15px] text-forest/75 sm:flex-row sm:flex-wrap sm:gap-x-8">
            <div data-group="from" className="flex flex-wrap items-center gap-x-1">
              <span className="w-full px-1.5 sm:w-auto">{t("more.from")}</span>
              {TRIP_ORIGINS.map((o) => (
                <Link key={o.slug} href={originPath(o)} className="inline-flex min-h-11 items-center px-1.5 font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">
                  {o.name[l]}
                </Link>
              ))}
            </div>
            <div data-group="kinds" className="flex flex-wrap items-center gap-x-1">
              <span className="w-full px-1.5 sm:w-auto">{t("more.kinds")}</span>
              {TRIP_IDEA_KINDS.map((kind) => (
                <Link key={kind} href={ideaPath(kind)} className="inline-flex min-h-11 items-center px-1.5 font-medium text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">
                  {TRIP_IDEA_COPY[kind].nav[l]}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </section>

      <section className="bg-paper pb-20 lg:pb-28">
        <div className="container-x">
          <div data-reveal className="relative isolate overflow-hidden rounded-[36px] px-6 py-12 text-cream sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-16">
            <FloralFrame frame="card" ground="dark" className="-z-10" />
            <div className="relative max-w-2xl">
              <p className="text-eyebrow text-blush">{t("gift.eyebrow")}</p>
              <h2 className="display-xl mt-4 text-cream">{t("gift.title")}</h2>
            </div>
            <div className="relative mt-8 flex shrink-0 flex-col items-start gap-4 lg:mt-0 lg:items-center">
              <span aria-hidden="true" className="hidden size-24 rotate-12 lg:block">
                <Sticker id="heart" />
              </span>
              <Link href={`/templates/${TRIP_GIFT_SLUG}`} className="group btn-rose inline-flex h-14 items-center gap-2 rounded-full px-8 text-base font-semibold transition-[filter] hover:brightness-110">
                {t("gift.cta")}
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The date letter's box, after the gift (gifts come first on this site) and far below the first screen. */}
      <LetterSlot locale={locale} where="trips" />
    </>
  );
}
