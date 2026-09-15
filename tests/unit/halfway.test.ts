import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { haversineKm } from "@/templates/_shared/places";
import { template } from "@/templates/halfway";
import { BLOW_FLOOR, FALL_SPEED, TOP_SPEED, glide, thrust, travel } from "@/templates/halfway/flight";
import { MAX_STOPS, fieldsSchema } from "@/templates/halfway/schema";
import { arc, routeKm, track } from "@/templates/halfway/track";

const LISBON = { name: "Lisbon", lat: 38.7223, lng: -9.1393 };
const BOSTON = { name: "Boston", lat: 42.3601, lng: -71.0589 };
const REYKJAVIK = { name: "Reykjavík", lat: 64.1466, lng: -21.9426 };
const AZORES = { name: "Ponta Delgada", lat: 37.7412, lng: -25.6756 };

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe("the real distance", () => {
  it("is the crow-flies distance between two places", () => {
    expect(routeKm([LISBON, BOSTON])).toBeCloseTo(haversineKm(LISBON, BOSTON), 6);
  });

  it("adds up every leg through a stop", () => {
    const via = routeKm([LISBON, REYKJAVIK, BOSTON]);
    expect(via).toBeCloseTo(haversineKm(LISBON, REYKJAVIK) + haversineKm(REYKJAVIK, BOSTON), 6);
    expect(via).toBeGreaterThan(routeKm([LISBON, BOSTON]));
  });

  it("is zero for a single place, or none", () => {
    expect(routeKm([LISBON])).toBe(0);
    expect(routeKm([])).toBe(0);
  });
});

describe("the settings", () => {
  it("starts a new gift on two real places, with the distance left to the map", () => {
    const blank = fieldsSchema.parse({});
    expect(blank.from).toMatchObject({ name: "Lisbon" });
    expect(blank.to).toMatchObject({ name: "Boston" });
    expect(blank.stops).toEqual([]);
    expect(blank.distanceKm).toBeUndefined();
    expect(blank).toMatchObject({ vehicle: "plane", yourIsland: "pink", theirIsland: "peach", palette: "blush" });
  });

  it("only offers the island colours and flyers it can draw", () => {
    expect(fieldsSchema.safeParse({ yourIsland: "orange" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ vehicle: "rocket" }).success).toBe(false);
    for (const vehicle of ["plane", "balloon", "bird"]) expect(fieldsSchema.safeParse({ vehicle }).success).toBe(true);
  });

  it("refuses a place without real coordinates, and a distance that isn't one", () => {
    expect(fieldsSchema.safeParse({ from: { name: "Nowhere", lat: 120, lng: 0 } }).success).toBe(false);
    expect(fieldsSchema.safeParse({ from: { name: "", lat: 1, lng: 1 } }).success).toBe(false);
    expect(fieldsSchema.safeParse({ distanceKm: 0 }).success).toBe(false);
    expect(fieldsSchema.safeParse({ distanceKm: 12.5 }).success).toBe(false);
    expect(fieldsSchema.safeParse({ distanceKm: 6863 }).success).toBe(true);
    expect(fieldsSchema.safeParse({ stops: Array.from({ length: MAX_STOPS + 1 }, () => LISBON) }).success).toBe(false);
  });

  it("asks for the places first in the editor, each with its own picker", () => {
    expect(template.leadFields?.keys).toEqual(["from", "to", "stops", "distanceKm"]);
    for (const key of template.leadFields?.keys ?? []) expect(template.fieldEditors?.[key]).toBeDefined();
  });

  it("uses the editor's usual buttons for the looks, like every other template", () => {
    for (const key of ["vehicle", "yourIsland", "theirIsland", "palette"]) expect(template.fieldEditors?.[key]).toBeUndefined();
    const described = describeObjectSchema(fieldsSchema);
    for (const key of ["vehicle", "yourIsland", "theirIsland", "palette"]) {
      const field = described.find((d) => d.key === key);
      // Four options or fewer render as the labelled button grid rather than a dropdown.
      expect(field?.widget).toBe("select");
      expect(field?.options?.length).toBeLessThanOrEqual(4);
      for (const option of field?.options ?? []) expect(template.fieldMeta?.en[key]?.options?.[option]).toBeTruthy();
    }
  });

  it("sends a reply the other way round", () => {
    const gift = fieldsSchema.parse({ from: LISBON, to: BOSTON, stops: [AZORES, REYKJAVIK], distanceKm: 7000, palette: "sea", yourIsland: "mint", theirIsland: "lilac", vehicle: "bird" });
    const reply = template.replyFields?.(gift) ?? {};
    expect(reply.from).toEqual(BOSTON);
    expect(reply.to).toEqual(LISBON);
    expect(reply.stops).toEqual([REYKJAVIK, AZORES]);
    expect(reply.distanceKm).toBe(7000);
    expect(reply).toMatchObject({ yourIsland: "lilac", theirIsland: "mint", vehicle: "bird" });
    expect(gift.stops).toEqual([AZORES, REYKJAVIK]);
    expect(fieldsSchema.safeParse({ ...gift, ...reply }).success).toBe(true);
  });
});

