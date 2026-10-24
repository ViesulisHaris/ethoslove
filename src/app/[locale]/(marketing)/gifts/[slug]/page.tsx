import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug } from "@/content/recipients";
import { getManifest } from "@/templates/manifests";
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
  const ideas = guide.ideas.flatMap((idea) => {
    const manifest = getManifest(idea.template);
    return manifest ? [{ ...idea, manifest }] : [];
  });
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

      <ol className="container-x grid gap-x-12 border-t border-line pb-16 lg:grid-cols-2">
        {ideas.map((idea, i) => (
          <li key={idea.template} className="flex gap-5 border-b border-line py-7">
            <Link href={`/templates/${idea.template}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
              <Image
                src={idea.manifest.thumbnail.poster}
                alt=""
                width={96}
                height={148}
                sizes="96px"
                className="h-[148px] w-24 rounded-xl bg-muted object-cover"
              />
            </Link>
            <div className="min-w-0">
              <p className="text-mono-meta text-muted-foreground">
                {String(i + 1).padStart(2, "0")} · {idea.manifest.name[l]}
                {idea.manifest.tier === "free" ? ` · ${t("free")}` : null}
              </p>
              <h2 className="mt-2 font-display text-2xl leading-tight">
                <Link href={`/templates/${idea.template}`} className="transition-colors hover:text-coral">
                  {idea.heading}
                </Link>
              </h2>
              <p className="mt-2.5 leading-relaxed text-ink-soft">{idea.body}</p>
              <Link
                href={`/create/${idea.template}`}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-coral underline-offset-4 hover:underline"
              >
                {t("make")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </li>
        ))}
      </ol>

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
