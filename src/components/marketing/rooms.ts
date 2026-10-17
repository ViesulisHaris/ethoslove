import { Gamepad2, Gift, Luggage, MapPinned, Plane, Tag } from "lucide-react";

/**
 * The rooms of the house, as the navbar and its menu list them. `match` is every path that belongs
 * to a room, so the bar can say where you are: Gifts has several front doors. `wide` rooms only join
 * the desktop bar from `xl`: six rooms and "Crear un regalo" overflow the pill at 1024px in Spanish,
 * so Pricing, which the footer and the menu also carry, steps out there.
 */
export const ROOMS = [
  { href: "/dates", key: "dates", Icon: MapPinned, match: ["/dates", "/plan"], wide: false },
  { href: "/trips", key: "trips", Icon: Luggage, match: ["/trips"], wide: false },
  { href: "/gifts", key: "gifts", Icon: Gift, match: ["/gifts", "/templates", "/occasions", "/create", "/demo"], wide: false },
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
