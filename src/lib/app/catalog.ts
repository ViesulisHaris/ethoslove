import { createHash } from "node:crypto";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { BRAND } from "@/config/brand";
import { OCCASIONS, OCCASION_META } from "@/config/occasions";
import { siteOrigin } from "@/lib/commerce/db";
import { catalogProducts } from "@/lib/commerce/app-store-products";
import { ideaImage, KIND_ART, KIND_ART_ALT } from "@/lib/dates/art";
import { STARTER_CITIES } from "@/lib/dates/cities";
import { BY_KIND, COST_IDS, COST_LABELS, COST_MARKS } from "@/lib/dates/cost";
import { IDEAS, VIBE_IDS, VIBE_KINDS, VIBES } from "@/lib/dates/ideas";
import { GROUP_IDS, GROUPS, KIND_IDS, KINDS } from "@/lib/dates/kinds";
import { WENT_AS_IDS, WENT_AS_LABELS } from "@/lib/dates/reviews";
import { TICKETS } from "@/lib/dates/ticketed";
import { GAMES } from "@/lib/games/catalogue";
import { PACK_IDS, PACKS } from "@/lib/games/packs";
import { AIRPORTS } from "@/lib/trips/airports";
import { tiqetsSearch, tripCarHire, tripTickets } from "@/lib/trips/partners";
import { TRIP_KINDS, TRIPS, tripImageSm } from "@/lib/trips/presets";
import { listManifests } from "@/templates/manifests";
import { MP4_PREVIEWS } from "@/templates/previews";

/**
 * GET /api/app/catalog: everything the iPhone app draws from that is the same for everybody — the
 * kinds of place and their groups, the date ideas, the trips, the airports, the templates, the
 * occasions, the games and packs, and what the App Store sells — in both languages, straight from
 * the modules the website itself renders from, so the app never keeps a copy of its own to drift.
 * The app ships a snapshot of this and refreshes it; `version` tells it whether anything changed.
 * Contract: Ethos app docs/ARCHITECTURE.md §2.4 / §2.6.1.
 */
type L = { en: string; es: string };

const both = (pick: (messages: typeof en) => string): L => ({ en: pick(en), es: pick(es as unknown as typeof en) });

/** The legal pages as the site serves them: English at the root, Spanish under /es. */
const sitePath = (path: string): L => ({ en: path, es: `/es${path}` });

/** Tiqets' short link, which every ticket URL starts with (lib/trips/partners.ts). */
const TIQETS_BASE = tiqetsSearch("", "en").split("?u=")[0] + "?u=";

function content() {
  return {
    site: siteOrigin(),
    groups: GROUP_IDS.map((id) => ({ id, ...GROUPS[id] })),
    kinds: KIND_IDS.map((id) => ({
      id,
      group: KINDS[id].group,
      label: KINDS[id].label,
      indoor: KINDS[id].indoor,
      free: KINDS[id].free,
      nameless: KINDS[id].nameless === true,
      cost: BY_KIND[id],
      tickets: TICKETS[id],
      image: KIND_ART[id],
      imageAlt: KIND_ART_ALT[id] ?? null,
    })),
    vibes: VIBE_IDS.map((id) => ({ id, label: VIBES[id], kinds: VIBE_KINDS[id] ? [...VIBE_KINDS[id]!] : null })),
    costs: COST_IDS.map((id) => ({ id, label: COST_LABELS[id], mark: COST_MARKS[id] })),
    wentAs: WENT_AS_IDS.map((id) => ({ id, label: WENT_AS_LABELS[id] })),
    ideas: IDEAS.map((idea) => ({ ...idea, image: ideaImage(idea.id) })),
    starterCities: STARTER_CITIES.map((city) => ({ ...city })),
    tripKinds: TRIP_KINDS.map((id) => ({ id, label: both((m) => m.trips.kind[id]) })),
    trips: TRIPS.map((trip) => ({
      ...trip,
      imageSm: trip.image ? tripImageSm(trip.image) : null,
      tickets: tripTickets(trip.id).map((ticket) => ({
        name: ticket.name,
        ...(ticket.stop ? { stop: ticket.stop } : {}),
        url: { en: tiqetsSearch(ticket.query, "en"), es: tiqetsSearch(ticket.query, "es") },
      })),
      carHire: tripCarHire(trip),
    })),
    airports: AIRPORTS,
    templates: listManifests().map((m) => ({
      slug: m.slug,
      name: m.name,
      tagline: m.tagline,
      description: m.description,
      occasions: m.occasions,
      styles: m.styles,
      tier: m.tier,
      features: m.features,
      thumbnail: m.thumbnail,
      previewMp4: MP4_PREVIEWS.includes(m.slug) ? `/templates/${m.slug}/preview.mp4` : null,
      defaultAccent: m.defaultAccent,
      heavy: m.heavy,
      sortOrder: m.sortOrder,
    })),
    occasions: OCCASIONS.map((id) => ({ id, emoji: OCCASION_META[id].emoji, label: both((m) => m.occasions[id]) })),
    games: GAMES.map((game) => ({
      key: game.key,
      path: game.href,
      rank: game.rank,
      suit: game.suit,
      sticker: game.sticker,
      phones: game.phones,
      minutes: game.minutes,
      title: both((m) => m.games[game.key].title),
      blurb: both((m) => m.games[game.key].blurb),
    })),
    // What the shelf shows before anybody owns a pack; the cards themselves never leave the server.
    packs: PACK_IDS.map((id) => {
      const { name, blurb, back, games, cards, adult, samples } = PACKS[id];
      return { id, name, blurb, back, games, cards, adult, samples };
    }),
    products: catalogProducts(),
    links: {
      terms: sitePath("/legal/terms"),
      privacy: sitePath("/legal/privacy"),
      withdraw: sitePath("/legal/withdraw"),
      support: BRAND.supportEmail,
      disclosure: both((m) => m.affiliate.disclosure),
      tiqetsBase: TIQETS_BASE,
    },
  };
}

export type AppCatalog = { version: string } & ReturnType<typeof content>;

/** The first 16 hex characters of the SHA-256 of the catalogue without its version. */
export function catalogVersion(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
}

let built: { catalog: AppCatalog; json: string } | null = null;

/** Built once per server: it only changes with a deploy. */
export function appCatalog(): { catalog: AppCatalog; json: string } {
  if (!built) {
    const body = content();
    const catalog: AppCatalog = { version: catalogVersion(body), ...body };
    built = { catalog, json: JSON.stringify(catalog) };
  }
  return built;
}
