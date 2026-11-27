# Ecard pages: the log

Newest first. Written by the routine in `docs/ecards/PLAYBOOK.md`; one entry a run.

## For a person

- **2026-11-27: `tests/unit/ecard-pages.test.ts` blocks every page whose slug sorts before "christmas-ecards"** (birthday-ecards, anniversary-ecards, animated-ecards in the queue). The test "the guard lets the routine's files through and nothing else of the site" takes `files[0]` as its sample and checks that changing `"christmas-ecards"` in it to a template string is refused; in any other page there is no `"christmas-ecards"` to change, so `ecardProblem` returns null and the test fails. The fix is to read `christmas-ecards.ts` by name there instead of `files[0]`. The routine may not change tests, so birthday-ecards (2,900 a month; "happy birthday ecard" 6,600, April peak 40,500) waits: its queue entry says so, and a draft that passes every other test is in `docs/ecards/drafts/birthday-ecards.md`.

## 2026-11-27: Valentine ecards
- **Page:** /gifts/valentines-ecards
- **Search:** valentine ecards, 2,400 a month, peak February: 22,200, difficulty 1 (US). Also "free valentine ecards" 1,300 (February 14,800, kd 12), "digital valentines card" 1,000 (February 9,900, kd 19), "funny valentine ecards" 210 (February 2,400). The searcher wants an animated card to send a partner now, often free, sometimes funny or for family. Page one on mobile: a paid animated file from a marketplace, three card sites offering a free trial or free cards, a vintage card site, a pinboard, and two lists of funny ecards; for "digital valentines card", mostly marketplace files. People also ask: which is the best ecard site (not answered: it would mean naming or ranking others), a cute Valentine's quote, what is trending for Valentine's Day 2026 (not answered), what is an ecard.
- **Gifts:** the-letter (free note), xoxo, jar-of-reasons, photo-booth, bloom, music-box, dark-romance, arcade
- **Why not birthday-ecards, the first due entry:** a test bug blocks any slug that sorts before christmas-ecards (see For a person). Its search data was checked today (2,900 a month, peak October 4,400, kd 33) and a draft is saved; the entry stays open.
- **Panel:** 10/10/10 after 5 rounds (8/8/7, 8/9/8, 7/9/9, 9/9/9, 10/10/10). Fixes that mattered: Music Box photos change as the figure turns, not with the key; Arcade's title is shown as typed; jar notes come out shuffled; Dark Romance's tarot card and bet need a second photo; no company names (WhatsApp out); a funny card (Arcade) and a family question added.
- **Cost:** $0.042 (both searches); balance $37.95
- **Check on:** 2026-12-18 where the page stands for valentine ecards and free valentine ecards (impressions will be few before late January)

## 2026-11-26: Christmas ecards (the first page, written by hand)
- **Page:** /gifts/christmas-ecards
- **Search:** christmas ecards, 3,600 a month, peak December: 40,500, difficulty 25. Page one for "free christmas ecards" on mobile was list sites and one social post.
- **Gifts:** the-letter (free note), frosted-window, string-the-lights, nice-list, unwrapped, gingerbread-house, snow-globe
- **Panel:** none (written and checked by hand with the owner)
- **Check on:** 2026-12-10 where the page stands for christmas ecards and animated christmas ecards
