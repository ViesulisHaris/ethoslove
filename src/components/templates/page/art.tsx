import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { CutoutImg, placementClass, placementStyle, type Placement } from "@/components/marketing/home/cutouts";
import { pageArt, type ArtId } from "@/content/page-art";
import type { Flowers } from "@/content/template-page-themes";

/**
 * One piece of the page art (content/page-art.ts), in the page's colourway. Decoration, like the
 * homepage's cut-outs and drawn by the same component: never announced, its box reserved, lazy
 * unless it is in the first view. `data-decor` is how the tests find it, to check it never lies
 * over words.
 */
export function Art({ id, flowers, slug, eager, className, style }: { id: ArtId; flowers: Flowers; slug?: string; eager?: boolean; className?: string; style?: CSSProperties }) {
  const art = pageArt(id, flowers, slug);
  return (
    <span data-decor={id} className={cn("block", className)} style={style}>
      {/* A stand-in's tint is the picture's own; the blur and the shadow a placement adds are the box's, so the shadow keeps the ground's colour. */}
      <CutoutImg src={art.src} srcSet={art.src1x ? `${art.src1x} 1x, ${art.src} 2x` : undefined} width={art.width} height={art.height} eager={eager} className="block w-full" style={art.tint ? { filter: art.tint } : undefined} />
    </span>
  );
}

export type PlacedArt = Placement & { art: ArtId };

/**
 * Art laid round a section the way the homepage frames its hero (FloralFrame): each piece by its
 * middle, in per cent of the section, sized in per cent of the screen, turned, a few out of focus.
 * Unlike that frame this one is not clipped to its section, so a lily can lie across the edge
 * between two; the page itself clips what spills off its sides (globals.css, [data-page-theme]).
 * Nothing here may sit over words at any width: tests/e2e/template-page-design.spec.ts compares
 * the boxes.
 */
export function ArtLayer({ items, flowers, className }: { items: readonly PlacedArt[]; flowers: Flowers; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {items.map((b, i) => (
        <Art key={i} id={b.art} flowers={flowers} eager={b.eager} className={placementClass(b)} style={placementStyle(b, "var(--page-shade-soft)")} />
      ))}
    </div>
  );
}

/**
 * The soft curved edge of a band: the band's colour rising into the section above it (or, turned
 * over, the ground's colour rising into the band's foot). One fixed curve, stretched to the page.
 */
export function BandEdge({ side, className }: { side: "top" | "bottom"; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 96" preserveAspectRatio="none" className={cn("pointer-events-none block h-[clamp(2.25rem,6.6vw,6rem)] w-full", className)}>
      {side === "top" ? (
        <path fill="currentColor" d="M0 97V44C180 12 420 -6 690 22C960 50 1130 88 1440 40V97Z" />
      ) : (
        <path fill="currentColor" d="M0 97V30C210 74 470 96 760 70C1040 45 1250 20 1440 46V97Z" />
      )}
    </svg>
  );
}
