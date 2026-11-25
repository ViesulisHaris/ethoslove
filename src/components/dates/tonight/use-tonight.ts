"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { Ymd } from "@/lib/dates/calendar";
import type { DateKind } from "@/lib/dates/date-kinds";
import { fillStops } from "@/lib/dates/ideas";
import type { LatLng } from "@/lib/dates/geo";
import type { Place } from "@/lib/dates/places";
import { loadPicker, placesInReach, savePicker, type ReachMinutes } from "@/lib/dates/reach";
import { placeNow, placesFor, rankTonight, startFor, TONIGHT_ENDS_MIN, tonightPlan, tonightTimes, type TonightPick, type TonightSetting } from "@/lib/dates/tonight";
import { isWet, type DayWeather, type Forecast } from "@/lib/dates/weather";
import { writeLink } from "@/lib/saved-dates/link";
import { usePlan } from "@/components/dates/use-plan";
import type { TonightChoice, TonightWhen } from "./tonight-form";

export type TonightData = { places: Place[]; forecast: Forecast | null };
export type TonightProblemKind = "failed" | "late" | "none";

type Options = {
  kind?: DateKind;
  boost?: Readonly<Record<string, number>>;
  /** The day each "when" stands for, given today's date at the place. */
  dayOf: (when: TonightWhen, today: Ymd) => Ymd;
  /** Called when "Plan it" is pressed; resolves to the places and forecast, or null when they cannot be had. */
  load: () => Promise<TonightData | null> | TonightData | null;
  /** The name to stamp on the plan, when the place may be named (never "near me"). */
  whereName?: string;
  /** What a result belongs to (the place, and for the explorer the day). A result made for another key is not shown. */
  keyOf: (date: Ymd) => string;
  currentKey: string;
  /**
   * Keep the last plan in this tab (sessionStorage), so Back from /plan or a reload shows it again
   * instead of an empty planner. Only for a place that may be named: "near me" is never kept.
   */
  remember?: boolean;
  /**
   * The host's own exact position, when it already has one (the map's "Near me"): the distance
   * choice uses it before asking the browser. Never stored, never sent.
   */
  position?: () => LatLng | null;
};

const noSubscribe = () => () => {};
/** The browser's position, asked on a press only, with the where box's own options. */
const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 };

/** How long a kept plan is shown again: after that "tonight" has moved on. */
const KEPT_FOR_MS = 2 * 60 * 60 * 1000;
const KEPT_KEY = "ethos.dates.tonight.v1";
type Kept = { at: number; path: string; choice: TonightChoice; when: TonightWhen; outcome: Outcome };

function readKept(path: string, now: number): Kept | null {
  try {
    const kept = JSON.parse(window.sessionStorage.getItem(KEPT_KEY) ?? "null") as Kept | null;
    if (!kept || kept.path !== path || typeof kept.at !== "number" || now - kept.at > KEPT_FOR_MS || now < kept.at) return null;
    const o = kept.outcome;
    if (!o || o.problem !== null || !Array.isArray(o.picks) || o.picks.length === 0 || !Array.isArray(o.places) || typeof o.key !== "string") return null;
    return kept;
  } catch {
    return null;
  }
}
function writeKept(kept: Kept | null) {
  try {
    if (kept) window.sessionStorage.setItem(KEPT_KEY, JSON.stringify(kept));
    else window.sessionStorage.removeItem(KEPT_KEY);
  } catch {
    // No storage, or full: the plan is simply not kept.
  }
}

/** What was asked, kept with the answer: the card speaks of the wishes it was made from, not of the form as it stands now. */
type Asked = { choice: TonightChoice; when: TonightWhen };
type Outcome = ({ key: string; problem: TonightProblemKind } | { key: string; problem: null; picks: TonightPick[]; at: number; day: DayWeather | undefined; date: Ymd; places: Place[]; moved?: boolean }) & {
  asked: Asked;
  /** Shown again from this tab's storage, not just asked for: it takes no focus and does not scroll. */
  restored?: boolean;
};

/** Tomorrow's picks from the places already loaded, for a tonight that has none; null when tomorrow has none either. */
function moveToTomorrow(o: Options, choice: TonightChoice, data: TonightData, now: { date: Ymd; minutes: number }): { key: string; problem: null; picks: TonightPick[]; day: DayWeather | undefined; date: Ymd } | null {
  const date = o.dayOf("tomorrow", now.date);
  const day = data.forecast?.days.find((d) => d.date === date);
  const picks = rankTonight({ ...choice, kind: o.kind, startMin: startFor(false, date, now) }, { day, places: data.places, boost: o.boost });
  return picks.length > 0 ? { key: o.keyOf(date), problem: null, picks, day, date } : null;
}

