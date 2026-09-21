import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, type LucideIcon } from "lucide-react";
import type { Condition } from "@/lib/dates/weather";

const ICONS: Record<Condition, LucideIcon> = { clear: Sun, cloudy: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning };
const TINTS: Record<Condition, string> = { clear: "#E0962A", cloudy: "#8C97A3", fog: "#9AA3AD", drizzle: "#5E94B8", rain: "#3F7FAE", snow: "#7FB0D6", storm: "#6A5FB0" };

export function WeatherGlyph({ condition, className }: { condition: Condition; className?: string }) {
  const Icon = ICONS[condition];
  return <Icon aria-hidden="true" className={className} style={{ color: TINTS[condition] }} />;
}
