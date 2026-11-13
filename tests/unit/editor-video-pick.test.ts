import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";

/**
 * 12 Nov 2026: a sender picked a 29-second MP4 for "A short clip" on an iPhone, five ways over, and
 * each time the picker closed on nothing. The editor waited on two things before showing the clip,
 * the copy to the phone's disk and a poster frame, and an iPhone can leave either unanswered.
 * Here neither answers, and the clip must show anyway.
 */

// A disk that never finishes a write: no success, no error.
const idbSet = vi.fn((_key: string, _value: unknown) => new Promise<void>(() => {}));
vi.mock("idb-keyval", () => ({
  set: idbSet,
  get: vi.fn(async () => undefined),
  del: vi.fn(async () => {}),
  keys: vi.fn(async () => []),
}));
vi.mock("@/app/actions/gift", () => ({ ensureDraft: vi.fn(), saveDraft: vi.fn(), signAssetUrls: vi.fn(async () => ({ ok: true, data: {} })) }));

const { useEditor, POSTER_MS } = await import("@/lib/editor/store");
const { DISK_WAIT_MS, getBlob, putBlob } = await import("@/lib/editor/blob-store");

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

const openAsGuest = () =>
  useEditor.getState().init({ slug: "our-timeline", manifest: { slug: "our-timeline" } as TemplateManifest, initial: blank, authed: false, userId: null });

type Listener = () => void;

/** A page whose <video> never loads: neither `loadedmetadata` nor `error`, as on the iPhone. */
function stalledVideoPage() {
  return {
    createElement(tag: string) {
      if (tag !== "video") throw new Error(`no ${tag} is drawn before the frame`);
      return { muted: false, playsInline: false, preload: "", src: "", currentTime: 0, addEventListener() {} };
    },
  };
}

/** A page whose <video> loads and seeks at once, and a canvas that hands back a frame. */
function workingVideoPage() {
  return {
    createElement(tag: string) {
      if (tag === "canvas")
        return { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: (done: (b: Blob) => void) => done(new Blob(["frame"], { type: "image/webp" })) };
      const listeners: Record<string, Listener[]> = {};
      const fire = (event: string) => queueMicrotask(() => (listeners[event] ?? []).splice(0).forEach((fn) => fn()));
      return {
        muted: false,
        playsInline: false,
        preload: "",
        duration: 29,
        videoWidth: 640,
        videoHeight: 480,
        addEventListener(event: string, fn: Listener) {
          (listeners[event] ??= []).push(fn);
        },
        set src(_url: string) {
          fire("loadedmetadata");
        },
        set currentTime(_t: number) {
          fire("seeked");
        },
      };
    },
  };
}

const clip = () => new File([new Uint8Array(4096)], "IMG_0417.MP4", { type: "video/mp4" });

describe("picking a clip", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // The store saves the draft on window's timers; these tests run without a browser.
    vi.stubGlobal("window", globalThis);
    await openAsGuest();
  });
  afterEach(() => {
    useEditor.getState().clearVideo();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("a disk that never answers holds the caller up no longer than DISK_WAIT_MS, and the tab still has the file", async () => {
    const blob = new Blob(["clip"]);
    let settled = false;
    const write = putBlob("a1", blob).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(DISK_WAIT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await write;
    expect(settled).toBe(true);
    expect(await getBlob("a1")).toBe(blob);
  });

  it("shows the clip at once though neither the disk nor the poster frame ever answers", async () => {
    vi.stubGlobal("document", stalledVideoPage());
    const pick = useEditor.getState().setUploadedVideo(clip());
    await vi.advanceTimersByTimeAsync(0);
    const shown = useEditor.getState().data.video;
    expect(shown?.url).toMatch(/^blob:/);
    expect(Object.values(useEditor.getState().assets).filter((a) => a.kind === "video")).toHaveLength(1);
    // The frame gives up on its own, and the clip simply goes on without a poster.
    await vi.advanceTimersByTimeAsync(POSTER_MS);
    await pick;
    expect(useEditor.getState().data.video).toEqual({ url: shown!.url });
  });

  it("adds the poster when the frame comes, and only to the clip it was taken from", async () => {
    vi.stubGlobal("document", workingVideoPage());
    await useEditor.getState().setUploadedVideo(clip());
    const video = useEditor.getState().data.video;
    expect(video?.url).toMatch(/^blob:/);
    expect(video?.poster).toMatch(/^blob:/);
    const kinds = Object.values(useEditor.getState().assets).map((a) => a.kind).sort();
    expect(kinds).toEqual(["photo", "video"]);

    // Removed before its frame arrives: no poster is left behind for a clip that's gone.
    vi.stubGlobal("document", stalledVideoPage());
    useEditor.getState().clearVideo();
    const pick = useEditor.getState().setUploadedVideo(clip());
    await vi.advanceTimersByTimeAsync(0);
    useEditor.getState().clearVideo();
    await vi.advanceTimersByTimeAsync(POSTER_MS);
    await pick;
    expect(useEditor.getState().data.video).toBeUndefined();
    expect(Object.values(useEditor.getState().assets)).toHaveLength(0);
  });
});
