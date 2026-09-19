# Live Photos of a gift, from this PC to a TikTok carousel

`node scripts/tiktok-gift-live.mjs <carousel folder>` films the gift playing and writes one
**`live-<name>.pvt`** per clip. Each is already a Live Photo — nothing is converted on the phone:

- `live-<name>.JPG` — the clip's best moment, with Apple's MakerNote carrying a content identifier;
- `live-<name>.MOV` — the clip, carrying the same identifier and the still-image-time track the
  iPhone camera writes;
- `metadata.plist` — which makes the folder a Live Photo package (a `.pvt`), the form AirDrop sends
  Live Photos in.

## The one catch: getting them into the iPhone's Photos in one piece

iOS joins the photo and the video into one Live Photo **when they are imported into Apple Photos** —
not when they sit in a folder. Nothing on Windows does that import, and every Windows route that
looks like it should (iCloud for Windows, icloud.com, email, Google Drive, the Files app, WhatsApp or
Telegram desktop, the Claude app) hands the phone a separate photo and video.

**What works: a Mac, once per batch (Adrian's).**
1. Copy the `.pvt` folders to the Mac (zip them first: `tar -a -cf lives.zip live-*.pvt`).
2. On the Mac a `.pvt` shows as one item. Double-click it, or Photos → **File → Import** → the
   `.pvt`, and check the **LIVE** badge appears. (A throwaway library — hold ⌥ while opening Photos —
   keeps them out of his iCloud.)
3. Select them → **Share → AirDrop** → your iPhone. They land in Recents as Live Photos. (Worth one
   try as well: AirDrop the `.pvt` straight from Finder — that is how AirDrop sends Live Photos.)

**To test once, from Windows only** (if either works, the Mac is no longer needed):
- **PhotoSync** — Windows Companion on the PC, PhotoSync on the iPhone: send one `.pvt`'s JPG and
  MOV together and see whether it arrives with the LIVE badge.
- **The `.pvt` through Files** — put a zipped `.pvt` in iCloud Drive, unzip it in Files on the
  iPhone, open it, and see whether it offers to save a Live Photo.

In a carousel's `script.json`, point each gift slide at its still so the contact sheet shows it:
`{ "type": "gift", "still": "live-flight.pvt/live-flight.JPG" }`. The Live Photo itself is posted in
its place — no slide file is written for it.

## Posting

TikTok → **+** → **Upload** → pick the chat slides and the Live Photos in order, in **photo mode**.
For every Live Photo slide, tap the circles icon under the settings gear once so it reads **Loop** —
the default plays once and stops. Live Photos show a small "Live" label on the post.

## If something doesn't pair

In order of likelihood: the files went through a route that doesn't import them together; something
re-saved one of them (a messaging app, a cloud service's compression, an editor); or iOS has become
stricter than the day this was written. `tests/unit/live-photo.test.ts` pins the byte format, and the
research behind every rule is in `scripts/lib/live-photo.mjs`.
