"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Ymd } from "@/lib/dates/calendar";
import { joinWall, splitWall } from "@/lib/pickers/wall-time";
import { DayPicker } from "./day-picker";
import { TimePicker } from "./time-picker";

type Props = {
  /** "YYYY-MM-DDTHH:mm", the string a datetime-local input kept, or "". */
  value: string;
  /** Only ever a whole "YYYY-MM-DDTHH:mm": a time with no day is not a moment yet. */
  onChange: (wall: string) => void;
  /** The pair's name ("Date and time"); each field adds what it holds. */
  label: string;
  locale: "en" | "es";
  /** The first day that can be picked. */
  min?: Ymd;
  /** The day field's id, for the label above the pair. */
  id?: string;
  className?: string;
};

/**
 * A moment as a day and a time side by side, where there was one datetime-local input (a browser's
 * own calendar and clock, different on every device). The time sits in a fixed column so the day
 * gets the rest; where that leaves too little for "Sat 14 Jun 2026" (a phone's editor card), the
 * two stack instead.
 */
export function DateTimeFields({ value, onChange, label, locale, min, id, className }: Props) {
  const t = useTranslations("pickers");
  const { day, time } = splitWall(value);
  const emit = (nextDay: string, nextTime: string | undefined) => {
    const wall = joinWall(nextDay, nextTime);
    if (wall && wall !== value) onChange(wall);
  };
  return (
    <div className={cn("@container", className)}>
      <div className="grid gap-2 @min-[22rem]:grid-cols-[minmax(0,1fr)_8.75rem]">
        <DayPicker
          id={id}
          value={day}
          label={`${label}, ${t("day").toLowerCase()}`}
          locale={locale}
          min={min}
          onChange={(next) => emit(next, time)}
        />
        <TimePicker
          value={time || undefined}
          label={`${label}, ${t("time").toLowerCase()}`}
          clearable={false}
          onChange={(next) => emit(day, next)}
        />
      </div>
    </div>
  );
}
