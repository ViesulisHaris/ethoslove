import { describe, expect, it } from "vitest";
import { giftIdOfStoragePath } from "@/lib/gift/assets";

const gift = "3f1c8d2e-5b6a-4c7d-8e9f-0a1b2c3d4e5f";

describe("storage paths", () => {
  it("names the gift folder a path sits in", () => {
    expect(giftIdOfStoragePath(`gifts/${gift}/a.webp`)).toBe(gift);
    expect(giftIdOfStoragePath(`gifts/${gift}/stems/a.webp`)).toBe(gift);
  });

  it("rejects anything that isn't inside a gift folder", () => {
    expect(giftIdOfStoragePath(`gifts/${gift}/../other/a.webp`)).toBeNull();
    expect(giftIdOfStoragePath(`gifts/${gift}//a.webp`)).toBeNull();
    expect(giftIdOfStoragePath(`gifts/${gift}/`)).toBeNull();
    expect(giftIdOfStoragePath(`gifts/${gift}`)).toBeNull();
    expect(giftIdOfStoragePath("gifts/not-a-gift/a.webp")).toBeNull();
    expect(giftIdOfStoragePath(`reactions/${gift}/a.webm`)).toBeNull();
  });
});
