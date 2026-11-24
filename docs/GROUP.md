# Group cards

A group card is a gift that people the sender invites add a note and a photo to, through a link,
before it is sent. This file is the map of the engine: what is switched, what is stored and for how
long, what it costs and which files decide that, and what has to happen before it can be sold.

People read "group card" everywhere (Spanish: "tarjeta en grupo"). In code the product is `group`
and the tables are `gift_groups` and `gift_contributions`.

**It ships switched off.** Its first template, the Advent Calendar, is built and held back with it
(see "The first template" below); the engine is also proven by a development-only reference
template. Nothing a visitor can reach today changes.

## The switch

`groupGiftsEnabled()` in `src/lib/group/flag.ts` is true only when both hold:

1. `GROUP_GIFTS_ENABLED` is exactly `"true"`, and
2. at least one template in the gallery declares `features.group` in its manifest.

With no such template, setting the variable turns nothing on. It is read on the server only and
passed down as a prop. Today there is none in the gallery: the Advent Calendar declares
`features.group` and is kept out of every list by `ADVENT_CALENDAR_LIVE` (`src/templates/held.ts`).

| State | What happens |
| --- | --- |
| Off (today) | Every `/api/group/*` route answers 404, `/c/<token>` is a 404 titled as any missing page is, the editor draws no group panel, fetches no script for one and is sent none of its words, the send screen draws nothing of a group card's, checkout refuses the product, the daily job skips its group step, deleting a gift or an account and the account's export read no group table, and the terms and the privacy policy do not mention group cards. |
| On, migration 0023 not applied | The group routes answer 503 `unavailable`, `/c/<token>` is a 404, the panel says it could not start, the daily job reports `{ error }` in its JSON and finishes the rest of its run, publishing still works. |
| On, 0023 applied, a group template in the gallery | On sale. |

Under `next dev` only, `/create/group-reference?group=on` (or `off`) shows either state of the
editor's panel for the reference template. A production build never reads that query.

**The product's words stay out of every page's source.** The editor's, the dashboard's and the
account's pages are sent their whole namespaces of the message catalogue, which used to carry the
panel's text and its price sentence into the source of every editor while switched off. A group
card's lines are listed once, `GROUP_WORDS` in `src/i18n/client-namespaces.ts`, and
`<ClientMessages>` leaves them out everywhere. They are the lines that name the product and also
the ones that name nothing and are its all the same: the send screen's three about a group's notes
("Add at least … notes from your group") and the page a contributor's confirming link opens. The
one live page that reads any of them in the browser, the editor of a template that declares
`features.group`, sends them itself, and only while group cards are on (`<GroupMessages>` in
`src/app/[currency]/[locale]/(editor)/create/[templateSlug]/page.tsx`). The account page's two
lines and the confirming page's seven are read on the server and never sent. A new line must be
added to `GROUP_WORDS`: `tests/unit/client-messages.test.ts` fails a line that names the product,
and any key named for a group or a contribution, until it is listed, and fails a page that draws
the panel without sending its words.

**Off, a template made for group cards is an ordinary template.** Its editor is sent none of those
words, so it reads none: no panel, and on the send screen no line about a group's notes, the plain
sign-in line, and no group pay panel (`groupEnabled` on `PublishSheet`; `groupOnSheet` in
`src/components/pricing/offers.ts`). Two things follow, both for the days between a group template
reaching the gallery and the switch going on, or after the switch is turned off again:

- A template whose `features.group.min` is above 0 cannot be sent while group cards are off: the
  server's rule holds either way, there is no panel to add notes with, and the send screen has no
  line to say why. Ship such a template in the same deploy as the switch, or with `min: 0`.
