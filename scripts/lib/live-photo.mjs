/**
 * Turns a clip and one of its frames into an iOS Live Photo: a JPEG and a MOV carrying the same
 * content identifier, packed as a `.pvt` folder (the JPEG, the MOV and a metadata.plist) — the
 * package AirDrop sends a Live Photo as.
 *
 * iOS pairs the two when they are imported into Photos, by one UUID written in two places:
 *
 *  - in the JPEG, Apple's MakerNote tag 0x0011 (ContentIdentifier) — EXIF tag 0x927C in the Exif
 *    IFD, a 70-byte block whose offsets count from its own start, so it can sit anywhere;
 *  - in the MOV, the movie-level key `com.apple.quicktime.content.identifier` in `moov/meta`.
 *
 * The MOV also gets the timed metadata track Apple's camera writes: a `mebx` sample carrying
 * `com.apple.quicktime.still-image-time` (-1), placed by an empty edit at the moment the still was
 * taken, with a `cdsc` reference to the video. iPhones are stricter than Mac Photos about it, so it
 * is there even though Mac Photos pairs without it.
 *
 * Nothing here can be done by the tools on a Windows machine: ExifTool cannot create a MakerNote
 * from nothing, and ffmpeg can neither write a `mebx` track nor put the key in `moov/meta` (it
 * writes `moov/udta/meta`). So both files are written byte by byte, and the video itself is left
 * untouched — the `mdat` payload and the video `trak` are copied across as they are.
 *
 * The input MOV must come straight from ffmpeg without `+faststart`: `moov` after `mdat`, so a
 * sample can be appended to `mdat` without moving any of the video's chunk offsets.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ── Atoms ─────────────────────────────────────────────────────────────────────────────────────────
const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};
const i32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n);
  return b;
};
const u16 = (n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
};
/** An atom: its size, its four-letter type, and what is in it. */
const atom = (type, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([u32(8 + body.length), Buffer.from(type, "latin1"), body]);
};
/** The atoms laid out between `from` and `to`, with 64-bit sizes and to-the-end sizes handled. */
function children(buf, from, to) {
  const out = [];
  let at = from;
  while (at + 8 <= to) {
    let size = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(at + 8));
      header = 16;
    } else if (size === 0) size = to - at;
    if (size < header || at + size > to) throw new Error(`a broken ${type} atom at ${at}`);
    out.push({ type, at, size, header });
    at += size;
  }
  return out;
}
const find = (list, type) => list.find((a) => a.type === type);

// ── The still ─────────────────────────────────────────────────────────────────────────────────────
/**
 * The JPEG with an EXIF segment holding the MakerNote, built by hand in big-endian TIFF: Pillow
 * writes the MakerNote with the wrong type, and nothing else here can write one at all.
 */
