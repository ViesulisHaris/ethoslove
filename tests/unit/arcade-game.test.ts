import { beforeAll, describe, expect, it } from "vitest";
import { CatchGame, H } from "@/templates/arcade/Game";

type Item = { x: number; y: number; vy: number; wobble: number; kind: "good" | "bad"; gone?: boolean };
type Inside = { items: Item[]; spawnAt: number; update(dt: number): void };

beforeAll(() => {
  // stop() cancels its frame; node has no animation frames.
  globalThis.cancelAnimationFrame ??= () => {};
});

/** A game on a canvas that draws nothing, with no random spawns: each test drops its own items. */
function game(perLevel = 8) {
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  const canvas = { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
  const log: string[] = [];
  const g = new CatchGame(canvas, {
    onCatch: (s) => log.push(`catch ${s.caught}`),
    onMiss: (s) => log.push(`miss ${s.misses}`),
    onLevelClear: () => log.push("clear"),
    onFail: () => log.push("fail"),
  });
  g.perLevel = perLevel;
  g.basketX = 80;
  const inside = g as unknown as Inside;
  inside.spawnAt = Number.POSITIVE_INFINITY;
  /** An item in the basket (y 235) or, with `fall`, just past the floor, then one frame. */
  const drop = (kind: "good" | "bad", { x = 80, fall = false } = {}) => {
    inside.items.push({ x, y: fall ? H + 7 : 235, vy: 0, wobble: 0, kind });
    inside.update(0.001);
  };
  return { g, log, drop, frame: () => inside.update(0.001) };
}

describe("Arcade catch game", () => {
  it("scores a caught heart without costing a life", () => {
    const { g, log, drop } = game();
    drop("good");
    expect(g.state).toMatchObject({ caught: 1, misses: 0 });
    expect(log).toEqual(["catch 1"]);
  });

  it("clears a level of eight with all three lives left", () => {
    const { g, log, drop } = game(8);
    for (let i = 0; i < 8; i++) drop("good");
    expect(g.state).toMatchObject({ caught: 8, misses: 0 });
    expect(log.at(-1)).toBe("clear");
    expect(log).not.toContain("fail");
  });

  it("takes one life, once, for a heart that falls past the floor", () => {
    const { g, log, drop, frame } = game();
    drop("good", { x: 20, fall: true });
    frame();
    frame();
    expect(g.state.misses).toBe(1);
    expect(log).toEqual(["miss 1"]);
  });

  it("takes a life for a bomb in the basket, and nothing for one that falls past", () => {
    const { g, drop } = game();
    drop("bad");
    expect(g.state.misses).toBe(1);
    drop("bad", { x: 20, fall: true });
    expect(g.state.misses).toBe(1);
  });

  it("ends the level after three lost lives, and still clears one with two lost", () => {
    const lost = game();
    for (let i = 0; i < 3; i++) lost.drop("good", { x: 20, fall: true });
    expect(lost.log.at(-1)).toBe("fail");

    const close = game(8);
    close.drop("good", { x: 20, fall: true });
    close.drop("bad");
    for (let i = 0; i < 8; i++) close.drop("good");
    expect(close.g.state).toMatchObject({ caught: 8, misses: 2 });
    expect(close.log.at(-1)).toBe("clear");
  });
});
