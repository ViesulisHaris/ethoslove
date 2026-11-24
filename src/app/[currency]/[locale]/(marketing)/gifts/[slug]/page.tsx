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
import { handLine, kindCardLine, kindIdeaIsFree, openingLine } from "@/content/idea-cards";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientFromSlug, recipientSlug, type Recipient } from "@/content/recipients";
import { getManifest } from "@/templates/manifests";
import { DEMO_PHOTOS } from "@/templates/_shared/demo-photos";
import { sendsFree } from "@/lib/gift/free-tier";
import { occasionsInSeason } from "@/lib/gift/finder";
import { ChristmasGifts, hasChristmasGifts } from "@/components/marketing/christmas-gifts";
import { withManifests } from "@/components/marketing/gift-idea-list";
import { CARDS_ART } from "@/components/marketing/spread/placements";
import { HeroTag, IdeaCards, MoreRow, QuestionsSpread, SITE_FLOWERS, SiteHero, SitePage, Spread, WhereNext, type IdeaCard } from "@/components/marketing/spread/sections";
import { JsonLd } from "@/components/shared/json-ld";
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
  return (
    // The phone in the hero plays a gift, and its buttons are a client component's (src/i18n/client-namespaces.ts).
    <ClientMessages scope="(marketing)/gifts/[slug]/page" locale={locale}>
      {"recipient" in page ? (
        <RecipientPage recipient={page.recipient} locale={locale as GiftLocale} currency={chargedCurrency(currency)} />
      ) : (
        <KindPage kind={page.kind} locale={locale as GiftLocale} currency={chargedCurrency(currency)} />
      )}
    </ClientMessages>
  );
}

/** The photo on the band's phone of a page by person: the café table, which no page by kind has on its own band. */
const RECIPIENT_BAND_PHOTO = { src: DEMO_PHOTOS.p1.url, width: DEMO_PHOTOS.p1.width, height: DEMO_PHOTOS.p1.height } as const;

/** The first sentence of a page's opening: the hero's one line. The whole opening is kept under "More about". */
const firstSentence = (text: string) => text.trim().split(/(?<=[.!?])\s+/)[0] ?? text;

/**
 * Gift ideas for one person, laid out as the gift pages by kind are (DESIGN-LESS-TEXT.md): the hero
 * with the first idea's gift playing in the phone, the Christmas row in season, the ideas as picture
 * cards that open to their first line and the idea in full, what to write and when to send it as
 * closed rows in the band, the questions, and the other people, the occasions and the kinds as the
 * quiet row the kind pages end on. What the numbered list printed as paragraphs is all still in the
 * HTML, in closed <details>: every idea in full inside its card, the two how-tos, the answers, and
 * the page's opening under "More about".
 */
async function RecipientPage({ recipient, locale, currency }: { recipient: Recipient; locale: GiftLocale; currency: Currency }) {
  const t = await getTranslations("recipients");
  const tOccasions = await getTranslations("occasions");
  const slug = recipientSlug(recipient);
  const guide = RECIPIENT_GUIDES[recipient][locale];
  const ideas = withManifests(guide.ideas);
  const url = localizedUrl(locale, `/gifts/${slug}`);
  const ref = `gifts-${slug}`;
  const christmas = hasChristmasGifts(recipient) && occasionsInSeason(new Date().toISOString().slice(0, 10)).includes("christmas") ? recipient : null;
  const lead = ideas[0].manifest;
  const leadCost = templateOfferAmount(lead, currency);
  const cards: IdeaCard[] = ideas.map((idea) => ({
    manifest: idea.manifest,
    title: idea.heading,
    line: openingLine(idea.body) ?? "",
    full: idea.body,
    // The same address the numbered list's "Make this gift" had.
    make: `/create/${idea.template}`,
    free: sendsFree(idea.manifest),
  }));
  // Where next: four pages by kind as posters; the other people, the occasions and the rest of the kinds by name.
  const kinds = GIFT_GUIDE_SLUGS.flatMap((s) => {
    const manifest = leadGift(s);
    return manifest ? [{ href: `/gifts/${s}`, label: GIFT_GUIDES[s][locale].label, manifest }] : [];
  });
  const links = [
    ...RECIPIENTS.filter((r) => r !== recipient).map((r) => ({ href: `/gifts/${recipientSlug(r)}`, label: RECIPIENT_GUIDES[r][locale].label })),
    { href: "/occasions", label: t("occasions") },
    ...kinds.slice(4).map(({ href, label }) => ({ href, label })),
  ];

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
        <div data-testid="gift-person-page">
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
            line={firstSentence(guide.lead)}
            note={
              <span data-testid="hero-note">
                {leadCost > 0 ? t("inPhone", { name: lead.name[locale], price: formatAmount(leadCost, currency, locale) }) : t("inPhoneFree", { name: lead.name[locale] })}
              </span>
            }
          >
            <Link href={`/create/${lead.slug}?ref=${ref}`} data-testid="hero-make" aria-label={`${t("makeLead")}: ${lead.name[locale]}`} className={HERO_BUTTON}>
              {t("makeLead")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </SiteHero>

          {/* In season: four Christmas gifts for this person, as pictures, before the ideas (components/marketing/christmas-gifts.tsx). */}
          {christmas ? <ChristmasGifts recipient={christmas} locale={locale} className="pt-4 pb-14 sm:pb-20" /> : null}

          <Spread id="person-ideas" label={t("ideasLabel")} heading={t("ideasTag", { count: ideas.length })} line={tOccasions("ideasLine")} art={christmas ? CARDS_ART.filter((piece) => piece.art !== "lily-stem-tall") : CARDS_ART} className="pt-4 pb-16 sm:pb-20 lg:pt-6 lg:pb-32">
            <IdeaCards id={`ideas-${slug}`} cards={cards} locale={locale} labels={{ make: t("make"), free: t("free"), full: t("ideaInFull"), page: t("giftPage") }} />
          </Spread>

          <Band labelledBy="person-guide" picture={<ExperienceFlatlay flowers={SITE_FLOWERS} photo={RECIPIENT_BAND_PHOTO} />}>
            <p className="text-page-label text-page-body">{t("craftLabel")}</p>
            <h2 id="person-guide" className="mt-4 display-xl text-balance text-page-ink">
              {t("guideTitle")}
            </h2>
            {/* What to write and when to send it, closed: each opens in place, one at a time. */}
            <div className="mt-7 border-t border-page-line">
              {guide.sections.map((section) => (
                <QuestionRow key={section.heading} q={section.heading} a={section.body} name={`guide-${recipient}`} />
              ))}
            </div>
          </Band>

          <QuestionsSpread id="person-questions" name={`faq-${recipient}`} label={t("faqLabel")} heading={t("faqTitle")} line={t("faqLine")} faq={guide.faq} className="pt-16 pb-20 sm:pt-20 lg:pt-28 lg:pb-60">
            <MoreRow summary={t("moreAbout")}>
              <p>{guide.lead}</p>
            </MoreRow>
          </QuestionsSpread>

          <WhereNext id="person-next" label={t("more")} heading={t("byKind")} posters={kinds.slice(0, 4)} locale={locale} navLabel={t("more")} links={links} />
        </div>
      </SitePage>
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
