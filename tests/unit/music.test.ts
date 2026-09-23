import { describe, expect, it } from "vitest";
import { appleMusicTrackUrl, backgroundMusic, isApplePreviewUrl, isCatalogPreview, isKnownMusic } from "@/lib/gift/music";
import type { GiftMusic } from "@/lib/gift/schema";

const PREVIEW = "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/aa/bb/cc/mzaf_1.plus.aac.p.m4a";
const catalog: GiftMusic = {
  source: "catalog",
  url: PREVIEW,
  trackId: "1762656372",
  title: "Die With A Smile",
  artist: "Lady Gaga & Bruno Mars",
  provider: "itunes",
  externalUrl: "https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372&uo=4&at=1000lSGK",
  startAt: 0,
};
const library: GiftMusic = { source: "library", url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 };
const upload: GiftMusic = { source: "upload", url: "https://x.supabase.co/storage/v1/object/sign/gifts/g/song.mp3?token=t", trackId: "s", startAt: 12 };

describe("gift music", () => {
  it("recognises Apple's preview hosts, over https only", () => {
    expect(isApplePreviewUrl(PREVIEW)).toBe(true);
    expect(isApplePreviewUrl("https://audio.itunes.apple.com/p.m4a")).toBe(true);
    expect(isApplePreviewUrl("https://a1.mzstatic.com/us/r30/Music/p.m4a")).toBe(true);
    for (const bad of ["http://audio-ssl.itunes.apple.com/p.m4a", "https://itunes.apple.com.evil.example/p.m4a", "https://evilitunes.apple.com/p.m4a", "https://audio.example/p.m4a", "/audio/library/x.mp3", "not a url"]) {
      expect(isApplePreviewUrl(bad), bad).toBe(false);
    }
  });

  it("never lets a real song play under the gift, whatever it is labelled", () => {
    expect(backgroundMusic(catalog)).toBeUndefined();
    expect(backgroundMusic({ ...catalog, source: "library" })).toBeUndefined();
    expect(backgroundMusic({ ...catalog, source: "upload" })).toBeUndefined();
    // A gift published when previews still looped is caught the same way.
    expect(isCatalogPreview({ ...catalog, url: "https://audio.example/p.m4a" })).toBe(true);
    expect(backgroundMusic({ ...catalog, url: "https://audio.example/p.m4a" })).toBeUndefined();
  });

  it("keeps library tracks and the sender's own file as background music", () => {
    expect(backgroundMusic(library)).toBe(library);
    expect(backgroundMusic(upload)).toBe(upload);
    expect(backgroundMusic(undefined)).toBeUndefined();
    expect(isCatalogPreview(library)).toBe(false);
    expect(isCatalogPreview(undefined)).toBe(false);
  });

  it("knows which music is ours to vouch for", () => {
    expect(isKnownMusic(catalog)).toBe(true);
    expect(isKnownMusic(library)).toBe(true);
    expect(isKnownMusic({ ...upload, url: "gifts/g/song.mp3" })).toBe(true);
    expect(isKnownMusic({ ...upload, url: "idb:s" })).toBe(true);
    expect(isKnownMusic({ ...library, url: "https://audio.example/x.mp3" })).toBe(false);
    expect(isKnownMusic({ ...catalog, url: "https://audio.example/p.m4a" })).toBe(false);
  });

  it("links to the track on Apple Music without any token from the search result", () => {
    const url = appleMusicTrackUrl(catalog, "en");
    expect(url).toBe("https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372");
    expect(url).not.toMatch(/[?&](at|ct|uo)=/);
  });

  it("falls back to the track id, in the gift's storefront, and to nothing when there is neither", () => {
    expect(appleMusicTrackUrl({ ...catalog, externalUrl: undefined }, "es")).toBe("https://music.apple.com/es/song/1762656372");
    expect(appleMusicTrackUrl({ ...catalog, externalUrl: "https://evil.example/song" }, "en")).toBe("https://music.apple.com/us/song/1762656372");
    expect(appleMusicTrackUrl({ ...catalog, externalUrl: undefined, trackId: "abc" }, "en")).toBeNull();
    expect(appleMusicTrackUrl({ ...catalog, externalUrl: undefined, trackId: undefined }, "en")).toBeNull();
  });
});
