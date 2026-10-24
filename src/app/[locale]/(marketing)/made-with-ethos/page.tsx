import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { featuredFor } from "@/config/featured";
import { REF_PATTERN } from "@/lib/attribution/ref";
import { listManifests } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateCard } from "@/components/templates/template-card";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/made-with-ethos">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "madeWith" });
  // A page for whoever taps a free gift's footer, not one to be found by searching.
  return { title: t("metaTitle"), description: t("metaDescription"), robots: { index: false, follow: true } };
}

/**
 * Where a free gift's "Made with Ethos" footer leads (?ref=watermark&template=<the gift's>): someone
 * has just been given one and is curious, not ready to pay. So it says what they're looking at and
 * that making one back starts free, then shows the free templates first and the premium ones after,
 * the gift's own template first among its kind. Every card opens a demo or the editor, never a
 * checkout, and carries the ref on to the editor, where it rides with any purchase.
 */
export default async function MadeWithEthosPage({ params, searchParams }: PageProps<"/[locale]/made-with-ethos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations("madeWith");
  const ref = typeof query.ref === "string" ? query.ref.trim().toLowerCase() : "";
  const linkQuery = REF_PATTERN.test(ref) ? `?ref=${ref}` : "";
  const theirs = typeof query.template === "string" ? query.template : null;
  const firstTheirs = (list: TemplateManifest[]) => [...list.filter((m) => m.slug === theirs), ...list.filter((m) => m.slug !== theirs)];
  const all = listManifests();
  const shelves = [
    { id: "free", items: firstTheirs(all.filter((m) => m.tier === "free")) },
    { id: "premium", items: firstTheirs(all.filter((m) => m.tier !== "free")) },
  ] as const;

  return (
    <ClientMessages scope="(marketing)/made-with-ethos/page" locale={locale}>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="container-x flex flex-col gap-20 pb-24" data-testid="made-with-ethos">
        {shelves.map((shelf, s) => (
          <section key={shelf.id} aria-labelledby={`shelf-${shelf.id}`} data-shelf={shelf.id}>
            <header className="mb-8 border-b border-line pb-5 md:flex md:items-end md:justify-between md:gap-8">
              <div>
                <p className="text-eyebrow text-ink-soft">{t(`${shelf.id}.eyebrow`)}</p>
                <h2 id={`shelf-${shelf.id}`} className="display-md mt-2">
                  {t(`${shelf.id}.title`)}
                </h2>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground md:mt-0 md:pb-1">{t(`${shelf.id}.blurb`)}</p>
            </header>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shelf.items.map((m, i) => (
                <TemplateCard
                  key={m.slug}
                  manifest={m}
                  index={(s === 0 ? 0 : shelves[0].items.length) + i}
                  badge={featuredFor(m.slug)}
                  linkQuery={linkQuery}
                  marker={m.slug === theirs ? t("yours") : undefined}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ClientMessages>
  );
}
