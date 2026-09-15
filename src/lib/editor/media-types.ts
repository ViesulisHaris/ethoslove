/**
 * The file types the gifts bucket accepts (migrations 0001 and 0003), and the labels devices really
 * put on files. Storage checks the label, not the bytes, and refuses anything off its list: iPhone
 * Safari labels an .m4r ringtone "audio/x-m4r", some Windows setups label an .mp3 "video/mpeg", and a
 * file whose extension the browser doesn't know arrives as "" or "application/octet-stream". Inside,
 * each of those is an ordinary MP4, MP3 or WAV, so it goes up under the name of what it really is.
 */
import type { AssetRecord } from "./types";

export type UploadKind = AssetRecord["kind"];

export const BUCKET_TYPES: Record<UploadKind, readonly string[]> = {
  photo: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
  audio: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/ogg", "audio/webm"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
};

/** Other names for a type the bucket accepts. */
const ALIASES: Record<string, string> = {
  "audio/x-m4r": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/x-m4b": "audio/mp4",
  "audio/x-m4p": "audio/mp4",
  "audio/mp4a-latm": "audio/mp4",
  "audio/x-mp4": "audio/mp4",
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-mpeg-3": "audio/mpeg",
  "audio/mpg": "audio/mpeg",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/x-pn-wav": "audio/wav",
  "audio/x-aac": "audio/aac",
  "audio/aacp": "audio/aac",
  "audio/opus": "audio/ogg",
  "audio/x-ogg": "audio/ogg",
  "application/ogg": "audio/ogg",
  "video/x-m4v": "video/mp4",
  "video/mov": "video/quicktime",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/heic-sequence": "image/heic",
  "image/heif-sequence": "image/heif",
};

/** What an extension means for each kind of upload. MP4 and WebM hold sound as well as pictures. */
const BY_EXTENSION: Record<UploadKind, Record<string, string>> = {
  photo: { jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif" },
  audio: { mp3: "audio/mpeg", m4a: "audio/mp4", m4r: "audio/mp4", m4b: "audio/mp4", mp4: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", webm: "audio/webm", weba: "audio/webm" },
  video: { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", qt: "video/quicktime", webm: "video/webm" },
};

/**
 * The type to upload a file under, or null when the bucket can't take it: the label the browser
 * gave, then a known alias for it, then the file's extension.
 */
export function uploadTypeFor(kind: UploadKind, label: string | undefined, name?: string): string | null {
  const allowed = BUCKET_TYPES[kind];
  const raw = (label ?? "").split(";")[0].trim().toLowerCase();
  if (allowed.includes(raw)) return raw;
  const alias = ALIASES[raw];
  if (alias && allowed.includes(alias)) return alias;
  // A song taken from a video file still plays: the container carries the sound either way.
  if (kind === "audio" && (raw === "video/mp4" || raw === "video/webm")) return raw.replace("video/", "audio/");
  const ext = name?.toLowerCase().match(/\.([a-z0-9]{2,5})$/)?.[1];
  return (ext && BY_EXTENSION[kind][ext]) || null;
}
