"use client";

/**
 * HEIC/HEIF photos, the format iPhones shoot in, turned into a JPEG the rest of the pipeline reads.
 *
 * The decoder is libheif (from heic2any) running in /workers/heic-decoder-<version>.js, a worker
 * file with a Content-Security-Policy of its own: the decoder needs `new Function`, which the page's
 * policy forbids. See scripts/heic-worker.mjs for why it can't be heic2any's own blob worker.
 */

/** Must match public/workers/ — tests/unit/heic-worker.test.ts checks it against node_modules. */
export const HEIC_WORKER_URL = "/workers/heic-decoder-0.0.4.js";

/** ISO-BMFF brands a HEIF file can carry. AVIF is HEIF too, but every browser reads it, so it's left out. */
const HEIF_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1"]);

/** A HEIF file starts `....ftyp<brand>`; read the brand rather than trust a name or a type. */
export function isHeifHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const ascii = (from: number) => String.fromCharCode(bytes[from], bytes[from + 1], bytes[from + 2], bytes[from + 3]);
  return ascii(4) === "ftyp" && HEIF_BRANDS.has(ascii(8));
}

export async function isHeif(file: Blob): Promise<boolean> {
  try {
    return isHeifHeader(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  } catch {
    return false;
  }
}

type DecoderReply = { id?: number; imageDataArr?: ImageData[]; error?: string };

/**
 * Decodes the first image in a HEIC and returns it as a JPEG no larger than `maxEdge` on its long
 * side. Drawn straight at that size: a 48 MP "HEIF Max" photo is past what a phone's canvas will
 * hold at full resolution.
 */
export async function heicToJpeg(file: Blob, maxEdge: number): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const worker = new Worker(HEIC_WORKER_URL);
  try {
    const image = await new Promise<ImageData>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<DecoderReply>) => {
        const first = event.data?.imageDataArr?.[0];
        if (event.data?.error || !first) reject(new Error("processing_failed"));
        else resolve(first);
      };
      worker.onerror = (event) => {
        // Handled here, so a decoder that fails to start is a failed photo, not an uncaught page error.
        event.preventDefault();
        reject(new Error("processing_failed"));
      };
      worker.postMessage({ id: 1, buffer }, [buffer]);
    });
    const bitmap = await createImageBitmap(image);
    try {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("processing_failed");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!jpeg) throw new Error("processing_failed");
      return jpeg;
    } finally {
      bitmap.close();
    }
  } finally {
    worker.terminate();
  }
}
