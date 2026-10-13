# ADR-002: Authentication and database

**Status:** Proposed (approved in conversation 2026-10-13; awaiting written review)
**Date:** 2026-10-13
**Deciders:** Project owner (approval), lead engineer (Claude)

## Context

- Roles: Guest (no session), Client (personal account), Admin (Client features plus the admin panel).
- Exactly two seeded test users (one Admin, one Client); credentials from git-ignored env only.
- Permission checks must be server-side (middleware plus a check in each server action and route handler).
- Criteria: portability across hosts, free tier, server-side role checks, simple seeding.
- The deployment is a test environment with no real personal data (owner, 2026-10-13). Production data residency (e.g. Russian 152-FZ) is out of scope and revisited before any production launch.

Facts checked on 2026-10-13:

- Auth.js (NextAuth) is now maintained by the Better Auth team, which recommends Better Auth for new projects.
- Better Auth supports PostgreSQL directly and via Drizzle/Prisma/Kysely adapters, provides a Next.js catch-all route handler, and on Workers needs `nodejs_compat` (AsyncLocalStorage).
- Supabase Free projects pause after 7 days of inactivity and need a manual restore; 2 active projects; 500 MB database.
- Neon Free: 100 CU-hours and 0.5 GB per project; compute suspends when idle and resumes on the next query.

## Decision

Use **Better Auth 1.x** (email + password, database sessions, admin/role support) with **PostgreSQL on Neon Free (EU region)** through **Drizzle ORM**.

The database driver is chosen in one file, `src/server/db/client.ts`, by the `DATABASE_URL`:

- Neon URL → `@neondatabase/serverless` HTTP driver (works on Workers and Node);
- any other `postgres://` URL → `pg`;
- `pglite://` → in-process PGlite for tests.

## Options Considered

### Option A: Better Auth + Neon Postgres + Drizzle (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Medium: auth tables and guards live in the repo |
| Cost | Free (Neon Free) |
| Scalability | Adequate; Postgres can move to any provider |
| Team familiarity | High: TypeScript library, standard Postgres, Drizzle |

**Pros:** auth code is in the repository and works with any Postgres and any host; roles are a column checked by our own guards; seeding is a plain script; tests run against PGlite without network.
**Cons:** we own session/security configuration; no hosted dashboard for users; idle Neon compute adds a cold start.

### Option B: Supabase (Auth + Postgres + RLS)

| Dimension | Assessment |
|---|---|
| Complexity | Low–Medium: hosted auth, RLS policies |
| Cost | Free, but projects pause after 7 idle days |
| Scalability | Good |
| Team familiarity | Medium |

**Pros:** auth, database and dashboard in one service; RLS as a second line of defence.
**Cons:** a test environment that is idle between work sessions and handed to other developers would regularly be paused; auth is tied to the Supabase service, so moving hosts is easy but moving away from Supabase is not.

### Option C: Auth.js + Postgres

**Pros:** large ecosystem. **Cons:** now in maintenance under Better Auth, which recommends Better Auth for new projects. Rejected.

### Option D: Hosted identity (Clerk, Auth0)

**Pros:** no auth code. **Cons:** vendor lock-in, account creation by the owner, client-heavy SDKs. Rejected for portability.

## Trade-off Analysis

Owning the auth layer costs some configuration effort but gives the strongest portability and the clearest server-side authorization model: one `role` column and explicit guards. Supabase's hosted convenience is outweighed by the 7-day pause on Free and by coupling auth to one vendor.

## Authorization model

| Layer | Responsibility |
|---|---|
| `middleware.ts` | Optimistic cookie presence check for `/[locale]/account/*` and `/[locale]/admin/*`; redirect Guests to `/[locale]/sign-in?next=…`. Not a security boundary. |
| `src/server/auth/guards.ts` | `requireUser()`, `requireRole("admin")`: validate the session against the database. Called in every protected layout/page, server action and route handler. |
| CI test | Fails if an exported server action is not wrapped by a guard. |

Sign-up (Figma "Create account") always creates `role = "client"`. Admin exists only through the seed. Sign-out uses the Figma "Sign out" confirmation screen.

## Security baseline

- Cookies `httpOnly; Secure; SameSite=Lax`; database-backed sessions and rate limiting.
- Secrets (`BETTER_AUTH_SECRET`, `DATABASE_URL`, `SEED_*`) are server-only, validated by zod in `src/server/env.ts` with `import "server-only"`, never `NEXT_PUBLIC_`.
- `.env*` git-ignored; `.env.example` maintained.
- No email provider on the test environment: no verification or reset email (documented in `docs/SECURITY.md`).

## Data model (outline; exact schema approved in Phase 4)

- Better Auth: `user` (+ `role`), `session`, `account`, `verification`.
- App: `product`, `product_translation` (locale, name, description), `favorite`, `order`, `order_item`. Prices carry `is_placeholder` (USD 240/m² remains a placeholder).

## Consequences

- Easier: host migration; running tests offline; reasoning about permissions.
- Harder: we maintain auth configuration and upgrades.
- Phase 3 catalog uses a repository interface over static seed data; Phase 4 swaps it to Postgres.
- Revisit: production data residency and email delivery before any real launch.

## New dependencies

`better-auth`, `drizzle-orm`, `drizzle-kit` (dev), `@neondatabase/serverless`, `pg`, `@electric-sql/pglite` (dev/test), `zod`.

## Action Items

1. [ ] Phase 4 spec: schema, seed script, guard API, permission matrix (`docs/ROLES.md`).
2. [ ] Owner creates a Neon project (click-by-click steps in `docs/DEPLOYMENT.md`) and sets env vars in Cloudflare.
3. [ ] Access tests in CI: Guest redirected, Client denied admin, Admin allowed, in both locales.

## Sources

- https://www.better-auth.com/blog/authjs-joins-better-auth
- https://www.better-auth.com/docs/installation
- https://neon.com/pricing
- https://automationatlas.io/answers/supabase-free-tier-limits-2026/ (third-party; verify on supabase.com/pricing)
