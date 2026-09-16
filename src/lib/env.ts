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

  sentryDsn: read("NEXT_PUBLIC_SENTRY_DSN"),

  anthropicApiKey: read("ANTHROPIC_API_KEY"),

  cronSecret: read("CRON_SECRET"),
  upstashRedisUrl: read("UPSTASH_REDIS_REST_URL"),
  upstashRedisToken: read("UPSTASH_REDIS_REST_TOKEN"),

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
  resend: Boolean(env.resendApiKey),
  posthog: Boolean(env.posthogKey),
  clarity: Boolean(env.clarityId),
  sentry: Boolean(env.sentryDsn),
  ai: Boolean(env.anthropicApiKey),
  upstash: Boolean(env.upstashRedisUrl && env.upstashRedisToken),
} as const;
