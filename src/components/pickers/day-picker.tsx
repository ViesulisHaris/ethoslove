"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Ymd } from "@/lib/dates/calendar";
import {
  addMonths,
  formatLong,
  monthOf,
  monthTitle,
  monthWeeks,
  moveDay,
  weekdayNames,
  type Month,
} from "@/lib/dates/range";
import {
  canTurn,
  FAR_FUTURE,
  FAR_PAST,
  focusDay,
  formatDayField,
  openingMonth,
} from "@/lib/pickers/day";
import { PickerSurface } from "./picker-surface";
import { useQuietFocus } from "./quiet-focus";
import { CELL, FIELD_CHEVRON, FIELD_TRIGGER, QUIET_BUTTON } from "./styles";
import { useToday } from "./use-today";

type Props = {
  value: Ymd | "";
  onChange: (day: Ymd | "") => void;
  /** What the day is for ("The day"). The field's name says it and the day chosen. */
  label: string;
  locale: "en" | "es";
  /** The first and last days that can be picked; any day when left out. */
  min?: Ymd;
  max?: Ymd;
  /** A Clear in the card, for a day that can be left empty. */
  clearable?: boolean;
  /** What the field says with no day: "Add a date" by default. */
  placeholder?: string;
  id?: string;
  className?: string;
};

/**
 * One day, from a calendar card under the field: a month at a time, Monday first, the day chosen in
 * rose and today marked with a dot, as the trips' range picker draws them. The card is 340px at most,
 * so it fits a 360px phone as it is and needs no sheet. A day is picked with a tap, or with the
 * arrows (a day, a week), Page Up and Down (a month) and Enter, as the ARIA date picker has it.
 */
