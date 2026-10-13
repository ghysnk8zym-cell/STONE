# Architecture

Decisions and their reasoning live in `docs/adr/` (ADR-001 … ADR-005) and the overall design in `docs/superpowers/specs/2026-10-13-web-architecture-design.md`. This file maps the repository.

## Required structure

| Path                    | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `docs/`                 | Spec, architecture, ADRs, deployment, development, QA, animations  |
| `src/app/[locale]/`     | Public pages for `ru` and `en` (App Router)                        |
| `src/components/`       | Design-system components (from Phase 2)                            |
| `src/features/account/` | Client personal account (Phase 4)                                  |
| `src/features/admin/`   | Admin panel (Phase 4)                                              |
| `src/server/`           | Server-only logic: env, indexing policy, auth/guards (Phase 4), db |
| `src/server/platform/`  | The single hosting adapter (`node`, `cloudflare`)                  |
| `messages/`             | `ru.json`, `en.json` — all UI copy                                 |
| `tests/`                | `unit/` (Vitest), `e2e/` (Playwright); `visual/` from Phase 2      |

## Additional folders and why they exist

| Path                 | Reason                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `src/i18n/`          | next-intl routing, request config, typed navigation (ADR-004)                              |
| `src/styles/`        | Design tokens from Figma (Phase 2, ADR-003)                                                |
| `scripts/`           | Cloudflare Worker size check (`cf:size`)                                                   |
| `public/`            | Static assets; `_headers` sets long-term caching for `/_next/static` on Cloudflare/Netlify |
| `.github/workflows/` | CI (`ci.yml`) and preview smoke tests (`preview-smoke.yml`)                                |
| `.claude/`           | Shared Claude Code settings (superpowers plugin); `worktrees/` is git-ignored              |

## Request flow

1. `src/middleware.ts` (next-intl) maps `/` → `/ru`, keeps `/ru/*` and `/en/*`, and redirects paths without a locale to `/ru/<path>`. Phase 4 adds the optimistic auth cookie check here.
2. `src/app/[locale]/layout.tsx` validates the locale (`dynamicParams = false`), renders `<html lang>` and provides messages.
3. `next.config.ts` inlines `INDEXING` at build time and adds `X-Robots-Tag: noindex, nofollow` to every response unless it is `on`; `src/app/robots.ts` reads the same inlined value. `public/_headers` adds the header to static files that bypass Next.js on Cloudflare/Netlify.
4. Unknown paths under a locale hit `src/app/[locale]/[...rest]/page.tsx`, which renders the localized 404.
5. On Cloudflare, prerendered pages are served from the build via OpenNext's static-assets incremental cache (`open-next.config.ts`), not re-rendered per request.

## Portability rules

- Application code imports `@/server/platform`, never `@opennextjs/cloudflare`, `wrangler` or `cloudflare:*` (ESLint rule + `tests/unit/structure.test.ts`).
- Environment is read via `process.env` and validated in `src/server/env.ts`.
- `cacheComponents` is off until OpenNext supports it on Workers (see ADR-001 and the Phase 1 plan ledger notes in the PR).
