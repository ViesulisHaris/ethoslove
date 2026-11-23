import type { Metadata } from "next";
import { ArrowRight, Play } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import { OCCASIONS } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import { appNode, faqNode, localizedUrl, organizationNode, pageMetadata } from "@/lib/seo";
import { PRODUCTS, chargedCurrency, formatAmount, giftCardsOnSale, subscriptionsEnabled, templateProduct } from "@/lib/pricing/products";
import { stripeReady } from "@/lib/stripe/server";
import { DIGITAL_CARDS_PATH } from "@/content/digital-cards";
import { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS } from "@/content/digital-gifts";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS } from "@/content/gift-guides";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { templateSeo } from "@/content/template-seo";
import { getManifest, listManifests } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { pricingFaq, type FaqItem } from "@/components/pricing/offers";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { Openings } from "@/components/marketing/home/openings";
import { ProofLine, Reactions } from "@/components/marketing/home/reactions";
import { FinalCta } from "@/components/marketing/home/final-cta";
import { TornEdge } from "@/components/marketing/home/cutouts";
import { CARDS_ART, LIST_ART, STEPS_ART } from "@/components/marketing/spread/placements";
import { IdeaCards, MoreRow, QUIET_LINK, QuestionsSpread, SiteHero, SitePage, Spread, WhereNext, type IdeaCard } from "@/components/marketing/spread/sections";
import { HERO_BUTTON } from "@/components/templates/page/hero-art";
import { POSTER_ROW, GiftPosterLink, QuestionRow } from "@/components/templates/page/sections";
import { proofNumbers, shownReactions } from "@/lib/proof/proof";
import { noteForEveryone, sendsFree } from "@/lib/gift/free-tier";

/** The proof in the reactions section is read from the database: the page is drawn again hourly to keep it current. */
export const revalidate = 3600;

/** The gift whose film plays in the hero's phone: the one the page's hero always showed. */
const HERO_GIFT = "bouquet";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/gifts">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/gifts", title: t("giftsTitle"), description: t(noteForEveryone() ? "giftsDescriptionShort" : "giftsDescription"), absoluteTitle: true });
}

/**
 * Gifts: what was the whole site's front page before Dates arrived, and the page meant to be found
 * for "digital gift". Laid out as the gift pages by kind are (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md): the hero with a gift playing in the phone, the thirty ideas as picture cards
 * in the groups they had, the covers, the three steps, the occasions, the questions and where to go
 * next. Everything the long page printed is still in the HTML, in closed <details>: each idea's line
 * inside its card, every template with its line, price and links under "the collection", the steps
 * in full, the prices, what a digital gift is, and the hero's four facts.
 */
