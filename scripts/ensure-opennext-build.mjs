// wrangler `build.command` (see wrangler.jsonc). Workers Builds runs `wrangler preview` for
// preview branches without the dashboard build command, so build the OpenNext worker here
// when it is missing. Production deploys and the CI size check build first and skip this.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const WORKER_ENTRY = ".open-next/worker.js";

/**
 * @param {{ exists: (path: string) => boolean, run: (command: string) => void }} deps
 */
export function ensureOpenNextBuild({ exists, run }) {
  if (exists(WORKER_ENTRY)) return;
  run("pnpm run cf:build");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Guard against recursion if anything inside the build invokes wrangler again.
  if (process.env.STONE_ENSURE_BUILD !== "1") {
    ensureOpenNextBuild({
      exists: existsSync,
      run: (command) =>
        execSync(command, {
          stdio: "inherit",
          env: { ...process.env, STONE_ENSURE_BUILD: "1" },
        }),
    });
  }
}
