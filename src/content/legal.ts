import type { GiftLocale } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";
import { FREE_SAVED_DATES, PRODUCTS, formatAmount, membershipAmount, type MembershipPlan, type ProductId } from "@/lib/pricing/products";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR } from "@/lib/commerce/creators";
import { consentSentence } from "@/lib/stripe/line-items";

/** Operator of the service — from the Latvian Enterprise Register (Lursoft, reg. no. 40203733943). */
export const LEGAL_ENTITY = {
  name: 'SIA "MIGLAI"',
  shortName: "MIGLAI",
  regNo: "40203733943",
  vat: "LV40203733943",
  address: '"Reķu sala 4", Upesciems, Garkalnes pagasts, Ropažu novads, LV-2137, Latvia',
  country: "Latvia",
  email: BRAND.supportEmail,
  registeredAt: "27 March 2026",
} as const;

export const LEGAL_UPDATED = "2026-09-24";

/**
 * The box every buyer ticks on Stripe's checkout page, word for word without its link. Terms s.9
 * quotes it from the same function checkout labels the box with, so the two can't drift apart: the
 * law wants the request and the acknowledgement the buyer gave, not a paraphrase of them. Ethos for
 * Two has a box per plan, because each states its own price and how often it renews.
 */
const consent = (locale: GiftLocale) => ({
  unlock: consentSentence("single", locale),
  monthly: consentSentence("membership", locale, { plan: "monthly" }),
  yearly: consentSentence("membership", locale, { plan: "yearly" }),
  pass: consentSentence("pass", locale),
  giftcard: consentSentence("giftcard", locale),
});

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

const E = LEGAL_ENTITY;
const B = BRAND.name;

/**
 * Prices come from the catalogue, in euros (the only currency charged), so the terms can never
 * quote a price checkout doesn't charge. "upgrade" is its floor: the real price is per buyer.
 */
const price = (id: ProductId, locale: GiftLocale) => formatAmount(PRODUCTS[id].amounts.eur, "eur", locale);
const P = { en: (id: ProductId) => price(id, "en"), es: (id: ProductId) => price(id, "es") };
/** Ethos for Two's two plans, from the same catalogue its subscriptions are charged from. */
const planPrice = (plan: MembershipPlan, locale: GiftLocale) => formatAmount(membershipAmount(plan, "eur"), "eur", locale);
const M = { en: (plan: MembershipPlan) => planPrice(plan, "en"), es: (plan: MembershipPlan) => planPrice(plan, "es") };

