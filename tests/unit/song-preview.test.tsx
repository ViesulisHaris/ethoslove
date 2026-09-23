import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData, GiftMusic } from "@/lib/gift/schema";
import { EndScreen } from "@/templates/_shared/EndScreen";

const song: GiftMusic = {
  source: "catalog",
  url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/p.m4a",
  trackId: "1762656372",
  title: "Die With A Smile",
  artist: "Lady Gaga & Bruno Mars",
  artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music/200x200bb.jpg",
  provider: "itunes",
  externalUrl: "https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372&uo=4&at=1000lSGK",
  startAt: 0,
};
const gift = (music: GiftMusic | undefined, locale: "en" | "es" = "en") =>
  ({ locale, senderName: "Mia", recipientName: "Leo", showReactionCta: false, templateSlug: "the-letter", music }) as unknown as GiftData;

describe("the real song on the end screen", () => {
  it("is a tap-to-play card beside the Apple Music link and the credit", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift(song)} />);
    expect(html).toContain("a song for you");
    expect(html).toContain("Die With A Smile");
    expect(html).toContain("Tap to hear 30 seconds");
    expect(html).toContain("Play 30 seconds of “Die With A Smile”");
    expect(html).toContain("Listen on Apple Music");
    expect(html).toContain("Preview courtesy of Apple Music");
    expect(html).toContain('href="https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372"');
  });

  it("never autoplays and carries no affiliate token into the gift", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift(song)} />);
    // The audio only exists after a tap; nothing on the page can start it by itself.
    expect(html).not.toContain("<audio");
    expect(html).not.toMatch(/autoplay/i);
    expect(html).not.toMatch(/[?&;](at|ct|uo)=/);
  });

  it("speaks Spanish on a Spanish gift", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift(song, "es")} />);
    expect(html).toContain("una canción para ti");
    expect(html).toContain("Toca para escuchar 30 segundos");
    expect(html).toContain("Escúchala en Apple Music");
    expect(html).toContain("Avance por cortesía de Apple Music");
    expect(html).toContain('href="https://music.apple.com/us/album/die-with-a-smile/1762656371?i=1762656372"');
  });

  it("offers no play button for audio that isn't Apple's, only the way to the song", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift({ ...song, url: "https://audio.example/p.m4a" })} />);
    expect(html).toContain("a song for you");
    expect(html).not.toContain("Play 30 seconds");
    expect(html).toContain("It won&#x27;t play here. Listen on Apple Music.");
  });

  it("never plays a preview without the link to the track beside it", () => {
    const html = renderToStaticMarkup(<EndScreen data={gift({ ...song, externalUrl: undefined, trackId: undefined })} />);
    expect(html).not.toContain("a song for you");
    expect(html).not.toContain("Play 30 seconds");
  });

  it("stays out of the way of background music", () => {
    const library: GiftMusic = { source: "library", url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 };
    const html = renderToStaticMarkup(<EndScreen data={gift(library)} />);
    expect(html).not.toContain("a song for you");
    expect(html).not.toContain("Apple Music");
    expect(renderToStaticMarkup(<EndScreen data={gift(undefined)} />)).not.toContain("a song for you");
  });
});
