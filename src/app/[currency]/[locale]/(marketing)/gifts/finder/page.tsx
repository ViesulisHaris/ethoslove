import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OCCASIONS } from "@/config/occasions";
import { SITE } from "@/config/site";
import { FINDER_COPY, FINDER_PATH, finderPicks } from "@/content/finder";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { finderWaitScript } from "@/lib/gift/finder";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { GiftFinder } from "@/components/templates/gift-finder";

type Props = PageProps<"/[currency]/[locale]/gifts/finder">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const copy = FINDER_COPY[locale === "es" ? "es" : "en"];
  // One address whatever the answers: pageMetadata's canonical is the bare path, and the answers ride in the query.
  return pageMetadata({ locale, path: FINDER_PATH, title: copy.title, description: copy.description });
}

const CHIP = "inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40";

/**
 * The gift finder: three questions that end on three templates to watch and make
 * (components/templates/gift-finder.tsx), then, for a reader and a crawler, how it chooses and the
 * pages that start from a person or a day instead.
 *
 * The page is static and never reads its query: the answers are read in the browser. Only this
 * language's words, and each template's fit (content/finder.ts), go to it.
 */
export default async function GiftFinderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l: GiftLocale = locale === "es" ? "es" : "en";
  const copy = FINDER_COPY[l];
  const t = await getTranslations();
  const count = listManifests().length;

  return (
    <>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("recipients.breadcrumb"), url: localizedUrl(locale, "/gifts") },
            { name: copy.eyebrow, url: localizedUrl(locale, FINDER_PATH) },
          ]),
        ]}
      />
      <PageHeader eyebrow={copy.eyebrow} title={copy.h1} subtitle={copy.intro} className="pt-8 pb-6 sm:pb-10" />

      {/*
       * A link that already carries answers must not flash the first question before its picks: the
       * script marks this section (FINDER_WAIT, lib/gift/finder.ts) before anything paints, the card
       * stays unseen while it is marked, and the tool unmarks it once it has read the address. The mark
       * is not in the server's HTML, hence suppressHydrationWarning.
       */}
      <section className="group/finder container-x pb-20" aria-label={copy.eyebrow} suppressHydrationWarning>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: finderWaitScript() }} />
        <div className="max-w-5xl rounded-[28px] bg-white/70 p-4 shadow-soft ring-1 ring-forest/5 group-data-finder-wait/finder:invisible sm:p-8 lg:p-10">
          <GiftFinder picks={finderPicks(l)} ui={copy.ui} marks={{ free: t("common.free"), premium: t("common.premium") }} locale={l} />
        </div>
      </section>

      <section className="container-narrow border-t border-line pt-14 pb-16" aria-labelledby="finder-how">
        <h2 id="finder-how" className="display-md">
          {copy.how.title}
        </h2>
        <div className="mt-5 flex flex-col gap-4 leading-relaxed text-ink-soft">
          {copy.how.paragraphs.map((p) => (
            <p key={p}>{p.replace("{count}", String(count))}</p>
          ))}
        </div>
      </section>

      <nav className="container-narrow border-t border-line pt-10 pb-10" aria-labelledby="finder-by-who">
        <h2 id="finder-by-who" className="display-md">
          {copy.byWho.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{copy.byWho.lead}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {RECIPIENTS.map((r) => (
            <li key={r}>
              <Link href={`/gifts/${recipientSlug(r)}`} className={CHIP}>
                {RECIPIENT_GUIDES[r][l].label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className="container-narrow border-t border-line pt-10 pb-24" aria-labelledby="finder-by-day">
        <h2 id="finder-by-day" className="display-md">
          {copy.byDay.title}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <li key={o}>
              <Link href={`/occasions/${o}`} className={CHIP}>
                {t(`occasions.${o}`)}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/templates" className={cn(CHIP, "border-ink/30 font-medium")}>
              {copy.byDay.all.replace("{count}", String(count))}
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
