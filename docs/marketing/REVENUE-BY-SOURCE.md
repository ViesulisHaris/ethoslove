# Revenue by landing page and source

Since 14 Nov 2026 every website checkout records where its buyer first came from, so revenue can be
split by the page people landed on and by channel. Until then 98% of sales had no source
(HORMOZI-AUDIT.md): only `?ref=` links were counted. The SEO routines read the same numbers
(`/api/internal/sales`, docs/blog/SEO-DATA.md) and work on the pages that sell, not only the ones
that are seen.

## What is recorded

One row in `checkout_sources` (migration 0019) per checkout started, keyed by the purchase id, which
is `purchases.id` once paid. Code: `src/lib/attribution/` (`source.ts` the rules,
`first-visit.ts` the browser, `checkout-source.ts` the server, `report.ts` the report).

| Column | What it holds |
|---|---|
| `landing` | The first page of the visit, path only: `/`, `/es`, `/blog/love-letter-ideas`. No query string or `#`. A private page (a gift, checkout, the dashboard, sign-in, a shared plan or trip) only by its section: `/g`. Anything that isn't plain slugs: `(other)`. |
| `referrer` | The referring site's host only (`google.com`, `l.instagram.com`), or an Android app's id (`com.zhiliaoapp.musically` is TikTok). |
| `utm_source`, `utm_medium`, `utm_campaign` | The landing link's tags, lower case. Anything with an `@`, 7+ digits or a UUID shape is dropped. |
| `click` | Which platform's click id the link carried (meta, tiktok, google, microsoft, pinterest). Never the id. |
| `ref` | The `?ref=` link, the same one checkout already sends Stripe. |
| `channel` | `search`, `tiktok_brand`, `direct` or `other` (below). |
| `source` | A short name: `google`, `tiktok`, `instagram`, `chatgpt`, `tiktok-link`, `creator`, `watermark`, a host… |
| `remembered` | True when the buyer allowed cookies, so their first visit of the last 30 days was kept on their device. False: the visit they paid in. |
| `first_seen_at` | When that first page was opened. |

Nothing goes to Stripe (the account is shared). The row is written after checkout has answered the
buyer, so a slow or missing table never holds up a sale. Rows of checkouts never paid are deleted
after 30 days by the daily job (`forget_unpaid_checkout_sources`, called from `/api/cron/unlock`).

### The consent choice

The banner's yes covers "cookies for our stats". The rule we follow is the one the privacy policy
already states: nothing is written to the visitor's device for stats or ads without that yes.

- **Without a yes** (no answer or no), nothing is stored on the device. The open tab remembers its
  first page, the referring site's name, the utm tags and the click platform in memory, the same way
  it already remembers a creator's `?ref=` link, and sends them with the checkout. A reload, a new
  tab or coming back another day starts again from that visit. So for these buyers the record is
  "the visit they paid in", not their very first visit.
- **With a yes**, the browser also keeps the first visit for 30 days (`ethos-first-visit` in local
  storage), so someone who reads a post today and comes back to pay next week is counted to the
  post. Saying no or "Stop cookies" removes it.

Both kinds of row are recorded; `remembered` tells them apart. We chose this over "only the
referring domain without consent" because keeping the landing page in the tab's memory stores
nothing on the device either, and it is the one thing SEO needs: which page the buyer arrived on.
The privacy policy says all of this (sections 7, 8, 11 and 12, updated 13 Nov 2026).

## The channels

Decided when the row is written (`channelOf` in `source.ts`), first match wins:

1. **tiktok_brand**: anything that says TikTok (a `tt-` bio link, a TikTok referrer, utm or click
   id), and **a search that landed on the home page** (`/` or `/es`). TikTok carousels can't carry a
   link, so viewers search the name (sales-follow-tiktok-reach). Google hides the words searched, so
   "landed on the home page from a search" stands for "searched the name".
2. **search**: a search engine (Google, Bing, DuckDuckGo, Yahoo, Ecosia, Brave, Yandex…) that sent
   someone to any other page. This is what SEO earns. A search ad (a Google or Microsoft click id, or
   utm_medium cpc/paid) is `other`.
3. **direct**: nothing known: no referrer, tag, ref or click id. Typed in (many TikTok viewers type
   tryethos.io from the slide), bookmarks, and apps that hide where they send people from
   (WhatsApp, iMessage, many in-app browsers). A reload or a return from Stripe's page counts here
   too: the referrer is then our own site or Stripe's, and the start of the visit was lost.
4. **other**: every other site or app (Instagram, Pinterest, ChatGPT and other AI answers, Gmail,
   Etsy), ads, creators' links and gifts' links (`watermark`, `game-end`…).

Limits worth remembering: brand vs non-brand search is a guess from the landing page; `direct` holds
some TikTok demand; a buyer without cookie consent who comes back is counted to the visit they paid
in; a tab opened before the deploy sends nothing ("(not recorded)").

