"use client";

import { nanoid } from "nanoid";
import { getManifest } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";
import { getBlob, putBlob } from "./blob-store";
import { carryOver, filesToCarry } from "./carry-over";
import { readLocalDraft, writeLocalDraft } from "./persistence";
import { useEditor } from "./store";
import type { EditorDraft } from "./types";

/** This tab's copy of a file, else the file at the address the editor is showing it from. */
async function blobFor(id: string, url: string): Promise<Blob | null> {
  const held = await getBlob(id);
  if (held && held.size > 0) return held;
  if (!url.startsWith("blob:") && !url.startsWith("https:")) return null;
  try {
    const res = await fetch(url);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/**
 * Leaves the gift being edited as a new draft of template `slug`, saved on this device under the
 * key that template's editor opens, so going to /create/<slug> finds it filled in. The gift being
 * edited stays exactly as it is, to go back to. A new draft, never the old one's row: a signed-in
 * sender's draft row belongs to the old template, and moving it would make one gift two templates.
 *
 * False when the template doesn't exist or the draft couldn't be saved on this device; the editor
 * then stays where it is rather than open on an empty gift.
 */
export async function moveGiftTo(slug: string): Promise<boolean> {
  // The gift being left is saved first, keystrokes of a moment ago included, for the way back.
  useEditor.getState().flushLocal();
  const s = useEditor.getState();
  const to = getManifest(slug);
  if (!to || !s.manifest || !s.hydrated || s.slug === slug) return false;
  const schema = await loadFieldsSchema(slug);
  const defaults = schema?.safeParse({});
  const fields = defaults?.success ? (defaults.data as Record<string, unknown>) : {};
  const idForUrl = (url: string) => Object.values(s.assets).find((a) => a.objectUrl === url)?.id;

  const copies: Record<string, string> = {};
  await Promise.all(
    filesToCarry(s.data, to, idForUrl).map(async (file) => {
      const blob = await blobFor(file.id, file.url);
      if (!blob) return;
      const id = nanoid(10);
      await putBlob(id, blob);
      copies[file.id] = id;
    }),
  );

  const updatedAt = Date.now();
  const draft: EditorDraft = {
    version: 1,
    slug,
    data: carryOver({ data: s.data, from: s.manifest, to, fields, copies, idForUrl }),
    giftId: null,
    shortId: null,
    status: "draft",
    schedule: s.schedule,
    password: s.password,
    removeWatermark: false,
    updatedAt,
  };
  writeLocalDraft(slug, JSON.stringify(draft));
  return readLocalDraft(slug)?.updatedAt === updatedAt;
}
