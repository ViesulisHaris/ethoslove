"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TripKind } from "@/lib/trips/presets";

type Filter = TripKind | "all";

type Props = {
  /** Each card drawn on the server; this only decides which are shown. */
  cards: { id: string; kind: TripKind; card: ReactNode }[];
  filters: { value: Filter; label: string }[];
  label: string;
  className?: string;
};

/**
 * The shelf of trips with a row of chips over it. Filtering is instant and stays on the page: the
 * cards are all there already, so a chip only hides the ones that don't fit.
 */
export function TripsGrid({ cards, filters, label, className }: Props) {
  const [kind, setKind] = useState<Filter>("all");
  const shown = kind === "all" ? cards : cards.filter((c) => c.kind === kind);

  return (
    <div className={className}>
      <div role="group" aria-label={label} className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {filters.map((f) => {
          const on = f.value === kind;
          const count = f.value === "all" ? cards.length : cards.filter((c) => c.kind === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(f.value)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold whitespace-nowrap transition-colors",
                on ? "bg-forest text-cream" : "bg-white text-forest ring-1 ring-forest/12 hover:bg-rose-mist",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[12px] tabular-nums", on ? "bg-white/15 text-cream/85" : "bg-forest/[0.06] text-forest/55")}>{count}</span>
            </button>
          );
        })}
      </div>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id}>{c.card}</li>
        ))}
      </ul>
    </div>
  );
}
