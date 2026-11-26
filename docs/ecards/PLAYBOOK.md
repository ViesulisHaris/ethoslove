# The ecard pages

A cloud routine runs this three times a week, with every computer off: **one** new ecard page for
tryethos.io each run, or, when no page is due, one existing ecard page made better from its search
numbers. It is the owner's order of 26 Nov 2026: "the ecard thing should be automation, something
like the blog posts".

Why ecards. People search the word. In the US, "ecards" gets 33,100 searches a month, "christmas
ecards" 40,500 in December, "happy birthday ecard" 40,500 in April, "valentine ecards" 22,200 in
February; "digital gift", the site's own word, gets 880 (DataForSEO, 26 Nov 2026). What Ethos makes
is an ecard that moves and takes the sender's own words, photos and song, and until this routine the
site hardly said so.

An ecard page is a gift page by kind: `/gifts/<slug>`, drawn by the same page as
`/gifts/last-minute`, in English and Spanish. The first one, `christmas-ecards`, is the model: read
`src/content/ecards/pages/christmas-ecards.ts` and `src/content/ecards/types.ts` before writing.

Read before starting, every run: this file, `docs/blog/VOICE.md` (how the site writes),
`docs/blog/SEO-DATA.md` (how to get search data and what the numbers mean) and
`docs/ecards/log.md` (what the earlier runs did and learned).

## What this routine may touch

Only these, or nothing it writes goes live and every blog post behind it waits too
(`scripts/blog-guard.mjs` checks each commit before it reaches the live site):

