import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { monthRanges } from "@/lib/trips/months";
import { TRIP_KINDS, TRIPS, type Trip } from "@/lib/trips/presets";
import { TRIP_GIFT_SLUG } from "@/lib/trips/trip-gift";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { FloralFrame, TornEdge } from "@/components/marketing/home/cutouts";
import { JsonLd } from "@/components/shared/json-ld";
import { FlightFinder } from "@/components/trips/flight-finder";
import { TripCard } from "@/components/trips/trip-card";
import { TripsGrid } from "@/components/trips/trips-grid";

const BUDGET_KEY = { 1: "low", 2: "mid", 3: "high" } as const satisfies Record<Trip["budget"], string>;

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/trips">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trips.meta" });
  return pageMetadata({ locale, path: "/trips", title: t("title"), description: t("description") });
}

/** Trips: the flight search on the first screen, then twelve trips to pick from, then the gift they can become. */
export default async function TripsPage({ params }: PageProps<"/[currency]/[locale]/trips">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trips");
  const l = locale === "es" ? "es" : "en";

  const cards = TRIPS.map((trip) => ({
    id: trip.id,
    kind: trip.kind,
    card: (
      <TripCard
        trip={trip}
        title={trip.title[l]}
        blurb={trip.blurb[l]}
        labels={{
          kind: t(`kind.${trip.kind}`),
          days: t("days", { count: trip.days }),
          stops: t("stops", { count: trip.stops.length }),
          best: t("best", { months: monthRanges(trip.bestMonths, l) }),
          budget: t(`budget.${BUDGET_KEY[trip.budget]}`),
        }}
      />
    ),
  }));
  const filters = [{ value: "all" as const, label: t("filter.all") }, ...TRIP_KINDS.map((k) => ({ value: k, label: t(`filter.${k}`) }))];

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: t("meta.title"),
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
                {t("h1a")} <em className="text-rose">{t("h1b")}</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-forest/75 sm:text-xl">{t("sub")}</p>
            </div>
            <div className="rounded-[32px] bg-white p-5 shadow-lift ring-1 ring-forest/5 sm:p-7">
              <h2 className="font-display text-[26px] leading-tight text-forest">{t("finder.title")}</h2>
              <p className="mt-1 text-[14.5px] leading-snug text-forest/60">{t("finder.sub")}</p>
              <FlightFinder className="mt-5" />
            </div>
          </div>
        </div>
      </section>
      <TornEdge from="#FFE9EC" to="var(--brand-paper)" />

      <section id="trips" className="bg-paper py-16 lg:py-24">
        <div className="container-x">
          <p data-reveal className="text-eyebrow text-rose-deep">
            {t("grid.eyebrow")}
          </p>
          <h2 data-reveal className="display-xl mt-4 max-w-[18ch]" style={{ "--reveal-delay": "70ms" } as React.CSSProperties}>
            {t("grid.title")}
          </h2>
          <TripsGrid className="mt-8" cards={cards} filters={filters} label={t("filter.label")} />
        </div>
      </section>

      <section className="bg-paper pb-20 lg:pb-28">
        <div className="container-x">
          <div data-reveal className="relative isolate overflow-hidden rounded-[36px] px-6 py-12 text-cream sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-16">
            <FloralFrame frame="band" ground="dark" className="-z-10" />
            <div className="relative max-w-2xl">
              <p className="text-eyebrow text-blush">{t("gift.eyebrow")}</p>
              <h2 className="display-xl mt-4 text-cream">{t("gift.title")}</h2>
              <p className="mt-4 text-[16.5px] leading-relaxed text-cream/75">{t("gift.sub")}</p>
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
    </>
  );
}
