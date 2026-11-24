"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";
import { cityName, type Airport } from "@/lib/trips/airports";
import { formatFlightTime } from "@/lib/trips/flights";
import { clearLastFrom, onLastFromPicked, readLastFrom, saveLastFrom } from "@/lib/trips/last-from";
import { MATCH_LENGTHS, metWishes, nextBestMonth, topMatches, type MatchLength, type MatchPick, type MatchTrip, type MatchWish } from "@/lib/trips/match";
import { MATCH_KINDS, readMatchLink, writeMatchLink, type MatchState } from "@/lib/trips/match-link";
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
const KINDS: readonly Kind[] = ["any", ...MATCH_KINDS];

/**
 * A budget band's ceiling a day for two: the €150 and €300 of the trips' own bands
 * (lib/trips/presets.ts), in euros on every page. Each card says its band in euros (the trips are
 * all in the euro's Europe), so a sentence in dollars above "€150–300" would be two currencies at once.
 */
const BUDGET_EUR: Record<1 | 2, number> = { 1: 150, 2: 300 };

/**
 * A choice set into the sentence: a rose word in a pill, as wide as what it says, never wider than
 * the line. No margin: the sentence's own spaces stand either side, and the comma or full stop after
 * it sits in the same unbreakable run (the message wraps it in the choice's tag).
 */
const SELECT =
  "inline-block h-11 max-w-full cursor-pointer appearance-none truncate rounded-full border border-page-line bg-page-raised px-4 align-middle font-sans text-[1rem] leading-normal font-medium text-page-accent field-sizing-content transition-colors hover:border-page-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink";

/** After the first ask, a change is counted once the choices have stood this long: one event per settled ask, not one per select. */
export const REFINE_MS = 1500;

/**
 * False until a matcher has mounted in this page load. The first mount is a hydration, which must
 * render what the server did, so it reads the address a frame later; a mount after that (Back from a
 * trip, inside the app) reads it at once, so the three are there before the browser puts the scroll back.
 */
