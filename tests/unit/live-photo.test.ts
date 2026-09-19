import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { tagJpeg, tagMov } from "../../scripts/lib/live-photo.mjs";

/**
 * The Live Photo writer is byte-level work with no tool on this machine to check it against, and a
 * single wrong offset turns a Live Photo back into a photo and a video. These pin down the shape
 * iOS pairs on — the rules the research turned up — so an edit that breaks one fails here first.
 */

const UUID = "CCE3490E-F0CC-48E1-BDCE-EA9782BF3561";

const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};
const atom = (type: string, ...parts: Buffer[]) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([u32(8 + body.length), Buffer.from(type, "latin1"), body]);
};
type Atom = { type: string; at: number; size: number };
function children(buf: Buffer, from: number, to: number): Atom[] {
  const out: Atom[] = [];
  for (let at = from; at + 8 <= to; ) {
    const size = buf.readUInt32BE(at);
    out.push({ type: buf.toString("latin1", at + 4, at + 8), at, size });
    at += size;
  }
  return out;
}
const child = (buf: Buffer, parent: Atom, type: string, skip = 8) => {
  const found = children(buf, parent.at + skip, parent.at + parent.size).find((a) => a.type === type);
  if (!found) throw new Error(`no ${type} in ${parent.type}`);
  return found;
};

/** The smallest movie ffmpeg could have written: one video track, moov after mdat, and a udta. */
function tinyMov() {
  const mvhd = atom("mvhd", u32(0), u32(0), u32(0), u32(1000), u32(3000), u32(0x10000), Buffer.alloc(2 + 10 + 36 + 24), u32(2));
  const video = atom(
    "trak",
    atom("tkhd", u32(0x0000000f), u32(0), u32(0), u32(1), Buffer.alloc(64)),
    atom("mdia", atom("mdhd", Buffer.alloc(24)), atom("hdlr", u32(0), Buffer.from("mhlrvide", "latin1"), Buffer.alloc(13))),
  );
  return Buffer.concat([
    atom("ftyp", Buffer.from("qt  ", "latin1"), u32(0x200), Buffer.from("qt  ", "latin1")),
    atom("mdat", Buffer.alloc(100, 0xab)),
    atom("moov", mvhd, video, atom("udta", atom("©too", Buffer.from("Lavf")))),
  ]);
}

