import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientMessages } from "@/i18n/client-messages";
import { SITE } from "@/config/site";
import type { GiftLocale } from "@/lib/gift/schema";
import { LANGUAGES, type LoveLanguage } from "@/lib/love-quiz/score";
import { breadcrumbNode, faqNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { getPost, postContent } from "@/content/blog";
import { LANGUAGE_GIFTS, LOVE_QUIZ, LOVE_QUIZ_PATH, LOVE_QUIZ_READING, QUESTIONS } from "@/content/love-language-quiz";
import { getManifest } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { PageHeader } from "@/components/shared/page-header";
import { TemplateCard } from "@/components/templates/template-card";
import { LoveLanguageQuiz, type QuizGift, type QuizQuestionView } from "@/components/tools/love-language-quiz";

type Props = PageProps<"/[currency]/[locale]/tools/love-language-quiz">;

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const guide = LOVE_QUIZ[locale === "es" ? "es" : "en"];
  return pageMetadata({ locale, path: LOVE_QUIZ_PATH, title: guide.title, description: guide.description });
}

/**
 * The love language quiz: thirty choices, a result, a link to compare with a partner, then the five
 * languages explained, a gift for each and the questions people ask (content/love-language-quiz.ts).
 * Only this language's words go to the browser.
 */
export default async function LoveLanguageQuizPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang: GiftLocale = locale === "es" ? "es" : "en";
  const guide = LOVE_QUIZ[lang];
  const questions: QuizQuestionView[] = QUESTIONS.map((q) => ({
    prompt: q.prompt[lang],
    a: { lang: q.a.lang, text: q.a[lang] },
    b: { lang: q.b.lang, text: q.b[lang] },
  }));
  const gifts = Object.fromEntries(
    LANGUAGES.map((l): [LoveLanguage, QuizGift] => {
      const m = getManifest(LANGUAGE_GIFTS[l]);
      if (!m) throw new Error(`love-language-quiz: no template "${LANGUAGE_GIFTS[l]}"`);
      return [l, { slug: m.slug, name: m.name[lang], poster: m.thumbnail.poster }];
    }),
  ) as Record<LoveLanguage, QuizGift>;
  const giftCards = LANGUAGES.map((l) => ({ lang: l, manifest: getManifest(LANGUAGE_GIFTS[l])! }));
  const reading = LOVE_QUIZ_READING.flatMap((slug) => {
    const post = getPost(slug);
    return post ? [{ slug, title: postContent(post, lang).content.title }] : [];
  });

  return (
    <ClientMessages scope="(marketing)/tools/love-language-quiz/page" locale={locale}>
      <JsonLd
        nodes={[
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: guide.h1, url: localizedUrl(locale, LOVE_QUIZ_PATH) },
          ]),
          faqNode(guide.faq),
        ]}
      />
      <PageHeader eyebrow={guide.eyebrow} title={guide.h1} subtitle={guide.intro} />

      <section className="container-narrow pb-16">
        <LoveLanguageQuiz questions={questions} ui={guide.ui} languages={guide.languages} gifts={gifts} />
        <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-ink-soft">{guide.credit}</p>
      </section>

      <section className="container-narrow border-t border-line pt-14 pb-16" aria-labelledby="love-quiz-languages">
        <h2 id="love-quiz-languages" className="display-md">
          {guide.languagesTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{guide.languagesIntro}</p>
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {LANGUAGES.map((l) => {
            const c = guide.languages[l];
            return (
              <div key={l}>
                <h3 className="font-display text-2xl">{c.name}</h3>
                <p className="mt-2 font-medium leading-snug">{c.line}</p>
                <p className="mt-2.5 leading-relaxed text-ink-soft">{c.body}</p>
                <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-ink-soft">
                  {c.lands.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-coral" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section id="love-quiz-gifts" className="container-x scroll-mt-24 border-t border-line pt-14 pb-16" aria-labelledby="love-quiz-gifts-title">
        <h2 id="love-quiz-gifts-title" className="display-md">
          {guide.giftsTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{guide.giftsIntro}</p>
        <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {giftCards.map(({ lang: l, manifest }, i) => (
            <div key={l}>
              <p className="text-eyebrow mb-3 text-coral">{guide.languages[l].name}</p>
              <TemplateCard manifest={manifest} index={i} />
            </div>
          ))}
        </div>
      </section>

      <section className="container-narrow border-t border-line pt-14 pb-24" aria-labelledby="love-quiz-faq">
        <h2 id="love-quiz-faq" className="display-md mb-6">
          {guide.faqTitle}
        </h2>
        <FaqList items={guide.faq} name="faq-love-quiz" />

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
