/** A point on the earth, in degrees. */
export type LatLng = { lat: number; lng: number };

const R_KM = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The point half way between two people along the great circle, which on a long hop is a long
 * way from the average of their coordinates (London to Tokyo passes over Siberia, not Iran).
 */
export function midpoint(a: LatLng, b: LatLng): LatLng {
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const dLng = rad(b.lng - a.lng);
  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);
  const lat = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2));
  const lng = rad(a.lng) + Math.atan2(by, Math.cos(lat1) + bx);
  return { lat: round(deg(lat), 5), lng: round(((deg(lng) + 540) % 360) - 180, 5) };
}

/** A stroll, not a march: about 12 minutes to the kilometre, and streets are never straight. */
export function walkingMinutes(km: number): number {
  return Math.max(1, Math.round(km * 1.3 * 12));
}

export const round = (n: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** How far a search may reach. Places come from map tiles about two kilometres wide, and a wide circle means dozens of them. */
export const SEARCH_RADII_M = [600, 1000, 1500, 2000] as const;

/**
 * Snaps a search to a grid of about a hundred metres and a few fixed radii, so two people looking
 * at the same neighbourhood ask the same question and the second answer comes out of the cache;
 * and so that nobody's exact position is ever in a URL.
 */
export function snapSearch(center: LatLng, radiusM: number, steps: readonly number[] = SEARCH_RADII_M): { center: LatLng; radiusM: number } {
  const radius = steps.find((s) => radiusM <= s) ?? steps[steps.length - 1];
  return { center: { lat: round(center.lat, 3) + 0, lng: round(center.lng, 3) + 0 }, radiusM: radius };
}

export const isLatLng = (lat: number, lng: number): boolean => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export function formatDistance(km: number, locale: "en" | "es"): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
}
