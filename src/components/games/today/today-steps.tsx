import type { ReactNode } from "react";
import { IdeasDots } from "@/components/templates/page/ideas-dots";
import { PlayingCard } from "../cards";

const SMALL = { className: "aspect-[5/7] h-28", corners: "md", radius: 10, faceClassName: "shadow-page-card" } as const;

/**
 * How today's question goes, as three picture cards: the room's own playing cards, small, never a
 * new drawing. Pick one (a card face up), send it (a card face down, on its way unseen), see both
 * (the two face up). Three in a row on a desk; on a phone one card to a screen, flicked sideways,
 * with dots under the row, the gift page's own recipe (the owner's rule for any set of cards there).
 */
export function TodaySteps({ steps }: { steps: [string, string, string] }) {
  const pictures: ReactNode[] = [
    <PlayingCard key="1" {...SMALL} tone="blush" rank="A" suit="heart" className="aspect-[5/7] h-28 -rotate-4" />,
    // The back's shadow is drawn for the dark table and cannot be swapped by a prop; this wraps it in the page's own.
    <span key="2" className="block rotate-6 rounded-[10px] shadow-page-card">
      <PlayingCard {...SMALL} faceDown back="rose" />
    </span>,
    <span key="3" className="flex items-center">
      <PlayingCard {...SMALL} tone="blush" rank="A" suit="heart" className="aspect-[5/7] h-28 -rotate-6" />
      <PlayingCard {...SMALL} tone="lilac" rank="B" suit="spade" className="-ml-7 aspect-[5/7] h-28 rotate-5" />
    </span>,
  ];
  return (
    <>
      <ol id="today-steps" className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-5 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0">
        {steps.map((step, i) => (
          <li key={step} data-card className="relative flex w-full shrink-0 snap-start flex-col items-center rounded-[1.25rem] border border-page-line bg-page-raised px-5 pt-9 pb-6 text-center sm:w-auto">
            <span aria-hidden="true" className="absolute -top-5 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full bg-page-badge font-display text-lg text-page-ink ring-4 ring-page-raised">
              {i + 1}
            </span>
            <span className="font-display text-[1.25rem] leading-snug text-page-ink">{step}</span>
            <span aria-hidden="true" className="mt-5 flex h-32 items-center justify-center">
              {pictures[i]}
            </span>
          </li>
        ))}
      </ol>
      <IdeasDots target="today-steps" count={3} className="mt-4 sm:hidden" />
    </>
  );
}
