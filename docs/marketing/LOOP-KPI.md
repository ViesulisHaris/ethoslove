# The recipient loop: what is counted, and how to read it

Built on `growth/loop`. The question: **of the people who open a gift, how many start one of their
own, and how many send it?** Everything below is a count of things that happened. Nothing follows a
person: there is no visitor id, no cookie, nothing kept on the phone, no gift id in any event, and
no database change. Inside the iPhone app nothing is counted at all (`track()` is a no-op there).

Where to read it: Vercel → the project → Analytics → Events (the named events), and Analytics →
Pages (the page views). Take one week at a time, Monday to Sunday.

## Before the first reading: one thing to check in the dashboard

The three ratios below work from each event's total. The finer readings (one door at a time, the
end screen against the reaction, gifts that hold something paid) need an event broken down by a
property, and nobody has yet looked whether this project's Vercel plan shows that: the code's own
notes say "Vercel's reports count by event name, not by a property" (`src/lib/analytics/track.ts`),
which is why the Letter test and the arrivals have one event name per version.

`reply_started` is live today and has carried `template` since September. Open it in Analytics →
Events and see whether its templates are listed. If they are, everything on this page can be read.
If they are not, read only the totals, and ask for the events to be renamed per door
(`recipient_opened_reply`, `recipient_opened_g`, `recipient_sent_reply` and so on, the way the rest
of that file does it); the counts then start from the day that ships.

## The events

| Event | Fires when | Properties | Code |
|---|---|---|---|
| `watermark_clicked` | The "Made with Ethos" badge is tapped on a real gift page: the floating one, or the one at the foot of the end screen. Not on demos or in the editor's preview. | `template` | `src/templates/_shared/Watermark.tsx` |
| `make_own_clicked` | "or make one for someone else" is tapped on a real gift's end screen. | `template`, `from: "end"` | `src/templates/_shared/EndScreen.tsx` |
| `reply_started` | "Send one back to {sender}" is tapped. `from` says where: the end screen, or the line under "Sent to {sender}." after a reaction. (The event existed; `from` is new, so older rows have none and are all end-screen taps.) A second tap while the editor loads is not counted. A tap on a phone that is offline is held on the gift, and counted only if the connection is back within ten seconds, when the editor is asked for. | `template`, `from: "end" \| "reaction"` | `src/components/gift/gift-experience.tsx` |
| `keep_tapped` | "Keep this gift" is tapped. Unchanged; listed because it is the fourth thing a recipient can tap. | `template` | `src/templates/_shared/EndScreen.tsx` |
| `recipient_editor_opened` | The editor opens for someone who came from a gift. `via` is the tag they came through: `reply` (Send one back), `g` (make one for someone else), `watermark` (the badge), `gift-keep` (the reminder email a kept gift sends). Not fired again when the editor reopens after signing in or paying (`?resume=publish`). | `via`, `template` | `src/components/editor/editor-shell.tsx`, `src/lib/attribution/recipient-loop.ts` (the tags: `recipient.ts`) |
| `recipient_started` | The first change to a new gift, in an editor opened through one of the four doors. Once per gift: a draft the device or the account already holds is not counted again. Not inside the iPhone app. | `within7: true \| false` | `src/components/editor/editor-shell.tsx`, `src/lib/attribution/recipient-loop.ts`, `src/app/api/loop/started/route.ts` |
| `recipient_gift_sent` | A gift made in that same tab goes out for the first time (published or scheduled). `paid` says what the gift holds, not what anyone did: true when it holds something that costs money (a premium template that is not a free reply, or a paid extra). It is true for someone who already owned the template and paid nothing now, and it misses nearly everyone who did pay (see "What these numbers cannot say"). | `via`, `template`, `paid` | `src/components/editor/publish-sheet.tsx`, `src/lib/attribution/recipient-loop.ts` |

Two page views complete the picture. Vercel already records them; nothing new was added:

- **Gift opens**: page views of `/g/[shortId]` (every gift is reported under that one path, never
  its own address). Spanish gifts open under the same path.
