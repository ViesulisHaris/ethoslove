import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug } from "@/content/recipients";
import { GiftIdeaList, withManifests } from "@/components/marketing/gift-idea-list";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { PageHeader } from "@/components/shared/page-header";

export function generateStaticParams() {
  return RECIPIENTS.map((r) => ({ slug: recipientSlug(r) }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/gifts/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const recipient = recipientFromSlug(slug);
  if (!recipient) return {};
  const guide = RECIPIENT_GUIDES[recipient][locale as GiftLocale];
  return pageMetadata({ locale, path: `/gifts/${slug}`, title: guide.title, description: guide.description });
}

/**
 * Gift ideas for one person: a numbered list where every idea is a template, then what to write,
 * when to send it and the questions people ask. The other people, and the occasions, at the foot.
 */
export default async function RecipientPage({ params }: PageProps<"/[locale]/gifts/[slug]">) {
  const { locale, slug } = await params;
  const recipient = recipientFromSlug(slug);
  if (!recipient) notFound();
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations("recipients");
  const guide = RECIPIENT_GUIDES[recipient][l];
  const ideas = withManifests(guide.ideas);
  const url = localizedUrl(locale, `/gifts/${slug}`);

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "ItemList",
            name: guide.h1,
            itemListElement: ideas.map((idea, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: idea.heading,
              url: localizedUrl(locale, `/templates/${idea.template}`),
            })),
          },
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("breadcrumb"), url: localizedUrl(locale, "/gifts") },
            { name: guide.h1, url },
          ]),
          faqNode(guide.faq),
        ]}
      />
      <PageHeader eyebrow={t("eyebrow")} title={guide.h1} subtitle={guide.lead} />

      <GiftIdeaList ideas={ideas} locale={l} heading="h2" className="container-x border-t border-line pb-16" />

      <section className="container-narrow pb-16" aria-labelledby="recipient-guide">
        <h2 id="recipient-guide" className="sr-only">
          {t("guideTitle")}
        </h2>
        <div className="flex flex-col gap-8">
          {guide.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="font-display text-2xl">{section.heading}</h3>
              <p className="mt-2.5 leading-relaxed text-ink-soft">{section.body}</p>
            </div>
          ))}
        </div>
        <h2 className="display-md mt-16 mb-6">{t("faqTitle")}</h2>
        <FaqList items={guide.faq} name={`faq-${recipient}`} />
      </section>

      <nav className="container-x border-t border-line pt-10 pb-24" aria-labelledby="more-people">
        <h2 id="more-people" className="text-eyebrow text-ink-soft">
          {t("more")}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {RECIPIENTS.filter((r) => r !== recipient).map((r) => (
            <li key={r}>
              <Link
                href={`/gifts/${recipientSlug(r)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40"
              >
                {RECIPIENT_GUIDES[r][l].label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/occasions"
              className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40"
            >
              {t("occasions")}
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
