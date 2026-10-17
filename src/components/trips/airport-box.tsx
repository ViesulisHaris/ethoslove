"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PlaneLanding, PlaneTakeoff } from "lucide-react";
import { cn } from "@/lib/utils";
import { cityName, findAirport, suggestAirports, type Airport } from "@/lib/trips/airports";

type Props = {
  label: string;
  placeholder: string;
  nothing: string;
  value: Airport | null;
  locale: "en" | "es";
  direction: "from" | "to";
  onPick: (airport: Airport) => void;
};

const SUGGESTIONS = 6;

/**
 * One end of a flight. Suggestions come from the airport table in the page itself, so they appear
 * as fast as the letters do and nothing typed leaves the browser. A combobox in the ARIA sense:
 * arrows move, Enter picks, Escape puts back what was there.
 */
export function AirportBox({ label, placeholder, nothing, value, locale, direction, onPick }: Props) {
  const listId = useId();
  const named = value ? cityName(value, locale) : "";
  const [text, setText] = useState(named);
  const [shown, setShown] = useState(named);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const Icon = direction === "from" ? PlaneTakeoff : PlaneLanding;

  // Picked from outside (swapped, remembered, prefilled): show its name.
  if (named !== shown) {
    setShown(named);
    setText(named);
  }

  const query = text.trim();
  const results = useMemo(() => (query.length >= 2 && query !== named ? suggestAirports(query, SUGGESTIONS) : []), [query, named]);
  const listed = open && query.length >= 2 && query !== named;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (a: Airport) => {
    setOpen(false);
    setText(cityName(a, locale));
    onPick(a);
  };
  // Leaving the box with a name typed but nothing picked would show one city and search another
  // (or nothing): take the suggestion that was lit, as Enter would, or put back what was there.
  const settle = () => {
    setOpen(false);
    if (query === named) return;
    const hit = query.length >= 2 ? (results[active] ?? findAirport(query)) : null;
    if (hit) pick(hit);
    else setText(named);
  };

  return (
    <div ref={box} className="relative min-w-0">
      <label className="flex h-14 items-center gap-2.5 rounded-2xl border border-forest/15 bg-white px-4 transition-shadow focus-within:border-rose/50 focus-within:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]">
        <Icon aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[12px] leading-none font-semibold tracking-wide text-forest/55 uppercase">{label}</span>
          <input
            type="text"
            role="combobox"
            aria-label={label}
            aria-expanded={listed}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={listed && results[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={text}
            placeholder={placeholder}
            onFocus={(e) => {
              setOpen(true);
              e.currentTarget.select();
            }}
            onBlur={settle}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && listed) {
                e.preventDefault();
                const hit = results[active] ?? findAirport(query);
                if (hit) pick(hit);
              } else if (e.key === "Escape") {
                setOpen(false);
                setText(named);
              }
            }}
            // 16px, not less: iOS zooms the whole page into any smaller input it focuses.
            className="mt-1 min-w-0 bg-transparent text-[16px] font-medium text-forest outline-none placeholder:font-normal placeholder:text-forest/40"
          />
        </span>
        {value ? <span className="shrink-0 font-mono text-[12.5px] font-medium text-forest/45">{value.iata}</span> : null}
      </label>

      {listed ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          // Keeps the focus in the input, so its blur doesn't settle on the lit airport before a click on another lands.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-auto rounded-2xl border border-forest/10 bg-white p-1.5 shadow-lift">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm leading-snug text-forest/55">{nothing}</li>
          ) : (
            results.map((a, i) => (
              <li key={`${a.city}-${a.iata}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(a)}
                  className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left", i === active && "bg-rose-soft")}
                >
                  <span className="truncate text-[15px] font-medium text-forest">
                    {cityName(a, locale)} · {a.iata}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-forest/45">{a.country}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