- A draft that already holds notes (made while group cards were on) still needs the group card's
  own unlock, and checkout refuses the product. Signed in and not yet paid for, its send screen
  shows no price and no button, only the sentence checkout itself would answer ("That isn't on
  sale right now. Reload the page."). It can be sent again once group cards are back on.

**The panel's script comes only with the panel.** The editor's shell fetches
`src/components/editor/sections/group.tsx` (and with it `src/components/group/panel.tsx` and the
emails `src/lib/group/report.ts` writes) only when it draws the panel: group cards on, a template
made for them. It asks for it beside the template's own script and holds the form until it has
come, so nothing under the panel moves. No other editor's scripts hold it
(`tests/e2e/group.spec.ts`, "an ordinary template's editor fetches no script that holds the
sender's panel…").

## The contract a template keeps

`GiftData.contributions?: { key, name, note, photo? }[]` (at most 25; keys unique; `src/lib/gift/schema.ts`)
and `manifest.features.group?: { min, max, noteMax, photos }` (`src/templates/types.ts`).

A template made for group cards must:

1. draw every item of `data.contributions ?? []`, in array order, from none to its `max`;
2. draw `name` and `note` as plain text: never through `parseRichText`, never as HTML, never
   auto-linked, both with `overflow-wrap: anywhere`;
3. set `dir="auto"` on the element that holds a name and on the one that holds a note, and nothing
   else in them, so writing that runs right to left (Arabic, Hebrew) starts from the right with its
   full stop at its end; where a name is set inside a sentence of the template's own, pass it
   through `isolated()` (`src/lib/group/bidi.ts`);
4. treat `photo` as optional, reserve its box from `width` and `height`, and load it lazily past the
   first screen;
5. carry no form, no report control and no link out (reporting is the end screen's);
6. keep working in the editor's preview as the list changes under it.

The server holds it to that: `readinessProblems` (`src/lib/gift/publish.ts`) adds
`contributionsMin`, `contributionsMax` and `contributionNote`; a template without `features.group`
has `contributions` removed when a draft is saved or a gift published (`src/app/actions/gift.ts`);
`mediaUrls`, `withoutForeignMedia` and `signAssets` cover contribution photos.

`src/templates/_group-reference/` is the reference: plain on purpose, resolvable only under
`NODE_ENV=development` (`manifests.ts`, `registry.ts`, `schemas.ts` each fall back to it there) and
in none of the lists the gallery, sitemap, app catalogue, llms brief or checkout read.

## The first template: the Advent Calendar

`src/templates/advent-calendar/`. A wooden advent house of twenty-four numbered doors on a
mantelpiece at night. A finger opens a door; behind it is one person's note (a small sealed
envelope, lifted out as a card with their photo, their words and their name, and leaving a tag
with their name when it is put back) or a sweet where nobody wrote. The star window in the gable is
the sender's own letter, photos, countdown and surprise, and then the end screen. Nothing opens by
itself.

- `features.group = { min: 3, max: 24, noteMax: 140, photos: true }`: one door a person, so it is
  sold only as the group product.
- Which doors hold notes is one seeded shuffle of the numbers from the gift's two names
  (`doors.ts`): the same on the server, in the browser and on replay. The order of
  `data.contributions` decides who has which of the chosen doors, lowest number first. A note added
  later opens one more door to a note and shuts none, but the chosen numbers are handed out in order
  each time, so everyone whose door is above the new one moves up to the next chosen door. Whoever
  gets the card never sees that; the sender does, in the editor's still frame, as notes are approved.
- The room is two rendered pictures of the same view per look, every door shut and every door open
  (`scripts/art/holiday/advent.py`, three looks; the numerals' font is beside it in `fonts/`, so
  any machine paints the same figures). An open door is the open picture laid over the
  shut one inside that door's opening and its leaf's outline; the swing is the shut picture's own
  door turned in the lens's perspective. What stands in a niche is a sprite placed by its rectangle
  in `art-map.ts`. To change the art: render, then `node scripts/art/holiday/pack.mjs advent-calendar <renders>`.
- Its three sounds (`playHatch`, `playEnvelope`, `playTing` in `_shared/night/sfx.ts`) are played at
  about a third, because they repeat; the door's is timed by `HATCH`, which its swing is drawn by.
- On a real gift's page (never the editor's played preview or a demo) the doors opened and the notes
  read are kept for the tab in sessionStorage (`kept.ts`), so a reload does not shut twenty-four
  doors again. The key is worked out from the two names and the notes' own keys; it holds no gift
  id and never leaves the browser. Taking it out is one line in `Template.tsx` (`remembers`).
- A free gift's badge floats at the foot of the screen; the foot's lines and the house go up out of
  its band (`CLEAR` in `Template.tsx`). A finger's second tap on a door still swinging, and a tap on
  the veil before a note's card has arrived, do nothing (a fast double tap used to take a note out
  and put it back unseen).

