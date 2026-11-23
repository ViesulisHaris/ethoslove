import { Gamepad2, Gift, Luggage, MapPinned, Plane, Tag } from "lucide-react";

/**
 * The rooms of the house, as the navbar and its menu list them: Gifts first, because gifts are what
 * Ethos is for, and the other rooms hand over to one. `match` is every path that belongs to a room,
 * so the bar can say where you are: Gifts has several front doors. Its link opens the gallery
 * itself (/templates), where a gift is chosen: the owner, 23 Nov 2026, "when i click gifts i want to
 * see this page. the chooser, not some other page that adds friction". /gifts stays, as the page
 * the footer and a search for "digital gifts" lead to. `wide` rooms only join
 * the desktop bar from `xl`: six rooms and "Crear un regalo" overflow the pill at 1024px in Spanish,
 * so Pricing, which the footer and the menu also carry, steps out there.
 */
export const ROOMS = [
  { href: "/templates", key: "gifts", Icon: Gift, match: ["/gifts", "/templates", "/occasions", "/create", "/demo"], wide: false },
  { href: "/dates", key: "dates", Icon: MapPinned, match: ["/dates", "/plan"], wide: false },
  { href: "/trips", key: "trips", Icon: Luggage, match: ["/trips"], wide: false },
  { href: "/long-distance", key: "longDistance", Icon: Plane, match: ["/long-distance"], wide: false },
  { href: "/games", key: "games", Icon: Gamepad2, match: ["/games"], wide: false },
  { href: "/pricing", key: "pricing", Icon: Tag, match: ["/pricing"], wide: true },
] as const;

export type RoomKey = (typeof ROOMS)[number]["key"];

/** The room a (locale-less) path is in, or null on the front page and the pages between rooms. */
export function roomOf(pathname: string): RoomKey | null {
  const room = ROOMS.find(({ match }) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
  return room?.key ?? null;
}
