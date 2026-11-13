# The daily SEO improvement

A cloud routine runs this twice a day, with every computer off: **one** change to tryethos.io each
run that real search data says will help it rank, made carefully, checked like a new post, written
down with the reason, and live within hours. It is the owner's answer to "each day new things, so we
finally start ranking" (13 Nov 2026), modelled on an agent that made one small change a night and
kept a decision diary. The same day the owner asked to go faster ("maximize to the max", spending at
least $1 a day of search data where it helps), hence two runs a day and the budgets below.

Steady: one change a run, nothing rushed, nothing that can break the site. The blog routine
(`docs/blog/PLAYBOOK.md`) writes new posts; this one makes what already exists rank better.

Read `docs/blog/SEO-DATA.md` (how to get search data and what the numbers mean), `docs/blog/VOICE.md`
and `docs/blog/RUBRIC.md` before starting.

Budget: the owner said on 13 Nov that search-data cost is not a limit when it helps. So buy every
call that makes this run's decision better (the top 10 and questions for a second and third
phrase, the UK and Spain as well, the structure of the pages above ours), up to about $3 a run plus
the weekly jobs in step 1. Never buy what you already have, and below a $1 balance make no paid
calls at all (step 0): the routines can't spend money the account doesn't hold.

## 0. Start clean

Exactly as in `docs/blog/PLAYBOOK.md` step 0 (fetch, reset to `origin/main`, `npm ci`). If
`docs/blog/seo-diary.md` already has two entries for today (UTC), stop: today's changes are made.

Check the balance (`appendix/user_data`). Under $1: make no paid calls, push the notification
`SEO: DataForSEO balance is $<balance>, top it up to keep the daily changes going`, and end. If the
script exits 2 (no access), push `SEO: no search data (DataForSEO unreachable from the cloud)` and
end: without data this routine has nothing to go on.

## 1. Know where we stand, and find links (the first run of a Monday or a Thursday)

**Rank check (Mondays and Thursdays, or when the newest section of `docs/blog/seo-ranks.md` is over
4 days old).** DataForSEO's own ranking database barely sees a young site (4 US keywords on 13 Nov),
so check the real results page instead. Make the list: every keyword in
`docs/marketing/KEYWORDS.md`'s target table whose page is ours (not "skip", not "new page
needed"), plus every blog post's `keyword` (about 120 phrases, growing with the blog). For each, get
the US mobile top 30 (`serp/google/organic/live/regular`, depth 30, about $0.006; see SEO-DATA.md)
and note where tryethos.io is, with the URL that ranks, or "not in the top 30". Check the UK too
for the product phrases (flowers, letters, fortune cookie, scratch card) and Spain for the Spanish
targets with the most searches. About $1.50 a check. Also pull `ranked_keywords` (cheap) for
anything it finds that the list missed.

Add a dated section to `docs/blog/seo-ranks.md`: every phrase where we're in the top 30 (position,
page, monthly searches), how many of the list we're in the top 10 / 30 for, and what moved since
the last section (new on page one, up or down five or more). Read it before choosing, every run: a
phrase at 4 to 20 is the best kind of change there is.

**Link prospects (Mondays).** Links are what holds the site back most: the makers that rank for our
phrases have 49–111 linking sites, we have 1 (KEYWORDS.md, "Link gap"). For each maker in that
section's list (2-luv.com, lettersbyheart.com, qlovy.com, digitalloveletters.com, lovepaper.app,
surprises.gift, aiskyla.com, giftsqr.com, lovepage.io, giftfeels.com, gifft.me, digibouquet.org,
sendvirtualgift.com, and any maker that has started outranking us), get the followed backlinks first
seen in the last 14 days (`backlinks/backlinks/live`, SEO-DATA.md; about $0.03 a maker). Keep the
pages a person could ask to be added to: comparisons, gift guides, roundups, "best X" lists and
resource pages in English or Spanish, spam score under 30. Skip directories, automatic profiles,
forums, link farms and anything that asks for payment. Add each new one at the top of
`docs/blog/link-prospects.md`: the date, the page and its title, which makers it links to, why
Ethos belongs there in one line, and a contact if the page shows one. Never list a page twice. This
routine never contacts anyone: a person drafts each pitch, and it goes out only with the owner's yes.

