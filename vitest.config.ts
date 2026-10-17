import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    include: ["tests/unit/**/*.test.ts?(x)"],
    environment: "node",
    // The first PGlite start (WebAssembly) takes seconds, and several test files start one
    // at the same time on a loaded machine.
    testTimeout: 30_000,
    // Same for hooks (default 10 s) that start PGlite and hash test passwords with scrypt.
    hookTimeout: 60_000,
    // next-intl's ESM build imports `next/server` without an extension, which Node's resolver
    // rejects; letting Vite resolve it makes the real middleware importable in tests.
    server: { deps: { inline: ["next-intl"] } },
  },
});
