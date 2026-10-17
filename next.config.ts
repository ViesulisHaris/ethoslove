import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 90],
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/**" }]
        : []),
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
    ],
  },
  // Three.js and GSAP ship ESM that Turbopack handles fine; keep sharp server-only.
  serverExternalPackages: ["sharp"],
  // Link-preview fetchers get a page's metadata in its <head> rather than streamed after it: a shared
  // plan's or place's preview tags read the query, so those pages render per request, and a fetcher
  // that stops at </head> saw no photograph. Next's own list (next/dist/shared/lib/router/utils/
  // html-bots.js, which this replaces, so it is copied whole) plus the chat and social apps it lacks.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot|Viber|Snapchat|Pinterest|Mastodon|Bluesky|Cardyb|Embedly|Iframely|Signal/i,
  // A trip's link preview is drawn from its own picture, read from disk by the card's route
  // (app/og/share.jpg): public/ is served by the CDN and is not otherwise in the function.
  outputFileTracingIncludes: {
    "/og/share.jpg": ["./public/trips/*.webp"],
  },
  // Search Console showed `www.tryethos.io/&` with 700 impressions and 19 clicks in four days — a
  // mangled link somewhere out there (an `&amp;` left behind), and every click landed on a 404.
  redirects: async () => [
    { source: "/&", destination: "/", permanent: true },
    { source: "/es/&", destination: "/es", permanent: true },
  ],
  headers: async () => [
    // Universal links for the iPhone app (public/.well-known/apple-app-site-association): a shared plan,
    // a For Two invite, a trip and a template's page open in the app. Gift links (/g/…) are deliberately
    // not claimed: whoever receives one always gets the full-screen web gift. Its "webcredentials" lets
    // iCloud Keychain save and offer tryethos.io passwords in the app, which claims webcredentials:tryethos.io.
    // Apple fetches the file over HTTPS with no redirects and wants JSON; it has no extension, so the type
    // is said here.
    {
      source: "/.well-known/apple-app-site-association",
      headers: [
        { key: "Content-Type", value: "application/json" },
        { key: "Cache-Control", value: "public, max-age=3600" },
      ],
    },
    {
      source: "/audio/library/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    // The demo's files, not the demo: `/demo/:path*` also matched the page `/demo/bloom`, so a
    // browser kept an English demo page for a year, immutable, and never saw a fix to it again.
    {
      source: "/demo/:dir(audio|photos)/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/icons/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    // A template's poster and preview video, one level below its page: `/templates/:path*` also
    // matched `/templates/bouquet` itself, which browsers then kept for a week after a deploy.
    {
      source: "/templates/:slug/:file+",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
    },
    // A blog post's images (public/blog/<post>/), for the same reason one level below the post.
    {
      source: "/blog/:slug/:file+",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
    },
    // The cut-outs the covers and the collage templates are made of. They are on the first screen of
    // a gift now, a dozen at a time, and every one was being re-checked with the server on every
    // open. A day, not a year: a picture can be swapped for another under the same name.
    {
      source: "/:dir(scraps|memes)/:file",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" }],
    },
    // The Dates and trips illustrations (src/lib/dates/art.ts, src/lib/trips/presets.ts): the heroes,
    // the idea cards and the kind tiles, a dozen on the first screen of / and /dates, were each
    // re-checked with the server on every visit (Next serves public/ with max-age=0). A week fresh,
    // then served at once from the cache while it checks in the background. Not immutable: the
    // names carry no version, and a redrawn picture goes out under the same one.
    // Files only: `/dates/:path*` would also match the city pages /dates/<city>, and `/trips/:path*` the trips.
    {
      source: "/dates/:dir(ideas|hero|kinds)/:file",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=31536000" }],
    },
    {
      source: "/trips/:file([^/]+\\.webp)",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=31536000" }],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        {
          key: "Permissions-Policy",
          // Templates need mic (Birthday Cinema), motion (Jar, Constellations), gyroscope; the Dates
          // map asks where they are, only when they press "Near me".
          value: "camera=(), microphone=(self), geolocation=(self), accelerometer=(self), gyroscope=(self)",
        },
      ],
    },
    {
      // MapLibre's browser files (scripts/copy-maplibre.mjs). The folder is named after the version.
      source: "/vendor/maplibre-gl/:version/:file",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      // Decoder workers (scripts/heic-worker.mjs). After the rule above on purpose: for the same
      // header, the later rule wins, so these files get this policy instead of the page's. libheif
      // calls `new Function` while it starts, and a worker loaded from a URL runs under the policy
      // served with it. It can't touch the page or its DOM, and with default-src 'none' it can't
      // fetch anything either. Filenames carry the library version, so they never change in place.
      source: "/workers/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'unsafe-eval'" },
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
};

/**
 * One policy for the whole site. Next's own inline scripts/styles need 'unsafe-inline';
 * dev adds eval + the HMR socket. Supabase (storage, auth), Stripe (js + Checkout) and
 * Apple's song previews/artwork are the third parties, plus Microsoft Clarity once it has a
 * project id. Vercel Analytics and Speed Insights load from /_vercel on this origin; only their
 * dev debug scripts come from va.vercel-scripts.com. The Dates map draws OpenFreeMap's tiles,
 * lettering and icons; the map library itself is served from this origin (/vendor). Photographs of
 * places are Wikimedia's, loaded from its two image hosts.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV !== "production";
  // Only widened when Clarity is actually configured, so a build without it keeps the tighter
  // policy. The wildcard is needed on script-src, not just www: the tag at www.clarity.ms is a
  // loader that pulls the library from scripts.clarity.ms, and a version number in that path
  // means pinning the host is the most that can be pinned. It reports to a regional
  // *.clarity.ms host as well.
  const clarity = Boolean(process.env.NEXT_PUBLIC_CLARITY_ID);
  const clarityScript = clarity ? " https://*.clarity.ms" : "";
  const clarityConnect = clarity ? " https://*.clarity.ms https://c.bing.com" : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""} https://js.stripe.com${clarityScript}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.mzstatic.com https://i.ytimg.com https://i.scdn.co https://*.spotifycdn.com https://tiles.openfreemap.org https://upload.wikimedia.org https://thumb.wikimedia.org",
    "media-src 'self' data: blob: https://*.supabase.co https://*.itunes.apple.com https://*.apple.com https://*.mzstatic.com",
    "font-src 'self' data:",
    `connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://itunes.apple.com https://*.itunes.apple.com https://*.mzstatic.com https://tiles.openfreemap.org${clarityConnect}${dev ? " ws: http://localhost:*" : ""}`,
    "worker-src 'self' blob:",
    "frame-src https://js.stripe.com https://checkout.stripe.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export default withNextIntl(nextConfig);
