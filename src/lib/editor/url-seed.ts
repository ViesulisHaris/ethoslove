import type { GiftUnwrap } from "@/lib/gift/schema";
import type { Plan } from "@/lib/dates/plan";
import type { Airport } from "@/lib/trips/airports";
import type { Trip } from "@/lib/trips/presets";
import type { GiftSeed } from "./gift-seed";

/**
 * A gift that starts half made, asked for in the editor's own address rather than left behind in
 * sessionStorage by another page (./gift-seed). The iPhone app opens the editor this way, since its
 * trips and plans live in the app, not in the web view's storage; a link works the same on the site:
 *
 *   /create/pack-your-bags?seed=trip:<id>   the ticket filled in from a preset trip
 *   /create/<slug>?unwrap=trip:<id>          that trip as "a surprise inside" any gift
 *   /create/<slug>?unwrap=plan#p=<encoded>   a planned date (the /plan link's own encoding) as the surprise
 *
 * The editor reads it once, builds the seed with the same helpers the site's own buttons use, and
 * takes the parameters out of the address. Everything built here is checked again by the template's
 * schema and the gift schema (mergeSeedFields, seedUnwrap), like any other seed.
 */
export type UrlSeedRequest = { trip?: string; unwrapTrip?: string; plan?: string };

const TRIP_PARAM = /^trip:([a-z0-9]+(?:-[a-z0-9]+)*)$/;
/** The plan rides after the #, as /plan writes it, so it never reaches a server log. */
const PLAN_HASH = /(?:^#|&)p=([A-Za-z0-9_-]{1,8000})(?=&|$)/;

export function readUrlSeed(search: URLSearchParams, hash: string): UrlSeedRequest | null {
  const trip = TRIP_PARAM.exec(search.get("seed") ?? "")?.[1];
  const unwrap = search.get("unwrap") ?? "";
  const unwrapTrip = TRIP_PARAM.exec(unwrap)?.[1];
  const plan = unwrap === "plan" ? PLAN_HASH.exec(hash)?.[1] : undefined;
  if (!trip && !unwrapTrip && !plan) return null;
  return { ...(trip ? { trip } : {}), ...(unwrapTrip ? { unwrapTrip } : {}), ...(plan ? { plan } : {}) };
}

/** The address without the seed: the parameters and a plan's #p= go, anything else stays. */
export function withoutUrlSeed(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("seed");
  url.searchParams.delete("unwrap");
  if (PLAN_HASH.test(url.hash)) url.hash = "";
  return `${url.pathname}${url.search}${url.hash}`;
}

export type UrlSeedHelpers = {
  getTrip: (id: string) => Trip | undefined;
  tripGiftSlug: string;
  tripGiftFields: (trip: Trip, locale: "en" | "es", from?: Airport | null) => Record<string, unknown>;
  tripUnwrap: (trip: Trip, locale: "en" | "es", options?: { from?: Airport | null }) => GiftUnwrap;
  decodePlan: (encoded: string) => Plan | null;
  planUnwrap: (plan: Plan, locale: "en" | "es", options?: { link?: string; title?: string }) => GiftUnwrap;
  ideaTitle: (id: string | undefined, locale: "en" | "es") => string | undefined;
};

/** What the address asked for, as a gift seed, and what the surprise came from (to find its photographs). */
export type BuiltUrlSeed = { seed: GiftSeed; trip?: Trip; plan?: Plan; link?: string; title?: string };

/**
 * The seed a request builds for this template, with the site's own helpers (passed in, so the trips
 * load only when a link asks for one). `lastFrom` is the airport they last flew from in this browser;
 * a road trip starts where its road does instead. Null when nothing in it applies here.
 */
export function buildUrlSeed(slug: string, request: UrlSeedRequest, locale: "en" | "es", lastFrom: Airport | null, helpers: UrlSeedHelpers): BuiltUrlSeed | null {
  let fields: Record<string, unknown> = {};
  const seedTrip = request.trip ? helpers.getTrip(request.trip) : undefined;
  // Only the ticket template takes a trip's fields; anywhere else they would be noise the schema drops.
  if (seedTrip && slug === helpers.tripGiftSlug) fields = helpers.tripGiftFields(seedTrip, locale, seedTrip.kind === "road" ? null : lastFrom);

  const unwrapTrip = request.unwrapTrip ? helpers.getTrip(request.unwrapTrip) : undefined;
  if (unwrapTrip) {
    const unwrap = helpers.tripUnwrap(unwrapTrip, locale, { from: unwrapTrip.kind === "road" ? null : lastFrom });
    return { seed: { slug, fields, unwrap: unwrap as unknown as Record<string, unknown> }, trip: unwrapTrip };
  }
  const plan = request.plan ? helpers.decodePlan(request.plan) : null;
  if (plan && plan.stops.length > 0) {
    const link = `${locale === "es" ? "/es" : ""}/plan#p=${request.plan}`;
    const title = helpers.ideaTitle(plan.idea, locale);
    const unwrap = helpers.planUnwrap(plan, locale, { link, ...(title ? { title } : {}) });
    return { seed: { slug, fields, unwrap: unwrap as unknown as Record<string, unknown> }, plan, link, ...(title ? { title } : {}) };
  }
  return Object.keys(fields).length > 0 ? { seed: { slug, fields } } : null;
}
