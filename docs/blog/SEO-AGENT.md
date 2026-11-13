# The daily SEO improvement

A cloud routine runs this once a day, with every computer off: **one** change to tryethos.io that
real search data says will help it rank, made carefully, checked like a new post, written down with
the reason, and live within hours. It is the owner's answer to "each day new things, so we finally
start ranking" (13 Nov 2026), modelled on an agent that made one small change a night and kept a
decision diary.

Small and steady: one change a day, nothing rushed, nothing that can break the site. The blog
routine (`docs/blog/PLAYBOOK.md`) writes new posts; this one makes what already exists rank better.

Read `docs/blog/SEO-DATA.md` (how to get search data and what the numbers mean), `docs/blog/VOICE.md`
and `docs/blog/RUBRIC.md` before starting. Budget for a run: $0.25 of DataForSEO credit.

## 0. Start clean

Exactly as in `docs/blog/PLAYBOOK.md` step 0 (fetch, reset to `origin/main`, `npm ci`). If
`docs/blog/seo-diary.md` already has an entry for today (UTC), stop: today's change is made.

Check the balance (`appendix/user_data`). Under $1: make no paid calls, push the notification
`SEO: DataForSEO balance is $<balance>, top it up to keep the daily changes going`, and end. If the
script exits 2 (no access), push `SEO: no search data (DataForSEO unreachable from the cloud)` and
end: without data this routine has nothing to go on.

## 1. Know where we stand (Mondays, or when `docs/blog/seo-ranks.md` is over 7 days old)

Get where tryethos.io ranks in the US (`ranked_keywords`, 200 keywords). Add a dated section to
`docs/blog/seo-ranks.md`: the 40 keywords with the most searches, with position, page and monthly
searches, and what moved since the last section (new on page one, up or down five or more). Read
it before choosing, every day.

## 2. Choose today's one change

Take the first open item in `docs/blog/seo-backlog.md` that this routine can do. If there is none,
pick from the data, in this order of value:

1. **Close to page one.** A blog post ranking 4 to 20 for a phrase with real searches. Get that
   phrase's top 10 (with the AI overview and "People also ask"), see what the pages above ours give
   that ours doesn't, and give it: a missing section, every "People also ask" question answered in
   the FAQ, a table or sample lines, a title and description that say the phrase the way people
   type it.
2. **The wrong target.** A post with many impressions but no clicks, or ranking for a phrase other
   than its keyword: aim it at what people actually search (keyword ideas around it), without
   repeating another post's search.
3. **The web of links.** A post that few others link to: add genuinely useful links to it from two
   or three related posts, and from it to the template and occasion pages it mentions.
4. **The queue.** Re-order `docs/blog/queue.json` by real searches, difficulty and intent, add the
   best opportunities from `docs/marketing/KEYWORDS.md`, and drop topics whose searchers want
   something else. (This counts as the day's change.)
5. **A page audit.** Audit two recent posts (`on_page/instant_pages`) and fix what it finds inside
   the post: alt text, a description that's too long, a missing link.

Never two of these in one day, and never the same post twice within 14 days (the diary says when
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

On the "check on" date, the routine that reads it says in that day's entry whether it worked.

## 6. Publish

As `docs/blog/PLAYBOOK.md` step 6: one commit as Haralds (`seo: <the change in a few words>`)
containing the change, its review record, the diary, `docs/blog/seo-log.md`, and the backlog or
ranks if they changed. Push to the mirror's `main` (`git push origin HEAD:main`, never force); the
live repository's Publish blog workflow takes it live within hours.

## 7. Report

Push one notification: `SEO: <the change in a few words>`. The final message, for the owner's
phone: the change, the page, why (one line with the numbers), the cost and the balance, and one line
if anything was skipped or failed.

## Never

- Never more than one change a day, never anything outside the three blog folders, never a post
  deleted or renamed (its address is what ranks).
- Never chase a phrase whose searchers want something Ethos doesn't make, and never stuff a phrase
  into a post: write for the person searching.
- Never invent facts, numbers, reviews or customers, and never claim something Ethos doesn't do.
- Never spend past the run's budget, and never top up or buy anything.