**AI answers (Thursdays).** For the ten buyer questions in KEYWORDS.md's "AI answers" table, ask
ChatGPT with web search, as a US user would (`ai_optimization/chat_gpt/llm_scraper/live/advanced`,
about $0.004 a question). Add a dated section to `docs/blog/ai-answers.md`: per question, whether
Ethos is named (and where in the list), the brands named, and the pages cited. A cited page that
compares makers and leaves Ethos out goes to `link-prospects.md` too. When an answer cites a page of
ours, note which: those pages are worth keeping sharp.

## 2. Choose this run's one change

Take the first open item in `docs/blog/seo-backlog.md` that this routine can do. If there is none,
pick from the data, in this order of value. Start every run by pulling Search Console for the last
28 days, query by page (SEO-DATA.md, free): it is Google's own record of how our pages do, and it
comes before any estimate. Leave the brand searches out first (SEO-DATA.md): the name and its typos
show /gifts and /templates as sitelinks thousands of times, which looks like "seen but not clicked"
and isn't. Then pull the sales report (`/api/internal/sales`, SEO-DATA.md, free):
which pages the buyers of the last 7 and 28 days first landed on, and from where. Between two
candidates of the same kind, take the one on a page that sells to searchers (channel `search`), or
one that can send searchers to such a page. Never write sales, orders or money into the repository,
the diary included (the mirror is public): say that a page "sells to searchers" and leave it there.

1. **Seen but not clicked (Search Console).** A blog post with 100 or more impressions whose click
   rate is far below what its position usually earns (as a rough guide: under 10% at positions 1
   to 3, under 2% at 4 to 10). The page is shown and passed over: rewrite its title and description
   so they say what the searchers typed and why this page answers it better, keeping its keyword.
