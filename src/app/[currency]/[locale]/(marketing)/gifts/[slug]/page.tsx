import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, isGiftGuide, type GiftGuideSlug } from "@/content/gift-guides";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug, type Recipient } from "@/content/recipients";
import { CHIP } from "@/components/marketing/chip";
import { GiftIdeaList, withManifests } from "@/components/marketing/gift-idea-list";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { PageHeader } from "@/components/shared/page-header";

/** One address, two kinds of page: /gifts/for-<who> (content/recipients.ts) and /gifts/<kind> (content/gift-guides.ts). */
function pageFor(slug: string): { recipient: Recipient } | { kind: GiftGuideSlug } | null {
  const recipient = recipientFromSlug(slug);
  if (recipient) return { recipient };
  return isGiftGuide(slug) ? { kind: slug } : null;
}

export function generateStaticParams() {
  return [...RECIPIENTS.map((r) => ({ slug: recipientSlug(r) })), ...GIFT_GUIDE_SLUGS.map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/gifts/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = pageFor(slug);
  if (!page) return {};
  const guide = "recipient" in page ? RECIPIENT_GUIDES[page.recipient][locale as GiftLocale] : GIFT_GUIDES[page.kind][locale as GiftLocale];
  return pageMetadata({ locale, path: `/gifts/${slug}`, title: guide.title, description: guide.description });
}

export default async function GiftIdeasPage({ params }: PageProps<"/[currency]/[locale]/gifts/[slug]">) {
  const { locale, slug } = await params;
  const page = pageFor(slug);
  if (!page) notFound();
  setRequestLocale(locale);
  return "recipient" in page ? <RecipientPage recipient={page.recipient} locale={locale as GiftLocale} /> : <KindPage kind={page.kind} locale={locale as GiftLocale} />;
}

/** The gift pages by kind, as chips: on every /gifts/<slug> page, so each of them is one tap from the others. */
async function KindLinks({ locale, except }: { locale: GiftLocale; except?: GiftGuideSlug }) {
  const t = await getTranslations("recipients");
  return (
    <>
      <h2 id="by-kind" className="text-eyebrow text-ink-soft">
        {t("byKind")}
      </h2>
      <ul className="mt-5 flex flex-wrap gap-2">
        {GIFT_GUIDE_SLUGS.filter((s) => s !== except).map((s) => (
          <li key={s}>
            <Link href={`/gifts/${s}`} className={CHIP}>
              {GIFT_GUIDES[s][locale].label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The gift pages by person, as chips, with the occasions after them. */
async function PersonLinks({ locale, except, heading }: { locale: GiftLocale; except?: Recipient; heading: string }) {
  const t = await getTranslations("recipients");
  return (
    <>
      <h2 id="more-people" className="text-eyebrow text-ink-soft">
        {heading}
      </h2>
      <ul className="mt-5 flex flex-wrap gap-2">
        {RECIPIENTS.filter((r) => r !== except).map((r) => (
          <li key={r}>
            <Link href={`/gifts/${recipientSlug(r)}`} className={CHIP}>
              {RECIPIENT_GUIDES[r][locale].label}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/occasions" className={CHIP}>
            {t("occasions")}
          </Link>
        </li>
      </ul>
    </>
  );
}

/**
 * Gift ideas for one person: a numbered list where every idea is a template, then what to write,
 * when to send it and the questions people ask. The other people, the occasions and the pages by
 * kind at the foot.
 */
async function RecipientPage({ recipient, locale }: { recipient: Recipient; locale: GiftLocale }) {
  const t = await getTranslations("recipients");
  const slug = recipientSlug(recipient);
  const guide = RECIPIENT_GUIDES[recipient][locale];
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

      <GiftIdeaList ideas={ideas} locale={locale} heading="h2" className="container-x border-t border-line pb-16" />

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

      <div className="container-x border-t border-line pt-10 pb-24">
        <nav aria-labelledby="more-people">
          <PersonLinks locale={locale} except={recipient} heading={t("more")} />
        </nav>
        <nav className="mt-10" aria-labelledby="by-kind">
          <KindLinks locale={locale} />
        </nav>
      </div>
    </>
  );
}

/**
 * Gift ideas of one kind (a format, or a situation): an opening that says what the thing is and
 * what it isn't, the ideas with a line to borrow and a way to watch each one play, how to make it
 * land, the questions, and the pages that answer the searches next to this one.
 */
async function KindPage({ kind, locale }: { kind: GiftGuideSlug; locale: GiftLocale }) {
  const t = await getTranslations("recipients");
  const guide = GIFT_GUIDES[kind][locale];
  const ideas = withManifests(guide.ideas);
  const url = localizedUrl(locale, `/gifts/${kind}`);

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
      <header className="container-x pt-12 pb-10 sm:pt-16 sm:pb-12" data-testid="gift-kind-page">
        <p className="text-eyebrow mb-5 text-ink-soft">{t("eyebrow")}</p>
        <h1 className="display-xl max-w-3xl">{guide.h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">{guide.lead[0]}</p>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{guide.lead[1]}</p>
      </header>

      <GiftIdeaList ideas={ideas} locale={locale} heading="h2" watch source={`gifts-${kind}`} className="container-x border-t border-line pb-16" />

      <section className="container-narrow pb-16" aria-labelledby="kind-guide">
        <h2 id="kind-guide" className="sr-only">
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
        <FaqList items={guide.faq} name={`faq-${kind}`} />

        <nav className="mt-14" aria-labelledby="read-next">
          <h2 id="read-next" className="display-md">
            {t("readNext")}
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {guide.related.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex min-h-12 items-center justify-between gap-4 py-3 font-medium outline-none transition-colors hover:text-coral focus-visible:ring-3 focus-visible:ring-ring/50 active:text-coral-deep"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-coral motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <div className="container-x border-t border-line pt-10 pb-24">
        <nav aria-labelledby="by-kind">
          <KindLinks locale={locale} except={kind} />
        </nav>
        <nav className="mt-10" aria-labelledby="more-people">
          <PersonLinks locale={locale} heading={t("byPerson")} />
        </nav>
      </div>
    </>
  );
}
