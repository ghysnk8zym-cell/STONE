# Phase 1 — Scaffold, CI and first deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A portable Next.js 16 skeleton with ru/en routing, noindex, a Cloudflare (OpenNext) build within the Free size limit, green GitHub Actions CI on every PR, and a live Cloudflare preview URL in both locales.

**Architecture:** Plain Next.js App Router app; all Cloudflare specifics in `wrangler.jsonc`, `open-next.config.ts`, `scripts/` and `src/server/platform/`. next-intl handles `/ru` and `/en` in `src/middleware.ts`. Indexing policy is one pure module used by `next.config.ts` and `src/app/robots.ts`. No Figma visuals in this phase: pages are translated placeholders that Phase 3 replaces.

**Tech Stack:** Next.js 16.4, React 19, TypeScript (version chosen by create-next-app 16.4), pnpm 12 via corepack, Node 24 LTS, Tailwind CSS 4.3, next-intl 4.x, zod 4, Vitest 5, Playwright 1.64, @opennextjs/cloudflare 1.20, wrangler 4, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-13-web-architecture-design.md` and `docs/adr/ADR-001` … `ADR-005`.

## Global Constraints

- Repository root is the app root; never create a nested `stone/` folder.
- Node `24` in `.nvmrc`; `"packageManager": "pnpm@12.11.2"`; `"engines": { "node": ">=24 <25" }`.
- TypeScript `strict: true`; no `any` without a comment explaining why.
- Locales exactly `["ru", "en"]`, default `ru`, `localePrefix: "always"`, `localeDetection: false`.
- No user-facing string literals in JSX (`react/jsx-no-literals`); all copy in `messages/ru.json` and `messages/en.json`.
- No import of `@opennextjs/cloudflare`, `wrangler` or `cloudflare:*` outside `src/server/platform/`, `open-next.config.ts`, `scripts/`.
- Every response carries `X-Robots-Tag: noindex, nofollow` and `robots.txt` disallows all, unless `INDEXING=on`.
- Secrets never use the `NEXT_PUBLIC_` prefix; `.env*` git-ignored except `.env.example`.
- Worker compressed (gzip) upload size must be ≤ 3072 KiB; above it, stop and ask the owner (ADR-001 option A).
- Branch `chore/phase-1-scaffold` from `main`; Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR to `main`; no force-push.
- Cloudflare builds run on Linux only (CI / Workers Builds). Locally on Windows use `pnpm dev`, `pnpm build`, `pnpm start`.
- Do not create accounts or enter tokens in dashboards; the owner does it from `docs/DEPLOYMENT.md`.

## Review Focus

1. A stale or hand-edited `NEXT_LOCALE=de` cookie must not break `/`; it redirects to `/ru`. → Task 5 smoke test `invalid locale cookie falls back to ru`.
2. Upper-case or unknown locale (`/RU`, `/de`) must return 404, not a redirect loop or 500. → Task 5 smoke test `unknown locale is 404`.
3. `INDEXING` missing on the Cloudflare runtime must still yield noindex. → Task 3 unit test `defaults to noindex when INDEXING is unset` and Task 5 smoke header assertion.
4. Static files must bypass the locale middleware (`/favicon.ico`, `/_next/static/*`, `/robots.txt` are not redirected). → Task 5 smoke test `static files are not locale-redirected`.
5. If wrangler changes its dry-run output format, the size check must fail loudly instead of passing. → Task 6 unit test `throws when gzip size is missing`.

---

## File Structure

```
.nvmrc  .gitignore  .prettierrc.json  .prettierignore  .env.example
package.json  pnpm-lock.yaml  tsconfig.json  eslint.config.mjs  postcss.config.mjs
next.config.ts  vitest.config.ts  playwright.config.ts
wrangler.jsonc  open-next.config.ts                     # Cloudflare only
CLAUDE.md  README.md
.claude/settings.json
.github/workflows/ci.yml  .github/workflows/preview-smoke.yml
docs/ARCHITECTURE.md  docs/DEVELOPMENT.md  docs/DEPLOYMENT.md
messages/ru.json  messages/en.json
public/_headers                                          # static cache rule (Cloudflare/Netlify format)
scripts/worker-size.mjs  scripts/check-worker-size.mjs    # Cloudflare only
src/middleware.ts
src/app/layout.tsx  src/app/not-found.tsx  src/app/robots.ts  src/app/globals.css
src/app/[locale]/layout.tsx  src/app/[locale]/page.tsx  src/app/[locale]/not-found.tsx
src/i18n/routing.ts  src/i18n/request.ts  src/i18n/navigation.ts
src/server/env.ts  src/server/indexing.ts
src/server/platform/types.ts  index.ts  node.ts  cloudflare.ts
src/components/.gitkeep  src/features/account/.gitkeep  src/features/admin/.gitkeep
tests/unit/*.test.ts  tests/e2e/smoke.spec.ts
```

---

### Task 1: Next.js scaffold with lint, format, typecheck and Tailwind reset

**Files:**
- Create: everything create-next-app generates, `.nvmrc`, `.prettierrc.json`, `.prettierignore`
- Modify: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `src/app/globals.css`, `.gitignore`, `README.md` (keep `# STONE` heading)

**Interfaces:**
- Produces: scripts `dev`, `build`, `start`, `lint`, `format`, `format:check`, `typecheck` (`tsc --noEmit`); path alias `@/*` → `src/*`.

- [ ] **Step 1: Create the worktree** with superpowers:using-git-worktrees on branch `chore/phase-1-scaffold` from `main`.
- [ ] **Step 2: Enable pnpm**

Run: `corepack enable && corepack prepare pnpm@12.11.2 --activate && pnpm -v`
Expected: `12.11.2`

- [ ] **Step 3: Scaffold into a temporary sibling folder** (the repo is not empty)

Run: `pnpm dlx create-next-app@16.4.0 ../stone-scaffold-tmp --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --yes`
Then copy every generated file except `README.md` and `.git` into the worktree root and delete the temp folder.
Expected: `src/app/page.tsx`, `package.json`, `pnpm-lock.yaml` exist in the worktree root.

- [ ] **Step 4: Pin toolchain** — `.nvmrc` = `24`; in `package.json` set `packageManager`, `engines` (Global Constraints) and add scripts `typecheck`, `format` (`prettier --write .`), `format:check` (`prettier --check .`), `lint` (`eslint .`). Add `prettier` and `prettier-plugin-tailwindcss` as dev deps; `.prettierrc.json` = `{ "plugins": ["prettier-plugin-tailwindcss"] }`; `.prettierignore` covers `.next`, `.open-next`, `.wrangler`, `pnpm-lock.yaml`, `playwright-report`, `test-results`.
- [ ] **Step 5: Lint rules** in `eslint.config.mjs`: keep `eslint-config-next`; add `react/jsx-no-literals: ["error", { noStrings: true, ignoreProps: true }]` for `src/**/*.tsx`; add `no-restricted-imports` for patterns `@opennextjs/cloudflare`, `wrangler`, `cloudflare:*` with `ignores` override for `src/server/platform/**`.
- [ ] **Step 6: Tailwind reset** — `src/app/globals.css` contains `@import "tailwindcss";` followed by `@theme { --color-*: initial; --font-*: initial; }` and nothing else (tokens arrive in Phase 2). Delete the scaffold's demo page content and `public/*.svg`.
- [ ] **Step 7: Verify**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build`
Expected: all exit 0. (The demo page is replaced in Task 4; if `react/jsx-no-literals` flags `src/app/page.tsx`, delete that file now — Task 4 adds `[locale]/page.tsx`.)

- [ ] **Step 8: Commit** — `chore: scaffold Next.js 16 with pnpm, TypeScript strict, ESLint, Prettier and Tailwind v4`

---

### Task 2: Vitest harness, required structure and portability guard

**Files:**
- Create: `vitest.config.ts`, `tests/unit/structure.test.ts`, `src/components/.gitkeep`, `src/features/account/.gitkeep`, `src/features/admin/.gitkeep`, `src/server/platform/types.ts`, `src/server/platform/node.ts`, `src/server/platform/cloudflare.ts`, `src/server/platform/index.ts`
- Modify: `package.json` (scripts `test` = `vitest run`, `test:watch` = `vitest`; dev deps `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react`)

**Interfaces:**
- Produces: `type PlatformName = "node" | "cloudflare"`; `interface PlatformAdapter { name: PlatformName }`; `export const platform: PlatformAdapter` from `@/server/platform`, chosen by `process.env.PLATFORM` (`"cloudflare"` → cloudflare adapter, anything else → node). Later phases add `imageLoader` here.

- [ ] **Step 1: Write the failing tests** in `tests/unit/structure.test.ts`:
  - `required folders exist` — asserts each of `docs`, `src/app/[locale]`, `src/components`, `src/features/account`, `src/features/admin`, `src/server`, `src/server/platform`, `messages`, `tests` exists.
  - `no Cloudflare imports outside the platform adapter` — walks `src/**/*.{ts,tsx}` excluding `src/server/platform/**`, asserts no file matches `/from\s+["'](@opennextjs\/cloudflare|wrangler|cloudflare:[^"']+)["']/`.
  - `platform defaults to node` — `delete process.env.PLATFORM`, dynamic import `@/server/platform`, expect `platform.name === "node"`; with `PLATFORM=cloudflare` (fresh module via `vi.resetModules()`) expect `"cloudflare"`.
- [ ] **Step 2: Run** `pnpm test` — Expected: FAIL (missing folders and module).
- [ ] **Step 3: Implement** `vitest.config.ts` (plugins react + tsconfig paths; `include: ["tests/unit/**/*.test.ts?(x)"]`; default environment `node`), the `.gitkeep` files, and the four platform files per Interfaces. `src/app/[locale]` is created in Task 4, so mark that one assertion `it.todo` until Task 4 Step 3 flips it back.
- [ ] **Step 4: Run** `pnpm test` — Expected: PASS (one todo).
- [ ] **Step 5: Commit** — `test: add Vitest harness, required structure and platform adapter guard`

