import { getTranslations } from "next-intl/server";
import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import { OCCASION_GUIDES } from "@/content/occasions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/**
 * The part of an occasion page that answers "how do I make one for this day": what to write,
 * what to add, when to send it, and the questions people bring. Below the templates, where the
 * person who has scrolled past the cards without choosing is the one reading.
 */
export async function OccasionGuide({ occasion, locale }: { occasion: Occasion; locale: GiftLocale }) {
  const t = await getTranslations("occasions");
  const guide = OCCASION_GUIDES[occasion][locale];
  return (
    <section className="container-narrow border-t border-line pt-14 pb-24 sm:pt-16" aria-labelledby={`guide-${occasion}`}>
      <p className="text-eyebrow text-ink-soft">{t("guideEyebrow")}</p>
      <h2 id={`guide-${occasion}`} className="display-md mt-3">
        {guide.title}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">{guide.lead}</p>
      <div className="mt-10 flex flex-col gap-8">
        {guide.sections.map((section) => (
          <div key={section.heading}>
            <h3 className="font-display text-2xl">{section.heading}</h3>
            <p className="mt-2.5 leading-relaxed text-ink-soft">{section.body}</p>
          </div>
        ))}
      </div>
      <h2 className="display-md mt-16 mb-6">{t("faqTitle")}</h2>
      <Accordion type="single" collapsible className="divide-y divide-border border-y border-border">
        {guide.faq.map((item, i) => (
          <AccordionItem key={i} value={`q${i}`} className="border-0">
            <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{item.q}</AccordionTrigger>
            <AccordionContent className="pb-5 text-[15px] leading-relaxed text-ink-soft">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
