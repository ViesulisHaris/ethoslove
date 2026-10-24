import { catalogResponse } from "@/lib/ads/catalog";

export const dynamic = "force-static";

/** The premium templates as a Meta catalog feed (lib/ads/catalog.ts): Commerce Manager reads it on a schedule. */
export function GET() {
  return catalogResponse("meta");
}
