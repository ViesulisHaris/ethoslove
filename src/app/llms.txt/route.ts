import { BRAND } from "@/config/brand";
import { SITE } from "@/config/site";
import { OCCASIONS } from "@/config/occasions";
import { PRODUCTS, PRODUCT_ORDER, formatAmount } from "@/lib/pricing/products";
import { localizedUrl } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
import en from "../../../messages/en.json";

export const dynamic = "force-static";

/**
 * A plain-language brief of Ethos for AI assistants and answer engines (llmstxt.org): what it is,
 * every template and occasion page, prices and the FAQ, read from the same sources as the site.
 */
export function GET() {
  const manifests = listManifests();
  const free = manifests.filter((m) => m.tier === "free").map((m) => m.name.en);
  const prices = (id: (typeof PRODUCT_ORDER)[number]) =>
    (["usd", "eur", "gbp"] as const).map((c) => formatAmount(PRODUCTS[id].amounts[c], c)).join(" / ");

  const lines = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.name} (${BRAND.domain}) makes personal, animated digital gifts. You pick a template, add their name, your message, photos and a song, and send the gift as a link or a QR code. It opens on their phone as a short interactive experience, in English or Spanish, with no app to install. Free to start; premium templates and extras are a one-time payment, never a subscription.`,
    "",
    `People use ${BRAND.name} when a text feels too small and a physical gift is too slow or too far away: birthdays, anniversaries, Valentine's Day, long-distance relationships, apologies, Mother's Day and Father's Day, weddings, graduations and Christmas.`,
    "",
    "## How it works",
    "",
    `1. Choose one of ${manifests.length} templates. Every one has a free live demo.`,
    "2. Add the recipient's name, your message and photos, and music: a track from the Ethos library, your own file, or a 30-second preview of a real song.",
    "3. Publish and share the link, or print the QR card. A gift can be scheduled to unlock at a set time, or protected with a password.",
    "4. They open it on their phone and can send a reaction back; the sender sees opens and reactions on their dashboard.",
    "",
    "## Templates",
    "",
    ...manifests.map(
      (m) =>
        `- [${m.name.en}](${localizedUrl("en", `/templates/${m.slug}`)}): ${m.tagline.en} ${m.description.en} ${m.tier === "free" ? "Free." : "Premium."} Good for: ${m.occasions.map((o) => en.occasions[o]).join(", ")}.`,
    ),
    "",
    "## Occasions",
    "",
    ...OCCASIONS.map((o) => `- [${en.seo.occasion[o].title}](${localizedUrl("en", `/occasions/${o}`)}): ${en.seo.occasion[o].description}`),
    "",
    "## Pricing",
    "",
    `- Free: ${free.join(" and ")}. ${en.pricing.freeNote}`,
    ...PRODUCT_ORDER.map((id) => `- ${en.pricing.plans[id].name}: ${prices(id)}, paid once. ${en.pricing.plans[id].features.join("; ")}.`),
    "",
    "## FAQ",
    "",
    ...en.pricing.faq.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## Links",
    "",
    `- Home: ${SITE.url}`,
    `- Templates: ${localizedUrl("en", "/templates")}`,
    `- Occasions: ${localizedUrl("en", "/occasions")}`,
    `- Pricing: ${localizedUrl("en", "/pricing")}`,
    `- En español: ${localizedUrl("es")}`,
    `- Terms: ${localizedUrl("en", "/legal/terms")}`,
    `- Privacy: ${localizedUrl("en", "/legal/privacy")}`,
    `- Contact: ${BRAND.supportEmail}`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
