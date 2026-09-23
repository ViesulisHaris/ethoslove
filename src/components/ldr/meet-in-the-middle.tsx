"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, ArrowUpRight, Clock3, MoveHorizontal, Plane } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { awakeOverlap, clockOf, halfwayPlace, hoursAhead, milesOf } from "@/lib/dates/apart";
import { toYmd } from "@/lib/dates/calendar";
import { ES_CITY_NAMES } from "@/lib/dates/cities";
import { distanceKm, midpoint, round } from "@/lib/dates/geo";
import { cityName, nearestAirport, type Airport } from "@/lib/trips/airports";
import { flightLinks, weekendAhead, type FlightSite } from "@/lib/trips/flights";
import { CITIES } from "@/templates/_shared/places";
import { WhereBox, type Where } from "@/components/dates/where-box";
import { PartnerLink } from "@/components/trips/partner-link";

/** Further than this from any city we know, the halfway point is somewhere nobody can meet: open sea, or a lot of forest. */
const NOWHERE_KM = 400;
/** Countries never named as the place to meet: neither their cities nor their airports. */
const NEVER_SUGGESTED = new Set(["ES"]);

type Zone = { offset: number; name: string };
/** A town's time zone: `undefined` while it is being asked for, `null` when it could not be. */
type ZoneAnswer = Zone | null | undefined;
/** One flight: on Aviasales, which pays us, and the same search on Google Flights to compare. */
type Hop = { from: Airport; to: Airport; aviasales: string; google: string };

const noop = () => () => {};
const localDay = () => toYmd(new Date());
const ZONE_RETRY_MS = 2000;

/**
 * One town's time zone, from the forecast service. Each town asks on its own: with one request
 * for both, every answer re-ran the request and cancelled the other town's, which then started
 * over; and a failed answer left the clocks card loading for ever.
 */
function useZone(place: Where | null): ZoneAnswer {
  const key = place ? `${round(place.lat, 2)},${round(place.lng, 2)}` : null;
  const [answer, setAnswer] = useState<{ key: string; zone: Zone | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    const [lat, lng] = key.split(",");
    const controller = new AbortController();
    const ask = async (): Promise<Zone | null> => {
      try {
        const res = await fetch(`/api/dates/weather?lat=${lat}&lng=${lng}`, { signal: controller.signal });
        const json = res.ok ? ((await res.json()) as { utcOffsetSeconds?: number; timezone?: string }) : null;
        return typeof json?.utcOffsetSeconds === "number" ? { offset: json.utcOffsetSeconds, name: json.timezone ?? "" } : null;
      } catch {
        return null;
      }
    };
    void (async () => {
      let zone = await ask();
      // Once more after a pause: the forecast service times out now and then, and answers the next time.
      if (!zone && !controller.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, ZONE_RETRY_MS));
        if (!controller.signal.aborted) zone = await ask();
      }
      if (!controller.signal.aborted) setAnswer({ key, zone });
    })();
    return () => controller.abort();
  }, [key]);
  return key && answer?.key === key ? answer.zone : undefined;
}

/**
 * Two towns in, three answers out: how far apart they are, where halfway is (along the curve of
 * the earth, which over a long hop is nowhere near the middle of a flat map), and the hours of the
 * day when both of them are awake. Offsets come from the forecast service, which knows each
 * town's time zone today, daylight saving included.
 */
