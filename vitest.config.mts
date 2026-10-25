import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    environment: "node",
    // next-intl's middleware imports "next/server" with no extension, which Node's own loader refuses;
    // inlined, Vite resolves it, so tests/unit/visitor-currency.test.ts runs the real proxy.
    server: { deps: { inline: ["next-intl"] } },
  },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
