/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { AnimatePresence, motion, MotionConfig, useIsPresent } from "motion/react";
import { ArrowRight, CloudOff, List, Map as MapIcon, Sparkles, Sunset } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { HERO_ART, heroSizes, heroSrcSet } from "@/lib/dates/art";
import { formatDay, isYmd, thisWeekend, toYmd, type Ymd } from "@/lib/dates/calendar";
import { STARTER_CITIES, starterName } from "@/lib/dates/cities";
import { COST_IDS, COST_LABELS, type Cost } from "@/lib/dates/cost";
import type { PlaceDetails } from "@/lib/dates/details";
import { datesUrls, EARLY_KEY, earlyScript, HERE_URL, takeEarly } from "@/lib/dates/early";
import { distanceKm, isLatLng, snapSearch, type LatLng } from "@/lib/dates/geo";
import { fillStops, fitsVibe, ideaById, ideasFor, IDEAS, isDoable, VIBE_IDS, VIBES, type Vibe } from "@/lib/dates/ideas";
import { GROUP_IDS, GROUPS, type PlaceGroup } from "@/lib/dates/kinds";
import { MAP_PAPER } from "@/lib/dates/map-style";
import { MAP_STYLE_URL, MAPLIBRE_SHARED_URL, MAPLIBRE_URL, warmMap } from "@/lib/dates/map-vendor";
import type { Place } from "@/lib/dates/places";
import { matchPhotos, type Sight } from "@/lib/dates/photos";
import { pairsWith, rankPlaces, topPicks, type Ratings, type Sort } from "@/lib/dates/rank";
import type { PublicReview } from "@/lib/dates/reviews";
import type { WentAs } from "@/lib/supabase/types";
import { addStop, addStops, EMPTY_PLAN, isFarFromPlan, MAX_STOPS, removeStop, stopName, type Plan, type PlanStop } from "@/lib/dates/plan";
import { mergePlaces } from "@/lib/dates/tiles";
import { MIN_UNUSUAL, UNUSUAL_SHELF, unusualIndex, unusualPicks } from "@/lib/dates/unusual";
import { suggestTimes } from "@/lib/dates/timing";
import { isWet, type Forecast } from "@/lib/dates/weather";
import { findTown } from "@/lib/dates/where";
import { readSharedPlace } from "@/lib/share/links";
import { GroupIcon } from "./group-icon";
import { createHoverStore, useHoveredId, useIsHovered, type HoverStore } from "./hover-store";
import { IdeaPanel } from "./idea-panel";
import { IdeaRail } from "./idea-rail";
import { MapView } from "./map-view";
import { PlaceCard } from "./place-card";
import { PlaceSheet } from "./place-sheet";
import { SortMenu, type SortLabels } from "./sort-menu";
import { TopPicks } from "./top-picks";
import { UnusualShelf } from "./unusual-shelf";
import { usePlan } from "./use-plan";
import { WeatherGlyph } from "./weather-glyph";
import { WhenPicker } from "./when-picker";
import { WhereBox, type Where } from "./where-box";

const WHERE_KEY = "ethos.dates.where.v1";
const DEFAULT_RADIUS_M = 1500;
const PAGE = 24;
/** Moving the map further than this from the named place stops calling it by that name. */
const SAME_PLACE_KM = 6;
/** The forecast is for a cell this wide: a search nearer than this to the last one has its weather already. */
const FORECAST_KM = 10;
/** How long "the plan is full" and its like stay on the screen. */
const PLAN_NOTICE_MS = 4000;
/** The site's ease-out-quint, for motion. */
const QUINT = [0.22, 1, 0.36, 1] as const;
/** A scrim or a notice leaving: a short fade. */
const FADE_OUT = { opacity: 0, transition: { duration: 0.2, ease: QUINT } } as const;
/** A set of cards (or the skeletons) giving way to the next, which fades in under it (place-card-in). */
const LIST_OUT = { opacity: 0, transition: { duration: 0.26, ease: QUINT } } as const;