**Held back.** `ADVENT_CALENDAR_LIVE` in `src/templates/held.ts` is `false`. While it is, the
template is in none of the lists (`TEMPLATE_MANIFESTS`, `TEMPLATE_SLUGS`, `LOADER_SLUGS`,
`SCHEMA_SLUGS`), so the gallery, the occasion pages, the sitemap, the app's catalogue, the llms
brief and checkout never see it, it has no page, no search entry and no date, and
`GROUP_GIFTS_ENABLED` alone still turns nothing on. Like the reference template it is found by its
slug under `next dev` only: `/demo/advent-calendar`, `/create/advent-calendar` and
`/create/advent-calendar?group=on`. Its pictures are static files under `/art/advent-calendar/` and
`/templates/advent-calendar/`: they are in the deploy, and nothing links to them.

Setting it to `true` puts the template in every list at once, with its page
(`/templates/advent-calendar`), its entry in `src/content/template-seo.ts` and its date in
`src/content/page-dates.ts` (set that date to the day itself). `tests/unit/advent-calendar.test.tsx`
plays both states. Four things do not follow from the switch and are done by hand with it:

1. `tests/unit/group-contract.test.ts` has a test named "no template in the gallery declares it yet:
   nothing is on sale". It is true until that day and fails on it: change it to name the Advent
   Calendar.
2. `tests/e2e/templates.spec.ts`: move `advent-calendar` from `HELD` into the list. The file's own
   spec, `tests/e2e/advent-calendar.spec.ts`, skips itself under `CI`: take that line out.
3. Where it stands in a list is the owner's call. Its `sortOrder` is 9, the newest gifts' own, so it
   stands among them and does not lead every list (a card that needs three other people and costs
   twice what one gift does, ahead of all of them, should be decided, not happen). To put it under
   "New", add it to `NEW_SLUGS` in `src/config/featured.ts`.
4. Its page's own words. The growth build's template page (branch `growth/guides`) draws a palette,
   three steps and six idea cards per gift from three tables, and its tests hold every template in
   the gallery to a row in each (`tests/unit/template-steps.test.ts` and its neighbours), so with no
   rows the switch fails them. **Done at the merge of `growth/view` (24 Nov 2026)**: the rows that
   waited in `src/templates/advent-calendar/page-content.ts` are in the three tables behind the
   switch, the file is gone, and `tests/unit/advent-calendar.test.tsx` reads them from the tables
   with the switch on (and finds none with it off). What was done, for the record:
   - move `PAGE_THEME` into `TEMPLATE_PAGE_THEMES` (`src/content/template-page-themes.ts`),
     `PAGE_STEPS` into `TEMPLATE_STEPS` (`src/content/template-steps.ts`) and `PAGE_IDEAS` into
     `TEMPLATE_GUIDES` (`src/content/template-guides.ts`, with `faq: []`), each under
     `"advent-calendar"` and behind the same `...(ADVENT_CALENDAR_LIVE ? { … } : {})` spread its
     entry in `src/content/template-seo.ts` has: a row for a template in no list fails "and for
     nothing else";
   - teach the steps' cards the one thing they do not know. The second step ("Invite people to
     sign") quotes `contributions`, which is no field of an ordinary gift: add it to the fields a
     note step may name for a template with `features.group` (the list `shared` in
     `tests/unit/template-steps.test.ts`). `stepQuote` already reads it as it stands: the first
     signer's name, "Mum";
   - delete `page-content.ts`, and move the checks under "the words waiting for its page" in
     `tests/unit/advent-calendar.test.tsx` onto the tables. One test there fails from the moment
     the tables are on the branch until this is done, so it cannot be forgotten;
   - check the page's price once more. A template that needs notes to be sent (`features.group.min`
     above 0, `soldAsGroup` in `src/lib/gift/free-tier.ts`) is priced on its page as a group card
     (`PRODUCTS.group`) in the price line, the FAQ's answer and the Product JSON-LD, says collecting
     notes is free and that inviting takes a sign-in, not "no account needed", and lists its notes
     first under "What's included". Those lines are `templates.group` in `messages/*.json`, which no
     layout sends to a browser (`GROUP_WORDS.server`). If `growth/guides` draws the page's price or
     its included list anew, it has to keep that.

At the integration build, search what is served for the held template (`grep -r "Advent Calendar"
.next/static .next/server/app | head`). Its manifest and its `import("./advent-calendar")` are held
back by a constant from another module (`held.ts`), which a bundler may or may not fold away: the
name, the description and the chunk can be in a production build though nothing links to them, as
its pictures already are. Decide then whether that matters before the switch.

Its tests:

```
npx vitest run tests/unit/advent-calendar.test.tsx tests/unit/night-sounds.test.ts
PORT=3432 NEXT_PUBLIC_E2E=1 npx playwright test tests/e2e/advent-calendar.spec.ts --workers=1
NEXT_PUBLIC_E2E=1 SWEEP=advent-calendar PORT=3432 npx playwright test template-sweep --project=mobile-chrome --workers=1
```

Without `NEXT_PUBLIC_E2E=1` the cases with three, eight and twenty-four notes skip and say so.

## What is stored (migration `0023_group_gifts.sql`)

- `gift_groups`: one per draft gift whose sender asked for a link. It cascades with the gift and
  the account. It holds what the page at the link says (the sender's name as they are known, who
  the card is for, one optional line on what to write), the template's limits copied in, when the
  link closes, and the SHA-256 of the link's token.
- `gift_contributions`: what one person added. Status `pending`, `approved`, `rejected`, `removed`
  or `withdrawn`; name, note, the photo's path; whether the sender added it with its photo
  (`with_photo`); optionally an email address with the sentence they agreed to; the notice they
  accepted, word for word; the SHA-256 of the secret their browser keeps to take the note back
  (indexed: the secret alone finds the note).
- A private `contributions` storage bucket for photos waiting for the sender's yes, a trigger that
  holds each group to its limits when two notes land together, and `group_photo_orphans()`.

Both tables are the server's alone: row-level security on, no policies, nothing granted to `anon`
or `authenticated`. The migration only adds, and is safe to run twice. No IP address is stored
anywhere; rate limits are counted in Upstash.

**The link** is `https://tryethos.io/c/<22 characters>`, made by HMAC from the group's id, the
link's version and the server's secret (`src/lib/group/token.ts`). The token itself is never
stored, so a leaked table opens nothing. "Reset the link" raises the version. The link names no
gift, and the page sends no referrer.

**The editor is the only writer of a gift's content.** Saying yes to a note marks it approved,
gives it a key, copies its photo into the gift's own folder (`gifts/<giftId>/c<key>.webp`) and
returns the item; the editor puts it into `data.contributions` and saves. Whenever the panel loads,
an approved note missing from the gift is added again (with its photo only if it was added with it
the first time), and one its writer took back is taken out.

**The server decides what goes out.** The editor's copy can be behind (another phone, a tab left
open, the panel off screen), so `publishGift`, and `saveDraft` for a card that is already out, drop
every note whose key belongs to a contribution that was withdrawn, removed or turned down
(`keysOutOfCard` in `src/lib/group/store.ts`) before anything is stored, and publishing tells the
editor which (`takenBack`). A key stays on its row after the words are scrubbed, so the note stays
out. If the group's rows can't be read, the card is not sent (`group_unavailable`); a database
without the tables has nothing to have been taken back, and the card goes as it is.

A duplicated card carries its notes and no group: the editor's panel lists them all the same (move,
fix, remove), under "Invite people".

## What is kept and for how long

The daily job is `runGroupRetention` (`src/lib/group/retention.ts`), called from
`/api/cron/unlock` before the storage sweep. The numbers are `GROUP_RETENTION` in
`src/lib/group/limits.ts`; the privacy policy quotes the same ones and a test holds them together.

