"use client";

import { nanoid } from "nanoid";
import type { GiftData, GiftPhoto } from "@/lib/gift/schema";
import { isStoragePath } from "@/lib/gift/assets";
import { loadGiftForEdit, reminderNameFor, signAssetUrls } from "@/app/actions/gift";
import { NOTE_TEMPLATES } from "@/lib/gift/free-tier";
import type { TemplateManifest } from "@/templates/types";
import { putBlob } from "./blob-store";
import type { StartRef } from "./start-ref";

/**
 * A new gift started from one the account already made for the same person, as a reminder e-mail's
 * "Open my gift" asks (api/reminders/open): both names and the photos, as many as the new template
 * holds, first ones first, each with its caption. Nothing else of the old gift comes: not its words,
 * title, song, voice, clip, surprise, colours or the old template's own fields.
 *
 * It runs in the owner's own browser, signed in: the old gift is read with loadGiftForEdit (which
 * refuses any gift that isn't the caller's), its files are fetched through owner-only signed
 * addresses, and each is stored on this device as a new file under a new id, as moving a draft to
 * another template does (lib/editor/move-gift.ts). Nothing is copied on the server, nothing is made
 * ahead of time.
 */

/** "photos": both names and photos came; "names": both names, no photos; "name": only theirs (no gift for them yet). */
export type StartedFrom = { name: string; photos: number; mode: "photos" | "names" | "name" };
export type StartSeed = { seed: Pick<GiftData, "recipientName"> & Partial<Pick<GiftData, "senderName" | "photos">>; from: StartedFrom };

/**
 * Pure: how many photos a start may bring into `manifest`: as many as it holds, except none into a
 * free note (The Letter, Constellations), where photos are what makes it a paid gift. Nobody is
 * handed a paid gift without asking for one; the names still come.
 */
export function startPhotoLimit(manifest: Pick<TemplateManifest, "slug" | "tier" | "features">): number {
  if (manifest.tier === "free" && NOTE_TEMPLATES.includes(manifest.slug)) return 0;
  return manifest.features.photos.max;
}

/** Pure: what a new gift takes from an old one's data (photos still at their stored addresses). */
export function seedFromGift(data: unknown, maxPhotos: number): { recipientName: string; senderName: string; photos: GiftPhoto[] } | null {
  const d = (data ?? {}) as Partial<GiftData>;
  const recipientName = typeof d.recipientName === "string" ? d.recipientName.trim() : "";
  if (!recipientName) return null;
  const senderName = typeof d.senderName === "string" ? d.senderName.trim() : "";
  const photos = (Array.isArray(d.photos) ? d.photos : [])
    .filter((p): p is GiftPhoto => Boolean(p) && typeof p.url === "string" && typeof p.width === "number" && typeof p.height === "number")
    .slice(0, Math.max(0, maxPhotos))
    .map((p) => ({ id: p.id, url: p.url, width: p.width, height: p.height, ...(p.caption ? { caption: p.caption } : {}), ...(p.alt ? { alt: p.alt } : {}) }));
  return { recipientName, senderName, photos };
}

/** Pure: whether a draft already holds something of the sender's (names, photos or words). */
export function draftHasContent(data: Pick<GiftData, "recipientName" | "senderName" | "photos" | "message"> | null | undefined): boolean {
  if (!data) return false;
  return Boolean(data.recipientName?.trim() || data.senderName?.trim() || data.photos?.length || data.message?.trim());
}

/** The files at these addresses as new files on this device: the owner's stored ones through signed addresses, the site's own (a demo) as they are. */
async function copyToDevice(photos: GiftPhoto[]): Promise<GiftPhoto[]> {
  const stored = photos.filter((p) => isStoragePath(p.url));
  const signed = stored.length ? await signAssetUrls(stored.map((p) => p.url)) : { ok: true as const, data: {} as Record<string, string> };
  const map = signed.ok ? signed.data : {};
  const copies = await Promise.all(
    photos.map(async (p) => {
      const address = map[p.url] ?? (p.url.startsWith("https:") || (p.url.startsWith("/") && !p.url.startsWith("//")) ? p.url : null);
      if (!address) return null;
      try {
        const res = await fetch(address);
        if (!res.ok) return null;
        const blob = await res.blob();
        if (blob.size === 0) return null;
        const id = nanoid(10);
        await putBlob(id, blob);
        return { ...p, id, url: `idb:${id}` };
      } catch {
        return null;
      }
    }),
  );
  return copies.filter((p): p is GiftPhoto => p !== null);
}

/** What a start would bring, read without fetching a file: enough to name it in an offer. */
export type PreparedStart = { names: { recipientName: string; senderName: string }; photos: GiftPhoto[]; from: StartedFrom };

function prepared(taken: { recipientName: string; senderName: string; photos: GiftPhoto[] }): PreparedStart {
  return {
    names: { recipientName: taken.recipientName, senderName: taken.senderName },
    photos: taken.photos,
    from: { name: taken.recipientName, photos: taken.photos.length, mode: taken.photos.length > 0 ? "photos" : taken.senderName ? "names" : "name" },
  };
}

/** Reads what `ref` would start from: null when the gift or reminder isn't the caller's, or can't be read. */
export async function prepareStart(ref: StartRef, maxPhotos: number): Promise<PreparedStart | null> {
  if (ref.kind === "reminder") {
    const found = await reminderNameFor(ref.id);
    const name = found.ok ? found.data.name.trim() : "";
    return name ? prepared({ recipientName: name, senderName: "", photos: [] }) : null;
  }
  const gift = await loadGiftForEdit(ref.id);
  if (!gift.ok) return null;
  const taken = seedFromGift(gift.data.data, maxPhotos);
  return taken ? prepared(taken) : null;
}

/** A template's own demo as a start (development only: the way to draw the card without an account). */
export function prepareDemo(demo: unknown, maxPhotos: number): PreparedStart | null {
  const taken = seedFromGift(demo, maxPhotos);
  return taken ? prepared(taken) : null;
}

/**
 * The seed itself: the photos copied onto this device under new ids. A photo whose file can't be
 * fetched is left out rather than left broken.
 */
export async function finishStart(start: PreparedStart): Promise<StartSeed> {
  const photos = await copyToDevice(start.photos);
  const { recipientName, senderName } = start.names;
  return {
    seed: { recipientName, ...(senderName ? { senderName } : {}), ...(photos.length ? { photos } : {}) },
    from: { ...start.from, photos: photos.length, mode: photos.length > 0 ? "photos" : senderName ? "names" : "name" },
  };
}

/** Both steps at once: what `ref` starts, with its photos on this device. */
export async function startSeed(ref: StartRef, maxPhotos: number): Promise<StartSeed | null> {
  const start = await prepareStart(ref, maxPhotos);
  return start ? finishStart(start) : null;
}
