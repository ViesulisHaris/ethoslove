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
  /** Null: nothing chosen yet. The field then says `placeholder`, and a month is picked before its day. */
  value: MonthDay | null;
  onChange: (value: MonthDay) => void;
  /** The field's name, followed by the day chosen: "Date: 14 February". */
  label: string;
  locale: "en" | "es";
  /** What the field says before a day is chosen ("Pick the day"). */
  placeholder?: string;
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
 * takes its own last day instead (lib/pickers/month-day). It can also start empty, for a day only
 * the person knows (their birthday): then nothing is chosen until they choose it, never today by
 * default, and the day is picked after its month.
 */
export function MonthDayPicker({ value, onChange, label, locale, placeholder, id, className }: Props) {
  const t = useTranslations("pickers");
  const uid = useId();
  const [open, setOpen] = useState(false);
  // An empty field's month, chosen and waiting for its day: only then is there a value to send.
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const { trigger, triggerProps, contentProps } = useQuietFocus();
  const monthsRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const shortNames = monthNames(locale);
  const longNames = monthNames(locale, "long");
  const month = value?.month ?? pendingMonth;
  const days = Array.from({ length: daysFor(month ?? 1) }, (_, i) => i + 1);
  const shown = value ? formatMonthDay(value, locale) : (placeholder ?? "");

  const pickMonth = (next: number) => {
    if (!value) return setPendingMonth(next);
    if (next !== value.month) onChange(withMonth(value, next));
  };
  const pickDay = (day: number) => {
    if (value) {
      if (day !== value.day) onChange(withDay(value, day));
    } else if (month !== null) onChange(withDay({ month, day }, day));
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
        // Onto the day: the month is usually right already (it came from the gift). An empty field
        // starts at the months.
        e.preventDefault();
        (month === null ? monthsRef : daysRef).current
          ?.querySelector<HTMLElement>('[tabindex="0"]')
          ?.focus({ preventScroll: true });
      }}
      trigger={
        <button
          type="button"
          ref={trigger}
          id={id}
          {...triggerProps}
          aria-label={value ? `${label}: ${shown}` : label}
          className={cn(FIELD_TRIGGER, className)}
        >
          <CalendarHeart aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
          <span className={cn("min-w-0 truncate", !value && "text-muted-foreground")}>{shown}</span>
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
        {MONTHS.map((m) => {
          const chosen = m === month;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={chosen}
              aria-label={longNames[m - 1]}
              data-chosen={chosen || undefined}
              data-n={m}
              // With nothing chosen, the first month takes the Tab key, so the group can be reached.
              tabIndex={chosen || (month === null && m === 1) ? 0 : -1}
              onClick={() => pickMonth(m)}
              className={cn(CELL, "w-full min-w-0 rounded-xl px-0 text-[14.5px]")}
            >
              {shortNames[m - 1]}
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
          const chosen = day === value?.day;
          return (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={chosen}
              data-chosen={chosen || undefined}
              data-n={day}
              // An empty field's days wait for a month.
              disabled={month === null}
              tabIndex={chosen || (!value && month !== null && day === 1) ? 0 : -1}
              onClick={() => {
                pickDay(day);
                setOpen(false);
              }}
              className={cn(CELL, "mx-auto size-11 disabled:opacity-35")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </PickerSurface>
  );
}
