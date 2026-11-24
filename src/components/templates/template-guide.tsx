import { getTranslations } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { templateGuideFaq } from "@/content/template-guides";
import type { TemplateManifest } from "@/templates/types";
import { noteForEveryone, sendsFree, soldAsGroup } from "@/lib/gift/free-tier";

/**
 * The questions a template page answers, in the words of the page's own facts: what it costs comes
 * from its tier and the price shown above, so the answer can't drift from the button. A template
 * with a guide of its own (content/template-guides.ts) adds the questions people search about it.
 * The page draws them (components/templates/page/sections.tsx) and puts them in its FAQPage data.
 */
export async function templateFaq(manifest: TemplateManifest, locale: GiftLocale, price: string) {
  const t = await getTranslations({ locale, namespace: "templates.guide" });
  const name = manifest.name[locale];
  const group = await getTranslations({ locale, namespace: "templates.group" });
  return [
    sendsFree(manifest)
      ? { q: t("faqFreeQ"), a: t(noteForEveryone() ? "faqFreeAShort" : "faqFreeA", { name, price }) }
      : // sold only as a group card: not "with no account", and not the price of one template
        { q: t("faqPaidQ"), a: soldAsGroup(manifest) ? group("faqA", { name, price }) : t("faqPaidA", { name, price }) },
    { q: t("faqOpenQ"), a: t("faqOpenA") },
    { q: t("faqEditQ"), a: t("faqEditA") },
    ...templateGuideFaq(manifest.slug, locale),
  ];
}
