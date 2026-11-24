import type { ReactNode } from "react";
import { PlayingCard } from "../cards";

const SMALL = { className: "aspect-[5/7] h-28", corners: "md", radius: 10, faceClassName: "shadow-page-card" } as const;

/**
 * How today's question goes, as three picture cards: the room's own playing cards, small, never a
 * new drawing. Pick one (a card face up), send it (a card face down, on its way unseen), see both
 * (the two face up). Three in a row on a desk; on a phone the three stacked as short numbered rows,
 * the picture small at the end of each (no swipe row and no dots: RULES, "Less text").
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
    <ol id="today-steps" className="grid gap-3 sm:grid-cols-3 sm:gap-4 sm:pt-5">
      {steps.map((step, i) => (
        <li
          key={step}
          data-card
          className="relative flex items-center gap-4 rounded-[1.25rem] border border-page-line bg-page-raised py-3 pr-3 pl-4 sm:flex-col sm:gap-0 sm:px-5 sm:pt-9 sm:pb-6 sm:text-center"
        >
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-page-badge font-display text-lg text-page-ink sm:absolute sm:-top-5 sm:left-1/2 sm:-translate-x-1/2 sm:ring-4 sm:ring-page-raised"
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 font-display text-[1.125rem] leading-snug text-page-ink sm:flex-none sm:text-[1.25rem]">{step}</span>
          <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center sm:mt-5 sm:h-32 sm:w-auto">
            <span className="block max-sm:scale-[0.6]">{pictures[i]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
