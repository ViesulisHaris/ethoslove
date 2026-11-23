"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { Where } from "@/components/dates/where-box";

/**
 * "Plan the next visit, properly" on /long-distance promised the map of their town and led nowhere
 * (walk-rooms-14). It now opens Dates, on their town once the meet-in-the-middle box above has one.
 * The box and the card are far apart on the page, so the town is shared through this small store.
 */
let theirTown: Where | null = null;
const listeners = new Set<() => void>();

export function setTheirTown(where: Where | null) {
  theirTown = where;
  for (const listen of listeners) listen();
}

const subscribe = (listen: () => void) => {
  listeners.add(listen);
  return () => listeners.delete(listen);
};

/** Dates, on their town when there is one. */
export function datesHref(where: Where | null): string {
  return where ? `/dates?lat=${where.lat}&lng=${where.lng}&q=${encodeURIComponent(where.name)}` : "/dates";
}

export function PlanVisitLink({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const town = useSyncExternalStore(subscribe, () => theirTown, () => null);
  return (
    <Link href={datesHref(town)} aria-label={label} data-plan-visit className={className}>
      {children}
    </Link>
  );
}
