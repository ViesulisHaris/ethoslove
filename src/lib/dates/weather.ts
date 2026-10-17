/**
 * The forecast for the day they are planning: what the sky is doing, how warm it gets, and when
 * the sun goes down, because half the good ideas depend on one of those. From Open-Meteo, which
 * needs no key and forecasts sixteen days ahead.
 */
export type Condition = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export type DayWeather = {
  /** YYYY-MM-DD, in the place's own timezone. */
  date: string;
  condition: Condition;
  tMax: number;
  tMin: number;
  /** Percent, or null when the model gives none that far out. */
  rainChance: number | null;
  /** HH:MM, local to the place. */
  sunrise: string;
  sunset: string;
};

export type Forecast = { days: DayWeather[]; utcOffsetSeconds: number; timezone: string };

/** WMO weather interpretation codes, folded down to what changes a plan. */
export function conditionOf(code: number): Condition {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

/** A day to stay under a roof: it is raining, or more likely than not to. */
export const isWet = (day: DayWeather): boolean => day.condition === "rain" || day.condition === "storm" || day.condition === "snow" || day.condition === "drizzle" || (day.rainChance ?? 0) >= 60;

const hhmm = (iso: unknown): string => (typeof iso === "string" && iso.length >= 16 ? iso.slice(11, 16) : "");

export function parseOpenMeteo(json: unknown): Forecast | null {
  const data = json as { daily?: Record<string, unknown[]>; utc_offset_seconds?: number; timezone?: string } | null;
  const daily = data?.daily;
  if (!daily || !Array.isArray(daily.time)) return null;
  const days: DayWeather[] = [];
  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    const code = daily.weather_code?.[i];
    const tMax = daily.temperature_2m_max?.[i];
    const tMin = daily.temperature_2m_min?.[i];
    if (typeof date !== "string" || typeof code !== "number" || typeof tMax !== "number" || typeof tMin !== "number") continue;
    const chance = daily.precipitation_probability_max?.[i];
    days.push({ date, condition: conditionOf(code), tMax: Math.round(tMax), tMin: Math.round(tMin), rainChance: typeof chance === "number" ? Math.round(chance) : null, sunrise: hhmm(daily.sunrise?.[i]), sunset: hhmm(daily.sunset?.[i]) });
  }
  if (days.length === 0) return null;
  return { days, utcOffsetSeconds: typeof data?.utc_offset_seconds === "number" ? data.utc_offset_seconds : 0, timezone: typeof data?.timezone === "string" ? data.timezone : "UTC" };
}

export const weatherUrl = (lat: number, lng: number): string =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&forecast_days=16`;
