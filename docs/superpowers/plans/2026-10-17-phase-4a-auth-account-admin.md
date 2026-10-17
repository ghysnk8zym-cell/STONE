# Phase 4a — Auth, Roles, Account, Admin Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sign-up / sign-in / sign-out, Guest / Client / Admin with server-side guards, the account area, favourites on the public site, the admin shell with Overview, Products (CRUD) and Orders, and the catalog served from Postgres — part 4a of the Phase 4 spec.

**Architecture:** Better Auth (email + password, database sessions) over Drizzle ORM; one driver switch in `src/server/db/client.ts` (Neon HTTP / `pg` / PGlite by `DATABASE_URL`); a database `CatalogRepository` behind the Phase 3 interface; guards in `src/server/auth/guards.ts` called by every protected layout, page, server action and route handler; middleware only does an optimistic cookie redirect. Without `DATABASE_URL` the site falls back to the static catalog and a localised "sign-in unavailable" state.

**Tech Stack:** Next.js 16.3.8, React 19, next-intl 4, Tailwind 4, zod 4, new deps per ADR-002: `better-auth`, `drizzle-orm`, `drizzle-kit` (dev), `@neondatabase/serverless`, `pg`, `@electric-sql/pglite`; Vitest 5, Playwright 1.64 + axe.

**Spec:** `docs/superpowers/specs/2026-10-17-phase-4-auth-account-admin-design.md` (+ ADR-002, `docs/FIGMA-INVENTORY.md`, Phase 3 spec/code).

## Global Constraints

- Figma `1vEGuD9cYYFNynyByUGHwF` is read-only (`get_design_context`, `get_metadata`, `get_screenshot`, `download_assets` only). Values verbatim from the screen nodes named in each task; no invented visuals beyond the spec (sign-in screen, unavailable state, admin <1024 message, empty states).
- Reuse Phase 2/3 components; `cn()` is not twMerge.
- Copy only in `messages/{ru,en}.json` (new namespaces `auth.*`, `account.*`, `admin.*`); ru is a draft for owner review.
- Secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SEED_*`) are server-only, validated in `src/server/env.ts`, never `NEXT_PUBLIC_`, never logged or printed (not in test output, not in reports). `.env*` stays git-ignored; `.env.example` updated; test-only values live in `.env.test.example` and are obviously fake.
- Never enter credentials into any web dashboard, never create accounts on external services. All local/test/CI databases are PGlite.
- Every protected layout, page, server action and route handler calls `requireUser()` / `requireRole("admin")`. Middleware is not a security boundary.
- `next` redirect targets: internal paths only.
- Database code only in `src/server/db/`; platform code only in `src/server/platform/`.
- Worker ≤ 3 MiB compressed (CI `pnpm cf:size`); if exceeded, STOP and report — no paid plan, no workaround that drops security.
- Before using a Next.js or Better Auth API read the bundled docs (`node_modules/next/dist/docs/`, `node_modules/better-auth/` README/docs) — versions matter.
- Branch `feat/phase-4-auth`; Conventional Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no force-push; `git checkout AGENTS.md` before commits if Next rewrote it; files written only with Write/Edit or node (never PowerShell `Set-Content`).
- Every task ends green on `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test`; tasks touching pages also `pnpm build && pnpm test:e2e`.

## Review Focus

1. A crafted `next` (`//evil.com`, `https:evil.com`, `/\evil.com`, `%2F%2Fevil.com`) must never redirect off-site. → Task 2 unit `sanitizeNext rejects external targets`, Task 3 e2e `sign-in ignores external next`.
2. A Client calling an admin server action directly (bypassing the UI) must be rejected. → Task 5 integration `admin actions reject a client session`, Task 6 test `every exported server action is guarded`.
3. One user must never read or change another user's favourites or orders. → Task 4 integration `favorites are scoped to the session user`.
4. The preview without `DATABASE_URL` must keep serving the catalog and show "sign-in unavailable", not a 500. → Task 1 unit `catalog falls back to the static repository`, Task 3 e2e `auth pages show unavailable without a database`.
5. Unknown-email and wrong-password errors must be indistinguishable; repeated failures are rate-limited. → Task 3 e2e `sign-in errors do not reveal account existence`, Task 2 unit `rate limit is configured`.

