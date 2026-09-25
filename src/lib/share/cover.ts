import "server-only";

import { parseImageInfo } from "@/lib/dates/photos";
import { shareCover } from "./links";

/**
 * The photograph a shared link's preview is drawn from, fetched by our server. Only ever from
 * Wikimedia's two image hosts (shareCover): the address arrives in a public query string, and a
 * server that fetched whatever it was handed could be pointed at anything, our own network included.
 */
const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";
/** A crawler waits a few seconds for a preview; past this the card is drawn without the photograph. */
export const COVER_TIMEOUT_MS = 5000;
/** Wikimedia's 1280-pixel thumbnails are well under this; anything bigger is not one of them. */
export const COVER_MAX_BYTES = 6 * 1024 * 1024;
const CREDIT_TIMEOUT_MS = 2500;
const IMAGE_TYPE = /^image\/(jpeg|png|webp|gif)$/;

type Fetch = typeof fetch;

/** The bytes of an allowed cover, or null: not allowed, not there, not an image, too big or too slow. */
export async function fetchCover(value: unknown, fetcher: Fetch = fetch): Promise<Buffer | null> {
  const url = shareCover(value);
  if (!url) return null;
  try {
    // No redirects: a redirect is the one way an allowed address could lead somewhere else.
    const res = await fetcher(url, { headers: { "user-agent": USER_AGENT, accept: "image/*" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(COVER_TIMEOUT_MS) });
    if (!res.ok || !res.body) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!IMAGE_TYPE.test(type) || Number(res.headers.get("content-length") ?? 0) > COVER_MAX_BYTES) {
      await res.body.cancel().catch(() => undefined);
      return null;
    }
    // Counted as it arrives: a length header can be missing, or wrong.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > COVER_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(chunk);
    }
    return size > 0 ? Buffer.concat(chunks) : null;
  } catch {
    return null;
  }
}

/**
 * Which wiki keeps a picture's page, and its file name, from the picture's own address:
 * ".../wikipedia/commons/thumb/a/ab/Foo.jpg/1280px-Foo.jpg" is File:Foo.jpg on Commons.
 */
export function fileOfCover(url: string): { api: string; file: string } | null {
  const m = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/(commons|en|es)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(url);
  if (!m) return null;
  let file: string;
  try {
    file = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  const host = m[1] === "commons" ? "commons.wikimedia.org" : `${m[1]}.wikipedia.org`;
  return { api: `https://${host}/w/api.php`, file };
}

/**
 * Who took the photograph and under what licence, for the line on the card: the licences ask for
 * it wherever the picture is shown, and a preview in somebody's chat is shown. Null when the wiki
 * didn't answer in time; the card then credits Wikimedia Commons alone.
 */
export async function coverCredit(value: unknown, fetcher: Fetch = fetch): Promise<{ credit?: string; licence?: string } | null> {
  const url = shareCover(value);
  const of = url ? fileOfCover(url) : null;
  if (!of) return null;
  try {
    const res = await fetcher(`${of.api}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist%7CLicenseShortName&titles=${encodeURIComponent(`File:${of.file}`)}`, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(CREDIT_TIMEOUT_MS),
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) return null;
    const info = parseImageInfo(await res.json()).get(of.file.replace(/_/g, " "));
    return info ? { credit: info.credit, licence: info.licence } : null;
  } catch {
    return null;
  }
}
