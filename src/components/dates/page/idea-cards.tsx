/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ideaImage } from "@/lib/dates/art";
import type { DateIdea } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { IdeasDots } from "@/components/templates/page/ideas-dots";

export type DateCard = {
  idea: DateIdea;
  /** The line the card opens to: why it fits this page. */
  fit: string;
  /** Real places for its stops, on a city's page; absent on a page with no city. */
  stops?: Place[] | null;
  /** Where "Plan it" goes. */
  href: string;
};
export type DateCardLabels = { twist: string; plan: string; hours: (idea: DateIdea) => string; budget: (idea: DateIdea) => string; inCity?: string };

/**
 * Date ideas as picture cards: closed, a card is the idea's picture and its title; opened, why it
 * fits this page, its twist in handwriting, its real stops on a city's page, and the way to plan
 * it. One opens at a time. On a phone the cards are one row, one to a screen, with dots under it;
 * from 640px a grid, two and then three across.
 */
export function DateIdeaCards({ id, cards, locale, labels }: { id: string; cards: readonly DateCard[]; locale: "en" | "es"; labels: DateCardLabels }) {
  return (
    <div className="min-w-0">
      <ul id={id} data-cards className="-mx-5 flex snap-x snap-mandatory scroll-px-5 items-start gap-5 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-5 sm:gap-y-6 sm:overflow-visible sm:px-0 sm:[&:not(:has(details[open]))]:items-stretch lg:grid-cols-3">
        {cards.map(({ idea, fit, stops, href }) => (
          <li key={idea.id} id={`idea-${idea.id}`} data-card data-pick className="w-full shrink-0 scroll-mt-24 snap-start sm:w-auto">
            <details name={`${id}-open`} className="group/card rounded-[1.25rem] border border-page-line bg-page-raised shadow-page-card transition-shadow duration-300 open:shadow-page-lift hover:shadow-page-lift motion-reduce:transition-none sm:h-full">
              <summary className="relative grid cursor-pointer list-none content-start rounded-[1.25rem] outline-offset-4 active:opacity-90 sm:h-full [&::-webkit-details-marker]:hidden">
                <span className="relative block aspect-[5/4] overflow-hidden rounded-t-[1.2rem] sm:aspect-[4/3]" style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)` }}>
                  <img src={ideaImage(idea.id)} alt="" width={960} height={720} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                </span>
                {/* Not a heading: a browser gives a summary a button's role, and a heading inside one cannot be reached as a heading. */}
                <span data-card-title className="block px-5 pt-4 pr-12 pb-5 font-display text-[1.25rem] leading-[1.18] text-page-ink">
                  {idea.title[locale]}
                </span>
                <Plus aria-hidden="true" className="absolute right-4 bottom-5 size-4 text-page-body transition-transform duration-200 group-open/card:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
              </summary>
              {/* No data-reveal anywhere in here: an opened card near the foot of a screen would stay unseen. */}
              <div className="px-5 pb-4">
                <p className="border-t border-page-line pt-4 text-[0.9375rem] leading-relaxed text-page-body">{fit}</p>
                <p className="mt-4 text-page-label text-page-body">{labels.twist}</p>
                <p data-line className="mt-1.5 font-hand text-[1.45rem] leading-[1.15] text-page-ink">
                  {idea.twist[locale]}
                </p>
                {stops && stops.length > 0 && labels.inCity ? (
                  <>
                    <p className="mt-4 text-page-label text-page-body">{labels.inCity}</p>
                    <ol className="mt-2 grid gap-1.5">
                      {stops.map((place, i) => (
                        <li key={place.id} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-page-ink">
                          <span aria-hidden="true" className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-page-badge text-[0.6875rem] font-semibold text-page-ink">
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="font-medium">{place.named ? place.name : KINDS[place.kind].label[locale]}</span>
                            {place.named ? <span className="text-page-body"> · {KINDS[place.kind].label[locale]}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : null}
                <p className="mt-3 text-sm text-page-body">
                  {labels.hours(idea)} · {labels.budget(idea)}
                </p>
                <Link href={href} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-page-accent underline-offset-4 hover:underline active:text-page-accent-hover">
                  {labels.plan}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <IdeasDots target={id} count={cards.length} className="mt-4 sm:hidden" />
    </div>
  );
}