const termsEn: LegalDoc = {
  title: "Terms of Service",
  intro: `These terms govern your use of ${B} (the “Service”), operated by ${E.name}, registration number ${E.regNo}, VAT ${E.vat}, ${E.address} (“we”, “us”). They cover every part of the Service: gifts and everything we sell for them, Ethos for Two, the Dates map, plans, trips and the dates you save, reviews, games, reminders, our emails and the creator programme. By using the Service, creating an account, publishing a gift, posting a review or making a purchase, you agree to them. Our Privacy Policy explains how we handle personal data. If you don't agree, please don't use the Service.`,
  sections: [
    {
      heading: "1. What the Service is",
      paragraphs: [
        `${B} lets you build a personalised, animated web page (a “gift”) from a template, add your own photos, music, video and words, and share it through a link or QR code. Two templates, The Letter and Constellations, are free. The others, and paid extras such as video, voice messages, more than 10 photos, scheduling, a password and removing the footer, are unlocked with a one-time payment (section 6). A song from Apple Music's catalogue is free on every gift (section 3).`,
        `The Service also has free tools for couples: a map of date ideas and places (Dates), plans you can share, trips, long-distance tools, reviews of places, and browser games for two. With a free account you can also save up to ${FREE_SAVED_DATES} dates and trips (section 11). Ethos for Two, a membership for couples, and game packs are sold separately (sections 6 and 7).`,
        "Gifts are web pages. They work in current versions of the common mobile and desktop browsers and need an internet connection. Some templates use sound and, if the person viewing allows it, the microphone (for example to “blow out” candles) or motion sensors.",
      ],
    },
    {
      heading: "2. Who can use the Service, and your account",
      paragraphs: [
        "The Service is for personal, non-commercial use. You must be at least 16 to create an account, post a review or buy anything, and if you are under 18 you need a parent's or guardian's permission to buy. The Service isn't directed at children.",
        "You can sign in with a link or code sent to your email, or with Google (or Apple, where offered). You can also pay without signing in: we then create your account from the email address you give at checkout and add your purchase to it, so make sure that address is right. If an account already exists for that address, the purchase goes to it.",
        "Accounts are personal. Keep access to your email secure and tell us at once if you think someone else has used your account. You're responsible for everything published from your account, including by anyone you let use it.",
      ],
    },
    {
      heading: "3. Your content",
      paragraphs: [
        "You keep every right you have in the photos, video, audio, voice recordings and text you add to a gift or a review (“Your Content”). You give us a worldwide, non-exclusive, royalty-free licence to host, store, copy, resize, re-encode, display and transmit Your Content only as needed to run the Service: to show a gift to the people who have its link, to show it to you in your dashboard, and to publish your reviews (section 12). The licence ends when you delete the content or your account, except for copies in routine backups until they expire.",
        "You confirm that you own Your Content or have permission to use it, including any music you upload, and that it doesn't infringe anyone's copyright or other rights, or their privacy. Where Your Content shows or names other people, you're responsible for having their permission, and you shouldn't include more of their personal details than a personal gift needs.",
        "Library music in the editor belongs to us and may be used only inside gifts made on the Service. You can also add a song from Apple Music's catalogue to any gift, free: the gift shows it beside a “Listen on Apple Music” link to the full song and the credit “Preview courtesy of Apple Music”, and its 30-second preview plays only when the person viewing the gift taps it, once. We don't sell songs or previews. Previews, covers and songs belong to Apple and the rights holders, and song links point to YouTube, Spotify or Apple Music: they play from those services under their terms and may stop working if a provider removes them.",
        "The optional writing helper uses an AI model to suggest drafts from the details you give it. Drafts can be wrong or unsuitable, so read them before you use them. Whatever you publish is Your Content and your responsibility.",
      ],
    },
    {
      heading: "4. Acceptable use",
      paragraphs: [
        "Don't use the Service to publish or send anything unlawful, defamatory, harassing, threatening or hateful; sexually explicit material; anything that sexualises or endangers minors; content that infringes intellectual property or someone's privacy, including other people's photos or personal details shared without their permission; or anything designed to deceive, such as phishing pages, scams or spam dressed up as gifts.",
        "Don't try to break, overload, scrape or reverse-engineer the Service; to get around payment, rate limits or security; to post reviews or reactions automatically; or to access gifts, game rooms, accounts or data that aren't yours. Game room codes are short, so anyone who has one can try to join: don't share them publicly.",
        "If these rules are broken, we may remove content, restrict features, suspend or close accounts, and report illegal content to the authorities where the law requires or allows it. Section 13 explains how, and how you can challenge a decision.",
      ],
    },
    {
      heading: "5. Gifts: links, scheduling, reactions and storage",
      paragraphs: [
        "Anyone who has a published gift's link can open it. Links are hard to guess but not secret: treat them like a private letter you hand to someone. When a link is shared in a messaging app or on a social network, its preview can show the gift's title or the recipient's name.",
        "With an unlock you can add a password, which the recipient needs to open the gift, or schedule a gift: until the time you choose, its link shows a waiting screen with your name and the opening time. You can edit a live gift, and your changes appear at the same link. You can delete a gift at any time: its link stops working at once and its files are removed.",
        "Recipients don't need an account. They can send the sender a reaction: an emoji, with an optional short note and a voice message of up to 20 seconds. Reactions are shown only to the gift's sender, who also receives the emoji and the note by email. Reactions must follow section 4.",
        "If you ask us to remind you of a date, such as a birthday, we email you nine days before it every year until you remove the reminder, from your account page or with the link in the email.",
        "Drafts saved to your account that haven't been edited for 7 days are deleted automatically, with their uploads. The Service isn't a storage or backup service: keep your own copies of the photos, videos and words that matter to you.",
        "We aim to keep gift links working indefinitely, but we can't promise uninterrupted availability. We may take a gift offline if it breaks these terms or the law, if you delete it, if your account is closed, or if the payment that unlocked it is refunded or reversed (section 10). If we ever discontinue the Service, we'll give account holders at least 90 days' notice by email.",
      ],
    },
    {
      heading: "6. What we sell: prices and payment",
      paragraphs: [
        "Everything we sell is paid once, except Ethos for Two, a subscription that renews until you cancel it (section 7). At times we sell Ethos for Two as a one-year pass instead, paid once: our pricing page and Stripe's checkout page always say which one you're buying. Nothing else renews or charges you again unless you choose to buy it again.",
        `Our prices, VAT included: one template ${P.en("single")}; three templates of your choice ${P.en("pick3")}; “Everything” ${P.en("everything")}; “Make it special” ${P.en("extras")}; Ethos for Two ${M.en("monthly")} a month or ${M.en("yearly")} a year, or, as a one-year pass, ${P.en("pass")} for 365 days; a game pack ${P.en("pack")}.`,
        "Unlocks: one template, three templates of your choice, or “Everything”, which covers every gift template, including the ones we add later, for as long as we offer gift templates. An unlock covers the templates it names, with all their paid extras and no footer. “Everything” covers gift templates only: it doesn't include game packs, Ethos for Two or anything else we sell separately.",
        "“Make it special”: for The Letter or Constellations, our free templates, it unlocks that template's paid extras (video, voice messages, up to 20 photos, scheduling, a password and no footer), exactly as an unlock of that template would.",
        "Game packs: extra rounds and cards for our games, each bought on its own. Ethos for Two: a membership for two people, monthly or yearly, with unlimited saved dates and trips shared between you, every gift template and every game pack, for as long as it runs (section 7). Gift cards: not on sale at the moment (section 8).",
        "Unlocks, “Make it special” and game packs have no end date: they stay on your account for as long as your account exists and we run the Service. They are personal to your account and can't be transferred.",
        "Adding every template at checkout. When you buy one template or “Make it special”, we may offer a box to add every other template for the difference between that price and the price of “Everything”, so that in total you pay exactly the price of “Everything”. It is never ticked for you. If you tick it, your purchase is “Everything”.",
        `Upgrading to Everything. If you're signed in and have already bought single templates, three templates or “Make it special”, you can upgrade to “Everything” for its price minus what you paid us for those, and never less than ${P.en("upgrade")}. The price is worked out and shown before you pay.`,
        `Free replies. When you receive a gift someone paid for, made with one of our paid templates, the “send one back” button at its end lets you make one gift in reply, with the same template, for free. A free reply carries the “${BRAND.watermark.en}” footer and no paid extras; to add extras or remove the footer, you pay the usual price for that template. Each paid gift gives one free reply, only through its button, and a free reply doesn't earn another.`,
        "No discount codes. We don't offer discount or promotion codes, and Stripe's checkout page doesn't ask for one.",
        `Creators. Some people who post about ${B} are in our creator programme: when you buy after arriving through a creator's personal link, we pay that creator a commission. It doesn't change your price, there's no code to enter, and creators must make clear in their posts that we pay them.`,
        `If you are a creator in the programme, we pay you ${CREATOR_COMMISSION_PCT}% of what we receive for each sale made through your personal link, worked out without VAT and after refunds and chargebacks: a sale that is refunded or reversed earns nothing. For Ethos for Two, only its first payment counts as a sale: renewals earn nothing. We pay monthly, once what you're owed passes €${CREATOR_PAYOUT_MIN_EUR}; smaller amounts carry over to the next month. Only sales through your personal link count, and your own purchases earn no commission, even through your own link. You must be 18 or over, say in every post that we pay you, and keep to section 4. We may end your place in the programme, or ask you to take down a post, if it breaks these terms or the law; commission already earned on genuine sales is still paid. The creator programme page, and anything we agree with you by email, set out the rest.`,
        "Prices are shown on our site before you pay. For consumers they are final prices, including VAT where it applies. We charge in euros. If you pay in another currency, Stripe may convert the price at checkout, at its own rate and possibly with a conversion fee: the amount on the Stripe Checkout page, before you confirm, is the amount you pay. Your bank may add its own fees for payments in a foreign currency. If we ever charge you more than the price we showed you, we'll refund the difference.",
        "How a purchase works: you choose what to buy on our site and go to Stripe Checkout, where you see the final amount, can check or correct your details, or go back, and tick the box described in section 9 before you pay. For Ethos for Two, the page also says, directly above the button, what it renews at, how often and how to cancel. The contract is concluded when Stripe confirms your payment, and we add what you bought to your account straight away (a gift card's code is emailed to you). We email you a confirmation of your purchase (for Ethos for Two, the welcome email), Stripe may send its own receipt, and your purchases are listed on your account page. Payments are processed by Stripe; we never see or store your full card details. The charge appears on your statement with “ETHOS” in its description.",
      ],
    },
    {
      heading: "7. Ethos for Two",
      paragraphs: [
        `Ethos for Two is a membership for two people: you, who pay for it, and one other person you invite. It's a subscription, monthly at ${M.en("monthly")} a month or yearly at ${M.en("yearly")} a year, VAT included, and one payment covers both of you.`,
        "While it runs, it gives both of you unlimited saved dates and trips, shared between you and editable on both your phones; every gift template, with all their paid extras, and every game pack; an email the day before each saved date that has a day; and a way to open a whole date in Apple Maps or Google Maps. We email you an invite link; the other person joins by opening it and signing in to their own account (making one is free).",
        "It renews automatically at the end of each month or year, at the price shown when you subscribed, charged to the payment method you used, until you cancel it. For a yearly membership, we email you a week before each renewal with the date and the amount.",
        "You can cancel at any time from your account page, or from Stripe's billing page, which it opens. Cancelling stops the renewals: the membership keeps running until the end of the month or year you've paid for, then ends, and nothing more is charged. The rest of that period isn't refunded, except under sections 9 and 10. Cancelling isn't withdrawing: section 9 explains your right to withdraw within 14 days.",
        "If a renewal can't be charged, Stripe tries again over the following days and we email you. The membership keeps running for up to 7 days after the end of the period while it tries, and ends if the payment still hasn't gone through. You can switch from monthly to yearly at any time from your account page: the switch is immediate, and what's left of the month you've paid for is taken off the first year. A switch from yearly to monthly takes effect at your renewal: we make it a couple of days before your year ends and take what's left of the year off your first monthly payment, so nothing is lost.",
        "Sharing with your partner. One other account can join your membership. While you share it, each of you can see and edit the other's saved dates and trips, and sees the other's name. Your partner can leave, and you can remove them, at any time from the account page: sharing stops at once, what the membership unlocks goes from their account, each of you keeps the saved dates you made, and your invite link changes so you can invite someone else. If you delete your account, the membership ends for both of you (section 15); if your partner deletes theirs, it stays with you.",
        "Price changes. If we change the price of Ethos for Two, a membership you already have keeps its price until a renewal at least 30 days after we've emailed you about the change, and you can cancel before then without paying anything more. A new price never applies to a period you've already paid for.",
        "When it ends, what it unlocked is no longer available to either of you for new gifts or games. Gifts you published while it ran stay online as they are; to publish new gifts with paid templates or extras, or to change the paid extras of one already published, you need an unlock or Ethos for Two again. Anything either of you bought separately, such as “Everything”, stays yours, and so do your saved dates and trips (section 11). If it is refunded or its payment is reversed, it ends for both of you at once (section 10).",
        `The one-year pass. At times we sell Ethos for Two as a pass instead: ${P.en("pass")}, paid once, for 365 days from the moment your payment is confirmed, with everything listed above. It doesn't renew by itself, and we never charge you again unless you choose to. Fourteen days before it ends, we email the buyer the end date and how to carry on. While the pass is on sale, renewing adds 365 days from the day the current pass ends, at the price shown then, so renewing early loses nothing; if you don't renew, nothing happens and nothing is charged.`,
        "When you subscribe or buy the pass, you ask at checkout for it to start straight away, with the box described in section 9, and you can still withdraw within 14 days. A pass renewal bought before your current pass ends starts only when that pass ends. Memberships bought in our iPhone app are sold and billed by Apple, under its terms: you manage and cancel them in your iPhone's settings, and Apple handles their renewals and refunds. What they include, and sharing with your partner, work as this section describes.",
      ],
    },
    {
      heading: "8. Gift cards",
      paragraphs: [
        "We don't sell gift cards at the moment. This section applies to any gift card code we have issued, and to gift cards we sell in future.",
        "A “Give Everything” gift card is a code we email to the buyer, to pass on however they like. Whoever redeems it on the Service, signed in to their own account, gets “Everything” on that account, as if they had bought it (section 6).",
        "A code can be redeemed once, within 24 months of purchase; after that it expires. It can't be exchanged for cash, resold, split or used towards anything else. An account that already has “Everything” can't redeem it, so the code isn't used up and can be passed on to someone else.",
        "Treat a code like cash: anyone who has it can redeem it. If a code hasn't been redeemed and you think someone else has it, write to us and we can cancel it and send you a new one.",
        "Refunds: you can change your mind within 14 days of buying, as long as the code hasn't been redeemed: we refund you in full and cancel the code. Once it's redeemed, it can't be refunded, except under section 10. A code that expires unused isn't refunded.",
      ],
    },
    {
      heading: "9. Your right of withdrawal (EU and UK consumers)",
      paragraphs: [
        "If you are a consumer in the EU or the UK, you generally have the right to withdraw from a purchase within 14 days of the day you made it, without giving a reason. For Ethos for Two, the 14 days run from the day you subscribe or buy the pass.",
        "Unlocks, “Make it special”, upgrades and game packs are digital content that we supply as soon as your payment is confirmed. Your right of withdrawal ends when supply begins only if all of these apply: before paying, you expressly agreed that we start supplying it straight away, within the 14 days; you acknowledged that you would therefore lose your right of withdrawal; and we confirmed this to you in writing, for example in the purchase confirmation email. In that case you can't withdraw once it is on your account, but your rights if it is faulty (section 10) still apply. Gift cards are different: you keep the right to withdraw for 14 days as long as the code hasn't been redeemed (section 8).",
        "Ethos for Two, whether monthly, yearly or the one-year pass, is a digital service, and you keep the right to withdraw from it within those 14 days. Because you asked for it to start straight away, if you withdraw we refund what you paid minus an amount in proportion to the days it ran until you told us; if you paid without ticking the box, we refund you in full. Cancelling, which stops the renewals (section 7), isn't withdrawing: it keeps your membership until the end of the period you've paid for, and that period isn't refunded.",
        `This is how we ask. On Stripe's checkout page, before you can pay, you tick a box. For unlocks, “Make it special”, upgrades and game packs it reads: “${consent("en").unlock}” For Ethos for Two, monthly: “${consent("en").monthly}” Yearly: “${consent("en").yearly}” As a one-year pass: “${consent("en").pass}” Ticking it is your express request (and, for digital content, your acknowledgement), and your receipt email, or for Ethos for Two the welcome email, repeats it. For a gift card, the box reads: “${consent("en").giftcard}”`,
        "If, exceptionally, Stripe's page can't show the box, a notice directly above the Pay or Subscribe button says the same thing instead. Because you haven't ticked anything, that notice doesn't bind you: you keep the right to withdraw for 14 days, as with purchases made before our checkout had the box, and your receipt tells you so. For Ethos for Two, you're then refunded in full.",
        `Wherever you keep the right to withdraw, tell us clearly before the 14 days end: our “Withdraw from a purchase” page, linked in our site's footer and from your account page, opens an email to us with what we need, or you can write to ${E.email} with the email address you paid with and what you bought. You may use this model form, but you don't have to: “To ${E.name}, ${E.address}, ${E.email}: I hereby give notice that I withdraw from my contract for the supply of the following digital content or digital service: [what you bought]. Bought or subscribed on: [date]. Name: [ ]. Email address used for the purchase: [ ]. Date: [ ].”`,
        "We confirm by email that we've received your notice, and refund you within 14 days of receiving it, using the same payment method and at no cost to you: everything you paid or, for Ethos for Two you asked to start straight away, what you paid minus the days it ran. What you bought is removed from your account, and section 10 explains what then happens to gifts that use it. Ethos for Two ends at once for both of you and isn't charged again; if you paid for the days it ran, gifts you published in them stay online.",
      ],
    },
    {
      heading: "10. Faults, refunds and chargebacks",
      paragraphs: [
        `If something you bought, or a gift, doesn't work as described, you have the legal rights that apply to digital content and services: to have it put right or, if we can't do that within a reasonable time, to a price reduction or a refund. Tell us at ${E.email}.`,
        "Our guarantee. On top of those rights, if a gift you paid for won't open or play properly on the recipient's phone or computer and we can't fix it, tell us within 30 days of buying and we'll refund you in full. We also refund a duplicate purchase (for example if you were charged twice, or bought an unlock your account already had). Apart from these, sections 8 and 9 and your legal rights, we don't refund a purchase because you changed your mind.",
        "Refunds go back through Stripe to the payment method you used; when they appear depends on your bank.",
        "When a payment is refunded in full, or reversed by your bank (a chargeback), what it paid for is removed from the account it was added to. For Ethos for Two, a full refund of the period it's in, or a chargeback of any of its payments, ends the membership at once for both of you and stops its renewals; refunding an earlier period changes nothing else. Gifts that need what was removed are unpublished and return to your drafts, where the 7-day rule in section 5 applies, and gifts that only paid to remove the footer show it again. If a chargeback is decided in our favour, write to us and we'll restore the unlock. Please contact us before disputing a payment: we can usually sort things out faster.",
      ],
    },
    {
      heading: "11. Dates, plans, trips and places",
      paragraphs: [
        "Dates, plans and the long-distance tools are free and are for information and inspiration only. Place information comes from OpenStreetMap (map tiles from OpenFreeMap, details from Nominatim and Overpass), forecasts and sunset times from Open-Meteo, and photographs from Wikimedia Commons, credited to their authors. It is made by others and can be incomplete, out of date or wrong, especially opening hours, prices, accessibility and whether a place is still open at all.",
        `Saved dates and trips. Planning a date and sending it as a link needs no account, and the plan stays in your browser. To keep one, you can save it to your account: a free account keeps up to ${FREE_SAVED_DATES} saved dates and trips, and with Ethos for Two there's no limit (section 7). If a membership ends, nothing is deleted: the ${FREE_SAVED_DATES} changed most recently stay editable, and the others stay readable until you delete some or have Ethos for Two again. We never delete a saved date or trip unless you do, or you delete your account. With Ethos for Two you get an email the day before each saved date that has a day, and you can turn it off for each date.`,
        "Always check with the venue before you go, and use your own judgment about safety, weather, travel and local rules. We don't run, inspect or endorse any venue, we don't take bookings, and we aren't a party to anything you arrange with a venue or anyone else. To the extent the law allows, we aren't responsible for venues, their services, events or bookings, or for what happens on a date.",
        "Links from a place (directions, photos and reviews, Tripadvisor, Google, Yelp, a venue's website) open other services under their own terms. Where we show a rating from Tripadvisor or Google, it is theirs, shown with their name and a link to the source; we don't control or check it.",
        "Affiliate links. Some links are affiliate links, such as the buttons to search flights, tickets or car hire for a trip, which go to partners' sites through Travelpayouts, an affiliate network. If you book or buy through one, the partner may pay us a commission; it costs you nothing extra and doesn't change the price. We say so beside these links, and links inside a gift never carry one. A booking is a contract between you and the partner, under its terms: we don't sell travel, aren't a party to the booking and can't handle changes or refunds for it.",
        "How places are ordered: by our “date score”, which weighs distance from the point searched, the kind of place and its cuisine, how complete its map entry is (for example whether it lists a website or opening hours), whether it is a chain or takeaway-only, the star ratings couples have given it on the Service (weighted so that a handful of reviews can't dominate) and whether a real photograph of it exists. You can also sort by rating, distance or cost. No one pays for a place's position.",
      ],
    },
    {
      heading: "12. Reviews",
      paragraphs: [
        "If you're signed in, you can review a place: stars, what it cost for two, the occasion and a short text. You can post one review per place and edit or delete it at any time. Reviews are public: anyone can read them, shown with your first name (or “Somebody” if your profile has no name).",
        "Review rules: write only about a place you have been to, honestly and from your own experience. No defamation or false statements of fact about a venue or a person; no insults, hate or harassment; no personal details of other people, such as staff names or contact details; no advertising or self-promotion; no reviews of your own business or a competitor's, and none written in exchange for money, discounts or other benefits; nothing illegal.",
        "We don't check that reviewers have visited a place. To keep reviews genuine we require an account, allow one review per person per place, limit how often reviews can be posted, and remove reviews we find to be fake. Links and phone numbers are removed from review text automatically, and text written in capitals is changed to lower case. Every published review counts towards a place's rating; we don't pay for reviews and don't remove them for being negative.",
        "By posting a review you give us a worldwide, non-exclusive, royalty-free licence to publish it with your first name on the Service, and to count it in ratings and rankings, for as long as it is published. We may remove or restrict a review that breaks these rules or the law. Anyone can report a review (section 13).",
      ],
    },
    {
      heading: "13. Reporting illegal content, and how we moderate",
      paragraphs: [
        `Point of contact. Our single point of contact under the EU Digital Services Act, for users as well as for authorities, the European Commission and the European Board for Digital Services, is ${E.email}. You can write to us in English, Spanish or Latvian.`,
        `Reporting content. If you believe a gift, review, reaction or anything else on the Service is illegal or breaks these terms, email ${E.email} with: the link to the gift, or to the place and the review concerned; why you believe it is illegal or breaks our rules; your name and email address (not needed if you are reporting child sexual abuse material); and a statement that you believe in good faith that your report is accurate and complete. Rights holders can send copyright notices the same way.`,
        "What happens next. We confirm that we've received your report, review the content without undue delay, carefully and objectively, and tell you what we decided and how you can challenge it. Decisions are made by a person, not by an automated system. If content suggests a threat to someone's life or safety, we inform the authorities.",
        "If we act on your content or account. We don't review gifts or reviews before they're published, and we have no general obligation to monitor them. If we remove or restrict your content, or suspend or close your account, we'll tell you (if we have your email address) what we did and for how long, why (the law or the rule in these terms), whether it followed a report, and how you can challenge it, unless the law stops us.",
        `Challenging a decision. Within six months you can ask us to review any moderation decision, whether you posted the content or reported it, by replying to our message or writing to ${E.email}. We'll look at it again, reverse it if it was wrong and tell you the result. You can also go to court. We may stop handling reports from someone who repeatedly sends clearly unfounded ones, and suspend accounts that repeatedly post clearly illegal content.`,
      ],
    },
    {
      heading: "14. Our intellectual property",
      paragraphs: [
        `The Service, its templates, animations, code, design, brand, illustrations and library music belong to ${E.name} or its licensors. Publishing a gift doesn't give you any ownership of a template. You may not copy templates, or resell or sublicense access to the Service. The “${BRAND.watermark.en}” footer on free gifts and free replies may be removed only by unlocking the template.`,
        "Map data is © OpenStreetMap contributors and available under the Open Database Licence; photographs of places belong to their authors and are used under the licences shown with them.",
      ],
    },
    {
      heading: "15. Ending the relationship",
      paragraphs: [
        "You can delete individual gifts at any time, and your account from your account page. Deleting your account deletes your gifts, uploads, reactions, reviews, reminders, saved dates and trips, and unlocks at once (backup copies expire within 30 days) and can't be undone. It also cancels, at once, an Ethos for Two subscription you pay for on our site, without refunding the time left; if you subscribed in our iPhone app, cancel it in your iPhone's settings first, since only Apple can. What you bought isn't refunded when you delete your account, except where section 8, 9 or 10 applies. A record of each purchase is kept, no longer linked to you, for as long as tax law requires (see our Privacy Policy).",
        "We may suspend or close an account that seriously or repeatedly breaks these terms or the law, or where we must to protect the Service or other people. Where reasonable we'll warn you first, and we'll tell you why as section 13 describes.",
      ],
    },
    {
      heading: "16. Warranties and liability",
      paragraphs: [
        "We provide the Service with reasonable skill and care, and what you pay for will match its description. Beyond that and your statutory rights, we give no other promises: in particular, we don't guarantee that the Service will always be available or error-free, and the free parts of the Service are provided as they are.",
        "Nothing in these terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud, for damage we cause intentionally or through gross negligence, for your statutory rights as a consumer, or for anything else that can't be excluded or limited under the law that applies to you.",
        "Subject to that, we aren't liable for loss that wasn't reasonably foreseeable when you used the Service, for business losses (the Service is for personal use), or for loss you could reasonably have avoided, for example by keeping copies of your own photos and words. For any other claim connected to the Service, our total liability to you is limited to €100 or the amount you paid us in the 12 months before the claim arose, whichever is higher.",
      ],
    },
    {
      heading: "17. Changes to the Service and to these terms",
      paragraphs: [
        "We may change, add or retire templates and features for valid reasons, such as security, legal requirements, keeping the Service running or improving it. When we improve a template, gifts made with it show the improved version. If we retire a template, we stop offering it for new gifts, and gifts already published with it keep working. If a change affects your access to, or use of, something you paid for in more than a minor way, we'll tell you in advance, and you can end the contract for it free of charge within 30 days and get a proportionate refund.",
        "We may update these terms. We'll email account holders about material changes at least 14 days before they take effect; if you don't agree, you can stop using the Service and delete your account before then. If you keep using the Service after that date, the new terms apply. Changes never take away rights you already have for purchases you've made.",
      ],
    },
    {
      heading: "18. Governing law, complaints and disputes",
      paragraphs: [
        "These terms are governed by the laws of the Republic of Latvia. If you are a consumer, this doesn't take away the protection of the mandatory law of the country where you live. You can bring a claim in the courts of Latvia or of the country where you live, and we can bring a claim against you only in the courts of the country where you live. If you are not a consumer, the courts of Latvia have exclusive jurisdiction.",
        `If something goes wrong, please write to us first at ${E.email}: we aim to reply within 14 days. If we can't resolve your complaint, you can contact the Consumer Rights Protection Centre of Latvia (Patērētāju tiesību aizsardzības centrs, PTAC, ptac.gov.lv), or the consumer authority or out-of-court dispute resolution body in your own country. For cross-border complaints within the EU, the European Consumer Centre in your country can help.`,
      ],
    },
    {
      heading: "19. General",
      paragraphs: [
        "If a court finds part of these terms invalid, the rest still applies. If we don't enforce a right straight away, we haven't given it up. We may transfer the Service and these terms to another company that takes it over, as long as your rights aren't reduced; we'll tell you, and you can end the contract if you don't agree. These terms and the purchase process are available in English and Spanish. The current version is always on this page, and your purchases are recorded on your account page.",
      ],
    },
    {
      heading: "20. Contact",
      paragraphs: [`${E.name} · Reg. no. ${E.regNo} · VAT ${E.vat} · ${E.address} · ${E.email}`],
    },
  ],
};

