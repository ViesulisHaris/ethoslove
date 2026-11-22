import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { whenOnline } from "@/components/gift/when-online";

/** A window that is on or off a network, with a clock that only moves when told to. */
function phone(onLine: boolean) {
  const heard = new Map<string, Set<() => void>>();
  const timers = new Map<number, () => void>();
  let next = 1;
  const w = {
    navigator: { onLine },
    addEventListener: (type: string, fn: () => void) => void (heard.get(type) ?? heard.set(type, new Set()).get(type)!).add(fn),
    removeEventListener: (type: string, fn: () => void) => void heard.get(type)?.delete(fn),
    setTimeout: (fn: () => void) => {
      timers.set(next, fn);
      return next++;
    },
    clearTimeout: (id: number) => void timers.delete(id),
  };
  return {
    w: w as unknown as Parameters<typeof whenOnline>[2],
    /** The connection comes back. */
    back: () => [...(heard.get("online") ?? [])].forEach((fn) => fn()),
    /** The wait runs out. */
    late: () => [...timers.values()].forEach((fn) => fn()),
    waiting: () => (heard.get("online")?.size ?? 0) + timers.size,
  };
}

// With no connection, "Send one back" put the browser's error page where the gift was, and Back
// brought the gift at its "Tap to open" screen (the tester's loop-T5).
describe("leaving a gift waits for a connection", () => {
  it("goes at once when there is one, and leaves nothing behind", () => {
    const go = vi.fn();
    const { w, waiting } = phone(true);
    whenOnline(go, 10_000, w);
    expect(go).toHaveBeenCalledTimes(1);
    expect(waiting()).toBe(0);
  });

  it("stays on the gift while the phone is offline, and goes when the connection is back", () => {
    const go = vi.fn();
    const { w, back, late, waiting } = phone(false);
    whenOnline(go, 10_000, w);
    expect(go).not.toHaveBeenCalled();
    back();
    expect(go).toHaveBeenCalledTimes(1);
    // Once: a second "online", or the clock running out after it, changes nothing.
    back();
    late();
    expect(go).toHaveBeenCalledTimes(1);
    expect(waiting()).toBe(0);
  });

  it("gives up when the wait runs out: a connection that comes back later moves nobody", () => {
    const go = vi.fn();
    const { w, back, late, waiting } = phone(false);
    whenOnline(go, 10_000, w);
    late();
    back();
    expect(go).not.toHaveBeenCalled();
    expect(waiting()).toBe(0);
  });

  it("can be given up early, as the page does when it is left or the button is tapped again", () => {
    const go = vi.fn();
    const { w, back, waiting } = phone(false);
    const stop = whenOnline(go, 10_000, w);
    stop();
    back();
    expect(go).not.toHaveBeenCalled();
    expect(waiting()).toBe(0);
  });

  it("takes a browser that does not say for online", () => {
    const go = vi.fn();
    const { w } = phone(undefined as unknown as boolean);
    whenOnline(go, 10_000, w);
    expect(go).toHaveBeenCalledTimes(1);
  });

  // Read from the source: that it holds in a browser is watched in tests/e2e/recipient-loop.spec.ts.
  it("is how the gift page leaves for the editor, the reply counted only when it does", () => {
    const page = readFileSync("src/components/gift/gift-experience.tsx", "utf8");
    const held = page.slice(page.indexOf("giveUp.current = whenOnline(() => {"), page.indexOf("}, WAKE_MS);"));
    expect(held).toContain("saveReplySeed(");
    expect(held).toContain('track("reply_started"');
    expect(held).toContain("router.push(replyEditorHref(");
    // The button wakes after the same wait, whether the editor hung or the connection never came.
    expect(page).toContain("wake.current = window.setTimeout(() => setLeaving(false), WAKE_MS);");
    // And the page gives the wait up when it is left.
    expect(page).toMatch(/window\.clearTimeout\(wake\.current\);\s*giveUp\.current\(\);\s*\},\s*\[\],/);
  });
});
