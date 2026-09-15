import { describe, expect, it } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { AssetRecord } from "@/lib/editor/types";
import { groupOf, isVideoItself, summarizeFailedUploads } from "@/lib/editor/failed-uploads";

const base = {
  version: 1,
  templateSlug: "the-letter",
  locale: "en",
  title: "",
  recipientName: "Jack",
  senderName: "Sophie",
  message: "Happy birthday",
  messageStyle: "typewriter",
  accentColor: "#C0392B",
  fontPairing: "editorial",
  cover: "classic",
  showReactionCta: true,
  watermark: true,
  fields: {},
  photos: [],
};

const gift = (extra: Record<string, unknown>) => ({ ...base, ...extra }) as unknown as GiftData;

function asset(id: string, kind: AssetRecord["kind"], error?: string, objectUrl?: string): AssetRecord {
  return error
    ? { id, kind, local: true, status: "error", progress: 0, error, objectUrl }
    : { id, kind, local: true, status: "uploaded", progress: 1, objectUrl, storagePath: `gifts/g/${id}.png` };
}

describe("what didn't upload", () => {
  it("names a song that won't upload as the song, not as photos", () => {
    const data = gift({
      photos: [{ id: "p1", url: "blob:p1" }],
      music: { source: "upload", url: "blob:song", trackId: "song1", title: "20260912_220805242 (1)", startAt: 0 },
    });
    const assets = { p1: asset("p1", "photo"), song1: asset("song1", "audio", "unsupported_type", "blob:song") };
    expect(summarizeFailedUploads(data, assets)).toEqual([{ group: "song", count: 1, title: "20260912_220805242 (1)", reason: "type", retryable: false }]);
  });

  it("counts photos together and keeps the reason another try won't fix", () => {
    const data = gift({ photos: ["a", "b", "c"].map((id) => ({ id, url: `blob:${id}` })) });
    const assets = { a: asset("a", "photo", "network"), b: asset("b", "photo", "missing_blob"), c: asset("c", "photo") };
    expect(summarizeFailedUploads(data, assets)).toEqual([{ group: "photos", count: 2, reason: "missing", retryable: true }]);
  });

  it("lets the clip speak for its still frame", () => {
    const data = gift({ video: { url: "blob:v", poster: "blob:vp" } });
    const clip = asset("v", "video", "too_big", "blob:v");
    const still = asset("vp", "photo", "timeout", "blob:vp");
    const expected = [{ group: "video", count: 1, reason: "too_big", retryable: false }];
    expect(summarizeFailedUploads(data, { v: clip, vp: still })).toEqual(expected);
    expect(summarizeFailedUploads(data, { vp: still, v: clip })).toEqual(expected);
    expect(isVideoItself(data, clip)).toBe(true);
    expect(isVideoItself(data, still)).toBe(false);
    expect(summarizeFailedUploads(data, { vp: still })).toEqual([{ group: "video", count: 1, reason: "network", retryable: true }]);
  });

  it("finds a voice message by its reference and ignores leftovers", () => {
    const data = gift({ voiceNote: { url: "idb:vn" } });
    expect(groupOf(data, { id: "vn", kind: "audio" })).toBe("voice");
    expect(groupOf(data, { id: "gone", kind: "photo" })).toBeNull();
    expect(summarizeFailedUploads(data, { gone: asset("gone", "photo", "network") })).toEqual([]);
  });

  it("lists the song, the clip, the voice message and the photos in that order", () => {
    const data = gift({
      photos: [{ id: "p", url: "blob:p" }],
      music: { source: "upload", url: "blob:s", trackId: "s", startAt: 0 },
      voiceNote: { url: "blob:vn" },
      video: { url: "blob:v" },
    });
    const assets = { p: asset("p", "photo", "stalled"), vn: asset("vn", "audio", "server", "blob:vn"), v: asset("v", "video", "network", "blob:v"), s: asset("s", "audio", "unreadable") };
    expect(summarizeFailedUploads(data, assets).map((f) => f.group)).toEqual(["song", "video", "voice", "photos"]);
  });
});
