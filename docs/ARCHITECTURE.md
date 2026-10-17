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

1. `src/middleware.ts` first applies the route gate (`src/lib/route-gate.ts`, below), then next-intl maps `/` → `/ru`, keeps `/ru/*` and `/en/*`, and redirects paths without a locale to `/ru/<path>`. Phase 4 adds the optimistic auth cookie check here.
2. `src/app/[locale]/layout.tsx` validates the locale (`hasLocale` → `notFound()`; `dynamicParams = false` is not used, it broke `/ru` and `/en` on Workers), renders `<html lang>` and provides messages.
3. `next.config.ts` inlines `INDEXING` at build time and adds `X-Robots-Tag: noindex, nofollow` to every response unless it is `on`; `src/app/robots.ts` reads the same inlined value. `public/_headers` adds the header to static files that bypass Next.js on Cloudflare/Netlify.
4. Unknown paths under a locale are rewritten by the route gate to `src/app/[locale]/(site)/404/page.tsx` with status 404. `[...rest]` (`notFound()`) remains as the fallback for paths the middleware matcher skips.
5. On Cloudflare, pages are rendered per request (OpenNext default, no incremental cache). The read-only static-assets cache was tried and returned 404 for prerendered pages (`NoFallbackError`); revisit with an R2/KV cache when traffic or CPU limits require it.

## Route gate and the localised 404

Decision (Phase 3 final review, I1 and I2): `src/middleware.ts` runs `gateRoute()` from `src/lib/route-gate.ts` before next-intl.

- Known product slugs pass. A known slug in another case or encoding (`/ru/catalog/Black-Marble`) gets a 308 to the canonical slug. Any other path under a locale that is not in `PUBLIC_ROUTES` is rewritten to `/{locale}/404` with status 404. The browser keeps the requested URL.
- Why not `dynamicParams = false` on `catalog/[slug]`: that is the standard fix, but it is the same switch that broke `/ru` and `/en` on Workers at the locale level (OpenNext has no incremental cache here, the prerender lookup fails, `NoFallbackError`). On a nested segment the lookup would be the same, so every product page would risk a 404 on Cloudflare. The gate works the same way on every host.
- Why it matters: `catalog/[slug]` is SSG with on-demand ISR. Without the gate, every unknown slug was rendered and written to the route cache. On a case-insensitive file system (Windows, default macOS) `Black-Marble` overwrote the prerendered `black-marble` entry with a 404 until the next build.
- Why a page and not `notFound()`: `notFound()` thrown during render escapes the HTML shell (React's server renderer has no error boundaries). Next then sends the empty `<html id="__next_error__">` recovery shell with status 404, and the not-found UI appears only after client-side rendering. Without JavaScript the page was blank, and this predates Phase 3. `(site)/404/page.tsx` is a normal, dynamic render, so the h1, body and catalog link are in the server HTML. Next takes the metadata of any 404-status response from the nearest `not-found.tsx`, so the localised `<title>` (`meta.notFound`) is exported there.
- Maintenance: a new page under `src/app/[locale]` must be added to `PUBLIC_ROUTES`, or it will be served as a 404. `tests/unit/route-gate.test.ts` scans the app directory and fails when a page is missing. When Phase 4 moves products to a database, the middleware slug list must come from the same source.
- Known limits: `/ru/catalog/<known-slug>.rsc` (Next strips `.rsc` before the middleware) can still write one 404 cache entry per known slug, so at most 24. Single-segment dotted paths (`/zz.txt`) reach the `[locale]` route outside the middleware matcher, which predates Phase 3.

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
- Controls whose pages do not exist yet are inert (non-link `span`, `aria-disabled`), listed in `PHASE3_INERT` (`src/components/navigation/nav-items.ts`): header and menu Create Your Stone, Cart, account; tab bar Favorites, Cart, Sign in. Remove an entry when its page ships.
- The "Sign in" tab links to `/account` until the sign-in screen exists (Figma gap, `docs/FIGMA-INVENTORY.md` section 5.1).

## Pages, catalog data and the inert pattern (Phase 3)

- Routes (all under `src/app/[locale]/(site)/`, locales `ru` and `en`, slugs identical in both, ADR-004):
  `/` (home, `_home/` holds Hero, Backdrop and ShowcaseSection), `/catalog` (filters, search, sort and
  grid, state in the URL query, works without JavaScript), `/catalog/[slug]` (product page with gallery and cost
  calculator; unknown slugs and paths are a localised 404 through the route gate and `(site)/404/page.tsx`).
  `/_styleguide` stays outside the group. `/create-your-stone`, `/cart` and `/account` are not built (inert, below).
- Catalog data: `src/server/catalog/` is a repository behind the `CatalogRepository` interface (`types.ts`:
  `Product`, `CatalogQuery`, `Localizer`). `seed.ts` holds the 12 Figma products (prices are placeholders from
  Figma, `discountPercent` is stored as drawn), `static-repository.ts` implements list/filter/sort/search/get on the
  seed, `query.ts` parses and validates URL params (invalid values fall back to defaults), `index.ts` exports the
  `catalog` singleton (`server-only`). Phase 4 swaps in a database-backed implementation without touching pages.
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
  MobileMenu item, footer links). The lists live in `PHASE3_INERT` (`src/components/navigation/nav-items.ts`); other
  inert controls are page-local (hearts, Add to cart, Buy now, Save, Projects, custom-order CTA). Remove the entry
  and the prop when the page ships (Phase 4).

## Motion

Every shipped animation, its tokens (`src/styles/tokens/motion.css`) and its reduced-motion behaviour are listed in `docs/ANIMATIONS.md`.
