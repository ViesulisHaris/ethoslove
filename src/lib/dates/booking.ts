import { env } from "@/lib/env";
import type { PlaceKind } from "./kinds";

/*
 * "Book a table" (BRIEF-dates2.md 5). A place gets the link when its map entry names a booking page.
 * No booking partner has an account yet, so the link is the plain address. When one does, its id
 * goes in one optional variable (NEXT_PUBLIC_BOOKING_PARTNER, "<host>?<param>=<id>") and is added
 * only to pages on that partner's own site; those links, and only those, are marked sponsored.
 */

export type BookingLink = { href: string; sponsored: boolean };

/** The kinds of place a table is booked at. */
export const TABLE_KINDS: readonly PlaceKind[] = ["restaurant", "bar", "cafe", "dessert", "winery"];

const HOST = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PARAM = /^[A-Za-z0-9_.-]{1,40}$/;
const ID = /^[A-Za-z0-9_.:-]{1,80}$/;

/** "<host>?<param>=<id>" as a host and the parameters to add, or null when it is not that. */
export function parseBookingPartner(value: string | undefined): { host: string; params: [string, string][] } | null {
  const text = value?.trim();
  if (!text) return null;
  const q = text.indexOf("?");
  if (q < 1) return null;
  const host = text.slice(0, q).toLowerCase().replace(/^www\./, "");
  if (!HOST.test(host)) return null;
  const params: [string, string][] = [];
  for (const pair of text.slice(q + 1).split("&")) {
    const eq = pair.indexOf("=");
    if (eq < 1) return null;
    const name = pair.slice(0, eq);
    const id = pair.slice(eq + 1);
    if (!PARAM.test(name) || !ID.test(id)) return null;
    params.push([name, id]);
  }
  return params.length > 0 ? { host, params } : null;
}

/** A place's booking page as the link opens it: with the partner's id added when the page is on the partner's site, and marked paid only then. Null for anything that is not an http(s) address. */
export function bookingLink(url: string | undefined, partner: string | undefined = env.bookingPartner): BookingLink | null {
  const text = url?.trim();
  if (!text) return null;
  let page: URL;
  try {
    page = new URL(text);
  } catch {
    return null;
  }
  if ((page.protocol !== "https:" && page.protocol !== "http:") || !page.hostname.includes(".")) return null;
  const deal = parseBookingPartner(partner);
  const host = page.hostname.toLowerCase();
  if (!deal || (host !== deal.host && !host.endsWith(`.${deal.host}`))) return { href: page.toString(), sponsored: false };
  for (const [name, id] of deal.params) page.searchParams.set(name, id);
  return { href: page.toString(), sponsored: true };
}
