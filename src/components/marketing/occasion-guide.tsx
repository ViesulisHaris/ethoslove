import { getTranslations } from "next-intl/server";
import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import { OCCASION_GUIDES } from "@/content/occasions";
import { GIFT_GUIDES, GUIDES_FOR_OCCASION } from "@/content/gift-guides";
import { occasionCardLine, occasionSample, sampleHand } from "@/content/idea-cards";
import { sendsFree } from "@/lib/gift/free-tier";
import { Link } from "@/i18n/navigation";
import { withManifests } from "@/components/marketing/gift-idea-list";
import { GUIDE_ART, LIST_ART } from "@/components/marketing/spread/placements";
import { IdeaCards, MoreRow, QUIET_LINK, QuestionsSpread, Spread, type IdeaCard } from "@/components/marketing/spread/sections";
import { QuestionRow, fieldLabels } from "@/components/templates/page/sections";

/**
 * An occasion's ideas, as picture cards (docs/marketing/growth-build/DESIGN-LESS-TEXT.md): each a
 * gift's poster and the idea's title, opening to one line and, where the list records which field
 * its samples are for, one of them in handwriting under that field's name. What was a paragraph
 * for every idea is now that one line, and the paragraph itself is a closed row inside the opened
 * card: four of these lists are live and found by search today, and their words stay in the HTML.
 */
export async function OccasionIdeas({ occasion, locale }: { occasion: Occasion; locale: GiftLocale }) {
  const ideas = OCCASION_GUIDES[occasion][locale].ideas;
  if (!ideas) return null;
  const t = await getTranslations();
  // The fields every gift has, by the names the editor gives them; a template's own come from its field-meta.
  const shared: Record<string, string> = { caption: t("editor.photos.caption"), message: t("editor.fields.message"), freeNote: t("editor.fields.message") };
  const cards: IdeaCard[] = await Promise.all(
    withManifests(ideas.items).map(async (idea) => {
      const sample = occasionSample(occasion, idea, locale);
      const where = sample ? (shared[sample.field] ?? (await fieldLabels(idea.template, locale))[sample.field] ?? t("recipients.borrowLabel")) : "";
      return {
        manifest: idea.manifest,
        title: idea.heading,
        line: occasionCardLine(idea),
        borrow: sample ? { where, text: sampleHand(sample), whole: sample.rows.length > 1 ? undefined : sample.text } : undefined,
        full: idea.body,
        make: `/create/${idea.template}`,
        // Every Letter idea of these lists is the free note (tests/unit/occasion-guides.test.ts holds each to saying so).
        free: sendsFree(idea.manifest),
      };
    }),
  );
  return (
    <Spread id={`ideas-${occasion}`} label={t("occasions.ideasLabel")} heading={ideas.title} line={t("occasions.ideasLine")} art={LIST_ART} className="pt-16 pb-6 sm:pt-20 lg:pt-24 lg:pb-10">
      {/* The compact cards: the gallery right above shows these gifts' posters, so no picture is shown twice (pages-C3). */}
      <IdeaCards
        id={`idea-cards-${occasion}`}
        cards={cards}
        locale={locale}
        poster={false}
        labels={{ make: t("recipients.make"), watch: t("recipients.watch"), free: t("recipients.free"), full: t("recipients.ideaInFull"), copy: t("recipients.copyLine"), copied: t("recipients.copiedLine") }}
      />
    </Spread>
  );
}

/**
 * The part of an occasion page that answers "how do I make one for this day": what to write,
 * what to add, when to send it, and the questions people bring. Every one of them is a closed row
 * that opens in place, with its words in the HTML; the guide's opening is the last row. Below the
 * templates and the ideas, where the person who has scrolled past the cards without choosing is
 * the one reading.
 */
export async function OccasionGuide({ occasion, locale }: { occasion: Occasion; locale: GiftLocale }) {
  const t = await getTranslations("occasions");
  const guide = OCCASION_GUIDES[occasion][locale];
  const kinds = GUIDES_FOR_OCCASION[occasion] ?? [];
  const tKinds = await getTranslations("recipients");
  return (
    <QuestionsSpread
      id={`guide-${occasion}`}
      name={`faq-${occasion}`}
      label={t("guideEyebrow")}
      heading={guide.title}
      line={t("guideLine")}
      faq={guide.faq}
      art={GUIDE_ART}
      className="pt-14 pb-20 sm:pt-16 lg:pt-20 lg:pb-28"
      before={guide.sections.map((section) => (
        <QuestionRow key={section.heading} q={section.heading} a={section.body} name={`faq-${occasion}`} />
      ))}
    >
      <MoreRow summary={tKinds("moreAbout")}>
        <p>{guide.lead}</p>
      </MoreRow>
      {kinds.length > 0 ? (
        <nav aria-label={tKinds("byKind")}>
          <ul className="flex flex-wrap gap-x-7 pt-3">
            {kinds.map((slug) => (
              <li key={slug}>
                <Link href={`/gifts/${slug}`} className={QUIET_LINK}>
                  {GIFT_GUIDES[slug][locale].label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </QuestionsSpread>
  );
}