export function DayPicker({
  value,
  onChange,
  label,
  locale,
  min,
  max,
  clearable = false,
  placeholder,
  id,
  className,
}: Props) {
  const t = useTranslations("pickers");
  const today = useToday();
  const uid = useId();
  const [open, setOpen] = useState(false);
  // Set again each time it opens, on the day chosen or today.
  const [month, setMonth] = useState<Month>(() => monthOf(value || FAR_PAST));
  /** The day that takes the Tab key in the grid (a roving tabindex), and the one the arrows move. */
  const [cursor, setCursor] = useState<Ymd>("");
  const { trigger, triggerProps, contentProps } = useQuietFocus();
  const grid = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const lo = min ?? FAR_PAST;
  const hi = max ?? FAR_FUTURE;
  const empty = placeholder ?? t("addDate");

  // After a key moves the cursor (or turns the month to follow it), the new day takes the focus.
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-day="${cursor}"]`)?.focus();
  }, [cursor, month]);

  const onOpenChange = (next: boolean) => {
    if (next) {
      // Until the browser knows today there is no calendar to draw; the field waits.
      if (!today) return;
      const first = openingMonth(value, today, lo, hi);
      setMonth(first);
      setCursor(focusDay(first, value, today, lo, hi));
    }
    setOpen(next);
  };
  const choose = (day: Ymd) => {
    if (day < lo || day > hi) return;
    if (day !== value) onChange(day);
    setOpen(false);
  };
  const turn = (step: -1 | 1) => {
    if (!today || !canTurn(month, step, lo, hi)) return;
    const to = addMonths(month, step);
    setMonth(to);
    setCursor(focusDay(to, value, today, lo, hi));
  };
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = (e.target as HTMLElement).dataset.day;
    if (!from) return;
    const to = moveDay(from, e.key, e.shiftKey, lo, hi);
    if (!to) return;
    e.preventDefault();
    pendingFocus.current = true;
    setCursor(to);
    if (to.slice(0, 7) !== from.slice(0, 7)) setMonth(monthOf(to));
  };

  const title = monthTitle(month, locale);
  const titleId = `${uid}-title`;
  const short = weekdayNames(locale);
  const long = weekdayNames(locale, "long");
  const todayInRange = Boolean(today && today >= lo && today <= hi);

  return (
    <PickerSurface
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      width="w-[340px]"
      contentProps={contentProps}
      onOpenAutoFocus={(e) => {
        // Into the grid on the day being chosen, not onto the month's arrows.
        e.preventDefault();
        grid.current
          ?.querySelector<HTMLElement>('[data-day][tabindex="0"]')
          ?.focus({ preventScroll: true });
      }}
      trigger={
        <button
          type="button"
          ref={trigger}
          id={id}
          {...triggerProps}
          aria-label={`${label}: ${value ? formatLong(value, locale) : empty}`}
          className={cn(FIELD_TRIGGER, className)}
        >
          <CalendarDays aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
          <span
            className={cn(
              "block min-w-0 truncate first-letter:uppercase",
              !value && "text-muted-foreground",
            )}
          >
            {value ? formatDayField(value, locale) : empty}
          </span>
          <ChevronDown aria-hidden="true" className={FIELD_CHEVRON} />
        </button>
      }
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => turn(-1)}
          disabled={!canTurn(month, -1, lo, hi)}
          aria-label={t("previousMonth")}
          className="grid size-11 place-items-center rounded-full text-forest transition-[background-color,opacity] hover:bg-rose-mist disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronLeft aria-hidden="true" className="size-[18px]" />
        </button>
        <p id={titleId} aria-live="polite" className="font-display text-[18px] text-forest">
          {title.name}
          <span className="ml-1.5 text-forest/40">{title.year}</span>
        </p>
        <button
          type="button"
          onClick={() => turn(1)}
          disabled={!canTurn(month, 1, lo, hi)}
          aria-label={t("nextMonth")}
          className="grid size-11 place-items-center rounded-full text-forest transition-[background-color,opacity] hover:bg-rose-mist disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronRight aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
      {/* Six weeks of room, so the card doesn't change height as the months turn. */}
      <div
        ref={grid}
        role="grid"
        aria-labelledby={titleId}
        onKeyDown={onGridKey}
        className="mt-1 min-h-[294px]"
      >
        <div role="row" className="grid grid-cols-7 pb-1">
          {short.map((d, i) => (
            <span
              key={d}
              role="columnheader"
              aria-label={long[i]}
              className="text-center text-[11px] font-semibold tracking-wide text-forest/50 uppercase"
            >
              {d}
            </span>
          ))}
        </div>
        {monthWeeks(month).map((week, w) => (
          <div key={w} role="row" className="grid grid-cols-7">
            {week.map((day, col) => {
              if (!day) return <span key={`blank-${col}`} role="gridcell" className="h-11" />;
              const off = day < lo || day > hi;
              const chosen = day === value;
              const isToday = day === today;
              return (
                <div
                  key={day}
                  role="gridcell"
                  aria-selected={chosen}
                  className="flex h-11 items-center justify-center"
                >
                  <button
                    type="button"
                    data-day={day}
                    data-chosen={chosen || undefined}
                    tabIndex={day === cursor ? 0 : -1}
                    disabled={off}
                    aria-label={`${isToday ? `${t("today")}, ` : ""}${formatLong(day, locale)}`}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => choose(day)}
                    className={cn(CELL, "size-11")}
                  >
                    {Number(day.slice(8))}
                    {isToday && !chosen ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[7px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-rose"
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-forest/[0.08] pt-2">
        <button
          type="button"
          onClick={() => today && choose(today)}
          disabled={!todayInRange}
          className={cn(QUIET_BUTTON, "-ml-1 px-3")}
        >
          {t("today")}
        </button>
        {clearable ? (
          <button
            type="button"
            onClick={() => {
              if (value) onChange("");
              setOpen(false);
            }}
            disabled={!value}
            className={cn(QUIET_BUTTON, "-mr-1 px-3")}
          >
            {t("clear")}
          </button>
        ) : null}
      </div>
    </PickerSurface>
  );
}
