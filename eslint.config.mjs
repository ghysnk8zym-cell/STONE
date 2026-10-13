import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.tsx"],
    rules: {
      // All user-facing copy lives in messages/*.json (ADR-004).
      "react/jsx-no-literals": [
        "error",
        { noStrings: true, ignoreProps: true },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/platform/**"],
    rules: {
      // Cloudflare specifics stay behind the platform adapter (ADR-001).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@opennextjs/cloudflare",
                "@opennextjs/cloudflare/*",
                "wrangler",
                "cloudflare:*",
              ],
              message:
                "Import platform specifics only inside src/server/platform/.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    ".superpowers/**",
    ".claude/worktrees/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
