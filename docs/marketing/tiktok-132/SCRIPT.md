# 132 · no one was doing anything

**Template:** Birthday Cinema (98 sales in 30 days, the best-converting premium template) · **Occasion:** flatmate's 22nd · **Who posts:** the flatmate who made it; Jess is grey
**Shape:** 7 slides — thread with the hook, thread with the link, your screenshot, thread, your screenshot, thread, the Notes slide
**Sound:** "u + me = <3". Alt: "kinda chic".
**Post:** 23:00 UK, Thursday. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> my flatmate said no one was doing anything for her birthday. it was 11:52pm

A/B a week later, same slides: *"no ones doing anything. its fine" — 11:52pm the night before her birthday*

## Why this one

"no ones doing anything. its fine" is the saddest text a 21-year-old can receive, and everyone has received it. Dread, then eight minutes on a clock, then relief. Friendship rather than romance, which is the widest share, and the template does its own selling: the ticket, the candles, the film — in her words, in bed.

## Your two screenshots (slides 3 and 5)

1. `/create/birthday-cinema`: recipient Jess, age 22, four or five photos with captions (one of them 'the halloween one'). Play it, tap start, let the cake come in and light. Screenshot the lit cake under NOW SHOWING: JESS TURNS 22 with the 'Use microphone' pill.
2. Blow (or swipe up) until the film starts. Screenshot the strip with three photos and their captions, the halloween one first.

Phone, portrait, full screen, no browser bar if you can (add it to the home screen, or crop). Drop them in this folder as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }`, and render again.

## Caption

she said no one was doing anything 😭 tag ur flatmate

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (the maker, not a brand)

Birthday Cinema on tryethos. code LOVE = 20% off. her mum's is booked for november

## Replies to have ready

- "she's my flatmate. she's fine now. she cried in my doorway"
- "birthday cinema on tryethos, you upload the photos and it makes the film"
- "8 minutes because i'd already been through the camera roll at 11:40 panicking"

## Files

`script.json` is the whole thing; `node scripts/tiktok-slides.mjs docs/marketing/tiktok-132/script.json docs/marketing/tiktok-132 --sheet` renders it, with the two screenshot slots shown as labelled gaps on the sheet until your pictures are in.
