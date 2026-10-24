import { describe, expect, it } from "vitest";
import { BOIL, BOTTLE_ARRIVES_MS, BOTTLE_SPRING, CHURN_MS, FLY_MS, HEART_DRAW_MS, HEART_DRAW_S, RUSH, springArrivalMs } from "@/templates/cauldron/brew";
import { MATCH_ARRIVES_MS, MATCH_AT, MATCH_FLIGHT_S, PIECE_FALL_S, PIECE_LANDS_S } from "@/templates/jack-o-lantern/design";
import { RENDER_LAG_S } from "@/templates/_shared/night/sound-math";

/**
 * Where a sound goes is a claim about the picture, so it is held to the numbers the picture is drawn
 * from. The kettle's rush of air used to fire as the jar lifted, the pumpkin's thunk as the knife let
 * go, and each was most of a second away from the thing it was meant to go with.
 */

describe("the picture's own delay", () => {
  it("is a frame or two: long enough to matter against an animation, short enough to be the same moment", () => {
    // Measured in the page: the call that schedules a sound to the animationstart of the animation its state change starts.
    expect(RENDER_LAG_S).toBeGreaterThanOrEqual(0.02);
    expect(RENDER_LAG_S).toBeLessThanOrEqual(0.08);
  });
});

describe("the kettle", () => {
  it("builds the rush of air to the landing and stops on it, because the jar speeds up all the way there", () => {
    expect(RUSH.delay + RUSH.ms).toBe(FLY_MS);
    const loudestAt = RUSH.delay + RUSH.ms * RUSH.peak;
    expect(FLY_MS - loudestAt).toBeGreaterThanOrEqual(0);
    expect(FLY_MS - loudestAt, "loudest this long before the landing").toBeLessThanOrEqual(100);
    // Not at the first frame, where it used to be.
    expect(RUSH.delay).toBeGreaterThan(60);
  });

  it("has the churn after a splash come while the drops it threw up are coming back down", () => {
    // The drops rise for 0.38 s and are down by 0.85 s (the cb-drop animation).
    for (const ms of CHURN_MS) {
      expect(ms).toBeGreaterThan(250);
      expect(ms).toBeLessThan(850);
    }
    expect(CHURN_MS[0]).toBeLessThan(CHURN_MS[1]);
  });

  it("strikes the bottle's bell as its spring first reaches its place, and lets the heart's glints run as long as it draws", () => {
    expect(springArrivalMs(BOTTLE_SPRING.stiffness, BOTTLE_SPRING.damping)).toBe(BOTTLE_ARRIVES_MS);
    expect(BOTTLE_ARRIVES_MS).toBeGreaterThan(300);
    expect(BOTTLE_ARRIVES_MS).toBeLessThan(380);
    expect(HEART_DRAW_MS).toBe(HEART_DRAW_S * 1000);
    expect(BOIL.heart).toBeLessThan(BOIL.bottle);
    // The brew builds the whole way to the bottle, with the heart drawn well inside it.
    expect(BOIL.bottle - BOIL.heart).toBeGreaterThan(HEART_DRAW_MS);
  });

  it("knows how springs behave: a stiffer one arrives sooner, a heavier one later, one with no give never overshoots", () => {
    expect(springArrivalMs(200, 13)).toBeLessThan(springArrivalMs(90, 13));
    expect(springArrivalMs(90, 13, 2)).toBeGreaterThan(springArrivalMs(90, 13));
    expect(springArrivalMs(90, 40)).toBe(Infinity);
  });
});

/** The point on a CSS cubic-bezier(x1, y1, x2, y2) curve at time fraction `x`: how far along the movement is. */
function bezier(x1: number, y1: number, x2: number, y2: number, x: number) {
  const at = (s: number, a: number, b: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
}

describe("the pumpkin", () => {
  it("makes the noise of a piece when it reaches the table, which is near the end of its fall and not the moment the knife lets go", () => {
    // jl-piece: cubic-bezier(.45, 0, .9, .55) over PIECE_FALL_S, slow to leave and quick at the end.
    const fallen = (seconds: number) => bezier(0.45, 0, 0.9, 0.55, seconds / PIECE_FALL_S);
    expect(fallen(PIECE_LANDS_S), "how far down it has got when the thunk plays").toBeGreaterThan(0.7);
    expect(fallen(PIECE_LANDS_S)).toBeLessThanOrEqual(1);
    // A thunk at the moment of the cut would have been when it had not moved at all.
    expect(fallen(0.05)).toBeLessThan(0.02);
    expect(PIECE_LANDS_S).toBeLessThan(PIECE_FALL_S);
    expect(PIECE_LANDS_S).toBeGreaterThan(PIECE_FALL_S * 0.8);
  });

  it("strikes the match where it reaches the pumpkin's mouth, not before it has got there", () => {
    expect(MATCH_ARRIVES_MS).toBe(Math.round(MATCH_FLIGHT_S * MATCH_AT * 1000));
    // It used to strike at 950 ms and arrive at about 1050.
    expect(MATCH_ARRIVES_MS).toBeGreaterThanOrEqual(1040);
    expect(MATCH_ARRIVES_MS / 1000).toBeLessThan(MATCH_FLIGHT_S);
  });
});
