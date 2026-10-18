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

1. `src/middleware.ts` first applies the route gate (`src/lib/route-gate.ts`, below), then next-intl maps `/` → `/ru`, keeps `/ru/*` and `/en/*`, and redirects paths without a locale to `/ru/<path>`. Before that, an optimistic auth check sends a Guest without a session cookie from `/{locale}/account/*` and `/{locale}/admin/*` to `/{locale}/sign-in?next=…` (`next` sanitised by `src/lib/safe-next.ts`), and every request gets the `x-stone-path` header for the guards. The cookie is not proof: `requireUser` / `requireRole` in `src/server/auth/guards.ts` validate the session against the database (Better Auth, cookie cache off) in every protected page, action and route.
2. `src/app/[locale]/layout.tsx` validates the locale (`hasLocale` → `notFound()`; `dynamicParams = false` is not used, it broke `/ru` and `/en` on Workers), renders `<html lang>` and provides messages.
3. `next.config.ts` inlines `INDEXING` at build time and adds `X-Robots-Tag: noindex, nofollow` to every response unless it is `on`; `src/app/robots.ts` reads the same inlined value. `public/_headers` adds the header to static files that bypass Next.js on Cloudflare/Netlify.
4. Unknown paths under a locale are rewritten by the route gate to `src/app/[locale]/(site)/404/page.tsx` with status 404. `[...rest]` (`notFound()`) remains as the fallback for paths the middleware matcher skips.
5. On Cloudflare, pages are rendered per request (OpenNext default, no incremental cache). The read-only static-assets cache was tried and returned 404 for prerendered pages (`NoFallbackError`); revisit with an R2/KV cache when traffic or CPU limits require it.

## Route gate and the localised 404

Decision (Phase 3 final review, I1 and I2): `src/middleware.ts` runs `gateRoute()` from `src/lib/route-gate.ts` before next-intl.