- **The page the badge and the new link open**: `/made-with-ethos?ref=watermark` and
  `/made-with-ethos?ref=g` (the `ref` is kept in the reported address, the template is dropped).
  That page is told only the site's name as where its visitor came from, never the gift's address:
  a gift page sends no more than its origin as a referrer (`next.config.ts`).

`via` is read from the editor's address (`?ref=`), or failing that from the tag the tab already
holds in memory (`currentRef()` in `src/lib/attribution/ref.ts`), or failing that from a free-reply
token in the address, which only "Send one back" on a paid gift puts there. It is never stored.

## The three ratios to read each week

1. **Opens → taps.** How many openers reach for Ethos.
   `(reply_started + make_own_clicked + watermark_clicked) ÷ page views of /g/[shortId]`
   Read the three taps separately too: they are three different intentions (answer the sender, make
   one for someone else, find out what this is).

2. **Taps → editor.** How many of those taps become a started gift.
   `recipient_editor_opened, without via = gift-keep ÷ (reply_started + make_own_clicked + watermark_clicked)`
   The `gift-keep` opens are left out because they have no tap that week to stand over: they come
   from the reminder email a kept gift sends, nine days before a date, often months after the gift
   was opened. Read them as a plain count on their own line. (Without a breakdown by `via` the
   total includes them and ratio 2 reads high by exactly that count; until reminders have been
   going out for a while it is close to nothing.)
   Per door, compare like with like: `via = reply` against `reply_started` (the button goes
   straight to the editor, so this should sit near 100%; a low number means the editor is failing
   to open). `via = g` against `make_own_clicked`, and `via = watermark` against
   `watermark_clicked`: both pass through `/made-with-ethos` first, so the loss is that page's, and
   its page views by `ref` show where it happens.

3. **Editor → sent.** How many started gifts go out.
   `recipient_gift_sent ÷ recipient_editor_opened`
   This is a floor, and it says nothing about buyers: nearly every recipient who pays drops out of
   it at the payment (below). **For recipients who became buyers, read the sales, not this event:**
   `purchases.ref` holds `reply`, `g`, `watermark` or `gift-keep` for every sale that started at a
   gift, and `scripts/revenue-by-ref.mjs` lists checkouts started, paid and revenue under each
   (how to run it is at the top of that file).

## The one number the audits asked for: recipients who start their own within seven days

**Top: gifts started.** Vercel → Analytics → Events → `recipient_started`, the week's count
where `within7` is `true`.

**Bottom: gifts opened for the first time.** No event counts this, and none was added: every
open is a row of `gift_views`, so a gift's first open is its earliest row. Supabase → SQL
editor, read-only:

```sql
select count(*) as gifts_first_opened
from (select gift_id, min(opened_at) as first_open from public.gift_views group by gift_id) f
where f.first_open >= timestamptz '2026-11-23 00:00+00'
  and f.first_open <  timestamptz '2026-11-30 00:00+00';
```

**The share:** `recipient_started` with `within7 = true` ÷ `gifts_first_opened`, same week.

What `within7` means, door by door:

| Door | How `within7` is decided |
|---|---|
| "Send one back" on a paid premium gift whose free reply is unused (`?reply=` token) | Exact. The server opens the sealed token, reads that gift's first open in `gift_views` and compares it with now. |
| "Send one back" on any other gift, "or make one for someone else", the badge | `true`. The tag lives in the tab's memory only, so the gift is being started in the same visit the gift was opened in. Not known: whether that gift was first opened more than seven days earlier and is being watched again. |
| The reminder a kept gift sends (`gift-keep`) | `false`. It goes out nine days before a date, usually months after the gift. A gift kept less than a week before its reminder is counted on the wrong side. |

What the number cannot say: the bottom counts gifts, the top counts visits (a browser tab) in which
a recipient started one, so trying two templates from `/made-with-ethos` is one, but the same
person on a phone and then a laptop, or in two tabs, is two; a recipient who comes back another day by typing the address is
nobody's (as before); a gift deleted since takes its opens with it, so read a week soon after it
ends; a sender who looks at their own gift signed out is that gift's first open. If the Events
page does not split an event by a property, ask for the event to be named per answer
(`recipient_started_7d`, `recipient_started_later`): one line in `countRecipientStarted`.

