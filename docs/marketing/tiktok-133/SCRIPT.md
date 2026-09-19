# 133 · flowers die in 3 days

**Template:** Bouquet (52 sales in 30 days, #3) · **Occasion:** one year · **Who posts:** him; Mia is grey
**Shape:** 7 slides — thread with the hook, thread with the link, your screenshot, thread, your screenshot, thread, the Notes slide
**Sound:** "Velvety Captor". Alt: "kinda chic".
**Post:** 20:00 UK, Saturday. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> she said flowers die in 3 days. so i made ones that don't

A/B a week later, same slides: *she told me not to buy flowers. i said ok. (i wrote it down)*

## Why this one

A contradiction the product resolves (flowers that don't die), told from his side so the male buyer sees himself doing it on the bus for nothing. The callback is the list: "i said peonies ONCE. in march" / "i wrote it down" — specific, free, and exactly what gets quoted. "my sister asked if u have a brother" is the someone-else-wants-one beat.

## Your two screenshots (slides 3 and 5)

1. `/create/bouquet`: recipient Mia, pick the stems yourself and put blush peonies in. Play it, let the first flower bloom and the bouquet assemble. Screenshot the whole bouquet with the 'open the card' pill.
2. Open the card. The letter's first line is 'you said flowers die in 3 days'. Screenshot it open.

Phone, portrait, full screen, no browser bar if you can (add it to the home screen, or crop). Drop them in this folder as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }`, and render again.

## Caption

she said flowers die in 3 days 🌷 tag someone who says 'dont get me anything'

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (the maker, not a brand)

Bouquet on tryethos, you pick the flowers. code LOVE = 20% off. no i dont have a brother

## Replies to have ready

- "the list is real. it has 'peonies (march)' and 'hates the word moist' on it"
- "Bouquet on tryethos. you pick every stem, she watches them open"
- "1 year today. she still hasn't seen the list"

## Files

`script.json` is the whole thing; `node scripts/tiktok-slides.mjs docs/marketing/tiktok-133/script.json docs/marketing/tiktok-133 --sheet` renders it, with the two screenshot slots shown as labelled gaps on the sheet until your pictures are in.
