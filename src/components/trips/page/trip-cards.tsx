/* eslint-disable @next/next/no-img-element -- the trips' own 800 and 1600 pictures, chosen by srcSet, as the matcher draws them */
import { Link } from "@/i18n/navigation";
import { IdeasDots } from "@/components/templates/page/ideas-dots";

export type TripCardItem = { id: string; href: string; title: string; label: string; line?: string; image: string | null; srcSet: string | null; art: { from: string; to: string } };

/**
 * Trips as picture cards on a designed page: the matcher's pick (trip-matcher.tsx) without its
 * button. A photograph, a small label, the trip's name and at most one short line. On a phone one
 * card to a screen with dots under the row; from 640px side by side.
 */
export function TripCards({ id, cards, columns = 3 }: { id: string; cards: readonly TripCardItem[]; columns?: 2 | 3 }) {
  return (
    <>
      <ol
        id={id}
        className={
          columns === 3
            ? "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-1 pb-2 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-5 sm:gap-y-9 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-x-6 min-[72rem]:grid-cols-3"
            : "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-1 pb-2 scrollbar-none sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-5 sm:gap-y-9 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-x-6"
        }
      >
        {cards.map((card) => (
          <li key={card.id} data-card data-pick data-trip={card.id} className="flex w-full shrink-0 snap-start flex-col sm:w-auto">
            <Link href={card.href} className="group block rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-page-ink">
              <span
                className="relative block aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-page-band shadow-page-card transition-[translate,box-shadow] duration-300 ease-(--ease-out-quint) group-hover:shadow-page-lift motion-reduce:transition-none pointer-fine:group-hover:-translate-y-1"
                style={{ background: `linear-gradient(160deg, ${card.art.from} 0%, ${card.art.to} 100%)` }}
              >
                {card.image ? (
                  <img
                    src={card.image}
                    srcSet={card.srcSet ?? undefined}
                    sizes={columns === 3 ? "(min-width: 1280px) 260px, (min-width: 640px) 45vw, 90vw" : "(min-width: 1280px) 400px, (min-width: 640px) 45vw, 90vw"}
                    alt=""
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : null}
              </span>
              <span className="mt-3.5 block text-page-label text-page-body">{card.label}</span>
              <span className="mt-1.5 block font-display text-xl leading-tight text-page-ink">{card.title}</span>
            </Link>
            {card.line ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-page-body">{card.line}</p> : null}
          </li>
        ))}
      </ol>
      <IdeasDots target={id} count={cards.length} className="mt-3 sm:hidden" />
    </>
  );
}
