import Image from "next/image";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GAME_PAGES } from "@/content/game-pages";
import { getPost, postContent, postLocales } from "@/content/blog";
import type { GameKey } from "@/lib/games/catalogue";
import { faqNode } from "@/lib/seo";
import { getManifest } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";

/** The gift page's two-column spread (templates/page/spread.tsx), on the table's own colours. */
const SPREAD = "grid gap-y-8 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[22.5rem_minmax(0,1fr)] xl:gap-x-20";

const SUMMARY =
  "flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[16px] font-semibold text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush [&::-webkit-details-marker]:hidden";

/**
 * What a game's page says under the game, laid out as the redesigned pages are
 * (docs/marketing/growth-build/DESIGN-LESS-TEXT.md): a short left column (label, heading, one line)
 * beside the closed list, where "How to play" is the first entry rather than a numbered block in
 * view; then "More like this", the blog posts that already link to the game, as picture cards (the
 * poster of the gift each post leads with, and its title). The questions are given to search
 * engines as an FAQPage. The words are content/game-pages.ts.
 */
export async function GameNotes({ game, locale }: { game: GameKey; locale: string }) {
  const t = await getTranslations({ locale, namespace: "games.notes" });
  const l = locale === "es" ? "es" : "en";
  const page = GAME_PAGES[game];
  const posts = page.posts
    .map((slug) => getPost(slug))
    .filter((post) => post !== null && postLocales(post).includes(l))
    .map((post) => ({ slug: post!.slug, title: postContent(post!, l).content.title, poster: getManifest(post!.templates[0] ?? "")?.thumbnail.poster ?? null }));
  return (
    <section className="container-x relative pb-24" aria-labelledby={`${game}-notes`}>
      <JsonLd nodes={[faqNode(page.faq.map(({ q, a }) => ({ q: q[l], a: a[l] })))]} />
      <div className="border-t border-cream/15 pt-12">
        <div className={SPREAD}>
          <div>
            <p className="text-eyebrow text-blush">{t("label")}</p>
            <h2 id={`${game}-notes`} className="mt-4 display-md text-balance text-cream">
              {t("faq")}
            </h2>
            <p className="mt-4 max-w-[21rem] text-[15px] leading-relaxed text-cream/70">{t("line")}</p>
          </div>
          <div className="min-w-0 lg:pt-1">
            {page.how ? (
              <details data-how className="group border-t border-cream/15">
                <summary className={SUMMARY}>
                  {t("how")}
                  <Plus aria-hidden="true" className="size-4 shrink-0 text-cream/70 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                </summary>
                <ol className="grid gap-2.5 pr-8 pb-5">
                  {page.how[l].map((line, i) => (
                    <li key={line} className="flex items-baseline gap-4 text-[15.5px] leading-relaxed text-cream/75">
                      <span aria-hidden="true" className="w-4 shrink-0 font-display text-[20px] text-blush">
                        {i + 1}
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
            {page.faq.map(({ q, a }) => (
              <details key={q.en} className="group border-t border-cream/15 last:border-b">
                <summary className={SUMMARY}>
                  {q[l]}
                  <Plus aria-hidden="true" className="size-4 shrink-0 text-cream/70 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" strokeWidth={1.6} />
                </summary>
                <p className="pr-8 pb-5 text-[15.5px] leading-relaxed text-cream/75">{a[l]}</p>
              </details>
            ))}
          </div>
        </div>

        {posts.length ? (
          <div data-more className={`${SPREAD} mt-16`}>
            <div>
              <p className="text-eyebrow text-blush">{t("moreLabel")}</p>
              <h2 className="mt-4 display-md text-balance text-cream">{t("more")}</h2>
            </div>
            {/* Picture cards on a desk; on a phone each is a row (the poster small beside its title), never a set of cards side by side. */}
            <ul className="grid min-w-0 gap-3 sm:max-w-xl sm:grid-cols-2 sm:gap-5 lg:pt-1">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group flex items-center gap-4 rounded-[20px] p-2 -m-2 transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blush sm:m-0 sm:flex-col sm:items-stretch sm:gap-3 sm:p-0 sm:hover:bg-transparent"
                  >
                    {post.poster ? (
                      <span className="relative block aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10 sm:w-full">
                        <Image src={post.poster} alt="" fill sizes="(min-width: 640px) 280px, 80px" quality={70} className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                      </span>
                    ) : null}
                    <span className="font-display text-[19px] leading-snug text-balance text-cream underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-cream/50">{post.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
