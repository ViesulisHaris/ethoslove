import { catalogResponse } from "@/lib/ads/catalog";

export const dynamic = "force-static";

/** The premium templates as a TikTok catalog feed (lib/ads/catalog.ts): the same rows, with `sku_id` for the id. */
export function GET() {
  return catalogResponse("tiktok");
}
