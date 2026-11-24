"use client";
/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";
import { saveGiftSeed } from "@/lib/editor/gift-seed";
import { answerPlace, type HalfwayAnswer } from "@/lib/ldr/halfway";
import type { Town } from "@/lib/ldr/halfway-link";
import { cityPageNear, HALFWAY_GIFT_SLUG, halfwayGiftFields, tripNear, type WaysData } from "@/lib/ldr/ways";
import { IdeasDots } from "@/components/templates/page/ideas-dots";

export type WayKey = "gift" | "dates" | "trip";
type Way = { key: WayKey; href: string; title: string; image: string | null; style?: CSSProperties; seed?: () => void; /** Where the picture is held in its square. */ focus?: string };

/**
 * The Halfway poster (1170 x 1800) held on its map alone: the sky, the arc of hearts and the two
 * houses, from y 430 to 1120. Above that is its own sample "6,863 km between you"; below, the
 * sample names and towns (Iván, Clara, LISBON, BOSTON), which under a couple's real answer would read
 * as theirs. In a square (one card to a screen, or three in a row) it is enlarged 1.7 times about
 * its centre; in the wider 3:2 of two in a row, 1.13 times.
 */
export const GIFT_POSTER_FOCUS = "origin-center object-[50%_30%] scale-[1.7]";
export const GIFT_POSTER_FOCUS_WIDE = "origin-center object-[50%_30%] scale-[1.7] sm:object-[50%_38%] sm:scale-[1.13]";

const TO = { gift: "halfway_gift", dates: "dates", trip: "trip" } as const;

/**
 * The ways on from a halfway city, each a picture and a title: the Halfway gift, made of the two
 * towns and a line for the middle; date ideas there (its own page where it is one of our cities);
 * and a trip for the next visit, the one whose route starts nearest. Before the towns are known
 * each still leads somewhere honest: the gift's page, the dates, the trips. A card is a label, a
 * title and a picture: no paragraph, no button. On a phone they are one row, one to a screen; on a
 * desk three stand in a row of squares, and two share the whole width in wider pictures, so no
 * third of the row is left empty.
 */
export function WaysOn({
  a,
  b,
  answer,
  data,
  ways,
  from,
  rowId,
  className,
}: {
  a: Town | null;
  b: Town | null;
  answer: HalfwayAnswer | null;
  data: WaysData;
  ways: readonly WayKey[];
  from: "halfway_tool" | "long_distance";
  rowId: string;
  className?: string;
}) {
  const t = useTranslations("ldr.ways");
  const both = a && b ? { a, b } : null;
  const two = ways.length === 2;
  // The place the answer names (the table's city or the map's town), already in the page's language.
  const near = answerPlace(answer);
  const city = near?.name ?? "";

  const gift = (): Way => ({
    key: "gift",
    href: both ? `/create/${HALFWAY_GIFT_SLUG}` : `/templates/${HALFWAY_GIFT_SLUG}`,
    title: t("gift.title"),
    image: data.giftPoster,
    // The poster (1170 x 1800) opens on its own "6,863 km between you", which under the couple's real
    // answer reads as theirs: the square is held below it (y 384 to 1554), on the map of the two towns.
    focus: two ? GIFT_POSTER_FOCUS_WIDE : GIFT_POSTER_FOCUS,
    seed: both ? () => saveGiftSeed({ slug: HALFWAY_GIFT_SLUG, fields: halfwayGiftFields(both.a, both.b, near ? t("note", { city }) : undefined) }) : undefined,
  });

  const dates = (): Way => {
    if (!both) return { key: "dates", href: "/dates", title: t("dates.any"), image: data.datesImage };
    if (near) {
      const page = cityPageNear(near, data.cities);
      if (page) return { key: "dates", href: `/dates/${page.slug}`, title: t("dates.in", { city: page.name }), image: page.image };
      return { key: "dates", href: `/dates?lat=${near.lat}&lng=${near.lng}&q=${encodeURIComponent(city)}`, title: t("dates.in", { city }), image: data.datesImage };
    }
    // Halfway falls in a country never named: no town is echoed either (a typed town there would be
    // named after all), only date ideas near either of them.
    if (answer?.kind === "unnamed") return { key: "dates", href: "/dates", title: t("dates.any"), image: data.datesImage };
    // No place to name (open sea, open country, their own towns, the map not answering yet): date ideas where the other one is.
    return { key: "dates", href: `/dates?lat=${both.b.lat}&lng=${both.b.lng}&q=${encodeURIComponent(both.b.name)}`, title: t("dates.near", { town: both.b.name }), image: data.datesImage };
  };

  const trip = (): Way => {
    const found = both ? tripNear([near, both.a, both.b], data.trips) : null;
    if (found) return { key: "trip", href: `/trips/${found.id}`, title: found.title, image: found.image, style: { background: `linear-gradient(160deg, ${found.art.from} 0%, ${found.art.to} 100%)` } };
    const first = data.trips[0];
    return { key: "trip", href: "/trips", title: t("trip.any"), image: first?.image ?? null, style: first ? { background: `linear-gradient(160deg, ${first.art.from} 0%, ${first.art.to} 100%)` } : undefined };
  };

  const make = { gift, dates, trip };
  const shown = ways.map((key) => make[key]());

  return (
    <>
      <ul
        id={rowId}
        className={cn(
          "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-1 pb-2 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:gap-x-5 sm:overflow-visible sm:px-0 sm:pb-0",
          two ? "sm:grid-cols-2" : "sm:grid-cols-3",
          className,
        )}
      >
        {shown.map((way, i) => (
          <li key={way.key} data-card data-pick data-way={way.key} className="w-full shrink-0 snap-start sm:w-auto">
            <Link
              href={way.href}
              onClick={() => {
                way.seed?.();
                track("room_handoff", { from, to: TO[way.key] });
              }}
              className="group block rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-page-ink"
            >
              <span
                className={cn(
                  "relative block aspect-square overflow-hidden rounded-[1.25rem] bg-page-band shadow-page-card transition-[translate,box-shadow] duration-300 ease-(--ease-out-quint) group-hover:shadow-page-lift motion-reduce:transition-none pointer-fine:group-hover:-translate-y-1",
                  two && "sm:aspect-[3/2]",
                )}
                style={way.style}
              >
                {way.image ? (
                  <img src={way.image} alt="" width={640} height={640} loading={i === 0 ? "eager" : "lazy"} decoding="async" className={cn("absolute inset-0 size-full object-cover", way.focus ?? "object-[50%_32%]")} />
                ) : null}
              </span>
              <span className="mt-3.5 block text-page-label text-page-body">{t(`${way.key}.label`)}</span>
              <span className="mt-1.5 block font-display text-xl leading-tight text-page-ink">{way.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <IdeasDots key={ways.length} target={rowId} count={ways.length} className="mt-3 sm:hidden" />
    </>
  );
}
