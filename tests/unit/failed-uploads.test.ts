import { describe, expect, it } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { AssetRecord } from "@/lib/editor/types";
import { groupOf, isVideoItself, stuckUploads, summarizeFailedUploads } from "@/lib/editor/failed-uploads";

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

  it("lists the song, the clip, the voice message and the photos in that order, when they failed", () => {
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

describe("what is still holding the gift back", () => {
  it("counts a file the gift still points at here, even with no upload record left", () => {
    const data = gift({ photos: [{ id: "a", url: "idb:a" }, { id: "b", url: "gifts/g/b.webp" }] });
    expect(stuckUploads(data, {})).toEqual([{ group: "photos", count: 1, title: undefined, reason: "missing", retryable: false }]);
  });

  it("calls a file that is still going 'waiting', and offers to try again", () => {
    const data = gift({ photos: [], music: { source: "upload", url: "blob:song", trackId: "song", title: "our song", startAt: 0 } });
    const uploading = { song: { id: "song", kind: "audio" as const, local: true, status: "uploading" as const, progress: 0.4, objectUrl: "blob:song" } };
    expect(stuckUploads(data, uploading)).toEqual([{ group: "song", count: 1, title: "our song", reason: "waiting", retryable: true }]);
  });

  it("lets a real failure outrank a file that is merely slow", () => {
    const data = gift({ photos: [{ id: "a", url: "blob:a" }, { id: "b", url: "blob:b" }] });
    const assets = {
      a: { id: "a", kind: "photo" as const, local: true, status: "uploading" as const, progress: 0.2 },
      b: { id: "b", kind: "photo" as const, local: true, status: "error" as const, progress: 0, error: "processing_failed" },
    };
    expect(stuckUploads(data, assets)).toEqual([{ group: "photos", count: 2, title: undefined, reason: "processing", retryable: true }]);
  });

  it("says nothing when every file is in Storage", () => {
    const data = gift({
      photos: [{ id: "a", url: "gifts/g/a.webp" }],
      music: { source: "upload", url: "gifts/g/song.m4a", trackId: "song", startAt: 0 },
      voiceNote: { url: "gifts/g/vn.webm" },
    });
    expect(stuckUploads(data, {})).toEqual([]);
  });
});