---

### Task 3: Server env schema and indexing policy

**Files:**
- Create: `src/server/env.ts`, `src/server/indexing.ts`, `src/app/robots.ts`, `.env.example`, `tests/unit/env.test.ts`, `tests/unit/indexing.test.ts`
- Modify: `next.config.ts`, `package.json` (dep `zod`, `server-only`)

**Interfaces:**
- Produces:
  - `src/server/env.ts` (starts with `import "server-only"`): `const serverEnvSchema` (zod object: `APP_ENV: enum["development","preview","production"]` default `"development"`; `INDEXING: enum["on","off"]` default `"off"`; `SITE_URL: string url, optional`; `PLATFORM: enum["node","cloudflare"]` default `"node"`); `parseServerEnv(source: Record<string, string | undefined>): ServerEnv`; `getServerEnv(): ServerEnv` (memoised `parseServerEnv(process.env)`); `export const SERVER_ENV_KEYS: readonly string[]` = schema keys.
  - `src/server/indexing.ts` (no `server-only`; imported by `next.config.ts`): `isIndexingEnabled(value: string | undefined): boolean` (true only for exactly `"on"`); `robotsHeaders(enabled: boolean): { key: string; value: string }[]` → `[{ key: "X-Robots-Tag", value: "noindex, nofollow" }]` when disabled, `[]` when enabled; `robotsRules(enabled: boolean): MetadataRoute.Robots` → disabled: `{ rules: { userAgent: "*", disallow: "/" } }`, enabled: `{ rules: { userAgent: "*", allow: "/" } }`.

