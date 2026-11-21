import "server-only";

import sharp from "sharp";
import { GROUP_LIMITS } from "./limits";

/** What a contributor's browser may send; whatever it says, the file is decoded to find out. */
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type EncodedPhoto = { ok: true; webp: Buffer; width: number; height: number } | { ok: false; error: "too_large" | "bad_photo" };

/**
 * A photo from a stranger, made into the only kind the site keeps: decoded, turned the right way
 * up, fitted inside 1600 px and written out again as WebP. Writing it out again is the point. The
 * file that arrived is never stored, so nothing hidden in it is either: not the phone's location or
 * its owner's name (EXIF), not a second image, not a script dressed as a picture. A file that will
 * not decode as an image, or claims more pixels than a phone photo has, is refused.
 */
export async function encodePhoto(file: { type: string; bytes: Buffer }): Promise<EncodedPhoto> {
  if (file.bytes.byteLength > GROUP_LIMITS.photoBytes) return { ok: false, error: "too_large" };
  if (!TYPES.has(file.type) || file.bytes.byteLength === 0) return { ok: false, error: "bad_photo" };
  try {
    const { data, info } = await sharp(file.bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(GROUP_LIMITS.photoEdge, GROUP_LIMITS.photoEdge, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || data.byteLength > GROUP_LIMITS.photoBytes) return { ok: false, error: "bad_photo" };
    return { ok: true, webp: data, width: info.width, height: info.height };
  } catch {
    return { ok: false, error: "bad_photo" };
  }
}
