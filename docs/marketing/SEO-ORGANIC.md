# Organic search: from brand-only to 2–4K visitors a day

Written 24 Oct 2026 from Google Search Console (read in Brave, nothing changed there), live Google
results, Google's own search suggestions and an audit of the site. The goal, in the owner's words on
24 Oct: **at least 2–4K organic visitors a day from search**, and to be first for "digital gift" and
anything relationship-shaped.

## Where we are

| | |
|---|---|
| Search Console data since | 18 Sep 2026 (the "16 months" view shows the same five weeks) |
| Clicks, 18 Sep – 22 Oct | **7.4K** (≈ 210 a day on average) |
| Impressions | **10.7K**, average position 2.9, CTR 69% |
| Share of clicks that searched the brand | **~99%** (tryethos, tryethos. io, try ethos, typos) |
| Clicks a day lately | 23–90, with spikes on TikTok hit days (1,651 on 21 Sep, 884 on 2 Oct, 359 on 21 Oct) |
| Non-brand searches that showed the site at all | a handful: "digital gifts" 6 impressions (position 9), "digital gift template" 10, "regalos digitales" 11, "date ideas" 22 |
| Devices | mobile 6,621 clicks, desktop 683, tablet 131 |
| Top countries (clicks) | India 1,729 · US 1,245 · UK 660 · Germany 247 · Romania 240 · Philippines 215 · Italy 202 · Spain 195 · Canada 186 · Netherlands 144 |

So the "good traffic" is people who saw a TikTok and typed the name. A CTR of 69% at position 2.9 is
what brand traffic looks like. Searches that don't contain the name bring almost nothing: today
organic search *finds* the site, it doesn't *send* anyone to it.

The page report says the same. /templates (4,052 impressions), /pricing (3,568), /templates/the-letter
(2,767) and /gifts (2,752) are the sitelinks under a "tryethos" result, not pages ranking on their own.

Two smaller things in the queries:
- **People screenshot the TikTok and ask Google.** "what website is that?", "can u give me the link",
  "send the link", "which website" each reached the site: that is Google Lens / Circle to Search on a
  TikTok video. The visible domain in the slides is doing its job.
- **People check whether it's safe.** "is this website safe", "is it safe", "will it hack me"; and
  scamadviser.com's page on tryethos.io is the 7th result for "tryethos".

## Why "digital gift" isn't won

In order of weight:

1. **No authority.** Search Console's Links report counts **8 links from other sites, all from two
   scam checkers** (scamadviser.com 7, gridinsoft.com 1). Not one real site links to Ethos. Google
   ranks a page for a contested search when other sites vouch for it; with no links it gives the site
   its own name and little else. The indexing report shows the same thing from the other side: Google
   has **discovered 45 pages and not bothered to crawl them** (city date pages, trips, five newer
   templates), which is what low authority looks like. Nothing on the site fixes this alone.

2. **The pages didn't use the words people type.** A template page was titled "Bouquet: digital gift
   template". Nobody searches "Bouquet"; they search "digital bouquet maker". The homepage's title was
   "Gifts, date ideas and trips for couples" and its heading "Make them a gift…": the word "digital"
   wasn't there. Every page that wins these searches has the exact phrase in its title.

3. **"digital gift" itself mostly means gift cards.** The US results are Amazon, Visa and Mastercard
   gift cards, a gift-card shop, Good Housekeeping's list and one Reddit thread. The searches Ethos can
   win are the next ones down, and they are winnable: they are led by **tiny single-page sites**.

   | Search (Google, US, 24 Oct) | Who wins it |
   |---|---|
   | digital gift for boyfriend | Etsy, Reddit, digiflower.net, 2-luv.com, Pinterest, gifft.me, qlovy.com, ourgiftverse.com, giftsqr.com |
   | online love letter | gifft.me, digitalloveletters.com, lovepaper.app, 2-luv.com, digitalbouquet.org, lettersbyheart.com, openwhen.cards, shareloveletters.com |
   | digital bouquet | digitalbouquet.org, digibouquet.net, digibouquet.app, digibouquet.cc, a Reddit post, thebouquet.me, attachedapp.com |
   | digital birthday gift | American Greetings, aiskyla.com, Reddit, gifft.me, Good Housekeeping, 2-luv.com, Hallmark eCards, Paperless Post |
   | would you rather questions for couples | trycandle.app's blog, Refinery29, Teen Vogue, BuzzFeed, lovebae.app's game page |
   | long distance relationship gifts | Amazon, Uncommon Goods, CNN, The Knot (physical gifts) |

   Each of those small sites has one page whose title is the search. Ethos has a better product for
   every one of them and, until today, no page that said so.

4. **Thin pages.** The game pages held only the game: no text a search engine could read. The FAQ
   answers on the occasion pages and /gifts weren't in the HTML at all (the accordion only renders an
   answer once it's tapped open). A template page had about a hundred words.

5. **Trust and a shared name.** tryethos.app is a different "Ethos" (a journaling app) and shows up
   under the brand search; the only sites linking to us are scam checkers.

