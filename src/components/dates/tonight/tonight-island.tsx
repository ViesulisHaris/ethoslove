"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addDays, thisWeekend } from "@/lib/dates/calendar";
import type { DateKind } from "@/lib/dates/date-kinds";
import { datesUrls } from "@/lib/dates/early";
import type { Place } from "@/lib/dates/places";
import { mergePlaces } from "@/lib/dates/tiles";
import type { Forecast } from "@/lib/dates/weather";
import { readStoredWhere, writeStoredWhere } from "@/lib/dates/where-store";
import { WhereBox, type Where } from "@/components/dates/where-box";
import { TonightForm, type TonightWhen } from "./tonight-form";
import { TonightResult } from "./tonight-result";
import { useTonight, type TonightData, type TonightProblemKind } from "./use-tonight";

type Props = {
  /** A city's page: the place is fixed. Absent on a page by kind: the visitor says where. */
  place?: { lat: number; lng: number; name: string };
  kind?: DateKind;
  boost?: Readonly<Record<string, number>>;
  /** Where "open the map" goes when nothing can be planned. */
  mapHref: string;
};

/** The search radius of a city's page and of the dates map's first look. */
const RADIUS_M = 1500;
/** The rare finds' servers are often busy: no page waits for them longer than this. */
const RARE_WAIT_MS = 2500;
/**
 * The place search reads the map's tiles; a cold one can take a while, but past this the planner
 * says it cannot load the places (with Try again and the map) instead of spinning on. The server
 * gives up at 20 s (api/dates/search maxDuration) and keeps what it found for the next try.
 */
export const SEARCH_WAIT_MS = 12_000;

const QUIET = "inline-flex min-h-11 min-w-11 items-center text-page-ink underline decoration-page-line underline-offset-4 hover:decoration-page-ink";

/** What the planner says when it cannot give a plan, and the way on from there. */
export function TonightProblem({ problem, mapHref, offerTomorrow, ofKind, whenLabel, near, onRetry, onTomorrow }: { problem: TonightProblemKind; mapHref?: string; offerTomorrow?: boolean; ofKind?: boolean; whenLabel?: string; near?: number; onRetry: () => void; onTomorrow: () => void }) {
  const t = useTranslations("dates");
  const map = mapHref ? (
    <Link href={mapHref} className={QUIET}>
      {t("tonight.openMap")}
    </Link>
  ) : null;
  return (
    <p className="mt-4 text-[0.9375rem] text-page-body">
      {problem === "failed" ? (
        <>
          {t("places.error")}{" "}
          <button type="button" onClick={onRetry} className={QUIET}>
            {t("places.retry")}
          </button>
          {map ? <> · {map}</> : null}
        </>
      ) : problem === "late" ? (
        <>
          {t("tonight.late")}{" "}
          <button type="button" onClick={onTomorrow} className={QUIET}>
            {t("tonight.tryTomorrow")}
          </button>
        </>
      ) : (
        <>
          {near ? t("tonight.noneNear", { minutes: near }) : ofKind && whenLabel ? t("tonight.noneKind", { when: whenLabel }) : t("tonight.none")}{" "}
          {/* Two ways on, kept together: a wrapped line never starts with a separator. */}
          <span className="inline-flex flex-wrap gap-x-5">
            {offerTomorrow ? (
              <button type="button" onClick={onTomorrow} className={QUIET}>
                {t("tonight.tryTomorrow")}
              </button>
            ) : null}
            {map}
          </span>
        </>
      )}
    </p>
  );
}

/**
 * The one-step planner for a page that has no map of its own: a city's page (the place is the city),
 * a page by kind and a city-by-kind page. It asks for nothing until "Plan it" is pressed, then for
 * the places, the forecast and the rare finds once per place, kept for the next tap.
 */
