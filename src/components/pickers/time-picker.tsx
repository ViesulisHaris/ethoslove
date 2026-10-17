"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  HOURS,
  minuteChoices,
  moveInGrid,
  parseTime,
  withHour,
  withMinute,
} from "@/lib/pickers/time";
import { PickerSurface } from "./picker-surface";
import { useQuietFocus } from "./quiet-focus";
import {
  CELL,
  DONE_BUTTON,
  FIELD_CHEVRON,
  FIELD_TRIGGER,
  GROUP_LABEL,
  QUIET_BUTTON,
} from "./styles";

type Props = {
  /** "HH:mm", or undefined for no time. */
  value: string | undefined;
  onChange: (time: string | undefined) => void;
  /** The field's name, followed by the time chosen: "Time at Café da Esquina: 19:30". */
  label: string;
  /** What the field says with no time: "Add a time" by default. */
  placeholder?: string;
  /** A Clear in the card, for a time that can be left empty. */
  clearable?: boolean;
  id?: string;
  className?: string;
};

const HOUR_COLUMNS = 6;
/** Where the hours take the Tab key before any time is chosen: midday, the middle of the grid. */
const NOON = 12;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A time of day in two taps: an hour from a grid of all twenty-four, then the minutes from the
 * quarters, which closes the card. A phone's wheel of 1,440 minutes is the slow way to say "half
 * seven". Hours and minutes are each a radio group: the arrows move through them (and choose, as
 * radios do), Enter on the minutes closes, Escape closes and hands focus back to the field.
 */
export function TimePicker({
  value,
  onChange,
  label,
  placeholder,
  clearable = true,
  id,
  className,
}: Props) {
  const t = useTranslations("pickers");
  const uid = useId();
  const [open, setOpen] = useState(false);
  const { trigger, triggerProps, contentProps } = useQuietFocus();
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const time = parseTime(value);
  const minutes = minuteChoices(value);
  const empty = placeholder ?? t("addTime");
  const hourTab = time?.hour ?? NOON;
  const minuteTab = time?.minute ?? minutes[0];

  const pickHour = (hour: number) => {
    const next = withHour(value, hour);
    if (next !== value) onChange(next);
  };
  const pickMinute = (minute: number) => {
    const next = withMinute(value, minute);
    if (next && next !== value) onChange(next);
  };
  /** Arrows in a radio group move the focus and the choice together. */
  const onRadioKey = (
    e: KeyboardEvent<HTMLDivElement>,
    box: HTMLDivElement | null,
    columns: number,
    choices: number[],
    pick: (n: number) => void,
  ) => {
    const from = Number((e.target as HTMLElement).dataset.n);
    const index = choices.indexOf(from);
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
      width="w-[312px]"
      contentProps={contentProps}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        hoursRef.current
          ?.querySelector<HTMLElement>('[tabindex="0"]')
          ?.focus({ preventScroll: true });
      }}
      trigger={
        <button
          type="button"
          ref={trigger}
          id={id}
          {...triggerProps}
          aria-label={`${label}: ${value && time ? value : empty}`}
          className={cn(FIELD_TRIGGER, className)}
        >
          <Clock aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
          <span className={cn("min-w-0 truncate", !time && "text-muted-foreground")}>
            {time ? value : empty}
          </span>
          <ChevronDown aria-hidden="true" className={FIELD_CHEVRON} />
        </button>
      }
    >
      <p id={`${uid}-hours`} className={cn(GROUP_LABEL, "pt-1")}>
        {t("hour")}
      </p>
      <div
        ref={hoursRef}
        role="radiogroup"
        aria-labelledby={`${uid}-hours`}
        onKeyDown={(e) => onRadioKey(e, hoursRef.current, HOUR_COLUMNS, HOURS, pickHour)}
        className="grid grid-cols-6 gap-1"
      >
        {HOURS.map((hour) => {
          const chosen = time?.hour === hour;
          return (
            <button
              key={hour}
              type="button"
              role="radio"
              aria-checked={chosen}
              data-chosen={chosen || undefined}
              data-n={hour}
              tabIndex={hour === hourTab ? 0 : -1}
              onClick={() => pickHour(hour)}
              className={cn(CELL, "w-full rounded-xl")}
            >
              {pad(hour)}
            </button>
          );
        })}
      </div>
      <p id={`${uid}-minutes`} className={cn(GROUP_LABEL, "mt-4")}>
        {t("minutes")}
      </p>
      <div
        ref={minutesRef}
        role="radiogroup"
        aria-labelledby={`${uid}-minutes`}
        aria-disabled={!time || undefined}
        onKeyDown={(e) => onRadioKey(e, minutesRef.current, minutes.length, minutes, pickMinute)}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${minutes.length}, minmax(0, 1fr))` }}
      >
        {minutes.map((minute) => {
          const chosen = time?.minute === minute;
          return (
            <button
              key={minute}
              type="button"
              role="radio"
              aria-checked={chosen}
              data-chosen={chosen || undefined}
              data-n={minute}
              tabIndex={minute === minuteTab ? 0 : -1}
              // Minutes need an hour to go on: until there is one they wait, dimmed.
              disabled={!time}
              onClick={() => {
                pickMinute(minute);
                setOpen(false);
              }}
              className={cn(CELL, "w-full rounded-xl")}
            >
              :{pad(minute)}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-forest/[0.08] pt-3">
        {clearable ? (
          <button
            type="button"
            disabled={!time}
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
            className={cn(QUIET_BUTTON, "-ml-1 px-3")}
          >
            {t("clear")}
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => setOpen(false)} className={DONE_BUTTON}>
          {t("done")}
        </button>
      </div>
    </PickerSurface>
  );
}
