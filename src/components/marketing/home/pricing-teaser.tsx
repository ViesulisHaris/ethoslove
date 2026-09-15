import { getTranslations } from "next-intl/server";
import { stripeReady } from "@/lib/stripe/server";
import { currencyFor } from "@/lib/pricing/products";
import { listManifests } from "@/templates/registry";
import { PricingCards } from "@/components/pricing/pricing-cards";

export async function PricingTeaser({ locale }: { locale: string }) {
  const t = await getTranslations("pricing");
  return (
    <section className="border-b border-line py-20 lg:py-28">
      <div className="container-x">
        <div className="mb-12 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
            <h2 className="display-xl mt-4">{t("title")}</h2>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:col-span-5 lg:pb-1">{t("subtitle")}</p>
        </div>
        <PricingCards currency={currencyFor(locale === "es" ? "ES" : "US")} manifests={listManifests()} authed={false} paymentsEnabled={stripeReady()} />
      </div>
    </section>
  );
}
