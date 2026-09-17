# TikTok carousel 98 · "the boring stuff" — long distance, part 1

A different format from everything before it: the light-mode DM thread the storytime accounts use,
with a photo as the opening slide and real profile pictures in the circles. Post 21:00 UK.

## Put your three pictures in first

Save the girl's photo, the boy's photo and the cover photo anywhere — Downloads is fine — then run one
command with the three paths in that order:

```bash
node ~/Documents/mail/ethoslove/scripts/tiktok-faces.mjs 98 ~/Downloads/her.jpg ~/Downloads/him.jpg ~/Downloads/cover.jpg
```

It runs from any folder — the full path to the script is what matters, not where the terminal is.

**The faces in this one were installed with `--top`**, because the interesting part of both photos is
at the top of the frame: his bouquet and her hair. The default crop keeps the busiest region, which on
those two pictures was his back and her wine glass.

It squares the two faces for the circles, crops the cover to 1080×1920, drops all three into this
folder and re-renders every slide. The circles are round, so a portrait has to be squared or it keeps
whatever is in the middle of the frame — a chest, a bouquet — instead of the face. It picks the
busiest part of the picture, which is usually the face; add `--top` if it grabs the wrong thing:

```bash
node ~/Documents/mail/ethoslove/scripts/tiktok-faces.mjs 98 ~/Downloads/her.jpg ~/Downloads/him.jpg --top
```

The cover is optional — leave it off and the first slide stays a placeholder until you add one. Until
the faces exist the circles are drawn ones, so the layout reads before the photos land.

## The beats

The cover: **"POV: his flight is in 6 hours / and he just sent you this"**. Then "u awake" / "ya" / "i
cant sleep" / "me neither" / "im sorry" / "for what". Then "for going" / "u got in. u have to go" / "i
know" / "doesnt make it better" / "i know". Then "i made u something" / "so u dont forget the boring
stuff", the link, "what boring stuff". Then "the bus stop" / "u kept the receipt from the chinese" /
"i kept everything" / "im not ok". Then "6 hours" / "dont say the number" / "sorry" / "come here" /
"im outside".

## Why it is written this way

- **Nobody is leaving because they stopped loving each other.** He got in somewhere. She tells him he
  has to go. That is what makes it bearable to watch, and it is why the comments are "who is cutting
  onions" rather than an argument about whether he should stay.
- **"im sorry" / "for what" / "for going"** is three bubbles and the whole situation. No explaining.
- **The gift is not a grand gesture, it is the opposite.** "so u dont forget the boring stuff" — the
  bus stop, a receipt from the Chinese. Nobody makes a keepsake out of the holidays; they make it out
  of the Tuesdays, and that is the line that makes somebody go and build one.
- **"i kept everything"** is the confession, and it is two words.
- **"dont say the number"** is what somebody actually types when a countdown is being said out loud.
- **It ends on "im outside", unresolved.** He has been downstairs the whole time. That is the part 2,
  and the comments will ask for it.

## The order

| # | File | On screen |
|---|---|---|
| 1 | `slide-01.png` | **the cover photo** with "POV: his flight is in 6 hours / and he just sent you this" |
| 2 | `slide-02.png` | "u awake" · "ya" · "i cant sleep" · "me neither" · "im sorry" · "for what" |
| 3 | `slide-03.png` | "for going" · "u got in. u have to go" · "i know" · "doesnt make it better" · "i know" |
| 4 | `slide-04.png` | "i made u something" · "so u dont forget the boring stuff" · **the link: "the boring stuff"** · "what boring stuff" |
| 5 | yours | One page of the scrapbook: the bus stop photo, taped |
| 6 | yours | The page with the receipt on it |
| 7 | `slide-05.png` | "the bus stop" · "u kept the receipt from the chinese" · "i kept everything" · "im not ok" |
| 8 | `slide-06.png` | "6 hours" · "dont say the number" · "sorry" · "come here" · "im outside" |

Eight slides. Two of them are yours, and they have to match what she names in slide 7 — a bus stop and
a receipt. Shoot those two pages specifically.

## The gift

Scrapbook at tryethos.io (premium), theme **Memories**, cover **Classic**, title `the boring stuff`.

**Editor fields:** Their name `Ella` · Your name `Jack` · The pages `Memories` · The cut-out title
`THE BORING STUFF` · The torn note `none of this was a big day` · The pinned note `the 42 bus · the
chinese · ur kitchen` · Music: library "Quiet Hours"

**Photos:** `the bus stop, 42 to town` · `the receipt from the chinese` · `ur kitchen, the good mug` ·
`the walk back` · `my hoodie on ur chair` · `the car park at yours`

**Message:** `ella. none of this is a big day. its the bus stop and the chinese and your kitchen at
half eleven, because that is the stuff that goes first and i am not letting it. i am not going to
write anything clever here. i kept everything. thats it.`

## Post (tt-couple)

Caption: `his flight was in 6 hours and he sent me this 😭 he kept the receipt from our first chinese`

Hashtags: `#longdistance #ldr #storytime #couple #part1 #fyp`

Part 2 is the door. Shoot it if this one moves: she goes downstairs, he is in the car, and neither of
them says anything useful. Pin `part 2 tomorrow` on this one and reply to every "part 2" comment.

- **Pin (the how):** `the thing he sent is on tryethos.io — photos, tape, his handwriting. the receipt is page 3`
- **"the boring stuff broke me"** → `thats the whole point of it. nobody forgets the holidays`
- **"is he actually gone"** → `part 2`
- **"what did he keep"** → `a receipt, two bus tickets and a photo of my kitchen. thats the gift`
