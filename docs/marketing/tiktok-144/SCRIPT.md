# 144 · 23 days

**Occasion:** anniversary (2 years, with a break in the middle) · **Who posts:** her (she's blue); he is grey and dry
**Template:** yours to choose. Nothing in the texts says what the gift looks like, so any template fits.
**Shape:** 7 slides — thread with the hook, thread with the link, *your screenshot*, thread, *your screenshot*, thread, the Notes slide. The chat slides also work on their own.
**Sound:** "Makes No Difference". Alt: "nowhere, nobody" (Ariana Grande), cut to the chorus.
**Post:** 22:00 UK. Reply in character for the first hour, and take a side in the argument.

## Hook (slide 1, typed over the image)

> we broke up for 23 days last year. he still says today is our 2 years

A/B a week later, same slides: *i told him it's technically not our 2 years. he sent me this.*

## Why this one

It gives the comments something to fight about: **does the break count?** Everyone has an opinion, half the audience has lived it, and an argument in the comments is the cheapest reach there is. Under the debate is the oldest lever in the doc, sadness turning to warmth: she is the one being cold and exact ("1 year 11 months and a week"), he is dry ("no"), and the gift is where the feeling lives: he put the worst month *in* it, on purpose, because "its how i know". "tried. 23 days. hated it" is the line that gets quoted, and "its 2 years" / "its 2 years" closes the loop the hook opened. Nothing describes the gift, so slides 3 and 5 can be any template.

## Your screenshots (slides 3 and 5)

Two frames of whichever gift you pick: the first screen after it opens, then the letter. If you make your own for this one, have the letter mention March. Phone, portrait, full screen. Save them here as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }` / `gift-2.png`, and render again. Then put the template's name in the pinned comment.

## Caption

does the break count?? 😭 23 days in march

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (in character, not a brand)

it's from tryethos, the template is [TEMPLATE NAME]. code LOVE = 20% off. it's 2 years. i don't make the rules (he does)

## Replies to have ready

- "23 days. i counted too. i just wasn't going to admit it"
- "tryethos. he wrote about the worst month we ever had and somehow that was the best part"
- "the comments are 50/50 and he is reading them out to me like a court case"

## Files

`node scripts/tiktok-slides.mjs docs/marketing/tiktok-144/script.json docs/marketing/tiktok-144 --sheet` renders it; the two screenshot slots show as labelled gaps on the sheet until your pictures are in.
