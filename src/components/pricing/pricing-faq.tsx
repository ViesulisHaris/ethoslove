import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";
import { QUESTION_PLUS, QUESTION_ROW, QuestionRow } from "@/components/templates/page/sections";
import { Intro } from "@/components/templates/page/spread";
import type { FaqItem } from "./offers";
import { SealMark } from "./seal-mark";

/**
 * The questions, as a gift's page has them (remade 24 Nov 2026): the label, the heading and the
 * support line at the left, the closed rows at the right, a plus on each, every answer in the HTML
 * (native <details>, one open at a time). Gifts, games and paying first, as the page puts gifts
 * first; Ethos for Two's own questions after them, together in one closed row under its seal.
 */
export async function PricingFaq({ faq, before }: { faq: FaqItem[]; /** Closed rows over the questions: the table of free and Ethos for Two. */ before?: ReactNode }) {
  const t = await getTranslations("pricing");
  const forTwo = faq.filter((item) => item.group === "forTwo");
  const rest = faq.filter((item) => item.group !== "forTwo");

  return (
    <section className="relative" aria-labelledby="faq-title">
      <div className="container-x relative grid gap-y-9 pt-16 pb-20 sm:pt-20 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-x-12 lg:pt-24 lg:pb-28 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-x-20">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <Intro
            id="faq-title"
            label={t("page.faqLabel")}
            heading={t("faqTitle")}
            line={t.rich("faqHelp", {
              email: (chunks) => (
                <a href={`mailto:${BRAND.supportEmail}`} className="py-[0.8125rem] font-medium text-page-ink underline decoration-page-line underline-offset-4 hover:decoration-page-ink">
                  {chunks}
                </a>
              ),
              address: BRAND.supportEmail,
            })}
          />
        </div>
        <div className="min-w-0 lg:pt-7" data-testid="pricing-faq">
          <div className="border-t border-page-line">{before}</div>
          <div data-testid="pricing-faq-rest">
            {rest.map((item) => (
              <QuestionRow key={`${item.id ?? ""}${item.q}`} q={item.q} a={item.a} name="pricing-faq" />
            ))}
          </div>
          {forTwo.length > 0 ? (
            // The membership's own questions, one closed row: gifts come first on this page, and the words on show stay few.
            <details data-faq-for-two className="group/two border-b border-page-line">
              <summary className={QUESTION_ROW}>
                <span className="flex items-center gap-2.5">
                  <SealMark className="size-6" />
                  {t("page.faqForTwo")}
                </span>
                <Plus aria-hidden="true" className={cn(QUESTION_PLUS, "group-open/two:rotate-45")} strokeWidth={1.6} />
              </summary>
              <div className="mb-4 border-t border-page-line pl-4 sm:pl-9" data-testid="pricing-faq-forTwo">
                {forTwo.map((item) => (
                  <QuestionRow key={`${item.id ?? ""}${item.q}`} q={item.q} a={item.a} name="pricing-faq" />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
