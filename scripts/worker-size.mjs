// Cloudflare Workers Free plan limit for the compressed Worker upload (ADR-001).
export const LIMIT_KIB = 3072;

/**
 * Reads the gzip size from wrangler's "Total Upload: <x> KiB / gzip: <y> KiB" line.
 * @param {string} output
 * @returns {number}
 */
export function parseGzipKiB(output) {
  const match = /Total Upload:.*?gzip:\s*([\d.]+)\s*KiB/.exec(output);
  const size = match ? Number(match[1]) : NaN;
  // NaN would compare false against the limit and pass silently.
  if (!Number.isFinite(size)) {
    throw new Error("Could not find gzip size in wrangler output");
  }
  return size;
}

/*
 * Turbopack writes the shared server chunks once per route group, so one big dependency can end up in the
 * Worker several times (Phase 4a review: Better Auth + drizzle + zod, three copies of about 320 KiB gzip,
 * fixed by the side-effect imports in src/app/[locale]/layout.tsx). The guard below counts the SSR chunks
 * that hold Better Auth and fails on more than one. The marker is a message of the Better Auth core
 * (pinned version); when an upgrade changes it the guard fails with "marker not found" instead of passing
 * silently, and the marker is updated here.
 */
export const AUTH_MARKER = "Please use 'better-auth' for migration support.";

/**
 * Names of the files whose text holds the marker.
 * @param {{ name: string, text: string }[]} files
 * @param {string} [marker]
 * @returns {string[]}
 */
export function findMarkerFiles(files, marker = AUTH_MARKER) {
  return files.filter((file) => file.text.includes(marker)).map((f) => f.name);
}

/**
 * Verdict on the number of SSR chunks that contain Better Auth.
 * @param {string[]} names
 * @returns {{ ok: boolean, message: string }}
 */
export function checkAuthCopies(names) {
  if (names.length === 0) {
    return {
      ok: false,
      message: `Better Auth marker not found in any SSR chunk: update AUTH_MARKER in scripts/worker-size.mjs (or the SSR chunk directory is wrong)`,
    };
  }
  if (names.length > 1) {
    return {
      ok: false,
      message: `Better Auth is bundled ${names.length} times in the SSR chunks (${names.join(", ")}): a route group lost the shared copy. See src/app/[locale]/layout.tsx (the side-effect imports) and add the module that is now duplicated.`,
    };
  }
  return { ok: true, message: `Better Auth is bundled once (${names[0]})` };
}

/**
 * The `count` largest chunks by gzip size, largest first, as printable lines.
 * @param {{ name: string, gzipBytes: number }[]} chunks
 * @param {number} [count]
 * @returns {string[]}
 */
export function largestChunks(chunks, count = 10) {
  return [...chunks]
    .sort((a, b) => b.gzipBytes - a.gzipBytes)
    .slice(0, count)
    .map(
      (chunk) => `${(chunk.gzipBytes / 1024).toFixed(1)} KiB  ${chunk.name}`,
    );
}
