# Phase 4 — Auth, roles, account and admin

**Date:** 2026-10-17
**Status:** Design approved section by section in conversation (2026-10-17); written spec awaiting owner review.
**Scope:** sign-up / sign-in / sign-out, the Guest / Client / Admin model with server-side checks, the account area, the admin panel (all eight screens working), favourites on the public site, and the catalog moved from the static seed to Postgres. Delivered in two parts with separate PRs: **4a** (auth, roles, account, admin shell, Overview, Products, Orders, favourites, DB catalog) and **4b** (Create Your Stone requests, Customers, Promotions, Site content, Overview from live data).
**Inputs:** ADR-002 (Better Auth + Postgres via Drizzle; Neon on the preview), Figma `1vEGuD9cYYFNynyByUGHwF` (read-only), `docs/FIGMA-INVENTORY.md`, Phase 3 spec and code (`CatalogRepository`, shell, inert pattern).

## 1. Owner decisions (2026-10-17)

| Topic | Decision |
|---|---|
| Sign-in screen (Figma gap) | Same layout as "Create account" (`431:3193` and breakpoints): title "Sign in", button "Sign in", link "No account? Create one". Owner approves from a screenshot. |
| Database on the preview | Owner creates a Neon Free project (EU) and adds `DATABASE_URL`, `BETTER_AUTH_SECRET` and the `SEED_*` values in Cloudflare (click-by-click in `docs/DEPLOYMENT.md`). Until then the preview works without a database: catalog from the static seed, auth screens show "Sign-in is unavailable on this environment". Local, tests and CI use PGlite. |
| Admin scope | All eight admin menu items active and working, split into 4a / 4b. Admin layouts exist for 1920 / 1440 / 1024 only; below 1024 a message "The admin panel is available on screens from 1024 px". |
| Favourites and header account | ♥ and "Save" work for Clients (optimistic toggle); a Guest is sent to `/sign-in?next=<current page>` and returns after signing in. The header account button and the "Sign in" tab work (Guest → sign-in, signed in → account). Cart, Buy now, Add to cart and public Create Your Stone stay inert (no Figma screens). |

## 2. Architecture, data and security

- **Stack (ADR-002):** Better Auth 1.x (email + password, database sessions, rate limiting), Drizzle ORM, PostgreSQL. All database code lives in `src/server/db/`. The driver is chosen in `src/server/db/client.ts` by `DATABASE_URL`: Neon URL → `@neondatabase/serverless` HTTP driver (Workers and Node); other `postgres://` → `pg`; `pglite://` → in-process PGlite (local, tests, CI). Nothing outside `src/server/platform` and `src/server/db` knows the host.
- **No-database mode:** when `DATABASE_URL` is unset, the catalog uses the static repository and auth routes/actions return a localised "unavailable" state; nothing crashes.
- **Schema (exact columns in the plan):** Better Auth `user` (+ `role`: `client` | `admin`, default `client`), `session`, `account`, `verification`; `product` (slug, material, color, color_group, finish, format, price_cents, old_price_cents, discount_percent, is_placeholder, image, image_fit, published, sort_order); `product_translation` (product, locale, name, description); `favorite` (user, product, unique pair); `order` (number like `D-1048`, user, status, total_cents, created_at) and `order_item` (product, finish, quantity, price_cents). 4b adds `stone_request` (number like `Q-1048`, customer, details, status), promotions as product discount fields, and `site_content` (key, locale, text).
- **Migrations and seed:** drizzle-kit migrations committed; `pnpm db:migrate`, `pnpm db:seed`. The seed is idempotent: the 12 Phase 3 products with translations, the two test users from `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` (git-ignored `.env.local`; values never logged), demo orders and favourites for the Client, demo stone requests (4b).
- **Catalog:** a database implementation of `CatalogRepository`; pages unchanged. Product pages move from build-time SSG to ISR revalidated on admin edits (`revalidatePath`), no external services. Unknown/unpublished slugs keep returning 404 without caching (Phase 3 middleware gate reads the slug list from the repository or is replaced by an equivalent that does not cache unknown slugs).
- **Authorization:**
  1. `middleware.ts`: optimistic cookie check for `/[locale]/account/*` and `/[locale]/admin/*` → `/[locale]/sign-in?next=…`. Not a security boundary.
  2. `src/server/auth/guards.ts`: `requireUser()`, `requireRole("admin")` validate the session against the database; called in every protected layout, page, server action and route handler.
  3. A CI test fails if an exported server action is not wrapped by a guard.
