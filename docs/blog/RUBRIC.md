# The review panel: how a post gets to 10/10

Every post goes through this before it's published (`docs/blog/PLAYBOOK.md`, step 5). The test
checks what can be counted. The panel judges what can't: whether this is the best page on the web
for the search.

There are three readers. Each is a fresh subagent that hasn't seen the drafting, and each has one
job. They score, the writer fixes, then a new panel reads it again and checks the last round's
fixes. A post goes live only when all three give it 10.

## What the scores mean

- **10:** Nothing has to change. For this search, it's the page you'd send a friend instead of
  anything on the first page of results, and you can say in one sentence why.
- **9:** One or two small fixes: a sentence, a link, a heading.
- **7–8:** Useful, but generic in places, or missing something a current top result covers.
- **6 or below:** Wrong, thin, padded, or not the answer to the search.

**Fixes and polish.** A fix is something that has to change before the post goes out:
- an error;
- a line that misleads or confuses;
- something important that a top result covers and this post doesn't;
- a line that breaks `VOICE.md`.

Anything else that might make the post better is polish. List it, but it doesn't lower the score. A
new reviewer can always think of something to add, so if every idea counted, no post would ever
reach 10.

Scores are earned. A reviewer who gives less than 10 quotes the line responsible and writes the
exact fix. A reviewer who gives 10 says, in one sentence, what makes the post better than the top
results.

## Dealbreakers

Any one of these fails the post, whatever the scores:

- A factual error, or a claim about Ethos that the files listed in `docs/blog/VOICE.md` don't
  support.
- An invented statistic, study, quote, review or customer.
- A lead that doesn't answer the search.
- Advice that would mislead or embarrass the reader if they followed it.
- Sentences copied from another site.
- Spanish that reads like a machine translation.

## The three readers

### 1. The reader who searched for it

You typed the keyword into your phone, and you're planning this for someone this week. Read the
English post as that person.

- **answers:** Does the first paragraph answer what you searched? Does the post then answer the
  next three things you'd want to know?
- **usable:** Could you act on it tonight? Look for concrete steps, times, examples, and lines you
  would actually send.
- **trust:** Does the product appear where it helps, and honestly? Would you tap the template, or
  does it feel like an ad?

### 2. The editor and fact-checker

Read both languages. Check every factual claim against the code, not against the post:
- product facts against the files listed in `docs/blog/VOICE.md`;
- what each template does against `src/templates/<slug>/manifest.ts`, `schema.ts` and
  `Template.tsx`;
- scheduling and countdowns against `src/app/[locale]/(gift)/g/[shortId]/page.tsx`,
  `src/components/gift/scheduled-screen.tsx` and `src/components/editor/sections/extras.tsx`;
- that every link resolves;
- dates, times and anything else that can be checked.

Return the claims you checked in a `verified` list, each with the file that settles it.

- **accuracy:** Every claim is true and supported. Any error is a dealbreaker.
- **voice:** Specific, warm and plain, with no filler and nothing that sounds machine-written. It
  follows `VOICE.md` and works for US and UK readers alike.
- **spanish:** Natural Spanish from Spain, the same post as the English, with nothing lost or added.

### 3. The search competitor

Search the keyword and one or two variants with WebSearch, and compare the post with what ranks on
the first page now. Then look at the post as a search result.

- **better:** What does this post give that the top results don't, such as real examples, a
  schedule, lines to borrow or a table? If a top result covers something important that this post
  doesn't, name it.
- **search:** Check five things:
  - the title and description make the right person tap;
  - the post matches the intent behind the search;
  - the headings use the words people search with;
  - the internal links are ones a reader would follow;
  - nothing overlaps an existing post or occasion page.

## What each reviewer returns

```json
{
  "reviewer": "reader | editor | search",
  "scores": { "answers": 9, "usable": 10, "trust": 10 },
  "overall": 9,
  "dealbreakers": [],
  "fixes": [{ "where": "the exact current text", "change": "the exact new text", "why": "one line" }],
  "polish": [{ "where": "...", "change": "...", "why": "..." }],
  "keep": ["what works and must survive the edit"]
}
```

For an addition, `where` is the sentence it goes after.

The criteria are `answers`, `usable` and `trust` for the reader; `accuracy`, `voice` and
`spanish` for the editor; `better` and `search` for the search competitor.

## The loop

1. Start the three reviewers in parallel with the Agent tool. Tell each which reader it is (its
   section above), not to edit any file, and to return only the JSON below. Give each:
   - this file and `docs/blog/VOICE.md`;
   - the post's file;
   - the keyword;
   - the list of existing posts.
2. Apply every fix that is right. Reject a fix only if it would introduce an error, and say why in
   the record. Take polish only where it clearly makes the post better without padding it.
3. Run the checks in step 5 again. Then start a fresh panel (new subagents) on the new version.
   Also give each new reviewer the last round's review from its own role. It checks that each of
   those fixes was made, and made correctly, then reads the whole post as round one did.
4. Publish when all three overall scores are 10, no criterion is below 9, and there are no
   dealbreakers. Publish the version they passed: polish from the final round goes in the record,
   not into the post, because an unreviewed edit could undo a 10.
5. At most three rounds. If round three still isn't there, don't publish that post:
   - Move it to the end of the queue with the reviewers' notes, and try the next topic once.
   - If that one fails too, publish nothing today and say why in the report.

## The record

Write `docs/blog/reviews/<slug>.json` and commit it with the post:

```json
{
  "slug": "...",
  "keyword": "...",
  "rounds": [
    {
      "round": 1,
      "reviews": [
        { "reviewer": "reader", "scores": { "answers": 9, "usable": 10, "trust": 10 }, "overall": 9, "dealbreakers": [], "summary": "..." }
      ],
      "applied": ["what changed"],
      "rejected": ["fix and why"]
    }
  ]
}
```

Copy each reviewer's `scores`, `overall` and `dealbreakers` exactly as returned. In place of the
fixes, `summary` says in a few lines what the reviewer asked for, or, for a 10, the one sentence on
why the post beats the top results.

`tests/unit/blog-posts.test.ts` checks that every post has a record and that its last round is
10/10/10, with no criterion below 9 and no dealbreakers.
