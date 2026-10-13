# Phase 2 — Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Figma tokens as CSS custom properties, ~15 core components with every approved state, real Figma assets through a portable image pipeline, a noindex `/[locale]/_styleguide` page and Figma-vs-implementation notes in `docs/QA/`.

**Architecture:** Tokens live in `src/styles/tokens/*.css` (names identical to Figma variables, mobile-first media queries) and are exposed to Tailwind v4 via `@theme inline`. Components are server components in `src/components/<group>/` styled with Tailwind utilities; interaction states use custom variants that also respond to a `data-state` attribute so the styleguide can show them statically. Images are pre-optimised WebP sets served through one custom `next/image` loader on every host.

**Tech Stack:** Next.js 16.3.8, React 19, Tailwind CSS 4.3, next-intl 4, Vitest 5 + Testing Library (jsdom), Playwright 1.64, sharp (already installed with Next), new dev deps `pixelmatch` + `pngjs`.

**Spec:** `docs/superpowers/specs/2026-10-14-phase-2-design-system-design.md` (+ ADR-003, ADR-004, `docs/FIGMA-INVENTORY.md`).

## Global Constraints

- Figma `1vEGuD9cYYFNynyByUGHwF` is read-only: use only `get_design_context`, `get_metadata`, `get_variable_defs`, `get_screenshot`, `get_motion_context`, `download_assets` (TalkToFigma read tools only if those are insufficient). Load `skill://figma/figma-design-to-code/SKILL.md` before the first `get_design_context`.
- Values come from `get_design_context` of the node named in each task; when a Components-page master is stale, use the **screen instance** named in the task. Never invent a value; never change palette, typefaces or imagery.
- No temporary Figma asset URLs in code. SVGs are saved unmodified.
- No JSX string literals: all copy in `messages/ru.json` + `messages/en.json` under `components.*` (parity test already enforces keys).
- No new runtime dependencies. New dev dependencies allowed: `pixelmatch`, `pngjs` only.
- Do not use the STONE agent-system Claude↔Codex machinery and write nothing into the `stone-agent-system` folder. `docs/QA/` in this repo is required.
- Visual additions not in Figma (Loading spinner, language switch, PT Serif Cyrillic, glass approximation) appear in the styleguide approval block and are not used on pages until the owner approves.
- Branch `feat/phase-2-design-system`; Conventional Commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; one PR; no force-push.
- Every task ends green on `pnpm lint && pnpm typecheck && pnpm test`.
- Component tests (`*.test.tsx`) start with the docblock `// @vitest-environment jsdom`; the default environment stays `node`. Use `fireEvent` (no `@testing-library/user-event` dependency), and `next-intl` is provided through `NextIntlClientProvider` with `messages/en.json` in a shared `tests/unit/render.tsx` helper created in Task 3.

## Review Focus

1. Russian labels are longer than English ("Создать свой камень"): header and buttons must not overflow at 390 px. → Task 8 e2e `header has no horizontal overflow at 390 in ru`.
2. The focus ring must stay visible on light catalog surfaces, not only on dark glass. → Task 9 e2e `focus ring is visible on product card`.
3. A double click on a loading submit button must not submit twice. → Task 4 unit `loading button ignores clicks`.
4. A product without an image must show the Figma placeholder, not a broken image. → Task 7 unit `ProductCard without image renders placeholder`.
5. `prefers-reduced-motion: reduce` must remove the press ripple. → Task 9 e2e `reduced motion disables ripple`.

---

## File Structure

