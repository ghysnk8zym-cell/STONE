# Phase 4b: Customers

Source: `../specs/2026-10-17-phase-4-auth-account-admin-design.md`, section 3.
Continuation stays in the existing worktree; the uncommitted Phase 4a auth repairs
and handoff are preserved. No remote state, credentials or database are changed.

## Scope and sequence

1. Customers is the first complete Phase 4b slice: existing users, search,
   selection, existing customer orders and changing another user's role.
2. Remaining Phase 4b work: Create Your Stone request schema/workflow, Promotions,
   Site content and the Overview additions dependent on those features.
3. Phase 4a still needs deployed Neon/Worker verification and independent design
   acceptance. Phase 5 documentation and portability work follow Phase 4b.

## Implementation

- Use Figma Customers 1440 `1077:53004` and 1024 `1077:56114` in file
  `1vEGuD9cYYFNynyByUGHwF`, the existing admin shell, tokens and controls.
- Show only stored user/order data. Payment and custom request fields are not in
  the current schema. Customer thumbnails use their order's product, or the
  existing initials avatar when they have no orders. Contact remains a plain
  mailto link, as on Orders; no email service is integrated.
- Server-only queries return explicit minimal DTOs. Guard the page and queries;
  search is literal and bounded, with pagination rather than silently dropping users.
- Guard the role action as its first statement, validate unknown arguments,
  reject the actor's own ID, allow only client/admin, and revalidate protected
  layouts. Existing sessions read the current database role on the next request.
- Reuse the order DTO/query with an optional customer filter applied before its
  existing 500-order limit. Display that limit honestly in customer order copy.
- Localize new strings in ru/en. Role controls reuse existing admin form styling.

## Verification

- First write failing real PGlite/Better Auth regressions: Guest/Client direct
  calls, malformed input, self-role changes, promotion/demotion, existing-session
  permissions, safe DTOs, literal search, pagination, selected-user order isolation.
- UI checks: selection/search, role save/failure, own-role read-only, no orders;
  browser role round trip with an isolated user, both languages and access matrix.
- Add the omitted product new/edit routes to the role/locale access matrix.
- Lint, formatting, generated Next types, TypeScript, unit suite, production build
  and Playwright against isolated local PGlite. Inspect 1440/1024/390 screenshots
  and axe results. No fixed-delay waits or disabled tests.
- Independent read-only security/code review, then record concrete evidence and
  the unfinished Phase 4b/deployment requirements.
