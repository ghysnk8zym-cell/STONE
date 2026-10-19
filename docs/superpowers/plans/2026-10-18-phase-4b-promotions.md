# Phase 4b: Promotions

Continue after Customers in the same worktree, preserving all uncommitted auth
and Customers work. Source: Phase 4 approved spec sections 2–3; Figma Promotions
1440 `1077:53224`, 1024 `1077:56321` in `1vEGuD9cYYFNynyByUGHwF`.

## Scope

Promotions is dependency-safe: `product.price_cents`, `old_price_cents` and
`discount_percent` already exist. No migration, remote database or credentials
are needed. The approved spec calls for product discounts, not Figma's
illustrative campaign names, schedules or draft-campaign lifecycle. Keep the
list/editor/preview composition and existing design components; show the actual
three fields and save them explicitly. Product publishing remains unchanged.

Keep existing semantics: integer cents; nullable old price above current price;
nullable integer badge 0–100 stored verbatim, never computed. Clearing both
optional fields removes the old price and badge without silently changing the
current price. Sale filtering uses old-price presence. Home promotions remain a
curated product selection; editing a discount does not add products to it.

## Implementation and proof

1. Write real PGlite/Better Auth tests before the server implementation: direct
   unauthorized calls, input boundaries, null/zero, unchanged non-price data,
   conflict handling, public repository output and concrete locale revalidation.
2. Reuse the price field validation and existing catalog refresh helper. Guard
   first; use one conditional UPDATE of the three fields, matching the expected
   values including nulls. No read-modify-write race in the Promotions action.
   Document that the pre-existing full Product editor remains last-write-wins.
3. Guard the read query and return explicit localized product DTOs. Use URL
   search/selection. Build the responsive list, field editor, pricing summary and
   live storefront preview from existing components/tokens/assets, ru/en copy.
4. Preserve unsaved inputs on rejected/failed saves. Refuse stale saves with an
   instruction to reload and review; refresh catalog/home/account/admin on success.
5. Test both locales, application/clearing of discount fields, existing-page
   visibility, conflicts/failures, accessibility and 1440/1024/390 layouts. Use
   isolated test products; never mutate shared seed fixtures in browser tests.
6. Run lint, formatting, types, units, build, e2e; independent source/security
   review; inspect screenshots. Record local evidence separately from pending
   deployed Neon/Worker/CI and owner design acceptance.

Remaining after this slice: Create Your Stone, Site content, dependent Overview
work and Phase 5. No commit, push, deployment or remote mutation in this milestone.
