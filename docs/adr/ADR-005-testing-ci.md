# ADR-005: Testing and continuous integration

**Status:** Proposed (approved in conversation 2026-10-13; awaiting written review)
**Date:** 2026-10-13
**Deciders:** Project owner (approval), lead engineer (Claude)

## Context

- Development follows obra/superpowers with test-driven development: tests first for logic; for visual and motion work, Playwright checks or visual comparison against Figma screenshots.
- Required test areas: access (roles), locale, order and form flows.
- Every PR must run lint, typecheck, unit tests, build and Playwright smoke, and must stay within the Cloudflare Workers Free size limit (ADR-001).
- Visual parity is checked at 1440, 1024, 768 and 390.

## Decision

- **Unit/integration:** Vitest + Testing Library (jsdom). Server code (guards, server actions, repositories) tested against **PGlite** (in-process Postgres) so CI needs no external database.
- **End-to-end:** Playwright in `tests/e2e/`: `access`, `locale`, `navigation`, `calculator`, `order`, `forms`, `smoke`. Accessibility with `@axe-core/playwright` on key pages.
- **Visual:** `tests/visual/` with Figma screenshots (via `get_screenshot`, read-only) committed as references at 1440/1024/768/390; threshold-based comparison, run only inside the official Playwright Linux container; comparison notes in `docs/QA/`.
- **CI:** GitHub Actions on every pull request:
  1. checkout, Node from `.nvmrc`, pnpm via corepack with cache;
  2. ESLint + Prettier check;
  3. `tsc --noEmit`;
  4. Vitest;
  5. `next build` (portability proof);
  6. OpenNext build + compressed size check (fail above 3 MiB);
  7. Playwright (Chromium desktop + mobile viewport) against `next start`.
  A separate manual workflow (`workflow_dispatch`, input: URL) runs smoke tests against a Cloudflare preview URL.
- Branch protection on `main` with required checks is enabled by the owner following steps in `docs/DEPLOYMENT.md`.

## Options Considered

### Option A: Vitest + Playwright + GitHub Actions (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low–Medium |
| Cost | Free for a public repository |
| Scalability | Good; jobs can be split later |
| Team familiarity | High |

**Pros:** fast unit tests with native ESM/TS; Playwright covers e2e, a11y and screenshots in one tool; PGlite removes external DB from CI.
**Cons:** visual baselines are OS-sensitive (mitigated by the Linux container).

### Option B: Jest + Cypress

**Pros:** familiar. **Cons:** slower, heavier ESM/TS setup; Cypress weaker for multi-viewport screenshots. Rejected.

### Option C: Chromatic/Percy for visual testing

**Pros:** hosted visual review. **Cons:** external account and paid tiers. Rejected for now.

## Trade-off Analysis

Vitest and Playwright are the current defaults for Next.js and need no paid services. Comparing against Figma screenshots cannot be pixel-exact because browser and Figma font rendering differ, so thresholds plus written QA notes are used instead of a hard pixel gate.

## Consequences

- Easier: every PR proves build portability and size budget; access rules are regression-tested.
- Harder: visual references must be refreshed (read-only) when Figma changes.
- Revisit: a second e2e run against real Postgres once Phase 4 lands.

## New dependencies (dev)

`vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@electric-sql/pglite`.

## Action Items

1. [ ] Phase 1: CI workflow with all steps; green run as evidence.
2. [ ] Phase 1: preview smoke workflow.
3. [ ] Phase 2+: visual references per component and page.
4. [ ] Phase 4: access tests for Guest/Client/Admin in both locales.
