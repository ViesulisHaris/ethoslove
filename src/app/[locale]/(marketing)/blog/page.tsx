import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE } from "@/config/site";
import { BLOG_POSTS, postContent } from "@/content/blog";
import { blogNode, breadcrumbNode, localizedUrl, pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { PageHeader } from "@/components/shared/page-header";
import { PostCard } from "@/components/blog/post-card";
import { FinalCta } from "@/components/marketing/home/final-cta";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/blog">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/blog", title: t("blogTitle"), description: t("blogDescription") });
}

export default async function BlogIndexPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <>
      <JsonLd
        nodes={[
          blogNode(
            locale,
            t("seo.blogTitle"),
            BLOG_POSTS.map((p) => ({ title: postContent(p, locale).content.title, path: `/blog/${p.slug}`, published: p.published })),
          ),
          breadcrumbNode([
            { name: SITE.name, url: localizedUrl(locale) },
            { name: t("blog.eyebrow"), url: localizedUrl(locale, "/blog") },
          ]),
        ]}
      />
      <PageHeader eyebrow={t("blog.eyebrow")} title={t("blog.title")} subtitle={t("blog.subtitle")} />
      <section className="container-x pb-24" aria-label={t("blog.eyebrow")}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BLOG_POSTS.map((post) => (
            <PostCard key={post.slug} post={post} locale={locale} />
          ))}
        </div>
      </section>
      <FinalCta />
    </>
  );
}
