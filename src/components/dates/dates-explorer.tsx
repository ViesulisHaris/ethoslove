"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowRight, CloudOff, List, Map as MapIcon, Sunset } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatDay, isYmd, thisWeekend, toYmd, type Ymd } from "@/lib/dates/calendar";
import { STARTER_CITIES } from "@/lib/dates/cities";
import type { PlaceDetails } from "@/lib/dates/details";
import { distanceKm, isLatLng, round, snapSearch, type LatLng } from "@/lib/dates/geo";
import { fillStops, ideaById, ideasFor, isDoable, VIBE_IDS, VIBES, type Vibe } from "@/lib/dates/ideas";
import { GROUP_IDS, GROUPS, type PlaceGroup } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { addStop, MAX_STOPS, removeStop, type PlanStop } from "@/lib/dates/plan";
import { mergePlaces } from "@/lib/dates/tiles";
import { suggestTimes } from "@/lib/dates/timing";
import { isWet, type Forecast } from "@/lib/dates/weather";
import { GroupIcon } from "./group-icon";
import { IdeaPanel } from "./idea-panel";
import { IdeaRail } from "./idea-rail";
import { MapView } from "./map-view";
import { PlaceCard } from "./place-card";
import { PlaceSheet } from "./place-sheet";
import { usePlan } from "./use-plan";
import { WeatherGlyph } from "./weather-glyph";
import { WhenPicker } from "./when-picker";
import { WhereBox, type Where } from "./where-box";

const WHERE_KEY = "ethos.dates.where.v1";
const DEFAULT_RADIUS_M = 1500;
const PAGE = 24;
/** Moving the map further than this from the named place stops calling it by that name. */
const SAME_PLACE_KM = 6;