## The report (SQL)

Supabase dashboard → SQL Editor (project `cjfzdleoypnlmyvupvoi`). All read-only. Website sales only
(Stripe; Etsy and the App Store bring their own buyers), refunds left out, a sale dated by its
purchase row. Revenue is ranked in euros at fixed rates (1 USD = €0.86, 1 GBP = €1.16; edit them in
the `rates` line); the 28-day query also gives each currency's own sum.

**By channel, last 7 and 28 days**

```sql
with rates(currency, eur) as (values ('eur', 1.0), ('usd', 0.86), ('gbp', 1.16)),
sales as (
  select p.created_at, lower(p.currency) as currency, p.amount / 100.0 as amount,
         p.amount / 100.0 * coalesce(r.eur, 0) as eur,
         coalesce(s.channel, '(not recorded)') as channel
  from public.purchases p
  left join public.checkout_sources s on s.purchase_id = p.id
  left join rates r on r.currency = lower(p.currency)
  where p.status = 'paid' and coalesce(p.store, 'stripe') = 'stripe'
    and p.created_at >= now() - interval '28 days'
)
select channel,
       count(*) filter (where created_at >= now() - interval '7 days') as orders_7d,
       round(coalesce(sum(eur) filter (where created_at >= now() - interval '7 days'), 0), 2) as eur_7d,
       count(*) as orders_28d,
       round(sum(eur), 2) as eur_28d,
       string_agg(distinct currency, ', ') as currencies
from sales
group by channel
order by eur_28d desc;
```

**By landing page, last 7 and 28 days** (with how many of each page's sales came from search)

```sql
with rates(currency, eur) as (values ('eur', 1.0), ('usd', 0.86), ('gbp', 1.16)),
sales as (
  select p.created_at, p.amount / 100.0 * coalesce(r.eur, 0) as eur,
         coalesce(s.landing, '(not recorded)') as landing, s.channel
  from public.purchases p
  left join public.checkout_sources s on s.purchase_id = p.id
  left join rates r on r.currency = lower(p.currency)
  where p.status = 'paid' and coalesce(p.store, 'stripe') = 'stripe'
    and p.created_at >= now() - interval '28 days'
)
select landing,
       count(*) filter (where created_at >= now() - interval '7 days') as orders_7d,
       round(coalesce(sum(eur) filter (where created_at >= now() - interval '7 days'), 0), 2) as eur_7d,
       count(*) as orders_28d,
       round(sum(eur), 2) as eur_28d,
       count(*) filter (where channel = 'search') as from_search_28d,
       count(*) filter (where channel = 'tiktok_brand') as tiktok_brand_28d
from sales
group by landing
order by eur_28d desc
limit 40;
```

**By source, last 28 days**

```sql
with rates(currency, eur) as (values ('eur', 1.0), ('usd', 0.86), ('gbp', 1.16))
select coalesce(s.source, '(not recorded)') as source, coalesce(s.channel, '(not recorded)') as channel,
       count(*) as orders, round(sum(p.amount / 100.0 * coalesce(r.eur, 0)), 2) as eur
from public.purchases p
left join public.checkout_sources s on s.purchase_id = p.id
left join rates r on r.currency = lower(p.currency)
where p.status = 'paid' and coalesce(p.store, 'stripe') = 'stripe'
  and p.created_at >= now() - interval '28 days'
group by 1, 2
order by eur desc
limit 30;
```

**Which landing pages' checkouts get paid, last 28 days** (every checkout started, paid or not)

```sql
select s.landing, s.channel,
       count(*) as checkouts,
       count(p.id) as paid,
       round(100.0 * count(p.id) / count(*), 0) as paid_pct
from public.checkout_sources s
left join public.purchases p on p.id = s.purchase_id and p.status = 'paid'
where s.created_at >= now() - interval '28 days'
group by 1, 2
order by paid desc, checkouts desc
limit 40;
```

**Is it recording?** (since the first record: sales with and without a source, and how many came
with cookie consent)

```sql
select count(*) as sales,
       count(s.purchase_id) as recorded,
       count(*) filter (where s.remembered) as remembered,
       min(s.created_at) as first_record
from public.purchases p
left join public.checkout_sources s on s.purchase_id = p.id
where p.status = 'paid' and coalesce(p.store, 'stripe') = 'stripe'
  and p.created_at >= (select min(created_at) from public.checkout_sources);
```

## For the routines

The cloud routines can't reach the database, so the site serves the same numbers, counts and sums
only, at `GET https://tryethos.io/api/internal/sales`, to whoever holds `GSC_EXPORT_KEY`: the key
their environment already sends to tryethos.io for Search Console, so nothing new needs setting up.
It answers 401 without the key and 503 while the table is missing. The SEO routine reads it every
run (docs/blog/SEO-AGENT.md step 2, SEO-DATA.md). It never writes sales figures into the
repository: the mirror is public.
