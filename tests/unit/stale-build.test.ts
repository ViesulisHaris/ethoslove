import { describe, expect, it } from "vitest";
import { isStaleBuild } from "@/lib/stale-build";

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
