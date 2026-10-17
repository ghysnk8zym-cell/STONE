import { describe, expect, it } from "vitest";

import {
  AUTH_MARKER,
  checkAuthCopies,
  findMarkerFiles,
  largestChunks,
  LIMIT_KIB,
  parseGzipKiB,
} from "../../scripts/worker-size.mjs";

describe("worker size budget", () => {
  it("parses gzip KiB from wrangler output", () => {
    expect(parseGzipKiB("Total Upload: 9876.54 KiB / gzip: 2345.67 KiB")).toBe(
      2345.67,
    );
  });

  it("throws when gzip size is missing", () => {
    expect(() => parseGzipKiB("Total Upload: 10 KiB")).toThrow(
      "Could not find gzip size in wrangler output",
    );
  });

  it("throws when the gzip size is not a number", () => {
    expect(() => parseGzipKiB("Total Upload: 10 KiB / gzip: . KiB")).toThrow(
      "Could not find gzip size in wrangler output",
    );
  });

  it("limit is 3 MiB", () => {
    expect(LIMIT_KIB).toBe(3072);
  });
});

describe("duplicate bundle guard", () => {
  const withAuth = (name: string) => ({
    name,
    text: `a ${AUTH_MARKER} b`,
  });

  it("finds the chunks that contain the Better Auth marker", () => {
    expect(
      findMarkerFiles([
        withAuth("chunks/ssr/a.js"),
        { name: "chunks/ssr/b.js", text: "nothing" },
        withAuth("chunks/ssr/c.js"),
      ]),
    ).toEqual(["chunks/ssr/a.js", "chunks/ssr/c.js"]);
  });

  it("passes when Better Auth is bundled once", () => {
    expect(checkAuthCopies(["chunks/ssr/a.js"])).toMatchObject({ ok: true });
  });

  it("fails and names every copy when it is bundled more than once", () => {
    const verdict = checkAuthCopies(["chunks/ssr/a.js", "chunks/ssr/b.js"]);
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("2 times");
    expect(verdict.message).toContain("chunks/ssr/a.js");
    expect(verdict.message).toContain("chunks/ssr/b.js");
  });

  it("fails when the marker is not found at all (a stale marker must not pass silently)", () => {
    const verdict = checkAuthCopies([]);
    expect(verdict.ok).toBe(false);
    expect(verdict.message).toContain("marker not found");
  });

  it("lists the largest chunks first, at most the requested count", () => {
    const chunks = [
      { name: "small.js", gzipBytes: 1024 },
      { name: "big.js", gzipBytes: 110_182 },
      { name: "mid.js", gzipBytes: 56_730 },
    ];
    expect(largestChunks(chunks, 2)).toEqual([
      "107.6 KiB  big.js",
      "55.4 KiB  mid.js",
    ]);
    expect(largestChunks(chunks)).toHaveLength(3);
    // The input is not reordered.
    expect(chunks[0]!.name).toBe("small.js");
  });
});
