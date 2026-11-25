"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeftRight, ArrowUpRight, Minus, Plus, TrainFront, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { toYmd } from "@/lib/dates/calendar";
import { distanceKm } from "@/lib/dates/geo";
import { cityName, findAirport, type Airport } from "@/lib/trips/airports";
import { estimateFlight, flightLinks, formatFlightTime, MAX_ADULTS, MIN_ADULTS, trainHint, weekendAhead } from "@/lib/trips/flights";
import { onLastFromPicked, readLastFrom, saveLastFrom } from "@/lib/trips/last-from";
import { PARTNER_NAMES, type PartnerPlacement } from "@/lib/trips/partners";
import { AirportBox } from "./airport-box";
import { DateRangePicker, type DateRangeLabels } from "./date-range-picker";
import { PartnerLink } from "./partner-link";

type Props = {
  /** IATA codes (or city names) to start with; "from" otherwise starts where they last flew from. */
  from?: string;
  to?: string;
  /** Where the finder sits, for counting which spot's Aviasales button gets pressed. */
  placement?: PartnerPlacement;
  /** The preset trip whose page the link is on (its id, like a template's slug). */
  trip?: string;
  /** On a trip's page, the trip's nights: the first dates come home the day the plan ends. A long weekend elsewhere. */
  nights?: number;
  /**
   * On a trip's page whose plan flies home from somewhere else (presets.ts, `flyHome`): the first
   * search is one way out, and one button turns it into the flight home from there on the plan's
   * last day, so no search books a flight home from a city the couple left days before.
   */
  homeFrom?: string;
  /** Told which way the search now runs, so the row's heading can say it (flights-row.tsx). */
  onLeg?: (leg: "out" | "home") => void;
  className?: string;
};

const COMPARE = ["Google Flights", "Skyscanner", "Kayak"];
const BUTTON = "flex h-14 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold whitespace-nowrap";
const noop = () => () => {};
const localDay = () => toYmd(new Date());

/**
 * Two airports, two dates and how many of you, then the same search on four sites. Nothing is
 * sold or fetched here: the buttons are plain links that open Aviasales (which pays us), then
 * Google Flights, Skyscanner or Kayak, already filled in, and the fares are whatever they say. It
 * lays itself out by its own width, so it sits in a hero card or across a page.
 */
