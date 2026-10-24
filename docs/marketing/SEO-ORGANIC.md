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

## What's next, ranked

### Needs the owner (off-site)

1. **Get real sites to link to Ethos.** This is the one thing that moves every number above.
   - **List it where these searches already look**: Product Hunt (a launch day brings links and a
     ranking page), AlternativeTo (as an alternative to Canva for gift pages, to gifft.me and the rest),
     SaaSHub, Indie Hackers, BetaList.
   - **Answer the Reddit threads that rank** for these searches (r/Gifts "digital gift ideas",
     r/LongDistance "gift ideas for an online gf", r/LDR's digital bouquet thread). Answer as the
     maker, openly, with a link to the matching page.
   - **Christmas gift guides are being written now**, and Valentine's guides from December. Pitch
     "digital gifts for long-distance couples" to the sites that rank for it (CNN Underscored, The
     Knot, Good Housekeeping's "best digital gifts", endlessdistances.com, couples blogs).
   - **Pinterest**: idea pins of the template previews linking to each template page. Pinterest
     already ranks for "digital gift ideas" and "virtual gift ideas for boyfriend".
   - **YouTube** (@tryethos exists): a short per template, with the template page in the description.
   - Note: the "Made with Ethos" link on free gifts doesn't help search, because gift pages are
     private and blocked from crawlers. That is right for privacy; don't change it.
2. **Trust.** A Trustpilot page and a short review request after purchase; an About page naming
   SIA MIGLAI, Riga, and how payment and refunds work. Both answer "is this website safe" and stand
   against the scam-checker pages.
3. **A blog cadence that publishes.** The daily blog routine is off because cloud runs can only push
   to the mirror. If Adrian gives the Claude GitHub app access to reasj2/ethoslove, a routine can
   publish 3–5 posts a week targeting the searches the pages can't hold: "100 reasons why I love you"
   (with the jar), "open when letters ideas", "love letter for boyfriend examples", "what to write in
   an anniversary card", "long distance birthday ideas", each in Spanish too.
4. **Decide the Merchant listings markup.** Google reads the 41 template product pages as merchant
   listings and asks for a return policy and shipping details. Unlocks lose the 14-day withdrawal
   once delivered (with consent at checkout), and the 30-day guarantee only covers a gift that won't
   open. Marking that up honestly means "returns not permitted" plus a defect policy, which Google may
   show to shoppers. That is a commercial choice, so it was left out. Leaving it is only a warning.
5. **Bing Webmaster Tools** isn't signed in on Brave; sign in once so its data can be read. ChatGPT
   search and Copilot use Bing.
6. **Search Console**: once the new pages are live, use URL Inspection → Request indexing for
   /gifts/for-girlfriend, /gifts/for-boyfriend, /templates/the-letter and /templates/bouquet. This
   wasn't done without asking.

### Can be done in the repo next

7. **Longer free question lists** on the game pages: 150+ would-you-rather and 100+ questions to ask
   your partner. Those searches are answered by lists of that length.
8. **A free love letter writer page** ("love letter generator", "online love letter maker free"):
   the editor's writing help as a page of its own. It costs API money per use and needs rate limits,
   so it needs the owner's yes.
9. **The 45 discovered-but-not-crawled pages** (dates, trips): link them from the homepage and the
   related templates so crawlers reach them sooner. Links from outside matter more.
10. **Six Spanish date and trip titles** over 70 characters: shorten them.

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
