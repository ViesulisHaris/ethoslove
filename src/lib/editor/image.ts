"use client";

import { LIMITS } from "@/config/site";

export type ProcessedImage = { blob: Blob; width: number; height: number };

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

function isHeic(file: File): boolean {
  return HEIC_TYPES.has(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const out = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return out;
}

/**
 * HEIC → JPEG (only when needed, the decoder is ~1MB so it loads lazily), then resize +
 * compress to WebP under LIMITS.photoMaxBytes. Runs in a worker where available. 1600px at
 * ~0.5 MB is more than a phone screen shows, and a third of what we used to upload and serve.
 */
export async function processImageFile(file: File): Promise<ProcessedImage> {
  let source: Blob = file;
  if (isHeic(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }
  const { default: compress } = await import("browser-image-compression");
  const blob = await compress(source as File, {
    maxSizeMB: LIMITS.photoMaxBytes / (1024 * 1024),
    maxWidthOrHeight: LIMITS.photoMaxEdgePx,
    fileType: "image/webp",
    initialQuality: 0.82,
    useWebWorker: true,
    preserveExif: false,
  });
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
