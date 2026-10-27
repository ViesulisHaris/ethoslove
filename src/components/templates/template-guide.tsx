import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { templateSeo } from "@/content/template-seo";
import { listManifests } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";
import { FaqList } from "@/components/shared/faq-list";

/**
 * The questions a template page answers, in the words of the page's own facts: what it costs comes
 * from its tier and the price shown above, so the answer can't drift from the button.
 */
export async function templateFaq(manifest: TemplateManifest, locale: GiftLocale, price: string) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const name = manifest.name[locale];
  return [
    manifest.tier === "free"
      ? { q: t("faqFreeQ"), a: t("faqFreeA", { name, price }) }
      : { q: t("faqPaidQ"), a: t("faqPaidA", { name, price }) },
    { q: t("faqOpenQ"), a: t("faqOpenA") },
    { q: t("faqEditQ"), a: t("faqEditA") },
  ];
}

/**
 * Below a template's preview: how to make one in three steps, built from what the template
 * actually has (its photo count, music, countdown), the questions people ask, and the templates
 * made for the same day — which is also how a search engine finds its way from one to the next.
 */
export async function TemplateGuide({
  manifest,
  locale,
  heading,
  faq,
}: {
  manifest: TemplateManifest;
  locale: GiftLocale;
  heading: string;
  faq: { q: string; a: string }[];
}) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const { photos, music, countdown, surprise } = manifest.features;
  const steps = [
    { title: t("step1Title"), body: [t("step1Body", { min: photos.min, max: photos.max }), music ? t("step1Music") : null] },
    { title: t("step2Title"), body: [t("step2Body"), countdown && surprise ? t("step2Extras") : null] },
    { title: t("step3Title"), body: [t("step3Body")] },
  ];
  const occasion = manifest.occasions[0];
  const more = (occasion ? listManifests({ occasion }) : listManifests()).filter((m) => m.slug !== manifest.slug).slice(0, 6);

  return (
    <section className="container-narrow border-t border-line pt-14 pb-24 sm:pt-16" aria-labelledby="template-guide">
      <p className="text-eyebrow text-ink-soft">{t("eyebrow")}</p>
      <h2 id="template-guide" className="display-md mt-3">
        {heading}
      </h2>
      <ol className="mt-8 flex flex-col gap-8">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-5">
            <span className="text-mono-meta mt-1.5 w-7 shrink-0 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="font-display text-2xl">{step.title}</h3>
              <p className="mt-2.5 leading-relaxed text-ink-soft">{step.body.filter(Boolean).join(" ")}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="display-md mt-16 mb-6">{t("faqTitle")}</h2>
      <FaqList items={faq} name={`faq-${manifest.slug}`} />

      {more.length > 0 ? (
        <>
          <h2 className="display-md mt-16 mb-6">{t("moreTitle")}</h2>
          <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10">
            {more.map((m) => (
              <li key={m.slug} className="border-b border-line">
                <Link href={`/templates/${m.slug}`} className="group flex items-baseline gap-3 py-4 transition-colors hover:text-coral">
                  <span className="font-display text-xl leading-tight">{m.name[locale]}</span>
                  <span className="truncate text-sm text-muted-foreground">{templateSeo(m.slug, locale)?.keyword ?? m.tagline[locale]}</span>
                  <ArrowUpRight className="ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
