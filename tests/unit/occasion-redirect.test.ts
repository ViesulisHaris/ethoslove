import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OCCASIONS } from "@/config/occasions";

/**
 * /templates?occasion=<slug> is sent to /occasions/<slug> by next.config.ts, which cannot import the
 * list of occasions and keeps its own copy: a new occasion missing from it would leave its old link
 * on the bare gallery.
 */
describe("the old ?occasion= gallery link", () => {
  it("is redirected for every occasion there is", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    const list = config.match(/const OCCASION_SLUGS = (\[[^\]]*\])/);
    expect(list).not.toBeNull();
    expect(JSON.parse(list![1])).toEqual([...OCCASIONS]);
  });
});
