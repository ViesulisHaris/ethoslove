"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { Ymd } from "@/lib/dates/calendar";
import type { DateKind } from "@/lib/dates/date-kinds";
import { fillStops } from "@/lib/dates/ideas";
import type { Place } from "@/lib/dates/places";
import { placeNow, rankTonight, TONIGHT_ENDS_MIN, tonightPlan, tonightStart, tonightTimes, type TonightPick } from "@/lib/dates/tonight";
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
};

type Outcome = { key: string; problem: TonightProblemKind } | { key: string; problem: null; picks: TonightPick[]; at: number; day: DayWeather | undefined; date: Ymd; places: Place[] };

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
  const [choice, setChoice] = useState<TonightChoice>({});
  const [when, setWhen] = useState<TonightWhen>("tonight");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // The host's latest options, for `plan`, which runs after an await.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const current = outcome && outcome.key === options.currentKey ? outcome : null;
  const problem = current?.problem ?? null;
  let result: { pick: TonightPick; stops: { place: Place | null; options: number }[]; times: string[]; wet: boolean; more: boolean } | null = null;
  if (current && current.problem === null) {
    const pick = current.picks[current.at];
    result = { pick, stops: fillStops(pick.idea, current.places), times: tonightTimes(pick.idea, current.day, pick.shift), wet: current.day ? isWet(current.day) : false, more: current.picks.length > 1 };
  }

  const plan = async (asked?: TonightWhen) => {
    const w = asked ?? when;
    setBusy(true);
    try {
      const data = await latest.current.load();
      const o = latest.current;
      if (!data) {
        setOutcome({ key: o.currentKey, problem: "failed" });
        return;
      }
      const now = placeNow(data.forecast, Date.now());
      const date = o.dayOf(w, now.date);
      const key = o.keyOf(date);
      const day = data.forecast?.days.find((d) => d.date === date);
      const startMin = date === now.date ? tonightStart(now.minutes) : undefined;
      if (startMin !== undefined && startMin > TONIGHT_ENDS_MIN) {
        setOutcome({ key, problem: "late" });
        return;
      }
      const picks = rankTonight({ ...choice, kind: o.kind, startMin }, { day, places: data.places, boost: o.boost });
      if (picks.length === 0) {
        setOutcome({ key, problem: "none" });
        return;
      }
      setOutcome({ key, problem: null, picks, at: 0, day, date, places: data.places });
      track("tonight_planned", { mood: choice.vibe ?? "any", budget: choice.budget ?? "any", when: w === "tonight" || w === "tomorrow" ? w : "other" });
    } finally {
      setBusy(false);
    }
  };

  const another = () => {
    if (!outcome || outcome.problem !== null) return;
    setOutcome({ ...outcome, at: (outcome.at + 1) % outcome.picks.length });
    track("tonight_another");
  };

  const open = () => {
    if (!current || current.problem !== null || !result) return;
    const { pick, stops, times } = result;
    if (!stops.some((s) => s.place)) return;
    if (own.stops.length > 0 && !window.confirm(t("tonight.replace"))) return;
    // A plan linked to a saved date is re-saved whenever it changes: this one is new, not that one.
    writeLink(null);
    const date = current.date;
    const where = latest.current.whereName;
    updatePlan(() => tonightPlan(pick.idea, stops.map((s) => s.place), times, { date, where }));
    router.push("/plan");
  };

  return { choice, setChoice, when, setWhen, busy, problem, result, plan, another, open };
}
