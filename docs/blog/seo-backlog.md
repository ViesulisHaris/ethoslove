# SEO backlog

What the daily SEO routine (`docs/blog/SEO-AGENT.md`) works through, best first. It takes the first
open item it can do, ticks it with the date, and adds new items when the data shows them. Positions
are from Google Search Console, 4–10 Nov 2026 (average place in Google); searches a month are from
DataForSEO, US unless marked, collected in `docs/marketing/KEYWORDS.md` (13 Nov 2026).

## For the routine (blog files only)

- [x] (2026-11-13) **monthiversary-ideas** is close to page one: "monthiversary" at 8.2 with 33 impressions a
  week and no clicks. Get its top 10 and questions, give the post what the top three have, and
  answer every "People also ask" question.
- [ ] **The queue.** The blog routine writes two posts a day from `docs/blog/queue.json`, and none of
  its 24 topics has a measured volume. Get US and Spain volumes and difficulty for every queued
  keyword (one keyword_overview call per market), order the queue by searches × how winnable for
  the right intent, drop topics with no measurable searches in either language (keep a dated
  occasion within ten weeks), and add the posts from KEYWORDS.md's "Blog: ten proposed topics":
  questions to ask your boyfriend (74,000, KD 0) and your girlfriend (40,500, KD 4) at the top, then
  virtual hug (8,100), love letter for girlfriend (2,400), long distance relationship tips (1,900),
  love coupons (1,300 a month, 4,400 in February, so live by early January), what to write in an
  anniversary card (880), happy monthiversary messages (590), paragraphs for your boyfriend (590)
  and birthday letter to boyfriend (590). Give **love-letter-to-my-boyfriend** the keyword "love
  letter for boyfriend" (2,400, UK 390), with "love letter message for him" (4,400) in its angle.
  Record `volume`, `volume_es` and `difficulty` on every entry. (KEYWORDS.md calls its topics a
  proposal only because the research session wasn't allowed to touch the queue; changing the queue
  is this routine's job, step 2.4 of SEO-AGENT.md.)
- [ ] **virtual-date-ideas-long-distance** aims at "virtual date ideas for long distance couples" (70
  a month). People search "date ideas for long distance" (5,400) and "virtual date ideas" (1,600, UK
  140). Get both top 10s, then aim the title, description and headings at them.
- [ ] **fortune-cookie-messages** (published 13 Nov) aims at "funny fortune cookie messages" (390).
  The head, "fortune cookie messages", gets 1,900 (UK 320): aim the title and description at it and
  keep the funny ones as a section. Link to it from the related posts.
- [ ] **reasons-why-i-love-you**: "reasons why i love you" (5,400) and "things i love about you" (1,600,
  5,400 in February). Its top 10 is the weakest of the big ones (Pinterest, an old personal page, a
  song, Reddit, one 2025 listicle). Make it clearly the best page there before February, with
  "things I love about you" answered in it.
- [ ] **open-when-letter-ideas**: the target is right (2,900); add "open when letters" (3,600, UK 880)
  to the title or description and the body.
- [ ] **how-to-write-a-love-letter**: 4,400, KD 1, plus "what to write in a love letter" (590). Get the
  top 10 and give the post what the top three have. Its Spanish side should lead with what Spain
  searches: "carta de amor" (5,400 in Spain), "cómo escribir una carta de amor" (170).
- [ ] **how-to-apologize-to-your-boyfriend** (Spanish version): Spanish searches like "como pedir
  perdon a mi novio por lastimarlo" sit at 4.8, others at 33–73 with many impressions. Make the
  Spanish version answer the exact Spanish phrasings people use.
- [ ] **6-month-anniversary-ideas**: "6 month anniversary gift" (1,600, UK 480) is searched more than
  "6 month anniversary ideas" (390). Add a short gifts section that answers it, keeping the ideas.
- [ ] **The Spanish side of every post**: 30 of the 41 Spanish targets get under 50 searches a month
  in Spain (KEYWORDS.md, "Spanish targets"). One post a day: ask keyword ideas for Spain's own
  wording (about $0.015 a post) and aim the Spanish title and description at it. First
  monthiversary-ideas (not before 27 Nov): Spain says "cumplemes" (480) and "mesiversario" (140),
  and its Spanish title still says neither. Link the together calculator
  (`/tools/how-long-have-we-been-together`) from it in the same change: the link test allows it now.

## For a person (outside the blog: a session on the owner's computer applies these)

Proposals from KEYWORDS.md, most urgent first; the season sets each deadline.

- [ ] **/occasions/christmas, before December**: "virtual christmas card" (1,600 a month, 14,800 last
  December) and "digital christmas card" (UK 720, 6,600 in December) are in neither its title nor
  its text.
- [ ] **/occasions/valentines, by early January**: add "virtual valentine" (2,900 a month, 33,100 in
  February).
- [ ] **/long-distance**: its title, "Long distance: meet halfway, date across time zones", matches
  nothing people search. "Long-Distance Relationship Gifts and Date Ideas" would cover "gift for
  long distance love" (2,900) and "date ideas for long distance" (5,400).
- [ ] **/templates/the-letter**: add "template", "generator" or "online" ("love letter template" 880,
  "love letter generator" 390, "online love letter" 260).
- [ ] **/templates/fortune-cookie**: "digital fortune cookie" at 5.6 with its first clicks: protect it
  and aim for the top three. "virtual fortune cookie" (320, UK 210) is searched more than "digital"
  (140); the title has only "digital".
- [ ] **/templates/scratch-card**: "scratch card maker" at 10.6 and "digital scratch card" at 23.5
  (35 impressions a week). The template page decides these, not a post.
- [ ] **/templates/bouquet**: "digital bouquet" at 11.8 (22 impressions a week). The flowers searches
  add up to 4,480 a month in the US and UK, "digital bouquet" is up 488% in a year, and its biggest
  month is February (3,600).
- [ ] **The owner's call: question pages.** "Questions to ask your boyfriend" (74,000) and
  "…girlfriend" (40,500) can be posts (the queue item above) or pages that open the deck game, but
  not both: they would compete for the same search.
- [ ] **A free virtual hug page** (8,100, UK 1,300): people searching it want something to send.
- [x] (2026-11-13) **Blog link check (`tests/unit/blog-posts.test.ts`, `STATIC_PATHS`)**: add
  `/tools/how-long-have-we-been-together`, so posts can link the calculator. The SEO review of
  monthiversary-ideas (13 Nov) wanted it beside the 29th–31st rule, since the tool shows the next
  monthiversary date; the test rejects any `/tools` link today.