- [ ] **Step 1: Write failing tests**
  - `env.test.ts`: `defaults to noindex when INDEXING is unset` (`parseServerEnv({}).INDEXING === "off"`); `rejects invalid INDEXING with the variable name but not its value` (`parseServerEnv({ INDEXING: "secret-xyz" })` throws; message contains `INDEXING`, does not contain `secret-xyz`); `.env.example lists every server env key` (reads `.env.example`, every `SERVER_ENV_KEYS` entry appears as `KEY=`). Mock `server-only` with `vi.mock("server-only", () => ({}))`.
  - `indexing.test.ts`: `isIndexingEnabled` true only for `"on"` (cases `"on"`, `"ON"`, `"off"`, `undefined`, `""`); `robotsHeaders(false)` equals the noindex header array; `robotsHeaders(true)` is `[]`; `robotsRules(false).rules` has `disallow: "/"`.
- [ ] **Step 2: Run** `pnpm test` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both modules per Interfaces. Error message format: `Invalid server environment: INDEXING` (join issue paths; never include input values). `.env.example` contains the four keys with safe defaults and a comment header "Copy to .env.local. Never commit real values."
- [ ] **Step 4: Wire** `next.config.ts`: `async headers()` returns `[{ source: "/:path*", headers: robotsHeaders(isIndexingEnabled(process.env.INDEXING)) }]` (omit the entry when the array is empty); `src/app/robots.ts` default export returns `robotsRules(isIndexingEnabled(process.env.INDEXING))`.
- [ ] **Step 5: Run** `pnpm test && pnpm typecheck` — Expected: PASS.
- [ ] **Step 6: Commit** — `feat: add validated server env and noindex policy`