---

### Task 0: Database layer and dependency spike

**Files:** Create `src/server/db/{client.ts,schema.ts,index.ts}`, `drizzle.config.ts`, `drizzle/` (generated migrations), `tests/unit/db-client.test.ts`; Modify `package.json` (deps + scripts `db:generate`, `db:migrate`), `src/server/env.ts`, `.env.example`, `tests/unit/env.test.ts`.

**Interfaces (produces):** `getDb(): Db | null` (null without `DATABASE_URL`), `type Db` (Drizzle database), `schema` exports: `user`, `session`, `account`, `verification` (Better Auth shape — generate with the Better Auth CLI/schema docs, plus `role text not null default 'client'`), `product`, `productTranslation`, `favorite`, `order`, `orderItem` (columns per spec section 2; money integer cents; timestamps `timestamptz`); `migrate(db)` runner usable by tests (applies `drizzle/` to a PGlite instance).

- [ ] **Step 1: Failing tests:** `driver is chosen by DATABASE_URL` (neon host → neon, `postgres://localhost` → pg, `pglite://memory` → pglite, unset → null); `migrations apply to an in-memory PGlite and create all tables`; env test: new keys optional, `BETTER_AUTH_SECRET` min 32 chars when `DATABASE_URL` is set.
- [ ] **Step 2:** Implement; generate the first migration with drizzle-kit.
- [ ] **Step 3: Size spike:** add a temporary server route importing Better Auth + drizzle + the Neon driver is NOT needed — instead push the branch (`git push -u origin feat/phase-4-auth`) after this task and read the CI `cloudflare` job `pnpm cf:size` result; record it in the report. If > 3 MiB compressed, STOP and report.
- [ ] **Step 4: Commit** `feat: add database layer with driver switch and schema`.

### Task 1: Seed and database catalog

**Files:** Create `src/server/db/seed.ts`, `scripts/db-seed.mjs` (or `tsx` entry — no new dep; use `node --experimental-strip-types` if Node 24 supports it, else compile via existing tooling), `src/server/catalog/db-repository.ts`, `tests/unit/catalog-contract.test.ts`, `tests/unit/seed.test.ts`; Modify `src/server/catalog/index.ts`, `package.json` (`db:seed`).

**Interfaces:** `seed(db, { adminEmail, adminPassword, clientEmail, clientPassword })` idempotent (upserts by slug/email/order number); `createDbRepository(db): CatalogRepository`; `catalog` in `index.ts` = DB repository when `getDb()` is non-null, else the static one (`getCatalog()` if a function is needed for per-request DB).

- [ ] **Step 1: Failing tests:** one shared contract suite run against both repositories (every Phase 3 `catalog.test.ts` behaviour); `seed twice creates no duplicates`; `seed output contains no password or secret` (capture console); `catalog falls back to the static repository` without `DATABASE_URL`.
- [ ] **Step 2: Implement** (product translations seeded from `messages/*.json` `catalog.products.*` so copy stays single-sourced); users created through Better Auth's password hashing (Task 2 provides `auth`; if Task 2 is not done, seed users in Task 2 instead and note it).
- [ ] **Step 3: Commit** `feat: seed the database and serve the catalog from Postgres`.

### Task 2: Auth core and guards

**Files:** Create `src/server/auth/{auth.ts,guards.ts,next.ts,session.ts}`, `src/app/api/auth/[...all]/route.ts`, `tests/unit/auth-guards.test.ts`, `tests/unit/sanitize-next.test.ts`; Modify `src/middleware.ts` (optimistic redirect for `/[locale]/account/*` and `/[locale]/admin/*`), `src/lib/route-gate.ts` if needed.