- **Rules:** sign-up always creates `client`; Admin exists only through the seed; an Admin cannot remove their own admin role; `next` accepts internal paths only (no open redirect); cookies `httpOnly; Secure; SameSite=Lax`; uniform error messages for unknown email vs wrong password; rate limiting on sign-in/sign-up.
- **New dependencies (ADR-002):** `better-auth`, `drizzle-orm`, `drizzle-kit` (dev), `@neondatabase/serverless`, `pg`, `@electric-sql/pglite`.
- **Worker size:** must stay ≤ 3 MiB compressed; if it does not, stop and ask the owner before Workers Paid.

## 3. Screens and behaviour

**Sign-up / Sign-in** (Create account `431:3193` and breakpoints): Email and Password (min 8 characters, show-password eye button), submit, error states via the Phase 2 `TextField` error (email taken, weak password, wrong credentials). Success → `next` or `/account`. "Back to products" → catalog. Signed-in users visiting these pages go to `/account`.

**Sign-out** (`803:20474` and breakpoints): `/sign-out` confirmation; "Sign out" ends the session server-side and goes home; "Stay signed in" goes back.

**Account** (Client and Admin; `736:5318` and breakpoints; Account / Orders, Favorites, Profile screens per `docs/FIGMA-INVENTORY.md`) with the Figma side menu (`Account/Nav button`):
- Overview: greeting by name (or the email local part), "Selected offers" (discounted products from the DB), the two latest orders, profile card, three favourites.
- Orders: list with Figma status chips (In progress / Delivered).
- Favorites: tiles; ♥ removes.
- Profile: editable name; email read-only; password change with the current password (no email service).
- "Support" and the bell stay inert (no screens).

**Admin** (`1077:51932` and siblings; 1920 / 1440 / 1024), sidebar with all eight items active:
- 4a: Overview (figures from the DB, labelled Demo where data is demo), Products (list; Add and Edit: ru/en name and description, price, old price, discount, material, colour, colour group, finish, format, image picked from the manifest; publish/unpublish), Orders (list; change status).
- 4b: Create Your Stone (requests from demo seed; statuses New, Draft quote, Awaiting payment, …), Customers (list; change role, never one's own), Promotions (product discounts), Site content (home texts ru/en; the site reads them from the DB, falling back to `messages`). Home Overview figures from live data.
- All forms are server actions with zod validation and `requireRole("admin")`; after saving, `revalidatePath` for the catalog and home.

**Public site:** ♥ / Save toggle favourites (optimistic, server action); Guest → sign-in with `next`. Header account and the "Sign in" tab active. Cart and public Create Your Stone remain inert.

**States:** no database (section 2); empty lists ("No orders yet" etc., Phase 3 style); expired session → sign-in with `next`.

## 4. Testing, security and done criteria

- **Unit / integration (Vitest + in-memory PGlite, no network):** guards (no session, client, admin, expired); `next` sanitising (`//evil.com`, `https://…`, `/\evil` rejected); server actions (zod rejects bad input, cannot touch another user's favourites, admin cannot drop own role); the database and static catalog repositories pass one shared contract test suite; idempotent seed that never logs secrets; CI test for unguarded server actions.
- **E2E (Playwright; server on PGlite with test-only seed values from `.env.test.example`):** Guest redirected from `/ru/account` and `/en/admin` with `next`; Client denied admin (404 or 403 — one, documented); Admin allowed; both locales; sign-up → account; sign-in → `next`; sign-out confirmation; Guest ♥ → sign-in → back; Client ♥ appears in Favorites; Admin adds a product → visible in catalog; unpublished → 404; order status change visible to the Client; 4b flows; axe on all new screens; no horizontal overflow at 390 on auth and account pages.
- **Security:** after 4a and after 4b a security review (security-review skill + an independent auditor on Opus); findings fixed or listed in `docs/SECURITY.md`. Checks: CSRF (Next server actions, SameSite), rate limiting, account enumeration, XSS in editable texts (site content is plain text only), no secrets in client bundles, headers.
- **Docs:** `docs/ROLES.md` (permission matrix per route and action), `docs/SECURITY.md`, `docs/DEPLOYMENT.md` (Neon + Cloudflare steps for the owner), `.env.example`, `docs/DEVELOPMENT.md` (`db:migrate`, `db:seed`, PGlite).
- **Done when (each of 4a, 4b):** lint, typecheck, unit, build, e2e and CI green; Worker ≤ 3 MiB; visual check of new screens against Figma at 1440 and 390 (admin 1440 and 1024); security review done; PR opened; the preview without a database still works and shows "sign-in unavailable"; after the owner adds Neon, sign-in verified on the preview.
- **Owner approval from screenshots:** Sign-in screen, "unavailable" state, admin below-1024 message, empty states, ru copy.

## 5. Out of scope

Cart and checkout, payments, public Create Your Stone form, email (verification, reset), notifications, support, About/Information/Reviews pages, mobile admin layouts.
