# ADR-003: Styling system and design tokens

**Status:** Proposed (approved in conversation 2026-10-13; awaiting written review)
**Date:** 2026-10-13
**Deciders:** Project owner (approval), lead engineer (Claude)

## Context

- Figma (`1vEGuD9cYYFNynyByUGHwF`) is the read-only source of truth. Its local variables already use CSS-like names (`--surface-page`, `--text-ink`, `--border-glass`, `--stone-catalog-card`, `--layout-margin`, `--type-*`), plus text styles (`Brand/Logo`, `Nav/Link`, `Catalog/Product name`, `Button/Label` …) and effect styles (`Surface/Glass panel`, `Blur/Glass background 24`).
- The palette, typefaces (Lusitana, Inter), imagery roles and D020 art direction are protected; deviations need explicit approval.
- Other developers will take over the codebase, so the styling layer should be widely known and hard to misuse.
- Lusitana (Google Fonts) has a **Latin subset only**; Inter covers Cyrillic. The Figma file is English, so Russian Lusitana-role text has no approved rendering.

Sample of variables read on 2026-10-13 (Home v2 — 1440, `722:1300`; Product / Black Marble — 1440, `782:11526`):

| Variable | Value |
|---|---|
| `--surface-page` | `#1b1d20` |
| `--surface-header` | `#1214169e` |
| `--surface-panel` | `#1214168c` |
| `--surface-button` / `--surface-nav-pill` | `#ffffff14` |
| `--border-glass` / `--border-glass-strong` | `#ffffff1f` / `#ffffff3d` |
| `--text-primary` / `--text-secondary` / `--text-label` | `#ffffff` / `#ffffffb8` / `#ffffffcc` |
| `--text-ink` / `--text-ink-secondary` | `#1b1c1e` / `#3a3d41` |
| `--stone-catalog-page` / `-card` / `-photo` / `-line` / `-ink` / `-secondary` | `#f3f0eb` / `#f8f5f0` / `#e9e4dd` / `#d8d1c8` / `#292722` / `#625d55` |
| `--layout-margin` / `--layout-panel-pad` / `--layout-card-gap` / `--layout-control-h` | `77` / `24` / `24` / `40` |

## Decision

Use **Tailwind CSS v4** on top of **CSS custom properties named exactly like the Figma variables**.

Pipeline:

1. Read variables with `get_variable_defs` (read-only) and store the snapshot in `src/styles/tokens/figma-variables.json`.
2. Generate/maintain `src/styles/tokens/*.css` (`color.css`, `type.css`, `layout.css`, `effects.css`, `motion.css`) with the same names and values.
3. Map them into Tailwind with `@theme inline` (e.g. `bg-surface-page`, `text-ink`, `border-glass`).
4. Reset Tailwind defaults (`--color-*: initial`, `--font-*: initial`) so non-STONE colours and fonts cannot be used.
5. `tokens.test.ts` fails if any Figma variable is missing or differs in CSS.

Typography: `next/font/google` (self-hosted at build time) for Inter and Lusitana. **Cyrillic glyphs in Lusitana roles fall back to PT Serif via `unicode-range`** (owner decision 2026-10-13, option A); Latin glyphs remain Lusitana. Final visual sign-off with ru/en screenshots side by side and a stone-art-direction review in Phase 2.

Figma letter-spacing values such as 14, 12, 10 are treated as percent and converted to `em` (0.14em …); verified with `get_design_context` in Phase 2.

## Options Considered

### Option A: Tailwind CSS v4 + CSS custom properties (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low: CSS-first config, no JS config file |
| Cost | Build-time only, no runtime |
| Scalability | Good; tokens are plain CSS variables |
| Team familiarity | High |

**Pros:** familiar to most developers; tokens stay framework-agnostic CSS variables; default palette can be removed to protect the brand; good for state variants (`hover:`, `focus-visible:`, `disabled:`, `data-[state=…]`).
**Cons:** long class lists on complex glass components; needs a lint/format plugin for class ordering.

### Option B: CSS Modules + CSS custom properties

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Zero dependencies |
| Scalability | Good |
| Team familiarity | High |

**Pros:** no extra dependency; explicit per-component styles; same token layer.
**Cons:** more verbose; state variants and responsive rules written by hand; easier to drift from tokens (raw values in modules). A valid fallback.

### Option C: CSS-in-JS (styled-components, Emotion)

**Cons:** runtime cost, friction with React Server Components. Rejected.

## Trade-off Analysis

Both A and B keep tokens in plain CSS variables, so the token layer is portable either way. Tailwind wins on hand-off familiarity and on making off-brand values impossible once defaults are reset. Complex glass effects are encapsulated in named utilities and components, so long class lists stay inside `src/components`.

## Consequences

- Easier: one source of token truth; brand drift caught by tests; new developers productive quickly.
- Harder: token snapshot must be refreshed manually (read-only) when Figma variables change.
- Approval required: the PT Serif Cyrillic fallback rendering (Phase 2); any new token not present in Figma.
- Revisit: if the owner supplies a licensed Cyrillic Lusitana-like face.

## New dependencies

`tailwindcss` v4, `@tailwindcss/postcss`, `prettier-plugin-tailwindcss` (dev).

## Action Items

1. [ ] Phase 1: Tailwind v4 setup with defaults reset.
2. [ ] Phase 2: full variable/style extraction for all frames in `docs/FIGMA-INVENTORY.md`; `tokens.test.ts`.
3. [ ] Phase 2: Cyrillic fallback sample on `/[locale]/_styleguide` for owner approval.
