# 136 · 9 seconds

**Template:** The Letter, with a video (115 sales in 30 days; the video is one of the paid extras) · **Occasion:** long distance, the first i love you · **Who posts:** her; he is abroad and grey
**Shape:** 7 slides — thread with the hook, thread with the link, your screenshot, thread, your screenshot, thread, the Notes slide
**Sound:** "Velvety Captor". Alt: "nowhere, nobody".
**Post:** 22:00 UK, weeknight. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> the letter ends with a 9 second video. i've watched it 31 times

A/B a week later, same slides: *he said it in a 9 second video before he said it in person*

## Why this one

Two numbers in the hook (9 seconds, 31 times), the biggest free milestone this audience has (the first i love you) and the highest-intent buyer there is (long distance, counting days). The video extra is shown, not described: "its u on the balcony. saying it". "41 days" is the last line and the comment people leave with their own number.

## Your two screenshots (slides 3 and 5)

1. `/create/the-letter`: recipient Mia, the hand face, a song, and a 9-second video at the end. Play it, tap the seal, screenshot mid-read with the song bar showing.
2. Scroll to the end: the 'a clip for you' card with the video. Screenshot it with a frame of him on the balcony showing.

Phone, portrait, full screen, no browser bar if you can (add it to the home screen, or crop). Drop them in this folder as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }`, and render again.

## Caption

9 seconds. 31 times. 41 days 😭 tag someone counting down

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (the maker, not a brand)

The Letter on tryethos with a video at the end. code LOVE = 20% off. 41 days

## Replies to have ready

- "42 days when he sent it. 41 now. he's in lisbon for work"
- "The Letter on tryethos. the video goes at the end, after the photos"
- "31 times before 7am. i was late for work"

## Files

`script.json` is the whole thing; `node scripts/tiktok-slides.mjs docs/marketing/tiktok-136/script.json docs/marketing/tiktok-136 --sheet` renders it, with the two screenshot slots shown as labelled gaps on the sheet until your pictures are in.
