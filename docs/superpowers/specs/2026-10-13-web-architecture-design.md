# STONE Web — overall architecture design

**Date:** 2026-10-13
**Status:** Approved (sections approved in conversation; written spec approved by owner 2026-10-13).
**Scope:** Phase 0 decisions for the whole web codebase. Implementation details per phase get their own spec and plan.

## 1. Intent and success criteria

**Stated by the owner**

- Move the approved Figma design (file `1vEGuD9cYYFNynyByUGHwF`, read-only) into a production-grade Next.js codebase in GitHub (`ghysnk8zym-cell/STONE`).
- The Cloudflare deployment is a **test environment** used to build animations and features and then hand the repository to other developers. It is not a production launch and holds no real customer data.
- Another developer must be able to take the repository over and deploy it on a different host with only env/config changes.
- Locales ru (default) and en. Roles Guest, Client, Admin. Exactly two seeded test users (one Admin, one Client), credentials from git-ignored env only.
- Preserve the incumbent luxury concept, palette, typefaces, imagery roles and D020 art direction. Any visual deviation needs explicit approval.
- Calculator price USD 240/m² is an illustrative placeholder and stays flagged as such.

**Assumptions (owner may correct)**

- Orders and payment are demonstrations; no payment gateway.
- No email provider on the test environment, therefore no email verification or password-reset email.
- Russian UI copy does not exist in Figma (Figma is English); Claude drafts it and marks it for owner review.

**Success criteria for the architecture**

1. `next build` succeeds unchanged on Node.js; Cloudflare-specific code is confined to `wrangler.jsonc`, `open-next.config.ts` and `src/server/platform/`.
2. Every protected server action, route handler and page performs its own server-side role check; middleware is never the only check.
3. Every PR runs lint, typecheck, unit tests, build, Cloudflare bundle-size check and Playwright smoke in CI, and gets a Cloudflare preview URL.
4. All UI strings live in `messages/ru.json` and `messages/en.json` with enforced key parity.

## 2. Decisions (summary; full reasoning in ADRs)

| ADR | Decision | Owner input |
|---|---|---|
| [ADR-001](../../adr/ADR-001-hosting-runtime.md) | Next.js 16 on Cloudflare Workers via `@opennextjs/cloudflare` 1.x, Workers Builds with per-branch previews, Workers Free plan | Option A: start on Free; ask before upgrading to Workers Paid if the 3 MiB limit is exceeded |
| [ADR-002](../../adr/ADR-002-auth-database.md) | Better Auth 1.x + Postgres (Neon Free, EU) + Drizzle ORM; driver chosen by `DATABASE_URL` | Test environment only; production data residency revisited later |
| [ADR-003](../../adr/ADR-003-styling-tokens.md) | Tailwind CSS v4 over CSS custom properties named exactly like Figma variables; default Tailwind palette disabled | Cyrillic fallback for Lusitana: PT Serif via `unicode-range` (option A), final visual sign-off in Phase 2 |
| [ADR-004](../../adr/ADR-004-i18n.md) | next-intl 4.x, always-prefixed `/ru` and `/en`, ru default, no browser detection, cookie remembers manual choice | Language switch is a button (not present in Figma; built from incumbent Nav/Pill, approved in Phase 2) |
| [ADR-005](../../adr/ADR-005-testing-ci.md) | Vitest + Testing Library + PGlite; Playwright (e2e, axe, visual vs Figma); GitHub Actions on every PR | — |

## 3. Architecture

### 3.1 Runtime and hosting

- Next.js 16 App Router, TypeScript strict, Node 24 LTS pinned in `.nvmrc`, pnpm via corepack.
- Cloudflare: OpenNext adapter builds the real `next build` output into a Worker. Workers Builds (Git-connected) deploys `main` as the stable test URL and every other branch as a Preview URL.
- OpenNext does not guarantee Windows builds, so Cloudflare builds run on Linux (Workers Builds and CI). Local development uses plain `next dev` on any OS.
- Next.js 16 `proxy.ts` is not yet recognised by OpenNext, so the project uses `middleware.ts` (deprecated but supported). Migration to `proxy.ts` is a tracked follow-up.
- Every test deployment is `noindex`: `X-Robots-Tag: noindex, nofollow` header and a disallow-all `robots.txt` unless `INDEXING=on`.

