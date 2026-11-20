# Getting other sites to link to Ethos

Written 24 Oct 2026. Search Console counts 8 links to tryethos.io from other sites, all from two scam
checkers, and that is the main reason Google ranks Ethos for its own name and little else
(`SEO-ORGANIC.md`). This is the kit for changing that: where to be listed, the copy for each
listing, and who to pitch.

## What Claude can and can't do here

- **Can:** write every listing and pitch (below), fill in and submit listings on a site where the
  owner is already signed in in Brave, prepare images, and track what was submitted.
- **Can't:** create an account anywhere, or sign in for the owner. Reddit is blocked for Claude
  entirely. The Pinterest signed in on Brave is the owner's personal one (haralds2714), so nothing
  is pinned from it without the owner's word.

So the owner's part is about ten minutes: sign up on the sites in step 1 (Google sign-in works on
most), then say so, and the listings go in.

## 1. Directories (sign up once, then Claude fills them in)

In this order. The first three are where the people searching this niche already look; the rest
are launch directories that give a followed link.

| Site | Why | Account |
|---|---|---|
| alternativeto.net | Lists "alternatives to" a product. Smilebox, Paperless Post, Greetings Island and Canva are listed there (searched 20 Nov 2026; DigiFlower and Jacquie Lawson are not), and Ethos belongs next to them | AlternativeTo account |
| producthunt.com | A launch day brings visitors, reviews and copies on dozens of sites that mirror launches | maker account; launch Tuesday to Thursday, 00:01 Pacific |
| peerpush.com | Already lists Letters by Heart, a direct competitor | PeerPush account |
| saashub.com | Alternatives pages that rank in Google | SaaSHub account |
| uneed.best, fazier.com, tinylaunch.com, microlaunch.net, betalist.com | Launch directories; check each one's link is followed before spending time | one each |
| Where To Submit (peerpush.com/p/where-to-submit), Nick Launches Directory Finder (peerpush.com/p/nick-launches-directory-finder) | Lists of 150 to 260 more, with which ones give followed links | none |

**The four to do first (20 Nov 2026).** When ChatGPT is asked for a site to make a digital love
letter, its answers draw on small launch directories as well as the makers' own pages: the pictures
in two of three answers that day came from saastool.site's "Digital Love Letters" listing and from
openlaunch.ai's "Letters by Heart" (`docs/blog/ai-answers.md`). Ethos is on neither. The owner made
an account on all four the same day and Claude filled in what could be filled in. Where each stands:

| Site | A free listing | Stands at (20 Nov 2026) |
|---|---|---|
| alternativeto.net | Free, no badge, one followed link. But the free queue "holds several thousand apps" and most "will not be looked at for a very long time"; a review within 1 to 2 working days costs $25 once (or $35 with their editing) | Submitted as **TryEthos** (an "Ethos" exists there), with Smilebox, Paperless Post, Greetings Island and Canva as alternatives. Waiting in the normal queue: "My submissions" in the account. The paid review was declined; it is the owner's to choose |
| saastool.site | Free: their badge or a link to them has to stay on our home page for good; a person reviews within 90 days | **Under review**, free plan. The link is on the home page (`src/config/directories.ts`). Their automatic check answered with a server error, so the listing went in on their manual confirmation, which their reviewer checks. Basic $9.90 and Pro $19.90 are paid links: skip |
| fazier.com | Free launch: three comments on other products from the account, then their badge image on our site, then "Verify Badge"; reviewed and listed within 30 days | Not started: both the comments and a badge image are the owner's to decide. Lite $29 and up are paid: skip |
| openlaunch.ai | Free launch: $0, five slots a day, the link followed only for a day's top three | Not submitted: every one of the 180 days on offer showed "0 free slot(s)". Only the $9 launch could be booked, and that is a paid link. The form keeps no draft; its answers are below |

**The link on the home page.** One line of the footer's smallest print, on the home page only
("Elsewhere: SaaSTool"), with the address SaaSTool's badge code gives. It has to stay: SaaSTool
checks from time to time and takes the listing down without it. Small is fine, hidden is not: a link
people cannot see is one the directory refuses and search engines count against the site.
`tests/e2e/directory-links.spec.ts` holds it to that.

What went into the forms, for the next one:

