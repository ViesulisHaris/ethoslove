import { DATE_KIND_UI } from "@/content/date-kinds";
import { CHEAP_FREE, kindIdeas, type DateKind } from "@/lib/dates/date-kinds";
import type { DateIdea } from "@/lib/dates/ideas";
import { DateSpread } from "./date-page";
import { DateIdeaCards, type DateCard, type DateCardLabels } from "./idea-cards";

/**
 * A kind's ideas as picture cards, in the kind's own order: one section, or for `cheap` two (the
 * four that can cost nothing, "Free date ideas", then the four for pocket change). Shared by the
 * page by kind and the city-by-kind pages, which differ only in what a card holds.
 */
export function KindIdeas({ kind, locale, card, labels }: { kind: DateKind; locale: "en" | "es"; card: (idea: DateIdea, index: number) => DateCard; labels: DateCardLabels }) {
  const ui = DATE_KIND_UI[locale];
  const ideas = kindIdeas(kind);
  const cards = ideas.map(card);
  if (kind === "cheap") {
    const free = cards.filter((c) => CHEAP_FREE.includes(c.idea.id));
    const paid = cards.filter((c) => !CHEAP_FREE.includes(c.idea.id));
    return (
      <>
        <DateSpread id="free-title" sectionId="free" label={ui.freeLabel} heading={ui.freeHeading} line={ui.freeLine}>
          <DateIdeaCards id="ideas-cheap-free" cards={free} locale={locale} labels={labels} />
        </DateSpread>
        <DateSpread id="pocket-change-title" sectionId="pocket-change" label={ui.paidLabel} heading={ui.paidHeading} line={ui.paidLine}>
          <DateIdeaCards id="ideas-cheap-paid" cards={paid} locale={locale} labels={labels} />
        </DateSpread>
      </>
    );
  }
  return (
    <DateSpread id="ideas-title" label={ui.ideasLabel} heading={ui.ideasHeading.replace("{count}", String(cards.length))} line={ui.ideasLine}>
      <DateIdeaCards id={`ideas-${kind}`} cards={cards} locale={locale} labels={labels} />
    </DateSpread>
  );
}