### 3.2 Portability boundary

```
src/server/platform/
  index.ts        // exports the active adapter
  types.ts        // PlatformAdapter interface: getEnv(), imageLoader, (future) cache/storage
  node.ts         // default: Node / Vercel / Netlify
  cloudflare.ts   // Cloudflare specifics only
```

- Application code imports `@/server/platform`, never `@opennextjs/cloudflare` or `cloudflare:*`.
- Environment variables are read through `process.env` and validated in `src/server/env.ts` (zod, `server-only`).
- Images: on Cloudflare, assets are pre-optimised at build time (AVIF/WebP at the needed widths) and served through a static loader, because Cloudflare Images is a paid add-on. On other hosts the standard Next.js optimiser runs. The switch lives in the adapter and `next.config.ts`.
- Leaving Cloudflare: Vercel/Netlify run `next build` as is; Node/Docker use `output: "standalone"` and the provided Dockerfile. Phase 5 records a dry run.

### 3.3 Auth, roles and data

- Better Auth with email + password, database sessions, `httpOnly; Secure; SameSite=Lax` cookies, rate limiting stored in the database.
- Roles: Guest = no session; Client = `user.role = "client"`; Admin = `user.role = "admin"`. Sign-up (Figma "Create account") always creates a Client. Admin exists only through the seed.
- Authorization layers:
  1. `middleware.ts` — optimistic cookie check; redirects Guests away from `/[locale]/account/*` and `/[locale]/admin/*` to `/[locale]/sign-in?next=…`. Convenience, not security.
  2. `src/server/auth/guards.ts` — `requireUser()` and `requireRole("admin")`, called in every protected layout/page, server action and route handler. A CI test asserts that every exported server action is wrapped by a guard.
- Database client in one file, `src/server/db/client.ts`: Neon HTTP driver for Neon URLs, `pg` for other Postgres URLs, PGlite for tests.
- Tables: Better Auth (`user`, `session`, `account`, `verification`); app (`product`, `product_translation`, `favorite`, `order`, `order_item`). Prices carry `is_placeholder`. Exact schema is approved in the Phase 4 spec.
- Phase 3 reads catalog data through a repository interface backed by static seed data; Phase 4 swaps the implementation to the database without page changes.
- Seed: `pnpm db:seed`, idempotent, reads `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` from `.env.local`. Values are never logged.

### 3.4 Styling and design tokens

- Pipeline: Figma variables (`get_variable_defs`) → snapshot `src/styles/tokens/figma-variables.json` → CSS custom properties in `src/styles/tokens/*.css` (names identical to Figma, e.g. `--surface-page`, `--text-ink`, `--stone-catalog-card`) → Tailwind v4 `@theme inline` utilities.
- Default Tailwind colours and fonts are reset (`--color-*: initial`, `--font-*: initial`) so only STONE tokens can be used.
- Figma effect styles (e.g. `Surface/Glass panel`: background blur 24 + drop shadow 0 16 40 `#00000059`) become named utilities.
- Motion tokens (durations, easings) live in `src/styles/tokens/motion.css`; empty until the first animation.
- Fonts via `next/font/google` (self-hosted at build): Inter (Cyrillic supported) and Lusitana (Latin only). Cyrillic glyphs in Lusitana roles fall back to PT Serif through `unicode-range`; Latin rendering stays Lusitana.
- Figma letter-spacing values (14, 12, 10) are interpreted as percent and converted to `em`; verified against `get_design_context` in Phase 2.

### 3.5 Internationalisation

