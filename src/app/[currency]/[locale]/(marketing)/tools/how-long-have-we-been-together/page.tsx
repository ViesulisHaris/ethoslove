import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientMessages } from "@/i18n/client-messages";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { getPost, postContent } from "@/content/blog";
import { TOGETHER_GUIDE, TOGETHER_PATH, TOGETHER_READING, TOGETHER_TEMPLATES } from "@/content/together-guide";
import { getManifest } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateCard } from "@/components/templates/template-card";
import { TogetherCounter } from "@/components/tools/together-counter";

type Props = PageProps<"/[currency]/[locale]/tools/how-long-have-we-been-together">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const guide = TOGETHER_GUIDE[locale === "es" ? "es" : "en"];
  return pageMetadata({ locale, path: TOGETHER_PATH, title: guide.title, description: guide.description });
}

/**
 * "How long have we been together?": the counter, the milestones it counts explained, the gifts made
 * for a date, and the questions people ask (content/together-guide.ts).
 */
export default async function TogetherPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang: GiftLocale = locale === "es" ? "es" : "en";
  const guide = TOGETHER_GUIDE[lang];
  const templates = TOGETHER_TEMPLATES.map((slug) => getManifest(slug)).filter((m): m is TemplateManifest => m != null);
  const reading = TOGETHER_READING.flatMap((slug) => {
    const post = getPost(slug);
    return post ? [{ slug, title: postContent(post, lang).content.title }] : [];
  });

  return (
    <ClientMessages scope="(marketing)/tools/how-long-have-we-been-together/page" locale={locale}>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: guide.h1, url: localizedUrl(locale, TOGETHER_PATH) },
          ]),
          faqNode(guide.faq),
        ]}
      />
      <PageHeader eyebrow={guide.eyebrow} title={guide.h1} subtitle={guide.intro} />

      <section className="container-narrow pb-16">
        <TogetherCounter />
      </section>

      <section className="container-narrow border-t border-line pt-14 pb-16" aria-labelledby="together-milestones">
        <h2 id="together-milestones" className="display-md">
          {guide.milestonesTitle}
        </h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {guide.milestones.map((m) => (
            <div key={m.heading}>
              <h3 className="font-display text-2xl">{m.heading}</h3>
              <p className="mt-2.5 leading-relaxed text-ink-soft">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      {templates.length > 0 ? (
        <section className="container-x border-t border-line pt-14 pb-16" aria-labelledby="together-gifts">
          <h2 id="together-gifts" className="display-md">
            {guide.giftsTitle}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{guide.giftsIntro}</p>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((m, i) => (
              <TemplateCard key={m.slug} manifest={m} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-narrow border-t border-line pt-14 pb-24" aria-labelledby="together-faq">
        <h2 id="together-faq" className="display-md mb-6">
          {guide.faqTitle}
        </h2>
        <FaqList items={guide.faq} name="faq-together" />

        {reading.length > 0 ? (
          <>
            <h2 className="display-md mt-16 mb-6">{guide.readTitle}</h2>
            <ul className="grid grid-cols-1 border-t border-line">
              {reading.map((r) => (
                <li key={r.slug} className="border-b border-line">
                  <Link href={`/blog/${r.slug}`} className="group flex items-baseline gap-3 py-4 transition-colors hover:text-coral">
                    <span className="min-w-0 font-display text-xl leading-tight">{r.title}</span>
                    <ArrowUpRight className="ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </ClientMessages>
  );
}
