import { cn } from "@/lib/utils";
import { COST_LABELS, COST_MARKS, type Cost } from "@/lib/dates/cost";

/** "€€", with the words in a tooltip and for screen readers. */
export function CostChip({ cost, locale, reported = false, className }: { cost: Cost; locale: "en" | "es"; reported?: boolean; className?: string }) {
  const label = COST_LABELS[cost][locale];
  return (
    <span title={label} aria-label={label} className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide", cost === 0 ? "bg-moss-soft text-moss" : "bg-forest/[0.06] text-forest/70", reported && "ring-1 ring-star/60", className)}>
      {cost === 0 ? label : COST_MARKS[cost]}
    </span>
  );
}
