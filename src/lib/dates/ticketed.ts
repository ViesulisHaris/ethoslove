import type { PlaceKind } from "./kinds";

/**
 * Which places a "Tickets" button belongs on. A button that finds nothing is worse than none, so
 * a kind says yes only where a couple would usually pay at the door and Tiqets usually sells that
 * door: museums, zoos and aquariums, planetariums, theme parks. Galleries and landmarks sell
 * tickets when they are famous (the Uffizi, a castle) and not when they are a shop window or a
 * statue, so they need an encyclopedia entry first. Everything else says no, including cinemas and
 * theatres, whose tickets are for a showing Tiqets doesn't sell.
 *
 * Every kind is listed, so a new kind in kinds.ts fails the type check until it is decided here.
 */
export type Tickets = "yes" | "famous" | "no";

export const TICKETS = {
  restaurant: "no",
  bar: "no",
  cafe: "no",
  dessert: "no",
  viewpoint: "no",
  park: "no",
  garden: "no",
  beach: "no",
  picnic: "no",
  museum: "yes",
  gallery: "famous",
  cinema: "no",
  theatre: "no",
  planetarium: "yes",
  bookshop: "no",
  landmark: "famous",
  bowling: "no",
  minigolf: "no",
  arcade: "no",
  escape: "no",
  climbing: "no",
  skating: "no",
  karaoke: "no",
  boats: "no",
  zoo: "yes",
  themepark: "yes",
  spa: "no",
  winery: "no",
} as const satisfies Record<PlaceKind, Tickets>;

export const TICKETED_KINDS = (Object.keys(TICKETS) as PlaceKind[]).filter((k) => TICKETS[k] !== "no");

/** Tiqets' search takes a sentence; past this it is not a place name any more. */
const QUERY_MAX = 100;

/**
 * Whether this place gets a "Tickets" button. `named` is false for a place the map has no name
 * for (there is nothing to search); `notable` is whether it has an encyclopedia entry. A stop in
 * a saved plan doesn't carry that, so a gallery or landmark there gets no button.
 */
export function sellsTickets(place: { kind: PlaceKind; named?: boolean; notable?: boolean }): boolean {
  if (place.named === false) return false;
  const tickets: Tickets = TICKETS[place.kind] ?? "no";
  return tickets === "yes" || (tickets === "famous" && place.notable === true);
}

/**
 * What to ask Tiqets for: the place and the town it is in, since "Science Museum" alone could be
 * in any of fifty cities. The town is left off when the name already says it.
 */
export function ticketQuery(name: string, where?: string): string {
  const place = name.trim();
  const town = (where ?? "").trim();
  const query = town && !place.toLowerCase().includes(town.toLowerCase()) ? `${place} ${town}` : place;
  return query.slice(0, QUERY_MAX).trim();
}
