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
