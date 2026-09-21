import type { DateIdea } from "./ideas";
import type { DayWeather } from "./weather";

const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const clock = (minutes: number): string => {
  // To the quarter hour: nobody agrees to meet at 18:52.
  const t = ((Math.round(minutes / 15) * 15) % 1440 + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** How long before the sun goes down to be standing at the view: the light is best before, not at, sunset. */
const BEFORE_SUNSET_MIN = 45;

/**
 * A time for each stop of an idea. Most just start at a sensible hour for their time of day and
 * share the idea's length between the stops; the ones about light are hung off the real sunrise
 * or sunset of the day they picked, which is the difference between a view and a dark hill.
 */
export function suggestTimes(idea: DateIdea, day?: DayWeather): string[] {
  const count = idea.stops.length;
  const each = Math.round(idea.minutes / count);
  const sunrise = day ? toMinutes(day.sunrise) : null;
  const sunset = day ? toMinutes(day.sunset) : null;

  if (idea.moment === "sunset") {
    // The last stop is the view; work backwards from the light.
    const last = (sunset ?? 19 * 60 + 30) - BEFORE_SUNSET_MIN;
    return idea.stops.map((_, i) => clock(last - (count - 1 - i) * each));
  }
  const start = idea.moment === "morning" ? (sunrise ?? 7 * 60) - 30 : idea.moment === "day" ? 14 * 60 : idea.moment === "evening" ? 19 * 60 : Math.max(21 * 60, (sunset ?? 0) + 60);
  return idea.stops.map((_, i) => clock(start + i * each));
}
