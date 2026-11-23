import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata, templateOfferAmount } from "@/lib/seo";
import { chargedCurrency, formatAmount, type Currency } from "@/lib/pricing/products";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, guideBandPhoto, isGiftGuide, type GiftGuideSlug } from "@/content/gift-guides";
import { handLine, kindCardLine, kindIdeaIsFree } from "@/content/idea-cards";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug, type Recipient } from "@/content/recipients";
import { getManifest } from "@/templates/manifests";
import { CHIP } from "@/components/marketing/chip";
import { occasionsInSeason } from "@/lib/gift/finder";
import { ChristmasGifts, hasChristmasGifts } from "@/components/marketing/christmas-gifts";
import { GiftIdeaList, withManifests } from "@/components/marketing/gift-idea-list";
import { CARDS_ART } from "@/components/marketing/spread/placements";
import { HeroTag, IdeaCards, MoreRow, QuestionsSpread, SITE_FLOWERS, SiteHero, SitePage, Spread, WhereNext, type IdeaCard } from "@/components/marketing/spread/sections";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { PageHeader } from "@/components/shared/page-header";
import { HERO_BUTTON } from "@/components/templates/page/hero-art";
import { Band, ExperienceFlatlay, QuestionRow } from "@/components/templates/page/sections";

/** One address, two kinds of page: /gifts/for-<who> (content/recipients.ts) and /gifts/<kind> (content/gift-guides.ts). */
function pageFor(slug: string): { recipient: Recipient } | { kind: GiftGuideSlug } | null {
  const recipient = recipientFromSlug(slug);
  if (recipient) return { recipient };
  return isGiftGuide(slug) ? { kind: slug } : null;
}

/**
 * A boyfriend's and a girlfriend's page carry a row of Christmas gifts while Christmas is in season
 * (15 Nov to 25 Dec, by the day the page is rendered with). The pages are static, so they are
 * rendered again every hour: the row comes and goes by itself, without a deploy.
 */
export const revalidate = 3600;

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
  const { currency, locale, slug } = await params;
  const page = pageFor(slug);
  if (!page) notFound();
  setRequestLocale(locale);
  if ("recipient" in page) return <RecipientPage recipient={page.recipient} locale={locale as GiftLocale} />;
  return (
    // The phone in the hero plays a gift, and its buttons are a client component's (src/i18n/client-namespaces.ts).
    <ClientMessages scope="(marketing)/gifts/[slug]/page" locale={locale}>
      <KindPage kind={page.kind} locale={locale as GiftLocale} currency={chargedCurrency(currency)} />
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
  const christmas = hasChristmasGifts(recipient) && occasionsInSeason(new Date().toISOString().slice(0, 10)).includes("christmas") ? recipient : null;

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

      {/* In season: four Christmas gifts for this person, as pictures, before the list (components/marketing/christmas-gifts.tsx). */}
      {christmas ? <ChristmasGifts recipient={christmas} locale={locale} className="pb-14 sm:pb-20" /> : null}

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
 * line to borrow, the page's three how-tos as closed rows in the deeper band, the questions, and
 * the neighbouring pages as posters. What the first version printed as paragraphs is still in the
 * HTML, in closed <details>: each idea in full inside its card, the three how-tos, the answers, and
 * the opening under "More about".
 */
async function KindPage({ kind, locale, currency }: { kind: GiftGuideSlug; locale: GiftLocale; currency: Currency }) {
  const t = await getTranslations("recipients");
  const guide = GIFT_GUIDES[kind][locale];
  const ideas = withManifests(guide.ideas);
  const url = localizedUrl(locale, `/gifts/${kind}`);
  const ref = `gifts-${kind}`;
  const lead = leadGift(kind) ?? ideas[0].manifest;
  // What the gift in the phone costs to send, as its own page says it (lib/seo.ts): the button beside it opens that gift's
  // editor, and a page that named no price let a stranger build a paid gift and meet the price at Publish.
  const leadCost = templateOfferAmount(lead, currency);
  const cards: IdeaCard[] = ideas.map((idea) => ({
    manifest: idea.manifest,
    title: idea.heading,
    line: kindCardLine(idea),
    borrow: { where: idea.line.where, text: handLine(idea.line.text), whole: idea.line.text },
    full: idea.body,
    make: `/create/${idea.template}?ref=${ref}`,
    // "Free" is said of the idea, not the template: a Letter with a video clip in it is not the free note.
    free: kindIdeaIsFree(idea, idea.manifest),
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
            note={
              <span data-testid="hero-note">
                {leadCost > 0 ? t("inPhone", { name: lead.name[locale], price: formatAmount(leadCost, currency, locale) }) : t("inPhoneFree", { name: lead.name[locale] })}
              </span>
            }
          >
            {/* The page lists several gifts: the button opens the one playing in the phone, which the note under it names.
                The name in the button read badly ("Hacer Ramo", "Make Bouquet", the deep test of 23 Nov 2026), and "Make this
                gift" on a page of eight did not say which (round 2, C13): so the button points at the phone, the note names
                the gift, and a screen reader hears the name after the button's own words (WCAG 2.5.3). */}
            <Link href={`/create/${lead.slug}?ref=${ref}`} data-testid="hero-make" aria-label={`${t("makeLead")}: ${lead.name[locale]}`} className={HERO_BUTTON}>
              {t("makeLead")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </SiteHero>

          <Spread id="kind-ideas" label={t("ideasLabel")} heading={guide.ideasTitle} line={t("ideasLine")} art={CARDS_ART} className="pt-4 pb-16 sm:pb-20 lg:pt-6 lg:pb-32">
            <IdeaCards id={`ideas-${kind}`} cards={cards} locale={locale} labels={{ make: t("make"), watch: t("watch"), free: t("free"), full: t("ideaInFull"), copy: t("copyLine"), copied: t("copiedLine") }} />
          </Spread>

          {/* The polaroid on the band's phone holds this page's own photo, not the one every page had (content/gift-guides.ts). */}
          <Band labelledBy="kind-guide" picture={<ExperienceFlatlay flowers={SITE_FLOWERS} photo={guideBandPhoto(kind)} />}>
            <p className="text-page-label text-page-body">{t("craftLabel")}</p>
            {/* Each page's own heading: what its three how-tos are about (content/gift-guides.ts, `craft`). */}
            <h2 id="kind-guide" className="mt-4 display-xl text-balance text-page-ink">
              {guide.craft}
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
