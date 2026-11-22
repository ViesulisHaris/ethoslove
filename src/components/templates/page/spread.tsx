import type { ReactNode } from "react";

/**
 * The two pieces every section of a redesigned page is built on (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md): a spread of two columns, and the short left column that goes in it. They
 * were the gift page's own (./sections.tsx) and are shared from here, so the finder and the pages
 * that follow are assembled from the same parts and cannot drift from it.
 */

/** The two-column spread every section below a hero shares. */
export const SPREAD = "container-x relative grid gap-y-9 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-x-20";

/**
 * A section's left column: the label, the heading, at most one line and at most one button. The
 * heading is an h2 on a gift's page, where the hero has the h1; a page whose first section is a
 * spread (the finder) says `level={1}` there.
 *
 * `aside` shares the label's line, at its right end (the finder's way round to the gallery, on a
 * phone). The two are laid out, not placed: where they do not fit one line, the aside goes under
 * the label. It was placed over the label's line by hand before, and on a 320px phone in Spanish
 * "Ver los 61 regalos" was printed over "BUSCADOR DE REGALOS" (the review of 22 Nov 2026).
 */
export function Intro({ id, label, heading, line, level = 2, aside, children }: { id?: string; label: string; heading: string; line?: string; level?: 1 | 2; aside?: ReactNode; children?: ReactNode }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="lg:pt-7">
      {aside ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-page-label text-page-body">{label}</p>
          {aside}
        </div>
      ) : (
        <p className="text-page-label text-page-body">{label}</p>
      )}
      <Heading id={id} className="mt-4 max-w-[22rem] display-lg text-balance text-page-ink">
        {heading}
      </Heading>
      {line ? <p className="mt-4 max-w-[21rem] text-[0.9375rem] leading-relaxed text-page-body">{line}</p> : null}
      {children}
    </div>
  );
}
