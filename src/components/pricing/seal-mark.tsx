import { HEART, SEAL } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

/**
 * Ethos for Two's mark: the site's seal pressed in gold instead of rose, with a thin inner ring so it
 * reads as a medal on the indigo. Decorative; whatever it stands beside says the words.
 */
export function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)} fill="none">
      <path d={SEAL} fill="var(--brand-starlight)" />
      <circle cx="16" cy="16" r="10.6" stroke="var(--brand-starlight-deep)" strokeWidth="0.8" />
      <path d={HEART} fill="var(--brand-dusk)" />
    </svg>
  );
}
