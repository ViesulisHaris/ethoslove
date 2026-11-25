import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { getTripIdeaKind, ideaPath, ideaTrips, TRIP_IDEA_KINDS } from "@/lib/trips/idea-kinds";
import { originPath, TRIP_ORIGINS } from "@/lib/trips/origins";
import { getTrip, TRIPS } from "@/lib/trips/presets";
import { TRIP_IDEA_COPY, TRIP_IDEAS_UI } from "@/content/trip-ideas";
import { fill, TRIP_ORIGIN_UI } from "@/content/trip-origins";
import { CARDS_ART } from "@/components/marketing/spread/placements";
import { MoreRow } from "@/components/marketing/spread/sections";
import { JsonLd } from "@/components/shared/json-ld";
import { ROOM_BACK, tripPicture } from "@/components/trips/page/origin-page";
import { ROOM_BUTTON, ROOM_ROW_LINK, RoomFoot, RoomHero, RoomPage, RoomSpread } from "@/components/trips/page/room-page";
import { TripCards } from "@/components/trips/page/trip-cards";

/** Built for the two kinds the trips' data makes; any other slug is a 404 (notFound below). */
export function generateStaticParams() {
  return TRIP_IDEA_KINDS.map((kind) => ({ kind }));
}

type Props = PageProps<"/[currency]/[locale]/trips/ideas/[kind]">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale, kind: slug } = await params;
  const kind = getTripIdeaKind(slug);
  if (!kind) return {};
  const l = locale === "es" ? "es" : "en";
  const copy = TRIP_IDEA_COPY[kind];
  return pageMetadata({ locale, path: ideaPath(kind), title: fill(copy.title[l], { count: ideaTrips(kind).length }), description: copy.description[l] });
}

/**
 * Trips of one kind (weekend getaways, road trips), for the people searching for exactly that:
 * only the trips that truly fit, read from their own data, each a picture card with one line of
 * why. The other two kinds searched are not pages (lib/trips/idea-kinds.ts says why).
 */
export default async function TripIdeaPage({ params }: Props) {
  const { locale, kind: slug } = await params;
  const kind = getTripIdeaKind(slug);
  if (!kind) notFound();
  setRequestLocale(locale);
  const l = locale === "es" ? "es" : "en";
  const t = await getTranslations("trips");
  const ui = TRIP_IDEAS_UI[l];
  const copy = TRIP_IDEA_COPY[kind];
  const trips = ideaTrips(kind);
  const count = trips.length;
  const heading = copy.heading[l];
  const url = localizedUrl(locale, ideaPath(kind));
  const hero = getTrip(copy.hero)!;
  const heroPicture = tripPicture(hero);
  const cards = trips.map((trip) => ({
    id: trip.id,
    href: `/trips/${trip.id}`,
    title: trip.title[l],
    label: fill(ui.label, { days: t("days", { count: trip.days }), kind: t(`kind.${trip.kind}`) }),
    line: copy.fits[trip.id][l],
    ...tripPicture(trip),
  }));

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: heading,
            itemListElement: trips.map((trip, i) => ({ "@type": "ListItem", position: i + 1, name: trip.title[l], url: localizedUrl(locale, `/trips/${trip.id}`) })),
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
          <a href="#ideas-list" className={ROOM_BUTTON}>
            {TRIP_ORIGIN_UI[l].button}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </RoomHero>

        <RoomSpread id="ideas-title" sectionId="ideas-list" label={copy.listLabel[l]} heading={fill(copy.listHeading[l], { count })} line={ui.listLine} art={CARDS_ART}>
          <TripCards id="ideas-row" columns={kind === "weekend-getaways" ? 2 : 3} cards={cards} />
        </RoomSpread>

        <RoomFoot id="ideas-more" label={ui.footLabel} heading={ui.footHeading}>
          <ul className="flex flex-wrap gap-x-6 leading-8">
            {TRIP_IDEA_KINDS.filter((k) => k !== kind).map((k) => (
              <li key={k}>
                <Link href={ideaPath(k)} className={ROOM_ROW_LINK}>
                  {TRIP_IDEA_COPY[k].nav[l]}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/trips" className={`${ROOM_ROW_LINK} font-medium`}>
                {fill(ui.all, { count: TRIPS.length })}
              </Link>
            </li>
          </ul>
          <nav aria-label={ui.from} className="mt-6 border-t border-page-line pt-4">
            <p className="text-page-label text-page-body">{ui.from}</p>
            <ul className="mt-1 flex flex-wrap gap-x-6 leading-8">
              {TRIP_ORIGINS.map((o) => (
                <li key={o.slug}>
                  <Link href={originPath(o)} className={ROOM_ROW_LINK}>
                    {o.name[l]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8 border-t border-page-line">
            <MoreRow summary={copy.whySummary[l]}>
              <p>{copy.whyBody[l]}</p>
            </MoreRow>
          </div>
        </RoomFoot>
      </RoomPage>
    </>
  );
}
