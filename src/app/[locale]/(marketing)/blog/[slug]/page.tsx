import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/config/site";
import { BLOG_POSTS, getPost, postContent, postLocales, postModified, relatedPosts } from "@/content/blog";
import { plainText, readingMinutes } from "@/content/blog/text";
import { blogPostingNode, breadcrumbNode, faqNode, localizedUrl, ogImageUrl, organizationNode, pageMetadata } from "@/lib/seo";
import { getManifest } from "@/templates/manifests";
import { JsonLd } from "@/components/shared/json-ld";
import { PostBody } from "@/components/blog/post-body";
import { PostCard } from "@/components/blog/post-card";
import { RichText } from "@/components/blog/rich-text";
import { FinalCta } from "@/components/marketing/home/final-cta";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/blog/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const { content, translated } = postContent(post, locale);
  // A post not yet in Spanish shows its English text at /es/blog/…, so that URL is a copy: it
  // points search engines at the English page and stays out of the index.
  const meta = pageMetadata({
    locale: translated ? locale : "en",
    path: `/blog/${post.slug}`,
    title: content.title,
    description: content.description,
    image: ogImageUrl(translated ? locale : "en", post.templates[0]),
    locales: postLocales(post),
    article: { publishedTime: post.published, modifiedTime: postModified(post) },
  });
  return translated ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const format = await getFormatter();
  const { content, locale: contentLocale, translated } = postContent(post, locale);
  const path = `/blog/${post.slug}`;
  const lead = getManifest(post.templates[0] ?? "");
  const related = relatedPosts(post);

  return (
    <>
      <JsonLd
        nodes={[
          organizationNode(),
          blogPostingNode({
            locale: contentLocale,
            path,
            title: content.title,
            description: content.description,
            keyword: content.keyword,
            published: post.published,
            modified: postModified(post),
            image: lead?.thumbnail.poster ?? ogImageUrl(contentLocale),
          }),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("blog.eyebrow"), url: localizedUrl(locale, "/blog") },
            { name: content.title, url: localizedUrl(locale, path) },
          ]),
          faqNode(content.faq.map((f) => ({ q: f.q, a: plainText(f.a) }))),
        ]}
      />
      <article lang={contentLocale === locale ? undefined : contentLocale}>
        <header className="container-x grid gap-10 pt-10 pb-12 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end lg:gap-16">
          <div className="min-w-0">
            <p className="text-eyebrow text-ink-soft">
              <Link href="/blog" className="hover:text-ink">
                {t("blog.eyebrow")}
              </Link>
              <span aria-hidden="true"> · </span>
              <time dateTime={post.published}>{format.dateTime(new Date(`${post.published}T12:00:00Z`), { dateStyle: "long" })}</time>
              <span aria-hidden="true"> · </span>
              {t("blog.minutes", { minutes: readingMinutes(content) })}
            </p>
            <h1 className="display-xl mt-5 max-w-3xl">{content.title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
              <RichText text={content.lead} />
            </p>
            {translated ? null : (
              <p lang={locale} className="mt-5 text-sm text-ink-soft italic">
                {t("blog.englishOnly")}
              </p>
            )}
          </div>
          {lead ? (
            <Link href={`/templates/${lead.slug}`} className="group relative mx-auto block aspect-[390/600] w-52 overflow-hidden rounded-[30px] bg-ink/10 shadow-lift ring-1 ring-black/5 sm:w-60 lg:w-full">
              <Image src={lead.thumbnail.poster} alt={lead.tagline[contentLocale]} fill priority sizes="(min-width: 1024px) 280px, 240px" quality={75} className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            </Link>
          ) : null}
        </header>

        {/* The reading column lines up under the headline rather than centring on its own. */}
        <div className="container-x pb-20">
          <div className="max-w-3xl">
            <aside className="rounded-[26px] border border-line bg-card px-6 py-6 sm:px-8" aria-labelledby="takeaways">
              <h2 id="takeaways" className="text-eyebrow text-coral">
                {t("blog.takeaways")}
              </h2>
              <ul className="mt-4 flex list-disc flex-col gap-2.5 pl-5 text-base leading-relaxed text-ink-soft marker:text-coral">
                {content.takeaways.map((item, i) => (
                  <li key={i}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            </aside>
  
            <PostBody blocks={content.body} locale={contentLocale} />
  
            {/* Questions in full, not folded: an answer behind an accordion isn't in the HTML until it's opened. */}
            <section className="mt-16 border-t border-line pt-12" aria-labelledby="faq">
              <h2 id="faq" className="display-md">
                {t("blog.faqTitle")}
              </h2>
              <div className="mt-4 flex flex-col divide-y divide-line">
                {content.faq.map((item, i) => (
                  <div key={i} className="py-5">
                    <h3 className="text-lg font-medium text-ink">{item.q}</h3>
                    <p className="mt-2 leading-relaxed text-ink-soft">
                      <RichText text={item.a} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="container-x pb-24" aria-labelledby="related">
          <h2 id="related" className="display-md">
            {t("blog.related")}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
      <FinalCta />
    </>
  );
}
