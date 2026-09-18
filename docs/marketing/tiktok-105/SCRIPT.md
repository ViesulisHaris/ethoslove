# TikTok carousel 105 · "he couldn't say it. so he made her this." (part 2 of 2 — what was in the link)

Post **21:00 UK**, 24 hours after 104, dark iMessage. Five slides: the hook and the opening, **three
Live Photos of the gift actually playing**, and the mess.

## Why this one

104 ends on a link nobody has opened and a boy who would not say one thing all week. This is the one
thing. It is in the gift, not the chat — he is still dry in the texts, and the feeling lives in what he
made, which is the gap that makes a gift land (the 411K rule).

- **The gift moves on the post.** Three Live Photos, so the swipe shows what a screenshot never can:
  the paper plane crossing the map as she blows, the kilometres falling, the note popping up half way,
  the path turning into a heart, the postcard turning over, the photos pinned under his letter. Nobody
  has to be told it is interactive — they watch it happen, and "what app is this" asks itself.
- **They are the real product, filmed.** `scripts/tiktok-gift-live.mjs` builds this exact gift in the
  editor, plays it and films it at 1080×1920. Nothing is mocked up, so the gift anyone makes from the
  pin looks like this one.
- **The reveal is a railcard, and a railcard is £30.** Small money as a sacrifice, never a flex: it is
  the 16-25 one everybody in the audience owns, and buying it is the least romantic sentence that
  could possibly mean "i am coming to see you". The hook of 104 promised it; this is where she finds
  out.
- **The gift is Halfway, which no carousel has shown yet.** 98 to 103 are all Scrapbook. Halfway is
  the one people cannot work out from a still — you **blow** the plane across — and now they do not
  have to.
- **The peak falls apart, as it should.** "U GOT A RAILCARD" / "ur so annoying" / "im crying on a
  train". Nobody lands a sentence at the moment they feel the most; "ur so annoying" is the "i love u"
  nobody that age says on cue.
- **It ends on a joke he makes to avoid the feeling:** "a man just gave me a tissue" / "tell him
  thanks". No callback, no bow on it.

## The order

| # | Post | On screen |
|---|---|---|
| 1 | `slide-01.png` | **hook: POV: he couldn't say it. / so he made her this.** · Today 09:02 "its moving" · "ur still standing at the barrier" · "open it" · "opening it" |
| 2 | **Live Photo from `live-flight.mp4`** | She blows; the plane crosses from London, the kilometres fall, and at the middle the note pops up: **"got a 16-25 railcard. its 4 hours 20. dont be weird about it"** |
| 3 | **Live Photo from `live-home.mp4`** | The rest of the way: 0, TOGETHER, the path becomes a heart, the postcard turns over |
| 4 | **Live Photo from `live-letter.mp4`** | His letter, then down to the three photos pinned under it |
| 5 | `slide-05.png` | Today 09:11 "U GOT A RAILCARD" · "it was like 30 quid" · "ur so annoying" · "im crying on a train" · "dont be weird about it" · "a man just gave me a tissue" · "tell him thanks" |

`slide-02.png` to `slide-04.png` are each clip's best frame — the note up, the heart, the photos — for
posting as stills if a Live Photo will not take. Slide 2 is the post.

## Making the Live Photos (on the iPhone you post from)

1. AirDrop `live-flight.mp4`, `live-home.mp4` and `live-letter.mp4` to the phone.
2. For each: TikTok → **+** → upload the clip → post it with **Who can watch → Only me**. Open it on
   your profile → **Share → Live Photo**. It lands in Photos as a Live Photo. (IntoLive does the same
   thing without the private post.)
3. Delete the three private posts.
4. Build the carousel: `slide-01.png`, the three Live Photos in order, `slide-05.png`. Turn **loop** on
   so they keep playing.

## The photos

The three pictures in the gift are in `gift.json`. Put yours in `photos/` as `1.jpg`, `2.jpg`, `3.jpg`
— in that order they are "the wall", "the night bus" and "u, blurry, laughing at something i said" —
then film again with the dev server running:

```
node scripts/tiktok-gift-live.mjs docs/marketing/tiktok-105
node scripts/tiktok-slides.mjs docs/marketing/tiktok-105/script.json docs/marketing/tiktok-105 --sheet
```

Any that are missing fall back to the site's demo pictures, and it says which. Pick the same couple
for all three; faceless or from behind reads best. They are real people's photos in an ad for a paid
product, so if one of them ever asks, take it down the same day.

## The gift, if you make it for real

Halfway at tryethos.io (premium). **Editor fields:** Their name `Lottie` · Your name `Rory` · Title
`for the train` · Your town or city `London` · Their town or city `Edinburgh` · Distance: leave it, it
works it out · What flies `Paper plane` · Background `Night flight` · A line for halfway
`got a 16-25 railcard. its 4 hours 20. dont be weird about it` · The letter: `Fade in`

**Message:** `lottie. you wanted me to say one thing all week and i couldnt do it by text, so this is
the thing. i didnt say it because you would have stayed, and you should go. i looked up the train in
july. its 4 hours 20. i can do 4 hours 20.`

## Post (tt-couple)

Caption: `would u have got off the train? | part 2`

Hashtags: `#lovestory #romance #part2`

Hooks for slide 1 — swap for each repost:

1. POV: he couldn't say it. so he made her this.
2. POV: she opened it on the train.
3. POV: "dont be weird about it"
4. POV: it was just a summer thing. he bought a railcard.

Part 2 promotes our own product: turn on TikTok's **content disclosure → Your brand**.

- **Pin (the how):** `its called halfway on tryethos.io. u blow into ur phone and a paper plane flies from his town to hers, and the note pops up when it gets half way`
- **"what app is this"** → `tryethos.io, its called halfway`
- **"WAIT you BLOW it"** → `into the phone yeah. i was doing it on a train. people looked`
- **"did she get off the train"** → `no. he told her to go`
- **"tell him thanks is so him"** → `he has never once said the thing`
