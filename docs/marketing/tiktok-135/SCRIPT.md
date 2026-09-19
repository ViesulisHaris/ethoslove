# 135 · the dishwasher

**Template:** Bloom (7 sales in 30 days; the apology template, and 'rate his apology' is the comment format that runs longest) · **Occasion:** an apology · **Who posts:** her; he is grey
**Shape:** 7 slides — thread with the hook, thread with the link, your screenshot, thread, your screenshot, thread, the Notes slide
**Sound:** "Makes No Difference". Alt: "kinda chic".
**Post:** 20:00 UK, Wednesday. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> we didn't speak for 3 days over a dishwasher

A/B a week later, same slides: *he apologised with a flower i had to hold for 5 seconds. rate it.*

## Why this one

A fight about nothing (the dishwasher) is the most relatable fight there is, and the three-day gap in the timestamps does the dread for free. The product is the metaphor: you have to hold it, let go and it stops, "so u couldnt skim it". The caption asks for a score, which is the comment format that runs longest.

## Your two screenshots (slides 3 and 5)

1. `/create/bloom`: recipient Mia, the apology as the message, first line 'im sorry i said the dishwasher was ur job'. Play it and hold the bud until it's half open. Screenshot with 'keep holding…' showing.
2. Hold it all the way. Screenshot the open flower with the apology on screen.

Phone, portrait, full screen, no browser bar if you can (add it to the home screen, or crop). Drop them in this folder as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }`, and render again.

## Caption

3 days over a dishwasher 💀 rate his apology 1-10

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (the maker, not a brand)

Bloom on tryethos. you have to hold it to open it. code LOVE = 20% off. the dishwasher remains his

## Replies to have ready

- "the other thing was about my mum's lasagne. we don't talk about the other thing"
- "Bloom on tryethos. it only opens while you're holding it. let go and it stops"
- "7. it was a 7. the dishwasher is still his"

## Files

`script.json` is the whole thing; `node scripts/tiktok-slides.mjs docs/marketing/tiktok-135/script.json docs/marketing/tiktok-135 --sheet` renders it, with the two screenshot slots shown as labelled gaps on the sheet until your pictures are in.
