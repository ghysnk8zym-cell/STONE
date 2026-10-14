# Phase 3 — Home, catalog and product pages

**Date:** 2026-10-14
**Status:** Design approved section by section in conversation (2026-10-14); written spec awaiting owner review.
**Scope:** the public Guest pages — Home v2, Catalog, 12 Product pages with the cost calculator — in ru and en, at 1440 / 1024 / 768 / 390 (360 and 1920 as extra checks). Auth, cart, favourites, Create Your Stone and Our works are later phases.
**Inputs:** Figma `1vEGuD9cYYFNynyByUGHwF` (read-only), `docs/FIGMA-INVENTORY.md`, Phase 0 spec `2026-10-13-web-architecture-design.md`, Phase 2 spec and components, `docs/ARCHITECTURE.md` ("Layout notes for Phase 3"), `docs/QA/phase-2-components.md` (owner checklist).

## 1. Owner decisions (2026-10-14)

| Topic | Decision |
|---|---|
| Controls leading outside Phase 3 | Visible as in Figma but inert (`aria-disabled`, rendered as non-links, like the footer): Create Your Stone, Cart, Buy now, Add to cart, Save / ♥, Projects, Custom order CTA, Information / About us / Reviews. **Offers** links to the catalog filtered to discounted items. Cart and favourites arrive with sign-in in Phase 4. |
| Placeholder prices | One visible line in `type-catalog-meta` — ru «Цены ориентировочные», en "Prices are illustrative" — under the "Showing N of 12" counter on the catalog and under the "Promo products" section label on the home page. Cards stay exactly as in Figma. The calculator keeps Figma's own "Illustrative estimate" caption. Owner approves from a screenshot. |
| Product names in ru | Translated (e.g. «Чёрный мрамор», «Серый известняк»). The slug stays English and is shared by both locales: `/ru/catalog/black-marble`. All ru copy beyond the Figma tab labels is a draft for owner review. |
| Calculator unit price | The product's own price per m² (Figma: Charcoal Ledger $38.00 → $83.60 for 2 m²; Black Marble $240.00 → $528.00). All prices are placeholders (`isPlaceholder: true`). |

## 2. Architecture and data

**Approach:** server-rendered pages; client JavaScript only in small islands. Rejected: client-side filtering of the whole catalog, and a separate API route — both heavier and both fail without JavaScript.

- **Repository** — `src/server/catalog/`:
  - `CatalogRepository` interface: `list({ material?, color?, finish?, sale?, sort, q }, locale)`, `getBySlug(slug)`, `listPromo()`, `listFeatured()`, plus the distinct filter values present in the data.
  - Phase 3 implementation `staticCatalog` over a typed seed (`src/server/catalog/seed.ts`): 12 products with `slug`, `material`, `color`, `finish`, `format` (mm), `priceCents`, `oldPriceCents?`, `isPlaceholder: true`, image keys. Localised strings (name, description, enum labels) live in `messages/*.json` under `catalog.*`.
  - Phase 4 swaps the implementation for the database; pages do not change.
- **Routes:**
  - `/[locale]` — home.
  - `/[locale]/catalog?material=&color=&finish=&sale=&sort=&q=` — filter state lives in the URL (shareable, Back works, works without JS). Unknown or invalid parameter values are dropped, never errors.
  - `/[locale]/catalog/[slug]` — 12 pages via `generateStaticParams`; an unknown slug renders the localised 404.
- **Filter options** come from the data (e.g. Sandstone, Slate, Quartzite, Concrete). The older "Catalog refined" dropdown lists (Granite, Honed, Flamed…) and the "Filters · 390" sheet are not used: the current Catalog 390 screen uses the same Select fields as desktop.
- **Client islands:** cost calculator; carousel arrows (CSS scroll-snap, arrows + swipe, no autoplay); product gallery thumbnails; Select filters (navigate on change; without JS a submit button in the `<form method="get">` applies them).
- **Shell:** `[locale]/layout` mounts `SiteHeader`, `SiteFooter` and `TabBar`. The active tab follows the route (home → Главная, catalog → Каталог); product pages show no active tab (Figma). Phones get `max-md:pb-tabbar`.
- **Images:** the existing pipeline (manifest + WebP 390–1920, custom loader). Hero is a flattened image per layout with `priority`. Missing frames (second product photo, work photos) are downloaded from Figma with read tools only.