- **AlternativeTo:** name TryEthos; the one-sentence description "Make a digital gift that opens
  like a story on their phone: a love letter, a bouquet or a scrapbook made of your photos, your
  words and a song."; a three-paragraph description with no links in it (their rule); languages
  English and Spanish; Freemium, a purchase of $9 to $30; proprietary; tags gifts,
  personalized-gifts, greeting-cards, ecards; platform Online; company SIA MIGLAI, Latvia; release
  23 April 2026; TikTok and YouTube; the icon and four real screenshots (they turn down listings
  without screenshots).
- **Open Launch:** tagline (160 characters at most) "Digital gifts that open like a story: a love
  letter, a bouquet or a scrapbook made of your photos, your words and their song."; categories
  Design Tools and SaaS (three at most, and none is about gifts); tech stack Next.js, React,
  TypeScript; platform Web; pricing Freemium.
- **SaaSTool:** categories Design and Daily Life; tags Web, English Supported, Free, Paid; the short
  description below (256 characters at most); an introduction in Markdown made from the long one.

### The copy

Checked against the site on 20 Nov 2026. Two things changed since October and are easy to get wrong:
the free Letter is a short note now, and Constellations is no longer free.

**Name:** Ethos

**Tagline (60 characters max):** Digital gifts that open like a story

**Short description (about 260 characters):**
Make a digital gift in ten minutes: a love letter with a wax seal, a bouquet picked stem by stem, a
scrapbook, a little game. Your photos, your words and their song, sent as a link or a QR code and
opened on their phone. A short letter is free to send.