**Interfaces (produces):** `auth` (Better Auth instance: email+password, Drizzle adapter, `user.additionalFields.role` with `input: false`, rate limit enabled, secure cookies), `getSession(): Promise<{ user: { id; email; name; role } } | null>`, `requireUser(locale)` → user or `redirect(/{locale}/sign-in?next=…)`, `requireRole("admin", locale)` → user or `notFound()` for non-admins (documented choice: 404 hides the admin area), `sanitizeNext(value: unknown, locale): string` (internal path or `/{locale}/account`), `authAvailable(): boolean`.

- [ ] **Step 1: Failing tests:** guards with no session / client / admin / expired session (PGlite + real Better Auth sessions); `sanitizeNext rejects external targets` (`//evil.com`, `https://evil.com`, `https:evil.com`, `/\evil.com`, `%2F%2Fevil.com`, `javascript:`), accepts `/ru/catalog?q=x`; `rate limit is configured`; middleware unit: cookie absent → redirect with `next`, present → pass.
- [ ] **Step 2: Implement.** **Step 3: Commit** `feat: add Better Auth with database sessions and server-side guards`.

### Task 3: Sign-up, sign-in, sign-out screens

**Files:** Create `src/app/[locale]/(auth)/{layout.tsx,sign-in/page.tsx,sign-up/page.tsx}`, `src/app/[locale]/(site)/sign-out/page.tsx` (or per Figma shell), server actions in `src/app/[locale]/(auth)/actions.ts`, `tests/e2e/auth.spec.ts`; Modify messages, `tests/unit/*`.

Figma: Create account 1440 `431:3193`, 1920 `840:21796`, 1024 `840:21822`, 768 `840:21848`, 390 `431:3250`, 360 `840:21874`; Sign out 1440 `803:20474`, 1920 `799:20451`, 1024 `803:20527`, 768 `803:20571`, 390 `803:20615`. Sign-in = Create account layout (owner decision). Images via the manifest (download the sculpture/marble frames with `download_assets`; never upscale).

- [ ] **Step 1: Failing e2e:** sign-up → `/ru/account`; duplicate email error; weak password error; sign-in → returns to `next`; `sign-in ignores external next`; `sign-in errors do not reveal account existence` (same message, same status); signed-in user visiting `/sign-in` → `/account`; sign-out confirmation ("Sign out" ends the session → home; "Stay signed in" → back); `auth pages show unavailable without a database` (separate Playwright project/server without `DATABASE_URL`); axe; no overflow at 390.
- [ ] **Step 2: Implement** (progressive enhancement: forms work without JS via server actions). **Step 3: Commit** `feat: add sign-up, sign-in and sign-out screens`.

### Task 4: Account area and favourites

**Files:** Create `src/app/[locale]/(site)/account/{layout.tsx,page.tsx,orders/page.tsx,favorites/page.tsx,profile/page.tsx}`, `src/server/account/{queries.ts,actions.ts}`, `src/components/account/*` (side menu, order row, status chip, favourite tile — from Figma Account blocks `818:537`–`819:585`, `732:568`), `tests/e2e/account.spec.ts`, `tests/unit/account-actions.test.ts`; Modify `ProductCard` / product Save button (live favourite toggle), `nav-items.ts` (`PHASE3_INERT` → `INERT` without account/favorites; header account and tab "Sign in" active and session-aware), messages.

Figma: Account 1440 `736:5318`, 1920 `733:4803`, 1024 `736:5449`, 768 `737:6274`, 390 `737:6405`, 360 `737:6643`; Orders `742:7324`…; Favorites `742:11470`…; Profile `742:16191`… (all breakpoints in `docs/FIGMA-INVENTORY.md`).

**Interfaces:** `toggleFavorite(slug)` server action (guarded; returns new state), `updateProfileName(name)`, `changePassword(current, next)`; queries `getAccountOverview(userId)`, `listOrders(userId)`, `listFavorites(userId)`.

- [ ] **Step 1: Failing tests:** integration `favorites are scoped to the session user`; `toggleFavorite rejects without a session`; e2e: Guest ♥ on catalog → sign-in → back on the same page with the product favourited; Client ♥ → appears in Favorites; Overview shows name/email, two latest orders, three favourites; Profile name edit persists; password change requires the current password; Support and bell inert; header account → `/account` when signed in, `/sign-in` when not; axe; 390 overflow.
- [ ] **Step 2: Implement.** **Step 3: Commit** `feat: add the account area and live favourites`.

