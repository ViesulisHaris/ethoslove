import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    environment: "node",
    // A file whose first test reads every template or every source file (templates.test.ts, client-messages.test.ts)
    // took more than the default 5 s to warm up on a machine running a dev server beside it, and failed there only.
    testTimeout: 30_000,
    // next-intl's middleware imports "next/server" with no extension, which Node's own loader refuses;
    // inlined, Vite resolves it, so tests/unit/visitor-currency.test.ts runs the real proxy.
    server: { deps: { inline: ["next-intl"] } },
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
