/**
 * Which parts of the message catalogue each part of the site sends to the browser.
 *
 * Handing NextIntlClientProvider no `messages` serialises the whole catalogue into every page:
 * ~57 KB of strings (20 KB gzipped) in each HTML document, and again in the root layout's
 * prefetch, for pages whose client components read a few hundred bytes of it. So each route
 * file sends only what the client components it renders read, and the providers stack: a page
 * gets its own entries plus those of every layout above it (see ClientMessages).
 *
 * Keys are route files under src/app/[locale], without the extension; the file wraps what it
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
  "(marketing)/layout": ["nav", "tour"],
  "(marketing)/page": ["dates.where", "home.templates", "templates"],
  "(marketing)/gifts/page": ["home", "occasions", "templates", "pricing", "money.plans", "money.account", "money.checkoutErrors", "money.recovery"],
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
  "(marketing)/templates/layout": ["templates", "occasions"],
  // Where a free gift's footer leads: the template cards.
  "(marketing)/made-with-ethos/page": ["templates"],
  "(marketing)/occasions/layout": ["templates", "occasions"],
  "(marketing)/dates/layout": ["dates", "affiliate", "savedDates"],
  "(marketing)/plan/layout": ["plan", "affiliate", "giftChooser", "pickers", "savedDates", "auth"],
  "(marketing)/trips/layout": ["trips", "affiliate", "giftChooser", "savedDates", "auth"],
  "(marketing)/long-distance/layout": ["ldr", "dates.where", "trips.flights", "affiliate", "templates"],
  "(marketing)/games/layout": ["games", "packs", "money.checkoutErrors"],
  "(editor)/layout": ["tour", "editor", "auth", "lifecycle", "money", "occasions", "pickers"],
  "(app)/layout": ["account", "dashboard", "lifecycle", "money", "membership", "savedDates"],
  "(auth)/layout": ["auth"],
  "(gift)/demo/[slug]/page": ["templates"],
} as const satisfies Record<string, readonly string[]>;

export type ClientScope = keyof typeof CLIENT_NAMESPACES;
