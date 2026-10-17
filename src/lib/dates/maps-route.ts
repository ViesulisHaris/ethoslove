import { distanceKm, WALK_KM, type LatLng } from "./geo";

/**
 * The whole date as one route in a maps app: the first stop to the last, through the others, in
 * the plan's order. Places go by their coordinates, never their names: a name is searched for again
 * by the maps app, and "Café Central" is in every city.
 *
 * Google: the Maps URLs API (`/maps/dir/?api=1`), `waypoints` separated by a pipe, written %7C as
 * Google asks (up to nine; a plan has at most eight stops). Apple: the unified Maps URLs of iOS 18.4
 * and macOS 15.4, whose `/directions` takes one `waypoint` per stop in between
 * (developer.apple.com/documentation/mapkit/unified-map-urls). Coordinates keep their commas, as both
 * documents write them. Both are walked when every leg is a walk, and otherwise left to the app,
 * which knows how the two of them get around better than a guess from here.
 */
export type MapsProvider = "google" | "apple";

const point = ({ lat, lng }: LatLng) => `${Number(lat.toFixed(6))},${Number(lng.toFixed(6))}`;

/** Every leg short enough to walk: the plan's own "12 min walk" between each pair. */
export const allWalkable = (stops: LatLng[]): boolean => stops.every((stop, i) => i === 0 || distanceKm(stops[i - 1], stop) <= WALK_KM);

/** The link, or null for a plan with fewer than two stops (a single stop has its own "Directions"). */
export function mapsRouteUrl(stops: LatLng[], provider: MapsProvider): string | null {
  if (stops.length < 2) return null;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const between = stops.slice(1, -1);
  const walking = allWalkable(stops);
  if (provider === "google") {
    const query = [`api=1`, `origin=${point(first)}`, `destination=${point(last)}`];
    if (between.length > 0) query.push(`waypoints=${between.map(point).join("%7C")}`);
    if (walking) query.push("travelmode=walking");
    return `https://www.google.com/maps/dir/?${query.join("&")}`;
  }
  const query = [`source=${point(first)}`, `destination=${point(last)}`, ...between.map((stop) => `waypoint=${point(stop)}`)];
  if (walking) query.push("mode=walking");
  return `https://maps.apple.com/directions?${query.join("&")}`;
}
