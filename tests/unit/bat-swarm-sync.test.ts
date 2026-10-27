import { describe, expect, it } from "vitest";
import { buildScript, cuesFor, IDLE_BATS, makeBats, moonFor, positionAt, type Cue, type Flight, type Step } from "@/templates/bat-swarm/flight";

/**
 * The swarm's sounds were timed to the moment each step begins, and the picture does its quickest work
 * a good way into the step: the sound was over before the bats had moved. These tests measure what the
 * bats are doing (how much of the swarm, on screen, is moving how fast) from the same function that draws
 * them, and hold each sound's loudest moment to it.
 */

const W = 390;
const H = 844;
const COUNT = 320;
const bats = makeBats(COUNT, 5);
const moon = moonFor(W, H);
const script = buildScript(3);
// Shapes on screen, stand-ins for a word, a line and a heart: where they are changes how far the bats fly, not when.
const targets = [0, 1, 2].map((k) => bats.map((_, i) => ({ x: 40 + ((i * 37 + k * 91) % 310), y: 230 + ((i * 53 + k * 29) % 260) })));
const flight: Flight = { bats, script, moon, targets, idleClock: 0 };

/** How much of the swarm that is on screen is moving, and how fast, `t` seconds after the tap (averaged over a tenth of a second). */
function activity(t: number): number {
  const dt = 0.02;
  let sum = 0;
  for (let i = IDLE_BATS; i < COUNT; i++) {
    const a = positionAt(flight, i, t - 0.05);
    const b = positionAt(flight, i, t + 0.05);
    if (!a.visible || !b.visible) continue;
    const inside = (p: { x: number; y: number }) => p.x > -10 && p.x < W + 10 && p.y > -10 && p.y < H + 10;
    if (!inside(a) && !inside(b)) continue;
    sum += Math.hypot(b.x - a.x, b.y - a.y) / (dt * 5);
  }
  return sum;
}

/** The moment, within a step, at which the swarm is busiest. */
function busiest(step: Step): number {
  let best = 0;
  let at = step.t0;
  for (let t = step.t0 + 0.05; t < step.t1 - 0.05; t += 0.02) {
    const a = activity(t);
    if (a > best) {
      best = a;
      at = t;
    }
  }
  return at - step.t0;
}

/** When a cue is loudest, in seconds from the start of its step. */
const loudest = (cue: Cue) => cue.delay + ((cue.ms ?? 0) / 1000) * (cue.peak ?? 0);

const step = (kind: Step["kind"], word = 0) => script.steps.find((s) => s.kind === kind && ((s.kind !== "form" && s.kind !== "hold") || s.word === word)) as Step;

describe("the sounds of the swarm, against what it does", () => {
  it("has a sound for each stretch of the flight, and never one that begins before its step", () => {
    for (const s of script.steps) {
      const cues = cuesFor(s, 2);
      expect(cues.length, s.kind).toBeGreaterThan(0);
      for (const cue of cues) {
        expect(cue.delay, `${s.kind} ${cue.sound}`).toBeGreaterThanOrEqual(0);
        if (cue.sound !== "chime") expect(cue.ms, `${s.kind} ${cue.sound}`).toBeGreaterThan(0);
        // Over before the next step has its own sounds, give or take a tail.
        expect(cue.delay + (cue.ms ?? 0) / 1000, `${s.kind} ${cue.sound}`).toBeLessThan(s.t1 - s.t0 + 0.5);
      }
    }
  });

  it("puts the pour's flutter and rush at the busiest part of the pour, not at its first frame", () => {
    const at = busiest(step("emerge"));
    for (const cue of cuesFor(step("emerge"), 2)) expect(Math.abs(loudest(cue) - at), `${cue.sound}: loudest ${loudest(cue).toFixed(2)} s, the swarm busiest at ${at.toFixed(2)} s`).toBeLessThan(0.25);
  });

  it("puts the whoosh of a word forming where the bats are quickest", () => {
    for (const word of [0, 1, 2]) {
      const s = step("form", word);
      const at = busiest(s);
      const [cue] = cuesFor(s, 2);
      expect(Math.abs(loudest(cue) - at), `word ${word}: loudest ${loudest(cue).toFixed(2)} s, the swarm busiest at ${at.toFixed(2)} s`).toBeLessThan(0.15);
    }
  });

  it("puts the scatter's flutter where the bats are streaming off, not where they only begin to move", () => {
    const s = step("scatter");
    const at = busiest(s);
    for (const cue of cuesFor(s, 2)) expect(Math.abs(loudest(cue) - at), `${cue.sound}: loudest ${loudest(cue).toFixed(2)} s, the swarm busiest at ${at.toFixed(2)} s`).toBeLessThan(0.15);
  });

  it("strikes a word's bell as the last bat arrives, and gives the heart a shimmer instead of a bell", () => {
    const form = step("form", 0);
    const hold = step("hold", 0);
    const [bell] = cuesFor(hold, 2);
    expect(bell.sound).toBe("chime");
    expect(bell.note).toBe(0);
    // The last bat leaves 0.45 of its lag (up to 0.8 s) behind the first and takes 1.15 s: that is the end of the form, which is the start of the hold.
    expect(hold.t0).toBeCloseTo(form.t1, 5);
    expect(bell.delay).toBeLessThan(0.2);
    const [heart] = cuesFor(step("hold", 2), 2);
    expect(heart.sound).toBe("sparkle");
  });

  it("does not leave the circling swarm in silence", () => {
    const [bed] = cuesFor(step("orbit"), 2);
    expect(bed.sound).toBe("flutter");
    expect(bed.soft).toBe(true);
    expect((bed.ms ?? 0) / 1000).toBeCloseTo(step("orbit").t1 - step("orbit").t0, 1);
  });
});