- `src/content/ecards/pages/<slug>.ts`: one page per file, new or changed, never deleted or renamed;
- `src/content/ecards/index.ts`: one import line and the page's name in `PAGES`, nothing else;
- `docs/ecards/queue.json`, `docs/ecards/log.md`, `docs/ecards/ranks.md`,
  `docs/ecards/reviews/<slug>.json` (lowercase names; this file is not the routine's to change);
- `docs/blog/seo-log.md`, which `scripts/seo/dfs.sh` writes.

A page file is data and nothing else: the type import, then one
`export const page: EcardPage = { … };` of double-quoted strings, arrays and objects. No function,
no template string, no single quote used as a quote, no second import. The slug ends in `ecards`.

Everything else on the site is a person's job. When the data says another page should change, write
it under "For a person" in `docs/ecards/log.md`, with the numbers.

## 0. Start clean

As `docs/blog/PLAYBOOK.md` step 0 (fetch, reset to `origin/main`, `npm ci`). If
`docs/ecards/log.md` already has an entry for today (UTC), stop: today's run is done.

Check the DataForSEO balance (`bash scripts/seo/dfs.sh appendix/user_data`). Under $1, or the
script exits 2: make no paid calls, and work from the numbers already in `queue.json`.

## 1. Choose

Take the first entry of `docs/ecards/queue.json` that has no `done`, whose `not_before` is today or
earlier, and whose `watch` condition (if it has one) is met. If the gallery has no gifts that fit
it (step 2), write `"skipped": "<date>: <why>"` on the entry, log it, and take the next.

If no entry is due, do one of these instead, and never the same page twice within 21 days:

1. **A page seen but not clicked, or in striking distance.** Search Console for the last 28 days
   (`docs/blog/SEO-DATA.md`), for `/gifts/<slug>` of each ecard page: a search with 20 or more
   impressions where the page averages 4 to 20, or 100 impressions and a click rate far under its
   position's. Get that search's top 10 and give the page what the pages above it give.
2. **New searches.** Keyword ideas around "ecards" (`dataforseo_labs/google/keyword_ideas`, US):
   a search with 300 or more a month, or a season peak of 2,000 or more, that no page of the site
   answers and that Ethos really makes a card for. Add it to the queue with its numbers. (That is
   the run's change; the page is written by a later run.)
3. **Ranks.** If the newest section of `docs/ecards/ranks.md` is over 14 days old: for each ecard
   page's `search` and `also` phrases in the queue, the US mobile top 30
   (`serp/google/organic/live/regular`), and where tryethos.io is. Add a dated section.

## 2. Check the search, then choose the gifts

For the entry's `search` and each `also` phrase (about $0.05 in all):

- volume, difficulty and intent now (`dataforseo_labs/google/keyword_overview/live`, US);
- the US mobile top 10 with "People also ask" (`serp/google/organic/live/advanced`).

Read the top 10. Say in the log what the searcher wants (free cards to send now, a card with their
own photo, something funny) and what the first results give. If the searcher wants something Ethos
does not make (a printable, a card for a company's whole staff), skip the entry and say why.

Then choose **five to nine gifts** from the gallery that fit the occasion, each a different
template:

- The gallery is `src/templates/manifests` (`occasions` says what each fits); what each gift does is
  written, checked against its code, in `src/content/template-guides.ts`. Take every fact about a
  gift from there and from the template's own `schema.ts` and `Template.tsx`: what the person does
  with a finger, what appears, the field a line goes in and its character limit. **Never state
  something a gift does that those files do not show.** No invented look, colour, count or step.
- A template whose slug is in `src/templates/held.ts` as not live is not in the gallery: leave it out.
- The free one comes first when it fits: The Letter as the free note (`line.field: "freeNote"`,
  no photos, no clip, no voice in its heading).
- `cover` is the gift on the band's phone and `film` the one playing in the hero: both must be in
  the page's `ideas`. `photo` is one of `p1` to `p8` (`src/templates/_shared/demo-photos.ts`).
- `occasion`, when the page has one, is a word from `src/config/occasions.ts`, and the page's
  `related` links to `/occasions/<occasion>`.

## 3. Write the page

Copy the shape of `christmas-ecards.ts`: `slug`, `added` (today, UTC), `occasion`, `photo`, `cover`,
then `en` and `es`, each a whole page: `title`, `description`, `h1`, `label`, `hero`, `ideasTitle`,
`craft`, `film`, `lead` (two paragraphs), `ideas`, `sections` (three), `faq`, `related`.

- **The words people type.** The English title, h1 and description say "ecard" or "ecards" with the
  occasion, the way the search is typed. Spanish says "tarjetas … virtuales" (or what Spanish
  searchers type, if the data shows another word). A title and h1 no other page of the site has.
- **Honest about free.** Most of these searches add "free". Say plainly, in the lead and in the
  first question, which card is free and that every other is a one-time payment, after which the
  design is the buyer's for good, with no subscription. Never "free ecards" for the paid ones.
  What the free gift is goes in as a token, because the code decides it:
  `{note:<text while the free gift is the short note>|<text otherwise>}`, `{free:names}` (the free
  templates by name) and `{count:templates}`. No token in `title`, `description`, `h1`, `label`,
  `ideasTitle` or `craft`. **No price anywhere**, as a number or a token: the page shows it itself.
- **Each idea gives a line to steal.** `line.text` is something a real person would send, specific
  (a place, a habit, a number), within the field's limit, and different on every page. `body` says
  what the person receiving it does and sees, in the gift's own facts, then one piece of advice on
  what to write. Describe a template afresh: no run of words shared with another page that lists it.
- **Answer what they ask.** The `faq` answers the "People also ask" questions that fit, in the
  searcher's words, and always: is it free, how do I send it, can it arrive on the day, does the
  person need an app.
- **The voice** is `docs/blog/VOICE.md`: plain sentences, no filler, no exclamation marks, American
  English, Spanish that addresses one person and genders nobody. Nothing names Spain or a Spanish
  city. No other company's name.
- Spanish is written, not translated word for word, and lists the same gifts in the same order
  with lines for the same fields.

Add the page to `src/content/ecards/index.ts`: one line
`import { page as <camelCaseName> } from "./pages/<slug>";` and its name at the end of `PAGES`.

## 4. Check

```bash
npx vitest run tests/unit/ecard-pages.test.ts tests/unit/gift-guides.test.ts tests/unit/spread-budget.test.ts tests/unit/guides-claims.test.ts tests/unit/site-copy.test.ts tests/unit/seo-free-truth.test.ts tests/unit/blog-guard.test.ts
npm run typecheck
npm run lint
npm run test
npm run build
node scripts/blog-guard.mjs origin/main HEAD      # after the commit of step 6, before the push
```

The tests are the pages' house rules (word budgets, heading shapes, limits, links that exist, what
a purchase buys). When one fails, read the test's own comment and change the page: the tests are
not the routine's to change. Then look at what the build made:

```bash
ls -l .next/server/app/eur/en/gifts/<slug>.html .next/server/app/eur/es/gifts/<slug>.html 2>/dev/null || find .next/server/app -name "<slug>.html" | head
grep -c "<slug>" .next/server/app/sitemap.xml.body      # 2 or more
```

### The panel: nothing goes out below 10/10/10

Three fresh reviewer subagents read the page in parallel (the only subagents this routine uses),
each told to edit no file and to score 1 to 10 with reasons:

- **The fact-checker.** For every sentence about a gift, finds the line of
  `src/content/template-guides.ts`, the template's `schema.ts` or `Template.tsx` that makes it
  true, and every limit in its schema. One claim it cannot trace is a dealbreaker. Also: is what
  the page says about free and paid exactly what `src/lib/gift/free-tier.ts` and
  `src/lib/pricing/products.ts` do.
- **The searcher.** Gets step 2's data (the top 10's titles and domains, "People also ask"). Would
  the person who typed the search be glad they clicked, and does the page give them more than the
  page ranking first. A fitting "People also ask" question left unanswered can't score 10.
- **The reader.** Is every line to borrow one a person would really send; is anything filler,
  generic or written to sound nice; does the Spanish read as Spanish.

Apply the fixes, rerun the checks, run a fresh panel (each new reviewer gets the last round's
review from its role). At most five rounds. Write every round to
`docs/ecards/reviews/<slug>.json` as `{ "slug", "date", "rounds": [{ "fact": n, "searcher": n,
"reader": n, "fixes": ["…"] }] }`. A page that does not reach 10/10/10 with no dealbreaker is not
published: stash it, write what the panel said in the log, and leave the queue entry open.

## 5. Write it down

Mark the queue entry `"done": "<today>"` and refresh its numbers. Add today's entry at the top of
`docs/ecards/log.md`:

```markdown
## YYYY-MM-DD: <the page, or the change>
- **Page:** /gifts/<slug>
- **Search:** <phrase>, <searches a month>, peak <month: searches>, difficulty <n>; what the top results give
- **Gifts:** <the templates listed, in order>
- **Panel:** 10/10/10 after N rounds
- **Cost:** $0.0X; balance $X.XX
- **Check on:** <a date three weeks out> where the page stands for <phrase>
```

On a "check on" date, that day's run says in its entry where the page stands (Search Console:
impressions, clicks, average position for the phrase), and what to try next if nothing moved.

