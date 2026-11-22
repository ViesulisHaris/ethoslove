import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, isGiftGuide, type GiftGuideSlug } from "@/content/gift-guides";
import { handLine, kindCardLine } from "@/content/idea-cards";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug, type Recipient } from "@/content/recipients";
import { sendsFree } from "@/lib/gift/free-tier";
import { getManifest } from "@/templates/manifests";
import { CHIP } from "@/components/marketing/chip";
import { GiftIdeaList, withManifests } from "@/components/marketing/gift-idea-list";
import { CARDS_ART } from "@/components/marketing/spread/placements";
import { HeroTag, IdeaCards, MoreRow, QuestionsSpread, SITE_FLOWERS, SiteHero, SitePage, Spread, WhereNext, type IdeaCard } from "@/components/marketing/spread/sections";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { PageHeader } from "@/components/shared/page-header";
import { HERO_BUTTON } from "@/components/templates/page/hero-art";
import { Band, ExperienceFlatlay, QuestionRow, templateSamples } from "@/components/templates/page/sections";

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
  if ("recipient" in page) return <RecipientPage recipient={page.recipient} locale={locale as GiftLocale} />;
  return (
    // The phone in the hero plays a gift, and its buttons are a client component's (src/i18n/client-namespaces.ts).
    <ClientMessages scope="(marketing)/gifts/[slug]/page" locale={locale}>
      <KindPage kind={page.kind} locale={locale as GiftLocale} />
    </ClientMessages>
  );
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

/** The gift a page by kind leads with: the one whose film plays in its hero, and whose poster stands for the page elsewhere. */
function leadGift(kind: GiftGuideSlug) {
  const guide = GIFT_GUIDES[kind].en;
  return getManifest(guide.film ?? guide.ideas[0].template);
}

/**
 * Gift ideas of one kind (a format, or a situation), laid out as a gift's own page is
 * (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "built from the gift page"): the hero with the
 * film of the gift the page leads with, the ideas as picture cards that open to one line and a
 * line to borrow, how to make it land as three closed rows in the deeper band, the questions, and
 * the neighbouring pages as posters. What the first version printed as paragraphs is still in the
 * HTML, in closed <details>: the three how-tos, the answers, and the opening under "More about".
 */
async function KindPage({ kind, locale }: { kind: GiftGuideSlug; locale: GiftLocale }) {
  const t = await getTranslations("recipients");
  const tt = await getTranslations("templates");
  const guide = GIFT_GUIDES[kind][locale];
  const ideas = withManifests(guide.ideas);
  const url = localizedUrl(locale, `/gifts/${kind}`);
  const ref = `gifts-${kind}`;
  const lead = leadGift(kind) ?? ideas[0].manifest;
  const samples = await templateSamples(lead.slug, locale, null);
  const cards: IdeaCard[] = ideas.map((idea) => ({
    manifest: idea.manifest,
    title: idea.heading,
    line: kindCardLine(idea),
    borrow: { where: idea.line.where, text: handLine(idea.line.text) },
    make: `/create/${idea.template}?ref=${ref}`,
    free: sendsFree(idea.manifest),
  }));
  // The other kinds, counted on from this page's own place and round to the start: four as posters, the fifth by name,
  // then the pages that answer the searches next to this one. The pages by person are in the site's footer, a few lines down.
  const at = GIFT_GUIDE_SLUGS.indexOf(kind);
  const others = [...GIFT_GUIDE_SLUGS.slice(at + 1), ...GIFT_GUIDE_SLUGS.slice(0, at)].flatMap((slug) => {
    const manifest = leadGift(slug);
    return manifest ? [{ href: `/gifts/${slug}`, label: GIFT_GUIDES[slug][locale].label, manifest }] : [];
  });
  const posters = others.slice(0, 4);
  const shown = new Set(posters.map((page) => page.href));
  const links = [
    ...others.slice(4).map(({ href, label }) => ({ href, label })),
    ...guide.related,
  ].filter((link, i, all) => !shown.has(link.href) && all.findIndex((other) => other.href === link.href) === i);

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
      <SitePage name={ref}>
        <div data-testid="gift-kind-page">
          <SiteHero
            manifest={lead}
            locale={locale}
            tags={
              <>
                <HeroTag strong>{t("eyebrow")}</HeroTag>
                <HeroTag>{t("ideasTag", { count: ideas.length })}</HeroTag>
              </>
            }
            heading={guide.h1}
            line={guide.hero.line}
            sentence={guide.hero.sentence}
            note={t("inPhone", { name: lead.name[locale] })}
          >
            <Link href={`/create/${lead.slug}?ref=${ref}`} data-testid="hero-make" className={HERO_BUTTON}>
              {tt("makeThis")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </SiteHero>

          <Spread id="kind-ideas" label={t("ideasLabel")} heading={guide.ideasTitle} line={t("ideasLine")} art={CARDS_ART} className="pt-4 pb-16 sm:pb-20 lg:pt-6 lg:pb-32">
            <IdeaCards id={`ideas-${kind}`} cards={cards} locale={locale} labels={{ make: t("make"), watch: t("watch"), watchNamed: (name) => t("watchNamed", { name }), free: t("free") }} />
          </Spread>

          <Band labelledBy="kind-guide" picture={<ExperienceFlatlay flowers={SITE_FLOWERS} photo={samples.photo} />}>
            <p className="text-page-label text-page-body">{t("craftLabel")}</p>
            <h2 id="kind-guide" className="mt-4 display-xl text-balance text-page-ink">
              {t("guideTitle")}
            </h2>
            {/* The three how-tos, closed: each opens in place, one at a time. */}
            <div className="mt-7 border-t border-page-line">
              {guide.sections.map((section) => (
                <QuestionRow key={section.heading} q={section.heading} a={section.body} name={`guide-${kind}`} />
              ))}
            </div>
          </Band>

          <QuestionsSpread id="kind-questions" name={`faq-${kind}`} label={t("faqLabel")} heading={t("faqTitle")} line={t("faqLine")} faq={guide.faq}>
            <MoreRow summary={t("moreAbout")}>
              {guide.lead.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </MoreRow>
          </QuestionsSpread>

          <WhereNext id="kind-next" label={t("nextLabel")} heading={t("byKind")} posters={posters} locale={locale} navLabel={t("readNext")} links={links} />
        </div>
      </SitePage>
    </>
  );
}
