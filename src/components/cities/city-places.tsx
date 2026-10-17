import { formatDistance } from "@/lib/dates/geo";
import { GROUP_IDS, GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Ranked } from "@/lib/dates/rank";
import { mapHref } from "@/lib/cities/cities";
import { byGroup, type GroupCounts } from "@/lib/cities/places";
import { GroupIcon } from "@/components/dates/group-icon";
import { CityCta } from "./city-cta";

type Props = {
  places: Ranked[];
  counts: GroupCounts;
  locale: "en" | "es";
  city: string;
  labels: { counts: string; fromCentre: (distance: string) => string };
};

/**
 * The real places near a city's centre, by the map's own groups, each opening the map on itself.
 * Above them, how many of each kind the map knows round there: the part of the page that says
 * what this city is like for a date in numbers rather than adjectives.
 */
export function CityPlaceList({ places, counts, locale, city, labels }: Props) {
  const known = byGroup(places);
  const tally = GROUP_IDS.flatMap((group) => ((counts[group] ?? 0) > 0 ? [[group, counts[group] ?? 0] as const] : [])).sort(([, a], [, b]) => b - a);
  return (
    <div>
      {tally.length > 0 ? (
        <div>
          <p className="text-[12px] font-semibold tracking-wide text-forest/50 uppercase">{labels.counts}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tally.map(([group, n]) => (
              <li key={group} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13.5px] font-semibold text-forest shadow-soft ring-1 ring-forest/5">
                <GroupIcon group={group} className="size-4" />
                <span style={{ color: GROUPS[group].color }}>{n.toLocaleString(locale)}</span>
                <span className="font-medium text-forest/70">{GROUPS[group].label[locale]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="city-places">
        {known.map(({ group, places: inGroup }) => (
          <section key={group} className="rounded-[28px] bg-white p-5 shadow-soft ring-1 ring-forest/5 sm:p-6">
            <h3 className="flex items-center gap-2.5 font-display text-[22px] leading-tight text-forest">
              <span className="grid size-9 place-items-center rounded-full" style={{ backgroundColor: GROUPS[group].soft, color: GROUPS[group].color }}>
                <GroupIcon group={group} className="size-[18px]" />
              </span>
              {GROUPS[group].label[locale]}
            </h3>
            <ul className="mt-3 grid">
              {inGroup.map((place) => (
                <li key={place.id} className="border-t border-line first:border-t-0">
                  <CityCta href={mapHref(place, place.name)} cta="place" city={city} className="group flex min-h-11 flex-col justify-center py-2.5">
                    <span className="text-[15px] font-semibold text-forest underline-offset-4 group-hover:underline">{place.name}</span>
                    <span className="text-[13px] text-forest/60">
                      {KINDS[place.kind].label[locale]} · {labels.fromCentre(formatDistance(place.distanceKm, locale))}
                    </span>
                  </CityCta>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
