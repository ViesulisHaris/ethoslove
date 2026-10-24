import { getTranslations } from "next-intl/server";
import { giftCardsOnSale, subscriptionsEnabled } from "@/lib/pricing/products";
import { pricingFaq, type FaqItem } from "@/components/pricing/offers";
import { FaqList } from "@/components/shared/faq-list";

export async function Faq() {
  const t = await getTranslations("pricing");
  // No question about the gift card while it isn't on sale (GIFT_CARDS_ENABLED), and Ethos for Two's
  // answers only for the way it is sold now (STRIPE_SUBSCRIPTIONS_ENABLED).
  const faq = pricingFaq(t.raw("faq") as FaqItem[], { giftCards: giftCardsOnSale(), subscriptions: subscriptionsEnabled() });
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-eyebrow text-ink-soft">FAQ</p>
          <h2 className="display-xl mt-4 max-w-[7.2em]">{t("faqTitle")}</h2>
        </div>
        <FaqList
          items={faq}
          name="faq-gifts"
          className="divide-line border-line lg:col-span-7"
          questionClassName="font-display text-xl font-normal"
          answerClassName="max-w-2xl pb-6"
        />
      </div>
    </section>
  );
}
