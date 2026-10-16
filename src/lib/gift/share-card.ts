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
export function shareCardUrl(shortId: string, card: { recipientName: string; locale: string; templateSlug?: string | null; look?: unknown }): string {
  const paper = cardLookFor(card.templateSlug, card.look, shortId);
  return `${SITE.url}/g/${shortId}/card.jpg?v=${version(`envelope:${paper}:${card.locale}:${card.recipientName}`)}`;
}

/** The four papers a share card comes on (src/lib/gift/card-art.ts draws them). */
export type CardLook = "blush" | "rouge" | "pressed" | "noir";
export const CARD_LOOKS: CardLook[] = ["blush", "rouge", "pressed", "noir"];

/**
 * Which paper a gift's card is on: the one that matches its template and look where there is
 * one, else one of the light three picked steadily from the gift's own id, so cards differ from
 * gift to gift.
 */
export function cardLookFor(templateSlug: string | null | undefined, look: unknown, seed: string): CardLook {
  const byLook: Record<string, CardLook> = { rouge: "rouge", cherry: "rouge", pressed: "pressed", letters: "pressed", bow: "noir", gothic: "noir", noir: "noir", rose: "blush" };
  if ((templateSlug === "coquette" || templateSlug === "xoxo") && typeof look === "string" && byLook[look]) return byLook[look];
  const bySlug: Record<string, CardLook> = {
    coquette: "blush",
    kawaii: "blush",
    bouquet: "blush",
    "favorite-person": "blush",
    "be-my-boo": "blush",
    xoxo: "rouge",
    "on-repeat": "rouge",
    "the-letter": "rouge",
    "fall-for-you": "pressed",
    "autumn-reel": "pressed",
    keepsake: "pressed",
    scrapbook: "pressed",
    evergreen: "pressed",
    "dark-romance": "noir",
    "spooky-season": "noir",
    "midnight-countdown": "noir",
    constellations: "noir",
  };
  if (templateSlug && bySlug[templateSlug]) return bySlug[templateSlug];
  // FNV-1a: a plain ×31 hash leaves its low bits in step, so ids alike in shape all got one paper.
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0;
  // The black paper is for gifts that are dark already; a birthday or a gift for Mum gets a light one.
  const light: CardLook[] = ["blush", "rouge", "pressed"];
  return light[hash % light.length];
}
