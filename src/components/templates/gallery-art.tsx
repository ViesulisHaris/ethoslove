import type { CSSProperties } from "react";
import { Art } from "@/components/templates/page/art";
import type { ArtId } from "@/content/page-art";
import { cn } from "@/lib/utils";

/**
 * The head of the gallery as the owner drew it (22 Nov 2026, shots/mockups/OWNER-MOCKUP-gallery.webp):
 * the paper with light in it, a spray of ivory lilies coming in from the top right, a few leaves
 * at the left edge. It lies behind the heading, the row of occasions and the first cards, and
 * fades into the plain paper under them.
 *
 * The lilies are the gift pages' renders (content/page-art.ts), so the same rules hold: none is
 * mirrored, none turned far, and each lies where its stem can leave the page (`lily-three-quarter`
 * up to the right, `lily-side` and the tall stem down to the right). Leaves and petals turn freely.
 * The whole spray is warmed a little, as the mock-up's is, so it sits in the paper and not on it.
 *
 * Decoration only: hidden from a screen reader, never under a pointer, and placed clear of the
 * heading at every width it is shown at (the spray only from 1280px; a single bloom below that).
 */
type Piece = { id: ArtId; left: string; top: string; width: string; rot: number; when: string; blur?: number; opacity?: number; eager?: boolean };

const PIECES: Piece[] = [
  // the spray, on a desk
  // Lazy: the stem is the heaviest piece (88 KB, 217 KB on a sharp screen) and stands under the corner's head, which is the one fetched with the page.
  { id: "lily-stem-tall", left: "87%", top: "25rem", width: "31vw", rot: 14, when: "hidden xl:block" },
  { id: "lily-three-quarter", left: "92.5%", top: "9.5rem", width: "25vw", rot: 4, when: "hidden xl:block", eager: true },
  { id: "lily-side", left: "100.5%", top: "31rem", width: "21vw", rot: -10, when: "hidden xl:block" },
  { id: "petal-2", left: "60%", top: "9.5rem", width: "4.6vw", rot: 24, when: "hidden xl:block", opacity: 0.9 },
  { id: "leaf-2", left: "-1.5%", top: "27rem", width: "15vw", rot: -42, when: "hidden xl:block", opacity: 0.85 },
  { id: "leaf-1", left: "-2%", top: "38rem", width: "17vw", rot: 28, when: "hidden xl:block", opacity: 0.85 },
  // a laptop: the corner only
  { id: "lily-three-quarter", left: "96%", top: "9rem", width: "24vw", rot: 6, when: "hidden lg:block xl:hidden", eager: true },
  // a phone: one bloom beside the heading's short lines
  { id: "lily-three-quarter", left: "99%", top: "8.5rem", width: "38vw", rot: 8, when: "lg:hidden", eager: true },
];

export function GalleryArt({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 -z-10 h-[62rem] overflow-hidden paper-ground [mask-image:linear-gradient(to_bottom,#000_72%,transparent)]", className)}>
      <div className="absolute inset-0" style={{ filter: "sepia(0.2) saturate(0.92)" }}>
        {PIECES.map((p, i) => {
          const style: CSSProperties = { left: p.left, top: p.top, width: p.width, transform: `translate(-50%, -50%) rotate(${p.rot}deg)`, opacity: p.opacity, ...(p.blur ? { filter: `blur(${p.blur}px)` } : null) };
          return <Art key={i} id={p.id} flowers="ivory" shown={p.width} eager={p.eager} className={cn("absolute max-w-none", p.when)} style={style} />;
        })}
      </div>
      <div className="grain-overlay opacity-[0.1]" />
    </div>
  );
}