/**
 * One planner's state: the choices, the result, and the two actions. The host says where the places
 * and the forecast come from (`load`, which may answer later) and what the plan is called. A result
 * belongs to the key it was made for; when the host's place (or day) changes, the old answer simply
 * stops matching and is not shown. No effect resets anything.
 */
export function useTonight(options: Options) {
  const t = useTranslations("dates");
  const router = useRouter();
  const [own, updatePlan] = usePlan();
  const [choice, setChoiceState] = useState<TonightChoice>({});
  // Why the distance was set back, said under the sentence. The position itself lives only in the
  // ref below, for this page: never in state that is stored, never in a URL, never in an event.
  const [reachNotice, setReachNotice] = useState<string | undefined>(undefined);
  const position = useRef<LatLng | null>(null);
  const canLocate = useSyncExternalStore(noSubscribe, () => "geolocation" in navigator, () => true);
  const [when, setWhen] = useState<TonightWhen>("tonight");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // "This replaces the plan you were making": asked inside the card, for the pick it was asked about.
  const [confirming, setConfirming] = useState<Outcome | null>(null);
  // The host's latest options, for `plan`, which runs after an await.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  // The plan kept in this tab, read after the first render (the server has no storage).
  // Indoors or outdoors and the distance chosen last time, read after hydration (the server has no
  // storage). Restoring a distance asks for nothing: the position is asked on the next press.
  useEffect(() => {
    const kept = loadPicker();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after hydration
    if (kept.setting || kept.reach) setChoiceState((c) => ({ ...c, ...kept }));
  }, []);

  /** Sets the distance back to "any" and says why in one line. */
  const off = (notice: string): null => {
    setReachNotice(notice);
    setChoiceState((c) => {
      const next = { ...c, reach: undefined };
      savePicker({ setting: next.setting });
      return next;
    });
    return null;
  };

  /** The position for the distance choice: the host's own, else one already had on this page, else the browser's, once. Null when refused or unavailable, and the choice is then set back. */
  const locate = (): Promise<LatLng | null> => {
    const fromHost = latest.current.position?.() ?? null;
    if (fromHost) return Promise.resolve(fromHost);
    if (position.current) return Promise.resolve(position.current);
    if (!("geolocation" in navigator)) return Promise.resolve(off(t("tonight.reachNone")));
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          position.current = { lat: p.coords.latitude, lng: p.coords.longitude };
          resolve(position.current);
        },
        () => resolve(off(t("tonight.reachDenied"))),
        GEO_OPTIONS,
      );
    });
  };

  const setChoice = (next: TonightChoice) => {
    const before = choice.reach;
    setChoiceState(next);
    savePicker({ setting: next.setting, reach: next.reach });
    if (next.reach === undefined) return;
    setReachNotice(undefined);
    // Choosing a distance is the press that may ask for the position.
    if (next.reach !== before || !position.current) void locate();
  };

  const remember = Boolean(options.remember);
  useEffect(() => {
    if (!remember) return;
    const kept = readKept(window.location.pathname, Date.now());
    if (!kept) return;
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage is only readable after hydration */
    setChoiceState({ ...(kept.choice ?? {}), ...loadPicker() });
    setWhen(kept.when ?? "tonight");
    setOutcome({ ...kept.outcome, restored: true });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [remember]);
  const keep = (o: Outcome, asked: Asked) => {
    if (!latest.current.remember) return;
    // A plan made within a walk of where the person stands is never kept: its places would say roughly where that is.
    if (asked.choice.reach !== undefined) return writeKept(null);
    writeKept(o.problem === null && latest.current.whereName ? { at: Date.now(), path: window.location.pathname, choice: asked.choice, when: asked.when, outcome: { ...o, restored: false } } : null);
  };

  const current = outcome && outcome.key === options.currentKey ? outcome : null;
  const problem = current?.problem ?? null;
  let result: { pick: TonightPick; stops: { place: Place | null; options: number }[]; times: string[]; wet: boolean; more: boolean; asked?: 0 | 1 | 2 | 3; when: TonightWhen; date: Ymd; restored: boolean; moved: boolean; setting?: TonightSetting } | null = null;
  if (current && current.problem === null) {
    const pick = current.picks[current.at % current.picks.length];
    result = {
      pick,
      // The same places the ranking judged it by: no sports bar after the theatre (tonight.ts placesFor).
      stops: fillStops(pick.idea, placesFor(pick.idea, current.places)),
      times: tonightTimes(pick.idea, current.day, pick.shift),
      wet: current.day ? isWet(current.day) : false,
      more: current.picks.length > 1,
      asked: current.asked.choice.budget,
      when: current.asked.when,
      date: current.date,
      restored: Boolean(current.restored),
      moved: Boolean(current.moved),
      setting: current.asked.choice.setting,
    };
  }

  const plan = async (asked?: TonightWhen) => {
    const w = asked ?? when;
    const wishes: Asked = { choice, when: w };
    setBusy(true);
    setConfirming(null);
    try {
      const loaded = await latest.current.load();
      const o = latest.current;
      // This press is the press for a distance restored from last time.
      const located = choice.reach !== undefined && loaded ? await locate() : null;
      const near = loaded && located && choice.reach !== undefined ? placesInReach(loaded.places, located, choice.reach) : null;
      // Far from every place on the page: the distance is set back, said, and the plan made without it.
      if (located && !near) off(t("tonight.reachFar"));
      const from = near ? located : null;
      const data = loaded && near ? { ...loaded, places: near } : loaded;
      if (choice.reach !== undefined && !from) wishes.choice = { ...choice, reach: undefined };
      const reach: ReachMinutes | undefined = from ? choice.reach : undefined;
      if (!data) {
        const failed: Outcome = { key: o.currentKey, problem: "failed", asked: wishes };
        setOutcome(failed);
        keep(failed, wishes);
        return;
      }
      // Read now, at the tap: a tab left open past midnight plans for the new day.
      const now = placeNow(data.forecast, Date.now());
      const date = o.dayOf(w, now.date);
      const key = o.keyOf(date);
      const day = data.forecast?.days.find((d) => d.date === date);
      const startMin = startFor(w === "tonight", date, now);
      const late = startMin !== undefined && startMin > TONIGHT_ENDS_MIN;
      const picks = late ? [] : rankTonight({ ...wishes.choice, kind: o.kind, startMin }, { day, places: data.places, boost: o.boost });
      if (picks.length === 0) {
        // A page by kind whose ideas cannot be done tonight (a day idea after half past three, the
        // bowling when its alley was not found in time) plans tomorrow at once and says so, instead
        // of ending its own button on a refusal. Tomorrow is planned from the same places.
        const next = w === "tonight" && o.kind ? moveToTomorrow(o, wishes.choice, data, now) : null;
        if (next) {
          const movedAsked: Asked = { choice: wishes.choice, when: "tomorrow" };
          setWhen("tomorrow");
          const made: Outcome = { ...next, at: 0, places: data.places, asked: movedAsked, moved: true };
          setOutcome(made);
          keep(made, movedAsked);
          track("tonight_planned", { mood: choice.vibe ?? "any", budget: choice.budget ?? "any", when: "tomorrow" });
          return;
        }
        const none: Outcome = { key, problem: late ? "late" : "none", asked: { ...wishes, choice: { ...wishes.choice, reach } } };
        setOutcome(none);
        keep(none, wishes);
        return;
      }
      const made: Outcome = { key, problem: null, picks, at: 0, day, date, places: data.places, asked: wishes };
      setOutcome(made);
      keep(made, wishes);
      track("tonight_planned", { mood: choice.vibe ?? "any", budget: choice.budget ?? "any", when: w === "tonight" || w === "tomorrow" ? w : "other" });
    } finally {
      setBusy(false);
    }
  };

  const another = () => {
    // Only the answer on screen moves on: one made for another place or day is not shown, so not touched.
    if (!current || current.problem !== null) return;
    setConfirming(null);
    const next: Outcome = { ...current, at: (current.at + 1) % current.picks.length, restored: false };
    setOutcome(next);
    keep(next, current.asked);
    track("tonight_another");
  };

  const write = () => {
    if (!current || current.problem !== null || !result) return;
    const { pick, stops, times } = result;
    if (!stops.some((s) => s.place)) return;
    // A plan linked to a saved date is re-saved whenever it changes: this one is new, not that one.
    writeLink(null);
    const date = current.date;
    const where = latest.current.whereName;
    updatePlan(() => tonightPlan(pick.idea, stops.map((s) => s.place), times, { date, where }));
    router.push("/plan");
  };

  const open = () => {
    if (!current || current.problem !== null || !result) return;
    if (own.stops.length > 0) return setConfirming(current);
    write();
  };

  return {
    choice,
    setChoice,
    /** False where the browser has no position to give: the distance choice is not drawn. */
    canLocate,
    reachNotice,
    /** The walk asked for when nothing within it fitted: the problem line names it. */
    near: current?.problem === "none" ? current.asked.choice.reach : undefined,
    when,
    setWhen,
    busy,
    problem,
    /** The "when" the shown problem was planned for: "none" tonight offers tomorrow. */
    problemWhen: current?.problem ? current.asked.when : null,
    result,
    plan,
    another,
    open,
    /** True while the card asks whether to replace the plan being made on this device. */
    confirming: confirming !== null && confirming === current,
    replace: write,
    keep: () => setConfirming(null),
  };
}
