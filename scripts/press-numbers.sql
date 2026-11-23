-- Ethos in numbers: every figure of the press page (/press), counted from the database.
--
-- READ-ONLY. One statement, a single SELECT: it writes nothing, creates nothing and calls no
-- function of ours. Run it in the Supabase SQL editor (the editor shows the result of the last
-- statement only, which is why it is one statement) and copy the one cell it returns into
-- src/content/press-numbers.ts, key for key. Then follow "When the numbers arrive" in
-- docs/marketing/growth-build/PLAN-partners.md.
--
-- BEFORE RUNNING: put the team's own sign-in addresses in `team` below, in lower case. Do not
-- commit them: this file is committed with the placeholder. The result's "teamAccounts" says how
-- many accounts matched; if it is 0 the list is wrong and our own test cards are being counted.
--
-- What every figure leaves out, for the reasons the page's closed "How we count" block gives:
--   drafts            a card counts once it has been published (gifts.published_at is set). Drafts
--                     are deleted after seven days anyway (purge_stale_drafts, 0006).
--   deleted cards     a card or an account its owner deleted is gone, with its opens (on delete
--                     cascade). Every figure is of what is in the database on the day it is run.
--   test cards        every card made from an account in `team`.
--   the sender's look an open less than ten minutes after the card was sent. Seven in ten cards
--                     were first "opened" within two minutes of being sent, from the share screen's
--                     own Open button (src/lib/gift/own-view.ts). Since 20 Nov 2026 a signed-in
--                     sender's look is not recorded at all; before that, and for a sender who is
--                     signed out, the row cannot be told from a recipient's, so the first ten
--                     minutes are left out for every card. This also leaves out a recipient who
--                     opened it in those minutes: the figures err low, never high.
-- An "open" is one row of gift_views: one visitor (a hash of address, browser and card) at most once
-- in 24 hours (record_gift_view, 0005).
--
-- Not from this query, because the database does not know it:
--   countries         no table stores a country. The number of countries a card has been paid from
--                     can be read from Stripe's payments export (the monthly VAT sheet); type it in
--                     by hand, or leave it null and the page leaves the figure out.
--   occasions         a card does not record its occasion. The only occasions in the database are
--                     the reminders people set (birthday, anniversary, Valentine's, other): that is
--                     the "reminders" object below, and the page says "of reminders", never "of cards".

with
  team as (
    select p.id
    from public.profiles p
    where lower(p.email) = any (array['owner@example.com', 'second@example.com']::text[])
  ),
  -- A card made: published at least once, still in the database, not one of ours.
  -- sent_at is when it could first be opened: the day it unlocks, for a scheduled card.
  cards as (
    select g.id, g.template_slug, greatest(g.published_at, coalesce(g.unlock_at, g.published_at)) as sent_at
    from public.gifts g
    where g.published_at is not null
      and g.user_id not in (select id from team)
  ),
  -- An open that counts: of one of those cards, ten minutes or more after it was sent.
  opens as (
    select v.gift_id, v.device
    from public.gift_views v
    join cards c on c.id = v.gift_id
    where v.opened_at >= c.sent_at + interval '10 minutes'
  ),
  per_card as (
    select o.gift_id, count(*) as n
    from opens o
    group by o.gift_id
  ),
  top_templates as (
    select c.template_slug as slug, count(*) as made
    from cards c
    group by c.template_slug
    order by count(*) desc, c.template_slug
    limit 5
  ),
  -- Reminders people set: a sender's own (reminders, 0010) and a recipient's on a card they kept
  -- (keep_reminders, 0017). The team's own are left out of the first; the second has no account.
  reminders_set as (
    select r.occasion from public.reminders r where r.user_id not in (select id from team)
    union all
    select k.occasion from public.keep_reminders k
  )
select jsonb_pretty(jsonb_build_object(
  -- The day this was run, in UTC: the "as of" date the page prints.
  'asOf', to_char(timezone('utc', now()), 'YYYY-MM-DD'),
  -- A check, not a figure: how many accounts the team list matched. Must not be 0.
  'teamAccounts', (select count(*) from team),
  -- Cards made: published, not deleted, not ours. Leaves out drafts and test cards.
  'cardsMade', (select count(*) from cards),
  -- Cards opened: of those, the ones with at least one open that counts. Leaves out a card whose
  -- only opens came in its first ten minutes.
  'cardsOpened', (select count(*) from per_card),
  -- Opens: every open that counts, of every card. Divided by cardsOpened it is the average opens
  -- per opened card.
  'opens', (select coalesce(sum(n), 0) from per_card),
  -- Opened more than once: cards with two or more opens that count (a second visitor, or the same
  -- one on another day). Divided by cardsOpened it is the share opened more than once.
  'openedAgain', (select count(*) from per_card where n >= 2),
  -- Opens on a phone: the request said iPhone, iPad, iPod or Android (the view route's device():
  -- 'ios' or 'android'). A newer iPad calls itself a Mac and is counted as a computer.
  'phoneOpens', (select count(*) from opens where device in ('ios', 'android')),
  -- Opens whose device is known at all: what phoneOpens is a share of. Old rows have none.
  'deviceOpens', (select count(*) from opens where device is not null),
  -- The five templates with the most cards made, most first; a tie goes by name.
  'topTemplates', (select coalesce(jsonb_agg(jsonb_build_object('slug', t.slug, 'made', t.made) order by t.made desc, t.slug), '[]'::jsonb) from top_templates t),
  -- Reminders set, by the day they are for. "other" is in the total and is never named on the page.
  'reminders', (
    select jsonb_build_object(
      'total', count(*),
      'birthday', count(*) filter (where occasion = 'birthday'),
      'anniversary', count(*) filter (where occasion = 'anniversary'),
      'valentines', count(*) filter (where occasion = 'valentines')
    )
    from reminders_set
  )
)) as press_numbers;
