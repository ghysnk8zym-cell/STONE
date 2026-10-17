# Development

## Prerequisites

- Node.js 24 (see `.nvmrc`). With nvm: `nvm use`.
- pnpm 12 via corepack (version pinned in `package.json` → `packageManager`):

  ```bash
  corepack enable
  ```

  On Windows without admin rights, install the shim into a user folder on `PATH`:
  `corepack enable pnpm --install-directory "%APPDATA%\npm"`.

## First run

```bash
pnpm install
cp .env.example .env.local   # then edit values; never commit .env.local
pnpm dev                     # http://localhost:3000 → redirects to /ru
```

## Scripts

| Script                         | What it does                                                  |
| ------------------------------ | ------------------------------------------------------------- |
| `pnpm dev`                     | Next.js dev server                                            |
| `pnpm build`                   | Standard `next build` (portable: Node, Vercel, Netlify)       |
| `pnpm start`                   | Serve the production build                                    |
| `pnpm lint`                    | ESLint (includes no-JSX-literals and platform-import rules)   |
| `pnpm format`                  | Prettier write                                                |
| `pnpm format:check`            | Prettier check (CI)                                           |
| `pnpm typecheck`               | Route type generation + `tsc --noEmit`                        |
| `pnpm test`                    | Vitest unit tests (`tests/unit`)                              |
| `pnpm test:e2e`                | Playwright (`tests/e2e`); builds must exist (`pnpm build`)    |
| `pnpm db:seed`                 | Idempotent database seed (see below)                          |
| `pnpm cf:build`                | OpenNext build for Cloudflare Workers (Linux/WSL/CI only)     |
| `pnpm cf:size`                 | Fails if the Worker gzip size exceeds 3 MiB (run after build) |
| `pnpm cf:preview`              | Build and run the Worker locally with wrangler (Linux/WSL)    |
| `pnpm cf:deploy` / `cf:upload` | Used by Cloudflare Workers Builds (production / previews)     |

Database seed: `pnpm db:seed` reads `DATABASE_URL` and the four `SEED_*` values from the ignored `.env.local` (`node --env-file-if-exists`), upserts the 12 products with ru/en names and descriptions taken from `messages/*.json`, creates the Admin and the Client through Better Auth (emails lowercased, passwords hashed by Better Auth; the Admin role is set by the seed, never by sign-up, and an already existing account is promoted only if it holds SEED_ADMIN_PASSWORD, otherwise the seed stops with an error), and links the demo orders D-1048 and D-1032 and three favourites. It prints counts only and can be re-run safely: it only inserts missing rows and never overwrites existing products, translations or orders, so admin edits survive. It refuses to run against a remote database (anything but `pglite://` or a `localhost`/`127.0.0.1` postgres URL) unless `SEED_ALLOW_REMOTE=1` is set. With a `pglite://` URL it needs no database server. Without `DATABASE_URL` the site serves the static catalog (`getCatalog()` in `src/server/catalog`).

First Playwright run: `pnpm exec playwright install chromium`.

Extra scripts and the styleguide:

- `pnpm images` (`scripts/optimize-images.mjs`) builds the WebP width sets listed in `assets/figma-manifest.json`.
- `pnpm qa:visual` (`scripts/visual-compare.mjs`) compares styleguide components with the Figma reference screenshots in `tests/visual/figma/` and writes `-impl`/`-figma`/`-diff` PNGs and `results.md` to `docs/QA/phase-2/` (only the curated set is committed; it is a report, not a gate). It needs a running production server: `pnpm build`, `pnpm start` in another terminal, then `pnpm qa:visual`, or point it elsewhere with `BASE_URL=https://... pnpm qa:visual`.
- Pages: `/ru` and `/en` (home), `/<locale>/catalog` (filters live in the URL: `material`, `color`, `finish`, `sort`, `q`, `sale`), `/<locale>/catalog/<slug>` (product with cost calculator). Catalog data is the static seed in `src/server/catalog/seed.ts` behind the `CatalogRepository` interface (see `docs/ARCHITECTURE.md`). Controls whose pages are not built are inert (`PHASE3_INERT` in `src/components/navigation/nav-items.ts`).
- `pnpm qa:visual:pages` (the same as `pnpm qa:visual --pages` or `pnpm qa:visual -- --pages`; pnpm forwards both spellings) is the page mode of the same script: full-page screenshots of `/en`, `/en/catalog` and three product pages at 1440, 1024, 768 and 390 against the Figma screens in `tests/visual/figma/pages/` (map: `pages` in `references.json`; `QA_IDS` filters page ids, `QA_WIDTHS` filters widths). It writes `-impl`/`-figma`/`-diff` PNGs and `results.md` to `docs/QA/phase-3/`; only `results.md` and the curated `*-triplet.jpg` strips (impl, figma, diff side by side) are committed. Same requirements as component mode (running production server). The reading of the results is in `docs/QA/phase-3-pages.md`.
- The component styleguide lives at `/ru/_styleguide` and `/en/_styleguide`. It is a 404 when `APP_ENV=production`, and it is `noindex`.
- `pnpm test:e2e` starts three servers of the same build: `pnpm start` on port 3000 (no database, for the Phase 3 tests and the "sign-in unavailable" tests), a second `next start -p 3001` with `APP_ENV=production` for the `production-guard` project (the styleguide must 404 there), and a third on port 3002 WITH a database for the `auth-desktop` / `auth-mobile` projects (`tests/e2e/auth.spec.ts`: sign-up, sign-in, sign-out). The first two have `DATABASE_URL` forced empty, so a `.env.local` cannot switch them to a database. The third is started by `scripts/e2e-db-server.mjs`: it creates a throwaway PGlite directory under the OS temp dir, migrates and seeds it, runs `next start`, and deletes the directory on exit; `BETTER_AUTH_SECRET` and `SEED_*` come from the committed, obviously fake `.env.test.example`. Free ports 3000 to 3002 first; existing servers are reused outside CI.
- Rate limits in e2e: Better Auth limits sign-in to 10 and sign-up to 5 per minute per client IP. The e2e server has no proxy, so its client-IP rule is the last `X-Forwarded-For` hop; `tests/e2e/auth-fixtures.ts` gives every test its own address through `extraHTTPHeaders`, so parallel tests never share a bucket (a test that exercises the limit uses an address of its own). Use that `test` import for any spec that signs in or up.
- Motion shipped so far is listed in `docs/ANIMATIONS.md`.

## Windows notes

- OpenNext does not support Windows builds (`pnpm cf:build` fails with `EPERM symlink`). Use WSL, or rely on the `cloudflare` CI job. Everything else works on Windows.
- Line endings are normalised to LF by `.gitattributes`; Prettier expects LF.

## Rules for contributors

- Read `CLAUDE.md` (project rules) and `AGENTS.md` (Next.js 16 notes) first.
- All UI copy goes into `messages/ru.json` and `messages/en.json` (same keys; a test enforces parity).
- Platform-specific code only in `src/server/platform/` (ESLint and a test enforce it).
- Branches `feat/*`, `fix/*`, `anim/*`, `chore/*`; Conventional Commits; PR to `main`; no force-push.

## Claude Code and superpowers

The repository enables the [obra/superpowers](https://github.com/obra/superpowers) plugin for every developer through `.claude/settings.json`. Claude Code asks you to trust the marketplace on first start. To install it manually:

```text
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Alternative (official marketplace): `/plugin install superpowers@claude-plugins-official`.
Commands verified against the obra/superpowers README on 2026-10-13.
