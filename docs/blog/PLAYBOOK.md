# The daily blog post

A routine runs this every morning: one new post on tryethos.io/blog, in English and Spanish, live
by the time the run ends. Nobody reads it before it goes out, so this file and
`tests/unit/blog-posts.test.ts` are the editor.

It is the job tools like Soro sell (pick a keyword, research it, write, link, publish, report),
done in the repo and without their known failures: no filler, no invented facts, no dead links,
no two posts chasing the same search, and the product only where it genuinely helps.

Read `docs/blog/VOICE.md` before writing. The post format is `src/content/blog/types.ts`; the
existing posts in `src/content/blog/posts/` are the examples to match.

## 0. Start clean

This checkout belongs to the routine and nobody else.

```bash
git status --porcelain            # anything left from an earlier run?
git stash push -u -m "routine leftovers $(date -u +%F)"   # only if the line above printed something
git fetch origin main && git checkout main && git reset --hard origin/main
npm ci --no-audit --no-fund
```

If a post in `src/content/blog/posts/` already has today's date (UTC) as `published`, stop: today's
post is out. Say so in one line and end the run.

## 1. Pick today's topic

Take the first entry in `docs/blog/queue.json`. Before using it, check:

- No existing post answers the same search (compare with every post's `keyword` and title). The
  occasion pages own "digital <occasion> gifts" (`seo.occasion.*.title` in `messages/en.json`), so
  a post never targets those either.
- If a dated occasion is within six weeks, an entry for it goes first: Halloween (31 Oct),
  Christmas (25 Dec), Valentine's Day (14 Feb), Mother's Day (UK: March or April; US: second
  Sunday of May), Father's Day (third Sunday of June). A post needs a few weeks to be found.

If the entry fails a check, delete it from the queue and take the next one.

### Refill the queue when it has fewer than 10 entries, and every Monday

Add topics until it has 30. Each one is a search someone types when they are about to make, write
or send something for a person they love: "what to write in an anniversary letter to your
boyfriend", "open when letter ideas", "6 month anniversary ideas". Use the WebSearch tool:

- Prefer searches where the current results are weak: forums, thin lists, spam on odd domains,
  PDFs. Skip head terms that big publishers own outright ("gift ideas for him").
- Every topic must lead naturally to one to three templates that fit it. Read the template's
  `src/templates/<slug>/manifest.ts` and never stretch what it does.
- One search, one post. If two topics would answer the same search, keep one.

An entry is
`{ "slug", "keyword", "keyword_es", "occasion", "templates": [...], "angle" }`, where the angle is
what this post gives that the current results don't.

## 2. Research (about fifteen minutes)

Search the keyword and one or two variants with WebSearch. Note what the top results cover, what
they leave out, and the questions people ask around it. Those questions become the FAQ.

Facts: state only what you can stand behind. A statistic needs a named source you found, linked.
No invented quotes, customers, reviews, studies or numbers. Facts about Ethos come only from the
files listed in `docs/blog/VOICE.md`.

## 3. Write it

Create `src/content/blog/posts/<slug>.ts` (one `export const post: BlogPost`) and add it to
`POSTS` in `src/content/blog/index.ts`.

- `published`: today's date in UTC, `YYYY-MM-DD`. `templates`: the entry's templates, best fit
  first; the first is the header image and the share card. `occasion`: the entry's.
- **English** (`content.en`):
  - `title`: up to 60 characters, the keyword in natural words.
  - `description`: 110 to 160 characters, saying what the reader gets.
  - `keyword`: the entry's, lowercase.
  - `lead`: 30 to 90 words that answer the search in the first two sentences.
  - `takeaways`: three to five lines.
  - `body`: at least four `h2` sections and at least 1,000 words; aim for 1,200 to 1,800. Lists
    and a table where they help. Where the topic is about writing, give two to six real sample
    lines as `quote` blocks. One to three `template` blocks, each a template that genuinely fits.
  - `faq`: three to five of the real questions people search, each answer complete on its own.
- **Spanish** (`content.es`): the same post in natural Spanish from Spain (tú, vosotros, móvil), the
  way `messages/es.json` and `src/content/occasions.ts` are written. Localise, don't transliterate:
  the Spanish keyword is what a Spanish speaker types for the same thing. The same templates,
  images and number of questions as the English.
- **Links**:
  - At least three links in the text to pages on the site: `/templates/<slug>`,
    `/occasions/<occasion>`, `/pricing`, `/blog/<slug>`.
  - When an older post is relevant, link to it.
  - Up to three external links, https only, to sources you actually read.
  - Site paths never carry `/es`: the link adds the language.
- **Images**: the template posters are the images (the header and each template block). Add a
  screenshot only if it shows something the poster doesn't: save it as
  `public/blog/<slug>/<descriptive-name>.webp`, under 1200 px wide and 150 KB, with its real
  width and height and a descriptive alt text.

## 4. Link it in

Add a sentence linking to the new post in one or two older posts where it genuinely helps their
reader, in both languages. Leave their `updated` alone for that. Every post must link to at least
one other post; the test checks it.

## 5. Check

Run these in order and fix whatever fails:

```bash
npx vitest run tests/unit/blog-posts.test.ts tests/unit/messages.test.ts
npm run lint          # errors fail; the two old warnings in scripts/ don't
npm run typecheck
npm run test
npm run build         # prerenders the post in both languages
```

Then look at what the build made. The post is prerendered, so its HTML is on disk; there's no
server to start or stop:

```bash
ls -l .next/server/app/en/blog/<slug>.html .next/server/app/es/blog/<slug>.html   # both exist
grep -o "<h1[^>]*>[^<]*" .next/server/app/en/blog/<slug>.html                     # the English title
grep -o "<h1[^>]*>[^<]*" .next/server/app/es/blog/<slug>.html                     # the Spanish title
grep -c "<slug>" .next/server/app/sitemap.xml.body                                # 2 or more
grep -c "<slug>" .next/server/app/llms.txt.body                                   # 1 or more
```

Last, read the English once as the person who searched for it. Does the lead answer them? Is every
claim true? Would they be glad they clicked? Fix what isn't so.

### The review panel: nothing goes out below 10/10

Then run the panel in `docs/blog/RUBRIC.md`. Three fresh reviewer subagents read the post in
parallel, each told not to edit any file:
- the reader who searched for it;
- the editor and fact-checker;
- the search competitor, who compares the post with what ranks now.

Apply their fixes, then rerun the checks above. Then run a fresh panel on the new version. Repeat
until all three overall scores are 10, no criterion is under 9 and there are no dealbreakers.
There are at most three rounds; the rubric says what to do if the post doesn't get there. Write
every round to `docs/blog/reviews/<slug>.json`: the test fails a post without a record ending
10/10/10.

If something fails and you can't fix it in this run, don't publish. That includes a panel that
doesn't reach 10/10 on the second topic either. Stash the work, leave the queue as the rubric
says, and report what failed.

## 6. Publish

In one commit, add:
- the post and `index.ts`;
- its review record `docs/blog/reviews/<slug>.json`;
- any older posts you linked from;
- `docs/blog/queue.json` with today's entry removed;
- `public/blog/<slug>/`, if you added images.

Use the message `blog: <English title>`, then:

```bash
git push origin main
```

If the push is rejected because `main` moved, run `git pull --rebase origin main`, repeat the
first four checks, and push again. Vercel deploys `main` by itself: the post is at
`https://tryethos.io/blog/<slug>` a few minutes later.

### When the network allows it: check it's live, then ping IndexNow

This box usually can't reach the live site, so try once and skip this step if it doesn't answer.
If it does, wait for the deploy, then tell the IndexNow engines (Bing, and through it ChatGPT
search, Copilot and DuckDuckGo):

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 10 https://tryethos.io/     # not 200: skip
for i in $(seq 1 20); do [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://tryethos.io/blog/<slug>)" = 200 ] && break; sleep 30; done
node scripts/indexnow.mjs https://tryethos.io/blog/<slug> https://tryethos.io/es/blog/<slug>
```

## 7. Report

Send one push notification: `New on tryethos.io: <English title>`.

The final message is what the owner reads on their phone. Write only:
- the title;
- the link, https://tryethos.io/blog/<slug>;
- the search it targets;
- the templates it recommends;
- the panel's verdict, for example `Panel 10/10/10 after 2 rounds`;
- "Live and sent to IndexNow", or "Live check skipped (no network)";
- one line if anything was skipped or failed.

## Never

- Never change anything outside `src/content/blog/`, `public/blog/` and `docs/blog/`. Templates,
  prices, the editor and the site's code are not the routine's to touch. If the build breaks
  because of code outside the blog, report it and publish nothing.
- Never invent facts, statistics, reviews, quotes or customers, and never claim something Ethos
  doesn't do.
- Never copy sentences from another site.
- Never publish twice in one day, and never publish a post that failed a check or that the panel
  hasn't rated 10/10.
- Never present a made-up couple as real (the TikTok account's couple stays on TikTok).
