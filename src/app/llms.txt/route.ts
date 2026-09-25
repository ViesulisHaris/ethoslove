import { BRAND } from "@/config/brand";
import { SITE } from "@/config/site";
import { OCCASIONS } from "@/config/occasions";
import { CITY_SLUGS } from "@/lib/cities/cities";
import { CREATOR_COMMISSION_PCT } from "@/lib/commerce/creators";
import {
  CHARGED_CURRENCIES,
  FREE_SAVED_DATES,
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
import { TRIPS } from "@/lib/trips/presets";
import { listManifests } from "@/templates/manifests";
import { pricingFaq } from "@/components/pricing/offers";
import en from "../../../messages/en.json";

export const dynamic = "force-static";

/**
 * A plain-language brief of Ethos for AI assistants and answer engines (llmstxt.org): what it is,
 * every template and occasion page, prices and the FAQ, read from the same sources as the site.
 */
export function GET() {
  const manifests = listManifests();
  const free = manifests.filter((m) => m.tier === "free").map((m) => m.name.en);
  // Only currencies checkout really charges in: a price nobody can pay is not a price.
  const prices = (id: ProductId) => CHARGED_CURRENCIES.map((c) => formatAmount(PRODUCTS[id].amounts[c], c)).join(" / ");
  const plan = (p: MembershipPlan) => CHARGED_CURRENCIES.map((c) => formatAmount(membershipAmount(p, c), c)).join(" / ");
  // Nothing about the gift card while it isn't on sale (GIFT_CARDS_ENABLED, read at build time here),
  // and Ethos for Two described the way it is sold (STRIPE_SUBSCRIPTIONS_ENABLED, likewise).
  const giftCards = giftCardsOnSale();
  const subscriptions = subscriptionsEnabled();

  const lines = [
    `# ${BRAND.name}`,
    "",
    `> ${BRAND.name} (${BRAND.domain}) makes personal, animated digital gifts. You pick a template, add their name, your message, photos and a song, and send the gift as a link or a QR code. It opens on their phone as a short interactive experience, in English or Spanish, with no app to install. Free to start; premium templates and extras are a one-time payment. The one membership, Ethos for Two, covers a couple: unlimited saved dates and trips shared on both their phones, and every template and game pack while it runs.`,
    "",
    `People use ${BRAND.name} when a text feels too small and a physical gift is too slow or too far away: birthdays, anniversaries, Valentine's Day, long-distance relationships, apologies, Mother's Day and Father's Day, weddings, graduations and Christmas.`,
    "",
    "## Dates, trips, long distance and games",
    "",
    `- [Dates](${localizedUrl("en", "/dates")}): date ideas made from real places near you, on a map. Pick a town and a day; the page shows the forecast and the sunset, suggests ideas that suit the weather (a picnic is never offered in the rain), fills each idea with real cafés, viewpoints, restaurants, museums and things to play from OpenStreetMap, and saves the evening as a plan that is sent as a link. Free, with no account: the plan stays in the browser, and travels inside the link, unless it is saved to an account. A free account keeps up to ${FREE_SAVED_DATES} saved dates and trips; Ethos for Two keeps any number, shared with the partner.`,
    `- [Trips](${localizedUrl("en", "/trips")}): ${TRIPS.length} ready-made trips for couples (road trips, city breaks, islands and a train journey), each planned day by day with a map of the route and a plan for every evening, plus a free flight search that opens Aviasales, Google Flights, Skyscanner and Kayak already filled in, and links to tickets for the sights and to car hire. Ethos sells no travel and adds no booking fee; Aviasales, Tiqets and Auto Europe are affiliate partners, so a booking made through them may earn Ethos a commission at no cost to the traveller. Any trip can be turned into a gift: a boarding pass that opens on their phone.`,
    `- Date ideas by city: ${CITY_SLUGS.length} city pages (for example ${localizedUrl("en", `/dates/${CITY_SLUGS[0]}`)}), each with ideas ordered for that city and real places from the map.`,
    `- [Long distance](${localizedUrl("en", "/long-distance")}): for two towns, the distance between them, the city halfway along the great circle, how many hours apart their clocks are and when both people are awake; plus date ideas for two screens.`,
    `- [Games](${localizedUrl("en", "/games")}): seven card games for two. How well do you know me?, Would you rather? and Draw it, guess it play on one phone passed back and forth or on two phones joined by a four-letter room code; Memory (dealt from stickers or the couple's own photos, which never leave the phone), question cards, truth or dare (soft edition) and a roulette for the chores play on one phone. No downloads, no accounts. Optional game packs add more cards to four of them (see Pricing).`,
    "",
    "## Trips",
    "",
    ...TRIPS.map((trip) => `- [${trip.title.en}](${localizedUrl("en", `/trips/${trip.id}`)}): ${trip.days} days. ${trip.blurb.en}`),
    "",
    "## How gifts work",
    "",
    `1. Choose one of ${manifests.length} templates. Every one has a free live demo.`,
    "2. Add the recipient's name, your message and photos, and music: a track from the Ethos library or your own file, which plays as the gift opens, or a real song, free on every gift: the recipient taps it at the end to hear Apple Music's 30-second preview, with a link to the full song.",
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
    `- Make it special: ${prices("extras")}, paid once, for a free template (${free.join(" or ")}): that template's paid extras (a video, a voice message, up to 20 photos, no footer, scheduling and a password), forever.`,
    `- Sending one back: someone who receives a paid gift made with a premium template can send one back in the same template for free, once, with the "Made with Ethos" footer. Extras or no footer on the reply cost the template's normal price.`,
    `- Upgrade to Everything: anyone who already bought single templates, three templates or "Make it special" pays Everything's price minus what they paid for those, never less than ${prices("upgrade")}.`,
    subscriptions
      ? `- Ethos for Two: ${plan("monthly")} a month or ${plan("yearly")} a year, a subscription that renews until it is cancelled (any time, from the account page; it then runs to the end of the period paid for, and a reminder email comes a week before a yearly renewal). One payment covers two people, the buyer and a partner who joins with an invite link: unlimited saved dates and trips, shared and editable on both phones, a reminder the day before each saved date, a whole date opened in Apple or Google Maps, and every gift template and every game pack while it runs. A 14-day right of withdrawal applies, less the days used.`
      : `- Ethos for Two: ${prices("pass")} for a year, paid once and never renewed automatically (a reminder email comes 14 days before it ends). It covers two people, the buyer and a partner who joins with an invite link: unlimited saved dates and trips, shared and editable on both phones, a reminder the day before each saved date, a whole date opened in Apple or Google Maps, and every gift template and every game pack while it runs.`,
    `- Game packs: ${prices("pack")} each, or included in Ethos for Two.`,
    ...(giftCards ? [`- Gift card, "Give Everything": ${prices("giftcard")}. The recipient gets a code to redeem for every template, forever.`] : []),
    `- No discount codes: the price shown is the price for everyone.`,
    `- Creator programme: creators earn ${CREATOR_COMMISSION_PCT}% of each sale that comes through their personal link, after VAT and refunds. Buyers pay the normal price. Details: ${localizedUrl("en", "/creators")}`,
    "",
    "## FAQ",
    "",
    ...pricingFaq(en.pricing.faq, { giftCards, subscriptions }).flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
    "## Links",
    "",
    `- Home: ${SITE.url}`,
    `- Dates: ${localizedUrl("en", "/dates")}`,
    `- Trips: ${localizedUrl("en", "/trips")}`,
    `- Gifts: ${localizedUrl("en", "/gifts")}`,
    `- Templates: ${localizedUrl("en", "/templates")}`,
    `- Occasions: ${localizedUrl("en", "/occasions")}`,
    `- Pricing: ${localizedUrl("en", "/pricing")}`,
    `- Creators: ${localizedUrl("en", "/creators")}`,
    `- En español: ${localizedUrl("es")}`,
    `- Terms: ${localizedUrl("en", "/legal/terms")}`,
    `- Privacy: ${localizedUrl("en", "/legal/privacy")}`,
    `- Contact: ${BRAND.supportEmail}`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