**Long description:**
Ethos turns your photos, your words and a song into a gift that opens like a story on their phone.
There are 61 animated templates, from a wax-sealed love letter and a digital bouquet to a
newspaper front page about them, a night sky made of your photos and a jar of 100 reasons you love
them. Every one has a live demo. You make it in the browser in about ten minutes and send a link
or print a QR code; they need no app and no account. The Letter is free to send as a short note
with music; every other template, and a letter with photos, is a one-time payment, with no
subscription. In English and Spanish. Made in Riga by SIA "MIGLAI" (https://tryethos.io/about).

**One line for a "digital love letter" listing:** A love letter they open like a real one: a wax
seal, your words in handwriting and your song, sent as a link. Free as a short note.

**Categories / tags:** digital gifts, virtual gifts, e-cards, love letters, greeting cards,
relationships, long distance, gift ideas

**Links:** https://tryethos.io · gallery https://tryethos.io/templates · the letter
https://tryethos.io/templates/the-letter · who makes it https://tryethos.io/about · in Spanish
https://tryethos.io/es · the letter in Portuguese https://tryethos.io/pt/carta-digital

**Pricing:** freemium. Free: The Letter as a short note (up to 500 characters, with music). Paid
once, no subscription: one template €9.99 / $11.99 / £8.99; every template €24.99 / $29.99 / £21.99;
photos and a long letter on The Letter €7.49 / $8.99 / £6.49.

**Images:** the template posters in `public/templates/<slug>/poster.jpg` (1170 × 1800, the 2:3
shape Pinterest and most galleries want): bouquet, the-letter, jar-of-reasons, constellations,
scratch-card, museum. The short videos in `public/templates/<slug>/preview.webm` work as a
Product Hunt gallery video. For a listing form: the logo is `public/icons/icon-512.png` (square), and
the 16:9 product image is `docs/marketing/listing/ethos-product-16x9.jpg` (1600 × 900: the tagline
and three covers in phones).

**The maker's first comment** (Product Hunt, Open Launch and Fazier ask for one). A draft with
today's facts; it lands best in the owner's own words, so change anything in it but the numbers:
Hi! A text feels too small and a parcel takes a week, so we made the thing in between: a gift made
of your own photos, words and song that opens like a little story on their phone. Sixty-one
templates, a short letter free to send, no app for them to install. I'd love to hear which one
you'd send first, and what's missing.

## 2. Pitches (Claude drafts; sent from the owner's email only with a yes for each)

Gift guides for Christmas are being written and refreshed now; Valentine's guides from December.
One short email each, with a free code if they want to try a paid template.

| Who | The page to be on | Angle |
|---|---|---|
| iDrop News | "The 12 Best Digital Gifts You Can Send Instantly" (refreshed each holiday season) | a digital gift that isn't a gift card or a subscription |
| SELF | its long-distance relationship gifts list | one you can send the night before, for nothing |
| CNN Underscored, The Knot, Good Housekeeping | long-distance and "best digital gifts" guides | the same, with the Passport and Midnight Countdown templates |
| lovingfromadistance.com, endlessdistances.com | long-distance gift ideas | a guest post: "12 digital gifts for long-distance couples, and what to write in them" |
| Latvian startup press (Labs of Latvia, Delfi Bizness) | a story about a gift site made in Riga that sells abroad in English and Spanish | the founder story; links from news sites carry weight |

**Draft (iDrop News, adapt per site):**

> Subject: A digital gift that isn't a gift card, for your 2026 list
>
> Hi [name],
>
> I read your "Best Digital Gifts You Can Send Instantly". One thing missing from most of these
> lists is a digital gift that is personal rather than store credit, so here's one in case it's
> useful for this year's update.
>
> Ethos (tryethos.io) turns someone's photos, words and a song into a little animated gift that
> opens on the recipient's phone: a wax-sealed love letter, a bouquet you build stem by stem, a jar
> of 100 reasons, a newspaper front page about them. It takes about ten minutes, arrives
> instantly, and a short letter is free to send. Here's one to open:
> https://tryethos.io/demo/bouquet
>
> Happy to send a code so you can try any paid template, or answer anything.
>
> [Owner's name], Ethos (SIA MIGLAI, Riga)

## 3. Pinterest

Pinterest ranks in Google for "digital gift ideas" and "virtual gift ideas for boyfriend". Its pin
links don't pass ranking credit, but they bring people who are choosing a gift right now.

Done. The Ethos business account (@tryethosgifts) has existed since 28 Oct 2026 and pins by itself
every day since 9 Nov (the assets repo's `pins/README.md`). In its first 30 days its 153 pins were
shown 1,270 times and saved once: every pin was a headline over a gift's cover. Since 20 Nov a
blog post's pin is a list of the post's own lines, a template's is its poster in a phone, and there
are 26 boards, nine of them for what the posts are about. Read the numbers again around 20 Dec.

## 4. Questions from journalists

Qwoted, Featured.com and Help a B2B Writer send journalists' requests for sources ("gift experts",
"relationship tips"). An answer that gets used is a link from a large site. Each needs an account
in the owner's name; Claude can draft the answers.

## Log

| Date | Where | What | Link |
|---|---|---|---|
| 13 Nov 2026 | stampgoose.com, "The best ways to send a digital letter in 2026" (Jake Powney, who makes Stampgoose; followed links; ChatGPT reads it) | Pitch from support@secuora.xyz to hello@stampgoose.com: add The Letter (free, 10 photos and a song; $8.99 extras), with their table's three lines and the demo. A code for the extras offered, not made. | https://stampgoose.com/articles/comparisons/best-ways-to-send-a-digital-letter |
| 13 Nov 2026 | birthdaywebsite.app, "Best Birthday Website Makers in 2026: An Honest Comparison" (by the maker of Birthday Website Maker; followed links) | Pitch from support@secuora.xyz to support@birthdaywebsite.app, answering their criteria: Birthday Cinema, Midnight Countdown, scheduled unlock in their time zone, password with paid templates, permanent links, link or QR. A code offered, not made. | https://birthdaywebsite.app/blog/best-birthday-website-makers-2026 |
| 13 Nov 2026 | peekwire.com, "5 Digital Open-When Letter Services Worth Knowing in the US" (no author; followed links) | Pitch from support@secuora.xyz to editorial@peekwire.com, answering their four factors: scheduled unlock in their time zone and a password, Midnight Countdown, the 100-note jar, prices, link or QR with no app. A code offered, not made. | https://peekwire.com/article/5-digital-open-when-letter-services-worth-knowing-in-the-us |
| 20 Nov 2026 | saastool.site | Listing submitted on the free plan from the owner's account: under review (up to 90 days). The link they ask for is on the home page | https://saastool.site/dashboard |
| 20 Nov 2026 | alternativeto.net | Submitted as TryEthos from the owner's account, with four alternatives; normal queue, paid review declined | https://alternativeto.net/my-submissions/ |
| 20 Nov 2026 | openlaunch.ai | Form filled from the owner's account, not submitted: no free slot on any of the 180 days | https://openlaunch.ai/projects/submit |

The Stampgoose pitch of 13 Nov described The Letter as it was then: free with 10 photos and a
song. Since 19 Nov the free Letter is a short note (up to 500 characters, with music, no photos),
and photos and a long letter come with the one-time "Make it special". If Stampgoose answers, the
reply has to say so before they print it.