| What | When it goes | How |
| --- | --- | --- |
| A note turned down, removed or taken back: its words, photo and address | 24 hours after the decision (the sender's Undo) | The columns are emptied and the file deleted; the row stays so the group's limits still count it |
| A contributor's email address | The moment its one email has been sent, or refused because the address is on the unsubscribe list | `email`, its hash and the consent are set to null |
| An address that never confirmed | 7 days after the note was added | Same |
| Every note of a card that was sent, waiting ones included, and their waiting photos | Within 7 days of sending, which is what every contributor is told (`sentPromiseDays`). The job runs once a day, so it deletes at 6 days (`afterSentDays`): a note is gone between 6 and 7 days after sending | Rows and files deleted. What was added lives on in the gift itself |
| The exception: a card sent with a date on it that has not opened yet | The notes that are in it and whose writers confirmed an address wait until the card opens and their email has gone | Then the next run deletes them |
| Every note of a card never sent | 14 days after the date its link was due to close (`closes_at`), even if the sender closed it by hand sooner | Rows and files deleted; the draft is then no longer kept from the 7-day draft sweep |
| A group deleted with its gift or its account | Rows at once (cascade); files at once as well as can be, and within a day for certain | `forgetGroupPhotos`, then `group_photo_orphans()` |

A draft with an open group would otherwise be deleted by the existing 7-day draft sweep. The job
touches such a draft's `updated_at` once it has gone 4 days untouched (`draftTouchDays`: early enough
that two missed runs cost nothing, and seldom enough that the draft is not sent to the top of "My
gifts" every morning), until 14 days after its link was due to close. That is the one write this
feature makes to a table that existed before, and it is only ever made to a draft. This step runs
first and on its own, so nothing that fails further down the job costs anyone a draft.

The purge reads the notes that still exist (a thousand at a time, by id), not the groups: a sent
group's row lives as long as its gift, so a list of "groups sent a week ago" only ever grows. No
filter carries more than a hundred ids.

## Routes

All are `runtime = "nodejs"`, send `cache-control: no-store`, and are a 404 while the switch is off.

The sender's (signed in, 120 requests in ten minutes per account, each checks the group is theirs):

| Route | Does |
| --- | --- |
| `POST /api/group` | Makes the group for a draft gift on a group template, or returns the one it has |
| `POST /api/group/find` | The panel asking how its group stands. A POST, because a gift's id is never put in a URL |
| `PATCH /api/group/[id]` | The page's words, close or reopen, reset the link, keep it open 30 more days: 30 on from the day it closes, or from today once that has passed, never past 90 from the start. The group's `extendsTo` is where that would move it (null at the last day), and `ranOut` says its last day has passed |
| `POST /api/group/[id]/entries/[entryId]` | `approve` (with or without the photo), `reject`, `remove`, `restore`. A note its writer took back answers 409 `taken_back`, so the panel can say who did it; one in another state than the panel thought, 409 `not_allowed`; Undo after its day, 410 `gone`. Each entry in a group's answer carries `canUndo`, by the same rule the route keeps, and the panel offers Undo on nothing else |
| `DELETE /api/group/[id]` | The group and everything sent to it; the gift's own notes stay |

A contributor's address is never part of any answer to the sender, only that one was left.

Anyone holding the link (no account):

| Route | Does |
| --- | --- |
| `POST /api/group/contribute` | Multipart: name, note, the box, an optional photo and an optional address. 40 an hour per connection, 30 an hour per link from it. It answers as soon as the note is stored: the confirming email and the word to the sender are sent after the answer (`later` in `src/lib/group/http.ts`), so a slow mail service never makes anyone send a note twice |
| `POST /api/group/withdraw` | "Take my note back", with the secret the page kept (in the browser's own storage, one per note), until the card is sent. The secret alone finds the note, so it works after the sender has reset the link. 410 once sent, 404 for a note no longer there: the page gives the support address for both, and never says "taken back" without the server's yes |
| `GET`/`POST /api/group/confirm` | "Yes, send it to me": GET only asks, so a mail scanner confirms nothing |

What a contributor types is made one line of plain text (`src/lib/group/clean.ts`): control,
zero-width and bidi characters stripped, whitespace collapsed, anything that looks like a link
refused. Two of the zero-width characters are spelling and are kept where they are doing that: the
joiner (U+200D) between two pictures, which is what holds a family, a flag or a shrug together as
one emoji, and the joiner or the non-joiner (U+200C) between two letters of a script that joins
(Persian, Arabic, Hindi and their neighbours). Anywhere else, in a Latin word or at an end, they go
like the rest. The sender's own form in the panel runs the same cleaning and the same link check,
and so does the form for what the page says. A photo is refused over 2 MB or outside JPEG, PNG and WebP, and always decoded and written
out again as WebP of at most 1600 px (`src/lib/group/photo.ts`), which removes its EXIF.

**The address check and its limits.** A full stop with no space after it is not a link ("Gracias
por todo.Es un placer"): a word, a dot and a word counts only with a path after it ("t.me/abc"),
with an ending that is no word ("evil.pt"), or with a word-like ending where the note stops
("tienda.es"). The ending has to be typed as an address is, in lower case or all in capitals,
except for `com`, `org`, `biz` and `xyz`, which count however they are written ("Evil.Com"). It is
not a wall, and is not meant to be: nothing in a card is ever made a link, and the sender reads
every note before it goes in. Known to get through: an ending that is on neither list ("evil.ca",
"evil.se"), and a word-like ending in the middle of a sentence ("go to evil.shop now"). Known to
be refused though honest: a note whose last full stop lost its space before a short last word
("all my love.us", "un abrazo fuerte.de"); the page's words say to take the web address out, and
putting the space back sends it. Tightening either side loosens the other.

A link is one of: open, full, closed (by its sender), expired (past its last day, which the page
says without blaming the sender) or sent. A page left open while its sender reset the link learns
it when it sends (404) and says what `GroupLinkGone` says, never "try again".

The page is `src/app/[currency]/[locale]/(gift)/c/[token]/page.tsx`: no site chrome, noindex, no
price or payment field, no Clarity, no pixels, no cookie banner (`OFF_LIMITS` in
`src/lib/analytics/consent.ts`), and the cookieless page count sees it as `/c/[token]`.

How the page behaves when it is used by hand (each of these was found broken once, and is tested):

- **Before the page's script has run** (seconds on a bad connection, for ever where scripts are
  off) the form takes typing and can't be sent: its button is switched off until the page is live,
  and it is `method="post"`, so no browser ever puts a name, a note and an email address into the
  page's address. The tick opens the address field by the stylesheet (`peer-has-checked`), the
  count is not shown until it can be right, the round mark is drawn by the stylesheet, and a
  `<noscript>` line says what to do. `tests/unit/group-first-html.test.tsx` reads the first HTML.
- **Two tabs on one link** do not move each other: what the browser holds for the link is read
  once, when the page comes alive, and looked at afresh only to write it back, so neither tab
  loses a half-written note or the other's way to take a note back.
- **The keyboard's focus follows the screen.** When the form is replaced (the note went, the link
  turned out full, closed, past its day, sent or reset, a note was taken back, "Add another note")
  the new screen's heading takes the focus and sits in a `role="status"` region. Arriving at the
  page moves nothing.
- **The fields keep their own values** (name, note, both tick boxes, the address). A browser puts
  them back after Back or a reload, and the page reads the count and the address field's tick back
  off them, so what is drawn and what is sent agree. Sending reads the tick box itself. A tick with
  no address asks for the address ("Add your email, or untick the box."); it is never sent as "no
  email". Privacy opens in its own tab.
- **The count is under the note's box**, never inside it.
- **A photo that can't be used is said at the photo button.** Everything else is said under the
  send button. A photo picked with no connection is not blamed (the photo step's own code is fetched
  on first use): "Check your connection and pick it again." A form that comes back from Back or a
  reload with its words and without the photo it had says so there too, once (a flag in the tab's
  own `sessionStorage`, nothing of the photo).
- **Readable on the night ground.** Every field is 16 px (an iPhone zooms into anything smaller).
  Refusal lines are the brand's coral lightened to 6 to 1, and placeholders, which are each field's
  only visible label, are 5.7 to 1 or better.
- **The notice names the photo only on a card that takes one** (`groupNotice(locale, from,
  takesPhotos)`), on the page and in what is stored as agreed to.
- **Someone whose note is already in never sees the empty form first.** `KeptNoteGate`
  (`src/components/group/kept-gate.tsx`, `src/lib/group/kept.ts`) is a few bytes of inline script
  that looks in the browser's storage before the first paint and holds the form back when it finds
  a note kept for this link. It reads one key, sets one attribute and sends nothing. A first-time
  visitor has the form, and can type in it, from the first frame.
- **Too late to take a note back** (the card went out while the page was open): the page becomes
  "This card has been sent." and the support address is a link that opens an email with the page's
  reference in its subject (`groupWriteInLink`).
- **A note the server no longer finds** (404 from the withdraw route) is never said to be taken
  back. If this browser has another note at the link, the page stays "Your note is with …" and
  says under it that that note can't be taken back from here, with the address to write to. If it
  was the last one, the page stops saying whose hands the note is in and stops offering another:
  its headline is "That note can't be taken back from here any more." with the address under it.
  Each tap's answer replaces the last one's.
- **An address that opens no card** (reset, mistyped, made up) is a 404 drawn by `not-found.tsx`
  beside the page: the site's own "not found" while the switch is off, and once it is on one line,
  "This link no longer works. Ask whoever sent it for a new one." (`GroupLinkGone`), the same from
  the server for every address.
- **A note written at a link that was reset since can still be taken back there.** The browser
  that wrote it still holds its key under the old link, and the withdraw route finds a note by its
  key alone, so the "no longer works" page reads the token off its own address and offers "Take my
  note back" to that browser only (`src/components/group/gone-take-back.tsx`; the words and the
  buttons are the contribute page's own, `take-back.tsx`). This is what the privacy policy
  promises: from the page it was written on, in the same browser, until the card is sent. The page
  knows no card, so its email to support quotes no reference and asks who sent the link instead.

In the sender's panel: until one read of the group has been answered it shows that it is still
asking ("Couldn't load your group card. Trying again…", every five seconds; "You've been signed
out" for a session that ended) and never the price and "Invite people", which is only true of a
card the server has said has no group. The keyboard's focus follows what a tap changed (`useLanding`
in `src/components/group/panel.tsx`: the first field of a form as it opens, the button that opened
it as it closes, Undo when a note is removed, the list's heading when a note leaves it). What is
said when the server refuses is what happened: a web address in the page's words, a note its
writer has just taken back, an Undo past its day; "try again in a moment" is kept for what trying
again can change. A failed tap is answered inside the thing that was tapped (the note's own
card, the link's controls, the form), never in one line at the foot; under the link, one sentence
says what the page says with **Edit**, which changes the names and the line on what to write
without changing the link; a link that is closed or past its last day says so on its own block and
offers nothing to share it with; "Share…" is drawn only where the browser has a share sheet.

A draft that holds a group's notes, opened signed out, gets the sign-in step on the send screen and
never the guest pay panel (`guestPaysOnSheet` in `src/components/pricing/offers.ts`): that panel
sells the template or Everything, and neither sends a card with notes in it. That holds with group
cards off too; what changes then is the words (the plain sign-in line) and that nothing is priced.

## Emails (`src/emails/group.tsx`)

| Email | To | When |
| --- | --- | --- |
| Confirmation | The address a contributor left | On adding the note. It names nobody. At most three a day per address; never to an address on the unsubscribe list (which is then not kept) |
| "Here's the card you signed" | A confirmed address whose note is in a card that is out. Someone whose note was left out gets nothing, and the sentence they agreed to, the confirming email and its pages all say "if your note is in it" | When the card is published live (after the sender has their answer, not before), when a scheduled card opens (the recipient's first open, or the cron), when someone confirms after the card went out, and from the daily job as the backstop. Once per note; the address is deleted as it goes |
| "Notes are waiting" | The sender's account address, unless it is on the unsubscribe list | On a new note, at most once a day per group. It links to the dashboard, not to the gift, and carries the site's own unsubscribe link |

## Money

The product is `group` in `src/lib/pricing/products.ts`: **$23.99 / €19.99 / £17.99**, paid once,
when the first group card on a template is sent. It includes the template. Someone who already
holds the template (for good, or through a running Ethos for Two) pays the difference from one
template ($12.00 / €10.00 / £9.00). It grants the row `group:<slug>`, and the template's own row at
full price. Everything's `*` does not cover it; `group:*` exists only to be granted by hand.

Collecting notes is free. The price is on the panel's first screen before a link exists.
Contributors are never shown a price. It is not credited towards the Everything upgrade, not sold
in one tap, and not sold in the iPhone app. A refund or chargeback takes the row back and puts a
live group card back to draft; the notes already in it are the sender's content and stay.

Every file that decides what the product grants, costs or revokes is listed, with the test that
proves it, in `docs/marketing/growth-build/reports/group-money-paths.md`. `tests/unit/group-money.test.ts`
covers them in one place.

## Going live

In this order, each step leaving the site as it was until the last:

1. Deploy with the switch off (this branch).
2. Apply `supabase/migrations/0023_group_gifts.sql` by hand. Check: both tables exist with row-level
   security on, the `contributions` bucket is private, `group_photo_orphans` is executable by
   `service_role` only.
3. Put the Advent Calendar in the gallery: set `ADVENT_CALENDAR_LIVE` to `true`
   (`src/templates/held.ts`) and do the four things listed under "The first template". Its `min`
   is 3, so it cannot be sent while group cards are off (see "Off, a template made for group cards
   is an ordinary template"): this step and step 6 go out in one deploy. Any later template that
   declares `features.group` and keeps the contract above needs no switch of its own.
4. Read the group paragraphs of the terms and the privacy policy (`GROUP` in `src/content/legal.ts`;
   they appear only when the switch is on). Set `LEGAL_UPDATED` there to that day: the pages'
   "last updated" line and their dates in the sitemap both read it.
5. Optionally make a Stripe Product and set `STRIPE_PRODUCT_GROUP` (reporting only).
6. Set `GROUP_GIFTS_ENABLED=true` in Vercel and redeploy.

**One thing left to the owner: `robots.txt`.** It tells crawlers to stay off `/g/` and says nothing
of `/c/`, and this branch leaves it so on purpose. The page at `/c/<token>` answers every crawler
with `noindex, nofollow` and sends no referrer, and a crawler obeys `noindex` only on a page it is
allowed to fetch: listed in `robots.txt`, a link someone posted in public could still show up in a
search as a bare address, and the address is the key to the page. Left out, it is fetched, read and
dropped. If you would rather have the two lists match, add `"/c/"` and `"/es/c/"` beside `"/g/"`
in `src/app/robots.ts` on the day the switch goes on; nothing else depends on it.

## Tests

Unit (`tests/unit/group-*.test.ts(x)`): the contract, the switch, the reference template staying
out of every list, the token, the cleaning of text, the photo encoder, both sets of routes, the
editor store, the money paths, the proof that an ordinary gift's save, edit and publish send the
same statements as before, publishing a group card, the emails, the daily job, the account's export
and deletion. `migrations-group.test.ts` reads the SQL. `end-screen.test.tsx` and `legal.test.ts`
hold the Report link and the legal text in both states of the switch.

Browser (`tests/e2e/group.spec.ts`): the contribute page and the sender's panel in every state on
the development-only preview pages (`/group-preview/contribute`, `/group-preview/panel`,
`/group-preview/pay`), the reference template at `/demo/group-reference`, and the editor with the
panel on and off.

### Running the browser specs

A worktree has no `.env.local`, so nothing live can be reached. Playwright starts its own dev
server on the port given; never `CI=true`, never port 3000 or 3100, always `--workers=1`.

```
PORT=3431 npx playwright test tests/e2e/group.spec.ts --workers=1
```

The same bare command runs `commerce-api`, `keep-and-footer`, `templates`, `unsent-gift` and
`lifecycle`.

**`money.spec.ts` needs four placeholder settings**, and so do `attribution.spec.ts`,
`membership-signed-in.spec.ts` and `pricing-membership.spec.ts` (`currency.spec.ts` and
`personal-price.spec.ts` pass on the same server, so the six are run together): the pay panel and
the pricing page's buy buttons are only drawn on a server that has accounts and payments: the send screen needs
Supabase's public URL and key and a Stripe key, and `/pricing` reads `stripeReady()`
(`src/lib/stripe/server.ts`), which also wants the service-role key. All four point at nothing:

```
PORT=3431 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
SUPABASE_SERVICE_ROLE_KEY=x STRIPE_SECRET_KEY=sk_test_placeholder_reaches_nothing \
npx playwright test tests/e2e/money.spec.ts tests/e2e/attribution.spec.ts tests/e2e/membership-signed-in.spec.ts \
  tests/e2e/pricing-membership.spec.ts tests/e2e/currency.spec.ts tests/e2e/personal-price.spec.ts --workers=1
```

Run bare, `attribution.spec.ts` fails 2 tests and `membership-signed-in.spec.ts` 9 in each project
(no pay panel or pricing button to find); with the four placeholders they pass. Do not also set
`NEXT_PUBLIC_PRICE_CURRENCIES` on that server: the test browsers ask in `en-US` and would be
served dollars where the specs expect euros.

`server-action-forwarding.spec.ts` cannot pass on a development server at all: it looks for the
editor's save in a production build's scripts (the file says so) and fails with "no saveDraft
reference in the editor's scripts" on `next dev`. It belongs to the integration step's build.

Run bare, 30 of its 52 tests fail (no pay panel to find); with the first three only, 6 fail (the
pricing page's buttons). That is the live code's own behaviour, not this branch's: run bare on `origin/main`
(4ad3c39d, 22 Nov 2026) the same 30 tests fail, name for name, and the branch changes neither the
spec, the pay panel nor the pricing page.

Starting `next dev` by hand within a few seconds of another one on the same folder being stopped
(Playwright stops its own at the end of a run) has twice come up answering 404 for every editor and
preview page while `/pricing` answered 200. Stopping it and starting it again cleared it both
times; check `/create/the-letter` answers 200 before trusting a run.

Two tests in `group.spec.ts` also want those settings: the send screen of a signed-out draft that
holds notes, with group cards on and off. On a bare server they skip and say so; run
`group.spec.ts` once with the four placeholders to see them.