2. **Striking distance (Search Console).** A search with 20 or more impressions in 28 days where our
   post averages 4 to 20: give that post what the pages above it give, for that exact search (the
   same work as "close to page one" below, chosen from Google's own numbers).
3. **Close to page one.** A blog post ranking 4 to 20 for a phrase with real searches. Get that
   phrase's top 10 (with the AI overview and "People also ask"), see what the pages above ours give
   that ours doesn't, and give it: a missing section, every "People also ask" question answered in
   the FAQ, a table or sample lines, a title and description that say the phrase the way people
   type it.
4. **The wrong target.** A post Search Console shows getting impressions for searches other than its
   keyword: aim it at what people actually search (keyword ideas around it), without repeating
   another post's search. Searches with impressions that no post answers well go into the queue.
5. **The web of links.** A post that few others link to: add genuinely useful links to it from two
   or three related posts, and from it to the template and occasion pages it mentions.
6. **The queue.** Re-order `docs/blog/queue.json` by real searches, difficulty and intent, add the
   best opportunities from `docs/marketing/KEYWORDS.md`, and drop topics whose searchers want
   something else. (This counts as the day's change.)
7. **A page audit.** Audit two recent posts (`on_page/instant_pages`) and fix what it finds inside
   the post: alt text, a description that's too long, a missing link.

Site pages (templates, occasions, `/gifts`) that Search Console shows seen but not clicked, or in
striking distance, go to the backlog's "For a person" with the numbers: this routine changes only
the blog.

Never two of these in one run, and never the same post twice within 14 days (the diary says when
each was last touched).

## 3. Make the change

Only inside `src/content/blog/`, `public/blog/` and `docs/blog/`: anything else stops every post
behind it from going live. Everything else on the site (templates, occasion pages, `/gifts`,
titles of non-blog pages) is a person's job: when the data says one of those should change, add it
to `docs/blog/seo-backlog.md` under "For a person" with the numbers, and choose a blog change for
today instead.

Write it to `docs/blog/VOICE.md`: no filler, no invented facts, both languages when the post has
Spanish. A post you change in what it says gets `updated` set to today; links added to it alone
don't change `updated`.

## 4. Check it like a new post

Run `docs/blog/PLAYBOOK.md` step 5's checks (the tests, lint, type check, build and the HTML checks).
For a post whose words changed, run the review panel in `docs/blog/RUBRIC.md` on the new version,
giving the search competitor the data from step 2, and write the rounds to
`docs/blog/reviews/refresh/<slug>-<YYYY-MM-DD>.json` in the same format as a new post's record (the
test checks it ends 10/10/10, in at most five rounds). Publish nothing that doesn't get there; put
the item back in the backlog with what the panel said.

## 5. Write it down

Add today's entry at the top of `docs/blog/seo-diary.md`:

```markdown
## YYYY-MM-DD: <the change in a few words>
- **Page:** /blog/<slug> (or the queue)
- **Why:** <the data: phrase, monthly searches, difficulty, our position before, what the top
  results have that we didn't>
- **What changed:** <one to three lines>
- **Panel:** 10/10/10 after N rounds (or "links only, no panel")
- **Cost:** $0.0X; balance $X.XX
- **Check on:** <date two to three weeks out> whether <the phrase> moved
```

On the "check on" date, the routine that reads it says in that day's entry whether it worked, with
Search Console's numbers for that page: the 14 days before the change against the latest 14
(`page=/blog/<slug>`, `start` and `end`), for its target search and in total with brand searches
left out: impressions, clicks, average position. A change that didn't move anything is worth knowing too: say so, and what to try
next.

## 6. Publish

As `docs/blog/PLAYBOOK.md` step 6: one commit as Haralds (`seo: <the change in a few words>`)
containing the change, its review record, the diary, `docs/blog/seo-log.md`, and the backlog or
ranks if they changed. Push to the mirror's `main` (`git push origin HEAD:main`, never force); the
live repository's Publish blog workflow takes it live within hours.

## 7. Report

Push one notification: `SEO: <the change in a few words>`. The final message, for the owner's
phone: the change, the page, why (one line with the numbers), the cost and the balance, and one line
if anything was skipped or failed.

## The routine

"Daily SEO change · tryethos.io", `trig_01Kxk3N29yi2z3RiR6oqc3qz`
(claude.ai/code/routines/trig_01Kxk3N29yi2z3RiR6oqc3qz), created 13 Nov 2026: cron `40 4,16 * * *` UTC
(between the blog routine's runs at 06:17, 10:17, 14:17 and 18:17, so the two rarely push at once), cloud environment `env_01UBHAFBBGo6aRJ57b9E4GRW`
("Default"), model claude-opus-5-5, tools Bash, Read, Edit, Write, Glob, Grep, Task, WebFetch,
WebSearch and PushNotification, source `ViesulisHaris/ethoslove` (the mirror). Its prompt points
here and sums up the rules above, so changing this file changes the routine.

The environment needs, besides what the other routines use: `api.dataforseo.com` in its allowed
domains, and a network secret for that host, header `Authorization`, value `Basic <the base64 key
from DataForSEO's API Access page>`. Without them `scripts/seo/dfs.sh` exits 2 and the routine
stops with a notification. For Search Console it also needs a Bearer network secret for
`tryethos.io` holding the same value as Vercel's `GSC_EXPORT_KEY` (the owner's helper
`setup-gsc-key.cmd` makes one); Vercel also needs `GSC_SERVICE_ACCOUNT_JSON`, the key file of a
service account added to the Search Console property as a restricted user. Without them
`/api/internal/gsc` answers 401 or 503 and the routine goes on without Search Console.

## Never

- Never more than one change a run, never anything outside the three blog folders, never a post
  deleted or renamed (its address is what ranks).
- Never chase a phrase whose searchers want something Ethos doesn't make, and never stuff a phrase
  into a post: write for the person searching.
- Never invent facts, numbers, reviews or customers, and never claim something Ethos doesn't do.
- Never spend past the run's budget, never top up or buy anything, and never contact a site or a
  person: link prospects are a list for the owner.
