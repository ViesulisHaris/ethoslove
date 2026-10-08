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
  "In this article we will", no recap at the end, and none of the filler the test rejects.
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
- **Templates.** There are 36. Each has a name, tagline and description in its manifest. Describe
  a template only by what its manifest says it does.
- **Free.** The Letter and Constellations are free:
  - unlimited gifts
  - up to 10 photos
  - the music library
  - a countdown and a hidden final surprise
  - a small "Made with Ethos" footer
- **Premium.** Every other template is a one-time payment, never a subscription:
  - One template: $7.99 / €7.49 / £6.49.
  - Pick three: $11.99 / €10.99 / £9.49.
  - Everything: $24.99 / €22.99 / £19.99.
  - Any unlock adds real songs (a 30-second preview of the actual track), video clips, voice
    messages, scheduling and a password, and allows up to 20 photos with no footer.
- **Scheduling.** A premium gift can unlock at a set time. You choose the time zone, so it can
  open at midnight where they are.
- **After sending.** Links are meant to be permanent, and edits go live at the same link. The
  recipient can send a reaction back, and "send one back" lets them reply with a gift of their own.
- **Trying it.** Every template has a free live demo, and the editor works on a phone.
- **Don't mention.** Promo codes and discounts change, so leave them out. Don't name competitors.
