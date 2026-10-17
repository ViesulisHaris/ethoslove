/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Clock3, MapPin, Sparkles } from "lucide-react";
import { ideaImage } from "@/lib/dates/art";
import type { DateIdea } from "@/lib/dates/ideas";
import { KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { EagerImg } from "@/components/shared/eager-img";
import { CityCta } from "./city-cta";

export type CityIdeaLabels = { budget: string; hours: string; twist: string; inCity: string; onMap: string; pick: string };

type Props = {
  idea: DateIdea;
  locale: "en" | "es";
  city: string;
  href: string;
  /** Real places for every stop, a walk apart; null when the map could not fill all of them. */
  stops: Place[] | null;
  isPick: boolean;
  labels: CityIdeaLabels;
  eager?: boolean;
};

/** One idea on a city's page: the picture, the recipe, the twist, and where in this city to do it. */
export function CityIdeaCard({ idea, locale, city, href, stops, isPick, labels, eager = false }: Props) {
  return (
    <article id={`idea-${idea.id}`} className="flex h-full scroll-mt-24 flex-col overflow-hidden rounded-[28px] bg-white shadow-soft ring-1 ring-forest/5">
      <div className="relative aspect-[4/3]" style={{ background: `linear-gradient(160deg, ${idea.art.from} 0%, ${idea.art.to} 100%)` }}>
        {/* An eager one through EagerImg: a server-drawn eager picture is a preload hint that every
            prefetch of the city's page (from /dates, from the other cities) adds to the page doing it. */}
        {eager ? (
          <EagerImg src={ideaImage(idea.id)} alt="" width={960} height={720} loading="eager" decoding="async" className="absolute inset-0 size-full object-cover" />
        ) : (
          <img src={ideaImage(idea.id)} alt="" width={960} height={720} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
        )}
        {isPick ? (
          <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-rose-deep shadow-soft backdrop-blur">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {labels.pick}
          </span>
        ) : null}
        <span className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-forest shadow-soft backdrop-blur">
          <Clock3 aria-hidden="true" className="size-3.5 text-rose-deep" />
          {labels.hours}
          <span aria-hidden="true" className="text-forest/35">
            ·
          </span>
          {labels.budget}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-[24px] leading-[1.1] text-forest">{idea.title[locale]}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-forest/75">{idea.blurb[locale]}</p>
        <p className="mt-3 rounded-2xl bg-rose-mist px-4 py-3 text-[14.5px] leading-relaxed text-forest">
          <strong className="font-semibold text-rose-ink">{labels.twist}</strong> {idea.twist[locale]}
        </p>
        {stops ? (
          <div className="mt-4">
            <p className="text-[12px] font-semibold tracking-wide text-forest/50 uppercase">{labels.inCity}</p>
            <ol className="mt-2 grid gap-1.5">
              {stops.map((place, i) => (
                <li key={place.id} className="flex items-start gap-2.5 text-[14.5px] leading-snug text-forest">
                  <span aria-hidden="true" className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-rose text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  {/* A place with no name on the map is called by its kind, so saying the kind again read "Viewpoint · Viewpoint". */}
                  <span className="min-w-0">
                    <span className="font-semibold">{place.named ? place.name : KINDS[place.kind].label[locale]}</span>
                    {place.named ? <span className="text-forest/55"> · {KINDS[place.kind].label[locale]}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        <CityCta href={href} cta="idea" city={city} className="group mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-4 text-[14.5px] font-semibold text-rose-deep underline-offset-4 hover:underline">
          <MapPin aria-hidden="true" className="size-4" />
          {labels.onMap}
          <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </CityCta>
      </div>
    </article>
  );
}
