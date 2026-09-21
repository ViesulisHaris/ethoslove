"use client";

import { useMemo, useState } from "react";
import { CalendarHeart, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatDay, fromYmd, monthGrid, thisWeekend, type Ymd } from "@/lib/dates/calendar";
import type { DayWeather } from "@/lib/dates/weather";
import { WeatherGlyph } from "./weather-glyph";

export type WhenLabels = { label: string; today: string; tomorrow: string; weekend: string; previous: string; next: string; forecastNote: string };

type Props = { value: Ymd; today: Ymd; days: DayWeather[]; locale: "en" | "es"; labels: WhenLabels; className?: string; onPick: (date: Ymd) => void };

/** How far ahead a date can be planned. The forecast only reaches the first sixteen days of it. */
const HORIZON_DAYS = 120;

/**
 * Which day. A month at a time, Monday first, with the forecast drawn on the days that have one:
 * the reason to pick Saturday over Sunday is usually right there on the calendar.
 */
export function WhenPicker({ value, today, days, locale, labels, className, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const start = fromYmd(value) ?? fromYmd(today)!;
  const [month, setMonth] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const last = addDays(today, HORIZON_DAYS);
  const weather = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const grid = monthGrid(month.y, month.m);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i, 12).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { weekday: "narrow" })), [locale]);
  const title = new Date(month.y, month.m, 1, 12).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", { month: "long", year: "numeric" });
  const first = fromYmd(today)!;
  const canGoBack = month.y > first.getFullYear() || month.m > first.getMonth();
  const end = fromYmd(last)!;
  const canGoOn = month.y < end.getFullYear() || month.m < end.getMonth();
  const choose = (date: Ymd) => {
    onPick(date);
    setOpen(false);
  };
  const quick: [string, Ymd][] = [[labels.today, today], [labels.tomorrow, addDays(today, 1)], [labels.weekend, thisWeekend(today)]];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMonth({ y: start.getFullYear(), m: start.getMonth() });
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${labels.label}: ${formatDay(value, locale)}`} className={cn("inline-flex h-12 items-center gap-2 rounded-full border border-forest/15 bg-white px-4 text-[15px] font-medium text-forest shadow-soft transition-colors hover:border-forest/30", className)}>
          <CalendarHeart aria-hidden="true" className="size-[18px] shrink-0 text-[#B23A5E]" />
          <span className="truncate first-letter:uppercase">{value === today ? labels.today : formatDay(value, locale, "short")}</span>
          {weather.get(value) ? <WeatherGlyph condition={weather.get(value)!.condition} className="size-4 shrink-0" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[318px] gap-3 rounded-3xl border-0 bg-white p-4 shadow-lift ring-1 ring-forest/10">
        <div className="flex flex-wrap gap-1.5">
          {quick.map(([name, date]) => (
            <button key={name} type="button" onClick={() => choose(date)} className={cn("h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors", value === date ? "bg-forest text-cream" : "bg-[#FBE9EE] text-[#8E2F4C] hover:bg-[#F7D9E2]")}>
              {name}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" disabled={!canGoBack} aria-label={labels.previous} onClick={() => setMonth(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))} className="grid size-9 place-items-center rounded-full text-forest hover:bg-forest/5 disabled:opacity-25">
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-[17px] text-forest first-letter:uppercase" aria-live="polite">
            {title}
          </p>
          <button type="button" disabled={!canGoOn} aria-label={labels.next} onClick={() => setMonth(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))} className="grid size-9 place-items-center rounded-full text-forest hover:bg-forest/5 disabled:opacity-25">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label={title}>
          {weekdays.map((d, i) => (
            <span key={i} className="pb-1 text-[11px] font-medium text-forest/45 uppercase">
              {d}
            </span>
          ))}
          {grid.map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />;
            const day = weather.get(date);
            const off = date < today || date > last;
            return (
              <button
                key={date}
                type="button"
                disabled={off}
                aria-label={formatDay(date, locale)}
                aria-pressed={date === value}
                onClick={() => choose(date)}
                className={cn("mx-auto flex size-10 flex-col items-center justify-center rounded-2xl text-[13.5px] leading-none text-forest transition-colors", off ? "opacity-25" : "hover:bg-[#FBE9EE]", date === value && "bg-forest text-cream hover:bg-forest", date === today && date !== value && "ring-1 ring-[#B23A5E]/50")}
              >
                <span className="font-medium tabular-nums">{Number(date.slice(8))}</span>
                {day ? <WeatherGlyph condition={day.condition} className="mt-0.5 size-3" /> : <span className="mt-0.5 h-3" />}
              </button>
            );
          })}
        </div>
        {days.length > 0 ? <p className="text-[11.5px] leading-snug text-forest/50">{labels.forecastNote}</p> : null}
      </PopoverContent>
    </Popover>
  );
}