## 3. Pages and states

**Home (Home v2, `722:1300` at 1440):** hero image with live headline and search (submits to `/catalog?q=…`); three carousels in glass panels — Catalog (`ShowcaseCard` Product), Promo products (Promo, discount badge, price + old price, placeholder-price line), Our works (Work). "Open catalog" → catalog; "Offers" → `/catalog?sale=1`; "Projects" inert.

**Catalog (`922:25494`):** back button → home; title; search by localised name and material (case-insensitive); Material / Color / Finish filters and Sort (name A–Z, Z–A, price ↑, ↓); "Showing N of 12" + placeholder-price line; product grid (4 / 3 / 2 columns as per Figma breakpoints); Custom order banner (CTA inert). Empty result: Figma `Catalog/Empty` (`159:309`) with a "Reset filters" link.

**Product (`782:11526` and siblings):** back button → catalog; breadcrumb Catalog / Material / Name (material links to the filtered catalog); gallery (main image + thumbnails; click selects); title, description, spec rows (Material, Color, Finish, Format); calculator; Save, Buy now, Add to cart inert.

**Calculator (`779:628`, modes `779:547` Area and `779:584` Wall dimensions):**
- Area mode: surface m². Wall mode: length × height in metres.
- Extra tiles 10%; order area = surface + extra; total = order area × the product's unit price.
- Money in integer cents, rounded half-up to 0.01; areas shown with two decimals.
- Input accepts `2.5` and `2,5`; valid range 0.01–10 000. Invalid input shows the existing `TextField` error state and the total shows "—".
- Prices formatted per locale with `Intl.NumberFormat` (en `$528.00`, ru `528,00 $`), unit `/ m²`.
- "Illustrative estimate" caption visible (Figma). Without JS the default 2 m² result is server-rendered.

**Errors:** Figma has no 404/500 screens. A minimal page from existing tokens (Lusitana title, body text, button "To catalog"); owner approves from a screenshot.

**Worst-case data:** long ru names wrap to at most two lines with ellipsis and never overflow at 360; a product with one image hides the thumbnails; no old price → no discount badge; zero results → empty state.

## 4. Testing, visual QA and done criteria

- **Unit (Vitest):** repository filters, search (ru/en), sort and unknown slug; catalog search-param parsing (invalid values dropped); calculator pure function (2 m² × $240 → $528.00; wall 2 × 1 → the same; comma input; range bounds; rounding); locale price formatting; every product has ru/en copy and manifest images; existing messages-parity test covers `catalog.*`.
- **E2E (Playwright):** navigation home → catalog → product → breadcrumb → catalog, and TabBar at 390; locale switch on every page keeps path and filter params; filters/search/sort update URL and grid, Back restores, empty state and reset; calculator both modes, invalid input, total; 404 for an unknown product in ru/en; axe (no critical/serious) on all three pages; no overflow at 360/390; carousels under reduced motion.
- **Visual QA:** extend `pnpm qa:visual` with full pages at 1440 / 1024 / 768 / 390 against the Figma screens (home, catalog, Black Marble and two more products); results in `docs/QA/phase-3-pages.md` with classified mismatches; independent design-QA pass.
- **Done when:** lint, typecheck, unit, build, e2e and CI green; Worker ≤ 3 MiB compressed; Cloudflare preview serves `/ru`, `/ru/catalog`, `/ru/catalog/black-marble` with 200; screenshots at 1440 and 390; `docs/ANIMATIONS.md` (carousels) and `docs/ARCHITECTURE.md` updated; PR opened against the Phase 2 branch (or `main` once earlier PRs merge).
- **Owner approval from screenshots:** placeholder-price line, 404 page, ru copy.

## 5. Out of scope

Sign-in, cart, checkout, favourites (Phase 4); Create Your Stone, Our works, About/Information/Reviews pages; admin; mega-menu; the "Catalog refined" filter sheet; animations beyond carousel scrolling and existing component states.
