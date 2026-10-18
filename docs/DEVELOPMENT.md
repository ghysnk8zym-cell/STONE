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

| Script                         | What it does                                                   |
| ------------------------------ | -------------------------------------------------------------- |
| `pnpm dev`                     | Next.js dev server                                             |
| `pnpm build`                   | Standard `next build` (portable: Node, Vercel, Netlify)        |
| `pnpm start`                   | Serve the production build                                     |
| `pnpm lint`                    | ESLint (includes no-JSX-literals and platform-import rules)    |
| `pnpm format`                  | Prettier write                                                 |
| `pnpm format:check`            | Prettier check (CI)                                            |
| `pnpm typecheck`               | Route type generation + `tsc --noEmit`                         |
| `pnpm test`                    | Vitest unit tests (`tests/unit`)                               |
| `pnpm test:e2e`                | Playwright (`tests/e2e`); builds must exist (`pnpm build`)     |
| `pnpm db:generate`             | Writes a new SQL migration in `drizzle/` after a schema change |
| `pnpm db:migrate`              | Applies `drizzle/` to the database behind `DATABASE_URL`       |
| `pnpm db:seed`                 | Idempotent database seed (see below)                           |
| `pnpm cf:build`                | OpenNext build for Cloudflare Workers (Linux/WSL/CI only)      |
| `pnpm cf:size`                 | Fails if the Worker gzip size exceeds 3 MiB (run after build)  |
| `pnpm cf:preview`              | Build and run the Worker locally with wrangler (Linux/WSL)     |
| `pnpm cf:deploy` / `cf:upload` | Used by Cloudflare Workers Builds (production / previews)      |

Database seed: `pnpm db:seed` reads `DATABASE_URL` and the four `SEED_*` values from the ignored `.env.local` (`node --env-file-if-exists`), upserts the 12 products with ru/en names and descriptions taken from `messages/*.json`, creates the Admin and the Client through Better Auth (emails lowercased, passwords hashed by Better Auth; the Admin role is set by the seed, never by sign-up, and an already existing account is promoted only if it holds SEED_ADMIN_PASSWORD, otherwise the seed stops with an error), and links the demo orders D-1048 and D-1032 and three favourites. It prints counts only and can be re-run safely: it only inserts missing rows and never overwrites existing products, translations or orders, so admin edits survive. It refuses to run against a remote database (anything but `pglite://` or a `localhost`/`127.0.0.1` postgres URL) unless `SEED_ALLOW_REMOTE=1` is set. With a `pglite://` URL it needs no database server. Without `DATABASE_URL` the site serves the static catalog (`getCatalog()` in `src/server/catalog`).

### Local database (PGlite, no install)

Auth, the account area and the admin panel need a database. Locally that is PGlite, Postgres compiled to WebAssembly, stored in a folder:

```bash
# .env.local (git-ignored). Fake values are fine; BETTER_AUTH_SECRET needs at least 32 characters.
DATABASE_URL=pglite://.data/pglite
BETTER_AUTH_SECRET=local-development-secret-at-least-32-chars
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=choose-a-local-password
SEED_CLIENT_EMAIL=client@example.test
SEED_CLIENT_PASSWORD=choose-another-local-password
```

```bash
pnpm db:seed   # PGlite is migrated on first use; this fills the folder
pnpm dev       # sign in at http://localhost:3000/ru/sign-in; the admin is at /ru/admin
```

- `.data/` is git-ignored. Delete the folder to start over. One folder can be held by **one process at a time**: stop `pnpm dev` before `pnpm db:seed` (or the reverse).
- `pglite://memory` is a throwaway database that vanishes with the process (unit tests use it).
- `pnpm db:migrate` is for real Postgres (Neon, `postgres://`); the app migrates PGlite itself. After changing `src/server/db/schema.ts` run `pnpm db:generate`, read the SQL it wrote, and commit it with the schema. Never edit an applied migration.
- The remote seed steps for the owner (Neon, `SEED_ALLOW_REMOTE=1`) are in `docs/DEPLOYMENT.md`, section 3.
- Without `DATABASE_URL` the site still works: catalog from the static seed, auth pages say "unavailable".

First Playwright run: `pnpm exec playwright install chromium`.

Extra scripts and the styleguide:

