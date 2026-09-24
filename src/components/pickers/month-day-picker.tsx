"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarHeart, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMonthDay, type MonthDay } from "@/lib/lifecycle/reminders";
import { daysFor, monthNames, MONTHS, withDay, withMonth } from "@/lib/pickers/month-day";
import { moveInGrid } from "@/lib/pickers/time";
import { PickerSurface } from "./picker-surface";
import { useQuietFocus } from "./quiet-focus";
import { CELL, FIELD_CHEVRON, FIELD_TRIGGER, GROUP_LABEL } from "./styles";

type Props = {
  value: MonthDay;
  onChange: (value: MonthDay) => void;
  /** The field's name, followed by the day chosen: "Date: 14 February". */
  label: string;
  locale: "en" | "es";
  id?: string;
  className?: string;
};

/** Two rows of six: the card has to fit under a field on a phone, with the days below. */
const MONTH_COLUMNS = 6;
const DAY_COLUMNS = 7;

/**
 * A day that comes round every year ("14 February"), picked without a year: a month from the twelve,
 * then its day, which closes the card. One field where there were a day's select and a month's. The
 * days are counted in a leap year, so 29 February is there; a month too short for the day chosen
 * takes its own last day instead (lib/pickers/month-day).
 */
export function MonthDayPicker({ value, onChange, label, locale, id, className }: Props) {
  const t = useTranslations("pickers");
  const uid = useId();
  const [open, setOpen] = useState(false);
  const { trigger, triggerProps, contentProps } = useQuietFocus();
  const monthsRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const shortNames = monthNames(locale);
  const longNames = monthNames(locale, "long");
  const days = Array.from({ length: daysFor(value.month) }, (_, i) => i + 1);
  const shown = formatMonthDay(value, locale);

  const pickMonth = (month: number) => {
    if (month !== value.month) onChange(withMonth(value, month));
  };
  const pickDay = (day: number) => {
    if (day !== value.day) onChange(withDay(value, day));
  };
  /** Arrows in a radio group move the focus and the choice together. */
  const onRadioKey = (
    e: KeyboardEvent<HTMLDivElement>,
    box: HTMLDivElement | null,
    columns: number,
    choices: number[],
    pick: (n: number) => void,
  ) => {
    const index = choices.indexOf(Number((e.target as HTMLElement).dataset.n));
    if (index < 0) return;
    const to = moveInGrid(index, e.key, columns, choices.length);
    if (to === null) return;
    e.preventDefault();
    if (to === index) return;
    pick(choices[to]);
    box?.querySelector<HTMLElement>(`[data-n="${choices[to]}"]`)?.focus();
  };

  return (
    <PickerSurface
      open={open}
      onOpenChange={setOpen}
      label={label}
      width="w-[340px]"
      contentProps={contentProps}
      onOpenAutoFocus={(e) => {
        // Onto the day: the month is usually right already (it came from the gift).
        e.preventDefault();
        daysRef.current
          ?.querySelector<HTMLElement>('[tabindex="0"]')
          ?.focus({ preventScroll: true });
      }}
      trigger={
        <button
          type="button"
          ref={trigger}
          id={id}
          {...triggerProps}
          aria-label={`${label}: ${shown}`}
          className={cn(FIELD_TRIGGER, className)}
        >
          <CalendarHeart aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
          <span className="min-w-0 truncate">{shown}</span>
          <ChevronDown aria-hidden="true" className={FIELD_CHEVRON} />
        </button>
      }
    >
      <p id={`${uid}-month`} className={cn(GROUP_LABEL, "pt-1")}>
        {t("month")}
      </p>
      <div
        ref={monthsRef}
        role="radiogroup"
        aria-labelledby={`${uid}-month`}
        onKeyDown={(e) => onRadioKey(e, monthsRef.current, MONTH_COLUMNS, MONTHS, pickMonth)}
        className="grid grid-cols-6 gap-1"
      >
        {MONTHS.map((month) => {
          const chosen = month === value.month;
          return (
            <button
              key={month}
              type="button"
              role="radio"
              aria-checked={chosen}
              aria-label={longNames[month - 1]}
              data-chosen={chosen || undefined}
              data-n={month}
              tabIndex={chosen ? 0 : -1}
              onClick={() => pickMonth(month)}
              className={cn(CELL, "w-full min-w-0 rounded-xl px-0 text-[14.5px]")}
            >
              {shortNames[month - 1]}
            </button>
          );
        })}
      </div>
      <p id={`${uid}-day`} className={cn(GROUP_LABEL, "mt-4")}>
        {t("day")}
      </p>
      <div
        ref={daysRef}
        role="radiogroup"
        aria-labelledby={`${uid}-day`}
        onKeyDown={(e) => onRadioKey(e, daysRef.current, DAY_COLUMNS, days, pickDay)}
        className="grid grid-cols-7 gap-y-0.5"
      >
        {days.map((day) => {
          const chosen = day === value.day;
          return (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={chosen}
              data-chosen={chosen || undefined}
              data-n={day}
              tabIndex={chosen ? 0 : -1}
              onClick={() => {
                pickDay(day);
                setOpen(false);
              }}
              className={cn(CELL, "mx-auto size-11")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </PickerSurface>
  );
}
