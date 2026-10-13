# Phase 2 — Design system from Figma

**Date:** 2026-10-14
**Status:** Approved (sections approved in conversation; written spec approved by owner 2026-10-14).
**Scope:** design tokens, core components with all states, real Figma assets, a noindex styleguide page and visual-comparison notes. Pages (home, catalog, product) are Phase 3.
**Inputs:** Figma `1vEGuD9cYYFNynyByUGHwF` (read-only), `docs/FIGMA-INVENTORY.md`, ADR-003 (styling/tokens), ADR-004 (i18n), STONE design history (D020/D030 state contract) read as reference only.

## 1. Intent and decisions

**Owner decisions (2026-10-13/14)**

| Topic | Decision |
|---|---|
| Navigation | Implement the **current** header used on all screens (logo, Create Your Stone, Cart, account icon; mobile: logo, Cart, menu). The D030 mega-menu is **not** implemented (absent from current screens). |
| Loading state | Only on submit-type buttons (`Button` primary/save and form submits); styled from the incumbent language (Disabled look + small spinner in text colour, `aria-busy`); owner approves from the styleguide screenshot. |
| Cyrillic | Lusitana roles render Cyrillic in PT Serif via `unicode-range` (ADR-003); owner approves from the styleguide. |
| Language switch | A header button built from Nav/Pill (`RU / EN`); owner approves from the styleguide (ADR-004). |
| TabBar copy | ru labels as in Figma (Главная, Каталог, Избранное, Корзина, Вход); en: Home, Catalog, Favorites, Cart, Sign in. |
| STONE agent system | Read as design history only. No Claude↔Codex handoff machinery, nothing written into the `stone-agent-system` folder. `docs/QA/` in this repo is required. |

**Findings that shape the design**

1. Several masters on the Figma Components page are stale. Example: `Card/Catalog product` (`337:556`) has no price or favourite button, while the Catalog screen cards show image inset, ♥, discount badge, name, meta and price. **Component scope follows what current screens use**, not the Components page.
2. Figma variables differ per breakpoint (e.g. `--layout-header-pad-x` 40 in the master, 24 on the 1440 screen; `--type-nav-size` 24 vs 22). Tokens are captured **per breakpoint**.
3. Figma letter-spacing values are percent (Brand/Logo 10 → 3 px at 30 px).

**Success criteria**

- Every token used by the current screens exists as a CSS custom property with the Figma value at each breakpoint, enforced by a test.
- Each component renders on `/[locale]/_styleguide` in every applicable state, in ru and en.
- Each component has a Figma-vs-implementation comparison at 1440 and 390 recorded in `docs/QA/phase-2-components.md`.
- No temporary Figma URLs in code; every image/icon file in the manifest exists.
- No new heavy dependencies; no visual deviation without an owner-approved styleguide screenshot.

## 2. Tokens (section 1)

- **Capture:** `get_variable_defs` on current screens at 1920 / 1440 / 1024 / 768 / 390 / 360 (Home v2, Catalog, Product, Account). Union snapshot in `src/styles/tokens/figma-variables.json`, values keyed by breakpoint where they differ.
- **CSS:** `src/styles/tokens/color.css`, `type.css`, `layout.css`, `effects.css`, `motion.css`; names identical to Figma variables. Mobile-first: base = 390 values; `@media (min-width: 768px | 1024px | 1440px | 1920px)` override only what changes. 360 values apply below 390 only where they differ (`max-width: 389px`).
- **Tailwind:** mapped through `@theme inline` in `globals.css` (ADR-003); default palette and fonts stay reset.
- **Text styles → utilities** named after the Figma style: `type-brand-logo`, `type-nav-link`, `type-button-label`, `type-hero-headline`, `type-section-label`, `type-card-title`, `type-body-m`, `type-catalog-product-name`, `type-catalog-meta`, `type-catalog-action`, `type-catalog-field-value`, `type-catalog-page-title`, `type-catalog-product-title`, `type-catalog-section`, `type-footer-link`, `type-footer-small`. Letter-spacing percent → `em` (e.g. 10 → `0.1em`).
- **Effects → utilities:** `glass-panel` (backdrop blur 24 + drop shadow 0 16 40 `#00000059`), `glass-card` (backdrop blur 16 + shadows 0 8 28 `#2A2E3312`, 0 1 4 `#2A2E330A`), `glass-header` (backdrop blur 12 on `--surface-header`). The Figma GLASS effect from D020 (refraction, edge light) cannot be reproduced exactly in CSS; the approximation (backdrop-filter + light edge) is a **known deviation** documented in `docs/QA` and shown in the styleguide approval block.
- **Motion:** durations/easings for hover and ripple read with `get_motion_context` from Nav/Pill and Button/Pill; stored in `motion.css`. Figma "Reduced" variants map to `prefers-reduced-motion: reduce` (no ripple, instant state changes).
- **Fonts:** `next/font/google` — Inter (latin, cyrillic), Lusitana (latin), PT Serif (cyrillic only, `unicode-range` U+0400–04FF and related) combined in the Lusitana font stack.
- **Test:** `tests/unit/tokens.test.ts` — every snapshot variable exists in the CSS with the same value at each breakpoint.

