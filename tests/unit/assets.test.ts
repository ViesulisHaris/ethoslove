import { describe, expect, it } from "vitest";
import { giftIdOfStoragePath, storagePathsOf } from "@/lib/gift/assets";

const gift = "3f1c8d2e-5b6a-4c7d-8e9f-0a1b2c3d4e5f";
const photo = (url: string) => ({ id: url, url, width: 10, height: 10 });

describe("storage paths", () => {
  it("names the gift folder a path sits in, and nothing else", () => {
    expect(giftIdOfStoragePath(`gifts/${gift}/a.webp`)).toBe(gift);
    expect(giftIdOfStoragePath(`gifts/${gift}/../other/a.webp`)).toBeNull();
    expect(giftIdOfStoragePath("gifts/not-a-gift/a.webp")).toBeNull();
    expect(giftIdOfStoragePath(`gifts/${gift}/`)).toBeNull();
    expect(giftIdOfStoragePath(`reactions/${gift}/a.webm`)).toBeNull();
  });

  it("lists every stored file a gift points at", () => {
    const paths = storagePathsOf({
      photos: [photo(`gifts/${gift}/p.webp`), photo("idb:local")],
      music: { source: "upload", url: `gifts/${gift}/song.mp3`, startAt: 0 },
      video: { url: `gifts/${gift}/v.mp4`, poster: `gifts/${gift}/vp.webp` },
      voiceNote: { url: `gifts/${gift}/vn.webm` },
    });
    expect(paths).toEqual([
      `gifts/${gift}/p.webp`,
      `gifts/${gift}/song.mp3`,
      `gifts/${gift}/v.mp4`,
      `gifts/${gift}/vp.webp`,
      `gifts/${gift}/vn.webm`,
    ]);
    expect(storagePathsOf({ photos: [], music: { source: "library", url: "/audio/library/home.mp3", startAt: 0 } })).toEqual([]);
  });
});
