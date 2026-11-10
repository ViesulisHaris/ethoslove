import { chatgptFeedResponse } from "@/lib/ads/catalog";

export const dynamic = "force-static";

/** The premium templates as a ChatGPT shopping feed (lib/ads/catalog.ts), in OpenAI's product feed format. */
export function GET() {
  return chatgptFeedResponse();
}
