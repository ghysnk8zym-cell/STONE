// Starts the Playwright e2e server that HAS a database (playwright.config.ts, `auth-*` projects):
//   1. makes a fresh temporary directory under the OS temp dir for a PGlite database,
//   2. migrates and seeds it (`scripts/db-seed.mjs`: catalog, demo data, the two test users),
//   3. runs `next start` (the same build as the no-database servers) on E2E_PORT,
//   4. deletes the directory when the server exits.
// An in-memory database would be lost between the seed process and the server, so a directory is used.
// Run it with the test values loaded: `node --env-file=.env.test.example scripts/e2e-db-server.mjs`
// (BETTER_AUTH_SECRET and SEED_* come from there; they are fake). Prints no secrets.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = process.env.E2E_PORT ?? "3002";
const dataDir = mkdtempSync(join(tmpdir(), "stone-e2e-pglite-"));

function cleanup() {
  rmSync(dataDir, { recursive: true, force: true, maxRetries: 5 });
}

const env = {
  ...process.env,
  DATABASE_URL: `pglite://${dataDir.replaceAll("\\", "/")}`,
  BETTER_AUTH_URL: `http://localhost:${port}`,
  PLATFORM: "node",
};

const seed = spawnSync(process.execPath, ["scripts/db-seed.mjs"], {
  env,
  stdio: "inherit",
});
if (seed.status !== 0) {
  cleanup();
  console.error("e2e-db-server: the seed failed, not starting the server");
  process.exit(1);
}

const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const server = spawn(process.execPath, [nextBin, "start", "-p", port], {
  env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
process.on("exit", () => server.kill());
server.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