let mountedBefore = false;
const readAddress = (): MatchState | null => readMatchLink(new URLSearchParams(window.location.search));
const noop = () => () => {};
const isLength = (v: string): v is Length => (LENGTHS as readonly string[]).includes(v);
const isBudget = (v: string): v is Budget => (BUDGETS as readonly string[]).includes(v);
const isKind = (v: string): v is Kind => (KINDS as readonly string[]).includes(v);
const thisMonth = () => new Date().getMonth() + 1;

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
  // The answer in the address, read at once on a mount after the first (see mountedBefore).
  const [linked] = useState(() => (mountedBefore ? readAddress() : null));
  const [from, setFrom] = useState<Airport | null>(linked?.from ?? null);
  const [length, setLength] = useState<Length>(linked?.length ?? "any");
  const [budget, setBudget] = useState<Budget>(linked?.budget ? (String(linked.budget) as Budget) : "any");
  const [kind, setKind] = useState<Kind>(linked?.kind ?? "any");
  // The month the ranking is for: read when the button is pressed (or the address carries an answer),
  // never while hydrating, so the server's page and the browser's agree. Null until then, and nothing is shown.
  const [month, setMonth] = useState<number | null>(() => (linked ? thisMonth() : null));
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  const lengthRef = useRef<HTMLSelectElement>(null);
  const budgetRef = useRef<HTMLSelectElement>(null);
  const kindRef = useRef<HTMLSelectElement>(null);
  // False until the page's script runs: before that the button can do nothing, so it says so.
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const firstMount = useRef(!mountedBefore);
  const refineTimer = useRef<number | undefined>(undefined);

  // A frame after the first mount, so its first render is the same as the server's: the answer the
  // address carries, else what was chosen in the selects before the script arrived (on a slow phone
  // they can be turned before it runs, and the next render would put them back to "any"), and the
  // airport they last flew from.
  // What the selects say the moment the page's script has taken them over, before any render (the
  // button's own, once ready) can put them back to the server's "any".
  const chosen = useRef<{ length: string; budget: string; kind: string } | null>(null);
  useLayoutEffect(() => {
    chosen.current = { length: lengthRef.current?.value ?? "any", budget: budgetRef.current?.value ?? "any", kind: kindRef.current?.value ?? "any" };
  }, []);

  useEffect(() => {
    mountedBefore = true;
    if (linked) return;
    const frame = requestAnimationFrame(() => {
      const fromAddress = firstMount.current ? readAddress() : null;
      const before = chosen.current;
      // Only where nothing has been chosen since: a select turned after the script arrived wins.
      if (!fromAddress && before) {
        if (isLength(before.length)) setLength((current) => (current === "any" ? (before.length as Length) : current));
        if (isBudget(before.budget)) setBudget((current) => (current === "any" ? (before.budget as Budget) : current));
        if (isKind(before.kind)) setKind((current) => (current === "any" ? (before.kind as Kind) : current));
      }
      if (fromAddress) {
        setFrom(fromAddress.from);
        setLength(fromAddress.length ?? "any");
        setBudget(fromAddress.budget ? (String(fromAddress.budget) as Budget) : "any");
        setKind(fromAddress.kind ?? "any");
        setMonth(thisMonth());
        return;
      }
      const last = readLastFrom();
      if (last) setFrom((current) => current ?? last);
    });
    return () => cancelAnimationFrame(frame);
  }, [linked]);

  // The hero's flight search on /trips has its own "From": an airport picked there is this one's too.
  useEffect(() => onLastFromPicked((a) => setFrom(a)), []);

  // Once there is an answer, the address carries it: a reload, or Back from a trip, opens on the same three.
  useEffect(() => {
    if (month === null) return;
    const url = new URL(window.location.href);
    const state: MatchState = { from, length: length === "any" ? null : length, budget: budget === "any" ? null : (Number(budget) as 1 | 2), kind: kind === "any" ? null : kind };
    const search = writeMatchLink(url.searchParams, state).toString();
    if (url.search === `?${search}`) return;
    window.history.replaceState(window.history.state, "", `${url.pathname}?${search}${url.hash}`);
  }, [month, from, length, budget, kind]);

  const money = (band: 1 | 2) => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(BUDGET_EUR[band]);
  const monthName = (m: number) => new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, m - 1, 15)));

  const wish = wishOf(from, length, budget, kind);
  const result = useMemo(() => (month === null ? null : topMatches(wishOf(from, length, budget, kind), trips, month)), [from, length, budget, kind, trips, month]);
  const byId = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);
  const shownIds = result?.picks.map((p) => p.id).join() ?? "";

  // New picks start the row (a phone's one-card row) at its first card again.
  useEffect(() => {
    const row = document.getElementById("match-row");
    if (row) row.scrollLeft = 0;
  }, [shownIds]);

  // Counted: which wishes, and whether an airport was given. Never which airport. The first ask is
  // counted at its tap; after it a change re-ranks at once but is counted only once the choices have
  // settled, marked "refined", so one person turning the selects makes one more event, not five.
  const count = (next: MatchWish, refined = false) =>
    track("trip_match", { length: next.length ?? "any", budget: next.budget ?? 0, kind: next.kind ?? "any", hasOrigin: Boolean(next.from), ...(refined ? { refined: true } : {}) });
  const changed = (next: MatchWish) => {
    if (month === null) return;
    window.clearTimeout(refineTimer.current);
    refineTimer.current = window.setTimeout(() => count(next, true), REFINE_MS);
  };
  useEffect(() => () => window.clearTimeout(refineTimer.current), []);

  const list = (items: string[]) => new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  // Why this pick, in words that are its own and not the heading's: which wishes it lets go of
  // (where the heading does not already say so for all three), or that it is one that fits all of
  // it; then its season, the month it starts. Never the select's own words again: the heading has
  // said they fit. Then the hours in the air when there is an airport.
  const fitLine = (pick: MatchPick, trip: MatcherTrip) => {
    const met = metWishes(wish, pick);
    const summaryKind = result?.summary.kind;
    const fit = pick.relaxed.length
      ? summaryKind === "none"
        ? ""
        : met.length
          ? t("allBut", { wishes: list(pick.relaxed.map((w) => t(`wish.${w}`))) })
          : t("closest")
      : met.length && summaryKind === "some"
        ? t("fitsAll")
        : "";
    const next = month === null || pick.inSeason ? null : nextBestMonth(trip.bestMonths, month);
    // In season, the picture's badge says so: the line says it only when it has nothing else to say.
    const season = next ? t("fitsLater", { month: monthName(next) }) : fit ? "" : t("fitsSeason");
    return [fit, season].filter(Boolean).join(" ");
  };

  const go = () => {
    window.clearTimeout(refineTimer.current);
    setMonth(thisMonth());
    count(wish);
    // To the answer's heading, unless they have already moved on (to the airport box, say): taking
    // the focus from a box being typed in settled it on whatever had been typed.
    requestAnimationFrame(() => {
      const at = document.activeElement;
      if (!at || at === document.body || at === goRef.current) summaryRef.current?.focus();
    });
  };

  const summary = result?.summary;
  const heading = !summary
    ? ""
    : summary.kind === "all"
      ? t("allFit")
      : summary.kind === "some"
        ? t("someFit", { count: summary.count })
        : summary.kind === "closest"
          ? t("closestAll")
          : t("letGo", { wishes: list(summary.letGo.map((w) => t(`wish.${w}`))) });

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
                // Forgotten too, or the next visit (and another tab) would open on it again.
                clearLastFrom();
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
          length: (after) => (
            <span className="whitespace-nowrap">
              <select
                ref={lengthRef}
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
              {after}
            </span>
          ),
          budget: (after) => (
            <span className="whitespace-nowrap">
              <select
                ref={budgetRef}
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
                    {v === "any" ? t("budget.any") : t(`budget.${v}`, { money: money(Number(v) as 1 | 2) })}
                  </option>
                ))}
              </select>
              {after}
            </span>
          ),
          kind: (after) => (
            <span className="whitespace-nowrap">
              <select
                ref={kindRef}
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
              {after}
            </span>
          ),
        })}
      </p>

      <button
        type="button"
        data-match-go
        ref={goRef}
        onClick={go}
        disabled={!ready}
        aria-busy={!ready || undefined}
        className="mt-5 inline-flex h-12 items-center gap-1.5 rounded-full bg-page-accent px-6 text-[0.9375rem] font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,scale,opacity] duration-200 hover:bg-page-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-page-accent disabled:active:scale-100 motion-reduce:transition-none"
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
              const air = !from ? null : pick.home ? t("home") : pick.airMinutes ? t(pick.train ? "airTrain" : "air", { time: formatFlightTime(pick.airMinutes), city: cityName(from, locale) }) : null;
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
                      <span data-season className="absolute right-3 bottom-3 left-3 w-fit rounded-2xl bg-black/45 px-3 py-1.5 text-[0.875rem] leading-snug font-medium text-white backdrop-blur-sm">
                        {pick.inSeason ? `${t("inSeason")} · ${trip.best}` : trip.best}
                      </span>
                    </span>
                    <span className="mt-3.5 block font-display text-xl leading-tight text-page-ink">{trip.title}</span>
                  </Link>
                  <p className="mt-1.5 text-page-label text-page-body">
                    {trip.facts} · <span aria-hidden="true">{trip.budgetMark}</span>
                    <span className="sr-only">{trip.budgetWords}</span>
                  </p>
                  <p data-why className="mt-2.5 text-[0.9375rem] leading-relaxed text-page-body">
                    <span data-fit>{fitLine(pick, trip)}</span>
                    {air ? <span data-air> {air}</span> : null}
                  </p>
                  <SurpriseLink
                    slug={giftSlug}
                    fields={trip.gift}
                    onPick={() => track("trip_match_pick", { trip: pick.id, to: "surprise" })}
                    className={cn(
                      "mt-3 h-11 items-center justify-center gap-1.5 self-start rounded-full px-5 text-[0.9375rem] font-medium transition-[background-color,border-color,opacity,scale] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink active:scale-[0.98] motion-reduce:transition-none max-sm:w-full",
                      // One button in the three (DESIGN-LESS-TEXT: no card with a button in each): the
                      // first card's. On a desk with a mouse the others show theirs on hover or focus;
                      // elsewhere their picture and name lead to the trip, which has the same button.
                      i === 0
                        ? "inline-flex bg-page-accent text-page-on-accent hover:bg-page-accent-hover"
                        : "hidden border border-page-ink/30 text-page-ink hover:border-page-ink/50 hover:bg-page-raised lg:pointer-fine:inline-flex lg:pointer-fine:opacity-0 lg:pointer-fine:group-focus-within/pick:opacity-100 lg:pointer-fine:group-hover/pick:opacity-100",
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
