# 131 · it's a tuesday

**Template:** The Letter, with a song (115 sales in 30 days, all for the paid extras (a song, a video, a voice note; the watermark comes off with them)) · **Occasion:** just because · **Who posts:** her; he is grey and dry
**Shape:** 7 slides — thread with the hook, thread with the link, your screenshot, thread, your screenshot, thread, the Notes slide
**Sound:** "Velvety Captor". Alt: "Makes No Difference".
**Post:** 21:00 UK, Tuesday, obviously. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> it's not my birthday. it's not our anniversary. it's a tuesday.

A/B a week later, same slides: *he said check ur phone in 5 min. it was a tuesday.*

## Why this one

No occasion is the hook: the curiosity gap is *why today*, and the answer ("u had a bad week. and its tuesday") is the line that gets sent to boyfriends. This is the hint format: she posts, so every girl watching forwards it, and the boyfriend who opens it finds a free template with a song he can add for the price of a coffee. The paid extra is in the story ("u put the car song on it"), never explained.

## Your two screenshots (slides 3 and 5)

1. Open `/create/the-letter` on your phone. Recipient Mia, sender his name, the hand face for the message, a library song or your own. Screenshot the shut envelope on the cover: her name, the seal, 'tap the seal'.
2. Press play in the preview, tap the seal, let the song start. Write a paragraph that mentions the tesco car park and screenshot mid-read with the song bar showing.

Phone, portrait, full screen, no browser bar if you can (add it to the home screen, or crop). Drop them in this folder as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }`, and render again.

## Caption

it was a tuesday 😭 sending this as a hint

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (the maker, not a brand)

it's The Letter on tryethos. he did the version with our song. code LOVE = 20% off. it was a tuesday

## Replies to have ready

- "the car song is the one he pretends to hate. he knows every word"
- "The Letter on tryethos. it's free to write, he paid to put the song on it"
- "nothing happened. it was a tuesday. that's the point"

## Files

`script.json` is the whole thing; `node scripts/tiktok-slides.mjs docs/marketing/tiktok-131/script.json docs/marketing/tiktok-131 --sheet` renders it, with the two screenshot slots shown as labelled gaps on the sheet until your pictures are in.