---

### Task 4: next-intl routing, messages and locale layouts

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/not-found.tsx`, `messages/ru.json`, `messages/en.json`, `src/i18n/global.d.ts`, `tests/unit/messages.test.ts`, `tests/unit/routing.test.ts`
- Modify: `src/app/layout.tsx`, `next.config.ts` (wrap with `createNextIntlPlugin("./src/i18n/request.ts")`), `package.json` (dep `next-intl`), `tests/unit/structure.test.ts` (un-todo the `[locale]` assertion)

**Interfaces:**
- Consumes: `robotsHeaders`, `isIndexingEnabled` (Task 3) inside `next.config.ts`.
- Produces: `routing` from `src/i18n/routing.ts` (`defineRouting({ locales: ["ru","en"], defaultLocale: "ru", localePrefix: "always", localeDetection: false })`); `Locale = (typeof routing.locales)[number]`; `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from `src/i18n/navigation.ts` (`createNavigation(routing)`); `AppConfig` augmentation in `src/i18n/global.d.ts` typing `Messages` from `messages/en.json` and `Locale`.
- Message keys (both files, same shape): `common.siteName` (`"STONE"` in both), `meta.title`, `meta.description`, `placeholder.title`, `placeholder.body`, `notFound.title`, `notFound.back`. English copy: title "STONE — natural stone", description "Natural stone surfaces.", placeholder.title "Site under construction", placeholder.body "This test build is not indexed.", notFound.title "Page not found", notFound.back "Back to home". Russian: "STONE — натуральный камень", "Поверхности из натурального камня.", "Сайт в разработке", "Эта тестовая сборка не индексируется.", "Страница не найдена", "На главную".

- [ ] **Step 1: Write failing tests**
  - `messages.test.ts`: `ru and en have identical key sets` (deep key flattening, sorted equality); `no empty values` (every leaf is a non-empty trimmed string in both).
  - `routing.test.ts`: `routing.locales` equals `["ru","en"]`; `defaultLocale` is `"ru"`; `localePrefix` is `"always"`; `localeDetection` is `false`.
