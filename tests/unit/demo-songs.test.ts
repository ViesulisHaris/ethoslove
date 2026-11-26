import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_SONG_SLUGS, demoSong } from "@/content/demo-songs";
import { appleMusicTrackUrl, isApplePreviewUrl, isCatalogPreview, isKnownMusic } from "@/lib/gift/music";
import { isSongThumbnail } from "@/lib/gift/song-link";
import { giftMusicSchema } from "@/lib/gift/schema";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";

describe("the song each demo carries while the song strip is on", () => {
  it("is there for every gift in the gallery, and for nothing that is not a gift", () => {
    const slugs = TEMPLATE_MANIFESTS.map((m) => m.slug).filter((slug) => !slug.startsWith("_"));
    for (const slug of slugs) expect(demoSong(slug), `${slug} has no demo song`).toBeTruthy();
    // A gift held out of the gallery (the advent calendar) may keep its row: every row is a template that exists.
    for (const slug of DEMO_SONG_SLUGS) expect(existsSync(join(process.cwd(), "src/templates", slug, "manifest.ts")), `${slug} is not a template`).toBe(true);
    expect(demoSong("not-a-template")).toBeUndefined();
  });

  it("is a real song as the editor saves one: Apple's own preview, its cover and its page on Apple Music", () => {
    for (const slug of DEMO_SONG_SLUGS) {
      const song = demoSong(slug)!;
      expect(giftMusicSchema.safeParse(song).success, slug).toBe(true);
      expect(isCatalogPreview(song), slug).toBe(true);
      expect(isApplePreviewUrl(song.url), slug).toBe(true);
      expect(isKnownMusic(song), slug).toBe(true);
      expect(song.artwork && isSongThumbnail(song.artwork), slug).toBe(true);
      expect(appleMusicTrackUrl(song, "en"), slug).toMatch(/^https:\/\/music\.apple\.com\//);
      expect(song.title, slug).toBeTruthy();
      expect(song.artist, slug).toBeTruthy();
    }
  });
});