const noop = () => () => undefined;
const desktopQuery = "(min-width: 1024px)";
/** The heading the page's HTML carries before the explorer has loaded (ExplorerSkeleton). */
const TITLE_ID = "dates-title";
/** In history.state: how many of the phone's layers (the full-screen map, an open place) are open at this entry. */
const LAYERS = "ethosDatesLayers";
const layersIn = (state: unknown): number => {
  const n = (state as Record<string, unknown> | null)?.[LAYERS];
  return typeof n === "number" && n > 0 ? n : 0;
};
const subscribeDesktop = (onChange: () => void) => {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

// A place with no name of its own is kept as one (`named: false`), so the plan calls it by its kind
// in whichever language it is read in, not in the one it was added in (plan.ts stopName).
const toStop = (place: Place, time?: string): PlanStop => ({ id: place.id, name: place.name.slice(0, 120), kind: place.kind, lat: place.lat, lng: place.lng, ...(place.address ? { address: place.address.slice(0, 160) } : {}), ...(time ? { time } : {}), ...(place.named ? {} : { named: false }) });

/**
 * One set of cards, or the skeletons. On its way out it is lifted from the flow where it stands
 * (AnimatePresence's popLayout) and fades over the next set arriving under it; while it does, it is
 * inert and hidden from screen readers, so nothing in it can be focused, pressed or read twice.
 */
function ListSet({ ref, children }: { ref?: React.Ref<HTMLDivElement>; children: React.ReactNode }) {
  const present = useIsPresent();
  return (
    <motion.div ref={ref} exit={LIST_OUT} aria-hidden={present ? undefined : true} inert={!present} className="space-y-2.5">
      {children}
    </motion.div>
  );
}

/** A card in the list, lit when its place is pointed at (here or on the map) without the page re-rendering. */
function ListedCard({ hover, ...card }: Omit<ComponentProps<typeof PlaceCard>, "hovered"> & { hover: HoverStore }) {
  return <PlaceCard {...card} hovered={useIsHovered(hover, card.place.id)} />;
}

/** The map, told which place is pointed at on its own (see hover-store.ts). */
function HoveredMap({ hover, ...map }: Omit<ComponentProps<typeof MapView>, "hoveredId"> & { hover: HoverStore }) {
  return <MapView {...map} hoveredId={useHoveredId(hover)} />;
}

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
  const [sights, setSights] = useState<Sight[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  // The forecast couldn't be had (the weather service timed out): said, instead of "Checking…" for ever.
  const [forecastFailed, setForecastFailed] = useState(false);
  const [groups, setGroups] = useState<PlaceGroup[]>([]);
  // "Something different": only the places with a story (unusual.ts), whatever their group.
  const [oddOnly, setOddOnly] = useState(false);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [sort, setSort] = useState<Sort>("best");
  const [ratings, setRatings] = useState<Ratings>({});
  const [reviews, setReviews] = useState<Record<string, PublicReview[]>>({});
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [skip, setSkip] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which place is pointed at: outside React state, so a hover re-renders a card or two and the map,
  // not the page (hover-store.ts).
  const [hover] = useState(createHoverStore);
  const setHoveredId = hover.set;
  const [details, setDetails] = useState<Record<string, PlaceDetails | null>>({});
  const [view, setView] = useState<"list" | "map">("list");
  const [mapOpened, setMapOpened] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // What adding to the plan has to say ("the plan is full"). Not `notice`, which is written under the
  // where box: a + pressed on the fortieth card put it a screen and a half above the one looking.
  // `at` tells two of the same message apart, so the second press shows it for as long again.
  const [planNotice, setPlanNotice] = useState<{ text: string; at: number } | null>(null);
  const [shareable, setShareable] = useState(false);
  // A shared place's link (?place=node/123, lib/share/links.ts): opened once the search around it
  // finds it, and forgotten when it doesn't, or when they go looking somewhere else.
  const [linkedPlace, setLinkedPlace] = useState<{ id: string; at: LatLng } | null>(null);
  // The link named a town (?q=) and there is none by that name: said on the empty page.
  const [townMissing, setTownMissing] = useState(false);
  // Counts Back presses that landed on this page's own entries (see the layers below).
  const [popped, setPopped] = useState(0);
  // Which set of results the list is showing. A new answer, a new sort or a new filter is a new
  // set: the list crossfades to it whole, where re-sorting the cards on the screen slid every one
  // of them to a new place under the reader's eyes.
  const [listGen, setListGen] = useState(0);
  const nextList = useCallback(() => setListGen((n) => n + 1), []);
  const [plan, updatePlan] = usePlan();

  const token = useRef(0);
  const rareKey = useRef("");
  const sightsKey = useRef("");
  const forecastAt = useRef<LatLng | null>(null);
  const searchedAt = useRef<LatLng | null>(null);

  const search = useCallback(
    async (center: LatLng, radiusM: number) => {
      const mine = ++token.current;
      setStatus("loading");
      setShown(PAGE);
      // The first search of a visit was usually started by the page's HTML already (lib/dates/early.ts).
      const urls = datesUrls(center, radiusM, locale);

      // Another town: the last one's places go at once. They used to stay up under the new town's
      // name for the five seconds a cold search takes ("Date ideas in Vienna" over London's 356
      // places), and a tap on one flew the map back to London. The list shows it is loading instead.
      // A nudge within the same area keeps what is there until the new answer replaces it.
      const previous = searchedAt.current;
      searchedAt.current = center;
      if (previous && distanceKm(previous, center) > SAME_PLACE_KM) {
        setPlaces([]);
        setRare([]);
        setSights([]);
        rareKey.current = "";
        sightsKey.current = "";
      }

      // The rare finds (bowling, a spa, the beach), the photographs and the forecast are asked for
      // alongside the places, not after them: the forecast used to wait for a five-second search.
      const key = `${urls.wide.lat},${urls.wide.lng}`;
      if (rareKey.current !== key) {
        rareKey.current = key;
        setRare([]);
        takeEarly(urls.rare)
          .then((r) => (r.ok ? (r.json() as Promise<{ places?: Place[] }>) : null))
          .then((json) => {
            if (json?.places && rareKey.current === key) setRare(json.places);
          })
          .catch(() => undefined);
      }

      // Photographs of the neighbourhood's landmarks, matched to places by name further down.
      const photoKey = `${urls.snapped.center.lat},${urls.snapped.center.lng},${urls.snapped.radiusM}`;
      if (sightsKey.current !== photoKey) {
        sightsKey.current = photoKey;
        takeEarly(urls.photos)
          .then((r) => (r.ok ? (r.json() as Promise<{ sights?: Sight[] }>) : null))
          .then((json) => {
            if (json?.sights && sightsKey.current === photoKey) setSights(json.sights);
          })
          .catch(() => undefined);
      }

      const last = forecastAt.current;
      if (!last || distanceKm(last, center) > FORECAST_KM) {
        forecastAt.current = center;
        // Never the last town's weather under this one's name, while it loads or if it never comes.
        setForecast(null);
        setForecastFailed(false);
        // A failure is said, and forgotten: the next search here (or "Try again") asks again, where
        // before the failed spot was remembered as asked and nothing within 10 km ever asked again.
        const failed = () => {
          if (forecastAt.current !== center) return;
          forecastAt.current = null;
          setForecastFailed(true);
        };
        takeEarly(urls.weather)
          .then((r) => (r.ok ? (r.json() as Promise<Forecast>) : null))
          .then((json) => {
            if (forecastAt.current !== center) return;
            if (json?.days) setForecast(json);
            else failed();
          })
          .catch(failed);
      }

      try {
        const res = await takeEarly(urls.search);
        const json = (await res.json()) as { places?: Place[] };
        if (mine !== token.current) return;
        if (!res.ok || !Array.isArray(json.places)) throw new Error("search");
        setPlaces(json.places);
        setListGen((n) => n + 1);
        setStatus("ready");
      } catch {
        if (mine === token.current) setStatus("error");
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
      setNotice(null);
      try {
        // With whether it can be named: a town they picked comes back next time as "Date ideas in
        // Lisbon" with a link to send; "near me" and the connection's guess stay private. The
        // page's HTML reads this too, to name the heading before the app loads (lib/dates/early.ts).
        window.localStorage.setItem(WHERE_KEY, JSON.stringify({ ...place, share: options.share ?? true }));
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
      // A town named without coordinates (/dates?q=Lisboa, typed or pasted into a bio) is looked up
      // the way the where box would. None by that name is said, not swapped for last time's town;
      // a lookup that couldn't be made falls through to the usual start.
      const wanted = (params.get("q") ?? "").trim();
      let missing = false;
      if (!start && wanted.length >= 2) {
        const town = await findTown(wanted, locale);
        if (town && isLatLng(town.lat, town.lng)) start = { ...town, share: true };
        else if (town === null) missing = true;
      }
      if (!start && !missing) {
        try {
          const saved = JSON.parse(window.localStorage.getItem(WHERE_KEY) ?? "null") as (Where & { share?: unknown }) | null;
          // Saved before the share flag was: private, as they all were then.
          if (saved && isLatLng(saved.lat, saved.lng) && typeof saved.name === "string") start = { lat: saved.lat, lng: saved.lng, name: saved.name.slice(0, 80), share: saved.share === true };
        } catch {
          // Unreadable: ask again.
        }
      }
      if (!start && !missing) {
        try {
          const json = (await (await takeEarly(HERE_URL)).json()) as { place?: Where | null };
          if (json.place && isLatLng(json.place.lat, json.place.lng)) start = { ...json.place, share: false };
        } catch {
          // Offline or blocked: ask.
        }
      }
      if (cancelled) return;
      const linked = readSharedPlace(params);
      if (linked && start?.share && (params.get("lat") || wanted)) setLinkedPlace({ id: linked, at: { lat: start.lat, lng: start.lng } });
      if (wantedDate && isYmd(wantedDate) && wantedDate >= toYmd(new Date())) setDate(wantedDate);
      if (wantedIdea && ideaById(wantedIdea)) setIdeaId(wantedIdea);
      if (start) return go(start, { share: start.share });
      if (missing) {
        setTownMissing(true);
        // The address bar is only written once there is a town; the ?q= that found none goes now.
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
      setStatus("empty");
    })();
    return () => {
      cancelled = true;
    };
  }, [go, locale]);

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
    // `popped`: Back lands on an entry written before the last search on the map; write it again.
  }, [where, date, ideaId, shareable, popped]);

  // On a phone the full-screen map and an open place look like screens of their own, and Back is how
  // a phone closes a screen; it used to leave Dates altogether, map, place and scroll with it. Each
  // open layer now has an entry in the history, at the same address, and Back closes the top one.
  // One closed from the page instead (the X, List, a tap on the map) takes its entry back off, so
  // no dead Back presses pile up behind it. A desktop has no such layers.
  const layers = isDesktop ? 0 : (view === "map" ? 1 : 0) + (selectedId ? 1 : 0);
  const layersNow = useRef(0);
  // How many entries this page has put on the history, once the `go()` calls it made have landed.
  const pushed = useRef(0);
  useEffect(() => {
    layersNow.current = layers;
    // The entries carry Next's own state (spread from the current one), so Back to one of them is a
    // same-page restore and not a new load of /dates.
    for (; pushed.current < layers; pushed.current++) window.history.pushState({ ...window.history.state, [LAYERS]: pushed.current + 1 }, "");
    if (pushed.current > layers) {
      window.history.go(layers - pushed.current);
      pushed.current = layers;
    }
  }, [layers]);
  useEffect(() => {
    // A reload on one of those entries opens with nothing on top: count from nothing.
    if (layersIn(window.history.state) > 0) window.history.replaceState({ ...window.history.state, [LAYERS]: 0 }, "");
    const onPop = (event: PopStateEvent) => {
      const depth = layersIn(event.state);
      pushed.current = depth;
      setPopped((n) => n + 1);
      if (depth >= layersNow.current) return;
      // The place is always on top of the map.
      setSelectedId(null);
      if (depth === 0) setView("list");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
    const { byPlace } = matchPhotos(merged, sights);
    // A place with a real photograph of it goes up a little: the first screen should be worth looking at.
    const pictured = merged.map((p) => {
      const sight = byPlace.get(p.id);
      return sight ? { ...p, photo: sight.photo, about: sight.description, articleUrl: sight.articleUrl, notable: true, score: p.score + 6 } : p;
    });
    if (byPlace.size > 0) pictured.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
    return from ? pictured.map((p) => ({ ...p, distanceKm: Math.round(distanceKm(from, p) * 100) / 100 })) : pictured;
  }, [places, rare, sights, origin, where]);

  const ratingKey = useMemo(() => all.map((p) => p.id).sort().join(","), [all]);
  const loadRatings = useCallback(async (key: string) => {
    if (!key) return;
    try {
      const res = await fetch("/api/dates/ratings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: key.split(",") }) });
      const json = res.ok ? ((await res.json()) as { ratings?: Ratings }) : null;
      if (json?.ratings) setRatings((r) => ({ ...r, ...json.ratings }));
    } catch {
      // The cards show the map's own order until the ratings arrive.
    }
  }, []);
  useEffect(() => {
    // A tick later: the list settles in a few renders as places, rare finds and photos arrive.
    const timer = setTimeout(() => void loadRatings(ratingKey), 150);
    return () => clearTimeout(timer);
  }, [ratingKey, loadRatings]);

  const day = forecast?.days.find((d) => d.date === date);
  const ideas = useMemo(() => ideasFor(day, all, vibe ?? undefined), [day, all, vibe]);
  const doable = useMemo(() => (status === "ready" || all.length > 0 ? new Set(ideas.filter((i) => isDoable(i, all)).map((i) => i.id)) : null), [ideas, all, status]);
  const idea = ideaById(ideaId ?? undefined);
  const stops = useMemo(() => (idea ? fillStops(idea, all, skip) : []), [idea, all, skip]);
  const times = useMemo(() => (idea ? suggestTimes(idea, day) : []), [idea, day]);
  const ranked = useMemo(() => rankPlaces(all, ratings, sort), [all, ratings, sort]);
  // A vibe chooses places as well as ideas: the kinds of place the mood is made of (ideas.ts
  // VIBE_KINDS), not every kind in its ideas, whose dessert-after-the-mini-golf filled "Playful" with
  // chocolate shops. The map and the list are both drawn from this. If there is no such place here
  // the filter steps aside, so a chip never empties the map.
  const inVibe = useMemo(() => {
    if (!vibe) return ranked;
    const matching = ranked.filter((p) => fitsVibe(p, vibe));
    return matching.length > 0 ? matching : ranked;
  }, [ranked, vibe]);
  // Which places are out of the ordinary, and why: judged once per set of places, not per render.
  const found = useMemo(() => unusualIndex(all), [all]);
  const visible = useMemo(() => {
    const shown = inVibe.filter((p) => (groups.length === 0 || groups.includes(p.group)) && (costs.length === 0 || costs.includes(p.cost)) && (!oddOnly || found.has(p.id)));
    // In "Something different", best for a date means the places whose name or map says what makes
    // them different come first; the escape rooms and ice rinks follow. Otherwise the category led
    // with the Play filter's places, twenty escape rooms before the first cellar bar.
    if (!oddOnly || sort !== "best") return shown;
    return shown.sort((a, b) => (found.get(b.id)?.strength ?? 0) - (found.get(a.id)?.strength ?? 0));
  }, [inVibe, groups, costs, oddOnly, found, sort]);
  // The list keeps the order its set arrived in. What lands after it (couples' ratings, the
  // photographs, a rare find) fills in what the cards say but moves none of them: re-ranked on the
  // spot, the card being read slid away down the list seconds after the list had settled. A place
  // that arrives late joins at the end; the next set (a search, a sort, a filter) is ranked afresh.
  const [listOrder, setListOrder] = useState<{ gen: number; at: Map<string, number> }>({ gen: -1, at: new Map() });
  if (listOrder.gen !== listGen) setListOrder({ gen: listGen, at: new Map(visible.map((p, i) => [p.id, i])) });
  const listed = useMemo(() => {
    const at = listOrder.at;
    return visible
      .map((p, i) => ({ p, key: at.get(p.id) ?? at.size + i }))
      .sort((a, b) => a.key - b.key)
      .map(({ p }) => p);
  }, [visible, listOrder]);
  const picks = useMemo(() => topPicks(inVibe), [inVibe]);
  const listUp = status === "ready" || (status === "loading" && all.length > 0);
  const pickIds = useMemo(() => new Set(picks.map((p) => p.id)), [picks]);
  const oddPicks = useMemo(() => unusualPicks(inVibe, found, UNUSUAL_SHELF, pickIds), [inVibe, found, pickIds]);
  // The shelf of unusual places is chosen when an answer arrives (or the mood changes) and keeps its
  // cards: a rare find landing seconds later joins its end, and one too few to show when the list
  // came never pops in above a list somebody is already reading.
  const [shelf, setShelf] = useState<{ of: Place[] | null; vibe: Vibe | null; ids: string[] }>({ of: null, vibe: null, ids: [] });
  if (listUp && (shelf.of !== places || shelf.vibe !== vibe)) setShelf({ of: places, vibe, ids: oddPicks.map((p) => p.id) });
  const shelfPicks = useMemo(() => {
    if (shelf.ids.length < MIN_UNUSUAL) return [];
    const byId = new Map(inVibe.map((p) => [p.id, p]));
    const kept = shelf.ids.flatMap((id) => {
      const p = byId.get(id);
      return p && found.has(id) ? [p] : [];
    });
    return unusualPicks(inVibe, found, UNUSUAL_SHELF, pickIds, kept);
  }, [shelf.ids, inVibe, found, pickIds]);
  const counts = useMemo(() => Object.fromEntries(GROUP_IDS.map((g) => [g, all.filter((p) => p.group === g).length])) as Record<PlaceGroup, number>, [all]);
  const oddCount = found.size;
  const selected = selectedId ? (ranked.find((p) => p.id === selectedId) ?? null) : null;
  // A place opened over another (a pairing from inside the sheet) swaps what the sheet shows in
  // place, with a fade; only a sheet opening from nothing slides in. Worked out while rendering,
  // from the last render's choice (React's way to follow a change of state without an effect).
  const [sheetOf, setSheetOf] = useState<{ id: string | null; swapped: boolean }>({ id: null, swapped: false });
  if (sheetOf.id !== (selected?.id ?? null)) setSheetOf({ id: selected?.id ?? null, swapped: sheetOf.id !== null && selected !== null });
  const pairs = useMemo(() => (selected ? pairsWith(selected, ranked) : []), [selected, ranked]);
  const planIds = useMemo(() => new Set(plan.stops.map((s) => s.id)), [plan.stops]);
  const ideaInPlan = stops.some((s) => s.place) && stops.every((s) => !s.place || planIds.has(s.place.id));
  // With no idea open, the plan's stops: unless the plan is in another town, whose line ran off the
  // edge of this one's map towards it.
  const planHere = !where || !isFarFromPlan(plan, where);
  const route = useMemo(
    () => (idea ? stops.flatMap((s) => (s.place ? [{ lat: s.place.lat, lng: s.place.lng, name: s.place.name }] : [])) : planHere ? plan.stops.map((s) => ({ lat: s.lat, lng: s.lng, name: stopName(s, locale) })) : []),
    [idea, stops, plan.stops, planHere, locale],
  );

  const loadReviews = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/dates/reviews?place=${encodeURIComponent(id)}&locale=${locale}`);
        const json = res.ok ? ((await res.json()) as { reviews?: PublicReview[] }) : null;
        setReviews((r) => ({ ...r, [id]: json?.reviews ?? [] }));
      } catch {
        setReviews((r) => ({ ...r, [id]: [] }));
      }
    },
    [locale],
  );
  const submitReview = useCallback(
    async (place: Place, input: { stars: number; cost: Cost | null; wentAs: WentAs | null; body: string }): Promise<"ok" | "unauthenticated" | "failed"> => {
      try {
        const res = await fetch("/api/dates/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ placeId: place.id, stars: input.stars, cost: input.cost, wentAs: input.wentAs, body: input.body, placeName: place.name, lat: place.lat, lng: place.lng, locale }) });
        if (res.status === 401) return "unauthenticated";
        if (!res.ok) return "failed";
        await Promise.all([loadReviews(place.id), loadRatings(place.id)]);
        return "ok";
      } catch {
        return "failed";
      }
    },
    [locale, loadReviews, loadRatings],
  );
  const deleteReview = useCallback(
    async (place: Place): Promise<boolean> => {
      try {
        const res = await fetch(`/api/dates/reviews?place=${encodeURIComponent(place.id)}`, { method: "DELETE" });
        if (!res.ok) return false;
        setRatings((r) => {
          const next = { ...r };
          delete next[place.id];
          return next;
        });
        await Promise.all([loadReviews(place.id), loadRatings(place.id)]);
        return true;
      } catch {
        return false;
      }
    },
    [loadReviews, loadRatings],
  );

  // What a place was opened from, so that closing it hands the keyboard back there instead of
  // dropping it on the page (the next Tab went to the footer, or to the Map button).
  const opener = useRef<HTMLElement | null>(null);
  const open = useCallback(
    (id: string | null) => {
      const from = document.activeElement;
      // A place opened from inside the sheet (its pairings) keeps the first one's opener; a map pill
      // is kept out of the tab order on purpose, so there is nothing to hand back to.
      if (id && from instanceof HTMLElement && !from.closest("[data-place-sheet]")) opener.current = from.tabIndex >= 0 && from.getAttribute("aria-hidden") !== "true" ? from : null;
      setLinkedPlace(null);
      setSelectedId(id);
      if (id && !(id in reviews)) void loadReviews(id);
      if (!id || id in details) return;
      fetch(`/api/dates/place?id=${encodeURIComponent(id)}&locale=${locale}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ details?: PlaceDetails }>) : null))
        .then((json) => setDetails((d) => ({ ...d, [id]: json?.details ?? null })))
        .catch(() => setDetails((d) => ({ ...d, [id]: null })));
    },
    [details, locale, reviews, loadReviews],
  );

  // The link's place, once the search around it has an answer with it in. A frame later, not in the
  // effect itself: the sheet opens as if tapped (details, reviews), which sets state.
  useEffect(() => {
    if (!linkedPlace || !where) return;
    const moved = distanceKm(where, linkedPlace.at) > SAME_PLACE_KM;
    const found = !moved && ranked.some((p) => p.id === linkedPlace.id);
    if (!found && !moved) return;
    const frame = requestAnimationFrame(() => (found ? open(linkedPlace.id) : setLinkedPlace(null)));
    return () => cancelAnimationFrame(frame);
  }, [linkedPlace, where, ranked, open]);

  const stamp = useCallback((p: Plan) => ({ ...p, date, ...(where?.name && shareable ? { where: where.name.slice(0, 80) } : {}) }), [date, where, shareable]);
  const sayAboutPlan = useCallback((text: string) => setPlanNotice({ text, at: Date.now() }), []);
  /**
   * A place in another town is not one more stop of this date: London's plan with a café in Lisbon
   * read "24756 min walk". It starts a new plan once they have said so: true then, null when they
   * would rather keep the old one, false when the place is near enough to join it.
   */
  const startsOver = useCallback((at: LatLng): boolean | null => {
    if (!isFarFromPlan(plan, at)) return false;
    return window.confirm(plan.where ? t("plan.newCity", { place: plan.where }) : t("plan.newCityUnnamed")) ? true : null;
  }, [plan, t]);
  const togglePlan = useCallback(
    (place: Place) => {
      if (planIds.has(place.id)) return updatePlan((p) => removeStop(p, place.id));
      const fresh = startsOver(place);
      if (fresh === null) return;
      if (!fresh && plan.stops.length >= MAX_STOPS) return sayAboutPlan(t("plan.full", { max: MAX_STOPS }));
      updatePlan((p) => stamp(addStop(fresh ? EMPTY_PLAN : p, toStop(place))));
    },
    [plan.stops.length, planIds, startsOver, sayAboutPlan, stamp, t, updatePlan],
  );
  // An idea goes in whole or not at all: with one space left, its first stop went in, its second
  // didn't, nothing was said, and the button went on offering to add it.
  const addIdea = useCallback(() => {
    if (!idea) return;
    const picked = stops.flatMap((s, i) => (s.place ? [toStop(s.place, times[i])] : []));
    if (picked.length === 0) return;
    const fresh = startsOver(picked[0]);
    if (fresh === null) return;
    if (!addStops(fresh ? EMPTY_PLAN : plan, picked).fits) return sayAboutPlan(t("plan.ideaFull", { max: MAX_STOPS }));
    updatePlan((p) => {
      const { plan: next, fits } = addStops(fresh ? EMPTY_PLAN : p, picked);
      return fits ? stamp({ ...next, idea: idea.id }) : p;
    });
  }, [idea, stops, times, plan, startsOver, sayAboutPlan, stamp, t, updatePlan]);
  useEffect(() => {
    if (!planNotice) return;
    const timer = window.setTimeout(() => setPlanNotice(null), PLAN_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [planNotice]);

  // A place put away hands the keyboard back to what opened it, if the keyboard was in the sheet
  // (or had nowhere to be once the sheet went); a tap somewhere else keeps its own focus.
  const sheetWasOpen = useRef(false);
  useEffect(() => {
    if (selectedId) {
      sheetWasOpen.current = true;
      return;
    }
    if (!sheetWasOpen.current) return;
    sheetWasOpen.current = false;
    const target = opener.current;
    opener.current = null;
    const active = document.activeElement;
    if (!target?.isConnected || (active && active !== document.body && !active.closest("[data-place-sheet]"))) return;
    target.focus({ preventScroll: true });
  }, [selectedId]);

  // An idea opens under the rail, and on a phone that is below the fold: the only sign of the tap was
  // a ring on the card. So is a link with ?idea= in it, which landed at the top of the page. When it
  // opens that low, it is brought up under the header.
  const ideaBox = useRef<HTMLDivElement>(null);
  const started = status !== "starting";
  useEffect(() => {
    const el = ideaBox.current;
    if (!ideaId || !started || !el || el.getBoundingClientRect().top < window.innerHeight * 0.6) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  }, [ideaId, started]);

  // A phone only makes the map when Map is tapped, and MapLibre is ~300 KB: once the list is up and
  // the phone has nothing else to do, its files and the style are fetched, so the tap shows pins at
  // once instead of after seconds of "Loading…". Not when the phone has asked to save data.
  const listReady = status === "ready";
  useEffect(() => {
    if (!listReady || isDesktop || mapOpened || !navigator.onLine) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => warmMap(), { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => warmMap(), 2500);
    return () => window.clearTimeout(id);
  }, [listReady, isDesktop, mapOpened]);

  // Where the open place's sheet sits over the map, so the map keeps the chosen place out from under it.
  const sheetBox = useRef<HTMLDivElement>(null);
  const sheetCover = useCallback(() => sheetBox.current?.getBoundingClientRect() ?? null, []);

  const mapLabels = useMemo(
    () => ({
      zoomToSee: t("map.zoomToSee"),
      nearMe: t("where.nearMe"),
      loading: t("map.loading"),
      // On a phone the map is a screen of its own, with no list beside it: point at the List button.
      unavailable: isDesktop ? t("map.unavailable") : t("map.unavailablePhone"),
      map: t("map.label"),
      zoomIn: t("map.zoomIn"),
      zoomOut: t("map.zoomOut"),
      credits: t("map.credits"),
      retry: t("map.retry"),
    }),
    [t, isDesktop],
  );
  const budget = useMemo(() => [t("ideas.budget.0"), t("ideas.budget.1"), t("ideas.budget.2"), t("ideas.budget.3")] as [string, string, string, string], [t]);
  const sortLabels: SortLabels = {
    label: t("sort.label"),
    name: { best: t("sort.best"), rated: t("sort.rated"), nearest: t("sort.nearest"), cheapest: t("sort.cheapest") },
    sub: { best: t("sort.bestSub"), rated: t("sort.ratedSub"), nearest: t("sort.nearestSub"), cheapest: t("sort.cheapestSub") },
  };
  const whereLabels ={ label: t("where.label"), placeholder: t("where.placeholder"), nearMe: t("where.nearMe"), searching: t("where.searching"), nothing: t("where.nothing"), failed: t("where.failed") };

  // The script that starts the search from the HTML only belongs in the server's HTML (and the
  // hydration that matches it); rendered afterwards, React would only complain it cannot run.
  if (!isClient || status === "starting") return <ExplorerSkeleton locale={locale} early={!isClient} />;

  if (status === "empty" || !where) {
    return (
      // At least a screen tall and centred in it on a desktop: on a big monitor it sat in the top 40%
      // of a page that is always a screen tall (for the map), over blank paper.
      <section className="container-x grid items-center gap-12 pt-10 pb-20 sm:pt-14 lg:min-h-dvh lg:grid-cols-2 lg:content-center lg:gap-16 lg:pt-[calc(var(--header-h)+3.5rem)]">
        <div>
          <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
          <h1 className="mt-4 display-hero text-forest">{t("empty.title")}</h1>
          <p className="mt-5 max-w-md text-[18px] leading-relaxed text-forest/70">{t("empty.sub")}</p>
          <WhereBox value={null} locale={locale} labels={whereLabels} locating={locating} autoFocus size="lg" className="mt-8 max-w-xl" onPick={(w) => go(w)} onNearMe={nearMe} />
          {notice || townMissing ? (
            <p role="status" className="mt-3 text-sm text-destructive">
              {notice ?? t("where.nothing")}
            </p>
          ) : null}
          <p className="mt-9 text-[12px] font-medium tracking-[0.2em] text-forest/65 uppercase">{t("empty.or")}</p>
          <ul className="mt-4 flex max-w-xl flex-wrap gap-2">
            {STARTER_CITIES.map((city) => {
              // The name the page's language uses, for the chip and for the heading and link it leads to.
              const name = starterName(city, locale);
              return (
                <li key={city.name}>
                  <button type="button" onClick={() => go({ lat: city.lat, lng: city.lng, name })} className="h-11 rounded-full border border-rose/15 bg-white px-4 text-[14.5px] font-medium text-forest shadow-soft transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-rose-mist">
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]" aria-hidden="true">
          <img src={HERO_ART.dates} srcSet={heroSrcSet(HERO_ART.dates)} sizes={heroSizes("(min-width: 1024px) 560px")} alt="" width={1800} height={1350} decoding="async" className="aspect-[4/3] w-full rotate-[1.5deg] rounded-[36px] object-cover shadow-[0_40px_90px_-40px_rgba(120,20,60,0.6)] ring-8 ring-white" />
          <span className="absolute -bottom-5 -left-3 rotate-[-5deg] rounded-2xl bg-white px-4 py-3 font-hand text-[1.5rem] leading-none text-rose-deep shadow-lift sm:-left-6">{t("empty.note")}</span>
        </div>
      </section>
    );
  }

  const showMap = isDesktop || view === "map";
  const mountMap = isDesktop || mapOpened;
  const phoneMap = showMap && !isDesktop;
  const sheet = selected ? (
    <PlaceSheet
      key={selected.id}
      place={selected}
      pairs={pairs}
      reviews={reviews[selected.id]}
      loginNext={typeof window === "undefined" ? "/dates" : `${window.location.pathname}${window.location.search}`}
      onSubmitReview={(input) => submitReview(selected, input)}
      onDeleteReview={() => deleteReview(selected)}
      onOpenPlace={open}
      details={details[selected.id]}
      date={date}
      where={shareable ? where.name : ""}
      locale={locale}
      inPlan={planIds.has(selected.id)}
      onTogglePlan={() => togglePlan(selected)}
      onClose={() => setSelectedId(null)}
      swipe={!isDesktop}
      entrance={sheetOf.swapped ? "swap" : "open"}
      quirk={found.get(selected.id)?.quirk}
      // Over a phone's map, shorter than over the list: the place that was tapped stays in view above it.
      className={phoneMap ? "max-h-[62dvh]" : undefined}
      labels={{
        close: t("place.close"),
        address: t("a11y.address"),
        hours: t("a11y.hours"),
        add: t("place.add"),
        remove: t("place.remove"),
        directions: t("place.directions"),
        elsewhere: t("place.elsewhere"),
        website: t("place.website"),
        photosLink: t("place.reviewsLink"),
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
        photoBy: (author) => t("place.photoBy", { author }),
        photoFrom: t("place.photoFrom"),
        readMore: t("place.readMore"),
        rank: (n, of, group) => t("place.rank", { n, of, group }),
        reviewsCount: (n) => t("reviews.count", { n }),
        pairs: t("place.pairs"),
        walkBetween: (m) => t("place.walkBetween", { minutes: m }),
        share: t("place.share"),
        shareCopied: t("place.shareCopied"),
        shareText: t("place.shareText"),
        reviews: {
          title: t("reviews.title"),
          publicNote: t("reviews.publicNote"),
          report: t("reviews.report"),
          summary: (stars, n) => t("reviews.summary", { stars, n }),
          none: t("reviews.none"),
          rate: t("reviews.rate"),
          edit: t("reviews.edit"),
          yourStars: t("reviews.yourStars"),
          starWords: [t("reviews.yourStars"), t("reviews.star1"), t("reviews.star2"), t("reviews.star3"), t("reviews.star4"), t("reviews.star5")],
          cost: t("reviews.cost"),
          wentAs: t("reviews.wentAs"),
          body: t("reviews.body"),
          bodyPlaceholder: t("reviews.bodyPlaceholder"),
          send: t("reviews.send"),
          sending: t("reviews.sending"),
          cancel: t("reviews.cancel"),
          remove: t("reviews.remove"),
          signIn: t("reviews.signIn"),
          signInBlurb: t("reviews.signInBlurb"),
          failed: t("reviews.failed"),
          thanks: t("reviews.thanks"),
          when: (iso) => formatDay(iso.slice(0, 10), locale, "short"),
        },
      }}
    />
  ) : null;

  return (
    // Reduced motion: whatever slides here only fades (motion's "user" setting drops the transforms).
    <MotionConfig reducedMotion="user">
    <div className="relative lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      {/* ---------------------------------------------------------------- the list */}
      <div className="px-5 pt-7 pb-32 sm:px-8 lg:px-6 lg:pt-[calc(var(--header-h)+1.25rem)]">
        <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
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
          // Under a phone's full-screen map the map says it instead (MapView's notice), and once is enough.
          <p role="status" aria-hidden={phoneMap || undefined} className="mt-2 text-[13.5px] text-destructive">
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
                <span className="flex shrink-0 flex-col items-center text-[11px] font-medium text-forest/65">
                  <Sunset aria-hidden="true" className="size-4 text-star" />
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
                {forecast ? t("weather.tooFar") : forecastFailed ? t("weather.unavailable") : t("weather.loading")}
              </p>
            </>
          )}
        </div>

        {/* ideas */}
        <div className="mt-9">
          <IdeaRail
            heading={
              <>
                <h2 className="display-md text-forest">{t("ideas.title")}</h2>
                <p className="mt-1 text-[14px] text-forest/65">{t("ideas.sub")}</p>
              </>
            }
            filters={
              // Wrapped on a desktop: a mouse wheel can't scroll a row sideways, and "Rainy day" was out of reach.
              <div className="scrollbar-none -mx-5 mt-3.5 flex gap-1.5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:-mx-6 lg:flex-wrap lg:px-6" role="group" aria-label={t("ideas.vibes")} data-tour="vibes">
                {VIBE_IDS.map((v) => (
                  <button key={v} type="button" aria-pressed={vibe === v} onClick={() => { setVibe(vibe === v ? null : v); nextList(); }} className={cn("h-11 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors lg:h-10", vibe === v ? "bg-rose text-white" : "bg-white text-forest/75 ring-1 ring-forest/10 hover:bg-rose-soft")}>
                    {VIBES[v][locale]}
                  </button>
                ))}
              </div>
            }
            empty={<p className="mt-4 rounded-2xl bg-white/70 p-4 text-[14px] text-forest/65">{t("ideas.noneForVibe")}</p>}
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
        </div>
        {idea ? (
          <div ref={ideaBox} className="scroll-mt-[calc(var(--header-h)+12px)]">
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
          </div>
        ) : null}

        {/* the best bets, as a shelf */}
        {listUp && !idea ? <TopPicks picks={picks} locale={locale} selectedId={selectedId} onOpen={open} onHover={setHoveredId} labels={{ title: t("picks.title", { place: where.name && shareable ? where.name : t("picks.here") }), sub: t("picks.sub"), reviews: (n) => t("reviews.count", { n }), noReviews: t("reviews.noneShort"), previous: t("picks.previous"), next: t("picks.next") }} /> : null}

        {/* the places with a story, as a shelf of their own */}
        {listUp && !idea ? <UnusualShelf picks={shelfPicks} found={found} locale={locale} selectedId={selectedId} onOpen={open} onHover={setHoveredId} labels={{ title: t("unusual.title", { place: where.name && shareable ? where.name : t("picks.here") }), sub: t("unusual.sub"), reviews: (n) => t("reviews.count", { n }), walk: (m) => t("place.walk", { minutes: m }), previous: t("unusual.previous"), next: t("unusual.next") }} /> : null}

        {/* places */}
        <div className="mt-9 flex items-end justify-between gap-4">
          <h2 className="display-md text-forest">{t("places.title")}</h2>
          {status === "ready" || all.length > 0 ? <p className="text-[13px] text-forest/65 tabular-nums">{t("places.count", { count: visible.length })}</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SortMenu
            value={sort}
            labels={sortLabels}
            onChange={(s) => {
              setSort(s);
              nextList();
            }}
          />
          {/* Each chip on one line; the row wraps instead. Squeezed, "Lo de una cena" broke onto three lines and hung out of its pill. */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("places.cost")}>
            {COST_IDS.map((c) => {
              const on = costs.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => { setCosts(on ? costs.filter((x) => x !== c) : [...costs, c]); setShown(PAGE); nextList(); }} className={cn("h-11 shrink-0 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors lg:h-10", on ? "bg-forest text-cream" : "bg-white text-forest/75 ring-1 ring-forest/10 hover:bg-forest/5")}>
                  {COST_LABELS[c][locale]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="scrollbar-none -mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8 lg:-mx-6 lg:flex-wrap lg:px-6" role="group" aria-label={t("places.filter")}>
          <button type="button" aria-pressed={groups.length === 0 && !oddOnly} onClick={() => { if (groups.length > 0 || oddOnly) nextList(); setGroups([]); setOddOnly(false); setShown(PAGE); }} className={cn("h-11 shrink-0 rounded-full px-4 text-[13.5px] font-semibold transition-colors lg:h-10", groups.length === 0 && !oddOnly ? "bg-forest text-cream" : "bg-white text-forest/75 ring-1 ring-forest/10 hover:bg-forest/5")}>
            {t("places.all")}
          </button>
          {/* A category across the groups, the way Airbnb's "OMG!" is: a cellar bar, a rooftop, a planetarium. */}
          <button
            type="button"
            aria-pressed={oddOnly}
            disabled={oddCount === 0 && !oddOnly}
            onClick={() => {
              setOddOnly(!oddOnly);
              setShown(PAGE);
              nextList();
            }}
            className={cn("inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 transition-colors disabled:opacity-35 lg:h-10", oddOnly ? "bg-rose-deep text-white ring-transparent" : "bg-white text-rose-deep ring-forest/10 hover:bg-rose-mist")}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            {t("unusual.chip")}
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
                  nextList();
                }}
                className={cn("inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold ring-1 transition-colors disabled:opacity-35 lg:h-10", on ? "text-white ring-transparent" : "bg-white ring-forest/10 hover:bg-forest/5")}
                // The group's ink, not its pin colour: gold chip text on white, and white on a gold chip, read at 3.7:1.
                style={on ? { background: GROUPS[g].ink } : { color: GROUPS[g].ink }}
              >
                <GroupIcon group={g} className="size-4" />
                {GROUPS[g].label[locale]}
              </button>
            );
          })}
        </div>

        {/* Relative: a set of cards on its way out (and the skeletons) is lifted out of the flow where
            it stands, "popLayout", and fades there while the next set fades in under it. */}
        <div className="ethos-place-list relative mt-4 space-y-2.5" aria-busy={status === "loading"} data-tour="places">
          <AnimatePresence mode="popLayout" initial={false}>
            {status === "loading" && all.length === 0 ? (
              <ListSet key="skeleton">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[72px] animate-pulse rounded-[20px] bg-white/70" />)}</ListSet>
            ) : null}
          </AnimatePresence>
          {status === "error" && all.length === 0 ? (
            <div className="rounded-[20px] bg-white p-5 text-[14.5px] leading-relaxed text-forest/70 ring-1 ring-forest/5">
              {t("places.error")}{" "}
              <button type="button" onClick={() => go(where, { share: shareable })} className="font-semibold text-rose-deep underline underline-offset-4">
                {t("places.retry")}
              </button>
            </div>
          ) : null}
          {status === "ready" && visible.length === 0 && all.length > 0 ? <p className="rounded-[20px] bg-white p-5 text-[14.5px] leading-relaxed text-forest/70 ring-1 ring-forest/5">{t("places.noneInFilter")}</p> : null}
          {status === "ready" && all.length === 0 ? (
            // Nothing mapped here at all (the middle of the sea): "drag the map to the nearest town" was
            // no help on a blank blue phone map. The box above, or a city, in one tap.
            <div className="rounded-[20px] bg-white p-5 text-[14.5px] leading-relaxed text-forest/70 ring-1 ring-forest/5">
              <p>{t("map.nothingHere")}</p>
              <ul className="mt-3.5 flex flex-wrap gap-2">
                {STARTER_CITIES.map((city) => {
                  const name = starterName(city, locale);
                  return (
                    <li key={city.name}>
                      <button
                        type="button"
                        onClick={() => {
                          setOrigin(null);
                          go({ lat: city.lat, lng: city.lng, name });
                        }}
                        className="h-11 rounded-full border border-rose/15 bg-white px-3.5 text-[13.5px] font-medium text-forest shadow-soft transition-colors hover:bg-rose-mist lg:h-10"
                      >
                        {name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <AnimatePresence mode="popLayout" initial={false}>
            <ListSet key={listGen}>
          {listed.slice(0, shown).map((place, i) => (
            <ListedCard
              key={place.id}
              hover={hover}
              // Its place in its own page: the cards "show more" adds arrive in a stagger of their own.
              index={i % PAGE}
              place={place}
              locale={locale}
              selected={place.id === selectedId}
              inPlan={planIds.has(place.id)}
              onOpen={() => open(place.id)}
              onHover={(on) => setHoveredId(on ? place.id : null)}
              onTogglePlan={() => togglePlan(place)}
              unusual={found.get(place.id)}
              labels={{ add: t("place.add"), remove: t("place.remove"), walk: (m) => t("place.walk", { minutes: m }), free: t("place.free"), photo: t("place.photo"), reviews: (n) => t("reviews.count", { n }), rank: (n, of, group) => t("place.rank", { n, of, group }) }}
            />
          ))}
            </ListSet>
          </AnimatePresence>
          {visible.length > shown ? (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-2 h-12 w-full rounded-full border border-forest/15 bg-white text-[14.5px] font-semibold text-forest hover:bg-forest/5">
              {t("places.more", { count: Math.min(PAGE, visible.length - shown) })}
            </button>
          ) : null}
        </div>
        <p className="mt-6 text-[12px] leading-relaxed text-forest/65">{t("places.credit")}</p>
      </div>

      {/* ---------------------------------------------------------------- the map */}
      <div className={cn("ethos-phone-map lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:block lg:h-dvh", showMap && "is-open", phoneMap && "ethos-map-full")}>
        {mountMap ? (
          <HoveredMap
            hover={hover}
            center={where}
            places={visible}
            selected={selected}
            ratings={ratings}
            locale={locale}
            onHover={setHoveredId}
            route={route}
            // The idea and its shuffles: the map frames each one (see MapView's fitRoute).
            fitRoute={idea ? `${idea.id}:${skip.join(".")}` : null}
            origin={origin}
            searching={status === "loading"}
            locating={locating}
            // On a phone the map covers the list, where the notice is written ("we couldn't get your location").
            notice={phoneMap ? notice : null}
            cover={sheetCover}
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
          <AnimatePresence>
            {showMap && sheet ? (
              <div ref={sheetBox} className="pointer-events-auto">
                {sheet}
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* On a phone looking at the list, a place opens over the list, on a scrim that fades in behind
          it; a tap on the scrim puts it away, and a finger dragged on it still scrolls the page. */}
      {!showMap ? (
        <>
          <AnimatePresence>{sheet ? <motion.div key="scrim" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.25, ease: QUINT } }} exit={FADE_OUT} onClick={() => setSelectedId(null)} className="fixed inset-0 z-[58] bg-forest/25" /> : null}</AnimatePresence>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]">
            <AnimatePresence>{sheet ? <div className="pointer-events-auto">{sheet}</div> : null}</AnimatePresence>
          </div>
        </>
      ) : null}

      {/* What adding to the plan had to say, over whatever they are looking at, the open sheet included,
          just above the dock. The live region is always there, so a message put in it is read out. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.75rem)] z-[70] flex justify-center px-4 lg:right-auto lg:w-[560px]">
        <AnimatePresence>
          {planNotice ? (
            <motion.p key="plan-notice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.24, ease: QUINT } }} exit={FADE_OUT} className="max-w-md rounded-2xl bg-forest px-4 py-2.5 text-center text-[13.5px] leading-snug font-semibold text-cream shadow-lift">
              {planNotice.text}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ---------------------------------------------------------------- the dock */}
      {/* It steps aside while a place is open (the sheet has the same buttons), sliding down and
          back up rather than blinking out. */}
      <AnimatePresence initial={false}>
      {!selected ? (
        // Back a beat after the sheet has gone: at once, it rose over the sheet still on its way down.
        <motion.div key="dock" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.26, delay: 0.14, ease: QUINT } }} exit={{ opacity: 0, y: 16, transition: { duration: 0.2, ease: QUINT } }} className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex items-center justify-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:right-auto lg:w-[560px]", showMap && !isDesktop && "z-[55]")}>
          <button
            type="button"
            // The press starts MapLibre's download a beat before the click opens the map.
            onPointerDown={() => warmMap(true)}
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
            <Link href="/plan" data-tour="plan" className="pointer-events-auto inline-flex h-12 items-center gap-2.5 rounded-full bg-rose pr-4 pl-2 text-[14.5px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(176,36,90,0.85)] transition-transform hover:-translate-y-0.5">
              <span className="grid size-8 place-items-center rounded-full bg-white text-[13px] font-bold text-rose-deep tabular-nums">{plan.stops.length}</span>
              {t("plan.open")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}

/**
 * What the page's HTML carries before the explorer has loaded, which on a slow phone is seconds: the
 * heading, and the ideas, which don't depend on where anybody is (their photographs are what a phone
 * paints first). A few lines of script in it start the search the explorer is about to make and write
 * the town from the link into the heading (lib/dates/early.ts). The heading's text is theirs from
 * then on, so hydration is told to leave it as it finds it.
 */
function ExplorerSkeleton({ locale, early }: { locale: "en" | "es"; early: boolean }) {
  const t = useTranslations("dates");
  const budget = [t("ideas.budget.0"), t("ideas.budget.1"), t("ideas.budget.2"), t("ideas.budget.3")] as [string, string, string, string];
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      <div className="px-5 pt-7 pb-32 sm:px-8 lg:px-6 lg:pt-[calc(var(--header-h)+1.25rem)]">
        <p className="text-[12px] font-medium tracking-[0.22em] text-rose-deep uppercase">{t("eyebrow")}</p>
        <h1 id={TITLE_ID} suppressHydrationWarning className="mt-2 display-lg text-forest">
          {t("titleNear")}
        </h1>
        {/* The server's copy of earlyStart and the browser's are compiled separately and need not match
            to the character; the one that runs is the server's, so hydration isn't to compare them. */}
        {early ? <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: earlyScript({ key: EARLY_KEY, whereKey: WHERE_KEY, locale, radius: snapSearch({ lat: 0, lng: 0 }, DEFAULT_RADIUS_M).radiusM, headingId: TITLE_ID, titleIn: t.raw("titleIn") as string, warm: [MAPLIBRE_URL, MAPLIBRE_SHARED_URL, MAP_STYLE_URL] }) }} /> : null}
        <div className="mt-5 flex flex-wrap gap-2" aria-hidden="true">
          <div className="h-12 min-w-[230px] flex-1 animate-pulse rounded-full bg-white/70" />
          <div className="h-12 w-36 animate-pulse rounded-full bg-white/70" />
        </div>
        <div className="mt-4 h-[72px] animate-pulse rounded-[20px] bg-white/70" aria-hidden="true" />
        <div className="mt-9">
          <IdeaRail
            heading={
              <>
                <h2 className="display-md text-forest">{t("ideas.title")}</h2>
                <p className="mt-1 text-[14px] text-forest/65">{t("ideas.sub")}</p>
              </>
            }
            filters={
              <div className="scrollbar-none -mx-5 mt-3.5 flex gap-1.5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:-mx-6 lg:flex-wrap lg:px-6" aria-hidden="true">
                {VIBE_IDS.map((v) => (
                  <span key={v} className="inline-flex h-11 shrink-0 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-forest/75 ring-1 ring-forest/10 lg:h-10">
                    {VIBES[v][locale]}
                  </span>
                ))}
              </div>
            }
            ideas={IDEAS}
            doable={null}
            selectedId={null}
            locale={locale}
            onPick={() => undefined}
            labels={{ previous: t("ideas.previous"), next: t("ideas.next"), budget, hours: (h) => t("ideas.hours", { hours: h }), notNearby: t("ideas.notNearby") }}
          />
        </div>
      </div>
      {/* The map's own paper, so the map fades in over the same colour instead of a lighter one. */}
      <div className="hidden h-dvh lg:block" style={{ background: MAP_PAPER }} />
    </div>
  );
}
