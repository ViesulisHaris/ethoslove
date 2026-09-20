# 148 · who is this

**Shape:** the slow burn — 10 slides, five bubbles each, no hook typed over slide 1, nothing repeated from one slide to the next. Slides 6 and 7 are *your* screenshots of the gift.
**Occasion:** one year · **Who posts:** Maya, the girlfriend (blue, all lowercase). Marco, her boyfriend, made it (grey; his phone capitalises for him).
**Template:** yours to choose. Nothing in the texts says what the gift looks like.
**Sound:** "Velvety Captor", low. Alt: "u + me = <3".
**Post:** 23:00 UK, the hour it is set in. Reply in character for the first hour.

## Why this one

The first bubble is a boyfriend texting his girlfriend of a year "Hey, is this Maya from the party?", and her reply ("marco. ive been ur girlfriend for a year") tells you who they are in two lines. It is the first text he ever sent her, a year ago today, and he is starting over. That is the hook: no overlay, just a line that makes no sense until the second bubble.

Then the slow burn does its work: she left him on read for six hours and replied "who is this"; Jamie said she was out of his league ("jamie was right" / "Jamie is still right"); he wrapped her Christmas present in a Tesco bag. The link arrives on slide 5.

What it adds to the shape:

- **A confession after the gift.** She typed her reply in four minutes and stared at it for six hours. He has believed the other version for a year. It is the beat people quote, and it makes *her* the one who was nervous, which is what his gift earns.
- **A loop, closed by both of them.** The last grey bubble is the first one again ("Is this Maya from the party?"), and her last line is the reply she sent a year ago: "yes. who is this". People swipe back to slide 1 to check, and reverse swipes count.
- **Two keyboards.** She types in lowercase; his phone capitalises. You can tell who is talking without looking at the colours.

## The gift (slides 6 and 7)

Make it in the editor with **Their name: Maya** and **Your name: Marco**, title "1 year of maya". In the letter, mention the first text and the six hours, because slide 8 says "u wrote about the 6 hours". Any template.

Two frames: the first screen after it opens, then the letter. Phone, portrait, full screen. Save them here as `gift-1.png` and `gift-2.png`, change the two `gift` slides in `script.json` to `{ "type": "photo", "src": "gift-1.png" }` / `gift-2.png`, and render again. Then put the template's name in the pinned comment.

## Caption

one year and he still doesn't know i typed it in 4 minutes 😭 tag ur person

No link, no domain: the link card on slide 5 already says tryethos.io.

## Pinned comment (in character, not a brand)

he made it on tryethos, the template is [TEMPLATE NAME]. code LOVE = 20% off. jamie has been informed he is still right

## Replies to have ready

- "6 hours. i had the reply typed out the whole time. i ate a whole dinner looking at it"
- "tryethos. he wrote the letter himself, which is how i know, because he spelt 'definitely' wrong"
- "the tesco bag was a bag for life. he has pointed this out many times"

## Files

`node scripts/tiktok-slides.mjs docs/marketing/tiktok-148/script.json docs/marketing/tiktok-148 --sheet`
