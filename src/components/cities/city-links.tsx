import { Link } from "@/i18n/navigation";
import { cityName, type City } from "@/lib/cities/cities";

/** A row of city pages to go to: the index at the foot of the dates map, and "nearby" on a city's page. */
export function CityLinks({ cities, locale, title, className }: { cities: City[]; locale: "en" | "es"; title: string; className?: string }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className="text-[12px] font-semibold tracking-wide text-forest/55 uppercase">{title}</h2>
      {/* Pulled out by the links' own padding, so every wrapped row starts flush with the heading. */}
      <ul className="-mx-1.5 mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
        {cities.map((city) => (
          <li key={city.slug} className="flex items-center">
            <Link href={`/dates/${city.slug}`} className="inline-flex min-h-11 items-center px-1.5 text-[14px] font-medium text-forest/75 underline-offset-4 hover:text-rose-deep hover:underline">
              {cityName(city, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
