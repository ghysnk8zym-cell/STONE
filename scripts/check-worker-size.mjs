// Fails when the OpenNext Worker exceeds the Workers Free compressed size limit.
// Run after `pnpm cf:build`. Linux/WSL/CI only (OpenNext does not support Windows builds).
import { execSync } from "node:child_process";

import { LIMIT_KIB, parseGzipKiB } from "./worker-size.mjs";

const output = execSync(
  "pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run",
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let gzipKiB;
try {
  gzipKiB = parseGzipKiB(output);
} catch (error) {
  // Show what wrangler printed so a format change can be diagnosed in CI.
  console.error(output);
  throw error;
}
console.log(`Worker gzip size: ${gzipKiB} KiB / limit ${LIMIT_KIB} KiB`);

if (gzipKiB > LIMIT_KIB) {
  console.error(
    "Worker exceeds the Workers Free limit — ask the owner before upgrading (ADR-001).",
  );
  process.exit(1);
}