## 3. Components (section 2)

| Group | Component | Figma source |
|---|---|---|
| Buttons | `Button` — variants `pill`, `primary`, `light`, `outline`, `graphite`; props `iconRight`, `loading` (submit-type only), `href` | Button/Pill `21:95`, Button/Primary `338:533`, Button/Light `430:479`, Button/Outline `732:712`, Button/Graphite `733:6134`, Button/Save `779:546` |
| | `IconButton` — icons Menu, Close, Back, User, Heart; tones `glass`, `light`; required `label` (aria-label) | Icon button `21:125`, ♥ on cards |
| | `CarouselArrow` (prev/next), `SocialButton` | `712:489`, `21:115` |
| Navigation | `SiteHeader` — desktop: logo, Create Your Stone, Cart, account, language switch; mobile: logo, Cart, menu | Header/Full + Account `732:539`, Home v2 — 390 header |
| | `MobileMenu`, `TabBar` (5 items), `SiteFooter` (desktop/mobile), `Breadcrumb` | Nav/Tab bar `712:499`, Nav/Tab item `712:498`, Footer `22:104`, Product/Breadcrumb `779:529` |
| Cards | `ProductCard` — image, ♥, discount badge, name, meta, price + old price | Catalog — 1440/390 screen cards |
| | `ShowcaseCard` — types Product / Promo / Work, desktop/mobile | Card/Showcase `713:561` |
| Forms | `TextField` (dark and light), `SearchField`, `Select` (+ options), `Badge` | Input/Dark `430:504`, Product/Field `779:541`, Search/Pill `21:108`, catalog search field, Field/Select `338:507`, Option/Row `346:477` |

Exact geometry, colours and typography come from `get_design_context` on each node (screen instance when the master is stale) at implementation time.

**States (D020/D030 contract)**

| State | Implementation |
|---|---|
| Default | Figma default |
| Hover | per component description (Nav/Pill: fill 10% + border 24%) |
| Focus-visible | ring `#9DB4C0` (existing focus token), only on keyboard focus |
| Pressed | ripple from RippleStart/RippleEnd as CSS `:active` animation (no JS) |
| Disabled | Figma Disabled variant; `disabled` / `aria-disabled`, no pointer events |
| Current | Nav/Pill Current → `aria-current="page"` |
| Loading | submit-type buttons only (owner decision) |
| Reduced motion | `prefers-reduced-motion` disables ripple and transitions |

**Implementation rules**

- Location: `src/components/<group>/<Component>.tsx` (+ co-located styles via Tailwind utilities); shared helper `src/components/cn.ts`.
- Server components by default; client components only for `MobileMenu`, language switch and `Select`.
- `Button`/`IconButton` render `<button type="button">` or the next-intl `Link` when `href` is given.
- No new runtime dependencies: variants are typed objects + `cn()`.
- Icons: Figma SVG files kept unmodified in `src/components/icons/*.svg`, rendered through CSS `mask-image` with `background-color: currentColor` so colour follows the context.
- All component copy (aria-labels, "View product", TabBar labels, language switch) lives in `messages/*.json` under `components.*`.

## 4. Assets and images (section 3)

