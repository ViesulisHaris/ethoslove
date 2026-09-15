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
  headers: async () => [
    {
      source: "/audio/library/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/demo/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/icons/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
    {
      source: "/templates/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
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
          // Templates need mic (Birthday Cinema), motion (Jar, Constellations), gyroscope.
          value: "camera=(), microphone=(self), geolocation=(), accelerometer=(self), gyroscope=(self)",
        },
      ],
    },
  ],
};

/**
 * One policy for the whole site. Next's own inline scripts/styles need 'unsafe-inline';
 * dev adds eval + the HMR socket. Supabase (storage, auth), Stripe (js + Checkout) and
 * Apple's song previews/artwork are the only third parties.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV !== "production";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.mzstatic.com",
    "media-src 'self' data: blob: https://*.supabase.co https://*.itunes.apple.com https://*.apple.com https://*.mzstatic.com",
    "font-src 'self' data:",
    `connect-src 'self' data: https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://itunes.apple.com https://*.itunes.apple.com https://*.mzstatic.com${dev ? " ws: http://localhost:*" : ""}`,
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
