/**
 * How the two figurines look from the front at any point of a turn. They are drawn flat, in SVG,
 * but built as a few points in 3D round a vertical axle and projected, so turning them turns them:
 * the tutu's pleats slide round, the bun passes behind the head and comes back in front of it, the
 * knee of the raised leg swings out towards you and away; the swans go round each other on their
 * mirror pond and meet, twice a turn, as a heart.
 *
 * Units are the figurine's own: x across, y down (so heights are negative), z towards you. The
 * pedestal's foot is the origin. `turn` is the fraction of a full turn, 0 = facing you.
 */
export const TILT = 0.42;

type V3 = { x: number; y: number; z: number };
export type P = { x: number; y: number; z: number };

const round = (n: number): number => Math.round(n * 100) / 100;
/** Screen position of a point in the figurine's space: depth towards you drops it a little. */
export const project = (p: V3): P => ({ x: round(p.x), y: round(p.y + p.z * TILT), z: round(p.z) });

const smooth = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** Facing `turn` (0 = towards you): which way is forward, and which way is her right hand. */
export function facing(turn: number) {
  const a = turn * Math.PI * 2;
  return { f: { x: Math.sin(a), z: Math.cos(a) }, r: { x: -Math.cos(a), z: Math.sin(a) } };
}

/* ------------------------------------------------------------------ ballerina */

export const WAIST = -57;
const SHOULDER = -81;
const HEAD = -94;

export type Arm = { d: string; z: number; hand: P };
export type BallerinaPose = {
  /** The tutu's frilled rim, as a closed path. */
  rim: string;
  /** Pleats on the side facing you: from the waist to the rim, with how much each shows. */
  pleats: { x1: number; y1: number; x2: number; y2: number; o: number }[];
  /** Beads sewn on the top layer that face you. */
  beads: { x: number; y: number; o: number }[];
  /** The raised leg: hip, knee and pointed toe, and whether the knee is nearer than the standing leg. */
  passe: { hip: P; knee: P; toe: P; front: boolean };
  /** Half the width of the torso at the shoulders and at the waist, narrowing in profile. */
  shoulders: number;
  waist: number;
  /** Where the front of the bodice is, and how much of it shows (0 from behind). */
  seam: { x: number; o: number };
  lacing: { x: number; o: number };
  /** Hair: a cap over the head, pushed to the back of it. */
  hair: { x: number; y: number };
  /** The face: its centre, width, and how much of it shows. */
  face: { x: number; rx: number; o: number; eye: number };
  bun: P;
  arms: [Arm, Arm];
};