- `pnpm images` (`scripts/optimize-images.mjs`) builds the WebP width sets listed in `assets/figma-manifest.json`.
- `pnpm qa:visual` (`scripts/visual-compare.mjs`) compares styleguide components with the Figma reference screenshots in `tests/visual/figma/` and writes `-impl`/`-figma`/`-diff` PNGs and `results.md` to `docs/QA/phase-2/` (only the curated set is committed; it is a report, not a gate). It needs a running production server: `pnpm build`, `pnpm start` in another terminal, then `pnpm qa:visual`, or point it elsewhere with `BASE_URL=https://... pnpm qa:visual`.
- Pages: `/ru` and `/en` (home), `/<locale>/catalog` (filters live in the URL: `material`, `color`, `finish`, `sort`, `q`, `sale`), `/<locale>/catalog/<slug>` (product with cost calculator). Catalog data is the static seed in `src/server/catalog/seed.ts` behind the `CatalogRepository` interface (see `docs/ARCHITECTURE.md`). Controls whose pages are not built are inert (`INERT` in `src/components/navigation/nav-items.ts`). The account area (`/<locale>/account`, `/orders`, `/favorites`, `/profile`) needs a database and a session; the e2e specs `tests/e2e/auth.spec.ts`, `account.spec.ts`, `admin.spec.ts` and `access.spec.ts` (Guest / Client / Admin against every protected route, `docs/ROLES.md`) run against the seeded PGlite server (the `auth-*` Playwright projects; the pattern in `playwright.config.ts` is anchored, so a new database spec is added there on purpose).
- `pnpm qa:visual:pages` (the same as `pnpm qa:visual --pages` or `pnpm qa:visual -- --pages`; pnpm forwards both spellings) is the page mode of the same script: full-page screenshots of `/en`, `/en/catalog` and three product pages at 1440, 1024, 768 and 390 against the Figma screens in `tests/visual/figma/pages/` (map: `pages` in `references.json`; `QA_IDS` filters page ids, `QA_WIDTHS` filters widths). It writes `-impl`/`-figma`/`-diff` PNGs and `results.md` to `docs/QA/phase-3/`; only `results.md` and the curated `*-triplet.jpg` strips (impl, figma, diff side by side) are committed. Same requirements as component mode (running production server). The reading of the results is in `docs/QA/phase-3-pages.md`. `--set phase4a` compares the Phase 4a screens (sign-in/up/out, account, admin; `pagesPhase4a` in `references.json`, Figma PNGs in `tests/visual/figma/pages-phase4a/`, output and `*-triplet.jpg` strips in `docs/QA/phase-4a/`). Those pages need a database, and most need a session: start the e2e database server (`E2E_PORT=3002 node --env-file=.env.test.example scripts/e2e-db-server.mjs` after `pnpm build`), set `BASE_URL=http://localhost:3002`, and the script signs in as the seeded fake test Client or Admin before each shot (`QA_CLIENT_*` / `QA_ADMIN_*` override the credentials; never use real ones). Notes and the owner checklist: `docs/QA/phase-4a.md`.
- The component styleguide lives at `/ru/_styleguide` and `/en/_styleguide`. It is a 404 when `APP_ENV=production`, and it is `noindex`.
- `pnpm test:e2e` starts three servers of the same build: `pnpm start` on port 3000 (no database, for the Phase 3 tests and the "sign-in unavailable" tests), a second `next start -p 3001` with `APP_ENV=production` for the `production-guard` project (the styleguide must 404 there), and a third on port 3002 WITH a database for the `auth-desktop` / `auth-mobile` projects (sign-up, sign-in, sign-out, the account area, the admin panel and the access matrix). The first two have `DATABASE_URL` forced empty, so a `.env.local` cannot switch them to a database. The third is started by `scripts/e2e-db-server.mjs`: it creates a throwaway PGlite directory under the OS temp dir, migrates and seeds it, runs `next start`, and deletes the directory when the server exits (Playwright stops it gracefully on Linux and macOS via `gracefulShutdown`; on Windows it is killed outright, so a directory can stay behind in the OS temp dir and the next run removes every `stone-e2e-pglite-*` folder there at start-up, about 40 MB each); `BETTER_AUTH_SECRET` and `SEED_*` come from the committed, obviously fake `.env.test.example` (also read by `tests/e2e/test-env.ts` for the seeded users, and extended by `scripts/e2e-extra-seed.mjs` with a second Client that owns an order the admin test may change). Never use those values anywhere real. Free ports 3000 to 3002 first; existing servers are reused outside CI.
- Rate limits in e2e: Better Auth limits sign-in to 10 and sign-up to 5 per minute per client IP. The e2e server has no proxy, so its client-IP rule is the last `X-Forwarded-For` hop; `tests/e2e/auth-fixtures.ts` gives every test its own address through `extraHTTPHeaders`, so parallel tests never share a bucket (a test that exercises the limit uses an address of its own). Use that `test` import for any spec that signs in or up.
- Unit tests that guard security: `tests/unit/server-actions-guarded.test.ts` scans every `"use server"` module and every route handler and fails when one does not start with `requireUser` / `requireRole` (or a same-file helper that does), unless it is on the written allow-list. Adding a server action means putting its guard on the first line; a deliberately public one needs an allow-list entry with a reason (`docs/ROLES.md`).
- `pnpm cf:size` (CI `cloudflare` job, after `pnpm cf:build`) also fails when Better Auth is bundled more than once in the server chunks; see "Worker bundle guard" in `docs/ARCHITECTURE.md`.
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
