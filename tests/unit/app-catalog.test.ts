import { describe, expect, it } from "vitest";
import { appCatalog, catalogVersion } from "@/lib/app/catalog";
import { etagMatches } from "@/lib/app/http";
import { APP_STORE_PRODUCTS, appStoreProduct } from "@/lib/commerce/app-store-products";
import { IDEAS } from "@/lib/dates/ideas";
import { KIND_IDS } from "@/lib/dates/kinds";
import { GAMES } from "@/lib/games/catalogue";
import { PACK_IDS } from "@/lib/games/packs";
import { TRIPS } from "@/lib/trips/presets";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";

const { catalog, json } = appCatalog();

/** A `{ en, es }` pair with words in both. */
const bothLanguages = (value: unknown) => {
  const pair = value as { en?: unknown; es?: unknown };
  return typeof pair?.en === "string" && pair.en.trim().length > 0 && typeof pair?.es === "string" && pair.es.trim().length > 0;
};

describe("the app catalogue", () => {
  it("has exactly the keys the app decodes", () => {
    expect(Object.keys(catalog)).toMatchInlineSnapshot(`
      [
        "version",
        "site",
        "groups",
        "kinds",
        "vibes",
        "costs",
        "wentAs",
        "ideas",
        "starterCities",
        "tripKinds",
        "trips",
        "airports",
        "templates",
        "occasions",
        "games",
        "packs",
        "products",
        "links",
      ]
    `);
  });

  it("is versioned by its own content", () => {
    const { version, ...body } = catalog;
    expect(version).toMatch(/^[0-9a-f]{16}$/);
    expect(catalogVersion(body)).toBe(version);
    expect(JSON.parse(json)).toEqual(catalog);
  });

  it("stays small enough for a phone to fetch on launch", () => {
    expect(json.length).toBeLessThan(400_000);
  });

  it("has every template, in both languages, in gallery order", () => {
    expect(catalog.templates.map((t) => t.slug).sort()).toEqual(TEMPLATE_MANIFESTS.map((m) => m.slug).sort());
    const orders = catalog.templates.map((t) => t.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    for (const t of catalog.templates) {
      expect(bothLanguages(t.name) && bothLanguages(t.tagline) && bothLanguages(t.description), t.slug).toBe(true);
      expect(t.thumbnail.poster).toMatch(/^\/templates\//);
      expect(t.previewMp4 === null || t.previewMp4 === `/templates/${t.slug}/preview.mp4`).toBe(true);
    }
  });

  it("has every trip, in both languages, with its small photo, tickets and car hire", () => {
    expect(catalog.trips.map((t) => t.id)).toEqual(TRIPS.map((t) => t.id));
    for (const trip of catalog.trips) {
      expect(bothLanguages(trip.title) && bothLanguages(trip.blurb), trip.id).toBe(true);
      for (const stop of trip.stops) expect(bothLanguages(stop.note), `${trip.id} ${stop.name}`).toBe(true);
      for (const day of trip.plan) {
        expect(bothLanguages(day.title), `${trip.id} day ${day.day}`).toBe(true);
        expect(day.items.en.length).toBe(day.items.es.length);
      }
      expect(trip.imageSm).toBe(trip.image ? trip.image.replace(/\.webp$/, "-sm.webp") : null);
      for (const ticket of trip.tickets) {
        expect(bothLanguages(ticket.name)).toBe(true);
        expect(ticket.url.en).toMatch(/^https:\/\/tiqets\.tpm\.lv\/.+%2Fen%2Fsearch/);
        expect(ticket.url.es).toMatch(/^https:\/\/tiqets\.tpm\.lv\/.+%2Fes%2Fsearch/);
      }
      expect(trip.carHire === null).toBe(trip.kind !== "road");
    }
  });

  it("has every date idea, in both languages, with its picture", () => {
    expect(catalog.ideas.map((i) => i.id)).toEqual(IDEAS.map((i) => i.id));
    for (const idea of catalog.ideas) {
      expect(bothLanguages(idea.title) && bothLanguages(idea.blurb) && bothLanguages(idea.twist), idea.id).toBe(true);
      expect(idea.image).toBe(`/dates/ideas/${idea.id}.webp`);
      for (const stop of idea.stops) for (const kind of stop) expect(KIND_IDS).toContain(kind);
    }
  });

  it("has every game, in both languages, and every pack without its cards", () => {
    expect(catalog.games.map((g) => g.key)).toEqual(GAMES.map((g) => g.key));
    for (const game of catalog.games) {
      expect(bothLanguages(game.title) && bothLanguages(game.blurb), game.key).toBe(true);
      expect(game.path).toBe(`/games/${game.key}`);
    }
    expect(catalog.packs.map((p) => p.id)).toEqual([...PACK_IDS]);
    for (const pack of catalog.packs) {
      expect(bothLanguages(pack.name) && bothLanguages(pack.blurb)).toBe(true);
      expect(pack.samples).toHaveLength(3);
      expect(Object.keys(pack).sort()).toEqual(["adult", "back", "blurb", "cards", "games", "id", "name", "samples"]);
    }
  });

  it("has the kinds with their cost, tickets and two pictures", () => {
    expect(catalog.kinds.map((k) => k.id)).toEqual(KIND_IDS);
    const museum = catalog.kinds.find((k) => k.id === "museum")!;
    expect(museum).toMatchObject({ group: "culture", cost: 1, tickets: "yes", image: "/dates/ideas/museum-then-wine.webp", imageAlt: "/dates/ideas/gallery-hop.webp" });
    expect(catalog.kinds.find((k) => k.id === "landmark")!.tickets).toBe("famous");
    expect(catalog.kinds.find((k) => k.id === "bowling")!.imageAlt).toBeNull();
    expect(catalog.kinds.find((k) => k.id === "viewpoint")!.nameless).toBe(true);
    for (const group of catalog.groups) expect(bothLanguages(group.label) && bothLanguages(group.blurb)).toBe(true);
    for (const occasion of catalog.occasions) expect(bothLanguages(occasion.label) && occasion.emoji.length > 0, occasion.id).toBe(true);
    for (const kind of catalog.tripKinds) expect(bothLanguages(kind.label), kind.id).toBe(true);
    expect(catalog.vibes.find((v) => v.id === "free")!.kinds).toBeNull();
  });

  it("names what the App Store sells and the web product each one is", () => {
    expect(catalog.products).toEqual([
      { id: "xyz.secuora.ethos.template", type: "consumable", webProduct: "single", tier: "premium", eurCents: 999 },
      { id: "xyz.secuora.ethos.special", type: "consumable", webProduct: "extras", tier: "free", eurCents: 749 },
      { id: "xyz.secuora.ethos.everything", type: "nonConsumable", webProduct: "everything", eurCents: 2499 },
      { id: "xyz.secuora.ethos.fortwo", type: "nonRenewing", webProduct: "pass", eurCents: 2999 },
      // Ethos for Two as App Store subscriptions: each carries its own plan's web price.
      { id: "xyz.secuora.ethos.fortwo.monthly", type: "autoRenewable", webProduct: "membership", plan: "monthly", eurCents: 499 },
      { id: "xyz.secuora.ethos.fortwo.yearly", type: "autoRenewable", webProduct: "membership", plan: "yearly", eurCents: 2999 },
      { id: "xyz.secuora.ethos.pack.deep", type: "nonConsumable", webProduct: "pack", packId: "deep", eurCents: 299 },
      { id: "xyz.secuora.ethos.pack.distance", type: "nonConsumable", webProduct: "pack", packId: "distance", eurCents: 299 },
      { id: "xyz.secuora.ethos.pack.spicy", type: "nonConsumable", webProduct: "pack", packId: "spicy", eurCents: 299 },
    ]);
    expect(APP_STORE_PRODUCTS.filter((p) => p.credit).map((p) => p.product)).toEqual(["single", "extras"]);
    expect(appStoreProduct("xyz.secuora.ethos.pack.spicy")?.packId).toBe("spicy");
    expect(appStoreProduct("com.other.app.thing")).toBeNull();
  });

  it("links the legal pages in both languages and the affiliate line", () => {
    expect(catalog.links).toMatchObject({
      terms: { en: "/legal/terms", es: "/es/legal/terms" },
      privacy: { en: "/legal/privacy", es: "/es/legal/privacy" },
      withdraw: { en: "/legal/withdraw", es: "/es/legal/withdraw" },
      tiqetsBase: "https://tiqets.tpm.lv/6ik2vRS7?u=",
    });
    expect(bothLanguages(catalog.links.disclosure)).toBe(true);
    expect(catalog.links.support).toContain("@");
  });
});

describe("If-None-Match", () => {
  it("matches the version, weak or strong, in a list or as *", () => {
    expect(etagMatches('"abc"', '"abc"')).toBe(true);
    expect(etagMatches('W/"abc"', '"abc"')).toBe(true);
    expect(etagMatches('"x", "abc"', '"abc"')).toBe(true);
    expect(etagMatches("*", '"abc"')).toBe(true);
    expect(etagMatches('"abd"', '"abc"')).toBe(false);
    expect(etagMatches(null, '"abc"')).toBe(false);
  });
});
