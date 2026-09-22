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

## 4. Games: growth first, revenue second

A two-phone game invites somebody by link every time it is played, and that somebody lands on
Ethos. Treat games as the viral loop they are. The six games are free and stay free; further card
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
