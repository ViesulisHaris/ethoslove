import type { ReactNode } from "react";
import { GalleryArt } from "./gallery-art";

/**
 * The head of the gallery and of every occasion's page, over the row of occasions and the cards
 * (`children`): the paper with the lilies, a small label, the heading, one italic line and, beside
 * that line on a desk, one quiet link (`aside`).
 *
 * It is one component so that the fourteen pages the row of occasions leads to are the same height
 * down to the row. An occasion's page had a heading of its own with a paragraph of four lines and
 * no lilies: the row stood up to 122px higher or lower from one page to the next, so the tile under
 * the pointer changed between presses, and pressing a tile felt like landing on another site, not
 * like filtering the gallery (the user walk of 23 Nov 2026). The heading is given room for one line
 * on a desk (an occasion's longest is "Virtual Christmas cards and digital gifts").
 *
 * -mt/pt: the ground starts at the top of the screen, under the floating header, as a gift's page does.
 */
export function GalleryHead({ eyebrow, title, line, aside, children }: { eyebrow: string; title: string; line: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative isolate -mt-[var(--header-h)] pt-[var(--header-h)]">
      <GalleryArt />
      <header data-gallery-head className="container-x pt-12 pb-9 sm:pt-16 sm:pb-11 lg:pt-14 lg:pb-8">
        <p className="text-eyebrow mb-5 text-ink-soft">{eyebrow}</p>
        <h1 className="display-xl max-w-5xl">{title}</h1>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-10 gap-y-6">
          <p className="max-w-2xl font-display text-xl leading-snug text-ink-soft italic sm:text-2xl">{line}</p>
          {aside}
        </div>
      </header>
      {children}
    </div>
  );
}
