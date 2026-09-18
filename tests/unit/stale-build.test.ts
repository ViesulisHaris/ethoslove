import { describe, expect, it } from "vitest";
import { RELOAD_LOOP_MS, isStaleBuild, shouldAutoReload } from "@/lib/stale-build";

describe("a page left open through a deploy", () => {
  it("knows the chunk errors every browser throws", () => {
    const cases = [
      { name: "ChunkLoadError", message: "Loading chunk 4821 failed." },
      { name: "TypeError", message: "Failed to fetch dynamically imported module: https://tryethos.io/_next/static/chunks/app/x.js" },
      { name: "TypeError", message: "error loading dynamically imported module" },
      { name: "Error", message: "Importing a module script failed." },
    ];
    for (const error of cases) expect(isStaleBuild(error), error.message).toBe(true);
  });

  it("leaves a real failure on the error screen", () => {
    expect(isStaleBuild({ name: "TypeError", message: "x.map is not a function" })).toBe(false);
    expect(isStaleBuild({ name: "Error", message: "Unknown template" })).toBe(false);
    expect(isStaleBuild(undefined)).toBe(false);
    expect(isStaleBuild({ name: "Error" })).toBe(false);
  });
});

describe("reloading instead of showing the error screen", () => {
  const chunk = { name: "ChunkLoadError", message: "Loading chunk 4821 failed." };
  const now = 1_789_700_000_000;

  it("reloads a tab that never reloaded itself", () => {
    expect(shouldAutoReload(chunk, null, now)).toBe(true);
  });

  it("won't reload again moments after a reload that didn't help", () => {
    expect(shouldAutoReload(chunk, now - 5_000, now)).toBe(false);
    expect(shouldAutoReload(chunk, now - RELOAD_LOOP_MS, now)).toBe(false);
  });

  it("reloads again when the next deploy comes hours later in the same tab", () => {
    expect(shouldAutoReload(chunk, now - 3 * 60 * 60 * 1000, now)).toBe(true);
  });

  it("reads the old once-per-tab flag, and a clock set back, as long ago", () => {
    expect(shouldAutoReload(chunk, Number("1"), now)).toBe(true);
    expect(shouldAutoReload(chunk, Number("garbage"), now)).toBe(true);
    expect(shouldAutoReload(chunk, now + 60_000, now)).toBe(true);
  });

  it("never reloads for a real failure", () => {
    expect(shouldAutoReload({ name: "TypeError", message: "x.map is not a function" }, null, now)).toBe(false);
  });
});
