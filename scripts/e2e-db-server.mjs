// Starts the Playwright e2e server that HAS a database (playwright.config.ts, `auth-*` projects):
//   1. removes stale `stone-e2e-pglite-*` directories left by earlier runs (see below),
//   2. makes a fresh temporary directory under the OS temp dir for a PGlite database,
//   3. migrates and seeds it (`scripts/db-seed.mjs`: catalog, demo data, the two test users),
//   4. runs `next start` (the same build as the no-database servers) on E2E_PORT,
//   5. deletes the directory when the server exits normally or on SIGINT / SIGTERM.
// An in-memory database would be lost between the seed process and the server, so a directory is used.
// Playwright stops a web server with SIGKILL (taskkill /F on Windows) unless `gracefulShutdown` is set,
// and that is not supported on Windows, so the exit handlers can be skipped: that is why step 1 exists.
// Run it with the test values loaded: `node --env-file=.env.test.example scripts/e2e-db-server.mjs`
// (BETTER_AUTH_SECRET and SEED_* come from there; they are fake). Prints no secrets.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = process.env.E2E_PORT ?? "3002";
const PREFIX = "stone-e2e-pglite-";

function remove(dir) {
  rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
}

// Only direct children of the OS temp dir whose name starts with our prefix: nothing else is touched.
// A directory that is still in use (another run, a Windows file lock) is skipped, never an error.
for (const name of readdirSync(tmpdir())) {
  if (!name.startsWith(PREFIX)) continue;
  try {
    remove(join(tmpdir(), name));
  } catch {
    // in use: leave it
  }
}

const dataDir = mkdtempSync(join(tmpdir(), PREFIX));

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
  remove(dataDir);
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
  try {
    remove(dataDir);
  } catch {
    // the next run's start-up sweep removes it
  }
  process.exit(code ?? 0);
});
