import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CutoutImg, placementClass, placementStyle } from "@/components/marketing/home/cutouts";
import { artSrcSet, pageArt, slotStyle, type ArtId, type SlotName } from "@/content/page-art";
import type { Flowers } from "@/content/template-page-themes";
import type { PlacedArt } from "./placements";

/**
 * One piece of the page art (content/page-art.ts), in the page's colourway. Decoration, like the
 * homepage's cut-outs and drawn by the same component: never announced, its box reserved by the
 * render's own size, lazy unless it is in the first view, and the half-size file wherever that is
 * enough. `shown` is how wide it is drawn, as a `sizes` value. `data-decor` is how the tests find
 * it, to check it never lies over words.
 */
export function Art({ id, flowers, shown, eager, className, style }: { id: ArtId; flowers: Flowers; shown: string; eager?: boolean; className?: string; style?: CSSProperties }) {
  const art = pageArt(id, flowers);
  return (
    <span data-decor={id} className={cn("block", className)} style={style}>
      <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes={shown} width={art.width} height={art.height} eager={eager} className="block w-full" />
    </span>
  );
}

/**
 * A piece with an empty place in it, and something laid into that place by the render's own
 * matrix: a photo into a polaroid, a line of handwriting onto a note card. The box keeps the
 * picture's shape; what is laid in scales with it.
 */
export function ArtWithSlot({ id, flowers, slot, shown, className, slotClassName, children }: { id: ArtId; flowers: Flowers; slot: SlotName; shown: string; className?: string; slotClassName?: string; children: ReactNode }) {
  const art = pageArt(id, flowers);
  const place = art.slots[slot];
  return (
    <span data-decor={id} className={cn("relative block", className)} style={{ aspectRatio: `${art.width} / ${art.height}` }}>
      <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes={shown} width={art.width} height={art.height} className="absolute inset-0 block w-full" />
      {place ? (
        <span className={cn("absolute block overflow-hidden", slotClassName)} style={slotStyle(art, place)}>
          {children}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Art laid round a section the way the homepage frames its hero (FloralFrame): each piece by its
 * middle, in per cent of the section, sized in per cent of the screen, turned a little. Unlike
 * that frame this one is not clipped to its section, so a lily can lie across the edge between
 * two; the page itself clips what spills off its sides (globals.css, [data-page-theme]). The
 * renders bring their own shadows, so none is added. Nothing here may sit over words at any
 * width: tests/e2e/template-page-design.spec.ts looks under every word for a flower's pixels.
 */
export function ArtLayer({ items, flowers, className }: { items: readonly PlacedArt[]; flowers: Flowers; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      {items.map((b, i) => {
        // The homepage's rule for where a piece lies and how wide. Its drop shadow is for cut-outs that have none of their own, so it is left out.
        const place = placementStyle(b, "transparent");
        const style: CSSProperties = { left: place.left, top: place.top, width: place.width, transform: place.transform, opacity: place.opacity, ...(b.blur ? { filter: `blur(${b.blur}px)` } : null) };
        // Whole class names, so Tailwind finds them: a piece kept for wide desks (90rem is 1440 px), or for everything narrower.
        // In rem like `lg`, or Tailwind cannot order the two and the narrower rule wins on a wide desk.
        const when = b.from === 1440 ? "absolute max-w-none hidden min-[90rem]:block" : b.until === 1440 ? "absolute max-w-none hidden lg:block min-[90rem]:hidden" : placementClass(b);
        return <Art key={i} id={b.art} flowers={flowers} eager={b.eager} shown={`${b.size}vw`} className={when} style={style} />;
      })}
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
