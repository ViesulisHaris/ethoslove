import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/**
 * Next's link prefetches: each <Link> on a page fetches that page's data a second time, as
 * /page?_rsc=… (and, with Cache Components, as …/page.segments/….segment.rsc). Google's renderer
 * sees every link on a page at once, so from 18 Sep to 7 Nov 2026 these were 44% of what Googlebot
 * fetched here and pages only 13%. A page renders the same without them (checked 9 Nov on ten
 * pages: title, canonical, headings, links, structured data and text), so crawlers skip them.
 */
const PREFETCH_DISALLOW = ["/*_rsc=", "/*.rsc$"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/account", "/create", "/api", "/auth", "/g/", "/campaign", "/es/dashboard", "/es/account", "/es/create", "/es/campaign", ...PREFETCH_DISALLOW],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