- [ ] **Step 2: Run** `pnpm test` — Expected: FAIL.
- [ ] **Step 3: Implement** per next-intl 4 App Router docs: `src/middleware.ts` = `createMiddleware(routing)` with `config.matcher = ["/((?!api|_next|_vercel|.*\\..*).*)"]`; `[locale]/layout.tsx` validates the locale with `hasLocale` (else `notFound()`), calls `setRequestLocale`, renders `<html lang={locale}>` with `NextIntlClientProvider`, exports `generateStaticParams` and `generateMetadata` from `meta.*`; `[locale]/page.tsx` renders `placeholder.title` in an `<h1>` and `placeholder.body` in a `<p>`; root `layout.tsx` returns `children` only; root `not-found.tsx` renders a minimal English fallback document with `<html lang="en">` using `en.json` `notFound.*` (no JSX literals).
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm typecheck && pnpm build` — Expected: PASS; build output lists `/ru` and `/en` as static.
- [ ] **Step 5: Commit** — `feat: add next-intl routing with ru default and en`

---

### Task 5: Playwright smoke tests

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json` (dev deps `@playwright/test`, `@axe-core/playwright`; scripts `test:e2e` = `playwright test`), `.gitignore` (`playwright-report`, `test-results`)

**Interfaces:**
- Consumes: routes from Task 4, headers/robots from Task 3.
- Produces: config reading `PLAYWRIGHT_BASE_URL` — when set, no `webServer` and that URL is `baseURL`; otherwise `webServer: { command: "pnpm start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }`. Projects `desktop` (Chromium, 1440×900) and `mobile` (Chromium, 390×844, `isMobile: true`). All smoke tests carry the tag `@smoke`.

- [ ] **Step 1: Write the tests** in `smoke.spec.ts`:
  - `root redirects to ru` — `page.goto("/")`, expect URL to end with `/ru`.
  - `ru and en render with matching lang` — for each locale, response status 200 and `html[lang]` equals the locale; `h1` text equals `placeholder.title` from the matching messages file.
  - `responses are noindex by default` — `request.get("/ru")` header `x-robots-tag` contains `noindex`.
  - `robots.txt disallows all` — body contains `Disallow: /`.
  - `invalid locale cookie falls back to ru` — add cookie `NEXT_LOCALE=de` for the base URL, goto `/`, expect `/ru`.
  - `unknown locale is 404` — `request.get("/de")` and `request.get("/RU")` both status 404.
  - `static files are not locale-redirected` — `request.get("/favicon.ico", { maxRedirects: 0 })` status 200; `request.get("/robots.txt", { maxRedirects: 0 })` status 200.
  - `ru home has no critical axe violations` — `AxeBuilder` on `/ru`, zero violations with impact `critical`.
- [ ] **Step 2: Run** `pnpm build && pnpm exec playwright install chromium && pnpm test:e2e` — Expected: every test PASS. If any fails, use superpowers:systematic-debugging before changing code; a real defect is fixed in the owning Task 3/4 file.
- [ ] **Step 3: Commit** — `test: add Playwright smoke tests for locales, noindex and static files`

---

### Task 6: Cloudflare (OpenNext) build and size budget

**Files:**
- Create: `wrangler.jsonc`, `open-next.config.ts`, `public/_headers`, `scripts/worker-size.mjs`, `scripts/check-worker-size.mjs`, `tests/unit/worker-size.test.ts`
- Modify: `package.json` (dev deps `@opennextjs/cloudflare`, `wrangler`; scripts below), `.gitignore` (`.open-next`, `.wrangler`, `.dev.vars`), `src/server/platform/cloudflare.ts` (comment only: env arrives via `process.env` under `nodejs_compat`)

**Interfaces:**
- Produces: scripts `cf:build` = `opennextjs-cloudflare build`, `cf:preview` = `opennextjs-cloudflare build && opennextjs-cloudflare preview`, `cf:deploy` = `opennextjs-cloudflare deploy`, `cf:upload` = `opennextjs-cloudflare upload`, `cf:size` = `node scripts/check-worker-size.mjs`.
- `scripts/worker-size.mjs`: `export const LIMIT_KIB = 3072`; `export function parseGzipKiB(output: string): number` — reads the number from wrangler's `Total Upload: <x> KiB / gzip: <y> KiB` line; throws `Error("Could not find gzip size in wrangler output")` when absent.
- `scripts/check-worker-size.mjs`: runs `pnpm exec wrangler deploy --dry-run --outdir .wrangler/dry-run`, prints `Worker gzip size: <y> KiB / limit 3072 KiB`, exits 1 when `y > LIMIT_KIB` with the message `Worker exceeds the Workers Free limit — ask the owner before upgrading (ADR-001).`

