import { BRAND } from "@/config/brand";
import { CREATOR_COMMISSION_PCT } from "@/lib/commerce/creators";
import {
  CHARGED_CURRENCIES,
  PRODUCTS,
  PRODUCT_ORDER,
  formatAmount,
  giftCardsOnSale,
  membershipAmount,
  subscriptionsEnabled,
  type MembershipPlan,
  type ProductId,
} from "@/lib/pricing/products";
import { localizedUrl } from "@/lib/seo";
import { listManifests } from "@/templates/manifests";
import { pricingFaq } from "@/components/pricing/offers";
import en from "../../../messages/en.json";
import { noteForEveryone, sendsFree } from "@/lib/gift/free-tier";
import { keepShare } from "@/lib/editor/keep-split";

/**
 * The parts of the plain-language brief of Ethos that /llms.txt and the help chat's guide
 * (src/lib/support/guide.ts) both say: what Ethos is, how a gift works, the prices and the FAQ.
 * Read from the same sources as the site, so a price or a template reaches both with the next
 * deploy. Each returns the section's lines, headings included; /llms.txt joins them with "\n".
 */

// Only currencies checkout really charges in: a price nobody can pay is not a price.
const prices = (id: ProductId) => CHARGED_CURRENCIES.map((c) => formatAmount(PRODUCTS[id].amounts[c], c)).join(" / ");
const plan = (p: MembershipPlan) => CHARGED_CURRENCIES.map((c) => formatAmount(membershipAmount(p, c), c)).join(" / ");
// What can be sent free as the site stands, and what "Make it special" is sold on (lib/gift/free-tier.ts).
const freeTemplates = () => listManifests().filter((m) => sendsFree(m)).map((m) => m.name.en);
const specialTemplates = () => listManifests().filter((m) => m.tier === "free").map((m) => m.name.en);

export function briefIntro(): string[] {
  return [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.categoryLine.en}. ${BRAND.name} (${BRAND.domain}) is for couples: date ideas made from real places near you on a map, ready-made trips, games for two, and personal gifts that open like a story. For a gift you pick a template, add their name, your message, photos and a song, and send it as a link or a QR code. It opens on their phone as a short interactive experience, in English or Spanish, with no app to install. Free to start; premium templates and extras are a one-time payment. The one membership, Ethos for Two, covers a couple: unlimited saved dates and trips shared on both their phones, and every template and game pack while it runs.`,
    "",
    `People use ${BRAND.name} when a text feels too small and a physical gift is too slow or too far away: birthdays, anniversaries, Valentine's Day, long-distance relationships, apologies, Mother's Day and Father's Day, weddings, graduations and Christmas.`,
  ];
}

export function briefHowGifts(): string[] {
  return [
    "## How gifts work",
    "",
    `1. Choose one of ${listManifests().length} templates. Every one has a free live demo.`,
    "2. Add the recipient's name, your message and photos, and music: a track from the Ethos library or your own file, which plays as the gift opens, or a real song, free on every gift: the recipient taps it at the end to hear Apple Music's 30-second preview, with a link to the full song.",
    "3. Publish and share the link, or print the QR card. A gift can be scheduled to unlock at a set time, or protected with a password.",
    "4. They open it on their phone and can send a reaction back; the sender sees opens and reactions on their dashboard.",
  ];
}

// Nothing about the gift card while it isn't on sale (GIFT_CARDS_ENABLED, read at build time),
// and Ethos for Two described the way it is sold (STRIPE_SUBSCRIPTIONS_ENABLED, likewise).
export function briefPricing(): string[] {
  const free = freeTemplates();
  const subscriptions = subscriptionsEnabled();
  return [
    "## Pricing",
    "",
    `- Free: ${free.join(" and ")}. ${noteForEveryone() ? en.pricing.freeNoteShort : en.pricing.freeNote}`,
    ...PRODUCT_ORDER.map((id) => `- ${en.pricing.plans[id].name}: ${prices(id)}, paid once. ${en.pricing.plans[id].features.join("; ")}.`),
    noteForEveryone()
      ? `- Make it special: ${prices("extras")}, paid once, for ${specialTemplates().join(" or ")}: that template's paid parts (photos, a letter over 500 characters, a video, a voice message, no footer, scheduling and a password), forever. Constellations is made of photos, so it has no free version.`
      : `- Make it special: ${prices("extras")}, paid once, for a free template (${free.join(" or ")}): that template's paid extras (a video, a voice message, up to 20 photos, no footer, scheduling and a password), forever.`,
    // Only while some visitors are offered it (lib/editor/keep-split.ts): with the share at 0 nobody can buy it.
    ...(keepShare() > 0
      ? [`- A note with photos: ${prices("photos")}, paid once, for The Letter: the short free note keeps up to five of the sender's photos. Its 500 characters and the "Made with Ethos" footer stay. Offered to some visitors while it is being tried out. What it cost comes off "Make it special" for the same template later.`]
      : []),
    `- Sending one back: someone who receives a paid gift made with a premium template can send one back in the same template for free, once, with the "Made with Ethos" footer. Extras or no footer on the reply cost the template's normal price.`,
    `- Upgrade to Everything: anyone who already bought single templates, three templates or "Make it special" pays Everything's price minus what they paid for those, never less than ${prices("upgrade")}.`,
    subscriptions
      ? `- Ethos for Two: ${plan("monthly")} a month or ${plan("yearly")} a year, a subscription that renews until it is cancelled (any time, from the account page; it then runs to the end of the period paid for, and a reminder email comes a week before a yearly renewal). One payment covers two people, the buyer and a partner who joins with an invite link: unlimited saved dates and trips, shared and editable on both phones, a reminder the day before each saved date, a whole date opened in Apple or Google Maps, and every gift template and every game pack while it runs. A 14-day right of withdrawal applies, less the days used.`
      : `- Ethos for Two: ${prices("pass")} for a year, paid once and never renewed automatically (a reminder email comes 14 days before it ends). It covers two people, the buyer and a partner who joins with an invite link: unlimited saved dates and trips, shared and editable on both phones, a reminder the day before each saved date, a whole date opened in Apple or Google Maps, and every gift template and every game pack while it runs.`,
    `- Game packs: ${prices("pack")} each, or included in Ethos for Two.`,
    ...(giftCardsOnSale() ? [`- Gift card, "Give Everything": ${prices("giftcard")}. The recipient gets a code to redeem for every template, forever.`] : []),
    `- No discount codes: the price shown is the price for everyone.`,
    `- Creator programme: creators earn ${CREATOR_COMMISSION_PCT}% of each sale that comes through their personal link, after VAT and refunds. Buyers pay the normal price. Details: ${localizedUrl("en", "/creators")}`,
  ];
}

export function briefFaq(): string[] {
  return [
    "## FAQ",
    "",
    ...pricingFaq(en.pricing.faq, { giftCards: giftCardsOnSale(), subscriptions: subscriptionsEnabled() }).flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
  ];
}
