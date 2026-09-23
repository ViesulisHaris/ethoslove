import { SITE } from "@/config/site";

/**
 * The share card every gift link shows in Messages, WhatsApp and the rest. 2400×1256 because
 * iMessage only draws the full-width preview from that size up; smaller becomes a thumbnail.
 */
export const SHARE_CARD = { width: 2400, height: 1256 } as const;

/** Short, stable and not the name itself: a crawler sees a new URL when the card would change. */
function version(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

/**
 * Where the card lives: /g/<id>/card.jpg, beside the gift, with a dot so the locale proxy leaves it
 * alone (see app/og.png). The file-convention card this replaces sat under the English locale
 * segment, so its URL began /en/ and every crawler met a redirect before the image. The card is
 * cached for a day, and `v` changes with what it shows, so a renamed recipient gets a fresh one.
 */
export function shareCardUrl(shortId: string, card: { recipientName: string; locale: string }): string {
  return `${SITE.url}/g/${shortId}/card.jpg?v=${version(`${card.locale}:${card.recipientName}`)}`;
}
