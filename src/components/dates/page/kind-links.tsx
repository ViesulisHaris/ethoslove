import { Link } from "@/i18n/navigation";
import { DATE_KIND_COPY } from "@/content/date-kinds";
import { DATE_KINDS, type DateKind } from "@/lib/dates/date-kinds";

/**
 * Plain links to the pages by kind of date: at the foot of /dates (in CityLinks's own look, so the
 * two rows match) and in a page by kind's last band (in the page's colours, by the classes given).
 */
export function KindLinks({ locale, title, skip, className, titleClassName, linkClassName }: { locale: "en" | "es"; title: string; skip?: DateKind; className?: string; titleClassName?: string; linkClassName?: string }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className={titleClassName ?? "text-[12px] font-semibold tracking-wide text-forest/55 uppercase"}>{title}</h2>
      <ul className="-mx-1.5 mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
        {DATE_KINDS.filter((kind) => kind !== skip).map((kind) => (
          <li key={kind} className="flex items-center">
            <Link href={`/dates/ideas/${kind}`} className={linkClassName ?? "inline-flex min-h-11 items-center px-1.5 text-[14px] font-medium text-forest/75 underline-offset-4 hover:text-rose-deep hover:underline"}>
              {DATE_KIND_COPY[kind]!.nav[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
