import { describe, expect, it } from "vitest";
import { giftStorageObjectKeys, giftStoragePathFromKey, giftStoragePaths } from "@/lib/gift/storage-paths";

describe("gift storage path collection", () => {
  it("collects unique gift-bucket paths from nested gift data", () => {
    const data = {
      photos: [
        { url: "gifts/g1/a.webp" },
        { url: "https://example.com/remote.jpg" },
      ],
      video: { url: "gifts/g1/v.webm", poster: "gifts/g1/a.webp" },
      fields: { custom: ["blob:x", "gifts/g1/field.png"] },
    };

    expect(giftStoragePaths(data)).toEqual([
      "gifts/g1/a.webp",
      "gifts/g1/field.png",
      "gifts/g1/v.webm",
    ]);
    expect(giftStorageObjectKeys(data)).toEqual(["g1/a.webp", "g1/field.png", "g1/v.webm"]);
    expect(giftStoragePathFromKey("g1/a.webp")).toBe("gifts/g1/a.webp");
  });
});
