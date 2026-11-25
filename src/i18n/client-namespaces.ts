import type { AbstractIntlMessages } from "next-intl";
import { omitMessages, pickMessages } from "./messages-subset";

/**
 * Which parts of the message catalogue each part of the site sends to the browser.
 *
 * Handing NextIntlClientProvider no `messages` serialises the whole catalogue into every page:
 * ~57 KB of strings (20 KB gzipped) in each HTML document, and again in the root layout's
 * prefetch, for pages whose client components read a few hundred bytes of it. So each route
 * file sends only what the client components it renders read, and the providers stack: a page
 * gets its own entries plus those of every layout above it (see ClientMessages).
 *
 * Keys are route files under src/app/[currency]/[locale], without the extension; the file wraps what it
 * renders in <ClientMessages scope="<key>">. Values are namespaces, or dotted paths into one.
 * Server components read the full catalogue on the server and need nothing here.
 *
 * tests/unit/client-messages.test.ts walks every route's imports and fails when a client
 * component reads a namespace its route doesn't send. When it does, add the namespace to the
 * route that renders the component, as low in the tree as it goes.
 */
export const CLIENT_NAMESPACES = {
  // Everywhere: the consent banner, the error screen, and the handful of shared words.
  layout: ["common", "cookies", "error"],
  // The header, menu and tour. The commerce pages send their own below: here, they were ~14 KB in
  // every other marketing page's HTML.
  "(marketing)/layout": ["nav", "tour", "support", "notice"],
  "(marketing)/page": ["dates.where", "home.templates", "templates"],
  "(marketing)/gifts/page": ["home", "occasions", "templates", "pricing", "money.plans", "money.account", "money.checkoutErrors", "money.recovery"],
  // The gift pages by kind and /digital-cards: the phone in their hero plays a gift (components/templates/page/hero-flatlay.tsx).
  "(marketing)/gifts/[slug]/page": ["templates"],
  "(marketing)/digital-cards/page": ["templates"],
  "(marketing)/pricing/layout": ["pricing", "membership", "money.plans", "money.account", "money.checkoutErrors", "money.recovery", "money.giftcard"],
  // Ethos for Two's success page only needs its own lines in the browser (the one still switching on),
  // and the upgrade card after a single, a pick three or "make it special" its own.
  "(marketing)/checkout/layout": ["money.success", "money.invite", "membership.success", "money.after", "money.checkoutErrors"],
  "(marketing)/redeem/layout": ["auth", "money.redeem"],
  "(marketing)/campaign/layout": ["auth", "campaign"],
  "(marketing)/for-two/layout": ["auth", "money.join"],
  // Development only: the account's Ethos for Two section in each state, for screenshots and e2e.
  "(marketing)/for-two/preview/page": ["membership.account", "money.invite"],
  // Development only: My dates in each state (the real page needs a signed-in account).
  "(marketing)/for-two/preview/my-dates/page": ["savedDates"],
  // Development only: the share screen's reminder card (the real one needs a published gift).
  "(marketing)/reminders/preview/page": ["lifecycle", "pickers"],
  // Development only: the monthly idea's pieces of the send sheet and the account page.
  "(marketing)/monthly-idea/preview/page": ["offerEmails", "lifecycle.idea", "editor.publishSheet"],
  "(marketing)/templates/layout": ["templates", "occasions"],
  // The ad landing: only the live demo's own words.
  "(marketing)/try/layout": ["templates"],
  // An Etsy order's page: the same live demo.
  "(marketing)/etsy/layout": ["templates", "etsyFind"],
  // Where a free gift's footer leads: the template cards.
  "(marketing)/made-with-ethos/page": ["templates"],
  "(marketing)/occasions/layout": ["templates", "occasions"],
  "(marketing)/dates/layout": ["dates", "affiliate", "savedDates"],
  "(marketing)/plan/layout": ["plan", "affiliate", "giftChooser", "pickers", "savedDates", "auth"],
  "(marketing)/trips/layout": ["trips", "affiliate", "giftChooser", "savedDates", "auth"],
  // The pages by where you leave from (served by the trip route) and by kind are built from the gift page's sections, which carry hero-flatlay.tsx: as /long-distance sends it.
  "(marketing)/trips/[id]/page": ["templates"],
  "(marketing)/trips/ideas/[kind]/page": ["templates"],
  "(marketing)/long-distance/layout": ["ldr", "dates.where", "trips.flights", "affiliate", "templates"],
  "(marketing)/games/layout": ["games", "packs", "money.checkoutErrors"],
  // The days-together counter and its template cards.
  "(marketing)/tools/how-long-have-we-been-together/page": ["together", "templates"],
  // The love language quiz: its own words come as props; the gift cards under it read these.
  "(marketing)/tools/love-language-quiz/page": ["templates"],
  // The halfway finder: the two town boxes and the answer are the long-distance room's own words.
  "(marketing)/tools/halfway-between-two-cities/page": ["ldr", "dates.where"],
  "(editor)/layout": ["tour", "editor", "auth", "lifecycle", "money", "occasions", "pickers", "offerEmails"],
  "(app)/layout": ["account", "dashboard", "lifecycle", "money", "membership", "savedDates", "support"],
  "(auth)/layout": ["auth", "support"],
  "(gift)/demo/[slug]/page": ["templates"],
} as const satisfies Record<string, readonly string[]>;