What's fine: the sitemap (read by Google on 23 Oct, 264 pages), robots.txt, canonicals, hreflang and
redirects (http and www both redirect). Of the 217 pages not indexed, 58 are only video previews,
fonts and icons, 57 are the demo pages (noindex on purpose) and 37 are the editor (blocked on
purpose). Core Web Vitals: not enough Chrome traffic for Google to report.

## What changed on 24 Oct (live)

- **54 template pages, each found by its own search, in English and Spanish.** Each page now leads with
  the phrase people type, taken from Google's own suggestions: "Digital love letter", "Digital bouquet
  maker", "Virtual birthday card", "100 reasons why I love you", "Digital scrapbook", "Carta de amor
  digital", "Ramo de flores virtual"… That phrase is in the title, the snippet and the heading. Under
  the preview is a three-step "how to make one" built from the template's real features (photo count,
  music, countdown), three questions with their answers, and links to the templates for the same day.
  Source: `src/content/template-seo.ts`.
- **Seven new gift-idea pages by recipient**, /gifts/for-boyfriend, -girlfriend, -husband, -wife,
  -best-friend, -mom and -dad, each in English and Spanish (14 pages). Each is a list of 7–10 ideas
  in which every idea is a template with a live demo, then what to write, when to send it and three
  questions. They are linked from every page's footer. Source: `src/content/recipients.ts`.
