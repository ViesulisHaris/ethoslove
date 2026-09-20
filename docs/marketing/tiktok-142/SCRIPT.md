# 142 · ugly shoes

**Occasion:** anniversary · **Who posts:** him (he's blue, he made it); she is grey and loud
**Template:** yours to choose. Nothing in the texts says what the gift looks like, so any template fits.
**Shape:** 7 slides — thread with the hook, thread with the link, *your screenshot*, thread, *your screenshot*, thread, the Notes slide. The chat slides also work on their own if you'd rather post four.
**Sound:** "Makes No Difference". Alt: "u + me = <3".
**Post:** 22:00 UK. Reply in character for the first hour.

## Hook (slide 1, typed over the image)

> 3 years together and i never told her why i asked her out

A/B a week later, same slides: *she asked why i asked her out. i put the answer at the end of a letter.*

## Why this one

A curiosity gap the viewer shares with her: *why did he ask her out?* The answer arrives eight minutes later in her caps ("because i said ur shoes were ugly"), so the swipe is the reveal, and "u had me at ugly shoes" is the line that gets screenshotted. The gift is a move in the story, not the point of it, and the Notes slide turns the trick into an instruction: put the thing you've never told them at the very end.

## Your screenshots (slides 3 and 5)

Two frames of whichever gift you pick: the first screen after it opens, then the letter or the best moment. Phone, portrait, full screen. Save them here as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }` / `gift-2.png`, and render again. Then put the template's name in the pinned comment.

## Caption

u had me at ugly shoes 👟 tag someone who owes u the real story

No link, no domain. The domain lives in the last slide and the pinned comment.

## Pinned comment (in character, not a brand)

made it on tryethos, the template is [TEMPLATE NAME]. code LOVE = 20% off. the shoes are in a box under the bed

## Replies to have ready

- "they were brown suede. she was right. i kept them anyway"
- "tryethos. took me 20 minutes and 3 years of not telling her"
- "she has since insulted 4 more pairs. we're very happy"

## Files

`node scripts/tiktok-slides.mjs docs/marketing/tiktok-142/script.json docs/marketing/tiktok-142 --sheet` renders it; the two screenshot slots show as labelled gaps on the sheet until your pictures are in.
