import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

/**
 * A gift a reminder e-mail starts (lib/editor/start-from-gift.ts) and its card (started-for-you.tsx).
 * The server actions are stubbed; the card is drawn as the server would first draw it.
 */
const actions = vi.hoisted(() => ({
  gift: null as unknown,
  name: null as string | null,
  signed: {} as Record<string, string>,
  stored: [] as string[],
}));
vi.mock("@/app/actions/gift", () => ({
  loadGiftForEdit: async () => (actions.gift ? { ok: true, data: { data: actions.gift } } : { ok: false, error: "not_found" }),
  reminderNameFor: async () => (actions.name ? { ok: true, data: { name: actions.name } } : { ok: false, error: "not_found" }),
  signAssetUrls: async (paths: string[]) => ({ ok: true, data: Object.fromEntries(paths.filter((p) => actions.signed[p]).map((p) => [p, actions.signed[p]])) }),
}));
vi.mock("@/lib/editor/blob-store", () => ({
  putBlob: async (id: string) => {
    actions.stored.push(id);
  },
}));
const editor = vi.hoisted(() => ({ state: { data: { photos: [] as { id: string; url: string }[], recipientName: "", senderName: "" }, status: "draft" } }));
vi.mock("@/lib/editor/store", () => ({ useEditor: (pick: (s: unknown) => unknown) => pick(editor.state) }));

const { draftHasContent, seedFromGift, startPhotoLimit, startSeed } = await import("@/lib/editor/start-from-gift");
const { getManifest } = await import("@/templates/manifests");
const { suggestTemplate } = await import("@/lib/lifecycle/suggest");
const { StartedForYou } = await import("@/components/editor/started-for-you");

const GIFT = "33333333-3333-4333-8333-333333333333";
const photo = (n: number, extra: Record<string, unknown> = {}) => ({ id: `p${n}`, url: `gifts/${GIFT}/p${n}.jpg`, width: 1200, height: 1600, ...extra });
const old = {
  recipientName: " Mia ",
  senderName: "Leo",
  title: "Three years",
  message: "Every word of the old letter",
  photos: [photo(1, { caption: "Lisbon" }), photo(2), photo(3)],
  music: { source: "catalog", url: "https://audio.example/x.m4a" },
  voiceNote: { url: `gifts/${GIFT}/voice.webm`, seconds: 4 },
  accentColor: "#123456",
  fields: { seal: "wax" },
};

