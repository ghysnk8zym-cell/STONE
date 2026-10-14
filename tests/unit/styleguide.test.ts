import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { QA_IDS } from "@/app/[locale]/%5Fstyleguide/sections/qa-ids";

const styleguideDir = join(
  process.cwd(),
  "src",
  "app",
  "[locale]",
  "%5Fstyleguide",
);
const sectionsDir = join(styleguideDir, "sections");

const sectionSources = readdirSync(sectionsDir)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => ({
    name,
    source: readFileSync(join(sectionsDir, name), "utf8"),
  }));

const literals = sectionSources.flatMap(({ name, source }) =>
  [...source.matchAll(/data-qa="([^"]+)"/g)].map((match) => ({
    name,
    id: match[1],
  })),
);

describe("styleguide data-qa ids", () => {
  it("are unique kebab-case strings", () => {
    expect(new Set(QA_IDS).size).toBe(QA_IDS.length);
    for (const id of QA_IDS) {
      expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("each id is written as a data-qa literal in a section file", () => {
    const written = new Set(literals.map((entry) => entry.id));
    expect(QA_IDS.filter((id) => !written.has(id))).toEqual([]);
  });

  it("sections use no data-qa that is missing from qa-ids.ts, and none twice", () => {
    const known = new Set<string>(QA_IDS);
    expect(literals.filter((entry) => !known.has(entry.id))).toEqual([]);
    const ids = literals.map((entry) => entry.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });
});

describe("styleguide production guard", () => {
  it("calls notFound() when APP_ENV is production", async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    // The real next-intl navigation cannot be resolved under Vitest (it imports "next/navigation"
    // without the .js extension); the production guard returns before anything renders.
    vi.doMock("@/i18n/navigation", () => ({
      Link: () => null,
      usePathname: () => "/",
      useRouter: () => ({}),
    }));
    vi.doMock("@/server/env", () => ({
      getServerEnv: () => ({ APP_ENV: "production" }),
    }));
    const { default: Page, generateMetadata } =
      await import("@/app/[locale]/%5Fstyleguide/page");
    await expect(
      Page({ params: Promise.resolve({ locale: "ru" }) }),
    ).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP") });

    // The 404 must not carry the styleguide title either (the layout title applies instead).
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "ru" }),
    });
    expect(metadata.title).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("marks the page noindex", () => {
    const page = readFileSync(join(styleguideDir, "page.tsx"), "utf8");
    expect(page).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  });
});