### Task 5: Admin shell, Overview, Products, Orders

**Files:** Create `src/app/[locale]/admin/{layout.tsx,page.tsx,products/page.tsx,products/new/page.tsx,products/[slug]/page.tsx,orders/page.tsx}` plus placeholder routes for the 4b items that render a working "coming in 4b" state ONLY if 4b is not merged in the same PR — the sidebar links all eight; `src/server/admin/{queries.ts,actions.ts}`, `src/components/admin/*` (Admin/Sidebar `1060:52244`, Admin/Button `1060:648`, Admin/Field `1060:649`, Admin/Status chip `1060:681`, Admin/Product card `1067:985`), `tests/e2e/admin.spec.ts`, `tests/unit/admin-actions.test.ts`; Modify catalog product route to ISR + `revalidatePath`, the Phase 3 slug gate so new/unpublished slugs behave (published → 200, unpublished/unknown → 404, nothing cached for unknown).

Figma: Admin Overview 1440 `1077:51932` (1920 `1061:50362`, 1024 `1077:55042`), Orders `1077:52201`, Products `1077:52506`, Add product `1077:52622` (+ 1920/1024 ids in the inventory). Below 1024: the localised message (spec).

**Interfaces:** actions `createProduct(input)`, `updateProduct(slug, input)`, `setProductPublished(slug, published)`, `setOrderStatus(number, status)` — all `requireRole("admin")` + zod; image choice limited to manifest keys.

- [ ] **Step 1: Failing tests:** `admin actions reject a client session` and a guest; zod rejects bad price/slug/locale text; e2e: Admin adds a product → visible in `/ru/catalog` and its page 200; unpublish → 404 and gone from the grid; edit ru name → catalog shows it; order status change → visible in the Client's Orders; Client on `/en/admin` → 404; Guest → sign-in with `next`; below 1024 message; axe at 1440.
- [ ] **Step 2: Implement.** **Step 3: Commit** `feat: add the admin shell with products and orders`.

### Task 6: Access matrix, guard check, docs and visual QA

**Files:** Create `tests/unit/server-actions-guarded.test.ts`, `tests/e2e/access.spec.ts`, `docs/ROLES.md`, `docs/SECURITY.md`, `docs/QA/phase-4a.md` (+ curated images ≤ 3 MB); Modify `docs/DEPLOYMENT.md` (Neon + Cloudflare click-by-click for the owner: create Neon EU project, copy the pooled connection string, add `DATABASE_URL`, `BETTER_AUTH_SECRET` (how to generate), `BETTER_AUTH_URL`, `SEED_*` as Secrets in Workers settings — preview and production; run `pnpm db:migrate` / `pnpm db:seed` against Neon from a local shell — never paste values into chat or commits), `docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`, `.env.example`.

- [ ] **Step 1: Failing tests:** `every exported server action is guarded` (static scan of `"use server"` modules: each exported async function calls `requireUser`/`requireRole` first, or is listed in an explicit allow-list with a reason — sign-in/sign-up only); access matrix e2e: Guest/Client/Admin × `/account`, `/account/orders`, `/account/favorites`, `/account/profile`, `/admin`, `/admin/products`, `/admin/orders` × ru/en.
- [ ] **Step 2:** Docs; visual QA of new screens vs Figma (1440/390; admin 1440/1024) with the Phase 3 page-mode script extended to authenticated pages (log in with the test seed user in the script); owner checklist.
- [ ] **Step 3: Commit** `docs: add roles, security and Phase 4a QA notes`.

### Task 7: Security review and final verification (controller)

- [ ] security-review skill + independent auditor (Opus) over the branch; fix or list findings in `docs/SECURITY.md`.
- [ ] Full check, whole-branch review (Opus), one fix dispatch, design-QA pass.
- [ ] Push, PR against `feat/phase-3-pages` (or `main` if merged), bind; verify the preview without a database (catalog works, auth shows unavailable); screenshots at 1440 and 390 for the owner.
