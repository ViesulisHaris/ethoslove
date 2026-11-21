# Group cards

A group card is a gift that people the sender invites add a note and a photo to, through a link,
before it is sent. This file is the map of the engine: what is switched, what is stored and for how
long, what it costs and which files decide that, and what has to happen before it can be sold.

People read "group card" everywhere (Spanish: "tarjeta en grupo"). In code the product is `group`
and the tables are `gift_groups` and `gift_contributions`.

**It ships switched off, and there is no template for it yet.** The engine is proven by a
development-only reference template. Nothing a visitor can reach today changes.

## The switch

`groupGiftsEnabled()` in `src/lib/group/flag.ts` is true only when both hold:

1. `GROUP_GIFTS_ENABLED` is exactly `"true"`, and
2. at least one template in the gallery declares `features.group` in its manifest.

With no such template, setting the variable turns nothing on. It is read on the server only and
passed down as a prop.

| State | What happens |
| --- | --- |
| Off (today) | Every `/api/group/*` route answers 404, `/c/<token>` is a 404, the editor draws no group panel, checkout refuses the product, the daily job skips its group step, deleting a gift or an account and the account's export read no group table, and the terms and the privacy policy do not mention group cards. |
| On, migration 0023 not applied | The group routes answer 503 `unavailable`, `/c/<token>` is a 404, the panel says it could not start, the daily job reports `{ error }` in its JSON and finishes the rest of its run, publishing still works. |
| On, 0023 applied, a group template in the gallery | On sale. |

Under `next dev` only, `/create/group-reference?group=on` (or `off`) shows either state of the
editor's panel for the reference template. A production build never reads that query.

## The contract a template keeps

`GiftData.contributions?: { key, name, note, photo? }[]` (at most 25; keys unique; `src/lib/gift/schema.ts`)
and `manifest.features.group?: { min, max, noteMax, photos }` (`src/templates/types.ts`).

A template made for group cards must:

1. draw every item of `data.contributions ?? []`, in array order, from none to its `max`;
2. draw `name` and `note` as plain text: never through `parseRichText`, never as HTML, never
   auto-linked, both with `overflow-wrap: anywhere`;
3. treat `photo` as optional, reserve its box from `width` and `height`, and load it lazily past the
   first screen;
