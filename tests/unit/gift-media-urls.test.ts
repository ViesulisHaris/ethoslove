import { describe, expect, it } from "vitest";
import { BLANK_IMAGE, isAllowedMediaUrl, mediaUrlsAllowed, withoutForeignMedia } from "@/lib/gift/media-urls";
import { isPageNavigation } from "@/lib/auth/navigation";

const GIFT = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const upload = (ext = "webp") => `gifts/${GIFT}/a1b2c3.${ext}`;
const APPLE = "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/x/mzaf_1.plus.aac.p.m4a";

describe("what a gift's media may point at", () => {
  // Every kind found in the 15,147 live and scheduled gifts on 10 Nov 2026.
  it("keeps everything the editor makes", () => {
    expect(isAllowedMediaUrl(upload(), "image")).toBe(true);
    expect(isAllowedMediaUrl(upload("mov"), "video")).toBe(true);
    expect(isAllowedMediaUrl(upload("webm"), "voice")).toBe(true);
    expect(isAllowedMediaUrl(upload("m4a"), "music")).toBe(true);
    expect(isAllowedMediaUrl("/demo/photos/letter-1.webp", "image")).toBe(true);
    expect(isAllowedMediaUrl("/audio/library/fireside.mp3", "music")).toBe(true);
    expect(isAllowedMediaUrl("/audio/library/fireside.mp3?v=2", "music")).toBe(true);
    expect(isAllowedMediaUrl(APPLE, "music")).toBe(true);
    expect(isAllowedMediaUrl("https://is1-ssl.mzstatic.com/x/preview.m4a", "music")).toBe(true);
  });

  it("lets an upload still on the device be saved, never published", () => {
    expect(isAllowedMediaUrl("idb:abc", "image", { local: true })).toBe(true);
    expect(isAllowedMediaUrl("blob:https://tryethos.io/x", "video", { local: true })).toBe(true);
    expect(isAllowedMediaUrl("idb:abc", "image")).toBe(false);
  });

  it("refuses this site's own routes, including the sign-in links", () => {
    for (const url of [
      "https://tryethos.io/auth/confirm?token_hash=abc&type=email&next=/demo/photos/p1.webp",
      "/auth/confirm?token_hash=abc&type=email",
      "https://tryethos.io/api/checkout/finish?t=abc",
      "/api/checkout/finish?t=abc",
      "/audio/library/../../auth/confirm?token_hash=abc",
      "/audio/library/%2e%2e/%2e%2e/auth/confirm",
      "/demo/photos/..%2f..%2fauth/confirm",
      "/demo/photos\\..\\auth",
      "//tryethos.io/auth/confirm",
    ]) {
      for (const kind of ["image", "video", "voice", "music"] as const) expect(isAllowedMediaUrl(url, kind, { local: true }), `${kind} ${url}`).toBe(false);
    }
  });

  it("refuses other servers, which would learn who opened the gift", () => {
    for (const url of ["https://evil.supabase.co/storage/v1/object/public/x/a.jpg", "https://evil.supabase.co/functions/v1/pic", "https://example.com/a.jpg", "http://example.com/a.jpg", "data:image/svg+xml,<svg/>"]) {
      expect(isAllowedMediaUrl(url, "image", { local: true }), url).toBe(false);
    }
    // An Apple preview is for music only.
    expect(isAllowedMediaUrl(APPLE, "image")).toBe(false);
    expect(isAllowedMediaUrl(APPLE, "voice")).toBe(false);
  });

  it("refuses a storage path outside a gift's folder", () => {
    expect(isAllowedMediaUrl("gifts/not-a-gift/x.webp", "image")).toBe(false);
    expect(isAllowedMediaUrl(`gifts/${GIFT}/../other/x.webp`, "image")).toBe(false);
    expect(isAllowedMediaUrl("", "image")).toBe(false);
    expect(isAllowedMediaUrl(undefined, "image")).toBe(false);
  });

  it("checks every field together", () => {
    const ok = { photos: [{ id: "1", url: upload(), width: 1, height: 1 }], video: { url: upload("mp4"), poster: upload() }, voiceNote: { url: upload("webm") }, music: { source: "library" as const, url: "/audio/library/fireside.mp3", startAt: 0 } };
    expect(mediaUrlsAllowed(ok)).toBe(true);
    expect(mediaUrlsAllowed({ ...ok, video: { url: upload("mp4"), poster: "https://tryethos.io/auth/confirm?token_hash=x" } })).toBe(false);
    expect(mediaUrlsAllowed({ ...ok, photos: [] , video: undefined, voiceNote: undefined, music: undefined })).toBe(true);
  });
});

describe("a gift saved before the rule", () => {
  it("reaches the recipient without its foreign media, and with everything else as it was", () => {
    const stored = {
      photos: [
        { id: "1", url: upload(), width: 4, height: 3 },
        { id: "2", url: "https://tryethos.io/auth/confirm?token_hash=x&type=email", width: 4, height: 3 },
        { id: "3", url: "idb:pending", width: 4, height: 3 },
      ],
      video: { url: "https://evil.supabase.co/v.mp4" },
      voiceNote: { url: upload("webm") },
      music: { source: "catalog" as const, url: APPLE, startAt: 0 },
    };
    const out = withoutForeignMedia(stored);
    expect(out.photos.map((p) => p.url)).toEqual([upload(), BLANK_IMAGE, "idb:pending"]);
    expect(out.photos[1]).toMatchObject({ id: "2", width: 4, height: 3 });
    expect(out.video).toBeUndefined();
    expect(out.voiceNote).toEqual(stored.voiceNote);
    expect(out.music).toEqual(stored.music);
  });

  it("drops a foreign poster and keeps the video", () => {
    const out = withoutForeignMedia({ photos: [], video: { url: upload("mp4"), poster: "/api/checkout/finish?t=x" } });
    expect(out.video).toEqual({ url: upload("mp4"), poster: undefined });
  });
});

describe("the sign-in links", () => {
  const h = (dest?: string) => new Headers(dest ? { "sec-fetch-dest": dest } : {});
  it("act on a page being opened, and on browsers that don't say", () => {
    expect(isPageNavigation(h("document"))).toBe(true);
    expect(isPageNavigation(h())).toBe(true);
  });
  it("do nothing for an image, a script or a fetch", () => {
    for (const dest of ["image", "video", "audio", "script", "empty", "iframe", "style"]) expect(isPageNavigation(h(dest)), dest).toBe(false);
  });
});