- **The game pages list every free question**: 45 would-you-rather questions, 36 questions to ask
  your partner, 24 truths and dares, and the how-well-do-you-know-me quiz. Their titles now say what
  people search ("Would You Rather Questions for Couples", "Questions to Ask Your Partner", "¿Cuánto
  me conoces? Test para parejas"). The paid packs stay paid.
- **The homepage is "Digital gifts that open like a story"** in its title and description, and the
  heading opens with "Digital gifts, made by you". /gifts is "Virtual gifts that open like a story".
- **FAQ answers are in the HTML** on the occasion pages and /gifts (a `<details>` list instead of the
  accordion; it looks and behaves the same).
- **The legal pages have a canonical and hreflang**, like every other page.
- **llms.txt** names each template's search phrase and lists the gift-idea pages, so AI assistants
  can recommend the right page.
- **`scripts/seo-check.mjs`** reads every page in the sitemap the way a crawler does (status, title,
  description, one h1, self-canonical, hreflang, JSON-LD) and fails on any problem. Its first run,
  on the new build, passed 266 of 278 pages; the 12 failures were the six legal pages (fixed in the
  same change) and six Spanish date and trip titles over 70 characters (left as they are).

## The math to 2–4K a day

There is no keyword-volume tool on this machine, so these are estimates from the shape of the
results and Google's suggestions, not measured volumes. Before betting money on any line, get real
numbers from Google Ads' Keyword Planner (free with an Ads account) or an Ahrefs/Semrush trial.

| Cluster | What it takes | Plausible at 6–12 months, with links |
|---|---|---|
| Template "maker" searches, EN + ES (digital bouquet, online love letter, virtual birthday card, digital scrapbook, 100 reasons…) | the pages shipped today, plus links | 500–1,300 a day |
| Couples questions and games (would you rather, questions to ask your boyfriend, truth or dare, how well do you know me) | longer free lists (150+), links; very high volume, big publishers compete | 500–1,500 a day |
| Gift ideas by person and occasion (digital gift for girlfriend, long-distance gifts…) | the new pages, blog posts, links | 200–600 a day |
| Date ideas by city | the 31 city pages already there; Google hasn't crawled many of them yet | 300–1,000 a day |
| Spanish (regalo digital para mi novia, carta de amor digital gratis, ramo de flores virtuales) | the Spanish pages shipped today; Latin American demand is large | 300–1,000 a day |

Together that reaches 2–4K a day **only with authority**. Without links, expect the long tail to bring
a few hundred a day at most. Links are the constraint, not the pages.

## Second round, 24 Oct: the owner's decisions

The owner: "we need to be under digital gift on the top"; links are Claude's to do; no trust work;
the blog must run from the cloud by itself; a digital product has no returns; Bing is signed in.

- **/gifts is now the page for "digital gift"** (live, commit 16682b5). Its title is "Digital Gifts:
  Make a Free, Personal One Online" (Spanish: "Regalos digitales: crea uno gratis y personal online"),
  "Digital gifts" opens its heading, and after the occasions it says what a digital gift is (the
  answer Google can quote), lists 30 digital gift ideas in five groups with the search phrase of
  each as the link, and links the gift-idea pages by person. Five digital-gift questions lead its
  FAQ. The homepage's gifts door, the footer and the gift-idea pages' breadcrumb now link to it as
  "Digital gifts". The two pages that hold that search today are a "free digital gift, create it
  online" page and a "send free virtual gifts" homepage; this is both, with real templates behind it.
- **Merchant listings**: every template offer, and the Organization, now say returns aren't
  permitted and delivery is instant and free. The two warnings on all 41 listings should clear as
  Google recrawls them.
- **The blog publishes from the cloud, with no key to set up.** The daily routine (06:17 UTC,
  re-enabled, first run 25 Oct) writes the post and commits it to the public mirror's main. The live
  repository's Publish blog workflow reads the mirror at 10:00 and 16:00 UTC (it's public, so no key),
  checks the new commits with `scripts/blog-guard.mjs` (only the blog's files, posts that are plain
  data, the team's author), runs the blog tests and the type check, pushes with its own token
  (Vercel deploys it) and tells IndexNow. The routine never gets access to the live repository.
- **Links**: everything is in `docs/marketing/LINK-KIT.md`. Claude can't create accounts, and Reddit
  is blocked for it, so the directories wait on a ten-minute sign-up by the owner; after that Claude
  fills them in. The Pinterest signed in on Brave is the owner's personal account, so nothing was
  pinned.
- **Bing** still shows its sign-in screen in Brave (Microsoft, Google or Facebook); signing in is the
  owner's click.
- **Tested end to end on the live site, 24 Oct:** a harmless commit (`docs/blog/how-posts-go-live.md`)
  went onto the mirror's main only; Publish blog found it, passed the guard, fast-forwarded the live
  main to the same commit (4630d37), ran 21 tests and the type check, pushed, and Vercel deployed it.
- **Indexing requested** in Search Console for /gifts, /gifts/for-girlfriend, /gifts/for-boyfriend,
  /, /templates/the-letter, /templates/bouquet, /es/gifts, /games/rather, /es/templates/the-letter
  and /es/gifts/for-girlfriend (about the daily limit), and the sitemap resubmitted: Google's count
  of discovered pages went from 264 to 275 at once. IndexNow has all 278 URLs.

## Fourth round, 24 Oct: "do everything at the most"

The owner signed up to directories for an earlier site and saw nothing from it, and asked for
everything to be done here instead. Directories are dropped; the work went where rankings come from.

- **The long lists people search for** (commit 94af935): 150 free would-you-rather questions (from
  45) and 96 questions to ask your partner (from 36), playable and listed in full on
  /games/rather and /games/deck in both languages. A free question deck now deals a round of
  twelve from the whole deck, so a sitting still ends at the gift and next-game screen.
- **Two posts a day**: the routine runs at 06:17 and 12:17 UTC (first run 24 Oct, 12:17), and the
  playbook allows two a day. Posts link /gifts as "digital gift(s)" and the matching gift-idea
  page. The queue leads with the biggest searches (reasons why I love you, cute things to say to
  your boyfriend, how to write a love letter, open when letters) and two comparison posts
  (best website to make a love letter online, best digital gift websites). In this niche the
  comparison results are the makers' own "best websites" lists, each ranking itself first; a fair
  table from each site's own pages can beat them.
- **What links are left**: the sites that take guest posts openly are general link farms whose links
  Google discounts. The editorial lists that matter (iDrop News' best digital gifts, SELF and CNN's
  long-distance gifts) take a pitch from a person, so they need the owner's yes and address.

## What's next, ranked

### Needs the owner

1. **Sign up on AlternativeTo, Product Hunt, PeerPush and SaaSHub** (Google sign-in), then say so:
   the listings are written and Claude submits them (`LINK-KIT.md`).
2. **Pitches**: say yes to each gift-guide email in `LINK-KIT.md` before it goes out from your address.
3. **Pinterest**: an Ethos business account, or a yes to pin from the personal one.

### Can be done in the repo next

4. **Longer free question lists** on the game pages: 150+ would-you-rather and 100+ questions to ask
   your partner. Those searches are answered by lists of that length.
5. **A free love letter writer page** ("love letter generator", "online love letter maker free"):
   the editor's writing help as a page of its own. It costs API money per use and needs rate limits,
   so it needs the owner's yes.
6. **The 45 discovered-but-not-crawled pages** (dates, trips): link them from the homepage and the
   related templates so crawlers reach them sooner. Links from outside matter more.
7. **Six Spanish date and trip titles** over 70 characters: shorten them.

### On "first for digital gift"

The page is now the best answer on the site, and every internal link points at it with those words.
Position 1 for a two-word search whose results are Amazon and Visa gift cards also takes authority:
links from other sites, which is what step 2 and the kit are for, and time (Google re-ranks a page
over weeks, not days). Expect movement on the long phrases first ("digital bouquet maker", "carta de
amor digital"), then on "digital gift ideas", then on "digital gift".

## How to tell if it's working

Re-read Search Console on **7 Nov, 21 Nov and 19 Dec 2026** (Performance → Search results → + New →
Query → *Doesn't contain* "ethos"), and compare with today's baseline, which is close to zero:

- **Non-brand impressions a day**: from ~70 now. Expect the first movement in 1–3 weeks as Google
  recrawls the changed titles.
- **Positions for the template phrases**: digital bouquet maker, online love letter, digital love
  letter, virtual birthday card, carta de amor digital, ramo de flores virtual. Today none of these
  show the site; top 20 within a month would be on track, top 5 needs links.
- **Impressions for /gifts/for-*** pages and the game pages.
- **External links** in the Links report: from 8 (all scam checkers) to the first 20 real sites.

`node scripts/seo-check.mjs` checks the pages themselves at any time.
