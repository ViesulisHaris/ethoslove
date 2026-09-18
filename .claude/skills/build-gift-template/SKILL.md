---
name: build-gift-template
description: How to build, change or review a gift template in this repo (src/templates/<slug>). Use this whenever the work touches a template — adding a new one, editing an existing template's look, interaction, fields or demo data, wiring a template into the editor and gallery, capturing its poster and preview, or reviewing a template someone else wrote. Reach for it even when the request never says "template": "make a gift where you shake the phone", "add a colour option to Kawaii", "the map one looks wrong on phones", "why doesn't my new field show in the editor" are all this.
---

# Building a gift template

A template is one self-contained experience a recipient opens on their phone. It receives one
`GiftData` prop and renders everything itself, so it works in the gallery demo, the editor preview
and a real gift link without knowing which it is. Read `src/templates/types.ts` first — it is the
whole contract, and it is short.

The fullest worked example is `src/templates/halfway` (a map, a microphone, custom field editors,
its own API route). For hand-drawn art look at `kawaii` and `bouquet`; for a room with a mood look at
`fireside`.

## The files

```
src/templates/<slug>/
  manifest.ts     names, tagline, description (en + es), occasions, tier, features, poster paths
  schema.ts       a Zod object for this template's own fields, every key with a default
  field-meta.ts   en + es labels, help and option names, keyed like the schema
  demo-data.ts    one complete, real-sounding gift per locale
  index.ts        assembles the TemplateModule
  Template.tsx    the experience
  art.tsx         optional: the drawing, kept out of the component
```

`index.ts` may also pass:

- `fieldEditors` — a custom editor for a field the generated form can't express (`bouquet`'s stem
  picker, `halfway`'s place search). Everything else should use the generated form, so the editor
  stays consistent.
- `leadFields` — keys to ask for directly under the names instead of at the end with the look, for
  the settings the whole gift is about.
- `replyFields` — what "Send one back" carries into the reply (Halfway swaps the two places).

## House style

These are what make seventeen templates feel like one product. Match them before inventing.

- **Size to the container, never the viewport.** `--u` is `min(1cqw, 1cqh × 0.6)`. Write
  `calc(12 * var(--u))`, not `px` or `vw`. A template with one fixed composition can define its own
  `--k` from `--u` and centre the whole thing with a `--top` (see `fireside`, `halfway`), which keeps
  it whole on a short phone and on a laptop.
- **The sender's colour comes in as CSS variables**: `--gift-accent`, `--gift-accent-soft/-pale/-deep`,
  `--gift-accent-rgb`, `--gift-on-accent` (already contrast-checked), plus
  `--gift-font-display/-body/-hand`. Use them for anything the recipient touches; keep the template's
  own palette for its world.
- **Both languages, in the file.** A local `const S = { en: {...}, es: {...} }` for this template's
  lines, `useGiftStrings`/`giftString` for the shared ones. No app context, so it renders anywhere.
  Never leave a string only in English.
- **`mode` matters.** `preview` is the editor's still frame: no sound gate, no timers, no microphone,
  show the signature image straight away. `demo` and `live` play properly.
- **Reduced motion is a real setting**, not a nicety: `useReducedMotion`, and give every long
  animation an instant path. `Ambience` already draws a still frame.
- **Seed anything scattered** with `mulberry32(hashString(...))` from the names, so tilts and
  positions are identical on the server, on the client and on replay.

## The shared kit — use it, don't rebuild it

`MessageBody` (the words, typewriter or fade, with the signature), `EndScreen` (ending, reactions,
"send one back", the song link), `Countdown`, `SurpriseReveal`, `SoundToggle`, `useGiftAudio`,
`Ambience` (petals, sparkles, hearts, bokeh, dust, snow, leaves, embers, bats), `Sticker` (die-cut
stickers), `useBlowDetector` (microphone), `useContainerSize`, `places.ts` (offline cities, haversine).

If a template needs a stage the kit lacks, add it to the template first. Move it to `_shared` only
when a second template wants it.

## Registering it

Miss one of these and the template half-exists. After adding the folder:

1. `src/templates/manifests.ts` — import the manifest and add it to `TEMPLATE_MANIFESTS`.
   `src/templates/registry.ts` — add a lazy loader entry, and `src/templates/schemas.ts` a schema
   loader; both keyed by the slug. A unit test fails if the three lists disagree.
   Keep them apart: pages that only list templates import `manifests.ts`, and anything they import
   that holds an `import("./<slug>")` ships every template's code to that page — three.js included.
2. `src/templates/_shared/intro-variants.ts` — the loading screen's world for this slug.
3. `src/templates/_shared/covers/looks.ts` — `defaultCoverFor` returns the cover a new gift starts on.
4. `scripts/capture-thumbnails.mjs` — a short routine that drives the demo, so the poster and preview
   can be captured.
5. `tests/e2e/templates.spec.ts` — add the slug to the demo list.
6. `public/templates/<slug>/poster.jpg` + `preview.webm` — generated, see below. The gallery card,
   the template page and the sitemap all point at them, so a missing poster is a broken image.

