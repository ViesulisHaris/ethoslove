import { defineConfig } from "vitest/config";

/**
 * Test sets that call the real Claude API and spend money (tests/eval). Never part of `npm test`:
 *
 *   npx vitest run --config vitest.eval.config.ts
 *
 * Needs SUPPORT_ANTHROPIC_API_KEY (or ANTHROPIC_API_KEY) in the environment or .env.local.
 */
export default defineConfig({
  test: {
    include: ["tests/eval/**/*.eval.ts"],
    environment: "node",
    testTimeout: 60 * 60 * 1000,
    hookTimeout: 60 * 1000,
    // The prices the live site charges in and its address, so the guide reads as in production.
    env: { NEXT_PUBLIC_PRICE_CURRENCIES: "eur,usd,gbp", NEXT_PUBLIC_SITE_URL: "https://tryethos.io" },
    server: { deps: { inline: ["next-intl"] } },
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
