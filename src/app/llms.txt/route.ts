import { BRAND } from "@/config/brand";
import { SITE } from "@/config/site";
import { OCCASIONS } from "@/config/occasions";
import { ABOUT_PATH, aboutCopy } from "@/content/about";
import { BLOG_POSTS } from "@/content/blog";
import { FINDER_PATH } from "@/content/finder";
import { DIGITAL_CARDS_PATH, digitalCardsCopy } from "@/content/digital-cards";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS } from "@/content/gift-guides";
import { LEGAL_ENTITY } from "@/content/legal";
import { PT_LETTER_PATH } from "@/content/pt-letter";
import { LOVE_QUIZ_PATH } from "@/content/love-language-quiz";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { templateSeo } from "@/content/template-seo";
import { DATE_KIND_COPY } from "@/content/date-kinds";
import { CITY_SLUGS } from "@/lib/cities/cities";
import { DATE_KINDS } from "@/lib/dates/date-kinds";
import { briefFaq, briefHowGifts, briefIntro, briefPricing } from "@/lib/llms/brief";
import { pressBrief } from "@/lib/press/shown";
import { FREE_SAVED_DATES } from "@/lib/pricing/products";
import { localizedUrl } from "@/lib/seo";
import { TRIPS } from "@/lib/trips/presets";
import { listManifests } from "@/templates/manifests";
import en from "../../../messages/en.json";
import { HALFWAY_TOOL_PATH } from "@/content/halfway-tool";

export const dynamic = "force-static";

/**
 * A plain-language brief of Ethos for AI assistants and answer engines (llmstxt.org): what it is,
 * every template and occasion page, prices and the FAQ, read from the same sources as the site.
 * The sections the help chat also tells its visitors come from src/lib/llms/brief.ts.
 */
