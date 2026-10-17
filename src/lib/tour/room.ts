/**
 * Which room a page belongs to, for the tour. Kept apart from the steps themselves because the
 * layouts import it on every page, and the steps only ever load with the tour.
 */
export const TOUR_ROOMS = ["dates", "editor", "games", "trips"] as const;
export type TourRoom = (typeof TOUR_ROOMS)[number];

/**
 * Where each room's pages live. `exact` is a room that is one page: `/dates/<city>` is a static
 * page written for search engines, not the explorer, and the tour there would wait for a list that
 * never comes (and fetch its code for nothing).
 */
const ROOTS: Record<TourRoom, { path: string; exact?: true }> = {
  dates: { path: "/dates", exact: true },
  editor: { path: "/create" },
  games: { path: "/games" },
  trips: { path: "/trips" },
};

/**
 * Where a gift is running. The whole screen belongs to the gift there, and the person looking at
 * it was sent a link, not shown round a website. The layouts that mount the tour never cover these
 * paths anyway; this makes sure a future one can't either.
 */
const NEVER = ["/g", "/demo"];

/** Takes the path with or without a locale prefix, since callers get it from either router. */
const bare = (pathname: string) => pathname.replace(/^\/(?:en|es)(?=\/|$)/, "") || "/";
const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

export function roomForPath(pathname: string): TourRoom | null {
  const path = bare(pathname);
  if (NEVER.some((root) => under(path, root))) return null;
  return TOUR_ROOMS.find((room) => (ROOTS[room].exact ? path === ROOTS[room].path : under(path, ROOTS[room].path))) ?? null;
}
