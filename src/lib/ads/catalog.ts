import { BRAND } from "@/config/brand";
import { PRODUCTS } from "@/lib/pricing/products";
import { listManifests } from "@/templates/manifests";

/**
 * The product catalog the ad platforms read, so an ad can show someone the very template they opened
 * (Meta's Advantage+ catalog ads; TikTok's catalog ads the same way). One row per premium template:
 * the free ones aren't for sale on their own.
 *
 * A row's id is the template's slug, which is exactly what the pixels send as content_ids /
 * content_id (lib/analytics/ads.ts): that is how a view, a checkout or a sale is matched to its row.
 * Everything here is what the template's public page already says; nothing about a gift or a buyer.
 *
 * The price is one template, in euros, VAT included, as the pricing page shows it. Links and pictures
 * always point at the live site, whichever deployment builds the feed.
 */

export type CatalogFormat = "meta" | "tiktok";

export type CatalogRow = {
  id: string;
  title: string;
  description: string;
  availability: "in stock";
  condition: "new";
  price: string;
  link: string;
  image_link: string;
  brand: string;
};

const ORIGIN = `https://${BRAND.domain}`;
const COLUMNS = ["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"] as const;

export function catalogRows(): CatalogRow[] {
  const price = `${(PRODUCTS.single.amounts.eur / 100).toFixed(2)} EUR`;
  return listManifests({ tier: "premium" }).map((m) => ({
    id: m.slug,
    // "Halfway: Blow a paper plane from your door to theirs", within Meta's 150 characters.
    title: `${m.name.en}: ${m.tagline.en.replace(/\.$/, "")}`.slice(0, 150),
    description: m.description.en,
    availability: "in stock",
    condition: "new",
    price,
    link: `${ORIGIN}/create/${m.slug}`,
    image_link: `${ORIGIN}${m.thumbnail.poster}`,
    brand: BRAND.name,
  }));
}

/** A CSV field, quoted when it has to be (RFC 4180). */
const field = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** The feed as CSV. TikTok names the id column `sku_id`; every other column is the same as Meta's. */
export function catalogCsv(format: CatalogFormat): string {
  const header = COLUMNS.map((c) => (c === "id" && format === "tiktok" ? "sku_id" : c));
  const lines = [header, ...catalogRows().map((row) => COLUMNS.map((c) => row[c]))];
  return `${lines.map((line) => line.map(field).join(",")).join("\r\n")}\r\n`;
}

export function catalogResponse(format: CatalogFormat): Response {
  return new Response(catalogCsv(format), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      // The feed changes only with a deploy; the platforms fetch it on a schedule.
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