describe("the movie half of a Live Photo", () => {
  const out = tagMov(tinyMov(), UUID, 1.5);
  const top = children(out, 0, out.length);
  const mdat = top.find((a) => a.type === "mdat")!;
  const moov = top.find((a) => a.type === "moov")!;
  const kids = children(out, moov.at + 8, moov.at + moov.size);

  it("keeps the video untouched and appends the still-image-time sample to its data", () => {
    expect(top.map((a) => a.type)).toEqual(["ftyp", "mdat", "moov"]);
    expect(mdat.size).toBe(8 + 100 + 9);
    expect(out.subarray(mdat.at + 8, mdat.at + 108).every((b) => b === 0xab)).toBe(true);
    // 9 bytes: an atom of local key 1 holding one int8, -1 — Apple's own value.
    expect([...out.subarray(mdat.at + 108, mdat.at + 117)]).toEqual([0, 0, 0, 9, 0, 0, 0, 1, 0xff]);
  });

  it("puts the identifier in moov/meta, not in udta where ffmpeg would", () => {
    expect(kids.map((k) => k.type)).toEqual(["mvhd", "trak", "trak", "meta"]);
    const meta = kids[3];
    // No version/flags on this meta: its first child starts right after the header.
    expect(out.toString("latin1", meta.at + 12, meta.at + 16)).toBe("hdlr");
    const hdlr = child(out, meta, "hdlr");
    expect(out.toString("latin1", hdlr.at + 16, hdlr.at + 20)).toBe("mdta");
    const keys = child(out, meta, "keys");
    expect(out.toString("latin1", keys.at + 16, keys.at + keys.size)).toContain("mdtacom.apple.quicktime.content.identifier");
    const ilst = child(out, meta, "ilst");
    expect(out.toString("utf8", ilst.at, ilst.at + ilst.size)).toContain(UUID);
  });

  it("adds the still-image-time track the way the camera does", () => {
    const mvhd = kids[0];
    expect(out.readUInt32BE(mvhd.at + 104)).toBe(3); // the next track id moved on
    const trak = kids[2];
    const tkhd = child(out, trak, "tkhd");
    expect(out.readUInt32BE(tkhd.at + 20)).toBe(2);
    // It describes the video track, by the video's own id.
    const cdsc = child(out, child(out, trak, "tref"), "cdsc");
    expect(out.readUInt32BE(cdsc.at + 8)).toBe(1);
    // An empty edit puts the sample at the still: 1.5 s in the movie's 1000 timescale.
    const elst = child(out, child(out, trak, "edts"), "elst");
    expect(out.readUInt32BE(elst.at + 16)).toBe(1500);
    expect(out.readInt32BE(elst.at + 20)).toBe(-1);
    // The sample entry is mebx, with the key and its type: 65, a signed byte.
    const stbl = child(out, child(out, child(out, trak, "mdia"), "minf"), "stbl");
    const stsd = child(out, stbl, "stsd");
    const text = out.toString("latin1", stsd.at, stsd.at + stsd.size);
    expect(text).toContain("mebx");
    expect(text).toContain("keydmdtacom.apple.quicktime.still-image-time");
    const dtyp = text.indexOf("dtyp");
    expect(out.readUInt32BE(stsd.at + dtyp + 8)).toBe(65);
    // The chunk offset points at the 9 bytes appended to mdat.
    const stco = child(out, stbl, "stco");
    expect(out.readUInt32BE(stco.at + 16)).toBe(mdat.at + 108);
  });

  it("dates the movie at the same moment as the photo, not in 1904", () => {
    const when = new Date("2026-09-19T12:00:00Z");
    const dated = tagMov(tinyMov(), UUID, 1, { when });
    const mvhdAt = dated.indexOf(Buffer.from("mvhd", "latin1")) - 4;
    expect(dated.readUInt32BE(mvhdAt + 12)).toBe(Math.floor(when.getTime() / 1000) + 2082844800);
  });

  it("refuses a movie whose moov comes first, since appending would move the video's offsets", () => {
    const mov = tinyMov();
    const [ftyp, mdat, moov] = children(mov, 0, mov.length);
    const faststart = Buffer.concat([mov.subarray(ftyp.at, ftyp.at + ftyp.size), mov.subarray(moov.at, moov.at + moov.size), mov.subarray(mdat.at, mdat.at + mdat.size)]);
    expect(() => tagMov(faststart, UUID, 1)).toThrow(/faststart/);
  });
});

describe("the photo half of a Live Photo", () => {
  it("carries the same identifier in Apple's MakerNote, in the Exif IFD, and still decodes", async () => {
    const plain = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#123456" } }).jpeg().toBuffer();
    const tagged = tagJpeg(plain, UUID);
    const at = tagged.indexOf(Buffer.from("Apple iOS\0", "latin1"));
    expect(at).toBeGreaterThan(0);
    const note = tagged.subarray(at, at + 70);
    expect([...note.subarray(10, 14)]).toEqual([0, 1, 0x4d, 0x4d]);
    // One entry: tag 0x0011 ContentIdentifier, ASCII, 37 bytes, at offset 32 of the MakerNote.
    expect(note.readUInt16BE(14)).toBe(1);
    expect(note.readUInt16BE(16)).toBe(0x0011);
    expect(note.readUInt16BE(18)).toBe(2);
    expect(note.readUInt32BE(20)).toBe(37);
    expect(note.readUInt32BE(24)).toBe(32);
    expect(note.toString("latin1", 32, 68)).toBe(UUID);
    // Exactly one EXIF segment, and the picture is unharmed.
    expect(tagged.indexOf(Buffer.from("Exif\0\0", "latin1"))).toBe(tagged.lastIndexOf(Buffer.from("Exif\0\0", "latin1")));
    const meta = await sharp(tagged).metadata();
    expect(meta.width).toBe(16);
    expect(meta.exif?.length).toBeGreaterThan(70);
  });

  it("says Make=Apple, as every photo known to pair does, unless told not to", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    expect(tagJpeg(jpeg, UUID).includes(Buffer.from("Apple\0", "latin1"))).toBe(true);
    expect(tagJpeg(jpeg, UUID, { makeApple: false }).includes(Buffer.from("Apple\0", "latin1"))).toBe(false);
  });
});
