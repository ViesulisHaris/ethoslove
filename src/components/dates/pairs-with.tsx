"use client";

import { ArrowRight } from "lucide-react";
import { KINDS } from "@/lib/dates/kinds";
import { distanceKm, walkingMinutes } from "@/lib/dates/geo";
import type { Place } from "@/lib/dates/places";
import type { Ranked } from "@/lib/dates/rank";
import { PlaceThumb } from "./place-thumb";

/** Two places to go with this one: the turn from a table into an evening. */
export function PairsWith({ from, picks, locale, labels, onOpen }: { from: Place; picks: Ranked[]; locale: "en" | "es"; labels: { title: string; walk: (m: number) => string }; onOpen: (id: string) => void }) {
  if (picks.length === 0) return null;
  return (
    <section className="mt-6 border-t border-forest/10 pt-5" aria-label={labels.title}>
      <h3 className="font-display text-[19px] text-forest">{labels.title}</h3>
      <ul className="mt-3 space-y-2">
        {picks.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.id)} className="group flex w-full items-center gap-3 rounded-2xl bg-white p-2 text-left ring-1 ring-forest/5 transition-colors hover:bg-blush-paper">
              <PlaceThumb place={p} className="size-14 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-semibold text-forest/55">{KINDS[p.kind].label[locale]} · {labels.walk(walkingMinutes(distanceKm(from, p)))}</span>
                <span className="block truncate text-[15px] font-semibold text-forest">{p.name}</span>
              </span>
              <ArrowRight aria-hidden="true" className="mr-2 size-4 shrink-0 text-forest/40 transition-transform group-hover:translate-x-0.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
