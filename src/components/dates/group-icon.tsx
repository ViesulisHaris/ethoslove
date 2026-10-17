import { cn } from "@/lib/utils";
import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import type { PlaceGroup } from "@/lib/dates/kinds";

/**
 * The same glyph the map's pins carry, as an icon. It never gives up its width: an svg with no size
 * of its own is the one flex item that can shrink to nothing, and on a 360px phone it did, leaving
 * "19:00 ·  Restaurant" with a hole where the icon was.
 */
export function GroupIcon({ group, className }: { group: PlaceGroup; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      {GROUP_GLYPHS[group].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
