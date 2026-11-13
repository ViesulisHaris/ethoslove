# Search data from DataForSEO

The owner's DataForSEO account (opened 13 Nov 2026) gives the cloud routines real Google data: how
many people search a phrase, how hard it is to rank, what the searcher wants, who ranks now, what
Google's AI overview cites, and where tryethos.io itself ranks. It is pay-as-you-go: no
subscription, the balance never expires, and every call costs fractions of a cent to a few cents.

## How to call it

Only through `scripts/seo/dfs.sh`, from the repo root:

```bash
DFS_WHY="blog: <slug>" bash scripts/seo/dfs.sh <path> '<json body>'
```

The key is a network secret of the cloud environment (header `Authorization` for host
`api.dataforseo.com`); the proxy adds it, so it is never in the repo, a prompt or a log. The script
prints the JSON, logs the cost to `docs/blog/seo-log.md`, and exits 2 when DataForSEO can't be
reached, the key is refused or the balance is empty. **Exit 2 means: skip the data steps, carry on
the old way (WebSearch), and say "search data skipped" in the report.** Exit 3 is a bad request: read
the message, fix the body, try once more.

Markets: US is `"location_code": 2840, "language_code": "en"`; UK `2826, "en"`; Spain `2724, "es"`.
The English posts target the US first; the Spanish versions Spain.

## The calls

Responses wrap everything in `tasks[0].result[0]`. Read the JSON you get rather than trusting the field
paths below blindly: if one isn't there, look for it.

**Balance** (free; check it first in every run):
`appendix/user_data`, no body → `tasks[0].result[0].money.balance` (USD). Under $1: make no paid
calls, and say so in the report.

**Keyword ideas around a seed** (~$0.012 + $0.00012 a keyword):
`dataforseo_labs/google/keyword_ideas/live`,
`[{"keywords":["digital bouquet"],"location_code":2840,"language_code":"en","limit":100}]`
→ `items[]`: `keyword`, `keyword_info.search_volume` (a month), `keyword_properties.keyword_difficulty`
(0–100), `search_intent_info.main_intent` (informational, commercial, transactional, navigational).
`dataforseo_labs/google/keyword_suggestions/live` with `"keyword": "…"` gives longer phrases that
contain the seed.

**Volume, difficulty and intent for a list you already have** (~$0.01–0.03 for up to 100):
`dataforseo_labs/google/keyword_overview/live`,
`[{"keywords":["…","…"],"location_code":2840,"language_code":"en"}]`.

**Who ranks now, the AI overview and "People also ask"** (~$0.002):
`serp/google/organic/live/advanced`,
`[{"keyword":"digital bouquet","location_code":2840,"language_code":"en","device":"mobile","depth":10}]`
→ `items[]` by `type`: `organic` (`rank_absolute`, `domain`, `url`, `title`), `ai_overview` (look
for its `references[]`: the pages it cites), `people_also_ask` (`items[].title`: the questions),
and video, Reddit or shopping blocks.

**Where we really rank for one phrase** (~$0.006 for the top 30; the weekly rank check runs this
for every phrase in its list): `serp/google/organic/live/regular`,
`[{"keyword":"digital bouquet","location_code":2840,"language_code":"en","device":"mobile","depth":30}]`
→ the `items[]` of type `organic` whose `domain` is `tryethos.io`: `rank_group` is its place among
the organic results, `url` the page that ranks. None of them means not in the top 30.

**What DataForSEO's database has us ranking for** (~$0.012 + $0.00012 a keyword; once a week is
plenty; it sees little of a young site, so the check above is the real one):
`dataforseo_labs/google/ranked_keywords/live`,
`[{"target":"tryethos.io","location_code":2840,"language_code":"en","limit":200,"order_by":["keyword_data.keyword_info.search_volume,desc"]}]`
→ `items[]`: `keyword_data.keyword`, `keyword_data.keyword_info.search_volume`,
`ranked_serp_element.serp_item.rank_absolute`, `ranked_serp_element.serp_item.url`.

**A page audit** (a fraction of a cent): `on_page/instant_pages`,
`[{"url":"https://tryethos.io/blog/<slug>","enable_javascript":false}]` → `items[0].onpage_score`,
`items[0].checks` (true means the problem is there: missing alt text, no description, slow CSS, …).

## How to read the numbers (lessons the owner sent, 13 Nov)

- **Intent beats volume.** A big phrase whose searchers want something else is the wrong target: in
  the owner's example, "AI trading" (18,000 a month) wanted a tool, and "is AI trading legit?" (880,
  difficulty 9) wanted exactly the post. For us: if the top 10 for a phrase are gift-card shops or
  stores, people want a card, not a made gift, so pick the phrase whose searchers want to make
  something personal.
- **Low difficulty first.** Under about 30 we can reach page one with a good page; over 50 only with
  links we don't have yet.
- **The AI overview and "People also ask" are part of the page.** A post that answers every question
  Google lists, with first-hand specifics (what a template actually does, real sample lines), is
  what gets cited. When the overview cites videos or Reddit, note it in the report: those are
  places Ethos could appear too.
- **Spend like it's ours, but spend.** Check the balance first, keep a run under the budget its
  playbook gives, and never call the same thing twice in one run. Within the budget, buy the data
  that makes the decision better (the owner, 13 Nov: at least $1 a day where it helps): a second
  phrase's top 10, the questions, the UK or Spain as well.
