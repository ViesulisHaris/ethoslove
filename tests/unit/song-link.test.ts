import { describe, expect, it } from "vitest";
import { giftDataBaseSchema } from "@/lib/gift/schema";
import { isSongThumbnail, parseSongLink, youtubeThumbnail } from "@/lib/gift/song-link";

describe("song links", () => {
  it("rebuilds YouTube links from the video id, dropping everything else", () => {
    expect(parseSongLink("https://youtu.be/kPa7bsKwL-c?si=tracking")).toEqual({ provider: "youtube", url: "https://www.youtube.com/watch?v=kPa7bsKwL-c", videoId: "kPa7bsKwL-c" });
    expect(parseSongLink("https://www.youtube.com/watch?v=kPa7bsKwL-c&list=RD&t=30")?.url).toBe("https://www.youtube.com/watch?v=kPa7bsKwL-c");
    expect(parseSongLink("https://m.youtube.com/shorts/kPa7bsKwL-c")?.videoId).toBe("kPa7bsKwL-c");
    expect(parseSongLink("https://music.youtube.com/watch?v=kPa7bsKwL-c")?.url).toBe("https://music.youtube.com/watch?v=kPa7bsKwL-c");
    expect(youtubeThumbnail("kPa7bsKwL-c")).toBe("https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg");
  });

  it("accepts Spotify and Apple Music songs", () => {
    expect(parseSongLink("https://open.spotify.com/intl-es/track/2plbrEY59IikOBgBGLjaoe?si=abc")).toEqual({ provider: "spotify", url: "https://open.spotify.com/track/2plbrEY59IikOBgBGLjaoe" });
    expect(parseSongLink("https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372")).toEqual({ provider: "apple", url: "https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372" });
  });

  it("refuses anything else", () => {
    for (const bad of ["http://youtu.be/kPa7bsKwL-c", "https://youtube.com.evil.io/watch?v=kPa7bsKwL-c", "https://www.youtube.com/watch?v=short", "https://open.spotify.com/artist/2plbrEY59IikOBgBGLjaoe", "javascript:alert(1)", "https://example.com/song", "not a link"]) {
      expect(parseSongLink(bad), bad).toBeNull();
    }
  });

  it("only allows thumbnails from the providers' image hosts", () => {
    expect(isSongThumbnail("https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg")).toBe(true);
    expect(isSongThumbnail("https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02")).toBe(true);
    expect(isSongThumbnail("https://i.scdn.co/image/ab67616d00001e02")).toBe(true);
    expect(isSongThumbnail("http://i.ytimg.com/vi/x/hqdefault.jpg")).toBe(false);
    expect(isSongThumbnail("https://tracker.example/pixel.gif")).toBe(false);
  });
});

describe("gift dedication", () => {
  const base = { templateSlug: "the-letter", recipientName: "Ana", senderName: "Leo" };
  it("accepts a supported link and a provider thumbnail", () => {
    const ok = giftDataBaseSchema.safeParse({ ...base, dedication: { url: "https://www.youtube.com/watch?v=kPa7bsKwL-c", title: "Die With A Smile", thumbnail: "https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg", note: "our song" } });
    expect(ok.success).toBe(true);
  });
  it("rejects other sites and foreign thumbnails", () => {
    expect(giftDataBaseSchema.safeParse({ ...base, dedication: { url: "https://example.com/song" } }).success).toBe(false);
    expect(giftDataBaseSchema.safeParse({ ...base, dedication: { url: "https://youtu.be/kPa7bsKwL-c", thumbnail: "https://tracker.example/p.gif" } }).success).toBe(false);
  });
});