```
src/styles/tokens/figma-variables.json   snapshot (per breakpoint)
src/styles/tokens/{color,type,layout,effects,motion}.css
src/app/globals.css                       imports tokens, @theme inline, custom variants, utilities
src/app/fonts.ts                          next/font definitions (Inter, Lusitana, PT Serif)
public/icons/*.svg                        Figma icons, unmodified
public/images/**/<name>-<w>.webp          optimised rasters
assets/figma-manifest.json                file → node id, source size, widths, usage
scripts/optimize-images.mjs               sharp → WebP sets
scripts/visual-compare.mjs                Playwright + pixelmatch → docs/QA
src/lib/image-loader.ts                   next/image custom loader
src/components/cn.ts                      class join helper
src/components/icons/Icon.tsx             mask-image icon
src/components/buttons/{Button,IconButton,CarouselArrow,SocialButton}.tsx
src/components/forms/{TextField,SearchField,Select,Badge}.tsx
src/components/cards/{ProductCard,ShowcaseCard}.tsx
src/components/navigation/{SiteHeader,LanguageSwitch,MobileMenu,TabBar,SiteFooter,Breadcrumb}.tsx
src/app/[locale]/%5Fstyleguide/page.tsx  (+ sections/*.tsx)
tests/unit/{tokens,image-loader,assets,button,icon-button,forms,cards,navigation}.test.tsx
tests/e2e/styleguide.spec.ts
tests/visual/figma/*.png                  Figma reference screenshots
docs/QA/phase-2-components.md, docs/QA/phase-2/*.png
```

Spec correction (ruling): icons live in `public/icons/` (not `src/components/icons/*.svg`) because CSS `mask-image` needs a public URL; the files stay unmodified.

---

### Task 0: Prerequisites

- [ ] **Step 1:** Confirm PR #1 and #2 state with `gh pr list --state all`. If both are merged, rebase-free update: `git merge origin/main` into this branch (no force-push). If not merged, continue stacked and note it in the PR body.
- [ ] **Step 2:** Load `skill://figma/figma-design-to-code/SKILL.md` via `get_figma_skill`.
- [ ] **Step 3:** `pnpm install` — Expected: exit 0.

---

### Task 1: Design tokens

**Files:** Create `src/styles/tokens/figma-variables.json`, `src/styles/tokens/{color,type,layout,effects,motion}.css`, `tests/unit/tokens.test.ts`. Modify `src/app/globals.css`.

**Interfaces:**
- Produces: CSS custom properties named exactly like Figma variables (e.g. `--surface-page`, `--text-ink`, `--layout-margin`, `--type-nav-size`); Tailwind colour utilities `bg-surface-page`, `text-ink`, `text-primary`, `border-glass` … (one `--color-<name>` per colour variable via `@theme inline`); text-style utilities `type-*` (list in spec §2); effect utilities `glass-panel`, `glass-card`, `glass-header`; motion vars `--motion-hover-duration`, `--motion-hover-ease`, `--motion-ripple-duration`, `--motion-ripple-ease`.
- Snapshot shape: `{ "breakpoints": ["base","768","1024","1440","1920","max389"], "variables": { "<name>": { "base": "<value>", "1440": "<value>" … } }, "textStyles": { "<Style/Name>": { "family","size","lineHeight","letterSpacingPercent","weight" } }, "effects": { "<Effect/Name>": "<css>" } }` — `base` = 390 values.

- [ ] **Step 1: Capture** — run `get_variable_defs` on Home v2 (`716:1060` 390, `724:1669` 768, `722:1563` 1024, `722:1300` 1440, `714:869` 1920, `724:1975` 360), Catalog (`922:26324` 390, `922:25494` 1440), Product Black Marble (`782:11727` 390, `782:11526` 1440), Account (`737:6405` 390, `736:5318` 1440). Write the union into the snapshot; px values without unit as numbers, colours as Figma hex. Read motion with `get_motion_context` on Nav/Pill `21:79` and Button/Pill `21:95` for hover and ripple timing.
- [ ] **Step 2: Write the failing test** `tokens.test.ts`:
  - `every snapshot variable is defined in base CSS` — parse all `src/styles/tokens/*.css` into `{ selectorOrMedia → { prop → value } }`; for each variable, the `:root` (base) value equals `snapshot.variables[name].base` (normalise `#rrggbbaa` and `Npx`).
  - `breakpoint overrides match the snapshot` — for each non-base breakpoint value, the `@media (min-width: <bp>px)` (or `max-width: 389px` for `max389`) block defines the same value.
  - `letter-spacing percent is converted to em` — `type-brand-logo` utility has `letter-spacing: 0.1em`.
