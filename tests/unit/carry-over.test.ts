import { describe, expect, it } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import { carryOver, filesToCarry } from "@/lib/editor/carry-over";
import { MOVE_TO_SLUGS } from "@/config/featured";
import { getManifest } from "@/templates/manifests";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";

const letter = getManifest("the-letter")!;
const bouquet = getManifest("bouquet")!;
const cinema = getManifest("birthday-cinema")!;

const photo = (n: number) => ({ id: `p${n}`, url: `blob:photo-${n}`, width: 800, height: 600, caption: `caption ${n}`, alt: "" });

function gift(over: Partial<GiftData> = {}): GiftData {
  return {
    version: 1,
    templateSlug: "the-letter",
    locale: "en",
    title: "For Sam",
    recipientName: "Sam",
    senderName: "Alex",
    message: "Remember the bus that never came?",
    messageStyle: "typewriter",
    photos: [photo(1), photo(2)],
    accentColor: letter.defaultAccent,
    fontPairing: "handwritten",
    cover: "classic",
    showReactionCta: true,
    watermark: false,
    fields: { paper: "kraft", signOff: "Always," },
    ...over,
  };
}

/** Where the store would find a file addressed by URL (a voice note, a clip and its still frame). */
const assetsByUrl: Record<string, string> = { "blob:voice": "v1", "blob:clip": "c1", "blob:still": "c1p" };
const idForUrl = (url: string) => assetsByUrl[url];
const copyAll = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, `${id}-copy`]));

describe("moving a gift into another template", () => {
  it("offers only premium templates that exist", () => {
    for (const slug of MOVE_TO_SLUGS) expect(getManifest(slug)?.tier, slug).toBe("premium");
  });

  it("takes the sender's own things and leaves the old template's behind", () => {
    const data = gift({ unwrap: { kind: "date", title: "Dinner at ours", stops: [] } });
    const moved = carryOver({ data, from: letter, to: bouquet, fields: { stems: 7 }, copies: copyAll(["p1", "p2"]), idForUrl });
    expect(moved).toMatchObject({
      templateSlug: "bouquet",
      recipientName: "Sam",
      senderName: "Alex",
      title: "For Sam",
      message: "Remember the bus that never came?",
      fontPairing: "handwritten",
      unwrap: { kind: "date", title: "Dinner at ours" },
      cover: defaultCoverFor("bouquet"),
      fields: { stems: 7 },
      watermark: true,
    });
    // The letter's default colour was never their choice; a colour they picked goes with them.
    expect(moved.accentColor).toBe(bouquet.defaultAccent);
    const picked = carryOver({ data: gift({ accentColor: "#123abc" }), from: letter, to: bouquet, fields: {}, copies: {}, idForUrl });
    expect(picked.accentColor).toBe("#123abc");
  });

  it("gives every file a copy of its own, and leaves out one the browser no longer had", () => {
    const data = gift({ photos: [photo(1), photo(2), photo(3)] });
    const moved = carryOver({ data, from: letter, to: bouquet, fields: {}, copies: { p1: "n1", p3: "n3" }, idForUrl });
    expect(moved.photos).toEqual([
      { ...photo(1), id: "n1", url: "idb:n1" },
      { ...photo(3), id: "n3", url: "idb:n3" },
    ]);
  });

  it("takes as many photos as the new template holds, first ones first", () => {
    const many = Array.from({ length: 9 }, (_, i) => photo(i + 1));
    const data = gift({ photos: many });
    const files = filesToCarry(data, bouquet, idForUrl);
    expect(files.map((f) => f.id)).toEqual(many.slice(0, bouquet.features.photos.max).map((p) => p.id));
    const moved = carryOver({ data, from: letter, to: bouquet, fields: {}, copies: copyAll(files.map((f) => f.id)), idForUrl });
    expect(moved.photos).toHaveLength(bouquet.features.photos.max);
  });

  it("brings the song, whether it is theirs or from the library", () => {
    const upload = gift({ music: { source: "upload", url: "blob:song", trackId: "t1", title: "Our song", startAt: 12 } });
    expect(filesToCarry(upload, bouquet, idForUrl).map((f) => f.id)).toContain("t1");
    const moved = carryOver({ data: upload, from: letter, to: bouquet, fields: {}, copies: { t1: "t2" }, idForUrl });
    expect(moved.music).toEqual({ source: "upload", url: "idb:t2", trackId: "t2", title: "Our song", startAt: 12 });
    expect(carryOver({ data: upload, from: letter, to: bouquet, fields: {}, copies: {}, idForUrl }).music).toBeUndefined();

    const library = gift({ music: { source: "library", url: "/music/soft-piano.mp3", title: "Soft piano", startAt: 0 } });
    expect(carryOver({ data: library, from: letter, to: bouquet, fields: {}, copies: {}, idForUrl }).music).toEqual(library.music);
    // A template with no music at all takes none.
    const silent = { ...bouquet, features: { ...bouquet.features, music: false } };
    expect(carryOver({ data: library, from: letter, to: silent, fields: {}, copies: {}, idForUrl }).music).toBeUndefined();
  });

  it("brings the voice note, and the clip only where the new template plays one", () => {
    const data = gift({ voiceNote: { url: "blob:voice", duration: 14 }, video: { url: "blob:clip", poster: "blob:still" } });
    expect(filesToCarry(data, bouquet, idForUrl).map((f) => f.id)).toEqual(["p1", "p2", "v1"]);
    expect(filesToCarry(data, cinema, idForUrl).map((f) => f.id)).toEqual(["p1", "p2", "v1", "c1", "c1p"]);

    const all = copyAll(["p1", "p2", "v1", "c1", "c1p"]);
    const toBouquet = carryOver({ data, from: letter, to: bouquet, fields: {}, copies: all, idForUrl });
    expect(toBouquet.voiceNote).toEqual({ url: "idb:v1-copy", duration: 14 });
    expect(toBouquet.video).toBeUndefined();

    const toCinema = carryOver({ data, from: letter, to: cinema, fields: {}, copies: all, idForUrl });
    expect(toCinema.video).toEqual({ url: "idb:c1-copy", poster: "idb:c1p-copy" });
    // A clip whose still frame is gone still plays; a voice note that is gone is left out.
    const partial = carryOver({ data, from: letter, to: cinema, fields: {}, copies: { c1: "c2" }, idForUrl });
    expect(partial.video).toEqual({ url: "idb:c2", poster: undefined });
    expect(partial.voiceNote).toBeUndefined();
  });
});
