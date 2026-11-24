# How the blog sounds, who it's for, and what's true about Ethos

The daily routine reads this before every post (`docs/blog/PLAYBOOK.md`).

## Who reads it

Mostly someone planning something for a person they love, in the days or hours before it matters.
Most often she is making it for him: his birthday (above all the moment it turns midnight), an
anniversary, a stretch of long distance, an apology, or no reason at all. Sometimes it's for a
girlfriend, a mother, a father or a friend. She searches on her phone, often a little late, and
wants something she can actually do tonight.

A post earns its place if that person would be glad they clicked even if they never make a gift
on Ethos. It sells by being useful. The product appears where it genuinely helps: the template
blocks, plus at most two mentions in the text.

## How it sounds

- Like a friend who is good at this: warm, specific and practical, with a little dry humour. The
  occasion guides in `src/content/occasions.ts` are the model ("Ten minutes is a fair estimate,
  longer if you keep rewriting the message").
- Concrete over general: what to write, what time to send it, what to have ready. Times and real
  examples beat adjectives.
- "You" is the reader. The person they're giving to is him, her or them, as the keyword says.
- Short sentences. No exclamation marks in the prose (sample lines may have them). No emoji. No
  "In this article we will", no recap at the end, and none of the filler in `tests/unit/filler.ts`,
  which the tests reject in posts and on every page of the site.
- Interesting, not only clean. Every section gives the reader something they couldn't have guessed:
  a real detail, a line to borrow, a time, a trick, a fact with its source. Cut any sentence that
  would fit a post on a different subject, and stop a list when the good items run out: twelve real
  ones beat twenty padded to a round number.
- Sample lines (`quote` blocks) are sincere and plain, the way people actually write: specific
  memories, "I love you", nothing that sounds like a greeting card.
- Readers are in the US, the UK and elsewhere, so wording works for all of them. Use "your mother"
  rather than mum or mom, and avoid uni/college, flat/apartment, miles/kilometres and prices in
  one currency. To mention a price, give all three or link to `/pricing`.
- Spanish is from Spain: tú, vosotros, móvil. It reads like `messages/es.json`, not like a
  translation.

## What's true about Ethos

Check these files before stating any fact. If a file disagrees with this list, the file is right:
`messages/en.json` (`pricing.*`, `templates.*`), `src/lib/pricing/products.ts`,
`src/config/site.ts` (`LIMITS`), `src/templates/<slug>/manifest.ts`, `src/content/occasions.ts`.

- **What it is.** Ethos (tryethos.io) makes animated digital gifts from templates. You add their
  name, your message, photos and music. They get a link or a printable QR code, and the gift opens
  on their phone as a short interactive experience. There's no app to install, and it works in
  English and Spanish.
- **Templates.** There are 61 (16 Nov 2026; count the folders in `src/templates`). Each has a name,
  tagline and description in its manifest. Describe a template only by what its manifest says it
  does.
- **Free.** The Letter and Constellations are free (`pricing.freeNote` in `messages/en.json`):
  - unlimited gifts
  - up to 10 photos
  - the music library, and a 30-second preview of a real song they can tap to hear
  - a small "Made with Ethos" footer
- **Premium.** Every other template is a one-time payment, never a subscription. Prices follow the
  reader's country: US dollars in the US, pounds in the UK, euros elsewhere
  (`src/lib/pricing/products.ts`, checked 16 Nov 2026):
  - One template: $11.99 / £8.99 / €9.99.
  - Pick three: $20.98 / £15.98 / €17.98.
  - Every template, now and future: $29.99 / £21.99 / €24.99.
  - Any unlock adds video clips, voice messages, up to 20 photos, a surprise inside (a date or a
    trip, wrapped at the end), scheduling and a password, with no footer.
- **Make it special.** The same extras for a free template (The Letter or Constellations), once:
  $8.99 / £6.49 / €7.49. Ethos for Two and the game packs exist too: describe them only from
  `pricing.faq` in `messages/en.json`.
- **Scheduling.** A premium gift can unlock at a set time. You choose the time zone, so it can
  open at midnight where they are.
- **After sending.** Links are meant to be permanent, and edits go live at the same link. The
  recipient can send a reaction back, and "send one back" lets them reply with a gift of their own.
- **Trying it.** Every template has a free live demo, and the editor works on a phone.
- **Don't mention.** Promo codes and discounts change, so leave them out. Don't name other gift
  makers, except in a comparison post (below).

## Comparison posts

The owner allowed them on 16 Nov 2026. When someone asks ChatGPT which site to use for a digital
gift or letter, it answers from comparison pages that other makers wrote, and Ethos is rarely in
them. A queue entry with `"for": "ai-answers"` is a comparison post, and it names other makers.
Write it so that a reader who never picks Ethos still finds it the most useful page on the subject:

- **Say who wrote it.** Near the top, one plain line: we make Ethos, one of the sites compared, and
  everything about the others comes from their own sites on the date given.
- **Only what you saw on each maker's own site, the day you write:** price and currency, what's
  free, what you can add (photos, music, video, voice), how it opens, scheduling, languages. Open the
  maker's own pages (WebFetch, or DataForSEO's page reader when a site blocks it). A fact you can't
  see there stays out: never from another comparison, a review, an AI answer or memory. A cell you
  can't check says "not stated", never a guess. Every page you used goes in the post's review record
  (`docs/blog/reviews/<slug>.json`) as a `sources` list of `{ "maker", "url", "checked" }`.
- **Ethos by the same rules.** Its row comes from the files above and the live /pricing page, in the
  reader's currency (dollars in the English post, euros in the Spanish one), weak points included:
  what costs extra and what it doesn't do.
- **Fair.** Every maker gets the same columns, in an order a reader can check (price, or A to Z),
  not Ethos first. Say what each one does well and who it suits, and say plainly where another is
  the better pick.
- **Facts, not knocks.** Compare features and prices. Never call another maker cheap, scammy,
  outdated or unsafe, never guess at their quality, motives or customers, and never use their logos
  or screenshots.
- **Dated and kept true.** The intro and the table say when the facts were checked ("Checked on
  16 Nov 2026"). Every 60 days the SEO routine checks every row again (`docs/blog/SEO-AGENT.md`), and
  a maker that has closed comes out.