4. carry no form, no report control and no link out (reporting is the end screen's);
5. keep working in the editor's preview as the list changes under it.

The server holds it to that: `readinessProblems` (`src/lib/gift/publish.ts`) adds
`contributionsMin`, `contributionsMax` and `contributionNote`; a template without `features.group`
has `contributions` removed when a draft is saved or a gift published (`src/app/actions/gift.ts`);
`mediaUrls`, `withoutForeignMedia` and `signAssets` cover contribution photos.

`src/templates/_group-reference/` is the reference: plain on purpose, resolvable only under
`NODE_ENV=development` (`manifests.ts`, `registry.ts`, `schemas.ts` each fall back to it there) and
in none of the lists the gallery, sitemap, app catalogue, llms brief or checkout read.

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
| `POST /api/group/[id]/entries/[entryId]` | `approve` (with or without the photo), `reject`, `remove`, `restore` |
| `DELETE /api/group/[id]` | The group and everything sent to it; the gift's own notes stay |

A contributor's address is never part of any answer to the sender, only that one was left.

Anyone holding the link (no account):

| Route | Does |
| --- | --- |
| `POST /api/group/contribute` | Multipart: name, note, the box, an optional photo and an optional address. 40 an hour per connection, 30 an hour per link from it |
| `POST /api/group/withdraw` | "Take my note back", with the secret the page kept (in the browser's own storage, one per note), until the card is sent. The secret alone finds the note, so it works after the sender has reset the link. 410 once sent, 404 for a note no longer there: the page gives the support address for both, and never says "taken back" without the server's yes |
| `GET`/`POST /api/group/confirm` | "Yes, send it to me": GET only asks, so a mail scanner confirms nothing |

What a contributor types is made one line of plain text (`src/lib/group/clean.ts`): control,
zero-width and bidi characters stripped, whitespace collapsed, anything that looks like a link
refused. A full stop with no space after it is not a link ("Gracias por todo.Es un placer"): a
word, a dot and a word counts only with a path after it, with an ending that is no word
("evil.pt"), or with a word-like ending where the note stops ("tienda.es"). The sender's own form
in the panel runs the same check. A photo is refused over 2 MB or outside JPEG, PNG and WebP, and always decoded and written
out again as WebP of at most 1600 px (`src/lib/group/photo.ts`), which removes its EXIF.

A link is one of: open, full, closed (by its sender), expired (past its last day, which the page
says without blaming the sender) or sent.

The page is `src/app/[currency]/[locale]/(gift)/c/[token]/page.tsx`: no site chrome, noindex, no
price or payment field, no Clarity, no pixels, no cookie banner (`OFF_LIMITS` in
`src/lib/analytics/consent.ts`), and the cookieless page count sees it as `/c/[token]`.

How the page behaves when it is used by hand (each of these was found broken once, and is tested):

- **The fields keep their own values** (name, note, both tick boxes, the address). A browser puts
  them back after Back or a reload, and the page reads the count and the address field's tick back
  off them, so what is drawn and what is sent agree. Sending reads the tick box itself. A tick with
  no address asks for the address; it is never sent as "no email". Privacy opens in its own tab.
- **The count is under the note's box**, never inside it.
- **A photo that can't be used is said at the photo button.** Everything else is said under the
  send button.
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
- **An address that opens no card** (reset, mistyped, made up) is a 404 drawn by `not-found.tsx`
  beside the page: the site's own "not found" while the switch is off, and once it is on one line,
  "This link no longer works. Ask whoever sent it for a new one." (`GroupLinkGone`), the same for
  every address.

In the sender's panel: a failed tap is answered inside the thing that was tapped (the note's own
card, the link's controls, the form), never in one line at the foot; under the link, one sentence
says what the page says with **Edit**, which changes the names and the line on what to write
without changing the link; a link that is closed or past its last day says so on its own block and
offers nothing to share it with; "Share…" is drawn only where the browser has a share sheet.

A draft that holds a group's notes, opened signed out, gets the sign-in step on the send screen and
never the guest pay panel (`guestPaysOnSheet` in `src/components/pricing/offers.ts`): that panel
sells the template or Everything, and neither sends a card with notes in it.

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
3. Ship a real template that declares `features.group` and keeps the contract above.
4. Read the group paragraphs of the terms and the privacy policy (`GROUP` in `src/content/legal.ts`;
   they appear only when the switch is on). Set `LEGAL_UPDATED` there to that day: the pages'
   "last updated" line and their dates in the sitemap both read it.
5. Optionally make a Stripe Product and set `STRIPE_PRODUCT_GROUP` (reporting only).
6. Set `GROUP_GIFTS_ENABLED=true` in Vercel and redeploy.

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

**`money.spec.ts` needs four placeholder settings**, because the pay panel and the pricing page's
buy buttons are only drawn on a server that has accounts and payments: the send screen needs
Supabase's public URL and key and a Stripe key, and `/pricing` reads `stripeReady()`
(`src/lib/stripe/server.ts`), which also wants the service-role key. All four point at nothing:

```
PORT=3431 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
SUPABASE_SERVICE_ROLE_KEY=x STRIPE_SECRET_KEY=sk_test_placeholder_reaches_nothing \
npx playwright test tests/e2e/money.spec.ts --workers=1
```

Run bare, 30 of its 52 tests fail (no pay panel to find); with the first three only, 6 fail (the
pricing page's buttons). That is the live code's own behaviour, not this branch's: run bare on `origin/main` (4ad3c39d, 22 Nov 2026) the same 30 tests fail, name for name, and the branch changes neither the spec, the pay panel nor the pricing page.

One test in `group.spec.ts` also wants those settings: the send screen of a signed-out draft that
holds notes. On a bare server it skips and says so; run `group.spec.ts` once with the four
placeholders to see it.