- next-intl 4.x. Locales `ru`, `en`; default `ru`; `localePrefix: "always"`; `localeDetection: false`; `NEXT_LOCALE` cookie stores a manual switch.
- Same slugs in both locales. The language switch is a header button that keeps the current path and query.
- One `middleware.ts` composes next-intl first, then the auth cookie check; matcher excludes `/api`, `/_next` and static files.
- Namespaced messages (`nav`, `footer`, `home`, `catalog`, `product`, `calculator`, `account`, `admin`, `auth`, `common`), typed through next-intl `AppConfig`. `react/jsx-no-literals` forbids hard-coded JSX text. A parity test enforces identical keys and no empty values.
- Product content (names, descriptions) is data in `product_translation`, not messages.

### 3.6 Testing and CI

- Unit/integration (Vitest): tokens vs Figma snapshot, message parity, calculator logic, guards and server actions against PGlite (Guest and Client denied where required), form components (Testing Library).
- End-to-end (Playwright, `tests/e2e/`): `access`, `locale`, `navigation`, `calculator`, `order`, `forms`, `smoke` (both locales 200, noindex header present). `@axe-core/playwright` on key pages.
- Visual (`tests/visual/`): Figma screenshots at 1440/1024/768/390 committed as references; threshold-based comparison run only in the Linux Playwright container; notes in `docs/QA/`.
- GitHub Actions on every PR: install (pnpm cache) → lint + Prettier → typecheck → Vitest → `next build` → OpenNext build + 3 MiB size check → Playwright against `next start`. A manual workflow runs smoke tests against a given Cloudflare preview URL.

### 3.7 Repository structure

```
docs/                    spec, architecture, roles, i18n, security, deployment, ADRs, animation catalog
  adr/  superpowers/specs/  superpowers/plans/  QA/
messages/                ru.json, en.json
src/app/[locale]/        public pages
src/app/api/auth/[...all]/route.ts   Better Auth handler (outside [locale])
src/components/          design-system components
src/features/account/    client personal account
src/features/admin/      admin panel
src/server/              auth, guards, db, env, platform adapter
src/styles/tokens/       design tokens (documented in ARCHITECTURE.md)
src/i18n/                next-intl routing/request config (documented in ARCHITECTURE.md)
tests/                   unit, e2e, visual
```

Additional folders beyond the required structure (`src/styles/tokens`, `src/i18n`, `src/app/api`) are documented in `docs/ARCHITECTURE.md` in Phase 1.

### 3.8 Workflow

- Every phase from Phase 1: spec → plan → worktree → TDD → review → verification → PR (obra/superpowers).
- Branches `feat/*`, `fix/*`, `anim/*`, `chore/*`; Conventional Commits; PR to `main`; no force-push; no direct commits to `main`.
- `.claude/settings.json` enables `superpowers@superpowers-marketplace` from `obra/superpowers-marketplace`; manual install documented in `docs/DEVELOPMENT.md`.
- The owner enables `main` branch protection with required CI checks using step-by-step instructions from Claude.

## 4. Error handling principles

- Unauthenticated access to a protected page → redirect to localized sign-in with `next`; unauthorized role → localized 403 page; server actions return typed `{ ok: false, code }` results, never leak internals.
- Invalid env at startup → fail fast with the missing variable name (never its value).
- Database unavailable → localized error boundary; public catalog pages degrade to the static repository only in Phase 3 (before the DB switch).

## 5. Known risks and follow-ups

| Risk | Mitigation |
|---|---|
| Workers Free 3 MiB compressed limit | CI size check; stop and ask the owner before Workers Paid |
| OpenNext lacks `proxy.ts` support | Keep `middleware.ts`; revisit when OpenNext supports it |
| Cloudflare now recommends vinext (beta) for new apps | Rejected for portability and maturity; revisit when stable |
| Neon Free compute suspends when idle | First request after idle is slower; acceptable for a test environment |
| No email provider | No verification/reset email on test environment; documented in SECURITY.md |
| Production for the Russian market (152-FZ data localisation, Cloudflare availability) | Out of scope; architecture keeps host and Postgres replaceable |
| Russian copy is a draft | Marked for owner review in `docs/I18N.md` |
| Figma gaps (see FIGMA-INVENTORY.md §5) | Resolved per phase through brainstorming; no invented visuals without approval |
