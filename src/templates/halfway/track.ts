import { haversineKm } from "../_shared/places";

/**
 * The way between two homes. The kilometres are real, every leg measured over the globe, but
 * the line the plane flies is a hand-drawn arc on a postcard, so its geometry lives in the
 * card's own units and is measured by arc length: the plane keeps an even pace along it.
 */

export type Pt = { x: number; y: number };

/** The distance travelled through every place in order, each leg as the crow flies. */
export function routeKm(places: { lat: number; lng: number }[]): number {
  let km = 0;
  for (let i = 1; i < places.length; i++) km += haversineKm(places[i - 1], places[i]);
  return km;
}

/** Points along a quadratic curve from a to b, bowed towards the control point. */
export function arc(a: Pt, control: Pt, b: Pt, segments = 48): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    out.push({ x: u * u * a.x + 2 * u * t * control.x + t * t * b.x, y: u * u * a.y + 2 * u * t * control.y + t * t * b.y });
  }
  return out;
}

export type Track = {
  /** SVG path through every point. */
  path: string;
  length: number;
  /** Position and heading (degrees, screen space) at a fraction of the length. */
  at: (t: number) => Pt & { heading: number };
  /** SVG path of the part already travelled, ending exactly where the plane is. */
  upTo: (t: number) => string;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fmt = (p: Pt) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

export function track(points: Pt[]): Track {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const length = cum[cum.length - 1] ?? 0;
  const first = points[0] ?? { x: 0, y: 0 };
  const usable = points.length >= 2 && length > 0;

  // The segment holding a distance along the track, and how far into it.
  const locate = (d: number) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const segment = cum[i] - cum[i - 1];
    return { i, f: segment > 0 ? (d - cum[i - 1]) / segment : 0 };
  };

  const at = (t: number) => {
    if (!usable) return { x: first.x, y: first.y, heading: 0 };
    const { i, f } = locate(clamp01(t) * length);
    const a = points[i - 1];
    const b = points[i];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  };

  const upTo = (t: number) => {
    if (!usable) return `M${fmt(first)}`;
    const { i } = locate(clamp01(t) * length);
    return `M${points.slice(0, i).map(fmt).join(" L")} L${fmt(at(t))}`;
  };

  return { path: `M${points.map(fmt).join(" L")}`, length, at, upTo };
}