export function tagJpeg(jpeg, uuid, { when = new Date(), makeApple = true } = {}) {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("not a JPEG");
  const makerNote = Buffer.concat([
    Buffer.from("Apple iOS\0", "latin1"),
    u16(1),
    Buffer.from("MM", "latin1"),
    u16(1), // one entry
    u16(0x0011), u16(2), u32(37), u32(32), // ContentIdentifier, ASCII, 36 characters and a NUL, at 32
    u32(0), // no next IFD
    Buffer.from(`${uuid}\0\0`, "latin1"), // the UUID, its NUL, and a byte to keep the block even
  ]);
  if (makerNote.length !== 70) throw new Error("the MakerNote came out the wrong size");

  // DateTimeOriginal: now, so the photo lands at the top of Recents rather than in 1970.
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = Buffer.from(`${when.getFullYear()}:${pad(when.getMonth() + 1)}:${pad(when.getDate())} ${pad(when.getHours())}:${pad(when.getMinutes())}:${pad(when.getSeconds())}\0`, "latin1");
  const make = Buffer.from("Apple\0", "latin1");

  // IFD0 → Exif IFD → the values, in that order after the 8-byte TIFF header.
  const ifd0Entries = makeApple ? 3 : 2;
  const exifAt = 8 + 2 + ifd0Entries * 12 + 4;
  const exifEntries = 4;
  let dataAt = exifAt + 2 + exifEntries * 12 + 4;
  const makeAt = dataAt;
  if (makeApple) dataAt += make.length;
  const stampAt = dataAt;
  dataAt += stamp.length;
  if (dataAt % 2) dataAt += 1; // the MakerNote starts on an even offset
  const noteAt = dataAt;

  const entry = (tag, type, count, value) => Buffer.concat([u16(tag), u16(type), u32(count), value]);
  const short = (n) => Buffer.concat([u16(n), u16(0)]);
  const ifd0 = [
    ...(makeApple ? [entry(0x010f, 2, make.length, make.length <= 4 ? make : u32(makeAt))] : []),
    entry(0x0112, 3, 1, short(1)), // Orientation: as drawn
    entry(0x8769, 4, 1, u32(exifAt)), // where the Exif IFD is
  ];
  const exif = [
    entry(0x9000, 7, 4, Buffer.from("0232", "latin1")), // ExifVersion
    entry(0x9003, 2, stamp.length, u32(stampAt)), // DateTimeOriginal
    entry(0x927c, 7, makerNote.length, u32(noteAt)), // MakerNote, UNDEFINED
    entry(0xa001, 3, 1, short(1)), // ColorSpace: sRGB
  ];
  const tiff = Buffer.concat([
    Buffer.from("MM\0*", "latin1"),
    u32(8),
    u16(ifd0.length), ...ifd0, u32(0),
    u16(exif.length), ...exif, u32(0),
    ...(makeApple ? [make] : []),
    stamp,
    Buffer.alloc(noteAt - stampAt - stamp.length),
    makerNote,
  ]);
  if (tiff.length !== noteAt + makerNote.length) throw new Error("the EXIF block came out the wrong size");
  const app1Body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), u16(2 + app1Body.length), app1Body]);

  // Drop the JFIF APP0 an encoder writes, and any APP1 already there, so there is exactly one EXIF.
  let at = 2;
  while (jpeg[at] === 0xff && (jpeg[at + 1] === 0xe0 || jpeg[at + 1] === 0xe1)) at += 2 + jpeg.readUInt16BE(at + 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, jpeg.subarray(at)]);
}

// ── The movie ─────────────────────────────────────────────────────────────────────────────────────
const MEBX_TIMESCALE = 600;
const MEBX_SAMPLE_TICKS = 1; // the iPhone's: one tick at 600
const STILL_KEY = "com.apple.quicktime.still-image-time";
const ID_KEY = "com.apple.quicktime.content.identifier";

/** Seconds since 1904, QuickTime's epoch. */
const qtTime = (when) => Math.floor(when.getTime() / 1000) + 2082844800;

/**
 * The video track as ffmpeg wrote it, brought closer to the iPhone's wherever that changes no sizes
 * (so nothing else moves): enabled-everywhere flags, Apple as the handlers' manufacturer, an `alis`
 * self-reference where ffmpeg writes `url `, and real creation times. The names stay ffmpeg's —
 * renaming would resize the atoms, and nothing says Photos reads them.
 */
function appleVideoTrak(mov, trak, created) {
  const t = Buffer.from(mov.subarray(trak.at, trak.at + trak.size));
  const kids = (a) => children(t, a.at + 8, a.at + a.size);
  const self = { at: 0, size: t.length };
  const tkhd = find(kids(self), "tkhd");
  if (tkhd && t[tkhd.at + 8] === 0) {
    t[tkhd.at + 11] = 0x0f;
    t.writeUInt32BE(created, tkhd.at + 12);
    t.writeUInt32BE(created, tkhd.at + 16);
  }
  const mdia = find(kids(self), "mdia");
  if (!mdia) return t;
  const mdhd = find(kids(mdia), "mdhd");
  if (mdhd && t[mdhd.at + 8] === 0) {
    t.writeUInt32BE(created, mdhd.at + 12);
    t.writeUInt32BE(created, mdhd.at + 16);
  }
  const hdlr = find(kids(mdia), "hdlr");
  if (hdlr) t.write("appl", hdlr.at + 20, "latin1");
  const minf = find(kids(mdia), "minf");
  if (!minf) return t;
  const dhlr = find(kids(minf), "hdlr");
  if (dhlr && t.toString("latin1", dhlr.at + 12, dhlr.at + 20) === "dhlrurl ") {
    t.write("alis", dhlr.at + 16, "latin1");
    t.write("appl", dhlr.at + 20, "latin1");
  }
  const dinf = find(kids(minf), "dinf");
  const dref = dinf && find(kids(dinf), "dref");
  if (dref && t.toString("latin1", dref.at + 20, dref.at + 24) === "url ") t.write("alis", dref.at + 20, "latin1");
  return t;
}

