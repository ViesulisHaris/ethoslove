/**
 * Environment access with graceful degradation.
 * The app must boot with zero env vars so the scaffold, templates and editor can be
 * demoed before any third-party account exists. Features check `isConfigured.*`.
 */
const read = (key: string): string | undefined => {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
};

export const env = {
  siteUrl: read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",

  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey:
    read("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),

  stripeSecretKey: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  stripePublishableKey: read("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  /**
   * Ethos's own Customer Portal configuration (bpc_…), made by scripts/setup-billing-portal.mjs. The
   * Stripe account is shared, so its default portal belongs to nobody in particular: without this the
   * portal route refuses rather than fall back to it (docs/MEMBERSHIP.md 2.1, R5).
   */
  stripePortalConfiguration: read("STRIPE_PORTAL_CONFIGURATION"),

  /**
   * The iPhone app's In-App Purchases (lib/commerce/app-store.ts). The v1 secret key (`sk_…`) asks
   * RevenueCat what a user bought; the webhook's Authorization value is whatever the RevenueCat
   * dashboard sends with each event (e.g. `Bearer <random>`), compared exactly.
   */
  revenueCatSecretKey: read("REVENUECAT_SECRET_API_KEY"),
  revenueCatWebhookAuth: read("REVENUECAT_WEBHOOK_AUTH"),

  resendApiKey: read("RESEND_API_KEY"),
  emailFrom: read("EMAIL_FROM") ?? "Ethos <hello@tryethos.io>",

  posthogKey: read("NEXT_PUBLIC_POSTHOG_KEY"),
  posthogHost: read("NEXT_PUBLIC_POSTHOG_HOST") ?? "https://us.i.posthog.com",

  /**
   * Microsoft Clarity project id: heatmaps, scroll maps and session replay.
   *
   * Written out in full rather than through `read()` on purpose. Next only substitutes
   * `process.env.NEXT_PUBLIC_*` where it appears literally; a dynamic `process.env[key]`
   * survives into the browser bundle, where `process` does not exist, so it reads as unset.
   * This value is checked in the browser — it decides whether the banner and the tag load —
   * so it has to be one Next can inline.
   */
  clarityId: process.env.NEXT_PUBLIC_CLARITY_ID || undefined,

  /**
   * Meta (Facebook and Instagram) pixel id, for telling Meta's ads which visits ended in a sale.
   * Written out literally for the same reason as `clarityId`: the browser decides with it whether the
   * banner asks and whether the pixel loads. Unset, nothing of Meta's loads and nothing is sent.
   */
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined,
  /** The Conversions API's access token (server only): the webhook reports each consented sale with it. */
  metaCapiToken: read("META_CAPI_TOKEN"),
  /** Events Manager → Test events: while set, server events show up there instead of counting. */
  metaTestEventCode: read("META_TEST_EVENT_CODE"),

  /** TikTok pixel id (its "pixel code"), the same way and for the same reasons as `metaPixelId`. */
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || undefined,
  /** The Events API's access token (server only), made in TikTok Events Manager next to the pixel. */
  tiktokEventsToken: read("TIKTOK_EVENTS_TOKEN"),
  /** TikTok Events Manager → Test events: while set, server events go there instead of counting. */
  tiktokTestEventCode: read("TIKTOK_TEST_EVENT_CODE"),

  sentryDsn: read("NEXT_PUBLIC_SENTRY_DSN"),

  anthropicApiKey: read("ANTHROPIC_API_KEY"),

  cronSecret: read("CRON_SECRET"),
  upstashRedisUrl: read("UPSTASH_REDIS_REST_URL"),
  upstashRedisToken: read("UPSTASH_REDIS_REST_TOKEN"),

  /**
   * Search Console and Bing Webmaster ownership, as the meta tag each one offers. Server-side:
   * `generateMetadata` runs on the server, so these never need to reach the browser bundle.
   * Left unset the tags are simply absent, which is also the right answer when ownership was
   * proved by DNS instead.
   */
  googleSiteVerification: read("GOOGLE_SITE_VERIFICATION"),

  /**
   * Ratings from the rest of the web, each behind its owner's key. With neither set, a place still
   * gets its links out (dates/elsewhere.ts); with one set, its score is shown beside ours, with
   * their name and a link back, which is what their terms require.
   */
  tripadvisorKey: read("TRIPADVISOR_API_KEY"),
  googlePlacesKey: read("GOOGLE_PLACES_API_KEY"),
  bingSiteVerification: read("BING_SITE_VERIFICATION"),

  /** Apple Sign-In is hidden until the provider is configured in Supabase. */
  authAppleEnabled: read("NEXT_PUBLIC_AUTH_APPLE_ENABLED") === "true",
  authGoogleEnabled: read("NEXT_PUBLIC_AUTH_GOOGLE_ENABLED") !== "false",
} as const;

export const isConfigured = {
  supabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  supabaseAdmin: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
  // The webhook secret is checked by the webhook route itself; the success page fulfils
  // purchases without it, so checkout only needs the secret key.
  stripe: Boolean(env.stripeSecretKey),
  revenueCat: Boolean(env.revenueCatSecretKey),
  resend: Boolean(env.resendApiKey),
  posthog: Boolean(env.posthogKey),
  clarity: Boolean(env.clarityId),
  metaPixel: Boolean(env.metaPixelId),
  tiktokPixel: Boolean(env.tiktokPixelId),
  /** Whether anything on the site waits for the cookie banner's answer, so whether it asks at all. */
  cookieConsent: Boolean(env.clarityId || env.metaPixelId || env.tiktokPixelId),
  sentry: Boolean(env.sentryDsn),
  ai: Boolean(env.anthropicApiKey),
  upstash: Boolean(env.upstashRedisUrl && env.upstashRedisToken),
} as const;