Everything else follows automatically: the editor, unlocking after payment, occasion pages,
`llms.txt`, the sitemap and the dashboard all read the manifests.

**Only two templates are free** (The Letter, Constellations) and a unit test enforces it. A new
template is `tier: "premium"` unless the user says otherwise.

## The editor form, generated from the schema

`describeObjectSchema` turns the Zod object into controls, so the schema decides the UI:

| Schema | Control |
|---|---|
| `z.enum([...])` with ≤ 4 options | labelled buttons (what the other templates use) |
| `z.enum([...])` with > 4 options | a dropdown — usually a sign to cut the list to four |
| `z.string()` with `.max(> 120)` | textarea |
| `z.string()` named `*color` or a hex regex | colour swatches |
| `z.number()` | number input |
| `z.array(z.string())` | add/remove list |
| anything else (objects, arrays of objects) | needs a `fieldEditors` entry |

Give every key a default so `fieldsSchema.parse({})` produces a complete, publishable gift, and write
`field-meta.ts` labels for both locales including `options` for every enum value. Parse the fields
inside `Template.tsx` too (`fieldsSchema.safeParse(data.fields)`, falling back to defaults) so an old
draft saved before a field changed shape still renders instead of crashing.

## Thumbnails

```bash
npm run dev                                           # in one terminal
npx playwright install chromium                       # once per machine (a ~150MB download — ask first)
node scripts/capture-thumbnails.mjs http://localhost:3000 <slug>
```

The routine should screenshot the frame that sells it (usually just before the big interaction) and
then drive the interaction so the recording has movement. Elements that pulse forever are never
"stable" for Playwright — click those with `{ force: true }`.

## Verifying

```bash
npm run lint && npm run typecheck && npm run test
npx playwright test tests/e2e/templates.spec.ts -g "<slug>"
```

Then look at it. Load `/demo/<slug>` at phone size, play it all the way through, and check the
editor at `/create/<slug>`. A quick script that screenshots the demo at 360×640, 375×667, 390×844 and
a landscape phone catches layout problems faster than reasoning about them.

Worth an end-to-end test of its own (`tests/e2e/<slug>.spec.ts`) when the template has real
interaction: drive it as a recipient would, in both languages, and cover the fallback for whatever
the interaction needs (no microphone, no motion sensor, reduced motion, keyboard).

Pure logic — geometry, physics, time — belongs in its own module with unit tests
(`halfway/track.ts`, `flight.ts`, `time.ts`), not buried in the component.

## Things that have actually gone wrong

- **A file named `atlas.ts` next to `Atlas.tsx`** breaks the build on Windows and macOS, where the
  filesystem can't tell them apart. Give the maths and the component different names.
- **`setState` called straight inside a `useEffect` body** fails lint. Set it from an event, a
  callback or a `requestAnimationFrame` tick, or derive it during render instead.
- **A shared hook that can't restart** (`useBlowDetector` stays `listening` after `stop`) breaks
  "Watch again". Put it in a small child component keyed by the replay counter so a replay remounts it.
- **The editor preview plays from the gift's cover**, so a test or script that presses "Play from the
  start" has to tap the cover before the template's own controls exist.
- **Demo photos must fit `features.photos`** min and max, or the template unit test fails.
- **Adding a template conflicts with anyone else adding one**, always in the same files: the
  manifests, the registry and schema loaders, `defaultCoverFor`, the capture script and the demo
  test list. Keep both sides.

## Choosing `occasions`

**Order matters: most central first.** Position 0 means the template was built for that occasion;
later positions mean it genuinely suits it. The occasion page sorts on exactly that, so `halfway`
and `passport` lead `/occasions/long-distance` and `the-letter` follows them. Get the order wrong
and the right templates sink.

Tag an occasion only if you would actually recommend the template for it — "this suits it", never
"this could be stretched to cover it". Most templates land on two to four; a unit test fails above
five, and another fails if any page is out of fit order.

The failure mode is quiet and it has already happened once: every template claimed six to eight
occasions, so `/occasions/long-distance` listed eighteen of twenty-six templates including Trick or
Treat and Snow Globe, and every occasion page became the whole catalogue reshuffled. A tag is not
free — it is a promise on a page someone lands on from Google.

An occasion page with four honest templates beats one with eighteen padded ones. If a page looks
thin, that is the catalogue telling you which template to build next — Christmas has two and
Halloween has one. Don't fix it by widening tags.

The tags also feed the "Good for" line on each template page and in `/llms.txt`, which is what AI
assistants read, so a loose tag misinforms more than the gallery.

## Writing the words

The manifest's description is marketing copy: say what the recipient does and what they get, in
plain words, no adjectives doing the work. Demo data should read like a real couple wrote it —
specific beats poetic, and the same gift in Spanish, not a translation of the English. Keep the
recipient's actions in the interface short and lowercase-ish like the other templates ("tap the box",
"blow into your phone", "drag the thread").
