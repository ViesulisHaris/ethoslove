import { ArrowUp, Gift } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { BRAND } from "@/config/brand";
import { formatAmount, membershipAmount, type Currency } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FaqItem } from "./offers";
import { SealMark } from "./seal-mark";

const GROUPS = ["forTwo", "rest"] as const;

/**
 * The questions, in two piles: Ethos for Two's first, under its seal, since it is what the page is
 * for, then gifts, games and paying. Beside them (below them on a phone) the offer once more, in its
 * own colours, so whoever read this far is one tap from it.
 */
export async function PricingFaq({ faq, currency, subscriptions }: { faq: FaqItem[]; currency: Currency; subscriptions: boolean }) {
  const t = await getTranslations("pricing");
  const groups = GROUPS.map((key) => ({ key, items: faq.filter((item) => (item.group === "forTwo") === (key === "forTwo")) })).filter((group) => group.items.length > 0);

  return (
    <section className="bg-paper py-20 lg:py-28" aria-labelledby="faq-title">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28" data-reveal>
            <p className="text-eyebrow text-rose-ink">{t("faqEyebrow")}</p>
            <h2 id="faq-title" className="mt-4 display-lg text-forest">
              {t("faqTitle")}
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              {t.rich("faqHelp", {
                email: (chunks) => (
                  <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold text-rose-deep underline underline-offset-4">
                    {chunks}
                  </a>
                ),
                address: BRAND.supportEmail,
              })}
            </p>
            <BackToOffer currency={currency} subscriptions={subscriptions} className="mt-8 hidden max-w-sm lg:block" />
          </div>
        </div>
        <div className="grid gap-12 lg:col-span-8" data-testid="pricing-faq">
          {groups.map((group) => (
            <div key={group.key} data-reveal>
              <h3 className="flex items-center gap-2.5 text-eyebrow text-forest/70">
                {group.key === "forTwo" ? <SealMark className="size-6" /> : <Gift aria-hidden="true" className="size-4 text-rose-deep" />}
                {t(`faqGroups.${group.key}`)}
              </h3>
              <Accordion type="single" collapsible className="mt-4 gap-3" data-testid={`pricing-faq-${group.key}`}>
                {group.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`${group.key}-${i}`}
                    className="rounded-2xl border border-line bg-card px-5 transition-colors data-[state=open]:bg-white data-[state=open]:shadow-soft sm:px-6"
                  >
                    <AccordionTrigger className="min-h-14 items-center py-4 text-left text-[15.5px] font-semibold text-forest hover:no-underline">{item.q}</AccordionTrigger>
                    <AccordionContent className="pb-5 text-[15px] leading-relaxed text-ink-soft">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
          <BackToOffer currency={currency} subscriptions={subscriptions} className="lg:hidden" />
        </div>
      </div>
    </section>
  );
}

/** The offer, small: what it costs and the way back up to the hero. In-page, so a plain anchor. */
async function BackToOffer({ currency, subscriptions, className }: { currency: Currency; subscriptions: boolean; className?: string }) {
  const t = await getTranslations("membership.compare");
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const money = (minor: number) => formatAmount(minor, currency, locale);
  return (
    <div className={cn("relative overflow-hidden rounded-[22px] bg-dusk-sky p-5 text-cream ring-1 ring-starlight/25 sm:p-6", className)}>
      <div aria-hidden="true" className="dusk-stars absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,transparent_35%,#000_90%)]" />
      <p className="relative flex items-center gap-2.5 text-eyebrow text-starlight">
        <SealMark className="size-6" />
        {t("forTwo")}
      </p>
      <p className="relative mt-3 text-[15px] leading-snug text-moonlight/85">
        {subscriptions
          ? t("values.priceSub", { monthly: money(membershipAmount("monthly", currency)), yearly: money(membershipAmount("yearly", currency)) })
          : t("values.pricePass", { yearly: money(membershipAmount("yearly", currency)) })}
      </p>
      <a href="#for-two" className="btn-star relative mt-4 inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold">
        {t("cta")}
        <ArrowUp aria-hidden="true" className="size-4" />
      </a>
    </div>
  );
}