export function GET() {
  const manifests = listManifests();
  // Who runs the site, in the About page's own words: what an assistant is asked right before someone pays.
  const about = aboutCopy("en", { templates: manifests.length, single: "" });
  const aboutSaid = (id: string, from = 0) => (about.sections.find((section) => section.id === id)?.paragraphs ?? []).slice(from).map((p) => `- ${p}`);
  // /digital-cards, by its own name, heading and description: none of the three reads a price, so none is given here (prices are in "Pricing" below).
  const cards = digitalCardsCopy("en", { single: "", pick3: "", everything: "", extras: "", photos: "", notePhotos: 0, count: manifests.length, paid: 0, ideas: 0, finder: false });

  const lines = [
    ...briefIntro(),
    "",
    "## Dates, trips, long distance and games",
    "",
    `- [Dates](${localizedUrl("en", "/dates")}): date ideas made from real places near you, on a map. Pick a town and a day; the page shows the forecast and the sunset, suggests ideas that suit the weather (a picnic is never offered in the rain), fills each idea with real cafés, viewpoints, restaurants, museums and things to play from OpenStreetMap, and saves the evening as a plan that is sent as a link. Free, with no account: the plan stays in the browser, and travels inside the link, unless it is saved to an account. A free account keeps up to ${FREE_SAVED_DATES} saved dates and trips; Ethos for Two keeps any number, shared with the partner.`,
    `- [Trips](${localizedUrl("en", "/trips")}): ${TRIPS.length} ready-made trips for couples (road trips, city breaks, islands and a train journey), each planned day by day with a map of the route and a plan for every evening, plus a free flight search that opens Aviasales, Google Flights, Skyscanner and Kayak already filled in, and links to tickets for the sights and to car hire. Ethos sells no travel and adds no booking fee; Aviasales, Tiqets and Auto Europe are affiliate partners, so a booking made through them may earn Ethos a commission at no cost to the traveler. Any trip can be turned into a gift: a boarding pass that opens on their phone.`,
    `- Date ideas by city: ${CITY_SLUGS.length} city pages (for example ${localizedUrl("en", `/dates/${CITY_SLUGS[0]}`)}), each with ideas ordered for that city and real places from the map.`,
    `- Date ideas by kind: ${DATE_KINDS.length} short lists (${DATE_KINDS.map((kind) => DATE_KIND_COPY[kind]!.nav.en.toLowerCase()).join(", ")}), each with a one-step planner that picks one for tonight from real places (for example ${localizedUrl("en", `/dates/ideas/${DATE_KINDS[0]}`)}).`,
    `- [Long distance](${localizedUrl("en", "/long-distance")}): for two towns, the distance between them, the city halfway along the great circle, how many hours apart their clocks are and when both people are awake; plus date ideas for two screens.`,
    `- [Halfway between two cities](${localizedUrl("en", HALFWAY_TOOL_PATH)}): type two towns and get the city halfway between them along the great circle, how far it is from each, and a link that carries the two towns. Free, no account.`,
    `- [Games](${localizedUrl("en", "/games")}): eight card games for two. How well do you know me?, Would you rather?, This or that? and Draw it, guess it play on one phone passed back and forth or on two phones joined by a four-letter room code; Memory (dealt from stickers or the couple's own photos, which never leave the phone), question cards, truth or dare (soft edition) and a roulette for the chores play on one phone. Every game's page lists its questions or says how it is played. No downloads, no accounts. Optional game packs add more cards to four of them (see Pricing).`,
    `- [Would you rather question of the day](${localizedUrl("en", "/games/today")}): one would you rather question a day for couples, the same for everyone. Pick an answer and send it by link; the other person picks before seeing yours, and both answers show side by side. The name and the answer travel after the # of the link and are never sent to a server.`,
    `- [Love language quiz](${localizedUrl("en", LOVE_QUIZ_PATH)}): a free love language quiz, in English and Spanish: 30 either/or questions, about 3 minutes, no email or account. It shows how the five love languages rank for the person taking it, then gives a link: the partner takes the same quiz and both see their results side by side, with what each needs from the other and a gift template that speaks each language. Answers stay in the browser. The five love languages are Gary Chapman's idea (The 5 Love Languages, 1992); the quiz and its questions are Ethos's own, not affiliated with him.`,
    "",
    "## Trips",
    "",
    ...TRIPS.map((trip) => `- [${trip.title.en}](${localizedUrl("en", `/trips/${trip.id}`)}): ${trip.days} days. ${trip.blurb.en}`),
    "",
    ...briefHowGifts(),
    "",
    "## Templates",
    "",
    ...manifests.map(
      (m) =>
        `- [${m.name.en}](${localizedUrl("en", `/templates/${m.slug}`)})${templateSeo(m.slug, "en") ? ` (${templateSeo(m.slug, "en")?.keyword.toLowerCase()})` : ""}: ${m.tagline.en} ${m.description.en} ${m.tier === "free" ? "Free." : "Premium."} Good for: ${m.occasions.map((o) => en.occasions[o]).join(", ")}.`,
    ),
    "",
    "## Occasions",
    "",
    ...OCCASIONS.map((o) => `- [${en.seo.occasion[o].title}](${localizedUrl("en", `/occasions/${o}`)}): ${en.seo.occasion[o].description}`),
    "",
    "## Gift ideas by who it's for",
    "",
    `- [Gift finder](${localizedUrl("en", FINDER_PATH)}): two questions (who it is for and the occasion) that end on three templates to watch and make, which a feeling can re-order. The answers are in the page's address, so a result can be shared.`,
    ...RECIPIENTS.map((r) => `- [${RECIPIENT_GUIDES[r].en.h1}](${localizedUrl("en", `/gifts/${recipientSlug(r)}`)}): ${RECIPIENT_GUIDES[r].en.description}`),
    "",
    "## Gift ideas by kind, and what a digital card is",
    "",
    ...GIFT_GUIDE_SLUGS.map((slug) => `- [${GIFT_GUIDES[slug].en.h1}](${localizedUrl("en", `/gifts/${slug}`)}): ${GIFT_GUIDES[slug].en.description}`),
    `- [${cards.breadcrumb}: ${cards.h1.toLowerCase()}](${localizedUrl("en", DIGITAL_CARDS_PATH)}): ${cards.description}`,
    "",
    "## Blog",
    "",
    ...BLOG_POSTS.map((p) => `- [${p.content.en.title}](${localizedUrl("en", `/blog/${p.slug}`)}): ${p.content.en.description}`),
    "",
    ...briefPricing(),
    "",
    "## Who makes Ethos",
    "",
    ...aboutSaid("company"),
    `- Registered address: ${LEGAL_ENTITY.address}.`,
    // The first paragraph of "paying" quotes a price in the visitor's currency; prices are in the section above.
    ...aboutSaid("paying", 1),
    ...aboutSaid("guarantee"),
    ...aboutSaid("privacy"),
    ...aboutSaid("contact"),
    `- [About Ethos](${localizedUrl("en", ABOUT_PATH)})`,
    "",
    // Ethos in numbers, once its real figures are in (lib/press/shown.ts); nothing before.
    ...pressBrief(),
    ...briefFaq(),
    "## Links",
    "",
    `- Home: ${SITE.url}`,
    `- Dates: ${localizedUrl("en", "/dates")}`,
    `- Trips: ${localizedUrl("en", "/trips")}`,
    `- Gifts: ${localizedUrl("en", "/gifts")}`,
    `- Templates: ${localizedUrl("en", "/templates")}`,
    `- Gift finder: ${localizedUrl("en", FINDER_PATH)}`,
    `- Occasions: ${localizedUrl("en", "/occasions")}`,
    `- Blog: ${localizedUrl("en", "/blog")}`,
    `- Pricing: ${localizedUrl("en", "/pricing")}`,
    `- Creators: ${localizedUrl("en", "/creators")}`,
    `- About: ${localizedUrl("en", ABOUT_PATH)}`,
    `- En español: ${localizedUrl("es")}`,
    `- Em português (carta digital): ${SITE.url}${PT_LETTER_PATH}`,
    `- Terms: ${localizedUrl("en", "/legal/terms")}`,
    `- Privacy: ${localizedUrl("en", "/legal/privacy")}`,
    `- Contact: ${BRAND.supportEmail}`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
