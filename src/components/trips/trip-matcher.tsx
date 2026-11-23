"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";
import { cityName, type Airport } from "@/lib/trips/airports";
import { formatFlightTime } from "@/lib/trips/flights";
import { readLastFrom, saveLastFrom } from "@/lib/trips/last-from";
import { MATCH_LENGTHS, topMatches, type MatchLength, type MatchTrip, type MatchWish } from "@/lib/trips/match";
import type { TripKind } from "@/lib/trips/presets";
import { IdeasDots } from "@/components/templates/page/ideas-dots";
import { AirportBox } from "./airport-box";
import { SurpriseLink } from "./surprise-link";

export type MatcherTrip = MatchTrip & {
  title: string;
  /** The small copy (tripImageSm) and its srcset (tripSrcSet), worked out on the server; null where a trip has no photograph. */
  image: string | null;
  srcSet: string | null;
  art: { from: string; to: string };
  /** "3 days · City break", in the page's language. */
  facts: string;
  budgetMark: string;
  budgetWords: string;
  /** "Best Mar–Jun, Sept–Oct": monthRanges runs on the server only. */
  best: string;
  /** tripGiftFields(trip, locale): what "Make it a surprise" starts the ticket with. */
  gift: Record<string, unknown>;
};

type Length = MatchLength | "any";
type Budget = "any" | "1" | "2";
type Kind = TripKind | "any";

const LENGTHS: readonly Length[] = ["any", ...MATCH_LENGTHS];
const BUDGETS: readonly Budget[] = ["any", "1", "2"];
const KINDS: readonly Kind[] = ["any", "city", "road", "islands", "train"];

/** A choice set into the sentence: a rose word in a pill, as wide as what it says, never wider than the line. */
const SELECT =
  "mx-1 inline-block h-11 max-w-full cursor-pointer appearance-none truncate rounded-full border border-page-line bg-page-raised px-4 align-middle font-sans text-[1rem] leading-normal font-medium text-page-accent field-sizing-content transition-colors hover:border-page-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink";

const wishOf = (from: Airport | null, length: Length, budget: Budget, kind: Kind): MatchWish => ({
  from,
  ...(length !== "any" ? { length } : {}),
  ...(budget !== "any" ? { budget: Number(budget) as 1 | 2 } : {}),
  ...(kind !== "any" ? { kind } : {}),
});

/**
 * "Where should we go together?": an airport and a sentence of three choices rank the twelve trips
 * (lib/trips/match.ts) and show the best three, each with the hours in the air from their airport.
 * Never a fare: there is no fare data, by design. Nothing is asked of a server; the trips come in
 * as props, worked out on the server, so the browser never gets presets.ts.
 */