- [ ] **Step 3: Run** `pnpm test tokens` — Expected: FAIL (CSS files missing).
- [ ] **Step 4: Implement** the five CSS files (mobile-first, only changed values in media blocks) and update `globals.css`: `@import` order tokens → tailwind; keep `--color-*: initial; --font-*: initial;`; add `@theme inline` colour mappings; add `@utility type-*`, `@utility glass-*`; add custom variants:
  `@custom-variant hov (&:where(:hover:not(:disabled,[aria-disabled=true]), [data-state=hover]));`
  `@custom-variant focusv (&:where(:focus-visible, [data-state=focus]));`
  `@custom-variant press (&:where(:active:not(:disabled,[aria-disabled=true]), [data-state=pressed]));`
  and a `.ripple` utility (radial pseudo-element animated on `press:`, `@media (prefers-reduced-motion: reduce) { animation: none }`).
- [ ] **Step 5: Run** `pnpm test tokens && pnpm build` — Expected: PASS, build exit 0.
- [ ] **Step 6: Commit** — `feat: add Figma design tokens as CSS custom properties`

---

### Task 2: Fonts

**Files:** Create `src/app/fonts.ts`, `tests/unit/fonts.test.ts`. Modify `src/app/[locale]/layout.tsx`, `src/styles/tokens/type.css`.

**Interfaces:**
- Produces: `export const fontVariables: string` (space-joined `next/font` `.variable` classes) applied on `<html>`; CSS vars `--font-inter`, `--font-lusitana`, `--font-pt-serif`; token `--font-display: var(--font-lusitana), var(--font-pt-serif), serif` and `--font-body: var(--font-inter), sans-serif` used by `type-*` utilities.

