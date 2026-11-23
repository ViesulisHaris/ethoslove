import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GAME_PAGES } from "@/content/game-pages";
import { getPost, postContent, postLocales } from "@/content/blog";
import type { GameKey } from "@/lib/games/catalogue";
import { faqNode } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";

/**
 * What a game's page says under the game, on the table's own colours beside the list of questions
 * (question-list.tsx): how it is played, where the page said nothing of it; the questions people
 * ask about it, closed, and given to search engines as an FAQPage; and the blog posts that already
 * link to it. The words are content/game-pages.ts.
 */
export async function GameNotes({ game, locale }: { game: GameKey; locale: string }) {
  const t = await getTranslations({ locale, namespace: "games.notes" });
  const l = locale === "es" ? "es" : "en";
  const page = GAME_PAGES[game];
  const posts = page.posts.map((slug) => getPost(slug)).filter((post) => post !== null && postLocales(post).includes(l));
  return (
    <section className="container-x relative pb-24" aria-labelledby={`${game}-notes`}>
      <JsonLd nodes={[faqNode(page.faq.map(({ q, a }) => ({ q: q[l], a: a[l] })))]} />
      <div className="border-t border-cream/15 pt-12">
        {page.how ? (
          <>
            <h2 className="display-md text-cream">{t("how")}</h2>
            <ol className="mt-6 grid max-w-3xl gap-3">
              {page.how[l].map((line, i) => (
                <li key={line} className="flex items-baseline gap-4 text-[15.5px] leading-relaxed text-cream/85">
                  <span aria-hidden="true" className="w-4 shrink-0 font-display text-[22px] text-blush">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </>
        ) : null}
        <h2 id={`${game}-notes`} className={page.how ? "mt-14 display-md text-cream" : "display-md text-cream"}>
          {t("faq")}
        </h2>
        <div className="mt-6 max-w-3xl">
          {page.faq.map(({ q, a }) => (
            <details key={q.en} className="group border-t border-cream/15 last:border-b">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[16px] font-semibold text-cream [&::-webkit-details-marker]:hidden">
                {q[l]}
                <Plus aria-hidden="true" className="size-4 shrink-0 text-cream/70 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
              </summary>
              <p className="pr-8 pb-5 text-[15.5px] leading-relaxed text-cream/75">{a[l]}</p>
            </details>
          ))}
        </div>
        {posts.length ? (
          <p className="mt-10 max-w-3xl text-[15px] leading-8 text-cream/70">
            {t("more")}{" "}
            {posts.map((post, i) => (
              <span key={post!.slug}>
                {i > 0 ? ", " : null}
                <Link href={`/blog/${post!.slug}`} className="py-3 font-semibold text-cream underline decoration-cream/30 underline-offset-4 hover:decoration-cream">
                  {postContent(post!, l).content.title}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
