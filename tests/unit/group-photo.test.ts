/**
 * A stranger's photo is never kept as it arrived: it is decoded and written out again as WebP, at
 * most 1600 px on its long edge, with nothing of the original file left in it. These run the real
 * encoder on real image bytes.
 */
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { GROUP_LIMITS } from "@/lib/group/limits";

vi.mock("server-only", () => ({}));
const { encodePhoto } = await import("@/lib/group/photo");

/** A JPEG as a phone writes one: sideways with an orientation flag, and where it was taken in its EXIF. */
async function phonePhoto(width = 2400, height = 1800) {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 90 } } })
    .jpeg({ quality: 80 })
    .withExif({ IFD0: { Make: "Phone Maker", Model: "Phone 15", Artist: "Mum Okonkwo" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 26/1", GPSLongitudeRef: "W", GPSLongitude: "0/1 7/1 39/1" } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("re-encoding a contributor's photo", () => {
  it("comes out as WebP, inside 1600 px, the right way up", async () => {
    const bytes = await phonePhoto();
    const out = await encodePhoto({ type: "image/jpeg", bytes });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const meta = await sharp(out.webp).metadata();
    expect(meta.format).toBe("webp");
    // Orientation 6 means "turn it a quarter": the wide photo comes out tall, and nothing says to turn it again.
    expect([out.width, out.height]).toEqual([1200, 1600]);
    expect([meta.width, meta.height]).toEqual([1200, 1600]);
    expect(meta.orientation).toBeUndefined();
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(GROUP_LIMITS.photoEdge);
    expect(out.webp.byteLength).toBeLessThanOrEqual(GROUP_LIMITS.photoBytes);
  });

  it("carries nothing over from the file that arrived: no EXIF, no place, no name", async () => {
    const bytes = await phonePhoto();
    // The original really does hold them.
    expect((await sharp(bytes).metadata()).exif).toBeDefined();
    expect(bytes.includes(Buffer.from("Mum Okonkwo"))).toBe(true);
    const out = await encodePhoto({ type: "image/jpeg", bytes });
    if (!out.ok) throw new Error("not encoded");
    const meta = await sharp(out.webp).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    for (const leak of ["Mum Okonkwo", "Phone Maker", "Phone 15", "GPS"]) expect(out.webp.includes(Buffer.from(leak))).toBe(false);
  });

  it("never makes a small photo bigger", async () => {
    const bytes = await sharp({ create: { width: 320, height: 200, channels: 3, background: "#789" } }).png().toBuffer();
    const out = await encodePhoto({ type: "image/png", bytes });
    expect(out).toMatchObject({ ok: true, width: 320, height: 200 });
  });

  it("refuses a file over 2 MB before looking inside it", async () => {
    expect(await encodePhoto({ type: "image/jpeg", bytes: Buffer.alloc(GROUP_LIMITS.photoBytes + 1) })).toEqual({ ok: false, error: "too_large" });
  });

  it("refuses a type it doesn't take, whatever the bytes are", async () => {
    const bytes = await phonePhoto(400, 300);
    for (const type of ["image/gif", "image/svg+xml", "image/heic", "application/pdf", "text/html", ""]) expect(await encodePhoto({ type, bytes })).toEqual({ ok: false, error: "bad_photo" });
  });

  it("refuses bytes that are not a picture, whatever they say they are", async () => {
    expect(await encodePhoto({ type: "image/jpeg", bytes: Buffer.from("<script>alert(1)</script>") })).toEqual({ ok: false, error: "bad_photo" });
    expect(await encodePhoto({ type: "image/png", bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') })).toEqual({ ok: false, error: "bad_photo" });
    expect(await encodePhoto({ type: "image/webp", bytes: Buffer.alloc(0) })).toEqual({ ok: false, error: "bad_photo" });
  });
});
