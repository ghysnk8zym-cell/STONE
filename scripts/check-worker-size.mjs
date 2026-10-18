// Fails when the OpenNext Worker exceeds the Workers Free compressed size limit, or when Better Auth is
// bundled more than once. Prints the 10 largest server chunks.
// Run after `pnpm cf:build`. Linux/WSL/CI only (OpenNext does not support Windows builds).
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

import {
  checkAuthCopies,
  findMarkerFiles,
  largestChunks,
  LIMIT_KIB,
  parseGzipKiB,
} from "./worker-size.mjs";

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

/** The server chunks of the OpenNext bundle (the Next build is the fallback when `.open-next` is absent). */
const SERVER_DIRS = [
  ".open-next/server-functions/default/.next/server",
  ".next/server",
];

function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });
}

const serverDir = SERVER_DIRS.find((dir) => existsSync(join(dir, "chunks")));
let failed = gzipKiB > LIMIT_KIB;

if (!serverDir) {
  console.error(
    `No server chunks found in ${SERVER_DIRS.join(" or ")}: run pnpm cf:build first`,
  );
  failed = true;
} else {
  const files = jsFiles(join(serverDir, "chunks")).map((path) => {
    const buffer = readFileSync(path);
    return {
      name: relative(serverDir, path).replaceAll("\\", "/"),
      text: buffer.toString("utf8"),
      gzipBytes: gzipSync(buffer).length,
    };
  });

  console.log("Largest server chunks (gzip):");
  for (const line of largestChunks(files, 10)) console.log(`  ${line}`);

  // Only the SSR chunks: the route handlers (/api/*) carry their own copy, which cannot be shared.
  const ssr = files.filter((file) => file.name.startsWith("chunks/ssr/"));
  const verdict = checkAuthCopies(findMarkerFiles(ssr));
  console.log(verdict.message);
  if (!verdict.ok) {
    console.error(verdict.message);
    failed = true;
  }
}

if (gzipKiB > LIMIT_KIB) {
  console.error(
    "Worker exceeds the Workers Free limit — ask the owner before upgrading (ADR-001).",
  );
}
if (failed) process.exit(1);
