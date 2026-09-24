"use client";

import { ArrowUpDown, Heart, MapPin, Star, Wallet, type LucideIcon } from "lucide-react";
import { SORTS, type Sort } from "@/lib/dates/rank";
import { ChoiceMenu } from "@/components/pickers/choice-menu";

const ICONS: Record<Sort, LucideIcon> = { best: Heart, rated: Star, nearest: MapPin, cheapest: Wallet };

export type SortLabels = { label: string; name: Record<Sort, string>; sub: Record<Sort, string> };

type Props = { value: Sort; labels: SortLabels; onChange: (sort: Sort) => void; className?: string };

/**
 * How the list is ordered: a pill that opens the calendar's card, each order with what it actually
 * does under its name. It was the browser's own select; now it is the site's one choice menu
 * (components/pickers/choice-menu), which every other choice on the site shares.
 */
export function SortMenu({ value, labels, onChange, className }: Props) {
  const choices = SORTS.map((sort) => ({ value: sort, label: labels.name[sort], description: labels.sub[sort], icon: ICONS[sort] }));
  return <ChoiceMenu value={value} choices={choices} onChange={onChange} label={labels.label} icon={ArrowUpDown} className={className} />;
}
