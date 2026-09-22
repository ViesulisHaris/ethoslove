# How this makes money

Written September 2026, for deciding what to build next. Commission rates and competitor prices
are what those programmes publish or were charging when this was written; check them before
relying on one. Every figure in the sketch at the end is an assumption, labelled as one.

## The shape of it

Gifts are bought a few times a year: a birthday, an anniversary, a bad week. Dates happen every
weekend. So **Dates is the free habit and the front door, and it should stay free**: it is what
brings a couple back forty times a year, so that they are already here on the three days they need
a gift. Charging for the map would throttle the one thing TikTok can make viral.

Money is taken where money already changes hands on a date (a table, a ticket, a train) and where
people already pay us (a gift), not for looking at a map.

## 1. Now: sell the invitation (weeks, not months; everything it needs exists)

The plan link is free. **A designed, animated invitation is a gift template**, at the price a
template already sells for, through the Stripe checkout that already works.

- Build one template for it: *"scratch to see where I'm taking you Saturday"*, or an envelope that
  opens onto the evening, stop by stop. `/plan` already has the button ("Wrap it in a gift"); today
  it leads to the gallery, and it should lead to this template with the plan carried in.
- Why it should convert: the plan is made, the feeling is fresh, and the upsell makes the *same
  thing* a surprise rather than asking for something new. It is also the TikTok moment: the screen
  recording of the invitation being opened is the ad.
- Second moment: ask once for their anniversary and birthdays (kept on the device, or with an
  account) and say so nine days before. That is a gift sale with a date on it.

## 2. Next: affiliate, which is also the fix for photos and ratings

This is how TripAdvisor itself earns. And for us it does double duty: **partner feeds come with
real photos, ratings, review counts and prices**, which OpenStreetMap never will. A "Bookable near
you" row on `/dates` is both the most TripAdvisor-looking thing the page could have and revenue.

| Where | Partners (typical terms) | What it looks like |
|---|---|---|
| Experiences and tickets | GetYourGuide, Viator (about 8%), Tiqets, Fever, Klook | Cards with their photos and ratings: a sunset cruise, a pasta class, a candlelight concert. Best fit with the ideas ("make it a date: book the class"). |
| Tables | TheFork (per seated diner), OpenTable (per booking, US/UK) | "Book a table" on a restaurant's sheet when a partner has that restaurant. |
| Long-distance travel | Skyscanner, Omio, Trainline, Booking.com | After "Meet in the middle": flights or trains from both towns to the halfway city, and a stay for two. A weekend is a few hundred euros, so one booking is worth more than ten gifts' margin. |
| Experience gifts | Smartbox, Tinggly, Buyagift (about 8 to 12%, baskets around €100) | In the Gifts room: "give them a date", beside the digital gift. |

Each programme has to be applied for by the company, with the live site: that part is yours. The
code side is small: one module that builds partner links with our id, and a disclosure line
("we may earn a commission", which the law and the programmes both require).

## 3. Then: "Ethos for Two", a subscription for the couple (needs accounts on both phones)

About **€3.99 a month or €29 a year, per couple**: one pays, both have it. Couples apps charge more
than that (Paired is around $70 a year) for less that you can touch.

- **A shared space**: the same plan on both phones, one saved list of places and ideas, a countdown
  to the next visit or the anniversary.
- **Date night, handled**: every Thursday, one date already planned for your town and the
  weekend's forecast. One tap to accept and send. This is the feature worth paying for.
- **Memories**: a photo after each date, and at the end of the year "Our year of dates", which can
  be printed (see 5).
- **Every gift template included** while subscribed. A single template costs $7.99, so the first
  gift pays for three months; it is the anchor that makes the price feel small.
- **Every game pack.**

Free stays generous: finding, planning and sharing are never behind it.

## Gift prices, September 2026: what to charge

**The evidence** (Stripe, the four days after the first viral post): people who start a *premium*
template pay about **60%** of the time (Birthday Cinema 51 of 78, Bouquet 36 of 60), with the price
on the card before they start. People who start a *free* template pay about **4%** (the Letter: 62 of
1,383), all of it for paid extras. Purchases peak 20:00 to 22:00 UTC.

**What it says.** When more than 40% of the people who reach a paywall pay, the price is not what
stops anybody; it is under what they would pay. And almost all the traffic starts free, so the
biggest money is not in the price of a premium template but in the 96% of free makers who pay
nothing.

**The ladder to move to** (same numbers in each currency, set as the default price of each Stripe
product, with USD and GBP added as currency options):

| | Now (live) | Recommended | Why |
|---|---|---|---|
| One template | €7.49 | **€9.99 / $9.99 / £8.99** | 60% paywall conversion says the buyer who has made the gift pays. Under ten stays "under a tenner". |
| Pick three | €10.99 | **€14.99 / $14.99 / £12.99** | Half the price of three singles, and a small step from one. |
| Everything, forever | €22.99 | **€24.99 / $24.99 / £21.99** | Only €10 more than three and 2.5× one: the obvious choice, which is the point. |

Expected effect: fewer starts at the higher single price, more revenue per buyer (+33% on singles);
test it for seven days against the week before with `scripts/revenue-by-ref.mjs`.

**Bigger levers than the price, in order:**

1. **Apple Pay and Google Pay (and PayPal)** at checkout. Google Pay and PayPal are off in the
   shared Stripe account's payment-method settings. Wallets typically lift mobile checkout by
   double digits, and nearly all of this traffic is mobile. Free, and a switch in the Stripe
   dashboard.
