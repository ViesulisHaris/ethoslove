import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { OCCASIONS } from "@/config/occasions";
import { BLOG_POSTS, postLocales, postModified } from "@/content/blog";
import { pageUpdated } from "@/content/page-dates";
import { TOGETHER_PATH } from "@/content/together-guide";
import { RECIPIENTS, recipientSlug } from "@/content/recipients";
import { CITY_SLUGS } from "@/lib/cities/cities";
import { localizedUrl } from "@/lib/seo";
import { TRIPS } from "@/lib/trips/presets";
import { getManifest, listManifests } from "@/templates/manifests";

type Page = {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  images?: string[];
  /**
   * When the page last changed: a blog post's own date, else the page's date in
   * content/page-dates.ts. A page without one sends no date: never the build time, which said
   * every page changed at every deploy until search engines stopped believing any of our dates.
   */
  lastModified?: Date | string;
  /** The languages it exists in, if not all of them. */
  locales?: readonly string[];
};

/**
 * Every indexable page in every language it exists in, each listing its translations; template and
 * trip pages and blog posts carry their picture.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Page[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/dates", priority: 0.9, changeFrequency: "weekly" },
    ...CITY_SLUGS.map((slug): Page => ({ path: `/dates/${slug}`, priority: 0.7, changeFrequency: "weekly" })),
    { path: "/gifts", priority: 0.9, changeFrequency: "weekly" },
    ...RECIPIENTS.map((r): Page => ({ path: `/gifts/${recipientSlug(r)}`, priority: 0.8, changeFrequency: "monthly" })),
    { path: "/trips", priority: 0.8, changeFrequency: "monthly" },
    ...TRIPS.map((trip): Page => ({ path: `/trips/${trip.id}`, priority: 0.7, changeFrequency: "monthly", ...(trip.image ? { images: [`${SITE.url}${trip.image}`] } : {}) })),
    { path: "/long-distance", priority: 0.8, changeFrequency: "monthly" },
    { path: TOGETHER_PATH, priority: 0.7, changeFrequency: "monthly" },
    { path: "/games", priority: 0.7, changeFrequency: "monthly" },
    ...["know", "rather", "draw", "memory", "deck", "dare", "roulette"].map((g): Page => ({ path: `/games/${g}`, priority: 0.6, changeFrequency: "monthly" })),
    { path: "/templates", priority: 0.9, changeFrequency: "weekly" },
    { path: "/occasions", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/creators", priority: 0.5, changeFrequency: "monthly" },
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
    { path: "/legal/withdraw", priority: 0.2, changeFrequency: "yearly" },
  ];
  return pages.flatMap(({ path, priority, changeFrequency, images, lastModified = pageUpdated(path), locales = routing.locales }) => {
    const languages: Record<string, string> = { "x-default": localizedUrl(routing.defaultLocale, path) };
    for (const l of locales) languages[l] = localizedUrl(l, path);
    return locales.map((locale) => ({
      url: localizedUrl(locale, path),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency,
      priority,
      alternates: { languages },
      ...(images ? { images } : {}),
    }));
  });
}