- [ ] **Step 1: Write failing tests** in `worker-size.test.ts`: `parses gzip KiB from wrangler output` (input `"Total Upload: 9876.54 KiB / gzip: 2345.67 KiB"` → `2345.67`); `throws when gzip size is missing` (input `"Total Upload: 10 KiB"` → throws the exact message); `limit is 3 MiB` (`LIMIT_KIB === 3072`).
- [ ] **Step 2: Run** `pnpm test` — Expected: FAIL.
- [ ] **Step 3: Implement** the two scripts. `wrangler.jsonc`: `name: "stone"`, `main: ".open-next/worker.js"`, `compatibility_date: "2026-09-29"`, `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, `assets: { directory: ".open-next/assets", binding: "ASSETS" }`, `services: [{ binding: "WORKER_SELF_REFERENCE", service: "stone" }]`, `vars: { PLATFORM: "cloudflare", APP_ENV: "preview", INDEXING: "off" }`; no R2, no images binding. `open-next.config.ts`: `export default defineCloudflareConfig({})`. `public/_headers`: `/_next/static/*` → `Cache-Control: public,max-age=31536000,immutable`.
- [ ] **Step 4: Run** `pnpm test` — Expected: PASS.
- [ ] **Step 5: Try the Cloudflare build locally** `pnpm cf:build && pnpm cf:size`. OpenNext does not guarantee Windows; if it fails on Windows, record the error and rely on Task 7 CI (Linux) as the verification for this step.
- [ ] **Step 6: Commit** — `build: add OpenNext Cloudflare adapter with 3 MiB size budget`

---

### Task 7: GitHub Actions CI and preview smoke workflow

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/preview-smoke.yml`

**Interfaces:**
- Consumes: scripts from Tasks 1–6.

- [ ] **Step 1: Write `ci.yml`** — triggers `pull_request` and `push` to `main`; `concurrency` per ref with cancel-in-progress; permissions `contents: read`. Shared setup per job: `actions/checkout@v5`, `pnpm/action-setup@v4` (reads `packageManager`), `actions/setup-node@v5` with `node-version-file: .nvmrc` and `cache: pnpm`, `pnpm install --frozen-lockfile`. Jobs on `ubuntu-latest`:
  - `quality`: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`.
  - `build`: `pnpm build` (portability proof).
  - `cloudflare`: `pnpm cf:build`, `pnpm cf:size`.
  - `e2e`: `pnpm exec playwright install --with-deps chromium`, `pnpm build`, `pnpm test:e2e`; on failure upload `playwright-report` with `actions/upload-artifact@v4`.
- [ ] **Step 2: Write `preview-smoke.yml`** — `workflow_dispatch` with required input `base_url`; same setup; runs `pnpm exec playwright install --with-deps chromium` then `pnpm test:e2e --grep @smoke` with `PLAYWRIGHT_BASE_URL: ${{ inputs.base_url }}`.
- [ ] **Step 3: Verify locally** — `pnpm format:check` (Prettier parses both YAML files) — Expected: exit 0. Full verification is the green PR run in Task 9.
- [ ] **Step 4: Commit** — `ci: run lint, typecheck, tests, build, Cloudflare size check and Playwright on PRs`

---

### Task 8: Project rules, superpowers settings and developer docs

**Files:**
- Create: `CLAUDE.md`, `.claude/settings.json`, `docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`, `tests/unit/repo-config.test.ts`
- Modify: `README.md`

**Interfaces:**
- `.claude/settings.json` exactly:

```json
{
  "extraKnownMarketplaces": {
    "superpowers-marketplace": {
      "source": { "source": "github", "repo": "obra/superpowers-marketplace" }
    }
  },
  "enabledPlugins": { "superpowers@superpowers-marketplace": true }
}
```

- [ ] **Step 1: Write failing tests** in `repo-config.test.ts`: `superpowers plugin is enabled` (parse `.claude/settings.json`; `enabledPlugins["superpowers@superpowers-marketplace"] === true`; marketplace repo equals `obra/superpowers-marketplace`); `CLAUDE.md contains the standing rules` (contains `# STONE Web — operating rules for Claude` and `## 8. Never`); `docs exist` (`docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`).
- [ ] **Step 2: Run** `pnpm test` — Expected: FAIL.
- [ ] **Step 3: Write the files**
  - `CLAUDE.md`: Part B verbatim — lines 204–322 of `C:/Users/nartsiss/Documents/Codex/2026-10-03/prompt-engineer-llm-engineer-ai-system/outputs/stone-agent-system/prompts/web/STONE-WEB-MIGRATION.md` (the content inside the ```` ```markdown ```` fence, without the fence).
  - `docs/DEVELOPMENT.md`: prerequisites (Node 24, corepack), `corepack enable`, `pnpm install`, copy `.env.example` → `.env.local`, script table, Windows note (Cloudflare build only on Linux/WSL/CI), superpowers manual install — the two commands `/plugin marketplace add obra/superpowers-marketplace` and `/plugin install superpowers@superpowers-marketplace` (verified against the obra/superpowers README on 2026-10-13), plus the alternative `/plugin install superpowers@claude-plugins-official`.
  - `docs/DEPLOYMENT.md`: (a) Cloudflare Workers Builds click-by-click for the owner: Workers & Pages → Create → Import a repository → GitHub → `ghysnk8zym-cell/STONE`; project name `stone` (must equal `wrangler.jsonc` `name`); production branch `main`; build command `pnpm run cf:build`; deploy command `pnpm run cf:deploy`; non-production branch builds enabled with command `pnpm run cf:upload`; build variable `NODE_VERSION=24`; runtime variables from `.env.example`; where to find Preview URLs. Mark each Cloudflare UI label "verify in the current dashboard" because labels change. (b) GitHub branch protection steps for `main` requiring `quality`, `build`, `cloudflare`, `e2e`. (c) "Alternative hosting": Vercel, Netlify, Node/Docker steps from ADR-001 migration table (Dockerfile arrives in Phase 5).
  - `docs/ARCHITECTURE.md`: required structure and every additional folder with its reason: `src/i18n` (next-intl config), `src/styles` (tokens, Phase 2), `scripts` (Cloudflare size check), `.github/workflows` (CI), `.claude` (shared superpowers settings), `public` (static assets, `_headers`).
  - `README.md`: one paragraph, links to DEVELOPMENT, DEPLOYMENT, ARCHITECTURE, ADRs.
- [ ] **Step 4: Run** `pnpm test && pnpm format:check` — Expected: PASS.
- [ ] **Step 5: Commit** — `docs: add CLAUDE.md, superpowers settings and development/deployment/architecture docs`

---

### Task 9: Review, verification, PR and live preview

- [ ] **Step 1: Full local check** — `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` — Expected: all exit 0; keep the output for the report.
- [ ] **Step 2: Code review** — superpowers:requesting-code-review on the whole branch; handle findings with superpowers:receiving-code-review.
- [ ] **Step 3: Verification** — superpowers:verification-before-completion.
- [ ] **Step 4: Finish** — superpowers:finishing-a-development-branch → push `chore/phase-1-scaffold`, open PR to `main`, bind it, read CI via the PR status tool. Expected: `quality`, `build`, `cloudflare`, `e2e` all green; report the worker gzip size from the `cloudflare` job log.
- [ ] **Step 5: Owner connects Cloudflare** following `docs/DEPLOYMENT.md` (owner action; Claude does not touch dashboards).
- [ ] **Step 6: Verify the preview** — after the next push to the PR, read the Preview URL from the PR comment or the owner; run `curl -sI <url>/ru` and `curl -sI <url>/en` (expect 200 and `x-robots-tag: noindex, nofollow`), then ask the owner to start `preview-smoke.yml` with that URL or run it via `gh workflow run preview-smoke.yml -f base_url=<url>` with owner consent. Expected: smoke suite green against the live preview.
