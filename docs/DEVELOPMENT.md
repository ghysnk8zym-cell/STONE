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
| `pnpm cf:build`                | OpenNext build for Cloudflare Workers (Linux/WSL/CI only)     |
| `pnpm cf:size`                 | Fails if the Worker gzip size exceeds 3 MiB (run after build) |
| `pnpm cf:preview`              | Build and run the Worker locally with wrangler (Linux/WSL)    |
| `pnpm cf:deploy` / `cf:upload` | Used by Cloudflare Workers Builds (production / previews)     |

First Playwright run: `pnpm exec playwright install chromium`.

Extra scripts and the styleguide:

- `pnpm images` (`scripts/optimize-images.mjs`) builds the WebP width sets listed in `assets/figma-manifest.json`.
- `pnpm qa:visual` (`scripts/visual-compare.mjs`) compares styleguide components with the Figma reference screenshots in `tests/visual/figma/` and writes `-impl`/`-figma`/`-diff` PNGs and `results.md` to `docs/QA/phase-2/` (only the curated set is committed; it is a report, not a gate). It needs a running production server: `pnpm build`, `pnpm start` in another terminal, then `pnpm qa:visual`, or point it elsewhere with `BASE_URL=https://... pnpm qa:visual`.
- Pages: `/ru` and `/en` (home), `/<locale>/catalog` (filters live in the URL: `material`, `color`, `finish`, `sort`, `q`, `sale`), `/<locale>/catalog/<slug>` (product with cost calculator). Catalog data is the static seed in `src/server/catalog/seed.ts` behind the `CatalogRepository` interface (see `docs/ARCHITECTURE.md`). Controls whose pages are not built are inert (`PHASE3_INERT` in `src/components/navigation/nav-items.ts`).
- `pnpm qa:visual:pages` (the same as `pnpm qa:visual --pages` or `pnpm qa:visual -- --pages`; pnpm forwards both spellings) is the page mode of the same script: full-page screenshots of `/en`, `/en/catalog` and three product pages at 1440, 1024, 768 and 390 against the Figma screens in `tests/visual/figma/pages/` (map: `pages` in `references.json`; `QA_IDS` filters page ids, `QA_WIDTHS` filters widths). It writes `-impl`/`-figma`/`-diff` PNGs and `results.md` to `docs/QA/phase-3/`; only `results.md` and the curated `*-triplet.jpg` strips (impl, figma, diff side by side) are committed. Same requirements as component mode (running production server). The reading of the results is in `docs/QA/phase-3-pages.md`.
- The component styleguide lives at `/ru/_styleguide` and `/en/_styleguide`. It is a 404 when `APP_ENV=production`, and it is `noindex`.
- `pnpm test:e2e` starts two servers: `pnpm start` on port 3000 and a second `next start -p 3001` with `APP_ENV=production` for the `production-guard` project (the styleguide must 404 there). Free both ports first; existing servers are reused outside CI.
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
