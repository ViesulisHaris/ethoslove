import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";

// The editor's server actions, stood in for: opening a gift only signs its stored files.
const signAssetUrls = vi.fn(async (paths: string[]) => ({
  ok: true as const,
  data: Object.fromEntries(paths.map((p) => [p, `https://signed.test/${p}`])),
}));
vi.mock("@/app/actions/gift", () => ({ ensureDraft: vi.fn(), saveDraft: vi.fn(), signAssetUrls }));

const { useEditor } = await import("@/lib/editor/store");
const { draftKey } = await import("@/lib/editor/persistence");

const blank: GiftData = {
  version: 1,
  templateSlug: "the-letter",
  locale: "en",
  title: "",
  recipientName: "",
  senderName: "",
  message: "",
  messageStyle: "typewriter",
  photos: [],
  accentColor: "#E8604C",
  fontPairing: "editorial",
  cover: "lilies",
  showReactionCta: true,
  watermark: true,
  fields: { paper: "cream" },
};

const open = (data: unknown) =>
  useEditor.getState().init({
    slug: "the-letter",
    manifest: { slug: "the-letter" } as TemplateManifest,
    initial: blank,
    authed: false,
    userId: null,
    remote: { id: "gift-1", shortId: "abc123", status: "draft", data: data as GiftData, unlockAt: null, timezone: null, hasPassword: false },
  });

describe("opening a saved gift in the editor", () => {
  // In braces: a function handed back from beforeEach is run after the test as its cleanup.
  beforeEach(() => {
    signAssetUrls.mockClear();
  });

  it("opens a draft whose row is still empty, as a new gift starts", async () => {
    // 9 Nov 2026, three times on iPhones: "undefined is not an object (evaluating 'd.data.photos.map')".
    await open({});
    const s = useEditor.getState();
    expect(s.hydrated).toBe(true);
    expect(s.data).toEqual(blank);
    expect(s.giftId).toBe("gift-1");
    expect(s.dirty).toBe(false);
  });

  it("opens a gift missing its photo list and settings", async () => {
    await open({ templateSlug: "the-letter", recipientName: "Ana", senderName: "Marco", message: "Hi" });
    const s = useEditor.getState();
    expect(s.data).toMatchObject({ recipientName: "Ana", senderName: "Marco", message: "Hi", photos: [], fields: { paper: "cream" } });
    expect(s.removeWatermark).toBe(false);
  });

  it("still opens a whole gift as it was, its stored photos signed for the preview", async () => {
    const photo = { id: "p1", url: "gifts/u1/gift-1/p1.webp", width: 800, height: 600 };
    const whole: GiftData = { ...blank, recipientName: "Ana", senderName: "Marco", photos: [photo], cover: undefined, watermark: false, fields: { paper: "blue" } };
    delete whole.cover;
    await open(JSON.parse(JSON.stringify(whole)));
    const s = useEditor.getState();
    expect(signAssetUrls).toHaveBeenCalledWith([photo.url]);
    expect(s.data).toEqual({ ...whole, photos: [{ ...photo, url: `https://signed.test/${photo.url}` }], music: undefined, video: undefined });
    expect("cover" in s.data).toBe(false);
    expect(s.assets.p1).toMatchObject({ storagePath: photo.url, status: "uploaded" });
    expect(s.removeWatermark).toBe(true);
  });

  it("opens a draft this browser kept with pieces missing", async () => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => kept.get(k) ?? null,
      setItem: (k: string, v: string) => void kept.set(k, v),
      removeItem: (k: string) => void kept.delete(k),
    });
    try {
      kept.set(
        draftKey("the-letter"),
        JSON.stringify({
          version: 1,
          slug: "the-letter",
          data: { templateSlug: "the-letter", recipientName: "Ana" },
          giftId: null,
          shortId: null,
          status: "draft",
          schedule: { enabled: false, timezone: "Europe/Riga" },
          password: "",
          removeWatermark: false,
          updatedAt: Date.now(),
        }),
      );
      await useEditor.getState().init({ slug: "the-letter", manifest: { slug: "the-letter" } as TemplateManifest, initial: blank, authed: false, userId: null, remote: null });
      const s = useEditor.getState();
      expect(s.hydrated).toBe(true);
      expect(s.data).toMatchObject({ recipientName: "Ana", photos: [], fields: { paper: "cream" } });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