2. **A small upgrade for free templates**: "Make it special", €3.99, unlocking the paid extras (real
   songs, video, voice, 20 photos, no footer) for one free gift. It is aimed at the 1,383 Letter
   makers; moving them from 4% to 8% is worth more than any price change above. Needs a Stripe
   product and a checkout option.
3. **A plain guarantee** by the pay button: "If it doesn't open on their phone, you get your money
   back." It costs almost nothing (it hardly happens) and it removes the last doubt. It has to match
   the terms (docs: legal pages).
4. **Local prices**: once the live prices carry USD and GBP, set NEXT_PUBLIC_PRICE_CURRENCIES to
   "eur,usd,gbp" and the site shows them. Until then it shows euros to everyone, because a dollar
   price on the page that is not the dollar price at checkout is misleading pricing.

**How to change a price without the site lying.** Stripe prices cannot be edited, only replaced:
create the new price (with its currency options), make it the product's default, change the amounts
in `src/lib/pricing/products.ts` in the same deploy, and run
`node --env-file=<live env> scripts/check-prices.mjs`: it compares every shown price with the
charged one and fails on any difference.

## What Wanderlog does, and what to take from it (September 2026)

Wanderlog is the nearest thing to what Dates is becoming: a free planner on a map, used by people
about to spend money. From its own reviews and pricing write-ups (third-party "business model"
pages that quote revenue splits are guesswork and are not used here):

- **The planning is free, and generous**: unlimited trips and places, the map, collaboration, budget
  tracking. Collaboration stays free on purpose: every trip shared with a friend is a new user.
- **Pro, about $39.99 to $59.99 a year** depending on region and offers, sells *conveniences at the
  moment of use*, not the planning: offline maps, route optimisation, export to Google Maps, an AI
  assistant, reservations imported automatically from Gmail, unlimited attachments, flight alerts.
- **Affiliate commission on bookings made from the plan**: hotels, flights and activities booked
  through its search. The booking link sits on the item in the itinerary, which is the moment the
  decision is made.
- **No ads**, and it says it does not sell data.

**What this means for Ethos.** We already have the same shape (free Dates, paid gifts, a planned
subscription, affiliate rows on the list), and Wanderlog shows where each piece earns:

1. **Put "Book" on the plan, not only on the list.** A stop in a plan is a decision already made;
   a "Book a table" (TheFork, OpenTable) or "Get tickets" (GetYourGuide, Viator) button on it
   converts far better than a banner. The affiliate sign-ups are yours; the code is one module and
   a button per stop.
2. **Keep sharing the plan free**, like Wanderlog keeps collaboration free: a plan sent to the other
   person is how Ethos meets its next couple.
3. **Build "Ethos for Two" out of moment-of-use conveniences**, the way Pro is built:
   - "Plan our Saturday": an AI planner that turns a mood, a budget and a town into a full date;
   - open the whole date in Google or Apple Maps, stops in order;
   - the best walking order between stops;
   - a calendar invite for both, and reminders for the anniversary and birthdays;
   - one shared plan on both phones, kept in sync.

   Priced per couple (€3.99 a month or €29 a year), it stays under Wanderlog's single-traveller
   Pro, which is the comparison people will make.
4. **No ads, ever**, which is also what keeps the site worth sharing.

## 4. Games: growth first, revenue second

A two-phone game invites somebody by link every time it is played, and that somebody lands on
Ethos. Treat games as the viral loop they are. The seven games are free and stay free; further card
packs (more questions, a bolder dare deck, a couple's quiz about the two of you) at €1.99 to €2.99 or
in the subscription. Which packs to write, and how grown-up any of them gets, is a brand decision
for you, not a technical one.

## 5. Later, when a city has real traffic

- **Featured venues**: a labelled "Date-night pick" for a bar or restaurant, per city, per month.
  Only ever marked as sponsored, and never mixed into the ordinary ranking: the list's honesty is
  the product.
- **Partner perks**: "two-for-one for Ethos couples", paid per redemption.
- **Print**: the invitation as a card, "Our year of dates" as a book, through a print-on-demand
  API. Margins of a third or more on €15 to €40.

## What not to do

Display ads (pennies, and they wreck the one thing that sets this apart from TripAdvisor: it is
lovely to look at). Selling or sharing anybody's data. A paywall on the map.

## The engine under all of it: a page for every city

TikTok traffic is a spike; search traffic is a salary. "Date ideas in London" and its thousands of
siblings are searched every week of the year, by people about to spend money. The data layer can
already produce `/dates/london`, `/dates/lisbon/rainy-day`, `/dates/madrid/free` as static pages,
with real places, the photographs and the ideas; that is the next build with the longest payoff,
and it is what makes the affiliate rows worth having.

## A sketch, with every number an assumption

Say 100,000 visitors a month. If 35% search, 12% of those add a stop and 40% of those share a plan,
that is about 1,700 plans a month. If 3% take the paid invitation at $7.99: about **$400 a month**
from a feature that is mostly built. If 0.5% of monthly visitors subscribe at €29 a year: 500
couples, about **€1,200 a month**, growing with retention. Affiliate starts small (a few hundred
euros) and grows with the city pages, where intent is highest. None of these is a forecast; they
are there to show the order to build in: **invitation, then subscription, then affiliate rows on
city pages.**