export function MeetInTheMiddle() {
  const t = useTranslations("ldr.meet");
  const tw = useTranslations("dates.where");
  const tf = useTranslations("trips.flights");
  const ta = useTranslations("affiliate");
  const locale = useLocale() === "es" ? "es" : "en";
  // Aviasales only searches with a date, so each flight is for a long weekend three weeks out, from
  // the visitor's own today; they change it there.
  const today = useSyncExternalStore(noop, localDay, () => undefined);
  const [a, setA] = useState<Where | null>(null);
  const [b, setB] = useState<Where | null>(null);
  const labels = { label: "", placeholder: tw("placeholder"), nearMe: tw("nearMe"), searching: tw("searching"), nothing: tw("nothing"), failed: tw("failed") };
  const zoneA = useZone(a);
  const zoneB = useZone(b);

  const result = useMemo(() => {
    if (!a || !b) return null;
    const km = distanceKm(a, b);
    const middle = midpoint(a, b);
    const place = halfwayPlace(middle, CITIES, { maxKm: NOWHERE_KM, neverNamed: NEVER_SUGGESTED });
    return { km, middle, near: typeof place === "string" ? null : place, unnamed: place === "unnamed" };
  }, [a, b]);
  // Each of them flying to the airport nearest halfway; or, when halfway has no airport of its
  // own (or is one of their home towns), one of them flying to the other. One seat each way.
  const flights = useMemo(() => {
    if (!a || !b || !result) return null;
    const dates = today ? weekendAhead(today) : null;
    const hop = (from: Airport, to: Airport): Hop => {
      const links = flightLinks({ from, to, depart: dates?.depart, back: dates?.back, adults: 1, locale });
      const url = (site: FlightSite) => links.find((l) => l.id === site)?.url ?? "";
      return { from, to, aviasales: url("aviasales"), google: url("google") };
    };
    const fromA = nearestAirport(a)?.airport;
    const fromB = nearestAirport(b)?.airport;
    // Both home to the same airport: close enough that no flight is the answer.
    if (!fromA || !fromB || fromA.iata === fromB.iata) return null;
    const halfway = result.near ? nearestAirport(result.near.city)?.airport : undefined;
    // The site never suggests somewhere in Spain (the owner's rule), so a halfway airport there
    // gives way to the flight between them. Their own home airports are theirs to name.
    const suggestable = halfway && !NEVER_SUGGESTED.has(halfway.country) ? halfway : undefined;
    if (suggestable && fromA.iata !== suggestable.iata && fromB.iata !== suggestable.iata) return { to: suggestable, hops: [hop(fromA, suggestable), hop(fromB, suggestable)] };
    return { to: null, hops: [hop(fromA, fromB)] };
  }, [a, b, result, locale, today]);
  // The city table is in English; a Spanish page says "Ciudad de México", and so does the link to its dates.
  const halfwayName = result?.near ? (locale === "es" ? ES_CITY_NAMES[result.near.city.name] : undefined) ?? result.near.city.name : "";
  const ahead = zoneA && zoneB ? hoursAhead(zoneA.offset, zoneB.offset) : null;
  const windows = zoneA && zoneB ? awakeOverlap(zoneA.offset, zoneB.offset) : null;
  const number = (n: number) => Math.round(n).toLocaleString(locale === "es" ? "es-ES" : "en-GB");
  const hours = (h: number) => String(Math.abs(h)).replace(".5", "½");

  return (
    <div className="rounded-[32px] bg-white p-5 shadow-lift ring-1 ring-forest/5 sm:p-8">
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-forest/60">{t("you")}</p>
          <WhereBox value={a} locale={locale} labels={{ ...labels, label: t("you") }} onPick={setA} />
        </div>
        <MoveHorizontal aria-hidden="true" className="mx-auto mb-3.5 hidden size-5 text-rose-deep sm:block" />
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-forest/60">{t("them")}</p>
          <WhereBox value={b} locale={locale} labels={{ ...labels, label: t("them") }} onPick={setB} />
        </div>
      </div>

      {result && a && b ? (
        <div className="mt-7 grid gap-4 lg:grid-cols-3" aria-live="polite">
          <div className="rounded-[24px] bg-blush-paper p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-rose-deep uppercase">
              <Plane aria-hidden="true" className="size-4" />
              {t("apart")}
            </p>
            <p className="mt-3 font-display text-[40px] leading-none text-forest tabular-nums">{number(result.km)} km</p>
            <p className="mt-1.5 text-[14px] text-forest/60">{t("miles", { miles: number(milesOf(result.km)) })}</p>
          </div>

          <div className="rounded-[24px] bg-blush-paper p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-rose-deep uppercase">
              <MoveHorizontal aria-hidden="true" className="size-4" />
              {t("halfway")}
            </p>
            {result.near ? (
              <>
                <p className="mt-3 font-display text-[32px] leading-[1.05] text-forest">{halfwayName}</p>
                <p className="mt-1.5 text-[14px] text-forest/60">{result.near.km < 40 ? t("halfwayExact") : t("halfwayNear", { km: number(result.near.km) })}</p>
                <Link href={`/dates?lat=${result.near.city.lat}&lng=${result.near.city.lng}&q=${encodeURIComponent(halfwayName)}`} className="group mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
                  {t("datesThere", { city: halfwayName })}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 font-display text-[26px] leading-[1.1] text-forest">{result.unnamed ? t("eachWay", { km: number(result.km / 2) }) : t("nowhere")}</p>
                <p className="mt-1.5 text-[14px] leading-snug text-forest/60">{result.unnamed ? t("eachWaySub") : t("nowhereSub")}</p>
                <Link href={`/dates?lat=${b.lat}&lng=${b.lng}&q=${encodeURIComponent(b.name)}`} className="group mt-2 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-rose-deep underline-offset-4 hover:underline">
                  {t("datesThere", { city: b.name })}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          <div className="rounded-[24px] bg-blush-paper p-5">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-rose-deep uppercase">
              <Clock3 aria-hidden="true" className="size-4" />
              {t("clocks")}
            </p>
            {zoneA === null || zoneB === null ? (
              <p className="mt-3 text-[14.5px] leading-snug text-forest/70">{t("clocksUnavailable")}</p>
            ) : ahead === null || !windows ? (
              <p className="mt-3 h-10 w-40 animate-pulse rounded-lg bg-forest/10" />
            ) : (
              <>
                <p className="mt-3 font-display text-[26px] leading-[1.1] text-forest">{ahead === 0 ? t("sameTime") : ahead > 0 ? t("ahead", { name: b.name, hours: hours(ahead) }) : t("behind", { name: b.name, hours: hours(ahead) })}</p>
                <p className="mt-2 text-[14px] leading-snug text-forest/65">
                  {/* Each range through the messages: Spanish says "de 13:00 a 23:00", where a dash after "de" read as a slip. */}
                  {windows.length === 0 ? t("neverAwake") : t("bothAwake", { windows: windows.map(([from, to]) => t("range", { from: clockOf(from), to: clockOf(to) })).join(` ${t("and")} `) })}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-[14.5px] text-forest/65">{t("hint")}</p>
      )}

      {result && flights ? (
        <div className="mt-4 rounded-[24px] bg-blush-paper p-5" data-testid="meet-flights">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-rose-deep uppercase">
              <Plane aria-hidden="true" className="size-4" />
              {flights.to ? t("flightsTo", { city: cityName(flights.to, locale) }) : t("flightsBetween")}
            </p>
            <div className="flex flex-col gap-2">
              {flights.hops.map((f) => (
                <div key={f.from.iata} className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <PartnerLink partner="aviasales" placement="meet_middle" href={f.aviasales} className="group inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-forest ring-1 ring-forest/10 transition-colors hover:bg-rose-mist">
                    {cityName(f.from, locale)} → {cityName(f.to, locale)}
                    <span className="font-medium text-forest/65">· Aviasales</span>
                    <ArrowUpRight aria-hidden="true" className="size-4 text-rose-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span className="sr-only">({tf("newTab")})</span>
                  </PartnerLink>
                  <a href={f.google} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-forest/75 ring-1 ring-forest/10 transition-colors hover:bg-white">
                    Google Flights
                    <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span className="sr-only">
                      ({cityName(f.from, locale)} → {cityName(f.to, locale)}, {tf("newTab")})
                    </span>
                  </a>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-snug text-forest/60">
            {ta("meet.via")} {ta("disclosure")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
