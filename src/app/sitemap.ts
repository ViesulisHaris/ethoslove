import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE } from "@/config/site";
import { OCCASIONS } from "@/config/occasions";
import { localizedUrl } from "@/lib/seo";
import { listManifests } from "@/templates/registry";

type Page = { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly"; images?: string[] };

/** Every indexable page in every language, each listing its translations; template pages carry their poster. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages: Page[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/templates", priority: 0.9, changeFrequency: "weekly" },
    { path: "/occasions", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    ...listManifests().map((m): Page => ({ path: `/templates/${m.slug}`, priority: 0.8, changeFrequency: "monthly", images: [`${SITE.url}${m.thumbnail.poster}`] })),
    ...OCCASIONS.map((o): Page => ({ path: `/occasions/${o}`, priority: 0.8, changeFrequency: "monthly" })),
    { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  ];
  return pages.flatMap(({ path, priority, changeFrequency, images }) => {
    const languages: Record<string, string> = { "x-default": localizedUrl(routing.defaultLocale, path) };
    for (const l of routing.locales) languages[l] = localizedUrl(l, path);
    return routing.locales.map((locale) => ({
      url: localizedUrl(locale, path),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
      ...(images ? { images } : {}),
    }));
  });
}
