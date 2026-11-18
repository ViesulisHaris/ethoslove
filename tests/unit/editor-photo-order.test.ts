import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";

/**
 * 17 Nov 2026: Our Timeline showed the same two photos in a different order between two runs of
 * the same steps. Photos picked together are prepared side by side, and each went to the end of
 * the gift the moment it was ready, so the gift took them in the order they finished, not the
 * order they were picked; a big photo or a HEIC finishes later. Here each file finishes when the
 * test says so.
 */

const finish = new Map<string, (ok: boolean) => void>();
vi.mock("@/lib/editor/image", () => ({
  processImageFile: (file: File) =>
    new Promise((resolve, reject) =>
      finish.set(file.name, (ok) =>
        ok ? resolve({ blob: new Blob([file.name], { type: "image/webp" }), width: 800, height: 600 }) : reject(new Error("unreadable")),
      ),
    ),
  transformImage: vi.fn(),
}));
vi.mock("idb-keyval", () => ({
  set: vi.fn(async () => {}),
  get: vi.fn(async () => undefined),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => []),
}));
vi.mock("@/app/actions/gift", () => ({ ensureDraft: vi.fn(), saveDraft: vi.fn(), signAssetUrls: vi.fn(async () => ({ ok: true, data: {} })) }));

const { useEditor } = await import("@/lib/editor/store");

const blank: GiftData = {
  version: 1,
  templateSlug: "our-timeline",
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
  fields: {},
};

const openAsGuest = (max: number) =>
  useEditor.getState().init({
    slug: "our-timeline",
    manifest: { slug: "our-timeline", features: { photos: { min: 0, max } } } as TemplateManifest,
    initial: blank,
    authed: false,
    userId: null,
  });

const photo = (name: string) => new File([new Uint8Array(64)], name, { type: name.endsWith(".heic") ? "image/heic" : "image/jpeg" });

/** The gift's photos by name, in the order the gift shows them. */
const shown = () => useEditor.getState().data.photos.map((p) => p.alt);

async function ready(name: string, ok = true) {
  finish.get(name)!(ok);
  await vi.advanceTimersByTimeAsync(0);
}

describe("photos picked together", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // The store saves the draft on window's timers; these tests run without a browser.
    vi.stubGlobal("window", globalThis);
    finish.clear();
    await openAsGuest(20);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("keep the order they were picked in, though the first one picked is ready last, and each shows once it is ready", async () => {
    const adding = useEditor.getState().addPhotos([photo("first.heic"), photo("second.jpg"), photo("third.jpg")]);
    await vi.advanceTimersByTimeAsync(0);
    // All three are being prepared at once, none of them in the gift yet.
    expect([...finish.keys()]).toEqual(["first.heic", "second.jpg", "third.jpg"]);
    expect(Object.values(useEditor.getState().assets).filter((a) => a.status === "processing")).toHaveLength(3);
    expect(shown()).toEqual([]);

    await ready("third.jpg");
    expect(shown()).toEqual(["third"]);
    await ready("second.jpg");
    expect(shown()).toEqual(["second", "third"]);
    await ready("first.heic");
    await adding;
    expect(shown()).toEqual(["first", "second", "third"]);
    expect(useEditor.getState().dirty).toBe(true);
  });

  it("go after the photos already in the gift, and one that can't be read is marked and left out", async () => {
    const earlier = useEditor.getState().addPhotos([photo("already.jpg")]);
    await ready("already.jpg");
    await earlier;

    const adding = useEditor.getState().addPhotos([photo("a.jpg"), photo("broken.heic"), photo("b.jpg"), photo("c.jpg")]);
    await vi.advanceTimersByTimeAsync(0);
    await ready("c.jpg");
    await ready("broken.heic", false);
    await ready("a.jpg");
    await ready("b.jpg");
    await adding;

    expect(shown()).toEqual(["already", "a", "b", "c"]);
    const failed = Object.values(useEditor.getState().assets).filter((a) => a.status === "error");
    expect(failed).toEqual([expect.objectContaining({ kind: "photo", error: "processing_failed" })]);
    expect(useEditor.getState().data.photos.map((p) => p.id)).not.toContain(failed[0].id);
  });

  it("stop at the template's limit, taking the first ones picked", async () => {
    await openAsGuest(3);
    const earlier = useEditor.getState().addPhotos([photo("already.jpg")]);
    await ready("already.jpg");
    await earlier;

    const adding = useEditor.getState().addPhotos([photo("x.jpg"), photo("y.jpg"), photo("z.jpg")]);
    await vi.advanceTimersByTimeAsync(0);
    expect([...finish.keys()]).toEqual(["already.jpg", "x.jpg", "y.jpg"]);
    await ready("x.jpg");
    await ready("y.jpg");
    await adding;
    expect(shown()).toEqual(["already", "x", "y"]);
  });
});