- [ ] **Step 1: Failing test** `fonts.test.ts` (mock `next/font/google` to return `{ variable: "<name>", style: {} }` and capture the options): `Lusitana is latin only`; `PT Serif is cyrillic only` (`subsets: ["cyrillic"]`); `Inter includes cyrillic`; `display stack puts Lusitana before PT Serif` (read `type.css`, `--font-display` order).
- [ ] **Step 2: Run** `pnpm test fonts` — Expected: FAIL.
- [ ] **Step 3: Implement** `fonts.ts` with `Inter({ subsets: ["latin","cyrillic"], variable: "--font-inter" })`, `Lusitana({ weight: "400", subsets: ["latin"], variable: "--font-lusitana" })`, `PT_Serif({ weight: ["400"], subsets: ["cyrillic"], variable: "--font-pt-serif" })`; add `className={fontVariables}` to `<html>` in the locale layout.
- [ ] **Step 4: Run** `pnpm test fonts && pnpm build` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: load Inter, Lusitana and PT Serif Cyrillic fallback`

---

### Task 3: Icons and image pipeline

**Files:** Create `public/icons/*.svg`, `assets/figma-manifest.json`, `scripts/optimize-images.mjs`, `src/lib/image-loader.ts`, `src/components/cn.ts`, `src/components/icons/Icon.tsx`, `tests/unit/render.tsx` (`renderWithIntl(ui, locale = "en")`), `tests/unit/{image-loader,assets,icon}.test.ts(x)`. Modify `next.config.ts`, `package.json` (script `images`), `.gitignore` (`/assets/source/`).

**Interfaces:**
- `cn(...parts: Array<string | false | null | undefined>): string`
- `type IconName = "search" | "menu" | "close" | "arrow" | "bag" | "chevron" | "check" | "dismiss" | "back" | "heart" | "home" | "grid" | "user"`; `Icon({ name, size = 24, className }: { name: IconName; size?: 12 | 16 | 24; className?: string })` → `<span aria-hidden="true">` with `mask-image: url(/icons/<name>.svg)` and `background-color: currentColor`.
- Manifest entry: `{ "file": "images/catalog/black-marble", "node": "<id>", "sourceWidth": 1200, "widths": [390, 768, 1024], "usage": ["ProductCard"] }` (no extension; outputs `public/<file>-<w>.webp`).
- `imageLoader({ src, width }: { src: string; width: number }): string` (default export) → `${src}-${w}.webp` where `w` is the smallest manifest width ≥ `width`, else the largest; throws `Error("Image not in manifest: <src>")` for unknown `src`.
- `next.config.ts`: `images: { loader: "custom", loaderFile: "./src/lib/image-loader.ts", deviceSizes: [390, 768, 1024, 1440, 1920], imageSizes: [] }`.

- [ ] **Step 1: Download** icons (nodes `21:55`, `21:60`, `21:64`, `21:68`, `21:72`, `156:100`, `158:111`, `158:113`, `175:170`, `712:469`, `712:471`, `712:473`, `712:478`) and the rasters used by Card/Showcase `713:561`, Catalog — 1440 cards (`922:25494`), and Hero/Scene layouts (`296:483`, `296:491`, `296:499`, `296:507`, `21:27`, `296:523`) via the Figma asset URLs into `assets/source/` (git-ignored) and `public/icons/`.
- [ ] **Step 2: Failing tests:**
  - `image-loader.test.ts`: `picks the smallest width >= requested` (widths [390,768,1024], width 500 → `-768.webp`); `falls back to largest` (width 1920 → `-1024.webp`); `throws for unknown src`.
  - `assets.test.ts`: `every manifest output exists and is non-empty`; `no image exceeds 1 MB`; `no source file contains figma.com/api/mcp/asset` (scan `src/**`).
  - `icon.test.tsx`: `Icon is aria-hidden and uses the icon mask` (style contains `/icons/menu.svg`).
- [ ] **Step 3: Run** — Expected: FAIL.
- [ ] **Step 4: Implement** `optimize-images.mjs` (reads manifest, sharp resize without enlargement, WebP quality 82), run `pnpm images`, then the loader, `cn`, `Icon`, next.config images.
- [ ] **Step 5: Run** `pnpm test && pnpm build` — Expected: PASS.
- [ ] **Step 6: Commit** — `feat: add Figma icons, image manifest and portable image loader`

---

### Task 4: Button

**Files:** Create `src/components/buttons/Button.tsx`, `tests/unit/button.test.tsx`. Modify messages (`components.button.loading`).

**Interfaces:**
- `type InteractionState = "hover" | "focus" | "pressed"`
- `type ButtonVariant = "pill" | "primary" | "light" | "outline" | "graphite" | "save"`
- `type ButtonProps = { variant?: ButtonVariant; iconRight?: IconName; disabled?: boolean; state?: InteractionState; children: ReactNode; className?: string } & ({ href: string; type?: never; loading?: never; onClick?: never } | { href?: undefined; type?: "button"; loading?: never; onClick?: () => void } | { href?: undefined; type: "submit"; loading?: boolean; onClick?: () => void })` — `loading` exists only for `type: "submit"` (owner decision).
- `state` renders `data-state` (styleguide only). Default `variant = "pill"`.
- Figma nodes for values: Button/Pill `21:95` (Default `21:80`, Hover `21:85`, Focus `21:90`, RippleStart `116:34`, RippleEnd `116:37`, Disabled `116:40`); Button/Primary `338:533`; Button/Light `430:479`; Button/Outline `732:712`; Button/Graphite `733:6134`; Button/Save `779:546`.

- [ ] **Step 1: Failing tests** (Testing Library + mocked next-intl `Link` as `<a>`): `renders a button with type button by default`; `renders a localized link when href is given` (role link, href); `disabled button does not call onClick`; `loading button ignores clicks` (two clicks → 0 calls) and has `aria-busy="true"` plus visually hidden `components.button.loading` text; `state prop sets data-state`; `iconRight renders an aria-hidden icon`.
- [ ] **Step 2: Run** `pnpm test button` — Expected: FAIL.
- [ ] **Step 3: Implement** — call `get_design_context` on each variant node; map fills/borders/radius/padding/type to token utilities; hover/focus/press via `hov:`/`focusv:`/`press:`; `ripple` utility; Loading = Disabled look + 16 px spinner in `currentColor` (CSS border spinner) + `aria-busy`.
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm typecheck` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat: add Button with all Figma variants and states`

---

### Task 5: IconButton, CarouselArrow, SocialButton

**Files:** Create `src/components/buttons/{IconButton,CarouselArrow,SocialButton}.tsx`, `tests/unit/icon-button.test.tsx`. Modify messages (`components.carousel.prev|next`).

**Interfaces:**
- `IconButton({ icon, label, tone = "glass", href, state, disabled, onClick, pressed }: { icon: IconName; label: string; tone?: "glass" | "light"; href?: string; state?: InteractionState; disabled?: boolean; onClick?: () => void; pressed?: boolean })` — `label` required (aria-label); `pressed` → `aria-pressed` (heart toggle). Nodes: Icon button `21:125` (Menu `21:116`, Close `21:121`, Back `175:174`, User `732:500`); heart from Catalog — 1440 card instance.
- `CarouselArrow({ direction, onClick, disabled }: { direction: "prev" | "next"; … })` — label from `components.carousel.*`; node `712:489`.
- `SocialButton({ label, href, state }: { label: "TG" | "VK" | "IG" | "WA"; href: string; state?: InteractionState })` — node `21:115`.

- [ ] **Step 1: Failing tests:** `IconButton exposes its label as accessible name`; `IconButton without label is a type error` (`// @ts-expect-error` line compiled by typecheck); `pressed sets aria-pressed`; `CarouselArrow uses localized labels`; `SocialButton is a link with its label`.
- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Implement** from the named nodes. **Step 4: Run** `pnpm test && pnpm typecheck` — PASS.
- [ ] **Step 5: Commit** — `feat: add IconButton, CarouselArrow and SocialButton`

---

### Task 6: Form fields

**Files:** Create `src/components/forms/{TextField,SearchField,Select,Badge}.tsx`, `tests/unit/forms.test.tsx`. Modify messages (`components.search.placeholder`, `components.select.*`).

**Interfaces:**
- `TextField({ label, name, type = "text", tone = "dark", error, defaultValue, state }: { label: string; name: string; type?: "text" | "email" | "password" | "number"; tone?: "dark" | "light"; error?: string; defaultValue?: string; state?: "focus" })` — `<label>` + `<input>`; `error` → `aria-invalid` + `aria-describedby`. Nodes: Input/Dark `430:504`, Product/Field `779:541`.
- `SearchField({ name, placeholder, tone = "light" }: { name: string; placeholder: string; tone?: "light" | "graphite" })` — `role="searchbox"`; nodes Search/Pill `21:108`, catalog search in `922:25494`.
- `Select({ label, name, options, defaultValue, state }: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string; state?: "hover" | "open" | "focus" })` — client component; button with `aria-haspopup="listbox"`, listbox with `role="option"`; keyboard: ArrowUp/Down, Enter, Escape; hidden `<input name>` for forms. Nodes Field/Select `338:507`, Option/Row `346:477`.
- `Badge({ children }: { children: ReactNode })` — discount pill from Catalog card instance.

- [ ] **Step 1: Failing tests:** `TextField links label and input`; `TextField error sets aria-invalid and describedby`; `SearchField has searchbox role`; `Select opens with Enter, moves with ArrowDown, selects with Enter and closes with Escape`; `Select submits the chosen value via hidden input`.
- [ ] **Step 2–4:** Run (FAIL) → implement from nodes → run `pnpm test && pnpm typecheck` (PASS).
- [ ] **Step 5: Commit** — `feat: add TextField, SearchField, Select and Badge`

---

### Task 7: Cards

**Files:** Create `src/components/cards/{ProductCard,ShowcaseCard}.tsx`, `tests/unit/cards.test.tsx`. Modify messages (`components.productCard.*`, `components.price.perSquareMetre`, `components.price.illustrative`).

**Interfaces:**
- `type Price = { amount: number; currency: "USD"; isPlaceholder: boolean }`
- `ProductCard({ href, name, meta, image, price, oldPrice, discountPercent, favorite, state }: { href: string; name: string; meta: string; image?: { src: string; alt: string }; price: Price; oldPrice?: Price; discountPercent?: number; favorite?: boolean; state?: InteractionState })` — whole card is the link (Figma description); ♥ `IconButton` sits outside the link's accessible name; price formatted with `useFormatter().number(amount, { style: "currency", currency })` + `/ m²`; when `price.isPlaceholder`, a visually-hidden `components.price.illustrative` note. Values from Catalog — 1440 (`922:25494`) and Catalog — 390 (`922:26324`) card instances (master `337:556` is stale).
- `ShowcaseCard({ type, href, title, subtitle, image, price, oldPrice, discountPercent, layout }: { type: "product" | "promo" | "work"; layout: "desktop" | "mobile"; … })` — Card/Showcase `713:561` variants `713:499`, `713:509`, `713:524`, `713:530`, `713:540`, `713:555`.

- [ ] **Step 1: Failing tests:** `ProductCard links to the product`; `ProductCard formats USD per m² for ru and en`; `ProductCard shows old price and discount badge`; `ProductCard without image renders placeholder` (Figma "Image coming soon" copy from messages, no `<img>`); `favorite toggle has its own accessible name and aria-pressed`; `ShowcaseCard work type has no price`.
- [ ] **Step 2–4:** Run (FAIL) → implement with `next/image` + manifest `src` → run (PASS).
- [ ] **Step 5: Commit** — `feat: add ProductCard and ShowcaseCard`

---

### Task 8: Navigation

**Files:** Create `src/components/navigation/{SiteHeader,LanguageSwitch,MobileMenu,TabBar,SiteFooter,Breadcrumb}.tsx`, `tests/unit/navigation.test.tsx`. Modify messages (`components.nav.*`, `components.tabBar.*` with ru from Figma and en Home/Catalog/Favorites/Cart/Sign in, `components.footer.*`, `components.languageSwitch.*`).

**Interfaces:**
- `SiteHeader({ current }: { current?: "create" | "cart" | "account" })` — desktop (≥1280, per Figma description of `732:539`): logo link, Nav/Pill `Create Your Stone`, `Cart`, account `IconButton`, `LanguageSwitch`; mobile (<1280): logo, Cart, menu `IconButton` opening `MobileMenu`. Values: `732:539`, Home v2 — 390 header instance in `716:1060`, Nav/Pill `21:79` (Current `344:483`).
- `LanguageSwitch()` — client; Nav/Pill styling, label `RU / EN` with the current locale emphasised; switches via next-intl `useRouter().replace(pathname, { locale })` keeping path and query; `aria-label` from messages.
- `MobileMenu({ open, onClose }: { open: boolean; onClose: () => void })` — client dialog (`role="dialog"`, `aria-modal`), focus trap, Escape closes, focus returns to the menu button.
- `TabBar({ current }: { current: "home" | "catalog" | "favorites" | "cart" | "account" })` — `<nav>` with 5 links, `aria-current="page"`; Nav/Tab bar `712:499`, items `712:490` (active) / `712:494`.
- `SiteFooter()` — Footer `22:104` (Desktop `22:53`, Mobile `22:80`) with links from messages and `SocialButton`s.
- `Breadcrumb({ items }: { items: { label: string; href?: string }[] })` — `<nav aria-label>` + `<ol>`, last item `aria-current="page"`; Product/Breadcrumb `779:529`.

- [ ] **Step 1: Failing tests:** `header shows Create Your Stone, Cart and account on desktop markup`; `current item has aria-current`; `LanguageSwitch keeps path and query` (mock router; `/ru/catalog?sort=az` → replace called with `{ pathname: "/catalog", query: {sort:"az"} }, { locale: "en" }`); `MobileMenu closes on Escape and returns focus`; `TabBar renders 5 localized links`; `Breadcrumb marks last item current`.
- [ ] **Step 2–4:** Run (FAIL) → implement → run (PASS).
- [ ] **Step 5: Commit** — `feat: add header, language switch, mobile menu, tab bar, footer and breadcrumb`

---

### Task 9: Styleguide page and e2e

**Files:** Create `src/app/[locale]/%5Fstyleguide/page.tsx`, `src/app/[locale]/%5Fstyleguide/sections/{Tokens,Buttons,Forms,Cards,Navigation,Approval}.tsx`, `tests/e2e/styleguide.spec.ts`. Modify messages (`styleguide.*`), `tests/e2e/smoke.spec.ts` (add `/ru/_styleguide` 200), `.github/workflows/ci.yml` (none expected).

**Interfaces:**
- Page: `export const metadata = { robots: { index: false, follow: false } }`; calls `notFound()` when `getServerEnv().APP_ENV === "production"`; every component block wrapped in `<section data-qa="<component>-<variant>">` so Task 10 can screenshot it; states rendered with the `state` prop; ru/en via the route locale; Approval section shows: Lusitana Latin vs PT Serif Cyrillic sample, `LanguageSwitch`, Loading button, glass approximation over a Figma texture.

- [ ] **Step 1: Failing e2e** `styleguide.spec.ts`: `styleguide renders in ru and en`; `styleguide is noindex` (meta robots); `styleguide is 404 in production` (separate Playwright project or `webServer` env `APP_ENV=production` on port 3001 — add project `production-guard` in `playwright.config.ts`); `keyboard Tab reaches every interactive element with a visible focus ring` (iterate Tab, assert `outline-style` ≠ `none` or box-shadow ring); `focus ring is visible on product card`; `axe has no critical or serious violations`; `header has no horizontal overflow at 390 in ru`; `reduced motion disables ripple` (`page.emulateMedia({ reducedMotion: "reduce" })`, pressed element computed `animation-name` is `none`); `mobile menu opens and closes with Escape`.
- [ ] **Step 2: Run** `pnpm build && pnpm test:e2e styleguide` — Expected: FAIL.
- [ ] **Step 3: Implement** the page and sections.
- [ ] **Step 4: Run** `pnpm build && pnpm test:e2e` — Expected: all PASS (smoke + styleguide).
- [ ] **Step 5: Commit** — `feat: add noindex styleguide with every component state`

---

### Task 10: Visual comparison and QA notes

**Files:** Create `tests/visual/figma/*.png`, `scripts/visual-compare.mjs`, `docs/QA/phase-2-components.md`, `docs/QA/phase-2/*.png`. Modify `package.json` (dev deps `pixelmatch`, `pngjs`; script `qa:visual`).

**Interfaces:**
- `scripts/visual-compare.mjs`: reads `tests/visual/figma/<id>-<width>.png` (id = `data-qa` value), starts nothing itself (expects `pnpm start` running or `BASE_URL`), screenshots `/<locale>/_styleguide` sections by `[data-qa=<id>]` at viewport 1440 and 390 with Playwright `chromium`, pads both images to the larger size, runs `pixelmatch` (threshold 0.1), writes `docs/QA/phase-2/<id>-<width>-{impl,figma,diff}.png` and a markdown table row `| <id> | <width> | <mismatch %> |`.
- Exported pure helper for testing: `export function mismatchPercent(diffPixels: number, width: number, height: number): number` (two decimals).

- [ ] **Step 1:** Save Figma references with `get_screenshot` for each styleguide `data-qa` block (node ids from Tasks 4–8) at 1440 and 390 (390 from the 390 screen instances).
- [ ] **Step 2: Failing unit test** `tests/unit/visual-compare.test.ts`: `mismatchPercent(250, 100, 100) === 2.5`; `mismatchPercent(0, 10, 10) === 0`.
- [ ] **Step 3: Run** — FAIL. **Step 4: Implement** the script; add deps; run `pnpm build && pnpm start` in background then `pnpm qa:visual`.
- [ ] **Step 5: Write** `docs/QA/phase-2-components.md`: method, table (component → width → mismatch % → notes → status), known deviations (font rendering, glass approximation, Loading, language switch, Cyrillic), and the owner-approval checklist.
- [ ] **Step 6: Run** `pnpm test` — PASS. **Commit** — `docs: add Phase 2 Figma visual comparison notes`

---

### Task 11: Review, verification and PR

- [ ] **Step 1:** Full check `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e` — all exit 0.
- [ ] **Step 2:** superpowers:requesting-code-review (fresh reviewer) + an independent design QA reviewer comparing `docs/QA/phase-2/*` against Figma (normal reviewer agent; no STONE contract artefacts). Handle findings with superpowers:receiving-code-review.
- [ ] **Step 3:** superpowers:verification-before-completion.
- [ ] **Step 4:** superpowers:finishing-a-development-branch → push, open PR to `main` (or stacked base if #1/#2 unmerged), bind it, read CI.
- [ ] **Step 5:** Verify the Cloudflare preview of the branch: `/ru/_styleguide` and `/en/_styleguide` return 200; send the owner screenshots of the approval block at 1440 and 390 for the four visual decisions.