export default async function GiftsPage({ params }: PageProps<"/[currency]/[locale]/gifts">) {
  const { currency, locale } = await params;
  setRequestLocale(locale);
  const l = locale as GiftLocale;
  const t = await getTranslations();
  const charged = chargedCurrency(currency);
  // Real reactions in this page's language, only when there are enough for the row (three); fewer stay
  // unseen, another language's are never borrowed, and nothing made up stands in for them.
  const [numbers, reactions] = await Promise.all([proofNumbers(), shownReactions(3, l === "es" ? "es" : "en")]);
  const real = reactions.length >= 3 ? reactions : [];
  const plans = {
    free: t("common.free"),
    single: t("pricing.plans.single.name"),
    pick3: t("pricing.plans.pick3.name"),
    everything: t("pricing.plans.everything.name"),
  };
  const guide = DIGITAL_GIFT_GUIDE[l];
  const manifests = listManifests();
  const hero = getManifest(HERO_GIFT) ?? manifests[0];
  const ideaLabels = { make: t("recipients.make"), watch: t("recipients.watch"), free: t("recipients.free"), page: t("recipients.giftPage") };
  const groups = guide.groups.map((group) => ({
    title: group.title,
    cards: group.templates.flatMap((slug): IdeaCard[] => {
      const manifest = getManifest(slug);
      if (!manifest) return [];
      return [{ manifest, title: templateSeo(slug, l)?.keyword ?? manifest.name[l], line: manifest.tagline[l], make: `/create/${slug}`, free: sendsFree(manifest) }];
    }),
  }));
  const steps = t.raw("home.how.steps") as { title: string; body: string }[];
  // What a digital gift is, asked in the list; the pricing page's own questions, which are that page's, in one closed row under it.
  const pricingQuestions = pricingFaq(t.raw("pricing.faq") as FaqItem[], { giftCards: giftCardsOnSale(), subscriptions: subscriptionsEnabled() });
  const free = manifests.filter((m) => sendsFree(m)).length;
  // Where next: four pages by kind as posters; the people, the occasions, the other kinds and what a digital card is by name.
  const kinds = GIFT_GUIDE_SLUGS.flatMap((slug) => {
    const manifest = getManifest(GIFT_GUIDES[slug].en.film ?? GIFT_GUIDES[slug].en.ideas[0].template);
    return manifest ? [{ href: `/gifts/${slug}`, label: GIFT_GUIDES[slug][l].label, manifest }] : [];
  });
  const links = [
    ...RECIPIENTS.map((r) => ({ href: `/gifts/${recipientSlug(r)}`, label: RECIPIENT_GUIDES[r][l].label })),
    { href: "/occasions", label: t("recipients.occasions") },
    ...kinds.slice(4).map(({ href, label }) => ({ href, label })),
    { href: DIGITAL_CARDS_PATH, label: guide.cards },
  ];

  return (
    <ClientMessages scope="(marketing)/gifts/page" locale={locale}>
      <JsonLd
        nodes={[
          organizationNode(),
          appNode(locale as Locale, charged, t("meta.description"), plans),
          {
            "@type": "ItemList",
            name: guide.ideasTitle,
            itemListElement: DIGITAL_GIFT_IDEAS.map((slug, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: templateSeo(slug, l)?.keyword ?? slug,
              url: localizedUrl(locale, `/templates/${slug}`),
            })),
          },
          faqNode(guide.faq),
        ]}
      />
      <SitePage name="gifts">
        <div data-testid="gifts-hub">
          {/* The eyebrow is the h1's first line: "Digital gifts" is what this page is found by. */}
          <SiteHero
            manifest={hero}
            locale={l}
            label={t("home.hero.eyebrow")}
            heading={`${t("home.hero.h1a")} ${t("home.hero.h1b")} ${t("home.hero.h1c")}`}
            line={t("home.hero.sub")}
            note={
              <>
                {t("home.hero.ctaNote")}
                {numbers && real.length === 0 ? (
                  <>
                    {" "}
                    <ProofLine numbers={numbers} className="inline" />
                  </>
                ) : null}
              </>
            }
          >
            <Link href="/templates" data-testid="hero-make" className={HERO_BUTTON}>
              {t("home.hero.cta")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href={`/demo/${HERO_GIFT}`} className={`${QUIET_LINK} gap-2`}>
              <Play aria-hidden="true" className="size-3.5 fill-current" />
              {t("home.hero.demo")}
            </Link>
          </SiteHero>

          {/* The thirty ideas, in the groups they had: each a picture card that opens to the gift's line and the ways on. */}
          <Spread id="ideas" label={guide.eyebrow} heading={guide.ideasTitle} line={guide.ideasLead} art={CARDS_ART} className="pt-4 pb-16 sm:pb-20 lg:pt-24 lg:pb-28">
            <div className="flex min-w-0 flex-col gap-12">
              {groups.map((group, i) => (
                <div key={group.title} className="min-w-0">
                  <h3 className="mb-5 text-page-label text-page-body">{group.title}</h3>
                  <IdeaCards id={`ideas-${i + 1}`} cards={group.cards} locale={l} labels={ideaLabels} />
                </div>
              ))}
            </div>
          </Spread>

          {/* The whole collection: four posters to look at, and every template, its line, its price and its two links, in one closed row. */}
          <Spread
            id="collection"
            label={t("home.templates.eyebrow")}
            heading={t("home.templates.title")}
            line={t("home.templates.count", { n: manifests.length, free })}
            art={LIST_ART.filter((piece) => piece.art !== "leaf-2")}
            className="pt-4 pb-16 sm:pb-20 lg:pb-24"
            intro={
              <div className="mt-3 flex flex-col items-start">
                <Link href="/templates" className={`${QUIET_LINK} gap-1.5`}>
                  {t("home.templates.all")}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <p className="text-[0.9375rem] text-page-body">
                  {t("templates.finder.ask")}{" "}
                  <Link href="/gifts/finder" className={QUIET_LINK}>
                    {t("templates.finder.link")}
                  </Link>
                </p>
              </div>
            }
          >
            <div className="min-w-0">
              <ul className={POSTER_ROW}>
                {manifests.slice(0, 4).map((m) => (
                  <li key={m.slug}>
                    <GiftPosterLink manifest={m} locale={l} />
                  </li>
                ))}
              </ul>
              <div className="mt-8 border-t border-page-line">
                <MoreRow summary={t("home.templates.all")}>
                  <p>{t("home.templates.blurb")}</p>
                  <ul className="flex flex-col gap-3" data-testid="all-gifts">
                    {manifests.map((m) => (
                      <li key={m.slug}>
                        <Link href={`/templates/${m.slug}`} className="text-page-ink underline decoration-page-line underline-offset-4">
                          {m.name[l]}
                        </Link>
                        {", "}
                        {sendsFree(m) ? t("templates.priceFree") : t("templates.priceOnce", { price: formatAmount(PRODUCTS[templateProduct(m.tier)].amounts[charged], charged, locale) })}
                        {". "}
                        {m.tagline[l]}{" "}
                        <Link href={`/create/${m.slug}`} className="text-page-ink underline decoration-page-line underline-offset-4">
                          {t("templates.makeThis")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </MoreRow>
              </div>
            </div>
          </Spread>

          {/* What comes back: real reactions only, and only with three of them. */}
          {real.length > 0 ? <Reactions real={real} numbers={numbers} /> : null}

          {/* Every cover a gift can open with, each a link to a live demo: the page's one dark band, as it was. */}
          <Openings locale={l} />

          <Spread id="how" label={t("home.how.eyebrow")} heading={t("home.how.title")} art={STEPS_ART} className="pt-16 pb-10 sm:pt-20 lg:pt-24 lg:pb-14">
            <ol className="border-t border-page-line">
              {steps.map((step, i) => (
                <li key={step.title}>
                  <QuestionRow q={`${i + 1}. ${step.title}`} a={step.body} name="how" />
                </li>
              ))}
            </ol>
          </Spread>

          <Spread id="occasions" label={t("home.occasions.eyebrow")} heading={t("home.occasions.title")} line={t("home.occasions.blurb")} className="pt-10 pb-10 lg:pt-14 lg:pb-14">
            <ul className="grid grid-cols-2 gap-x-6 border-t border-page-line pt-3 sm:grid-cols-3">
              {OCCASIONS.map((o) => (
                <li key={o}>
                  <Link href={`/occasions/${o}`} className={`${QUIET_LINK} min-w-11`}>
                    {t(`occasions.${o}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </Spread>

          {/* The questions: what a digital gift is first, then the pricing page's own. Under them, the longer words. */}
          <QuestionsSpread id="questions" name="faq-gifts" label="FAQ" heading={t("pricing.faqTitle")} faq={guide.faq}>
            <MoreRow summary={guide.title}>
              <p>{guide.definition}</p>
              <p>{guide.notACard}</p>
              {/* What the old hero said under its phone, which played the same gift the hero's phone plays now. */}
              <p>{t("home.hero.caption")}</p>
              <ul className="flex flex-col gap-1.5">
                {(["free", "noAccount", "once", "langs"] as const).map((k) => (
                  <li key={k}>
                    <span className="text-page-ink">{t(`home.hero.facts.${k}.a`)}</span> {t(`home.hero.facts.${k}.b`)}
                  </li>
                ))}
              </ul>
            </MoreRow>
            <MoreRow summary={t("pricing.title")}>
              <p>{t("pricing.subtitle")}</p>
              <PricingCards currency={charged} manifests={manifests} authed={false} paymentsEnabled={stripeReady()} />
              <dl className="flex flex-col gap-3">
                {pricingQuestions.map((item) => (
                  <div key={item.q}>
                    <dt className="text-page-ink">{item.q}</dt>
                    <dd>{item.a}</dd>
                  </div>
                ))}
              </dl>
            </MoreRow>
          </QuestionsSpread>

          {/* /digital-cards links to "#by-person": the seven pages by person have no index of their own. */}
          <WhereNext id="by-person" label={guide.byWho} heading={guide.byKind} posters={kinds.slice(0, 4)} locale={l} navLabel={guide.byWho} links={links} />
        </div>
      </SitePage>
      <TornEdge from="var(--brand-paper)" to="var(--brand-forest)" fibre="#4d2139" />
      <FinalCta />
    </ClientMessages>
  );
}
