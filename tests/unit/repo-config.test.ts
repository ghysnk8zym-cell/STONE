import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("repository configuration", () => {
  it("superpowers plugin is enabled for every developer", () => {
    const settings = JSON.parse(readFileSync(".claude/settings.json", "utf8"));
    expect(settings.enabledPlugins["superpowers@superpowers-marketplace"]).toBe(
      true,
    );
    expect(
      settings.extraKnownMarketplaces["superpowers-marketplace"].source,
    ).toEqual({
      source: "github",
      repo: "obra/superpowers-marketplace",
    });
  });

  it("CLAUDE.md contains the standing rules", () => {
    const rules = readFileSync("CLAUDE.md", "utf8");
    expect(rules).toContain("# STONE Web — operating rules for Claude");
    expect(rules).toContain("## 8. Never");
  });

  it.each([
    "docs/DEVELOPMENT.md",
    "docs/DEPLOYMENT.md",
    "docs/ARCHITECTURE.md",
  ])("%s exists", (path) => {
    expect(existsSync(path)).toBe(true);
  });
});
