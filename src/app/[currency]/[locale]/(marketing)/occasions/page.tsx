import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { OCCASIONS, type Occasion } from "@/config/occasions";
import { listManifests } from "@/templates/manifests";
import { SITE } from "@/config/site";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { OCCASIONS_INDEX } from "@/content/occasions-index";
import { occasionTemplates } from "@/content/occasion-templates";
import { JsonLd } from "@/components/shared/json-ld";
import { GalleryHead } from "@/components/templates/gallery-head";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/occasions">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/occasions", title: t("occasionsTitle"), description: t("occasionsDescription") });
}

/**
 * Every occasion, laid out as its neighbours are (fix round 5, 24 Nov 2026; it was a numbered list
 * of names): the gallery's head with its lilies, then the thirteen occasions as picture tiles, each
 * with its rendered icon (public/art/occasions, as the gallery's row draws them), its name, one short
 * line and how many gifts its page holds. The description that stood under the heading is in a
 * closed row under the tiles, so a search engine reads all it read before.
 */
export default async function OccasionsIndexPage({ params }: PageProps<"/[currency]/[locale]/occasions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const l = locale as Locale;
  const words = OCCASIONS_INDEX[l];
  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("occasions.title"), url: localizedUrl(locale, "/occasions") },
          ]),
        ]}
      />
      <div data-occasions-index>
        <GalleryHead
          eyebrow={t("occasions.title")}
          title={t("seo.occasionsTitle")}
          line={words.line}
          // The petal of the lilies stands at 60% of a wide desk: the Spanish heading, the longer, takes two lines before it.
          titleClassName="max-w-5xl xl:max-w-[46rem]"
        >
          <ul data-occasion-tiles className="container-x grid grid-cols-2 gap-3 pt-2 pb-12 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:pb-16">
            {OCCASIONS.map((o) => (
              <li key={o}>
                <OccasionCard href={`/occasions/${o}`} icon={o} name={t(`occasions.${o}`)} line={words.lines[o]} count={words.count(occasionTemplates(o, l).length)} />
              </li>
            ))}
            {/* The fourteenth tile is the whole gallery, as "All occasions" leads the gallery's own row: thirteen alone left one tile by itself on the last row. */}
            <li>
              <OccasionCard href="/templates" icon="all" name={t("templates.allOccasions")} line={words.allLine} count={words.count(listManifests().length)} />
            </li>
          </ul>
        </GalleryHead>
        <div className="container-x pb-20">
          <details className="group max-w-2xl border-y border-line">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[0.9375rem] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {words.more}
              <Plus aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-45" strokeWidth={1.6} />
            </summary>
            <p className="pb-5 text-[0.9375rem] leading-relaxed text-ink-soft">{t("seo.occasionsDescription")}</p>
          </details>
        </div>
      </div>
    </>
  );
}

/** An occasion as a picture tile: its rendered icon, its name, one line and how many gifts its page holds. The whole tile is the link. */
function OccasionCard({ href, icon, name, line, count }: { href: string; icon: Occasion | "all"; name: string; line: string; count: string }) {
  return (
    <Link
      href={href}
      data-occasion-card={icon}
      className="group flex h-full flex-col rounded-[1.25rem] bg-card p-4 text-ink ring-1 ring-ink/[0.07] transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_-20px_rgba(74,32,24,0.5)] active:translate-y-0 active:bg-paper-deep active:shadow-none motion-reduce:hover:translate-y-0 sm:p-5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 6 KB decoration at a fixed size, as the gallery's row draws it */}
      <img
        src={`/art/occasions/${icon}.webp`}
        alt=""
        aria-hidden="true"
        width={96}
        height={96}
        decoding="async"
        draggable={false}
        className="pointer-events-none size-14 object-contain drop-shadow-[0_5px_6px_rgba(74,32,24,0.28)] select-none sm:size-16"
      />
      <span className="mt-3 font-display text-xl leading-tight sm:text-2xl">{name}</span>
      <span className="mt-1.5 text-[0.9375rem] leading-snug text-ink-soft">{line}</span>
      <span className="mt-auto pt-3 text-sm font-medium text-ink">{count}</span>
    </Link>
  );
}