- The gate no longer knows which products exist. Since Phase 4a the catalog is in the database and the middleware cannot await a database on every host (Edge runtime, Workers), so it only normalises and checks shape. A product slug (`catalog/<slug>`, `admin/products/<slug>`) that is lowercase and shaped like a slug (`SLUG_SHAPE`: letters, digits, single dashes) passes. The same slug in another case or encoding (`/ru/catalog/Black-Marble`) gets a 308 to the lowercase form. A segment that is not a slug (dots, spaces, double dashes, bad escapes) and any other path under a locale that is not in `PUBLIC_ROUTES` is rewritten to `/{locale}/404` with status 404. The browser keeps the requested URL.
- Why not `dynamicParams = false` on `catalog/[slug]`: that is the standard fix, but it is the same switch that broke `/ru` and `/en` on Workers at the locale level (OpenNext has no incremental cache here, the prerender lookup fails, `NoFallbackError`), and it would make a product created in the admin a 404 until the next build.
- Why the product page is rendered per request (`export const dynamic = "force-dynamic"`, Phase 4a Task 5): an unknown slug of the right shape reaches the route, which would call `notFound()`. On an SSG route with on-demand ISR Next stores that 404 in the route cache like any page. Measured with `next start`: the first request to `/ru/catalog/nope` answered 404 and the next one `x-nextjs-cache: HIT` with `Cache-Control: s-maxage=31536000`: one cache entry (and one CDN entry) per requested slug, without bound, and a stale 404 for a slug that is created later unless every creation revalidates it. There is no per-slug opt-out: calling a dynamic API (`connection()`) in the not-found branch makes the on-demand render answer 500. Per-request rendering answers "200" or "404, `no-store`", shows an admin's edit, unpublish or new product at once, and does not depend on `revalidatePath` (Cloudflare has no incremental cache and renders per request anyway). The admin actions still call `revalidatePath` for the pages that stay static: the home page, with the concrete paths `/ru` and `/en` (derived from `routing.locales`; the route pattern `/[locale]` does not reach the SSG home page, measured), the catalog paths, the account area and the admin screens. Cost: two small queries per product page view. `tests/e2e/not-found.spec.ts` and `tests/e2e/admin.spec.ts` hold the behaviour: `Black-Marble` and `nope` requested, then `black-marble` is still 200, and a product created under the slug that was a 404 is 200 at once.
- Why a page and not `notFound()`: `notFound()` thrown during render escapes the HTML shell (React's server renderer has no error boundaries). Next then sends the empty `<html id="__next_error__">` recovery shell with status 404, and the not-found UI appears only after client-side rendering. Without JavaScript the page was blank, and this predates Phase 3. `(site)/404/page.tsx` is a normal, dynamic render, so the h1, body and catalog link are in the server HTML. Next takes the metadata of any 404-status response from the nearest `not-found.tsx`, so the localised `<title>` (`meta.notFound`) is exported there.
- Maintenance: a new page under `src/app/[locale]` must be added to `PUBLIC_ROUTES`, or it will be served as a 404. `tests/unit/route-gate.test.ts` scans the app directory and fails when a page is missing.
- Unknown or unpublished product slug (Phase 4a Task 5, fix round 1): `catalog/[slug]` does `redirect(`/${locale}/404`)` (307, `no-store`), and the gate's server-rendered 404 page answers 404 with `lang`, the localised h1, title and `noindex`. Why not `notFound()`: in Next 16.3.8 the not-found boundary is a client component and React's server renderer never runs error boundaries, so `notFound()` thrown during render ends in the empty `__next_error__` shell (measured at 39084a0: 404, no `lang`, no h1, content only after client rendering). The redirect keeps the content in the server HTML, nothing is cached (the route is `force-dynamic`), and a product that exists costs nothing extra. Cost, for the owner checklist: the address bar shows `/ru/404` for an unknown product, and the answer is 307 then 404 instead of one 404. A Suspense wrapper was rejected (a streamed 200 soft 404), and so was a database check in the middleware (Edge runtime: `pg` and PGlite cannot load there). `tests/e2e/not-found.spec.ts` covers 307 then 404, the localised page with JavaScript disabled, and that nothing is cached. Admin pages (`admin/products/[slug]`) still use `notFound()`: the admin area needs JavaScript anyway.
- Other limits: single-segment dotted paths (`/zz.txt`) reach the `[locale]` route outside the middleware matcher, which predates Phase 3.

## Portability rules

- Application code imports `@/server/platform`, never `@opennextjs/cloudflare`, `wrangler` or `cloudflare:*` (ESLint rule + `tests/unit/structure.test.ts`).
- Environment is read via `process.env` and validated in `src/server/env.ts`.
- Next.js is pinned to `16.3.8`: Next 16.4.0 crashes on Workers with `Unexpected loadManifest(/.next/server/preview-props.json)` until OpenNext ships the fix (opennextjs/opennextjs-cloudflare#1448, PR #1356). The `cloudflare` CI job smoke-tests the built Worker in workerd, so an upgrade that breaks the runtime fails CI.
- `cacheComponents` is off until OpenNext supports it on Workers (see ADR-001 and the Phase 1 plan ledger notes in the PR).

## Layout notes for Phase 3

- `TabBar` is `position: fixed` at the bottom of the viewport on phones: visible below 768 px (`md:hidden`), 358 x 68, 16 px above the bottom edge or the safe-area inset, whichever is larger.
- Pages and layouts that render it need 100 px of bottom padding (bar 68 + bottom offset `max(16px, env(safe-area-inset-bottom))` + 16 px breathing room). Use the `pb-tabbar` utility from `src/app/globals.css`, phones only: `max-md:pb-tabbar`.
- The `[locale]` layout mounts both `TabBar` and `SiteFooter` in Phase 3 (neither is mounted anywhere yet). The footer is full width; the bar floats above it.
- `TabBar`'s `current` prop is optional: product pages (`/catalog/<slug>`) highlight Catalog, as Figma's Product screen (782:11815) draws it active.
- Shell mounting (Task 4): `src/app/[locale]/(site)/layout.tsx` renders `SiteHeader`, the single `<main>` (pages never render their own), `SiteFooter` and `ShellTabBar` (client; maps the locale-stripped `usePathname()` to `TabBarCurrent`), with the phone padding on the footer, 24 px own + 100 px bar space (`<SiteFooter reserveTabBar>` -> `max-md:pb-footer-tabbar`), not on the wrapper, so the footer glass extends under the floating bar. `[locale]/layout.tsx` keeps `<html>`, `<body>` and providers only. `/_styleguide` is outside the `(site)` group, so it has no shell. `(site)/not-found.tsx` renders the localised 404 inside the shell; `[locale]/not-found.tsx` is the fallback.
- Controls whose pages do not exist yet are inert (non-link `span`, `aria-disabled`), listed in `INERT` (`src/components/navigation/nav-items.ts`, called `PHASE3_INERT` in Phase 3): header and menu Create Your Stone and Cart; tab bar Cart. Favorites and the account entries went live in Phase 4a. Remove an entry when its page ships.
- The account entries are session-aware (Phase 4a): the header account button, the mobile menu entry and the last tab ("Sign in" for a Guest, "Account" once signed in) go to `/sign-in` for a Guest and `/account` otherwise. The public pages are static, so the visitor state is a client island: `AccountStateProvider` (`src/features/account`, mounted in the `(site)` layout) fetches `GET /api/me` after hydration (no-store; signed-in flag, display name, favourite slugs; never an id or email) and re-reads it after each navigation. The ♥ of the catalog and showcase cards and the product page Save read it and toggle through the guarded `toggleFavorite` server action (optimistic, the wanted state is sent so a stale client cannot flip the wrong way); a Guest is sent to `/sign-in?next=<page and query>` and the click is added once they are back (sessionStorage, 30 minutes). Trade-off: a signed-in visitor sees an unsaved heart for the moment between hydration and the answer; the alternative, reading the session in the layout, would make every public page dynamic. `html[data-account-state]` (loading, guest, signed-in) is the readiness signal for tests.

## Pages, catalog data and the inert pattern (Phase 3)

- Routes (all under `src/app/[locale]/(site)/`, locales `ru` and `en`, slugs identical in both, ADR-004):
  `/` (home, `_home/` holds Hero, Backdrop and ShowcaseSection), `/catalog` (filters, search, sort and
  grid, state in the URL query, works without JavaScript), `/catalog/[slug]` (product page with gallery and cost
  calculator; unknown slugs and paths are a localised 404 through the route gate and `(site)/404/page.tsx`).
  `/_styleguide` stays outside the group. `/create-your-stone` and `/cart` are not built (inert, below); the account area and sign-in arrived in Phase 4a (below).
- Catalog data: `src/server/catalog/` is a repository behind the `CatalogRepository` interface (`types.ts`:
  `Product`, `CatalogQuery`, `Localizer`). `seed.ts` holds the 12 Figma products (prices are placeholders from
  Figma, `discountPercent` is stored as drawn), `static-repository.ts` implements list/filter/sort/search/get on the
  seed, `query.ts` parses and validates URL params (invalid values fall back to defaults), `index.ts` exports
  `getCatalog()` (`server-only`), which since Phase 4a returns the database repository when `DATABASE_URL` is set and
  the static one otherwise, without touching the pages.
  Colour filters use Figma groups (`ColorGroup`: dark, grey, light, warm) through `Product.colorGroup`.
- Cost calculator: pure functions in `src/lib/calculator.ts` (area and wall modes, +10 % extra tiles, cents arithmetic,
  limits 0.01 to 10 000 m2 and 0.01 to 100 m); the client island only holds input state. The server renders the
  default estimate, so the page is complete without JavaScript.
- Shell: `(site)/layout.tsx` owns the only `<main>`; pages never render their own.
- Page surface attribute: a page on the light catalog surface marks its root element (a direct child of `<main>`)
  with `data-page-surface="catalog"` (`(site)/page-surface.ts`); the shell then paints that cream surface behind
  the translucent glass header and footer with a `has-[...]` rule, so they blend over it as in Figma. Home does not
  set it (the backdrop photo sits behind them).
- Inert pattern: a control whose destination does not exist yet renders in its default Figma look but as a
  non-link element with `aria-disabled="true"`, no hover or press styles and out of the tab order (distinct from
  `disabled`, which dims). Components take an `inert` prop (Button, IconButton, NavPill, SocialButton, TabBar tab,
  MobileMenu item, footer links). The lists live in `INERT` (`src/components/navigation/nav-items.ts`); other
  inert controls are page-local (Add to cart, Buy now, Projects, custom-order CTA, the account Support and bell, View order). Remove the entry
  and the prop when the page ships (Phase 4).

## Admin area (Phase 4a Task 5)

- Routes under `src/app/[locale]/admin/` (outside the `(site)` shell: no site header, footer or tab bar): `/admin` (Overview), `/admin/products`, `/admin/products/new`, `/admin/products/[slug]`, `/admin/orders`, and the four Phase 4b sections `/admin/create-your-stone`, `/admin/customers`, `/admin/promotions`, `/admin/site-content`. The sidebar links all eight; until 4b the last four render the Figma header and a localised "This section arrives in the next update" card (`AdminComingSoon`), so nothing is a dead link. Admin layouts exist from 1024 px (Figma has no smaller ones): below that `admin/layout.tsx` shows a localised message and the shell is `display: none`.
- Guards: the layout and every page call `requireRole("admin", locale)` (Guest to sign-in with `next`, Client gets a 404); the four server actions in `src/server/admin/actions.ts` (`createProduct`, `updateProduct`, `setProductPublished`, `setOrderStatus`) call it first, before validation. Arguments are `unknown` and validated with zod (`src/server/admin/product-input.ts`): money is integer cents, the picture must be a catalog key of `assets/figma-manifest.json` (`src/server/admin/images.ts`; there is no upload yet), names and descriptions are plain text without control characters, the slug is a URL slug that never changes after creation. After a change the actions call `revalidatePath` for the home page, the account area and the admin screens (the product pages and the catalog are rendered per request, see "Route gate").
- Copy of products: the public pages (home, catalog, product page, metadata) show the name and description from `product_translation` for the page locale, then the `messages` the seed was made from, then the slug (`src/lib/product-copy.ts`). The database repository carries the stored copy on `Product.copy`; the catalog page asks it to search and sort by the stored name (`Localizer.preferStoredNames`).
- Data the Figma admin draws and the model does not have: stock per product, payment status of an order, the Create Your Stone requests (4b). They are not drawn and not invented: Overview shows revenue and order count from the orders, the 7 days up to the newest order as the chart, and the first three published products with their price; Orders has one status (In progress = Processing, Delivered = Fulfilled).
- Writes and rules: a product and its ru / en copy are written as one atomic unit (`src/server/admin/atomic.ts`: an interactive transaction on `pg` and PGlite; on the Neon HTTP driver, which has no interactive transactions, `db.batch`, one request in one transaction), so a failed save leaves nothing half-written. The slug `new` is reserved (`/admin/products/new` is the Add page). Order status: an admin moves an order freely between In progress and Delivered, in either direction (a mistaken "delivered" must be undoable); there is no other state and no history yet.
- Worker size: the admin routes reuse the shared server chunks (`[locale]/layout.tsx` imports the guards and account queries as side effects, see the comment there); the admin modules only add drizzle queries and zod schemas that are already in those chunks.

## Auth, database and guards (Phase 4a)

Decisions: `docs/adr/ADR-002-auth-database.md` and the Phase 4 spec. Who may do what: `docs/ROLES.md`. Threats and settings: `docs/SECURITY.md`.

### Layout

| Path                                            | Role                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/server/db/`                                | The only place that knows the database. `client.ts` picks the driver from `DATABASE_URL` (Neon host: HTTP driver; other `postgres://`: `pg`; `pglite://`: in-process PGlite, migrated on first use); `schema.ts` (Drizzle: Better Auth tables + `role`, `rate_limit`, `product`, `product_translation`, `favorite`, `order`, `order_item`); `seed.ts`; `unavailable-driver.ts` |
| `drizzle/`                                      | Committed SQL migrations (`pnpm db:generate`, applied with `pnpm db:migrate`)                                                                                                                                                                                                                                                                                                  |
| `src/server/auth/`                              | `auth.ts` (Better Auth config: cookies, rate limits, database sessions, cookie cache off), `session.ts` (`getSession`, request-cached), `guards.ts` (`requireUser`, `requireRole`), `next.ts` (`handleAuthRequest` for `/api/auth/*`, `callAuthEndpoint` for server actions), `constants.ts`, `request-locale.ts`                                                              |
| `src/server/account/`, `src/server/admin/`      | Server actions (`"use server"`) and queries for the account and admin areas; `admin/atomic.ts` writes a product and its translations as one unit                                                                                                                                                                                                                               |
| `src/server/catalog/`                           | `CatalogRepository` with two implementations: static (no database) and `db-repository.ts`; `getCatalog()` chooses per request                                                                                                                                                                                                                                                  |
| `src/server/platform/`                          | The hosting seam; now also `clientIp(headers)`, the rate-limit key (`docs/SECURITY.md`)                                                                                                                                                                                                                                                                                        |
| `src/features/auth/`, `account/`, `admin/`      | UI logic that is not a component: forms and their state, the favourites island (`AccountStateProvider`), result types shared by actions and clients (codes only)                                                                                                                                                                                                               |
| `src/app/[locale]/(auth)/`                      | Sign-in and sign-up, without the site shell; `actions.ts` holds the public actions                                                                                                                                                                                                                                                                                             |
| `src/app/[locale]/(site)/account/`, `sign-out/` | Account pages and the sign-out confirmation, inside the site shell                                                                                                                                                                                                                                                                                                             |
| `src/app/[locale]/admin/`                       | Admin pages, outside the site shell                                                                                                                                                                                                                                                                                                                                            |
| `src/app/api/{auth,me,health/db}/`              | Route handlers (`docs/ROLES.md` lists which are public and why)                                                                                                                                                                                                                                                                                                                |

### Guards

- One boundary: `requireUser(locale)` / `requireRole("admin", locale)`. They read the session from the database on every call (`getSession` is wrapped in React `cache`, so the second call in a request is free). A Guest is redirected to `/{locale}/sign-in?next=<page>`; a signed-in user without the role gets `notFound()`.
- Called in the layout, in **every** page and as the **first statement** of every server action; a layout is not re-rendered on every client navigation, so the layout call alone is not a boundary. The middleware only does an optimistic cookie check.
- The page path reaches the guards through the `x-stone-path` request header, which the middleware always overwrites; actions get the locale from it (`requestLocale()`).
- Enforced by `tests/unit/server-actions-guarded.test.ts` (static scan of every `"use server"` module and route handler) and `tests/e2e/access.spec.ts`.
- Better Auth is used through its handler (`callAuthEndpoint`), never `auth.api.*`, because only the handler applies rate limiting and the origin check. Results given to the browser go through `toClientResult` (no session token).

### No-database mode

`getDb()` is async and returns `null` without `DATABASE_URL`. Then `catalog` is the static repository, the auth pages show the localised "unavailable" state (also when the database cannot be reached), `/api/auth/*` answers 503 JSON, `/api/me` answers as a Guest and `/api/health/db` answers 503. The Cloudflare preview runs this way until the owner adds Neon (`docs/DEPLOYMENT.md`).

### Favourites island

Public pages (home) are static and cannot read the session, so a client island decides who is looking: `AccountStateProvider` (mounted in the `(site)` layout) fetches `GET /api/me` once per layout mount, when the sign-out confirmation is left and on `visibilitychange`. Hearts and the account entries read it; the toggle is the guarded `toggleFavorite` server action (optimistic, sends the wanted state so a stale client cannot flip the wrong way; a click before the state is known is queued). A Guest is sent to `/sign-in?next=<page and query>` and the product is added once they are back. `html[data-account-state]` (loading, guest, signed-in) is the readiness signal for tests. Trade-off for the owner: a signed-in visitor sees an unsaved heart briefly on a full page load.

### Admin and product copy

Described in "Admin area" above. Names and descriptions of products come from `product_translation` (`src/lib/product-copy.ts`), then from `messages`, then the slug. The admin has no language switch (the URL locale is the language) and shows a message below 1024 px.

### Slug handling

The route gate (`src/lib/route-gate.ts`) normalises and checks the **shape** of a product slug (lowercase `a-z0-9` with single dashes; another case or encoding gets a 308 to the lowercase form; anything else is a 404). Whether a product exists is the route's decision: `catalog/[slug]` is rendered per request, and an unknown or unpublished slug redirects (307, `no-store`) to the server-rendered `/{locale}/404`. The slug `new` is reserved (the Add product page). A slug never changes after creation. Reasons and measurements: "Route gate and the localised 404" above.

### Worker bundle guard

Turbopack writes the shared server chunks once per route group, so Better Auth, Drizzle and zod were bundled once for the public pages, once for the account pages and once for the auth pages (about 330 KiB gzip of copies; the Worker limit is 3 MiB). Two measures keep it at one copy:

1. `src/app/[locale]/layout.tsx` imports `@/server/auth/guards` and `@/server/account/queries` for their side effects (they only declare functions). The common parent puts those modules into one shared chunk. **Do not remove those imports**, and add a module there when a new route group pulls in a big server dependency (the admin group reused the shared copy without a change).
2. `pnpm cf:size` (`scripts/check-worker-size.mjs`, pure parts in `scripts/worker-size.mjs`, unit-tested) prints the ten largest server chunks and **fails when the Better Auth marker is in more than one `chunks/ssr` file**, or in none (a stale marker). It runs in the CI `cloudflare` job after `pnpm cf:build`.

Worker size after each step (gzip, limit 3072 KiB): 1732 (database layer), 1820 (seed and catalog), 2113 (auth core), 2196 (auth screens), 2348 (account, after dedupe), 2393 (admin).

## Motion

Every shipped animation, its tokens (`src/styles/tokens/motion.css`) and its reduced-motion behaviour are listed in `docs/ANIMATIONS.md`.
