import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeScreenTip, TIP_AFTER_MS, TIP_FOR_MS } from "@/components/gift/home-screen-tip";

// On an iPhone the tip came with the end, at the top of the screen, over the last words of the
// gifts that end there: String the Lights' sign and "Fin. Por ahora." (the deep tester's loop-D12).
describe("the add-to-home-screen tip", () => {
  it("is not there as the end arrives", () => {
    expect(renderToStaticMarkup(<HomeScreenTip locale="en" />)).toBe("");
  });

  it("comes once the end has been seen, and goes by itself", () => {
    expect(TIP_AFTER_MS).toBeGreaterThanOrEqual(4000);
    expect(TIP_FOR_MS).toBeGreaterThanOrEqual(8000);
    const tip = readFileSync("src/components/gift/home-screen-tip.tsx", "utf8");
    expect(tip).toContain("useState(false)");
    expect(tip).toContain("window.setTimeout(() => setOpen(true), TIP_AFTER_MS)");
    expect(tip).toContain("window.setTimeout(() => setOpen(false), TIP_AFTER_MS + TIP_FOR_MS)");
  });
});
