import { cn } from "@/lib/utils";

/** "Featured", in words: a quiet hairline chip after a place's name. No colour of its own, no icon. */
export function FeaturedLabel({ label, className }: { label: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-forest/20 px-2 py-0.5 align-middle text-[11.5px] font-semibold tracking-wide text-forest/75 uppercase", className)}>{label}</span>;
}

/** The label, only on a place a venue pays to have marked (lib/dates/featured.ts). */
export function FeaturedMark({ place, label, className }: { place: { featured?: true }; label: string; className?: string }) {
  return place.featured ? <FeaturedLabel label={label} className={className} /> : null;
}
