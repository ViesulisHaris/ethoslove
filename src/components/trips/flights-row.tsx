"use client";

import { useState, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import { FlightFinder } from "./flight-finder";

type Props = Omit<ComponentProps<typeof FlightFinder>, "onLeg"> & {
  /** The row's heading while the search goes out ("Flights to Riga"). */
  title: string;
  /** Its heading once the search is the flight home, where the plan ends elsewhere ("Flights home from Tallinn"). */
  homeTitle?: string;
};

/**
 * A trip page's closed flights row under "Before you go". Its heading follows the way the search
 * runs: where the plan ends in another city, "Search the flight home" turns "Flights to Riga" into
 * "Flights home from Tallinn", so the first words read over a Tallinn to London search say so.
 */
export function FlightsRow({ title, homeTitle, ...finder }: Props) {
  const [leg, setLeg] = useState<"out" | "home">("out");
  return (
    <details id="flights" className="group scroll-mt-24 rounded-[24px] bg-card px-5 shadow-soft ring-1 ring-forest/5 sm:px-6">
      <summary data-testid="flights-title" className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-[24px] font-display text-[22px] leading-tight text-forest outline-offset-4 focus-visible:outline-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden">
        {leg === "home" && homeTitle ? homeTitle : title}
        <Plus aria-hidden="true" className="size-4 shrink-0 text-forest/65 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
      </summary>
      <FlightFinder {...finder} onLeg={setLeg} />
    </details>
  );
}
