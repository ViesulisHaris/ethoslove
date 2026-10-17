"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Field } from "@/components/editor/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CARD, CELL, FIELD_CHEVRON, FIELD_TRIGGER, QUIET_BUTTON } from "@/components/pickers/styles";
import { useToday } from "@/components/pickers/use-today";
import { addMonths, formatLong, monthOf, monthTitle, monthWeeks, weekdayNames, type Month } from "@/lib/dates/range";
import { formatDayField } from "@/lib/pickers/day";
import { cn } from "@/lib/utils";
import type { FieldEditorProps } from "../types";
import { validDay } from "./roll";

const T = {
  en: { automatic: "Automatic", today: "Today", clear: "Clear", previous: "Previous month", next: "Next month" },
  es: { automatic: "Automática", today: "Hoy", clear: "Borrar", previous: "Mes anterior", next: "Mes siguiente" },
};

/**
 * The date printed on the photos, from a calendar card drawn like the site's own day picker
 * rather than the generated form's text box (a typed date is one typo from a broken stamp).
 * Built here, with the template's own words, because the site's picker reads the app's
 * translations and a template renders where there are none. Hidden while the stamp is off.
 */
export function StampDateField({ id, label, help, value, onChange, locale, fields }: FieldEditorProps<string | undefined>) {
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Month | null>(null);
  if (fields?.stamp === false) return null;
  const t = T[locale] ?? T.en;
  const day = validDay(typeof value === "string" ? value : null) ?? "";
  const shown = month ?? monthOf(day || today || "2026-01-01");
  const title = monthTitle(shown, locale);
  const names = weekdayNames(locale);
  const choose = (next: string) => {
    if (next !== day) onChange(next || undefined);
    setOpen(false);
  };

  return (
    <Field id={id} label={label} help={help}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setMonth(monthOf(day || today || "2026-01-01"));
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <button type="button" id={id} aria-label={`${label}: ${day ? formatLong(day, locale) : t.automatic}`} className={FIELD_TRIGGER}>
            <CalendarDays aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
            <span className={cn("block min-w-0 truncate first-letter:uppercase", !day && "text-muted-foreground")}>{day ? formatDayField(day, locale) : t.automatic}</span>
            <ChevronDown aria-hidden="true" className={FIELD_CHEVRON} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn(CARD, "w-[320px] p-3")}>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMonth(addMonths(shown, -1))} aria-label={t.previous} className="grid size-11 place-items-center rounded-full text-forest hover:bg-rose-mist">
              <ChevronLeft aria-hidden="true" className="size-[18px]" />
            </button>
            <p aria-live="polite" className="font-display text-[18px] text-forest">
              {title.name}
              <span className="ml-1.5 text-forest/40">{title.year}</span>
            </p>
            <button type="button" onClick={() => setMonth(addMonths(shown, 1))} aria-label={t.next} className="grid size-11 place-items-center rounded-full text-forest hover:bg-rose-mist">
              <ChevronRight aria-hidden="true" className="size-[18px]" />
            </button>
          </div>
          <div className="mt-1 grid grid-cols-7 pb-1">
            {names.map((name) => (
              <span key={name} className="text-center text-[11px] font-semibold tracking-wide text-forest/50 uppercase">
                {name}
              </span>
            ))}
          </div>
          {monthWeeks(shown).map((week, w) => (
            <div key={w} className="grid grid-cols-7">
              {week.map((cell, c) =>
                cell ? (
                  <div key={cell} className="flex h-11 items-center justify-center">
                    <button type="button" data-chosen={cell === day || undefined} aria-pressed={cell === day} aria-label={formatLong(cell, locale)} onClick={() => choose(cell)} className={cn(CELL, "size-11")}>
                      {Number(cell.slice(8))}
                      {cell === today && cell !== day ? <span aria-hidden="true" className="absolute bottom-[7px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-rose" /> : null}
                    </button>
                  </div>
                ) : (
                  <span key={`blank-${c}`} className="h-11" />
                ),
              )}
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-forest/[0.08] pt-2">
            <button type="button" onClick={() => today && choose(today)} disabled={!today} className={cn(QUIET_BUTTON, "-ml-1 px-3")}>
              {t.today}
            </button>
            <button type="button" onClick={() => choose("")} disabled={!day} className={cn(QUIET_BUTTON, "-mr-1 px-3")}>
              {t.clear}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
