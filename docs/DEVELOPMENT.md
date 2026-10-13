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
