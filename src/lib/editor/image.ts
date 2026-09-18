"use client";

import { LIMITS } from "@/config/site";
import { heicToJpeg, isHeif } from "./heic";

export type ProcessedImage = { blob: Blob; width: number; height: number };

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const out = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return out;
}

/**
 * HEIC → JPEG (only when the file really is one; the decoder is ~1MB so it loads only then), then
 * resize + compress to WebP under LIMITS.photoMaxBytes. 1600px at ~0.5 MB is more than a phone
 * screen shows, and a third of what we used to upload and serve.
 */
/**
 * A decoder that never comes back leaves the photo on "Preparing…" for ever, and the publish
 * checklist waits behind it with nothing to show the sender. Give every step a finish line.
 */
const PREPARE_MS = 45_000;

function withDeadline<T>(work: Promise<T>, ms = PREPARE_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("processing_failed")), ms);
    work.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  let source: Blob = file;
  // By its bytes, not its name: a HEIC can arrive as "photo.jpg", and a JPEG as "IMG_1.HEIC".
  if (await isHeif(file)) {
    // Twice the final size, so the resize below still has detail to work from.
    source = await withDeadline(heicToJpeg(file, LIMITS.photoMaxEdgePx * 2));
  }
  const { default: compress } = await import("browser-image-compression");
  const blob = await withDeadline(compress(source as File, {
    maxSizeMB: LIMITS.photoMaxBytes / (1024 * 1024),
    maxWidthOrHeight: LIMITS.photoMaxEdgePx,
    fileType: "image/webp",
    initialQuality: 0.82,
    // Its worker fetches the library from cdn.jsdelivr.net, which our policy refuses, so every
    // photo paid for a blocked request and fell back to this thread anyway. Same work, no detour.
    useWebWorker: false,
    preserveExif: false,
  }));
  const dims = await dimensions(blob);
  return { blob, ...dims };
}

/** Draws the image onto a canvas with a rotation (multiples of 90°) and/or crop rectangle. */
export async function transformImage(
  blob: Blob,
  opts: { rotate?: 0 | 90 | 180 | 270; crop?: { x: number; y: number; width: number; height: number } },
): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(blob);
  const rotate = opts.rotate ?? 0;
  const crop = opts.crop ?? { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  const swapped = rotate === 90 || rotate === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? crop.height : crop.width;
  canvas.height = swapped ? crop.width : crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, -crop.width / 2, -crop.height / 2, crop.width, crop.height);
  bitmap.close();
  const out = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", 0.88),
  );
  return { blob: out, width: canvas.width, height: canvas.height };
}
