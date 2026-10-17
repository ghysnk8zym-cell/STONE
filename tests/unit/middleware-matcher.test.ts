import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { routing } from "@/i18n/routing";

// The matcher must be a static literal (Next analyses it at build time), so it cannot be built from
// `routing.locales`. This test keeps the two in sync and stops the catalog matcher from catching
// static files such as /images/catalog/<file>.webp (a `:locale` wildcard matched "images").
const source = readFileSync(
  path.join(process.cwd(), "src/middleware.ts"),
  "utf8",
);

describe("middleware matcher", () => {
  it("limits the catalog matcher to the real locales", () => {
    const expected = `"/(${routing.locales.join("|")})/catalog/:path*"`;
    expect(source).toContain(expected);
    expect(source).not.toContain('"/:locale/catalog/:path*"');
  });
});
