import { describe, expect, it, vi } from "vitest";
import { isHydrated, whenHydrated } from "@/components/motion/when-hydrated";

/** An element as the page holds it: React's key appears on it once it has been hydrated. */
const element = () => ({}) as Record<string, unknown>;
const hydrate = (el: Record<string, unknown>) => {
  el["__reactFiber$abc123"] = {};
};

function setup(maxWait = 10_000) {
  let clock = 0;
  const frames: (() => void)[] = [];
  const settled = vi.fn();
  const marks = whenHydrated({
    frame: (callback) => frames.push(callback),
    cancel: () => frames.splice(0),
    now: () => clock,
    maxWait,
    settled,
  });
  const nextFrame = (ms = 16) => {
    clock += ms;
    frames.splice(0).forEach((callback) => callback());
  };
  return { marks, nextFrame, settled, frames };
}

describe("marking a picture only once React has hydrated it (site-motion's image fades)", () => {
  it("knows a hydrated element by React's own key", () => {
    const el = element();
    expect(isHydrated(el)).toBe(false);
    hydrate(el);
    expect(isHydrated(el)).toBe(true);
  });

  it("marks a hydrated picture at once, and waits for one React hasn't reached (My dates' cards, streamed in)", () => {
    const { marks, nextFrame, settled } = setup();
    const ready = element();
    hydrate(ready);
    const early = element();
    const done: string[] = [];
    marks.run(ready, () => done.push("ready"));
    marks.run(early, () => done.push("early"));
    expect(done).toEqual(["ready"]);
    nextFrame();
    nextFrame();
    // Written now, it would be an attribute the server's HTML didn't have when React compares them.
    expect(done).toEqual(["ready"]);
    expect(settled).not.toHaveBeenCalled();
    hydrate(early);
    nextFrame();
    expect(done).toEqual(["ready", "early"]);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(marks.waiting).toBe(0);
  });

  it("gives up waiting on an element React never hydrates, and stops cleanly", () => {
    const { marks, nextFrame, frames } = setup(100);
    const done: string[] = [];
    marks.run(element(), () => done.push("never"));
    nextFrame(60);
    expect(done).toEqual([]);
    nextFrame(60);
    expect(done).toEqual(["never"]);

    marks.run(element(), () => done.push("stopped"));
    marks.stop();
    expect(frames).toEqual([]);
    nextFrame(500);
    expect(done).toEqual(["never"]);
  });
});