## What these numbers cannot say

- **Page views are opens, not people.** One person opening a gift three times is three opens, and a
  replay inside the page is not a new one. The KPI's "unique recipients" cannot be had without
  recognising a person, which the gift page does not do. Week over week the ratios are still
  comparable with themselves.
- **The sender's own opens are in there too.** A sender who opens their gift to check it is a view
  of `/g/[shortId]` like any other, and if they tap the badge or "or make one for someone else"
  there, they are counted as a recipient all the way down. The page cannot tell the two apart
  without knowing who is looking, so ratio 1's bottom number is a little large and its top a
  little too.
- **On a free gift, one person can tap twice.** Its end screen holds both "or make one for someone
  else" and the "Made with Ethos" badge, and both open `/made-with-ethos`. Someone who taps one,
  comes back to the gift and taps the other is two taps in ratio 1's top number. Paid gifts carry no
  badge, so there it cannot happen. Whether a free gift needs both is the owner's call; the brief
  asked for the link on every live gift.
- **`recipient_editor_opened` counts editors opened, not people.** Someone who taps the badge, then
  opens three templates' editors from `/made-with-ethos`, is three; reloading the editor while its
  address still says `?ref=` is one more. So ratio 2 for `via = g` and `via = watermark` can pass
  100%, and reads a little high. `via = reply` goes to one editor and is the cleanest of the three.
- **A recipient who comes back another day is not counted.** The tag lives in the tab's memory. Close
  the tab, type tryethos.io next week, make a gift: that gift is nobody's, here.
- **`recipient_gift_sent` is a floor, and it loses every payer.** The tag is lost whenever the tab
  loads a page afresh between opening the editor and sending. That happens:
  - when a guest signs in by tapping the link in the email, or with Google (typing the six-digit
    code keeps the tab);
  - **whenever anyone pays, either way.** Stripe's own page and the one-tap Apple Pay / Google Pay
    button both bring the buyer back through the checkout's success page, a whole page load, and
    the editor they return to (`/create/<slug>?resume=publish`) carries no tag.

  One case survives: a free reply to a paid gift, because its token stays in the address. So what
  the event really counts is free gifts sent by someone already signed in (or who typed the code),
  free replies, and gifts whose maker already owned what the gift holds. `paid = true` is therefore
  almost only that last group: people who paid nothing this time. Do not read it as buyers.
- **To make ratio 3 count payers and guests, the tag has to ride on the address they come back
  to.** `resumePath()` in `src/components/pricing/offers.ts` already carries the free reply's token
  that way and `editorVia()` reads the address first, so it is a small change, but it touches the
  checkout's return path and the sign-in cookie (`auth_next`). That is the owner's call and was not
  built.
- **Demos are left out on purpose.** A demo also shows the badge; a tap there is a visitor, not a
  recipient. It fires no `watermark_clicked`, and its link opens `/made-with-ethos` with no `?ref=`,
  so the editors and gifts that follow it are not counted as a recipient's either
  (`recipient_editor_opened`, `recipient_started`, `recipient_gift_sent`). Until 25 Nov 2026 the
  demo badge's link carried `?ref=watermark`, so those three counts held some demo visitors.

## A first week's reading, as a worked example

Say the week shows 4,000 views of `/g/[shortId]`, 60 `reply_started`, 25 `make_own_clicked`,
70 `watermark_clicked`, 95 `recipient_editor_opened` (3 of them `via = gift-keep`) and
18 `recipient_gift_sent`:

- Opens → taps: (60 + 25 + 70) ÷ 4,000 = 3.9%
- Taps → editor: (95 − 3) ÷ 155 = 59%
- Editor → sent: 18 ÷ 95 = 19% at least (the floor above)
- Buyers: whatever `scripts/revenue-by-ref.mjs` shows under `reply`, `g`, `watermark` and
  `gift-keep` for the same week

These figures are made up to show the arithmetic. The only measured baseline is older and counted
differently: 2.3% of free gifts and 0.5% of premium gifts got a reply (`docs/MONETIZATION.md`).