/**
 * A group card's words, which no layout sends. The editor's and the account's namespaces go to the
 * browser whole, and while group cards were switched off that put the product's name, its panel,
 * its price sentence, the send screen's lines about a group's notes and the confirming page's
 * sentences into the source of every editor, dashboard and account page. So <ClientMessages> leaves
 * these paths out wherever it is used, and a page that draws a group card's panel sends `browser`
 * itself (<GroupMessages>, in client-messages.tsx): the editor of a template made for group cards
 * while group cards are on, and nothing else on the live site. Off, no page sends them and the
 * editor reads none (its panel is not drawn; the send screen takes `groupEnabled`).
 *
 * `browser`: the panel and its pay panel, the section's heading, and on the send screen the sign-in
 * line and the checklist's three lines about a group's notes.
 * `server`: read by the server alone and never sent: the product's name, the account page's two
 * lines of what is held, and the page a contributor's confirming link opens (api/group/confirm).
 *
 * Every key of the catalogue named for a group or a contribution is in one of the two lists:
 * tests/unit/client-messages.test.ts fails a new one that is not.
 */
export const GROUP_WORDS = {
  browser: [
    "editor.group",
    "editor.sections.group",
    "editor.publishSheet.signInBlurbGroup",
    "editor.publishSheet.problems.contributionsMin",
    "editor.publishSheet.problems.contributionsMax",
    "editor.publishSheet.problems.contributionNote",
  ],
  // templates.group: the page of a template sold only as a group card, drawn on the server (templates/[slug]/page.tsx)
  server: ["money.product.group", "account.groupOn", "account.groupEvery", "lifecycle.group", "templates.group"],
} as const;

export type ClientScope = keyof typeof CLIENT_NAMESPACES;

/**
 * Branches a scope sends that its own pages never read in the browser, cut back out of what it sends.
 * /pricing shares the `pricing` namespace with the /gifts teaser, whose full dress alone reads the old
 * card names, buttons, lists and blurbs ("One template", "Unlock one", "One premium template", "no footer");
 * on /pricing the quiet cards read `pricing.page.cards` instead, and the blurbs are read on the server only
 * (the closed "What each one includes" row), so the whole `pricing.plans` branch stays out of its payload.
 */
export const CLIENT_OMIT: Partial<Record<ClientScope, readonly string[]>> = {
  "(marketing)/pricing/layout": [
    "pricing.plans",
    "pricing.perTemplate",
    "pricing.oneTime",
    "pricing.priority",
  ],
};

/** What <ClientMessages scope="…"> sends to the browser: the scope's share of the catalogue, less a group card's words and what the scope's own pages never read (CLIENT_OMIT). */
export function messagesForScope(all: AbstractIntlMessages, scope: ClientScope): AbstractIntlMessages {
  return omitMessages(pickMessages(all, CLIENT_NAMESPACES[scope]), [...GROUP_WORDS.browser, ...GROUP_WORDS.server, ...(CLIENT_OMIT[scope] ?? [])]);
}