## 6. Publish

One commit as the team's author, with the page, the index, its review record, the queue, the log,
and `docs/blog/seo-log.md` if the search data ran:

```bash
git -c user.name="Haralds" -c user.email="adulis2014@gmail.com" commit -m "ecards: <the English title>"
node scripts/blog-guard.mjs origin/main HEAD
git push origin HEAD:main        # the mirror; pull --rebase and retry if it moved; never force
```

The live repository's Publish blog workflow takes it from the mirror, checks it again, runs the
same tests, puts it live within hours and tells IndexNow. If the guard prints a problem, fix the
commit before pushing: a commit the guard refuses blocks every blog post behind it.

## 7. Report

Push one notification: `Ecards: <the page or the change>`. The final message, for the owner's
phone: the page and its address, the search and its numbers in one line, the cost and the balance,
and one line if anything was skipped or failed.

## Never

- Never more than one page a run, never a file outside the list at the top, never a page deleted
  or renamed (its address is what ranks).
- Never a claim about a gift that its code does not show, and never "free" for a paid card.
- Never a price, another company's name, or a promise of how a page will rank.
- Never contact a site or a person, sign up anywhere, or buy anything.
- Never print, store or ask for a key: search data comes only through `scripts/seo/dfs.sh` and the
  Search Console endpoint, whose keys the environment adds.

## The routine

Written in `docs/ecards/log.md` when it was created: its name, id, schedule and model. Its prompt
points here and sums up the rules above, so changing this file changes the routine.
