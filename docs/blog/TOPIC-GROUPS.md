# Topic groups: how the blog climbs to the big searches

The owner asked on 15 Nov 2026 how we get from the small searches we now show up for to the big
ones that bring people in. Google ranks a site for a topic when it covers that topic fully and its
pages on it point to each other; one-off posts on scattered subjects don't add up to that. So the
blog grows in five groups. Each has a **hub** (the page that should rank for the big search),
**members** that each answer one narrower search and point up to the hub, and **one free thing on
the site** that a list of ideas can't give: a game, the quiz, a template.

The numbers are DataForSEO's, US, 15 Nov 2026: monthly searches, difficulty (KD, 0–100) and, as
"sites", how many websites link to the pages ranking now, on average. That last one is the number to
watch: it is roughly the links a page needs to compete. We have about one. Under ~40 is reachable
with a strong group; hundreds means links first.

## The rules, for both routines

1. **Up to the hub, early.** A member links to its group's hub in its first third, with words close
   to the hub's search, and to one or two other members where that helps the reader.
2. **The hub links back.** When the hub is a blog post, the commit that publishes a member also adds
   it to the hub: a sentence or a list item that helps the hub's reader, never a bare list of links.
   Links alone don't change the hub's `updated`.
3. **Hubs the routines can't edit.** The quiz, the games, `/long-distance` and the template pages
   live outside the blog folders. When a member goes live, add a line under "For a person" in
   `docs/blog/seo-backlog.md`: "link /blog/<slug> from <hub>". The five language posts need no line:
   the quiz links each one by itself the day it's published (group 2).
4. **Use the free thing where it helps.** The questions are better played on two phones than read in
   a list; a language is better found with the quiz than guessed. Say so plainly, once, where it fits.
   Never as an ad.
5. **One search, one post.** If the hub or another member already answers a member's search, don't
   write it: make that page answer it better.
6. **The queue keeps this order** (each entry has a `"group"`) unless the topic check shows the
   searchers want something else. Refills take from "Members to write" first.

## 1. Questions for couples: the biggest searches we can reach

- **Hubs:** `/blog/questions-to-ask-your-boyfriend` (74,000 a month, ~4 sites) and
  `/blog/questions-to-ask-your-girlfriend` (40,500, KD 4, ~16 sites). Both live since 14 Nov.
- **Free thing:** the games, played on two phones: `/games/deck` (Question cards), `/games/know` (How
  well do you know me?), `/games/rather` (Would you rather?), `/games/dare` (Truth or dare, soft
  edition).
- **Members to write:** questions to ask your partner 22,200 (~5) · questions for couples 12,100, KD 8
  (one post that also answers "relationship questions" 12,100 and "couples questions game" 9,900) ·
  would you rather questions for couples 12,100 (~5) · questions to ask your crush 14,800, KD 1 ·
  deep questions to ask your boyfriend 4,400 · truth or dare questions for couples 4,400 · funny
  questions to ask your boyfriend 3,600 · deep questions to ask your girlfriend 2,900 · 21 questions
  for couples 1,900, KD 1 · flirty questions to ask your boyfriend 1,900 · funny questions to ask your
  girlfriend 1,900 · this or that questions for couples 1,600 · date night questions 1,300 · questions
  to ask your husband 1,000 · questions to ask your wife 720.

## 2. Love languages

- **Hub:** `/tools/love-language-quiz` ("love language test" 90,500, KD 19, ~450 sites: a long game
  that needs links). Blog hub to write: the 5 love languages (90,500, KD 26, ~354 sites).
- **Free thing:** the quiz, and the template it gives each language (`LANGUAGE_GIFTS` in
  `src/content/love-language-quiz.ts`): words → the-letter, time → picnic, gifts → bouquet, service →
  scratch-card, touch → xoxo. A member names the template its language gets and why it fits.
- **Members live:** words-of-affirmation (15 Nov; 49,500, KD 5, ~42 sites, also answers "words of
  affirmation examples" 6,600).
- **Members to write:** acts of service love language 9,900, KD 16 · physical touch love language
  4,400, KD 4 · quality time love language 3,600, KD 8 · gift giving love language 1,900, KD 2 (and
  "receiving gifts" 480: the search closest to what Ethos makes).
- **The quiz links them by itself:** each language's card on the quiz page, and the result for that
  language, link its post as soon as one is published under the slug in `LANGUAGE_POSTS`
  (`src/content/love-language-quiz.ts`): words-of-affirmation, quality-time-love-language,
  gift-giving-love-language, acts-of-service-love-language, physical-touch-love-language. Keep those
  slugs in the queue: a post under another slug gets no link. The blog hub (the 5 love languages)
  still needs a "For a person" line when it goes live.

## 3. Long distance

- **Hubs:** `/long-distance` (the free tools: the city halfway between you, the hours you're both
  awake) and `/blog/virtual-date-ideas-long-distance` (long distance date ideas 5,400 and 4,400).
- **Free thing:** the `/long-distance` tools and the two-phone games.
- **Members live:** long-distance-anniversary-ideas, long-distance-birthday-ideas-for-boyfriend,
  long-distance-christmas-gift-ideas.
- **Members to write:** long distance relationship gifts 2,400 (people buying, ~2 sites) · long
  distance relationship quotes 2,900, KD 9, ~3 sites (original lines to send; a quote from a real
  person only with their name, each one checked) · long distance relationship tips 1,900 · long
  distance relationship games 1,000 (with "games to play long distance" 480; the Spanish "juegos para
  parejas a distancia" belongs to the date-ideas post, see the backlog) · long distance gifts for
  boyfriend 1,000 and for girlfriend 590 (people buying).
- **Not yet:** "long distance relationship" 4,400 (KD 27, ~123 sites).

## 4. Love letters

- **Hubs:** `/templates/the-letter` ("love letter" 40,500, KD 25, ~33 sites: reachable once the group
  and a few links are there) and `/blog/how-to-write-a-love-letter` (4,400, KD 1).
- **Free thing:** The Letter, the free template.
- **Members live:** love-letter-for-boyfriend, love-letter-for-girlfriend ("love letter for her"
  2,900), love-letter-to-husband, anniversary-letter-to-boyfriend, christmas-letter-to-boyfriend,
  christmas-letter-to-mom, open-when-letter-ideas ("open when letters" 3,600),
  paragraphs-for-your-girlfriend, what-to-write-in-boyfriends-birthday-card.
- **Members to write:** paragraphs for him 1,900 · love letter to wife 590 · birthday letter to
  boyfriend 590.
- **Already done:** "love letter template" (880, ~4 sites) is the template page's own search, and its
  title says it since 13 Nov ("Digital Love Letter Template, Free with Photos and Music").

## 5. Reasons why I love you

- **Hub:** `/blog/reasons-why-i-love-you` ("100 reasons why I love you" 8,100, ~0 sites; "reasons why
  I love you" 5,400; "things I love about you" 1,600).
- **Free thing:** Jar of Reasons.
- **Members live:** cute-things-to-say-to-your-boyfriend and -girlfriend, the good morning and good
  night messages, thinking-of-you-messages-for-him.
- **Members to write:** love notes for him 2,900, KD 15 · love notes for her 1,900, KD 33.

## How we'll know it's working

The Monday and Thursday rank check covers every hub search above (`docs/blog/SEO-AGENT.md`, step 1),
and Search Console shows each group's searches with the brand left out. Expect the members first
(weeks), then the hubs (months, faster with links: the weekly link-prospect list is how we get
them). Re-plan when a hub reaches page one, or by 15 Jan 2027 at the latest.