export function TripMatcher({ trips, giftSlug }: { trips: MatcherTrip[]; giftSlug: string }) {
  const t = useTranslations("trips.match");
  const tf = useTranslations("trips.flights");
  const ts = useTranslations("trips.detail.surprise");
  const locale: "en" | "es" = useLocale() === "es" ? "es" : "en";
  const [from, setFrom] = useState<Airport | null>(null);
  const [length, setLength] = useState<Length>("any");
  const [budget, setBudget] = useState<Budget>("any");
  const [kind, setKind] = useState<Kind>("any");
  // The month the ranking is for: read when the button is pressed, never while rendering, so the
  // server's page and the browser's agree. Null until then, and nothing is shown.
  const [month, setMonth] = useState<number | null>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);

  // A frame after mount, so the first render in the browser is the same as the server's.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const last = readLastFrom();
      if (last) setFrom((current) => current ?? last);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const wish = wishOf(from, length, budget, kind);
  const result = useMemo(() => (month === null ? null : topMatches(wishOf(from, length, budget, kind), trips, month)), [from, length, budget, kind, trips, month]);
  const byId = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);
  const shownIds = result?.picks.map((p) => p.id).join() ?? "";

  // New picks start the row (a phone's one-card row) at its first card again.
  useEffect(() => {
    const row = document.getElementById("match-row");
    if (row) row.scrollLeft = 0;
  }, [shownIds]);

  // Counted: which wishes, and whether an airport was given. Never which airport.
  const count = (next: MatchWish) => track("trip_match", { length: next.length ?? "any", budget: next.budget ?? 0, kind: next.kind ?? "any", hasOrigin: Boolean(next.from) });
  // After the first tap a change re-ranks at once, and is counted as a new ask.
  const changed = (next: MatchWish) => {
    if (month !== null) count(next);
  };

  const go = () => {
    setMonth(new Date().getMonth() + 1);
    count(wish);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const summary = result?.summary;
  const heading = !summary
    ? ""
    : summary.kind === "all"
      ? t("allFit")
      : summary.kind === "some"
        ? t("someFit", { count: summary.count })
        : t("letGo", { wishes: new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(summary.letGo.map((w) => t(`wish.${w}`))) });

  return (
    <div data-trip-matcher>
      <div className="max-w-md">
        <AirportBox
          direction="from"
          label={t("from")}
          placeholder={tf("placeholder")}
          nothing={tf("nothing")}
          locale={locale}
          value={from}
          onPick={(a) => {
            setFrom(a);
            saveLastFrom(a);
            changed(wishOf(a, length, budget, kind));
          }}
        />
        <p className="mt-2 flex min-h-11 flex-wrap items-center gap-x-3 text-[0.875rem] text-page-body">
          {from ? (
            <button
              type="button"
              onClick={() => {
                setFrom(null);
                changed(wishOf(null, length, budget, kind));
              }}
              className="inline-flex min-h-11 items-center rounded-sm font-medium text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink"
            >
              {t("clearFrom")}
            </button>
          ) : (
            t("fromHint")
          )}
        </p>
      </div>

      <p data-match-sentence className="mt-4 font-display text-[1.375rem] leading-[3.25rem] text-page-ink sm:text-2xl sm:leading-[3.5rem]">
        {t.rich("sentence", {
          length: () => (
            <select
              aria-label={t("lengthLabel")}
              value={length}
              onChange={(e) => {
                const v = e.target.value as Length;
                setLength(v);
                changed(wishOf(from, v, budget, kind));
              }}
              className={SELECT}
            >
              {LENGTHS.map((v) => (
                <option key={v} value={v}>
                  {t(`length.${v}`)}
                </option>
              ))}
            </select>
          ),
          budget: () => (
            <select
              aria-label={t("budgetLabel")}
              value={budget}
              onChange={(e) => {
                const v = e.target.value as Budget;
                setBudget(v);
                changed(wishOf(from, length, v, kind));
              }}
              className={SELECT}
            >
              {BUDGETS.map((v) => (
                <option key={v} value={v}>
                  {t(`budget.${v}`)}
                </option>
              ))}
            </select>
          ),
          kind: () => (
            <select
              aria-label={t("kindLabel")}
              value={kind}
              onChange={(e) => {
                const v = e.target.value as Kind;
                setKind(v);
                changed(wishOf(from, length, budget, v));
              }}
              className={SELECT}
            >
              {KINDS.map((v) => (
                <option key={v} value={v}>
                  {t(`kind.${v}`)}
                </option>
              ))}
            </select>
          ),
        })}
      </p>

      <button
        type="button"
        data-match-go
        onClick={go}
        className="mt-5 inline-flex h-12 items-center gap-1.5 rounded-full bg-page-accent px-6 text-[0.9375rem] font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,scale] duration-200 hover:bg-page-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink active:scale-[0.98] motion-reduce:transition-none"
      >
        {t("go")}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </button>

      {result ? (
        <div data-match-result className="mt-9">
          <h3 ref={summaryRef} tabIndex={-1} data-match-summary className="font-display text-2xl leading-tight text-page-ink outline-none">
            {heading}
          </h3>
          <ol
            id="match-row"
            className="-mx-5 mt-4 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-1 pb-2 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-x-6"
          >
            {result.picks.map((pick, i) => {
              const trip = byId.get(pick.id)!;
              const why = !from ? null : pick.home ? t("home") : pick.airMinutes ? t(pick.train ? "airTrain" : "air", { time: formatFlightTime(pick.airMinutes), city: cityName(from, locale) }) : null;
              return (
                <li key={pick.id} data-card data-pick data-trip={pick.id} className="group/pick flex w-full shrink-0 snap-start flex-col sm:w-auto">
                  <Link href={`/trips/${pick.id}`} onClick={() => track("trip_match_pick", { trip: pick.id, to: "page" })} className="group block rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-page-ink">
                    <span
                      className="relative block aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-page-band shadow-page-card transition-[translate,box-shadow] duration-300 ease-(--ease-out-quint) group-hover:shadow-page-lift motion-reduce:transition-none pointer-fine:group-hover:-translate-y-1"
                      style={{ background: `linear-gradient(160deg, ${trip.art.from} 0%, ${trip.art.to} 100%)` }}
                    >
                      {trip.image ? (
                        <img
                          src={trip.image}
                          srcSet={trip.srcSet ?? undefined}
                          sizes="(min-width: 1280px) 260px, (min-width: 640px) 30vw, 90vw"
                          alt=""
                          width={800}
                          height={600}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : null}
                      <span className="absolute bottom-3 left-3 inline-flex h-8 items-center rounded-full bg-black/45 px-3 text-[0.875rem] font-medium text-white backdrop-blur-sm">{pick.inSeason ? t("inSeason") : trip.best}</span>
                    </span>
                    <span className="mt-3.5 block font-display text-xl leading-tight text-page-ink">{trip.title}</span>
                  </Link>
                  <p className="mt-1.5 text-page-label text-page-body">
                    {trip.facts} · <span aria-hidden="true">{trip.budgetMark}</span>
                    <span className="sr-only">{trip.budgetWords}</span>
                  </p>
                  {why ? (
                    <p data-why className="mt-2.5 text-[0.9375rem] leading-relaxed text-page-body">
                      {why}
                    </p>
                  ) : null}
                  <SurpriseLink
                    slug={giftSlug}
                    fields={trip.gift}
                    onPick={() => track("trip_match_pick", { trip: pick.id, to: "surprise" })}
                    className={cn(
                      "mt-3 inline-flex h-11 items-center justify-center gap-1.5 self-start rounded-full px-5 text-[0.9375rem] font-medium transition-[background-color,border-color,opacity,scale] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink active:scale-[0.98] motion-reduce:transition-none max-sm:w-full",
                      i === 0
                        ? "bg-page-accent text-page-on-accent hover:bg-page-accent-hover"
                        : "border border-page-ink/30 text-page-ink hover:border-page-ink/50 hover:bg-page-raised lg:pointer-fine:opacity-0 lg:pointer-fine:group-focus-within/pick:opacity-100 lg:pointer-fine:group-hover/pick:opacity-100",
                    )}
                  >
                    {ts("cta")}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </SurpriseLink>
                </li>
              );
            })}
          </ol>
          <IdeasDots key={shownIds} target="match-row" count={result.picks.length} className="mt-3 sm:hidden" />
        </div>
      ) : null}
    </div>
  );
}
