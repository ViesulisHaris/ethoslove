import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import type { PlaceGroup } from "@/lib/dates/kinds";

/** The same glyph the map's pins carry, as an icon. */
export function GroupIcon({ group, className }: { group: PlaceGroup; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {GROUP_GLYPHS[group].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