- Download only via Figma read tools (`get_design_context` asset URLs or `download_assets`). No temporary Figma URLs in code.
- Committed: SVG icons (unmodified), optimised raster outputs in `public/images/<name>-<width>.webp`, and `assets/figma-manifest.json` (file → Figma node id, source size, usage). Source PNGs are not committed; the manifest allows re-download.
- `pnpm images` (`scripts/optimize-images.mjs`, sharp — already present via Next) produces WebP at 390 / 768 / 1024 / 1440 / 1920, never upscaled.
- `next/image` uses one custom loader for every host (`src/lib/image-loader.ts`, `images.loader: "custom"`), choosing the nearest prepared width. No runtime optimisation, no Cloudflare Images, identical behaviour on Vercel/Netlify/Node. `sizes` set from real slot widths per breakpoint.
- Hero: `Hero/Scene` (`296:531`) exported as a flattened image per layout (1920/1440/1024/768/390/360); headline and search remain live HTML at Figma positions with copy from messages.
- Above-the-fold images use `priority`; the rest lazy-load. Cards keep Figma crop via `object-fit`/`object-position`.
- Images are static assets (outside the Worker bundle). A check fails if any image file exceeds 1 MB.
- Test: every manifest file exists and is non-empty; every `next/image` `src` used by components is in the manifest.

## 5. Styleguide, visual QA and tests (section 4)

**Styleguide** — `src/app/[locale]/%5Fstyleguide/page.tsx` (the `%5F` folder name maps to the `/_styleguide` URL; plain `_` folders are private in the App Router).

- Returns 404 when `APP_ENV=production`; `noindex` metadata; never linked from navigation.
- Sections: tokens (colours, type scale, effects), every component in every state side by side (hover/focus/pressed shown statically via a `data-state` prop used only by the styleguide), ru and en.
- **Approval block:** PT Serif Cyrillic next to Lusitana Latin, language switch, Loading, glass approximation.

**Visual comparison**

- Figma references: `get_screenshot` of each component node (and the screen instance when the master is stale) at 1440 and 390 widths, saved to `tests/visual/figma/<component>-<width>.png`.
- `pnpm qa:visual` (`scripts/visual-compare.mjs`) captures the styleguide with Playwright, builds side-by-side + diff images with `pixelmatch`/`pngjs` (new dev dependencies, small) and reports a mismatch percentage.
- Output: `docs/QA/phase-2-components.md` — component → mismatch % → notes (font rendering, glass approximation…) → status; images under `docs/QA/phase-2/`. Manual review artefact, not a CI pixel gate.

**Tests**

- Unit (Vitest + Testing Library, jsdom): roles/aria; Disabled blocks clicks; Loading sets `aria-busy` and blocks repeat clicks; `href` renders a locale-aware link; `IconButton` requires a label (type-level); messages parity covers `components.*`.
- E2E (Playwright): styleguide 200 in ru/en and 404 with `APP_ENV=production`; keyboard Tab reaches every interactive element with a visible focus ring; axe with no critical/serious violations; MobileMenu opens and closes with Esc and returns focus.
- CI: existing jobs plus the workerd smoke; styleguide added to the smoke list.

**Review before PR:** a fresh independent code reviewer and an independent design QA pass against the Figma screenshots (normal reviewer agent; no STONE contract artefacts).

**Delivery order (one branch `feat/phase-2-design-system`, one PR):** tokens → fonts → icons and image pipeline → buttons → fields → cards → header, footer, TabBar, MobileMenu → styleguide → visual comparison and QA notes.

## 6. Error handling and edge cases

- Long labels (ru is longer than en): buttons and nav pills must not overflow at 390; text wraps or truncates per Figma behaviour; styleguide shows a long-label example.
- Missing image: `ProductCard` falls back to the Figma placeholder layer ("Image coming soon" style) rather than a broken image.
- Price display: placeholder prices are labelled as illustrative where the calculator uses USD 240/m² (unchanged rule).
- Focus ring must remain visible on light (catalog) and dark (header/glass) surfaces; contrast checked in QA notes.

## 7. Out of scope

Pages and routing (Phase 3), auth and account data (Phase 4), mega-menu, admin components, animations beyond state feedback (later, via the animation protocol).
