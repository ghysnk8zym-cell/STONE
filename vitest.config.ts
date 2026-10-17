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
  },
});