const termsEs: LegalDoc = {
  title: "Términos del servicio",
  intro: `Estos términos regulan el uso de ${B} (el «Servicio»), operado por ${E.name}, número de registro ${E.regNo}, IVA ${E.vat}, ${E.address.replace("Latvia", "Letonia")} («nosotros»). Cubren todas las partes del Servicio: los regalos y todo lo que vendemos para ellos, Ethos for Two, el mapa de Citas, los planes, los viajes y las citas que guardas, las reseñas, los juegos, los recordatorios, nuestros correos y el programa de creadores. Al usar el Servicio, crear una cuenta, publicar un regalo o una reseña, o realizar una compra, los aceptas. Nuestra Política de privacidad explica cómo tratamos los datos personales. Si no estás de acuerdo, por favor no uses el Servicio.`,
  sections: [
    {
      heading: "1. Qué es el Servicio",
      paragraphs: [
        `${B} te permite crear una página web personalizada y animada (un «regalo») a partir de una plantilla, añadir tus fotos, música, vídeo y palabras, y compartirla mediante un enlace o un código QR. Dos plantillas, La carta y Constelaciones, son gratuitas. Las demás, y extras de pago como vídeo, mensajes de voz, más de 10 fotos, la programación, una contraseña o quitar el pie, se desbloquean con un pago único (sección 6). Una canción del catálogo de Apple Music es gratis en todos los regalos (sección 3).`,
        `El Servicio incluye además herramientas gratuitas para parejas: un mapa de ideas y sitios para citas (Citas), planes que puedes compartir, viajes, herramientas para parejas a distancia, reseñas de sitios y juegos para dos en el navegador. Con una cuenta gratuita también puedes guardar hasta ${FREE_SAVED_DATES} citas y viajes (sección 11). Ethos for Two, una suscripción para parejas, y los packs de juegos se venden aparte (secciones 6 y 7).`,
        "Los regalos son páginas web. Funcionan en las versiones actuales de los navegadores habituales de móvil y ordenador y necesitan conexión a internet. Algunas plantillas usan sonido y, si quien las ve lo permite, el micrófono (por ejemplo, para «soplar» las velas) o los sensores de movimiento.",
      ],
    },
    {
      heading: "2. Quién puede usar el Servicio y tu cuenta",
      paragraphs: [
        "El Servicio es para uso personal y no comercial. Debes tener al menos 16 años para crear una cuenta, publicar una reseña o comprar, y si tienes menos de 18 necesitas el permiso de tu madre, tu padre o tu tutor para comprar. El Servicio no está dirigido a menores.",
        "Puedes iniciar sesión con un enlace o un código que te enviamos por correo, o con Google (o Apple, cuando esté disponible). También puedes pagar sin iniciar sesión: en ese caso creamos tu cuenta con el correo que indiques al pagar y añadimos la compra a ella, así que asegúrate de que el correo es correcto. Si ya existe una cuenta con ese correo, la compra va a esa cuenta.",
        "Las cuentas son personales. Protege el acceso a tu correo y avísanos de inmediato si crees que otra persona ha usado tu cuenta. Eres responsable de todo lo que se publique desde tu cuenta, incluido lo que publique cualquier persona a la que dejes usarla.",
      ],
    },
    {
      heading: "3. Tu contenido",
      paragraphs: [
        "Conservas todos los derechos que tengas sobre las fotos, el vídeo, el audio, las grabaciones de voz y los textos que añadas a un regalo o a una reseña («Tu Contenido»). Nos concedes una licencia mundial, no exclusiva y gratuita para alojar, almacenar, copiar, redimensionar, recodificar, mostrar y transmitir Tu Contenido solo en la medida necesaria para prestar el Servicio: para mostrar un regalo a quienes tengan su enlace, para mostrártelo en tu panel y para publicar tus reseñas (sección 12). La licencia termina cuando borras el contenido o tu cuenta, salvo por las copias de seguridad rutinarias, hasta que caduquen.",
        "Confirmas que eres titular de Tu Contenido o tienes permiso para usarlo, incluida cualquier música que subas, y que no vulnera los derechos de autor ni otros derechos de nadie, ni su privacidad. Si Tu Contenido muestra o menciona a otras personas, eres responsable de contar con su permiso, y no debes incluir más datos suyos de los que necesita un regalo personal.",
        "La música de biblioteca del editor es nuestra y solo puede usarse dentro de los regalos creados en el Servicio. También puedes añadir gratis a cualquier regalo una canción del catálogo de Apple Music: el regalo la muestra junto a un enlace «Escúchala en Apple Music» a la canción completa y el crédito «Avance por cortesía de Apple Music», y su avance de 30 segundos solo suena cuando quien ve el regalo lo toca, y una sola vez. No vendemos canciones ni avances. Los avances, las portadas y las canciones pertenecen a Apple y a los titulares de los derechos, y los enlaces a canciones llevan a YouTube, Spotify o Apple Music: se reproducen desde esos servicios según sus condiciones y pueden dejar de funcionar si el proveedor los retira.",
        "El asistente de escritura opcional usa un modelo de IA para proponerte borradores a partir de los datos que le das. Los borradores pueden ser incorrectos o inadecuados, así que léelos antes de usarlos. Lo que publiques es Tu Contenido y es responsabilidad tuya.",
      ],
    },
    {
      heading: "4. Uso aceptable",
      paragraphs: [
        "No uses el Servicio para publicar ni enviar nada ilegal, difamatorio, acosador, amenazante o de odio; material sexualmente explícito; nada que sexualice o ponga en peligro a menores; contenido que infrinja la propiedad intelectual o la privacidad de alguien, incluidas fotos o datos personales de otras personas compartidos sin su permiso; ni nada pensado para engañar, como páginas de phishing, estafas o spam disfrazados de regalo.",
        "No intentes romper, sobrecargar, extraer datos de forma masiva ni hacer ingeniería inversa del Servicio; saltarte el pago, los límites de uso o la seguridad; publicar reseñas o reacciones de forma automatizada; ni acceder a regalos, salas de juego, cuentas o datos que no son tuyos. Los códigos de las salas de juego son cortos, así que cualquiera que tenga uno puede intentar entrar: no los compartas en público.",
        "Si se incumplen estas normas, podemos retirar contenido, limitar funciones, suspender o cerrar cuentas y comunicar el contenido ilegal a las autoridades cuando la ley lo exija o lo permita. La sección 13 explica cómo lo hacemos y cómo puedes impugnar una decisión.",
      ],
    },
    {
      heading: "5. Regalos: enlaces, programación, reacciones y almacenamiento",
      paragraphs: [
        "Cualquiera que tenga el enlace de un regalo publicado puede abrirlo. Los enlaces son difíciles de adivinar, pero no secretos: trátalos como una carta privada que entregas en mano. Cuando se comparte un enlace en una app de mensajería o en una red social, la vista previa puede mostrar el título del regalo o el nombre del destinatario.",
        "Con un desbloqueo puedes añadir una contraseña, que el destinatario necesitará para abrir el regalo, o programarlo: hasta la hora que elijas, el enlace muestra una pantalla de espera con tu nombre y la hora de apertura. Puedes editar un regalo publicado y los cambios aparecen en el mismo enlace. Puedes borrar un regalo en cualquier momento: el enlace deja de funcionar al instante y se eliminan sus archivos.",
        "Los destinatarios no necesitan cuenta. Pueden enviar una reacción al remitente: un emoji y, si quieren, una nota breve y un mensaje de voz de hasta 20 segundos. Las reacciones solo las ve el remitente del regalo, que además recibe por correo el emoji y la nota. Las reacciones deben respetar la sección 4.",
        "Si nos pides que te recordemos una fecha, como un cumpleaños, te escribimos nueve días antes cada año hasta que quites el recordatorio, desde la página de tu cuenta o con el enlace del correo.",
        "Los borradores guardados en tu cuenta que no se editan durante 7 días se borran automáticamente, junto con sus archivos. El Servicio no es un servicio de almacenamiento ni de copias de seguridad: guarda tus propias copias de las fotos, los vídeos y las palabras que te importan.",
        "Nuestro objetivo es que los enlaces funcionen indefinidamente, pero no podemos prometer disponibilidad ininterrumpida. Podemos retirar un regalo si incumple estos términos o la ley, si lo borras, si se cierra tu cuenta o si se reembolsa o se revierte el pago que lo desbloqueó (sección 10). Si alguna vez dejamos de ofrecer el Servicio, avisaremos por correo a los titulares de cuentas con al menos 90 días de antelación.",
      ],
    },
    {
      heading: "6. Qué vendemos: precios y pago",
      paragraphs: [
        "Todo lo que vendemos se paga una sola vez, salvo Ethos for Two, una suscripción que se renueva hasta que la cancelas (sección 7). En algunos periodos vendemos Ethos for Two como un pase de un año, en un solo pago: nuestra página de precios y la página de pago de Stripe siempre indican cuál de los dos estás comprando. Nada más se renueva ni se te vuelve a cobrar salvo que decidas comprarlo de nuevo.",
        `Nuestros precios, con el IVA incluido: una plantilla, ${P.es("single")}; tres plantillas a tu elección, ${P.es("pick3")}; «Todo», ${P.es("everything")}; «Hazlo especial», ${P.es("extras")}; Ethos for Two, ${M.es("monthly")} al mes o ${M.es("yearly")} al año o, como pase de un año, ${P.es("pass")} por 365 días; un pack de juegos, ${P.es("pack")}.`,
        "Desbloqueos: una plantilla, tres plantillas a tu elección o «Todo», que incluye todas las plantillas de regalo, también las que añadamos más adelante, mientras ofrezcamos plantillas de regalo. Cada desbloqueo cubre las plantillas indicadas, con todos sus extras de pago y sin el pie. «Todo» cubre solo las plantillas de regalo: no incluye los packs de juegos, Ethos for Two ni nada más que vendamos por separado.",
        "«Hazlo especial»: para La carta o Constelaciones, nuestras plantillas gratuitas, desbloquea los extras de pago de esa plantilla (vídeo, mensajes de voz, hasta 20 fotos, la programación, una contraseña y quitar el pie), igual que lo haría un desbloqueo de esa plantilla.",
        "Packs de juegos: rondas y cartas extra para nuestros juegos; cada pack se compra por separado. Ethos for Two: una suscripción para dos personas, mensual o anual, con citas y viajes guardados sin límite y compartidos entre los dos, todas las plantillas de regalo y todos los packs de juegos, mientras esté activa (sección 7). Tarjetas regalo: ahora mismo no están a la venta (sección 8).",
        "Los desbloqueos, «Hazlo especial» y los packs de juegos no caducan: permanecen en tu cuenta mientras exista tu cuenta y mantengamos el Servicio. Son personales e intransferibles.",
        "Añadir todas las plantillas al pagar. Cuando compras una plantilla o «Hazlo especial», puede que te ofrezcamos una casilla para añadir todas las demás plantillas por la diferencia entre ese precio y el de «Todo», de modo que en total pagues exactamente el precio de «Todo». Nunca está marcada de antemano. Si la marcas, tu compra es «Todo».",
        `Pasar a Todo. Si has iniciado sesión y ya compraste plantillas sueltas, tres plantillas o «Hazlo especial», puedes pasar a «Todo» por su precio menos lo que nos pagaste por esas compras, y nunca por menos de ${P.es("upgrade")}. El precio se calcula y se muestra antes de pagar.`,
        `Respuestas gratis. Cuando recibes un regalo que alguien ha pagado, hecho con una de nuestras plantillas de pago, el botón para devolver el detalle que aparece al final te permite hacer un regalo de respuesta con la misma plantilla, gratis. La respuesta gratuita lleva el pie «${BRAND.watermark.es}» y ningún extra de pago; si quieres añadir extras o quitar el pie, pagas el precio habitual de esa plantilla. Cada regalo pagado da para una respuesta gratuita, solo a través de su botón, y una respuesta gratuita no da para otra.`,
        "Sin códigos de descuento. No ofrecemos códigos de descuento ni promocionales, y la página de pago de Stripe no pide ninguno.",
        `Creadores. Algunas personas que publican sobre ${B} forman parte de nuestro programa de creadores: si compras después de llegar a través del enlace personal de un creador, le pagamos una comisión. No cambia tu precio, no hay ningún código que introducir y los creadores deben dejar claro en sus publicaciones que les pagamos.`,
        `Si eres creador del programa, te pagamos el ${CREATOR_COMMISSION_PCT} % de lo que recibimos por cada venta hecha a través de tu enlace personal, calculado sin el IVA y descontando reembolsos y contracargos: una venta que se reembolsa o se revierte no genera comisión. En Ethos for Two solo cuenta como venta su primer pago: las renovaciones no generan comisión. Pagamos cada mes, cuando lo que se te debe supera los ${CREATOR_PAYOUT_MIN_EUR} €; las cantidades menores se suman al mes siguiente. Solo cuentan las ventas hechas a través de tu enlace personal, y tus propias compras no generan comisión, aunque las hagas con tu propio enlace. Debes tener 18 años o más, decir en cada publicación que te pagamos y respetar la sección 4. Podemos sacarte del programa, o pedirte que retires una publicación, si incumple estos términos o la ley; la comisión ya generada por ventas auténticas se paga igualmente. La página del programa de creadores, y lo que acordemos contigo por correo, establecen el resto.`,
        "Los precios se muestran en nuestra web antes de pagar. Para los consumidores son precios finales, con el IVA incluido cuando corresponde. Cobramos en euros. Si pagas en otra moneda, Stripe puede convertir el precio al pagar, a su propio tipo de cambio y quizá con una comisión de conversión: el importe que aparece en la página de pago de Stripe, antes de confirmar, es el que pagas. Tu banco puede cobrar sus propias comisiones por pagos en moneda extranjera. Si alguna vez te cobramos más que el precio que te mostramos, te devolveremos la diferencia.",
        "Cómo funciona una compra: eliges qué comprar en nuestra web y pasas a la página de pago de Stripe (Stripe Checkout), donde ves el importe final, puedes revisar o corregir tus datos, o volver atrás, y marcas la casilla que describe la sección 9 antes de pagar. En Ethos for Two, la página indica además, justo encima del botón, por cuánto se renueva, cada cuánto y cómo cancelarla. El contrato se celebra cuando Stripe confirma el pago, y añadimos lo que has comprado a tu cuenta en ese mismo momento (el código de una tarjeta regalo te lo enviamos por correo). Te enviamos por correo una confirmación de la compra (en Ethos for Two, el correo de bienvenida), Stripe puede enviarte su propio recibo y tus compras aparecen en la página de tu cuenta. Los pagos los procesa Stripe; nunca vemos ni guardamos los datos completos de tu tarjeta. El cargo aparece en tu extracto con «ETHOS» en la descripción.",
      ],
    },
    {
      heading: "7. Ethos for Two",
      paragraphs: [
        `Ethos for Two es una suscripción para dos personas: tú, que la pagas, y otra persona a la que invitas. Puede ser mensual, por ${M.es("monthly")} al mes, o anual, por ${M.es("yearly")} al año, con el IVA incluido, y un solo pago cubre a los dos.`,
        "Mientras está activa, os da a los dos citas y viajes guardados sin límite, compartidos entre los dos y editables desde vuestros dos móviles; todas las plantillas de regalo, con todos sus extras de pago, y todos los packs de juegos; un correo el día antes de cada cita guardada que tenga fecha; y la opción de abrir una cita entera en Apple Maps o Google Maps. Te enviamos por correo un enlace de invitación; la otra persona se une abriéndolo e iniciando sesión en su propia cuenta (crearla es gratis).",
        "Se renueva automáticamente al final de cada mes o de cada año, al precio que se mostraba cuando te suscribiste y con cargo al medio de pago que usaste, hasta que la canceles. En la suscripción anual te escribimos una semana antes de cada renovación con la fecha y el importe.",
        "Puedes cancelarla en cualquier momento desde la página de tu cuenta, o desde la página de facturación de Stripe que se abre desde ella. Cancelar detiene las renovaciones: la suscripción sigue activa hasta el final del mes o del año que has pagado, después termina y no se cobra nada más. El resto de ese periodo no se reembolsa, salvo según las secciones 9 y 10. Cancelar no es desistir: la sección 9 explica tu derecho a desistir en un plazo de 14 días.",
        "Si no se puede cobrar una renovación, Stripe vuelve a intentarlo durante los días siguientes y te avisamos por correo. La suscripción sigue activa hasta 7 días después del final del periodo mientras lo intenta, y termina si el pago sigue sin completarse. Puedes pasar de mensual a anual cuando quieras desde la página de tu cuenta: el cambio es inmediato y lo que queda del mes que has pagado se descuenta del primer año. El paso de anual a mensual se hace en la renovación: lo hacemos un par de días antes de que termine tu año y descontamos lo que queda de él de tu primer pago mensual, así que no pierdes nada.",
        "Compartirla con tu pareja. Otra cuenta puede unirse a tu suscripción. Mientras la compartís, cada uno puede ver y editar las citas y los viajes guardados del otro, y ve su nombre. Tu pareja puede salir, y tú puedes quitarla, en cualquier momento desde la página de la cuenta: se deja de compartir al instante, lo que desbloquea la suscripción se retira de su cuenta, cada uno conserva las citas que guardó y tu enlace de invitación cambia, para que puedas invitar a otra persona. Si eliminas tu cuenta, la suscripción termina para los dos (sección 15); si tu pareja elimina la suya, sigue contigo.",
        "Cambios de precio. Si cambiamos el precio de Ethos for Two, una suscripción que ya tienes mantiene su precio hasta una renovación que llegue al menos 30 días después de que te lo hayamos comunicado por correo, y puedes cancelarla antes sin pagar nada más. Un precio nuevo nunca se aplica a un periodo que ya has pagado.",
        "Cuando termina, lo que desbloqueaba deja de estar disponible para los dos en regalos y juegos nuevos. Los regalos que publicasteis mientras estaba activa siguen en línea tal cual; para publicar regalos nuevos con plantillas o extras de pago, o para cambiar los extras de pago de uno ya publicado, hace falta un desbloqueo o volver a tener Ethos for Two. Lo que cualquiera de los dos haya comprado por separado, como «Todo», sigue siendo suyo, y también vuestras citas y viajes guardados (sección 11). Si se reembolsa o su pago se revierte, termina para los dos en ese momento (sección 10).",
        `El pase de un año. En algunos periodos vendemos Ethos for Two como un pase: ${P.es("pass")}, en un solo pago, durante 365 días desde que se confirma el pago, con todo lo anterior. No se renueva solo y nunca te volvemos a cobrar salvo que tú lo decidas. Catorce días antes de que termine, escribimos a quien lo compró con la fecha de fin y cómo seguir. Mientras el pase esté a la venta, al renovarlo se suman 365 días desde el día en que termina el pase actual, al precio que se muestre entonces, así que renovar antes no te hace perder nada; si no lo renuevas, no pasa nada y no se cobra nada.`,
        "Al suscribirte o comprar el pase, pides en el pago que empiece de inmediato, con la casilla que describe la sección 9, y aun así puedes desistir en un plazo de 14 días. Una renovación del pase comprada antes de que termine tu pase actual solo empieza cuando ese pase termina. Las suscripciones compradas en nuestra app para iPhone las vende y las cobra Apple, según sus condiciones: se gestionan y se cancelan en los ajustes de tu iPhone, y Apple se encarga de sus renovaciones y reembolsos. Lo que incluyen, y compartirlas con tu pareja, funciona como describe esta sección.",
      ],
    },
    {
      heading: "8. Tarjetas regalo",
      paragraphs: [
        "Ahora mismo no vendemos tarjetas regalo. Esta sección se aplica a cualquier código de tarjeta regalo que hayamos emitido y a las tarjetas regalo que vendamos en el futuro.",
        "Una tarjeta regalo «Regálalo todo» es un código que enviamos por correo a quien la compra, para que lo entregue como quiera. Quien lo canjee en el Servicio, con la sesión iniciada en su propia cuenta, recibe «Todo» en esa cuenta, como si lo hubiera comprado (sección 6).",
        "Un código puede canjearse una sola vez, en un plazo de 24 meses desde la compra; después caduca. No puede canjearse por dinero, revenderse, dividirse ni usarse para ninguna otra cosa. Una cuenta que ya tiene «Todo» no puede canjearlo, así que el código no se gasta y se puede regalar a otra persona.",
        "Trata el código como si fuera dinero: cualquiera que lo tenga puede canjearlo. Si un código no se ha canjeado y crees que otra persona lo tiene, escríbenos y podremos anularlo y enviarte uno nuevo.",
        "Reembolsos: puedes cambiar de opinión en un plazo de 14 días desde la compra, siempre que el código no se haya canjeado: te devolvemos el importe íntegro y anulamos el código. Una vez canjeado no se reembolsa, salvo según la sección 10. Un código que caduca sin usarse no se reembolsa.",
      ],
    },
    {
      heading: "9. Tu derecho de desistimiento (consumidores de la UE y del Reino Unido)",
      paragraphs: [
        "Si eres consumidor en la UE o en el Reino Unido, por lo general tienes derecho a desistir de una compra en un plazo de 14 días desde el día en que la hiciste, sin dar ninguna explicación. En Ethos for Two, los 14 días cuentan desde el día en que te suscribes o compras el pase.",
        "Los desbloqueos, «Hazlo especial», el paso a «Todo» y los packs de juegos son contenido digital que suministramos en cuanto se confirma el pago. Tu derecho de desistimiento termina al empezar el suministro solo si se cumple todo lo siguiente: antes de pagar, aceptaste expresamente que empezáramos a suministrarlo de inmediato, dentro de los 14 días; reconociste que por ello perderías tu derecho de desistimiento; y te lo confirmamos por escrito, por ejemplo en el correo de confirmación de la compra. En ese caso no puedes desistir una vez que está en tu cuenta, pero conservas tus derechos si es defectuoso (sección 10). Las tarjetas regalo son distintas: conservas el derecho de desistimiento durante 14 días mientras el código no se haya canjeado (sección 8).",
        "Ethos for Two, ya sea mensual, anual o el pase de un año, es un servicio digital, y conservas el derecho a desistir de él dentro de esos 14 días. Como pediste que empezara de inmediato, si desistes te devolvemos lo que pagaste menos un importe proporcional a los días que estuvo activo hasta que nos lo comunicaste; si pagaste sin marcar la casilla, te devolvemos el importe íntegro. Cancelar, que detiene las renovaciones (sección 7), no es desistir: conservas la suscripción hasta el final del periodo que has pagado, y ese periodo no se reembolsa.",
        `Así lo pedimos. En la página de pago de Stripe, antes de poder pagar, marcas una casilla. En los desbloqueos, «Hazlo especial», el paso a «Todo» y los packs de juegos dice: «${consent("es").unlock}» En Ethos for Two, mensual: «${consent("es").monthly}» Anual: «${consent("es").yearly}» Como pase de un año: «${consent("es").pass}» Marcarla es tu solicitud expresa (y, en el contenido digital, tu reconocimiento), y el correo con el recibo, o en Ethos for Two el de bienvenida, lo repite. En una tarjeta regalo, la casilla dice: «${consent("es").giftcard}»`,
        "Si, de forma excepcional, la página de Stripe no puede mostrar la casilla, un aviso justo encima del botón de pagar o de suscribirse dice lo mismo en su lugar. Como no has marcado nada, ese aviso no te obliga: conservas el derecho a desistir durante 14 días, igual que en las compras hechas antes de que nuestra página de pago tuviera la casilla, y tu recibo te lo indica. En Ethos for Two, te devolvemos entonces el importe íntegro.",
        `Siempre que conserves el derecho de desistimiento, comunícanoslo de forma clara antes de que terminen los 14 días: nuestra página «Desistir de una compra», enlazada en el pie de nuestra web y desde la página de tu cuenta, abre un correo para nosotros con lo que necesitamos, o puedes escribir a ${E.email} con el correo con el que pagaste y lo que compraste. Puedes usar este modelo de formulario, aunque no es obligatorio: «A la atención de ${E.name}, ${E.address.replace("Latvia", "Letonia")}, ${E.email}: por la presente le comunico que desisto de mi contrato de suministro del siguiente contenido o servicio digital: [lo que compraste]. Comprado o suscrito el: [fecha]. Nombre: [ ]. Correo usado en la compra: [ ]. Fecha: [ ].»`,
        "Te confirmamos por correo que hemos recibido tu comunicación y te hacemos el reembolso en un plazo de 14 días desde que la recibamos, con el mismo medio de pago y sin ningún coste para ti: todo lo que pagaste o, en Ethos for Two si pediste que empezara de inmediato, lo que pagaste menos los días que estuvo activo. Retiramos de tu cuenta lo que compraste, y la sección 10 explica qué pasa entonces con los regalos que lo usan. Ethos for Two termina en ese momento para los dos y no se vuelve a cobrar; si pagaste por los días que estuvo activo, los regalos que publicasteis en esos días siguen en línea.",
      ],
    },
    {
      heading: "10. Defectos, reembolsos y contracargos",
      paragraphs: [
        `Si algo que has comprado, o un regalo, no funciona como se describe, tienes los derechos legales que corresponden al contenido y los servicios digitales: que se ponga en conformidad o, si no podemos hacerlo en un plazo razonable, una reducción del precio o el reembolso. Escríbenos a ${E.email}.`,
        "Nuestra garantía. Además de esos derechos, si un regalo que has pagado no se abre o no se reproduce bien en el móvil o el ordenador de quien lo recibe y no podemos arreglarlo, avísanos en los 30 días siguientes a la compra y te devolvemos el importe íntegro. También reembolsamos una compra duplicada (por ejemplo, si se te cobró dos veces o compraste un desbloqueo que tu cuenta ya tenía). Fuera de estos casos, de las secciones 8 y 9 y de tus derechos legales, no reembolsamos una compra porque hayas cambiado de opinión.",
        "Los reembolsos se hacen a través de Stripe al medio de pago que usaste; cuándo aparecen depende de tu banco.",
        "Cuando un pago se reembolsa por completo, o tu banco lo revierte (un contracargo), lo que pagaba se retira de la cuenta a la que se añadió. En Ethos for Two, el reembolso completo del periodo en curso, o un contracargo de cualquiera de sus pagos, pone fin a la suscripción para los dos en ese momento y detiene sus renovaciones; reembolsar un periodo anterior no cambia nada más. Los regalos que necesitan lo retirado se despublican y vuelven a tus borradores, donde se aplica la regla de los 7 días de la sección 5, y los que solo pagaban por quitar el pie vuelven a mostrarlo. Si un contracargo se resuelve a nuestro favor, escríbenos y restableceremos el desbloqueo. Contacta con nosotros antes de impugnar un pago: normalmente podemos solucionarlo antes.",
      ],
    },
    {
      heading: "11. Citas, planes, viajes y sitios",
      paragraphs: [
        "Citas, los planes y las herramientas a distancia son gratuitos y sirven solo como información e inspiración. La información de los sitios procede de OpenStreetMap (teselas del mapa de OpenFreeMap, detalles de Nominatim y Overpass); la previsión y la hora de la puesta de sol, de Open-Meteo; y las fotografías, de Wikimedia Commons, con el crédito de sus autores. La elaboran otros y puede estar incompleta, desactualizada o equivocada, sobre todo en cuanto a horarios, precios, accesibilidad y si un sitio sigue abierto.",
        `Citas y viajes guardados. Planear una cita y enviarla como enlace no requiere cuenta, y el plan se queda en tu navegador. Si quieres conservarlo, puedes guardarlo en tu cuenta: una cuenta gratuita guarda hasta ${FREE_SAVED_DATES} citas y viajes, y con Ethos for Two no hay límite (sección 7). Si una suscripción termina, no se borra nada: las ${FREE_SAVED_DATES} que se cambiaron más recientemente siguen siendo editables, y las demás se pueden seguir consultando hasta que borres algunas o vuelvas a tener Ethos for Two. Nunca borramos una cita o un viaje guardado salvo que lo hagas tú o elimines tu cuenta. Con Ethos for Two recibes un correo el día antes de cada cita guardada que tenga fecha, y puedes desactivarlo en cada cita.`,
        "Consulta siempre con el local antes de ir y usa tu propio criterio en cuanto a seguridad, tiempo, desplazamientos y normas locales. No gestionamos, inspeccionamos ni avalamos ningún local, no hacemos reservas y no somos parte de nada que acuerdes con un local o con otra persona. En la medida en que la ley lo permita, no respondemos de los locales, sus servicios, eventos o reservas, ni de lo que ocurra en una cita.",
        "Los enlaces de un sitio (cómo llegar, fotos y reseñas, Tripadvisor, Google, Yelp, la web del local) abren otros servicios sujetos a sus propias condiciones. Cuando mostramos una valoración de Tripadvisor o de Google, es suya, se muestra con su nombre y un enlace a la fuente, y no la controlamos ni la comprobamos.",
        "Enlaces de afiliado. Algunos enlaces son de afiliado, como los botones para buscar vuelos, entradas o alquiler de coches para un viaje, que llevan a webs de socios a través de Travelpayouts, una red de afiliación. Si reservas o compras a través de uno, puede que el socio nos pague una comisión; no te cuesta nada más ni cambia el precio. Lo indicamos junto a esos enlaces, y los enlaces que hay dentro de un regalo nunca son de afiliado. La reserva es un contrato entre tú y el socio, según sus condiciones: no vendemos viajes, no somos parte de la reserva y no podemos gestionar cambios ni reembolsos de ella.",
        "Cómo se ordenan los sitios: por nuestra «puntuación para citas», que tiene en cuenta la distancia al punto buscado, el tipo de sitio y su cocina, lo completa que está su ficha en el mapa (por ejemplo, si indica web u horario), si es una cadena o solo para llevar, las estrellas que le han dado las parejas en el Servicio (ponderadas para que unas pocas reseñas no pesen demasiado) y si existe una fotografía real del sitio. También puedes ordenar por valoración, distancia o precio. Nadie paga por la posición de un sitio.",
      ],
    },
    {
      heading: "12. Reseñas",
      paragraphs: [
        "Si has iniciado sesión, puedes reseñar un sitio: estrellas, lo que costó para dos, la ocasión y un texto breve. Puedes publicar una reseña por sitio y editarla o borrarla cuando quieras. Las reseñas son públicas: cualquiera puede leerlas, junto con tu nombre de pila (o «Alguien» si tu perfil no tiene nombre).",
        "Normas de las reseñas: escribe solo sobre sitios en los que hayas estado, con honestidad y desde tu propia experiencia. Nada de difamación ni de afirmaciones falsas sobre un local o una persona; nada de insultos, odio o acoso; ningún dato personal de otras personas, como nombres del personal o datos de contacto; nada de publicidad ni autopromoción; ninguna reseña de tu propio negocio o de la competencia, ni reseñas a cambio de dinero, descuentos u otras ventajas; nada ilegal.",
        "No comprobamos que quien reseña haya visitado el sitio. Para que las reseñas sean auténticas exigimos una cuenta, permitimos una reseña por persona y sitio, limitamos la frecuencia de publicación y retiramos las reseñas que resulten falsas. Los enlaces y los números de teléfono se eliminan automáticamente del texto, y el texto escrito en mayúsculas se pasa a minúsculas. Todas las reseñas publicadas cuentan para la valoración de un sitio; no pagamos por reseñas ni las retiramos por ser negativas.",
        "Al publicar una reseña nos concedes una licencia mundial, no exclusiva y gratuita para publicarla con tu nombre de pila en el Servicio y contarla en valoraciones y clasificaciones mientras siga publicada. Podemos retirar o limitar una reseña que incumpla estas normas o la ley. Cualquiera puede denunciar una reseña (sección 13).",
      ],
    },
    {
      heading: "13. Denuncia de contenido ilegal y cómo moderamos",
      paragraphs: [
        `Punto de contacto. Nuestro punto único de contacto según el Reglamento de Servicios Digitales de la UE, tanto para usuarios como para las autoridades, la Comisión Europea y la Junta Europea de Servicios Digitales, es ${E.email}. Puedes escribirnos en inglés, español o letón.`,
        `Cómo denunciar contenido. Si crees que un regalo, una reseña, una reacción o cualquier otro contenido del Servicio es ilegal o incumple estos términos, escribe a ${E.email} indicando: el enlace al regalo, o al sitio y la reseña en cuestión; por qué crees que es ilegal o incumple nuestras normas; tu nombre y tu correo (no hacen falta si denuncias material de abuso sexual infantil); y una declaración de que crees de buena fe que tu denuncia es exacta y completa. Los titulares de derechos pueden enviar por la misma vía sus avisos sobre derechos de autor.`,
        "Qué pasa después. Te confirmamos que hemos recibido la denuncia, revisamos el contenido sin demoras indebidas, con diligencia y objetividad, y te comunicamos lo que hemos decidido y cómo puedes impugnarlo. Las decisiones las toma una persona, no un sistema automatizado. Si un contenido hace pensar que la vida o la seguridad de alguien corre peligro, avisamos a las autoridades.",
        "Si actuamos sobre tu contenido o tu cuenta. No revisamos los regalos ni las reseñas antes de que se publiquen y no tenemos una obligación general de supervisarlos. Si retiramos o limitamos tu contenido, o suspendemos o cerramos tu cuenta, te diremos (si tenemos tu correo) qué hemos hecho y durante cuánto tiempo, por qué (la ley o la norma de estos términos), si fue a raíz de una denuncia y cómo puedes impugnarlo, salvo que la ley nos lo impida.",
        `Cómo impugnar una decisión. En un plazo de seis meses puedes pedirnos que revisemos cualquier decisión de moderación, tanto si publicaste el contenido como si lo denunciaste, respondiendo a nuestro mensaje o escribiendo a ${E.email}. Lo volveremos a estudiar, lo corregiremos si nos equivocamos y te diremos el resultado. También puedes acudir a los tribunales. Podemos dejar de tramitar las denuncias de quien envíe repetidamente denuncias manifiestamente infundadas y suspender las cuentas que publiquen repetidamente contenido manifiestamente ilegal.`,
      ],
    },
    {
      heading: "14. Nuestra propiedad intelectual",
      paragraphs: [
        `El Servicio, sus plantillas, animaciones, código, diseño, marca, ilustraciones y música de biblioteca pertenecen a ${E.name} o a sus licenciantes. Publicar un regalo no te da ninguna propiedad sobre una plantilla. No puedes copiar plantillas ni revender o sublicenciar el acceso al Servicio. El pie «${BRAND.watermark.es}» de los regalos gratuitos y de las respuestas gratuitas solo puede quitarse desbloqueando la plantilla.`,
        "Los datos del mapa son © colaboradores de OpenStreetMap y están disponibles bajo la Open Database License; las fotografías de los sitios pertenecen a sus autores y se usan con las licencias que las acompañan.",
      ],
    },
    {
      heading: "15. Fin de la relación",
      paragraphs: [
        "Puedes borrar regalos concretos en cualquier momento, y tu cuenta desde la página de tu cuenta. Al eliminar tu cuenta se borran de inmediato tus regalos, archivos, reacciones, reseñas, recordatorios, citas y viajes guardados y desbloqueos (las copias de seguridad caducan en un plazo de 30 días), y no se puede deshacer. También se cancela en ese momento la suscripción a Ethos for Two que pagues en nuestra web, sin reembolsar el tiempo que quede; si te suscribiste en nuestra app para iPhone, cancélala antes en los ajustes de tu iPhone, porque solo Apple puede hacerlo. Lo que hayas comprado no se reembolsa al eliminar la cuenta, salvo en los casos de las secciones 8, 9 y 10. Conservamos un registro de cada compra, ya sin vincularlo a ti, durante el tiempo que exige la normativa fiscal (consulta nuestra Política de privacidad).",
        "Podemos suspender o cerrar una cuenta que incumpla estos términos o la ley de forma grave o reiterada, o cuando sea necesario para proteger el Servicio o a otras personas. Cuando sea razonable te avisaremos antes, y te explicaremos el motivo como se indica en la sección 13.",
      ],
    },
    {
      heading: "16. Garantías y responsabilidad",
      paragraphs: [
        "Prestamos el Servicio con una diligencia y un cuidado razonables, y lo que pagas se corresponderá con su descripción. Aparte de eso y de tus derechos legales, no damos otras garantías: en particular, no garantizamos que el Servicio esté siempre disponible o sin errores, y las partes gratuitas del Servicio se ofrecen tal cual.",
        "Nada en estos términos excluye ni limita nuestra responsabilidad por muerte o daños personales causados por nuestra negligencia, por fraude, por daños causados de forma intencionada o por negligencia grave, por tus derechos legales como consumidor ni por nada que no pueda excluirse o limitarse según la ley que te sea aplicable.",
        "Con esa salvedad, no respondemos de pérdidas que no fueran razonablemente previsibles cuando usaste el Servicio, de pérdidas empresariales (el Servicio es para uso personal) ni de pérdidas que podrías haber evitado razonablemente, por ejemplo guardando copias de tus propias fotos y textos. Para cualquier otra reclamación relacionada con el Servicio, nuestra responsabilidad total frente a ti se limita a 100 € o al importe que nos hayas pagado en los 12 meses anteriores a la reclamación, lo que sea mayor.",
      ],
    },
    {
      heading: "17. Cambios en el Servicio y en estos términos",
      paragraphs: [
        "Podemos cambiar, añadir o retirar plantillas y funciones por motivos válidos, como la seguridad, requisitos legales, el mantenimiento del Servicio o su mejora. Cuando mejoramos una plantilla, los regalos creados con ella muestran la versión mejorada. Si retiramos una plantilla, dejamos de ofrecerla para regalos nuevos, y los regalos ya publicados con ella siguen funcionando. Si un cambio afecta de forma no menor a tu acceso o al uso de algo que has pagado, te avisaremos con antelación y podrás resolver el contrato sobre ello sin coste en un plazo de 30 días y recibir un reembolso proporcional.",
        "Podemos actualizar estos términos. Avisaremos por correo a los titulares de cuentas de los cambios relevantes con al menos 14 días de antelación; si no estás de acuerdo, puedes dejar de usar el Servicio y eliminar tu cuenta antes de esa fecha. Si sigues usando el Servicio después, se aplicarán los nuevos términos. Los cambios nunca te quitan derechos que ya tengas por compras realizadas.",
      ],
    },
    {
      heading: "18. Ley aplicable, reclamaciones y conflictos",
      paragraphs: [
        "Estos términos se rigen por las leyes de la República de Letonia. Si eres consumidor, esto no te priva de la protección de las normas imperativas del país en el que resides. Puedes presentar una reclamación ante los tribunales de Letonia o del país en el que resides, y nosotros solo podemos demandarte ante los tribunales del país en el que resides. Si no eres consumidor, los tribunales de Letonia tienen competencia exclusiva.",
        `Si algo va mal, escríbenos primero a ${E.email}: intentamos responder en un plazo de 14 días. Si no conseguimos resolver tu reclamación, puedes dirigirte al Centro de Protección de los Derechos del Consumidor de Letonia (Patērētāju tiesību aizsardzības centrs, PTAC, ptac.gov.lv) o a la autoridad de consumo o al organismo de resolución extrajudicial de conflictos de tu país. Para reclamaciones transfronterizas dentro de la UE, puede ayudarte el Centro Europeo del Consumidor de tu país.`,
      ],
    },
    {
      heading: "19. Disposiciones generales",
      paragraphs: [
        "Si un tribunal declara nula una parte de estos términos, el resto sigue siendo válido. Si no ejercemos un derecho de inmediato, no renunciamos a él. Podemos transferir el Servicio y estos términos a otra empresa que se haga cargo de él, siempre que no se reduzcan tus derechos; te lo comunicaremos y podrás resolver el contrato si no estás de acuerdo. Estos términos y el proceso de compra están disponibles en inglés y en español. La versión vigente está siempre en esta página, y tus compras quedan registradas en la página de tu cuenta.",
      ],
    },
    {
      heading: "20. Contacto",
      paragraphs: [`${E.name} · N.º de registro ${E.regNo} · IVA ${E.vat} · ${E.address.replace("Latvia", "Letonia")} · ${E.email}`],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  intro: `${E.name} (“we”), registration number ${E.regNo}, ${E.address}, is the controller of the personal data processed through ${B}: the website, gifts, purchases (Ethos for Two and gift cards included), the Dates map, plans, trips and saved dates, reviews, games, reminders, the waitlist, the creator programme and our emails. This policy explains what we collect, why, who else is involved, how long we keep it, and your rights under the General Data Protection Regulation (GDPR). Questions and requests: ${E.email}.`,
  sections: [
    {
      heading: "1. Data from people who make gifts or buy",
      paragraphs: [
        "Account data: your email address; your name, if your Google or Apple account shares it; your language; your sign-in history, including the time and IP address of sign-ins; and, if you sign in with Google or Apple, the identifier and basic profile details (such as your name and a link to your profile picture) that they share.",
        "Gift content: the names, title, message, photos and captions, music you choose or upload, voice messages, video clips, song links, dates, places and other details you add, plus the gift's settings; a password is stored only as a secure hash. Photos are resized and re-encoded on your device before upload, which removes their metadata, such as where they were taken. Video and audio files are uploaded as they are, so any metadata they contain stays in them.",
        "Drafts: while you edit, your draft is kept in your browser's storage on your device and, if you're signed in, saved to your account, where photos upload as soon as you add them.",
        "Purchase data: what you bought, when, the amount and currency, the payment status, the link that brought you to us (such as one of our posts, a creator's personal link or the button at the end of a gift), and Stripe's identifiers for the transaction. Stripe collects your payment details and email address; your card details go straight to Stripe and we never receive them. What we send Stripe with a checkout names what you're buying, your language, that link, the ID of your account with us and whether you asked for the checkout reminder, never a gift, a name or a note. We record the box you ticked at checkout (the sentence itself), asking for your purchase to be unlocked, or Ethos for Two to start, straight away, and when: it's how we show what you asked for (Terms, section 9). If you arrived through a creator's personal link, the creator's code is recorded with the purchase. If you make a free reply, we record that its link has been used, and for which gift, so that each link gives one free reply. For a gift card, we keep its code, the name and note you add for the recipient, and when and by which account it was redeemed.",
        "Ethos for Two: whether it's monthly, yearly or a pass; when it started, the period paid for and when it ends; whether it renews and whether a payment is outstanding; its invite code and, once the other person joins, which account joined; and a record of each payment. For a subscription, Stripe keeps a customer record for you (your name and email address, your billing address or country, and the card you pay with, which only Stripe sees) with the subscription's status and invoices, and we keep Stripe's identifiers for the customer and the subscription. For a membership bought in our iPhone app, we keep Apple's transaction identifiers, which reach us through RevenueCat.",
        "Searches and helpers: when you search for a song, our servers send your search words to Apple's iTunes Search; when you paste a song link, they ask YouTube or Spotify for its title and cover. If you use “Help me write it”, what you type into it, with the occasion and the names on the gift, is sent to Anthropic to write the drafts; we don't store it.",
        "Emails we send, and how to stop each one. Sign-in links and codes, and a welcome email when your account is made: only when you sign in or sign up. Receipts: one for each purchase, with a gift card's code or the Ethos for Two invite link when you buy one (for an Ethos for Two subscription, the welcome email is the confirmation); they are part of the purchase and can't be switched off.",
        "Gift notifications, to the person who made the gift: when it is published or scheduled, when it is opened for the first time, when a scheduled gift opens, and when a reaction arrives. Deleting the gift stops them; to stop them for a gift you keep, reply to one of them or write to us.",
        "Ethos for Two, to the person who pays: a welcome email with your plan and the invite link, which confirms your membership; for a yearly membership, an email a week before each renewal; an email if a payment doesn't go through or your bank asks you to confirm it; and one when the membership has ended (never after a refund or a withdrawal). These are service emails, part of the contract. For a one-year pass: the welcome email and one email 14 days before it ends, with the date and how to carry on; it comes once for each pass year, and to stop it, reply to it or write to us.",
        "Reminders: if you ask us to remind you of a date, we store the name you give, the occasion, the day and month, your language, the gift's template and the year we last emailed you, linked to your account, and email you nine days before the date each year. You can remove a reminder from your account page or with the link in each email.",
        "Date reminders: while you have Ethos for Two, a saved date with a day set sends you and your partner an email the day before, each in your own language, with its stops and notes. You can turn it off for each date in My dates, or with the link in the email.",
        "The checkout reminder: only if you ask for it and then leave without paying, we send you one email with a link back to that checkout. You ask by ticking the box on Stripe's checkout page agreeing to hear from us, where Stripe shows one. It is never ticked for you, and you can pay without ticking it. It is one email, not a series: at most one to an address in any week, however many checkouts are left unpaid, and none if you've paid since. It has an unsubscribe link (your mail app may also show its own unsubscribe button); if you use it, we keep a one-way hash of your address (not the address itself) on a list we check before sending it, and ticking the box again on a later checkout doesn't take you off it.",
        "Offers inside our emails: a receipt for single templates, three templates or “Make it special” may say what “Everything” would now cost you, and the email about a first opening may suggest starting your next gift. If your address is on the unsubscribe list, we leave these out; to be added without a checkout reminder, reply to any of our emails or write to us. Apart from these, and the one launch email to people on the Ethos for Two waitlist (section 6), we send no other emails and no newsletters.",
      ],
    },
    {
      heading: "2. Data about people who open a gift",
      paragraphs: [
        "When a gift is opened, we record a pseudonymous visitor code, the type of device (iPhone or iPad, Android, computer or other), the time, and how much of the gift was watched, so the sender can see it arrived. The code is a one-way hash of your IP address and browser details together with the gift and the date; we don't store your IP address with it. Your browser keeps a note for 24 hours so that reloading doesn't count as a new open.",
        "If you send a reaction, the emoji, note and voice message you choose to send are stored and shown only to the sender, who also receives the emoji and the note by email. If a gift has a password, your browser keeps it, encrypted, in a cookie for up to a year so you don't have to type it again. We don't ask recipients for their name or email address.",
        "Some templates ask to use your microphone (for example to “blow out” candles) or your phone's motion sensors. That input is analysed on your device only; it isn't recorded or sent to us. If a gift includes a song from Apple Music or a song link, your browser loads the song's cover directly from Apple, YouTube or Spotify, which receive your IP address; an Apple Music preview is loaded from Apple only if you tap to hear it, and tapping a link opens that service under its own privacy policy.",
      ],
    },
    {
      heading: "3. Dates, maps, plans, trips and long distance",
      paragraphs: [
        "The Dates pages, plans and long-distance tools work without an account. To show places near you we need a location: a town you type, which our servers look up with Photon (run by komoot); the rough, city-level location our hosting provider works out from your connection, which we use only to open the map on your city and don't store; or, only if you press “Near me” and your browser agrees, your device's position. Your browser rounds a position to a grid of about a hundred metres before anything is sent to our servers. We don't store positions or link them to you, although, like any request, they can appear briefly in our host's technical logs. A search made with “Near me” is never written into the page's address. Your browser remembers the last area you searched, on your device only.",
        "The map is drawn from OpenFreeMap: your browser downloads map tiles directly from tiles.openfreemap.org, which therefore receives your IP address, as any website you visit does. Photographs of places load directly from Wikimedia's servers, which also receive your IP address. To find places and show a place's details, the forecast or a town's name, our servers ask OpenFreeMap, Nominatim (run by the OpenStreetMap Foundation), public Overpass servers, Open-Meteo, Photon and Wikimedia (Wikipedia, Wikidata and Commons) and, where we have turned them on, Tripadvisor and Google for their ratings. Those requests carry only rounded coordinates, a place's name or the text you searched for, never your name, your IP address or anything about your device.",
        "A plan you build is kept in your browser's local storage and is sent to us only if you save it to your account. When you share it, the plan travels inside the link itself, in the part after the “#”, which browsers don't send to servers: whoever has the link can read the plan, and we can't. Treat the link like the invitation it is. Links you follow from a place (directions, photos and reviews, Tripadvisor, Google, Yelp, a venue's website) open other services under their own privacy policies.",
        "Saved dates and trips: if you save a date or a trip, we store it with your account: its title, the day, the places with their names and positions, the times, the notes and names you typed, and who last changed it and when. We keep it until you delete it or your account. While you share Ethos for Two, your partner can read and change your saved dates and trips and sees your name, and you see theirs; that stops as soon as you no longer share it.",
        "Partner links: buttons to search flights, tickets or car hire go through Travelpayouts' redirect (tpm.lv) to the partner's site, such as Aviasales, Tiqets or Auto Europe. Only when you tap one does your browser go to them: they then receive your IP address and what any website receives, and the partner sets its own cookies, on its own site, to credit the booking to us. We don't load their scripts or set any cookie for them on our site, and what you search for or book there is between you and them, under their privacy policies.",
      ],
    },
    {
      heading: "4. Reviews",
      paragraphs: [
        "If you post a review, we store the place (its OpenStreetMap ID, name and position), your stars, cost, occasion and text, the language and the dates, linked to your account. Reviews are public: anyone can read them, with your first name (from your profile, for example from Google) or “Somebody”. Reviews are shown without any account ID, so nobody else can tell which reviews came from the same account, and we never show your email address. You can edit or delete a review at any time, and deleting your account deletes your reviews.",
      ],
    },
    {
      heading: "5. Games",
      paragraphs: [
        "Two-phone games use a room: a live channel on Supabase's realtime service, named after the room code. The names you enter, who is in the room, and the moves and drawings pass through Supabase's servers to the other phone in real time; they are not stored in our database, and the room disappears when both players leave. The names you enter are shown to the other player and remembered on your device for next time, and a random player ID is kept in your browser tab. In Memory, the photos you pick stay in your browser and are never uploaded. One-phone games run entirely on your device.",
      ],
    },
    {
      heading: "6. The waitlist and the creator programme",
      paragraphs: [
        `If you joined the waitlist for Ethos for Two, we store your email address, your language and when you joined. We use it only to send you one email when it launches. You can ask to be removed at any time by writing to ${E.email}.`,
        "If you join our creator programme, we store your name, your contact details, your code (the part of your personal link that names you), your commission rate, the payout details you give us (such as a bank account or a payment service), the commissions we've paid you, and the sales made through your link: how many, their amounts, refunds and dates. We use them to run the programme, to pay you and for our accounts. We show you totals only, never who bought.",
        "If you arrive through a creator's personal link and buy, the creator's code is recorded with your purchase so that we can pay their commission. Nothing is stored on your device for this: only the open tab remembers the link, and forgets it when it is closed or reloaded. The creator never learns who you are.",
      ],
    },
    {
      heading: "7. Analytics, error reports and logs",
      paragraphs: [
        "On every page, including gift pages, we use Vercel Web Analytics and Speed Insights to count visits and measure how fast pages load. They don't use cookies. They record things such as the page, the referring site, the approximate country, and the type of browser, device and operating system. Before anything is sent, gift links are shortened to “/g/[shortId]” and query strings are removed, except the ones that say where a visit came from (“ref” and “utm_”).",
        "We also count a few named steps in the same cookieless analytics: opening the editor, seeing the publish screen, tapping to pay, completing a purchase, seeing an offer for a free template's extras or a game pack, ticking the box to add every template, tapping a partner link, saving a reminder, saving a date or a trip, seeing Ethos for Two offered where a saved date needs it, opening a whole date in Maps, starting a reply, moving through or skipping the “How it works” tour, and tapping a button on a city page. These events carry no personal data: at most a template, a product or plan, a game or pack, a partner, a maps app, a city page, a tour step, where a button sat, and yes-or-no facts such as whether you were signed in or a member, never who you are, a gift, a saved date or what's in them. A creator's link is counted the same way, by its code in the page address.",
        "Microsoft Clarity (heatmaps and session recordings) runs only if you accept cookies in our banner, and never on gift pages, checkout, the dashboard or the account page. It records how you use our other pages, including the editor: clicks, taps, scrolling, mouse movements and what appears on screen. In the editor, what you type and upload is masked in these recordings, so the gift you're writing isn't captured. It uses cookies and is told not to use advertising storage. You can withdraw your consent at any time with “Stop cookies” in the footer: we then stop Clarity and delete its cookies.",
        "If something breaks in your browser, the page reports the error to our own server: the error message and a code, the page path (with no query string, and with gift links shortened), the template and your browser's user agent. It goes into our hosting logs and nowhere else.",
        "Like any website, our host logs technical details of each request, such as IP address, browser, the address requested and the time, to run and secure the Service. To prevent abuse, we also count requests from each IP address (or, for the writing helper, each account) for up to an hour.",
      ],
    },
    {
      heading: "8. Why we use data, and our legal bases",
      paragraphs: [
        "To provide what you ask for (accounts and sign-in; creating, hosting and delivering gifts; passing reactions and view statistics to senders; purchases, Ethos for Two and gift cards; saved dates, and sharing them with your partner; service emails; reminders you ask for; reviews; game rooms; the writing helper; the Dates features; and, if you're a creator, running the programme and paying you): performance of our contract with you (Art. 6(1)(b) GDPR). Where we have no contract with you, for example when you open a gift someone sent you, our legitimate interest, and the sender's, in delivering the gift and its reactions (Art. 6(1)(f)).",
        "To keep the Service secure and working, prevent fraud and abuse, keep reviews genuine, enforce our terms, fix errors, measure use with cookieless analytics, mention related offers in the service emails we send you anyway, and establish or defend legal claims: our legitimate interests (Art. 6(1)(f)). You can object to this (section 13).",
        "Microsoft Clarity, the waitlist and checkout reminder emails: your consent (Art. 6(1)(a)), given in our cookie banner, on the waitlist form, or with the box on Stripe's checkout page. You can withdraw it at any time (for emails, with the unsubscribe link); withdrawing doesn't affect what happened before.",
        "To meet legal obligations, such as accounting and tax rules (which is why purchase records and creators' payouts are kept) and consumer law (which is why we keep the record of your request to unlock a purchase straight away), and to handle reports and orders under the Digital Services Act: Art. 6(1)(c).",
      ],
    },
    {
      heading: "9. Who we share data with",
      paragraphs: [
        "Service providers that process data for us under data-processing agreements: Vercel (hosting, content delivery, logs, cookieless analytics and the approximate location of your connection); Supabase (database, sign-in, file storage and game rooms; our project is hosted in the EU, in Ireland); Stripe (payments and subscriptions); Resend (sending our emails); RevenueCat (purchases made in our iPhone app); Microsoft (Clarity, only with your consent); and Anthropic (the writing helper, only when you use it).",
        "Companies that act as independent controllers under their own privacy policies: Stripe, for its own fraud-prevention and legal duties; Apple, for purchases and subscriptions made in our iPhone app, which it sells and bills; Google or Apple, if you sign in with them; Travelpayouts and the travel partners it links to, only when you tap a partner link; and the map, data and media services named in sections 1 to 3, which receive your IP address when your browser loads something directly from them (map tiles, photographs, song previews and covers). Our servers send them no personal data.",
        "We don't sell or rent personal data, and we don't use it for advertising. Creators see how many sales were made through their link and their value, never who bought. We disclose data to authorities only where the law requires it. If the Service or our company passes to a new owner, your data may go with it, under this policy.",
      ],
    },
    {
      heading: "10. Transfers outside the EEA",
      paragraphs: [
        "Some of these providers are based in the United States or may access data from outside the European Economic Area. Where they do, the transfer is covered by the EU–US Data Privacy Framework, for providers certified under it, or by the European Commission's Standard Contractual Clauses. You can ask us for details.",
      ],
    },
    {
      heading: "11. How long we keep data",
      paragraphs: [
        "Your account: until you delete it. Drafts saved to your account: deleted automatically after 7 days without edits. Uploaded files that no gift uses: deleted after 24 hours; once a gift has been opened, older versions of its files that it no longer uses are deleted too.",
        "Published and scheduled gifts, their files, view records and reactions: until you delete the gift or your account. Deleting removes the files from storage and the records from our database straight away; copies in routine backups expire within 30 days.",
        "Reviews, and saved dates and trips: until you delete them or your account. Waitlist: until we've sent the launch email (then deleted within three months), until you ask us to remove you, or at most 24 months after you joined if it hasn't launched. Reminders: until you remove them or delete your account. The unsubscribe list: the hash of your address, for as long as we send the checkout reminder or offers inside our emails.",
        "Purchases: accounting and tax law require us to keep a record of every sale (generally for five years in Latvia, and up to ten years for VAT records). When you delete your account, your purchases stay in our database for that long, but no longer linked to you: what was bought, when, the amount, the creator's code if there was one, the record of your request to unlock it straight away, a gift card's details and Stripe's identifiers. Ethos for Two's records (its plan, its dates and a record of each payment) are kept the same way, and so is the customer record Stripe keeps for a subscription, which is then deleted. Creator programme: for as long as you take part, then for as long as accounting and tax law requires for the commissions we paid.",
        "Logs and security: rate-limit counters, up to 1 hour; hosting logs and error reports, up to 30 days; sign-in and security records, up to 12 months. Microsoft keeps Clarity data for the periods it sets, currently up to 13 months. Data stored in your browser (section 12) stays until it expires or you clear it.",
      ],
    },
    {
      heading: "12. Cookies and similar technologies",
      paragraphs: [
        "Necessary cookies, which don't need consent: the sign-in cookies set by Supabase (sb-…-auth-token), which keep you signed in until you sign out or the session ends; auth_next, which remembers where to take you after signing in (10 minutes); ETHOS_LOCALE, which remembers your language (1 year); and ethos_gift_…, which remembers, encrypted, a gift password you entered (1 year, only on that gift's page).",
        "Browser storage on your device that makes features work: your cookie choice (ethos-analytics-consent); editor drafts and their media; your last Dates search area, your plan, which saved date it's linked to, and the airport you last searched flights from; game names and a player ID; a 24-hour note of gifts you've opened; and short-lived notes when you reply to a gift you received, start a gift from a trip, sign in to save a plan (so it saves itself once you're back), or come back from paying (so the purchase is counted once). None of this is sent to us by itself.",
        "Analytics cookies, only with your consent: Microsoft Clarity's cookies (_clck and _clsk) and a session-storage entry. We don't use advertising cookies. Stripe's checkout pages, Google's or Apple's sign-in pages and the travel partners' sites you reach through a partner link set their own cookies on their own sites. You can change your choice at any time with “Allow cookies” or “Stop cookies” in the footer.",
      ],
    },
    {
      heading: "13. Your rights",
      paragraphs: [
        `You have the right to access your data and get a copy, to have it corrected or erased, to restrict its use, to data portability, to object to processing based on our legitimate interests, and to withdraw consent at any time. Your account page lets you download your data (account, gifts, purchases, unlocks, Ethos for Two, saved dates and trips, gift cards you bought, reminders, views, reactions, reviews and waitlist sign-up, as a JSON file) and delete your account, and your reminders page lists and removes your reminders; for anything else, write to ${E.email}.`,
        "We answer within one month, or within three months for complex requests, in which case we'll tell you why. It's free, and we may ask you to confirm your identity first. We don't make decisions about you based solely on automated processing that have legal or similarly significant effects.",
        "You can complain to the Latvian Data State Inspectorate (Datu valsts inspekcija, dvi.gov.lv) or to the supervisory authority where you live or work. We'd welcome the chance to help first.",
        "Recipients who want a reaction or view record removed can write to us with the gift link; we'll remove it and tell the sender it was withdrawn. If a gift or review contains information about you that you want taken down, you can also report it as section 13 of our Terms of Service explains.",
      ],
    },
    {
      heading: "14. Children",
      paragraphs: [
        "The Service isn't directed at children. You must be at least 16 to create an account, post a review or buy, and we don't knowingly collect data from younger children; if we learn that an account belongs to someone under 16, we delete it. Photos and names of children may appear in gifts made by their family: the sender is responsible for having the right to share them, should include only what the gift needs, and should leave out anything that could identify or locate a child to strangers, such as a school or an address. Remember that anyone with the link can open a gift.",
      ],
    },
    {
      heading: "15. Security",
      paragraphs: [
        "Data is encrypted in transit and at rest. Uploaded files live in private storage and are served through signed links that expire, and gift passwords are stored only as secure hashes. Access to production systems is limited to people who need it and protected with multi-factor authentication. No system is perfectly secure: if a breach puts your data at risk, we'll act at once and inform you and the authorities as the law requires.",
      ],
    },
    {
      heading: "16. Changes and contact",
      paragraphs: [`We'll post updates here and email account holders about material changes. Contact: ${E.name}, ${E.address}, ${E.email}.`],
    },
  ],
};

const privacyEs: LegalDoc = {
  title: "Política de privacidad",
  intro: `${E.name} («nosotros»), número de registro ${E.regNo}, ${E.address.replace("Latvia", "Letonia")}, es el responsable del tratamiento de los datos personales que se recogen a través de ${B}: la web, los regalos, las compras (incluidos Ethos for Two y las tarjetas regalo), el mapa de Citas, los planes, los viajes y las citas guardadas, las reseñas, los juegos, los recordatorios, la lista de espera, el programa de creadores y nuestros correos. Esta política explica qué recogemos, para qué, quién más interviene, cuánto tiempo lo conservamos y los derechos que tienes según el Reglamento General de Protección de Datos (RGPD). Preguntas y solicitudes: ${E.email}.`,
  sections: [
    {
      heading: "1. Datos de quienes crean regalos o compran",
      paragraphs: [
        "Datos de cuenta: tu correo electrónico; tu nombre, si tu cuenta de Google o Apple lo comparte; tu idioma; tu historial de inicios de sesión, con la hora y la dirección IP; y, si inicias sesión con Google o Apple, el identificador y los datos básicos de perfil (como tu nombre y el enlace a tu foto de perfil) que compartan.",
        "Contenido del regalo: los nombres, el título, el mensaje, las fotos y sus pies, la música que eliges o subes, los mensajes de voz, los vídeos, los enlaces a canciones, las fechas, los lugares y demás datos que añades, además de los ajustes del regalo; la contraseña se guarda solo como hash seguro. Las fotos se redimensionan y recodifican en tu dispositivo antes de subirse, lo que elimina sus metadatos, como el lugar donde se hicieron. Los archivos de vídeo y audio se suben tal cual, así que conservan los metadatos que contengan.",
        "Borradores: mientras editas, el borrador se guarda en el almacenamiento de tu navegador, en tu dispositivo, y, si has iniciado sesión, en tu cuenta, donde las fotos se suben en cuanto las añades.",
        "Datos de compra: qué compraste, cuándo, el importe y la moneda, el estado del pago, el enlace por el que llegaste (por ejemplo, una de nuestras publicaciones, el enlace personal de un creador o el botón del final de un regalo) y los identificadores de Stripe de la transacción. Stripe recoge tus datos de pago y tu correo; los datos de tu tarjeta van directamente a Stripe y nunca los recibimos. Lo que enviamos a Stripe con un pago indica qué compras, tu idioma, ese enlace, el identificador de tu cuenta con nosotros y si pediste el aviso de un pago sin terminar, nunca un regalo, un nombre ni una nota. Registramos la casilla que marcaste al pagar (la frase exacta), pidiendo que tu compra se desbloqueara, o que Ethos for Two empezara, de inmediato, y cuándo: así demostramos lo que pediste (Términos, sección 9). Si llegaste a través del enlace personal de un creador, el código del creador queda registrado con la compra. Si haces una respuesta gratuita, registramos que se ha usado su enlace, y para qué regalo, de modo que cada enlace dé para una sola respuesta gratuita. En el caso de una tarjeta regalo guardamos su código, el nombre y la nota que añades para quien la recibe, y cuándo y con qué cuenta se canjeó.",
        "Ethos for Two: si es mensual, anual o un pase; cuándo empezó, el periodo pagado y cuándo termina; si se renueva y si hay un pago pendiente; su código de invitación y, cuando la otra persona se une, qué cuenta se unió; y un registro de cada pago. En una suscripción, Stripe guarda una ficha de cliente tuya (tu nombre y tu correo, tu dirección de facturación o tu país y la tarjeta con la que pagas, que solo ve Stripe) con el estado de la suscripción y sus facturas, y nosotros guardamos los identificadores de Stripe del cliente y de la suscripción. En una suscripción comprada en nuestra app para iPhone, guardamos los identificadores de transacción de Apple, que nos llegan a través de RevenueCat.",
        "Búsquedas y asistentes: cuando buscas una canción, nuestros servidores envían las palabras que buscas a iTunes Search, de Apple; cuando pegas el enlace de una canción, piden a YouTube o Spotify su título y su portada. Si usas «Ayúdame a escribirlo», lo que escribes en ese diálogo, junto con la ocasión y los nombres del regalo, se envía a Anthropic para redactar los borradores; nosotros no lo guardamos.",
        "Los correos que enviamos y cómo dejar de recibir cada uno. Enlaces y códigos de acceso, y un correo de bienvenida cuando se crea tu cuenta: solo cuando inicias sesión o te registras. Recibos: uno por cada compra, con el código de la tarjeta regalo o el enlace de invitación de Ethos for Two cuando compras uno (en una suscripción a Ethos for Two, la confirmación es el correo de bienvenida); forman parte de la compra y no se pueden desactivar.",
        "Avisos del regalo, para quien lo hizo: cuando se publica o se programa, cuando se abre por primera vez, cuando se abre un regalo programado y cuando llega una reacción. Al borrar el regalo dejan de llegar; para dejar de recibirlos de un regalo que conservas, responde a uno de ellos o escríbenos.",
        "Ethos for Two, a quien la paga: un correo de bienvenida con tu plan y el enlace de invitación, que confirma tu suscripción; en la suscripción anual, un correo una semana antes de cada renovación; un correo si un pago no se completa o tu banco te pide confirmarlo; y otro cuando la suscripción ha terminado (nunca después de un reembolso o un desistimiento). Son correos del servicio y forman parte del contrato. Con el pase de un año: el correo de bienvenida y un correo 14 días antes de que termine, con la fecha y cómo seguir; llega una vez por cada año de pase y, para dejar de recibirlo, respóndele o escríbenos.",
        "Recordatorios: si nos pides que te recordemos una fecha, guardamos el nombre que indicas, la ocasión, el día y el mes, tu idioma, la plantilla del regalo y el año en que te escribimos por última vez, vinculados a tu cuenta, y te escribimos nueve días antes de esa fecha cada año. Puedes quitar un recordatorio desde la página de tu cuenta o con el enlace de cada correo.",
        "Recordatorios de citas: mientras tienes Ethos for Two, una cita guardada con fecha os envía a ti y a tu pareja un correo el día antes, a cada uno en su idioma, con sus paradas y sus notas. Puedes desactivarlo en cada cita desde Mis citas, o con el enlace del correo.",
        "El aviso de un pago sin terminar: solo si lo pides y después te vas sin pagar, te enviamos un correo con un enlace para volver a ese pago. Lo pides marcando, donde Stripe la muestra, la casilla de su página de pago aceptando recibir correos nuestros. Nunca viene marcada, y puedes pagar sin marcarla. Es un solo correo, no una serie: como mucho uno por dirección a la semana, aunque dejes varios pagos sin terminar, y ninguno si ya has pagado. Incluye un enlace para darte de baja (puede que tu app de correo también muestre su propio botón para darte de baja); si lo usas, guardamos un hash unidireccional de tu dirección (no la dirección) en una lista que consultamos antes de enviarlo, y volver a marcar la casilla en otro pago no te saca de ella.",
        "Ofertas dentro de nuestros correos: el recibo de plantillas sueltas, de tres plantillas o de «Hazlo especial» puede indicar lo que te costaría ahora «Todo», y el correo de la primera apertura puede proponerte empezar tu próximo regalo. Si tu dirección está en la lista de bajas, las quitamos; para entrar en ella sin haber recibido un aviso de pago sin terminar, responde a cualquiera de nuestros correos o escríbenos. Aparte de estos, y del único correo de lanzamiento para quienes se apuntaron a la lista de espera de Ethos for Two (sección 6), no enviamos ningún otro correo ni boletines.",
      ],
    },
    {
      heading: "2. Datos de quienes abren un regalo",
      paragraphs: [
        "Cuando se abre un regalo registramos un código de visitante seudonimizado, el tipo de dispositivo (iPhone o iPad, Android, ordenador u otro), la hora y cuánto se vio del regalo, para que el remitente sepa que ha llegado. El código es un hash unidireccional de tu dirección IP y los datos de tu navegador junto con el regalo y la fecha; no guardamos tu dirección IP con él. Tu navegador guarda una nota durante 24 horas para que recargar la página no cuente como una nueva apertura.",
        "Si envías una reacción, el emoji, la nota y el mensaje de voz que decidas enviar se guardan y solo los ve el remitente, que además recibe por correo el emoji y la nota. Si un regalo tiene contraseña, tu navegador la guarda cifrada en una cookie hasta un año para que no tengas que volver a escribirla. No pedimos a los destinatarios su nombre ni su correo.",
        "Algunas plantillas piden usar el micrófono (por ejemplo, para «soplar» las velas) o los sensores de movimiento del móvil. Esa información se analiza solo en tu dispositivo; no se graba ni se nos envía. Si un regalo incluye una canción de Apple Music o el enlace a una canción, tu navegador carga la portada directamente desde Apple, YouTube o Spotify, que reciben tu dirección IP; el avance de Apple Music solo se carga desde Apple si tocas para escucharlo, y al tocar un enlace se abre ese servicio, sujeto a su propia política de privacidad.",
      ],
    },
    {
      heading: "3. Citas, mapas, planes, viajes y distancia",
      paragraphs: [
        "Las páginas de Citas, los planes y las herramientas a distancia funcionan sin cuenta. Para mostrarte sitios cerca necesitamos una ubicación: una ciudad que escribas, que nuestros servidores buscan con Photon (de komoot); la ubicación aproximada, a nivel de ciudad, que nuestro proveedor de alojamiento deduce de tu conexión, que solo usamos para abrir el mapa en tu ciudad y no guardamos; o, únicamente si pulsas «Cerca de mí» y tu navegador lo permite, la posición de tu dispositivo. Tu navegador redondea la posición a una cuadrícula de unos cien metros antes de enviar nada a nuestros servidores. No guardamos posiciones ni las vinculamos a ti, aunque, como cualquier petición, pueden aparecer brevemente en los registros técnicos de nuestro proveedor de alojamiento. Una búsqueda hecha con «Cerca de mí» nunca se escribe en la dirección de la página. Tu navegador recuerda la última zona que buscaste, solo en tu dispositivo.",
        "El mapa se dibuja con OpenFreeMap: tu navegador descarga las teselas directamente de tiles.openfreemap.org, que por tanto recibe tu dirección IP, como cualquier web que visitas. Las fotografías de los sitios se cargan directamente desde los servidores de Wikimedia, que también reciben tu dirección IP. Para encontrar sitios y mostrar sus detalles, la previsión del tiempo o el nombre de una ciudad, nuestros servidores consultan OpenFreeMap, Nominatim (de la Fundación OpenStreetMap), los servidores públicos de Overpass, Open-Meteo, Photon y Wikimedia (Wikipedia, Wikidata y Commons) y, cuando los hemos activado, Tripadvisor y Google para sus valoraciones. Esas peticiones solo llevan coordenadas redondeadas, el nombre de un sitio o el texto que has buscado, nunca tu nombre, tu dirección IP ni nada sobre tu dispositivo.",
        "El plan que montas se guarda en el almacenamiento local de tu navegador y solo se nos envía si lo guardas en tu cuenta. Cuando lo compartes, el plan viaja dentro del propio enlace, en la parte que va después de «#», que los navegadores no envían a los servidores: quien tenga el enlace puede leer el plan, y nosotros no. Trata el enlace como la invitación que es. Los enlaces que sigas desde un sitio (cómo llegar, fotos y reseñas, Tripadvisor, Google, Yelp, la web del local) abren otros servicios con sus propias políticas de privacidad.",
        "Citas y viajes guardados: si guardas una cita o un viaje, lo guardamos con tu cuenta: su título, el día, los sitios con sus nombres y posiciones, las horas, las notas y los nombres que escribiste, y quién lo cambió por última vez y cuándo. Lo conservamos hasta que lo borras o eliminas tu cuenta. Mientras compartís Ethos for Two, tu pareja puede ver y cambiar tus citas y viajes guardados y ve tu nombre, igual que tú con los suyos; eso termina en cuanto dejáis de compartirla.",
        "Enlaces de socios: los botones para buscar vuelos, entradas o alquiler de coches pasan por la redirección de Travelpayouts (tpm.lv) hasta la web del socio, como Aviasales, Tiqets o Auto Europe. Tu navegador solo va a ellos si tocas uno: entonces reciben tu dirección IP y lo que recibe cualquier web, y el socio instala sus propias cookies, en su propia web, para atribuirnos la reserva. No cargamos sus scripts ni instalamos ninguna cookie suya en nuestra web, y lo que busques o reserves allí queda entre tú y ellos, según sus políticas de privacidad.",
      ],
    },
    {
      heading: "4. Reseñas",
      paragraphs: [
        "Si publicas una reseña, guardamos el sitio (su identificador de OpenStreetMap, su nombre y su posición), tus estrellas, el precio, la ocasión y el texto, el idioma y las fechas, vinculados a tu cuenta. Las reseñas son públicas: cualquiera puede leerlas, con tu nombre de pila (tomado de tu perfil, por ejemplo de Google) o «Alguien». Las reseñas se muestran sin ningún identificador de cuenta, así que nadie más puede saber qué reseñas proceden de la misma cuenta, y nunca mostramos tu correo. Puedes editar o borrar una reseña en cualquier momento, y al eliminar tu cuenta se borran tus reseñas.",
      ],
    },
    {
      heading: "5. Juegos",
      paragraphs: [
        "Los juegos para dos móviles usan una sala: un canal en directo del servicio en tiempo real de Supabase, con el nombre del código de la sala. Los nombres que escribes, quién está en la sala y las jugadas y los dibujos pasan por los servidores de Supabase hasta el otro móvil en tiempo real; no se guardan en nuestra base de datos, y la sala desaparece cuando se van los dos jugadores. Los nombres que escribes se muestran al otro jugador y se recuerdan en tu dispositivo para la próxima vez, y en la pestaña del navegador se guarda un identificador de jugador aleatorio. En Memory, las fotos que eliges se quedan en tu navegador y nunca se suben. Los juegos de un solo móvil funcionan por completo en tu dispositivo.",
      ],
    },
    {
      heading: "6. La lista de espera y el programa de creadores",
      paragraphs: [
        `Si te apuntaste a la lista de espera de Ethos for Two, guardamos tu correo, tu idioma y cuándo te apuntaste. Solo lo usamos para enviarte un correo cuando se lance. Puedes pedirnos que te borremos en cualquier momento escribiendo a ${E.email}.`,
        "Si te unes a nuestro programa de creadores, guardamos tu nombre, tus datos de contacto, tu código (la parte de tu enlace personal que te identifica), tu porcentaje de comisión, los datos de pago que nos des (como una cuenta bancaria o un servicio de pagos), las comisiones que te hemos pagado y las ventas hechas a través de tu enlace: cuántas, sus importes, los reembolsos y sus fechas. Los usamos para gestionar el programa, pagarte y llevar nuestra contabilidad. Solo te mostramos totales, nunca quién compró.",
        "Si llegas a través del enlace personal de un creador y compras, el código del creador queda registrado con tu compra para que podamos pagarle su comisión. Para eso no se guarda nada en tu dispositivo: solo la pestaña abierta recuerda el enlace, y lo olvida al cerrarla o recargarla. El creador nunca sabe quién eres.",
      ],
    },
    {
      heading: "7. Analítica, informes de errores y registros",
      paragraphs: [
        "En todas las páginas, también en las de los regalos, usamos Vercel Web Analytics y Speed Insights para contar visitas y medir la velocidad de carga. No usan cookies. Registran datos como la página, la web de procedencia, el país aproximado y el tipo de navegador, dispositivo y sistema operativo. Antes de enviar nada, los enlaces de los regalos se acortan a «/g/[shortId]» y se eliminan los parámetros de la dirección, salvo los que indican de dónde viene la visita («ref» y «utm_»).",
        "También contamos algunos pasos concretos en esa misma analítica sin cookies: abrir el editor, ver la pantalla de publicar, tocar para pagar, completar una compra, ver una oferta de los extras de una plantilla gratuita o de un pack de juegos, marcar la casilla para añadir todas las plantillas, tocar un enlace de socio, guardar un recordatorio, guardar una cita o un viaje, ver la oferta de Ethos for Two cuando una cita guardada la necesita, abrir una cita entera en Mapas, empezar una respuesta, avanzar o saltarse la guía «Cómo funciona» y tocar un botón en la página de una ciudad. Estos eventos no llevan datos personales: como mucho una plantilla, un producto o un plan, un juego o un pack, un socio, una app de mapas, la página de una ciudad, un paso de la guía, dónde estaba el botón y datos de sí o no, como si habías iniciado sesión o tienes Ethos for Two; nunca quién eres, un regalo, una cita guardada ni lo que contienen. El enlace de un creador se cuenta igual, por su código en la dirección de la página.",
        "Microsoft Clarity (mapas de calor y grabaciones de sesión) solo funciona si aceptas las cookies en nuestro aviso, y nunca en las páginas de los regalos, el pago, el panel ni la página de tu cuenta. Registra cómo usas nuestras demás páginas, incluido el editor: clics, toques, desplazamientos, movimientos del ratón y lo que aparece en pantalla. En el editor, lo que escribes y subes queda oculto en esas grabaciones, así que el regalo que estás escribiendo no se captura. Usa cookies y está configurado para no usar almacenamiento publicitario. Puedes retirar tu consentimiento en cualquier momento con «Quitar cookies» en el pie de página: entonces detenemos Clarity y borramos sus cookies.",
        "Si algo falla en tu navegador, la página informa del error a nuestro propio servidor: el mensaje de error y un código, la ruta de la página (sin parámetros y con los enlaces de los regalos acortados), la plantilla y el agente de usuario de tu navegador. Va a los registros de nuestro alojamiento y a ningún otro sitio.",
        "Como cualquier web, nuestro proveedor de alojamiento registra datos técnicos de cada petición, como la dirección IP, el navegador, la dirección solicitada y la hora, para prestar el Servicio y protegerlo. Para evitar abusos, además contamos las peticiones de cada dirección IP (o, en el asistente de escritura, de cada cuenta) durante un máximo de una hora.",
      ],
    },
    {
      heading: "8. Para qué usamos los datos y con qué base legal",
      paragraphs: [
        "Para darte lo que pides (cuentas e inicio de sesión; crear, alojar y entregar regalos; hacer llegar las reacciones y las estadísticas de visualización a los remitentes; compras, Ethos for Two y tarjetas regalo; las citas guardadas y compartirlas con tu pareja; correos del servicio; los recordatorios que pides; reseñas; salas de juego; el asistente de escritura; las funciones de Citas; y, si eres creador, gestionar el programa y pagarte): la ejecución de nuestro contrato contigo (art. 6.1.b RGPD). Cuando no tenemos un contrato contigo, por ejemplo cuando abres un regalo que te han enviado, nuestro interés legítimo, y el del remitente, en entregar el regalo y sus reacciones (art. 6.1.f).",
        "Para mantener el Servicio seguro y en funcionamiento, prevenir el fraude y los abusos, que las reseñas sean auténticas, hacer cumplir nuestros términos, corregir errores, medir el uso con analítica sin cookies, mencionar ofertas relacionadas en los correos del servicio que te enviamos de todos modos y formular o defender reclamaciones: nuestros intereses legítimos (art. 6.1.f). Puedes oponerte (sección 13).",
        "Microsoft Clarity, la lista de espera y los avisos de pagos sin terminar: tu consentimiento (art. 6.1.a), dado en nuestro aviso de cookies, en el formulario de la lista de espera, o con la casilla de la página de pago de Stripe. Puedes retirarlo en cualquier momento (en los correos, con el enlace para darte de baja); retirarlo no afecta a lo ya hecho.",
        "Para cumplir obligaciones legales, como las normas contables y fiscales (por eso se conservan los registros de compras y de pagos a creadores) y la normativa de consumo (por eso conservamos el registro de tu solicitud de desbloquear una compra de inmediato), y tramitar denuncias y órdenes según el Reglamento de Servicios Digitales: art. 6.1.c.",
      ],
    },
    {
      heading: "9. Con quién compartimos los datos",
      paragraphs: [
        "Proveedores que tratan datos por encargo nuestro, con contratos de encargo del tratamiento: Vercel (alojamiento, distribución de contenidos, registros, analítica sin cookies y ubicación aproximada de tu conexión); Supabase (base de datos, inicio de sesión, almacenamiento de archivos y salas de juego; nuestro proyecto está alojado en la UE, en Irlanda); Stripe (pagos y suscripciones); Resend (envío de nuestros correos); RevenueCat (compras hechas en nuestra app para iPhone); Microsoft (Clarity, solo con tu consentimiento); y Anthropic (el asistente de escritura, solo cuando lo usas).",
        "Empresas que actúan como responsables independientes, con sus propias políticas de privacidad: Stripe, para sus propias obligaciones legales y de prevención del fraude; Apple, en las compras y suscripciones hechas en nuestra app para iPhone, que vende y cobra ella; Google o Apple, si inicias sesión con ellos; Travelpayouts y los socios de viajes a los que enlaza, solo cuando tocas un enlace de socio; y los servicios de mapas, datos y contenidos mencionados en las secciones 1 a 3, que reciben tu dirección IP cuando tu navegador carga algo directamente de ellos (teselas del mapa, fotografías, avances y portadas de canciones). Nuestros servidores no les envían datos personales.",
        "No vendemos ni alquilamos datos personales, ni los usamos para publicidad. Los creadores ven cuántas ventas se han hecho a través de su enlace y su importe, nunca quién compró. Solo comunicamos datos a las autoridades cuando la ley lo exige. Si el Servicio o nuestra empresa pasan a otro titular, tus datos pueden transmitirse con ellos, sujetos a esta política.",
      ],
    },
    {
      heading: "10. Transferencias fuera del EEE",
      paragraphs: [
        "Algunos de estos proveedores tienen su sede en Estados Unidos o pueden acceder a los datos desde fuera del Espacio Económico Europeo. En ese caso, la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU., para los proveedores adheridos a él, o en las cláusulas contractuales tipo de la Comisión Europea. Puedes pedirnos más información.",
      ],
    },
    {
      heading: "11. Cuánto tiempo conservamos los datos",
      paragraphs: [
        "Tu cuenta: hasta que la eliminas. Borradores guardados en tu cuenta: se borran automáticamente tras 7 días sin editarse. Archivos subidos que ningún regalo usa: se borran a las 24 horas; cuando un regalo ya se ha abierto, también se borran las versiones anteriores de sus archivos que ya no usa.",
        "Regalos publicados y programados, sus archivos, los registros de visualización y las reacciones: hasta que borras el regalo o tu cuenta. Al borrarlos, los archivos se eliminan del almacenamiento y los registros de nuestra base de datos en ese momento; las copias de seguridad rutinarias caducan en un plazo de 30 días.",
        "Reseñas, y citas y viajes guardados: hasta que los borras o eliminas tu cuenta. Lista de espera: hasta que enviemos el correo del lanzamiento (después la borramos en un plazo de tres meses), hasta que nos pidas que te borremos o, como máximo, 24 meses después de apuntarte si no se ha lanzado. Recordatorios: hasta que los quitas o eliminas tu cuenta. La lista de bajas: el hash de tu dirección, mientras enviemos avisos de pagos sin terminar u ofertas dentro de nuestros correos.",
        "Compras: la normativa contable y fiscal nos obliga a conservar un registro de cada venta (en general, cinco años en Letonia y hasta diez años para los registros del IVA). Si eliminas tu cuenta, tus compras se quedan en nuestra base de datos durante ese tiempo, pero ya sin vincularse a ti: qué se compró, cuándo, el importe, el código del creador si lo hubo, el registro de tu solicitud de desbloquearla de inmediato, los datos de una tarjeta regalo y los identificadores de Stripe. Los registros de Ethos for Two (su plan, sus fechas y un registro de cada pago) se conservan igual, y también la ficha de cliente que Stripe guarda para una suscripción, que después se borra. Programa de creadores: mientras participes y, después, durante el tiempo que exija la normativa contable y fiscal para las comisiones que te pagamos.",
        "Registros y seguridad: contadores de límite de uso, hasta 1 hora; registros del alojamiento e informes de errores, hasta 30 días; registros de inicio de sesión y de seguridad, hasta 12 meses. Microsoft conserva los datos de Clarity durante los plazos que fija, actualmente hasta 13 meses. Lo que se guarda en tu navegador (sección 12) permanece hasta que caduca o lo borras.",
      ],
    },
    {
      heading: "12. Cookies y tecnologías similares",
      paragraphs: [
        "Cookies necesarias, que no requieren consentimiento: las cookies de sesión de Supabase (sb-…-auth-token), que mantienen tu sesión iniciada hasta que la cierras o caduca; auth_next, que recuerda adónde llevarte después de iniciar sesión (10 minutos); ETHOS_LOCALE, que recuerda tu idioma (1 año); y ethos_gift_…, que recuerda, cifrada, la contraseña de un regalo que has introducido (1 año, solo en la página de ese regalo).",
        "Almacenamiento del navegador, en tu dispositivo, que hace funcionar el Servicio: tu elección sobre cookies (ethos-analytics-consent); los borradores del editor y sus archivos; tu última zona de búsqueda en Citas, tu plan, la cita guardada a la que está vinculado y el aeropuerto desde el que buscaste vuelos la última vez; los nombres de los juegos y un identificador de jugador; una nota de 24 horas de los regalos que has abierto; y notas breves cuando respondes a un regalo que has recibido, empiezas un regalo a partir de un viaje, inicias sesión para guardar un plan (para que se guarde solo al volver) o vuelves después de pagar (para contar la compra una sola vez). Nada de esto se nos envía por sí solo.",
        "Cookies analíticas, solo con tu consentimiento: las cookies de Microsoft Clarity (_clck y _clsk) y una entrada en el almacenamiento de sesión. No usamos cookies publicitarias. Las páginas de pago de Stripe, las de inicio de sesión de Google o Apple y las webs de los socios de viajes a las que llegas con un enlace de socio instalan sus propias cookies en sus propios sitios. Puedes cambiar tu elección en cualquier momento con «Aceptar cookies» o «Quitar cookies» en el pie de página.",
      ],
    },
    {
      heading: "13. Tus derechos",
      paragraphs: [
        `Tienes derecho a acceder a tus datos y obtener una copia, a rectificarlos o suprimirlos, a limitar su tratamiento, a la portabilidad, a oponerte al tratamiento basado en nuestros intereses legítimos y a retirar tu consentimiento en cualquier momento. En la página de tu cuenta puedes descargar tus datos (cuenta, regalos, compras, desbloqueos, Ethos for Two, citas y viajes guardados, tarjetas regalo que has comprado, recordatorios, visualizaciones, reacciones, reseñas y la inscripción en la lista de espera, en un archivo JSON) y eliminar tu cuenta, y en la de recordatorios puedes verlos y quitarlos; para todo lo demás, escribe a ${E.email}.`,
        "Respondemos en el plazo de un mes, o de tres meses en solicitudes complejas, en cuyo caso te explicaremos por qué. Es gratuito, y puede que antes te pidamos que confirmes tu identidad. No tomamos decisiones sobre ti basadas únicamente en tratamientos automatizados que produzcan efectos jurídicos o te afecten de forma similarmente significativa.",
        "Puedes presentar una reclamación ante la Inspección Estatal de Datos de Letonia (Datu valsts inspekcija, dvi.gov.lv) o ante la autoridad de control del lugar donde vives o trabajas. Nos gustaría tener antes la oportunidad de ayudarte.",
        "Los destinatarios que quieran que se elimine una reacción o un registro de visualización pueden escribirnos con el enlace del regalo; lo eliminaremos e informaremos al remitente de que se ha retirado. Si un regalo o una reseña contiene información sobre ti que quieres que se retire, también puedes denunciarlo como explica la sección 13 de nuestros Términos del servicio.",
      ],
    },
    {
      heading: "14. Menores",
      paragraphs: [
        "El Servicio no está dirigido a menores. Debes tener al menos 16 años para crear una cuenta, publicar una reseña o comprar, y no recogemos a sabiendas datos de menores de esa edad; si sabemos que una cuenta pertenece a alguien menor de 16 años, la eliminamos. En los regalos que hace su familia pueden aparecer fotos y nombres de menores: el remitente es responsable de tener derecho a compartirlos, debe incluir solo lo que el regalo necesita y evitar cualquier dato que permita a desconocidos identificar o localizar a un menor, como su colegio o su dirección. Recuerda que cualquiera que tenga el enlace puede abrir un regalo.",
      ],
    },
    {
      heading: "15. Seguridad",
      paragraphs: [
        "Los datos se cifran en tránsito y en reposo. Los archivos subidos se guardan en almacenamiento privado y se sirven mediante enlaces firmados que caducan, y las contraseñas de los regalos se guardan solo como hashes seguros. El acceso a los sistemas de producción está limitado a quienes lo necesitan y protegido con autenticación multifactor. Ningún sistema es perfectamente seguro: si una brecha pone en riesgo tus datos, actuaremos de inmediato y te informaremos a ti y a las autoridades como exige la ley.",
      ],
    },
    {
      heading: "16. Cambios y contacto",
      paragraphs: [`Publicaremos las actualizaciones aquí y avisaremos por correo a los titulares de cuentas de los cambios relevantes. Contacto: ${E.name}, ${E.address.replace("Latvia", "Letonia")}, ${E.email}.`],
    },
  ],
};

export const LEGAL_DOCS: Record<"terms" | "privacy", Record<GiftLocale, LegalDoc>> = {
  terms: { en: termsEn, es: termsEs },
  privacy: { en: privacyEn, es: privacyEs },
};

/**
 * "Withdraw from a purchase" (/legal/withdraw), linked from the footer and the account page: the
 * withdrawal function EU consumer law asks for (CRD art. 11a). It stays for good now: Ethos for Two
 * is a service, so every buyer of it keeps the right for 14 days, tickbox or not. The button is a
 * prefilled email, so a withdrawal needs no account and nothing on our side can fail to record it.
 */
export type WithdrawDoc = LegalDoc & { action: { label: string; subject: string; body: string } };

export const WITHDRAW_DOCS: Record<GiftLocale, WithdrawDoc> = {
  en: {
    title: "Withdraw from a purchase",
    intro: "If you're a consumer in the EU or the UK and the right to cancel still applies to something you bought, you can withdraw from the purchase without giving a reason and get your money back: all of it, or for Ethos for Two, all but the days it ran. This page says when that is, and how.",
    action: {
      label: "Email us to withdraw",
      subject: "Withdrawal from a purchase",
      body: "I withdraw from my contract for the following purchase.\n\nWhat I bought:\nBought on:\nEmail address I paid with:\nName:\n",
    },
    sections: [
      {
        heading: "1. When the right to cancel applies",
        paragraphs: [
          "A gift card whose code hasn't been redeemed: within 14 days of buying it (Terms of Service, section 8).",
          "Templates, “Make it special”, upgrades and game packs you bought without ticking the box on Stripe's checkout page that asks us to unlock them straight away, for example before our checkout had that box, or on the rare occasion Stripe's page couldn't show it: within 14 days of buying, or longer where the law gives you longer. Your receipt email says whether you ticked it. If you're not sure, write to us anyway: we'll check and tell you.",
          "Ethos for Two, monthly, yearly or the one-year pass: within 14 days of subscribing or buying, whether or not you ticked the box. If you asked for it to start straight away, we refund what you paid minus the days it ran until you told us; if you didn't tick the box, or it hadn't started yet (a pass renewal bought ahead), we refund it all (Terms of Service, sections 7 and 9).",
        ],
      },
      {
        heading: "2. When it doesn't",
        paragraphs: [
          "If you ticked that box for templates, “Make it special”, an upgrade or a game pack, you asked us to unlock your purchase straight away and acknowledged that you then lose the right to cancel, so it ended when the purchase reached your account (Terms of Service, section 9). After its 14 days, Ethos for Two can still be cancelled at any time: that stops its renewals, and it runs to the end of the period you've paid for (section 7).",
          "Your other rights stay. If something you bought doesn't work as described, we put it right or refund you (section 10). And our guarantee: if a gift you paid for won't open or play properly on the recipient's phone or computer and we can't fix it, tell us within 30 days of buying and we'll refund you in full.",
        ],
      },
      {
        heading: "3. How to withdraw",
        paragraphs: [
          `The button above opens an email to us with the subject filled in and a short form to complete. Send it from the address you paid with, or tell us which address that was, and say what you bought. You don't have to give a reason or use the form: any clear message to ${E.email} before the time runs out is enough.`,
          "We confirm by email that we've received it, and refund you within 14 days, to the same payment method and at no cost to you: everything you paid or, for Ethos for Two you asked to start straight away, all but the days it ran. What you bought is then removed from your account: gifts that need an unlock go back to your drafts (section 10), and a gift card's code stops working. Ethos for Two ends at once for both of you and isn't charged again; if you paid for the days it ran, gifts published in them stay online.",
        ],
      },
    ],
  },
  es: {
    title: "Desistir de una compra",
    intro: "Si eres consumidor en la UE o en el Reino Unido y el derecho de desistimiento sigue aplicándose a algo que has comprado, puedes desistir de la compra sin dar ninguna explicación y recuperar tu dinero: todo o, en Ethos for Two, todo salvo los días que estuvo activo. Esta página explica cuándo y cómo.",
    action: {
      label: "Escríbenos para desistir",
      subject: "Desistimiento de una compra",
      body: "Desisto de mi contrato para la siguiente compra.\n\nQué compré:\nComprado el:\nCorreo con el que pagué:\nNombre:\n",
    },
    sections: [
      {
        heading: "1. Cuándo se aplica el derecho de desistimiento",
        paragraphs: [
          "Una tarjeta regalo cuyo código no se ha canjeado: en los 14 días siguientes a la compra (Términos del servicio, sección 8).",
          "Plantillas, «Hazlo especial», el paso a «Todo» y packs de juegos que hayas comprado sin marcar la casilla de la página de pago de Stripe en la que nos pides que los desbloqueemos de inmediato, por ejemplo antes de que nuestra página de pago tuviera esa casilla, o en la rara ocasión en que la página de Stripe no pudo mostrarla: en los 14 días siguientes a la compra, o durante más tiempo si la ley te lo concede. El correo con el recibo indica si la marcaste. Si no estás seguro, escríbenos de todos modos: lo comprobamos y te lo decimos.",
          "Ethos for Two, mensual, anual o el pase de un año: en los 14 días siguientes a la suscripción o la compra, marcaras o no la casilla. Si pediste que empezara de inmediato, te devolvemos lo que pagaste menos los días que estuvo activo hasta que nos lo comunicaste; si no marcaste la casilla, o aún no había empezado (una renovación del pase comprada por adelantado), te lo devolvemos todo (Términos del servicio, secciones 7 y 9).",
        ],
      },
      {
        heading: "2. Cuándo no se aplica",
        paragraphs: [
          "Si marcaste esa casilla en plantillas, «Hazlo especial», el paso a «Todo» o un pack de juegos, pediste que desbloqueáramos tu compra de inmediato y reconociste que así perdías el derecho de desistimiento, que terminó cuando la compra llegó a tu cuenta (Términos del servicio, sección 9). Pasados sus 14 días, Ethos for Two se puede seguir cancelando en cualquier momento: así se detienen sus renovaciones, y sigue activa hasta el final del periodo que has pagado (sección 7).",
          "Tus demás derechos siguen ahí. Si algo que has comprado no funciona como se describe, lo arreglamos o te devolvemos el dinero (sección 10). Y nuestra garantía: si un regalo que has pagado no se abre o no se reproduce bien en el móvil o el ordenador de quien lo recibe y no podemos arreglarlo, avísanos en los 30 días siguientes a la compra y te devolvemos el importe íntegro.",
        ],
      },
      {
        heading: "3. Cómo desistir",
        paragraphs: [
          `El botón de arriba abre un correo para nosotros con el asunto ya escrito y un breve formulario que rellenar. Envíalo desde la dirección con la que pagaste, o dinos cuál era, e indica qué compraste. No tienes que dar ninguna explicación ni usar el formulario: basta con cualquier mensaje claro a ${E.email} antes de que termine el plazo.`,
          "Te confirmamos por correo que lo hemos recibido y te hacemos el reembolso en un plazo de 14 días, con el mismo medio de pago y sin ningún coste para ti: todo lo que pagaste o, en Ethos for Two si pediste que empezara de inmediato, todo salvo los días que estuvo activo. Después retiramos de tu cuenta lo que compraste: los regalos que necesitan un desbloqueo vuelven a tus borradores (sección 10), y el código de una tarjeta regalo deja de funcionar. Ethos for Two termina en ese momento para los dos y no se vuelve a cobrar; si pagaste por los días que estuvo activo, los regalos publicados en esos días siguen en línea.",
        ],
      },
    ],
  },
};
