# 513 · deleted it 4 times

**For:** Account 1 (one image, posted as a video).
**Blueprint:** @unicornsprinklewaffles, 4.7M / 3.6M (Sept): one zoomed-in screenshot of his grey bubbles, plainly in love, with the typing dots still going.
**The formula:** "i tried writing you a paragraph" / "deleted it like 4 times" / "im not good at saying stuff" / "so i made this instead", the link, and the typing dots.
**Format:** 1 image (`video.mp4`, 10 seconds). Light mode, cropped to the bubbles so they fill the screen like the originals. After rendering, the slide is cropped to its left 880 px (see Files).
**Names:** Maya and Leo only. The chat never says what's inside the gift.

Post `video.mp4`, not the picture: every one of the 1M+ one-image posts is a 9 to 15 second video, so it loops while people read. Add a quiet trending sound in TikTok (see VIRAL-FORMULA, "510 to 519").

## Will it go viral?

High for shares. That account's posts are each one sincere line and get 26K to 226K shares, because girls send them to their boyfriends. Here the line is something every guy who's bad with words recognises.

## Caption (written as a search)

paragraphs for her? he deleted his 4 times 🥹

#targetaudience #relationships #textmessage #cutetexts

**Why this wording:** "paragraphs for her" is a TikTok search suggestion (checked 14 Oct), and guys search it before writing one.

Never the website in the caption, and no 💅.

## Pinned comment (in character, never a brand)

the typing bubble went on for 10 more minutes

If someone asks what the link is, reply "tryethos" and pin that reply.

## Files

`node scripts/tiktok-slides.mjs docs/marketing/tiktok-513/script.json docs/marketing/tiktok-513`
then crop it to the bubbles: `python3 -c "from PIL import Image; p='docs/marketing/tiktok-513/slide-01.png'; im=Image.open(p); im.crop((0,0,880,im.size[1])).save(p)"`
`xcrun swift scripts/tiktok-still-video.swift docs/marketing/tiktok-513/slide-01.png docs/marketing/tiktok-513/video.mp4`