describe("the flight path on the postcard", () => {
  const A = { x: 66, y: 182 };
  const C = { x: 150, y: 16 };
  const B = { x: 232, y: 178 };
  const pts = arc(A, C, B, 64);
  const trk = track(pts);

  it("starts at one home and ends at the other", () => {
    expect(pts).toHaveLength(65);
    expect(pts[0]).toEqual(A);
    expect(pts[64]).toEqual(B);
  });

  it("rises well above both homes", () => {
    expect(Math.min(...pts.map((p) => p.y))).toBeLessThan(Math.min(A.y, B.y) - 40);
  });

  it("puts the plane at the ends", () => {
    expect(dist(trk.at(0), A)).toBeLessThan(1e-9);
    expect(dist(trk.at(1), B)).toBeLessThan(1e-9);
  });

  it("moves at an even pace along the curve, not along the maths", () => {
    const walked = (from: number, to: number) => {
      let sum = 0;
      for (let i = 0; i < 100; i++) sum += dist(trk.at(from + ((to - from) * i) / 100), trk.at(from + ((to - from) * (i + 1)) / 100));
      return sum;
    };
    expect(walked(0, 0.25)).toBeCloseTo(walked(0.5, 0.75), 0);
    expect(walked(0, 1)).toBeCloseTo(trk.length, 0);
  });

  it("points the plane up and to the right as it takes off", () => {
    const heading = trk.at(0).heading;
    expect(heading).toBeLessThan(0);
    expect(heading).toBeGreaterThan(-90);
  });

  it("draws the flown part from the first home exactly to the plane", () => {
    expect(trk.upTo(0.4).startsWith("M66.00 182.00")).toBe(true);
    const plane = trk.at(0.4);
    expect(trk.upTo(0.4).endsWith(`${plane.x.toFixed(2)} ${plane.y.toFixed(2)}`)).toBe(true);
  });

  it("survives a track with nowhere to go", () => {
    const stuck = track([{ x: 1, y: 1 }]);
    expect(stuck.length).toBe(0);
    expect(stuck.at(0.5)).toMatchObject({ x: 1, y: 1 });
    expect(stuck.upTo(0.5)).toBe("M1.00 1.00");
  });
});

describe("flying on breath", () => {
  const DT = 1 / 60;

  /** Runs the plane under a breath that changes over time, the way the template's frame loop does. */
  const simulate = (push: (t: number) => number, seconds: number) => {
    let speed = 0;
    let pos = 0;
    let peak = 0;
    let minSpeed = 0;
    let maxSpeed = 0;
    for (let t = 0; t < seconds; t += DT) {
      speed = glide(speed, push(t), DT);
      ({ pos, speed } = travel(pos, speed, DT));
      peak = Math.max(peak, pos);
      minSpeed = Math.min(minSpeed, speed);
      maxSpeed = Math.max(maxSpeed, speed);
    }
    return { pos, speed, peak, minSpeed, maxSpeed };
  };

  /** Seconds until the plane gets home under a breath, or Infinity if it never does. */
  const timeHome = (push: (t: number) => number, limit = 30) => {
    let speed = 0;
    let pos = 0;
    for (let t = 0; t < limit; t += DT) {
      speed = glide(speed, push(t), DT);
      ({ pos, speed } = travel(pos, speed, DT));
      if (pos >= 1) return t;
    }
    return Infinity;
  };

  it("ignores anything quieter than a real blow", () => {
    expect(thrust(0)).toBe(0);
    expect(thrust(0.2)).toBe(0);
    expect(thrust(BLOW_FLOOR)).toBe(0);
    expect(thrust(Number.NaN)).toBe(0);
  });

  it("pushes harder the harder they blow, up to full power", () => {
    expect(thrust(0.5)).toBeGreaterThan(0);
    expect(thrust(0.7)).toBeGreaterThan(thrust(0.5));
    expect(thrust(0.85)).toBe(1);
    expect(thrust(1)).toBe(1);
  });

  it("gets a hard, steady blow all the way there in a few seconds", () => {
    const t = timeHome(() => 1);
    expect(t).toBeGreaterThan(2);
    expect(t).toBeLessThan(4);
  });

  it("still gets a gentler but real blow there, just slower", () => {
    const gentle = timeHome(() => thrust(0.6));
    expect(gentle).toBeLessThan(10);
    expect(gentle).toBeGreaterThan(timeHome(() => 1));
  });

  it("never flies faster than top speed, or sinks faster than it falls", () => {
    expect(simulate(() => 1, 5).maxSpeed).toBeLessThanOrEqual(TOP_SPEED + 1e-9);
    expect(simulate((t) => (t < 1 ? 1 : 0), 10).minSpeed).toBeGreaterThanOrEqual(-FALL_SPEED - 1e-9);
  });

  it("coasts a moment after the breath stops, then slowly slides back", () => {
    const blowing = (t: number) => (t < 1.5 ? 1 : 0);
    const atStop = simulate(blowing, 1.5).pos;
    expect(simulate(blowing, 1.7).pos).toBeGreaterThan(atStop);
    const later = simulate(blowing, 5.5);
    expect(later.pos).toBeLessThan(later.peak);
    expect(later.peak - later.pos).toBeLessThan(0.3);
  });

  it("slides all the way back to the start if they give up, and rests there", () => {
    const gaveUp = simulate((t) => (t < 1 ? 1 : 0), 60);
    expect(gaveUp.pos).toBe(0);
    expect(gaveUp.speed).toBe(0);
  });

  it("wins back the lost ground when they start blowing again", () => {
    expect(timeHome((t) => (t < 1 ? 1 : t < 4 ? 0 : 1))).toBeLessThan(10);
  });

  it("doesn't move at all without a blow", () => {
    const still = simulate(() => 0, 3);
    expect(still.pos).toBe(0);
    expect(still.speed).toBe(0);
  });

  it("keeps the plane between the two homes", () => {
    expect(travel(0.99, 1, 0.1)).toEqual({ pos: 1, speed: 1 });
    expect(travel(0.01, -1, 0.1)).toEqual({ pos: 0, speed: 0 });
    expect(travel(0.5, -0.07, 0.1).pos).toBeCloseTo(0.493, 6);
  });
});
