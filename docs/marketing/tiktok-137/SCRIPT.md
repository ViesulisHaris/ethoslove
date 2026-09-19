# 137 · the lamp

**Template:** Sketchbook (shipped 2026-09-19, no sales history yet; the photos-and-captions template) · **Occasion:** leaving for uni · **Who posts:** the friend who stays; Ruby is grey
**Shape:** 7 slides — thread with the hook, thread with the link, your screenshot, thread, your screenshot, thread, the Notes slide
**Sound:** "nowhere, nobody" (Ariana Grande), this month's leaving-and-growing carousel sound — cut the slides to the chorus. Alt: "u + me = <3".
**Post:** 21:00 UK on a Saturday in September — move-in weekends are the 19th/20th and 26th/27th, and freshers' content is the whole feed. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> she leaves for uni in 9 hours. i put the last 4 years in a sketchbook

A/B a week later, same slides: *she's crying at a lamp i gave her in year 9. she leaves at 8.*

## Why this one

Timing, first: this week every 18-year-old in the country is packing a car, and their friends are the ones watching TikTok at 11pm feeling it. Then the shape's levers — a clock (9 hours), effort not money (one night, 4 years of photos), friendship rather than romance (the widest tag), and one specific object (the lamp from year 9) planted in bubble one and paid off in the last line. The product does its own selling in her words: "in ur handwriting??", "IT DRAWS ITSELF", "every page is a year". "why is there a cake" / "its a leaving cake" owns the template's one birthday-shaped page instead of hiding it, which is what makes it read as real.

## Your two screenshots (slides 3 and 5)

1. `/create/sketchbook`: recipient Ruby, leave the age empty, set the line over the cake to "see u at christmas", 8 to 12 photos captioned by year ("the lamp, year 9", "the bus stop, every day for 4 years"), the letter as the message. Play it, open the sketchbook, let the cake draw. Screenshot page 1 with your line over it.
2. Turn to the year-9 page. Screenshot the two taped photos with their captions and the doodles.

Phone, portrait, full screen, no browser bar if you can (add it to the home screen, or crop). Drop them in this folder as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }`, and render again.

## Caption

she leaves for uni in 9 hours ✏️ tag the friend who's leaving

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (the maker, not a brand)

Sketchbook on tryethos, the doodles draw themselves. code LOVE = 20% off. the lamp made it to halls

## Replies to have ready

- "the lamp is a £6 ikea one. it has moved house 3 times. it's in halls now"
- "Sketchbook on tryethos. you put in the photos and write the captions, it does the drawing"
- "she's 214 miles away. first weekend is booked. she has already lost the lamp's bulb"

## Files

`script.json` is the whole thing; `node scripts/tiktok-slides.mjs docs/marketing/tiktok-137/script.json docs/marketing/tiktok-137 --sheet` renders it, with the two screenshot slots shown as labelled gaps on the sheet until your pictures are in.
