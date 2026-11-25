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
  one currency. To mention an Ethos price, write its token (below), never the figure.
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
- **Never type a fact that the code holds.** A post is published from the mirror with nobody reading
  it, and prices, the template count and what is free all change. Write these tokens instead; the page
  fills them for each reader (`src/content/blog/fill.ts`), and `tests/unit/blog-posts.test.ts`, which
  the publish workflow runs, fails a post that types one of them:
  - an Ethos price: `{price:single}`, `{price:pick3}`, `{price:everything}`, `{price:extras}` ("Make
    it special"), `{price:photos}`, `{price:pass}`, `{price:pack}`. The reader sees it in the currency
    they pay in. Never "$11.99", "9,99 €" or "£8.99" for Ethos, in any language. Other makers' prices
    in a comparison stay as you saw them.
  - the number of templates: `{count:templates}`. Never "61 templates".
  - which templates are free: `{free:names}` ("The Letter", or "The Letter and Constellations"), and
    `{free:<slug>}` for "free" / "paid once" ("gratis" / "de pago único") said of one template.
    Never "Two are free", "one is free", and never "Free." typed on a template card: the card prints
    its own "Free" label exactly when the template goes out free.
  - what the free gift holds: `{note:A|B}`, where A is true while the free gift is the short note (the
    live site) and B while it isn't. Each side may hold links and the tokens above, never `|`, `{` or
    `}`. Anything about photos, length or "500 characters" on the free Letter goes in one.
- **Templates.** Each has a name, tagline and description in its manifest. Describe a template only
  by what its manifest, `schema.ts` and `Template.tsx` say it does.
- **Free, as the live site runs it** (`NEXT_PUBLIC_FREE_NOTE_SHARE=1`; `pricing.faqFreeNote` in
  `messages/en.json`): The Letter goes out free as a short note of up to 500 characters, as many as
  you like, with the music library or a 30-second preview of a real song and a small "Made with Ethos"
  footer. No photos, no full letter. Photos, the full letter, video, voice, a surprise inside,
  scheduling, a password and no footer come with "Make it special", paid once. Constellations is not
  free: it is made of photos and sells whole at the "Make it special" price.
- **Free, with the setting off** (`pricing.faq`, id `free`): The Letter and Constellations, the whole
  letter, up to 10 photos, the music library, a countdown and a hidden final surprise, with the footer.
  Every sentence about what is free must be true both ways: that is what `{note:A|B}` is for.
- **Premium.** Every other template is a one-time payment, never a subscription: one template
  `{price:single}`, pick three `{price:pick3}`, every template now and future `{price:everything}`
  (`src/lib/pricing/products.ts`). Any unlock adds video clips, voice messages, up to 20 photos, a
  surprise inside (a date or a trip, wrapped at the end), scheduling and a password, with no footer.
- **Make it special.** The extras for a free template, once: `{price:extras}`. Ethos for Two and the
  game packs exist too: describe them only from `pricing.faq` in `messages/en.json`.
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
  reader's currency, which the `{price:…}` tokens give (dollars, pounds or euros, whatever the
  post's language), weak points included: what costs extra and what it doesn't do.
- **Fair.** Every maker gets the same columns, in an order a reader can check (price, or A to Z),
  not Ethos first. Say what each one does well and who it suits, and say plainly where another is
  the better pick.
- **Facts, not knocks.** Compare features and prices. Never call another maker cheap, scammy,
  outdated or unsafe, never guess at their quality, motives or customers, and never use their logos
  or screenshots.
- **Dated and kept true.** The intro and the table say when the facts were checked ("Checked on
  16 Nov 2026"). Every 60 days the SEO routine checks every row again (`docs/blog/SEO-AGENT.md`), and
  a maker that has closed comes out.
