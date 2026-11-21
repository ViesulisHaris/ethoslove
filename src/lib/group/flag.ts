import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";

/**
 * Whether group cards are on: a gift other people add a note and a photo to before it is sent
 * (src/lib/group). Two things must hold. GROUP_GIFTS_ENABLED is "true", and at least one template in
 * the gallery was made for it (declares `features.group`): with none there is nothing to sell, so
 * setting the variable alone turns nothing on.
 *
 * Server-side only, like giftCardsOnSale (lib/pricing/products.ts): the variable never reaches the
 * browser, which reads false, so pages pass it down as a prop. Off, every /api/group route and
 * /c/<token> answers 404, the editor draws no group panel, checkout refuses the product and the
 * daily job skips its group step.
 */
export function groupGiftsEnabled(env: Record<string, string | undefined> = process.env, manifests: readonly TemplateManifest[] = TEMPLATE_MANIFESTS): boolean {
  return env.GROUP_GIFTS_ENABLED === "true" && manifests.some((manifest) => Boolean(manifest.features.group));
}
