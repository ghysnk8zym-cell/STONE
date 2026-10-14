import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Guards against the encoding accident of Phase 3 Task 8: a file read as ANSI and re-saved as UTF-8
 * (for example PowerShell 5.1 `Get-Content` + `Set-Content -Encoding utf8`) turns "—", "→", "©" and
 * Cyrillic into mojibake and adds a BOM. Scans the docs and the tests (the places written by scripts).
 */
const ROOTS = ["docs", "tests"];
const TEXT = /\.(md|ts|tsx|mjs|json|css)$/;
// UTF-8 bytes of a non-ASCII character read as Windows-1252 / Latin-1 start with these lead characters
// followed by a continuation character (U+0080 to U+00BF), or are the typical punctuation sequences.
const LATIN1 = /[ÂÃÐÑ][\u0080-¿]|â€|â†|â[\u0080-¿]/;
// The same accident on a Russian Windows (ANSI = windows-1251): a lead byte shows as a capital Cyrillic
// letter and the continuation byte as punctuation or a symbol ("В©", "Р°", "в†’", "вЂ”").
const CP1251 = /[ВГРС][ ¤¦-©¬-±µ-·‘-›€№ЂЃѓЉЊЌЋЏђљњќћџ]|в†|вЂ/;
const MOJIBAKE = new RegExp(`${LATIN1.source}|${CP1251.source}`);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return TEXT.test(entry.name) ? [path] : [];
  });
}

describe("text files", () => {
  const all = ROOTS.flatMap((root) => files(join(process.cwd(), root)));
  // this file spells the sequences out
  const scanned = all.filter((file) => !file.endsWith("text-encoding.test.ts"));

  it("scans a meaningful set of files", () => {
    expect(all.length).toBeGreaterThan(20);
  });

  it("have no byte order mark", () => {
    const withBom = all.filter((file) => readFileSync(file)[0] === 0xef);
    expect(withBom).toEqual([]);
  });

  it("contain no mojibake sequences", () => {
    const broken = scanned.filter((file) =>
      MOJIBAKE.test(readFileSync(file, "utf8")),
    );
    expect(broken).toEqual([]);
  });
});