describe("what a started gift takes from the last one", () => {
  it("takes both names and the photos with their captions, first ones first, and nothing else", () => {
    const taken = seedFromGift(old, 2)!;
    expect(taken).toEqual({ recipientName: "Mia", senderName: "Leo", photos: [photo(1, { caption: "Lisbon" }), photo(2)] });
    expect(JSON.stringify(taken)).not.toMatch(/Three years|old letter|voice|audio|#123456|wax/);
  });

  it("starts with no photos from a gift that had none, and from nothing without a name", () => {
    expect(seedFromGift({ ...old, photos: [] }, 6)).toEqual({ recipientName: "Mia", senderName: "Leo", photos: [] });
    expect(seedFromGift({ ...old, recipientName: "  " }, 6)).toBeNull();
    expect(seedFromGift(null, 6)).toBeNull();
  });

  it("never puts photos into a free note, which would make it a paid gift; the names still come", () => {
    expect(startPhotoLimit(getManifest("the-letter")!)).toBe(0);
    expect(startPhotoLimit(getManifest("constellations")!)).toBe(0);
    expect(startPhotoLimit(getManifest("museum")!)).toBe(20);
    expect(seedFromGift(old, startPhotoLimit(getManifest("the-letter")!))).toEqual({ recipientName: "Mia", senderName: "Leo", photos: [] });
  });

  it("starts the reminder e-mails' gifts on paid templates only", () => {
    expect(suggestTemplate("other").slug).toBe("the-letter");
    expect(suggestTemplate("other", { paid: true }).slug).toBe("jar-of-reasons");
    expect(suggestTemplate("other", { paid: true, avoid: "jar-of-reasons" }).slug).toBe("paper-crane");
    for (const kind of ["birthday", "anniversary", "valentines", "other"] as const) expect(suggestTemplate(kind, { paid: true }).tier).toBe("premium");
  });

  it("knows a draft that already holds something", () => {
    const empty = { recipientName: "", senderName: "", photos: [], message: "" };
    expect(draftHasContent(empty)).toBe(false);
    expect(draftHasContent({ ...empty, message: "Hi" })).toBe(true);
    expect(draftHasContent({ ...empty, senderName: "Leo" })).toBe(true);
    expect(draftHasContent({ ...empty, photos: [photo(1)] })).toBe(true);
  });
});

describe("starting a gift", () => {
  beforeEach(() => {
    actions.gift = null;
    actions.name = null;
    actions.signed = {};
    actions.stored = [];
    vi.stubGlobal("fetch", async (url: string) => (url.includes("missing") ? new Response(null, { status: 404 }) : new Response(new Blob(["jpeg"]))));
  });

  it("copies each photo onto this device under a new id, leaving out one that can't be fetched", async () => {
    actions.gift = old;
    actions.signed = { [`gifts/${GIFT}/p1.jpg`]: "https://cdn.test/p1?sig", [`gifts/${GIFT}/p2.jpg`]: "https://cdn.test/missing", [`gifts/${GIFT}/p3.jpg`]: "https://cdn.test/p3?sig" };
    const started = (await startSeed({ kind: "gift", id: GIFT }, 6))!;
    expect(started.from).toEqual({ name: "Mia", photos: 2, mode: "photos" });
    expect(started.seed.recipientName).toBe("Mia");
    expect(started.seed.senderName).toBe("Leo");
    expect(started.seed.photos!.map((p) => p.url)).toEqual(actions.stored.map((id) => `idb:${id}`));
    expect(started.seed.photos![0]).toMatchObject({ caption: "Lisbon", width: 1200, height: 1600 });
    expect(started.seed.photos!.every((p) => !["p1", "p3"].includes(p.id))).toBe(true);
  });

  it("brings both names alone from a gift with no photos, the name alone from a reminder, and nothing from someone else's", async () => {
    actions.gift = { ...old, photos: [] };
    expect(await startSeed({ kind: "gift", id: GIFT }, 6)).toEqual({ seed: { recipientName: "Mia", senderName: "Leo" }, from: { name: "Mia", photos: 0, mode: "names" } });
    actions.name = "Mum";
    expect(await startSeed({ kind: "reminder", id: GIFT }, 6)).toEqual({ seed: { recipientName: "Mum" }, from: { name: "Mum", photos: 0, mode: "name" } });
    actions.gift = null;
    actions.name = null;
    expect(await startSeed({ kind: "gift", id: GIFT }, 6)).toBeNull();
    expect(await startSeed({ kind: "reminder", id: GIFT }, 6)).toBeNull();
  });
});

describe("the card on top of a started gift", () => {
  const draw = (state: Parameters<typeof StartedForYou>[0]["state"], locale: "en" | "es" = "en") =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="UTC">
        <StartedForYou state={state} onChangePhotos={() => {}} onEmpty={() => {}} onUse={() => {}} onDismiss={() => {}} />
      </NextIntlClientProvider>,
    )
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

  it("shows the first four photos with the rest counted, what is in, and the two ways on", () => {
    editor.state = { data: { recipientName: "Mia", senderName: "Leo", photos: [1, 2, 3, 4, 5, 6].map((n) => ({ id: `p${n}`, url: `blob:${n}` })) }, status: "draft" };
    const html = draw({ kind: "started", from: { name: "Mia", photos: 6, mode: "photos" } });
    expect(html).toContain("+2");
    expect(html).toContain("Started for you.");
    expect(html).toContain("Both names and the 6 photos from your last gift for Mia are in. Change anything you like.");
    expect(html).toContain("Change the photos");
    expect(html).toContain("Start empty");
    // The line doesn't say again what the button under it says.
    expect(draw({ kind: "started", from: { name: "Mia", photos: 6, mode: "photos" } }, "es")).toContain("Los dos nombres y las 6 fotos de tu último regalo para Mia ya están puestos. Cambia lo que quieras. Cambiar las fotos");
  });

  it("says both names are in when no photos came, and offers no photos to change", () => {
    editor.state = { data: { recipientName: "Mia", senderName: "Leo", photos: [] }, status: "draft" };
    const html = draw({ kind: "started", from: { name: "Mia", photos: 0, mode: "names" } });
    expect(html).toContain("Both names are in. Add your photos and your words.");
    expect(html).not.toContain("+");
    expect(html).not.toContain("Change the photos");
    expect(html).toContain("Start empty");
  });

  it("only offers, in one line, over a draft that already had something in it", () => {
    editor.state = { data: { recipientName: "Ana", senderName: "", photos: [] }, status: "draft" };
    const html = draw({ kind: "offer", from: { name: "Mia", photos: 3, mode: "photos" } });
    expect(html).toContain("Use the names and photos from your last gift for Mia?");
    expect(html).toContain("Use them");
    expect(html).toContain("No thanks");
    expect(html).not.toContain("Started for you.");
  });

  it("never shows on a gift that is already out", () => {
    editor.state = { data: { recipientName: "Mia", senderName: "Leo", photos: [] }, status: "live" };
    expect(draw({ kind: "started", from: { name: "Mia", photos: 0, mode: "names" } }).trim()).toBe("");
  });
});
