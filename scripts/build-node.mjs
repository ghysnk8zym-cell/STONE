// An opt-in Node artifact; never invokes Cloudflare or a deployment command.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeStandaloneLinks } from "./copy-node-runtime.mjs";

export function assertNoBuildEnvFiles(root) {
  // Next copies loaded .env files into standalone output. Build from a clean
  // source copy and inject secrets only when starting the resulting server.
  const names = readdirSync(root).filter(
    (name) => name.startsWith(".env") && !name.endsWith(".example"),
  );
  if (names.length) {
    throw new Error(
      "build:node requires a source directory without .env files (examples are allowed). Use a clean source copy; do not remove your existing configuration. Supply runtime variables only when starting server.js.",
    );
  }
}

export function nodeBuildEnv(source) {
  return {
    ...source,
    STONE_BUILD_TARGET: "node-standalone",
    NEXT_TELEMETRY_DISABLED: "1",
    PLATFORM: "node",
    DATABASE_URL: "",
    BETTER_AUTH_SECRET: "",
    BETTER_AUTH_URL: "",
    SEED_ADMIN_EMAIL: "",
    SEED_ADMIN_PASSWORD: "",
    SEED_CLIENT_EMAIL: "",
    SEED_CLIENT_PASSWORD: "",
    SEED_ALLOW_REMOTE: "",
  };
}

function build() {
  const root = process.cwd();
  assertNoBuildEnvFiles(root);
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const result = spawnSync(process.execPath, [next, "build"], {
    cwd: root,
    env: nodeBuildEnv(process.env),
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      "build:node: Next build failed; no portable artifact verified.",
    );
  }
  const output = join(root, ".next", "standalone");
  if (!existsSync(join(output, "server.js"))) {
    throw new Error("build:node: standalone server.js is missing.");
  }
  for (const [from, to] of [
    ["public", "public"],
    [".next/static", ".next/static"],
    // Local PGlite reads migration SQL at runtime. Remote Postgres is migrated
    // separately with the source checkout's drizzle-kit, never on server start.
    ["drizzle", "drizzle"],
  ]) {
    cpSync(join(root, from), join(output, to), { recursive: true });
  }
  assertNoBuildEnvFiles(output);
  normalizeStandaloneLinks(output, root);
  cpSync(
    join(root, "scripts", "copy-node-runtime.mjs"),
    join(output, "copy-node-runtime.mjs"),
  );
  console.log(
    "build:node: .next/standalone is ready for runtime smoke testing.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    build();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
