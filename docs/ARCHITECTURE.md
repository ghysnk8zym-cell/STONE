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
5. On Cloudflare, pages are rendered per request (OpenNext default, no incremental cache). The read-only static-assets cache was tried and returned 404 for prerendered pages (`NoFallbackError`); revisit with an R2/KV cache when traffic or CPU limits require it.

## Portability rules

- Application code imports `@/server/platform`, never `@opennextjs/cloudflare`, `wrangler` or `cloudflare:*` (ESLint rule + `tests/unit/structure.test.ts`).
- Environment is read via `process.env` and validated in `src/server/env.ts`.
- Next.js is pinned to `16.3.8`: Next 16.4.0 crashes on Workers with `Unexpected loadManifest(/.next/server/preview-props.json)` until OpenNext ships the fix (opennextjs/opennextjs-cloudflare#1448, PR #1356). The `cloudflare` CI job smoke-tests the built Worker in workerd, so an upgrade that breaks the runtime fails CI.
- `cacheComponents` is off until OpenNext supports it on Workers (see ADR-001 and the Phase 1 plan ledger notes in the PR).

## Layout notes for Phase 3

- `TabBar` is `position: fixed` at the bottom of the viewport on phones: visible below 768 px (`md:hidden`), 358 x 68, 16 px above the bottom edge or the safe-area inset, whichever is larger.
- Pages and layouts that render it need 100 px of bottom padding (bar 68 + bottom offset `max(16px, env(safe-area-inset-bottom))` + 16 px breathing room). Use the `pb-tabbar` utility from `src/app/globals.css`, phones only: `max-md:pb-tabbar`.
- The `[locale]` layout mounts both `TabBar` and `SiteFooter` in Phase 3 (neither is mounted anywhere yet). The footer is full width; the bar floats above it.
- `TabBar`'s `current` prop is optional: Figma's Product screen shows the bar with no active tab.
- Shell mounting (Task 4): `src/app/[locale]/(site)/layout.tsx` renders `SiteHeader`, the single `<main>` (pages never render their own), `SiteFooter` and `ShellTabBar` (client; maps the locale-stripped `usePathname()` to `TabBarCurrent`), with `max-md:pb-tabbar` on the wrapper. `[locale]/layout.tsx` keeps `<html>`, `<body>` and providers only. `/_styleguide` is outside the `(site)` group, so it has no shell. `(site)/not-found.tsx` renders the localised 404 inside the shell; `[locale]/not-found.tsx` is the fallback.
- Controls whose pages do not exist yet are inert (non-link `span`, `aria-disabled`), listed in `PHASE3_INERT` (`src/components/navigation/nav-items.ts`): header and menu Create Your Stone, Cart, account; tab bar Favorites, Cart, Sign in. Remove an entry when its page ships.
- The "Sign in" tab links to `/account` until the sign-in screen exists (Figma gap, `docs/FIGMA-INVENTORY.md` section 5.1).

## Motion

Every shipped animation, its tokens (`src/styles/tokens/motion.css`) and its reduced-motion behaviour are listed in `docs/ANIMATIONS.md`.
