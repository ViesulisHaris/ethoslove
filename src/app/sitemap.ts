import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { OCCASIONS } from "@/config/occasions";
import { BLOG_POSTS, postLocales, postModified } from "@/content/blog";
import { localizedUrl } from "@/lib/seo";
import { getManifest, listManifests } from "@/templates/manifests";

type Page = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  images?: string[];
  /** When the page last changed, if it's known; otherwise the build time. */
  lastModified?: Date;
  /** The languages it exists in, if not all of them. */
  locales?: readonly string[];
};

/**
 * Every indexable page in every language it exists in, each listing its translations; template pages
 * and blog posts carry their poster.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const built = new Date();
  const pages: Page[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/templates", priority: 0.9, changeFrequency: "weekly" },
    { path: "/occasions", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    ...listManifests().map((m): Page => ({ path: `/templates/${m.slug}`, priority: 0.8, changeFrequency: "monthly", images: [`${SITE.url}${m.thumbnail.poster}`] })),
    ...OCCASIONS.map((o): Page => ({ path: `/occasions/${o}`, priority: 0.8, changeFrequency: "monthly" })),
    { path: "/blog", priority: 0.7, changeFrequency: "daily", lastModified: BLOG_POSTS[0] ? new Date(postModified(BLOG_POSTS[0])) : undefined },
    ...BLOG_POSTS.map((p): Page => {
      const poster = getManifest(p.templates[0] ?? "")?.thumbnail.poster;
      return {
        path: `/blog/${p.slug}`,
        priority: 0.6,
        changeFrequency: "monthly",
        lastModified: new Date(postModified(p)),
        locales: postLocales(p),
        ...(poster ? { images: [`${SITE.url}${poster}`] } : {}),
      };
    }),
    { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  ];
  return pages.flatMap(({ path, priority, changeFrequency, images, lastModified = built, locales = routing.locales }) => {
    const languages: Record<string, string> = { "x-default": localizedUrl(routing.defaultLocale, path) };
    for (const l of locales) languages[l] = localizedUrl(l, path);
    return locales.map((locale) => ({
      url: localizedUrl(locale, path),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
      ...(images ? { images } : {}),
    }));
  });
}
