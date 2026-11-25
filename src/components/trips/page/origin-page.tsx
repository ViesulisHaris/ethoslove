import type { Metadata } from "next";
import { ArrowDown, ArrowLeft, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { formatFlightTime } from "@/lib/trips/flights";
import { monthRanges } from "@/lib/trips/months";
import { originPath, TRIP_ORIGINS, tripsFrom, type OriginTrip, type TripOrigin } from "@/lib/trips/origins";
import { getTrip, tripImageSm, TRIPS, tripSrcSet, type Trip } from "@/lib/trips/presets";
import { fill, TRIP_ORIGIN_COPY, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { TRIP_IDEA_COPY } from "@/content/trip-ideas";
import { ideaPath, TRIP_IDEA_KINDS } from "@/lib/trips/idea-kinds";
import { CARDS_ART } from "@/components/marketing/spread/placements";
import { MoreRow } from "@/components/marketing/spread/sections";
import { JsonLd } from "@/components/shared/json-ld";
import { QUESTION_PLUS, QUESTION_ROW } from "@/components/templates/page/sections";
import { ROOM_BUTTON, ROOM_ROW_LINK, RoomFoot, RoomHero, RoomPage, RoomSpread } from "./room-page";
import { TripCards, type TripCardItem } from "./trip-cards";

/** How many of the twelve are cards; the rest are one closed row under them. */
const SHOWN = 6;

/** The back link to /trips on a designed page, in the page's colours. */
export const ROOM_BACK = "group -ml-2 mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-page-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink";

export function originMetadata(origin: TripOrigin, locale: string): Metadata {
  const l = locale === "es" ? "es" : "en";
  const ui = TRIP_ORIGIN_UI[l];
  const city = origin.name[l];
  return pageMetadata({ locale, path: originPath(origin), title: fill(ui.title[origin.phrase], { city }), description: fill(ui.description, { city, count: TRIPS.length }) });
}

/** A trip's picture for a card or the hero: its own photograph, or its two colours where it has none yet. */
export function tripPicture(trip: Trip): { image: string | null; srcSet: string | null; art: { from: string; to: string } } {
  return { image: trip.image ? tripImageSm(trip.image) : null, srcSet: trip.image ? tripSrcSet(trip.image) : null, art: { from: trip.art.from, to: trip.art.to } };
}

/**
 * `/trips/from-<city>`: the twelve trips nearest first for a couple leaving from one city. Hero
 * (its two true sentences, the nearest trip's photograph), the six closest as picture cards with
 * hours in the air or "a train works" and the best months, the other six in one closed row, and a
 * last band of the other cities, the kinds and the method, folded. Served by the trip route
 * (trips/[id]/page.tsx): a folder cannot be half a segment.
 */
export async function OriginPage({ origin, locale }: { origin: TripOrigin; locale: "en" | "es" }) {
  const t = await getTranslations({ locale, namespace: "trips" });
  const l = locale;
  const ui = TRIP_ORIGIN_UI[l];
  const copy = TRIP_ORIGIN_COPY[origin.slug];
  const city = origin.name[l];
  const ranked = tripsFrom(origin).map((o) => ({ o, trip: getTrip(o.id)! }));
  const heading = fill(ui.heading, { count: TRIPS.length, city });
  const label = (o: OriginTrip): string => (o.home ? ui.home : o.train ? ui.train : fill(ui.air, { time: formatFlightTime(o.airMinutes ?? 0) }));
  const best = (trip: Trip): string => t("best", { months: monthRanges(trip.bestMonths, l) });
  const cards: TripCardItem[] = ranked.slice(0, SHOWN).map(({ o, trip }) => ({ id: trip.id, href: `/trips/${trip.id}`, title: trip.title[l], label: label(o), line: best(trip), ...tripPicture(trip) }));
  const rest = ranked.slice(SHOWN);
  // The hero shows the nearest trip that is a journey: the one that starts here is the page's first line already.
  const hero = (ranked.find((r) => !r.o.home) ?? ranked[0]).trip;
  const heroPicture = tripPicture(hero);
  const url = localizedUrl(locale, originPath(origin));

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: heading,
            itemListElement: ranked.map(({ trip }, i) => ({ "@type": "ListItem", position: i + 1, name: trip.title[l], url: localizedUrl(locale, `/trips/${trip.id}`) })),
          },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("eyebrow"), url: localizedUrl(locale, "/trips") },
            { name: heading, url },
          ]),
        ]}
      />
      <RoomPage>
        <RoomHero
          label={t("eyebrow")}
          heading={heading}
          line={copy.line[l]}
          sentence={copy.sentence[l]}
          picture={{ src: hero.image ?? heroPicture.image ?? "", srcSet: heroPicture.srcSet ?? undefined, from: hero.art.from, to: hero.art.to }}
          note={hero.title[l]}
          back={
            <Link href="/trips" className={ROOM_BACK}>
              <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" />
              {t("detail.back")}
            </Link>
          }
        >
          <a href="#from-list" className={ROOM_BUTTON}>
            {ui.button}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </RoomHero>

        <RoomSpread id="from-title" sectionId="from-list" label={ui.listLabel} heading={ui.listHeading} line={ui.listLine} art={CARDS_ART}>
          <TripCards id="from-row" columns={3} cards={cards} />
          <details className="group mt-9 border-y border-page-line">
            <summary className={QUESTION_ROW}>
              {fill(ui.rest, { rest: rest.length })}
              <Plus aria-hidden="true" className={`${QUESTION_PLUS} motion-reduce:transition-none`} strokeWidth={1.6} />
            </summary>
            <ol className="pb-5">
              {rest.map(({ o, trip }) => (
                <li key={trip.id} data-trip={trip.id} className="flex flex-wrap items-baseline justify-between gap-x-6 border-t border-page-line first:border-t-0">
                  <Link href={`/trips/${trip.id}`} className={ROOM_ROW_LINK}>
                    {trip.title[l]}
                  </Link>
                  <span className="pb-2 text-[0.9375rem] text-page-body sm:pb-0">
                    {label(o)} · {best(trip)}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        </RoomSpread>

        <RoomFoot id="from-more" label={ui.footLabel} heading={ui.footHeading}>
          <nav aria-label={ui.from}>
            <ul className="flex flex-wrap gap-x-6 leading-8">
              {TRIP_ORIGINS.filter((o) => o.slug !== origin.slug).map((o) => (
                <li key={o.slug}>
                  <Link href={originPath(o)} className={ROOM_ROW_LINK}>
                    {o.name[l]}
                  </Link>
                </li>
              ))}
              {TRIP_IDEA_KINDS.map((kind) => (
                <li key={kind}>
                  <Link href={ideaPath(kind)} className={ROOM_ROW_LINK}>
                    {TRIP_IDEA_COPY[kind].nav[l]}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/dates/${origin.city}`} className={ROOM_ROW_LINK}>
                  {fill(ui.dates, { city })}
                </Link>
              </li>
              <li>
                <Link href="/trips" className={`${ROOM_ROW_LINK} font-medium`}>
                  {fill(ui.all, { count: TRIPS.length })}
                </Link>
              </li>
            </ul>
          </nav>
          <div className="mt-8 border-t border-page-line">
            <MoreRow summary={ui.hoursSummary}>
              <p>{ui.hoursBody}</p>
            </MoreRow>
          </div>
        </RoomFoot>
      </RoomPage>
    </>
  );
}