/** Her pose `turn` of the way round. */
export function ballerina(turn: number): BallerinaPose {
  const { f, r } = facing(turn);
  const a = turn * Math.PI * 2;
  const at = (lat: number, up: number, fwd: number, base = 0): P => project({ x: lat * r.x + fwd * f.x, y: base - up, z: lat * r.z + fwd * f.z });

  // The tutu: a disc at the waist whose frill and pleats turn with her.
  const R = 24;
  const N = 30;
  const rim = Array.from({ length: N }, (_, i) => {
    const phi = (i / N) * Math.PI * 2 + a;
    const radius = R * (i % 2 ? 1.05 : 0.92);
    const p = project({ x: radius * Math.sin(phi), y: WAIST + 1, z: radius * Math.cos(phi) });
    return `${i ? "L" : "M"}${p.x} ${p.y}`;
  }).join(" ") + " Z";
  const pleats = Array.from({ length: 14 }, (_, j) => {
    const phi = (j / 14) * Math.PI * 2 + a;
    const c = Math.cos(phi);
    const inner = project({ x: 5 * Math.sin(phi), y: WAIST - 1, z: 5 * c });
    const outer = project({ x: R * 0.9 * Math.sin(phi), y: WAIST + 1, z: R * 0.9 * c });
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, o: round(smooth(-0.15, 0.6, c)) };
  }).filter((p) => p.o > 0);
  const beads = Array.from({ length: 9 }, (_, j) => {
    const phi = (j / 9) * Math.PI * 2 + a + 0.35;
    const c = Math.cos(phi);
    const p = project({ x: 14 * Math.sin(phi), y: WAIST - 2.2, z: 14 * c });
    return { x: p.x, y: p.y, o: round(smooth(0, 0.5, c)) };
  }).filter((b) => b.o > 0);

  // Passé: the working knee turned out to her right, the toe resting at the standing knee.
  const hip = at(2.4, 0, 0, WAIST);
  const knee = at(15.5, -17, 2.6, WAIST);
  const toe = at(0.6, -23, 1.6, WAIST);

  const across = (half: number, depth: number) => round(Math.sqrt((half * Math.cos(a)) ** 2 + (depth * Math.sin(a)) ** 2));
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  // Fifth position, en haut: each arm out from the shoulder, up, and round to meet the other above her head.
  const arm = (side: 1 | -1): Arm => {
    const p0 = at(side * 6.4, 0, 0, SHOULDER);
    const p1 = at(side * 12, 7, 2.4, SHOULDER);
    const p2 = at(side * 10.5, 23, 4.6, SHOULDER);
    const p3 = at(side * 1.6, 26.5, 4.8, SHOULDER);
    return { d: `M${p0.x} ${p0.y} C${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`, z: round((p1.z + p2.z + p3.z) / 3), hand: p3 };
  };

  return {
    rim,
    pleats,
    beads,
    passe: { hip, knee, toe, front: knee.z > 0 },
    shoulders: across(7.4, 3.6),
    waist: across(4.3, 3.2),
    seam: { x: round(4.2 * sin), o: round(smooth(0.05, 0.5, cos)) },
    lacing: { x: round(-4.2 * sin), o: round(smooth(0.05, 0.5, -cos)) },
    hair: { x: round(-2.3 * sin), y: HEAD - 1.6 },
    face: { x: round(2.6 * sin), rx: round(5.3 - 1.9 * Math.abs(sin)), o: round(smooth(-0.5, -0.05, cos)), eye: round(smooth(0.25, 0.65, cos)) },
    bun: project({ x: -6.3 * sin, y: HEAD - 3, z: -6.3 * cos }),
    arms: [arm(1), arm(-1)],
  };
}

/* --------------------------------------------------------------------- swans */

/** How far each swan's body sits from the middle of the pond. */
export const SWAN_GAP = 9;

export type SwanPose = {
  /** Where on the pond, projected. */
  x: number;
  y: number;
  z: number;
  scale: number;
  /** How far round to side-on it is: 1 facing right, -1 facing left, 0 facing you or away. */
  side: number;
  /** How much of the side-on drawing shows, and of the front or back one. */
  profile: number;
  front: number;
  back: number;
};

/** The pair `turn` of the way round, nearest last so it draws on top. */
export function swans(turn: number): SwanPose[] {
  const a = turn * Math.PI * 2;
  const one = (sign: 1 | -1): SwanPose => {
    // The pond turns anticlockwise seen from above; each swan faces the other across it.
    const x = -sign * SWAN_GAP * Math.cos(a);
    const z = -sign * SWAN_GAP * Math.sin(a);
    const hx = sign * Math.cos(a);
    const hz = sign * Math.sin(a);
    const profile = smooth(0.14, 0.44, Math.abs(hx));
    const p = project({ x, y: 0, z });
    return { x: p.x, y: p.y, z: p.z, scale: round(1 + z * 0.012), side: round(Math.sign(hx) * Math.max(0.3, Math.abs(hx))), profile: round(profile), front: round((1 - profile) * (hz > 0 ? 1 : 0)), back: round((1 - profile) * (hz > 0 ? 0 : 1)) };
  };
  return [one(1), one(-1)].sort((p, q) => p.z - q.z);
}

/** How nearly the two make a heart right now: 1 side by side facing each other, 0 a quarter turn off. */
export function heartness(turn: number): number {
  return round(smooth(0.93, 0.995, Math.abs(Math.cos(turn * Math.PI * 2))));
}