const noop = () => () => undefined;
const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (onChange: () => void) => {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const toStop = (place: Place, time?: string): PlanStop => ({ id: place.id, name: place.name.slice(0, 120), kind: place.kind, lat: place.lat, lng: place.lng, ...(place.address ? { address: place.address.slice(0, 160) } : {}), ...(time ? { time } : {}) });

/**
 * The Dates page: where, when, then ideas made of real places on a map. Everything it shows is
 * worked out in the browser from three small requests to this site (places, rare finds, forecast);
 * the plan being built lives in localStorage and is never sent anywhere.
 */
export function DatesExplorer() {
  const t = useTranslations("dates");
  const locale = useLocale() === "es" ? "es" : "en";
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false);

  const [today] = useState<Ymd>(() => toYmd(new Date()));
  const [date, setDate] = useState<Ymd>(() => thisWeekend(toYmd(new Date())));
  const [where, setWhere] = useState<Where | null>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<"starting" | "empty" | "loading" | "ready" | "error">("starting");
  const [places, setPlaces] = useState<Place[]>([]);
  const [rare, setRare] = useState<Place[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [groups, setGroups] = useState<PlaceGroup[]>([]);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [skip, setSkip] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PlaceDetails | null>>({});
  const [view, setView] = useState<"list" | "map">("list");
  const [mapOpened, setMapOpened] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareable, setShareable] = useState(false);
  const [plan, updatePlan] = usePlan();

  const token = useRef(0);
  const rareKey = useRef("");
  const forecastAt = useRef<LatLng | null>(null);

  const search = useCallback(
    async (center: LatLng, radiusM: number) => {
      const mine = ++token.current;
      setStatus("loading");
      setShown(PAGE);
      const snapped = snapSearch(center, radiusM);
      try {
        const res = await fetch(`/api/dates/search?lat=${snapped.center.lat}&lng=${snapped.center.lng}&radius=${snapped.radiusM}&locale=${locale}`);
        const json = (await res.json()) as { places?: Place[] };
        if (mine !== token.current) return;
        if (!res.ok || !Array.isArray(json.places)) throw new Error("search");
        setPlaces(json.places);
        setStatus("ready");
      } catch {
        if (mine === token.current) setStatus("error");
      }

      // The rare finds (bowling, a spa, the beach) come from slower servers; never wait for them.
      const wide = { lat: round(center.lat, 2) + 0, lng: round(center.lng, 2) + 0 };
      const key = `${wide.lat},${wide.lng}`;
      if (rareKey.current !== key) {
        rareKey.current = key;
        setRare([]);
        fetch(`/api/dates/rare?lat=${wide.lat}&lng=${wide.lng}&locale=${locale}`)
          .then((r) => (r.ok ? (r.json() as Promise<{ places?: Place[] }>) : null))
          .then((json) => {
            if (json?.places && rareKey.current === key) setRare(json.places);
          })
          .catch(() => undefined);
      }

      const last = forecastAt.current;
      if (!last || distanceKm(last, center) > 10) {
        forecastAt.current = center;
        fetch(`/api/dates/weather?lat=${round(center.lat, 2)}&lng=${round(center.lng, 2)}`)
          .then((r) => (r.ok ? (r.json() as Promise<Forecast>) : null))
          .then((json) => {
            if (json?.days && forecastAt.current === center) setForecast(json);
          })
          .catch(() => undefined);
      }
    },
    [locale],
  );

  const go = useCallback(
    (next: Where, options: { radiusM?: number; share?: boolean } = {}) => {
      const snapped = snapSearch(next, options.radiusM ?? DEFAULT_RADIUS_M);
      const place = { ...snapped.center, name: next.name };
      setWhere(place);
      setShareable(options.share ?? true);
      setSelectedId(null);
      setSkip([]);
      try {
        window.localStorage.setItem(WHERE_KEY, JSON.stringify(place));
      } catch {
        // No storage: it just will not be remembered.
      }
      void search(place, snapped.radiusM);
    },
    [search],
  );

  // First visit: the link, then last time, then roughly where the connection says they are.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const lat = Number(params.get("lat"));
      const lng = Number(params.get("lng"));
      const wantedDate = params.get("date");
      const wantedIdea = params.get("idea");
      let start: (Where & { share: boolean }) | null = params.get("lat") && params.get("lng") && isLatLng(lat, lng) ? { lat, lng, name: (params.get("q") ?? "").slice(0, 80), share: true } : null;
      if (!start) {
        try {
          const saved = JSON.parse(window.localStorage.getItem(WHERE_KEY) ?? "null") as Where | null;
          if (saved && isLatLng(saved.lat, saved.lng) && typeof saved.name === "string") start = { ...saved, share: false };
        } catch {
          // Unreadable: ask again.
        }
      }
      if (!start) {
        try {
          const json = (await (await fetch("/api/dates/here")).json()) as { place?: Where | null };
          if (json.place && isLatLng(json.place.lat, json.place.lng)) start = { ...json.place, share: false };
        } catch {
          // Offline or blocked: ask.
        }
      }
      if (cancelled) return;
      if (wantedDate && isYmd(wantedDate) && wantedDate >= toYmd(new Date())) setDate(wantedDate);
      if (wantedIdea && ideaById(wantedIdea)) setIdeaId(wantedIdea);
      if (start) go(start, { share: start.share });
      else setStatus("empty");
    })();
    return () => {
      cancelled = true;
    };
  }, [go]);

  // The address bar follows a search for a named town, so it can be sent to someone. A search round
  // "near me" never goes in it: a link is forwarded without a thought for what is inside.
  useEffect(() => {
    if (!where) return;
    const params = new URLSearchParams();
    if (shareable) {
      params.set("lat", String(where.lat));
      params.set("lng", String(where.lng));
      if (where.name) params.set("q", where.name);
      params.set("date", date);
      if (ideaId) params.set("idea", ideaId);
    }
    const query = params.toString();
    window.history.replaceState(window.history.state, "", query ? `?${query}` : window.location.pathname);
  }, [where, date, ideaId, shareable]);

  const nearMe = useCallback(() => {
    if (!("geolocation" in navigator)) return setNotice(t("where.noGeo"));
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const here = { lat: position.coords.latitude, lng: position.coords.longitude };
        setOrigin(here);
        go({ ...here, name: t("where.nearYou") }, { share: false });
      },
      () => {
        setLocating(false);
        setNotice(t("where.denied"));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [go, t]);

  const all = useMemo(() => {
    const from = origin ?? where;
    const merged = mergePlaces(places, rare);
    return from ? merged.map((p) => ({ ...p, distanceKm: Math.round(distanceKm(from, p) * 100) / 100 })) : merged;
  }, [places, rare, origin, where]);

  const day = forecast?.days.find((d) => d.date === date);
  const ideas = useMemo(() => ideasFor(day, all, vibe ?? undefined), [day, all, vibe]);
  const doable = useMemo(() => (status === "ready" || all.length > 0 ? new Set(ideas.filter((i) => isDoable(i, all)).map((i) => i.id)) : null), [ideas, all, status]);
  const idea = ideaById(ideaId ?? undefined);
  const stops = useMemo(() => (idea ? fillStops(idea, all, skip) : []), [idea, all, skip]);
  const times = useMemo(() => (idea ? suggestTimes(idea, day) : []), [idea, day]);
  const visible = useMemo(() => (groups.length === 0 ? all : all.filter((p) => groups.includes(p.group))), [all, groups]);
  const counts = useMemo(() => Object.fromEntries(GROUP_IDS.map((g) => [g, all.filter((p) => p.group === g).length])) as Record<PlaceGroup, number>, [all]);
  const selected = selectedId ? (all.find((p) => p.id === selectedId) ?? null) : null;
  const planIds = useMemo(() => new Set(plan.stops.map((s) => s.id)), [plan.stops]);
  const ideaInPlan = stops.some((s) => s.place) && stops.every((s) => !s.place || planIds.has(s.place.id));
  const route = useMemo(() => (idea ? stops.flatMap((s) => (s.place ? [{ lat: s.place.lat, lng: s.place.lng, name: s.place.name }] : [])) : plan.stops.map((s) => ({ lat: s.lat, lng: s.lng, name: s.name }))), [idea, stops, plan.stops]);

  const open = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (!id || id in details) return;
      fetch(`/api/dates/place?id=${encodeURIComponent(id)}&locale=${locale}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ details?: PlaceDetails }>) : null))
        .then((json) => setDetails((d) => ({ ...d, [id]: json?.details ?? null })))
        .catch(() => setDetails((d) => ({ ...d, [id]: null })));
    },
    [details, locale],
  );

  const stamp = useCallback((p: typeof plan) => ({ ...p, date, ...(where?.name && shareable ? { where: where.name.slice(0, 80) } : {}) }), [date, where, shareable]);
  const togglePlan = useCallback(
    (place: Place) => {
      if (!planIds.has(place.id) && plan.stops.length >= MAX_STOPS) return setNotice(t("plan.full", { max: MAX_STOPS }));
      updatePlan((p) => (p.stops.some((s) => s.id === place.id) ? removeStop(p, place.id) : stamp(addStop(p, toStop(place)))));
    },
    [plan.stops.length, planIds, stamp, t, updatePlan],
  );
  const addIdea = useCallback(() => {
    if (!idea) return;
    updatePlan((p) => stamp({ ...stops.reduce((acc, s, i) => (s.place ? addStop(acc, toStop(s.place, times[i])) : acc), p), idea: idea.id }));
  }, [idea, stops, times, stamp, updatePlan]);

  const mapLabels = useMemo(() => ({ searchHere: t("map.searchHere"), nearMe: t("where.nearMe"), loading: t("map.loading"), unavailable: t("map.unavailable"), map: t("map.label"), zoomIn: t("map.zoomIn"), zoomOut: t("map.zoomOut") }), [t]);
  const budget = useMemo(() => [t("ideas.budget.0"), t("ideas.budget.1"), t("ideas.budget.2"), t("ideas.budget.3")] as [string, string, string, string], [t]);
  const whereLabels = { label: t("where.label"), placeholder: t("where.placeholder"), nearMe: t("where.nearMe"), searching: t("where.searching"), nothing: t("where.nothing") };

  if (!isClient || status === "starting") return <ExplorerSkeleton />;

  if (status === "empty" || !where) {
    return (
      <section className="container-narrow py-14 text-center sm:py-20">
        <h1 className="display-xl text-forest">{t("empty.title")}</h1>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-forest/70">{t("empty.sub")}</p>
        <WhereBox value={null} locale={locale} labels={whereLabels} locating={locating} autoFocus size="lg" className="mx-auto mt-8 max-w-xl text-left" onPick={(w) => go(w)} onNearMe={nearMe} />
        {notice ? <p role="status" className="mt-3 text-sm text-[#B5341C]">{notice}</p> : null}
        <p className="mt-10 text-[12px] font-medium tracking-[0.2em] text-forest/50 uppercase">{t("empty.or")}</p>
        <ul className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
          {STARTER_CITIES.map((city) => (
            <li key={city.name}>
              <button type="button" onClick={() => go(city)} className="h-11 rounded-full border border-forest/15 bg-white px-4 text-[14.5px] font-medium text-forest shadow-soft transition-transform hover:-translate-y-0.5">
                {city.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const showMap = isDesktop || view === "map";
  const mountMap = isDesktop || mapOpened;
  const sheet = selected ? (
    <PlaceSheet
      key={selected.id}
      place={selected}
      details={details[selected.id]}
      date={date}
      where={shareable ? where.name : ""}
      locale={locale}
      inPlan={planIds.has(selected.id)}
      onTogglePlan={() => togglePlan(selected)}
      onClose={() => setSelectedId(null)}
      labels={{
        close: t("place.close"),
        add: t("place.add"),
        remove: t("place.remove"),
        directions: t("place.directions"),
        website: t("place.website"),
        reviews: t("place.reviews"),
        call: t("place.call"),
        openOn: (d, h) => t("place.openOn", { day: d, hours: h }),
        closedOn: (d) => t("place.closedOn", { day: d }),
        hoursUnknown: t("place.hoursUnknown"),
        hoursUnclear: t("place.hoursUnclear"),
        terrace: t("place.terrace"),
        vegetarian: t("place.vegetarian"),
        stepFree: t("place.stepFree"),
        landmark: t("place.landmark"),
        free: t("place.free"),
        source: t("place.source"),
        loading: t("map.loading"),
      }}
    />
  ) : null;

  return (
    <div className="relative lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      {/* ---------------------------------------------------------------- the list */}
      <div className="px-5 pt-7 pb-32 sm:px-8 lg:px-6 lg:pt-[calc(var(--header-h)+1.25rem)]">
        <p className="text-[12px] font-medium tracking-[0.22em] text-[#B23A5E] uppercase">{t("eyebrow")}</p>
        <h1 className="mt-2 display-lg text-forest">{where.name && shareable ? t("titleIn", { place: where.name }) : t("titleNear")}</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          <WhereBox value={where} locale={locale} labels={whereLabels} locating={locating} className="min-w-[230px] flex-1" onPick={(w) => { setOrigin(null); go(w); }} onNearMe={nearMe} />
          <WhenPicker
            value={date}
            today={today}
            days={forecast?.days ?? []}
            locale={locale}
            onPick={setDate}
            labels={{ label: t("when.label"), today: t("when.today"), tomorrow: t("when.tomorrow"), weekend: t("when.weekend"), previous: t("when.previous"), next: t("when.next"), forecastNote: t("when.forecastNote") }}
          />
        </div>
        {notice ? (
          <p role="status" className="mt-2 text-[13.5px] text-[#B5341C]">
            {notice}
          </p>
        ) : null}

        {/* the day they picked */}
        <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-white/70 p-3.5 ring-1 ring-forest/5 backdrop-blur" aria-live="polite">
          {day ? (
            <>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white shadow-soft">
                <WeatherGlyph condition={day.condition} className="size-6" />
              </span>
              <p className="min-w-0 flex-1 text-[14px] leading-snug text-forest/80">
                <span className="font-semibold text-forest first-letter:uppercase">
                  {formatDay(date, locale)} · {day.tMax}°
                </span>
                <br />
                {isWet(day) ? t("weather.wet", { chance: day.rainChance ?? 60 }) : day.tMax >= 18 ? t("weather.warm") : day.tMax < 8 ? t("weather.cold") : t("weather.mild")}
              </p>
              {day.sunset ? (
                <span className="flex shrink-0 flex-col items-center text-[11px] font-medium text-forest/55">
                  <Sunset aria-hidden="true" className="size-4 text-[#E0962A]" />
                  <span className="sr-only">{t("weather.sunset")}</span>
                  <span className="tabular-nums">{day.sunset}</span>
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white shadow-soft">
                <CloudOff aria-hidden="true" className="size-5 text-forest/35" />
              </span>
              <p className="text-[14px] leading-snug text-forest/70">
                <span className="font-semibold text-forest first-letter:uppercase">{formatDay(date, locale)}</span>
                <br />
                {forecast ? t("weather.tooFar") : t("weather.loading")}
              </p>
            </>
          )}
        </div>

        {/* ideas */}
        <div className="mt-8 flex items-end justify-between gap-4">
          <h2 className="display-md text-forest">{t("ideas.title")}</h2>
          <p className="hidden text-[13px] text-forest/55 sm:block">{t("ideas.sub")}</p>
        </div>
        <div className="scrollbar-none -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:-mx-6 lg:px-6" role="group" aria-label={t("ideas.vibes")}>
          {VIBE_IDS.map((v) => (
            <button key={v} type="button" aria-pressed={vibe === v} onClick={() => setVibe(vibe === v ? null : v)} className={cn("h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors", vibe === v ? "bg-[#B23A5E] text-white" : "bg-white text-forest/75 ring-1 ring-forest/10 hover:bg-[#FBE9EE]")}>
              {VIBES[v][locale]}
            </button>
          ))}
        </div>
        {ideas.length > 0 ? (
          <IdeaRail
            ideas={ideas}
            doable={doable}
            selectedId={ideaId}
            locale={locale}
            onPick={(id) => {
              setIdeaId(id);
              setSkip([]);
              setSelectedId(null);
            }}
            labels={{ previous: t("ideas.previous"), next: t("ideas.next"), budget, hours: (h) => t("ideas.hours", { hours: h }), notNearby: t("ideas.notNearby") }}
          />
        ) : (
          <p className="mt-4 rounded-2xl bg-white/70 p-4 text-[14px] text-forest/65">{t("ideas.noneForVibe")}</p>
        )}
        {idea ? (
          <IdeaPanel
            key={idea.id}
            idea={idea}
            stops={stops}
            times={times}
            inPlan={ideaInPlan}
            locale={locale}
            onShuffle={(i) => setSkip((s) => Object.assign([...s], { [i]: (s[i] ?? 0) + 1 }))}
            onOpenPlace={open}
            onHover={setHoveredId}
            onAdd={addIdea}
            onClose={() => setIdeaId(null)}
            labels={{ twist: t("ideas.twist"), another: t("ideas.another"), nothing: (kind) => t("ideas.nothingFor", { kind }), walk: (m) => t("place.walkBetween", { minutes: m }), add: t("ideas.add"), added: t("ideas.added"), close: t("ideas.close"), open: t("place.open") }}
          />
        ) : null}

        {/* places */}
        <div className="mt-9 flex items-end justify-between gap-4">
          <h2 className="display-md text-forest">{t("places.title")}</h2>
          {status === "ready" || all.length > 0 ? <p className="text-[13px] text-forest/55 tabular-nums">{t("places.count", { count: visible.length })}</p> : null}
        </div>
        <div className="scrollbar-none -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:-mx-6 lg:flex-wrap lg:px-6" role="group" aria-label={t("places.filter")}>
          <button type="button" aria-pressed={groups.length === 0} onClick={() => setGroups([])} className={cn("h-10 shrink-0 rounded-full px-4 text-[13.5px] font-semibold transition-colors", groups.length === 0 ? "bg-forest text-cream" : "bg-white text-forest/75 ring-1 ring-forest/10 hover:bg-forest/5")}>
            {t("places.all")}
          </button>
          {GROUP_IDS.map((g) => {
            const on = groups.includes(g);
            return (
              <button
                key={g}
                type="button"
                aria-pressed={on}
                disabled={counts[g] === 0 && !on}
                onClick={() => {
                  setGroups(on ? groups.filter((x) => x !== g) : [...groups, g]);
                  setShown(PAGE);
                }}
                className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 transition-colors disabled:opacity-35", on ? "text-white ring-transparent" : "bg-white ring-forest/10 hover:bg-forest/5")}
                style={on ? { background: GROUPS[g].color } : { color: GROUPS[g].color }}
              >
                <GroupIcon group={g} className="size-4" />
                {GROUPS[g].label[locale]}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2.5" aria-busy={status === "loading"}>
          {status === "loading" && all.length === 0 ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[72px] animate-pulse rounded-[20px] bg-white/70" />) : null}
          {status === "error" && all.length === 0 ? (
            <div className="rounded-[20px] bg-white p-5 text-[14.5px] leading-relaxed text-forest/70 ring-1 ring-forest/5">
              {t("places.error")}{" "}
              <button type="button" onClick={() => go(where, { share: shareable })} className="font-semibold text-[#B23A5E] underline underline-offset-4">
                {t("places.retry")}
              </button>
            </div>
          ) : null}
          {status === "ready" && visible.length === 0 ? <p className="rounded-[20px] bg-white p-5 text-[14.5px] leading-relaxed text-forest/70 ring-1 ring-forest/5">{all.length === 0 ? t("places.none") : t("places.noneInFilter")}</p> : null}
          {visible.slice(0, shown).map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              locale={locale}
              selected={place.id === selectedId}
              inPlan={planIds.has(place.id)}
              onOpen={() => open(place.id)}
              onHover={(on) => setHoveredId(on ? place.id : null)}
              onTogglePlan={() => togglePlan(place)}
              labels={{ add: t("place.add"), remove: t("place.remove"), walk: (m) => t("place.walk", { minutes: m }) }}
            />
          ))}
          {visible.length > shown ? (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-2 h-12 w-full rounded-full border border-forest/15 bg-white text-[14.5px] font-semibold text-forest hover:bg-forest/5">
              {t("places.more", { count: Math.min(PAGE, visible.length - shown) })}
            </button>
          ) : null}
        </div>
        <p className="mt-6 text-[12px] leading-relaxed text-forest/45">{t("places.credit")}</p>
      </div>

      {/* ---------------------------------------------------------------- the map */}
      <div className={cn("lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:block lg:h-dvh", showMap ? "fixed inset-0 z-50" : "hidden")}>
        {mountMap ? (
          <MapView
            center={where}
            places={visible}
            selected={selected}
            hoveredId={hoveredId}
            route={route}
            fitRoute={Boolean(idea)}
            origin={origin}
            searching={status === "loading"}
            locating={locating}
            labels={mapLabels}
            className="h-full w-full"
            onSelect={open}
            onNearMe={nearMe}
            onSearchArea={(center, radiusM) => {
              const same = distanceKm(center, where) < SAME_PLACE_KM;
              setOrigin(null);
              go({ ...center, name: same ? where.name : t("where.mapArea") }, { radiusM, share: shareable || !same });
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[390px]">
          <AnimatePresence>{showMap && sheet ? <div className="pointer-events-auto">{sheet}</div> : null}</AnimatePresence>
        </div>
      </div>

      {/* On a phone looking at the list, a place opens over the list. */}
      {!showMap ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]">
          <AnimatePresence>{sheet ? <div className="pointer-events-auto">{sheet}</div> : null}</AnimatePresence>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- the dock */}
      {!selected ? (
        <div className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex items-center justify-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:right-auto lg:w-[560px]", showMap && !isDesktop && "z-[55]")}>
          <button
            type="button"
            onClick={() => {
              setMapOpened(true);
              setView(view === "map" ? "list" : "map");
            }}
            className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-forest px-5 text-[14.5px] font-semibold text-cream shadow-lift lg:hidden"
          >
            {view === "map" ? <List aria-hidden="true" className="size-4" /> : <MapIcon aria-hidden="true" className="size-4" />}
            {view === "map" ? t("map.list") : t("map.show")}
          </button>
          {plan.stops.length > 0 ? (
            <Link href="/plan" className="pointer-events-auto inline-flex h-12 items-center gap-2.5 rounded-full bg-[#B23A5E] pr-4 pl-2 text-[14.5px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(140,30,70,0.85)] transition-transform hover:-translate-y-0.5">
              <span className="grid size-8 place-items-center rounded-full bg-white text-[13px] font-bold text-[#B23A5E] tabular-nums">{plan.stops.length}</span>
              {t("plan.open")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ExplorerSkeleton() {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]" aria-hidden="true">
      <div className="space-y-4 px-5 pt-9 pb-24 sm:px-8 lg:px-6 lg:pt-[calc(var(--header-h)+1.25rem)]">
        <div className="h-4 w-32 animate-pulse rounded bg-forest/10" />
        <div className="h-10 w-72 animate-pulse rounded-lg bg-forest/10" />
        <div className="h-12 animate-pulse rounded-full bg-white/70" />
        <div className="h-[72px] animate-pulse rounded-[20px] bg-white/70" />
        <div className="flex gap-3 overflow-hidden pt-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-[188px] w-[164px] shrink-0 animate-pulse rounded-[22px] bg-white/70" />
          ))}
        </div>
      </div>
      <div className="hidden h-dvh bg-[#FBF3EE] lg:block" />
    </div>
  );
}