/** The MOV, with the content identifier in `moov/meta` and the still-image-time track added. */
export function tagMov(mov, uuid, stillTime, { when = new Date() } = {}) {
  const created = qtTime(when);
  const top = children(mov, 0, mov.length);
  const mdat = find(top, "mdat");
  const moov = find(top, "moov");
  if (!mdat || !moov) throw new Error("a MOV needs mdat and moov");
  if (moov.at < mdat.at) throw new Error("moov comes first — encode without +faststart");
  if (mdat.at + mdat.size !== moov.at) throw new Error("something sits between mdat and moov");

  const kids = children(mov, moov.at + 8, moov.at + moov.size);
  const mvhdAtom = find(kids, "mvhd");
  const mvhd = Buffer.from(mov.subarray(mvhdAtom.at, mvhdAtom.at + mvhdAtom.size));
  const v1 = mvhd[8] === 1;
  const timescale = mvhd.readUInt32BE(v1 ? 28 : 20);
  const nextAt = v1 ? 116 : 104;
  const trackId = mvhd.readUInt32BE(nextAt);
  mvhd.writeUInt32BE(trackId + 1, nextAt);
  if (!v1) {
    mvhd.writeUInt32BE(created, 12);
    mvhd.writeUInt32BE(created, 16);
  }

  // The video track this describes: its id comes from its own tkhd, not from an assumption.
  const handlerOf = (trak) => {
    const mdia = find(children(mov, trak.at + 8, trak.at + trak.size), "mdia");
    const hdlr = mdia && find(children(mov, mdia.at + 8, mdia.at + mdia.size), "hdlr");
    return hdlr ? mov.toString("latin1", hdlr.at + 16, hdlr.at + 20) : "";
  };
  const videoTrak = kids.find((k) => k.type === "trak" && handlerOf(k) === "vide");
  if (!videoTrak) throw new Error("no video track");
  const tkhd = find(children(mov, videoTrak.at + 8, videoTrak.at + videoTrak.size), "tkhd");
  const videoId = mov.readUInt32BE(tkhd.at + (mov[tkhd.at + 8] === 1 ? 28 : 20));

  const e1 = Math.round(stillTime * timescale);
  const e2 = Math.ceil((MEBX_SAMPLE_TICKS / MEBX_TIMESCALE) * timescale);
  const identity = [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000].map(u32);
  // The sample goes straight after the video's data: 9 bytes, one int8 of -1 under local key 1.
  const sample = Buffer.concat([u32(9), u32(1), Buffer.from([0xff])]);
  const sampleAt = mdat.at + mdat.size;

  const keyAtom = atom("\0\0\0", atom("keyd", Buffer.from("mdta", "latin1"), Buffer.from(STILL_KEY, "latin1")), atom("dtyp", u32(0), u32(65)));
  const trak = atom(
    "trak",
    atom("tkhd", u32(0x0000000f), u32(created), u32(created), u32(trackId), u32(0), u32(e1 + e2), Buffer.alloc(8), Buffer.alloc(8), ...identity, u32(0), u32(0)),
    atom("tref", atom("cdsc", u32(videoId))),
    atom("edts", atom("elst", u32(0), u32(2), u32(e1), i32(-1), u32(0x10000), u32(e2), i32(0), u32(0x10000))),
    atom(
      "mdia",
      atom("mdhd", u32(0), u32(created), u32(created), u32(MEBX_TIMESCALE), u32(MEBX_SAMPLE_TICKS), u16(0x55c4), u16(0)),
      atom("hdlr", u32(0), Buffer.from("mhlrmetaappl", "latin1"), u32(1), u32(0), Buffer.from([19]), Buffer.from("Core Media Metadata", "latin1")),
      atom(
        "minf",
        atom("gmhd", atom("gmin", u32(0), u16(0x40), u16(0x8000), u16(0x8000), u16(0x8000), u16(0), u16(0))),
        atom("hdlr", u32(0), Buffer.from("dhlralisappl", "latin1"), u32(0), u32(0), Buffer.from([23]), Buffer.from("Core Media Data Handler", "latin1")),
        atom("dinf", atom("dref", u32(0), u32(1), atom("alis", u32(1)))),
        atom(
          "stbl",
          // The key table in a sample entry is a plain atom: no version, no count.
          atom("stsd", u32(0), u32(1), atom("mebx", Buffer.alloc(6), u16(1), atom("keys", keyAtom))),
          atom("stts", u32(0), u32(1), u32(1), u32(MEBX_SAMPLE_TICKS)),
          atom("stsc", u32(0), u32(1), u32(1), u32(1), u32(1)),
          atom("stsz", u32(0), u32(sample.length), u32(1)),
          atom("stco", u32(0), u32(1), u32(sampleAt)),
        ),
      ),
    ),
  );
  // Movie-level metadata as QuickTime writes it: `meta` with no version or flags of its own, and a
  // key table that does have them.
  const id = Buffer.from(uuid, "utf8");
  const meta = atom(
    "meta",
    atom("hdlr", u32(0), u32(0), Buffer.from("mdta", "latin1"), Buffer.alloc(12), Buffer.from([0, 0])),
    atom("keys", u32(0), u32(1), u32(8 + ID_KEY.length), Buffer.from("mdta", "latin1"), Buffer.from(ID_KEY, "latin1")),
    atom("ilst", atom("\0\0\0", atom("data", u32(1), u32(0), id))),
  );

  // The rest of moov as it was, minus ffmpeg's udta (its encoder tag), plus the two new atoms.
  const kept = kids.filter((k) => k.type !== "mvhd" && k.type !== "udta").map((k) => (k === videoTrak ? appleVideoTrak(mov, k, created) : mov.subarray(k.at, k.at + k.size)));
  const newMoov = atom("moov", mvhd, ...kept, trak, meta);

  const head = Buffer.from(mov.subarray(0, mdat.at + mdat.size));
  const ftyp = find(top, "ftyp");
  if (ftyp && ftyp.size >= 16) head.writeUInt32BE(0, ftyp.at + 12); // minor version 0, as the iPhone writes it
  if (mdat.header === 16) head.writeBigUInt64BE(BigInt(mdat.size + sample.length), mdat.at + 8);
  else head.writeUInt32BE(mdat.size + sample.length, mdat.at);
  return Buffer.concat([head, sample, newMoov]);
}

// ── The package ───────────────────────────────────────────────────────────────────────────────────
const PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PFVideoComplementMetadataVersionKey</key>
	<string>1</string>
</dict>
</plist>
`;

/**
 * Writes `<dir>/<name>.pvt/` holding `<name>.JPG`, `<name>.MOV` and `metadata.plist`, with a fresh
 * UUID every time (Photos skips a re-import it takes for a duplicate). Returns the UUID.
 */
export function writeLivePhoto({ dir, name, mov, still, stillTime, makeApple = true, when = new Date() }) {
  const uuid = randomUUID().toUpperCase();
  const pvt = join(dir, `${name}.pvt`);
  mkdirSync(pvt, { recursive: true });
  // One moment for both: the photo's DateTimeOriginal and every creation time in the movie.
  writeFileSync(join(pvt, `${name}.JPG`), tagJpeg(still, uuid, { makeApple, when }));
  writeFileSync(join(pvt, `${name}.MOV`), tagMov(typeof mov === "string" ? readFileSync(mov) : mov, uuid, stillTime, { when }));
  writeFileSync(join(pvt, "metadata.plist"), PLIST);
  return { uuid, pvt };
}