export function FlightFinder({ from: fromCode, to: toCode, placement = "trips_finder", trip, nights, homeFrom, onLeg, className }: Props) {
  const t = useTranslations("trips.flights");
  const ta = useTranslations("affiliate");
  const locale: "en" | "es" = useLocale() === "es" ? "es" : "en";
  const [from, setFrom] = useState<Airport | null>(() => (fromCode ? findAirport(fromCode) : null));
  const [to, setTo] = useState<Airport | null>(() => (toCode ? findAirport(toCode) : null));
  const [picked, setPicked] = useState<{ depart: string; back: string } | null>(null);
  const [adults, setAdults] = useState(2);
  const dateRow = useRef<HTMLDivElement>(null);
  // No date before today, and today is the visitor's: on the server there is no minimum at all.
  const today = useSyncExternalStore(noop, localDay, () => undefined);
  // A search without dates finds no fares, so until they pick their own the dates are a long
  // weekend three weeks out. Worked out from the visitor's today, which the server doesn't know, so
  // the server's render and the first one in the browser both show empty boxes and agree.
  const planned = today ? weekendAhead(today, nights) : null;
  const ends = homeFrom ? findAirport(homeFrom) : null;
  // Which way the search runs where the plan ends elsewhere: out to the trip's start, or home from its end.
  const [leg, setLeg] = useState<"out" | "home">("out");
  const dates = picked ?? (planned ? (ends ? { depart: planned.depart, back: "" } : planned) : null) ?? { depart: "", back: "" };

  // A frame after mount, so the first render in the browser is the same as the server's.
  useEffect(() => {
    if (fromCode) return;
    const frame = requestAnimationFrame(() => {
      const last = readLastFrom();
      if (last) setFrom((current) => current ?? last);
    });
    return () => cancelAnimationFrame(frame);
  }, [fromCode]);

  // On /trips the matcher has its own "Leaving from": an airport picked there is this one's too.
  useEffect(() => {
    if (fromCode) return;
    return onLastFromPicked((a) => setFrom(a));
  }, [fromCode]);

  const pickFrom = (a: Airport) => {
    setFrom(a);
    saveLastFrom(a);
  };
  const swap = () => {
    setFrom(to);
    setTo(from);
  };
  // Home from where the plan ends, to wherever they flew from, on the plan's last day; and back again.
  const searchHome = () => {
    if (!ends) return;
    setTo(from && from.iata !== ends.iata ? from : null);
    setFrom(ends);
    // Their own return date if they picked one, else the day the plan ends.
    const back = picked?.back || planned?.back || "";
    setPicked(back ? { depart: back, back: "" } : null);
    setLeg("home");
    onLeg?.("home");
  };
  const searchOut = () => {
    setFrom(to);
    setTo(toCode ? findAirport(toCode) : null);
    setPicked(null);
    setLeg("out");
    onLeg?.("out");
  };

  const same = Boolean(from && to && from.iata === to.iata);
  const km = from && to ? distanceKm(from, to) : 0;
  const links = from && to && !same ? flightLinks({ from, to, depart: dates.depart || undefined, back: dates.back || undefined, adults, locale }) : null;
  const number = (n: number) => Math.round(n).toLocaleString(locale === "es" ? "es-ES" : "en-GB");
  const boxLabels = { placeholder: t("placeholder"), nothing: t("nothing"), locale };
  const dateLabels: DateRangeLabels = {
    start: t("depart"),
    end: t("return"),
    optional: t("optional"),
    title: t("picker.title"),
    add: t("picker.add"),
    roundTrip: t("picker.roundTrip"),
    oneWay: t("picker.oneWay"),
    tripType: t("picker.tripType"),
    quick: t("picker.quick"),
    thisWeekend: t("picker.thisWeekend"),
    nextWeekend: t("picker.nextWeekend"),
    weekAway: t("picker.weekAway"),
    nights: (count) => t("picker.nights", { count }),
    pickStart: t("picker.pickStart"),
    pickEnd: t("picker.pickEnd"),
    clear: t("picker.clear"),
    done: t("picker.done"),
    close: t("picker.close"),
    previous: t("picker.previous"),
    next: t("picker.next"),
    today: t("picker.today"),
  };

  return (
    <div className={cn("@container", className)} data-testid="flight-finder">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 @md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="col-start-1 row-start-1">
          <AirportBox direction="from" label={t("from")} value={from} onPick={pickFrom} {...boxLabels} />
        </div>
        <button
          type="button"
          onClick={swap}
          aria-label={t("swap")}
          title={t("swap")}
          className="col-start-2 row-span-2 row-start-1 grid size-11 place-items-center rounded-full border border-forest/10 bg-card text-rose-deep shadow-soft transition-transform hover:bg-blush-paper active:scale-95 @md:row-span-1"
        >
          <ArrowLeftRight aria-hidden="true" className="size-[18px] rotate-90 @md:rotate-0" />
        </button>
        <div className="col-start-1 row-start-2 @md:col-start-3 @md:row-start-1">
          <AirportBox direction="to" label={t("to")} value={to} onPick={setTo} {...boxLabels} />
        </div>
      </div>

      {/* Two dates side by side even in a 280px card: a date box needs about 105px, so the padding and the icon give way first. */}
      <div ref={dateRow} className="mt-2.5 grid grid-cols-2 gap-2.5 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <DateRangePicker
          className="col-span-2"
          value={{ start: dates.depart, end: dates.back }}
          onChange={(range) => setPicked({ depart: range.start, back: range.end })}
          today={today}
          locale={locale}
          labels={dateLabels}
          allowOneWay
          alignTo={dateRow}
        />
        <div className="col-span-2 flex h-14 items-center justify-between gap-1 rounded-2xl border border-forest/15 bg-card px-1.5 @xl:col-span-1">
          <button type="button" onClick={() => setAdults((n) => Math.max(MIN_ADULTS, n - 1))} disabled={adults <= MIN_ADULTS} aria-label={t("fewer")} className="grid size-11 place-items-center rounded-xl text-forest hover:bg-blush-paper disabled:opacity-35 disabled:hover:bg-transparent">
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <span className="flex items-center gap-2 px-1 text-[15px] font-medium whitespace-nowrap text-forest" aria-live="polite">
            <Users aria-hidden="true" className="size-4 text-rose-deep" />
            {t("travellers", { count: adults })}
          </span>
          <button type="button" onClick={() => setAdults((n) => Math.min(MAX_ADULTS, n + 1))} disabled={adults >= MAX_ADULTS} aria-label={t("more")} className="grid size-11 place-items-center rounded-xl text-forest hover:bg-blush-paper disabled:opacity-35 disabled:hover:bg-transparent">
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 @md:grid-cols-3">
        {links ? (
          links.map((link) => {
            const content = (
              <>
                {link.partner ? ta("searchOn", { site: link.name }) : link.name}
                <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                <span className="sr-only">({t("newTab")})</span>
              </>
            );
            const press = "group transition-[transform,filter,background-color] active:scale-[0.98]";
            return link.partner ? (
              <PartnerLink key={link.id} partner={link.partner} placement={placement} trip={trip} href={link.url} className={cn(BUTTON, press, "btn-rose hover:brightness-110 @md:col-span-3")}>
                {content}
              </PartnerLink>
            ) : (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={cn(BUTTON, press, "bg-card text-forest ring-1 ring-forest/15 hover:bg-blush-paper")}>
                {content}
              </a>
            );
          })
        ) : (
          <>
            <span aria-disabled="true" className={cn(BUTTON, "border border-dashed border-forest/20 text-forest/35 @md:col-span-3")}>
              {ta("searchOn", { site: PARTNER_NAMES.aviasales })}
            </span>
            {COMPARE.map((name) => (
              <span key={name} aria-disabled="true" className={cn(BUTTON, "border border-dashed border-forest/20 text-forest/35")}>
                {name}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="mt-3 min-h-11 text-[14px] leading-snug text-forest/70" aria-live="polite">
        {same ? (
          <p>{t("same")}</p>
        ) : links ? (
          <>
            <p className="font-medium text-forest">
              {t("distance", { km: number(km) })} · {t("airTime", { time: formatFlightTime(estimateFlight(km)) })}
            </p>
            {trainHint(km) ? (
              <p className="mt-1 flex items-center gap-1.5 text-forest/65">
                <TrainFront aria-hidden="true" className="size-4 shrink-0 text-rose-deep" />
                {t("train")}
              </p>
            ) : null}
          </>
        ) : (
          <p>{t("pick")}</p>
        )}
      </div>
      {ends ? (
        <div data-testid="flight-leg" className="mt-1 flex flex-wrap items-center justify-between gap-x-4 border-t border-forest/10 pt-2 text-[14px] leading-snug text-forest/70">
          <p className="py-2">{leg === "out" ? t("endsIn", { city: cityName(ends, locale) }) : t("homeFrom", { city: cityName(ends, locale) })}</p>
          <button
            type="button"
            onClick={leg === "out" ? searchHome : searchOut}
            className="-mx-2 inline-flex min-h-11 items-center rounded-full px-2 font-medium text-rose-deep underline decoration-rose-deep/30 underline-offset-4 transition-colors hover:decoration-rose-deep active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest motion-reduce:transition-none"
          >
            {leg === "out" ? t("searchHome", { city: cityName(ends, locale) }) : t("searchOut")}
          </button>
        </div>
      ) : null}
      <p className="mt-2 text-[12.5px] leading-snug text-forest/65">{t("smallPrint")}</p>
    </div>
  );
}