export function TonightIsland({ place, kind, boost, mapHref }: Props) {
  const t = useTranslations("dates");
  const locale = useLocale() === "es" ? "es" : "en";
  const [where, setWhere] = useState<(Where & { share: boolean }) | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cache = useRef<{ url: string; data: TonightData } | null>(null);
  const whereRef = useRef<HTMLDivElement>(null);

  // Last time's place, read after the first render: the server knows nothing of it.
  useEffect(() => {
    if (place) return;
    const stored = readStoredWhere();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after hydration
    if (stored) setWhere(stored);
  }, [place]);

  const at = place ?? where;
  const placeKey = at ? `${at.lat},${at.lng}` : "";

  const load = async (): Promise<TonightData | null> => {
    if (!at) return null;
    const urls = datesUrls(at, RADIUS_M, locale);
    if (cache.current?.url === urls.search) return cache.current.data;
    const json = <T,>(r: Response): Promise<T | null> => (r.ok ? (r.json() as Promise<T>) : Promise.resolve(null));
    // One deadline for the search and the forecast: past it they are given up, never waited on.
    const stop = new AbortController();
    const deadline = setTimeout(() => stop.abort(), SEARCH_WAIT_MS);
    const rareFetch = fetch(urls.rare)
      .then((r) => json<{ places?: Place[] }>(r))
      .then((j) => (Array.isArray(j?.places) ? j.places : []))
      .catch(() => [] as Place[]);
    const rare = Promise.race([rareFetch, new Promise<Place[]>((resolve) => setTimeout(() => resolve([]), RARE_WAIT_MS))]);
    const weather = fetch(urls.weather, { signal: stop.signal })
      .then((r) => json<Forecast>(r))
      .then((j) => (j && Array.isArray(j.days) ? j : null))
      .catch(() => null);
    try {
      const res = await fetch(urls.search, { signal: stop.signal });
      const found = await json<{ places?: Place[] }>(res);
      if (!found || !Array.isArray(found.places)) return null;
      const near = await rare;
      const data = { places: mergePlaces(found.places, near), forecast: await weather };
      cache.current = { url: urls.search, data };
      // Rare finds that come after the wait still count for the next tap (Another day, Plan tomorrow).
      if (near.length === 0) {
        void rareFetch.then((more) => {
          if (more.length > 0 && cache.current?.url === urls.search) cache.current = { url: urls.search, data: { ...cache.current.data, places: mergePlaces(found.places!, more) } };
        });
      }
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(deadline);
    }
  };

  const tonight = useTonight({
    kind,
    boost,
    dayOf: (w, today) => (w === "tomorrow" ? addDays(today, 1) : w === "weekend" ? thisWeekend(today) : today),
    load,
    whereName: place ? place.name : where?.share ? where.name : undefined,
    keyOf: () => placeKey,
    currentKey: placeKey,
    // Back from /plan, or a reload, shows the plan again (a named place only, never "near me").
    remember: true,
    // "Near me" in the where box is a position already had: the distance uses it before asking again.
    position: () => (where && !where.share ? { lat: where.lat, lng: where.lng } : null),
  });

  const nearMe = () => {
    if (!("geolocation" in navigator)) return setNotice(t("where.noGeo"));
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setWhere({ lat: position.coords.latitude, lng: position.coords.longitude, name: t("where.nearYou"), share: false });
      },
      () => {
        setLocating(false);
        setNotice(t("where.denied"));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  const whens: { value: TonightWhen; label: string }[] = [
    { value: "tonight", label: t("tonight.when.tonight") },
    { value: "tomorrow", label: t("tonight.when.tomorrow") },
    { value: "weekend", label: t("tonight.when.weekend") },
  ];
  const whereLabels = { label: t("where.label"), placeholder: t("where.placeholder"), nearMe: t("where.nearMe"), searching: t("where.searching"), nothing: t("where.nothing"), failed: t("where.failed") };

  return (
    <div className="min-w-0">
      {place ? null : (
        <div ref={whereRef} className="mb-3 max-w-xl">
          <WhereBox
            value={where}
            locale={locale}
            labels={whereLabels}
            locating={locating}
            size="lg"
            onPick={(w) => {
              const picked = { ...w, share: true };
              setWhere(picked);
              // Kept, as the dates map keeps it: Back from the plan, a reload and the next page by kind start here.
              writeStoredWhere(picked);
            }}
            onNearMe={nearMe}
          />
          {notice ? (
            <p role="status" className="mt-2 text-sm text-destructive">
              {notice}
            </p>
          ) : null}
        </div>
      )}
      <TonightForm
        choice={tonight.choice}
        when={tonight.when}
        whens={whens}
        ofKind={Boolean(kind)}
        busy={tonight.busy}
        waiting={at ? undefined : t("tonight.whereFirst")}
        onWaiting={() => whereRef.current?.querySelector("input")?.focus()}
        onChoice={tonight.setChoice}
        onWhen={tonight.setWhen}
        onPlan={() => void tonight.plan()}
        canLocate={tonight.canLocate}
        reachNotice={tonight.reachNotice}
      />
      {/* With JavaScript off the form above cannot answer: say so, and on a page by kind point to the
          city pages at its foot, which list real places in plain HTML. */}
      <noscript>
        <p className="mt-4 text-[0.9375rem] text-page-body">
          {t("tonight.noScript")}{" "}
          {place ? null : (
            <a href="#cities-title" className={QUIET}>
              {t("tonight.noScriptCities")}
            </a>
          )}
        </p>
      </noscript>
      {/* The card is not in the live region: its heading takes focus, which already reads it out once. */}
      {tonight.result ? <TonightResult {...tonight.result} confirming={tonight.confirming} onReplace={tonight.replace} onKeep={tonight.keep} locale={locale} onOpen={tonight.open} onAnother={tonight.another} /> : null}
      <div role="status" aria-live="polite">
        {!tonight.result && tonight.problem ? (
          <TonightProblem
            problem={tonight.problem}
            mapHref={mapHref}
            // A page by kind has already tried tomorrow when tonight had none of its ideas (use-tonight).
            offerTomorrow={tonight.problemWhen === "tonight" && !kind}
            ofKind={Boolean(kind)}
            whenLabel={tonight.problemWhen && tonight.problemWhen !== "day" ? t(`tonight.when.${tonight.problemWhen}`) : undefined}
            near={tonight.near}
            onRetry={() => void tonight.plan()}
            onTomorrow={() => {
              tonight.setWhen("tomorrow");
              void tonight.plan("tomorrow");
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
