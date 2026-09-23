"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeftRight, ArrowUpRight, Minus, Plus, TrainFront, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { toYmd } from "@/lib/dates/calendar";
import { distanceKm } from "@/lib/dates/geo";
import { findAirport, type Airport } from "@/lib/trips/airports";
import { estimateFlight, flightLinks, formatFlightTime, MAX_ADULTS, MIN_ADULTS, trainHint, weekendAhead } from "@/lib/trips/flights";
import { readLastFrom, saveLastFrom } from "@/lib/trips/last-from";
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
export function FlightFinder({ from: fromCode, to: toCode, placement = "trips_finder", className }: Props) {
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
  const dates = picked ?? (today ? weekendAhead(today) : null) ?? { depart: "", back: "" };

  // A frame after mount, so the first render in the browser is the same as the server's.
  useEffect(() => {
    if (fromCode) return;
    const frame = requestAnimationFrame(() => {
      const last = readLastFrom();
      if (last) setFrom((current) => current ?? last);
    });
    return () => cancelAnimationFrame(frame);
  }, [fromCode]);

  const pickFrom = (a: Airport) => {
    setFrom(a);
    saveLastFrom(a);
  };
  const swap = () => {
    setFrom(to);
    setTo(from);
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
          className="col-start-2 row-span-2 row-start-1 grid size-11 place-items-center rounded-full border border-forest/10 bg-white text-rose-deep shadow-soft transition-transform hover:bg-rose-mist active:scale-95 @md:row-span-1"
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
        <div className="col-span-2 flex h-14 items-center justify-between gap-1 rounded-2xl border border-forest/15 bg-white px-1.5 @xl:col-span-1">
          <button type="button" onClick={() => setAdults((n) => Math.max(MIN_ADULTS, n - 1))} disabled={adults <= MIN_ADULTS} aria-label={t("fewer")} className="grid size-11 place-items-center rounded-xl text-forest hover:bg-rose-mist disabled:opacity-35 disabled:hover:bg-transparent">
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <span className="flex items-center gap-2 px-1 text-[15px] font-medium whitespace-nowrap text-forest" aria-live="polite">
            <Users aria-hidden="true" className="size-4 text-rose-deep" />
            {t("travellers", { count: adults })}
          </span>
          <button type="button" onClick={() => setAdults((n) => Math.min(MAX_ADULTS, n + 1))} disabled={adults >= MAX_ADULTS} aria-label={t("more")} className="grid size-11 place-items-center rounded-xl text-forest hover:bg-rose-mist disabled:opacity-35 disabled:hover:bg-transparent">
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
              <PartnerLink key={link.id} partner={link.partner} placement={placement} href={link.url} className={cn(BUTTON, press, "btn-rose hover:brightness-110 @md:col-span-3")}>
                {content}
              </PartnerLink>
            ) : (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={cn(BUTTON, press, "bg-white text-forest ring-1 ring-forest/15 hover:bg-rose-mist")}>
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
      <p className="mt-2 text-[12.5px] leading-snug text-forest/60">{t("smallPrint")}</p>
    </div>
  );
}
