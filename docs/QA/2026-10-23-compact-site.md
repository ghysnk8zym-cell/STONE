# Compact STONE — implementation and QA

Completed locally on 2026-10-23 in `.claude/worktrees/phase-2-design-system`, branch `feat/test-shop`. No commit, push or deployment. Existing dirty work was preserved; the pre-edit source backup and patch are in `C:/Users/nartsiss/Documents/ChatGPT/stone/backups/before-compact-20261022`.

## Approved result

- Native 100% browser zoom: shared content max-width 1120px, Home panels 1072px, header 60px, compact desktop typography/spacing. No CSS zoom or transform scaling. Existing Figma source tokens and brand identity are retained.
- Home headline/search remain in normal flow on mobile. The English brand slogan is enforced for both locales, including old CMS overrides; its four fields are visibly read-only in the editor and rejected by the save action.
- Catalog and promo selections now contain six and four real seed products. All three Home carousels overflow on desktop and can move forward/back. Existing reduced-motion and keyboard behavior is retained. Work cards and Projects link to the new localized `/works` route.
- Our works contains five projects and assets from Figma frame `1039:46770` in file `1vEGuD9cYYFNynyByUGHwF`, with links to corresponding materials and the existing request form. Project specifications are explicitly illustrative, matching the test-store boundary.
- Account/cart/checkout/request/sign-out containers, auth form column and admin shell spacing reuse the compact rules. The existing narrow-screen admin notice is preserved.

Primary files: `src/styles/compact.css`, `src/app/globals.css`, SiteHeader, AuthScreen, Home Hero/page/ShowcaseSection, catalog pages and shared page containers, new `works/page.tsx`, public works assets, RU/EN messages, static catalog selection, Home content reader/editor/action, route gate and regression tests.

## Verification observed

- `next build`: passed, including TypeScript and both works routes.
- `tsc --noEmit`: passed again after the final test additions.
- ESLint on all changed TS/TSX files and Playwright config: passed. Prettier applied only to the change set. `git diff --check`: passed.
- Full Vitest suite: **79 files, 980 tests passed**. Includes isolated PGlite auth/content tests, immutable English slogan, CMS draft/conflict behavior, catalog contracts and carousel logic.
- Public Playwright run (`compact.spec.ts` + `pages.spec.ts`): 90 passed, 17 deliberately skipped, one old geometry assertion failed because it still expected 418px instead of the approved compact 414px. The expectation was updated with its padding rationale. The rerun of both geometry cases plus `surface-smoke.spec.ts` passed all 10 active cases, with eight duplicate viewport-project combinations skipped.
- The eight compact journey cases passed in RU/EN at 1920, 1440, 390 and 320px: all three carousel tracks, forward/back controls on desktop, keyboard activation, native mobile scrolling, search, Projects, five work images, product links, no page errors or horizontal overflow. Axe found no serious/critical findings in the new Works main content. Existing catalog axe checks also passed.
- Eight additional public-surface cases covered catalog, product, cart, empty checkout, request, sign-in/up and sign-out at those viewport widths in both languages. Verified compact catalog heading, full-width auth background and bounded form column.
- Eight authenticated cases passed against a newly created local PGlite database with fictitious example accounts: actual sign-in forms, admin overview/products/content/requests, locked slogan UI, client account/orders/profile/favorites and empty checkout. No shared database, outbound forms, orders or payments were used. Mobile admin checks cover the existing desktop-required notice.
- Independent read-only review found two issues (auth backdrop selector and catalog heading selectors); both were corrected and re-reviewed without further substantial findings.
- Impeccable detector on compact CSS, Hero and Works returned `[]`.

Browser artifacts retained under `C:/Users/nartsiss/Documents/ChatGPT/stone/qa`. Local public preview: `http://localhost:3100/ru` and `/ru/works`; this preview intentionally has no database, so sign-in is unavailable there.

## Boundaries and outstanding external setup

- Public deployment was not modified. Live credentials, configuration and shared records were untouched.
- Unknown footer/social destinations remain as agreed; no invented URLs or placeholder success behavior were added.
- Code Connect mappings were approved and attempted, but Figma refused them because the library requires an Organization or Enterprise plan. No mappings were saved and no plan/library change was made. See `2026-10-22-code-connect.md`.
- This verifies the scoped journeys and surfaces, not every existing browser test or external integration. No new payment or notification behavior was exercised.
